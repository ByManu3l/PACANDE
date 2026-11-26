# Pacandé

**Tienda en línea de un proyecto académico, reescrita para darle una
segunda vida. Código abierto.**

Pacandé empezó como proyecto de clase: una tienda hecha con MERN (MongoDB,
Express, React y Node). Después se reescribió desde cero con tecnologías
actuales —Next.js, TypeScript y PostgreSQL— con la idea de convertirla en
una plantilla de comercio electrónico reutilizable. Ese plan no siguió
adelante por distintas razones, así que el proyecto queda publicado tal
cual, abierto para quien quiera verlo, usarlo o aprender de él.

La identidad visual es la de la versión original: negro y rojo, portada
en franjas y tarjetas de producto centradas.

<p>
  <img alt="CI" src="https://github.com/ByManu3l/PACANDE/actions/workflows/ci.yml/badge.svg" />
  <img alt="E2E" src="https://github.com/ByManu3l/PACANDE/actions/workflows/e2e.yml/badge.svg" />
  <img alt="Licencia MIT" src="https://img.shields.io/badge/licencia-MIT-blue" />
  <img alt="Accesibilidad" src="https://img.shields.io/badge/WCAG_2.1_AA-sin%20infracciones-brightgreen" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-estricto-blue" />
</p>

## Qué hace

**Para quien compra:** catálogo por categorías con filtros y orden,
búsqueda, ofertas, ficha de producto con galería y opiniones, carrito que
funciona sin cuenta, cupones de descuento, favoritos, checkout con
direcciones guardadas e historial de pedidos.

**Para quien administra:** panel con productos, categorías, pedidos,
cupones, moderación de opiniones y usuarios, con tres roles
(`USER`, `ADMIN`, `SUPERADMIN`).

**El pago está simulado.** No se cobra nada; los datos de tarjeta nunca
llegan al servidor. Todo lo que rodea al pago —descuento de stock sin
sobreventa, precios releídos del servidor, cupones, transacciones— sí está
resuelto. El detalle de qué incluye y qué no está en
[`docs/QUE-INCLUYE.md`](docs/QUE-INCLUYE.md).

## Lo que muestra el proyecto

- **Lógica de dinero probada, no supuesta.** Dos personas comprando a la
  vez no pueden llevarse la misma última unidad, y los importes se
  calculan en decimal exacto. Cada propiedad tiene su prueba contra una
  base de datos real.
- **Pruebas automáticas en cada cambio:** de servicios (Vitest) y de
  navegador (Playwright), incluidas comprobaciones de accesibilidad.
- **Arquitectura por capas:** ninguna página toca la base de datos
  directamente; todo pasa por `src/lib/services/`.
- **Documentación del porqué**, no solo del qué: ver
  [`docs/DECISIONES.md`](docs/DECISIONES.md).

## Stack

- **[Next.js 16](https://nextjs.org)** (App Router) + **TypeScript** — frontend y backend en un solo proyecto.
- **PostgreSQL + [Prisma](https://www.prisma.io)** — capa de datos.
- **[Auth.js](https://authjs.dev)** — inicio de sesión con correo y contraseña, roles.
- **Tailwind CSS + [shadcn/ui](https://ui.shadcn.com)** — interfaz.
- **react-hook-form + zod** — validación compartida entre cliente y servidor.
- **Vitest + Playwright** — pruebas.
- **GitHub Actions** — lint, tipos, pruebas y compilación en cada push.

## Verla en internet

Está preparada para publicarse gratis en **Vercel**, con base de datos
**Neon** e imágenes en **Vercel Blob**. Paso a paso, en unos 15 minutos:
[`docs/DESPLIEGUE.md`](docs/DESPLIEGUE.md).

## Ejecutarla en tu computador

Requisitos: Node.js 22+ y Docker (o cualquier PostgreSQL).

```bash
cp .env.example .env
npx auth secret          # escribe AUTH_SECRET en .env
docker compose up -d     # PostgreSQL local
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

### Usuarios de ejemplo

El seed crea un usuario por rol:

| Rol        | Correo                    | Contraseña       |
| ---------- | ------------------------- | ---------------- |
| Superadmin | `superadmin@pacande.test` | `Superadmin123!` |
| Admin      | `admin@pacande.test`      | `Admin123!`      |
| Usuario    | `usuario@pacande.test`    | `Usuario123!`    |

Cupón de prueba: `BIENVENIDA10`.

## Estructura

```
prisma/              esquema, migraciones y catálogo de ejemplo
public/images/        imágenes del catálogo
src/
  app/
    (storefront)/      tienda: catálogo, carrito, checkout, cuenta
    (admin)/admin/      panel de administración
  actions/             Server Actions, una por dominio
  lib/
    services/           única capa que toca la base de datos
    validations/        esquemas zod compartidos
    config/site.config.ts   nombre, moneda, contacto
  components/          interfaz
tests/
  unit/                 Vitest, contra PostgreSQL real
  e2e/                  Playwright, flujos completos
```

## Pruebas

```bash
npm run test        # servicios, contra una base de prueba separada (.env.test)
npm run e2e          # navegador; levanta el servidor solo
npm run audit        # reglas del proyecto, documentación y código muerto
```

## Documentación

| Documento                                            | Para qué                                           |
| ---------------------------------------------------- | -------------------------------------------------- |
| [`docs/DESPLIEGUE.md`](docs/DESPLIEGUE.md)           | Publicarla en internet                             |
| [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md)       | Cómo está organizada. **Empieza por aquí.**        |
| [`docs/QUE-INCLUYE.md`](docs/QUE-INCLUYE.md)         | Qué hace y qué no                                  |
| [`docs/PERSONALIZACION.md`](docs/PERSONALIZACION.md) | Cambiar nombre, colores, catálogo o pasarela       |
| [`docs/DECISIONES.md`](docs/DECISIONES.md)           | Por qué cada tecnología y qué se descartó          |
| [`docs/CONTRIBUIR.md`](docs/CONTRIBUIR.md)           | Trabajar en el código sin romper las reglas        |
| [`docs/AUDITORIA.md`](docs/AUDITORIA.md)             | Historial de auditorías: qué se encontró y arregló |

## Licencia

[MIT](LICENSE): puedes usar, estudiar, modificar y redistribuir el código
libremente, conservando el aviso de autoría.
