import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Form, Input, Button, Checkbox, Typography, App } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { authApi } from '../../api'
import { ApiError } from '../../api/http'

const { Text } = Typography

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { message } = App.useApp()

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true)
    try {
      const user = await authApi.login(values.username, values.password)
      message.success(`欢迎回来，${user.username}！`)
      navigate('/')
    } catch (e) {
      const err = e as ApiError
      message.error(err.message || '登录失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Text className="auth-form-title">登录</Text>
      <div className="auth-form-subtitle">请输入您的账号密码登录系统</div>
      <Form layout="vertical" onFinish={onFinish} size="large" initialValues={{ username: 'admin' }}>
        <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
          <Input prefix={<UserOutlined style={{ color: '#667085' }} />} placeholder="用户名" />
        </Form.Item>
        <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
          <Input.Password prefix={<LockOutlined style={{ color: '#667085' }} />} placeholder="密码" />
        </Form.Item>
        <Form.Item>
          <Checkbox>记住我</Checkbox>
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block>
            登录
          </Button>
        </Form.Item>
      </Form>
    </div>
  )
}

export default Login
