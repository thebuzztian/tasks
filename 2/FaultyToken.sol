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
    //constructor() {
    //    _disableInitializers();
    //}

    function initialize() external initializer {
        __ERC165_init();
        __Context_init();
        __AccessControl_init();
        __ERC20_init("FaultyToken", "FTX");
        __ERC20Pausable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _setRoleAdmin(CFO_ROLE, DEFAULT_ADMIN_ROLE);
    }

    function mint(address to, uint256 amount) external whenNotPaused {
        require(
            hasRole(CFO_ROLE, _msgSender()),
            "Not authorised."
        );
        _checkTransferSize(amount);  /* Technically, minting is a form of
                                        tranferring money, so we check the amount
                                        size. */
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external whenNotPaused {
        require(
            hasRole(CFO_ROLE, _msgSender()),
            "Not authorised."
        );
        _checkTransferSize(amount);  /* Technically, burning is a form of
                                        tranferring money, so we check the amount
                                        size */
        _burn(from, amount);
    }

    function _checkTransferSize(uint256 amount) private view {
        require(
            amount < (10000 * (10 ** decimals())),
            "Transfer is too large. "
        );
    }

    function transfer(address to, uint256 value)
        public
        override
        whenNotPaused
        returns (bool)
    {
        _checkTransferSize(value);
        return super.transfer(to, value);
    }

    function _checkRoleAllowed(bytes32 role) private pure {
      require(
        role == DEFAULT_ADMIN_ROLE || role == CFO_ROLE,
        "Invalid role."
      );
    }

    function _checkNull(address account) private pure {
        require(
            account != address(0),
            "Null address not allowed here."
        );
    }

    function grantRole(bytes32 role, address account) public override whenNotPaused {
        _checkRoleAllowed(role);
        _checkNull(account);

        require(
            !(
                ((role == CFO_ROLE) && hasRole(DEFAULT_ADMIN_ROLE, account)) ||
                ((role == DEFAULT_ADMIN_ROLE) && hasRole(CFO_ROLE, account))
            ),
            "An account cannot be both an admin and a CFO."
        );

        super.grantRole(role, account);
    }

    function revokeRole(bytes32 role, address account) public override whenNotPaused {
        _checkRoleAllowed(role);
        _checkNull(account);

        require(
            !(role == DEFAULT_ADMIN_ROLE && account == _msgSender() && 
            hasRole(DEFAULT_ADMIN_ROLE, _msgSender())),
            "Admins are not allowed to renounce the admin role."
        );
        super.revokeRole(role, account);
    }

    function renounceRole(bytes32, address)
        public
        pure
        override
    {
        revert("Operation not permitted.");
    }

    function transferFrom(address, address, uint256)
        public
        pure
        override
        returns (bool)
    {
        revert("Operation not permitted.");
        // Technically, this breaks  ERC20 standard compliance. However, this wasn't
        // explicitly mentioned as a goal, so I prefer to avoid this operation especially,
        // in conjunction with increaseAllowance, decreaseAllowance and approve, since
        // transactions seem to be difficult to implement with these.
    }

    function increaseAllowance(address, uint256)
        public
        pure
        override
        returns (bool)
    {
        revert("Operation not permitted.");
    }

    function decreaseAllowance(address, uint256)
        public
        pure
        override
        returns (bool)
    {
        revert("Operation not permitted.");
    }

    function approve(address, uint256)
        public
        pure
        virtual
        override
        returns (bool)
    {
        revert("Operation not permitted.");
    }

    function pause() external whenNotPaused {
        require(
            hasRole(DEFAULT_ADMIN_ROLE, _msgSender()),
            "Not authorised."
        );
        _pause();
    }

    function unpause() external whenPaused {
        require(
            hasRole(DEFAULT_ADMIN_ROLE, _msgSender()),
            "Not authorised."
        );
        _unpause();
    }

}
