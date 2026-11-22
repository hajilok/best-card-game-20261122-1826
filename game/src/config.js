// Sunstone Gambit configuration: table geometry, suit visual tokens, and duel balance constants.

export const VIEW = Object.freeze({
  width: 1280,
  height: 720,
});

export const CARD = Object.freeze({
  width: 136,
  height: 190,
  radius: 13,
  handScale: 0.88,
  hoverScale: 0.98,
  arenaScale: 0.75,
  opponentScale: 0.40,
});

export const RULES = Object.freeze({
  startingHp: 34,
  maxEnergy: 4,
  handLimit: 5,
  chainSlots: 3,
  swapsPerTurn: 1,
  stepSeconds: 1 / 60,
});

export const SUIT_ORDER = Object.freeze(['solar', 'tide', 'verdant', 'eclipse']);

/**
 * Each suit has a distinct color palette AND distinct geometric emblem shape
 * (sunburst, crescent wave, tri-leaf, astral star) so suits never rely on text alone.
 */
export const SUITS = Object.freeze({
  solar: Object.freeze({
    id: 'solar',
    name: 'Solar',
    symbol: '☀',
    shape: 'sun',
    color: '#ff5d38',
    bright: '#ffb66c',
    mid: '#c93818',
    dark: '#3b1109',
    panel: '#240b06',
    counterOf: 'verdant',
    counteredBy: 'tide',
    resonanceName: 'Solar Flare',
    resonanceText: '+4 Burn DMG',
  }),
  tide: Object.freeze({
    id: 'tide',
    name: 'Tide',
    symbol: '☾',
    shape: 'wave',
    color: '#25b8ff',
    bright: '#8ceaff',
    mid: '#1273b8',
    dark: '#092a42',
    panel: '#061a2b',
    counterOf: 'solar',
    counteredBy: 'verdant',
    resonanceName: 'Tidal Aegis',
    resonanceText: '+4 Ward & +1 Draw',
  }),
  verdant: Object.freeze({
    id: 'verdant',
    name: 'Verdant',
    symbol: '♣',
    shape: 'leaf',
    color: '#29db84',
    bright: '#8effc6',
    mid: '#158a51',
    dark: '#0a3320',
    panel: '#062115',
    counterOf: 'tide',
    counteredBy: 'solar',
    resonanceName: 'Bloom Surge',
    resonanceText: '+3 HP & +1 Aether',
  }),
  eclipse: Object.freeze({
    id: 'eclipse',
    name: 'Eclipse',
    symbol: '✦',
    shape: 'star',
    color: '#b86dff',
    bright: '#ebc8ff',
    mid: '#7634bd',
    dark: '#2c114a',
    panel: '#1a0a2e',
    counterOf: 'eclipse',
    counteredBy: 'eclipse',
    resonanceName: 'Umbral Pierce',
    resonanceText: '+4 Pierce DMG',
  }),
});

export const PALETTE = Object.freeze({
  feltCenter: '#13352d',
  feltMid: '#0c2520',
  feltEdge: '#061210',
  woodOuter: '#2b1810',
  woodInner: '#4a2b1c',
  gold: '#e6be6c',
  goldBright: '#fff0bd',
  goldDim: '#8e6f38',
  ivory: '#f8f2e4',
  ink: '#14171d',
  hpRed: '#e8454d',
  hpRedBright: '#ff7d82',
  wardCyan: '#35c6ff',
  aetherGold: '#ffc94d',
  danger: '#ff4f5e',
  emerald: '#3be898',
});

export const LAYOUT = Object.freeze({
  topBarH: 56,
  opponentHandY: 95,
  opponentIntentSlots: [
    { x: 432, y: 228 },
    { x: 582, y: 228 },
  ],
  playerChainSlots: [
    { x: 432, y: 402 },
    { x: 582, y: 402 },
    { x: 732, y: 402 },
  ],
  playerHandCenterX: 590,
  playerHandY: 614,
  deckPile: { x: 96, y: 352 },
  discardPile: { x: 198, y: 352 },
  opponentDeckPile: { x: 96, y: 352 },
  playerHud: { x: 28, y: 472, w: 236, h: 176 },
  opponentHud: { x: 28, y: 74, w: 236, h: 158 },
  clashCenter: { x: 966, y: 318 },
  endTurnBtn: { x: 1044, y: 552, w: 202, h: 58 },
  swapBtn: { x: 1044, y: 622, w: 202, h: 46 },
});
