// Moteur du jeu : machine à états + rendu HTML + logique de combat par quizz.

const state = {
  screen: 'menu',       // 'menu' | 'battle' | 'levelup' | 'gameover' | 'victory'
  pendingTimeMode: 'normal',
  pendingMode: 'campaign', // 'campaign' | 'practice'
  pendingEnemyId: ENEMIES[0].id,
  practiceMode: false,
  heroName: '',
  timeMode: 'normal',
  hero: null,
  enemyIndex: 0,
  enemy: null,
  usedQuestions: null,
  currentQuestion: null,
  locked: false,
  lastSelected: null,
  lastAction: null,     // { by: 'hero' | 'enemy', dmg }
  timeLeft: null,
  timerHandle: null,
  stats: { correct: 0, wrong: 0 },
  paused: false,
  pauseView: 'main'   // 'main' | 'settings' | 'levels' | 'quit-confirm'
};

// ---------- Cycle de jeu ----------

function newGame(heroName, timeMode, mode, enemyId) {
  state.heroName = (heroName || '').trim() || 'Héros';
  state.timeMode = timeMode || 'normal';
  state.hero = {
    maxHp: CONFIG.BASE_HERO_HP,
    hp: CONFIG.BASE_HERO_HP,
    atk: CONFIG.BASE_HERO_ATK,
    streak: 0
  };
  state.stats = { correct: 0, wrong: 0 };
  state.practiceMode = mode === 'practice';
  if (state.practiceMode) {
    const idx = ENEMIES.findIndex((e) => e.id === enemyId);
    state.enemyIndex = idx >= 0 ? idx : 0;
  } else {
    state.enemyIndex = 0;
  }
  startBattle();
}

function startBattle() {
  const def = ENEMIES[state.enemyIndex];
  state.enemy = { ...def, hp: def.hp, maxHp: def.hp };
  state.usedQuestions = new Set();
  state.screen = 'battle';
  state.lastAction = null;
  state.lastSelected = null;
  if (Scene3D.isReady()) Scene3D.setupBattle(def);
  nextQuestion();
}

function nextQuestion() {
  const bank = QUESTION_BANKS[state.enemy.subject];
  if (state.usedQuestions.size >= bank.length) state.usedQuestions.clear();
  let idx;
  do {
    idx = Math.floor(Math.random() * bank.length);
  } while (state.usedQuestions.has(idx));
  state.usedQuestions.add(idx);

  state.currentQuestion = bank[idx];
  state.locked = false;
  state.lastSelected = null;
  state.lastAction = null;
  startTimer();
}

function startTimer() {
  const durations = { none: null, normal: CONFIG.QUESTION_TIME, fast: CONFIG.FAST_QUESTION_TIME };
  state.timeLeft = durations[state.timeMode] || null;
  render();
  runTimerInterval();
}

// Reprend le décompte en cours après une pause, sans réinitialiser timeLeft.
function resumeTimer() {
  render();
  runTimerInterval();
}

function runTimerInterval() {
  clearInterval(state.timerHandle);
  if (state.timeLeft == null || state.paused) return;
  state.timerHandle = setInterval(() => {
    state.timeLeft -= 1;
    if (state.timeLeft <= 0) {
      clearInterval(state.timerHandle);
      answerQuestion(-1); // temps écoulé = mauvaise réponse
    } else {
      // Ne met à jour que la barre de temps : un render() complet recréerait
      // la bulle de dialogue à chaque seconde et relancerait son animation
      // d'apparition (effet de clignotement indésirable).
      updateTimerBarOnly();
    }
  }, 1000);
}

function updateTimerBarOnly() {
  const fill = document.querySelector('.timer-fill');
  if (!fill) return;
  const maxTime = state.timeMode === 'fast' ? CONFIG.FAST_QUESTION_TIME : CONFIG.QUESTION_TIME;
  fill.style.width = (state.timeLeft / maxTime) * 100 + '%';
}

function answerQuestion(selectedIndex) {
  if (state.locked || state.screen !== 'battle') return;
  state.locked = true;
  clearInterval(state.timerHandle);

  const correct = selectedIndex === state.currentQuestion.answer;
  state.lastSelected = selectedIndex;

  if (correct) {
    state.stats.correct++;
    state.hero.streak++;
    const multiplier = 1 + Math.min(state.hero.streak * CONFIG.STREAK_BONUS_PER_HIT, CONFIG.STREAK_BONUS_MAX);
    const dmg = Math.round(state.hero.atk * multiplier);
    state.enemy.hp = Math.max(0, state.enemy.hp - dmg);
    state.lastAction = { by: 'hero', dmg };
    SoundEngine.correct();
    Scene3D.attack('hero');
  } else {
    state.stats.wrong++;
    state.hero.streak = 0;
    const dmg = state.enemy.atk;
    state.hero.hp = Math.max(0, state.hero.hp - dmg);
    state.lastAction = { by: 'enemy', dmg };
    SoundEngine.wrong();
    Scene3D.attack('enemy');
  }

  if (state.enemy.hp <= 0) {
    setTimeout(() => Scene3D.defeat('enemy'), 250);
  } else if (state.hero.hp <= 0) {
    setTimeout(() => Scene3D.defeat('hero'), 250);
  }

  render();

  setTimeout(() => {
    if (state.enemy.hp <= 0) {
      onEnemyDefeated();
    } else if (state.hero.hp <= 0) {
      onHeroDefeated();
    } else {
      nextQuestion();
    }
  }, 1400);
}

function onEnemyDefeated() {
  if (!state.practiceMode) saveBestProgress(state.enemyIndex + 1);
  if (state.practiceMode || state.enemyIndex + 1 >= ENEMIES.length) {
    state.screen = 'victory';
    SoundEngine.victory();
    render();
  } else {
    state.screen = 'levelup';
    SoundEngine.levelUp();
    render();
  }
}

function applyLevelUp() {
  state.hero.maxHp += CONFIG.LEVEL_UP_HP_BONUS;
  state.hero.atk += CONFIG.LEVEL_UP_ATK_BONUS;
  state.hero.hp = state.hero.maxHp;
  state.enemyIndex++;
  startBattle();
}

function onHeroDefeated() {
  if (!state.practiceMode) saveBestProgress(state.enemyIndex);
  state.screen = 'gameover';
  SoundEngine.defeat();
  render();
}

function saveBestProgress(n) {
  const best = Number(localStorage.getItem('quizquest_best') || 0);
  if (n > best) localStorage.setItem('quizquest_best', String(n));
}

function retryRun() {
  if (!state.practiceMode) state.enemyIndex = 0;
  state.hero = {
    maxHp: CONFIG.BASE_HERO_HP,
    hp: CONFIG.BASE_HERO_HP,
    atk: CONFIG.BASE_HERO_ATK,
    streak: 0
  };
  state.stats = { correct: 0, wrong: 0 };
  startBattle();
}

function resumeRun() {
  const best = Number(localStorage.getItem('quizquest_best') || 0);
  const idx = Math.min(best, ENEMIES.length - 1);
  const nameInput = document.getElementById('hero-name-input');
  state.heroName = ((nameInput && nameInput.value) || '').trim() || 'Héros';
  state.timeMode = state.pendingTimeMode || 'normal';
  state.practiceMode = false;
  const maxHp = CONFIG.BASE_HERO_HP + idx * CONFIG.LEVEL_UP_HP_BONUS;
  state.hero = {
    maxHp,
    hp: maxHp,
    atk: CONFIG.BASE_HERO_ATK + idx * CONFIG.LEVEL_UP_ATK_BONUS,
    streak: 0
  };
  state.stats = { correct: 0, wrong: 0 };
  state.enemyIndex = idx;
  startBattle();
}

function backToMenu() {
  clearInterval(state.timerHandle);
  state.screen = 'menu';
  render();
}

// ---------- Menu pause (en combat) ----------

function togglePause() {
  if (state.screen !== 'battle') return;
  state.paused = !state.paused;
  if (state.paused) {
    state.pauseView = 'main';
    clearInterval(state.timerHandle);
    render();
  } else {
    resumeTimer();
  }
}

function selectLevel(idx) {
  if (idx === state.enemyIndex) {
    state.paused = false;
    resumeTimer();
    return;
  }
  state.enemyIndex = idx;
  state.paused = false;
  startBattle();
}

function quitToMenu() {
  state.paused = false;
  backToMenu();
}

// ---------- Rendu ----------

function render() {
  if (Scene3D.isAvailable() && Scene3D.isReady()) {
    if (state.screen === 'battle') Scene3D.show();
    else Scene3D.hide();
  }

  const app = document.getElementById('app');
  switch (state.screen) {
    case 'menu': app.innerHTML = renderMenu(); break;
    case 'battle': app.innerHTML = renderBattle() + renderPauseOverlay(); break;
    case 'levelup': app.innerHTML = renderLevelUp(); break;
    case 'gameover': app.innerHTML = renderGameOver(); break;
    case 'victory': app.innerHTML = renderVictory(); break;
  }
}

function renderMenu() {
  const best = Number(localStorage.getItem('quizquest_best') || 0);
  const timeMode = state.pendingTimeMode || 'normal';
  const gameMode = state.pendingMode || 'campaign';
  const isPractice = gameMode === 'practice';
  const canResume = !isPractice && best > 0 && best < ENEMIES.length;
  const recordPct = Math.round((Math.min(best, ENEMIES.length) / ENEMIES.length) * 100);

  const subjectPicker = isPractice ? `
    <div class="subject-select">
      <p class="field-label">Matière</p>
      <div class="subject-grid">
        ${ENEMIES.map(e => `
          <button data-action="select-subject" data-enemy-id="${e.id}" class="subject-btn ${state.pendingEnemyId === e.id ? 'active' : ''}">
            <span class="subject-emoji">${e.emoji}</span>
            <span class="subject-name">${SUBJECT_LABELS[e.subject]}</span>
          </button>
        `).join('')}
      </div>
    </div>` : '';

  const resumeBlock = canResume ? `
    <div class="menu-resume">
      <p>💾 Tu es arrivé jusqu'à <strong>${escapeHtml(ENEMIES[best].name)}</strong> (ennemi ${best + 1}/${ENEMIES.length}).</p>
      <button class="menu-resume-btn" data-action="resume-game">▶ Reprendre l'aventure</button>
    </div>` : '';

  const startLabel = isPractice ? 'Commencer le défi' : (canResume ? 'Recommencer depuis le début' : "Commencer l'aventure");

  return `
  <div class="screen menu-screen">
    <div class="menu-header">
      <h1 class="title">Quiz Quest</h1>
      <p class="subtitle">Le RPG où le savoir est ton arme</p>
    </div>

    <div class="menu-panel">
      ${resumeBlock}

      <label class="field">
        Nom du héros
        <input id="hero-name-input" type="text" maxlength="16" placeholder="Héros" value="${escapeHtml(state.heroName)}">
      </label>

      <div class="time-mode-select">
        <p class="field-label">Mode de jeu</p>
        <div class="menu-toggle-row">
          <button data-action="select-mode" data-mode="campaign" class="menu-toggle-btn ${gameMode === 'campaign' ? 'active' : ''}">Aventure complète</button>
          <button data-action="select-mode" data-mode="practice" class="menu-toggle-btn ${isPractice ? 'active' : ''}">Choisir une matière</button>
        </div>
      </div>

      ${subjectPicker}

      <div class="time-mode-select">
        <p class="field-label">Mode de temps</p>
        <div class="menu-toggle-row">
          <button data-action="select-time-mode" data-mode="none" class="menu-toggle-btn ${timeMode === 'none' ? 'active' : ''}">Sans chrono</button>
          <button data-action="select-time-mode" data-mode="normal" class="menu-toggle-btn ${timeMode === 'normal' ? 'active' : ''}">Normal (${CONFIG.QUESTION_TIME}s)</button>
          <button data-action="select-time-mode" data-mode="fast" class="menu-toggle-btn ${timeMode === 'fast' ? 'active' : ''}">Rapide (${CONFIG.FAST_QUESTION_TIME}s)</button>
        </div>
      </div>

      <button class="menu-primary-btn" data-action="start-game">${startLabel}</button>

      <div class="menu-record">
        <p class="menu-record-label">🏆 Meilleur record : ${Math.min(best, ENEMIES.length)} / ${ENEMIES.length} ennemis vaincus</p>
        <div class="menu-record-bar-wrap">
          <div class="menu-record-bar">
            <div class="menu-record-cap" style="background-image:url('assets/kenney-ui-rpg/barBack_horizontalLeft.png')"></div>
            <div class="menu-record-mid" style="background-image:url('assets/kenney-ui-rpg/barBack_horizontalMid.png')"></div>
            <div class="menu-record-cap" style="background-image:url('assets/kenney-ui-rpg/barBack_horizontalRight.png')"></div>
          </div>
          <div class="menu-record-bar" style="width:${recordPct}%; overflow:hidden;">
            <div class="menu-record-cap" style="background-image:url('assets/kenney-ui-rpg/barGreen_horizontalLeft.png')"></div>
            <div class="menu-record-mid" style="background-image:url('assets/kenney-ui-rpg/barGreen_horizontalMid.png')"></div>
            <div class="menu-record-cap" style="background-image:url('assets/kenney-ui-rpg/barGreen_horizontalRight.png')"></div>
          </div>
        </div>
      </div>

      <div class="enemy-preview">
        ${ENEMIES.map(e => `<span class="enemy-chip" title="${e.name} — ${e.difficulty}">${e.emoji}</span>`).join('')}
      </div>
    </div>
  </div>`;
}

function renderBattle() {
  const { hero, enemy, currentQuestion } = state;
  const use3D = Scene3D.isAvailable() && Scene3D.isReady();
  const heroPct = Math.max(0, (hero.hp / hero.maxHp) * 100);
  const enemyPct = Math.max(0, (enemy.hp / enemy.maxHp) * 100);

  const maxTime = state.timeMode === 'fast' ? CONFIG.FAST_QUESTION_TIME : CONFIG.QUESTION_TIME;
  const timerHtml = state.timeLeft != null
    ? `<div class="timer-bar"><div class="timer-fill" style="width:${(state.timeLeft / maxTime) * 100}%"></div></div>`
    : '';

  const choicesHtml = currentQuestion.choices.map((c, i) => {
    let cls = 'choice-btn';
    if (state.locked) {
      if (i === currentQuestion.answer) cls += ' correct';
      else if (i === state.lastSelected) cls += ' wrong';
    }
    return `<button class="${cls}" data-action="answer" data-index="${i}" ${state.locked ? 'disabled' : ''}>
      <span class="choice-key">${i + 1}</span>${escapeHtml(c)}
    </button>`;
  }).join('');

  const dmgFloatHero = state.lastAction && state.lastAction.by === 'enemy'
    ? `<div class="dmg-float">-${state.lastAction.dmg}</div>` : '';
  const dmgFloatEnemy = state.lastAction && state.lastAction.by === 'hero'
    ? `<div class="dmg-float">-${state.lastAction.dmg}</div>` : '';

  return `
  <div class="screen battle-screen ${use3D ? 'battle-screen-3d' : ''}">
    <button class="pause-btn" data-action="toggle-pause" aria-label="Menu pause">☰</button>
    <div class="hud-top">
      <div class="progress-tag">Ennemi ${state.enemyIndex + 1} / ${ENEMIES.length} · Matière : ${SUBJECT_LABELS[enemy.subject]}</div>

      <div class="combatant enemy-combatant enemy-hud
        ${state.lastAction && state.lastAction.by === 'hero' ? 'shake' : ''}
        ${state.lastAction && state.lastAction.by === 'enemy' ? 'attack-lunge-down' : ''}">
        <div class="speech-bubble">${escapeHtml(currentQuestion.question)}</div>
        <div class="sprite-wrap">
          <div class="sprite enemy-sprite ${enemy.hp <= 0 ? 'defeated' : ''}">${enemy.emoji}</div>
          ${dmgFloatEnemy}
        </div>
        <div class="enemy-bar-wrap">
          <div class="name-tag">${escapeHtml(enemy.name)} <span class="difficulty-tag">${enemy.difficulty}</span></div>
          <div class="hp-bar"><div class="hp-fill enemy-hp" style="width:${enemyPct}%"></div></div>
          <div class="hp-text">${enemy.hp} / ${enemy.maxHp} PV</div>
        </div>
      </div>
    </div>

    <div class="hud-bottom">
      <div class="combatant hero-combatant hero-hud
        ${state.lastAction && state.lastAction.by === 'enemy' ? 'shake' : ''}
        ${state.lastAction && state.lastAction.by === 'hero' ? 'attack-lunge-up' : ''}">
        <div class="sprite-wrap">
          <div class="sprite hero-sprite ${hero.hp <= 0 ? 'defeated' : ''}">🧑‍🎓</div>
          ${dmgFloatHero}
        </div>
        <div class="hero-bar-wrap">
          <div class="name-tag">${escapeHtml(state.heroName)} ${hero.streak > 1 ? `<span class="streak-tag">🔥 x${hero.streak}</span>` : ''}</div>
          <div class="hp-bar"><div class="hp-fill hero-hp" style="width:${heroPct}%"></div></div>
          <div class="hp-text">${hero.hp} / ${hero.maxHp} PV</div>
        </div>
      </div>

      ${timerHtml}

      <div class="choices-grid">${choicesHtml}</div>
    </div>
  </div>`;
}

function renderPauseOverlay() {
  if (!state.paused) return '';
  let panel;
  if (state.pauseView === 'settings') panel = renderPauseSettings();
  else if (state.pauseView === 'levels') panel = renderPauseLevels();
  else if (state.pauseView === 'quit-confirm') panel = renderPauseQuitConfirm();
  else panel = renderPauseMain();
  return `<div class="pause-overlay">${panel}</div>`;
}

function renderPauseMain() {
  return `
  <div class="pause-panel">
    <h2>⏸ Pause</h2>
    <div class="pause-menu-list">
      <button class="btn-primary" data-action="toggle-pause">▶️ Reprendre</button>
      <button class="btn-secondary" data-action="pause-nav" data-view="settings">⚙️ Paramètres</button>
      <button class="btn-secondary" data-action="pause-nav" data-view="levels">🗺️ Changer de niveau</button>
      <button class="btn-secondary pause-lang-btn" data-action="noop">🌐 Langue <span class="soon-badge">Bientôt</span></button>
      <button class="btn-secondary" data-action="pause-nav" data-view="quit-confirm">🚪 Quitter la partie</button>
    </div>
  </div>`;
}

function renderPauseSettings() {
  const timeMode = state.timeMode || 'normal';
  return `
  <div class="pause-panel">
    <h2>⚙️ Paramètres</h2>
    <div class="time-mode-select">
      <p class="field-label">Mode de temps</p>
      <div class="btn-row">
        <button data-action="pause-select-time-mode" data-mode="none" class="mode-btn ${timeMode === 'none' ? 'active' : ''}">Sans chrono</button>
        <button data-action="pause-select-time-mode" data-mode="normal" class="mode-btn ${timeMode === 'normal' ? 'active' : ''}">Normal (${CONFIG.QUESTION_TIME}s)</button>
        <button data-action="pause-select-time-mode" data-mode="fast" class="mode-btn ${timeMode === 'fast' ? 'active' : ''}">Rapide (${CONFIG.FAST_QUESTION_TIME}s)</button>
      </div>
    </div>
    <div class="time-mode-select">
      <p class="field-label">Son</p>
      <button class="btn-secondary" data-action="pause-toggle-sound">${SoundEngine.isMuted() ? '🔇 Son coupé' : '🔊 Son activé'}</button>
    </div>
    <button class="btn-secondary" data-action="pause-nav" data-view="main">← Retour</button>
  </div>`;
}

function renderPauseLevels() {
  return `
  <div class="pause-panel">
    <h2>🗺️ Changer de niveau</h2>
    <div class="pause-level-list">
      ${ENEMIES.map((e, i) => `
        <button class="level-btn ${i === state.enemyIndex ? 'active' : ''}" data-action="pause-select-level" data-enemy-index="${i}">
          <span class="subject-emoji">${e.emoji}</span>
          <span class="subject-name">${escapeHtml(e.name)} — ${SUBJECT_LABELS[e.subject]}</span>
          <span class="difficulty-tag">${e.difficulty}</span>
        </button>
      `).join('')}
    </div>
    <button class="btn-secondary" data-action="pause-nav" data-view="main">← Retour</button>
  </div>`;
}

function renderPauseQuitConfirm() {
  return `
  <div class="pause-panel">
    <h2>🚪 Quitter la partie ?</h2>
    <p class="pause-warning">Ta progression dans ce combat en cours sera perdue.</p>
    <div class="btn-row">
      <button class="btn-primary" data-action="pause-quit">Oui, quitter</button>
      <button class="btn-secondary" data-action="pause-nav" data-view="main">Annuler</button>
    </div>
  </div>`;
}

function renderLevelUp() {
  const defeated = ENEMIES[state.enemyIndex];
  return `
  <div class="screen levelup-screen">
    <h2>${defeated.emoji} ${escapeHtml(defeated.name)} vaincu !</h2>
    <p>Ton savoir a triomphé. Tu progresses !</p>
    <ul class="levelup-list">
      <li>+${CONFIG.LEVEL_UP_HP_BONUS} PV max</li>
      <li>+${CONFIG.LEVEL_UP_ATK_BONUS} Attaque</li>
      <li>PV entièrement restaurés</li>
    </ul>
    <button class="btn-primary" data-action="continue-levelup">Continuer</button>
  </div>`;
}

function renderGameOver() {
  const total = state.stats.correct + state.stats.wrong;
  const acc = total ? Math.round((state.stats.correct / total) * 100) : 0;
  const enemy = ENEMIES[state.enemyIndex];
  return `
  <div class="screen end-screen">
    <h2>💀 Défaite...</h2>
    <p>${escapeHtml(enemy.name)} a été trop fort pour toi cette fois.</p>
    <div class="stats-box">
      <p>Bonnes réponses : ${state.stats.correct}</p>
      <p>Mauvaises réponses : ${state.stats.wrong}</p>
      <p>Précision : ${acc}%</p>
    </div>
    <div class="btn-row">
      <button class="btn-primary" data-action="retry">Réessayer</button>
      <button class="btn-secondary" data-action="to-menu">Menu</button>
    </div>
  </div>`;
}

function renderVictory() {
  const total = state.stats.correct + state.stats.wrong;
  const acc = total ? Math.round((state.stats.correct / total) * 100) : 0;
  const message = state.practiceMode
    ? `${escapeHtml(state.heroName)}, tu as relevé le défi grâce à ton savoir !`
    : `${escapeHtml(state.heroName)}, tu as vaincu tous les ennemis grâce à ton savoir !`;
  return `
  <div class="screen end-screen victory-screen">
    <h2>🏆 Victoire !</h2>
    <p>${message}</p>
    <div class="stats-box">
      <p>Bonnes réponses : ${state.stats.correct}</p>
      <p>Mauvaises réponses : ${state.stats.wrong}</p>
      <p>Précision : ${acc}%</p>
    </div>
    <div class="btn-row">
      <button class="btn-primary" data-action="to-menu">Rejouer</button>
    </div>
  </div>`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ---------- Actions ----------

function handleAction(action, data) {
  if (action !== 'answer') SoundEngine.click();
  switch (action) {
    case 'start-game': {
      const nameInput = document.getElementById('hero-name-input');
      newGame(nameInput ? nameInput.value : '', state.pendingTimeMode || 'normal', state.pendingMode || 'campaign', state.pendingEnemyId);
      break;
    }
    case 'resume-game':
      resumeRun();
      break;
    case 'select-time-mode':
      state.pendingTimeMode = data.mode;
      render();
      break;
    case 'select-mode':
      state.pendingMode = data.mode;
      render();
      break;
    case 'select-subject':
      state.pendingEnemyId = data.enemyId;
      render();
      break;
    case 'answer':
      answerQuestion(Number(data.index));
      break;
    case 'continue-levelup':
      applyLevelUp();
      break;
    case 'retry':
      retryRun();
      break;
    case 'to-menu':
      backToMenu();
      break;
    case 'toggle-pause':
      togglePause();
      break;
    case 'pause-nav':
      state.pauseView = data.view;
      render();
      break;
    case 'pause-select-time-mode':
      state.timeMode = data.mode;
      state.timeLeft = data.mode === 'none' ? null : (data.mode === 'fast' ? CONFIG.FAST_QUESTION_TIME : CONFIG.QUESTION_TIME);
      render();
      break;
    case 'pause-toggle-sound':
      SoundEngine.toggleMute();
      updateMuteBtn();
      render();
      break;
    case 'pause-select-level':
      selectLevel(Number(data.enemyIndex));
      break;
    case 'pause-quit':
      quitToMenu();
      break;
    case 'noop':
      break;
  }
}

const muteBtn = document.getElementById('mute-toggle');
function updateMuteBtn() {
  muteBtn.textContent = SoundEngine.isMuted() ? '🔇' : '🔊';
}
muteBtn.addEventListener('click', () => {
  SoundEngine.toggleMute();
  updateMuteBtn();
  if (!SoundEngine.isMuted()) SoundEngine.click();
});
updateMuteBtn();

document.getElementById('app').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  handleAction(btn.dataset.action, btn.dataset);
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && state.screen === 'battle') {
    togglePause();
    return;
  }
  if (state.screen !== 'battle' || state.locked || state.paused || !state.currentQuestion) return;
  const idx = ['1', '2', '3', '4'].indexOf(e.key);
  if (idx !== -1 && state.currentQuestion.choices[idx] !== undefined) {
    answerQuestion(idx);
  }
});

render();

if (Scene3D.isAvailable()) {
  Scene3D.init(document.getElementById('scene3d-root')).then((ok) => {
    if (ok && state.screen === 'battle') {
      Scene3D.setupBattle(state.enemy);
    }
    render();
  });
}
