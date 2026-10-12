# Iteración 3 · RESULTADOS

Salida real de `npm test` (Node v26.8.1). Incluye también las pruebas de las iteraciones anteriores, que siguen pasando:

```text
✔ [CA3.1] apuesta válida → 201 con importe, elección, resultado, ganada y saldo (437.804231ms)
✔ [CA3.2] si acierta, el saldo sube en el importe (310.337405ms)
✔ [CA3.3] si falla, el saldo baja en el importe (309.353977ms)
✔ [CA3.4] el resultado lo decide el servidor: el body no puede forzarlo (311.962623ms)
✔ [CA3.5] apostar más de lo que se tiene → 409, sin cambiar saldo ni guardar la apuesta (310.472534ms)
✔ [CA3.6] el saldo nunca es negativo: perder todo deja 0 y la siguiente apuesta da 409 (310.947355ms)
✔ [CA3.7] datos inválidos → 400 (313.224462ms)
✔ [CA3.8] juego inexistente → 404; sin token → 401 (309.448546ms)
✔ [CA3.9] el listado solo trae mis apuestas, paginadas y con total (312.673381ms)
✔ [CA3.10] GET /juegos/:id incluye mis 5 últimas apuestas, la más reciente primero (315.284103ms)
✔ [CA3.11] borrar una apuesta mía → 204, desaparece y el saldo no cambia (309.890991ms)
✔ [CA3.12] la apuesta de otro jugador no se puede borrar (404) y sigue existiendo (308.384532ms)
✔ [CA3.13] borrar un juego que ya tiene apuestas → 409 (308.96274ms)
✔ [CA2.1] el admin crea un juego → 201 con sus campos (339.525392ms)
✔ [CA2.2] un jugador no puede crear, modificar ni borrar → 403 (239.007933ms)
✔ [CA2.3] sin token, las rutas de /juegos dan 401 (215.74366ms)
✔ [CA2.4] crear con datos inválidos → 400 (244.359369ms)
✔ [CA2.5] nombre repetido al crear o al modificar → 409 (226.652568ms)
✔ [CA2.6] GET /juegos/:id devuelve el juego con ultimasApuestas (228.101991ms)
✔ [CA2.7] id inexistente o no numérico → 404 en GET, PATCH y DELETE (289.364176ms)
✔ [CA2.8] el listado es paginado: datos, pagina, limite y total (233.424553ms)
✔ [CA2.9] ?q= busca en nombre y descripción sin distinguir mayúsculas (213.283216ms)
✔ [CA2.10] pagina o limite inválidos → 400 (212.73975ms)
✔ [CA2.11] PATCH parcial cambia solo lo enviado; vacío → 400 (216.719907ms)
✔ [CA2.12] DELETE del admin → 204 y después 404 (220.205149ms)
✔ [CA1.1] registro válido → 201, perfil con rol jugador y saldo 100, sin contraseña (134.167665ms)
✔ [CA1.2] registro con datos inválidos → 400 (15.032419ms)
✔ [CA1.3] registro con email repetido (aunque cambien las mayúsculas) → 409 (206.384217ms)
✔ [CA1.4] la contraseña se guarda como hash bcrypt, no en claro (85.705543ms)
✔ [CA1.5] login correcto → 200 con un token JWT firmado por el servidor (184.860211ms)
✔ [CA1.6] login con contraseña mala o email inexistente → 401 con el mismo mensaje (199.809144ms)
✔ [CA1.7] GET /usuarios/me con token → 200 con mi perfil (123.669823ms)
✔ [CA1.8] sin token, token mal formado o con firma falsa → 401 (141.795482ms)
✔ [CA1.9] PATCH /usuarios/me cambia el nombre y queda guardado (145.085939ms)
✔ [CA1.10] PATCH con password nueva: la nueva sirve y la antigua da 401 (313.717687ms)
✔ [CA1.11] PATCH vacío o inválido → 400; rol, saldo y email se ignoran (110.561866ms)
✔ [CA1.12] el email de ADMIN_EMAIL se registra con rol admin (53.922972ms)
✔ [CA1.13] los datos persisten en un fichero SQLite (105.380321ms)
ℹ tests 38
ℹ suites 0
ℹ pass 38
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 4328.926317
```

## Criterios cubiertos

| Criterio | Prueba |
|---|---|
| CA3.1 – CA3.13 | Un test por criterio en `test/apuestas.test.js` (el nombre empieza por `[CA3.x]`) |

## Decisiones tomadas

- El azar se inyecta (`crearApp({ azar })`) para que las pruebas sean deterministas.
- Borrar una apuesta solo limpia el historial: no devuelve saldo, para que nadie pueda "deshacer" una pérdida.
- Las apuestas de otros jugadores se tratan como inexistentes (404) en vez de 403, para no revelar que existen.
- El saldo está protegido dos veces: comprobación en el código (409) y `CHECK (saldo >= 0)` en la tabla.
- Un juego con apuestas no se puede borrar (409) para conservar el historial.
