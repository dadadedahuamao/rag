import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Table, Card, Tag, Button, Modal, Form, Input, Select, App, Typography, Tabs, Checkbox, Tooltip } from 'antd'
import { EditOutlined, SafetyCertificateOutlined, PlusOutlined } from '@ant-design/icons'
import PageContainer from '../../components/PageContainer'
import { adminApi, authApi } from '../../api'
import { ApiError } from '../../api/http'
import { getCurrentUser } from '../../api/session'
import { getPermissionLabel, PERMISSION_GROUPS } from '../../utils/permission'
import type { User, UserStatus, Role } from '../../types'

const { Text, Title } = Typography

const UserRole: React.FC = () => {
  const [userList, setUserList] = useState<User[]>([])
  const [roleList, setRoleList] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [form] = Form.useForm()
  const { message } = App.useApp()
  const navigate = useNavigate()
  const currentUser = getCurrentUser()

  // 角色权限编辑状态
  const [permOpen, setPermOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [checkedPerms, setCheckedPerms] = useState<string[]>([])

  // 新增角色状态
  const [addOpen, setAddOpen] = useState(false)
  const [roleForm] = Form.useForm()
  const [newPerms, setNewPerms] = useState<string[]>([])

  // 新增用户状态
  const [addUserOpen, setAddUserOpen] = useState(false)
  const [userForm] = Form.useForm()

  const loadUsers = () => adminApi.listUsers().then(setUserList)
  const loadRoles = () => adminApi.listRoles().then(setRoleList)

  useEffect(() => {
    Promise.all([loadUsers(), loadRoles()])
      .catch((e: ApiError) => message.error(e.message || '加载数据失败'))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const editUser = (u: User) => {
    setSelectedUser(u)
    form.setFieldsValue({
      username: u.username,
      email: u.email,
      status: u.status,
      roles: u.roles,
      newPassword: undefined,
      confirmPassword: undefined,
    })
    setEditOpen(true)
  }

  const handleSave = () => {
    form.validateFields().then(async (values) => {
      if (!selectedUser) return
      try {
        const body: { status: UserStatus; roles: string[]; password?: string } = {
          status: values.status,
          roles: values.roles,
        }
        if (values.newPassword) body.password = values.newPassword
        await adminApi.updateUser(selectedUser.id, body)
        if (body.password && selectedUser.id === currentUser?.id) {
          message.success('密码修改成功，请重新登录')
          authApi.logout()
          navigate('/login')
          return
        }
        message.success('用户信息已更新')
        setEditOpen(false)
        loadUsers()
      } catch (e) {
        message.error((e as ApiError).message || '更新失败')
      }
    })
  }

  const openAddUser = () => {
    userForm.resetFields()
    setAddUserOpen(true)
  }

  const handleAddUser = () => {
    userForm.validateFields().then(async (values) => {
      try {
        await adminApi.createUser({
          username: values.username,
          email: values.email || '',
          password: values.password,
          roles: values.roles || [],
        })
        message.success(`用户「${values.username}」已创建`)
        setAddUserOpen(false)
        loadUsers()
      } catch (e) {
        message.error((e as ApiError).message || '创建失败')
      }
    })
  }

  const editRolePerms = (r: Role) => {
    setSelectedRole(r)
    setCheckedPerms(r.permissions)
    setPermOpen(true)
  }

  const handleSavePerms = async () => {
    if (!selectedRole) return
    try {
      await adminApi.updateRole(selectedRole.id, { permissions: checkedPerms })
      message.success(`「${selectedRole.name}」权限已更新`)
      setPermOpen(false)
      loadRoles()
    } catch (e) {
      message.error((e as ApiError).message || '更新失败')
    }
  }

  const openAddRole = () => {
    roleForm.resetFields()
    setNewPerms([])
    setAddOpen(true)
  }

  const handleAddRole = () => {
    roleForm.validateFields().then(async (values) => {
      try {
        await adminApi.createRole({
          name: (values.name as string).trim(),
          description: values.description || '',
          permissions: newPerms,
        })
        message.success(`角色「${values.name}」已创建`)
        setAddOpen(false)
        loadRoles()
      } catch (e) {
        message.error((e as ApiError).message || '创建失败')
      }
    })
  }

  const userColumns = [
    { title: '用户名', dataIndex: 'username', key: 'username', render: (v: string) => <Text strong>{v}</Text> },
    { title: '邮箱', dataIndex: 'email', key: 'email' },
    {
      title: '状态', dataIndex: 'status', key: 'status',
      render: (v: string) => (
        <Tag style={{ background: v === 'active' ? '#ecfdf5' : '#f2f4f7', color: v === 'active' ? '#16a34a' : '#667085', border: 'none', borderRadius: 6 }}>
          {v === 'active' ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '角色', dataIndex: 'roles', key: 'roles',
      render: (v: string[]) => v.map((r) => <Tag key={r} style={{ background: '#eff6ff', color: '#2563eb', border: 'none', borderRadius: 4, fontSize: 12 }}>{r}</Tag>),
    },
    { title: '最后登录', dataIndex: 'lastLogin', key: 'lastLogin' },
    {
      title: '操作', key: 'actions',
      render: (_: unknown, r: User) => <Button type="link" icon={<EditOutlined />} onClick={() => editUser(r)} />,
    },
  ]

  return (
    <PageContainer title="用户与角色" breadcrumb={[{ label: '系统管理' }, { label: '用户与角色' }]}>
      <Tabs
        items={[
          {
            key: 'users',
            label: '用户管理',
            children: (
              <Card style={{ borderRadius: 12, border: '1px solid #eef1f5' }}>
                <div style={{ marginBottom: 16, textAlign: 'right' }}>
                  <Button type="primary" icon={<PlusOutlined />} onClick={openAddUser}>新增用户</Button>
                </div>
                <Table
                  dataSource={userList.map((u) => ({ ...u, key: u.id }))}
                  columns={userColumns}
                  loading={loading}
                  pagination={{ pageSize: 15, showTotal: (t) => `共 ${t} 条` }}
                  size="middle"
                />
              </Card>
            ),
          },
          {
            key: 'roles',
            label: '角色与权限',
            children: (
              <div>
                <div style={{ marginBottom: 16, textAlign: 'right' }}>
                  <Button type="primary" icon={<PlusOutlined />} onClick={openAddRole}>
                    新增角色
                  </Button>
                </div>
                {roleList.map((r) => (
                  <Card key={r.id} style={{ borderRadius: 12, border: '1px solid #eef1f5', marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <Title level={5} style={{ marginBottom: 4 }}>{r.name}</Title>
                        <Text style={{ color: '#667085', fontSize: 13, display: 'block', marginBottom: 12 }}>{r.description}</Text>
                      </div>
                      <Button icon={<SafetyCertificateOutlined />} onClick={() => editRolePerms(r)}>
                        编辑权限
                      </Button>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {r.permissions.map((p) => (
                        <Tooltip key={p} title={p}>
                          <Tag style={{ background: '#eff6ff', color: '#2563eb', border: 'none', borderRadius: 4, fontSize: 12 }}>{getPermissionLabel(p)}</Tag>
                        </Tooltip>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            ),
          },
        ]}
      />

      <Modal
        title={`编辑用户 - ${selectedUser?.username || ''}`}
        open={editOpen}
        onOk={handleSave}
        onCancel={() => setEditOpen(false)}
        okText="保存"
        cancelText="取消"
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="username" label="用户名">
            <Input disabled />
          </Form.Item>
          <Form.Item name="email" label="邮箱">
            <Input disabled placeholder="邮箱" />
          </Form.Item>
          <Form.Item name="status" label="状态" rules={[{ required: true, message: '请选择状态' }]}>
            <Select<UserStatus>
              options={[
                { label: '启用', value: 'active' },
                { label: '禁用', value: 'disabled' },
              ]}
            />
          </Form.Item>
          <Form.Item name="roles" label="角色" rules={[{ required: true, message: '请选择角色' }]}>
            <Select mode="multiple" options={roleList.map((r) => ({ label: r.name, value: r.name }))} />
          </Form.Item>
          <Form.Item name="newPassword" label="新密码" rules={[{ min: 6, message: '新密码至少 6 位' }]}>
            <Input.Password maxLength={72} placeholder="留空则保持当前密码不变" />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="确认新密码"
            dependencies={['newPassword']}
            rules={[
              ({ getFieldValue }) => ({
                validator(_, value) {
                  const password = getFieldValue('newPassword')
                  if (!password && !value) return Promise.resolve()
                  if (!value) return Promise.reject(new Error('请再次输入新密码'))
                  return password === value
                    ? Promise.resolve()
                    : Promise.reject(new Error('两次输入的新密码不一致'))
                },
              }),
            ]}
          >
            <Input.Password maxLength={72} placeholder="再次输入新密码" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="新增用户"
        open={addUserOpen}
        onOk={handleAddUser}
        onCancel={() => setAddUserOpen(false)}
        okText="创建"
        cancelText="取消"
        destroyOnClose
      >
        <Form form={userForm} layout="vertical">
          <Form.Item name="username" label="用户名" rules={[{ required: true, min: 2, message: '请输入用户名（至少2位）' }]}>
            <Input placeholder="用户名" />
          </Form.Item>
          <Form.Item name="email" label="邮箱" rules={[{ type: 'email', message: '请输入有效邮箱' }]}>
            <Input placeholder="邮箱（可选）" />
          </Form.Item>
          <Form.Item name="password" label="初始密码" rules={[{ required: true, message: '请输入初始密码' }]}>
            <Input.Password placeholder="初始密码" />
          </Form.Item>
          <Form.Item name="roles" label="角色">
            <Select mode="multiple" placeholder="分配角色" options={roleList.map((r) => ({ label: r.name, value: r.name }))} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`编辑权限 - ${selectedRole?.name || ''}`}
        open={permOpen}
        onOk={handleSavePerms}
        onCancel={() => setPermOpen(false)}
        okText="保存"
        cancelText="取消"
        destroyOnClose
        width={520}
      >
        <Text style={{ color: '#667085', fontSize: 13, display: 'block', marginBottom: 16 }}>
          勾选该角色拥有的权限，鼠标悬停可查看对应的权限码。
        </Text>
        {PERMISSION_GROUPS.map((g) => (
          <div key={g.group} style={{ marginBottom: 16 }}>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>{g.group}</Text>
            <Checkbox.Group
              value={checkedPerms.filter((p) => g.items.includes(p))}
              onChange={(vals) => {
                const others = checkedPerms.filter((p) => !g.items.includes(p))
                setCheckedPerms([...others, ...(vals as string[])])
              }}
              options={g.items.map((p) => ({ label: getPermissionLabel(p), value: p }))}
            />
          </div>
        ))}
      </Modal>

      <Modal
        title="新增角色"
        open={addOpen}
        onOk={handleAddRole}
        onCancel={() => setAddOpen(false)}
        okText="创建"
        cancelText="取消"
        destroyOnClose
        width={520}
      >
        <Form form={roleForm} layout="vertical">
          <Form.Item name="name" label="角色名称" rules={[{ required: true, message: '请输入角色名称' }]}>
            <Input placeholder="如：评测员" />
          </Form.Item>
          <Form.Item name="description" label="角色描述">
            <Input.TextArea rows={2} placeholder="简要描述该角色的职责" />
          </Form.Item>
        </Form>
        <Text strong style={{ display: 'block', marginBottom: 8 }}>权限分配</Text>
        {PERMISSION_GROUPS.map((g) => (
          <div key={g.group} style={{ marginBottom: 16 }}>
            <Text style={{ color: '#667085', fontSize: 13, display: 'block', marginBottom: 8 }}>{g.group}</Text>
            <Checkbox.Group
              value={newPerms.filter((p) => g.items.includes(p))}
              onChange={(vals) => {
                const others = newPerms.filter((p) => !g.items.includes(p))
                setNewPerms([...others, ...(vals as string[])])
              }}
              options={g.items.map((p) => ({ label: getPermissionLabel(p), value: p }))}
            />
          </div>
        ))}
      </Modal>
    </PageContainer>
  )
}

export default UserRole
