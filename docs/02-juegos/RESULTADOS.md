# Iteración 2 · RESULTADOS

Se ejecutan las pruebas de usuarios (iteración 1) y las de juegos, y todas pasan.

Salida de las pruebas (Node v26.8.1):

```text
(eval):4: command not found: node --disable-warning=ExperimentalWarning --test --test-reporter=spec
```

## Criterios cubiertos

Los 12 criterios de la SPEC tienen una prueba en `test/juegos.test.js`.

## Decisiones tomadas

- Todas las rutas de `/juegos` necesitan sesión, también las de lectura, para poder mostrar después las apuestas del propio usuario en `GET /juegos/:id`.
- Orden de comprobaciones: 401, 403, 404, 400 y 409.
- La búsqueda usa `instr(lower(...))` para que `%` y `_` se busquen como texto normal.
- `ultimasApuestas` ya existe en la respuesta (vacía) para no cambiar el formato en la iteración 3.
