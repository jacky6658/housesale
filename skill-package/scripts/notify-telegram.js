#!/usr/bin/env node
/**
 * Telegram 通知推送
 * 輸入：物件 + AI 判斷結果 JSON
 * 輸出：推送成功/失敗
 */

const fs = require('fs');
const https = require('https');

// 讀取物件資料
let data;
if (process.argv[2]) {
    if (process.argv[2].startsWith('{')) {
        data = JSON.parse(process.argv[2]);
    } else {
        data = JSON.parse(fs.readFileSync(process.argv[2], 'utf-8'));
    }
} else {
    const stdin = fs.readFileSync(0, 'utf-8');
    data = JSON.parse(stdin);
}

// 載入設定
const configPath = __dirname + '/../config/monitoring-settings.json';
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

const BOT_TOKEN = config.notification.telegram.bot_token || process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = config.notification.telegram.chat_id || process.env.TELEGRAM_CHAT_ID;

if (!BOT_TOKEN || !CHAT_ID) {
    console.error('錯誤：未設定 Telegram Bot Token 或 Chat ID');
    console.error('請在 config/monitoring-settings.json 設定或設置環境變數');
    process.exit(1);
}

/**
 * 格式化訊息
 */
function formatMessage(listing, ai) {
    const stars = '★'.repeat(Math.round(ai.score / 20)) + '☆'.repeat(5 - Math.round(ai.score / 20));
    
    let message = `🏠 *新物件通知！*\n\n`;
    message += `${listing.title || '無標題'}\n\n`;
    
    message += `*基本資訊：*\n`;
    message += `• 租金：${listing.price ? listing.price.toLocaleString() + ' 元/月' : '面議'}\n`;
    message += `• 坪數：${listing.area || '未提供'} 坪\n`;
    message += `• 地點：${listing.location || '未提供'}\n`;
    if (listing.floor) message += `• 樓層：${listing.floor}\n`;
    if (listing.type) message += `• 類型：${listing.type}\n`;
    
    message += `\n*AI 評分：*${stars} (${ai.score} 分)\n`;
    
    // 評分說明
    const reasons = [];
    if (ai.評分細節) {
        if (ai.評分細節.price >= 20) reasons.push('✅ 價格合理');
        if (ai.評分細節.space >= 15) reasons.push('✅ 坪數符合');
        if (ai.評分細節.location >= 15) reasons.push('✅ 地點符合');
    }
    if (reasons.length > 0) {
        message += reasons.join('\n') + '\n';
    }
    
    message += `\n*屋主判斷：*${ai.is_owner ? '✅' : '⚠️'} ${ai.判斷依據}\n`;
    message += `信心度：${ai.confidence}%\n`;
    
    if (listing.url) {
        message += `\n🔗 [查看完整資訊](${listing.url})\n`;
    }
    
    message += `\n━━━━━━━━━━━━━━━━━━━\n`;
    message += `*操作選項（回覆數字）：*\n`;
    message += `1️⃣ 確認聯繫（產生開發訊息）\n`;
    message += `2️⃣ 稍後決定（加入待看清單）\n`;
    message += `3️⃣ 不感興趣（排除清單）\n`;
    
    return message;
}

/**
 * 發送 Telegram 訊息
 */
function sendTelegramMessage(message) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({
            chat_id: CHAT_ID,
            text: message,
            parse_mode: 'Markdown',
            disable_web_page_preview: false
        });
        
        const options = {
            hostname: 'api.telegram.org',
            port: 443,
            path: `/bot${BOT_TOKEN}/sendMessage`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        };
        
        const req = https.request(options, (res) => {
            let responseData = '';
            
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            
            res.on('end', () => {
                try {
                    const result = JSON.parse(responseData);
                    if (result.ok) {
                        resolve(result);
                    } else {
                        reject(new Error(`Telegram API 錯誤: ${result.description}`));
                    }
                } catch (err) {
                    reject(err);
                }
            });
        });
        
        req.on('error', (err) => {
            reject(err);
        });
        
        req.write(data);
        req.end();
    });
}

// 執行推送
const message = formatMessage(data, data.ai || {});

console.error('發送 Telegram 通知...');
console.error('Chat ID:', CHAT_ID);
console.error('訊息長度:', message.length);

sendTelegramMessage(message)
    .then(result => {
        console.error('✅ 推送成功');
        console.log(JSON.stringify({ success: true, message_id: result.result.message_id }));
    })
    .catch(err => {
        console.error('❌ 推送失敗:', err.message);
        console.log(JSON.stringify({ success: false, error: err.message }));
        process.exit(1);
    });
