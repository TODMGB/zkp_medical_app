// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./UserOperation.sol";

/**
 * @title IPaymaster
 * @notice Interface for Paymaster contracts
 */
interface IPaymaster {
    enum PostOpMode {
        opSucceeded,
        opReverted,
        postOpReverted
    }

    /**
     * @notice Validate the paymaster will pay for the UserOperation
     * @param userOp The user operation
     * @param userOpHash Hash of the user operation
     * @param maxCost Maximum cost of this transaction
     * @return context Value to send to postOp
     * @return validationData Signature and time-range of this operation
     */
    function validatePaymasterUserOp(
        UserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 maxCost
    ) external returns (bytes memory context, uint256 validationData);

    /**
     * @notice Post-operation handler
     * @param mode Enum with the following options: opSucceeded, opReverted, postOpReverted
     * @param context Value returned by validatePaymasterUserOp
     * @param actualGasCost Actual gas used so far
     */
    function postOp(
        PostOpMode mode,
        bytes calldata context,
        uint256 actualGasCost
    ) external;
}

