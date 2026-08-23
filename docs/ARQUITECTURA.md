# Arquitectura

Este documento explica **cómo está organizado el proyecto y por qué**. Si
acabas de llegar, léelo entero una vez: son quince minutos que te ahorran
buscar dónde va cada cosa.

Documentos hermanos:

- [`DECISIONES.md`](DECISIONES.md) — por qué se eligió cada tecnología, y
  qué se descartó.
- [`PERSONALIZACION.md`](PERSONALIZACION.md) — cómo convertir esta
  plantilla en tu tienda.
- [`CONTRIBUIR.md`](CONTRIBUIR.md) — cómo trabajar en el código sin
  romper las reglas de abajo.

---

## La idea en un párrafo

Es una aplicación **Next.js con App Router**: frontend y backend en el
mismo proyecto. No hay API REST propia ni servidor Express aparte. Las
páginas se renderizan en el servidor y consultan la base de datos
directamente; las mutaciones son **Server Actions**, funciones de
servidor que el navegador invoca como si fueran locales.

Toda consulta a la base de datos pasa por una capa de servicios. Esa es
la única regla estructural del proyecto, y la explica la sección
siguiente.

---

## La regla de capas

```
Página (Server Component)  ─┐
                            ├──►  lib/services/*  ──►  Prisma  ──►  Postgres
Server Action (actions/*)  ─┘
```

**Ni las páginas ni las Server Actions llaman a Prisma.** Siempre pasan
por `lib/services/`.

Tres razones concretas:

1. **Se puede probar sin HTTP.** Los tests de `tests/unit/` llaman a los
   servicios como funciones normales contra una Postgres real. No hace
   falta levantar el servidor ni simular peticiones. Por eso hay 75
   pruebas y no cinco.

2. **La lógica no se duplica.** El catálogo se consulta desde una página
   pública y desde el panel. Si cada una escribiera su propia consulta,
   una acabaría olvidándose de filtrar por `isActive` y mostraría
   productos retirados.

3. **Cambiar de ORM toca un solo directorio.** No es que vaya a pasar,
   pero es la señal de que las capas están bien separadas.

Si te encuentras escribiendo `prisma.` fuera de `lib/services/`, para: esa
consulta pertenece a un servicio. Puedes comprobar que la regla sigue
intacta con:

```bash
grep -rn "prisma\." src/app src/actions src/components
```

Ese comando no debe devolver nada.

---

## Qué hay en cada carpeta

### `src/app/` — rutas

Next.js deriva las URLs de la estructura de carpetas. Los paréntesis en
`(storefront)` y `(admin)` son **grupos de rutas**: agrupan páginas bajo
un layout común sin aparecer en la URL. `/carrito` está en
`(storefront)/carrito/`, no en `/storefront/carrito`.

| Ruta                                              | Qué es                                        |
| ------------------------------------------------- | --------------------------------------------- |
| `/`                                               | Portada: categorías y destacados              |
| `/categoria/[slug]`                               | Subcategorías **o** productos, según el nivel |
| `/producto/[slug]`                                | Ficha de producto                             |
| `/buscar?q=`                                      | Resultados de búsqueda, paginados             |
| `/carrito`                                        | Carrito                                       |
| `/checkout`                                       | Datos de envío y pago                         |
| `/checkout/confirmacion/[orderNumber]`            | Comprobante                                   |
| `/cuenta`, `/cuenta/pedidos`, …                   | Área privada del cliente                      |
| `/admin/**`                                       | Panel de administración                       |
| `/login`, `/registro`                             | Acceso                                        |
| `/ayuda`, `/contacto`, `/terminos`, `/privacidad` | Páginas estáticas                             |

Además hay archivos especiales que Next.js reconoce por su nombre:

- `layout.tsx` — envoltorio compartido por todas las rutas que cuelgan de
  esa carpeta.
- `loading.tsx` — se muestra mientras la página carga. Existen para el
  catálogo, la búsqueda y el panel.
- `error.tsx` / `not-found.tsx` — pantallas de error y de 404.
- `sitemap.ts` / `robots.ts` — se sirven en `/sitemap.xml` y
  `/robots.txt`.

**Server Components por defecto.** Un archivo solo lleva `'use client'`
si necesita estado, efectos o eventos del navegador. Cuanto menos
JavaScript se envíe al cliente, más rápido carga: por eso los formularios
son cliente y las páginas que solo muestran datos no.

### `src/actions/` — mutaciones

Un archivo por dominio (`cart`, `order`, `product`…). Todo lo exportado
desde un archivo con `'use server'` es **un endpoint HTTP invocable desde
el navegador**, así que cada acción sigue esta secuencia:

```ts
export async function loQueSea(input: Algo) {
  return runAction(async () => {
    await requireRole(['ADMIN', 'SUPERADMIN']); // 1. permisos, SIEMPRE primero
    const datos = miSchema.parse(input); //          2. validar
    await miServicio.hacerlo(datos); //              3. delegar
    revalidatePath('/donde-sea'); //                 4. refrescar la caché
  });
}
```

El paso 1 no es opcional ni redundante. Ver [Seguridad](#seguridad).

`runAction` (en `lib/utils/action-result.ts`) convierte cualquier
excepción en `{ success: false, error }`, para que el formulario pueda
mostrar el mensaje sin envolver la llamada en `try/catch`.

### `src/lib/` — el núcleo

| Carpeta           | Contenido                                                             |
| ----------------- | --------------------------------------------------------------------- |
| `services/`       | Reglas de negocio. **Lo único que toca Prisma.**                      |
| `validations/`    | Esquemas zod, compartidos entre navegador y servidor                  |
| `auth/`           | Configuración de Auth.js y los guardas `requireSession`/`requireRole` |
| `config/`         | `site.config.ts`: nombre, moneda, contacto                            |
| `utils/`          | Errores, paginación, formato de precios, slugs                        |
| `prisma.ts`       | El cliente único de base de datos                                     |
| `env.ts`          | Variables de entorno validadas. **Úsalo en vez de `process.env`**     |
| `logger.ts`       | Registro estructurado, con destino sustituible                        |
| `rate-limit.ts`   | Límite de intentos por operación                                      |
| `cart-session.ts` | Puente entre cookies/sesión y la identidad del carrito                |

### `src/components/`

- `ui/` — primitivos de shadcn/ui, **copiados** al repositorio. No son
  una dependencia: puedes editarlos. Cada archivo lleva un aviso sobre
  qué los sobrescribe.
- `shared/` — piezas reutilizables del escaparate (tarjeta de producto,
  navegación, paginación).
- `forms/` — formularios con react-hook-form.
- `admin/` — tablas y diálogos del panel.

---

## Flujos importantes

### Compra

```
Añadir al carrito ──► Cart/CartItem en Postgres
                        │
                        ▼
Checkout ──► reserveOrder()  [una transacción]
                ├─ releer precios de Product
                ├─ crear Order + OrderItem con precios congelados
                ├─ reservar el número de pedido (OrderCounter)
                └─ descontar stock condicionalmente
                        │
                        ▼
              paymentProvider.charge()
                   ┌────┴────┐
              aprobado    rechazado
                   │           │
        Order=PAID +      Order=CANCELLED
        Shipment           + devolver stock
        + vaciar carrito   + carrito intacto
```

Cuatro detalles que no son negociables, todos explicados en el código de
`lib/services/order.service.ts`:

- **El navegador nunca envía precios.** Solo `productId` y cantidad, y
  eso a través del carrito ya guardado. Los importes se releen de la base
  de datos dentro de la transacción.
- **El stock se descuenta con un `UPDATE ... WHERE stock >= cantidad`.**
  Comprobar primero y descontar después permite vender unidades que no
  existen cuando dos personas compran a la vez.
- **Se reserva antes de cobrar.** Cobrar primero y descubrir después que
  no hay stock obligaría a devolver el dinero.
- **Los importes se calculan con `Decimal`**, nunca con `number`.

### Carrito de invitado

Quien no ha iniciado sesión tiene un carrito identificado por una cookie
`httpOnly`. Al entrar o registrarse, `mergeGuestCartIntoUser` vuelca su
contenido en el carrito de la cuenta y borra el anónimo, dentro de una
transacción. Sin esto, el carrito parecería vaciarse justo al iniciar
sesión — el momento en que más gente abandona una compra.

### Autenticación

Auth.js con proveedor de credenciales y **sesión en JWT**, no en base de
datos. El motivo es concreto: `proxy.ts` corre en el runtime Edge, donde
no se puede consultar Prisma. Una sesión en base de datos obligaría a una
consulta en cada navegación, que ahí no es posible.

Eso obliga a partir la configuración en dos archivos:

- `lib/auth/auth.config.ts` — sin dependencias de Node. Es lo que importa
  `proxy.ts`.
- `lib/auth/index.ts` — añade el proveedor de credenciales, que sí
  consulta la base de datos y usa bcrypt. Solo se importa desde el
  servidor.

Si mezclas los dos, el build falla al compilar el proxy.

---

## Capa de producción

Cuatro piezas que no cambian lo que hace la tienda, pero deciden si se
puede operar cuando algo va mal.

**`lib/env.ts` — validación al arrancar.** Las variables de entorno se
comprueban con zod antes de que la aplicación acepte una sola petición.
Un `.env` incompleto detiene el arranque con la lista de lo que falta, en
vez de fallar más tarde en una compra cualquiera con un error que no dice
nada. Lleva `import 'server-only'`, así que importarlo desde un componente
de cliente es un error de compilación y no un fallo en producción.

**`lib/logger.ts` — registro estructurado.** En producción emite JSON en
una línea, que es lo que esperan los recolectores de registros; en
desarrollo, texto legible. Filtra por nombre de clave los valores
sensibles —contraseñas, tokens, datos de tarjeta— porque los registros se
almacenan, se replican y se consultan desde paneles de terceros, y lo que
llega ahí ya no se puede retirar. El destino es sustituible: conectar
Sentry o equivalente es implementar `LogTransport`.

**`lib/rate-limit.ts` — límite de intentos.** Cinco accesos fallidos por
cuarto de hora, tres registros por hora, diez compras cada diez minutos.
Protege operaciones concretas, no la infraestructura: la denegación de
servicio se resuelve en el borde. El almacén por defecto es en memoria,
con la limitación documentada de que cada instancia lleva su propia
cuenta; sustituirlo por Redis es implementar `RateLimitStore`.

**`/api/health` — comprobación de estado.** Consulta la base de datos, no
solo que el proceso responda, y devuelve 503 cuando algo falla — los
supervisores se guían por el código de estado, no por el cuerpo. Es lo que
convierte «un cliente avisó de que no podía comprar» en «el supervisor
avisó hace veinte minutos».

Las cabeceras de seguridad se aplican en `next.config.ts`: CSP, HSTS y el
resto, cada una comentada con lo que evita.

---

## Seguridad

El modelo es **defensa en profundidad**: dos barreras independientes, y
la segunda es la que realmente protege.

1. **`src/proxy.ts`** filtra la navegación a `/admin/**`, `/cuenta/**` y
   `/checkout/**`. Es comodidad: redirige al login en vez de mostrar una
   página vacía.

2. **`requireRole()` / `requireSession()` en cada Server Action.** Esta
   es la seguridad de verdad. Una Server Action es un endpoint HTTP: se
   puede invocar con `fetch` desde la consola del navegador sin pasar por
   ninguna ruta protegida. Un proxy de rutas no la protege.

> En Next.js 16 el archivo se llama `proxy.ts` y exporta `proxy`. Antes
> se llamaba `middleware.ts`. Si sigues una guía antigua, el nombre no
> coincidirá.

Otras decisiones de seguridad, con su razón:

| Qué                                                   | Por qué                                                                                           |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Los datos de tarjeta no llegan al servidor            | Nunca aparecen en registros ni copias de seguridad; deja el proyecto fuera del alcance de PCI-DSS |
| El login tarda lo mismo exista el correo o no         | Impide averiguar qué correos tienen cuenta midiendo el tiempo de respuesta                        |
| Nadie puede eliminarse ni cambiarse el rol a sí mismo | Evita quedarse sin ningún administrador, sin arreglo desde la aplicación                          |
| Las acciones de `/cuenta` operan solo sobre la sesión | Si aceptaran un `userId`, cualquiera editaría la cuenta de otro                                   |
| Las rutas de archivo se validan contra `public/`      | Sin ello, una ruta como `/../../.env` permitiría borrar archivos del servidor                     |
| Los errores inesperados no se muestran al usuario     | Pueden contener nombres de tabla, rutas o fragmentos de consulta                                  |
| Límite de intentos en acceso, registro y compra       | Sin él, probar contraseñas en bucle sale gratis                                                   |
| Cabeceras de seguridad (CSP, HSTS, …)                 | Neutralizan inyección de scripts, secuestro de clics y degradación a http                         |
| Los valores sensibles se filtran de los registros     | Lo que llega a un registro se replica y ya no se puede retirar                                    |

---

## Datos

El modelo está documentado campo por campo en
[`prisma/schema.prisma`](../prisma/schema.prisma), incluido el motivo de
cada `onDelete`. La idea que lo explica casi todo:

> **Un pedido es un documento histórico.** No puede cambiar porque el
> catálogo cambie.

De ahí que `OrderItem` copie nombre, imagen y precio en vez de apuntar al
producto, y que `Order` guarde la dirección como texto plano en lugar de
referenciar una dirección editable. Si borras un producto, sus pedidos
siguen siendo legibles.

```
User ──< Order ──< OrderItem >── Product >── Category ──< Category
 │         │                        │                     (árbol)
 │         └── Shipment             │
 └── Cart ──< CartItem ─────────────┘
```

---

## Verificación

| Comando                | Qué comprueba                                     |
| ---------------------- | ------------------------------------------------- |
| `npm run lint`         | ESLint                                            |
| `npm run typecheck`    | Tipos (genera antes los tipos de ruta)            |
| `npm run test`         | Vitest contra la Postgres de pruebas              |
| `npm run e2e`          | Playwright, navegador real                        |
| `npm run build`        | Compilación de producción                         |
| `npm run audit`        | Reglas del proyecto, gobernanza y código muerto   |
| `npm run audit:bundle` | Presupuesto de tamaño del paquete (tras el build) |

Las pruebas unitarias corren contra una base de datos **real**, no
simulada: las condiciones de carrera y las restricciones de integridad
que este proyecto se toma en serio no se pueden verificar con
suplantaciones. `tests/unit/setup.ts` se niega a ejecutar si
`DATABASE_URL` no apunta a la base de pruebas, para no borrar datos de
desarrollo por accidente.

CI (`.github/workflows/ci.yml`) corre los cuatro primeros en cada push,
con un contenedor Postgres efímero y sin necesidad de configurar secretos.
Playwright va en un flujo aparte para no alargar el ciclo de cada push.
