# Honda Royale mínimo · Explicación

Este es el backend de un casino con saldo virtual (no hay dinero real). Solo es la API, no tiene pantallas. Con él se puede registrar gente, hacer login, ver los juegos y apostar a cara o cruz. Todo se guarda en una base de datos SQLite.

La práctica pide solo lo mínimo, así que dejé fuera a propósito el ranking, los movimientos, el regalo de saldo, el resto de juegos y el frontend.

## 1. Cómo se ejecuta

```bash
npm install
npm test        # 38 pruebas, no hace falta configurar nada
npm start       # http://localhost:3000 (la primera vez crea datos.sqlite)
```

Variables opcionales: `PORT` (3000), `JWT_SECRET` (el secreto con el que se firman los tokens), `ADMIN_EMAIL` (por defecto `admin@casino.es`) y `BD_RUTA` (por defecto `datos.sqlite`).

Para probarlo a mano con curl:

```bash
# 1. Registrarse (el email admin@casino.es se registra como administrador)
curl -X POST localhost:3000/auth/register -H 'Content-Type: application/json' \
     -d '{"email":"admin@casino.es","nombre":"Jefe","password":"clave-123"}'

# 2. Login: devuelve {"token":"..."}; lo guardo en una variable
curl -X POST localhost:3000/auth/login -H 'Content-Type: application/json' \
     -d '{"email":"admin@casino.es","password":"clave-123"}'
TOKEN=pega-aquí-el-token

# 3. Con el token ya puedo usar el resto
curl -X POST localhost:3000/juegos -H 'Content-Type: application/json' -H "Authorization: Bearer $TOKEN" \
     -d '{"nombre":"Mesa 1","apuesta_max":50}'
curl -X POST localhost:3000/juegos/1/apuestas -H 'Content-Type: application/json' -H "Authorization: Bearer $TOKEN" \
     -d '{"importe":10,"eleccion":"cara"}'
```

## 2. Qué hace cada archivo

- `src/server.js`: arranca el servidor en un puerto. Son tres líneas.
- `src/app.js`: crea la aplicación de Express. Activa la lectura de JSON, monta las rutas de cada tema y dice qué responder cuando algo falla (404 y 500). No abre el puerto, y por eso las pruebas pueden usar la app directamente sin arrancar el servidor.
- `src/db.js`: abre la base SQLite y crea las tres tablas (`usuarios`, `juegos` y `apuestas`) si todavía no existen.
- `src/auth.js`: todo lo del JWT. `crearToken` se usa en el login, `autenticar` comprueba el token en cada petición protegida y `soloAdmin` exige que el usuario sea admin.
- `src/util.js`: tres funciones pequeñas. Una lee `?pagina=` y `?limite=`, otra convierte el `:id` de la URL en número y otra pasa `ganada` de 0/1 a true/false.
- `src/usuarios.js`: las rutas `/auth/register`, `/auth/login` y `/usuarios/me`, con su lógica dentro.
- `src/juegos.js`: las rutas de `/juegos`. Listar con búsqueda y paginación, ver uno, crear, modificar y borrar.
- `src/apuestas.js`: las rutas de `/juegos/:id/apuestas`. Apostar, listar mis apuestas y borrar una.
- `test/`: un archivo de pruebas por iteración. Cada prueba comprueba un criterio de la SPEC.
- `docs/`: la documentación SDD. Por cada iteración hay un `SPEC.md` (qué tiene que hacer), un `PLAN.md` (cómo lo voy a hacer) y un `RESULTADOS.md` (lo que salió al ejecutar `npm test`).

Hice tres iteraciones en este orden porque cada una necesita a la anterior. Primero los usuarios, porque todo lo demás necesita saber quién eres. Después los juegos, que son el recurso principal. Y por último las apuestas, que son el recurso secundario y dependen de usuarios y de juegos.

## 3. Qué pasa cuando llega una petición

Voy a seguir como ejemplo `POST /juegos/1/apuestas`, con el body `{"importe": 10, "eleccion": "cara"}` y la cabecera `Authorization: Bearer <token>`.

1. La petición llega a `app.js`, donde `express.json()` convierte el body en un objeto de JavaScript (`req.body`).
2. Antes de ejecutar la lógica, pasa por `autenticar` (`auth.js`). Este lee el token, comprueba la firma y carga al usuario en `req.usuario`. Si algo falla, responde 401 y ahí se acaba.
3. Ya en `apuestas.js` se hace la lógica:
   - busca el juego en la base de datos y, si no existe, responde 404;
   - valida el importe y la elección y, si están mal, responde 400;
   - mira el saldo del usuario y, si el importe es mayor, responde 409;
   - lanza la moneda con `azar()`, así que el resultado lo decide el servidor;
   - guarda la apuesta y actualiza el saldo dentro de una transacción (`BEGIN`, `INSERT`, `UPDATE`, `COMMIT`).
4. Se responde con 201 y los datos de la apuesta.

No separé el código en capas: la ruta recibe la petición, valida, aplica la regla y habla con SQLite en la misma función. Para un proyecto tan pequeño me pareció más fácil de seguir.

Los errores siguen siempre este orden: 401 (no sé quién eres), 403 (no tienes permiso), 404 (no existe), 400 (datos mal) y 409 (choca con el estado actual, por ejemplo saldo insuficiente).

## 4. Cómo funciona el JWT

Un JWT es un texto con tres partes separadas por puntos: cabecera, contenido y firma. El contenido va codificado, no cifrado, así que cualquiera puede leerlo. Lo que nadie puede hacer es cambiarlo sin que la firma deje de valer.

- **Quién lo crea:** el servidor, en `POST /auth/login`, con `crearToken` (`src/auth.js`) y `jwt.sign`. Solo lo hace si el email existe y la contraseña coincide con el hash de bcrypt.
- **Qué lleva dentro:** el id del usuario (`sub`) y la fecha de caducidad, que es de 1 hora. No lleva contraseña, ni rol, ni saldo.
- **Con qué se firma:** con `JWT_SECRET`, que solo conoce el servidor.
- **Dónde se envía:** el cliente lo manda en cada petición protegida, en la cabecera `Authorization: Bearer <token>`.
- **Cómo se comprueba:** `autenticar` separa `Bearer` del token y llama a `jwt.verify`, que revisa la firma y la caducidad. Después busca al usuario por su id en la base de datos. Si falta el token, está mal firmado, ha caducado o el usuario ya no existe, responde 401.
- **Los permisos:** después de `autenticar`, el rol se saca de la base de datos (`req.usuario.rol`). `soloAdmin` responde 403 si no es admin.

El usuario se vuelve a leer de la base de datos en cada petición para que el rol y el saldo sean siempre los de ahora. Así un token no puede darte un rol que no tienes.

Las contraseñas no van en el token ni se guardan en claro. Se guarda el hash de `bcryptjs`, y en el login `bcrypt.compare` comprueba la contraseña contra ese hash.

## 5. Qué comprueba cada prueba

El nombre de cada prueba empieza por el criterio de la SPEC al que corresponde (por ejemplo `[CA1.5]`). Cada prueba crea su propia base de datos en memoria, así que no se afectan entre sí.

### Usuarios (`test/usuarios.test.js`)

- **CA1.1:** registrarse devuelve 201 con rol `jugador` y saldo 100, y la respuesta no trae la contraseña.
- **CA1.2:** email sin formato, nombre vacío, contraseña corta, campos que faltan o JSON roto dan 400.
- **CA1.3:** registrar dos veces el mismo email, aunque cambien las mayúsculas, da 409.
- **CA1.4:** en la base de datos se guarda un hash que empieza por `$2` y no la contraseña.
- **CA1.5:** el login devuelve un token de tres partes con el id del usuario dentro.
- **CA1.6:** contraseña mala o email que no existe da 401 con el mismo mensaje.
- **CA1.7:** `GET /usuarios/me` con token devuelve mi perfil.
- **CA1.8:** sin token, con un token cualquiera o firmado con otro secreto da 401.
- **CA1.9:** `PATCH` cambia el nombre y se mantiene al volver a pedir el perfil.
- **CA1.10:** tras cambiar la contraseña entra la nueva y la antigua da 401.
- **CA1.11:** `PATCH` vacío o inválido da 400, y mandar `rol`, `saldo` o `email` no cambia nada.
- **CA1.12:** el email `admin@casino.es` se registra con rol `admin`.
- **CA1.13:** con un fichero SQLite real, el usuario sigue existiendo al abrir otra app sobre el mismo fichero (los datos persisten).

### Juegos (`test/juegos.test.js`)

- **CA2.1:** el admin crea un juego (201) y la apuesta máxima por defecto es 100.
- **CA2.2:** un jugador normal recibe 403 al crear, modificar o borrar.
- **CA2.3:** sin token, todas las rutas de juegos dan 401.
- **CA2.4:** nombre vacío, o `apuesta_max` que no sea un entero positivo, da 400.
- **CA2.5:** nombre repetido al crear o al modificar da 409 (dejar el mismo nombre al modificar no cuenta como repetido).
- **CA2.6:** `GET /juegos/:id` devuelve el juego con `ultimasApuestas`.
- **CA2.7:** id que no existe o no numérico da 404 en GET, PATCH y DELETE.
- **CA2.8:** el listado pagina bien: 10 por página, la página 2 con el resto, un `limite` personalizado y el `total`.
- **CA2.9:** `?q=` busca en nombre y descripción sin distinguir mayúsculas, y un `%` se busca como texto normal.
- **CA2.10:** `pagina=0`, negativa o texto, y `limite=0` o `limite=51`, dan 400.
- **CA2.11:** `PATCH` parcial cambia solo lo que se manda; si va vacío o inválido da 400.
- **CA2.12:** el admin borra (204) y después el juego da 404.

### Apuestas (`test/apuestas.test.js`)

En estas pruebas el azar está controlado: con `0.1` sale cara y con `0.9` sale cruz.

- **CA3.1:** una apuesta válida devuelve 201 con el resultado, `ganada` y el saldo nuevo.
- **CA3.2:** si acierto, el saldo sube el importe.
- **CA3.3:** si fallo, el saldo baja el importe.
- **CA3.4:** mandar `resultado`, `ganada` o `saldo` en el body no sirve de nada.
- **CA3.5:** apostar más de lo que tengo da 409, el saldo no cambia y no queda ninguna apuesta guardada.
- **CA3.6:** si pierdo todo, el saldo queda en 0 (nunca negativo) y la siguiente apuesta da 409.
- **CA3.7:** importe 0, negativo, con decimales o texto, una elección inválida o pasarse de `apuesta_max` da 400.
- **CA3.8:** juego que no existe da 404, y sin token da 401 al apostar, listar y borrar.
- **CA3.9:** el listado solo trae mis apuestas, con la más reciente primero y paginadas.
- **CA3.10:** `GET /juegos/:id` trae solo mis 5 últimas apuestas de ese juego, en orden.
- **CA3.11:** borrar una apuesta mía da 204, desaparece y el saldo queda igual.
- **CA3.12:** la apuesta de otro jugador no se puede borrar (404) y sigue existiendo.
- **CA3.13:** un juego que ya tiene apuestas no se puede borrar (409).

## 6. Decisiones que tomé

- **Admin por `ADMIN_EMAIL`:** es la forma más simple de tener un admin sin hacer un script aparte. En un sistema real habría que protegerlo mejor, porque quien registre antes ese email sería admin.
- **Borrar una apuesta no devuelve el saldo:** si lo devolviera, bastaría con borrar las apuestas perdidas para recuperar el dinero.
- **404 en vez de 403 con las apuestas de otros:** así no se revela que existen.
- **El saldo está protegido dos veces:** se comprueba en el código y además la tabla tiene `CHECK (saldo >= 0)`.
- **Transacción al apostar:** guardar la apuesta y cambiar el saldo es una sola operación. Si falla una de las dos, se deshace todo.
