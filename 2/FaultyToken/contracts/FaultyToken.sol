// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.17;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

contract FaultyToken is
    Initializable,
    ERC20PausableUpgradeable,
    AccessControlUpgradeable
{
    bytes32 public constant CFO_ROLE = keccak256("CFO_ROLE");

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() external initializer {
        __ERC20_init("FaultyToken", "FTX");
        __ERC20Pausable_init();
        __AccessControl_init();
        __Context_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setRoleAdmin(CFO_ROLE, DEFAULT_ADMIN_ROLE);
    }

    function mint(address to, uint256 amount) external {
        require(
            hasRole(CFO_ROLE, msg.sender),
            "Not authorised."
        );
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) internal {
        require(
            hasRole(CFO_ROLE, msg.sender),
            "Not authorised."
        );
        _burn(from, amount);
    }

    function transfer(address to, uint256 value)
        public
        override
        returns (bool)
    {
        require(
            value < 10000,
            "Transfer is too large."
        );
        
        return super.transfer(to, value);
    }


    function grantRole(bytes32 role, address account) public override {
        require(
            !((role == CFO_ROLE) && (msg.sender == account)),
            "Cannot grant this role."
        );

        _grantRole(role, account);
    }

    function pause() external whenNotPaused {
        require(
            hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "Not authorised."
        );
        _pause();
    }

    function unpause() external whenPaused {
        require(
            hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "Not authorised."
        );
        _unpause();
    }
}
