// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./SimpleAccount.sol";
import "@openzeppelin/contracts/utils/Create2.sol";

/**
 * @title SimpleAccountFactory
 * @notice 用于创建 `SimpleAccount` 实例的工厂合约
 * @dev 使用 CREATE2 以实现可预测（deterministic）的合约地址生成
 */
contract SimpleAccountFactory {
    // EntryPoint 地址（factory 部署的账号将会将此地址传入构造函数）
    address public immutable entryPoint;

    // 事件：记录账户被创建（包含 salt，便于离线重构）
    event AccountCreated(address indexed account, address indexed owner, uint256 salt);

    // 构造函数：设置 EntryPoint 地址
    constructor(address _entryPoint) {
        entryPoint = _entryPoint;
    }

    /**
     * @notice 创建一个新的 `SimpleAccount`，若已存在则直接返回地址
     * @param owner 新账户的拥有者地址
     * @param salt CREATE2 的 salt，用于影响派生地址
     * @return account 新创建或已存在的账户地址
     * @dev 先通过 `getAccountAddress` 计算期望地址，若该地址已有合约代码则直接返回（避免重复部署）
     */
    function createAccount(
        address owner,
        uint256 salt
    ) external returns (address account) {
        address addr = getAccountAddress(owner, salt);
        uint256 codeSize = addr.code.length;

        // 若目标地址已被部署（codeSize > 0），直接返回现有地址
        if (codeSize > 0) {
            return addr;
        }

        // 通过 CREATE2 部署 SimpleAccount，传入 entryPoint 作为构造参数
        bytes32 salt32 = bytes32(salt);
        account = address(
            new SimpleAccount{salt: salt32}(entryPoint)
        );

        // 部署后初始化账户的 owner
        SimpleAccount(payable(account)).initialize(owner);

        emit AccountCreated(account, owner, salt);
    }


    /**
     * @notice 计算给定 salt 对应的 `SimpleAccount` 的推断地址（counterfactual address）
     * @param salt CREATE2 salt
     * @return 预期的合约地址
     * @dev 使用 OpenZeppelin 的 Create2.computeAddress，传入 creation code 与构造参数（entryPoint）
     */
    function getAccountAddress(
        address,
        uint256 salt
    ) public view returns (address) {
        return
            Create2.computeAddress(
                bytes32(salt),
                keccak256(
                    abi.encodePacked(
                        type(SimpleAccount).creationCode,
                        abi.encode(entryPoint)
                    )
                )
            );
    }
}

