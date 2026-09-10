import type { User, Role } from '../types'

export const roles: Role[] = [
  {
    id: 1,
    name: '系统管理员',
    description: '全量系统权限，可管理所有知识库、用户与系统配置',
    permissions: [
      'kb:manage',
      'kb:read',
      'document:upload',
      'document:read',
      'document:manage',
      'qa:ask',
      'eval:run',
      'eval:read',
      'admin',
    ],
  },
  {
    id: 2,
    name: '知识库管理员',
    description: '管理指定知识库及其文档，拥有读写权限',
    permissions: [
      'kb:manage',
      'kb:read',
      'document:upload',
      'document:read',
      'document:manage',
      'qa:ask',
    ],
  },
  {
    id: 3,
    name: '普通用户',
    description: '问答与只读权限',
    permissions: ['kb:read', 'document:read', 'qa:ask'],
  },
]

export const users: User[] = [
  { id: 1, username: 'admin', email: 'admin@company.com', status: 'active', roles: ['系统管理员'], lastLogin: '2026-07-24 09:15:00' },
  { id: 2, username: 'zhangsan', email: 'zhangsan@company.com', status: 'active', roles: ['知识库管理员'], lastLogin: '2026-07-24 08:42:00' },
  { id: 3, username: 'lisi', email: 'lisi@company.com', status: 'active', roles: ['普通用户'], lastLogin: '2026-07-23 17:30:00' },
  { id: 4, username: 'wangwu', email: 'wangwu@company.com', status: 'active', roles: ['知识库管理员'], lastLogin: '2026-07-23 16:10:00' },
  { id: 5, username: 'zhaoliu', email: 'zhaoliu@company.com', status: 'disabled', roles: ['普通用户'], lastLogin: '2026-06-15 11:00:00' },
  { id: 6, username: 'sunqi', email: 'sunqi@company.com', status: 'active', roles: ['普通用户'], lastLogin: '2026-07-24 07:55:00' },
  { id: 7, username: 'zhouba', email: 'zhouba@company.com', status: 'active', roles: ['知识库管理员', '普通用户'], lastLogin: '2026-07-24 10:01:00' },
]

// 动态当前用户（登录后可切换）
// 从 localStorage 恢复，避免刷新后登录态丢失导致守卫误跳登录页
const STORAGE_KEY = 'rag_current_user'

function restoreUser(): User | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as User) : null
  } catch {
    return null
  }
}

let _currentUser: User | null = restoreUser()

export function getCurrentUser(): User | null {
  return _currentUser
}

export function setCurrentUser(user: User | null): void {
  _currentUser = user
  // Mock 阶段直接持久化整个用户对象；接后端时应仅存 token
  try {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  } catch {
    // 忽略存储异常（如隐私模式）
  }
}

// 登录结果：区分「凭证错误」与「账号被禁用」
export type AuthResult =
  | { ok: true; user: User }
  | { ok: false; reason: 'invalid' | 'disabled' }

export function authUser(username: string, password: string): AuthResult {
  // 模拟登录，任意非空密码通过
  if (password.length === 0) return { ok: false, reason: 'invalid' }
  const u = users.find((usr) => usr.username === username)
  if (!u) return { ok: false, reason: 'invalid' }
  // 被禁用的账号不允许登录
  if (u.status !== 'active') return { ok: false, reason: 'disabled' }
  return { ok: true, user: u }
}
