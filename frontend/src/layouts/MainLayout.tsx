import React, { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, Dropdown, Space, Typography, Button, Modal, Form, Input, App } from 'antd'
import {
  DashboardOutlined,
  BookOutlined,
  FileTextOutlined,
  MessageOutlined,
  HistoryOutlined,
  SettingOutlined,
  UserOutlined,
  TeamOutlined,
  AuditOutlined,
  ControlOutlined,
  ScheduleOutlined,
  LogoutOutlined,
  LockOutlined,
  DatabaseOutlined,
} from '@ant-design/icons'
import { getCurrentUser } from '../api/session'
import { authApi } from '../api'
import { hasPermission } from '../utils/permission'

const { Header, Content } = Layout
const { Text } = Typography

// 菜单项定义（含权限标识）
const allMenuItems = [
  { key: '/', icon: <DashboardOutlined />, label: '概览', permission: null },
  { key: '/kb', icon: <BookOutlined />, label: '知识库', permission: 'kb:read' },
  { key: '/documents', icon: <FileTextOutlined />, label: '文档', permission: 'document:read' },
  { key: '/qa', icon: <MessageOutlined />, label: '智能问答', permission: 'qa:ask' },
  { key: '/conversations', icon: <HistoryOutlined />, label: '会话历史', permission: null },
  {
    key: 'admin',
    icon: <SettingOutlined />,
    label: '系统管理',
    permission: 'admin',
    children: [
      { key: '/admin/users', icon: <TeamOutlined />, label: '用户与角色' },
      { key: '/admin/audit', icon: <AuditOutlined />, label: '审计日志' },
      { key: '/admin/config', icon: <ControlOutlined />, label: '系统配置' },
      { key: '/admin/tasks', icon: <ScheduleOutlined />, label: '任务中心' },
    ],
  },
]

/** 根据权限过滤菜单 */
function filterMenu(items: typeof allMenuItems) {
  return items
    .filter((item) => {
      if (item.permission === null) return true
      return hasPermission(item.permission)
    })
    .map((item) => {
      if (item.children) {
        return { ...item, children: item.children }
      }
      return item
    })
}

const MainLayout: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const user = getCurrentUser()
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordForm] = Form.useForm()
  const { message } = App.useApp()

  const menuItems = filterMenu(allMenuItems)
  const selectedKey = '/' + location.pathname.split('/').filter(Boolean).join('/')
  const adminSubKeys = ['/admin/users', '/admin/audit', '/admin/config', '/admin/tasks']
  const activeOpenKey = adminSubKeys.includes(selectedKey) ? 'admin' : ''

  const userMenuItems = [
    { key: 'profile', icon: <UserOutlined />, label: user ? `${user.username} | ${user.roles.join(', ')}` : '未登录' },
    { type: 'divider' as const },
    { key: 'change-password', icon: <LockOutlined />, label: '修改密码' },
    { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', danger: true },
  ]

  const handleUserMenuClick = ({ key }: { key: string }) => {
    if (key === 'change-password') {
      setPasswordOpen(true)
      return
    }
    if (key === 'logout') {
      authApi.logout()
      navigate('/login')
    }
  }

  const handleChangePassword = async () => {
    const values = await passwordForm.validateFields()
    try {
      setPasswordSaving(true)
      await authApi.changePassword(values.currentPassword, values.newPassword)
      message.success('密码修改成功，请重新登录')
      passwordForm.resetFields()
      setPasswordOpen(false)
      authApi.logout()
      navigate('/login')
    } catch (e) {
      message.error((e as Error).message || '密码修改失败')
    } finally {
      setPasswordSaving(false)
    }
  }

  const closePasswordModal = () => {
    if (passwordSaving) return
    passwordForm.resetFields()
    setPasswordOpen(false)
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          background: 'rgba(255, 255, 255, 0.65)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255, 255, 255, 0.6)',
          boxShadow: '0 4px 24px rgba(16, 52, 120, 0.08)',
          padding: '0 24px',
          height: 60,
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
            onClick={() => navigate('/')}
          >
            <DatabaseOutlined className="glow-pulse" style={{ fontSize: 22, color: '#2563eb', borderRadius: 8, padding: 2 }} />
            <Text
              strong
              className="gradient-text"
              style={{ fontSize: 17, letterSpacing: 0.2 }}
            >
              企业级 RAG 知识库
            </Text>
          </div>
          <Menu
            mode="horizontal"
            selectedKeys={[selectedKey]}
            defaultOpenKeys={activeOpenKey ? [activeOpenKey] : []}
            onClick={({ key }) => navigate(key)}
            items={menuItems}
            style={{ borderBottom: 'none', flex: 1, minWidth: 520 }}
          />
        </div>
        <Dropdown menu={{ items: userMenuItems, onClick: handleUserMenuClick }} placement="bottomRight">
          <Space style={{ cursor: 'pointer' }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'linear-gradient(120deg, #2563eb 0%, #0ea5e9 45%, #06b6d4 100%)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
                fontSize: 13,
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)',
              }}
            >
              {user ? user.username.charAt(0).toUpperCase() : '?'}
            </div>
            <Text style={{ fontSize: 13, color: '#475467' }}>{user ? user.username : '未登录'}</Text>
          </Space>
        </Dropdown>
      </Header>
      <Content style={{ padding: 24, background: 'transparent' }}>
        <Outlet />
      </Content>
      <Modal
        title="修改密码"
        open={passwordOpen}
        onOk={handleChangePassword}
        onCancel={closePasswordModal}
        confirmLoading={passwordSaving}
        okText="保存"
        cancelText="取消"
        destroyOnClose
      >
        <Form form={passwordForm} layout="vertical">
          <Form.Item name="currentPassword" label="当前密码" rules={[{ required: true, message: '请输入当前密码' }]}>
            <Input.Password placeholder="请输入当前密码" />
          </Form.Item>
          <Form.Item name="newPassword" label="新密码" rules={[{ required: true, min: 6, message: '新密码至少 6 位' }]}>
            <Input.Password maxLength={72} placeholder="请输入新密码" />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="确认新密码"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: '请再次输入新密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  return !value || getFieldValue('newPassword') === value
                    ? Promise.resolve()
                    : Promise.reject(new Error('两次输入的新密码不一致'))
                },
              }),
            ]}
          >
            <Input.Password maxLength={72} placeholder="请再次输入新密码" />
          </Form.Item>
          <div style={{ color: '#52718b', fontSize: 12, lineHeight: 1.55, background: '#eff8ff', borderRadius: 8, padding: '10px 12px' }}>
            密码修改成功后，当前账号将退出登录，请使用新密码重新登录。
          </div>
        </Form>
      </Modal>
    </Layout>
  )
}

export default MainLayout
