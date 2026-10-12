// Pruebas de la iteración 1 (usuarios y autenticación).
// El número de cada prueba es el de la lista de criterios de docs/01-usuarios-y-auth/SPEC.md.
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { crearApp } = require('../src/app');
const { abrirBD } = require('../src/db');

const ana = { email: 'ana@correo.es', nombre: 'Ana', password: 'secreta1' };

// Cada prueba usa una app nueva con la base de datos en memoria.
function nuevaApp() {
  return request(crearApp({ bd: abrirBD(':memory:'), adminEmail: 'admin@casino.es' }));
}

function conToken(token) {
  return 'Bearer ' + token;
}

// Registra a Ana, hace login y devuelve su token.
async function registrarYEntrar(api) {
  await api.post('/auth/register').send(ana);
  const login = await api.post('/auth/login').send({ email: ana.email, password: ana.password });
  return login.body.token;
}

describe('Iteración 1: usuarios y autenticación', () => {
  it('criterio 1: registro válido devuelve 201 con el perfil (rol jugador, saldo 100) y sin contraseña', async () => {
    const api = nuevaApp();
    const res = await api.post('/auth/register').send(ana);

    assert.equal(res.status, 201);
    assert.equal(res.body.email, 'ana@correo.es');
    assert.equal(res.body.nombre, 'Ana');
    assert.equal(res.body.rol, 'jugador');
    assert.equal(res.body.saldo, 100);
    assert.ok(res.body.id);
    assert.equal(res.body.password, undefined);
    assert.equal(res.body.password_hash, undefined);
  });

  it('criterio 2: registro con datos inválidos devuelve 400', async () => {
    const api = nuevaApp();
    const casosMalos = [
      { ...ana, email: 'sin-arroba' },
      { ...ana, nombre: '   ' },
      { ...ana, password: '123' },
      { email: ana.email },
    ];
    for (const caso of casosMalos) {
      const res = await api.post('/auth/register').send(caso);
      assert.equal(res.status, 400);
    }

    const jsonRoto = await api.post('/auth/register').set('Content-Type', 'application/json').send('{esto no es json');
    assert.equal(jsonRoto.status, 400);
  });

  it('criterio 3: registro con un email repetido devuelve 409 (aunque cambien las mayúsculas)', async () => {
    const api = nuevaApp();
    await api.post('/auth/register').send(ana);

    const res = await api.post('/auth/register').send({ ...ana, email: 'ANA@correo.es' });
    assert.equal(res.status, 409);
  });

  it('criterio 4: la contraseña se guarda cifrada con bcrypt y no en claro', async () => {
    const bd = abrirBD(':memory:');
    const api = request(crearApp({ bd }));
    await api.post('/auth/register').send(ana);

    const fila = bd.prepare('SELECT password_hash FROM usuarios').get();
    assert.notEqual(fila.password_hash, ana.password);
    assert.match(fila.password_hash, /^\$2[aby]\$/);
  });

  it('criterio 5: login correcto devuelve 200 con un token JWT', async () => {
    const api = nuevaApp();
    await api.post('/auth/register').send(ana);

    const res = await api.post('/auth/login').send({ email: ana.email, password: ana.password });
    assert.equal(res.status, 200);
    assert.equal(res.body.token.split('.').length, 3);
    assert.ok(jwt.decode(res.body.token).sub);
  });

  it('criterio 6: login con contraseña incorrecta o email inexistente devuelve 401 con el mismo mensaje', async () => {
    const api = nuevaApp();
    await api.post('/auth/register').send(ana);

    const passwordMala = await api.post('/auth/login').send({ email: ana.email, password: 'otra-clave' });
    const emailInexistente = await api.post('/auth/login').send({ email: 'nadie@correo.es', password: 'secreta1' });

    assert.equal(passwordMala.status, 401);
    assert.equal(emailInexistente.status, 401);
    assert.equal(passwordMala.body.error, emailInexistente.body.error);
  });

  it('criterio 7: GET /usuarios/me con token devuelve mi perfil', async () => {
    const api = nuevaApp();
    const token = await registrarYEntrar(api);

    const res = await api.get('/usuarios/me').set('Authorization', conToken(token));
    assert.equal(res.status, 200);
    assert.equal(res.body.email, ana.email);
    assert.equal(res.body.saldo, 100);
  });

  it('criterio 8: sin token, con token mal formado o con firma falsa devuelve 401', async () => {
    const api = nuevaApp();
    await registrarYEntrar(api);
    const tokenFalso = jwt.sign({ sub: '1' }, 'otro-secreto');

    const sinToken = await api.get('/usuarios/me');
    const tokenBasura = await api.get('/usuarios/me').set('Authorization', 'Bearer basura');
    const firmaFalsa = await api.get('/usuarios/me').set('Authorization', conToken(tokenFalso));

    assert.equal(sinToken.status, 401);
    assert.equal(tokenBasura.status, 401);
    assert.equal(firmaFalsa.status, 401);
  });

  it('criterio 9: PATCH /usuarios/me cambia el nombre y el cambio queda guardado', async () => {
    const api = nuevaApp();
    const token = await registrarYEntrar(api);

    const res = await api.patch('/usuarios/me').set('Authorization', conToken(token)).send({ nombre: 'Ana María' });
    assert.equal(res.status, 200);
    assert.equal(res.body.nombre, 'Ana María');

    const perfil = await api.get('/usuarios/me').set('Authorization', conToken(token));
    assert.equal(perfil.body.nombre, 'Ana María');
  });

  it('criterio 10: tras cambiar la contraseña, la nueva sirve para el login y la antigua da 401', async () => {
    const api = nuevaApp();
    const token = await registrarYEntrar(api);

    const cambio = await api.patch('/usuarios/me').set('Authorization', conToken(token)).send({ password: 'nueva-clave' });
    assert.equal(cambio.status, 200);

    const loginNueva = await api.post('/auth/login').send({ email: ana.email, password: 'nueva-clave' });
    const loginVieja = await api.post('/auth/login').send({ email: ana.email, password: ana.password });
    assert.equal(loginNueva.status, 200);
    assert.equal(loginVieja.status, 401);
  });

  it('criterio 11: PATCH vacío o inválido devuelve 400 y rol, saldo y email no se pueden cambiar', async () => {
    const api = nuevaApp();
    const token = await registrarYEntrar(api);
    const cabecera = conToken(token);

    const vacio = await api.patch('/usuarios/me').set('Authorization', cabecera).send({});
    const nombreVacio = await api.patch('/usuarios/me').set('Authorization', cabecera).send({ nombre: '' });
    const passwordCorta = await api.patch('/usuarios/me').set('Authorization', cabecera).send({ password: '12' });
    assert.equal(vacio.status, 400);
    assert.equal(nombreVacio.status, 400);
    assert.equal(passwordCorta.status, 400);

    const intento = await api
      .patch('/usuarios/me')
      .set('Authorization', cabecera)
      .send({ nombre: 'Ana', rol: 'admin', saldo: 9999, email: 'otro@correo.es' });
    assert.equal(intento.status, 200);
    assert.equal(intento.body.rol, 'jugador');
    assert.equal(intento.body.saldo, 100);
    assert.equal(intento.body.email, ana.email);
  });

  it('criterio 12: el email de administrador se registra con rol admin', async () => {
    const api = nuevaApp();
    const res = await api.post('/auth/register').send({ email: 'admin@casino.es', nombre: 'Jefe', password: 'clave-admin' });

    assert.equal(res.status, 201);
    assert.equal(res.body.rol, 'admin');
  });

  it('criterio 13: los datos persisten en un fichero SQLite', async () => {
    const carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'honda-'));
    const fichero = path.join(carpeta, 'prueba.sqlite');

    try {
      const bd1 = abrirBD(fichero);
      await request(crearApp({ bd: bd1 })).post('/auth/register').send(ana);
      bd1.close();

      // Se vuelve a abrir el mismo fichero, como si se reiniciara el servidor.
      const bd2 = abrirBD(fichero);
      const login = await request(crearApp({ bd: bd2 })).post('/auth/login').send({ email: ana.email, password: ana.password });
      assert.equal(login.status, 200);
      bd2.close();
    } finally {
      fs.rmSync(carpeta, { recursive: true, force: true });
    }
  });
});
