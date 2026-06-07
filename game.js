(function () {
  "use strict";

  const W = 960;
  const H = 720;
  const TILE = 48;
  const COLS = 20;
  const ROWS = 15;
  const PLAYER_SIZE = 28;
  const PLAYER_HALF = PLAYER_SIZE / 2;
  const PLAYER_SPEED = 220;
  const PLAYER_ACCEL = 1600;
  const MAX_LIVES = 3;
  const GAME_TIME = 90;
  const CRYSTAL_SCORE = 10;

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const hint = document.getElementById("hint");
  const keys = new Set();

  let state = "menu";
  let lastTime = 0;
  let score = 0;
  let lives = MAX_LIVES;
  let timeLeft = GAME_TIME;
  let collected = 0;
  let gameOverReason = "";

  const map = createMap();
  const crystals = createCrystals();
  const enemies = createEnemies();
  const totalCrystals = crystals.length;

  const player = {
    x: 96,
    y: 648,
    vx: 0,
    vy: 0,
    dir: "down",
    frame: 0,
    frameTime: 0,
    invincible: 0,
    spawnX: 96,
    spawnY: 648,
  };

  const portal = { x: 864, y: 96, radius: 26, active: false };
  const tiles = createTileTextures();
  const spriteSheet = createSpriteSheet();
  const crystalIcon = createCrystalIcon();
  const audio = createAudioEngine();

  function createMap() {
    const grid = Array.from({ length: ROWS }, () => Array(COLS).fill("."));
    const wall = (x, y) => {
      if (x >= 0 && x < COLS && y >= 0 && y < ROWS) grid[y][x] = "#";
    };
    const rect = (x, y, w, h) => {
      for (let yy = y; yy < y + h; yy += 1) {
        for (let xx = x; xx < x + w; xx += 1) wall(xx, yy);
      }
    };

    for (let x = 0; x < COLS; x += 1) {
      wall(x, 0);
      wall(x, ROWS - 1);
    }
    for (let y = 0; y < ROWS; y += 1) {
      wall(0, y);
      wall(COLS - 1, y);
    }

    rect(3, 2, 1, 4);
    rect(6, 1, 1, 4);
    rect(9, 4, 1, 7);
    rect(13, 1, 1, 5);
    rect(15, 7, 1, 5);
    rect(17, 3, 1, 4);
    rect(4, 8, 4, 1);
    rect(11, 9, 5, 1);
    rect(4, 11, 5, 1);
    rect(12, 12, 4, 1);
    rect(2, 5, 2, 1);
    rect(5, 13, 3, 1);
    rect(14, 13, 2, 1);
    rect(7, 6, 2, 1);
    rect(12, 4, 2, 1);

    return grid;
  }

  function createCrystals() {
    const positions = [
      [2, 1],
      [8, 1],
      [16, 1],
      [2, 3],
      [11, 4],
      [5, 7],
      [13, 10],
      [10, 13],
    ];

    return positions.map(([gx, gy], i) => ({
      x: gx * TILE + TILE / 2,
      y: gy * TILE + TILE / 2,
      taken: false,
      pulse: i * 0.7,
    }));
  }

  function createEnemies() {
    return [
      {
        x: 240,
        y: 144,
        path: [
          [240, 144],
          [336, 144],
          [336, 240],
          [240, 240],
        ],
        speed: 90,
        target: 1,
      },
      {
        x: 624,
        y: 528,
        path: [
          [624, 528],
          [672, 528],
          [672, 480],
          [624, 480],
        ],
        speed: 110,
        target: 1,
      },
      {
        x: 144,
        y: 432,
        path: [
          [144, 432],
          [192, 240],
          [384, 240],
          [336, 432],
        ],
        speed: 80,
        target: 1,
      },
    ];
  }

  function createTileTextures() {
    const floor = document.createElement("canvas");
    floor.width = floor.height = TILE;
    const fctx = floor.getContext("2d");
    const g = fctx.createLinearGradient(0, 0, TILE, TILE);
    g.addColorStop(0, "#101d2f");
    g.addColorStop(1, "#0b1320");
    fctx.fillStyle = g;
    fctx.fillRect(0, 0, TILE, TILE);
    fctx.strokeStyle = "rgba(126, 182, 255, 0.08)";
    fctx.lineWidth = 2;
    for (let i = 0; i < 4; i += 1) {
      fctx.beginPath();
      fctx.moveTo(i * 12 + 4, 0);
      fctx.lineTo(TILE, i * 12 + 4);
      fctx.stroke();
    }

    const wall = document.createElement("canvas");
    wall.width = wall.height = TILE;
    const wctx = wall.getContext("2d");
    const wg = wctx.createLinearGradient(0, 0, TILE, TILE);
    wg.addColorStop(0, "#38485e");
    wg.addColorStop(1, "#172131");
    wctx.fillStyle = wg;
    wctx.fillRect(0, 0, TILE, TILE);
    wctx.fillStyle = "rgba(255,255,255,0.08)";
    wctx.fillRect(0, 0, TILE, 6);
    wctx.fillStyle = "rgba(0,0,0,0.22)";
    wctx.fillRect(0, TILE - 6, TILE, 6);

    return { floor, wall };
  }

  function createCrystalIcon() {
    const icon = document.createElement("canvas");
    icon.width = icon.height = 32;
    const c = icon.getContext("2d");
    c.translate(16, 16);
    c.fillStyle = "#7ef0ff";
    c.beginPath();
    c.moveTo(0, -13);
    c.lineTo(10, -3);
    c.lineTo(6, 12);
    c.lineTo(-6, 12);
    c.lineTo(-10, -3);
    c.closePath();
    c.fill();
    c.fillStyle = "rgba(255,255,255,0.65)";
    c.beginPath();
    c.moveTo(0, -12);
    c.lineTo(4, -2);
    c.lineTo(0, 10);
    c.lineTo(-2, 0);
    c.closePath();
    c.fill();
    return icon;
  }

  function createSpriteSheet() {
    const frameSize = 32;
    const sheet = document.createElement("canvas");
    sheet.width = frameSize * 4;
    sheet.height = frameSize * 4;
    const s = sheet.getContext("2d");
    const dirs = ["down", "left", "right", "up"];
    const bodyColors = ["#8de8ff", "#7ad1ff", "#66baf2", "#9bf0ff"];

    dirs.forEach((dir, row) => {
      for (let frame = 0; frame < 4; frame += 1) {
        drawSpriteFrame(s, row * frameSize, frame * frameSize, frameSize, dir, frame, bodyColors[row]);
      }
    });

    return { sheet, frameSize };
  }

  function drawSpriteFrame(g, ox, oy, size, dir, frame, accent) {
    g.save();
    g.translate(ox + size / 2, oy + size / 2);
    const swing = Math.sin((frame / 4) * Math.PI * 2);
    const bob = Math.cos((frame / 4) * Math.PI * 2) * 0.9;
    if (dir === "left") g.scale(-1, 1);

    g.fillStyle = "rgba(0,0,0,0.22)";
    g.beginPath();
    g.ellipse(0, 10, 9, 4, 0, 0, Math.PI * 2);
    g.fill();

    g.fillStyle = "#1e3149";
    g.fillRect(-8, -8 + bob, 16, 16);

    g.strokeStyle = "#29384e";
    g.lineWidth = 4;
    g.lineCap = "round";
    g.beginPath();
    g.moveTo(-5, 7 + bob);
    g.lineTo(-7, 12 + swing * 2);
    g.moveTo(5, 7 + bob);
    g.lineTo(7, 12 - swing * 2);
    g.stroke();

    g.strokeStyle = "#b3e8ff";
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(-8, -1 + bob);
    g.lineTo(-11, 3 + swing * 2);
    g.moveTo(8, -1 + bob);
    g.lineTo(11, 3 - swing * 2);
    g.stroke();

    const bodyGrad = g.createLinearGradient(-8, -6, 8, 8);
    bodyGrad.addColorStop(0, accent);
    bodyGrad.addColorStop(1, "#296a9d");
    g.fillStyle = bodyGrad;
    g.beginPath();
    g.roundRect(-9, -8 + bob, 18, 17, 6);
    g.fill();
    g.fillStyle = "#18304b";
    g.fillRect(-6, -5 + bob, 12, 6);
    g.fillStyle = "#f0fbff";
    g.fillRect(-4, -3 + bob, 8, 2);

    g.fillStyle = "#e8f4ff";
    g.beginPath();
    g.roundRect(-7, -16 + bob, 14, 10, 5);
    g.fill();
    g.fillStyle = "#7cf7ff";
    g.beginPath();
    g.roundRect(-5, -14 + bob, 10, 5, 3);
    g.fill();

    g.fillStyle = "rgba(255,255,255,0.24)";
    g.beginPath();
    g.ellipse(4, -9 + bob, 5, 4, 0.4, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }

  function createAudioEngine() {
    let context = null;
    let master = null;
    let musicTimer = null;
    let bassOsc = null;
    let padOsc = null;
    let noteIndex = 0;
    const arps = [
      [0, 3, 7, 10],
      [2, 5, 9, 12],
      [4, 7, 11, 14],
      [5, 9, 12, 17],
    ];

    function ensureContext() {
      if (context) return context;
      const AC = window.AudioContext || window.webkitAudioContext;
      context = new AC();
      master = context.createGain();
      master.gain.value = 0.15;
      master.connect(context.destination);
      return context;
    }

    function playTone(freq, duration, type, gainValue, when = 0) {
      const audioCtx = ensureContext();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime + when);
      gain.gain.setValueAtTime(0.0001, audioCtx.currentTime + when);
      gain.gain.exponentialRampToValueAtTime(gainValue, audioCtx.currentTime + when + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + when + duration);
      osc.connect(gain).connect(master);
      osc.start(audioCtx.currentTime + when);
      osc.stop(audioCtx.currentTime + when + duration + 0.05);
    }

    function startMusic() {
      const audioCtx = ensureContext();
      if (audioCtx.state === "suspended") audioCtx.resume();
      if (musicTimer) return;

      noteIndex = 0;
      bassOsc = audioCtx.createOscillator();
      padOsc = audioCtx.createOscillator();
      const bassGain = audioCtx.createGain();
      const padGain = audioCtx.createGain();
      const filter = audioCtx.createBiquadFilter();

      filter.type = "lowpass";
      filter.frequency.value = 780;
      bassOsc.type = "triangle";
      padOsc.type = "sine";
      bassOsc.frequency.value = 110;
      padOsc.frequency.value = 220;
      bassGain.gain.value = 0.06;
      padGain.gain.value = 0.03;
      bassOsc.connect(bassGain).connect(filter).connect(master);
      padOsc.connect(padGain).connect(filter);
      padGain.connect(master);
      bassOsc.start();
      padOsc.start();

      const root = 220;
      const melody = [0, 5, 7, 12, 7, 5, 3, 5, 0, 5, 9, 12, 14, 12, 9, 7];
      const bassline = [0, 0, 7, 7, 5, 5, 3, 3];

      musicTimer = setInterval(() => {
        const step = noteIndex % melody.length;
        const chord = arps[noteIndex % arps.length];
        bassOsc.frequency.setValueAtTime(
          root * Math.pow(2, bassline[step % bassline.length] / 12),
          audioCtx.currentTime
        );
        padOsc.frequency.setValueAtTime(
          root * Math.pow(2, (melody[step] + 12) / 12),
          audioCtx.currentTime
        );
        chord.forEach((semi, idx) => {
          playTone(root * Math.pow(2, semi / 12), 0.16 + idx * 0.03, "square", 0.008, idx * 0.01);
        });
        noteIndex += 1;
      }, 280);
    }

    function stopMusic() {
      if (musicTimer) {
        clearInterval(musicTimer);
        musicTimer = null;
      }
      if (bassOsc) {
        bassOsc.stop();
        bassOsc.disconnect();
        bassOsc = null;
      }
      if (padOsc) {
        padOsc.stop();
        padOsc.disconnect();
        padOsc = null;
      }
    }

    function sfxCollect() {
      playTone(880, 0.08, "triangle", 0.05);
      playTone(1320, 0.06, "sine", 0.03, 0.03);
    }

    function sfxHit() {
      playTone(220, 0.12, "sawtooth", 0.06);
      playTone(130, 0.16, "square", 0.04, 0.02);
    }

    function sfxWin() {
      [523, 659, 784, 1046].forEach((freq, idx) =>
        playTone(freq, 0.15, "triangle", 0.06, idx * 0.08)
      );
    }

    function sfxLose() {
      [196, 175, 147, 131].forEach((freq, idx) =>
        playTone(freq, 0.2, "sawtooth", 0.05, idx * 0.08)
      );
    }

    return { ensureContext, startMusic, stopMusic, sfxCollect, sfxHit, sfxWin, sfxLose };
  }

  function resize() {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function resetGame() {
    score = 0;
    lives = MAX_LIVES;
    timeLeft = GAME_TIME;
    collected = 0;
    gameOverReason = "";
    portal.active = false;
    player.x = player.spawnX;
    player.y = player.spawnY;
    player.vx = 0;
    player.vy = 0;
    player.dir = "down";
    player.frame = 0;
    player.frameTime = 0;
    player.invincible = 0;

    crystals.forEach((crystal, i) => {
      crystal.taken = false;
      crystal.pulse = i * 0.7;
    });

    enemies.forEach((enemy) => {
      const p0 = enemy.path[0];
      enemy.x = p0[0];
      enemy.y = p0[1];
      enemy.target = 1;
    });
  }

  function startGame() {
    if (state === "playing") return;
    resetGame();
    state = "playing";
    hint.textContent = "WASD o flechas para moverte. Recolecta los cristales y entra al portal.";
    audio.ensureContext();
    audio.startMusic();
  }

  function endGame(result, reason) {
    state = result;
    gameOverReason = reason;
    if (result === "win") audio.sfxWin();
    else audio.sfxLose();
    audio.stopMusic();
    hint.textContent = result === "win" ? "Pulsa Enter para jugar de nuevo." : "Pulsa Enter para reintentar.";
  }

  function approach(current, target, maxDelta) {
    if (current < target) return Math.min(current + maxDelta, target);
    if (current > target) return Math.max(current - maxDelta, target);
    return current;
  }

  function rectsOverlap(a, b) {
    return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  }

  function entityBox(e) {
    return {
      left: e.x - PLAYER_HALF,
      top: e.y - PLAYER_HALF,
      right: e.x + PLAYER_HALF,
      bottom: e.y + PLAYER_HALF,
    };
  }

  function resolveCollisions(e, axis) {
    const box = entityBox(e);
    const minX = Math.max(0, Math.floor((box.left - TILE) / TILE));
    const maxX = Math.min(COLS - 1, Math.floor((box.right + TILE) / TILE));
    const minY = Math.max(0, Math.floor((box.top - TILE) / TILE));
    const maxY = Math.min(ROWS - 1, Math.floor((box.bottom + TILE) / TILE));

    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        if (map[y][x] !== "#") continue;
        const tileBox = { left: x * TILE, top: y * TILE, right: x * TILE + TILE, bottom: y * TILE + TILE };
        if (!rectsOverlap(box, tileBox)) continue;

        if (axis === "x") {
          if (e.vx > 0) e.x = tileBox.left - PLAYER_HALF - 0.01;
          else if (e.vx < 0) e.x = tileBox.right + PLAYER_HALF + 0.01;
          e.vx = 0;
        } else {
          if (e.vy > 0) e.y = tileBox.top - PLAYER_HALF - 0.01;
          else if (e.vy < 0) e.y = tileBox.bottom + PLAYER_HALF + 0.01;
          e.vy = 0;
        }
      }
    }
  }

  function moveEntity(e, dt) {
    e.x += e.vx * dt;
    resolveCollisions(e, "x");
    e.y += e.vy * dt;
    resolveCollisions(e, "y");
    e.x = clamp(e.x, PLAYER_HALF, W - PLAYER_HALF);
    e.y = clamp(e.y, PLAYER_HALF, H - PLAYER_HALF);
  }

  function collectCrystals() {
    for (const crystal of crystals) {
      if (crystal.taken) continue;
      if (Math.hypot(player.x - crystal.x, player.y - crystal.y) < 24) {
        crystal.taken = true;
        score += CRYSTAL_SCORE;
        collected += 1;
        audio.sfxCollect();
      }
    }
  }

  function updateEnemies(dt) {
    for (const enemy of enemies) {
      const target = enemy.path[enemy.target];
      const dx = target[0] - enemy.x;
      const dy = target[1] - enemy.y;
      const dist = Math.hypot(dx, dy) || 1;
      enemy.x += (dx / dist) * enemy.speed * dt;
      enemy.y += (dy / dist) * enemy.speed * dt;
      if (dist < 4) enemy.target = (enemy.target + 1) % enemy.path.length;

      if (Math.hypot(player.x - enemy.x, player.y - enemy.y) < 40 && player.invincible <= 0) {
        lives -= 1;
        player.invincible = 1.2;
        audio.sfxHit();
        player.x = player.spawnX;
        player.y = player.spawnY;
        player.vx = 0;
        player.vy = 0;
        if (lives <= 0) {
          endGame("lose", "Las patrullas defensivas neutralizaron al explorador.");
          return;
        }
      }
    }
  }

  function updatePlayerAnimation(dt, walking) {
    if (!walking) {
      player.frame = 1;
      return;
    }
    player.frameTime += dt;
    if (player.frameTime >= 0.12) {
      player.frameTime = 0;
      player.frame = (player.frame + 1) % 4;
    }
  }

  function update(dt) {
    crystals.forEach((c) => {
      c.pulse += dt * 4;
    });

    if (state !== "playing") return;

    timeLeft -= dt;
    if (timeLeft <= 0) {
      timeLeft = 0;
      endGame("lose", "El reactor se apagó por falta de tiempo.");
      return;
    }

    if (player.invincible > 0) player.invincible -= dt;

    const inputX = (keys.has("ArrowRight") || keys.has("KeyD") ? 1 : 0) - (keys.has("ArrowLeft") || keys.has("KeyA") ? 1 : 0);
    const inputY = (keys.has("ArrowDown") || keys.has("KeyS") ? 1 : 0) - (keys.has("ArrowUp") || keys.has("KeyW") ? 1 : 0);
    const len = Math.hypot(inputX, inputY) || 1;
    const targetVX = (inputX / len) * PLAYER_SPEED;
    const targetVY = (inputY / len) * PLAYER_SPEED;

    player.vx = approach(player.vx, targetVX, PLAYER_ACCEL * dt);
    player.vy = approach(player.vy, targetVY, PLAYER_ACCEL * dt);

    if (Math.abs(inputX) + Math.abs(inputY) > 0) {
      player.dir = Math.abs(inputX) > Math.abs(inputY) ? (inputX > 0 ? "right" : "left") : inputY > 0 ? "down" : "up";
    }

    moveEntity(player, dt);
    updatePlayerAnimation(dt, Math.hypot(player.vx, player.vy) > 20);
    collectCrystals();
    updateEnemies(dt);

    if (collected === totalCrystals) {
      portal.active = true;
      if (Math.hypot(player.x - portal.x, player.y - portal.y) < portal.radius + PLAYER_HALF) {
        endGame("win", "La fortaleza quedó asegurada y el portal fue activado.");
      }
    }
  }

  function drawBackground() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#09111b");
    g.addColorStop(1, "#05080d");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "rgba(100, 160, 255, 0.08)";
    for (let i = 0; i < 12; i += 1) {
      ctx.beginPath();
      ctx.arc((i * 91 + 60) % W, (i * 53 + 40) % H, 110 + (i % 3) * 24, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawMap() {
    for (let y = 0; y < ROWS; y += 1) {
      for (let x = 0; x < COLS; x += 1) {
        ctx.drawImage(tiles.floor, x * TILE, y * TILE);
        if (map[y][x] === "#") ctx.drawImage(tiles.wall, x * TILE, y * TILE);
      }
    }

    ctx.fillStyle = "rgba(124, 247, 255, 0.08)";
    for (let y = 1; y < ROWS - 1; y += 1) {
      for (let x = 1; x < COLS - 1; x += 1) {
        if (map[y][x] === "#" || (x + y) % 5 !== 0) continue;
        ctx.beginPath();
        ctx.arc(x * TILE + 10, y * TILE + 12, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawPortal() {
    const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 180);
    const radius = portal.radius + pulse * 6;
    ctx.save();
    ctx.translate(portal.x, portal.y);
    ctx.globalAlpha = portal.active ? 1 : 0.35;
    ctx.fillStyle = portal.active ? "rgba(114, 255, 186, 0.25)" : "rgba(160, 180, 255, 0.12)";
    ctx.beginPath();
    ctx.arc(0, 0, radius + 20, 0, Math.PI * 2);
    ctx.fill();
    const grad = ctx.createRadialGradient(0, 0, 4, 0, 0, radius);
    grad.addColorStop(0, "#e8fff7");
    grad.addColorStop(0.4, "#72ffba");
    grad.addColorStop(1, "rgba(114, 255, 186, 0.05)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#f4fff9";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, radius - 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawCrystals() {
    crystals.forEach((crystal) => {
      if (crystal.taken) return;
      const bob = Math.sin(crystal.pulse) * 4;
      ctx.save();
      ctx.translate(crystal.x, crystal.y + bob);
      ctx.globalAlpha = 0.8 + 0.2 * Math.sin(crystal.pulse * 1.4);
      ctx.drawImage(crystalIcon, -16, -16);
      ctx.restore();
    });
  }

  function drawEnemies() {
    enemies.forEach((enemy, index) => {
      const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 160 + index);
      ctx.save();
      ctx.translate(enemy.x, enemy.y);
      ctx.rotate(Math.atan2(enemy.y, enemy.x) * 0.01);
      ctx.fillStyle = `rgba(255, 94, 118, ${0.15 + pulse * 0.1})`;
      ctx.beginPath();
      ctx.arc(0, 0, 22 + pulse * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ff6c85";
      ctx.beginPath();
      ctx.roundRect(-15, -10, 30, 20, 8);
      ctx.fill();
      ctx.fillStyle = "#36141f";
      ctx.fillRect(-10, -4, 20, 4);
      ctx.fillStyle = "#ffd9df";
      ctx.fillRect(-6, -2, 12, 2);
      ctx.restore();
    });
  }

  function drawPlayer() {
    const dirRow = { down: 0, left: 1, right: 2, up: 3 }[player.dir] || 0;
    const frameSize = spriteSheet.frameSize;
    const frameCol = Math.floor(player.frame) % 4;
    ctx.save();
    ctx.globalAlpha = player.invincible > 0 ? (Math.floor(performance.now() / 70) % 2 ? 0.35 : 1) : 1;
    ctx.drawImage(
      spriteSheet.sheet,
      frameCol * frameSize,
      dirRow * frameSize,
      frameSize,
      frameSize,
      player.x - 24,
      player.y - 28,
      48,
      48
    );
    ctx.restore();
  }

  function drawHUD() {
    ctx.save();
    ctx.fillStyle = "rgba(7, 12, 20, 0.6)";
    ctx.fillRect(16, 16, 300, 106);
    ctx.strokeStyle = "rgba(183, 222, 255, 0.18)";
    ctx.strokeRect(16, 16, 300, 106);

    ctx.fillStyle = "#f1f7ff";
    ctx.font = "bold 24px Georgia, serif";
    ctx.fillText("Eco de la Fortaleza", 32, 48);
    ctx.font = "18px Georgia, serif";
    ctx.fillStyle = "#bfe6ff";
    ctx.fillText(`Puntos: ${score}`, 32, 76);
    ctx.fillText(`Vida: ${"♥".repeat(lives)}${"·".repeat(MAX_LIVES - lives)}`, 32, 98);
    ctx.fillText(`Tiempo: ${Math.ceil(timeLeft)}s`, 170, 76);
    ctx.fillText(`Cristales: ${collected}/${totalCrystals}`, 170, 98);

    ctx.fillStyle = "rgba(7, 12, 20, 0.58)";
    ctx.fillRect(650, 16, 294, 106);
    ctx.strokeRect(650, 16, 294, 106);
    ctx.fillStyle = "#f3f9ff";
    ctx.font = "bold 22px Georgia, serif";
    ctx.fillText("Controles", 666, 46);
    ctx.font = "17px Georgia, serif";
    ctx.fillStyle = "#cde5ff";
    ctx.fillText("Mover: WASD / Flechas", 666, 74);
    ctx.fillText("Recolecta cristales y abre el portal", 666, 98);
    ctx.restore();
  }

  function overlayPanel(title, lines, footer) {
    ctx.save();
    ctx.fillStyle = "rgba(3, 8, 16, 0.68)";
    ctx.fillRect(120, 170, 720, 380);
    ctx.strokeStyle = "rgba(125, 214, 255, 0.28)";
    ctx.lineWidth = 2;
    ctx.strokeRect(120, 170, 720, 380);

    const glow = ctx.createRadialGradient(480, 180, 20, 480, 180, 280);
    glow.addColorStop(0, "rgba(114, 255, 186, 0.18)");
    glow.addColorStop(1, "rgba(114, 255, 186, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(120, 170, 720, 380);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 44px Georgia, serif";
    ctx.fillText(title, 180, 236);

    ctx.fillStyle = "#d8e8ff";
    ctx.font = "22px Georgia, serif";
    lines.forEach((line, i) => ctx.fillText(line, 180, 288 + i * 42));

    ctx.fillStyle = "#7ef0ff";
    ctx.font = "italic 20px Georgia, serif";
    ctx.fillText(footer, 180, 490);
    ctx.restore();
  }

  function drawOverlay() {
    if (state === "menu") {
      overlayPanel(
        "Eco de la Fortaleza",
        [
          "Eres un explorador robótico enviado a una fortaleza sellada.",
          "Recoge los 8 cristales de energía, evita las patrullas y activa el portal final.",
          "Si se agota el tiempo o pierdes todas las vidas, la misión termina.",
          "Pulsa Enter o haz clic para comenzar.",
        ],
        "Misión: recuperar energía y escapar con vida."
      );
    } else if (state === "win") {
      overlayPanel(
        "Victoria",
        [
          "La fortaleza quedó estabilizada.",
          `Puntaje final: ${score}`,
          gameOverReason,
          "Pulsa Enter para jugar otra vez.",
        ],
        "Excelente trabajo. El sistema quedó bajo control."
      );
    } else if (state === "lose") {
      overlayPanel(
        "Derrota",
        [
          "La misión no pudo completarse.",
          `Puntaje final: ${score}`,
          gameOverReason,
          "Pulsa Enter para intentarlo de nuevo.",
        ],
        "La fortaleza resistió. Ajusta tu ruta y vuelve a intentarlo."
      );
    }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    drawBackground();
    drawMap();
    drawPortal();
    drawCrystals();
    drawEnemies();
    drawPlayer();
    drawHUD();
    drawOverlay();
  }

  function loop(now) {
    if (!lastTime) lastTime = now;
    const dt = Math.min(0.033, (now - lastTime) / 1000);
    lastTime = now;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function onStartInput() {
    if (state === "menu" || state === "win" || state === "lose") startGame();
  }

  function onKeyDown(event) {
    keys.add(event.code);
    if (event.code === "Enter" || event.code === "Space") onStartInput();
  }

  function onKeyUp(event) {
    keys.delete(event.code);
  }

  window.addEventListener("resize", resize);
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("pointerdown", onStartInput);

  resize();
  hint.textContent = "Pulsa Enter o haz clic para iniciar la misión.";
  requestAnimationFrame(loop);
})();
