# MVP 測試指南

**版本**：1.0.0-mvp  
**狀態**：開發中  

---

## 🚀 快速測試

### 前置準備

1. **安裝依賴**
```bash
cd /Users/user/clawd/projects/realty-ai-agent/skill-package
npm install jsdom
```

2. **設定 Telegram Bot**
```bash
# 編輯 config/monitoring-settings.json
# 填入：
# - bot_token: 你的 Bot Token
# - chat_id: 你的 Chat ID
```

3. **給腳本執行權限**
```bash
chmod +x scripts/*.sh scripts/*.js
```

---

## 測試 1：HTML 解析測試

```bash
# 準備測試 HTML（手動下載 591 頁面）
curl "https://rent.591.com.tw/list?region=3" > /tmp/test-591.html

# 測試解析
node scripts/parse-591-html.js /tmp/test-591.html
```

**預期結果**：輸出 JSON 物件陣列

---

## 測試 2：AI 判斷測試

建立測試物件：
```bash
cat > /tmp/test-listing.json << 'EOF'
{
  "id": "test-001",
  "title": "竹山鎮透天厝出租",
  "price": 65000,
  "area": 28,
  "location": "竹山鎮中正路",
  "description": "屋主自租，誠意出租，可面談",
  "contact": "0912-345-678"
}
EOF
```

執行測試：
```bash
node scripts/ai-judge.js /tmp/test-listing.json
```

**預期結果**：
```json
{
  "listing_id": "test-001",
  "score": 85,
  "is_owner": true,
  "confidence": 75,
  "判斷依據": "高機率屋主"
}
```

---

## 測試 3：Telegram 通知測試

合併物件與 AI 結果：
```bash
cat > /tmp/test-notification.json << 'EOF'
{
  "id": "test-001",
  "title": "竹山鎮透天厝出租",
  "price": 65000,
  "area": 28,
  "location": "竹山鎮中正路",
  "url": "https://rent.591.com.tw/home/123456",
  "ai": {
    "score": 85,
    "is_owner": true,
    "confidence": 75,
    "判斷依據": "高機率屋主",
    "評分細節": {
      "price": 25,
      "space": 20,
      "location": 18,
      "owner": 12,
      "completeness": 10
    }
  }
}
EOF
```

執行測試：
```bash
node scripts/notify-telegram.js /tmp/test-notification.json
```

**預期結果**：Telegram 收到格式化通知

---

## 測試 4：完整流程測試（暫時跳過 agent-browser）

手動模擬流程：

```bash
# Step 1：準備測試 HTML
echo "手動下載 591 頁面到 /tmp/test-591.html"

# Step 2：解析 HTML
node scripts/parse-591-html.js /tmp/test-591.html > /tmp/listings.json

# Step 3：讀取第一個物件
LISTING=$(jq '.[0]' /tmp/listings.json)

# Step 4：AI 判斷
AI_RESULT=$(node scripts/ai-judge.js "$LISTING")

# Step 5：合併資料
echo "$LISTING" | jq --argjson ai "$AI_RESULT" '. + {ai: $ai}' > /tmp/notification.json

# Step 6：推送通知
node scripts/notify-telegram.js /tmp/notification.json
```

---

## 測試 5：監控腳本測試（需要 agent-browser）

⚠️ **注意**：需要先安裝 agent-browser

```bash
# 確認 agent-browser 可用
which agent-browser

# 執行監控（會實際訪問 591）
bash scripts/monitor-591.sh
```

**預期結果**：
1. 抓取 591 頁面
2. 解析物件
3. AI 判斷
4. 推送符合條件的物件

---

## 除錯技巧

### 查看日誌
```bash
tail -f skill-package/logs/monitor.log
```

### 查看已通知物件
```bash
cat skill-package/data/seen-listings.json | jq
```

### 測試 Telegram 連線
```bash
BOT_TOKEN="你的Token"
CHAT_ID="你的ChatID"

curl "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
  -d "chat_id=${CHAT_ID}" \
  -d "text=測試訊息"
```

---

## 已知限制（MVP）

1. ❌ HTML 解析器可能不完整（591 頁面結構複雜）
2. ❌ AI 判斷是基於規則，不是真正的 LLM
3. ❌ 沒有整合 OpenClaw Cron（需手動執行）
4. ❌ 沒有 Google Sheets 同步
5. ❌ 沒有對話式設定功能

---

## 下一步（完整版）

1. 整合真正的 LLM API（Claude/GPT）
2. 建立 OpenClaw 工作流
3. 加入 Google Sheets 同步
4. 實作對話式設定
5. 完善錯誤處理

---

**測試建議**：先測試 2、3（不需要 591），確認邏輯正確，再測試完整流程。
