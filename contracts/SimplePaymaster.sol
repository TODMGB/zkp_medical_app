// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interfaces/IPaymaster.sol";
import "./interfaces/UserOperation.sol";

/**
 * @title SimplePaymaster
 * @notice 一个示例性的 paymaster 实现，会为所有操作提供担保（示例用途）
 * @dev 生产环境下应添加访问控制、支付策略与更严格的校验逻辑
 */
contract SimplePaymaster is IPaymaster {
    // EntryPoint 地址（不可变）
    address public immutable entryPoint;
    // 合约拥有者（用于提现权限）
    address public owner;

    // 存款事件：记录 paymaster 向 EntryPoint 存入资金
    event PaymasterDeposited(address indexed paymaster, uint256 amount);
    // 赞助事件：记录 paymaster 为哪个 sender 支付了多少实际 gas 成本
    event PaymasterSponsored(address indexed sender, uint256 actualGasCost);

    // 仅拥有者可调用
    modifier onlyOwner() {
        require(msg.sender == owner, "SimplePaymaster: not owner");
        _;
    }

    // 仅 EntryPoint 可调用（validate、postOp 等）
    modifier onlyEntryPoint() {
        require(
            msg.sender == entryPoint,
            "SimplePaymaster: not from EntryPoint"
        );
        _;
    }

    // 构造函数：设置 EntryPoint 并将部署者设为 owner
    constructor(address _entryPoint) {
        entryPoint = _entryPoint;
        owner = msg.sender;
    }


    /**
     * @notice EntryPoint 在处理 userOp 时调用，校验 paymaster 是否同意资助该操作
     * @param userOp 要处理的用户操作
     * @return context 任意字节串，会传递给 postOp（示例中编码了 userOp.sender）
     * @return validationData 返回 0 表示通过，非 0 表示失败或特定状态码
     * @dev 本示例 paymaster 为所有操作提供资助；生产应加入访问控制与更严格的校验
     */
    function validatePaymasterUserOp(
        UserOperation calldata userOp,
        bytes32,
        uint256
    )
        external
        override
        onlyEntryPoint
        returns (bytes memory context, uint256 validationData)
    {
        // 简单示例：为所有操作担保
        // 实际场景通常在这里进行更细粒度的校验（如白名单、签名、余额检查等）
        context = abi.encode(userOp.sender);
        validationData = 0; // 验证通过
    }

    /**
     * @notice EntryPoint 在操作执行后调用，用于 paymaster 做后续结算或清理
     * @param context validatePaymasterUserOp 返回的 context（本示例为编码的 sender）
     * @param actualGasCost 实际消耗的 gas 成本
     * @dev 本示例仅解码出 sender 并触发事件；生产中 paymaster 需要根据 mode 执行相应结算逻辑
     */
    function postOp(
        PostOpMode,
        bytes calldata context,
        uint256 actualGasCost
    ) external override onlyEntryPoint {
        address sender = abi.decode(context, (address));
        emit PaymasterSponsored(sender, actualGasCost);
    }

    /**
     * @notice 向 EntryPoint 存入资金以便用于担保交易费用
     * @dev 将 msg.value 转发给 EntryPoint 合约
     */
    function deposit() external payable {
        (bool success, ) = payable(entryPoint).call{value: msg.value}("");
        require(success, "SimplePaymaster: deposit failed");
        emit PaymasterDeposited(address(this), msg.value);
    }


    /**
     * @notice 从 EntryPoint 提取资金到指定地址（仅 owner 可调用）
     */
    function withdrawTo(
        address payable withdrawAddress,
        uint256 amount
    ) external onlyOwner {
        IEntryPointWithdraw(entryPoint).withdrawTo(withdrawAddress, amount);
    }

    /**
     * @notice 查询 paymaster 在 EntryPoint 中的存款余额
     */
    function getDeposit() external view returns (uint256) {
        return IEntryPointBalance(entryPoint).balanceOf(address(this));
    }

    // 接收 fallback：直接将收到的 ETH 转发到 EntryPoint 并发出事件
    receive() external payable {
        (bool success, ) = payable(entryPoint).call{value: msg.value}("");
        require(success, "SimplePaymaster: deposit failed");
        emit PaymasterDeposited(address(this), msg.value);
    }
}

interface IEntryPointWithdraw {
    function withdrawTo(address payable withdrawAddress, uint256 amount) external;
}

interface IEntryPointBalance {
    function balanceOf(address account) external view returns (uint256);
}

