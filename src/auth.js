// Todo lo relacionado con el JWT: crearlo (login) y comprobarlo (cada petición protegida).
const jwt = require('jsonwebtoken');

// En un despliegue real hay que definir JWT_SECRET; el valor por defecto es solo para desarrollo.
const SECRETO = process.env.JWT_SECRET || 'secreto-solo-para-desarrollo';

// El token solo lleva el id del usuario. Lo firma el servidor, así el cliente no puede falsificarlo.
function crearToken(usuario) {
  return jwt.sign({ sub: String(usuario.id) }, SECRETO, { algorithm: 'HS256', expiresIn: '1h' });
}

// Middleware: exige "Authorization: Bearer <token>" y deja el usuario en req.usuario.
function autenticar(bd) {
  return (req, res, next) => {
    const [tipo, token] = (req.headers.authorization || '').split(' ');
    if (tipo !== 'Bearer' || !token) {
      return res.status(401).json({ error: 'Falta el token (Authorization: Bearer ...)' });
    }

    let datos;
    try {
      // verify comprueba la firma y la caducidad; si algo falla lanza una excepción.
      datos = jwt.verify(token, SECRETO, { algorithms: ['HS256'] });
    } catch {
      return res.status(401).json({ error: 'Token inválido o caducado' });
    }

    // Se vuelve a leer el usuario de la base de datos para tener su rol y saldo actuales
    // (y para rechazar tokens de usuarios que ya no existen).
    const usuario = bd
      .prepare('SELECT id, email, nombre, rol, saldo FROM usuarios WHERE id = ?')
      .get(Number(datos.sub));
    if (!usuario) return res.status(401).json({ error: 'El usuario del token no existe' });

    req.usuario = usuario;
    next();
  };
}

// Middleware que se pone después de "autenticar": solo deja pasar a los administradores.
function soloAdmin(req, res, next) {
  if (req.usuario.rol !== 'admin') {
    return res.status(403).json({ error: 'Solo un administrador puede hacer esto' });
  }
  next();
}

module.exports = { crearToken, autenticar, soloAdmin };
