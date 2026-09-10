import React, { useState, useRef, useEffect } from 'react'
import {
  Input, Button, Typography, Drawer, App, Card,
} from 'antd'
import {
  SendOutlined, StopOutlined, FileTextOutlined, DeploymentUnitOutlined,
  ThunderboltFilled, PlusOutlined, MessageOutlined,
} from '@ant-design/icons'
import PageContainer from '../../components/PageContainer'
import MessageBubble from '../../components/MessageBubble'
import MarkdownText from '../../components/MarkdownText'
import { conversationApi, qaStream } from '../../api'
import { ApiError } from '../../api/http'
import type { Message, Citation, Conversation } from '../../types'

const { TextArea } = Input
const { Text } = Typography

interface RoutedKb {
  id: number
  name: string
}

const STAGE_TEXT: Record<string, string> = {
  routing: '正在分析问题，自动匹配知识库…',
  retrieving: '正在检索相关文档…',
  grading: '正在评估检索质量…',
  rewriting: '检索结果欠佳，正在优化查询重新检索…',
  generating: '正在生成回答…',
  verifying: '正在校验回答依据…',
  regenerating: '回答依据不足，正在重新生成…',
}

const ChatPage: React.FC = () => {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [streaming, setStreaming] = useState(false)
  const [currentStream, setCurrentStream] = useState('')
  const [statusStage, setStatusStage] = useState('')
  // 模型自动匹配到的知识库（不再需要用户手动选择）
  const [routedKbs, setRoutedKbs] = useState<RoutedKb[]>([])
  const [citations, setCitations] = useState<Citation[]>([])
  const [refPanelOpen, setRefPanelOpen] = useState(false)
  const [refTarget, setRefTarget] = useState<Citation[]>([])
  const [convs, setConvs] = useState<Conversation[]>([])
  const [conversationId, setConversationId] = useState<number | null>(null)
  const abortRef = useRef<null | (() => void)>(null)
  const answerRef = useRef('')
  const citationsRef = useRef<Citation[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)
  const { message } = App.useApp()

  const loadConvs = () => {
    conversationApi.list().then(setConvs).catch(() => {})
  }

  useEffect(() => {
    loadConvs()
    return () => {
      abortRef.current?.()
    }
  }, [])

  // 新消息 / 流式输出时自动滚动到底部
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, currentStream, statusStage])

  const openConversation = async (c: Conversation) => {
    try {
      const full = await conversationApi.get(c.id)
      setMessages(full.messages || [])
      setConversationId(c.id)
    } catch (e) {
      message.error((e as ApiError).message || '加载会话失败')
    }
  }

  const send = (text: string) => {
    if (!text.trim() || streaming) return
    const q = text.trim()
    const userMsg: Message = { id: Date.now(), role: 'user', content: q, createdAt: new Date().toLocaleTimeString() }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    startStream(q)
  }

  const handleSend = () => send(input)

  const startStream = (query: string) => {
    setStreaming(true)
    setStatusStage('routing')
    setCitations([])
    setCurrentStream('')
    setRoutedKbs([])
    answerRef.current = ''

    abortRef.current = qaStream(
      { query, conversationId, kbId: null },
      {
        onEvent: (e) => {
          switch (e.type) {
            case 'routing':
              setRoutedKbs(e.kbs || [])
              setStatusStage('routing')
              break
            case 'retrieving':
              setStatusStage('retrieving')
              break
            case 'stage':
              // 图内扩展阶段（评估/改写/校验/重生成）
              setStatusStage(e.stage || '')
              break
            case 'restart':
              // 幻觉校验未通过，清空已输出内容等待重新生成
              answerRef.current = ''
              setCurrentStream('')
              break
            case 'generating':
              setStatusStage('generating')
              break
            case 'token':
              answerRef.current += e.delta || ''
              setCurrentStream(answerRef.current)
              break
            case 'citations':
              citationsRef.current = e.citations || []
              setCitations(e.citations || [])
              break
            case 'done': {
              const assistantMsg: Message = {
                id: Date.now() + 1,
                role: 'assistant',
                content: answerRef.current,
                citations: citationsRef.current,
                createdAt: new Date().toLocaleTimeString(),
              }
              setMessages((prev) => [...prev, assistantMsg])
              setStreaming(false)
              setCurrentStream('')
              setStatusStage('')
              if (e.conversationId) setConversationId(e.conversationId)
              loadConvs()
              break
            }
            case 'error':
              message.error(e.message || '生成失败')
              setStreaming(false)
              setStatusStage('')
              setCurrentStream('')
              break
          }
        },
        onError: (err) => {
          message.error(err.message || '连接失败')
          setStreaming(false)
          setStatusStage('')
          setCurrentStream('')
        },
      },
    )
  }

  // 停止/中断流式生成
  const handleStop = () => {
    abortRef.current?.()
    setStreaming(false)
    setStatusStage('')
    setCurrentStream('')
    message.info('已停止生成')
  }

  const showCitations = (refs?: Citation[]) => {
    if (refs && refs.length > 0) {
      setRefTarget(refs)
      setRefPanelOpen(true)
    }
  }

  const newChat = () => {
    setMessages([])
    setConversationId(null)
    setCurrentStream('')
    setCitations([])
  }

  return (
    <PageContainer title="智能问答" breadcrumb={[{ label: '智能问答' }]} extra={
      <div className="qa-route-badge">
        <DeploymentUnitOutlined />
        <span>智能路由 · 自动匹配知识库</span>
      </div>
    }>
      <div className="qa-layout">
        {/* 左侧会话列表 */}
        <aside className="qa-sidebar">
          <Button
            type="primary"
            icon={<PlusOutlined />}
            block
            onClick={newChat}
            className="qa-newchat-btn"
          >
            新对话
          </Button>
          <div className="qa-sidebar-label">
            <MessageOutlined style={{ marginRight: 6 }} />历史会话
          </div>
          <div className="qa-conv-list">
            {convs.length === 0 && (
              <div className="qa-conv-empty">暂无历史会话</div>
            )}
            {convs.slice(0, 20).map((c) => (
              <div
                key={c.id}
                className={`qa-conv-item ${conversationId === c.id ? 'active' : ''}`}
                onClick={() => openConversation(c)}
              >
                <div className="qa-conv-title">{c.title}</div>
                <div className="qa-conv-meta">{c.messageCount} 条消息</div>
              </div>
            ))}
          </div>
        </aside>

        {/* 中间对话区 */}
        <section className="qa-main">
          <div className="qa-messages" ref={scrollRef}>
            {messages.length === 0 && !streaming && (
              <div className="qa-welcome">
                <div className="qa-welcome-icon"><ThunderboltFilled /></div>
                <h2 className="qa-welcome-title">你好，我是知识库助手</h2>
                <p className="qa-welcome-sub">直接提问，我会自动匹配相关知识库并给出带引用来源的答案</p>
              </div>
            )}

            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} citationMode="link" onCitationClick={showCitations} />
            ))}

            {/* 流式输出 */}
            {streaming && (
              <div className="chat-row is-ai">
                <div className="chat-avatar chat-avatar-ai"><ThunderboltFilled /></div>
                <div className="chat-col">
                  <div className="chat-bubble chat-bubble-ai">
                    {routedKbs.length > 0 && (
                      <div className="qa-routed">
                        <span className="qa-routed-label">已自动匹配</span>
                        {routedKbs.map((k) => (
                          <span key={k.id} className="qa-routed-tag">{k.name}</span>
                        ))}
                      </div>
                    )}
                    {statusStage && !currentStream && (
                      <div className="qa-thinking">
                        <span className="qa-dots"><i /><i /><i /></span>
                        <span className="qa-thinking-text">{STAGE_TEXT[statusStage] || '思考中…'}</span>
                      </div>
                    )}
                    {currentStream && (
                      <div className="qa-streaming">
                        <MarkdownText content={currentStream} />
                        <span className="cursor-blink">▍</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 输入区 */}
          <div className="qa-composer">
            <TextArea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onPressEnter={(e) => { if (!e.shiftKey) { e.preventDefault(); handleSend() } }}
              placeholder="输入您的问题，Enter 发送 / Shift+Enter 换行"
              autoSize={{ minRows: 1, maxRows: 5 }}
              variant="borderless"
              className="qa-input"
            />
            {streaming ? (
              <Button icon={<StopOutlined />} onClick={handleStop} className="qa-send-btn" danger>
                停止
              </Button>
            ) : (
              <Button type="primary" icon={<SendOutlined />} onClick={handleSend} disabled={!input.trim()} className="qa-send-btn">
                发送
              </Button>
            )}
          </div>
        </section>

        {/* 引用溯源浮动入口 */}
        {citations.length > 0 && (
          <Button
            type="primary"
            icon={<FileTextOutlined />}
            onClick={() => showCitations(citations)}
            className="qa-cite-fab"
          >
            查看引用 ({citations.length})
          </Button>
        )}
      </div>

      <Drawer title="引用溯源" open={refPanelOpen} onClose={() => setRefPanelOpen(false)} width={460}>
        {refTarget.map((c, i) => (
          <Card key={i} className="qa-cite-card" size="small">
            <div className="qa-cite-head">
              <span className="qa-cite-index">{i + 1}</span>
              <Text strong style={{ fontSize: 14 }}>{c.title}</Text>
            </div>
            <Text style={{ fontSize: 12, color: '#667085', display: 'block', margin: '4px 0 8px' }}>第 {c.page} 页</Text>
            <div className="qa-cite-snippet">{c.snippet}</div>
          </Card>
        ))}
      </Drawer>
    </PageContainer>
  )
}

export default ChatPage
