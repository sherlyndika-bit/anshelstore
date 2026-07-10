const fs = require('fs');
let content = fs.readFileSync('public/dashboard.html', 'utf8');

// Replace the isolated span emojis based on the text that follows them
const cardReplacements = [
    { name: 'Produk &amp; Harga', emoji: '🎮' },
    { name: 'Tampilan &amp; Konten', emoji: '🎨' },
    { name: 'Pesanan', emoji: '🧾' },
    { name: 'Inbox Chat', emoji: '💬' },
    { name: 'Artikel', emoji: '📝' },
    { name: 'Finansial', emoji: '💰' },
    { name: 'Integrasi &amp; API', emoji: '🔌' },
    { name: 'Tim &amp; Akses', emoji: '👥' },
    { name: 'Promo &amp; Diskon', emoji: '🎟️' }
];

for (const r of cardReplacements) {
    // Regex matches the span containing ?? or ???, followed by whitespace and then the bold tag with the name
    const regex = new RegExp('<span class="text-3xl mb-2 group-hover:scale-110 transition-transform origin-bottom-left">\\?\\?+<\\/span>\\s*<b class="text-sm text-slate-800 mb-0\\.5">' + r.name + '<\\/b>', 'g');
    content = content.replace(regex, '<span class="text-3xl mb-2 group-hover:scale-110 transition-transform origin-bottom-left">' + r.emoji + '</span>\n                <b class="text-sm text-slate-800 mb-0.5">' + r.name + '</b>');
}

// Other stray question marks
content = content.replace(/\?\? Klien \/ Perusahaan/g, '🏢 Klien / Perusahaan');
content = content.replace(/\?\? Logo/g, '📷 Logo');
content = content.replace(/<span class="text-2xl">\?\?<\/span> Integrasi/g, '<span class="text-2xl">🔌</span> Integrasi');
content = content.replace(/\?\?\? Promo &amp; Diskon/g, '🎟️ Promo &amp; Diskon');

fs.writeFileSync('public/dashboard.html', content, 'utf8');
console.log("Fixed the rest of the emojis!");
