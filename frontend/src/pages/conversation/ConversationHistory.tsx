import React, { useState, useEffect } from 'react'
import { Table, Button, Drawer, Typography, Card, App } from 'antd'
import { EyeOutlined } from '@ant-design/icons'
import PageContainer from '../../components/PageContainer'
import MessageBubble from '../../components/MessageBubble'
import { conversationApi } from '../../api'
import { ApiError } from '../../api/http'
import { hasPermission } from '../../utils/permission'
import type { Conversation } from '../../types'

const { Text } = Typography

const ConversationHistory: React.FC = () => {
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null)
  const [convs, setConvs] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const { message } = App.useApp()
  const isAdmin = hasPermission('admin')

  useEffect(() => {
    // 后端已按用户隔离（管理员看全部），前端直接展示返回结果
    conversationApi
      .list()
      .then(setConvs)
      .catch((e: ApiError) => message.error(e.message || '加载会话失败'))
      .finally(() => setLoading(false))
  }, [message])

  const openDetail = async (conv: Conversation) => {
    try {
      const full = await conversationApi.get(conv.id)
      setSelectedConv(full)
      setDetailOpen(true)
    } catch (e) {
      message.error((e as ApiError).message || '加载会话详情失败')
    }
  }

  const columns = [
    { title: '标题', dataIndex: 'title', key: 'title', render: (v: string) => <Text strong>{v}</Text> },
    { title: '知识库', dataIndex: 'kbName', key: 'kbName', width: 150 },
    ...(isAdmin ? [{ title: '用户ID', dataIndex: 'userId', key: 'userId', width: 100 }] : []),
    { title: '消息数', dataIndex: 'messageCount', key: 'messageCount', width: 80, align: 'center' as const },
    { title: '最后更新', dataIndex: 'updatedAt', key: 'updatedAt', width: 180 },
    {
      title: '操作', key: 'actions', width: 100,
      render: (_: unknown, r: Conversation) => (
        <Button type="link" icon={<EyeOutlined />} onClick={() => openDetail(r)}>查看</Button>
      ),
    },
  ]

  return (
    <PageContainer title="会话历史" breadcrumb={[{ label: '会话历史' }]}>
      <Card style={{ borderRadius: 12, border: '1px solid #eef1f5' }}>
        <Table
          dataSource={convs.map((c) => ({ ...c, key: c.id }))}
          columns={columns}
          loading={loading}
          pagination={{ pageSize: 15, showTotal: (t) => `共 ${t} 条` }}
          size="middle"
        />
      </Card>

      <Drawer
        title={`会话详情 - ${selectedConv?.title || ''}`}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        width={640}
      >
        {selectedConv?.messages?.map((m) => (
          <MessageBubble key={m.id} message={m} citationMode="tags" showRoleInMeta size="compact" />
        ))}
      </Drawer>
    </PageContainer>
  )
}

export default ConversationHistory
