# Iteración 1 · SPEC · Usuarios y autenticación

## Qué debe hacer

Una persona puede registrarse, iniciar sesión y recibir un token JWT. Con ese token consulta y edita su propio perfil.
Cada usuario nuevo empieza con 100 fichas de saldo.

## Rutas

| Ruta | Quién | Descripción |
|---|---|---|
| `POST /auth/register` | cualquiera | Crea el usuario. Body: `email`, `nombre`, `password` |
| `POST /auth/login` | cualquiera | Devuelve `{ token }`. Body: `email`, `password` |
| `GET /usuarios/me` | con token | Devuelve mi perfil |
| `PATCH /usuarios/me` | con token | Cambia mi `nombre` y/o mi `password` |

## Criterios

1. **Registro válido.** Devuelve `201` con el perfil (`id`, `email`, `nombre`, `rol: "jugador"`, `saldo: 100`). La respuesta no incluye la contraseña.
2. **Registro con datos inválidos.** Email sin formato, nombre vacío, contraseña de menos de 6 caracteres o JSON mal formado devuelven `400`.
3. **Email repetido.** Registrar un email que ya existe devuelve `409`, sin distinguir mayúsculas.
4. **Contraseña cifrada.** Se guarda con bcrypt, nunca en claro.
5. **Login correcto.** Devuelve `200` con un token JWT creado por el servidor.
6. **Login incorrecto.** Contraseña errónea o email que no existe devuelven `401`, con el mismo mensaje en los dos casos.
7. **Ver mi perfil.** `GET /usuarios/me` con `Authorization: Bearer <token>` devuelve `200` con mi perfil.
8. **Token no válido.** Sin cabecera, con un token mal formado o con firma falsa devuelve `401`.
9. **Cambiar el nombre.** `PATCH /usuarios/me` con `nombre` devuelve `200` y el cambio queda guardado.
10. **Cambiar la contraseña.** Con `password` nueva, el login funciona con la nueva y la antigua da `401`.
11. **PATCH inválido.** Un PATCH vacío o con datos inválidos devuelve `400`. Enviar `rol`, `saldo` o `email` no cambia nada.
12. **Administrador.** El email configurado como admin (`ADMIN_EMAIL`, por defecto `admin@casino.es`) se registra con `rol: "admin"`.
13. **Persistencia.** Los datos se guardan en un fichero SQLite: al volver a abrir la base el usuario sigue existiendo.
