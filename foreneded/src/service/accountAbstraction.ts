import { ethers } from 'ethers';
import { Preferences } from '@capacitor/preferences';

// 导入合约地址和ABI
import contractAddresses from '../smart_contract/addresses.json';
// 导入生物识别服务
import { biometricService } from './biometric';
// 导入API配置
import { buildERC4337Url, ERC4337_CONFIG, RPC_CONFIG } from '../config/api.config';

// 定义UserOperation接口
interface UserOperation {
  sender: string;
  nonce: string;
  initCode: string;
  callData: string;
  callGasLimit: string;
  verificationGasLimit: string;
  preVerificationGas: string;
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;
  paymasterAndData: string;
  signature: string;
}

// 导入存储配置
import { WALLET_KEYS } from '@/config/storage.config';

/**
 * ERC-4337 账户抽象服务
 */
class AccountAbstractionService {
  private eoaWallet: ethers.Wallet | ethers.HDNodeWallet | null = null;
  private abstractAccountAddress: string | null = null;
  private provider: ethers.JsonRpcProvider;
  private entryPointAddress: string;
  private factoryAddress: string;

  constructor(rpcUrl: string) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.entryPointAddress = contractAddresses.EntryPoint.address;
    this.factoryAddress = contractAddresses.SocialRecoveryAccountFactory.address;
  }

  /**
   * 测试所有服务连通性
   */
  public async testAllConnections(): Promise<{
    rpc: { success: boolean; message: string; blockNumber?: number };
    api: { success: boolean; message: string };
    overall: boolean;
  }> {
    const rpcResult = await this.testRPCConnection();
    const apiResult = await this.testAPIConnection();
    
    return {
      rpc: rpcResult,
      api: apiResult,
      overall: rpcResult.success && apiResult.success
    };
  }

  /**
   * 测试RPC节点连通性
   */
  private async testRPCConnection(): Promise<{ success: boolean; message: string; blockNumber?: number }> {
    try {
      const blockNumber = await this.provider.getBlockNumber();
      return {
        success: true,
        message: `连接成功！当前区块: ${blockNumber}`,
        blockNumber
      };
    } catch (error: any) {
      return {
        success: false,
        message: `连接失败: ${error.message}`
      };
    }
  }

  /**
   * 测试API服务连通性
   */
  private async testAPIConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(
        buildERC4337Url('health'),
        { method: 'GET', headers: { 'Content-Type': 'application/json' } }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      return { success: true, message: 'API服务连接成功！' };
    } catch (error: any) {
      return { success: false, message: `连接失败: ${error.message}` };
    }
  }

  /**
   * 注册：生成随机EOA并保存
   * @param password 加密密码
   * @param enableBiometric 是否启用生物识别
   * @param userInfo 用户信息（用于后端注册）
   */
  public async register(
    password: string, 
    enableBiometric: boolean = false,
    userInfo?: {
      id_card_number: string;
      phone_number: string;
      email: string;
    }
  ): Promise<void> {
    try {
      // 检查是否已经注册
      const existingKey = await this.loadEOAFromStorage();
      if (existingKey) {
        throw new Error('账户已存在，请使用登录功能');
      }

      // 生成随机EOA钱包
      console.log('正在生成随机EOA钱包...');
      const randomWallet = ethers.Wallet.createRandom();
      this.eoaWallet = randomWallet.connect(this.provider);
      
      console.log('EOA地址:', this.eoaWallet.address);
      console.log('EOA私钥已生成（仅本地存储）');

      // 加密并保存私钥（使用原始wallet而非connected wallet）
      const encryptedKey = await randomWallet.encrypt(password);
      await Preferences.set({
        key: WALLET_KEYS.EOA_PRIVATE_KEY,
        value: encryptedKey,
      });
      console.log('EOA私钥已加密保存');

      // 预计算抽象账户地址（不部署）
      await this.calculateAbstractAccountAddress();
      
      // 如果提供了用户信息，注册到后端
      if (userInfo) {
        const { authService } = await import('./auth');
        // 获取压缩格式的公钥用于ECIES加密
        const encryptionPublicKey = this.eoaWallet.signingKey.compressedPublicKey;
        console.log('加密公钥:', encryptionPublicKey);
        
        await authService.register({
          ...userInfo,
          eoa_address: this.eoaWallet.address,
          smart_account_address: this.abstractAccountAddress!,
          encryption_public_key: encryptionPublicKey,
        });
        console.log('✅ 后端注册成功');
      }
      
      // 如果启用生物识别，保存密码
      if (enableBiometric) {
        try {
          await biometricService.savePasswordWithBiometric(password);
          console.log('✅ 已启用指纹登录');
        } catch (error) {
          console.warn('启用指纹登录失败，但注册成功:', error);
        }
      }
      
      console.log('✅ 注册成功！');
    } catch (error) {
      console.error('注册失败:', error);
      throw error;
    }
  }

  /**
   * 登录：加载已保存的EOA
   */
  public async login(password: string): Promise<void> {
    try {
      const encryptedKey = await this.loadEOAFromStorage();
      if (!encryptedKey) {
        throw new Error('未找到账户，请先注册');
      }

      console.log('正在解密EOA钱包...');
      const decryptedWallet = await ethers.Wallet.fromEncryptedJson(encryptedKey, password);
      this.eoaWallet = decryptedWallet.connect(this.provider);
      
      console.log('EOA地址:', this.eoaWallet.address);

      // 加载抽象账户地址
      const { value } = await Preferences.get({ key: WALLET_KEYS.ACCOUNT_ADDRESS });
      this.abstractAccountAddress = value;
      
      if (this.abstractAccountAddress) {
        console.log('抽象账户地址:', this.abstractAccountAddress);
      }

      console.log('✅ 登录成功！');
    } catch (error) {
      console.error('登录失败:', error);
      throw error;
    }
  }

  /**
   * 调用后端登录API（需要先调用login方法解密EOA）
   */
  public async loginToBackend(): Promise<void> {
    if (!this.eoaWallet) {
      throw new Error('EOA钱包未解密，请先调用login方法');
    }

    // 动态导入authService以避免循环依赖
    const { authService } = await import('./auth');
    
    console.log('调用后端登录API...');
    await authService.login(this.eoaWallet);
    console.log('后端登录成功');
  }

  /**
   * 使用指纹自动登录
   */
  public async loginWithBiometric(): Promise<void> {
    try {
      // 检查是否已注册
      const encryptedKey = await this.loadEOAFromStorage();
      if (!encryptedKey) {
        throw new Error('未找到账户，请先注册');
      }

      // 检查是否启用了生物识别
      const isEnabled = await biometricService.isEnabled();
      if (!isEnabled) {
        throw new Error('未启用生物识别，请使用密码登录');
      }

      console.log('正在进行指纹验证...');
      // 通过指纹验证获取密码
      const password = await biometricService.getPasswordWithBiometric();
      
      // 使用获取的密码进行登录
      await this.login(password);
      
      console.log('✅ 指纹登录成功！');
    } catch (error) {
      console.error('指纹登录失败:', error);
      throw error;
    }
  }

  /**
   * 预计算抽象账户地址（不部署到链上）
   */
  private async calculateAbstractAccountAddress(): Promise<void> {
    if (!this.eoaWallet) {
      throw new Error('EOA钱包未初始化');
    }

    const owner = this.eoaWallet.address;
    // 使用EOA地址的哈希值作为salt，确保每个EOA都有唯一的抽象账户
    const ownerHash = ethers.keccak256(ethers.toUtf8Bytes(owner));
    const salt = BigInt(ownerHash) % BigInt(1000000);
    const saltNumber = Number(salt);

    console.log('==== 预计算抽象账户地址 ====');
    console.log('Owner地址:', owner);
    console.log('Salt值:', saltNumber);
    
    // 调用新API预计算账户地址
    const response = await fetch(
      buildERC4337Url('calculateAccountAddress'),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerAddress: owner,
          guardians: [],
          threshold: 0,
          salt: saltNumber
        }),
      }
    );

    const result = await response.json();
    
    if (!result.success || !result.data || !result.data.accountAddress) {
      throw new Error('预计算账户地址失败');
    }

    const accountAddress = result.data.accountAddress;
    this.abstractAccountAddress = accountAddress;
    console.log('✅ 抽象账户地址:', accountAddress);

    // 保存抽象账户地址和salt
    await Preferences.set({
      key: WALLET_KEYS.ACCOUNT_ADDRESS,
      value: accountAddress,
    });
    await Preferences.set({
      key: 'account_salt',
      value: saltNumber.toString(),
    });

    console.log('✅ 地址已保存（未部署到链上）');
  }

  /**
   * 部署抽象账户到区块链
   */
  public async deployAbstractAccount(): Promise<void> {
    if (!this.eoaWallet || !this.abstractAccountAddress) {
      throw new Error('请先注册或登录');
    }

    console.log('==== 部署抽象账户到区块链 ====');
    
    // 检查账户是否已部署
    const code = await this.provider.getCode(this.abstractAccountAddress);
    if (code !== '0x') {
      console.log('账户已部署，无需重复部署');
      return;
    }

    // 获取保存的salt
    const { value: saltStr } = await Preferences.get({ key: 'account_salt' });
    const salt = saltStr ? parseInt(saltStr) : Math.floor(Math.random() * 1000000);

    console.log('开始部署账户...');
    console.log('Owner:', this.eoaWallet.address);
    console.log('预期地址:', this.abstractAccountAddress);
    console.log('Salt:', salt);

    // 调用新API部署账户
    const response = await fetch(
      buildERC4337Url('createAccount'),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerAddress: this.eoaWallet.address,
          guardians: [],
          threshold: 0,
          salt: salt
        }),
      }
    );

    const result = await response.json();
    
    if (!result.success || !result.data) {
      throw new Error(`部署账户失败: ${JSON.stringify(result)}`);
    }

    console.log('✅ 账户部署成功！');
    console.log('账户地址:', result.data.accountAddress);
    if (result.data.txHash) {
      console.log('交易哈希:', result.data.txHash);
    }

    // 等待部署确认
    console.log('等待部署确认...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 验证部署
    const newCode = await this.provider.getCode(this.abstractAccountAddress);
    if (newCode !== '0x') {
      console.log('✅ 账户部署验证成功！');
    } else {
      console.warn('⚠️ 账户可能尚未完全部署，请稍后检查');
    }
  }

  /**
   * 执行交易（使用抽象账户）
   * @param target - 目标地址
   * @param value - 交易金额（wei，字符串格式，会自动转换为BigInt）
   * @param data - 交易数据（十六进制字符串）
   */
  public async executeTransaction(
    target: string,
    value: string,
    data: string
  ): Promise<any> {
    if (!this.eoaWallet || !this.abstractAccountAddress) {
      throw new Error('请先登录');
    }

    console.log('==== 开始执行交易 ====');
    console.log('准备执行交易...');
    console.log('目标地址:', target);
    console.log('金额(原始):', value, '类型:', typeof value);
    
    // 获取nonce
    const nonceUrl = buildERC4337Url('getNonce').replace(':accountAddress', this.abstractAccountAddress!);
    const nonceResponse = await fetch(nonceUrl);
    const nonceData = await nonceResponse.json();
    const nonce = nonceData.success ? nonceData.data.nonce : nonceData.nonce;
    console.log('获取到nonce:', nonce);

    // 构建callData
    console.log('开始构建callData...');
    console.log('参数详情:');
    console.log('  - target:', target, '(类型:', typeof target, ')');
    console.log('  - value(字符串):', value);
    
    let valueAsBigInt;
    try {
      valueAsBigInt = BigInt(value);
      console.log('  - value转BigInt成功:', valueAsBigInt, '(类型:', typeof valueAsBigInt, ')');
    } catch (error) {
      console.error('❌ BigInt转换失败:', error);
      throw new Error(`无法将value转换为BigInt: ${value}`);
    }
    
    console.log('  - data:', data, '(类型:', typeof data, ')');
    
    const accountInterface = new ethers.Interface(contractAddresses.SocialRecoveryAccount.abi);
    
    console.log('准备调用encodeFunctionData，参数:');
    console.log('  [0]:', target);
    console.log('  [1]:', valueAsBigInt);
    console.log('  [2]:', data);
    
    let callData;
    try {
      callData = accountInterface.encodeFunctionData('execute', [
        target,
        valueAsBigInt, // uint256类型，转换为BigInt
        data
      ]);
      console.log('✅ callData生成成功:', callData.substring(0, 20) + '...');
    } catch (error: any) {
      console.error('❌ encodeFunctionData失败:', error);
      console.error('错误详情:', error.message);
      console.error('错误堆栈:', error.stack);
      throw new Error(`构建callData失败: ${error.message}`);
    }

    // 获取gas价格
    const feeData = await this.provider.getFeeData();

    // 构建UserOperation
    const userOp: UserOperation = {
      sender: this.abstractAccountAddress,
      nonce: nonce.toString(),
      initCode: '0x', // 账户已部署
      callData: callData,
      callGasLimit: '300000',
      verificationGasLimit: '500000',
      preVerificationGas: '100000',
      maxFeePerGas: feeData.maxFeePerGas?.toString() || '10000000000',
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.toString() || '2000000000',
      paymasterAndData: contractAddresses.SimplePaymaster.address,
      signature: '0x'
    };

    // 计算userOpHash并签名
    const entryPointInterface = new ethers.Interface(contractAddresses.EntryPoint.abi);
    const entryPoint = new ethers.Contract(
      this.entryPointAddress,
      entryPointInterface,
      this.provider
    );

    const userOpHash = await entryPoint.getUserOpHash(userOp);
    const signature = await this.eoaWallet.signMessage(ethers.getBytes(userOpHash));
    userOp.signature = signature;

    // 提交到Bundler
    const submitResponse = await fetch(buildERC4337Url('submitUserOp'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userOp }),
    });

    const submitData = await submitResponse.json();
    
    if (!submitData.ok) {
      throw new Error(`执行交易失败: ${JSON.stringify(submitData)}`);
    }

    console.log('✅ 交易执行成功！');
    return submitData.result;
  }

  /**
   * 从安全存储加载EOA私钥
   */
  private async loadEOAFromStorage(): Promise<string | null> {
    const { value } = await Preferences.get({ key: WALLET_KEYS.EOA_PRIVATE_KEY });
    return value;
  }

  /**
   * 检查是否已注册
   */
  public async isRegistered(): Promise<boolean> {
    const encryptedKey = await this.loadEOAFromStorage();
    return encryptedKey !== null;
  }

  /**
   * 获取EOA地址
   */
  public getEOAAddress(): string | null {
    return this.eoaWallet?.address || null;
  }

  /**
   * 获取抽象账户地址
   */
  public getAbstractAccountAddress(): string | null {
    return this.abstractAccountAddress;
  }

  /**
   * 获取EOA钱包实例
   */
  public getEOAWallet(): ethers.Wallet | ethers.HDNodeWallet | null {
    return this.eoaWallet;
  }

  /**
   * 部署账户的简化方法（用于注册流程）
   */
  public async deployAccount(): Promise<any> {
    return await this.deployAbstractAccount();
  }

  /**
   * 获取抽象账户余额
   */
  public async getBalance(): Promise<string> {
    const address = this.abstractAccountAddress;
    if (!address) {
      throw new Error('抽象账户未初始化');
    }

    const balance = await this.provider.getBalance(address);
    return ethers.formatEther(balance);
  }

  /**
   * 获取EntryPoint中的存款余额
   */
  public async getDepositBalance(): Promise<string> {
    const address = this.abstractAccountAddress;
    if (!address) {
      throw new Error('抽象账户未初始化');
    }

    const entryPointInterface = new ethers.Interface(contractAddresses.EntryPoint.abi);
    const entryPoint = new ethers.Contract(
      this.entryPointAddress,
      entryPointInterface,
      this.provider
    );

    const deposit = await entryPoint.balanceOf(address);
    return ethers.formatEther(deposit);
  }

  /**
   * 启用指纹登录（需要提供当前密码）
   */
  public async enableBiometric(password: string): Promise<void> {
    try {
      // 验证密码是否正确
      const encryptedKey = await this.loadEOAFromStorage();
      if (!encryptedKey) {
        throw new Error('未找到账户');
      }

      // 尝试用密码解密验证
      await ethers.Wallet.fromEncryptedJson(encryptedKey, password);
      
      // 密码正确，保存到生物识别
      await biometricService.savePasswordWithBiometric(password);
      console.log('✅ 指纹登录已启用');
    } catch (error) {
      console.error('启用指纹登录失败:', error);
      throw error;
    }
  }

  /**
   * 禁用指纹登录
   */
  public async disableBiometric(): Promise<void> {
    try {
      await biometricService.deleteCredentials();
      console.log('✅ 指纹登录已禁用');
    } catch (error) {
      console.error('禁用指纹登录失败:', error);
      throw error;
    }
  }

  /**
   * 检查是否启用了指纹登录
   */
  public async isBiometricEnabled(): Promise<boolean> {
    return await biometricService.isEnabled();
  }

  /**
   * 检查设备是否支持生物识别
   */
  public async isBiometricAvailable(): Promise<boolean> {
    return await biometricService.isAvailable();
  }

  /**
   * 确保已登录后端（用于需要后端功能的操作）
   * 如果未登录后端，会尝试使用当前EOA钱包登录
   */
  public async ensureBackendLogin(): Promise<void> {
    if (!this.eoaWallet) {
      throw new Error('本地未登录，请先登录');
    }

    // 动态导入authService以避免循环依赖
    const { authService } = await import('./auth');
    
    // 尝试确保后端登录
    await authService.ensureBackendLogin(this.eoaWallet);
  }

  /**
   * 检查是否已登录后端
   */
  public async isBackendLoggedIn(): Promise<boolean> {
    const { authService } = await import('./auth');
    return authService.isBackendLoggedIn();
  }
}

// 导出单例
export const aaService = new AccountAbstractionService(RPC_CONFIG.url);

