// SPDX-License-Identifier: AGPLv3
pragma solidity 0.7.6;

// see https://github.com/ethereum/EIPs/issues/677
interface IERC677 {
    function transferAndCall(address receiver, uint amount, bytes calldata data) external returns (bool success);
}
