// 登录会话管理：token 与当前用户持久化（localStorage）。
// 取代原 mock/users 的 getCurrentUser/setCurrentUser 语义。
import type { User } from '../types'

/** 后端 /auth/me 返回的用户额外带有合并后的权限码列表 */
export interface SessionUser extends User {
  permissions: string[]
}

const TOKEN_KEY = 'rag_token'
const REFRESH_KEY = 'rag_refresh_token'
const USER_KEY = 'rag_current_user'

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function getRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH_KEY)
  } catch {
    return null
  }
}

export function getCurrentUser(): SessionUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as SessionUser) : null
  } catch {
    return null
  }
}

/** 保存登录态：token + refreshToken + 用户对象 */
export function setSession(token: string, refreshToken: string, user: SessionUser): void {
  try {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(REFRESH_KEY, refreshToken)
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  } catch {
    // 忽略存储异常（如隐私模式）
  }
}

/** 仅更新当前用户对象（如刷新 /me 后） */
export function setCurrentUser(user: SessionUser | null): void {
  try {
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user))
    } else {
      localStorage.removeItem(USER_KEY)
    }
  } catch {
    // 忽略
  }
}

/** 清空登录态（登出或 token 失效时调用） */
export function clearSession(): void {
  try {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_KEY)
    localStorage.removeItem(USER_KEY)
  } catch {
    // 忽略
  }
}

export function isLoggedIn(): boolean {
  return !!getToken() && !!getCurrentUser()
}
