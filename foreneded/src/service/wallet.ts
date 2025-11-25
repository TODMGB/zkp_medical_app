import { ethers } from 'ethers';
import { Preferences } from '@capacitor/preferences';
import { RPC_CONFIG } from '../config/api.config';
import { WALLET_KEYS } from '@/config/storage.config';

class EmbeddedWallet {
    // Ethers.js 的 Wallet 实例，包含公私钥对
    public wallet: ethers.Wallet | ethers.HDNodeWallet | null = null;

    // 钱包的公开地址
    public address: string | null = null;

    // 用于与以太坊网络交互的 Provider
    private provider: ethers.JsonRpcProvider;

    // RPC URL
    private rpcUrl: string;

    constructor(rpcUrl: string) {
        // 初始化时连接到一个以太坊节点 (例如 Infura, Alchemy 或本地节点)
        this.rpcUrl = rpcUrl;
        this.provider = new ethers.JsonRpcProvider(rpcUrl);
    }

    /**
     * 核心功能：初始化钱包
     * 尝试从手机安全存储中加载钱包，如果没有则创建一个新的。
     * @param password - 用于加密/解密存储在手机上的私钥的密码
     */
    public async init(password: string): Promise<void> {
        if (this.wallet) {
            console.log("钱包已初始化。");
            return;
        }

        try {
            const encryptedJson = await this.loadFromSecureStorage();
            if (encryptedJson) {
                console.log("从安全存储中发现加密钱包，正在解密...");
                this.wallet = await ethers.Wallet.fromEncryptedJson(encryptedJson, password);
                this.wallet = this.wallet.connect(this.provider);
                this.address = await this.wallet.getAddress();
                console.log("钱包解密并加载成功！地址:", this.address);
            } else {
                console.log("未发现现有钱包，正在创建新钱包...");
                await this.createAndSave(password);
            }
        } catch (error) {
            console.error("钱包初始化失败:", error);
            // 这里可以处理密码错误等情况
            throw new Error("密码错误或钱包数据已损坏。");
        }
    }

    /**
     * 1. 账户创建 (并安全保存)
     * @param password - 用于加密私钥的密码
     */
    public async createAndSave(password: string): Promise<void> {
        // 创建一个随机的新钱包
        this.wallet = ethers.Wallet.createRandom().connect(this.provider);
        this.address = await this.wallet.getAddress();
        console.log("新钱包创建成功！地址:", this.address);

        // 将新钱包的私钥加密为 JSON Keystore (v3 格式)
        console.log("正在加密并保存钱包...");
        const encryptedJson = await this.wallet.encrypt(password);

        // 使用 Capacitor 插件将其存入手机安全存储
        await Preferences.set({
            key: WALLET_KEYS.WALLET_STORAGE,
            value: encryptedJson,
        });
        console.log("钱包已安全保存到设备。");
    }

    /**
     * 从安全存储中加载加密的钱包数据
     */
    private async loadFromSecureStorage(): Promise<string | null> {
        const { value } = await Preferences.get({ key: WALLET_KEYS.WALLET_STORAGE });
        return value;
    }

    /**
     * 2. 通过私钥获得公私钥对 (恢复钱包)
     * 这个函数会创建一个钱包实例，但不会自动保存它
     * @param privateKey - 用户的私钥字符串
     */
    public async loadFromPrivateKey(privateKey: string): Promise<void> {
        try {
            this.wallet = new ethers.Wallet(privateKey, this.provider);
            this.address = await this.wallet.getAddress();
            console.log("通过私钥成功恢复钱包。地址:", this.address);
        } catch (error) {
            console.error("无效的私钥:", error);
            throw new Error("提供的私钥格式无效。");
        }
    }

    /**
     * 3. 交易
     * 发送一笔简单的 ETH 转账交易
     * @param to - 接收方地址
     * @param amountInEth - 以 ETH 为单位的金额 (字符串)
     */
    public async sendTransaction(to: string, amountInEth: string): Promise<ethers.TransactionResponse> {
        if (!this.wallet) {
            throw new Error("钱包未初始化！");
        }

        console.log(`准备发送 ${amountInEth} ETH 到 ${to}...`);
        const tx = {
            to: to,
            value: ethers.parseEther(amountInEth).toString(), // 将ETH金额转换为Wei
        };

        try {
            const txResponse = await this.wallet.sendTransaction(tx);
            console.log("交易已发送, 交易哈希:", txResponse.hash);
            this.recordTransaction(txResponse.hash); // 记录交易
            return txResponse;
        } catch (error) {
            console.error("交易发送失败:", error);
            throw error;
        }
    }

    /**
     * 4. 记录交易 (简化版)
     * 将交易哈希记录到本地存储中 (对于MVP来说足够了)
     * @param txHash - 交易哈希
     */
    private async recordTransaction(txHash: string): Promise<void> {
        const { value } = await Preferences.get({ key: 'transaction_history' });
        const history = value ? JSON.parse(value) : [];
        history.push({ hash: txHash, timestamp: Date.now() });
        await Preferences.set({
            key: 'transaction_history',
            value: JSON.stringify(history),
        });
    }

    /**
     * 签名消息 (额外但必要的功能)
     * @param message - 要签名的消息字符串
     */
    public async signMessage(message: string): Promise<string> {
        if (!this.wallet) {
            throw new Error("钱包未初始化！");
        }
        console.log("正在签名消息:", message);
        return this.wallet.signMessage(message);
    }

    /**
     * 检查钱包是否存在 (额外但必要的功能)
     */
    public async walletExists(): Promise<boolean> {
        const { value } = await Preferences.get({ key: WALLET_KEYS.WALLET_STORAGE });
        return value !== null;
    }

    // 获取账户余额
    public async getBalance(): Promise<string> {
        try {
            if (!this.wallet) {
                throw new Error("钱包未初始化！");
            }
            const balanceBigInt = await this.provider.getBalance(this.address!);
            return ethers.formatEther(balanceBigInt);
        } catch (e) {
            console.error("获取余额失败:", e);
            throw e;
        }
    }

    /** 获取当前的 RPC URL
     * @return {string} - 当前的 RPC URL
     */
    public getrpcurl(): string {
        return this.rpcUrl;
    }
}

// 导出一个单例，方便在整个Vue应用中使用
export const walletService = new EmbeddedWallet(RPC_CONFIG.url);