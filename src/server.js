// Arranca el servidor (npm start).
const { crearApp } = require('./app');

const puerto = process.env.PORT || 3000;
crearApp().listen(puerto, () => {
  console.log(`Servidor escuchando en http://localhost:${puerto}`);
});
