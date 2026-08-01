const Utils = (function() {
  function showConfetti() {
    if (typeof confetti === 'function') {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }
  }

  function showToast(msg, type='info') {
    const t = document.createElement('div');
    t.className = 'toast ' + type;
    t.innerHTML = msg;
    document.body.appendChild(t);
    setTimeout(() => t.classList.add('show'), 10);
    setTimeout(() => {
      t.classList.remove('show');
      setTimeout(() => t.remove(), 300);
    }, 3000);
  }

  return { showConfetti: showConfetti, showToast: showToast };
})();

window.playTTS = function(text, btnElement, gender, role = 'A') {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) {
      alert('Your browser does not support voice features.');
      return resolve();
    }
    
    if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
      window.speechSynthesis.cancel();
    }
    
    let spokenText = text.replace(/\bSiti\b/g, "See tea").replace(/\bBudi\b/g, "Boo dee");
    // Pecah teks berdasarkan tanda baca akhir kalimat untuk menghindari bug pemotongan di Android Chrome
    const chunks = spokenText.match(/[^.!?]+[.!?]*/g) || [spokenText];
    
    if (btnElement && btnElement.classList) {
      document.querySelectorAll('.playing').forEach(el => el.classList.remove('playing'));
      btnElement.classList.add('playing');
    }

    const runTTS = async () => {
      let voices = window.speechSynthesis.getVoices();
      let engVoices = voices.filter(v => v.lang === 'en-AU' || v.lang === 'en_AU' || v.lang === 'en-US' || v.lang === 'en_US');
      if (engVoices.length === 0) engVoices = voices.filter(v => v.lang.startsWith('en'));
      
      let selectedVoice = null;
      if (engVoices.length === 0) {
        if (typeof window.showToast === 'function') window.showToast('Aktifkan suara Bahasa Inggris di setelan Text-to-Speech HP', 'warning');
      }

      if (gender === 'female') {
        let candidates = engVoices.filter(v => v.name.includes('Female') || v.name.includes('Zira') || v.name.includes('Samantha') || (v.name.includes('Google') && !v.name.includes('Male')));
        if (candidates.length === 0) candidates = engVoices;
        selectedVoice = (role === 'B' && candidates.length > 1) ? candidates[candidates.length - 1] : candidates[0];
      } else if (gender === 'male') {
        let candidates = engVoices.filter(v => v.name.includes('Male') || v.name.includes('David') || v.name.includes('Daniel') || (v.name.includes('Google') && v.name.includes('Male')));
        if (candidates.length === 0) candidates = engVoices;
        selectedVoice = (role === 'B' && candidates.length > 1) ? candidates[candidates.length - 1] : candidates[0];
      } else {
        selectedVoice = engVoices[0];
      }

      for (let chunk of chunks) {
        if (!chunk.trim()) continue;
        await new Promise((res) => {
          const utterance = new SpeechSynthesisUtterance(chunk.trim());
          // Rate & pitch 1.0 (default) agar TTS stabil
          utterance.rate = 1.0;
          utterance.pitch = 1.0;
          if (selectedVoice) {
            utterance.voice = selectedVoice;
            utterance.lang = selectedVoice.lang;
          } else {
            utterance.lang = 'en-US';
          }
          utterance.onend = res;
          utterance.onerror = res;
          window._synth_utterance = utterance; // Anti garbage collection
          window.speechSynthesis.speak(utterance);
        });
      }
      
      if (btnElement && btnElement.classList) btnElement.classList.remove('playing');
      resolve();
    };

    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.onvoiceschanged = () => {
        runTTS();
        window.speechSynthesis.onvoiceschanged = null;
      };
      window.speechSynthesis.getVoices();
    } else {
      runTTS();
    }
  });
};
document.addEventListener('DOMContentLoaded', function() {
  if (localStorage.getItem('demo_mode_active') === 'true' || localStorage.getItem('emodul_final_unlocked') === 'true') {
    // Only show on unit pages (where App and nextPhase exist)
    if (window.location.href.includes('unit') || document.querySelector('.sess-tabs')) {
      const skipPanel = document.createElement('div');
      skipPanel.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:99999;background:white;border:2px solid var(--danger);padding:10px;border-radius:var(--radius-lg);box-shadow:var(--shadow-lg);display:flex;flex-direction:column;gap:8px;font-size:12px;color:black;';
      
      skipPanel.innerHTML = `
        <div style="font-weight:bold;color:var(--danger);text-align:center;margin-bottom:4px;">🚀 Demo Jump</div>
        <button id="demo-btn-mat" style="padding:6px;border-radius:4px;background:#f3f4f6;border:1px solid #ddd;cursor:pointer;">📖 1. Material</button>
        <button id="demo-btn-exc" style="padding:6px;border-radius:4px;background:#f3f4f6;border:1px solid #ddd;cursor:pointer;">✍️ 2. Exercise</button>
        <button id="demo-btn-gam" style="padding:6px;border-radius:4px;background:#f3f4f6;border:1px solid #ddd;cursor:pointer;">🎮 3. Game</button>
      `;
      
      document.body.appendChild(skipPanel);
      
      const jumpTo = function(n) {
        if (typeof App !== 'undefined') {
          if (typeof App.goPhase === 'function') {
             App.goPhase(n);
          } else {
             // For units without goPhase helper
             if ('speechSynthesis' in window) window.speechSynthesis.cancel();
             if (typeof FeedbackEngine !== 'undefined' && FeedbackEngine.dismiss) FeedbackEngine.dismiss();
             App.phase = n;
             App.render();
             window.scrollTo({top:100,behavior:'smooth'});
          }
        }
      };
      
      document.getElementById('demo-btn-mat').onclick = () => jumpTo(0);
      document.getElementById('demo-btn-exc').onclick = () => jumpTo(1);
      document.getElementById('demo-btn-gam').onclick = () => jumpTo(2);
    }
  }
});
