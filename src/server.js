// Punto de entrada: abre el puerto. Uso: npm start
const { crearApp } = require('./app');

const puerto = process.env.PORT || 3000;
crearApp().listen(puerto, () => console.log(`Honda Royale mínimo escuchando en http://localhost:${puerto}`));
