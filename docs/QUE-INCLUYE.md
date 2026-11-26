# Qué incluye Pacandé

Qué está hecho, qué no, y qué trabajo haría falta para convertir esta
demostración en una tienda que cobre de verdad. La segunda parte es la
importante: dice sin rodeos dónde están los límites.

---

## Lo que recibes

Una tienda en línea completa y funcionando, con su panel de
administración, lista para adaptarse a tu negocio.

### Para tus clientes

|                       |                                                                                                                                           |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **Catálogo**          | Categorías en dos niveles, con filtros de precio, disponibilidad y valoración, y cuatro criterios de orden                                |
| **Búsqueda**          | Por nombre y descripción, con los mismos filtros                                                                                          |
| **Ficha de producto** | Galería con miniaturas, valoración, opiniones, productos relacionados y datos estructurados para Google                                   |
| **Carrito**           | Persistente. Funciona sin cuenta y se conserva al iniciar sesión                                                                          |
| **Cupones**           | Porcentaje o importe fijo, con vigencia, compra mínima y tope de usos                                                                     |
| **Compra**            | Checkout con direcciones guardadas y comprobante                                                                                          |
| **Cuenta**            | Perfil, contraseña, historial de pedidos, favoritos y libreta de direcciones                                                              |
| **Opiniones**         | Solo de quien compró, y con moderación previa                                                                                             |
| **Voz y foto**        | Búsqueda dictando o con una foto, gratis y en el navegador. Con clave de Claude, además, asistente con IA que conversa y añade al carrito |

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
- **Más de 230 pruebas automáticas** (188 unitarias, muchas contra una
  base de datos real, y 43 de navegador) que se ejecutan solas en cada
  cambio.
- **Auditoría automática:** `npm run audit` comprueba las reglas del
  proyecto y la integridad del repositorio.
- **Documentación completa**, en español, explicando el porqué de cada
  decisión y no solo el qué.

---

## Lo que **no** incluye

Dicho sin rodeos, porque es donde suelen aparecer las sorpresas. Se separa
en dos grupos: lo que **está preparado y solo espera a que alguien pague el
servicio**, y lo que de verdad quedó fuera del alcance del proyecto.

### Pendiente por costo: el código está listo

Pacandé es un proyecto académico sin presupuesto. Todo lo de este grupo
depende de un servicio de pago, así que se construyó hasta donde se podía
sin pagar y quedó listo para activarse.

**1. Asistente de compras con IA.** El asistente que entiende pedidos
como «un regalo para alguien que hace deporte», responde en voz alta y
añade productos al carrito está programado y probado, pero usa la API de
Claude, que cobra por consulta. Se activa añadiendo `ANTHROPIC_API_KEY`
(paso 4 de [`DESPLIEGUE.md`](DESPLIEGUE.md)). Mientras tanto, el mismo
panel funciona **gratis**: búsqueda por voz por palabras y búsqueda por
foto con un modelo que corre en el navegador.
**Cuesta:** centavos de dólar por exposición; saldo prepago en
platform.claude.com.

**2. Cobros reales.** La pasarela de pago está **simulada**: aprueba el
90 % de los intentos y no mueve dinero. Lo que la rodea sí está resuelto y
no hay que rehacerlo: descuento de stock sin sobreventa, congelado de
precios, numeración de pedidos, cupones, transacciones y reversión cuando
el pago se rechaza. Conectar una pasarela real es implementar una interfaz
de dos métodos y añadir un webhook.
**Cuesta:** cuenta de comercio en Wompi, Mercado Pago o Stripe, que exige
datos de empresa y cobra comisión por transacción.

**3. Correos.** No se envía ningún correo, así que **no hay recuperación
de contraseña** ni confirmación de pedido por correo.
**Cuesta:** un proveedor de envío (Resend, SendGrid) y, sobre todo, un
dominio propio verificado: sin dominio, los correos llegan a spam o no
salen.

**4. Dominio propio.** La tienda vive en `pacande.vercel.app`, el
subdominio gratuito de Vercel.
**Cuesta:** el registro anual de un dominio.

### Fuera del alcance del proyecto

Estas no dependen de dinero sino de tiempo y de decisiones de diseño:

- **Variantes de producto** (tallas, colores). Es una decisión de modelo
  de datos que atraviesa carrito, inventario, pedidos y panel; conviene
  tomarla antes de cargar el catálogo. Una o dos semanas de trabajo.
- Segundo factor de autenticación y verificación de correo al registrarse
  (esta última, además, necesita el envío de correos de arriba).
- Las imágenes subidas no se redimensionan ni se optimizan.
- Un solo idioma; las otras monedas son solo de vista.
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

## Lo que puedes hacer con el código

Es código abierto bajo licencia MIT: puedes usarlo, estudiarlo,
modificarlo y redistribuirlo, también con fines comerciales, siempre que
conserves el aviso de autoría. El texto completo está en
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
