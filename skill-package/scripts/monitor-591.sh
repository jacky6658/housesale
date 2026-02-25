#!/bin/bash
# 591 監控腳本 (MVP 版本)
# 用途：監控 591 租屋新物件，AI 判斷屋主，推送 Telegram

set -e

# 設定檔路徑
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="$SCRIPT_DIR/../config/monitoring-settings.json"
CACHE_FILE="$SCRIPT_DIR/../data/seen-listings.json"
LOG_FILE="$SCRIPT_DIR/../logs/monitor.log"

# 建立必要目錄
mkdir -p "$SCRIPT_DIR/../data"
mkdir -p "$SCRIPT_DIR/../logs"

# 載入設定
if [ ! -f "$CONFIG_FILE" ]; then
    echo "錯誤：找不到設定檔 $CONFIG_FILE"
    exit 1
fi

# 讀取監控條件
REGION=$(jq -r '.monitoring.criteria.region' "$CONFIG_FILE")
BUDGET_MIN=$(jq -r '.monitoring.criteria.budget_min' "$CONFIG_FILE")
BUDGET_MAX=$(jq -r '.monitoring.criteria.budget_max' "$CONFIG_FILE")
AREA_MIN=$(jq -r '.monitoring.criteria.area_min' "$CONFIG_FILE")

# 檢查必要參數
if [ "$REGION" == "null" ] || [ "$REGION" == "" ]; then
    echo "錯誤：未設定監控地區"
    exit 1
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] 開始監控 591..." | tee -a "$LOG_FILE"
echo "監控條件：$REGION | 預算 $BUDGET_MIN-$BUDGET_MAX | 坪數 >$AREA_MIN" | tee -a "$LOG_FILE"

# 建立 591 搜尋 URL
# 範例：竹山鎮 = region=3&section=10099
# 需要根據實際地區代碼調整
BASE_URL="https://rent.591.com.tw/list"
SEARCH_PARAMS="?kind=0&searchtype=1&order=posttime&orderType=desc"

# 加入地區參數（這裡需要地區代碼對照表）
# 暫時用關鍵字搜尋
SEARCH_URL="${BASE_URL}${SEARCH_PARAMS}&keyword=${REGION}"

# 加入預算範圍
if [ "$BUDGET_MIN" != "null" ] && [ "$BUDGET_MAX" != "null" ]; then
    SEARCH_URL="${SEARCH_URL}&rentprice=${BUDGET_MIN}_${BUDGET_MAX}"
fi

# 加入坪數
if [ "$AREA_MIN" != "null" ]; then
    SEARCH_URL="${SEARCH_URL}&area=${AREA_MIN}_"
fi

echo "搜尋 URL: $SEARCH_URL" | tee -a "$LOG_FILE"

# 使用 agent-browser 抓取
echo "使用 agent-browser 抓取 591..." | tee -a "$LOG_FILE"

# 建立臨時檔案
TEMP_HTML="/tmp/591-listings-$(date +%s).html"
TEMP_DATA="/tmp/591-data-$(date +%s).json"

# 執行 agent-browser
agent-browser navigate "$SEARCH_URL" 2>&1 | tee -a "$LOG_FILE" || {
    echo "錯誤：agent-browser 執行失敗"
    exit 1
}

sleep 3

# 抓取快照
agent-browser snapshot > "$TEMP_HTML" 2>&1 || {
    echo "錯誤：無法抓取頁面快照"
    exit 1
}

echo "已抓取頁面，開始解析..." | tee -a "$LOG_FILE"

# 解析 HTML，提取物件資訊
# 使用 Node.js 腳本解析（因為 591 是動態網頁）
node "$SCRIPT_DIR/parse-591-html.js" "$TEMP_HTML" > "$TEMP_DATA" 2>&1 || {
    echo "錯誤：解析 HTML 失敗"
    cat "$TEMP_DATA"
    exit 1
}

# 讀取已看過的物件
if [ ! -f "$CACHE_FILE" ]; then
    echo "[]" > "$CACHE_FILE"
fi

# 過濾新物件
LISTINGS_COUNT=$(jq '. | length' "$TEMP_DATA")
echo "找到 $LISTINGS_COUNT 個物件" | tee -a "$LOG_FILE"

if [ "$LISTINGS_COUNT" -eq 0 ]; then
    echo "沒有找到符合條件的物件" | tee -a "$LOG_FILE"
    rm -f "$TEMP_HTML" "$TEMP_DATA"
    exit 0
fi

# 逐一處理物件
NEW_COUNT=0
for i in $(seq 0 $((LISTINGS_COUNT - 1))); do
    LISTING_ID=$(jq -r ".[$i].id" "$TEMP_DATA")
    
    # 檢查是否已通知過
    SEEN=$(jq --arg id "$LISTING_ID" 'any(.[]; . == $id)' "$CACHE_FILE")
    
    if [ "$SEEN" == "true" ]; then
        echo "物件 $LISTING_ID 已通知過，跳過" | tee -a "$LOG_FILE"
        continue
    fi
    
    echo "發現新物件：$LISTING_ID" | tee -a "$LOG_FILE"
    
    # 提取物件資料
    LISTING_JSON=$(jq ".[$i]" "$TEMP_DATA")
    
    # 呼叫 AI 判斷
    echo "AI 判斷中..." | tee -a "$LOG_FILE"
    AI_RESULT=$(node "$SCRIPT_DIR/ai-judge.js" "$LISTING_JSON" 2>&1) || {
        echo "AI 判斷失敗，跳過此物件"
        continue
    }
    
    # 解析 AI 結果
    AI_SCORE=$(echo "$AI_RESULT" | jq -r '.score')
    AI_IS_OWNER=$(echo "$AI_RESULT" | jq -r '.is_owner')
    AI_CONFIDENCE=$(echo "$AI_RESULT" | jq -r '.confidence')
    
    echo "AI 評分：$AI_SCORE | 屋主機率：$AI_IS_OWNER ($AI_CONFIDENCE%)" | tee -a "$LOG_FILE"
    
    # 檢查是否達到推送門檻
    PUSH_THRESHOLD=$(jq -r '.ai.scoring.push_threshold' "$CONFIG_FILE")
    
    if [ "$AI_SCORE" -lt "$PUSH_THRESHOLD" ]; then
        echo "評分未達門檻 ($PUSH_THRESHOLD)，不推送" | tee -a "$LOG_FILE"
        # 仍然記錄為已看過
        jq --arg id "$LISTING_ID" '. += [$id]' "$CACHE_FILE" > "$CACHE_FILE.tmp"
        mv "$CACHE_FILE.tmp" "$CACHE_FILE"
        continue
    fi
    
    # 推送通知
    echo "推送 Telegram 通知..." | tee -a "$LOG_FILE"
    
    # 合併物件資料與 AI 結果
    NOTIFICATION_DATA=$(echo "$LISTING_JSON" | jq --argjson ai "$AI_RESULT" '. + {ai: $ai}')
    
    node "$SCRIPT_DIR/notify-telegram.js" "$NOTIFICATION_DATA" 2>&1 | tee -a "$LOG_FILE" || {
        echo "Telegram 推送失敗"
    }
    
    # 記錄為已看過
    jq --arg id "$LISTING_ID" '. += [$id]' "$CACHE_FILE" > "$CACHE_FILE.tmp"
    mv "$CACHE_FILE.tmp" "$CACHE_FILE"
    
    NEW_COUNT=$((NEW_COUNT + 1))
done

echo "[$(date '+%Y-%m-%d %H:%M:%S')] 監控完成，發現 $NEW_COUNT 個新物件" | tee -a "$LOG_FILE"

# 清理暫存檔
rm -f "$TEMP_HTML" "$TEMP_DATA"

exit 0
