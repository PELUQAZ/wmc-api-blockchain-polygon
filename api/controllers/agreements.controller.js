// api/controllers/agreements.controller.js
const { ethers } = require('ethers');
const { getAgreementData } = require("../services/blockchain.service");

//const contractABI = require('../../artifacts/contracts/WMCServiceManagement-v2.sol/WMCServiceManagement.json').abi;
require('dotenv').config();

const provider = new ethers.providers.JsonRpcProvider(process.env.NETWORK_URL);
//console.log('PK:', process.env.PRIVATE_KEY);
//const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const contractAddress = process.env.SC_CONTRACT_ADDRESS;
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

async function createAgreement(req, res) {
  try {
    const { serviceProvider, servicePayer, arbitrator, startDate, endDate, amount } = req.body;

    const tx = await contract.newAgreement(
      serviceProvider,
      servicePayer,
      arbitrator,
      startDate,
      endDate,
      ethers.utils.parseUnits(amount.toString(), 6)
    );

    await tx.wait();
    res.json({ message: 'Acuerdo creado exitosamente', transactionHash: tx.hash });
  } catch (error) {
    console.error('Error al crear el acuerdo:', error);
    res.status(500).json({ error: 'Error al crear el acuerdo' });
  }
}

module.exports = {
  getAgreement,
  createAgreement
};
