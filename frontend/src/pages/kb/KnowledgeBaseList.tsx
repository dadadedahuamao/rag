import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Row, Col, Card, Button, Tag, Modal, Form, Input, Select, Table, Drawer, App, Typography, Tooltip, Spin, InputNumber, Space, Empty } from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import PageContainer from '../../components/PageContainer'
import { kbApi } from '../../api'
import { ApiError } from '../../api/http'
import { hasPermission } from '../../utils/permission'
import type { KnowledgeBase, KbMember, Visibility } from '../../types'

const { Text } = Typography

const visibilityMap: Record<Visibility, string> = { public: '公开', department: '部门', private: '私有' }
const visibilityColor: Record<Visibility, string> = { public: '#ecfdf5', department: '#eff6ff', private: '#f9fafb' }
const visibilityTextColor: Record<Visibility, string> = { public: '#16a34a', department: '#2563eb', private: '#667085' }

const KnowledgeBaseList: React.FC = () => {
  const navigate = useNavigate()
  const [kbs, setKbs] = useState<KnowledgeBase[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<KnowledgeBase | null>(null)
  const [memberOpen, setMemberOpen] = useState(false)
  const [selectedKb, setSelectedKb] = useState<KnowledgeBase | null>(null)
  const [members, setMembers] = useState<KbMember[]>([])
  const [memberLoading, setMemberLoading] = useState(false)
  const [form] = Form.useForm()
  const [memberForm] = Form.useForm()
  const { message, modal } = App.useApp()
  const canManage = hasPermission('kb:manage')

  const loadKbs = () => {
    setLoading(true)
    kbApi
      .list()
      .then(setKbs)
      .catch((e: ApiError) => message.error(e.message || '加载知识库失败'))
      .finally(() => setLoading(false))
  }

  useEffect(loadKbs, [])

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    setModalOpen(true)
  }

  const openEdit = (kb: KnowledgeBase) => {
    setEditing(kb)
    form.setFieldsValue({ name: kb.name, description: kb.description, visibility: kb.visibility })
    setModalOpen(true)
  }

  const handleSave = () => {
    form.validateFields().then(async (values) => {
      setSaving(true)
      try {
        if (editing) {
          await kbApi.update(editing.id, values)
          message.success('知识库已更新')
        } else {
          await kbApi.create(values)
          message.success('知识库已创建')
        }
        setModalOpen(false)
        loadKbs()
      } catch (e) {
        message.error((e as ApiError).message || '保存失败')
      } finally {
        setSaving(false)
      }
    })
  }

  const handleDelete = (kb: KnowledgeBase) => {
    modal.confirm({
      title: '确认删除',
      content: `确定要删除知识库「${kb.name}」吗？此操作将级联删除其文档与索引，不可恢复。`,
      okText: '确认删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        try {
          await kbApi.remove(kb.id)
          message.success('知识库已删除')
          loadKbs()
        } catch (e) {
          message.error((e as ApiError).message || '删除失败')
        }
      },
    })
  }

  const openMembers = (kb: KnowledgeBase) => {
    setSelectedKb(kb)
    setMemberOpen(true)
    memberForm.resetFields()
    setMemberLoading(true)
    kbApi
      .listMembers(kb.id)
      .then(setMembers)
      .catch((e: ApiError) => message.error(e.message || '加载成员失败'))
      .finally(() => setMemberLoading(false))
  }

  const handleAddMember = () => {
    if (!selectedKb) return
    memberForm.validateFields().then(async (values: { userId: number; accessLevel: string }) => {
      try {
        await kbApi.addMember(selectedKb.id, values.userId, values.accessLevel)
        message.success('成员已保存')
        memberForm.resetFields()
        const list = await kbApi.listMembers(selectedKb.id)
        setMembers(list)
      } catch (e) {
        message.error((e as ApiError).message || '添加成员失败')
      }
    })
  }

  const handleRemoveMember = async (userId: number) => {
    if (!selectedKb) return
    try {
      await kbApi.removeMember(selectedKb.id, userId)
      message.success('成员已移除')
      setMembers((prev) => prev.filter((m) => m.userId !== userId))
    } catch (e) {
      message.error((e as ApiError).message || '移除失败')
    }
  }

  return (
    <PageContainer title="知识库管理" breadcrumb={[{ label: '知识库管理' }]} extra={
      canManage ? <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新建知识库</Button> : null
    }>
      <Spin spinning={loading}>
      {!loading && kbs.length === 0 ? (
        <Empty description="暂无可见的知识库" />
      ) : (
      <Row gutter={[16, 16]}>
        {kbs.map((kb) => (
          <Col xs={24} sm={12} lg={8} key={kb.id}>
            <Card
              className="hover-lift"
              hoverable
              style={{ borderRadius: 12, border: '1px solid #eef1f5', height: '100%', cursor: 'pointer' }}
              onClick={() => navigate(`/documents?kbId=${kb.id}`)}
              actions={canManage ? [
                <Tooltip title="编辑" key="edit"><EditOutlined onClick={(e) => { e.stopPropagation(); openEdit(kb) }} /></Tooltip>,
                <Tooltip title="成员管理" key="member"><TeamOutlined onClick={(e) => { e.stopPropagation(); openMembers(kb) }} /></Tooltip>,
                <Tooltip title="删除" key="delete"><DeleteOutlined style={{ color: '#dc2626' }} onClick={(e) => { e.stopPropagation(); handleDelete(kb) }} /></Tooltip>,
              ] : undefined}
            >
              <div style={{ marginBottom: 12 }}>
                <Text strong style={{ fontSize: 16, display: 'block', marginBottom: 6 }}>{kb.name}</Text>
                <Text style={{ fontSize: 13, color: '#667085', display: 'block', marginBottom: 10, minHeight: 36 }}>
                  {kb.description}
                </Text>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Tag style={{
                  background: visibilityColor[kb.visibility],
                  color: visibilityTextColor[kb.visibility],
                  border: 'none', borderRadius: 6, padding: '2px 10px', fontSize: 12,
                }}>
                  {visibilityMap[kb.visibility]}
                </Tag>
                <Text style={{ fontSize: 12, color: '#98a2b3' }}>
                  {kb.docCount} 文档 | {kb.chunkCount} 块
                </Text>
              </div>
              <div style={{ marginTop: 10 }}>
                <Text style={{ fontSize: 12, color: '#98a2b3' }}>
                  负责人: {kb.ownerName} | 更新: {kb.updatedAt}
                </Text>
              </div>
            </Card>
          </Col>
        ))}
      </Row>
      )}
      </Spin>

      <Modal
        title={editing ? '编辑知识库' : '新建知识库'}
        open={modalOpen}
        onOk={handleSave}
        confirmLoading={saving}
        onCancel={() => setModalOpen(false)}
        okText="保存"
        cancelText="取消"
        destroyOnClose
      >
        <Form form={form} layout="vertical" initialValues={{ visibility: 'public' }}>
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入知识库名称' }]}>
            <Input placeholder="知识库名称" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} placeholder="描述信息" />
          </Form.Item>
          <Form.Item name="visibility" label="可见范围">
            <Select>
              <Select.Option value="public">公开</Select.Option>
              <Select.Option value="department">部门</Select.Option>
              <Select.Option value="private">私有</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title={`成员管理 - ${selectedKb?.name || ''}`}
        open={memberOpen}
        onClose={() => setMemberOpen(false)}
        width={520}
      >
        <Form form={memberForm} layout="inline" initialValues={{ accessLevel: 'read' }} style={{ marginBottom: 16 }}>
          <Form.Item name="userId" rules={[{ required: true, message: '请输入用户ID' }]}>
            <InputNumber placeholder="用户 ID" min={1} style={{ width: 120 }} />
          </Form.Item>
          <Form.Item name="accessLevel">
            <Select style={{ width: 100 }}>
              <Select.Option value="read">只读</Select.Option>
              <Select.Option value="write">读写</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item>
            <Button type="primary" onClick={handleAddMember}>添加成员</Button>
          </Form.Item>
        </Form>
        <Table
          dataSource={members}
          rowKey="userId"
          loading={memberLoading}
          columns={[
            { title: '用户ID', dataIndex: 'userId', key: 'userId', width: 80 },
            { title: '用户名', dataIndex: 'username', key: 'username' },
            { title: '角色', dataIndex: 'roleName', key: 'roleName' },
            {
              title: '权限',
              dataIndex: 'accessLevel',
              key: 'accessLevel',
              render: (v: string) => (
                <Tag style={{
                  background: v === 'write' ? '#eff6ff' : '#f9fafb',
                  color: v === 'write' ? '#2563eb' : '#667085',
                  border: 'none', borderRadius: 6,
                }}>
                  {v === 'write' ? '读写' : '只读'}
                </Tag>
              ),
            },
            {
              title: '操作',
              key: 'action',
              width: 80,
              render: (_: unknown, m: KbMember) => (
                <Button type="link" danger size="small" onClick={() => handleRemoveMember(m.userId)}>移除</Button>
              ),
            },
          ]}
          pagination={false}
          size="small"
        />
      </Drawer>
    </PageContainer>
  )
}

export default KnowledgeBaseList
