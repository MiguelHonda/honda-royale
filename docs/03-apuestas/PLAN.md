# Iteración 3 · PLAN

## Archivos

| Archivo | Cambio |
|---|---|
| `src/db.js` | Añade la tabla `apuestas` (usuario, juego, importe, elección, resultado, ganada, fecha) |
| `src/apuestas.js` | **Nuevo.** Rutas para apostar, listar y borrar |
| `src/juegos.js` | `GET /juegos/:id` rellena `ultimasApuestas`; `DELETE` devuelve 409 si el juego tiene apuestas |
| `src/app.js` | Monta las rutas de apuestas |
| `test/apuestas.test.js` | **Nuevo.** Pruebas de los criterios 1 a 13 |

## Decisiones

- **Azar**: `crearApp` recibe una función `azar` (por defecto `Math.random`). En las pruebas devuelve un valor fijo, así se sabe si sale cara o cruz.
- **Apostar**: se lee el saldo de la base y se comprueba. Después, dentro de una transacción (`BEGIN` / `COMMIT`), se guarda la apuesta y se actualiza el saldo. O se hacen las dos cosas o ninguna.
- **Saldo no negativo**: lo comprueba el código (409) y además la tabla tiene `CHECK (saldo >= 0)`.
- **Privacidad**: todas las consultas filtran por el usuario del token. La apuesta de otro jugador se trata como si no existiera (404).
- **Borrar una apuesta no devuelve saldo**: solo la quita del historial. Si devolviera el dinero, se podrían borrar las apuestas perdidas para recuperarlo.
- **Borrar un juego con apuestas**: se rechaza con 409 para conservar el historial.
