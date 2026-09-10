import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Form, Input, Button, Typography, App } from 'antd'
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons'
import { authApi } from '../../api'
import { ApiError } from '../../api/http'

const { Text } = Typography

const Register: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { message } = App.useApp()

  const onFinish = async (values: { username: string; email: string; password: string; confirm: string }) => {
    if (values.password !== values.confirm) {
      message.error('两次输入的密码不一致')
      return
    }
    setLoading(true)
    try {
      await authApi.register(values.username, values.email, values.password)
      message.success('注册成功，已自动登录！')
      navigate('/')
    } catch (e) {
      const err = e as ApiError
      message.error(err.message || '注册失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Text className="auth-form-title">注册</Text>
      <div className="auth-form-subtitle">创建您的企业知识库账号</div>
      <Form layout="vertical" onFinish={onFinish} size="large">
        <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
          <Input prefix={<UserOutlined style={{ color: '#667085' }} />} placeholder="用户名" />
        </Form.Item>
        <Form.Item name="email" rules={[{ required: true, type: 'email', message: '请输入有效邮箱' }]}>
          <Input prefix={<MailOutlined style={{ color: '#667085' }} />} placeholder="邮箱" />
        </Form.Item>
        <Form.Item name="password" rules={[{ required: true, min: 6, message: '密码至少6位' }]}>
          <Input.Password prefix={<LockOutlined style={{ color: '#667085' }} />} placeholder="密码" />
        </Form.Item>
        <Form.Item name="confirm" rules={[{ required: true, message: '请确认密码' }]}>
          <Input.Password prefix={<LockOutlined style={{ color: '#667085' }} />} placeholder="确认密码" />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block>
            注册
          </Button>
        </Form.Item>
        <div style={{ textAlign: 'center' }}>
          <Text style={{ color: '#667085', fontSize: 13 }}>
            已有账号？
            <Link to="/login" style={{ color: '#2563eb', marginLeft: 4 }}>
              立即登录
            </Link>
          </Text>
        </div>
      </Form>
    </div>
  )
}

export default Register
