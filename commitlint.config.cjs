/**
 * Convención de mensajes de commit (Conventional Commits).
 *
 * La aplica el gancho `commit-msg` de husky. El motivo no es estético: el
 * prefijo es lo que permite generar el CHANGELOG y deducir el siguiente
 * número de versión sin leer cada commit a mano.
 */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // El cuerpo del commit explica el porqué y a menudo incluye ejemplos
    // de código o salidas de consola; limitarlo a 100 columnas obligaría
    // a partirlos de forma ilegible.
    'body-max-line-length': [0, 'always'],
    'footer-max-line-length': [0, 'always'],
    // El asunto en español no lleva mayúscula inicial forzada ni punto
    // final, pero sí debe existir y ser breve.
    'subject-case': [0, 'always'],
    'header-max-length': [2, 'always', 100],
  },
};
