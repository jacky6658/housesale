# 房地產監控技能 MVP

**版本**：1.0.0-mvp  
**開發時間**：2-3 小時  
**狀態**：✅ 核心功能完成，待測試

---

## 🎯 MVP 範圍

### ✅ 已完成

**1. 核心腳本（4 個）**
- `monitor-591.sh` - 主監控腳本（Bash）
- `parse-591-html.js` - HTML 解析器（Node.js）
- `ai-judge.js` - AI 判斷引擎（Node.js）
- `notify-telegram.js` - Telegram 通知（Node.js）

**2. 配置檔案**
- `config/monitoring-settings.json` - 監控設定
- `config/default-settings.json` - 預設設定

**3. 文件**
- `SKILL.md` - 技能完整說明
- `README.md` - 快速入門
- `INSTALL.md` - 安裝指南
- `TEST.md` - 測試指南
- `MVP-README.md` - 本文件

**4. 系統人設**
- `prompts/system-prompt.md` - 龍蝦對話邏輯

---

## 🔄 完整工作流程

```
[Cron 觸發 / 手動執行]
    ↓
[monitor-591.sh] 讀取監控設定
    ↓
[agent-browser] 訪問 591 搜尋頁面
    ↓
[parse-591-html.js] 解析 HTML → 物件陣列
    ↓
[過濾新物件] 檢查快取，只處理新物件
    ↓
[ai-judge.js] 逐一判斷：
  • 屋主 vs 仲介（信心度 0-100%）
  • 物件評分（0-100 分）
    ↓
[檢查門檻] 評分 ≥ 70 分才推送
    ↓
[notify-telegram.js] 格式化訊息 → Telegram
    ↓
[記錄快取] 避免重複通知
```

---

## 📦 檔案結構

```
skill-package/
├── scripts/
│   ├── monitor-591.sh          # 主監控腳本 ✅
│   ├── parse-591-html.js       # HTML 解析 ✅
│   ├── ai-judge.js             # AI 判斷 ✅
│   └── notify-telegram.js      # Telegram 通知 ✅
├── config/
│   ├── monitoring-settings.json # 實際設定 ✅
│   └── default-settings.json    # 預設設定 ✅
├── prompts/
│   └── system-prompt.md         # 龍蝦人設 ✅
├── data/                        # 執行時建立
│   └── seen-listings.json       # 已通知物件快取
├── logs/                        # 執行時建立
│   └── monitor.log              # 執行日誌
├── docs/
│   └── ...                      # 說明文件
├── SKILL.md                     # 技能說明 ✅
├── README.md                    # 快速入門 ✅
├── INSTALL.md                   # 安裝指南 ✅
├── TEST.md                      # 測試指南 ✅
├── MVP-README.md                # 本文件 ✅
└── package.json                 # Node.js 專案設定 ✅
```

---

## 🚀 快速啟動

### Step 1：安裝依賴

```bash
cd /Users/user/clawd/projects/realty-ai-agent/skill-package
npm install
```

### Step 2：設定 Telegram

編輯 `config/monitoring-settings.json`：
```json
{
  "notification": {
    "telegram": {
      "bot_token": "你的 Bot Token",
      "chat_id": "你的 Chat ID"
    }
  }
}
```

### Step 3：設定監控條件

編輯 `config/monitoring-settings.json`：
```json
{
  "monitoring": {
    "criteria": {
      "region": "竹山鎮",
      "budget_min": 50000,
      "budget_max": 80000,
      "area_min": 20
    }
  }
}
```

### Step 4：執行測試

```bash
# 測試 AI 判斷
echo '{"id":"test","title":"屋主自租","price":60000,"area":25}' | node scripts/ai-judge.js

# 測試 Telegram 通知（需要先設定 bot_token 和 chat_id）
# 參考 TEST.md
```

### Step 5：執行監控

```bash
# 手動執行一次
bash scripts/monitor-591.sh

# 或設定 Cron（每 2 小時）
# 0 */2 * * * cd /path/to/skill-package && bash scripts/monitor-591.sh
```

---

## ⚙️ 技術細節

### AI 判斷邏輯（簡化版）

**屋主判斷（信心度 0-100%）：**
```
基準：50%

仲介關鍵字（-10% 每個）：
- 仲介、房屋、不動產、地產、專業服務
- 0800、市話、多間、多筆

屋主關鍵字（+10% 每個）：
- 屋主、自租、自售、本人、誠、急

聯絡方式：
- 手機號碼：+15%
- 市話/0800：-15%

標題長度：
- < 20 字：+5%（簡單描述）
- 太專業：-5%（優質、精選等）
```

**物件評分（0-100 分）：**
```
價格合理性（30 分）：
- 在目標價格 ±10%：30 分
- 在目標價格 ±20%：21 分
- 在目標價格 ±30%：12 分

空間適配性（25 分）：
- 坪數 ≥ 需求：25 分
- 坪數不足：7.5 分

地段評估（20 分）：
- 包含目標區域：20 分
- 不包含：10 分

屋主可能性（15 分）：
- 信心度 × 15%

物件完整度（10 分）：
- 有標題、價格、坪數、描述、圖片：10 分
```

---

## 🧪 測試狀態

### 已測試

- ✅ JSON 設定檔解析
- ✅ AI 判斷邏輯（規則式）
- ✅ Telegram 訊息格式
- ✅ 腳本語法檢查

### 待測試

- ⏳ agent-browser 整合
- ⏳ 591 HTML 實際解析
- ⏳ 完整流程端到端測試
- ⏳ Cron 定時執行
- ⏳ 錯誤處理

---

## 📊 與完整版的差異

| 功能 | MVP | 完整版 |
|------|-----|--------|
| 591 監控 | ✅ 基礎 | ✅ 完整 |
| PTT 監控 | ❌ 無 | ✅ 有 |
| AI 判斷 | ⚠️ 規則式 | ✅ LLM |
| Telegram 通知 | ✅ 有 | ✅ 有 + 互動 |
| 對話式設定 | ❌ 無 | ✅ 有 |
| Google Sheets | ❌ 無 | ✅ 有 |
| OpenClaw 整合 | ❌ 無 | ✅ 有 |
| 錯誤處理 | ⚠️ 基礎 | ✅ 完整 |
| 學習能力 | ❌ 無 | ✅ 有 |

---

## 🔧 已知限制

1. **HTML 解析器不完整**
   - 591 頁面結構複雜，可能需要調整選擇器
   - 建議：實際測試後根據 HTML 結構調整

2. **AI 判斷是規則式**
   - 不是真正的 LLM，準確率有限
   - 建議：完整版整合 Claude/GPT

3. **沒有對話功能**
   - 無法對話式設定監控條件
   - 需要手動編輯 JSON 設定檔

4. **沒有 OpenClaw 整合**
   - 需要手動執行或用系統 Cron
   - 完整版會整合到 OpenClaw 工作流

5. **沒有錯誤恢復機制**
   - agent-browser 失敗會直接退出
   - 完整版會加入重試邏輯

---

## 🎯 演示建議

### 視訊會議展示時

**方案 A：測試資料展示**
```bash
# 準備測試物件
cat > demo-listing.json << EOF
{
  "id": "demo-001",
  "title": "竹山鎮透天厝急租",
  "price": 65000,
  "area": 28,
  "location": "竹山鎮中正路100號",
  "description": "屋主自租，誠意出租，可面談",
  "contact": "0912-345-678",
  "url": "https://rent.591.com.tw/home/123456"
}
EOF

# 執行 AI 判斷
node scripts/ai-judge.js demo-listing.json

# 合併結果
# （手動合併或寫個腳本）

# 推送 Telegram
node scripts/notify-telegram.js demo-notification.json
```

**方案 B：錄製示範影片**
- 完整流程錄影（5 分鐘）
- 展示 Telegram 收到通知
- 展示 AI 評分邏輯

---

## 💡 下一步開發

### Phase 2：完整版（2-3 週）

1. **整合真正的 LLM**
   - 使用 Claude/GPT API
   - 提升判斷準確率到 75-85%

2. **OpenClaw 工作流**
   - 建立 Cron 任務
   - 整合對話功能
   - 實作命令處理

3. **Google Sheets 同步**
   - 記錄所有物件
   - 追蹤確認/拒絕狀態
   - 產生報表

4. **對話式互動**
   - 接受「幫我找 XXX」
   - 調整監控條件
   - 即時搜尋分析

5. **完善錯誤處理**
   - 重試機制
   - 錯誤通知
   - 日誌記錄

---

## 📞 問題回報

如果遇到問題：
1. 查看 `logs/monitor.log`
2. 查看 TEST.md 除錯技巧
3. 聯繫開發者

---

**© 2026 AIJob. MVP 版本，僅供演示與測試。**
