// Iteración 2: juegos. Cada nombre de test cita el criterio de docs/02-juegos/SPEC.md.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { crearApp } = require('../src/app');
const { abrirBD } = require('../src/db');

// Crea una app aislada con un admin y un jugador ya registrados, y sus cabeceras de autorización.
async function preparar() {
  const api = request(crearApp({ bd: abrirBD(':memory:'), adminEmail: 'admin@casino.es' }));
  const entrar = async (email, nombre) => {
    await api.post('/auth/register').send({ email, nombre, password: 'clave-123' });
    const r = await api.post('/auth/login').send({ email, password: 'clave-123' });
    return ['Authorization', `Bearer ${r.body.token}`];
  };
  const admin = await entrar('admin@casino.es', 'Admin');
  const jugador = await entrar('luis@correo.es', 'Luis');
  const crear = (cuerpo) => api.post('/juegos').set(...admin).send(cuerpo);
  return { api, admin, jugador, crear };
}

test('[CA2.1] el admin crea un juego → 201 con sus campos', async () => {
  const { crear } = await preparar();
  const r = await crear({ nombre: 'Cara o cruz VIP', descripcion: 'Mesa grande', apuesta_max: 500 });
  assert.equal(r.status, 201);
  assert.equal(r.body.nombre, 'Cara o cruz VIP');
  assert.equal(r.body.descripcion, 'Mesa grande');
  assert.equal(r.body.apuesta_max, 500);
  assert.ok(r.body.id);

  const porDefecto = await crear({ nombre: 'Mesa básica' });
  assert.equal(porDefecto.body.apuesta_max, 100);
});

test('[CA2.2] un jugador no puede crear, modificar ni borrar → 403', async () => {
  const { api, jugador, crear } = await preparar();
  const { body: juego } = await crear({ nombre: 'Mesa 1' });
  assert.equal((await api.post('/juegos').set(...jugador).send({ nombre: 'Otra' })).status, 403);
  assert.equal((await api.patch(`/juegos/${juego.id}`).set(...jugador).send({ nombre: 'X' })).status, 403);
  assert.equal((await api.delete(`/juegos/${juego.id}`).set(...jugador)).status, 403);
});

test('[CA2.3] sin token, las rutas de /juegos dan 401', async () => {
  const { api } = await preparar();
  assert.equal((await api.get('/juegos')).status, 401);
  assert.equal((await api.get('/juegos/1')).status, 401);
  assert.equal((await api.post('/juegos').send({ nombre: 'A' })).status, 401);
  assert.equal((await api.patch('/juegos/1').send({ nombre: 'A' })).status, 401);
  assert.equal((await api.delete('/juegos/1')).status, 401);
});

test('[CA2.4] crear con datos inválidos → 400', async () => {
  const { crear } = await preparar();
  const malos = [
    {},
    { nombre: '' },
    { nombre: 42 },
    { nombre: 'Ok', apuesta_max: 0 },
    { nombre: 'Ok', apuesta_max: -5 },
    { nombre: 'Ok', apuesta_max: 10.5 },
    { nombre: 'Ok', apuesta_max: '100' },
  ];
  for (const cuerpo of malos) {
    assert.equal((await crear(cuerpo)).status, 400, JSON.stringify(cuerpo));
  }
});

test('[CA2.5] nombre repetido al crear o al modificar → 409', async () => {
  const { api, admin, crear } = await preparar();
  await crear({ nombre: 'Mesa A' });
  const { body: b } = await crear({ nombre: 'Mesa B' });
  assert.equal((await crear({ nombre: 'Mesa A' })).status, 409);
  assert.equal((await api.patch(`/juegos/${b.id}`).set(...admin).send({ nombre: 'Mesa A' })).status, 409);
  // Dejarle su propio nombre no es un conflicto.
  assert.equal((await api.patch(`/juegos/${b.id}`).set(...admin).send({ nombre: 'Mesa B' })).status, 200);
});

test('[CA2.6] GET /juegos/:id devuelve el juego con ultimasApuestas', async () => {
  const { api, jugador, crear } = await preparar();
  const { body: juego } = await crear({ nombre: 'Mesa 1' });
  const r = await api.get(`/juegos/${juego.id}`).set(...jugador);
  assert.equal(r.status, 200);
  assert.equal(r.body.nombre, 'Mesa 1');
  assert.deepEqual(r.body.ultimasApuestas, []);
});

test('[CA2.7] id inexistente o no numérico → 404 en GET, PATCH y DELETE', async () => {
  const { api, admin } = await preparar();
  for (const id of ['999', 'abc']) {
    assert.equal((await api.get(`/juegos/${id}`).set(...admin)).status, 404);
    assert.equal((await api.patch(`/juegos/${id}`).set(...admin).send({ nombre: 'X' })).status, 404);
    assert.equal((await api.delete(`/juegos/${id}`).set(...admin)).status, 404);
  }
});

test('[CA2.8] el listado es paginado: datos, pagina, limite y total', async () => {
  const { api, jugador, crear } = await preparar();
  for (let i = 1; i <= 12; i++) await crear({ nombre: `Mesa ${String(i).padStart(2, '0')}` });

  const p1 = await api.get('/juegos').set(...jugador);
  assert.equal(p1.status, 200);
  assert.equal(p1.body.datos.length, 10);
  assert.equal(p1.body.pagina, 1);
  assert.equal(p1.body.limite, 10);
  assert.equal(p1.body.total, 12);

  const p2 = await api.get('/juegos?pagina=2').set(...jugador);
  assert.equal(p2.body.datos.length, 2);
  assert.equal(p2.body.datos[0].nombre, 'Mesa 11');

  const corto = await api.get('/juegos?limite=5&pagina=3').set(...jugador);
  assert.equal(corto.body.datos.length, 2);
});

test('[CA2.9] ?q= busca en nombre y descripción sin distinguir mayúsculas', async () => {
  const { api, jugador, crear } = await preparar();
  await crear({ nombre: 'Mesa Dorada', descripcion: 'Para valientes' });
  await crear({ nombre: 'Mesa Plata', descripcion: 'Con premio DORADO' });
  await crear({ nombre: 'Mesa Bronce', descripcion: 'Tranquila' });

  const r = await api.get('/juegos?q=dorad').set(...jugador);
  assert.equal(r.body.total, 2);
  assert.deepEqual(r.body.datos.map((j) => j.nombre), ['Mesa Dorada', 'Mesa Plata']);

  assert.equal((await api.get('/juegos?q=zzz').set(...jugador)).body.total, 0);
  // El % no es un comodín: se busca literalmente.
  assert.equal((await api.get('/juegos?q=%25').set(...jugador)).body.total, 0);
});

test('[CA2.10] pagina o limite inválidos → 400', async () => {
  const { api, jugador } = await preparar();
  for (const consulta of ['pagina=0', 'pagina=-1', 'pagina=abc', 'limite=0', 'limite=51', 'limite=x']) {
    assert.equal((await api.get(`/juegos?${consulta}`).set(...jugador)).status, 400, consulta);
  }
});

test('[CA2.11] PATCH parcial cambia solo lo enviado; vacío → 400', async () => {
  const { api, admin, crear } = await preparar();
  const { body: juego } = await crear({ nombre: 'Mesa 1', descripcion: 'Original', apuesta_max: 50 });
  const r = await api.patch(`/juegos/${juego.id}`).set(...admin).send({ apuesta_max: 200 });
  assert.equal(r.status, 200);
  assert.equal(r.body.apuesta_max, 200);
  assert.equal(r.body.nombre, 'Mesa 1');
  assert.equal(r.body.descripcion, 'Original');

  assert.equal((await api.patch(`/juegos/${juego.id}`).set(...admin).send({})).status, 400);
  assert.equal((await api.patch(`/juegos/${juego.id}`).set(...admin).send({ apuesta_max: 0 })).status, 400);
});

test('[CA2.12] DELETE del admin → 204 y después 404', async () => {
  const { api, admin, crear } = await preparar();
  const { body: juego } = await crear({ nombre: 'Mesa 1' });
  assert.equal((await api.delete(`/juegos/${juego.id}`).set(...admin)).status, 204);
  assert.equal((await api.get(`/juegos/${juego.id}`).set(...admin)).status, 404);
});
