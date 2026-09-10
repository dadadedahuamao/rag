import React, { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Table, Select, Button, Upload, Modal, Form, Progress, Drawer, App, Typography,
  Tooltip, Space, Tag,
} from 'antd'
import type { UploadFile } from 'antd'
import {
  UploadOutlined, ReloadOutlined, DeleteOutlined, EyeOutlined,
  FilterOutlined,
} from '@ant-design/icons'
import PageContainer from '../../components/PageContainer'
import StatusTag from '../../components/StatusTag'
import { kbApi, docApi } from '../../api'
import { ApiError } from '../../api/http'
import { hasPermission } from '../../utils/permission'
import type { DocumentItem, KnowledgeBase, Chunk } from '../../types'

const { Text } = Typography

const fileTypeColors: Record<string, string> = {
  PDF: '#fef2f2',
  Word: '#eff6ff',
  Markdown: '#ecfdf5',
  TXT: '#f9fafb',
  HTML: '#fff7ed',
}

const DocumentList: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [kbs, setKbs] = useState<KnowledgeBase[]>([])
  const [docs, setDocs] = useState<DocumentItem[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedKb, setSelectedKb] = useState<number | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [chunkOpen, setChunkOpen] = useState(false)
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null)
  const [chunks, setChunks] = useState<Chunk[]>([])
  const [chunkLoading, setChunkLoading] = useState(false)
  const { message, modal } = App.useApp()
  const canUpload = hasPermission('document:upload')
  const canManage = hasPermission('document:manage')
  const timersRef = useRef<ReturnType<typeof setInterval>[]>([])

  useEffect(() => {
    kbApi.list().then(setKbs).catch(() => {})
    const kbIdParam = searchParams.get('kbId')
    if (kbIdParam) setSelectedKb(Number(kbIdParam))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadDocs = (kbId: number | null) => {
    setLoading(true)
    docApi
      .list(kbId ?? undefined)
      .then(setDocs)
      .catch((e: ApiError) => message.error(e.message || '加载文档失败'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadDocs(selectedKb)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKb])

  useEffect(() => {
    return () => {
      timersRef.current.forEach((t) => clearInterval(t))
      timersRef.current = []
    }
  }, [])

  /** 轮询单个文档的索引进度，直到 ready/failed */
  const pollDoc = (docId: number) => {
    const timer = setInterval(async () => {
      try {
        const d = await docApi.get(docId)
        setDocs((prev) => prev.map((x) => (x.id === docId ? d : x)))
        if (d.status !== 'indexing') {
          clearInterval(timer)
          timersRef.current = timersRef.current.filter((t) => t !== timer)
        }
      } catch {
        clearInterval(timer)
      }
    }, 1200)
    timersRef.current.push(timer)
  }

  const handleUpload = async () => {
    if (!selectedKb) {
      message.warning('请先选择知识库')
      return
    }
    const file = fileList[0]?.originFileObj
    if (!file) {
      message.warning('请选择文件')
      return
    }
    setUploading(true)
    try {
      const { document } = await docApi.upload(selectedKb, file as File)
      setUploadOpen(false)
      setFileList([])
      message.success('文档已提交索引任务')
      setDocs((prev) => [document, ...prev])
      pollDoc(document.id)
    } catch (e) {
      message.error((e as ApiError).message || '上传失败')
    } finally {
      setUploading(false)
    }
  }

  const handleReindex = async (doc: DocumentItem) => {
    try {
      await docApi.reindex(doc.id)
      message.info('已触发重建索引')
      setDocs((prev) => prev.map((d) => (d.id === doc.id ? { ...d, status: 'indexing', progress: 0 } : d)))
      pollDoc(doc.id)
    } catch (e) {
      message.error((e as ApiError).message || '重建失败')
    }
  }

  const handleDelete = (doc: DocumentItem) => {
    modal.confirm({
      title: '确认删除',
      content: `确定要删除文档「${doc.title}」吗？索引数据也将一并删除。`,
      okText: '确认删除',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await docApi.remove(doc.id)
          message.success('文档已删除')
          setDocs((prev) => prev.filter((d) => d.id !== doc.id))
        } catch (e) {
          message.error((e as ApiError).message || '删除失败')
        }
      },
    })
  }

  const viewChunks = (doc: DocumentItem) => {
    setSelectedDoc(doc)
    setChunkOpen(true)
    setChunkLoading(true)
    docApi
      .chunks(doc.id)
      .then(setChunks)
      .catch((e: ApiError) => message.error(e.message || '加载分块失败'))
      .finally(() => setChunkLoading(false))
  }

  const columns = [
    { title: '文档标题', dataIndex: 'title', key: 'title', width: 220, render: (v: string) => <Text strong style={{ fontSize: 13 }}>{v}</Text> },
    {
      title: '类型', dataIndex: 'fileType', key: 'fileType', width: 90,
      render: (v: string) => (
        <Tag style={{ background: fileTypeColors[v] || '#f9fafb', color: '#475467', border: 'none', borderRadius: 4, fontSize: 12 }}>{v}</Tag>
      ),
    },
    { title: '状态', dataIndex: 'status', key: 'status', width: 100, render: (v: DocumentItem['status']) => <StatusTag type={v} /> },
    {
      title: '进度', dataIndex: 'progress', key: 'progress', width: 120,
      render: (p: number | undefined, r: DocumentItem) =>
        r.status === 'indexing' ? <Progress percent={p || 0} size="small" /> : <Text style={{ color: '#667085', fontSize: 12 }}>--</Text>,
    },
    { title: '块数', dataIndex: 'chunkCount', key: 'chunkCount', width: 70 },
    { title: '大小', dataIndex: 'sizeKb', key: 'sizeKb', width: 80, render: (v: number) => `${(v / 1024).toFixed(1)} MB` },
    { title: '更新时间', dataIndex: 'updatedAt', key: 'updatedAt', width: 170 },
    {
      title: '操作', key: 'actions', width: 180,
      render: (_: unknown, r: DocumentItem) => (
        <Space size={0}>
          <Tooltip title="查看分块"><Button type="link" size="small" icon={<EyeOutlined />} onClick={() => viewChunks(r)} /></Tooltip>
          {canManage && <Tooltip title="重建索引"><Button type="link" size="small" icon={<ReloadOutlined />} onClick={() => handleReindex(r)} /></Tooltip>}
          {canManage && <Tooltip title="删除"><Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(r)} /></Tooltip>}
        </Space>
      ),
    },
  ]

  return (
    <PageContainer title="文档管理" breadcrumb={[{ label: '文档管理' }]} extra={
      canUpload ? (
        <Button type="primary" icon={<UploadOutlined />} onClick={() => setUploadOpen(true)} disabled={!selectedKb}>
          上传文档
        </Button>
      ) : null
    }>
      <div style={{ marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
        <FilterOutlined style={{ color: '#667085' }} />
        <Text style={{ fontSize: 13, color: '#667085' }}>知识库：</Text>
        <Select
          style={{ width: 240 }}
          placeholder="全部知识库"
          allowClear
          value={selectedKb}
          onChange={(v) => {
            setSelectedKb(v || null)
            if (v) {
              setSearchParams({ kbId: String(v) })
            } else {
              setSearchParams({})
            }
          }}
          options={kbs.map((k) => ({ label: k.name, value: k.id }))}
        />
      </div>

      <Table
        dataSource={docs}
        columns={columns}
        rowKey="id"
        size="middle"
        loading={loading}
        pagination={{ pageSize: 15, showTotal: (t) => `共 ${t} 条` }}
        scroll={{ x: 1200 }}
      />

      <Modal title="上传文档" open={uploadOpen} onOk={handleUpload} confirmLoading={uploading} onCancel={() => setUploadOpen(false)} okText="上传" cancelText="取消" destroyOnClose>
        <Form layout="vertical">
          <Form.Item label="选择文件" required>
            <Upload
              maxCount={1}
              fileList={fileList}
              beforeUpload={() => false}
              onChange={({ fileList: fl }) => setFileList(fl)}
            >
              <Button icon={<UploadOutlined />}>选择文件</Button>
            </Upload>
            <Text style={{ fontSize: 12, color: '#98a2b3' }}>支持 PDF / Word / Markdown / TXT / HTML</Text>
          </Form.Item>
        </Form>
      </Modal>

      <Drawer title={`文档分块 - ${selectedDoc?.title || ''}`} open={chunkOpen} onClose={() => setChunkOpen(false)} width={640}>
        <Table
          dataSource={chunks}
          rowKey="id"
          loading={chunkLoading}
          columns={[
            { title: '序号', dataIndex: 'chunkIndex', key: 'chunkIndex', width: 50 },
            { title: '标题路径', dataIndex: 'titlePath', key: 'titlePath', width: 120, ellipsis: true },
            { title: '内容预览', dataIndex: 'content', key: 'content', ellipsis: true },
            { title: '页码', dataIndex: 'sourcePage', key: 'sourcePage', width: 60 },
          ]}
          pagination={false}
          size="small"
        />
      </Drawer>
    </PageContainer>
  )
}

export default DocumentList
