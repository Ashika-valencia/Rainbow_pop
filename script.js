(() => {
  const colors = ['red','blue','green','yellow','purple','orange','pink'];
  const colorHex = { red:'#ff4d6d', blue:'#3a86ff', green:'#20c997', yellow:'#ffd166', purple:'#9b5de5', orange:'#ff8c42', pink:'#ff70a6' };

  let score = 0, round = 1, level = 1, lives = 3;
  let streak = 0, bestStreak = 0, comboMultiplier = 1;
  let timerSeconds = 8, timeLeft = 8;
  let interval = null, nextRoundTimer = null;
  let correctColor = '', targetRemaining = 0;
  let paused = false, gameActive = true, doublePoints = false;
  let shieldActive = false, frozen = false;
  let powerups = { freeze: 2, double: 2, shield: 1 };
  let highScore = Number(localStorage.getItem('rainbowPopHighScore') || 0);
  let badges = JSON.parse(localStorage.getItem('rainbowPopBadges') || '[]');

  const $ = id => document.getElementById(id);
  const container = $('balloonContainer');

  function syncHUD() {
    $('score').textContent = score;
    $('streak').textContent = streak;
    $('lives').textContent = lives;
    $('highScore').textContent = Math.max(highScore, score);
    $('level').textContent = level;
    $('round').textContent = round;
    $('freezeCount').textContent = powerups.freeze;
    $('doubleCount').textContent = powerups.double;
    $('shieldCount').textContent = powerups.shield;
  }

  function toast(message, type = '') {
    const el = $('messageToast');
    el.textContent = message;
    el.className = `toast show ${type}`;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.className = 'toast', 1500);
  }

  function startRound() {
    if (!gameActive || paused) return;
    clearInterval(interval);
    clearTimeout(nextRoundTimer);
    container.innerHTML = '';

    correctColor = colors[Math.floor(Math.random() * colors.length)];
    const twist = round % 4 === 0 || Math.random() < 0.3;
    const textColor = twist ? colors.filter(c => c !== correctColor)[Math.floor(Math.random() * (colors.length - 1))] : correctColor;

    $('targetColor').textContent = correctColor.toUpperCase();
    $('targetColor').style.color = colorHex[textColor];
    $('challengeText').textContent = twist
      ? '⚠️ TRICK ROUND — trust the WORD, not its color!'
      : `Pop all ${correctColor} balloons before time runs out.`;
    if (twist) $('targetColor').classList.add('trick'); else $('targetColor').classList.remove('trick');

    const count = Math.min(32, 18 + level * 2 + Math.floor(round / 3));
    targetRemaining = 0;
    for (let i = 0; i < count; i++) {
      let color = colors[Math.floor(Math.random() * colors.length)];
      if (i === 0) color = correctColor;
      const b = document.createElement('button');
      b.className = 'balloon';
      b.setAttribute('aria-label', `${color} balloon`);
      b.style.background = `radial-gradient(circle at 30% 25%, #fff9, transparent 18%), ${colorHex[color]}`;
      b.style.left = `${4 + Math.random() * 88}%`;
      b.style.top = `${4 + Math.random() * 82}%`;
      b.style.animationDelay = `${Math.random() * -2}s`;
      if (color === correctColor) targetRemaining++;
      b.addEventListener('click', () => popBalloon(b, color));
      container.appendChild(b);
    }

    timerSeconds = Math.max(4, 8 - Math.floor((level - 1) / 2));
    timeLeft = timerSeconds;
    updateTimer();
    interval = setInterval(() => {
      if (paused || frozen) return;
      timeLeft -= 0.1;
      updateTimer();
      if (timeLeft <= 0) finishRoundByTimeout();
    }, 100);
    syncHUD();
  }

  function updateTimer() {
    const pct = Math.max(0, timeLeft / timerSeconds * 100);
    $('timerBar').style.width = `${pct}%`;
    $('timerContainer').classList.toggle('danger', pct < 30);
  }

  function popBalloon(el, color) {
    if (!gameActive || paused || el.classList.contains('popped')) return;
    if (color !== correctColor) {
      el.classList.add('wrong');
      if (shieldActive) {
        shieldActive = false;
        toast('🛡️ Shield saved you!', 'good');
        setTimeout(() => el.classList.remove('wrong'), 350);
        return;
      }
      lives--;
      streak = 0;
      comboMultiplier = 1;
      toast(`💥 Wrong color! ${lives} lives left`, 'bad');
      el.classList.add('shake');
      if (lives <= 0) return gameOver('Out of lives!');
      syncHUD();
      setTimeout(() => el.classList.remove('wrong','shake'), 400);
      return;
    }

    el.classList.add('popped');
    const points = 10 * comboMultiplier * (doublePoints ? 2 : 1);
    score += points;
    streak++;
    bestStreak = Math.max(bestStreak, streak);
    comboMultiplier = Math.min(5, 1 + Math.floor(streak / 5));
    targetRemaining--;
    syncHUD();
    burst(el, colorHex[color]);
    setTimeout(() => el.remove(), 220);

    if (streak > 0 && streak % 5 === 0) toast(`🔥 ${streak} STREAK! ${comboMultiplier}X COMBO`, 'good');
    if ([100, 250, 500, 1000, 2500].includes(score)) unlockBadge(`score-${score}`);

    if (targetRemaining <= 0) {
      clearInterval(interval);
      const bonus = Math.ceil(timeLeft * 5) + comboMultiplier * 10;
      score += bonus;
      if (score > highScore) {
        highScore = score;
        localStorage.setItem('rainbowPopHighScore', highScore);
      }
      if (round % 3 === 0) toast(`✨ Round cleared! +${bonus} bonus`, 'good');
      round++;
      if (round > 5 && round % 5 === 1) {
        level++;
        lives = Math.min(3, lives + 1);
        toast(`🚀 LEVEL ${level}! +1 LIFE`, 'level');
        unlockBadge(`level-${level}`);
      }
      syncHUD();
      nextRoundTimer = setTimeout(startRound, 900);
    }
  }

  function finishRoundByTimeout() {
    clearInterval(interval);
    if (targetRemaining > 0) {
      lives--;
      streak = 0;
      comboMultiplier = 1;
      toast(`⏰ Time's up! ${lives} lives left`, 'bad');
      if (lives <= 0) return gameOver('Time ran out!');
      syncHUD();
      nextRoundTimer = setTimeout(startRound, 900);
    }
  }

  function burst(el, color) {
    const r = el.getBoundingClientRect();
    for (let i = 0; i < 7; i++) {
      const p = document.createElement('span');
      p.className = 'particle';
      p.style.left = `${r.left + r.width / 2}px`;
      p.style.top = `${r.top + r.height / 2}px`;
      p.style.background = color;
      p.style.setProperty('--dx', `${(Math.random() - .5) * 100}px`);
      p.style.setProperty('--dy', `${(Math.random() - .5) * 100}px`);
      document.body.appendChild(p);
      setTimeout(() => p.remove(), 650);
    }
  }

  function unlockBadge(id) {
    if (badges.includes(id)) return;
    badges.push(id);
    localStorage.setItem('rainbowPopBadges', JSON.stringify(badges));
    toast('🏅 NEW BADGE UNLOCKED!', 'badge');
  }

  window.viewBadges = () => {
    const labels = badges.map(b => ({'score-100':'🌟 100 Club','score-250':'💎 250 Popper','score-500':'👑 500 Master','score-1000':'🏆 1000 Legend','score-2500':'🌈 Rainbow God','level-2':'🚀 Level 2','level-3':'⚡ Level 3'}[b] || b));
    toast(labels.length ? labels.join(' • ') : '🏅 No badges yet — keep popping!', 'badge');
  };

  window.usePowerUp = type => {
    if (!gameActive || paused || powerups[type] <= 0) return toast('Power-up unavailable!', 'bad');
    powerups[type]--;
    if (type === 'freeze') {
      frozen = true; toast('❄️ TIME FROZEN!', 'good');
      setTimeout(() => { frozen = false; toast('▶️ Time resumed'); }, 3000);
    }
    if (type === 'double') {
      doublePoints = true; toast('⚡ DOUBLE POINTS!', 'good');
      setTimeout(() => doublePoints = false, 6000);
    }
    if (type === 'shield') { shieldActive = true; toast('🛡️ SHIELD ACTIVE!', 'good'); }
    syncHUD();
  };

  window.togglePause = () => {
    if (!gameActive) return;
    paused = !paused;
    $('pauseOverlay').classList.toggle('hidden', !paused);
    $('pauseBtn').textContent = paused ? '▶️' : '⏸️';
  };

  window.restartGame = () => {
    clearInterval(interval); clearTimeout(nextRoundTimer);
    score = 0; round = 1; level = 1; lives = 3; streak = 0; bestStreak = 0; comboMultiplier = 1;
    powerups = { freeze: 2, double: 2, shield: 1 };
    paused = false; gameActive = true; frozen = false; doublePoints = false; shieldActive = false;
    $('gameOverOverlay').classList.add('hidden'); $('pauseOverlay').classList.add('hidden');
    startRound();
  };

  function gameOver(reason) {
    gameActive = false; clearInterval(interval); clearTimeout(nextRoundTimer);
    highScore = Math.max(highScore, score);
    localStorage.setItem('rainbowPopHighScore', highScore);
    $('gameOverTitle').textContent = score >= highScore ? '🏆 NEW HIGH SCORE!' : '🌈 Great Run!';
    $('finalMessage').textContent = `${reason} You reached round ${round}.`;
    $('finalScore').textContent = score;
    $('finalStreak').textContent = bestStreak;
    $('finalLevel').textContent = level;
    $('gameOverOverlay').classList.remove('hidden');
    syncHUD();
  }

  window.exitGame = () => { window.location.href = 'index.html'; };

  window.addEventListener('load', () => {
    syncHUD();
    $('loadingScreen').style.display = 'flex';
    setTimeout(() => { $('loadingScreen').style.display = 'none'; startRound(); }, 900);
  });
})();
