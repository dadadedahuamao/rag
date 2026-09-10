import React from 'react'
import { Navigate } from 'react-router-dom'
import { Result, Button } from 'antd'
import { getCurrentUser } from '../api/session'
import { hasPermission } from '../utils/permission'

interface RequireAuthProps {
  /** 所需权限，不传则只检查是否登录 */
  permission?: string
  children: React.ReactNode
}

/** 路由级权限守卫：无权限时展示 403 页面 */
const RequireAuth: React.FC<RequireAuthProps> = ({ permission, children }) => {
  const user = getCurrentUser()

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (permission && !hasPermission(permission)) {
    return (
      <Result
        status="403"
        title="403"
        subTitle="抱歉，您没有权限访问此页面。"
        extra={
          <Button type="primary" onClick={() => window.history.back()}>
            返回上一页
          </Button>
        }
      />
    )
  }

  return <>{children}</>
}

export default RequireAuth
