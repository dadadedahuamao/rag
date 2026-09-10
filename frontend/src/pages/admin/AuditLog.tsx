import React, { useEffect, useMemo, useState } from 'react'
import { Table, Card, Input, DatePicker, Tag, App } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import dayjs, { type Dayjs } from 'dayjs'
import PageContainer from '../../components/PageContainer'
import { adminApi } from '../../api'
import { ApiError } from '../../api/http'
import type { AuditLog as AuditLogType } from '../../types'

const AuditLog: React.FC = () => {
  const [keyword, setKeyword] = useState('')
  const [range, setRange] = useState<[Dayjs | null, Dayjs | null] | null>(null)
  const [logs, setLogs] = useState<AuditLogType[]>([])
  const [loading, setLoading] = useState(true)
  const { message } = App.useApp()

  useEffect(() => {
    adminApi
      .auditLogs()
      .then(setLogs)
      .catch((e: ApiError) => message.error(e.message || '加载审计日志失败'))
      .finally(() => setLoading(false))
  }, [message])

  const columns = [
    { title: '用户', dataIndex: 'username', key: 'username', width: 120 },
    {
      title: '操作', dataIndex: 'action', key: 'action', width: 120,
      render: (v: string) => (
        <Tag style={{ background: '#eff6ff', color: '#2563eb', border: 'none', borderRadius: 4 }}>{v}</Tag>
      ),
    },
    { title: '资源路径', dataIndex: 'resource', key: 'resource', width: 220, render: (v: string) => <code style={{ fontSize: 12, background: '#f9fafb', padding: '2px 6px', borderRadius: 4 }}>{v}</code> },
    { title: 'IP 地址', dataIndex: 'ip', key: 'ip', width: 140 },
    { title: '时间', dataIndex: 'createdAt', key: 'createdAt', width: 180 },
  ]

  // 按关键词（用户名/操作）与日期区间过滤
  const filteredLogs = useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    const [start, end] = range || [null, null]
    return logs.filter((l) => {
      if (kw && !l.username.toLowerCase().includes(kw) && !l.action.toLowerCase().includes(kw)) {
        return false
      }
      if (start || end) {
        const created = dayjs(l.createdAt)
        if (start && created.isBefore(start.startOf('day'))) return false
        if (end && created.isAfter(end.endOf('day'))) return false
      }
      return true
    })
  }, [keyword, range, logs])

  return (
    <PageContainer title="审计日志" breadcrumb={[{ label: '系统管理' }, { label: '审计日志' }]}>
      <Card style={{ borderRadius: 12, border: '1px solid #eef1f5' }}>
        <div style={{ marginBottom: 16, display: 'flex', gap: 12 }}>
          <Input
            placeholder="搜索用户或操作"
            prefix={<SearchOutlined />}
            style={{ width: 240 }}
            allowClear
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          <DatePicker.RangePicker
            value={range as never}
            onChange={(v) => setRange(v as [Dayjs | null, Dayjs | null] | null)}
          />
        </div>
        <Table dataSource={filteredLogs.map((l) => ({ ...l, key: l.id }))} columns={columns} loading={loading} pagination={{ pageSize: 15, showTotal: (t) => `共 ${t} 条` }} size="middle" />
      </Card>
    </PageContainer>
  )
}

export default AuditLog
