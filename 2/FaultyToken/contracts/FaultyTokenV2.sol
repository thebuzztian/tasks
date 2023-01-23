// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.17;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

contract FaultyTokenV2 is
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
        __ERC165_init();
        __Context_init();
        __AccessControl_init();
        __ERC20_init("FaultyToken", "FTX");
        __ERC20Pausable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _setRoleAdmin(CFO_ROLE, DEFAULT_ADMIN_ROLE);
    }

    function mint(address to, uint256 amount) external {
        require(
            hasRole(CFO_ROLE, _msgSender()),
            "Not authorised."
        );
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external {
        require(
            hasRole(CFO_ROLE, _msgSender()),
            "Not authorised."
        );
        _burn(from, amount);
    }

    function _checkRoleAllowed(bytes32 role) private pure {
      require(
        role == DEFAULT_ADMIN_ROLE || role == CFO_ROLE,
        "Invalid role."
      );
    }

    function _notNull(address account) private pure {
        require(
            account != address(0),
            "Null address not allowed here."
        );
    }

    function grantRole(bytes32 role, address account) public override whenNotPaused {
        _checkRoleAllowed(role);
        _notNull(account);

        require(
            !(
                ((role == CFO_ROLE) && hasRole(DEFAULT_ADMIN_ROLE, account)) ||
                ((role == DEFAULT_ADMIN_ROLE) && hasRole(CFO_ROLE, account))
            ),
            "An account cannot be both an admin and a CFO."
        );

        super.grantRole(role, account);
    }

    function revokeRole(bytes32 role, address account)
        public
        override
        whenNotPaused
    {
        _checkRoleAllowed(role);
        _notNull(account);

        require(
            !(role == DEFAULT_ADMIN_ROLE && account == _msgSender()),
            "Admins are not allowed to renounce their own admin role."
        );
        super.revokeRole(role, account);
    }

    function renounceRole(bytes32, address) public pure override {
        revert("Operation not permitted.");
    }

    function _beforeTokenTransfer(address from, address to, uint256 amount)
        internal
        virtual
        override
    {
        require(
            amount < (10000 * (10 ** decimals())),
            "Transfer is too large."
        );

        super._beforeTokenTransfer(from, to, amount);
    }

    function pause() external {
        require(
            hasRole(DEFAULT_ADMIN_ROLE, _msgSender()),
            "Not authorised."
        );
        _pause();
    }

    function unpause() external {
        require(
            hasRole(DEFAULT_ADMIN_ROLE, _msgSender()),
            "Not authorised."
        );
        _unpause();
    }
}
