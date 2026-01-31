// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.24;

import "../interfaces/IAccount.sol";
import "../interfaces/IPaymaster.sol";
import "../interfaces/UserOperation.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title EntryPoint
 * @notice 单例合约，用于执行一批 UserOperation（用户操作）
 * @dev 这是一个简化的示例实现，演示了验证、部署账号、执行调用和支付结算的流程
 */
contract EntryPoint is ReentrancyGuard {
    using ECDSA for bytes32; // 引入 ECDSA 库，便于对 bytes32 类型调用 ECDSA 的扩展方法

    // 事件（Events）: 用于索引和记录链上重要操作，便于离链监听和调试
    event UserOperationEvent(
        bytes32 indexed userOpHash,
        address indexed sender,
        address indexed paymaster,
        uint256 nonce,
        bool success,
        uint256 actualGasCost,
        uint256 actualGasUsed
    );

    // 当合约通过工厂部署用户账号时，发出此事件
    event AccountDeployed(
        bytes32 indexed userOpHash,
        address indexed sender,
        address factory,
        address paymaster
    );

    // 存款事件：记录某个账户的存款总额（用于 paymaster 或普通账户）
    event Deposited(address indexed account, uint256 totalDeposit);

    // 提现事件：记录从合约提取资金的操作
    event Withdrawn(
        address indexed account,
        address withdrawAddress,
        uint256 amount
    );

    // 存储（Storage）
    // deposits: 存储每个账户（或 paymaster）的预存款，用于支付执行 gas
    mapping(address => uint256) public deposits;

    // nonceSequenceNumber: 存储每个账户的下一次 nonce（或简单的序号），用于防重放与同步
    mapping(address => uint256) public nonceSequenceNumber;
 
    /**
     * @notice 批量执行 UserOperation
     * @param ops 要执行的用户操作数组
     * @param beneficiary 接收 gas 支付的受益者地址（通常是打包者/矿工/验证者）
     * @dev 使用 nonReentrant 修饰，防止重入攻击
     */
    function handleOps(
        UserOperation[] calldata ops,
        address payable beneficiary
    ) external nonReentrant {
        require(ops.length > 0, "EntryPoint: no operations");
        require(beneficiary != address(0), "EntryPoint: invalid beneficiary");

        uint256 opsLen = ops.length;
        for (uint256 i = 0; i < opsLen; i++) {
            // 逐个处理每个 UserOperation
            _handleUserOp(ops[i], beneficiary);
        }
    }

    /**
     * @notice 处理单个 UserOperation 的完整流程：包括创建账号（如果需要）、校验预付、执行调用、结算支付并发事件
     * @param userOp 单个用户操作
     * @param beneficiary gas 支付受益者
     * @dev 逻辑分为：
     *  1. 记录起始 gas 并计算 userOpHash
     *  2. 如果提供了 initCode，则通过工厂部署账号
     *  3. 校验预付（account 或 paymaster 是否提供足够的 prefund），并调用账号的 validateUserOp
     *  4. 执行 userOp 的 callData
     *  5. 计算实际 gas 使用与成本，调用 _handlePayment 完成转账，并发出事件记录结果
     */
    function _handleUserOp(
        UserOperation calldata userOp,
        address payable beneficiary
    ) internal {
        // Step 1: 记录起始 gas 并计算 userOp 的哈希
        uint256 preGas = gasleft();
        bytes32 userOpHash = getUserOpHash(userOp);

        // 如果需要，通过工厂部署账号（initCode 非空时）
        _createAccountIfNeeded(userOp, userOpHash);

        // 验证并准备预付（validateUserOp 失败会 revert，之后的执行和日志不会被触发）
        _validatePrepayment(userOp, userOpHash);

        // 执行 userOp
        bool success = _executeUserOp(userOp);

        // Step 4: 结算支付并发事件
        uint256 actualGas = preGas - gasleft();

        // 计算有效 gas price：min(maxFeePerGas, basefee + maxPriorityFeePerGas)
        uint256 effectiveGasPrice = block.basefee + userOp.maxPriorityFeePerGas;
        if (effectiveGasPrice > userOp.maxFeePerGas) {
            effectiveGasPrice = userOp.maxFeePerGas;
        }
        uint256 actualGasCost = actualGas * effectiveGasPrice;

        // 支付（从 paymaster 或 account 中扣除并转给 beneficiary）
        _handlePayment(userOp, userOpHash, actualGasCost, success, beneficiary);

        // 发出操作事件，记录执行情况（便于离线观察和流水）
        emit UserOperationEvent(
            userOpHash,
            userOp.sender,
            _getPaymaster(userOp),
            userOp.nonce,
            success,
            actualGasCost, // 实际花费
            actualGas
        );
    }

    /**
     * @notice 如果 userOp 提供了 initCode，则尝试通过 initCode 中包含的工厂地址和数据创建账号
     * @dev initCode 的前 20 字节约定为 factory 地址，后续为传给 factory 的 calldata
     * @param userOp 用户操作
     * @param userOpHash 对应的哈希，用于事件记录
     * @notice 如果账号已存在或工厂调用失败，将 revert
     */
    function _createAccountIfNeeded(
        UserOperation calldata userOp,
        bytes32 userOpHash
    ) internal {
        if (userOp.initCode.length > 0) {
            address sender = userOp.sender;
            // 要求目标地址尚未部署合约（code size 为 0）
            require(
                _getCodeSize(sender) == 0,
                "EntryPoint: account already exists"
            );

            // 从 initCode 中解析 factory 地址和 calldata
            address factory = address(bytes20(userOp.initCode[0:20]));
            bytes memory initCallData = userOp.initCode[20:];

            // 调用 factory（低级调用）以部署账号
            (bool success, ) = factory.call(initCallData);
            require(success, "EntryPoint: account creation failed");

            // 更可靠的方式是检查目标地址上是否已部署代码
            require(
                _getCodeSize(sender) > 0,
                "EntryPoint: factory failed to deploy account"
            );

            // 发出部署事件，便于离线追踪谁通过哪个工厂、paymaster 部署了账号
            emit AccountDeployed(
                userOpHash,
                sender,
                factory,
                _getPaymaster(userOp)
            );
        }
    }

    /**
     * @notice 校验并准备支付前置资金（prefund）
     * @param userOp 用户操作
     * @param userOpHash 操作的哈希
     * @return missingAccountFunds 如果账户支付方资金不足，返回缺少的金额，否则为 0
     * @dev 计算需要的预付金额：callGasLimit + verificationGasLimit + preVerificationGas，均乘以 maxFeePerGas
     *      若存在 paymaster，则检查 paymaster 的存款是否足够并调用 paymaster 的验证接口；否则将检查 account 存款并返回缺口
     */
    function _validatePrepayment(
        UserOperation calldata userOp,
        bytes32 userOpHash
    ) internal returns (uint256 missingAccountFunds) {
        // 计算所需的预付金额（保守估算）
        uint256 requiredPrefund = userOp.callGasLimit +
            userOp.verificationGasLimit +
            userOp.preVerificationGas;
        requiredPrefund *= userOp.maxFeePerGas;

        // 检查是否使用 paymaster（paymasterAndData 前 20 字节为 paymaster 地址）
        address paymaster = _getPaymaster(userOp);
        if (paymaster != address(0)) {
            // 由 paymaster 支付：确保 paymaster 的存款足够
            require(
                deposits[paymaster] >= requiredPrefund,
                "EntryPoint: paymaster deposit too low"
            );
            // 调用 paymaster 的验证逻辑
            _validatePaymasterUserOp(userOp, userOpHash, requiredPrefund);
        } else {
            // 由账户自己支付：检查账户余额是否足够，并记录缺口
            uint256 currentDeposit = deposits[userOp.sender];
            if (currentDeposit < requiredPrefund) {
                missingAccountFunds = requiredPrefund - currentDeposit;
            }
        }

        // 调用账户合约的 validateUserOp，通知它需要的缺口金额（如果有）
        IAccount(userOp.sender).validateUserOp(
            userOp,
            userOpHash,
            missingAccountFunds
        );

        // 更新账户的 nonce（存储下一次应使用的值）
        nonceSequenceNumber[userOp.sender] = userOp.nonce + 1;

        return missingAccountFunds;
    }

    /**
     * @notice 调用 paymaster 的验证接口
     * @param userOp 用户操作
     * @param userOpHash 操作哈希
     * @param requiredPrefund 需要的预付金额
     * @dev paymasterAndData 中前 20 字节为 paymaster 地址，后续（若有）是 paymaster 数据；当前接口不再显式解析 paymasterData
     */
    function _validatePaymasterUserOp(
        UserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 requiredPrefund
    ) internal {
        address paymaster = _getPaymaster(userOp);
        // 如果需要，paymaster 可在其 validatePaymasterUserOp 中解析 paymasterAndData
        IPaymaster(paymaster).validatePaymasterUserOp(
            userOp,
            userOpHash,
            requiredPrefund
        );
    }

    /**
     * @notice 执行 userOp 的 callData（如果存在）
     * @param userOp 用户操作
     * @return success 执行是否成功
     * @dev 使用低级 call 将交易转发给 userOp.sender，并限制 gas 为 callGasLimit
     */
    function _executeUserOp(
        UserOperation calldata userOp
    ) internal returns (bool success) {
        if (userOp.callData.length > 0) {
            (success, ) = userOp.sender.call{gas: userOp.callGasLimit}(
                userOp.callData
            );
        } else {
            // 没有调用数据，视为成功（仅验证或无操作）
            success = true;
        }
    }

    /**
     * @notice 执行支付结算：从 paymaster 或 account 的存款中扣除实际 gas 费用并转账给 beneficiary
     * @param userOp 用户操作
     * @param actualGasCost 实际 gas 成本（已计算为 gasUsed * effectiveGasPrice）
     * @param beneficiary 接收费用的地址
     */
    function _handlePayment(
        UserOperation calldata userOp,
        bytes32,
        uint256 actualGasCost,
        bool,
        address payable beneficiary
    ) internal {
        address paymaster = _getPaymaster(userOp);
        if (paymaster != address(0)) {
            // paymaster 支付：从 paymaster 存款中扣除
            require(
                deposits[paymaster] >= actualGasCost,
                "EntryPoint: paymaster deposit too low for payment"
            );
            deposits[paymaster] -= actualGasCost;
            beneficiary.transfer(actualGasCost);
        } else {
            // 账户自身支付：从账户存款中扣除
            require(
                deposits[userOp.sender] >= actualGasCost,
                "EntryPoint: sender deposit too low for payment"
            );
            deposits[userOp.sender] -= actualGasCost;
            beneficiary.transfer(actualGasCost);
        }
    }

    /**
     * @notice 向指定账号存入资金（可由 paymaster 或用户调用）
     * @param account 要增加存款的地址
     * @dev msg.value 会被计入该地址的 deposits
     */
    function depositTo(address account) external payable {
        deposits[account] += msg.value;
        emit Deposited(account, deposits[account]);
    }


    /**
     * @notice 从合约中提现到指定地址
     * @param withdrawAddress 提现接收地址
     * @param amount 提现金额
     * @dev 仅允许 msg.sender 提取其 own deposits
     */
    function withdrawTo(
        address payable withdrawAddress,
        uint256 amount
    ) external {
        require(
            deposits[msg.sender] >= amount,
            "EntryPoint: insufficient balance"
        );
        deposits[msg.sender] -= amount;
        withdrawAddress.transfer(amount);
        emit Withdrawn(msg.sender, withdrawAddress, amount);
    }


    /**
     * @notice 计算 UserOperation 的哈希，用于签名与唯一标识
     * @dev 将关键字段编码后 keccak256，以确保相同的操作产生相同的哈希
     */
    function getUserOpHash(
        UserOperation calldata userOp
    ) public view returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    userOp.sender,
                    userOp.nonce,
                    keccak256(userOp.initCode),
                    keccak256(userOp.callData),
                    userOp.callGasLimit,
                    userOp.verificationGasLimit,
                    userOp.preVerificationGas,
                    userOp.maxFeePerGas,
                    userOp.maxPriorityFeePerGas,
                    keccak256(userOp.paymasterAndData),
                    block.chainid,
                    address(this)
                )
            );
    }

    /**
     * @notice 从 paymasterAndData 字段中解析 paymaster 地址（前 20 字节）
     * @dev 若长度不足 20 字节，表示没有 paymaster
     */
    function _getPaymaster(
        UserOperation calldata userOp
    ) internal pure returns (address) {
        if (userOp.paymasterAndData.length >= 20) {
            return address(bytes20(userOp.paymasterAndData[0:20]));
        }
        return address(0);
    }

    /**
     * @notice 返回某个地址对应的合约代码大小
     * @dev 使用 extcodesize 来判断地址上是否已部署合约
     */
    function _getCodeSize(address addr) internal view returns (uint256 size) {
        assembly {
            size := extcodesize(addr)
        }
    }

    /**
     * @notice 查询某个账户在 EntryPoint 合约中的存款余额
     */
    function balanceOf(address account) external view returns (uint256) {
        return deposits[account];
    }

    /**
     * @notice 获取某个账户的下一个 nonce（或序号）
     */
    function getNonce(address account) external view returns (uint256) {
        return nonceSequenceNumber[account];
    }

    receive() external payable {
        deposits[msg.sender] += msg.value;
        emit Deposited(msg.sender, deposits[msg.sender]);
    }
}
