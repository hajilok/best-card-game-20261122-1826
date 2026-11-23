// Sunstone Gambit configuration: table geometry, suit visual tokens, and duel balance constants.

export const VIEW = Object.freeze({ width: 1280, height: 720 });

export const CARD = Object.freeze({
  width: 136,
  height: 190,
  radius: 13,
  handScale: 0.87,
  hoverScale: 0.98,
  arenaScale: 0.78,
  opponentScale: 0.44,
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
    id: 'solar', name: 'Solar', shape: 'sun',
    color: '#ff5d38', bright: '#ffb66c', mid: '#c93818', dark: '#3b1109', panel: '#240b06',
    counterOf: 'verdant', counteredBy: 'tide',
    resonanceName: 'Solar Flare', resonanceText: '+4 Burn DMG',
  }),
  tide: Object.freeze({
    id: 'tide', name: 'Tide', shape: 'wave',
    color: '#25b8ff', bright: '#8ceaff', mid: '#1273b8', dark: '#092a42', panel: '#061a2b',
    counterOf: 'solar', counteredBy: 'verdant',
    resonanceName: 'Tidal Aegis', resonanceText: '+4 Ward & +1 Draw',
  }),
  verdant: Object.freeze({
    id: 'verdant', name: 'Verdant', shape: 'leaf',
    color: '#29db84', bright: '#8effc6', mid: '#158a51', dark: '#0a3320', panel: '#062115',
    counterOf: 'tide', counteredBy: 'solar',
    resonanceName: 'Bloom Surge', resonanceText: '+3 HP & +1 Aether',
  }),
  eclipse: Object.freeze({
    id: 'eclipse', name: 'Eclipse', shape: 'star',
    color: '#b86dff', bright: '#ebc8ff', mid: '#7634bd', dark: '#2c114a', panel: '#1a0a2e',
    counterOf: 'eclipse', counteredBy: 'eclipse',
    resonanceName: 'Umbral Pierce', resonanceText: '+4 Pierce DMG',
  }),
});

export const PALETTE = Object.freeze({
  feltCenter: '#18483c', feltMid: '#0d2b24', feltEdge: '#05120f',
  woodOuter: '#28150d', woodInner: '#4c2c1b',
  gold: '#e6be6c', goldBright: '#fff1bf', goldDim: '#8c6b32',
  ivory: '#f8f2e4', ink: '#12151c',
  hpRed: '#e8454d', hpRedBright: '#ff7d82',
  wardCyan: '#35c6ff', aetherGold: '#ffc94d', danger: '#ff4f5e', emerald: '#3be898',
});

export const LAYOUT = Object.freeze({
  topBarH: 56,
  opponentHandY: 91,
  opponentIntentSlots: [
    { x: 416, y: 236 },
    { x: 566, y: 236 },
  ],
  playerChainSlots: [
    { x: 416, y: 410 },
    { x: 566, y: 410 },
    { x: 716, y: 410 },
  ],
  playerHandCenterX: 566,
  playerHandY: 616,
  deckPile: { x: 88, y: 356 },
  discardPile: { x: 190, y: 356 },
  opponentDeckPile: { x: 88, y: 356 },
  opponentHud: { x: 24, y: 72, w: 236, h: 176 },
  playerHud: { x: 24, y: 468, w: 236, h: 186 },
  tacticsPanel: { x: 836, y: 120, w: 412, h: 344 },
  endTurnBtn: { x: 1036, y: 546, w: 210, h: 60 },
  swapBtn: { x: 1036, y: 618, w: 210, h: 48 },
});
