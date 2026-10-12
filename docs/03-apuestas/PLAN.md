# Iteración 3 · PLAN

## Archivos

| Archivo | Cambio |
|---|---|
| `src/db.js` | Añade la tabla `apuestas` (`usuario_id`, `juego_id`, `importe`, `eleccion`, `resultado`, `ganada`, `creada`) con claves foráneas |
| `src/apuestas.js` | **Nuevo.** Rutas `POST`/`GET`/`DELETE` de apuestas |
| `src/juegos.js` | `GET /juegos/:id` lee `ultimasApuestas`; `DELETE` devuelve 409 si hay apuestas |
| `src/app.js` | Monta `rutasApuestas(bd, azar)` |
| `test/apuestas.test.js` | **Nuevo.** Pruebas CA3.1 … CA3.13 |

## Decisiones

- **Azar inyectable**: `crearApp({ azar })`. En producción es `Math.random`; en las pruebas es una función que devuelve lo que queramos (`0.1` → cara, `0.9` → cruz), así los tests no dependen de la suerte.
- **Apostar**: se lee el saldo de la base, se comprueba, y en una transacción (`BEGIN`/`COMMIT`) se inserta la apuesta y se actualiza el saldo. O pasan las dos cosas o ninguna.
- **Saldo no negativo**: doble protección. El código devuelve 409 antes de apostar y la tabla tiene `CHECK (saldo >= 0)`.
- **Privacidad**: todas las consultas filtran por `usuario_id = el del token`. La apuesta de otro jugador se trata como inexistente (404), sin revelar que existe.
- **Borrar una apuesta no devuelve saldo**: solo limpia el historial. Si devolviera el dinero, un jugador podría borrar sus apuestas perdidas y recuperarlas.
- **Borrar un juego con apuestas → 409**: se conserva el historial de los jugadores.
