# Iteración 2 · RESULTADOS

Se ejecutan las pruebas de usuarios (iteración 1) y las de juegos, y todas pasan.

Salida de las pruebas (Node v26.8.1):

```text
▶ Iteración 2: juegos
  ✔ criterio 1: el admin crea un juego y recibe 201 con sus datos (243.679804ms)
  ✔ criterio 2: un jugador no puede crear, modificar ni borrar (403) (211.900457ms)
  ✔ criterio 3: sin token todas las rutas de juegos devuelven 401 (208.080907ms)
  ✔ criterio 4: crear con datos inválidos devuelve 400 (212.116824ms)
  ✔ criterio 5: un nombre repetido al crear o al modificar devuelve 409 (208.902209ms)
  ✔ criterio 6: GET /juegos/:id devuelve el juego con el campo ultimasApuestas (206.727767ms)
  ✔ criterio 7: un id inexistente o no numérico devuelve 404 (211.612447ms)
  ✔ criterio 8: el listado viene paginado con datos, pagina, limite y total (215.260515ms)
  ✔ criterio 9: ?q= busca en nombre y descripción sin distinguir mayúsculas (208.40232ms)
  ✔ criterio 10: pagina o limite inválidos devuelven 400 (217.833725ms)
  ✔ criterio 11: PATCH cambia solo lo que se envía, y uno vacío devuelve 400 (207.479449ms)
  ✔ criterio 12: el admin borra un juego (204) y después da 404 (205.577949ms)
✔ Iteración 2: juegos (2559.365116ms)
▶ Iteración 1: usuarios y autenticación
  ✔ criterio 1: registro válido devuelve 201 con el perfil (rol jugador, saldo 100) y sin contraseña (73.767566ms)
  ✔ criterio 2: registro con datos inválidos devuelve 400 (10.445388ms)
  ✔ criterio 3: registro con un email repetido devuelve 409 (aunque cambien las mayúsculas) (103.096932ms)
  ✔ criterio 4: la contraseña se guarda cifrada con bcrypt y no en claro (52.672416ms)
  ✔ criterio 5: login correcto devuelve 200 con un token JWT (104.790752ms)
  ✔ criterio 6: login con contraseña incorrecta o email inexistente devuelve 401 con el mismo mensaje (103.172935ms)
  ✔ criterio 7: GET /usuarios/me con token devuelve mi perfil (104.538168ms)
  ✔ criterio 8: sin token, con token mal formado o con firma falsa devuelve 401 (105.331928ms)
  ✔ criterio 9: PATCH /usuarios/me cambia el nombre y el cambio queda guardado (106.133654ms)
  ✔ criterio 10: tras cambiar la contraseña, la nueva sirve para el login y la antigua da 401 (254.410467ms)
  ✔ criterio 11: PATCH vacío o inválido devuelve 400 y rol, saldo y email no se pueden cambiar (106.257265ms)
  ✔ criterio 12: el email de administrador se registra con rol admin (51.357628ms)
  ✔ criterio 13: los datos persisten en un fichero SQLite (103.691098ms)
✔ Iteración 1: usuarios y autenticación (1281.252355ms)
ℹ tests 25
ℹ suites 2
ℹ pass 25
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 2678.038117
```

## Criterios cubiertos

Los 12 criterios de la SPEC tienen una prueba en `test/juegos.test.js`.

## Decisiones tomadas

- Todas las rutas de `/juegos` necesitan sesión, también las de lectura, para poder mostrar después las apuestas del propio usuario en `GET /juegos/:id`.
- Orden de comprobaciones: 401, 403, 404, 400 y 409.
- La búsqueda usa `instr(lower(...))` para que `%` y `_` se busquen como texto normal.
- `ultimasApuestas` ya existe en la respuesta (vacía) para no cambiar el formato en la iteración 3.
