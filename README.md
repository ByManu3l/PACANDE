# Pacandé

Plantilla de E-commerce full-stack lista para producción: catálogo por
categorías, carrito, checkout, cuentas de usuario y un panel de
administración completo (categorías, productos, pedidos, envíos, usuarios
con roles). Pensada para clonarse y re-marcarse como punto de partida de
un negocio nuevo, no para usarse tal cual con la marca "Pacandé".

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

## Re-marcar esta plantilla para un negocio nuevo

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
