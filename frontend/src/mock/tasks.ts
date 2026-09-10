import type { TaskItem } from '../types'

export const tasks: TaskItem[] = [
  { taskId: 'celery-001', type: '文档索引', target: '新版假期政策（草案）.docx', state: 'PROGRESS', progress: 65, retryCount: 0, message: '正在向量化中...', createdAt: '2026-07-24 09:00:00' },
  { taskId: 'celery-002', type: '文档索引', target: '报销单模板说明.html', state: 'PROGRESS', progress: 82, retryCount: 0, message: '正在向量化中...', createdAt: '2026-07-24 10:30:00' },
  { taskId: 'celery-003', type: '文档索引', target: '考勤管理办法 v3.2.pdf', state: 'SUCCESS', progress: 100, retryCount: 0, message: '索引完成', createdAt: '2026-07-22 14:31:00' },
  { taskId: 'celery-004', type: '重建索引', target: '产品 A 用户手册 v4.0.pdf', state: 'SUCCESS', progress: 100, retryCount: 0, message: '重建索引完成', createdAt: '2026-07-23 10:00:00' },
  { taskId: 'celery-005', type: '文档索引', target: '外派人员考勤.pdf', state: 'FAILURE', progress: 42, retryCount: 3, message: 'PDF 解析失败：格式损坏', createdAt: '2026-07-24 08:05:00' },
  { taskId: 'celery-006', type: '文档索引', target: '数据库设计规范.pdf', state: 'SUCCESS', progress: 100, retryCount: 0, message: '索引完成', createdAt: '2026-07-18 15:00:00' },
  { taskId: 'celery-007', type: '批量评测', target: '技术规范数据集', state: 'SUCCESS', progress: 100, retryCount: 0, message: '评测完成', createdAt: '2026-07-21 17:00:00' },
  { taskId: 'celery-008', type: '批量评测', target: '产品手册质量验证', state: 'PROGRESS', progress: 45, retryCount: 0, message: '第 3/8 批次执行中...', createdAt: '2026-07-24 11:00:00' },
  { taskId: 'celery-009', type: '文档索引', target: '前端 React 编码规范.md', state: 'SUCCESS', progress: 100, retryCount: 0, message: '索引完成', createdAt: '2026-07-20 13:00:00' },
  { taskId: 'celery-010', type: '文档索引', target: '微服务架构评审模板.docx', state: 'PENDING', progress: 0, retryCount: 0, message: '等待执行', createdAt: '2026-07-24 11:15:00' },
]
