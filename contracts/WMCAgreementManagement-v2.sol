// SPDX-License-Identifier: MIT
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
    enum ArbitrationState { NoArbitration, ResolvedSPA, ResolvedSPR }

    // Estructura para almacenar la información de un acuerdo
    struct Agreement {
        address serviceProvider;   // Wallet del proveedor del servicio
        address servicePayer;      // Wallet del pagador del servicio
        address arbitrator;        // Wallet del árbitro asignado
        uint256 startDate;         // Fecha de inicio del acuerdo
        uint256 endDate;           // Fecha de fin del acuerdo
        uint256 amount;            // Monto del acuerdo en USDC
        bool spaAgree;             // Aprobación del pagador
        bool sprAgree;             // Aprobación del proveedor
        ArbitrationState arbitrationState; // Estado de arbitraje
    }

    Agreement[] public agreements;        // Lista de acuerdos
    address[] public validArbiters;       // Lista de árbitros válidos
    address public daoTreasury = 0xAC9Adcccd19Ea5A05e5A5A5F37C8c02dd9a2ce9C; // Dirección del tesoro DAO
    uint256 private constant FEE_ARBITRATION = 1.5 * 10 ** 6; // USDC $1.5
    uint256 private constant FEE_DAO = 1 * 10 ** 6; // USDC $1
    uint constant DAY_IN_SECONDS = 86400; // Duración de un día en segundos
    address public constant AGREEMENTS_PAYER = 0x56d30aE87F2Ab68f3c0d8125baD517774C79c64C;

    /// @dev Constructor para inicializar el contrato.
    /// @param _usdcTokenAddress Dirección del token USDC.
    constructor(address _usdcTokenAddress) {
        usdcToken = IERC20(_usdcTokenAddress);
        validArbiters.push(0x31e331E751e490ef39e8B269399a76f483b2b5Af); //LVM  //0x0aE67cE895B26BdAb093542c8783b985a243E60C
        validArbiters.push(0x3069EBaEcA68b5f5E113e0d4Fc3155Bd0Bf4926B); //JFM  //0x1bD61554e343F88F23a094cCB22D83031B3F0adb
        validArbiters.push(0x6c83C41cc7226AFb36ee66814cAbb952c9E89EC7); //JV   //0xB0eA724275BeA77959622B58E97A9d26D4B44Ea2
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

    /// @notice Crea un nuevo acuerdo, incluyendo el cobro de fees a DAO y árbitros.
    /// @param _serviceProvider Dirección del proveedor del servicio.
    /// @param _servicePayer Dirección del pagador del servicio.
    /// @param _arbitrator Dirección del árbitro asignado.
    /// @param _startDate Fecha de inicio del acuerdo.
    /// @param _endDate Fecha de fin del acuerdo.
    /// @param _amount Monto total del acuerdo en USDC (incluye fees).
    /// @return El ID del acuerdo creado.
    function newAgreement(
        address _serviceProvider,
        address _servicePayer,
        address _arbitrator,
        uint256 _startDate,
        uint256 _endDate,
        uint256 _amount
    ) external returns (uint) {
        uint256 normalizedStartDate = normalizeToDay(_startDate);
        uint256 normalizedEndDate = normalizeToDay(_endDate);
        uint256 normalizedCurrentDate = normalizeToDay(block.timestamp);

        require(_serviceProvider != _servicePayer, "Las wallets de proveedor y pagador no pueden ser iguales.");
        require(normalizedStartDate >= normalizedCurrentDate, "Fecha de inicio debe ser hoy o mayor");
        require(normalizedEndDate >= normalizedStartDate, "Fecha de fin debe ser mayor o igual a la de inicio");
        require(_amount > FEE_ARBITRATION + FEE_DAO, "Monto insuficiente para cubrir fees.");

        // Transferir USDC del pagador al contrato
        usdcToken.transferFrom(msg.sender, address(this), _amount);

        agreements.push(Agreement({
            serviceProvider: _serviceProvider,
            servicePayer: _servicePayer,
            arbitrator: _arbitrator,
            startDate: normalizedStartDate,
            endDate: normalizedEndDate,
            amount: _amount - FEE_ARBITRATION - FEE_DAO,
            spaAgree: true,
            sprAgree: true,
            arbitrationState: ArbitrationState.NoArbitration
        }));

        // Cobrar fees
        require(usdcToken.transfer(daoTreasury, FEE_DAO), "Transferencia al tesoro DAO fallida.");
        distributeFees(FEE_ARBITRATION);

        return agreements.length - 1;
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

    /// @notice Marca desacuerdo en el acuerdo.
    /// @param _id ID del acuerdo.
    /// @param agree Estado de acuerdo.
    function setAgreement(uint _id, bool agree) external {
        Agreement storage agreement = agreements[_id];

        if (msg.sender == agreement.servicePayer) {
            agreement.spaAgree = agree;
        } else if (msg.sender == agreement.serviceProvider) {
            agreement.sprAgree = agree;
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
        require(agreement.amount > 0, "Acuerdo ya resuelto.");

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
        require(msg.sender == AGREEMENTS_PAYER, "Solo la wallet autorizada para Agreements Payer puede procesar y pagar acuerdos");
        
        uint256 currentDate = normalizeToDay(block.timestamp);

        for (uint i = 0; i < agreementIds.length; i++) {
            Agreement storage agreement = agreements[agreementIds[i]];

            if (agreement.amount > 0 && agreement.spaAgree && agreement.sprAgree && currentDate >= agreement.endDate) {
                usdcToken.transfer(agreement.serviceProvider, agreement.amount);
                agreement.amount = 0; // Marca el acuerdo como pagado
            }
        }
    }

}
