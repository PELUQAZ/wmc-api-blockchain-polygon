// SPDX-License-Identifier: All Rights Reserved
// © 2025, WorkMarketCap. Todos los derechos reservados.

pragma solidity ^0.8.24;

/**
 * @title WMCWUNRewardDistributor
 * @dev Smart contract para distribuir tokens WUN como recompensas por registro y ejecución de acuerdos.
 *
 * Nota importante:
 * - Se mintearon inicialmente 100,000,000 WUN en total (100 millones de tokens con 18 decimales).
 * - 50,000,000 WUN (50 millones) están inaccesibles en una wallet cuya clave privada se perdió.
 * - Este contrato opera con los 50,000,000 WUN restantes, de los cuales 10,000,000 WUN (20%) se usarán para distribución inicial.
 */
contract WMCWUNRewardDistributor {
    address public owner; // Dirección del propietario del contrato.
    address public immutable tokenContract = 0x6aA78f6077647d90ef5E5F1d432F9C2B66FF0182; // Dirección fija del contrato del token WUN.
    uint256 public totalDistributed; // Cantidad total de tokens distribuidos por este contrato.

    // Máximos y recompensas
    uint256 public constant MAX_TOKENS_GLOBAL = 100_000_000 * 10**18; // Máximo total de WUN minteados originalmente.
    uint256 public constant TOKENS_BURNED_OR_LOST = 50_000_000 * 10**18; // WUN perdidos o inaccesibles en la wallet bloqueada.
    uint256 public constant MAX_CIRCULATING_TOKENS = MAX_TOKENS_GLOBAL - TOKENS_BURNED_OR_LOST; // Máximo de WUN en circulación (50 millones).
    uint256 public constant INITIAL_DISTRIBUTION = 10_000_000 * 10**18; // Tokens reservados para distribución inicial (10 millones).
    uint256 public registrationReward = 10_000 * 10**18; // Recompensa fija de 10,000 WUN por registro.
    //uint256 public rewardPercentage = 5; // Porcentaje (5%) del valor del acuerdo que se recompensa en WUN.
    uint256 public fixedWunReward = 1; // Cantidad de WUN a recompensar.

    mapping(address => bool) public registeredUsers; // Registro para evitar recompensar múltiples veces a la misma wallet por registro.

    // Eventos para monitorear las operaciones de distribución y actualizaciones de parámetros
    event TokensDistributed(address indexed user, uint256 amount, string reason);
    event RegistrationRewardUpdated(uint256 newReward);
    //event RewardPercentageUpdated(uint256 newPercentage);

    // Modificador para restringir funciones al propietario del contrato
    modifier onlyOwner() {
        require(msg.sender == owner, "Solo el propietario puede ejecutar esta funcion");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * @dev Recompensa a un usuario con tokens WUN al registrarse en la plataforma.
     * @param user Dirección del usuario que se está registrando.
     */
    function rewardRegistration(address user) external onlyOwner {
        require(!registeredUsers[user], "El usuario ya esta registraddo");
        require(totalDistributed + registrationReward <= INITIAL_DISTRIBUTION, "Se ha superado el limite maximo de distribucion");

        // Transferencia de tokens WUN desde este contrato a la wallet del usuario registrado.
        IERC20(tokenContract).transfer(user, registrationReward);

        // Marcar al usuario como registrado para evitar recompensas duplicadas.
        registeredUsers[user] = true;
        totalDistributed += registrationReward;

        emit TokensDistributed(user, registrationReward, "Registration");
    }

    /**
     * @dev Recompensa a ambas partes involucradas en la ejecución de un acuerdo con un porcentaje del valor del acuerdo.
     * @param serviceProvider Dirección del proveedor de servicio (Service Provider - SPR o freelancer) que participa en el acuerdo.
     * @param servicePayer Dirección del pagador del servicio (Service Payer - SPA o empresa) aque participa en el acuerdo.
     * //param agreementValue Valor del acuerdo en USDT (o el token base equivalente).
     */
    function rewardAgreement(address serviceProvider, address servicePayer) external onlyOwner {//, uint256 agreementValue
        //uint256 reward = (agreementValue * rewardPercentage / 100) * 10**18; // Calcular recompensa
        uint256 reward = fixedWunReward * 10**18; // Escalar recompensa fija a 18 decimales

        require(totalDistributed + (2 * reward) <= INITIAL_DISTRIBUTION, "Se ha superado el limite maximo de distribucion");

        // Transferir recompensa al SPR.
        IERC20(tokenContract).transfer(serviceProvider, reward);
        // Transferir recompensa a la SPA.
        IERC20(tokenContract).transfer(servicePayer, reward);

        totalDistributed += 2 * reward;

        emit TokensDistributed(serviceProvider, reward, "Agreement-SPR");
        emit TokensDistributed(servicePayer, reward, "Agreement-SPA");
    }

    /**
     * @dev Actualiza la cantidad de tokens que se recompensa a un usuario por registrarse.
     * @param newReward Nueva cantidad de tokens WUN para recompensas de registro.
     * - Ejemplo: Si `newReward = 5000 * 10**18`, el nuevo valor será 5,000 WUN.
     */
    function updateRegistrationReward(uint256 newReward) external onlyOwner {
        registrationReward = newReward;
        emit RegistrationRewardUpdated(newReward);
    }

    /**
     * @dev Actualiza el porcentaje de recompensa que se otorga por los acuerdos ejecutados.
     * @param newPercentage Nuevo porcentaje de recompensa por acuerdo.
     * - Ejemplo: Si `newPercentage = 3`, la recompensa será el 3% del valor del acuerdo.
     */
    /*function updateRewardPercentage(uint256 newPercentage) external onlyOwner {
        rewardPercentage = newPercentage;
        emit RewardPercentageUpdated(newPercentage);
    }*/

    /**
     * @dev Transferir todos los tokens restantes del contrato a la  wallet del propietario.
     * Solo se usa en caso de emergencia o ajustes administrativos.
     */
    function withdrawRemainingTokens() external onlyOwner {
        uint256 balance = IERC20(tokenContract).balanceOf(address(this));
        IERC20(tokenContract).transfer(owner, balance);
    }
}

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}