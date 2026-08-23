(() => {
  const colors = ['red','blue','green','yellow','purple','orange','pink'];
  const colorHex = {red:'#ff4d6d',blue:'#3a86ff',green:'#20c997',yellow:'#ffd166',purple:'#9b5de5',orange:'#ff8c42',pink:'#ff70a6'};
  let score=0,round=1,level=1,lives=3,streak=0,bestStreak=0,comboMultiplier=1;
  let timerSeconds=8,timeLeft=8,interval=null,nextRoundTimer=null,targetRemaining=0,paused=false,gameActive=true;
  let doublePoints=false,shieldActive=false,frozen=false;
  let powerups={freeze:2,double:2,shield:1};
  let highScore=Number(localStorage.getItem('rainbowPopHighScore')||0);
  let badges=JSON.parse(localStorage.getItem('rainbowPopBadges')||'[]');
  const $=id=>document.getElementById(id), container=$('balloonContainer');

  function syncHUD(){
    $('score').textContent=score;$('streak').textContent=streak;$('lives').textContent='❤️'.repeat(Math.max(0,lives))||'—';$('highScore').textContent=Math.max(highScore,score);$('level').textContent=level;$('round').textContent=round;
    $('freezeCount').textContent=powerups.freeze;$('doubleCount').textContent=powerups.double;$('shieldCount').textContent=powerups.shield;
    ['freeze','double','shield'].forEach(t=>{const b=document.querySelector(`.power-btn.${t}`);if(b)b.disabled=powerups[t]<=0});
  }
  function toast(message,type=''){const el=$('messageToast');el.textContent=message;el.className=`toast show ${type}`;clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.className='toast',1600)}
  function updateTimer(){const pct=Math.max(0,timeLeft/timerSeconds*100);$('timerBar').style.width=`${pct}%`;$('timerContainer').classList.toggle('timer-danger',pct<30)}

  function startRound(){
    if(!gameActive||paused)return;clearInterval(interval);clearTimeout(nextRoundTimer);container.innerHTML='';
    correctColor=colors[Math.floor(Math.random()*colors.length)];
    const twist=round%4===0||Math.random()<.28;
    const textColor=twist?colors.filter(c=>c!==correctColor)[Math.floor(Math.random()*(colors.length-1))]:correctColor;
    $('targetColor').textContent=correctColor.toUpperCase();$('targetColor').style.color=colorHex[textColor];
    $('challengeTag').textContent=twist?'⚠️ TRICK ROUND':'🎯 NORMAL ROUND';$('challengeTag').style.background=twist?'#fee2e2':'#ede9fe';$('challengeTag').style.color=twist?'#b91c1c':'#6d28d9';
    $('challengeText').textContent=twist?'TRICK ROUND — trust the WORD, not its color!':`Pop every ${correctColor} balloon before time runs out.`;
    $('targetColor').classList.toggle('trick',twist);
    const count=Math.min(34,18+level*2+Math.floor(round/3));targetRemaining=0;
    for(let i=0;i<count;i++){
      let color=colors[Math.floor(Math.random()*colors.length)];if(i===0)color=correctColor;
      const b=document.createElement('button');b.className='balloon';b.setAttribute('aria-label',`${color} balloon`);b.style.background=`radial-gradient(circle at 30% 25%,#fff9,transparent 18%),${colorHex[color]}`;b.style.left=`${3+Math.random()*91}%`;b.style.top=`${3+Math.random()*82}%`;b.style.animationDelay=`${Math.random()*-2}s`;
      if(color===correctColor)targetRemaining++;b.addEventListener('click',()=>popBalloon(b,color));container.appendChild(b);
    }
    $('targetProgress').textContent=0;$('targetTotal').textContent=targetRemaining;
    timerSeconds=Math.max(4.2,8-Math.floor((level-1)/2)*.7);timeLeft=timerSeconds;updateTimer();
    interval=setInterval(()=>{if(paused||frozen)return;timeLeft-=.1;updateTimer();if(timeLeft<=0)finishRoundByTimeout()},100);syncHUD();
  }

  function popBalloon(el,color){
    if(!gameActive||paused||el.classList.contains('pop'))return;
    if(color!==correctColor){
      if(shieldActive){shieldActive=false;el.classList.add('wrong');toast('🛡️ SHIELD SAVED YOU!','good');syncHUD();setTimeout(()=>el.classList.remove('wrong'),350);return}
      lives--;streak=0;comboMultiplier=1;el.classList.add('wrong');toast(`💥 WRONG! ${lives} ${lives===1?'LIFE':'LIVES'} LEFT`,'bad');syncHUD();setTimeout(()=>el.classList.remove('wrong'),400);if(lives<=0)gameOver('Out of lives!');return;
    }
    el.classList.add('pop');const points=10*comboMultiplier*(doublePoints?2:1);score+=points;streak++;bestStreak=Math.max(bestStreak,streak);comboMultiplier=Math.min(5,1+Math.floor(streak/5));targetRemaining--;syncHUD();$('targetProgress').textContent=Math.max(0,Number($('targetTotal').textContent)-targetRemaining);burst(el,colorHex[color]);setTimeout(()=>el.remove(),280);
    if(streak>0&&streak%5===0){showCombo(`${streak} STREAK!`,`${comboMultiplier}X COMBO`);toast(`🔥 ${streak} STREAK — ${comboMultiplier}X SCORE!`,'good')}
    if([100,250,500,1000,2500].includes(score))unlockBadge(`score-${score}`);
    if(targetRemaining<=0){clearInterval(interval);const bonus=Math.ceil(timeLeft*5)+comboMultiplier*10;score+=bonus;const wasHigh=score>highScore;if(wasHigh){highScore=score;localStorage.setItem('rainbowPopHighScore',highScore);toast('🏆 NEW HIGH SCORE!','badge')};round++;if(round>5&&round%5===1){level++;lives=Math.min(3,lives+1);toast(`🚀 LEVEL ${level}! +1 LIFE`,'level');unlockBadge(`level-${level}`)};syncHUD();nextRoundTimer=setTimeout(startRound,900)}
  }
  function finishRoundByTimeout(){clearInterval(interval);if(targetRemaining>0){lives--;streak=0;comboMultiplier=1;toast(`⏰ TIME! ${lives} ${lives===1?'LIFE':'LIVES'} LEFT`,'bad');syncHUD();if(lives<=0)return gameOver('Time ran out!');nextRoundTimer=setTimeout(startRound,900)}}
  function burst(el,color){const r=el.getBoundingClientRect();for(let i=0;i<12;i++){const p=document.createElement('span');p.className='particle';p.style.left=`${r.left+r.width/2}px`;p.style.top=`${r.top+r.height/2}px`;p.style.background=color;p.style.setProperty('--dx',`${(Math.random()-.5)*140}px`);p.style.setProperty('--dy',`${(Math.random()-.5)*140}px`);document.body.appendChild(p);setTimeout(()=>p.remove(),650)}}
  function showCombo(big,small){const host=$('comboBurst');if(!host)return;host.innerHTML=`<div class="combo-word">${big}<small style="display:block;font:700 18px Outfit;text-align:center">${small}</small></div>`;setTimeout(()=>host.innerHTML='',750)}
  function unlockBadge(id){if(badges.includes(id))return;badges.push(id);localStorage.setItem('rainbowPopBadges',JSON.stringify(badges));toast('🏅 NEW BADGE UNLOCKED!','badge')}

  window.viewBadges=()=>{const labels=badges.map(b=>({'score-100':'🌟 100 CLUB','score-250':'💎 250 POPPER','score-500':'👑 500 MASTER','score-1000':'🏆 1000 LEGEND','score-2500':'🌈 RAINBOW GOD','level-2':'🚀 LEVEL 2','level-3':'⚡ LEVEL 3'}[b]||b));toast(labels.length?labels.join(' • '):'🏅 No badges yet — keep popping!','badge')};
  window.usePowerUp=type=>{if(!gameActive||paused||powerups[type]<=0)return toast('Power-up unavailable!','bad');powerups[type]--;if(type==='freeze'){frozen=true;toast('❄️ TIME FROZEN!','good');setTimeout(()=>{frozen=false;toast('▶️ TIME RESUMED')},3000)}if(type==='double'){doublePoints=true;toast('⚡ DOUBLE POINTS!','good');setTimeout(()=>doublePoints=false,6000)}if(type==='shield'){shieldActive=true;toast('🛡️ SHIELD ACTIVE!','good')}syncHUD()};
  window.togglePause=()=>{if(!gameActive)return;paused=!paused;$('pauseOverlay').classList.toggle('hidden',!paused);$('pauseBtn').textContent=paused?'▶️':'⏸️'};
  window.restartGame=()=>{clearInterval(interval);clearTimeout(nextRoundTimer);score=0;round=1;level=1;lives=3;streak=0;bestStreak=0;comboMultiplier=1;powerups={freeze:2,double:2,shield:1};paused=false;gameActive=true;frozen=false;doublePoints=false;shieldActive=false;$('gameOverOverlay').classList.add('hidden');$('pauseOverlay').classList.add('hidden');startRound()};
  function gameOver(reason){gameActive=false;clearInterval(interval);clearTimeout(nextRoundTimer);const isNew=score>highScore;if(isNew){highScore=score;localStorage.setItem('rainbowPopHighScore',highScore)}$('gameOverTitle').textContent=isNew?'🏆 NEW HIGH SCORE!':'🌈 GREAT RUN!';$('finalMessage').textContent=`${reason} You reached round ${round}.`;$('finalScore').textContent=score;$('finalStreak').textContent=bestStreak;$('finalLevel').textContent=level;$('resultBadge').textContent=bestStreak>=20?'🔥 COMBO MASTER':score>=1000?'🏆 SCORE LEGEND':level>=3?'🚀 RISING STAR':'🌈 RAINBOW ROOKIE';$('gameOverOverlay').classList.remove('hidden');syncHUD()}
  window.exitGame=()=>{window.location.href='index.html'};
  window.addEventListener('load',()=>{syncHUD();$('loadingScreen').style.display='flex';setTimeout(()=>{$('loadingScreen').style.display='none';startRound()},1000)});
})();
