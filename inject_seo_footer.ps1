$footer = @"
<noscript>
  <div style="padding:20px;text-align:center;background:#f8fafc;color:#475569;font-size:14px;">
    <p style="font-weight:bold;margin-bottom:10px;">Jelajahi Anshel Store:</p>
    <a href="/">Beranda</a> | <a href="/topup">Top Up Game Murah</a> | <a href="/layanan">Jasa AI Automation</a> | <a href="/blog">Blog & Komunitas</a> | <a href="/masuk">Login/Register</a> | <a href="/tentang">Tentang Kami</a> | <a href="/kontak">Kontak Kami</a> | <a href="/syarat-dan-ketentuan">Syarat & Ketentuan</a> | <a href="/kebijakan-privasi">Kebijakan Privasi</a> | <a href="/faq">FAQ</a>
    <p style="margin-top:15px;font-size:12px;line-height:1.5;">Anshel Store merupakan platform digital terkemuka dan terpercaya di Indonesia yang menyediakan layanan Top Up Game instan untuk berbagai game populer seperti Mobile Legends, Free Fire, PUBG Mobile, dan Valorant. Selain itu, kami juga menawarkan jasa pembuatan chatbot AI Automation profesional untuk WhatsApp, Telegram, dan Instagram guna membantu otomasi bisnis UMKM dan perusahaan. Nikmati pengalaman transaksi yang aman, cepat, dan online 24 jam penuh.</p>
  </div>
</noscript>
</body>
"@

$utf8NoBom = New-Object System.Text.UTF8Encoding $False

$files = Get-ChildItem -Path public -Filter *.html -Recurse
foreach ($file in $files) {
    if ($file.Name -match "^google.*\.html$") { continue }
    
    # Read as UTF8
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    
    # Inject SEO footer before </body>
    if ($content -match "</body>") {
        $content = $content -replace "(?s)<noscript>.*?Jelajahi Anshel Store.*?</noscript>\s*", ""
        $content = $content -replace "</body>", $footer
    }

    # Inject overflow-x-hidden
    if ($content -notmatch "overflow-x-hidden") {
        $content = $content -replace '<body ([^>]*)class="([^"]*)"', '<body $1class="$2 overflow-x-hidden"'
    }

    # Write as UTF8 without BOM
    [System.IO.File]::WriteAllText($file.FullName, $content, $utf8NoBom)
    Write-Host "Fixed $($file.Name)"
}
