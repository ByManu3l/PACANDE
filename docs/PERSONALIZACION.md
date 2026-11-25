# Personalizar la plantilla

Cómo convertir esto en **tu** tienda. Está ordenado de lo más frecuente a
lo más raro; probablemente solo necesites las tres primeras secciones.

Para entender el proyecto antes de tocarlo, lee
[`ARQUITECTURA.md`](ARQUITECTURA.md).

---

## 1. Identidad: nombre, moneda, contacto

Todo lo textual está en un solo archivo:
[`src/lib/config/site.config.ts`](../src/lib/config/site.config.ts).

```ts
export const siteConfig: SiteConfig = {
  name: 'Pacandé', //              ← nombre de la tienda
  description: '…', //              ← metaetiqueta y pie de página
  htmlLang: 'es',
  defaultCurrency: 'COP', //        ← código ISO 4217
  locale: 'es-CO', //               ← formato de números y fechas
  contactEmail: 'contacto@pacande.test',
  contactPhone: '+57 300 000 0000',
  displayCurrencies: ['USD', 'EUR', 'MXN'], // ← solo para mostrar
  flatShippingCost: 10_000, //      ← costo fijo de envío
  social: { facebook: '…', instagram: '…', x: '…' },
};
```

**`defaultCurrency` y `locale` van juntos.** El primero decide el símbolo
y los decimales; el segundo, si se escribe `1.234,56` o `1,234.56`.
Cambiar uno sin el otro produce precios con aspecto incorrecto.

| Mercado  | `defaultCurrency` | `locale` |
| -------- | ----------------- | -------- |
| Colombia | `COP`             | `es-CO`  |
| México   | `MXN`             | `es-MX`  |
| España   | `EUR`             | `es-ES`  |
| EE. UU.  | `USD`             | `en-US`  |

### `displayCurrencies`: mirar en otra moneda, cobrar en la tuya

Las monedas de esta lista aparecen en un selector de la cabecera y
permiten al visitante **ver** los precios convertidos. Déjala vacía
(`[]`) para ocultar el selector.

**La conversión no cobra, y esto es deliberado.** Todo pedido se calcula,
se cobra y se guarda en `defaultCurrency`; el importe convertido se marca
con «≈» y va siempre detrás del importe real, y el carrito y el checkout
avisan de en qué moneda se cobra. Las razones están en el encabezado de
[`exchange-rate.service.ts`](../src/lib/services/exchange-rate.service.ts),
y se resumen en tres:

- Cobrar según una tasa que se mueve entre que alguien ve el precio y
  pulsa pagar es publicidad engañosa.
- La fuente de tasas es pública y gratuita: sin acuerdo de servicio ni
  responsabilidad si devuelve un número erróneo.
- La conversión real la hace la pasarela con sus tasas contractuales.
  Duplicarla aquí garantiza descuadres contables.

Si tu negocio necesita cobrar en varias monedas, el camino correcto es
precios por moneda gestionados por ti, o delegar en la pasarela — no
multiplicar por una tasa traída de internet.

No hace falta tocar nada más: `formatPrice()` lee de aquí y la usan todas
las pantallas.

Si dejas alguna red social vacía, su enlace desaparece del pie
automáticamente.

---

## 2. Colores

En [`src/app/globals.css`](../src/app/globals.css), el token `--primary`
define el color de marca. Todo lo demás se deriva de él.

```css
:root {
  --primary: oklch(0.55 0.22 25); /* claro */
}
.dark {
  --primary: oklch(0.63 0.22 25); /* oscuro */
}
```

**Cambia los dos.** El modo oscuro necesita algo más de luminosidad para
mantener el contraste sobre fondo oscuro; por eso `0.63` frente a `0.55`.

Los valores están en `oklch(luminosidad croma tono)`, que a diferencia de
los hexadecimales mantiene la luminosidad percibida al mover el tono. En
la práctica: **cambia solo el tercer número** (0–360) y obtendrás otro
color de la misma intensidad.

| Tono | Color aproximado |
| ---- | ---------------- |
| 25   | rojo             |
| 70   | naranja          |
| 145  | verde            |
| 230  | azul             |
| 300  | morado           |

Si tienes un hexadecimal de marca, conviértelo en
[oklch.com](https://oklch.com) y pega el resultado.

El redondeo de las esquinas es `--radius` (por defecto `0.625rem`). Súbelo
para un aspecto más suave, o ponlo a `0` para uno más severo.

---

## 3. El catálogo

Categorías y productos **viven en la base de datos**, no en el código. Hay
dos caminos:

**a) Desde el panel** (recomendado para empezar). Entra en
`/admin/categorias` y `/admin/productos` y crea lo tuyo. Después borra el
catálogo de ejemplo.

**b) Desde el seed** (mejor si tienes muchos productos). Edita
[`prisma/seed.ts`](../prisma/seed.ts) con tus datos y ejecuta:

```bash
npm run db:seed
```

El seed es **idempotente**: se identifica por slug y correo, así que
ejecutarlo dos veces no duplica nada. Puedes iterar sobre él sin miedo.

Para empezar de cero, sin nada del ejemplo:

```bash
npx prisma migrate reset
```

Esto borra la base entera, vuelve a aplicar las migraciones y ejecuta el
seed. Nunca lo corras contra producción.

### Las imágenes

Las de ejemplo están en `public/images/` y están versionadas. Las que se
suben desde el panel van a `public/uploads/`, que está en `.gitignore`.

Esa distinción importa: el código nunca borra archivos de `/images/`
—varios productos de ejemplo comparten la misma foto— y sí limpia los de
`/uploads/` cuando quedan huérfanos.

---

## 4. Conectar una pasarela de pago real

El cobro está simulado. Todo lo que lo rodea —descuento de stock,
congelado de precios, numeración, transacciones, reversión— **no lo está**
y no hay que rehacerlo.

### Paso 1: implementar la interfaz

En [`src/lib/services/payment.service.ts`](../src/lib/services/payment.service.ts):

```ts
class StripeProvider implements PaymentProvider {
  async charge(amount: number, method: string): Promise<PaymentResult> {
    // Tu integración aquí.
    // Devuelve { approved: true, reference } o
    //          { approved: false, declineReason }
  }
}

export const paymentProvider: PaymentProvider = new StripeProvider();
```

Esa última línea es el único cambio necesario en el resto del proyecto.
`order.service.ts` no se toca.

### Paso 2: el webhook

Toda pasarela seria confirma los pagos de forma **asíncrona**. El valor
que devuelve `charge()` es un indicio; la confirmación real llega por
webhook, y es la que debe mandar.

Crea `src/app/api/webhooks/pago/route.ts`, verifica la firma que envía tu
proveedor (esto no es opcional: sin verificar, cualquiera puede marcar
pedidos como pagados) y actualiza el pedido desde ahí.

### Paso 3: los datos de tarjeta siguen sin tocar el servidor

El checkout ya está montado para que el navegador maneje los datos de
tarjeta y el servidor solo reciba dirección y método. Es exactamente el
flujo que esperan Stripe Elements, Wompi y equivalentes: sustituye el
formulario de tarjeta por el widget del proveedor y el resto encaja sin
cambios.

**No** empieces a enviar el número de tarjeta al servidor. Ver el punto 13
de [`DECISIONES.md`](DECISIONES.md).

---

## 5. Reglas de envío

Ahora hay un costo fijo, `flatShippingCost`. Para algo más elaborado —por
peso, por región, gratis a partir de cierto importe— el punto a tocar es
`reserveOrder` en
[`src/lib/services/order.service.ts`](../src/lib/services/order.service.ts):

```ts
const shippingCost = new Prisma.Decimal(siteConfig.flatShippingCost);
```

Sustitúyelo por tu cálculo. **Usa `Prisma.Decimal`, no `number`**: es un
importe que se cobra y se guarda.

`Order.shippingCost` ya se almacena por pedido, así que cambiar las reglas
más adelante no altera los pedidos antiguos.

---

## 6. Almacenamiento de archivos en producción

El adaptador por defecto escribe en el disco local. **Eso no funciona en
un despliegue serverless** (Vercel, Netlify, Lambda): el sistema de
archivos es efímero y las imágenes desaparecen entre peticiones.

Si despliegas ahí, implementa `StorageAdapter` en
[`src/lib/services/storage.service.ts`](../src/lib/services/storage.service.ts):

```ts
class VercelBlobAdapter implements StorageAdapter {
  async save(file: File, directory: string, filename: string): Promise<string> {
    /* … devuelve la URL pública … */
  }
  async delete(publicPath: string): Promise<void> {
    /* … */
  }
}

export const storage: StorageAdapter = new VercelBlobAdapter();
```

Es el único punto de la aplicación que hay que cambiar.

Si despliegas en un servidor con disco persistente (VPS, Railway, Render
con volumen), el adaptador por defecto sirve tal cual.

---

## 7. Añadir un campo a un modelo

Ejemplo: un SKU en los productos.

1. **Esquema** — añade el campo en `prisma/schema.prisma`, con un
   comentario que diga para qué es.
2. **Migración** — `npm run db:migrate`, y ponle un nombre descriptivo.
3. **Validación** — añade el campo a `src/lib/validations/product.ts`.
4. **Servicio** — normalmente nada: `createProduct` recibe el objeto
   completo.
5. **Formulario** — añade el campo en
   `src/components/admin/product-form-dialog.tsx`.
6. **Pantalla** — muéstralo donde corresponda.

Si te saltas el paso 3, el campo no llegará: el `parse` del esquema
descarta lo que no declara. Es intencional — así nadie puede inyectar
columnas enviando datos de más.

---

## 8. Añadir una página

```
src/app/(storefront)/mi-pagina/page.tsx
```

Y ya está en `/mi-pagina`. Para que aparezca en el menú, edita
`src/components/shared/navbar.tsx` y `mobile-nav.tsx`.

Si la página debe ser privada, añade su ruta al `matcher` de
`src/proxy.ts` **y** comprueba la sesión en la propia página. Las dos
cosas: el proxy es comodidad, la comprobación es la que protege.

---

## 9. Cambiar de idioma

La interfaz está en español, en texto plano dentro de los componentes.
Para otro idioma, la ruta corta es reemplazar esos textos. Para varios
idiomas a la vez, `next-intl` encaja sobre las rutas existentes sin tocar
la arquitectura.

Ten en cuenta que también están en español los mensajes de error de los
servicios (`lib/services/`) y de los esquemas (`lib/validations/`) — son
textos que el usuario final ve.

---

## Antes de publicar

- [ ] `AUTH_SECRET` generado con `npx auth secret` (no el del ejemplo).
- [ ] `DATABASE_URL` apuntando a la base de producción.
- [ ] `NEXT_PUBLIC_SITE_URL` con tu dominio real — el sitemap lo usa; sin
      esto listará URLs de `localhost`.
- [ ] Las contraseñas de ejemplo del seed cambiadas o esos usuarios
      eliminados.
- [ ] `site.config.ts` sin rastro de "Pacandé".
- [ ] `StorageAdapter` sustituido si el despliegue es serverless.
- [ ] `/terminos` y `/privacidad` con tus textos legales reales.
- [ ] `npm run build` en verde.
