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
      //accounts: [process.env.PRIVATE_KEY],
      gasPrice: "auto"
    }
  },
    // Script que se ejecuta después de cada compilación
    paths: {
    artifacts: "./artifacts",
  }
};

// Tarea personalizada para copiar el ABI después de la compilación
task("post-compile", "Copia el ABI generado a la ruta de destino")
  .setAction(async () => {
    const sourceABIPath = path.join(
      __dirname,
      "artifacts/contracts/WMCAgreementManagement-v3.sol/WMCAgreementManagement.json"
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
