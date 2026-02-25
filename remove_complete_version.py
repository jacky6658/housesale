import re

# 讀取 HTML
with open('AI自主業務員系統-完整版.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 1. 移除完整版的整個 card (從 <div class="card"> 開始到對應的 </div> 結束)
# 找到完整版的開始
pattern = r'<div class="card">\s*<h3[^>]*>完整版</h3>.*?</div>\s*</div>\s*</div>'
html = re.sub(pattern, '</div>', html, flags=re.DOTALL)

# 2. 移除 LINE 提及
html = html.replace('agent-browser（操作 Messenger/LINE）', 'agent-browser（操作 Messenger）')
html = html.replace('建立 Facebook/LINE 帳號', '建立 Facebook 帳號')
html = html.replace('Facebook/LINE', 'Facebook')

# 3. 將 grid-3 改為 grid-2（因為只剩兩個方案）
html = html.replace('<div class="grid-3"', '<div class="grid-2"', 1)

# 儲存
with open('AI自主業務員系統-完整版.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("✅ 已移除完整版 398K 和 LINE 相關內容")
