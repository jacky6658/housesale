import re

# 讀取文件
with open('技術限制說明文件.md', 'r', encoding='utf-8') as f:
    content = f.read()

# 移除所有剩餘的 LINE 提及
content = content.replace('（不提供 LINE 支援，客戶使用 Telegram）', '')
content = content.replace('**建議：完整版（398K）+ LINE Bot（50K）**', '**建議：進階版（198K）**')
content = content.replace('- ✅ LINE Bot 自動分析', '')
content = content.replace('- [ ] 完整版（+ LINE Bot，高投資）', '')

# 更新「情境 C」改為只有兩個方案
pattern = r'### 情境 C：積極型客戶（追求 100% 覆蓋）.*?(?=---|\n## )'
replacement = '''### 備註

**通訊方式：**
本系統使用 Telegram 作為推送通知管道，不支援 LINE 整合。

'''
content = re.sub(pattern, replacement, content, flags=re.DOTALL)

# 更新建議策略，只保留兩個方案
pattern = r'1\. \*\*基礎版（98K）\*\*：專注 591 \+ PTT（80% 覆蓋，零風險）\n2\. \*\*進階版（198K）\*\*：加入 Facebook 半自動（95% 覆蓋，中風險）\n3\. \*\*完整版（398K）\*\*：全平台支援 \+ LINE Bot（100% 覆蓋，需額外開發）'
replacement = '''1. **基礎版（98K）**：專注 591 + PTT（80% 覆蓋，零風險）
2. **進階版（198K）**：加入 Facebook 半自動（95% 覆蓋，中風險）'''
content = re.sub(pattern, replacement, content, flags=re.DOTALL)

# 儲存
with open('技術限制說明文件.md', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ 最終清理完成")
