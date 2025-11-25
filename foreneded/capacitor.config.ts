import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.app',
  appName: 'zk-app-mvp',
  webDir: 'dist',
  server: {
    androidScheme: 'http'
  },
  plugins: {
    BarcodeScanner: {
      // 使用bundled模式，不需要下载Google Barcode Scanner模块
      googleBarcodeScannerModuleInstallState: 2, // 2 = INSTALLED
      googleBarcodeScannerModuleInstallProgress: 0
    }
  }
};

export default config;
