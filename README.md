# 企业级 RAG 知识库系统

这是一个前后端分离的企业级 RAG（Retrieval-Augmented Generation，检索增强生成）知识库系统，支持知识库管理、文档上传与解析、混合检索、流式问答、会话历史、任务中心、用户与角色权限以及审计日志等功能。

## 项目结构

```text
rag/
├── backend/                 # FastAPI 后端
│   ├── app/
│   │   ├── routers/          # 鉴权、知识库、文档、问答、会话、管理等接口
│   │   ├── services/         # RAG、解析、索引、LLM、Redis、ES 等服务
│   │   ├── models.py         # 数据库模型
│   │   └── main.py           # 应用入口
│   ├── sql/rag_kb.sql        # MySQL 初始化脚本
│   ├── .env                  # 本地环境配置
│   └── requirements.txt      # Python 依赖
├── frontend/                # React + Vite 前端
│   ├── src/pages/             # 登录、仪表盘、知识库、文档、问答等页面
│   ├── src/api/               # 后端 API 调用
│   ├── package.json           # Node.js 依赖与脚本
│   └── vite.config.ts         # Vite 配置及 API 代理
└── 示例文档/                 # 可用于上传测试的示例文档
```

## 技术栈

### 后端

- Python 3.12
- FastAPI、Uvicorn
- Pydantic、Pydantic Settings
- SQLAlchemy、PyMySQL、MySQL
- Redis
- Elasticsearch（关键词检索与向量/混合检索）
- LangGraph（RAG 流程编排）
- OpenAI 兼容协议（可接入 DeepSeek 或其他兼容模型）
- pypdf、python-docx、Markdown、BeautifulSoup、lxml（文档解析）
- PyJWT、bcrypt（鉴权与密码安全）

### 前端

- React 18
- TypeScript
- Vite
- React Router
- Ant Design、@ant-design/icons
- Day.js

## 运行环境

建议准备以下环境：

- Windows、macOS 或 Linux
- Python 3.12+
- Node.js 18+
- npm
- MySQL 8+
- Redis
- Elasticsearch 8+

## 后端配置

后端配置文件为 `backend/.env`。首次使用时，请根据本地环境修改以下配置：

```dotenv
DATABASE_URL=mysql+pymysql://用户名:密码@127.0.0.1:3306/rag_kb?charset=utf8mb4
REDIS_URL=redis://127.0.0.1:6379/3
ELASTICSEARCH_URL=http://127.0.0.1:9200
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=你的 Elasticsearch 密码
LLM_API_KEY=你的模型 API Key
LLM_BASE_URL=https://api.deepseek.com/v1
LLM_MODEL=deepseek-chat
LLM_ENABLED=true
```

如果暂时不接入大模型，可将 `LLM_ENABLED=false` 或清空 `LLM_API_KEY`，问答功能将使用项目内置的回退逻辑。生产环境请务必替换 `APP_SECRET_KEY`，并妥善保管数据库、Elasticsearch 和模型密钥。

## 初始化数据库

先创建 MySQL 数据库：

```sql
CREATE DATABASE rag_kb DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

然后执行初始化脚本：

```bash
mysql -u root -p rag_kb < backend/sql/rag_kb.sql
```

也可以使用 MySQL Workbench、Navicat 等工具打开并执行 `backend/sql/rag_kb.sql`。

同时确保 Redis 和 Elasticsearch 已启动。后端启动时会自动检查 Elasticsearch，并在需要时创建索引。

## 安装后端依赖

在项目根目录执行：

### Windows PowerShell

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

如果系统没有 `py` 命令，可将第一条命令中的 `py` 替换为 `python`。

### macOS / Linux

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
```

## 启动后端

在 `backend` 目录并激活虚拟环境后执行：

```powershell
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

后端地址：

- API 根地址：http://127.0.0.1:8000
- 健康检查：http://127.0.0.1:8000/api/health
- Swagger 文档：http://127.0.0.1:8000/docs

健康接口会返回 Elasticsearch、Redis 和大模型配置的可用状态。

## 安装前端依赖

新开一个终端，在项目根目录执行：

```powershell
cd frontend
npm ci
```

项目包含 `package-lock.json`，推荐使用 `npm ci` 保证依赖版本一致。如果没有锁文件或需要更新依赖，也可以使用：

```powershell
npm install
```

## 启动前端

在 `frontend` 目录执行：

```powershell
npm run dev
```

前端地址：http://localhost:5173/

Vite 已配置 `/api` 代理，会将前端请求转发到 `http://127.0.0.1:8000`。因此启动前端前请先启动后端。

如需让局域网内其他设备访问，可执行：

```powershell
npm run dev -- --host 0.0.0.0
```

## 常用命令

前端生产构建：

```powershell
cd frontend
npm ci
npm run build
```

构建完成后，静态文件会生成在 `frontend/dist/` 目录。部署到已有 Nginx 时，将该目录内的全部文件上传到站点根目录，并由 Nginx 将 `/api/` 请求反向代理至 FastAPI 后端。

预览生产构建：

```powershell
npm run preview
```

## 启动顺序

推荐使用两个终端窗口：

终端一启动后端：

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

终端二启动前端：

```powershell
cd frontend
npm ci
npm run dev
```

启动完成后访问 http://localhost:5173/。

## 注意事项

- `backend/.env` 可能包含本地数据库密码和第三方 API Key，不要将真实密钥提交到公开代码仓库。
- 如果健康检查中 Elasticsearch 或 Redis 为 `false`，请先确认对应服务已启动，并检查 `backend/.env` 中的连接配置。
- 如果问答请求返回模型鉴权错误，请检查 `LLM_API_KEY`、`LLM_BASE_URL` 和 `LLM_MODEL` 是否匹配服务商配置。
- 上传文件默认保存到 `UPLOAD_DIR` 指定的目录，默认值为 `./data/uploads`。
