$pages = @{
    "index.html" = @{
        "title" = "Anshel Store - Jasa Otomasi AI & Top Up Game Murah Terpercaya"
        "desc" = "Solusi layanan digital cerdas: jasa AI automation untuk WhatsApp, Telegram, Instagram, serta top up game instan, murah, dan terpercaya."
    }
    "topup.html" = @{
        "title" = "Top Up Game Murah, Cepat & Aman - Anshel Store"
        "desc" = "Top up diamond Mobile Legends, Free Fire, Genshin Impact, Valorant, PUBG dengan harga termurah. Proses otomatis, instan, 24 jam nonstop."
    }
    "layanan.html" = @{
        "title" = "Layanan AI Automation & Integrasi WhatsApp - Anshel Store"
        "desc" = "Tingkatkan efisiensi bisnis dengan chatbot AI pintar, integrasi WhatsApp, Telegram, dan solusi otomasi digital dari Anshel Store."
    }
    "tentang.html" = @{
        "title" = "Tentang Anshel Store - Solusi Digital & Top Up Terlengkap"
        "desc" = "Mengenal Anshel Store lebih dekat: platform terpercaya untuk top up game instan dan jasa automasi AI terbaik di Indonesia."
    }
    "faq.html" = @{
        "title" = "FAQ (Pertanyaan Umum) - Anshel Store"
        "desc" = "Jawaban dari pertanyaan yang sering diajukan (FAQ) seputar top up game, sistem pembayaran, dan layanan AI automation di Anshel Store."
    }
    "cek-transaksi.html" = @{
        "title" = "Cek Status Transaksi Top Up - Anshel Store"
        "desc" = "Lacak pesanan dan cek status transaksi top up game kamu secara real-time di Anshel Store hanya dengan kode invoice."
    }
    "cara-pembelian.html" = @{
        "title" = "Cara Pembelian & Panduan Top Up - Anshel Store"
        "desc" = "Panduan lengkap cara pembelian dan top up game instan, praktis, serta pilihan metode pembayaran terlengkap di Anshel Store."
    }
    "kontak.html" = @{
        "title" = "Hubungi Kami - Layanan Pelanggan Anshel Store"
        "desc" = "Pusat bantuan Anshel Store. Hubungi customer service kami jika ada kendala top up atau ingin konsultasi layanan AI automation."
    }
}

$schemaJSON = @"
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "Anshel Store",
  "image": "https://www.anshelstore.biz.id/logo.png",
  "url": "https://www.anshelstore.biz.id/",
  "description": "Jasa AI automation (WhatsApp, Telegram, Instagram) dan platform top up game instan, murah, aman.",
  "address": {
    "@type": "PostalAddress",
    "addressCountry": "ID"
  },
  "priceRange": "$$"
}
</script>
"@

$files = Get-ChildItem -Path "public" -Filter "*.html" | Where-Object { $_.Name -ne "google21e790c967db0fc2.html" }

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $filename = $file.Name
    
    # Defaults if not defined
    $title = "Anshel Store"
    $desc = "Anshel Store: Layanan digital dan top up game."
    
    if ($pages.ContainsKey($filename)) {
        $title = $pages[$filename].title
        $desc = $pages[$filename].desc
    } else {
        if ($content -match "<title>(.*?)</title>") { $title = $matches[1] }
        if ($content -match "<meta\s+name=`"description`"\s+content=`"(.*?)`"") { $desc = $matches[1] }
    }
    
    # Remove existing og:, twitter:, schema
    $content = $content -replace '(?s)<meta property="og:[^>]+>\s*', ''
    $content = $content -replace '(?s)<meta name="twitter:[^>]+>\s*', ''
    $content = $content -replace '(?s)<script type="application/ld\+json">.*?</script>\s*', ''
    
    # Remove existing title and description
    $content = $content -replace '(?s)<title>.*?</title>\s*', ''
    $content = $content -replace '(?s)<meta name="description".*?>\s*', ''
    
    $seoTags = @"
<title>$title</title>
<meta name="description" content="$desc"/>
<meta property="og:title" content="$title"/>
<meta property="og:description" content="$desc"/>
<meta property="og:url" content="https://www.anshelstore.biz.id/"/>
<meta property="og:image" content="https://www.anshelstore.biz.id/logo.png"/>
<meta property="og:type" content="website"/>
<meta property="og:site_name" content="Anshel Store"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="$title"/>
<meta name="twitter:description" content="$desc"/>
<meta name="twitter:image" content="https://www.anshelstore.biz.id/logo.png"/>
$schemaJSON
"@

    $content = $content -replace '</head>', "`n$seoTags`n</head>"
    Set-Content -Path $file.FullName -Value $content -Encoding UTF8 -NoNewline
    Write-Host "Injected SEO into $filename"
}
