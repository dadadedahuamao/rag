import { getCurrentUser } from '../api/session'

/** 权限码 → 中文名映射（resource:action 格式） */
export const PERMISSION_LABELS: Record<string, string> = {
  'kb:manage': '知识库-管理',
  'kb:read': '知识库-查看',
  'document:upload': '文档-上传',
  'document:read': '文档-查看',
  'document:manage': '文档-管理',
  'qa:ask': '智能问答-提问',
  'eval:run': '评测-执行',
  'eval:read': '评测-查看',
  admin: '系统管理员',
}

/** 全部可配置权限（按资源分组，供角色编辑时勾选） */
export const PERMISSION_GROUPS: { group: string; items: string[] }[] = [
  { group: '知识库', items: ['kb:manage', 'kb:read'] },
  { group: '文档', items: ['document:upload', 'document:read', 'document:manage'] },
  { group: '智能问答', items: ['qa:ask'] },
  { group: '评测', items: ['eval:run', 'eval:read'] },
  { group: '系统', items: ['admin'] },
]

/** 获取权限码对应的中文名，未知权限码原样返回 */
export function getPermissionLabel(code: string): string {
  return PERMISSION_LABELS[code] ?? code
}

/** 获取当前登录用户的所有权限（后端 /me 已合并所有角色权限） */
export function getUserPermissions(): string[] {
  const user = getCurrentUser()
  if (!user) return []
  return user.permissions ?? []
}

/** 检查当前用户是否拥有指定权限 */
export function hasPermission(permission: string): boolean {
  return getUserPermissions().includes(permission)
}

/** 检查当前用户是否拥有任一指定权限 */
export function hasAnyPermission(permissions: string[]): boolean {
  const userPerms = getUserPermissions()
  return permissions.some((p) => userPerms.includes(p))
}

/** 检查当前用户是否拥有所有指定权限 */
export function hasAllPermissions(permissions: string[]): boolean {
  const userPerms = getUserPermissions()
  return permissions.every((p) => userPerms.includes(p))
}
