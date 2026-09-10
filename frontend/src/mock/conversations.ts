import type { Conversation } from '../types'

export const conversations: Conversation[] = [
  {
    id: 1, userId: 1, title: '公司年假有多少天', kbId: 1, kbName: '考勤与假期制度', messageCount: 4, updatedAt: '2026-07-24 10:30:00',
    messages: [
      { id: 1, role: 'user', content: '公司年假有多少天？', citations: undefined, createdAt: '2026-07-24 10:29:00' },
      { id: 2, role: 'assistant', content: '根据公司考勤管理办法 v3.2，员工每年享有带薪年假天数与工龄挂钩：\n\n1. 累计工作满 1 年不满 10 年：**5 天**\n2. 累计工作满 10 年不满 20 年：**10 天**\n3. 累计工作满 20 年及以上：**15 天**\n\n年假可分次使用，但每次至少申请半天。当年未休完的年假可顺延至次年第一季度。', citations: [{ docId: 101, title: '考勤管理办法 v3.2.pdf', page: 12, snippet: '员工每年享有带薪年假...累计工作满1年不满10年者，每年享受5天年假...' }, { docId: 102, title: '年假与调休申请指南.docx', page: 3, snippet: '年假可分次使用，每次至少申请半天...未休完年假可顺延至次年第一季度...' }], createdAt: '2026-07-24 10:29:30' },
      { id: 3, role: 'user', content: '新入职员工第一年怎么算？', createdAt: '2026-07-24 10:30:00' },
      { id: 4, role: 'assistant', content: '新入职员工在第一年不享有带薪年假。根据公司规定，员工需在试用期满且连续工作满 12 个月后，方可享受当年对应的年假天数。具体以入职日期为起点计算，满一年后按实际剩余月份折算年假天数。', citations: [{ docId: 101, title: '考勤管理办法 v3.2.pdf', page: 13, snippet: '新员工入职第一年不享有带薪年假，试用期满且连续工作满12个月后...' }], createdAt: '2026-07-24 10:30:20' },
    ],
  },
  {
    id: 2, userId: 2, title: '产品 A 的部署步骤', kbId: 2, kbName: '产品手册', messageCount: 2, updatedAt: '2026-07-24 09:15:00',
    messages: [
      { id: 5, role: 'user', content: '产品 A 如何部署到生产环境？', createdAt: '2026-07-24 09:14:00' },
      { id: 6, role: 'assistant', content: '产品 A 的部署步骤如下：\n\n1. **环境准备**：JDK 17+、Maven 3.8+、MySQL 8.0+\n2. **代码检出并编译**：`git clone` 后执行 `mvn clean package -Pprod`\n3. **数据库初始化**：执行 `init-db.sql` 创建库表\n4. **配置更新**：修改 `application-prod.yml` 中的数据库连接与 Redis 地址\n5. **启动服务**：`java -jar product-a.jar`\n6. **健康检查**：访问 `/actuator/health` 确认就绪\n\n详细说明请参阅产品 A 用户手册第 5-8 章。', citations: [{ docId: 201, title: '产品 A 用户手册 v4.0.pdf', page: 45, snippet: '生产环境部署需确保 JDK 17+、Maven 3.8+、MySQL 8.0+ 环境就绪...' }], createdAt: '2026-07-24 09:15:00' },
    ],
  },
  {
    id: 3, userId: 1, title: 'Java 编码规范查询', kbId: 3, kbName: '技术规范与标准', messageCount: 3, updatedAt: '2026-07-23 16:20:00',
    messages: [
      { id: 7, role: 'user', content: 'Java 中命名规范是怎样的？', createdAt: '2026-07-23 16:18:00' },
      { id: 8, role: 'assistant', content: 'Java 编码命名规范要点：\n\n- **类名**：大驼峰（UpperCamelCase），如 `UserService`\n- **方法名**：小驼峰（lowerCamelCase），如 `getUserById`\n- **常量**：全大写下划线分隔，如 `MAX_RETRY_COUNT`\n- **包名**：全小写，如 `com.company.project.modules`\n- **布尔变量**：以 is/has/can 开头，如 `isActive`', citations: [{ docId: 301, title: 'Java 编码规范 v2.1.md', page: 1, snippet: '类名采用大驼峰命名...方法名采用小驼峰命名...常量全大写下划线分隔...' }], createdAt: '2026-07-23 16:19:00' },
      { id: 9, role: 'user', content: '异常处理有什么规范？', createdAt: '2026-07-23 16:20:00' },
      { id: 10, role: 'assistant', content: '异常处理规范：\n\n1. 不允许 catch 后忽略异常（空 catch 块）\n2. 不要在循环中使用 try-catch\n3. 业务异常使用自定义异常类，继承 `RuntimeException`\n4. 异常信息应包含上下文关键字段\n5. 避免使用异常做流程控制', citations: [{ docId: 301, title: 'Java 编码规范 v2.1.md', page: 4, snippet: '异常处理：不允许空catch块，不要在循环中使用try-catch...' }], createdAt: '2026-07-23 16:20:00' },
    ],
  },
  {
    id: 4, userId: 3, title: '差旅报销标准', kbId: 4, kbName: '财务报销制度', messageCount: 2, updatedAt: '2026-07-22 14:00:00',
    messages: [
      { id: 11, role: 'user', content: '出差住宿费标准是多少？', createdAt: '2026-07-22 13:59:00' },
      { id: 12, role: 'assistant', content: '根据公司差旅费报销细则：\n\n- **一线城市**（北上广深）：500 元/晚\n- **省会城市**：400 元/晚\n- **其他城市**：300 元/晚\n- **境外出差**：按当地中档酒店标准，实报实销上限 150 美元/晚\n\n超出标准部分原则上不予报销，特殊情况需提前审批。', citations: [{ docId: 401, title: '差旅费报销细则.pdf', page: 2, snippet: '住宿费标准：一线城市500元/晚，省会城市400元/晚...' }], createdAt: '2026-07-22 14:00:00' },
    ],
  },
  {
    id: 5, userId: 2, title: '信息安全合规要求', kbId: 6, kbName: '安全管理规范', messageCount: 2, updatedAt: '2026-07-20 11:00:00',
    messages: [
      { id: 13, role: 'user', content: '敏感数据如何分级？', createdAt: '2026-07-20 10:58:00' },
      { id: 14, role: 'assistant', content: '公司数据分为四个安全等级：\n\n1. **公开级**：对外可公开信息（产品白皮书、新闻稿）\n2. **内部级**：仅限内部员工（制度文档、培训材料）\n3. **机密级**：部门内限定（财务数据、人事档案、技术方案）\n4. **绝密级**：高管与安全团队（核心算法、战略规划）\n\n各等级对应不同的存储、传输与访问控制策略。', citations: [{ docId: 601, title: '信息安全管理制度.pdf', page: 8, snippet: '数据按重要性分为四个等级：公开级、内部级、机密级、绝密级...' }], createdAt: '2026-07-20 11:00:00' },
    ],
  },
]
