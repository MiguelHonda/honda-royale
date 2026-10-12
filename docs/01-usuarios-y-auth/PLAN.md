# Iteración 1 · PLAN

## Archivos

| Archivo | Para qué |
|---|---|
| `src/db.js` | Abre SQLite (`node:sqlite`) y crea la tabla `usuarios` |
| `src/auth.js` | Crea el token JWT y comprueba el token en las rutas protegidas |
| `src/util.js` | Funciones pequeñas compartidas (leer la paginación y los ids) |
| `src/usuarios.js` | Rutas `/auth/register`, `/auth/login` y `/usuarios/me` |
| `src/app.js` | Crea la app Express y monta las rutas |
| `src/server.js` | Arranca el servidor (`npm start`) |
| `test/usuarios.test.js` | Pruebas de los criterios 1 a 13 |

## Decisiones

- **Tabla `usuarios`**: `id`, `email` (único), `nombre`, `password_hash`, `rol` y `saldo`. El saldo tiene `CHECK (saldo >= 0)`, así que la propia base impide que sea negativo.
- **JWT**: lo firma el servidor con `JWT_SECRET` y caduca en 1 hora. Solo lleva el id del usuario; el rol y el saldo se leen de la base en cada petición.
- **Administrador**: el email indicado en `ADMIN_EMAIL` recibe el rol `admin` al registrarse. No hace falta ningún script.
- **Contraseñas**: se cifran con `bcryptjs`.
- **Pruebas**: cada prueba crea una app con una base de datos en memoria, para que no dependan unas de otras.
