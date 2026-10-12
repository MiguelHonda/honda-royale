# Iteración 3 · SPEC · Apuestas (cara o cruz)

## Qué debe hacer

Un jugador apuesta fichas a "cara" o "cruz" en un juego. **El servidor** lanza la moneda: si el jugador acierta gana el importe apostado, si falla lo pierde.
El saldo nunca puede quedar negativo. Cada jugador solo ve y borra sus propias apuestas.

## Endpoints (todos exigen token)

| Método y ruta | Descripción |
|---|---|
| `POST /juegos/:id/apuestas` | Apostar. Body: `importe` (entero), `eleccion` (`"cara"` o `"cruz"`) |
| `GET /juegos/:id/apuestas?pagina=&limite=` | Mis apuestas en ese juego, de la más reciente a la más antigua |
| `DELETE /juegos/:id/apuestas/:apuestaId` | Borra una apuesta mía del historial |
| `GET /juegos/:id` | (ya existía) ahora `ultimasApuestas` trae mis 5 últimas apuestas de ese juego |

## Criterios de aceptación

- **CA3.1** Apuesta válida → `201` con `id`, `juego_id`, `importe`, `eleccion`, `resultado` (`cara`/`cruz`), `ganada` (booleano) y `saldo` (el saldo ya actualizado).
- **CA3.2** Si el jugador acierta, su saldo sube en `importe`.
- **CA3.3** Si falla, su saldo baja en `importe`.
- **CA3.4** El resultado lo decide el servidor: un `resultado` o `ganada` enviado en el body se ignora.
- **CA3.5** Apostar más fichas de las que se tienen → `409`, el saldo no cambia y no se guarda la apuesta.
- **CA3.6** El saldo nunca es negativo: apostando todo el saldo y perdiendo queda en `0`, y la siguiente apuesta da `409`.
- **CA3.7** Datos inválidos (importe `0`, negativo, decimal o texto; elección distinta de cara/cruz; importe mayor que la `apuesta_max` del juego) → `400`.
- **CA3.8** Juego inexistente → `404`; sin token → `401`.
- **CA3.9** `GET /juegos/:id/apuestas` lista solo mis apuestas (no las de otros), paginadas y con `total`.
- **CA3.10** `GET /juegos/:id` incluye `ultimasApuestas`: mis últimas 5 apuestas de ese juego, la más reciente primero.
- **CA3.11** `DELETE` de una apuesta mía → `204`; desaparece del listado y **el saldo no cambia**.
- **CA3.12** `DELETE` (o intento de ver) de la apuesta de otro jugador → `404`, y la apuesta sigue existiendo.
- **CA3.13** Borrar un juego que ya tiene apuestas → `409`.
