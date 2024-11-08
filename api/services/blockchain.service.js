// api/services/blockchain.service.js

const ethers = require("ethers");
const contractABI = require("../../artifacts/contracts/WMCServiceManagement-v2.sol/WMCServiceManagement.json").abi;
const provider = new ethers.providers.JsonRpcProvider(process.env.NETWORK_URL);
const contractAddress = process.env.SC_CONTRACT_ADDRESS;

// Función para obtener datos del acuerdo en la blockchain
async function getAgreementData(agreementId) {
    const contract = new ethers.Contract(contractAddress, contractABI, provider);
    return await contract.agreements(agreementId);
}

module.exports = { getAgreementData };
