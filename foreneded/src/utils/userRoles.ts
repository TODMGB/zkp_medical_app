/**
 * 用户角色工具类
 * 处理用户角色相关的逻辑
 */

// 用户角色枚举
export enum UserRole {
  ELDERLY = 'elderly',
  DOCTOR = 'doctor', 
  GUARDIAN = 'guardian',
  NURSE = 'nurse',
  HOSPITAL_ADMIN = 'hospital_admin'
}

// 角色显示名称映射
export const ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
  [UserRole.ELDERLY]: '老人',
  [UserRole.DOCTOR]: '医生',
  [UserRole.GUARDIAN]: '家属/监护人',
  [UserRole.NURSE]: '护士',
  [UserRole.HOSPITAL_ADMIN]: '医院管理员'
};

// 角色权限映射
export const ROLE_PERMISSIONS = {
  [UserRole.ELDERLY]: {
    canCreateAccessGroup: true,
    canInviteMembers: true,
    canViewOwnData: true,
    canManageInvitations: true,
  },
  [UserRole.DOCTOR]: {
    canViewPatientData: true,
    canCreateMedicalRecords: true,
    canPrescribeMedication: true,
    canAccessMedicalHistory: true,
  },
  [UserRole.GUARDIAN]: {
    canViewElderlyData: true,
    canReceiveNotifications: true,
    canManageEmergencyContacts: true,
  },
  [UserRole.NURSE]: {
    canViewPatientData: true,
    canUpdateVitalSigns: true,
    canManageMedication: true,
  },
  [UserRole.HOSPITAL_ADMIN]: {
    canManageHospitalData: true,
    canViewReports: true,
    canManageStaff: true,
  }
};

/**
 * 用户角色工具类
 */
export class UserRoleUtils {
  /**
   * 获取角色显示名称
   */
  static getRoleDisplayName(role: string): string {
    return ROLE_DISPLAY_NAMES[role as UserRole] || role;
  }

  /**
   * 检查用户是否有特定角色
   */
  static hasRole(userRoles: string[], targetRole: UserRole): boolean {
    return userRoles.includes(targetRole);
  }

  /**
   * 检查用户是否有任一角色
   */
  static hasAnyRole(userRoles: string[], targetRoles: UserRole[]): boolean {
    return targetRoles.some(role => userRoles.includes(role));
  }

  /**
   * 检查用户是否有所有角色
   */
  static hasAllRoles(userRoles: string[], targetRoles: UserRole[]): boolean {
    return targetRoles.every(role => userRoles.includes(role));
  }

  /**
   * 获取用户的主要角色（第一个角色）
   */
  static getPrimaryRole(userRoles: string[]): UserRole | null {
    return userRoles.length > 0 ? userRoles[0] as UserRole : null;
  }

  /**
   * 检查用户是否可以创建访问组
   */
  static canCreateAccessGroup(userRoles: string[]): boolean {
    return this.hasRole(userRoles, UserRole.ELDERLY);
  }

  /**
   * 检查用户是否可以邀请成员
   */
  static canInviteMembers(userRoles: string[]): boolean {
    return this.hasRole(userRoles, UserRole.ELDERLY);
  }

  /**
   * 检查用户是否可以查看患者数据
   */
  static canViewPatientData(userRoles: string[]): boolean {
    return this.hasAnyRole(userRoles, [UserRole.DOCTOR, UserRole.NURSE, UserRole.GUARDIAN]);
  }

  /**
   * 格式化角色列表为显示文本
   */
  static formatRolesForDisplay(userRoles: string[]): string {
    return userRoles
      .map(role => this.getRoleDisplayName(role))
      .join('、');
  }

  /**
   * 获取角色对应的图标
   */
  static getRoleIcon(role: string): string {
    switch (role as UserRole) {
      case UserRole.ELDERLY:
        return '👴';
      case UserRole.DOCTOR:
        return '👨‍⚕️';
      case UserRole.GUARDIAN:
        return '👨‍👩‍👧‍👦';
      case UserRole.NURSE:
        return '👩‍⚕️';
      case UserRole.HOSPITAL_ADMIN:
        return '👨‍💼';
      default:
        return '👤';
    }
  }
}
