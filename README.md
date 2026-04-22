# TaxPilot · 互动税务策略工具

> 美国中高收入家庭的交互式税务决策引擎 · 覆盖 W2 · 1099 · 多州房产 · 投资 · 富人场景

**Live**: 部署到 Cloudflare Pages · 单文件 React · Vite + Tailwind

---

## 特性

**46 个真实身份原型** · 6 组

- 初入职场（7）· 家庭中产（6）· 跨州通勤（5）
- 自雇副业（7）· 财富阶梯（16 · 含 6 个 $500K-$2.5M 超高净值）· 投资混合（5）

**44 道常见税务误区** · 分 3 页

- **最热问题**（16）· 华人高频搜：绿卡回国 · H1B 境内外 · 父母 $10 万首付 · Zelle 收租 · RSU vest · ISO AMT · 529 · PFIC …
- **经典误区**（16）· QBI · SALT · S-Corp · Backdoor Roth · Mega Backdoor · HSA · 跨州 Convenience Rule …
- **进阶·富人/特殊**（12）· QSBS §1202 · 1031 Exchange · DAF · 家族信托 · REPS …

**30+ 术语词典** · 任何地方点 `?` 看解释
NIIT · AMT · QBI · QSBS · 1031 · DAF · PTE · SALT · MAGI · FEIE · FBAR · FATCA · REPS · Cost Seg · Mega Backdoor · Backdoor Roth · HSA · CTC · Safe Harbor · W-4 · CEMA · Mansion Tax · ISO · RSU · EITC · FSA · DCFSA · REIT · SEP · SIMPLE

**关键计算功能**

- 联邦 + 州税（50 州 + NYC/Yonkers/Portland OR/SF Bay）
- 边际税率 · 有效税率 · AMT · NIIT · Additional Medicare · QBI 20%
- SE Tax · Schedule C · Schedule E · Itemize vs Standard 自动较大者
- CEMA · Mansion Tax · 1031 Exchange · Convenience Rule
- 1040-ES 季度预缴 · Safe Harbor A/B · Form 2210 罚金预估
- 智能情景一段话叙述 · 详情弹窗 · 针对身份的 Top 5 建议路径

**12 张 IRS 仿真表** · 英文原版 + 中文翻译
Form 1040 · Schedule 1/2/3/A/C/D/E/SE · Form 8606 · 8889 · 8995 · 8959 · NY IT-201 · NJ NJ-1040 · CA 540

---

## 运行

```bash
# 安装依赖
npm install

# 本地开发
npm run dev

# 生产构建
npm run build

# 预览构建产物
npm run preview
```

构建产物在 `dist/` · ~145 KB gzipped。

---

## 部署到 Cloudflare Pages

1. 连接 GitHub 仓库
2. Build command: `npm run build`
3. Build output directory: `dist`
4. 无需环境变量

---

## 技术栈

- **React 18** · 单文件组件 · 约 12,500 行
- **Vite 6** · 快速构建
- **Tailwind 3** · 排版通过 `style={}` 控制 · Tailwind 主要用 utility
- **Typefaces**：Fraunces（数字）· Noto Sans SC（中文）· JetBrains Mono · Helvetica · Times
- **持久化**：`window.storage`（Anthropic artifact host 的 key-value 存储）· 部署到 Cloudflare Pages 可改为 `localStorage`

---

## 架构

### `src/App.jsx`

单文件 React · 约 12,500 行 · 结构：

- **设计 tokens**（~100 行）：颜色 · 字体 · 常量
- **税务常量**（~500 行）：2025 税档 · 标准扣除 · IRA/401k/HSA 上限 · SALT · QBI phase-out · 50 州税率 · 城市税 · Convenience Rule 州列表
- **PRESETS + PERSONAS + PERSONA_GROUPS**（~2,000 行）：46 身份
- **MYTHS**（~700 行）：44 误区 + 分类 + 术语
- **computeTax(inputs)**（~500 行）：联邦 + 州税 + FICA + SE + AMT + NIIT + QBI 全量计算
- **findOpportunities + opportunityTimeline**（~500 行）：省税机会识别
- **组件**（~8,000 行）：Hero / InputPanel / SavingsTuner / QuarterlyBudget / ActionTimeline / MythStrip / IRS Forms / ScenarioDetailModal / GlossaryModal / PersonaPicker / Wizard

### 为什么单文件

- 编辑更快（Cmd+F 查东西不用在 30 个文件间跳）
- 部署简单（打包后是单文件 JS · 约 470 KB · 145 KB gzipped）
- 协作代码审查容易（整个产品逻辑一屏看完）

---

## 数据隐私

- **100% 本地**：所有输入通过浏览器 `window.storage` 保存在本地
- **零后端**：没有服务器 · 没有 API 请求 · 没有 tracking
- **刷新不丢**：浏览器关掉再打开仍有之前的输入

---

## 贡献

欢迎提 issue / PR：

- 新增 persona（特别是冷门场景：F1 OPT 年 6 · J1 postdoc · 跨境远程 …）
- 修正税务规则（每年 IRS Pub 17 / 州 DTF 更新）
- 新增州支持（当前 50 州联邦+州完整 · 城市税仅 NYC/Yonkers/Portland/SF）

---

## License

MIT · see LICENSE

---

## 致谢

- IRS Pub 17 · Pub 334 · Pub 527 · Pub 587
- NY DTF · NJ Treasury · CA FTB 官方材料
- 各州 Department of Revenue
- 所有在小红书上分享踩坑经历的华人家庭 · 你们的问题成就了「最热问题」16 题
