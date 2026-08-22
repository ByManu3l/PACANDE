# Registro de cambios

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).
Versionado según [SemVer](https://semver.org/lang/es/).

Para una plantilla, «cambio incompatible» significa: algo que obliga a
quien ya la adoptó a modificar su propio código o a migrar su base de
datos.

## [No publicado]

### Añadido

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
