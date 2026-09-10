import React from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, Dropdown, Space, Typography, Button } from 'antd'
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

  const menuItems = filterMenu(allMenuItems)
  const selectedKey = '/' + location.pathname.split('/').filter(Boolean).join('/')
  const adminSubKeys = ['/admin/users', '/admin/audit', '/admin/config', '/admin/tasks']
  const activeOpenKey = adminSubKeys.includes(selectedKey) ? 'admin' : ''

  const userMenuItems = [
    { key: 'profile', icon: <UserOutlined />, label: user ? `${user.username} | ${user.roles.join(', ')}` : '未登录' },
    { type: 'divider' as const },
    { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', danger: true },
  ]

  const handleUserMenuClick = ({ key }: { key: string }) => {
    if (key === 'logout') {
      authApi.logout()
      navigate('/login')
    }
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
    </Layout>
  )
}

export default MainLayout
