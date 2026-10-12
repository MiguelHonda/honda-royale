# Honda Royale mínimo · Explicación para estudiantes

Es un backend (solo API, sin pantallas) de un casino con **saldo virtual**. Se puede registrar gente, entrar con usuario y contraseña,
ver juegos y apostar a **cara o cruz**. Todo se guarda en una base de datos SQLite.

## 1. Cómo ejecutarlo

```bash
npm install
npm test        # 38 pruebas, no necesita configuración
npm start       # http://localhost:3000  (crea el fichero datos.sqlite la primera vez)
```

Variables opcionales: `PORT` (3000), `JWT_SECRET` (secreto del token), `ADMIN_EMAIL` (por defecto `admin@casino.es`), `BD_RUTA` (por defecto `datos.sqlite`).

Para probarlo a mano con `curl`:

```bash
# 1. Registrarse (el email admin@casino.es se registra como administrador)
curl -X POST localhost:3000/auth/register -H 'Content-Type: application/json' \
     -d '{"email":"admin@casino.es","nombre":"Jefe","password":"clave-123"}'
# 2. Login: devuelve {"token":"..."}
curl -X POST localhost:3000/auth/login -H 'Content-Type: application/json' \
     -d '{"email":"admin@casino.es","password":"clave-123"}'
# 3. Usar el token en las demás peticiones
curl -X POST localhost:3000/juegos -H 'Content-Type: application/json' -H "Authorization: Bearer $TOKEN" \
     -d '{"nombre":"Mesa 1","apuesta_max":50}'
curl -X POST localhost:3000/juegos/1/apuestas -H 'Content-Type: application/json' -H "Authorization: Bearer $TOKEN" \
     -d '{"importe":10,"eleccion":"cara"}'
```

## 2. Qué hace cada archivo

| Archivo | Qué hace |
|---|---|
| `src/server.js` | Arranca el servidor en un puerto. Son 3 líneas. |
| `src/app.js` | Crea la aplicación Express: activa la lectura de JSON, monta las rutas de cada tema y define qué responder si algo falla (404 y 500). **No** abre el puerto, por eso las pruebas pueden usarlo directamente. |
| `src/db.js` | Abre la base SQLite y crea las 3 tablas (`usuarios`, `juegos`, `apuestas`) si no existen. |
| `src/auth.js` | Todo lo del JWT: `crearToken` (en el login), `autenticar` (comprueba el token en cada petición protegida) y `soloAdmin` (exige rol admin). |
| `src/util.js` | Tres funciones pequeñas: leer `?pagina=&limite=`, convertir un `:id` de la URL en número y convertir `ganada` de 0/1 a booleano. |
| `src/usuarios.js` | Rutas `/auth/register`, `/auth/login` y `/usuarios/me`, con su lógica dentro. |
| `src/juegos.js` | Rutas `/juegos` (listar con búsqueda y paginación, ver uno, crear, modificar, borrar). |
| `src/apuestas.js` | Rutas `/juegos/:id/apuestas` (apostar, listar mis apuestas, borrar una). |
| `test/*.test.js` | Una prueba por criterio de la SPEC; hay un archivo por iteración. |
| `docs/` | Documentación SDD: `SPEC.md` (qué), `PLAN.md` (cómo) y `RESULTADOS.md` (salida real de `npm test`) por iteración. |

Qué es cada "tema" y por qué hay 3 iteraciones: primero usuarios (porque todo lo demás necesita saber *quién* eres),
luego juegos (el recurso principal) y por último apuestas (el recurso secundario, que depende de usuarios y de juegos).

## 3. El recorrido de una petición

Ejemplo: `POST /juegos/1/apuestas` con el body `{"importe": 10, "eleccion": "cara"}` y la cabecera `Authorization: Bearer <token>`.

```text
Cliente (curl / supertest)
   │  petición HTTP
   ▼
app.js ── express.json() convierte el body en un objeto JS (req.body)
   │
   ▼
apuestas.js ── router.use('/juegos/:id/apuestas', autenticar(bd))      ← 1. ¿quién eres?
   │              auth.js: lee el token, comprueba la firma, carga al usuario en req.usuario
   ▼
apuestas.js ── router.post('/juegos/:id/apuestas', ...)               ← 2. la lógica
   │   a) busca el juego en la base            → si no existe: 404
   │   b) valida importe y eleccion            → si están mal: 400
   │   c) lee el saldo del usuario             → si importe > saldo: 409
   │   d) lanza la moneda con azar()           (decide el servidor)
   │   e) BEGIN; INSERT apuesta; UPDATE saldo; COMMIT
   ▼
db.js (SQLite) ── tablas apuestas y usuarios                          ← 3. datos
   │
   ▼
res.status(201).json({...})  → vuelve al cliente
```

La idea importante: **no hay capas separadas**. La ruta recibe la petición, valida, aplica la regla de negocio y habla con SQLite
en la misma función. Es más corto y, para este tamaño, más fácil de seguir.

Los códigos de error siguen siempre este orden: 401 (no sé quién eres) → 403 (no tienes permiso) → 404 (no existe) → 400 (datos mal) → 409 (conflicto con el estado actual, p. ej. saldo insuficiente).

## 4. Cómo funciona el JWT

Un **JWT** es un texto con tres partes separadas por puntos: `cabecera.contenido.firma`. El contenido (payload) va codificado, **no cifrado**:
cualquiera puede leerlo, pero nadie puede cambiarlo sin que la firma deje de ser válida.

| Pregunta | Respuesta |
|---|---|
| **¿Quién lo crea?** | El **servidor**, en `POST /auth/login`, con `crearToken` (`src/auth.js`) y `jwt.sign(...)`. Solo lo hace si el email existe y la contraseña coincide con el hash de bcrypt. |
| **¿Qué lleva?** | El id del usuario (`sub`) y la fecha de caducidad (1 hora). Nada de contraseñas, rol ni saldo. |
| **¿Con qué se firma?** | Con `JWT_SECRET`, un secreto que solo conoce el servidor. |
| **¿Dónde se envía?** | El cliente lo manda en **cada** petición protegida en la cabecera `Authorization: Bearer <token>`. |
| **¿Cómo se comprueba?** | `autenticar` (`src/auth.js`) separa `Bearer` y el token, llama a `jwt.verify` (que revisa la firma y la caducidad) y busca al usuario por su id en la base de datos. Si falta el token, está mal firmado, caducó o el usuario ya no existe → `401`. |
| **¿Y los permisos?** | Tras `autenticar`, `req.usuario.rol` viene de la base de datos. `soloAdmin` responde `403` si no es `admin`. |

Por qué se vuelve a leer el usuario de la base de datos: así el rol y el saldo son siempre los actuales, y un token no puede darte un rol que no tienes.

Las contraseñas **no** van en el token ni se guardan en claro: se guarda el hash de `bcryptjs` y, en el login, `bcrypt.compare` verifica la contraseña contra ese hash.

## 5. Qué prueba cada test

Cada nombre de test empieza por el criterio de la SPEC (`[CA1.5]`…). Se ejecutan con `npm test`.
Cada test crea su propia base de datos en memoria, así que no se influyen entre sí.

### `test/usuarios.test.js` (iteración 1)

| Test | Qué comprueba |
|---|---|
| CA1.1 | Registrarse devuelve 201 con rol `jugador`, saldo 100 y **sin** contraseña en la respuesta. |
| CA1.2 | Email sin formato, nombre vacío, contraseña corta, campos que faltan y JSON roto → 400. |
| CA1.3 | Registrar dos veces el mismo email (aunque cambien mayúsculas) → 409. |
| CA1.4 | En la base se guarda un hash que empieza por `$2…` y no la contraseña. |
| CA1.5 | El login devuelve un token con 3 partes y con el id del usuario dentro. |
| CA1.6 | Contraseña mala o email inexistente → 401 con el mismo mensaje. |
| CA1.7 | `GET /usuarios/me` con token devuelve mi perfil. |
| CA1.8 | Sin token, token basura o firmado con otro secreto → 401. |
| CA1.9 | `PATCH` cambia el nombre y se mantiene al volver a pedir el perfil. |
| CA1.10 | Tras cambiar la contraseña, la nueva entra y la vieja da 401. |
| CA1.11 | `PATCH` vacío o inválido → 400; mandar `rol`, `saldo` o `email` no cambia nada. |
| CA1.12 | El email `admin@casino.es` se registra con rol `admin`. |
| CA1.13 | Con un fichero SQLite real, el usuario sigue existiendo al "reiniciar" (abrir otra app sobre el mismo fichero). |

### `test/juegos.test.js` (iteración 2)

| Test | Qué comprueba |
|---|---|
| CA2.1 | El admin crea un juego (201) y la apuesta máxima por defecto es 100. |
| CA2.2 | Un jugador corriente recibe 403 al crear, modificar o borrar. |
| CA2.3 | Sin token, todas las rutas de juegos dan 401. |
| CA2.4 | Nombre vacío o `apuesta_max` no entera/positiva → 400. |
| CA2.5 | Nombre duplicado al crear o modificar → 409 (conservar el propio nombre no es conflicto). |
| CA2.6 | `GET /juegos/:id` devuelve el juego con `ultimasApuestas`. |
| CA2.7 | Id inexistente o no numérico → 404 en GET, PATCH y DELETE. |
| CA2.8 | El listado pagina bien: 10 por página, página 2 con los restantes, `limite` personalizado y `total`. |
| CA2.9 | `?q=` busca en nombre y descripción sin mayúsculas, y un `%` se busca como texto literal. |
| CA2.10 | `pagina=0`, negativa, texto, `limite=0`, `limite=51` → 400. |
| CA2.11 | `PATCH` parcial solo cambia lo enviado; vacío o inválido → 400. |
| CA2.12 | El admin borra (204) y después el juego da 404. |

### `test/apuestas.test.js` (iteración 3)

El azar está controlado: `0.1` hace que salga cara y `0.9` que salga cruz.

| Test | Qué comprueba |
|---|---|
| CA3.1 | Una apuesta válida devuelve 201 con resultado, `ganada` y saldo nuevo. |
| CA3.2 | Acertar suma el importe al saldo. |
| CA3.3 | Fallar resta el importe del saldo. |
| CA3.4 | Mandar `resultado`, `ganada` o `saldo` en el body no sirve de nada. |
| CA3.5 | Apostar más de lo que tienes → 409, el saldo no cambia y no queda apuesta guardada. |
| CA3.6 | Perder todo deja el saldo en 0 (nunca negativo) y la siguiente apuesta da 409. |
| CA3.7 | Importe 0, negativo, decimal, texto, elección inválida o por encima de `apuesta_max` → 400. |
| CA3.8 | Juego inexistente → 404; sin token → 401 en apostar, listar y borrar. |
| CA3.9 | El listado solo trae mis apuestas (no las de otros), la más reciente primero y paginado. |
| CA3.10 | `GET /juegos/:id` trae solo mis 5 últimas apuestas de ese juego, en orden. |
| CA3.11 | Borrar mi apuesta → 204, desaparece y el saldo queda igual. |
| CA3.12 | La apuesta de otro jugador no se puede borrar (404) y sigue existiendo. |
| CA3.13 | Un juego con apuestas no se puede borrar (409). |

## 6. Decisiones que conviene saber (y que se pueden defender en la práctica)

- **Admin por `ADMIN_EMAIL`**: la forma más simple de tener un admin sin scripts. En un sistema real habría que protegerlo mejor (quien registre antes ese email sería admin).
- **Borrar una apuesta no devuelve saldo**: si lo hiciera, bastaría con borrar las apuestas perdidas para recuperar el dinero.
- **404 en vez de 403** para apuestas ajenas: no se revela que existen.
- **Saldo protegido dos veces**: comprobación en el código y `CHECK (saldo >= 0)` en la tabla.
- **Transacción al apostar**: guardar la apuesta y cambiar el saldo son una sola operación; si falla una, se deshace todo.
- **Lo que no tiene** (a propósito): ranking, movimientos, regalo de saldo, otros juegos y frontend.
