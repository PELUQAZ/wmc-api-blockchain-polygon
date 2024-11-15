// api/services/blockchain.service.js

const ethers = require("ethers");
const contractABI = require("../../artifacts/contracts/WMCServiceManagement-v2.sol/WMCServiceManagement.json").abi;
const provider = new ethers.providers.JsonRpcProvider(process.env.NETWORK_URL);
const contractAddress = process.env.SC_CONTRACT_ADDRESS;
const usdcTokenAddress = process.env.USDC_TOKEN_ADDRESS;

// Inicializa el contrato sin quemar la clave privada
const contract = new ethers.Contract(contractAddress, contractABI, provider);

// Función para obtener datos del acuerdo en la blockchain
async function getAgreementData(agreementId) {
    //const contract = new ethers.Contract(contractAddress, contractABI, provider);
    return await contract.agreements(agreementId);
}

// Función para crear un nuevo acuerdo
async function createAgreement(data, userSigner) {
    // Datos necesarios para el nuevo acuerdo
    const { serviceProvider, servicePayer, arbitrator, startDate, endDate, amount } = data;

    //console.log("userSigner = ", userSigner);

    try {
        // Aprobación de USDC por parte del servicePayer (dentro de un contrato ERC20)
        const usdcContract = new ethers.Contract(usdcTokenAddress, [
            "function approve(address spender, uint256 amount) external returns (bool)"
        ], userSigner);

        //Estimar gas para transacción de aprobación
        const approveGasEstimate = await usdcContract.estimateGas.approve(contractAddress, amount);
        //console.log("approveGasEstimate = ", approveGasEstimate);

        console.log("Aprobando transferencia de USDC... contractAddress = " + contractAddress + " - amount = " + amount);

        console.log("approveGasEstimate.toNumber() = ", approveGasEstimate.toNumber());
        console.log("ethers.utils.parseUnits(\"30\", \"gwei\")", ethers.utils.parseUnits("30", "gwei"));
        console.log("ethers.utils.parseUnits(\"60\", \"gwei\")", ethers.utils.parseUnits("60", "gwei"));

        //const approveTx = await usdcContract.approve(contractAddress, amount);
        /*const approveTx = await usdcContract.approve(contractAddress, amount, {
            gasLimit: approveGasEstimate.toNumber() + 100000, // Utiliza la estimación de gas
            maxPriorityFeePerGas: ethers.utils.parseUnits("30", "gwei"), // Tarifa de prioridad mínima requerida
            maxFeePerGas: ethers.utils.parseUnits("60", "gwei") // Tarifa máxima total de gas
        });*/
        console.log("Transferencia declarada...");
        //await approveTx.wait();
        console.log("Transferencia de USDC aprobada.");

        // Contrato conectado con el signer del usuario
        const contractWithSigner = contract.connect(userSigner);

        console.log("Estimando gas para transacción de nuevo acuerdo...");
        const agreementGasEstimate = await contractWithSigner.estimateGas.newAgreement(
            serviceProvider,
            servicePayer,
            arbitrator,
            startDate,
            endDate,
            amount
        );

        // Creación del acuerdo en el contrato
        console.log("Creando un nuevo acuerdo...");
        const tx = await contractWithSigner.newAgreement(
            serviceProvider,
            servicePayer,
            arbitrator,
            startDate,
            endDate,
            amount,
            {
                gasLimit: agreementGasEstimate.toNumber() + 100000, // 29000000 Ajusta según sea necesario
                maxPriorityFeePerGas: ethers.utils.parseUnits("30", "gwei"), // Tarifa de prioridad mínima requerida
                maxFeePerGas: ethers.utils.parseUnits("60", "gwei") // Tarifa máxima total de gas
            }
        );

        await tx.wait();
        console.log("Acuerdo creado exitosamente:", tx.hash);

        return { transactionHash: tx.hash };
    } catch (error) {
        console.error("Error al crear el acuerdo:", error);
        throw error;
    }
}

module.exports = { getAgreementData, createAgreement };
