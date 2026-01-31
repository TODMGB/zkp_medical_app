// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interfaces/IAccount.sol";
import "./interfaces/UserOperation.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "hardhat/console.sol";

/**
 * @title SimpleAccount
 * @notice 一个简单的智能合约账户实现（示例）
 * @dev 每个账户由一个外部拥有者（EOA）管理，该地址对 UserOperation 进行签名
 */
contract SimpleAccount is IAccount {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    // EntryPoint 合约地址（不可变）
    address public immutable entryPoint;
    // 账户拥有者（可在初始化时设置）
    address public owner;

    // 医药打卡记录：CID -> 时间戳
    mapping(string => uint256) public medicationCheckIns;
    // 打卡 CID 列表（用于遍历）
    string[] public checkInCids;

    // 事件：账户初始化
    event AccountInitialized(address indexed account, address indexed owner);
    // 事件：账户执行了一个调用
    event AccountExecuted(address indexed target, uint256 value, bytes data);
    // 事件：医药打卡记录
    event MedicationCheckInRecorded(string indexed ipfsCid, uint256 timestamp);

    // 修饰器：仅允许 owner 调用
    modifier onlyOwner() {
        require(msg.sender == owner, "SimpleAccount: not owner");
        _;
    }

    // 修饰器：仅允许 EntryPoint 调用（防止其他来源直接操作）
    modifier onlyEntryPoint() {
        require(
            msg.sender == entryPoint,
            "SimpleAccount: not from EntryPoint"
        );
        _;
    }

    // 构造函数：设置 EntryPoint 地址
    constructor(address _entryPoint) {
        entryPoint = _entryPoint;
    }

    /**
     * @notice 初始化账户并设置 owner（只能初始化一次）
     * @param _owner 账户拥有者地址
     */
    function initialize(address _owner) external {
        require(owner == address(0), "SimpleAccount: already initialized");
        require(_owner != address(0), "SimpleAccount: invalid owner");
        owner = _owner;
        emit AccountInitialized(address(this), _owner);
    }

    /**
     * @notice 验证 UserOperation 的签名并在需要时为其补足预付资金
     * @param userOp 要验证的用户操作
     * @param userOpHash 对应的操作哈希（由 EntryPoint 提供）
     * @param missingAccountFunds 如果 EntryPoint 发现账户存款不足，传入缺口金额，账户应把该金额发送到 EntryPoint
     * @return validationData 返回 0 表示验证通过，非 0 表示失败或特定错误码
     * @dev 仅允许 EntryPoint 调用（onlyEntryPoint）
     */
    function validateUserOp(
        UserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 missingAccountFunds
    ) external override onlyEntryPoint returns (uint256 validationData) {
        console.log("\n--- [SimpleAccount] Validating UserOp ---");
        // 验证签名：将 userOpHash 转为以太坊签名消息格式，然后用 ECDSA 恢复签名者
        bytes32 hash = userOpHash.toEthSignedMessageHash();
        address signer = hash.recover(userOp.signature);

        if (signer != owner) {
            return 1; // 签名验证失败，返回非零表示失败
        }

        // 如果 EntryPoint 指示账户需要补足存款，则把缺口金额发送到 EntryPoint
        if (missingAccountFunds > 0) {
            (bool success, ) = payable(entryPoint).call{
                value: missingAccountFunds
            }("");
            require(success, "SimpleAccount: failed to pay EntryPoint");
        }

        return 0; // 验证成功
    }


    /**
     * @notice 从此账户发起对单个目标合约的调用（仅 EntryPoint 可触发）
     * @param target 调用目标合约地址
     * @param value 随调用发送的以太币数额
     * @param data 调用的 calldata
     */
    function execute(
        address target,
        uint256 value,
        bytes calldata data
    ) external onlyEntryPoint {
        _call(target, value, data);
    }


    /**
     * @notice 批量执行多个调用（仅 EntryPoint 可触发）
     * @param targets 目标合约地址数组
     * @param values 每次调用随附的 ETH 数组
     * @param datas 每次调用的 calldata 数组
     */
    function executeBatch(
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata datas
    ) external onlyEntryPoint {
        require(
            targets.length == values.length && values.length == datas.length,
            "SimpleAccount: length mismatch"
        );
        for (uint256 i = 0; i < targets.length; i++) {
            _call(targets[i], values[i], datas[i]);
        }
    }


    /**
     * @notice 内部调用封装：对目标地址发起低级 call，并在失败时回退返回的错误信息
     */
    function _call(address target, uint256 value, bytes memory data) internal {
        (bool success, bytes memory result) = target.call{value: value}(data);
        if (!success) {
            assembly {
                revert(add(result, 32), mload(result))
            }
        }
        emit AccountExecuted(target, value, data);
    }


    /**
     * @notice 向 EntryPoint 存入押金（用于支付 gas）
     * @dev 会将 msg.value 转发给 EntryPoint 的合约地址
     */
    function addDeposit() external payable {
        (bool success, ) = payable(entryPoint).call{value: msg.value}("");
        require(success, "SimpleAccount: deposit failed");
    }


    /**
     * @notice 查询当前账户在 EntryPoint 合约中的存款余额
     */
    function getDeposit() external view returns (uint256) {
        return IEntryPoint(entryPoint).balanceOf(address(this));
    }


    /**
     * @notice 从 EntryPoint 提取存款到指定地址（仅 owner 可调用）
     */
    function withdrawDepositTo(
        address payable withdrawAddress,
        uint256 amount
    ) external onlyOwner {
        IEntryPoint(entryPoint).withdrawTo(withdrawAddress, amount);
    }


    /**
     * @notice 记录医药打卡信息（仅 EntryPoint 可调用，通过 UserOp 执行）
     * @param ipfsCid IPFS 上存储的打卡记录 CID
     */
    function recordMedicationCheckIn(string calldata ipfsCid) external onlyEntryPoint {
        require(bytes(ipfsCid).length > 0, "SimpleAccount: invalid IPFS CID");
        require(medicationCheckIns[ipfsCid] == 0, "SimpleAccount: CID already recorded");

        uint256 timestamp = block.timestamp;
        medicationCheckIns[ipfsCid] = timestamp;
        checkInCids.push(ipfsCid);

        emit MedicationCheckInRecorded(ipfsCid, timestamp);
    }


    /**
     * @notice 获取医药打卡记录总数
     */
    function getMedicationCheckInCount() external view returns (uint256) {
        return checkInCids.length;
    }


    /**
     * @notice 获取所有打卡的 CID 列表
     */
    function getAllCheckInCids() external view returns (string[] memory) {
        return checkInCids;
    }


    /**
     * @notice 获取指定 CID 的打卡时间戳
     * @param ipfsCid IPFS CID
     */
    function getCheckInTimestamp(string calldata ipfsCid)
        external
        view
        returns (uint256)
    {
        return medicationCheckIns[ipfsCid];
    }

    receive() external payable {}
}

interface IEntryPoint {
    function balanceOf(address account) external view returns (uint256);
    function withdrawTo(address payable withdrawAddress, uint256 amount) external;
}

