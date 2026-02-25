#!/usr/bin/env node
/**
 * AI 判斷：屋主 vs 仲介 + 物件評分
 * 輸入：物件 JSON
 * 輸出：判斷結果 JSON
 */

const fs = require('fs');

// 讀取物件資料
let listing;
if (process.argv[2]) {
    if (process.argv[2].startsWith('{')) {
        // 直接傳入 JSON 字串
        listing = JSON.parse(process.argv[2]);
    } else {
        // 檔案路徑
        listing = JSON.parse(fs.readFileSync(process.argv[2], 'utf-8'));
    }
} else {
    // 從 stdin 讀取
    const stdin = fs.readFileSync(0, 'utf-8');
    listing = JSON.parse(stdin);
}

// 載入設定
const configPath = __dirname + '/../config/monitoring-settings.json';
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

/**
 * 判斷是否為屋主（簡化版）
 */
function judgeIsOwner(listing) {
    const text = [
        listing.title || '',
        listing.description || '',
        listing.contact || '',
        listing.raw_html || ''
    ].join(' ').toLowerCase();
    
    let score = 50; // 預設 50%
    
    // 仲介關鍵字（扣分）
    const agentKeywords = [
        '仲介', '房屋', '不動產', '地產', '房仲',
        '專業服務', '歡迎委託', '代理', '公司',
        '0800', '市話', '多間', '多筆'
    ];
    
    agentKeywords.forEach(keyword => {
        if (text.includes(keyword)) {
            score -= 10;
        }
    });
    
    // 屋主關鍵字（加分）
    const ownerKeywords = [
        '屋主', '自租', '自售', '本人', '自己的',
        '誠', '急', '直接', '面談'
    ];
    
    ownerKeywords.forEach(keyword => {
        if (text.includes(keyword)) {
            score += 10;
        }
    });
    
    // 聯絡方式判斷
    if (listing.contact) {
        // 手機號碼（加分）
        if (/09\d{8}/.test(listing.contact)) {
            score += 15;
        }
        // 市話或 0800（扣分）
        if (/0[2-8]-|\(0[2-8]\)|0800/.test(listing.contact)) {
            score -= 15;
        }
    }
    
    // 標題判斷
    if (listing.title) {
        // 太專業的標題（扣分）
        if (/優質|精選|嚴選|推薦|熱門/.test(listing.title)) {
            score -= 5;
        }
        // 簡單描述（加分）
        if (listing.title.length < 20) {
            score += 5;
        }
    }
    
    // 限制範圍 0-100
    score = Math.max(0, Math.min(100, score));
    
    return {
        is_owner: score >= 60,
        confidence: score,
        判斷依據: score >= 60 ? '高機率屋主' : (score >= 40 ? '不確定' : '可能仲介')
    };
}

/**
 * 物件評分（0-100 分）
 */
function scoreListing(listing, config) {
    let totalScore = 0;
    const weights = config.ai.scoring.weights;
    
    // 1. 價格合理性（30 分）
    const targetPrice = (config.monitoring.criteria.budget_min + config.monitoring.criteria.budget_max) / 2;
    if (listing.price && targetPrice) {
        const priceDiff = Math.abs(listing.price - targetPrice) / targetPrice;
        if (priceDiff < 0.1) {
            // 在目標價格 ±10% 內
            totalScore += weights.price;
        } else if (priceDiff < 0.2) {
            // 在目標價格 ±20% 內
            totalScore += weights.price * 0.7;
        } else if (priceDiff < 0.3) {
            // 在目標價格 ±30% 內
            totalScore += weights.price * 0.4;
        } else {
            totalScore += weights.price * 0.2;
        }
    } else {
        totalScore += weights.price * 0.5; // 無價格資訊給一半
    }
    
    // 2. 空間適配性（25 分）
    if (listing.area && config.monitoring.criteria.area_min) {
        if (listing.area >= config.monitoring.criteria.area_min) {
            const areaMatch = Math.min(1, listing.area / config.monitoring.criteria.area_min);
            totalScore += weights.space * areaMatch;
        } else {
            totalScore += weights.space * 0.3; // 坪數不足扣分
        }
    } else {
        totalScore += weights.space * 0.5;
    }
    
    // 3. 地段評估（20 分）
    // 簡化版：檢查地點是否包含目標區域
    if (listing.location && config.monitoring.criteria.region) {
        if (listing.location.includes(config.monitoring.criteria.region)) {
            totalScore += weights.location;
        } else {
            totalScore += weights.location * 0.5;
        }
    } else {
        totalScore += weights.location * 0.5;
    }
    
    // 4. 屋主可能性（15 分）
    const ownerJudge = judgeIsOwner(listing);
    totalScore += weights.owner_probability * (ownerJudge.confidence / 100);
    
    // 5. 物件完整度（10 分）
    let completeness = 0;
    if (listing.title) completeness += 0.2;
    if (listing.price) completeness += 0.2;
    if (listing.area) completeness += 0.2;
    if (listing.description && listing.description.length > 20) completeness += 0.2;
    if (listing.images && listing.images.length > 0) completeness += 0.2;
    
    totalScore += weights.completeness * completeness;
    
    // 四捨五入
    totalScore = Math.round(totalScore);
    
    return {
        score: totalScore,
        breakdown: {
            price: Math.round(weights.price * (totalScore / 100)),
            space: Math.round(weights.space * (totalScore / 100)),
            location: Math.round(weights.location * (totalScore / 100)),
            owner: Math.round(weights.owner_probability * (ownerJudge.confidence / 100)),
            completeness: Math.round(weights.completeness * completeness)
        }
    };
}

// 執行判斷
const ownerResult = judgeIsOwner(listing);
const scoreResult = scoreListing(listing, config);

// 輸出結果
const result = {
    listing_id: listing.id,
    score: scoreResult.score,
    is_owner: ownerResult.is_owner,
    confidence: ownerResult.confidence,
    判斷依據: ownerResult.判斷依據,
    評分細節: scoreResult.breakdown,
    timestamp: new Date().toISOString()
};

console.log(JSON.stringify(result, null, 2));
