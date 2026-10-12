// Base de datos SQLite con el módulo node:sqlite (viene incluido en Node).
const { DatabaseSync } = require('node:sqlite');

// Con ':memory:' la base se guarda en memoria (para las pruebas); con un nombre de fichero se guarda en disco.
function abrirBD(ruta = process.env.BD_RUTA || 'datos.sqlite') {
  const bd = new DatabaseSync(ruta);
  bd.exec('PRAGMA foreign_keys = ON');

  bd.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      email         TEXT NOT NULL UNIQUE,
      nombre        TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      rol           TEXT NOT NULL DEFAULT 'jugador',
      saldo         INTEGER NOT NULL DEFAULT 100 CHECK (saldo >= 0)
    );

    CREATE TABLE IF NOT EXISTS juegos (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre      TEXT NOT NULL UNIQUE,
      descripcion TEXT NOT NULL DEFAULT '',
      apuesta_max INTEGER NOT NULL DEFAULT 100 CHECK (apuesta_max >= 1)
    );

    CREATE TABLE IF NOT EXISTS apuestas (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
      juego_id   INTEGER NOT NULL REFERENCES juegos(id),
      importe    INTEGER NOT NULL CHECK (importe >= 1),
      eleccion   TEXT NOT NULL CHECK (eleccion IN ('cara', 'cruz')),
      resultado  TEXT NOT NULL CHECK (resultado IN ('cara', 'cruz')),
      ganada     INTEGER NOT NULL,
      creada     TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  return bd;
}

module.exports = { abrirBD };
