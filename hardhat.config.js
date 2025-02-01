require("@nomicfoundation/hardhat-toolbox");
require("@nomiclabs/hardhat-ethers");
require("dotenv").config();
const fs = require("fs");
const path = require("path");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.24",
  networks: {
    amoy: {
      url: process.env.NETWORK_URL,
      accounts: [process.env.PRIVATE_KEY],
      gasPrice: "auto",  // Permite usar el gas estimado
      gasPrice: 25000000000,  // 25 Gwei (ajústalo si sigue fallando)
      maxFeePerGas: 30000000000, // 30 Gwei
      maxPriorityFeePerGas: 25000000000 // 25 Gwei
    }
  },
    // Script que se ejecuta después de cada compilación
    paths: {
    artifacts: "./artifacts",
  },
  include: ["./contracts/WMCAgreementManagement-v6.sol"], // 🔹 Solo compilará este contrato
};

// Tarea personalizada para copiar el ABI después de la compilación
task("post-compile", "Copia el ABI generado a la ruta de destino")
  .setAction(async () => {

    const contractsDir = path.join(__dirname, "contracts");

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
      return;
    }

    console.log(`Última versión detectada: ${latestContract}`);

    // Definir las rutas del ABI
    const contractName = `WMCAgreementManagement-v${latestVersion}`;

    const sourceABIPath = path.join(
      __dirname,
      "artifacts/contracts/WMCAgreementManagement-v6.sol/WMCAgreementManagement.json"
    );
    const targetABIPath = path.join(
      __dirname,
      "test/front/abis/WMCAgreementManagement.json"
    );
    try {
      // Verificar si el archivo de origen existe
      if (fs.existsSync(sourceABIPath)) {
        // Crear directorio de destino si no existe
        const targetDir = path.dirname(targetABIPath);
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }
        // Copiar el archivo ABI al destino
        fs.copyFileSync(sourceABIPath, targetABIPath);
        console.log(`ABI copiado a ${targetABIPath}`);
      } else {
        console.warn(`No se encontró el ABI en ${sourceABIPath}`);
      }
    } catch (error) {
      console.error(`Error copiando el ABI: ${error.message}`);
    }
  });
