import React, { useState, useEffect, useMemo } from 'react';

// ═══════════════════════════════════════════════════════════
//  GitHub/Cloudflare 部署版 · window.storage polyfill
//  如果 host 没提供 window.storage（Anthropic Artifacts 才有），
//  自动降级到 localStorage。保持 Promise API 一致。
// ═══════════════════════════════════════════════════════════
if (typeof window !== 'undefined' && !window.storage) {
  window.storage = {
    async get(key) {
      try {
        const v = window.localStorage.getItem(key);
        return v != null ? { key, value: v } : null;
      } catch { return null; }
    },
    async set(key, value) {
      try {
        window.localStorage.setItem(key, value);
        return { key, value };
      } catch { return null; }
    },
    async delete(key) {
      try {
        window.localStorage.removeItem(key);
        return { key, deleted: true };
      } catch { return null; }
    },
    async list(prefix) {
      try {
        const keys = [];
        for (let i = 0; i < window.localStorage.length; i++) {
          const k = window.localStorage.key(i);
          if (!prefix || k.startsWith(prefix)) keys.push(k);
        }
        return { keys, prefix };
      } catch { return { keys: [] }; }
    },
  };
}

// ═══════════════════════════════════════════════════════════
//  TaxPilot · 互动税务策略引擎 v113 · 内测 v1
//  A) 返回主页按钮统一文案 · US 主页/CA 主页 → 返回主页
//  B) 选国家后新增"怎么开始"弹窗 · 3 选 1
//     · ◆ 选择模板身份（主按钮 · 绿）→ PersonaPicker
//     · ✎ 自己输入信息（次按钮）→ Wizard
//     · 随便给我一个身份（底部小字）→ 随机 PERSONAS_CA / PERSONAS
//     · 点背景关闭 · 用户可在主页自己再触发
//     · 触发机制：仅在 CountryPicker.onPick 时 · 从 storage 恢复不弹
// ═══════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════
//  TaxPilot · 互动税务策略引擎 v111
//  CA personas 再扩 24 → 34（+10 · 更多身份/行业/地域）
//
//  【I. 初入职场 +3】
//    1. 留学生 · 多大（ON · Study Permit · $18K · T2202 学费抵）
//    2. PGWP 工签 · 温哥华（BC · $75K · 等 CEC PR）
//    3. 护士 · 温尼伯（MB · $82K · Union + Pension · 首次加 MB）
//
//  【II. 家庭中产 +3】
//    4. 蓝领电工 · 本拿比（BC · T4+半职 · 2 娃 · Red Seal 工会）
//    5. 单收入家庭 · 萨斯卡通（SK · 1 薪 · 3 娃 · 首次加 SK）
//    6. Gatineau→Ottawa 跨省（QC住 · ON工 · 双申报）
//
//  【III. 自雇 / 小企业 +2】
//    7. 中餐馆老板 · Scarborough（ON · CCPC · 夫妻经营 · TOSI）
//    8. 独立律师 · 温哥华（BC · Law Corp · $280K · IPP）
//
//  【IV. 财富 / 房产 +2】
//    9. 国内有房 + T1135（ON · MFJ · 国内租金 CAD $18K）
//   10. 离婚父亲 · 多伦多（ON · HoH · 付 Spousal + Child Support）
//
//  新覆盖：
//  · 省份：首次加 MB (温尼伯) + SK (萨斯卡通) · 全国 6 省
//  · 身份：留学生 · PGWP · Union 蓝领 · 单收入家庭 · 跨省通勤 · 离婚
//  · 行业：学生 · 护士 · 电工 · 餐饮 · 律师 · 教师(间接)
// ═══════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════
//  TaxPilot · 互动税务策略引擎 v110
//  加 2 个 CA persona · 针对 XHS 实际用户画像（工签 + T4 + 自雇）
//
//  【自雇 / 小企业 +2】
//    · 工签 OINP · 首房 · 多伦多
//        · 工签 + OINP 省提名 + 联邦 PR AOR 待最终批
//        · T4 $72K + 自雇 $48K 混合 · NOA 偏低
//        · 核心场景：NRST 免 + FHSA + HBP 首房
//    · XHS 博主双栖 · 多伦多
//        · T4 正职 $78K + 晚上小红书/YouTube 副业 $42K
//        · GST/HST 临界 · 支出抵扣 wifi/设备/出行
//        · 核心场景：T4 源头扣 + 自雇季度预缴
//
//  CA personas: 22 → 24
// ═══════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════
//  TaxPilot · 互动税务策略引擎 v109
//  CA personas 扩充 12 → 22（+10 · 覆盖中西部 / 退休 / FIRE）
//
//  新加的 10 个 CA personas：
//  【I. 初入职场 +3】
//    1. 石油新人 · 卡尔加里（AB · Single $90K · 24 岁）
//    2. 渥太华公务员（ON · Single $72K · DB Pension）
//    3. Waterloo 毕业生（ON · Single $55K · OSAP 学贷）
//
//  【II. 家庭中产 +2】
//    4. Mississauga 双薪（ON · MFJ 1 娃 $180K · townhouse）
//    5. Burnaby 新移民家庭（BC · MFJ 2 娃 · PR 2 年 · 国内资产）
//
//  【III. 自雇 / 小企业 +2】
//    6. 石油 Consultant · 卡尔加里（AB · Single $200K · 独立咨询）
//    7. 单亲地产经纪 · 多伦多（ON · HoH · 1 娃 · Realtor）
//
//  【IV. 财富 / 房产 +3】
//    8. 石油资深工程师 · 埃德蒙顿（AB · MFJ $350K · RRSP/TFSA 满）
//    9. 温哥华退休夫妻（BC · MFJ 65+ · OAS + RRIF）
//   10. FIRE 夫妻 · 哈利法克斯（NS · MFJ · 40+ 早退休 · 被动收入）
//
//  地理覆盖：多伦多 / Markham / Mississauga / Waterloo / 渥太华 /
//           温哥华 / Richmond / Burnaby / 卡尔加里 / 埃德蒙顿 /
//           蒙特利尔 / 哈利法克斯
//  省份覆盖：ON · BC · AB · QC · NS（5 个省）
//  身份覆盖：Single · MFJ · HoH · 新移民 · 退休 · FIRE
// ═══════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════
//  TaxPilot · 互动税务策略引擎 v108
//  跨境 · 加→美 支持（XHS 核心读者场景）
//
//  A) US PERSONA_GROUPS 新增组 VI · 跨境 · 加→美
//     · 3 个 personas：
//       1. TN 工程师 · 西雅图 (Single · $165K W2 · 留 RRSP)
//       2. 加→美首年 · 旧金山 (MFJ · $300K · Exit Tax + Dual-Status)
//       3. 跨境通勤 · Windsor→Detroit (Single · $85K · Article XV Treaty)
//     · 每个 persona 专属 tax focus：TFSA 避坑 / RRSP Treaty / FBAR
//     · 琥珀色 accent 区分美加主题
//
//  B) US MYTHS 新增 5 条跨境误区（3 hot）
//     1. TFSA 到美国全征税 · 搬前必取 (HOT)
//     2. RRSP Treaty 自动延税 · 2014 后不需 Form 8891 (HOT)
//     3. FBAR $10K 门槛 · 加拿大所有账户算 (标准)
//     4. 加拿大 Departure Tax · 离境 deemed disposition (HOT)
//     5. TFSA 绝对不要在美国继续存
//
//  C) GLOSSARY 新增 7 个跨境术语
//     · FBAR · FinCEN 114 境外账户申报
//     · Form 8938 · FATCA 境外资产
//     · Treaty 8833 · 税收协定立场
//     · DualStatus · 双身份首年
//     · RRSP8891 · RRSP Treaty 延税（8891 已废）
//     · DepartureTax · 加拿大离境税
//     · CrossBorderCommuter · 跨境通勤
//
//  D) US 省税机会修老 bug
//     · 401(k) 门槛 `i.w2 > 80000` → `totalEarned >= 30000`
//     · $80K 刚好门槛 bug 修复 · 中产都看得到建议了
//
//  E) 新增 · US 直接 Roth IRA 建议
//     · AGI 未过 phase-out + W2 + spouseW2 >= $10K → 提示直接存 Roth IRA
//     · 之前只有 Backdoor Roth · 中低收入看不到任何 Roth 建议
// ═══════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════
//  TaxPilot · 互动税务策略引擎 v107
//  CA 模式再一轮 US 残留清理 + US 机会卡长期 bug 修复
//
//  A) 3 个新 CA gloss term
//     · CapGains · 加拿大资本利得 50% 纳入率
//     · QuarterlyCA · T1 Instalments 季度预缴
//     · QCFiling · 魁北克双申报 (T1 + TP-1)
//     · 之前点 flag chip 这 3 个 code 没反应 · 现在能弹释义
//
//  B) ScenarioDetailModal · CA 专用 9 条 advice
//     · US: Mega Backdoor / HSA / Solo 401k / PTE / Cost Seg / QSBS / NIIT / DCFSA / CalEITC
//     · CA:
//       1. 补满 RRSP（按 18% × T4 算空间）
//       2. 开 FHSA 首房神器（没房时触发）
//       3. TFSA 长期投资
//       4. T1 Instalments 季度预缴（自雇 > $30K）
//       5. 开 CCPC 小企业法人（自雇 > $100K）
//       6. OAS 回收警示（Net Income > $93,454）
//       7. 资本利得时点控制（gain > $50K）
//       8. QC 双申报注意（state === QC）
//       9. CCB 牛奶金 + RESP（有娃）
//     · Term code 都对应到新加的 CA gloss
//
//  C) Income breakdown 标签 · CA 化
//     · W2 工资 → T4 工资
//     · 1099 自雇 → 自雇 (T2125)
//
//  D) 修老 bug · US 401(k) 机会卡门槛太高
//     · 之前：`i.w2 > 80000`（strict > · 刚好 $80K 不提示）
//     · 现在：`totalEarned >= 30000`（W2 + spouseW2 合计）· $30K 起就显示
//     · 这是 v95+ 以来一直存在的老 bug · 不是 CA 污染
//
//  E) 新增 · US 直接 Roth IRA 建议
//     · 之前只有 Backdoor Roth（AGI > $161K/$240K 触发）
//     · 中低收入用户看不到 Roth 建议（看不到任何退休账户建议）
//     · 现在 AGI < phase-out + 有工资收入时 · 提示直接存 Roth IRA $7K
// ═══════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════
//  TaxPilot · 互动税务策略引擎 v106
//  CA 模式 US 残留系统清理
//
//  A) InputPanel 展开 tab · 全面 CA 化
//     · TAB 标签：工作州 → 省份（CA 模式）
//     · 收入 tab：W2 → T4 · 1099 自雇 → 自雇收入（T2125）
//     · 工作 tab：CA 版简化成「居住省 + 城市」· US 保留跨州/Convenience 全部逻辑
//     · 扣除 tab：
//       - 401(k) → RRSP（上限 $32,490）
//       - HDHP/HSA/Mega Backdoor/Commuter/DCFSA 全部隐藏（CA 无对应）
//       - Itemize 项 → 额外扣除 / 抵免
//       - 慈善捐赠提示「> $200 部分 29% credit」
//       - 自费医疗隐藏（CA 有医疗费 credit 但逻辑不同）
//       - 加 TFSA/FHSA 提示框（不在这里输入）
//
//  B) Transparency（算式透明）· CA 专用简化版
//     · ① 总收入 (T4 + 自雇 + RRSP 减税)
//     · ② BPA credit（联邦 + 省 · 含慈善 credit 分段）
//     · ③ 联邦税 5 档累进展开
//     · ④ 省税累进 + ON Surtax/OHP 说明 + QC TP-1 警告
//     · ⑤ CPP1 + CPP2 + EI（不是 FICA）
//     · ⑥ 自雇 CPP（11.9% · 不是 SE 税）
//     · ⑦ 总税负汇总（CPP+EI / 自雇 CPP 标签）
//     · US 保留原版（SALT / Itemized / FICA / SE Tax）
//
//  C) Worksheet（T1 税表按钮）· CA 模式显示占位符
//     · 之前：CA 点 T1 打开完整 Form 1040 + Schedule A/B/C/D/E（彻底不对）
//     · 现在：CA 显示"T1 正在建设"占位页 + 列出已有的 CA 功能 + 推荐 NETFILE 软件
//     · Hooks 顺序正确 · 所有 useState 在 early return 前
//
//  D) 1040-ES 季度预缴 section（QuarterlyBudget）· CA 隐藏
//     · US 的 Q1-Q4 截止日 4/15 6/15 9/15 1/15 不适用 CA
//     · CA T1 Instalments 规则不同（$3,000 门槛 · 3/15 6/15 9/15 12/15）
//     · v107+ 做专门 CA 版
//
//  E) ActionTimeline（行动时间线）· CA 日期
//     · "报税前 4/15" → CA 显示 "4/30"（自雇 6/15）
//     · 年末前加 3/1 RRSP 截止日
//     · Q1-Q4 tick 从 "预缴" 改 "T1 Inst."
//
//  F) 底部免责 footer · 国家定制
//     · US：IRS Pub 17 · NY DTF · NJ Treasury / S-Corp FBAR Backdoor Roth
//     · CA：CRA T1 General · 13 省 / CCPC T1135 Capital Dividend
// ═══════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════
//  TaxPilot · 互动税务策略引擎 v105
//  编辑向导（Wizard） 全部 CA 化
//
//  A) Wizard 接 country prop · 计算预览走 computeTaxCA
//
//  B) Step 1 · 收入
//     · US：你的 W2 年薪 / 配偶 W2 / 1099 自雇收入 / 1099 业务开支
//     · CA：你的 T4 年薪 / 配偶 T4 / 自雇合同工收入 / 自雇业务开支 (T2125)
//
//  C) Step 2 · 居住 + 工作
//     · 标题：US "你住哪里？在哪工作？" · CA "你住哪个省？"
//     · Subtitle：CA 特别说明"12/31 所在省决定税率"
//     · 居住下拉：CA 走 13 省 · US 走 50 州
//     · 省份 note 从 CA_PROV_BRACKETS 读（不是 STATE_BRACKETS）
//     · 工作情景：CA 版 3 条（本省上班 · 跨省工作 · 远程）
//       US 仍 4 条含 Convenience Rule 警告
//
//  D) Step 4 · 供款
//     · US：401(k) · HDHP + HSA · 孩子人数
//     · CA：RRSP · 孩子人数 · 加 TFSA/FHSA 提示框（不在这里输入 · 在主界面机会卡）
//     · 没有 HDHP / HSA 概念 · 完全隐藏
// ═══════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════
//  TaxPilot · 互动税务策略引擎 v104
//  CA 模式更多组件 CA 化 + 返回按钮可用
//
//  A) 返回主页按钮去掉 confirm
//     · confirm() 在某些 embedded browser / iframe 里被禁用
//     · 点击 [← CA 主页] 没反应 → 现在直接 setCountry(null) · 秒切回首页
//     · 数据本来就保留 · 不需要确认
//
//  B) 假设场景（ScenarioCompare）CA 版
//     · US 特有场景（FL/TX/NV/WA 搬家 · 401k · SALT 等）不显示
//     · CA 专用场景：
//       - 存满 RRSP $32,490
//       - 开 FHSA + 存 $8K
//       - 搬家到阿省 (BPA 全国最高)
//       - 搬家到萨省 / 卑诗 / 魁北克
//       - +$5K 慈善捐赠（29% credit）
//       - T4 涨 $30K · 自雇副业 +$40K
//     · computeTax → computeTaxCA 自动 dispatch
//
//  C) 居住地最优化器（LocationOptimizer）CA 版
//     · US 候选：NY/NJ/CT/PA/FL/TX/NV/WA/TN → 全是 50 州
//     · CA 候选：AB / SK / MB / BC / ON / QC / NB / NS
//     · 每个 candidate 显示 tax year 差 vs 当前
//     · "只换住处"和"换工作也考虑"两模式都支持
// ═══════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════
//  TaxPilot · 互动税务策略引擎 v103
//  Header 返回按钮明显化 + CountryPicker 文案改
//
//  A) 主应用 Header · 中间加明确"返回主页"按钮
//     · 之前：左侧小徽章 [CA ▾]（容易被忽略 · 不清楚作用）
//     · 现在：中间大按钮 [← CA 主页]（明确告知"回主页"）
//     · 布局：[Logo]     [← CA 主页]    [T1][换身份][编辑]
//     · 国家状态（US/CA）融在按钮里 · 省一个组件
//
//  B) CountryPicker 文案改
//     · 之前：先选你报税的国家（"先"字累赘）
//     · 现在：选择你的报税国家（直接 · 主动）
//     · 去掉 uppercase 样式（中文用不上）
//     · 字号 11 → 13 · 更清晰
// ═══════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════
//  TaxPilot · 互动税务策略引擎 v102
//  CA 模式 UI + 计算 bug 修复
//
//  A) Header 紧凑化 · 手机单行显示
//     · Logo 缩小 30 → 22px · 更多空间给按钮
//     · 按钮字体 12 → 11px · padding 7/10 → 5/8
//     · 按钮文字缩短：重新编辑 → 编辑 · 换个身份 → 换身份 · T1 税表 → T1
//     · 国家徽章 CA ▾ 明显化 · 点击确认后返回首页
//
//  B) CountryPicker logo 沿用主界面风格
//     · Tax 黑粗体 + Pilot 绿色斜体（之前是 TaxPilot 合成一个词）
//
//  C) computeTaxCA 字段名对齐 US · 修复 tunerPreview 读空 bug
//     · 旧：cashNow / deferredCash
//     · 新：cashTakeHome / deferredAssets（US 用的字段名）
//     · 修复图里 "当下到手 -$11,346" 负数 bug
//
//  D) 添加 marginalCombined 到 CA calc · 修 "边际 NaN%"
//     · marginalPayroll = CPP (5.95% or 4%) + EI (1.64%)
//     · marginalCombined = marginalFed + marginalState + marginalPayroll
//
//  E) TFSA 不再是 contrib 类型 · 修 tuner 误扣现金
//     · TFSA 是 post-tax · 存钱不减当年税
//     · v102 改 type: 'strategy' · contrib: 0 · saving: 0
//
//  F) Ontario Health Premium 2025 正确分档
//     · v101 固定 $750 · v102 按 2025 规则线性分档 · 最高 $900
// ═══════════════════════════════════════════════════════════
/* v101 historic notes moved to git history */
// ═══════════════════════════════════════════════════════════
//  TaxPilot · 互动税务策略引擎 v101
//
//  A) GLOSSARY 扩展 · 新增 18 个加拿大术语
//     · BPA · RRSP · TFSA · FHSA · HBP · CCB · CPP · EI · OAS
//     · RESP · CESG · CCPC · T1 · T4 · T1135
//     · BrightLine（反炒房）· PRE（自住房豁免）· TransitionalResident
//     · CA 模式下 Flag / Persona / Myth 里点术语弹这些
//
//  B) MYTHS_CA 数组 · 15 条核心（平行 MYTHS 数组）
//     热门题（hot: true · 5 条）：
//      1. TFSA vs RRSP 怎么选
//      2. FHSA 要不要开
//      3. 留学生毕业 Work Permit 第一年
//      4. 新 PR 第一年操作
//      5. 从中国父母汇钱要交税吗
//     其它 10 条：
//      HBP vs FHSA 先用哪个 · 回中国工作还报加税吗 · 房东卖房税
//      Non-resident 卖房 25% 预扣 · QC 双申报 · CCB 优化
//      自雇 CPP 双份 · RRSP 71 岁转 RRIF · 夫妻拆分收入
//      加拿大有 Roth 后门吗
//
//  C) PERSONA_GROUPS_CA · 4 组 12 个 CA personas
//     I 初入职场：ca_torontoJrDev · ca_vancouverDesigner · ca_newImmigrantPR
//     II 家庭中产：ca_markhamDualTech · ca_montrealFamily · ca_richmondFamily
//     III 自雇 / 小企业：ca_vancouverInfluencer · ca_uberDriver · ca_ccpcOwner
//     IV 财富 / 房产：ca_bayStreetFinance · ca_doctorIncorp · ca_vancouverLandlord
//
//  D) 路由机制
//     · MythStrip 接 country prop · CA 时用 MYTHS_CA + PERSONA_GROUPS_CA
//     · PersonaPicker 接 country prop · CA 时显示 12 个 CA persona
//     · usePersonaSaving 自动检测 state 是 CA 省代码 · 用 computeTaxCA
//
//  E) v101 已知局限（v102+ 处理）：
//     · Worksheet 仍 US 1040 格式 · CA 点 T1 按钮会看到 US Schedule
//     · Wizard 流程里的问题还是 US-specific（如 ISO 期权 · Solo 401k）
//     · 一些只在 US 用的 persona 卡片（如 akOilWorker）· CA 下不会出现
// ═══════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════
//  TaxPilot · 互动税务策略引擎 v101
//  CA 模式 · Personas + Myths + Gloss 全套接入
//
//  A) 加拿大 Personas（12 个 · 4 组）
//     组 I · 初入职场：应届码农 · 温哥华设计师 · 新 PR
//     组 II · 家庭中产：Markham 双码农 · QC 双申报 · 列治文 BC
//     组 III · 自雇/小企业：温哥华网红 · Uber · CCPC 老板
//     组 IV · 财富/房产：Bay Street 金融 · 安省医生 · 温哥华房东
//     · PersonaPicker 根据 country 切换 PERSONA_GROUPS_CA
//     · usePersonaSaving 自动检测 state 省代码 · 用 computeTaxCA
//
//  B) 加拿大 Myths（15 条核心）
//     · TFSA vs RRSP 怎么选
//     · FHSA 要不要开（华人必问）
//     · HBP vs FHSA 先用哪个
//     · 留学生毕业 Work Permit 第一年
//     · 新 PR 第一年（Deemed Acquisition + T1135）
//     · 从中国父母汇钱要交税吗
//     · 回中国工作要报加拿大税吗
//     · 卖加拿大房（PRE + Anti-flipping）
//     · Non-resident 卖房 25% 预扣（Section 116）
//     · QC 双申报
//     · CCB 牛奶金优化
//     · 自雇 CPP 双份（CCPC / TOSI）
//     · RRSP 71 岁转 RRIF
//     · 夫妻间拆分收入
//     · 加拿大有 US Roth 后门吗（无）
//     · MythStrip 根据 country 切换 MYTHS_CA
//
//  C) 加拿大 Gloss 术语（18 条）
//     BPA · RRSP · TFSA · FHSA · HBP · CCB · CPP · EI · OAS · RESP
//     CCPC · T1 · T4 · T1135 · BrightLine · PRE · TransitionalResident · CESG
//     · 和 US 术语并入同一 GLOSSARY · 按 code 查询
//     · Myth 内的 gloss 引用也工作
//
//  D) 待 v102 处理
//     · Worksheet 税表体 · 还是 US 1040 格式 · 点 T1 税表按钮看 Schedule A/B/C
//     · Wizard 问卷 · 还是 US 问题流
//     · CA 一些高级 persona（如 QC incorporate）· 暂未覆盖
// ═══════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════
//  TaxPilot · 互动税务策略引擎 v100
//  CA 模式下 UI 文案对齐加拿大术语
//
//  A) SummaryCard 分项标签（一眼看懂）
//     · `FICA` → CA 显示 `CPP+EI`
//     · `SE 税` → CA 显示 `自雇 CPP`
//     · `NJ 州` → CA 显示 `ON 省` / `BC 省` 等
//     · `Itemize $X` / `Standard` → CA 显示 `BPA $16,129`
//     · SALT 损失告警 · CA 不显示
//
//  B) "你的情景"叙述文案（底部）
//     · `W2 双薪 + 1099 自雇` → CA 改 `T4 双薪 + 自雇`
//     · 跨州 Convenience Rule → CA 改 "在 X 省工作" 简化
//     · AB 省特别标 "（BPA $21,885 全国最高）"
//     · QC 省特别标 "（单独报 TP-1）"
//
//  C) 税务关注 Flag（顶部小标签）
//     · US：AMT · SALT · NIIT · QSBS · PTE · Mega Backdoor
//     · CA：OAS 回收 · RRSP 未存满 · TFSA 未开 · 资本利得 > $250K
//       · 季度预缴 · QC 双申报 · FHSA 首房
//
//  D) Top advice 省税卡片（全重写 CA 版 · findOpportunitiesCA）
//     · 存满 RRSP（$32,490 × 边际）
//     · 存满 TFSA（$7K · 终生 $102K）
//     · 开 FHSA 首房（$8K/年 · 终生 $40K）
//     · HBP 用 RRSP 买首房（$60K）
//     · CCB 牛奶金估算（$7,997/6 岁以下 · $6,748/6-17）
//     · RESP 娃教育金（CESG 20% 匹配 · 每娃 $7,200）
//     · 慈善捐赠 credit（> $200 按 29-33%）
//     · 自雇 CPP 双份预警（11.9% + 4%）
//     · OAS 回收预警（> $93,454）
//     · ON → AB 省税套利（顶档差 5.5 点）
//
//  E) StateSelect dropdown
//     · CA 时显示 13 省分组：人口大省 · 草原省 · 大西洋省 · 北三地区
//     · 省份 note（如 QC 单独报 · AB BPA 全国最高）单独渲染
//
//  F) 加拿大城市数据
//     · ON: 多伦多 / 万锦 / 密西沙加 / 渥太华 / 滑铁卢
//     · BC: 温哥华 / 列治文 / 本拿比 / 素里
//     · QC: 蒙特利尔 / 魁北克城
//     · AB: 卡尔加里 / 埃德蒙顿
//
//  G) 税表按钮 · CA 显示 "📋 T1 税表" · US 显示 "📋 税表"
//
//  H) v100 已知局限（v101 处理）：
//     · 税表内容 Worksheet 还是 US 1040 格式 · CA 点开会看到"Schedule A/C/D"等
//     · Gloss 术语查询 · 点 SALT/FICA/401k 还弹 US 解释
//     · Personas 列表还是 60+ 个 US persona · CA 下点下去会乱
//     · Myths 还是 61 条 US 的
// ═══════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════
//  TaxPilot · 互动税务策略引擎 v99
//  CA 计算引擎接入 · 选 CA 时数字真的是加拿大税
//
//  A) 加拿大 2025 数据表（独立常数 · 不污染 US）
//     · CA_FED_BRACKETS · 5 档 blended 14.5% 起步
//     · CA_FED_BPA_MAX/MIN · $16,129 → $14,538 phase-down
//     · CA_PROV_BRACKETS · 13 省/地区全套 brackets + BPA
//     · Ontario surtax (20%+36%) + Health Premium (最高 $900)
//     · CA_CPP_YMPE/YAMPE · CPP 5.95% + CPP2 4% · EI 1.64%
//     · CA_RRSP_LIMIT $32,490 · CA_TFSA_LIMIT $7K · FHSA $8K/$40K
//
//  B) computeTaxCA(i) 独立计算函数
//     · 返回和 US computeTax 兼容的 shape（同字段名）
//     · US 特有字段 置 0：SALT / AMT / NIIT / OBBBA / QSBS
//     · 新字段：fedBPACredit · provBPACredit · cppEmp · cpp2Emp · eiEmp · onSurtax
//
//  C) App 分派：
//     · country === 'CA' → computeTaxCA(inputs)
//     · country === 'US' → computeTax(inputs)（完全不动）
//
//  D) 切换国家自动 reset：
//     · US → CA：如果 state 是美国州 · 跳到 ON 多伦多 single $95K 默认
//     · CA → US：如果 state 是加拿大省 · 跳回 US blank preset
//
//  E) profileOneLiner 扩展：
//     · 加入 13 省中文名（安省/卑诗/魁北克等）
//     · cityLabelMap 加多伦多/万锦/温哥华/蒙特利尔等
//
//  F) 数字验证（多伦多单身 $100K 测试）：
//     · 联邦：$14,719 · 安省：$7,064 · CPP+EI：$5,508
//     · 总税：$27,290 (27.3%) · 税后 $72,710
//     · 对比 Wealthsimple 预测 $73-75K take-home · 一致
//
//  G) v99 已知局限（v100 处理）：
//     · UI 标签仍显示 FICA / Itemize / Standard / QBI / Solo 401k 等美式术语
//     · 但具体数字是加拿大的（FICA 那个数字其实是 CPP+EI 的和）
//     · Top advice 卡片仍建议 Mega Backdoor 等 · CA 用不上
//     · v100 会按 country 切标签 / 卡片内容
// ═══════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════
//  TaxPilot · 互动税务策略引擎 v98
//  架构升级：US + CA 双版本整合
//
//  A) 首页 CountryPicker
//     · 新用户第一次打开 → 选国家
//     · US 卡片：OBBBA 2025 · 50 州 · SALT $40K · 401k · AMT
//     · CA 卡片：新政 2025 · 13 省 · RRSP/TFSA/FHSA · CPP/EI · BETA 标签
//     · 选择后存到 window.storage('taxpilot_country') · 下次自动进入
//
//  B) App 顶层
//     · 加 country state（null/US/CA）
//     · 如果 null · 显示 CountryPicker
//     · 如果有 country · 正常渲染（US 现阶段完全保留 v97 逻辑）
//
//  C) Header
//     · 右上 Logo 旁加国家小徽章 "US ▾" / "CA ▾"
//     · 点击 → 确认后回到 CountryPicker
//
//  D) CA 版状态
//     · v98 是"架构接入"版本 · 选 CA 后当前仍走 US 逻辑
//     · v99+ 开始真正接入 CA 税率 / 账户 / personas / myths
//     · 这样每一版都是可用的 · 分阶段迭代
// ═══════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════
//  TaxPilot · 互动税务策略引擎 v97
//  顶部 profile 和底部"你的情景"对齐 · 统一叙述风格：
//
//  · 之前 v95 的 profileOneLiner 优先取 persona.subtitle
//    例："Single · Jersey City 租"（冷冰冰原始标签）
//    → 问题：用户底部看到"中高薪单身，住在新泽西，每天通勤纽约"
//      顶上却是"Single · Jersey City 租" · 明显不同风格
//  · v97 重写 profileOneLiner：不再用 persona.subtitle
//    所有场景都走同一套叙事逻辑 · 和底部 buildScenarioStory 共享数据
//    · 收入层级词：超高净值 / 高净值 / HENRY 准富 / 中高薪 / 中产 / 起步
//    · 家庭身份：单薪 MFJ / 双薪 / 单亲 / 单身 / 自雇 / W2+副业
//    · 地点用中文州名：新泽西 · 纽约 · 加州 · 德州 · 佛州 等
//    · 跨州显示："新泽西→纽约 通勤"
//    · 关键细节只挑 1 个：娃数 > 出租数 > 自住房
//  · 示例对比：
//    旧："Single · Jersey City 租"（raw subtitle）
//    新："中高薪单身 · 新泽西→纽约 通勤"（生动 · 和底部同风格）
// ═══════════════════════════════════════════════════════════
//  5 大模块批量补齐：
//
//  A) OBBBA 2025 新 4 项 deduction · 计算引擎接入
//     · No Tax on Tips §224 · 最多 $25K · phase-out $150K/$300K
//     · No Tax on Overtime §225 · $12.5K / $25K MFJ · 同阈值
//     · Senior Bonus 65+ §70103 · $6K/人 · phase-out $75K/$150K
//     · Car Loan Interest 美装车 · $10K · phase-out $100K/$200K
//     · 统一 phaseCalc() 辅助 · 每 $1K 按 rate 线性减
//     · 4 项都在 Worksheet 显示（仅触发时）· 附 WNote 说明
//     · 4 项都改 fedTaxable · 直接减税
//
//  B) 12 条新 myths
//     · OBBBA 4 新 deduction 各一条（tips/OT/senior/car）
//     · 留学生 4 条：F-1 FICA 豁免 · 1040 vs 1040NR · OPT→H1B Dual-Status
//       · H1B 配偶国内的 §6013(g) MFJ 选择
//     · 回国 3 条：Exit Tax §877A · 不住绿卡税务曝险 · 双重国籍处理
//     · 1 条小计：每条都加 gloss 术语解释
//
//  C) 4 个新州 persona
//     · maBostonH1B (Group I) · 波士顿生医 H1B · MA 5% flat
//     · paPhillySuburb (Group II) · 费城郊区双薪 · PA 3.07% + 市税
//     · ilChicagoMFJ (Group II) · 芝加哥双薪 · IL 4.95% + 库克郡重地产税
//     · ctGreenwichCouple (Group V) · 对冲基金夫妻 · CT→NY 通勤
//
//  D) 留学生 + 移民阶段税务（通过 myths 覆盖）
//     · F-1 前 5 年 FICA 豁免（Form 843 + 8316 追缴）
//     · 1040NR vs 1040 差别（SPT / 印度协定 / Standard Deduction）
//     · OPT→H1B Dual-Status · First Year Choice 策略
//     · 新 H1B + 国内配偶 §6013(g) 合报省税
//
//  E) 回国 / 放弃绿卡（通过 myths 覆盖）
//     · Exit Tax §877A · 覆盖 covered expatriate 三条件
//     · Form 8854 · $890K 2025 gain 豁免
//     · 不住绿卡的税务陷阱（I-407 + Streamlined）
//     · 双重国籍 · 中美税务协定 FTC Form 1116
// ═══════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════
//  TaxPilot · 互动税务策略引擎 v63
//  Persona 扩容 + 筛选简化 + 按钮升级：
//   · 删「全部」tab · 只保留「单身/HoH · 已婚」二选一
//   · 默认切到「单身/HoH」· Single 10 → 20 · MFJ 17 → 20
//   · 新增 13 个 persona
//   · SavingsTuner 详情按钮换 ▾/▴ chevron · padding 加大
// ═══════════════════════════════════════════════════════════

const C = {
  bg: '#F7F5F0',
  card: '#FFFFFF',
  cardAlt: '#FAF8F3',
  ink: '#0D0D0D',
  ink2: '#2B2B2B',
  mute: '#6B6B6B',
  muteLite: '#9A9A9A',
  line: '#E6E1D8',
  lineLite: '#EFECE5',
  save: '#0F7C4A',
  saveBg: '#E8F3EC',
  pay: '#B5351E',
  payBg: '#F8E9E5',
  warn: '#9A6B00',
  warnBg: '#FBF1DC',
  info: '#1F4FA0',
  infoBg: '#E4EBF5',
  // v10: 代替黑色的深墨绿 (像会计师墨水 / 银行印章)
  hero: '#1C3129',
  heroAlt: '#264237',
  heroInk: '#F2EEE3',      // 浅象牙色文字
  heroMute: '#98A89E',     // 浅灰绿 (二级文字)
};

// ═══════════════════════════════════════════════════════════
//  THEMES · 主题色库（v41 · 默认白 + 4 个可选色）
// ═══════════════════════════════════════════════════════════
const THEMES = {
  sage: {
    id: 'sage',
    label: '雪白',
    sub: 'Paper · 默认',
    heroBg: '#FFFFFF',
    heroDot: '#DDD7C8',
    heroBorder: '#E6E1D8',
    heroOverlay: 'rgba(255,255,255,0.0)',
    bodyBg: '#F7F5F0',
    accent: '#2B2B2B',
    dotEmoji: '◆',
  },
  nordic: {
    id: 'nordic',
    label: '雾灰',
    sub: 'Nordic · 极简',
    heroBg: '#F2F3F1',
    heroDot: '#C0C4BD',
    heroBorder: '#D8DAD5',
    heroOverlay: 'rgba(255,255,255,0.0)',
    bodyBg: '#E8EAE6',
    accent: '#1A1D1A',
    dotEmoji: '◆',
  },
  cream: {
    id: 'cream',
    label: '米黄',
    sub: 'Cream · 老纸',
    heroBg: '#F5EFE0',
    heroDot: '#B09B6C',
    heroBorder: '#D9C9A6',
    heroOverlay: 'rgba(255,255,255,0.0)',
    bodyBg: '#F3EEDF',
    accent: '#53442A',
    dotEmoji: '※',
  },
  slate: {
    id: 'slate',
    label: '青石',
    sub: 'Slate · 冷灰',
    heroBg: '#E7ECF1',
    heroDot: '#8894A0',
    heroBorder: '#C0CAD4',
    heroOverlay: 'rgba(255,255,255,0.0)',
    bodyBg: '#E5E9ED',
    accent: '#1F2D3D',
    dotEmoji: '§',
  },
  blush: {
    id: 'blush',
    label: '浅粉',
    sub: 'Blush · 陶土',
    heroBg: '#F5E4DA',
    heroDot: '#B5896D',
    heroBorder: '#E2C7B6',
    heroOverlay: 'rgba(255,255,255,0.0)',
    bodyBg: '#EFE3DA',
    accent: '#502818',
    dotEmoji: '¶',
  },
};

const FontLoader = () => {
  useEffect(() => {
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700;9..144,800&family=Noto+Sans+SC:wght@300;400;500;600;700;900&family=JetBrains+Mono:wght@400;500;600&display=swap';
    document.head.appendChild(l);
    return () => { document.head.removeChild(l); };
  }, []);
  return null;
};

const F_NUM = '"Fraunces", "Noto Serif SC", serif';
const F_BODY = '"Noto Sans SC", -apple-system, "PingFang SC", sans-serif';
const F_MONO = '"JetBrains Mono", "SF Mono", monospace';

// ═══════════════════════════════════════════════════════════
//  税务规则库 · 2025 纳税年
// ═══════════════════════════════════════════════════════════

const STD_DED = { MFJ: 31500, Single: 15750, HoH: 23625, MFS: 15750 };

const FED_BRACKETS = {
  MFJ: [[23850, 0.10],[96950, 0.12],[206700, 0.22],[394600, 0.24],[501050, 0.32],[751600, 0.35],[Infinity, 0.37]],
  Single: [[11925, 0.10],[48475, 0.12],[103350, 0.22],[197300, 0.24],[250525, 0.32],[626350, 0.35],[Infinity, 0.37]],
  HoH: [[17000, 0.10],[64850, 0.12],[103350, 0.22],[197300, 0.24],[250500, 0.32],[626350, 0.35],[Infinity, 0.37]],
  MFS: [[11925, 0.10],[48475, 0.12],[103350, 0.22],[197300, 0.24],[250525, 0.32],[375800, 0.35],[Infinity, 0.37]],
};

const STATE_BRACKETS = {
  // ── 东北 ──
  NY: {
    name: 'New York', label: '纽约',
    MFJ: [[17150, 0.04],[23600, 0.045],[27900, 0.0525],[161550, 0.055],[323200, 0.06],[2155350, 0.0685],[Infinity, 0.0965]],
    Single: [[8500, 0.04],[11700, 0.045],[13900, 0.0525],[80650, 0.055],[215400, 0.06],[1077550, 0.0685],[Infinity, 0.0965]],
    stdDed: { MFJ: 16050, Single: 8000, HoH: 11200, MFS: 8000 },
  },
  NJ: {
    name: 'New Jersey', label: '新泽西',
    MFJ: [[20000, 0.014],[50000, 0.0175],[70000, 0.0245],[80000, 0.035],[150000, 0.05525],[500000, 0.0637],[1000000, 0.0897],[Infinity, 0.1075]],
    Single: [[20000, 0.014],[35000, 0.0175],[40000, 0.035],[75000, 0.05525],[500000, 0.0637],[1000000, 0.0897],[Infinity, 0.1075]],
    stdDed: { MFJ: 0, Single: 0, HoH: 0, MFS: 0 },
  },
  CT: {
    name: 'Connecticut', label: '康涅狄格',
    MFJ: [[20000, 0.02],[100000, 0.045],[200000, 0.055],[400000, 0.06],[500000, 0.065],[1000000, 0.069],[Infinity, 0.0699]],
    Single: [[10000, 0.02],[50000, 0.045],[100000, 0.055],[200000, 0.06],[250000, 0.065],[500000, 0.069],[Infinity, 0.0699]],
    stdDed: { MFJ: 24000, Single: 15000, HoH: 19000, MFS: 12000 },
  },
  MA: {
    name: 'Massachusetts', label: '麻省',
    MFJ: [[1053750, 0.05],[Infinity, 0.09]],
    Single: [[1053750, 0.05],[Infinity, 0.09]],
    stdDed: { MFJ: 8800, Single: 4400, HoH: 6800, MFS: 4400 },
    note: '5% 固定 + 百万富翁附加税 4%',
  },
  PA: {
    name: 'Pennsylvania', label: '宾州',
    MFJ: [[Infinity, 0.0307]],
    Single: [[Infinity, 0.0307]],
    stdDed: { MFJ: 0, Single: 0, HoH: 0, MFS: 0 },
    note: '3.07% 全州统一 · 不允许 itemize',
  },
  NH: {
    name: 'New Hampshire', label: '新罕布什尔',
    MFJ: [[Infinity, 0]], Single: [[Infinity, 0]],
    stdDed: { MFJ: 0, Single: 0, HoH: 0, MFS: 0 },
    note: '工资 0% · 投资收入 4%',
  },

  // ── 南部 ──
  VA: {
    name: 'Virginia', label: '弗吉尼亚',
    MFJ: [[3000, 0.02],[5000, 0.03],[17000, 0.05],[Infinity, 0.0575]],
    Single: [[3000, 0.02],[5000, 0.03],[17000, 0.05],[Infinity, 0.0575]],
    stdDed: { MFJ: 17000, Single: 8500, HoH: 8500, MFS: 8500 },
  },
  MD: {
    name: 'Maryland', label: '马里兰',
    MFJ: [[1000, 0.02],[2000, 0.03],[3000, 0.04],[150000, 0.0475],[175000, 0.05],[225000, 0.0525],[300000, 0.055],[Infinity, 0.0575]],
    Single: [[1000, 0.02],[2000, 0.03],[3000, 0.04],[100000, 0.0475],[125000, 0.05],[150000, 0.0525],[250000, 0.055],[Infinity, 0.0575]],
    stdDed: { MFJ: 4850, Single: 2450, HoH: 4850, MFS: 2450 },
    note: '另含 2.25-3.2% 县税（未纳入估算）',
  },
  NC: {
    name: 'North Carolina', label: '北卡',
    MFJ: [[Infinity, 0.0425]], Single: [[Infinity, 0.0425]],
    stdDed: { MFJ: 25500, Single: 12750, HoH: 19125, MFS: 12750 },
    note: '4.25% 统一',
  },
  GA: {
    name: 'Georgia', label: '佐治亚',
    MFJ: [[Infinity, 0.0539]], Single: [[Infinity, 0.0539]],
    stdDed: { MFJ: 24000, Single: 12000, HoH: 18000, MFS: 12000 },
    note: '5.39% 统一（2024 起）',
  },
  FL: {
    name: 'Florida', label: '佛罗里达',
    MFJ: [[Infinity, 0]], Single: [[Infinity, 0]],
    stdDed: { MFJ: 0, Single: 0, HoH: 0, MFS: 0 },
    note: '无州所得税 ✓',
  },
  TX: {
    name: 'Texas', label: '德克萨斯',
    MFJ: [[Infinity, 0]], Single: [[Infinity, 0]],
    stdDed: { MFJ: 0, Single: 0, HoH: 0, MFS: 0 },
    note: '无州所得税 ✓（但地税高）',
  },
  TN: {
    name: 'Tennessee', label: '田纳西',
    MFJ: [[Infinity, 0]], Single: [[Infinity, 0]],
    stdDed: { MFJ: 0, Single: 0, HoH: 0, MFS: 0 },
    note: '无州所得税 ✓',
  },
  DC: {
    name: 'Washington DC', label: '华盛顿特区',
    MFJ: [[10000, 0.04],[40000, 0.06],[60000, 0.065],[250000, 0.085],[500000, 0.0925],[1000000, 0.0975],[Infinity, 0.1075]],
    Single: [[10000, 0.04],[40000, 0.06],[60000, 0.065],[250000, 0.085],[500000, 0.0925],[1000000, 0.0975],[Infinity, 0.1075]],
    stdDed: { MFJ: 29200, Single: 14600, HoH: 21900, MFS: 14600 },
  },

  // ── 中西部 ──
  IL: {
    name: 'Illinois', label: '伊利诺伊',
    MFJ: [[Infinity, 0.0495]], Single: [[Infinity, 0.0495]],
    stdDed: { MFJ: 0, Single: 0, HoH: 0, MFS: 0 },
    note: '4.95% 统一',
  },
  OH: {
    name: 'Ohio', label: '俄亥俄',
    MFJ: [[26050, 0],[100000, 0.0275],[Infinity, 0.035]],
    Single: [[26050, 0],[100000, 0.0275],[Infinity, 0.035]],
    stdDed: { MFJ: 0, Single: 0, HoH: 0, MFS: 0 },
    note: '含市税（本表不含）',
  },
  MI: {
    name: 'Michigan', label: '密歇根',
    MFJ: [[Infinity, 0.0425]], Single: [[Infinity, 0.0425]],
    stdDed: { MFJ: 0, Single: 0, HoH: 0, MFS: 0 },
    note: '4.25% 统一 · 部分城市另加',
  },
  IN: {
    name: 'Indiana', label: '印第安纳',
    MFJ: [[Infinity, 0.0305]], Single: [[Infinity, 0.0305]],
    stdDed: { MFJ: 0, Single: 0, HoH: 0, MFS: 0 },
    note: '3.05% + 县税',
  },

  // ── 西部 ──
  CA: {
    name: 'California', label: '加州',
    // 2025 brackets · FTB 2025-540 Tax Rate Schedules
    MFJ: [[21512, 0.01],[50998, 0.02],[80490, 0.04],[111732, 0.06],[141212, 0.08],[721318, 0.093],[865574, 0.103],[1442628, 0.113],[Infinity, 0.123]],
    Single: [[10756, 0.01],[25499, 0.02],[40245, 0.04],[55866, 0.06],[70606, 0.08],[360659, 0.093],[432787, 0.103],[721314, 0.113],[Infinity, 0.123]],
    stdDed: { MFJ: 11412, Single: 5706, HoH: 11412, MFS: 5706 },
    note: '2025: 9 档 1%-12.3% + 1% MHT（taxable > $1M）· 最高 13.3% · + SDI 1.2% 工资无上限',
    mhtThreshold: 1000000,  // Mental Health Tax · 超过 $1M 部分 + 1%
    sdiRate: 0.012,           // State Disability Insurance · 2024+ 无上限
    nonConformity: [
      'QBI §199A 不承认 · CA 仍按 100% 算收入',
      'QSBS §1202 不承认 · CA 对合格小企业股出售不免税',
      '100% Bonus Depreciation 不承认 · 需 add-back',
      'FSA / HSA 某些雇主 contribution 州层面有差异',
    ],
  },
  NV: {
    name: 'Nevada', label: '内华达',
    MFJ: [[Infinity, 0]], Single: [[Infinity, 0]],
    stdDed: { MFJ: 0, Single: 0, HoH: 0, MFS: 0 },
    note: '无州所得税 ✓',
  },
  WA: {
    name: 'Washington', label: '华盛顿州',
    MFJ: [[Infinity, 0]], Single: [[Infinity, 0]],
    stdDed: { MFJ: 0, Single: 0, HoH: 0, MFS: 0 },
    note: '无工资州所得税 · 资本利得 7%（>$250K）',
  },
  OR: {
    name: 'Oregon', label: '俄勒冈',
    MFJ: [[7900, 0.0475],[19950, 0.0675],[250000, 0.0875],[Infinity, 0.099]],
    Single: [[3950, 0.0475],[9950, 0.0675],[125000, 0.0875],[Infinity, 0.099]],
    stdDed: { MFJ: 5185, Single: 2605, HoH: 4155, MFS: 2605 },
  },
  AZ: {
    name: 'Arizona', label: '亚利桑那',
    MFJ: [[Infinity, 0.025]], Single: [[Infinity, 0.025]],
    stdDed: { MFJ: 29200, Single: 14600, HoH: 21900, MFS: 14600 },
    note: '2.5% 统一（2023 起）',
  },
  CO: {
    name: 'Colorado', label: '科罗拉多',
    MFJ: [[Infinity, 0.044]], Single: [[Infinity, 0.044]],
    stdDed: { MFJ: 29200, Single: 14600, HoH: 21900, MFS: 14600 },
    note: '4.4% 统一',
  },
  UT: {
    name: 'Utah', label: '犹他',
    // 2025 retroactive to Jan 1 · HB 106 · 4.55% → 4.50%
    MFJ: [[Infinity, 0.045]], Single: [[Infinity, 0.045]],
    stdDed: { MFJ: 0, Single: 0, HoH: 0, MFS: 0 },
    note: '4.50% 统一 · 2025 retroactive 下调 · Taxpayer Tax Credit 使高收入有效累进',
  },
  AK: {
    name: 'Alaska', label: '阿拉斯加',
    MFJ: [[Infinity, 0]], Single: [[Infinity, 0]],
    stdDed: { MFJ: 0, Single: 0, HoH: 0, MFS: 0 },
    note: '无州所得税 · 无州销售税 · PFD 2025 每人 $1,000（联邦征税）',
  },
  WY: {
    name: 'Wyoming', label: '怀俄明',
    MFJ: [[Infinity, 0]], Single: [[Infinity, 0]],
    stdDed: { MFJ: 0, Single: 0, HoH: 0, MFS: 0 },
    note: '无州所得税 ✓',
  },
  SD: {
    name: 'South Dakota', label: '南达科他',
    MFJ: [[Infinity, 0]], Single: [[Infinity, 0]],
    stdDed: { MFJ: 0, Single: 0, HoH: 0, MFS: 0 },
    note: '无州所得税 ✓',
  },
};

// ═══════════════════════════════════════════════════════════
//  市税 / 地方税（Local Income Tax）
// ═══════════════════════════════════════════════════════════

const LOCAL_TAXES = {
 'NY-nyc': {
    name: 'NYC 市税',
    state: 'NY',
    type: 'progressive',
    MFJ: [[21600, 0.03078], [45000, 0.03762], [90000, 0.03819], [Infinity, 0.03876]],
    Single: [[12000, 0.03078], [25000, 0.03762], [50000, 0.03819], [Infinity, 0.03876]],
    note: '居民税（非居民不缴）',
  },
 'NY-yonkers': {
    name: 'Yonkers 附加税',
    state: 'NY',
    type: 'surcharge',
    rate: 0.1675,
    note: 'NY 州税 × 16.75%（居民）',
  },
 'PA-phila': {
    name: '费城工资税',
    state: 'PA',
    type: 'flat',
    rate: 0.0375,
    note: '3.75% 居民 · 3.44% 非居民',
  },
 'PA-pgh': {
    name: '匹兹堡工资税',
    state: 'PA',
    type: 'flat',
    rate: 0.03,
    note: '3% Total (School + Local)',
  },
 'OH-cleveland': {
    name: '克利夫兰市税',
    state: 'OH',
    type: 'flat',
    rate: 0.025,
  },
 'OH-columbus': {
    name: '哥伦布市税',
    state: 'OH',
    type: 'flat',
    rate: 0.025,
  },
 'MI-detroit': {
    name: '底特律市税',
    state: 'MI',
    type: 'flat',
    rate: 0.024,
  },
 'MD-balt': {
    name: '巴尔的摩县税',
    state: 'MD',
    type: 'flat',
    rate: 0.032,
  },
 'MD-mont': {
    name: 'Montgomery 县税',
    state: 'MD',
    type: 'flat',
    rate: 0.032,
  },
};

// 哪些州有可选的市税
const CITIES_BY_STATE = {
  NY: [
    { v: '', l: '（其它纽约州地区）' },
    { v: 'nyc', l: 'New York City 纽约市' },
    { v: 'yonkers', l: 'Yonkers' },
  ],
  PA: [
    { v: '', l: '（其它宾州）' },
    { v: 'phila', l: 'Philadelphia 费城' },
    { v: 'pgh', l: 'Pittsburgh' },
  ],
  OH: [
    { v: '', l: '（其它俄亥俄）' },
    { v: 'cleveland', l: 'Cleveland' },
    { v: 'columbus', l: 'Columbus' },
  ],
  MI: [
    { v: '', l: '（其它密歇根）' },
    { v: 'detroit', l: 'Detroit' },
  ],
  MD: [
    { v: '', l: 'MD 其它' },
    { v: 'balt', l: 'Baltimore County' },
    { v: 'mont', l: 'Montgomery County' },
  ],
  // v100 CA: 加拿大省份下的主要城市 · state 字段复用
  ON: [
    { v: '', l: '（其它安省）' },
    { v: 'toronto', l: 'Toronto 多伦多' },
    { v: 'markham', l: 'Markham 万锦' },
    { v: 'mississauga', l: 'Mississauga 密西沙加' },
    { v: 'ottawa', l: 'Ottawa 渥太华' },
    { v: 'waterloo', l: 'Waterloo 滑铁卢' },
  ],
  BC: [
    { v: '', l: '（其它卑诗）' },
    { v: 'vancouver', l: 'Vancouver 温哥华' },
    { v: 'richmond', l: 'Richmond 列治文' },
    { v: 'burnaby', l: 'Burnaby 本拿比' },
    { v: 'surrey', l: 'Surrey 素里' },
  ],
  QC: [
    { v: '', l: '（其它魁北克）' },
    { v: 'montreal', l: 'Montreal 蒙特利尔' },
    { v: 'quebec', l: 'Quebec City 魁北克城' },
  ],
  AB: [
    { v: '', l: '（其它阿省）' },
    { v: 'calgary', l: 'Calgary 卡尔加里' },
    { v: 'edmonton', l: 'Edmonton 埃德蒙顿' },
  ],
};

// 州分组（下拉用）
const STATE_GROUPS = [
  { label: '东北', states: ['NY', 'NJ', 'CT', 'MA', 'PA', 'NH'] },
  { label: '南部', states: ['VA', 'MD', 'DC', 'NC', 'GA', 'FL', 'TX', 'TN'] },
  { label: '中西部', states: ['IL', 'OH', 'MI', 'IN'] },
  { label: '西部', states: ['CA', 'NV', 'WA', 'OR', 'AZ', 'CO', 'UT'] },
  { label: '无税小州', states: ['AK', 'WY', 'SD'] },
];

// ═══════════════════════════════════════════════════════════
//  州间 Reciprocal Agreements（互惠协议）
//  两州有协议 → 只在居住州交税，工作州免缴
// ═══════════════════════════════════════════════════════════

const RECIPROCAL_AGREEMENTS = {
  NJ: ['PA'],
  PA: ['NJ', 'VA', 'MD', 'OH', 'IN', 'WV'],
  VA: ['DC', 'MD', 'PA', 'WV', 'KY'],
  MD: ['DC', 'PA', 'VA', 'WV'],
  DC: ['VA', 'MD'],
  OH: ['IN', 'KY', 'MI', 'PA', 'WV'],
  IN: ['KY', 'MI', 'OH', 'PA', 'WI'],
  MI: ['IL', 'IN', 'KY', 'MN', 'OH', 'WI'],
  IL: ['IA', 'KY', 'MI', 'WI'],
  WI: ['IL', 'IN', 'KY', 'MI'],
  KY: ['IL', 'IN', 'MI', 'OH', 'VA', 'WV', 'WI'],
  WV: ['KY', 'MD', 'OH', 'PA', 'VA'],
  MN: ['MI', 'ND'],
  ND: ['MN', 'MT'],
  MT: ['ND'],
  IA: ['IL'],
};

// 常见的"特殊跨州工作"组合（给出具体提示）
const CROSS_STATE_NOTES = {
 'NJ-NY': '最常见：NJ 居住 · NY 工作（不 reciprocal）→ NY 先扣，NJ 给信用额度抵',
 'CT-NY': 'CT 居住 · NY 工作（不 reciprocal）→ 两边都报，CT 给抵免',
 'NJ-PA': 'NJ 居住 · PA 工作 → 有 reciprocal 协议，只在 NJ 交',
 'PA-NY': 'PA 居住 · NY 工作（不 reciprocal）→ NY 先扣，PA 给抵免（但 PA 不抵 NYC 市税）',
 'NY-NJ': 'NY 居住 · NJ 工作 → 两边都报，NY 给抵免',
 'CA-NY': '罕见组合：远程工作时要看 nexus 规则',
 'FL-NY': '经典 "搬 FL 避税"：NY 有 Convenience 规则 → 即使远程，NY 照样扣',
 'FL-NJ': 'FL 居住 · NJ 物理工作 → NJ 来源权仍在；真正省税靠远程工作天数',
 'FL-CA': 'FL 居住 · CA 物理工作 → CA 来源权仍在（CA 无 convenience）→ 远程可省',
 'TX-NY': '同 FL-NY：NY Convenience 规则卡死远程',
 'TX-CA': 'CA 无 convenience rule → 真远程可省',
 'NV-CA': '同 TX-CA',
};

// ═══════════════════════════════════════════════════════════
//  Convenience of Employer 规则州
//  这些州：即使你远程在别处工作，只要雇主在本州，工资仍算本州来源
//  → 远程天数白干，除非雇主"必要性"证明（极难）
// ═══════════════════════════════════════════════════════════

const CONVENIENCE_RULE_STATES = {
  NY: '自 2006 起严格执行 · 唯一例外：雇主"必要性"证明（几乎不给）',
  NE: 'Nebraska · 类 NY 规则',
  PA: 'Pennsylvania · 限定条件',
  DE: 'Delaware · Wynne 判决后仍适用',
  AR: 'Arkansas · 2021 起放宽',
};

// ═══════════════════════════════════════════════════════════
//  IRS 2025 限额（全部经过 2026-04 核对）
//  来源：IRS Notice 2024-80 + Rev. Proc. 2024-40 + OBBBA 2025
// ═══════════════════════════════════════════════════════════

// Social Security & FICA
const SS_WAGE_BASE_2025 = 176100;  // SS 工资基数（2024 是 $168,600）
const ADDL_MEDICARE_THRESHOLD = { Single: 200000, HoH: 200000, MFJ: 250000, MFS: 125000 };

// 401(k) / 403(b) / 457 / TSP
const K401_LIMIT_2025 = 23500;           // 员工 elective deferral
const K401_CATCHUP_50 = 7500;            // 50-59, 64+ catch-up
const K401_CATCHUP_60_63 = 11250;        // 60-63 super catch-up (SECURE 2.0)
const K401_TOTAL_415C_2025 = 70000;      // 员工 + 雇主 + after-tax 合计上限
const K401_TOTAL_50PLUS = 77500;         // 50-59/64+ (含 catch-up)
const K401_TOTAL_60_63 = 81250;          // 60-63 (含 super catch-up)
const COMP_CAP_2025 = 350000;            // Solo 401(k) compensation cap

// Solo 401(k) 保留旧名以兼容既有代码
const SOLO_K401_TOTAL_2025 = K401_TOTAL_415C_2025;

// IRA
const IRA_LIMIT_2025 = 7000;
const IRA_CATCHUP_50 = 1000;             // 50+ catch-up
// Roth IRA phase-out 2025
const ROTH_IRA_PHASE_OUT = {
  Single: [150000, 165000],
  HoH: [150000, 165000],
  MFJ: [236000, 246000],
  MFS: [0, 10000],
};

// HSA (Health Savings Account)
const HSA_LIMIT_2025 = { Self: 4300, Family: 8550 };
const HSA_CATCHUP_55 = 1000;             // 55+ catch-up
// HDHP 2025 要求（HSA 资格条件）
const HDHP_MIN_DEDUCTIBLE = { Self: 1650, Family: 3300 };
const HDHP_MAX_OOP = { Self: 8300, Family: 16600 };

// FSA
const HEALTH_FSA_LIMIT_2025 = 3300;
const HEALTH_FSA_CARRYOVER = 660;
const DCFSA_LIMIT_2025 = 5000;           // 2025 还是旧值 $5K，OBBBA 改变从 2026 起 $7,500
const DCFSA_MFS_2025 = 2500;

// Commuter Benefits
const COMMUTER_MONTHLY_2025 = 325;       // 2024 是 $315
const COMMUTER_YEARLY_2025 = COMMUTER_MONTHLY_2025 * 12;  // $3,900

// Additional Medicare Tax threshold
// （已在 ADDL_MEDICARE_THRESHOLD 上面定义）

// ═══════════════════════════════════════════════════════════
//  税务计算核心
// ═══════════════════════════════════════════════════════════

function progressiveTax(income, brackets) {
  if (income <= 0) return 0;
  let tax = 0, prev = 0;
  for (const [limit, rate] of brackets) {
    if (income <= prev) break;
    tax += (Math.min(income, limit) - prev) * rate;
    prev = limit;
  }
  return tax;
}

function marginalRate(income, brackets) {
  for (const [limit, rate] of brackets) {
    if (income < limit) return rate;
  }
  return brackets[brackets.length - 1][1];
}

function saltCap(magi, filingStatus) {
  const threshold = filingStatus === 'MFJ' ? 500000 : 250000;
  const end = filingStatus === 'MFJ' ? 600000 : 300000;
  if (magi <= threshold) return 40000;
  if (magi >= end) return 10000;
  const ratio = (magi - threshold) / (end - threshold);
  return 40000 - ratio * 30000;
}

function computeLocalTax(state, city, filingStatus, stateTax, stateTaxable) {
  const key = `${state}-${city}`;
  const rule = LOCAL_TAXES[key];
  if (!rule) return { tax: 0, rule: null };
  if (rule.type === 'surcharge') {
    return { tax: stateTax * rule.rate, rule };
  }
  if (rule.type === 'flat') {
    return { tax: stateTaxable * rule.rate, rule };
  }
  if (rule.type === 'progressive') {
    return { tax: progressiveTax(stateTaxable, rule[filingStatus] || rule.Single), rule };
  }
  return { tax: 0, rule: null };
}

function computeTax(i) {
  const selfW2 = i.w2 || 0;
  const spouseW2 = i.filingStatus === 'MFJ' ? (i.spouseW2 || 0) : 0;
  const totalW2 = selfW2 + spouseW2;
  const inc1099 = i.inc1099 || 0;

  const net1099 = Math.max(0, inc1099 - (i.expense1099 || 0));
  const seTaxBase = net1099 * 0.9235;
  const seTax = seTaxBase > 0
    ? seTaxBase * 0.124 + seTaxBase * 0.029 + Math.max(0, seTaxBase - 200000) * 0.009
    : 0;
  const seDed = seTax / 2;

  const k401Pretax = Math.min(i.k401 || 0, K401_LIMIT_2025);
  const hsaContrib = i.hsa || 0;

  // ── 房产聚合 ──
  const properties = i.properties || [];
  const personalProps = properties.filter(p => p.type === 'primary' || p.type === 'second_home');
  const rentalProps = properties.filter(p => p.type === 'rental');

  // Sched A：自住 + 二套 的 SALT + mortgage interest
  const totalPropTaxSchedA = personalProps.reduce((s, p) => s + (Number(p.propertyTax) || 0), 0);
  // 房贷利息：primary + 最多 1 second_home（简化）
  const primaryMort = personalProps.find(p => p.type === 'primary')?.mortInt || 0;
  const secondMort = (personalProps.find(p => p.type === 'second_home')?.mortInt) || 0;
  const mortInt = Number(primaryMort) + Number(secondMort);

  // Sched E：出租房净收入/净亏（简化处理）
  const rentalNet = rentalProps.reduce((s, p) => {
    const income = Number(p.rentalIncome) || 0;
    const exp = (Number(p.rentalExpenses) || 0) + (Number(p.propertyTax) || 0) + (Number(p.mortInt) || 0) + (Number(p.depreciation) || 0);
    return s + (income - exp);
  }, 0);
  // 被动损失规则复杂，这里简化：仅取正的 rental net 计入 AGI，亏损留作结转提示
  const rentalGainToAGI = Math.max(0, rentalNet);
  const rentalLossSuspended = Math.min(0, rentalNet);

  // 投资收入（v34 新增）
  const interest = i.interest || 0;
  const dividends = i.dividends || 0;
  const qualifiedDividends = Math.min(dividends, (i.qualifiedDividends != null ? i.qualifiedDividends : dividends * 0.85));
  const ordinaryDividends = Math.max(0, dividends - qualifiedDividends);
  const capGainsLT = i.capGainsLT || 0;  // 长期资本利得（>1年）
  const capGainsST = i.capGainsST || 0;  // 短期资本利得（按普通税率）
  const preferentialIncome = capGainsLT + qualifiedDividends;  // 享受优惠税率的部分
  const ordinaryInvestIncome = interest + ordinaryDividends + capGainsST; // 普通税率部分

  const grossWages = totalW2 + net1099 + rentalGainToAGI + interest + dividends + capGainsLT + capGainsST;
  const aboveLine = k401Pretax + hsaContrib + seDed;
  const agi = Math.max(0, grossWages - aboveLine);

  const stateRules = STATE_BRACKETS[i.state] || STATE_BRACKETS.TX;
  const estStateTax = progressiveTax(
    Math.max(0, agi - (stateRules.stdDed[i.filingStatus] || 0)),
    stateRules[i.filingStatus] || stateRules.Single
  );
  const medicalExp = Math.max(0, (i.medical || 0) - 0.075 * agi);
  const charity = i.charity || 0;

  // SALT 原始 = 州税预估 + 所有自住/二套的地税
  const saltRaw = estStateTax + totalPropTaxSchedA;
  const cap = saltCap(agi, i.filingStatus);
  const saltCapped = Math.min(saltRaw, cap);
  const itemized = saltCapped + mortInt + charity + medicalExp;
  const stdDed = STD_DED[i.filingStatus];
  const fedDed = Math.max(stdDed, itemized);
  const useItemize = itemized > stdDed;

  const fedTaxable_beforeOBBBA = Math.max(0, agi - fedDed);
  const fedBrackets = FED_BRACKETS[i.filingStatus];

  // v96: OBBBA 2025 新增 4 项 deduction · 都是 2025-2028 临时
  // MAGI for phase-out = AGI（简化 · 严格定义加回 student loan / FEIE 等）
  const magi = agi;
  const phaseCalc = (raw, threshold, ratePerK, max) => {
    if (!raw) return 0;
    const over = Math.max(0, magi - threshold);
    if (over === 0) return Math.min(raw, max);
    const reduction = (over / 1000) * ratePerK;  // $ reduced per $1000 over
    const adjustedMax = Math.max(0, max - reduction);
    return Math.min(raw, adjustedMax);
  };
  // 1. No Tax on Tips · 最多 $25K · phase-out @ MAGI $150K Single / $300K MFJ · $100/$1K
  const tipThreshold = i.filingStatus === 'MFJ' ? 300000 : 150000;
  const tipsDeduction = phaseCalc(i.qualifiedTips || 0, tipThreshold, 100, 25000);
  // 2. No Tax on Overtime · 最多 $12.5K / $25K MFJ · 同 phase-out
  const otThreshold = i.filingStatus === 'MFJ' ? 300000 : 150000;
  const otMax = i.filingStatus === 'MFJ' ? 25000 : 12500;
  const overtimeDeduction = phaseCalc(i.qualifiedOvertime || 0, otThreshold, 100, otMax);
  // 3. Senior Bonus $6K · per eligible person · phase-out @ MAGI $75K Single / $150K MFJ · $60/$1K (= 6%)
  const seniorThreshold = i.filingStatus === 'MFJ' ? 150000 : 75000;
  const seniorCount = (i.senior65 ? 1 : 0) + (i.spouseSenior65 ? 1 : 0);
  const seniorBonusRaw = seniorCount * 6000;
  const seniorBonus = phaseCalc(seniorBonusRaw, seniorThreshold, 60, seniorBonusRaw);
  // 4. Car Loan Interest · 最多 $10K · phase-out @ MAGI $100K Single / $200K MFJ · $200/$1K
  const carThreshold = i.filingStatus === 'MFJ' ? 200000 : 100000;
  const carLoanInterestDeduction = phaseCalc(i.carLoanInterest || 0, carThreshold, 200, 10000);
  const obbba2025Deductions = tipsDeduction + overtimeDeduction + seniorBonus + carLoanInterestDeduction;
  const fedTaxable = Math.max(0, fedTaxable_beforeOBBBA - obbba2025Deductions);

  // LT Cap Gains + Qualified Dividends 享受优惠税率（0/15/20%）
  // 2025 阈值（简化版）：
  const ltCGBrackets = i.filingStatus === 'MFJ'
    ? [[96700, 0], [600050, 0.15], [Infinity, 0.20]]
    : i.filingStatus === 'HoH'
    ? [[64750, 0], [566700, 0.15], [Infinity, 0.20]]
    : [[48350, 0], [533400, 0.15], [Infinity, 0.20]];  // Single/MFS

  // "Stacking" 方法简化：先按普通税率算"应税收入 − 优惠部分"，
  // 再给优惠部分单独应用 LT 税率（实际 IRS 比这更复杂）
  const ordinaryTaxable = Math.max(0, fedTaxable - preferentialIncome);
  const fedTaxOrdinary = progressiveTax(ordinaryTaxable, fedBrackets);
  // 优惠部分在已有 ordinary taxable 之上的 bracket
  const preferentialStart = ordinaryTaxable;
  const preferentialEnd = preferentialStart + preferentialIncome;
  let fedTaxPref = 0;
  let remainingPref = preferentialIncome;
  let prevThresh = 0;
  for (const [thresh, rate] of ltCGBrackets) {
    if (remainingPref <= 0) break;
    const bucketStart = Math.max(prevThresh, preferentialStart);
    const bucketEnd = Math.min(thresh, preferentialEnd);
    const bucketSize = Math.max(0, bucketEnd - bucketStart);
    const amt = Math.min(remainingPref, bucketSize);
    fedTaxPref += amt * rate;
    remainingPref -= amt;
    prevThresh = thresh;
  }
  const fedTax = fedTaxOrdinary + fedTaxPref;
  const marginalFed = marginalRate(fedTaxable, fedBrackets);

  const stateDed = stateRules.stdDed[i.filingStatus] || 0;
  const stateAGI = i.state === 'NJ' ? grossWages - seDed : agi;
  const stateTaxable = Math.max(0, stateAGI - stateDed);
  const stateBrackets = stateRules[i.filingStatus] || stateRules.Single;
  const residentStateTax = progressiveTax(stateTaxable, stateBrackets);
  const marginalState = marginalRate(stateTaxable, stateBrackets);

  // v93: CA Mental Health Services Tax · 1% 附加税 on taxable > $1M（所有 filing status 均 $1M 阈值）
  let caMHT = 0;
  if (i.state === 'CA' && stateRules.mhtThreshold) {
    caMHT = Math.max(0, stateTaxable - stateRules.mhtThreshold) * 0.01;
  }
  // v93: CA SDI · 1.2% of W2 wages · 2024 起无上限
  let caSDI = 0;
  if (i.state === 'CA' && stateRules.sdiRate) {
    caSDI = totalW2 * stateRules.sdiRate;
  }

  // ── 跨州工作：在工作州作为非居民纳税，居住州给抵免 ──
  let workStateTax = 0;
  let crossStateCredit = 0;
  let isReciprocal = false;
  let workStateDetails = null;
  let hasConvenience = false;
  let effectiveWorkPortion = 1;

  const hasWorkState = i.workState && i.workState !== i.state;
  if (hasWorkState) {
    const reciprocalList = RECIPROCAL_AGREEMENTS[i.state] || [];
    if (reciprocalList.includes(i.workState)) {
      isReciprocal = true; // 互惠 → 工作州不扣税
    } else {
      const workRules = STATE_BRACKETS[i.workState];
      if (workRules) {
        // 物理在工作州的天数比例（100 = 全部天都在工作州物理上班）
        const rawDays = i.workStateDays ?? 100;
        const userPortion = Math.max(0, Math.min(100, rawDays)) / 100;
        // Convenience Rule 州：即使远程，仍视为全在工作州工作
        hasConvenience = CONVENIENCE_RULE_STATES[i.workState] != null;
        effectiveWorkPortion = hasConvenience ? 1 : userPortion;

        // 工作州源的 W2 收入（只有这部分被非居民税）
        const workSourceW2 = totalW2 * effectiveWorkPortion;
        const workStdDed = (workRules.stdDed[i.filingStatus] || 0) * effectiveWorkPortion;
        const workTaxable = Math.max(0, workSourceW2 - workStdDed);
        const workBrackets = workRules[i.filingStatus] || workRules.Single;
        workStateTax = progressiveTax(workTaxable, workBrackets);

        // 居住州给抵免（不超过居住州在该收入上的税）
        if (workSourceW2 > 0 && stateTaxable > 0) {
          const workPortionOfResident = Math.min(workSourceW2, stateTaxable) / stateTaxable;
          const residentTaxOnWorkPortion = residentStateTax * workPortionOfResident;
          crossStateCredit = Math.min(workStateTax, residentTaxOnWorkPortion);
        }
        workStateDetails = {
          state: i.workState,
          name: workRules.label || workRules.name || i.workState,
          rawTax: workStateTax,
          credit: crossStateCredit,
          hasConvenience,
          daysPortion: userPortion,
          effectivePortion: effectiveWorkPortion,
          sourceW2: workSourceW2,
        };
      }
    }
  }

  const stateTax = residentStateTax - crossStateCredit + workStateTax + caMHT + caSDI;

  // 市税 / 地方税（基于居住州）
  const { tax: localTax, rule: localRule } = computeLocalTax(i.state, i.city || '', i.filingStatus, residentStateTax, stateTaxable);

  const ssTax = Math.min(totalW2, SS_WAGE_BASE_2025) * 0.062;
  const medicareTax = totalW2 * 0.0145;
  const addlMedicare = Math.max(0,
    totalW2 - (i.filingStatus === 'MFJ' ? 250000 : 200000)
  ) * 0.009;
  const fica = ssTax + medicareTax + addlMedicare;

  const totalTax = fedTax + stateTax + localTax + fica + seTax;
  const effectiveRate = grossWages > 0 ? totalTax / grossWages : 0;
  const takeHome = grossWages - totalTax;

  // 当下到手现金（真正能花的钱）= Gross - 税 - 各种 pre-tax 供款（延税/免税账户）
  // 这部分钱"不在账户里"，虽然是你的资产，但不能当现金花
  const deferredAssets =
    (k401Pretax || 0) +      // W2 401(k) pre-tax
    (hsaContrib || 0) +      // HSA
    (i.dcfsa ? 5000 : 0) +   // Dependent Care FSA
    (i.commuterBenefit ? Math.min((i.w2 || 0) * 0.04, COMMUTER_YEARLY_2025) : 0); // Commuter 2025: $325/mo = $3,900/yr max
  const cashTakeHome = takeHome - deferredAssets;

  return {
    grossWages, agi, fedDed, fedTaxable, stdDed, itemized,
    // v96: OBBBA 2025 新 deduction 分解
    tipsDeduction, overtimeDeduction, seniorBonus, carLoanInterestDeduction, obbba2025Deductions,
    useItemize, saltRaw, saltCapped, saltCap: cap, saltLost: saltRaw - saltCapped,
    fedTax, fedTaxOrdinary, fedTaxPref,
    stateTax, fica, seTax, totalTax,
    localTax, localRule,
    caMHT, caSDI,  // v93: CA-specific
    residentStateTax, workStateTax, crossStateCredit, isReciprocal, workStateDetails,
    marginalFed, marginalState, marginalCombined: marginalFed + marginalState,
    effectiveRate, takeHome, cashTakeHome, deferredAssets,
    totalW2, net1099, k401Pretax, hsaContrib, seDed,
    ssTax, medicareTax, addlMedicare,
    estStateTax, totalPropTaxSchedA, mortInt, charity, medicalExp,
    stateAGI, stateTaxable, stateDed,
    rentalNet, rentalGainToAGI, rentalLossSuspended,
    // v34 投资收入
    interest, dividends, qualifiedDividends, ordinaryDividends,
    capGainsLT, capGainsST, preferentialIncome, ordinaryInvestIncome,
    ltCGBrackets,
  };
}

// ═══════════════════════════════════════════════════════════
// v99: 加拿大 2025 税率常数（独立数据表 · 和 US 完全隔离）
// 来源：CRA · Ontario Budget 2025 · Wealthsimple / TurboTax CA
// ═══════════════════════════════════════════════════════════
// 联邦 5 档 · 2025 特殊：7/1 起 15% → 14% · CRA 全年按 blended 14.5% 算
const CA_FED_BRACKETS = [
  [57375, 0.145],
  [114750, 0.205],
  [177882, 0.26],
  [253414, 0.29],
  [Infinity, 0.33],
];
// BPA（Basic Personal Amount · 加拿大版"标扣"· 但是 credit 机制 · 不是 deduction）
const CA_FED_BPA_MAX = 16129;
const CA_FED_BPA_MIN = 14538;
const CA_FED_BPA_PHASE_START = 177882;
const CA_FED_BPA_PHASE_END = 253414;
const CA_FED_BPA_CREDIT_RATE = 0.145;

// 13 省 / 地区 · 2025 tax brackets
const CA_PROV_BRACKETS = {
  ON: {
    name: 'Ontario', label: '安省',
    brackets: [[52886, 0.0505],[105775, 0.0915],[150000, 0.1116],[220000, 0.1216],[Infinity, 0.1316]],
    bpa: 12747,
    bpaRate: 0.0505,
    // Ontario surtax: 基础省税超阈值时加 20% · 再超加 36%
    surtax: { tier1: 5710, tier1Rate: 0.20, tier2: 7307, tier2Rate: 0.36 },
    // Ontario Health Premium (OHP) · 简化分档 · 最高 $900
    ohp: true,
  },
  BC: {
    name: 'British Columbia', label: '卑诗',
    brackets: [[49279, 0.0506],[98560, 0.077],[113158, 0.105],[137407, 0.1229],[186306, 0.147],[259829, 0.168],[Infinity, 0.205]],
    bpa: 11814, bpaRate: 0.0506,
  },
  QC: {
    name: 'Quebec', label: '魁北克',
    brackets: [[53255, 0.14],[106495, 0.19],[129590, 0.24],[Infinity, 0.2575]],
    bpa: 18056, bpaRate: 0.14,
    note: 'QC 单独报 TP-1 · 起步税率全国最高',
  },
  AB: {
    name: 'Alberta', label: '阿省',
    brackets: [[60000, 0.08],[151234, 0.10],[181481, 0.12],[241974, 0.13],[362961, 0.14],[Infinity, 0.15]],
    bpa: 21885, bpaRate: 0.08,
  },
  MB: {
    name: 'Manitoba', label: '曼省',
    brackets: [[47564, 0.108],[101200, 0.1275],[Infinity, 0.174]],
    bpa: 15969, bpaRate: 0.108,
  },
  SK: {
    name: 'Saskatchewan', label: '萨省',
    brackets: [[53463, 0.105],[152750, 0.125],[Infinity, 0.145]],
    bpa: 18491, bpaRate: 0.105,
  },
  NS: {
    name: 'Nova Scotia', label: '诺省',
    brackets: [[30507, 0.0879],[61015, 0.1495],[95883, 0.1667],[154650, 0.175],[Infinity, 0.21]],
    bpa: 11744, bpaRate: 0.0879,
  },
  NB: {
    name: 'New Brunswick', label: '新不省',
    brackets: [[51306, 0.094],[102614, 0.14],[190060, 0.16],[Infinity, 0.195]],
    bpa: 13396, bpaRate: 0.094,
  },
  NL: {
    name: 'Newfoundland and Labrador', label: '纽芬兰',
    brackets: [[44192, 0.087],[88382, 0.145],[157792, 0.158],[220910, 0.178],[282214, 0.198],[564429, 0.208],[1128858, 0.213],[Infinity, 0.218]],
    bpa: 11067, bpaRate: 0.087,
  },
  PE: {
    name: 'Prince Edward Island', label: '爱德华王子岛',
    brackets: [[33328, 0.095],[64656, 0.1347],[105000, 0.166],[140000, 0.1762],[Infinity, 0.19]],
    bpa: 14250, bpaRate: 0.095,
  },
  YT: {
    name: 'Yukon', label: '育空',
    brackets: [[57375, 0.064],[114750, 0.09],[177882, 0.109],[500000, 0.128],[Infinity, 0.15]],
    bpa: 16129, bpaRate: 0.064,
  },
  NT: {
    name: 'Northwest Territories', label: '西北地区',
    brackets: [[51964, 0.059],[103930, 0.086],[168967, 0.122],[Infinity, 0.1405]],
    bpa: 17373, bpaRate: 0.059,
  },
  NU: {
    name: 'Nunavut', label: '努纳武特',
    brackets: [[54707, 0.04],[109413, 0.07],[177881, 0.09],[Infinity, 0.115]],
    bpa: 19274, bpaRate: 0.04,
  },
};

// CPP / CPP2 / EI 2025
const CA_CPP_YMPE = 71300;
const CA_CPP_YAMPE = 81200;
const CA_CPP_BASIC_EXEMPTION = 3500;
const CA_CPP_RATE_EMP = 0.0595;        // 雇员
const CA_CPP_RATE_SELF = 0.119;        // 自雇（雇员 + 雇主合二）
const CA_CPP2_RATE_EMP = 0.04;
const CA_CPP2_RATE_SELF = 0.08;
const CA_EI_MIE = 65700;               // Max Insurable Earnings
const CA_EI_RATE_EMP = 0.0164;         // 非 QC · QC 为 1.31%

// RRSP / TFSA / FHSA / HBP 2025
const CA_RRSP_LIMIT = 32490;
const CA_TFSA_LIMIT = 7000;
const CA_FHSA_LIMIT_YR = 8000;
const CA_FHSA_LIFETIME = 40000;
const CA_HBP_LIMIT = 60000;
const CA_OAS_CLAWBACK = 93454;

// ═══════════════════════════════════════════════════════════
// v99: 加拿大税务计算引擎
// 返回和 US computeTax 兼容的 shape · 但数值是加拿大
// · US 特有字段（salt/amt/niit/oasdi）都 0
// · 新增字段在已有位置塞：stateTax = provTax, fica = cpp+ei, seTax = selfCPP
// · 让 UI 先跑起来 · v100 再改 UI 文案
// ═══════════════════════════════════════════════════════════
function computeTaxCA(i) {
  const selfW2 = i.w2 || 0;
  const spouseW2 = i.filingStatus === 'MFJ' ? (i.spouseW2 || 0) : 0;
  const totalW2 = selfW2 + spouseW2;
  const inc1099 = i.inc1099 || 0;
  const net1099 = Math.max(0, inc1099 - (i.expense1099 || 0));

  // 自雇 CPP + CPP2（双份 · 没有 EI · 替代 US SE Tax）
  let seCPPTotal = 0;
  if (net1099 > CA_CPP_BASIC_EXEMPTION) {
    const base = Math.min(net1099, CA_CPP_YMPE) - CA_CPP_BASIC_EXEMPTION;
    seCPPTotal += Math.max(0, base) * CA_CPP_RATE_SELF;
    const base2 = Math.max(0, Math.min(net1099, CA_CPP_YAMPE) - CA_CPP_YMPE);
    seCPPTotal += base2 * CA_CPP2_RATE_SELF;
  }
  const seTax = seCPPTotal;       // 复用字段名
  const seDed = seTax / 2;        // 一半可 above-line 扣

  // RRSP 供款作 above-line（类似 US 401k pre-tax）
  const rrspContrib = Math.min(i.k401 || 0, CA_RRSP_LIMIT);   // 复用 i.k401 字段
  const aboveLine = rrspContrib + seDed;

  // 房产（投资房）· 加拿大也有 T776 租金收入
  const properties = i.properties || [];
  const personalProps = properties.filter(p => p.type === 'primary' || p.type === 'second_home');
  const rentalProps = properties.filter(p => p.type === 'rental');
  const totalPropTaxSchedA = personalProps.reduce((s, p) => s + (Number(p.propertyTax) || 0), 0);
  const primaryMort = personalProps.find(p => p.type === 'primary')?.mortInt || 0;
  const secondMort = (personalProps.find(p => p.type === 'second_home')?.mortInt) || 0;
  const mortInt = Number(primaryMort) + Number(secondMort);
  const rentalNet = rentalProps.reduce((s, p) => {
    const income = Number(p.rentalIncome) || 0;
    const exp = (Number(p.rentalExpenses) || 0) + (Number(p.propertyTax) || 0) + (Number(p.mortInt) || 0);
    return s + (income - exp);
  }, 0);
  const rentalGainToAGI = Math.max(0, rentalNet);
  const rentalLossSuspended = Math.min(0, rentalNet);

  // 投资收入
  const interest = i.interest || 0;
  const dividends = i.dividends || 0;
  const qualifiedDividends = 0;   // 加拿大 dividend 机制不同 · 简化为 0
  const ordinaryDividends = dividends;
  const capGainsLT = i.capGainsLT || 0;
  const capGainsST = i.capGainsST || 0;
  // 加拿大 capital gains 50% inclusion rate（基础）
  const capGainsTotal = capGainsLT + capGainsST;
  const capGainsTaxable = capGainsTotal * 0.5;

  const grossWages = totalW2 + net1099 + rentalGainToAGI + interest + dividends + capGainsTotal;
  // Net income for tax = 全收入（含全额资本利得）- above line
  // 加拿大 capital gains 的 50% 不 taxable · 这里算 taxable income 时减掉
  const netIncomeTax = Math.max(0, grossWages - aboveLine - (capGainsTotal - capGainsTaxable));
  const agi = netIncomeTax;   // 复用字段名 · 加拿大这叫 taxable income
  const fedTaxable = agi;     // 加拿大用 BPA credit · 不做 deduction
  const fedTaxable_beforeOBBBA = fedTaxable;

  // 联邦 BPA（净收入越高 · BPA 越低）
  const fedBPA = agi <= CA_FED_BPA_PHASE_START
    ? CA_FED_BPA_MAX
    : agi >= CA_FED_BPA_PHASE_END
    ? CA_FED_BPA_MIN
    : CA_FED_BPA_MAX - (CA_FED_BPA_MAX - CA_FED_BPA_MIN)
      * (agi - CA_FED_BPA_PHASE_START) / (CA_FED_BPA_PHASE_END - CA_FED_BPA_PHASE_START);
  const fedBPACredit = fedBPA * CA_FED_BPA_CREDIT_RATE;
  // 联邦税 = progressive × brackets − BPA credit − charity credit
  const charity = i.charity || 0;
  const charityFedCredit = charity > 200 ? 200 * 0.15 + (charity - 200) * 0.29 : charity * 0.15;
  const fedTaxGross = progressiveTax(fedTaxable, CA_FED_BRACKETS);
  const fedTax = Math.max(0, fedTaxGross - fedBPACredit - charityFedCredit);
  const marginalFed = marginalRate(fedTaxable, CA_FED_BRACKETS);

  // 省税
  const provKey = i.state;       // 复用字段 · 值是省份代码 ON/BC/QC 等
  const provRules = CA_PROV_BRACKETS[provKey] || CA_PROV_BRACKETS.ON;
  const provTaxable = fedTaxable;
  const provTaxGross = progressiveTax(provTaxable, provRules.brackets);
  const provBPACredit = provRules.bpa * provRules.bpaRate;
  const charityProvCredit = charity > 200
    ? 200 * provRules.bpaRate + (charity - 200) * provRules.brackets[provRules.brackets.length - 1][1]
    : charity * provRules.bpaRate;
  let provTaxBase = Math.max(0, provTaxGross - provBPACredit - charityProvCredit);
  // ON surtax
  let onSurtax = 0;
  if (provKey === 'ON' && provRules.surtax) {
    const s = provRules.surtax;
    if (provTaxBase > s.tier2) {
      onSurtax = (provTaxBase - s.tier1) * s.tier1Rate + (provTaxBase - s.tier2) * s.tier2Rate;
    } else if (provTaxBase > s.tier1) {
      onSurtax = (provTaxBase - s.tier1) * s.tier1Rate;
    }
  }
  // ON Health Premium
  // v102 修复：ON Health Premium 2025 正确分档（按 provTaxable · 即 taxable income）
  // 规则：20K 以下免 · 超出部分 6% 但各档有 cap
  let onHealthPremium = 0;
  if (provKey === 'ON' && provRules.ohp && provTaxable > 20000) {
    if (provTaxable >= 200600) onHealthPremium = 900;                                 // 顶档
    else if (provTaxable >= 72600) onHealthPremium = 750 + (provTaxable - 72600) * 0.25 / 100;  // 750 起 + 0.25%
    else if (provTaxable >= 48600) onHealthPremium = 600 + (provTaxable - 48600) * 0.25 / 100;  // 600 起
    else if (provTaxable >= 38500) onHealthPremium = 450 + (provTaxable - 38500) * 0.25 / 100;  // 450 起
    else if (provTaxable >= 36000) onHealthPremium = 300 + (provTaxable - 36000) * 0.06;         // 300 起
    else if (provTaxable >= 25000) onHealthPremium = 300;                                        // 25K-36K 固定 300
    else onHealthPremium = (provTaxable - 20000) * 0.06;                                         // 20-25K 线性增
    onHealthPremium = Math.min(900, Math.max(0, onHealthPremium));
  }
  const stateTax = provTaxBase + onSurtax + onHealthPremium;
  const marginalState = marginalRate(provTaxable, provRules.brackets);

  // CPP + EI（雇员部分）· 替代 US FICA
  let cppEmp = 0, cpp2Emp = 0, eiEmp = 0;
  if (totalW2 > CA_CPP_BASIC_EXEMPTION) {
    const base = Math.min(totalW2, CA_CPP_YMPE) - CA_CPP_BASIC_EXEMPTION;
    cppEmp = Math.max(0, base) * CA_CPP_RATE_EMP;
    if (totalW2 > CA_CPP_YMPE) {
      const base2 = Math.max(0, Math.min(totalW2, CA_CPP_YAMPE) - CA_CPP_YMPE);
      cpp2Emp = base2 * CA_CPP2_RATE_EMP;
    }
  }
  eiEmp = Math.min(totalW2, CA_EI_MIE) * CA_EI_RATE_EMP;
  const fica = cppEmp + cpp2Emp + eiEmp;  // 复用 · 实际是 CPP + EI
  const ssTax = cppEmp + cpp2Emp;
  const medicareTax = 0;
  const addlMedicare = 0;

  // 市税 / 地方税 · 加拿大无
  const localTax = 0;
  const localRule = null;

  // 合计
  const totalTax = fedTax + stateTax + localTax + fica + seTax;
  const effectiveRate = grossWages > 0 ? totalTax / grossWages : 0;
  const takeHome = grossWages - totalTax;

  // v102: 字段名对齐 US (cashTakeHome / deferredAssets) · 避免 tunerPreview 读空
  const deferredAssets = rrspContrib;
  const cashTakeHome = takeHome - deferredAssets;
  // 兼容别名（以防老代码引用）
  const deferredCash = deferredAssets;
  const cashNow = cashTakeHome;

  // v102: marginalCombined · 下一美元的总边际（fed + prov + payroll）
  // · CPP + EI 只对 W2 收入适用 · 且有上限
  // · 简化：如果 totalW2 < YMPE 且 < MIE · 加 7.59% (CPP 5.95% + EI 1.64%)
  // · 超过上限就只算 fed + prov
  let marginalPayroll = 0;
  if (totalW2 > 0 && totalW2 < CA_CPP_YMPE) marginalPayroll += CA_CPP_RATE_EMP;
  else if (totalW2 >= CA_CPP_YMPE && totalW2 < CA_CPP_YAMPE) marginalPayroll += CA_CPP2_RATE_EMP;
  if (totalW2 > 0 && totalW2 < CA_EI_MIE) marginalPayroll += CA_EI_RATE_EMP;
  const marginalCombined = marginalFed + marginalState + marginalPayroll;

  // 加拿大无这些概念 · 置 0 兼容 UI
  const fedDed = 0;
  const stdDed = 0;
  const itemized = 0;
  const useItemize = false;
  const saltRaw = 0;
  const saltCapped = 0;
  const saltLost = 0;
  const ltCGBrackets = [[Infinity, 0]];
  const preferentialIncome = 0;
  const ordinaryInvestIncome = interest + dividends + capGainsST;
  const obbba2025Deductions = 0;
  const tipsDeduction = 0;
  const overtimeDeduction = 0;
  const seniorBonus = 0;
  const carLoanInterestDeduction = 0;
  const fedTaxOrdinary = fedTaxGross;
  const fedTaxPref = 0;
  const residentStateTax = stateTax;
  const workStateTax = 0;
  const crossStateCredit = 0;
  const isReciprocal = false;
  const workStateDetails = null;
  const hasConvenience = false;
  const effectiveWorkPortion = 1;
  const caMHT = 0;
  const caSDI = 0;
  const k401Pretax = rrspContrib;
  const hsaContrib = 0;
  const medicalExp = 0;
  const medical = 0;

  return {
    // 核心数字
    totalW2, net1099, selfW2, spouseW2,
    grossWages, agi, fedDed, fedTaxable, stdDed, itemized,
    tipsDeduction, overtimeDeduction, seniorBonus, carLoanInterestDeduction, obbba2025Deductions,
    useItemize, saltRaw, saltCapped, saltCap: 0, saltLost,
    fedTax, fedTaxOrdinary, fedTaxPref,
    stateTax, fica, seTax, totalTax,
    localTax, localRule,
    ssTax, medicareTax, addlMedicare,
    seDed, k401Pretax, hsaContrib, charity, mortInt, medicalExp,
    totalPropTaxSchedA, medical,
    marginalFed, marginalState, marginalCombined,
    effectiveRate, takeHome,
    // v102: 主字段对齐 US · 旧别名仍保留给老代码
    cashTakeHome, deferredAssets,
    cashNow, deferredCash,
    // 加拿大跨州（用不上 · 占位）
    residentStateTax, workStateTax, crossStateCredit, isReciprocal,
    workStateDetails, hasConvenience, effectiveWorkPortion,
    caMHT, caSDI,
    // 出租房
    rentalNet, rentalGainToAGI, rentalLossSuspended,
    // 投资收入
    interest, dividends, qualifiedDividends, ordinaryDividends,
    capGainsLT, capGainsST, preferentialIncome, ordinaryInvestIncome,
    ltCGBrackets,
    // v99 CA 新增字段
    _country: 'CA',
    cppEmp, cpp2Emp, eiEmp,
    fedBPA, fedBPACredit,
    provBPA: provRules.bpa, provBPACredit,
    onSurtax, onHealthPremium,
    rrspContrib, rrspRoom: CA_RRSP_LIMIT - rrspContrib,
    capGainsTaxable,
  };
}

// ═══════════════════════════════════════════════════════════
//  省税机会引擎
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// v100: 加拿大省税机会引擎
// · 替代 US 的 401k/HSA/Mega Backdoor/QBI/Cost Seg 等
// · 聚焦 RRSP / TFSA / FHSA / HBP / CCB / 捐赠 / 跨省搬家
// ═══════════════════════════════════════════════════════════
function findOpportunitiesCA(i, calc) {
  const opps = [];
  const mr = calc.marginalCombined || (calc.marginalFed + calc.marginalState);
  const agi = calc.agi || 0;
  const inc1099 = i.inc1099 || 0;
  const w2Total = (i.w2 || 0) + (i.spouseW2 || 0);
  const children = i.children || 0;

  // 1. RRSP 未存满
  const rrspUsed = i.k401 || 0;       // 复用 k401 字段
  const rrspRoom = CA_RRSP_LIMIT - rrspUsed;
  if (rrspRoom > 1000 && (w2Total > 50000 || inc1099 > 30000)) {
    const suggested = Math.min(rrspRoom, Math.max(5000, Math.round((w2Total + inc1099) * 0.18 - rrspUsed)));
    opps.push({
      id: 'rrsp',
      type: 'contribution',
      priority: 1,
      title: '存满 RRSP',
      hook: `剩余额度 $${fmt(rrspRoom)}`,
      detail: `RRSP 2025 上限 18% × 上年收入 · 最高 $${CA_RRSP_LIMIT.toLocaleString()}。当前存了 $${fmt(rrspUsed)} · 还可存 $${fmt(rrspRoom)}。按边际 ${(mr * 100).toFixed(0)}% 估 · 每存 $1K 省 $${Math.round(mr * 1000)}。`,
      contrib: suggested,
      saving: Math.round(suggested * mr),
      deadline: '26年3月1日',
      code: 'RRSP',
    });
  }

  // 2. TFSA · 是 post-tax · 不 reduce 当年税 · 不能作为 contrib（否则 tuner 会扣掉现金）
  if (agi > 30000 && w2Total > 0) {
    opps.push({
      id: 'tfsa',
      type: 'strategy',       // v102: 改成 strategy · 不是 contribution
      priority: 2,
      title: '存满 TFSA',
      hook: '$7,000/年 · 终生 $102K 累积',
      detail: `TFSA 2025 年限 $7,000 · 如从 2009 起从未存过 · 累计空间 $102K。投资增值 + 取出都免税 · 适合长期 ETF / 指数基金。和 RRSP 不冲突。`,
      contrib: 0,                // v102: 不算 contrib（不减税 · 不 deferred）
      saving: 0,                 // 不是税省 · 长期投资增值才是收益
      hold: true,                // 提示性
      deadline: '年底前',
      code: 'TFSA',
    });
  }

  // 3. FHSA · 首房存钱最强 · 是 pre-tax 减税的
  const hasHouse = (i.properties || []).some(p => p.type === 'primary');
  if (!hasHouse && agi > 40000 && agi < 250000) {
    opps.push({
      id: 'fhsa',
      type: 'contribution',
      priority: 1,
      title: '开 FHSA 首房账户',
      hook: '$40K 终生 · RRSP+TFSA 优点合体',
      detail: `FHSA（First Home Savings Account）2025 年限 $8,000 · 终生 $40K。供款减税（像 RRSP）· 买首房取出免税（像 TFSA）。配合 HBP $60K · 夫妻合计首付 $200K 免税。开户当年就能拿 $8K 额度 · 越早开越好。`,
      contrib: CA_FHSA_LIMIT_YR,
      saving: Math.round(CA_FHSA_LIMIT_YR * mr),
      deadline: '年底前',
      code: 'FHSA',
    });
  }

  // 4. HBP 用 RRSP 买首房
  if (!hasHouse && rrspUsed > 10000 && agi > 60000) {
    opps.push({
      id: 'hbp',
      type: 'strategy',
      priority: 3,
      title: 'HBP 买首房',
      hook: 'RRSP 取 $60K 免税',
      detail: `Home Buyer's Plan · 首次置业可从 RRSP 免税取最多 $60K（2024+ 从 $35K 上调）· 15 年还 · 不还部分算 income。可叠加 FHSA $40K · 单人首付最多 $100K · MFJ $200K。`,
      contrib: 0,
      saving: 0,
      hold: true,
      code: 'HBP',
    });
  }

  // 5. CCB 牛奶金（CTC 对应）
  if (children > 0 && agi < 180000) {
    const perChildUnder6 = 7997;
    const perChildOver6 = 6748;
    const estimatedCCB = children * perChildOver6;   // 简化
    opps.push({
      id: 'ccb',
      type: 'credit',
      priority: 2,
      title: 'CCB 牛奶金',
      hook: `${children} 娃 · 估 $${fmt(estimatedCCB)}/年`,
      detail: `Canada Child Benefit 2025：6 岁以下 $7,997/娃 · 6-17 岁 $6,748/娃。Family net income > $36,502 起 phase-out · 高收入基本拿不到。通过 RRSP/FHSA 供款压低 net income → CCB 多拿。`,
      contrib: 0,
      saving: Math.round(estimatedCCB * 0.3),   // 粗估边际部分
      code: 'CCB',
    });
  }

  // 6. RESP (娃 · 政府匹配 20%)
  if (children > 0) {
    opps.push({
      id: 'resp',
      type: 'contribution',
      priority: 3,
      title: '开 RESP 娃教育金',
      hook: `政府匹配 20%（每娃最多 $7,200）`,
      detail: `RESP 每娃每年供 $2,500 · 政府 CESG 匹配 20% = $500 · 一直领到娃 17 岁 · 终生最多 $7,200 政府补。投资增值复利 17 年。娃上大学取出算娃的 income · 娃基本 0 税率。`,
      contrib: children * 2500,
      saving: children * 500,
      code: 'RESP',
    });
  }

  // 7. 慈善捐赠 · 加拿大 credit 高（> $200 按 29% · 高收入 33%）
  if (agi > 100000 && (i.charity || 0) < 5000) {
    const suggestedCharity = 5000;
    const credit = 200 * 0.15 + (suggestedCharity - 200) * 0.29;
    opps.push({
      id: 'donation',
      type: 'strategy',
      priority: 4,
      title: '慈善捐赠 credit',
      hook: '> $200 部分按 29-33%',
      detail: `加拿大慈善捐款 credit：前 $200 按 15% · 超出按 29%（收入 > $253K 按 33%）· 比很多 RRSP 还划算。现金 / 股票 / 公众基金都行。配偶间可合并优先一人报。`,
      contrib: suggestedCharity,
      saving: Math.round(credit),
      code: 'Donation',
    });
  }

  // 8. 自雇 CPP 双份预警
  if (inc1099 > 30000) {
    opps.push({
      id: 'seCpp',
      type: 'warning',
      priority: 5,
      title: '自雇 CPP 双份',
      hook: '11.9% + 4% = 自己扛 15.9%',
      detail: `自雇要交雇员和雇主两份 CPP：base 11.9% + CPP2 4%。一半可 above-line 扣。季度预缴门槛：上年欠税 > $3K 要预缴。考虑开 incorporate（CCPC）· 前 $500K 主动业务收入联邦税率只有 9%。`,
      contrib: 0,
      saving: 0,
      hold: true,
      code: 'SEcpp',
    });
  }

  // 9. OAS 回收警告（退休收入 > $93,454）
  if (agi > 93454 && (i.senior65 || agi > 200000)) {
    opps.push({
      id: 'oas',
      type: 'warning',
      priority: 5,
      title: 'OAS 回收',
      hook: '> $93,454 起回收 15%',
      detail: `Old Age Security clawback · 收入 > $93,454（2025）起每 $1 回收 $0.15 · 完全 clawback 到 ~$155K。策略：尽量把 RRSP 在 71 岁前部分取光 · 或用 TFSA 补充 · 避免退休时 OAS 被吃。`,
      contrib: 0,
      saving: 0,
      hold: true,
      code: 'OAS',
    });
  }

  // 10. 省级搬家套利（简化版）
  if (agi > 250000 && i.state === 'ON') {
    opps.push({
      id: 'moveAB',
      type: 'strategy',
      priority: 6,
      title: '省税套利 · 搬阿省？',
      hook: 'ON 13.16% vs AB 15% 顶档',
      detail: `高收入 ON 顶档综合 53.53% · AB 顶档综合 48% · 差 5.5 个点。搬家 + 断 ON residency（domicile 12/31）。AB 无省销售税、房价比 ON 低、BPA $21,885 全国最高。代价：远离 Tech / 金融圈。`,
      contrib: 0,
      saving: 0,
      hold: true,
      code: 'MoveAB',
    });
  }

  return opps;
}

function findOpportunities(i, calc) {
  // v100: CA 分支 · 提前返回 CA-specific opportunities
  if (calc?._country === 'CA') {
    return findOpportunitiesCA(i, calc);
  }
  const opps = [];
  const mr = calc.marginalCombined;
  if (i.inc1099 >= 10000 && (i.solo401k || 0) === 0) {
    // Solo 401(k) 正确公式（Schedule C sole prop）:
    //   1. 员工 elective deferral: 最多 $23,500（和 W2 401k 共享额度）
    //   2. 雇主 profit-sharing: 20% × (Net SE − ½ SE tax)
    //      （等价于 25% of "compensation" 但 compensation 也得减去 contribution）
    //   3. 受 $350K compensation cap 限制
    //   4. 合计受 $70K 415(c) 上限
    const seTaxHalf = calc.seDed || 0;
    const netEarnings = Math.max(0, calc.net1099 - seTaxHalf);
    // compensation cap $350K
    const cappedNetEarnings = Math.min(netEarnings, COMP_CAP_2025);
    // 雇主侧 = 20% × (Net SE - ½ SE tax)，受 415(c) 上限
    const employerSide = Math.min(cappedNetEarnings * 0.20, K401_TOTAL_415C_2025);
    // 员工侧 = K401 上限 - 已经存的 W2 401k
    const employeeSide = Math.max(0, K401_LIMIT_2025 - calc.k401Pretax);
    // 合计受三重约束：员工+雇主合计 / 净 SE / 415(c) 上限
    const maxContrib = Math.min(
      employerSide + employeeSide,
      cappedNetEarnings,  // 不能超过净收入
      K401_TOTAL_415C_2025  // 不能超过 415(c)
    );
    if (maxContrib > 1000) {
      opps.push({
        id: 'solo401k',
        title: '开 Solo 401(k)',
        tag: '退休账户',
        saving: Math.round(maxContrib * mr),
        contrib: Math.round(maxContrib),
        urgency: '12/31 前开户 · 4/15 前供款',
        difficulty: 2,
        why: `你有 $${i.inc1099.toLocaleString()} 1099 收入，可延税 $${Math.round(maxContrib).toLocaleString()}`,
        how: [
 '在 Fidelity / Vanguard / Schwab 开 Solo 401k（免费）',
          `雇员部分：最多 $${Math.round(employeeSide).toLocaleString()} (2025 上限 $23,500)`,
          `雇主部分 (sole prop)：20% × (Net SE − ½ SE Tax) = 20% × $${Math.round(netEarnings).toLocaleString()} ≈ $${Math.round(employerSide).toLocaleString()}`,
          `合计不超过 $70,000 (415(c) 上限) 或净 SE 收入`,
 '报税时在 Schedule C 或 1120-S 申报',
        ],
        warn: '有员工（除配偶）不能开 Solo 401k，要改 SEP',
      });
    }
  }

  if (i.hdhp) {
    const baseLimit = HSA_LIMIT_2025[i.filingStatus === 'MFJ' ? 'Family' : 'Self'];
    // 55+ catch-up $1,000 extra (如果追踪 age 字段)
    const catchUp = (i.age && i.age >= 55) ? HSA_CATCHUP_55 : 0;
    const hsaMax = baseLimit + catchUp;
    const unused = Math.max(0, hsaMax - (i.hsa || 0));
    if (unused > 500) {
      const how = [
        `2025 上限 $${baseLimit.toLocaleString()} (${i.filingStatus === 'MFJ' ? 'family' : 'self-only'})`,
      ];
      if (catchUp > 0) how.push(`55+ 多存 $${HSA_CATCHUP_55.toLocaleString()} catch-up`);
      how.push(`你今年还能再存 $${unused.toLocaleString()}`);
      how.push('推荐账户：Fidelity (免月费) / Lively / Optum');
      how.push('65 岁后可像 IRA 一样使用');
      if (i.state === 'NJ') how.push('NJ / CA 州税不抵，但联邦与多数州都抵');

      opps.push({
        id: 'hsa', title: '存满 HSA', tag: '三重免税',
        saving: Math.round(unused * mr), contrib: unused,
        urgency: '12/31 前工资扣 · 4/15 前补 2026 供款', difficulty: 1,
        why: `HSA 是唯一"三重免税"账户：存入免税 · 增长免税 · 合格医疗提取免税`,
        how,
        warn: 'HDHP 2025 要求：自付额 ≥ $1,650 self / $3,300 family',
      });
    }
  }

  const k401Gap = K401_LIMIT_2025 - (i.k401 || 0);
  // v107 修老 bug：之前 `i.w2 > 80000` 导致刚好 $80K 不提示 · 且阈值太高
  // · $30K 起（22% bracket 入口附近）就有意义 · 边际税率 > 15% 值得存
  const totalEarned = (i.w2 || 0) + (i.spouseW2 || 0);
  if (totalEarned >= 30000 && k401Gap > 3000) {
    opps.push({
      id: 'max401k', title: '存满 W2 401(k)', tag: '退休账户',
      saving: Math.round(k401Gap * mr), contrib: k401Gap,
      urgency: '12/31 前工资扣', difficulty: 1,
      why: `2025 上限 $${K401_LIMIT_2025.toLocaleString()}，你还能再存 $${k401Gap.toLocaleString()}`,
      how: [
 '联系 HR 调整 pre-tax 401k 百分比',
 '如果工资跟不上，年底几个月可以临时冲一波',
 '如果雇主有 Roth 401k，可分配',
      ],
      warn: i.state === 'NJ' ? 'NJ 州税不允许 401k 抵扣' : null,
    });
  }

  if (calc.itemized > calc.stdDed - 2000 && !calc.useItemize) {
    const miss = calc.stdDed - calc.itemized;
    if (miss < 5000) {
      opps.push({
        id: 'itemize', title: '再加一把 → 切 Itemize', tag: '扣除方式',
        saving: Math.round(3000 * mr), contrib: miss,
        urgency: '全年操作', difficulty: 3,
        why: `你 Itemize 合计 $${Math.round(calc.itemized).toLocaleString()}，离标扣只差 $${Math.round(miss).toLocaleString()}`,
        how: [
 '集中年度慈善到今年（bunching）',
 '用 Donor-Advised Fund (DAF) 一次入账',
 '年底把来年 1 月地税提前缴了',
        ],
      });
    }
  }
  if (calc.useItemize) {
    opps.push({
      id: 'itemizeDone', title: '✓ Itemize 已优于 Standard', tag: '已优化',
      saving: Math.round((calc.itemized - calc.stdDed) * calc.marginalFed),
      contrib: calc.itemized - calc.stdDed,
      urgency: '无', difficulty: 0,
      why: `Itemize $${Math.round(calc.itemized).toLocaleString()} > 标扣 $${calc.stdDed.toLocaleString()}`,
      how: [
        `SALT 可抵：$${Math.round(calc.saltCapped).toLocaleString()} (Cap $${Math.round(calc.saltCap).toLocaleString()})`,
        `房贷利息：$${Math.round(calc.mortInt).toLocaleString()}`,
        `慈善：$${(i.charity || 0).toLocaleString()}`,
      ],
    });
  }

  const rothLimit = i.filingStatus === 'MFJ' ? 240000 : 161000;
  // v107: 直接 Roth IRA 建议（AGI 低于 phase-out 上限时）· 弥补之前只有 Backdoor 没有 Direct
  if (calc.agi > 0 && calc.agi < rothLimit && totalEarned >= 10000) {
    const iraRoom = IRA_LIMIT_2025 * (i.filingStatus === 'MFJ' ? 2 : 1);
    opps.push({
      id: 'rothIraDirect', title: '直接存 Roth IRA', tag: '长期复利',
      saving: 0,              // 后税存入 · 当年不减税 · 但增长 / 取出全免税
      contrib: iraRoom,
      urgency: '4/15 前可补上年',
      difficulty: 1,
      why: `AGI $${fmt(calc.agi)} 未超 Roth 上限 $${fmt(rothLimit)}${i.filingStatus === 'MFJ' ? ' (MFJ)' : ' (Single)'}`,
      how: [
        `2025 上限 $${IRA_LIMIT_2025.toLocaleString()}/人 · 50+ catch-up $1,000`,
        '任何券商开（Fidelity / Vanguard / Schwab 免佣）',
        '全免佣指数基金（VOO / VTI / FXAIX）',
        '65 岁前不动 · 30 年复利 ~ $150K',
      ],
    });
  }
  if (calc.agi > rothLimit) {
    opps.push({
      id: 'backdoorRoth', title: 'Backdoor Roth IRA', tag: '长期复利',
      saving: 1800, contrib: IRA_LIMIT_2025 * (i.filingStatus === 'MFJ' ? 2 : 1),
      urgency: '12/31 前存 · 4/15 前转换都算本税年', difficulty: 3,
      why: `AGI $${Math.round(calc.agi).toLocaleString()} 超过直接 Roth 上限`,
      how: [
 '第一步：存 $7,000 non-deductible 到 Traditional IRA',
 '第二步：转换到 Roth IRA',
 '第三步：报税填 Form 8606',
 '† 有其它 pre-tax IRA 余额触发 pro-rata 规则',
      ],
      warn: '有 SEP / Traditional IRA 余额时慎用',
    });
  }

  if (i.w2 > 150000 && i.megaBackdoor) {
    const megaRoom = Math.min(SOLO_K401_TOTAL_2025 - K401_LIMIT_2025 - (i.employerMatch || 0), 40000);
    opps.push({
      id: 'megaRoth', title: 'Mega Backdoor Roth', tag: '长期复利',
      saving: Math.round(megaRoom * 0.04), contrib: megaRoom,
      urgency: '随工资扣缴', difficulty: 4,
      why: `雇主 plan 支持 after-tax + in-service conversion`,
      how: [
 '选 after-tax 401k 供款（非 Roth 401k）',
 '立即或每月转 Roth IRA / Roth 401k',
 '这部分未来完全免税增长',
      ],
      warn: '并非所有雇主 plan 支持',
    });
  }

  if (i.w2 > 50000 && (i.state === 'NY' || i.state === 'NJ') && !i.commuterBenefit) {
    opps.push({
      id: 'commuter', title: 'Commuter Benefits', tag: '工资预税',
      saving: Math.round(COMMUTER_YEARLY_2025 * calc.marginalFed), contrib: COMMUTER_YEARLY_2025,
      urgency: '随时登记', difficulty: 1,
      why: `联邦允许每月 $${COMMUTER_MONTHLY_2025} 通勤费税前扣（2025 年）`,
      how: [
 'WageWorks / HealthEquity 登记',
        `每月 $${COMMUTER_MONTHLY_2025} pre-tax 买 Metrocard / NJ Transit / LIRR`,
 '自动扣除、无报销流程',
      ],
    });
  }

  if (i.children > 0 && !i.dcfsa) {
    const dcMax = i.filingStatus === 'MFJ' ? DCFSA_LIMIT_2025 : DCFSA_MFS_2025;
    opps.push({
      id: 'dcfsa', title: 'Dependent Care FSA', tag: '工资预税',
      saving: Math.round(dcMax * mr), contrib: dcMax,
      urgency: '年度 open enrollment', difficulty: 1,
      why: `${i.children} 个孩子，日托/夏令营费可税前 $${dcMax.toLocaleString()}`,
      how: [
 'HR open enrollment 时登记',
 'use-it-or-lose-it，年底未用作废',
 '和 Child Care Credit 不重复',
      ],
    });
  }

  if (i.state === 'NJ' && (i.k401 || 0) > 5000) {
    const extraNJ = (i.k401 || 0) * calc.marginalState;
    opps.push({
      id: 'njK401Warn', title: '† NJ 401(k) 不抵州税', tag: 'NJ 专属',
      saving: 0, cost: Math.round(extraNJ),
      urgency: '认知层面', difficulty: 0, type: 'warning',
      why: `你存 $${(i.k401 || 0).toLocaleString()}，NJ 州税基仍包含，多交 ~$${Math.round(extraNJ).toLocaleString()}`,
      how: [
 '不是错，而是你要知道',
 '搬家到 NY/PA 前算清楚',
 '退休从 NJ 提取时，之前交过的不再交',
      ],
    });
  }

  if (calc.net1099 >= 60000) {
    opps.push({
      id: 'sCorp', title: '考虑 S-Corp 结构', tag: '高阶策略',
      saving: Math.round(calc.net1099 * 0.153 * 0.3), contrib: null,
      urgency: '年初设立最合适', difficulty: 5,
      why: `1099 净利润 $${Math.round(calc.net1099).toLocaleString()}，S-Corp 可省 ~30% SE 税`,
      how: [
 'LLC 后 elect S-Corp (Form 2553)',
 '给自己发合理工资 (W2)',
 '剩余作为 distribution（免 SE 税）',
 '合规成本：~$1,500/年',
      ],
      warn: '† 强烈建议找 CPA',
    });
  }

  if (calc.net1099 > 0) {
    const qbiThreshold = i.filingStatus === 'MFJ' ? 394600 : 197300;
    if (calc.agi < qbiThreshold) {
      const qbi = Math.round(calc.net1099 * 0.20);
      opps.push({
        id: 'qbi', title: 'QBI 扣除 (Section 199A)', tag: '自动享受',
        saving: Math.round(qbi * calc.marginalFed), contrib: 0,
        urgency: '报税时自动', difficulty: 0,
        why: `1099 净利润可扣 20%，约 $${qbi.toLocaleString()}`,
        how: [
 '报税软件自动算，Form 8995',
 '2026 年后可能过期',
 'SSTB (律师/医生/咨询) 有收入上限',
        ],
      });
    }
  }

  // ═══════════════════════════════════════════════
  //  房产高级策略（Cost Seg / 1031 / QOZ / 折旧）
  // ═══════════════════════════════════════════════

  const rentalProps = (i.properties || []).filter(p => p.type === 'rental');
  const personalProps = (i.properties || []).filter(p => p.type === 'primary' || p.type === 'second_home');
  const totalRentalValue = rentalProps.reduce((s, p) => {
    // 粗略估算：地税 ÷ 0.015 = 房产价值，再取 80% 为建筑（非土地）
    return s + (Number(p.propertyTax || 0) / 0.015) * 0.8;
  }, 0);

  // 1. Cost Segregation Study（成本分类分析）
  if (rentalProps.length > 0 && totalRentalValue > 300000) {
    // 估算：第一年多 20-30% 的折旧（5/7/15 年资产加速）
    const accelDep = totalRentalValue * 0.25;
    const grossBenefit = accelDep * calc.marginalCombined;
    const studyCost = 4500 + rentalProps.length * 1500;
    const netBenefit = grossBenefit - studyCost;
    if (netBenefit > 5000) {
      opps.push({
        id: 'costSeg', title: '做 Cost Segregation 研究', tag: '高级',
        saving: Math.round(netBenefit), contrib: 0,
        urgency: '报税时（可追溯以前年份，3115 表）', difficulty: 4,
        why: `把建筑拆分成 5/7/15 年的资产，把原本 27.5 年平均的折旧往前推。粗估第一年可多抵 ~$${fmt(accelDep)}`,
        how: [
          `找专业 Cost Seg 公司出报告（费用约 $${fmt(studyCost)}）`,
          `以前年份也可追溯 (Form 3115, change in accounting method)`,
          `搭配 Bonus Depreciation 效果更好（100% 在 2022 之前，之后逐步减少，2025 年 40%）`,
          `Recapture 风险：卖房时 §1250 按 25% 重新征税`,
        ],
        warn: '卖房时多出的折旧要 Depreciation Recapture（以普通税率，但上限 25%）',
      });
    }
  }

  // 2. 1031 Like-Kind Exchange（房产互换递延）
  if (rentalProps.length > 0 && totalRentalValue > 250000) {
    opps.push({
      id: 'like1031', title: '未来换房：用 1031 Exchange', tag: '规划',
      saving: 0, contrib: 0, type: 'info',
      urgency: '卖房时 · 45 天识别 · 180 天完成', difficulty: 4,
      why: `不是现在省税，而是将来卖出租房时把资本利得 + depreciation recapture 一并递延，本金持续滚动`,
      how: [
 '只适用投资性质房产 (投资 → 投资)，自住不行',
 '卖出后 45 天内书面识别目标房产',
 '180 天内完成过户',
 '必须通过 Qualified Intermediary (QI)，资金不能过手',
 '替换房产价格 ≥ 原房产（否则 "boot" 部分应税）',
 '可以无限 1031 链式，直到去世时 step-up basis 清零',
      ],
      warn: 'OBBBA 可能会对 1031 加限制，关注立法',
    });
  }

  // 3. Opportunity Zone（机会区投资）
  if (calc.grossWages > 300000 || rentalProps.length > 0) {
    opps.push({
      id: 'qoz', title: 'QOZ 机会区投资', tag: '规划',
      saving: 0, contrib: 0, type: 'info',
      urgency: '实现资本利得后 180 天内', difficulty: 5,
      why: `把已实现的资本利得投到 Qualified Opportunity Fund (QOF) 可递延原始税 + 10 年后新收益完全免税`,
      how: [
 '资本利得实现后 180 天内投入 QOF',
 '原始税递延到 2026 年末',
 '若持有 10 年以上，QOF 增值部分完全免资本利得税',
 '必须是指定 QOZ 区域的投资（经济困难地区）',
 '适合房产开发、创业投资',
      ],
      warn: '2019-2026 年间的投资符合条件；QOZ 项目本身风险较高，税务优势≠投资优势',
    });
  }

  // 4. 折旧捕捉（Catch-Up Depreciation）
  if (rentalProps.length > 0) {
    const noDep = rentalProps.filter(p => (Number(p.depreciation) || 0) === 0);
    if (noDep.length > 0) {
      opps.push({
        id: 'catchDep', title: '补提折旧（Form 3115）', tag: '纠错',
        saving: Math.round(noDep.length * 8000 * calc.marginalCombined),
        urgency: '下次报税时', difficulty: 3,
        why: `你有 ${noDep.length} 套出租房没填折旧。IRS 视同你"享受过"折旧（无论你是否实际扣），卖房时照样 recapture —— 现在不扣纯亏`,
        how: [
 '建筑成本 ÷ 27.5 年 = 年折旧额',
 '如果以前年份漏了，提交 Form 3115 一次性补提（不用 amend）',
 '建议同时考虑 Cost Seg 一起做',
        ],
      });
    }
  }

  // ═══════════════════════════════════════════════
  //  WFH / 远程工作专属机会
  // ═══════════════════════════════════════════════

  const wfhDays = 100 - (i.workStateDays ?? 100); // 远程天数 %
  const isFullyWFH = wfhDays >= 95;  // ≥95% 算 100% WFH
  const isHeavilyWFH = wfhDays >= 50 && wfhDays < 95;
  const workStateKeyWfh = i.workState || i.state;
  const convenienceWorkWfh = CONVENIENCE_RULE_STATES[workStateKeyWfh] != null;

  // WFH-1: 100% 远程 + 非 Convenience 州工作 + 高税居住州 → 省税大机会
  if (isFullyWFH && i.workState && i.workState !== i.state && !convenienceWorkWfh) {
    if ((STATE_BRACKETS[i.state]?.MFJ?.[0]?.[1] || 0) > 0.04) {
      const flInputs = { ...i, state: 'FL', city: '', workState: i.workState, workStateDays: 0 };
      const flCalc = computeTax(flInputs);
      const potential = calc.stateTax + calc.localTax - flCalc.stateTax - flCalc.localTax;
      if (potential > 3000) {
        opps.push({
          id: 'wfhDomicile',
          title: '100% WFH + 搬到无税州',
          tag: 'WFH 专属',
          saving: Math.round(potential),
          contrib: 0,
          urgency: '一次性迁移 · 需 >183 天居住证明',
          difficulty: 4,
          why: `你 100% 远程 + ${STATE_BRACKETS[i.workState].label} 无 Convenience 规则 — 可以合法搬到 FL/TX/NV，工作不变但省掉 ${STATE_BRACKETS[i.state].label} 的州+市税`,
          how: [
            '搬家前先确认雇主允许你在新州办公（HR / Employment Agreement）',
            '建立 FL/TX/NV 居住地：驾照 / 选民登记 / 银行主账户',
            '旧州房子卖掉或完全出租（不留 "pied-à-terre"）',
            '一年 >183 天在新州（留机票、信用卡定位、门禁记录）',
            '旧州审计时负举证责任在你，提前备齐 domicile 证据',
            `搬后预估省：$${Math.round(potential).toLocaleString()} / 年`,
          ],
          warn: '雇主在旧州有 nexus（你之前的办公室），你搬走后可能触发 payroll 复杂化 — 提前和 HR 确认',
        });
      }
    }
  }

  // WFH-2: 100% 远程 + Convenience Rule 工作州 → 警告
  if (isFullyWFH && i.workState && convenienceWorkWfh && i.workState !== i.state) {
    const forcedTax = calc.workStateTax;
    opps.push({
      id: 'wfhConvenience',
      title: `${STATE_BRACKETS[i.workState].label} Convenience 规则陷阱`,
      tag: 'WFH 警告',
      type: 'warning',
      saving: 0,
      contrib: 0,
      urgency: '长期规划',
      difficulty: 5,
      why: `你 100% 远程但工作州是 ${STATE_BRACKETS[i.workState].label}（有 Convenience Rule）— 即使你人在别州，${i.workState} 仍按 100% 源头征税 ~$${Math.round(forcedTax).toLocaleString()}`,
      how: [
        `唯一突破口："Employer Necessity" 例外：雇主书面证明必须让你异地办公（极难）`,
        `次优：跳槽到 ${STATE_BRACKETS[i.workState].label} 境外雇主（即使远程也不在 ${i.workState} 源）`,
        `法律挑战未来：2024 Edelman v. NY 诉讼中，远程税引发新判例；关注立法变化`,
        `如果雇主愿意：在你居住州设正式办公室，重签雇佣合同`,
      ],
      warn: '不要自行在税表上按物理天数分摊 — NY/NE 审计率对外州远程工人明显偏高',
    });
  }

  // WFH-3: 大量 WFH + W2 Home Office 提示
  if (isHeavilyWFH || isFullyWFH) {
    if (i.w2 > 0 && (i.inc1099 || 0) === 0) {
      opps.push({
        id: 'wfhNoDeduct',
        title: 'W2 Home Office 不可扣',
        tag: 'WFH 规划',
        type: 'info',
        saving: 0,
        contrib: 0,
        urgency: '2026+ 可能恢复',
        difficulty: 1,
        why: `你大量 WFH，但作为 W2 员工，Home Office 扣除在 TCJA 期间（2018-2025）被暂停。即使你家里有专门工作间，联邦层面不能扣`,
        how: [
          '请雇主 reimburse：IRS "Accountable Plan" 报销网络/电费/家具，双方都不计入工资',
          '如果可能让雇主把部分工资结构化为 non-taxable reimbursement',
          '2026 年 TCJA 到期后 Home Office 可能恢复 — 保留工作间照片和测量记录',
          'NY / NJ 部分年份允许州级扣除 — 查当年 IT-196',
        ],
        warn: '别在联邦税上硬扣 W2 home office — 会触发 CP-2000 审计通知',
      });
    }

    // 有 1099 的 WFH：可以扣
    if ((i.inc1099 || 0) > 10000) {
      const netBusiness = calc.net1099;
      const homeOfficeDed = Math.min(netBusiness * 0.15, 8000);
      opps.push({
        id: 'wfhHomeOffice1099',
        title: '1099 Home Office 扣除',
        tag: 'WFH 省税',
        saving: Math.round(homeOfficeDed * calc.marginalCombined),
        contrib: Math.round(homeOfficeDed),
        urgency: '报税时（Schedule C）',
        difficulty: 2,
        why: `你有 $${(i.inc1099 || 0).toLocaleString()} 1099 收入 + 在家办公 — 可以按家中工作间比例扣除房租/房贷利息/水电/网络`,
        how: [
          '方法 A（简化）：工作间平方英尺 × $5，上限 300 ft² / $1,500',
          '方法 B（实际）：工作间 ÷ 住房总面积 × (房租/利息 + 地税 + 水电 + 保险 + 网络)',
          '工作间必须 "exclusive + regular use"（专用 + 定期）',
          '留照片 + 平面图证明',
          'Form 8829 申报',
        ],
        warn: '家里有孩子玩耍的空间不算；工作间真的要锁起来只做 business',
      });
    }
  }

  // WFH-4: Commuter Benefits 无意义提示
  if (isFullyWFH && i.commuterBenefit) {
    opps.push({
      id: 'wfhStopCommuter',
      title: '100% WFH 下停用 Commuter Benefits',
      tag: 'WFH 调整',
      type: 'info',
      saving: 0,
      contrib: 0,
      urgency: 'HR 年度 enrollment',
      difficulty: 1,
      why: `你 100% 远程但还在供款 Commuter Benefits（地铁 / 停车）— 这些钱只能用于通勤相关消费，不用就浪费`,
      how: [
        '下次 enrollment 时取消或降到 $0',
        '已有 balance：12 个月内用于合格通勤（即使偶尔回办公室）',
        '某些平台允许电动自行车、rideshare 的 commuter 用途',
      ],
    });
  }

  // 5. Primary 住房的 Section 121 排除额
  if (personalProps.length > 0) {
    opps.push({
      id: 'sec121', title: 'Section 121 自住房排除', tag: '规划',
      saving: 0, contrib: 0, type: 'info',
      urgency: '卖自住房前规划', difficulty: 2,
      why: `卖自住房时，${i.filingStatus === 'MFJ' ? '$500K' : '$250K'} 以内的资本利得联邦免税`,
      how: [
        `5 年内累计住满 2 年（"2 out of 5 rule"）`,
        `两房轮换：每 2 年可用一次`,
        `组合 1031：先换投资房，几年后自己住进去，可能部分享受 §121`,
      ],
      warn: '被 OBBBA 2025 强制：如果通过 1031 获得的房屋，必须持有 ≥5 年才能用 §121',
    });
  }

  // 6. 高税州居民：Domicile shift 信息
  const isHighTaxState = STATE_BRACKETS[i.state]?.MFJ?.some(b => b[1] > 0.05);
  if (isHighTaxState && calc.stateTax > 8000) {
    const noTaxSaving = calc.residentStateTax; // 粗略：若能真正搬到 FL，居民部分可省
    opps.push({
      id: 'domicileShift', title: '建立 FL / TX / NV 居住地', tag: '重磅规划',
      saving: 0, contrib: 0, type: 'info',
      urgency: '多年规划', difficulty: 5,
      why: `${STATE_BRACKETS[i.state].label} 州税约占你总税的 ${Math.round(calc.stateTax / calc.totalTax * 100)}%。真正切换居住地到无税州，非工资收入（股息/租金/利得）可完全免 ${STATE_BRACKETS[i.state].label} 州税。工资部分是否能免，取决于工作州 + 远程天数`,
      how: [
        `1. 工资来源权 ≠ 居住权：即使搬 FL，你在 NJ 物理工作赚的钱 NJ 还要税`,
        `2. 真正省税的场景：① 非工资收入大 ② 真远程工作 ③ 换工作到 FL 本地`,
        `3. 换居住地的硬性动作：FL 驾照 · 选民登记 · 房子卖/完全出租 · 银行主账户迁移 · 一年 >183 天在 FL`,
        `4. Statutory Resident 陷阱：原州还有住所 + >183 天仍在 → 被强制认定为双重居民`,
        `5. 卖股/卖房大年做：利得按居住地 → 提前 1 年建立 FL 住所再触发事件`,
        `6. 留证据：机票、信用卡定位、门禁记录、收费站、手机基站`,
      ],
      warn: '不是填个地址就行。高税州的审计部门会查 "domicile change" 的真伪。被翻案的代价是补税 + 罚款 + 利息。',
    });
  }

  return opps.sort((a, b) => {
    if (a.type === 'warning') return 1;
    if (b.type === 'warning') return -1;
    if (a.type === 'info' && b.type !== 'info') return 1;
    if (b.type === 'info' && a.type !== 'info') return -1;
    return (b.saving || 0) - (a.saving || 0);
  });
}

// ═══════════════════════════════════════════════════════════
//  opportunityRateBreakdown · 省税机会的税率分解
//  每个 opp 用的是哪个税率？联邦 + 州 + FICA？
//  回答 momo 在评论里的问题："省多少税基于哪个 tax bracket"
// ═══════════════════════════════════════════════════════════

function opportunityRateBreakdown(opp, calc, i) {
  const fedRate = calc.marginalFed || 0;
  const stateRate = calc.marginalState || 0;
  const ficaRate = 0.0765; // SS 6.2% + Medicare 1.45%

  // 分类：这个 opp 扣的是哪种税？
  // A. 401(k) pretax / Solo 401(k) 雇员部分 — 扣联邦 + 州（大多数州，NJ 例外），不扣 FICA
  // B. HSA (W2 扣) — 扣联邦 + 州（多数）+ FICA（如果是薪资扣款）
  // C. Traditional IRA — 扣联邦 + 州（如果可抵），不扣 FICA
  // D. Solo 401(k) 雇主部分 — 扣联邦 + 州（作为 SE 收入，免 SE 税 + 所得税）
  // E. Commuter / FSA / DCFSA — 扣联邦 + 州 + FICA（section 125 工资预税）
  // F. Itemize/QBI/换州 — 扣联邦（+州 如果联动）
  // G. S-Corp — 减少 SE tax 的部分 → 省 FICA 等价
  // H. Mega Backdoor Roth — 零当下省税（长期复利）

  const rates = { fed: 0, state: 0, fica: 0 };

  const id = opp.id || '';

  // NJ 州 401k 不抵州税的特殊情况
  const njNo401kState = (i?.state === 'NJ') && ['max401k', 'solo401k', 'megaRoth', 'backdoorRoth'].includes(id);

  if (['max401k', 'solo401k'].includes(id)) {
    rates.fed = fedRate;
    rates.state = njNo401kState ? 0 : stateRate;
    rates.fica = 0; // 401k pretax 仍交 FICA
  } else if (id === 'hsa') {
    // HSA 通过 W2 payroll 扣款时免 FICA (section 125)
    // HSA 直接存入时只免所得税
    const isPayroll = (i?.w2 || 0) > 0;
    rates.fed = fedRate;
    rates.state = (i?.state === 'CA' || i?.state === 'NJ') ? 0 : stateRate; // CA/NJ 不抵州税
    rates.fica = isPayroll ? ficaRate : 0;
  } else if (['commuter', 'dcfsa'].includes(id)) {
    // Section 125 工资预税 — 免联邦 + 州 + FICA
    rates.fed = fedRate;
    rates.state = stateRate;
    rates.fica = ficaRate;
  } else if (id === 'sCorp') {
    // S-Corp 主要是减少 SE tax (~15.3%)
    rates.fed = 0;
    rates.state = 0;
    rates.fica = 0.153; // SE tax reduction (等价 FICA 两份)
  } else if (id === 'qbi') {
    rates.fed = fedRate;
    rates.state = 0; // 联邦 QBI，多数州不跟随
    rates.fica = 0;
  } else if (['itemize', 'itemizeDone'].includes(id)) {
    rates.fed = fedRate;
    rates.state = stateRate; // Itemize 联邦 & 州都联动
    rates.fica = 0;
  } else if (['backdoorRoth', 'megaRoth'].includes(id)) {
    rates.fed = 0;
    rates.state = 0;
    rates.fica = 0;
    // 特殊标记：长期复利，非当下省税
  } else {
    // 默认：联邦 + 州（不 FICA）
    rates.fed = fedRate;
    rates.state = stateRate;
    rates.fica = 0;
  }

  const total = rates.fed + rates.state + rates.fica;
  return {
    ...rates,
    total,
    njCavaet: njNo401kState,
    isLongTerm: ['backdoorRoth', 'megaRoth'].includes(id),
    isSECut: id === 'sCorp',
  };
}

// ═══════════════════════════════════════════════════════════
//  UI 基础组件
// ═══════════════════════════════════════════════════════════

const fmt = (n) => Math.round(n).toLocaleString();
const fmtSigned = (n) => (n >= 0 ? '+' : '−') + '$' + Math.abs(Math.round(n)).toLocaleString();
const pct = (n) => `${(n * 100).toFixed(1)}%`;

const Slider = ({ label, value, onChange, min, max, step = 1000, format = fmt, hint, prefix = '$' }) => (
  <div style={{ marginBottom: 7 }}>
    <div style={{
      display: 'grid',
      gridTemplateColumns: '92px 1fr 88px',
      alignItems: 'center', gap: 8,
    }}>
      <label style={{
        fontSize: 11, color: C.ink2, fontFamily: F_BODY, fontWeight: 500,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>{label}</label>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ accentColor: C.ink, height: 3, width: '100%' }} />
      <span style={{
        fontFamily: F_NUM, fontSize: 14, fontWeight: 700,
        color: C.ink, letterSpacing: '-0.01em', textAlign: 'right',
      }}>
        {prefix}{format(value)}
      </span>
    </div>
    {hint && <div style={{
      fontSize: 9, color: C.mute, fontFamily: F_BODY,
      marginTop: 2, marginLeft: 100,
    }}>{hint}</div>}
  </div>
);

// v67: 非线性收入 slider · 前 80% 位置覆盖 0-$200K（密集），后 20% 覆盖 $200K-$max（稀疏）
// v78: 改为 inline 布局（label · slider · 值 一行）
const CurvedIncomeSlider = ({ label, value, onChange, max = 2000000, step = 1000, hint }) => {
  const BREAKPOINT = 200000;
  const BREAKPOINT_POS = 80;
  const posToValue = (pos) => {
    if (pos <= BREAKPOINT_POS) {
      return Math.round((pos / BREAKPOINT_POS) * BREAKPOINT / step) * step;
    }
    const tail = (pos - BREAKPOINT_POS) / (100 - BREAKPOINT_POS);
    return Math.round((BREAKPOINT + tail * (max - BREAKPOINT)) / step) * step;
  };
  const valueToPos = (val) => {
    if (val <= BREAKPOINT) {
      return (val / BREAKPOINT) * BREAKPOINT_POS;
    }
    return BREAKPOINT_POS + ((val - BREAKPOINT) / (max - BREAKPOINT)) * (100 - BREAKPOINT_POS);
  };
  const pos = valueToPos(value);
  return (
    <div style={{ marginBottom: 7 }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '92px 1fr 88px',
        alignItems: 'center', gap: 8,
      }}>
        <label style={{
          fontSize: 11, color: C.ink2, fontFamily: F_BODY, fontWeight: 500,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{label}</label>
        <input
          type="range"
          min={0} max={100} step={0.5}
          value={pos}
          onChange={(e) => onChange(posToValue(Number(e.target.value)))}
          style={{ accentColor: C.ink, height: 3, width: '100%' }}
        />
        <span style={{
          fontFamily: F_NUM, fontSize: 14, fontWeight: 700,
          color: C.ink, letterSpacing: '-0.01em', textAlign: 'right',
        }}>
          ${fmt(value)}
        </span>
      </div>
    </div>
  );
};

const SegButton = ({ options, value, onChange, size = 'md' }) => (
  <div className="inline-flex rounded-lg overflow-hidden"
    style={{ border: `1px solid ${C.line}`, background: C.cardAlt }}>
    {options.map((o) => (
      <button key={o.v} onClick={() => onChange(o.v)}
        style={{
          padding: size === 'sm' ? '5px 10px' : '7px 14px',
          fontSize: size === 'sm' ? 11 : 12,
          fontFamily: F_BODY,
          fontWeight: value === o.v ? 700 : 500,
          background: value === o.v ? C.ink : 'transparent',
          color: value === o.v ? '#FFF' : C.ink2,
          border: 'none', cursor: 'pointer', transition: 'all 0.15s',
        }}>
        {o.l}
      </button>
    ))}
  </div>
);

const Toggle = ({ label, value, onChange, hint }) => (
  <label className="flex items-center justify-between cursor-pointer" style={{ paddingTop: 4, paddingBottom: 4, marginBottom: 4 }}>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 11, color: C.ink2, fontFamily: F_BODY, fontWeight: 500 }}>{label}</div>
      {hint && <div style={{ fontSize: 9, color: C.mute, fontFamily: F_BODY, marginTop: 1 }}>{hint}</div>}
    </div>
    <button onClick={() => onChange(!value)}
      style={{
        width: 34, height: 20, borderRadius: 10,
        background: value ? C.save : '#D4D0C6',
        position: 'relative', transition: 'background 0.2s',
        border: 'none', cursor: 'pointer', flexShrink: 0,
      }}>
      <div style={{
        position: 'absolute', top: 2, left: value ? 16 : 2,
        width: 16, height: 16, borderRadius: 8, background: '#FFF',
        transition: 'left 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
      }} />
    </button>
  </label>
);

const StackBar = ({ items, total, height = 28, dark = false }) => (
  <div>
    <div className="flex w-full rounded-md overflow-hidden"
      style={{ height, background: dark ? 'rgba(255,255,255,0.08)' : C.lineLite }}>
      {items.map((it, i) => (
        <div key={i} title={`${it.label}: $${fmt(it.value)}`}
          style={{ width: `${(it.value / total) * 100}%`, background: it.color, transition: 'width 0.3s' }} />
      ))}
    </div>
    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
      {items.map((it, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <div style={{ width: 8, height: 8, borderRadius: 2, background: it.color }} />
          <span style={{ fontSize: 10, color: dark ? '#A8A8A8' : C.mute, fontFamily: F_BODY }}>{it.label}</span>
          <span style={{ fontSize: 10, fontFamily: F_NUM, fontWeight: 700, color: dark ? '#FFF' : C.ink }}>${fmt(it.value)}</span>
        </div>
      ))}
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════
//  州 / 市 下拉选择器（原生 select，支持 20+ 州）
// ═══════════════════════════════════════════════════════════

const SelectField = ({ value, onChange, label, children, compact }) => (
  <div style={{ display: 'inline-flex', flexDirection: 'column', minWidth: 0 }}>
    {label && (
      <label style={{ fontSize: 10, color: C.mute, fontFamily: F_BODY, marginBottom: 2, fontWeight: 500 }}>
        {label}
      </label>
    )}
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        appearance: 'none',
        WebkitAppearance: 'none',
        MozAppearance: 'none',
        background: C.cardAlt,
        backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B6B6B' stroke-width='2.5'><polyline points='6 9 12 15 18 9'></polyline></svg>")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 8px center',
        border: `1px solid ${C.line}`,
        borderRadius: 8,
        padding: compact ? '6px 26px 6px 10px' : '7px 28px 7px 12px',
        fontFamily: F_BODY,
        fontSize: compact ? 11 : 12,
        color: C.ink,
        cursor: 'pointer',
        fontWeight: 500,
      }}
    >
      {children}
    </select>
  </div>
);

// v100: 加拿大省份分组（用于 CA 下的 state selector）
const CA_PROV_GROUPS = [
  { label: '人口大省', states: ['ON', 'QC', 'BC', 'AB'] },
  { label: '草原省', states: ['MB', 'SK'] },
  { label: '大西洋省', states: ['NS', 'NB', 'NL', 'PE'] },
  { label: '北三地区', states: ['YT', 'NT', 'NU'] },
];

const StateSelect = ({ value, onChange, label, country }) => {
  // v114: label='' 明确隐藏内置 label（wizard 外部有自己的 header）
  // v114: country === 'CA' 时显示省份
  if (country === 'CA') {
    const effLabel = label !== undefined ? label : '省份';
    return (
      <SelectField value={value} onChange={onChange} label={effLabel}>
        {CA_PROV_GROUPS.map((g) => (
          <optgroup key={g.label} label={g.label}>
            {g.states.map((s) => {
              const r = CA_PROV_BRACKETS[s];
              if (!r) return null;
              return (
                <option key={s} value={s}>
                  {r.label || r.name} ({s})
                </option>
              );
            })}
          </optgroup>
        ))}
      </SelectField>
    );
  }
  return (
    <SelectField value={value} onChange={onChange} label={label}>
      {STATE_GROUPS.map((g) => (
        <optgroup key={g.label} label={g.label}>
          {g.states.map((s) => {
            const r = STATE_BRACKETS[s];
            if (!r) return null;
            const hasNoTax = r.note?.includes('无州所得税') || r.MFJ[0][1] === 0;
            return (
              <option key={s} value={s}>
                {r.label || r.name} ({s}){hasNoTax ? ' · 免州税' : ''}
              </option>
            );
          })}
        </optgroup>
      ))}
    </SelectField>
  );
};

const CitySelect = ({ state, value, onChange, label }) => {
  const cities = CITIES_BY_STATE[state];
  if (!cities) return null;
  // v114: 允许 label='' 隐藏内置 label
  const effLabel = label !== undefined ? label : '市/地方税';
  return (
    <SelectField value={value || ''} onChange={onChange} label={effLabel}>
      {cities.map((c) => <option key={c.v} value={c.v}>{c.l}</option>)}
    </SelectField>
  );
};

// ═══════════════════════════════════════════════════════════
//  房产卡 · 支持多套 + 不同州
// ═══════════════════════════════════════════════════════════

const PROPERTY_TYPES = [
  { v: 'primary', l: '自住', icon: '[H]' },
  { v: 'second_home', l: '二套/度假', icon: '[S]' },
  { v: 'rental', l: '出租', icon: '[R]' },
];

const PropertyCard = ({ property, onChange, onDelete, canDelete, index }) => {
  const update = (k, v) => onChange({ ...property, [k]: v });
  const type = PROPERTY_TYPES.find(t => t.v === property.type) || PROPERTY_TYPES[0];

  return (
    <div
      style={{
        background: C.card,
        border: `1px solid ${C.line}`,
        borderRadius: 10,
        padding: '8px 10px',
        marginBottom: 8,
      }}
    >
      {/* 头部：类型 SegButton + 删除 */}
      <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <span style={{
            fontFamily: F_MONO,
            fontSize: 9,
            fontWeight: 700,
            color: C.mute,
            padding: '1px 4px',
            border: `1px solid ${C.line}`,
            borderRadius: 3,
            flexShrink: 0,
            letterSpacing: '0.05em',
          }}>{type.icon}</span>
          <SegButton
            options={PROPERTY_TYPES.map(t => ({ v: t.v, l: t.l }))}
            value={property.type}
            onChange={(v) => update('type', v)}
            size="sm"
          />
        </div>
        {canDelete && (
          <button
            onClick={onDelete}
            style={{
              background: 'transparent', border: 'none',
              color: C.mute, cursor: 'pointer',
              fontSize: 16, padding: '0 4px',
              flexShrink: 0,
            }}
            aria-label="删除"
          >
            ×
          </button>
        )}
      </div>

      {/* 所在州（无 label 单行） */}
      <div style={{ marginBottom: 8 }}>
        <StateSelect
          value={property.state}
          onChange={(v) => update('state', v)}
        />
      </div>

      <Slider
        label="房贷利息"
        value={Number(property.mortInt) || 0}
        onChange={(v) => update('mortInt', v)}
        min={0} max={60000} step={500}
      />
      <Slider
        label="地税"
        value={Number(property.propertyTax) || 0}
        onChange={(v) => update('propertyTax', v)}
        min={0} max={50000} step={500}
      />

      {property.type === 'rental' && (
        <div style={{ borderTop: `1px dashed ${C.lineLite}`, paddingTop: 6, marginTop: 4 }}>
          <Slider
            label="年租金"
            value={Number(property.rentalIncome) || 0}
            onChange={(v) => update('rentalIncome', v)}
            min={0} max={300000} step={1000}
          />
          <Slider
            label="运营费用"
            value={Number(property.rentalExpenses) || 0}
            onChange={(v) => update('rentalExpenses', v)}
            min={0} max={100000} step={500}
          />
          <Slider
            label="折旧 (27.5 年)"
            value={Number(property.depreciation) || 0}
            onChange={(v) => update('depreciation', v)}
            min={0} max={60000} step={500}
          />
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════

// v75: 情景详情弹窗 · 基于 inputs + calc 的深度税务画像
const ScenarioDetailModal = ({ i, calc, storySegs, storyFlags, onClose, onEdit }) => {
  if (!calc) return null;
  // v107: CA 模式专用 advice · US 的 Mega Backdoor / HSA / Solo 401k / PTE 全不适用
  const isCA = calc?._country === 'CA';

  const w2Total = (i.w2 || 0) + (i.spouseW2 || 0);
  const inc1099 = i.inc1099 || 0;
  const invIncome = (i.interest || 0) + (i.dividends || 0) + (i.capGainsLT || 0) + (i.capGainsST || 0);
  const rentalGross = (i.properties || []).filter(p => p.type === 'rental')
    .reduce((s, p) => s + (Number(p.rentalIncome) || 0), 0);
  const grossAll = (w2Total + inc1099 + invIncome + rentalGross) || 1;

  const filing = i.filingStatus === 'MFJ' ? '夫妻合并' : i.filingStatus === 'Single' ? '单身' : i.filingStatus === 'HoH' ? '单亲家长' : '夫妻分开';
  const totalIncome = (i.w2 || 0) + (i.spouseW2 || 0) + (i.inc1099 || 0);
  const bandDef = totalIncome >= 1000000 ? { label: '超高净值', color: '#8B6B1F' }
    : totalIncome >= 500000 ? { label: '高净值', color: '#6B5B1F' }
    : totalIncome >= 250000 ? { label: 'HENRY 准富', color: '#1F5A3D' }
    : totalIncome >= 150000 ? { label: '中高薪', color: '#2B4A6B' }
    : totalIncome >= 80000 ? { label: '中产', color: C.ink2 }
    : { label: '初阶', color: C.mute };

  const effRate = calc.agi > 0 ? (calc.totalTax / calc.agi) : 0;
  const marginalFed = calc.marginalFed || 0;

  const stateLabel = isCA
    ? (CA_PROV_BRACKETS[i.state]?.label || i.state)
    : (STATE_BRACKETS[i.state]?.label || i.state);
  const numProps = (i.properties || []).length;
  const rentalCount = (i.properties || []).filter(p => p.type === 'rental').length;
  const highSALT = ['NY', 'NJ', 'CA'].includes(i.state);

  // 针对 persona 自动生成的 5 条建议路径
  const advice = [];

  if (isCA) {
    // v107: CA 专用 advice
    if (w2Total > 0 && (i.k401 || 0) < CA_RRSP_LIMIT) {
      const room = Math.min(CA_RRSP_LIMIT, Math.round(w2Total * 0.18));
      const gap = Math.max(0, room - (i.k401 || 0));
      if (gap > 500) {
        advice.push({
          rank: 1, title: '补满 RRSP · 减 Net Income',
          detail: `当前 $${fmt(i.k401 || 0)} · 2025 空间按 18% × T4 = $${fmt(room)}。按边际 ${((calc.marginalCombined || marginalFed + 0.2) * 100).toFixed(0)}% 估算，每 $1K 立省 $${Math.round((calc.marginalCombined || marginalFed + 0.2) * 1000)}。截止日 **3/1/2026** 可算 2025 税年。`,
          term: 'RRSP',
        });
      }
    }
    const hasPrimary = (i.properties || []).some(p => p.type === 'primary');
    if (!hasPrimary && totalIncome > 40000 && totalIncome < 250000) {
      advice.push({
        rank: 2, title: '开 FHSA · 首房神器',
        detail: `没有自住房 · FHSA 年限 $8K · 终生 $40K · 供款像 RRSP 减税 · 买首房取出像 TFSA 免税。配合 HBP $60K · 一人 $100K 免税首付空间 · 夫妻 $200K。年限 $8K × 边际 ${((calc.marginalCombined || 0.3) * 100).toFixed(0)}% ≈ $${Math.round((calc.marginalCombined || 0.3) * 8000)} 省。`,
        term: 'FHSA',
      });
    }
    if (totalIncome > 50000) {
      advice.push({
        rank: 3, title: 'TFSA 长期投资',
        detail: `2025 年限 $7K · 从 2009 起累计可能 $102K。**不减当年税** · 但投资增值/取出免税。放股票 ETF（XEQT / VFV）· 20 年复利可观。年轻低收入期优先 TFSA · 高收入期优先 RRSP。`,
        term: 'TFSA',
      });
    }
    if (inc1099 > 30000) {
      advice.push({
        rank: 4, title: '自雇季度预缴 (T1 Instalments)',
        detail: `自雇 $${fmt(inc1099)} · 上年欠税 > $3K 就要分季度交 · 否则 CRA 按日息 ~8% 罚。截止日 **3/15 · 6/15 · 9/15 · 12/15**。按去年税的 1/4 每季交最省心。CRA 会主动寄 reminder letter。`,
        term: 'QuarterlyCA',
      });
    }
    if (inc1099 > 100000 && (i.incorporated || false) === false) {
      advice.push({
        rank: 5, title: '开 CCPC（小企业法人）',
        detail: `自雇 $${fmt(inc1099)} · 开 CCPC 享 **前 $500K 主动业务联邦 9% + 省 ~3%** = 合计 ~12% 低税率。延缓 50%+ 利润到公司层面 · 个人工资 / 分红 / Capital Dividend 三种 payout 组合。费用：每年 ~$2-3K 会计 + $500 法人年费。`,
        term: 'CCPC',
      });
    }
    if (totalIncome > 93454) {
      advice.push({
        rank: 6, title: 'OAS 回收警示',
        detail: `Net Income > $93,454 就开始 OAS clawback（15% on excess）· 高于 $151,668 整年 OAS 归零。老人族策略：压低应税收入（多存 RRSP · 用 TFSA 替代非税账户 · 考虑 pension splitting）。`,
        term: 'OAS',
      });
    }
    if ((i.capGainsLT || 0) + (i.capGainsST || 0) > 50000) {
      advice.push({
        rank: 7, title: '资本利得时点控制',
        detail: `加拿大 capital gains **50% 纳入**应税 · 高收入族年末可考虑：① 卖亏损股票 offset（可 carry back 3 年）② 跨年分散大额 gain · 避免一年爆高档 ③ 自住房 PRE 完全免税 · 但要注意 change of use 规则。`,
        term: 'CapGains',
      });
    }
    if (i.state === 'QC') {
      advice.push({
        rank: 8, title: 'QC 双申报注意',
        detail: `住魁北克要同时填联邦 T1 + 省 TP-1 · 两张表。好消息：联邦给 **16.5% Quebec Abatement** 抵扣。坏消息：QC 起步税率 14% 全国最高 · 顶档 25.75%。Wealthsimple Tax / TurboTax QC 版会两份表同步。`,
        term: 'QCFiling',
      });
    }
    if ((i.children || 0) > 0) {
      advice.push({
        rank: 9, title: 'CCB 牛奶金 + RESP',
        detail: `${i.children} 个娃 · CCB 6 岁以下最高 $7,997/娃/年 · 6-17 岁 $6,748。Net Income > $36,502 开始 phase-out · > $79K 进第二档。每个娃开 RESP · 政府 CESG 20% 匹配（每年 max $500）· 终生 $7,200 / 娃 · 复利 18 年可观。`,
        term: 'CCB',
      });
    }
    if (advice.length === 0) {
      advice.push({
        rank: 1, title: '你的基础优化空间很小',
        detail: `按你当前收入 $${fmt(totalIncome)} · RRSP 已近满 · 没有房产 · 主要还是持续存 TFSA（长期复利最强）和等收入变化。有新收入源再回来算。`,
        term: null,
      });
    }
  } else {
    // US 原版 advice（保留）
  if (w2Total > 0 && (i.k401 || 0) < 23500) {
    const gap = 23500 - (i.k401 || 0);
    advice.push({
      rank: 1, title: '补满 W2 401(k) pre-tax',
      detail: `当前 $${fmt(i.k401 || 0)} · 离 2025 上限 $23,500 还有 $${fmt(gap)}。按边际 ${(marginalFed * 100).toFixed(0)}% 估算，每 $1K 立省 $${Math.round(marginalFed * 1000)}。`,
      term: null,
    });
  }
  if (w2Total > 250000 && (i.k401 || 0) >= 23500) {
    advice.push({
      rank: 2, title: 'Mega Backdoor Roth（需雇主 plan 支持）',
      detail: `HENRY 最大神器。员工 after-tax + in-service conversion，2025 总上限 $70K，扣完 pre-tax $23.5K + match 后的空间全填进去立即转 Roth。一年能多 $30K-$45K Roth 额度。`,
      term: 'Mega Backdoor',
    });
  }
  if (inc1099 > 20000 && !i.hdhp) {
    advice.push({
      rank: 3, title: '自雇人群 · 开 HSA（需 HDHP 保险）',
      detail: `三重免税：供款扣、增值免、医疗取出免。2025 个人 $4,300 / 家庭 $8,550。按边际 ${(marginalFed * 100).toFixed(0)}% 算，最多省 $${Math.round(marginalFed * 4300)} / $${Math.round(marginalFed * 8550)}。`,
      term: 'HSA',
    });
  }
  if (inc1099 > 50000) {
    const seSaving = Math.round(inc1099 * 0.9235 * 0.153 * 0.5);
    advice.push({
      rank: 4, title: '开 Solo 401(k) 或 SEP IRA',
      detail: `自雇 $${fmt(inc1099)} 年利 · Solo 401(k) 上限净利 × 20% + 员工 $23.5K = 可到 $70K。SEP 简单但只到净利 × 20%。 避免自雇税一半 ~$${fmt(seSaving)}。`,
      term: 'SEP',
    });
  }
  if (inc1099 > 200000 && highSALT) {
    advice.push({
      rank: 5, title: 'PTE Tax · 绕 SALT cap（高收入）',
      detail: `${stateLabel} 已开通 PTE Tax。你的 S-Corp / Partnership 在州层面直接缴州所得税，联邦 Sch C/E 全额扣除。$${fmt(inc1099)} 年利估算能省 $${fmt(Math.round(inc1099 * 0.03))}。`,
      term: 'PTE',
    });
  }
  if (numProps >= 2 && rentalCount >= 1) {
    advice.push({
      rank: 6, title: 'Cost Segregation + Bonus Depreciation',
      detail: `${rentalCount} 套出租房 · 做一次 cost seg study ($3-5K) 加速折旧，第一年 60% bonus depreciation 可砍掉 paper income $50K-$200K。配合 REPS 身份直接抵 W2。`,
      term: 'Cost Seg',
    });
  }
  if ((i.capGainsLT || 0) > 500000) {
    advice.push({
      rank: 7, title: 'QSBS §1202 · 核查是否合格',
      detail: `LT Gain $${fmt(i.capGainsLT)} · 若来自合格 C-Corp 持有 ≥5 年（OBBBA 2025 后可能 3 年），最多 $10M 或 10× basis 联邦免税。Founder / 早期员工 exit 最大神器。`,
      term: 'QSBS',
    });
  }
  if (invIncome > 50000 && totalIncome > 400000) {
    advice.push({
      rank: 8, title: 'Tax Loss Harvesting · 对冲 NIIT',
      detail: `投资收入 $${fmt(invIncome)} · 触发 NIIT 3.8% 附加。年底卖亏损仓位对冲，每 $1K 损失省 ~ $${Math.round((marginalFed + 0.038) * 1000)}（含 NIIT）。注意 Wash Sale 30 天规则。`,
      term: 'NIIT',
    });
  }
  if ((i.children || 0) > 0 && w2Total > 0) {
    advice.push({
      rank: 9, title: 'Dependent Care FSA · 最大 $5K',
      detail: `${i.children} 个娃 · 雇主 pre-tax 托儿账户上限 $5,000/MFJ · 13 岁以下 daycare/暑期班/after-school。按边际 ${(marginalFed * 100).toFixed(0)}% 估 ~ $${Math.round(marginalFed * 5000)} 省。`,
      term: 'DCFSA',
    });
  }
  // v93: CA-specific opportunities
  if (i.state === 'CA' && totalIncome > 1000000) {
    advice.push({
      rank: 10, title: 'CA MHT 1% 时点优化',
      detail: `Taxable > $1M 触发 Mental Health Tax · 估 $${fmt(Math.round((totalIncome - 1000000) * 0.01))}。年底卖亏损仓位、延 RSU vest、用 DAF 大捐（年内一次性 5-10 年份）把 taxable 压 $1M 下 · 每 $10K 压下去省 $100 MHT + ${(marginalFed * 100).toFixed(0)}% 联邦。`,
      term: 'MHT',
    });
  }
  if (i.state === 'CA' && inc1099 > 100000) {
    advice.push({
      rank: 11, title: 'CA PTE Tax · 必开（延期至 2030）',
      detail: `CA 不认 QBI · 自雇 $${fmt(inc1099)} 全额按 13.3% 州税 · CA PTE 让 S-Corp / Partnership 州层面缴税 · 联邦 Sch C 扣除 · 估省 $${fmt(Math.round(inc1099 * 0.04))}。CA 最近立法延长到 2030。`,
      term: 'PTE',
    });
  }
  if (i.state === 'CA' && (i.capGainsLT || 0) > 500000) {
    advice.push({
      rank: 12, title: 'QSBS · CA 不 conform 警告',
      detail: `LT Gain $${fmt(i.capGainsLT)} · 联邦 §1202 可能免 $10M · 但 CA 照征 13.3% = 多扣 ~$${fmt(Math.round(Math.min(i.capGainsLT, 10000000) * 0.133))}。Exit 前一年考虑搬 TX/FL/NV/WA 建立真实 residency 或 NGT/非居民 trust。`,
      term: 'QSBS',
    });
  }
  if (i.state === 'CA' && totalIncome > 0 && totalIncome < 105000) {
    advice.push({
      rank: 13, title: 'CalEITC + YCTC + Renter Credit',
      detail: `CA 低中收入可拿：CalEITC 最高 $3,756（ITIN 也能申）· YCTC $1,189/娃 < 6 岁 · Renter's Credit $60 Single / $120 MFJ（收入 < $50,746 / $101,492）· Form 540 一并申报。`,
      term: 'CalEITC',
    });
  }
  if (advice.length === 0) {
    advice.push({
      rank: 1, title: '暂无明显高优先级建议',
      detail: '你的情景相对简单 · 继续维持 401(k) 供款即可。收入涨上去会自动解锁更多策略。',
      term: null,
    });
  }
  }  // end US branch

  // Top 5 条
  const topAdvice = advice.slice(0, 5);

  const incomeBreakdown = [
    { label: isCA ? 'T4 工资' : 'W2 工资', value: w2Total, color: C.info },
    { label: isCA ? '自雇 (T2125)' : '1099 自雇', value: inc1099, color: C.warn },
    { label: '投资', value: invIncome, color: C.save },
    { label: '租金毛收', value: rentalGross, color: C.pay },
  ].filter(x => x.value > 0);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 150,
        background: 'rgba(13,13,13,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 10,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: C.card, borderRadius: 14,
          border: `1px solid ${C.line}`,
          maxWidth: 420, width: '100%',
          maxHeight: '90vh', overflowY: 'auto',
          boxShadow: '0 30px 80px rgba(0,0,0,0.4)',
        }}
      >
        {/* Hero */}
        <div style={{
          padding: '16px 18px 14px',
          borderBottom: `1px solid ${C.lineLite}`,
          background: C.cardAlt,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: 9, color: C.mute, fontFamily: F_MONO,
                letterSpacing: '0.12em', fontWeight: 700, marginBottom: 4,
              }}>情景详情</div>
              <div style={{
                display: 'inline-block',
                padding: '2px 8px', borderRadius: 4,
                background: bandDef.color + '15',
                border: `1px solid ${bandDef.color}40`,
                color: bandDef.color, fontWeight: 700, fontSize: 11,
                fontFamily: F_BODY, letterSpacing: '0.02em',
              }}>{bandDef.label}</div>
              <span style={{
                marginLeft: 6, fontSize: 11, color: C.mute,
                fontFamily: F_BODY,
              }}>· {filing}</span>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'transparent', border: 'none', color: C.mute,
                fontSize: 22, cursor: 'pointer', padding: 0, lineHeight: 1,
              }}
            >×</button>
          </div>
          <div style={{
            fontFamily: F_NUM, fontSize: 30, fontWeight: 800,
            color: C.ink, letterSpacing: '-0.02em', lineHeight: 1,
          }}>
            ${fmt(totalIncome)}
          </div>
          <div style={{
            fontSize: 10, color: C.mute, fontFamily: F_MONO,
            marginTop: 2, letterSpacing: '0.04em',
          }}>
            总收入 · {stateLabel}
          </div>
        </div>

        {/* 收入分解条形图 */}
        {incomeBreakdown.length > 0 && (
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.lineLite}` }}>
            <div style={{
              fontSize: 9, color: C.mute, fontFamily: F_MONO,
              letterSpacing: '0.1em', fontWeight: 700, marginBottom: 8,
            }}>收入构成</div>
            <div style={{
              display: 'flex', height: 10, borderRadius: 4,
              overflow: 'hidden', border: `1px solid ${C.line}`,
              marginBottom: 8,
            }}>
              {incomeBreakdown.map((b, idx) => (
                <div key={idx} style={{
                  width: `${(b.value / grossAll) * 100}%`,
                  background: b.color,
                }} />
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {incomeBreakdown.map((b, idx) => (
                <div key={idx} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                  fontSize: 11, fontFamily: F_BODY,
                }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{
                      display: 'inline-block', width: 8, height: 8,
                      background: b.color, borderRadius: 1,
                    }} />
                    <span style={{ color: C.ink2 }}>{b.label}</span>
                  </span>
                  <span>
                    <span style={{ fontFamily: F_NUM, fontWeight: 700, color: C.ink }}>
                      ${fmt(b.value)}
                    </span>
                    <span style={{ color: C.mute, fontSize: 10, marginLeft: 5 }}>
                      {((b.value / grossAll) * 100).toFixed(0)}%
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 关键数字 · 4 格 */}
        <div style={{
          padding: '14px 18px', borderBottom: `1px solid ${C.lineLite}`,
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
        }}>
          <StatCell label="有效税率" value={`${(effRate * 100).toFixed(1)}%`} sub={`全部税 ÷ AGI`} />
          <StatCell label="边际税率" value={`${(marginalFed * 100).toFixed(0)}%`} sub="下一美元所属税档" />
          <StatCell label="AGI" value={`$${fmt(calc.agi)}`} sub="调整后总收入" />
          <StatCell label="联邦税" value={`$${fmt(calc.fedTax + (calc.seTax || 0) + (calc.addlMedicare || 0))}`} sub="Fed + SE + Addl" />
        </div>

        {/* 税务警示 */}
        {storyFlags.length > 0 && (
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.lineLite}` }}>
            <div style={{
              fontSize: 9, color: C.mute, fontFamily: F_MONO,
              letterSpacing: '0.1em', fontWeight: 700, marginBottom: 8,
            }}>你需要关注的点</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {storyFlags.map((f, idx) => (
                <div key={idx} style={{
                  padding: '6px 10px', borderRadius: 6,
                  background: C.warnBg, border: `1px solid ${C.warn}40`,
                  fontSize: 11, color: C.ink2, fontFamily: F_BODY,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
                }}>
                  <span style={{ color: C.warn, fontWeight: 600 }}>
                    {f.code ? <Term code={f.code}>{f.label}</Term> : f.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 建议路径 · 针对 persona 的 3-5 条 */}
        <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.lineLite}` }}>
          <div style={{
            fontSize: 9, color: C.mute, fontFamily: F_MONO,
            letterSpacing: '0.1em', fontWeight: 700, marginBottom: 8,
          }}>针对你的建议 · Top {topAdvice.length}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {topAdvice.map((a, idx) => (
              <div key={idx} style={{
                padding: '10px 12px', borderRadius: 8,
                background: C.cardAlt, border: `1px solid ${C.lineLite}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
                  <span style={{
                    fontFamily: F_NUM, fontSize: 13, fontWeight: 800,
                    color: C.save, letterSpacing: '-0.02em',
                  }}>{idx + 1}.</span>
                  <span style={{
                    fontSize: 12, fontFamily: F_BODY, fontWeight: 700,
                    color: C.ink,
                  }}>
                    {a.term ? <Term code={a.term}>{a.title}</Term> : a.title}
                  </span>
                </div>
                <div style={{
                  fontSize: 11, color: C.ink2, fontFamily: F_BODY,
                  lineHeight: 1.55, paddingLeft: 16,
                }}>
                  {a.detail}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 底部 CTA */}
        <div style={{
          padding: '12px 18px', display: 'flex', gap: 8,
          justifyContent: 'space-between', alignItems: 'center',
          background: C.cardAlt,
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 14px', borderRadius: 6,
              background: 'transparent', border: `1px solid ${C.line}`,
              color: C.ink2, fontFamily: F_BODY, fontSize: 11, fontWeight: 600,
              cursor: 'pointer',
            }}
          >关闭</button>
          <button
            onClick={onEdit}
            style={{
              padding: '8px 14px', borderRadius: 6,
              background: C.save, border: `1px solid ${C.save}`,
              color: '#FFF', fontFamily: F_BODY, fontSize: 11, fontWeight: 600,
              cursor: 'pointer',
            }}
          >✎ 微调数据 →</button>
        </div>
      </div>
    </div>
  );
};

// 小方格
const StatCell = ({ label, value, sub }) => (
  <div style={{
    padding: '8px 10px', borderRadius: 6,
    background: C.cardAlt, border: `1px solid ${C.lineLite}`,
  }}>
    <div style={{
      fontSize: 9, color: C.mute, fontFamily: F_MONO,
      letterSpacing: '0.05em', fontWeight: 600, marginBottom: 3,
    }}>{label}</div>
    <div style={{
      fontFamily: F_NUM, fontSize: 16, fontWeight: 700,
      color: C.ink, letterSpacing: '-0.02em', lineHeight: 1,
    }}>{value}</div>
    {sub && <div style={{
      fontSize: 9, color: C.mute, fontFamily: F_BODY,
      marginTop: 3,
    }}>{sub}</div>}
  </div>
);

const InputPanel = ({ i, setI, calc, expand, setExpand, onOpenWizard }) => {
  const [showDetail, setShowDetail] = useState(false);
  const [showStoryModal, setShowStoryModal] = useState(false);
  const update = (k, v) => setI({ ...i, [k]: v });

  const updateProperty = (idx, updated) => {
    const next = [...(i.properties || [])];
    next[idx] = updated;
    setI({ ...i, properties: next });
  };

  const addProperty = (type) => {
    const next = [...(i.properties || []), {
      id: Date.now(),
      type,
      state: i.state || 'NY',
      propertyTax: type === 'rental' ? 6000 : 8000,
      mortInt: type === 'rental' ? 10000 : 12000,
      ...(type === 'rental' ? { rentalIncome: 24000, rentalExpenses: 4000, depreciation: 8000 } : {}),
    }];
    setI({ ...i, properties: next });
  };

  const removeProperty = (idx) => {
    const next = (i.properties || []).filter((_, k) => k !== idx);
    setI({ ...i, properties: next });
  };

  const hasCities = !!CITIES_BY_STATE[i.state];

  // Summary line 构造 (v100: CA aware)
  const stateLabel = (calc?._country === 'CA' ? CA_PROV_BRACKETS[i.state]?.label : STATE_BRACKETS[i.state]?.label) || i.state;
  const cityLabel = i.city && CITIES_BY_STATE[i.state]?.find(c => c.v === i.city)?.l;
  const workMode = !i.workState ? '本州工作' :
    (i.workStateDays ?? 100) < 30 ? '100% WFH' :
    (i.workStateDays ?? 100) < 80 ? '混合 WFH' : '跨州通勤';
  const workLabel = i.workState && i.workState !== i.state
    ? ` · ${workMode} → ${STATE_BRACKETS[i.workState]?.label || i.workState}`
    : '';
  const numProps = (i.properties || []).length;
  const totalIncome = (i.w2 || 0) + (i.spouseW2 || 0) + (i.inc1099 || 0);

  // v73/v74: 智能情景一段话 · v74 克制加 bold + 颜色
  const buildScenarioStory = () => {
    const segs = []; // array of { text, style }
    const push = (text, style) => { if (text) segs.push({ text, style: style || {} }); };

    // 1) 收入层级 · 有色
    const bandDef = totalIncome >= 1000000 ? { label: '超高净值', color: '#8B6B1F' }
      : totalIncome >= 500000 ? { label: '高净值', color: '#6B5B1F' }
      : totalIncome >= 250000 ? { label: 'HENRY 准富', color: '#1F5A3D' }
      : totalIncome >= 150000 ? { label: '中高薪', color: '#2B4A6B' }
      : totalIncome >= 80000 ? { label: '中产', color: C.ink2 }
      : { label: '初阶', color: C.mute };
    push(bandDef.label, { color: bandDef.color, fontWeight: 700 });

    // 2) 身份
    const filing = i.filingStatus === 'MFJ' ? '夫妻合并' : i.filingStatus === 'Single' ? '单身' : i.filingStatus === 'HoH' ? '单亲家长' : '夫妻分开';
    push(filing + '，', {});

    // 3) 地理
    const isCA = calc?._country === 'CA';
    const location = cityLabel ? cityLabel : stateLabel;
    const noStateTax = !isCA && ['FL', 'TX', 'NV', 'WA', 'TN', 'AK', 'WY', 'SD'].includes(i.state);
    const nhLike = !isCA && i.state === 'NH';
    push('住在 ', {});
    push(location, { color: C.ink, fontWeight: 700 });
    if (noStateTax) push('（0 州税）', { color: C.save, fontWeight: 600 });
    else if (nhLike) push('（NH 0 工资税）', { color: C.save, fontWeight: 600 });
    // CA 省的省税亮点提示
    if (isCA && i.state === 'AB') push('（BPA $21,885 全国最高）', { color: C.save, fontWeight: 600 });
    else if (isCA && i.state === 'QC') push('（单独报 TP-1）', { color: C.warn, fontWeight: 600 });

    // 4) 工作模式 · 跨州/跨省
    if (i.workState && i.workState !== i.state) {
      const workStateLabel = isCA
        ? (CA_PROV_BRACKETS[i.workState]?.label || i.workState)
        : (STATE_BRACKETS[i.workState]?.label || i.workState);
      const days = i.workStateDays ?? 100;
      const hasConv = !isCA && (CONVENIENCE_RULE_STATES?.[i.workState] != null);
      push('，', {});
      if (isCA) {
        // 加拿大跨省：12/31 哪个省就按哪个省 · 不拆分
        push('在 ', {});
        push(workStateLabel, { color: C.ink, fontWeight: 700 });
        push(' 工作', {});
      } else if (days >= 80) {
        push('每天通勤 ', {});
        push(workStateLabel, { color: C.ink, fontWeight: 700 });
        push(' 上班', {});
      } else if (days >= 30) {
        push('混合 WFH，一半在 ', {});
        push(workStateLabel, { color: C.ink, fontWeight: 700 });
      } else {
        push('远程办公（雇主在 ', {});
        push(workStateLabel, { color: C.ink, fontWeight: 700 });
        if (hasConv) {
          push('，', {});
          push('Convenience Rule 让远程也算工资源', { color: C.warn, fontWeight: 600 });
        }
        push('）', {});
      }
    }
    push('。', {});

    // 5) 收入构成（CA 用 T4/自雇术语 · US 用 W2/1099）
    const w2Total = (i.w2 || 0) + (i.spouseW2 || 0);
    const inc1099 = i.inc1099 || 0;
    const hasSpouseIncome = (i.spouseW2 || 0) > 0;
    const investmentIncome = (i.interest || 0) + (i.dividends || 0) + (i.capGainsLT || 0) + (i.capGainsST || 0);
    const wageLabel = isCA ? 'T4' : 'W2';
    const selfLabel = isCA ? '自雇' : '1099 自雇';

    if (w2Total > 0 && inc1099 > 0) {
      const ratio = Math.round((inc1099 / totalIncome) * 100);
      push(wageLabel + ' ' + (hasSpouseIncome ? '双薪 ' : ''), {});
      push('$' + fmt(w2Total), { fontFamily: F_NUM, fontWeight: 700, color: C.ink });
      push(` + ${selfLabel} `, {});
      push('$' + fmt(inc1099), { fontFamily: F_NUM, fontWeight: 700, color: C.ink });
      push(`（占 ${ratio}%）`, { color: C.mute });
    } else if (inc1099 > 0) {
      push('全职自雇 ', {});
      push('$' + fmt(inc1099), { fontFamily: F_NUM, fontWeight: 700, color: C.ink });
    } else if (w2Total > 0) {
      push(hasSpouseIncome ? `双薪 ${wageLabel} 合计 ` : `${wageLabel} `, {});
      push('$' + fmt(w2Total), { fontFamily: F_NUM, fontWeight: 700, color: C.ink });
    }

    // 6) 房产 · 投资 · 娃
    const extras = [];
    if (numProps > 0) {
      const rentalCount = (i.properties || []).filter(p => p.type === 'rental').length;
      const parts = [{ text: `${numProps} 套房产`, style: { color: C.ink, fontWeight: 600 } }];
      if (rentalCount > 0) parts.push({ text: `（含 ${rentalCount} 套出租）`, style: { color: C.mute, fontSize: 11 } });
      extras.push(parts);
    }
    if (investmentIncome > 10000) {
      extras.push([
        { text: '投资收入 ', style: {} },
        { text: '$' + fmt(investmentIncome), style: { fontFamily: F_NUM, fontWeight: 700, color: C.ink } },
      ]);
    }
    if (i.children > 0) {
      extras.push([{ text: `${i.children} 个娃`, style: { color: C.ink, fontWeight: 600 } }]);
    }
    if (extras.length > 0) {
      push('，', {});
      extras.forEach((parts, idx) => {
        if (idx > 0) push('、', {});
        parts.forEach(p => push(p.text, p.style));
      });
    }
    push('。', {});

    // 7) 税务关注信号 · 带术语 code 可点开解释
    const flags = [];
    if (isCA) {
      // v100 CA flags
      if (totalIncome > 93454) flags.push({ label: 'OAS 回收', code: 'OAS' });
      if (totalIncome > 150000 && (i.k401 || 0) < 32490) flags.push({ label: 'RRSP 未存满', code: 'RRSP' });
      if ((i.k401 || 0) === 0 && totalIncome > 50000) flags.push({ label: 'TFSA 未开', code: 'TFSA' });
      if ((i.capGainsLT || 0) + (i.capGainsST || 0) > 250000) flags.push({ label: '资本利得 > $250K', code: 'CapGains' });
      if (inc1099 > 30000) flags.push({ label: '季度预缴', code: 'QuarterlyCA' });
      if (i.state === 'QC') flags.push({ label: 'QC 双申报', code: 'QCFiling' });
      // 首房机会
      const hasHouse = (i.properties || []).some(p => p.type === 'primary');
      if (!hasHouse && totalIncome < 200000 && totalIncome > 50000) {
        flags.push({ label: 'FHSA 首房', code: 'FHSA' });
      }
    } else {
      // US flags (原 v99)
      // NIIT · 真正触发门槛：MAGI > $250K MFJ / $200K Single 且有投资收入
      const niitThreshold = i.filingStatus === 'MFJ' ? 250000 : 200000;
      const invIncome = (i.interest || 0) + (i.dividends || 0) + (i.capGainsLT || 0) + (i.capGainsST || 0);
      if (totalIncome > niitThreshold && invIncome > 0) flags.push({ label: 'NIIT 3.8%', code: 'NIIT' });
      const highSALT = ['NY', 'NJ', 'CA'].includes(i.state);
      if (highSALT && totalIncome > 400000 && totalIncome < 1000000) flags.push({ label: 'AMT 可能触发', code: 'AMT' });
      if (totalIncome > 1000000 && i.state === 'CA') flags.push({ label: 'CA 心理健康税 1%', code: null });
      if ((i.capGainsLT || 0) > 500000) flags.push({ label: 'QSBS 值得查', code: 'QSBS' });
      if (numProps >= 3 && (i.inc1099 > 200000 || w2Total === 0)) flags.push({ label: 'REPS 可省大', code: 'REPS' });
      if (inc1099 > 2000) flags.push({ label: '季度预缴', code: 'Safe Harbor' });
      const saltPhaseThreshold = i.filingStatus === 'MFS' ? 250000 : 500000;
      if (highSALT && totalIncome > saltPhaseThreshold) flags.push({ label: 'SALT phase-out', code: 'SALT' });
      if (inc1099 > 200000 && highSALT) flags.push({ label: 'PTE 绕 SALT', code: 'PTE' });
      if (w2Total > 250000 && (i.k401 || 0) < 23500) flags.push({ label: 'Mega Backdoor 未用', code: 'Mega Backdoor' });
    }

    return { segs, flags };
  };
  const { segs: storySegs, flags: storyFlags } = buildScenarioStory();

  // 收起状态：只显示概要 + 编辑按钮
  if (!showDetail) {
    return (
      <>
      <div className="rounded-2xl mb-2 overflow-hidden" style={{ background: C.card, border: `1px solid ${C.line}` }}>
        <div className="px-3 py-2">
          <div className="flex items-start justify-between gap-2">
            {/* v73: 智能一段话描述 */}
            <div style={{ flex: 1, minWidth: 0, fontSize: 12, fontFamily: F_BODY, color: C.ink, lineHeight: 1.55 }}>
              <div style={{
                fontSize: 9, color: C.mute, fontFamily: F_BODY,
                fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase',
                marginBottom: 3,
              }}>
                你的情景
              </div>
              <div style={{
                fontSize: 12, color: C.ink2, fontFamily: F_BODY,
                lineHeight: 1.65, letterSpacing: '0.005em',
              }}>
                {storySegs.map((s, idx) => (
                  <span key={idx} style={s.style}>{s.text}</span>
                ))}
                {storyFlags.length > 0 && (
                  <div style={{
                    marginTop: 6,
                    fontSize: 10, fontFamily: F_BODY,
                    display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center',
                  }}>
                    <span style={{
                      fontSize: 9, color: C.mute, fontFamily: F_MONO,
                      letterSpacing: '0.05em', fontWeight: 600,
                    }}>关注 →</span>
                    {storyFlags.map((f, idx) => (
                      <span key={idx} style={{
                        padding: '1px 6px', borderRadius: 3,
                        background: C.warnBg, color: C.warn,
                        fontWeight: 600, fontSize: 10,
                        border: `1px solid ${C.warn}33`,
                        display: 'inline-flex', alignItems: 'baseline',
                      }}>
                        {f.code ? <Term code={f.code}>{f.label}</Term> : f.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
              <button
                onClick={() => setShowStoryModal(true)}
                style={{
                  fontSize: 10, padding: '4px 8px', borderRadius: 6,
                  background: C.save, border: `1px solid ${C.save}`,
                  color: '#FFF', fontFamily: F_BODY, fontWeight: 600,
                  cursor: 'pointer',
                }}
              >详情 →</button>
              <button
                onClick={() => setShowDetail(true)}
                style={{
                  fontSize: 10, padding: '4px 8px', borderRadius: 6,
                  background: C.card, border: `1px solid ${C.line}`,
                  color: C.ink2, fontFamily: F_BODY, fontWeight: 600,
                  cursor: 'pointer',
                }}
              >✎ 微调</button>
            </div>
          </div>
        </div>
      </div>
      {showStoryModal && (
        <ScenarioDetailModal
          i={i} calc={calc}
          storySegs={storySegs} storyFlags={storyFlags}
          onClose={() => setShowStoryModal(false)}
          onEdit={() => { setShowStoryModal(false); setShowDetail(true); }}
        />
      )}
      </>
    );
  }

  // 展开状态：v65 分 4 个 tab
  return <InputPanelExpanded
    i={i} setI={setI} update={update}
    updateProperty={updateProperty} addProperty={addProperty} removeProperty={removeProperty}
    expand={expand} setExpand={setExpand}
    hasCities={hasCities}
    calc={calc}
    onCollapse={() => setShowDetail(false)}
  />;
};

// v65: 编辑面板 · 4 tab 版 · v67 再瘦身
const InputPanelExpanded = ({ i, setI, update, updateProperty, addProperty, removeProperty, hasCities, onCollapse, calc }) => {
  const [activeTab, setActiveTab] = useState('identity');
  const numProps = (i.properties || []).length;
  // v106: CA 模式下隐藏 US 特有字段 / 改标签
  const isCA = calc?._country === 'CA';

  const TABS = [
    { id: 'identity', label: '身份' },
    { id: 'income',   label: '收入' },
    { id: 'work',     label: isCA ? '省份' : '工作州' },
    { id: 'deduct',   label: '扣除' },
  ];

  return (
    <div className="rounded-2xl mb-2 overflow-hidden" style={{ background: C.card, border: `1px solid ${C.line}` }}>
      {/* v67: 单行 Tab 栏（右端嵌"收起"按钮，消除独立 header 高度） */}
      <div style={{
        display: 'flex', alignItems: 'stretch',
        background: C.cardAlt,
        borderBottom: `1px solid ${C.lineLite}`,
      }}>
        {TABS.map(t => {
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                flex: 1,
                padding: '8px 4px',
                background: active ? C.card : 'transparent',
                border: 'none',
                borderBottom: active ? `2px solid ${C.ink}` : '2px solid transparent',
                cursor: 'pointer',
                fontFamily: F_BODY,
                fontSize: 11,
                fontWeight: active ? 700 : 600,
                color: active ? C.ink : C.mute,
                transition: 'all 0.15s',
              }}
            >
              {t.label}
            </button>
          );
        })}
        <button
          onClick={onCollapse}
          style={{
            padding: '0 10px',
            background: 'transparent', border: 'none',
            borderLeft: `1px solid ${C.lineLite}`,
            color: C.mute, fontFamily: F_BODY,
            fontSize: 10, fontWeight: 600,
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 3,
          }}
        >
          收起 ▴
        </button>
      </div>

      {/* Tab 内容 · v67 tighter padding */}
      <div style={{ padding: '10px 12px' }}>
        {/* TAB 1 · 身份 · v67 更紧凑 */}
        {activeTab === 'identity' && (
          <>
            <div className="mb-2">
              <SegButton
                options={[{v:'MFJ',l:'夫妻合并'},{v:'Single',l:'单身'},{v:'HoH',l:'户主'}]}
                value={i.filingStatus}
                onChange={(v) => update('filingStatus', v)}
                size="sm"
              />
            </div>

            <div className="flex gap-2 items-end mb-1 flex-wrap">
              <StateSelect
                value={i.state}
                onChange={(v) => setI({ ...i, state: v, city: '' })}
                country={calc?._country}
              />
              {hasCities && (
                <CitySelect
                  state={i.state}
                  value={i.city}
                  onChange={(v) => update('city', v)}
                />
              )}
            </div>
            {calc?._country === 'CA'
              ? (CA_PROV_BRACKETS[i.state]?.note && (
                  <div style={{
                    fontSize: 9, color: C.info, fontFamily: F_BODY,
                    background: C.infoBg, padding: '3px 6px', borderRadius: 4,
                    marginTop: 4, marginBottom: 6, lineHeight: 1.4,
                  }}>
                    ¶ {CA_PROV_BRACKETS[i.state].note}
                  </div>
                ))
              : (STATE_BRACKETS[i.state]?.note && (
                  <div style={{
                    fontSize: 9, color: C.info, fontFamily: F_BODY,
                    background: C.infoBg, padding: '3px 6px', borderRadius: 4,
                    marginTop: 4, marginBottom: 6, lineHeight: 1.4,
                  }}>
                    ¶ {STATE_BRACKETS[i.state].note}
                  </div>
                ))}

            <Slider
              label="孩子数"
              value={i.children}
              onChange={(v) => update('children', v)}
              min={0} max={5} step={1}
              format={(n) => `${n}`}
              prefix=""
            />
          </>
        )}

        {/* TAB 2 · 收入 · v67 curved slider 到 $2M */}
        {activeTab === 'income' && (
          <>
            <CurvedIncomeSlider
              label={isCA ? '你的 T4 + Bonus' : '你的 W2 + Bonus'}
              value={i.w2}
              onChange={(v) => update('w2', v)}
              max={2000000}
            />
            {i.filingStatus === 'MFJ' && (
              <CurvedIncomeSlider
                label={isCA ? '配偶 T4 + Bonus' : '配偶 W2 + Bonus'}
                value={i.spouseW2}
                onChange={(v) => update('spouseW2', v)}
                max={2000000}
              />
            )}
            <CurvedIncomeSlider
              label={isCA ? '自雇收入 (T2125)' : '1099 自雇'}
              value={i.inc1099}
              onChange={(v) => update('inc1099', v)}
              max={2000000}
            />
            {i.inc1099 > 0 && (
              <Slider
                label={isCA ? '自雇业务开支' : '1099 开支'}
                value={i.expense1099}
                onChange={(v) => update('expense1099', v)}
                min={0} max={i.inc1099} step={500}
              />
            )}
          </>
        )}

        {/* TAB 3 · 工作州 */}
        {activeTab === 'work' && isCA && (
          <>
            {/* v106: CA 版 · 加拿大按 12/31 所在省报税 · 无跨州复杂概念 */}
            <div className="mb-3">
              <div style={{
                fontSize: 10, color: C.mute, fontFamily: F_BODY,
                fontWeight: 600, letterSpacing: '0.1em', marginBottom: 6,
                textTransform: 'uppercase',
              }}>
                居住省（税务居民）
              </div>
              <StateSelect
                value={i.state}
                onChange={(v) => setI({ ...i, state: v, city: '' })}
                country="CA"
              />
              {CA_PROV_BRACKETS[i.state]?.note && (
                <div style={{
                  fontSize: 10, color: C.info, fontFamily: F_BODY,
                  background: C.infoBg, padding: '6px 10px', borderRadius: 6,
                  marginTop: 8, lineHeight: 1.5,
                }}>
                  ¶ {CA_PROV_BRACKETS[i.state].label}: {CA_PROV_BRACKETS[i.state].note}
                </div>
              )}
            </div>
            {hasCities && (
              <div className="mb-3">
                <div style={{
                  fontSize: 10, color: C.mute, fontFamily: F_BODY,
                  fontWeight: 600, letterSpacing: '0.1em', marginBottom: 6,
                  textTransform: 'uppercase',
                }}>
                  城市（可选）
                </div>
                <CitySelect
                  state={i.state}
                  value={i.city}
                  onChange={(v) => update('city', v)}
                />
              </div>
            )}
            <div style={{
              padding: '10px 12px',
              background: C.cardAlt,
              border: `1px solid ${C.lineLite}`,
              borderRadius: 8,
              fontSize: 10,
              color: C.mute,
              fontFamily: F_BODY,
              lineHeight: 1.6,
              marginTop: 6,
            }}>
              § 加拿大按 <b style={{ color: C.ink }}>12/31 所在省</b> 报税 · 没有跨省通勤或 Convenience Rule。QC 需额外填 TP-1。
            </div>
          </>
        )}

        {activeTab === 'work' && !isCA && (
          <>
            {/* 工作情景快捷 */}
            <div className="mb-3">
              <div style={{
                fontSize: 10, color: C.mute, fontFamily: F_BODY,
                fontWeight: 600, letterSpacing: '0.1em', marginBottom: 6,
                textTransform: 'uppercase',
              }}>
                工作情景
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {[
                  { id: 'onsite', label: '本州上班', desc: '住哪工作哪',
                    apply: () => setI({ ...i, workState: '', workStateDays: 100 }),
                    isActive: !i.workState },
                  { id: 'cross', label: '跨州通勤', desc: 'NJ住 NY上班',
                    apply: () => setI({ ...i, state: 'NJ', workState: 'NY', workStateDays: 100, city: '' }),
                    isActive: i.workState && (i.workStateDays ?? 100) >= 80 && i.workState !== i.state },
                  { id: 'hybrid', label: '混合 WFH', desc: '一半远程',
                    apply: () => setI({ ...i, workState: i.workState || (i.state === 'NY' ? 'NY' : 'NY'), workStateDays: 50 }),
                    isActive: i.workState && (i.workStateDays ?? 100) >= 30 && (i.workStateDays ?? 100) < 80 },
                  { id: 'fullWFH', label: '100% WFH', desc: '完全远程',
                    apply: () => setI({ ...i, workState: i.workState || i.state, workStateDays: 0 }),
                    isActive: i.workState && (i.workStateDays ?? 100) < 30 },
                ].map(s => (
                  <button
                    key={s.id}
                    onClick={s.apply}
                    style={{
                      flex: 1, minWidth: 0, padding: '8px 6px', borderRadius: 6,
                      background: s.isActive ? C.ink : C.card,
                      border: `1px solid ${s.isActive ? C.ink : C.line}`,
                      color: s.isActive ? '#FFF' : C.ink2,
                      fontFamily: F_BODY, cursor: 'pointer', textAlign: 'left',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 1 }}>{s.label}</div>
                    <div style={{ fontSize: 9, color: s.isActive ? 'rgba(255,255,255,0.7)' : C.mute, fontWeight: 400 }}>
                      {s.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* 跨州工作设置 */}
            <Toggle
              label="我工作跨州 (W2 在不同州)"
              value={!!i.workState}
              onChange={(on) => setI({ ...i, workState: on ? (i.state === 'NJ' ? 'NY' : i.state === 'NY' ? 'NJ' : '') : '', workStateDays: on ? (i.workStateDays ?? 100) : undefined })}
              hint="例如 NJ 住 · NY 上班 / FL 住 · NJ 上班"
            />
            {i.workState && (
              <div className="mt-2">
                <StateSelect
                  value={i.workState}
                  onChange={(v) => update('workState', v)}
                  label="工作州 (W2 发薪州)"
                />
                {(() => {
                  const key = `${i.state}-${i.workState}`;
                  const note = CROSS_STATE_NOTES[key];
                  const reciprocal = (RECIPROCAL_AGREEMENTS[i.state] || []).includes(i.workState);
                  const hasConv = CONVENIENCE_RULE_STATES[i.workState] != null;
                  return (
                    <div style={{
                      fontSize: 10, fontFamily: F_BODY, marginTop: 6,
                      padding: '6px 10px', borderRadius: 6,
                      background: reciprocal ? C.saveBg : hasConv ? C.warnBg : C.infoBg,
                      color: reciprocal ? C.save : hasConv ? C.warn : C.info,
                      lineHeight: 1.5,
                    }}>
                      {reciprocal ? '✓ Reciprocal 互惠协议：工作州不扣税，只在居住州交' : (note || '† 两州都需报税；居住州会按你在工作州缴的税给抵免')}
                    </div>
                  );
                })()}

                {!(RECIPROCAL_AGREEMENTS[i.state] || []).includes(i.workState) && (
                  <div className="mt-3 pt-3" style={{ borderTop: `1px dashed ${C.lineLite}` }}>
                    <Slider
                      label={`物理在 ${STATE_BRACKETS[i.workState]?.label || i.workState} 工作天数`}
                      value={i.workStateDays ?? 100}
                      onChange={(v) => update('workStateDays', v)}
                      min={0} max={100} step={5}
                      format={(n) => `${n}%`}
                      prefix=""
                      hint={CONVENIENCE_RULE_STATES[i.workState]
                        ? '† 此州有 Convenience 规则 · 远程天数不算减'
                        : '100 = 全部通勤 · 0 = 全远程'}
                    />
                    <div className="flex gap-1.5 mb-2">
                      {[
                        { label: '每天通勤', v: 100 },
                        { label: '混合 3+2', v: 60 },
                        { label: '主要在家', v: 20 },
                        { label: '100% WFH', v: 0 },
                      ].map(preset => {
                        const isActive = (i.workStateDays ?? 100) === preset.v;
                        return (
                          <button
                            key={preset.v}
                            onClick={() => update('workStateDays', preset.v)}
                            style={{
                              fontSize: 10, padding: '4px 8px', borderRadius: 4,
                              background: isActive ? C.ink : C.cardAlt,
                              border: `1px solid ${isActive ? C.ink : C.line}`,
                              color: isActive ? '#FFF' : C.ink2,
                              fontFamily: F_BODY, fontWeight: 500,
                              cursor: 'pointer', flex: 1, whiteSpace: 'nowrap',
                            }}
                          >
                            {preset.label}
                          </button>
                        );
                      })}
                    </div>
                    {CONVENIENCE_RULE_STATES[i.workState] && (i.workStateDays ?? 100) < 100 && (
                      <div style={{
                        fontSize: 10, color: C.pay, fontFamily: F_BODY, lineHeight: 1.5,
                        background: C.payBg, padding: '6px 10px', borderRadius: 6, marginTop: 6,
                      }}>
                        † {STATE_BRACKETS[i.workState].label || i.workState} Convenience Rule：{CONVENIENCE_RULE_STATES[i.workState]}。远程天数也算该州来源。
                      </div>
                    )}
                    {!CONVENIENCE_RULE_STATES[i.workState] && (i.workStateDays ?? 100) < 100 && (
                      <div style={{
                        fontSize: 10, color: C.save, fontFamily: F_BODY, lineHeight: 1.5,
                        background: C.saveBg, padding: '6px 10px', borderRadius: 6, marginTop: 6,
                      }}>
                        ✓ {STATE_BRACKETS[i.workState].label || i.workState} 无 Convenience 规则。远程那部分工资不算该州来源。
                      </div>
                    )}
                  </div>
                )}

                {i.state && ['FL', 'TX', 'NV', 'WA', 'TN', 'AK', 'WY', 'SD', 'NH'].includes(i.state) && !['FL', 'TX', 'NV', 'WA', 'TN', 'AK', 'WY', 'SD', 'NH'].includes(i.workState) && (
                  <div style={{
                    fontSize: 10, color: C.warn, fontFamily: F_BODY, lineHeight: 1.5,
                    background: C.warnBg, padding: '6px 10px', borderRadius: 6, marginTop: 8,
                  }}>
                    † Statutory Resident 陷阱：一年 &gt;183 天在 {i.workState}，{i.workState} 会强制认定你为税务居民，两边全征。
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* TAB 4 · 房产 + 供款 */}
        {activeTab === 'deduct' && (
          <>
            {/* 房产区 */}
            <div style={{ marginBottom: 12 }}>
              <div className="flex items-center justify-between mb-2">
                <span style={{ fontSize: 11, color: C.mute, fontFamily: F_BODY, fontWeight: 600, letterSpacing: '0.08em' }}>
                  房产 · {numProps} 套
                </span>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => addProperty('second_home')}
                    style={{
                      fontSize: 10, padding: '4px 8px', borderRadius: 6,
                      background: C.card, border: `1px solid ${C.line}`,
                      fontFamily: F_BODY, color: C.ink2, cursor: 'pointer', fontWeight: 600,
                    }}
                  >+ 二套</button>
                  <button
                    onClick={() => addProperty('rental')}
                    style={{
                      fontSize: 10, padding: '4px 8px', borderRadius: 6,
                      background: C.card, border: `1px solid ${C.line}`,
                      fontFamily: F_BODY, color: C.ink2, cursor: 'pointer', fontWeight: 600,
                    }}
                  >+ 出租</button>
                </div>
              </div>
              {numProps === 0 ? (
                <div className="flex flex-col items-center py-3">
                  <span style={{ fontSize: 11, color: C.mute, fontFamily: F_BODY, marginBottom: 8 }}>
                    无房产 · 租房或没开始买
                  </span>
                  <button
                    onClick={() => addProperty('primary')}
                    style={{
                      fontSize: 11, padding: '5px 12px', borderRadius: 6,
                      background: C.ink, border: 'none', color: '#FFF',
                      fontFamily: F_BODY, cursor: 'pointer', fontWeight: 600,
                    }}
                  >+ 添加自住房</button>
                </div>
              ) : (
                (i.properties || []).map((p, idx) => (
                  <PropertyCard
                    key={p.id || idx}
                    property={p}
                    onChange={(u) => updateProperty(idx, u)}
                    onDelete={() => removeProperty(idx)}
                    canDelete={true}
                    index={idx}
                  />
                ))
              )}
            </div>

            {/* 已有供款 */}
            <div style={{ borderTop: `1px dashed ${C.lineLite}`, paddingTop: 10, marginTop: 4 }}>
              <div style={{ fontSize: 10, color: C.mute, fontFamily: F_BODY, fontWeight: 600, marginBottom: 8, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                已有供款 (pre-tax)
              </div>
              <Slider
                label={isCA ? '今年已存 RRSP' : '今年已存 401(k)'}
                value={i.k401}
                onChange={(v) => update('k401', v)}
                min={0} max={isCA ? CA_RRSP_LIMIT : K401_LIMIT_2025} step={500}
                hint={isCA
                  ? `2025 上限 $${CA_RRSP_LIMIT.toLocaleString()} 或 18% × 上年收入`
                  : `2025 上限 $${K401_LIMIT_2025.toLocaleString()}`}
              />
              {/* v106: US 特有 · CA 模式全部隐藏（HDHP/HSA/Mega Backdoor/Commuter/DCFSA 加拿大无对应） */}
              {!isCA && (
                <>
                  <div className="mb-3">
                    <Toggle
                      label="有 HDHP 高自付医保"
                      value={i.hdhp}
                      onChange={(v) => update('hdhp', v)}
                      hint="HSA 开户前提"
                    />
                    {i.hdhp && (
                      <Slider
                        label="已存 HSA"
                        value={i.hsa}
                        onChange={(v) => update('hsa', v)}
                        min={0}
                        max={i.filingStatus === 'MFJ' ? HSA_LIMIT_2025.Family : HSA_LIMIT_2025.Self}
                        step={100}
                      />
                    )}
                  </div>
                  <Toggle
                    label="雇主 401k 支持 After-tax + In-service"
                    value={i.megaBackdoor}
                    onChange={(v) => update('megaBackdoor', v)}
                    hint="Mega Backdoor Roth 前提"
                  />
                  <Toggle
                    label="已在用 Commuter Benefits"
                    value={i.commuterBenefit}
                    onChange={(v) => update('commuterBenefit', v)}
                  />
                  <Toggle
                    label="已在用 Dependent Care FSA"
                    value={i.dcfsa}
                    onChange={(v) => update('dcfsa', v)}
                  />
                </>
              )}
              {/* CA 版 · 提示 TFSA/FHSA */}
              {isCA && (
                <div style={{
                  padding: '10px 12px',
                  marginTop: 8,
                  background: C.cardAlt,
                  border: `1px solid ${C.lineLite}`,
                  borderRadius: 8,
                  fontSize: 10,
                  color: C.mute,
                  fontFamily: F_BODY,
                  lineHeight: 1.6,
                }}>
                  § <b style={{ color: C.ink }}>TFSA / FHSA</b> 存钱不减当年税 · 建议在主界面的省税机会卡里查看。
                </div>
              )}
            </div>

            {/* Itemize 项 · CA 无此概念 · 改为"额外扣除 / 抵免" */}
            <div style={{ borderTop: `1px dashed ${C.lineLite}`, paddingTop: 10, marginTop: 10 }}>
              <div style={{ fontSize: 10, color: C.mute, fontFamily: F_BODY, fontWeight: 600, marginBottom: 8, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {isCA ? '额外扣除 / 抵免' : 'Itemize 项'}
              </div>
              <Slider
                label={isCA ? '慈善捐赠 (credit)' : '慈善捐赠'}
                value={i.charity}
                onChange={(v) => update('charity', v)}
                min={0} max={30000} step={100}
                hint={isCA ? '> $200 部分按 29% credit' : undefined}
              />
              {!isCA && (
                <Slider
                  label="自费医疗"
                  value={i.medical}
                  onChange={(v) => update('medical', v)}
                  min={0} max={50000} step={500}
                  hint="超过 AGI 的 7.5% 部分才能抵"
                />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
//  税负总览
// ═══════════════════════════════════════════════════════════

const SummaryCard = ({ calc, i, theme = THEMES.sage, preset }) => {
  // v100: 根据 country 切换标签
  const isCA = calc?._country === 'CA';
  const stateLabel = isCA ? `${i.state} 省` : `${i.state} 州`;
  const payrollLabel = isCA ? 'CPP+EI' : 'FICA';
  const seLabel = isCA ? '自雇 CPP' : 'SE 税';

  const taxItems = [
    { label: '联邦', value: calc.fedTax, color: '#E8DCC0' },          // 暖米色 · 最大块最醒目
    { label: stateLabel, value: calc.stateTax, color: '#7FA3CC' },   // 蓝灰
    { label: calc.localRule?.name || '市/地方', value: calc.localTax, color: '#D88BB0' }, // 玫粉
    { label: payrollLabel, value: calc.fica, color: '#9FC4A8' },      // 鼠尾草绿
    { label: seLabel, value: calc.seTax, color: '#E0B977' },          // 琥珀金
  ].filter(x => x.value > 0);

  // 主题文字颜色：深色主题下反转为浅色
  const textColor = theme.isDark ? '#F2EEE3' : C.ink;
  const muteColor = theme.isDark ? '#98A89E' : C.mute;
  const cornerColor = theme.isDark ? '#98A89E' : C.ink2;

  // SVG 纹理点（按主题色动态生成）
  const dotSvg = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='60' height='60'><circle cx='1.5' cy='1.5' r='0.6' fill='${encodeURIComponent(theme.heroDot)}' opacity='0.25'/><circle cx='30' cy='30' r='0.5' fill='${encodeURIComponent(theme.heroDot)}' opacity='0.22'/></svg>")`;

  return (
    <div className="rounded-2xl mb-2" style={{
      background: theme.heroBg,
      backgroundImage: `
        linear-gradient(${theme.heroOverlay}, ${theme.heroOverlay}),
        ${dotSvg}
      `,
      backgroundRepeat: 'repeat',
      color: textColor,
      border: `1px solid ${theme.heroBorder}`,
      position: 'relative',
      overflow: 'hidden',
      padding: '14px 14px 12px',
      boxShadow: theme.isDark
        ? 'inset 0 1px 0 rgba(255,255,255,0.05), 0 1px 2px rgba(0,0,0,0.2)'
        : 'inset 0 1px 0 rgba(255,255,255,0.3), 0 2px 8px rgba(60,50,30,0.12), 0 1px 2px rgba(60,50,30,0.08)',
      '--hero-text': textColor,
      '--hero-mute': muteColor,
      '--hero-corner': cornerColor,
    }}>
      {/* 左右上角的裁剪线装饰 */}
      <div style={{
        position: 'absolute', top: 8, left: 8,
        width: 10, height: 10,
        borderLeft: `1px solid ${C.ink2}`,
        borderTop: `1px solid ${C.ink2}`,
        opacity: 0.35,
      }} />
      <div style={{
        position: 'absolute', top: 8, right: 8,
        width: 10, height: 10,
        borderRight: `1px solid ${C.ink2}`,
        borderTop: `1px solid ${C.ink2}`,
        opacity: 0.35,
      }} />
      <div style={{
        position: 'absolute', bottom: 8, left: 8,
        width: 10, height: 10,
        borderLeft: `1px solid ${C.ink2}`,
        borderBottom: `1px solid ${C.ink2}`,
        opacity: 0.35,
      }} />
      <div style={{
        position: 'absolute', bottom: 8, right: 8,
        width: 10, height: 10,
        borderRight: `1px solid ${C.ink2}`,
        borderBottom: `1px solid ${C.ink2}`,
        opacity: 0.35,
      }} />

      {/* v95: 顶部 profile 一眼认出 · 替代 "TAX YEAR 2025 · 夫妻合并" */}
      <div style={{
        fontSize: 10, color: C.ink2, fontFamily: F_BODY,
        fontWeight: 600, letterSpacing: '0.02em',
        marginBottom: 2, textAlign: 'center',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {profileOneLiner(i, preset) || '自定义情景'}
      </div>
      <div style={{
        fontSize: 9, color: C.mute, fontFamily: F_MONO,
        fontWeight: 500, letterSpacing: '0.1em',
        marginBottom: 4, textAlign: 'center',
      }}>
        TAX YEAR 2025
        {calc?._tunerPct > 0 && (
          <span style={{
            marginLeft: 6, color: C.save, fontWeight: 700,
            letterSpacing: '0.05em',
          }}>
            · 执行 {calc._tunerPct}% 预览
          </span>
        )}
      </div>

      {/* 三列：收入 | 税负 | 现金到手 · 统一字号 24pt */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        alignItems: 'flex-start',
        gap: 4,
        marginTop: 12,
      }}>
        {/* 总收入 */}
        <div style={{ textAlign: 'left', padding: '0 4px' }}>
          <div style={{
            fontSize: 9, color: C.mute, fontFamily: F_BODY, fontWeight: 600,
            letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>
            总收入
          </div>
          <div style={{
            fontFamily: F_NUM, fontSize: 24, fontWeight: 700,
            color: C.ink, letterSpacing: '-0.03em', lineHeight: 1.1,
            marginTop: 3,
          }}>
            ${fmt(calc.grossWages)}
          </div>
          <div style={{
            fontSize: 9, color: C.muteLite, fontFamily: F_BODY, marginTop: 3,
            letterSpacing: '0.05em',
          }}>
            Gross
          </div>
        </div>

        {/* 总税负 · 用颜色突出，不靠字号 */}
        <div style={{
          position: 'relative',
          textAlign: 'center', padding: '0 4px',
          borderLeft: `1px solid ${C.lineLite}`,
          borderRight: `1px solid ${C.lineLite}`,
        }}>
          <div style={{
            fontSize: 9, color: C.pay, fontFamily: F_BODY, fontWeight: 600,
            letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>
            总税负
          </div>
          <div style={{
            fontFamily: F_NUM, fontSize: 24, fontWeight: 700,
            color: C.pay, letterSpacing: '-0.03em', lineHeight: 1.1,
            marginTop: 3,
          }}>
            ${fmt(calc.totalTax)}
          </div>
          <div style={{
            fontSize: 9, color: C.muteLite, fontFamily: F_BODY, marginTop: 3,
            letterSpacing: '0.05em',
          }}>
            {pct(calc.effectiveRate)}
          </div>
        </div>

        {/* 当下到手（现金）+ 延税资产 · 守恒：当下到手 + 延税 + 总税负 = 总收入 */}
        <div style={{ textAlign: 'right', padding: '0 4px' }}>
          <div style={{
            fontSize: 9, color: C.save, fontFamily: F_BODY, fontWeight: 600,
            letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>
            当下到手
          </div>
          <div style={{
            fontFamily: F_NUM, fontSize: 24, fontWeight: 700,
            color: C.save, letterSpacing: '-0.03em', lineHeight: 1.1,
            marginTop: 3,
          }}>
            ${fmt(calc.cashTakeHome)}
          </div>
          {calc.deferredAssets > 0 ? (
            <div style={{
              fontSize: 9, color: C.info, fontFamily: F_NUM, fontWeight: 600,
              letterSpacing: '-0.01em', marginTop: 3,
            }}>
              + 延税 ${fmt(calc.deferredAssets)}
            </div>
          ) : (
            <div style={{
              fontSize: 9, color: C.muteLite, fontFamily: F_BODY, marginTop: 3,
              letterSpacing: '0.05em',
            }}>
              现金
            </div>
          )}
        </div>
      </div>

      {/* v63: 守恒等式小字 · 让用户看清三个数字之和 = 总收入 */}
      <div style={{
        marginTop: 8,
        fontSize: 8, color: C.muteLite, fontFamily: F_MONO,
        textAlign: 'center', letterSpacing: '0.04em',
      }}>
        § 总收入 ${fmt(calc.grossWages)}
        <span style={{ margin: '0 4px', opacity: 0.5 }}>=</span>
        <span style={{ color: C.save }}>当下到手 ${fmt(calc.cashTakeHome)}</span>
        {calc.deferredAssets > 0 && (
          <>
            <span style={{ margin: '0 3px', opacity: 0.5 }}>+</span>
            <span style={{ color: C.info }}>延税 ${fmt(calc.deferredAssets)}</span>
          </>
        )}
        <span style={{ margin: '0 3px', opacity: 0.5 }}>+</span>
        <span style={{ color: C.pay }}>税负 ${fmt(calc.totalTax)}</span>
      </div>

      {/* 中间：细堆叠条 + 分项 */}
      <div style={{
        marginTop: 12,
        paddingTop: 10,
        borderTop: `1px solid ${C.lineLite}`,
      }}>
        <StackBar items={taxItems} total={calc.totalTax} />
      </div>

      {/* 底部：Itemize + SALT 警告 */}
      <div style={{
        marginTop: 10,
        display: 'flex', alignItems: 'center', gap: 10,
        fontSize: 10, fontFamily: F_BODY, color: C.mute,
        flexWrap: 'wrap',
      }}>
        <span>
          {isCA
            ? <>BPA <b style={{ color: C.ink, fontFamily: F_NUM }}>${fmt(calc.fedBPA || 0)}</b></>
            : <>{calc.useItemize ? 'Itemize' : 'Standard'}{' '}
               <b style={{ color: C.ink, fontFamily: F_NUM }}>${fmt(calc.fedDed)}</b></>
          }
        </span>
        <span style={{ opacity: 0.4 }}>·</span>
        <span>边际 <b style={{ color: C.ink, fontFamily: F_NUM }}>{pct(calc.marginalCombined)}</b></span>
        {!isCA && calc.saltLost > 0 && (
          <>
            <span style={{ opacity: 0.4 }}>·</span>
            <span style={{ color: C.pay }}>
              <b style={{ fontFamily: F_NUM, marginRight: 2 }}>†</b>
              SALT 损失 ${fmt(calc.saltLost)}
            </span>
          </>
        )}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
//  省税 Banner
// ═══════════════════════════════════════════════════════════

const SavingsBanner = ({ opps, calc }) => {
  const totalSave = opps.filter(o => o.type !== 'warning').reduce((s, o) => s + (o.saving || 0), 0);
  const actionable = opps.filter(o => o.type !== 'warning' && (o.saving || 0) > 0).length;

  // 执行所有机会后：
  // - 现金到手：税减少 $totalSave，但部分建议会把钱从现金转到延税账户（如存满 401k 要从现金里扣）
  // - 全局到手：税减少就全部是你的
  //
  // 简化假设：省税的机会大部分要"投入"等额的现金（401k/HSA/IRA），所以：
  // - 全局 take home 增加 $totalSave
  // - 现金 take home 大约 = 当前现金 + (税省的) - (转入延税账户的)
  //   近似 = 当前现金 + totalSave * 0.3 (粗估：省税里 ~30% 是纯现金回流，70% 是转入延税账户)
  //
  // 更准确的方法是对 opps 逐个分类，但我们先做个简单近似
  const currentCash = calc?.cashTakeHome || 0;
  const currentGlobal = calc?.takeHome || 0;

  // 区分省税招的性质：
  // - 不需要投入现金的（例如 Standard 优化、居住地换州、Commuter、QBI、Itemize 改用）
  // - 需要投入现金的（401k/Solo 401k/HSA/IRA/Mega Backdoor）
  // 用 opp.contrib 或 type 粗略判断
  const saveRequiresContrib = opps.reduce((sum, o) => {
    if (o.type === 'warning' || !(o.saving > 0)) return sum;
    // 如果机会带 contrib 字段，说明要投钱 → 投入现金转延税
    if (o.contrib && o.contrib > 0) return sum + (o.contrib || 0);
    return sum;
  }, 0);
  const saveAsCashBack = totalSave - saveRequiresContrib > 0
    ? Math.max(0, totalSave) // 简化：把现金回流 = 税省 - 额外投入
    : totalSave;

  // 执行后现金到手 = 当前现金 + 税省 - 新增的 pre-tax 供款
  const newCash = currentCash + totalSave - saveRequiresContrib;
  // 执行后全局到手 = 当前全局 + 税省
  const newGlobal = currentGlobal + totalSave;

  return (
    <div className="rounded-xl px-3 py-3 mb-2"
      style={{ background: C.saveBg, border: `1px solid ${C.save}` }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 6,
      }}>
        <div style={{
          fontSize: 9, color: C.save, fontFamily: F_BODY, fontWeight: 700,
          letterSpacing: '0.12em', textTransform: 'uppercase',
        }}>
          ◆ 潜在可省 ${fmt(totalSave)} / 年 · {actionable} 招
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 10,
        alignItems: 'flex-start',
      }}>
        {/* 执行后当下到手 · 大号 */}
        <div style={{
          padding: '7px 10px',
          background: '#FFFFFFCC',
          borderRadius: 6,
          border: `1px solid ${C.save}33`,
        }}>
          <div style={{
            fontSize: 9, color: C.save, fontFamily: F_BODY, fontWeight: 700,
            letterSpacing: '0.08em', textTransform: 'uppercase',
          }}>
            执行后当下到手
          </div>
          <div style={{
            fontFamily: F_NUM, fontSize: 20, fontWeight: 800,
            color: C.save, letterSpacing: '-0.02em', lineHeight: 1,
            marginTop: 3,
          }}>
            ${fmt(newCash)}
          </div>
          <div style={{
            fontSize: 9, color: C.mute, fontFamily: F_BODY, marginTop: 3,
          }}>
            现金 · 比现在 <b style={{
              color: newCash >= currentCash ? C.save : C.pay,
              fontFamily: F_NUM,
            }}>{newCash >= currentCash ? '+' : ''}${fmt(newCash - currentCash)}</b>
          </div>
        </div>

        {/* 执行后全局到手 · 对齐左侧字号 */}
        <div style={{
          padding: '7px 10px',
          background: '#FFFFFFCC',
          borderRadius: 6,
          border: `1px solid ${C.line}`,
        }}>
          <div style={{
            fontSize: 9, color: C.mute, fontFamily: F_BODY, fontWeight: 700,
            letterSpacing: '0.08em', textTransform: 'uppercase',
          }}>
            含延税资产
          </div>
          <div style={{
            fontFamily: F_NUM, fontSize: 20, fontWeight: 800,
            color: C.ink2, letterSpacing: '-0.02em', lineHeight: 1,
            marginTop: 3,
          }}>
            ${fmt(newGlobal)}
          </div>
          <div style={{
            fontSize: 9, color: C.mute, fontFamily: F_BODY, marginTop: 3,
          }}>
            +<b style={{ color: C.save, fontFamily: F_NUM }}>${fmt(newGlobal - currentGlobal)}</b> 净增加
          </div>
        </div>
      </div>

      {/* 说明条 */}
      {saveRequiresContrib > 0 && (
        <div style={{
          marginTop: 7,
          fontSize: 9, color: C.mute, fontFamily: F_BODY, lineHeight: 1.5,
        }}>
          ※ 存 401k/HSA 这类会把现金转入延税账户，所以"当下到手"比"含延税资产"少
          <b style={{ fontFamily: F_NUM, marginLeft: 4 }}>${fmt(saveRequiresContrib)}</b>
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
//  SavingsTuner · 省税调节器
//  用户拖滑块选"省多少税 vs 保留多少现金"的中间平衡点
// ═══════════════════════════════════════════════════════════

const SavingsTuner = ({ opps, calc, inputs, pct, setPct }) => {
  // 把机会分两类：
  // (1) contribOpps - 需要投入现金换省税的（401k/HSA/Solo 401k/MegaBackdoor）
  //     这类可以"部分执行"（存一半、存 80%）
  // (2) freeOpps - 不需要投入现金的（Itemize/慈善/换州/QBI）
  //     默认全部执行（当作 bonus）
  const contribOpps = opps.filter(o =>
    o.type !== 'warning'
    && (o.saving || 0) > 0
    && (o.contrib || 0) > 0
  );
  const freeOpps = opps.filter(o =>
    o.type !== 'warning'
    && (o.saving || 0) > 0
    && !(o.contrib > 0)
  );

  const maxContribTotal = contribOpps.reduce((s, o) => s + (o.contrib || 0), 0);
  const maxContribSaving = contribOpps.reduce((s, o) => s + (o.saving || 0), 0);
  const freeSaving = freeOpps.reduce((s, o) => s + (o.saving || 0), 0);
  const totalPossibleSaving = maxContribSaving + freeSaving;

  // v61: pct 从 props 来，不再本地 state
  // v62: 详情折叠 · 滑块 > 0% 时自动展开，=0% 时自动收起
  // 用户仍可手动按"收起"覆盖当前状态（直到下次 pct 跨 0 临界时）
  const [manualToggle, setManualToggle] = useState(null); // null = auto, true/false = manual override
  const autoOpen = pct > 0;
  const showDetails = manualToggle != null ? manualToggle : autoOpen;
  // 滑块跨过 0 临界点时清除 manual override
  const prevAutoRef = React.useRef(autoOpen);
  React.useEffect(() => {
    if (prevAutoRef.current !== autoOpen) {
      setManualToggle(null);
      prevAutoRef.current = autoOpen;
    }
  }, [autoOpen]);
  const setShowDetails = (next) => {
    setManualToggle(next);
  };

  if (totalPossibleSaving < 500) return null; // 没啥可调的就不显示

  // 滑块的当前值 · v46: 0% = 啥都不做，与 Hero 当下到手完全相等
  // 所有机会（包括免费型）都按 scale 缩放，这样 0% 时 newCash = currentCash 精确相等
  const scale = pct / 100;
  const chosenContribSaving = Math.round(maxContribSaving * scale);
  const chosenContribAmt = Math.round(maxContribTotal * scale);
  const chosenFreeSaving = Math.round(freeSaving * scale);

  // 最终效果
  const totalTaxSaved = chosenContribSaving + chosenFreeSaving;
  const currentCash = calc?.cashTakeHome || 0;
  const newCash = currentCash + totalTaxSaved - chosenContribAmt;
  const newDeferred = (calc?.deferredAssets || 0) + chosenContribAmt;
  const cashDelta = newCash - currentCash;
  const currentGlobal = calc?.takeHome || 0;
  const newGlobal = currentGlobal + totalTaxSaved;

  // 预设档位（可快速点击）
  const presets = [
    { pct: 0,   label: '维持现金', desc: '不动' },
    { pct: 25,  label: '稳妥',     desc: '省一点' },
    { pct: 50,  label: '平衡',     desc: '中间值' },
    { pct: 75,  label: '进取',     desc: '多省税' },
    { pct: 100, label: '满格',     desc: '极致省税' },
  ];

  return (
    <div className="rounded-xl mb-2 px-3 py-3" style={{
      background: '#FFFFFF',
      border: `1px solid ${C.line}`,
      position: 'relative',
    }}>
      {/* 顶部标题 */}
      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        marginBottom: 10,
      }}>
        <div>
          <div style={{
            fontSize: 11, fontWeight: 700, color: C.ink,
            fontFamily: F_BODY, letterSpacing: '0.02em',
            display: 'flex', alignItems: 'baseline', gap: 5, flexWrap: 'wrap',
          }}>
            <span>◆ 省税调节器</span>
            <span style={{ color: C.save, fontFamily: F_NUM, fontSize: 12 }}>
              潜在省 ${fmt(totalPossibleSaving)}
            </span>
            <span style={{ color: C.mute, fontSize: 9, fontWeight: 400 }}>
              · {(contribOpps.length + freeOpps.length)} 招
            </span>
          </div>
          <div style={{
            fontSize: 9, color: C.mute, marginTop: 2, fontFamily: F_BODY,
          }}>
            0% = 顶部当下到手 · 100% = 全部执行后
          </div>
        </div>
        <button
          onClick={() => setShowDetails(!showDetails)}
          style={{
            fontSize: 10, padding: '5px 10px', borderRadius: 6,
            background: showDetails ? C.save : C.cardAlt,
            color: showDetails ? '#FFF' : C.ink2,
            border: `1px solid ${showDetails ? C.save : C.line}`,
            fontFamily: F_BODY, fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 5,
            letterSpacing: '0.02em',
            transition: 'all 0.15s',
          }}
        >
          <span>{showDetails ? '收起' : '详情'}</span>
          <span style={{
            fontSize: 11, lineHeight: 1,
            transform: showDetails ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s',
          }}>▾</span>
        </button>
      </div>

      {/* v69: 档位快捷键 · 仅在 pct > 0 时显示（0 时和 Hero 重复，无信息增量） */}
      {pct > 0 && (
        <div style={{
          display: 'flex', gap: 4, marginBottom: 8,
        }}>
          {presets.map(p => (
            <button
              key={p.pct}
              onClick={() => setPct(p.pct)}
              style={{
                flex: 1,
                padding: '4px 2px',
                background: pct === p.pct ? C.save : 'transparent',
                color: pct === p.pct ? '#FFF' : C.mute,
                border: `1px solid ${pct === p.pct ? C.save : C.lineLite}`,
                borderRadius: 4,
                cursor: 'pointer',
                fontFamily: F_BODY,
                display: 'flex', alignItems: 'baseline', justifyContent: 'center',
                gap: 4,
                transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: 10, fontWeight: pct === p.pct ? 700 : 600 }}>{p.label}</span>
              <span style={{ fontSize: 8, opacity: 0.65 }}>{p.pct}%</span>
            </button>
          ))}
        </div>
      )}

      {/* 滑块本体 */}
      <div style={{ padding: '0 4px' }}>
        <input
          type="range"
          min="0"
          max="100"
          step="5"
          value={pct}
          onChange={(e) => setPct(Number(e.target.value))}
          style={{
            width: '100%',
            height: 6,
            WebkitAppearance: 'none',
            appearance: 'none',
            borderRadius: 3,
            background: `linear-gradient(to right, ${C.save} 0%, ${C.save} ${pct}%, ${C.lineLite} ${pct}%, ${C.lineLite} 100%)`,
            outline: 'none',
            cursor: 'pointer',
          }}
        />
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          marginTop: 4,
          fontSize: 9, color: C.muteLite, fontFamily: F_BODY,
        }}>
          <span>0% · 啥都不做</span>
          <span style={{ fontWeight: 700, color: C.ink, fontFamily: F_NUM, fontSize: 11 }}>
            {pct}% 执行
          </span>
          <span>100% · 满档</span>
        </div>
      </div>

      {/* 核心对比 · 当下到手 vs 省税 · v69 仅在 pct > 0 时显示 */}
      {pct > 0 && (
      <div style={{
        marginTop: 12,
        padding: '14px 16px',
        background: C.saveBg,
        border: `1px solid ${C.save}55`,
        borderRadius: 10,
        display: 'grid',
        gridTemplateColumns: '1fr 1px 1fr',
        gap: 0,
        alignItems: 'stretch',
        position: 'relative',
      }}>
        {/* 左：当下到手 · 靠中间 */}
        <div style={{
          textAlign: 'right',
          paddingRight: 16,
          display: 'flex', flexDirection: 'column',
          justifyContent: 'center',
        }}>
          <div style={{
            fontSize: 9, color: C.save, fontWeight: 700,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            fontFamily: F_MONO, marginBottom: 4,
          }}>
            当下到手现金
          </div>
          <div style={{
            fontFamily: F_NUM, fontSize: 26, fontWeight: 800,
            color: newCash >= currentCash ? C.save : C.pay,
            letterSpacing: '-0.03em', lineHeight: 1,
          }}>
            ${fmt(newCash)}
          </div>
          <div style={{
            display: 'flex', justifyContent: 'flex-end', alignItems: 'baseline',
            gap: 6, marginTop: 5,
          }}>
            <span style={{
              fontSize: 9, color: C.mute, fontFamily: F_MONO, letterSpacing: '0.04em',
            }}>占总收入</span>
            <span style={{
              fontFamily: F_NUM, fontSize: 12, fontWeight: 700, color: C.ink,
              letterSpacing: '-0.01em',
            }}>
              {calc?.grossWages > 0 ? Math.round(newCash / calc.grossWages * 100) : 0}%
            </span>
          </div>
          <div style={{
            fontSize: 10, fontFamily: F_BODY, fontWeight: 600,
            color: cashDelta >= 0 ? C.save : C.pay,
            marginTop: 3,
          }}>
            {cashDelta >= 0 ? '+' : ''}${fmt(cashDelta)}
            {Math.abs(cashDelta) > 0 && currentCash > 0 && (
              <span style={{ color: C.mute, fontWeight: 500, marginLeft: 4 }}>
                ({cashDelta >= 0 ? '+' : ''}{Math.round(cashDelta / currentCash * 100)}%)
              </span>
            )}
          </div>
        </div>

        {/* 中：虚线竖线 */}
        <div style={{
          borderLeft: `1.5px dashed ${C.save}66`,
          alignSelf: 'stretch',
        }} />

        {/* 右：少交的税 · 靠中间 */}
        <div style={{
          textAlign: 'left',
          paddingLeft: 16,
          display: 'flex', flexDirection: 'column',
          justifyContent: 'center',
        }}>
          <div style={{
            fontSize: 9, color: C.save, fontWeight: 700,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            fontFamily: F_MONO, marginBottom: 4,
          }}>
            少交的税
          </div>
          <div style={{
            fontFamily: F_NUM, fontSize: 26, fontWeight: 800,
            color: C.save, letterSpacing: '-0.03em', lineHeight: 1,
          }}>
            −${fmt(totalTaxSaved)}
          </div>
          <div style={{
            display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 5,
          }}>
            <span style={{
              fontSize: 9, color: C.mute, fontFamily: F_MONO, letterSpacing: '0.04em',
            }}>占原税</span>
            <span style={{
              fontFamily: F_NUM, fontSize: 12, fontWeight: 700, color: C.ink,
              letterSpacing: '-0.01em',
            }}>
              {calc?.totalTax > 0 ? Math.round(totalTaxSaved / calc.totalTax * 100) : 0}%
            </span>
          </div>
          <div style={{
            fontSize: 10, fontFamily: F_BODY, fontWeight: 600,
            color: chosenContribAmt > 0 ? C.info : C.mute,
            marginTop: 3,
          }}>
            {chosenContribAmt > 0 ? (
              <>+${fmt(chosenContribAmt)} 延税资产</>
            ) : (
              <>无需供款 · 纯省</>
            )}
          </div>
        </div>
      </div>
      )}

      {/* 详细清单 */}
      {showDetails && (
        <div style={{
          marginTop: 10,
          padding: '10px 12px',
          background: C.cardAlt,
          border: `1px solid ${C.line}`,
          borderRadius: 6,
          fontFamily: F_BODY,
          fontSize: 10,
        }}>
          <div style={{
            fontSize: 9, fontWeight: 700, color: C.mute,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            marginBottom: 6,
          }}>
            此方案行动清单
          </div>

          {/* 免费的（不需投入现金）· v46: 也跟滑块比例 */}
          {freeOpps.length > 0 && (
            <>
              <div style={{ fontSize: 9, color: C.mute, marginBottom: 3 }}>
                ◆ 免费机会（不投现金 · 按 {pct}% 比例执行）
              </div>
              {freeOpps.map((o, idx) => {
                const saving = Math.round((o.saving || 0) * scale);
                return (
                  <div key={`f${idx}`} style={{
                    display: 'flex', justifyContent: 'space-between',
                    padding: '2px 0',
                    color: saving > 0 ? C.ink2 : C.muteLite,
                  }}>
                    <span>· {o.title}</span>
                    <span style={{ fontFamily: F_NUM, color: C.save, fontWeight: 600 }}>
                      −${fmt(saving)}
                    </span>
                  </div>
                );
              })}
            </>
          )}

          {/* 需要投入现金的 */}
          {contribOpps.length > 0 && (
            <>
              <div style={{
                fontSize: 9, color: C.mute, marginTop: 8, marginBottom: 3,
              }}>
                ◆ 投入型机会（按 {pct}% 比例执行）
              </div>
              {contribOpps.map((o, idx) => {
                const contrib = Math.round((o.contrib || 0) * scale);
                const saving = Math.round((o.saving || 0) * scale);
                return (
                  <div key={`c${idx}`} style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 80px 80px',
                    gap: 6,
                    padding: '3px 0',
                    fontSize: 10,
                    color: contrib > 0 ? C.ink2 : C.muteLite,
                  }}>
                    <span style={{ fontSize: 9 }}>· {o.title}</span>
                    <span style={{
                      fontSize: 9, textAlign: 'right', fontFamily: F_NUM,
                      color: C.info,
                    }}>
                      存 ${fmt(contrib)}
                    </span>
                    <span style={{
                      fontSize: 9, textAlign: 'right', fontFamily: F_NUM,
                      color: C.save, fontWeight: 600,
                    }}>
                      −${fmt(saving)}
                    </span>
                  </div>
                );
              })}
              <div style={{
                marginTop: 6, paddingTop: 4,
                borderTop: `1px dashed ${C.line}`,
                display: 'grid',
                gridTemplateColumns: '1fr 80px 80px',
                gap: 6,
                fontSize: 10, fontWeight: 700,
              }}>
                <span>合计</span>
                <span style={{ textAlign: 'right', fontFamily: F_NUM, color: C.info }}>
                  ${fmt(chosenContribAmt)}
                </span>
                <span style={{ textAlign: 'right', fontFamily: F_NUM, color: C.save }}>
                  −${fmt(chosenContribSaving)}
                </span>
              </div>
            </>
          )}

          {/* 全局指标 */}
          <div style={{
            marginTop: 10, paddingTop: 8,
            borderTop: `1px solid ${C.line}`,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 8,
            fontSize: 9,
          }}>
            <div>
              <div style={{ color: C.mute }}>含延税资产到手</div>
              <div style={{
                fontFamily: F_NUM, fontWeight: 700, color: C.ink,
                fontSize: 12,
              }}>
                ${fmt(newGlobal)}
              </div>
              <div style={{ color: C.save, marginTop: 1 }}>
                +${fmt(newGlobal - currentGlobal)} 净增
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: C.mute }}>延税资产增加</div>
              <div style={{
                fontFamily: F_NUM, fontWeight: 700, color: C.info,
                fontSize: 12,
              }}>
                +${fmt(chosenContribAmt)}
              </div>
              <div style={{ color: C.mute, marginTop: 1 }}>
                401k / HSA / IRA
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
//  机会卡（保持原样）
// ═══════════════════════════════════════════════════════════

const OppCard = ({ opp, rank }) => {
  const [open, setOpen] = useState(rank === 1);
  const isWarn = opp.type === 'warning';
  const isInfo = opp.type === 'info';
  const isDone = opp.tag === '已优化';
  // v108 defensive: difficulty / why / tag 都可能 undefined（CA opps）
  const difficulty = opp.difficulty || 0;
  const diffDots = '●'.repeat(difficulty) + '○'.repeat(Math.max(0, 5 - difficulty));
  const subLine = opp.why || opp.hook || '';   // CA 用 hook
  const tagLabel = opp.tag || (opp.deadline ? opp.deadline : '');
  return (
    <div className="rounded-xl mb-2 overflow-hidden transition-colors"
      style={{ background: isWarn ? C.warnBg : isDone ? C.saveBg : isInfo ? C.infoBg : C.card,
        border: `1px solid ${isWarn ? '#E6C97A' : isDone ? C.save : isInfo ? '#BCC9DE' : C.line}` }}>
      <button onClick={() => setOpen(!open)} className="w-full px-4 py-3 flex items-center gap-3"
        style={{ background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
        {!isWarn && !isDone && !isInfo && (
          <div style={{ width: 24, height: 24, borderRadius: '50%',
            background: rank <= 3 ? C.ink : C.line, color: rank <= 3 ? '#FFF' : C.mute,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontFamily: F_NUM, fontWeight: 700, flexShrink: 0 }}>{rank}</div>
        )}
        {isWarn && <div style={{ fontSize: 20, flexShrink: 0, fontFamily: F_NUM, color: C.warn, lineHeight: 1 }}>†</div>}
        {isDone && <div style={{ fontSize: 18, flexShrink: 0, color: C.save }}>✓</div>}
        {isInfo && <div style={{ fontSize: 18, flexShrink: 0, fontFamily: F_NUM, color: C.info, lineHeight: 1 }}>¶</div>}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span style={{ fontSize: 14, fontFamily: F_BODY, fontWeight: 700, color: C.ink }}>{opp.title}</span>
            <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 4,
              background: isWarn ? '#E6C97A' : isDone ? C.save : isInfo ? C.info : C.lineLite,
              color: isWarn || isDone || isInfo ? '#FFF' : C.mute,
              fontFamily: F_BODY, fontWeight: 600, letterSpacing: '0.05em' }}>{tagLabel}</span>
          </div>
          <div style={{ fontSize: 11, color: C.mute, fontFamily: F_BODY, marginTop: 3, lineHeight: 1.4 }}>{subLine}</div>
        </div>
        <div className="text-right flex-shrink-0 ml-2">
          {opp.saving > 0 ? (
            <>
              <div style={{ fontFamily: F_NUM, fontSize: 18, fontWeight: 700, color: C.save, lineHeight: 1, letterSpacing: '-0.02em' }}>-${fmt(opp.saving)}</div>
              <div style={{ fontSize: 9, color: C.mute, fontFamily: F_BODY, marginTop: 2 }}>省税</div>
            </>
          ) : opp.cost ? (
            <>
              <div style={{ fontFamily: F_NUM, fontSize: 16, fontWeight: 700, color: C.pay, lineHeight: 1 }}>+${fmt(opp.cost)}</div>
              <div style={{ fontSize: 9, color: C.mute, fontFamily: F_BODY, marginTop: 2 }}>多交</div>
            </>
          ) : isInfo ? (
            <div style={{ fontSize: 10, color: C.info, fontFamily: F_BODY, fontWeight: 600 }}>规划</div>
          ) : null}
        </div>
        <span style={{ fontSize: 12, color: C.mute, marginLeft: 4, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>▾</span>
      </button>
      {open && (
        <div className="px-4 py-3" style={{ background: isWarn ? '#FDF6E3' : isInfo ? '#F0F5FB' : C.cardAlt, borderTop: `1px solid ${C.lineLite}` }}>
          <div className="flex items-center gap-4 mb-3 flex-wrap">
            {opp.contrib != null && opp.contrib > 0 && (
              <div>
                <div style={{ fontSize: 9, color: C.mute, fontFamily: F_BODY, letterSpacing: '0.05em' }}>可供款 / 扣除</div>
                <div style={{ fontFamily: F_NUM, fontSize: 14, fontWeight: 700, color: C.ink }}>${fmt(opp.contrib)}</div>
              </div>
            )}
            <div>
              <div style={{ fontSize: 9, color: C.mute, fontFamily: F_BODY, letterSpacing: '0.05em' }}>时间</div>
              <div style={{ fontSize: 11, fontFamily: F_BODY, color: C.ink, fontWeight: 600 }}>{opp.urgency}</div>
            </div>
            {opp.difficulty > 0 && (
              <div>
                <div style={{ fontSize: 9, color: C.mute, fontFamily: F_BODY, letterSpacing: '0.05em' }}>难度</div>
                <div style={{ fontSize: 11, fontFamily: F_MONO, color: C.ink, fontWeight: 700 }}>{diffDots}</div>
              </div>
            )}
          </div>
          <div style={{ fontSize: 10, color: C.mute, fontFamily: F_BODY, fontWeight: 600, letterSpacing: '0.05em', marginBottom: 6 }}>怎么做</div>
          {Array.isArray(opp.how) && opp.how.length > 0 ? (
            <ol style={{ paddingLeft: 16, margin: 0 }}>
              {opp.how.map((step, idx) => (
                <li key={idx} style={{ fontSize: 12, color: C.ink2, fontFamily: F_BODY, lineHeight: 1.6, marginBottom: 4 }}>{step}</li>
              ))}
            </ol>
          ) : opp.detail ? (
            <div style={{ fontSize: 12, color: C.ink2, fontFamily: F_BODY, lineHeight: 1.6 }}>{opp.detail}</div>
          ) : null}
          {opp.warn && (
            <div className="mt-3 px-3 py-2 rounded-lg flex gap-2" style={{ background: C.warnBg, border: `1px solid #E6C97A` }}>
              <span style={{ fontSize: 12, flexShrink: 0 }}>†</span>
              <span style={{ fontSize: 11, color: C.warn, fontFamily: F_BODY, lineHeight: 1.5 }}>{opp.warn}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
//  ★ 新增：假设场景 · 一眼看出变化
// ═══════════════════════════════════════════════════════════

const ScenarioCompare = ({ inputs, calc }) => {
  const [picked, setPicked] = useState(null);
  const [showAllScenarios, setShowAllScenarios] = useState(false);

  // v104: CA 模式用独立的场景集 · US 特有场景（FL/TX no-tax state · 401k）不适用
  const isCA = calc?._country === 'CA';

  // 辅助：算"真实工作州"（跨州通勤时是 workState，否则是 state）
  const currentWorkState = inputs.workState || inputs.state;
  // 当前工作州是否有 Convenience Rule（搬家不能省 state tax）· CA 无此规则
  const currentWorkHasConv = !isCA && CONVENIENCE_RULE_STATES[currentWorkState] != null;

  // v104: CA 版假设场景
  const caScenarios = [
    {
      id: 'rrspMax', label: '存满 RRSP ($32,490)', icon: '↗', group: '策略',
      patch: { k401: CA_RRSP_LIMIT },
      onlyIf: (i) => (i.k401 || 0) < CA_RRSP_LIMIT - 1000,
    },
    {
      id: 'fhsaOpen', label: '开 FHSA + 存 $8K', icon: '◆', group: '策略',
      patch: (i) => ({ k401: (i.k401 || 0) + 8000 }),
      onlyIf: (i) => !(i.properties || []).some(p => p.type === 'primary'),
    },
    {
      id: 'moveAB', label: '搬家到阿省 (AB · BPA $21.9K)', icon: '', group: '换省',
      patch: (i) => ({ state: 'AB', city: '', workState: '' }),
      onlyIf: (i) => i.state !== 'AB',
    },
    {
      id: 'moveSK', label: '搬家到萨省 (低税)', icon: '', group: '换省',
      patch: (i) => ({ state: 'SK', city: '', workState: '' }),
      onlyIf: (i) => i.state !== 'SK' && i.state !== 'AB',
    },
    {
      id: 'moveBC', label: '搬家到卑诗 (BC)', icon: '', group: '换省',
      patch: (i) => ({ state: 'BC', city: 'vancouver', workState: '' }),
      onlyIf: (i) => i.state !== 'BC',
    },
    {
      id: 'moveQC', label: '搬家到魁北克 (注意双报税)', icon: '', group: '换省',
      patch: (i) => ({ state: 'QC', city: 'montreal', workState: '' }),
      onlyIf: (i) => i.state !== 'QC',
    },
    {
      id: 'charity5k', label: '+$5K 慈善捐赠 (credit 29%)', icon: '♢', group: '策略',
      patch: (i) => ({ charity: (i.charity || 0) + 5000 }),
    },
    {
      id: 'raise30k', label: 'T4 涨 $30K', icon: '↑', group: '变化',
      patch: (i) => ({ w2: (i.w2 || 0) + 30000 }),
    },
    {
      id: 'sidehustle', label: '+$40K 自雇副业', icon: '↑', group: '变化',
      patch: (i) => ({ inc1099: (i.inc1099 || 0) + 40000, expense1099: (i.expense1099 || 0) + 8000 }),
      onlyIf: (i) => (i.inc1099 || 0) === 0,
    },
  ];

  // 动态生成可选场景（US 原版）
  const usScenarios = [
    // "搬到 X"：保留 workState（工作地不变），workStateDays 归 0（远程或离职搬家）
    {
      id: 'fl', label: '搬家到 Florida (工作不变)', icon: '[S]', group: '换州',
      patch: (i) => ({ state: 'FL', city: '', workState: i.workState || i.state, workStateDays: 0 }),
    },
    {
      id: 'tx', label: '搬家到 Texas (工作不变)', icon: '', group: '换州',
      patch: (i) => ({ state: 'TX', city: '', workState: i.workState || i.state, workStateDays: 0 }),
    },
    {
      id: 'nv', label: '搬家到 Nevada (工作不变)', icon: '', group: '换州',
      patch: (i) => ({ state: 'NV', city: '', workState: i.workState || i.state, workStateDays: 0 }),
    },
    {
      id: 'wa', label: '搬家到 Washington (工作不变)', icon: '', group: '换州',
      patch: (i) => ({ state: 'WA', city: '', workState: i.workState || i.state, workStateDays: 0 }),
    },
    {
      id: 'ny', label: '搬家到 NY 州非市区 (工作不变)', icon: '', group: '换州',
      patch: (i) => ({ state: 'NY', city: '', workState: i.workState || i.state, workStateDays: 0 }),
    },
    {
      id: 'nyc', label: '住到 NYC (多 3.8% 市税)', icon: '', group: '换市',
      patch: (i) => ({ state: 'NY', city: 'nyc', workState: i.workState || i.state, workStateDays: 0 }),
      onlyIf: (i) => !(i.state === 'NY' && i.city === 'nyc'),
    },
    {
      id: 'nj', label: '搬家到 New Jersey (工作不变)', icon: '', group: '换州',
      patch: (i) => ({ state: 'NJ', city: '', workState: i.workState || i.state, workStateDays: 0 }),
    },
    {
      id: 'ca', label: '搬家到 California (工作不变)', icon: '', group: '换州',
      patch: (i) => ({ state: 'CA', city: '', workState: i.workState || i.state, workStateDays: 0 }),
    },
    {
      id: 'pa', label: '搬家到 Pennsylvania (工作不变)', icon: '', group: '换州',
      patch: (i) => ({ state: 'PA', city: '', workState: i.workState || i.state, workStateDays: 0 }),
    },
    {
      id: 'flWorkHere', label: '搬 FL 但继续物理通勤', icon: '', group: '跨州',
      patch: (i) => ({ state: 'FL', city: '', workState: i.state, workStateDays: 100 }),
      onlyIf: (i) => i.state !== 'FL' && !i.workState && STATE_BRACKETS[i.state]?.MFJ[0][1] > 0,
    },
    {
      id: 'flRemote', label: '搬 FL + 找 0 州税州雇主', icon: '', group: '跨州',
      patch: (i) => ({ state: 'FL', city: '', workState: '', workStateDays: 100 }),
      onlyIf: (i) => i.state !== 'FL' && STATE_BRACKETS[i.state]?.MFJ[0][1] > 0,
    },
    {
      id: 'halfRemote', label: '50% 远程 (从 {workState} 到家里)', icon: '', group: '跨州',
      patch: (i) => ({ workStateDays: 50 }),
      onlyIf: (i) => i.workState && i.workState !== i.state && !CONVENIENCE_RULE_STATES[i.workState] && (i.workStateDays ?? 100) > 50,
    },
    {
      id: 'fullRemoteSameJob', label: '100% WFH (工作不变)', icon: '', group: 'WFH',
      patch: (i) => ({ workState: i.workState || i.state, workStateDays: 0 }),
      onlyIf: (i) => (i.workStateDays ?? 100) > 10,
    },
    {
      id: 'fullRemoteToFL', label: '100% WFH + 搬 FL', icon: '', group: 'WFH',
      patch: (i) => ({
        state: 'FL', city: '',
        workState: i.workState || i.state,
        workStateDays: 0,
      }),
      onlyIf: (i) => i.state !== 'FL' && STATE_BRACKETS[i.state]?.MFJ?.[0]?.[1] > 0.04,
    },
    {
      id: 'fullRemoteToTX', label: '100% WFH + 搬 TX', icon: '', group: 'WFH',
      patch: (i) => ({
        state: 'TX', city: '',
        workState: i.workState || i.state,
        workStateDays: 0,
      }),
      onlyIf: (i) => i.state !== 'TX' && STATE_BRACKETS[i.state]?.MFJ?.[0]?.[1] > 0.04,
    },
    { id: 'max401k', label: '存满 W2 401(k)', icon: '↗', group: '策略', patch: { k401: K401_LIMIT_2025 } },
    { id: 'charity10k', label: '+$10K 慈善捐赠', icon: '♢', group: '策略', patch: (i) => ({ charity: (i.charity || 0) + 10000 }) },
    { id: 'raise30k', label: 'W2 涨 $30K', icon: '↑', group: '变化', patch: (i) => ({ w2: i.w2 + 30000 }) },
    { id: 'mfj', label: '结婚合并申报', icon: '', group: '变化', patch: { filingStatus: 'MFJ' }, onlyIf: (i) => i.filingStatus === 'Single' },
  ];

  const allScenarios = isCA ? caScenarios : usScenarios;

  const scenarios = allScenarios
    .filter(s => !s.onlyIf || s.onlyIf(inputs))
    .filter(s => {
      const p = typeof s.patch === 'function' ? null : s.patch;
      if (p?.state && p.state === inputs.state && (p.city || '') === (inputs.city || '')) return false;
      return true;
    })
    .map(s => {
      const patch = typeof s.patch === 'function' ? s.patch(inputs) : s.patch;
      if (!patch) return null;
      const newInputs = { ...inputs, ...patch };
      // v104: CA 场景也用 CA 计算引擎
      const newCalc = isCA ? computeTaxCA(newInputs) : computeTax(newInputs);
      return { ...s, newCalc, delta: newCalc.totalTax - calc.totalTax, newInputs };
    })
    .filter(Boolean)
    .sort((a, b) => a.delta - b.delta);

  const detail = picked ? scenarios.find(s => s.id === picked) : null;
  const SCENARIO_TOP = 4;
  const topAll = scenarios.slice(0, SCENARIO_TOP);
  const top = showAllScenarios ? scenarios : topAll;
  const remainingCount = Math.max(0, scenarios.length - SCENARIO_TOP);
  const hasMoreScenarios = remainingCount > 0;

  return (
    <div className="rounded-2xl mb-2 overflow-hidden" style={{ background: C.card, border: `1px solid ${C.line}` }}>
      <div className="px-4 py-2" style={{ borderBottom: `1px solid ${C.lineLite}` }}>
        <div className="flex items-baseline justify-between">
          <span style={{
            fontSize: 10, color: C.mute, fontFamily: F_BODY,
            fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase',
          }}>
            假设场景 · 如果我…
          </span>
          <span style={{ fontSize: 10, color: C.muteLite, fontFamily: F_BODY }}>
            点卡片看对比
          </span>
        </div>
        {/* 搬家场景的前提说明 */}
        {currentWorkHasConv && (
          <div style={{
            marginTop: 6, padding: '5px 8px', borderRadius: 5,
            background: C.warnBg, border: `1px solid #E6C97A`,
            fontSize: 9, color: C.warn, fontFamily: F_BODY, lineHeight: 1.4,
          }}>
            <b>† </b>搬家场景假设你的工作仍在 {STATE_BRACKETS[currentWorkState]?.label || currentWorkState}。由于 {STATE_BRACKETS[currentWorkState]?.label || currentWorkState} 有 Convenience Rule，搬到 FL/TX/NV 也要交 {STATE_BRACKETS[currentWorkState]?.label || currentWorkState} 州税。想真省州税需换到当地雇主。
          </div>
        )}
        {!currentWorkHasConv && (inputs.workState && inputs.workState !== inputs.state) && (
          <div style={{
            marginTop: 6, padding: '5px 8px', borderRadius: 5,
            background: C.infoBg, border: `1px solid #BCC9DE`,
            fontSize: 9, color: C.info, fontFamily: F_BODY, lineHeight: 1.4,
          }}>
            <b>¶ </b>搬家场景假设你工作在 {STATE_BRACKETS[inputs.workState]?.label || inputs.workState}（无 Convenience Rule）、100% 远程，故只交新居住州的税。
          </div>
        )}
      </div>

      {/* 2-col 正方形网格 */}
      <div style={{
        padding: 10,
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 6,
      }}>
        {top.map((s) => {
          const isSave = s.delta < 0;
          const isZero = s.delta === 0;
          return (
            <button
              key={s.id}
              onClick={() => setPicked(s.id)}
              style={{
                aspectRatio: '1 / 1',
                background: isSave ? C.saveBg : isZero ? C.card : C.payBg,
                border: `1px solid ${isSave ? C.save : isZero ? C.line : C.pay}`,
                borderRadius: 10, padding: 8,
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                textAlign: 'left', cursor: 'pointer',
                fontFamily: F_BODY, width: '100%',
                overflow: 'hidden',
              }}
            >
              <div style={{
                fontSize: 8, fontFamily: F_BODY, fontWeight: 600,
                color: C.mute, letterSpacing: '0.1em', textTransform: 'uppercase',
              }}>
                {s.group}
              </div>
              <div style={{
                fontSize: 10, fontFamily: F_BODY, fontWeight: 700,
                color: C.ink, lineHeight: 1.25,
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}>
                {s.label}
              </div>
              <div>
                <div style={{
                  fontFamily: F_NUM, fontSize: 13, fontWeight: 700,
                  color: isSave ? C.save : isZero ? C.mute : C.pay,
                  lineHeight: 1, letterSpacing: '-0.02em',
                }}>
                  {isZero ? '—' : (() => {
                    const abs = Math.abs(s.delta);
                    const short = abs >= 10000 ? `${Math.round(abs/1000)}K` : abs >= 1000 ? `${(abs/1000).toFixed(1)}K` : Math.round(abs);
                    return (s.delta >= 0 ? '+$' : '−$') + short;
                  })()}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* 展开 / 收起 */}
      {hasMoreScenarios && (
        <button
          onClick={() => setShowAllScenarios(!showAllScenarios)}
          style={{
            width: '100%',
            padding: '8px 14px',
            borderTop: `1px solid ${C.lineLite}`,
            background: 'transparent', border: 'none',
            borderTopLeftRadius: 0, borderTopRightRadius: 0,
            fontSize: 11, color: C.mute, fontFamily: F_BODY, fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          {showAllScenarios ? '收起 ↑' : `展开更多场景 ↓（还有 ${remainingCount} 条）`}
        </button>
      )}

      {/* 详情 Modal */}
      <DetailModal
        open={!!detail}
        onClose={() => setPicked(null)}
        title={detail?.label || ''}
        subtitle={detail?.group}
      >
        {detail && (
          <>
            {/* 大数字对比 */}
            <div style={{ display: 'flex', alignItems: 'stretch', gap: 8, marginBottom: 14 }}>
              <div style={{
                flex: 1, padding: 12, borderRadius: 10,
                background: C.card, border: `1px solid ${C.line}`,
              }}>
                <div style={{ fontSize: 9, color: C.mute, fontFamily: F_BODY, letterSpacing: '0.1em', textTransform: 'uppercase' }}>当前</div>
                <div style={{
                  fontFamily: F_NUM, fontSize: 22, fontWeight: 700,
                  color: C.ink, letterSpacing: '-0.02em', marginTop: 4,
                }}>
                  ${fmt(calc.totalTax)}
                </div>
                <div style={{ fontSize: 10, color: C.mute, fontFamily: F_BODY, marginTop: 2 }}>
                  到手 ${fmt(calc.takeHome)}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', color: C.mute, fontSize: 18, padding: '0 2px' }}>→</div>
              <div style={{
                flex: 1, padding: 12, borderRadius: 10,
                background: detail.delta < 0 ? C.saveBg : C.payBg,
                border: `1px solid ${detail.delta < 0 ? C.save : C.pay}`,
              }}>
                <div style={{ fontSize: 9, color: C.mute, fontFamily: F_BODY, letterSpacing: '0.1em', textTransform: 'uppercase' }}>假设</div>
                <div style={{
                  fontFamily: F_NUM, fontSize: 22, fontWeight: 700,
                  color: detail.delta < 0 ? C.save : C.pay,
                  letterSpacing: '-0.02em', marginTop: 4,
                }}>
                  ${fmt(detail.newCalc.totalTax)}
                </div>
                <div style={{ fontSize: 10, color: C.mute, fontFamily: F_BODY, marginTop: 2 }}>
                  到手 ${fmt(detail.newCalc.takeHome)}
                </div>
              </div>
            </div>

            {/* 差额显眼条 */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: 12, borderRadius: 10, marginBottom: 16,
              background: detail.delta < 0 ? C.save : C.pay, color: '#FFF',
            }}>
              <span style={{ fontSize: 12, fontFamily: F_BODY, fontWeight: 600 }}>
                {detail.delta < 0 ? '总税负减少' : detail.delta > 0 ? '总税负增加' : '无变化'}
              </span>
              <span style={{ fontFamily: F_NUM, fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>
                {fmtSigned(detail.delta)}
              </span>
            </div>

            {/* 分项变化 */}
            <div style={{
              fontSize: 10, color: C.mute, fontFamily: F_BODY, fontWeight: 600,
              letterSpacing: '0.1em', marginBottom: 6, textTransform: 'uppercase',
            }}>
              分项变化
            </div>
            {[
              ['联邦税', calc.fedTax, detail.newCalc.fedTax],
              ['州税', calc.stateTax, detail.newCalc.stateTax],
              ['市/地方', calc.localTax, detail.newCalc.localTax],
              ['FICA', calc.fica, detail.newCalc.fica],
              ['SE 税', calc.seTax, detail.newCalc.seTax],
            ].filter(r => r[1] > 0 || r[2] > 0).map(([label, before, after]) => {
              const d = after - before;
              return (
                <div key={label} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '7px 0', borderBottom: `1px dashed ${C.lineLite}`, fontSize: 12,
                }}>
                  <span style={{ fontFamily: F_BODY, color: C.ink2, minWidth: 60 }}>{label}</span>
                  <span style={{ fontFamily: F_NUM, color: C.mute, fontWeight: 600 }}>${fmt(before)}</span>
                  <span style={{ color: C.muteLite }}>→</span>
                  <span style={{ fontFamily: F_NUM, color: C.ink, fontWeight: 700 }}>${fmt(after)}</span>
                  <span style={{
                    fontFamily: F_NUM, fontWeight: 700,
                    color: d < 0 ? C.save : d > 0 ? C.pay : C.mute,
                    minWidth: 70, textAlign: 'right',
                  }}>
                    {d === 0 ? '—' : fmtSigned(d)}
                  </span>
                </div>
              );
            })}

            <div style={{
              marginTop: 12, display: 'flex',
              alignItems: 'center', justifyContent: 'space-between',
              fontSize: 10, color: C.mute, fontFamily: F_BODY,
            }}>
              <span>
                有效税率 {pct(calc.effectiveRate)} → {pct(detail.newCalc.effectiveRate)}
              </span>
              <span>
                扣除方式 {calc.useItemize ? 'Item.' : 'Std.'} → {detail.newCalc.useItemize ? 'Item.' : 'Std.'}
              </span>
            </div>
          </>
        )}
      </DetailModal>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
//  ★ 新增：行动时间线 · 按 IRS 日历组织
// ═══════════════════════════════════════════════════════════

const classifyByDeadline = (urgency) => {
  const u = (urgency || '').toLowerCase();
  if (u.includes('12/31') || u.includes('dec 31') || u.includes('年末') || u.includes('工资扣') || u.includes('year-end')) return 'yearEnd';
  if (u.includes('4/15') || u.includes('追补') || u.includes('enrollment')) return 'taxDay';
  if (u.includes('无') || u.includes('自动') || u.includes('报税时')) return 'auto';
  return 'ongoing';
};

const TimelineGroup = ({ icon, title, subtitle, color, items, emptyHint }) => (
  <div className="mb-3 pl-4" style={{ borderLeft: `2px solid ${color}`, position: 'relative' }}>
    <div style={{
      position: 'absolute', left: -7, top: 0,
      width: 12, height: 12, borderRadius: '50%',
      background: color, border: `2px solid ${C.card}`,
    }} />
    <div className="flex items-baseline justify-between mb-1.5">
      <div>
        <span style={{ fontSize: 13, fontFamily: F_BODY, fontWeight: 700, color: C.ink }}>
          {icon} {title}
        </span>
        <div style={{ fontSize: 10, color: C.mute, fontFamily: F_BODY, marginTop: 1 }}>
          {subtitle}
        </div>
      </div>
      {items.length > 0 && (
        <span style={{ fontSize: 10, color: C.mute, fontFamily: F_BODY }}>
          {items.length} 项
        </span>
      )}
    </div>
    {items.length === 0 ? (
      <div style={{ fontSize: 11, color: C.muteLite, fontFamily: F_BODY, paddingBottom: 6 }}>
        {emptyHint}
      </div>
    ) : (
      items.map((o) => (
        <div key={o.id} className="flex items-center justify-between py-1.5"
          style={{ borderBottom: `1px dashed ${C.lineLite}` }}>
          <span style={{ fontSize: 12, fontFamily: F_BODY, color: C.ink2, fontWeight: 500 }}>
            {o.title}
          </span>
          {o.saving > 0 && (
            <span style={{ fontFamily: F_NUM, fontSize: 13, fontWeight: 700, color: C.save, letterSpacing: '-0.01em' }}>
              −${fmt(o.saving)}
            </span>
          )}
        </div>
      ))
    )}
  </div>
);

// ═══════════════════════════════════════════════════════════
//  v52 · QuarterlyBudget · 分号精确预算
//  自雇 / 投资人群需要分 4 季预缴（Form 1040-ES）
//  Safe Harbor: 90% 今年税 OR 100%/110% 去年税
//  2026 截止日：4/15 · 6/15 · 9/15 · 2027/1/15
// ═══════════════════════════════════════════════════════════

const QuarterlyBudget = ({ inputs, calc }) => {
  // v106: CA 模式暂隐藏 · 加拿大 T1 Instalments 规则不同（CRA 上年税 > $3,000 门槛 · 季节 3/15, 6/15, 9/15, 12/15）· 下版本专门做
  if (calc?._country === 'CA') return null;

  // 需求判断：预期欠税 > $1,000 才需要预缴
  // 收入是自雇 / 1099 / 投资 / rental 型的才触发
  const has1099 = (inputs.inc1099 || 0) > 0;
  const hasInvestmentIncome = (inputs.interest || 0) + (inputs.dividends || 0) + (inputs.capGainsLT || 0) + (inputs.capGainsST || 0) > 2000;
  const hasRental = (inputs.properties || []).some(p => p.type === 'rental');
  const hasNoW2 = (inputs.w2 || 0) === 0 && (inputs.spouseW2 || 0) === 0;

  if (!has1099 && !hasRental && !hasNoW2 && !hasInvestmentIncome) return null;

  // 估算 W2 预扣（粗估：W2 × 15-20%）— 真实世界是 Form W-4 决定的，这里保守估 18%
  const totalW2 = (inputs.w2 || 0) + (inputs.spouseW2 || 0);
  const estW2Withhold = Math.round(totalW2 * 0.18);

  // 非 W2 税负 = 总税负 - W2 预扣估算
  // 所有非 W2 收入产生的税（SE Tax + 投资税 + rental 税等）都需要季度预缴
  const totalTax = calc.totalTax || 0;
  const needsQuarterly = Math.max(0, totalTax - estW2Withhold);
  const perQuarter = Math.round(needsQuarterly / 4);

  // 不欠超过 $1,000 则不需要预缴
  if (needsQuarterly < 1000) return null;

  // Safe Harbor 计算（假设去年税负接近今年的 95%）
  const lastYearTaxApprox = Math.round(totalTax * 0.95);
  const agi = calc.agi || 0;
  const safeHarborMultiplier = agi > 150000 ? 1.10 : 1.00;
  const safeHarbor100 = Math.round(lastYearTaxApprox * safeHarborMultiplier);
  const safeHarbor90 = Math.round(totalTax * 0.90);
  const safeHarborAnnual = Math.min(safeHarbor100, safeHarbor90);
  const safeHarborQuarterly = Math.round(Math.max(0, safeHarborAnnual - estW2Withhold) / 4);

  // 2026 IRS 季度截止日
  // 注意：Q1 和 Q2 已经过了（今天 2026-04-21），Q3/Q4 还没到
  const today = new Date('2026-04-21');
  const quarters = [
    { q: 'Q1', period: '1/1 – 3/31', due: '2026-04-15', label: '4/15', status: today > new Date('2026-04-15') ? 'past' : 'upcoming' },
    { q: 'Q2', period: '4/1 – 5/31',  due: '2026-06-15', label: '6/15', status: today > new Date('2026-06-15') ? 'past' : 'upcoming' },
    { q: 'Q3', period: '6/1 – 8/31',  due: '2026-09-15', label: '9/15', status: today > new Date('2026-09-15') ? 'past' : 'upcoming' },
    { q: 'Q4', period: '9/1 – 12/31', due: '2027-01-15', label: '1/15/27', status: today > new Date('2027-01-15') ? 'past' : 'upcoming' },
  ];
  // 第一个 upcoming 是下一个要付的季度
  const nextQuarterIdx = quarters.findIndex(q => q.status === 'upcoming');

  const [open, setOpen] = useState(false);
  const [showWhyModal, setShowWhyModal] = useState(false);

  // v70: 如果漏缴一年的 underpayment penalty 估算（按日息 8%，半年平均）
  const penaltyIfSkipAll = Math.round(needsQuarterly * 0.08 * 0.5);

  return (
    <div className="rounded-2xl mb-2 overflow-hidden" style={{
      background: C.card, border: `1px solid ${C.line}`,
    }}>
      {/* Header */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', padding: '12px 14px',
          background: 'transparent', border: 'none', cursor: 'pointer',
          display: 'grid', gridTemplateColumns: '1fr auto auto',
          alignItems: 'center', gap: 10, textAlign: 'left',
        }}
      >
        <div>
          <div style={{
            display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap',
          }}>
            <span style={{
              fontSize: 11, fontWeight: 700, color: C.ink,
              fontFamily: F_BODY, letterSpacing: '0.02em',
            }}>
              ◆ 分号精确预算
            </span>
            <span style={{
              fontSize: 9, color: C.info, fontFamily: F_MONO,
              letterSpacing: '0.05em', fontWeight: 700,
            }}>
              1040-ES
            </span>
            {/* v70: ? 按钮打开罚金解释弹窗 */}
            <span
              role="button"
              onClick={(e) => { e.stopPropagation(); setShowWhyModal(true); }}
              style={{
                fontSize: 10, width: 15, height: 15, borderRadius: '50%',
                background: C.cardAlt, border: `1px solid ${C.line}`,
                color: C.mute, fontFamily: F_BODY, fontWeight: 700,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                lineHeight: 1, cursor: 'pointer',
              }}
              aria-label="为什么要预缴"
            >?</span>
          </div>
          <div style={{
            fontSize: 10, color: C.mute, fontFamily: F_BODY, marginTop: 2,
          }}>
            {has1099 || hasNoW2 ? (
              <>触发：你有 <b style={{ color: C.ink2 }}>1099 / 自雇收入</b> · 每季应预缴</>
            ) : hasRental ? (
              <>触发：你有 <b style={{ color: C.ink2 }}>rental 收入</b> · 每季应预缴</>
            ) : (
              <>触发：投资收入 $2K+ · 每季应预缴</>
            )}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{
            fontFamily: F_NUM, fontSize: 18, fontWeight: 700,
            color: C.pay, lineHeight: 1, letterSpacing: '-0.02em',
          }}>
            ${fmt(perQuarter)}
          </div>
          <div style={{
            fontSize: 8, color: C.mute, fontFamily: F_MONO, marginTop: 2,
            letterSpacing: '0.04em',
          }}>
            / 季 × 4
          </div>
        </div>
        <span style={{
          fontSize: 12, color: C.mute,
          transform: open ? 'rotate(180deg)' : 'none',
          transition: 'transform 0.2s',
        }}>▾</span>
      </button>

      {open && (
        <div style={{
          padding: '2px 14px 14px',
          borderTop: `1px solid ${C.lineLite}`,
          background: C.cardAlt,
        }}>
          {/* 4 季表格 */}
          <div style={{ marginTop: 12, marginBottom: 10 }}>
            <div style={{
              fontSize: 9, color: C.mute, fontFamily: F_BODY,
              fontWeight: 600, letterSpacing: '0.08em',
              textTransform: 'uppercase', marginBottom: 6,
            }}>
              2026 税年 · 4 季截止日
            </div>
            <div style={{
              border: `1px solid ${C.line}`, borderRadius: 6, overflow: 'hidden',
              background: C.card,
            }}>
              {/* 表头 */}
              <div style={{
                display: 'grid', gridTemplateColumns: '40px 1fr 70px 90px',
                padding: '5px 8px', background: C.ink, color: '#FFF',
                fontFamily: F_MONO, fontSize: 8, fontWeight: 700,
                letterSpacing: '0.1em',
              }}>
                <span>Q</span>
                <span>覆盖期</span>
                <span style={{ textAlign: 'right' }}>截止</span>
                <span style={{ textAlign: 'right' }}>应缴</span>
              </div>
              {quarters.map((q, idx) => {
                const isNext = idx === nextQuarterIdx;
                const isPast = q.status === 'past';
                return (
                  <div
                    key={q.q}
                    style={{
                      display: 'grid', gridTemplateColumns: '40px 1fr 70px 90px',
                      padding: '6px 8px', alignItems: 'center',
                      borderTop: idx > 0 ? `1px solid ${C.lineLite}` : 'none',
                      background: isNext ? `${C.pay}10` : isPast ? `${C.muteLite}08` : 'transparent',
                      opacity: isPast ? 0.55 : 1,
                      position: 'relative',
                    }}
                  >
                    {isNext && (
                      <div style={{
                        position: 'absolute', left: 0, top: 0, bottom: 0,
                        width: 3, background: C.pay,
                      }} />
                    )}
                    <span style={{
                      fontSize: 11, fontFamily: F_NUM, fontWeight: 700,
                      color: isPast ? C.muteLite : (isNext ? C.pay : C.ink),
                    }}>{q.q}</span>
                    <span style={{
                      fontSize: 10, fontFamily: F_MONO, color: C.ink2,
                    }}>{q.period}</span>
                    <span style={{
                      fontSize: 10, fontFamily: F_MONO,
                      color: isPast ? C.muteLite : (isNext ? C.pay : C.ink),
                      fontWeight: isNext ? 700 : 500,
                      textAlign: 'right',
                    }}>
                      {isPast && <span style={{ marginRight: 3 }}>✗</span>}
                      {isNext && <span style={{ marginRight: 3 }}>→</span>}
                      {q.label}
                    </span>
                    <span style={{
                      fontSize: 12, fontFamily: F_NUM, fontWeight: 700,
                      color: isPast ? C.muteLite : (isNext ? C.pay : C.ink),
                      textAlign: 'right', letterSpacing: '-0.02em',
                    }}>${fmt(perQuarter)}</span>
                  </div>
                );
              })}
              {/* 合计 */}
              <div style={{
                display: 'grid', gridTemplateColumns: '40px 1fr 70px 90px',
                padding: '6px 8px', alignItems: 'center',
                borderTop: `2px solid ${C.ink}`, background: `${C.save}10`,
              }}>
                <span />
                <span style={{
                  fontSize: 10, fontFamily: F_BODY, fontWeight: 700, color: C.ink,
                }}>全年预缴合计</span>
                <span />
                <span style={{
                  fontSize: 14, fontFamily: F_NUM, fontWeight: 800,
                  color: C.save, textAlign: 'right', letterSpacing: '-0.02em',
                }}>${fmt(perQuarter * 4)}</span>
              </div>
            </div>
          </div>

          {/* Safe Harbor 方案对比 */}
          <div style={{ marginBottom: 10 }}>
            <div style={{
              fontSize: 9, color: C.mute, fontFamily: F_BODY,
              fontWeight: 600, letterSpacing: '0.08em',
              textTransform: 'uppercase', marginBottom: 6,
            }}>
              Safe Harbor · 两种选法
            </div>
            <div style={{ display: 'grid', gap: 6 }}>
              {/* 方案 A */}
              <div style={{
                padding: 10, borderRadius: 6,
                background: C.card, border: `1px solid ${C.line}`,
              }}>
                <div style={{
                  display: 'flex', alignItems: 'baseline',
                  justifyContent: 'space-between', marginBottom: 2,
                }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, color: C.ink, fontFamily: F_BODY,
                  }}>A · 今年实际税 × 90%</span>
                  <span style={{
                    fontFamily: F_NUM, fontSize: 12, fontWeight: 700, color: C.ink,
                  }}>${fmt(safeHarbor90)}</span>
                </div>
                <div style={{
                  fontSize: 9, color: C.mute, fontFamily: F_BODY, lineHeight: 1.4,
                }}>
                  基于今年预估税负 ${fmt(totalTax)} × 90%
                </div>
              </div>
              {/* 方案 B */}
              <div style={{
                padding: 10, borderRadius: 6,
                background: C.card, border: `1px solid ${C.line}`,
              }}>
                <div style={{
                  display: 'flex', alignItems: 'baseline',
                  justifyContent: 'space-between', marginBottom: 2,
                }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, color: C.ink, fontFamily: F_BODY,
                  }}>
                    B · 去年税 × {Math.round(safeHarborMultiplier * 100)}%
                  </span>
                  <span style={{
                    fontFamily: F_NUM, fontSize: 12, fontWeight: 700, color: C.ink,
                  }}>${fmt(safeHarbor100)}</span>
                </div>
                <div style={{
                  fontSize: 9, color: C.mute, fontFamily: F_BODY, lineHeight: 1.4,
                }}>
                  基于去年税负估算 ${fmt(lastYearTaxApprox)} × {Math.round(safeHarborMultiplier * 100)}%
                  {agi > 150000 && ' · AGI > $150K 要 110%'}
                </div>
              </div>
              {/* 推荐 */}
              <div style={{
                padding: 10, borderRadius: 6,
                background: `${C.save}15`, border: `1px solid ${C.save}`,
              }}>
                <div style={{
                  display: 'flex', alignItems: 'baseline',
                  justifyContent: 'space-between', marginBottom: 2,
                }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, color: C.save, fontFamily: F_BODY,
                  }}>✓ 推荐 · 取较小者</span>
                  <span style={{
                    fontFamily: F_NUM, fontSize: 13, fontWeight: 800, color: C.save,
                  }}>${fmt(safeHarborAnnual)}</span>
                </div>
                <div style={{
                  fontSize: 9, color: C.ink2, fontFamily: F_BODY, lineHeight: 1.4,
                }}>
                  按此缴足则无 underpayment penalty。减去 W2 预扣 ${fmt(estW2Withhold)}（估），分 4 季每季 ${fmt(safeHarborQuarterly)}
                </div>
              </div>
            </div>
          </div>

          {/* 警告 · 未缴罚金 */}
          <div style={{
            padding: 10, borderRadius: 6, marginBottom: 10,
            background: C.warnBg, border: `1px solid #E6C97A`,
            display: 'flex', gap: 8,
          }}>
            <span style={{
              fontSize: 13, color: C.warn, fontFamily: F_NUM, fontWeight: 700,
              lineHeight: 1, flexShrink: 0,
            }}>†</span>
            <div style={{
              fontSize: 10, color: C.warn, fontFamily: F_BODY, lineHeight: 1.55,
            }}>
              漏缴或少缴任一季 → Form 2210 罚款（按日息 ~8%/年）。可用年底一次性 Withholding 补救（视同全年均匀），但 1040-ES 不行。
            </div>
          </div>

          {/* 如何缴 */}
          <div>
            <div style={{
              fontSize: 9, color: C.mute, fontFamily: F_BODY,
              fontWeight: 600, letterSpacing: '0.08em',
              textTransform: 'uppercase', marginBottom: 6,
            }}>
              怎么缴
            </div>
            <ol style={{
              margin: 0, paddingLeft: 16,
              fontSize: 11, color: C.ink2, fontFamily: F_BODY, lineHeight: 1.7,
            }}>
              <li><b>IRS Direct Pay</b> · <span style={{ fontFamily: F_MONO, fontSize: 10 }}>irs.gov/directpay</span> · 银行账户免费 · 选 "Estimated Tax" + "1040-ES"</li>
              <li><b>EFTPS</b> · 需预先注册 · 长期最稳</li>
              <li><b>信用卡</b> · 约 1.8% 手续费，换 2%+ rewards 可能正收益</li>
              <li>州一级预缴单独交给州税局(NY IT-2105 · NJ NJ-1040-ES · CA Form 540-ES)</li>
            </ol>
          </div>
        </div>
      )}
      {/* v70: 为什么要预缴 · 罚金解释弹窗 */}
      {showWhyModal && (
        <div
          onClick={() => setShowWhyModal(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(13,13,13,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: C.card, borderRadius: 12,
              border: `1px solid ${C.line}`,
              maxWidth: 380, width: '100%',
              maxHeight: '85vh', overflowY: 'auto',
              padding: '16px 18px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
              <div>
                <div style={{
                  fontSize: 9, color: C.mute, fontFamily: F_MONO,
                  letterSpacing: '0.08em', fontWeight: 700, marginBottom: 2,
                }}>为什么要预缴</div>
                <div style={{
                  fontSize: 15, fontWeight: 700, color: C.ink,
                  fontFamily: F_BODY,
                }}>自雇 / 1099 的隐形罚款</div>
              </div>
              <button
                onClick={() => setShowWhyModal(false)}
                style={{
                  background: 'transparent', border: 'none', color: C.mute,
                  fontSize: 18, cursor: 'pointer', padding: 0,
                }}
              >×</button>
            </div>

            <div style={{
              padding: '10px 12px', borderRadius: 8,
              background: C.payBg, border: `1px solid ${C.pay}40`,
              marginBottom: 12,
            }}>
              <div style={{ fontSize: 10, color: C.pay, fontFamily: F_MONO, letterSpacing: '0.05em', fontWeight: 600, marginBottom: 2 }}>
                你的情况 · 全年漏缴预估罚款
              </div>
              <div style={{
                fontFamily: F_NUM, fontSize: 24, fontWeight: 800,
                color: C.pay, letterSpacing: '-0.02em',
              }}>
                ~${fmt(penaltyIfSkipAll)}
              </div>
              <div style={{ fontSize: 10, color: C.ink2, fontFamily: F_BODY, marginTop: 4, lineHeight: 1.45 }}>
                按日息 8%/年（2025 IRS 利率）· 平均半年持有 · 欠 ${fmt(needsQuarterly)} × 8% × 0.5
              </div>
            </div>

            <div style={{ fontSize: 11, color: C.ink2, fontFamily: F_BODY, lineHeight: 1.65 }}>
              <p style={{ marginBottom: 8 }}>
                <b>W2 员工</b>每个月工资已经在代扣税（paycheck 上的 Federal/State Withholding）。所以年底不欠钱 or 退税。
              </p>
              <p style={{ marginBottom: 8 }}>
                <b>1099 / 自雇 / Uber / Etsy / Twitch</b> 每月拿到的是<b>全额毛收入</b>，IRS 一分钱都没收到。IRS 规定必须按季度主动预缴，不然年底除了补税还要被罚 underpayment penalty。
              </p>
              <p style={{ marginBottom: 8, padding: '6px 10px', background: C.warnBg, borderRadius: 6, color: C.warn }}>
                † <b>很多 Uber / 1099 自由职业者第一年就踩坑</b>：拿 $50K 全部花掉，4 月报税才发现欠 $12K + 罚款 $500。
              </p>
              <div style={{
                fontSize: 10, fontFamily: F_MONO, fontWeight: 700, color: C.mute,
                letterSpacing: '0.08em', marginTop: 12, marginBottom: 6,
              }}>SAFE HARBOR · 下列任一缴够就免罚</div>
              <ul style={{ paddingLeft: 16, marginBottom: 8 }}>
                <li><b>A 方案</b>：全年预缴 ≥ 今年实际税 × <b>90%</b></li>
                <li><b>B 方案</b>：全年预缴 ≥ 去年税 × <b>100%</b>（AGI &gt; $150K 要 110%）</li>
              </ul>
              <p style={{ marginBottom: 8, fontSize: 10, color: C.mute }}>
                每季 4/15 · 6/15 · 9/15 · 次年 1/15 各交一次 Form 1040-ES。
              </p>
              <p style={{ fontSize: 10, color: C.save, background: C.saveBg, padding: '6px 10px', borderRadius: 6 }}>
                ✓ 应急策略：年底让配偶或你自己的 W2 多预扣一把（W-4 Step 4c 填个大数）也能补救，因为 Withholding 视为全年均匀。但 1040-ES 本身不能追溯。
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ActionTimeline = ({ opps, inputs, calc }) => {
  const [open, setOpen] = useState(true);  // v70: 默认展开
  const actionable = opps.filter(o => o.type !== 'warning' && o.saving > 0);
  const totalIfAll = actionable.reduce((s, o) => s + (o.saving || 0), 0);
  const has1099 = inputs.inc1099 > 0;
  // v106: CA 报税截止 4/30（自雇 6/15）· RRSP 截止是 3/1（60 天后）
  const isCA = calc?._country === 'CA';

  const stations = [
    {
      id: 'yearEnd', roman: 'I.',
      title: '年末前', sublabel: '12/31',
      desc: '时间最紧 · 错过等一年',
      color: C.pay,
      // v106: CA 加 RRSP 3/1 截止 · 加拿大无 Q4 1/15 预缴（T1 Instalments 另计）
      ticks: isCA
        ? (has1099 ? ['12/31 税年结束', '3/1 RRSP 截止', '3/15 T1 Q1 Inst.'] : ['12/31 税年结束', '3/1 RRSP 截止'])
        : (has1099 ? ['12/31 税年结束', '1/15 Q4 预缴'] : ['12/31 税年结束']),
      items: actionable.filter(o => classifyByDeadline(o.urgency) === 'yearEnd'),
    },
    {
      id: 'taxDay', roman: 'II.',
      title: '报税前', sublabel: isCA ? '4/30' : '4/15',
      desc: '报税季最后补救期',
      color: C.warn,
      ticks: isCA
        ? ['4/30 T1 报税截止', '6/15 自雇延期']
        : ['4/15 报税截止', '10/15 延期最终'],
      items: actionable.filter(o => classifyByDeadline(o.urgency) === 'taxDay'),
    },
    {
      id: 'ongoing', roman: 'III.',
      title: '全年', sublabel: '任何时间',
      desc: '登记一次长期生效',
      color: C.info,
      // 1099 季度预缴 Q2/Q3 归这里（在一年中间）· CA 用 T1 Instalments 日期
      ticks: isCA
        ? (has1099 ? ['6/15 Q2 Inst.', '9/15 Q3 Inst.'] : [])
        : (has1099 ? ['6/15 Q2 预缴', '9/15 Q3 预缴'] : []),
      items: actionable.filter(o => classifyByDeadline(o.urgency) === 'ongoing'),
    },
    {
      id: 'auto', roman: '✓',
      title: '自动', sublabel: '报税表上',
      desc: '不用单独行动',
      color: C.save,
      ticks: [],
      items: actionable.filter(o => classifyByDeadline(o.urgency) === 'auto'),
    },
  ].filter(s => s.items.length > 0);

  if (stations.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl mb-2 overflow-hidden" style={{ background: C.card, border: `1px solid ${C.line}` }}>
      {/* Header · v53 可点击折叠 */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', padding: '12px 14px',
          background: 'transparent', border: 'none', cursor: 'pointer',
          display: 'grid', gridTemplateColumns: '1fr auto auto',
          alignItems: 'center', gap: 10, textAlign: 'left',
          borderBottom: open ? `1px solid ${C.lineLite}` : 'none',
        }}
      >
        <div>
          <div style={{
            fontSize: 11, fontWeight: 700, color: C.ink,
            fontFamily: F_BODY, letterSpacing: '0.02em',
          }}>
            ◆ 行动时间线
            <span style={{ color: C.mute, fontSize: 9, fontWeight: 400, marginLeft: 6 }}>
              · {stations.length} 段 · {actionable.length} 招
            </span>
          </div>
          {/* v70: 取代原 stations sublabel → 税年状态（融合原"税务日历"卡） */}
          <div style={{
            fontSize: 9, fontFamily: F_MONO, marginTop: 3,
            letterSpacing: '0.04em',
          }}>
            <span style={{ color: C.pay }}>✗ 2025 已截止</span>
            <span style={{ color: C.muteLite, margin: '0 4px' }}>·</span>
            <span style={{ color: C.save }}>✓ 2026 进行中</span>
            <span style={{ color: C.muteLite, margin: '0 4px' }}>·</span>
            <span style={{ color: C.info }}>下一截止 12/31/26</span>
          </div>
        </div>
        {totalIfAll > 0 && (
          <div style={{ textAlign: 'right' }}>
            <div style={{
              fontFamily: F_NUM, fontSize: 14, fontWeight: 700,
              color: C.save, lineHeight: 1, letterSpacing: '-0.02em',
            }}>
              −${fmt(totalIfAll)}
            </div>
            <div style={{
              fontSize: 8, color: C.mute, fontFamily: F_MONO,
              marginTop: 2, letterSpacing: '0.04em',
            }}>
              全部执行
            </div>
          </div>
        )}
        <span style={{
          fontSize: 12, color: C.mute,
          transform: open ? 'rotate(180deg)' : 'none',
          transition: 'transform 0.2s',
        }}>▾</span>
      </button>

      {open && (
      <>
      {/* 横向时间线 · v70 更紧凑 */}
      <div style={{ padding: '10px 12px 10px' }}>
        {/* 贯穿线 · 独立一轨 · 4 段等分，线色按段渐变 */}
        <div style={{
          position: 'relative',
          height: 16,
          marginBottom: 3,
        }}>
          {/* 背景贯穿线 */}
          <div style={{
            position: 'absolute',
            top: 9,
            left: `${100 / stations.length / 2}%`,
            right: `${100 / stations.length / 2}%`,
            height: 2,
            background: `linear-gradient(to right, ${stations.map(s => s.color).join(', ')})`,
            opacity: 0.25,
            borderRadius: 1,
          }} />
          {/* 圆点 · 均匀分布在各 cell 中心 */}
          <div style={{
            position: 'absolute', inset: 0,
            display: 'grid',
            gridTemplateColumns: `repeat(${stations.length}, 1fr)`,
          }}>
            {stations.map((s) => (
              <div key={s.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{
                  width: 16, height: 16, borderRadius: '50%',
                  background: s.color, border: `2px solid ${C.card}`,
                  boxShadow: `0 0 0 2px ${s.color}30`,
                }} />
              </div>
            ))}
          </div>
        </div>

        {/* 4 列：标题 + 描述 + ticks + items */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${stations.length}, 1fr)`,
          gap: 6,
          alignItems: 'stretch',
        }}>
          {stations.map((s) => (
            <div key={s.id} style={{ display: 'flex', flexDirection: 'column' }}>
              {/* 标题块 · 居中对齐圆点 */}
              <div style={{ marginBottom: 5, textAlign: 'center' }}>
                <div style={{
                  display: 'flex', alignItems: 'baseline', gap: 3, justifyContent: 'center', flexWrap: 'wrap',
                }}>
                  <span style={{
                    fontFamily: F_NUM, fontSize: 12, fontWeight: 700,
                    color: s.color, letterSpacing: '-0.01em', lineHeight: 1,
                  }}>{s.roman}</span>
                  <span style={{
                    fontSize: 10, fontFamily: F_BODY, fontWeight: 700,
                    color: C.ink, lineHeight: 1.2,
                  }}>{s.title}</span>
                </div>
                <div style={{
                  fontSize: 8, fontFamily: F_MONO, fontWeight: 600,
                  color: s.color, marginTop: 1,
                }}>
                  {s.sublabel}
                </div>
              </div>

              {/* IRS 关键日期 tick · 小 chip */}
              {s.ticks.length > 0 && (
                <div style={{
                  display: 'flex', flexDirection: 'column', gap: 2,
                  marginBottom: 6, alignItems: 'stretch',
                }}>
                  {s.ticks.map((t, i) => (
                    <div key={i} style={{
                      fontSize: 8, fontFamily: F_MONO,
                      padding: '2px 3px', borderRadius: 3,
                      background: C.card, border: `1px solid ${C.lineLite}`,
                      color: C.mute,
                      textAlign: 'center',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {t}
                    </div>
                  ))}
                </div>
              )}

              {/* 事项列表 · 紧凑 */}
              <div>
                {s.items.map((o, i) => (
                  <div key={o.id} style={{
                    padding: '4px 6px', borderRadius: 5,
                    background: C.cardAlt, border: `1px solid ${C.lineLite}`,
                    marginBottom: 3,
                  }}>
                    <div style={{
                      fontSize: 10, fontFamily: F_BODY, color: C.ink2, fontWeight: 600,
                      lineHeight: 1.25, marginBottom: 1,
                      overflow: 'hidden', textOverflow: 'ellipsis',
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                    }}>
                      {o.title}
                    </div>
                    {o.saving > 0 && (
                      <div style={{
                        fontFamily: F_NUM, fontSize: 11, fontWeight: 700,
                        color: C.save, letterSpacing: '-0.01em',
                      }}>
                        −${fmt(o.saving)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      </>
      )}
    </div>
  );
};
//  TaxWorksheet · 模仿 IRS 税表的完整计算脉络
// ═══════════════════════════════════════════════════════════

const WORK_BG = '#FDFBF4';       // 税表纸张色（淡米黄）
const WORK_INK = '#1A1A1A';      // 税表黑
const WORK_MUTE = '#6B6460';     // 灰棕字
const WORK_RULE = '#C9C2B1';     // 表格线色（米灰）
const WORK_ACCENT = '#8B3A2F';   // 红印章色（最终数字）

// 税率表弹窗（递进税率分段展示）
const BracketModal = ({ open, onClose, title, brackets, taxableIncome, computedTax, note }) => {
  if (!open) return null;

  // 分段计算展示
  let cumulative = 0;
  let remaining = taxableIncome;
  const rows = [];
  let prevThreshold = 0;

  for (const [threshold, rate] of brackets) {
    const bracketSize = threshold === Infinity
      ? (remaining > 0 ? remaining : 0)
      : threshold - prevThreshold;
    const amountInBracket = Math.min(remaining, bracketSize);
    const taxInBracket = amountInBracket * rate;
    const isActive = amountInBracket > 0;
    rows.push({
      prevThreshold,
      threshold,
      rate,
      bracketSize,
      amountInBracket: Math.max(0, amountInBracket),
      taxInBracket: Math.max(0, taxInBracket),
      isActive,
    });
    cumulative += taxInBracket;
    remaining -= amountInBracket;
    prevThreshold = threshold;
    if (remaining <= 0) break;
  }

  const fmtDollar = (n) => `$${Math.round(n).toLocaleString()}`;
  const fmtRange = (from, to) => {
    if (to === Infinity) return `${fmtDollar(from)}+`;
    return `${fmtDollar(from)} – ${fmtDollar(to)}`;
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(13, 13, 13, 0.65)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        padding: 0,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: WORK_BG,
          width: '100%', maxWidth: 440,
          maxHeight: '88vh',
          borderTopLeftRadius: 14, borderTopRightRadius: 14,
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 -4px 20px rgba(0,0,0,0.12)',
        }}
      >
        {/* 顶部 */}
        <div style={{
          padding: '14px 16px',
          borderBottom: `2px solid ${WORK_INK}`,
          display: 'flex', alignItems: 'center', gap: 10,
          background: WORK_BG,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{
              fontFamily: 'Fraunces, serif', fontSize: 14, fontWeight: 700,
              color: WORK_INK,
            }}>
              {title}
            </div>
            <div style={{
              fontSize: 9, color: WORK_MUTE,
              fontFamily: 'JetBrains Mono, ui-monospace, monospace',
              letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: 2,
            }}>
              Tax Year 2025 · 递进税率 · 分段累加
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              fontSize: 20, color: WORK_MUTE, padding: 0, lineHeight: 1,
              width: 26, height: 26,
            }}
            aria-label="关闭"
          >×</button>
        </div>

        {/* 内容 */}
        <div style={{
          flex: 1, overflow: 'auto',
          padding: '12px 14px 16px',
          fontFamily: 'JetBrains Mono, ui-monospace, monospace',
        }}>
          {/* 税基信息 */}
          <div style={{
            marginBottom: 12,
            padding: '8px 10px',
            background: WORK_BG,
            border: `1px solid ${WORK_RULE}`,
            borderRadius: 4,
            fontSize: 10, color: WORK_INK,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: WORK_MUTE }}>你的应税收入</span>
              <span style={{ fontWeight: 700 }}>{fmtDollar(taxableIncome)}</span>
            </div>
          </div>

          {/* 表头 */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1.3fr 0.6fr 0.9fr 0.9fr',
            gap: 6,
            padding: '6px 8px',
            background: WORK_INK, color: WORK_BG,
            fontSize: 9, fontWeight: 700,
            letterSpacing: '0.05em', textTransform: 'uppercase',
            borderRadius: '4px 4px 0 0',
          }}>
            <span>档位范围</span>
            <span style={{ textAlign: 'right' }}>税率</span>
            <span style={{ textAlign: 'right' }}>落入金额</span>
            <span style={{ textAlign: 'right' }}>税额</span>
          </div>

          {/* 分段行 */}
          {rows.map((r, idx) => (
            <div
              key={idx}
              style={{
                display: 'grid',
                gridTemplateColumns: '1.3fr 0.6fr 0.9fr 0.9fr',
                gap: 6,
                padding: '7px 8px',
                fontSize: 10,
                color: r.isActive ? WORK_INK : WORK_MUTE,
                background: r.isActive ? '#FFFFFF' : WORK_BG,
                borderLeft: `1px solid ${WORK_RULE}`,
                borderRight: `1px solid ${WORK_RULE}`,
                borderBottom: `1px solid ${WORK_RULE}`,
                fontWeight: r.isActive ? 600 : 400,
                opacity: r.isActive ? 1 : 0.5,
              }}
            >
              <span style={{ fontSize: 9 }}>
                {fmtRange(r.prevThreshold, r.threshold)}
              </span>
              <span style={{ textAlign: 'right', color: r.isActive ? WORK_ACCENT : WORK_MUTE, fontWeight: 700 }}>
                {(r.rate * 100).toFixed(r.rate < 0.01 ? 3 : 2).replace(/\.?0+$/, '')}%
              </span>
              <span style={{ textAlign: 'right' }}>
                {r.isActive ? fmtDollar(r.amountInBracket) : '—'}
              </span>
              <span style={{ textAlign: 'right', fontWeight: r.isActive ? 700 : 400 }}>
                {r.isActive ? fmtDollar(r.taxInBracket) : '—'}
              </span>
            </div>
          ))}

          {/* 合计 */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1.3fr 0.6fr 0.9fr 0.9fr',
            gap: 6,
            padding: '8px 8px',
            background: WORK_BG,
            borderLeft: `1px solid ${WORK_INK}`,
            borderRight: `1px solid ${WORK_INK}`,
            borderTop: `2px solid ${WORK_INK}`,
            borderBottom: `3px double ${WORK_INK}`,
            fontSize: 11, fontWeight: 700, color: WORK_ACCENT,
            borderRadius: '0 0 4px 4px',
          }}>
            <span style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>合计</span>
            <span></span>
            <span></span>
            <span style={{ textAlign: 'right' }}>{fmtDollar(computedTax)}</span>
          </div>

          {/* 注释 */}
          {note && (
            <div style={{
              marginTop: 10,
              padding: '6px 8px',
              background: `${WORK_ACCENT}0F`,
              border: `1px solid ${WORK_ACCENT}33`,
              borderRadius: 4,
              fontSize: 9, color: WORK_INK, lineHeight: 1.5,
            }}>
              ※ {note}
            </div>
          )}

          <div style={{
            marginTop: 12, fontSize: 9, color: WORK_MUTE, lineHeight: 1.6,
          }}>
            <div>※ <b>递进税率</b>：不是整个收入乘以最高税率，而是每段分别适用该段的税率，最后累加。</div>
            <div style={{ marginTop: 4 }}>※ <b>边际税率</b> = 你落在的最高那一档的税率（多赚 $1 要交的税率）。</div>
            <div style={{ marginTop: 4 }}>※ <b>有效税率</b> = 总税 ÷ 总收入（平均税率）。</div>
          </div>
        </div>
      </div>
    </div>
  );
};


// 单行项目
const WLine = ({ label, value, indent = 0, muted = false, bold = false, sign = null, suffix = null }) => (
  <div style={{
    display: 'flex', alignItems: 'baseline',
    paddingLeft: indent * 14,
    fontFamily: 'JetBrains Mono, ui-monospace, monospace',
    fontSize: 10, lineHeight: 1.55,
    color: muted ? WORK_MUTE : WORK_INK,
    fontWeight: bold ? 700 : 400,
  }}>
    <span style={{ flex: 1, minWidth: 0 }}>{label}</span>
    <span style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
      {sign && <span style={{ color: sign === '−' ? WORK_ACCENT : WORK_INK, marginRight: 2 }}>{sign}</span>}
      {typeof value === 'number' ? `$${Math.round(value).toLocaleString()}` : value}
      {suffix && <span style={{ color: WORK_MUTE, marginLeft: 4, fontSize: 9 }}>{suffix}</span>}
    </span>
  </div>
);

// 小计（单下划线）
const WSubtotal = ({ label, value, bold = true }) => (
  <>
    <div style={{
      borderTop: `1px solid ${WORK_RULE}`,
      margin: '2px 0',
    }} />
    <WLine label={label} value={value} bold={bold} />
  </>
);

// 最终结果（双下划线）
const WTotal = ({ label, value, accent = true }) => (
  <div style={{
    marginTop: 4,
    paddingTop: 4,
    borderTop: `1px solid ${WORK_INK}`,
    borderBottom: `3px double ${WORK_INK}`,
    paddingBottom: 4,
  }}>
    <div style={{
      display: 'flex', alignItems: 'baseline',
      fontFamily: 'JetBrains Mono, ui-monospace, monospace',
      fontSize: 11,
      fontWeight: 700,
      color: accent ? WORK_ACCENT : WORK_INK,
    }}>
      <span style={{ flex: 1, minWidth: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      <span style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
        ${Math.round(value).toLocaleString()}
      </span>
    </div>
  </div>
);

// 小节标题
const WSection = ({ num, title, subtitle, formRef }) => (
  <div style={{
    marginTop: 14, marginBottom: 4,
    display: 'flex', alignItems: 'baseline', gap: 6,
  }}>
    <span style={{
      fontFamily: 'JetBrains Mono, ui-monospace, monospace',
      fontSize: 12, fontWeight: 700, color: WORK_ACCENT,
    }}>§{num}</span>
    <span style={{
      fontFamily: 'Fraunces, serif',
      fontSize: 12, fontWeight: 700, color: WORK_INK,
    }}>{title}</span>
    {subtitle && (
      <span style={{
        fontSize: 9, color: WORK_MUTE, fontFamily: 'JetBrains Mono, ui-monospace, monospace',
      }}>· {subtitle}</span>
    )}
    {formRef && (
      <span style={{
        marginLeft: 'auto',
        fontSize: 9, color: WORK_MUTE, fontFamily: 'JetBrains Mono, ui-monospace, monospace',
        fontStyle: 'italic',
      }}>{formRef}</span>
    )}
  </div>
);

// 注释（灰色斜体）
const WNote = ({ children }) => (
  <div style={{
    fontSize: 9, color: WORK_MUTE,
    fontFamily: 'JetBrains Mono, ui-monospace, monospace',
    fontStyle: 'italic',
    marginTop: 2, paddingLeft: 14,
    lineHeight: 1.5,
  }}>
    ※ {children}
  </div>
);

// WorksheetBody · 一个完整的 1040 + Schedules 税表渲染块
// 可接受任何 (inputs, calc) 对，方便渲染不同场景
// ═══════════════════════════════════════════════════════════
//  FormMockup · IRS 表格仿真模态
// ═══════════════════════════════════════════════════════════

// IRS form 视觉 token
const IRS_BG = '#FDFBF4';            // 米黄纸色
const IRS_INK = '#000000';           // 真实表格用纯黑
const IRS_BORDER = '#333333';        // 表格细线
const IRS_MUTE = '#666666';
const IRS_GRAY_BOX = '#E8E5DC';      // 填入框灰色
const IRS_FIELD_BG = '#FFFFFF';      // 白色填入区
const F_FORM = 'Helvetica, Arial, sans-serif';  // IRS 官方用这个
const F_FORM_SERIF = 'Times, "Times New Roman", serif';

// 一个"表格行"：左文字 | 右数字，有下划线填入感
const IRSRow = ({ lineNum, label, cn, value, sub, indent = 0, total = false, bold = false, negative = false, explainId }) => {
  const ctx = React.useContext(FormContext);
  const key = explainId || (ctx?.formId && lineNum ? `${ctx.formId}_${String(lineNum).replace(/\s/g, '')}` : null);
  const hasExplain = !!(key && EXPLAIN_REGISTRY[key]);
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `30px 1fr ${hasExplain ? '18px ' : ''}110px`,
      alignItems: 'baseline',
      padding: '3px 4px',
      paddingLeft: 4 + indent * 14,
      borderBottom: `1px solid ${total ? IRS_INK : IRS_BORDER}44`,
      fontFamily: F_FORM,
      fontSize: 10, lineHeight: 1.4,
      background: total ? `${IRS_GRAY_BOX}66` : 'transparent',
      columnGap: 4,
    }}>
      <span style={{
        fontSize: 9, color: IRS_MUTE, fontWeight: 600,
        fontFamily: F_FORM,
      }}>{lineNum}</span>
      <span style={{
        color: IRS_INK, fontWeight: bold ? 700 : 400,
      }}>
        {label}
        {sub && <span style={{ color: IRS_MUTE, fontSize: 9, marginLeft: 4 }}>· {sub}</span>}
        {cn && (
          <span style={{
            display: 'block',
            color: IRS_MUTE, fontSize: 9,
            fontFamily: F_BODY, marginTop: 1,
            lineHeight: 1.3,
          }}>{cn}</span>
        )}
      </span>
      {hasExplain && (
        <button
          onClick={(e) => { e.stopPropagation(); ctx.openExplain(key); }}
          style={{
            width: 16, height: 16, borderRadius: '50%',
            background: '#F0F0ED', border: `1px solid ${IRS_BORDER}66`,
            color: IRS_MUTE, cursor: 'pointer', padding: 0,
            fontFamily: F_FORM, fontSize: 9, fontWeight: 700,
            lineHeight: 1, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            alignSelf: 'center',
          }}
          aria-label="解释"
          title="解释这一行"
        >?</button>
      )}
      <span style={{
        textAlign: 'right', color: IRS_INK, fontWeight: bold || total ? 700 : 500,
        fontFamily: F_FORM,
        background: IRS_FIELD_BG,
        border: `1px solid ${IRS_BORDER}55`,
        padding: '1px 6px',
        borderRadius: 2,
        alignSelf: 'start',
      }}>
        {value !== '' && value !== null && value !== undefined
          ? (typeof value === 'number'
            ? (negative
              ? `(${Math.abs(Math.round(value)).toLocaleString()})`
              : Math.round(value).toLocaleString())
            : value)
          : <span style={{ color: IRS_MUTE }}>—</span>}
      </span>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
//  v51: IRS 表单行解释系统
//  FormContext 提供 formId + openExplain 给每一个 IRSRow
//  EXPLAIN_REGISTRY：约 80 条核心行解释，用户点 ⓘ 看答案
// ═══════════════════════════════════════════════════════════

const FormContext = React.createContext(null);

// v75: 全局术语词典 · Term 组件用 · 点 ? 弹窗看含义
const GLOSSARY = {
  NIIT: {
    full: 'Net Investment Income Tax',
    cn: '净投资收入税',
    desc: '高收入人的投资收入（利息/股息/资本利得/房租）额外 3.8% 的联邦税。MFJ AGI > $250K、Single > $200K 触发。属于 Medicare Surtax 资金来源。填 Form 8960。',
    cta: '常见误判：卖出主要住宅 $250K/$500K 豁免之外的利得也算。',
  },
  AMT: {
    full: 'Alternative Minimum Tax',
    cn: '最低替代税',
    desc: '并行算一遍税：把常规 deductions 加回去（SALT、ISO exercises、私营公司利息等），用 AMT 税率（26%/28%）比较，取大者。2025 豁免 MFJ $137K、Single $88.1K。OBBBA 2026 起 phase-out 从 25% 提到 50% · 高收入更易触 AMT。填 Form 6251。',
    cta: '常见触发：ISO 期权当年大量行权 · 高 SALT 地区（NY/CA/NJ）+ 中高收入。',
  },
  QBI: {
    full: 'Qualified Business Income',
    cn: '合格业务收入扣除',
    desc: '自雇 / S-Corp / LLC 的净利可扣 20%。应税所得 MFJ < $394K（Single $197K）全额有 · 超过部分 phase-out。SSTB（医生/律师/咨询/金融）完全 phase-out 更早。填 Form 8995。',
    cta: '触发条件严格：工资型的雇员 W2 收入不算。',
  },
  QSBS: {
    full: 'Qualified Small Business Stock · IRC §1202',
    cn: '合格小企业股票免税',
    desc: '持有合格 C-Corp（非 S-Corp/LLC）股票 ≥ 5 年，卖出利得最多 $10M 或 10× basis 联邦免税（最高 $10M/家公司）。适合 startup founder / 早期员工 exit。OBBBA 2025 后可能 3 年即可。',
    cta: 'HOT：Founder exit 最大神器之一。',
  },
  '1031': {
    full: 'IRC §1031 Like-Kind Exchange',
    cn: '同类置换 · 延税交换',
    desc: '卖投资房 45 天内书面指定 ≤3 个替换房、180 天内买下 · 用 QI（合格中介）过账，即可**永久延后** capital gain。只限投资房换投资房，自住不算。2017 后不适用动产。',
    cta: '房东家族最大税延工具。',
  },
  DAF: {
    full: 'Donor-Advised Fund',
    cn: '捐赠顾问基金',
    desc: '一次性大额捐款到 DAF 账户 · 立即全额扣税 · 但可分多年指定慈善机构。特别适合 bonus 年 / 套现年一次性"打包"捐款破 Standard Deduction。Fidelity/Vanguard/Schwab 都开 · 最低 $5K。',
    cta: '高收入年一次性破 SALT + 慈善 itemize 门槛。',
  },
  PTE: {
    full: 'Pass-Through Entity Tax',
    cn: '穿透实体税',
    desc: '绕开 SALT cap 的州级优化。你的 S-Corp/Partnership 在州层面直接缴州所得税 · 联邦 Sch C/E 全额扣除 · 个人 Form 1040 不再交 SALT。NY/NJ/CA 等 36 个州已开通。OBBBA 2025 SALT cap 提到 $40K（MAGI > $500K 开始 phase-out · > $600K 回 $10K）· 高收入仍需 PTE。',
    cta: '自雇年利 $200K+ 能省 $5K-$30K。',
  },
  SALT: {
    full: 'State And Local Tax',
    cn: '州 + 地方税扣除上限',
    desc: '2017 TCJA 给逐项扣除的州税+地产税加了 $10K/年上限。OBBBA 2025/7 签署后 · **2025-2029 临时提到 $40K**（MFS $20K）· MAGI > $500K MFJ / $250K MFS 起按 30% phase-out · > $600K / $300K 回 $10K 地板 · 2030 起回 $10K。2025/2026 报税年享受 $40K 窗口。',
    cta: '高税州 NY/NJ/CA + MAGI > $600K 仍需 PTE Tax 绕法。',
  },
  MAGI: {
    full: 'Modified Adjusted Gross Income',
    cn: '修正 AGI',
    desc: '在 AGI 基础上加回部分扣除（学贷利息 / 境外收入 FEIE / IRA 扣除等）得到的值。IRA / Roth / Premium Credit / NIIT / CTC phase-out 用 MAGI 判定而非 AGI。',
    cta: '每项 credit phase-out 的 MAGI 公式略有不同。',
  },
  FEIE: {
    full: 'Foreign Earned Income Exclusion',
    cn: '境外劳动收入豁免',
    desc: 'US 税务居民（含绿卡）在境外工作 330 天 / 年，可豁免最多 $130K/2025 境外工资。Form 2555 · 和 FTC（境外税抵免）择一或叠加。',
    cta: '回国工作第一年必用。',
  },
  FBAR: {
    full: 'Foreign Bank Account Report · FinCEN 114',
    cn: '境外账户报告',
    desc: '美国税务居民海外账户年中任一时点合计 > $10,000 必须报 FBAR。漏报罚款可达账户余额 50%（非故意 $10K/年）。和 Form 8938（FATCA）不同。',
    cta: '很多华人忘了申报国内 bank + 股票账户。',
  },
  FATCA: {
    full: 'Foreign Account Tax Compliance Act',
    cn: '海外账户合规',
    desc: '单独的 Form 8938 · 门槛比 FBAR 高（MFJ $100K 年中 / $150K 任一时点）· 税务报告 · 附在 Form 1040。',
  },
  REPS: {
    full: 'Real Estate Professional Status',
    cn: '房地产专业身份',
    desc: '年投入 RE 活动 ≥ 750 小时且 > 50% 工作时间在 RE，可把 rental loss 转 active 直接抵 W2 工资。对配偶双方之一即可。审计高风险，必须有时间表证据。',
    cta: 'Cost Seg + RE Pro 是房东主流省税组合。',
  },
  'Cost Seg': {
    full: 'Cost Segregation Study',
    cn: '成本分离研究',
    desc: '买投资房后 · 雇工程师拆分 purchase price 到不同折旧期（5/7/15 年 vs 27.5/39 年）· 加速折旧 · 前几年大量 paper loss。配合 Bonus Depreciation 第一年可扣 60-100%。',
    cta: '房价 $500K+ 才值得做（研究费 $3-5K）。',
  },
  'Mega Backdoor': {
    full: 'Mega Backdoor Roth',
    cn: '超级后门 Roth',
    desc: '雇主 401k 支持 After-tax contribution + In-service conversion 才可用。年供最多 $70K (2025) · 扣完 $23.5K pre-tax + match 后的空间用 after-tax 填满 · 立即 convert 成 Roth 401k。',
    cta: 'HENRY 最大神器 · 年省 $50K Roth 额度。',
  },
  'Backdoor Roth': {
    full: 'Backdoor Roth IRA',
    cn: '后门 Roth IRA',
    desc: 'MAGI 过 Roth IRA 收入上限（MFJ $246K / Single $165K）的人 · 先 non-deductible 供 Traditional IRA · 立即 convert 到 Roth。注意 Pro-Rata 规则（若已有 Traditional IRA 余额会被按比例算应税）。',
    cta: 'Form 8606 记 basis。',
  },
  HSA: {
    full: 'Health Savings Account',
    cn: '健康储蓄账户',
    desc: '三重免税：供款 deductible、增值免税、医疗开支取出免税。需 HDHP 保险才能开。2025 上限 $4,300/个人 / $8,550/家庭 · 55+ 加 $1K。最长寿的 "pseudo 退休账户"。',
    cta: '65 岁后取出非医疗用途按普通退休账户走。',
  },
  CTC: {
    full: 'Child Tax Credit',
    cn: '儿童税抵免',
    desc: '17 岁以下有 SSN 的合格孩子 · 每娃 $2,000 联邦抵免（$1,700 可退税）。MFJ AGI > $400K / Single > $200K 开始 phase-out（$50/$1K 收入）。',
  },
  'Safe Harbor': {
    full: 'Safe Harbor · Estimated Tax',
    cn: '预缴安全港',
    desc: '避免 underpayment penalty 的两种方法：A) 全年预缴 ≥ 今年实际税 × 90% · B) 全年预缴 ≥ 去年税 × 100%（AGI > $150K 要 110%）。选较小者。',
    cta: '1099 自雇必懂。',
  },
  'W-4': {
    full: 'Form W-4 · Employee Withholding Certificate',
    cn: '员工预扣证书',
    desc: '告诉雇主每发工资扣多少联邦税。Step 4c 可填 "extra withholding per paycheck" · 年底补救少预缴神器（Withholding 视为全年均匀）。',
  },
  CEMA: {
    full: 'Consolidation Extension Modification Agreement',
    cn: 'NY 房贷整合修改协议',
    desc: 'NY 专属 · refinance 时用 CEMA 避免重新缴整笔房贷 Mortgage Recording Tax（NYC 1.8%-2.8%）。只对新借部分缴税。长岛/Westchester refi 常见。',
    cta: '$500K 房贷 refi 能省 ~$10K。',
  },
  'Mansion Tax': {
    full: 'NY Mansion Tax',
    cn: 'NY 豪宅税',
    desc: '房价 ≥ $1M 买家缴。1%(基础) + NYC 额外 0.25-3.9% 累进。$1M → $5M $30K+ 的额外成本。',
  },
  ISO: {
    full: 'Incentive Stock Option',
    cn: '激励股票期权',
    desc: '员工期权 · 行权时差价（FMV − Strike）不计入常规所得，但计入 AMT 收入 · 持有 2 年从授予、1 年从行权起才享 LT Gain 税率。常触发巨额 AMT。',
    cta: 'IPO 前后最易踩坑。',
  },
  RSU: {
    full: 'Restricted Stock Unit',
    cn: '限制性股票单位',
    desc: 'Vest 那一刻按 FMV 全额算工资收入 · W2 Box 1 · 雇主按 22% 或 37% 代扣（常不够）· 卖出后另算资本利得/损失。',
    cta: 'vest 当年易低估税 → 补税 + 罚金。',
  },
  EITC: {
    full: 'Earned Income Tax Credit',
    cn: '低收入劳动所得抵免',
    desc: '低中收入工作者的可退税抵免。2025 MFJ 3 娃最高 $8,046。有严格 earned income、investment income、AGI 三重 phase-out。',
  },
  FSA: {
    full: 'Flexible Spending Account',
    cn: '弹性支出账户',
    desc: '雇主 pre-tax 账户：Health FSA $3,300/2025 · Dependent Care FSA $5,000/MFJ。当年不用完就作废（部分 plan 允许 $660 roll over）。和 HSA 不同不可投资。',
  },
  DCFSA: {
    full: 'Dependent Care FSA',
    cn: '托儿弹性账户',
    desc: '雇主 pre-tax 托儿费账户 · 上限 $5,000/MFJ（MFS $2,500）· 13 岁以下孩子 daycare / 暑期班 / 前后班。和 Dependent Care Credit 同一笔钱不能重复。',
  },
  REIT: {
    full: 'Real Estate Investment Trust',
    cn: '房地产投资信托',
    desc: '公众 REIT 的 Ordinary Dividends 享 QBI 20% 扣除 · 相当于 8% 顶边际税率。REIT ETF (VNQ, SCHH) 都可享。',
  },
  SEP: {
    full: 'SEP IRA',
    cn: '简化员工退休计划',
    desc: '自雇退休账户 · 供款最高净利 × 20%（sole prop）或工资 × 25% (S-Corp) · 2025 上限 $70K。设立最简单，适合一次性大项目。不可贷款。',
  },
  SIMPLE: {
    full: 'SIMPLE IRA',
    cn: '小企业简易退休账户',
    desc: '100 以下员工的小公司方案 · 员工 $16,500/2025 · 雇主必须 match 3% 或 nonelective 2%。比 401k 便宜但限额低。',
  },
  // ══════════════════════════════════════════
  // v101 加拿大术语（CA mode 下 Flag / Persona / Myth 引用）
  // ══════════════════════════════════════════
  BPA: {
    full: 'Basic Personal Amount',
    cn: '基本免税额',
    desc: '加拿大版"标扣" · 但是 **tax credit** 不是 deduction。2025 联邦 BPA $16,129（收入 ≤ $177,882 给满）· 逐步减到 $14,538（收入 ≥ $253,414）。credit 值 = BPA × 14.5%。每省也有自己的 BPA（ON $12,747 · AB $21,885 全国最高 · QC $18,056）。',
    cta: '联邦 + 省 BPA 加起来 · 安省 $100K 单身前 ~$29K 基本免税。',
  },
  RRSP: {
    full: 'Registered Retirement Savings Plan',
    cn: '注册退休储蓄计划',
    desc: '类似 US 401k + 传统 IRA · 供款税前扣除 · 增值免税 · 取出全额算 income。2025 上限 $32,490 或 18% × 上年收入（取低）· 用不掉 carry forward 永久。71 岁前必须转 RRIF 或年金。投资可选 ETF/股票/GIC/基金。',
    cta: 'HBP 可免税取 $60K 买首房 · 15 年还。',
  },
  TFSA: {
    full: 'Tax-Free Savings Account',
    cn: '免税储蓄账户',
    desc: '类似 US Roth IRA 但**没有收入限制**。2025 年限 $7,000 · 从 2009 起累计空间 $102K。供款后税（不扣）· 增值免税 · 取出免税。取出后下一年恢复 room。投资灵活（ETF / 股票 / GIC / 基金）。年轻人 / 低收入 / 临时工首选。',
    cta: '买美股要注意：美国股息 15% 预扣 · 放 RRSP 才免。',
  },
  FHSA: {
    full: 'First Home Savings Account',
    cn: '首次置业储蓄账户',
    desc: '2023 新账户 · RRSP + TFSA 合体。供款减 taxable income（像 RRSP 扣）· 买首房取出免税（像 TFSA）。2025 年限 $8,000 · 终生 $40,000。15 年未买房可转 RRSP。单人 FHSA $40K + HBP $60K = **$100K 免税首付空间**。夫妻合计最多 **$200K**。开户即有当年 $8K 额度 · 越早开越好。',
    cta: '重要：开户前一年不能是房主。',
  },
  HBP: {
    full: "Home Buyer's Plan",
    cn: 'RRSP 首房计划',
    desc: '首次置业可从 RRSP **免税取出 $60,000**（2024+ 从 $35K 上调）· 15 年分期还入 RRSP · 不还部分算 income。可叠加 FHSA · 单人最多 $100K · 夫妻 $200K 首付空间。条件：买前 4 年没 own 过房 · 90 天内要入住。',
    cta: '如果手头紧 · FHSA 比 HBP 更优 · 不用还。',
  },
  CCB: {
    full: 'Canada Child Benefit',
    cn: '牛奶金',
    desc: '免税 · 按 family net income 发：6 岁以下 **$7,997/娃/年** · 6-17 岁 $6,748/娃/年（2024-25 年度）。Net income > $36,502 起 phase-out · > $79,087 进第二档。高收入家庭基本拿不到。RRSP / FHSA 供款能压低 net income → CCB 多拿。',
    cta: '两口之家 $150K 2 娃拿得到 ~$3-5K。',
  },
  CPP: {
    full: 'Canada Pension Plan',
    cn: '加拿大养老金',
    desc: '类似 US Social Security · 强制供款。2025：雇员 5.95% on (YMPE $71,300 - $3,500)；CPP2：4% on (YMPE → YAMPE $81,200)。自雇交双份 11.9% + 8%。最大雇员供款 ~$4,430。65 岁开始领（可 60 开始但减 ~36%）。',
    cta: 'QC 省交 QPP（略不同 · 稍高）。',
  },
  EI: {
    full: 'Employment Insurance',
    cn: '失业保险',
    desc: '2025 雇员 1.64%（QC 1.31%）on 最多 MIE $65,700 · 雇员最多 $1,077.48 / 年。自雇**默认不交**（可自愿加入 Special Benefits）。失业可领最多 45 周。',
    cta: '自雇想拿 maternity 或 sick 福利必须自愿加入（Special Benefits）。',
  },
  OAS: {
    full: 'Old Age Security',
    cn: '加拿大长者金',
    desc: '65 岁自动发 · 2025 最高 $727.67/月（65-74）· $800.44/月（75+）。收入 > $93,454（2025）起每 $1 回收 15 cents · 完全 clawback 到 ~$155K。需 65 岁+ 且在加拿大住满 10 年。',
    cta: '策略：71 岁前把 RRSP 部分取光 · 或用 TFSA 补充 · 避免 OAS 被吃。',
  },
  RESP: {
    full: 'Registered Education Savings Plan',
    cn: '注册教育储蓄金',
    desc: '娃教育账户 · **政府匹配 20%（CESG）** · 每娃每年最多 $500 匹配 · 终生 $7,200 政府补。每年供 $2,500 拿满匹配。投资增值复利到娃 17 岁。娃上大学取出算娃 income（基本 0 税）。没用上可转家庭成员的 RRSP。',
    cta: 'BC / QC 还有额外省级补贴。',
  },
  CCPC: {
    full: 'Canadian-Controlled Private Corporation',
    cn: '加拿大私有公司',
    desc: '小公司税务大杀器。**SBD 小企业扣除**：前 $500K 主动业务收入 · 联邦税率只 9%（加 省税后约 12%）· 普通收入约 25-27%。老板可选 salary（算 income 交个税 + CPP）vs dividend（资本利得式 · 但触发 TOSI 新规）。高收入专业人士（医生/律师/会计师）常开 Professional Corporation (PC)。',
    cta: 'TOSI 2018 新规限制家人"分红"拆分收入。',
  },
  T1: {
    full: 'T1 General',
    cn: '加拿大个人税表',
    desc: '加拿大版 1040 · 每年 4 月 30 日前交。自雇可延到 6 月 15 日（但税款仍 4 月 30 付）。网上通过 NETFILE 用 Wealthsimple / TurboTax / StudioTax 等软件提交 · 退款 2 周内到账。QC 省要额外填 TP-1。',
    cta: '和美国 1040 不同：没有 MFJ · 夫妻各报各的 · 但可互转 credit。',
  },
  T4: {
    full: 'T4 Statement of Remuneration',
    cn: '工资单',
    desc: '类似 US W-2。雇主 2 月底前发。Box 14 = 年薪 · Box 16 = CPP · Box 18 = EI · Box 22 = 代扣税。CRA 从雇主收到副本 · 你报税时网站预填。',
    cta: '自雇 / 契约工收 T4A（类似 1099）· 没预扣税 · 要自己季度预缴。',
  },
  T1135: {
    full: 'Foreign Income Verification Statement',
    cn: '海外资产申报',
    desc: '类似 US FBAR + 8938 合体。加拿大税务居民**海外资产成本** > **C$100,000** 任一时点要报（包括境外银行账户 / 股票 / 房产 · 但**自用房和 RRSP/TFSA 内的不算**）。不报罚 $25/天 最高 $2,500。故意不报罚款可到资产价值的 5%。',
    cta: '中国国内的房 + 银行账户 > CAD 10万 必报。',
  },
  BrightLine: {
    full: 'Residential Property Flipping Rule',
    cn: '反炒房规则',
    desc: '2023 新规：**住宅持有 < 365 天** 卖 · gain 全额算 business income（非资本利得 · 不能 Principal Residence Exemption 免税）· 按边际税率交。2024/7 起从 2 年改回 1 年（临时放宽）。例外：搬家工作 · 离婚 · 去世等。',
    cta: 'pre-construction condo 转签也踩这个坑。',
  },
  PRE: {
    full: 'Principal Residence Exemption',
    cn: '自住房豁免',
    desc: '**自住房卖出免 capital gains**（可能是加拿大最大的税务优惠）。条件：每年 designate 为 principal residence · 一家只能一套（2001 起夫妻合一）。2016+ 卖房必须在 T1 报 · 哪怕免税。度假屋也可选择做 PRE（但自住就不能了）。',
    cta: '留学生父母买房给娃住：家长不住 = 非自住 = 不能用 PRE。',
  },
  TransitionalResident: {
    full: 'Transitional Resident',
    cn: '过渡居民',
    desc: '新 PR / 技术移民 · 第一年特殊规则：**登陆日之前**的海外收入和资产不算 · 登陆日之后全球收入都要报。**deemed acquisition** 规则：登陆日 FMV 作为海外资产的 cost base（卖时减少 gain）· 登陆前海外公司股份有特殊处理。',
    cta: '登陆前最好卖掉大涨的海外资产 · 登陆后用 FMV 作新成本。',
  },
  CESG: {
    full: 'Canada Education Savings Grant',
    cn: '政府教育金匹配',
    desc: 'RESP 配套 · 政府每年匹配 20% 的供款 · 每娃每年最多 $500 · 终生 $7,200。低收入家庭额外 10-20% additional CESG。没领的 carry forward 1 年（每年最多 $1,000 匹配）。娃 17 岁前都能领。',
    cta: '开 RESP 越早越好 · 复利 18 年。',
  },
  // ═══ 跨境 · 加→美 4 条 ═══
  FBAR: {
    full: 'Report of Foreign Bank and Financial Accounts',
    cn: '境外账户申报',
    desc: '美国财政部 FinCEN Form 114 · 任一天境外账户总和 > $10K USD 就要报。加拿大 RRSP / TFSA / FHSA / 券商 / 银行 全算。4/15 截止 · 自动延期 10/15。**不是报税表** · 不交税 · 只申报。漏报罚金重：非故意每账户每年 $14,229 · 故意最高 50% 账户余额 或 $161K（取高）。',
    cta: '免费自填 · bsaefiling.fincen.treas.gov · 10 分钟搞定。',
  },
  Form8938: {
    full: 'Statement of Specified Foreign Financial Assets',
    cn: '境外金融资产申报',
    desc: 'FATCA 要求 · 跟 1040 一起填。门槛比 FBAR 高：Single 住美 > $50K (年底) 或 > $75K (年中任一天) 才要报。MFJ $100K / $150K。境外住：Single $200K / $300K · MFJ $400K / $600K。漏报罚 $10K + 每 30 天加罚。**和 FBAR 不重复 · 两个都要**。',
    cta: '门槛高于 FBAR · 有 FBAR 不一定要 8938。',
  },
  Treaty8833: {
    full: 'Treaty-Based Return Position Disclosure (Form 8833)',
    cn: '税收协定立场披露',
    desc: '美国公民 / 居民援引税收协定减税时要填。加→美常用：① US-Canada Article XVIII.7 · RRSP 延税 · 老规则但现在 deemed election 自动选（不需 8833 · 8891 已废）② Article XV · 跨境劳务收入分配 ③ Article XXV · 非歧视条款。**8833 仅在协定立场 > $10K 影响时**强制要填。RRSP 延税是自动的 · 一般**不需要**单独填 8833。',
    cta: 'RRSP 延税自动选 · 不需要每年填 8833。',
  },
  DualStatus: {
    full: 'Dual-Status Alien',
    cn: '双身份税务居民',
    desc: '搬美国当年或离美当年的特殊状态。一年内既是 NR alien 也是 Resident alien。**搬来年**：搬来前按 NR · 搬来后按 Resident · 合成一张 1040 但 itemized only（不能标扣）· 不能 MFJ 报（除非配偶都是全年 Resident）。**第一年选择**（First Year Choice · IRC §7701(b)(4)）：如果 12/31 还未达 183 天但下年度会达 · 可选本年剩余天数为 Resident · 要陈述书（Form 8840 位置）。**完全居民选择**（§6013(g)）：NR 配偶报 MFJ · 全年 Resident · 全球收入 · 可能更省。',
    cta: '第一年选错一次终身影响 · 这步找 CPA。',
  },
  RRSP8891: {
    full: 'RRSP Treaty Election (自动)',
    cn: 'RRSP 延税选择',
    desc: '美国 Tax Resident 持有加拿大 RRSP / RRIF · US-Canada Treaty XVIII.7 允许延税直到取出。**2014 年起自动 deemed election** · 不需要填 Form 8891（已废）· 也不需要每年填 8833（除非首年明确声明）。**但仍要**：① FBAR 报 RRSP 余额（过 $10K 合计门槛）② Form 8938（过 FATCA 门槛）③ 取出时：联邦按 ordinary income · 加拿大预扣 25% · Form 1116 抵扣。**州层面**：CA / NJ 不认 Treaty · RRSP 增值每年算州收入。',
    cta: '不用每年填表 · 但取出那年要准备 1116 抵扣加拿大预扣。',
  },
  DepartureTax: {
    full: 'Canada Departure Tax',
    cn: '加拿大离境税',
    desc: '离开加拿大变 non-resident 当年 · 所有应税资产 **deemed disposition**（视同售出）· 未实现 gain 按 50% 纳入当年。**要缴的**：加拿大券商股票 / ETF / 加密 / 贵金属 / 海外资产。**豁免**：加拿大不动产 · RRSP / TFSA / FHSA / RESP / pension · 符合条件的私人公司股份（T1244 申报）。**可以 defer**：超过 $16,500 gain · T1243 表 + 交保证金 · 推到实际卖出再缴。**搬美国**：Dual-Status 首年 · 加拿大资产的美国 cost base = 离境日 FMV。',
    cta: '离境前 3-6 个月规划 · 亏损先卖 offset · 可延缴的延缴。',
  },
  CrossBorderCommuter: {
    full: 'Cross-Border Commuter · 跨境通勤',
    cn: '跨境通勤报税',
    desc: '住加拿大 · 过桥 / 过关到美国上班（Windsor-Detroit · Niagara · Vancouver-Bellingham）。**税务上**：加拿大是主居住地 = 全球收入加拿大报 · 美国工资在美国源头代扣联邦 + 州税。**避免双重征税**：加拿大端用 Foreign Tax Credit · 美国税全额抵加拿大联邦税 + 部分抵省税。**美国报 1040-NR**（非居民）· 只报美国源收入。**SSA / Medicare 代扣**：Treaty Article XXVIII 不豁免 · 但 Totalization Agreement 让你拿加拿大时间算 US 的 40 quarter credit。',
    cta: 'TD1 / W-4 两边都要填 · 指定"跨境通勤"状态避免双重预扣。',
  },
  CapGains: {
    full: 'Capital Gains Inclusion Rate',
    cn: '资本利得纳入率',
    desc: '加拿大资本利得 **50% 纳入**应税收入（即只有一半按边际税率征税）。2024/6/25 曾计划将 **> $250K 的部分改为 67% 纳入**（更高税率）· 但 2025/1 新政府已 **取消** 这个改动 · 全部保持 50% 纳入。自住房卖出（PRE · Principal Residence Exemption）完全免税。',
    cta: '年底卖亏损股票 · 可抵当年 gain + 往前 3 年 carry back。',
  },
  QuarterlyCA: {
    full: 'T1 Instalments · 季度预缴',
    cn: '季度预缴',
    desc: 'CRA 规则：**上年欠税 > $3,000**（QC 省 > $1,800）要分季度预缴 · 否则罚息。截止日 **3/15 · 6/15 · 9/15 · 12/15**（和美国 4/15-6/15-9/15-1/15 不同）。自雇 / 租金 / 投资收入没源头扣税的典型场景。Safe Harbor：按上年税的 100% 均匀分 4 次。',
    cta: 'CRA 会主动寄 instalment reminder · 按他们说的交就不会罚。',
  },
  QCFiling: {
    full: 'Quebec TP-1 双申报',
    cn: 'QC 双申报',
    desc: '魁北克是加拿大唯一单独征收省所得税的省份。住 QC 要填 **两份** 表：联邦 T1 + 省 TP-1 · 各交各的税。联邦给 **16.5% Quebec Abatement** 抵消一部分（因为 QC 省税更重）。QPP 代替 CPP · QPIP 代替 EI。退税也分开来。',
    cta: 'Wealthsimple Tax / TurboTax QC 版会自动两张表同步 · 不用两次输入。',
  },
};

// 全局共享：当前打开的术语
const GlossaryContext = React.createContext({ open: () => {}, close: () => {} });

// <Term code="NIIT" /> 渲染"缩写 ?"，点击弹出含义
const Term = ({ code, children }) => {
  const ctx = React.useContext(GlossaryContext);
  const entry = GLOSSARY[code];
  const label = children || code;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 2, whiteSpace: 'nowrap' }}>
      <span>{label}</span>
      {entry && (
        <button
          onClick={(e) => { e.stopPropagation(); ctx.open(code); }}
          style={{
            width: 14, height: 14, borderRadius: '50%',
            background: '#F0F0ED', border: `1px solid ${C.lineLite}`,
            color: C.mute, cursor: 'pointer', padding: 0,
            fontFamily: F_BODY, fontSize: 8, fontWeight: 700,
            lineHeight: 1, display: 'inline-flex',
            alignItems: 'center', justifyContent: 'center',
            verticalAlign: 'middle',
            marginLeft: 2,
          }}
          aria-label={`${code} 解释`}
        >?</button>
      )}
    </span>
  );
};

const GlossaryModal = ({ code, onClose }) => {
  const entry = GLOSSARY[code];
  if (!entry) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(13,13,13,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: C.card, borderRadius: 12,
          border: `1px solid ${C.line}`,
          maxWidth: 380, width: '100%',
          maxHeight: '85vh', overflowY: 'auto',
          padding: '18px 20px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
          <div>
            <div style={{
              fontSize: 9, color: C.mute, fontFamily: F_MONO,
              letterSpacing: '0.1em', fontWeight: 700, marginBottom: 3,
            }}>
              术语解释 · {code}
            </div>
            <div style={{
              fontSize: 17, fontWeight: 700, color: C.ink,
              fontFamily: F_BODY, letterSpacing: '-0.005em',
            }}>
              {entry.cn}
            </div>
            <div style={{
              fontSize: 11, color: C.mute, fontFamily: F_MONO,
              marginTop: 3, letterSpacing: '0.02em',
            }}>
              {entry.full}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent', border: 'none', color: C.mute,
              fontSize: 20, cursor: 'pointer', padding: 0,
              lineHeight: 1,
            }}
          >×</button>
        </div>

        <div style={{
          fontSize: 12, color: C.ink2, fontFamily: F_BODY,
          lineHeight: 1.7, marginTop: 12,
        }}>
          {entry.desc}
        </div>

        {entry.cta && (
          <div style={{
            marginTop: 12, padding: '8px 12px',
            background: C.warnBg, border: `1px solid ${C.warn}40`,
            borderRadius: 8,
            fontSize: 11, color: C.warn, fontFamily: F_BODY,
            lineHeight: 1.5, fontWeight: 500,
          }}>
            † {entry.cta}
          </div>
        )}
      </div>
    </div>
  );
};

const EXPLAIN_REGISTRY = {
  // ═══ Form 1040 ═══
  '1040_1a': {
    title: 'Line 1a · Wages 工资',
    why: '来自所有 W2 雇主的工资合计。你每份工作的 W2 表格第 1 框数字加起来。',
    source: 'W2 Box 1 · 所有雇主加总',
    formula: '所有 W2 Box 1 之和',
    warn: 'Box 1 已经扣掉 401(k) pretax · HSA pretax · Section 125 福利。别和 gross pay 搞混。',
  },
  '1040_2b': {
    title: 'Line 2b · Taxable Interest',
    why: '银行账户、CD、国债、公司债产生的利息（应税部分）。',
    source: '1099-INT · 超过 $1,500 要附 Schedule B',
    formula: 'Schedule B line 4',
    warn: '市政债（Municipal bond）利息免联邦税，填到 2a 不是 2b。',
  },
  '1040_3b': {
    title: 'Line 3b · Ordinary Dividends',
    why: '所有股票基金分红总额。包含 qualified 和 ordinary。',
    source: '1099-DIV Box 1a · 超 $1,500 要附 Schedule B',
    formula: 'Schedule B line 6',
    warn: 'Qualified dividends（Box 1b）享 0/15/20% 优惠税率，但 Line 3b 是两者之和。',
  },
  '1040_3a': {
    title: 'Line 3a · Qualified Dividends',
    why: '3b 里属于合格分红的部分。享长期资本利得 0/15/20% 优惠税率。',
    source: '1099-DIV Box 1b',
    formula: '从 1099-DIV 直接抄',
    warn: '必须持股 > 60 天（ex-dividend 前后 121 天内）才算 qualified。',
  },
  '1040_7': {
    title: 'Line 7 · Capital Gain/Loss',
    why: '股票、基金、房产卖出的资本利得/损失总和。',
    source: 'Schedule D line 16',
    formula: 'LT gains + ST gains - losses',
    warn: '长期 gain（持股 > 1 年）享优惠税率。短期按普通税率。损失可抵 $3,000/年，其余 carry forward。',
  },
  '1040_8': {
    title: 'Line 8 · Additional Income',
    why: '所有"其他收入"合计：1099 自雇、rental、失业金、退休金、K-1 等。',
    source: 'Schedule 1 line 10',
    formula: 'Sch 1 Part I 合计',
    warn: '包括了 Schedule E (rental) 和 Schedule C (self-employment) 净利。',
  },
  '1040_10': {
    title: 'Line 10 · Adjustments to Income',
    why: '"Above-the-line" 扣除 — 不用 itemize 就能享受。',
    source: 'Schedule 1 line 26',
    formula: 'Sch 1 Part II 合计',
    warn: '最常见：Traditional IRA、HSA（非工资扣）、½ SE Tax、Student Loan interest、Self-employed health insurance。',
  },
  '1040_11': {
    title: 'Line 11 · AGI 调整后总收入',
    why: 'Adjusted Gross Income。几乎所有 tax credit / phase-out 都用 AGI 判断。',
    source: 'Line 9 − Line 10',
    formula: 'Gross Income - Adjustments',
    warn: 'AGI 决定了你能否 Backdoor Roth、能否拿 EV credit、医疗扣除门槛 7.5% 以谁为基数等。',
  },
  '1040_12': {
    title: 'Line 12 · Deduction 扣除',
    why: '从 Standard 和 Itemized 里选大的。2025 MFJ $30,000 · Single $15,000 · HoH $22,500。',
    source: '标准扣除表 或 Schedule A line 17',
    formula: 'MAX(Standard, Itemized)',
    warn: '65 岁以上 / 盲人有额外 standard deduction。MFS 双方必须同选同一种。',
  },
  '1040_13': {
    title: 'Line 13 · QBI 扣除',
    why: 'Section 199A · pass-through 业务净利的 20% 可扣。2025 MFJ phase-out $394,600+。',
    source: 'Form 8995 或 8995-A',
    formula: '合格业务净利 × 20%（带限制）',
    warn: 'SSTB（咨询/律师/医生等）高收入完全 phase-out。非 SSTB 受 W2 工资 / UBIA 限制。',
  },
  '1040_15': {
    title: 'Line 15 · Taxable Income 应税收入',
    why: '真正拿去套税率档的数字。',
    source: 'Line 11 − 12 − 13',
    formula: 'AGI - Deduction - QBI',
    warn: '你的"边际税率"是这个数字决定的，不是 AGI 决定的。',
  },
  '1040_16': {
    title: 'Line 16 · Tax 联邦所得税',
    why: '套用税率档位计算出的联邦税（未扣抵免）。',
    source: '税率表或 Tax Computation Worksheet',
    formula: '按 bracket 累进计算',
    warn: '如果有 Qualified Div / LT CapGain，需要用 Qualified Dividends & Capital Gain Tax Worksheet 分开算。',
  },
  '1040_23': {
    title: 'Line 23 · Other Taxes',
    why: '额外税：SE Tax、Additional Medicare Tax 0.9%、NIIT 3.8% 等。',
    source: 'Schedule 2',
    formula: 'SE Tax + Addl Medicare + NIIT + ...',
    warn: '自雇的 SE Tax 就在这里。高收入家庭的 3.8% NIIT 也在这。',
  },
  '1040_24': {
    title: 'Line 24 · Total Tax 总税负',
    why: '联邦总税负（所得税 + 其他税）。',
    source: 'Line 22 + 23',
    formula: 'Tax + Other Taxes',
    warn: '这是你要交的联邦总额。州税不在这里。',
  },

  // ═══ Schedule 1 ═══
  'sch1_3': {
    title: 'Sch 1 Line 3 · Business Income',
    why: '自雇（1099-NEC）净利。Schedule C 的 Line 31。',
    source: 'Schedule C',
    formula: 'Gross receipts - Total expenses',
    warn: '这里填的是"净利"，不是 1099-NEC Box 1。别忘了扣所有合理业务开支。',
  },
  'sch1_5': {
    title: 'Sch 1 Line 5 · Rental Real Estate',
    why: '出租房产净利润或损失。',
    source: 'Schedule E line 26',
    formula: 'Rental income - expenses - depreciation',
    warn: '有损失时 passive activity loss rule 可能限制 $25K/年。AGI > $150K 完全不能抵 W2 工资。',
  },
  'sch1_13': {
    title: 'Sch 1 Line 13 · HSA 扣除',
    why: '非工资单扣的 HSA 供款（直接打到 HSA 账户的）。',
    source: 'Form 8889 line 13',
    formula: '非 payroll 部分',
    warn: '通过雇主 payroll 扣的 HSA 不填这，因为 W2 Box 1 已经扣过了（还免 FICA）。',
  },
  'sch1_15': {
    title: 'Sch 1 Line 15 · ½ SE Tax 扣除',
    why: '自雇交的 15.3% SE Tax 里，一半可以从 AGI 扣除。',
    source: 'Schedule SE line 13',
    formula: 'SE Tax × 50%',
    warn: 'IRS 给自雇者的"补偿"— 因为 W2 员工的雇主那一半 FICA 不算员工收入。',
  },
  'sch1_17': {
    title: 'Sch 1 Line 17 · Self-Employed Health Insurance',
    why: '自雇者自己买的健康保险可全额扣除（非 itemize）。',
    source: '你付的保费',
    formula: '不能超过自雇净利',
    warn: '必须业务上有利润才能扣。配偶/孩子保费也可以，只要以自己名义投保。',
  },
  'sch1_20': {
    title: 'Sch 1 Line 20 · SEP / Solo 401(k) / SIMPLE',
    why: '自雇退休账户的雇主供款部分。',
    source: 'Form 5498',
    formula: '1099 净利 × 20%（sole prop）或 25%（S-Corp W2）',
    warn: 'Sole prop 是 20% 不是 25%！常见错误。计算基数是"净利 - ½ SE Tax"。',
  },

  // ═══ Schedule A ═══
  'schA_1': {
    title: 'Sch A Line 1 · 医疗开支',
    why: '所有合格医疗开支（超过 AGI 7.5% 的部分才能扣）。',
    source: '自己记录的发票',
    formula: 'MAX(0, 医疗 - AGI × 7.5%)',
    warn: 'HSA/FSA 报销过的不能再扣。保费、处方、自付、交通都能算。',
  },
  'schA_5a': {
    title: 'Sch A Line 5a · State/Local Income Tax',
    why: '付的州所得税 / 市所得税 / SDI。',
    source: 'W2 Box 17 + 估算税 + 前年 balance due',
    formula: '实付 SALT 所得税部分',
    warn: '5a + 5b + 5c 合计受 SALT cap 限制（2025: $40K MFJ/Single · MAGI > $500K 起 phase-out · > $600K 回 $10K · MFS 是 $20K / phase-out 起 $250K）。',
  },
  'schA_5b': {
    title: 'Sch A Line 5b · Real Estate Tax 地税',
    why: '主住 + 度假屋的房产税。',
    source: '地税单',
    formula: '实付房产税',
    warn: '1 个 SALT cap 要 5a + 5b + 5c 共用。高地税州（NJ/NY/CA/TX）的房主非常吃亏。',
  },
  'schA_8a': {
    title: 'Sch A Line 8a · Home Mortgage Interest',
    why: '主住 + 第二套房的房贷利息。',
    source: '1098 表 Box 1',
    formula: '实付利息',
    warn: '只限 2017 年后新贷款 $750K 本金以内的利息。超过部分 prorate。',
  },
  'schA_11': {
    title: 'Sch A Line 11 · 慈善捐款（现金）',
    why: '捐给 501(c)(3) 合格组织的现金 / 支票 / 信用卡捐款。',
    source: '收据',
    formula: '实捐金额',
    warn: '≤ AGI 60%。单笔 $250+ 必须有书面致谢。$5,000+ 的非现金捐要 8283 表。',
  },

  // ═══ Schedule B ═══
  'schB_1': {
    title: 'Sch B Part I · 利息明细',
    why: '每个账户（银行/CD/国债）分别列出，然后合计。',
    source: '1099-INT · Box 1',
    formula: '按账户分列',
    warn: '只有总利息 > $1,500 才需要附 Schedule B。没超也照填 1040 2b，但不用附。',
  },
  'schB_5': {
    title: 'Sch B Part II · 分红明细',
    why: '每只股票/基金的分红分别列。',
    source: '1099-DIV · Box 1a',
    formula: '按券商账户分列',
    warn: '> $1,500 才要附。Qualified 部分（1b）不在此列，直接填 1040 Line 3a。',
  },
  'schB_7': {
    title: 'Sch B Part III · Foreign Account',
    why: '海外银行/投资账户合计 > $10K 要回答 Yes 并报 FBAR。',
    source: '你自己知道',
    formula: '所有海外账户年中任一时点合计',
    warn: 'FBAR（FinCEN 114）单独报，deadline 4/15。漏报罚款可达账户 50%。',
  },

  // ═══ Schedule C ═══
  'schC_1': {
    title: 'Sch C Line 1 · Gross Receipts',
    why: '所有 1099-NEC、1099-K、现金收入等毛收入。',
    source: '所有 1099 + 记账',
    formula: '未扣任何开支',
    warn: 'IRS 可通过 1099-K（Venmo/PayPal）追溯。别漏报。',
  },
  'schC_9': {
    title: 'Sch C Line 9 · Car & Truck',
    why: '业务使用车辆的开支。两种方法选一。',
    source: '行车记录',
    formula: '实际法 或 Standard Mileage（2025 $0.70/mile）',
    warn: '通勤（commuting）不算。只有 client 会面、业务采购等业务里程算。',
  },
  'schC_13': {
    title: 'Sch C Line 13 · Depreciation',
    why: '设备、车辆、资产的折旧。',
    source: 'Form 4562',
    formula: 'Section 179 + Bonus Dep + 常规 MACRS',
    warn: '2025 Bonus Depreciation 40%（逐年下降）。电脑/手机等 5 年折旧。',
  },
  'schC_16a': {
    title: 'Sch C Line 16a · 业务房贷利息',
    why: '纯商业房产（非 home office）的贷款利息。',
    source: '1098',
    formula: '实付',
    warn: 'Home office 的利息在 8829 表分摊，不直接在这里。',
  },
  'schC_18': {
    title: 'Sch C Line 18 · Office Expense',
    why: '办公用品、文具、印刷、邮资、订阅。',
    source: '收据',
    formula: '实付',
    warn: '贵的设备（笔记本/打印机）应分到 Line 13 折旧，不是直接全扣。',
  },
  'schC_24a': {
    title: 'Sch C Line 24a · Travel',
    why: '出差交通、酒店、Uber。',
    source: '收据',
    formula: '实付',
    warn: '出差期间的 meal 走 Line 24b，限 50%。跟 commuting 区分开。',
  },
  'schC_30': {
    title: 'Sch C Line 30 · Home Office',
    why: 'Home office 专用面积的分摊开支。',
    source: 'Form 8829 或 Simplified Method',
    formula: 'Simplified: sqft × $5（≤ 300 sqft）',
    warn: '必须"专用且经常使用"。偶尔坐沙发办公不算。',
  },
  'schC_31': {
    title: 'Sch C Line 31 · Net Profit',
    why: 'Schedule C 净利。→ Sch 1 Line 3 + Sch SE。',
    source: 'Line 7 - Line 28',
    formula: 'Gross - Expenses',
    warn: '这个数同时进入两处：所得税基数（Sch 1）和 SE Tax 基数（Sch SE）。',
  },

  // ═══ Schedule D ═══
  'schD_1a': {
    title: 'Sch D Line 1a · 短期资本利得',
    why: '持股 ≤ 1 年卖出的 gain/loss。',
    source: '1099-B',
    formula: 'Sale price - basis',
    warn: '按普通所得税率征税，不享受 LT 优惠。',
  },
  'schD_8a': {
    title: 'Sch D Line 8a · 长期资本利得',
    why: '持股 > 1 年卖出的 gain/loss。',
    source: '1099-B',
    formula: 'Sale price - basis',
    warn: 'MFJ 应税收入 ≤ $96,700 时，LT gain 联邦 0% 税率！Single ≤ $48,350 也是 0%。',
  },
  'schD_16': {
    title: 'Sch D Line 16 · Total Capital Gain',
    why: 'LT + ST 合计。→ 1040 Line 7。',
    source: 'LT + ST',
    formula: 'Line 7 + Line 15',
    warn: '净损失 > $3,000 的部分只能 carry forward 到明年。',
  },

  // ═══ Schedule E ═══
  'schE_3': {
    title: 'Sch E Line 3 · 租金收入',
    why: '每套出租房的全年租金收入。',
    source: '租户付款记录',
    formula: '总租金（未扣开支）',
    warn: '押金不算收入（除非不退给租户）。平均住客 < 7 天应走 Sch C 不是 E。',
  },
  'schE_18': {
    title: 'Sch E Line 18 · Depreciation',
    why: '出租房建筑部分 27.5 年平均折旧。',
    source: '建筑成本（非土地）',
    formula: '建筑 basis ÷ 27.5',
    warn: '地价不能折旧！通常建筑:地价 = 80:20 估算。Cost Segregation 可加速。',
  },
  'schE_21': {
    title: 'Sch E Line 21 · 净利润/损失',
    why: '单套房的净收益。→ Line 26 汇总。',
    source: '租金 - 所有开支 - 折旧',
    formula: '按房分别算',
    warn: 'Passive Loss Rule：亏损不能抵 W2 工资（除非你是 Real Estate Professional）。',
  },
  'schE_26': {
    title: 'Sch E Line 26 · 所有房合计',
    why: '所有出租房、K-1 合伙、S-Corp 被动净额总计。→ Sch 1 Line 5。',
    source: '所有 Part I/II/III 合计',
    formula: '合计',
    warn: '损失部分可能被 passive activity loss 暂停（走 Form 8582），suspend 到将来或卖房时释放。',
  },

  // ═══ Schedule SE ═══
  'schSE_3': {
    title: 'Sch SE Line 3 · Net SE Earnings',
    why: '自雇净利。',
    source: 'Schedule C Line 31 + K-1 GP payments',
    formula: 'Sch C 净利 + 合伙 GP 付款',
    warn: 'S-Corp 股东分红不在这 — S-Corp 的 W2 部分已交 FICA。',
  },
  'schSE_4a': {
    title: 'Sch SE Line 4a · × 92.35%',
    why: '"补偿因子"— 把自雇收入减到跟 W2 gross 可比。',
    source: '数学处理',
    formula: 'Line 3 × 0.9235',
    warn: '这个因子的来源：1 − 7.65% ÷ 2 = 0.9235。相当于扣掉"雇主那一半"的 FICA。',
  },
  'schSE_10': {
    title: 'Sch SE Line 10 · SS × 12.4%',
    why: 'Social Security 部分，上限 $176,100（2025）。',
    source: '4a × 12.4%',
    formula: 'MIN(4a, $176,100) × 12.4%',
    warn: '超过 $176,100 的部分不交 SS，但仍交 Medicare 2.9%。',
  },
  'schSE_11': {
    title: 'Sch SE Line 11 · Medicare × 2.9%',
    why: 'Medicare 部分，无上限。',
    source: '4a × 2.9%',
    formula: 'Line 4a × 2.9%',
    warn: '高收入还有 Additional Medicare 0.9%（Form 8959），单身 $200K+ / MFJ $250K+ 开始。',
  },
  'schSE_12': {
    title: 'Sch SE Line 12 · Total SE Tax',
    why: '自雇版"FICA"，是你要多交的税。',
    source: 'Line 10 + Line 11',
    formula: 'SS + Medicare',
    warn: '一半（Line 13）可从 AGI 扣除，相当于普通 W2 员工不用算"雇主那一半"。',
  },

  // ═══ Form 8889 (HSA) ═══
  '8889_2': {
    title: '8889 Line 2 · 自行供款',
    why: '不通过雇主工资扣的 HSA 供款（自己打到账户的）。',
    source: '你的账户记录',
    formula: '实付金额',
    warn: '这部分 → Schedule 1 Line 13 扣 AGI。但不省 FICA（工资扣才省 FICA）。',
  },
  '8889_3': {
    title: '8889 Line 3 · 年度上限',
    why: '2025 年 Self-only $4,300 · Family $8,550 · 55+ 多 $1,000。',
    source: 'IRS 年度公布',
    formula: '按 HDHP 覆盖类型',
    warn: '必须有 HDHP 覆盖才能开 HSA。2025 HDHP 门槛 $1,650 deductible / $8,300 OOP。',
  },
  '8889_9': {
    title: '8889 Line 9 · 雇主贡献',
    why: '雇主通过 payroll 扣或直接存的 HSA 供款。',
    source: 'W2 Box 12 code W',
    formula: '从 W2 抄',
    warn: 'W2 Box 12W 里的数字已经从 Box 1 里扣了，别再重复扣。',
  },
  '8889_13': {
    title: '8889 Line 13 · HSA 扣除',
    why: '→ Schedule 1 Line 13 扣 AGI。',
    source: 'Line 2 - Line 11',
    formula: '自供 - 超额',
    warn: '2a (雇主+员工 payroll) 不在这里 — 因为 W2 Box 1 已经减过。',
  },

  // ═══ Form 8995 (QBI) ═══
  '8995_1': {
    title: '8995 Line 1 · 合格业务收入',
    why: 'QBI 基数 — 合格 pass-through 业务的净利。',
    source: 'Sch C / E / K-1',
    formula: '业务净利',
    warn: 'S-Corp 股东的 W2 工资不算 QBI — 只有 K-1 分红算。',
  },
  '8995_5': {
    title: '8995 Line 5 · QBI × 20%',
    why: 'Pass-through 业务的 20% 扣除。',
    source: 'Line 1 × 20%',
    formula: 'QBI × 20%',
    warn: 'MFJ 收入 < $394,600 用简单版 8995。超过用 8995-A（SSTB 判定 + W2 工资限制）。',
  },
  '8995_10': {
    title: '8995 Line 10 · 最终扣除',
    why: 'QBI deduction 的两个上限取小者。→ 1040 Line 13。',
    source: 'MIN(Line 5, 20% × 应税 - LT gain)',
    formula: '双重上限',
    warn: '如果你的应税收入大部分是 LT CapGain / QDiv，QBI 扣除会被第二个上限夹死。',
  },

  // ═══ Form 8959 (Additional Medicare) ═══
  '8959_7': {
    title: '8959 Line 7 · Additional Medicare',
    why: '工资 + SE 收入超过门槛多交 0.9%。',
    source: 'W2 + SE',
    formula: '(合计 - 门槛) × 0.9%',
    warn: '门槛：Single $200K · MFJ $250K · MFS $125K。雇主自动从工资扣，但自雇要自己算。',
  },

  // ═══ State (NJ-1040 / IT-201) ═══
  'state_1': {
    title: '州 Line 1 · Wages',
    why: '填报州的工资收入（可能 ≠ 联邦 Wages）。',
    source: 'W2 Box 16',
    formula: '州工资',
    warn: 'NJ 不认 401(k) pretax（NJ 工资 > Federal 工资）。PA 不认 HSA。',
  },
  'state_nj_401k': {
    title: 'NJ 401(k) 不抵州税',
    why: 'NJ 是全美唯一 W2 401(k) 要交州税的大州（除 PA 部分认）。',
    source: 'NJ Treasury 规则',
    formula: 'NJ 工资 = Federal + 401(k) pretax',
    warn: '你的 NJ 工资会比联邦工资高出你存的 401(k) 金额。但提取时 NJ 不再收税（已交过）。',
  },
  'state_salt': {
    title: '州 SALT 抵扣',
    why: '高地税州（NJ/NY/CA）的个人 SALT 抵扣有限制。',
    source: '联邦 Schedule A',
    formula: '州各有规则',
    warn: 'NJ property tax ≤ $15K deduction. NY 州地税照联邦 $10K cap。PTE Tax 可绕。',
  },
  'state_nyc_tax': {
    title: 'NYC 市税',
    why: 'NYC 居民额外 3.078% – 3.876% 市所得税。',
    source: 'NY IT-201 + IT-360',
    formula: '按居住时间分摊',
    warn: 'Yonkers 居民也有市税附加。NJ 居民在 NYC 工作不需要交 NYC 市税。',
  },
};

const ExplainModal = ({ entry, onClose }) => {
  if (!entry) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 140,
        background: 'rgba(13,13,13,0.62)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: C.bg, width: '100%', maxWidth: 420,
          maxHeight: 'min(85vh, 680px)', overflow: 'auto',
          borderRadius: 14,
          padding: 22, paddingBottom: 20,
          borderTop: `4px solid ${C.info}`,
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
      >
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'flex-start', marginBottom: 12,
        }}>
          <div style={{
            fontSize: 9, color: C.info, fontFamily: F_MONO,
            letterSpacing: '0.12em', fontWeight: 700,
          }}>
            税表解释
          </div>
          <button onClick={onClose} style={{
            background: 'transparent', border: 'none',
            fontSize: 20, color: C.mute, cursor: 'pointer',
            padding: 0, lineHeight: 1,
          }}>×</button>
        </div>
        <div style={{
          fontFamily: F_NUM, fontSize: 16, fontWeight: 700,
          color: C.ink, marginBottom: 14,
          letterSpacing: '-0.01em', lineHeight: 1.3,
        }}>
          {entry.title}
        </div>
        {/* 为什么 */}
        <div style={{ marginBottom: 12 }}>
          <div style={{
            fontSize: 9, color: C.mute, fontFamily: F_BODY,
            fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
            marginBottom: 4,
          }}>为什么填这一行</div>
          <div style={{
            fontSize: 12, color: C.ink2, fontFamily: F_BODY, lineHeight: 1.6,
          }}>{entry.why}</div>
        </div>
        {/* 数从哪来 */}
        {entry.source && (
          <div style={{ marginBottom: 12 }}>
            <div style={{
              fontSize: 9, color: C.mute, fontFamily: F_BODY,
              fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
              marginBottom: 4,
            }}>数字从哪来</div>
            <div style={{
              fontSize: 12, color: C.ink2, fontFamily: F_MONO, lineHeight: 1.6,
              padding: '6px 10px', background: C.cardAlt,
              border: `1px solid ${C.line}`, borderRadius: 6,
            }}>{entry.source}</div>
          </div>
        )}
        {/* 公式 */}
        {entry.formula && (
          <div style={{ marginBottom: 12 }}>
            <div style={{
              fontSize: 9, color: C.mute, fontFamily: F_BODY,
              fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
              marginBottom: 4,
            }}>计算公式</div>
            <div style={{
              fontSize: 12, color: C.ink, fontFamily: F_MONO, lineHeight: 1.6,
              padding: '6px 10px', background: `${C.save}10`,
              border: `1px solid ${C.save}44`, borderRadius: 6,
            }}>{entry.formula}</div>
          </div>
        )}
        {/* 常见错误 */}
        {entry.warn && (
          <div style={{
            padding: 12, background: C.warnBg,
            border: `1px solid #E6C97A`, borderRadius: 8,
            display: 'flex', gap: 8,
          }}>
            <span style={{
              fontSize: 14, color: C.warn, fontFamily: F_NUM,
              fontWeight: 700, flexShrink: 0, lineHeight: 1,
            }}>†</span>
            <div style={{
              fontSize: 11, color: C.warn, fontFamily: F_BODY, lineHeight: 1.6,
            }}>{entry.warn}</div>
          </div>
        )}
      </div>
    </div>
  );
};

// 表格节标题（IRS 用的粗体分节）
const IRSSection = ({ title, cn, part, desc }) => (
  <div style={{
    marginTop: 10, marginBottom: 2,
    padding: '5px 6px',
    background: IRS_INK, color: IRS_BG,
    fontFamily: F_FORM,
    fontSize: 10, fontWeight: 700,
    letterSpacing: '0.08em',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  }}>
    <span>
      {part ? `${part} · ${title}` : title}
      {cn && <span style={{
        marginLeft: 8, fontWeight: 400, fontSize: 9,
        fontFamily: F_BODY, letterSpacing: '0.02em',
        opacity: 0.85,
      }}>{cn}</span>}
    </span>
    {desc && <span style={{ fontSize: 8, fontWeight: 400, opacity: 0.8 }}>{desc}</span>}
  </div>
);

// 各 IRS form 头部（左上角 form 名 + 右上角 form 编号 + 年份）
const IRSFormHeader = ({ formName, formTitle, formTitleCn, subtitle, year = '2025', ombNo }) => (
  <div style={{
    borderTop: `3px solid ${IRS_INK}`,
    borderBottom: `2px solid ${IRS_INK}`,
    padding: '10px 10px',
    marginBottom: 4,
    display: 'grid',
    gridTemplateColumns: '1fr auto',
    gap: 10,
    background: IRS_BG,
  }}>
    <div>
      <div style={{
        fontFamily: F_FORM_SERIF, fontSize: 22, fontWeight: 700,
        lineHeight: 1, color: IRS_INK,
      }}>
        {formName}
      </div>
      <div style={{
        fontFamily: F_FORM, fontSize: 11, fontWeight: 600,
        color: IRS_INK, marginTop: 3,
      }}>
        {formTitle}
      </div>
      {formTitleCn && (
        <div style={{
          fontFamily: F_BODY, fontSize: 10, color: IRS_INK,
          marginTop: 2, fontWeight: 500,
        }}>
          {formTitleCn}
        </div>
      )}
      {subtitle && (
        <div style={{
          fontFamily: F_FORM, fontSize: 9, color: IRS_MUTE,
          marginTop: 2, fontStyle: 'italic',
        }}>
          {subtitle}
        </div>
      )}
    </div>
    <div style={{ textAlign: 'right' }}>
      <div style={{
        fontFamily: F_FORM_SERIF, fontSize: 24, fontWeight: 700,
        color: IRS_INK, lineHeight: 1,
      }}>{year}</div>
      {ombNo && (
        <div style={{
          fontFamily: F_FORM, fontSize: 8, color: IRS_MUTE,
          marginTop: 3,
        }}>
          OMB No.<br/>{ombNo}
        </div>
      )}
    </div>
  </div>
);

// 表格底部标准脚注
const IRSFormFooter = ({ formNum, pages }) => (
  <div style={{
    marginTop: 14, paddingTop: 6,
    borderTop: `1px solid ${IRS_INK}`,
    display: 'flex', justifyContent: 'space-between',
    fontFamily: F_FORM,
    fontSize: 8, color: IRS_MUTE,
    fontStyle: 'italic',
  }}>
    <span>For Paperwork Reduction Act Notice, see separate instructions.</span>
    <span>{formNum} ({pages || '2025'})</span>
  </div>
);

// ── Form 1040 ──
const Form1040Mock = ({ inputs: i, calc }) => {
  const filingMap = {
    MFJ: 'Married filing jointly',
    Single: 'Single',
    HoH: 'Head of household',
    MFS: 'Married filing separately',
  };
  return (
    <div style={{ fontFamily: F_FORM }}>
      <IRSFormHeader
        formName="Form 1040"
        formTitle="U.S. Individual Income Tax Return" formTitleCn="美国个人所得税申报表"
        subtitle="Department of the Treasury — Internal Revenue Service"
        ombNo="1545-0074"
      />
      {/* Filing Status box · 双语 */}
      <div style={{
        padding: '6px 8px', marginBottom: 6,
        border: `1px solid ${IRS_INK}`,
        fontSize: 9,
      }}>
        <div style={{ fontWeight: 700, fontSize: 10, marginBottom: 3 }}>
          Filing Status
          <span style={{ marginLeft: 6, fontFamily: F_BODY, fontWeight: 500, fontSize: 9, color: IRS_MUTE }}>申报身份</span>
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {Object.entries(filingMap).map(([k, v]) => {
            const cn = { MFJ: '夫妻合并', Single: '单身', HoH: '户主', MFS: '夫妻分开' }[k];
            return (
              <span key={k} style={{
                padding: '2px 6px',
                background: i.filingStatus === k ? IRS_INK : 'transparent',
                color: i.filingStatus === k ? IRS_BG : IRS_MUTE,
                border: `1px solid ${IRS_BORDER}55`,
                fontWeight: i.filingStatus === k ? 700 : 400,
              }}>
                {i.filingStatus === k ? '☒' : '☐'} {v}
                {cn && <span style={{ marginLeft: 3, fontFamily: F_BODY, fontSize: 8, opacity: 0.85 }}>{cn}</span>}
              </span>
            );
          })}
        </div>
      </div>
      {/* Income section */}
      <IRSSection title="Income" cn="收入" />
      <IRSRow lineNum="1a" label="Total amount from Form(s) W-2, box 1" cn="W-2 工资（Box 1）合计" value={(i.w2 || 0) + (i.spouseW2 || 0)} />
      {(i.interest || 0) > 0 && <IRSRow lineNum="2b" label="Taxable interest" cn="应税利息" value={i.interest || 0} sub="from Schedule B" />}
      {(i.dividends || 0) > 0 && (
        <>
          <IRSRow lineNum="3a" label="Qualified dividends" cn="合格股息（0/15/20% 税率）" value={calc.qualifiedDividends || 0} />
          <IRSRow lineNum="3b" label="Ordinary dividends" cn="普通股息" value={i.dividends || 0} sub="from Schedule B" />
        </>
      )}
      {((i.capGainsLT || 0) + (i.capGainsST || 0)) > 0 && (
        <IRSRow lineNum="7" label="Capital gain or (loss)" cn="资本利得（或损失）" value={(i.capGainsLT || 0) + (i.capGainsST || 0)} sub="attach Schedule D" />
      )}
      <IRSRow lineNum="8" label="Additional income from Schedule 1, line 10" cn="Schedule 1 附加收入合计" value={(calc.net1099 || 0) + (calc.rentalGainToAGI || 0)} />
      <IRSRow lineNum="9" label="Add lines 1a through 8. This is your total income" cn="总收入 · 行 1a–8 相加" value={calc.grossWages} total bold />
      <IRSRow lineNum="10" label="Adjustments from Schedule 1, line 26" cn="Schedule 1 调整项（减 AGI）" value={(i.k401 || 0) + (i.hsa || 0) + (calc.seDed || 0)} negative />
      <IRSRow lineNum="11" label="Adjusted Gross Income (AGI)" cn="调整后总收入 AGI" value={calc.agi} total bold />

      {/* Deductions */}
      <IRSSection title="Deductions & Tax" cn="扣除 · 税额" />
      <IRSRow lineNum="12" label={calc.useItemize ? 'Itemized deductions (Schedule A)' : 'Standard deduction'} value={calc.fedDed} />
      {((calc.agi - calc.fedDed - calc.fedTaxable) > 0) && (
        <IRSRow lineNum="13" label="QBI deduction (Form 8995)" cn="自雇 20% QBI 扣除" value={Math.max(0, calc.agi - calc.fedDed - calc.fedTaxable)} />
      )}
      <IRSRow lineNum="14" label="Add lines 12 and 13" cn="第 12 + 13 行合计" value={calc.fedDed + Math.max(0, calc.agi - calc.fedDed - calc.fedTaxable)} />
      <IRSRow lineNum="15" label="Taxable income" cn="应税所得" value={calc.fedTaxable} total bold />
      <IRSRow lineNum="16" label="Tax (from tax tables or Schedule D worksheet)" cn="联邦所得税（税表或 Sch D 计算）" value={calc.fedTax} />
      <IRSRow lineNum="17" label="Amount from Schedule 2, line 3" cn="Schedule 2 附加税（AMT 等）" value={0} sub="AMT · 未计算" />
      <IRSRow lineNum="18" label="Add lines 16 and 17" cn="第 16 + 17 行合计" value={calc.fedTax} />
      <IRSRow lineNum="19" label="Child tax credit" cn="儿童税抵免" value={(i.children || 0) * 2000} negative sub={`${i.children || 0} 孩 × $2,000`} />
      <IRSRow lineNum="20" label="Amount from Schedule 3, line 8" cn="Schedule 3 抵免合计" value={0} />
      <IRSRow lineNum="22" label="Subtract line 21 from line 18" cn="第 18 减 21 行" value={Math.max(0, calc.fedTax - (i.children || 0) * 2000)} />
      <IRSRow lineNum="23" label="Other taxes from Schedule 2, line 21" cn="Schedule 2 其他税（自雇 SE + 附加 Medicare）" value={(calc.seTax || 0) + (calc.addlMedicare || 0)} sub="SE + Addl Medicare" />
      <IRSRow lineNum="24" label="Total tax" cn="联邦税合计" value={Math.max(0, calc.fedTax - (i.children || 0) * 2000) + (calc.seTax || 0) + (calc.addlMedicare || 0)} total bold />

      {/* Payments (简化) */}
      <IRSSection title="Payments" cn="已付款 / 预扣" />
      <IRSRow lineNum="25a" label="Federal income tax withheld from W-2" cn="W-2 已扣联邦税" value={(calc.fedTax + calc.addlMedicare) * 0.85} sub="估算 withholding" />
      <IRSRow lineNum="33" label="Total payments" cn="已付款合计" value={(calc.fedTax + calc.addlMedicare) * 0.85} total bold />

      <IRSFormFooter formNum="Form 1040" pages="2025" />
    </div>
  );
};

// ── Schedule 1 ──
const Schedule1Mock = ({ inputs: i, calc }) => (
  <div style={{ fontFamily: F_FORM }}>
    <IRSFormHeader
      formName="Schedule 1"
      formTitle="Additional Income and Adjustments to Income" formTitleCn="附加收入与 AGI 调整"
      subtitle="(Attach to Form 1040)"
      ombNo="1545-0074"
    />
    <IRSSection title="Additional Income" cn="Part I · 附加收入" part="Part I" />
    {(calc.net1099 || 0) > 0 && (
      <IRSRow lineNum="3" label="Business income or (loss)" value={calc.net1099} sub="from Schedule C" />
    )}
    {(calc.rentalGainToAGI || 0) > 0 && (
      <IRSRow lineNum="5" label="Rental real estate, royalties, K-1" value={calc.rentalGainToAGI} sub="from Schedule E" />
    )}
    <IRSRow lineNum="10" label="Total additional income" value={(calc.net1099 || 0) + (calc.rentalGainToAGI || 0)} total bold sub="→ Form 1040 line 8" />

    <IRSSection title="Adjustments to Income" cn="Part II · 调整 AGI" part="Part II" />
    {(i.k401 || 0) > 0 && (
      <IRSRow lineNum="20" label="IRA deduction" value={0} sub="W2 401(k) pretax is already in W2" />
    )}
    {(i.hsa || 0) > 0 && (
      <IRSRow lineNum="13" label="HSA deduction" cn="HSA 供款扣除" value={i.hsa} sub="from Form 8889" />
    )}
    {(calc.seDed || 0) > 0 && (
      <IRSRow lineNum="15" label="Deductible part of SE tax" value={calc.seDed} sub="½ SE tax" />
    )}
    <IRSRow lineNum="26" label="Total adjustments" value={(i.hsa || 0) + (calc.seDed || 0)} total bold sub="→ Form 1040 line 10" />

    <IRSFormFooter formNum="Schedule 1 (Form 1040)" pages="2025" />
  </div>
);

// ── Schedule A ──
const ScheduleAMock = ({ inputs: i, calc }) => (
  <div style={{ fontFamily: F_FORM }}>
    <IRSFormHeader
      formName="Schedule A"
      formTitle="Itemized Deductions" formTitleCn="逐项扣除"
      subtitle="(Attach to Form 1040)"
      ombNo="1545-0074"
    />
    <IRSSection title="Medical and Dental Expenses" cn="医疗与牙科开支" />
    <IRSRow lineNum="1" label="Medical and dental expenses" cn="医疗开支" value={i.medical || 0} />
    <IRSRow lineNum="2" label="AGI × 7.5%" cn="AGI × 7.5% 门槛" value={calc.agi * 0.075} />
    <IRSRow lineNum="3" label="Subtract line 2 from line 1" cn="第 1 减 2 行" value={calc.medicalExp || 0} total bold />

    <IRSSection title="Taxes You Paid" cn="已缴税款" />
    <IRSRow lineNum="5a" label="State and local income taxes" value={calc.estStateTax || 0} />
    <IRSRow lineNum="5b" label="State and local real estate taxes" value={calc.totalPropTaxSchedA || 0} />
    <IRSRow lineNum="5d" label="Add lines 5a through 5c" cn="第 5a–c 行合计" value={calc.saltRaw || 0} />
    <IRSRow lineNum="5e" label={`Smaller of 5d or $${(calc.saltCap || 10000).toLocaleString()}`} value={calc.saltCapped || 0} bold sub="SALT Cap" />
    <IRSRow lineNum="7" label="Total taxes paid" value={calc.saltCapped || 0} total bold />

    <IRSSection title="Interest You Paid" cn="已付利息" />
    <IRSRow lineNum="8a" label="Home mortgage interest" cn="房贷利息" value={calc.mortInt || 0} />
    <IRSRow lineNum="10" label="Total interest paid" value={calc.mortInt || 0} total bold />

    <IRSSection title="Gifts to Charity" cn="慈善捐赠" />
    <IRSRow lineNum="11" label="Gifts by cash or check" value={calc.charity || 0} />
    <IRSRow lineNum="14" label="Total gifts" value={calc.charity || 0} total bold />

    <IRSSection title="Total Itemized Deductions" cn="逐项扣除合计" />
    <IRSRow lineNum="17" label="Add lines 4, 7, 10, 14, 15, 16" value={calc.itemized || 0} total bold sub="→ Form 1040 line 12" />

    <IRSFormFooter formNum="Schedule A (Form 1040)" pages="2025" />
  </div>
);

// ── Schedule B ──
const ScheduleBMock = ({ inputs: i, calc }) => (
  <div style={{ fontFamily: F_FORM }}>
    <IRSFormHeader
      formName="Schedule B"
      formTitle="Interest and Ordinary Dividends"
      subtitle="(Attach to Form 1040)"
      ombNo="1545-0074"
    />
    <IRSSection title="Interest" part="Part I" desc="List each payer" />
    {(i.interest || 0) > 0 && (
      <>
        <IRSRow lineNum="1" label="Bank / HYSA / CDs / Treasury" value={i.interest} />
        <IRSRow lineNum="2" label="Add amounts on line 1" value={i.interest} bold />
        <IRSRow lineNum="4" label="Total interest — enter on Form 1040 line 2b" value={i.interest} total bold />
      </>
    )}
    <IRSSection title="Ordinary Dividends" part="Part II" desc="List each payer" />
    {(i.dividends || 0) > 0 && (
      <>
        <IRSRow lineNum="5" label="Brokerage / Mutual Fund / ETF" value={i.dividends} />
        <IRSRow lineNum="6" label="Total ordinary dividends — Form 1040 line 3b" value={i.dividends} total bold />
      </>
    )}
    <IRSFormFooter formNum="Schedule B (Form 1040)" pages="2025" />
  </div>
);

// ── Schedule C ──
const ScheduleCMock = ({ inputs: i, calc }) => {
  const inc1099 = i.inc1099 || 0;
  const exp = i.expense1099 || 0;
  return (
    <div style={{ fontFamily: F_FORM }}>
      <IRSFormHeader
        formName="Schedule C"
        formTitle="Profit or Loss From Business"
        subtitle="(Sole Proprietorship) · Attach to Form 1040"
        ombNo="1545-0074"
      />
      <IRSSection title="Income" cn="收入" part="Part I" />
      <IRSRow lineNum="1" label="Gross receipts or sales" cn="毛营业收入" value={inc1099} />
      <IRSRow lineNum="7" label="Gross income" cn="业务总收入" value={inc1099} bold />

      <IRSSection title="Expenses" cn="Part II · 开支" part="Part II" />
      <IRSRow lineNum="8" label="Advertising" cn="广告费" value={Math.round(exp * 0.05)} />
      <IRSRow lineNum="9" label="Car and truck expenses" cn="车辆费用" value={Math.round(exp * 0.25)} />
      <IRSRow lineNum="13" label="Depreciation and section 179" value={Math.round(exp * 0.08)} />
      <IRSRow lineNum="15" label="Insurance (other than health)" cn="保险（非医疗）" value={Math.round(exp * 0.05)} />
      <IRSRow lineNum="16a" label="Mortgage interest (business)" value={0} />
      <IRSRow lineNum="18" label="Office expense" cn="办公室开支" value={Math.round(exp * 0.10)} />
      <IRSRow lineNum="20a" label="Rent (vehicles, machinery)" value={0} />
      <IRSRow lineNum="22" label="Supplies" cn="用品" value={Math.round(exp * 0.12)} />
      <IRSRow lineNum="24a" label="Travel" cn="差旅" value={Math.round(exp * 0.08)} />
      <IRSRow lineNum="25" label="Utilities" cn="水电网气" value={Math.round(exp * 0.05)} />
      <IRSRow lineNum="27a" label="Other expenses" cn="其他费用" value={Math.round(exp * 0.22)} />
      <IRSRow lineNum="28" label="Total expenses" cn="总开支" value={exp} bold sub="估算分类" />

      <IRSSection title="Net Profit" />
      <IRSRow lineNum="31" label="Net profit or (loss). Subtract 28 from 7" value={inc1099 - exp} total bold sub="→ Sch 1 line 3 + Sch SE" />

      <IRSFormFooter formNum="Schedule C (Form 1040)" pages="2025" />
    </div>
  );
};

// ── Schedule D ──
const ScheduleDMock = ({ inputs: i, calc }) => (
  <div style={{ fontFamily: F_FORM }}>
    <IRSFormHeader
      formName="Schedule D"
      formTitle="Capital Gains and Losses" formTitleCn="资本利得与损失"
      subtitle="(Attach to Form 1040) · Use Form 8949 to list transactions"
      ombNo="1545-0074"
    />
    <IRSSection title="Short-Term Capital Gains (≤ 1 year)" part="Part I" />
    {(i.capGainsST || 0) > 0 ? (
      <>
        <IRSRow lineNum="1a" label="Totals for transactions with basis reported" value={i.capGainsST} />
        <IRSRow lineNum="7" label="Net short-term capital gain or (loss)" cn="短期净额" value={i.capGainsST} bold />
      </>
    ) : (
      <IRSRow lineNum="7" label="Net short-term gain" value={0} sub="无短期交易" />
    )}

    <IRSSection title="Long-Term Capital Gains (> 1 year)" part="Part II" />
    {(i.capGainsLT || 0) > 0 ? (
      <>
        <IRSRow lineNum="8a" label="Totals for transactions with basis reported" value={i.capGainsLT} />
        <IRSRow lineNum="15" label="Net long-term capital gain or (loss)" value={i.capGainsLT} bold sub="享 0/15/20% 优惠税率" />
      </>
    ) : (
      <IRSRow lineNum="15" label="Net long-term gain" value={0} />
    )}

    <IRSSection title="Summary" cn="小结" part="Part III" />
    <IRSRow lineNum="16" label="Combine lines 7 and 15" cn="第 7 + 15 行合计（总资本利得）" value={(i.capGainsST || 0) + (i.capGainsLT || 0)} total bold sub="→ Form 1040 line 7" />

    <IRSFormFooter formNum="Schedule D (Form 1040)" pages="2025" />
  </div>
);

// ── Schedule E ──
const ScheduleEMock = ({ inputs: i, calc }) => {
  const rentals = (i.properties || []).filter(p => p.type === 'rental');
  return (
    <div style={{ fontFamily: F_FORM }}>
      <IRSFormHeader
        formName="Schedule E"
        formTitle="Supplemental Income and Loss" formTitleCn="补充收入与损失"
        subtitle="Rental Real Estate, Royalties, Partnerships, etc."
        ombNo="1545-0074"
      />
      <IRSSection title="Rental Real Estate and Royalties" part="Part I" />
      {rentals.length === 0 ? (
        <IRSRow lineNum="1" label="No rental properties" value={''} />
      ) : (
        rentals.map((p, idx) => {
          const rent = p.rentalIncome || 0;
          const exp = (p.rentalExpenses || 0) + (p.propertyTax || 0) + (p.mortInt || 0);
          const depr = p.depreciation || 0;
          const net = rent - exp - depr;
          const col = String.fromCharCode(65 + idx); // A, B, C
          return (
            <div key={idx} style={{ marginTop: idx > 0 ? 6 : 0 }}>
              <IRSRow lineNum={`${col}`} label={`Property ${col} · ${p.state || 'State'}`} value="" />
              <IRSRow lineNum="3" label="Rents received" cn="租金收入" value={rent} indent={1} />
              <IRSRow lineNum="5" label="Advertising" cn="广告费" value={0} indent={1} />
              <IRSRow lineNum="12" label="Mortgage interest paid" value={p.mortInt || 0} indent={1} />
              <IRSRow lineNum="14" label="Repairs" cn="维修" value={Math.round((p.rentalExpenses || 0) * 0.3)} indent={1} />
              <IRSRow lineNum="16" label="Taxes" value={p.propertyTax || 0} indent={1} />
              <IRSRow lineNum="18" label="Depreciation expense" value={depr} indent={1} />
              <IRSRow lineNum="20" label={`Total expenses (Property ${col})`} value={exp + depr} bold indent={1} />
              <IRSRow lineNum="26" label={`Income or (loss) — Property ${col}`} value={net} total bold indent={1} negative={net < 0} />
            </div>
          );
        })
      )}
      <IRSSection title="Summary" cn="小结" />
      <IRSRow lineNum="26" label="Total rental real estate income/(loss)" value={calc.rentalNet || 0} total bold sub="→ Sch 1 line 5" negative={(calc.rentalNet || 0) < 0} />

      <IRSFormFooter formNum="Schedule E (Form 1040)" pages="2025" />
    </div>
  );
};

// ── Schedule SE ──
const ScheduleSEMock = ({ inputs: i, calc }) => {
  const netSE = Math.max(0, (i.inc1099 || 0) - (i.expense1099 || 0));
  const seBase = netSE * 0.9235;
  const ssTax = Math.min(seBase, SS_WAGE_BASE_2025) * 0.124;
  const medTax = seBase * 0.029;
  const seTaxFull = ssTax + medTax;
  return (
    <div style={{ fontFamily: F_FORM }}>
      <IRSFormHeader
        formName="Schedule SE"
        formTitle="Self-Employment Tax" formTitleCn="自雇税"
        subtitle="(Attach to Form 1040)"
        ombNo="1545-0074"
      />
      <IRSSection title="Self-Employment Tax" cn="Part I · 自雇税计算" part="Part I" />
      <IRSRow lineNum="2" label="Net profit from Schedule C, line 31" value={netSE} />
      <IRSRow lineNum="3" label="Combine lines 1a, 1b, 2" value={netSE} bold />
      <IRSRow lineNum="4a" label="Multiply line 3 by 92.35% (0.9235)" value={seBase} sub="补偿因子" />
      <IRSRow lineNum="6" label="Net earnings from self-employment" value={seBase} bold />
      <IRSRow lineNum="7" label="Maximum subject to SS tax (2025)" value={SS_WAGE_BASE_2025} />
      <IRSRow lineNum="8a" label="Total SS wages from W-2" value={Math.min(i.w2 || 0, SS_WAGE_BASE_2025)} />
      <IRSRow lineNum="9" label="Subtract line 8d from line 7" value={Math.max(0, SS_WAGE_BASE_2025 - Math.min(i.w2 || 0, SS_WAGE_BASE_2025))} />
      <IRSRow lineNum="10" label="SS portion: smaller of 6 or 9, × 12.4%" value={ssTax} bold />
      <IRSRow lineNum="11" label="Medicare portion: line 6 × 2.9%" value={medTax} bold />
      <IRSRow lineNum="12" label="Self-employment tax. Add 10 + 11" value={seTaxFull} total bold sub="→ Sch 2 line 4" />
      <IRSRow lineNum="13" label="Deduction: line 12 × 50%" value={seTaxFull / 2} bold sub="→ Sch 1 line 15" />

      <IRSFormFooter formNum="Schedule SE (Form 1040)" pages="2025" />
    </div>
  );
};

// ── Form 8889 · HSA ──
const Form8889Mock = ({ inputs: i, calc }) => {
  const hsa = i.hsa || 0;
  const limit = i.filingStatus === 'MFJ' ? 8550 : 4300;
  return (
    <div style={{ fontFamily: F_FORM }}>
      <IRSFormHeader
        formName="Form 8889"
        formTitle="Health Savings Accounts (HSAs)" formTitleCn="健康储蓄账户 HSA"
        subtitle="(Attach to Form 1040)"
        ombNo="1545-1875"
      />
      <IRSSection title="HSA Contributions" cn="Part I · HSA 供款" part="Part I" />
      <IRSRow lineNum="1" label="Coverage under HDHP" value={i.hdhp ? 'Self-only / Family' : 'None'} />
      <IRSRow lineNum="2" label="HSA contributions (you, not employer)" value={hsa} />
      <IRSRow lineNum="3" label={`Limitation (${i.filingStatus === 'MFJ' ? 'family' : 'self'})`} value={limit} />
      <IRSRow lineNum="6" label="Allowed contribution" value={Math.min(hsa, limit)} bold />
      <IRSRow lineNum="13" label="HSA deduction (smaller of 2 or 12)" value={hsa} total bold sub="→ Sch 1 line 13" />

      <IRSSection title="Distributions" part="Part II" />
      <IRSRow lineNum="14a" label="Total distributions from HSA" value={0} sub="估算 · 无取款" />
      <IRSRow lineNum="15" label="Qualified medical expenses paid" value={0} />

      <IRSFormFooter formNum="Form 8889" pages="2025" />
    </div>
  );
};

// ── Form 8995 · QBI ──
const Form8995Mock = ({ inputs: i, calc }) => {
  const netSE = Math.max(0, (i.inc1099 || 0) - (i.expense1099 || 0));
  const seTaxHalf = netSE * 0.9235 * 0.153 / 2;
  const qbi = Math.max(0, netSE - seTaxHalf);
  const qbiDed = Math.round(qbi * 0.20);
  return (
    <div style={{ fontFamily: F_FORM }}>
      <IRSFormHeader
        formName="Form 8995"
        formTitle="Qualified Business Income Deduction (Simplified)"
        subtitle="Section 199A · Attach to Form 1040"
        ombNo="1545-2294"
      />
      <IRSSection title="QBI Computation" />
      <IRSRow lineNum="1i" label="Trade/business name (Sch C)" value="Schedule C 业务" />
      <IRSRow lineNum="1ii" label="Taxpayer identification number" value="EIN/SSN" />
      <IRSRow lineNum="1iii" label="Qualified business income or (loss)" cn="合格业务收入（QBI）" value={qbi} />
      <IRSRow lineNum="4" label="Total qualified business income" value={qbi} bold />
      <IRSRow lineNum="5" label="Multiply line 4 by 20%" cn="× 20% = QBI 扣除" value={qbiDed} bold />
      <IRSRow lineNum="11" label="Taxable income before QBI" value={calc.agi - calc.fedDed} />
      <IRSRow lineNum="13" label="Net capital gain" value={(i.capGainsLT || 0) + (calc.qualifiedDividends || 0)} />
      <IRSRow lineNum="14" label="Subtract 13 from 11" value={Math.max(0, calc.agi - calc.fedDed - ((i.capGainsLT || 0) + (calc.qualifiedDividends || 0)))} />
      <IRSRow lineNum="15" label="Multiply line 14 by 20% (income limit)" value={Math.max(0, calc.agi - calc.fedDed - ((i.capGainsLT || 0) + (calc.qualifiedDividends || 0))) * 0.2} />
      <IRSRow lineNum="15" label="QBI deduction (smaller of 5 or 14b)" value={Math.max(0, calc.agi - calc.fedDed - calc.fedTaxable)} total bold sub="→ Form 1040 line 13" />

      <IRSFormFooter formNum="Form 8995" pages="2025" />
    </div>
  );
};

// ── Form 8959 · Additional Medicare Tax ──
const Form8959Mock = ({ inputs: i, calc }) => {
  const threshold = i.filingStatus === 'MFJ' ? 250000 : 200000;
  const over = Math.max(0, calc.grossWages - threshold);
  return (
    <div style={{ fontFamily: F_FORM }}>
      <IRSFormHeader
        formName="Form 8959"
        formTitle="Additional Medicare Tax"
        subtitle="(Attach to Form 1040)"
        ombNo="1545-0074"
      />
      <IRSSection title="Additional Medicare Tax on Wages" part="Part I" />
      <IRSRow lineNum="1" label="Medicare wages from Form W-2" value={calc.grossWages} />
      <IRSRow lineNum="2" label={`Threshold (${i.filingStatus === 'MFJ' ? '$250,000 MFJ' : '$200,000 Single'})`} value={threshold} />
      <IRSRow lineNum="6" label="Subtract line 2 from line 1" cn="第 1 减 2 行" value={over} />
      <IRSRow lineNum="7" label="Additional Medicare Tax on wages (6 × 0.9%)" value={over * 0.009} bold />

      <IRSSection title="Total" part="Part V" />
      <IRSRow lineNum="18" label="Total Additional Medicare Tax" value={calc.addlMedicare || 0} total bold sub="→ Sch 2 line 11" />

      <IRSFormFooter formNum="Form 8959" pages="2025" />
    </div>
  );
};

// ── State form ──
const StateFormMock = ({ inputs: i, calc }) => {
  const state = i.state;
  const stateMap = {
    NY: { name: 'IT-201', title: 'New York State Resident Income Tax Return', dept: 'New York State Department of Taxation and Finance' },
    NJ: { name: 'NJ-1040', title: 'New Jersey Resident Income Tax Return', dept: 'New Jersey Division of Taxation' },
    CA: { name: 'CA-540', title: 'California Resident Income Tax Return', dept: 'California Franchise Tax Board' },
    CT: { name: 'CT-1040', title: 'Connecticut Resident Income Tax Return', dept: 'Connecticut Department of Revenue Services' },
    MA: { name: 'Form 1', title: 'Massachusetts Resident Income Tax Return', dept: 'Massachusetts Department of Revenue' },
  };
  const meta = stateMap[state] || { name: `${state}-State Return`, title: `${state} Resident Income Tax Return`, dept: `${state} Tax Authority` };
  return (
    <div style={{ fontFamily: F_FORM }}>
      <IRSFormHeader
        formName={meta.name}
        formTitle={meta.title}
        subtitle={meta.dept}
      />
      <IRSSection title="Income" cn="收入" />
      <IRSRow lineNum="1" label="Federal AGI (from 1040 line 11)" value={calc.agi} />
      <IRSRow lineNum="2" label={`${state} additions`} value={0} sub="州调整项" />
      <IRSRow lineNum="3" label={`${state} subtractions`} value={0} />
      <IRSRow lineNum="5" label={`${state} AGI`} value={calc.stateAGI || calc.agi} bold />

      <IRSSection title="Deductions" />
      <IRSRow lineNum="8" label={`${state} Standard deduction`} value={calc.stateDed || 0} />
      <IRSRow lineNum="10" label={`${state} Taxable income`} value={calc.stateTaxable || 0} bold />

      <IRSSection title="Tax" />
      <IRSRow lineNum="11" label={`${state} Tax (from tax table)`} value={calc.residentStateTax || calc.stateTax || 0} />
      {(calc.workStateTax || 0) > 0 && (
        <IRSRow lineNum="12" label={`Credit for taxes paid to ${i.workState}`} value={-(calc.crossStateCredit || 0)} sub="跨州抵免" />
      )}
      {(calc.localTax || 0) > 0 && (
        <IRSRow lineNum="13" label={`${calc.localRule?.label || 'Local'} city tax`} value={calc.localTax} />
      )}
      <IRSRow lineNum="20" label={`Total ${state} tax`} value={calc.stateTax} total bold />

      <IRSFormFooter formNum={meta.name} pages="2025" />
    </div>
  );
};

// Form Mockup 选择器
const formRegistry = {
  '1040': { component: Form1040Mock, label: 'Form 1040' },
  'sch1': { component: Schedule1Mock, label: 'Schedule 1' },
  'schA': { component: ScheduleAMock, label: 'Schedule A' },
  'schB': { component: ScheduleBMock, label: 'Schedule B' },
  'schC': { component: ScheduleCMock, label: 'Schedule C' },
  'schD': { component: ScheduleDMock, label: 'Schedule D' },
  'schE': { component: ScheduleEMock, label: 'Schedule E' },
  'schSE': { component: ScheduleSEMock, label: 'Schedule SE' },
  '8889': { component: Form8889Mock, label: 'Form 8889' },
  '8995': { component: Form8995Mock, label: 'Form 8995' },
  '8959': { component: Form8959Mock, label: 'Form 8959' },
  'state': { component: StateFormMock, label: 'State Return' },
};

const FormMockupModal = ({ formId, inputs, calc, onClose }) => {
  const [explainKey, setExplainKey] = useState(null);
  if (!formId) return null;
  const entry = formRegistry[formId];
  if (!entry) return null;
  const FormComponent = entry.component;
  // v51: map modal formId to EXPLAIN_REGISTRY key prefix
  const explainPrefix = {
    '1040': '1040', 'sch1': 'sch1', 'schA': 'schA', 'schB': 'schB',
    'schC': 'schC', 'schD': 'schD', 'schE': 'schE', 'schSE': 'schSE',
    '8889': '8889', '8995': '8995', '8959': '8959', 'state': 'state',
  }[formId];

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(13, 13, 13, 0.75)',
        display: 'flex', alignItems: 'stretch', justifyContent: 'center',
        padding: 0,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 440,
          maxHeight: '100vh',
          overflow: 'auto',
          background: IRS_BG,
          position: 'relative',
        }}
      >
        {/* 顶部关闭 bar */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 2,
          padding: '8px 12px',
          background: IRS_INK, color: IRS_BG,
          fontFamily: F_FORM,
          fontSize: 10, fontWeight: 600,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          letterSpacing: '0.08em',
        }}>
          <span>{entry.label} · 仿真预览</span>
          <button
            onClick={onClose}
            style={{
              background: 'transparent', border: `1px solid ${IRS_BG}55`,
              color: IRS_BG, cursor: 'pointer',
              fontSize: 10, padding: '2px 8px',
              fontFamily: F_FORM,
            }}
          >关闭 ×</button>
        </div>
        {/* 表格内容 · 通过 Context 传递 formId 和 openExplain */}
        <FormContext.Provider value={{
          formId: explainPrefix,
          openExplain: (key) => setExplainKey(key),
        }}>
          <div style={{ padding: '14px 12px 30px' }}>
            <FormComponent inputs={inputs} calc={calc} />
            <div style={{
              marginTop: 12, padding: '8px 10px',
              background: `${IRS_MUTE}15`,
              border: `1px dashed ${IRS_MUTE}66`,
              borderRadius: 3,
              fontFamily: F_FORM,
              fontSize: 9, color: IRS_MUTE, lineHeight: 1.5,
          }}>
            ※ 仿真数据 · 报税请用 TurboTax / CPA
          </div>
        </div>
        </FormContext.Provider>
        {/* v51: 行解释弹窗 · 叠加在表格之上 */}
        <ExplainModal
          entry={explainKey ? EXPLAIN_REGISTRY[explainKey] : null}
          onClose={() => setExplainKey(null)}
        />
      </div>
    </div>
  );
};

const WorksheetBody = ({ inputs: i, calc, onOpenBracket, filerLabel, onFormClick }) => {
  // 提取 / 计算本场景数字
  const w2 = i.w2 || 0;
  const spouseW2 = i.spouseW2 || 0;
  const totalW2 = w2 + spouseW2;
  const inc1099 = i.inc1099 || 0;
  const exp1099 = i.expense1099 || 0;
  const netSE = Math.max(0, inc1099 - exp1099);

  const seBase = netSE * 0.9235;
  const seTaxFull = seBase * 0.153;
  const seTaxHalf = seTaxFull / 2;

  const k401 = i.k401 || 0;
  const hsa = i.hsa || 0;

  // v34 投资收入
  const interest = i.interest || 0;
  const dividends = i.dividends || 0;
  const qualifiedDividends = calc.qualifiedDividends || 0;
  const ordinaryDividends = calc.ordinaryDividends || (dividends - qualifiedDividends);
  const capGainsLT = i.capGainsLT || 0;
  const capGainsST = i.capGainsST || 0;
  const hasInvestInc = (interest + dividends) > 0;
  const hasCapGains = (capGainsLT + capGainsST) > 0;
  const needsScheduleB = (interest + ordinaryDividends) > 1500;
  const needsScheduleD = hasCapGains;

  // v34 条件 Schedule 显示
  const rentalProps = (i.properties || []).filter(p => p.type === 'rental');
  const hasRental = rentalProps.length > 0;
  const hasHSA = hsa > 0 || i.hdhp;

  const stdDed = calc.stdDed;
  const filingLabel = i.filingStatus === 'MFJ' ? '夫妻合并 MFJ' : i.filingStatus === 'Single' ? '单身 Single' : i.filingStatus === 'HoH' ? '户主 HoH' : '已婚分报 MFS';
  const isSE = netSE > 0;

  // 动态 section 编号：§1 Gross Income 硬编码，之后动态递增
  let sectionNum = 2;
  const nextNum = () => String(sectionNum++);

  return (
    <>
      {/* 本场景头部（含 filer 标签） */}
      {filerLabel && (
        <div style={{
          marginTop: 12, marginBottom: 2,
          padding: '5px 10px',
          background: WORK_INK, color: WORK_BG,
          fontSize: 9, fontWeight: 700,
          letterSpacing: '0.12em', textTransform: 'uppercase',
          fontFamily: 'JetBrains Mono, ui-monospace, monospace',
          borderRadius: 3,
          textAlign: 'center',
        }}>
          § {filerLabel} · {filingLabel} · {i.state}{i.city === 'nyc' ? ' / NYC' : ''}
        </div>
      )}

      {/* "你需要填哪些表" 索引条 · 每个可点击进入仿真表 */}
      <div style={{
        marginTop: 6, marginBottom: 6,
        padding: '8px 10px',
        background: '#FFFFFF',
        border: `1px solid ${WORK_RULE}`,
        borderRadius: 3,
        fontFamily: 'JetBrains Mono, ui-monospace, monospace',
        fontSize: 9, color: WORK_INK, lineHeight: 1.55,
      }}>
        <div style={{
          color: WORK_MUTE, fontWeight: 700, letterSpacing: '0.1em',
          marginBottom: 5,
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        }}>
          <span>你需要填的表 · REQUIRED FORMS</span>
          <span style={{ fontSize: 8, color: WORK_ACCENT, fontStyle: 'italic' }}>
            点击查看仿真表格 →
          </span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {(() => {
            const badges = [];
            const add = (id, label, accent = false) => badges.push(
              <button
                key={id}
                onClick={() => onFormClick && onFormClick(id)}
                style={{
                  background: accent ? WORK_ACCENT : WORK_INK,
                  color: WORK_BG,
                  padding: '2px 7px',
                  borderRadius: 2,
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                  fontSize: 9, fontWeight: 600,
                  letterSpacing: '0.02em',
                  transition: 'opacity 0.15s',
                }}
              >{label}</button>
            );
            add('1040', 'Form 1040');
            add('sch1', 'Schedule 1');
            if (isSE) add('schC', 'Schedule C');
            if (isSE) add('schSE', 'Schedule SE');
            if (needsScheduleB) add('schB', 'Schedule B');
            if (needsScheduleD) add('schD', 'Schedule D');
            if (hasRental) add('schE', 'Schedule E');
            if (calc.useItemize) add('schA', 'Schedule A');
            if (hasHSA) add('8889', 'Form 8889');
            if (isSE) add('8995', 'Form 8995');
            if ((calc.addlMedicare || 0) > 0) add('8959', 'Form 8959');
            const stateLabel = i.state === 'NY' ? 'IT-201'
              : i.state === 'NJ' ? 'NJ-1040'
              : i.state === 'CA' ? 'CA-540'
              : i.state === 'CT' ? 'CT-1040'
              : i.state === 'MA' ? 'Form 1'
              : `${i.state}-State`;
            add('state', stateLabel, true);
            return badges;
          })()}
        </div>
      </div>

      {/* § 1 · GROSS INCOME · 扩展版含投资 */}
      <WSection num="1" title="毛收入 · Gross Income" formRef="Form 1040 line 1-9" />
      {w2 > 0 && <WLine label="工资 · Wages (W2 · line 1a)" value={w2} indent={1} />}
      {spouseW2 > 0 && <WLine label="配偶工资 · W2 (line 1a)" value={spouseW2} indent={1} />}
      {interest > 0 && <WLine label="利息 · Interest (line 2b)" value={interest} indent={1} suffix="→ Sch B" />}
      {dividends > 0 && (
        <>
          <WLine label="股息 · Dividends (line 3b)" value={dividends} indent={1} suffix="→ Sch B" />
          {qualifiedDividends > 0 && <WLine label="其中合格股息 (line 3a)" value={qualifiedDividends} indent={2} muted />}
        </>
      )}
      {capGainsLT > 0 && <WLine label="长期资本利得 · LT Capital Gains (line 7)" value={capGainsLT} indent={1} suffix="→ Sch D" />}
      {capGainsST > 0 && <WLine label="短期资本利得 · ST Capital Gains (line 7)" value={capGainsST} indent={1} suffix="→ Sch D" />}
      {inc1099 > 0 && <WLine label="自雇毛收入 · 1099-NEC (Sch 1 line 3)" value={inc1099} indent={1} suffix="→ Sch C" />}
      {(calc.rentalGainToAGI || 0) > 0 && <WLine label="出租净收益 (Sch 1 line 5)" value={calc.rentalGainToAGI} indent={1} suffix="→ Sch E" />}
      <WSubtotal label="TOTAL INCOME · Form 1040 line 9" value={calc.grossWages} />

      {/* Schedule B · 条件显示 */}
      {hasInvestInc && (
        <>
          <WSection num={nextNum()} title="利息 + 股息 · Schedule B" formRef="Schedule B" />
          <div style={{
            margin: '4px 0 6px', padding: '7px 9px',
            background: '#FFFFFF99',
            border: `1px solid ${WORK_RULE}`,
            borderRadius: 4,
            fontFamily: 'JetBrains Mono, ui-monospace, monospace',
            fontSize: 9, color: WORK_INK, lineHeight: 1.55,
          }}>
            <b>Schedule B 什么时候要填？</b>
            <div style={{ marginTop: 3 }}>
              利息 + 普通股息 <b>{'>'}${1500}</b> 就要填 Sch B 详细列出每个付款方 (银行/券商)。
              {needsScheduleB
                ? ` 你的利息+普通股息 = $${Math.round(interest + ordinaryDividends).toLocaleString()} · 需要填。`
                : ` 你的利息+普通股息 = $${Math.round(interest + ordinaryDividends).toLocaleString()} · 还不需要填。`}
            </div>
          </div>
          {interest > 0 && (
            <>
              <WLine label="Part I · Interest 利息" value="" indent={0} muted />
              <WLine label="银行 / HYSA / CD / 国债" value={interest} indent={2} />
              <WSubtotal label="Total Interest · line 2" value={interest} />
            </>
          )}
          {dividends > 0 && (
            <>
              <div style={{ height: 4 }} />
              <WLine label="Part II · Dividends 股息" value="" indent={0} muted />
              {qualifiedDividends > 0 && <WLine label="Qualified Div · 合格股息 (line 3a)" value={qualifiedDividends} indent={2} suffix="优惠税率" />}
              {ordinaryDividends > 0 && <WLine label="Ordinary Div · 普通股息" value={ordinaryDividends} indent={2} suffix="按普通税率" />}
              <WSubtotal label="Total Ordinary Dividends · line 6" value={dividends} />
            </>
          )}
          <WNote>利息 + 普通股息 进入 1040 · 合格股息享受 0/15/20% 优惠税率</WNote>
        </>
      )}

      {/* Schedule D · 条件显示 */}
      {hasCapGains && (
        <>
          <WSection num={nextNum()} title="资本利得 · Schedule D" formRef="Schedule D + 8949" />
          <div style={{
            margin: '4px 0 6px', padding: '7px 9px',
            background: '#FFFFFF99',
            border: `1px solid ${WORK_RULE}`,
            borderRadius: 4,
            fontFamily: 'JetBrains Mono, ui-monospace, monospace',
            fontSize: 9, color: WORK_INK, lineHeight: 1.55,
          }}>
            <b>为什么 LT 比 ST 更省？</b>
            <div style={{ marginTop: 3 }}>
              持有 <b>{'>'} 1 年</b> 卖出 = <b>LT 长期</b> · 优惠税率 <b>0% / 15% / 20%</b><br/>
              持有 <b>≤ 1 年</b> 卖出 = <b>ST 短期</b> · 按普通税率 (最高 37%)<br/>
              同样 $100K gain, LT 可能只交 $15K, ST 可能交 $37K。
            </div>
          </div>
          {capGainsST > 0 && (
            <>
              <WLine label="Part I · Short-Term (≤1年)" value="" indent={0} muted />
              <WLine label="ST Cap Gains · 按普通税率" value={capGainsST} indent={2} />
              <WSubtotal label="Net ST Gain" value={capGainsST} />
            </>
          )}
          {capGainsLT > 0 && (
            <>
              <div style={{ height: 4 }} />
              <WLine label="Part II · Long-Term ({'>'}1年)" value="" indent={0} muted />
              <WLine label="LT Cap Gains · 优惠税率" value={capGainsLT} indent={2} suffix="0/15/20%" />
              <WSubtotal label="Net LT Gain" value={capGainsLT} />
            </>
          )}
          <div style={{ height: 4 }} />
          {/* LT Bracket 展示当前收入在哪档 */}
          {capGainsLT > 0 && (
            <div style={{
              marginLeft: 14, padding: '6px 8px',
              background: `${WORK_ACCENT}0F`,
              border: `1px dashed ${WORK_ACCENT}66`,
              borderRadius: 3,
              fontSize: 9, fontFamily: 'JetBrains Mono, ui-monospace, monospace',
              color: WORK_INK, lineHeight: 1.5,
            }}>
              <div style={{ color: WORK_ACCENT, fontWeight: 700, marginBottom: 3 }}>
                你的 LT 优惠税率档位 · 2025 {filingLabel}
              </div>
              {(calc.ltCGBrackets || []).map(([thresh, rate], idx) => {
                const prev = idx === 0 ? 0 : calc.ltCGBrackets[idx-1][0];
                const label = thresh === Infinity ? `>$${(prev/1000)}K` : `$${(prev/1000)}K – $${(thresh/1000)}K`;
                const active = calc.fedTaxable >= prev && (thresh === Infinity || calc.fedTaxable < thresh);
                return (
                  <div key={idx} style={{
                    display: 'flex', justifyContent: 'space-between',
                    fontWeight: active ? 700 : 400,
                    color: active ? WORK_INK : WORK_MUTE,
                  }}>
                    <span>{active ? '→ ' : '  '}{label}</span>
                    <span>{(rate * 100).toFixed(0)}%</span>
                  </div>
                );
              })}
            </div>
          )}
          <WNote>应税收入决定 LT 档位 · Qualified Dividends 同 LT 共享优惠税率</WNote>
        </>
      )}

      {/* § Schedule C (原有，动态编号) */}
      {isSE && (
        <>
          <WSection num={nextNum()} title="自雇损益 · Schedule C" formRef="Form 1040-SE" />
          <WLine label="1099 毛收入 · line 1" value={inc1099} indent={1} />
          <WLine label="业务开支 · line 28 (合计)" value={exp1099} indent={1} sign="−" muted />
          <WSubtotal label="NET SE INCOME · 行 31" value={netSE} />
          <WNote>Schedule C 行 31 → Schedule 1 行 3 → 同时做 Schedule SE 基数</WNote>
        </>
      )}

      {/* Schedule E · 条件显示 */}
      {hasRental && (
        <>
          <WSection num={nextNum()} title="出租物业 · Schedule E" formRef="Schedule E" />
          {rentalProps.map((p, idx) => {
            const rentInc = p.rentalIncome || 0;
            const rentExp = (p.rentalExpenses || 0) + (p.propertyTax || 0) + (p.mortInt || 0);
            const depr = p.depreciation || 0;
            const netRent = rentInc - rentExp - depr;
            return (
              <div key={idx} style={{
                marginTop: idx > 0 ? 8 : 2, paddingTop: 2,
                borderTop: idx > 0 ? `1px dotted ${WORK_RULE}` : 'none',
              }}>
                <WLine label={`Property ${String.fromCharCode(65 + idx)} · ${p.state || 'State'}`} value="" indent={0} muted />
                <WLine label="租金收入 · Rents received (line 3)" value={rentInc} indent={2} />
                <WLine label="运营开支 (tax/mortgage/repairs)" value={rentExp} indent={2} sign="−" muted />
                <WLine label="折旧 · Depreciation (line 18)" value={depr} indent={2} sign="−" muted />
                <WSubtotal label={`Net · Property ${String.fromCharCode(65 + idx)}`} value={netRent} />
              </div>
            );
          })}
          <div style={{ height: 4 }} />
          <WLine label="Total Rental Income/(Loss)" value={calc.rentalNet || 0} indent={1} bold />
          {(calc.rentalLossSuspended || 0) < 0 && (
            <WNote>被动活动损失 (PAL) 规则：亏损 ${Math.abs(calc.rentalLossSuspended).toLocaleString()} 暂停抵扣 · 结转到未来有 passive income 时用</WNote>
          )}
          {(calc.rentalGainToAGI || 0) > 0 && (
            <WNote>净收益 → Schedule 1 行 5 → 1040 AGI</WNote>
          )}
        </>
      )}

      {/* § Schedule SE (原有) */}
      {isSE && (
        <>
          <WSection num={nextNum()} title="自雇税 · Self-Employment Tax" formRef="Schedule SE" />
          <div style={{
            margin: '4px 0 6px', padding: '7px 9px',
            background: '#FFFFFF99',
            border: `1px solid ${WORK_RULE}`,
            borderRadius: 4,
            fontFamily: 'JetBrains Mono, ui-monospace, monospace',
            fontSize: 9, color: WORK_INK, lineHeight: 1.55,
          }}>
            <div style={{ marginBottom: 4, color: WORK_MUTE }}>
              <b style={{ color: WORK_INK }}>为什么自雇要多交 15.3%？</b>
            </div>
            <div>
              打工人（W2）的工资单上你只看到扣了 7.65%（SS 6.2% + Medicare 1.45%），
              另一半 <b>7.65% 是雇主替你付的</b>。自雇（1099）= 你既是员工又是老板，
              所以两边都要自己出 = <b>15.3%</b>。
            </div>
          </div>
          <WLine label="第 1 步：Net SE × 92.35%" value={seBase} indent={1} />
          <WNote>92.35% = 1 − 7.65% ÷ 2 · 补偿因子</WNote>
          <div style={{ height: 4 }} />
          <WLine label="第 2 步：拆分 SS + Medicare" value="" indent={0} muted />
          <WLine label="Social Security 12.4% (≤ $176,100)" value={Math.min(seBase, SS_WAGE_BASE_2025) * 0.124} indent={2} />
          <WLine label="Medicare 2.9% (无上限)" value={seBase * 0.029} indent={2} />
          <WSubtotal label="SE TAX · Schedule SE 行 12" value={seTaxFull} />
          <div style={{ height: 4 }} />
          <WLine label="第 3 步：½ SE Tax 反扣 AGI" value={seTaxHalf} indent={1} sign="→" />
          <WNote>IRS 规定一半 SE Tax 可从 AGI 扣除</WNote>
        </>
      )}

      {/* Form 8889 · HSA 条件显示 */}
      {hasHSA && (
        <>
          <WSection num={nextNum()} title="HSA · Form 8889" formRef="Form 8889" />
          <div style={{
            margin: '4px 0 6px', padding: '7px 9px',
            background: '#FFFFFF99',
            border: `1px solid ${WORK_RULE}`,
            borderRadius: 4,
            fontFamily: 'JetBrains Mono, ui-monospace, monospace',
            fontSize: 9, color: WORK_INK, lineHeight: 1.55,
          }}>
            <b>HSA · 三重免税魔法</b>
            <div style={{ marginTop: 3 }}>
              <b>1. 存进去免税</b> (直接扣 AGI) · <b>2. 增长免税</b> (投资收益不交) · <b>3. 用于医疗取出免税</b>。
              65 岁后可当 IRA 用（交普通税但不罚款）。
            </div>
          </div>
          <WLine label={`你的供款 (${i.filingStatus === 'MFJ' ? 'MFJ family' : 'Self-only'})`} value={hsa} indent={1} />
          <WLine label={`2025 上限 · ${i.filingStatus === 'MFJ' ? '$8,550 family' : '$4,300 self'}`}
            value={i.filingStatus === 'MFJ' ? 8550 : 4300} indent={2} muted />
          {hsa < (i.filingStatus === 'MFJ' ? 8550 : 4300) && i.hdhp && (
            <WNote>你还可以多存 ${((i.filingStatus === 'MFJ' ? 8550 : 4300) - hsa).toLocaleString()} 到上限</WNote>
          )}
          <WSubtotal label="HSA Deduction · 行 13 → Sch 1 line 13" value={hsa} />
        </>
      )}

      {/* § AGI (动态编号) */}
      <WSection num={nextNum()} title="调整总收入 · AGI" formRef="Form 1040 line 11" />
      {totalW2 > 0 && <WLine label="W2 工资" value={totalW2} indent={1} />}
      {netSE > 0 && <WLine label="Net SE Income" value={netSE} indent={1} />}
      {interest > 0 && <WLine label="利息" value={interest} indent={1} />}
      {dividends > 0 && <WLine label="股息" value={dividends} indent={1} />}
      {(capGainsLT + capGainsST) > 0 && <WLine label="资本利得" value={capGainsLT + capGainsST} indent={1} />}
      {(calc.rentalGainToAGI || 0) > 0 && <WLine label="出租净收益" value={calc.rentalGainToAGI} indent={1} />}
      <WLine label="── 以上 AGI 之前合计 ──" value={calc.grossWages} indent={0} muted />
      {k401 > 0 && <WLine label="W2 401(k) · 税前" value={k401} indent={1} sign="−" muted />}
      {hsa > 0 && <WLine label="HSA 供款 (Form 8889)" value={hsa} indent={1} sign="−" muted />}
      {seTaxHalf > 0 && <WLine label="½ SE Tax" value={seTaxHalf} indent={1} sign="−" muted />}
      <WSubtotal label="ADJUSTED GROSS INCOME (AGI)" value={calc.agi} />

      {/* § Deductions · Schedule A 详细 */}
      <WSection num={nextNum()} title="扣除方式 · Standard vs Itemize" formRef={calc.useItemize ? 'Schedule A' : '无 Schedule'} />
      <WLine label={`Standard Deduction · ${filingLabel} 2025`} value={stdDed} indent={1} />
      <div style={{ paddingLeft: 14, marginTop: 4 }}>
        <div style={{ fontSize: 10, color: WORK_MUTE, fontFamily: 'JetBrains Mono, ui-monospace, monospace' }}>
          vs Itemize (Schedule A · 分明细):
        </div>
      </div>
      {/* SALT 详细 */}
      <WLine label="▸ 州税 + 地税 · SALT (line 5a-5d)" value="" indent={2} muted />
      <WLine label="州所得税估算" value={calc.estStateTax || 0} indent={3} muted />
      <WLine label="地产税 · Property Tax" value={calc.totalPropTaxSchedA || 0} indent={3} muted />
      <WLine label="SALT 原始合计" value={calc.saltRaw || 0} indent={3} />
      {calc.saltLost > 0 && (
        <>
          <WLine label={`SALT Cap 限制 · $${(calc.saltCap || 10000).toLocaleString()}`} value={-calc.saltLost} indent={3} sign="−" muted />
          <WNote>超出 SALT Cap 的 ${calc.saltLost.toLocaleString()} 损失 · 高税州常见</WNote>
        </>
      )}
      <WLine label="SALT 可抵合计 (line 5e)" value={calc.saltCapped || 0} indent={3} bold />
      {/* 房贷利息 */}
      {(calc.mortInt || 0) > 0 && (
        <>
          <WLine label="▸ 房贷利息 · Home Mortgage Interest (line 8a)" value={calc.mortInt || 0} indent={2} />
          <WNote>$750K 贷款本金上限 · 2017 年前购房按旧规则 $1M</WNote>
        </>
      )}
      {/* 慈善 */}
      {(calc.charity || 0) > 0 && (
        <>
          <WLine label="▸ 慈善捐赠 · Charity (line 11-14)" value={calc.charity || 0} indent={2} />
          <WNote>现金捐赠 ≤ AGI 60% · 物品捐赠 ≤ AGI 50% · 只对 501(c)(3)</WNote>
        </>
      )}
      {/* 医疗 */}
      {(calc.medicalExp || 0) > 0 && (
        <>
          <WLine label="▸ 合格医疗 · Medical (line 1-4)" value={calc.medicalExp} indent={2} />
          <WNote>仅超过 AGI × 7.5% 的部分可抵扣</WNote>
        </>
      )}
      <WLine label="Itemize 总和 (line 17)" value={calc.itemized || 0} indent={1} bold />
      <WSubtotal label={`→ 选用 ${calc.useItemize ? 'Itemize (更优)' : 'Standard (更优)'}`} value={calc.fedDed} />
      {!calc.useItemize && (calc.itemized || 0) > 0 && (
        <WNote>Standard ${stdDed.toLocaleString()} {'>'} Itemize ${(calc.itemized || 0).toLocaleString()} · 不填 Schedule A</WNote>
      )}

      {/* § QBI */}
      {isSE && (
        <>
          <WSection num={nextNum()} title="QBI 扣除 · Section 199A" formRef="Form 8995" />
          <WLine label="合格 SE 收入 (net - ½SE)" value={netSE - seTaxHalf} indent={1} />
          <WLine label="× 20%" value={(netSE - seTaxHalf) * 0.2} indent={1} />
          <WLine label="受 Taxable Income 限制" value="lesser of" indent={1} muted />
          <WSubtotal label="QBI DEDUCTION · 估算" value={Math.max(0, calc.agi - calc.fedDed - calc.fedTaxable)} />
          <WNote>若总收入 {'>'} $232,100 (Single) / $464,200 (MFJ) 可能有 SSTB 限制</WNote>
        </>
      )}

      {/* § Taxable Income */}
      <WSection num={nextNum()} title="应税收入 · Taxable Income" formRef="Form 1040 line 15" />
      <WLine label="AGI" value={calc.agi} indent={1} />
      <WLine label={`${calc.useItemize ? 'Itemize' : 'Standard'} Deduction`} value={calc.fedDed} indent={1} sign="−" muted />
      {isSE && <WLine label="QBI Deduction (est.)" value={Math.max(0, calc.agi - calc.fedDed - calc.fedTaxable)} indent={1} sign="−" muted />}
      {/* v96: OBBBA 2025 新 4 项 deduction · 仅当触发才显示 */}
      {(calc.tipsDeduction || 0) > 0 && (
        <>
          <WLine label="OBBBA · No Tax on Tips (§224)" value={calc.tipsDeduction} indent={1} sign="−" muted />
          <WNote>合格小费 最多 $25K · MAGI > $150K/$300K phase-out · 2025-2028 临时</WNote>
        </>
      )}
      {(calc.overtimeDeduction || 0) > 0 && (
        <>
          <WLine label="OBBBA · No Tax on Overtime (§225)" value={calc.overtimeDeduction} indent={1} sign="−" muted />
          <WNote>只免 premium 部分（time-and-half 的 0.5x）· Single $12.5K / MFJ $25K · 非豁免员工</WNote>
        </>
      )}
      {(calc.seniorBonus || 0) > 0 && (
        <>
          <WLine label="OBBBA · Senior Bonus 65+ (§70103)" value={calc.seniorBonus} indent={1} sign="−" muted />
          <WNote>65+ 每人 $6K · phase-out MAGI > $75K/$150K · 标扣 / itemize 都叠加</WNote>
        </>
      )}
      {(calc.carLoanInterestDeduction || 0) > 0 && (
        <>
          <WLine label="OBBBA · Car Loan Interest (美装车)" value={calc.carLoanInterestDeduction} indent={1} sign="−" muted />
          <WNote>2025+ 发起的美装车贷款 · 最多 $10K · phase-out MAGI > $100K/$200K</WNote>
        </>
      )}
      <WSubtotal label="TAXABLE INCOME" value={calc.fedTaxable} />

      {/* § Fed Tax · 拆分 ordinary + preferential */}
      <WSection num={nextNum()} title="联邦所得税 · Federal Income Tax" formRef="Form 1040 line 16" />
      {(calc.preferentialIncome || 0) > 0 && (
        <div style={{
          margin: '4px 0 6px', padding: '7px 9px',
          background: '#FFFFFF99',
          border: `1px solid ${WORK_RULE}`,
          borderRadius: 4,
          fontFamily: 'JetBrains Mono, ui-monospace, monospace',
          fontSize: 9, color: WORK_INK, lineHeight: 1.55,
        }}>
          <b>为什么分两部分算？</b>
          <div style={{ marginTop: 3 }}>
            普通收入（W2/利息）按递进税率 10-37%。<br/>
            <b>合格股息 + LT 资本利得</b> 享受优惠税率 <b>0/15/20%</b>。<br/>
            IRS "stacking" 方法：先把优惠部分 "堆" 在普通收入之上，再给它适用 LT 档位。
          </div>
        </div>
      )}
      {/* 普通税率部分 */}
      {(calc.preferentialIncome || 0) > 0 && (
        <WLine label={`普通税率部分 · $${Math.max(0, calc.fedTaxable - calc.preferentialIncome).toLocaleString()}`}
          value={calc.fedTaxOrdinary || 0} indent={1} />
      )}
      <button
        onClick={() => onOpenBracket && onOpenBracket('fed', { inputs: i, calc })}
        style={{
          width: 'calc(100% - 14px)', textAlign: 'left',
          background: '#FFFFFF', border: `1px dashed ${WORK_ACCENT}66`,
          borderRadius: 4, padding: '6px 10px', cursor: 'pointer',
          fontFamily: 'JetBrains Mono, ui-monospace, monospace',
          marginLeft: 14, marginTop: 3, marginBottom: 3,
          display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
          fontSize: 10,
        }}
      >
        <span style={{ color: WORK_INK }}>
          按 2025 联邦税率表逐档累加 <span style={{
            color: WORK_ACCENT, fontWeight: 700,
            border: `1px solid ${WORK_ACCENT}66`,
            borderRadius: 3, padding: '1px 6px', marginLeft: 4,
            fontSize: 9, letterSpacing: '0.05em',
          }}>详细 →</span>
        </span>
        <span style={{ fontWeight: 700 }}>${Math.round(calc.fedTaxOrdinary || calc.fedTax).toLocaleString()}</span>
      </button>
      {/* 优惠税率部分 */}
      {(calc.preferentialIncome || 0) > 0 && (
        <>
          <WLine label={`优惠税率部分 · $${Math.round(calc.preferentialIncome).toLocaleString()}`}
            value={calc.fedTaxPref || 0} indent={1} />
          <WNote>LT 资本利得 + 合格股息 · 实际税率 {calc.preferentialIncome > 0 ? ((calc.fedTaxPref / calc.preferentialIncome * 100).toFixed(1)) : 0}%</WNote>
        </>
      )}
      <WLine label={`边际税率 · ${(calc.marginalFed * 100).toFixed(1)}%`} value="" indent={1} muted />
      <WSubtotal label="FEDERAL INCOME TAX · 合计" value={calc.fedTax} />

      {/* § Other Federal */}
      <WSection num={nextNum()} title="其他联邦税 · Other Fed Taxes" formRef={(calc.addlMedicare || 0) > 0 ? 'Schedule 2 + Form 8959' : 'Schedule 2'} />
      {(calc.ssTax || 0) > 0 && <WLine label="Social Security 6.2% (W2)" value={calc.ssTax} indent={1} />}
      {(calc.medicareTax || 0) > 0 && <WLine label="Medicare 1.45% (W2)" value={calc.medicareTax} indent={1} />}
      {(calc.addlMedicare || 0) > 0 && (
        <>
          <WLine label="Additional Medicare 0.9% · Form 8959" value={calc.addlMedicare} indent={1} />
          <WNote>收入超过 $200K (Single) / $250K (MFJ) 的部分 · 加收 0.9% · 要填 Form 8959</WNote>
        </>
      )}
      {isSE && <WLine label="SE Tax · Schedule SE" value={seTaxFull} indent={1} />}

      {/* § State */}
      <WSection num={nextNum()} title={`州税 · ${i.state}`} formRef={i.state === 'NY' ? 'IT-201' : i.state === 'NJ' ? 'NJ-1040' : i.state === 'CA' ? 'CA-540' : `${i.state} State Return`} />
      <WLine label="State AGI" value={calc.stateAGI || calc.agi} indent={1} />
      <WLine label="State Deduction" value={calc.stateDed || 0} indent={1} sign="−" muted />
      <WLine label="State Taxable" value={calc.stateTaxable || 0} indent={1} />
      <button
        onClick={() => onOpenBracket && onOpenBracket('state', { inputs: i, calc })}
        style={{
          width: 'calc(100% - 14px)', textAlign: 'left',
          background: '#FFFFFF', border: `1px dashed ${WORK_ACCENT}66`,
          borderRadius: 4, padding: '6px 10px', cursor: 'pointer',
          fontFamily: 'JetBrains Mono, ui-monospace, monospace',
          marginLeft: 14, marginTop: 3, marginBottom: 3,
          display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
          fontSize: 10,
        }}
      >
        <span style={{ color: WORK_INK }}>
          按 {i.state} 州税率表逐档 <span style={{
            color: WORK_ACCENT, fontWeight: 700,
            border: `1px solid ${WORK_ACCENT}66`,
            borderRadius: 3, padding: '1px 6px', marginLeft: 4,
            fontSize: 9, letterSpacing: '0.05em',
          }}>详细 →</span>
        </span>
        <span style={{ fontWeight: 700 }}>${Math.round(calc.residentStateTax || calc.stateTax || 0).toLocaleString()}</span>
      </button>
      {(calc.workStateTax || 0) > 0 && (
        <>
          <WLine label={`非居民州税 · ${i.workState} (IT-203)`} value={calc.workStateTax} indent={1} />
          <WLine label="居住州税抵免" value={-(calc.crossStateCredit || 0)} indent={1} muted />
          <WNote>跨州工作：先付非居民州，居住州给 credit 避免双重征税</WNote>
        </>
      )}
      {/* v93: CA Mental Health Tax · 1% on taxable > $1M */}
      {(calc.caMHT || 0) > 0 && (
        <>
          <WLine label="CA Mental Health Tax · 1% on > $1M" value={calc.caMHT} indent={1} />
          <WNote>Prop 63 · taxable income 超过 $1M 部分加 1% · 所有 filing status 同阈值</WNote>
        </>
      )}
      {/* v93: CA SDI · 1.2% no ceiling since 2024 */}
      {(calc.caSDI || 0) > 0 && (
        <>
          <WLine label="CA SDI · 1.2% 全部 W2 工资（无上限）" value={calc.caSDI} indent={1} />
          <WNote>州残疾保险 · 2024+ 工资上限取消 · W2 全额 × 1.2%</WNote>
        </>
      )}
      <WSubtotal label="STATE TAX" value={calc.stateTax} />

      {/* Local */}
      {(calc.localTax || 0) > 0 && (
        <>
          <WSection num={nextNum()} title={`市税 · ${calc.localRule?.label || 'Local'}`} />
          <WLine label={`${calc.localRule?.label} 市税率`} value={calc.localTax} indent={1} />
          <WSubtotal label="LOCAL TAX" value={calc.localTax} />
        </>
      )}

      {/* Final */}
      <WSection num="" title="最终账单 · Total Tax Bill" formRef="" />
      <WLine label="联邦所得税" value={calc.fedTax} indent={1} />
      {(calc.fica || 0) > 0 && <WLine label="FICA (SS + Medicare)" value={calc.fica} indent={1} />}
      {(calc.seTax || 0) > 0 && <WLine label="SE Tax" value={calc.seTax} indent={1} />}
      <WLine label={`州税 (${i.state})`} value={calc.stateTax - (calc.localTax || 0)} indent={1} />
      {(calc.localTax || 0) > 0 && <WLine label={`市税 (${calc.localRule?.label})`} value={calc.localTax} indent={1} />}
      <WTotal label="TOTAL TAX" value={calc.totalTax} />

      <div style={{
        marginTop: 8, padding: '6px 8px',
        background: `${WORK_ACCENT}0F`,
        border: `1px solid ${WORK_ACCENT}44`,
        borderRadius: 4,
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        fontFamily: 'JetBrains Mono, ui-monospace, monospace',
        fontSize: 10,
      }}>
        <span style={{ color: WORK_MUTE }}>有效税率 · Effective Rate</span>
        <span style={{ color: WORK_ACCENT, fontWeight: 700 }}>{(calc.effectiveRate * 100).toFixed(2)}%</span>
      </div>
      <div style={{
        marginTop: 4, padding: '6px 8px',
        background: `#0F7C4A0F`,
        border: `1px solid #0F7C4A44`,
        borderRadius: 4,
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        fontFamily: 'JetBrains Mono, ui-monospace, monospace',
        fontSize: 10,
      }}>
        <span style={{ color: WORK_MUTE }}>税后到手 · Take Home</span>
        <span style={{ color: '#0F7C4A', fontWeight: 700 }}>${Math.round(calc.takeHome).toLocaleString()}</span>
      </div>
    </>
  );
};


// ═══════════════════════════════════════════════════════════
//  TaxWorksheet · 模态弹窗 · 带申报状态切换
// ═══════════════════════════════════════════════════════════

const TaxWorksheet = ({ inputs: i, calc, open, onClose }) => {
  const [openModal, setOpenModal] = useState(null); // 'fed' | 'state' | null
  const [bracketCtx, setBracketCtx] = useState(null); // { inputs, calc } for clicked scenario
  const [openForm, setOpenForm] = useState(null); // form id for mockup modal
  const [formCtx, setFormCtx] = useState(null); // { inputs, calc } for the clicked form's scenario
  const [viewFilingStatus, setViewFilingStatus] = useState('current'); // 'current' | 'MFS' | 'twoSingle'
  const [whatifOpen, setWhatifOpen] = useState(false); // v47: 对比表默认折叠

  // v106: CA 模式标记 · early return 必须放在所有 hooks 之后 · 见下面 useMemo 后
  const isCA = calc?._country === 'CA';

  const canSwitch = i?.filingStatus === 'MFJ' && (i?.spouseW2 > 0);

  const filingScenarios = useMemo(() => {
    if (!canSwitch) return null;

    const splitHalf = (v) => (v || 0) / 2;
    const floorHalf = (n) => Math.floor((n || 0) / 2);
    const ceilHalf = (n) => Math.ceil((n || 0) / 2);
    const splitProps = (props) => (props || []).map(p => ({
      ...p,
      propertyTax: splitHalf(p.propertyTax),
      mortInt: splitHalf(p.mortInt),
      rentalIncome: splitHalf(p.rentalIncome),
      rentalExpenses: splitHalf(p.rentalExpenses),
      depreciation: splitHalf(p.depreciation),
    }));

    const mfsAInputs = {
      ...i, filingStatus: 'MFS',
      w2: i.w2, spouseW2: 0,
      inc1099: i.inc1099, expense1099: i.expense1099,
      k401: i.k401, hsa: splitHalf(i.hsa),
      children: floorHalf(i.children),
      properties: splitProps(i.properties),
      charity: splitHalf(i.charity), medical: splitHalf(i.medical),
    };
    const mfsBInputs = {
      ...i, filingStatus: 'MFS',
      w2: i.spouseW2, spouseW2: 0,
      inc1099: 0, expense1099: 0,
      k401: 0, hsa: splitHalf(i.hsa),
      children: ceilHalf(i.children),
      properties: splitProps(i.properties),
      charity: splitHalf(i.charity), medical: splitHalf(i.medical),
    };
    const singleAInputs = { ...mfsAInputs, filingStatus: 'Single' };
    const singleBInputs = { ...mfsBInputs, filingStatus: 'Single' };

    return {
      current: {
        label: 'MFJ · 夫妻合并申报',
        primary: { inputs: i, calc, label: '合并申报' },
      },
      MFS: {
        label: 'MFS · 已婚分开申报',
        primary: { inputs: mfsAInputs, calc: computeTax(mfsAInputs), label: '主申报人' },
        secondary: { inputs: mfsBInputs, calc: computeTax(mfsBInputs), label: '配偶' },
      },
      twoSingle: {
        label: '2×Single · 未婚情侣分别申报',
        primary: { inputs: singleAInputs, calc: computeTax(singleAInputs), label: '你 (Single)' },
        secondary: { inputs: singleBInputs, calc: computeTax(singleBInputs), label: '伴侣 (Single)' },
      },
    };
  }, [i, calc, canSwitch]);

  if (!open) return null;

  // v108: CA 模式下 · 完整 1040 税表不适用 · 显示占位符（在所有 hooks 之后才 early-return · 修 React error #300）
  if (isCA) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: 'rgba(20, 20, 18, 0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }} onClick={onClose}>
        <div onClick={(e) => e.stopPropagation()}
          style={{
            maxWidth: 380, width: '100%',
            background: C.bg, borderRadius: 14,
            padding: '28px 24px',
            border: `1px solid ${C.line}`,
          }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontFamily: F_NUM, fontSize: 36, fontWeight: 400,
              color: C.ink, letterSpacing: '-0.03em',
              marginBottom: 4,
            }}>T1</div>
            <div style={{
              fontSize: 11, color: C.muteLite, fontFamily: F_MONO,
              letterSpacing: '0.2em', textTransform: 'uppercase',
              marginBottom: 16,
            }}>General · 2025</div>
            <div style={{
              fontSize: 13, color: C.ink, fontFamily: F_BODY,
              fontWeight: 600, marginBottom: 10,
            }}>
              T1 税表渲染正在建设
            </div>
            <div style={{
              fontSize: 11, color: C.mute, fontFamily: F_BODY,
              lineHeight: 1.6, marginBottom: 20, textAlign: 'left',
            }}>
              目前 TaxPilot CA 版提供：
              <div style={{ marginTop: 6, paddingLeft: 12 }}>
                ✓ 联邦 + 13 省完整计算引擎<br/>
                ✓ CPP / EI / CPP2 工资税<br/>
                ✓ RRSP / TFSA / FHSA 策略<br/>
                ✓ OAS 回收 · CCB 牛奶金<br/>
                ◆ T1 完整表（15000/25000/33000 行）<br/>
                <span style={{ color: C.muteLite }}>　· 需要额外开发 · 下一版推出</span>
              </div>
            </div>
            <div style={{
              fontSize: 10, color: C.muteLite, fontFamily: F_BODY,
              lineHeight: 1.6, marginBottom: 20,
              padding: '8px 10px', background: C.cardAlt, borderRadius: 6,
              textAlign: 'left',
            }}>
              § 真的要填 T1 · 用 CRA NETFILE 认证软件（Wealthsimple Tax / TurboTax / H&R Block）。TaxPilot 目前是策略工具 · 不是报税替代品。
            </div>
            <button onClick={onClose}
              style={{
                padding: '9px 20px', borderRadius: 8,
                background: C.hero, border: 'none', color: C.heroInk,
                fontSize: 12, fontFamily: F_BODY, fontWeight: 700,
                cursor: 'pointer',
              }}>返回</button>
          </div>
        </div>
      </div>
    );
  }

  const defaultLabel = i.filingStatus === 'MFJ' ? '夫妻合并'
    : i.filingStatus === 'Single' ? '单身'
    : i.filingStatus === 'HoH' ? '户主'
    : '已婚分报';

  const activeScenario = canSwitch && filingScenarios
    ? (filingScenarios[viewFilingStatus] || filingScenarios.current)
    : { label: `${i.filingStatus} · ${defaultLabel}`, primary: { inputs: i, calc, label: '' } };

  const scenarioTotalTax = (activeScenario.primary?.calc?.totalTax || 0)
    + (activeScenario.secondary?.calc?.totalTax || 0);
  const scenarioTakeHome = (activeScenario.primary?.calc?.takeHome || 0)
    + (activeScenario.secondary?.calc?.takeHome || 0);

  // 当前方案 vs MFJ 基准
  const baselineTax = calc.totalTax;
  const taxDelta = scenarioTotalTax - baselineTax;

  const handleOpenBracket = (type, ctx) => {
    setBracketCtx(ctx);
    setOpenModal(type);
  };

  // 点击 required forms badge → 弹出仿真表格
  const handleFormClick = (formId) => {
    // 使用当前场景（primary）的 inputs + calc
    setFormCtx({
      inputs: activeScenario.primary.inputs,
      calc: activeScenario.primary.calc,
    });
    setOpenForm(formId);
  };

  // Dropdown 按钮
  const DropdownBtn = ({ value, label, sublabel }) => {
    const active = viewFilingStatus === value;
    return (
      <button
        onClick={() => setViewFilingStatus(value)}
        style={{
          flex: 1,
          padding: '6px 4px',
          background: active ? WORK_INK : '#FFFFFF',
          color: active ? WORK_BG : WORK_INK,
          border: `1px solid ${WORK_INK}`,
          borderLeftWidth: value === 'current' ? 1 : 0,
          cursor: 'pointer',
          fontFamily: 'JetBrains Mono, ui-monospace, monospace',
          fontSize: 10, fontWeight: 700,
          letterSpacing: '0.05em',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 1,
        }}
      >
        <span>{label}</span>
        <span style={{
          fontSize: 8, fontWeight: 400,
          opacity: active ? 0.75 : 0.55,
        }}>{sublabel}</span>
      </button>
    );
  };

  const fmtK = (n) => `$${(Math.round(n / 100) / 10).toFixed(1)}K`;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 130,
        background: 'rgba(13, 13, 13, 0.6)',
        display: 'flex', alignItems: 'stretch', justifyContent: 'center',
        padding: 0,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 440,
          maxHeight: '100vh',
          overflow: 'auto',
          background: WORK_BG,
        }}
      >
        <div
          id="tax-worksheet-printable"
          style={{
            background: WORK_BG,
            padding: '16px 14px 24px',
            position: 'relative',
          }}
        >
          {/* 印刷感顶部标题 */}
          <div style={{
            borderBottom: `2px solid ${WORK_INK}`,
            paddingBottom: 8, marginBottom: 4,
            textAlign: 'center',
            position: 'relative',
          }}>
            <div style={{
              fontFamily: 'Fraunces, serif', fontSize: 15, fontWeight: 700,
              color: WORK_INK, letterSpacing: '0.02em',
            }}>
              TAX WORKSHEET
            </div>

            <button
              onClick={onClose}
              style={{
                position: 'absolute', top: -2, right: -2,
                background: 'transparent', border: 'none', cursor: 'pointer',
                fontSize: 11, color: WORK_MUTE, fontFamily: 'JetBrains Mono, ui-monospace, monospace',
              }}
              aria-label="收起"
            >
              收起 ↑
            </button>
          </div>

          {/* 合并卡：元数据 + 申报状态切换 + 三行对比 */}
          <div style={{
            marginTop: 10, marginBottom: 10,
            background: '#FFFFFF',
            border: `1px solid ${WORK_RULE}`,
            borderRadius: 4,
            padding: '8px 10px 8px',
          }}>
            {/* 顶部元数据 */}
            <div style={{
              fontFamily: 'JetBrains Mono, ui-monospace, monospace',
              fontSize: 9, color: WORK_MUTE, letterSpacing: '0.15em',
              textTransform: 'uppercase',
              paddingBottom: 7,
              borderBottom: `1px dashed ${WORK_RULE}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
            }}>
              <span>Tax Year 2025</span>
              <span>{canSwitch ? `${i.state}${i.city === 'nyc' ? ' / NYC' : ''}` : `${activeScenario.label} · ${i.state}${i.city === 'nyc' ? ' / NYC' : ''}`}</span>
            </div>

            {/* 申报状态对比 · v47 折叠版 */}
            {canSwitch && filingScenarios ? (() => {
              const mfjTax = (filingScenarios.current?.primary?.calc?.totalTax || 0)
                + (filingScenarios.current?.secondary?.calc?.totalTax || 0);
              const mfsTax = (filingScenarios.MFS?.primary?.calc?.totalTax || 0)
                + (filingScenarios.MFS?.secondary?.calc?.totalTax || 0);
              const twoSTax = (filingScenarios.twoSingle?.primary?.calc?.totalTax || 0)
                + (filingScenarios.twoSingle?.secondary?.calc?.totalTax || 0);
              const minTax = Math.min(mfjTax, mfsTax, twoSTax);
              const rows = [
                { key: 'current',   label: 'MFJ 合并',       tax: mfjTax },
                { key: 'MFS',       label: 'MFS 分报',       tax: mfsTax },
                { key: 'twoSingle', label: '2×Single 未婚',  tax: twoSTax },
              ];
              const active = rows.find(r => r.key === viewFilingStatus) || rows[0];
              const activeDelta = active.tax - mfjTax;

              return (
                <div style={{ marginTop: 8 }}>
                  {/* 折叠时：一行 */}
                  <button
                    onClick={() => setWhatifOpen(!whatifOpen)}
                    style={{
                      width: '100%',
                      display: 'grid',
                      gridTemplateColumns: '1fr auto auto 14px',
                      alignItems: 'center',
                      gap: 6,
                      padding: '7px 10px',
                      background: WORK_BG,
                      border: `1px solid ${WORK_RULE}`,
                      borderRadius: 4,
                      borderBottomLeftRadius: whatifOpen ? 0 : 4,
                      borderBottomRightRadius: whatifOpen ? 0 : 4,
                      borderBottom: whatifOpen ? `1px solid ${WORK_RULE}` : `1px solid ${WORK_RULE}`,
                      cursor: 'pointer',
                      fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                      textAlign: 'left',
                    }}
                  >
                    <span style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      color: WORK_INK, fontSize: 10, fontWeight: 600,
                    }}>
                      <span style={{
                        fontSize: 8, color: WORK_MUTE, fontWeight: 700, letterSpacing: '0.1em',
                      }}>WHAT-IF</span>
                      <span>{active.label}</span>
                      {active.tax === minTax && (
                        <span style={{
                          fontSize: 7, fontWeight: 700, letterSpacing: '0.06em',
                          background: '#0F7C4A', color: '#FFF',
                          padding: '1px 4px', borderRadius: 2,
                        }}>最省</span>
                      )}
                    </span>
                    <span style={{ color: WORK_INK, fontSize: 11, fontWeight: 700 }}>
                      {fmtK(active.tax)}
                    </span>
                    <span style={{
                      fontSize: 9, fontWeight: 600, minWidth: 48, textAlign: 'right',
                      color: active.key === 'current' ? WORK_MUTE : (activeDelta > 0 ? WORK_ACCENT : '#0F7C4A'),
                    }}>
                      {active.key === 'current' ? '基准' : `${activeDelta > 0 ? '+' : '−'}${fmtK(Math.abs(activeDelta))}`}
                    </span>
                    <span style={{
                      fontSize: 11, color: WORK_MUTE, textAlign: 'right',
                      transform: whatifOpen ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.2s',
                    }}>▾</span>
                  </button>

                  {/* 展开：对比三行 */}
                  {whatifOpen && (
                    <div style={{
                      border: `1px solid ${WORK_RULE}`,
                      borderTop: 'none',
                      borderBottomLeftRadius: 4, borderBottomRightRadius: 4,
                      background: WORK_BG,
                      overflow: 'hidden',
                    }}>
                      {rows.map((r, idx) => {
                        const isActive = viewFilingStatus === r.key;
                        const isMin = r.tax === minTax;
                        const delta = r.tax - mfjTax;
                        return (
                          <button
                            key={r.key}
                            onClick={() => { setViewFilingStatus(r.key); setWhatifOpen(false); }}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr 90px 90px',
                              width: '100%',
                              alignItems: 'center',
                              padding: '6px 10px',
                              background: isActive ? `${WORK_ACCENT}15` : 'transparent',
                              border: 'none',
                              borderTop: idx > 0 ? `1px solid ${WORK_RULE}` : 'none',
                              cursor: 'pointer',
                              fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                              textAlign: 'left',
                              position: 'relative',
                            }}
                          >
                            {isActive && (
                              <span style={{
                                position: 'absolute', left: 0, top: 0, bottom: 0,
                                width: 3, background: WORK_ACCENT,
                              }} />
                            )}
                            <span style={{
                              color: WORK_INK, fontSize: 10, fontWeight: isActive ? 700 : 500,
                              display: 'flex', alignItems: 'center', gap: 5,
                            }}>
                              {r.label}
                              {isMin && (
                                <span style={{
                                  fontSize: 7, fontWeight: 700, letterSpacing: '0.06em',
                                  background: '#0F7C4A', color: '#FFF',
                                  padding: '1px 4px', borderRadius: 2,
                                }}>最省</span>
                              )}
                            </span>
                            <span style={{
                              textAlign: 'right', color: WORK_INK,
                              fontSize: 11, fontWeight: 700,
                            }}>
                              {fmtK(r.tax)}
                            </span>
                            <span style={{
                              textAlign: 'right', fontSize: 9, fontWeight: 600,
                              color: r.key === 'current' ? WORK_MUTE : (delta > 0 ? WORK_ACCENT : '#0F7C4A'),
                            }}>
                              {r.key === 'current' ? '基准' : `${delta > 0 ? '+' : '−'}${fmtK(Math.abs(delta))}`}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })() : null}
          </div>

          {/* 主税表 */}
          <WorksheetBody
            inputs={activeScenario.primary.inputs}
            calc={activeScenario.primary.calc}
            onOpenBracket={handleOpenBracket}
            onFormClick={handleFormClick}
            filerLabel={activeScenario.secondary ? activeScenario.primary.label : ''}
          />

          {/* 次税表（MFS / 2×Single 才有） */}
          {activeScenario.secondary && (
            <>
              <div style={{
                marginTop: 18, marginBottom: 2,
                borderTop: `3px double ${WORK_INK}`,
              }} />
              <WorksheetBody
                inputs={activeScenario.secondary.inputs}
                calc={activeScenario.secondary.calc}
                onOpenBracket={handleOpenBracket}
                onFormClick={(formId) => {
                  setFormCtx({
                    inputs: activeScenario.secondary.inputs,
                    calc: activeScenario.secondary.calc,
                  });
                  setOpenForm(formId);
                }}
                filerLabel={activeScenario.secondary.label}
              />
              {/* 两人合计 */}
              <div style={{
                marginTop: 12, padding: '8px 10px',
                background: WORK_INK, color: WORK_BG,
                borderRadius: 4,
                fontFamily: 'JetBrains Mono, ui-monospace, monospace',
              }}>
                <div style={{
                  fontSize: 9, fontWeight: 700,
                  letterSpacing: '0.12em', textTransform: 'uppercase',
                  opacity: 0.7, marginBottom: 4,
                }}>
                  两人合计 · Combined
                </div>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                  fontSize: 11,
                }}>
                  <span>总税负</span>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>${Math.round(scenarioTotalTax).toLocaleString()}</span>
                </div>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                  fontSize: 11, marginTop: 2,
                }}>
                  <span>税后到手</span>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>${Math.round(scenarioTakeHome).toLocaleString()}</span>
                </div>
              </div>
            </>
          )}

          {/* 截图提示 + 免责 */}
          <div style={{
            marginTop: 14, paddingTop: 10,
            borderTop: `1px dashed ${WORK_RULE}`,
            fontSize: 9, color: WORK_MUTE,
            fontFamily: 'JetBrains Mono, ui-monospace, monospace',
            lineHeight: 1.5,
          }}>
            <div>※ 长按或截屏即可保存此税表为图片</div>
            <div style={{ marginTop: 3 }}>※ 所有数字为估算 · 依据 IRS 2025 税率 + 各州税务局</div>
            <div style={{ marginTop: 3 }}>※ 不构成税务建议 · 请咨询持照 CPA / EA</div>
            <div style={{
              marginTop: 8, textAlign: 'center',
              fontSize: 8, letterSpacing: '0.15em',
              color: WORK_MUTE,
            }}>
              — TAXPILOT · 2025 —
            </div>
          </div>

          {/* 税率表弹窗 */}
          {bracketCtx && (
            <>
              <BracketModal
                open={openModal === 'fed'}
                onClose={() => setOpenModal(null)}
                title={`联邦递进税率表 · ${bracketCtx.inputs.filingStatus}`}
                brackets={FED_BRACKETS[bracketCtx.inputs.filingStatus] || FED_BRACKETS.Single}
                taxableIncome={bracketCtx.calc.fedTaxable}
                computedTax={bracketCtx.calc.fedTax}
                note="联邦税不看 state，无论你住哪都适用。2025 年度。"
              />
              <BracketModal
                open={openModal === 'state'}
                onClose={() => setOpenModal(null)}
                title={`${STATE_BRACKETS[bracketCtx.inputs.state]?.label || bracketCtx.inputs.state} 州递进税率表`}
                brackets={STATE_BRACKETS[bracketCtx.inputs.state]?.[bracketCtx.inputs.filingStatus] || STATE_BRACKETS[bracketCtx.inputs.state]?.Single || [[Infinity, 0]]}
                taxableIncome={bracketCtx.calc.stateTaxable || 0}
                computedTax={bracketCtx.calc.residentStateTax || bracketCtx.calc.stateTax || 0}
                note={STATE_BRACKETS[bracketCtx.inputs.state]?.note || `${STATE_BRACKETS[bracketCtx.inputs.state]?.label || bracketCtx.inputs.state} 州 2025 年度税率。`}
              />
            </>
          )}

          {/* IRS 仿真表格弹窗 */}
          {openForm && formCtx && (
            <FormMockupModal
              formId={openForm}
              inputs={formCtx.inputs}
              calc={formCtx.calc}
              onClose={() => setOpenForm(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
//  误区条
// ═══════════════════════════════════════════════════════════

// v57: 20 题 · 每题分类色 · 每题含缩写术语表
// category: 'cap' (投资利得) / 'state' (州税) / 'retire' (退休账户)
//         / 'biz' (自雇业务) / 'visa' (签证身份) / 'family' (家庭) / 'other'
const MYTHS = [
  {
    q: '绿卡持有人回国能不能躲美国税？', cat: 'visa', hot: true,
    tags: ['visa-green-card', 'cross-border', 'return-china', 'high-income'],
    a: '不能。绿卡 = 美国税务居民 → 全球收入申报。除非正式 I-407 放弃绿卡 + 交 Exit Tax（身家 > $2M 或近 5 年均税 > ~$201K 触发）。「用 5 年不激活就失效」只影响移民身份，税务上 IRS 不认。',
    gloss: { 'I-407': '正式放弃绿卡表格', 'Exit Tax': '弃籍税 · §877A · 全球资产视为当天卖出征税' },
  },
  {
    q: 'H1B / F1 境内境外工资怎么报？', cat: 'visa', hot: true,
    tags: ['visa-h1b', 'visa-f1', 'cross-border', 'dual-status'],
    a: 'Resident Alien → 全球收入全报。Non-Resident（F1 前 5 年 / J1 前 2 年）→ 只报美国源收入。Dual Status 当年两种都要报（最常见：F1 转 H1B 当年）。Form 1040NR 或 1040 二选一。',
    gloss: { 'Dual Status': '双重身份年 · 一年里同时是 RA 和 NRA', 'SPT': 'Substantial Presence Test · 实质居住测试 · 183 天规则' },
  },
  {
    q: '在国内收入也要交美国税吗？', cat: 'visa', hot: true,
    tags: ['cross-border', 'return-china', 'tax-resident'],
    a: '是的，只要你是税务居民。可用 FEIE 豁免最多 $130K/2025 境外工资（需 330 天境外）+ FTC 境外税抵免（已交中国税的部分）。两者可叠加但不能重复。Form 2555 + Form 1116。',
    gloss: { 'FEIE': 'Foreign Earned Income Exclusion · 境外劳动收入豁免', 'FTC': 'Foreign Tax Credit · 境外税抵免' },
  },
  {
    q: '国内银行 / 股票账户要报吗？', cat: 'visa', hot: true,
    tags: ['fbar', 'fatca', 'intl-bank', 'cross-border'],
    a: '要。合计余额年中任一时点 > $10K 必须报 FBAR（FinCEN 114）。单账户 > $50K 或合计 > $100K MFJ（$50K 单身）要报 Form 8938。漏报罚款可达账户余额 50%。包括支付宝 / 微信理财。',
    gloss: { 'FBAR': 'Foreign Bank Account Report · 海外账户申报', 'FATCA': 'Foreign Account Tax Compliance Act' },
  },
  {
    q: '父母给我 $10 万首付要交税吗？', cat: 'family', hot: true,
    tags: ['parents-home', 'house', 'form-3520', 'cross-border'],
    a: '你（收款方）美国境内不交税。父母若是美国税务居民，单人年度赠与 $19K/2025 以上要报 Form 709（终身免税额 $13.99M）。父母是中国籍非税务居民 → IRS 管不着，但你单年从非 US 人收 > $100K 要报 Form 3520（只报告，不交税）。',
    gloss: { 'Form 3520': '外国人赠与申报（>$100K/年）', 'Form 709': '联邦赠与税申报' },
  },
  {
    q: '转账父母 / 汇钱回国要申报吗？', cat: 'visa', hot: true,
    tags: ['cross-border', 'parents-home', 'return-china', 'fbar'],
    a: '本金转账本身不用报。但：① 银行单笔 > $10K 自动报 FinCEN（你不操作）② 年赠与 > $19K/2025 要 Form 709（你是送方，不交税但报）③ 国内账户打开 > $10K 要 FBAR。',
    gloss: { 'FinCEN': '金融犯罪执法网络 · 反洗钱监管' },
  },
  {
    q: '房东的租金收入必报吗？', cat: 'biz', hot: true,
    tags: ['rental', 'house', 'passive'],
    a: '必报 Schedule E。但 rental 有大量合法扣除让你 paper loss：贷款利息 / 地税 / 折旧（27.5 年）/ 维修 / 管理费 / 保险 / 差旅。多数房东第一年都是税务「亏损」。还没报的要尽快 amend，漏报被抓罚 20% + 利息。',
    gloss: { 'Schedule E': '补充收入与损失表', 'Depreciation': '折旧 · 建筑成本 / 27.5 年抵税' },
  },
  {
    q: 'Zelle / Venmo 收房租会被追税吗？', cat: 'biz', hot: true,
    tags: ['rental', 'house', 'passive', '1099'],
    a: 'Zelle 不生成 1099-K（银行直转）。Venmo / PayPal / CashApp 2025 年 > $2,500 会收到 1099-K。但即使没收到 1099-K，租金本来就要报 Schedule E。1099-K 只是 IRS 的「线索」，不是征税起点。',
    gloss: { '1099-K': '第三方支付平台收款申报' },
  },
  {
    q: 'RSU vest 那天为啥要被扣这么多？', cat: 'biz', hot: true,
    tags: ['rsu', 'w2', 'high-income', 'henry'],
    a: 'RSU vest 全额算 W2 工资（Box 1）。雇主默认 22% 扣联邦（< $1M），但你实际边际可能 32-37%。→ 4 月补税 + 可能 underpayment penalty。解法：W-4 Step 4c 填个 extra withholding，或 1040-ES 季度预缴补差。',
    gloss: { 'RSU': 'Restricted Stock Unit · 限制性股票单位', 'W-4 Step 4c': '额外预扣栏' },
  },
  {
    q: 'ISO 行权突然要交大笔 AMT？', cat: 'biz', hot: true,
    tags: ['iso', 'amt', 'henry', 'high-income'],
    a: 'ISO 行权时，FMV − Strike 差价计入 AMT 收入但不计常规所得。行权 100K 股 × spread $50 = $5M AMT 收入 → 最多补 AMT $1.4M。对策：① 早期小批分年行权 ② 行权同年卖出变 disqualifying disposition（普通所得，避 AMT）③ AMT Credit 后续年份可抵。',
    gloss: { 'ISO': 'Incentive Stock Option · 激励股票期权', 'AMT': 'Alternative Minimum Tax · 最低替代税' },
  },
  {
    q: '娃的大学学费 / 529 怎么省税？', cat: 'family', hot: true,
    tags: ['kids', '529', 'married'],
    a: '529 供款联邦不扣，大多数州扣（NY MFJ $10K · NJ $10K 最近开通）。增值免税，用于 qualified 教育开支取出完全免税。学费直接交学校也可走 AOTC 抵免 $2,500/娃（MAGI < $180K MFJ phase-out）或 LLC 抵免 $2,000。',
    gloss: { '529': 'Qualified Tuition Program · 教育储蓄计划', 'AOTC': 'American Opportunity Tax Credit', 'LLC': 'Lifetime Learning Credit' },
  },
  {
    q: '父母从国内来住半年能当依赖人？', cat: 'family', hot: true,
    tags: ['parents-home', 'cross-border'],
    a: '需同时满足：① 父母是 US Resident（含绿卡或 SPT 满 183 天）② 你提供 > 一半生活费 ③ 父母当年总收入 < $5,200（2025）。旅游签证即使住满 183 天也 FAIL（ITIN 不等于 tax resident）。成立可加 Credit for Other Dependents $500。',
    gloss: { 'SPT': 'Substantial Presence Test · 实质居住测试', 'ITIN': '个人税号（无 SSN 者）' },
  },
  {
    q: 'NY 买房什么价位触发 Mansion Tax？', cat: 'state', hot: true,
    tags: ['nyc', 'house', 'mansion-tax'],
    a: '$1M 起 1% 基础 + NYC 另加 0.25-3.9% 累进。买家交。$1M → $5M $30K+ 额外成本。这就是为什么长岛豪宅经纪总在劝「谈到 $999K」。$1M 和 $1,000,001 差 $10K+。',
    gloss: { 'Mansion Tax': 'NY 豪宅税' },
  },
  {
    q: '买了 Tesla 到底能不能拿 $7,500？', cat: 'other', hot: true,
    tags: ['ev-7500'],
    a: '分三种情况：① 9/30/2025 之前买（或签合同 + 付定金）· Section 30D 仍适用 · MSRP SUV ≤ $80K / 轿车 ≤ $55K · MAGI ≤ $300K MFJ / $150K Single · 北美组装。Model Y/3 合格，Model S/X 超 $55K 不合格。2025 年报税时仍可 claim。② 10/1/2025 之后买 · OBBBA 已**终止** Section 30D · 不再有联邦 $7,500 credit。③ 州补贴（CA CVRP / NJ Charge Up 等）继续独立运行 · 可查询所在州。',
    gloss: { 'MAGI': 'Modified AGI · 修正后调整总收入', OBBBA: 'One Big Beautiful Bill Act · 2025/7 通过 · 终止 EV credit 9/30/2025', 'Section 30D': 'IRS §30D · 新清洁车 credit 条款' },
  },
  {
    q: '老婆不工作要不要一起申报？', cat: 'family', hot: true,
    tags: ['married', 'spouse-nowork'],
    a: '不强制。但强烈建议 MFJ 一起报：Standard Deduction 翻倍 ($31.5K 2025)、税档宽一倍、IRA 可为配偶供款（Spousal IRA）。配偶即使零收入，你也能帮她 IRA 存 $7K/年。MFS 几乎永远更差（失去 EITC / CTC 拿不全 / SALT 减半 $20K / phase-out 起点 $250K vs $500K）。',
    gloss: { 'MFJ': 'Married Filing Jointly · 夫妻合并', 'MFS': 'Married Filing Separately · 夫妻分开', 'Spousal IRA': '配偶 IRA' },
  },
  {
    q: '在 US 持有中国 A 股 / 基金也要报？', cat: 'visa', hot: true,
    tags: ['pfic', 'china-stock', 'cross-border', 'fbar'],
    a: '要。而且中国基金（尤其公募）多数被 IRS 视为 PFIC（被动外国投资公司）→ 惩罚性税率 + Form 8621 每只每年都要报。PFIC 是税务地狱：利得按普通所得 + 利息补征 + 自动最高档。解法：美国券商买中国 ETF（如 MCHI、FXI）不算 PFIC。',
    gloss: { 'PFIC': 'Passive Foreign Investment Company · 被动外国投资公司', 'Form 8621': 'PFIC 年度申报表' },
  },
  {
    q: 'LT 资本利得一定要交税？', cat: 'cap',
    tags: ['passive', 'fire'],
    a: '不一定。2025 年 MFJ 应税 ≤ $96,700、Single ≤ $48,350 时，长期资本利得联邦 0% 档。早退休 / 低收入年份卖股可以完全免税。',
    gloss: { LT: 'Long-Term · 长期资本利得（持股 > 1 年）', MFJ: 'Married Filing Jointly · 夫妻合并申报' },
  },
  {
    q: '跨州工作在新州省税？', cat: 'state',
    tags: ['multi-state', 'convenience-rule', 'nj', 'nyc'],
    a: '不一定。NY 有 Convenience Rule：你为 NY 雇主工作即使人在 FL，NY 照样收你税。真省州税需同时换雇主。',
    gloss: { 'Convenience Rule': '便利原则 · NY/NJ/PA/CT/DE 等州的远程征税规则' },
  },
  {
    q: 'Mega Backdoor 所有 401k 都有？', cat: 'retire',
    tags: ['mega-backdoor', '401k', 'roth', 'high-income', 'henry'],
    a: '不。需要雇主 401(k) 支持两件事：税后 after-tax 供款 + in-service 转 Roth。问 HR 要 Summary Plan Description 确认。',
    gloss: { 'Mega Backdoor Roth': '超级后门 Roth · 通过税后 401(k) 转 Roth IRA 绕开 Roth 上限', 'In-service': '在职转账 · 不离职就能把 401(k) 转出' },
  },
  {
    q: 'Airbnb 是 Sch C 还是 Sch E？', cat: 'biz',
    tags: ['rental', 'house', 'se-tax', 'passive'],
    a: '平均住客 < 7 天 → Sch C（要交 SE tax）。≥ 7 天 → Sch E（不交 SE tax 但不能抵主动损失）。决定了能不能抵工资的税。',
    gloss: { 'Sch C': 'Schedule C · 自雇业务损益表', 'Sch E': 'Schedule E · 房产 + K-1 被动收入表', 'SE Tax': 'Self-Employment Tax · 自雇税 15.3%' },
  },
  {
    q: 'S-Corp 越低工资越省？', cat: 'biz',
    tags: ['s-corp', '1099', 'se-tax', 'restaurant'],
    a: '不。IRS 要 Reasonable Compensation，工资过低被审查补税 + 罚款。大概占净利 40-60% 为安全区。',
    gloss: { 'S-Corp': 'S Corporation · 小企业税务形态', 'Reasonable Compensation': '合理薪酬 · IRS 审查标准' },
  },
  {
    q: '401k 一定优于 Roth？', cat: 'retire',
    tags: ['401k', 'roth', 'ira'],
    a: '不一定。现在边际 24%、退休 22% → Traditional 省。现在 22%、退休 24%（因 RMD + SS）→ Roth 更好。年轻低收入通常选 Roth。',
    gloss: { '401k': '401(k) 传统 · 雇主退休账户', Roth: 'Roth 401(k) / IRA · 税后存入，提取免税', RMD: 'Required Minimum Distribution · 73 岁起强制取款', SS: 'Social Security · 社会保险退休金' },
  },
  {
    q: 'SALT $40K cap 还需要 PTE 吗？', cat: 'state',
    tags: ['salt', 's-corp', 'high-income', 'nyc', 'nj'],
    a: 'OBBBA 2025 起 SALT cap 从 $10K 提到 $40K（2025-2029）· 但 MAGI > $500K MFJ 开始 30% phase-out · > $600K 回到 $10K 地板 · 2030 年全部回 $10K。年入 < $500K：享 $40K 自动 itemize 就行 · > $600K：PTE 依然核心策略。NY/NJ/CA 等 36+ 州 PTE 继续可用。',
    gloss: { SALT: 'State And Local Tax · 州地税', PTE: 'Pass-Through Entity · 穿透实体税', OBBBA: 'One Big Beautiful Bill Act · 2025/7 通过', MAGI: 'Modified Adjusted Gross Income' },
  },
  {
    q: 'QBI 扣除谁都有？', cat: 'biz',
    tags: ['qbi', '1099', 's-corp', 'llc'],
    a: '不。只有 pass-through 业务（Sch C / S-Corp / LLC 合伙）才有。W2 工资没有。2025 年高收入加 SSTB（咨询/律师/医生等）会被 phase-out。',
    gloss: { QBI: 'Qualified Business Income · 合格业务收入 · §199A 20% 扣除', SSTB: 'Specified Service Trade or Business · 特定服务业（医生律师咨询等高收入 phase-out）', W2: 'W-2 工资 · 雇员收入表', 'Pass-through': '穿透实体 · 不交公司税、利润归个人' },
  },
  {
    q: 'H1B 不是 tax resident？', cat: 'visa',
    tags: ['visa-h1b', 'tax-resident', 'dual-status'],
    a: '错。通过 Substantial Presence Test（通常入境后第 1 年起）后要报全球收入。F1 前 5 年例外。',
    gloss: { H1B: 'H-1B 工作签证', F1: 'F-1 学生签证 · 前 5 年免 FICA + 按非居民报', 'SPT': 'Substantial Presence Test · 实质居留测试 · 183 天加权法' },
  },
  {
    q: '电车买了就拿 $7,500？', cat: 'other',
    tags: ['ev-7500'],
    a: '要看购车时间。OBBBA 把 §30D 的终止日期从 2032 提前到 9/30/2025 · 10/1/2025 之后购买不再有联邦 credit。9/30/2025 之前（含签合同 + 付定金）买的 · 仍需满足 AGI 限制（MFJ ≤ $300K · Single ≤ $150K）、MSRP 上限、北美组装和电池来源要求。现在（TY2025 报税）仍能 claim Form 8936 · 但已无未来车效益。',
    gloss: { EV: 'Electric Vehicle · 电动车', AGI: 'Adjusted Gross Income · 调整后总收入', OBBBA: 'One Big Beautiful Bill Act · 2025/7 通过 · 终止 EV credit' },
  },
  {
    q: 'HSA 可以一直保留吗？', cat: 'retire',
    tags: ['hsa', 'high-income', 'henry'],
    a: '可以。HSA 是三重免税（存/长/取）的神账户。换雇主不影响 · 65 岁后非医疗用途按普通税率取出（像 Traditional IRA）。',
    gloss: { HSA: 'Health Savings Account · 健康储蓄账户 · 存 / 增值 / 医疗取均免税', HDHP: 'High Deductible Health Plan · 高免赔额保险 · HSA 开户前提' },
  },
  {
    q: 'Backdoor Roth 简单做？', cat: 'retire',
    tags: ['backdoor-roth', 'roth', 'ira', 'henry', 'high-income'],
    a: '小心 Pro-Rata Rule！如果你已有 Traditional / Rollover IRA 余额，转 Roth 会按比例计税。操作前先把老 IRA 滚到 401(k)。',
    gloss: { 'Backdoor Roth': '后门 Roth · 高收入绕 Roth IRA $161K 上限', 'Pro-Rata Rule': '按比例规则 · 所有 Traditional IRA 一起算税基', 'Rollover IRA': '滚存 IRA · 前雇主 401(k) 转来的传统 IRA' },
  },
  {
    q: '海外账户不用报？', cat: 'visa',
    tags: ['fbar', 'fatca', 'intl-bank', 'cross-border'],
    a: '错。美国税务居民海外账户年中任一时点合计 > $10K 必须报 FBAR。漏报罚款可达账户余额 50%（非故意 $10K/年）。',
    gloss: { FBAR: 'Foreign Bank Account Report · FinCEN 114 表 · 4/15 截止', FATCA: 'Foreign Account Tax Compliance Act · 单独的 8938 表 · 门槛更高' },
  },
  {
    q: '自雇一定要 Solo 401(k)？', cat: 'biz',
    tags: ['se-tax', '1099', '401k', 'llc', 's-corp'],
    a: '不一定。收入稳定选 Solo 401(k)（$70K 上限）。一次性大项目选 SEP IRA（更简单）。低收入选 SIMPLE IRA（$16.5K）。',
    gloss: { 'Solo 401(k)': '个人 401(k) · 自雇最高选择 · 员工 $23.5K + 雇主 20% 净利', 'SEP IRA': 'Simplified Employee Pension · 简化员工退休计划', 'SIMPLE IRA': '小企业简易退休账户' },
  },
  {
    q: 'Venmo / PayPal 被 1099-K 追？', cat: 'biz',
    tags: ['1099', 'rental', 'uber', 'influencer'],
    a: '是的。2024 起门槛 $5K，2025 降到 $2,500，2026 降到 $600。朋友转账 reimburse 要标 Friends & Family，商业收款会触发 1099-K。算业务收入要报 Sch C。',
    gloss: { '1099-K': 'Payment Card and Third Party Network Transactions · 第三方支付汇报表', 'Friends & Family': 'Venmo/PayPal 免手续费 · 非商业标记' },
  },
  {
    q: 'Wash Sale 规则是什么？', cat: 'cap',
    tags: ['passive', 'fire'],
    a: '卖出亏损股 30 天内（前后都算）买回"相同或相似"证券，损失不能立即抵税，要加到新股 basis 上延后抵扣。配偶账户和 IRA 也算同一人。绕法：换类似但不同的 ETF（VOO → IVV）。',
    gloss: { 'Wash Sale': '洗售规则 · IRS §1091 · 防止假装卖亏', Basis: '成本基准 · 买入价 + 手续费 + 被延后的损失' },
  },
  {
    q: 'Crypto 币币交换要交税？', cat: 'cap',
    tags: ['crypto', 'passive'],
    a: '要。IRS 把 crypto 当 property · 币币交换 = 先卖再买，触发资本利得。Staking reward 是普通收入（拿到时按 FMV 报）。Form 8949 + Sch D 报。2025 起交易所要出 1099-DA。',
    gloss: { 'Property': '财产 · IRS 对 crypto 的分类（非货币）', '1099-DA': 'Digital Asset · 2025 新版加密货币交易报告表', FMV: 'Fair Market Value · 公平市场价' },
  },
  {
    q: 'F1 OPT 第 6 年要不要交 FICA？', cat: 'visa',
    tags: ['visa-f1', 'tax-resident', 'dual-status'],
    a: '要。F1 前 5 个日历年免 FICA。第 6 年起通过 SPT 变 resident alien，开始交 7.65% FICA。雇主常忘调，你可以提醒 HR。已扣错的 FICA 向 IRS 申请 Form 843 退。',
    gloss: { FICA: '社保税 · SS 6.2% + Medicare 1.45% = 7.65%', OPT: 'Optional Practical Training · F1 毕业后 1-3 年工作许可', 'Resident Alien': '税务居民 · 与公民同等报税义务' },
  },
  {
    q: '回国工作第一年报美国税？', cat: 'visa',
    tags: ['cross-border', 'return-china', 'visa-green-card'],
    a: '看身份。绿卡 / 公民：全年全球收入都要报（可 FEIE 免 $130K + 税收抵免）。H1B / F1 离境后：搞 dual-status 或 non-resident 报当年剩余美国收入。务必记清离境日。',
    gloss: { FEIE: 'Foreign Earned Income Exclusion · 境外收入豁免 · Form 2555', 'Dual-Status': '身份变更年的双重身份报税', 'Tax Treaty': '税收协定 · 中美协定允许部分抵免' },
  },
  {
    q: 'LLC vs S-Corp 谁省税？', cat: 'biz',
    tags: ['s-corp', 'llc', '1099', 'restaurant', 'se-tax'],
    a: 'LLC 默认算 sole prop 或 partnership，全额交 SE Tax。净利 > $60K 起 S-Corp 省：工资部分交 FICA，分红不交。$40-60K 之间要算 ROI（S-Corp 报税成本 $1K+/年）。',
    gloss: { LLC: 'Limited Liability Company · 法律形态 · 税上可选', 'S-Corp Election': 'Form 2553 · LLC 可选被按 S-Corp 征税', 'Partnership': '合伙 · 2 人以上 LLC 默认' },
  },
  {
    q: 'Home Office 能扣多少？', cat: 'biz',
    tags: ['1099', 'influencer', 'se-tax', 'llc'],
    a: '两种方法：(1) Simplified 每 sqft $5 上限 $1,500。(2) Regular 按业务面积占比分摊所有家庭开支（电/网/地税/折旧）。必须"专用且经常使用"才行，偶尔坐沙发办公不算。',
    gloss: { 'Simplified Method': 'Home Office 简化算法 · 8829 表不用填', '8829': 'Form 8829 · 详细 Home Office 开支表', 'Exclusive Use': '专用使用 · 空间不能兼作客厅 / 卧室' },
  },
  {
    q: '夫妻分开报更省？', cat: 'family',
    tags: ['married', 'spouse-nowork'],
    a: '99% 情况 MFJ 更省。MFS 会失去：EITC、大部分 CTC、教育抵免、IRA deduction 等。特例：一方巨额医疗开支 / student loan IBR 还款 / 一方欠旧税。算清楚再决定。',
    gloss: { MFS: 'Married Filing Separately · 夫妻分开申报', IBR: 'Income-Based Repayment · 学贷按收入还款方案', MFJ: 'Married Filing Jointly · 夫妻合并申报' },
  },
  {
    q: '给小孩开 Roth IRA？', cat: 'family',
    tags: ['kids', 'roth', 'ira'],
    a: '可以，非常好！只要小孩有 earned income（打工 / 家里业务付工资 / 模特酬劳），就可以开 Custodial Roth IRA。存 $7K/年 · 60 年复利 · 免税取出。这是 7 代家族传承神器。',
    gloss: { 'Custodial Roth IRA': '监护型 Roth · 小孩名义账户 · 父母管到 18/21', 'Earned Income': '劳动收入 · 打工/业务收入（vs 投资收入）', 'Kiddie Tax': '儿童税 · 非劳动收入 > $2,700 按父母税率' },
  },
  {
    q: '报税错了能改吗？', cat: 'other',
    tags: [],
    a: '能。Form 1040-X · 3 年内（或缴款日起 2 年）可改。纸报要 8-12 周处理，电子报快一点。改了 federal 通常也要改州。不影响审计风险（但引起关注）。重大错误建议让 CPA 改。',
    gloss: { '1040-X': 'Amended US Individual Income Tax Return · 修改报税表', 'Statute of Limitations': '追诉期 · IRS 审计一般 3 年，重大低报 6 年' },
  },
  {
    q: 'QSBS §1202 合格股票免税？', cat: 'ultra',
    tags: ['qsbs', 'ultra-rich', 'henry', 'high-income'],
    a: '是。创始人 / 早期员工持有 C-Corp 合格小企业股票 ≥ 5 年，卖出 gain 最多 $10M 或 10× basis 联邦免税。2025 后法案可能提前到 3 年。很多 tech founder exit 第一件事。',
    gloss: { 'QSBS': 'Qualified Small Business Stock · Section 1202', 'C-Corp': 'C Corporation · QSBS 前提（S-Corp / LLC 不合资格）', 'Basis': '成本基准 · 买入价 / 行权价' },
  },
  {
    q: 'DAF vs 直接捐哪个好？', cat: 'ultra',
    tags: ['daf', 'ultra-rich', 'high-income'],
    a: 'DAF（捐赠顾问基金）高收入年一次性捐大额，立即扣税，但可分多年指定慈善。特别适合 bonus 年 / 套现年 / 未来退休低收入年。Fidelity / Vanguard / Schwab 都开。最低 $5K。',
    gloss: { 'DAF': 'Donor-Advised Fund · 捐赠顾问基金', 'Bunching': '捐款打包 · 多年合并一次扣好破 standard deduction', '501(c)(3)': '合格慈善组织' },
  },
  {
    q: '家族信托能避税？', cat: 'ultra',
    tags: ['trust', 'ultra-rich', 'high-income'],
    a: '能延税 / 避遗产税，不能躲所得税。Grantor trust（你活着还是你报税）vs Irrevocable trust（信托自己报税，税率可怕高）。ILIT / GRAT / SLAT 是富人主流。要 attorney + CPA 双专家。',
    gloss: { 'Grantor Trust': '可撤销信托 · 委托人自己报税', ILIT: 'Irrevocable Life Insurance Trust · 人寿险信托', GRAT: 'Grantor Retained Annuity Trust · 授予人保留年金信托', SLAT: 'Spousal Lifetime Access Trust · 配偶终身使用信托' },
  },
  {
    q: 'CA 年入 $1M 后为啥多扣 1%？', cat: 'state', hot: true,
    tags: ['ca', 'ca-mht', 'ultra-rich', 'high-income'],
    a: 'Mental Health Services Tax（Prop 63 · 2004 通过）· Taxable Income 超过 $1M 部分额外 1% · 所有 filing status 都是 $1M 阈值（不 doubled）· 加 12.3% 顶档 = 有效最高税率 13.3%（全美最高）· 可靠 Roth conversion 时点、capital loss harvest、DAF 大捐等策略压 $1M 下。',
    gloss: { 'Prop 63': '2004 CA 加州 Proposition 63 · 百万税为心理健康服务筹款', 'MHT': 'Mental Health Tax', MAGI: 'Modified Adjusted Gross Income' },
  },
  {
    q: 'CA 工资无论多高都要扣 SDI？', cat: 'state', hot: true,
    tags: ['ca', 'ca-sdi', 'w2'],
    a: '2024 年起 CA 把 SDI 工资上限彻底取消（以前 $153K 封顶）· 所有 W2 工资 1.2% 无上限 · 年薪 $500K 的码农要交 $6,000 SDI · $1M 的副总裁要交 $12,000。这笔钱是州残疾福利保险，不是 Fed tax，无法抵。算 CA 全包税率时要加上（12.3% + 1% MHT + 1.2% SDI = 14.5% 有效最高）。',
    gloss: { SDI: 'State Disability Insurance · 加州残疾保险', EDD: 'Employment Development Department · 加州就业局' },
  },
  {
    q: 'Founder 卖股票 QSBS 免税 $10M · CA 也免吗？', cat: 'ultra', hot: true,
    tags: ['ca', 'ca-nonconform', 'qsbs', 'ultra-rich', 'henry'],
    a: '**不免** · CA 是 §1202 大坑 · 联邦免 $10M（或 10x basis）· 但 CA 不 conform · 仍按 13.3% 全额征 CA 税。$10M QSBS exit 联邦税 $0 · CA 税 ~$1.33M。对策：① exit 前一年搬去 TX/FL/NV/WA 建立真实 residency（Schedule CA 注意陷阱）② 通过 NGT/非 grantor trust 让 QSBS 在别州报税。是 Founder 在 CA 最痛的一条。',
    gloss: { QSBS: 'Qualified Small Business Stock · §1202', 'Conformity': '州税是否跟随联邦法条', NGT: 'Non-Grantor Trust · 非委托人信托' },
  },
  {
    q: 'CA 买 Tesla · 州里还有补贴吗？', cat: 'other',
    tags: ['ca', 'ev-7500'],
    a: '联邦 $7,500 已在 9/30/2025 终止。CA 州层面 CVRP（Clean Vehicle Rebate Project）之前给 $2,000-$7,500（收入 < $135K Single / $200K MFJ），但 2023 底已暂停 · 目前主力是 **Clean Cars 4 All**（收入低的区域性）+ **CVAP**（融资）· 新能源车 HOV 贴纸仍可享 Carpool 车道。查 cleanvehiclerebate.org 更新。',
    gloss: { CVRP: 'Clean Vehicle Rebate Project · 2010-2023 主力补贴', HOV: 'High-Occupancy Vehicle · 多人车道' },
  },
  {
    q: 'CA 自雇的 QBI 能扣 20% 吗？', cat: 'biz',
    tags: ['ca', 'ca-nonconform', 'qbi', '1099', 's-corp'],
    a: '**联邦能 · CA 不能**。QBI §199A 是 2017 TCJA 加的，CA 没 conform · 你联邦收入 -20% QBI · 但 CA 还是按 100% 算。自雇 $200K 净利联邦扣 $40K · CA 算 $200K 全额 13.3% 档征税。结果：CA 自雇有效税率比其他州高很多。对策：PTE Tax（CA 有，且 2026 年已延期 5 年）+ 合理工资拆分 + 401(k) Profit Sharing 压州税。',
    gloss: { QBI: 'Qualified Business Income Deduction · 合格业务收入扣除', PTE: 'Pass-Through Entity Tax · CA PTE 2026-2030 仍可用' },
  },
  {
    q: 'CA 房东 Cost Segregation 能加速折旧吗？', cat: 'ultra',
    tags: ['ca', 'ca-nonconform', 'cost-seg', 'rental', 'reps'],
    a: '**联邦可以 · CA 限制**。OBBBA 2025 恢复 100% Bonus Depreciation（联邦）· 但 CA **从未 conform** · 最高只接受 MACRS 正常折旧。$500K 投资房 Cost Seg 联邦第一年可扣 $150K · CA 只扣 $18K · 差 $132K 还是要被 13.3% 征 · ~$18K 州税。对策：尽量把 Cost Seg 放在租金高的州（TX/FL）· CA 房产考虑拉长折旧年限。',
    gloss: { 'Cost Seg': 'Cost Segregation Study · 拆分房产为 5/7/15 年资产加速折旧', MACRS: 'Modified Accelerated Cost Recovery System · 标准折旧法', REPS: 'Real Estate Professional Status · 可抵工资收入' },
  },
  {
    q: 'CA Renter\'s Credit 值几十块 · 要申请吗？', cat: 'family',
    tags: ['ca'],
    a: '要！一年就是一次报税 Form 540 · Single $60 · MFJ $120 · 收入 < $50,746 Single / $101,492 MFJ（2025）· 1 分钟填 · 不难。另外 CalEITC 最高 $3,756（ITIN 也能拿 · 和联邦 EITC 不同）+ Young Child Tax Credit $1,189（娃 < 6 岁）· 低中产加州家庭要拿齐。',
    gloss: { CalEITC: 'California Earned Income Tax Credit · ITIN 也能享', YCTC: 'Young Child Tax Credit · 娃 < 6 岁' },
  },
  {
    q: 'UT 税率真的只有 4.5% 吗 · 高收入有套路？', cat: 'state',
    tags: ['ut'],
    a: '对 · 犹他 2025 flat 4.5%（HB 106 从 4.55% 下调，retroactive Jan 1）· 所有收入同率。但 **Taxpayer Tax Credit** 会让高收入有效税率累进：Credit = deductions 和 exemptions × 6% · 超过 filing 阈值后每 $1 收入 credit 减 1.3 cents · 高收入把 credit 吃没后才真按 4.5% 全额征。与 CA 13.3% 差 ~9% · HENRY 双码农每年能省 $15-25K。',
    gloss: { 'Flat Tax': '统一税率 · 不分档', 'Taxpayer Tax Credit': 'UT 特色 · 为中低收入减税 · 让整体有累进效果' },
  },
  {
    q: 'UT 娃多 · CTC 之外州里还给啥？', cat: 'family',
    tags: ['ut', 'kids', 'ctc'],
    a: 'UT 娃多很划算：① 联邦 CTC $2,000/娃（< 17）· 4 娃 = $8K ② UT 州 Personal Exemption $2,111/每个 dependent（2025 · 减 taxable income · 4 娃 = 压 $8,444 · 省 $380 州税）③ UT Child Tax Credit（州层面 · 1-3 岁 $1,000/娃，phase out $54K Single / $81K MFJ）④ 529 UT My529 捐款可抵 UT 税 5% ($2,410/娃上限 2025)。LDS 大家庭 4-5 娃能省 $3-5K/年。',
    gloss: { 'Personal Exemption': 'UT 人头免税额 $2,111/dependent', 'My529': '犹他 529 计划 · 供款本州 credit 5%' },
  },
  {
    q: 'AK 搬过来能拿 PFD 吗 · 多少钱？', cat: 'state', hot: true,
    tags: ['ak'],
    a: '要住满 **整个 calendar year**（Jan 1 - Dec 31）· 1/2 搬入要等到 **第二年** 才 eligible · 意向永久居留 · 180 天内不能离 AK（允许的豁免：读书/军队/医疗）· 2025 PFD = $1,000/每人（House Bill 53 定 · 历史低点，2022 $3,284 是最高）· 联邦要交税（1099-MISC line 8g · Schedule 1）· 家里 4 口人 = $4,000 多一笔报税收入。AK 本身无州税，所以只交联邦那部分。',
    gloss: { PFD: 'Permanent Fund Dividend · 阿拉斯加石油基金年度分红 · 1982 起', 'North Slope': '阿拉斯加北坡 · 石油产地' },
  },
  {
    q: 'AK 油田 2 周上 2 周下 · 税务怎么报？', cat: 'biz',
    tags: ['ak', 'w2'],
    a: '常见 North Slope 岗位（BP/ConocoPhillips 承包商）· rotational · 年薪 $150-250K · W2 报。关键：① 所有工资按 AK 源（工作州），AK 无州税 ② 如果你 domicile 在别州（还没搬 AK · 如 WA/CA 父母家），某些州会追征 · 尤其 CA（residency 最严）③ 如果你住 AK · domicile 改 AK · 可拿 PFD ④ 轮班机票 + 住宿可能是 fringe benefit · 检查 W2 box 12 ⑤ 401k / HSA / Mega Backdoor 都和普通 W2 一样可用。',
    gloss: { 'Rotational Work': '轮班工作 · 常见能源/矿业', Domicile: '法律居住地 · 决定州税权限' },
  },
  {
    q: '1031 Exchange 怎么用？', cat: 'ultra',
    tags: ['1031', 'rental', 'house', 'passive', 'ultra-rich'],
    a: '卖投资房 45 天内书面指定 ≤3 个替换房，180 天内买下 · 用 QI（合格中介）过账，即可**永久延后** Gain。只限投资房换投资房，自住不算。2017 税改后不适用动产。房东家族最大神器。',
    gloss: { '1031': 'IRC Section 1031 · Like-Kind Exchange', 'QI': 'Qualified Intermediary · 合格中介，全款经过 QI 手', 'Boot': '靴子 · 找补现金部分，要交税' },
  },
  // ══════════════════════════════════════════
  // v96: OBBBA 2025 新 deduction 4 条
  // ══════════════════════════════════════════
  {
    q: 'No Tax on Tips · 服务业真的不交税吗？', cat: 'biz', hot: true,
    tags: ['tips', 'obbba-2025', 'se-tax', 'restaurant'],
    a: 'OBBBA §224 · 2025-2028。「资格 tips」最多扣 $25K（无论 Single / MFJ）· above-the-line · 标扣或 itemize 都能用。IRS 发布 ~70 个职业（服务员 / 调酒师 / 递盘 / 网约车 / 美发 / 美甲 等）· 必须是 12/31/2024 前该行业"习惯"拿 tips。**注意：只免联邦所得税** · FICA（SS + Medicare 7.65%）和州税照交。Phase-out: MAGI > $150K / $300K 每 $1K 减 $100。服务员 W2 Box 7 有 tip 数 · 自雇报 Schedule C 的 cash tip 也算。2025 年 W-2 不会单独标 · 需靠 pay stub / 4070 记账。',
    gloss: { 'OBBBA': 'One Big Beautiful Bill Act · 2025/7/4 签署', 'Qualified Tips': '合格小费 · 顾客自愿给 · 含现金/刷卡/tip pool · IRS Notice 2025-62 清单 70 职业', 'MAGI': 'Modified Adjusted Gross Income · 修正 AGI' },
  },
  {
    q: 'No Tax on Overtime · 加班费免税吗？', cat: 'biz', hot: true,
    tags: ['overtime', 'obbba-2025', 'w2'],
    a: 'OBBBA §225 · 2025-2028。只免 **premium 部分**（time-and-half 的那 0.5x）· 不是整个 OT 工资。上限 $12.5K Single / $25K MFJ · phase-out 同 tips ($150K/$300K)。必须是 FLSA 要求的 non-exempt 员工（**小时工 · 不是白领**）· 自雇 / 承包商 / 独立 contractor **不能享**。照例：FICA/州税继续交。加班 $15K premium 的码农（如果 W2 且非 exempt）能扣 $12.5K · 联邦税省 ~$3K（24% 档）。护士、技术员、工厂工人适用。',
    gloss: { 'FLSA': 'Fair Labor Standards Act · 劳动法 · 定义非豁免员工', 'Non-exempt': '非豁免员工 · 有资格拿加班费的小时工', 'Premium': '加班溢价 · 即 "+0.5x" 部分' },
  },
  {
    q: '65 岁 Senior Bonus $6,000 怎么拿？', cat: 'retire',
    tags: ['senior', 'obbba-2025', 'retire'],
    a: 'OBBBA §70103 · 2025-2028。**65+ 每人额外 $6K 扣除** · 夫妻两个都符合 = $12K · 标扣 / itemize 都叠加（不是替代现有的 "65+ $2K/$1,600 额外标扣" · 是 **额外再加一层**）· phase-out @ MAGI > $75K Single / $150K MFJ · 每 $1K 减 $60。退休夫妻 2025 标扣合计可达：$31.5K 基础 + $3.2K 老年额外（两人各 $1,600）+ $12K senior bonus = **$46.7K** 税前基本零税。MFS 不能用（绝对禁）· SSN 必须有效。',
    gloss: { 'Senior Bonus': 'OBBBA 新增 · §70103 · per 65+ eligible person', '老年额外标扣': 'TCJA 延续 · 65+ 或盲人每项 $1,600 MFJ / $2,000 Single' },
  },
  {
    q: '买新车能扣贷款利息吗？', cat: 'other',
    tags: ['car-loan', 'obbba-2025'],
    a: '**能 · 限美装车 · 2025-2028**。OBBBA 新规：车贷利息最多 $10K/年扣（above-the-line）· 贷款必须 **1/1/2025 或之后**发起 · 第一顺位留置（车做担保）· 新车 personal use · 美国本土 final assembly。MAGI > $100K Single / $200K MFJ 起 phase-out · $150K / $250K 扣完。查 VIN 第 11 位 = 美国组装就行（VIN Decoder NHTSA 网站）· Tesla Model Y/3、Ford、Honda 美厂 OK · Toyota 日厂产的不行。EV credit 9/30 停了·这个是 alternative。',
    gloss: { '车贷利息扣除': 'Section 163(h)(3)(C) · OBBBA 新 · 2025-2028', 'VIN Decoder': 'NHTSA 网站查车辆最终组装地', 'First Lien': '第一顺位留置 · 即车做抵押' },
  },
  // ══════════════════════════════════════════
  // v96: 留学生税务 · F-1 / OPT / H1B / 身份转换
  // ══════════════════════════════════════════
  {
    q: 'F-1 前 5 年到底为啥免 FICA？', cat: 'visa', hot: true,
    tags: ['visa-f1', 'fica', 'nonresident'],
    a: 'F-1 / J-1 前 5 个日历年（含入境当年 · 部分年也算整年）· IRS 视为 **Non-Resident Alien (NRA)** · 报 Form 1040NR · **免 FICA**（SS 6.2% + Medicare 1.45% = 7.65% 工资）。OPT 实习也适用。雇主若误扣 FICA · 让 HR 退；HR 不退 · 填 Form 843 + 8316 自己向 IRS 追。年入 $50K 就是每年追 $3,825。第 6 年开始 Substantial Presence Test 通过 · 转 Resident Alien · 从此全球收入都报 · 走 1040。',
    gloss: { 'Substantial Presence Test': 'SPT · IRS 判定税务居民的天数测试', 'Form 843': '追缴被错扣税款的申请表', 'Form 8316': 'FICA 追缴配套表 · 雇主不退时用' },
  },
  {
    q: '1040 vs 1040NR 差在哪？', cat: 'visa',
    tags: ['visa-f1', 'visa-h1b', 'nonresident', 'dual-status'],
    a: '**1040NR (Non-Resident)**：只报美国来源收入 · 只能 MFS 或 Single · 无 Standard Deduction（除印度学生协定）· 不能 EITC / Child Tax Credit (CTC) / Education Credits · 常用于 F-1/J-1 前 5 年 · H1B 入境当年（可能）。**1040 (Resident)**：全球收入 · MFJ 可选 · $15,750 / $31,500 标扣 · 所有 credit 可用。差距：年入 $80K 留学生 · 1040NR 几乎全额纳税 · 1040 前 $15,750 免。Substantial Presence: 当年 ≥ 31 天 + 当年 + 前年 1/3 + 前前年 1/6 合计 ≥ 183 天。',
    gloss: { 'SPT': 'Substantial Presence Test · 美国天数测试 · 过了 = Resident', '1040NR': 'US Nonresident Alien Income Tax Return', '印度学生协定': 'US-India Treaty · 印度 F-1 例外 · 可享 Single 标扣' },
  },
  {
    q: 'OPT 转 H1B 那年怎么报税（Dual Status）？', cat: 'visa', hot: true,
    tags: ['visa-f1', 'visa-h1b', 'dual-status', 'opt'],
    a: '**Dual-Status Year**（10/1 开始 H1B · 前 9 月 OPT）· 理论上前半年报 1040NR（NR 收入）+ 后半年报 1040（Resident 收入）· 麻烦且失去所有 credit / 标扣。**更好的选择**：① **First Year Choice**：满足一定条件可选全年 Resident · 走 1040 · 可 MFJ 合报 · 拿 Standard Deduction。② 如果 12/31 前满 SPT（H1B 3 个月 + OPT 183 天够）· 自动 Resident 全年。必要时附 Form 8833（声明条约立场）。对夫妻已婚 H1B：通常选全年 Resident · MFJ 最省。',
    gloss: { 'Dual-Status': '同一年前后两个税务身份', 'First Year Choice': 'H1B / L1 当年提前选 Resident 的条款', '8833': 'Treaty-Based Return Position Disclosure' },
  },
  {
    q: 'H1B 第一年能 MFJ 吗 · 老婆在国内？', cat: 'visa',
    tags: ['visa-h1b', 'married', 'dual-status'],
    a: '**能**（如果你是 Resident）· 选 **§6013(g) Election** · 让国内配偶被视为 "US 税务居民全年" · MFJ 合报 · 拿 Standard Deduction $31.5K + Spousal IRA + 低税档。代价：配偶**全球收入**也要报（包括国内工资 · 但 FEIE 可豁免 $130K）。配偶需要 ITIN（Form W-7 附申请报税）· 一旦选了 revoke 复杂。国内配偶年入 < $130K · 典型场景都划算。',
    gloss: { '§6013(g)': 'IRC 条款 · 非居民配偶选 Resident Alien 待遇', 'ITIN': 'Individual Taxpayer ID Number · 无 SSN 的报税号', 'FEIE': 'Foreign Earned Income Exclusion · Form 2555 · 2025 $130K' },
  },
  // ══════════════════════════════════════════
  // v96: 回国 / Exit Tax / 放弃绿卡
  // ══════════════════════════════════════════
  {
    q: '放弃绿卡 · 要交 Exit Tax 吗？', cat: 'ultra', hot: true,
    tags: ['exit-tax', 'visa-green-card', 'return-china', 'ultra-rich'],
    a: '**可能**。IRC §877A · "Covered Expatriate"（8 年里 ≥ 8 个日历年有绿卡 · 放弃时）符合三条之一：① 净资产 ≥ $2M ② 过去 5 年平均税负 ≥ $201K (2025) ③ 未过合规测试。触发 **Exit Tax**：视为放弃当天以 FMV 卖掉所有资产 · 产生 capital gain 交税（前 $890K 2025 豁免）。退休账户 / 信托另有规则。必交 Form 8854。影响：中国回流 15+ 年绿卡 + 房产 + 股票 > $2M 的都要规划。可以**提前分批赠与 / 变卖 / 信托** 把净资产压下 $2M。',
    gloss: { 'Exit Tax': '§877A · 放弃美国身份的一次性视同出售税', 'Covered Expatriate': '受 Exit Tax 约束的弃籍者', 'Form 8854': 'Initial and Annual Expatriation Statement' },
  },
  {
    q: '绿卡拿了不住 · IRS 会追吗？', cat: 'visa',
    tags: ['visa-green-card', 'return-china', 'cross-border'],
    a: '**会**。拿绿卡 = 永久税务居民 · 全球收入报 US 税 · 不管你人在哪。离美 > 6 月可能失去绿卡身份（移民局判）· 但 **税务身份独立**：只有 Form I-407 正式放弃（或绿卡满 8 年后行政撤销）才停。期间全球收入仍需报 · 包括国内工资 / 房租 / 股息。**处理路径**：① 补报过去年（Streamlined Foreign Offshore Procedures 可免罚）② 决定留绿卡：全球报税继续 ③ 决定放：Form I-407 + 检查 Exit Tax · 拖越久曝险越大。',
    gloss: { 'Streamlined': '海外合规补报宽免程序 · 自愿补报 3 年 + 6 年 FBAR', 'I-407': '正式放弃绿卡申请 · 美领馆或邮寄' },
  },
  {
    q: '双重国籍 · 中美报税怎么处理？', cat: 'visa',
    tags: ['cross-border', 'return-china', 'tax-resident'],
    a: '**美国看护照**：你是美国公民 = 无论住哪都全球报美税。中国**不承认**双重国籍（成年后自动放弃中国籍）· 中国公民变美国公民后技术上已**失去**中国身份 · 但实际执行弹性大。实务：① 美国这边合规：1040 + FBAR + FATCA 8938 ② 中国这边：如果是税务居民（中国住 > 183 天/年）也报中国税 · **中美避免双重征税协定** 互认税款抵免（Foreign Tax Credit · Form 1116）③ 护照变更时主动在中国户籍销户。高净值建议 CPA + 中美两地律师联合规划。',
    gloss: { 'FTC': 'Foreign Tax Credit · Form 1116 · 境外税抵美税', '中美税收协定': 'US-China Tax Treaty · 1984 生效 · 避免双重征税', '护照销户': '中国户籍办公室办理 · 影响医保 / 社保 / 房产' },
  },
  // ═══════════════════════════════════════════════════════════
  //  跨境 · 加→美 · 5 条
  // ═══════════════════════════════════════════════════════════
  {
    q: '从加拿大搬美国 · TFSA 要不要取出？', cat: 'visa', hot: true,
    tags: ['cross-border', 'ca-us', 'tfsa', 'visa-tn', 'visa-h1b'],
    a: '**要取 · 搬前取 · 不然变灾难。** TFSA 在加拿大免税 · 但 **美国 IRS 不承认** · 把 TFSA 当 foreign trust 征税 · 每年账户增值全算普通收入（ordinary income · 最高 37%）· 还要填 **Form 3520 + 3520-A**（罚金最低 $10K 一张表）。RRSP 有 Treaty 豁免（填 8833 每年延税 · 取出才缴）· 但 TFSA **没有** Treaty 保护。**操作**：搬美前全部取出（加拿大免税）· 带到美国存 Roth IRA（如合资格）或 Taxable 账户。已经搬了：立刻取 + 找 CPA 补报 3520 + 评估 Streamlined。',
    gloss: { 'TFSA': '加拿大免税投资账户 · 不是美国 Tax-Free', 'Form 3520': '美国境外信托 / 赠与报表 · TFSA 被 IRS 归为 foreign trust', 'Form 3520-A': 'Foreign Trust 年度报告 · 年限 3/15' },
  },
  {
    q: 'RRSP 到美国要交税吗？', cat: 'visa', hot: true,
    tags: ['cross-border', 'ca-us', 'rrsp', 'treaty'],
    a: '**不用 · 但要 Treaty 选择。** US-Canada Tax Treaty Article XVIII.7 允许 RRSP / RRIF 在美国延税（像 Traditional IRA）· 直到取出才缴联邦税。**每年要做的**：① 1040 正常报美国收入 ② 如果 RRSP 账户余额 > $10K → **FBAR** ③ 如果余额 > $50K / $100K → **Form 8938** ④ **Form 8891** 已被废除 · 现在自动 deemed-election · 不需要填（2014 年改的）。**注意**：州层面 **CA / NJ 不认 Treaty** · CA 加州每年要交 state tax on gains inside RRSP。取出时联邦按 ordinary income · 加拿大预扣 25% · 用 **Form 1116 Foreign Tax Credit** 抵。',
    gloss: { 'RRSP': '加拿大注册退休储蓄计划 · US IRS 视作 foreign pension', 'FBAR': 'FinCEN 114 · 境外账户 > $10K 申报 · 漏报罚重', 'Form 8938': 'FATCA 个人境外金融资产表 · 1040 附件' },
  },
  {
    q: 'TN / H1B 加拿大人 · FBAR 要报啥？', cat: 'visa',
    tags: ['cross-border', 'ca-us', 'fbar', 'visa-tn'],
    a: '**任何年度任一天账户总和 > $10K USD** 就要报。**加拿大账户全算**：RBC/TD/CIBC 支票储蓄 · RRSP · TFSA · RESP · FHSA · RRIF · GIC · 加拿大券商（Questrade / Wealthsimple）。**不算**：加拿大房产本身 / 直接持股 · 但如果通过券商 / 基金持有 → 算。**报法**：FinCEN 114（不是 IRS）· 4/15 截止 · 自动延期 10/15 · 电子申报 bsaefiling.fincen.treas.gov · **免费**。漏报：每账户每年 $14,229 罚（非故意）· 故意最高账户余额 50% / $161K 取高。**注意**：夫妻合报 signing authority 的账户也要报。',
    gloss: { 'FBAR': 'FinCEN Form 114 · 境外金融账户报告 · 非报税表', 'FinCEN': '美国财政部金融犯罪执法局' },
  },
  {
    q: '搬去美国当年 · 加拿大 Exit Tax 怎么算？', cat: 'visa', hot: true,
    tags: ['cross-border', 'ca-us', 'exit-tax', 'first-year'],
    a: '加拿大叫 **Departure Tax**（不是 Exit Tax）· 用 **deemed disposition** 规则：离境日所有非豁免资产**视作卖出** · 未实现 capital gain 当年全缴（50% 纳入 · 按边际）。**豁免资产**：加拿大房产 · RRSP/TFSA/FHSA · 养老金 · 私人公司股份（某些条件）。**要交税的主要是**：加拿大券商里的股票 / ETF · 加密货币 · 海外资产 · 贵金属。**策略**：① 离境前触发 gain 的资产先卖（税率低时）② 亏损资产先卖 offset ③ 低收入年离境（税率低）④ 搬到无省税期间卖大户（联邦部分）⑤ 可以 elect 推迟（post T1243）· 填保证金。**美国端**：搬来当年是 Dual-Status · 非居民期 + 居民期分别报 · 加拿大资产基础 = 离境日 FMV（deemed acquisition）· 未来美国端卖只对搬来后 gain 征税。',
    gloss: { 'Exit Tax': '加拿大 Departure Tax / US Exit Tax §877A · 两边都有但不同', 'Deemed Disposition': '加拿大离境日视同售出规则', 'Dual-Status': '美国税首年双身份 · 非居民期 + 居民期合成一张 1040' },
  },
  {
    q: '加拿大人在美国 · 还能存 RRSP / TFSA 吗？', cat: 'visa',
    tags: ['cross-border', 'ca-us', 'rrsp', 'tfsa'],
    a: '**RRSP**：技术上可以存（如果还有加拿大收入 / carry forward 空间）· 但 **美国税层面不给抵** · RRSP 供款美国不减税（US 只认 401k/IRA）· 反而增加美国应税收入。**TFSA**：**绝对不要存** · 美国会把每年供款 + 增值当普通收入征税 + 罚金 + 表单地狱。**正确路径**：搬美后 freeze 加拿大账户 · 只在美国存 401k / Roth IRA / HSA / Traditional IRA。保留 RRSP 长期复利（treaty 延税）· 但不要新增。TFSA 搬前取出 · 搬后不要碰。',
    gloss: { 'Carry Forward': 'RRSP 未用空间无限期保留 · 可以以后用', 'Roth IRA': '美国版 TFSA · 但加拿大不认 Treaty · 回加拿大要报' },
  },
];

// ═══════════════════════════════════════════════════════════
// v101: 加拿大 Myths（15 条核心）
// 聚焦华人社区痛点：TFSA/RRSP/FHSA · 新移民 · 跨境 · 自雇
// ═══════════════════════════════════════════════════════════
const MYTHS_CA = [
  {
    q: 'TFSA 和 RRSP 到底怎么选？', cat: 'retire', hot: true,
    tags: ['tfsa', 'rrsp', 'basic'],
    a: '核心判断：**现在边际税率 vs 退休时边际税率**。\n· **现在收入高 · 退休后低** → RRSP（省现在边际 · 退时按低税率取）· 典型：工程师年薪 $120K+\n· **现在收入低 · 退休后估计也低** → TFSA（扣完税存 · 投资免税 · 取免税 · 不影响 OAS）· 典型：学生 / 实习 / 刚入行\n· **中等收入** → **两个都用**。RRSP 优先拿 refund 再投 TFSA。\n· 关键：RRSP 取出算 income 会影响 OAS / CCB · TFSA 不会。年轻人优先 TFSA 保留 RRSP 空间 carry forward。',
    gloss: { RRSP: 'Registered Retirement Savings Plan', TFSA: 'Tax-Free Savings Account', OAS: 'Old Age Security · 长者金' },
  },
  {
    q: 'FHSA 到底要不要开？', cat: 'house', hot: true,
    tags: ['fhsa', 'house', 'firstbuyer'],
    a: '**只要还没买房 · 立刻开**。FHSA = RRSP 的扣税优势 + TFSA 的取出免税 · 年限 $8K · 终生 $40K。\n· 开户那一刻起产生 $8K 额度 · 即使不存钱也占位 · 不开浪费\n· 可 carry forward 1 年（最多 $16K/年）\n· 买首房取出 **全额免税** · 和 HBP $60K 可叠加 = 单人最多 $100K · MFJ $200K 免税首付\n· 15 年没买房转 RRSP · 不浪费 · 不像 HBP 要还\n· 2025 内开 + 2025/12/31 前存 $8K = 退税 ~$2-3K（边际 24-29%）\n· **坑**：过去一年里如果是任何房主（含父母房产 co-own）就不符合 first-time 定义。',
    gloss: { FHSA: 'First Home Savings Account', HBP: "Home Buyer's Plan" },
  },
  {
    q: 'HBP 和 FHSA 都有 · 先用哪个？', cat: 'house',
    tags: ['hbp', 'fhsa', 'house'],
    a: '**先 FHSA · 再 HBP**。顺序很关键：\n① FHSA $40K 取出**完全免税 · 不用还**\n② HBP $60K 从 RRSP 取 · 15 年分期还 · 不还部分算 income\n\nFHSA 是"免费的钱"· HBP 是"免息贷款"。两个都用：FHSA 放前面先扔进首付 · 不够再 HBP 顶上。',
    gloss: { FHSA: 'First Home Savings Account', HBP: "Home Buyer's Plan" },
  },
  {
    q: '留学生毕业 · Work Permit 第一年怎么报？', cat: 'visa', hot: true,
    tags: ['student', 'newcomer', 'visa'],
    a: '**你是加拿大税务居民** · 第一年报税就要报全球收入（从 "residency start date" 起）。\n· **Study Permit 期间的工资** 也要报（包括校内兼职 / co-op）\n· 开 SIN 第一天就建立了 residency · 不是等 PR 才算\n· 第一年可能有 **Transitional Resident** 身份：登陆前的海外资产 deemed acquired at FMV（新成本价 = 登陆日市价）· 以后卖不被税\n· 填 T1 · 附 T4（校方 / 实习雇主发）· 可能有 T2202（学费抵免 · 可 carry forward 或转给配偶/父母）\n· RRSP 要有"上年 earned income"才有空间 · 第二年才能用\n· TFSA 建立 residency 当年就有 $7K 空间 · 立刻能用',
    gloss: { SIN: 'Social Insurance Number · 社保号 · 开账户报税必备', T2202: '学费抵免单 · 大学发 · 能抵 income 或 carry forward' },
  },
  {
    q: '新 PR 第一年要怎么操作？', cat: 'visa', hot: true,
    tags: ['newcomer', 'pr', 'cross-border'],
    a: '**登陆日（landing day）是税务身份切换的分水岭**。\n· 登陆日**前**的海外收入 · 不算加拿大税务居民收入 · 不报\n· 登陆日**后**的全球收入 · 全部要报（包括中国工资 / 房租 / 利息 / 股息）\n· **Deemed Acquisition 规则**：登陆日那一天 · 所有海外资产按当天 FMV 作为新 cost base\n· **登陆前"该卖"**：涨很多的海外资产建议登陆前卖 · 登陆后用 FMV 作为新成本 · 减少将来的 capital gains\n· **T1135**：海外成本 > C$100K 要报（自用房 · RRSP/TFSA 不算）· 中国国内房 + 账户合计经常超 · 必报\n· **税务协定**：中加双边协定可抵税（Foreign Tax Credit）· 中国已交的税可以抵加拿大这边该交的 · 避免双重征税。',
    gloss: { 'Deemed Acquisition': '登陆日 FMV 作为新成本 · 避免追溯海外 gain', T1135: 'Foreign Income Verification · 海外资产申报' },
  },
  {
    q: '从中国父母那里汇钱过来要交税吗？', cat: 'cross-border', hot: true,
    tags: ['gift', 'cross-border', 'china'],
    a: '**加拿大没有赠与税**。父母给你汇钱 · 无论金额 · 加拿大这边 **零税**。\n· 银行可能要求证明资金合法来源（查洗钱）· 准备父母的工资单 / 房产证 / 银行流水\n· 汇进来的钱 · 之后产生的**利息 / 投资增值 / 房租** 才是你的税务 income · 要报\n· **注意**：如果 > CAD 10,000 过境 · 要申报（FINTRAC · 海关）· 不报罚款\n· 中国端：父母汇你 · 中国每人每年 $50K 美元等值的换汇限额 · 分批汇需注意洗钱监管\n· **常见错误**：以为"海外汇款都要报税"→ 不是 income 不用报 · 只有之后产生的收益才报。',
    gloss: { FINTRAC: 'Canada 金融交易报告中心 · 反洗钱监管' },
  },
  {
    q: '回中国工作 · 还要报加拿大税吗？', cat: 'cross-border',
    tags: ['cross-border', 'return-china', 'residency'],
    a: '**关键看你有没有断 residency**。加拿大是 residency-based 征税：\n· 如果你**断了 residency**（搬回中国 · 卖房 · 销户 · 不在加住）· 只报加拿大来源收入（如果还有房租）· 不报中国工资\n· 如果**没断**（还有房 · 配偶娃在加 · 回国短期）· 全球收入都要报 · 但中国已交的税可 Foreign Tax Credit 抵\n· **Substantial ties 测试**：有房 · 有配偶娃 · 有 OHIP / 驾照 / 银行账户在加 → 视为 residency 没断\n· **正式断 residency**：填 NR73 表（确认）· 那天 deemed disposition（所有投资账户视为卖掉 · 可能交 exit tax）· 加拿大物业继续要报（NR4）',
    gloss: { NR73: '非居民身份确认表 · 正式离加时填', 'Deemed Disposition': '离加时 · 投资账户视同卖掉 · 触发税' },
  },
  {
    q: '加拿大房东把房子卖了 · 税怎么算？', cat: 'house',
    tags: ['house', 'rental', 'sale'],
    a: '**自住房 vs 出租房 vs 混合**：\n· **Principal Residence Exemption (PRE)** · 每年 designate 为自住房那部分年份的 gain 全免。一家一套（2001 起夫妻合一）\n· 纯出租房：全部 gain 的 50% 算 taxable\n· 有"部分年份自住 · 部分年份出租"· 按比例拆分 PRE\n· **反炒房规则（Anti-flipping）**：住宅持有 < 365 天 · gain 全额算 business income（不能用 PRE · 不能 50%）· 按边际交\n· **Change in use**：自住改出租（或反）那一天 · deemed sold at FMV · 即使没真卖。可以选 S.45(2) 最多延 4 年·自住期不算 change\n· **2016 起**：哪怕 100% 免税 · 也必须在 T1 Schedule 3 报卖房。',
    gloss: { PRE: 'Principal Residence Exemption · 自住房豁免', BrightLine: '反炒房规则 · < 1 年算生意' },
  },
  {
    q: 'Non-resident 卖加拿大房 · 要扣 25%？', cat: 'cross-border',
    tags: ['nonresident', 'house', 'sale'],
    a: '**是的 · 这是大坑**。非税务居民卖加拿大房 · 律师 / 买家要**预扣 25% 的卖价**（不是 gain · 是整个卖价！）给 CRA · 除非拿到 **Compliance Certificate**。\n· 流程：① 卖前申请 Section 116 Certificate · 15-25 天批 · 用实际 gain × 25% 算扣 ② 没证书 · 律师直接按卖价 25% 扣 ③ 之后申请退税\n· **例子**：非居民卖 $1M 的房 · cost $800K · gain $200K\n· 无证书：律师扣 $250K · 你拿 $750K · 之后申请退回 $200K（留 $50K = gain × 25%）\n· 有证书：律师只扣 $50K\n· 本地税务律师帮忙申请 · 费用 $500-1,500 · 值。',
    gloss: { 'Section 116': '非居民卖加房的预扣税制度', 'Compliance Certificate': 'CRA 核实后发 · 让律师少扣' },
  },
  {
    q: 'QC 省为啥要填两份税表？', cat: 'state',
    tags: ['qc', 'state', 'multi-form'],
    a: 'QC 是加拿大唯一**单独报省税**的省份（其他省 T1 一份 CRA 分账）。\n· 联邦填 **T1** 交 CRA · 像其他省一样\n· QC 省额外填 **TP-1** 交 Revenu Québec（RQ）\n· 两边税基有差异：QC 有自己的 deductions / credits\n· QC 有独立的 **QPP**（取代 CPP · 率稍高）+ **QPIP**（取代 EI parental benefits · 率不同）\n· T4 上有 Box "QPP contributions"\n· TP-1 通常晚一周出结果 · 退税也走 RQ 账户不是 CRA\n· **软件**：TurboTax / Wealthsimple 都支持 QC bundle · 价格略贵',
    gloss: { 'TP-1': 'Quebec 省税表 · 联邦 T1 之外单独填', QPP: 'Quebec Pension Plan · 代替 CPP', QPIP: 'Quebec Parental Insurance Plan' },
  },
  {
    q: 'CCB 牛奶金怎么领得多？', cat: 'family',
    tags: ['ccb', 'children', 'optimization'],
    a: 'CCB = **免税现金** · 按 "family net income" 发 · 越低拿越多。\n· 2025 金额：6 岁以下 **$7,997/娃** · 6-17 岁 **$6,748/娃**\n· Family net income < $36,502 → 拿满\n· $36,502-$79,087 第一档 phase-out · 每 $1 减 $0.07-$0.135\n· > $79,087 第二档 · 继续 phase-out\n· **两口之家 $150K 2 娃**：大约拿 $3-5K / 年（不满额）\n· **高收入 $200K+**：基本拿不到\n· **策略**：RRSP + FHSA 供款**压低** net income → CCB 多拿。$10K RRSP 供款 · 除了省 $3K 左右税 · 还能多拿 $700-1,300 CCB\n· **新娃**：生娃 11 个月内要申请（网上 My Account 或 RC66 表）',
    gloss: { CCB: 'Canada Child Benefit · 牛奶金' },
  },
  {
    q: '自雇 CPP 双份很亏吗 · 怎么办？', cat: 'biz',
    tags: ['selfemp', 'cpp', 'ccpc'],
    a: '**对 · 自雇要交 11.9% + 4% 双份**（雇员 + 雇主都自己出）· 年薪 $80K 的自雇比同样 T4 多交 ~$4K。\n· **策略 1：开 CCPC**（加拿大私有公司）· 小企业扣除 SBD · 前 $500K 主动业务收入联邦 9% + 省 ~3% = ~12%（vs 个人边际 30-50%）\n· **策略 2：CCPC 内付薪 / 分红 混合**\n  · 付薪：算 CPP 供款（将来拿 CPP pension）但交双份\n  · 分红：不交 CPP · 但不算 earned income（影响 RRSP 空间）· 触发 TOSI 新规对家人分红\n· **策略 3：RRSP 匹配扩大** · 自雇算 "net SE income × 18%"\n· **税务角度**：年自雇 > $80K 考虑 incorporate · CPA 做 cost-benefit · 账务成本 $3-5K/年 vs 省税 $8-15K',
    gloss: { CCPC: 'Canadian-Controlled Private Corporation', SBD: 'Small Business Deduction · 前 $500K 低税', TOSI: 'Tax on Split Income · 防家人拆分收入' },
  },
  {
    q: 'RRSP 71 岁转 RRIF · 什么时候开始取？', cat: 'retire',
    tags: ['rrsp', 'rrif', 'retire'],
    a: '**必须 71 岁年底前转** · 要么 RRIF 要么年金 · 否则全部视为 income 一次性收。\n· 转 RRIF 后：每年必须取**最低提款额**（按年龄 × 账户值）· 71 岁 ~5.28% · 80 岁 ~6.82% · 90 岁 ~11.92%\n· 最低提款不扣预扣税 · 超最低额要扣 10/20/30%（看金额）\n· **策略**：\n  · **提前转**（60-65 岁）· 分批小量取 · 避免 71 岁后大额取触发 OAS clawback\n  · **RRSP meltdown**：退休前把 RRSP 慢慢取 · 同时存 TFSA · 退休时 TFSA 多 · RRIF 少 · OAS 不被吃\n  · **Pension Income Credit**：65+ 从 RRIF 取 · 前 $2K 可拿 $300 联邦 credit + 省 credit\n· **坑**：一次性大额取 · 除了边际税率 · 还触发 OAS 15% clawback · 加 GIS 丧失 · 有效税率可 > 60%',
    gloss: { RRIF: 'Registered Retirement Income Fund · RRSP 的领取版', 'OAS Clawback': '收入 > $93,454 起 15% 回收' },
  },
  {
    q: '夫妻间可以拆分收入省税吗？', cat: 'family',
    tags: ['couple', 'split', 'strategy'],
    a: '加拿大**每人独立报税**（没有 MFJ）· 但几种合法拆分：\n· **Spousal RRSP**：高收入方供款进低收入方的 RRSP · 取款时算低收入方 income · 3 年 attribution 后才安全（3 年内取算回高收入方）\n· **Pension Income Splitting**：65+ · RRIF / 年金 income 可以把最多 50% 转配偶那边报 · 拉平税率\n· **TFSA gift**：给配偶 TFSA 的钱不触发 attribution（TFSA 是 credit 机制 · 不算 income）\n· **CCB 合并**：CCB 按 family net income 算 · 两人合并报 · 高收入那方报也不会让娃钱少\n· **不能做的**：给配偶 non-registered account 的钱 · 投资收益 attribute 回你身上（夫妻间 attribution 规则很严）\n· **CCPC TOSI**：2018 新规 · 配偶在 CCPC 里分红要有"实际工作贡献"· 否则按你的边际税率征 · 拆分失败',
    gloss: { 'Attribution Rules': '夫妻间转账的收益归属规则', 'Pension Splitting': '退休收入夫妻间分摊 · 拉平税率' },
  },
  {
    q: '加拿大有没有类似 US Roth 的"后门"？', cat: 'retire',
    tags: ['tfsa', 'rrsp', 'strategy'],
    a: '**基本没有**。加拿大的结构比美国简单：\n· 没有收入上限（不像 US Roth IRA $236K MFJ phase-out）· TFSA 谁都能存\n· 没有"Mega Backdoor"（US 401k after-tax + in-service conversion）· RRSP 上限就是 18% × 收入 $32,490\n· 没有 ISO / RSU 股权激励的复杂税法（RSU 加拿大直接算 income at vest · T4 上）\n· 有点类似的"奇技淫巧"：\n  · **FHSA → RRSP 转**：15 年没买房 · $40K FHSA 全转 RRSP · 不占 RRSP room · 相当于永久扩大 RRSP 空间\n  · **超额 RRSP $2K 宽免**：允许超 $2K 不罚 · 可保留做 buffer\n  · **RRSP overcontribution 71 岁**：最后一年可故意超存 1 月再取 · 赚一点时间价值\n· **结论**：加拿大走"少 · 简 · 干净"路线 · 不像美国需要律师帮忙。',
    gloss: { 'Mega Backdoor': 'US 401k after-tax + conversion · 加拿大无对应' },
  },
];

// v57: 分类→背景色映射（柔和 pastel，每格独立色调）
const MYTH_CAT_COLOR = {
  cap:    { bg: '#F1EEE4', border: '#D5CCB0', hotBg: '#FAF3DA', hotBorder: '#E6C97A' }, // 投资·利得 米黄
  state:  { bg: '#E8EEF2', border: '#B8C7D4', hotBg: '#EAF2F9', hotBorder: '#9FBBD0' }, // 州税 蓝灰
  retire: { bg: '#EAF0E8', border: '#B8CDB0', hotBg: '#E4F0DD', hotBorder: '#95B388' }, // 退休账户 薄荷绿
  biz:    { bg: '#F2E9E3', border: '#D9BFA8', hotBg: '#F4E1CE', hotBorder: '#CC9365' }, // 自雇 暖棕
  visa:   { bg: '#EDE8F1', border: '#C6B8D4', hotBg: '#E8DEF1', hotBorder: '#A08AC1' }, // 签证 淡紫
  family: { bg: '#F1E7E7', border: '#D4B8B8', hotBg: '#F0DCDC', hotBorder: '#C68D8D' }, // 家庭 玫粉
  ultra:  { bg: '#E8E2D5', border: '#B8A875', hotBg: '#E8DFBB', hotBorder: '#A08850' }, // 超高净值 橄榄金
  other:  { bg: '#EDEDE7', border: '#C8C8BE', hotBg: '#E8E8DA', hotBorder: '#A8A895' }, // 其他 米灰
};

// v59: 分类标签 + 显示顺序
const MYTH_CAT_LABEL = {
  cap:    { label: '投资 · 利得', sub: '资本利得 · 损失 · 分红' },
  state:  { label: '州税 · 跨州',  sub: 'SALT · Convenience · Domicile' },
  retire: { label: '退休账户',     sub: '401(k) · Roth · HSA · Backdoor' },
  biz:    { label: '自雇 · 业务', sub: 'Sch C · QBI · S-Corp · 1099-K' },
  visa:   { label: '签证 · 身份', sub: 'H1B · F1 · FBAR' },
  family: { label: '家庭 · 教育', sub: 'CTC · 父母 · 学费 · 租房' },
  ultra:  { label: '超高净值', sub: 'QSBS · 1031 · DAF · 信托' },
  other:  { label: '其他误区',     sub: 'Gym · 宠物 · 彩票 · 报税晚' },
};
const MYTH_CAT_ORDER = ['retire', 'biz', 'state', 'cap', 'family', 'ultra', 'visa', 'other'];

// ═══════════════════════════════════════════════════════════
//   居住地最优化器
//  只换住处：锁定工作不变，找最省税的住处
//  换工作也考虑：假设能同时换工作 + 居住地
// ═══════════════════════════════════════════════════════════

const optimizeResidence = (inputs, calc) => {
  // v104: CA 模式用省份候选（不是美国州）
  const isCA = calc?._country === 'CA';
  if (isCA) {
    const candidatesCA = [
      { state: 'AB', city: '', label: '阿省 (AB)', desc: 'BPA $21,885 全国最高 · 顶档 15%' },
      { state: 'SK', city: '', label: '萨省 (SK)', desc: '平档税率 · 中档宽' },
      { state: 'MB', city: '', label: '曼省 (MB)', desc: '中等税率 · 生活成本低' },
      { state: 'BC', city: 'vancouver', label: '卑诗 (BC · 温哥华)', desc: '累进 7 档到 20.5% · 无空屋税对自住' },
      { state: 'ON', city: 'toronto', label: '安省 (ON · 多伦多)', desc: '5 档 · ON surtax + OHP $900' },
      { state: 'QC', city: 'montreal', label: '魁北克 (QC · 蒙特利尔)', desc: '起步 14% 全国最高 · 双申报' },
      { state: 'NB', city: '', label: '新不省 (NB)', desc: '4 档 · 顶档 19.5%' },
      { state: 'NS', city: '', label: '诺省 (NS)', desc: '顶档 21% 全国第二' },
    ];
    const currentKey = `${inputs.state}-${inputs.city || ''}`;
    const results = candidatesCA.map((c) => {
      const newInputs = {
        ...inputs,
        state: c.state,
        city: c.city || '',
        workState: '',
      };
      const newCalc = computeTaxCA(newInputs);
      return {
        key: `${c.state}-${c.city || ''}`,
        state: c.state,
        city: c.city || '',
        label: c.label,
        desc: c.desc,
        stateTax: newCalc.stateTax,
        localTax: 0,
        stateAndLocal: newCalc.stateTax,
        totalTax: newCalc.totalTax,
        deltaVsCurrent: newCalc.totalTax - calc.totalTax,
        isCurrent: `${c.state}-${c.city || ''}` === currentKey,
        calc: newCalc,    // v108: 补上 calc · LocationOptimizer detail modal 要用 calc.takeHome / calc.fedTax 等
      };
    });
    return results.sort((a, b) => a.totalTax - b.totalTax);
  }

  // 实际的工作州：若已设跨州工作则为 workState，否则等于居住州
  const actualWorkState = inputs.workState || inputs.state;
  const workStateDays = inputs.workStateDays ?? 100;
  const convenienceWork = CONVENIENCE_RULE_STATES[actualWorkState] != null;

  // 候选住处
  const candidates = [];

  // NY 系列：和 NY 工作搭配最常见
  candidates.push(
    { state: 'NY', city: '', label: 'NY 州非市区', desc: '长岛 · Westchester · Upstate · 无市税' },
    { state: 'NY', city: 'nyc', label: 'NYC 纽约市', desc: 'Manhattan · BK · Queens · +3.88% 市税' },
    { state: 'NY', city: 'yonkers', label: 'Yonkers', desc: 'Westchester · NY 州税 × 16.75% 附加' },
  );

  candidates.push(
    { state: 'NJ', city: '', label: 'New Jersey', desc: '全州税率一样 · 跟 PA 有 reciprocal' },
    { state: 'CT', city: '', label: 'Connecticut', desc: '6.5–7% 累进 · 无市税' },
    { state: 'PA', city: '', label: 'PA 非费城/匹兹堡', desc: '3.07% flat · NJ 有 reciprocal' },
    { state: 'PA', city: 'phila', label: '费城', desc: '3.07% PA + 3.75% 市税' },
  );

  // MA 在通勤圈内
  candidates.push({ state: 'MA', city: '', label: 'Massachusetts', desc: '5% flat · 百万富翁 +4%' });

  const isWFH = (inputs.workStateDays ?? 100) < 30;

  // 只有工作州不是 Convenience 规则时，无税州才有意义
  if (!convenienceWork) {
    const wfhSuffix = isWFH ? '(你已 100% WFH ✓)' : '(需真远程)';
    candidates.push(
      { state: 'FL', city: '', label: `Florida ${wfhSuffix}`, desc: '0% 州税 · 迈阿密/坦帕' },
      { state: 'NV', city: '', label: `Nevada ${wfhSuffix}`, desc: '0% 州税 · 拉斯维加斯' },
      { state: 'TX', city: '', label: `Texas ${wfhSuffix}`, desc: '0% 州税 · 奥斯汀/休斯顿' },
      { state: 'WA', city: '', label: `Washington ${wfhSuffix}`, desc: '0% 工资税 · 西雅图' },
      { state: 'TN', city: '', label: `Tennessee ${wfhSuffix}`, desc: '0% 州税 · 纳什维尔' },
    );
  }

  const currentKey = `${inputs.state}-${inputs.city || ''}`;

  const results = candidates.map((c) => {
    const newInputs = {
      ...inputs,
      state: c.state,
      city: c.city || '',
      workState: c.state === actualWorkState ? '' : actualWorkState,
      workStateDays: workStateDays,
    };
    const newCalc = computeTax(newInputs);
    return {
      key: `${c.state}-${c.city || ''}`,
      state: c.state,
      city: c.city || '',
      label: c.label,
      desc: c.desc,
      stateTax: newCalc.stateTax,
      localTax: newCalc.localTax,
      stateAndLocal: newCalc.stateTax + newCalc.localTax,
      totalTax: newCalc.totalTax,
      deltaVsCurrent: newCalc.totalTax - calc.totalTax,
      isCurrent: `${c.state}-${c.city || ''}` === currentKey,
      newInputs,
      calc: newCalc,
    };
  });

  return results.sort((a, b) => a.totalTax - b.totalTax);
};

const optimizeRelocation = (inputs, calc) => {
  // v104: CA 模式用省份（工作 + 居住同省 · 加拿大没跨省通勤的概念）
  const isCA = calc?._country === 'CA';
  if (isCA) {
    const candidatesCA = [
      { state: 'AB', city: '', label: '阿省 (工作 + 居住)', desc: '卡尔加里 / 埃德蒙顿 · BPA $21.9K 最高' },
      { state: 'SK', city: '', label: '萨省', desc: '里贾纳 / 萨斯卡通 · 中档低' },
      { state: 'MB', city: '', label: '曼省', desc: '温尼伯 · 生活成本低' },
      { state: 'ON', city: 'toronto', label: '安省 · 多伦多', desc: '最大就业市场 + ON surtax' },
      { state: 'BC', city: 'vancouver', label: '卑诗 · 温哥华', desc: '西海岸 · 7 档 到 20.5%' },
      { state: 'QC', city: 'montreal', label: '魁北克 · 蒙特利尔', desc: '起步 14% · 但生活成本最低' },
    ];
    const currentKey = `${inputs.state}-${inputs.city || ''}`;
    const results = candidatesCA.map((c) => {
      const newInputs = {
        ...inputs,
        state: c.state,
        city: c.city || '',
        workState: '',
      };
      const newCalc = computeTaxCA(newInputs);
      return {
        key: `${c.state}-${c.city || ''}-`,
        state: c.state,
        city: c.city || '',
        label: c.label,
        desc: c.desc,
        stateTax: newCalc.stateTax,
        localTax: 0,
        stateAndLocal: newCalc.stateTax,
        totalTax: newCalc.totalTax,
        deltaVsCurrent: newCalc.totalTax - calc.totalTax,
        isCurrent: `${c.state}-${c.city || ''}` === currentKey,
        newInputs,
        calc: newCalc,
      };
    });
    return results.sort((a, b) => a.totalTax - b.totalTax);
  }

  // 假设能同时换工作 + 住地 → 工作州 = 居住州，无 workState
  const candidates = [
    { state: 'FL', city: '', label: 'FL 工作 + FL 居住', desc: '0% 州税 · 迈阿密/坦帕/奥兰多' },
    { state: 'TX', city: '', label: 'TX 工作 + TX 居住', desc: '0% 州税 · 奥斯汀/休斯顿/达拉斯' },
    { state: 'NV', city: '', label: 'NV 工作 + NV 居住', desc: '0% 州税 · 拉斯维加斯' },
    { state: 'WA', city: '', label: 'WA 工作 + WA 居住', desc: '0% 工资税 · 西雅图 · 7% 利得 >$250K' },
    { state: 'TN', city: '', label: 'TN 工作 + TN 居住', desc: '0% 州税 · 纳什维尔' },
    { state: 'NH', city: '', label: 'NH 工作 + NH 居住', desc: '0% 工资 · 4% 投资' },
    { state: 'AZ', city: '', label: 'AZ 工作 + AZ 居住', desc: '2.5% flat · 凤凰城' },
    { state: 'PA', city: '', label: 'PA 工作 + PA 居住', desc: '3.07% flat · 匹兹堡' },
    { state: 'NC', city: '', label: 'NC 工作 + NC 居住', desc: '4.25% flat · 夏洛特' },
    { state: 'CO', city: '', label: 'CO 工作 + CO 居住', desc: '4.4% flat · 丹佛' },
    { state: 'UT', city: '', label: 'UT 工作 + UT 居住', desc: '4.55% flat · 盐湖城' },
    { state: 'IL', city: '', label: 'IL 工作 + IL 居住', desc: '4.95% flat · 芝加哥' },
  ];

  const currentKey = `${inputs.state}-${inputs.city || ''}-${inputs.workState || ''}`;

  const results = candidates.map((c) => {
    const newInputs = {
      ...inputs,
      state: c.state,
      city: c.city || '',
      workState: '',
      workStateDays: 100,
    };
    const newCalc = computeTax(newInputs);
    return {
      key: `${c.state}-${c.city || ''}-`,
      state: c.state,
      city: c.city || '',
      label: c.label,
      desc: c.desc,
      stateTax: newCalc.stateTax,
      localTax: newCalc.localTax,
      stateAndLocal: newCalc.stateTax + newCalc.localTax,
      totalTax: newCalc.totalTax,
      deltaVsCurrent: newCalc.totalTax - calc.totalTax,
      isCurrent: `${c.state}-${c.city || ''}-` === currentKey,
      newInputs,
      calc: newCalc,
    };
  });

  return results.sort((a, b) => a.totalTax - b.totalTax);
};

const LocationOptimizer = ({ inputs, calc, setInputs }) => {
  const [mode, setMode] = useState('residence');
  const [pickedKey, setPickedKey] = useState(null);
  const [showAllLocations, setShowAllLocations] = useState(false);

  const residenceResults = useMemo(() => optimizeResidence(inputs, calc), [inputs, calc]);
  const relocationResults = useMemo(() => optimizeRelocation(inputs, calc), [inputs, calc]);
  const results = mode === 'residence' ? residenceResults : relocationResults;

  // 给顶部提示
  const actualWorkState = inputs.workState || inputs.state;
  const workStateName = STATE_BRACKETS[actualWorkState]?.label || actualWorkState;
  const hasConv = CONVENIENCE_RULE_STATES[actualWorkState] != null;

  const detail = pickedKey ? results.find(r => r.key === pickedKey) : null;

  // Top N: 保留前 3 个 + 当前（如果 current 不在前 3 则替换第 4 个）
  const LOC_TOP = 4;
  const top3 = results.slice(0, LOC_TOP - 1);
  const currentInTop = top3.some(r => r.isCurrent);
  const current = results.find(r => r.isCurrent);
  const defaultTop = currentInTop ? results.slice(0, LOC_TOP) : [...top3, current].filter(Boolean);
  const top = showAllLocations ? results.slice(0, 8) : defaultTop;
  const hasMoreLocations = results.length > LOC_TOP;

  // 切 mode 时重置选中
  const handleModeChange = (m) => { setMode(m); setPickedKey(null); };

  return (
    <div className="rounded-2xl mb-2 overflow-hidden" style={{ background: C.card, border: `1px solid ${C.line}` }}>
      <div className="px-4 py-2" style={{ borderBottom: `1px solid ${C.lineLite}` }}>
        <div className="flex items-baseline justify-between mb-2">
          <span style={{
            fontSize: 10, color: C.mute, fontFamily: F_BODY,
            fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase',
          }}>
             居住地最优化
          </span>
          <span style={{ fontSize: 10, color: C.muteLite, fontFamily: F_BODY }}>
            只看税
          </span>
        </div>
        <SegButton
          options={[
            { v: 'residence', l: '只换住处' },
            { v: 'relocation', l: '换工作也考虑' },
          ]}
          value={mode}
          onChange={handleModeChange}
          size="sm"
        />
        {mode === 'residence' && hasConv && (
          <div style={{
            fontSize: 10, color: C.warn, fontFamily: F_BODY, marginTop: 8,
            padding: '6px 10px', borderRadius: 6, background: C.warnBg, lineHeight: 1.5,
          }}>
            † {workStateName} 有 Convenience Rule：无论住哪，{workStateName} 都对你 100% W2 征非居民税。住在不同地方省的是"居住州"的那部分税，因此 {workStateName} 非市区 ≈ 周边州 ≈ {workStateName} 市区 − 市税。
          </div>
        )}
        {mode === 'residence' && !hasConv && (inputs.workStateDays ?? 100) < 30 && (
          <div style={{
            fontSize: 10, color: C.save, fontFamily: F_BODY, marginTop: 8,
            padding: '6px 10px', borderRadius: 6, background: C.saveBg, lineHeight: 1.5,
          }}>
            ✓ 你已 100% WFH + {workStateName} 无 Convenience Rule —— 可以真正搬到无税州省钱。工作不用变。
          </div>
        )}
      </div>

      {/* 2-col 正方形网格 */}
      <div style={{
        padding: 10,
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 6,
      }}>
        {top.map((r, idx) => {
          const isSave = r.deltaVsCurrent < 0;
          const isBest = idx === 0 && !r.isCurrent;
          return (
            <button
              key={r.key}
              onClick={() => setPickedKey(r.key)}
              style={{
                aspectRatio: '1 / 1',
                background: r.isCurrent ? C.infoBg : isBest ? C.saveBg : C.card,
                border: `1px solid ${r.isCurrent ? C.info : isBest ? C.save : C.line}`,
                borderRadius: 10, padding: 8,
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                textAlign: 'left', cursor: 'pointer',
                fontFamily: F_BODY, width: '100%',
                overflow: 'hidden', position: 'relative',
              }}
            >
              {/* 左上：排名或标记 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 4 }}>
                {r.isCurrent ? (
                  <span style={{
                    fontSize: 7, padding: '1px 4px', borderRadius: 3,
                    background: C.info, color: '#FFF',
                    fontFamily: F_BODY, fontWeight: 600, letterSpacing: '0.05em',
                  }}>当前</span>
                ) : isBest ? (
                  <span style={{
                    fontFamily: F_NUM, fontSize: 13, color: C.save, fontWeight: 700, lineHeight: 1,
                  }}>★</span>
                ) : (
                  <span style={{
                    width: 14, height: 14, borderRadius: '50%',
                    background: idx < 3 ? C.ink : C.line,
                    color: idx < 3 ? '#FFF' : C.mute,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 8, fontFamily: F_NUM, fontWeight: 700, flexShrink: 0,
                  }}>{idx + 1}</span>
                )}
              </div>

              {/* 中：标题 */}
              <div style={{
                fontSize: 10, fontFamily: F_BODY, fontWeight: 700,
                color: C.ink, lineHeight: 1.2,
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}>
                {r.label}
              </div>

              {/* 下：delta（只显示 delta，不再显示总税负以省空间） */}
              <div>
                <div style={{
                  fontSize: 11, marginTop: 2,
                  fontFamily: F_NUM, fontWeight: 700,
                  color: r.isCurrent ? C.mute : r.deltaVsCurrent < 0 ? C.save : r.deltaVsCurrent > 0 ? C.pay : C.mute,
                  letterSpacing: '-0.01em',
                }}>
                  {r.isCurrent || Math.abs(r.deltaVsCurrent) < 1 ? '基准' : (() => {
                    const abs = Math.abs(r.deltaVsCurrent);
                    const short = abs >= 10000 ? `${Math.round(abs/1000)}K` : abs >= 1000 ? `${(abs/1000).toFixed(1)}K` : Math.round(abs);
                    return (r.deltaVsCurrent >= 0 ? '+$' : '−$') + short;
                  })()}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* 展开 / 收起 */}
      {hasMoreLocations && (
        <button
          onClick={() => setShowAllLocations(!showAllLocations)}
          style={{
            width: '100%',
            padding: '8px 14px',
            borderTop: `1px solid ${C.lineLite}`,
            background: 'transparent', border: 'none',
            fontSize: 11, color: C.mute, fontFamily: F_BODY, fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          {showAllLocations ? '收起 ↑' : `展开更多 ↓（还有 ${results.length - defaultTop.length} 条）`}
        </button>
      )}

      {/* 详情弹窗 */}
      <DetailModal
        open={!!detail}
        onClose={() => setPickedKey(null)}
        title={detail?.label || ''}
        subtitle={detail?.desc}
        headerRight={detail && !detail.isCurrent && (
          <button
            onClick={() => {
              setInputs(detail.newInputs);
              setPickedKey(null);
            }}
            style={{
              fontSize: 11, padding: '6px 12px', borderRadius: 6,
              background: C.hero, border: 'none',
              color: C.heroInk, fontFamily: F_BODY, fontWeight: 700,
              cursor: 'pointer', letterSpacing: '0.02em',
              flexShrink: 0,
            }}
          >
            试试 →
          </button>
        )}
      >
        {detail && (
          <>
            {/* 大数字 */}
            <div style={{ display: 'flex', alignItems: 'stretch', gap: 8, marginBottom: 14 }}>
              <div style={{
                flex: 1, padding: 12, borderRadius: 10,
                background: C.card, border: `1px solid ${C.line}`,
              }}>
                <div style={{ fontSize: 9, color: C.mute, fontFamily: F_BODY, letterSpacing: '0.1em', textTransform: 'uppercase' }}>当前</div>
                <div style={{
                  fontFamily: F_NUM, fontSize: 22, fontWeight: 700,
                  color: C.ink, letterSpacing: '-0.02em', marginTop: 4,
                }}>
                  ${fmt(calc.totalTax)}
                </div>
                <div style={{ fontSize: 10, color: C.mute, fontFamily: F_BODY, marginTop: 2 }}>
                  到手 ${fmt(calc.takeHome)}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', color: C.mute, fontSize: 18, padding: '0 2px' }}>→</div>
              <div style={{
                flex: 1, padding: 12, borderRadius: 10,
                background: detail.deltaVsCurrent < 0 ? C.saveBg : detail.isCurrent ? C.card : C.payBg,
                border: `1px solid ${detail.deltaVsCurrent < 0 ? C.save : detail.isCurrent ? C.line : C.pay}`,
              }}>
                <div style={{ fontSize: 9, color: C.mute, fontFamily: F_BODY, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  {detail.isCurrent ? '当前' : '假设'}
                </div>
                <div style={{
                  fontFamily: F_NUM, fontSize: 22, fontWeight: 700,
                  color: detail.deltaVsCurrent < 0 ? C.save : detail.isCurrent ? C.ink : C.pay,
                  letterSpacing: '-0.02em', marginTop: 4,
                }}>
                  ${fmt(detail.totalTax)}
                </div>
                <div style={{ fontSize: 10, color: C.mute, fontFamily: F_BODY, marginTop: 2 }}>
                  到手 ${fmt(detail.calc.takeHome)}
                </div>
              </div>
            </div>

            {/* 差额 */}
            {!detail.isCurrent && detail.deltaVsCurrent !== 0 && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: 12, borderRadius: 10, marginBottom: 16,
                background: detail.deltaVsCurrent < 0 ? C.save : C.pay, color: '#FFF',
              }}>
                <span style={{ fontSize: 12, fontFamily: F_BODY, fontWeight: 600 }}>
                  {detail.deltaVsCurrent < 0 ? '总税负减少' : '总税负增加'}
                </span>
                <span style={{ fontFamily: F_NUM, fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>
                  {fmtSigned(detail.deltaVsCurrent)}
                </span>
              </div>
            )}

            {/* 税种对比（当前 vs 假设 + delta） */}
            <div style={{
              fontSize: 10, color: C.mute, fontFamily: F_BODY, fontWeight: 600,
              letterSpacing: '0.1em', marginBottom: 6, textTransform: 'uppercase',
            }}>
              分项对比
            </div>

            {/* 表头 */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr 1fr',
              gap: 4,
              padding: '6px 8px',
              fontSize: 9,
              color: C.muteLite,
              fontFamily: F_BODY,
              fontWeight: 600,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              borderBottom: `1px solid ${C.line}`,
              alignItems: 'baseline',
            }}>
              <span>税种</span>
              <span style={{ textAlign: 'right' }}>当前</span>
              <span style={{ textAlign: 'right' }}>假设</span>
              <span style={{ textAlign: 'right' }}>变化</span>
            </div>

            {/* 数据行 */}
            {[
              ['联邦', calc.fedTax, detail.calc.fedTax],
              ['州税', calc.stateTax, detail.stateTax],
              ['市/地方', calc.localTax, detail.localTax],
              ['FICA', calc.fica, detail.calc.fica],
              ['SE 税', calc.seTax, detail.calc.seTax],
            ].filter(r => r[1] > 0 || r[2] > 0).map(([label, before, after]) => {
              const d = after - before;
              const dRounded = Math.round(d);
              return (
                <div key={label} style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr 1fr',
                  gap: 4,
                  padding: '8px 8px',
                  borderBottom: `1px dashed ${C.lineLite}`,
                  fontSize: 12,
                  alignItems: 'baseline',
                }}>
                  <span style={{ fontFamily: F_BODY, color: C.ink2, fontWeight: 500 }}>{label}</span>
                  <span style={{
                    fontFamily: F_NUM, color: C.mute, fontWeight: 600,
                    textAlign: 'right',
                  }}>${fmt(before)}</span>
                  <span style={{
                    fontFamily: F_NUM, color: C.ink, fontWeight: 700,
                    textAlign: 'right',
                  }}>${fmt(after)}</span>
                  <span style={{
                    fontFamily: F_NUM, fontWeight: 700,
                    textAlign: 'right',
                    color: dRounded < 0 ? C.save : dRounded > 0 ? C.pay : C.muteLite,
                  }}>
                    {Math.abs(dRounded) < 1 ? '—' : fmtSigned(dRounded)}
                  </span>
                </div>
              );
            })}

            {/* 合计行 */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr 1fr',
              gap: 4,
              padding: '10px 8px',
              fontSize: 12,
              alignItems: 'baseline',
              background: C.cardAlt,
              marginTop: 4,
              borderRadius: 6,
            }}>
              <span style={{ fontFamily: F_BODY, color: C.ink, fontWeight: 700 }}>合计</span>
              <span style={{
                fontFamily: F_NUM, color: C.ink, fontWeight: 700,
                textAlign: 'right',
              }}>${fmt(calc.totalTax)}</span>
              <span style={{
                fontFamily: F_NUM, color: C.ink, fontWeight: 800,
                textAlign: 'right',
              }}>${fmt(detail.totalTax)}</span>
              <span style={{
                fontFamily: F_NUM, fontWeight: 800,
                textAlign: 'right',
                color: detail.deltaVsCurrent < 0 ? C.save : detail.deltaVsCurrent > 0 ? C.pay : C.muteLite,
              }}>
                {Math.abs(detail.deltaVsCurrent) < 1 ? '—' : fmtSigned(Math.round(detail.deltaVsCurrent))}
              </span>
            </div>

            <div style={{
              marginTop: 14, display: 'flex',
              alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 0',
              fontSize: 11, color: C.mute, fontFamily: F_BODY,
              borderTop: `1px solid ${C.lineLite}`,
            }}>
              <span>
                有效税率 <b style={{ color: C.mute, fontFamily: F_NUM }}>{pct(calc.effectiveRate)}</b>
                <span style={{ color: C.muteLite, margin: '0 4px' }}>→</span>
                <b style={{ color: C.ink, fontFamily: F_NUM }}>{pct(detail.calc.effectiveRate)}</b>
              </span>
              <span>
                扣除 <b style={{ color: C.mute }}>{calc.useItemize ? 'Item.' : 'Std.'}</b>
                <span style={{ color: C.muteLite, margin: '0 4px' }}>→</span>
                <b style={{ color: C.ink }}>{detail.calc.useItemize ? 'Itemize' : 'Standard'}</b>
              </span>
            </div>
          </>
        )}
      </DetailModal>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
//  误区条
// ═══════════════════════════════════════════════════════════

// v95: 根据 inputs（+ 可选 preset）生成一句"一眼认出"的人话 profile
// v97: 用下方"你的情景"叙述风格 · 让顶上和下面统一 · 生动而非冰冷
// 目的：取代"TAX YEAR 2025 · 夫妻合并"这种冷标签
// 示例输出：
//   · "中高薪单身 · NJ→NY 通勤"（对应底部"中高薪单身，住在新泽西，每天通勤纽约上班"）
//   · "HENRY 双薪 · 通勤 NYC · 1 娃"
//   · "自雇中产 · NYC · 无娃"
//   · "单薪 4 娃 · UT 盐湖城"
const profileOneLiner = (inputs, preset) => {
  if (!inputs) return '';
  const i = inputs;
  // 1) 收入层级（和底部 buildScenarioStory 同步）
  const totalIncome = (i.w2 || 0) + (i.spouseW2 || 0) + (i.inc1099 || 0);
  const hasSpouse = (i.spouseW2 || 0) > 0;
  const has1099 = (i.inc1099 || 0) > 0;
  const hasW2 = (i.w2 || 0) > 0 || hasSpouse;
  const isSelfOnly = has1099 && !hasW2;
  const isMixed = has1099 && hasW2;

  let band;
  if (totalIncome >= 1000000) band = '超高净值';
  else if (totalIncome >= 500000) band = '高净值';
  else if (totalIncome >= 250000) band = 'HENRY 准富';
  else if (totalIncome >= 150000) band = '中高薪';
  else if (totalIncome >= 80000) band = '中产';
  else if (totalIncome > 0) band = '起步';
  else band = '';

  // 2) 身份组合 · 把收入层 + 家庭 + 收入类型 合成一个词
  let identity;
  if (isSelfOnly) {
    identity = `${band || '自雇'}自雇`;
  } else if (isMixed) {
    identity = `${band}W2+副业`;
  } else if (hasSpouse) {
    identity = `${band}双薪`;
  } else if (i.filingStatus === 'MFJ') {
    identity = `${band}单薪 MFJ`;
  } else if (i.filingStatus === 'HoH') {
    identity = `${band}单亲`;
  } else {
    identity = `${band}单身`;
  }
  // 清理：如果 band 为空，不要出现"单身"前有奇怪的空字符串
  identity = identity.replace(/^\s+/, '') || (i.filingStatus === 'MFJ' ? 'MFJ' : i.filingStatus === 'HoH' ? '单亲' : '单身');

  const parts = [identity];

  // 3) 地点 · 有跨州优先讲通勤 · 否则显示州/省
  const stateLabelMap = {
    // US
    NY: '纽约', NJ: '新泽西', CA: '加州', TX: '德州', FL: '佛州',
    UT: '犹他', AK: '阿拉斯加', MA: '麻州', CT: '康州', IL: '伊利诺伊',
    PA: '宾州', DC: '华盛顿', WA: '华盛顿州', CO: '科州', GA: '佐治亚', OR: '俄勒冈',
    // Canada 省（和 US CA=加州 冲突 · 加拿大 CA='加拿大' 不会作 state code · 这里 CA 只会命中 US 加州）
    ON: '安省', BC: '卑诗', QC: '魁北克', AB: '阿省',
    MB: '曼省', SK: '萨省', NS: '诺省', NB: '新不省',
    NL: '纽芬兰', PE: '爱德华王子岛',
    YT: '育空', NT: '西北地区', NU: '努纳武特',
  };
  const cityLabelMap = {
    toronto: '多伦多', markham: '万锦', mississauga: '密西沙加',
    vancouver: '温哥华', richmond: '列治文', burnaby: '本拿比',
    montreal: '蒙特利尔', calgary: '卡尔加里', edmonton: '埃德蒙顿',
    ottawa: '渥太华', waterloo: '滑铁卢',
  };
  const st = i.state;
  const wst = i.workState;
  if (wst && wst !== st) {
    const from = stateLabelMap[st] || st;
    const to = stateLabelMap[wst] || wst;
    parts.push(`${from}→${to} 通勤`);
  } else if (st === 'NY' && i.city === 'nyc') {
    parts.push('NYC');
  } else if (i.city && cityLabelMap[i.city]) {
    // CA 加拿大城市
    parts.push(cityLabelMap[i.city]);
  } else if (st) {
    parts.push(stateLabelMap[st] || st);
  }

  // 4) 关键细节：娃 / 房 / 自雇 · 只挑最醒目一个
  const kids = i.children || 0;
  const props = i.properties || [];
  const hasRental = props.some(p => p.type === 'rental');
  const hasPrimary = props.some(p => p.type === 'primary');

  if (kids > 0) {
    parts.push(`${kids} 娃`);
  } else if (hasRental) {
    parts.push(`${props.length} 套出租`);
  } else if (hasPrimary) {
    parts.push('自住房');
  }

  return parts.join(' · ');
};

// v90: helper · 根据当前 inputs 直接推导用户 tags
// 不再依赖 preset id · 任何来源的 inputs 都能个性化匹配
const tagsFromInputs = (inputs) => {
  if (!inputs) return { tags: [], profileLabel: '' };
  const t = new Set();
  const i = inputs;
  const income = (i.w2 || 0) + (i.spouseW2 || 0) + (i.inc1099 || 0);
  const labelParts = [];

  // 申报状态
  if (i.filingStatus === 'MFJ' || i.filingStatus === 'MFS') {
    t.add('married'); labelParts.push('MFJ');
  } else if (i.filingStatus === 'HoH') {
    t.add('hoh'); labelParts.push('HoH');
  } else {
    t.add('single'); labelParts.push('Single');
  }

  // 孩子
  if ((i.children || 0) > 0) { t.add('kids'); t.add('ctc'); }
  // 配偶不工作
  if (i.filingStatus === 'MFJ' && (i.spouseW2 || 0) === 0 && (i.w2 || 0) > 0) {
    t.add('spouse-nowork');
  }

  // 收入层级
  if (income >= 800000) { t.add('ultra-rich'); t.add('high-income'); t.add('henry'); labelParts.push('超高收入'); }
  else if (income >= 400000) { t.add('high-income'); t.add('henry'); labelParts.push('高收入'); }
  else if (income >= 250000) { t.add('henry'); t.add('high-income'); labelParts.push('HENRY'); }
  else if (income >= 150000) { t.add('w2'); labelParts.push('中高收入'); }
  else if (income > 0) { t.add('w2'); labelParts.push('中产'); }

  // 自雇 / 1099
  if ((i.inc1099 || 0) > 0) {
    t.add('1099'); t.add('se-tax');
    if ((i.inc1099 || 0) > 100000) { t.add('s-corp'); t.add('qbi'); }
    labelParts.push('自雇');
  } else { t.add('w2'); }

  // 州
  const st = i.state;
  const wst = i.workState;
  if (st === 'NY' || i.city === 'nyc') { t.add('nyc'); labelParts.push('NYC'); }
  if (st === 'NJ') { t.add('nj'); labelParts.push('NJ'); }
  if (st === 'CA') {
    t.add('ca'); labelParts.push('CA');
    // v93: CA-specific tags · 触发相关 myths
    if (income >= 250000) t.add('ca-nonconform');     // QBI / QSBS / Bonus Dep mismatch
    if (income >= 1000000) t.add('ca-mht');            // Mental Health Tax
    if ((i.w2 || 0) + (i.spouseW2 || 0) > 0) t.add('ca-sdi');  // 任何 CA W2 都触发
  }
  if (st === 'TX') { t.add('tx'); }
  if (st === 'FL') { t.add('fl'); }
  if (st === 'UT') { t.add('ut'); labelParts.push('UT'); }
  if (st === 'AK') { t.add('ak'); labelParts.push('AK'); }
  if (wst && wst !== st) {
    t.add('multi-state'); t.add('convenience-rule');
    labelParts.push(`${st}→${wst}`);
  }

  // 房产
  const props = i.properties || [];
  if (props.some(p => p.type === 'rental')) { t.add('rental'); t.add('passive'); t.add('house'); }
  if (props.some(p => p.type === 'primary')) { t.add('house'); }

  // SALT
  const saltOver = props.reduce((s, p) => s + (p.propertyTax || 0), 0);
  if (saltOver > 10000) { t.add('salt'); }

  // 401k / HSA
  if (i.megaBackdoor) t.add('mega-backdoor');
  if (i.hsa > 0 || i.hdhp) t.add('hsa');

  const profileLabel = labelParts.length > 0 ? labelParts.slice(0, 3).join(' · ') : '你';
  return { tags: [...t], profileLabel };
};

// v87 legacy: preset id → 找 persona · 保留给明确选了 persona 的场景（优先用它的丰富 tags）
const personalTagsFromPreset = (preset) => {
  if (!preset || preset === 'blank') return { tags: [], persona: null, group: null };
  for (const g of PERSONA_GROUPS) {
    const p = g.personas.find(pp => pp.id === preset);
    if (p) {
      const tags = [...new Set([...(p.tags || []), ...(g.groupTags || [])])];
      return { tags, persona: p, group: g };
    }
  }
  return { tags: [], persona: null, group: null };
};

const MythStrip = ({ preset, inputs, country }) => {
  // v101: country === 'CA' 时用 CA myth 集
  const mythsData = country === 'CA' ? MYTHS_CA : MYTHS;
  const personaGroupsData = country === 'CA' ? PERSONA_GROUPS_CA : PERSONA_GROUPS;
  const [openIdx, setOpenIdx] = useState(null);
  const [mythPage, setMythPage] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const open = openIdx != null ? mythsData[openIdx] : null;
  const openColor = open ? (MYTH_CAT_COLOR[open.cat] || MYTH_CAT_COLOR.other) : null;

  // v90: 双路径 tag 推导
  // 1. 先看 preset 是否匹配到具体 persona（有丰富的手工 tags）
  // 2. 否则从 inputs 直接推导（自动化、覆盖 blank / custom wizard 流）
  const personaMatch = personalTagsFromPreset(preset);
  const inputsDerived = tagsFromInputs(inputs);
  const useFromPersona = personaMatch.tags.length > 0;
  const personalTags = useFromPersona ? personaMatch.tags : inputsDerived.tags;
  const profileLabel = useFromPersona
    ? (personaMatch.persona ? personaMatch.persona.title : personaMatch.group?.group || '你')
    : inputsDerived.profileLabel;

  // v91: 匹配 + 相关度排序 + 限制 ≤ 16 题 + 分类均衡
  let personalMatchIdxs = [];
  if (personalTags.length > 0) {
    const scored = [];
    mythsData.forEach((m, idx) => {
      const mt = m.tags || [];
      const overlap = mt.filter(t => personalTags.includes(t)).length;
      if (overlap > 0) {
        scored.push({ idx, cat: m.cat, overlap, hot: m.hot ? 1 : 0, origIdx: idx });
      }
    });
    scored.sort((a, b) => {
      if (b.overlap !== a.overlap) return b.overlap - a.overlap;
      if (b.hot !== a.hot) return b.hot - a.hot;
      return a.origIdx - b.origIdx;
    });
    // 分类均衡：每类最多 5 题 · 保证 tag cloud 有多样性
    const PER_CAT_MAX = 5;
    const MAX_TOTAL = 16;
    const catCount = {};
    const chosen = [];
    for (const s of scored) {
      if (chosen.length >= MAX_TOTAL) break;
      const c = catCount[s.cat] || 0;
      if (c >= PER_CAT_MAX) continue;
      chosen.push(s.idx);
      catCount[s.cat] = c + 1;
    }
    // 若筛完不足 MAX_TOTAL 且 scored 还有空间 · 放宽每类限制补足
    if (chosen.length < MAX_TOTAL) {
      const chosenSet = new Set(chosen);
      for (const s of scored) {
        if (chosen.length >= MAX_TOTAL) break;
        if (chosenSet.has(s.idx)) continue;
        chosen.push(s.idx);
        chosenSet.add(s.idx);
      }
    }
    personalMatchIdxs = chosen;
  }
  const hasPersonalTab = personalMatchIdxs.length >= 3;

  // 切 preset/inputs 时跳回首页（"针对你"若有就优先显示）
  useEffect(() => {
    setMythPage(0);
  }, [preset, profileLabel]);

  // Page structure · v87: 有 personal 时多一个动态 page 0
  const STATIC_PAGE_SIZE = 16;
  const staticPages = [
    { label: '最热问题', sub: '华人高频搜 16 题', range: '1-16', start: 0, size: 16 },
    { label: '经典误区', sub: '老生常谈但关键', range: '17-32', start: 16, size: 16 },
    { label: '进阶·富人 / 特殊', sub: '用上能省大钱', range: '33+', start: 32, size: 16 },
  ];
  const pages = hasPersonalTab
    ? [
        {
          label: '◆ 针对你',
          sub: `${profileLabel} · ${personalMatchIdxs.length} 题精选`,
          range: `${personalMatchIdxs.length}`,
          personal: true,
        },
        ...staticPages,
      ]
    : staticPages;

  // 当前页题目
  let pageMyths = [];
  const currentPage = pages[mythPage] || pages[0];
  if (currentPage.personal) {
    pageMyths = personalMatchIdxs.map(idx => ({ m: mythsData[idx], idx }));
  } else {
    const s = currentPage.start;
    const e = Math.min(s + currentPage.size, mythsData.length);
    pageMyths = mythsData.slice(s, e).map((m, i) => ({ m, idx: s + i }));
  }

  // v89: 4 个 teaser · 永远显示 · 基于当前 page 前 4 题
  const teasers = pageMyths.slice(0, 4);

  // v77: 按 cat 分组该页题目（仅展开后用）
  const byCat = {};
  pageMyths.forEach(({ m, idx }) => {
    if (!byCat[m.cat]) byCat[m.cat] = [];
    byCat[m.cat].push({ m, idx });
  });
  const orderedCats = MYTH_CAT_ORDER.filter(c => byCat[c] && byCat[c].length > 0);

  const currentPageLabel = currentPage;

  return (
    <>
      <div style={{
        background: C.card, border: `1px solid ${C.line}`,
        borderRadius: 16, padding: 12, marginBottom: 12,
      }}>
        {/* Header · 永远显示 · 精确反馈个性化状态 */}
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'baseline', marginBottom: 8, padding: '0 2px',
          gap: 6, flexWrap: 'wrap',
        }}>
          <div style={{
            display: 'flex', alignItems: 'baseline', gap: 5, flexWrap: 'wrap', flex: 1, minWidth: 0,
          }}>
            <span style={{
              fontSize: 12, color: C.ink, fontFamily: F_BODY,
              fontWeight: 700, letterSpacing: '0.02em',
            }}>
              常见误区
            </span>
            {hasPersonalTab ? (
              <>
                <span style={{
                  fontSize: 10, color: C.warn, fontFamily: F_BODY, fontWeight: 700,
                }}>· ◆ 针对你</span>
                <span style={{
                  fontSize: 9, color: C.mute, fontFamily: F_BODY,
                }}>
                  {profileLabel}
                </span>
                <span style={{
                  fontSize: 9, color: C.mute, fontFamily: F_MONO, letterSpacing: '0.03em',
                }}>
                  · {personalMatchIdxs.length} / {mythsData.length} 题精选
                </span>
              </>
            ) : (
              <span style={{
                fontSize: 9, color: C.mute, fontFamily: F_MONO, letterSpacing: '0.03em',
              }}>
                共 {mythsData.length} 题 · 分 3 组
              </span>
            )}
          </div>
          {!expanded && hasPersonalTab && (
            <span style={{
              fontSize: 9, color: C.muteLite, fontFamily: F_MONO,
              letterSpacing: '0.03em',
            }}>
              点卡看答案
            </span>
          )}
        </div>

        {/* v90: 4 teaser 小方块 · 仿图2 expanded 风格 · 4 列一行 · aspect-ratio 1:1 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 6,
          marginBottom: 8,
        }}>
          {teasers.map(({ m, idx }) => {
            const cc = MYTH_CAT_COLOR[m.cat] || MYTH_CAT_COLOR.other;
            const bg = m.hot ? cc.hotBg : cc.bg;
            const bd = m.hot ? cc.hotBorder : cc.border;
            return (
              <button
                key={idx}
                onClick={() => setOpenIdx(idx)}
                style={{
                  aspectRatio: '1 / 1',
                  padding: 7,
                  background: bg,
                  border: `1px solid ${bd}`,
                  borderRadius: 10,
                  cursor: 'pointer',
                  display: 'flex', flexDirection: 'column',
                  justifyContent: 'space-between',
                  textAlign: 'left',
                  fontFamily: F_BODY,
                  overflow: 'hidden',
                  transition: 'all 0.15s',
                  position: 'relative',
                }}
              >
                <div style={{
                  fontSize: 13, fontFamily: F_NUM, fontWeight: 700,
                  color: m.hot ? C.warn : C.mute, lineHeight: 1,
                }}>×</div>
                <div style={{
                  fontSize: 10, fontFamily: F_BODY, fontWeight: 600,
                  color: C.ink, lineHeight: 1.25,
                  display: '-webkit-box',
                  WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  flex: 1,
                  marginTop: 4,
                }}>
                  {m.q}
                </div>
                {m.hot && (
                  <div style={{
                    fontSize: 7, fontFamily: F_MONO, fontWeight: 700,
                    color: C.warn, letterSpacing: '0.1em',
                    alignSelf: 'flex-end',
                    marginTop: 2,
                  }}>HOT</div>
                )}
              </button>
            );
          })}
        </div>

        {/* 展开按钮 · 点开看完整分类 */}
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            width: '100%',
            padding: '7px 12px',
            background: expanded ? C.cardAlt : 'transparent',
            border: `1px solid ${C.line}`,
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 10, fontFamily: F_BODY,
            color: C.ink2, fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 6,
            letterSpacing: '0.02em',
            transition: 'all 0.15s',
          }}
        >
          <span>
            {expanded ? '收起' : `展开看全部 ${mythsData.length} 题 · 按分类浏览`}
          </span>
          <span style={{
            transform: expanded ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s', fontSize: 11,
          }}>▾</span>
        </button>

        {/* ══════════════════════════════════════════════════════════ */}
        {/* 展开状态 · 完整 tab + 分类 grid */}
        {/* ══════════════════════════════════════════════════════════ */}
        {expanded && (
          <div style={{
            marginTop: 10,
            paddingTop: 10,
            borderTop: `1px dashed ${C.line}`,
          }}>
            {/* 当前页副标题 */}
            <div style={{
              display: 'flex', alignItems: 'baseline', gap: 5,
              marginBottom: 8, padding: '0 2px', flexWrap: 'wrap',
            }}>
              <span style={{
                fontSize: 10, color: currentPageLabel.personal ? C.warn : C.ink2,
                fontFamily: F_BODY, fontWeight: 600,
              }}>
                {currentPageLabel.label}
              </span>
              <span style={{
                fontSize: 9, color: C.mute, fontFamily: F_MONO, letterSpacing: '0.03em',
              }}>
                {currentPageLabel.sub} · {pageMyths.length} 题
              </span>
            </div>

            {/* 分页 pill 切换条 */}
            <div style={{
              display: 'flex', gap: 4, marginBottom: 10, padding: '0 2px',
              flexWrap: 'wrap',
            }}>
              {pages.map((pl, pIdx) => {
                const active = pIdx === mythPage;
                const isPersonal = !!pl.personal;
                return (
                  <button
                    key={pIdx}
                    onClick={() => setMythPage(pIdx)}
                    style={{
                      flex: 1,
                      minWidth: isPersonal ? 84 : 60,
                      padding: '5px 6px',
                      background: active
                        ? (isPersonal ? C.warn : C.save)
                        : (isPersonal ? `${C.warn}12` : 'transparent'),
                      color: active
                        ? '#FFF'
                        : (isPersonal ? C.warn : C.ink2),
                      border: `1px solid ${active
                        ? (isPersonal ? C.warn : C.save)
                        : (isPersonal ? `${C.warn}60` : C.line)}`,
                      borderRadius: 6,
                      fontFamily: F_BODY,
                      fontSize: 10, fontWeight: active || isPersonal ? 700 : 500,
                      cursor: 'pointer',
                      letterSpacing: '0.02em',
                      transition: 'all 0.15s',
                      display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 4,
                    }}
                  >
                    <span>{pl.label}</span>
                    <span style={{ fontSize: 8, opacity: 0.7, fontFamily: F_MONO }}>
                      {pl.range}{isPersonal ? ' 题' : ''}
                    </span>
                  </button>
                );
              })}
            </div>
            {/* 当前页题目按 cat section 分组显示 */}
            {orderedCats.map((catKey, secIdx) => {
              const cc = MYTH_CAT_COLOR[catKey];
              const label = MYTH_CAT_LABEL[catKey];
              const items = byCat[catKey];
              return (
                <div key={catKey} style={{
                  marginBottom: secIdx === orderedCats.length - 1 ? 0 : 12,
            }}>
              {/* 分类标题条 */}
              <div style={{
                display: 'flex', alignItems: 'baseline', gap: 8,
                marginBottom: 6, padding: '0 2px',
                borderLeft: `3px solid ${cc.hotBorder}`,
                paddingLeft: 8,
              }}>
                <span style={{
                  fontSize: 11, color: C.ink, fontFamily: F_BODY,
                  fontWeight: 700, letterSpacing: '0.02em',
                }}>
                  {label.label}
                </span>
                <span style={{
                  fontSize: 9, color: C.mute, fontFamily: F_MONO,
                  letterSpacing: '0.04em',
                }}>
                  {label.sub}
                </span>
                <span style={{
                  marginLeft: 'auto',
                  fontSize: 9, color: cc.hotBorder, fontFamily: F_MONO,
                  fontWeight: 700,
                }}>
                  {items.length} 题
                </span>
              </div>
              {/* 该类题目 4 列网格 */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 6,
              }}>
                {items.map(({ m, idx }) => {
                  const bg = m.hot ? cc.hotBg : cc.bg;
                  const bd = m.hot ? cc.hotBorder : cc.border;
                  return (
                    <button
                      key={idx}
                      onClick={() => setOpenIdx(idx)}
                      style={{
                        aspectRatio: '1 / 1',
                        padding: 7,
                        background: bg,
                        border: `1px solid ${bd}`,
                        borderRadius: 10,
                        cursor: 'pointer',
                        display: 'flex', flexDirection: 'column',
                        justifyContent: 'space-between',
                        textAlign: 'left',
                        fontFamily: F_BODY,
                        overflow: 'hidden',
                        transition: 'all 0.15s',
                        position: 'relative',
                      }}
                    >
                      <div style={{
                        fontSize: 13, fontFamily: F_NUM, fontWeight: 700,
                        color: m.hot ? C.warn : C.mute, lineHeight: 1,
                      }}>×</div>
                      <div style={{
                        fontSize: 10, fontFamily: F_BODY, fontWeight: 600,
                        color: C.ink, lineHeight: 1.25,
                        display: '-webkit-box',
                        WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        flex: 1,
                        marginTop: 4,
                      }}>
                        {m.q}
                      </div>
                      {m.hot && (
                        <div style={{
                          fontSize: 7, fontFamily: F_MONO, fontWeight: 700,
                          color: C.warn, letterSpacing: '0.1em',
                          alignSelf: 'flex-end',
                          marginTop: 2,
                        }}>
                          HOT
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
          </div>
        )}
      </div>

      {/* 答案弹窗 · 居中 · 带 category 色 · 带 glossary */}
      {open && (
        <div
          onClick={() => setOpenIdx(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 130,
            background: 'rgba(13,13,13,0.62)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px 16px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: C.bg, width: '100%', maxWidth: 420,
              maxHeight: 'min(85vh, 680px)', overflow: 'auto',
              borderRadius: 14,
              padding: 22, paddingBottom: 20,
              borderTop: `4px solid ${open.hot ? '#E6C97A' : openColor.hotBorder}`,
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}
          >
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', marginBottom: 14,
            }}>
              <div style={{
                fontSize: 10, color: C.mute, fontFamily: F_MONO,
                letterSpacing: '0.12em', fontWeight: 600,
              }}>
                {MYTH_CAT_LABEL[open.cat]?.label || '误区'} · {openIdx + 1} / {mythsData.length}{open.hot ? ' · HOT' : ''}
              </div>
              <button
                onClick={() => setOpenIdx(null)}
                style={{
                  background: 'transparent', border: 'none',
                  fontSize: 22, color: C.mute, cursor: 'pointer',
                  padding: 0, lineHeight: 1,
                  width: 28, height: 28,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >×</button>
            </div>
            <div style={{
              fontFamily: F_NUM, fontSize: 20, fontWeight: 700,
              color: C.ink, marginBottom: 14,
              letterSpacing: '-0.01em', lineHeight: 1.3,
            }}>
              × {open.q}
            </div>
            <div style={{
              fontSize: 14, color: C.ink2, fontFamily: F_BODY,
              lineHeight: 1.7,
            }}>
              {open.a}
            </div>
            {/* v57: 术语解释 */}
            {open.gloss && Object.keys(open.gloss).length > 0 && (
              <div style={{
                marginTop: 16,
                padding: '10px 12px',
                background: openColor.bg,
                border: `1px solid ${openColor.border}`,
                borderRadius: 8,
              }}>
                <div style={{
                  fontSize: 9, color: C.mute, fontFamily: F_MONO,
                  letterSpacing: '0.1em', fontWeight: 700,
                  textTransform: 'uppercase',
                  marginBottom: 6,
                }}>
                  § 术语解释
                </div>
                <div style={{ display: 'grid', gap: 6 }}>
                  {Object.entries(open.gloss).map(([term, def]) => (
                    <div key={term} style={{
                      display: 'grid', gridTemplateColumns: 'auto 1fr',
                      gap: 8, alignItems: 'baseline',
                    }}>
                      <span style={{
                        fontFamily: F_MONO, fontSize: 10, fontWeight: 700,
                        color: C.ink, letterSpacing: '0.02em',
                        padding: '1px 5px',
                        background: '#FFF',
                        border: `1px solid ${openColor.border}`,
                        borderRadius: 3,
                        whiteSpace: 'nowrap',
                      }}>{term}</span>
                      <span style={{
                        fontSize: 11, color: C.ink2, fontFamily: F_BODY,
                        lineHeight: 1.5,
                      }}>{def}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* 上/下 翻 */}
            <div style={{
              display: 'flex', gap: 8, marginTop: 18,
            }}>
              <button
                onClick={() => setOpenIdx((openIdx - 1 + mythsData.length) % mythsData.length)}
                style={{
                  flex: 1, padding: 11, borderRadius: 8,
                  background: C.card, border: `1px solid ${C.line}`,
                  color: C.ink2, fontFamily: F_BODY, fontSize: 12, fontWeight: 600,
                  cursor: 'pointer',
                }}
              >‹ 上一题</button>
              <button
                onClick={() => setOpenIdx((openIdx + 1) % mythsData.length)}
                style={{
                  flex: 1, padding: 11, borderRadius: 8,
                  background: C.ink, border: 'none',
                  color: '#FFF', fontFamily: F_BODY, fontSize: 12, fontWeight: 600,
                  cursor: 'pointer',
                }}
              >下一题 ›</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// ═══════════════════════════════════════════════════════════
//  ★ 新增：算式透明副表 · 底部折叠区
// ═══════════════════════════════════════════════════════════

const FormulaRow = ({ label, value, op, indent, bold, dashed }) => (
  <div className="flex items-baseline justify-between py-1"
    style={{
      paddingLeft: indent ? 12 : 0,
      borderTop: dashed ? `1px dashed ${C.lineLite}` : 'none',
      marginTop: dashed ? 4 : 0,
      paddingTop: dashed ? 6 : 4,
    }}>
    <span style={{ fontFamily: F_BODY, fontSize: 12, color: bold ? C.ink : C.ink2, fontWeight: bold ? 700 : 400 }}>
      {op && <span style={{ color: C.mute, marginRight: 4, fontFamily: F_MONO }}>{op}</span>}
      {label}
    </span>
    <span style={{ fontFamily: F_MONO, fontSize: 12, color: bold ? C.ink : C.ink2, fontWeight: bold ? 700 : 500 }}>
      {typeof value === 'number' ? `$${fmt(value)}` : value}
    </span>
  </div>
);

const FormulaBlock = ({ title, desc, children, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg mb-2 overflow-hidden" style={{ background: C.card, border: `1px solid ${C.line}` }}>
      <button onClick={() => setOpen(!open)} className="w-full px-3 py-2.5 flex items-center justify-between"
        style={{ background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
        <div className="flex-1 min-w-0">
          <div style={{ fontSize: 13, fontFamily: F_BODY, fontWeight: 700, color: C.ink }}>{title}</div>
          {desc && <div style={{ fontSize: 10, color: C.mute, fontFamily: F_BODY, marginTop: 1 }}>{desc}</div>}
        </div>
        <span style={{ fontSize: 12, color: C.mute, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>▾</span>
      </button>
      {open && (
        <div className="px-3 pb-3 pt-1" style={{ background: C.cardAlt, borderTop: `1px solid ${C.lineLite}` }}>
          {children}
        </div>
      )}
    </div>
  );
};

const Transparency = ({ inputs, calc }) => {
  // v106: CA 模式用独立的简化算式（US 的 SALT/Itemize/AMT 等概念不适用）
  const isCA = calc?._country === 'CA';
  if (isCA) {
    return (
      <div className="mb-3">
        <div className="flex items-baseline justify-between px-1 mb-2">
          <div>
            <div style={{ fontSize: 12, color: C.ink, fontFamily: F_BODY, fontWeight: 700, letterSpacing: '0.05em' }}>
              算式透明 · 附表
            </div>
            <div style={{ fontSize: 10, color: C.mute, fontFamily: F_BODY, marginTop: 1 }}>
              每个数字怎么来的 · 点开逐步验算
            </div>
          </div>
          <span style={{ fontSize: 10, fontFamily: F_MONO, color: C.muteLite }}>TY 2025</span>
        </div>

        <FormulaBlock title="① 总收入 Total Income" desc="T4 + 自雇 + 出租等">
          <FormulaRow label="T4 本人" value={inputs.w2} op="+" />
          {inputs.filingStatus === 'MFJ' && <FormulaRow label="T4 配偶" value={inputs.spouseW2} op="+" />}
          {inputs.inc1099 > 0 && (
            <>
              <FormulaRow label="自雇收入 (T2125)" value={inputs.inc1099} op="+" />
              <FormulaRow label="业务开支" value={-(inputs.expense1099 || 0)} op="−" indent />
              <FormulaRow label={`自雇净利润`} value={calc.net1099} op="=" indent bold />
            </>
          )}
          {calc.rentalGainToAGI > 0 && (
            <FormulaRow label="出租房净收入" value={calc.rentalGainToAGI} op="+" />
          )}
          <FormulaRow label="总收入" value={calc.grossWages} op="=" bold dashed />
          {calc.k401Pretax > 0 && <FormulaRow label="RRSP 供款 (减税)" value={-calc.k401Pretax} op="−" />}
          <FormulaRow label="净收入 Net Income" value={calc.agi} op="=" bold dashed />
        </FormulaBlock>

        <FormulaBlock title="② BPA 基本个人免税额（credit）" desc={`联邦 $${fmt(16129)} · 省 ${CA_PROV_BRACKETS[inputs.state]?.label || inputs.state} $${fmt(CA_PROV_BRACKETS[inputs.state]?.bpa || 0)}`}>
          <FormulaRow label="联邦 BPA" value={16129} />
          <FormulaRow label="× 14.5%" value={16129 * 0.145} op="→" />
          <FormulaRow label={`联邦 BPA credit`} value={16129 * 0.145} op="✓" bold />
          <div style={{ paddingTop: 4, paddingBottom: 2 }}></div>
          <FormulaRow label={`${CA_PROV_BRACKETS[inputs.state]?.label || inputs.state} 省 BPA`} value={CA_PROV_BRACKETS[inputs.state]?.bpa || 0} />
          <FormulaRow label={`× ${((CA_PROV_BRACKETS[inputs.state]?.bpaRate || 0) * 100).toFixed(2)}%`}
            value={(CA_PROV_BRACKETS[inputs.state]?.bpa || 0) * (CA_PROV_BRACKETS[inputs.state]?.bpaRate || 0)} op="→" />
          {inputs.charity > 0 && (
            <>
              <div style={{ paddingTop: 6, paddingBottom: 2, fontSize: 10, color: C.mute, fontFamily: F_BODY, fontWeight: 600, letterSpacing: '0.05em' }}>
                慈善 credit：
              </div>
              <FormulaRow label={`前 $200 × 15%`} value={Math.min(200, inputs.charity) * 0.15} op="+" indent />
              {inputs.charity > 200 && <FormulaRow label={`剩余 × 29%`} value={(inputs.charity - 200) * 0.29} op="+" indent />}
            </>
          )}
        </FormulaBlock>

        <FormulaBlock title="③ 联邦税 (5 档累进)" desc={`应税 = $${fmt(calc.agi)}`}>
          <FormulaRow label="应税收入" value={calc.agi} />
          <div style={{ paddingTop: 6, paddingBottom: 2, fontSize: 10, color: C.mute, fontFamily: F_BODY, fontWeight: 600, letterSpacing: '0.05em' }}>
            联邦分段：
          </div>
          {[
            [57375, 0.145],[114750, 0.205],[177882, 0.26],[253414, 0.29],[Infinity, 0.33]
          ].map((b, idx, arr) => {
            const prev = idx === 0 ? 0 : arr[idx - 1][0];
            const inB = Math.max(0, Math.min(calc.agi, b[0]) - prev);
            if (inB <= 0) return null;
            return (
              <FormulaRow key={idx}
                label={`$${fmt(prev)}–${b[0] === Infinity ? '∞' : '$' + fmt(b[0])} @ ${(b[1] * 100).toFixed(1)}%`}
                value={inB * b[1]} indent />
            );
          })}
          <FormulaRow label="联邦税 (扣 BPA 后)" value={calc.fedTax} op="=" bold dashed />
          <div style={{ fontSize: 10, color: C.mute, fontFamily: F_BODY, marginTop: 4 }}>
            边际税率 <b style={{ fontFamily: F_NUM, color: C.ink }}>{pct(calc.marginalFed)}</b> · 有效 <b style={{ fontFamily: F_NUM, color: C.ink }}>{pct(calc.fedTax / Math.max(1, calc.grossWages))}</b>
          </div>
        </FormulaBlock>

        {calc.stateTax > 0 && (
          <FormulaBlock title={`④ ${CA_PROV_BRACKETS[inputs.state]?.label || inputs.state} 省税 (累进)`} desc={`省级累进 + 地方附加`}>
            <FormulaRow label="应税收入" value={calc.agi} />
            <div style={{ paddingTop: 6, paddingBottom: 2, fontSize: 10, color: C.mute, fontFamily: F_BODY, fontWeight: 600, letterSpacing: '0.05em' }}>
              省分段：
            </div>
            {(CA_PROV_BRACKETS[inputs.state]?.brackets || []).map((b, idx, arr) => {
              const prev = idx === 0 ? 0 : arr[idx - 1][0];
              const inB = Math.max(0, Math.min(calc.agi, b[0]) - prev);
              if (inB <= 0) return null;
              return (
                <FormulaRow key={idx}
                  label={`$${fmt(prev)}–${b[0] === Infinity ? '∞' : '$' + fmt(b[0])} @ ${(b[1] * 100).toFixed(2)}%`}
                  value={inB * b[1]} indent />
              );
            })}
            {inputs.state === 'ON' && (
              <div style={{ fontSize: 10, color: C.mute, fontFamily: F_BODY, marginTop: 6, lineHeight: 1.5 }}>
                ¶ ON 含 Surtax（20% / 36% 阶梯）+ OHP 医保保费（最高 $900）
              </div>
            )}
            {inputs.state === 'QC' && (
              <div style={{ fontSize: 10, color: C.warn, fontFamily: F_BODY, marginTop: 6, lineHeight: 1.5 }}>
                † QC 需单独报 TP-1（省级所得税）· 联邦退 16.5% Quebec Abatement
              </div>
            )}
            <FormulaRow label={`${inputs.state} 省税合计`} value={calc.stateTax} op="=" bold dashed />
          </FormulaBlock>
        )}

        <FormulaBlock title="⑤ CPP + EI (工资税)" desc="加拿大养老金计划 + 就业保险">
          <FormulaRow label={`CPP1: min(T4, $71,300) − $3,500`} value={Math.max(0, Math.min(inputs.w2 + inputs.spouseW2, 71300) - 3500)} />
          <FormulaRow label={`× 5.95%`} value={Math.max(0, Math.min(inputs.w2 + inputs.spouseW2, 71300) - 3500) * 0.0595} op="→" indent />
          {(inputs.w2 + inputs.spouseW2) > 71300 && (
            <>
              <FormulaRow label={`CPP2: min(T4, $81,200) − $71,300`} value={Math.max(0, Math.min(inputs.w2 + inputs.spouseW2, 81200) - 71300)} />
              <FormulaRow label={`× 4%`} value={Math.max(0, Math.min(inputs.w2 + inputs.spouseW2, 81200) - 71300) * 0.04} op="→" indent />
            </>
          )}
          <FormulaRow label={`EI: min(T4, $65,700) × ${inputs.state === 'QC' ? '1.31%' : '1.64%'}`}
            value={Math.min(inputs.w2 + inputs.spouseW2, 65700) * (inputs.state === 'QC' ? 0.0131 : 0.0164)} />
          <FormulaRow label="CPP + EI 合计" value={calc.fica} op="=" bold dashed />
        </FormulaBlock>

        {calc.seTax > 0 && (
          <FormulaBlock title="⑥ 自雇 CPP (self-employed)" desc="自雇要交雇员+雇主两份 CPP · 无 EI">
            <FormulaRow label={`自雇净利润 × 11.9% (CPP1 部分)`} value={calc.seTax} />
            <FormulaRow label="一半可作 above-line 抵扣" value={calc.seDed} indent />
          </FormulaBlock>
        )}

        <FormulaBlock title="⑦ 总税负汇总" desc="所有税种加起来" defaultOpen={false}>
          <FormulaRow label="联邦" value={calc.fedTax} op="+" />
          <FormulaRow label={`${inputs.state} 省`} value={calc.stateTax} op="+" />
          <FormulaRow label="CPP + EI" value={calc.fica} op="+" />
          {calc.seTax > 0 && <FormulaRow label="自雇 CPP" value={calc.seTax} op="+" />}
          <FormulaRow label="总税负" value={calc.totalTax} op="=" bold dashed />
          <FormulaRow label="总收入" value={calc.grossWages} />
          <FormulaRow label={`有效税率 = 总税 ÷ 总收入`} value={pct(calc.effectiveRate)} bold dashed />
          <FormulaRow label="税后到手" value={calc.takeHome} op="→" bold />
        </FormulaBlock>
      </div>
    );
  }

  const stateRuleLabel = inputs.state === 'NJ' ? '（NJ 特殊：401k 不抵州税）' : '';
  return (
    <div className="mb-3">
      <div className="flex items-baseline justify-between px-1 mb-2">
        <div>
          <div style={{ fontSize: 12, color: C.ink, fontFamily: F_BODY, fontWeight: 700, letterSpacing: '0.05em' }}>
            算式透明 · 附表
          </div>
          <div style={{ fontSize: 10, color: C.mute, fontFamily: F_BODY, marginTop: 1 }}>
            每个数字怎么来的，点开逐步验算
          </div>
        </div>
        <span style={{ fontSize: 10, fontFamily: F_MONO, color: C.muteLite }}>FY 2025</span>
      </div>

      <FormulaBlock title="① Gross 收入 & AGI" desc="从总收入到调整后总收入">
        <FormulaRow label="W2 本人" value={inputs.w2} op="+" />
        {inputs.filingStatus === 'MFJ' && <FormulaRow label="W2 配偶" value={inputs.spouseW2} op="+" />}
        {inputs.inc1099 > 0 && (
          <>
            <FormulaRow label="1099 收入" value={inputs.inc1099} op="+" />
            <FormulaRow label="1099 业务开支" value={-(inputs.expense1099 || 0)} op="−" indent />
            <FormulaRow label={`1099 净利润`} value={calc.net1099} op="=" indent bold />
          </>
        )}
        {calc.rentalGainToAGI > 0 && (
          <FormulaRow label="出租房净收入 (Sched E)" value={calc.rentalGainToAGI} op="+" />
        )}
        {calc.rentalLossSuspended < 0 && (
          <div style={{ fontSize: 10, color: C.warn, fontFamily: F_BODY, marginTop: 4, lineHeight: 1.5, paddingLeft: 12 }}>
            ※ 出租净亏 ${fmt(Math.abs(calc.rentalLossSuspended))}（被动损失规则限制，暂不抵工资）
          </div>
        )}
        <FormulaRow label="总 Gross 收入" value={calc.grossWages} op="=" bold dashed />
        {calc.seDed > 0 && <FormulaRow label="SE 税扣除一半 (above-line)" value={-calc.seDed} op="−" />}
        {calc.k401Pretax > 0 && <FormulaRow label="401(k) 预税" value={-calc.k401Pretax} op="−" />}
        {calc.hsaContrib > 0 && <FormulaRow label="HSA 供款" value={-calc.hsaContrib} op="−" />}
        <FormulaRow label="AGI (调整后总收入)" value={calc.agi} op="=" bold dashed />
      </FormulaBlock>

      <FormulaBlock title="② Standard vs Itemized" desc={`选中的是: ${calc.useItemize ? 'Itemized' : 'Standard'}`}>
        <FormulaRow label={`Standard Deduction (${inputs.filingStatus})`} value={calc.stdDed} />
        <div style={{ paddingTop: 6, paddingBottom: 2, fontSize: 10, color: C.mute, fontFamily: F_BODY, fontWeight: 600, letterSpacing: '0.05em' }}>
          Itemized 合计：
        </div>
        <FormulaRow label={`州税预估`} value={calc.estStateTax} op="+" indent />
        {(inputs.properties || []).filter(p => p.type !== 'rental').map((p, idx) => {
          const t = PROPERTY_TYPES.find(x => x.v === p.type);
          return (
            <FormulaRow
              key={idx}
              label={`${t?.icon || ''} ${t?.l || ''} (${p.state}) 地税`}
              value={Number(p.propertyTax) || 0}
              op="+"
              indent
            />
          );
        })}
        <FormulaRow label={`SALT 原始 (州税 + 地税)`} value={calc.saltRaw} op="=" indent />
        <FormulaRow label={`SALT Cap @ AGI $${fmt(calc.agi)}`} value={`$${fmt(calc.saltCap)}`} op=" " indent />
        <FormulaRow label={`SALT 可抵 (min)`} value={calc.saltCapped} op="✓" indent bold />
        {(inputs.properties || []).filter(p => p.type !== 'rental').slice(0, 2).map((p, idx) => (
          <FormulaRow
            key={`mort-${idx}`}
            label={`${idx === 0 ? '自住' : '二套'} (${p.state}) 房贷利息`}
            value={Number(p.mortInt) || 0}
            op="+"
          />
        ))}
        <FormulaRow label="慈善捐赠" value={calc.charity} op="+" />
        <FormulaRow label={`医疗 (超 AGI 7.5%)`} value={calc.medicalExp} op="+" />
        <FormulaRow label="Itemized 合计" value={calc.itemized} op="=" bold dashed />
        <FormulaRow label={`取较大者`} value={calc.fedDed} op="→" bold />
        {calc.saltLost > 0 && (
          <div style={{ fontSize: 10, color: C.pay, fontFamily: F_BODY, marginTop: 4, lineHeight: 1.5 }}>
            ※ SALT Cap 砍掉了 ${fmt(calc.saltLost)}（SALT 原始 − SALT 可抵）
          </div>
        )}
      </FormulaBlock>

      <FormulaBlock title="③ 联邦税 (累进计算)" desc={`应税收入 AGI − 扣除 = $${fmt(calc.fedTaxable)}`}>
        <FormulaRow label="AGI" value={calc.agi} />
        <FormulaRow label="扣除" value={-calc.fedDed} op="−" />
        <FormulaRow label="联邦应税收入" value={calc.fedTaxable} op="=" bold />
        <div style={{ paddingTop: 6, paddingBottom: 2, fontSize: 10, color: C.mute, fontFamily: F_BODY, fontWeight: 600, letterSpacing: '0.05em' }}>
          累进税率分段：
        </div>
        {FED_BRACKETS[inputs.filingStatus].map((b, idx) => {
          const prev = idx === 0 ? 0 : FED_BRACKETS[inputs.filingStatus][idx - 1][0];
          const inB = Math.max(0, Math.min(calc.fedTaxable, b[0]) - prev);
          if (inB <= 0) return null;
          return (
            <FormulaRow key={idx}
              label={`$${fmt(prev)}–${b[0] === Infinity ? '∞' : '$' + fmt(b[0])} @ ${(b[1] * 100).toFixed(0)}%`}
              value={inB * b[1]} indent />
          );
        })}
        <FormulaRow label="联邦税合计" value={calc.fedTax} op="=" bold dashed />
        <div style={{ fontSize: 10, color: C.mute, fontFamily: F_BODY, marginTop: 4 }}>
          边际税率 <b style={{ fontFamily: F_NUM, color: C.ink }}>{pct(calc.marginalFed)}</b> · 有效 <b style={{ fontFamily: F_NUM, color: C.ink }}>{pct(calc.fedTax / Math.max(1, calc.grossWages))}</b>
        </div>
      </FormulaBlock>

      {calc.stateTax > 0 && (
        <FormulaBlock title={`④ ${STATE_BRACKETS[inputs.state]?.label || inputs.state} 州税 ${stateRuleLabel}`} desc={`州级累进`}>
          <FormulaRow label={`州 AGI ${inputs.state === 'NJ' ? '(不含 401k 抵扣)' : ''}`} value={calc.stateAGI} />
          <FormulaRow label={`州标扣`} value={-(calc.stateDed || 0)} op="−" />
          <FormulaRow label="州应税收入" value={calc.stateTaxable} op="=" bold />
          <div style={{ paddingTop: 6, paddingBottom: 2, fontSize: 10, color: C.mute, fontFamily: F_BODY, fontWeight: 600, letterSpacing: '0.05em' }}>
            {inputs.state} 累进分段（对 {inputs.filingStatus}）：
          </div>
          {(STATE_BRACKETS[inputs.state]?.[inputs.filingStatus] || STATE_BRACKETS[inputs.state]?.Single || []).map((b, idx) => {
            const arr = STATE_BRACKETS[inputs.state][inputs.filingStatus] || STATE_BRACKETS[inputs.state].Single;
            const prev = idx === 0 ? 0 : arr[idx - 1][0];
            const inB = Math.max(0, Math.min(calc.stateTaxable, b[0]) - prev);
            if (inB <= 0) return null;
            return (
              <FormulaRow key={idx}
                label={`$${fmt(prev)}–${b[0] === Infinity ? '∞' : '$' + fmt(b[0])} @ ${(b[1] * 100).toFixed(2)}%`}
                value={inB * b[1]} indent />
            );
          })}
          <FormulaRow label={`${inputs.state} 居民税`} value={calc.residentStateTax} op="=" bold dashed />
          {calc.workStateDetails && (
            <>
              <div style={{ paddingTop: 8, fontSize: 10, color: C.mute, fontFamily: F_BODY, fontWeight: 600, letterSpacing: '0.05em' }}>
                跨州工作调整：
              </div>
              <FormulaRow
                label={`W2 总额`}
                value={calc.totalW2}
                indent
              />
              <FormulaRow
                label={`× 工作州来源比例 ${Math.round(calc.workStateDetails.effectivePortion * 100)}%`}
                value={calc.workStateDetails.sourceW2}
                op="×"
                indent
              />
              {calc.workStateDetails.hasConvenience && calc.workStateDetails.daysPortion < 1 && (
                <div style={{ fontSize: 10, color: C.pay, fontFamily: F_BODY, paddingLeft: 12, lineHeight: 1.5, marginTop: 2 }}>
                  † {calc.workStateDetails.name} Convenience 规则：远程天数也计为该州来源（用户设 {Math.round(calc.workStateDetails.daysPortion * 100)}% → 实际仍按 100% 计）
                </div>
              )}
              <FormulaRow label={`+ ${calc.workStateDetails.name} 非居民税`} value={calc.workStateDetails.rawTax} op="+" indent />
              <FormulaRow label={`− ${inputs.state} 抵免 (最多抵到工作州已交)`} value={-calc.crossStateCredit} op="−" indent />
              <FormulaRow label={`净 ${inputs.state} 居民税`} value={calc.residentStateTax - calc.crossStateCredit} op="=" indent />
              <FormulaRow label="合计州税 (两州加总)" value={calc.stateTax} op="=" bold dashed />
            </>
          )}
          {calc.isReciprocal && (
            <div style={{ fontSize: 10, color: C.save, fontFamily: F_BODY, marginTop: 6, lineHeight: 1.5 }}>
              ✓ Reciprocal 协议：工作州不扣税
            </div>
          )}
        </FormulaBlock>
      )}

      {calc.localTax > 0 && calc.localRule && (
        <FormulaBlock title={`④⁺ ${calc.localRule.name}（市/地方税）`} desc={calc.localRule.note || ''}>
          {calc.localRule.type === 'surcharge' ? (
            <>
              <FormulaRow label={`${inputs.state} 州税`} value={calc.stateTax} />
              <FormulaRow label={`× 附加率 ${(calc.localRule.rate * 100).toFixed(2)}%`} value={calc.localTax} op="×" bold />
            </>
          ) : calc.localRule.type === 'flat' ? (
            <>
              <FormulaRow label="州应税收入" value={calc.stateTaxable} />
              <FormulaRow label={`× 税率 ${(calc.localRule.rate * 100).toFixed(2)}%`} value={calc.localTax} op="×" bold />
            </>
          ) : (
            <>
              <FormulaRow label="州应税收入" value={calc.stateTaxable} />
              <div style={{ paddingTop: 6, paddingBottom: 2, fontSize: 10, color: C.mute, fontFamily: F_BODY, fontWeight: 600, letterSpacing: '0.05em' }}>
                累进分段：
              </div>
              {(calc.localRule[inputs.filingStatus] || calc.localRule.Single || []).map((b, idx) => {
                const arr = calc.localRule[inputs.filingStatus] || calc.localRule.Single;
                const prev = idx === 0 ? 0 : arr[idx - 1][0];
                const inB = Math.max(0, Math.min(calc.stateTaxable, b[0]) - prev);
                if (inB <= 0) return null;
                return (
                  <FormulaRow key={idx}
                    label={`$${fmt(prev)}–${b[0] === Infinity ? '∞' : '$' + fmt(b[0])} @ ${(b[1] * 100).toFixed(3)}%`}
                    value={inB * b[1]} indent />
                );
              })}
              <FormulaRow label={`${calc.localRule.name} 合计`} value={calc.localTax} op="=" bold dashed />
            </>
          )}
        </FormulaBlock>
      )}

      <FormulaBlock title="⑤ FICA (工资税)" desc="Social Security + Medicare">
        <FormulaRow label={`SS: $${fmt(Math.min(calc.totalW2, SS_WAGE_BASE_2025))} × 6.2%`}
          value={calc.ssTax} />
        <div style={{ fontSize: 10, color: C.mute, fontFamily: F_BODY, paddingLeft: 12, marginTop: -2, marginBottom: 4 }}>
          (SS 工资基数上限 ${SS_WAGE_BASE_2025.toLocaleString()})
        </div>
        <FormulaRow label={`Medicare: $${fmt(calc.totalW2)} × 1.45%`} value={calc.medicareTax} />
        {calc.addlMedicare > 0 && (
          <FormulaRow label={`额外 Medicare (超线部分) × 0.9%`} value={calc.addlMedicare} />
        )}
        <FormulaRow label="FICA 合计" value={calc.fica} op="=" bold dashed />
      </FormulaBlock>

      {calc.seTax > 0 && (
        <FormulaBlock title="⑥ Self-Employment 税" desc="1099 自雇专属">
          <FormulaRow label={`1099 净利润 × 92.35%`} value={calc.net1099 * 0.9235} />
          <FormulaRow label={`SS 部分 × 12.4%`} value={calc.net1099 * 0.9235 * 0.124} indent />
          <FormulaRow label={`Medicare 部分 × 2.9%`} value={calc.net1099 * 0.9235 * 0.029} indent />
          <FormulaRow label="SE 税合计" value={calc.seTax} op="=" bold dashed />
          <div style={{ fontSize: 10, color: C.mute, fontFamily: F_BODY, marginTop: 4 }}>
            一半可作 above-line 抵扣：${fmt(calc.seDed)}
          </div>
        </FormulaBlock>
      )}

      <FormulaBlock title="⑦ 总税负汇总" desc="所有税种加起来" defaultOpen={false}>
        <FormulaRow label="联邦" value={calc.fedTax} op="+" />
        <FormulaRow label={`${inputs.state} 州`} value={calc.stateTax} op="+" />
        {calc.localTax > 0 && <FormulaRow label={calc.localRule?.name || '市/地方'} value={calc.localTax} op="+" />}
        <FormulaRow label="FICA" value={calc.fica} op="+" />
        {calc.seTax > 0 && <FormulaRow label="SE 税" value={calc.seTax} op="+" />}
        <FormulaRow label="总税负" value={calc.totalTax} op="=" bold dashed />
        <FormulaRow label="Gross 收入" value={calc.grossWages} />
        <FormulaRow label={`有效税率 = 总税 ÷ Gross`} value={pct(calc.effectiveRate)} bold dashed />
        <FormulaRow label="税后到手" value={calc.takeHome} op="→" bold />
      </FormulaBlock>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
//  Header（新版：画像按钮改通用化 + 修改状态）
// ═══════════════════════════════════════════════════════════

const Header = ({ preset, setPreset, isModified, saveStatus, onEdit, onPickPersona, onShowWorksheet, country, onChangeCountry }) => (
  <div className="flex items-center justify-between px-3 py-2"
    style={{
      position: 'sticky', top: 0, zIndex: 10,
      background: 'rgba(247,245,240,0.88)',
      backdropFilter: 'blur(12px)',
      borderBottom: `1px solid ${C.line}`,
      gap: 8,
    }}>
    {/* 左侧 · Logo */}
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', lineHeight: 1 }}>
        <span style={{ fontFamily: F_NUM, fontSize: 22, fontWeight: 700, color: C.ink, letterSpacing: '-0.04em' }}>Tax</span>
        <span style={{ fontFamily: F_NUM, fontSize: 22, fontWeight: 400, fontStyle: 'italic', color: C.save, letterSpacing: '-0.03em' }}>Pilot</span>
      </div>
      {saveStatus && (
        <span style={{ fontSize: 9, color: C.muteLite, fontFamily: F_BODY, marginLeft: 2,
          opacity: saveStatus === 'saved' ? 0.6 : 1, transition: 'opacity 0.3s',
          whiteSpace: 'nowrap', flexShrink: 0,
        }}>
          {saveStatus === 'saving' ? '…' : '✓'}
        </span>
      )}
    </div>

    {/* 右侧 · 返回按钮 + 3 个操作按钮 · 一起靠右 */}
    <div style={{ display: 'flex', gap: 4, flexShrink: 0, alignItems: 'center' }}>
      {/* v104: 返回主页按钮挪到按钮栏的开头 · 最靠右（整体靠右） */}
      {country && (
        <button
          onClick={onChangeCountry}
          style={{
            fontSize: 11,
            padding: '5px 9px',
            background: country === 'CA' ? '#E8DCC0' : '#F1EEE5',
            border: `1px solid ${C.line}`,
            borderRadius: 7,
            color: C.ink,
            fontFamily: F_BODY,
            fontWeight: 600,
            letterSpacing: '0.01em',
            cursor: 'pointer',
            lineHeight: 1.2,
            whiteSpace: 'nowrap',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            marginRight: 2,
          }}
          aria-label="返回主页"
          title="返回首页选国家"
        >
          <span style={{ fontSize: 10, opacity: 0.6 }}>←</span>
          <span style={{ opacity: 0.85 }}>返回</span>
          <span style={{ opacity: 0.7 }}>主页</span>
        </button>
      )}
      {onShowWorksheet && (
        <button
          onClick={onShowWorksheet}
          style={{
            fontSize: 11, padding: '5px 8px', borderRadius: 7,
            background: C.card, border: `1px solid ${C.line}`,
            color: C.ink2, fontFamily: F_BODY, fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
          aria-label={country === 'CA' ? 'T1 税表' : '完整税表'}
          title={country === 'CA' ? 'T1 税表' : '完整税表'}
        >
          📋 {country === 'CA' ? 'T1' : '税表'}
        </button>
      )}
      {onPickPersona && (
        <button
          onClick={onPickPersona}
          style={{
            fontSize: 11, padding: '5px 8px', borderRadius: 7,
            background: C.card, border: `1px solid ${C.line}`,
            color: C.ink2, fontFamily: F_BODY, fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
          aria-label="换个身份"
        >
          换身份
        </button>
      )}
      {onEdit && (
        <button
          onClick={onEdit}
          style={{
            fontSize: 11, padding: '5px 11px', borderRadius: 7,
            background: C.hero, border: 'none',
            color: C.heroInk, fontFamily: F_BODY, fontWeight: 700,
            cursor: 'pointer', letterSpacing: '0.02em',
            display: 'flex', alignItems: 'center', gap: 4,
            whiteSpace: 'nowrap',
          }}
          aria-label="编辑基础信息"
        >
          <span>✎</span>
          <span>编辑</span>
        </button>
      )}
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════
//  Presets · 基于家庭结构而非地点
// ═══════════════════════════════════════════════════════════

const PRESETS = {
  duo: {
    filingStatus: 'MFJ', state: 'NY', city: 'nyc', workState: '',
    w2: 200000, spouseW2: 150000, inc1099: 0, expense1099: 0,
    k401: 0, hdhp: false, hsa: 0, children: 1,
    properties: [
      { id: 1, type: 'primary', state: 'NY', propertyTax: 18000, mortInt: 16000 },
    ],
    charity: 2000, medical: 5000,
    megaBackdoor: false, commuterBenefit: false, dcfsa: false,
  },
  side: {
    filingStatus: 'MFJ', state: 'NJ', city: '', workState: 'NY',
    w2: 180000, spouseW2: 80000, inc1099: 50000, expense1099: 8000,
    k401: 0, hdhp: false, hsa: 0, children: 1,
    properties: [
      { id: 1, type: 'primary', state: 'NJ', propertyTax: 15000, mortInt: 14000 },
    ],
    charity: 1000, medical: 4000,
    megaBackdoor: false, commuterBenefit: false, dcfsa: false,
  },
  single: {
    filingStatus: 'Single', state: 'NY', city: 'nyc', workState: '',
    w2: 185000, spouseW2: 0, inc1099: 0, expense1099: 0,
    k401: 0, hdhp: true, hsa: 0, children: 0,
    properties: [],
    charity: 500, medical: 2500,
    megaBackdoor: false, commuterBenefit: false, dcfsa: false,
  },
  blank: {
    filingStatus: 'Single', state: 'NY', city: '', workState: '',
    w2: 80000, spouseW2: 0, inc1099: 0, expense1099: 0,
    k401: 0, hdhp: false, hsa: 0, children: 0,
    properties: [],
    charity: 0, medical: 0,
    megaBackdoor: false, commuterBenefit: false, dcfsa: false,
  },
};

// ═══════════════════════════════════════════════════════════
//  Personas · 20 个真实生活场景 · 分 5 组
// ═══════════════════════════════════════════════════════════

const PERSONA_GROUPS = [
  // ═══════════════════════════════════════════════════════════
  // I. 初入职场 · 单身 / 情侣 （20-32 岁独立期）
  // ═══════════════════════════════════════════════════════════
  {
    group: '初入职场',
    groupTag: 'I',
    groupTags: ['single', 'married', 'w2', 'visa-f1', 'visa-h1b', 'couple-coliving', 'rsu', 'ut', 'ak', 'henry', 'high-income'],
    blurb: '刚开始挣钱 · 税简单但细节藏陷阱',
    scenarios: [
      { tag: '留学生 · F-1/OPT', desc: '前 5 年可免 FICA · 税务 Non-Resident · 填 1040NR' },
      { tag: '单身 W2', desc: '标准扣除 $15K · 22% 边际档 · 第一次开 Roth IRA' },
      { tag: '情侣同居', desc: '不合报 · 各 Single 身份 · 优化房贷利息归属' },
      { tag: '新毕业 H1B', desc: 'Resident Alien · 全球收入 · 考虑 401k match' },
    ],
    detail: {
      pain: '收入起步 · 标扣就够 · 还没想过退休账户',
      traits: '薪水 $20K – $90K · 单身 或 情侣同居 · 学生签证 / OPT / H1B',
      typical: '刚毕业的留学生 · 科技 / 金融 / 咨询初级 · 租房',
      mainOpps: '开第一个 Roth IRA · FICA 豁免 · 州税套利',
    },
    accent: '#9BA89C',
    tint: '#F0EEE6',
    pattern: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20'><circle cx='2' cy='2' r='1' fill='%239BA89C' opacity='0.35'/></svg>",
    personas: [
      {
        id: 'internStudent',
        tags: ['visa-f1', 'single', 'tax-resident', 'dual-status'],
        taxDesc: 'F-1 OPT 前 5 年免 FICA · Non-Resident 填 1040NR · 标扣 $15K',
        title: '留学生 · 暑期实习',
        subtitle: 'F-1 OPT · 仅 3 个月 W2',
        hook: 'FICA 豁免 + Standard Deduction',
        inputs: {
          filingStatus: 'Single',
          state: 'CA', city: '', workState: '',
          w2: 25000, spouseW2: 0,
          inc1099: 0, expense1099: 0,
          k401: 0, hdhp: false, hsa: 0,
          children: 0,
          properties: [],
          charity: 0, medical: 300,
          megaBackdoor: false, commuterBenefit: false, dcfsa: false,
        },
      },
      {
        id: 'freshGradMidwest',
        tags: ['single', 'w2'],
        taxDesc: 'Single · 22% 边际 · Student Loan Interest 最多扣 $2,500',
        title: '应届毕业 · 芝加哥',
        subtitle: 'Single · 租公寓 · 中薪',
        hook: 'Student Loan Interest + 401k 补',
        inputs: {
          filingStatus: 'Single',
          state: 'IL', city: '', workState: '',
          w2: 72000, spouseW2: 0,
          inc1099: 0, expense1099: 0,
          k401: 0, hdhp: true, hsa: 0,
          children: 0,
          properties: [],
          charity: 200, medical: 800,
          megaBackdoor: false, commuterBenefit: false, dcfsa: false,
        },
      },
      {
        id: 'techSingleSF',
        tags: ['single', 'w2', 'ca', 'rsu', 'ca-sdi', 'ca-nonconform'],
        taxDesc: 'H1B Resident Alien · CA 13.3% 顶档 · SDI 1.2% 无上限 · Mega Backdoor 核心',
        title: '码农单身 · 湾区',
        subtitle: 'H1B · 单身租 SF · 高薪',
        hook: '401k 没存满 + Mega Backdoor',
        inputs: {
          filingStatus: 'Single',
          state: 'CA', city: '', workState: '',
          w2: 210000, spouseW2: 0,
          inc1099: 0, expense1099: 0,
          k401: 0, hdhp: false, hsa: 0,
          children: 0,
          properties: [],
          charity: 500, medical: 1500,
          megaBackdoor: false, commuterBenefit: false, dcfsa: false,
        },
      },
      {
        id: 'unmarriedCouple',
        tags: ['single', 'couple-coliving', 'w2'],
        taxDesc: '不能合报 · 各 Single 身份 · 优化房贷利息 / SALT 归属',
        title: '未婚情侣同居 · NYC',
        subtitle: '双薪合租 · 各自 Single 申报',
        hook: '结婚能省 vs 保持单身',
        inputs: {
          // 注：这个 persona 只算 "主申报人"，Single 状态
          // 未婚伴侣在税法上不能合并申报
          filingStatus: 'Single',
          state: 'NY', city: 'nyc', workState: '',
          w2: 135000, spouseW2: 0,
          inc1099: 0, expense1099: 0,
          k401: 0, hdhp: false, hsa: 0,
          children: 0,
          properties: [],
          charity: 300, medical: 1000,
          megaBackdoor: false, commuterBenefit: false, dcfsa: false,
        },
      },
      {
        id: 'techGradNY',
        tags: ['single', 'w2', 'nyc', 'rsu'],
        taxDesc: '应届码农 NYC · RSU vest 大税 · 401k 起步 + Roth IRA',
        title: '应届码农 · 纽约',
        subtitle: 'Single · 租 Manhattan · 高薪',
        hook: '401k + Roth IRA 起步',
        inputs: {
          filingStatus: 'Single',
          state: 'NY', city: 'nyc', workState: '',
          w2: 155000, spouseW2: 0,
          inc1099: 0, expense1099: 0,
          k401: 0, hdhp: false, hsa: 0,
          children: 0,
          properties: [],
          charity: 300, medical: 1000,
          megaBackdoor: false, commuterBenefit: false, dcfsa: false,
        },
      },
      {
        id: 'womenInSTEM',
        tags: ['single', 'w2'],
        taxDesc: 'PhD 毕业 · Student Loan 大 · 401k 补齐 + HSA 起步',
        title: 'STEM 女博士 · 西雅图',
        subtitle: 'Single · PhD 毕业刚工作',
        hook: 'Student Loan $60K + 401k 起步',
        inputs: {
          filingStatus: 'Single',
          state: 'WA', city: '', workState: '',
          w2: 125000, spouseW2: 0,
          inc1099: 0, expense1099: 0,
          k401: 0, hdhp: false, hsa: 0,
          children: 0,
          properties: [],
          charity: 500, medical: 1500,
          megaBackdoor: false, commuterBenefit: false, dcfsa: false,
        },
      },
      {
        id: 'newlywedTech',
        tags: ['married', 'w2', 'rsu'],
        taxDesc: '新婚 MFJ · 合报标扣翻倍 · RSU vest 起扣 Roth IRA',
        title: '新婚双码农 · Austin',
        subtitle: 'MFJ · 刚结婚租公寓',
        hook: '合并申报试算 + 双 401k',
        inputs: {
          filingStatus: 'MFJ',
          state: 'TX', city: '', workState: '',
          w2: 180000, spouseW2: 150000,
          inc1099: 0, expense1099: 0,
          k401: 0, hdhp: false, hsa: 0,
          children: 0,
          properties: [],
          charity: 500, medical: 1200,
          megaBackdoor: false, commuterBenefit: false, dcfsa: false,
        },
      },
      {
        // v96: MA · 波士顿码农 H1B · 双重代扣 + 高州税 5%
        id: 'maBostonH1B',
        tags: ['single', 'w2', 'visa-h1b', 'henry', 'high-income'],
        taxDesc: 'MA 码农 H1B · 5% flat 税 · 生医 / AI 集聚 · Backdoor Roth 核心',
        title: '波士顿码农 · H1B',
        subtitle: 'H1B · 生医 / 波士顿 Seaport',
        hook: 'MA 5% flat + 百万附加 4% + Backdoor Roth',
        inputs: {
          filingStatus: 'Single',
          state: 'MA', city: '', workState: '',
          w2: 195000, spouseW2: 0,
          inc1099: 0, expense1099: 0,
          k401: 0, hdhp: false, hsa: 0,
          children: 0,
          properties: [],
          charity: 1000, medical: 800,
          megaBackdoor: false, commuterBenefit: false, dcfsa: false,
        },
      },
      {
        // v94: UT Silicon Slopes · 湾区 CA 搬过来的 tech worker
        id: 'utTechLehi',
        tags: ['single', 'w2', 'rsu', 'henry', 'high-income'],
        taxDesc: 'Silicon Slopes 码农 · UT 4.5% flat · 从 CA 13.3% 搬来省 ~$20K / 年',
        title: '硅谷→犹他码农 · Lehi',
        subtitle: 'Single · 从湾区搬过来 · 远程 + 低税',
        hook: 'CA → UT 州税套利 · 房价 1/3',
        inputs: {
          filingStatus: 'Single',
          state: 'UT', city: '', workState: '',
          w2: 220000, spouseW2: 0,
          inc1099: 0, expense1099: 0,
          k401: 0, hdhp: false, hsa: 0,
          children: 0,
          properties: [
            { id: 1, type: 'primary', state: 'UT', propertyTax: 3200, mortInt: 14000 },
          ],
          charity: 3000, medical: 800,
          megaBackdoor: true, commuterBenefit: false, dcfsa: false,
        },
      },
      {
        // v94: AK 油田工人 · 季节性高薪 W2 · 无州税 + PFD
        id: 'akOilWorker',
        tags: ['single', 'w2', 'high-income'],
        taxDesc: 'North Slope 轮班油田工 · $180K W2 · 无州税 · PFD $1,000',
        title: '油田工人 · 阿拉斯加',
        subtitle: 'Single · 两周上两周下 · 住 Anchorage',
        hook: '零州税 + PFD + 401k 必拉满',
        inputs: {
          filingStatus: 'Single',
          state: 'AK', city: '', workState: '',
          w2: 180000, spouseW2: 0,
          inc1099: 0, expense1099: 0,
          k401: 0, hdhp: false, hsa: 0,
          children: 0,
          properties: [],
          charity: 500, medical: 1000,
          megaBackdoor: false, commuterBenefit: false, dcfsa: false,
          interest: 1000, dividends: 0, qualifiedDividends: 0,
        },
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  // II. 家庭中产 · 双薪 / 单薪 / 单亲
  // ═══════════════════════════════════════════════════════════
  {
    group: '家庭中产',
    groupTag: 'II',
    groupTags: ['married', 'hoh', 'kids', 'w2', 'spouse-nowork', 'ctc', 'house', 'salt', 'ut'],
    blurb: 'MFJ · 娃 · 房贷 · 托儿 · 真正的压力期',
    scenarios: [
      { tag: '双薪家庭', desc: 'MFJ 双 W2 · 边际 22-32% · 两人合计撞 SALT cap' },
      { tag: '单薪家庭', desc: '配偶不工作 · Spousal IRA · DCFSA 托儿省税' },
      { tag: '单亲 HoH', desc: 'Head of Household · 标扣 $22,500 · CTC 最值钱' },
      { tag: '离异 / 分居', desc: '抚养费税务处理 · 娃归属争夺 · CTC 分配' },
    ],
    detail: {
      pain: 'SALT cap + 双薪 + 娃托费压力山大',
      traits: '家庭收入 $80K – $300K · MFJ / HoH · 1-3 娃 · 自住或租',
      typical: '俄亥俄小房夫妻 · 长岛双薪 · 弗吉尼亚单薪 · 北卡单亲',
      mainOpps: 'CTC 儿童税抵免 · DCFSA 托儿 · HSA · Itemize 试算',
    },
    accent: '#B08968',
    tint: '#F3EDE4',
    pattern: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='20' height='8'><path d='M0 4 L20 4' stroke='%23B08968' stroke-width='0.5' opacity='0.35'/></svg>",
    personas: [
      {
        id: 'dualIncomeMidwest',
        tags: ['married', 'kids', 'w2', 'house'],
        taxDesc: 'MFJ 双 W2 · 中产家庭 · CTC + DCFSA 托儿 · Itemize 试算',
        title: '双薪中产 · 俄亥俄',
        subtitle: 'MFJ · 2 娃 · 自住小房',
        hook: 'CTC + HSA + Itemize 试算',
        inputs: {
          filingStatus: 'MFJ',
          state: 'OH', city: '', workState: '',
          w2: 85000, spouseW2: 62000,
          inc1099: 0, expense1099: 0,
          k401: 0, hdhp: true, hsa: 0,
          children: 2,
          properties: [
            { id: 1, type: 'primary', state: 'OH', propertyTax: 5500, mortInt: 9000 },
          ],
          charity: 800, medical: 3500,
          megaBackdoor: false, commuterBenefit: false, dcfsa: false,
        },
      },
      {
        id: 'singleParent',
        tags: ['hoh', 'kids', 'w2', 'ctc'],
        taxDesc: 'HoH 标扣 $22,500 · CTC $2K/娃 · EITC 有机会',
        title: '单亲护士 · 北卡',
        subtitle: 'HoH · 1 娃 · 租房',
        hook: 'HoH + EITC + CTC 叠加',
        inputs: {
          filingStatus: 'HoH',
          state: 'NC', city: '', workState: '',
          w2: 58000, spouseW2: 0,
          inc1099: 0, expense1099: 0,
          k401: 0, hdhp: false, hsa: 0,
          children: 1,
          properties: [],
          charity: 200, medical: 1800,
          megaBackdoor: false, commuterBenefit: false, dcfsa: false,
        },
      },
      {
        id: 'singleEarnerFamily',
        tags: ['married', 'spouse-nowork', 'kids', 'w2'],
        taxDesc: '单薪 MFJ · Spousal IRA $7K · DCFSA 未用',
        title: '单薪顾家 · 弗吉尼亚',
        subtitle: 'MFJ · 3 娃 · 配偶全职',
        hook: 'Spousal IRA + 大 SALT',
        inputs: {
          filingStatus: 'MFJ',
          state: 'VA', city: '', workState: '',
          w2: 155000, spouseW2: 0,
          inc1099: 0, expense1099: 0,
          k401: 0, hdhp: false, hsa: 0,
          children: 3,
          properties: [
            { id: 1, type: 'primary', state: 'VA', propertyTax: 7000, mortInt: 14000 },
          ],
          charity: 1200, medical: 4500,
          megaBackdoor: false, commuterBenefit: false, dcfsa: false,
        },
      },
      {
        id: 'dinkWithDog',
        tags: ['married', 'w2', 'house'],
        taxDesc: '丁克 MFJ 买房 · 房贷利息 Itemize · 401k 两人都存满',
        title: '丁克 + 狗 · 奥斯汀',
        subtitle: 'MFJ 丁克 · 养只狗 · TX 0 州税',
        hook: '无孩子 CTC · 高 401k + HSA 天花板',
        inputs: {
          filingStatus: 'MFJ',
          state: 'TX', city: '', workState: '',
          w2: 155000, spouseW2: 135000,
          inc1099: 0, expense1099: 0,
          k401: 0, hdhp: true, hsa: 0,
          children: 0,
          properties: [
            { id: 1, type: 'primary', state: 'TX', propertyTax: 9500, mortInt: 16000 },
          ],
          charity: 2400, medical: 800,
          megaBackdoor: false, commuterBenefit: false, dcfsa: false,
        },
      },
      {
        id: 'longIslandDual',
        tags: ['married', 'kids', 'w2', 'nyc', 'house', 'mansion-tax', 'salt'],
        taxDesc: '长岛双薪 · SALT cap 触及（$40K 2025 · phase-out 开始）· PTE 可破 · Mansion Tax 区',
        title: '双薪 + 2 娃 · 长岛',
        subtitle: 'MFJ · 高地税 · 自住',
        hook: 'SALT Cap 触发',
        inputs: {
          filingStatus: 'MFJ',
          state: 'NY', city: '', workState: '',
          w2: 175000, spouseW2: 85000,
          inc1099: 0, expense1099: 0,
          k401: 0, hdhp: true, hsa: 0,
          children: 2,
          properties: [
            { id: 1, type: 'primary', state: 'NY', propertyTax: 16000, mortInt: 18000 },
          ],
          charity: 1500, medical: 4000,
          megaBackdoor: false, commuterBenefit: false, dcfsa: false,
        },
      },
      {
        id: 'hohDadChicago',
        tags: ['hoh', 'kids', 'w2', 'ctc'],
        taxDesc: 'HoH 带 2 娃 · CTC $4K · 考虑 529 起步',
        title: 'HoH 单亲爸爸 · 芝加哥',
        subtitle: 'HoH · 离异 · 2 娃',
        hook: 'HoH 标扣 + CTC × 2',
        inputs: {
          filingStatus: 'HoH',
          state: 'IL', city: '', workState: '',
          w2: 95000, spouseW2: 0,
          inc1099: 0, expense1099: 0,
          k401: 0, hdhp: false, hsa: 0,
          children: 2,
          properties: [],
          charity: 400, medical: 2500,
          megaBackdoor: false, commuterBenefit: false, dcfsa: false,
        },
      },
      {
        // v96: PA · 费城郊区双薪 MFJ · PA 3.07% flat + 地产税大（school tax）
        id: 'paPhillySuburb',
        tags: ['married', 'kids', 'w2', 'house', 'salt'],
        taxDesc: '费城郊区双薪 · PA 3.07% flat · 地产税 $8K · 2 娃 · 通勤费城',
        title: 'PA 双薪家庭 · 费城郊',
        subtitle: 'MFJ · 通勤费城上班 · 2 娃 · 自住房',
        hook: 'PA flat 3.07% + 费城市税 3.75% 跨市',
        inputs: {
          filingStatus: 'MFJ',
          state: 'PA', city: '', workState: '',
          w2: 130000, spouseW2: 95000,
          inc1099: 0, expense1099: 0,
          k401: 0, hdhp: true, hsa: 4000,
          children: 2,
          properties: [
            { id: 1, type: 'primary', state: 'PA', propertyTax: 8200, mortInt: 14000 },
          ],
          charity: 2500, medical: 2000,
          megaBackdoor: false, commuterBenefit: true, dcfsa: true,
        },
      },
      {
        // v96: IL · 芝加哥年轻夫妻 · IL 4.95% flat + 库克郡 property tax 重
        id: 'ilChicagoMFJ',
        tags: ['married', 'kids', 'w2', 'house'],
        taxDesc: '芝加哥双薪 · IL 4.95% flat · 库克郡地产税 2% · 1 娃',
        title: 'IL 双薪夫妻 · 芝加哥',
        subtitle: 'MFJ · Loop 上班 · 1 娃 · 刚买 condo',
        hook: 'IL flat + 库克郡高地产税 + CTC',
        inputs: {
          filingStatus: 'MFJ',
          state: 'IL', city: '', workState: '',
          w2: 145000, spouseW2: 115000,
          inc1099: 0, expense1099: 0,
          k401: 0, hdhp: false, hsa: 0,
          children: 1,
          properties: [
            { id: 1, type: 'primary', state: 'IL', propertyTax: 12000, mortInt: 18000 },
          ],
          charity: 2000, medical: 1500,
          megaBackdoor: false, commuterBenefit: true, dcfsa: true,
        },
      },
      {
        // v94: UT 大家庭 · LDS 典型 · 4-5 娃 · 多 CTC
        id: 'utLargeFamily',
        tags: ['married', 'kids', 'spouse-nowork', 'w2', 'ctc'],
        taxDesc: 'UT 4 娃家庭 · CTC × 4 = $8K · UT 4.5% flat · $2,111/人免税额',
        title: '大家庭单薪 · 盐湖城',
        subtitle: 'MFJ · 配偶全职妈妈 · 4 娃',
        hook: 'CTC $8K + Spousal IRA + UT 人头免税额',
        inputs: {
          filingStatus: 'MFJ',
          state: 'UT', city: '', workState: '',
          w2: 140000, spouseW2: 0,
          inc1099: 0, expense1099: 0,
          k401: 0, hdhp: true, hsa: 4000,
          children: 4,
          properties: [
            { id: 1, type: 'primary', state: 'UT', propertyTax: 2800, mortInt: 11000 },
          ],
          charity: 12000, medical: 3500,
          megaBackdoor: false, commuterBenefit: false, dcfsa: false,
        },
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  // III. 跨州通勤 · WFH / 搬家
  // ═══════════════════════════════════════════════════════════
  {
    group: '跨州通勤',
    groupTag: 'III',
    groupTags: ['multi-state', 'convenience-rule', 'nj', 'nyc', 'ca', 'fl', 'w2'],
    blurb: '住一个州 · 工作另一个州 · 州税最容易踩坑',
    scenarios: [
      { tag: 'NJ → NY 通勤', desc: 'NY 双重代扣 · NJ 给 credit · 实际交 NY 最高档' },
      { tag: 'CT → NY 通勤', desc: '同上 · 注意 CT 不完全 credit 可能多交' },
      { tag: '远程 WFH', desc: 'Convenience Rule 陷阱 · 为 NY 雇主远程也算 NY 源' },
      { tag: '搬到 FL / TX', desc: '零州税州 · 但 Convenience Rule 让省税失败' },
    ],
    detail: {
      pain: 'NY Convenience Rule 坑 + 跨州双重征税',
      traits: '住 NJ/CT/PA 却在 NY 上班 · 或远程办公混乱 · 搬 FL 不一定省',
      typical: 'NJ-NY 通勤 · CT-NY 通勤 · WFH CA 雇 NJ 人 · FL 远程给 NY 公司',
      mainOpps: 'Domicile 切换 · 找当地雇主 · Commuter benefits',
    },
    accent: '#6B8CAE',
    tint: '#ECEEF3',
    pattern: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10'><path d='M-1 1 L1 -1 M0 10 L10 0 M9 11 L11 9' stroke='%236B8CAE' stroke-width='0.6' opacity='0.4'/></svg>",
    personas: [
      {
        id: 'commuteNJNY',
        tags: ['married', 'multi-state', 'convenience-rule', 'nj', 'nyc', 'w2'],
        taxDesc: 'NJ 住 NY 上班 · Convenience Rule · NY 税高但 NJ 给 credit',
        title: 'NJ 住 NY 上班',
        subtitle: '夫妻 · NJ 自住 · NY 上班',
        hook: 'NY Convenience 陷阱',
        inputs: {
          filingStatus: 'MFJ',
          state: 'NJ', city: '', workState: 'NY', workStateDays: 100,
          w2: 180000, spouseW2: 110000,
          inc1099: 0, expense1099: 0,
          k401: 0, hdhp: false, hsa: 0,
          children: 1,
          properties: [
            { id: 1, type: 'primary', state: 'NJ', propertyTax: 12000, mortInt: 14000 },
          ],
          charity: 1000, medical: 3000,
          megaBackdoor: false, commuterBenefit: false, dcfsa: false,
        },
      },
      {
        id: 'singleCommuterNJNY',
        tags: ['single', 'multi-state', 'convenience-rule', 'nj', 'nyc', 'w2'],
        taxDesc: '单身 NJ→NY · 交 NY 最高档税 · 通勤补贴 pre-tax',
        title: '单身通勤 · NJ-NY',
        subtitle: 'Single · Jersey City 租',
        hook: 'NJ-NY 税差可省 $2K',
        inputs: {
          filingStatus: 'Single',
          state: 'NJ', city: '', workState: 'NY', workStateDays: 100,
          w2: 155000, spouseW2: 0,
          inc1099: 0, expense1099: 0,
          k401: 0, hdhp: false, hsa: 0,
          children: 0,
          properties: [],
          charity: 300, medical: 1200,
          megaBackdoor: false, commuterBenefit: false, dcfsa: false,
        },
      },
      {
        id: 'flRemoteFromNY',
        tags: ['multi-state', 'convenience-rule', 'fl', 'nyc', 'w2'],
        taxDesc: 'FL 零州税 · 但为 NY 雇主远程照交 NY 税（Convenience Rule 坑）',
        title: 'FL 远程 · 原 NY 工作',
        subtitle: '搬 FL · 100% WFH',
        hook: 'Convenience 还是要交',
        inputs: {
          filingStatus: 'MFJ',
          state: 'FL', city: '', workState: 'NY', workStateDays: 0,
          w2: 190000, spouseW2: 130000,
          inc1099: 0, expense1099: 0,
          k401: 0, hdhp: false, hsa: 0,
          children: 1,
          properties: [],
          charity: 1000, medical: 3000,
          megaBackdoor: false, commuterBenefit: false, dcfsa: false,
        },
      },
      {
        id: 'wfhCAJobInNJ',
        tags: ['multi-state', 'convenience-rule', 'nj', 'ca', 'w2'],
        taxDesc: 'NJ 住 · CA 公司远程 · CA 不追但 NJ 照常',
        title: 'NJ WFH · CA 雇主',
        subtitle: '100% 远程 · NJ 自住',
        hook: 'CA 无 Convenience 真省',
        inputs: {
          filingStatus: 'MFJ',
          state: 'NJ', city: '', workState: 'CA', workStateDays: 0,
          w2: 200000, spouseW2: 120000,
          inc1099: 0, expense1099: 0,
          k401: 0, hdhp: false, hsa: 0,
          children: 1,
          properties: [
            { id: 1, type: 'primary', state: 'NJ', propertyTax: 13000, mortInt: 15000 },
          ],
          charity: 1500, medical: 3500,
          megaBackdoor: false, commuterBenefit: false, dcfsa: false,
        },
      },
      {
        id: 'bostonNHCommuter',
        tags: ['multi-state', 'w2'],
        taxDesc: 'NH 住 · MA 上班 · MA 只征工作天 · NH 零州税',
        title: 'NH 住 MA 上班',
        subtitle: 'Single · NH 0 州税',
        hook: 'NH 无州税 · 但 MA 收你',
        inputs: {
          filingStatus: 'Single',
          state: 'NH', city: '', workState: 'MA',
          w2: 135000, spouseW2: 0,
          inc1099: 0, expense1099: 0,
          k401: 0, hdhp: false, hsa: 0,
          children: 0,
          properties: [],
          charity: 300, medical: 1200,
          megaBackdoor: false, commuterBenefit: false, dcfsa: false,
        },
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  // IV. 自雇副业 · 灵活就业
  // ═══════════════════════════════════════════════════════════
  {
    group: '自雇副业',
    groupTag: 'IV',
    groupTags: ['1099', 'se-tax', 's-corp', 'llc', 'qbi', 'uber', 'restaurant', 'influencer', 'ak'],
    blurb: '1099 自由职业 · 没 W2 扣税 · 自己管 SE Tax + 季度预缴',
    scenarios: [
      { tag: 'Uber / Lyft 司机', desc: '全 1099 · 交 15.3% SE Tax · 里程 $0.67/mile 扣除' },
      { tag: '餐馆老板 S-Corp', desc: '合理工资 60/40 分红 · Sch C → S-Corp 省 FICA' },
      { tag: '博主 / 创作者', desc: 'YouTube/小红书广告费 · Home Office · 设备折旧' },
      { tag: '小老板 LLC', desc: 'QBI 20% 扣除 · Solo 401(k) 存 $70K · 自雇医保' },
    ],
    detail: {
      pain: '交 15.3% SE Tax + 没 W2 withholding',
      traits: '1099 自雇 · Uber / 餐馆 / 博主 / 小老板 · 年收入 $30K – $200K',
      typical: 'Uber 司机 · 餐馆服务员 · 小红书博主 · Queens 餐馆老板',
      mainOpps: 'QBI 20% 扣除 · Solo 401(k) · Schedule C 业务开支',
    },
    accent: '#A06B52',
    tint: '#F2E9E3',
    pattern: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12'><path d='M0 0 L12 12 M12 0 L0 12' stroke='%23A06B52' stroke-width='0.4' opacity='0.3'/></svg>",
    personas: [
      {
        id: 'restaurantWorker',
        tags: ['single', '1099', 'se-tax'],
        taxDesc: '餐馆服务员 · 全 1099 · 15.3% SE Tax · 没扣税 4 月大补',
        title: '餐馆服务员 · 法拉盛',
        subtitle: 'W2 + 小费 + 没福利',
        hook: 'EITC + Retirement Savers Credit',
        inputs: {
          filingStatus: 'Single',
          state: 'NY', city: 'nyc', workState: '',
          w2: 38000, spouseW2: 0,
          inc1099: 0, expense1099: 0,
          k401: 0, hdhp: false, hsa: 0,
          children: 0,
          properties: [],
          charity: 50, medical: 500,
          megaBackdoor: false, commuterBenefit: false, dcfsa: false,
        },
      },
      {
        id: 'uberDriverNJ',
        tags: ['uber', '1099', 'se-tax', 'nj'],
        taxDesc: 'Uber 司机 · 里程 $0.67/mile 扣除 · QBI 20% · 季度预缴',
        title: 'Uber 全职司机',
        subtitle: '已婚 1 娃 · NJ 租房',
        hook: 'Solo 401k + QBI + 车折旧',
        inputs: {
          filingStatus: 'MFJ',
          state: 'NJ', city: '', workState: '',
          w2: 0, spouseW2: 45000,
          inc1099: 75000, expense1099: 12000,
          k401: 0, hdhp: false, hsa: 0,
          children: 1,
          properties: [],
          charity: 200, medical: 1800,
          megaBackdoor: false, commuterBenefit: false, dcfsa: false,
        },
      },
      {
        id: 'influencerNYC',
        tags: ['influencer', '1099', 'se-tax', 'nyc', 'qbi'],
        taxDesc: '小红书博主 · Home Office · 设备折旧 · QBI 20%',
        title: '小红书博主 · NYC',
        subtitle: '全职自媒体 · 单身',
        hook: 'Solo 401k $46K 空间',
        inputs: {
          filingStatus: 'Single',
          state: 'NY', city: 'nyc', workState: '',
          w2: 0, spouseW2: 0,
          inc1099: 140000, expense1099: 25000,
          k401: 0, hdhp: false, hsa: 0,
          children: 0,
          properties: [],
          charity: 500, medical: 2000,
          megaBackdoor: false, commuterBenefit: false, dcfsa: false,
        },
      },
      {
        id: 'restaurantOwnerQueens',
        tags: ['restaurant', 's-corp', 'nyc', 'qbi', 'se-tax'],
        taxDesc: '餐馆老板 S-Corp · 合理工资 60/40 分红 · 省 FICA',
        title: '餐馆小老板 · 皇后区',
        subtitle: 'S-Corp · 夫妻共营 · 2 娃',
        hook: 'QBI + Solo 401k + 自家娃',
        inputs: {
          filingStatus: 'MFJ',
          state: 'NY', city: 'nyc', workState: '',
          w2: 60000, spouseW2: 35000,
          inc1099: 180000, expense1099: 30000,
          k401: 0, hdhp: false, hsa: 0,
          children: 2,
          properties: [
            { id: 1, type: 'primary', state: 'NY', propertyTax: 10000, mortInt: 12000 },
          ],
          charity: 800, medical: 3500,
          megaBackdoor: false, commuterBenefit: false, dcfsa: false,
        },
      },
      {
        id: 'etsySellerWA',
        tags: ['influencer', '1099', 'se-tax', 'qbi'],
        taxDesc: 'Etsy 卖家 · WA 零州税 · Schedule C · Solo 401(k)',
        title: 'Etsy 手作卖家 · 西雅图',
        subtitle: 'Single · 全职自雇 · 小店',
        hook: 'QBI + Sch C 开支 + Solo 401k',
        inputs: {
          filingStatus: 'Single',
          state: 'WA', city: '', workState: '',
          w2: 0, spouseW2: 0,
          inc1099: 85000, expense1099: 18000,
          k401: 0, hdhp: false, hsa: 0,
          children: 0,
          properties: [],
          charity: 300, medical: 2000,
          megaBackdoor: false, commuterBenefit: false, dcfsa: false,
        },
      },
      {
        id: 'twitchStreamerTX',
        tags: ['influencer', '1099', 'se-tax', 'tx'],
        taxDesc: 'Twitch 主播 · TX 零州税 · Home Office · Solo 401(k) 存 $70K',
        title: 'Twitch 主播 · Austin',
        subtitle: 'Single · 全职直播 + 订阅',
        hook: '1099-K + Schedule C 家庭办公',
        inputs: {
          filingStatus: 'Single',
          state: 'TX', city: '', workState: '',
          w2: 0, spouseW2: 0,
          inc1099: 150000, expense1099: 25000,
          k401: 0, hdhp: false, hsa: 0,
          children: 0,
          properties: [],
          charity: 500, medical: 1800,
          megaBackdoor: false, commuterBenefit: false, dcfsa: false,
        },
      },
      {
        id: 'coupleCafeOwners',
        tags: ['married', 's-corp', 'restaurant', 'qbi', 'se-tax'],
        taxDesc: '夫妻开咖啡馆 S-Corp · 各付自己合理工资 · QBI 20%',
        title: '夫妻咖啡店 · Queens',
        subtitle: 'MFJ · 双自雇 · 小店主',
        hook: '双 SE Tax + QBI + Solo 401k',
        inputs: {
          filingStatus: 'MFJ',
          state: 'NY', city: 'nyc', workState: '',
          w2: 0, spouseW2: 0,
          inc1099: 120000, expense1099: 35000,
          k401: 0, hdhp: false, hsa: 0,
          children: 1,
          properties: [],
          charity: 800, medical: 3500,
          megaBackdoor: false, commuterBenefit: false, dcfsa: false,
        },
      },
      {
        // v94: AK 商业渔民 · 季节性 1099 高收入 · 无州税
        id: 'akFisherman',
        tags: ['single', '1099', 'se-tax', 'qbi'],
        taxDesc: '阿拉斯加商业渔民 · 3 月捕捞季 1099 · 无州税 · 自雇税压力',
        title: '商业渔民 · 布里斯托湾',
        subtitle: 'Single · 三文鱼季节工 · 冬天休',
        hook: 'SE Tax 15.3% + Solo 401k + QBI 20%',
        inputs: {
          filingStatus: 'Single',
          state: 'AK', city: '', workState: '',
          w2: 0, spouseW2: 0,
          inc1099: 140000, expense1099: 32000,
          k401: 0, hdhp: false, hsa: 0,
          children: 0,
          properties: [],
          charity: 500, medical: 2000,
          megaBackdoor: false, commuterBenefit: false, dcfsa: false,
        },
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  // V. 财富阶梯 · 高薪到超富
  // ═══════════════════════════════════════════════════════════
  {
    group: '财富阶梯',
    groupTag: 'V',
    groupTags: ['henry', 'high-income', 'ultra-rich', 'rsu', 'iso', 'amt', 'mega-backdoor', 'backdoor-roth', 'qsbs', 'qbi', 'salt', 'niit', 'fire', 'daf', 'trust', 'reps', '1031', 'cost-seg', 'married'],
    blurb: '高收入 · 多税种叠加 · 每个决定都是几万块',
    scenarios: [
      { tag: 'HENRY 双码农', desc: '$250K-$500K · 撞 NIIT 3.8% · Mega Backdoor 核心' },
      { tag: '双医生夫妻', desc: '$500K-$1M · QBI phase-out · SALT cap phase-out 区' },
      { tag: 'FIRE 准退休', desc: '40 岁想退 · Roth Conversion Ladder · 0% LT 档' },
      { tag: 'Founder Exit', desc: 'QSBS §1202 免税 $10M · 1031 / DAF / 家族信托' },
      { tag: 'C-level / VP', desc: 'ISO 行权 AMT · RSU vest 大税 · 股票集中持仓' },
    ],
    detail: {
      pain: 'AMT · NIIT 3.8% · Phase-out · 收入每破档都多扣',
      traits: '收入 $400K – $2M+ · C-level / 医生 / 律师 / Founder · 综合多类型',
      typical: 'NYC C-level · 波士顿 MD · 湾区双 VP · Founder exit · 家族办公',
      mainOpps: 'QSBS §1202 · Mega Backdoor · PTE · DAF · Cost Seg · 1031',
    },
    accent: '#6B7F6B',
    tint: '#E8ECE6',
    pattern: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='8'><path d='M0 0 L16 0 M0 4 L16 4 M0 8 L16 8 M8 0 L8 4 M0 4 L0 8 M16 4 L16 8' stroke='%236B7F6B' stroke-width='0.4' opacity='0.35' fill='none'/></svg>",
    personas: [
      {
        // v96: CT · 格林威治对冲基金双薪 · CT 6.99% 顶档 + 跨州去 NY 上班
        id: 'ctGreenwichCouple',
        tags: ['married', 'ultra-rich', 'high-income', 'henry', 'multi-state', 'w2', 'rsu', 'salt', 'niit'],
        taxDesc: 'CT 格林威治双高管 · NY 上班 · SALT $40K 爆 phase-out · PTE 必做',
        title: 'CT 对冲基金夫妻 · Greenwich',
        subtitle: 'MFJ · 通勤 NYC · 一套 $3M 自住',
        hook: 'CT 6.99% + 跨州 NY + SALT phase-out',
        inputs: {
          filingStatus: 'MFJ',
          state: 'CT', city: '', workState: 'NY',
          w2: 450000, spouseW2: 380000,
          inc1099: 0, expense1099: 0,
          k401: 0, hdhp: false, hsa: 0,
          children: 2,
          properties: [
            { id: 1, type: 'primary', state: 'CT', propertyTax: 32000, mortInt: 45000 },
          ],
          charity: 15000, medical: 6000,
          megaBackdoor: false, commuterBenefit: false, dcfsa: false,
        },
      },
      {
        id: 'henryCoupleNYC',
        tags: ['married', 'henry', 'high-income', 'nyc', 'w2', 'rsu', 'iso', 'amt', 'mega-backdoor', 'backdoor-roth', 'salt', 'niit'],
        taxDesc: 'HENRY MFJ · 双 RSU · 撞 NIIT 3.8% · Mega Backdoor 必做',
        title: 'HENRY 双高管 · NYC',
        subtitle: 'MFJ · 租高档楼 · 1 娃',
        hook: 'Mega Backdoor $50K 空间',
        inputs: {
          filingStatus: 'MFJ',
          state: 'NY', city: 'nyc', workState: '',
          w2: 280000, spouseW2: 200000,
          inc1099: 0, expense1099: 0,
          k401: 0, hdhp: false, hsa: 0,
          children: 1,
          properties: [],
          charity: 5000, medical: 4000,
          megaBackdoor: false, commuterBenefit: false, dcfsa: false,
        },
      },
      {
        id: 'doctorCouple',
        tags: ['married', 'high-income', 'w2', 'qbi', 'backdoor-roth', 'salt'],
        taxDesc: '双医生 · QBI phase-out · SALT 满 · Backdoor Roth 双倍',
        title: '双医生家庭 · 波士顿',
        subtitle: 'MFJ · 2 娃 · 自住大房',
        hook: 'Backdoor + S-Corp 副业',
        inputs: {
          filingStatus: 'MFJ',
          state: 'MA', city: '', workState: '',
          w2: 320000, spouseW2: 280000,
          inc1099: 40000, expense1099: 3000,
          k401: 0, hdhp: true, hsa: 0,
          children: 2,
          properties: [
            { id: 1, type: 'primary', state: 'MA', propertyTax: 14000, mortInt: 22000 },
          ],
          charity: 8000, medical: 5000,
          megaBackdoor: false, commuterBenefit: false, dcfsa: false,
        },
      },
      {
        id: 'firePrepDink',
        tags: ['married', 'fire', 'passive', 'w2', 'mega-backdoor'],
        taxDesc: 'FIRE 准退休 · Roth Conversion Ladder · 0% LT 档规划',
        title: 'FIRE 准备期 · 丁克',
        subtitle: 'MFJ 丁克 · WA 自住',
        hook: 'Roth Conversion Ladder',
        inputs: {
          filingStatus: 'MFJ',
          state: 'WA', city: '', workState: '',
          w2: 220000, spouseW2: 180000,
          inc1099: 0, expense1099: 0,
          k401: 0, hdhp: true, hsa: 0,
          children: 0,
          interest: 3500,        // HYSA 利息
          dividends: 12000,      // 股息
          qualifiedDividends: 10200,  // 85% 为 qualified
          capGainsLT: 25000,     // 长期资本利得
          capGainsST: 0,
          properties: [
            { id: 1, type: 'primary', state: 'WA', propertyTax: 8000, mortInt: 14000 },
          ],
          charity: 5000, medical: 2500,
          megaBackdoor: false, commuterBenefit: false, dcfsa: false,
        },
      },
      {
        id: 'airbnbHostNYC',
        tags: ['rental', 'house', 'nyc', 's-corp', '1099', 'passive'],
        taxDesc: 'NYC Airbnb 房东 · < 7 天走 Sch C · Cost Seg 加速折旧',
        title: '短租房东 · Airbnb NYC',
        subtitle: 'Single · W2 + 短租副业',
        hook: 'Schedule C vs E · 7天规则',
        inputs: {
          filingStatus: 'Single',
          state: 'NY', city: 'nyc', workState: '',
          w2: 90000, spouseW2: 0,
          inc1099: 0, expense1099: 0,
          k401: 0, hdhp: false, hsa: 0,
          children: 0,
          properties: [
            { id: 1, type: 'primary', state: 'NY', propertyTax: 0, mortInt: 0 },
            {
              id: 2, type: 'rental', state: 'NY',
              propertyTax: 7200, mortInt: 11500,
              rentalIncome: 58000, rentalExpenses: 9500,
              depreciation: 11000,
              shortTerm: true,  // 平均住客 < 7 天 → Schedule C 趋势
            },
          ],
          charity: 500, medical: 1000,
          megaBackdoor: false, commuterBenefit: false, dcfsa: false,
        },
      },
      {
        id: 'sCorpOwnerSF',
        tags: ['s-corp', 'high-income', 'ca', 'qbi', 'mega-backdoor', 'ca-sdi', 'ca-nonconform'],
        taxDesc: 'SF 老板 S-Corp · CA QBI 不 conform · PTE 核心（CA 2026+ 延期）· 合理工资',
        title: 'S-Corp 顾问 · 旧金山',
        subtitle: 'Single · $200K 净利',
        hook: '工资 vs 分红 · 省 SE Tax',
        inputs: {
          filingStatus: 'Single',
          state: 'CA', city: '', workState: '',
          w2: 80000,  // 已从 S-Corp 发的 "reasonable salary"
          spouseW2: 0,
          inc1099: 120000,  // 剩余通过 S-Corp 分红，但模型按 1099 近似
          expense1099: 15000,
          k401: 0, hdhp: true, hsa: 0,
          children: 0,
          properties: [
            { id: 1, type: 'primary', state: 'CA', propertyTax: 12000, mortInt: 28000 },
          ],
          charity: 3000, medical: 0,
          megaBackdoor: false, commuterBenefit: false, dcfsa: false,
        },
      },
      {
        id: 'rentalEmpire',
        tags: ['rental', 'house', 'reps', '1031', 'cost-seg', 'passive', 'high-income'],
        taxDesc: '房地产投资者 · REPS 身份 · 折旧抵工资 · 1031 延税',
        title: '多房地主 · 5 州 LLC',
        subtitle: 'MFJ · 4 套出租',
        hook: 'Cost Seg + Passive Loss + LLC',
        inputs: {
          filingStatus: 'MFJ',
          state: 'TX', city: '', workState: '',  // 住德州 0 州税
          w2: 130000, spouseW2: 95000,  // 一方有 W2 收入
          inc1099: 0, expense1099: 0,
          k401: 0, hdhp: true, hsa: 0,
          children: 2,
          properties: [
            { id: 1, type: 'primary', state: 'TX', propertyTax: 11000, mortInt: 22000 },
            { id: 2, type: 'rental', state: 'PA', propertyTax: 4200, mortInt: 8500, rentalIncome: 22000, rentalExpenses: 4500, depreciation: 8500 },
            { id: 3, type: 'rental', state: 'OH', propertyTax: 3000, mortInt: 7000, rentalIncome: 18000, rentalExpenses: 3800, depreciation: 7000 },
            { id: 4, type: 'rental', state: 'IN', propertyTax: 2500, mortInt: 6500, rentalIncome: 17500, rentalExpenses: 3500, depreciation: 6800 },
            { id: 5, type: 'rental', state: 'TN', propertyTax: 3800, mortInt: 8200, rentalIncome: 20000, rentalExpenses: 4200, depreciation: 7800 },
          ],
          charity: 4000, medical: 1200,
          megaBackdoor: false, commuterBenefit: false, dcfsa: false,
        },
      },
      {
        id: 'superRichLandlord',
        tags: ['rental', 'ultra-rich', 'reps', '1031', 'cost-seg', 'trust', 'daf'],
        taxDesc: '超富房东 · Cost Seg 一次性 30% 折旧 · 1031 + 家族信托',
        title: '超富地主 · 佛州',
        subtitle: 'MFJ · 0 州税 · 5 套出租',
        hook: 'Depreciation + QBI + 1031',
        inputs: {
          filingStatus: 'MFJ',
          state: 'FL', city: '', workState: '',
          w2: 0, spouseW2: 0,
          inc1099: 450000, expense1099: 50000,
          k401: 0, hdhp: false, hsa: 0,
          children: 1,
          properties: [
            { id: 1, type: 'primary', state: 'FL', propertyTax: 18000, mortInt: 25000 },
            { id: 2, type: 'rental', state: 'FL', propertyTax: 8000, mortInt: 14000, rentalIncome: 48000, rentalExpenses: 6000, depreciation: 12000 },
            { id: 3, type: 'rental', state: 'TX', propertyTax: 9000, mortInt: 14000, rentalIncome: 52000, rentalExpenses: 7000, depreciation: 14000 },
            { id: 4, type: 'rental', state: 'AZ', propertyTax: 5000, mortInt: 11000, rentalIncome: 38000, rentalExpenses: 5000, depreciation: 10000 },
            { id: 5, type: 'rental', state: 'NV', propertyTax: 4000, mortInt: 10000, rentalIncome: 36000, rentalExpenses: 5000, depreciation: 9000 },
          ],
          charity: 15000, medical: 5000,
          megaBackdoor: false, commuterBenefit: false, dcfsa: false,
        },
      },
      {
        id: 'techStockRich',
        tags: ['rsu', 'iso', 'qsbs', 'amt', 'henry', 'high-income', 'daf', 'ca-nonconform'],
        taxDesc: '科技股富翁 · QSBS 联邦免 $10M 但 CA 不 conform 征 13.3% · DAF 捐股票',
        title: '湾区 Tech 股富 · SF',
        subtitle: 'Single · 大厂 L6 · RSU 暴增',
        hook: 'AMT + NIIT + Mega Backdoor',
        inputs: {
          filingStatus: 'Single',
          state: 'CA', city: '', workState: '',
          w2: 450000, spouseW2: 0,
          inc1099: 0, expense1099: 0,
          k401: 0, hdhp: false, hsa: 0,
          children: 0,
          properties: [],
          charity: 3000, medical: 2500,
          megaBackdoor: false, commuterBenefit: false, dcfsa: false,
          capGainsLT: 80000, qualifiedDividends: 6000,
        },
      },
      {
        id: 'fireSingleCO',
        tags: ['single', 'fire', 'passive', 'w2'],
        taxDesc: 'CO 单身 FIRE · 35 岁退 · Roth Ladder · 低税档取出',
        title: 'FIRE 单身准备 · 丹佛',
        subtitle: 'Single · 高存款率 · 准备退',
        hook: 'Roth Ladder + 0% LT 利得档',
        inputs: {
          filingStatus: 'Single',
          state: 'CO', city: '', workState: '',
          w2: 180000, spouseW2: 0,
          inc1099: 0, expense1099: 0,
          k401: 0, hdhp: false, hsa: 0,
          children: 0,
          properties: [],
          charity: 2000, medical: 1500,
          megaBackdoor: false, commuterBenefit: false, dcfsa: false,
          interest: 5000, dividends: 15000, qualifiedDividends: 12000,
        },
      },
      {
        id: 'dualLawyersDC',
        tags: ['married', 'high-income', 'w2', 'salt', 'backdoor-roth'],
        taxDesc: '双律师 MFJ · DC 高收入 · SALT 满 · Backdoor Roth',
        title: '双律师 · 华盛顿 DC',
        subtitle: 'MFJ · BigLaw 双 Partner',
        hook: 'SSTB phase-out + PTE Tax',
        inputs: {
          filingStatus: 'MFJ',
          state: 'DC', city: '', workState: '',
          w2: 350000, spouseW2: 380000,
          inc1099: 0, expense1099: 0,
          k401: 0, hdhp: false, hsa: 0,
          children: 2,
          properties: [],
          charity: 8000, medical: 3500,
          megaBackdoor: false, commuterBenefit: false, dcfsa: false,
          interest: 8000, dividends: 18000, qualifiedDividends: 15000,
        },
      },
      // v66: 超高净值 6 人 · 综合收入 $500K-$2M+
      {
        id: 'techCxoNYC',
        tags: ['high-income', 'rsu', 'iso', 'amt', 'henry', 'nyc', 'mega-backdoor', 'ultra-rich'],
        taxDesc: 'NYC C-level · ISO 行权 AMT · RSU vest 大税 · Mega Backdoor',
        title: 'Tech C-level · NYC',
        subtitle: 'Single · $700K · RSU + 期权',
        hook: 'AMT + NIIT + Mega Backdoor + QSBS',
        inputs: {
          filingStatus: 'Single',
          state: 'NY', city: 'nyc', workState: '',
          w2: 420000, spouseW2: 0,
          inc1099: 0, expense1099: 0,
          k401: 0, hdhp: false, hsa: 0,
          children: 0,
          properties: [
            { id: 1, type: 'primary', state: 'NY', propertyTax: 16000, mortInt: 22000 },
          ],
          charity: 8000, medical: 3000,
          megaBackdoor: false, commuterBenefit: false, dcfsa: false,
          capGainsLT: 250000, capGainsST: 20000,
          qualifiedDividends: 12000, dividends: 15000, interest: 8000,
        },
      },
      {
        id: 'ibMDBoston',
        tags: ['high-income', 'henry', 'w2', 'niit', 'amt'],
        taxDesc: 'Boston IB MD · 奖金 $500K+ · NIIT · AMT · Backdoor Roth',
        title: '投行 MD · 波士顿',
        subtitle: 'Single · $1M 现金年薪',
        hook: 'PTE + DAF + Mega Backdoor + 1031',
        inputs: {
          filingStatus: 'Single',
          state: 'MA', city: '', workState: '',
          w2: 650000, spouseW2: 0,
          inc1099: 0, expense1099: 0,
          k401: 0, hdhp: false, hsa: 0,
          children: 0,
          properties: [
            { id: 1, type: 'primary', state: 'MA', propertyTax: 22000, mortInt: 30000 },
            { id: 2, type: 'rental', state: 'FL', propertyTax: 6000, mortInt: 8000, rentalIncome: 40000, rentalExpenses: 5000, depreciation: 10000 },
          ],
          charity: 20000, medical: 4000,
          megaBackdoor: false, commuterBenefit: false, dcfsa: false,
          capGainsLT: 180000, capGainsST: 15000,
          qualifiedDividends: 45000, dividends: 55000, interest: 25000,
        },
      },
      {
        id: 'founderExit',
        tags: ['ultra-rich', 'qsbs', 'high-income', 'daf', 'trust', 'ca-nonconform'],
        taxDesc: 'Founder Exit · QSBS 联邦免 $10M · CA 不免 → Exit 前搬州 · DAF + 信托',
        title: '初创 Founder Exit · Austin',
        subtitle: 'Single · $2M+ 股权套现年',
        hook: 'QSBS §1202 免税 + Charitable LLC',
        inputs: {
          filingStatus: 'Single',
          state: 'TX', city: '', workState: '',
          w2: 250000, spouseW2: 0,
          inc1099: 100000, expense1099: 15000,
          k401: 0, hdhp: false, hsa: 0,
          children: 0,
          properties: [
            { id: 1, type: 'primary', state: 'TX', propertyTax: 20000, mortInt: 18000 },
          ],
          charity: 50000, medical: 3500,
          megaBackdoor: false, commuterBenefit: false, dcfsa: false,
          capGainsLT: 1800000, capGainsST: 0,
          qualifiedDividends: 8000, dividends: 10000, interest: 20000,
        },
      },
      {
        id: 'dualVPTech',
        tags: ['married', 'high-income', 'henry', 'rsu', 'iso', 'amt', 'mega-backdoor', 'ca-sdi', 'ca-mht', 'ca-nonconform'],
        taxDesc: '双 VP 湾区 · 综合 $1M+ 触发 CA MHT 1% · ISO/RSU 轮流 · Mega Backdoor',
        title: '夫妻双 VP · Tech',
        subtitle: 'MFJ · $1.2M · 双 RSU 爆',
        hook: '双 Mega Backdoor + DAF + 529',
        inputs: {
          filingStatus: 'MFJ',
          state: 'CA', city: '', workState: '',
          w2: 480000, spouseW2: 420000,
          inc1099: 0, expense1099: 0,
          k401: 0, hdhp: false, hsa: 0,
          children: 2,
          properties: [
            { id: 1, type: 'primary', state: 'CA', propertyTax: 24000, mortInt: 32000 },
          ],
          charity: 25000, medical: 5000,
          megaBackdoor: false, commuterBenefit: false, dcfsa: false,
          capGainsLT: 200000, qualifiedDividends: 18000, dividends: 22000, interest: 12000,
        },
      },
      {
        id: 'docCoupleClinic',
        tags: ['married', 'high-income', 's-corp', 'qbi', 'backdoor-roth'],
        taxDesc: '双医生开诊所 · S-Corp · QBI · 401(k) Profit Sharing',
        title: '医生夫妻 + 诊所',
        subtitle: 'MFJ · $1.5M · S-Corp 诊所',
        hook: 'PTE Tax + Reasonable Comp + Solo(k)',
        inputs: {
          filingStatus: 'MFJ',
          state: 'NJ', city: '', workState: '',
          w2: 500000, spouseW2: 320000,
          inc1099: 450000, expense1099: 80000,
          k401: 0, hdhp: false, hsa: 0,
          children: 2,
          properties: [
            { id: 1, type: 'primary', state: 'NJ', propertyTax: 28000, mortInt: 22000 },
          ],
          charity: 30000, medical: 3500,
          megaBackdoor: false, commuterBenefit: false, dcfsa: false,
          qualifiedDividends: 25000, dividends: 30000, interest: 18000,
          capGainsLT: 100000,
        },
      },
      {
        id: 'familyOfficeMFJ',
        tags: ['ultra-rich', 'trust', 'daf', 'high-income', 'passive'],
        taxDesc: '家族办公室 MFJ · 信托 + DAF + 被动投资',
        title: 'RE + 家族 LLC · CT',
        subtitle: 'MFJ · $2.5M · 15 套房+合伙',
        hook: 'Cost Seg + Passive RE Pro + K-1',
        inputs: {
          filingStatus: 'MFJ',
          state: 'CT', city: '', workState: '',
          w2: 0, spouseW2: 180000,
          inc1099: 600000, expense1099: 80000,
          k401: 0, hdhp: false, hsa: 0,
          children: 3,
          properties: [
            { id: 1, type: 'primary', state: 'CT', propertyTax: 35000, mortInt: 0 },
            { id: 2, type: 'rental', state: 'NY', propertyTax: 18000, mortInt: 15000, rentalIncome: 85000, rentalExpenses: 12000, depreciation: 22000 },
            { id: 3, type: 'rental', state: 'NY', propertyTax: 16000, mortInt: 12000, rentalIncome: 72000, rentalExpenses: 10000, depreciation: 18000 },
            { id: 4, type: 'rental', state: 'FL', propertyTax: 8000, mortInt: 10000, rentalIncome: 54000, rentalExpenses: 7000, depreciation: 14000 },
            { id: 5, type: 'rental', state: 'TX', propertyTax: 10000, mortInt: 11000, rentalIncome: 60000, rentalExpenses: 8000, depreciation: 16000 },
            { id: 6, type: 'rental', state: 'TN', propertyTax: 5000, mortInt: 7000, rentalIncome: 42000, rentalExpenses: 6000, depreciation: 10000 },
          ],
          charity: 80000, medical: 6000,
          megaBackdoor: false, commuterBenefit: false, dcfsa: false,
          capGainsLT: 400000, qualifiedDividends: 55000, dividends: 70000, interest: 35000,
        },
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  // VI. 投资 / 混合收入 · 房地产 portfolio · LLC 合伙
  // ═══════════════════════════════════════════════════════════
  {
    group: '投资 · 混合',
    groupTag: 'VI',
    groupTags: ['rental', 'passive', 'house', 'llc', '1099', 'w2', 'fire', 'crypto', 'qbi', 'reps'],
    blurb: '收入类型复杂 · K-1 · Schedule E · 多种 1099 叠加',
    scenarios: [
      { tag: '不上班', desc: '靠股息 / 租金 / 资本利得 · 有 0% LT 档空间' },
      { tag: 'W2 + 1099 + 房', desc: '混合收入 · 3 张表都要填 · REPS 身份关键' },
      { tag: 'LLC 合伙', desc: 'K-1 收入 · 可能 UBTI · 注意 basis tracking' },
      { tag: '房东 / 房产投资', desc: 'Sch E + Cost Seg · 1031 延税换房 · 折旧抵工资' },
    ],
    detail: {
      pain: '收入类型复杂 · K-1 Schedule E Sch B 全都要填',
      traits: '被动收入为主 · 投资房 / LLC 合伙 / 退休股息 · 5+ 类收入',
      typical: '投资房东半退休 · W2+1099+房产 全栈 · LLC 合伙 portfolio',
      mainOpps: 'Cost Segregation · 0% LT 档 · Passive Loss · QBI 租金',
    },
    accent: '#8B6B4A',
    tint: '#F0E9DC',
    pattern: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='18' height='18'><path d='M9 1 L17 9 L9 17 L1 9 Z' stroke='%238B6B4A' stroke-width='0.4' fill='none' opacity='0.3'/></svg>",
    personas: [
      {
        id: 'retiredLandlord',
        tags: ['rental', 'passive', 'fire', 'reps'],
        taxDesc: '不上班 · 靠租金 + 股息 · 0% LT 档空间 · REPS 可能',
        title: '投资房东 · 不上班',
        subtitle: 'MFJ 半退休 · 4 套出租 · 股息',
        hook: 'Schedule E + QBI + 0% LT 档',
        inputs: {
          filingStatus: 'MFJ',
          state: 'FL', city: '', workState: '',
          w2: 0, spouseW2: 0,
          inc1099: 0, expense1099: 0,
          k401: 0, hdhp: false, hsa: 0,
          children: 0,
          // 投资收入
          interest: 8500,
          dividends: 28000,
          qualifiedDividends: 24000,    // 85% qualified
          capGainsLT: 45000,            // 长期卖出资本利得
          capGainsST: 0,
          properties: [
            { id: 1, type: 'primary', state: 'FL', propertyTax: 11000, mortInt: 0 },  // 已还清
            { id: 2, type: 'rental', state: 'FL', propertyTax: 5500, mortInt: 0,  rentalIncome: 32000, rentalExpenses: 5500, depreciation: 8500 },
            { id: 3, type: 'rental', state: 'GA', propertyTax: 4200, mortInt: 7500, rentalIncome: 26000, rentalExpenses: 4500, depreciation: 7500 },
            { id: 4, type: 'rental', state: 'TN', propertyTax: 3800, mortInt: 6500, rentalIncome: 24000, rentalExpenses: 4200, depreciation: 7000 },
            { id: 5, type: 'rental', state: 'AL', propertyTax: 2500, mortInt: 5200, rentalIncome: 18000, rentalExpenses: 3500, depreciation: 5500 },
          ],
          charity: 3000, medical: 2500,
          megaBackdoor: false, commuterBenefit: false, dcfsa: false,
        },
      },
      {
        id: 'mixedIncomeNJ',
        tags: ['married', 'w2', '1099', 'rental', 'nj', 'qbi'],
        taxDesc: 'NJ 混合 · W2 + 1099 + 房 · Sch C + Sch E 都要填',
        title: 'W2+1099+投资房 · 全栈',
        subtitle: 'MFJ · 薪水 + 副业 + 出租 + 自住',
        hook: '最复杂税务：5 类收入 · Sch A/C/E',
        inputs: {
          filingStatus: 'MFJ',
          state: 'NJ', city: '', workState: 'NY',  // NJ 住 NY 上班
          w2: 165000, spouseW2: 95000,
          inc1099: 48000, expense1099: 8500,
          k401: 0, hdhp: true, hsa: 0,
          children: 1,
          interest: 2200,
          dividends: 5800,
          qualifiedDividends: 4900,
          capGainsLT: 8000,
          capGainsST: 0,
          properties: [
            { id: 1, type: 'primary', state: 'NJ', propertyTax: 14500, mortInt: 18500 },
            { id: 2, type: 'rental', state: 'PA', propertyTax: 4500, mortInt: 8500, rentalIncome: 24000, rentalExpenses: 4800, depreciation: 8000 },
          ],
          charity: 2200, medical: 2800,
          megaBackdoor: false, commuterBenefit: false, dcfsa: false,
        },
      },
      {
        id: 'llcPartnerPortfolio',
        tags: ['llc', 'passive', '1099', 'qbi'],
        taxDesc: 'LLC 合伙 · K-1 收入 · 注意 basis · UBTI 风险',
        title: 'LLC 合伙 · 房产 portfolio',
        subtitle: 'MFJ · K-1 多房合伙 · GP+LP',
        hook: 'K-1 收入 · Depreciation + Carried Interest',
        inputs: {
          filingStatus: 'MFJ',
          state: 'NY', city: '', workState: '',
          w2: 140000, spouseW2: 0,
          inc1099: 85000, expense1099: 12000,  // K-1 收入近似为 1099 (合伙 GP 分成)
          k401: 0, hdhp: false, hsa: 0,
          children: 2,
          interest: 4200,
          dividends: 6500,
          qualifiedDividends: 5500,
          capGainsLT: 0,
          capGainsST: 0,
          properties: [
            { id: 1, type: 'primary', state: 'NY', propertyTax: 12000, mortInt: 17000 },
            // 3 套合伙持有的出租房：按持股比例摊分，这里按净额估算
            { id: 2, type: 'rental', state: 'FL', propertyTax: 3200, mortInt: 6500, rentalIncome: 18000, rentalExpenses: 3500, depreciation: 9500 },
            { id: 3, type: 'rental', state: 'TX', propertyTax: 2800, mortInt: 5800, rentalIncome: 15000, rentalExpenses: 3200, depreciation: 8000 },
            { id: 4, type: 'rental', state: 'AZ', propertyTax: 2200, mortInt: 4800, rentalIncome: 13500, rentalExpenses: 2800, depreciation: 6500 },
          ],
          charity: 4500, medical: 3500,
          megaBackdoor: false, commuterBenefit: false, dcfsa: false,
        },
      },
      {
        id: 'retiredLandlordSolo',
        tags: ['single', 'rental', 'passive', 'fire'],
        taxDesc: '单身退休房东 · 0% LT 档 · Roth Conversion',
        title: '单身房东退休 · FL',
        subtitle: 'Single · 搬 FL 收租 · 60 岁',
        hook: '0 州税 + Passive 损失 + SS',
        inputs: {
          filingStatus: 'Single',
          state: 'FL', city: '', workState: '',
          w2: 0, spouseW2: 0,
          inc1099: 0, expense1099: 0,
          k401: 0, hdhp: false, hsa: 0,
          children: 0,
          properties: [
            { id: 1, type: 'primary', state: 'FL', propertyTax: 5000, mortInt: 0 },
            { id: 2, type: 'rental', state: 'FL', purchasePrice: 280000, buildingValue: 220000, yearsHeld: 15, monthlyRent: 2800, propertyTax: 4200, mortInt: 0, otherExpense: 5000 },
            { id: 3, type: 'rental', state: 'FL', purchasePrice: 320000, buildingValue: 250000, yearsHeld: 8, monthlyRent: 3200, propertyTax: 4800, mortInt: 4000, otherExpense: 6000 },
          ],
          charity: 1000, medical: 4500,
          megaBackdoor: false, commuterBenefit: false, dcfsa: false,
          interest: 6000, dividends: 22000, qualifiedDividends: 18000,
        },
      },
      {
        id: 'fireCryptoSingle',
        tags: ['single', 'crypto', 'fire', 'passive'],
        taxDesc: '币圈 FIRE · 币币交换算事件 · 长持 1 年 0% 档',
        title: 'Crypto FIRE 单身 · WA',
        subtitle: 'Single · 早期 BTC 持仓',
        hook: 'LT 0% 档 + Tax-Loss Harvest',
        inputs: {
          filingStatus: 'Single',
          state: 'WA', city: '', workState: '',
          w2: 0, spouseW2: 0,
          inc1099: 0, expense1099: 0,
          k401: 0, hdhp: false, hsa: 0,
          children: 0,
          properties: [],
          charity: 800, medical: 1200,
          megaBackdoor: false, commuterBenefit: false, dcfsa: false,
          interest: 3000, dividends: 5000, capGainsLT: 95000, capGainsST: 8000, qualifiedDividends: 4000,
        },
      },
    ],
  },
  // ═══════════════════════════════════════════════════════════
  // VI. 跨境 · 加→美 （加拿大身份 / 资产 / 家人 · 在美报税）
  //  · 放在 US PERSONA_GROUPS 因为这些人的主报税国是美国
  //  · 核心坑：TFSA 到美国全征税 · RRSP 要 8833 Treaty 选择 · FBAR
  // ═══════════════════════════════════════════════════════════
  {
    group: '跨境 · 加→美',
    groupTag: 'VI',
    groupTags: ['cross-border', 'ca-us', 'treaty', 'fbar', 'rrsp', 'tfsa', 'form-8938', 'form-8833', 'visa-tn', 'visa-h1b'],
    blurb: '加拿大过来的 · 报税最复杂也最有坑',
    scenarios: [
      { tag: 'TN 工程师', desc: '加拿大 PR · 美国 W2 · RRSP 保留' },
      { tag: 'PR 首年 · 温→西雅图', desc: '刚搬来 · 加拿大资产 · Exit Tax' },
      { tag: '跨境通勤', desc: '住 Windsor 每天过桥 Detroit 上班' },
      { tag: '在美加籍 · 有 TFSA', desc: 'TFSA 美国全征税 · Form 3520 警告' },
    ],
    detail: {
      pain: 'TFSA 到美国不免税 · RRSP 不 treaty 当年全算收入 · FBAR 10K 门槛',
      traits: '加拿大 PR / 公民 · TN / H1B / 绿卡 · 西雅图 / 旧金山 / 纽约 / 底特律',
      typical: '科技公司从多伦多/温哥华调美国 · PR 转美国工作 · 边境城市通勤',
      mainOpps: 'Form 8833 Treaty election · RRSP 延税 · 避开 TFSA · FBAR 合规',
    },
    accent: '#B48F5F',
    tint: '#F3EEE3',
    pattern: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='22' height='22'><path d='M0 11L22 11' stroke='%23B48F5F' stroke-width='0.4' opacity='0.4'/><path d='M11 0L11 22' stroke='%23B48F5F' stroke-width='0.4' opacity='0.4'/></svg>",
    personas: [
      {
        id: 'tnEngineerSeattle',
        tags: ['visa-tn', 'single', 'cross-border', 'rrsp', 'tfsa', 'fbar', 'w2'],
        taxDesc: 'TN 签证 · Resident Alien · 仍持有 RRSP/TFSA · 第一次 FBAR',
        title: 'TN 工程师 · 西雅图',
        subtitle: 'TN 签证 · 西雅图 · 留 RRSP 在家',
        hook: 'RRSP 延税 · TFSA 要报 · FBAR 门槛 $10K',
        inputs: {
          filingStatus: 'Single',
          state: 'WA', city: '', workState: '',
          w2: 165000, spouseW2: 0,
          inc1099: 0, expense1099: 0,
          k401: 8000, hdhp: false, hsa: 0,
          children: 0,
          properties: [],
          charity: 500, medical: 0,
          megaBackdoor: false, commuterBenefit: false, dcfsa: false,
          interest: 500, dividends: 0, capGainsLT: 0, capGainsST: 0,
        },
      },
      {
        id: 'prFirstYearSF',
        tags: ['green-card', 'married', 'cross-border', 'dual-status', 'rrsp', 'exit-tax', 'first-year'],
        taxDesc: '加拿大 PR 放弃 · 美国绿卡 · 首年 dual-status · CA departure tax',
        title: '加→美首年 · 旧金山',
        subtitle: 'MFJ · 刚从温哥华搬来 · 双薪',
        hook: 'Exit Tax · Dual-Status 报税 · RRSP 保留',
        inputs: {
          filingStatus: 'MFJ',
          state: 'CA', city: '', workState: '',
          w2: 180000, spouseW2: 120000,
          inc1099: 0, expense1099: 0,
          k401: 10000, hdhp: false, hsa: 0,
          children: 0,
          properties: [],
          charity: 1000, medical: 800,
          megaBackdoor: false, commuterBenefit: false, dcfsa: false,
          interest: 2000, dividends: 1500, capGainsLT: 0, capGainsST: 0,
        },
      },
      {
        id: 'crossBorderCommuter',
        tags: ['single', 'cross-border', 'commuter', 'treaty', 'nr-resident'],
        taxDesc: '住加拿大 · 美国 W2 · Treaty Article XV · 双方报税抵免',
        title: '跨境通勤 · Windsor→Detroit',
        subtitle: 'Single · 住 Ontario 每天过桥 MI 上班',
        hook: 'Article XV Treaty · 避免双重征税 · 两边报',
        inputs: {
          filingStatus: 'Single',
          state: 'MI', city: '', workState: '',  // 工作州 MI · 居住加拿大简化成 MI 0% 州税 workaround
          w2: 85000, spouseW2: 0,
          inc1099: 0, expense1099: 0,
          k401: 5000, hdhp: false, hsa: 0,
          children: 0,
          properties: [],
          charity: 300, medical: 0,
          megaBackdoor: false, commuterBenefit: false, dcfsa: false,
          interest: 800, dividends: 0, capGainsLT: 0, capGainsST: 0,
        },
      },
    ],
  },
];

// 向后兼容：PERSONAS 扁平化
const PERSONAS = PERSONA_GROUPS.flatMap(g => g.personas);

// ═══════════════════════════════════════════════════════════
// v101: 加拿大 Personas · 华人常见场景
// ═══════════════════════════════════════════════════════════
const PERSONA_GROUPS_CA = [
  {
    group: '初入职场',
    groupTag: 'I',
    groupTags: ['single', 'married', 't4', 'student', 'newcomer'],
    blurb: '刚毕业 / 刚登陆 / H1-LMIA · 税务初入门',
    scenarios: [
      { tag: '应届码农', desc: '多伦多 / 温哥华 tech · T4 $75-90K · 单身租房' },
      { tag: '新 PR 第一年', desc: '技术移民登陆 · Transitional Resident · 海外资产 FMV' },
      { tag: '留学生打工', desc: 'PGWP + T4 · 建立 residency · TFSA 立刻可开' },
      { tag: '情侣合租', desc: '未婚双薪 · 各自独立报 · 可互转 credit' },
    ],
    detail: {
      pain: '搞不清 TFSA / RRSP / FHSA 区别',
      traits: '单身 $60K-$100K · 租房为主 · 第一次报 T1',
      typical: '多伦多码农 · 温哥华设计师 · 蒙特利尔 PGWP',
      mainOpps: '立开 FHSA · TFSA 存起来 · RRSP 可等明年',
    },
    accent: '#4A5E6E',
    tint: '#E8ECEE',
    personas: [
      {
        id: 'ca_torontoJrDev',
        tags: ['single', 't4', 'fhsa', 'starter'],
        taxDesc: '多伦多应届码农 · T4 $85K · 租房 · 还没存 RRSP · 该立开 FHSA',
        title: '应届码农 · 多伦多',
        subtitle: 'Single · $85K · 租房 · 准备买房',
        hook: 'FHSA + TFSA 同时开',
        inputs: {
          filingStatus: 'Single',
          state: 'ON', city: 'toronto', workState: '',
          w2: 85000, spouseW2: 0,
          inc1099: 0, expense1099: 0,
          k401: 0, hdhp: false, hsa: 0,
          children: 0,
          properties: [],
          charity: 200, medical: 0,
        },
      },
      {
        id: 'ca_vancouverDesigner',
        tags: ['single', 't4', 'starter'],
        taxDesc: '温哥华设计师 · T4 $65K · BC 省税 · TFSA 先存',
        title: '设计师 · 温哥华',
        subtitle: 'Single · $65K · 起步 · 存 TFSA',
        hook: 'TFSA 长期 ETF',
        inputs: {
          filingStatus: 'Single',
          state: 'BC', city: 'vancouver', workState: '',
          w2: 65000, spouseW2: 0,
          inc1099: 0, expense1099: 0,
          k401: 0, hdhp: false, hsa: 0,
          children: 0,
          properties: [],
          charity: 150, medical: 0,
        },
      },
      {
        id: 'ca_newImmigrantPR',
        tags: ['newcomer', 'pr', 't4', 'cross-border'],
        taxDesc: '新 PR 第一年 · 登陆日 FMV · T1135 要报 · 中国账户和国内房',
        title: '新 PR 第一年 · 多伦多',
        subtitle: 'Single · 技术移民 · 国内有房和账户',
        hook: 'Deemed Acquisition + T1135',
        inputs: {
          filingStatus: 'Single',
          state: 'ON', city: 'toronto', workState: '',
          w2: 95000, spouseW2: 0,
          inc1099: 0, expense1099: 0,
          k401: 0, hdhp: false, hsa: 0,
          children: 0,
          properties: [],
          charity: 500, medical: 0,
          interest: 1500, dividends: 0,
        },
      },
      {
        id: 'ca_calgaryOilRookie',
        tags: ['single', 't4', 'starter', 'oil-gas', 'ab'],
        taxDesc: '阿省石油新人 · T4 $90K · AB 低税率 · BPA $21,885',
        title: '石油新人 · 卡尔加里',
        subtitle: 'Single · 24 岁 · $90K · 租 downtown',
        hook: 'AB 最低顶档 15% + BPA 最高',
        inputs: {
          filingStatus: 'Single',
          state: 'AB', city: 'calgary', workState: '',
          w2: 90000, spouseW2: 0,
          inc1099: 0, expense1099: 0,
          k401: 0, hdhp: false, hsa: 0,
          children: 0,
          properties: [],
          charity: 300, medical: 0,
          interest: 2000, dividends: 0,
        },
      },
      {
        id: 'ca_ottawaFedWorker',
        tags: ['single', 't4', 'pension', 'public-sector', 'on'],
        taxDesc: '联邦公务员 · 多伦多东 · Public Service Pension · 稳定福利',
        title: '渥太华公务员',
        subtitle: 'Single · $72K · 联邦 pension 在积累',
        hook: 'DB Pension 减 RRSP 空间 · 但老了有保障',
        inputs: {
          filingStatus: 'Single',
          state: 'ON', city: 'ottawa', workState: '',
          w2: 72000, spouseW2: 0,
          inc1099: 0, expense1099: 0,
          k401: 0, hdhp: false, hsa: 0,
          children: 0,
          properties: [],
          charity: 400, medical: 200,
          interest: 800, dividends: 0,
        },
      },
      {
        id: 'ca_waterlooGrad',
        tags: ['single', 't4', 'student-loan', 'starter', 'on'],
        taxDesc: 'Waterloo 科技毕业生 · T4 $55K · OSAP 学贷 · 起步阶段',
        title: 'Waterloo 毕业生',
        subtitle: 'Single · $55K · OSAP $25K · 新公司',
        hook: '学贷利息抵免 + TFSA 建立习惯',
        inputs: {
          filingStatus: 'Single',
          state: 'ON', city: 'waterloo', workState: '',
          w2: 55000, spouseW2: 0,
          inc1099: 0, expense1099: 0,
          k401: 0, hdhp: false, hsa: 0,
          children: 0,
          properties: [],
          charity: 100, medical: 0,
          interest: 200, dividends: 0,
        },
      },
      {
        id: 'ca_internationalStudentUofT',
        tags: ['single', 't4', 'study-permit', 'low-income', 'student', 'starter', 'on'],
        taxDesc: '国际学生 · 多大 · Study Permit · 校内 TA + 暑假实习 · T2202 学费抵',
        title: '留学生 · 多大',
        subtitle: 'Single · $18K · 学费 credit + GST 退税',
        hook: 'T2202 学费 + 学贷利息 + 低收入 GST 退税',
        inputs: {
          filingStatus: 'Single',
          state: 'ON', city: 'toronto', workState: '',
          w2: 18000, spouseW2: 0,
          inc1099: 0, expense1099: 0,
          k401: 0, hdhp: false, hsa: 0,
          children: 0,
          properties: [],
          charity: 0, medical: 0,
          interest: 100, dividends: 0,
        },
      },
      {
        id: 'ca_pgwpVancouverEngineer',
        tags: ['single', 't4', 'pgwp', 'new-grad', 'ec-pr-pending', 'bc'],
        taxDesc: 'PGWP 毕业工签 · 温哥华科技公司 · T4 $75K · 等 CEC PR · 开始存 RRSP+FHSA',
        title: 'PGWP 工签 · 温哥华',
        subtitle: 'Single · $75K · 毕业 2 年 · 排 PR',
        hook: 'PGWP 等 PR · FHSA 先开 · 国内父母汇款免报',
        inputs: {
          filingStatus: 'Single',
          state: 'BC', city: 'vancouver', workState: '',
          w2: 75000, spouseW2: 0,
          inc1099: 0, expense1099: 0,
          k401: 3000, hdhp: false, hsa: 0,
          children: 0,
          properties: [],
          charity: 200, medical: 0,
          interest: 800, dividends: 0,
        },
      },
      {
        id: 'ca_winnipegNurse',
        tags: ['single', 't4', 'healthcare', 'public-sector', 'pension', 'mb'],
        taxDesc: '温尼伯护士 · 公立医院 · T4 $82K · MB 工会 · 制服 + 继续教育抵扣',
        title: '护士 · 温尼伯',
        subtitle: 'Single · $82K · MB 公立医院 + DB Pension',
        hook: 'Union dues + Uniform + 继教费 Employment expenses',
        inputs: {
          filingStatus: 'Single',
          state: 'MB', city: 'winnipeg', workState: '',
          w2: 82000, spouseW2: 0,
          inc1099: 0, expense1099: 0,
          k401: 4000, hdhp: false, hsa: 0,
          children: 0,
          properties: [],
          charity: 500, medical: 300,
          interest: 1200, dividends: 0,
        },
      },
    ],
  },

  {
    group: '家庭中产',
    groupTag: 'II',
    groupTags: ['married', 't4', 'kids', 'ccb', 'house'],
    blurb: '双薪 · 娃 · 房贷 · CCB · 典型华人中产',
    scenarios: [
      { tag: 'Markham 双码农', desc: '双 T4 $240K · 2 娃 · 自住 · CCB 拿不到但可 RRSP' },
      { tag: 'QC 双申报', desc: '蒙特利尔 · T1 + TP-1 两张表' },
      { tag: '列治文双薪', desc: '温哥华郊区 · BC 省税 · 1 娃' },
    ],
    detail: {
      pain: 'CCB 被 phase-out · 如何靠 RRSP 拉回一点',
      traits: 'MFJ $150K-$300K · 自住房 · 2-3 娃',
      typical: 'Markham · Richmond · 蒙特利尔',
      mainOpps: '双方 RRSP 拉满 · FHSA（如果没房）· RESP 娃',
    },
    accent: '#6B7E95',
    tint: '#E8ECF0',
    personas: [
      {
        id: 'ca_markhamDualTech',
        tags: ['married', 't4', 'kids', 'house', 'ccb'],
        taxDesc: 'Markham 双薪码农 · T4 $240K · 2 娃 · 自住 · CCB 快 phase-out',
        title: 'Markham 双码农 · 安省',
        subtitle: 'MFJ · 2 娃 · 自住房',
        hook: '双人 RRSP $40K + RESP × 2',
        inputs: {
          filingStatus: 'MFJ',
          state: 'ON', city: 'markham', workState: '',
          w2: 140000, spouseW2: 100000,
          inc1099: 0, expense1099: 0,
          k401: 0, hdhp: false, hsa: 0,
          children: 2,
          properties: [
            { id: 1, type: 'primary', state: 'ON', propertyTax: 6500, mortInt: 14000 },
          ],
          charity: 1500, medical: 800,
        },
      },
      {
        id: 'ca_montrealFamily',
        tags: ['married', 't4', 'kids', 'qc', 'house'],
        taxDesc: '蒙特利尔双薪 · QC 单独 TP-1 · QPP 代替 CPP · 2 娃',
        title: 'QC 双薪家庭 · 蒙特利尔',
        subtitle: 'MFJ · 2 娃 · QC 双报税',
        hook: 'T1 + TP-1 · QPP + QPIP',
        inputs: {
          filingStatus: 'MFJ',
          state: 'QC', city: 'montreal', workState: '',
          w2: 95000, spouseW2: 75000,
          inc1099: 0, expense1099: 0,
          k401: 0, hdhp: false, hsa: 0,
          children: 2,
          properties: [
            { id: 1, type: 'primary', state: 'QC', propertyTax: 4500, mortInt: 10000 },
          ],
          charity: 800, medical: 600,
        },
      },
      {
        id: 'ca_richmondFamily',
        tags: ['married', 't4', 'kids', 'bc', 'house'],
        taxDesc: '温哥华郊区 · T4 $180K · BC 省税 · 1 娃 · 自住',
        title: 'BC 双薪家庭 · 列治文',
        subtitle: 'MFJ · 1 娃 · 自住 condo',
        hook: 'BC 省税中产优惠 · RRSP 双人',
        inputs: {
          filingStatus: 'MFJ',
          state: 'BC', city: 'richmond', workState: '',
          w2: 110000, spouseW2: 70000,
          inc1099: 0, expense1099: 0,
          k401: 0, hdhp: false, hsa: 0,
          children: 1,
          properties: [
            { id: 1, type: 'primary', state: 'BC', propertyTax: 3200, mortInt: 16000 },
          ],
          charity: 500, medical: 400,
        },
      },
      {
        id: 'ca_mississaugaDualIncome',
        tags: ['married', 't4', 'kids', 'house', 'suburb', 'on'],
        taxDesc: 'Mississauga 双薪中产 · $180K 合计 · 1 娃 · townhouse',
        title: 'Mississauga 双薪',
        subtitle: 'MFJ · 1 娃 · 自住 townhouse · $180K',
        hook: 'CCB 部分 phase-out · RRSP 双人空间',
        inputs: {
          filingStatus: 'MFJ',
          state: 'ON', city: 'mississauga', workState: '',
          w2: 105000, spouseW2: 75000,
          inc1099: 0, expense1099: 0,
          k401: 10000, hdhp: false, hsa: 0,
          children: 1,
          properties: [
            { id: 1, type: 'primary', state: 'ON', propertyTax: 5500, mortInt: 15000 },
          ],
          charity: 800, medical: 500,
        },
      },
      {
        id: 'ca_burnabyNewImmigrantFamily',
        tags: ['married', 't4', 'kids', 'new-pr', 'bc'],
        taxDesc: 'Burnaby 新移民家庭 · PR 2 年 · 国内还有资产 · 首年 HBP 准备',
        title: 'Burnaby 新移民',
        subtitle: 'MFJ · 2 娃 · 租房 · PR 第 2 年',
        hook: '国内资产 T1135 申报 · FHSA + HBP 买首房',
        inputs: {
          filingStatus: 'MFJ',
          state: 'BC', city: 'burnaby', workState: '',
          w2: 88000, spouseW2: 52000,
          inc1099: 0, expense1099: 0,
          k401: 3000, hdhp: false, hsa: 0,
          children: 2,
          properties: [],
          charity: 600, medical: 800,
          interest: 2500, dividends: 500,
        },
      },
      {
        id: 'ca_burnabyElectrician',
        tags: ['married', 't4', 'kids', 'blue-collar', 'union', 'trade', 'red-seal', 'bc'],
        taxDesc: '本拿比红印证电工 · Union T4 $98K · 配偶半职 · 2 娃 · RRSP match',
        title: '蓝领电工 · 本拿比',
        subtitle: 'MFJ · 2 娃 · 工会 T4 + 配偶半职',
        hook: 'Union RRSP match + 工具费 + T2200 employment expenses',
        inputs: {
          filingStatus: 'MFJ',
          state: 'BC', city: 'burnaby', workState: '',
          w2: 98000, spouseW2: 52000,
          inc1099: 0, expense1099: 0,
          k401: 8000, hdhp: false, hsa: 0,
          children: 2,
          properties: [
            { id: 1, type: 'primary', state: 'BC', propertyTax: 3600, mortInt: 14000 },
          ],
          charity: 500, medical: 400,
        },
      },
      {
        id: 'ca_saskatoonSingleIncome',
        tags: ['married', 't4', 'kids', 'single-earner', 'spouse-athome', 'sk'],
        taxDesc: '萨斯卡通单收入家庭 · 夫工程师 T4 $88K · 妻全职带娃 · 3 娃',
        title: '单收入家庭 · 萨斯卡通',
        subtitle: 'MFJ · 3 娃 · 配偶全职在家 · SK 低成本',
        hook: 'Spousal Amount 抵免 + CCB 高档 + RESP',
        inputs: {
          filingStatus: 'MFJ',
          state: 'SK', city: 'saskatoon', workState: '',
          w2: 88000, spouseW2: 0,
          inc1099: 0, expense1099: 0,
          k401: 5000, hdhp: false, hsa: 0,
          children: 3,
          properties: [
            { id: 1, type: 'primary', state: 'SK', propertyTax: 3200, mortInt: 9000 },
          ],
          charity: 800, medical: 600,
        },
      },
      {
        id: 'ca_gatineauOttawaCommuter',
        tags: ['single', 't4', 'cross-province', 'qc-resident', 'on-work', 'qc'],
        taxDesc: 'Gatineau 住 + Ottawa 联邦公务员工作 · 住省征税(QC) · TP-1 双申报',
        title: 'Gatineau→Ottawa 跨省',
        subtitle: 'Single · 住 QC · ON 联邦工作 $95K',
        hook: 'QC 居住 · 按 QC 征税 · 16.5% Abatement + 省际 credit',
        inputs: {
          filingStatus: 'Single',
          state: 'QC', city: 'gatineau', workState: 'ON',
          w2: 95000, spouseW2: 0,
          inc1099: 0, expense1099: 0,
          k401: 6000, hdhp: false, hsa: 0,
          children: 0,
          properties: [],
          charity: 400, medical: 200,
          interest: 1000, dividends: 300,
        },
      },
    ],
  },

  {
    group: '自雇 / 小企业',
    groupTag: 'III',
    groupTags: ['selfemp', 't2125', 'ccpc', 'tosi'],
    blurb: '自雇 · 网红 · Uber · 咨询 · 考虑 incorporate',
    scenarios: [
      { tag: '自雇顾问', desc: 'T2125 · 双份 CPP · RRSP 空间 18% × 净利' },
      { tag: 'Uber 司机', desc: 'GST/HST 注册 · vehicle expenses 扣' },
      { tag: 'CCPC 老板', desc: 'SBD 前 $500K 联邦 9% · salary vs dividend' },
    ],
    detail: {
      pain: '自雇 CPP 双份 · incorporate 值不值',
      traits: '自雇净利 $40K-$300K · 通常混合个人 + 业务支出',
      typical: '温哥华网红 · Uber 司机 · 咨询师',
      mainOpps: '15% Solo pension · CCPC SBD · RRSP 双份 · 夫妻 TOSI 合规',
    },
    accent: '#8B6F47',
    tint: '#F1EAE0',
    personas: [
      {
        id: 'ca_vancouverInfluencer',
        tags: ['single', 'selfemp', 't2125', 'gst', 'bc'],
        taxDesc: '温哥华网红 · 自雇 $180K · BC 省税 · GST/HST 注册要',
        title: '小红书博主 · 温哥华',
        subtitle: 'Single · 全职自雇 · 多平台收入',
        hook: '双 CPP + GST 注册 + 考虑 incorporate',
        inputs: {
          filingStatus: 'Single',
          state: 'BC', city: 'vancouver', workState: '',
          w2: 0, spouseW2: 0,
          inc1099: 180000, expense1099: 35000,
          k401: 0, hdhp: false, hsa: 0,
          children: 0,
          properties: [],
          charity: 500, medical: 500,
        },
      },
      {
        id: 'ca_uberDriver',
        tags: ['single', 'selfemp', 'gst', 't2125'],
        taxDesc: 'Uber 司机 · 自雇 $65K · GST 强制注册（Uber 代收）',
        title: 'Uber 司机 · 多伦多',
        subtitle: 'Single · 全职 Uber · 车辆费用扣',
        hook: '车辆 % 扣 + Solo CPP',
        inputs: {
          filingStatus: 'Single',
          state: 'ON', city: 'toronto', workState: '',
          w2: 0, spouseW2: 0,
          inc1099: 65000, expense1099: 18000,
          k401: 0, hdhp: false, hsa: 0,
          children: 0,
          properties: [],
          charity: 100, medical: 0,
        },
      },
      {
        id: 'ca_ccpcOwner',
        tags: ['married', 'ccpc', 'tosi', 'biz'],
        taxDesc: 'CCPC 老板 · 前 $500K 联邦 9% · salary vs dividend 决策',
        title: 'CCPC 老板 · 安省',
        subtitle: 'MFJ · 小公司 · 主动业务收入',
        hook: 'SBD + 薪资 / 分红优化',
        inputs: {
          filingStatus: 'MFJ',
          state: 'ON', city: 'toronto', workState: '',
          w2: 120000, spouseW2: 0,
          inc1099: 80000, expense1099: 10000,
          k401: 0, hdhp: false, hsa: 0,
          children: 2,
          properties: [
            { id: 1, type: 'primary', state: 'ON', propertyTax: 5500, mortInt: 12000 },
          ],
          charity: 1000, medical: 500,
        },
      },
      {
        id: 'ca_calgaryOilConsultant',
        tags: ['single', 'selfemp', 't2125', 'high-income', 'ab', 'oil-gas'],
        taxDesc: '卡尔加里独立顾问 · 石油行业 $200K · AB 低税 · CCPC 考虑中',
        title: '石油 Consultant · 卡尔加里',
        subtitle: 'Single · 石油行业独立咨询 · $200K',
        hook: 'AB 低顶档 + CCPC SBD 值得开',
        inputs: {
          filingStatus: 'Single',
          state: 'AB', city: 'calgary', workState: '',
          w2: 0, spouseW2: 0,
          inc1099: 200000, expense1099: 15000,
          k401: 0, hdhp: false, hsa: 0,
          children: 0,
          properties: [
            { id: 1, type: 'primary', state: 'AB', propertyTax: 4500, mortInt: 12000 },
          ],
          charity: 1500, medical: 0,
          interest: 4000, dividends: 2000,
        },
      },
      {
        id: 'ca_torontoSingleMomRealtor',
        tags: ['hoh', 'selfemp', 't2125', 'single-parent', 'on'],
        taxDesc: '多伦多单亲地产经纪 · 全职 Realtor · 1 娃 · 自雇收入波动',
        title: '单亲地产经纪 · 多伦多',
        subtitle: 'HoH · 1 娃 · 全职自雇 Realtor',
        hook: '单亲 CCB + CDB + 家庭抵免叠加',
        inputs: {
          filingStatus: 'HoH',
          state: 'ON', city: 'toronto', workState: '',
          w2: 0, spouseW2: 0,
          inc1099: 95000, expense1099: 18000,
          k401: 0, hdhp: false, hsa: 0,
          children: 1,
          properties: [
            { id: 1, type: 'primary', state: 'ON', propertyTax: 4800, mortInt: 13000 },
          ],
          charity: 400, medical: 1500,
        },
      },
      {
        id: 'ca_workPermitOINPBuyer',
        tags: ['single', 't4', 'selfemp', 't2125', 'work-permit', 'oinp', 'fhsa', 'hbp', 'first-home', 'on'],
        taxDesc: '工签 + OINP 省提名 + 联邦 PR AOR · T4 + 自雇混合 · 准备买 GTA 首房',
        title: '工签 OINP · 首房 · 多伦多',
        subtitle: 'Single · T4 + 自雇 · NRST 免 · 攒首付',
        hook: 'FHSA $8K + HBP $60K · NOA 偏低但首付 50%',
        inputs: {
          filingStatus: 'Single',
          state: 'ON', city: 'toronto', workState: '',
          w2: 72000, spouseW2: 0,
          inc1099: 48000, expense1099: 9000,
          k401: 2500, hdhp: false, hsa: 0,
          children: 0,
          properties: [],
          charity: 300, medical: 400,
          interest: 3500, dividends: 500,
        },
      },
      {
        id: 'ca_torontoXHSCreator',
        tags: ['single', 't4', 'selfemp', 't2125', 'gst', 'content-creator', 'influencer', 'on'],
        taxDesc: '多伦多 T4 正职 + 晚上 XHS / YouTube 副业 · 双栖收入 · GST 临界',
        title: 'XHS 博主双栖 · 多伦多',
        subtitle: 'Single · T4 正职 + 自媒体副业',
        hook: 'T4 源头扣 + 自雇季度预缴 · 支出抵扣 wifi/设备/出行',
        inputs: {
          filingStatus: 'Single',
          state: 'ON', city: 'toronto', workState: '',
          w2: 78000, spouseW2: 0,
          inc1099: 42000, expense1099: 11000,
          k401: 5000, hdhp: false, hsa: 0,
          children: 0,
          properties: [],
          charity: 600, medical: 200,
          interest: 1200, dividends: 800,
        },
      },
      {
        id: 'ca_scarboroughRestaurant',
        tags: ['married', 't4', 'selfemp', 'ccpc', 'family-business', 'tosi', 'gst', 'on'],
        taxDesc: 'Scarborough 中餐馆 · CCPC · 夫妻经营 · 1 娃 · GST 注册 · TOSI 注意',
        title: '中餐馆老板 · Scarborough',
        subtitle: 'MFJ · 夫妻 CCPC · 1 娃 · 小企业',
        hook: 'SBD $500K 前联邦 9% + 配偶工资合规 · TOSI 防',
        inputs: {
          filingStatus: 'MFJ',
          state: 'ON', city: 'toronto', workState: '',
          w2: 60000, spouseW2: 40000,
          inc1099: 35000, expense1099: 5000,
          k401: 3000, hdhp: false, hsa: 0,
          children: 1,
          properties: [
            { id: 1, type: 'primary', state: 'ON', propertyTax: 4500, mortInt: 11000 },
          ],
          charity: 1200, medical: 400,
          interest: 500, dividends: 1000,
        },
      },
      {
        id: 'ca_vancouverLawCorp',
        tags: ['single', 'selfemp', 'professional-corp', 'high-income', 'ipp', 'bc'],
        taxDesc: '温哥华独立律师 · Law Corp (Professional Corp) · 自雇 $280K · IPP 适合',
        title: '独立律师 · 温哥华',
        subtitle: 'Single · Law Corp · $280K 业务收入',
        hook: 'Law Corp 递延 + IPP (个人养老计划) 高收入最优',
        inputs: {
          filingStatus: 'Single',
          state: 'BC', city: 'vancouver', workState: '',
          w2: 0, spouseW2: 0,
          inc1099: 280000, expense1099: 25000,
          k401: 0, hdhp: false, hsa: 0,
          children: 0,
          properties: [
            { id: 1, type: 'primary', state: 'BC', propertyTax: 6800, mortInt: 18000 },
          ],
          charity: 3000, medical: 400,
          interest: 4000, dividends: 2000,
        },
      },
    ],
  },

  {
    group: '财富 / 房产',
    groupTag: 'IV',
    groupTags: ['high-income', 'house', 'rental', 'capital-gains'],
    blurb: 'Bay Street · 医生 · 多套房东 · OAS 回收预警',
    scenarios: [
      { tag: 'Bay Street 金融', desc: 'T4 $450K · RRSP 满 + TFSA 满 + 投资账户' },
      { tag: '安省医生', desc: 'PC/CCPC · 前 $500K SBD · T2 报税' },
      { tag: '温哥华房东', desc: '2 套出租 · 空屋税 · BC speculation tax' },
    ],
    detail: {
      pain: 'OAS 回收 · 65 岁后取 RRSP 被吃',
      traits: '个人收入 $300K+ · 或多套物业 · 或 CCPC',
      typical: 'Bay Street banker · GTA 医生 · 温哥华房东',
      mainOpps: 'TFSA meltdown · Pension Splitting · Incorporate',
    },
    accent: '#0F5132',
    tint: '#E8EFEA',
    personas: [
      {
        id: 'ca_bayStreetFinance',
        tags: ['married', 'high-income', 't4', 'rrsp-full', 'tfsa-full'],
        taxDesc: 'Bay Street 双金融 · T4 $800K · OAS 几乎归零预警',
        title: 'Bay Street 金融夫妻 · 多伦多',
        subtitle: 'MFJ · 顶薪 · 自住 + 度假屋',
        hook: 'RRSP 满 · TFSA 满 · 非注册投资户',
        inputs: {
          filingStatus: 'MFJ',
          state: 'ON', city: 'toronto', workState: '',
          w2: 450000, spouseW2: 350000,
          inc1099: 0, expense1099: 0,
          k401: 32490, hdhp: false, hsa: 0,
          children: 2,
          properties: [
            { id: 1, type: 'primary', state: 'ON', propertyTax: 18000, mortInt: 20000 },
            { id: 2, type: 'second_home', state: 'ON', propertyTax: 7000, mortInt: 8000 },
          ],
          charity: 15000, medical: 1500,
          interest: 8000, dividends: 15000, capGainsLT: 80000,
        },
      },
      {
        id: 'ca_doctorIncorp',
        tags: ['married', 'high-income', 'ccpc', 'pc'],
        taxDesc: '安省外科医生 · PC 开着 · $500K SBD · 个人支薪 $150K + 留存',
        title: '外科医生 · 多伦多',
        subtitle: 'MFJ · Professional Corp · 1 娃',
        hook: 'PC SBD + IPP 替代 RRSP',
        inputs: {
          filingStatus: 'MFJ',
          state: 'ON', city: 'toronto', workState: '',
          w2: 180000, spouseW2: 0,
          inc1099: 220000, expense1099: 20000,
          k401: 32490, hdhp: false, hsa: 0,
          children: 1,
          properties: [
            { id: 1, type: 'primary', state: 'ON', propertyTax: 14000, mortInt: 16000 },
          ],
          charity: 8000, medical: 1000,
        },
      },
      {
        id: 'ca_vancouverLandlord',
        tags: ['married', 'rental', 'bc', 'speculation-tax'],
        taxDesc: '温哥华房东 · 2 套出租 · BC 空屋税 + speculation tax 风险',
        title: '温哥华房东 · 3 套',
        subtitle: 'MFJ · 自住 + 2 套出租',
        hook: 'T776 租金报税 + 反炒房 365 天',
        inputs: {
          filingStatus: 'MFJ',
          state: 'BC', city: 'vancouver', workState: '',
          w2: 90000, spouseW2: 75000,
          inc1099: 0, expense1099: 0,
          k401: 0, hdhp: false, hsa: 0,
          children: 1,
          properties: [
            { id: 1, type: 'primary', state: 'BC', propertyTax: 5000, mortInt: 14000 },
            { id: 2, type: 'rental', state: 'BC', propertyTax: 4000, mortInt: 12000, rentalIncome: 48000, rentalExpenses: 8000 },
            { id: 3, type: 'rental', state: 'BC', propertyTax: 3500, mortInt: 10000, rentalIncome: 36000, rentalExpenses: 6000 },
          ],
          charity: 500, medical: 500,
        },
      },
      {
        id: 'ca_edmontonSeniorEngineer',
        tags: ['married', 't4', 'high-income', 'rrsp-full', 'ab'],
        taxDesc: '埃德蒙顿资深工程师 · MFJ $350K · AB 顶档 48% · RRSP + TFSA 都满',
        title: '石油资深工程师 · 埃德蒙顿',
        subtitle: 'MFJ · $350K · RRSP 满 · 找下一步',
        hook: 'RRSP/TFSA 满后 · taxable 账户 + 分红 + 慈善',
        inputs: {
          filingStatus: 'MFJ',
          state: 'AB', city: 'edmonton', workState: '',
          w2: 230000, spouseW2: 120000,
          inc1099: 0, expense1099: 0,
          k401: 32490, hdhp: false, hsa: 0,
          children: 0,
          properties: [
            { id: 1, type: 'primary', state: 'AB', propertyTax: 4800, mortInt: 10000 },
          ],
          charity: 2500, medical: 800,
          interest: 3000, dividends: 8000, capGainsLT: 15000,
        },
      },
      {
        id: 'ca_vancouverRetireeCouple',
        tags: ['married', 'retired', 'oas', 'rrif', 'pension', 'bc'],
        taxDesc: '温哥华退休夫妻 · 65+ · OAS + CPP + RRIF · MFJ $105K',
        title: '温哥华退休夫妻',
        subtitle: 'MFJ · 65+ · 自住 · RRIF 开始取',
        hook: 'OAS 回收红线 + Pension Splitting + TFSA meltdown',
        inputs: {
          filingStatus: 'MFJ',
          state: 'BC', city: 'vancouver', workState: '',
          w2: 0, spouseW2: 0,
          inc1099: 0, expense1099: 0,
          k401: 0, hdhp: false, hsa: 0,
          children: 0,
          properties: [
            { id: 1, type: 'primary', state: 'BC', propertyTax: 6000, mortInt: 0 },
          ],
          charity: 3000, medical: 2500,
          interest: 18000, dividends: 32000, capGainsLT: 40000,
        },
      },
      {
        id: 'ca_halifaxFireCouple',
        tags: ['married', 'fire', 'investment-income', 'low-cost', 'ns'],
        taxDesc: '哈利法克斯 FIRE 夫妻 · 40 多岁早退休 · 被动收入 + 低生活成本',
        title: 'FIRE 夫妻 · 哈利法克斯',
        subtitle: 'MFJ · 40+ 早退休 · 无工资',
        hook: 'TFSA 取 · 分红 tax-efficient · 低 NS 生活成本',
        inputs: {
          filingStatus: 'MFJ',
          state: 'NS', city: '', workState: '',
          w2: 0, spouseW2: 0,
          inc1099: 0, expense1099: 0,
          k401: 0, hdhp: false, hsa: 0,
          children: 0,
          properties: [
            { id: 1, type: 'primary', state: 'NS', propertyTax: 2800, mortInt: 0 },
          ],
          charity: 1200, medical: 600,
          interest: 8000, dividends: 28000, qualifiedDividends: 24000, capGainsLT: 18000,
        },
      },
      {
        id: 'ca_torontoForeignPropOwner',
        tags: ['married', 't4', 'kids', 'foreign-property', 't1135', 'china-rental', 'cross-border', 'on'],
        taxDesc: '多伦多双薪 · 国内有房出租 · T1135 境外资产 · 国内租金计加拿大税',
        title: '国内有房 + T1135',
        subtitle: 'MFJ · 2 娃 · 国内租金 CAD $18K',
        hook: 'T1135 > $100K 强报 + 国内租金报加税 + 双边 credit',
        inputs: {
          filingStatus: 'MFJ',
          state: 'ON', city: 'toronto', workState: '',
          w2: 140000, spouseW2: 85000,
          inc1099: 0, expense1099: 0,
          k401: 12000, hdhp: false, hsa: 0,
          children: 2,
          properties: [
            { id: 1, type: 'primary', state: 'ON', propertyTax: 6500, mortInt: 18000 },
            { id: 2, type: 'rental', state: 'CN', propertyTax: 0, mortInt: 0, rentalIncome: 18000, rentalExpenses: 3000 },
          ],
          charity: 1500, medical: 600,
          interest: 3000, dividends: 2000,
        },
      },
      {
        id: 'ca_torontoDivorcedDad',
        tags: ['hoh', 't4', 'kids', 'divorced', 'support', 'single-parent', 'on'],
        taxDesc: '多伦多离婚父亲 · T4 $110K · 1 娃共同监护 · 付抚养费 + Spousal Support',
        title: '离婚父亲 · 多伦多',
        subtitle: 'HoH · 1 娃(9) · 付抚养 $2K/月',
        hook: 'Spousal Support 抵 · Child Support 不抵 · 合格 Dependant',
        inputs: {
          filingStatus: 'HoH',
          state: 'ON', city: 'toronto', workState: '',
          w2: 110000, spouseW2: 0,
          inc1099: 0, expense1099: 0,
          k401: 7000, hdhp: false, hsa: 0,
          children: 1,
          properties: [
            { id: 1, type: 'primary', state: 'ON', propertyTax: 5500, mortInt: 14000 },
          ],
          charity: 400, medical: 800,
          interest: 1200, dividends: 0,
        },
      },
    ],
  },
];

// 向后兼容：CA personas 扁平化
const PERSONAS_CA = PERSONA_GROUPS_CA.flatMap(g => g.personas);

// ═══════════════════════════════════════════════════════════
//  主应用
// ═══════════════════════════════════════════════════════════

const STORAGE_KEY = 'taxpilot_state_v2'; // v2: properties array + city field

// 把 v1 老数据结构迁移到 v2（含 properties 数组）
const migrateInputs = (saved) => {
  if (!saved) return null;
  // 已经是 v2
  if (Array.isArray(saved.properties)) {
    return { workState: '', workStateDays: 100, ...saved };
  }
  // v1 → v2：把 mortgageInt / propertyTax 转成 primary 房产
  const out = { ...saved, city: saved.city || '', workState: saved.workState || '', workStateDays: saved.workStateDays ?? 100, properties: [] };
  if ((saved.mortgageInt > 0) || (saved.propertyTax > 0)) {
    out.properties = [{
      id: 1, type: 'primary', state: saved.state || 'NY',
      mortInt: saved.mortgageInt || 0,
      propertyTax: saved.propertyTax || 0,
    }];
  }
  delete out.mortgageInt;
  delete out.propertyTax;
  return out;
};

// 判断是否被修改过
const isModifiedFrom = (current, preset) => {
  const p = PRESETS[preset];
  if (!p) return true;
  for (const k in p) {
    if (p[k] !== current[k]) return true;
  }
  return false;
};

// ═══════════════════════════════════════════════════════════
//  DetailModal · 通用卡片弹窗
// ═══════════════════════════════════════════════════════════

const DetailModal = ({ open, onClose, title, subtitle, headerRight, children }) => {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 90,
        background: 'rgba(13, 13, 13, 0.55)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        padding: 0,
        fontFamily: F_BODY,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: C.bg,
          width: '100%',
          maxWidth: 440,
          maxHeight: '88vh',
          display: 'flex', flexDirection: 'column',
          borderTopLeftRadius: 16, borderTopRightRadius: 16,
          boxShadow: '0 -8px 24px rgba(0,0,0,0.15)',
        }}
      >
        {/* drag handle */}
        <div style={{ padding: '8px 0 4px', display: 'flex', justifyContent: 'center' }}>
          <div style={{
            width: 32, height: 4, borderRadius: 2,
            background: C.line,
          }} />
        </div>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 12,
          padding: '10px 16px 14px',
          borderBottom: `1px solid ${C.line}`,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {typeof title === 'string' ? (
              <div style={{
                fontFamily: F_NUM, fontSize: 20, fontWeight: 700,
                color: C.ink, letterSpacing: '-0.02em', lineHeight: 1.2,
              }}>{title}</div>
            ) : title}
            {subtitle && (
              <div style={{
                fontSize: 11, color: C.mute, fontFamily: F_BODY,
                lineHeight: 1.5, marginTop: 4,
              }}>{subtitle}</div>
            )}
          </div>
          {headerRight}
          <button onClick={onClose} style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            fontSize: 20, color: C.mute, padding: 0, lineHeight: 1,
            width: 24, height: 24, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }} aria-label="关闭">×</button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '14px 16px 20px' }}>
          {children}
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
//  OppTile · 方形机会卡片 (2-col grid)
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
//  opportunityTimeline · v49 timeline 合理化
//  现在日期是 2026-04-21（2025 税年已过报税截止日）
//  分类：过去 / 现在 / 今年 12 月 / 2027 追补
// ═══════════════════════════════════════════════════════════

function opportunityTimeline(urgency, oppId) {
  // 根据 urgency 文案自动分类
  const u = String(urgency || '').toLowerCase();

  // "4/15 前追补 2025 供款" → 过去（2025 已错过）
  if (u.includes('追补 2025') || u.includes('4/15 前可追补')) {
    return {
      status: 'missed2025',
      badge: '2025 已截止',
      color: '#9A6B00',
      bg: '#FBF1DC',
      hint: '2025 税年已过，现可为 2026 税年规划',
      action: '改规划 2026',
    };
  }

  // "Dec 31 前" / "12/31 前" → 今年底截止（2026 税年）
  if (u.includes('12/31') || u.includes('dec 31') || u.includes('年底') || u.includes('年内')) {
    return {
      status: 'eoy2026',
      badge: '2026 年底前',
      color: '#1F4FA0',
      bg: '#E4EBF5',
      hint: '2026 税年有效 · 12/31 前工资扣款或开户供款',
      action: '本年可行动',
    };
  }

  // "4/15 前操作都算 2025" → 过去（错过 2025）
  if (u.includes('4/15 前操作都算 2025') || u.includes('4/15 前 都算')) {
    return {
      status: 'missed2025',
      badge: '2025 已截止',
      color: '#9A6B00',
      bg: '#FBF1DC',
      hint: '2025 IRA/HSA 追补期已过 · 改为 2026 年规划',
      action: '改规划 2026',
    };
  }

  // "随时" / "全年" / "随工资扣" / "open enrollment" → 随时
  if (u.includes('随时') || u.includes('全年') || u.includes('随工资') || u.includes('enrollment') || u.includes('报税时') || u.includes('长期规划') || u.includes('多年')) {
    return {
      status: 'anytime',
      badge: '随时可做',
      color: '#0F7C4A',
      bg: '#E8F3EC',
      hint: '灵活 · 随时设置 · 对未来所有税年生效',
      action: '立刻行动',
    };
  }

  // "卖房时" / "实现资本利得后" / "卖自住房前" → 事件触发
  if (u.includes('卖房') || u.includes('实现资本利得') || u.includes('180 天')) {
    return {
      status: 'triggered',
      badge: '事件触发',
      color: '#6B4A8B',
      bg: '#EEE7F3',
      hint: '卖房 / 卖股 时才启动 · 现可提前了解规则',
      action: '了解规则',
    };
  }

  // "一次性迁移" / "年初设立" / "年度最合适" → 窗口期
  if (u.includes('年初') || u.includes('迁移') || u.includes('183 天')) {
    return {
      status: 'window',
      badge: '窗口期',
      color: '#1F4FA0',
      bg: '#E4EBF5',
      hint: '建议在税年开始时设立（2027 年 1 月前布局）',
      action: '2027 前规划',
    };
  }

  // "2026+ 可能恢复" → 未来立法
  if (u.includes('可能恢复') || u.includes('立法') || u.includes('未来')) {
    return {
      status: 'future',
      badge: '关注立法',
      color: '#6B6B6B',
      bg: '#F0EEEA',
      hint: '立法未定 · 关注更新',
      action: '保持关注',
    };
  }

  // "认知层面" / "无" / "Dec 31 前开户 · 4/15 前供款"
  if (u.includes('认知')) {
    return {
      status: 'awareness',
      badge: '认知',
      color: '#6B6B6B',
      bg: '#F0EEEA',
      hint: '不需行动 · 理解原理即可',
      action: null,
    };
  }

  // Solo 401(k) 特殊：12/31 前开户，但 2025 报税截止前可为 2025 年供款
  if (u.includes('开户')) {
    return {
      status: 'eoy2026',
      badge: '2026 年底前',
      color: '#1F4FA0',
      bg: '#E4EBF5',
      hint: '12/31 前开户 · 供款可到 2027 年 4/15',
      action: '本年开户',
    };
  }

  // 默认
  return {
    status: 'anytime',
    badge: '可规划',
    color: '#6B6B6B',
    bg: '#F0EEEA',
    hint: urgency,
    action: null,
  };
}

const OppTile = ({ opp, rank, onClick, rateBreakdown }) => {
  const isWarn = opp.type === 'warning';
  const isInfo = opp.type === 'info';
  const isDone = opp.tag === '已优化';

  const bg = isWarn ? C.warnBg : isDone ? C.saveBg : isInfo ? C.infoBg : C.card;
  const border = isWarn ? '#E6C97A' : isDone ? C.save : isInfo ? '#BCC9DE' : C.line;

  // 角落标记
  const badge = isWarn ? '†' : isInfo ? '¶' : isDone ? '✓' : null;
  const badgeColor = isWarn ? C.warn : isInfo ? C.info : isDone ? C.save : C.ink;

  // 格式化数字到 "$7K" 这种简短样式以适应小方块
  const compactNum = (n) => {
    if (n >= 10000) return `$${Math.round(n / 1000)}K`;
    if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
    return `$${Math.round(n)}`;
  };

  return (
    <button
      onClick={onClick}
      style={{
        aspectRatio: '1 / 1',
        background: bg, border: `1px solid ${border}`,
        borderRadius: 10, padding: 8,
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        textAlign: 'left', cursor: 'pointer',
        fontFamily: F_BODY, width: '100%',
        overflow: 'hidden', position: 'relative',
        transition: 'all 0.15s',
      }}
    >
      {/* 顶栏：编号/角标 + 时间线小标 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
        {badge ? (
          <div style={{
            fontFamily: F_NUM, fontSize: 13, fontWeight: 700,
            color: badgeColor, lineHeight: 1,
          }}>{badge}</div>
        ) : (
          <div style={{
            width: 14, height: 14, borderRadius: '50%',
            background: rank <= 3 ? C.ink : C.line,
            color: rank <= 3 ? '#FFF' : C.mute,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 8, fontFamily: F_NUM, fontWeight: 700, flexShrink: 0,
          }}>{rank}</div>
        )}
        {/* v49: timeline badge · 缩写版 */}
        {opp.urgency && (() => {
          const tl = opportunityTimeline(opp.urgency, opp.id);
          const shortBadge = tl.status === 'missed2025' ? '25过'
            : tl.status === 'eoy2026' ? '26底'
            : tl.status === 'anytime' ? '随时'
            : tl.status === 'triggered' ? '事件'
            : tl.status === 'window' ? '窗口'
            : tl.status === 'future' ? '立法'
            : null;
          if (!shortBadge) return null;
          return (
            <div style={{
              fontSize: 7, fontFamily: F_MONO, fontWeight: 700,
              padding: '1px 4px', borderRadius: 2,
              background: tl.bg, color: tl.color,
              letterSpacing: '0.04em', flexShrink: 0,
            }}>{shortBadge}</div>
          );
        })()}
      </div>

      {/* 标题（2 行） */}
      <div style={{
        fontSize: 10, fontFamily: F_BODY, fontWeight: 700,
        color: C.ink, lineHeight: 1.25,
        display: '-webkit-box',
        WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
        flex: 1,
      }}>
        {opp.title}
      </div>

      {/* 数额 */}
      <div>
        {opp.saving > 0 ? (
          <>
            <div style={{
              fontFamily: F_NUM, fontSize: 13, fontWeight: 700,
              color: C.save, lineHeight: 1, letterSpacing: '-0.02em',
            }}>
              −{compactNum(opp.saving)}
            </div>
            {rateBreakdown && rateBreakdown.total > 0 && (
              <div style={{
                fontSize: 8, color: C.muteLite, fontFamily: F_MONO,
                marginTop: 2, letterSpacing: '0.02em',
              }}>
                @ {(rateBreakdown.total * 100).toFixed(0)}% 边际
              </div>
            )}
            {rateBreakdown && rateBreakdown.isLongTerm && (
              <div style={{
                fontSize: 8, color: C.info, fontFamily: F_MONO,
                marginTop: 2, letterSpacing: '0.02em',
              }}>
                长期复利
              </div>
            )}
          </>
        ) : opp.cost ? (
          <div style={{
            fontFamily: F_NUM, fontSize: 12, fontWeight: 700,
            color: C.pay, lineHeight: 1,
          }}>
            +{compactNum(opp.cost)}
          </div>
        ) : isInfo ? (
          <div style={{ fontSize: 9, color: C.info, fontFamily: F_BODY, fontWeight: 600 }}>
            规划 →
          </div>
        ) : isWarn ? (
          <div style={{ fontSize: 9, color: C.warn, fontFamily: F_BODY, fontWeight: 600 }}>
            注意 →
          </div>
        ) : null}
      </div>
    </button>
  );
};

// ═══════════════════════════════════════════════════════════
//  OppDetailView · 弹窗中的机会详情
// ═══════════════════════════════════════════════════════════

const OppDetailView = ({ opp, rateBreakdown }) => {
  const diffDots = '●'.repeat(opp.difficulty || 0) + '○'.repeat(Math.max(0, 5 - (opp.difficulty || 0)));
  return (
    <>
      {(opp.saving > 0 || opp.cost) && (
        <div style={{
          padding: 14, borderRadius: 10, marginBottom: 16,
          background: opp.saving > 0 ? C.saveBg : C.payBg,
          border: `1px solid ${opp.saving > 0 ? C.save : C.pay}`,
          display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10,
        }}>
          <div style={{
            fontFamily: F_NUM, fontSize: 28, fontWeight: 700,
            color: opp.saving > 0 ? C.save : C.pay, letterSpacing: '-0.02em', lineHeight: 1,
          }}>
            {opp.saving > 0 ? '−' : '+'}${fmt(opp.saving || opp.cost || 0)}
          </div>
          <div style={{ textAlign: 'right' }}>
            {opp.contrib > 0 && (
              <div style={{ fontSize: 11, color: C.ink2, fontFamily: F_BODY, fontWeight: 600 }}>
                可供款 ${fmt(opp.contrib)}
              </div>
            )}
            <div style={{ fontSize: 10, color: C.mute, fontFamily: F_BODY }}>
              {opp.saving > 0 ? '每年省税' : '多交税'}
            </div>
          </div>
        </div>
      )}

      {/* 税率分解 · 回答 "省税基于哪档 bracket" */}
      {rateBreakdown && (rateBreakdown.total > 0 || rateBreakdown.isLongTerm || rateBreakdown.isSECut) && (
        <div style={{
          marginBottom: 14,
          padding: 12,
          background: C.card,
          border: `1px solid ${C.line}`,
          borderRadius: 8,
        }}>
          <div style={{
            fontSize: 10, color: C.mute, fontFamily: F_BODY, fontWeight: 600,
            letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8,
            display: 'flex', justifyContent: 'space-between',
          }}>
            <span>按什么税率省的</span>
            {rateBreakdown.total > 0 && (
              <span style={{ color: C.save, fontFamily: F_NUM, fontWeight: 700 }}>
                合计 {(rateBreakdown.total * 100).toFixed(1)}%
              </span>
            )}
          </div>

          {rateBreakdown.isLongTerm ? (
            <div style={{ fontSize: 11, color: C.ink2, fontFamily: F_BODY, lineHeight: 1.5 }}>
              这是 <b style={{ color: C.info }}>长期 Roth 复利</b>，不是当下省税。
              现在存的是税后钱，但退休取出时 <b>全部免税</b>。
              如果你的投资回报 4%/年 × 30 年，$7,000 会变成 $22,700 全免税。
            </div>
          ) : rateBreakdown.isSECut ? (
            <div style={{ fontSize: 11, color: C.ink2, fontFamily: F_BODY, lineHeight: 1.5 }}>
              S-Corp 主要省的是 <b style={{ color: C.pay }}>SE Tax 15.3%</b>：
              把 Schedule C 1099 收入转成 W2 工资 + 分红，
              只有工资部分交 FICA，分红部分不交 FICA。
            </div>
          ) : (
            <>
              {/* 3 列 breakdown */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: 8,
                marginBottom: 8,
              }}>
                {rateBreakdown.fed > 0 && (
                  <div>
                    <div style={{ fontSize: 9, color: C.mute, fontFamily: F_BODY, letterSpacing: '0.05em' }}>
                      联邦
                    </div>
                    <div style={{ fontFamily: F_NUM, fontSize: 14, fontWeight: 700, color: C.ink }}>
                      {(rateBreakdown.fed * 100).toFixed(1)}%
                    </div>
                  </div>
                )}
                {rateBreakdown.state > 0 && (
                  <div>
                    <div style={{ fontSize: 9, color: C.mute, fontFamily: F_BODY, letterSpacing: '0.05em' }}>
                      州
                    </div>
                    <div style={{ fontFamily: F_NUM, fontSize: 14, fontWeight: 700, color: C.ink }}>
                      {(rateBreakdown.state * 100).toFixed(1)}%
                    </div>
                  </div>
                )}
                {rateBreakdown.fica > 0 && (
                  <div>
                    <div style={{ fontSize: 9, color: C.mute, fontFamily: F_BODY, letterSpacing: '0.05em' }}>
                      FICA
                    </div>
                    <div style={{ fontFamily: F_NUM, fontSize: 14, fontWeight: 700, color: C.ink }}>
                      {(rateBreakdown.fica * 100).toFixed(2)}%
                    </div>
                  </div>
                )}
              </div>
              <div style={{
                fontSize: 10, color: C.mute, fontFamily: F_BODY, lineHeight: 1.5,
                paddingTop: 8, borderTop: `1px dashed ${C.line}`,
              }}>
                {rateBreakdown.fica > 0
                  ? '※ 这项是 pre-tax 工资预扣，免联邦 + 州 + FICA（Section 125 "cafeteria plan"）'
                  : rateBreakdown.state === 0 && rateBreakdown.fed > 0
                  ? rateBreakdown.njCavaet
                    ? '※ NJ 州不认 401(k) 抵扣，所以只省联邦税'
                    : '※ 只联动联邦税（QBI 联邦独有）'
                  : '※ 按你的边际税率逐档省（你现在每多赚 $1 交这么多税 → 每少赚 $1 省这么多）'}
              </div>
            </>
          )}
        </div>
      )}

      {/* Why */}
      <div style={{ marginBottom: 14 }}>
        <div style={{
          fontSize: 10, color: C.mute, fontFamily: F_BODY, fontWeight: 600,
          letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6,
        }}>为什么</div>
        <div style={{ fontSize: 13, color: C.ink2, fontFamily: F_BODY, lineHeight: 1.6 }}>
          {opp.why || opp.hook || opp.detail || ''}
        </div>
      </div>

      {/* v49 时间线说明 · 分清过去/现在/未来 */}
      {opp.urgency && (() => {
        const tl = opportunityTimeline(opp.urgency, opp.id);
        return (
          <div style={{
            marginBottom: 14, padding: 12,
            background: tl.bg, borderRadius: 8,
            border: `1px solid ${tl.color}33`,
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              marginBottom: 6,
            }}>
              <span style={{
                fontSize: 9, fontFamily: F_MONO, fontWeight: 700,
                padding: '2px 8px', borderRadius: 3,
                background: tl.color, color: '#FFF',
                letterSpacing: '0.08em',
              }}>{tl.badge}</span>
              <span style={{ fontSize: 9, color: C.muteLite, fontFamily: F_MONO }}>
                今日：2026-04-21
              </span>
            </div>
            <div style={{
              fontSize: 11, color: C.ink2, fontFamily: F_BODY, lineHeight: 1.55,
            }}>
              {tl.hint}
            </div>
            <div style={{
              fontSize: 10, color: tl.color, fontFamily: F_BODY, fontWeight: 600,
              marginTop: 4, letterSpacing: '0.02em',
            }}>
              原文：{opp.urgency}
            </div>
          </div>
        );
      })()}

      {/* Meta */}
      <div style={{
        display: 'flex', gap: 14, padding: 12, marginBottom: 14,
        background: C.card, border: `1px solid ${C.line}`, borderRadius: 8,
        flexWrap: 'wrap',
      }}>
        <div style={{ flex: '1 1 auto', minWidth: 100 }}>
          <div style={{ fontSize: 9, color: C.mute, fontFamily: F_BODY, letterSpacing: '0.08em', textTransform: 'uppercase' }}>时间</div>
          <div style={{ fontSize: 11, color: C.ink, fontFamily: F_BODY, fontWeight: 600, marginTop: 2 }}>{opp.urgency || opp.deadline || '随时'}</div>
        </div>
        {opp.difficulty > 0 && (
          <div style={{ flex: '0 0 auto' }}>
            <div style={{ fontSize: 9, color: C.mute, fontFamily: F_BODY, letterSpacing: '0.08em', textTransform: 'uppercase' }}>难度</div>
            <div style={{ fontSize: 11, fontFamily: F_MONO, color: C.ink, fontWeight: 700, marginTop: 2 }}>{diffDots}</div>
          </div>
        )}
      </div>

      {/* How */}
      <div style={{ marginBottom: 14 }}>
        <div style={{
          fontSize: 10, color: C.mute, fontFamily: F_BODY, fontWeight: 600,
          letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6,
        }}>操作步骤</div>
        {Array.isArray(opp.how) && opp.how.length > 0 ? (
          <ol style={{ paddingLeft: 18, margin: 0 }}>
            {opp.how.map((step, idx) => (
              <li key={idx} style={{
                fontSize: 13, color: C.ink2, fontFamily: F_BODY,
                lineHeight: 1.6, marginBottom: 6,
              }}>{step}</li>
            ))}
          </ol>
        ) : opp.detail ? (
          <div style={{
            fontSize: 13, color: C.ink2, fontFamily: F_BODY,
            lineHeight: 1.7,
          }}>{opp.detail}</div>
        ) : null}
      </div>

      {opp.warn && (
        <div style={{
          padding: 12, borderRadius: 8,
          background: C.warnBg, border: `1px solid #E6C97A`,
          display: 'flex', gap: 8, alignItems: 'flex-start',
        }}>
          <span style={{ fontSize: 16, fontFamily: F_NUM, color: C.warn, lineHeight: 1, flexShrink: 0 }}>†</span>
          <span style={{ fontSize: 12, color: C.warn, fontFamily: F_BODY, lineHeight: 1.6 }}>{opp.warn}</span>
        </div>
      )}
    </>
  );
};

// ═══════════════════════════════════════════════════════════
//  OppGrid · 2-col 机会网格 + 弹窗
// ═══════════════════════════════════════════════════════════

const OppGrid = ({ opps, calc, inputs }) => {
  const [openId, setOpenId] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const openOpp = opps.find(o => o.id === openId);
  const actionable = opps.filter(o => o.type !== 'warning' && o.type !== 'info');
  const warnings = opps.filter(o => o.type === 'warning');
  const plans = opps.filter(o => o.type === 'info');
  // v43: 每个 opp 的税率分解（如果 calc / inputs 有传入）
  const rb = (opp) => calc && inputs ? opportunityRateBreakdown(opp, calc, inputs) : null;

  const TOP = 4;
  const topActionable = actionable.slice(0, TOP);
  const extraActionable = actionable.slice(TOP);
  const hasMore = extraActionable.length > 0 || plans.length > 0 || warnings.length > 0;
  const moreCount = extraActionable.length + plans.length + warnings.length;

  return (
    <>
      {/* 省税机会（Top 6）*/}
      {topActionable.length > 0 && (
        <>
          <div style={{
            display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
            padding: '2px 2px 5px',
          }}>
            <span style={{
              fontSize: 10, color: C.mute, fontFamily: F_BODY, fontWeight: 600,
              letterSpacing: '0.12em', textTransform: 'uppercase',
            }}>
              省税机会 · 前 {topActionable.length} 条
            </span>
            <span style={{ fontSize: 9, color: C.muteLite, fontFamily: F_BODY }}>
              点卡片 →
            </span>
          </div>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 6, marginBottom: hasMore ? 8 : 12,
          }}>
            {topActionable.map((opp, idx) => (
              <OppTile key={opp.id} opp={opp} rank={idx + 1} onClick={() => setOpenId(opp.id)} rateBreakdown={rb(opp)} />
            ))}
          </div>
        </>
      )}

      {/* 展开更多按钮（折叠状态） */}
      {hasMore && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          style={{
            width: '100%',
            padding: '10px 14px', marginBottom: 12,
            borderRadius: 10,
            background: C.card, border: `1px dashed ${C.line}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            cursor: 'pointer', fontFamily: F_BODY,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: C.ink2, fontWeight: 600 }}>
              还有 {moreCount} 条
            </span>
            <span style={{ fontSize: 10, color: C.mute, fontWeight: 400 }}>
              {[
                extraActionable.length > 0 && `${extraActionable.length} 个次要机会`,
                plans.length > 0 && `${plans.length} 条长期规划`,
                warnings.length > 0 && `${warnings.length} 条注意事项`,
              ].filter(Boolean).join(' · ')}
            </span>
          </div>
          <span style={{ fontSize: 12, color: C.mute, fontWeight: 600 }}>展开 ↓</span>
        </button>
      )}

      {/* 展开状态：显示剩余内容 */}
      {hasMore && showAll && (
        <>
          {/* 次要机会 */}
          {extraActionable.length > 0 && (
            <>
              <div style={{
                fontSize: 10, color: C.mute, fontFamily: F_BODY, fontWeight: 600,
                letterSpacing: '0.08em', padding: '4px 4px 6px',
                textTransform: 'uppercase',
              }}>
                次要机会 · {extraActionable.length} 条
              </div>
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 6, marginBottom: 10,
              }}>
                {extraActionable.map((opp, idx) => (
                  <OppTile key={opp.id} opp={opp} rank={TOP + idx + 1} onClick={() => setOpenId(opp.id)} rateBreakdown={rb(opp)} />
                ))}
              </div>
            </>
          )}

          {/* 规划 */}
          {plans.length > 0 && (
            <>
              <div style={{
                fontSize: 10, color: C.mute, fontFamily: F_BODY, fontWeight: 600,
                letterSpacing: '0.08em', padding: '4px 4px 6px',
                textTransform: 'uppercase',
              }}>
                长期规划 · {plans.length} 条
              </div>
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 6, marginBottom: 10,
              }}>
                {plans.map((opp, idx) => (
                  <OppTile key={opp.id} opp={opp} rank={idx + 1} onClick={() => setOpenId(opp.id)} rateBreakdown={rb(opp)} />
                ))}
              </div>
            </>
          )}

          {/* 警告 */}
          {warnings.length > 0 && (
            <>
              <div style={{
                fontSize: 10, color: C.warn, fontFamily: F_BODY, fontWeight: 600,
                letterSpacing: '0.08em', padding: '4px 4px 6px',
                textTransform: 'uppercase',
              }}>
                注意事项 · {warnings.length} 条
              </div>
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 6, marginBottom: 10,
              }}>
                {warnings.map((opp, idx) => (
                  <OppTile key={opp.id} opp={opp} rank={idx + 1} onClick={() => setOpenId(opp.id)} rateBreakdown={rb(opp)} />
                ))}
              </div>
            </>
          )}

          {/* 收起按钮 */}
          <button
            onClick={() => setShowAll(false)}
            style={{
              width: '100%',
              padding: '8px 14px', marginBottom: 12,
              borderRadius: 8,
              background: 'transparent', border: `1px solid ${C.lineLite}`,
              fontSize: 11, color: C.mute, fontFamily: F_BODY, fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            收起 ↑
          </button>
        </>
      )}

      <DetailModal
        open={!!openOpp}
        onClose={() => setOpenId(null)}
        title={openOpp?.title || ''}
        subtitle={openOpp?.tag}
      >
        {openOpp && <OppDetailView opp={openOpp} rateBreakdown={rb(openOpp)} />}
      </DetailModal>
    </>
  );
};

// ═══════════════════════════════════════════════════════════
//  向导式入门弹窗
// ═══════════════════════════════════════════════════════════

const WizardShell = ({ step, totalSteps, title, subtitle, children, onBack, onNext, onClose, isLast, canNext = true }) => (
  <div style={{
    position: 'fixed', inset: 0, zIndex: 100,
    background: 'rgba(13, 13, 13, 0.6)',
    display: 'flex', alignItems: 'stretch', justifyContent: 'center',
    padding: 0,
    fontFamily: F_BODY,
  }}>
    <div style={{
      background: C.bg,
      width: '100%',
      maxWidth: 440,
      display: 'flex', flexDirection: 'column',
      maxHeight: '100vh',
    }}>
      {/* 顶条：进度 + 关闭 */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 16px', borderBottom: `1px solid ${C.line}`,
        background: C.cardAlt,
      }}>
        <button onClick={onClose} style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          fontSize: 18, color: C.mute, padding: 0, lineHeight: 1,
          width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} aria-label="关闭">×</button>
        <div style={{ flex: 1, display: 'flex', gap: 4 }}>
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} style={{
              flex: 1, height: 3, borderRadius: 2,
              background: i < step ? C.hero : i === step - 1 ? C.hero : C.line,
              opacity: i < step ? 1 : i === step - 1 ? 1 : 0.4,
              transition: 'all 0.2s',
            }} />
          ))}
        </div>
        <span style={{
          fontSize: 10, color: C.mute, fontFamily: F_MONO, fontWeight: 600,
          minWidth: 32, textAlign: 'right',
        }}>
          {step}/{totalSteps}
        </span>
      </div>

      {/* 内容 */}
      <div style={{ flex: 1, overflow: 'auto', padding: '20px 16px 16px' }}>
        <div style={{
          fontSize: 10, color: C.mute, fontFamily: F_BODY,
          fontWeight: 600, letterSpacing: '0.12em',
          textTransform: 'uppercase', marginBottom: 6,
        }}>
          第 {step} 步 / 共 {totalSteps} 步
        </div>
        <div style={{
          fontFamily: F_NUM, fontSize: 26, fontWeight: 700,
          color: C.ink, letterSpacing: '-0.02em', lineHeight: 1.15,
          marginBottom: 6,
        }}>
          {title}
        </div>
        {subtitle && (
          <div style={{
            fontSize: 13, color: C.mute, fontFamily: F_BODY,
            lineHeight: 1.5, marginBottom: 20,
          }}>
            {subtitle}
          </div>
        )}
        <div>{children}</div>
      </div>

      {/* 底部按钮 */}
      <div style={{
        display: 'flex', gap: 8,
        padding: '12px 16px', borderTop: `1px solid ${C.line}`,
        background: C.card,
      }}>
        {step > 1 ? (
          <button onClick={onBack} style={{
            padding: '10px 16px', borderRadius: 8,
            background: 'transparent', border: `1px solid ${C.line}`,
            fontSize: 13, fontFamily: F_BODY, fontWeight: 600, color: C.ink2,
            cursor: 'pointer',
          }}>← 上一步</button>
        ) : (
          <div style={{ flex: 0 }} />
        )}
        <div style={{ flex: 1 }} />
        <button onClick={onNext} disabled={!canNext} style={{
          padding: '10px 20px', borderRadius: 8,
          background: canNext ? C.hero : C.line,
          border: 'none',
          fontSize: 13, fontFamily: F_BODY, fontWeight: 700,
          color: canNext ? C.heroInk : C.muteLite,
          cursor: canNext ? 'pointer' : 'default',
          letterSpacing: '0.02em',
        }}>
          {isLast ? '完成 · 查看税负 →' : '下一步 →'}
        </button>
      </div>
    </div>
  </div>
);

// 可点击的大选项卡（单选）
const OptionCard = ({ selected, onClick, title, desc, tag }) => (
  <button
    onClick={onClick}
    style={{
      display: 'block', width: '100%', textAlign: 'left',
      padding: '14px 16px', marginBottom: 8,
      borderRadius: 10,
      background: selected ? C.hero : C.card,
      border: `1px solid ${selected ? C.hero : C.line}`,
      color: selected ? C.heroInk : C.ink,
      cursor: 'pointer',
      transition: 'all 0.15s',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
      <div style={{ fontSize: 14, fontFamily: F_BODY, fontWeight: 700, lineHeight: 1.3 }}>
        {title}
      </div>
      {tag && (
        <span style={{
          fontSize: 9, padding: '2px 6px', borderRadius: 3,
          background: selected ? 'rgba(255,255,255,0.15)' : C.lineLite,
          color: selected ? C.heroInk : C.mute,
          fontFamily: F_BODY, fontWeight: 600, letterSpacing: '0.05em',
          flexShrink: 0,
        }}>{tag}</span>
      )}
    </div>
    {desc && (
      <div style={{
        fontSize: 11, fontFamily: F_BODY, lineHeight: 1.5, marginTop: 4,
        color: selected ? 'rgba(242, 238, 227, 0.75)' : C.mute,
      }}>
        {desc}
      </div>
    )}
  </button>
);

// ═══════════════════════════════════════════════════════════
//  PersonaPicker · 首次打开时的"场景模拟"选择器
// ═══════════════════════════════════════════════════════════

// —————————————————————————————————————————————
// 辅助：计算 persona 的省税金额（只算一次，给多处用）
// —————————————————————————————————————————————
const usePersonaSaving = (persona) => {
  // v101: persona.inputs.state 如果是 CA 省代码 · 走 computeTaxCA
  const isCA = persona.inputs?.state && !!CA_PROV_BRACKETS[persona.inputs.state];
  const calc = useMemo(() => isCA ? computeTaxCA(persona.inputs) : computeTax(persona.inputs), [persona, isCA]);
  const opps = useMemo(() => findOpportunities(persona.inputs, calc), [persona, calc]);
  return opps.filter(o => o.type !== 'warning').reduce((s, o) => s + (o.saving || 0), 0);
};

const compactDollar = (n) => {
  if (n >= 10000) return `${Math.round(n / 1000)}K`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return `${Math.round(n)}`;
};

// —————————————————————————————————————————————
// Step 1 — 大类卡片（横幅式）
// —————————————————————————————————————————————
const PersonaGroupCard = ({ group, onClick }) => {
  // 计算组内所有 persona 的省税范围 + 收入范围
  const savings = group.personas.map(p => {
    const calc = computeTax(p.inputs);
    const opps = findOpportunities(p.inputs, calc);
    return opps.filter(o => o.type !== 'warning').reduce((s, o) => s + (o.saving || 0), 0);
  });
  const incomes = group.personas.map(p => (p.inputs.w2 || 0) + (p.inputs.spouseW2 || 0) + (p.inputs.inc1099 || 0));
  const minS = Math.min(...savings);
  const maxS = Math.max(...savings);
  const minI = Math.min(...incomes);
  const maxI = Math.max(...incomes);
  const d = group.detail || {};
  const scenarios = group.scenarios || [];

  return (
    <div
      style={{
        width: '100%',
        background: group.tint,
        backgroundImage: group.pattern ? `url("${group.pattern}")` : 'none',
        backgroundRepeat: 'repeat',
        border: `1px solid ${C.lineLite}`,
        borderRadius: 10,
        marginBottom: 8,
        fontFamily: F_BODY,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'stretch' }}>
        {/* 左色条 */}
        <div style={{
          width: 3,
          background: group.accent,
          flexShrink: 0,
        }} />
        {/* 主体 · 可点开进 persona 列表 */}
        <button
          onClick={onClick}
          style={{
            flex: 1,
            textAlign: 'left',
            padding: '10px 12px',
            background: `linear-gradient(90deg, ${group.tint} 0%, ${group.tint}F0 60%, ${group.tint}CC 100%)`,
            border: 'none',
            cursor: 'pointer',
            fontFamily: F_BODY,
          }}
        >
          {/* 顶部 · 标题 */}
          <div style={{
            display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 3,
          }}>
            <span style={{
              fontFamily: F_NUM, fontSize: 13, fontWeight: 700,
              color: group.accent, letterSpacing: '-0.02em', lineHeight: 1,
            }}>{group.groupTag}</span>
            <span style={{
              fontSize: 13, fontFamily: F_BODY, fontWeight: 700,
              color: C.ink, lineHeight: 1.1,
            }}>
              {group.group}
            </span>
            <span style={{
              fontSize: 9, color: C.mute, fontFamily: F_BODY, fontWeight: 500,
              marginLeft: 'auto',
            }}>
              {group.personas.length} 种
            </span>
          </div>

          {/* 收入 + 省税 双 pill · 明确标注 */}
          <div style={{
            display: 'flex', gap: 5, flexWrap: 'wrap',
            marginBottom: 5,
          }}>
            <span style={{
              display: 'inline-flex', alignItems: 'baseline', gap: 3,
              padding: '1px 6px', borderRadius: 3,
              background: `${group.accent}15`,
              border: `1px solid ${group.accent}30`,
              lineHeight: 1.3,
            }}>
              <span style={{
                fontSize: 8, color: C.mute, fontFamily: F_MONO,
                letterSpacing: '0.05em', fontWeight: 600,
              }}>收入</span>
              <span style={{
                fontFamily: F_NUM, fontSize: 10, fontWeight: 700,
                color: group.accent, letterSpacing: '-0.01em',
              }}>
                ${compactDollar(minI)}–${compactDollar(maxI)}
              </span>
            </span>
            <span style={{
              display: 'inline-flex', alignItems: 'baseline', gap: 3,
              padding: '1px 6px', borderRadius: 3,
              background: `${C.save}12`,
              border: `1px solid ${C.save}30`,
              lineHeight: 1.3,
            }}>
              <span style={{
                fontSize: 8, color: C.mute, fontFamily: F_MONO,
                letterSpacing: '0.05em', fontWeight: 600,
              }}>可省</span>
              <span style={{
                fontFamily: F_NUM, fontSize: 10, fontWeight: 700,
                color: C.save, letterSpacing: '-0.01em',
              }}>
                ${compactDollar(minS)}–${compactDollar(maxS)}
              </span>
            </span>
          </div>

          {/* blurb · 一句话总结 */}
          <div style={{
            fontSize: 10, color: C.ink2, fontFamily: F_BODY,
            lineHeight: 1.4,
            fontStyle: 'italic',
            marginBottom: 7,
          }}>
            {group.blurb}
          </div>

          {/* v88: scenarios 块已移除 · 描述下放到 Persona 卡 */}

          {/* 痛点 / 省税 */}
          {d.pain && (
            <div style={{
              display: 'grid', gridTemplateColumns: '36px 1fr',
              gap: '1px 6px',
              fontSize: 9, fontFamily: F_BODY, lineHeight: 1.4,
              marginBottom: d.mainOpps ? 2 : 0,
            }}>
              <span style={{
                color: C.pay, fontWeight: 700,
              }}>痛点</span>
              <span style={{
                color: C.ink2,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{d.pain}</span>
            </div>
          )}
          {d.mainOpps && (
            <div style={{
              display: 'grid', gridTemplateColumns: '36px 1fr',
              gap: '1px 6px',
              fontSize: 9, fontFamily: F_BODY, lineHeight: 1.4,
            }}>
              <span style={{
                color: C.save, fontWeight: 700,
              }}>省税</span>
              <span style={{
                color: C.save, fontWeight: 600,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{d.mainOpps}</span>
            </div>
          )}
        </button>
        {/* 右箭头 */}
        <button
          onClick={onClick}
          style={{
            display: 'flex', alignItems: 'center',
            padding: '0 9px',
            color: group.accent,
            fontSize: 16, fontFamily: F_NUM, fontWeight: 700,
            background: 'transparent', border: 'none',
            cursor: 'pointer',
          }}
          aria-label="查看该组所有情景"
        >
          →
        </button>
      </div>
    </div>
  );
};

// —————————————————————————————————————————————
// Step 2 — 组内具体 persona 卡（横幅式，非正方形）
// —————————————————————————————————————————————
const PersonaListItem = ({ persona, accent, tint, onClick }) => {
  const totalSave = usePersonaSaving(persona);
  const i = persona.inputs;

  // 简短概要
  const incomeTotal = (i.w2 || 0) + (i.spouseW2 || 0) + (i.inc1099 || 0);
  const locLabel = i.workState && i.workState !== i.state
    ? `${i.state}→${i.workState}`
    : (i.city === 'nyc' ? 'NYC' : i.state);
  const filingLabel = i.filingStatus === 'MFJ' ? 'MFJ' : i.filingStatus === 'Single' ? 'Single' : 'HoH';
  const kids = (i.children || 0) > 0 ? ` · ${i.children}娃` : '';
  // v79: 收入从 meta 行提到 title 右侧
  const meta = `${filingLabel} · ${locLabel}${kids}`;

  return (
    <button
      onClick={onClick}
      style={{
        display: 'block',
        width: '100%',
        textAlign: 'left',
        padding: 0,
        background: C.card,
        border: `1px solid ${C.lineLite}`,
        borderRadius: 10,
        marginBottom: 7,
        cursor: 'pointer',
        fontFamily: F_BODY,
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'stretch' }}>
        {/* 左竖色条 */}
        <div style={{
          width: 3,
          background: accent,
          flexShrink: 0,
        }} />
        {/* 主体 */}
        <div style={{
          flex: 1,
          padding: '10px 12px',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* v79: title + 收入范围 一行 */}
            <div style={{
              display: 'flex', alignItems: 'baseline', gap: 6,
              marginBottom: 2,
            }}>
              <div style={{
                fontSize: 13, fontFamily: F_BODY, fontWeight: 700,
                color: C.ink, lineHeight: 1.2,
                flex: 1, minWidth: 0,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {persona.title}
              </div>
              <div style={{
                fontSize: 11, fontFamily: F_NUM, fontWeight: 700,
                color: accent, lineHeight: 1,
                padding: '2px 6px', borderRadius: 3,
                background: `${accent}15`,
                border: `1px solid ${accent}30`,
                flexShrink: 0,
                letterSpacing: '-0.01em',
              }}>
                ${compactDollar(incomeTotal)}
              </div>
            </div>
            <div style={{
              fontSize: 10, color: C.mute, fontFamily: F_BODY,
              lineHeight: 1.4, marginBottom: 3,
            }}>
              {persona.subtitle}
            </div>
            <div style={{
              fontSize: 10, color: C.ink2, fontFamily: F_MONO,
              lineHeight: 1.3,
            }}>
              {meta}
            </div>
          </div>
          {/* 右侧 -$ 能省 */}
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{
              fontSize: 9, color: C.mute, fontFamily: F_BODY,
              letterSpacing: '0.08em', textTransform: 'uppercase',
            }}>能省</div>
            <div style={{
              fontFamily: F_NUM, fontWeight: 700,
              color: accent, lineHeight: 1, letterSpacing: '-0.02em',
              marginTop: 3,
              display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end', gap: 1,
            }}>
              <span style={{ fontSize: 10, fontWeight: 500, opacity: 0.7 }}>−$</span>
              <span style={{ fontSize: 18 }}>{compactDollar(totalSave)}</span>
            </div>
            <div style={{
              fontSize: 9, color: C.muteLite, fontFamily: F_BODY, marginTop: 2,
            }}>/ 年</div>
          </div>
        </div>
      </div>
      {/* v88: taxDesc 条 · 取代 hook · 信息更丰富 · accent 色淡底 */}
      {(persona.taxDesc || persona.hook) && (
        <div style={{
          padding: '7px 12px 8px 15px',
          background: `${accent}0F`,
          borderTop: `1px solid ${accent}22`,
          fontSize: 10, color: C.ink2, fontFamily: F_BODY,
          lineHeight: 1.4,
        }}>
          <span style={{
            color: accent, fontWeight: 700, marginRight: 4,
            fontSize: 10,
          }}>※</span>
          {persona.taxDesc || persona.hook}
        </div>
      )}
    </button>
  );
};

// —————————————————————————————————————————————
// PersonaPicker · 两步式弹窗
// —————————————————————————————————————————————
const PersonaPicker = ({ onPick, onSelfInput, onClose, country }) => {
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [filingFilter, setFilingFilter] = useState('Single'); // 'Single' | 'MFJ'

  // v101: 根据 country 选 persona 集
  const personaGroupsData = country === 'CA' ? PERSONA_GROUPS_CA : PERSONA_GROUPS;

  // 筛选逻辑：把每个组的 personas 过滤
  const filterPersonas = (personas) => {
    if (filingFilter === 'all') return personas;
    return personas.filter(p => {
      const fs = p.inputs?.filingStatus;
      if (filingFilter === 'Single') return fs === 'Single' || fs === 'HoH';
      if (filingFilter === 'MFJ') return fs === 'MFJ' || fs === 'MFS';
      return true;
    });
  };

  // 按筛选后 persona 数过滤掉空组
  const filteredGroups = personaGroupsData
    .map(g => ({ ...g, personas: filterPersonas(g.personas) }))
    .filter(g => g.personas.length > 0);

  const totalCount = filteredGroups.reduce((s, g) => s + g.personas.length, 0);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 110,
      background: 'rgba(13, 13, 13, 0.6)',
      display: 'flex', alignItems: 'stretch', justifyContent: 'center',
      padding: 0,
      fontFamily: F_BODY,
    }}>
      <div style={{
        background: C.bg,
        width: '100%',
        maxWidth: 440,
        display: 'flex', flexDirection: 'column',
        maxHeight: '100vh',
      }}>
        {/* 顶条 · v85 紧凑 */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 14px', borderBottom: `1px solid ${C.line}`,
          background: C.cardAlt,
        }}>
          {selectedGroup ? (
            <button onClick={() => setSelectedGroup(null)} style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              fontSize: 11, color: C.ink2, padding: 0, lineHeight: 1,
              display: 'flex', alignItems: 'center', gap: 3,
              fontFamily: F_BODY, fontWeight: 600,
            }} aria-label="返回">
              <span style={{ fontSize: 14 }}>‹</span>
              <span>返回</span>
            </button>
          ) : (
            <button onClick={onClose} style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              fontSize: 16, color: C.mute, padding: 0, lineHeight: 1,
              width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }} aria-label="关闭">×</button>
          )}
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{
              fontFamily: F_NUM, fontSize: 13, fontWeight: 700,
              color: C.ink, lineHeight: 1.1,
            }}>
              {selectedGroup ? `${selectedGroup.groupTag}. ${selectedGroup.group}` : '选个情景'}
            </div>
            <div style={{
              fontSize: 8, color: C.mute, fontFamily: F_BODY,
              letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 1,
            }}>
              {selectedGroup ? `${selectedGroup.personas.length} 种 · 选最像的` : `${totalCount} 种 · ${filteredGroups.length} 大类`}
            </div>
          </div>
          {selectedGroup ? (
            <button onClick={onClose} style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              fontSize: 16, color: C.mute, padding: 0, lineHeight: 1,
              width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }} aria-label="关闭">×</button>
          ) : (
            <div style={{ width: 22 }} />
          )}
        </div>

        {/* 内容 · v85 padding 14→10 */}
        <div style={{ flex: 1, overflow: 'auto', padding: '10px 12px 14px' }}>
          {!selectedGroup && (
            <>
              {/* v50: 筛选条 · 单身/MFJ · v85 紧凑 + 绿 */}
              <div style={{
                display: 'flex', gap: 5, marginBottom: 8,
                padding: 2, borderRadius: 7,
                background: C.cardAlt, border: `1px solid ${C.line}`,
              }}>
                {[
                  { key: 'Single', label: '单身 / HoH', sub: 'Single' },
                  { key: 'MFJ', label: '已婚', sub: 'MFJ · MFS' },
                ].map(opt => {
                  const active = filingFilter === opt.key;
                  return (
                    <button
                      key={opt.key}
                      onClick={() => setFilingFilter(opt.key)}
                      style={{
                        flex: 1, padding: '5px 4px',
                        background: active ? C.save : 'transparent',
                        color: active ? '#FFF' : C.ink2,
                        border: 'none', borderRadius: 5,
                        cursor: 'pointer',
                        fontFamily: F_BODY,
                        fontSize: 11, fontWeight: 700,
                        letterSpacing: '0.02em',
                        transition: 'all 0.15s',
                      }}
                    >
                      <div>{opt.label}</div>
                      <div style={{
                        fontSize: 7, fontFamily: F_MONO,
                        fontWeight: 600, letterSpacing: '0.06em',
                        color: active ? '#FFFFFF99' : C.muteLite,
                        marginTop: 1,
                      }}>{opt.sub}</div>
                    </button>
                  );
                })}
              </div>

              {/* Step 1: 大类卡（按筛选） */}
              {filteredGroups.map(g => (
                <PersonaGroupCard
                  key={g.group}
                  group={g}
                  onClick={() => setSelectedGroup(g)}
                />
              ))}
              {filteredGroups.length === 0 && (
                <div style={{
                  padding: 24, textAlign: 'center',
                  fontSize: 11, color: C.mute, fontFamily: F_BODY,
                }}>
                  当前筛选下无匹配角色
                </div>
              )}

              {/* 分隔 · v85 紧凑 */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                margin: '10px 0 8px',
              }}>
                <div style={{ flex: 1, height: 1, background: C.line }} />
                <span style={{
                  fontSize: 9, color: C.muteLite, fontFamily: F_BODY,
                  letterSpacing: '0.15em',
                }}>或</span>
                <div style={{ flex: 1, height: 1, background: C.line }} />
              </div>

              <button
                onClick={onSelfInput}
                style={{
                  width: '100%',
                  padding: '9px 16px',
                  borderRadius: 8,
                  background: C.hero, border: 'none',
                  color: C.heroInk, fontFamily: F_BODY, fontWeight: 700,
                  fontSize: 12, cursor: 'pointer',
                  letterSpacing: '0.02em',
                }}
              >
                ✎ 填我自己的信息 →
              </button>

              <div style={{
                fontSize: 9, color: C.muteLite, fontFamily: F_BODY,
                textAlign: 'center', marginTop: 6, lineHeight: 1.4,
              }}>
                数据只存本地 · 不上传 · 不收集
              </div>
            </>
          )}

          {selectedGroup && (
            <>
              {/* Step 2: 该组内的 persona 列表 */}
              {selectedGroup.personas.map(p => (
                <PersonaListItem
                  key={p.id}
                  persona={p}
                  accent={selectedGroup.accent}
                  tint={selectedGroup.tint}
                  onClick={() => onPick(p)}
                />
              ))}

              <div style={{
                fontSize: 10, color: C.muteLite, fontFamily: F_BODY,
                textAlign: 'center', marginTop: 10, lineHeight: 1.5,
              }}>
                点一张卡即加载 · 之后随时改数据
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const Wizard = ({ initial, onComplete, onCancel, country }) => {
  const [draft, setDraft] = useState(initial || PRESETS.blank);
  const [step, setStep] = useState(1);
  const update = (patch) => setDraft(d => ({ ...d, ...patch }));

  // v105: 根据 country 选计算引擎
  const isCA = country === 'CA';
  // 计算实时税负预览（用于最终 step 的预览）
  const previewCalc = useMemo(() => isCA ? computeTaxCA(draft) : computeTax(draft), [draft, isCA]);

  const totalSteps = 4;
  const next = () => {
    if (step >= totalSteps) {
      onComplete(draft);
    } else {
      setStep(s => s + 1);
    }
  };
  const back = () => setStep(s => Math.max(1, s - 1));

  // ═══ Step 1: 家庭 + 收入 ═══
  if (step === 1) {
    return (
      <WizardShell
        step={step} totalSteps={totalSteps}
        title="先来点基础信息"
        subtitle="花 30 秒让我们知道你家的收入构成。你可以之后随时修改。"
        onBack={back} onNext={next} onClose={onCancel}
        canNext={draft.w2 > 0 || draft.inc1099 > 0 || draft.spouseW2 > 0}
      >
        {/* 申报状态 */}
        <div style={{ marginBottom: 20 }}>
          <div style={{
            fontSize: 11, color: C.ink2, fontFamily: F_BODY,
            fontWeight: 600, marginBottom: 8,
          }}>
            申报身份
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[
              { v: 'MFJ', l: '夫妻合并', d: '已婚 MFJ' },
              { v: 'Single', l: '单身', d: '未婚' },
              { v: 'HoH', l: '户主', d: '带孩子单亲' },
            ].map(opt => (
              <button
                key={opt.v}
                onClick={() => update({ filingStatus: opt.v, spouseW2: opt.v !== 'MFJ' ? 0 : draft.spouseW2 })}
                style={{
                  flex: 1, padding: '10px 8px', borderRadius: 8,
                  background: draft.filingStatus === opt.v ? C.hero : C.card,
                  border: `1px solid ${draft.filingStatus === opt.v ? C.hero : C.line}`,
                  color: draft.filingStatus === opt.v ? C.heroInk : C.ink2,
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontSize: 12, fontFamily: F_BODY, fontWeight: 700 }}>{opt.l}</div>
                <div style={{
                  fontSize: 9, marginTop: 2,
                  color: draft.filingStatus === opt.v ? 'rgba(242,238,227,0.7)' : C.mute,
                }}>{opt.d}</div>
              </button>
            ))}
          </div>
        </div>

        {/* W2 / T4 */}
        <Slider
          label={isCA ? '你的 T4 年薪' : '你的 W2 年薪'}
          value={draft.w2}
          onChange={(v) => update({ w2: v })}
          min={0} max={500000} step={5000}
        />
        {draft.filingStatus === 'MFJ' && (
          <Slider
            label={isCA ? '配偶 T4 年薪' : '配偶 W2 年薪'}
            value={draft.spouseW2}
            onChange={(v) => update({ spouseW2: v })}
            min={0} max={400000} step={5000}
          />
        )}

        {/* 1099 / 自雇 */}
        <Slider
          label={isCA ? '自雇 / 合同工收入' : '1099 自雇收入'}
          value={draft.inc1099}
          onChange={(v) => update({ inc1099: v })}
          min={0} max={300000} step={1000}
          hint={draft.inc1099 > 0 ? '副业、咨询、自由职业都算' : '没有就拖到 $0'}
        />
        {draft.inc1099 > 0 && (
          <Slider
            label={isCA ? '自雇业务开支 (T2125)' : '1099 业务开支'}
            value={draft.expense1099}
            onChange={(v) => update({ expense1099: v })}
            min={0} max={draft.inc1099} step={500}
            hint="软件、设备、服务、出差相关"
          />
        )}
      </WizardShell>
    );
  }

  // ═══ Step 2: 居住 + 工作 ═══
  if (step === 2) {
    const hasCities = !!CITIES_BY_STATE[draft.state];
    // v105: CA 的工作情景简化 · 加拿大按 12/31 所在省报税 · 无 reciprocal
    const workScenariosUS = [
      { id: 'onsite', title: '本州上班', desc: '住哪里工作就在哪里（或 reciprocal 州）', apply: () => update({ workState: '', workStateDays: 100 }), isMatch: !draft.workState },
      { id: 'cross', title: '跨州通勤', desc: '例如 NJ 住 · NY 上班，每天通勤', apply: () => update({ workState: draft.workState || (draft.state === 'NJ' ? 'NY' : 'NJ'), workStateDays: 100 }), isMatch: draft.workState && (draft.workStateDays ?? 100) >= 80 },
      { id: 'hybrid', title: '混合 WFH', desc: '一半远程一半到岗（3+2 / 4+1 都算）', apply: () => update({ workState: draft.workState || (draft.state === 'NY' ? 'NY' : 'NY'), workStateDays: 50 }), isMatch: draft.workState && (draft.workStateDays ?? 100) >= 30 && (draft.workStateDays ?? 100) < 80 },
      { id: 'fullWFH', title: '100% WFH', desc: '完全远程，可以搬到任何地方', apply: () => update({ workState: draft.workState || draft.state, workStateDays: 0 }), isMatch: draft.workState && (draft.workStateDays ?? 100) < 30 },
    ];
    const workScenariosCA = [
      { id: 'localOnsite', title: '本省上班', desc: '最常见 · 住和工作都在同省', apply: () => update({ workState: '', workStateDays: 100 }), isMatch: !draft.workState },
      { id: 'crossProv', title: '跨省工作', desc: '例如住安省 · 常去魁省出差 / 工作', apply: () => update({ workState: draft.workState || (draft.state === 'ON' ? 'QC' : 'ON'), workStateDays: 50 }), isMatch: draft.workState && draft.workState !== draft.state },
      { id: 'remote', title: '远程（全国或海外）', desc: '按 12/31 所在省报税 · 数字游民常见', apply: () => update({ workState: '', workStateDays: 0 }), isMatch: false },
    ];
    const workScenarios = isCA ? workScenariosCA : workScenariosUS;

    return (
      <WizardShell
        step={step} totalSteps={totalSteps}
        title={isCA ? '你住哪个省？' : '你住哪里？在哪工作？'}
        subtitle={isCA
          ? '加拿大按 12/31 所在省报税 · 选对省份决定税率和省级福利。'
          : '居住州 × 工作州 × 远程天数 —— 决定你交给哪个州税。'}
        onBack={back} onNext={next} onClose={onCancel}
      >
        {/* 居住州 / 省 · v114 用 grid 对齐两个下拉 */}
        <div style={{ marginBottom: 16 }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: hasCities ? '1fr 1fr' : '1fr',
            gap: 8,
          }}>
            <div>
              <div style={{
                fontSize: 11, color: C.ink2, fontFamily: F_BODY,
                fontWeight: 600, marginBottom: 6,
              }}>
                {isCA ? '你的居住省（税务居民）' : '你的居住州（税务居民）'}
              </div>
              <StateSelect
                value={draft.state}
                onChange={(v) => update({ state: v, city: CITIES_BY_STATE[v] ? draft.city : '' })}
                country={country}
                label=""
              />
            </div>
            {hasCities && (
              <div>
                <div style={{
                  fontSize: 11, color: C.ink2, fontFamily: F_BODY,
                  fontWeight: 600, marginBottom: 6,
                }}>
                  市/地方税
                </div>
                <CitySelect
                  state={draft.state}
                  value={draft.city}
                  onChange={(v) => update({ city: v })}
                  label=""
                />
              </div>
            )}
          </div>
          {isCA
            ? (CA_PROV_BRACKETS[draft.state]?.note && (
                <div style={{
                  fontSize: 10, color: C.info, fontFamily: F_BODY,
                  background: C.infoBg, padding: '6px 10px', borderRadius: 6,
                  marginTop: 8, lineHeight: 1.5,
                }}>
                  ¶ {CA_PROV_BRACKETS[draft.state].label}: {CA_PROV_BRACKETS[draft.state].note}
                </div>
              ))
            : (STATE_BRACKETS[draft.state]?.note && (
                <div style={{
                  fontSize: 10, color: C.info, fontFamily: F_BODY,
                  background: C.infoBg, padding: '6px 10px', borderRadius: 6,
                  marginTop: 8, lineHeight: 1.5,
                }}>
                  ¶ {STATE_BRACKETS[draft.state].label}: {STATE_BRACKETS[draft.state].note}
                </div>
              ))}
        </div>

        {/* 工作情景 */}
        <div style={{ marginBottom: 16 }}>
          <div style={{
            fontSize: 11, color: C.ink2, fontFamily: F_BODY,
            fontWeight: 600, marginBottom: 8,
          }}>
            你的工作情景
          </div>
          {workScenarios.map(s => (
            <OptionCard
              key={s.id}
              selected={s.isMatch}
              onClick={s.apply}
              title={s.title}
              desc={s.desc}
            />
          ))}
        </div>

        {/* 如果需要选工作州 · CA 无 Convenience Rule · 直接简版 */}
        {draft.workState && (
          <div style={{
            padding: 12, borderRadius: 10,
            background: C.cardAlt, border: `1px solid ${C.line}`,
          }}>
            <div style={{
              fontSize: 11, color: C.ink2, fontFamily: F_BODY,
              fontWeight: 600, marginBottom: 8,
            }}>
              {isCA ? '主要工作省份' : '工作州（W2 发薪州）'}
            </div>
            <StateSelect
              value={draft.workState}
              onChange={(v) => update({ workState: v })}
              country={country}
            />
            {!isCA && CONVENIENCE_RULE_STATES[draft.workState] && (draft.workStateDays ?? 100) < 100 && (
              <div style={{
                fontSize: 10, color: C.warn, fontFamily: F_BODY, lineHeight: 1.5,
                background: C.warnBg, padding: '6px 10px', borderRadius: 6, marginTop: 8,
              }}>
                † {STATE_BRACKETS[draft.workState].label} 有 Convenience Rule —— 即使你远程，该州仍按 100% 征税
              </div>
            )}
          </div>
        )}
      </WizardShell>
    );
  }

  // ═══ Step 3: 房产 ═══
  if (step === 3) {
    const props = draft.properties || [];
    const hasHome = props.some(p => p.type === 'primary');

    return (
      <WizardShell
        step={step} totalSteps={totalSteps}
        title="房产情况"
        subtitle="有没有买房？出租房？每套可以在不同州 —— 这步可以跳过，之后再加。"
        onBack={back} onNext={next} onClose={onCancel}
      >
        {props.length === 0 ? (
          <div>
            <OptionCard
              selected={false}
              onClick={() => update({
                properties: [{
                  id: Date.now(), type: 'primary', state: draft.state,
                  propertyTax: 8000, mortInt: 12000,
                }],
              })}
              title="我有房产"
              desc="添加一套（自住 / 出租 / 度假都行 · 默认自住 · 之后可改类型 + 继续加）"
              tag="+"
            />
            <OptionCard
              selected={true}
              onClick={() => {}}
              title="暂无房产 · 租房"
              desc="跳过 · 进入下一步"
            />
          </div>
        ) : (
          <div>
            <div style={{ marginBottom: 12 }}>
              {props.map((p, idx) => {
                const type = PROPERTY_TYPES.find(t => t.v === p.type) || PROPERTY_TYPES[0];
                return (
                  <div key={p.id || idx} style={{
                    padding: 12, marginBottom: 8, borderRadius: 10,
                    background: C.card, border: `1px solid ${C.line}`,
                  }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      marginBottom: 10,
                    }}>
                      <span style={{
                        fontFamily: F_MONO, fontSize: 11, fontWeight: 700,
                        color: C.mute, padding: '2px 6px',
                        border: `1px solid ${C.line}`, borderRadius: 4,
                        letterSpacing: '0.05em', flexShrink: 0,
                      }}>{type.icon}</span>
                      <SegButton
                        options={PROPERTY_TYPES.map(t => ({ v: t.v, l: t.l }))}
                        value={p.type}
                        onChange={(v) => {
                          const next = [...props];
                          next[idx] = { ...next[idx], type: v };
                          update({ properties: next });
                        }}
                        size="sm"
                      />
                      <button
                        onClick={() => {
                          const next = props.filter((_, k) => k !== idx);
                          update({ properties: next });
                        }}
                        style={{
                          marginLeft: 'auto',
                          background: 'transparent', border: 'none',
                          color: C.mute, cursor: 'pointer',
                          fontSize: 16, padding: '0 4px',
                        }}
                      >×</button>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <div style={{
                        fontSize: 10, color: C.mute, fontFamily: F_BODY,
                        fontWeight: 500, marginBottom: 4,
                      }}>房产所在州</div>
                      <StateSelect
                        value={p.state}
                        onChange={(v) => {
                          const next = [...props];
                          next[idx] = { ...next[idx], state: v };
                          update({ properties: next });
                        }}
                      />
                    </div>
                    <Slider label="房贷年利息" value={Number(p.mortInt) || 0}
                      onChange={(v) => {
                        const next = [...props];
                        next[idx] = { ...next[idx], mortInt: v };
                        update({ properties: next });
                      }}
                      min={0} max={60000} step={500}
                    />
                    <Slider label="地税 + 学校税" value={Number(p.propertyTax) || 0}
                      onChange={(v) => {
                        const next = [...props];
                        next[idx] = { ...next[idx], propertyTax: v };
                        update({ properties: next });
                      }}
                      min={0} max={50000} step={500}
                    />
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => update({
                  properties: [...props, {
                    id: Date.now(), type: 'second_home', state: draft.state,
                    propertyTax: 6000, mortInt: 10000,
                  }],
                })}
                style={{
                  flex: 1, padding: '8px', borderRadius: 6,
                  background: C.card, border: `1px dashed ${C.line}`,
                  fontSize: 11, fontFamily: F_BODY, color: C.ink2,
                  cursor: 'pointer', fontWeight: 600,
                }}
              >+ 加二套/度假房</button>
              <button
                onClick={() => update({
                  properties: [...props, {
                    id: Date.now(), type: 'rental', state: draft.state,
                    propertyTax: 5000, mortInt: 9000,
                    rentalIncome: 24000, rentalExpenses: 4000, depreciation: 8000,
                  }],
                })}
                style={{
                  flex: 1, padding: '8px', borderRadius: 6,
                  background: C.card, border: `1px dashed ${C.line}`,
                  fontSize: 11, fontFamily: F_BODY, color: C.ink2,
                  cursor: 'pointer', fontWeight: 600,
                }}
              >+ 加出租房</button>
            </div>
          </div>
        )}
      </WizardShell>
    );
  }

  // ═══ Step 4: 供款 + 预览 ═══
  return (
    <WizardShell
      step={step} totalSteps={totalSteps}
      title="最后一步 · 你已有的供款"
      subtitle={isCA
        ? '已经存进 RRSP 的金额 · 影响当年可退税 —— 不填也可以，后面再补。'
        : '这一步的内容直接影响 AGI 和 itemize —— 不填也可以，后面再补。'}
      onBack={back} onNext={next} onClose={onCancel}
      isLast
    >
      {/* CA: RRSP · US: 401k */}
      <Slider
        label={isCA ? '今年已存 RRSP' : '今年已存 401(k)'}
        value={draft.k401}
        onChange={(v) => update({ k401: v })}
        min={0}
        max={isCA ? CA_RRSP_LIMIT : K401_LIMIT_2025}
        step={500}
        hint={isCA
          ? `2025 上限 $${CA_RRSP_LIMIT.toLocaleString()} 或 18% × 上年收入`
          : `2025 上限 $${K401_LIMIT_2025.toLocaleString()}`
        }
      />
      {/* US only: HDHP + HSA · CA 无 */}
      {!isCA && (
        <div style={{ marginBottom: 12 }}>
          <Toggle label="有 HDHP 高自付医保" value={draft.hdhp} onChange={(v) => update({ hdhp: v })} hint="HSA 开户前提" />
          {draft.hdhp && (
            <Slider label="已存 HSA" value={draft.hsa} onChange={(v) => update({ hsa: v })}
              min={0}
              max={draft.filingStatus === 'MFJ' ? HSA_LIMIT_2025.Family : HSA_LIMIT_2025.Self}
              step={100}
            />
          )}
        </div>
      )}
      {/* CA only: FHSA 开户标记 + 提示 */}
      {isCA && (
        <div style={{
          padding: '12px 14px',
          marginBottom: 14,
          background: C.cardAlt,
          border: `1px solid ${C.lineLite}`,
          borderRadius: 10,
          fontSize: 11,
          color: C.ink2,
          fontFamily: F_BODY,
          lineHeight: 1.6,
        }}>
          <div style={{ fontWeight: 700, color: C.ink, marginBottom: 4 }}>※ CA 其它账户</div>
          <div>· <b>TFSA</b>：年限 $7K · 累计 $102K · 存钱不减当年税 · 投资免税取出免税</div>
          <div>· <b>FHSA</b>：年限 $8K · 终生 $40K · 减税 + 买首房免税取 · 没房者必开</div>
          <div style={{ marginTop: 4, color: C.mute }}>这些账户在主界面的省税机会卡片里给建议 · 不需要在这里输入。</div>
        </div>
      )}
      <Slider label="孩子人数" value={draft.children} onChange={(v) => update({ children: v })}
        min={0} max={5} step={1} format={(n) => `${n}`} prefix=""
      />

      {/* 实时预览 */}
      <div style={{
        marginTop: 20, padding: 16, borderRadius: 12,
        background: C.hero, color: C.heroInk,
      }}>
        <div style={{
          fontSize: 10, color: C.heroMute, fontFamily: F_BODY,
          fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase',
          marginBottom: 6,
        }}>
          实时预览 · 按你当前输入
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
          <span style={{
            fontFamily: F_NUM, fontSize: 30, fontWeight: 700,
            letterSpacing: '-0.02em', color: C.heroInk,
          }}>
            ${fmt(previewCalc.totalTax)}
          </span>
          <span style={{ fontSize: 11, color: C.heroMute }}>预估总税负</span>
        </div>
        <div style={{ fontSize: 11, color: C.heroMute }}>
          税后到手 <b style={{ color: '#A8D5B8', fontFamily: F_NUM }}>${fmt(previewCalc.takeHome)}</b>
          &nbsp;·&nbsp;
          有效税率 <b style={{ color: C.heroInk, fontFamily: F_NUM }}>{pct(previewCalc.effectiveRate)}</b>
        </div>
      </div>

      <div style={{
        marginTop: 14, fontSize: 11, color: C.mute, fontFamily: F_BODY,
        lineHeight: 1.5, textAlign: 'center',
      }}>
        点完成后，你会看到省税机会、假设场景、最优居住地等分析
      </div>
    </WizardShell>
  );
};

// ═══════════════════════════════════════════════════════════
//  主应用
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
//  ThemePickerModal · 主题选择弹窗
// ═══════════════════════════════════════════════════════════
const ThemePickerModal = ({ activeThemeId, onSelect, onClose }) => {
  const themeList = Object.values(THEMES);
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 150,
        background: 'rgba(13, 13, 13, 0.55)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 440,
          background: C.card,
          borderTopLeftRadius: 18, borderTopRightRadius: 18,
          padding: '14px 14px 22px',
          maxHeight: '85vh', overflow: 'auto',
        }}
      >
        {/* 顶部拉条 + 标题 */}
        <div style={{
          width: 36, height: 4, borderRadius: 2,
          background: C.line, margin: '0 auto 10px',
        }} />
        <div style={{
          display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
          marginBottom: 12,
        }}>
          <div>
            <div style={{
              fontFamily: F_NUM, fontSize: 18, fontWeight: 700, color: C.ink,
              letterSpacing: '-0.01em',
            }}>
              选择主题
            </div>
            <div style={{
              fontSize: 10, color: C.mute, fontFamily: F_BODY,
              marginTop: 2,
            }}>
              换一种心情浏览你的税务
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              fontSize: 11, color: C.mute, background: 'transparent',
              border: 'none', cursor: 'pointer', fontFamily: F_BODY,
            }}
          >
            关闭 ×
          </button>
        </div>

        {/* 主题卡片网格 */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
        }}>
          {themeList.map(t => {
            const isActive = t.id === activeThemeId;
            return (
              <button
                key={t.id}
                onClick={() => { onSelect(t.id); onClose(); }}
                style={{
                  border: `2px solid ${isActive ? C.ink : 'transparent'}`,
                  borderRadius: 10,
                  padding: 0,
                  background: 'transparent',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  textAlign: 'left',
                  position: 'relative',
                }}
              >
                {/* 预览卡 · 模仿 Hero 底色样式 */}
                <div style={{
                  height: 72,
                  background: t.heroBg,
                  backgroundImage: `
                    linear-gradient(${t.heroOverlay}, ${t.heroOverlay}),
                    url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='60' height='60'><circle cx='1.5' cy='1.5' r='0.6' fill='${encodeURIComponent(t.heroDot)}' opacity='0.3'/><circle cx='30' cy='30' r='0.5' fill='${encodeURIComponent(t.heroDot)}' opacity='0.25'/></svg>")
                  `,
                  borderBottom: `1px solid ${t.heroBorder}`,
                  position: 'relative',
                }}>
                  {/* 预览：左上角 4 格 + 右上角 dot 装饰 */}
                  <div style={{
                    position: 'absolute', top: 6, left: 6,
                    width: 8, height: 8,
                    borderLeft: `1px solid ${t.accent}`,
                    borderTop: `1px solid ${t.accent}`,
                    opacity: 0.55,
                  }} />
                  <div style={{
                    position: 'absolute', top: 6, right: 6,
                    fontSize: 10, fontFamily: F_MONO,
                    color: t.accent, opacity: 0.65,
                  }}>
                    {t.dotEmoji}
                  </div>
                  {/* 示例大字数字 */}
                  <div style={{
                    position: 'absolute', bottom: 4, left: 8,
                    fontFamily: F_NUM, fontSize: 18, fontWeight: 800,
                    color: t.accent, letterSpacing: '-0.02em', lineHeight: 1,
                    opacity: 0.82,
                  }}>
                    $240K
                  </div>
                  {/* Active 标签 */}
                  {isActive && (
                    <div style={{
                      position: 'absolute', bottom: 5, right: 5,
                      fontSize: 8, fontFamily: F_BODY,
                      padding: '2px 6px', borderRadius: 3,
                      background: C.ink, color: C.card,
                      fontWeight: 700, letterSpacing: '0.08em',
                    }}>
                      当前
                    </div>
                  )}
                </div>
                {/* 底部标签 */}
                <div style={{
                  padding: '7px 9px', background: C.card,
                }}>
                  <div style={{
                    fontFamily: F_NUM, fontSize: 13, fontWeight: 700,
                    color: C.ink,
                  }}>
                    {t.label}
                  </div>
                  <div style={{
                    fontFamily: F_MONO, fontSize: 9, color: C.mute,
                    letterSpacing: '0.02em', marginTop: 1,
                  }}>
                    {t.sub}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div style={{
          marginTop: 12,
          fontSize: 9, color: C.muteLite, fontFamily: F_BODY,
          textAlign: 'center', letterSpacing: '0.02em',
        }}>
          § 你的选择会自动保存到本地 · 随时可切换
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
//  v81: 姊妹工具卡 · Rate Navigator 外链
//  展开后显示 5 个计算器 · 每个点击跳到 rate.jmjvc.us/#xxx
// ═══════════════════════════════════════════════════════════
const RATE_NAV_TOOLS = [
  {
    hash: 'estimate',
    name: '月供估算',
    en: 'Monthly Payment',
    desc: '输入房价 / 首付 / 利率 · 实时算每月 PITI · 20 / 25 / 30 年对比',
    highlight: '最常用',
  },
  {
    hash: 'arm',
    name: 'ARM vs Fixed',
    en: 'ARM vs Fixed',
    desc: '5/1 · 7/1 · 10/1 ARM 和 30Y Fixed 对比 · 看多少年内 ARM 划算',
    highlight: null,
  },
  {
    hash: 'points',
    name: 'Points 对比',
    en: 'Points Comparison',
    desc: '买 point 降利率值不值 · 算 break-even 月数 · 长短持有策略',
    highlight: null,
  },
  {
    hash: 'refi',
    name: 'Refi · CEMA 省税',
    en: 'Refinance · CEMA',
    desc: 'Refi 月供对比 · NY CEMA 省 Mortgage Recording Tax 0.5-1.925%',
    highlight: 'NY',
  },
  {
    hash: 'exchange',
    name: '1031 Exchange',
    en: 'Like-Kind Exchange',
    desc: '投资房换房延税 · 45 / 180 天规则 · QI 流程 · boot 计算',
    highlight: 'HOT',
  },
];

const RateNavCard = () => {
  const [open, setOpen] = useState(false);

  return (
    <div style={{
      background: C.card,
      border: `1px solid ${C.line}`,
      borderRadius: 14,
      marginBottom: 10,
      overflow: 'hidden',
    }}>
      {/* Header · 永远显示 */}
      <a
        href="https://rate.jmjvc.us/#estimate"
        target="_blank"
        rel="noopener"
        style={{
          display: 'block',
          padding: '14px 16px',
          textDecoration: 'none',
          color: 'inherit',
          cursor: 'pointer',
        }}
      >
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'baseline', marginBottom: 6,
        }}>
          <span style={{
            fontSize: 9, color: C.info, fontFamily: F_MONO,
            letterSpacing: '0.1em', fontWeight: 700,
          }}>◆ 姊妹工具</span>
          <span style={{
            fontSize: 9, color: C.mute, fontFamily: F_MONO,
            letterSpacing: '0.04em',
          }}>rate.jmjvc.us</span>
        </div>
        <div style={{
          fontSize: 16, fontWeight: 700, color: C.ink,
          marginBottom: 6, letterSpacing: '-0.01em',
        }}>
          利率导航 · 月供 / 方案对比
        </div>
        <div style={{
          fontSize: 11, color: C.mute, fontFamily: F_BODY,
          lineHeight: 1.55, marginBottom: 10,
        }}>
          房贷利率 · 首付 · Points · ARM vs Fixed · CEMA 省税 · 1031 Exchange · 同时比三个方案谁最省。
        </div>
        <div style={{
          display: 'flex', gap: 6, flexWrap: 'wrap',
          marginBottom: 10,
        }}>
          {['月供', 'ARM', 'Points', 'Refi', '1031'].map(chip => (
            <span key={chip} style={{
              fontSize: 10, padding: '2px 7px',
              background: C.cardAlt, border: `1px solid ${C.lineLite}`,
              borderRadius: 4, color: C.ink2, fontWeight: 500,
            }}>{chip}</span>
          ))}
        </div>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', paddingTop: 8,
          borderTop: `1px solid ${C.lineLite}`,
        }}>
          <span style={{
            fontSize: 11, color: C.ink, fontWeight: 600,
          }}>打开主计算器</span>
          <span style={{
            fontSize: 14, color: C.info, fontWeight: 700,
          }}>→</span>
        </div>
      </a>

      {/* 展开按钮条 */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          padding: '10px 16px',
          background: open ? C.cardAlt : 'transparent',
          border: 'none',
          borderTop: `1px solid ${C.lineLite}`,
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontFamily: F_BODY,
        }}
      >
        <span style={{
          fontSize: 11, color: C.ink2, fontWeight: 600,
        }}>
          看全部 5 个工具
        </span>
        <span style={{
          fontSize: 11, color: C.mute,
          transform: open ? 'rotate(180deg)' : 'none',
          transition: 'transform 0.2s',
        }}>▾</span>
      </button>

      {/* 5 工具列表 · 展开时显示 */}
      {open && (
        <div style={{
          padding: '4px 12px 12px',
          background: C.cardAlt,
          borderTop: `1px solid ${C.lineLite}`,
        }}>
          {RATE_NAV_TOOLS.map((t, idx) => (
            <a
              key={t.hash}
              href={`https://rate.jmjvc.us/#${t.hash}`}
              target="_blank"
              rel="noopener"
              style={{
                display: 'block',
                padding: '10px 12px',
                marginTop: 6,
                background: C.card,
                border: `1px solid ${C.lineLite}`,
                borderRadius: 8,
                textDecoration: 'none',
                color: 'inherit',
                cursor: 'pointer',
                fontFamily: F_BODY,
              }}
            >
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'baseline', marginBottom: 3,
              }}>
                <div style={{
                  display: 'flex', alignItems: 'baseline', gap: 6, flex: 1, minWidth: 0,
                }}>
                  <span style={{
                    fontFamily: F_NUM, fontSize: 11, fontWeight: 700,
                    color: C.mute, letterSpacing: '-0.02em',
                  }}>{idx + 1}</span>
                  <span style={{
                    fontSize: 12, fontWeight: 700, color: C.ink,
                  }}>{t.name}</span>
                  <span style={{
                    fontSize: 9, color: C.mute, fontFamily: F_MONO,
                    letterSpacing: '0.03em',
                  }}>· {t.en}</span>
                </div>
                {t.highlight && (
                  <span style={{
                    fontSize: 9, padding: '1px 5px', borderRadius: 3,
                    background: t.highlight === 'HOT' ? C.warnBg
                      : t.highlight === 'NY' ? C.infoBg : C.saveBg,
                    color: t.highlight === 'HOT' ? C.warn
                      : t.highlight === 'NY' ? C.info : C.save,
                    fontWeight: 700, fontFamily: F_MONO,
                    letterSpacing: '0.05em',
                    flexShrink: 0,
                  }}>{t.highlight}</span>
                )}
              </div>
              <div style={{
                fontSize: 10, color: C.mute, fontFamily: F_BODY,
                lineHeight: 1.5, paddingLeft: 14,
              }}>{t.desc}</div>
            </a>
          ))}
          <div style={{
            fontSize: 9, color: C.muteLite, fontFamily: F_MONO,
            textAlign: 'center', marginTop: 10, letterSpacing: '0.05em',
          }}>
            点任一跳 rate.jmjvc.us 新标签
          </div>
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// v98: 国家选择首屏 · US / CA 双版本架构基础
// · 用户首次打开 app 看到的第一个界面
// · 选 US → 进入完整 v97 美国版逻辑
// · 选 CA → 进入加拿大版（v98 起接入 · 分步迭代）
// · 选中后保存到 window.storage, 不用每次重选
// ═══════════════════════════════════════════════════════════

// v113: 选好国家后的"如何开始"弹窗 · 3 选 1
const EntryChoiceModal = ({ country, onPickPersona, onSelfInput, onRandom, onClose }) => {
  const personaCount = country === 'CA' ? 34 : 30; // 大概数
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 140,
        background: 'rgba(13,13,13,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
        fontFamily: F_BODY,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: C.bg, borderRadius: 14,
          border: `1px solid ${C.line}`,
          maxWidth: 340, width: '100%',
          padding: '24px 22px',
          boxShadow: '0 30px 80px rgba(0,0,0,0.35)',
        }}
      >
        {/* 标题 */}
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <div style={{
            fontSize: 10, color: C.mute, fontFamily: F_MONO,
            letterSpacing: '0.15em', textTransform: 'uppercase',
            marginBottom: 4,
          }}>{country === 'CA' ? '加拿大税' : '美国税'}</div>
          <div style={{
            fontSize: 18, color: C.ink, fontFamily: F_NUM,
            fontWeight: 700, letterSpacing: '-0.015em',
          }}>怎么开始？</div>
        </div>

        {/* 主选项 1: 选择模板身份 */}
        <button
          onClick={onPickPersona}
          style={{
            width: '100%', padding: '14px 16px', marginBottom: 8,
            background: C.hero, border: 'none', color: C.heroInk,
            borderRadius: 10,
            fontFamily: F_BODY, fontWeight: 700, fontSize: 14,
            cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
            gap: 2,
            textAlign: 'left',
          }}
        >
          <span>◆ 选择模板身份</span>
          <span style={{ fontSize: 10, fontWeight: 400, opacity: 0.75 }}>
            从 {personaCount}+ 预设场景挑一个最像你的
          </span>
        </button>

        {/* 主选项 2: 自己输入 */}
        <button
          onClick={onSelfInput}
          style={{
            width: '100%', padding: '14px 16px', marginBottom: 14,
            background: C.card, border: `1px solid ${C.line}`,
            color: C.ink, borderRadius: 10,
            fontFamily: F_BODY, fontWeight: 700, fontSize: 14,
            cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
            gap: 2,
            textAlign: 'left',
          }}
        >
          <span>✎ 自己输入信息</span>
          <span style={{ fontSize: 10, fontWeight: 400, color: C.mute }}>
            4 步向导 · 按提示填表
          </span>
        </button>

        {/* Skip link · 随机 */}
        <div style={{ textAlign: 'center', paddingTop: 4 }}>
          <button
            onClick={onRandom}
            style={{
              background: 'none', border: 'none',
              fontSize: 11, color: C.mute, fontFamily: F_BODY,
              cursor: 'pointer',
              padding: '4px 8px',
              borderBottom: `1px dashed ${C.lineLite}`,
              borderRadius: 0,
            }}
          >
            随便给我一个身份 →
          </button>
        </div>
      </div>
    </div>
  );
};

const CountryPicker = ({ onPick }) => {
  const cardStyle = (bg, border) => ({
    width: '100%',
    padding: '24px 20px',
    background: bg,
    border: `1px solid ${border}`,
    borderRadius: 12,
    cursor: 'pointer',
    textAlign: 'left',
    fontFamily: F_BODY,
    transition: 'transform 0.15s, box-shadow 0.15s',
  });
  return (
    <div style={{
      minHeight: '100vh',
      background: C.bg,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 20px',
      fontFamily: F_BODY,
    }}>
      <div style={{ width: '100%', maxWidth: 430 }}>
        {/* Logo + 标题 */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            lineHeight: 1,
            marginBottom: 8,
          }}>
            <span style={{
              fontFamily: F_NUM,
              fontSize: 42,
              fontWeight: 700,
              color: C.ink,
              letterSpacing: '-0.04em',
            }}>Tax</span>
            <span style={{
              fontFamily: F_NUM,
              fontSize: 42,
              fontWeight: 400,
              fontStyle: 'italic',
              color: C.save,
              letterSpacing: '-0.03em',
            }}>Pilot</span>
          </div>
          <div style={{
            fontSize: 10,
            color: C.mute,
            fontWeight: 500,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
          }}>
            互动税务策略引擎
          </div>
        </div>

        {/* v103: 主标题 · 文案改更直白 · 去掉 uppercase（中文没意义） */}
        <div style={{
          fontSize: 13,
          color: C.ink,
          fontFamily: F_BODY,
          fontWeight: 600,
          letterSpacing: '0.02em',
          marginBottom: 12,
          textAlign: 'center',
        }}>
          选择你的报税国家
        </div>

        {/* US 卡片 */}
        <button
          onClick={() => onPick('US')}
          style={cardStyle('#FFFFFF', C.line)}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div style={{
              width: 44, height: 32,
              background: '#FAF8F3',
              border: `1px solid ${C.lineLite}`,
              borderRadius: 3,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: F_MONO, fontSize: 11, fontWeight: 700, color: C.ink,
              letterSpacing: '0.05em',
              flexShrink: 0,
            }}>US</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.ink, marginBottom: 4 }}>
                美国税
              </div>
              <div style={{ fontSize: 12, color: C.ink2, lineHeight: 1.5, marginBottom: 8 }}>
                联邦 · 50 州 · NYC / SF 市税 · OBBBA 2025 全面更新
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {['SALT $40K', 'No Tax on Tips', '401k $23.5K', 'HSA', 'QBI', 'AMT'].map(t => (
                  <span key={t} style={{
                    fontSize: 9,
                    padding: '2px 7px',
                    background: '#F1EEE5',
                    border: `1px solid ${C.lineLite}`,
                    borderRadius: 2,
                    color: C.ink2,
                    fontFamily: F_MONO,
                    letterSpacing: '0.02em',
                  }}>{t}</span>
                ))}
              </div>
            </div>
          </div>
        </button>

        <div style={{ height: 10 }} />

        {/* CA 卡片 */}
        <button
          onClick={() => onPick('CA')}
          style={cardStyle('#FFFFFF', C.line)}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div style={{
              width: 44, height: 32,
              background: '#FAF8F3',
              border: `1px solid ${C.lineLite}`,
              borderRadius: 3,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: F_MONO, fontSize: 11, fontWeight: 700, color: C.ink,
              letterSpacing: '0.05em',
              flexShrink: 0,
            }}>CA</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.ink, marginBottom: 4 }}>
                加拿大税
                <span style={{
                  fontSize: 9,
                  marginLeft: 8,
                  padding: '1px 5px',
                  background: C.warnBg,
                  border: `1px solid ${C.lineLite}`,
                  borderRadius: 2,
                  color: C.warn,
                  fontFamily: F_MONO,
                  fontWeight: 600,
                  letterSpacing: '0.05em',
                  verticalAlign: 'middle',
                }}>BETA</span>
              </div>
              <div style={{ fontSize: 12, color: C.ink2, lineHeight: 1.5, marginBottom: 8 }}>
                联邦 · 13 省/地区 · 2025 新政（7/1 14.5%）· FHSA 新账户
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {['RRSP $32.5K', 'TFSA $7K', 'FHSA', 'CCB 牛奶金', 'CPP/EI', '卑诗/安省/魁省'].map(t => (
                  <span key={t} style={{
                    fontSize: 9,
                    padding: '2px 7px',
                    background: '#F1EEE5',
                    border: `1px solid ${C.lineLite}`,
                    borderRadius: 2,
                    color: C.ink2,
                    fontFamily: F_MONO,
                    letterSpacing: '0.02em',
                  }}>{t}</span>
                ))}
              </div>
            </div>
          </div>
        </button>

        {/* 底部说明 */}
        <div style={{
          marginTop: 28,
          padding: '12px 14px',
          background: C.cardAlt,
          border: `1px solid ${C.lineLite}`,
          borderRadius: 6,
          fontSize: 10,
          color: C.mute,
          lineHeight: 1.6,
          fontFamily: F_BODY,
        }}>
          § 选择后可以在右上角随时切换国家。两套数据独立保存 · 不会互相影响。
        </div>

        {/* Footer 年份 */}
        <div style={{
          marginTop: 22,
          fontSize: 9,
          color: C.mute,
          fontFamily: F_MONO,
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          textAlign: 'center',
        }}>
          Tax Year 2025 · 内测 v1.0
        </div>
      </div>
    </div>
  );
};

export default function App() {
  // v98: 国家选择状态 · null = 显示 CountryPicker · 'US' | 'CA' = 进入对应逻辑
  const [country, setCountry] = useState(null);
  const [inputs, setInputs] = useState(PRESETS.side);
  const [preset, setPresetRaw] = useState('side');
  const [expand, setExpand] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [showWizard, setShowWizard] = useState(false);
  const [showPersonaPicker, setShowPersonaPicker] = useState(false);
  const [showWorksheet, setShowWorksheet] = useState(false);
  const [themeId, setThemeId] = useState('sage'); // v39: 主题
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showEntryChoice, setShowEntryChoice] = useState(false);  // v113: 选完国家后弹"如何开始"
  const theme = THEMES[themeId] || THEMES.sage;

  // v75: 全局术语弹窗
  const [glossaryCode, setGlossaryCode] = useState(null);
  const glossaryCtx = useMemo(() => ({
    open: (code) => setGlossaryCode(code),
    close: () => setGlossaryCode(null),
  }), []);

  // 加载持久化数据
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // v98: 先检查 country 选择
        const countryR = await window.storage?.get('taxpilot_country');
        if (mounted && countryR?.value) {
          setCountry(countryR.value);
        }
        // 先找 v2 新 key
        let r = await window.storage?.get(STORAGE_KEY);
        // 回退到 v1 老 key (v4 用户)
        if (!r?.value) {
          r = await window.storage?.get('taxpilot_state_v1');
        }
        if (mounted && r?.value) {
          const saved = JSON.parse(r.value);
          if (saved.inputs) {
            const migrated = migrateInputs(saved.inputs);
            if (migrated) setInputs(migrated);
          }
          if (saved.preset) setPresetRaw(saved.preset);
          if (saved.themeId && THEMES[saved.themeId]) setThemeId(saved.themeId);
        } else if (mounted) {
          // 首次访问：打开 persona 选择器（而不是直接 wizard）
          setInputs(PRESETS.blank);
          setPresetRaw('blank');
          setShowPersonaPicker(true);
        }
      } catch {}
      if (mounted) setHydrated(true);
    })();
    return () => { mounted = false; };
  }, []);

  // v98: 保存 country 选择
  useEffect(() => {
    if (!country) return;
    (async () => {
      try {
        await window.storage?.set('taxpilot_country', country);
      } catch {}
    })();
  }, [country]);

  // v99: 切换国家时 · 如果当前 inputs.state 不属于新国家 · reset 到 blank
  useEffect(() => {
    if (!country) return;
    const usStates = Object.keys(STATE_BRACKETS);   // US 州代码
    const caProvs = Object.keys(CA_PROV_BRACKETS);  // CA 省代码
    const currentState = inputs.state;
    if (country === 'US' && !usStates.includes(currentState)) {
      // 当前 state 是 CA 省 · 跳回 US blank
      setInputs({ ...PRESETS.blank });
      setPresetRaw('blank');
    } else if (country === 'CA' && !caProvs.includes(currentState)) {
      // 当前 state 是 US 州 · 跳到 CA 默认 (ON · single · $95K)
      setInputs({
        filingStatus: 'Single', state: 'ON', city: 'toronto', workState: '',
        w2: 95000, spouseW2: 0, inc1099: 0, expense1099: 0,
        k401: 0, hdhp: false, hsa: 0, children: 0,
        properties: [],
        charity: 300, medical: 0,
        megaBackdoor: false, commuterBenefit: false, dcfsa: false,
      });
      setPresetRaw('blank');
    }
  }, [country]);

  // 自动保存（防抖）
  useEffect(() => {
    if (!hydrated) return;
    setSaveStatus('saving');
    const id = setTimeout(async () => {
      try {
        await window.storage?.set(STORAGE_KEY, JSON.stringify({ inputs, preset, themeId }));
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus(null), 1500);
      } catch {
        setSaveStatus(null);
      }
    }, 400);
    return () => clearTimeout(id);
  }, [inputs, preset, themeId, hydrated]);

  const setPreset = (p) => {
    setPresetRaw(p);
    setInputs(PRESETS[p]);
  };

  const calc = useMemo(() => country === 'CA' ? computeTaxCA(inputs) : computeTax(inputs), [inputs, country]);
  const opps = useMemo(() => findOpportunities(inputs, calc), [inputs, calc]);
  const isModified = useMemo(() => isModifiedFrom(inputs, preset), [inputs, preset]);

  // v61: 调节器 pct 状态提升到 App 根 · Hero 表头跟随滑块动
  const [tunerPct, setTunerPct] = useState(0);

  // v61: 基于 pct 的预览 calc · Hero 显示这个版本（滑块 0% 时与原 calc 完全相同）
  const tunerPreview = useMemo(() => {
    const contribOpps = opps.filter(o =>
      o.type !== 'warning' && (o.saving || 0) > 0 && (o.contrib || 0) > 0
    );
    const freeOpps = opps.filter(o =>
      o.type !== 'warning' && (o.saving || 0) > 0 && !(o.contrib > 0)
    );
    const maxContribSaving = contribOpps.reduce((s, o) => s + (o.saving || 0), 0);
    const maxContribTotal = contribOpps.reduce((s, o) => s + (o.contrib || 0), 0);
    const freeSaving = freeOpps.reduce((s, o) => s + (o.saving || 0), 0);

    const scale = tunerPct / 100;
    const contribSaving = Math.round(maxContribSaving * scale);
    const contribAmt = Math.round(maxContribTotal * scale);
    const freeSavingScaled = Math.round(freeSaving * scale);
    const totalTaxSaved = contribSaving + freeSavingScaled;

    // 按比例缩减各项税（fed/state/fica 等 stack bar 分项也要跟动）
    const baseTotalTax = calc?.totalTax || 0;
    const taxRatio = baseTotalTax > 0 ? Math.max(0, (baseTotalTax - totalTaxSaved) / baseTotalTax) : 1;
    const baseCash = calc?.cashTakeHome || 0;
    const baseGross = calc?.grossWages || 0;
    const baseDeferred = calc?.deferredAssets || 0;

    return {
      ...calc,
      totalTax: Math.max(0, baseTotalTax - totalTaxSaved),
      fedTax: Math.round((calc?.fedTax || 0) * taxRatio),
      stateTax: Math.round((calc?.stateTax || 0) * taxRatio),
      localTax: Math.round((calc?.localTax || 0) * taxRatio),
      fica: Math.round((calc?.fica || 0) * taxRatio),
      seTax: Math.round((calc?.seTax || 0) * taxRatio),
      cashTakeHome: baseCash + totalTaxSaved - contribAmt,
      deferredAssets: baseDeferred + contribAmt,
      effectiveRate: baseGross > 0 ? (baseTotalTax - totalTaxSaved) / baseGross : 0,
      // 标记：预览模式 + 滑块位置
      _tunerPct: tunerPct,
      _totalTaxSaved: totalTaxSaved,
      _contribAmt: contribAmt,
      _baseTotalTax: baseTotalTax,
      _baseCash: baseCash,
    };
  }, [opps, calc, tunerPct]);

  // v61: 切换 persona / 编辑时重置滑块到 0
  React.useEffect(() => {
    setTunerPct(0);
  }, [inputs]);

  // v98: 如未选国家 · 显示首页选国家界面（所有 hooks 完成后才能早返回）
  if (!country) {
    return <CountryPicker onPick={(c) => { setCountry(c); setShowEntryChoice(true); }} />;
  }

  return (
    <GlossaryContext.Provider value={glossaryCtx}>
      <FontLoader />
      {glossaryCode && (
        <GlossaryModal code={glossaryCode} onClose={() => setGlossaryCode(null)} />
      )}
      {showThemePicker && (
        <ThemePickerModal
          activeThemeId={themeId}
          onSelect={(id) => setThemeId(id)}
          onClose={() => setShowThemePicker(false)}
        />
      )}
      {showEntryChoice && (
        <EntryChoiceModal
          country={country}
          onPickPersona={() => {
            setShowEntryChoice(false);
            setShowPersonaPicker(true);
          }}
          onSelfInput={() => {
            setShowEntryChoice(false);
            setShowWizard(true);
          }}
          onRandom={() => {
            const pool = country === 'CA' ? PERSONAS_CA : PERSONAS;
            const picked = pool[Math.floor(Math.random() * pool.length)];
            if (picked) {
              setInputs(picked.inputs);
              setPresetRaw(picked.id);
            }
            setShowEntryChoice(false);
          }}
          onClose={() => setShowEntryChoice(false)}
        />
      )}
      {showPersonaPicker && (
        <PersonaPicker
          country={country}
          onPick={(persona) => {
            setInputs(persona.inputs);
            setPresetRaw(persona.id);
            setShowPersonaPicker(false);
          }}
          onSelfInput={() => {
            setShowPersonaPicker(false);
            setShowWizard(true);
          }}
          onClose={() => setShowPersonaPicker(false)}
        />
      )}
      {showWizard && (
        <Wizard
          initial={inputs}
          country={country}
          onComplete={(newInputs) => {
            setInputs(newInputs);
            setPresetRaw('blank'); // 标记为自定义
            setShowWizard(false);
          }}
          onCancel={() => setShowWizard(false)}
        />
      )}
      <TaxWorksheet
        inputs={inputs}
        calc={calc}
        open={showWorksheet}
        onClose={() => setShowWorksheet(false)}
      />
      <div style={{ background: C.bg, minHeight: '100vh', fontFamily: F_BODY }}>
        <div className="mx-auto" style={{ maxWidth: 440, paddingBottom: 40, backgroundColor: theme.bodyBg, minHeight: '100vh' }}>
          <Header
            preset={preset}
            setPreset={setPreset}
            isModified={isModified}
            saveStatus={saveStatus}
            onEdit={() => setShowWizard(true)}
            onPickPersona={() => setShowPersonaPicker(true)}
            onShowWorksheet={() => setShowWorksheet(true)}
            country={country}
            onChangeCountry={() => {
              // v104: 去掉 confirm · 某些 embedded browser 不支持 · 数据本来就保留
              setCountry(null);
            }}
          />

          <div className="px-3 pt-3">
            <SummaryCard calc={tunerPreview} i={inputs} theme={theme} preset={preset} />

            <InputPanel
              i={inputs}
              setI={setInputs}
              calc={calc}
              expand={expand}
              setExpand={setExpand}
              onOpenWizard={() => setShowWizard(true)}
            />

            <SavingsTuner opps={opps} calc={calc} inputs={inputs} pct={tunerPct} setPct={setTunerPct} />

            <OppGrid opps={opps} calc={calc} inputs={inputs} />

            {/* ★ 新增：行动时间线 */}
            <div style={{ marginTop: 12 }}>
              <QuarterlyBudget inputs={inputs} calc={calc} />
              <ActionTimeline opps={opps} inputs={inputs} calc={calc} />
            </div>

            <ScenarioCompare inputs={inputs} calc={calc} />

            <LocationOptimizer inputs={inputs} calc={calc} setInputs={setInputs} />

            {/* v89: 误区卡 不再 details 包裹 · 自己管展开收起 */}
            <MythStrip preset={preset} inputs={inputs} country={country} />

            {/* v77: 计算逻辑说明条 · 提醒所有数字实时重算 */}
            <div style={{
              background: C.cardAlt, border: `1px solid ${C.line}`,
              borderRadius: 12, padding: '10px 14px', marginBottom: 10,
              display: 'flex', alignItems: 'flex-start', gap: 10,
            }}>
              <div style={{
                width: 22, height: 22, borderRadius: '50%',
                background: C.save + '18', border: `1px solid ${C.save}40`,
                color: C.save, fontWeight: 800, fontSize: 11,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, fontFamily: F_BODY,
              }}>✓</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 11, color: C.ink, fontFamily: F_BODY,
                  fontWeight: 700, marginBottom: 3, letterSpacing: '0.01em',
                }}>
                  所有数字都是根据你的情况实时重算
                </div>
                <div style={{
                  fontSize: 10, color: C.mute, fontFamily: F_BODY,
                  lineHeight: 1.55,
                }}>
                  你改任一项（收入 / 州 / 房产 / 孩子 / 401k…）· Hero 三数字、省税机会、预缴分号、
                  州税、建议路径 <span style={{ color: C.ink2, fontWeight: 600 }}>全部自动重新计算</span>。
                  展开下方「算式透明 · 副表」可看每一步如何得出。
                </div>
              </div>
            </div>

            <details style={{
              background: C.card, border: `1px solid ${C.line}`,
              borderRadius: 16, marginBottom: 12, overflow: 'hidden',
            }}>
              <summary style={{
                padding: '12px 16px', cursor: 'pointer',
                fontSize: 11, color: C.mute, fontFamily: F_BODY,
                fontWeight: 600, letterSpacing: '0.12em',
                textTransform: 'uppercase',
                listStyle: 'none',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span>算式透明 · 副表</span>
                <span style={{ fontSize: 10, color: C.muteLite, textTransform: 'none', letterSpacing: 0 }}>展开 ↓</span>
              </summary>
              <div style={{ padding: '0 0 4px' }}>
                <Transparency inputs={inputs} calc={calc} />
              </div>
            </details>

            {/* v81: 姊妹工具 · Rate Navigator 外链 · v104: 仅限 US 模式 */}
            {country === 'US' && <RateNavCard />}

            <div className="px-1 pt-2 pb-2" style={{ fontSize: 10, color: C.muteLite, fontFamily: F_BODY, lineHeight: 1.6 }}>
              <div className="mb-1">
                § 规则：{country === 'CA'
                  ? 'CRA T1 General · 13 省 · 2025 税年（2026 报）'
                  : 'IRS Pub 17 · NY DTF · NJ Treasury · 2025 纳税年'}
              </div>
              <div className="mb-1"> 最后更新：2026-03 · 数值为估算</div>
              <div className="mb-1"> 你的输入自动保存在本地</div>
              <div className="mb-2">
                † 非报税结果。{country === 'CA'
                  ? '涉及 CCPC / T1135 / Capital Dividend 强烈建议咨询 CPA。'
                  : '涉及 S-Corp / FBAR / Backdoor Roth 强烈建议咨询 CPA。'}
              </div>
              {/* v53: 主题 · 隐私 · 版权 全部移到底部 */}
              <div style={{
                paddingTop: 10, borderTop: `1px solid ${C.line}`,
                display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', gap: 8,
                marginBottom: 8,
              }}>
                <button
                  onClick={() => setShowThemePicker(true)}
                  style={{
                    fontSize: 9, padding: '6px 10px', borderRadius: 6,
                    background: theme?.heroBg || C.card,
                    border: `1px solid ${theme?.heroBorder || C.line}`,
                    color: C.ink2, fontFamily: F_MONO, fontWeight: 600,
                    cursor: 'pointer', letterSpacing: '0.04em',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  <span style={{
                    display: 'inline-block',
                    width: 10, height: 10, borderRadius: '50%',
                    background: theme?.heroBg || '#DCE5D1',
                    border: `1px solid ${theme?.heroBorder || '#B4C1A1'}`,
                  }} />
                  主题 · {theme?.label || '雪白'}
                </button>
                <span style={{
                  fontSize: 8, color: C.muteLite, fontFamily: F_MONO,
                  letterSpacing: '0.04em',
                }}>
                  🔒 100% 本地 · 不上传
                </span>
              </div>
              <div style={{
                fontSize: 8, color: C.muteLite, fontFamily: F_MONO,
                letterSpacing: '0.08em', textAlign: 'center',
              }}>
                © 2026 JMJ · ALL RIGHTS RESERVED · MADE WITH ♢
              </div>
            </div>
          </div>
        </div>
      </div>
    </GlossaryContext.Provider>
  );
}
