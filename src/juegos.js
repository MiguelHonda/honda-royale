// Juegos: cualquier usuario con sesión puede verlos, solo el admin puede crearlos, modificarlos y borrarlos.
const express = require('express');
const { autenticar, soloAdmin } = require('./auth');
const { leerPagina, leerId, formatearApuesta } = require('./util');

// Comprueba los datos de un juego. "base" son los valores de partida: los de un juego nuevo
// al crear, o los del juego actual al modificar (lo que no se envía se queda como estaba).
// Devuelve { juego } con los valores finales o { error } con el motivo.
function leerJuego(body, base) {
  const nombre = body.nombre === undefined ? base.nombre : body.nombre;
  const descripcion = body.descripcion === undefined ? base.descripcion : body.descripcion;
  const apuestaMax = body.apuesta_max === undefined ? base.apuesta_max : body.apuesta_max;

  if (typeof nombre !== 'string' || nombre.trim().length < 1 || nombre.trim().length > 60) {
    return { error: 'El nombre debe tener entre 1 y 60 caracteres' };
  }
  if (typeof descripcion !== 'string' || descripcion.length > 300) {
    return { error: 'La descripción no puede pasar de 300 caracteres' };
  }
  if (!Number.isInteger(apuestaMax) || apuestaMax < 1 || apuestaMax > 1000000) {
    return { error: 'La apuesta máxima debe ser un entero entre 1 y 1000000' };
  }

  return { juego: { nombre: nombre.trim(), descripcion, apuesta_max: apuestaMax } };
}

function rutasJuegos(bd) {
  const router = express.Router();

  // Todas las rutas de /juegos necesitan estar identificado.
  router.use('/juegos', autenticar(bd));

  function buscarJuego(id) {
    return bd.prepare('SELECT * FROM juegos WHERE id = ?').get(id);
  }

  // Listado con búsqueda (?q=) y paginación (?pagina= y ?limite=).
  router.get('/juegos', (req, res) => {
    const pag = leerPagina(req.query);
    if (!pag) {
      return res.status(400).json({ error: 'pagina y limite deben ser enteros positivos (limite máximo 50)' });
    }

    let donde = '';
    const valores = [];
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (q) {
      // instr busca el texto tal cual (un % no hace de comodín) y lower ignora las mayúsculas.
      donde = 'WHERE instr(lower(nombre), lower(?)) > 0 OR instr(lower(descripcion), lower(?)) > 0';
      valores.push(q, q);
    }

    const total = bd.prepare(`SELECT COUNT(*) AS n FROM juegos ${donde}`).get(...valores).n;
    const datos = bd
      .prepare(`SELECT * FROM juegos ${donde} ORDER BY id LIMIT ? OFFSET ?`)
      .all(...valores, pag.limite, pag.saltar);

    res.json({ datos, pagina: pag.pagina, limite: pag.limite, total });
  });

  router.get('/juegos/:id', (req, res) => {
    const juego = buscarJuego(leerId(req.params.id));
    if (!juego) {
      return res.status(404).json({ error: 'Juego no encontrado' });
    }

    // Mis 5 últimas apuestas en este juego.
    const ultimas = bd
      .prepare('SELECT * FROM apuestas WHERE juego_id = ? AND usuario_id = ? ORDER BY id DESC LIMIT 5')
      .all(juego.id, req.usuario.id);

    res.json({ ...juego, ultimasApuestas: ultimas.map(formatearApuesta) });
  });

  router.post('/juegos', soloAdmin, (req, res) => {
    const valoresIniciales = { nombre: undefined, descripcion: '', apuesta_max: 100 };
    const { juego, error } = leerJuego(req.body || {}, valoresIniciales);
    if (error) {
      return res.status(400).json({ error });
    }

    const repetido = bd.prepare('SELECT id FROM juegos WHERE nombre = ?').get(juego.nombre);
    if (repetido) {
      return res.status(409).json({ error: 'Ya existe un juego con ese nombre' });
    }

    const resultado = bd
      .prepare('INSERT INTO juegos (nombre, descripcion, apuesta_max) VALUES (?, ?, ?)')
      .run(juego.nombre, juego.descripcion, juego.apuesta_max);

    res.status(201).json(buscarJuego(resultado.lastInsertRowid));
  });

  router.patch('/juegos/:id', soloAdmin, (req, res) => {
    const actual = buscarJuego(leerId(req.params.id));
    if (!actual) {
      return res.status(404).json({ error: 'Juego no encontrado' });
    }

    const body = req.body || {};
    if (body.nombre === undefined && body.descripcion === undefined && body.apuesta_max === undefined) {
      return res.status(400).json({ error: 'No hay nada que modificar' });
    }

    const { juego, error } = leerJuego(body, actual);
    if (error) {
      return res.status(400).json({ error });
    }

    const repetido = bd.prepare('SELECT id FROM juegos WHERE nombre = ? AND id != ?').get(juego.nombre, actual.id);
    if (repetido) {
      return res.status(409).json({ error: 'Ya existe un juego con ese nombre' });
    }

    bd.prepare('UPDATE juegos SET nombre = ?, descripcion = ?, apuesta_max = ? WHERE id = ?').run(
      juego.nombre,
      juego.descripcion,
      juego.apuesta_max,
      actual.id
    );

    res.json(buscarJuego(actual.id));
  });

  router.delete('/juegos/:id', soloAdmin, (req, res) => {
    const juego = buscarJuego(leerId(req.params.id));
    if (!juego) {
      return res.status(404).json({ error: 'Juego no encontrado' });
    }

    // Si ya hay apuestas no se borra, para no perder el historial de los jugadores.
    const conApuestas = bd.prepare('SELECT id FROM apuestas WHERE juego_id = ?').get(juego.id);
    if (conApuestas) {
      return res.status(409).json({ error: 'El juego tiene apuestas y no se puede borrar' });
    }

    bd.prepare('DELETE FROM juegos WHERE id = ?').run(juego.id);
    res.status(204).end();
  });

  return router;
}

module.exports = { rutasJuegos };
