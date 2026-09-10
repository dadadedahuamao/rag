import React from 'react'
import { Result, Button } from 'antd'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

/** 全局错误边界：捕获渲染期异常，避免整页白屏 */
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // 生产环境可上报到监控平台
    console.error('页面渲染异常:', error, info)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined })
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      return (
        <Result
          status="500"
          title="页面出错了"
          subTitle={this.state.error?.message || '抱歉，页面发生了意外错误。'}
          extra={
            <Button type="primary" onClick={this.handleReset}>
              返回首页
            </Button>
          }
        />
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary
