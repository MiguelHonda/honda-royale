# Iteración 2 · PLAN

## Archivos

| Archivo | Cambio |
|---|---|
| `src/db.js` | Añade la tabla `juegos` (`id`, `nombre` único, `descripcion`, `apuesta_max`) |
| `src/juegos.js` | **Nuevo.** Las 5 rutas con su validación |
| `src/app.js` | Monta las rutas de juegos |
| `test/juegos.test.js` | **Nuevo.** Pruebas de los criterios 1 a 12 |

## Decisiones

- **Permisos**: todas las rutas de `/juegos` pasan primero por `autenticar` (401). Crear, modificar y borrar pasan además por `soloAdmin` (403).
- **Orden de comprobaciones**: 401, 403, 404, 400 y 409.
- **Búsqueda**: se usa `instr(lower(...))` en lugar de `LIKE` para que los símbolos `%` y `_` se busquen como texto normal.
- **Paginación**: `LIMIT` y `OFFSET`, más un `COUNT(*)` con el mismo filtro para el `total`.
- **Modificar**: lo que no se envía se queda como estaba, y se validan los valores finales.
- **`ultimasApuestas`**: de momento es una lista vacía; la iteración 3 la rellena.
