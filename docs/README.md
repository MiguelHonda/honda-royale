# Documentación SDD (Spec-Driven Development)

Se trabaja en 3 iteraciones pequeñas. En cada una el orden es siempre el mismo:

1. **SPEC.md**: qué debe hacer el sistema, con criterios de aceptación numerados.
2. **PLAN.md**: cómo se va a construir (archivos, rutas, decisiones).
3. **Código + pruebas**: cada prueba cita en su nombre el criterio que comprueba (`[CA1.5]`).
4. **RESULTADOS.md**: salida real de `npm test` al terminar la iteración.

| Iteración | Carpeta |
|---|---|
| 1. Usuarios y autenticación | `01-usuarios-y-auth/` |
| 2. Juegos | `02-juegos/` |
| 3. Apuestas (cara o cruz) | `03-apuestas/` |

## Reglas generales (valen para las 3 iteraciones)

- El servidor decide todo lo importante (resultado de la apuesta, permisos, saldo). Nunca se fía del cliente.
- El saldo es un número entero de fichas y **nunca** puede ser negativo.
- Errores en JSON `{ "error": "mensaje" }` con el código HTTP correcto: 400 datos inválidos, 401 sin sesión, 403 sin permiso, 404 no existe, 409 conflicto.
- Solo backend: se prueba con peticiones HTTP automatizadas.
