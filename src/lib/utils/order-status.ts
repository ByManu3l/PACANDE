import type { OrderStatus, ShipmentStatus } from '@/generated/prisma/client';

/**
 * Traducciones de los enums de estado a texto para la interfaz.
 *
 * Los enums viven en inglés en la base de datos (convención de Prisma y
 * lo que espera cualquier integración futura) y solo se traducen al
 * mostrarlos. Al ser `Record<OrderStatus, string>`, añadir un valor al
 * enum sin añadir su etiqueta aquí rompe la compilación en vez de
 * mostrar un hueco en la pantalla.
 */
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING_PAYMENT: 'Pendiente de pago',
  PAID: 'Pagado',
  CANCELLED: 'Cancelado',
  COMPLETED: 'Completado',
};

/** Ver `ORDER_STATUS_LABELS`. */
export const SHIPMENT_STATUS_LABELS: Record<ShipmentStatus, string> = {
  PENDING: 'Pendiente',
  PROCESSING: 'En preparación',
  SHIPPED: 'Enviado',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado',
};
