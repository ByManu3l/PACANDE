# Publicar Pacandé en internet

Guía para dejar la tienda funcionando en una dirección pública, gratis,
para enseñarla en una exposición. Toma unos 15 minutos y no requiere
instalar nada: todo se hace desde el navegador.

| Pieza                 | Servicio                  | Coste               |
| --------------------- | ------------------------- | ------------------- |
| Aplicación            | Vercel (plan Hobby)       | Gratis              |
| Base de datos         | Neon, desde Vercel        | Gratis              |
| Imágenes que se suben | Vercel Blob, desde Vercel | Gratis (con límite) |

El proyecto ya trae todo lo necesario:

- `vercel.json` le dice a Vercel que use `npm run vercel-build`, que
  **aplica las migraciones, carga el catálogo de ejemplo y compila**.
- Las direcciones del sitio se toman solas del dominio que asigne Vercel.
- Las imágenes subidas desde el panel van a Vercel Blob en cuanto existe
  el almacén (ver `src/lib/services/storage.service.ts`).

---

## Paso 1: importar el repositorio

1. Entra en [vercel.com](https://vercel.com) con tu cuenta de GitHub.
2. **Add New… → Project** e importa el repositorio `PACANDE`.
3. En **Environment Variables** añade una sola:

   | Nombre        | Valor                                                  |
   | ------------- | ------------------------------------------------------ |
   | `AUTH_SECRET` | Una cadena aleatoria de 32+ caracteres (ver más abajo) |

   Para generarla, en una terminal: `npx auth secret`, o
   `openssl rand -base64 33`.

4. Pulsa **Deploy**. **Este primer despliegue fallará** porque todavía no
   hay base de datos. Es lo esperado: el proyecto ya existe y se le puede
   conectar una.

## Paso 2: conectar la base de datos

1. En el proyecto, pestaña **Storage → Create Database → Neon**.
2. Región: la misma que las funciones de Vercel (por defecto,
   **Washington, D.C. — iad1**). Si están lejos, cada página tarda más.
3. Conéctala al proyecto en todos los entornos.

Vercel añade solo `DATABASE_URL` y `DATABASE_URL_UNPOOLED`. La segunda es
la que usan las migraciones (ver `prisma.config.ts`).

## Paso 3: conectar el almacén de imágenes

1. **Storage → Create Database → Blob**, y conéctalo al proyecto.

Vercel añade `BLOB_READ_WRITE_TOKEN`. Sin este paso la tienda funciona,
pero subir imágenes desde el panel falla, porque en Vercel el disco se
borra entre peticiones.

## Paso 4 (opcional): activar el asistente de compras

El asistente por voz y la búsqueda por foto usan la API de Claude. Sin
esta variable la tienda funciona igual, pero el botón «Asistente» no
aparece.

1. Crea una clave en [platform.claude.com](https://platform.claude.com)
   (**API Keys → Create Key**). Necesita saldo; una exposición completa
   gasta centavos de dólar.
2. En Vercel, **Settings → Environment Variables**, añade
   `ANTHROPIC_API_KEY` con esa clave.

Cada visitante puede hacer hasta 20 consultas cada 10 minutos, para que
nadie vacíe el saldo con un script.

## Paso 5: volver a desplegar

**Deployments →** el último despliegue **→ ⋯ → Redeploy.**

Esta vez la compilación crea las tablas, carga el catálogo y los usuarios
de ejemplo, y publica la tienda en `https://<nombre-del-proyecto>.vercel.app`.

---

## Para la exposición

**Cuentas para enseñar** (las crea el seed):

| Rol        | Correo                    | Contraseña       |
| ---------- | ------------------------- | ---------------- |
| Superadmin | `superadmin@pacande.test` | `Superadmin123!` |
| Admin      | `admin@pacande.test`      | `Admin123!`      |
| Usuario    | `usuario@pacande.test`    | `Usuario123!`    |

**Recorrido sugerido:** portada → una categoría → ficha de producto →
agregar al carrito → cupón `BIENVENIDA10` → checkout (pago simulado) →
«Mis pedidos» → entrar como admin y cambiar el estado de ese pedido.

**Antes de empezar:**

- Abre la página unos minutos antes. La base gratuita de Neon se duerme
  tras un rato sin uso y la primera carga tarda unos segundos más.
- El inicio de sesión se bloquea 15 minutos tras cinco intentos fallidos
  con el mismo correo. Copia las contraseñas, no las escribas de memoria.
- Registrar cuentas nuevas está limitado a tres por hora desde una misma
  conexión. Si el público comparte la red del lugar, usa las cuentas de
  arriba en vez de pedir que cada uno se registre.

**Si alguien desordena la demo:** las contraseñas son públicas, así que
cualquiera puede entrar como admin. Un **Redeploy** vuelve a dejar el
catálogo de ejemplo (precios, stock e imágenes) como estaba. Los pedidos,
cupones y usuarios nuevos se conservan.

---

## Si algo falla

| Síntoma                                         | Causa probable                                                  |
| ----------------------------------------------- | --------------------------------------------------------------- |
| La compilación dice que falta `DATABASE_URL`    | La base no está conectada al entorno (paso 2)                   |
| «AUTH_SECRET debe tener al menos 32 caracteres» | Falta la variable o es corta (paso 1)                           |
| Subir una imagen da error                       | Falta el almacén Blob (paso 3); después hay que redesplegar     |
| La página responde lento al principio           | Neon estaba dormida; se despierta con la primera petición       |
| No aparece el botón «Asistente»                 | Falta `ANTHROPIC_API_KEY` (paso 4); después hay que redesplegar |
| El asistente dice que no pudo responder         | Clave inválida o sin saldo: revisa **Logs** en Vercel           |
| El micrófono no aparece                         | El navegador no reconoce voz (Firefox); usa Chrome o Edge       |

Los registros de cada petición están en **Logs**, dentro del proyecto en
Vercel.
