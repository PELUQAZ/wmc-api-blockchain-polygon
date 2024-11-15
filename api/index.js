// api/index.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Ruta para archivos estáticos (sirve el frontend)
app.use(express.static(path.join(__dirname, '../test/front-test'))); // Asegúrate de que esta ruta es correcta

// Rutas de la API
const agreementRoutes = require('./routes/agreements.routes');
app.use('/api/agreements', agreementRoutes);

// Ruta para servir index.html al acceder a la raíz del dominio
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../test/front-test/index.html'));
});

app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
});
