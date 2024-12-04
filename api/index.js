// api/index.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const helmet = require('helmet');

dotenv.config();

const app = express();
const port = process.env.PORT || 8080;

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        frameAncestors: ["'self'", "https://*.myshopify.com", "https://*.workmarketcap.com"],
      },
    },
  })
);

app.use((req, res, next) => {
  const allowedOrigins = [
    'https://workmarketcap.myshopify.com',
    'https://www.workmarketcap.com'
  ];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  //res.setHeader('Access-Control-Allow-Origin', 'https://workmarketcap.myshopify.com'); // Reemplaza con el dominio de tu tienda
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE'); // Métodos que permites
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization'); // Cabeceras que permites
  next();
});

//app.use(cors());
// Habilitar cors para mayor flexibilidad
app.use(cors({
  origin: [
    'https://workmarketcap.myshopify.com',
    'https://www.workmarketcap.com'
  ]
}));

app.use(express.json());

// Ruta para archivos estáticos (sirve el frontend)
app.use(express.static(path.join(__dirname, '../test/front'))); // Asegúrate de que esta ruta es correcta

// Rutas de la API
const agreementRoutes = require('./routes/agreements.routes');
app.use('/api/agreements', agreementRoutes);

// Ruta para servir index.html al acceder a la raíz del dominio
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../test/front/index.html'));
});

app.get('/api/config', (req, res) => {
  res.json({
      contractAddress: process.env.SC_CONTRACT_ADDRESS,
      usdcTokenAddress: process.env.USDC_TOKEN_ADDRESS,
      apiBaseUrl: process.env.NODE_ENV === 'prod' 
      ? process.env.API_BASE_URL_PROD 
      : process.env.API_BASE_URL
  });
});

app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
});
