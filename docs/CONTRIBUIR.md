# Trabajar en este proyecto

Cómo hacer cambios sin romper lo que ya funciona. Si vas a personalizar la
plantilla para un negocio, lee antes
[`PERSONALIZACION.md`](PERSONALIZACION.md); esto es para quien va a tocar
el código en serio.

---

## Poner el entorno en marcha

```bash
cp .env.example .env
npx auth secret          # escribe AUTH_SECRET en .env
docker compose up -d     # Postgres local
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Para poder ejecutar las pruebas necesitas además una segunda base de
datos. Crea un `.env.test` (no versionado) apuntando a `pacande_test`:

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/pacande_test"
```

`tests/unit/setup.ts` se niega a arrancar si `DATABASE_URL` no apunta a
una base cuyo nombre termine en `_test`. Es una salvaguarda deliberada:
las pruebas borran tablas entre casos, y sin ella un `.env` mal cargado
vaciaría tu base de desarrollo.

---

## Las reglas

### 1. Prisma solo se toca desde `lib/services/`

Ni páginas ni Server Actions consultan la base de datos directamente.
Comprobación:

```bash
grep -rn "prisma\." src/app src/actions src/components
```

No debe devolver nada. El razonamiento está en
[`ARQUITECTURA.md`](ARQUITECTURA.md).

### 2. Toda Server Action de administración empieza por `requireRole()`

En la primera línea, antes de validar nada. Una Server Action es un
endpoint HTTP invocable desde la consola del navegador: `proxy.ts` no la
protege.

### 3. Los importes son `Decimal`, nunca `number`

En cualquier cálculo que se guarde o se cobre. `number` es coma flotante
y acumula error al sumar.

La excepción es `cartTotals()`, que es solo informativo y está marcado
como tal en el código.

### 4. Validar en el servidor, siempre

La validación del navegador es comodidad. Cada Server Action vuelve a
ejecutar `schema.parse()` sobre lo que recibe. Compartir el esquema entre
ambos lados es lo que evita que se desincronicen.

### 5. Nunca devuelvas `passwordHash`

Usa `select` explícito en cualquier consulta de usuarios. Es fácil de
olvidar, y el hash acabaría viajando al navegador dentro de una tabla del
panel.

### 6. Los `Decimal` no cruzan al cliente

Si una Server Action devuelve datos a un Client Component, convierte los
`Decimal` a texto:

```ts
return productos.map((p) => ({ ...p, price: p.price.toString() }));
```

`formatPrice()` acepta cadenas. Si lo olvidas, el error aparece en tiempo
de ejecución con un mensaje poco claro sobre serialización — y ocurre
también con arreglos anidados, como las líneas de un pedido.

---

## Antes de dar algo por terminado

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Los cuatro en verde. Es exactamente lo que corre CI, así que si pasan en
local, pasan allí.

Playwright (`npm run e2e`) es más lento y va en un flujo aparte. Córrelo
si tocaste flujos completos: autenticación, compra, permisos.

---

## Cómo escribir pruebas aquí

Las de `tests/unit/` corren contra **Postgres real**, no simulado. Usa las
factorías de `tests/unit/factories.ts`:

```ts
const category = await createCategory();
const product = await createProduct(category.id, { stock: 2 });
```

Las tablas se limpian entre casos, así que no hay que deshacer nada.

**Comprueba que tu prueba puede fallar.** Es fácil escribir una que pasa
por casualidad. La forma de verificarlo es deshacer temporalmente la
corrección y confirmar que la prueba falla; si pasa igual, no está
probando lo que crees. Varias pruebas de este proyecto se validaron así, y
al menos una resultó estar tapando el fallo que decía comprobar.

Prioriza lo que puede fallar de forma silenciosa —condiciones de carrera,
permisos, integridad de datos— frente a lo evidente.

---

## Cómo escribir los comentarios

La documentación de este proyecto es parte de su valor, no un adorno. El
criterio es sencillo:

> **Explica el porqué, no el qué.** El código ya dice qué hace.

```ts
// Mal: repite el código.
// Incrementa el stock.
await tx.product.update({ data: { stock: { increment: item.quantity } } });

// Bien: explica una decisión que no es obvia.
// `productId` es nulo si el producto se borró entre la reserva y el
// rechazo. No hay a qué devolver el stock; se ignora la línea.
if (!item.productId) continue;
```

Documenta especialmente:

- Por qué **no** se hizo de la forma obvia.
- Qué se rompe si alguien lo cambia.
- Compromisos aceptados a sabiendas.

Los comentarios van en español, igual que la interfaz. Los identificadores
y los valores de enum van en inglés, que es la convención del ecosistema.

---

## Convenciones

**Nombres de archivo:** `kebab-case.tsx`. Servicios como
`nombre.service.ts`, acciones como `nombre.actions.ts`.

**Formato:** lo pone Prettier. `npm run format` antes de commitear, o
configura tu editor para que lo haga al guardar.

**Commits:** prefijo convencional (`feat:`, `fix:`, `refactor:`, `docs:`,
`test:`, `chore:`) y cuerpo que explique el porqué cuando el cambio no
sea evidente. Los mensajes de este repositorio sirven de ejemplo.

**Migraciones:** con nombre descriptivo
(`npm run db:migrate -- --name agregar_sku_producto`). Una vez aplicadas y
subidas, no se editan: se crea otra encima.

---

## Advertencias sobre las dependencias

**shadcn/ui está construido sobre Base UI, no sobre Radix.** La API
difiere: `render` en vez de `asChild`, `nativeButton={false}` para botones
que envuelven enlaces, Accordion sin `type` ni `collapsible`. Copiar
ejemplos de la documentación de Radix no funciona. Cada archivo de
`components/ui/` lo advierte en su cabecera, y volver a ejecutar
`npx shadcn add` los sobrescribe.

**Next.js 16 renombró `middleware.ts` a `proxy.ts`**, con exportación
nombrada `proxy`. Las guías anteriores a esa versión no coinciden.

**Prisma 7 usa driver adapters.** La conexión se configura explícitamente
en `lib/prisma.ts`, y los errores de restricción única no traen
`meta.target` — ver `isUniqueViolation` en `lib/utils/errors.ts`.

---

## Estado conocido

Estas cosas están identificadas y **no** corregidas, con su motivo. No son
sorpresas: si te topas con alguna, ya se sabía.

| Qué                                                      | Por qué se dejó así                                                                                    |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| 4 avisos de lint por `watch()` de react-hook-form        | Vienen de la biblioteca, no del código propio. Son avisos, no errores.                                 |
| Sin recuperación de contraseña                           | Requiere un proveedor de correo, que cada proyecto elige. Ver `AUDITORIA.md`.                          |
| Las tablas del panel no están paginadas                  | El escaparate sí lo está. Con miles de pedidos hay que aplicar `lib/utils/pagination.ts` también aquí. |
| Las imágenes subidas no se optimizan ni se redimensionan | Se validan tipo y tamaño; procesarlas exige otra dependencia.                                          |
| Sin límite de intentos de acceso                         | Se implementa mejor en el borde (Vercel, Cloudflare) que en la aplicación.                             |

El listado completo, con severidades y recomendaciones, está en
[`AUDITORIA.md`](AUDITORIA.md).
