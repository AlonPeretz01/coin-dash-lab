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
  colors: { background: 0x101c31, player: 0x71e8ce, coin: 0xffd166, drone: 0xff657a }
};
