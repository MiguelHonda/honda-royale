# Iteración 2 · RESULTADOS

Salida real de `npm test` (Node v26.8.1). Incluye también las pruebas de las iteraciones anteriores, que siguen pasando:

```text
✔ [CA2.1] el admin crea un juego → 201 con sus campos (329.028395ms)
✔ [CA2.2] un jugador no puede crear, modificar ni borrar → 403 (217.813554ms)
✔ [CA2.3] sin token, las rutas de /juegos dan 401 (211.846229ms)
✔ [CA2.4] crear con datos inválidos → 400 (235.736189ms)
✔ [CA2.5] nombre repetido al crear o al modificar → 409 (211.217317ms)
✔ [CA2.6] GET /juegos/:id devuelve el juego con ultimasApuestas (210.28822ms)
✔ [CA2.7] id inexistente o no numérico → 404 en GET, PATCH y DELETE (212.391623ms)
✔ [CA2.8] el listado es paginado: datos, pagina, limite y total (220.083829ms)
✔ [CA2.9] ?q= busca en nombre y descripción sin distinguir mayúsculas (225.21768ms)
✔ [CA2.10] pagina o limite inválidos → 400 (217.293985ms)
✔ [CA2.11] PATCH parcial cambia solo lo enviado; vacío → 400 (215.281001ms)
✔ [CA2.12] DELETE del admin → 204 y después 404 (204.87749ms)
✔ [CA1.1] registro válido → 201, perfil con rol jugador y saldo 100, sin contraseña (108.941872ms)
✔ [CA1.2] registro con datos inválidos → 400 (18.475803ms)
✔ [CA1.3] registro con email repetido (aunque cambien las mayúsculas) → 409 (144.591634ms)
✔ [CA1.4] la contraseña se guarda como hash bcrypt, no en claro (71.385445ms)
✔ [CA1.5] login correcto → 200 con un token JWT firmado por el servidor (120.808148ms)
✔ [CA1.6] login con contraseña mala o email inexistente → 401 con el mismo mensaje (117.42937ms)
✔ [CA1.7] GET /usuarios/me con token → 200 con mi perfil (105.57641ms)
✔ [CA1.8] sin token, token mal formado o con firma falsa → 401 (105.347184ms)
✔ [CA1.9] PATCH /usuarios/me cambia el nombre y queda guardado (119.319718ms)
✔ [CA1.10] PATCH con password nueva: la nueva sirve y la antigua da 401 (255.133446ms)
✔ [CA1.11] PATCH vacío o inválido → 400; rol, saldo y email se ignoran (106.467219ms)
✔ [CA1.12] el email de ADMIN_EMAIL se registra con rol admin (51.357221ms)
✔ [CA1.13] los datos persisten en un fichero SQLite (103.474804ms)
ℹ tests 25
ℹ suites 0
ℹ pass 25
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 2866.917389
```

## Criterios cubiertos

| Criterio | Prueba |
|---|---|
| CA2.1 – CA2.12 | Un test por criterio en `test/juegos.test.js` (el nombre empieza por `[CA2.x]`) |

## Decisiones tomadas

- Todas las rutas de `/juegos` exigen sesión, incluidas las de lectura, para poder mostrar después las apuestas *del usuario* en `GET /juegos/:id`.
- Orden de comprobaciones: 401 → 403 → 404 → 400 → 409.
- La búsqueda usa `instr(lower(...))` en vez de `LIKE` para que `%` y `_` se busquen como texto normal.
- `ultimasApuestas` ya existe en la respuesta (vacía) para no cambiar el formato en la iteración 3.
