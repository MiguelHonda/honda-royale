// Construye la aplicación Express. No abre el puerto: eso lo hace server.js
// (así las pruebas pueden usar la app directamente con supertest).
const express = require('express');
const { abrirBD } = require('./db');
const { rutasUsuarios } = require('./usuarios');

// Las opciones permiten a las pruebas inyectar una base en memoria y un "azar" controlado.
function crearApp({
  bd = abrirBD(),
  azar = Math.random,
  adminEmail = process.env.ADMIN_EMAIL || 'admin@casino.es',
} = {}) {
  const app = express();
  app.use(express.json());

  app.use(rutasUsuarios(bd, adminEmail));

  // Si ninguna ruta respondió: 404.
  app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

  // Manejador de errores (Express lo reconoce por tener 4 parámetros).
  app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON mal formado' });
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  });

  return app;
}

module.exports = { crearApp };
