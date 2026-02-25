import re

# 讀取文件
with open('技術限制說明文件.md', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. 移除表格中的 LINE 那一行
content = re.sub(r'\| \*\*LINE 社團\*\* \| ❌ 無法自動化 \| 0% \| 手動管理 \|\n', '', content)

# 2. 移除整個 LINE 章節（從 ### 5. LINE 社團 到 下一個 ## 標題之前）
pattern = r'### 5\. LINE 社團.*?(?=\n## )'
content = re.sub(pattern, '', content, flags=re.DOTALL)

# 3. 更新「平台效益分析」中的 LINE 相關內容
# 移除 LINE 社團那一行
content = re.sub(r'\| LINE 社團 \| \d+-\d+ 筆 \| \d+% \| ⭐ \|\n', '', content)

# 4. 更新結論中的百分比（移除 LINE = 5%）
content = content.replace('- **LINE = 5% 額外覆蓋**（手動，成本高）', '')

# 5. 更新建議策略（移除完整版提及 LINE Bot）
content = re.sub(
    r'3\. \*\*完整版（398K）\*\*：全平台支援 \+ LINE Bot（100% 覆蓋，需額外開發）',
    '（不提供 LINE 支援，客戶使用 Telegram）',
    content
)

# 6. 移除 Q3 關於 LINE 的問題
pattern = r'### Q3：LINE 未來會支援自動化嗎？.*?(?=### Q[45]:|### Q\d+:|## )'
content = re.sub(pattern, '', content, flags=re.DOTALL)

# 儲存
with open('技術限制說明文件.md', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ 已移除 LINE 相關內容")
