import React from 'react'
import { Space } from 'antd'

interface PageContainerProps {
  title: string
  breadcrumb?: { label: string; path?: string }[]
  extra?: React.ReactNode
  children: React.ReactNode
}

const PageContainer: React.FC<PageContainerProps> = ({ extra, children }) => {
  return (
    <div className="app-page fade-in-up">
      {/* 顶部导航已标明当前页面，不再重复展示标题与面包屑；仅当有操作区时保留右上角 extra */}
      {extra && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          <Space>{extra}</Space>
        </div>
      )}
      {children}
    </div>
  )
}

export default PageContainer
