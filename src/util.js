// Funciones pequeñas que usan varias rutas.

// Lee ?pagina=2&limite=10 de la URL. Devuelve null si algún valor no es un entero válido.
function leerPagina(query) {
  const entero = (valor, porDefecto) => (valor === undefined ? porDefecto : /^\d+$/.test(valor) ? Number(valor) : NaN);
  const pagina = entero(query.pagina, 1);
  const limite = entero(query.limite, 10);
  if (!(pagina >= 1) || !(limite >= 1 && limite <= 50)) return null;
  return { pagina, limite, desplazamiento: (pagina - 1) * limite };
}

// Convierte un parámetro de la URL (":id") en entero, o null si no lo es.
function leerId(texto) {
  return /^\d+$/.test(texto) ? Number(texto) : null;
}

// SQLite guarda "ganada" como 0/1; al cliente le enviamos un booleano.
const apuestaJSON = (a) => ({ ...a, ganada: a.ganada === 1 });

module.exports = { leerPagina, leerId, apuestaJSON };
