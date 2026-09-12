/* ============================================================
   QUIZ-STORE.JS – Persistent skor & progres kuis (localStorage)
   Reusable oleh semua kuis, mandiri dari AppState.
   ============================================================ */

'use strict';

const QuizStore = (() => {
  const STORE_KEY = 'emodul_quiz_store';
  const MAX_SESSIONS = 5; // simpan maks 5 sesi terakhir per unit

  // ──────────────────────────────────────────────────────────
  // Helpers internal
  // ──────────────────────────────────────────────────────────

  /** Baca seluruh store dari localStorage */
  function _read() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  /** Tulis seluruh store ke localStorage */
  function _write(data) {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(data));
    } catch {
      // localStorage penuh atau tidak tersedia – abaikan
    }
  }

  /** Kunci unit dalam store */
  function _key(unitId) {
    return `unit_${unitId}`;
  }

  /** Baca data satu unit */
  function _readUnit(unitId) {
    const store = _read();
    return store[_key(unitId)] || {
      bestScore: null,
      lastScore: null,
      totalAttempts: 0,
      sessions: [],
    };
  }

  /** Tulis data satu unit */
  function _writeUnit(unitId, unitData) {
    const store = _read();
    store[_key(unitId)] = unitData;
    _write(store);
  }

  // ──────────────────────────────────────────────────────────
  // API Publik
  // ──────────────────────────────────────────────────────────

  /**
   * Mulai sesi baru untuk unit tertentu.
   * Mengembalikan session object yang bisa diisi answer-by-answer.
   * @param {number|string} unitId
   * @returns {{ sessionId: string, answers: Array }}
   */
  function startSession(unitId) {
    return {
      sessionId: `${unitId}_${Date.now()}`,
      unitId,
      startTime: new Date().toISOString(),
      answers: [],
      score: null,
      totalQuestions: null,
    };
  }

  /**
   * Catat satu jawaban ke dalam sesi berjalan.
   * @param {Object} session    – object dari startSession()
   * @param {number} questionId
   * @param {boolean} isCorrect
   * @param {number} retries    – berapa kali coba lagi sebelum jawab benar
   * @param {number} selectedIdx
   */
  function recordAnswer(session, questionId, isCorrect, retries = 0, selectedIdx = -1) {
    session.answers.push({
      questionId,
      isCorrect,
      retries,
      selectedIdx,
      timestamp: Date.now(),
    });
    return session;
  }

  /**
   * Selesaikan sesi: hitung skor, simpan ke localStorage.
   * @param {Object} session  – object dari startSession() yang sudah diisi
   * @param {number} totalQ   – total soal
   * @returns {{ score: number, percent: number, isNewBest: boolean }}
   */
  function finishSession(session, totalQ) {
    const correctCount = session.answers.filter(a => a.isCorrect).length;
    const percent = Math.round((correctCount / totalQ) * 100);

    session.score = percent;
    session.totalQuestions = totalQ;
    session.correctCount = correctCount;
    session.endTime = new Date().toISOString();

    const unitData = _readUnit(session.unitId);
    const isNewBest = unitData.bestScore === null || percent > unitData.bestScore;

    if (isNewBest) unitData.bestScore = percent;
    unitData.lastScore = percent;
    unitData.totalAttempts = (unitData.totalAttempts || 0) + 1;

    // Simpan sesi (batasi ke MAX_SESSIONS)
    unitData.sessions.unshift({
      sessionId: session.sessionId,
      date: new Date().toLocaleDateString('id-ID'),
      score: percent,
      correctCount,
      totalQuestions: totalQ,
      answers: session.answers,
    });
    if (unitData.sessions.length > MAX_SESSIONS) {
      unitData.sessions = unitData.sessions.slice(0, MAX_SESSIONS);
    }

    _writeUnit(session.unitId, unitData);

    return { score: percent, isNewBest, correctCount };
  }

  /**
   * Ambil skor terbaik unit tertentu.
   * @param {number|string} unitId
   * @returns {number|null}
   */
  function getBestScore(unitId) {
    return _readUnit(unitId).bestScore;
  }

  /**
   * Ambil skor terakhir unit tertentu.
   * @param {number|string} unitId
   * @returns {number|null}
   */
  function getLastScore(unitId) {
    return _readUnit(unitId).lastScore;
  }

  /**
   * Ambil riwayat sesi unit (array, terbaru duluan).
   * @param {number|string} unitId
   * @returns {Array}
   */
  function getSessionHistory(unitId) {
    return _readUnit(unitId).sessions;
  }

  /**
   * Ambil total percobaan unit.
   * @param {number|string} unitId
   * @returns {number}
   */
  function getTotalAttempts(unitId) {
    return _readUnit(unitId).totalAttempts || 0;
  }

  /**
   * Ambil ringkasan semua unit yang pernah dikerjakan.
   * @returns {Array<{ unitId, bestScore, lastScore, totalAttempts }>}
   */
  function getAllSummary() {
    const store = _read();
    return Object.entries(store).map(([key, val]) => ({
      unitId: key.replace('unit_', ''),
      bestScore: val.bestScore,
      lastScore: val.lastScore,
      totalAttempts: val.totalAttempts,
    }));
  }

  /**
   * Hapus data satu unit.
   * @param {number|string} unitId
   */
  function clearUnit(unitId) {
    const store = _read();
    delete store[_key(unitId)];
    _write(store);
  }

  /**
   * Hapus seluruh store kuis.
   */
  function clearAll() {
    try {
      localStorage.removeItem(STORE_KEY);
    } catch { /* abaikan */ }
  }

  // ──────────────────────────────────────────────────────────
  // Expose API
  // ──────────────────────────────────────────────────────────
  return {
    startSession,
    recordAnswer,
    finishSession,
    getBestScore,
    getLastScore,
    getSessionHistory,
    getTotalAttempts,
    getAllSummary,
    clearUnit,
    clearAll,
  };
})();

// Expose global
window.QuizStore = QuizStore;
