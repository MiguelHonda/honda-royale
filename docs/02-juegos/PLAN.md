# Iteración 2 · PLAN

## Archivos

| Archivo | Cambio |
|---|---|
| `src/db.js` | Añade la tabla `juegos` (`id`, `nombre` UNIQUE, `descripcion`, `apuesta_max`) |
| `src/juegos.js` | **Nuevo.** Las 5 rutas con su lógica y validación |
| `src/app.js` | Monta `rutasJuegos` |
| `test/juegos.test.js` | **Nuevo.** Pruebas CA2.1 … CA2.12 |

## Decisiones

- **Permisos**: todo el router pasa primero por `autenticar` (401). Crear, modificar y borrar añaden `soloAdmin` (403).
- **Orden de comprobaciones**: 401 → 403 → 404 → 400 → 409. Así un jugador recibe 403 aunque mande datos malos.
- **Búsqueda**: `instr(lower(nombre), lower(?))`. Evita los comodines `%` y `_` de `LIKE` y no hay que escapar nada.
- **Paginación**: `LIMIT ? OFFSET ?` y un `COUNT(*)` con el mismo filtro para `total`.
- **Modificación parcial**: se valida solo lo que llega y se construye el `UPDATE` con esas columnas (los nombres de columna salen de una lista fija, nunca del cliente).
- **`ultimasApuestas`**: se devuelve `[]` hasta la iteración 3, para que el contrato de la respuesta ya esté fijado.
