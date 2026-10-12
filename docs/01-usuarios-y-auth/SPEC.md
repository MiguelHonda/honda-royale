# Iteración 1 · SPEC · Usuarios y autenticación

## Qué debe hacer

Un visitante puede registrarse, iniciar sesión y recibir un token JWT. Con ese token consulta y edita **su propio** perfil.
Cada usuario nuevo empieza con 100 fichas de saldo.

## Endpoints

| Método y ruta | Quién | Descripción |
|---|---|---|
| `POST /auth/register` | público | Crea usuario. Body: `email`, `nombre`, `password` |
| `POST /auth/login` | público | Devuelve `{ token }`. Body: `email`, `password` |
| `GET /usuarios/me` | con token | Mi perfil |
| `PATCH /usuarios/me` | con token | Cambia mi `nombre` y/o mi `password` |

## Criterios de aceptación

- **CA1.1** Registro válido → `201` y el perfil (`id`, `email`, `nombre`, `rol: "jugador"`, `saldo: 100`). La respuesta no contiene la contraseña.
- **CA1.2** Registro con datos inválidos (email sin formato, nombre vacío, contraseña de menos de 6 caracteres, JSON mal formado) → `400`.
- **CA1.3** Registro con un email ya registrado → `409` (sin distinguir mayúsculas).
- **CA1.4** La contraseña se guarda cifrada con bcrypt, nunca en claro.
- **CA1.5** Login correcto → `200` con un token JWT generado por el servidor.
- **CA1.6** Login con contraseña incorrecta o email inexistente → `401` (el mismo mensaje en ambos casos).
- **CA1.7** `GET /usuarios/me` con `Authorization: Bearer <token>` → `200` con mi perfil.
- **CA1.8** Sin cabecera, con token mal formado o con firma falsa → `401`.
- **CA1.9** `PATCH /usuarios/me` con `nombre` → `200` y el cambio queda guardado.
- **CA1.10** `PATCH /usuarios/me` con `password` → la nueva contraseña sirve para login y la antigua da `401`.
- **CA1.11** `PATCH /usuarios/me` vacío o con datos inválidos → `400`. Enviar `rol`, `saldo` o `email` no tiene ningún efecto.
- **CA1.12** El email configurado como administrador (`ADMIN_EMAIL`, por defecto `admin@casino.es`) obtiene `rol: "admin"` al registrarse.
- **CA1.13** Los datos persisten en un fichero SQLite: al reabrir la base, el usuario sigue existiendo.
