import { describe, expect, it } from 'vitest';

import { prisma } from '@/lib/prisma';
import { addItem } from '@/lib/services/cart.service';
import { checkout } from '@/lib/services/order.service';
import {
  createReview,
  deleteReview,
  getProductReviews,
  getRatingBreakdown,
  hasPurchased,
  moderateReview,
} from '@/lib/services/review.service';
import { ConflictError, ValidationError } from '@/lib/utils/errors';

import { createCategory, createProduct, createUser } from './factories';

const ENVIO = {
  recipientName: 'Ana Pérez',
  line1: 'Calle 1 #2-3',
  city: 'Bogotá',
  region: 'Cundinamarca',
  postalCode: '110111',
  country: 'CO',
  phone: '3000000000',
  paymentMethod: 'contra_entrega' as const,
};

/** Usuario que ya compró el producto indicado. */
async function compradorDe(productId: string) {
  const user = await createUser();
  await addItem({ userId: user.id }, productId, 1);
  await checkout(user.id, ENVIO);
  return user;
}

async function productoNuevo() {
  const category = await createCategory();
  return createProduct(category.id, { stock: 100, price: 50_000 });
}

describe('solo opina quien compró', () => {
  it('rechaza a quien no ha comprado el producto', async () => {
    // Sin esta regla la sección de opiniones es un formulario público y la
    // valoración media deja de decir nada sobre el producto.
    const product = await productoNuevo();
    const curioso = await createUser();

    await expect(
      createReview({ userId: curioso.id, productId: product.id, rating: 5, body: 'Genial.' }),
    ).rejects.toThrow(ValidationError);
  });

  it('acepta a quien sí compró', async () => {
    const product = await productoNuevo();
    const comprador = await compradorDe(product.id);

    expect(await hasPurchased(comprador.id, product.id)).toBe(true);
    await expect(
      createReview({ userId: comprador.id, productId: product.id, rating: 4, body: 'Bien.' }),
    ).resolves.toBeTruthy();
  });

  it('no acredita un pedido rechazado', async () => {
    // Un pedido cancelado por pago rechazado no da derecho a opinar.
    const product = await productoNuevo();
    const user = await compradorDe(product.id);
    await prisma.order.updateMany({ where: { userId: user.id }, data: { status: 'CANCELLED' } });

    expect(await hasPurchased(user.id, product.id)).toBe(false);
  });

  it('impide opinar dos veces sobre el mismo producto', async () => {
    // Sin el índice único, veinte reseñas propias inflan cualquier
    // producto.
    const product = await productoNuevo();
    const comprador = await compradorDe(product.id);

    await createReview({ userId: comprador.id, productId: product.id, rating: 5, body: 'Uno.' });
    await expect(
      createReview({ userId: comprador.id, productId: product.id, rating: 1, body: 'Dos.' }),
    ).rejects.toThrow(ConflictError);
  });
});

describe('moderación', () => {
  it('una reseña nueva nace pendiente y no se publica', async () => {
    const product = await productoNuevo();
    const comprador = await compradorDe(product.id);
    await createReview({ userId: comprador.id, productId: product.id, rating: 5, body: 'Bien.' });

    const publicas = await getProductReviews(product.id, 1);
    expect(publicas.total).toBe(0);
  });

  it('al aprobarla se publica y actualiza la valoración del producto', async () => {
    const product = await productoNuevo();
    const comprador = await compradorDe(product.id);
    const review = await createReview({
      userId: comprador.id,
      productId: product.id,
      rating: 4,
      body: 'Bien.',
    });

    await moderateReview(review.id, 'APPROVED');

    const publicas = await getProductReviews(product.id, 1);
    expect(publicas.total).toBe(1);

    const releido = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(releido.ratingAverage.toString()).toBe('4');
    expect(releido.ratingCount).toBe(1);
  });

  it('al rechazar una ya aprobada, la valoración vuelve atrás', async () => {
    // Es el caso que rompe una desnormalización mal hecha: si el recálculo
    // solo ocurriera al aprobar, la ficha seguiría mostrando una media que
    // ya no corresponde a las reseñas visibles.
    const product = await productoNuevo();
    const comprador = await compradorDe(product.id);
    const review = await createReview({
      userId: comprador.id,
      productId: product.id,
      rating: 5,
      body: 'Bien.',
    });

    await moderateReview(review.id, 'APPROVED');
    await moderateReview(review.id, 'REJECTED', 'Contenido inapropiado.');

    const releido = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(releido.ratingAverage.toString()).toBe('0');
    expect(releido.ratingCount).toBe(0);
    expect((await getProductReviews(product.id, 1)).total).toBe(0);
  });

  it('borrar una reseña también recalcula', async () => {
    const product = await productoNuevo();
    const a = await compradorDe(product.id);
    const b = await compradorDe(product.id);

    const ra = await createReview({ userId: a.id, productId: product.id, rating: 5, body: 'A' });
    const rb = await createReview({ userId: b.id, productId: product.id, rating: 3, body: 'B' });
    await moderateReview(ra.id, 'APPROVED');
    await moderateReview(rb.id, 'APPROVED');

    expect(
      (
        await prisma.product.findUniqueOrThrow({ where: { id: product.id } })
      ).ratingAverage.toString(),
    ).toBe('4');

    await deleteReview(rb.id);

    const releido = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(releido.ratingAverage.toString()).toBe('5');
    expect(releido.ratingCount).toBe(1);
  });
});

describe('valoración agregada', () => {
  it('promedia solo las aprobadas y redondea a dos decimales', async () => {
    const product = await productoNuevo();
    const notas = [5, 4, 4];

    for (const rating of notas) {
      const comprador = await compradorDe(product.id);
      const review = await createReview({
        userId: comprador.id,
        productId: product.id,
        rating,
        body: `Nota ${rating}`,
      });
      await moderateReview(review.id, 'APPROVED');
    }

    // Una cuarta, pendiente: no debe contar.
    const pendiente = await compradorDe(product.id);
    await createReview({ userId: pendiente.id, productId: product.id, rating: 1, body: 'No.' });

    const releido = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(releido.ratingCount).toBe(3);
    // (5 + 4 + 4) / 3 = 4.333… → 4.33
    expect(releido.ratingAverage.toString()).toBe('4.33');
  });

  it('el desglose incluye las cinco notas, también las que están a cero', async () => {
    // La interfaz dibuja siempre cinco barras; un hueco desordenaría el
    // desglose.
    const product = await productoNuevo();
    const comprador = await compradorDe(product.id);
    const review = await createReview({
      userId: comprador.id,
      productId: product.id,
      rating: 3,
      body: 'Normal.',
    });
    await moderateReview(review.id, 'APPROVED');

    const desglose = await getRatingBreakdown(product.id);
    expect(Object.keys(desglose)).toHaveLength(5);
    expect(desglose[3]).toBe(1);
    expect(desglose[5]).toBe(0);
  });

  it('un producto sin reseñas tiene media cero y recuento cero', async () => {
    const product = await productoNuevo();
    expect(product.ratingAverage.toString()).toBe('0');
    expect(product.ratingCount).toBe(0);
  });
});

describe('privacidad en las reseñas públicas', () => {
  it('no expone el correo ni el hash de contraseña del autor', async () => {
    // Estas reseñas se renderizan en una página pública; arrastrar el
    // usuario completo filtraría datos personales.
    const product = await productoNuevo();
    const comprador = await compradorDe(product.id);
    const review = await createReview({
      userId: comprador.id,
      productId: product.id,
      rating: 5,
      body: 'Bien.',
    });
    await moderateReview(review.id, 'APPROVED');

    const publicas = await getProductReviews(product.id, 1);
    const serializado = JSON.stringify(publicas.items[0]);

    expect(serializado).not.toContain(comprador.email);
    expect(serializado).not.toContain('passwordHash');
  });
});
