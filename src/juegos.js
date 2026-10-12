// Recurso principal: juegos. Todos los usuarios con sesión pueden verlos; solo el admin los gestiona.
const express = require('express');
const { autenticar, soloAdmin } = require('./auth');
const { leerPagina, leerId, apuestaJSON } = require('./util');

// Valida el body. Con completo=true el nombre es obligatorio (crear); si no, solo se valida lo que llegue (modificar).
// Devuelve { datos } con los campos ya limpios, o { error }.
function validar(body, completo) {
  const { nombre, descripcion, apuesta_max } = body ?? {};
  const datos = {};

  if (nombre !== undefined || completo) {
    if (typeof nombre !== 'string' || nombre.trim().length < 1 || nombre.trim().length > 60) {
      return { error: 'nombre: entre 1 y 60 caracteres' };
    }
    datos.nombre = nombre.trim();
  }
  if (descripcion !== undefined) {
    if (typeof descripcion !== 'string' || descripcion.length > 300) {
      return { error: 'descripcion: texto de hasta 300 caracteres' };
    }
    datos.descripcion = descripcion;
  }
  if (apuesta_max !== undefined) {
    if (!Number.isInteger(apuesta_max) || apuesta_max < 1 || apuesta_max > 1000000) {
      return { error: 'apuesta_max: entero entre 1 y 1000000' };
    }
    datos.apuesta_max = apuesta_max;
  }
  return { datos };
}

function rutasJuegos(bd) {
  const router = express.Router();
  // Todo lo que empieza por /juegos exige sesión (401 si no hay token válido).
  router.use('/juegos', autenticar(bd));

  const buscar = (id) => bd.prepare('SELECT * FROM juegos WHERE id = ?').get(id);

  // Listado: búsqueda por texto + paginación.
  router.get('/juegos', (req, res) => {
    const pag = leerPagina(req.query);
    if (!pag) return res.status(400).json({ error: 'pagina y limite deben ser enteros positivos (limite máx. 50)' });

    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    // instr() busca el texto tal cual (sin comodines) y lower() ignora mayúsculas.
    const filtro = q ? 'WHERE instr(lower(nombre), lower(?)) > 0 OR instr(lower(descripcion), lower(?)) > 0' : '';
    const params = q ? [q, q] : [];

    const total = bd.prepare(`SELECT COUNT(*) AS n FROM juegos ${filtro}`).get(...params).n;
    const datos = bd
      .prepare(`SELECT * FROM juegos ${filtro} ORDER BY id LIMIT ? OFFSET ?`)
      .all(...params, pag.limite, pag.desplazamiento);

    res.json({ datos, pagina: pag.pagina, limite: pag.limite, total });
  });

  router.get('/juegos/:id', (req, res) => {
    const juego = buscar(leerId(req.params.id));
    if (!juego) return res.status(404).json({ error: 'Juego no encontrado' });
    // Recurso relacionado: mis 5 últimas apuestas en este juego (nunca las de otros jugadores).
    const ultimas = bd
      .prepare('SELECT * FROM apuestas WHERE juego_id = ? AND usuario_id = ? ORDER BY id DESC LIMIT 5')
      .all(juego.id, req.usuario.id);
    res.json({ ...juego, ultimasApuestas: ultimas.map(apuestaJSON) });
  });

  router.post('/juegos', soloAdmin, (req, res) => {
    const { datos, error } = validar(req.body, true);
    if (error) return res.status(400).json({ error });

    if (bd.prepare('SELECT 1 FROM juegos WHERE nombre = ?').get(datos.nombre)) {
      return res.status(409).json({ error: 'Ya existe un juego con ese nombre' });
    }
    const r = bd
      .prepare('INSERT INTO juegos (nombre, descripcion, apuesta_max) VALUES (?, ?, ?)')
      .run(datos.nombre, datos.descripcion ?? '', datos.apuesta_max ?? 100);
    res.status(201).json(buscar(r.lastInsertRowid));
  });

  router.patch('/juegos/:id', soloAdmin, (req, res) => {
    const juego = buscar(leerId(req.params.id));
    if (!juego) return res.status(404).json({ error: 'Juego no encontrado' });

    const { datos, error } = validar(req.body, false);
    if (error) return res.status(400).json({ error });
    const columnas = Object.keys(datos);
    if (columnas.length === 0) return res.status(400).json({ error: 'No hay nada que modificar' });

    if (datos.nombre && bd.prepare('SELECT 1 FROM juegos WHERE nombre = ? AND id != ?').get(datos.nombre, juego.id)) {
      return res.status(409).json({ error: 'Ya existe un juego con ese nombre' });
    }
    // Los nombres de columna salen de validar() (lista fija), nunca directamente del cliente.
    const set = columnas.map((c) => `${c} = ?`).join(', ');
    bd.prepare(`UPDATE juegos SET ${set} WHERE id = ?`).run(...columnas.map((c) => datos[c]), juego.id);
    res.json(buscar(juego.id));
  });

  router.delete('/juegos/:id', soloAdmin, (req, res) => {
    const juego = buscar(leerId(req.params.id));
    if (!juego) return res.status(404).json({ error: 'Juego no encontrado' });
    // Si alguien ya apostó, se conserva el juego para no perder su historial.
    if (bd.prepare('SELECT 1 FROM apuestas WHERE juego_id = ?').get(juego.id)) {
      return res.status(409).json({ error: 'El juego tiene apuestas y no se puede borrar' });
    }
    bd.prepare('DELETE FROM juegos WHERE id = ?').run(juego.id);
    res.status(204).end();
  });

  return router;
}

module.exports = { rutasJuegos };
