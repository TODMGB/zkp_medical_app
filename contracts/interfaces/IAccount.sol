// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./UserOperation.sol";

/**
 * @title IAccount
 * @notice Interface for Smart Contract Accounts
 */
interface IAccount {
    /**
     * @notice Validate user's signature and nonce
     * @param userOp The operation that is about to be executed
     * @param userOpHash Hash of the user operation
     * @param missingAccountFunds Amount of funds that the account needs to deposit to the EntryPoint
     * @return validationData Packed validation data (authorizer, validUntil, validAfter)
     */
    function validateUserOp(
        UserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 missingAccountFunds
    ) external returns (uint256 validationData);
}

