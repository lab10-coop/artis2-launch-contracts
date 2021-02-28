// SPDX-License-Identifier: AGPLv3
pragma solidity 0.7.6;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { Address } from "@openzeppelin/contracts/utils/Address.sol";
import { IERC677 } from "./IERC677.sol";

/*
* Mock token which resembles the ERC20+ERC677 tokens deployed by the tokenbridge
*/
contract ERC677TokenMock is ERC20, IERC677 {
    constructor(uint256 initialSupply) ERC20 ("ERC677 Mock Token", "MOCK") {
        _mint(msg.sender, initialSupply);
    }

    // overridden ERC20 transfer which tries to call the ERC677 callback if present - won't fail if not succeeding
    function transfer(address receiver, uint256 amount)
        public
        override
        returns (bool)
    {
        require(super.transfer(receiver, amount), "transfer failed");
        if (Address.isContract(receiver)) {
            _callERC677Hook(msg.sender, receiver, amount, new bytes(0));
        }
        return true;
    }

    function transferAndCall(address receiver, uint256 amount, bytes calldata data)
        external
        override
        returns (bool)
    {
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
        return success;
    }
}
