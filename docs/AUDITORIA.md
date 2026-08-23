# Informe de auditoría

Auditoría integral de la plantilla, ejecutada según el plan de
[`auditoria-prompt.md`](auditoria-prompt.md). Cubre desde `fe4872b` hasta
la punta de `main`.

Este documento es el **estado verificado** del proyecto: qué se encontró,
qué se corrigió, qué se decidió deliberadamente no tocar y qué queda
fuera de alcance. Todo lo que aquí se afirma se comprobó ejecutándolo, no
leyendo el código.

---

## Resumen

Se auditaron 114 archivos TypeScript y el esquema de base de datos. Se
encontraron y corrigieron **17 defectos**, cinco de ellos con impacto
directo en seguridad o en integridad de datos —incluidos dos que podían
costar dinero real: sobreventa de inventario y datos de tarjeta llegando
al servidor.

El grueso del trabajo, sin embargo, no fueron los defectos sino la
**documentación**: 1.327 líneas de comentarios explicativos en el código
y cuatro documentos nuevos. Esa era la mitad del encargo, porque una
plantilla que nadie entiende no vale como plantilla.

Estado al cerrar:

| Comprobación              | Resultado                     |
| ------------------------- | ----------------------------- |
| ESLint                    | 0 errores, 4 avisos conocidos |
| TypeScript (estricto)     | Sin errores                   |
| Pruebas unitarias         | 75 / 75                       |
| Pruebas end-to-end        | 11 / 11                       |
| Build de producción       | Correcto                      |
| Prisma fuera de servicios | Ninguna ocurrencia            |
| Marca fuera de la config  | Ninguna ocurrencia            |

---

## Hallazgos por severidad

### Críticos — corregidos

**1. Los datos de tarjeta llegaban al servidor.**
El formulario de checkout enviaba número, titular, vencimiento y CVV a la
Server Action. Bastaba un registro de errores o una copia de seguridad
para que quedaran almacenados, y obligaba a cumplir PCI-DSS a cualquiera
que desplegara la plantilla.
_Corrección:_ el esquema se partió en dos. `checkoutFormSchema` valida en
el navegador; `checkoutSchema` es lo único que acepta el servidor, y
`CHECKOUT_SERVER_FIELDS` determina qué se envía.
_Verificado:_ interceptando `fetch` en el navegador y confirmando que el
número de tarjeta no aparece en el cuerpo de la petición.

**2. Sobreventa de inventario.**
El checkout comprobaba el stock y lo descontaba en dos sentencias
separadas. Bajo el nivel de aislamiento por defecto de Postgres (READ
COMMITTED), dos compras simultáneas leen ambas `stock = 1`, ambas pasan la
comprobación y ambas descuentan: el stock queda en −1 y se vendió una
unidad inexistente.
_Corrección:_ un `UPDATE ... WHERE stock >= cantidad` que comprueba y
descuenta en la misma sentencia. Si no afecta a ninguna fila, la
transacción entera revierte.
_Verificado:_ se escribió la prueba, se revirtió temporalmente la
corrección y la prueba falló con «se esperaban 2 completados, se quería
1». Sin esa comprobación no habría sabido que la prueba servía.

**3. Números de pedido duplicados.**
El consecutivo se derivaba de `COUNT(*)` sobre la tabla de pedidos. Dos
checkouts simultáneos generaban el mismo número y chocaban contra el
índice único; además, la consulta se degradaba conforme creciera la
tienda.
_Corrección:_ tabla `OrderCounter` con
`INSERT ... ON CONFLICT DO UPDATE ... RETURNING`, que reserva cada valor
en una sola sentencia.

**4. Una Server Action aceptaba un `userId` arbitrario.**
La resolución de identidad del carrito estaba exportada desde un archivo
`'use server'`, lo que la convertía en un endpoint HTTP público que
aceptaba el identificador de cualquier usuario.
_Corrección:_ se movió a `lib/cart-session.ts`, un módulo de servidor
normal, no invocable desde el navegador.

**5. Enumeración de correos por tiempo de respuesta.**
El login salía antes si el correo no existía. Como bcrypt tarda unos
100 ms, la diferencia era medible y permitía averiguar qué correos tienen
cuenta sin adivinar ninguna contraseña.
_Corrección:_ se compara siempre contra un hash señuelo.
_Nota:_ la primera versión de la prueba falló con una proporción de 24×
porque la factoría de pruebas usa un coste bcrypt bajo mientras el señuelo
usa el real. Se rehízo usando el camino de registro real, y quedó
documentada la invariante de que ambos costes deben coincidir.

---

### Altos — corregidos

**6. Recorrido de rutas en el borrado de archivos.**
`storage.delete()` concatenaba la ruta recibida sin validarla. Una entrada
como `/../../.env` permitía borrar archivos fuera del directorio público.
_Corrección:_ `resolveWithinPublic()` resuelve y verifica que el destino
está dentro de `public/`.

**7. Fuga permanente de archivos en disco.**
Cambiar un avatar o quitar la imagen de un producto dejaba el archivo
anterior en disco para siempre.
_Corrección:_ los servicios devuelven qué archivos quedaron huérfanos y
la acción los borra. Solo se borran subidas de usuario: las imágenes del
catálogo de ejemplo están versionadas y varios productos comparten la
misma.

**8. Los mensajes de validación se perdían.**
Un `ZodError` no se reconocía como error previsto, así que
«El nombre debe tener al menos 2 caracteres» llegaba al usuario como
«Ocurrió un error inesperado».
_Corrección:_ `runAction` trata `ZodError` aparte y muestra el mensaje del
primer campo inválido.

**9. Tres condiciones de carrera en comprobaciones de unicidad.**
Registro, edición de perfil y edición desde el panel comprobaban el correo
con un `SELECT` previo. Entre esa lectura y la escritura cabe otra
petición con el mismo correo.
_Corrección:_ se intenta la escritura y se traduce el error del índice
único. Es la única comprobación que no se puede colar.
_Hallazgo asociado:_ con los _driver adapters_ de Prisma 7, el error P2002
**no** trae `meta.target` — la columna en conflicto llega en
`meta.driverAdapterError.cause.constraint.fields`. La primera versión del
detector solo leía `meta.target` y fallaba en silencio; lo descubrió la
prueba. Ahora lee ambas formas y está documentado.

**10. Ciclos en el árbol de categorías.**
Se impedía que una categoría fuera su propia madre, pero no que se
colgara de una de sus propias descendientes. Un ciclo A → B → A habría
hecho desaparecer esas categorías del menú, porque el recorrido parte de
las raíces y un ciclo no tiene raíz.
_Corrección:_ se recorre la cadena de madres antes de guardar.

**11. Ventana de carrera al borrar categorías.**
Los recuentos de productos e hijas se hacían fuera de la transacción.
_Corrección:_ todo dentro de `$transaction`.

**12. Sin control de stock al llenar el carrito.**
Se podían añadir 999 unidades de un producto con 2, y el problema no
aparecía hasta el momento de pagar.
_Corrección:_ `addItem` valida contra el stock **contando lo que ya hay
en el carrito**, no solo lo que se añade — pulsar «añadir 1» diez veces se
colaba con la comprobación ingenua.

**13. Fusión de carritos no transaccional.**
Volcar el carrito anónimo al iniciar sesión hacía N+1 lecturas fuera de
transacción. Un fallo a medias dejaba el carrito parcialmente volcado y
aun así borrado, perdiendo líneas.
_Corrección:_ una transacción con `upsert`.

---

### Medios — corregidos

**14. Aritmética de coma flotante sobre el importe que se cobra.**
El subtotal del pedido se sumaba con `Number` antes de guardarse en una
columna `Decimal`. Con pesos colombianos el resultado coincidía, pero no
es un sitio donde valga «casi siempre bien».
_Corrección:_ aritmética `Decimal` de principio a fin.

**15. Consultas de catálogo sin límite.**
Una categoría con miles de productos los traía todos en cada visita.
_Corrección:_ paginación real en base de datos (`lib/utils/pagination.ts`),
con navegación mediante enlaces reales — compartibles, indexables y
compatibles con el botón «atrás».

**16. Orden no determinista de categorías.**
Se ordenaba por un campo `position` que el formulario nunca exponía, así
que todas valían 0 y Postgres podía devolverlas en cualquier orden: el
menú se reordenaba solo entre recargas.
_Corrección:_ el campo se expone en el formulario y el desempate es por
nombre.

**17. La tienda no se podía usar en un teléfono.**
No había navegación móvil: el menú de categorías simplemente no existía
por debajo del punto de corte.
_Corrección:_ menú lateral con `Sheet`.

---

## Deuda deliberada — no corregida, y por qué

Estas decisiones son conscientes. Están aquí para que nadie las descubra
como sorpresa.

| Asunto                                                    | Razón para dejarlo                                                                                                                 |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 4 avisos de lint por `watch()` de react-hook-form         | Vienen de la biblioteca, no del código propio. Silenciarlos ocultaría avisos legítimos futuros.                                    |
| 3 vulnerabilidades «altas» de `npm audit`                 | Ver el análisis detallado abajo. No son alcanzables en producción.                                                                 |
| El carrito no reserva inventario                          | Reservar exige expirar carritos abandonados: bastante infraestructura para un caso que solo aparece con inventarios muy ajustados. |
| Las transiciones de estado de envío no están restringidas | Un administrador necesita poder corregir un error de clic sin pelearse con la aplicación.                                          |
| Las tablas del panel no están paginadas                   | El escaparate, que es lo que ve el público, sí lo está. `lib/utils/pagination.ts` ya existe para aplicarlo aquí cuando haga falta. |
| Pasarela de pago simulada                                 | Una integración real exige cuenta, claves y webhooks propios de cada negocio. Todo lo que la rodea sí está resuelto.               |
| Un solo idioma                                            | La internacionalización añade indirección a cada texto; la mayoría de proyectos que parten de aquí operan en un mercado.           |

### Sobre las vulnerabilidades de `npm audit`

`npm audit --omit=dev` reporta 3 vulnerabilidades altas. Merecen una
explicación porque el número asusta más que el riesgo:

- Las tres son la **misma**: agotamiento de pila en `deepmerge-ts`
  ([GHSA-ggr8-5vv4-36mx](https://github.com/advisories/GHSA-ggr8-5vv4-36mx)),
  contada tres veces por la cadena que la arrastra.
- Llega vía `@prisma/config`, que solo se usa al **leer
  `prisma.config.ts`** — un archivo que escribe quien desarrolla, no una
  entrada de usuario. No hay forma de que un visitante la alcance.
- `prisma` está en `devDependencies`; la dependencia de ejecución de
  `@prisma/client` es únicamente `@prisma/client-runtime-utils`. `npm
audit` la marca porque es un _peer_ opcional que se resuelve en el árbol,
  no porque se despliegue.

**Conclusión:** riesgo efectivo nulo en producción. Se corregirá sola
cuando Prisma actualice su dependencia; forzarlo con `npm audit fix
--force` degradaría Prisma a una versión mayor anterior, que es un daño
real a cambio de un riesgo teórico.

---

## Fuera de alcance — recomendado antes de vender

Ninguna de estas es un defecto: son funcionalidades que una plantilla no
puede decidir por el cliente, pero que conviene tener presupuestadas.

1. **Recuperación de contraseña.** Necesita un proveedor de correo
   (Resend, SendGrid, SES) que cada proyecto elige. Es lo primero que
   pedirá un cliente real.
2. **Confirmación de pedido por correo.** Mismo requisito previo.
3. **Límite de intentos de acceso.** Se implementa mejor en el borde
   (Vercel, Cloudflare) que en la aplicación.
4. **Búsqueda de texto completo.** La actual usa `ILIKE '%…%'`, que
   recorre la tabla. Suficiente para unos miles de productos; la evolución
   natural es `tsvector` + índice GIN de Postgres, antes que incorporar un
   motor externo.
5. **Optimización de imágenes al subirlas.** Hoy se validan tipo y tamaño,
   pero no se redimensionan.
6. **Variantes de producto** (talla, color). Es un cambio de modelo de
   datos, no un añadido: conviene decidirlo antes de tener catálogo.

---

## Documentación producida

Era la mitad del encargo y la mitad del valor comercial del entregable.

| Entregable                     | Contenido                                                                                                 |
| ------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `prisma/schema.prisma`         | Cada modelo, cada campo no evidente y **cada `onDelete`** con su razón de negocio                         |
| `docs/ARQUITECTURA.md`         | Cómo está organizado el proyecto y por qué. Punto de entrada para quien llega                             |
| `docs/DECISIONES.md`           | 14 decisiones técnicas: qué se eligió, qué se descartó, cuándo cambiar de idea                            |
| `docs/PERSONALIZACION.md`      | Convertir la plantilla en una tienda, con lista de comprobación de publicación                            |
| `docs/CONTRIBUIR.md`           | Las 6 reglas del proyecto y cómo no romperlas                                                             |
| `src/lib/**`, `src/actions/**` | JSDoc en todos los exportados, explicando el porqué                                                       |
| `src/components/ui/**`         | Los 19 archivos avisan de que `npx shadcn add` los sobrescribe; los 4 modificados dicen qué se les cambió |
| `LICENSE`                      | MIT                                                                                                       |

Criterio aplicado en todo el código: **explicar el porqué, no el qué.** Un
comentario que repite lo que dice la línea siguiente es ruido; uno que
explica por qué _no_ se hizo de la forma obvia evita que alguien lo
«simplifique» y reintroduzca un fallo.

También se unificó el idioma de los comentarios: había una mezcla de
inglés y español, ahora todo está en español, igual que la interfaz.

---

## Refactorizaciones estructurales

**La regla de capas se declaraba pero no se cumplía.** El README afirmaba
que solo `lib/services/` toca Prisma, pero `category.actions.ts`,
`product.actions.ts` y `app/sitemap.ts` consultaban la base de datos
directamente. Documentar una regla que el código incumple es peor que no
documentarla, así que se movió ese acceso a los servicios. Al hacerlo
salieron a la luz los hallazgos 9, 10 y 11.

Verificable en cualquier momento con:

```bash
grep -rn "prisma\." src/app src/actions src/components
```

Otras eliminaciones de duplicación: el diálogo de confirmación de borrado
estaba copiado en tres tablas del panel, y los tipos de rol se declaraban
por separado en varios sitios.

---

## Cómo se verificó

No se dio nada por bueno leyendo el código.

**Re-marcado.** Se cambió el nombre a «Verdemar», la moneda a USD y el
tono del color de marca, y se comprobó en el navegador: el título pasó a
«Verdemar», los precios de `$ 69.000` a `$69,000.00` (formato
estadounidense, con decimales), el token `--primary` se propagó al fondo
de los botones y no quedó ninguna aparición de «Pacandé» en la página.
Después se revirtió. La marca solo vive en `site.config.ts`.

**Arranque en frío.** Sobre una base de datos recién creada se ejecutaron
las migraciones y el seed siguiendo el README: 3 usuarios, 20 categorías,
92 productos. Ejecutar el seed una segunda vez dio exactamente los mismos
recuentos, confirmando que es idempotente como afirma la documentación.

**Suites.** 75 pruebas unitarias contra Postgres real y 11 end-to-end en
navegador, todas en verde, más lint, typecheck y build.

**Pruebas de las pruebas.** Para los hallazgos 2 y 5 se revirtió
temporalmente la corrección para confirmar que la prueba fallaba. En el
caso 2 esto reveló que la prueba pasaba contra el código defectuoso —el
reintento por colisión de números de pedido enmascaraba la carrera— y
hubo que corregir primero la numeración para que la prueba sirviera de
algo.

---

## Nota sobre un error propio

Durante la auditoría diagnostiqué mal un problema: interpreté que un
diálogo de confirmación «no se cerraba» por una cuestión de prioridad de
`useTransition`, y llegué a escribir un comentario en el código afirmando
esa causa. Era falsa. Al inspeccionar los atributos del DOM
(`data-closed`, `data-ending-style`) quedó claro que el diálogo sí se
cierra: lo que no terminaba era su animación de salida, porque el panel
del navegador estaba oculto y no componía fotogramas.

El comentario incorrecto se eliminó y el error se dejó constar en el
mensaje del commit correspondiente. Se menciona aquí porque un informe de
auditoría que solo cuenta los aciertos no es un informe fiable.

---

---

# Segunda parte — Re-auditoría a nivel comercial

La primera auditoría dejó el proyecto **correcto**. Esta segunda partió de
una observación distinta: correcto y vendible no son lo mismo. El plan
está en [`reauditoria-prompt.md`](reauditoria-prompt.md); esto es lo que
salió.

## Resumen

|                            | Antes               | Después                        |
| -------------------------- | ------------------- | ------------------------------ |
| Pruebas unitarias          | 83                  | **150**                        |
| Pruebas de navegador       | 11                  | **39**                         |
| Auditoría de accesibilidad | ninguna             | **13 páginas, 0 infracciones** |
| Modelos de datos           | 9                   | **13**                         |
| Archivos de gobernanza     | 1                   | **22**                         |
| Auto-auditoría             | verificación manual | **`npm run audit`**            |
| Documentación              | 5 documentos        | **7 documentos**               |
| Licencia                   | MIT                 | **Comercial**                  |

Se corrigieron **once defectos** —tres de ellos de accesibilidad, en
controles que se usan en todas las páginas— y se añadieron reseñas,
cupones, favoritos, direcciones guardadas, filtros de catálogo y galería
de producto, cada uno con su pantalla de administración.

---

## Lo que faltaba, y por qué se notaba

El diagnóstico de partida no fue una lista de deseos. Fue comparar el
repositorio con **GritBase**, otro proyecto del mismo autor que sí
transmite producto comercial, y anotar la diferencia:

- **Cero archivos de gobernanza.** Sin `.editorconfig`, sin ganchos de
  git, sin `CHANGELOG`, sin `SECURITY.md`, sin plantillas. Y sin
  `.gitattributes`, lo que hacía que **cada commit escupiera una veintena
  de avisos de CRLF**.
- **Ninguna forma de demostrar el estado.** GritBase tiene scripts que
  auditan el repositorio; aquí las reglas estaban escritas en la
  documentación y se comprobaban a mano.
- **El escaparate era funcional, no comercial.** Sin filtros —que es lo
  primero que se echa en falta—, sin galería, sin reseñas, sin cupones.
- **Nada que decir en producción.** Sin validación de entorno, sin
  registro estructurado, sin límite de intentos, sin comprobación de
  estado.

---

## Defectos corregidos

### Accesibilidad — tres defectos, todos en controles omnipresentes

**1. Diecisiete controles de navegación se anunciaban como botones.**
`Button render={<Link/>}` produce `<a role="button" href>`, y ese rol
sustituye al rol implícito de enlace. Un lector de pantalla decía «botón»
para «Proceder al pago», el carrito, la paginación y todos los filtros.

La distinción no es teórica: los enlaces aparecen en la lista de enlaces
de la página, se abren en otra pestaña y anuncian que se va a otro sitio.
_Corrección:_ componente `ButtonLink`, que aplica las mismas clases sobre
un `<Link>` real.

**2. Tres botones sin nombre accesible por cada línea del carrito.**
Aumentar, disminuir y eliminar eran botones de icono sin etiqueta: «botón,
botón, botón», sin decir de qué producto.
_Corrección:_ `aria-label` con el nombre del producto, y `aria-live` en la
cantidad para que el nuevo valor se anuncie al cambiarlo.

**3. Contraste insuficiente en el avatar** (4,34 frente al 4,5 exigido por
WCAG AA), presente en todas las páginas porque vive en la barra de
navegación.
_Corrección:_ el par `bg-primary` / `text-primary-foreground`, que
contrasta por diseño en cualquier color de marca.

_Verificado:_ `axe` sobre 9 páginas con las reglas WCAG 2.1 A y AA. Cero
infracciones. Ninguno de los tres lo detectaban ESLint, TypeScript ni las
pruebas funcionales, y los tres habrían vuelto a pasar inadvertidos.

### Funcionales

**4. El menú de cuenta reventaba la página entera.** Al abrirlo:
«Base UI: MenuGroupContext is missing». `DropdownMenuLabel` es la etiqueta
de un _grupo_ y exige un `Menu.Group` alrededor.

Llevaba roto desde que se escribió el componente. **Nadie lo vio porque la
prueba de extremo a extremo cerraba sesión con una petición directa al
endpoint CSRF de Auth.js en vez de usar el menú** — la prueba fingía la
interacción que decía comprobar. Es el hallazgo más instructivo de toda la
auditoría: una prueba que evita la interfaz real no prueba la interfaz
real.

**5. Un `Decimal` volvía a cruzar al cliente.** El carrito hacía
`{ ...producto, price: … }`; al añadir `ratingAverage` al modelo, ese
campo empezó a colarse. Es justo el patrón que el ayudante `toProductCard`
existe para evitar, y este punto de llamada era anterior.

**6. «Limpiar filtros» borraba el término buscado.** Apuntaba al camino
base a secas, así que en `/buscar` dejaba la página vacía.

**7. El seed dependía del singleton de Prisma de la aplicación**, que tras
añadir `server-only` lanzaba fuera del runtime de Next.js. Lo detectó CI.

### De integridad

**8. Cupones sin tope podían dar totales negativos.** Un cupón de importe
fijo mayor que la compra habría hecho pagar al cliente por comprar.
_Corrección:_ el descuento nunca supera el subtotal, y los porcentuales
admiten un tope propio.

**9. El contador de usos de un cupón se podía superar.** Comprobar y
después incrementar deja que un cupón «de 100 usos» acabe con 105 pedidos.
_Corrección:_ `UPDATE` condicional, la misma forma que el descuento de
stock.

**10. Las opiniones no verificaban la compra.** Sin esa regla, la sección
de reseñas es un formulario público y la valoración media deja de informar
sobre el producto.

**11. La desnormalización de la valoración podía desincronizarse.** Si el
recálculo solo ocurriera al aprobar, rechazar una reseña ya publicada
dejaría la ficha mostrando una media que no corresponde a lo visible.
_Corrección:_ el recálculo va dentro de la misma transacción que el cambio
de estado, y hay una prueba para ese caso concreto.

---

## Lo que se añadió

**Gobernanza.** `husky` + `lint-staged` + `commitlint` (verificado que
rechaza un mensaje sin prefijo), `knip`, `.editorconfig`, `.nvmrc`,
`.gitattributes`, ajustes de VS Code, `CHANGELOG`, `SECURITY`,
`CONTRIBUTING`, `CODE_OF_CONDUCT`, `CODEOWNERS`, `dependabot` y plantillas
de issue y pull request.

**Capa de producción.** Validación de variables de entorno al arrancar
—que detiene el arranque listando _todos_ los problemas, no el primero—,
registro estructurado con filtrado de datos sensibles, límite de intentos
en acceso, registro y compra, cabeceras de seguridad y `/api/health`.

**Funciones comerciales.** Reseñas con moderación, cupones, favoritos,
libreta de direcciones conectada al checkout, filtros y ordenamiento,
galería con miniaturas, migas de pan, productos relacionados y datos
estructurados de schema.org.

**Auto-auditoría.** `npm run audit` ejecuta tres comprobaciones, y
`npm run audit:bundle` una cuarta sobre el resultado del build:

```
Auditoría de reglas del proyecto

  ✓ Prisma solo se usa desde lib/services/
  ✓ Toda Server Action de administración comprueba el rol
  ✓ La marca solo vive en site.config.ts
  ✓ Las variables de entorno se leen de lib/env.ts
  ✓ No quedan console.log ni console.error sueltos
  ✓ No hay `any` explícito
  ✓ Los importes monetarios no se calculan con Number en los servicios

Las 7 comprobaciones pasan.

Auditoría de gobernanza del repositorio

  ✓ Están los 22 archivos esperados
  ✓ Ningún enlace roto en la documentación

Gobernanza completa: 22 archivos, 0 enlaces rotos.

Presupuesto de tamaño del paquete

  ✓ JavaScript de cliente, total: 513.9 kB de 640 kB (80 %)
  ✓ Fragmento individual más grande: 75.4 kB de 100 kB (75 %)

El paquete está dentro del presupuesto.
```

> **Sobre el presupuesto de rendimiento.** El plan preveía Lighthouse en
> CI. Se descartó: sus métricas de tiempo dependen de la carga del runner,
> así que el mismo commit pasa una vez y falla otra, y una comprobación
> que se pone en rojo sin motivo enseña a ignorar el rojo. El tamaño del
> paquete es determinista y es la causa que más veces está detrás de una
> portada lenta. La accesibilidad, que Lighthouse también habría cubierto,
> se verifica con `axe` y con más detalle.

---

## Decisiones deliberadas

**Licencia comercial en lugar de MIT.** MIT permite a cualquier comprador
redistribuir la plantilla, lo que anula el negocio. El razonamiento
completo, con sus consecuencias asumidas —repositorio privado, sin
contribuciones externas—, está en `DECISIONES.md`.

**Anti-objetivos respetados.** Nada de multi-tenant, monorepo,
microservicios, sistema de plugins, GraphQL ni capa de repositorios sobre
Prisma. Cada uno resultó tentador en algún momento y cada uno habría
convertido una plantilla vendible en un producto que nadie mantiene.

**Variantes de producto (talla, color) quedan fuera.** No es una función:
es un cambio de modelo de datos que atraviesa carrito, inventario, pedidos
y panel. Hacerlo a medias sería peor que no hacerlo, y conviene decidirlo
antes de cargar catálogo. Documentado en `QUE-INCLUYE.md` con su coste
estimado.

**El carrito sigue sin reservar inventario** y **las transiciones de
estado de envío siguen sin restringir**: ambas se explicaron en la primera
auditoría y siguen siendo correctas.

---

## Verificación

**Re-marcado.** Nombre a «Verdemar», moneda a USD, tono del color. En el
navegador: título cambiado, cero apariciones de la marca anterior, precios
de `$ 69.000` a `$69,000.00`, y `priceCurrency` del JSON-LD ahora en USD
—esto último era un valor fijo que la primera auditoría no detectó y que
habría publicado precios en la moneda equivocada—. Revertido después.

**Arranque en frío.** Base de datos nueva, migraciones y seed según el
README: 3 usuarios, 20 categorías, 92 productos, 3 cupones, 6 reseñas.
Segunda pasada del seed: mismos recuentos.

**Suites.** 150 unitarias contra PostgreSQL real y 39 de navegador —13 de
ellas de accesibilidad—, más lint, typecheck, auditoría y build. CI verde en los dos
flujos.

---

## Errores propios

Se listan porque un informe que solo cuenta aciertos no sirve para
enseñárselo a nadie.

**Diagnostiqué mal `shadcn`.** `knip` lo marcó como dependencia sin usar y
me pareció evidente —una CLI en `dependencies`—. Lo quité, el build falló,
y di por hecho que la causa era esa eliminación. Era falso por partida
doble: el fallo venía de la caché de `.next`, y `shadcn` sí hace falta
porque `globals.css` importa `shadcn/tailwind.css`. Es el mismo punto
ciego de knip con el CSS que yo mismo había identificado un minuto antes
para otro paquete, y no apliqué el razonamiento.

**Rompí `error.tsx`** con un escape mal formado y pasé varios intentos
diagnosticando como fallo del menú lo que era mi propia edición.

**Mi primer registro de errores imprimía `[object Error]`**, que es
exactamente lo contrario de para lo que existe.

**Mi propio script de auditoría daba un falso positivo** porque comparaba
rutas con barras mientras Windows las devuelve con contrabarras.

Los cuatro se corrigieron y quedaron documentados en el código o en el
mensaje del commit correspondiente.

---

## Lo que sigue faltando

Sin adornos, y con su coste estimado en
[`QUE-INCLUYE.md`](QUE-INCLUYE.md):

1. **Pasarela de pago real.** Medio día a dos días.
2. **Correos** —recuperación de contraseña y confirmación de pedido—. Un
   día. Es lo primero que pedirá un cliente real.
3. **Variantes de producto.** Una a dos semanas. Decidir antes de cargar
   catálogo.
4. **Demo pública desplegada.** Hoy hay que instalar para verlo. Es lo
   que más falta para enseñar la plantilla sin fricción.
5. **Búsqueda de texto completo** cuando el catálogo supere unos miles de
   productos.
6. **Segundo factor y verificación de correo**, si el negocio lo exige.

Ninguna de las seis es un defecto. Son decisiones que dependen del negocio
concreto o trabajo que la plantilla deja preparado pero no puede hacer por
adelantado.
