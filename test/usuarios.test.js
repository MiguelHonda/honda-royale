// Iteración 1: usuarios y autenticación. Cada nombre de test cita el criterio de docs/01-usuarios-y-auth/SPEC.md.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { crearApp } = require('../src/app');
const { abrirBD } = require('../src/db');

const nuevo = () => {
  const bd = abrirBD(':memory:');
  return { bd, api: request(crearApp({ bd, adminEmail: 'admin@casino.es' })) };
};
const DATOS = { email: 'ana@correo.es', nombre: 'Ana', password: 'secreta1' };

async function registrarYEntrar(api, datos = DATOS) {
  await api.post('/auth/register').send(datos);
  const r = await api.post('/auth/login').send({ email: datos.email, password: datos.password });
  return r.body.token;
}

test('[CA1.1] registro válido → 201, perfil con rol jugador y saldo 100, sin contraseña', async () => {
  const { api } = nuevo();
  const r = await api.post('/auth/register').send(DATOS);
  assert.equal(r.status, 201);
  assert.equal(r.body.email, 'ana@correo.es');
  assert.equal(r.body.rol, 'jugador');
  assert.equal(r.body.saldo, 100);
  assert.ok(r.body.id);
  assert.equal(r.body.password, undefined);
  assert.equal(r.body.password_hash, undefined);
});

test('[CA1.2] registro con datos inválidos → 400', async () => {
  const { api } = nuevo();
  const malos = [
    { ...DATOS, email: 'sin-arroba' },
    { ...DATOS, nombre: '   ' },
    { ...DATOS, password: '123' },
    { email: DATOS.email },
  ];
  for (const cuerpo of malos) {
    const r = await api.post('/auth/register').send(cuerpo);
    assert.equal(r.status, 400, JSON.stringify(cuerpo));
  }
  const json = await api.post('/auth/register').set('Content-Type', 'application/json').send('{no es json');
  assert.equal(json.status, 400);
});

test('[CA1.3] registro con email repetido (aunque cambien las mayúsculas) → 409', async () => {
  const { api } = nuevo();
  await api.post('/auth/register').send(DATOS);
  const r = await api.post('/auth/register').send({ ...DATOS, email: 'ANA@correo.es' });
  assert.equal(r.status, 409);
});

test('[CA1.4] la contraseña se guarda como hash bcrypt, no en claro', async () => {
  const { api, bd } = nuevo();
  await api.post('/auth/register').send(DATOS);
  const { password_hash } = bd.prepare('SELECT password_hash FROM usuarios').get();
  assert.notEqual(password_hash, DATOS.password);
  assert.match(password_hash, /^\$2[aby]\$/);
});

test('[CA1.5] login correcto → 200 con un token JWT firmado por el servidor', async () => {
  const { api } = nuevo();
  await api.post('/auth/register').send(DATOS);
  const r = await api.post('/auth/login').send({ email: DATOS.email, password: DATOS.password });
  assert.equal(r.status, 200);
  assert.equal(r.body.token.split('.').length, 3);
  assert.ok(jwt.decode(r.body.token).sub);
});

test('[CA1.6] login con contraseña mala o email inexistente → 401 con el mismo mensaje', async () => {
  const { api } = nuevo();
  await api.post('/auth/register').send(DATOS);
  const a = await api.post('/auth/login').send({ email: DATOS.email, password: 'otra-clave' });
  const b = await api.post('/auth/login').send({ email: 'nadie@correo.es', password: 'secreta1' });
  assert.equal(a.status, 401);
  assert.equal(b.status, 401);
  assert.equal(a.body.error, b.body.error);
});

test('[CA1.7] GET /usuarios/me con token → 200 con mi perfil', async () => {
  const { api } = nuevo();
  const token = await registrarYEntrar(api);
  const r = await api.get('/usuarios/me').set('Authorization', `Bearer ${token}`);
  assert.equal(r.status, 200);
  assert.equal(r.body.email, DATOS.email);
  assert.equal(r.body.saldo, 100);
});

test('[CA1.8] sin token, token mal formado o con firma falsa → 401', async () => {
  const { api } = nuevo();
  await registrarYEntrar(api);
  const falso = jwt.sign({ sub: '1' }, 'otro-secreto');
  assert.equal((await api.get('/usuarios/me')).status, 401);
  assert.equal((await api.get('/usuarios/me').set('Authorization', 'Bearer basura')).status, 401);
  assert.equal((await api.get('/usuarios/me').set('Authorization', `Bearer ${falso}`)).status, 401);
});

test('[CA1.9] PATCH /usuarios/me cambia el nombre y queda guardado', async () => {
  const { api } = nuevo();
  const token = await registrarYEntrar(api);
  const r = await api.patch('/usuarios/me').set('Authorization', `Bearer ${token}`).send({ nombre: 'Ana María' });
  assert.equal(r.status, 200);
  assert.equal(r.body.nombre, 'Ana María');
  const otra = await api.get('/usuarios/me').set('Authorization', `Bearer ${token}`);
  assert.equal(otra.body.nombre, 'Ana María');
});

test('[CA1.10] PATCH con password nueva: la nueva sirve y la antigua da 401', async () => {
  const { api } = nuevo();
  const token = await registrarYEntrar(api);
  const r = await api.patch('/usuarios/me').set('Authorization', `Bearer ${token}`).send({ password: 'nueva-clave' });
  assert.equal(r.status, 200);
  const nueva = await api.post('/auth/login').send({ email: DATOS.email, password: 'nueva-clave' });
  const vieja = await api.post('/auth/login').send({ email: DATOS.email, password: DATOS.password });
  assert.equal(nueva.status, 200);
  assert.equal(vieja.status, 401);
});

test('[CA1.11] PATCH vacío o inválido → 400; rol, saldo y email se ignoran', async () => {
  const { api } = nuevo();
  const token = await registrarYEntrar(api);
  const auth = ['Authorization', `Bearer ${token}`];
  assert.equal((await api.patch('/usuarios/me').set(...auth).send({})).status, 400);
  assert.equal((await api.patch('/usuarios/me').set(...auth).send({ nombre: '' })).status, 400);
  assert.equal((await api.patch('/usuarios/me').set(...auth).send({ password: '12' })).status, 400);

  const r = await api.patch('/usuarios/me').set(...auth).send({ nombre: 'Ana', rol: 'admin', saldo: 9999, email: 'x@y.es' });
  assert.equal(r.status, 200);
  assert.equal(r.body.rol, 'jugador');
  assert.equal(r.body.saldo, 100);
  assert.equal(r.body.email, DATOS.email);
});

test('[CA1.12] el email de ADMIN_EMAIL se registra con rol admin', async () => {
  const { api } = nuevo();
  const r = await api.post('/auth/register').send({ email: 'admin@casino.es', nombre: 'Jefe', password: 'clave-admin' });
  assert.equal(r.status, 201);
  assert.equal(r.body.rol, 'admin');
});

test('[CA1.13] los datos persisten en un fichero SQLite', async () => {
  const carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'honda-'));
  const fichero = path.join(carpeta, 'prueba.sqlite');
  try {
    const bd1 = abrirBD(fichero);
    await request(crearApp({ bd: bd1 })).post('/auth/register').send(DATOS);
    bd1.close();

    // "Reinicio del servidor": se abre otra app sobre el mismo fichero.
    const bd2 = abrirBD(fichero);
    const r = await request(crearApp({ bd: bd2 })).post('/auth/login').send({ email: DATOS.email, password: DATOS.password });
    assert.equal(r.status, 200);
    bd2.close();
  } finally {
    fs.rmSync(carpeta, { recursive: true, force: true });
  }
});
