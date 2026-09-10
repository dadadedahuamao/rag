import React from 'react'

/**
 * 轻量 Markdown 渲染组件
 * 无第三方依赖，覆盖问答场景常见语法：标题、加粗、行内代码、
 * 有序/无序列表（含缩进嵌套）、普通段落。
 */

/** 行内解析：**加粗**、`行内代码` */
function parseInline(text: string, keyPrefix: string): React.ReactNode[] {
  const parts: React.ReactNode[] = []
  const regex = /(\*\*.+?\*\*|`[^`]+?`)/g
  let lastIndex = 0
  let i = 0
  let m: RegExpExecArray | null
  while ((m = regex.exec(text)) !== null) {
    if (m.index > lastIndex) parts.push(text.slice(lastIndex, m.index))
    const tok = m[0]
    if (tok.startsWith('**')) {
      parts.push(
        <strong key={`${keyPrefix}-b${i}`} className="md-strong">{tok.slice(2, -2)}</strong>,
      )
    } else {
      parts.push(
        <code key={`${keyPrefix}-c${i}`} className="md-code">{tok.slice(1, -1)}</code>,
      )
    }
    lastIndex = m.index + tok.length
    i++
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex))
  return parts
}

interface ListItem {
  indent: number
  ordered: boolean
  content: string
}

interface ListNode {
  item: ListItem
  children: ListNode[]
}

const LIST_RE = /^(\s*)([-*]|\d+\.)\s+(.*)$/

/** 将连续列表项按缩进构建为嵌套树并渲染 */
function renderList(items: ListItem[], keyBase: string): React.ReactNode {
  const uniqueIndents = Array.from(new Set(items.map((it) => it.indent))).sort((a, b) => a - b)
  const levelOf = (indent: number) => uniqueIndents.indexOf(indent)

  const root: ListNode[] = []
  const stack: ListNode[] = []
  items.forEach((it) => {
    const node: ListNode = { item: it, children: [] }
    const level = levelOf(it.indent)
    while (stack.length > level) stack.pop()
    if (stack.length === 0) root.push(node)
    else stack[stack.length - 1].children.push(node)
    stack.push(node)
  })

  let k = 0
  const renderNodes = (nodes: ListNode[]): React.ReactNode => {
    const ordered = nodes[0]?.item.ordered
    const Tag = (ordered ? 'ol' : 'ul') as 'ol' | 'ul'
    return (
      <Tag className="md-list" key={`${keyBase}-l${k++}`}>
        {nodes.map((n) => {
          const key = `${keyBase}-li${k++}`
          return (
            <li className="md-li" key={key}>
              {parseInline(n.item.content, key)}
              {n.children.length > 0 && renderNodes(n.children)}
            </li>
          )
        })}
      </Tag>
    )
  }
  return renderNodes(root)
}

const MarkdownText: React.FC<{ content: string }> = ({ content }) => {
  const lines = content.replace(/\r\n/g, '\n').split('\n')
  const blocks: React.ReactNode[] = []
  let i = 0
  let key = 0

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    if (!trimmed) {
      i++
      continue
    }

    // 标题 # ~ ####
    const h = /^(#{1,4})\s+(.*)$/.exec(trimmed)
    if (h) {
      const level = h[1].length
      const key2 = `h${key++}`
      blocks.push(
        <div key={key2} className={`md-h md-h${level}`}>{parseInline(h[2], key2)}</div>,
      )
      i++
      continue
    }

    // 连续列表
    if (LIST_RE.test(line)) {
      const items: ListItem[] = []
      while (i < lines.length && LIST_RE.test(lines[i])) {
        const mm = LIST_RE.exec(lines[i])!
        items.push({ indent: mm[1].length, ordered: /\d+\./.test(mm[2]), content: mm[3] })
        i++
      }
      blocks.push(<div key={`l${key++}`}>{renderList(items, `l${key}`)}</div>)
      continue
    }

    // 普通段落
    const key3 = `p${key++}`
    blocks.push(<p key={key3} className="md-p">{parseInline(trimmed, key3)}</p>)
    i++
  }

  return <div className="md-body">{blocks}</div>
}

export default MarkdownText
