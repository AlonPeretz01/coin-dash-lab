// Keep tuning separate from game behaviour so features can be developed independently.
window.COIN_DASH = {
  width: 800,
  height: 500,
  roundSeconds: 45,
  playerSpeed: 240,
  droneSpeed: 105,
  droneCount: 3,
  // Difficulty presets (keys 1 / 2 / 3). Normal matches droneSpeed / droneCount above.
  defaultDifficulty: 'normal',
  difficulties: {
    easy: { label: 'Easy', droneSpeed: 80, droneCount: 2 },
    normal: { label: 'Normal', droneSpeed: 105, droneCount: 3 },
    hard: { label: 'Hard', droneSpeed: 150, droneCount: 5 }
  },
  // Freeze power-up: a star appears every powerupEvery s, lasts powerupLifetime s,
  // and freezes all invaders for freezeSeconds when collected.
  powerupEvery: 10,
  powerupLifetime: 5,
  freezeSeconds: 3,
  // Retro 8-bit arcade palette (black screen, a few loud colours).
  colors: {
    background: 0x000000,
    player: 0x39ff6a,      // lime
    playerDark: 0x0f7a2c,
    coin: 0xffe62e,        // yellow
    coinShade: 0xff9a1f,
    coinShine: 0xffffff,
    drone: 0xff2e93,       // hot pink
    eye: 0x000000,
    powerup: 0x00e5ff,     // cyan star
    powerupShine: 0xffffff,
    frozenTint: 0x9ff6ff,  // icy silhouette for frozen invaders
    freezeText: '#00e5ff',
    accent: 0x00e5ff,      // cyan (HUD line, borders)
    stars: [0x00e5ff, 0xff2e93, 0xffe62e, 0xffffff],
    hudText: '#00e5ff',
    titleText: '#ffe62e',
    bodyText: '#ffffff',
    blinkText: '#ff2e93'
  }
};
