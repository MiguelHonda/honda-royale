// Base de datos SQLite con el módulo node:sqlite (viene incluido en Node, no hay que instalar nada).
const { DatabaseSync } = require('node:sqlite');

// ':memory:' crea una base temporal (la usan las pruebas); un nombre de fichero la hace persistente.
function abrirBD(ruta = process.env.BD_RUTA || 'datos.sqlite') {
  const bd = new DatabaseSync(ruta);
  bd.exec('PRAGMA foreign_keys = ON');

  // CHECK (saldo >= 0): aunque el código fallase, la propia base impediría un saldo negativo.
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
  `);
  return bd;
}

module.exports = { abrirBD };
