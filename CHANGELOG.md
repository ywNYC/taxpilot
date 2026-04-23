# TaxPilot 版本日志

## v119 · 内测 v1.5

**省税调节器同步已有供款**（反馈：调节器不反映已执行）

用户困惑：Wizard 已存 401(k) $29,500 · 但调节器 action list 显示"存 $0"

根因：opp.contrib 是"gap to fill"（还能再存的差额）· slider 0% → 都 $0
用户想看到"我已经做了什么"的状态同步

### 改进

**A) Tuner baseline 计算**（不改 slider 初始位置 · 避免混淆）
- tunerBaselinePct = (已存 401k + HSA + Solo401k) / (已存 + 还能存)
- 传入 SavingsTuner 作 baselinePct prop

**B) Slider 上方显示"✓ 你已完成 63%" baseline 提示**
- 灰色小字 · 说明 "slider 代表还能再做多少"
- 消除"为啥我存了还显示 0"的误解

**C) Slider 拇指上方加浮动百分比 bubble**
- 跟着 thumb 移动 · 显示当前 pct%
- 替代 / 补充底部的 "{pct}% 执行" 标签

**D) "立即省 $X · 假设全做 $Y" 双模式 label**
- 让用户在拖动时实时看"假设全做完 · 再省多少"
- 帮用户理解"这个 slider 是相对于 baseline 的增量"

---

## v120 · 内测 v1.6

**Tuner 新增 reverse mode（"收回"模式）**

用户需求：想看"如果我不做这些事 / 少做一半 · 会多交多少税"

### 设计

- SavingsTuner slider 允许拖到左边（< baseline）· 进入 "reverse" mode
- reverse mode 下：
  - action list 显示红色"收回 $X" 和"多交 $Y"
  - Hero 颜色变 pay 色系
  - 标题从"再省" 换成"假设撤销"

---

## v121-v123 · 内测 v1.7-v1.9

**分配模式 · proportional / priority / efficient**

**v121**：把当前按"一刀切"比例分 · 变成支持三种策略
- **proportional**：按每个机会的 contrib 比例摊（默认）
- **priority**：按 OPP_PRIORITY 表排序 · 先把高优先级填满再填下一个
- **efficient**：按 saving/contrib 比排序 · 回本率高的先填

**v122**：UI 加 toggle（平均 / 实用 / 最优）· style 用 SegButton
- 默认 priority · 其它可选

**v123**：defer custom drag-reorder（未来可以让用户手动排）

---

## v124 · 内测 v2.0

**Wizard Step 2 工作州改 3-selector**（InputPanel 独立 · Wizard 未同步）
- 选择模式 · local / remote / hybrid 三种
- 显示 convenience rule warning
- MFJ 双工作州支持

---

## v125-v127 · 内测 v2.1-v2.3

**SavingsTuner bubble 对齐优化 · 反复迭代**
- 思路：CSS ::-webkit-slider-thumb 18×18 + pct×0.18 compensation
- bubble 跟着 thumb 中心走 · 不再浮动在偏移位置
- 残留问题：pct=0 / pct=100 边缘有 ~9px 残差

---

## v128 · 内测 v2.4

**ContribYTDCalc · YTD 供款估算器**

用户困惑：不记得今年已存多少 401k · 但记得"每张工资存 6%"或"每期 $200"

### 新组件
- `<ContribYTDCalc>` 在 k401 / hsa slider 下方折叠式
- 两种模式：% of pay / fixed $ per paycheck
- 支持 weekly / biweekly / semimonthly / monthly
- 计算：periodsElapsed = floor(totalPeriods × daysElapsed / 365)
- Apply 后自动填入 slider

---

## v129 · 内测 v2.5

**UI 简化**
- 删除所有 preset 按钮（10% / 25% / 50%）
- 删除 baseline tick dashed line
- bubble baseline 态 72px 宽（ink bg · white text · "当前 · 5.9%"）
- 磁吸：slider 在 ±0.5% 范围内吸回 baseline（唯一的 baseline-return 机制）
- 删除 emoji 残留（🔒 → § · 📋 → §）

---

## v130 · 内测 v2.6

**Cost Segregation opt-in**
- p.costSeg 默认 false
- 关闭时在 plans section 显示为 info 卡"考虑 Cost Seg? · 潜省 $X"（saving:0）
- 勾选后才计入省税
- Wizard Step 3 rental 补充：年租金收入 / 运营费用 / 折旧 sliders · 之前只有 mortInt + propertyTax
- Rental 默认值：rentalIncome:24000 · rentalExpenses:4000 · depreciation:8000

---

## v131 · 内测 v2.7

**真实工资单 · §125 保险 premium + 州 PFML + 月到手**

反馈：税负不够真实 · 缺 SSI/FMLA/医保/牙/眼 + 月到手

### 引擎

- 新常量 `STATE_PFML_2025`（9 州 · 2025 rate）：
  - NY PFL / NJ FLI / MA PFML / WA PFML / RI TCI / CT PFML / OR Paid Leave / CO FAMLI / MD FAMLI
  - CA SDI 已单独处理（1.2% 无上限 · 老代码）
- `healthPremium` / `dentalPremium` / `visionPremium`（月度）
- `premiumSpending = (health + dental + vision) × 12`
- `aboveLine` 加 premiumSpending → 减 AGI → 减联邦 + 州税
- `ficaW2Base = totalW2 - premiumSpending` → 减 FICA（§125 cafeteria plan）
- `statePFML` 按居住州自动算
- `cashTakeHome = takeHome - deferredAssets - premiumSpending`
- 新字段：`monthlyTakeHome` · `biweeklyTakeHome`

### UI

- 新组件 `<PayrollBenefitsSection>` · 折叠式
- 集成 Wizard Step 4 + InputPanel deduct tab
- Hero 月到手小字 "≈ $X/月"
- Breakdown bar 加 PFML 紫灰条
- 守恒等式加"保险"桶

---

## v132 · 内测 v2.8

**细节拉满**

### 颜色：黑→蓝
- SavingsTuner bubble baseline 态：C.ink → C.info
- 分配方式 toggle 激活：C.ink → C.info
- ContribYTDCalc toggle：C.ink → C.info
- "应用" commit 按钮保留黑色

### `<ContribEditSlider>` · 消除"已存 vs 再存"歧义
- useRef 锁初始值 · 或通过 `baseline` prop 显式传入
- 差 ≥ $1 显示"已存 $X · 再存 +$Y · 年度总 $Z"
- 绿色再存 · 红色撤回
- YTD 应用后同步 `_k401Baseline` / `_hsaBaseline` shadow 字段

### Hero 月到手详情
- 点 ▾ 展开：4 格分期表（weekly / biweekly / semimonthly / monthly）
- 按来源分月拆分（v134 升级为 marginal-rate 精算）
- 底部注明"按 gross 比例摊 · 简化"

---

## v133 · 内测 v2.9

**CA 版房产州本地化 bug fix**

反馈：CA 版 Wizard Step 3 房产州下拉显示"纽约 (NY)"

根因：`<StateSelect>` 没传 `country` prop

### 修复
- Wizard Step 3 StateSelect 加 `country={country}`
- 标签 CA 化：房产所在州 → 房产所在省
- 地税标签 CA 化：地税 + 学校税 → 地税 (市政税)
- PropertyCard 加 country + residenceState props
- 跨国 stale state 兜底（IIFE value override）

---

## v134 · 内测 v3.0

**分源月到手 marginal-rate 精算**

### 算法

| 来源 | US 边际 | CA 边际 |
|---|---|---|
| W2 | fed + state + SS (if w2<$176.1K) + Medicare 1.45% + Addl 0.9% (>200K/250K) | marginalCombined (含 CPP+EI) |
| 1099 | fed + state + SE tax × 0.9235 × (1-0.5×marginalFed) | fed + state + 11.9% CPP |
| 房租净 | fed + state | 同 |
| 投资 (优惠) | LTCG bracket + state | 无（CA 无 LTCG 优惠） |
| 投资 (普通) | fed + state | 同 |

### 归一
- impliedNet[i] = gross[i] × (1 - rate[i])
- monthlyShare[i] = monthlyCash × impliedNet[i] / ∑impliedNet
- 保证分源之和严格等于 monthlyCash

---

## v135 · 内测 v3.1

**CA 出租本地化 + myth 模态框重排版**

### CA 出租房 Step 3
- 折旧 slider + Cost Seg toggle 替换为 CCA 说明卡
- "Class 1 4% DB · 可选不报 · 报了触发 recapture · 混合用途失 PRE"
- 运营费用 hint 去 HOA（美国专词）· 加水电（空置期）

### Myth 模态框
- 新组件 `<MythBody>` 解析：
  - `\n` → 换行
  - `\n\n` → 段落间距
  - `\n·` → bullet（靠左 dot · category 色）
  - `\n①②③` → 编号列表（Fraunces 字体）
  - `**text**` → 真加粗
- Modal header 改三徽章并排（Category 色 + HOT 金 + 序号 mono）
- Title 前的"×"换成左边"Q"红徽章

---

## v136 · 内测 v3.2

**大扫除 · 删死代码**

### 死组件（3 个 · 共 264 行）
- `SavingsBanner`（128 行 · 5641-5768）
- `OppCard`（93 行 · 6385-6482）
- `TimelineGroup`（43 行 · 6794-6837）

### 死常量（13 个）
- US: K401_CATCHUP_50, K401_CATCHUP_60_63, K401_TOTAL_50PLUS, K401_TOTAL_60_63, IRA_CATCHUP_50, ROTH_IRA_PHASE_OUT, HDHP_MIN_DEDUCTIBLE, HDHP_MAX_OOP, HEALTH_FSA_LIMIT_2025, HEALTH_FSA_CARRYOVER
- CA: CA_FHSA_LIFETIME, CA_HBP_LIMIT, CA_OAS_CLAWBACK

### Changelog 抽离
- 源码开头的 680 行版本日志抽成独立 CHANGELOG.md
- 源码保留极简 header（版本号 + 链接指向 CHANGELOG.md）

### 结果
- 19,219 行 → ~18,240 行（瘦身 ~5%）
