# 讀取文件
with open('技術限制說明文件.md', 'r', encoding='utf-8') as f:
    content = f.read()

# 移除完整版的提及
content = content.replace('（基礎版 14 天，進階版 6 個月，完整版 12 個月）', '（基礎版 14 天，進階版 6 個月）')
content = content.replace('（98K / 198K / 398K）', '（98K / 198K）')

# 儲存
with open('技術限制說明文件.md', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ 完成")
