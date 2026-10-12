// Funciones pequeñas que usan varias rutas.

// Lee ?pagina= y ?limite= de la URL. Devuelve null si alguno no es válido.
function leerPagina(query) {
  const pagina = Number(query.pagina || 1);
  const limite = Number(query.limite || 10);

  if (!Number.isInteger(pagina) || pagina < 1) return null;
  if (!Number.isInteger(limite) || limite < 1 || limite > 50) return null;

  return { pagina, limite, saltar: (pagina - 1) * limite };
}

// Convierte el :id de la URL en número. Si no es un entero devuelve null.
function leerId(texto) {
  const id = Number(texto);
  return Number.isInteger(id) ? id : null;
}

// En SQLite "ganada" se guarda como 0 o 1; al cliente se le envía true o false.
function formatearApuesta(apuesta) {
  return { ...apuesta, ganada: apuesta.ganada === 1 };
}

module.exports = { leerPagina, leerId, formatearApuesta };
