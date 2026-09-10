import React from 'react'
import { Typography, Tag } from 'antd'
import { LinkOutlined, UserOutlined, ThunderboltFilled } from '@ant-design/icons'
import MarkdownText from './MarkdownText'
import type { Message, Citation } from '../types'

const { Text } = Typography

interface MessageBubbleProps {
  message: Message
  /** 引用展示方式：'link' 可点击展开（问答页），'tags' 内联标签（会话详情） */
  citationMode?: 'link' | 'tags'
  /** citationMode='link' 时点击引用的回调 */
  onCitationClick?: (citations: Citation[]) => void
  /** 时间戳是否附带角色前缀（用户/助手） */
  showRoleInMeta?: boolean
  /** 尺寸风格：default 用于问答主区，compact 用于抽屉详情 */
  size?: 'default' | 'compact'
}

/** 消息气泡公共组件：统一 ChatPage 与会话详情的展示，消除重复实现 */
const MessageBubble: React.FC<MessageBubbleProps> = ({
  message: m,
  citationMode = 'link',
  onCitationClick,
  showRoleInMeta = false,
  size = 'default',
}) => {
  const isUser = m.role === 'user'
  const compact = size === 'compact'

  const avatar = (
    <div className={`chat-avatar ${isUser ? 'chat-avatar-user' : 'chat-avatar-ai'}`}>
      {isUser ? <UserOutlined /> : <ThunderboltFilled />}
    </div>
  )

  return (
    <div className={`chat-row ${isUser ? 'is-user' : 'is-ai'} ${compact ? 'is-compact' : ''}`}>
      {!compact && !isUser && avatar}
      <div className="chat-col">
        <div className={`chat-bubble ${isUser ? 'chat-bubble-user' : 'chat-bubble-ai'}`}>
          {isUser ? (
            <Text style={{ whiteSpace: 'pre-wrap', color: '#fff', fontSize: compact ? 13 : 14, lineHeight: 1.7 }}>
              {m.content}
            </Text>
          ) : (
            <MarkdownText content={m.content} />
          )}

          {m.citations && m.citations.length > 0 && (
            <div className="chat-citations">
              {citationMode === 'link' ? (
                <span className="chat-citation-link" onClick={() => onCitationClick?.(m.citations!)}>
                  <LinkOutlined style={{ marginRight: 5 }} />
                  引用来源 ({m.citations.length})
                </span>
              ) : (
                <>
                  <Text style={{ fontSize: 11, color: '#667085' }}>引用来源：</Text>
                  {m.citations.map((c, i) => (
                    <Tag key={i} style={{ fontSize: 11, marginTop: 4, background: '#f3f7ff', border: 'none', color: '#2563eb' }}>
                      {c.title} (P{c.page})
                    </Tag>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
        <Text className="chat-meta">
          {showRoleInMeta ? `${isUser ? '用户' : '助手'} · ${m.createdAt}` : m.createdAt}
        </Text>
      </div>
      {!compact && isUser && avatar}
    </div>
  )
}

export default MessageBubble
