# Decisiones técnicas

Por qué el proyecto es como es. Cada entrada dice **qué se eligió**, **qué
se descartó** y **cuándo tendría sentido cambiar de idea**.

Esto no es documentación de referencia: es el razonamiento que normalmente
se pierde y que obliga al siguiente desarrollador a reabrir debates ya
cerrados.

---

## 1. Next.js App Router en lugar de frontend y backend separados

**Se descartó:** mantener React + Vite por un lado y una API Express por
otro, que era la forma original de este proyecto.

Separarlos duplica el modelo de datos (una vez en el backend, otra en los
tipos del frontend), obliga a mantener CORS y autenticación entre dos
procesos, y en la práctica lo que se ganaba —poder desplegarlos por
separado— no se usaba nunca. Con App Router, una página consulta la base
de datos directamente y un formulario invoca una función de servidor sin
que nadie escriba un `fetch`.

El coste real es que hay que entender la frontera servidor/cliente, que
no es trivial. La sección de [ARQUITECTURA.md](ARQUITECTURA.md) sobre
Server Components existe por eso.

**Cambiaría si:** necesitaras varios clientes (una app móvil nativa, por
ejemplo) consumiendo la misma API. Ahí una API explícita sí se gana su
complejidad.

---

## 2. PostgreSQL en lugar de MongoDB

**Se descartó:** MongoDB, que era la base original.

Una tienda es datos relacionales sin ambigüedad: pedidos que pertenecen a
usuarios, líneas que pertenecen a pedidos, productos que pertenecen a
categorías. Con MongoDB esas relaciones se sostienen a mano, y basta un
olvido para quedarse con líneas apuntando a productos borrados.

Además, dos cosas que este proyecto necesita y que Postgres da de fábrica:

- **Transacciones sobre varias tablas.** El checkout crea el pedido, sus
  líneas y descuenta stock como una sola operación indivisible.
- **El tipo `numeric`.** Los importes se guardan en decimal exacto. En
  coma flotante, `0.1 + 0.2` no es `0.3`, y ese error se acumula al sumar
  las líneas de un pedido.

---

## 3. Prisma como ORM

**Se descartó:** Drizzle (excelente, pero con menos material de apoyo) y
SQL a mano (más control, mucho más código repetitivo).

Prisma genera los tipos de TypeScript desde el esquema, así que renombrar
una columna rompe la compilación en todos los sitios afectados en vez de
fallar en tiempo de ejecución. Sus migraciones están versionadas en
`prisma/migrations/`, de modo que cualquiera reconstruye la base con un
comando.

Donde Prisma no llega —el contador atómico de números de pedido— se baja
a SQL con `$queryRaw`. Es una salida perfectamente válida y está usada a
propósito en `order.service.ts`.

**Nota de versión:** este proyecto usa Prisma 7 con _driver adapters_, no
el motor binario clásico. Dos consecuencias que sorprenden:

- La conexión se configura explícitamente en `lib/prisma.ts`.
- Los errores de restricción única **no** traen `meta.target`. Ver
  `isUniqueViolation` en `lib/utils/errors.ts`.

---

## 4. Auth.js con sesión en JWT

**Se descartó:** implementar sesiones a mano (fácil de hacer mal:
rotación, expiración, CSRF, cookies seguras) y sesiones almacenadas en
base de datos.

La sesión va en un JWT y no en base de datos por una razón técnica
concreta: `proxy.ts` corre en el runtime Edge, donde no se puede
consultar Prisma. Una sesión en base de datos exigiría una consulta en
cada navegación, y ahí simplemente no es posible.

**El compromiso, dicho claro:** cambiar el rol de alguien no surte efecto
hasta que su token se renueva. Si necesitas revocación inmediata —banear
a alguien al instante— habría que pasar a sesiones en base de datos y
mover la comprobación del proxy a los layouts.

---

## 5. Tailwind + shadcn/ui, sin biblioteca de componentes

**Se descartó:** Material UI y styled-components, que usaba el proyecto
original.

Ambas dependen de CSS-in-JS en tiempo de ejecución, lo que obliga a
marcar como cliente casi todo el árbol de componentes y anula la ventaja
de los Server Components. Con Tailwind, los estilos son clases estáticas
y una página puede renderizarse enteramente en el servidor.

shadcn/ui **no es una dependencia**: sus componentes se copian al
repositorio. Nada se rompe al actualizar una versión, y adaptar un
componente es editar un archivo tuyo.

**Aviso importante:** esta plantilla usa la variante construida sobre
**Base UI**, no sobre Radix. La API difiere (`render` en vez de
`asChild`, entre otras), así que los ejemplos de la documentación de
Radix no funcionan tal cual. Cada archivo de `components/ui/` lo indica en
su cabecera.

---

## 6. Server Actions en lugar de rutas de API

**Se descartó:** rutas `app/api/**` para cada operación.

Una Server Action es una función que el navegador puede llamar
directamente, con tipos de extremo a extremo y sin serializar nada a
mano. Un endpoint REST para lo mismo son entre 20 y 30 líneas de
repetición: parsear, validar el método, responder con el código correcto.

Lo único que sigue siendo una ruta de API es el manejador de Auth.js, que
lo exige el protocolo.

**El riesgo, que hay que tener presente:** una Server Action es un
endpoint HTTP público. Se puede invocar con `fetch` desde la consola del
navegador. Por eso **cada** acción de administración vuelve a comprobar
el rol, y no basta con que `proxy.ts` proteja la ruta.

---

## 7. Pasarela de pago simulada

**Se descartó:** integrar Stripe, Wompi o Mercado Pago de verdad.

Una integración real necesita una cuenta, claves y endpoints de webhook
propios de cada negocio. Una plantilla no puede traer eso hecho, y
fingirlo con claves de prueba daría la falsa impresión de que ya está
resuelto.

Lo que sí está resuelto —y no hay que rehacer— es todo lo que rodea al
cobro: descuento de stock, congelado de precios, numeración de pedidos,
transacciones, reversión al rechazarse el pago. La simulación está
aislada en un solo archivo, `lib/services/payment.service.ts`, detrás de
la interfaz `PaymentProvider`.

Ver [PERSONALIZACION.md](PERSONALIZACION.md) para el procedimiento de
sustitución.

---

## 8. El catálogo vive en la base de datos, no en la configuración

Categorías y productos son datos de negocio que cambian a diario y que un
administrador gestiona desde el panel. Solo la identidad de la tienda
—nombre, moneda, contacto— está en `site.config.ts`, porque se define una
vez al arrancar el proyecto y no vuelve a tocarse.

**Se descartó** una tabla `Settings` en base de datos: sería
infraestructura (interfaz de edición, caché, invalidación) para algo que
se edita una vez en la vida del proyecto.

---

## 9. Pruebas contra Postgres real, no simulado

Suplantar Prisma hace las pruebas rápidas, pero solo comprueba que el
código llama a las funciones que el propio test espera. No detecta lo que
de verdad importa aquí: si dos compras simultáneas pueden vender la misma
unidad, si una restricción de clave foránea impide borrar algo, si una
transacción revierte del todo.

Esas propiedades **son** el valor de este proyecto, así que las pruebas
corren contra una base de datos real. `tests/unit/setup.ts` rechaza
ejecutarse si `DATABASE_URL` no apunta a la base de pruebas.

El coste: hace falta Postgres para correr los tests. Se resuelve con
`docker compose up -d` en local y con un contenedor de servicio en CI.

---

## 10. El carrito no reserva inventario

Tener algo en el carrito **no** garantiza poder comprarlo. El stock se
descuenta al pagar.

**Se descartó** reservar al añadir, que es lo que hacen algunas tiendas
grandes. Exige un trabajo periódico que libere las reservas de carritos
abandonados, decidir cuánto duran, y explicárselo al cliente cuando su
reserva expira. Es infraestructura considerable para un caso que solo
aparece con inventarios muy ajustados.

Lo que sí se hace es avisar pronto: `addItem` comprueba el stock para no
dejar añadir 999 unidades de algo que tiene 2. Es cortesía, no garantía —
la garantía está en el checkout.

---

## 11. Números de pedido consecutivos por día

`PCD-20260822-0001`. Legible por teléfono, ordenable, y comunica algo al
cliente.

**Se descartó** derivarlo de `COUNT(*)`, que era lo que hacía el proyecto
original: la consulta se vuelve más lenta conforme crece la tienda y, lo
importante, dos compras simultáneas generan el mismo número.

La tabla `OrderCounter` reserva cada valor con un
`INSERT ... ON CONFLICT DO UPDATE ... RETURNING`, en una sola sentencia
sin lecturas previas que puedan solaparse.

**El compromiso:** dentro de la transacción del pedido, esa fila queda
bloqueada, así que los checkouts simultáneos se serializan en ese punto.
Es despreciable frente a lo que tarda el resto del checkout. Si algún día
estorba, la salida es renunciar al consecutivo diario y usar un
identificador opaco (ULID).

---

## 12. Sin conversor de moneda en vivo

El proyecto original consultaba una API pública sin autenticación para
convertir precios. Eso hace que la tienda deje de funcionar cuando ese
servicio se cae o cambia, y depende de un tercero que nadie controla.

Ahora hay una sola moneda, en `site.config.ts`, y `formatPrice()` es el
único punto a tocar si un proyecto necesita varias. Una tienda con precios
multi-moneda de verdad guarda el precio de cada moneda en base de datos,
no lo convierte al vuelo con una tasa del día.

---

## 13. Los datos de tarjeta no llegan al servidor

El formulario de checkout pide número, titular, vencimiento y CVV, pero
el navegador solo envía al servidor los campos declarados en
`CHECKOUT_SERVER_FIELDS`: dirección y método de pago.

Los datos de tarjeta **no** salen del navegador. Cualquier dato que llega
al servidor puede acabar en un registro, en una traza de error o en una
copia de seguridad, y manejar números de tarjeta obliga a cumplir
PCI-DSS. Toda pasarela seria funciona así: el navegador habla
directamente con la pasarela y el servidor solo recibe un identificador.
Esta plantilla imita ese flujo desde el principio para que sustituir la
pasarela simulada por una real no obligue a rediseñar el checkout.

---

## 14. Un solo idioma, en español

La interfaz, los mensajes de error y los comentarios están en español.

**Se descartó** montar internacionalización. Añade una capa de indirección
a cada texto de la aplicación, y la mayoría de proyectos que parten de
esta plantilla operan en un solo mercado. Si necesitas varios idiomas, el
punto de partida es `next-intl` sobre las rutas ya existentes; no hay nada
en la arquitectura que lo impida.

Los identificadores del código y los valores de los enums están en inglés,
que es la convención del ecosistema. Solo se traducen al mostrarse — ver
`lib/utils/order-status.ts`.

---

## 15. Licencia MIT: proyecto abierto

**Se descartó:** la licencia comercial que tuvo durante un tiempo.

Pacandé nació como proyecto académico. Después se reescribió con la idea
de darle una segunda vida como plantilla de pago, y durante esa etapa
tuvo una licencia comercial que prohibía redistribuirla. Ese plan no
siguió adelante, y una licencia restrictiva sobre un proyecto que no se
vende solo estorba: impide enseñarlo, compartirlo y que otros aprendan de
él.

Vuelve a MIT, que era su licencia inicial:

- Cualquiera puede leer, usar, modificar y redistribuir el código, también
  con fines comerciales, conservando el aviso de autoría.
- El repositorio puede ser público y la tienda puede desplegarse como
  demostración abierta.

**Cambiaría si:** volviera a plantearse venderla. Aun así, las versiones
ya publicadas bajo MIT seguirían libres para siempre.

---

## 16. Asistente de compras: una llamada con el catálogo entero, no un agente

**Se descartó:** un agente con herramientas (buscar, filtrar, añadir al
carrito) que el modelo llama en bucle, y una búsqueda por similitud de
imágenes con vectores.

El catálogo tiene unos cien productos: cabe entero en el contexto del
modelo, que así no necesita buscar, solo elegir. Cada mensaje es **una
sola llamada** a la API de Claude que recibe las instrucciones, el
catálogo (marcado para caché, así que repetirlo cuesta una fracción) y la
conversación, y devuelve JSON con un esquema fijo: la respuesta, los
productos a mostrar y los que hay que añadir al carrito.

- **Más rápido**: una llamada en vez de varias. Al hablar con la tienda,
  cada segundo de espera se nota.
- **No puede inventar**: `normalizarRespuesta` cruza cada producto con la
  base de datos y descarta lo que no existe antes de mostrarlo o tocar el
  carrito. El carrito lo modifica el servidor con las mismas reglas de
  stock de siempre, nunca el modelo.
- **La foto reutiliza lo mismo**: se adjunta la imagen al mensaje y el
  modelo la compara con el catálogo. Sin vectores ni índices que mantener.
- **La voz no sale del navegador**: el reconocimiento y la lectura usan la
  Web Speech API; al servidor solo llega el texto transcrito.

Límites conscientes: 20 consultas por visitante cada 10 minutos (cada una
cuesta dinero), mensajes de 500 caracteres como máximo y fotos reducidas
a 1024 px en el navegador antes de enviarse.

**Cambiaría si:** el catálogo creciera a miles de productos. Entonces sí
haría falta una herramienta de búsqueda —la que ya existe en
`product.service.ts`— para que el modelo reciba solo los candidatos.
