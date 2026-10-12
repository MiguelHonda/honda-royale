// Pruebas de la iteración 2 (juegos).
// El número de cada prueba es el de la lista de criterios de docs/02-juegos/SPEC.md.
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { crearApp } = require('../src/app');
const { abrirBD } = require('../src/db');

function conToken(token) {
  return 'Bearer ' + token;
}

// Crea una app nueva con un administrador y un jugador ya registrados.
async function preparar() {
  const api = request(crearApp({ bd: abrirBD(':memory:'), adminEmail: 'admin@casino.es' }));

  async function registrarYEntrar(email) {
    await api.post('/auth/register').send({ email, nombre: 'Usuario', password: 'clave-123' });
    const login = await api.post('/auth/login').send({ email, password: 'clave-123' });
    return login.body.token;
  }

  const tokenAdmin = await registrarYEntrar('admin@casino.es');
  const tokenJugador = await registrarYEntrar('luis@correo.es');

  // Crea un juego haciendo de administrador.
  function crearJuego(datos) {
    return api.post('/juegos').set('Authorization', conToken(tokenAdmin)).send(datos);
  }

  return { api, tokenAdmin, tokenJugador, crearJuego };
}

describe('Iteración 2: juegos', () => {
  it('criterio 1: el admin crea un juego y recibe 201 con sus datos', async () => {
    const { crearJuego } = await preparar();

    const res = await crearJuego({ nombre: 'Cara o cruz VIP', descripcion: 'Mesa grande', apuesta_max: 500 });
    assert.equal(res.status, 201);
    assert.equal(res.body.nombre, 'Cara o cruz VIP');
    assert.equal(res.body.descripcion, 'Mesa grande');
    assert.equal(res.body.apuesta_max, 500);
    assert.ok(res.body.id);

    // Si no se indica la apuesta máxima, es 100.
    const sinMaximo = await crearJuego({ nombre: 'Mesa básica' });
    assert.equal(sinMaximo.body.apuesta_max, 100);
  });

  it('criterio 2: un jugador no puede crear, modificar ni borrar (403)', async () => {
    const { api, tokenJugador, crearJuego } = await preparar();
    const cabecera = conToken(tokenJugador);
    const juego = (await crearJuego({ nombre: 'Mesa 1' })).body;

    const crear = await api.post('/juegos').set('Authorization', cabecera).send({ nombre: 'Otra' });
    const modificar = await api.patch(`/juegos/${juego.id}`).set('Authorization', cabecera).send({ nombre: 'X' });
    const borrar = await api.delete(`/juegos/${juego.id}`).set('Authorization', cabecera);

    assert.equal(crear.status, 403);
    assert.equal(modificar.status, 403);
    assert.equal(borrar.status, 403);
  });

  it('criterio 3: sin token todas las rutas de juegos devuelven 401', async () => {
    const { api } = await preparar();

    assert.equal((await api.get('/juegos')).status, 401);
    assert.equal((await api.get('/juegos/1')).status, 401);
    assert.equal((await api.post('/juegos').send({ nombre: 'A' })).status, 401);
    assert.equal((await api.patch('/juegos/1').send({ nombre: 'A' })).status, 401);
    assert.equal((await api.delete('/juegos/1')).status, 401);
  });

  it('criterio 4: crear con datos inválidos devuelve 400', async () => {
    const { crearJuego } = await preparar();
    const casosMalos = [
      {},
      { nombre: '' },
      { nombre: 42 },
      { nombre: 'Mesa', apuesta_max: 0 },
      { nombre: 'Mesa', apuesta_max: -5 },
      { nombre: 'Mesa', apuesta_max: 10.5 },
      { nombre: 'Mesa', apuesta_max: '100' },
    ];

    for (const caso of casosMalos) {
      const res = await crearJuego(caso);
      assert.equal(res.status, 400);
    }
  });

  it('criterio 5: un nombre repetido al crear o al modificar devuelve 409', async () => {
    const { api, tokenAdmin, crearJuego } = await preparar();
    await crearJuego({ nombre: 'Mesa A' });
    const mesaB = (await crearJuego({ nombre: 'Mesa B' })).body;

    const crearRepetido = await crearJuego({ nombre: 'Mesa A' });
    const modificarRepetido = await api
      .patch(`/juegos/${mesaB.id}`)
      .set('Authorization', conToken(tokenAdmin))
      .send({ nombre: 'Mesa A' });
    assert.equal(crearRepetido.status, 409);
    assert.equal(modificarRepetido.status, 409);

    // Mantener su propio nombre no es un conflicto.
    const mismoNombre = await api
      .patch(`/juegos/${mesaB.id}`)
      .set('Authorization', conToken(tokenAdmin))
      .send({ nombre: 'Mesa B' });
    assert.equal(mismoNombre.status, 200);
  });

  it('criterio 6: GET /juegos/:id devuelve el juego con el campo ultimasApuestas', async () => {
    const { api, tokenJugador, crearJuego } = await preparar();
    const juego = (await crearJuego({ nombre: 'Mesa 1' })).body;

    const res = await api.get(`/juegos/${juego.id}`).set('Authorization', conToken(tokenJugador));
    assert.equal(res.status, 200);
    assert.equal(res.body.nombre, 'Mesa 1');
    assert.deepEqual(res.body.ultimasApuestas, []);
  });

  it('criterio 7: un id inexistente o no numérico devuelve 404', async () => {
    const { api, tokenAdmin } = await preparar();
    const cabecera = conToken(tokenAdmin);

    for (const id of ['999', 'abc']) {
      const ver = await api.get(`/juegos/${id}`).set('Authorization', cabecera);
      const modificar = await api.patch(`/juegos/${id}`).set('Authorization', cabecera).send({ nombre: 'X' });
      const borrar = await api.delete(`/juegos/${id}`).set('Authorization', cabecera);

      assert.equal(ver.status, 404);
      assert.equal(modificar.status, 404);
      assert.equal(borrar.status, 404);
    }
  });

  it('criterio 8: el listado viene paginado con datos, pagina, limite y total', async () => {
    const { api, tokenJugador, crearJuego } = await preparar();
    const cabecera = conToken(tokenJugador);
    for (let i = 1; i <= 12; i++) {
      await crearJuego({ nombre: 'Mesa ' + String(i).padStart(2, '0') });
    }

    const pagina1 = await api.get('/juegos').set('Authorization', cabecera);
    assert.equal(pagina1.status, 200);
    assert.equal(pagina1.body.datos.length, 10);
    assert.equal(pagina1.body.pagina, 1);
    assert.equal(pagina1.body.limite, 10);
    assert.equal(pagina1.body.total, 12);

    const pagina2 = await api.get('/juegos?pagina=2').set('Authorization', cabecera);
    assert.equal(pagina2.body.datos.length, 2);
    assert.equal(pagina2.body.datos[0].nombre, 'Mesa 11');

    const conLimite = await api.get('/juegos?limite=5&pagina=3').set('Authorization', cabecera);
    assert.equal(conLimite.body.datos.length, 2);
  });

  it('criterio 9: ?q= busca en nombre y descripción sin distinguir mayúsculas', async () => {
    const { api, tokenJugador, crearJuego } = await preparar();
    const cabecera = conToken(tokenJugador);
    await crearJuego({ nombre: 'Mesa Dorada', descripcion: 'Para valientes' });
    await crearJuego({ nombre: 'Mesa Plata', descripcion: 'Con premio DORADO' });
    await crearJuego({ nombre: 'Mesa Bronce', descripcion: 'Tranquila' });

    const dorado = await api.get('/juegos?q=dorad').set('Authorization', cabecera);
    assert.equal(dorado.body.total, 2);
    assert.deepEqual(dorado.body.datos.map((j) => j.nombre), ['Mesa Dorada', 'Mesa Plata']);

    const nada = await api.get('/juegos?q=zzz').set('Authorization', cabecera);
    assert.equal(nada.body.total, 0);

    // El símbolo % se busca como texto normal, no como comodín.
    const porcentaje = await api.get('/juegos?q=%25').set('Authorization', cabecera);
    assert.equal(porcentaje.body.total, 0);
  });

  it('criterio 10: pagina o limite inválidos devuelven 400', async () => {
    const { api, tokenJugador } = await preparar();

    for (const consulta of ['pagina=0', 'pagina=-1', 'pagina=abc', 'limite=0', 'limite=51', 'limite=x']) {
      const res = await api.get('/juegos?' + consulta).set('Authorization', conToken(tokenJugador));
      assert.equal(res.status, 400);
    }
  });

  it('criterio 11: PATCH cambia solo lo que se envía, y uno vacío devuelve 400', async () => {
    const { api, tokenAdmin, crearJuego } = await preparar();
    const cabecera = conToken(tokenAdmin);
    const juego = (await crearJuego({ nombre: 'Mesa 1', descripcion: 'Original', apuesta_max: 50 })).body;

    const res = await api.patch(`/juegos/${juego.id}`).set('Authorization', cabecera).send({ apuesta_max: 200 });
    assert.equal(res.status, 200);
    assert.equal(res.body.apuesta_max, 200);
    assert.equal(res.body.nombre, 'Mesa 1');
    assert.equal(res.body.descripcion, 'Original');

    const vacio = await api.patch(`/juegos/${juego.id}`).set('Authorization', cabecera).send({});
    const invalido = await api.patch(`/juegos/${juego.id}`).set('Authorization', cabecera).send({ apuesta_max: 0 });
    assert.equal(vacio.status, 400);
    assert.equal(invalido.status, 400);
  });

  it('criterio 12: el admin borra un juego (204) y después da 404', async () => {
    const { api, tokenAdmin, crearJuego } = await preparar();
    const cabecera = conToken(tokenAdmin);
    const juego = (await crearJuego({ nombre: 'Mesa 1' })).body;

    const borrar = await api.delete(`/juegos/${juego.id}`).set('Authorization', cabecera);
    assert.equal(borrar.status, 204);

    const ver = await api.get(`/juegos/${juego.id}`).set('Authorization', cabecera);
    assert.equal(ver.status, 404);
  });
});
