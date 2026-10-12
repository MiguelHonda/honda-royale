// Pruebas de la iteración 3 (apuestas de cara o cruz).
// El número de cada prueba es el de la lista de criterios de docs/03-apuestas/SPEC.md.
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { crearApp } = require('../src/app');
const { abrirBD } = require('../src/db');

// El azar de la app es una función que devuelve un número entre 0 y 1.
// Menos de 0.5 es cara y 0.5 o más es cruz.
const SALE_CARA = 0.1;
const SALE_CRUZ = 0.9;

function conToken(token) {
  return 'Bearer ' + token;
}

// Crea una app nueva con un admin, dos jugadores (Ana y Luis) y un juego con apuesta máxima 100.
// "moneda.valor" permite elegir lo que sale en cada apuesta.
async function preparar() {
  const moneda = { valor: SALE_CARA };
  const app = crearApp({
    bd: abrirBD(':memory:'),
    azar: () => moneda.valor,
    adminEmail: 'admin@casino.es',
  });
  const api = request(app);

  async function registrarYEntrar(email) {
    await api.post('/auth/register').send({ email, nombre: 'Jugador', password: 'clave-123' });
    const login = await api.post('/auth/login').send({ email, password: 'clave-123' });
    return login.body.token;
  }

  const tokenAdmin = await registrarYEntrar('admin@casino.es');
  const tokenAna = await registrarYEntrar('ana@correo.es');
  const tokenLuis = await registrarYEntrar('luis@correo.es');

  const crearJuego = await api
    .post('/juegos')
    .set('Authorization', conToken(tokenAdmin))
    .send({ nombre: 'Cara o cruz', apuesta_max: 100 });
  const juego = crearJuego.body;

  function apostar(token, datos, idJuego = juego.id) {
    return api.post(`/juegos/${idJuego}/apuestas`).set('Authorization', conToken(token)).send(datos);
  }

  async function saldoDe(token) {
    const perfil = await api.get('/usuarios/me').set('Authorization', conToken(token));
    return perfil.body.saldo;
  }

  return { api, moneda, tokenAdmin, tokenAna, tokenLuis, juego, apostar, saldoDe };
}

describe('Iteración 3: apuestas', () => {
  it('criterio 1: una apuesta válida devuelve 201 con importe, elección, resultado, ganada y saldo', async () => {
    const { apostar, tokenAna, juego } = await preparar();

    const res = await apostar(tokenAna, { importe: 10, eleccion: 'cara' });
    assert.equal(res.status, 201);
    assert.ok(res.body.id);
    assert.equal(res.body.juego_id, juego.id);
    assert.equal(res.body.importe, 10);
    assert.equal(res.body.eleccion, 'cara');
    assert.equal(res.body.resultado, 'cara');
    assert.equal(res.body.ganada, true);
    assert.equal(res.body.saldo, 110);
  });

  it('criterio 2: si el jugador acierta, el saldo sube en el importe', async () => {
    const { apostar, tokenAna, moneda, saldoDe } = await preparar();
    moneda.valor = SALE_CRUZ;

    const res = await apostar(tokenAna, { importe: 30, eleccion: 'cruz' });
    assert.equal(res.body.ganada, true);
    assert.equal(await saldoDe(tokenAna), 130);
  });

  it('criterio 3: si el jugador falla, el saldo baja en el importe', async () => {
    const { apostar, tokenAna, moneda, saldoDe } = await preparar();
    moneda.valor = SALE_CRUZ;

    const res = await apostar(tokenAna, { importe: 30, eleccion: 'cara' });
    assert.equal(res.body.resultado, 'cruz');
    assert.equal(res.body.ganada, false);
    assert.equal(await saldoDe(tokenAna), 70);
  });

  it('criterio 4: el resultado lo decide el servidor, el cliente no puede forzarlo', async () => {
    const { apostar, tokenAna, moneda } = await preparar();
    moneda.valor = SALE_CRUZ;

    const res = await apostar(tokenAna, { importe: 10, eleccion: 'cara', resultado: 'cara', ganada: true, saldo: 99999 });
    assert.equal(res.status, 201);
    assert.equal(res.body.resultado, 'cruz');
    assert.equal(res.body.ganada, false);
    assert.equal(res.body.saldo, 90);
  });

  it('criterio 5: apostar más de lo que se tiene devuelve 409 y no cambia nada', async () => {
    const { api, apostar, tokenAdmin, tokenAna, juego, saldoDe } = await preparar();
    // Se sube la apuesta máxima para que el error sea por saldo y no por el límite del juego.
    await api.patch(`/juegos/${juego.id}`).set('Authorization', conToken(tokenAdmin)).send({ apuesta_max: 1000 });

    const res = await apostar(tokenAna, { importe: 101, eleccion: 'cara' });
    assert.equal(res.status, 409);
    assert.equal(await saldoDe(tokenAna), 100);

    const lista = await api.get(`/juegos/${juego.id}/apuestas`).set('Authorization', conToken(tokenAna));
    assert.equal(lista.body.total, 0);
  });

  it('criterio 6: el saldo nunca es negativo: si pierde todo queda en 0 y la siguiente apuesta da 409', async () => {
    const { apostar, tokenAna, moneda, saldoDe } = await preparar();
    moneda.valor = SALE_CRUZ;

    const todo = await apostar(tokenAna, { importe: 100, eleccion: 'cara' });
    assert.equal(todo.status, 201);
    assert.equal(todo.body.saldo, 0);
    assert.equal(await saldoDe(tokenAna), 0);

    const otra = await apostar(tokenAna, { importe: 1, eleccion: 'cara' });
    assert.equal(otra.status, 409);
    assert.equal(await saldoDe(tokenAna), 0);
  });

  it('criterio 7: datos inválidos devuelven 400', async () => {
    const { apostar, tokenAna, saldoDe } = await preparar();
    const casosMalos = [
      {},
      { importe: 0, eleccion: 'cara' },
      { importe: -5, eleccion: 'cara' },
      { importe: 2.5, eleccion: 'cara' },
      { importe: '10', eleccion: 'cara' },
      { importe: 10, eleccion: 'canto' },
      { importe: 10 },
      { importe: 101, eleccion: 'cara' }, // más que la apuesta máxima del juego (100)
    ];

    for (const caso of casosMalos) {
      const res = await apostar(tokenAna, caso);
      assert.equal(res.status, 400);
    }
    assert.equal(await saldoDe(tokenAna), 100);
  });

  it('criterio 8: un juego inexistente devuelve 404 y sin token devuelve 401', async () => {
    const { api, apostar, tokenAna, juego } = await preparar();

    const noExiste = await apostar(tokenAna, { importe: 1, eleccion: 'cara' }, 9999);
    assert.equal(noExiste.status, 404);

    const apostarSinToken = await api.post(`/juegos/${juego.id}/apuestas`).send({ importe: 1, eleccion: 'cara' });
    const listarSinToken = await api.get(`/juegos/${juego.id}/apuestas`);
    const borrarSinToken = await api.delete(`/juegos/${juego.id}/apuestas/1`);
    assert.equal(apostarSinToken.status, 401);
    assert.equal(listarSinToken.status, 401);
    assert.equal(borrarSinToken.status, 401);
  });

  it('criterio 9: el listado solo trae mis apuestas, paginadas y con total', async () => {
    const { api, apostar, tokenAna, tokenLuis, juego } = await preparar();
    for (let i = 0; i < 3; i++) {
      await apostar(tokenAna, { importe: 1, eleccion: 'cara' });
    }
    await apostar(tokenLuis, { importe: 1, eleccion: 'cruz' });

    const lista = await api.get(`/juegos/${juego.id}/apuestas`).set('Authorization', conToken(tokenAna));
    assert.equal(lista.status, 200);
    assert.equal(lista.body.total, 3);
    assert.equal(lista.body.datos.length, 3);
    // La más reciente va primero.
    assert.ok(lista.body.datos[0].id > lista.body.datos[2].id);

    const pagina2 = await api.get(`/juegos/${juego.id}/apuestas?limite=2&pagina=2`).set('Authorization', conToken(tokenAna));
    assert.equal(pagina2.body.datos.length, 1);
    assert.equal(pagina2.body.total, 3);

    const deLuis = await api.get(`/juegos/${juego.id}/apuestas`).set('Authorization', conToken(tokenLuis));
    assert.equal(deLuis.body.total, 1);

    const paginaMala = await api.get(`/juegos/${juego.id}/apuestas?pagina=0`).set('Authorization', conToken(tokenAna));
    assert.equal(paginaMala.status, 400);
  });

  it('criterio 10: GET /juegos/:id incluye mis 5 últimas apuestas, la más reciente primero', async () => {
    const { api, apostar, tokenAna, tokenLuis, juego } = await preparar();
    for (let importe = 1; importe <= 7; importe++) {
      await apostar(tokenAna, { importe, eleccion: 'cara' });
    }
    await apostar(tokenLuis, { importe: 50, eleccion: 'cara' });

    const res = await api.get(`/juegos/${juego.id}`).set('Authorization', conToken(tokenAna));
    assert.equal(res.status, 200);
    assert.equal(res.body.ultimasApuestas.length, 5);
    assert.deepEqual(res.body.ultimasApuestas.map((a) => a.importe), [7, 6, 5, 4, 3]);
  });

  it('criterio 11: borrar una apuesta mía devuelve 204, desaparece y el saldo no cambia', async () => {
    const { api, apostar, tokenAna, moneda, juego, saldoDe } = await preparar();
    moneda.valor = SALE_CRUZ;
    // Apuesta a cara y pierde, así el saldo queda en 60.
    const apuesta = (await apostar(tokenAna, { importe: 40, eleccion: 'cara' })).body;
    assert.equal(await saldoDe(tokenAna), 60);

    const borrar = await api.delete(`/juegos/${juego.id}/apuestas/${apuesta.id}`).set('Authorization', conToken(tokenAna));
    assert.equal(borrar.status, 204);

    const lista = await api.get(`/juegos/${juego.id}/apuestas`).set('Authorization', conToken(tokenAna));
    assert.equal(lista.body.total, 0);
    assert.equal(await saldoDe(tokenAna), 60);

    // Si se intenta borrar otra vez, ya no existe.
    const otraVez = await api.delete(`/juegos/${juego.id}/apuestas/${apuesta.id}`).set('Authorization', conToken(tokenAna));
    assert.equal(otraVez.status, 404);
  });

  it('criterio 12: la apuesta de otro jugador no se puede borrar (404) y sigue existiendo', async () => {
    const { api, apostar, tokenAna, tokenLuis, juego } = await preparar();
    const apuestaDeAna = (await apostar(tokenAna, { importe: 5, eleccion: 'cara' })).body;

    const intento = await api
      .delete(`/juegos/${juego.id}/apuestas/${apuestaDeAna.id}`)
      .set('Authorization', conToken(tokenLuis));
    assert.equal(intento.status, 404);

    const listaAna = await api.get(`/juegos/${juego.id}/apuestas`).set('Authorization', conToken(tokenAna));
    const listaLuis = await api.get(`/juegos/${juego.id}/apuestas`).set('Authorization', conToken(tokenLuis));
    assert.equal(listaAna.body.total, 1);
    assert.equal(listaLuis.body.total, 0);
  });

  it('criterio 13: un juego que ya tiene apuestas no se puede borrar (409)', async () => {
    const { api, apostar, tokenAdmin, tokenAna, juego } = await preparar();
    await apostar(tokenAna, { importe: 5, eleccion: 'cara' });

    const borrar = await api.delete(`/juegos/${juego.id}`).set('Authorization', conToken(tokenAdmin));
    assert.equal(borrar.status, 409);

    const ver = await api.get(`/juegos/${juego.id}`).set('Authorization', conToken(tokenAdmin));
    assert.equal(ver.status, 200);
  });
});
