// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'
import ZkpTest from '../views/ZkpTest.vue'
import Wallet from '../views/Wallet.vue'
import AccountAbstraction from '../views/AccountAbstraction.vue'

// 首次进入与账户设置页面
import SplashScreen from '../views/onboarding/SplashScreen.vue'
import AccountChoice from '../views/onboarding/AccountChoice.vue'
import SignUp from '../views/onboarding/SignUp.vue'
import Login from '../views/onboarding/Login.vue'
import SetProtectionPin from '../views/onboarding/SetProtectionPin.vue'
import ImportAccount from '../views/onboarding/ImportAccount.vue'
import RecoverAccount from '../views/onboarding/RecoverAccount.vue'
import RecoverSetPassword from '../views/onboarding/RecoverSetPassword.vue'
import GuardianSetupGuide from '../views/onboarding/GuardianSetupGuide.vue'
import AddFamily from '../views/onboarding/AddFamily.vue'
import QRScanner from '../views/onboarding/QRScanner.vue'
import RecoveryProgress from '../views/onboarding/RecoveryProgress.vue'

// 核心日常使用页面
import Home from '../views/core/Home.vue'
import MedicationHistory from '../views/core/MedicationHistory.vue'
import WeeklySummary from '../views/core/WeeklySummary.vue'
import ProofDetail from '../views/core/ProofDetail.vue'

// 医药服务页面（医生端）
import CreateMedicationPlan from '../views/doctor/CreateMedicationPlan.vue'
import MedicationPlans from '../views/doctor/MedicationPlans.vue'
import PlanDetail from '../views/medication/PlanDetail.vue'
import PlanShare from '../views/medication/PlanShare.vue'
import SharedMedicationPlanDetail from '../views/medication/SharedMedicationPlanDetail.vue'

// 医药服务页面（老人端）
import MyMedicationPlans from '../views/elderly/MyMedicationPlans.vue'
import MedicationCheckIn from '../views/elderly/MedicationCheckIn.vue'
import RecordDetail from '../views/elderly/RecordDetail.vue'
import CheckinProofDetail from '../views/elderly/CheckinProofDetail.vue'

// 管理与配置页面
import Profile from '../views/management/Profile.vue'
import FamilyCircle from '../views/management/FamilyCircle.vue'
import RelationshipHub from '../views/management/RelationshipHub.vue'
import GroupDetail from '../views/management/GroupDetail.vue'
import Invitation from '../views/management/Invitation.vue'
import MyPatients from '../views/management/MyPatients.vue'
import AccountSecurity from '../views/management/AccountSecurity.vue'
import RecoveryRequest from '../views/management/RecoveryRequest.vue'
import Settings from '../views/management/Settings.vue'
import Notifications from '../views/management/Notifications.vue'
import GuardianSetup from '../views/management/GuardianSetup.vue'
import AccountMigration from '../views/management/AccountMigration.vue'
import TestMigration from '../views/TestMigration.vue'
import TestCenter from '../views/TestCenter.vue'
import CacheManager from '../views/CacheManager.vue'

const routes = [
  // 原有页面（保留用于开发测试）
  {
    path: '/dev',
    name: 'ZkpTest',
    component: ZkpTest
  },
  {
    path: '/dev/wallet',
    name: 'Wallet',
    component: Wallet
  },
  {
    path: '/dev/aa',
    name: 'AccountAbstraction',
    component: AccountAbstraction
  },

  // 首次进入与账户设置流程
  {
    path: '/',
    redirect: '/splash'
  },
  {
    path: '/splash',
    name: 'SplashScreen',
    component: SplashScreen
  },
  {
    path: '/account-choice',
    name: 'AccountChoice',
    component: AccountChoice
  },
  {
    path: '/signup',
    name: 'SignUp',
    component: SignUp
  },
  {
    path: '/login',
    name: 'Login',
    component: Login
  },
  {
    path: '/recover-account',
    name: 'RecoverAccount',
    component: RecoverAccount
  },
  {
    path: '/recover-set-password',
    name: 'RecoverSetPassword',
    component: RecoverSetPassword
  },
  {
    path: '/recovery-progress',
    name: 'RecoveryProgress',
    component: RecoveryProgress
  },
  {
    path: '/set-pin',
    name: 'SetProtectionPin',
    component: SetProtectionPin
  },
  {
    path: '/guardian-guide',
    name: 'GuardianSetupGuide',
    component: GuardianSetupGuide
  },
  {
    path: '/add-family',
    name: 'AddFamily',
    component: AddFamily
  },
  {
    path: '/qr-scanner',
    name: 'QRScanner',
    component: QRScanner
  },
  {
    path: '/import-account',
    name: 'ImportAccount',
    component: ImportAccount
  },

  // 核心日常使用
  {
    path: '/home',
    name: 'Home',
    component: Home
  },
  {
    path: '/medication-history',
    name: 'MedicationHistory',
    component: MedicationHistory
  },
  {
    path: '/weekly-summary',
    name: 'WeeklySummary',
    component: WeeklySummary,
    meta: { requiresAuth: true }
  },
  {
    path: '/proof-detail/:weekKey',
    name: 'ProofDetail',
    component: ProofDetail,
    meta: { requiresAuth: true }
  },
  // 医药服务（医生端）
  {
    path: '/doctor/create-medication-plan',
    name: 'CreateMedicationPlan',
    component: CreateMedicationPlan
  },
  {
    path: '/doctor/medication-plans',
    name: 'MedicationPlans',
    component: MedicationPlans
  },
  {
    path: '/medication/plan/:planId',
    name: 'PlanDetail',
    component: PlanDetail
  },
  {
    path: '/medication/plan/:planId/share',
    name: 'PlanShare',
    component: PlanShare
  },
  {
    path: '/shared-plan/:groupId/:planId',
    name: 'SharedMedicationPlanDetail',
    component: SharedMedicationPlanDetail
  },

  // 医药服务（老人端）
  {
    path: '/elderly/my-medication-plans',
    name: 'MyMedicationPlans',
    component: MyMedicationPlans
  },
  {
    path: '/elderly/medication-checkin',
    name: 'MedicationCheckIn',
    component: MedicationCheckIn
  },
  {
    path: '/record-detail/:recordId',
    name: 'RecordDetail',
    component: RecordDetail
  },
  {
    path: '/checkin-proof-detail',
    name: 'CheckinProofDetail',
    component: CheckinProofDetail,
    meta: { requiresAuth: true }
  },

  // 管理与配置
  {
    path: '/profile',
    name: 'Profile',
    component: Profile
  },
  {
    path: '/family-circle',
    name: 'FamilyCircle',
    component: FamilyCircle
  },
  {
    path: '/relationships',
    name: 'RelationshipHub',
    component: RelationshipHub
  },
  {
    path: '/group-detail/:groupId',
    name: 'GroupDetail',
    component: GroupDetail
  },
  {
    path: '/invitation',
    name: 'Invitation',
    component: Invitation
  },
  {
    path: '/my-patients',
    name: 'MyPatients',
    component: MyPatients
  },
  {
    path: '/account-security',
    name: 'AccountSecurity',
    component: AccountSecurity
  },
  {
    path: '/recovery-request',
    name: 'RecoveryRequest',
    component: RecoveryRequest,
    meta: { requiresAuth: true }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: Settings
  },
  {
    path: '/notifications',
    name: 'Notifications',
    component: Notifications
  },
  {
    path: '/guardian-setup',
    name: 'GuardianSetup',
    component: GuardianSetup
  },
  {
    path: '/account-migration',
    name: 'AccountMigration',
    component: AccountMigration
  },
  {
    path: '/test-migration',
    name: 'TestMigration',
    component: TestMigration
  },
  {
    path: '/test-center',
    name: 'TestCenter',
    component: TestCenter
  },
  {
    path: '/cache-manager',
    name: 'CacheManager',
    component: CacheManager
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router