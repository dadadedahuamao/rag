import type { AuditLog } from '../types'

export const auditLogs: AuditLog[] = [
  { id: 1, username: 'admin', action: '用户登录', resource: '/api/auth/login', ip: '192.168.1.100', createdAt: '2026-07-24 11:00:00' },
  { id: 2, username: 'zhangsan', action: '文档上传', resource: '/api/kb/1/documents', ip: '192.168.1.101', createdAt: '2026-07-24 09:00:00' },
  { id: 3, username: 'admin', action: '创建知识库', resource: '/api/kb', ip: '192.168.1.100', createdAt: '2026-07-23 14:00:00' },
  { id: 4, username: 'wangwu', action: '删除文档', resource: '/api/documents/108', ip: '192.168.1.102', createdAt: '2026-07-24 08:05:00' },
  { id: 5, username: 'zhangsan', action: '权限变更', resource: '/api/kb/1/members', ip: '192.168.1.101', createdAt: '2026-07-23 15:30:00' },
  { id: 6, username: 'lisi', action: '问答请求', resource: '/api/qa/stream', ip: '192.168.1.103', createdAt: '2026-07-24 10:29:00' },
  { id: 7, username: 'sunqi', action: '文档查看', resource: '/api/kb/5/documents', ip: '192.168.1.104', createdAt: '2026-07-24 10:00:00' },
  { id: 8, username: 'admin', action: '系统配置修改', resource: '/api/admin/config', ip: '192.168.1.100', createdAt: '2026-07-22 16:00:00' },
  { id: 9, username: 'zhouba', action: '用户登录', resource: '/api/auth/login', ip: '192.168.1.105', createdAt: '2026-07-24 11:10:00' },
  { id: 10, username: 'wangwu', action: '重建索引', resource: '/api/documents/201/reindex', ip: '192.168.1.102', createdAt: '2026-07-23 10:00:00' },
  { id: 11, username: 'lisi', action: '问答请求', resource: '/api/qa/stream', ip: '192.168.1.103', createdAt: '2026-07-24 10:30:00' },
  { id: 12, username: 'zhangsan', action: '评测触发', resource: '/api/eval/runs', ip: '192.168.1.101', createdAt: '2026-07-24 11:00:00' },
]
