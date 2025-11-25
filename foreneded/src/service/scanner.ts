/**
 * 条码/二维码扫描服务
 * 使用 @capacitor/barcode-scanner
 * Android: ZXing（不需要Google Play Services）
 * iOS: AVFoundation（苹果原生）
 */

import { 
  CapacitorBarcodeScanner,
  CapacitorBarcodeScannerAndroidScanningLibrary,
  CapacitorBarcodeScannerTypeHintALLOption
} from '@capacitor/barcode-scanner';

class ScannerService {
  /**
   * 检查相机权限
   * 注意：@capacitor/barcode-scanner 不提供独立的权限检查方法
   * 权限会在扫描时自动请求
   */
  public async checkPermission(): Promise<{
    granted: boolean;
  }> {
    // 此包在扫描时会自动处理权限
    // 返回 true 表示支持扫描功能
    return { granted: true };
  }

  /**
   * 请求相机权限
   * 注意：权限会在首次扫描时自动请求
   */
  public async requestPermission(): Promise<boolean> {
    // 权限在首次调用 scanBarcode 时自动请求
    return true;
  }


  /**
   * 开始扫描
   */
  public async startScan(): Promise<string | null> {
    try {
      // 使用 ZXing 扫描库（Android）- 不需要 Google Play Services
      // iOS 使用 AVFoundation（苹果原生）
      console.log('开始扫描二维码...');
      
      const result = await CapacitorBarcodeScanner.scanBarcode({
        hint: CapacitorBarcodeScannerTypeHintALLOption.ALL, // 支持所有格式
        scanInstructions: '请对准二维码',
        android: {
          scanningLibrary: CapacitorBarcodeScannerAndroidScanningLibrary.ZXING // 使用 ZXing，不需要 Google 服务
        }
      });
      
      if (result && result.ScanResult) {
        console.log('扫描成功:', result.ScanResult);
        return result.ScanResult;
      }
      
      console.log('未扫描到二维码');
      return null;
    } catch (error: any) {
      console.error('扫描失败:', error);
      // 用户取消扫描不算错误
      if (error?.message?.includes('cancel') || error?.message?.includes('User cancelled')) {
        return null;
      }
      throw error;
    }
  }

  /**
   * 停止扫描
   * 注意：@capacitor/barcode-scanner 的 scanBarcode 是阻塞式的
   * 扫描完成或用户取消后会自动关闭，不需要手动停止
   */
  public async stopScan(): Promise<void> {
    // scanBarcode 方法是阻塞的，扫描完成后自动关闭
    // 这里保留方法是为了API兼容性
    console.debug('扫描已自动关闭');
  }

  /**
   * 打开设备设置（用于手动授权）
   * 注意：此包不提供此功能，但保留接口兼容性
   */
  public async openSettings(): Promise<void> {
    console.warn('@capacitor/barcode-scanner 不支持打开系统设置');
  }

  /**
   * 检查是否支持扫码功能
   */
  public async isSupported(): Promise<boolean> {
    // @capacitor/barcode-scanner 在 Android 和 iOS 上都原生支持
    // Android: ZXing，iOS: AVFoundation
    return true;
  }
}

export const scannerService = new ScannerService();
