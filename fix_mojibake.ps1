$file = "public/dashboard.html"
$content = Get-Content $file -Raw -Encoding UTF8

$emojis = @("👋", "📊", "🧾", "💬", "🛍️", "💰", "🎨", "📝", "🎟️", "🔌", "👥", "⚙️", "🔒", "❌", "✅", "⚠️", "—")

foreach ($emoji in $emojis) {
    # Generate the corrupted version of this emoji
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($emoji)
    $corrupted = [System.Text.Encoding]::GetEncoding(1252).GetString($bytes)
    
    # Replace the corrupted version with the correct emoji
    $content = $content -replace [regex]::Escape($corrupted), $emoji
}

# The camera emoji was added later and might have been corrupted or not.
# Let's also fix it if it was corrupted.
$camBytes = [System.Text.Encoding]::UTF8.GetBytes("📷")
$camCorrupted = [System.Text.Encoding]::GetEncoding(1252).GetString($camBytes)
$content = $content -replace [regex]::Escape($camCorrupted), "📷"

$utf8NoBom = New-Object System.Text.UTF8Encoding $False
[System.IO.File]::WriteAllText((Join-Path (Get-Location) $file), $content, $utf8NoBom)
Write-Host "Fixed dashboard.html"
