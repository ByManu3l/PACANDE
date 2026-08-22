/**
 * Datos de ejemplo: un usuario por rol y el catálogo de demostración que
 * genera `scripts/migrate-images.ts`.
 *
 * **Es idempotente:** todo se identifica por slug o correo y se inserta
 * con `upsert`, así que ejecutarlo varias veces no duplica nada. Puedes
 * iterar sobre este archivo sin miedo mientras montas tu catálogo.
 *
 * Los precios y el stock se generan con un hash del slug en lugar de con
 * `Math.random()`: así los mismos datos producen siempre los mismos
 * valores, y volver a sembrar no cambia los precios de la tienda de
 * ejemplo ni hace fallar pruebas que dependan de ellos.
 *
 * Ejecutar con: npm run db:seed
 */
import { hashSync } from 'bcryptjs';

import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../src/generated/prisma/client';
import { slugify } from '../src/lib/utils/slugify';
import catalog from './seed-data/catalog.json';

/**
 * Cliente propio, no el singleton de `src/lib/prisma.ts`.
 *
 * Ese singleton existe para sobrevivir al recargado en caliente de
 * Next.js, algo que a un script de un solo uso no le aplica. Además
 * importa `lib/env.ts`, que lleva `server-only` y por tanto lanza fuera
 * del runtime de Next.js — este script corre con `tsx`, en Node a secas.
 *
 * Aquí se lee `DATABASE_URL` directamente: es la única variable que el
 * seed necesita, y el script debe poder ejecutarse en CI sin depender del
 * resto de la configuración de la aplicación.
 */
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('Falta DATABASE_URL. Copia .env.example a .env antes de sembrar.');
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

// --- generación determinista, estable entre ejecuciones ------------------

function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 0xffffffff; // en el rango [0, 1)
}

const PRICE_RANGES_COP: Record<string, [number, number]> = {
  'tecnologia-accesorios': [15_000, 120_000],
  'tecnologia-celulares': [900_000, 4_500_000],
  'tecnologia-computadores': [1_200_000, 8_000_000],
  'ropa-hombre': [35_000, 180_000],
  'ropa-mujer': [35_000, 180_000],
  'ropa-ninos': [25_000, 120_000],
  'hogar-decoracion': [20_000, 200_000],
  'hogar-jardin': [25_000, 250_000],
  'hogar-muebles': [80_000, 900_000],
  'deportes-futbol': [20_000, 250_000],
  'deportes-baloncesto': [20_000, 250_000],
  'deportes-ciclismo': [30_000, 400_000],
  'deportes-boxeo': [40_000, 300_000],
  'deportes-tenis': [30_000, 350_000],
  'deportes-accesorios': [15_000, 150_000],
};

function priceFor(categorySlug: string, name: string): number {
  const [min, max] = PRICE_RANGES_COP[categorySlug] ?? [20_000, 200_000];
  const price = min + hash(name) * (max - min);
  return Math.round(price / 1000) * 1000; // round to nearest 1,000 COP
}

function stockFor(name: string): number {
  return Math.round(5 + hash(`${name}|stock`) * 45);
}

function isFeaturedFor(name: string): boolean {
  return hash(`${name}|featured`) < 0.15; // ~15% of the catalog
}

// ---------------------------------------------------------------------------

async function seedUsers() {
  const users = [
    {
      email: 'superadmin@pacande.test',
      name: 'Superadmin Demo',
      role: 'SUPERADMIN' as const,
      password: 'Superadmin123!',
    },
    {
      email: 'admin@pacande.test',
      name: 'Admin Demo',
      role: 'ADMIN' as const,
      password: 'Admin123!',
    },
    {
      email: 'usuario@pacande.test',
      name: 'Usuario Demo',
      role: 'USER' as const,
      password: 'Usuario123!',
    },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        name: u.name,
        role: u.role,
        passwordHash: hashSync(u.password, 10),
      },
    });
  }

  console.log(`Seeded ${users.length} demo users:`);
  for (const u of users) {
    console.log(`  ${u.role.padEnd(10)} ${u.email} / ${u.password}`);
  }
}

async function seedCategories() {
  // Parents before children: catalog.json already lists top-level
  // categories (parentSlug: null) first, but sort defensively.
  const sorted = [...catalog.categories].sort(
    (a, b) => Number(a.parentSlug !== null) - Number(b.parentSlug !== null),
  );

  const idBySlug = new Map<string, string>();

  for (const c of sorted) {
    const parentId = c.parentSlug ? idBySlug.get(c.parentSlug) : undefined;
    const category = await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, image: c.image, parentId: parentId ?? null },
      create: { slug: c.slug, name: c.name, image: c.image, parentId: parentId ?? null },
    });
    idBySlug.set(c.slug, category.id);
  }

  console.log(`Seeded ${sorted.length} categories.`);
  return idBySlug;
}

async function seedProducts(categoryIdBySlug: Map<string, string>) {
  const seenSlugs = new Set<string>();

  for (const p of catalog.products) {
    const categoryId = categoryIdBySlug.get(p.categorySlug);
    if (!categoryId) {
      throw new Error(`Unknown category slug in catalog.json: ${p.categorySlug}`);
    }

    // Names repeat across categories (e.g. "Camiseta Roja" in ropa-hombre
    // and ropa-ninos), so the slug is namespaced by category to stay unique.
    let slug = `${p.categorySlug}-${slugify(p.name)}`;
    if (seenSlugs.has(slug)) {
      slug = `${slug}-${catalog.products.filter((x) => x.name === p.name).indexOf(p) + 1}`;
    }
    seenSlugs.add(slug);

    await prisma.product.upsert({
      where: { slug },
      update: {
        name: p.name,
        description: `${p.name}, parte del catálogo de ejemplo de esta plantilla E-commerce.`,
        price: priceFor(p.categorySlug, p.name),
        stock: stockFor(p.name),
        images: p.images,
        isFeatured: isFeaturedFor(p.name),
        categoryId,
      },
      create: {
        slug,
        name: p.name,
        description: `${p.name}, parte del catálogo de ejemplo de esta plantilla E-commerce.`,
        price: priceFor(p.categorySlug, p.name),
        stock: stockFor(p.name),
        images: p.images,
        isFeatured: isFeaturedFor(p.name),
        categoryId,
      },
    });
  }

  console.log(`Seeded ${catalog.products.length} products.`);
}

/**
 * Cupones de ejemplo.
 *
 * Cubren los tres casos que un administrador querrá copiar: porcentual
 * con tope, importe fijo con compra mínima, y uno caducado para ver cómo
 * se comporta la validación.
 */
async function seedCoupons() {
  const cupones = [
    {
      code: 'BIENVENIDA10',
      description: 'Primera compra: 10% con tope',
      type: 'PERCENTAGE' as const,
      value: 10,
      maxDiscount: 50_000,
      minPurchase: null,
      maxUses: null,
      isActive: true,
    },
    {
      code: 'ENVIOGRATIS',
      description: 'Descuento fijo equivalente al envío, desde $150.000',
      type: 'FIXED' as const,
      value: 10_000,
      minPurchase: 150_000,
      maxDiscount: null,
      maxUses: 500,
      isActive: true,
    },
    {
      code: 'NAVIDAD2025',
      description: 'Campaña vencida — sirve para probar el mensaje de caducidad',
      type: 'PERCENTAGE' as const,
      value: 25,
      minPurchase: null,
      maxDiscount: null,
      maxUses: null,
      isActive: true,
      endsAt: new Date('2026-01-06T23:59:59Z'),
    },
  ];

  for (const c of cupones) {
    await prisma.coupon.upsert({
      where: { code: c.code },
      update: {},
      create: c,
    });
  }

  console.log(`Seeded ${cupones.length} coupons.`);
}

/**
 * Opiniones de ejemplo, con sus pedidos correspondientes.
 *
 * Un pedido de verdad por reseña, y no filas sueltas en la tabla, porque
 * el servicio exige haber comprado: sembrar reseñas sin pedido produciría
 * datos que la propia aplicación considera imposibles.
 *
 * Se reparten notas distintas para que el desglose de estrellas tenga
 * algo que mostrar y no salgan cinco barras iguales.
 */
async function seedReviews() {
  const compradores = await prisma.user.findMany({
    where: { role: 'USER' },
    select: { id: true },
  });
  if (compradores.length === 0) return;

  const productos = await prisma.product.findMany({
    where: { isFeatured: true },
    take: 6,
    select: { id: true, name: true, price: true, images: true },
  });

  const OPINIONES = [
    {
      rating: 5,
      title: 'Excelente compra',
      body: 'Llegó antes de lo previsto y la calidad es justo la que esperaba. Repetiría sin dudarlo.',
    },
    {
      rating: 4,
      title: 'Muy bueno',
      body: 'Cumple perfectamente con lo que promete. Le quito una estrella solo por el empaque, que llegó algo maltratado.',
    },
    {
      rating: 5,
      title: 'Recomendado',
      body: 'Relación calidad-precio inmejorable. Lo compré por las opiniones y no me arrepiento.',
    },
    {
      rating: 3,
      title: 'Cumple, sin más',
      body: 'Funciona bien pero esperaba algo más por el precio. No está mal, tampoco sorprende.',
    },
  ];

  let creadas = 0;

  for (const [i, producto] of productos.entries()) {
    const opinion = OPINIONES[i % OPINIONES.length];
    const comprador = compradores[i % compradores.length];

    // Cada reseña necesita su propio pedido: el mismo usuario no puede
    // opinar dos veces sobre el mismo producto, pero sí sobre productos
    // distintos.
    const dia = `2026080${(i % 9) + 1}`;
    const orderNumber = `PCD-${dia}-9${String(i).padStart(3, '0')}`;

    const existente = await prisma.order.findUnique({ where: { orderNumber } });
    if (!existente) {
      await prisma.order.create({
        data: {
          orderNumber,
          userId: comprador.id,
          status: 'COMPLETED',
          paymentStatus: 'APPROVED',
          paymentMethod: 'contra_entrega',
          subtotal: producto.price,
          shippingCost: 0,
          total: producto.price,
          discountAmount: 0,
          shippingRecipientName: 'Cliente de ejemplo',
          shippingLine1: 'Calle 100 #15-20',
          shippingCity: 'Bogotá',
          shippingRegion: 'Cundinamarca',
          shippingPostalCode: '110111',
          shippingCountry: 'CO',
          shippingPhone: '3000000000',
          items: {
            create: {
              productId: producto.id,
              productName: producto.name,
              productImage: producto.images[0] ?? null,
              unitPrice: producto.price,
              quantity: 1,
              lineTotal: producto.price,
            },
          },
        },
      });
    }

    await prisma.review.upsert({
      where: { productId_userId: { productId: producto.id, userId: comprador.id } },
      update: {},
      create: {
        productId: producto.id,
        userId: comprador.id,
        rating: opinion.rating,
        title: opinion.title,
        body: opinion.body,
        status: 'APPROVED',
      },
    });
    creadas++;
  }

  // La media desnormalizada de Product se recalcula al moderar; como aquí
  // se insertan ya aprobadas, hay que ponerla al día explícitamente.
  for (const producto of productos) {
    const agregado = await prisma.review.aggregate({
      where: { productId: producto.id, status: 'APPROVED' },
      _avg: { rating: true },
      _count: true,
    });

    await prisma.product.update({
      where: { id: producto.id },
      data: {
        ratingAverage: Number((agregado._avg.rating ?? 0).toFixed(2)),
        ratingCount: agregado._count,
      },
    });
  }

  console.log(`Seeded ${creadas} reviews.`);
}

async function main() {
  await seedUsers();
  const categoryIdBySlug = await seedCategories();
  await seedProducts(categoryIdBySlug);
  await seedCoupons();
  await seedReviews();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
