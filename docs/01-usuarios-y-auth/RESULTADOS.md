# Iteración 1 · RESULTADOS

En esta iteración solo existen las pruebas de usuarios y autenticación.

Salida de las pruebas (Node v26.8.1):

```text
▶ Iteración 1: usuarios y autenticación
  ✔ criterio 1: registro válido devuelve 201 con el perfil (rol jugador, saldo 100) y sin contraseña (101.207916ms)
  ✔ criterio 2: registro con datos inválidos devuelve 400 (13.404693ms)
  ✔ criterio 3: registro con un email repetido devuelve 409 (aunque cambien las mayúsculas) (143.156452ms)
  ✔ criterio 4: la contraseña se guarda cifrada con bcrypt y no en claro (73.939669ms)
  ✔ criterio 5: login correcto devuelve 200 con un token JWT (145.858043ms)
  ✔ criterio 6: login con contraseña incorrecta o email inexistente devuelve 401 con el mismo mensaje (114.446437ms)
  ✔ criterio 7: GET /usuarios/me con token devuelve mi perfil (105.115502ms)
  ✔ criterio 8: sin token, con token mal formado o con firma falsa devuelve 401 (105.796951ms)
  ✔ criterio 9: PATCH /usuarios/me cambia el nombre y el cambio queda guardado (106.212211ms)
  ✔ criterio 10: tras cambiar la contraseña, la nueva sirve para el login y la antigua da 401 (252.812507ms)
  ✔ criterio 11: PATCH vacío o inválido devuelve 400 y rol, saldo y email no se pueden cambiar (106.781449ms)
  ✔ criterio 12: el email de administrador se registra con rol admin (51.824445ms)
  ✔ criterio 13: los datos persisten en un fichero SQLite (103.624713ms)
✔ Iteración 1: usuarios y autenticación (1426.09421ms)
ℹ tests 13
ℹ suites 1
ℹ pass 13
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1556.952436
```

## Criterios cubiertos

Los 13 criterios de la SPEC tienen una prueba en `test/usuarios.test.js`.

## Decisiones tomadas

- El rol de administrador se asigna por `ADMIN_EMAIL` al registrarse.
- El token solo guarda el id del usuario; el rol y el saldo se leen siempre de la base de datos.
- El login devuelve el mismo `401` si falla el email o la contraseña.
