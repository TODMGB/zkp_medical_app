// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IAccount.sol";
import "./interfaces/UserOperation.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title SocialRecoveryAccount
 * @notice 支持社交恢复功能的智能合约账户
 * @dev 允许通过守护者（guardians）投票来恢复账户，更换 owner
 * 
 * 核心功能：
 * 1. 正常模式：owner 签名即可操作
 * 2. 恢复模式：守护者投票更换 owner
 * 3. 灵活配置：可添加/删除守护者，设置阈值
 */
contract SocialRecoveryAccount is IAccount {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    address public immutable entryPoint;
    address public owner;
    
    // 社交恢复相关
    address[] public guardians;           // 守护者列表
    mapping(address => bool) public isGuardian;  // 快速查找
    uint256 public threshold;             // 恢复所需的守护者数量
    
    // 恢复请求
    struct RecoveryRequest {
        address newOwner;                 // 建议的新 owner
        uint256 approvalCount;            // 已批准的守护者数量
        mapping(address => bool) approvals;  // 守护者是否已批准
        uint256 createdAt;                // 创建时间
        bool executed;                    // 是否已执行
    }
    
    RecoveryRequest public activeRecoveryRequest;
    uint256 public constant RECOVERY_PERIOD = 3 days;  // 恢复期限
    
    // 事件
    event AccountInitialized(address indexed account, address indexed owner);
    event AccountExecuted(address indexed target, uint256 value, bytes data);
    event GuardianAdded(address indexed guardian);
    event GuardianRemoved(address indexed guardian);
    event ThresholdChanged(uint256 oldThreshold, uint256 newThreshold);
    event RecoveryInitiated(address indexed newOwner, uint256 timestamp);
    event RecoverySupported(address indexed guardian, address indexed newOwner);
    event RecoveryExecuted(address indexed oldOwner, address indexed newOwner);
    event RecoveryCancelled(address indexed newOwner);

    modifier onlyOwner() {
        require(
            msg.sender == owner || msg.sender == address(this), 
            "SocialRecoveryAccount: not owner"
        );
        _;
    }

    modifier onlyEntryPoint() {
        require(
            msg.sender == entryPoint,
            "SocialRecoveryAccount: not from EntryPoint"
        );
        _;
    }

    constructor(address _entryPoint) {
        entryPoint = _entryPoint;
    }

    /**
     * @notice 初始化账户
     * @param _owner 初始所有者
     * @param _guardians 初始守护者列表
     * @param _threshold 恢复所需的守护者数量
     */
    function initialize(
        address _owner,
        address[] memory _guardians,
        uint256 _threshold
    ) external {
        require(owner == address(0), "SocialRecoveryAccount: already initialized");
        require(_owner != address(0), "SocialRecoveryAccount: invalid owner");
        require(_guardians.length >= _threshold, "SocialRecoveryAccount: invalid threshold");
        // 允许阈值为0，表示暂时不启用社交恢复
        // require(_threshold > 0, "SocialRecoveryAccount: threshold must be > 0");
        
        owner = _owner;
        threshold = _threshold;
        
        for (uint256 i = 0; i < _guardians.length; i++) {
            address guardian = _guardians[i];
            require(guardian != address(0), "SocialRecoveryAccount: invalid guardian");
            require(!isGuardian[guardian], "SocialRecoveryAccount: duplicate guardian");
            require(guardian != _owner, "SocialRecoveryAccount: owner cannot be guardian");
            
            guardians.push(guardian);
            isGuardian[guardian] = true;
            emit GuardianAdded(guardian);
        }
        
        emit AccountInitialized(address(this), _owner);
    }

    /**
     * @notice 验证 UserOperation
     */
    function validateUserOp(
        UserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 missingAccountFunds
    ) external override onlyEntryPoint returns (uint256 validationData) {
        bytes32 hash = userOpHash.toEthSignedMessageHash();
        address signer = hash.recover(userOp.signature);

        if (signer != owner) {
            return 1; // 签名验证失败
        }

        // 支付费用（仅当没有使用 Paymaster 时）
        // 如果 userOp.paymasterAndData.length > 0，说明使用了 Paymaster
        // Paymaster 会负责支付费用，账户不需要支付
        if (missingAccountFunds > 0) {
            // 检查是否使用了 Paymaster
            if (userOp.paymasterAndData.length == 0) {
                // 没有 Paymaster，账户自己支付
                (bool success, ) = payable(entryPoint).call{
                    value: missingAccountFunds
                }("");
                require(success, "SocialRecoveryAccount: failed to pay EntryPoint");
            }
            // 如果有 Paymaster (paymasterAndData.length > 0)
            // EntryPoint 会自动从 Paymaster 的存款中扣除费用
            // 账户不需要支付任何东西
        }

        return 0; // 验证成功
    }

    /**
     * @notice 执行操作（由 EntryPoint 调用）
     */
    function execute(
        address dest,
        uint256 value,
        bytes calldata func
    ) external onlyEntryPoint {
        _call(dest, value, func);
    }

    /**
     * @notice Owner 直接执行操作（用于演示和测试）
     * @dev 允许 Owner 不通过 EntryPoint 直接调用
     */
    function executeFromOwner(
        address dest,
        uint256 value,
        bytes calldata func
    ) external onlyOwner {
        _call(dest, value, func);
    }

    /**
     * @notice 执行批量操作
     */
    function executeBatch(
        address[] calldata dest,
        uint256[] calldata value,
        bytes[] calldata func
    ) external onlyEntryPoint {
        require(
            dest.length == func.length && value.length == func.length,
            "SocialRecoveryAccount: wrong array lengths"
        );
        for (uint256 i = 0; i < dest.length; i++) {
            _call(dest[i], value[i], func[i]);
        }
    }

    // ==================== 社交恢复功能 ====================

    /**
     * @notice 发起恢复请求
     * @param _newOwner 建议的新 owner
     * @dev 任何守护者都可以发起
     */
    function initiateRecovery(address _newOwner) external {
        require(threshold > 0, "SocialRecoveryAccount: social recovery not enabled");
        require(isGuardian[msg.sender], "SocialRecoveryAccount: not guardian");
        require(_newOwner != address(0), "SocialRecoveryAccount: invalid new owner");
        require(_newOwner != owner, "SocialRecoveryAccount: already owner");
        require(!activeRecoveryRequest.executed, "SocialRecoveryAccount: recovery already executed");
        
        // 如果有旧的恢复请求，检查是否过期
        if (activeRecoveryRequest.createdAt > 0 && 
            block.timestamp - activeRecoveryRequest.createdAt > RECOVERY_PERIOD) {
            // 过期，清理旧请求
            delete activeRecoveryRequest;
        }
        
        // 创建新的恢复请求或检查现有请求
        if (activeRecoveryRequest.createdAt == 0) {
            // 新的恢复请求
            activeRecoveryRequest.newOwner = _newOwner;
            activeRecoveryRequest.createdAt = block.timestamp;
            activeRecoveryRequest.executed = false;
            emit RecoveryInitiated(_newOwner, block.timestamp);
        } else {
            // 已有恢复请求，必须是同一个 newOwner
            require(
                activeRecoveryRequest.newOwner == _newOwner,
                "SocialRecoveryAccount: different recovery in progress"
            );
        }
        
        // 自动为发起者投票
        _supportRecovery(msg.sender, _newOwner);
    }

    /**
     * @notice 支持恢复请求
     * @param _newOwner 建议的新 owner
     */
    function supportRecovery(address _newOwner) external {
        require(isGuardian[msg.sender], "SocialRecoveryAccount: not guardian");
        require(activeRecoveryRequest.createdAt > 0, "SocialRecoveryAccount: no active recovery");
        require(activeRecoveryRequest.newOwner == _newOwner, "SocialRecoveryAccount: wrong new owner");
        require(!activeRecoveryRequest.executed, "SocialRecoveryAccount: already executed");
        require(
            block.timestamp - activeRecoveryRequest.createdAt <= RECOVERY_PERIOD,
            "SocialRecoveryAccount: recovery expired"
        );
        
        _supportRecovery(msg.sender, _newOwner);
    }

    /**
     * @notice 内部函数：支持恢复
     */
    function _supportRecovery(address guardian, address _newOwner) internal {
        require(!activeRecoveryRequest.approvals[guardian], "SocialRecoveryAccount: already approved");
        
        activeRecoveryRequest.approvals[guardian] = true;
        activeRecoveryRequest.approvalCount++;
        
        emit RecoverySupported(guardian, _newOwner);
        
        // 如果达到阈值，自动执行恢复
        if (activeRecoveryRequest.approvalCount >= threshold) {
            _executeRecovery();
        }
    }

    /**
     * @notice 执行恢复（更换 owner）
     */
    function _executeRecovery() internal {
        require(activeRecoveryRequest.approvalCount >= threshold, "SocialRecoveryAccount: not enough approvals");
        require(!activeRecoveryRequest.executed, "SocialRecoveryAccount: already executed");
        
        address oldOwner = owner;
        address newOwner = activeRecoveryRequest.newOwner;
        
        owner = newOwner;
        activeRecoveryRequest.executed = true;
        
        emit RecoveryExecuted(oldOwner, newOwner);
        
        // 清理恢复请求
        delete activeRecoveryRequest;
    }

    /**
     * @notice 取消恢复请求（仅 owner 可调用）
     */
    function cancelRecovery() external onlyOwner {
        require(activeRecoveryRequest.createdAt > 0, "SocialRecoveryAccount: no active recovery");
        
        address cancelledNewOwner = activeRecoveryRequest.newOwner;
        delete activeRecoveryRequest;
        
        emit RecoveryCancelled(cancelledNewOwner);
    }

    // ==================== 守护者管理 ====================

    /**
     * @notice 添加守护者（仅 owner）
     */
    function addGuardian(address guardian) external onlyOwner {
        require(guardian != address(0), "SocialRecoveryAccount: invalid guardian");
        require(!isGuardian[guardian], "SocialRecoveryAccount: already guardian");
        require(guardian != owner, "SocialRecoveryAccount: owner cannot be guardian");
        
        guardians.push(guardian);
        isGuardian[guardian] = true;
        
        emit GuardianAdded(guardian);
    }

    /**
     * @notice 删除守护者（仅 owner）
     */
    function removeGuardian(address guardian) external onlyOwner {
        require(isGuardian[guardian], "SocialRecoveryAccount: not guardian");
        require(guardians.length - 1 >= threshold, "SocialRecoveryAccount: cannot go below threshold");
        
        isGuardian[guardian] = false;
        
        // 从数组中删除
        for (uint256 i = 0; i < guardians.length; i++) {
            if (guardians[i] == guardian) {
                guardians[i] = guardians[guardians.length - 1];
                guardians.pop();
                break;
            }
        }
        
        emit GuardianRemoved(guardian);
    }

    /**
     * @notice 更改阈值（仅 owner）
     * @dev 阈值可以设置为0以禁用社交恢复功能
     */
    function changeThreshold(uint256 newThreshold) external onlyOwner {
        // 允许设置为0以禁用社交恢复
        require(newThreshold <= guardians.length, "SocialRecoveryAccount: threshold too high");
        
        uint256 oldThreshold = threshold;
        threshold = newThreshold;
        
        emit ThresholdChanged(oldThreshold, newThreshold);
    }

    // ==================== 查询函数 ====================

    /**
     * @notice 获取守护者列表
     */
    function getGuardians() external view returns (address[] memory) {
        return guardians;
    }

    /**
     * @notice 获取当前恢复请求信息
     */
    function getActiveRecovery() external view returns (
        address newOwner,
        uint256 approvalCount,
        uint256 createdAt,
        bool executed,
        uint256 remainingTime
    ) {
        newOwner = activeRecoveryRequest.newOwner;
        approvalCount = activeRecoveryRequest.approvalCount;
        createdAt = activeRecoveryRequest.createdAt;
        executed = activeRecoveryRequest.executed;
        
        if (createdAt > 0 && block.timestamp < createdAt + RECOVERY_PERIOD) {
            remainingTime = createdAt + RECOVERY_PERIOD - block.timestamp;
        } else {
            remainingTime = 0;
        }
    }

    /**
     * @notice 检查守护者是否已批准恢复
     */
    function hasApprovedRecovery(address guardian) external view returns (bool) {
        return activeRecoveryRequest.approvals[guardian];
    }

    // ==================== 内部函数 ====================

    function _call(address target, uint256 value, bytes memory data) internal {
        (bool success, bytes memory result) = target.call{value: value}(data);
        if (!success) {
            assembly {
                revert(add(result, 32), mload(result))
            }
        }
        emit AccountExecuted(target, value, data);
    }

    receive() external payable {}
}

