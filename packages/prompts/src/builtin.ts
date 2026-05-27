import type { PromptTemplate } from "@coding-helper/shared";

export const BUILTIN_PROMPTS: PromptTemplate[] = [
  // 需求澄清
  {
    id: "req-user-story",
    stageId: "requirements",
    title: "用户故事拆解",
    description: "将模糊需求拆为可开发的用户故事与验收标准",
    body: `你是一位产品技术顾问。请根据以下需求描述，输出用户故事列表（As a / I want / So that）及每条故事的验收标准（Given-When-Then）。

## 需求描述
（请在此粘贴 PRD 或需求原文）

## 上下文
- 工作区: {{workspaceName}}
- 相关文件: {{filePath}}

## 输出格式
1. 用户故事表（优先级 P0/P1/P2）
2. 边界与异常场景清单
3. 待澄清问题（不超过 5 条）`,
    tags: ["内置", "需求"],
    builtin: true,
  },
  {
    id: "req-acceptance",
    stageId: "requirements",
    title: "验收标准生成",
    description: "为已有功能描述补充可测试的验收标准",
    body: `请为以下功能补充完整验收标准，每条必须可测试、可判定通过/失败。

## 功能说明
{{selection}}

## 要求
- 使用 Given / When / Then
- 覆盖正常路径、边界、权限、错误提示
- 标注是否需要自动化测试`,
    tags: ["内置"],
    builtin: true,
  },
  {
    id: "req-boundary",
    stageId: "requirements",
    title: "边界与异常场景追问",
    description: "系统化追问边界条件与失败场景",
    body: `针对以下需求/代码上下文，列出应确认的边界与异常场景，并说明业务上应如何处理。

## 上下文
- 工作区: {{workspaceName}}
- 文件: {{filePath}}
- 选区: 
\`\`\`
{{selection}}
\`\`\`

请按：输入边界、并发、超时、权限、数据一致性、降级策略 分类输出。`,
    tags: ["内置"],
    builtin: true,
  },
  {
    id: "req-invest",
    stageId: "requirements",
    title: "INVEST 检查",
    description: "检查用户故事是否符合 INVEST 原则",
    body: `请用 INVEST（Independent, Negotiable, Valuable, Estimable, Small, Testable）逐条评估以下用户故事，并给出改写建议。

{{selection}}`,
    tags: ["内置"],
    builtin: true,
  },
  // 技术选型
  {
    id: "tech-compare",
    stageId: "tech-selection",
    title: "多方案对比表",
    description: "结构化对比 2–4 个技术方案",
    body: `请针对以下场景给出 2–4 个技术方案对比表。

## 场景
{{selection}}

## 对比维度
| 维度 | 方案 A | 方案 B | 方案 C |
| 实现复杂度 | | | |
| 运维成本 | | | |
| 性能 | | | |
| 团队熟悉度 | | | |
| 风险 | | | |

最后给出推荐方案与决策理由（含不选其他方案的原因）。`,
    tags: ["内置", "架构"],
    builtin: true,
  },
  {
    id: "tech-nfr",
    stageId: "tech-selection",
    title: "非功能需求约束",
    description: "梳理性能、安全、可用性等非功能约束",
    body: `根据以下项目背景，列出应明确的非功能需求（NFR）及建议指标。

- 工作区: {{workspaceName}}

## 背景
{{selection}}

请覆盖：性能、可用性、安全、可观测性、扩展性、合规。每条给出可量化指标或验证方式。`,
    tags: ["内置"],
    builtin: true,
  },
  {
    id: "tech-debt",
    stageId: "tech-selection",
    title: "技术债评估",
    description: "评估引入或偿还技术债的代价",
    body: `请评估以下代码/设计中的技术债，按影响与偿还成本排序。

\`\`\`{{language}}
{{selection}}
\`\`\`

输出：债务描述、影响面、建议偿还方式、是否应在当前迭代处理。`,
    tags: ["内置"],
    builtin: true,
  },
  // 设计评审
  {
    id: "design-consistency",
    stageId: "design-review",
    title: "需求一致性检查",
    description: "检查实现与 PRD/接口文档的一致性",
    body: `请对照需求与实现，检查一致性缺口。

## 工作区
{{workspaceName}}

## 实现片段
\`\`\`{{language}}
{{selection}}
\`\`\`

输出：一致项、不一致项（含证据）、建议修改。`,
    tags: ["内置"],
    builtin: true,
  },
  {
    id: "design-api",
    stageId: "design-review",
    title: "API 契约评审",
    description: "评审 REST/GraphQL 接口设计",
    body: `请评审以下 API 设计（路径、方法、请求/响应、错误码、版本策略）。

{{selection}}

关注：命名、幂等性、分页、鉴权、向后兼容、错误语义。`,
    tags: ["内置", "API"],
    builtin: true,
  },
  {
    id: "design-security",
    stageId: "design-review",
    title: "安全与权限清单",
    description: "安全设计检查清单",
    body: `针对以下模块做安全评审清单（勾选式 + 发现项）。

文件: {{filePath}}
\`\`\`{{language}}
{{selection}}
\`\`\`

覆盖：认证、授权、输入校验、敏感数据、日志脱敏、依赖漏洞、CSRF/XSS/注入。`,
    tags: ["内置", "安全"],
    builtin: true,
  },
  // 编码实现
  {
    id: "impl-skeleton",
    stageId: "implementation",
    title: "模块骨架生成",
    description: "按项目风格生成模块骨架",
    body: `根据以下上下文，生成符合项目风格的模块骨架（仅结构，逻辑用 TODO 标注）。

- 语言: {{language}}
- 文件: {{filePath}}
- 工作区: {{workspaceName}}

## 需求
{{selection}}

输出完整可编译骨架，并说明文件应放置位置。`,
    tags: ["内置"],
    builtin: true,
  },
  {
    id: "impl-error",
    stageId: "implementation",
    title: "错误处理策略",
    description: "为模块设计统一错误处理",
    body: `为以下代码设计错误处理策略（错误类型、传播、用户提示、日志级别）。

\`\`\`{{language}}
{{selection}}
\`\`\`

给出改进后的代码示例与约定说明。`,
    tags: ["内置"],
    builtin: true,
  },
  {
    id: "impl-observability",
    stageId: "implementation",
    title: "日志与可观测性",
    description: "补充日志、指标、追踪埋点建议",
    body: `分析以下代码，建议应增加的日志、指标（Metrics）与追踪（Trace）埋点。

\`\`\`{{language}}
{{selection}}
\`\`\`

每条埋点说明：触发时机、字段、级别、避免的 PII。`,
    tags: ["内置"],
    builtin: true,
  },
  {
    id: "impl-refactor-small",
    stageId: "implementation",
    title: "小步重构建议",
    description: "在不改行为前提下的小步重构",
    body: `对以下选区给出小步重构步骤（每步可独立提交、可验证）。

\`\`\`{{language}}
{{selection}}
\`\`\``,
    tags: ["内置"],
    builtin: true,
  },
  // Code Review
  {
    id: "cr-impact",
    stageId: "code-review",
    title: "变更影响面分析",
    description: "基于选区分析上下游影响与回归点",
    body: `你是一位资深工程师，请对以下代码变更做影响面分析。

## 上下文
- 工作区: {{workspaceName}}
- 文件: {{filePath}}
- 语言: {{language}}

## 选中的代码
\`\`\`{{language}}
{{selection}}
\`\`\`

## 输出要求
1. 直接影响模块与调用链
2. 需回归的测试范围
3. 潜在风险（性能、兼容、数据）`,
    tags: ["内置", "CR"],
    builtin: true,
    favorite: true,
  },
  {
    id: "cr-naming",
    stageId: "code-review",
    title: "命名与可读性审查",
    description: "检查命名、函数长度、注释",
    body: `请审查以下代码的命名与可读性，给出具体改名建议（旧名 → 新名 + 理由）。

\`\`\`{{language}}
{{selection}}
\`\`\``,
    tags: ["内置", "CR"],
    builtin: true,
  },
  {
    id: "cr-perf",
    stageId: "code-review",
    title: "性能与并发风险",
    description: "识别性能与并发问题",
    body: `审查以下代码的性能与并发风险（N+1、锁、热路径分配、阻塞 IO 等）。

\`\`\`{{language}}
{{selection}}
\`\`\`

按严重程度分级并给出修复思路。`,
    tags: ["内置", "CR", "后端"],
    builtin: true,
  },
  {
    id: "cr-full",
    stageId: "code-review",
    title: "完整 Code Review",
    description: "按 Blocker/Major/Minor/Nit 分级输出",
    body: `你是一位资深工程师，请对以下代码做 Code Review。

## 上下文
- 工作区: {{workspaceName}}
- 文件: {{filePath}}
- 语言: {{language}}

## 代码
\`\`\`{{language}}
{{selection}}
\`\`\`

## 输出要求
1. 按 Blocker / Major / Minor / Nit 分级
2. 每条注明位置与修复建议
3. 最后给出「是否建议合并」结论`,
    tags: ["内置", "CR"],
    builtin: true,
    favorite: true,
  },
  {
    id: "cr-tests",
    stageId: "code-review",
    title: "测试覆盖审查",
    description: "评估变更是否具备足够测试",
    body: `针对以下变更，评估测试是否充分，并列出应补充的测试用例（单元/集成/E2E）。

\`\`\`{{language}}
{{selection}}
\`\`\``,
    tags: ["内置", "CR"],
    builtin: true,
  },
  // 测试与发布
  {
    id: "test-cases",
    stageId: "test-release",
    title: "测试用例补全",
    description: "根据实现补充测试用例",
    body: `根据以下实现，补全测试用例表（用例名、前置、步骤、期望、类型）。

\`\`\`{{language}}
{{selection}}
\`\`\``,
    tags: ["内置", "测试"],
    builtin: true,
  },
  {
    id: "test-regression",
    stageId: "test-release",
    title: "回归范围建议",
    description: "发布前回归测试范围",
    body: `本次变更涉及：
- 文件: {{filePath}}
- 工作区: {{workspaceName}}

\`\`\`{{language}}
{{selection}}
\`\`\`

请列出回归范围（模块、接口、UI 流程）与优先级。`,
    tags: ["内置"],
    builtin: true,
  },
  {
    id: "test-release-checklist",
    stageId: "test-release",
    title: "发布检查清单",
    description: "上线前检查项",
    body: `为以下变更生成发布检查清单（配置、迁移、回滚、监控、公告、权限）。

{{selection}}

输出可勾选的 Markdown 清单。`,
    tags: ["内置"],
    builtin: true,
  },
  // 排障与重构
  {
    id: "debug-rca",
    stageId: "debug-refactor",
    title: "根因分析五步",
    description: "结构化根因分析",
    body: `请对以下问题/日志/代码进行五步根因分析（现象、时间线、假设、验证、根因与修复）。

## 上下文
{{filePath}}

\`\`\`{{language}}
{{selection}}
\`\`\``,
    tags: ["内置"],
    builtin: true,
  },
  {
    id: "debug-minimal-fix",
    stageId: "debug-refactor",
    title: "最小改动修复",
    description: "在理解根因后给出最小修复",
    body: `已知问题描述与相关代码如下，请给出最小改动修复方案（含代码 diff 思路），避免过度重构。

\`\`\`{{language}}
{{selection}}
\`\`\``,
    tags: ["内置"],
    builtin: true,
  },
  {
    id: "debug-refactor-plan",
    stageId: "debug-refactor",
    title: "最小改动重构计划",
    description: "分阶段重构计划",
    body: `为以下遗留代码制定最小风险重构计划（分阶段、每阶段可交付、可回滚）。

\`\`\`{{language}}
{{selection}}
\`\`\`

输出：阶段、目标、改动范围、验证方式、风险。`,
    tags: ["内置"],
    builtin: true,
  },
  {
    id: "debug-log-analysis",
    stageId: "debug-refactor",
    title: "日志分析助手",
    description: "从日志片段推断问题",
    body: `分析以下日志片段，推断可能原因与下一步排查命令/断点位置。

\`\`\`
{{selection}}
\`\`\`

工作区: {{workspaceName}}`,
    tags: ["内置"],
    builtin: true,
  },
];

export const BUILTIN_VERSION = "1.0.0";
