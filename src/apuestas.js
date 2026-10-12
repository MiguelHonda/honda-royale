// Apuestas de un juego (solo cara o cruz). Cada jugador ve y borra únicamente las suyas.
const express = require('express');
const { autenticar } = require('./auth');
const { leerPagina, leerId, formatearApuesta } = require('./util');

// "azar" es una función que devuelve un número entre 0 y 1 (normalmente Math.random).
// Se pasa de fuera para que las pruebas puedan forzar el resultado.
function rutasApuestas(bd, azar) {
  const router = express.Router();

  router.use('/juegos/:id/apuestas', autenticar(bd));

  router.post('/juegos/:id/apuestas', (req, res) => {
    const juego = bd.prepare('SELECT * FROM juegos WHERE id = ?').get(leerId(req.params.id));
    if (!juego) {
      return res.status(404).json({ error: 'Juego no encontrado' });
    }

    // Solo se leen importe y eleccion. El resultado lo decide el servidor, no el cliente.
    const { importe, eleccion } = req.body || {};
    if (!Number.isInteger(importe) || importe < 1) {
      return res.status(400).json({ error: 'El importe debe ser un entero mayor que 0' });
    }
    if (importe > juego.apuesta_max) {
      return res.status(400).json({ error: `En este juego se puede apostar como máximo ${juego.apuesta_max}` });
    }
    if (eleccion !== 'cara' && eleccion !== 'cruz') {
      return res.status(400).json({ error: 'La elección debe ser "cara" o "cruz"' });
    }

    const { saldo } = bd.prepare('SELECT saldo FROM usuarios WHERE id = ?').get(req.usuario.id);
    if (importe > saldo) {
      return res.status(409).json({ error: 'Saldo insuficiente' });
    }

    // Se lanza la moneda y se calcula el nuevo saldo.
    const resultado = azar() < 0.5 ? 'cara' : 'cruz';
    const ganada = resultado === eleccion;
    const nuevoSaldo = ganada ? saldo + importe : saldo - importe;

    // Guardar la apuesta y cambiar el saldo van juntos: si falla uno, se deshace el otro.
    let idApuesta;
    bd.exec('BEGIN');
    try {
      const insertada = bd
        .prepare('INSERT INTO apuestas (usuario_id, juego_id, importe, eleccion, resultado, ganada) VALUES (?, ?, ?, ?, ?, ?)')
        .run(req.usuario.id, juego.id, importe, eleccion, resultado, ganada ? 1 : 0);
      idApuesta = insertada.lastInsertRowid;
      bd.prepare('UPDATE usuarios SET saldo = ? WHERE id = ?').run(nuevoSaldo, req.usuario.id);
      bd.exec('COMMIT');
    } catch (error) {
      bd.exec('ROLLBACK');
      throw error;
    }

    const apuesta = bd.prepare('SELECT * FROM apuestas WHERE id = ?').get(idApuesta);
    res.status(201).json({ ...formatearApuesta(apuesta), saldo: nuevoSaldo });
  });

  router.get('/juegos/:id/apuestas', (req, res) => {
    const juego = bd.prepare('SELECT id FROM juegos WHERE id = ?').get(leerId(req.params.id));
    if (!juego) {
      return res.status(404).json({ error: 'Juego no encontrado' });
    }

    const pag = leerPagina(req.query);
    if (!pag) {
      return res.status(400).json({ error: 'pagina y limite deben ser enteros positivos (limite máximo 50)' });
    }

    // Se filtra por usuario_id para que cada jugador solo vea sus apuestas.
    const total = bd
      .prepare('SELECT COUNT(*) AS n FROM apuestas WHERE juego_id = ? AND usuario_id = ?')
      .get(juego.id, req.usuario.id).n;
    const datos = bd
      .prepare('SELECT * FROM apuestas WHERE juego_id = ? AND usuario_id = ? ORDER BY id DESC LIMIT ? OFFSET ?')
      .all(juego.id, req.usuario.id, pag.limite, pag.saltar);

    res.json({ datos: datos.map(formatearApuesta), pagina: pag.pagina, limite: pag.limite, total });
  });

  router.delete('/juegos/:id/apuestas/:apuestaId', (req, res) => {
    // Si la apuesta es de otro jugador no se encuentra, y se responde 404 igual que si no existiera.
    const apuesta = bd
      .prepare('SELECT id FROM apuestas WHERE id = ? AND juego_id = ? AND usuario_id = ?')
      .get(leerId(req.params.apuestaId), leerId(req.params.id), req.usuario.id);
    if (!apuesta) {
      return res.status(404).json({ error: 'Apuesta no encontrada' });
    }

    // Solo se quita del historial. El saldo no cambia.
    bd.prepare('DELETE FROM apuestas WHERE id = ?').run(apuesta.id);
    res.status(204).end();
  });

  return router;
}

module.exports = { rutasApuestas };
