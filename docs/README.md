# Documentación SDD

El proyecto se desarrolla en 3 iteraciones pequeñas. En cada una se sigue el mismo orden:

1. **SPEC.md**: qué debe hacer el sistema, con una lista numerada de criterios.
2. **PLAN.md**: cómo se va a construir (archivos y decisiones).
3. **Código y pruebas**: cada prueba empieza por el número del criterio que comprueba ("criterio 3: ...").
4. **RESULTADOS.md**: la salida real de `npm test` al terminar.

| Iteración | Carpeta |
|---|---|
| 1. Usuarios y autenticación | `01-usuarios-y-auth/` |
| 2. Juegos | `02-juegos/` |
| 3. Apuestas (cara o cruz) | `03-apuestas/` |

## Reglas generales

- El servidor decide todo lo importante: el resultado de la apuesta, los permisos y el saldo.
- El saldo es un número entero de fichas y nunca puede ser negativo.
- Los errores se devuelven como `{ "error": "mensaje" }` con su código HTTP: 400 datos inválidos, 401 sin sesión, 403 sin permiso, 404 no existe, 409 conflicto.
- Es solo backend: se prueba con peticiones HTTP automatizadas.
