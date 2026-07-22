/* ============================================================
   FEEDBACK.JS – FeedbackEngine
   Modul umpan balik reusable untuk semua kuis E-Modul.

   CARA PAKAI:
   ─────────────────────────────────────────────────────────
   1. Sertakan di HTML: <script src="js/feedback.js"></script>
   2. Inisialisasi sekali per halaman kuis:
      FeedbackEngine.init({
        onNext:   (question) => goNextQuestion(),  // callback lanjut
        onRetry:  (question) => retryQuestion(),   // callback coba lagi
        onSkip:   (question) => goNextQuestion(),  // callback lewati
      });
   3. Panggil saat jawaban dipilih:
      FeedbackEngine.showCorrect(question, selectedIdx);
      FeedbackEngine.showWrong(question, selectedIdx);
      FeedbackEngine.showTimeout(question);

   SKEMA DATA SOAL YANG DIDUKUNG:
   ─────────────────────────────────────────────────────────
   {
     id:         number,
     text:       string,
     options:    string[],
     correct:    number,          // index pilihan benar
     whyCorrect: string,          // penjelasan MENGAPA jawaban itu benar
     whyWrong:   string[]|null,   // penjelasan per-pilihan salah (null = generik)
     example:    string,          // contoh nyata penggunaan konsep
     hint:       string|null,     // petunjuk (opsional)
   }
   ============================================================ */

'use strict';

const FeedbackEngine = (() => {

  /* ────────────────────────────────────────────────────────
     1. INTERNAL STATE
     ──────────────────────────────────────────────────────── */
  const _state = {
    initialized: false,
    panelEl:    null,
    overlayEl:  null,
    toastEl:    null,
    callbacks:  { onNext: null, onRetry: null, onSkip: null },
    currentQ:   null,
    retryCount: 0,          // berapa kali retry soal ini
    prefersReduced: false,
  };

  const SPARKLE_EMOJIS = ['✨','⭐','💫','🌟','✨','⭐'];
  const CORRECT_PHRASES = [
    'Tepat sekali!',
    'Luar biasa!',
    'Benar! Kerja bagus.',
    'Hebat! Anda memahaminya.',
    'Tepat! Terus pertahankan.',
  ];
  const WRONG_PHRASES = [
    'Belum tepat, yuk coba lagi!',
    'Hampir! Mari pelajari lebih lanjut.',
    'Tidak apa-apa, ini kesempatan belajar! 💙',
    'Tetap semangat! Lihat penjelasannya.',
  ];
  const TIMEOUT_PHRASES = [
    'Waktu habis – tidak apa-apa!',
    'Waktu habis! Yuk pelajari jawabannya.',
  ];

  /* ────────────────────────────────────────────────────────
     2. HELPERS
     ──────────────────────────────────────────────────────── */

  function _rand(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function _escape(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* Buat DOM node dengan attrs & class */
  function _el(tag, cls, attrs = {}) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    return el;
  }

  /* ────────────────────────────────────────────────────────
     3. BUILD DOM PANEL (dilakukan sekali)
     ──────────────────────────────────────────────────────── */

  function _buildPanel() {
    // Overlay
    const overlay = _el('div', 'fb-overlay', {
      id: 'fb-overlay',
      'aria-hidden': 'true',
    });

    // Panel
    const panel = _el('div', 'fb-panel', {
      id: 'fb-panel',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-live': 'polite',
      'aria-labelledby': 'fb-heading',
    });

    panel.innerHTML = `
      <div class="fb-sparkle-container" id="fb-sparkles" aria-hidden="true"></div>

      <!-- Header -->
      <div class="fb-header">
        <div class="fb-header-icon-ring" id="fb-icon" aria-hidden="true"></div>
        <div class="fb-header-text">
          <h2 class="fb-heading" id="fb-heading"></h2>
          <p class="fb-subheading" id="fb-subheading"></p>
        </div>
        <div id="fb-score-pill"></div>
      </div>

      <!-- Body – konten dinamis -->
      <div id="fb-body"></div>

      <!-- Aksi -->
      <div class="fb-actions" id="fb-actions"></div>
    `;

    // Toast
    const toast = _el('div', 'fb-toast', { id: 'fb-toast', 'aria-live': 'assertive' });

    document.body.appendChild(overlay);
    document.body.appendChild(panel);
    document.body.appendChild(toast);

    _state.panelEl   = panel;
    _state.overlayEl = overlay;
    _state.toastEl   = toast;

    // Tutup overlay saat klik backdrop
    overlay.addEventListener('click', () => _dismiss());

    // Keyboard: Escape tutup panel
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && _state.panelEl.classList.contains('fb-panel--visible')) {
        _dismiss();
      }
    });
  }

  /* ────────────────────────────────────────────────────────
     4. SHOW / HIDE PANEL
     ──────────────────────────────────────────────────────── */

  function _show() {
    _state.panelEl.classList.add('fb-panel--visible');
    _state.overlayEl.classList.add('fb-overlay--visible');

    // Focus trap: fokus ke panel agar screen reader membacanya
    setTimeout(() => {
      const firstBtn = _state.panelEl.querySelector('button');
      if (firstBtn) firstBtn.focus();
    }, 400);
  }

  function _dismiss() {
    _state.panelEl.classList.remove('fb-panel--visible');
    _state.overlayEl.classList.remove('fb-overlay--visible');
  }

  /* ────────────────────────────────────────────────────────
     5. RENDER KONTEN PANEL
     ──────────────────────────────────────────────────────── */

  /**
   * Render panel jawaban BENAR.
   */
  function _renderCorrect(question, selectedIdx) {
    const panel = _state.panelEl;
    const correctText = question.options[question.correct];

    // Kelas panel
    panel.className = 'fb-panel fb-panel--correct';

    // Header
    panel.querySelector('#fb-icon').textContent = '✅';
    panel.querySelector('#fb-heading').textContent = _rand(CORRECT_PHRASES);
    panel.querySelector('#fb-heading').className = 'fb-heading fb-heading--correct';
    panel.querySelector('#fb-subheading').textContent = 'Jawaban Anda benar!';

    // Skor pill
    const scorePill = panel.querySelector('#fb-score-pill');
    scorePill.innerHTML = `<span class="fb-score-pill">
      <span class="fb-score-dot"></span>+1 poin
    </span>`;

    // Body
    const body = panel.querySelector('#fb-body');
    body.innerHTML = `
      <!-- Mengapa benar -->
      <div class="fb-why-block fb-why-block--correct">
        <div class="fb-why-title fb-why-title--correct">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="3" aria-hidden="true">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          Mengapa ini jawaban yang tepat?
        </div>
        <p class="fb-why-text">${_escape(question.whyCorrect || question.explanation || '')}</p>
      </div>

      ${question.example ? `
      <!-- Contoh nyata -->
      <div class="fb-example-block">
        <span class="fb-example-icon" aria-hidden="true">💼</span>
        <div class="fb-example-content">
          <div class="fb-example-label">Contoh Nyata</div>
          <p class="fb-example-text">${_escape(question.example)}</p>
        </div>
      </div>` : ''}
    `;

    // Aksi
    const actions = panel.querySelector('#fb-actions');
    actions.innerHTML = `
      <button class="fb-btn-primary fb-btn-primary--next" id="fb-btn-next"
        aria-label="Lanjut ke soal berikutnya">
        Lanjut
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2.5" aria-hidden="true">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </button>
    `;

    panel.querySelector('#fb-btn-next').addEventListener('click', () => {
      _dismiss();
      if (_state.callbacks.onNext) _state.callbacks.onNext(question);
    });
  }

  /**
   * Render panel jawaban SALAH.
   */
  function _renderWrong(question, selectedIdx) {
    const panel = _state.panelEl;
    const selectedText = selectedIdx >= 0 ? question.options[selectedIdx] : '(tidak memilih)';
    const correctText  = question.options[question.correct];

    // Penjelasan mengapa pilihan ini keliru (per-pilihan atau generik)
    const whyWrongText = (
      question.whyWrong &&
      Array.isArray(question.whyWrong) &&
      selectedIdx >= 0 &&
      question.whyWrong[selectedIdx]
    )
      ? question.whyWrong[selectedIdx]
      : null;

    panel.className = 'fb-panel fb-panel--wrong';

    // Header
    panel.querySelector('#fb-icon').textContent = '💙';
    panel.querySelector('#fb-heading').textContent = _rand(WRONG_PHRASES);
    panel.querySelector('#fb-heading').className = 'fb-heading fb-heading--wrong';
    panel.querySelector('#fb-subheading').textContent =
      _state.retryCount > 0
        ? `Percobaan ke-${_state.retryCount + 1} — Anda pasti bisa!`
        : 'Pelajari penjelasannya, lalu coba lagi.';

    // Skor pill – tidak ada poin, tidak ada penalti
    const scorePill = panel.querySelector('#fb-score-pill');
    scorePill.innerHTML = _state.retryCount > 0
      ? `<span class="fb-retry-badge">Retry #${_state.retryCount}</span>`
      : '';

    // Body
    const body = panel.querySelector('#fb-body');
    body.innerHTML = `
      <!-- Perbandingan jawaban -->
      <div class="fb-answer-compare" aria-label="Perbandingan jawaban">
        <div class="fb-answer-row fb-answer-row--selected">
          <span class="fb-answer-icon" aria-hidden="true">🔸</span>
          <div>
            <span class="fb-answer-label">Jawaban Anda</span>
            <span class="fb-answer-text">${_escape(selectedText)}</span>
          </div>
        </div>
        <div class="fb-answer-row fb-answer-row--correct">
          <span class="fb-answer-icon" aria-hidden="true">✅</span>
          <div>
            <span class="fb-answer-label">Jawaban yang Benar</span>
            <span class="fb-answer-text">${_escape(correctText)}</span>
          </div>
        </div>
      </div>

      ${whyWrongText ? `
      <!-- Mengapa pilihan itu keliru -->
      <div class="fb-why-block fb-why-block--wrong">
        <div class="fb-why-title fb-why-title--wrong">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" aria-hidden="true">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          Mengapa pilihan itu kurang tepat?
        </div>
        <p class="fb-why-text">${_escape(whyWrongText)}</p>
      </div>` : ''}

      <!-- Mengapa jawaban benar itu benar -->
      <div class="fb-why-block fb-why-block--correct">
        <div class="fb-why-title fb-why-title--correct">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="3" aria-hidden="true">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          Penjelasan jawaban yang benar
        </div>
        <p class="fb-why-text">${_escape(question.whyCorrect || question.explanation || '')}</p>
      </div>

      ${question.example ? `
      <!-- Contoh nyata -->
      <div class="fb-example-block">
        <span class="fb-example-icon" aria-hidden="true">💼</span>
        <div class="fb-example-content">
          <div class="fb-example-label">Contoh Nyata</div>
          <p class="fb-example-text">${_escape(question.example)}</p>
        </div>
      </div>` : ''}
    `;

    // Aksi: Coba Lagi + Lewati
    const actions = panel.querySelector('#fb-actions');
    actions.innerHTML = `
      <button class="fb-btn-primary fb-btn-primary--retry" id="fb-btn-retry"
        aria-label="Coba lagi soal ini tanpa penalti skor">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2.5" aria-hidden="true">
          <polyline points="1 4 1 10 7 10"/>
          <path d="M3.51 15a9 9 0 1 0 .49-4.11"/>
        </svg>
        Coba Lagi
      </button>
      <button class="fb-btn-skip" id="fb-btn-skip"
        aria-label="Lewati soal ini dan lanjut ke soal berikutnya">
        Lewati soal ini
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2" aria-hidden="true">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </button>
    `;

    panel.querySelector('#fb-btn-retry').addEventListener('click', () => {
      _state.retryCount++;
      _dismiss();
      setTimeout(() => {
        if (_state.callbacks.onRetry) _state.callbacks.onRetry(question, _state.retryCount);
      }, 350); // tunggu panel tertutup
    });

    panel.querySelector('#fb-btn-skip').addEventListener('click', () => {
      _dismiss();
      setTimeout(() => {
        if (_state.callbacks.onSkip) _state.callbacks.onSkip(question);
      }, 350);
    });
  }

  /**
   * Render panel TIMEOUT (waktu habis).
   */
  function _renderTimeout(question) {
    const panel = _state.panelEl;
    const correctText = question.options[question.correct];

    panel.className = 'fb-panel fb-panel--timeout';

    panel.querySelector('#fb-icon').textContent = '⏱';
    panel.querySelector('#fb-heading').textContent = _rand(TIMEOUT_PHRASES);
    panel.querySelector('#fb-heading').className = 'fb-heading fb-heading--timeout';
    panel.querySelector('#fb-subheading').textContent = 'Waktu habis. Simak jawabannya ya!';

    panel.querySelector('#fb-score-pill').innerHTML = '';

    const body = panel.querySelector('#fb-body');
    body.innerHTML = `
      <div class="fb-answer-row fb-answer-row--correct" style="margin-bottom:var(--space-3);">
        <span class="fb-answer-icon" aria-hidden="true">✅</span>
        <div>
          <span class="fb-answer-label">Jawaban yang Benar</span>
          <span class="fb-answer-text">${_escape(correctText)}</span>
        </div>
      </div>

      <div class="fb-why-block fb-why-block--correct">
        <div class="fb-why-title fb-why-title--correct">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="3" aria-hidden="true">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          Penjelasan singkat
        </div>
        <p class="fb-why-text">${_escape(question.whyCorrect || question.explanation || '')}</p>
      </div>

      ${question.example ? `
      <div class="fb-example-block">
        <span class="fb-example-icon" aria-hidden="true">💼</span>
        <div class="fb-example-content">
          <div class="fb-example-label">Contoh</div>
          <p class="fb-example-text">${_escape(question.example)}</p>
        </div>
      </div>` : ''}
    `;

    const actions = panel.querySelector('#fb-actions');
    actions.innerHTML = `
      <button class="fb-btn-primary fb-btn-primary--timeout" id="fb-btn-timeout-next"
        aria-label="Lanjut ke soal berikutnya">
        Lanjutkan
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2.5" aria-hidden="true">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </button>
    `;

    panel.querySelector('#fb-btn-timeout-next').addEventListener('click', () => {
      _dismiss();
      if (_state.callbacks.onSkip) _state.callbacks.onSkip(question);
    });
  }

  /* ────────────────────────────────────────────────────────
     6. EFEK VISUAL
     ──────────────────────────────────────────────────────── */

  /** Konfeti dari Utils (jika tersedia) atau fallback internal */
  function _triggerConfetti() {
    if (_state.prefersReduced) return;
    if (typeof Utils !== 'undefined' && Utils.showConfetti) {
      Utils.showConfetti();
    } else {
      _internalConfetti();
    }
  }

  /** Konfeti internal ringan (16 piece) */
  function _internalConfetti() {
    const container = document.getElementById('confetti-container');
    if (!container) return;
    container.innerHTML = '';
    for (let i = 0; i < 16; i++) {
      const p = document.createElement('div');
      p.className = 'confetti-piece';
      container.appendChild(p);
    }
    setTimeout(() => { container.innerHTML = ''; }, 3200);
  }

  /** Sparkle emojis di dalam panel */
  function _triggerSparkles() {
    if (_state.prefersReduced) return;
    const container = document.getElementById('fb-sparkles');
    if (!container) return;
    container.innerHTML = '';

    const positions = [15, 30, 50, 70, 85];
    positions.forEach((left, i) => {
      const s = document.createElement('span');
      s.className = 'fb-sparkle';
      s.textContent = SPARKLE_EMOJIS[i % SPARKLE_EMOJIS.length];
      s.style.left = `${left}%`;
      s.style.top = '60%';
      s.style.animationDelay = `${i * 120}ms`;
      container.appendChild(s);
    });

    setTimeout(() => { container.innerHTML = ''; }, 2200);
  }

  /** Heartbeat icon skor */
  function _triggerHeartbeat(el) {
    if (!el || _state.prefersReduced) return;
    el.style.animation = 'none';
    el.offsetHeight;
    el.style.animation = 'heartbeat 0.5s ease both';
  }

  /** animasi breatheIn pada panel body */
  function _triggerBreatheIn() {
    if (_state.prefersReduced) return;
    const body = document.getElementById('fb-body');
    if (!body) return;
    body.style.animation = 'none';
    body.offsetHeight;
    body.style.animation = 'breatheIn 0.6s ease both';
  }

  /** Wobble lembut pada question card saat retry */
  function _triggerWobble() {
    if (_state.prefersReduced) return;
    const card = document.getElementById('quiz-question-card');
    if (!card) return;
    card.style.animation = 'none';
    card.offsetHeight;
    card.style.animation = 'wobbleGentle 0.5s ease both';
  }

  /* ────────────────────────────────────────────────────────
     7. TOAST RINGAN
     ──────────────────────────────────────────────────────── */

  function _showToast(msg, type = 'correct') {
    const t = _state.toastEl;
    if (!t) return;

    t.textContent = msg;
    t.className = `fb-toast fb-toast--${type}`;
    t.classList.add('fb-toast--show');

    clearTimeout(t._timeout);
    t._timeout = setTimeout(() => {
      t.classList.remove('fb-toast--show');
    }, 2000);
  }

  /* ────────────────────────────────────────────────────────
     8. API PUBLIK
     ──────────────────────────────────────────────────────── */

  /**
   * Inisialisasi FeedbackEngine.
   * Harus dipanggil sekali sebelum showCorrect/showWrong.
   *
   * @param {Object} config
   * @param {Function} config.onNext   – dipanggil saat pengguna klik Lanjut
   * @param {Function} config.onRetry  – dipanggil saat klik Coba Lagi
   * @param {Function} config.onSkip   – dipanggil saat klik Lewati
   */
  function init(config = {}) {
    if (_state.initialized) {
      // Re-init: update callbacks saja
      Object.assign(_state.callbacks, config);
      return;
    }

    _state.callbacks.onNext  = config.onNext  || null;
    _state.callbacks.onRetry = config.onRetry || null;
    _state.callbacks.onSkip  = config.onSkip  || null;

    _state.prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
      _state.prefersReduced = e.matches;
    });

    _buildPanel();
    _state.initialized = true;
  }

  /**
   * Tampilkan umpan balik BENAR.
   * @param {Object} question  – data soal
   * @param {number} selectedIdx
   */
  function showCorrect(question, selectedIdx = question.correct) {
    if (!_state.initialized) { console.warn('FeedbackEngine: panggil init() terlebih dahulu.'); return; }
    _state.currentQ   = question;
    _state.retryCount = 0;

    _renderCorrect(question, selectedIdx);
    _show();
    _triggerConfetti();
    _triggerSparkles();
    _showToast('✅ Tepat sekali! +1 poin', 'correct');

    // Heartbeat pada skor pill
    setTimeout(() => {
      _triggerHeartbeat(document.querySelector('.fb-score-pill'));
    }, 200);
  }

  /**
   * Tampilkan umpan balik SALAH.
   * @param {Object} question
   * @param {number} selectedIdx  – index pilihan yang dipilih (-1 jika timeout)
   */
  function showWrong(question, selectedIdx = -1) {
    if (!_state.initialized) { console.warn('FeedbackEngine: panggil init() terlebih dahulu.'); return; }
    _state.currentQ = question;

    _renderWrong(question, selectedIdx);
    _show();
    _triggerBreatheIn();
    _showToast('💙 Belum tepat — lihat penjelasannya!', 'wrong');
  }

  /**
   * Tampilkan panel WAKTU HABIS.
   * @param {Object} question
   */
  function showTimeout(question) {
    if (!_state.initialized) { console.warn('FeedbackEngine: panggil init() terlebih dahulu.'); return; }
    _state.currentQ = question;

    _renderTimeout(question);
    _show();
    _showToast('⏱ Waktu habis! Tidak apa-apa ya.', 'timeout');
  }

  /**
   * Sembunyikan panel secara paksa (misalnya saat navigasi).
   */
  function dismiss() {
    _dismiss();
  }

  /**
   * Reset counter retry untuk soal baru.
   */
  function reset() {
    _state.retryCount = 0;
    _state.currentQ   = null;
  }

  /**
   * Trigger wobble pada question card (dipanggil dari quiz.js saat retry).
   */
  function triggerRetryAnimation() {
    _triggerWobble();
  }

  // ── expose ──
  return { init, showCorrect, showWrong, showTimeout, dismiss, reset, triggerRetryAnimation };

})();

window.FeedbackEngine = FeedbackEngine;
