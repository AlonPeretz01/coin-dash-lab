/* global Phaser, COIN_DASH */

// Pixel-art sprites as character grids. Each character maps to a palette colour
// ('.' = transparent). Textures are baked at exactly the physics size, so the
// sprites keep scale 1 and their bodies match the original shapes.
const PIXEL_ART = {
  // 8x8 grid, 3px cells -> 24x24 (player body 24x24)
  player: { cell: 3, rows: [
    '..PPPP..',
    '.PPPPPP.',
    '.PKPPKP.',
    '.PPPPPP.',
    '..PDDP..',
    'PPPPPPPP',
    '..P..P..',
    '.PP..PP.'
  ] },
  // 9x9 grid, 2px cells -> 18x18 (coin body circle radius 9)
  coin: { cell: 2, rows: [
    '..YYYYY..',
    '.YWWYYYO.',
    'YWYYOYYYO',
    'YWYYOYYYO',
    'YYYYOYYYO',
    'YYYYOYYYO',
    'YYYYOYYYO',
    '.YYYYYOO.',
    '..OOOOO..'
  ] },
  // 13x13 grid, 2px cells -> 26x26 (drone body 26x26), two animation frames
  drone0: { cell: 2, rows: [
    '...D.....D...',
    '....D...D....',
    '...DDDDDDD...',
    '..DDDDDDDDD..',
    '.DDD.DDD.DDD.',
    '.DDD.DDD.DDD.',
    'DDDDDDDDDDDDD',
    'DDDDDDDDDDDDD',
    'D.DDDDDDDDD.D',
    'D.D.......D.D',
    'D.D.......D.D',
    '...DD...DD...',
    '...DD...DD...'
  ] },
  drone1: { cell: 2, rows: [
    '...D.....D...',
    'D...D...D...D',
    'D..DDDDDDD..D',
    'D.DDDDDDDDD.D',
    'DDDD.DDD.DDDD',
    'DDDD.DDD.DDDD',
    'DDDDDDDDDDDDD',
    '.DDDDDDDDDDD.',
    '..DDDDDDDDD..',
    '..D.......D..',
    '.D.........D.',
    'D...........D',
    '.............'
  ] },
  // 10x10 grid, 2px cells -> 20x20 freeze power-up star
  powerup: { cell: 2, rows: [
    '....CC....',
    '....CC....',
    '...CWWC...',
    'CCCCWWCCCC',
    '.CCWWWWCC.',
    '..CCWWCC..',
    '..CCCCCC..',
    '.CCC..CCC.',
    '.CC....CC.',
    'C........C'
  ] }
};

class CoinDash extends Phaser.Scene {
  constructor() { super('CoinDash'); }

  makePixelTextures() {
    const col = COIN_DASH.colors;
    const palette = {
      P: col.player, D: col.drone, K: col.eye, Y: col.coin,
      O: col.coinShade, W: col.coinShine, C: col.powerup
    };
    // Player "mouth" uses the dark lime; drones use 'D' for their body.
    const perTexture = { player: { D: col.playerDark }, powerup: { W: col.powerupShine } };
    Object.keys(PIXEL_ART).forEach((key) => {
      if (this.textures.exists(key)) return; // survives scene.restart()
      const art = PIXEL_ART[key];
      const map = Object.assign({}, palette, perTexture[key]);
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      art.rows.forEach((row, y) => {
        for (let x = 0; x < row.length; x++) {
          const ch = row[x];
          if (ch === '.') continue;
          g.fillStyle(map[ch], 1);
          g.fillRect(x * art.cell, y * art.cell, art.cell, art.cell);
        }
      });
      g.generateTexture(key, art.rows[0].length * art.cell, art.rows.length * art.cell);
      g.destroy();
    });
  }

  drawBackdrop() {
    const c = COIN_DASH;
    const g = this.add.graphics();
    // Sparse pixel starfield below the HUD bar.
    for (let i = 0; i < 70; i++) {
      const size = Math.random() < 0.2 ? 4 : 2;
      g.fillStyle(c.colors.stars[i % c.colors.stars.length], Math.random() < 0.5 ? 0.35 : 0.7);
      g.fillRect(Math.floor(Math.random() * c.width / 2) * 2,
        48 + Math.floor(Math.random() * (c.height - 50) / 2) * 2, size, size);
    }
    // Chunky dashed HUD divider on the top playfield edge (y = 44).
    g.fillStyle(c.colors.accent, 1);
    for (let x = 0; x < c.width; x += 16) g.fillRect(x, 40, 10, 4);
  }

  init(data) {
    this.difficulty = (data && data.difficulty) || this.difficulty || COIN_DASH.defaultDifficulty;
  }

  // Best score per difficulty in localStorage. Storage may be blocked
  // (private mode, file:// policies), so every access is guarded: best = 0.
  bestKey() { return 'coinDash.best.' + this.difficulty; }

  loadBest() {
    try {
      const n = parseInt(window.localStorage.getItem(this.bestKey()), 10);
      return Number.isFinite(n) && n > 0 ? n : 0;
    } catch (e) {
      return 0;
    }
  }

  saveBest(value) {
    try {
      window.localStorage.setItem(this.bestKey(), String(value));
    } catch (e) {
      // Storage unavailable: keep the best for this session only.
    }
  }

  create() {
    const c = COIN_DASH;
    const level = c.difficulties[this.difficulty];
    this.score = 0;
    this.best = this.loadBest();
    this.finished = false;
    this.paused = false;
    this.deadline = null; // set when the countdown reaches GO
    this.physics.world.setBounds(0, 44, c.width, c.height - 44);
    this.makePixelTextures();
    this.drawBackdrop();
    this.hud = this.add.text(18, 10, '', {
      fontFamily: '"Courier New", Courier, monospace', fontSize: '22px', fontStyle: 'bold',
      color: c.colors.hudText
    });
    this.player = this.add.image(c.width / 2, c.height / 2, 'player').setDisplaySize(24, 24);
    this.physics.add.existing(this.player);
    this.player.body.setCollideWorldBounds(true);
    this.coin = this.add.image(100, 100, 'coin').setDisplaySize(18, 18);
    this.physics.add.existing(this.coin);
    this.coin.body.setCircle(9);
    this.placeCoin();
    this.drones = this.physics.add.group();
    // Spread drones across the top of the arena, away from the player in the centre.
    const spacing = level.droneCount > 1 ? Math.min(270, (c.width - 180) / (level.droneCount - 1)) : 0;
    for (let i = 0; i < level.droneCount; i++) {
      const drone = this.add.image(90 + i * spacing, 100, 'drone0').setDisplaySize(26, 26);
      this.drones.add(drone);
      drone.body.setCollideWorldBounds(true).setBounce(1, 1);
      const angle = (35 + i * 105) * Math.PI / 180;
      drone.body.setVelocity(Math.cos(angle) * level.droneSpeed, Math.sin(angle) * level.droneSpeed);
    }
    // Two-frame invader shuffle (same 26x26 texture size, so bodies are unaffected).
    this.droneFrame = 0;
    this.time.addEvent({ delay: 350, loop: true, callback: () => {
      if (this.counting || this.finished || this.paused || this.frozen) return;
      this.droneFrame = 1 - this.droneFrame;
      this.drones.getChildren().forEach((d) => d.setTexture('drone' + this.droneFrame));
    } });
    this.physics.add.overlap(this.player, this.coin, () => {
      if (this.finished) return;
      this.score++;
      this.beep(880, 0.12);
      this.placeCoin();
    });
    this.physics.add.overlap(this.player, this.drones, () => {
      if (this.frozen) return; // frozen invaders are harmless
      if (!this.finished) this.beep(110, 0.4, 'sawtooth');
      this.finish('A drone caught you!');
    });
    this.setupPowerup();
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D,R');
    const restart = (difficulty) => {
      if (this.paused) this.physics.resume(); // physics pause must not outlive the scene
      this.scene.restart({ difficulty });
    };
    this.input.keyboard.on('keydown-R', () => restart(this.difficulty));
    this.input.keyboard.on('keydown-ONE', () => { if (!this.paused) restart('easy'); });
    this.input.keyboard.on('keydown-TWO', () => { if (!this.paused) restart('normal'); });
    this.input.keyboard.on('keydown-THREE', () => { if (!this.paused) restart('hard'); });
    this.input.keyboard.on('keydown-P', () => this.togglePause());
    // Phaser only unlocks audio on pointer/touch; the game is keyboard-driven.
    this.input.keyboard.on('keydown', () => {
      if (this.sound.context && this.sound.context.state === 'suspended') this.sound.context.resume();
    });
    this.startCountdown();
  }

  togglePause() {
    if (this.finished || this.counting) return; // no pausing during the countdown
    this.paused = !this.paused;
    if (this.paused) {
      this.physics.pause();
      this.time.paused = true; // freezes delayedCall/addEvent timers
      this.pausedAt = this.time.now;
      this.pauseText = this.add.text(COIN_DASH.width / 2, COIN_DASH.height / 2,
        'Paused – press P to resume', { font: '24px monospace', color: '#ffffff' }).setOrigin(0.5);
    } else {
      this.physics.resume();
      this.time.paused = false;
      const away = this.time.now - this.pausedAt; // now may keep advancing while paused
      this.deadline += away;
      this.freezeUntil += away;
      this.pauseText.destroy();
    }
  }

  // Synthesized with Web Audio via Phaser's context (unlocked on first key press).
  beep(freq, secs, type = 'sine') {
    const ctx = this.sound.context;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + secs);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + secs);
  }

  // "3, 2, 1, GO!" before every round. Physics is paused so nothing moves, and the
  // round timer and power-ups only start at GO. Timers live on this.time, so a
  // restart (R / 1 / 2 / 3) mid-countdown simply begins a fresh countdown.
  startCountdown() {
    const c = COIN_DASH;
    this.counting = true;
    this.physics.pause();
    const text = this.add.text(c.width / 2, c.height / 2, '', {
      fontFamily: '"Courier New", Courier, monospace', fontSize: '120px', fontStyle: 'bold',
      color: c.colors.titleText, stroke: c.colors.blinkText, strokeThickness: 10
    }).setOrigin(0.5).setDepth(10);
    const show = (label) => {
      text.setText(label).setScale(1.6).setAlpha(1);
      this.tweens.add({ targets: text, scale: 1, duration: 250, ease: 'Back.Out' });
    };
    ['3', '2', '1'].forEach((label, i) => this.time.delayedCall(i * 1000, () => show(label)));
    this.time.delayedCall(3000, () => {
      show('GO!');
      this.startRound();
      this.tweens.add({ targets: text, alpha: 0, delay: 500, duration: 300, onComplete: () => text.destroy() });
    });
  }

  startRound() {
    const c = COIN_DASH;
    this.counting = false;
    this.deadline = this.time.now + c.roundSeconds * 1000;
    this.physics.resume();
    this.time.addEvent({ delay: c.powerupEvery * 1000, loop: true, callback: () => this.spawnPowerup() });
  }

  placeCoin() {
    const c = COIN_DASH;
    // Avoid spawning the next coin directly underneath the player.
    let x, y;
    do {
      x = Phaser.Math.Between(25, c.width - 25);
      y = Phaser.Math.Between(70, c.height - 25);
    } while (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) < 60);
    this.coin.setPosition(x, y);
    this.coin.body.reset(x, y);
  }

  // Freeze power-up. All timers live on this.time, so scene.restart() clears them.
  setupPowerup() {
    const c = COIN_DASH;
    this.frozen = false;
    this.freezeUntil = 0;
    this.powerupExpiry = null;
    this.powerup = this.add.image(0, 0, 'powerup').setDisplaySize(20, 20).setVisible(false);
    this.physics.add.existing(this.powerup);
    this.powerup.body.enable = false;
    this.freezeText = this.add.text(c.width / 2, 52, '', {
      fontFamily: '"Courier New", Courier, monospace', fontSize: '18px', fontStyle: 'bold',
      color: c.colors.freezeText
    }).setOrigin(0.5, 0).setVisible(false);
    // The spawn timer is started by startRound(), after the countdown.
    this.physics.add.overlap(this.player, this.powerup, () => {
      if (this.finished || !this.powerup.visible) return;
      this.hidePowerup();
      this.freezeDrones();
    });
  }

  spawnPowerup() {
    // Only one at a time, never during a freeze or after game over.
    if (this.finished || this.frozen || this.powerup.visible) return;
    const c = COIN_DASH;
    let x, y;
    do {
      x = Phaser.Math.Between(25, c.width - 25);
      y = Phaser.Math.Between(70, c.height - 25);
    } while (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) < 80
      || Phaser.Math.Distance.Between(x, y, this.coin.x, this.coin.y) < 30);
    this.powerup.setPosition(x, y).setVisible(true);
    this.powerup.body.enable = true;
    this.powerup.body.reset(x, y);
    this.powerupExpiry = this.time.delayedCall(c.powerupLifetime * 1000, () => this.hidePowerup());
  }

  hidePowerup() {
    this.powerup.setVisible(false);
    this.powerup.body.enable = false;
    if (this.powerupExpiry) this.powerupExpiry.remove(false);
    this.powerupExpiry = null;
  }

  freezeDrones() {
    const c = COIN_DASH;
    this.frozen = true;
    this.freezeUntil = this.time.now + c.freezeSeconds * 1000;
    this.drones.getChildren().forEach((d) => {
      d.setData('velocity', { x: d.body.velocity.x, y: d.body.velocity.y });
      d.body.setVelocity(0, 0);
      d.setTintFill(c.colors.frozenTint);
    });
    this.freezeText.setText(`FREEZE! ${c.freezeSeconds}`).setVisible(true);
    this.time.delayedCall(c.freezeSeconds * 1000, () => this.unfreezeDrones());
  }

  unfreezeDrones() {
    this.freezeText.setVisible(false);
    if (this.finished) return; // game over: everything stays put
    this.frozen = false;
    this.drones.getChildren().forEach((d) => {
      const v = d.getData('velocity');
      d.body.setVelocity(v.x, v.y);
      d.clearTint();
    });
  }

  update() {
    if (this.finished || this.paused) return;
    if (this.counting) {
      this.updateHud(COIN_DASH.roundSeconds);
      return;
    }
    const dx = Number(this.cursors.right.isDown || this.keys.D.isDown)
      - Number(this.cursors.left.isDown || this.keys.A.isDown);
    const dy = Number(this.cursors.down.isDown || this.keys.S.isDown)
      - Number(this.cursors.up.isDown || this.keys.W.isDown);
    const direction = new Phaser.Math.Vector2(dx, dy).normalize().scale(COIN_DASH.playerSpeed);
    this.player.body.setVelocity(direction.x, direction.y);
    if (this.frozen) {
      const left = Math.max(0, Math.ceil((this.freezeUntil - this.time.now) / 1000));
      this.freezeText.setText(`FREEZE! ${left}`);
    }
    const seconds = Math.max(0, Math.ceil((this.deadline - this.time.now) / 1000));
    this.updateHud(seconds);
    if (seconds === 0) this.finish('Time is up!');
  }

  updateHud(seconds) {
    const label = COIN_DASH.difficulties[this.difficulty].label.toUpperCase();
    this.hud.setText(`SCORE ${String(this.score).padStart(3, '0')}  BEST ${String(this.best).padStart(3, '0')}`
      + `  ${label}  TIME ${String(seconds).padStart(2, '0')}`);
  }

  finish(reason) {
    if (this.finished) return;
    this.finished = true;
    this.physics.pause();
    const newBest = this.score > this.best;
    if (newBest) {
      this.best = this.score;
      this.saveBest(this.best);
    }
    const c = COIN_DASH;
    const font = '"Courier New", Courier, monospace';
    const cx = c.width / 2, cy = c.height / 2;
    this.add.rectangle(cx, cy, 480, 290, c.colors.background, 0.92)
      .setStrokeStyle(6, c.colors.drone);
    this.add.text(cx, cy - 92, 'GAME OVER', {
      fontFamily: font, fontSize: '56px', fontStyle: 'bold', color: c.colors.titleText,
      stroke: '#ff2e93', strokeThickness: 6
    }).setOrigin(0.5);
    this.add.text(cx, cy - 22, `${reason.toUpperCase()}\nSCORE ${String(this.score).padStart(3, '0')}`, {
      fontFamily: font, fontSize: '22px', fontStyle: 'bold', color: c.colors.bodyText,
      align: 'center', lineSpacing: 8
    }).setOrigin(0.5);
    this.add.text(cx, cy + 34, newBest ? 'NEW HIGH SCORE!' : `BEST ${String(this.best).padStart(3, '0')}`, {
      fontFamily: font, fontSize: '26px', fontStyle: 'bold',
      color: newBest ? c.colors.titleText : c.colors.hudText,
      stroke: c.colors.blinkText, strokeThickness: newBest ? 4 : 0
    }).setOrigin(0.5);
    const prompt = this.add.text(cx, cy + 92, 'PRESS R', {
      fontFamily: font, fontSize: '26px', fontStyle: 'bold', color: c.colors.blinkText
    }).setOrigin(0.5);
    this.time.addEvent({ delay: 450, loop: true, callback: () => prompt.setVisible(!prompt.visible) });
  }
}
window.coinDashGame = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: COIN_DASH.width,
  height: COIN_DASH.height,
  backgroundColor: COIN_DASH.colors.background,
  pixelArt: true,
  physics: { default: 'arcade', arcade: { debug: false } },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_HORIZONTALLY },
  scene: CoinDash
});
