/* ---------- Color Pop Challenge - Complete Script ---------- */
(function () {
  // --- Config ---
  const colors = ["red", "blue", "green", "yellow", "purple", "orange"];
  const fontColors = ["black", "white", "red", "blue", "green", "orange"];
  let score = 0;
  let round = 1;
  let timer = 7;                // ⏱ Start with 7 seconds
  let interval = null;
  let correctColor = null;
  let gameActive = true;
  let totalBalloons = 25;
  let remainingTargetBalloons = 0; // 🧮 Track remaining correct-color balloons

  // --- DOM Elements ---
  const balloonContainer = document.getElementById("balloonContainer");
  const targetColor = document.getElementById("targetColor");
  const scoreDisplay = document.getElementById("score");
  const loadingScreen = document.getElementById("loadingScreen");
  const timerBar = document.getElementById("timerBar");
  
  // --- Helpers ---
  function showLoading(cb) {
    if (!loadingScreen) return cb();
    loadingScreen.style.display = "flex";
    setTimeout(() => {
      loadingScreen.style.display = "none";
      cb();
    }, 5000);
  }

  // ---------- Start a round ----------
  function startRound() {
    if (!gameActive) return;

    if (round > 10) {
      alert("🎉 Level Up! Difficulty Increased!");
      round = 1;
      timer = Math.max(5, timer - 1);           // reduce timer
      totalBalloons = (totalBalloons || 25) + 5; // add more balloons
    }

    showLoading(() => {
      generateBalloons();
      startTimer();
    });
  }

  // ---------- Generate balloons ----------
  function generateBalloons() {
    balloonContainer.innerHTML = "";
    balloonContainer.style.position = "relative";

    correctColor = colors[Math.floor(Math.random() * colors.length)];

    // --- Twist logic (font mismatch, flash, flip, etc.) ---
    let fontColor;
    let twistRound = false;
    if (round % 4 === 0 || Math.random() < 0.25) {
      twistRound = true;
      do {
        fontColor = fontColors[Math.floor(Math.random() * fontColors.length)];
      } while (fontColor === correctColor);

      document.body.classList.add("twist-flash");
      setTimeout(() => document.body.classList.remove("twist-flash"), 800);

      if (Math.random() < 0.3) targetColor.style.transform = "scaleX(-1)";
      else targetColor.style.transform = "scaleX(1)";
    } else {
      fontColor = correctColor;
      targetColor.style.transform = "scaleX(1)";
    }

    targetColor.textContent = correctColor.toUpperCase();
    targetColor.style.color = fontColor;

    const w = balloonContainer.offsetWidth || 600;
    const h = balloonContainer.offsetHeight || 400;

    // --- Spawn balloons ---
    remainingTargetBalloons = 0;
    const spawnCount = totalBalloons || 20;

    for (let i = 0; i < spawnCount; i++) {
      const color = colors[Math.floor(Math.random() * colors.length)];
      const balloon = document.createElement("div");
      balloon.classList.add("balloon");
      balloon.style.background = color;
      balloon.style.position = "absolute";
      balloon.style.left = Math.random() * (w - 60) + "px";
      balloon.style.top = Math.random() * (h - 60) + "px";

      if (color === correctColor) remainingTargetBalloons++;

      // move some balloons in twist rounds
      if (twistRound && Math.random() < 0.3) {
        const moveX = (Math.random() - 0.5) * 40;
        const moveY = (Math.random() - 0.5) * 40;
        balloon.animate(
          [
            { transform: "translate(0,0)" },
            { transform: `translate(${moveX}px, ${moveY}px)` },
            { transform: "translate(0,0)" }
          ],
          { duration: 1200 + Math.random() * 1000, iterations: Infinity }
        );
      }

      balloon.onclick = (e) => popBalloon(e.target, color);
      balloonContainer.appendChild(balloon);
    }

    if (scoreDisplay) scoreDisplay.textContent = score;
  }

  // ---------- Timer ----------
  function startTimer() {
    clearInterval(interval);
    let timeLeft = timer;

    if (timerBar) {
      timerBar.style.transition = "none";
      timerBar.style.width = "100%";
      setTimeout(() => {
        timerBar.style.transition = `width ${timeLeft}s linear`;
        timerBar.style.width = "0%";
      }, 50);
    }

    interval = setInterval(() => {
      timeLeft--;

      if (timeLeft <= 0) {
        clearInterval(interval);

        // ❌ If not all target balloons popped -> Game Over
        if (remainingTargetBalloons > 0) {
          alert(
            `⏰ Time’s up! You didn’t pop all the ${correctColor.toUpperCase()} balloons!`
          );
          gameOver();
        } else {
          round++;
          startRound();
        }
      }
    }, 1000);
  }

  // ---------- Pop logic ----------
  function popBalloon(el, color) {
    if (!gameActive || !el) return;

    if (color === correctColor) {
      score += 10;
      if (scoreDisplay) scoreDisplay.textContent = score;

      remainingTargetBalloons--;
      if (remainingTargetBalloons === 2) {
        document.querySelectorAll(".balloon").forEach((b) => {
          if (b.style.background === correctColor) b.classList.add("low-left");
        });
      }
      el.classList.add("pop");
      setTimeout(() => el.remove(), 300);

      // remove popped balloon visually
      el.style.transition = "opacity 0.25s, transform 0.25s";
      el.style.opacity = "0";
      el.style.transform = "scale(0)";
      setTimeout(() => el.remove(), 250);

      // if all correct balloons done -> next round
      if (remainingTargetBalloons <= 0) {
        clearInterval(interval);
        round++;
        setTimeout(startRound, 600);
        return;
      }

      // badges
      if ([150, 300, 500, 1000, 1500].includes(score))
        alert("🏅 You earned a new badge!");
    } else {
      gameOver();
    }
  }

  // ---------- Game Over ----------
  function gameOver() {
    gameActive = false;
    clearInterval(interval);
    alert(`❌ Wrong color or missed target! Final Score: ${score}`);
    window.location.href = "index.html";
  }

  // ---------- Global buttons ----------
  window.viewBadges = function () {
    alert(
      "🏅 Your Badges: " +
        (score >= 1500
          ? "Master, Diamond, Platinum, Gold, Silver, Bronze"
          : score >= 1000
          ? "Diamond, Platinum, Gold, Silver, Bronze"
          : score >= 500
          ? "Platinum, Gold, Silver, Bronze"
          : score >= 300
          ? "Gold, Silver, Bronze"
          : score >= 150
          ? "Bronze"
          : "None yet!")
    );
  };

  window.exitGame = function () {
    if (confirm("Exit game and lose progress?")) {
      clearInterval(interval);
      gameActive = false;
      window.location.href = "index.html";
    }
  };

  // ---------- Init ----------
  window.addEventListener("load", () => {
    gameActive = true;
    if (scoreDisplay) scoreDisplay.textContent = score;
    startRound();
  });

  window.__ColorPopDebug = {
    getState: () => ({ score, round, timer, totalBalloons, correctColor, remainingTargetBalloons })
  };
})();
