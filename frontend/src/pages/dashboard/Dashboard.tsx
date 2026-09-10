import React, { useEffect, useState } from 'react'
import { Row, Col, Card, Table, Typography, Progress, Spin, App } from 'antd'
import {
  BookOutlined,
  FileTextOutlined,
  MessageOutlined,
} from '@ant-design/icons'
import PageContainer from '../../components/PageContainer'
import StatCard from '../../components/StatCard'
import { dashboardApi } from '../../api'
import type { DashboardStats } from '../../api'
import { ApiError } from '../../api/http'

const { Text } = Typography

const Dashboard: React.FC = () => {
  const { message } = App.useApp()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats | null>(null)

  useEffect(() => {
    dashboardApi
      .stats()
      .then(setStats)
      .catch((e: ApiError) => message.error(e.message || '加载概览数据失败'))
      .finally(() => setLoading(false))
  }, [message])

  const totalDocs = stats?.totalDocs ?? 0
  const totalKBs = stats?.totalKbs ?? 0
  const todayQAs = stats?.todayQAs ?? 0
  const readonlyDocs = stats?.readyDocs ?? 0
  const failedDocs = stats?.failedDocs ?? 0

  const recentConvs = (stats?.recentConversations ?? []).map((c) => ({
    key: c.id,
    title: c.title,
    kb: c.kbName,
    msgs: c.messageCount,
    time: c.updatedAt,
  }))

  const runningTasks = stats?.runningTasks ?? []

  return (
    <PageContainer title="概览" breadcrumb={[{ label: '概览' }]}>
      <Spin spinning={loading}>
      <Row gutter={[20, 20]} className="stagger">
        <Col xs={24} sm={12} lg={8}>
          <StatCard icon={<BookOutlined />} label="知识库总数" value={totalKBs} color="#2563eb" bgColor="#eff6ff" />
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <StatCard icon={<FileTextOutlined />} label="文档总数 (就绪/失败)" value={`${totalDocs} (${readonlyDocs}/${failedDocs})`} color="#16a34a" bgColor="#ecfdf5" />
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <StatCard icon={<MessageOutlined />} label="今日问答次数" value={todayQAs} color="#d97706" bgColor="#fff7ed" />
        </Col>
      </Row>

      <Row gutter={[20, 20]} style={{ marginTop: 20 }}>
        <Col xs={24} lg={14}>
          <Card title="最近会话" style={{ borderRadius: 12, border: '1px solid #eef1f5' }}>
            <Table
              dataSource={recentConvs}
              columns={[
                { title: '标题', dataIndex: 'title', key: 'title' },
                { title: '知识库', dataIndex: 'kb', key: 'kb' },
                { title: '消息数', dataIndex: 'msgs', key: 'msgs', width: 80 },
                { title: '时间', dataIndex: 'time', key: 'time', width: 180 },
              ]}
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title="进行中的任务" style={{ borderRadius: 12, border: '1px solid #eef1f5' }}>
            {runningTasks.length === 0 ? (
              <Text style={{ color: '#667085' }}>暂无运行中的任务</Text>
            ) : (
              runningTasks.map((t) => (
                <div key={t.taskId} style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ fontSize: 13 }}>{t.target}</Text>
                    <Text style={{ fontSize: 12, color: '#667085' }}>{t.progress}%</Text>
                  </div>
                  <Progress percent={t.progress} size="small" status={t.state === 'FAILURE' ? 'exception' : 'active'} />
                </div>
              ))
            )}
          </Card>
        </Col>
      </Row>
      </Spin>
    </PageContainer>
  )
}

export default Dashboard
