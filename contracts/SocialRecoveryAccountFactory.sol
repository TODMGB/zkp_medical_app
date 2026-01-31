// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./SocialRecoveryAccount.sol";
import "@openzeppelin/contracts/utils/Create2.sol";

/**
 * @title SocialRecoveryAccountFactory
 * @notice 使用 CREATE2 部署带社交恢复功能的账户
 */
contract SocialRecoveryAccountFactory {
    address public immutable entryPoint;
    
    event AccountCreated(
        address indexed account,
        address indexed owner,
        address[] guardians,
        uint256 threshold,
        uint256 salt
    );

    constructor(address _entryPoint) {
        entryPoint = _entryPoint;
    }

    /**
     * @notice 创建账户
     * @param owner 账户所有者
     * @param guardians 守护者列表
     * @param threshold 恢复阈值
     * @param salt 用于 CREATE2 的盐值
     */
    function createAccount(
        address owner,
        address[] memory guardians,
        uint256 threshold,
        uint256 salt
    ) external returns (address account) {
        // 将 owner 地址混入 salt，确保不同 owner 的账户地址唯一
        bytes32 finalSalt = keccak256(abi.encodePacked(owner, salt));
        
        address addr = Create2.computeAddress(
            finalSalt,
            keccak256(
                abi.encodePacked(
                    type(SocialRecoveryAccount).creationCode,
                    abi.encode(entryPoint)
                )
            )
        );
        
        uint256 codeSize = addr.code.length;
        if (codeSize > 0) {
            return addr;
        }
        
        account = address(
            new SocialRecoveryAccount{salt: finalSalt}(entryPoint)
        );
        
        SocialRecoveryAccount(payable(account)).initialize(owner, guardians, threshold);
        
        emit AccountCreated(account, owner, guardians, threshold, salt);
    }

    /**
     * @notice 计算账户地址
     * @dev 将 owner 地址混入 salt，确保不同 owner 的账户地址唯一
     */
    function getAccountAddress(
        address owner,
        address[] memory guardians,
        uint256 threshold,
        uint256 salt
    ) public view returns (address) {
        // 将 owner 地址混入 salt，避免地址碰撞
        bytes32 finalSalt = keccak256(abi.encodePacked(owner, salt));
        
        return Create2.computeAddress(
            finalSalt,
            keccak256(
                abi.encodePacked(
                    type(SocialRecoveryAccount).creationCode,
                    abi.encode(entryPoint)
                )
            )
        );
    }
}

