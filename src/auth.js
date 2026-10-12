// Crear y comprobar el token JWT.
const jwt = require('jsonwebtoken');

// En producción hay que definir JWT_SECRET; el valor por defecto es solo para desarrollo.
const SECRETO = process.env.JWT_SECRET || 'secreto-solo-para-desarrollo';

// Se llama en el login. El token lleva el id del usuario y caduca en 1 hora.
function crearToken(usuario) {
  return jwt.sign({ sub: String(usuario.id) }, SECRETO, { expiresIn: '1h' });
}

// Middleware: comprueba la cabecera "Authorization: Bearer <token>" y deja el usuario en req.usuario.
function autenticar(bd) {
  return (req, res, next) => {
    const cabecera = req.headers.authorization || '';
    const [tipo, token] = cabecera.split(' ');
    if (tipo !== 'Bearer' || !token) {
      return res.status(401).json({ error: 'Falta el token (Authorization: Bearer ...)' });
    }

    let datos;
    try {
      datos = jwt.verify(token, SECRETO);
    } catch {
      return res.status(401).json({ error: 'Token inválido o caducado' });
    }

    const usuario = bd
      .prepare('SELECT id, email, nombre, rol, saldo FROM usuarios WHERE id = ?')
      .get(Number(datos.sub));
    if (!usuario) {
      return res.status(401).json({ error: 'El usuario del token no existe' });
    }

    req.usuario = usuario;
    next();
  };
}

// Se pone después de autenticar: solo deja pasar a los administradores.
function soloAdmin(req, res, next) {
  if (req.usuario.rol !== 'admin') {
    return res.status(403).json({ error: 'Solo un administrador puede hacer esto' });
  }
  next();
}

module.exports = { crearToken, autenticar, soloAdmin };
