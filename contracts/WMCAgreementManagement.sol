// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title WMCServiceManagement - Gestión de acuerdos con fees para DAO y árbitros.
/// @notice Permite crear, gestionar y finalizar acuerdos entre proveedores y pagadores de servicios.
/// @dev Integra pagos de fees fijos para DAO y árbitros en el proceso de creación de acuerdos.

interface IERC20 {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
}

contract WMCAgreementManagement {
    IERC20 public usdcToken;

    // Enum para representar los estados de un acuerdo
    enum Estado { Contratado, EnCurso, Finalizado, EnDisputa, Reembolsado, Desembolsado }

    // Estructura para almacenar la información de un acuerdo
    struct Agreement {
        address serviceProvider; // Wallet del proveedor del servicio
        address servicePayer;    // Wallet del pagador del servicio
        address arbitrator;      // Wallet del árbitro asignado
        uint256 startDate;       // Fecha de inicio del acuerdo
        uint256 endDate;         // Fecha de fin del acuerdo
        uint256 amount;          // Monto del acuerdo en USDC
        Estado estado;           // Estado actual del acuerdo
        bool spaAgree;           // Aprobación del pagador
        bool sprAgree;           // Aprobación del proveedor
    }

    Agreement[] public agreements;        // Lista de acuerdos
    address[] public validArbiters;       // Lista de árbitros válidos
    //uint256 private numArbiters; // Variable temporal para almacenar el número de árbitros válidos
    address public daoTreasury = 0xAC9Adcccd19Ea5A05e5A5A5F37C8c02dd9a2ce9C; // Direccion quemada del tesoro DAO
    uint constant DISPUTE_PERIOD = 604800; // Periodo de disputa en segundos (7 días)
    uint constant DAY_IN_SECONDS = 86400; // Duración de un día en segundos
    uint256 private constant FEE_ARBITRATION = 1.5 * 10 ** 6; // USDC $1.5
    uint256 private constant FEE_DAO = 1 * 10 ** 6; // USDC $1

    /// @dev Constructor para inicializar el contrato.
    /// @param _usdcTokenAddress Dirección del token USDC.
    constructor(address _usdcTokenAddress) {
        usdcToken = IERC20(_usdcTokenAddress);
        // Quemar las wallets de los árbitros iniciales
        validArbiters.push(0x0aE67cE895B26BdAb093542c8783b985a243E60C);
        validArbiters.push(0x1bD61554e343F88F23a094cCB22D83031B3F0adb);
        validArbiters.push(0xB0eA724275BeA77959622B58E97A9d26D4B44Ea2);
        //numArbiters = validArbiters.length; // Inicializamos el número de árbitros
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

    function addValidArbiterIfNotExists(address _arbiter) external {
        require(isValidArbiter(msg.sender), "Solo un arbitro valido puede agregar nuevos arbitros.");
        require(!isValidArbiter(_arbiter), "El arbitro ya esta registrado.");
        validArbiters.push(_arbiter);
        //numArbiters = validArbiters.length; // Actualizamos el número de árbitros
    }

    /// @dev Función auxiliar para distribuir los fees de arbitraje entre árbitros válidos.
    function distributeFees(uint256 arbitrationFee) internal {
        uint256 numArbiters = validArbiters.length;
        require(numArbiters > 0, "No hay arbitros validos.");
        uint256 feePerArbiter = arbitrationFee / numArbiters;

        for (uint256 i = 0; i < numArbiters; i++) {
            require(
                usdcToken.transfer(validArbiters[i], feePerArbiter),
                "Transferencia a arbitro fallida."
            );
        }
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
        require(normalizedStartDate <= normalizedCurrentDate + 1 weeks, "Fecha de inicio no puede ser mayor a una semana desde hoy");
        require(normalizedEndDate >= normalizedStartDate, "Fecha de fin debe ser mayor o igual a la de inicio");
        require(_amount > 0, "El valor del servicio debe ser mayor a 0");
        require(isValidArbiter(_arbitrator), "El arbitro no es valido");
        require(_amount > FEE_ARBITRATION + FEE_DAO, "Monto insuficiente para cubrir fees.");

        // Capturar error en la llamada externa transferFrom
        try usdcToken.transferFrom(msg.sender, address(this), _amount) returns (bool success) {
            require(success, "Transferencia de USDC fallida");
        } catch {
            revert("Error al transferir USDC");
        }

        // Distribuir los fees
        distributeFees(FEE_ARBITRATION);
        require(usdcToken.transfer(daoTreasury, FEE_DAO), "Transferencia al tesoro DAO fallida.");

        agreements.push(Agreement({
            serviceProvider: _serviceProvider,
            servicePayer: _servicePayer,
            arbitrator: _arbitrator,
            startDate: normalizedStartDate,
            endDate: normalizedEndDate,
            amount: _amount - FEE_ARBITRATION - FEE_DAO,
            estado: Estado.Contratado,
            spaAgree: true,
            sprAgree: true
        }));

        return agreements.length - 1;
    }

    function updateState(uint _id) external {
        Agreement storage agreement = agreements[_id];
        uint256 normalizedCurrentDate = normalizeToDay(block.timestamp);

        if (agreement.estado == Estado.Contratado && normalizedCurrentDate >= agreement.startDate) {
            agreement.estado = Estado.EnCurso;
        }

        if (agreement.estado == Estado.EnCurso && normalizedCurrentDate >= agreement.endDate) {
            agreement.estado = Estado.Finalizado;
        }
    }

    function setAgreement(uint _id, bool agree) external {
        Agreement storage agreement = agreements[_id];

        if (msg.sender == agreement.servicePayer) {
            agreement.spaAgree = agree;
        } else if (msg.sender == agreement.serviceProvider) {
            agreement.sprAgree = agree;
        } else {
            revert("No autorizado");
        }

        if (!agreement.spaAgree || !agreement.sprAgree) {
            agreement.estado = Estado.EnDisputa;
        }
    }

    function resolveDispute(uint _id, bool inFavorOfProvider) external {
        Agreement storage agreement = agreements[_id];

        require(msg.sender == agreement.arbitrator, "Solo el arbitro asignado puede resolver la disputa");
        require(agreement.estado == Estado.EnDisputa, "No hay disputa para resolver");

        if (inFavorOfProvider) {
            agreement.estado = Estado.Desembolsado;
            require(usdcToken.transfer(agreement.serviceProvider, agreement.amount), "Transferencia al SPR fallida");
        } else {
            agreement.estado = Estado.Reembolsado;
            require(usdcToken.transfer(agreement.servicePayer, agreement.amount), "Reembolso al SPA fallido");
        }

        agreement.amount = 0;
    }

    function finalizeAutomatically(uint _id) external {
        Agreement storage agreement = agreements[_id];
        uint256 normalizedCurrentDate = normalizeToDay(block.timestamp);
        
        require(agreement.estado == Estado.Finalizado, "El acuerdo no esta en Finalizado");
        require(normalizedCurrentDate >= agreement.endDate + DISPUTE_PERIOD, "No ha pasado el periodo de disputa");
        require(agreement.spaAgree && agreement.sprAgree, "Ambas partes deben estar de acuerdo");

        agreement.estado = Estado.Desembolsado;
        require(usdcToken.transfer(agreement.serviceProvider, agreement.amount), "Transferencia al SPR fallida");
        agreement.amount = 0;
    }

    function getCurrentTimestamp() external view returns (uint256) {
        return normalizeToDay(block.timestamp);
    }
    
}