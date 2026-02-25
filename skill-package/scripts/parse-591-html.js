#!/usr/bin/env node
/**
 * 解析 591 HTML，提取物件資訊
 * 輸入：HTML 檔案路徑
 * 輸出：JSON 物件陣列
 */

const fs = require('fs');
const { JSDOM } = require('jsdom');

// 讀取 HTML 檔案
const htmlFile = process.argv[2];
if (!htmlFile) {
    console.error('錯誤：請提供 HTML 檔案路徑');
    process.exit(1);
}

if (!fs.existsSync(htmlFile)) {
    console.error(`錯誤：檔案不存在 ${htmlFile}`);
    process.exit(1);
}

const html = fs.readFileSync(htmlFile, 'utf-8');

// 解析 HTML
const dom = new JSDOM(html);
const document = dom.window.document;

// 591 物件清單選擇器（需要根據實際頁面結構調整）
// 這裡提供基本框架
const listings = [];

// 方法 1：從 DOM 解析
const listItems = document.querySelectorAll('.vue-list-rent-item, .rent-item, [data-bind]');

if (listItems.length > 0) {
    console.error(`找到 ${listItems.length} 個物件（DOM 解析）`);
    
    listItems.forEach((item, index) => {
        try {
            // 提取基本資訊
            const listing = {
                id: null,
                title: '',
                price: null,
                area: null,
                location: '',
                floor: '',
                type: '',
                description: '',
                url: '',
                contact: '',
                images: [],
                raw_html: item.outerHTML.substring(0, 500) // 保留部分 HTML 供 AI 分析
            };
            
            // 物件 ID（通常在 data-* 屬性）
            listing.id = item.getAttribute('data-id') || 
                        item.getAttribute('data-bind') || 
                        `591-${Date.now()}-${index}`;
            
            // 標題
            const titleElem = item.querySelector('.rent-txt, .item-title, h3, a');
            if (titleElem) {
                listing.title = titleElem.textContent.trim();
                listing.url = titleElem.href || '';
            }
            
            // 租金
            const priceElem = item.querySelector('.price, .rent-price, [class*="price"]');
            if (priceElem) {
                const priceText = priceElem.textContent.trim();
                const priceMatch = priceText.match(/[\d,]+/);
                if (priceMatch) {
                    listing.price = parseInt(priceMatch[0].replace(/,/g, ''));
                }
            }
            
            // 坪數
            const areaElem = item.querySelector('.area, .ping, [class*="area"]');
            if (areaElem) {
                const areaText = areaElem.textContent.trim();
                const areaMatch = areaText.match(/([\d.]+)\s*坪/);
                if (areaMatch) {
                    listing.area = parseFloat(areaMatch[1]);
                }
            }
            
            // 地點
            const locationElem = item.querySelector('.location, .address, [class*="location"]');
            if (locationElem) {
                listing.location = locationElem.textContent.trim();
            }
            
            // 樓層
            const floorElem = item.querySelector('.floor, [class*="floor"]');
            if (floorElem) {
                listing.floor = floorElem.textContent.trim();
            }
            
            // 類型
            const typeElem = item.querySelector('.type, .kind, [class*="type"]');
            if (typeElem) {
                listing.type = typeElem.textContent.trim();
            }
            
            // 描述
            const descElem = item.querySelector('.desc, .content, [class*="desc"]');
            if (descElem) {
                listing.description = descElem.textContent.trim();
            }
            
            // 圖片
            const imgElems = item.querySelectorAll('img');
            imgElems.forEach(img => {
                const src = img.src || img.getAttribute('data-src');
                if (src && !src.includes('placeholder')) {
                    listing.images.push(src);
                }
            });
            
            // 只加入有基本資訊的物件
            if (listing.title && listing.price) {
                listings.push(listing);
            }
            
        } catch (err) {
            console.error(`解析物件 ${index} 失敗:`, err.message);
        }
    });
}

// 方法 2：從 JSON-LD 或 Script 標籤解析（591 可能會用）
const scripts = document.querySelectorAll('script');
scripts.forEach(script => {
    const content = script.textContent;
    
    // 尋找 JSON 資料
    if (content.includes('listData') || content.includes('houseList')) {
        try {
            // 嘗試提取 JSON
            const jsonMatch = content.match(/(?:listData|houseList)\s*[:=]\s*(\[[\s\S]*?\]);/);
            if (jsonMatch) {
                const data = JSON.parse(jsonMatch[1]);
                console.error(`找到 ${data.length} 個物件（JSON 解析）`);
                
                // 轉換為標準格式
                data.forEach(item => {
                    listings.push({
                        id: item.houseid || item.id || `591-${Date.now()}-${listings.length}`,
                        title: item.title || item.housename || '',
                        price: parseInt(item.price) || null,
                        area: parseFloat(item.area) || null,
                        location: item.address || item.region || '',
                        floor: item.floor || '',
                        type: item.kind_name || item.type || '',
                        description: item.desc || '',
                        url: item.url || `https://rent.591.com.tw/home/${item.houseid}`,
                        contact: item.contact || '',
                        images: item.images || [],
                        raw_html: ''
                    });
                });
            }
        } catch (err) {
            // 解析失敗，繼續
        }
    }
});

// 輸出結果
if (listings.length === 0) {
    console.error('警告：未找到任何物件');
    console.error('HTML 預覽:', html.substring(0, 500));
}

console.log(JSON.stringify(listings, null, 2));
