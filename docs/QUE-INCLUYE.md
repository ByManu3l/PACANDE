# Qué incluye esta plantilla

Documento para el cliente. Dice qué está hecho, qué no, y qué trabajo
adicional hace falta antes de vender el primer producto. La segunda parte
es la importante: una venta que empieza con expectativas equivocadas
termina mal aunque el código sea impecable.

---

## Lo que recibes

Una tienda en línea completa y funcionando, con su panel de
administración, lista para adaptarse a tu negocio.

### Para tus clientes

|                       |                                                                                                            |
| --------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Catálogo**          | Categorías en dos niveles, con filtros de precio, disponibilidad y valoración, y cuatro criterios de orden |
| **Búsqueda**          | Por nombre y descripción, con los mismos filtros                                                           |
| **Ficha de producto** | Galería con miniaturas, valoración, opiniones, productos relacionados y datos estructurados para Google    |
| **Carrito**           | Persistente. Funciona sin cuenta y se conserva al iniciar sesión                                           |
| **Cupones**           | Porcentaje o importe fijo, con vigencia, compra mínima y tope de usos                                      |
| **Compra**            | Checkout con direcciones guardadas y comprobante                                                           |
| **Cuenta**            | Perfil, contraseña, historial de pedidos, favoritos y libreta de direcciones                               |
| **Opiniones**         | Solo de quien compró, y con moderación previa                                                              |

### Para ti

|               |                                                                                        |
| ------------- | -------------------------------------------------------------------------------------- |
| **Catálogo**  | Alta, edición y baja de categorías y productos, con subida de imágenes                 |
| **Pedidos**   | Listado, detalle y cambio de estado del envío                                          |
| **Cupones**   | Creación y control de usos, con estado efectivo (activo, vencido, agotado, programado) |
| **Opiniones** | Cola de moderación con aviso de pendientes                                             |
| **Usuarios**  | Tres roles con permisos diferenciados                                                  |

### Por debajo

- **Next.js 16, TypeScript estricto, PostgreSQL.** Tecnología actual y de
  las más solicitadas del mercado.
- **189 pruebas automáticas** (150 unitarias contra una base de datos
  real, 39 de navegador) que se ejecutan solas en cada cambio.
- **Auditoría automática:** `npm run audit` comprueba las reglas del
  proyecto y la integridad del repositorio.
- **Documentación completa**, en español, explicando el porqué de cada
  decisión y no solo el qué.

---

## Lo que **no** incluye

Dicho sin rodeos, porque es donde suelen aparecer las sorpresas.

### 1. Cobros reales

La pasarela de pago está **simulada**. Aprueba el 90 % de los intentos y
no mueve dinero.

Lo que sí está resuelto y no hay que rehacer: descuento de stock sin
sobreventa, congelado de precios, numeración de pedidos, cupones,
transacciones y reversión cuando el pago se rechaza. Conectar una pasarela
real es implementar una interfaz de dos métodos y añadir un webhook.

**Trabajo estimado:** de medio día a dos días, según el proveedor.
**Necesitas:** cuenta de comercio en Stripe, Wompi, Mercado Pago o similar.

### 2. Correos

No se envía ningún correo. Eso significa que **no hay recuperación de
contraseña** ni confirmación de pedido por correo.

Ambas cosas dependen de un proveedor de envío que cada negocio elige, y
que exige verificar un dominio.

**Trabajo estimado:** un día para las dos.
**Necesitas:** cuenta en Resend, SendGrid o similar, y acceso al DNS de tu
dominio.

### 3. Variantes de producto

No hay tallas ni colores. Un producto es una unidad con un precio y un
stock.

Esto no es una función que falte: es una decisión de modelo de datos que
atraviesa carrito, inventario, pedidos y panel. Añadirla después es
posible, pero no es un añadido pequeño.

**Trabajo estimado:** de una a dos semanas.
**Conviene decidirlo antes de cargar el catálogo.**

### 4. Otras ausencias conocidas

- Segundo factor de autenticación y verificación de correo al registrarse.
- Las tablas del panel no están paginadas (el escaparate sí lo está).
- Las imágenes subidas no se redimensionan ni se optimizan.
- Un solo idioma y una sola moneda.
- Sin integración contable ni con transportadoras.
- La búsqueda usa coincidencia de texto simple: suficiente para unos
  miles de productos, no para cientos de miles.

El listado completo, con su razonamiento, está en
[`AUDITORIA.md`](AUDITORIA.md).

---

## Poner la tienda en marcha

### Lo que necesitas contratar

| Servicio         | Para qué                          | Coste orientativo                               |
| ---------------- | --------------------------------- | ----------------------------------------------- |
| Alojamiento      | Servir la tienda                  | Gratis para empezar (Vercel); de pago al crecer |
| Base de datos    | Guardar el catálogo y los pedidos | Gratis para empezar (Neon, Supabase)            |
| Dominio          | Tu dirección web                  | Anual, económico                                |
| Pasarela de pago | Cobrar                            | Comisión por transacción                        |
| Envío de correo  | Avisos al cliente                 | Gratis hasta cierto volumen                     |

### Qué tienes que hacer

1. Cambiar nombre, moneda y datos de contacto — **un archivo**.
2. Cambiar el color de marca — **un valor**.
3. Cargar tu catálogo, desde el panel o el archivo de datos de ejemplo.
4. Sustituir las imágenes de ejemplo por las tuyas.
5. Escribir tus términos y tu política de privacidad.
6. Conectar la pasarela de pago.
7. Desplegar.

El procedimiento detallado está en
[`PERSONALIZACION.md`](PERSONALIZACION.md), con una lista de verificación
antes de publicar.

**Sin la pasarela ni los correos**, del clonado a la tienda desplegada con
tu marca y tu catálogo hay entre uno y tres días de trabajo.

---

## Lo que puedes y no puedes hacer con el código

**Puedes:** usarlo, modificarlo, desplegarlo con fines comerciales y
quedarte con todo lo que ganes. El código que escribas encima es tuyo.

**No puedes:** revenderlo ni redistribuirlo como plantilla, tema o kit de
inicio, ni publicarlo en un repositorio abierto.

En una frase: **puedes construir y vender tu tienda; no puedes vender la
herramienta con la que la construiste.** El texto completo está en
[`LICENSE`](../LICENSE).

---

## Preguntas frecuentes

**¿Puedo contratar a otro programador para que trabaje sobre esto?**
Sí. Es uno de los objetivos de la documentación: `ARQUITECTURA.md` y
`CONTRIBUIR.md` están escritos para que alguien que llega de fuera se
oriente sin tener que preguntar.

**¿Qué pasa si Next.js saca una versión nueva?**
Dependabot propone las actualizaciones automáticamente y la suite de
pruebas dice si algo se rompió. Las versiones mayores siempre exigen
revisión manual.

**¿Aguanta muchas visitas?**
Las consultas están paginadas e indexadas, y el catálogo se sirve
renderizado desde el servidor. Para volúmenes altos hay dos cosas
pendientes que están documentadas: paginar las tablas del panel y pasar la
búsqueda a texto completo de Postgres.

**¿Y si encuentro un fallo?**
`SECURITY.md` explica cómo reportar los de seguridad. Para el resto, el
repositorio tiene plantillas de issue.
