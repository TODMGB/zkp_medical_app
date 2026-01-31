// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title UserOperation
 * @notice User Operation struct as defined in ERC-4337
 */
struct UserOperation {
    address sender;                 // The account making the operation
    uint256 nonce;                  // Anti-replay parameter
    bytes initCode;                 // Account factory address + factory data (for account creation)
    bytes callData;                 // The data to pass to the sender during the main execution call
    uint256 callGasLimit;           // Gas limit for the main execution call
    uint256 verificationGasLimit;   // Gas limit for verification
    uint256 preVerificationGas;     // Gas to pay for bundler overhead
    uint256 maxFeePerGas;           // Maximum fee per gas
    uint256 maxPriorityFeePerGas;   // Maximum priority fee per gas
    bytes paymasterAndData;         // Paymaster address + paymaster data
    bytes signature;                // Signature over the entire request
}

