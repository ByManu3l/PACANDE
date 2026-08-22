# Prompt: re-auditoría a nivel comercial

> Documento de trabajo. Define el alcance de la segunda pasada sobre la
> plantilla, cuyo objetivo no es corregir defectos —eso ya se hizo— sino
> **subir el listón de "proyecto bien hecho" a "producto vendible"**.

---

## 1. Rol

Actúas como **ingeniero de software sénior con responsabilidad de
producto**, no como revisor de código. La diferencia importa: un revisor
pregunta «¿esto es correcto?»; tú preguntas «¿un cliente pagaría por
esto y quedaría satisfecho?».

**Esta es una re-auditoría de tu propio trabajo previo.** Eso introduce un
sesgo concreto: la tentación de defender decisiones ya tomadas y de
confundir «lo justifiqué en `DECISIONES.md`» con «está bien». Trata cada
decisión anterior como sospechosa hasta que la vuelvas a examinar contra
el criterio nuevo. Si algo que escribiste antes ya no se sostiene, dilo y
cámbialo.

---

## 2. El diagnóstico de partida

La plantilla es **correcta** —75 pruebas unitarias, 11 end-to-end, cero
defectos conocidos de seguridad, documentación exhaustiva— y aun así se
siente a proyecto académico. Estas son las razones concretas, todas
verificadas en el repositorio actual:

**En lo que ve el cliente:**

- La portada es una imagen de cabecera y dos rejillas. No hay nada más.
- Las páginas de categoría no tienen **filtros ni ordenamiento**. Su
  ausencia se nota en el primer vistazo: no existe tienda real sin eso.
- La ficha de producto muestra las imágenes apiladas, sin galería.
- No hay migas de pan, ni productos relacionados, ni vistos recientemente.
- Los 9 modelos de datos no incluyen **reseñas, valoraciones, favoritos,
  cupones ni direcciones guardadas** — es decir, ninguna de las funciones
  que un negocio da por supuestas.
- No hay señales de confianza (envío, devoluciones, pago seguro), que son
  lo que convierte visitas en compras.

**En lo que ve el desarrollador que la compra o la hereda:**

- **Cero archivos de gobernanza**: sin `.editorconfig`, `.nvmrc`,
  `.gitattributes`, `CHANGELOG.md`, `SECURITY.md`, `CONTRIBUTING.md` en
  la raíz, plantillas de issue o PR, `CODEOWNERS`, ni `dependabot.yml`.
- Sin ganchos de git: nada impide subir código sin formatear o con un
  mensaje de commit arbitrario.
- La falta de `.gitattributes` hace que **cada commit escupa una veintena
  de avisos de CRLF**. Es cosmético, pero es lo primero que ve alguien que
  clona el repositorio en otro sistema operativo.
- Sin demo desplegada. El comprador tiene que instalarlo para verlo.

**En rigor de producción:**

- **No se validan las variables de entorno.** Un `.env` incompleto no
  falla al arrancar: falla más tarde, en una petición cualquiera, con un
  error que no dice qué falta.
- La estrategia de registro es `console.error`. Sin identificadores de
  petición, sin niveles, sin punto de enganche para un servicio de
  seguimiento de errores.
- Sin límite de intentos en el acceso ni en el checkout.
- Sin cabeceras de seguridad (CSP, HSTS, y compañía).
- Sin endpoint de salud, sin métrica alguna, sin nada que permita saber si
  la aplicación está viva en producción.
- La invalidación de caché es a martillazos: `revalidatePath('/categoria',
'layout')` tira la sección entera cuando cambia un solo producto.

---

## 3. El listón: qué significa aquí «profesional»

La referencia no es abstracta. Es **GritBase**, del mismo autor, que sí
transmite producto comercial. Lo que tiene y esta plantilla no:

| GritBase                                                                                                               | PACANDE hoy                                      |
| ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `.editorconfig`, `.nvmrc`, `.gitattributes`, `.vscode/`                                                                | nada de eso                                      |
| `husky`, `commitlint`, `lint-staged`                                                                                   | nada                                             |
| `knip` (detección de código muerto)                                                                                    | nada                                             |
| `CHANGELOG`, `SECURITY`, `CONTRIBUTING`, `CODE_OF_CONDUCT`                                                             | solo `LICENSE`                                   |
| `CODEOWNERS`, `dependabot`, plantillas de issue y PR                                                                   | nada                                             |
| 4 flujos de CI (incluidos respaldo y migración de la base)                                                             | 2 flujos                                         |
| `docs/PRODUCTION_READINESS.md`, `CAPACITY_READINESS.md`, `STAGING_AND_OBSERVABILITY.md`, `SEGURIDAD_Y_CONTINUIDAD.md`  | documentación técnica, sin postura de producción |
| **Scripts de auto-auditoría** (`audit:repo`, `audit:governance`, `audit:capacity`, `audit:prod:ops`, `audit:deadcode`) | verificación manual                              |
| Demo pública desplegada                                                                                                | ninguna                                          |
| Material comercial (presentación en PDF, guía de piloto)                                                               | ninguno                                          |

El patrón que distingue a GritBase no es que tenga más funciones: es que
**el repositorio puede demostrar su propio estado**. Un comprador ejecuta
un comando y obtiene un informe. Eso es lo que hay que replicar, a la
escala que corresponde a una tienda.

---

## 4. Principios rectores

**1. Sobreingenieriza donde el cliente mira; simplifica donde no.**
Esta es la instrucción central. La experiencia de compra y la postura de
producción merecen inversión generosa —son el producto—. La arquitectura
interna ya está resuelta y no necesita más capas.

**2. Cada añadido tiene que justificar su mantenimiento.**
Pregunta de control: «si el comprador nunca lo toca, ¿sigue valiendo la
pena?». Una galería de producto: sí. Un sistema de plugins: no.

**3. Lo verificable vence a lo declarado.**
No escribas «la plantilla es segura». Escribe un script que lo compruebe y
enseña su salida. Todo grep manual que hiciste en la auditoría anterior es
candidato a convertirse en comprobación automática.

**4. Lo que se ve importa tanto como lo que funciona.**
Un cliente no lee `order.service.ts`. Ve una página. Que el código sea
excelente y la página parezca una maqueta es un fracaso comercial, por
mucho que sea un éxito técnico.

**5. Añadir función sin añadir pantalla de administración es no añadirla.**
Si metes cupones, tiene que haber dónde crearlos. Una función a medias es
peor que su ausencia: promete algo que no cumple.

**6. Sigue borrando.**
El sesgo hacia eliminar de la auditoría anterior sigue vigente. Añadir
tres funciones no es excusa para dejar de quitar lo que sobra.

---

## 5. Anti-objetivos

Esto **no** se hace. Son las trampas que convierten una plantilla vendible
en un producto de 150 000 dólares que nadie mantiene.

- **Multi-tenant.** Una instalación, una tienda. Es la línea que separa una
  plantilla de un SaaS.
- **Monorepo** (`turbo`, `apps/`, `packages/`). GritBase lo tiene porque
  tiene web y escritorio. Aquí hay una aplicación: sería estructura sin
  contenido.
- **Microservicios, colas de mensajes, event sourcing, CQRS.**
- **Sistema de plugins o de temas.** Re-marcar es editar dos archivos, y
  eso ya funciona.
- **Marco de internacionalización.** Un idioma, como está decidido.
- **CMS headless.** El panel de administración es el CMS.
- **GraphQL** ni una API REST paralela a las Server Actions.
- **Capa de repositorios sobre Prisma.** Prisma ya es esa capa.
- **Kubernetes, Docker de producción, Terraform.** Se despliega en Vercel
  o equivalente.
- **Perseguir un porcentaje de cobertura.** Se prueba lo que puede fallar
  en silencio, no lo que sube el número.
- **Variantes de producto** (talla, color) — ver la nota del eje A.

---

## 6. Ejes de trabajo

### Eje A — Experiencia de compra

Es el eje con más peso. Prioridad por impacto comercial:

**A1. Filtros y ordenamiento en categoría y búsqueda.** Rango de precio,
disponibilidad, orden (relevancia, precio, novedad). En la URL, no en
estado de cliente: los resultados filtrados tienen que ser compartibles y
sobrevivir al botón «atrás», igual que la paginación existente.

**A2. Ficha de producto de verdad.** Galería con miniaturas y ampliación,
migas de pan, indicador de existencias, productos relacionados de la misma
categoría, y datos estructurados `Product` de schema.org — que es lo que
hace que Google muestre precio y disponibilidad en los resultados.

**A3. Reseñas y valoraciones.** Modelo nuevo. Es **la** señal de confianza
del comercio electrónico y su ausencia se nota más que ninguna otra.
Requiere: valoración media en las tarjetas de producto, formulario para
quien compró, y moderación desde el panel.

**A4. Cupones de descuento.** Modelo nuevo. Todo negocio quiere hacer
promociones. Porcentaje o importe fijo, con vigencia, tope de usos y
mínimo de compra. Se aplica en el checkout, **recalculado en el servidor**
—nunca confiando en el descuento que envía el navegador— y se congela en
el pedido igual que los precios.

**A5. Lista de deseos.** Modelo nuevo, sencillo. Para usuarios con sesión.

**A6. Direcciones guardadas.** Se eliminó el modelo `Address` en la
auditoría anterior por estar muerto. Reevalúa: teclear la dirección
completa en cada compra es fricción real y una tienda seria lo resuelve.
Si vuelve, que sea con pantalla de gestión, no como tabla huérfana.

**A7. Pulido visual.** Escala tipográfica y ritmo de espaciado coherentes,
estados de hover y foco en todo lo interactivo, transiciones sobrias,
estados vacíos con propósito (no un párrafo suelto), señales de confianza
en el pie y en el checkout. El criterio: que parezca **diseñado**, no
compuesto con los valores por defecto.

**A8. Seguimiento de pedido.** Página pública por número de pedido, con la
línea temporal del envío. Es lo que más consulta un cliente después de
comprar.

> **Sobre variantes de producto (talla, color):** quedan fuera. No es una
> función, es un cambio de modelo de datos que atraviesa carrito, stock,
> pedidos y panel. Hacerlo a medias sería peor que no hacerlo. Documenta
> en `AUDITORIA.md` qué implicaría, para que sea una decisión informada.

### Eje B — Rigor de producción

**B1. Validación de variables de entorno al arrancar.** Esquema zod que se
evalúa al iniciar y falla con un mensaje que diga exactamente qué falta.
Que un despliegue reviente por un `.env` incompleto **en el arranque** y no
en la primera compra.

**B2. Registro estructurado.** Sustituye `console.error` por un registro
con niveles e identificador de petición, detrás de una interfaz mínima
—como se hizo con `PaymentProvider` y `StorageAdapter`— para que enchufar
Sentry, Axiom o Better Stack sea cambiar una línea. No incorpores el
servicio: define el punto de enganche.

**B3. Límite de intentos.** En acceso, registro y checkout. Implementación
proporcionada: en memoria por defecto, detrás de una interfaz que admita
Redis. Documenta que en producción serverless conviene resolverlo en el
borde.

**B4. Cabeceras de seguridad.** CSP, HSTS, `X-Content-Type-Options`,
`Referrer-Policy`, `Permissions-Policy`. Verificado, no solo escrito.

**B5. Endpoint de salud.** `/api/health` que compruebe la base de datos.
Es lo que consulta cualquier supervisor externo.

**B6. Caché con etiquetas.** Sustituye los `revalidatePath` amplios por
`revalidateTag` con granularidad por entidad. Hoy cambiar un producto tira
la caché de todo el catálogo.

**B7. Revisión de índices.** Contrasta los índices del esquema con las
consultas que realmente se ejecutan. Sobran o faltan; averígualo con
`EXPLAIN`, no por intuición.

**B8. Continuidad.** Documenta y automatiza el respaldo de la base de
datos, y el procedimiento de restauración. GritBase tiene un flujo de CI
para esto.

### Eje C — Gobernanza del repositorio

Barato, rápido, y de los que más cambian la primera impresión.

**C1.** `.editorconfig`, `.nvmrc`, `.gitattributes` (esto último elimina
los avisos de CRLF de cada commit), `.vscode/extensions.json` y
`settings.json` recomendados.

**C2.** `husky` + `lint-staged` + `commitlint`. Que sea imposible subir
código sin formatear o con un mensaje que no siga la convención.

**C3.** `knip` para detectar exportaciones y dependencias muertas, con
script propio. La auditoría anterior las buscó a mano.

**C4.** Documentos de comunidad en la raíz: `CHANGELOG.md` (con formato
Keep a Changelog y versionado semántico), `SECURITY.md`, `CONTRIBUTING.md`
—que apunte a `docs/CONTRIBUIR.md` sin duplicarlo—, `CODE_OF_CONDUCT.md`.

**C5.** `.github/`: `CODEOWNERS`, `dependabot.yml`, plantillas de issue y
de pull request.

**C6.** README comercial: insignias de estado, **capturas de pantalla**,
enlace a la demo, y una descripción que venda antes de explicar. Hoy el
README explica; tiene que empezar por convencer.

### Eje D — Calidad demostrable

Aquí está el salto de categoría. Convierte la verificación manual en
comandos.

**D1. `npm run audit:repo`.** Automatiza lo que se comprobó a mano: que no
haya Prisma fuera de `lib/services/`, que la marca no salga de
`site.config.ts`, que toda Server Action de administración empiece por
`requireRole`, que no queden `console.log`, que no haya `any`. Salida
legible y código de salida distinto de cero si algo falla.

**D2. `npm run audit:governance`.** Comprueba que existan los archivos del
eje C y que el README no tenga enlaces rotos.

**D3. Cobertura con umbral**, en CI. No como objetivo, sino como red: que
una caída brusca se note.

**D4. Presupuesto de rendimiento.** Lighthouse CI con umbrales de LCP,
CLS y accesibilidad. Un incumplimiento rompe la compilación.

**D5. Auditoría de accesibilidad** con `axe` en las pruebas end-to-end de
los flujos principales.

**D6. Análisis del paquete**, con umbral de tamaño.

**D7.** Integra D1–D6 en CI y **enseña la salida en el informe final**.

### Eje E — Modernidad técnica

Solo donde aporte algo perceptible. Modernizar por moda es ruido.

**E1.** `Suspense` y streaming donde una parte lenta bloquea el resto.
**E2.** Interfaz optimista en el carrito: la cantidad debe responder al
instante, no esperar al servidor.
**E3.** `after()` de Next.js para trabajo posterior a la respuesta
(registro, métricas), sin retrasar lo que ve el usuario.
**E4.** Evalúa View Transitions y PPR: adóptalos **solo** si están
estables y el beneficio se nota. Si los descartas, escribe por qué.

### Eje F — Material comercial

**F1. Demo desplegada** en Vercel, con base de datos gestionada y catálogo
de ejemplo. Es lo que permite enseñar la plantilla sin instalar nada.

**F2. Documento de una página para el cliente**: qué incluye, qué no,
cuánto cuesta ponerla en marcha, qué requiere trabajo adicional
(pasarela, correo, dominio). Honestidad explícita sobre los límites: es lo
que evita una venta que termina mal.

**F3. Decisión de licencia.** Hoy es MIT, que permite a un comprador
redistribuirla libremente. **Si la intención es vender, MIT es la licencia
equivocada.** Plantea las alternativas —licencia comercial propietaria,
doble licencia— y deja la decisión tomada de forma consciente, no por
inercia.

---

## 7. Fases

**Fase 0 — Reconocimiento.** Levanta la aplicación y recórrela como lo
haría un cliente: móvil y escritorio, con y sin sesión, catálogo vacío y
lleno. Anota cada punto donde se sienta incompleta. **No escribas código
en esta fase.**

**Fase 1 — Gobernanza (eje C).** Es lo más rápido y desbloquea el resto:
con los ganchos de git puestos, todo lo que venga después nace formateado
y con mensajes correctos.

**Fase 2 — Rigor de producción (eje B).** Antes que las funciones nuevas:
validar el entorno y tener registro estructurado hace más fácil depurar
todo lo que sigue.

**Fase 3 — Datos y funciones (eje A, partes A3–A6).** Los modelos nuevos
primero, con sus migraciones, servicios, pruebas y pantallas de
administración. Nada de tablas sin interfaz.

**Fase 4 — Experiencia (eje A, partes A1, A2, A7, A8).** Filtros, galería,
pulido visual, seguimiento.

**Fase 5 — Calidad demostrable (eje D) y modernidad (eje E).**

**Fase 6 — Comercial (eje F) y cierre.** Demo desplegada, capturas,
informe.

En cada fase: commits directos a `main`, cada uno dejando lint, typecheck,
pruebas y build en verde. Igual que en la auditoría anterior.

---

## 8. Definición de terminado

No basta con que compile. Para dar por cerrado esto:

- [ ] Un desconocido abre el repositorio y en treinta segundos entiende
      qué es, lo ve funcionando (demo) y sabe cuánto cuesta arrancarlo.
- [ ] `npm run audit:repo` y `audit:governance` pasan y su salida está en
      el informe.
- [ ] La tienda se puede usar de verdad: filtrar, comparar, leer opiniones,
      guardar favoritos, aplicar un cupón, comprar y seguir el pedido.
- [ ] Toda función nueva tiene pantalla de administración.
- [ ] Un `.env` incompleto falla **al arrancar**, con un mensaje que diga
      qué falta.
- [ ] Lighthouse por encima de los umbrales fijados, verificado en CI.
- [ ] Cero avisos de CRLF al hacer commit.
- [ ] Las pruebas nuevas se validaron revirtiendo la corrección y viendo
      fallar la prueba. Como la vez anterior.
- [ ] `DECISIONES.md` incorpora las decisiones nuevas **y corrige las
      antiguas que ya no se sostengan**.
- [ ] La licencia es una decisión consciente.

---

## 9. Informe final

En `docs/AUDITORIA.md`, como segunda parte —no reemplazando la primera—:

1. **Qué cambió y por qué**, agrupado por eje.
2. **Antes y después medibles**: Lighthouse, tamaño del paquete, número de
   pruebas, tiempo de compilación.
3. **Capturas** de las pantallas nuevas.
4. **Salida real** de los scripts de auditoría.
5. **Qué se decidió no hacer**, con su motivo. Incluidas las funciones
   descartadas del eje A y todos los anti-objetivos que resultaron
   tentadores.
6. **Decisiones anteriores revocadas**, si las hubo, con lo que se aprendió.
7. **Qué sigue faltando** para un cliente concreto, dicho sin adornos.

El criterio de siempre: un informe que solo cuenta aciertos no es un
informe fiable.
