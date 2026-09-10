// HTTP 客户端：统一封装 fetch，自动附带 token、解包 {code,message,data}、处理 401。
import { getToken, clearSession } from './session'

const BASE = '/api'

export interface ApiErrorShape {
  code: number
  message: string
  status: number
}

/** 业务错误：非 0 code 或 HTTP 错误时抛出 */
export class ApiError extends Error {
  code: number
  status: number
  constructor(message: string, code: number, status: number) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
  }
}

function authHeaders(): Record<string, string> {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

/** 401 时清理登录态并跳转登录页 */
function handleUnauthorized() {
  clearSession()
  if (!location.pathname.startsWith('/login')) {
    location.href = '/login'
  }
}

interface RequestOptions {
  method?: string
  body?: unknown
  /** 传 FormData 时不设置 JSON 头 */
  isForm?: boolean
  signal?: AbortSignal
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, isForm = false, signal } = opts
  const headers: Record<string, string> = { ...authHeaders() }
  let payload: BodyInit | undefined

  if (body !== undefined) {
    if (isForm) {
      payload = body as FormData
    } else {
      headers['Content-Type'] = 'application/json'
      payload = JSON.stringify(body)
    }
  }

  let resp: Response
  try {
    resp = await fetch(BASE + path, { method, headers, body: payload, signal })
  } catch (e) {
    throw new ApiError('网络请求失败，请检查后端服务是否启动', -1, 0)
  }

  if (resp.status === 401) {
    handleUnauthorized()
    throw new ApiError('登录已失效，请重新登录', 1, 401)
  }

  let json: { code: number; message: string; data: T } | null = null
  try {
    json = await resp.json()
  } catch {
    throw new ApiError(`服务器返回异常（HTTP ${resp.status}）`, 1, resp.status)
  }

  if (!json) {
    throw new ApiError(`服务器无响应体（HTTP ${resp.status}）`, 1, resp.status)
  }

  if (json.code !== 0) {
    throw new ApiError(json.message || '请求失败', json.code, resp.status)
  }

  return json.data
}

export const http = {
  get: <T>(path: string, signal?: AbortSignal) => request<T>(path, { method: 'GET', signal }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body }),
  del: <T>(path: string, body?: unknown) => request<T>(path, { method: 'DELETE', body }),
  postForm: <T>(path: string, form: FormData) =>
    request<T>(path, { method: 'POST', body: form, isForm: true }),
}

export { BASE as API_BASE, authHeaders }
