// Moteur du jeu : machine à états + rendu HTML + logique de combat par quizz.

const state = {
  screen: 'menu',       // 'menu' | 'battle' | 'levelup' | 'gameover' | 'victory'
  pendingTimeMode: 'normal',
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
  stats: { correct: 0, wrong: 0 }
};

// ---------- Cycle de jeu ----------

function newGame(heroName, timeMode) {
  state.heroName = (heroName || '').trim() || 'Héros';
  state.timeMode = timeMode || 'normal';
  state.hero = {
    maxHp: CONFIG.BASE_HERO_HP,
    hp: CONFIG.BASE_HERO_HP,
    atk: CONFIG.BASE_HERO_ATK,
    streak: 0
  };
  state.enemyIndex = 0;
  state.stats = { correct: 0, wrong: 0 };
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
  clearInterval(state.timerHandle);
  const durations = { none: null, normal: CONFIG.QUESTION_TIME, fast: CONFIG.FAST_QUESTION_TIME };
  const dur = durations[state.timeMode];

  if (!dur) {
    state.timeLeft = null;
    render();
    return;
  }

  state.timeLeft = dur;
  render();
  state.timerHandle = setInterval(() => {
    state.timeLeft -= 1;
    if (state.timeLeft <= 0) {
      clearInterval(state.timerHandle);
      answerQuestion(-1); // temps écoulé = mauvaise réponse
    } else {
      render();
    }
  }, 1000);
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
  saveBestProgress(state.enemyIndex + 1);
  if (state.enemyIndex + 1 >= ENEMIES.length) {
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
  saveBestProgress(state.enemyIndex);
  state.screen = 'gameover';
  SoundEngine.defeat();
  render();
}

function saveBestProgress(n) {
  const best = Number(localStorage.getItem('quizquest_best') || 0);
  if (n > best) localStorage.setItem('quizquest_best', String(n));
}

function retryRun() {
  state.enemyIndex = 0;
  state.hero = {
    maxHp: CONFIG.BASE_HERO_HP,
    hp: CONFIG.BASE_HERO_HP,
    atk: CONFIG.BASE_HERO_ATK,
    streak: 0
  };
  state.stats = { correct: 0, wrong: 0 };
  startBattle();
}

function backToMenu() {
  clearInterval(state.timerHandle);
  state.screen = 'menu';
  render();
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
    case 'battle': app.innerHTML = renderBattle(); break;
    case 'levelup': app.innerHTML = renderLevelUp(); break;
    case 'gameover': app.innerHTML = renderGameOver(); break;
    case 'victory': app.innerHTML = renderVictory(); break;
  }
}

function renderMenu() {
  const best = Number(localStorage.getItem('quizquest_best') || 0);
  const mode = state.pendingTimeMode || 'normal';
  return `
  <div class="screen menu-screen">
    <h1 class="title">⚔️ Quiz Quest</h1>
    <p class="subtitle">Le RPG où le savoir est ton arme</p>

    <label class="field">
      Nom du héros
      <input id="hero-name-input" type="text" maxlength="16" placeholder="Héros" value="${escapeHtml(state.heroName)}">
    </label>

    <div class="time-mode-select">
      <p class="field-label">Mode de temps</p>
      <div class="btn-row">
        <button data-action="select-time-mode" data-mode="none" class="mode-btn ${mode === 'none' ? 'active' : ''}">Sans chrono</button>
        <button data-action="select-time-mode" data-mode="normal" class="mode-btn ${mode === 'normal' ? 'active' : ''}">Normal (${CONFIG.QUESTION_TIME}s)</button>
        <button data-action="select-time-mode" data-mode="fast" class="mode-btn ${mode === 'fast' ? 'active' : ''}">Rapide (${CONFIG.FAST_QUESTION_TIME}s)</button>
      </div>
    </div>

    <button class="btn-primary" data-action="start-game">Commencer l'aventure</button>

    <p class="best-record">🏆 Meilleur record : ${best} / ${ENEMIES.length} ennemis vaincus</p>

    <div class="enemy-preview">
      ${ENEMIES.map(e => `<span class="enemy-chip" title="${e.name} — ${e.difficulty}">${e.emoji}</span>`).join('')}
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
    <div class="progress-tag">Ennemi ${state.enemyIndex + 1} / ${ENEMIES.length} · Matière : ${SUBJECT_LABELS[enemy.subject]}</div>

    <div class="battlefield">
      <div class="combatant enemy-combatant
        ${state.lastAction && state.lastAction.by === 'hero' ? 'shake' : ''}
        ${state.lastAction && state.lastAction.by === 'enemy' ? 'attack-lunge-down' : ''}">
        <div class="speech-bubble">${escapeHtml(currentQuestion.question)}</div>
        <div class="sprite-wrap">
          <div class="sprite enemy-sprite ${enemy.hp <= 0 ? 'defeated' : ''}">${enemy.emoji}</div>
          ${dmgFloatEnemy}
        </div>
        <div class="name-tag">${escapeHtml(enemy.name)} <span class="difficulty-tag">${enemy.difficulty}</span></div>
        <div class="hp-bar"><div class="hp-fill enemy-hp" style="width:${enemyPct}%"></div></div>
        <div class="hp-text">${enemy.hp} / ${enemy.maxHp} PV</div>
      </div>

      <div class="combatant hero-combatant
        ${state.lastAction && state.lastAction.by === 'enemy' ? 'shake' : ''}
        ${state.lastAction && state.lastAction.by === 'hero' ? 'attack-lunge-up' : ''}">
        <div class="sprite-wrap">
          <div class="sprite hero-sprite ${hero.hp <= 0 ? 'defeated' : ''}">🧑‍🎓</div>
          ${dmgFloatHero}
        </div>
        <div class="name-tag">${escapeHtml(state.heroName)} ${hero.streak > 1 ? `<span class="streak-tag">🔥 x${hero.streak}</span>` : ''}</div>
        <div class="hp-bar"><div class="hp-fill hero-hp" style="width:${heroPct}%"></div></div>
        <div class="hp-text">${hero.hp} / ${hero.maxHp} PV</div>
      </div>
    </div>

    ${timerHtml}

    <div class="choices-grid">${choicesHtml}</div>
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
  return `
  <div class="screen end-screen victory-screen">
    <h2>🏆 Victoire !</h2>
    <p>${escapeHtml(state.heroName)}, tu as vaincu tous les ennemis grâce à ton savoir !</p>
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
      newGame(nameInput ? nameInput.value : '', state.pendingTimeMode || 'normal');
      break;
    }
    case 'select-time-mode':
      state.pendingTimeMode = data.mode;
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
  if (state.screen !== 'battle' || state.locked || !state.currentQuestion) return;
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
