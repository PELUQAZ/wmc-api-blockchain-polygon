const { ethers } = require("hardhat");
require("dotenv").config();
const axios = require("axios");
const fs = require("fs");
const path = require("path")

async function main() {
    const provider = new ethers.providers.JsonRpcProvider(process.env.NETWORK_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const contractAddress = process.env.SC_CONTRACT_ADDRESS;
    const usdcTokenAddress = process.env.USDC_TOKEN_ADDRESS; // Asegúrate de que esta variable esté en el archivo .env

    // Carga el ABI dinámicamente desde el archivo generado por Hardhat
    const contractPath = path.resolve(__dirname, "../artifacts/contracts/WMCServiceManagement-v2.sol/WMCServiceManagement.json");
    const contractJson = JSON.parse(fs.readFileSync(contractPath, "utf8"));
    const contractABI = contractJson.abi;

    // Crear instancia del contrato de USDC
    const usdcContractABI = [
        "function balanceOf(address) view returns (uint256)",
        "function approve(address spender, uint256 amount) external returns (bool)"
    ];
    const usdcContract = new ethers.Contract(usdcTokenAddress, usdcContractABI, wallet);

    // Crear instancia del contrato
    const contract = new ethers.Contract(contractAddress, contractABI, wallet);

    /*try {
        console.log("Llamando a testRequireFail para verificar mensaje de require...");
        await contract.testRequireFail();
    } catch (error) {
        console.error("Error al ejecutar testRequireFail:", error.message);
        console.error("Detalles del error:", error);
    }*/


    // Simulación de los datos del acuerdo (deberían venir del front-end en formato JSON)
    const data = {
        serviceProvider: "0x8789dcfCC65FaF09bFF9CE6a37188062585d1B9A",
        servicePayer: "0x31e331E751e490ef39e8B269399a76f483b2b5Af",
        arbitrator: "0x0aE67cE895B26BdAb093542c8783b985a243E60C",
        startDate: 1730937600,
        endDate: 1733529600,
        amount: 1000000 //1900000
    };

    /*
    // 1. Aprobación de USDC por parte del servicePayer
    const approveTx = await usdcContract.approve(contractAddress, data.amount, {
        gasLimit: 1000000,
        maxPriorityFeePerGas: ethers.utils.parseUnits("25", "gwei"),
        maxFeePerGas: ethers.utils.parseUnits("30", "gwei")
    });

    console.log("Esperando la confirmación de la aprobación...");
    await approveTx.wait();
    console.log("Aprobación confirmada:", approveTx.hash);

    // Código adicional para verificar el saldo antes de llamar a newAgreement
    const usdcBalance = await usdcContract.balanceOf(data.servicePayer);
    console.log("Saldo de USDC del servicePayer:", usdcBalance.toString());

    if (usdcBalance.lt(data.amount)) {
        console.error("El servicePayer no tiene suficiente saldo de USDC.");
        return;
    }


    try {
        // Intenta llamar a newAgreement y captura el error si ocurre
        // 2. Llamada a newAgreement después de la aprobación
        const tx = await contract.newAgreement(
            data.serviceProvider,
            data.servicePayer,
            data.arbitrator,
            data.startDate,
            data.endDate,
            data.amount,
            {
                gasLimit: 1200000, // Ajusta según sea necesario
                maxPriorityFeePerGas: ethers.utils.parseUnits("25", "gwei"), // Tarifa de prioridad mínima requerida
                maxFeePerGas: ethers.utils.parseUnits("30", "gwei") // Tarifa máxima total de gas
            }
        );
        console.log("Esperando la confirmación de la transacción...");
        await tx.wait();
        console.log("Transacción confirmada:", tx.hash);
    } catch (error) {
        console.error("Error al ejecutar newAgreement:", error.reason);
        console.error("Detalles de la transacción fallida:", error);
        return;
    }

    */

    const latestBlock = await provider.getBlock('latest');
    console.log("GasLimit: " + latestBlock.gasLimit.toString());

    const gasEstimate = await contract.estimateGas.newAgreement(
        data.serviceProvider,
        data.servicePayer,
        data.arbitrator,
        data.startDate,
        data.endDate,
        data.amount
    );

    try {
        // Intenta llamar a newAgreement y captura el error si ocurre
        // 2. Llamada a newAgreement después de la aprobación
        console.log("Ejecutando newAgreement... Obteniendo balance...");

        const balance = await wallet.getBalance();
        console.log("Balance actual:", ethers.utils.formatEther(balance));

        const gasEstimate = await contract.estimateGas.newAgreement(
            data.serviceProvider,
            data.servicePayer,
            data.arbitrator,
            data.startDate,
            data.endDate,
            data.amount
        );

        const tx = await contract.newAgreement(
            data.serviceProvider,
            data.servicePayer,
            data.arbitrator,
            data.startDate,
            data.endDate,
            data.amount,
            {
                gasLimit: gasEstimate.toNumber() + 100000, // 29000000 Ajusta según sea necesario
                maxPriorityFeePerGas: ethers.utils.parseUnits("30", "gwei"), // Tarifa de prioridad mínima requerida
                maxFeePerGas: ethers.utils.parseUnits("60", "gwei") // Tarifa máxima total de gas
            }
        );
        //const tx = await contract.newAgreement2(
        //    data.serviceProvider,
        //    data.servicePayer,
        //    data.amount
        //);
        console.log("Esperando la confirmación de newAgreement...");
        await tx.wait();
        console.log("newAgreement confirmada!");
    } catch (error) {
        console.error("Error al ejecutar newAgreement:", error.reason);
        console.error("Detalles de ejecución newAgreement fallida:", error);
        return;
    }


}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
