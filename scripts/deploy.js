const { ethers } = require("hardhat");

async function main() {
    //const WMC = await ethers.getContractFactory("WMCAgreementManagement-v6");
    const WMC = await ethers.getContractFactory("contracts/WMCAgreementManagement-v6.sol:WMCAgreementManagement");
    const contract = await WMC.deploy("0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582");
    await contract.deployed();

    console.log(`Contrato desplegado en: ${contract.address}`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
