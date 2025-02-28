require("@nomicfoundation/hardhat-toolbox");
require("@nomiclabs/hardhat-ethers");
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.24",
  networks: {
    amoy: {
      url: process.env.NETWORK_URL,
      accounts: [process.env.PRIVATE_KEY],
      gas: 6000000, //"auto"
      gasPrice: 25000000000, //"auto" 25 Gwei (ajústalo si sigue fallando) - antes: "auto"
      maxFeePerGas: 30000000000, // 30 Gwei (ajusta según necesidad)
      maxPriorityFeePerGas: 25000000000, // 25 Gwei (ajusta según necesidad)
    },
    polygon: {
      url: process.env.POLYGON_NETWORK_URL || "https://polygon-mainnet.infura.io/",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gas: 6000000, //"auto"
      gasPrice: 25000000000, //"auto" 25 Gwei (ajústalo si sigue fallando) - antes: "auto"
      maxFeePerGas: 30000000000, // 30 Gwei (ajusta según necesidad)
      maxPriorityFeePerGas: 25000000000, // 25 Gwei (ajusta según necesidad)
    }
  },
    // Script que se ejecuta después de cada compilación
  paths: {
    artifacts: "./artifacts",
  },
  include: ["./contracts/WMCAgreementManagement-v7.sol"], // 🔹 Solo compilará este contrato
};

// Verificar si las variables de entorno están cargadas
//console.log("RPC URL:", process.env.NETWORK_URL);
//console.log("Private Key:", process.env.PRIVATE_KEY ? "Cargada ✅" : "No cargada ❌");

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
      "artifacts/contracts/WMCAgreementManagement-v7.sol/WMCAgreementManagement.json"
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
