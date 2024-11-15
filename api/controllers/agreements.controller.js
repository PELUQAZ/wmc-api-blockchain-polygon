// api/controllers/agreements.controller.js
const { ethers } = require('ethers');
const { getAgreementData, createAgreement } = require("../services/blockchain.service");

//const contractABI = require('../../artifacts/contracts/WMCServiceManagement-v2.sol/WMCServiceManagement.json').abi;
require('dotenv').config();

const provider = new ethers.providers.JsonRpcProvider(process.env.NETWORK_URL);
//console.log('PK:', process.env.PRIVATE_KEY);
//const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
//const contractAddress = process.env.SC_CONTRACT_ADDRESS;
//const contract = new ethers.Contract(contractAddress, contractABI, wallet);

async function getAgreement(req, res) {
  try {
    const { userAddress, signature } = req.body;
    const { id } = req.params;

    // Mensaje original usado en el front-end
    const message = `Consulta de acuerdo ${id} para el usuario ${userAddress}`;
    // Recupera la dirección de la firma
    const recoveredAddress = ethers.utils.verifyMessage(message, signature);

    // Verifica si la dirección recuperada coincide con la dirección enviada
    if (recoveredAddress.toLowerCase() === userAddress.toLowerCase()) {
      // Llama a la blockchain para obtener el acuerdo
      //const agreement = await contract.agreements(id);
      const agreement = await getAgreementData(id);
      res.json({
        serviceProvider: agreement[0],
        servicePayer: agreement[1],
        arbitrator: agreement[2],
        startDate: agreement[3].toString(),
        endDate: agreement[4].toString(),
        amount: agreement[5].toString(),
        estado: agreement[6],
        spaAgree: agreement[7],
        sprAgree: agreement[8]
      });
    } else {
      res.status(401).json({ error: "Firma no válida" });
    }
  } catch (error) {
    console.error('Error al obtener el acuerdo:', error);
    res.status(500).json({ error: 'Error al obtener el acuerdo' });
  }
}

async function createAgreementController(req, res) {
  try {
    //console.log("req.body = ", req.body);
    const { serviceProvider, servicePayer, arbitrator, startDate, endDate, amount, signature } = req.body;

    // Validar la firma del mensaje recibido
    const message = `Solicitud para crear acuerdo con ID aleatorio para el usuario ${servicePayer}`;
    const recoveredAddress = ethers.utils.verifyMessage(message, signature);
    if (recoveredAddress.toLowerCase() !== servicePayer.toLowerCase()) {
      return res.status(403).json({ error: "Firma no válida o dirección no coincide" });
    }
    // Crear un `signer` para el usuario conectado usando su dirección pública
    const userSigner = provider.getSigner(servicePayer); //

    console.log("recoveredAddress = ", recoveredAddress);
    console.log("servicePayer = ", servicePayer);

    // Crear el acuerdo en la blockchain
    const transactionHash = await createAgreement({
      serviceProvider,
      servicePayer,
      arbitrator,
      startDate,
      endDate,
      amount
    }, userSigner);

    res.json({ transactionHash });
    //res.status(201).json({ message: "Acuerdo creado exitosamente", transactionHash: result.transactionHash });

  } catch (error) {
    console.error('Error al crear el acuerdo en createAgreementController:', error);
    res.status(500).json({ error: 'Error al crear el acuerdo' });
  }
}

module.exports = {
  getAgreement,
  createAgreementController
};
