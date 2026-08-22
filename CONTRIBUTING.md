# Contribuir

Gracias por el interés. Esta página cubre el proceso; **la guía técnica
completa está en [`docs/CONTRIBUIR.md`](docs/CONTRIBUIR.md)** — las reglas
del proyecto, cómo escribir pruebas y las advertencias sobre las
dependencias viven allí y no se duplican aquí.

## Antes de escribir código

**Para un fallo:** abre un issue con los pasos para reproducirlo. Un fallo
que no se reproduce no se puede arreglar.

**Para una función nueva:** abre primero un issue describiendo el
_problema_, no la solución. Esta es una plantilla de comercio
electrónico con un alcance deliberadamente acotado, y hay cosas que están
fuera a propósito — la lista de anti-objetivos está en
[`docs/reauditoria-prompt.md`](docs/reauditoria-prompt.md). Es mejor
descubrir que algo no encaja antes de escribirlo que después.

**Para seguridad:** no abras un issue. Ver [`SECURITY.md`](SECURITY.md).

## Poner en marcha el entorno

```bash
cp .env.example .env
npx auth secret
docker compose up -d
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Las pruebas necesitan una segunda base de datos; el detalle está en
[`docs/CONTRIBUIR.md`](docs/CONTRIBUIR.md).

## Mientras trabajas

Los ganchos de git hacen parte del trabajo por ti: al hacer commit se
formatea y se pasa el linter sobre lo que cambiaste, y se comprueba que el
mensaje siga la convención. No los saltes con `--no-verify`.

Antes de abrir el pull request:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Es exactamente lo que ejecuta la integración continua.

## Mensajes de commit

[Conventional Commits](https://www.conventionalcommits.org/es/). El
prefijo no es decoración: de él salen el registro de cambios y el número
de versión siguiente.

```
feat: añadir filtros de precio en las páginas de categoría
fix: el carrito perdía cantidades al fusionar el de invitado
docs: explicar por qué el stock se descuenta con UPDATE condicional
refactor: mover el CRUD de categorías a la capa de servicios
test: cubrir los ciclos en el árbol de categorías
chore: actualizar dependencias
```

El cuerpo explica **por qué**, no qué. El qué ya está en el diff.

## Qué se espera de un pull request

- Que sea de una sola cosa. Un PR que arregla un fallo _y_ refactoriza _y_
  añade una función es tres PR disfrazados de uno.
- Que las pruebas nuevas se hayan validado viéndolas fallar. Deshaz la
  corrección un momento y comprueba que la prueba lo detecta; si pasa
  igual, no está probando lo que crees.
- Capturas, si el cambio se ve.
- Documentación al día. Si cambias una decisión de
  [`docs/DECISIONES.md`](docs/DECISIONES.md), actualízala en el mismo PR.

## Código de conducta

Al participar aceptas el [código de conducta](CODE_OF_CONDUCT.md).
