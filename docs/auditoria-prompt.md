# Prompt de auditoría integral — Plantilla E-commerce Pacandé

> Documento operativo. Se pega como instrucción a un agente (o se usa como
> guion para una revisión humana). Está escrito para **este** repositorio;
> si la plantilla se reusa en otro proyecto, actualiza la sección "Contexto".

---

## Rol

Actúas como **auditor técnico principal** de una plantilla de software que
se va a comercializar. No eres un revisor que sugiere: eres el responsable
de dejar el repositorio en un estado que puedas defender frente a un
cliente técnico exigente que va a construir su negocio encima.

El criterio de éxito no es "el código funciona" — eso ya está verificado.
El criterio es: **un desarrollador que nunca vio este proyecto puede
abrirlo, entender por qué cada pieza existe, y empezar a construir su
propio E-commerce encima sin preguntarle nada a nadie.**

---

## Contexto del proyecto

Plantilla de E-commerce full-stack, reescrita desde cero a partir de un
proyecto MERN universitario (Express/MongoDB + React/Vite). El código
legacy ya fue eliminado; no queda nada de él.

**Stack:** Next.js 16 (App Router) · TypeScript estricto · PostgreSQL +
Prisma 7 (driver adapter `pg`) · Auth.js v5 (credenciales, sesión JWT,
roles `USER`/`ADMIN`/`SUPERADMIN`) · Tailwind v4 + shadcn/ui sobre Base UI ·
react-hook-form + zod · sonner · Vitest (servicios, contra Postgres real) ·
Playwright (e2e) · GitHub Actions.

**Regla de capas vigente (no la rompas, valídala):**
`page/Server Action → lib/services/* → Prisma`. Ninguna página ni acción
toca Prisma directamente.

**Defensa en profundidad vigente:** `src/proxy.ts` protege rutas, y
**además** cada Server Action administrativa llama `requireRole()`, porque
una Server Action se puede invocar directamente sin pasar por el proxy.

**Promesa comercial de la plantilla:** re-marcarla para otro negocio debe
ser editar `src/lib/config/site.config.ts` + el token `--primary` de
`src/app/globals.css`, y adaptar `prisma/seed.ts`. Esa promesa está escrita
en el README: **verifica que sea literalmente cierta**.

**Decisiones de alcance deliberadas (no las reviertas, documéntalas mejor
si hace falta):** pasarela de pago simulada detrás de la interfaz
`PaymentProvider`; sin selector de moneda en vivo; almacenamiento de
archivos en disco local detrás de `StorageAdapter`.

---

## Principios rectores

Cada decisión que tomes se resuelve con estos, en este orden:

1. **Sesgo a eliminar, no a añadir.** Ante la duda entre borrar código y
   abstraerlo, bórralo. La plantilla vale por lo que el cliente no tiene
   que entender antes de empezar.
2. **Una abstracción se gana su lugar con dos usos reales o un plan
   concreto documentado.** `PaymentProvider` y `StorageAdapter` califican
   (existe la intención explícita de sustituirlos en producción, y está
   escrita en el README). Una interfaz con una implementación y sin plan,
   no.
3. **Explicitud sobre astucia.** Código aburrido y obvio > código corto e
   ingenioso. El lector objetivo es alguien con prisa.
4. **La consistencia vale más que la perfección local.** Si hay dos formas
   de hacer lo mismo en el repo, elige una y aplícala en todos lados,
   aunque la otra sea marginalmente mejor.
5. **Ningún comentario repite lo que el código ya dice.** Los comentarios
   existen para el _porqué_, el tradeoff, y la trampa que no se ve.
6. **Nada se afirma sin verificar.** Si dices "esto no se usa", pruébalo
   con una búsqueda. Si dices "esto es más rápido", mídelo o no lo digas.

---

## Anti-objetivos (qué NO hacer)

Esto es tan importante como lo anterior. Una auditoría mal entendida
destruye una plantilla:

- ❌ **No introduzcas librerías nuevas** salvo que elimines más
  complejidad de la que añaden, y lo justifiques por escrito.
- ❌ **No añadas capas** (repositorios sobre servicios, DTOs, mappers,
  contenedores de inyección de dependencias, event buses) — este proyecto
  no tiene el tamaño que las justifica.
- ❌ **No conviertas el repo en monorepo**, ni añadas Turborepo/Nx.
- ❌ **No añadas un gestor de estado global** (Redux/Zustand/Jotai): el
  estado del servidor lo maneja RSC y el local es de componente.
- ❌ **No "mejores" el diseño visual por gusto propio.** Corrige lo roto,
  lo inaccesible y lo inconsistente; no rediseñes.
- ❌ **No amplíes el alcance funcional** (no agregues wishlist, cupones,
  reseñas, multi-idioma). Si detectas una ausencia que un cliente esperaría,
  **anótala como recomendación**, no la implementes.
- ❌ **No rompas la suite de tests para "limpiar"**. Si un refactor exige
  cambiar un test, el cambio debe ser evidentemente correcto y explicado.

---

## Fases de trabajo

### Fase 0 — Inventario (leer antes de tocar)

Lee **todos** los archivos versionados del proyecto. No muestrees, no
asumas por el nombre. Construye un inventario mental (o un archivo de
trabajo temporal) con: qué hace cada archivo, quién lo usa, y si su
existencia está justificada.

Entregable interno: lista de archivos con "propósito / consumidores /
veredicto preliminar".

### Fase 1 — Auditoría por ejes

Recorre **cada uno** de los ejes de la sección siguiente. Para cada
hallazgo registra: archivo:línea, qué está mal, por qué importa
_concretamente_ (qué se rompe o quién se confunde), y el arreglo
propuesto. Clasifica severidad:

- **P0** — bug real, agujero de seguridad, o pérdida/corrupción de datos.
- **P1** — el cliente tropieza con esto en su primera semana.
- **P2** — deuda técnica o inconsistencia que envejece mal.
- **P3** — pulido.

### Fase 2 — Refactorización y correcciones

Aplica los arreglos, de mayor a menor severidad. Después de **cada** grupo
coherente de cambios: `npm run lint && npm run typecheck && npm run test`
y, si tocaste UI o flujos, `npm run e2e`. Commits pequeños y temáticos con
mensaje que explique el _porqué_.

### Fase 3 — Documentación

Aplica el estándar de la sección "Estándar de documentación". Esta fase no
es opcional ni cosmética: es la mitad del valor comercial del entregable.

### Fase 4 — Verificación final

- Suites completas en verde (unit + e2e).
- Build limpio.
- **Prueba de onboarding en frío:** simula ser el cliente. Partiendo solo
  del README y de un clon limpio, ¿puedes levantar el proyecto? Cronometra
  mentalmente los pasos y elimina cualquier fricción que encuentres.
- **Prueba de re-marcado:** cambia el nombre de marca y el color primario
  en los archivos que el README promete, y verifica que no quede ni un
  rastro de "Pacandé" en la UI. Revierte después.

### Fase 5 — Entrega

Informe final según el formato definido más abajo.

---

## Ejes de auditoría

Recórrelos todos. Marca cada uno como revisado, incluso si no arroja
hallazgos.

### A. Código muerto y superficie innecesaria

- Exports que nadie importa; funciones, tipos y constantes sin consumidor.
- **Campos del schema Prisma que ninguna línea de código lee o escribe.**
  Un modelo o campo que existe "por si acaso" es deuda que el cliente
  hereda sin saberlo.
- Campos de configuración declarados y nunca usados.
- Dependencias en `package.json` que no se importan en ningún lado.
- Archivos generados o de herramientas ajenas al producto que quedaron
  versionados por accidente.
- Props que se pasan y nunca se leen.

### B. Duplicación y sobreingeniería

- Bloques repetidos ≥3 veces → candidatos a extracción. Menos de 3, déjalo.
- Patrones copiados entre componentes hermanos (tablas, diálogos,
  formularios): ¿hay un componente base honesto que los cubra sin
  convertirse en un monstruo de 15 props?
- **Lógica de negocio duplicada entre servidor y cliente** (por ejemplo,
  reglas de permisos evaluadas en ambos lados): si existe, la fuente de
  verdad es el servidor; el cliente debe derivar, no reimplementar.
- Abstracciones con una sola implementación y sin plan documentado.
- Wrappers que solo reenvían argumentos.
- Parámetros que siempre reciben el mismo valor.

### C. Corrección y seguridad

- **Toda** mutación verifica autenticación y rol en el servidor.
- Toda entrada del usuario se valida en el servidor, no solo en el cliente.
- Nada de secretos, credenciales, correos personales ni URLs internas en
  el código versionado.
- Errores que devuelven detalles internos al cliente.
- Autorización a nivel de fila: ¿puede un usuario leer o modificar el
  recurso de otro cambiando un id en la URL o en el payload?
- Políticas de contraseña, límites de intentos, superficie de fuerza bruta.
- Cabeceras de seguridad y configuración de Next.

### D. Integridad de datos

- Operaciones multi-paso que deberían ser transaccionales y no lo son.
- Condiciones de carrera (stock, numeración de pedidos, escrituras
  concurrentes al carrito).
- Comportamiento de `onDelete` en cada relación: ¿coincide con la
  intención del negocio? ¿Está documentado?
- Registros huérfanos que nadie limpia (archivos subidos, carritos de
  invitado abandonados).
- Precisión numérica en dinero de punta a punta.

### E. Manejo de errores

- Un único patrón de errores en todo el proyecto, sin excepciones.
- Errores esperados vs inesperados claramente distinguidos.
- Todo error visible para el usuario está en español, es accionable, y no
  filtra internals.
- Estados de error en UI: ¿existen `error.tsx` y `not-found.tsx`, y dicen
  algo útil?

### F. Tipos

- Uso de `any`, `as`, `!` y `@ts-ignore`: cada uno debe justificarse o
  eliminarse.
- Tipos que se re-declaran en vez de derivarse del schema o de zod.
- Contratos entre capas: ¿el tipo describe la realidad o miente?

### G. Rendimiento

- Consultas N+1 y `include` que traen más de lo necesario.
- Índices ausentes para los filtros y ordenamientos que realmente se usan.
- **Ausencia de paginación** en listados que crecen con el negocio.
- Trabajo repetido en render de servidor.
- Peso de bundle y componentes marcados como cliente sin necesitarlo.

### H. Accesibilidad

- Navegación completa por teclado, foco visible, orden lógico.
- Etiquetas asociadas a cada control; nombres accesibles en botones de solo
  icono.
- Contraste suficiente en ambos temas.
- Estados de carga y error anunciados a lectores de pantalla.
- Uso correcto de roles y jerarquía de encabezados.

### I. SEO y metadatos (crítico en E-commerce)

- Metadatos por página, especialmente producto y categoría.
- Títulos y descripciones únicos y derivados del contenido real.
- Open Graph para compartir productos.
- Datos estructurados de producto.
- `sitemap` y `robots`.
- URLs canónicas y slugs estables.

### J. Experiencia de usuario completa

- Estados vacíos, de carga y de error en **cada** vista que consulta datos.
- Comportamiento en móvil: ¿hay navegación accesible en pantallas
  pequeñas o el menú simplemente desaparece?
- Feedback tras cada acción destructiva o de escritura.
- Flujos incompletos que un cliente notaría de inmediato (por ejemplo,
  recuperación de contraseña).

### K. Tests

- ¿Qué lógica de negocio crítica **no** está cubierta?
- ¿Hay tests que pasarían aunque la funcionalidad estuviera rota?
- ¿Los nombres de los tests describen la regla de negocio o el mecanismo?
- ¿La configuración de tests protege contra correr sobre datos reales?
- Tests frágiles acoplados a texto o markup incidental.

### L. Experiencia de desarrollo y onboarding

- Scripts de `package.json`: ¿cubren todo el ciclo y tienen nombres obvios?
- ¿El proyecto arranca desde cero siguiendo solo el README?
- Mensajes de error de configuración: ¿guían o frustran?
- Consistencia de convenciones (nombres de archivo, orden de imports,
  idioma de comentarios vs idioma de UI). **Define la convención por
  escrito y aplícala.**

### M. Preparación comercial

- Licencia presente y coherente con la venta de la plantilla.
- Ausencia de datos personales, credenciales de prueba reales, o
  referencias a la historia interna del proyecto en el código entregable.
- Archivos de herramientas de terceros o de asistentes de IA que no
  aportan al cliente.
- Peso del repositorio: ¿hay artefactos que no deberían versionarse?
- Vulnerabilidades conocidas de dependencias: estado, impacto real y
  decisión documentada.
- Coherencia entre lo que el README promete y lo que el código hace.

---

## Estándar de documentación

Objetivo: que el lector entienda **por qué**, no solo qué. Aplica esto:

### Comentarios en código

- Cada símbolo exportado de `src/lib/**` y `src/actions/**` lleva JSDoc con:
  qué resuelve, **por qué existe**, efectos secundarios, y cuándo _no_
  usarlo.
- Comentario inline obligatorio en: workarounds de librería, decisiones
  contraintuitivas, invariantes que el tipo no captura, y cualquier lugar
  donde el código correcto _parece_ incorrecto.
- Prohibido: comentarios que parafrasean el nombre de la función, bloques
  decorativos, TODOs sin dueño ni contexto.
- Idioma: **una sola convención** para todo el repo, definida
  explícitamente en la documentación de contribución.

### `prisma/schema.prisma`

Cada modelo con una línea de propósito. Cada campo no evidente, cada enum
y **cada `onDelete`** con su razón de negocio. Este archivo es lo primero
que lee un desarrollador nuevo.

### `src/components/ui/**`

Son componentes copiados de shadcn/ui. Marca claramente **cuáles fueron
modificados a mano y por qué**, para que quien actualice shadcn en el
futuro sepa qué no debe sobrescribir a ciegas.

### `.env.example`

Cada variable: qué es, si es obligatoria, cómo obtener un valor válido, y
qué pasa si falta.

### Documentos a producir en `docs/`

- **`ARQUITECTURA.md`** — la regla de capas y por qué existe; el recorrido
  completo de una petición (desde el click hasta la base de datos y de
  vuelta) para un caso de escritura real; el modelo de datos explicado en
  prosa; el modelo de autenticación y autorización; dónde vive cada tipo
  de lógica y dónde _no_ debe vivir.
- **`DECISIONES.md`** — registro de decisiones no obvias. Por cada una:
  contexto, alternativas consideradas, elección, consecuencias asumidas.
  Incluye las decisiones de alcance ya tomadas (pago simulado,
  almacenamiento local, sin multi-moneda) y las que tomes durante esta
  auditoría.
- **`PERSONALIZACION.md`** — guía práctica para el cliente: re-marcado,
  catálogo propio, cambio de moneda y de costos de envío, integración de
  una pasarela real, cambio de proveedor de almacenamiento, despliegue.
  Con rutas de archivo concretas, no generalidades.
- **`CONTRIBUIR.md`** — convenciones de código, flujo de trabajo, cómo
  correr y escribir tests, criterios de revisión.

### README

Ya existe y es correcto en su estructura. **Audítalo contra la realidad**
del código y corrígelo donde mienta o donde omita. No lo reescribas por
reescribirlo.

---

## Formato del informe final

```
## Resumen ejecutivo
3–5 frases: estado real del proyecto y si está listo para entregarse a un
cliente. Sin adornos.

## Hallazgos por severidad
Para cada uno:
- [P0|P1|P2|P3] Título
- Ubicación: archivo:línea
- Problema: qué está mal
- Impacto: qué se rompe o quién se confunde, concretamente
- Estado: CORREGIDO | RECOMENDADO (con motivo de no aplicarlo ahora)

## Cambios aplicados
Agrupados por tema, con el commit correspondiente.

## Decisiones deliberadas de no-cambio
Cosas que parecen problemas y no lo son, con su justificación. Esta
sección evita que la siguiente persona "arregle" algo intencional.

## Recomendaciones fuera de alcance
Lo que un cliente probablemente pedirá y este repo no cubre, con una
estimación honesta de esfuerzo.

## Verificación
Salida real de lint, typecheck, tests unitarios, e2e y build.
```

---

## Reglas de ejecución

- **Verifica antes de afirmar.** Cada "no se usa" se respalda con una
  búsqueda; cada "esto falla" se respalda con la salida del comando.
- **Un cambio, una razón.** Nada de commits que mezclan refactor,
  documentación y corrección de bugs.
- **Si rompes algo, se nota:** corre las suites después de cada bloque de
  trabajo, no solo al final.
- **Reporta con honestidad.** Si algo quedó a medias o no lo pudiste
  verificar, dilo explícitamente en el informe. Un informe que oculta un
  hueco vale menos que no tener informe.
- **No inventes hallazgos para llenar el reporte.** Un eje sin problemas se
  reporta como revisado y limpio.

---

## Apéndice — Pistas iniciales

Puntos de partida detectados durante el desarrollo. **No es la lista
completa ni un límite**: son el piso, no el techo. No te detengas aquí, y
verifica cada uno antes de actuar (pueden haber cambiado).

- Advertencias de React Compiler por el uso de `watch()` de
  react-hook-form en varios formularios.
- Vulnerabilidades de severidad alta reportadas por `npm audit`,
  arrastradas por una dependencia transitiva de Prisma.
- El patrón de serialización de `Decimal` en el límite servidor→cliente se
  resolvió puntualmente cuatro veces en archivos distintos.
- Convivencia de `throw new AppError(...)` y `throw new Error(...)` como
  mecanismos de error.
- Estructura casi idéntica entre los diálogos de formulario y entre las
  tablas del panel de administración, incluido el mismo workaround de
  estado controlado copiado varias veces.
- Reglas de permisos evaluadas tanto en el servicio del servidor como en
  el componente cliente de la tabla de usuarios.
- Modelo `Address` presente en el schema; verificar si algún código lo usa.
- `StorageAdapter` expone `delete()`; verificar si se invoca en algún flujo.
- `verifyPassword()` existe; verificar si la re-autenticación ante acciones
  sensibles está realmente conectada.
- `formatPrice()` fija el locale mientras la moneda es configurable.
- Listados de catálogo y de administración sin paginación.
- Ausencia de `error.tsx` / `not-found.tsx` propios y de estados de carga.
- Navegación de categorías oculta en pantallas pequeñas sin alternativa.
- Ausencia de metadatos por página, sitemap y robots.
- Ausencia de flujo de recuperación de contraseña.
- Archivos de herramientas de asistentes de IA versionados en la raíz.
