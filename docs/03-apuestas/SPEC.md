# Iteración 3 · SPEC · Apuestas (cara o cruz)

## Qué debe hacer

Un jugador apuesta fichas a "cara" o "cruz" en un juego. El servidor lanza la moneda: si el jugador acierta gana el importe apostado y si falla lo pierde.
El saldo nunca puede quedar negativo. Cada jugador solo ve y borra sus propias apuestas.

## Rutas (todas necesitan token)

| Ruta | Descripción |
|---|---|
| `POST /juegos/:id/apuestas` | Apostar. Body: `importe` (entero) y `eleccion` (`"cara"` o `"cruz"`) |
| `GET /juegos/:id/apuestas?pagina=&limite=` | Mis apuestas en ese juego, de la más reciente a la más antigua |
| `DELETE /juegos/:id/apuestas/:apuestaId` | Borra una apuesta mía |
| `GET /juegos/:id` | Ya existía; ahora `ultimasApuestas` trae mis 5 últimas apuestas en ese juego |

## Criterios

1. **Apostar.** Una apuesta válida devuelve `201` con `id`, `juego_id`, `importe`, `eleccion`, `resultado` (`cara` o `cruz`), `ganada` (true o false) y `saldo` (ya actualizado).
2. **Acertar.** Si el jugador acierta, su saldo sube en el importe.
3. **Fallar.** Si falla, su saldo baja en el importe.
4. **Resultado del servidor.** Un `resultado` o `ganada` enviado en el body se ignora: lo decide el servidor.
5. **Saldo insuficiente.** Apostar más fichas de las que se tienen devuelve `409`, el saldo no cambia y la apuesta no se guarda.
6. **Saldo nunca negativo.** Si apuesta todo y pierde queda en `0`, y la siguiente apuesta devuelve `409`.
7. **Datos inválidos.** Importe `0`, negativo, decimal o texto, elección distinta de cara o cruz, o importe mayor que la `apuesta_max` del juego devuelven `400`.
8. **Juego inexistente o sin sesión.** Un juego que no existe devuelve `404` y sin token devuelve `401`.
9. **Mis apuestas.** `GET /juegos/:id/apuestas` lista solo las mías, paginadas y con `total`.
10. **Últimas apuestas.** `GET /juegos/:id` incluye en `ultimasApuestas` mis 5 últimas apuestas de ese juego, la más reciente primero.
11. **Borrar una apuesta mía.** Devuelve `204`, desaparece del listado y el saldo no cambia.
12. **Apuesta de otro jugador.** Borrarla devuelve `404`, la apuesta sigue existiendo y no aparece en mi listado.
13. **Borrar un juego con apuestas.** Devuelve `409`.
