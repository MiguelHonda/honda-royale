// Registro, login y perfil del propio usuario.
const express = require('express');
const bcrypt = require('bcryptjs');
const { crearToken, autenticar } = require('./auth');

function emailValido(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function nombreValido(nombre) {
  return typeof nombre === 'string' && nombre.trim().length >= 1 && nombre.trim().length <= 50;
}

// bcrypt solo tiene en cuenta los primeros 72 caracteres.
function passwordValida(password) {
  return typeof password === 'string' && password.length >= 6 && password.length <= 72;
}

function rutasUsuarios(bd, adminEmail) {
  const router = express.Router();

  // Devuelve los datos del usuario sin la contraseña.
  function buscarPerfil(id) {
    return bd.prepare('SELECT id, email, nombre, rol, saldo FROM usuarios WHERE id = ?').get(id);
  }

  router.post('/auth/register', async (req, res) => {
    const body = req.body || {};
    if (!emailValido(body.email)) {
      return res.status(400).json({ error: 'El email no tiene un formato válido' });
    }
    if (!nombreValido(body.nombre)) {
      return res.status(400).json({ error: 'El nombre debe tener entre 1 y 50 caracteres' });
    }
    if (!passwordValida(body.password)) {
      return res.status(400).json({ error: 'La contraseña debe tener entre 6 y 72 caracteres' });
    }

    const email = body.email.toLowerCase();

    // El hash se calcula antes de mirar si el email existe. Así, entre comprobar el email
    // y guardarlo no hay ninguna espera y no se pueden colar dos registros iguales.
    const hash = await bcrypt.hash(body.password, 10);

    const existe = bd.prepare('SELECT id FROM usuarios WHERE email = ?').get(email);
    if (existe) {
      return res.status(409).json({ error: 'Ese email ya está registrado' });
    }

    // El rol lo decide el servidor, nunca el cliente.
    const rol = email === adminEmail.toLowerCase() ? 'admin' : 'jugador';
    const resultado = bd
      .prepare('INSERT INTO usuarios (email, nombre, password_hash, rol) VALUES (?, ?, ?, ?)')
      .run(email, body.nombre.trim(), hash, rol);

    res.status(201).json(buscarPerfil(resultado.lastInsertRowid));
  });

  router.post('/auth/login', async (req, res) => {
    const body = req.body || {};
    const usuario = bd.prepare('SELECT * FROM usuarios WHERE email = ?').get(String(body.email).toLowerCase());

    // Si falla el email o la contraseña se responde igual, para no decir qué emails existen.
    let correcto = false;
    if (usuario && typeof body.password === 'string') {
      correcto = await bcrypt.compare(body.password, usuario.password_hash);
    }
    if (!correcto) {
      return res.status(401).json({ error: 'Email o contraseña incorrectos' });
    }

    res.json({ token: crearToken(usuario) });
  });

  router.get('/usuarios/me', autenticar(bd), (req, res) => {
    res.json(buscarPerfil(req.usuario.id));
  });

  router.patch('/usuarios/me', autenticar(bd), async (req, res) => {
    // Solo se leen nombre y password. Cualquier otro campo (rol, saldo, email) se ignora.
    const body = req.body || {};
    const quiereNombre = body.nombre !== undefined;
    const quierePassword = body.password !== undefined;

    if (!quiereNombre && !quierePassword) {
      return res.status(400).json({ error: 'Envía el nombre y/o la contraseña' });
    }
    if (quiereNombre && !nombreValido(body.nombre)) {
      return res.status(400).json({ error: 'El nombre debe tener entre 1 y 50 caracteres' });
    }
    if (quierePassword && !passwordValida(body.password)) {
      return res.status(400).json({ error: 'La contraseña debe tener entre 6 y 72 caracteres' });
    }

    if (quiereNombre) {
      bd.prepare('UPDATE usuarios SET nombre = ? WHERE id = ?').run(body.nombre.trim(), req.usuario.id);
    }
    if (quierePassword) {
      const hash = await bcrypt.hash(body.password, 10);
      bd.prepare('UPDATE usuarios SET password_hash = ? WHERE id = ?').run(hash, req.usuario.id);
    }

    res.json(buscarPerfil(req.usuario.id));
  });

  return router;
}

module.exports = { rutasUsuarios };
