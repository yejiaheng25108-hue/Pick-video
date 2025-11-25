# 读取文件内容
$content = Get-Content "style.css" -Raw

# 1. 移除所有 transform: rotate(90deg);
$content = $content -replace '\s*transform:\s*rotate\(90deg\);', ''

# 2. 为 .modal-content 添加 overflow-x: hidden (只在第一个出现的地方添加)
$content = $content -replace '(\.modal-content\s*\{)', '$1`r`n    overflow-x: hidden;'

# 3. 在文件末尾添加滚动条样式
$scrollbarStyles = @"

/* 自定义下拉菜单滚动条样式 */
.select-options::-webkit-scrollbar {
    width: 8px;
}

.select-options::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: var(--radius-sm);
}

.select-options::-webkit-scrollbar-thumb {
    background: var(--gradient-primary);
    border-radius: var(--radius-sm);
}

.select-options::-webkit-scrollbar-thumb:hover {
    background: var(--gradient-accent);
}

/* 全局页面滚动条样式 */
::-webkit-scrollbar {
    width: 12px;
}

::-webkit-scrollbar-track {
    background: var(--color-bg-secondary);
}

::-webkit-scrollbar-thumb {
    background: var(--gradient-primary);
    border-radius: var(--radius-sm);
    border: 2px solid var(--color-bg-secondary);
}

::-webkit-scrollbar-thumb:hover {
    background: var(--gradient-accent);
}
"@

# 移除可能已经存在的滚动条样式
$content = $content -replace '/\* 自定义下拉菜单滚动条样式 \*/[\s\S]*?::-webkit-scrollbar-thumb:hover \{[\s\S]*?\}', ''
$content = $content -replace '/\* 全局页面滚动条样式 \*/[\s\S]*?::-webkit-scrollbar-thumb:hover \{[\s\S]*?\}', ''

# 添加新的滚动条样式
$content = $content.TrimEnd() + $scrollbarStyles

# 写回文件
$content | Set-Content "style.css" -NoNewline

Write-Host "修复完成!"
