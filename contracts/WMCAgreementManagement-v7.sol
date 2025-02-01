// SPDX-License-Identifier: All Rights Reserved
// © 2024, WorkMarketCap. Todos los derechos reservados.

pragma solidity ^0.8.24;

/// @title WMCServiceManagement - Gestión de acuerdos con fees para DAO y árbitros.
/// @notice Permite crear, gestionar y finalizar acuerdos entre proveedores y pagadores de servicios.
/// @dev Integra pagos de fees fijos para DAO y árbitros en el proceso de creación de acuerdos, simplificando estados y permitiendo automatización con ChainLink.

interface IERC20 {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
}

contract WMCAgreementManagement {
    IERC20 public usdcToken;

    // Enum para representar el estado de arbitraje
    enum ArbitrationState { NoArbitration, Arbitration, ResolvedSPA, ResolvedSPR }

    // Estructura para almacenar la información de un acuerdo
    struct Agreement {
        address serviceProvider;   // Wallet del proveedor del servicio
        address servicePayer;      // Wallet del pagador del servicio
        address arbitrator;        // Wallet del árbitro asignado
        uint256 startDate;         // Fecha de inicio del acuerdo
        uint256 endDate;           // Fecha de fin del acuerdo
        uint256 numHours;          // Horas acordadas
        uint256 amount;            // Monto acordado en USDC
        bool spaAgree;             // Aprobación del pagador
        bool sprAgree;             // Aprobación del proveedor
        ArbitrationState arbitrationState; // Estado de arbitraje
    }

    Agreement[] public agreements;        // Lista de acuerdos
    address[] public validArbiters;       // Lista de árbitros válidos
    address public daoTreasury = 0xAC9Adcccd19Ea5A05e5A5A5F37C8c02dd9a2ce9C; // Dirección del tesoro DAO
    uint256 private constant FEE_ARBITRATION = 200000; // USDC $0.2
    uint256 private constant FEE_DAO = 300000; // USDC $0.3
    uint constant DAY_IN_SECONDS = 86400; // Duración de un día en segundos
    address public constant AGREEMENTS_PAYER = 0x56d30aE87F2Ab68f3c0d8125baD517774C79c64C;

    /// @dev Constructor para inicializar el contrato.
    /// @param _usdcTokenAddress Dirección del token USDC.
    constructor(address _usdcTokenAddress) {
        usdcToken = IERC20(_usdcTokenAddress);
        validArbiters.push(0x31e331E751e490ef39e8B269399a76f483b2b5Af); //Árbitro 0: LVM
        validArbiters.push(0x3069EBaEcA68b5f5E113e0d4Fc3155Bd0Bf4926B); //Árbitro 1: JFM
        //validArbiters.push(0x6c83C41cc7226AFb36ee66814cAbb952c9E89EC7); //Árbitro 2: JV
        //...
    }

    /// Consulta el array de acuerdos (agreements) y devuelve la wallet del siguiente árbitro que según el orden en validArbiters, se asignaría al siguiente acuerdo.
    /// La asignación de árbitros a los acuerdos debe hacerse uno a uno, en orden, es decir, al acuerdo 0 debe asignarse el 
    /// primer árbitro válido (o sea 0x31e331E751e490ef39e8B269399a76f483b2b5Af), al acuerdo 1 debe asignarse el segundo árbitro
    /// válido (o sea 0x3069EBaEcA68b5f5E113e0d4Fc3155Bd0Bf4926B), al acuerdo 2 el tercer árbitro (0x6c83C41cc7226AFb36ee66814cAbb952c9E89EC7),
    /// para el acuerdo 3 tocaría volver al inicio del listado de árbitros, ya que por ahora hay 3, y se le asignaría el primero árbitro.
    /// En caso de que entre un cuarto, quinto, sexto o "N" árbitros desde la función "addValidArbiterIfNotExists", deberán irse agregando al final
    /// del listado de árbitros válidos y, asímismo, se les deberán ir asignando acuerdos. 
    function getNextArbiter() public view returns (address) {
        //Aquí se debe consultar el array agreements, tomar el último acuerdo, obtener la wallet del árbitro asignado, con esa wallet obtener su orden o ID de array
        //de esa wallet en el array validArbiters, y, finalmente, de dicho array obtener la siguiente wallet de árbitro que se asignaría al siguiente acuerdo.

        uint256 numArbiters = validArbiters.length;
        // Si no hay árbitros válidos, devolver la dirección 0x0000...0000
        if (numArbiters == 0) {
            return address(0);
        }

        // Si no hay acuerdos creados aún, asignar el primer árbitro
        if (agreements.length == 0) {
            return validArbiters[0];
        }

        // Obtener el árbitro asignado en el último acuerdo
        Agreement memory lastAgreement = agreements[agreements.length - 1];
        address lastArbiter = lastAgreement.arbitrator;

        // Encontrar el índice del último árbitro en el array validArbiters
        uint256 lastArbiterIndex;
        bool found = false;
        for (uint256 i = 0; i < numArbiters; i++) {
            if (validArbiters[i] == lastArbiter) {
                lastArbiterIndex = i;
                found = true;
                break;
            }
        }

        // Si por alguna razón el último árbitro no está en la lista (caso improbable), asignar el primero
        if (!found) {
            return validArbiters[0];
        }

        // Calcular el índice del próximo árbitro (circular)
        uint256 nextArbiterIndex = (lastArbiterIndex + 1) % numArbiters;

        // Retornar la dirección del próximo árbitro
        return validArbiters[nextArbiterIndex];

    }

    /// @notice Normaliza un timestamp a la medianoche.
    /// @param timestamp Timestamp a normalizar.
    /// @return El timestamp normalizado.
    function normalizeToDay(uint256 timestamp) internal pure returns (uint256) {
        return (timestamp / DAY_IN_SECONDS) * DAY_IN_SECONDS;
    }

    /// @notice Verifica si un árbitro es válido.
    /// @param _arbiter Dirección del árbitro.
    /// @return true si el árbitro es válido, de lo contrario false.
    function isValidArbiter(address _arbiter) internal view returns (bool) {
        for (uint i = 0; i < validArbiters.length; i++) {
            if (validArbiters[i] == _arbiter) {
                return true;
            }
        }
        return false;
    }

    /// @notice Permite a los árbitros agregar otros árbitros válidos.
    /// @param _arbiter Dirección del nuevo árbitro.
    function addValidArbiterIfNotExists(address _arbiter) external {
        require(isValidArbiter(msg.sender), "Solo un arbitro valido puede agregar nuevos arbitros.");
        require(!isValidArbiter(_arbiter), "El arbitro ya esta registrado.");
        validArbiters.push(_arbiter);
    }

    // Evento que emitirá el ID del nuevo acuerdo creado
    event NewAgreementCreated(uint256 indexed agreementId);

    /// @notice Crea un nuevo acuerdo, incluyendo el cobro de fees a DAO y árbitros.
    /// @param _serviceProvider Dirección del proveedor del servicio.
    /// @param _servicePayer Dirección del pagador del servicio.
    /// @param _startDate Fecha de inicio del acuerdo.
    /// @param _endDate Fecha de fin del acuerdo.
    /// @param _numHours Número de horas acordadas
    /// @param _amount Monto total del acuerdo en USDC (incluye fees).
    /// @return El ID del acuerdo creado.
    function newAgreement(
        address _serviceProvider,
        address _servicePayer,
        uint256 _startDate,
        uint256 _endDate,
        uint256 _numHours,
        uint256 _amount
    ) external returns (uint) {
        uint256 normalizedStartDate = normalizeToDay(_startDate);
        uint256 normalizedEndDate = normalizeToDay(_endDate);
        uint256 currentDate = normalizeToDay(block.timestamp);

        require(_serviceProvider != _servicePayer, "Las wallets de proveedor y pagador no pueden ser iguales.");
        require(normalizedStartDate >= currentDate, "Fecha de inicio debe ser hoy o mayor");
        require(normalizedEndDate >= normalizedStartDate, "Fecha de fin debe ser mayor o igual a la de inicio");
        require(_amount > FEE_ARBITRATION + FEE_DAO, "Monto insuficiente para cubrir fees.");

        // Obtener el próximo árbitro 
        address nextArbiter = getNextArbiter();

        // Transferir USDC del pagador al contrato
        usdcToken.transferFrom(msg.sender, address(this), _amount);

        agreements.push(Agreement({
            serviceProvider: _serviceProvider,
            servicePayer: _servicePayer,
            arbitrator: nextArbiter,
            startDate: normalizedStartDate,
            endDate: normalizedEndDate,
            numHours: _numHours,
            amount: _amount - FEE_ARBITRATION - FEE_DAO,
            spaAgree: true,
            sprAgree: true,
            arbitrationState: ArbitrationState.NoArbitration
        }));

        // Cobrar fees
        require(usdcToken.transfer(daoTreasury, FEE_DAO), "Transferencia al tesoro DAO fallida.");
        distributeFees(FEE_ARBITRATION);

        //return agreements.length - 1;

        uint256 agreementId = agreements.length - 1;
        // Emitimos el evento con el ID del acuerdo
        emit NewAgreementCreated(agreementId);
        return agreementId;
    
    }

    /// @dev Distribuye los fees de arbitraje entre árbitros válidos.
    function distributeFees(uint256 arbitrationFee) internal {
        uint256 numArbiters = validArbiters.length;
        require(numArbiters > 0, "No hay arbitros validos.");
        uint256 feePerArbiter = arbitrationFee / numArbiters;

        for (uint256 i = 0; i < numArbiters; i++) {
            usdcToken.transfer(validArbiters[i], feePerArbiter);
        }
    }

    /// @notice Marca acuerdo o desacuerdo por parte únicamente del pagador o del proveedor.
    /// @param _id ID del acuerdo.
    /// @param agree Estado, solo hay dos posibles pues es booleano: "de acuerdo" (true) o "en desacuerdo" (false).
    function setAgreement(uint _id, bool agree) external {
        Agreement storage agreement = agreements[_id];

        uint256 currentDate = normalizeToDay(block.timestamp);
        //Solo pueden cambiar entre acuerdo y desacuerdo si no ha llegado fecha fin y si hay monto. Sino, no tiene ya sentido que haya desacuerdos, pues el acuerdo ya se pagó.
        require(currentDate <= agreement.endDate, "Acuerdo finalizado. Solo puede cambiar acuerdo/desacuerdo si acuerdo esta vigente, si aun no finaliza.");
        require(agreement.amount > 0, "Acuerdo sin monto.");   

        if (msg.sender == agreement.servicePayer) {
            agreement.spaAgree = agree;
            agreement.arbitrationState = agree == false ? ArbitrationState.Arbitration : ArbitrationState.NoArbitration;
        } else if (msg.sender == agreement.serviceProvider) {
            agreement.sprAgree = agree;
            agreement.arbitrationState = agree == false ? ArbitrationState.Arbitration : ArbitrationState.NoArbitration;
        } else {
            revert("No autorizado");
        }
    }

    /// @notice Resuelve un desacuerdo por parte del árbitro.
    /// @param _id ID del acuerdo.
    /// @param inFavorOfProvider Decisión a favor del proveedor.
    function resolveDisagreement(uint _id, bool inFavorOfProvider) external {
        Agreement storage agreement = agreements[_id];

        require(msg.sender == agreement.arbitrator, "Solo el arbitro asignado puede resolver.");
        require(agreement.amount > 0, "Acuerdo sin monto.");
        require(agreement.spaAgree == false || agreement.sprAgree == false, "No hay desacuerdo que resolver, ambas partes estan de acuerdo.");
        require(agreement.arbitrationState == ArbitrationState.Arbitration, "No hay desacuerdo que resolver, no esta en estado de arbitraje.");

        if (inFavorOfProvider) {
            agreement.arbitrationState = ArbitrationState.ResolvedSPR;
            usdcToken.transfer(agreement.serviceProvider, agreement.amount);
        } else {
            agreement.arbitrationState = ArbitrationState.ResolvedSPA;
            usdcToken.transfer(agreement.servicePayer, agreement.amount);
        }

        agreement.amount = 0;
    }

    /*/// @notice Automatización diaria para procesar acuerdos.
    function executeAutomation() external {
        uint256 currentDate = normalizeToDay(block.timestamp);

        for (uint i = 0; i < agreements.length; i++) {
            Agreement storage agreement = agreements[i];

            if (agreement.amount > 0 && agreement.spaAgree && agreement.sprAgree && currentDate >= agreement.endDate) {
                usdcToken.transfer(agreement.serviceProvider, agreement.amount);
                agreement.amount = 0;
            }
        }
    }*/

    /// @notice Procesa un lote de acuerdos.
    /// @param agreementIds Array con los IDs de los acuerdos a procesar.
    function processAgreementsBatch(uint[] memory agreementIds) public {
        require(msg.sender == AGREEMENTS_PAYER, "Solo la wallet autorizada para Agreements Payer puede procesar y pagar acuerdos.");
        
        uint256 currentDate = normalizeToDay(block.timestamp);

        for (uint i = 0; i < agreementIds.length; i++) {

            uint256 agreementId = agreementIds[i];
            // Validar si el acuerdo existe
            if (agreementId >= agreements.length) {
                continue; // Si el ID no existe, pasar al siguiente
            }

            Agreement storage agreement = agreements[agreementId];

            if (agreement.spaAgree && agreement.sprAgree && agreement.arbitrationState == ArbitrationState.NoArbitration && 
                agreement.amount > 0 && currentDate >= agreement.endDate) {
                usdcToken.transfer(agreement.serviceProvider, agreement.amount);
                agreement.amount = 0; // Marca el acuerdo como pagado
            }
        }
    }

}