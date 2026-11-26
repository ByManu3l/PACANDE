import { describe, expect, it } from 'vitest';

import {
  cargarCatalogo,
  catalogoComoTexto,
  MAX_CANTIDAD_ASISTENTE,
  MAX_PRODUCTOS_RESPUESTA,
  normalizarRespuesta,
  type ProductoCatalogo,
} from '@/lib/services/asistente.service';

import { createCategory, createProduct } from './factories';

/**
 * El asistente no se prueba contra la API de Claude (costaría dinero en
 * cada ejecución y su salida no es determinista). Se prueba lo que es
 * nuestro: que el catálogo que recibe sea correcto y que nada de lo que
 * devuelva pueda saltarse la base de datos.
 */

function producto(slug: string, extra: Partial<ProductoCatalogo> = {}): ProductoCatalogo {
  return {
    id: `id-${slug}`,
    slug,
    nombre: `Producto ${slug}`,
    categoria: 'Ropa > Hombre',
    precioFinal: '$ 10.000',
    descuento: 0,
    stock: 5,
    imagen: null,
    ...extra,
  };
}

const CATALOGO = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((s) => producto(s));

describe('normalizarRespuesta', () => {
  it('descarta los productos que no existen en el catálogo', () => {
    const r = normalizarRespuesta(
      { respuesta: 'Mira estos', productos: ['a', 'inventado', 'b'], agregar: [] },
      CATALOGO,
    );
    expect(r.productos.map((p) => p.slug)).toEqual(['a', 'b']);
  });

  it('quita duplicados y limita cuántos productos se muestran', () => {
    const r = normalizarRespuesta(
      { respuesta: '', productos: ['a', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'], agregar: [] },
      CATALOGO,
    );
    expect(r.productos).toHaveLength(MAX_PRODUCTOS_RESPUESTA);
    expect(new Set(r.productos.map((p) => p.slug)).size).toBe(MAX_PRODUCTOS_RESPUESTA);
  });

  it('nunca añade al carrito algo que no existe', () => {
    const r = normalizarRespuesta(
      { respuesta: '', productos: [], agregar: [{ slug: 'inventado', cantidad: 1 }] },
      CATALOGO,
    );
    expect(r.agregar).toEqual([]);
  });

  it('acota las cantidades y descarta las inválidas', () => {
    const r = normalizarRespuesta(
      {
        respuesta: '',
        productos: [],
        agregar: [
          { slug: 'a', cantidad: 500 },
          { slug: 'b', cantidad: 0 },
          { slug: 'c', cantidad: -3 },
          { slug: 'a', cantidad: 1 },
        ],
      },
      CATALOGO,
    );
    expect(r.agregar).toEqual([{ producto: CATALOGO[0], cantidad: MAX_CANTIDAD_ASISTENTE }]);
  });
});

describe('catálogo del asistente', () => {
  it('describe cada producto con su precio final y su disponibilidad', () => {
    const texto = catalogoComoTexto([
      producto('camiseta', { descuento: 20, precioFinal: '$ 8.000' }),
      producto('gorra', { stock: 0 }),
    ]);
    expect(texto).toBe(
      'camiseta | Producto camiseta | Ropa > Hombre | $ 8.000 | 20% de descuento | 5 disponibles\n' +
        'gorra | Producto gorra | Ropa > Hombre | $ 10.000 | sin descuento | agotado',
    );
  });

  it('carga solo productos activos, con el descuento ya aplicado al precio', async () => {
    const categoria = await createCategory({ name: 'Deportes' });
    const enOferta = await createProduct(categoria.id, {
      slug: 'balon-test',
      price: 100000,
      discountPercent: 25,
    });
    const inactivo = await createProduct(categoria.id, { slug: 'oculto-test' });
    const { prisma } = await import('@/lib/prisma');
    await prisma.product.update({ where: { id: inactivo.id }, data: { isActive: false } });

    const catalogo = await cargarCatalogo();
    const slugs = catalogo.map((p) => p.slug);

    expect(slugs).toContain(enOferta.slug);
    expect(slugs).not.toContain(inactivo.slug);

    const balon = catalogo.find((p) => p.slug === enOferta.slug)!;
    expect(balon.categoria).toBe('Deportes');
    expect(balon.descuento).toBe(25);
    // 100.000 con 25 % = 75.000; el formato exacto depende de la moneda
    // configurada, así que se comprueban las cifras.
    expect(balon.precioFinal.replace(/\D/g, '')).toMatch(/^75000/);
  });
});
