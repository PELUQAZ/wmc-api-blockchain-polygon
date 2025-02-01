const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {

    const contractsDir = path.join(__dirname, "../contracts");

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
        console.error("No se encontró ninguna versión de WMCAgreementManagement-vX.sol");
        process.exit(1);
    }

    console.log(`Última versión detectada: ${latestContract}`);

    const contractName = 'WMCAgreementManagement';
    //const contractName = `WMCAgreementManagement-v${latestVersion}`;
    const fullyQualifiedName = `contracts/${latestContract}:${contractName}`;

    // Obtener la fábrica del contrato con el nombre dinámico
    //const WMC = await ethers.getContractFactory("contracts/WMCAgreementManagement-v6.sol:WMCAgreementManagement");
    WMC = await ethers.getContractFactory(fullyQualifiedName);
    const contract = await WMC.deploy("0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582");
    await contract.deployed();

    console.log(`Contrato desplegado en: ${contract.address}`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
