# Política de seguridad

## Reportar una vulnerabilidad

**No abras un issue público.** Un issue con los detalles de una
vulnerabilidad la convierte en pública antes de que exista arreglo, y
expone a todos los que ya desplegaron la plantilla.

Usa el aviso de seguridad privado de GitHub:
[Reportar una vulnerabilidad](https://github.com/ByManu3l/PACANDE/security/advisories/new)

Incluye, en la medida en que lo tengas:

- Qué se puede conseguir con ella (leer datos ajenos, elevar privilegios,
  alterar precios…).
- Los pasos para reproducirla.
- La versión o el commit afectado.

Respondemos en un plazo de 7 días. Si la vulnerabilidad se confirma, se
publica el arreglo y después el aviso, con crédito a quien la reportó
salvo que prefiera lo contrario.

## Versiones con soporte

Solo la última versión publicada. Es una plantilla: cada proyecto que
parte de ella la bifurca y se responsabiliza de su propio despliegue.

## Alcance

**Sí entra:** cualquier fallo en el código de esta plantilla — control de
acceso, integridad de los pedidos, manejo de sesiones, subida de
archivos, inyección.

**No entra:**

- Configuraciones inseguras de un despliegue concreto (`AUTH_SECRET` de
  ejemplo en producción, base de datos abierta a internet). Ver la lista
  de verificación de [`docs/PERSONALIZACION.md`](docs/PERSONALIZACION.md).
- Vulnerabilidades de dependencias sin camino de explotación real en este
  proyecto. `docs/AUDITORIA.md` explica por qué las que reporta `npm
audit` hoy no son alcanzables.
- La pasarela de pago simulada. **No es segura y no pretende serlo**: es
  una demostración, y sustituirla es responsabilidad de quien despliega.

## Lo que la plantilla ya hace por ti

Para que sepas con qué cuentas, y con qué no:

| Protección                                    | Estado                                                           |
| --------------------------------------------- | ---------------------------------------------------------------- |
| Contraseñas con bcrypt (coste 10)             | Sí                                                               |
| Permisos verificados en cada Server Action    | Sí — el filtro de rutas no basta y no se usa como única barrera  |
| Precios recalculados en el servidor           | Sí — el navegador nunca envía importes                           |
| Stock descontado de forma atómica             | Sí — no se puede vender inventario inexistente                   |
| Datos de tarjeta fuera del servidor           | Sí — nunca llegan al backend                                     |
| Login de tiempo constante                     | Sí — no se pueden enumerar correos                               |
| Rutas de archivo validadas                    | Sí — sin recorrido de directorios                                |
| Validación en servidor con el mismo esquema   | Sí                                                               |
| Errores internos ocultos al usuario           | Sí                                                               |
| Cabeceras de seguridad (CSP, HSTS, …)         | Sí — definidas y comentadas en `next.config.ts`                  |
| Valores sensibles filtrados de los registros  | Sí — por nombre de clave, en `lib/logger.ts`                     |
| Límite de intentos (acceso, registro, compra) | Sí — 5 accesos por cuarto de hora; ver `lib/rate-limit.ts`       |
| Verificación de correo                        | **No** — requiere un proveedor de correo que elige cada proyecto |
| Segundo factor                                | **No**                                                           |

Las dos últimas son ausencias conocidas y deliberadas, no descuidos. Si
tu caso las necesita, están documentadas como ampliación en
[`docs/AUDITORIA.md`](docs/AUDITORIA.md).
