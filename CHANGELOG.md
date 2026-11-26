# Registro de cambios

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).
Versionado según [SemVer](https://semver.org/lang/es/).

Para una plantilla, «cambio incompatible» significa: algo que obliga a
quien ya la adoptó a modificar su propio código o a migrar su base de
datos.

## [No publicado]

### Cambiado

- **Licencia: de comercial a MIT.** Pacandé vuelve a ser un proyecto
  académico abierto; el plan de venderla como plantilla no siguió
  adelante. README y documentación reescritos en ese sentido. Ver
  `docs/DECISIONES.md`, punto 15.
- El límite de inicio de sesión cuenta solo **fallos seguidos**: un
  acceso correcto reinicia el contador. Antes, entrar y salir varias
  veces con la misma cuenta acababa en bloqueo.
- **Identidad visual de la versión JavaScript original**, recuperada sobre
  Next.js, Tailwind y shadcn: fuente del sistema, rojo #ff0000 con negro,
  portada en franjas blancas y negras, tarjeta de producto centrada con
  «Comprar Ahora» y «Agregar al Carrito», cabecera, pie, ofertas, carrito,
  pago, cuenta, ventanas de entrar y registrarse, 404 y pantalla de carga.
  Algunos textos cambian para coincidir con el original («Agregar al
  Carrito», «Registrarse», «Carrito de Compras», «Finalizar Compra»).
- **Botones y cabecera como en el original.** La fila superior de la
  cabecera reparte logotipo, buscador y accesos como la versión JavaScript;
  el selector de moneda es una píldora como el buscador. Perfil y
  contraseña usan el botón de `PerfilPage.jsx`; «Agregar al Carrito»,
  «Agotado» y «Publicar opinión», el de `ProductCard.jsx`; cupón,
  confirmación de pedido, favoritos y el diálogo de dirección, los de MUI
  del carrito; «Reintentar», el de los errores de `OfertasPage.jsx`. El
  botón genérico usa el rojo de la tienda.
- **Portada sin franjas negras.** Las secciones de categorías muestran solo
  sus presentaciones, sin el recuadro negro de fondo; «Destacados» usa el
  mismo formato (imagen, velo y nombre) en vez de tarjetas de producto. El
  carrusel estrena tres banners nuevos (`portada-1..3.jpg`, nombres nuevos
  para que ninguna caché sirva los anteriores) y su proporción pasa a la de
  esos banners para que se vean completos.
- **Portada a todo el ancho de la ventana**, pegada a la cabecera, como el
  carrusel del original.
- En «Destacados» manda el producto: imagen completa sobre blanco, sin velo
  oscuro, y el nombre en una franja discreta abajo.
- El selector de moneda abre un menú negro con borde rojo, como el del
  usuario, en vez de la lista nativa del sistema.
- Banners de portada con calidad 90 (antes 75).
- Descripción de «Variedad» corregida: no es equipamiento deportivo.
- **Banners nuevos.** La portada estrena tres banners de 2000 px en
  proporción 3:1 (`inicio-1..3.jpg`), más altos y nítidos. Ropa, Tecnología
  y Hogar abren con su propio banner y el título sobre el lado libre de la
  foto. En la portada, una sección sin subcategorías (Variedad) ya no
  repite su nombre encima de la tarjeta.
- Portada algo más baja (3,6:1): recorta solo márgenes sin texto.
- Los banners de Ropa, Tecnología y Hogar van a todo el ancho, pegados a la
  cabecera y con la misma proporción que la portada.

### Añadido

- **Despliegue en Vercel listo:** `vercel.json` y el script
  `vercel-build` (migraciones, catálogo de ejemplo y compilación), guía
  paso a paso en `docs/DESPLIEGUE.md`, adaptador de Vercel Blob para las
  imágenes subidas que se activa solo con `BLOB_READ_WRITE_TOKEN`, y
  `AUTH_URL`/`NEXT_PUBLIC_SITE_URL` tomadas del dominio de Vercel si no se
  configuran.
- **Vaciar el carrito** desde la página del carrito (`clearCartAction`).
- **Descuento por producto**, **moneda de vista** con tasas de cambio,
  **carrusel de portada** y **página de ofertas**.
- **Opiniones de clientes** con moderación previa y verificación de
  compra, con valoración media desnormalizada y desglose por estrellas.
- **Cupones de descuento** (porcentaje o importe fijo) con vigencia,
  compra mínima, tope de descuento y límite de usos.
- **Favoritos** y **libreta de direcciones**, esta última conectada al
  checkout.
- **Filtros y ordenamiento** de catálogo y búsqueda, con el estado en la
  URL para que los resultados sean compartibles.
- **Galería de producto** con miniaturas, migas de pan, productos
  relacionados y datos estructurados de schema.org.
- **`npm run audit`**: comprueba las reglas del proyecto, la integridad
  del repositorio y el código muerto. Corre en CI.
- **Presupuesto de tamaño del paquete** (`npm run audit:bundle`), que
  rompe el build si el JavaScript de cliente se dispara.
- **Paginación en las tablas del panel** (pedidos y productos).
- **Auditoría de accesibilidad** con `axe` sobre 9 páginas (WCAG 2.1 AA).
- `docs/QUE-INCLUYE.md`: qué está hecho, qué no y qué cuesta completarlo.

### Corregido

- **Accesibilidad:** 17 controles de navegación se anunciaban como botones
  en lugar de enlaces; tres botones por línea del carrito no tenían nombre
  accesible; el avatar no alcanzaba el contraste mínimo de WCAG AA.
- **El menú de cuenta reventaba la página** al abrirse
  (`MenuGroupContext is missing`). Llevaba roto desde su creación: la
  prueba de extremo a extremo evitaba el menú y no lo ejercitaba.
- Un `Decimal` volvía a cruzar al cliente desde el carrito al añadir
  `ratingAverage` al modelo.
- «Limpiar filtros» perdía el término buscado en la página de búsqueda.
- El seed dependía del singleton de Prisma de la aplicación.

### Cambiado

- **Licencia: de MIT a comercial.** MIT permitía a un comprador
  redistribuir la plantilla. Ver `docs/DECISIONES.md`.
- Las pruebas de navegador corren en **cada push**, no solo por la noche:
  un flujo nocturno detecta las regresiones cuando ya están enterradas.
- CI lee la versión de Node de `.nvmrc` (estaban desalineados: 22 y 24).
- El vaciado de tablas entre pruebas se lee del catálogo de Postgres en
  vez de una lista fija que había que recordar actualizar.

### Añadido (infraestructura)

- **Validación de las variables de entorno al arrancar** (`src/lib/env.ts`).
  Un `.env` incompleto detiene el arranque con la lista de lo que falta,
  en vez de fallar más tarde en una petición cualquiera.
- **Registro estructurado** (`src/lib/logger.ts`), con niveles, filtrado
  de valores sensibles y destino sustituible para enchufar un servicio de
  seguimiento de errores.
- **Límite de intentos** en acceso, registro y compra
  (`src/lib/rate-limit.ts`).
- **Cabeceras de seguridad** en `next.config.ts`: CSP, HSTS,
  `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` y
  `Permissions-Policy`. Se retira además `X-Powered-By`.
- **Comprobación de estado** en `/api/health`, que verifica la base de
  datos y responde 503 cuando algo falla.
- `.env.test.example`, para poder poner en marcha las pruebas sin
  adivinar qué variables hacen falta.
- Gobernanza del repositorio: `.editorconfig`, `.nvmrc`, `.gitattributes`,
  ajustes recomendados de VS Code.
- Ganchos de git con husky: formato y lint sobre lo que cambia
  (`lint-staged`) y convención de mensajes de commit (`commitlint`).
- `knip` para detectar código y dependencias sin usar
  (`npm run audit:deadcode`).
- Plantillas de issue y de pull request, `CODEOWNERS` y `dependabot`.
- `SECURITY.md` con la política de reporte y una tabla honesta de qué
  protege la plantilla y qué no.

### Cambiado

- `console.error` y `console.warn` sustituidos por el registro
  estructurado en toda la capa de servidor.
- `.gitattributes` normaliza los finales de línea a LF. Elimina los avisos
  de CRLF que aparecían en cada commit hecho desde Windows.

### Eliminado

- `@types/bcryptjs`: bcryptjs 3 incluye sus propios tipos.
- Las funciones `ok` y `fail` de `action-result.ts` dejan de exportarse.
  Nada las usaba fuera del módulo y `runAction` es la única forma prevista
  de construir un `ActionResult`.

---

## [1.0.0]

Primera versión de la plantilla, tras la reescritura completa del
proyecto original y su auditoría.

### Añadido

- Tienda: catálogo por categorías, ficha de producto, búsqueda paginada,
  carrito persistente (con fusión del carrito anónimo al iniciar sesión),
  checkout y seguimiento de pedidos.
- Panel de administración: categorías, productos, pedidos, envíos y
  usuarios con tres roles.
- Autenticación con Auth.js: credenciales, sesión JWT y verificación de
  permisos en cada Server Action.
- 75 pruebas unitarias contra PostgreSQL real y 11 end-to-end con
  Playwright.
- Integración continua con contenedor Postgres efímero.
- Documentación completa en `docs/`: arquitectura, decisiones,
  personalización, guía de contribución e informe de auditoría.

### Seguridad

Corregidos en la auditoría; el detalle está en `docs/AUDITORIA.md`.

- Los datos de tarjeta ya no llegan al servidor.
- Sobreventa de inventario bajo compras simultáneas.
- Números de pedido duplicados bajo checkouts simultáneos.
- Una Server Action aceptaba un identificador de usuario arbitrario.
- Enumeración de correos a través del tiempo de respuesta del login.
- Recorrido de rutas en el borrado de archivos.
