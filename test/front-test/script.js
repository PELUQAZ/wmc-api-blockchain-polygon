// Variables para los datos del contrato
let contractAddress;
let usdcTokenAddress;
let contractABI;
let signer;
let apiBaseUrl;

// Carga el ABI dinámicamente desde el archivo generado por Hardhat
async function loadABI() {
    try {
        const response = await fetch("../../artifacts/contracts/WMCServiceManagement-v2.sol/WMCServiceManagement.json");
        const contractJson = await response.json();
        contractABI = contractJson.abi;
        //console.log("ABI cargado correctamente:", contractABI);
    } catch (error) {
        console.error("Error al cargar el ABI:", error);
    }
}

// Carga la configuración desde config.json
async function loadConfig() {
    try {
        const response = await fetch("config.json");
        const config = await response.json();
        contractAddress = process.env.SC_CONTRACT_ADDRESS; //config.contractAddress;
        usdcTokenAddress = process.env.USDC_TOKEN_ADDRESS; //config.usdcTokenAddress;
        apiBaseUrl = process.env.API_BASE_URL; //config.apiBaseUrl;
    } catch (error) {
        console.error("Error al cargar config.json:", error);
    }
}

// Función para conectar Metamask
async function connectWallet() {
    if (typeof ethers === "undefined") {
        console.error("ethers.js no se cargó correctamente. Revisa el archivo 'ethers.umd.min.js'");
    }
    //console.log("ethers.utils = ", ethers.utils);
    if (!ethers.utils) {
        console.error("ethers.js no está cargado correctamente.");
    } else {
        if (typeof window.ethereum !== "undefined") {
            try {
                const provider = new ethers.providers.Web3Provider(window.ethereum);
                signer = provider.getSigner();
                ethereum.request({ method: "eth_requestAccounts" })
                    .then((accounts) => {
                        const userAddress = accounts[0];
                        // Guarda la dirección en localStorage para usarla luego
                        localStorage.setItem('userAddress', userAddress);
                        console.log(`Wallet connected: ${userAddress}`);
                        // Muestra la dirección en el campo "Wallet proveedor servicio (freelancer)"
                        document.getElementById("servicePayer").value = userAddress;
                    })
                //console.log("Wallet conectada:", await signer.getAddress());
            } catch (error) {
                console.error("Error al conectar con Metamask:", error);
            }
        } else {
            alert("Instala Metamask para continuar.");
            window.open("https://metamask.io/download/", "_blank");
        }
    }
}

// Función para consultar el acuerdo
/*async function getAgreement() {
    if (!signer) {
        alert("Primero, conecta tu wallet.");
        return;
    }

    if (!contractAddress || !contractABI) {
        console.error("La configuración o el ABI no están cargados correctamente.");
        return;
    }

    // Instancia del contrato
    const contract = new ethers.Contract(contractAddress, contractABI, signer);

    // ID del acuerdo que deseas consultar (por ejemplo, 0)
    const agreementId = 0;

    try {
        console.log("Consultando el acuerdo con ID:", agreementId);

        const agreement = await contract.agreements(agreementId);

        // Desglosa los datos obtenidos del acuerdo
        console.log("Datos del acuerdo:");
        console.log("Service Provider:", agreement.serviceProvider);
        console.log("Service Payer:", agreement.servicePayer);
        console.log("Arbitrator:", agreement.arbitrator);
        console.log("Start Date:", agreement.startDate.toString());
        console.log("End Date:", agreement.endDate.toString());
        console.log("Amount:", agreement.amount.toString());
        console.log("Estado:", agreement.estado);
        console.log("SPA Agree:", agreement.spaAgree);
        console.log("SPR Agree:", agreement.sprAgree);
    } catch (error) {
        console.error("Error al consultar el acuerdo:", error);
    }
}*/

// Función para consultar el acuerdo a través de la API
async function getAgreementByApi() {
    //console.log("signer = ", signer);
    if (!signer) {
        alert("Primero, conecta tu wallet.");
        return;
    }

    //const agreementId = 0; // El ID del acuerdo que quieres consultar
    // Obtiene el valor del ID de acuerdo del campo de texto
    const agreementIdInput = document.getElementById("agreementId").value;
    const agreementId = parseInt(agreementIdInput, 10); // Asegura que sea un número entero
    if (isNaN(agreementId) || agreementId < 0) {
        alert("Favor ingresa un ID de acuerdo válido (entero mayor o igual a cero).");
        return;
    }

    const userAddress = localStorage.getItem('userAddress');
    const message = `Consulta de acuerdo ${agreementId} para el usuario ${userAddress}`;

    console.log("Iniciando getAgreementByApi");
    try {
        // Firma el mensaje
        const signature = await signer.signMessage(message);
        //console.log("Firma del mensaje:", signature);

        // Llama a la API pasando la firma y la dirección
        const response = await fetch(`${apiBaseUrl}/api/agreements/${agreementId}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                userAddress: userAddress,
                signature: signature
            })
        });

        // Verifica si la respuesta es exitosa
        if (!response.ok) {
            throw new Error(`Error en la respuesta de la API: ${response.statusText}`);
        }

        // Obtiene los datos del acuerdo en formato JSON
        const agreement = await response.json();

        // Desglosa los datos obtenidos del acuerdo
        console.log("Datos del acuerdo:");
        console.log("Service Provider:", agreement.serviceProvider);
        console.log("Service Payer:", agreement.servicePayer);
        console.log("Arbitrator:", agreement.arbitrator);
        console.log("Start Date:", agreement.startDate);
        console.log("End Date:", agreement.endDate);
        console.log("Amount:", agreement.amount);
        console.log("Estado:", agreement.estado);
        console.log("SPA Agree:", agreement.spaAgree);
        console.log("SPR Agree:", agreement.sprAgree);
    } catch (error) {
        console.error("Error al consultar el acuerdo:", error);
    }
}

// Función para ejecutar newAgreement a través de Metamask
async function executeAgreement() {
    if (!signer) {
        alert("Primero, conecta tu wallet.");
        return;
    }

    if (!contractAddress || !usdcTokenAddress || !contractABI) {
        console.error("La configuración o el ABI no están cargados correctamente.");
        return;
    }

    // Instancia del contrato
    const contract = new ethers.Contract(contractAddress, contractABI, signer);

    // Obtén los valores de los campos del formulario
    const serviceProvider = document.getElementById("serviceProvider").value;
    const servicePayer = document.getElementById("servicePayer").value;
    const arbitrator = document.getElementById("arbitrator").value;
    // Convierte las fechas de inicio y fin a formato UNIX timestamp
    const startDateInput = document.getElementById("startDate").value;
    const endDateInput = document.getElementById("endDate").value;
    // Convierte las fechas al formato UNIX timestamp
    const startDate = Math.floor(new Date(startDateInput).getTime() / 1000);
    const endDate = Math.floor(new Date(endDateInput).getTime() / 1000);
    // Obtén el valor por hora y número de horas, calcula el monto total en formato de USDC (con 6 decimales)
    const hourlyRate = parseFloat(document.getElementById("hourlyRate").value) || 0;
    const numHours = parseInt(document.getElementById("numHours").value) || 0;
    const totalAmount = hourlyRate * numHours;
    // Formatear el monto total a la cantidad de decimales para USDC (6 decimales)
    const amount = ethers.utils.parseUnits(totalAmount.toString(), 6);

    // Parámetros del acuerdo (ejemplo)
    /*const data = {
        serviceProvider: "0x8789dcfCC65FaF09bFF9CE6a37188062585d1B9A",
        servicePayer: "0x31e331E751e490ef39e8B269399a76f483b2b5Af",
        arbitrator: "0x0aE67cE895B26BdAb093542c8783b985a243E60C",
        startDate: 1731283200, //1730851200 = 2024-11-06 00:00:00 (UTC) - 1730937600 = 2024-11-07 00:00:00 (UTC)
        endDate: 1731283200, //1733529600 = 2024-12-07 00:00:00 (UTC)
        amount: 3000000 //ethers.utils.parseUnits("1", 6) // USDC, en este caso 1 dólar
    };*/
    const data = {
        serviceProvider: serviceProvider,
        servicePayer: servicePayer,
        arbitrator: arbitrator,
        startDate: startDate,
        endDate: endDate,
        amount: amount
    };
    
    console.log("Datos del acuerdo:", data);

    try {
        console.log("Aprobando la transferencia de USDC. usdcTokenAddress = ", usdcTokenAddress);

        // Instancia del contrato de USDC
        const usdcContract = new ethers.Contract(usdcTokenAddress, [
            "function approve(address spender, uint256 amount) external returns (bool)"
        ], signer);

        console.log("Inicia tx. Estimando gas para transacción de aprobación... amount = ", data.amount);
        const approveGasEstimate = await usdcContract.estimateGas.approve(contractAddress, data.amount);
        // Ejecuta la transacción usando la estimación de gas
        const approveTx = await usdcContract.approve(contractAddress, data.amount, {
            gasLimit: approveGasEstimate.toNumber() + 100000, // Utiliza la estimación de gas
            maxPriorityFeePerGas: ethers.utils.parseUnits("30", "gwei"), // Tarifa de prioridad mínima requerida
            maxFeePerGas: ethers.utils.parseUnits("60", "gwei") // Tarifa máxima total de gas
        });

        console.log("Continua tx...");
        await approveTx.wait();
        console.log("Transferencia aprobada.");

        console.log("Estimando gas para transacción de nuevo acuerdo...");
        const agreementGasEstimate = await contract.estimateGas.newAgreement(
            data.serviceProvider,
            data.servicePayer,
            data.arbitrator,
            data.startDate,
            data.endDate,
            data.amount
        );

        console.log("Ejecutando newAgreement con gas estimado...");
        const tx = await contract.newAgreement(
            data.serviceProvider,
            data.servicePayer,
            data.arbitrator,
            data.startDate,
            data.endDate,
            data.amount,
            {
                gasLimit: agreementGasEstimate.toNumber() + 100000, // 29000000 Ajusta según sea necesario
                maxPriorityFeePerGas: ethers.utils.parseUnits("30", "gwei"), // Tarifa de prioridad mínima requerida
                maxFeePerGas: ethers.utils.parseUnits("60", "gwei") // Tarifa máxima total de gas
            }
        );

        console.log("Esperando confirmación de la transacción...");
        await tx.wait();
        console.log("newAgreement ejecutada con éxito:", tx.hash);
    } catch (error) {
        // Captura el mensaje del error devuelto por 'require' y lo muestra en el front-end
        //console.log("error.data = ", error.data);
        //console.log("error.data.message = ", error.data.message);
        if (error.data && error.data.message) {
            console.error("Error devuelto por el contrato:", error.data.message);
        } else {
            console.error("Error al ejecutar newAgreement:", error);
        }
    }
}

async function executeAgreementByApi() {
    if (!signer) {
        alert("Primero, conecta tu wallet.");
        return;
    }

    /*if (!contractAddress || !usdcTokenAddress || !apiBaseUrl) {
        console.error("La configuración no está cargada correctamente.");
        return;
    }*/

    // Instancia del contrato
    //const contract = new ethers.Contract(contractAddress, contractABI, signer);

    const userAddress = localStorage.getItem('userAddress');

    const serviceProvider = "0x8789dcfCC65FaF09bFF9CE6a37188062585d1B9A";
    const servicePayer = userAddress; //"0x31e331E751e490ef39e8B269399a76f483b2b5Af"
    const arbitrator = "0x0aE67cE895B26BdAb093542c8783b985a243E60C";
    const startDate = 1731110400;
    const endDate = 1735603200;
    const amount = 5000000;

    // Parámetros del acuerdo
    const agreementData = {
        serviceProvider: serviceProvider,
        servicePayer: servicePayer,
        arbitrator: arbitrator,
        startDate: startDate, //1730851200 = 2024-11-06 00:00:00 (UTC) - 1730937600 = 2024-11-07 00:00:00 (UTC)
        endDate: endDate, //1733529600 = 2024-12-07 00:00:00 (UTC)
        amount: amount //ethers.utils.parseUnits("1", 6) // USDC, en este caso 1 dólar
    };

    console.log("Iniciando executeAgreementByApi");

    try {
        // Estimar gas y aprobar USDC
        const usdcContract = new ethers.Contract(usdcTokenAddress, [
            "function approve(address spender, uint256 amount) external returns (bool)"
        ], signer);
        
        //const approveTx = await usdcContract.approve(contractAddress, agreementData.amount);
        const approveGasEstimate = await usdcContract.estimateGas.approve(contractAddress, agreementData.amount);
        const approveTx = await usdcContract.approve(contractAddress, agreementData.amount, {
            gasLimit: approveGasEstimate.toNumber() + 100000, // Utiliza la estimación de gas
            maxPriorityFeePerGas: ethers.utils.parseUnits("30", "gwei"), // Tarifa de prioridad mínima requerida
            maxFeePerGas: ethers.utils.parseUnits("60", "gwei") // Tarifa máxima total de gas
        });
        await approveTx.wait();

        console.log("USDC aprobado.");

        // Generar el mensaje para firmar, permitiendo que el backend lo valide
        const message = `Solicitud para crear acuerdo con ID aleatorio para el usuario ${agreementData.servicePayer}`;
        const signature = await signer.signMessage(message);

        // Llama a la API pasando la firma y la dirección
        const response = await fetch(`${apiBaseUrl}/api/agreements`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                ...agreementData,
                signature: signature
            })
        });

        // Verifica si la respuesta es exitosa
        if (!response.ok) {
            throw new Error(`Error en la respuesta de la API: ${response.statusText}`);
        }

        // Obtiene los datos del acuerdo en formato JSON
        const result = await response.json();
        console.log("Acuerdo creado con éxito:", result.transactionHash);

    } catch (error) {
        console.error("Error al consultar el acuerdo:", error);
    }

}

// Carga la configuración y el ABI al inicio
(async () => {
    await loadConfig();
    await loadABI();
})();

// Event listeners para los botones
document.getElementById("connectWallet").addEventListener("click", connectWallet);
document.getElementById("executeAgreement").addEventListener("click", executeAgreement);
document.getElementById("executeAgreementByApi").addEventListener("click", executeAgreementByApi);
document.getElementById("getAgreement").addEventListener("click", getAgreement);
document.getElementById("getAgreementByApi").addEventListener("click", getAgreementByApi);