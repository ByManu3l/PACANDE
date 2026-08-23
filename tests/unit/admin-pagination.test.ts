import { describe, expect, it } from 'vitest';

import { addItem } from '@/lib/services/cart.service';
import { checkout } from '@/lib/services/order.service';
import { listAllOrders } from '@/lib/services/order.service';
import { listProductsForAdmin } from '@/lib/services/product.service';
import { ADMIN_PAGE_SIZE } from '@/lib/utils/pagination';

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

describe('paginación de las tablas del panel', () => {
  it('el catálogo del panel se pagina e informa el total completo', async () => {
    // Sin paginar, una tienda con miles de productos traía todas las filas
    // en cada visita al panel.
    const category = await createCategory();
    const total = ADMIN_PAGE_SIZE + 3;

    for (let i = 0; i < total; i++) {
      await createProduct(category.id, { slug: `admin-${i}`, name: `Producto ${i}` });
    }

    const primera = await listProductsForAdmin(1);
    expect(primera.items).toHaveLength(ADMIN_PAGE_SIZE);
    expect(primera.total).toBe(total);
    expect(primera.pageCount).toBe(2);

    const segunda = await listProductsForAdmin(2);
    expect(segunda.items).toHaveLength(3);

    // Ninguna fila aparece en las dos páginas.
    const ids = new Set([...primera.items, ...segunda.items].map((p) => p.id));
    expect(ids.size).toBe(total);
  });

  it('el panel ve también los productos inactivos', async () => {
    // A diferencia del escaparate: el panel gestiona el inventario
    // completo, y un producto oculto hay que poder encontrarlo para
    // reactivarlo.
    const category = await createCategory();
    await createProduct(category.id, { slug: 'oculto' });
    const { prisma } = await import('@/lib/prisma');
    await prisma.product.update({ where: { slug: 'oculto' }, data: { isActive: false } });

    const pagina = await listProductsForAdmin(1);
    expect(pagina.items.some((p) => p.slug === 'oculto')).toBe(true);
  });

  it('los pedidos se paginan del más reciente al más antiguo', async () => {
    const category = await createCategory();
    const product = await createProduct(category.id, { stock: 500, price: 10_000 });

    // Tres pedidos de tres clientes distintos.
    const numeros: string[] = [];
    for (let i = 0; i < 3; i++) {
      const user = await createUser();
      await addItem({ userId: user.id }, product.id, 1);
      const { order } = await checkout(user.id, ENVIO);
      numeros.push(order.orderNumber);
    }

    const pagina = await listAllOrders(1);
    expect(pagina.total).toBe(3);
    // El último creado va primero.
    expect(pagina.items[0].orderNumber).toBe(numeros.at(-1));
  });

  it('una página fuera de rango devuelve vacío sin romper', async () => {
    // El número de página viene de la URL y puede ser cualquiera.
    const pagina = await listProductsForAdmin(999);
    expect(pagina.items).toHaveLength(0);
    expect(pagina.pageCount).toBeGreaterThanOrEqual(1);
  });
});
