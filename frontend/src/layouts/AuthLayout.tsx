import React from 'react'
import { Outlet } from 'react-router-dom'
import { Layout, Typography } from 'antd'
import { FileTextOutlined } from '@ant-design/icons'
import './AuthLayout.css'

const { Text } = Typography

const AuthLayout: React.FC = () => {
  return (
    <Layout className="auth-layout">
      <div className="auth-bg">
        <div className="auth-bg-grid" />
        <div className="auth-bg-orb orb-a" />
        <div className="auth-bg-orb orb-b" />
        <div className="auth-bg-orb orb-c" />
        <div className="auth-bg-beam" />
        <div className="auth-bg-stars">
          <span /><span /><span /><span /><span /><span />
          <span /><span /><span /><span /><span /><span />
        </div>
      </div>
      <div className="auth-container">
        <div className="auth-brand">
          <div className="auth-brand-grid" />
          <div className="auth-brand-aurora aurora-1" />
          <div className="auth-brand-aurora aurora-2" />
          <div className="auth-brand-aurora aurora-3" />
          <div className="auth-brand-particles">
            <span /><span /><span /><span /><span /><span />
          </div>
          <div className="auth-brand-content">
            <div className="auth-brand-logo">
              <FileTextOutlined className="auth-brand-icon" />
            </div>
            <div className="auth-brand-title">RAG 知识库</div>
            <Text className="auth-brand-desc">企业级智能文档问答平台</Text>
            <div className="auth-brand-features">
              <div className="auth-feature-item">多知识库统一管理</div>
              <div className="auth-feature-item">混合检索 + 智能问答</div>
              <div className="auth-feature-item">引用溯源，答案可信</div>
              <div className="auth-feature-item">企业级权限与安全</div>
            </div>
          </div>
        </div>
        <div className="auth-form-area">
          <Outlet />
        </div>
      </div>
    </Layout>
  )
}

export default AuthLayout
