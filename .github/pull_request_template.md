## Qué cambia

<!-- Una o dos frases. El porqué importa más que el qué. -->

## Por qué

<!-- Qué problema resuelve. Si corrige un fallo, cómo se reproducía. -->

## Cómo se verificó

<!-- No basta con "compila". Di qué ejecutaste y qué viste. -->

- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run test`
- [ ] `npm run build`
- [ ] `npm run audit:repo`

## Comprobaciones del proyecto

<!-- Marca solo lo que aplique; borra el resto. -->

- [ ] Ninguna consulta a Prisma fuera de `lib/services/`
- [ ] Toda Server Action de administración empieza por `requireRole()`
- [ ] Los importes nuevos usan `Decimal`, no `number`
- [ ] Los `Decimal` que cruzan al cliente van convertidos a texto
- [ ] Las funciones nuevas tienen pantalla de administración
- [ ] Las pruebas nuevas se validaron viéndolas fallar

## Capturas

<!-- Obligatorias si el cambio se ve. Antes y después si es un rediseño. -->
