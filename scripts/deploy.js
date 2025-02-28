const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    const contractsDir = path.join(__dirname, "../contracts");
    
    //const addressUsdcTokenAmoy = "0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582";
    const addressUsdcTokenPolygon = "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359";

    // Buscar la versión más alta de WMCAgreementManagement-vX.sol
    const contractFiles = fs.readdirSync(contractsDir);
    const regex = /^WMCAgreementManagement-v(\d+)\.sol$/;
    let latestVersion = 0;
    let latestContract = null;

    contractFiles.forEach((file) => {
        const match = file.match(regex);
        if (match) {
            const version = parseInt(match[1], 10);
            if (version > latestVersion) {
                latestVersion = version;
                latestContract = file;
            }
        }
    });

    if (!latestContract) {
        console.error("❌ No se encontró ninguna versión de WMCAgreementManagement-vX.sol");
        process.exit(1);
    }

    console.log(`✅ Última versión detectada: ${latestContract}`);

    const contractName = "WMCAgreementManagement";
    const fullyQualifiedName = `contracts/${latestContract}:${contractName}`;
    console.log(`⚡ fullyQualifiedName: ${fullyQualifiedName}`);

    // Obtener la fábrica del contrato con el nombre dinámico
    try {
        const WMC = await ethers.getContractFactory(fullyQualifiedName);
        console.log("⏳ Estimando gas necesario...");

        // Obtener la wallet desplegadora
        const [deployer] = await ethers.getSigners();

        // Estimar el gas antes de desplegar
        const estimatedGas = await ethers.provider.estimateGas(
            WMC.getDeployTransaction(addressUsdcTokenPolygon)
        );
        console.log(`⛽ Gas estimado para el despliegue: ${estimatedGas.toString()}`);

        console.log("🚀 Iniciando deploy con gas manual...");

        const gasLimit = 6000000; // Límite de gas razonable
        const gasPrice = ethers.utils.parseUnits("25", "gwei"); // 25 Gwei

        const contract = await WMC.deploy(addressUsdcTokenPolygon, {
            gasLimit: gasLimit, //estimatedGas.mul(2) + 100000,  // 🔹 Usamos el doble del gas estimado para evitar bloqueos
            gasPrice: gasPrice
        });

        console.log("✅ Transacción enviada. Esperando confirmación...");
        await contract.deployed();

        console.log(`🎉 Contrato desplegado en: ${contract.address}`);
    } catch (error) {
        console.error("❌ Error desplegando: ", error);
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
