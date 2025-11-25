# Health Guardian - Smart Medication Management System

<div align="center">

**Blockchain-based Smart Health Management Application**

[![Vue 3](https://img.shields.io/badge/Vue-3.5+-4FC08D?style=flat&logo=vue.js)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8+-3178C6?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-7.0+-646CFF?style=flat&logo=vite)](https://vitejs.dev/)
[![Capacitor](https://img.shields.io/badge/Capacitor-7.4+-119EFF?style=flat&logo=capacitor)](https://capacitorjs.com/)

[English](./README.md) • [中文文档](./README_CN.md) • [Complete Documentation](./PROJECT_DOCUMENTATION.md)

</div>

---

## 📖 Overview

**Health Guardian** is a smart medication management application designed for elderly users, integrating cutting-edge blockchain technology (ERC-4337 Account Abstraction), biometric authentication, and user-friendly UI design.

### Key Features

- 🔐 **Account Abstraction (ERC-4337)**: Smart contract-based accounts with social recovery
- 🔑 **Biometric Login**: Fingerprint/Face ID for quick and secure access
- 💊 **Smart Medication Management**: Personalized medication plans with intelligent reminders
- 👨‍👩‍👧‍👦 **Family Circle**: Remote monitoring by family members
- 🏥 **Hospital Integration**: Real identity verification with hospital systems
- 🎨 **Apple-style UI**: Elegant animations with accessibility features

---

## 🚀 Quick Start

### Prerequisites

- Node.js: 20.19+ or 22.12+
- npm/pnpm/yarn
- Android Studio (optional, for Android development)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd zk-app-mvp

# Install dependencies
npm install

# Configure backend IP (edit src/config/api.config.ts)
# const BACKEND_IP = 'YOUR_BACKEND_IP';

# Start development server
npm run dev
```

### Required Backend Services

| Service             | Port | Description           |
| ------------------- | ---- | --------------------- |
| User Info Service   | 5000 | Identity verification |
| Blockchain RPC      | 8545 | Ethereum local node   |
| Account Abstraction | 4337 | Bundler + Paymaster   |

---

## 📚 Documentation

### Core Documentation

- [Quick Start Guide](./doc/QUICK_START.md) - Get started quickly
- [Login/Signup Flow](./doc/login-signup-flow.md) - Detailed authentication flow
- [Database Schema](./doc/database-schema.md) - Database structure
- [API Documentation](./doc/api.md) - API reference
- [Biometric Login](./doc/biometric-auto-login.md) - Biometric authentication guide
- [Complete Documentation](./PROJECT_DOCUMENTATION.md) - Full project documentation

### Tech Stack

```
Frontend:     Vue 3.5+ (Composition API)
Build Tool:   Vite 7.0+
Language:     TypeScript 5.8+
Mobile:       Capacitor 7.4+
Blockchain:   ethers.js 6.15+, ERC-4337
ZK Proof:     snarkjs 0.7+
Biometric:    capacitor-native-biometric
```

---

## 🛠️ Development

### Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Type-Check, Compile and Minify for Production

```sh
npm run build
```

### Preview Production Build

```sh
npm run preview
```

### Build for Android

```sh
# Build web assets
npm run build

# Sync to Android
npx cap sync android

# Open in Android Studio
npx cap open android
```

---

## 📁 Project Structure

```
zk-app-mvp/
├── src/
│   ├── views/              # Page components
│   │   ├── onboarding/    # Login/signup flow
│   │   ├── core/          # Core features
│   │   └── management/    # Settings & management
│   ├── service/           # Business logic
│   ├── config/            # Configuration
│   └── router/            # Route configuration
├── android/               # Android native project
├── doc/                   # Documentation
└── package.json
```

---

## 🔐 Security Features

- ✅ **Password Encryption**: Using ethers.js, never stored in plain text
- ✅ **Biometric Security**: Hardware-level encryption (Android Keystore)
- ✅ **Blockchain Security**: Smart contract accounts with social recovery
- ✅ **Data Privacy**: ID number masking, HTTPS in production

---

## 🎨 UI/UX Design

**Design Style**: Apple-inspired fluid animations

**Key Principles**

- Elegant and minimal
- Smooth animations
- Accessibility-first (large fonts, high contrast)
- Responsive design

---

## 📊 Project Status

**Current Version**: v0.0.0

### Completed

- ✅ Login/Signup system with Apple-style UI
- ✅ Account Abstraction integration (ERC-4337)
- ✅ Biometric authentication
- ✅ Medication management
- ✅ Family circle features

### In Progress

- 🚧 Push notifications
- 🚧 Data analytics
- 🚧 Health report export

### Planned

- 📋 AI medication suggestions
- 📋 Voice interaction
- 📋 Doctor portal
- 📋 Multi-language support

---

## 🤝 Contributing

We welcome contributions! Please follow our coding standards:

- **TypeScript**: Use strict mode, avoid `any`
- **Vue**: Composition API with `<script setup>`
- **Commits**: Follow conventional commits (feat, fix, docs, etc.)

---

## 📄 License

This project is for educational and research purposes only.

---

## 📮 Contact

- Submit Issues: [GitHub Issues]
- Documentation: [doc/](./doc/)
- Full Documentation: [PROJECT_DOCUMENTATION.md](./PROJECT_DOCUMENTATION.md)

---

## Recommended IDE Setup

[VSCode](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

---

<div align="center">

**守护健康，让家人更安心** ❤️

Made with ❤️ by ZK-App Team

</div>
