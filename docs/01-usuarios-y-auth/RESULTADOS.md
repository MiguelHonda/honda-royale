# Iteración 1 · RESULTADOS

Salida real de `npm test` (Node v26.8.1):

```text
✔ [CA1.1] registro válido → 201, perfil con rol jugador y saldo 100, sin contraseña (106.980444ms)
✔ [CA1.2] registro con datos inválidos → 400 (11.357991ms)
✔ [CA1.3] registro con email repetido (aunque cambien las mayúsculas) → 409 (149.156532ms)
✔ [CA1.4] la contraseña se guarda como hash bcrypt, no en claro (75.245663ms)
✔ [CA1.5] login correcto → 200 con un token JWT firmado por el servidor (132.275403ms)
✔ [CA1.6] login con contraseña mala o email inexistente → 401 con el mismo mensaje (103.603004ms)
✔ [CA1.7] GET /usuarios/me con token → 200 con mi perfil (105.00324ms)
✔ [CA1.8] sin token, token mal formado o con firma falsa → 401 (105.873917ms)
✔ [CA1.9] PATCH /usuarios/me cambia el nombre y queda guardado (105.697047ms)
✔ [CA1.10] PATCH con password nueva: la nueva sirve y la antigua da 401 (255.09098ms)
✔ [CA1.11] PATCH vacío o inválido → 400; rol, saldo y email se ignoran (108.247124ms)
✔ [CA1.12] el email de ADMIN_EMAIL se registra con rol admin (52.45247ms)
✔ [CA1.13] los datos persisten en un fichero SQLite (104.956426ms)
ℹ tests 13
ℹ suites 0
ℹ pass 13
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1548.291944
```

## Criterios cubiertos

| Criterio | Prueba |
|---|---|
| CA1.1 – CA1.13 | Un test por criterio en `test/usuarios.test.js` (el nombre empieza por `[CA1.x]`) |

## Decisiones tomadas

- El rol de administrador se asigna por `ADMIN_EMAIL` al registrarse; es la forma más simple de tener un admin sin scripts.
- El token solo guarda el id del usuario; el rol y el saldo se leen siempre de la base de datos.
- El login devuelve el mismo `401` si falla el email o la contraseña.
