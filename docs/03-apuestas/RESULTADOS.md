# Iteración 3 · RESULTADOS

Es la salida completa de `npm test`: las pruebas de las tres iteraciones.

Salida de las pruebas (Node v26.8.1):

```text
▶ Iteración 3: apuestas
  ✔ criterio 1: una apuesta válida devuelve 201 con importe, elección, resultado, ganada y saldo (506.611345ms)
  ✔ criterio 2: si el jugador acierta, el saldo sube en el importe (533.672454ms)
  ✔ criterio 3: si el jugador falla, el saldo baja en el importe (408.531982ms)
  ✔ criterio 4: el resultado lo decide el servidor, el cliente no puede forzarlo (307.869769ms)
  ✔ criterio 5: apostar más de lo que se tiene devuelve 409 y no cambia nada (309.58037ms)
  ✔ criterio 6: el saldo nunca es negativo: si pierde todo queda en 0 y la siguiente apuesta da 409 (311.021346ms)
  ✔ criterio 7: datos inválidos devuelven 400 (316.370698ms)
  ✔ criterio 8: un juego inexistente devuelve 404 y sin token devuelve 401 (309.305645ms)
  ✔ criterio 9: el listado solo trae mis apuestas, paginadas y con total (314.860392ms)
  ✔ criterio 10: GET /juegos/:id incluye mis 5 últimas apuestas, la más reciente primero (314.674403ms)
  ✔ criterio 11: borrar una apuesta mía devuelve 204, desaparece y el saldo no cambia (312.444948ms)
  ✔ criterio 12: la apuesta de otro jugador no se puede borrar (404) y sigue existiendo (309.322758ms)
  ✔ criterio 13: un juego que ya tiene apuestas no se puede borrar (409) (309.227008ms)
✔ Iteración 3: apuestas (4565.436135ms)
▶ Iteración 2: juegos
  ✔ criterio 1: el admin crea un juego y recibe 201 con sus datos (386.187567ms)
  ✔ criterio 2: un jugador no puede crear, modificar ni borrar (403) (210.29883ms)
  ✔ criterio 3: sin token todas las rutas de juegos devuelven 401 (207.993453ms)
  ✔ criterio 4: crear con datos inválidos devuelve 400 (214.380973ms)
  ✔ criterio 5: un nombre repetido al crear o al modificar devuelve 409 (207.878748ms)
  ✔ criterio 6: GET /juegos/:id devuelve el juego con el campo ultimasApuestas (216.708012ms)
  ✔ criterio 7: un id inexistente o no numérico devuelve 404 (221.601808ms)
  ✔ criterio 8: el listado viene paginado con datos, pagina, limite y total (216.74998ms)
  ✔ criterio 9: ?q= busca en nombre y descripción sin distinguir mayúsculas (219.550337ms)
  ✔ criterio 10: pagina o limite inválidos devuelven 400 (209.711107ms)
  ✔ criterio 11: PATCH cambia solo lo que se envía, y uno vacío devuelve 400 (214.987091ms)
  ✔ criterio 12: el admin borra un juego (204) y después da 404 (206.733728ms)
✔ Iteración 2: juegos (2734.560646ms)
▶ Iteración 1: usuarios y autenticación
  ✔ criterio 1: registro válido devuelve 201 con el perfil (rol jugador, saldo 100) y sin contraseña (122.44413ms)
  ✔ criterio 2: registro con datos inválidos devuelve 400 (14.947109ms)
  ✔ criterio 3: registro con un email repetido devuelve 409 (aunque cambien las mayúsculas) (159.993889ms)
  ✔ criterio 4: la contraseña se guarda cifrada con bcrypt y no en claro (70.771121ms)
  ✔ criterio 5: login correcto devuelve 200 con un token JWT (109.611351ms)
  ✔ criterio 6: login con contraseña incorrecta o email inexistente devuelve 401 con el mismo mensaje (104.644127ms)
  ✔ criterio 7: GET /usuarios/me con token devuelve mi perfil (105.284168ms)
  ✔ criterio 8: sin token, con token mal formado o con firma falsa devuelve 401 (106.544123ms)
  ✔ criterio 9: PATCH /usuarios/me cambia el nombre y el cambio queda guardado (106.322648ms)
  ✔ criterio 10: tras cambiar la contraseña, la nueva sirve para el login y la antigua da 401 (257.20328ms)
  ✔ criterio 11: PATCH vacío o inválido devuelve 400 y rol, saldo y email no se pueden cambiar (107.353663ms)
  ✔ criterio 12: el email de administrador se registra con rol admin (51.714999ms)
  ✔ criterio 13: los datos persisten en un fichero SQLite (104.417381ms)
✔ Iteración 1: usuarios y autenticación (1423.322094ms)
ℹ tests 38
ℹ suites 3
ℹ pass 38
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 4703.246942
```

## Criterios cubiertos

Los 13 criterios de la SPEC tienen una prueba en `test/apuestas.test.js`.

## Decisiones tomadas

- El azar se pasa a la app como parámetro para que las pruebas sean deterministas.
- Borrar una apuesta solo limpia el historial: no devuelve saldo.
- La apuesta de otro jugador responde 404 en vez de 403, para no revelar que existe.
- El saldo está protegido dos veces: la comprobación del código (409) y `CHECK (saldo >= 0)` en la tabla.
- Un juego con apuestas no se puede borrar (409) para conservar el historial.
