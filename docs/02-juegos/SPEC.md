# Iteración 2 · SPEC · Juegos

## Qué debe hacer

Los juegos son el recurso principal. Cualquier usuario con sesión puede listarlos (con búsqueda y paginación) y ver uno.
Solo un administrador puede crear, modificar y borrar. Un juego es una mesa de "cara o cruz" con nombre, descripción y apuesta máxima.

## Rutas (todas necesitan token)

| Ruta | Quién | Descripción |
|---|---|---|
| `GET /juegos?q=&pagina=&limite=` | cualquier usuario | Lista de juegos con búsqueda y paginación |
| `GET /juegos/:id` | cualquier usuario | Un juego, con sus `ultimasApuestas` |
| `POST /juegos` | admin | Crea un juego. Body: `nombre`, `descripcion` (opcional), `apuesta_max` (opcional, por defecto 100) |
| `PATCH /juegos/:id` | admin | Modifica uno o varios campos |
| `DELETE /juegos/:id` | admin | Borra el juego |

## Criterios

1. **Crear.** El admin crea un juego y recibe `201` con `id`, `nombre`, `descripcion` y `apuesta_max`.
2. **Permisos.** Un jugador que intenta crear, modificar o borrar recibe `403`.
3. **Sin sesión.** Sin token, cualquier ruta de `/juegos` devuelve `401`.
4. **Datos inválidos.** Crear con nombre vacío o con `apuesta_max` que no sea un entero positivo devuelve `400`.
5. **Nombre repetido.** Crear o modificar un juego con un nombre que ya usa otro devuelve `409`.
6. **Ver un juego.** `GET /juegos/:id` devuelve `200` con el juego y el campo `ultimasApuestas` (una lista; en esta iteración siempre está vacía y se rellena en la 3).
7. **No existe.** Un id inexistente o no numérico devuelve `404` en GET, PATCH y DELETE.
8. **Paginación.** `GET /juegos` devuelve `{ datos, pagina, limite, total }`. Por defecto página 1 y límite 10, ordenado por id.
9. **Búsqueda.** `?q=texto` filtra por nombre o descripción sin distinguir mayúsculas, y `total` cuenta solo los que coinciden.
10. **Paginación inválida.** `pagina` o `limite` no válidos (0, negativos, texto, `limite` mayor que 50) devuelven `400`.
11. **Modificar.** Un PATCH del admin devuelve `200` y solo cambia lo que se envía. Un PATCH vacío devuelve `400`.
12. **Borrar.** El admin borra con `204` y después el juego devuelve `404`.
