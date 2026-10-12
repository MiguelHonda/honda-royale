// Registro, login y perfil propio. La lógica está dentro de cada ruta a propósito: es corta.
const express = require('express');
const bcrypt = require('bcryptjs');
const { crearToken, autenticar } = require('./auth');

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const perfil = (u) => ({ id: u.id, email: u.email, nombre: u.nombre, rol: u.rol, saldo: u.saldo });

// Validadores: devuelven un mensaje de error o null si el valor es correcto.
const errorNombre = (n) => (typeof n === 'string' && n.trim().length >= 1 && n.trim().length <= 50 ? null : 'nombre: entre 1 y 50 caracteres');
// 72 es el máximo que bcrypt tiene en cuenta.
const errorPassword = (p) => (typeof p === 'string' && p.length >= 6 && p.length <= 72 ? null : 'password: entre 6 y 72 caracteres');

function rutasUsuarios(bd, adminEmail) {
  const router = express.Router();

  router.post('/auth/register', async (req, res) => {
    const { email, nombre, password } = req.body ?? {};
    const error =
      (typeof email === 'string' && EMAIL.test(email) ? null : 'email: formato no válido') ||
      errorNombre(nombre) ||
      errorPassword(password);
    if (error) return res.status(400).json({ error });

    const emailNormal = email.trim().toLowerCase();
    // Se calcula el hash ANTES de consultar la base. Después de este await no hay más esperas,
    // así que "comprobar que no existe" e "insertar" ocurren seguidos y sin que nadie se cuele.
    const hash = await bcrypt.hash(password, 10);

    if (bd.prepare('SELECT 1 FROM usuarios WHERE email = ?').get(emailNormal)) {
      return res.status(409).json({ error: 'Ese email ya está registrado' });
    }
    // El rol nunca viene del cliente: lo decide el servidor.
    const rol = emailNormal === adminEmail.toLowerCase() ? 'admin' : 'jugador';
    const r = bd
      .prepare('INSERT INTO usuarios (email, nombre, password_hash, rol) VALUES (?, ?, ?, ?)')
      .run(emailNormal, nombre.trim(), hash, rol);

    const usuario = bd.prepare('SELECT id, email, nombre, rol, saldo FROM usuarios WHERE id = ?').get(r.lastInsertRowid);
    res.status(201).json(perfil(usuario));
  });

  router.post('/auth/login', async (req, res) => {
    const { email, password } = req.body ?? {};
    const usuario =
      typeof email === 'string' ? bd.prepare('SELECT * FROM usuarios WHERE email = ?').get(email.trim().toLowerCase()) : null;
    // Mismo mensaje si falla el email o la contraseña: así no se revela qué emails existen.
    const ok = usuario && typeof password === 'string' && (await bcrypt.compare(password, usuario.password_hash));
    if (!ok) return res.status(401).json({ error: 'Email o contraseña incorrectos' });

    res.json({ token: crearToken(usuario) });
  });

  router.get('/usuarios/me', autenticar(bd), (req, res) => {
    res.json(perfil(req.usuario));
  });

  router.patch('/usuarios/me', autenticar(bd), async (req, res) => {
    // Solo se leen nombre y password: cualquier otro campo (rol, saldo, email...) se ignora.
    const { nombre, password } = req.body ?? {};
    if (nombre === undefined && password === undefined) {
      return res.status(400).json({ error: 'Envía nombre y/o password' });
    }
    const error = (nombre !== undefined && errorNombre(nombre)) || (password !== undefined && errorPassword(password));
    if (error) return res.status(400).json({ error });

    if (nombre !== undefined) {
      bd.prepare('UPDATE usuarios SET nombre = ? WHERE id = ?').run(nombre.trim(), req.usuario.id);
    }
    if (password !== undefined) {
      const hash = await bcrypt.hash(password, 10);
      bd.prepare('UPDATE usuarios SET password_hash = ? WHERE id = ?').run(hash, req.usuario.id);
    }
    const usuario = bd.prepare('SELECT id, email, nombre, rol, saldo FROM usuarios WHERE id = ?').get(req.usuario.id);
    res.json(perfil(usuario));
  });

  return router;
}

module.exports = { rutasUsuarios };
