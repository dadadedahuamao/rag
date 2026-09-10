// 与功能架构设计书数据模型对齐的前端类型定义

export type Visibility = 'public' | 'department' | 'private'
export type DocStatus = 'ready' | 'indexing' | 'failed'
export type AccessLevel = 'read' | 'write'
export type UserStatus = 'active' | 'disabled'
export type TaskState = 'PENDING' | 'STARTED' | 'PROGRESS' | 'SUCCESS' | 'FAILURE'

export interface Role {
  id: number
  name: string
  description: string
  permissions: string[] // resource:action
}

export interface User {
  id: number
  username: string
  email: string
  status: UserStatus
  roles: string[]
  lastLogin: string
}

export interface KnowledgeBase {
  id: number
  name: string
  description: string
  visibility: Visibility
  ownerName: string
  docCount: number
  chunkCount: number
  updatedAt: string
}

export interface KbMember {
  userId: number
  username: string
  roleName: string
  accessLevel: AccessLevel
}

export interface Chunk {
  id: string
  chunkIndex: number
  titlePath: string
  content: string
  sourcePage: number
  permissionTags: string[]
}

export interface DocumentItem {
  id: number
  kbId: number
  title: string
  fileType: 'PDF' | 'Word' | 'Markdown' | 'TXT' | 'HTML'
  status: DocStatus
  permissionTags: string[]
  chunkCount: number
  sizeKb: number
  progress?: number
  updatedAt: string
}

export interface Citation {
  docId: number
  title: string
  page: number
  snippet: string
}

export interface Message {
  id: number
  role: 'user' | 'assistant'
  content: string
  citations?: Citation[]
  createdAt: string
}

export interface Conversation {
  id: number
  userId: number
  title: string
  kbId: number
  kbName: string
  messageCount: number
  updatedAt: string
  messages: Message[]
}

export interface TaskItem {
  taskId: string
  type: '文档索引' | '重建索引' | '批量评测'
  target: string
  state: TaskState
  progress: number
  retryCount: number
  message: string
  createdAt: string
}

export interface EvalRun {
  id: number
  dataset: string
  kbName: string
  faithfulness: number
  answerRelevancy: number
  contextPrecision: number
  contextRecall: number
  status: '通过' | '未达标'
  createdAt: string
}

export interface AuditLog {
  id: number
  username: string
  action: string
  resource: string
  ip: string
  createdAt: string
}
