# Iteración 1 · RESULTADOS

En esta iteración solo existen las pruebas de usuarios y autenticación.

Salida de las pruebas (Node v26.8.1):

```text
(eval):3: command not found: node --disable-warning=ExperimentalWarning --test --test-reporter=spec
```

## Criterios cubiertos

Los 13 criterios de la SPEC tienen una prueba en `test/usuarios.test.js`.

## Decisiones tomadas

- El rol de administrador se asigna por `ADMIN_EMAIL` al registrarse.
- El token solo guarda el id del usuario; el rol y el saldo se leen siempre de la base de datos.
- El login devuelve el mismo `401` si falla el email o la contraseña.
