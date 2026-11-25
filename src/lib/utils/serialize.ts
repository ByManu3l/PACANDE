import 'server-only';

import type { Prisma } from '@/generated/prisma/client';

/**
 * Conversión de datos de Prisma a lo que puede cruzar al navegador.
 *
 * **El problema que resuelve:** `Decimal` no es serializable a través del
 * límite entre Server Component y Client Component. Al cruzarlo, React
 * lanza un error en tiempo de ejecución cuyo mensaje no menciona ni el
 * campo ni el tipo, así que cuesta relacionarlo con la causa. Es el error
 * que más veces ha aparecido en este proyecto.
 *
 * La solución es convertir a texto en un único sitio en vez de repetir
 * `{ ...producto, price: producto.price.toString() }` en cada página, que
 * es como se olvida un campo nuevo.
 */

/** Campos mínimos que una tarjeta de producto necesita. */
export interface ProductCardData {
  id: string;
  slug: string;
  name: string;
  /** Texto de la ficha; la tarjeta muestra solo sus primeras líneas. */
  description: string;
  price: string;
  images: string[];
  isFeatured: boolean;
  stock: number;
  ratingAverage: string;
  ratingCount: number;
  discountPercent: number;
}

type ProductoConDecimales = {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: Prisma.Decimal;
  images: string[];
  isFeatured: boolean;
  stock: number;
  ratingAverage: Prisma.Decimal;
  ratingCount: number;
  discountPercent: number;
};

/**
 * Prepara un producto para una tarjeta del escaparate.
 *
 * Devuelve **solo** los campos que la tarjeta usa, en vez de esparcir el
 * producto completo. Así la descripción larga y las marcas internas no
 * viajan al navegador en cada elemento de una grilla de 24.
 */
export function toProductCard(producto: ProductoConDecimales): ProductCardData {
  return {
    id: producto.id,
    slug: producto.slug,
    name: producto.name,
    description: producto.description,
    price: producto.price.toString(),
    images: producto.images,
    isFeatured: producto.isFeatured,
    stock: producto.stock,
    ratingAverage: producto.ratingAverage.toString(),
    ratingCount: producto.ratingCount,
    discountPercent: producto.discountPercent,
  };
}
