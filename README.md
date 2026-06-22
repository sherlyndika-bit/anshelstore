# anshelstore

Aplikasi full-stack: **storefront jasa Automation & AI Chatbot**, **Top Up Game**, dan **Dashboard admin** dengan fitur **human takeover** pada percakapan AI.

Dibangun dengan **Node.js murni** (tanpa dependency eksternal) + penyimpanan data berbasis file JSON, sehingga ringan dan mudah dijalankan/deploy.

## Fitur

- **Landing page** — menampilkan daftar jasa (AI Chat Automation, Workflow Automation, Top Up Game).
- **Top Up Game** — katalog 5 game (Mobile Legends, Free Fire, Genshin Impact, Valorant, PUBG Mobile), pilih nominal, isi data akun, buat pesanan.
- **Live Chat + AI** — chatbot AI membalas pelanggan otomatis 24/7 (berbasis aturan, mudah diganti ke LLM seperti OpenAI/Gemini).
- **Human Takeover** — agent dapat mengambil alih percakapan dari AI lewat dashboard; saat mode human, AI berhenti membalas dan agent menjawab manual. Bisa dikembalikan ke AI kapan saja.
- **Dashboard Admin** — kelola order top up (ubah status) dan inbox percakapan secara realtime (polling).

## Struktur

```
anshelstore/
├── server.js           # Backend (HTTP server + REST API)
├── package.json
├── data/db.json        # "Database" JSON: katalog, order, percakapan, pesan
└── public/
    ├── index.html      # Landing
    ├── topup.html      # Top up game
    ├── dashboard.html  # Dashboard admin
    ├── chat.html       # Halaman chat customer (untuk testing)
    ├── css/styles.css
    └── js/             # landing.js, topup.js, dashboard.js, widget.js
```

## Menjalankan

Butuh Node.js >= 18.

```bash
node server.js
# buka http://localhost:3000
```

Atau:

```bash
npm start
```

## API utama

| Method | Endpoint | Keterangan |
|---|---|---|
| GET | `/api/store` | Info toko |
| GET | `/api/services` | Daftar jasa |
| GET | `/api/games` | Katalog game |
| POST | `/api/orders` | Buat pesanan top up |
| PATCH | `/api/orders/:id` | Ubah status pesanan |
| POST | `/api/chat/start` | Mulai percakapan |
| POST | `/api/chat/message` | Pelanggan kirim pesan (dibalas AI bila mode AI) |
| GET | `/api/conversations` | Daftar percakapan (dashboard) |
| POST | `/api/conversations/:id/takeover` | Agent ambil alih |
| POST | `/api/conversations/:id/release` | Kembalikan ke AI |
| POST | `/api/conversations/:id/agent-message` | Agent kirim pesan |

## Catatan integrasi AI

Untuk menggunakan AI sungguhan, ganti isi fungsi `generateAIReply()` di `server.js` dengan panggilan ke API LLM (OpenAI / Anthropic / Gemini).
