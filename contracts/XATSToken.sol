// SPDX-License-Identifier: AGPLv3
pragma solidity 0.7.6;

import { ERC777 } from "@openzeppelin/contracts/token/ERC777/ERC777.sol";
import { Address } from "@openzeppelin/contracts/utils/Address.sol";
import { IERC677 } from "./IERC677.sol";
import { ERC165Checker } from "@openzeppelin/contracts/introspection/ERC165Checker.sol";

/// ERC777 token with fixed supply which also implements the ERC677 interface for tokenbridge compatibility
contract XATSToken is ERC777, IERC677 {
    constructor (uint256 initialSupply) ERC777("ARTIS Token", "xATS", new address[](0)) {
        _mint(msg.sender, initialSupply, "", "");
    }

    // transfers and tentatively calls the ERC677 hook if the receiver is a contract - convenient for the tokenbridge
    function transfer(address receiver, uint256 amount)
        public
        override
        returns (bool)
    {
        require(receiver != address(this), "receiver is self");
        require(super.transfer(receiver, amount), "transfer failed");
        if (Address.isContract(receiver)) {
            _callERC677Hook(msg.sender, receiver, amount, new bytes(0));
        }
        return true;
    }

    function transferFrom(address holder, address receiver, uint256 amount)
        public
        override
        returns (bool)
    {
        require(receiver != address(this), "receiver is self");
        require(super.transferFrom(holder, receiver, amount), "transferFrom failed");
        if (Address.isContract(receiver)) {
            _callERC677Hook(holder, receiver, amount, new bytes(0));
        }
        return true;
    }

    // transfers and calls the ERC677 hook if the receiver is a contract
    function transferAndCall(address receiver, uint256 amount, bytes calldata data)
        external
        override
        returns (bool)
    {
        require(receiver != address(this), "receiver is self");
        require(super.transfer(receiver, amount), "transfer failed");
        if (Address.isContract(receiver)) {
            require(_callERC677Hook(msg.sender, receiver, amount, data), "ERC677 callback failed");
        }
        return true;
    }

    bytes4 private constant _ON_TOKEN_TRANSFER_SELECTOR = 0xa4c0ed36; // onTokenTransfer(address,uint256,bytes))

    /// calls onTokenTransfer fallback on the token receiver contract
    function _callERC677Hook(address sender, address to, uint256 amount, bytes memory data) private returns (bool) {
        // solhint-disable-next-line avoid-low-level-calls
        (bool success, ) = to.call(abi.encodeWithSelector(_ON_TOKEN_TRANSFER_SELECTOR, sender, amount, data));
        if (ERC165Checker.supportsERC165(to) && ERC165Checker.supportsInterface(to, _ON_TOKEN_TRANSFER_SELECTOR)) {
            require(success, "ERC677 hook failed");
        }
        return success;
    }
}
