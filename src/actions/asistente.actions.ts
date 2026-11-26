'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { resolveCartIdentity } from '@/lib/cart-session';
import { logger } from '@/lib/logger';
import { enforceRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import * as asistente from '@/lib/services/asistente.service';
import * as cartService from '@/lib/services/cart.service';
import { runAction } from '@/lib/utils/action-result';

/**
 * Lo que manda el navegador. Todo tiene tope: cada carácter que llega aquí
 * se reenvía a la API de Claude y se paga.
 */
const consultaSchema = z.object({
  mensaje: z.string().trim().max(500, 'El mensaje es demasiado largo.'),
  historial: z
    .array(
      z.object({
        rol: z.enum(['cliente', 'asistente']),
        texto: z.string().max(1000),
      }),
    )
    .max(10),
  imagen: z
    .object({
      // ~1,5 MB en base64. El navegador reduce la foto antes de enviarla
      // (ver `reducirFoto` en el componente), así que una foto normal
      // queda muy por debajo.
      datos: z.string().max(2_000_000, 'La foto es demasiado grande.'),
      tipo: z.enum(['image/jpeg', 'image/png', 'image/webp']),
    })
    .optional(),
});

export type ConsultaAsistente = z.input<typeof consultaSchema>;

/** Tarjeta mínima que el panel del asistente sabe pintar. */
export interface ProductoSugerido {
  slug: string;
  nombre: string;
  precio: string;
  descuento: number;
  agotado: boolean;
  imagen: string | null;
}

export interface RespuestaAsistente {
  respuesta: string;
  productos: ProductoSugerido[];
  /** Nombres de lo que se añadió al carrito en esta respuesta. */
  agregados: string[];
  /** Motivos por los que algo pedido no se pudo añadir (p. ej. sin stock). */
  noAgregados: string[];
}

export async function consultarAsistenteAction(entrada: ConsultaAsistente) {
  return runAction<RespuestaAsistente>(async () => {
    if (!asistente.asistenteDisponible()) {
      throw new Error('El asistente no está disponible en este momento.');
    }

    const consulta = consultaSchema.parse(entrada);
    if (!consulta.mensaje && !consulta.imagen) {
      throw new Error('Escribe, di algo o envía una foto.');
    }

    await enforceRateLimit(RATE_LIMITS.asistente, 'asistente');

    const catalogo = await asistente.cargarCatalogo();

    let salida: asistente.SalidaAsistente;
    try {
      salida = await asistente.consultarAsistente(
        catalogo,
        consulta.historial,
        consulta.mensaje,
        consulta.imagen,
      );
    } catch (err) {
      // El error de la API puede traer detalles internos: se registra
      // completo y al visitante le llega un mensaje genérico.
      logger.error('Falló la consulta al asistente', { err: String(err) });
      throw new Error('El asistente no pudo responder ahora. Inténtalo de nuevo en un momento.');
    }

    const normalizada = asistente.normalizarRespuesta(salida, catalogo);

    const agregados: string[] = [];
    const noAgregados: string[] = [];
    if (normalizada.agregar.length > 0) {
      const identity = await resolveCartIdentity(true);
      for (const { producto, cantidad } of normalizada.agregar) {
        try {
          await cartService.addItem(identity, producto.id, cantidad);
          agregados.push(cantidad > 1 ? `${cantidad} × ${producto.nombre}` : producto.nombre);
        } catch (err) {
          noAgregados.push(
            err instanceof Error ? err.message : `No se pudo añadir ${producto.nombre}.`,
          );
        }
      }
      if (agregados.length > 0) revalidatePath('/carrito');
    }

    return {
      respuesta: normalizada.respuesta,
      productos: normalizada.productos.map((p) => ({
        slug: p.slug,
        nombre: p.nombre,
        precio: p.precioFinal,
        descuento: p.descuento,
        agotado: p.stock <= 0,
        imagen: p.imagen,
      })),
      agregados,
      noAgregados,
    };
  });
}
