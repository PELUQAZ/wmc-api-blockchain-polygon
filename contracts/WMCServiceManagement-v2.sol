// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20 {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
}

contract WMCServiceManagement {
    IERC20 public usdcToken;

    // Enum para los diferentes estados del acuerdo
    enum Estado  { Contratado, EnCurso, Finalizado, EnDisputa, Reembolsado, Desembolsado }

    struct Agreement {
        address serviceProvider;
        address servicePayer;
        address arbitrator;
        uint256 startDate;
        uint256 endDate;
        uint amount;
        Estado estado;
        bool spaAgree;
        bool sprAgree;
    }

    Agreement[] public agreements;
    address[] public validArbiters;
    uint constant DISPUTE_PERIOD = 604800;
    uint constant DAY_IN_SECONDS = 86400;

    constructor(address _usdcTokenAddress) {
        usdcToken = IERC20(_usdcTokenAddress);
    }

    //function testRequireFail() public pure {
    //    require(false, "Este es un mensaje de prueba de require.");
    //}

    // Normaliza un timestamp a la medianoche
    function normalizeToDay(uint256 timestamp) internal pure returns (uint256) {
        return (timestamp / DAY_IN_SECONDS) * DAY_IN_SECONDS;
    }

    function isValidArbiter(address _arbiter) internal view returns (bool) {
        for (uint i = 0; i < validArbiters.length; i++) {
            if (validArbiters[i] == _arbiter) {
                return true;
            }
        }
        return false;
    }

    function addValidArbiterIfNotExists(address _arbiter) internal {
        if (!isValidArbiter(_arbiter)) {
            validArbiters.push(_arbiter);
        }
    }

    //event AgreementCreated(uint agreementId, address serviceProvider, address servicePayer);
    //event Debug(string message);

    // Función para crear un nuevo acuerdo
    /*function newAgreementOLD(
        address _serviceProvider, 
        address _servicePayer, 
        address _arbitrator,
        uint256 _startDate, 
        uint256 _endDate, 
        uint _amount
    ) external returns (uint) {
        emit Debug("Inicio de newAgreement");
        uint256 normalizedStartDate = normalizeToDay(_startDate);
        uint256 normalizedEndDate = normalizeToDay(_endDate);
        uint256 normalizedCurrentDate = normalizeToDay(block.timestamp);
        emit Debug("Inician requires");
        require(_serviceProvider != _servicePayer, "Las wallets de proveedor y pagador no pueden ser iguales");
        require(normalizedStartDate >= normalizedCurrentDate, "Fecha de inicio debe ser hoy o mayor");
        require(normalizedStartDate <= normalizedCurrentDate + 1 weeks, "Fecha de inicio no puede ser mayor a una semana desde hoy");
        require(normalizedEndDate >= normalizedStartDate, "Fecha de fin debe ser mayor o igual a la de inicio");
        require(_amount > 0, "El valor del servicio debe ser mayor a 0");
        emit Debug("Finalizan requires");

        //require(usdcToken.transferFrom(msg.sender, address(this), _amount), "Transferencia de USDC fallida");
        // Capturar error en la llamada externa transferFrom
        try usdcToken.transferFrom(msg.sender, address(this), _amount) returns (bool success) {
            require(success, "Transferencia de USDC fallida");
        } catch {
            revert("Error al transferir USDC");
        }

        addValidArbiterIfNotExists(_arbitrator);

        agreements.push(Agreement({
            serviceProvider: _serviceProvider,
            servicePayer: _servicePayer,
            arbitrator: _arbitrator,
            startDate: normalizedStartDate,
            endDate: normalizedEndDate,
            amount: _amount,
            estado: Estado.Contratado,
            spaAgree: true,
            sprAgree: true
        }));

        emit AgreementCreated(agreements.length - 1, _serviceProvider, _servicePayer); // Log to verify

        return agreements.length - 1;
    }*/

    function newAgreement(
        address _serviceProvider, 
        address _servicePayer, 
        address _arbitrator,
        uint256 _startDate, 
        uint256 _endDate, 
        uint _amount
    ) external returns (uint) {
        uint256 normalizedStartDate = normalizeToDay(_startDate);
        uint256 normalizedEndDate = normalizeToDay(_endDate);
        uint256 normalizedCurrentDate = normalizeToDay(block.timestamp);
        require(_serviceProvider != _servicePayer, "Las wallets de proveedor y pagador no pueden ser iguales.");
        require(normalizedStartDate >= normalizedCurrentDate, "Fecha de inicio debe ser hoy o mayor");
        require(normalizedStartDate <= normalizedCurrentDate + 1 weeks, "Fecha de inicio no puede ser mayor a una semana desde hoy");
        require(normalizedEndDate >= normalizedStartDate, "Fecha de fin debe ser mayor o igual a la de inicio");
        require(_amount > 0, "El valor del servicio debe ser mayor a 0");

        // Capturar error en la llamada externa transferFrom
        try usdcToken.transferFrom(msg.sender, address(this), _amount) returns (bool success) {
            require(success, "Transferencia de USDC fallida");
        } catch {
            revert("Error al transferir USDC");
        }

        addValidArbiterIfNotExists(_arbitrator);

        agreements.push(Agreement({
            serviceProvider: _serviceProvider,
            servicePayer: _servicePayer,
            arbitrator: _arbitrator,
            startDate: normalizedStartDate,
            endDate: normalizedEndDate,
            amount: _amount,
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
