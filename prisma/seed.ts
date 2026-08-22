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

import { prisma } from '../src/lib/prisma';
import { slugify } from '../src/lib/utils/slugify';
import catalog from './seed-data/catalog.json';

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

async function main() {
  await seedUsers();
  const categoryIdBySlug = await seedCategories();
  await seedProducts(categoryIdBySlug);
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
