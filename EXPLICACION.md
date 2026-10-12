# Honda Royale · Explicación

Honda Royale es el backend de un casino con saldo virtual (no se usa dinero real). Es solo una API: no tiene pantallas,
se usa con peticiones HTTP. Con ella se pueden registrar usuarios, hacer login, ver juegos y apostar a cara o cruz.
Todo se guarda en una base de datos SQLite.

En este documento explico cómo ponerlo en marcha, cómo se usa y cómo está hecho por dentro.

## 1. Cómo ponerlo en marcha

Hace falta tener instalado **Node 22.13 o superior** (el módulo `node:sqlite` viene incluido, no hay que instalar ninguna base de datos).

```bash
npm install     # instala las dependencias
npm test        # ejecuta las 38 pruebas, no necesita configuración
npm start       # arranca el servidor en http://localhost:3000
```

La primera vez que se arranca se crea el fichero `datos.sqlite` con las tablas vacías. Si se borra ese fichero, se empieza de cero.

Variables de entorno opcionales:

| Variable | Para qué sirve | Valor por defecto |
|---|---|---|
| `PORT` | Puerto del servidor | `3000` |
| `JWT_SECRET` | Secreto con el que se firman los tokens. En un uso real hay que cambiarlo | un valor de desarrollo |
| `ADMIN_EMAIL` | Email que al registrarse recibe el rol administrador | `admin@casino.es` |
| `BD_RUTA` | Fichero de la base de datos | `datos.sqlite` |

Ejemplo: `PORT=4000 ADMIN_EMAIL=jefe@correo.es npm start`.

## 2. Cómo se usa

### Rutas

| Ruta | Quién puede | Para qué |
|---|---|---|
| `POST /auth/register` | cualquiera | Registrarse (`email`, `nombre`, `password`) |
| `POST /auth/login` | cualquiera | Iniciar sesión, devuelve un `token` |
| `GET /usuarios/me` | con token | Ver mi perfil y mi saldo |
| `PATCH /usuarios/me` | con token | Cambiar mi nombre y/o mi contraseña |
| `GET /juegos` | con token | Listar juegos (`?q=` busca por texto, `?pagina=` y `?limite=` paginan) |
| `GET /juegos/:id` | con token | Ver un juego con mis últimas apuestas |
| `POST /juegos` | admin | Crear un juego |
| `PATCH /juegos/:id` | admin | Modificar un juego |
| `DELETE /juegos/:id` | admin | Borrar un juego (si no tiene apuestas) |
| `POST /juegos/:id/apuestas` | con token | Apostar (`importe` y `eleccion`: `cara` o `cruz`) |
| `GET /juegos/:id/apuestas` | con token | Ver mis apuestas de ese juego |
| `DELETE /juegos/:id/apuestas/:apuestaId` | con token | Borrar una apuesta mía del historial |

Las rutas "con token" necesitan la cabecera `Authorization: Bearer <token>`. El token se consigue haciendo login.

### Ejemplo paso a paso con `curl`

Con el servidor arrancado:

```bash
# 1. Registrarse. El email admin@casino.es se registra como administrador.
curl -X POST localhost:3000/auth/register -H 'Content-Type: application/json' \
     -d '{"email":"admin@casino.es","nombre":"Jefe","password":"clave-123"}'

# 2. Hacer login. Devuelve {"token":"..."}; hay que copiar el token.
curl -X POST localhost:3000/auth/login -H 'Content-Type: application/json' \
     -d '{"email":"admin@casino.es","password":"clave-123"}'

# 3. Usar el token en el resto de peticiones.
TOKEN=pega-aquí-el-token

# Crear un juego (solo admin)
curl -X POST localhost:3000/juegos -H 'Content-Type: application/json' -H "Authorization: Bearer $TOKEN" \
     -d '{"nombre":"Mesa 1","apuesta_max":50}'

# Apostar 10 fichas a cara en el juego 1
curl -X POST localhost:3000/juegos/1/apuestas -H 'Content-Type: application/json' -H "Authorization: Bearer $TOKEN" \
     -d '{"importe":10,"eleccion":"cara"}'
```

Cada usuario nuevo empieza con 100 fichas. Si acierta gana lo que apuesta y si falla lo pierde. El saldo nunca baja de 0.

### Cómo se consigue un administrador

No hay una pantalla para crear admins. El usuario que se registra con el email de `ADMIN_EMAIL` (por defecto `admin@casino.es`) recibe el rol `admin`.
Cualquier otro email se registra como `jugador`.

### Errores

Todos los errores tienen el formato `{ "error": "mensaje" }` y un código HTTP:

| Código | Cuándo |
|---|---|
| 400 | Datos mal enviados (campos que faltan, formatos no válidos…) |
| 401 | No hay token, o es inválido o ha caducado |
| 403 | Hay sesión pero no hay permiso (por ejemplo un jugador intentando crear un juego) |
| 404 | No existe lo que se pide |
| 409 | Choca con el estado actual (email repetido, saldo insuficiente, borrar un juego con apuestas) |

## 3. Qué hace cada archivo

| Archivo | Qué hace |
|---|---|
| `src/server.js` | Arranca el servidor en un puerto. |
| `src/app.js` | Crea la app Express, activa la lectura de JSON, conecta las rutas y define qué responder en los errores (404 y 500). No abre el puerto, así las pruebas pueden usarla directamente. |
| `src/db.js` | Abre la base SQLite y crea las tablas `usuarios`, `juegos` y `apuestas` si no existen. |
| `src/auth.js` | Todo lo del JWT: `crearToken` (en el login), `autenticar` (comprueba el token en cada petición protegida) y `soloAdmin` (exige rol admin). |
| `src/util.js` | Funciones pequeñas: leer `?pagina=` y `?limite=`, convertir el `:id` de la URL en número y pasar `ganada` de 0/1 a true/false. |
| `src/usuarios.js` | Rutas `/auth/register`, `/auth/login` y `/usuarios/me`. |
| `src/juegos.js` | Rutas `/juegos`: listar con búsqueda y paginación, ver uno, crear, modificar y borrar. |
| `src/apuestas.js` | Rutas `/juegos/:id/apuestas`: apostar, listar mis apuestas y borrar una. |
| `test/*.test.js` | Un archivo de pruebas por iteración. |
| `docs/` | Documentación SDD: `SPEC.md`, `PLAN.md` y `RESULTADOS.md` de cada iteración. |

El proyecto se hizo en tres iteraciones: primero usuarios (todo lo demás necesita saber quién eres), después juegos (el recurso principal)
y por último apuestas (que dependen de usuarios y de juegos).

## 4. El recorrido de una petición

Ejemplo: `POST /juegos/1/apuestas` con el body `{"importe": 10, "eleccion": "cara"}` y la cabecera `Authorization: Bearer <token>`.

```text
Cliente (curl o supertest)
   │  petición HTTP
   ▼
app.js ── express.json() convierte el body en un objeto (req.body)
   │
   ▼
apuestas.js ── autenticar(bd)                                  1. ¿Quién eres?
   │            auth.js lee el token, comprueba la firma y carga al usuario en req.usuario
   ▼
apuestas.js ── router.post('/juegos/:id/apuestas', ...)        2. La lógica
   │   a) busca el juego en la base             → si no existe: 404
   │   b) comprueba importe y elección          → si están mal: 400
   │   c) lee el saldo del usuario              → si importe > saldo: 409
   │   d) lanza la moneda (azar)
   │   e) BEGIN, guarda la apuesta, actualiza el saldo, COMMIT
   ▼
db.js (SQLite) ── tablas apuestas y usuarios                   3. Los datos
   │
   ▼
res.status(201).json(...)  → respuesta al cliente
```

No hay capas separadas: la ruta recibe la petición, comprueba los datos, aplica la regla y habla con SQLite en la misma función.

Los errores siguen siempre este orden: 401 (no sé quién eres), 403 (no tienes permiso), 404 (no existe), 400 (datos mal) y 409 (choca con el estado actual, por ejemplo saldo insuficiente).

## 5. Cómo funciona el JWT

Un JWT es un texto con tres partes separadas por puntos: `cabecera.contenido.firma`. El contenido va codificado, no cifrado:
cualquiera puede leerlo, pero nadie puede cambiarlo sin que la firma deje de ser válida.

| Pregunta | Respuesta |
|---|---|
| ¿Quién lo crea? | El servidor, en `POST /auth/login`, con `crearToken` (`src/auth.js`). Solo lo hace si el email existe y la contraseña coincide con el hash guardado. |
| ¿Qué lleva? | El id del usuario y la fecha de caducidad (1 hora). No lleva contraseña, rol ni saldo. |
| ¿Con qué se firma? | Con `JWT_SECRET`, que solo conoce el servidor. |
| ¿Dónde se envía? | El cliente lo manda en cada petición protegida en la cabecera `Authorization: Bearer <token>`. |
| ¿Cómo se comprueba? | `autenticar` (`src/auth.js`) separa `Bearer` del token, llama a `jwt.verify` (revisa firma y caducidad) y busca al usuario por su id en la base. Si falta el token, la firma no es buena, ha caducado o el usuario no existe, responde 401. |
| ¿Y los permisos? | Después de `autenticar`, `req.usuario.rol` viene de la base de datos. `soloAdmin` responde 403 si no es `admin`. |

La contraseña no va en el token ni se guarda en claro: se guarda el hash de `bcryptjs`, y en el login `bcrypt.compare` la verifica contra ese hash.

## 6. Qué prueba cada test

Cada prueba empieza por "criterio N", que es el número de la lista de criterios del `SPEC.md` de su iteración.
Cada prueba crea su propia base de datos en memoria, así que no se afectan entre sí.

### `test/usuarios.test.js` (iteración 1)

| Criterio | Qué comprueba |
|---|---|
| 1 | Registrarse devuelve 201 con rol `jugador`, saldo 100 y sin contraseña en la respuesta. |
| 2 | Email sin formato, nombre vacío, contraseña corta, campos que faltan y JSON roto devuelven 400. |
| 3 | Registrar dos veces el mismo email (aunque cambien las mayúsculas) devuelve 409. |
| 4 | En la base se guarda un hash que empieza por `$2` y no la contraseña. |
| 5 | El login devuelve un token con 3 partes y el id del usuario dentro. |
| 6 | Contraseña mala o email inexistente devuelven 401 con el mismo mensaje. |
| 7 | `GET /usuarios/me` con token devuelve mi perfil. |
| 8 | Sin token, con un token cualquiera o firmado con otro secreto devuelve 401. |
| 9 | `PATCH` cambia el nombre y se mantiene al volver a pedir el perfil. |
| 10 | Tras cambiar la contraseña, la nueva entra y la antigua da 401. |
| 11 | `PATCH` vacío o inválido devuelve 400, y enviar `rol`, `saldo` o `email` no cambia nada. |
| 12 | El email `admin@casino.es` se registra con rol `admin`. |
| 13 | Con un fichero SQLite real, el usuario sigue existiendo al volver a abrir la base. |

### `test/juegos.test.js` (iteración 2)

| Criterio | Qué comprueba |
|---|---|
| 1 | El admin crea un juego (201) y la apuesta máxima por defecto es 100. |
| 2 | Un jugador corriente recibe 403 al crear, modificar o borrar. |
| 3 | Sin token, todas las rutas de juegos devuelven 401. |
| 4 | Nombre vacío o `apuesta_max` que no es un entero positivo devuelven 400. |
| 5 | Nombre repetido al crear o al modificar devuelve 409 (dejarle su propio nombre no es conflicto). |
| 6 | `GET /juegos/:id` devuelve el juego con `ultimasApuestas`. |
| 7 | Id inexistente o no numérico devuelve 404 en GET, PATCH y DELETE. |
| 8 | El listado pagina bien: 10 por página, la página 2 con los que quedan, `limite` propio y `total`. |
| 9 | `?q=` busca en nombre y descripción sin distinguir mayúsculas, y un `%` se busca como texto. |
| 10 | `pagina=0`, negativa, texto, `limite=0` o `limite=51` devuelven 400. |
| 11 | `PATCH` solo cambia lo enviado; vacío o inválido devuelve 400. |
| 12 | El admin borra (204) y después el juego da 404. |

### `test/apuestas.test.js` (iteración 3)

En estas pruebas el azar está controlado: con `0.1` sale cara y con `0.9` sale cruz.

| Criterio | Qué comprueba |
|---|---|
| 1 | Una apuesta válida devuelve 201 con resultado, `ganada` y saldo nuevo. |
| 2 | Acertar suma el importe al saldo. |
| 3 | Fallar resta el importe del saldo. |
| 4 | Enviar `resultado`, `ganada` o `saldo` en el body no sirve de nada. |
| 5 | Apostar más de lo que se tiene devuelve 409; el saldo no cambia y no queda apuesta guardada. |
| 6 | Perder todo deja el saldo en 0 (nunca negativo) y la siguiente apuesta da 409. |
| 7 | Importe 0, negativo, decimal, texto, elección inválida o por encima de `apuesta_max` devuelven 400. |
| 8 | Juego inexistente devuelve 404, y sin token devuelve 401 al apostar, listar y borrar. |
| 9 | El listado solo trae mis apuestas (no las de otros), la más reciente primero y paginado. |
| 10 | `GET /juegos/:id` trae solo mis 5 últimas apuestas de ese juego, en orden. |
| 11 | Borrar mi apuesta devuelve 204, desaparece y el saldo queda igual. |
| 12 | La apuesta de otro jugador no se puede borrar (404) y sigue existiendo. |
| 13 | Un juego con apuestas no se puede borrar (409). |

## 7. Decisiones que tomé

- **Administrador por `ADMIN_EMAIL`**: es la forma más simple de tener un admin sin scripts. En un sistema real habría que protegerlo mejor, porque quien se registre antes con ese email sería admin.
- **Borrar una apuesta no devuelve saldo**: si lo hiciera, bastaría con borrar las apuestas perdidas para recuperar el dinero.
- **404 en vez de 403** para las apuestas de otros: así no se revela que existen.
- **El saldo está protegido dos veces**: con una comprobación en el código y con `CHECK (saldo >= 0)` en la tabla.
- **Transacción al apostar**: guardar la apuesta y cambiar el saldo son una sola operación; si falla una, se deshace todo.
- **Lo que no incluye**: ranking, movimientos, regalo de saldo, otros juegos y frontend.
