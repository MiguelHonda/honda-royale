// Crea la aplicación Express y le conecta las rutas. El puerto se abre en server.js.
const express = require('express');
const { abrirBD } = require('./db');
const { rutasUsuarios } = require('./usuarios');
const { rutasJuegos } = require('./juegos');
const { rutasApuestas } = require('./apuestas');

// Las opciones sirven para que las pruebas usen una base en memoria y un azar controlado.
function crearApp({
  bd = abrirBD(),
  azar = Math.random,
  adminEmail = process.env.ADMIN_EMAIL || 'admin@casino.es',
} = {}) {
  const app = express();
  app.use(express.json());

  app.use(rutasUsuarios(bd, adminEmail));
  app.use(rutasJuegos(bd));
  app.use(rutasApuestas(bd, azar));

  // Ninguna ruta coincide.
  app.use((req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
  });

  // Errores: JSON mal formado (400) o cualquier fallo inesperado (500).
  app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'JSON mal formado' });
    }
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  });

  return app;
}

module.exports = { crearApp };
