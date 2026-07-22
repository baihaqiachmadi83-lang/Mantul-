'use strict';

/* ──────────────────────────────────────────────────────
   THEME & QUICK TOOLS PANEL
   ────────────────────────────────────────────────────── */
function updateThemeIcon(theme) {
  const icon = document.getElementById('theme-icon');
  if (icon) {
    icon.textContent = theme === 'dark' ? '☀️' : '🌙';
  }
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  let newTheme;
  if (currentTheme === 'dark') {
    newTheme = 'light';
  } else if (currentTheme === 'light') {
    newTheme = 'dark';
  } else {
    const isSystemDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    newTheme = isSystemDark ? 'light' : 'dark';
  }
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('mantul_theme', newTheme);
  updateThemeIcon(newTheme);
}

function unlockAllSteps() {
  if (typeof QuizStore !== 'undefined') {
    const raw = localStorage.getItem('emodul_quiz_store');
    const store = raw ? JSON.parse(raw) : {};
    [1, 2, 3].forEach(unitId => {
      store[`unit_${unitId}`] = store[`unit_${unitId}`] || { bestScore: null, lastScore: null, totalAttempts: 0, sessions: [] };
      store[`unit_${unitId}`].bestScore = 100;
      store[`unit_${unitId}`].lastScore = 100;
    });
    localStorage.setItem('emodul_quiz_store', JSON.stringify(store));
  }
  
  const data = {
    units: [
      { id: 1, progress: 100, status: 'done' },
      { id: 2, progress: 100, status: 'done' },
      { id: 3, progress: 100, status: 'done' }
    ]
  };
  localStorage.setItem('emodul_state', JSON.stringify(data));
  localStorage.setItem('emodul_final_unlocked', 'true');
  localStorage.removeItem('emodul_vocab_prog');
  localStorage.removeItem('emodul_speak_prog');
  localStorage.removeItem('emodul_read_prog');
  alert('Semua step telah di-unlock! Halaman akan dimuat ulang.');
  window.location.reload();
}

(function initThemePanel() {
  const saved = localStorage.getItem('mantul_theme');
  const isSystemDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const effectiveTheme = saved || (isSystemDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', effectiveTheme);
  
  // Update icon if it exists (DOM might not be fully ready here for injected elements, but we try)
  document.addEventListener('DOMContentLoaded', () => {
    updateThemeIcon(effectiveTheme);
  });
})();

/* ============================================================
   Shared UI utilities for the E-Modul (confetti + toast).
   Referenced by all pages via <script src="js/app.js">.
   ============================================================ */
window.Utils = (function () {
  function showConfetti(count) {
    var container = document.getElementById('confetti-container') || document.body;
    var colors = ['#2563EB', '#F59E0B', '#10B981', '#EF4444', '#8B5CF6'];
    var n = count || 60;
    for (var i = 0; i < n; i++) {
      var piece = document.createElement('span');
      piece.style.position = 'fixed';
      piece.style.left = (Math.random() * 100) + 'vw';
      piece.style.top = '-12px';
      piece.style.width = '8px';
      piece.style.height = '12px';
      piece.style.background = colors[Math.floor(Math.random() * colors.length)];
      piece.style.opacity = '0.9';
      piece.style.borderRadius = '2px';
      piece.style.zIndex = '9999';
      piece.style.pointerEvents = 'none';
      var dur = 2 + Math.random() * 2;
      piece.style.transition = 'transform ' + dur + 's linear, opacity ' + dur + 's linear';
      container.appendChild(piece);
      (function (p, d) {
        requestAnimationFrame(function () {
          p.style.transform = 'translateY(110vh) rotate(' + (Math.random() * 720) + 'deg)';
          p.style.opacity = '0';
        });
        setTimeout(function () { if (p && p.remove) p.remove(); }, d * 1000 + 300);
      })(piece, dur);
    }
  }

  function showToast(message, type) {
    var t = document.createElement('div');
    t.textContent = message;
    t.setAttribute('role', 'status');
    t.style.position = 'fixed';
    t.style.left = '50%';
    t.style.bottom = '90px';
    t.style.transform = 'translateX(-50%)';
    t.style.background = (type === 'error') ? '#DC2626' : '#111827';
    t.style.color = '#fff';
    t.style.padding = '10px 18px';
    t.style.borderRadius = '999px';
    t.style.fontSize = '14px';
    t.style.fontWeight = '700';
    t.style.zIndex = '10000';
    t.style.maxWidth = '80vw';
    t.style.textAlign = 'center';
    t.style.boxShadow = '0 4px 16px rgba(0,0,0,.2)';
    t.style.opacity = '0';
    t.style.transition = 'opacity .25s ease';
    document.body.appendChild(t);
    requestAnimationFrame(function () { t.style.opacity = '1'; });
    setTimeout(function () {
      t.style.opacity = '0';
      setTimeout(function () { if (t && t.remove) t.remove(); }, 300);
    }, 2600);
  }

  return { showConfetti: showConfetti, showToast: showToast };
})();
