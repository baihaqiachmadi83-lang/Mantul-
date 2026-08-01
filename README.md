# MANTUL - Mandiri Tunas English Learning

MANTUL adalah aplikasi belajar Bahasa Inggris interaktif yang dirancang khusus untuk kesetaraan Paket C. Aplikasi ini berjalan sepenuhnya di browser (berbasis Web / PWA) dan dapat diakses secara offline tanpa kuota internet setelah dimuat pertama kali.

## 🚀 Fitur Utama
- **Pembelajaran Interaktif:** Menggunakan sistem *Gamification* dengan animasi, poin (XP), dan mode permainan.
- **Offline Mode (PWA):** Dilengkapi dengan *Service Worker* sehingga aplikasi tetap bisa dijalankan meskipun tidak ada koneksi internet.
- **Berbasis Skenario Nyata:** Modul materi (Vocabulary, Speaking, Reading) disesuaikan dengan skenario sehari-hari.
- **Demo Mode:** Memiliki fitur mode demo (Demo Jump) yang memudahkan presentasi / pengetesan dengan membuka semua *progress* secara instan.

## 📁 Struktur Direktori
- `index.html` - Halaman utama (Dashboard / Peta Unit).
- `unit1-vocabulary.html` - Modul Unit 1: Kosakata dan pemahaman visual.
- `unit2-speaking.html` - Modul Unit 2: Latihan berbicara (mendukung Text-to-Speech).
- `unit3-reading.html` - Modul Unit 3: Latihan membaca teks bahasa Inggris.
- `final-test.html` - Ujian Akhir (terkunci hingga seluruh Unit diselesaikan).
- `*.css` - Kumpulan gaya desain (Design System, Components, Animations).
- `app.js` & `quiz-store.js` - Logika inti navigasi dan penyimpanan sesi pembelajaran.
- `service-worker.js` & `manifest.json` - Konfigurasi Progressive Web App (PWA).

## 🛠 Cara Menjalankan secara Lokal
Karena aplikasi ini menggunakan `service-worker`, sangat disarankan menjalankannya menggunakan *Local Web Server*, bukan sekadar klik dua kali (file://). 

1. Install [VSCode Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) atau [Node.js `serve`](https://www.npmjs.com/package/serve).
2. Jalankan pada root folder `MANTUL-final`.
3. Buka melalui `http://127.0.0.1:5500` atau URL lokal lainnya.

## 🌐 Cara Upload / Hosting ke GitHub Pages
Karena semua *assets*, *scripts*, dan tautan *internal* di dalam proyek ini sudah diset secara **relatif**, Anda dapat langsung melakukan *hosting* secara gratis di **GitHub Pages**:

1. Buat **Repository Baru** di GitHub (misal bernama `MANTUL`).
2. *Upload* semua file di dalam folder `MANTUL-final` ke Repository tersebut (bisa *Drag and Drop* via web GitHub, atau menggunakan GitHub Desktop).
3. Setelah file berhasil ter-upload, buka menu **Settings** > **Pages** di repository Anda.
4. Pada bagian **Build and deployment**, atur *Source* menjadi **Deploy from a branch**.
5. Pilih *Branch* `main` atau `master` dan pilih folder `/ (root)`, lalu klik **Save**.
6. Tunggu sekitar 1-3 menit, lalu *refresh* halaman. Tautan website MANTUL Anda akan siap dan bisa diakses publik (misalnya: `https://username.github.io/MANTUL/`).
