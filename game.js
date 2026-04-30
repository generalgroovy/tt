  (() => {
    "use strict";

    const canvas = document.getElementById("game");
    const wrap = document.getElementById("stageWrap");
    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;

    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
    const rand = (min, max) => min + Math.random() * (max - min);
    const pick = arr => arr[Math.floor(Math.random() * arr.length)];
    const chance = n => Math.random() < n;
    const now = () => performance.now();

    const palette = {
      ink: "#f5f7ff",
      muted: "#9aa3c4",
      cyan: "#88f7ff",
      pink: "#ff5e7a",
      purple: "#9c7cff",
      gold: "#ffd166",
      green: "#8aff9e",
      dark: "#080a16",
      blue: "#3bc0ff"
    };

    const keyState = new Set();
    const pointer = { active: false, y: H / 2 };

    const input = {
      up: () => keyState.has("KeyW") || keyState.has("ArrowUp"),
      down: () => keyState.has("KeyS") || keyState.has("ArrowDown")
    };

    const state = {
      mode: "title",
      paused: false,
      lastTime: 0,
      room: 1,
      score: 0,
      combo: 0,
      comboTimer: 0,
      shake: 0,
      flash: 0,
      message: "",
      messageTimer: 0,
      highScore: Number(localStorage.getItem("dungeon-rally-high-score") || 0),
      draft: [],
      particles: [],
      floats: [],
      blocks: [],
      balls: [],
      relicLog: [],
      player: null,
      enemy: null,
      mods: null,
      roomRewarded: false,
      mouseLockHint: false
    };

    function baseMods() {
      return {
        ballSpeed: 1,
        ballRadius: 8,
        paddleSize: 1,
        paddleSpeed: 1,
        damage: 1,
        maxHp: 4,
        healOnRoom: 0,
        extraBalls: 0,
        aiSlow: 1,
        blockPierce: 0,
        shield: 0,
        goldTouch: false,
        poison: false,
        chain: false,
        magnet: false,
        vampire: false,
        crit: 0,
        thorn: false,
        spinPower: 1,
        spinDamage: false
      };
    }

    function newRun() {
      state.mode = "playing";
      state.paused = false;
      state.room = 1;
      state.score = 0;
      state.combo = 0;
      state.comboTimer = 0;
      state.shake = 0;
      state.flash = 0;
      state.message = "Room 1";
      state.messageTimer = 1.6;
      state.particles = [];
      state.floats = [];
      state.relicLog = [];
      state.mods = baseMods();
      state.player = {
        x: 34,
        y: H / 2,
        w: 14,
        baseH: 96,
        h: 96,
        speed: 470,
        hp: 4,
        invuln: 0,
        guard: 0,
        prevY: H / 2,
        vy: 0,
        name: "Rally Knight"
      };
      state.enemy = makeEnemy();
      buildRoom();
      state.balls = [];
      serve(1);
    }

    function makeEnemy() {
      const archetypes = [
        { name: "Bone Warden", color: palette.purple, speed: 300, h: 96, hp: 5 },
        { name: "Slime Curator", color: palette.green, speed: 260, h: 118, hp: 6 },
        { name: "Mirror Duelist", color: palette.cyan, speed: 340, h: 84, hp: 5 },
        { name: "Ash Bishop", color: palette.pink, speed: 320, h: 100, hp: 7 }
      ];
      const a = pick(archetypes);
      const roomScale = 1 + (state.room - 1) * 0.18;
      return {
        x: W - 48,
        y: H / 2,
        w: 14,
        h: a.h + Math.min(34, state.room * 2),
        speed: a.speed * (1 + state.room * 0.025),
        hp: Math.ceil(a.hp * roomScale),
        maxHp: Math.ceil(a.hp * roomScale),
        color: a.color,
        name: a.name,
        spell: 0,
        stunned: 0,
        prevY: H / 2,
        vy: 0
      };
    }

    function buildRoom() {
      state.blocks = [];
      state.roomRewarded = false;
      state.enemy = makeEnemy();
      const count = clamp(4 + state.room * 2, 6, 28);
      const lanes = [96, 148, 200, 252, 304, 356, 408, 460, 512];
      const cols = [300, 360, 420, 480, 540, 600, 660];
      const taken = new Set();
      for (let i = 0; i < count; i++) {
        let x = pick(cols) + rand(-8, 8);
        let y = pick(lanes) + rand(-12, 12);
        const key = Math.round(x / 48) + ":" + Math.round(y / 48);
        if (taken.has(key)) continue;
        taken.add(key);
        let type = "brick";
        if (state.room > 2 && chance(0.25)) type = "stone";
        if (state.room > 3 && chance(0.16)) type = "spike";
        if (state.room > 4 && chance(0.12)) type = "portal";
        const hp = type === "stone" ? 3 : type === "portal" ? 2 : 1;
        state.blocks.push({ x, y, w: 42, h: 26, hp, maxHp: hp, type, pulse: rand(0, Math.PI * 2) });
      }
    }

    function serve(dir = 1, count = 1) {
      for (let i = 0; i < count; i++) {
        const speed = (315 + state.room * 9) * state.mods.ballSpeed;
        const angle = rand(-0.45, 0.45);
        state.balls.push({
          x: W / 2 + rand(-18, 18),
          y: H / 2 + rand(-70, 70),
          vx: Math.cos(angle) * speed * dir,
          vy: Math.sin(angle) * speed,
          r: state.mods.ballRadius,
          damage: state.mods.damage,
          lastHit: "player",
          spin: 0,
          spinAge: 0,
          fire: 0,
          ghost: 0,
          trail: []
        });
      }
    }

    const upgrades = [
      {
        id: "wide-paddle",
        name: "Giant Bat",
        icon: "▌",
        desc: "+24 paddle height. Safer rallies.",
        apply: () => { state.mods.paddleSize += 0.25; state.player.h = state.player.baseH * state.mods.paddleSize; }
      },
      {
        id: "quick-paddle",
        name: "Greased Boots",
        icon: "⇅",
        desc: "+16% paddle speed.",
        apply: () => { state.mods.paddleSpeed *= 1.16; }
      },
      {
        id: "iron-heart",
        name: "Iron Heart",
        icon: "♥",
        desc: "+1 max HP and heal 1.",
        apply: () => { state.mods.maxHp += 1; state.player.hp = Math.min(state.mods.maxHp, state.player.hp + 1); }
      },
      {
        id: "swift-ball",
        name: "Comet Core",
        icon: "●",
        desc: "+10% ball speed and +120 score now.",
        apply: () => { state.mods.ballSpeed *= 1.1; addScore(120, W / 2, H / 2); }
      },
      {
        id: "heavy-ball",
        name: "Meteor Ball",
        icon: "✦",
        desc: "+1 ball damage. Ball grows slightly.",
        apply: () => { state.mods.damage += 1; state.mods.ballRadius += 1; }
      },
      {
        id: "multiball",
        name: "Echo Orb",
        icon: "◎",
        desc: "+1 extra ball at the start of each room.",
        apply: () => { state.mods.extraBalls += 1; }
      },
      {
        id: "slow-ai",
        name: "Rust Hex",
        icon: "⌁",
        desc: "Enemy paddle reacts 12% slower.",
        apply: () => { state.mods.aiSlow *= 0.88; }
      },
      {
        id: "gyro-grip",
        name: "Gyro Grip",
        icon: "◌",
        desc: "Spin from paddle movement is 35% stronger.",
        apply: () => { state.mods.spinPower *= 1.35; }
      },
      {
        id: "razor-spin",
        name: "Razor Spin",
        icon: "↯",
        desc: "High-spin shots deal +1 enemy damage.",
        apply: () => { state.mods.spinDamage = true; }
      },
      {
        id: "shield",
        name: "Glass Aegis",
        icon: "◇",
        desc: "Gain one shield. Blocks a missed ball.",
        apply: () => { state.mods.shield += 1; }
      },
      {
        id: "vampire",
        name: "Leech Grip",
        icon: "☽",
        desc: "Every third room clear heals 1.",
        apply: () => { state.mods.vampire = true; }
      },
      {
        id: "crit",
        name: "Lucky Edge",
        icon: "⚅",
        desc: "+15% chance for double damage shots.",
        apply: () => { state.mods.crit += 0.15; }
      },
      {
        id: "chain",
        name: "Chain Lightning",
        icon: "⚡",
        desc: "Broken blocks shock a nearby block.",
        apply: () => { state.mods.chain = true; }
      },
      {
        id: "thorn",
        name: "Thorn Rail",
        icon: "✹",
        desc: "If shielded, misses retaliate for 1 enemy damage.",
        apply: () => { state.mods.thorn = true; }
      }
    ];

    function drawDraft() {
      const pool = upgrades.filter(u => !state.relicLog.includes(u.id) || ["shield", "swift-ball", "heavy-ball", "iron-heart", "crit"].includes(u.id));
      const draft = [];
      while (draft.length < 3 && pool.length) {
        const u = pick(pool);
        if (!draft.includes(u)) draft.push(u);
      }
      state.draft = draft;
      state.mode = "upgrade";
      state.message = "Choose a relic";
      state.messageTimer = 1.8;
    }

    function chooseUpgrade(index) {
      const u = state.draft[index];
      if (!u || state.mode !== "upgrade") return;
      u.apply();
      state.relicLog.push(u.id);
      state.room += 1;
      if (state.room > 12) {
        state.mode = "victory";
        saveHighScore();
        return;
      }
      if (state.mods.healOnRoom) state.player.hp = Math.min(state.mods.maxHp, state.player.hp + state.mods.healOnRoom);
      if (state.mods.vampire && state.room % 3 === 1) state.player.hp = Math.min(state.mods.maxHp, state.player.hp + 1);
      buildRoom();
      state.balls = [];
      state.player.y = H / 2;
      state.message = "Room " + state.room;
      state.messageTimer = 1.5;
      serve(1, 1 + state.mods.extraBalls);
      state.mode = "playing";
    }

    function saveHighScore() {
      if (state.score > state.highScore) {
        state.highScore = state.score;
        localStorage.setItem("dungeon-rally-high-score", String(state.highScore));
      }
    }

    function addScore(points, x, y, label) {
      const gain = Math.round(points * (1 + Math.min(2.2, state.combo * 0.06)));
      state.score += gain;
      state.combo += 1;
      state.comboTimer = 2.1;
      state.floats.push({ x, y, text: label || "+" + gain, life: 0.85, vy: -42, color: palette.gold });
    }

    function hurtPlayer(amount = 1) {
      if (state.player.invuln > 0) return;
      if (state.mods.shield > 0) {
        state.mods.shield -= 1;
        burst(state.player.x + 12, state.player.y, palette.cyan, 30);
        state.floats.push({ x: state.player.x + 40, y: state.player.y, text: "SHIELD", life: 0.9, vy: -35, color: palette.cyan });
        if (state.mods.thorn) {
          hitEnemy(1, W - 80, state.enemy.y, "THORN");
        }
        return;
      }
      state.player.hp -= amount;
      state.player.invuln = 1.1;
      state.combo = 0;
      state.shake = 12;
      state.flash = 0.22;
      burst(state.player.x, state.player.y, palette.pink, 36);
      if (state.player.hp <= 0) {
        state.mode = "gameover";
        saveHighScore();
      }
    }

    function hitEnemy(amount, x, y, tag) {
      let damage = amount;
      if (Math.random() < state.mods.crit) {
        damage *= 2;
        tag = "CRIT " + damage;
        burst(x, y, palette.gold, 32);
      }
      state.enemy.hp -= damage;
      state.enemy.stunned = Math.max(state.enemy.stunned, 0.12);
      state.shake = Math.max(state.shake, 4 + damage * 1.5);
      addScore(70 * damage, x, y, tag || "-" + damage + " HP");
      burst(x, y, state.enemy.color, 20 + damage * 4);
      if (state.enemy.hp <= 0 && !state.roomRewarded) {
        state.roomRewarded = true;
        state.balls = [];
        addScore(300 + state.room * 45, W / 2, H / 2, "ROOM CLEAR");
        setTimeout(() => {
          if (state.mode === "playing") drawDraft();
        }, 450);
      }
    }

    function burst(x, y, color, count = 18) {
      for (let i = 0; i < count; i++) {
        const a = rand(0, Math.PI * 2);
        const s = rand(35, 240);
        state.particles.push({
          x, y,
          vx: Math.cos(a) * s,
          vy: Math.sin(a) * s,
          r: rand(1, 3.5),
          life: rand(0.28, 0.9),
          color
        });
      }
    }

    function rectHitCircle(rect, ball) {
      const cx = clamp(ball.x, rect.x, rect.x + rect.w);
      const cy = clamp(ball.y, rect.y, rect.y + rect.h);
      const dx = ball.x - cx;
      const dy = ball.y - cy;
      return dx * dx + dy * dy <= ball.r * ball.r;
    }

    function paddleRect(p) {
      return { x: p.x, y: p.y - p.h / 2, w: p.w, h: p.h };
    }

    function collidePaddle(ball, p, side) {
      const r = paddleRect(p);
      if (!rectHitCircle(r, ball)) return false;
      const rel = clamp((ball.y - p.y) / (p.h / 2), -1, 1);
      const paddleVy = clamp(p.vy || 0, -900, 900);
      const speed = Math.hypot(ball.vx, ball.vy) * 1.022;
      const angle = rel * 0.92;
      const spinKick = clamp((paddleVy / 620) + rel * 0.55, -1.65, 1.65) * (side === "player" ? state.mods.spinPower : 0.78);

      ball.spin = clamp((ball.spin || 0) * 0.35 + spinKick, -2.6, 2.6);
      ball.spinAge = 0;

      if (side === "player") {
        ball.x = r.x + r.w + ball.r + 0.5;
        ball.vx = Math.cos(angle) * speed;
        ball.lastHit = "player";
        if (state.mods.poison) ball.fire = 0.8;
      } else {
        ball.x = r.x - ball.r - 0.5;
        ball.vx = -Math.cos(angle) * speed;
        ball.lastHit = "enemy";
      }

      ball.vy = Math.sin(angle) * speed + paddleVy * 0.16 + rand(-10, 10);

      if (Math.abs(ball.spin) > 0.55) {
        const label = ball.spin > 0 ? "TOPSPIN" : "BACKSPIN";
        state.floats.push({ x: ball.x, y: ball.y - 18, text: label, life: 0.65, vy: -30, color: side === "player" ? palette.cyan : p.color });
        burst(ball.x, ball.y, side === "player" ? palette.cyan : p.color, 16);
      } else {
        burst(ball.x, ball.y, side === "player" ? palette.cyan : p.color, 10);
      }
      return true;
    }

    function hitBlock(ball, block, idx) {
      const beforeHp = block.hp;
      block.hp -= 1 + state.mods.blockPierce;
      addScore(block.type === "stone" ? 35 : 20, block.x + block.w / 2, block.y + block.h / 2);
      burst(block.x + block.w / 2, block.y + block.h / 2, blockColor(block), 12);

      const cx = block.x + block.w / 2;
      const cy = block.y + block.h / 2;
      const dx = (ball.x - cx) / (block.w / 2);
      const dy = (ball.y - cy) / (block.h / 2);
      if (Math.abs(dx) > Math.abs(dy)) ball.vx *= -1;
      else ball.vy *= -1;

      if (block.type === "spike" && ball.lastHit !== "player") hurtPlayer(1);
      if (block.type === "portal") {
        ball.y = H - ball.y;
        ball.vx *= 1.03;
        ball.vy += rand(-60, 60);
        burst(ball.x, ball.y, palette.purple, 18);
      }

      if (block.hp <= 0) {
        state.blocks.splice(idx, 1);
        addScore(block.type === "spike" ? 90 : block.type === "portal" ? 100 : 55, cx, cy, "BROKE");
        if (state.mods.chain && state.blocks.length) {
          const nearest = state.blocks
            .map((b, i) => ({ b, i, d: Math.hypot((b.x + b.w / 2) - cx, (b.y + b.h / 2) - cy) }))
            .sort((a, b) => a.d - b.d)[0];
          if (nearest && nearest.d < 170) {
            nearest.b.hp -= 1;
            burst(nearest.b.x + nearest.b.w / 2, nearest.b.y + nearest.b.h / 2, palette.blue, 20);
            if (nearest.b.hp <= 0) state.blocks.splice(nearest.i, 1);
          }
        }
      } else if (beforeHp !== block.hp) {
        block.pulse += Math.PI;
      }
    }

    function blockColor(block) {
      if (block.type === "stone") return "#7f88a8";
      if (block.type === "spike") return palette.pink;
      if (block.type === "portal") return palette.purple;
      return palette.gold;
    }

    function update(dt) {
      if (state.mode !== "playing" || state.paused) {
        updateParticles(dt);
        return;
      }

      state.messageTimer = Math.max(0, state.messageTimer - dt);
      state.comboTimer = Math.max(0, state.comboTimer - dt);
      if (state.comboTimer <= 0) state.combo = 0;
      state.shake = Math.max(0, state.shake - dt * 22);
      state.flash = Math.max(0, state.flash - dt);
      state.player.invuln = Math.max(0, state.player.invuln - dt);
      state.enemy.stunned = Math.max(0, state.enemy.stunned - dt);

      const p = state.player;
      p.h = p.baseH * state.mods.paddleSize;
      const oldPlayerY = p.y;
      const move = (input.down() ? 1 : 0) - (input.up() ? 1 : 0);
      if (pointer.active) p.y += (pointer.y - p.y) * Math.min(1, dt * 14);
      p.y += move * p.speed * state.mods.paddleSpeed * dt;
      p.y = clamp(p.y, p.h / 2 + 10, H - p.h / 2 - 10);
      p.vy = (p.y - oldPlayerY) / Math.max(dt, 0.001);
      p.prevY = p.y;

      updateEnemy(dt);
      updateBalls(dt);
      updateParticles(dt);

      if (!state.balls.length && state.mode === "playing" && !state.roomRewarded) {
        serve(1);
      }
    }

    function updateEnemy(dt) {
      const e = state.enemy;
      if (e.stunned > 0) {
        e.vy = 0;
        return;
      }
      const oldEnemyY = e.y;
      const incoming = state.balls
        .filter(b => b.vx > 0)
        .sort((a, b) => Math.abs(a.x - e.x) - Math.abs(b.x - e.x))[0] || state.balls[0];
      const targetY = incoming ? incoming.y + Math.sin(now() / 400 + state.room) * 28 : H / 2;
      const diff = targetY - e.y;
      e.y += clamp(diff, -1, 1) * e.speed * state.mods.aiSlow * dt;
      e.y = clamp(e.y, e.h / 2 + 10, H - e.h / 2 - 10);
      e.vy = (e.y - oldEnemyY) / Math.max(dt, 0.001);
      e.prevY = e.y;

      e.spell -= dt;
      if (e.spell <= 0 && state.room >= 2) {
        e.spell = rand(4.5, 7.2) - Math.min(2, state.room * 0.08);
        if (chance(0.62)) {
          const y = rand(95, H - 95);
          const type = chance(0.25) && state.room > 4 ? "spike" : "brick";
          state.blocks.push({ x: rand(W * 0.46, W * 0.68), y, w: 38, h: 24, hp: 1, maxHp: 1, type, pulse: 0 });
          state.floats.push({ x: W - 200, y, text: "SUMMON", life: 0.9, vy: -28, color: e.color });
        } else {
          e.stunned = 0.04;
          state.balls.forEach(b => { if (b.vx < 0) b.vy += rand(-160, 160); });
          state.floats.push({ x: e.x - 40, y: e.y, text: "HEX", life: 0.8, vy: -28, color: e.color });
        }
      }
    }

    function updateBalls(dt) {
      for (let i = state.balls.length - 1; i >= 0; i--) {
        const b = state.balls[i];
        b.trail.push({ x: b.x, y: b.y, life: 0.18 });
        if (b.trail.length > 16) b.trail.shift();
        b.trail.forEach(t => t.life -= dt);
        b.trail = b.trail.filter(t => t.life > 0);

        if (Math.abs(b.spin || 0) > 0.025) {
          b.vy += (b.spin || 0) * Math.sign(b.vx || 1) * 420 * dt;
          b.spin *= Math.pow(0.90, dt);
          b.spinAge = (b.spinAge || 0) + dt;
        }

        const maxSpeed = 650 + state.room * 18;
        const speed = Math.hypot(b.vx, b.vy);
        if (speed > maxSpeed) {
          b.vx = b.vx / speed * maxSpeed;
          b.vy = b.vy / speed * maxSpeed;
        }

        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.fire = Math.max(0, b.fire - dt);

        if (b.y < b.r + 8) {
          b.y = b.r + 8;
          b.vy = Math.abs(b.vy);
          b.spin *= -0.72;
          burst(b.x, b.y, palette.cyan, 6);
        }
        if (b.y > H - b.r - 8) {
          b.y = H - b.r - 8;
          b.vy = -Math.abs(b.vy);
          b.spin *= -0.72;
          burst(b.x, b.y, palette.cyan, 6);
        }

        collidePaddle(b, state.player, "player");
        collidePaddle(b, state.enemy, "enemy");

        for (let j = state.blocks.length - 1; j >= 0; j--) {
          const block = state.blocks[j];
          if (rectHitCircle(block, b)) {
            hitBlock(b, block, j);
            break;
          }
        }

        if (b.x < -30) {
          state.balls.splice(i, 1);
          hurtPlayer(1);
        } else if (b.x > W + 30) {
          state.balls.splice(i, 1);
          let damage = b.damage;
          if (state.mods.spinDamage && Math.abs(b.spin || 0) > 0.75) {
            damage += 1;
            state.floats.push({ x: W - 88, y: b.y - 18, text: "SPIN +1", life: 0.75, vy: -30, color: palette.cyan });
          }
          hitEnemy(damage, W - 62, b.y);
        }
      }
    }

    function updateParticles(dt) {
      for (const p of state.particles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= Math.pow(0.08, dt);
        p.vy *= Math.pow(0.08, dt);
        p.life -= dt;
      }
      state.particles = state.particles.filter(p => p.life > 0);

      for (const f of state.floats) {
        f.y += f.vy * dt;
        f.life -= dt;
      }
      state.floats = state.floats.filter(f => f.life > 0);
    }

    function draw() {
      const shakeX = state.shake ? rand(-state.shake, state.shake) : 0;
      const shakeY = state.shake ? rand(-state.shake, state.shake) : 0;
      ctx.save();
      ctx.translate(shakeX, shakeY);
      drawBackground();
      drawArena();
      drawBlocks();
      drawPaddles();
      drawBalls();
      drawParticles();
      drawHud();
      ctx.restore();

      if (state.flash > 0) {
        ctx.fillStyle = `rgba(255, 90, 122, ${state.flash * 1.4})`;
        ctx.fillRect(0, 0, W, H);
      }

      if (state.mode === "title") drawTitle();
      if (state.mode === "upgrade") drawUpgrade();
      if (state.mode === "gameover") drawGameOver(false);
      if (state.mode === "victory") drawGameOver(true);
      if (state.paused) drawPause();
    }

    function drawBackground() {
      const g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, "#0b1024");
      g.addColorStop(0.55, "#080a16");
      g.addColorStop(1, "#12071b");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);

      ctx.save();
      ctx.globalAlpha = 0.22;
      ctx.strokeStyle = "#88f7ff";
      ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 48) {
        ctx.beginPath();
        ctx.moveTo(x + (state.room * 7 % 48), 0);
        ctx.lineTo(x - 120 + (state.room * 7 % 48), H);
        ctx.stroke();
      }
      ctx.restore();
    }

    function drawArena() {
      ctx.save();
      ctx.strokeStyle = "rgba(255,255,255,0.14)";
      ctx.lineWidth = 2;
      roundRect(14, 14, W - 28, H - 28, 22);
      ctx.stroke();
      ctx.setLineDash([8, 16]);
      ctx.strokeStyle = "rgba(255,255,255,0.18)";
      ctx.beginPath();
      ctx.moveTo(W / 2, 28);
      ctx.lineTo(W / 2, H - 28);
      ctx.stroke();
      ctx.restore();
    }

    function drawBlocks() {
      for (const b of state.blocks) {
        const color = blockColor(b);
        const glow = 0.16 + Math.sin(now() / 260 + b.pulse) * 0.06;
        ctx.save();
        ctx.shadowColor = color;
        ctx.shadowBlur = b.type === "portal" ? 18 : 8;
        ctx.fillStyle = color;
        ctx.globalAlpha = b.type === "stone" ? 0.74 : 0.88;
        roundRect(b.x, b.y, b.w, b.h, 7);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
        ctx.strokeStyle = `rgba(255,255,255,${glow + 0.1})`;
        ctx.stroke();
        if (b.maxHp > 1) {
          ctx.fillStyle = "rgba(0,0,0,0.36)";
          ctx.fillRect(b.x + 7, b.y + b.h - 8, b.w - 14, 3);
          ctx.fillStyle = palette.ink;
          ctx.fillRect(b.x + 7, b.y + b.h - 8, (b.w - 14) * b.hp / b.maxHp, 3);
        }
        if (b.type === "spike") {
          ctx.fillStyle = "rgba(0,0,0,0.32)";
          for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo(b.x + 9 + i * 12, b.y + b.h - 6);
            ctx.lineTo(b.x + 15 + i * 12, b.y + 6);
            ctx.lineTo(b.x + 21 + i * 12, b.y + b.h - 6);
            ctx.fill();
          }
        }
        if (b.type === "portal") {
          ctx.strokeStyle = "rgba(255,255,255,0.75)";
          ctx.beginPath();
          ctx.ellipse(b.x + b.w / 2, b.y + b.h / 2, 12, 7, now() / 400, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    function drawPaddles() {
      drawPaddle(state.player, palette.cyan, state.player.invuln > 0 ? 0.55 : 1, "left");
      drawPaddle(state.enemy, state.enemy.color, state.enemy.stunned > 0 ? 0.55 : 1, "right");
    }

    function drawPaddle(p, color, alpha, side) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.shadowColor = color;
      ctx.shadowBlur = 18;
      const r = paddleRect(p);
      const grad = ctx.createLinearGradient(r.x, r.y, r.x + r.w, r.y + r.h);
      grad.addColorStop(0, color);
      grad.addColorStop(1, "#ffffff");
      ctx.fillStyle = grad;
      roundRect(r.x, r.y, r.w, r.h, 8);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(255,255,255,0.38)";
      if (side === "left") ctx.fillRect(r.x + r.w - 3, r.y + 9, 2, r.h - 18);
      else ctx.fillRect(r.x + 1, r.y + 9, 2, r.h - 18);
      ctx.restore();
    }

    function drawBalls() {
      for (const b of state.balls) {
        for (let i = 0; i < b.trail.length; i++) {
          const t = b.trail[i];
          ctx.save();
          ctx.globalAlpha = (i / b.trail.length) * 0.24;
          ctx.fillStyle = b.fire ? palette.pink : palette.cyan;
          ctx.beginPath();
          ctx.arc(t.x, t.y, b.r * (i / b.trail.length), 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        ctx.save();
        ctx.shadowColor = b.fire ? palette.pink : palette.cyan;
        ctx.shadowBlur = 22;
        const grad = ctx.createRadialGradient(b.x - 3, b.y - 4, 1, b.x, b.y, b.r + 4);
        grad.addColorStop(0, "#ffffff");
        grad.addColorStop(0.45, b.fire ? palette.pink : palette.cyan);
        grad.addColorStop(1, "rgba(255,255,255,0.18)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();

        if (Math.abs(b.spin || 0) > 0.04) {
          const spinAlpha = clamp(Math.abs(b.spin) / 2.4, 0.22, 0.95);
          const spinDir = b.spin > 0 ? 1 : -1;
          const a = now() / 120 * spinDir;
          ctx.globalAlpha = spinAlpha;
          ctx.shadowBlur = 0;
          ctx.strokeStyle = b.spin > 0 ? palette.gold : palette.purple;
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.r + 5, a, a + Math.PI * 1.18);
          ctx.stroke();
          ctx.fillStyle = ctx.strokeStyle;
          ctx.beginPath();
          ctx.arc(b.x + Math.cos(a + Math.PI * 1.18) * (b.r + 5), b.y + Math.sin(a + Math.PI * 1.18) * (b.r + 5), 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    }

    function drawParticles() {
      for (const p of state.particles) {
        ctx.save();
        ctx.globalAlpha = clamp(p.life, 0, 1);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      for (const f of state.floats) {
        ctx.save();
        ctx.globalAlpha = clamp(f.life * 1.3, 0, 1);
        ctx.fillStyle = f.color;
        ctx.font = "700 16px ui-sans-serif, system-ui";
        ctx.textAlign = "center";
        ctx.fillText(f.text, f.x, f.y);
        ctx.restore();
      }
    }

    function drawHud() {
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.26)";
      roundRect(24, 24, W - 48, 54, 16);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      ctx.stroke();

      ctx.fillStyle = palette.ink;
      ctx.font = "800 18px ui-sans-serif, system-ui";
      ctx.textAlign = "left";
      ctx.fillText("Room " + state.room + " / 12", 42, 58);

      drawHearts(158, 52);
      drawEnemyBar();

      ctx.textAlign = "right";
      ctx.fillStyle = palette.gold;
      ctx.fillText(String(state.score).padStart(6, "0"), W - 42, 48);
      ctx.fillStyle = palette.muted;
      ctx.font = "600 12px ui-sans-serif, system-ui";
      ctx.fillText("BEST " + state.highScore, W - 42, 66);

      if (state.combo > 2) {
        ctx.textAlign = "center";
        ctx.fillStyle = palette.gold;
        ctx.font = "800 15px ui-sans-serif, system-ui";
        ctx.fillText("x" + state.combo + " COMBO", W / 2, 94);
      }

      if (state.mods.shield > 0) {
        ctx.textAlign = "left";
        ctx.fillStyle = palette.cyan;
        ctx.font = "800 13px ui-sans-serif, system-ui";
        ctx.fillText("SHIELD × " + state.mods.shield, 42, 94);
      }

      const strongestSpin = state.balls.reduce((best, b) => Math.abs(b.spin || 0) > Math.abs(best) ? b.spin : best, 0);
      if (Math.abs(strongestSpin) > 0.08) {
        const y = state.mods.shield > 0 ? 116 : 94;
        ctx.textAlign = "left";
        ctx.fillStyle = strongestSpin > 0 ? palette.gold : palette.purple;
        ctx.font = "800 13px ui-sans-serif, system-ui";
        ctx.fillText("SPIN " + (strongestSpin > 0 ? "↻" : "↺"), 42, y);
        ctx.fillStyle = "rgba(255,255,255,0.14)";
        roundRect(102, y - 10, 76, 8, 5);
        ctx.fill();
        ctx.fillStyle = strongestSpin > 0 ? palette.gold : palette.purple;
        roundRect(102, y - 10, 76 * clamp(Math.abs(strongestSpin) / 2.6, 0, 1), 8, 5);
        ctx.fill();
      }

      if (state.messageTimer > 0) {
        ctx.textAlign = "center";
        ctx.fillStyle = `rgba(245,247,255,${clamp(state.messageTimer, 0, 1)})`;
        ctx.font = "900 42px ui-sans-serif, system-ui";
        ctx.fillText(state.message, W / 2, H / 2 - 116);
      }
      ctx.restore();
    }

    function drawHearts(x, y) {
      const hp = state.player.hp;
      const max = state.mods ? state.mods.maxHp : 4;
      for (let i = 0; i < max; i++) {
        ctx.fillStyle = i < hp ? palette.pink : "rgba(255,255,255,0.16)";
        heart(x + i * 22, y, 8);
        ctx.fill();
      }
    }

    function drawEnemyBar() {
      const e = state.enemy || { hp: 1, maxHp: 1, name: "" };
      const x = 340;
      const y = 42;
      const w = 280;
      const h = 10;
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      roundRect(x, y, w, h, 7);
      ctx.fill();
      ctx.fillStyle = e.color || palette.purple;
      roundRect(x, y, w * clamp(e.hp / e.maxHp, 0, 1), h, 7);
      ctx.fill();
      ctx.fillStyle = palette.muted;
      ctx.font = "700 12px ui-sans-serif, system-ui";
      ctx.textAlign = "center";
      ctx.fillText(e.name + "  " + Math.max(0, e.hp) + "/" + e.maxHp, x + w / 2, y + 28);
    }

    function drawTitle() {
      overlay();
      ctx.save();
      ctx.textAlign = "center";
      ctx.fillStyle = palette.ink;
      ctx.font = "900 66px ui-sans-serif, system-ui";
      ctx.fillText("Dungeon Rally", W / 2, 185);
      ctx.fillStyle = palette.cyan;
      ctx.font = "800 22px ui-sans-serif, system-ui";
      ctx.fillText("roguelike ping pong", W / 2, 224);
      ctx.fillStyle = palette.muted;
      ctx.font = "500 18px ui-sans-serif, system-ui";
      wrapText("Deflect the dungeon orb, curve it with paddle spin, break procedural hazards, drain the enemy paddle, and draft relics after every room.", W / 2, 274, 620, 26);
      button(W / 2 - 145, 356, 290, 58, "Press Space / Click to Start", palette.cyan);
      ctx.fillStyle = palette.muted;
      ctx.font = "600 14px ui-sans-serif, system-ui";
      ctx.fillText("W/S, Arrow Keys, Mouse, or Touch. Move while hitting to spin. P pauses. R resets.", W / 2, 456);
      ctx.restore();
    }

    function drawUpgrade() {
      overlay();
      ctx.save();
      ctx.textAlign = "center";
      ctx.fillStyle = palette.ink;
      ctx.font = "900 44px ui-sans-serif, system-ui";
      ctx.fillText("Choose a Relic", W / 2, 126);
      ctx.fillStyle = palette.muted;
      ctx.font = "600 16px ui-sans-serif, system-ui";
      ctx.fillText("Pick one upgrade for the rest of this run.", W / 2, 156);

      const cardW = 250;
      const gap = 22;
      const startX = W / 2 - (cardW * 3 + gap * 2) / 2;
      state.draft.forEach((u, i) => {
        const x = startX + i * (cardW + gap);
        const y = 210;
        ctx.save();
        ctx.fillStyle = "rgba(15, 19, 38, 0.92)";
        ctx.strokeStyle = i === 0 ? "rgba(136,247,255,0.55)" : "rgba(255,255,255,0.17)";
        ctx.lineWidth = 2;
        roundRect(x, y, cardW, 235, 18);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = palette.gold;
        ctx.font = "900 48px ui-sans-serif, system-ui";
        ctx.fillText(u.icon, x + cardW / 2, y + 68);
        ctx.fillStyle = palette.ink;
        ctx.font = "900 23px ui-sans-serif, system-ui";
        ctx.fillText((i + 1) + ". " + u.name, x + cardW / 2, y + 112);
        ctx.fillStyle = palette.muted;
        ctx.font = "600 15px ui-sans-serif, system-ui";
        wrapText(u.desc, x + cardW / 2, y + 150, cardW - 42, 21);
        ctx.fillStyle = "rgba(136,247,255,0.14)";
        roundRect(x + 52, y + 188, cardW - 104, 34, 10);
        ctx.fill();
        ctx.fillStyle = palette.cyan;
        ctx.font = "800 13px ui-sans-serif, system-ui";
        ctx.fillText("CLICK OR PRESS " + (i + 1), x + cardW / 2, y + 210);
        ctx.restore();
      });
      ctx.restore();
    }

    function drawGameOver(victory) {
      overlay();
      ctx.save();
      ctx.textAlign = "center";
      ctx.fillStyle = victory ? palette.gold : palette.pink;
      ctx.font = "900 58px ui-sans-serif, system-ui";
      ctx.fillText(victory ? "Dungeon Cleared" : "Run Ended", W / 2, 190);
      ctx.fillStyle = palette.ink;
      ctx.font = "800 26px ui-sans-serif, system-ui";
      ctx.fillText("Score " + state.score + " · Best " + state.highScore, W / 2, 238);
      ctx.fillStyle = palette.muted;
      ctx.font = "600 17px ui-sans-serif, system-ui";
      ctx.fillText("Rooms reached: " + state.room + " · Relics: " + state.relicLog.length, W / 2, 274);
      button(W / 2 - 120, 345, 240, 54, "Restart Run", victory ? palette.gold : palette.pink);
      ctx.fillStyle = palette.muted;
      ctx.font = "600 14px ui-sans-serif, system-ui";
      ctx.fillText("Press R or Space", W / 2, 434);
      ctx.restore();
    }

    function drawPause() {
      overlay(0.55);
      ctx.save();
      ctx.textAlign = "center";
      ctx.fillStyle = palette.ink;
      ctx.font = "900 54px ui-sans-serif, system-ui";
      ctx.fillText("Paused", W / 2, H / 2 - 10);
      ctx.fillStyle = palette.muted;
      ctx.font = "600 18px ui-sans-serif, system-ui";
      ctx.fillText("Press P to resume", W / 2, H / 2 + 34);
      ctx.restore();
    }

    function overlay(alpha = 0.72) {
      ctx.save();
      ctx.fillStyle = `rgba(5, 7, 18, ${alpha})`;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    function button(x, y, w, h, text, color) {
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = 18;
      ctx.fillStyle = color;
      roundRect(x, y, w, h, 16);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(0,0,0,0.62)";
      ctx.font = "900 17px ui-sans-serif, system-ui";
      ctx.textAlign = "center";
      ctx.fillText(text, x + w / 2, y + h / 2 + 6);
      ctx.restore();
    }

    function wrapText(text, x, y, maxWidth, lineHeight) {
      const words = text.split(" ");
      let line = "";
      for (const word of words) {
        const test = line + word + " ";
        if (ctx.measureText(test).width > maxWidth && line) {
          ctx.fillText(line, x, y);
          line = word + " ";
          y += lineHeight;
        } else {
          line = test;
        }
      }
      ctx.fillText(line, x, y);
    }

    function roundRect(x, y, w, h, r) {
      r = Math.min(r, w / 2, h / 2);
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }

    function heart(x, y, s) {
      ctx.beginPath();
      ctx.moveTo(x, y + s * 0.35);
      ctx.bezierCurveTo(x - s * 1.2, y - s * 0.55, x - s * 1.8, y + s * 0.55, x, y + s * 1.55);
      ctx.bezierCurveTo(x + s * 1.8, y + s * 0.55, x + s * 1.2, y - s * 0.55, x, y + s * 0.35);
      ctx.closePath();
    }

    function canvasPoint(evt) {
      const rect = canvas.getBoundingClientRect();
      return {
        x: (evt.clientX - rect.left) * W / rect.width,
        y: (evt.clientY - rect.top) * H / rect.height
      };
    }

    function handleClick(x, y) {
      if (state.mode === "title") {
        newRun();
        return;
      }
      if (state.mode === "gameover" || state.mode === "victory") {
        newRun();
        return;
      }
      if (state.mode === "upgrade") {
        const cardW = 250;
        const gap = 22;
        const startX = W / 2 - (cardW * 3 + gap * 2) / 2;
        for (let i = 0; i < 3; i++) {
          const cx = startX + i * (cardW + gap);
          if (x >= cx && x <= cx + cardW && y >= 210 && y <= 445) {
            chooseUpgrade(i);
            return;
          }
        }
      }
    }

    window.addEventListener("keydown", e => {
      keyState.add(e.code);
      if (["ArrowUp", "ArrowDown", "Space"].includes(e.code)) e.preventDefault();
      if (e.code === "Space") {
        if (state.mode === "title" || state.mode === "gameover" || state.mode === "victory") newRun();
        else if (state.mode === "playing" && state.balls.length === 0) serve(1);
      }
      if (e.code === "KeyP" && state.mode === "playing") state.paused = !state.paused;
      if (e.code === "KeyR") newRun();
      if (state.mode === "upgrade" && ["Digit1", "Digit2", "Digit3"].includes(e.code)) {
        chooseUpgrade(Number(e.code.replace("Digit", "")) - 1);
      }
    });

    window.addEventListener("keyup", e => keyState.delete(e.code));

    wrap.addEventListener("pointerdown", e => {
      pointer.active = true;
      pointer.y = canvasPoint(e).y;
      const p = canvasPoint(e);
      handleClick(p.x, p.y);
      wrap.setPointerCapture?.(e.pointerId);
    });

    wrap.addEventListener("pointermove", e => {
      const p = canvasPoint(e);
      pointer.y = p.y;
      if (e.pointerType === "mouse") pointer.active = true;
    });

    wrap.addEventListener("pointerup", e => {
      if (e.pointerType !== "mouse") pointer.active = false;
      wrap.releasePointerCapture?.(e.pointerId);
    });

    window.addEventListener("blur", () => {
      if (state.mode === "playing") state.paused = true;
    });

    function loop(t) {
      const dt = Math.min(0.033, (t - state.lastTime) / 1000 || 0);
      state.lastTime = t;
      update(dt);
      draw();
      requestAnimationFrame(loop);
    }

    draw();
    requestAnimationFrame(loop);
  })();
  
