// api/routes/agreements.routes.js
const express = require('express');
const router = express.Router();
const { getAgreement, createAgreementController } = require('../controllers/agreements.controller');

// Ruta para obtener un acuerdo específico
//router.get('/:id', getAgreement);
router.post('/:id', getAgreement);

// Ruta para crear un nuevo acuerdo
router.post('/', createAgreementController);

module.exports = router;
