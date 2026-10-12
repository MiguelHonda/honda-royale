# Iteración 2 · SPEC · Juegos

## Qué debe hacer

Los juegos son el recurso principal. Cualquier usuario con sesión puede listarlos (con búsqueda y paginación) y ver uno.
Solo un administrador puede crear, modificar y borrar. Un juego es una mesa de "cara o cruz" con un nombre, una descripción y una apuesta máxima.

## Endpoints (todos exigen token)

| Método y ruta | Quién | Descripción |
|---|---|---|
| `GET /juegos?q=&pagina=&limite=` | cualquier usuario | Listado con búsqueda de texto y paginación |
| `GET /juegos/:id` | cualquier usuario | Un juego, con `ultimasApuestas` |
| `POST /juegos` | admin | Crea. Body: `nombre`, `descripcion?`, `apuesta_max?` (por defecto 100) |
| `PATCH /juegos/:id` | admin | Modifica uno o varios campos |
| `DELETE /juegos/:id` | admin | Borra |

## Criterios de aceptación

- **CA2.1** El admin crea un juego → `201` con `id`, `nombre`, `descripcion` y `apuesta_max`.
- **CA2.2** Un jugador que intenta crear, modificar o borrar → `403`.
- **CA2.3** Sin token, cualquier ruta de `/juegos` → `401`.
- **CA2.4** Crear con datos inválidos (nombre vacío, `apuesta_max` que no sea entero positivo) → `400`.
- **CA2.5** Crear o modificar con un nombre que ya usa otro juego → `409`.
- **CA2.6** `GET /juegos/:id` → `200` con el juego y un campo `ultimasApuestas` (lista; en esta iteración siempre vacía, se llena en la 3).
- **CA2.7** `id` inexistente (o no numérico) en `GET`, `PATCH` o `DELETE` → `404`.
- **CA2.8** `GET /juegos` devuelve `{ datos, pagina, limite, total }`; por defecto página 1 y límite 10, ordenado por id.
- **CA2.9** `?q=texto` filtra por nombre o descripción sin distinguir mayúsculas; `total` cuenta solo los que coinciden.
- **CA2.10** `pagina` o `limite` inválidos (0, negativos, texto, `limite` > 50) → `400`.
- **CA2.11** `PATCH` parcial del admin → `200` y solo cambia lo enviado; un `PATCH` vacío → `400`.
- **CA2.12** `DELETE` del admin → `204`, y después el juego da `404`.
