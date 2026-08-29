// Effets sonores 100% synthétisés via l'API Web Audio : aucun fichier audio,
// aucune dépendance, fonctionne hors-ligne. L'AudioContext est créé/réveillé
// au premier appel, qui a toujours lieu dans un clic utilisateur (voir game.js).

const SoundEngine = (() => {
  let ctx = null;
  let muted = localStorage.getItem('quizquest_muted') === '1';

  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone({ freq, duration = 0.15, type = 'sine', delay = 0, gain = 0.2, glideTo = null }) {
    if (muted) return;
    const c = getCtx();
    const start = c.currentTime + delay;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (glideTo) osc.frequency.linearRampToValueAtTime(glideTo, start + duration);
    g.gain.setValueAtTime(gain, start);
    g.gain.exponentialRampToValueAtTime(0.001, start + duration);
    osc.connect(g).connect(c.destination);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  return {
    isMuted: () => muted,
    toggleMute() {
      muted = !muted;
      localStorage.setItem('quizquest_muted', muted ? '1' : '0');
      return muted;
    },
    click() {
      tone({ freq: 440, duration: 0.06, type: 'square', gain: 0.1 });
    },
    correct() {
      tone({ freq: 523.25, duration: 0.1, type: 'triangle', gain: 0.18 });
      tone({ freq: 783.99, duration: 0.15, delay: 0.1, type: 'triangle', gain: 0.18 });
    },
    wrong() {
      tone({ freq: 220, duration: 0.25, type: 'sawtooth', gain: 0.16, glideTo: 100 });
    },
    levelUp() {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
        tone({ freq: f, duration: 0.15, delay: i * 0.12, type: 'triangle', gain: 0.2 }));
    },
    victory() {
      [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) =>
        tone({ freq: f, duration: 0.25, delay: i * 0.15, type: 'triangle', gain: 0.22 }));
    },
    defeat() {
      [400, 300, 200, 100].forEach((f, i) =>
        tone({ freq: f, duration: 0.3, delay: i * 0.2, type: 'sawtooth', gain: 0.18 }));
    }
  };
})();
