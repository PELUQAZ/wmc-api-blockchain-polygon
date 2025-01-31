// Variables para los datos del contrato
const API_URL = "https://api-dbpg-cec5d8bta6b5h2aj.canadacentral-01.azurewebsites.net";
const X_API_KEY = "kJdQXtwA1NWh1U9S60SAsUeKkzEM1iJG0A5uNLesS7cgHPJxinfjOk86Wtr2VF7c";
let CONTRACT_ADDRESS;
let USDC_TOKEN_ADDRESS;
let contractABI;
let signer;
let params;
let nextArbiter;
//let apiBaseUrl; // = window.location.hostname === '127.0.0.1' ? 'http://localhost:3000' : 'https://wmc-agreements-app-hncub6e4edcphph5.canadacentral-01.azurewebsites.net';

// Carga el ABI dinámicamente desde el archivo generado por Hardhat
async function loadABI() {
    try {
        //const response = await fetch("../../artifacts/contracts/WMCServiceManagement-v2.sol/WMCServiceManagement.json");
        const response = await fetch("abis/WMCAgreementManagement.json");

        const contractJson = await response.json();
        contractABI = contractJson.abi;

    } catch (error) {
        console.error("Error al cargar el ABI:", error);
    }
}

// Carga la configuración desde config.json
async function loadConfig() {
    try {
        //// Detecta el entorno actual y construye la URL base
        //const baseUrl = window.location.hostname === '127.0.0.1' ? 'http://localhost:3000' : window.location.origin
        //const response = await fetch("/api/config");
        //const response = await fetch("http://localhost:3000/api/config");
        //const response = await fetch(`${baseUrl}/api/config`);
        //const config = await response.json();
        //apiBaseUrl = baseUrl; //config.apiBaseUrl;

        CONTRACT_ADDRESS = '0x40228886eF4e5a74377484F781337b2ADC9e71b2'; //'0xB69895569df53D1f66D11690a756c4ef1eC86188'; //'0xE2e2b4297c51bF174b656F064BA3cb82095A5399'; //config.contractAddress;
        USDC_TOKEN_ADDRESS = '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582'; //'0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359'; //config.usdcTokenAddress;

    } catch (error) {
        console.error("Error al cargar config.json:", error);
    }
}

// Función para cargar SPA, SPR, el siguiente árbitro
async function loadData() {

    if (!CONTRACT_ADDRESS || !contractABI) {
        console.error("La configuración o el ABI no están cargados correctamente.");
        return;
    }
    const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, signer);

    try {
        params = new URLSearchParams(window.location.search);
        //SPA
        const spaConnectedWallet = localStorage.getItem('userAddress');
        const spaChecksumedConnectedWallet = ethers.utils.getAddress(spaConnectedWallet);
        //console.log("spaConnectedWallet = ", spaConnectedWallet);
        const spaParamWallet = params.get('servicePayer') || '';
        const spaChecksumedParamWallet = ethers.utils.getAddress(spaParamWallet);
        //console.log("spaParamWallet = ", spaParamWallet);
        if (spaConnectedWallet == "") {
            console.error("No hay wallet de pagador conectada.");
        }
        else if(spaChecksumedConnectedWallet != spaChecksumedParamWallet) {
            console.error("La wallet del pagador conectada no coincide con la parametrizada.");
            //TODO: Alert para informar al usuario final
        }
        else {
            document.getElementById("servicePayer").value = spaConnectedWallet;
        }

        //SPR
        const sprParamWallet = params.get('serviceProvider') || '';
        document.getElementById("serviceProvider").value = sprParamWallet;

        //Árbitro
        //nextArbiter = await contract.getNextArbiter();
        nextArbiter = contract.getNextArbiter()
            .then(result => console.log("Árbitro obtenido: ", result))
            .catch(error => console.error("Error en getNextArbiter: ", error));
        document.getElementById("arbitrator").value = nextArbiter;

    } catch (error) {
        console.error("Error cargando parámetros.", error);
    }
}

// Función para conectar Metamask
async function connectWallet() {
    
    if (typeof ethers === "undefined") {
        console.error("ethers.js no se cargó correctamente. Revisa el archivo 'ethers.umd.min.js'");
    }

    if (!ethers.utils) {
        console.error("ethers.js no está cargado correctamente.");
    } else {
        if (typeof window.ethereum !== "undefined") {
            try {
                const provider = new ethers.providers.Web3Provider(window.ethereum);
                signer = provider.getSigner();
                ethereum.request({ method: "eth_requestAccounts" })
                    .then(async (accounts) => {
                        const userAddress = accounts[0];
                        // Guarda la dirección en localStorage para usarla luego
                        localStorage.setItem('userAddress', userAddress);
                        //console.log(`Wallet conectada: ${userAddress}`);

                        // Obtener la URL de la red blockchain
                        //const network = await provider.getNetwork();
                        //console.log(`Red conectada: ${network.name} (Chain ID: ${network.chainId})`);
                        //console.log(`Proveedor: ${provider.connection.url}`);

                        // Muestra la dirección en el campo "Wallet proveedor servicio (freelancer)"
                        //document.getElementById("servicePayer").value = "-" + userAddress;
                    })
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
async function getAgreement() {
    if (!signer) {
        alert("Primero, conecta tu wallet.");
        return;
    }

    if (!CONTRACT_ADDRESS || !contractABI) {
        console.error("La configuración o el ABI no están cargados correctamente.");
        return;
    }

    // Instancia del contrato
    const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, signer);
    // ID del acuerdo que deseas consultar
    const agreementId = document.getElementById("agreementId").value;

    try {
        const agreement = await contract.agreements(agreementId);
        // Desglosa los datos obtenidos del acuerdo
        console.log("Datos acuerdo:");
        console.log("Service Provider:", agreement.serviceProvider);
        console.log("Service Payer:", agreement.servicePayer);
        console.log("Start Date:", agreement.startDate.toString());
        console.log("End Date:", agreement.endDate.toString());
        console.log("Hours:", agreement.numHours.toString());
        console.log("Amount:", agreement.amount.toString());
        console.log("Arbitration State:", agreement.arbitrationState);
        console.log("SPA Agree:", agreement.spaAgree);
        console.log("SPR Agree:", agreement.sprAgree);
    } catch (error) {
        console.error("Error al consultar el acuerdo:", error);
    }
}

// Función para ejecutar creategreement a través de Metamask
async function createAgreement() {
    if (!signer) {
        alert("Primero, conecta tu wallet.");
        return;
    }

    if (!CONTRACT_ADDRESS || !USDC_TOKEN_ADDRESS || !contractABI) {
        console.error("La configuración o el ABI no están cargados correctamente.");
        return;
    }

    // Obtén los valores de los campos del formulario
    const serviceProvider = document.getElementById("serviceProvider").value;
    const servicePayer = document.getElementById("servicePayer").value;
    // Convierte las fechas de inicio y fin a formato UNIX timestamp
    const startDateInput = document.getElementById("startDate").value;
    const endDateInput = document.getElementById("endDate").value;
    // Convierte las fechas al formato UNIX timestamp
    const startDate = Math.floor(new Date(startDateInput).getTime() / 1000);
    const endDate = Math.floor(new Date(endDateInput).getTime() / 1000);
    // Obtén el valor por hora y número de horas, calcula el monto total en formato de USDC (con 6 decimales)
    const hourlyRate = parseFloat(document.getElementById("hourlyRate").value) || 0;
    const numHours = parseInt(document.getElementById("numHours").value) || 0;
    const arbitrateFee = 0.2; //parseFloat(document.getElementById("arbitrateFee").value) || 0;
    const daoFee = 0.3; // parseFloat(document.getElementById("daoFee").value) || 0;
    // Formatear el monto total con solo 1 decimal antes de calcular el amount
    const totalAmount = parseFloat((hourlyRate * numHours + arbitrateFee + daoFee).toFixed(1));
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
    const onChainData = {
        serviceProvider: serviceProvider,
        servicePayer: servicePayer,
        //arbitrator: arbitrator,
        startDate: startDate,
        endDate: endDate,
        numHours: numHours,
        amount: amount
    };
    
    try {
        console.log("Aprobando transferencia de USDC");

        // Instancia del contrato
        const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, signer);

        // Instancia del contrato de USDC
        const usdcContract = new ethers.Contract(USDC_TOKEN_ADDRESS, [
            "function approve(address spender, uint256 amount) external returns (bool)"
        ], signer);

        console.log("Inicia tx aprobación. Estimando gas para transacción de aprobación...");
        const approveGasEstimate = await usdcContract.estimateGas.approve(CONTRACT_ADDRESS, onChainData.amount);
        console.log("Estimación ok. Ejecutando transacción de aprobación...");
        // Ejecuta la transacción usando la estimación de gas
        const approveTx = await usdcContract.approve(CONTRACT_ADDRESS, onChainData.amount, {
            gasLimit: approveGasEstimate.toNumber() + 100000, // Utiliza la estimación de gas
            maxPriorityFeePerGas: ethers.utils.parseUnits("30", "gwei"), // Tarifa de prioridad mínima requerida
            maxFeePerGas: ethers.utils.parseUnits("60", "gwei") // Tarifa máxima total de gas
        });

        console.log("Continua tx aprobación.");
        await approveTx.wait();
        console.log("Transferencia aprobada.");

        console.log("Estimando gas tx crear acuerdo.");

        console.log("onChainData.serviceProvider =", onChainData.serviceProvider);
        console.log("onChainData.servicePayer =", onChainData.servicePayer);
        console.log("onChainData.startDate =", onChainData.startDate);
        console.log("onChainData.endDate =", onChainData.endDate);
        console.log("onChainData.numHours =", onChainData.numHours);
        console.log("onChainData.amount =", onChainData.amount);

        const agreementGasEstimate = await contract.estimateGas.newAgreement(
            onChainData.serviceProvider,
            onChainData.servicePayer,
            onChainData.startDate,
            onChainData.endDate,
            onChainData.numHours,
            onChainData.amount
        );

        console.log("Ejecutando tx newAgreement con gas estimado");
        const tx = await contract.newAgreement(
            onChainData.serviceProvider,
            onChainData.servicePayer,
            onChainData.startDate,
            onChainData.endDate,
            onChainData.numHours,
            onChainData.amount,
            {
                gasLimit: agreementGasEstimate.toNumber() + 100000, // 29000000 Ajusta según sea necesario
                maxPriorityFeePerGas: ethers.utils.parseUnits("30", "gwei"), // Tarifa de prioridad mínima requerida
                maxFeePerGas: ethers.utils.parseUnits("60", "gwei") // Tarifa máxima total de gas
            }
        );

        console.log("Esperando confirmación de la transacción");
        
        //await tx.wait();
        const receipt = await tx.wait();
        // Extraer el ID del acuerdo del evento emitido
        const event = receipt.events.find(e => e.event === "NewAgreementCreated");
        const acuerdo_id_sc = event ? event.args[0].toNumber() : null;
        console.log("Acuerdo creado con ID:", acuerdo_id_sc);
        console.log("Tx newAgreement ejecutada con éxito. Hash de la tx: ", tx.hash);

        //Obtener todos los datos necesarios para guardar en tabla tx_acuerdos:
        //const servicio_id = parseInt(params.get('serviceId'), 10) || 0;
        const servicio_id = params.get('serviceId') || '';
        // Convierte el timestamp UNIX a una fecha ISO 8601
        const startDateISO = new Date(onChainData.startDate * 1000).toISOString();
        const endDateISO = new Date(onChainData.endDate * 1000).toISOString();

        // Variables para cada ID, identificando cada wallet
        let idPagador = null, idProveedor = null, idArbitro = null;

        //Obtener ids participantes del acuerdo
        try {
            const walletsParam = `${onChainData.servicePayer},${onChainData.serviceProvider},${nextArbiter}`;
            const url = `${API_URL}/users/wallets/${walletsParam}`;
            const response = await fetch(url, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": X_API_KEY
                }
            });
    
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }
    
            const data = await response.json();
    
            // Asignar IDs según el rol recibido
            if (Array.isArray(data) && data.length > 0) {
                data.forEach(user => {
                    if (user.rol === "pagador") idPagador = user.id;
                    else if (user.rol === "proveedor") idProveedor = user.id;
                    else if (user.rol === "árbitro") idArbitro = user.id;
                });
                console.log("ID Pagador:", idPagador);
                console.log("ID Proveedor:", idProveedor);
                console.log("ID Árbitro:", idArbitro);
            } else {
                throw new Error("No se encontró usuario con esa wallet");
            }
        } catch (error) {
            console.error("Error al obtener el ID del usuario:", error);
            return null;
        }
   
        const offChainData = {
            servicio_id: servicio_id,
            horas: onChainData.numHours,
            monto: parseFloat(onChainData.amount.toString()) / 10**6,
            fecha_inicio: startDateISO,
            fecha_fin: endDateISO,
            address_sc: CONTRACT_ADDRESS,
            tipo_token: "USDC",
            acuerdo_id_sc: acuerdo_id_sc,
            hash_tx: tx.hash,
            id_pagador: idPagador,
            id_arbitro: idArbitro,
            id_proveedor: idProveedor
        };

        console.log("Datos enviados a la API:", offChainData);
        console.log("Guardando acuerdo en la base de datos...");

        try {
            // Llamar a la API con POST
            const response = await fetch(
                `${API_URL}/agreements`,
                {
                    method: "POST", // Método HTTP
                    headers: {
                        "Content-Type": "application/json", // Indicar que el cuerpo es JSON
                        "x-api-key": X_API_KEY // Si tu API requiere autenticación
                    },
                    body: JSON.stringify(offChainData) // Convertir los datos a JSON
                }
            );

            if (!response.ok) {
                throw new Error(`Error al guardar el acuerdo: ${response.statusText}`);
            }

            const responseData = await response.json(); // Leer la respuesta del servidor
            console.log("Acuerdo guardado con éxito:", responseData);

            alert("Acuerdo guardado con éxito: ", responseData);

        } catch (error) {
            console.error("Error al guardar el acuerdo en la base de datos:", error);
        }

    } catch (error) {
        // Captura el mensaje del error devuelto por 'require' y lo muestra en el front-end
        if (error.data && error.data.message) {
            console.error("Error devuelto por el contrato:", error.data.message);
        } else {
            console.error("Error al ejecutar newAgreement:", error);
        }
        alert("Error al crear el acuerdo.");
    }
}

async function payAgreement() {
    if (!signer) {
        alert("Primero, conecta tu wallet.");
        return;
    }

    if (!CONTRACT_ADDRESS || !contractABI) {
        console.error("La configuración o el ABI no están cargados correctamente.");
        return;
    }
    console.log("Iniciando pagos");
    // Instancia del contrato
    const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, signer);

    // ID del acuerdo que deseas consultar
    const agreementId = document.getElementById("agreementId").value;
    const agreementIds = [agreementId];
    console.log("Iniciando estimación de gas");
    try {
        const gasEstimate = await contract.estimateGas.processAgreementsBatch(agreementIds);
        console.log("Gas estimado. Iniciando pagos.");
        const tx = await contract.processAgreementsBatch(
            agreementIds,
            {
                gasLimit: gasEstimate.toNumber() + 100000, // 29000000 Ajusta según sea necesario
                maxPriorityFeePerGas: ethers.utils.parseUnits("30", "gwei"), // Tarifa de prioridad mínima requerida
                maxFeePerGas: ethers.utils.parseUnits("60", "gwei") // Tarifa máxima total de gas
            });
        console.log("Acuerdo pagado - tx.hash = ", tx);

        //TODO: Actualizar acuerdo en BD

    } catch (error) {
        console.error("Error al pagar acuerdo:", error);
    }
}

async function disagreement() {
    if (!signer) {
        alert("Primero, conecta tu wallet.");
        return;
    }

    if (!CONTRACT_ADDRESS || !contractABI) {
        console.error("La configuración o el ABI no están cargados correctamente.");
        return;
    }
    console.log("Iniciando desacuerdo");
    // Instancia del contrato
    const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, signer);

    // ID del acuerdo que deseas consultar
    const agreementId = document.getElementById("agreementId").value;
    console.log("Iniciando estimación de gas");
    try {
        const gasEstimate = await contract.estimateGas.setAgreement(agreementId, false);
        console.log("Gas estimado. Iniciando pagos.");
        const tx = await contract.setAgreement(
            agreementId,
            false,
            {
                gasLimit: gasEstimate.toNumber() + 100000, // 29000000 Ajusta según sea necesario
                maxPriorityFeePerGas: ethers.utils.parseUnits("30", "gwei"), // Tarifa de prioridad mínima requerida
                maxFeePerGas: ethers.utils.parseUnits("60", "gwei") // Tarifa máxima total de gas
            });
        console.log("Desacuerdo pagado - tx.hash = ", tx);
    } catch (error) {
        console.error("Error al pagar desacuerdo:", error);
    }
}

// Carga la configuración y el ABI al inicio
(async () => {
    await loadConfig();
    await loadABI();
    await connectWallet();
    await loadData();
})();

//Event listener para validación de decimales
document.getElementById("hourlyRate").addEventListener("input", function (event) {
    let value = event.target.value;

    // Asegurar máximo 2 decimales sin bloquear la escritura
    if (value.includes(".")) {
        let parts = value.split(".");
        if (parts[1].length > 2) {
            event.target.value = parseFloat(value).toFixed(2);
        }
    }

    // Evitar valores mayores a 100000
    if (parseFloat(value) > 100000) {
        event.target.value = "100000.00";
    }
});

document.getElementById("hourlyRate").addEventListener("keydown", function (event) {
    let value = event.target.value;

    // Permitir teclas esenciales como borrar, tab, enter, etc.
    if (
        ["Backspace", "Delete", "Tab", "Enter", "ArrowLeft", "ArrowRight"].includes(event.key)
    ) {
        return;
    }

    // Permitir solo números y un punto decimal
    if (!/[\d.]/.test(event.key)) {
        event.preventDefault();
        return;
    }

    // Evitar más de un punto decimal
    if (event.key === "." && value.includes(".")) {
        event.preventDefault();
        return;
    }

    // Permitir escribir dos decimales sin bloquear el segundo dígito
    if (value.includes(".")) {
        let parts = value.split(".");
        if (parts[1].length >= 2 && event.target.selectionStart > value.indexOf(".")) {
            event.preventDefault();
            return;
        }
    }

    // Bloquear valores mayores a 100000 antes de ingresarlos
    let newValue = value + event.key;
    if (parseFloat(newValue) > 100000) {
        event.preventDefault();
        return;
    }
});

// Event listeners para los botones
//document.getElementById("connectWallet").addEventListener("click", connectWallet);
document.getElementById("createAgreement").addEventListener("click", createAgreement);
document.getElementById("getAgreement").addEventListener("click", getAgreement);
document.getElementById("disagreement").addEventListener("click", disagreement);
//document.getElementById("payAgreement").addEventListener("click", payAgreement);