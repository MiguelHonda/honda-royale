# Iteración 1 · PLAN

## Archivos

| Archivo | Para qué |
|---|---|
| `src/db.js` | Abre SQLite (`node:sqlite`) y crea la tabla `usuarios` si no existe |
| `src/auth.js` | Crea tokens JWT y el middleware `autenticar` (y `soloAdmin`) |
| `src/util.js` | Pequeñas funciones compartidas (de momento solo lectura de paginación) |
| `src/usuarios.js` | Rutas `/auth/register`, `/auth/login`, `/usuarios/me` con su lógica |
| `src/app.js` | Crea la app Express, monta las rutas y los manejadores de error |
| `src/server.js` | Arranca el servidor (`npm start`) |
| `test/usuarios.test.js` | Pruebas CA1.1 … CA1.13 |

## Decisiones

- **Tabla `usuarios`**: `id`, `email` (UNIQUE), `nombre`, `password_hash`, `rol`, `saldo` con `CHECK (saldo >= 0)`. Así la base de datos también impide un saldo negativo.
- **JWT**: lo firma el servidor (HS256, 1 hora) con `JWT_SECRET`. El payload solo lleva el id (`sub`). En cada petición se vuelve a cargar al usuario desde la base de datos.
- **Cómo se hace admin**: no hay pantalla ni script. El email de `ADMIN_EMAIL` recibe el rol `admin` al registrarse. Es suficiente para la práctica.
- **bcrypt**: se calcula el hash *antes* de comprobar si el email existe y se inserta justo después, sin `await` por medio, para que dos registros simultáneos no se pisen.
- **Pruebas**: cada test crea una app con base de datos en memoria (`:memory:`), así están aisladas. Se inyecta la base en `crearApp({ bd })`.
