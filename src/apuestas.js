// Recurso secundario: apuestas de un juego (solo "cara o cruz"). Cada jugador ve y borra solo las suyas.
const express = require('express');
const { autenticar } = require('./auth');
const { leerPagina, leerId, apuestaJSON } = require('./util');

// azar es una función que devuelve un número entre 0 y 1 (Math.random). Se recibe como parámetro
// para que las pruebas puedan forzar "cara" o "cruz".
function rutasApuestas(bd, azar) {
  const router = express.Router();
  router.use('/juegos/:id/apuestas', autenticar(bd));

  router.post('/juegos/:id/apuestas', (req, res) => {
    const juego = bd.prepare('SELECT * FROM juegos WHERE id = ?').get(leerId(req.params.id));
    if (!juego) return res.status(404).json({ error: 'Juego no encontrado' });

    // Solo se leen importe y eleccion: el cliente no puede decidir el resultado.
    const { importe, eleccion } = req.body ?? {};
    if (!Number.isInteger(importe) || importe < 1) {
      return res.status(400).json({ error: 'importe: entero mayor que 0' });
    }
    if (importe > juego.apuesta_max) {
      return res.status(400).json({ error: `importe: este juego admite como máximo ${juego.apuesta_max}` });
    }
    if (eleccion !== 'cara' && eleccion !== 'cruz') {
      return res.status(400).json({ error: 'eleccion: debe ser "cara" o "cruz"' });
    }

    // Saldo actual leído de la base (no del token) para no fiarnos de datos antiguos.
    const { saldo } = bd.prepare('SELECT saldo FROM usuarios WHERE id = ?').get(req.usuario.id);
    if (importe > saldo) {
      return res.status(409).json({ error: 'Saldo insuficiente' });
    }

    // La moneda la lanza el servidor.
    const resultado = azar() < 0.5 ? 'cara' : 'cruz';
    const ganada = resultado === eleccion;
    const nuevoSaldo = ganada ? saldo + importe : saldo - importe;

    // Transacción: se guarda la apuesta Y se cambia el saldo, o no se hace ninguna de las dos cosas.
    bd.exec('BEGIN');
    let id;
    try {
      id = bd
        .prepare('INSERT INTO apuestas (usuario_id, juego_id, importe, eleccion, resultado, ganada) VALUES (?, ?, ?, ?, ?, ?)')
        .run(req.usuario.id, juego.id, importe, eleccion, resultado, ganada ? 1 : 0).lastInsertRowid;
      bd.prepare('UPDATE usuarios SET saldo = ? WHERE id = ?').run(nuevoSaldo, req.usuario.id);
      bd.exec('COMMIT');
    } catch (error) {
      bd.exec('ROLLBACK');
      throw error;
    }

    const apuesta = bd.prepare('SELECT * FROM apuestas WHERE id = ?').get(id);
    res.status(201).json({ ...apuestaJSON(apuesta), saldo: nuevoSaldo });
  });

  router.get('/juegos/:id/apuestas', (req, res) => {
    const juego = bd.prepare('SELECT id FROM juegos WHERE id = ?').get(leerId(req.params.id));
    if (!juego) return res.status(404).json({ error: 'Juego no encontrado' });

    const pag = leerPagina(req.query);
    if (!pag) return res.status(400).json({ error: 'pagina y limite deben ser enteros positivos (limite máx. 50)' });

    // "usuario_id = ?" es lo que garantiza que cada jugador solo ve lo suyo.
    const total = bd
      .prepare('SELECT COUNT(*) AS n FROM apuestas WHERE juego_id = ? AND usuario_id = ?')
      .get(juego.id, req.usuario.id).n;
    const datos = bd
      .prepare('SELECT * FROM apuestas WHERE juego_id = ? AND usuario_id = ? ORDER BY id DESC LIMIT ? OFFSET ?')
      .all(juego.id, req.usuario.id, pag.limite, pag.desplazamiento);

    res.json({ datos: datos.map(apuestaJSON), pagina: pag.pagina, limite: pag.limite, total });
  });

  router.delete('/juegos/:id/apuestas/:apuestaId', (req, res) => {
    // Si la apuesta existe pero es de otro jugador, no coincide el usuario_id y se responde 404 igualmente.
    const apuesta = bd
      .prepare('SELECT id FROM apuestas WHERE id = ? AND juego_id = ? AND usuario_id = ?')
      .get(leerId(req.params.apuestaId), leerId(req.params.id), req.usuario.id);
    if (!apuesta) return res.status(404).json({ error: 'Apuesta no encontrada' });

    // Solo se borra del historial: el saldo no se toca (si no, se podrían "deshacer" las pérdidas).
    bd.prepare('DELETE FROM apuestas WHERE id = ?').run(apuesta.id);
    res.status(204).end();
  });

  return router;
}

module.exports = { rutasApuestas };
