// api/index.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Rutas
const agreementRoutes = require('./routes/agreements.routes');
app.use('/api/agreements', agreementRoutes);

app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
});
