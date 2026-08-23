# Prompt: tercera auditoría — de plantilla a producto

> Documento de trabajo. Define el alcance de la tercera pasada, cuya meta
> ya no es corregir ni pulir, sino **cerrar la distancia entre una
> plantilla excelente y un producto que se entrega a un cliente con
> compromiso de funcionamiento**.

---

## 0. Una aclaración previa sobre el precio

El encargo menciona «cientos o quizá miles, quizá cientos de miles de
dólares». Conviene separar dos cosas, porque determinan qué trabajo tiene
sentido hacer:

- **Una plantilla vendida como plantilla** —en un mercado, licencia por
  descarga— se mueve entre 50 y 500 dólares. Ese techo lo fija el modelo
  de negocio, no la calidad del código. Ninguna cantidad de ingeniería
  sube ese precio a cinco cifras.
- **La misma base de código usada para entregar tiendas a medida** —«te
  construyo tu tienda sobre mi plataforma»— se cobra entre 10 000 y 60 000
  dólares por proyecto, y con una cartera de clientes suma seis cifras al
  año. Aquí sí paga la ingeniería: lo que se cobra es la certeza de que
  funciona, la rapidez de entrega y el soporte posterior.

**Este prompt asume el segundo modelo.** No porque el primero sea
ilegítimo, sino porque es el único en el que el trabajo que sigue se paga
solo. Y cambia las prioridades: importa menos que la demo deslumbre en
una galería, e importa mucho más poder decirle a un cliente «esto aguanta
X pedidos por minuto, se respalda cada noche, y si algo falla me entero
antes que tú».

Si la intención fuera vender por descarga, la mitad de los ejes de abajo
—operación, carga, continuidad— serían esfuerzo desperdiciado. Confírmalo
antes de empezar.

---

## 1. Rol

Actúas como **responsable técnico que va a firmar un contrato de entrega**.
No revisas código: decides si esto se puede poner delante de un cliente
que paga y responder por ello.

**Es la tercera pasada sobre tu propio trabajo.** Las dos anteriores
dejaron un sesgo acumulado: cada decisión ya tiene su justificación
escrita en `DECISIONES.md`, y una justificación escrita se siente
resuelta aunque haya envejecido. Dos correctores concretos:

1. **Lee `DECISIONES.md` preguntando «¿sigue siendo cierto?»**, no «¿está
   bien argumentado?». Varias de esas decisiones se tomaron cuando el
   objetivo era una plantilla; el objetivo cambió.
2. **Lo que no falló todavía no está probado.** Las dos auditorías
   anteriores verificaron comportamiento correcto. Esta tiene que
   verificar comportamiento **bajo fallo**: base de datos caída, pasarela
   lenta, disco lleno, dos mil peticiones a la vez.

---

## 2. Diagnóstico de partida

El proyecto está objetivamente bien: 154 pruebas unitarias, 39 de
navegador, cero infracciones de accesibilidad, auditoría automática,
documentación completa. Nada de lo que sigue es una crítica a eso.

Lo que separa el estado actual de un producto entregable son tres huecos.

### Hueco 1 — Falta comercio, no funciones

La tienda vende. Pero un negocio real no solo vende: **devuelve dinero,
repone inventario, mira cuánto ganó y le explica a su contador qué pasó**.
Hoy no hay:

- **Devoluciones ni reembolsos.** Un pedido puede cancelarse antes de
  pagar y nada más. No existe el caso «llegó roto».
- **Gestión de inventario.** No hay aviso de stock bajo, ni entrada de
  mercancía, ni historial de movimientos. El stock solo baja.
- **Informes de negocio.** El panel muestra cinco contadores. No dice qué
  se vendió, cuánto se facturó, ni qué producto no rota.
- **Ficha de cliente.** Se ven usuarios, no clientes: sin su historial de
  compra, su valor acumulado ni sus incidencias.
- **Documentos de pedido.** No hay comprobante imprimible ni exportable.
- **Registro de auditoría.** Nadie puede responder «¿quién bajó ese
  precio y cuándo?». Es lo primero que pregunta un cliente con empleados.

### Hueco 2 — No se sabe qué aguanta

No hay una sola cifra medida. No se puede responder «¿cuántos pedidos por
minuto soporta?», que es la pregunta que hace cualquiera antes de firmar.
Tampoco existe:

- Prueba de carga con objetivo declarado.
- Respaldo de base de datos, ni procedimiento de restauración probado.
- Entorno de pruebas separado de producción.
- Observabilidad más allá de escribir en la consola.
- Registro de riesgos con su mitigación.

### Hueco 3 — No hay nada que enseñar

Sigue sin haber **demo desplegada**. Para ver la tienda hay que clonarla,
levantar Docker y sembrar la base. Eso descarta a cualquier interlocutor
que no sea programador — es decir, a quien paga.

---

## 3. El listón

Sigue siendo **GritBase**, pero ahora en su capa operativa, que es donde
está la diferencia que queda:

| GritBase tiene                                                             | PACANDÉ tiene                                    |
| -------------------------------------------------------------------------- | ------------------------------------------------ |
| `audit:capacity` con perfiles (quick, baseline, launch, certification-10k) | nada                                             |
| `audit:prod:ops` que sondea el despliegue vivo                             | nada                                             |
| `audit:load`, `audit:smoke`, `audit:full`                                  | `audit:repo`, `audit:governance`, `audit:bundle` |
| `db-backup.yml`, `db-migrate.yml`                                          | nada                                             |
| `PRODUCTION_READINESS.md` con riesgos y mitigaciones fechadas              | nada                                             |
| `CAPACITY_READINESS.md` con resultados de corridas reales                  | nada                                             |
| `STAGING_AND_OBSERVABILITY.md`                                             | nada                                             |
| `SEGURIDAD_Y_CONTINUIDAD.md`                                               | `SECURITY.md` (política, no continuidad)         |
| `docs/product/`: PRD, análisis de brechas, resumen para cliente            | `QUE-INCLUYE.md`                                 |
| `GUIA_PILOTO.md`                                                           | nada                                             |
| Demo desplegada                                                            | nada                                             |

El patrón: **GritBase puede demostrar que está listo; PACANDÉ solo puede
demostrar que está bien hecho.** Son cosas distintas y la segunda no
implica la primera.

---

## 4. Principios rectores

**1. Lo que no se ha medido no existe.**
«Debería aguantar» no es una respuesta. Cada afirmación sobre capacidad,
disponibilidad o recuperación necesita una cifra, una fecha y el comando
que la produjo.

**2. Ahora sí: sobreingenieriza donde el fallo cuesta dinero.**
Las dos auditorías anteriores frenaron la complejidad, y con razón: la
plantilla no la necesitaba. Un producto que se entrega con compromiso sí
necesita, en cuatro sitios concretos (ver eje D). Fuera de esos cuatro,
el freno sigue puesto.

**3. Prueba el fallo, no solo el acierto.**
Lo que sigue funcionando cuando la base de datos no responde, cuando la
pasarela tarda treinta segundos o cuando el disco está lleno. Eso es lo
que separa un producto de una demostración.

**4. Cada función nueva tiene que sobrevivir a un cliente enfadado.**
Antes de darla por hecha: ¿qué pasa si el cliente hace la operación dos
veces? ¿Si cierra el navegador a mitad? ¿Si el administrador se equivoca
y hay que deshacerlo?

**5. Lo que no se puede enseñar no se puede vender.**
Termina desplegado, con datos, y accesible desde un enlace.

**6. Sigue borrando.**
El sesgo hacia eliminar de las dos auditorías anteriores no caduca porque
ahora se añada más.

---

## 5. Anti-objetivos

Se mantienen los de la segunda auditoría, con una revisión explícita:

- **Multi-tenant: sigue fuera.** Bajo el modelo de entrega a medida, una
  instalación por cliente es más simple, más vendible y más fácil de
  soportar. Compartir base de datos entre clientes introduce riesgo de
  fuga de datos a cambio de un ahorro de infraestructura que no compensa.
- **Monorepo, microservicios, colas externas, GraphQL, CMS headless,
  sistema de plugins, capa de repositorios sobre Prisma:** fuera.
- **Kubernetes y Terraform:** fuera. Se despliega en una plataforma
  gestionada.
- **Marco de internacionalización:** fuera, salvo que un cliente concreto
  lo pague.

**Anti-objetivo nuevo:** no persigas paridad de funciones con Shopify. La
lista del eje A es lo que un negocio pequeño _usa_, no todo lo que existe.
Añadir abandono de carrito, programas de fidelización o recomendaciones
personalizadas sería empezar otro producto.

---

## 6. Ejes de trabajo

### Eje A — Completitud comercial

Cinco funciones. Cada una con su modelo, su servicio, sus pruebas y su
pantalla; ninguna a medias.

**A1. Devoluciones y reembolsos.** Un pedido entregado puede devolverse,
total o parcialmente. Estados propios, motivo, reintegro de stock cuando
proceda, y reembolso a través de la interfaz de pago —que hoy solo sabe
cobrar y necesitará un método más—. Es la función que más veces se pide
después de vender.

**A2. Gestión de inventario.** Umbral de stock bajo por producto con aviso
en el panel, entrada de mercancía con motivo, y **historial de
movimientos**: cada cambio de stock deja registro de quién, cuándo,
cuánto y por qué. Hoy el stock solo baja y nadie sabe por qué bajó.

**A3. Informes de negocio.** Ventas por periodo, productos más y menos
vendidos, ticket medio, y comparación con el periodo anterior.
Consultas agregadas en base de datos, no cálculo en memoria. Exportable a
CSV, que es lo que pide un contador.

**A4. Ficha de cliente.** Historial de compras, valor acumulado, fecha de
la última compra, sus direcciones y sus incidencias, en una sola pantalla.

**A5. Comprobante de pedido imprimible.** Una vista pensada para imprimir
o guardar en PDF, con los datos fiscales configurables desde
`site.config`. Sin dependencias nuevas: `@media print` basta.

### Eje B — Madurez operativa

**B1. Prueba de carga con objetivo declarado.** Script propio
(`audit:capacity`) que ejercite los tres caminos que importan: navegación
de catálogo, añadir al carrito y compra completa. Perfiles: rápido,
base y certificación. Debe producir percentiles (p50, p95, p99) y tasa de
error, y **guardarse el resultado con fecha** en `CAPACITY_READINESS.md`.
El objetivo lo eliges tú, pero tiene que estar escrito antes de medir.

**B2. Respaldo y restauración.** Flujo de CI que respalde la base de datos
a diario, y —esto es lo que casi nadie hace— **un procedimiento de
restauración probado**, con el resultado fechado. Un respaldo que nunca se
restauró no es un respaldo.

**B3. Entorno de pruebas.** Separado de producción, con su base de datos y
su despliegue. Es donde se prueba una migración antes de aplicarla a los
datos de un cliente.

**B4. Observabilidad real.** Enchufar de verdad el punto de extensión que
ya existe en `lib/logger.ts`, con identificador de petición que atraviese
la traza, y `/api/health` ampliado con métricas útiles. Ya no basta con
definir la interfaz.

**B5. `audit:prod:ops`.** Sondea un despliegue vivo: salud, latencia,
cabeceras de seguridad, certificado, sitemap accesible. Se ejecuta contra
la URL que se le pase.

**B6. Registro de riesgos.** `PRODUCTION_READINESS.md` con cada riesgo
conocido, su probabilidad, su impacto y su mitigación —o la constancia
explícita de que se acepta—.

### Eje C — Comportamiento bajo fallo

Lo que hoy no está probado.

**C1. La base de datos no responde.** Qué ve el cliente, qué se registra,
y si se recupera solo al volver.

**C2. La pasarela tarda o no contesta.** Debe haber un tiempo máximo de
espera y una reversión limpia. Hoy no hay tiempo máximo: una pasarela
colgada deja el pedido en `PENDING_PAYMENT` para siempre.

**C3. Compras simultáneas del último artículo.** Ya está probado a nivel
de servicio; falta comprobarlo de extremo a extremo bajo carga real.

**C4. Operaciones repetidas.** Doble envío del formulario de compra, doble
pulsación de reembolso. Hace falta **idempotencia** en las operaciones que
mueven dinero o inventario.

**C5. Migración con datos.** Aplicar una migración sobre una base con
volumen y comprobar que no bloquea ni pierde nada.

### Eje D — Los cuatro sitios donde sí conviene invertir

Aquí es donde se levanta el freno, y solo aquí.

**D1. Eventos de dominio.** Hoy `checkout()` hace seis cosas: crea el
pedido, descuenta stock, cobra, crea el envío, vacía el carrito y
—cuando existan— tendrá que enviar correos, registrar analítica y
actualizar informes. Eso ya es demasiado para una función, y cada añadido
la vuelve más frágil.

Un registro de eventos (`PedidoPagado`, `PedidoDevuelto`,
`StockBajo`…) con sus manejadores permite añadir efectos sin tocar la
lógica de compra. **No es un bus de mensajes ni una cola distribuida:** es
un mapa de nombre de evento a lista de funciones, ejecutado tras confirmar
la transacción. Cien líneas.

**D2. Trabajos diferidos.** Lo que no debe bloquear la respuesta —correos,
generación de documentos, recálculo de informes— necesita ejecutarse
después. Una tabla `Job` con estado y reintentos, más un manejador
periódico. **No Redis, no BullMQ:** Postgres ya sabe hacer de cola.

**D3. Máquina de estados del pedido explícita.** Hoy las transiciones son
libres, lo cual fue una decisión consciente y correcta _para una
plantilla_. Con devoluciones y reembolsos deja de serlo: hay que impedir
que un pedido devuelto vuelva a «pagado». Tabla de transiciones
permitidas, comprobada en el servicio.

**D4. Registro de auditoría.** Quién cambió qué, cuándo y desde dónde, en
todo lo que toque precios, stock, pedidos o permisos. Es requisito de
cualquier cliente con empleados, y añadirlo después obliga a instrumentar
código ya escrito.

> Las cuatro comparten una propiedad: **el coste de añadirlas después es
> mucho mayor que ahora**, porque obligan a reescribir lo que ya funciona.
> Ese es el único criterio válido para adelantar complejidad.

### Eje E — Documentación de producto

**E1. `docs/product/PRD.md`** — qué es, para quién, qué problema resuelve
y qué decisiones de producto lo delimitan.

**E2. `docs/product/analisis-brechas.md`** — comparación honesta con
Shopify, WooCommerce y Tiendanube: qué hace mejor, qué no hace, y para qué
negocio es la elección correcta. Un comprador va a hacer esa comparación
de todos modos; mejor dársela hecha y con criterio.

**E3. `docs/GUIA_PILOTO.md`** — cómo llevar a un cliente desde el primer
contacto hasta la tienda funcionando: qué preguntarle, qué necesitas de
él, en qué orden, y cuánto tarda cada paso.

**E4. `docs/PRODUCTION_READINESS.md`**, **`CAPACITY_READINESS.md`** y
**`SEGURIDAD_Y_CONTINUIDAD.md`**, con resultados fechados.

**E5. Resumen para el cliente**, en un formato que se pueda enviar por
correo a alguien que no es programador.

### Eje F — Demo y venta

**F1. Demo desplegada.** Es lo primero, no lo último: bloquea todo lo
demás porque sin ella no hay nada que enseñar. Con catálogo, cuenta de
demostración y un aviso claro de que los pagos son simulados.

**F2. Capturas y recorrido guiado** en el README.

**F3. Restablecimiento periódico de la demo**, para que quien la pruebe no
encuentre el catálogo destrozado por el visitante anterior.

---

## 7. Fases

**Fase 0 — Reconocimiento y decisión de alcance.** Recorre el producto
como un cliente que va a pagar. Relee `DECISIONES.md` preguntando cuáles
envejecieron. **Escribe el objetivo de capacidad antes de medir nada.** Sin
código.

**Fase 1 — Demo desplegada (eje F1).** Primero. Todo lo demás se puede
enseñar sobre ella.

**Fase 2 — Fundamentos (eje D).** Eventos, trabajos diferidos, máquina de
estados y registro de auditoría. Antes que las funciones que los usan:
al revés obliga a reescribirlas.

**Fase 3 — Comercio (eje A).** Las cinco funciones, cada una completa.

**Fase 4 — Operación (eje B).** Carga, respaldo, entorno de pruebas,
observabilidad, sondas.

**Fase 5 — Fallo (eje C).** Lo que pasa cuando algo se rompe.

**Fase 6 — Documentación de producto y cierre (ejes E, F2, F3).**

Commits directos a `main`, cada uno dejando lint, typecheck, pruebas,
auditoría y build en verde.

---

## 8. Definición de terminado

No basta con que compile ni con que las pruebas pasen.

- [ ] Existe una URL que se puede enviar por correo y muestra la tienda
      funcionando.
- [ ] Se puede responder «¿cuánto aguanta?» con una cifra medida y
      fechada.
- [ ] Se ha **restaurado** un respaldo, no solo tomado.
- [ ] Un pedido se puede devolver y reembolsar de principio a fin.
- [ ] El panel responde «¿cuánto vendí este mes y qué no rota?».
- [ ] Se puede responder «¿quién cambió este precio?».
- [ ] Enviar el formulario de compra dos veces no crea dos pedidos.
- [ ] Con la base de datos caída, el cliente ve un mensaje sensato y el
      operador se entera.
- [ ] Existe un documento que un no programador puede leer y entender qué
      se le está vendiendo.
- [ ] `npm run audit` sigue en verde, ampliado con las comprobaciones
      nuevas.
- [ ] `DECISIONES.md` refleja qué decisiones cambiaron y por qué.

---

## 9. Informe final

Tercera parte de `docs/AUDITORIA.md`:

1. **Qué cambió**, por eje.
2. **Cifras medidas**: capacidad, latencias, tamaño, tiempos de
   recuperación. Con fecha y comando.
3. **Decisiones anteriores revocadas** y qué las hizo envejecer.
4. **Registro de riesgos** con su estado.
5. **Salida real** de todos los scripts de auditoría.
6. **Qué sigue faltando** para un cliente concreto, sin adornos.
7. **Errores propios**, como en las dos anteriores.

Y una sección nueva, que es la que de verdad cierra el encargo:

8. **Qué se puede prometer por contrato.** Una lista de afirmaciones que
   el autor puede firmar delante de un cliente, cada una con la evidencia
   que la respalda. Si algo no se puede respaldar, no entra en la lista —
   y eso también es un resultado de la auditoría.
