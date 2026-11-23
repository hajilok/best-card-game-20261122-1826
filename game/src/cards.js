// Original Sunstone Gambit card catalog, selectable relics, rival profiles with passives, and deck builder.

const CARD_DEFAULTS = Object.freeze({ damage: 0, ward: 0, heal: 0, draw: 0, energy: 0, pierce: false, reveal: false, rare: false });

export const CARD_CATALOG = Object.freeze([
  // SOLAR SUIT — Burst Strike & Burn (Counters Verdant)
  { id: 'sol_spark', name: 'Cinder Flick', suit: 'solar', cost: 0, value: 2, kind: 'strike', art: 'spark', damage: 3, shortText: '3 DMG' },
  { id: 'sol_lance', name: 'Sun Lance', suit: 'solar', cost: 1, value: 4, kind: 'strike', art: 'lance', damage: 6, shortText: '6 DMG' },
  { id: 'sol_brazier', name: 'Pyre Guard', suit: 'solar', cost: 1, value: 5, kind: 'ward', art: 'brazier', damage: 3, ward: 4, shortText: '3 DMG · 4 WARD' },
  { id: 'sol_nova', name: 'Corona Burst', suit: 'solar', cost: 2, value: 7, kind: 'strike', art: 'nova', damage: 9, rare: true, shortText: '9 DMG' },
  { id: 'sol_crown', name: 'Helios Reckon', suit: 'solar', cost: 3, value: 9, kind: 'strike', art: 'crown', damage: 12, ward: 2, rare: true, shortText: '12 DMG · 2 WARD' },
  // TIDE SUIT — Ward, Draw & Counter-Riposte (Counters Solar)
  { id: 'tid_mist', name: 'Mist Veil', suit: 'tide', cost: 0, value: 2, kind: 'ward', art: 'mist', ward: 3, draw: 1, shortText: '3 WARD · +1 CARD' },
  { id: 'tid_mirror', name: 'Tide Riposte', suit: 'tide', cost: 1, value: 4, kind: 'counter', art: 'mirror', damage: 4, ward: 4, shortText: '4 DMG · 4 WARD' },
  { id: 'tid_breaker', name: 'Crest Surge', suit: 'tide', cost: 1, value: 5, kind: 'strike', art: 'breaker', damage: 5, ward: 2, draw: 1, shortText: '5 DMG · +1 CARD' },
  { id: 'tid_bastion', name: 'Abyssal Wall', suit: 'tide', cost: 2, value: 6, kind: 'ward', art: 'bastion', damage: 2, ward: 9, rare: true, shortText: '9 WARD · 2 DMG' },
  { id: 'tid_maelstrom', name: 'Vortex Call', suit: 'tide', cost: 2, value: 8, kind: 'counter', art: 'maelstrom', damage: 7, ward: 5, rare: true, shortText: '7 DMG · 5 WARD' },
  // VERDANT SUIT — Mend, Energy Surge & Drain (Counters Tide)
  { id: 'ver_dew', name: 'Aether Dew', suit: 'verdant', cost: 0, value: 3, kind: 'surge', art: 'dew', ward: 2, heal: 2, energy: 1, shortText: '+1 AETHER · +2 HP' },
  { id: 'ver_thorn', name: 'Briar Lash', suit: 'verdant', cost: 1, value: 4, kind: 'drain', art: 'thorn', damage: 5, heal: 2, shortText: '5 DMG · +2 HP' },
  { id: 'ver_canopy', name: 'Grove Ward', suit: 'verdant', cost: 1, value: 5, kind: 'ward', art: 'canopy', ward: 6, heal: 3, shortText: '6 WARD · +3 HP' },
  { id: 'ver_bloom', name: 'Heartroot', suit: 'verdant', cost: 2, value: 7, kind: 'drain', art: 'bloom', damage: 7, ward: 2, heal: 4, rare: true, shortText: '7 DMG · +4 HP' },
  // ECLIPSE SUIT — Pierce, Reveal & Sabotage (Pierces Ward, Counters Eclipse)
  { id: 'ecl_glint', name: 'Void Peek', suit: 'eclipse', cost: 0, value: 3, kind: 'pierce', art: 'glint', damage: 2, draw: 1, pierce: true, reveal: true, shortText: '2 PIERCE · REVEAL' },
  { id: 'ecl_needle', name: 'Umbra Fang', suit: 'eclipse', cost: 1, value: 5, kind: 'pierce', art: 'needle', damage: 5, pierce: true, shortText: '5 PIERCE DMG' },
  { id: 'ecl_crescent', name: 'Dusk Mirror', suit: 'eclipse', cost: 2, value: 6, kind: 'pierce', art: 'crescent', damage: 6, ward: 4, pierce: true, reveal: true, rare: true, shortText: '6 PIERCE · REVEAL' },
  { id: 'ecl_zenith', name: 'Starfall Hex', suit: 'eclipse', cost: 2, value: 8, kind: 'pierce', art: 'zenith', damage: 8, draw: 1, pierce: true, reveal: true, rare: true, shortText: '8 PIERCE · +1 CARD' },
].map((c) => Object.freeze({ ...CARD_DEFAULTS, ...c })));

export const RELICS = Object.freeze([
  { id: 'prism', name: 'Sunstone Prism', shortText: '+3 DMG on Cascade or Triad', color: '#ffd262' },
  { id: 'compass', name: 'Tidal Compass', shortText: '+2 Ward & +1 Swap on Parry', color: '#5bd3ff' },
  { id: 'lens', name: 'Eclipse Lens', shortText: '+1 Turn-1 Aether & +2 Reveal DMG', color: '#d499ff' },
]);

export const RIVALS = Object.freeze([
  { id: 'archivist', name: 'The Archivist', title: 'Keeper of Brass & Tide', hp: 38, accent: '#25b8ff', emblem: 'wave', style: 'balanced', passive: { id: 'brass_aegis', name: 'Brass Aegis', text: '+2 Ward each turn' } },
  { id: 'pyromancer', name: 'Lady Cinder', title: 'Duelist of the High Sun', hp: 42, accent: '#ff5d38', emblem: 'sun', style: 'aggressive', passive: { id: 'solar_kindle', name: 'Solar Kindle', text: '+3 DMG leading Solar' } },
  { id: 'sovereign', name: 'Astral Sovereign', title: 'Grandmaster of Eclipse', hp: 46, accent: '#b86dff', emblem: 'star', style: 'tactical', passive: { id: 'eclipse_veil', name: 'Eclipse Veil', text: 'Hidden card +2 DMG' } },
]);

const CARD_BY_ID = new Map(CARD_CATALOG.map((card) => [card.id, card]));
let nextCardUid = 1;

export function resetCardUidCounter() { nextCardUid = 1; }

export function instantiateCard(cardId) {
  const proto = CARD_BY_ID.get(cardId);
  if (!proto) throw new Error(`Unknown card id: ${cardId}`);
  return { ...proto, uid: nextCardUid++ };
}

export function buildStandardDeck(rng, biasSuit = null) {
  const recipe = [
    'sol_spark', 'sol_lance', 'sol_lance', 'sol_brazier', 'sol_nova', 'sol_crown',
    'tid_mist', 'tid_mirror', 'tid_mirror', 'tid_breaker', 'tid_bastion', 'tid_maelstrom',
    'ver_dew', 'ver_thorn', 'ver_thorn', 'ver_canopy', 'ver_bloom',
    'ecl_glint', 'ecl_needle', 'ecl_crescent', 'ecl_zenith',
  ];
  if (biasSuit === 'solar') recipe.push('sol_lance', 'sol_nova');
  if (biasSuit === 'tide') recipe.push('tid_mirror', 'tid_bastion');
  if (biasSuit === 'eclipse') recipe.push('ecl_needle', 'ecl_zenith');
  return rng.shuffle(recipe.map((id) => instantiateCard(id)));
}
