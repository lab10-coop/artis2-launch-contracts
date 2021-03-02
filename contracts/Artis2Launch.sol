// SPDX-License-Identifier: AGPLv3
pragma solidity 0.7.6;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { ERC165 } from "@openzeppelin/contracts/introspection/ERC165.sol";

// see https://github.com/ethereum/EIPs/issues/677
interface IERC677Receiver {
    function onTokenTransfer(address from, uint256 amount, bytes calldata data) external returns (bool success);
}

/*
* This contract implements time constrained swapping of "old" ATS tokens to "new" ATS tokens.
* The swapping ratio is pre-defined as 5:1 initially, with a 0.2% discount per day after March 26th 2021.
* 1 year after the start of the discount period, the swapping opportunity closes
* and the contract owner can withdrawn the remaining new tokens.
* Implements ERC165 introspection for IERC677Receiver.
*/
contract Artis2Launch is IERC677Receiver, ERC165, Ownable {
    IERC20 public oldToken;
    IERC20 public newToken;

    uint256 public constant SWAP_RATIO_NOMINATOR = 2000000;
    uint256 public constant SWAP_RATIO_DENOMINATOR = 10000000;

    uint256 public constant DISCOUNT_PERIOD_START = 1618531200; // Fri Apr 16 2021 00:00:00 GMT+0000
    uint256 public constant DISCOUNT_PER_DAY = 20000; // daily addition to the denominator during discount period

    // the swapping opportunity closes 1 year after the start of the discount period
    uint256 public constant SWAP_DISABLED_AFTER = DISCOUNT_PERIOD_START + (86400 * 365);

    event Swapped(uint256 oldTokenAmount, uint256 newTokenAmount);

    constructor(IERC20 _oldToken, IERC20 _newToken) {
        oldToken = _oldToken;
        newToken = _newToken;
        _registerInterface(IERC677Receiver.onTokenTransfer.selector);
    }

    // IERC677Receiver interface
    function onTokenTransfer(address from, uint256 amount, bytes calldata)
        external
        override
        returns (bool success)
    {
        // accept only known tokens
        require(msg.sender == address(oldToken) || msg.sender == address(newToken), "wrong input token");

        if(msg.sender == address(oldToken)) {
            require(block.timestamp <= SWAP_DISABLED_AFTER, "swapping period over");
            uint256 newTokenAmount = getCurrentSwapAmount(amount);
            emit Swapped(amount, newTokenAmount);
            return newToken.transfer(from, newTokenAmount);
        }
        return true;
    }

    // Allows the contract owner to withdraw alien tokens from the contract.
    function withdrawAlienTokens(IERC20 token)
        external
        onlyOwner
    {
        require(token != oldToken && token != newToken, "not an alien token");
        require(token.balanceOf(address(this)) > 0, "no such token owned");
        token.transfer(msg.sender, token.balanceOf(address(this)));
    }

    // After the end of the swapping period, the owner can withdraw remaining new tokens to a given address.
    function withdrawRemainingNewTokensTo(address receiver)
        external
        onlyOwner
    {
        require(block.timestamp > SWAP_DISABLED_AFTER, "withdrawal not yet allowed");
        newToken.transfer(receiver, newToken.balanceOf(address(this)));
    }

    // Returns the amount of new tokens a given amount of old tokens would be converted to at the current time.
    // During the discount period, the discount increases by 0.2% every 24 hours relative to the initial ratio.
    function getCurrentSwapAmount(uint256 amount)
        public
        view
        returns(uint256)
    {
        return getSwapAmountAt(amount, block.timestamp);
    }

    function getSwapAmountAt(uint256 amount, uint256 timestamp)
        public
        view
        returns(uint256)
    {
        uint256 discountTimeframe = timestamp > DISCOUNT_PERIOD_START ? timestamp - DISCOUNT_PERIOD_START : 0;
        uint256 nrDiscountDays = discountTimeframe / 86400;
        return timestamp <= SWAP_DISABLED_AFTER ?
            amount * SWAP_RATIO_NOMINATOR / (SWAP_RATIO_DENOMINATOR + (nrDiscountDays* DISCOUNT_PER_DAY)) :
            0;
    }
}
