# Pacandé

**Una tienda en línea completa, lista para adaptar a tu negocio.**

Catálogo con filtros, carrito persistente, cupones, opiniones de clientes,
favoritos, checkout y un panel de administración que cubre catálogo,
pedidos, promociones y usuarios. Se re-marca editando dos archivos.

<p>
  <img alt="CI" src="https://github.com/ByManu3l/PACANDE/actions/workflows/ci.yml/badge.svg" />
  <img alt="E2E" src="https://github.com/ByManu3l/PACANDE/actions/workflows/e2e.yml/badge.svg" />
  <img alt="Pruebas" src="https://img.shields.io/badge/pruebas-189-brightgreen" />
  <img alt="Accesibilidad" src="https://img.shields.io/badge/WCAG_2.1_AA-sin%20infracciones-brightgreen" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-estricto-blue" />
</p>

|                          |                                                          |
| ------------------------ | -------------------------------------------------------- |
| **Qué incluye y qué no** | [`docs/QUE-INCLUYE.md`](docs/QUE-INCLUYE.md)             |
| **Cómo está construido** | [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md)           |
| **Cómo hacerla tuya**    | [`docs/PERSONALIZACION.md`](docs/PERSONALIZACION.md)     |
| **Cómo se construyó**    | [`docs/INFORME-PROTOTIPO.md`](docs/INFORME-PROTOTIPO.md) |

## Por qué esta y no otra

- **La lógica que maneja dinero está probada, no supuesta.** No se puede
  vender inventario inexistente aunque dos personas compren a la vez, los
  precios se releen del servidor en cada compra, y los importes se
  calculan en decimal exacto. Cada una de esas propiedades tiene su prueba
  contra una base de datos real.
- **189 pruebas automáticas** que corren en cada cambio: 150 de servicios
  y 39 de navegador, incluidas 13 de accesibilidad.
- **El repositorio comprueba su propio estado.** `npm run audit` verifica
  las reglas del proyecto, la integridad de la documentación y el código
  muerto. Sale con error si algo falla.
- **Documentada para que la herede otro.** No solo qué hace cada cosa:
  por qué se hizo así y qué se rompe si se cambia.
- **Cero infracciones de WCAG 2.1 AA** en las páginas principales,
  verificado automáticamente.

> Los datos de tarjeta **nunca llegan al servidor**, y la pasarela de pago
> viene simulada a propósito. Lo que la rodea —stock, precios, cupones,
> transacciones— sí está resuelto. Ver [`docs/QUE-INCLUYE.md`](docs/QUE-INCLUYE.md).

## Stack

- **[Next.js 16](https://nextjs.org)** (App Router) + **TypeScript** — frontend y backend en un solo proyecto.
- **PostgreSQL + [Prisma](https://www.prisma.io)** — capa de datos.
- **[Auth.js](https://authjs.dev) (NextAuth v5)** — autenticación por credenciales, sesión JWT, roles `USER` / `ADMIN` / `SUPERADMIN`.
- **Tailwind CSS + [shadcn/ui](https://ui.shadcn.com)** (Base UI) — componentes copiados al repo, sin dependencia de versión externa.
- **react-hook-form + zod** — validación compartida entre cliente y servidor.
- **Vitest** (servicios, contra una base de datos Postgres real) + **Playwright** (flujos end-to-end).
- **GitHub Actions** — lint, typecheck, tests y build en cada push.

## Requisitos

- Node.js 22+
- Docker (para Postgres local) — o cualquier Postgres accesible por `DATABASE_URL`

## Arranque rápido

```bash
cp .env.example .env
```

Genera un valor real para `AUTH_SECRET` en ese `.env`:

```bash
npx auth secret
```

Levanta Postgres local:

```bash
docker compose up -d
```

Instala dependencias, aplica migraciones y siembra el catálogo de ejemplo:

```bash
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

### Usuarios de ejemplo

El seed crea un usuario por rol (ver `prisma/seed.ts`):

| Rol        | Correo                    | Contraseña       |
| ---------- | ------------------------- | ---------------- |
| Superadmin | `superadmin@pacande.test` | `Superadmin123!` |
| Admin      | `admin@pacande.test`      | `Admin123!`      |
| Usuario    | `usuario@pacande.test`    | `Usuario123!`    |

## Estructura del proyecto

```
prisma/              schema, migraciones, seed (catálogo de ejemplo)
public/images/        imágenes del catálogo semilla
src/
  app/
    (storefront)/      rutas públicas: catálogo, carrito, checkout, cuenta
    (admin)/admin/      panel de administración (protegido por rol)
    api/auth/           handler de Auth.js
  actions/             Server Actions — un archivo por dominio
  lib/
    services/           única capa que toca Prisma (reglas de negocio)
    validations/        esquemas zod compartidos cliente/servidor
    auth/                config de Auth.js + guards de rol
    config/site.config.ts   nombre, moneda, contacto — ver "Re-marcar"
  components/
    ui/                  primitivos shadcn (copiados, no un paquete)
    shared/ forms/ admin/  composición específica del proyecto
tests/
  unit/                 Vitest — capa de servicios
  e2e/                  Playwright — flujos completos por navegador
```

**Regla de capas:** ninguna Server Action ni página llama a Prisma
directamente — siempre pasan por `lib/services/*`. Eso es lo que hace
testeable la lógica de negocio sin levantar HTTP, y el único lugar que hay
que tocar si cambia el ORM.

## Documentación

| Documento                                            | Para qué                                                 |
| ---------------------------------------------------- | -------------------------------------------------------- |
| [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md)       | Cómo está organizado el proyecto. **Empieza por aquí.**  |
| [`docs/PERSONALIZACION.md`](docs/PERSONALIZACION.md) | Convertir la plantilla en tu tienda                      |
| [`docs/DECISIONES.md`](docs/DECISIONES.md)           | Por qué se eligió cada tecnología, y qué se descartó     |
| [`docs/CONTRIBUIR.md`](docs/CONTRIBUIR.md)           | Trabajar en el código sin romper las reglas              |
| [`docs/AUDITORIA.md`](docs/AUDITORIA.md)             | Estado verificado: qué se corrigió y qué queda pendiente |

El modelo de datos está documentado campo por campo, con el motivo de cada
`onDelete`, en [`prisma/schema.prisma`](prisma/schema.prisma).

## Re-marcar esta plantilla para un negocio nuevo

Resumen; el procedimiento completo está en
[`docs/PERSONALIZACION.md`](docs/PERSONALIZACION.md).

Dos archivos concentran todo lo específico de "Pacandé":

1. **`src/lib/config/site.config.ts`** — nombre, descripción, moneda,
   costo de envío, contacto, redes sociales.
2. **`src/app/globals.css`** — el token `--primary` (y su par en modo
   oscuro) define el color de marca; todo lo demás usa esos tokens.

El catálogo (categorías/productos) vive en la base de datos, no en
código — se puebla vía `prisma/seed.ts`. Para un proyecto nuevo, lo más
simple es adaptar ese seed con el catálogo real, o borrar los datos de
ejemplo y cargar productos desde el panel de administración
(`/admin/productos`) una vez desplegado.

## Tests

```bash
npm run test        # Vitest — servicios, contra una Postgres de prueba separada
npm run e2e          # Playwright — requiere el dev server corriendo (lo levanta solo)
```

Los tests unitarios usan `pacande_test` como base de datos (ver
`.env.test`, no versionado) para nunca tocar los datos de desarrollo —
`tests/unit/setup.ts` rechaza correr si `DATABASE_URL` no apunta ahí.

## CI/CD

`.github/workflows/ci.yml` corre lint, typecheck, tests unitarios y
build en cada push/PR a `main`, con un contenedor Postgres efímero — no
requiere configurar secrets. `.github/workflows/e2e.yml` corre Playwright
por separado (disparo manual o diario) para no alargar el feedback de
cada push.

## Despliegue

Pensado para Vercel (o cualquier host de Next.js) + Postgres administrado
(Neon, Supabase, RDS, etc.). Una salvedad: `src/lib/services/storage.service.ts`
guarda avatares e imágenes de producto subidas en `public/uploads/` del
disco local — funciona en desarrollo y en hosting con filesystem
persistente, pero **no en un despliegue serverless** (el filesystem de
Vercel es efímero). Para producción serverless, reemplaza
`LocalDiskAdapter` por un adapter de Vercel Blob/S3/R2 que implemente la
misma interfaz `StorageAdapter` — es el único punto de la app que necesita
cambiar.

## Decisiones de alcance deliberadas

- **Pago simulado, no una pasarela real.** `lib/services/payment.service.ts`
  expone una interfaz `PaymentProvider`; la implementación por defecto
  aprueba con 10% de rechazo aleatorio (tarjeta) y aprueba siempre para
  pago contra entrega (nada se cobra hasta la entrega). Integrar un
  proveedor real (Stripe, Wompi, etc.) es implementar esa interfaz, sin
  tocar `order.service.ts`.
- **Sin selector de moneda en vivo.** El original dependía de una API
  pública sin autenticación — fue reemplazado por un solo `defaultCurrency`
  en `site.config.ts`. `formatPrice()` es el único lugar a tocar si un
  proyecto necesita soportar varias.

## Licencia

**Licencia de uso comercial** — ver [`LICENSE`](LICENSE). No es software
de código abierto.

En una frase: **puedes construir y vender tu tienda; no puedes vender la
herramienta con la que la construiste.**

- Puedes usarla, modificarla y desplegarla con fines comerciales.
- El código que escribas encima es tuyo, igual que los ingresos que genere.
- No puedes redistribuirla ni revenderla como plantilla, tema o kit de
  inicio, ni publicarla en un repositorio abierto.
