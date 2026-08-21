/**
 * One-off migration: copies the legacy Pacandé product photos from
 * pacande-full-main/app-Pacande/src/images (PascalCase/spaced/accented
 * filenames, unsafe in URLs) into public/images/... with normalized
 * kebab-case ASCII names, and writes prisma/seed-data/catalog.json —
 * the manifest prisma/seed.ts reads to populate Category/Product.
 *
 * Not part of the app runtime. Run once with: npx tsx scripts/migrate-images.ts
 */
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '..');
const LEGACY_IMAGES_DIR = path.join(REPO_ROOT, 'pacande-full-main/app-Pacande/src/images');
const PUBLIC_IMAGES_DIR = path.join(REPO_ROOT, 'public/images');
const SEED_DATA_DIR = path.join(REPO_ROOT, 'prisma/seed-data');

// ---------------------------------------------------------------------------
// Filename normalization: "Cargador Rápido USB-C.jpg" -> "cargador-rapido-usb-c.jpg"
// ---------------------------------------------------------------------------

const ACCENTS: Record<string, string> = {
  á: 'a',
  é: 'e',
  í: 'i',
  ó: 'o',
  ú: 'u',
  ñ: 'n',
  Á: 'a',
  É: 'e',
  Í: 'i',
  Ó: 'o',
  Ú: 'u',
  Ñ: 'n',
};

function normalizeFilename(original: string): string {
  const ext = path.extname(original).toLowerCase();
  let base = path.basename(original, path.extname(original));

  base = base.replace(/[áéíóúñÁÉÍÓÚÑ]/g, (ch) => ACCENTS[ch] ?? ch);
  base = base.replace(/([a-z0-9])([A-Z])/g, '$1-$2'); // camelCase/PascalCase boundary
  base = base.replace(/([a-zA-Z])([0-9])/g, '$1-$2'); // letter/digit boundary (balon2 -> balon-2)
  base = base.replace(/[\s_]+/g, '-');
  base = base.toLowerCase();
  base = base.replace(/[^a-z0-9-]/g, '-');
  base = base.replace(/-+/g, '-').replace(/^-|-$/g, '');

  return `${base}${ext}`;
}

function copyImage(sourceFile: string, destSubdir: string): string {
  const sourcePath = path.join(LEGACY_IMAGES_DIR, sourceFile);
  if (!existsSync(sourcePath)) {
    throw new Error(`Legacy image not found: ${sourceFile}`);
  }
  const destName = normalizeFilename(sourceFile);
  const destDir = path.join(PUBLIC_IMAGES_DIR, destSubdir);
  mkdirSync(destDir, { recursive: true });
  copyFileSync(sourcePath, path.join(destDir, destName));
  // Public URL path, always forward slashes regardless of host OS.
  return `/images/${destSubdir}/${destName}`.replace(/\\/g, '/');
}

// ---------------------------------------------------------------------------
// Categories (tree) — thumbnails are optional, some legacy assets don't have
// a clean generic photo and are left without one (fine for a fresh template).
// ---------------------------------------------------------------------------

interface CategorySeed {
  slug: string;
  name: string;
  parentSlug: string | null;
  thumbnailFile?: string;
}

const CATEGORIES: CategorySeed[] = [
  { slug: 'ropa', name: 'Ropa', parentSlug: null, thumbnailFile: 'chaqueta.jpg' },
  { slug: 'ropa-hombre', name: 'Hombre', parentSlug: 'ropa', thumbnailFile: 'hombre.jpg' },
  { slug: 'ropa-mujer', name: 'Mujer', parentSlug: 'ropa', thumbnailFile: 'mujer1.jpg' },
  { slug: 'ropa-ninos', name: 'Niños', parentSlug: 'ropa' },

  { slug: 'tecnologia', name: 'Tecnología', parentSlug: null, thumbnailFile: 'celulares.jpg' },
  {
    slug: 'tecnologia-celulares',
    name: 'Celulares',
    parentSlug: 'tecnologia',
    thumbnailFile: 'celulares.jpg',
  },
  {
    slug: 'tecnologia-computadores',
    name: 'Computadores',
    parentSlug: 'tecnologia',
    thumbnailFile: 'computadores.jpeg',
  },
  {
    slug: 'tecnologia-accesorios',
    name: 'Accesorios',
    parentSlug: 'tecnologia',
    thumbnailFile: 'accesorios.jpeg',
  },

  { slug: 'hogar', name: 'Hogar', parentSlug: null, thumbnailFile: 'decoracion.jpeg' },
  {
    slug: 'hogar-decoracion',
    name: 'Decoración',
    parentSlug: 'hogar',
    thumbnailFile: 'decoracion.jpeg',
  },
  { slug: 'hogar-jardin', name: 'Jardín', parentSlug: 'hogar', thumbnailFile: 'jardin.jpeg' },
  { slug: 'hogar-muebles', name: 'Muebles', parentSlug: 'hogar', thumbnailFile: 'muebles.jpeg' },

  { slug: 'deportes', name: 'Deportes', parentSlug: null, thumbnailFile: 'futbol.jpeg' },
  {
    slug: 'deportes-futbol',
    name: 'Fútbol',
    parentSlug: 'deportes',
    thumbnailFile: 'futbol.jpeg',
  },
  {
    slug: 'deportes-baloncesto',
    name: 'Baloncesto',
    parentSlug: 'deportes',
    thumbnailFile: 'baloncesto.jpeg',
  },
  { slug: 'deportes-ciclismo', name: 'Ciclismo', parentSlug: 'deportes' },
  { slug: 'deportes-boxeo', name: 'Boxeo', parentSlug: 'deportes' },
  { slug: 'deportes-tenis', name: 'Tenis', parentSlug: 'deportes' },
  { slug: 'deportes-accesorios', name: 'Accesorios', parentSlug: 'deportes' },

  {
    slug: 'variedad',
    name: 'Variedad',
    parentSlug: null,
    thumbnailFile: 'variedad.jpeg',
  },
];

// ---------------------------------------------------------------------------
// Products — grouped explicitly by source file(s). Where the legacy asset
// set has a "base" photo plus a "2"/"3" suffix, those are treated as extra
// gallery images of the SAME product (matches Product.images: String[]).
// ---------------------------------------------------------------------------

interface ProductSeed {
  name: string;
  categorySlug: string;
  files: string[];
}

function triad(name: string, categorySlug: string, base: string): ProductSeed {
  return {
    name,
    categorySlug,
    files: [`${base}.jpg`, `${base}2.jpg`, `${base}3.jpg`],
  };
}

function single(name: string, categorySlug: string, file: string): ProductSeed {
  return { name, categorySlug, files: [file] };
}

const TECH_ACCESSORIES: ProductSeed[] = [
  'Adaptador HDMI.jpg',
  'Adaptador USB.jpg',
  'Adaptador VGA.jpg',
  'Auriculares Bluetooth.jpg',
  'Auriculares Deportivos.jpg',
  'Auriculares Noise Cancelling.jpg',
  'Cargador Inalámbrico.jpg',
  'Cargador Rápido USB-C.jpg',
  'Cargador para Auto.jpg',
  'Power Bank 10000mAh.jpg',
  'Power Bank Carga Rápida.jpg',
  'Power Bank Solar.jpg',
  'Ratón Gaming.jpg',
  'Ratón Inalámbrico.jpg',
  'Ratón Vertical.jpg',
  'Soporte de Escritorio.jpg',
  'Soporte para Celular.jpg',
  'Soporte para Tablet.jpg',
  'Teclado Compacto.jpg',
  'Teclado Mecánico.jpg',
  'Teclado RGB.jpg',
  'Funda para Google Pixel.jpg',
  'Funda para Samsung Galaxy.jpg',
  'Funda para iPhone 14.jpg',
].map((file) => single(path.basename(file, path.extname(file)), 'tecnologia-accesorios', file));

const TECH_PHONES: ProductSeed[] = [
  single('Google Pixel 6', 'tecnologia-celulares', 'Google Pixel 6.jpg'),
  single('OnePlus 9', 'tecnologia-celulares', 'OnePlus 9.jpg'),
  single('Samsung Galaxy S21', 'tecnologia-celulares', 'Samsung Galaxy S21.jpg'),
  single('Xiaomi Mi 11', 'tecnologia-celulares', 'Xiaomi Mi 11.jpg'),
  single('iPhone 13', 'tecnologia-celulares', 'iphone13.jpg'),
  single('Motorola Edge 20 Lite', 'tecnologia-celulares', 'motorola edge 20 lite.jpg'),
];

const TECH_COMPUTERS: ProductSeed[] = [
  single(
    'Computadora de Escritorio Dell Inspiron',
    'tecnologia-computadores',
    'Computadora de escritorio Dell Inspiron.jpg',
  ),
  single('Laptop HP Pavilion', 'tecnologia-computadores', 'Laptop HP Pavilion.jpg'),
  single('MacBook Pro', 'tecnologia-computadores', 'MacBook Pro.jpg'),
  single('Monitor Gamer UltraGear', 'tecnologia-computadores', 'Monitor Gamer UltraGear.jpg'),
  single('Monitor LG UltraWide', 'tecnologia-computadores', 'Monitor LG UltraWide.jpg'),
  single('Monitor Samsung de 24"', 'tecnologia-computadores', 'Monitor Samsung de 24.jpg'),
  single('PC para Juegos', 'tecnologia-computadores', 'PC para juegos.jpg'),
  single('Portátil Acer Nitro 5', 'tecnologia-computadores', 'Portatil Acer Nitro 5.jpg'),
  single('iMac', 'tecnologia-computadores', 'iMac.jpg'),
];

function ropaPair(name: string, categorySlug: string, base: string): ProductSeed {
  return { name, categorySlug, files: [`${base}.jpg`, `${base}Men.jpg`] };
}

const CHAQUETAS_HOMBRE: ProductSeed[] = [
  ropaPair('Chaqueta Casual', 'ropa-hombre', 'ChaquetaCasual'),
  ropaPair('Chaqueta de Cuero', 'ropa-hombre', 'ChaquetaCuero'),
  ropaPair('Chaqueta Deportiva', 'ropa-hombre', 'ChaquetaDeportiva'),
  ropaPair('Chaqueta Formal', 'ropa-hombre', 'ChaquetaFormal'),
  ropaPair('Chaqueta de Invierno', 'ropa-hombre', 'ChaquetaInvierno'),
  ropaPair('Chaqueta Larga', 'ropa-hombre', 'ChaquetaLarga'),
];
const CHAQUETAS_NINOS: ProductSeed[] = [
  single('Chaqueta Deportiva', 'ropa-ninos', 'ChaquetaDeportivaNino.jpg'),
  single('Chaqueta Gris', 'ropa-ninos', 'ChaquetaGrisNino.jpg'),
  single('Chaqueta Roja', 'ropa-ninos', 'ChaquetaRojaNino.jpg'),
];
const CHAQUETAS_MUJER: ProductSeed[] = [
  single('Chaqueta Casual', 'ropa-mujer', 'chaquetaMujer.jpg'),
];

const PANTALONES_HOMBRE: ProductSeed[] = [
  ropaPair('Pantalón Cargo', 'ropa-hombre', 'PantalonCargo'),
  ropaPair('Pantalón Chino', 'ropa-hombre', 'PantalonChino'),
  ropaPair('Pantalón Deportivo', 'ropa-hombre', 'PantalonDeportivo'),
  ropaPair('Pantalón Formal', 'ropa-hombre', 'PantalonFormal'),
  ropaPair('Jeans', 'ropa-hombre', 'PantalonJeans'),
  ropaPair('Pantalón Negro', 'ropa-hombre', 'PantalonNegro'),
];
const PANTALONES_NINOS: ProductSeed[] = [
  single('Pantalón Deportivo', 'ropa-ninos', 'PantalonDeportivoNino.jpg'),
  single('Pantalón Negro', 'ropa-ninos', 'PantalonNegroNino.jpg'),
  single('Pantalón Verde', 'ropa-ninos', 'PantalonVerdeNino.jpg'),
];
const PANTALONES_MUJER: ProductSeed[] = [
  { name: 'Pantalón', categorySlug: 'ropa-mujer', files: ['pantalon.jpg', 'pantalonMujer.jpg'] },
];

function camisetaHombre(name: string, base: string, kebabColor: string): ProductSeed {
  return {
    name,
    categorySlug: 'ropa-hombre',
    files: [`${base}.jpg`, `camiseta-${kebabColor}-hombre.jpg`],
  };
}

const CAMISETAS_HOMBRE: ProductSeed[] = [
  camisetaHombre('Camiseta Amarilla', 'CamisetaAmarilla', 'amarilla'),
  single('Camiseta Azul', 'ropa-hombre', 'CamisetaAzul.jpg'),
  camisetaHombre('Camiseta Blanca', 'CamisetaBlanca', 'blanca'),
  camisetaHombre('Camiseta Gris', 'CamisetaGris', 'gris'),
  camisetaHombre('Camiseta Negra', 'CamisetaNegra', 'negra'),
  {
    name: 'Camiseta Roja',
    categorySlug: 'ropa-hombre',
    files: ['CamisetaRoja.jpg', 'camiseta-roja-hombre.webp'],
  },
];
const CAMISETAS_NINOS: ProductSeed[] = [
  single('Camiseta Amarilla', 'ropa-ninos', 'CamisetaAmarillaNino.jpg'),
  single('Camiseta Azul', 'ropa-ninos', 'CamisetaAzulNino.jpg'),
  single('Camiseta Roja', 'ropa-ninos', 'CamisetaRojaNino.jpg'),
];
const CAMISETAS_MUJER: ProductSeed[] = [
  { name: 'Camiseta', categorySlug: 'ropa-mujer', files: ['camisetaMujer.png', 'camiseta.jpg'] },
];

const DEPORTES_Y_HOGAR: ProductSeed[] = [
  triad('Alfombra', 'hogar-decoracion', 'alfombra'),
  triad('Balón de Fútbol', 'deportes-futbol', 'balon'),
  triad('Balón de Baloncesto', 'deportes-baloncesto', 'balonBasket'),
  triad('Canasta de Baloncesto', 'deportes-baloncesto', 'canastaBasket'),
  triad('Casco de Ciclismo', 'deportes-ciclismo', 'cascoCiclismo'),
  triad('Cuadro Decorativo', 'hogar-decoracion', 'cuadro'),
  triad('Estantería', 'hogar-muebles', 'estanteria'),
  triad('Guantes Deportivos', 'deportes-accesorios', 'guantes'),
  triad('Guantes de Boxeo', 'deportes-boxeo', 'guantesBoxeo'),
  triad('Hamaca', 'hogar-jardin', 'hamaca'),
  triad('Jarrón Decorativo', 'hogar-decoracion', 'jarron'),
  triad('Lámpara', 'hogar-decoracion', 'lampara'),
  triad('Luces Decorativas', 'hogar-decoracion', 'luces'),
  triad('Maceta', 'hogar-jardin', 'maceta'),
  triad('Mesa', 'hogar-muebles', 'mesa'),
  triad('Raqueta de Tenis', 'deportes-tenis', 'raquetaTenis'),
  triad('Regadera', 'hogar-jardin', 'regadera'),
  triad('Silla', 'hogar-muebles', 'silla'),
  triad('Sofá', 'hogar-muebles', 'sofa'),
  triad('Tacos de Fútbol', 'deportes-futbol', 'tacos'),
  triad('Uniforme Deportivo', 'deportes-futbol', 'uniforme'),
  triad('Uniforme de Baloncesto', 'deportes-baloncesto', 'uniformeBasket'),
  triad('Zapatos de Baloncesto', 'deportes-baloncesto', 'zapatosBasket'),
];

const PRODUCTS: ProductSeed[] = [
  ...TECH_ACCESSORIES,
  ...TECH_PHONES,
  ...TECH_COMPUTERS,
  ...CHAQUETAS_HOMBRE,
  ...CHAQUETAS_NINOS,
  ...CHAQUETAS_MUJER,
  ...PANTALONES_HOMBRE,
  ...PANTALONES_NINOS,
  ...PANTALONES_MUJER,
  ...CAMISETAS_HOMBRE,
  ...CAMISETAS_NINOS,
  ...CAMISETAS_MUJER,
  ...DEPORTES_Y_HOGAR,
];

const BRAND_FILES = {
  logo: 'logopaca.png',
  heroSlides: ['carrusel1.jpg', 'carrusel2.jpg', 'carrusel3.jpg'],
};

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

function main() {
  mkdirSync(SEED_DATA_DIR, { recursive: true });

  const categoriesOut = CATEGORIES.map((c) => ({
    slug: c.slug,
    name: c.name,
    parentSlug: c.parentSlug,
    image: c.thumbnailFile ? copyImage(c.thumbnailFile, 'categories') : null,
  }));

  const productsOut = PRODUCTS.map((p) => ({
    name: p.name,
    categorySlug: p.categorySlug,
    images: p.files.map((f) => copyImage(f, `products/${p.categorySlug}`)),
  }));

  const brandOut = {
    logo: copyImage(BRAND_FILES.logo, 'brand'),
    heroSlides: BRAND_FILES.heroSlides.map((f) => copyImage(f, 'brand')),
  };

  const manifest = { categories: categoriesOut, products: productsOut, brand: brandOut };
  writeFileSync(path.join(SEED_DATA_DIR, 'catalog.json'), JSON.stringify(manifest, null, 2) + '\n');

  console.log(
    `Migrated ${categoriesOut.length} categories and ${productsOut.length} products ` +
      `(${productsOut.reduce((n, p) => n + p.images.length, 0)} images) into public/images/.`,
  );
  console.log(`Manifest written to prisma/seed-data/catalog.json`);
}

main();
