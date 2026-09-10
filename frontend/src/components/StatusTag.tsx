import React from 'react'
import { Tag } from 'antd'
import type { DocStatus, TaskState } from '../types'

interface StatusTagProps {
  type: DocStatus | TaskState | '通过' | '未达标' | 'active' | 'disabled'
}

const colorMap: Record<string, string> = {
  ready: '#ecfdf5',
  indexing: '#eff6ff',
  failed: '#fef2f2',
  PENDING: '#f9fafb',
  STARTED: '#eff6ff',
  PROGRESS: '#eff6ff',
  SUCCESS: '#ecfdf5',
  FAILURE: '#fef2f2',
  '通过': '#ecfdf5',
  '未达标': '#fff7ed',
  active: '#ecfdf5',
  disabled: '#f2f4f7',
}

const textColorMap: Record<string, string> = {
  ready: '#16a34a',
  indexing: '#2563eb',
  failed: '#dc2626',
  PENDING: '#667085',
  STARTED: '#2563eb',
  PROGRESS: '#2563eb',
  SUCCESS: '#16a34a',
  FAILURE: '#dc2626',
  '通过': '#16a34a',
  '未达标': '#d97706',
  active: '#16a34a',
  disabled: '#667085',
}

const labelMap: Record<string, string> = {
  ready: '就绪',
  indexing: '索引中',
  failed: '失败',
  PENDING: '等待中',
  STARTED: '已启动',
  PROGRESS: '进行中',
  SUCCESS: '成功',
  FAILURE: '失败',
  '通过': '通过',
  '未达标': '未达标',
  active: '启用',
  disabled: '禁用',
}

const StatusTag: React.FC<StatusTagProps> = ({ type }) => {
  return (
    <Tag
      style={{
        background: colorMap[type] || '#f9fafb',
        color: textColorMap[type] || '#667085',
        border: 'none',
        borderRadius: 6,
        padding: '2px 10px',
        fontSize: 12,
        fontWeight: 500,
      }}
    >
      {labelMap[type] || type}
    </Tag>
  )
}

export default StatusTag
