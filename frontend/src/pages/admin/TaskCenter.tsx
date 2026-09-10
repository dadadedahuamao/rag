import React, { useEffect, useState } from 'react'
import { Table, Card, Progress, Button, App } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import PageContainer from '../../components/PageContainer'
import StatusTag from '../../components/StatusTag'
import { taskApi } from '../../api'
import { ApiError } from '../../api/http'
import type { TaskItem } from '../../types'

const TaskCenter: React.FC = () => {
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [loading, setLoading] = useState(true)
  const { message } = App.useApp()

  const load = () => {
    setLoading(true)
    taskApi
      .list()
      .then(setTasks)
      .catch((e: ApiError) => message.error(e.message || '加载任务失败'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleRetry = async (taskId: string) => {
    try {
      await taskApi.retry(taskId)
      message.success('已重新提交任务')
      load()
    } catch (e) {
      message.error((e as ApiError).message || '重试失败')
    }
  }

  const columns = [
    { title: '任务ID', dataIndex: 'taskId', key: 'taskId', width: 150, render: (v: string) => <code style={{ fontSize: 12, background: '#f9fafb', padding: '2px 6px', borderRadius: 4 }}>{v}</code> },
    { title: '类型', dataIndex: 'type', key: 'type', width: 100 },
    { title: '目标', dataIndex: 'target', key: 'target' },
    { title: '状态', dataIndex: 'state', key: 'state', width: 90, render: (v: TaskItem['state']) => <StatusTag type={v} /> },
    {
      title: '进度', dataIndex: 'progress', key: 'progress', width: 150,
      render: (p: number) => <Progress percent={p} size="small" />,
    },
    { title: '重试', dataIndex: 'retryCount', key: 'retryCount', width: 60 },
    { title: '消息', dataIndex: 'message', key: 'message', width: 200, ellipsis: true },
    { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 170 },
    {
      title: '操作', key: 'actions', width: 90, fixed: 'right' as const,
      render: (_: unknown, r: TaskItem) =>
        r.state === 'FAILURE' ? (
          <Button type="link" size="small" icon={<ReloadOutlined />} onClick={() => handleRetry(r.taskId)}>重试</Button>
        ) : null,
    },
  ]

  return (
    <PageContainer title="任务中心" breadcrumb={[{ label: '系统管理' }, { label: '任务中心' }]} extra={
      <Button icon={<ReloadOutlined />} onClick={load}>刷新</Button>
    }>
      <Card style={{ borderRadius: 12, border: '1px solid #eef1f5' }}>
        <Table
          dataSource={tasks.map((t) => ({ ...t, key: t.taskId }))}
          columns={columns}
          loading={loading}
          pagination={{ pageSize: 15, showTotal: (t) => `共 ${t} 条` }}
          size="middle"
          scroll={{ x: 1200 }}
        />
      </Card>
    </PageContainer>
  )
}

export default TaskCenter
