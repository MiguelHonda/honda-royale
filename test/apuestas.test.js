// Iteración 3: apuestas de cara o cruz. Cada nombre de test cita el criterio de docs/03-apuestas/SPEC.md.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { crearApp } = require('../src/app');
const { abrirBD } = require('../src/db');

const CARA = 0.1; // azar() < 0.5 → sale cara
const CRUZ = 0.9; // azar() >= 0.5 → sale cruz

// App aislada con admin, un juego (apuesta_max 100) y dos jugadores. "moneda.valor" controla el azar.
async function preparar() {
  const moneda = { valor: CARA };
  const api = request(crearApp({ bd: abrirBD(':memory:'), azar: () => moneda.valor, adminEmail: 'admin@casino.es' }));
  const entrar = async (email) => {
    await api.post('/auth/register').send({ email, nombre: 'Jugador', password: 'clave-123' });
    const r = await api.post('/auth/login').send({ email, password: 'clave-123' });
    return ['Authorization', `Bearer ${r.body.token}`];
  };
  const admin = await entrar('admin@casino.es');
  const ana = await entrar('ana@correo.es');
  const luis = await entrar('luis@correo.es');
  const juego = (await api.post('/juegos').set(...admin).send({ nombre: 'Cara o cruz', apuesta_max: 100 })).body;

  const apostar = (auth, cuerpo, idJuego = juego.id) => api.post(`/juegos/${idJuego}/apuestas`).set(...auth).send(cuerpo);
  const saldo = async (auth) => (await api.get('/usuarios/me').set(...auth)).body.saldo;
  return { api, moneda, admin, ana, luis, juego, apostar, saldo };
}

test('[CA3.1] apuesta válida → 201 con importe, elección, resultado, ganada y saldo', async () => {
  const { apostar, ana, juego } = await preparar();
  const r = await apostar(ana, { importe: 10, eleccion: 'cara' });
  assert.equal(r.status, 201);
  assert.ok(r.body.id);
  assert.equal(r.body.juego_id, juego.id);
  assert.equal(r.body.importe, 10);
  assert.equal(r.body.eleccion, 'cara');
  assert.equal(r.body.resultado, 'cara');
  assert.equal(r.body.ganada, true);
  assert.equal(r.body.saldo, 110);
});

test('[CA3.2] si acierta, el saldo sube en el importe', async () => {
  const { apostar, ana, moneda, saldo } = await preparar();
  moneda.valor = CRUZ;
  const r = await apostar(ana, { importe: 30, eleccion: 'cruz' });
  assert.equal(r.body.ganada, true);
  assert.equal(await saldo(ana), 130);
});

test('[CA3.3] si falla, el saldo baja en el importe', async () => {
  const { apostar, ana, moneda, saldo } = await preparar();
  moneda.valor = CRUZ;
  const r = await apostar(ana, { importe: 30, eleccion: 'cara' });
  assert.equal(r.body.resultado, 'cruz');
  assert.equal(r.body.ganada, false);
  assert.equal(await saldo(ana), 70);
});

test('[CA3.4] el resultado lo decide el servidor: el body no puede forzarlo', async () => {
  const { apostar, ana, moneda } = await preparar();
  moneda.valor = CRUZ;
  const r = await apostar(ana, { importe: 10, eleccion: 'cara', resultado: 'cara', ganada: true, saldo: 99999 });
  assert.equal(r.status, 201);
  assert.equal(r.body.resultado, 'cruz');
  assert.equal(r.body.ganada, false);
  assert.equal(r.body.saldo, 90);
});

test('[CA3.5] apostar más de lo que se tiene → 409, sin cambiar saldo ni guardar la apuesta', async () => {
  const { api, apostar, ana, juego, admin, saldo } = await preparar();
  // Subimos el máximo para que el 409 sea por saldo y no por el límite del juego.
  await api.patch(`/juegos/${juego.id}`).set(...admin).send({ apuesta_max: 1000 });
  const r = await apostar(ana, { importe: 101, eleccion: 'cara' });
  assert.equal(r.status, 409);
  assert.equal(await saldo(ana), 100);
  const lista = await api.get(`/juegos/${juego.id}/apuestas`).set(...ana);
  assert.equal(lista.body.total, 0);
});

test('[CA3.6] el saldo nunca es negativo: perder todo deja 0 y la siguiente apuesta da 409', async () => {
  const { apostar, ana, moneda, saldo } = await preparar();
  moneda.valor = CRUZ;
  const todo = await apostar(ana, { importe: 100, eleccion: 'cara' });
  assert.equal(todo.status, 201);
  assert.equal(todo.body.saldo, 0);
  assert.equal(await saldo(ana), 0);

  const otra = await apostar(ana, { importe: 1, eleccion: 'cara' });
  assert.equal(otra.status, 409);
  assert.equal(await saldo(ana), 0);
});

test('[CA3.7] datos inválidos → 400', async () => {
  const { apostar, ana, saldo } = await preparar();
  const malos = [
    {},
    { importe: 0, eleccion: 'cara' },
    { importe: -5, eleccion: 'cara' },
    { importe: 2.5, eleccion: 'cara' },
    { importe: '10', eleccion: 'cara' },
    { importe: 10, eleccion: 'canto' },
    { importe: 10 },
    { importe: 101, eleccion: 'cara' }, // supera apuesta_max (100)
  ];
  for (const cuerpo of malos) {
    assert.equal((await apostar(ana, cuerpo)).status, 400, JSON.stringify(cuerpo));
  }
  assert.equal(await saldo(ana), 100);
});

test('[CA3.8] juego inexistente → 404; sin token → 401', async () => {
  const { api, apostar, ana, juego } = await preparar();
  assert.equal((await apostar(ana, { importe: 1, eleccion: 'cara' }, 9999)).status, 404);
  assert.equal((await api.post(`/juegos/${juego.id}/apuestas`).send({ importe: 1, eleccion: 'cara' })).status, 401);
  assert.equal((await api.get(`/juegos/${juego.id}/apuestas`)).status, 401);
  assert.equal((await api.delete(`/juegos/${juego.id}/apuestas/1`)).status, 401);
});

test('[CA3.9] el listado solo trae mis apuestas, paginadas y con total', async () => {
  const { api, apostar, ana, luis, juego } = await preparar();
  for (let i = 0; i < 3; i++) await apostar(ana, { importe: 1, eleccion: 'cara' });
  await apostar(luis, { importe: 1, eleccion: 'cruz' });

  const r = await api.get(`/juegos/${juego.id}/apuestas`).set(...ana);
  assert.equal(r.status, 200);
  assert.equal(r.body.total, 3);
  assert.equal(r.body.datos.length, 3);
  assert.ok(r.body.datos[0].id > r.body.datos[2].id, 'la más reciente va primero');

  const pag = await api.get(`/juegos/${juego.id}/apuestas?limite=2&pagina=2`).set(...ana);
  assert.equal(pag.body.datos.length, 1);
  assert.equal(pag.body.total, 3);

  assert.equal((await api.get(`/juegos/${juego.id}/apuestas?pagina=0`).set(...ana)).status, 400);
  assert.equal((await api.get(`/juegos/${juego.id}/apuestas`).set(...luis)).body.total, 1);
});

test('[CA3.10] GET /juegos/:id incluye mis 5 últimas apuestas, la más reciente primero', async () => {
  const { api, apostar, ana, luis, juego } = await preparar();
  for (let i = 1; i <= 7; i++) await apostar(ana, { importe: i, eleccion: 'cara' });
  await apostar(luis, { importe: 50, eleccion: 'cara' });

  const r = await api.get(`/juegos/${juego.id}`).set(...ana);
  assert.equal(r.status, 200);
  assert.equal(r.body.ultimasApuestas.length, 5);
  assert.deepEqual(r.body.ultimasApuestas.map((a) => a.importe), [7, 6, 5, 4, 3]);
});

test('[CA3.11] borrar una apuesta mía → 204, desaparece y el saldo no cambia', async () => {
  const { api, apostar, ana, moneda, juego, saldo } = await preparar();
  moneda.valor = CRUZ;
  const { body: apuesta } = await apostar(ana, { importe: 40, eleccion: 'cara' }); // pierde → saldo 60
  assert.equal(await saldo(ana), 60);

  const r = await api.delete(`/juegos/${juego.id}/apuestas/${apuesta.id}`).set(...ana);
  assert.equal(r.status, 204);
  assert.equal((await api.get(`/juegos/${juego.id}/apuestas`).set(...ana)).body.total, 0);
  assert.equal(await saldo(ana), 60);
  // Borrarla otra vez ya no la encuentra.
  assert.equal((await api.delete(`/juegos/${juego.id}/apuestas/${apuesta.id}`).set(...ana)).status, 404);
});

test('[CA3.12] la apuesta de otro jugador no se puede borrar (404) y sigue existiendo', async () => {
  const { api, apostar, ana, luis, juego } = await preparar();
  const { body: apuesta } = await apostar(ana, { importe: 5, eleccion: 'cara' });

  const r = await api.delete(`/juegos/${juego.id}/apuestas/${apuesta.id}`).set(...luis);
  assert.equal(r.status, 404);
  assert.equal((await api.get(`/juegos/${juego.id}/apuestas`).set(...ana)).body.total, 1);
  assert.equal((await api.get(`/juegos/${juego.id}/apuestas`).set(...luis)).body.total, 0);
});

test('[CA3.13] borrar un juego que ya tiene apuestas → 409', async () => {
  const { api, apostar, ana, admin, juego } = await preparar();
  await apostar(ana, { importe: 5, eleccion: 'cara' });
  assert.equal((await api.delete(`/juegos/${juego.id}`).set(...admin)).status, 409);
  assert.equal((await api.get(`/juegos/${juego.id}`).set(...admin)).status, 200);
});
