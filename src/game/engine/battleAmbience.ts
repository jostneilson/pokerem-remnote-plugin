import type { CSSProperties } from 'react';

/** Scenes in `SCENES` (legacy saves may reference removed indices — use `normalizeBattleSceneIndex`). */
export const BATTLE_SCENE_COUNT = 19;
const LEGACY_BATTLE_SCENE_COUNT = 20;
/** Removed from rotation: was index 9 (Desert Dunes / bg_desert.png). */
const LEGACY_REMOVED_SCENE_INDEX = 9;

/** Map persisted index after removing Desert Dunes from the list. */
export function normalizeBattleSceneIndex(saved: unknown): number {
  const raw = typeof saved === 'number' && Number.isFinite(saved) ? Math.floor(saved) : 0;
  let idx = raw;
  if (idx < 0) idx = 0;
  if (idx >= LEGACY_BATTLE_SCENE_COUNT) idx = idx % LEGACY_BATTLE_SCENE_COUNT;
  if (idx === LEGACY_REMOVED_SCENE_INDEX) return 2;
  if (idx > LEGACY_REMOVED_SCENE_INDEX) idx -= 1;
  return ((idx % BATTLE_SCENE_COUNT) + BATTLE_SCENE_COUNT) % BATTLE_SCENE_COUNT;
}

export interface BattleAmbience {
  name: string;
  sidebarGradient: string;
  tabBarGradient: string;
  tabBarBorder: string;
  seamGradient: string;
  panelBorder: string;
  panelHeaderBg: string;
  accent: string;
  accentMuted: string;
  /** Inactive tabs, pill labels, subtle hints — harmonized to each field. */
  uiMuted: string;
  uiMutedHover: string;
  cardActiveBorder: string;
  cardActiveShadow: string;
  secondaryBtnBorder: string;
  kbdBorder: string;
  commandBarGradient: string;
  headerBarGradient: string;
  exploreBorder: string;
  exploreText: string;
  pillActiveBg: string;
  pillActiveText: string;
  pillRing: string;
  achievementBorder: string;
  achievementBg: string;
  currencyBarBorder: string;
  currencyBarBg: string;
  sceneFallbackGradient: string;
}

type AmbienceTokens = Omit<BattleAmbience, 'name'>;

interface BattleScene {
  name: string;
  file: string;
  ambience: BattleAmbience;
  wildOffsetX: number;
  wildOffsetY: number;
  playerOffsetX: number;
  playerOffsetY: number;
}

function scene(
  name: string,
  file: string,
  tokens: AmbienceTokens,
  offsets?: Partial<Pick<BattleScene, 'wildOffsetX' | 'wildOffsetY' | 'playerOffsetX' | 'playerOffsetY'>>,
): BattleScene {
  return {
    name,
    file,
    wildOffsetX: offsets?.wildOffsetX ?? 0,
    wildOffsetY: offsets?.wildOffsetY ?? 0,
    playerOffsetX: offsets?.playerOffsetX ?? 0,
    playerOffsetY: offsets?.playerOffsetY ?? 0,
    ambience: { name, ...tokens },
  };
}

const SCENES: BattleScene[] = [
  scene('Forest Trail', 'bg_forest.png', {
    sidebarGradient: 'linear-gradient(180deg, #16402e 0%, #0a2218 55%, #030c08 100%)',
    tabBarGradient: 'linear-gradient(180deg, #020806 0%, #0c2419 45%, #143729 100%)',
    tabBarBorder: 'rgba(45, 212, 191, 0.5)',
    seamGradient:
      'linear-gradient(90deg, transparent 0%, rgba(16, 185, 129, 0.12) 22%, rgba(52, 211, 153, 0.55) 50%, rgba(16, 185, 129, 0.12) 78%, transparent 100%)',
    panelBorder: 'rgba(52, 211, 153, 0.48)',
    panelHeaderBg:
      'linear-gradient(90deg, rgba(16, 185, 129, 0.28) 0%, rgba(5, 150, 105, 0.1) 50%, transparent 100%)',
    accent: '#5eead4',
    accentMuted: '#ccfbf1',
    uiMuted: '#5b8a7a',
    uiMutedHover: '#9dcfb8',
    cardActiveBorder: 'rgba(45, 212, 191, 0.65)',
    cardActiveShadow: 'rgba(94, 234, 212, 0.4)',
    secondaryBtnBorder: 'rgba(20, 184, 166, 0.48)',
    kbdBorder: 'rgba(13, 148, 136, 0.42)',
    commandBarGradient: 'linear-gradient(180deg, #1a4a36 0%, #071a12 100%)',
    headerBarGradient: 'linear-gradient(90deg, #065f46 0%, #022c22 48%, #0d4d3a 100%)',
    exploreBorder: 'rgba(74, 222, 128, 0.55)',
    exploreText: '#a7f3d0',
    pillActiveBg: 'rgba(16, 185, 129, 0.3)',
    pillActiveText: '#ecfdf5',
    pillRing: 'rgba(110, 231, 183, 0.58)',
    achievementBorder: 'rgba(52, 211, 153, 0.42)',
    achievementBg: 'linear-gradient(180deg, rgba(16, 185, 129, 0.16) 0%, rgba(6, 78, 59, 0.1) 100%)',
    currencyBarBorder: 'rgba(34, 197, 94, 0.45)',
    currencyBarBg: 'linear-gradient(90deg, rgba(6, 78, 59, 0.38) 0%, rgba(4, 47, 36, 0.22) 100%)',
    sceneFallbackGradient: 'linear-gradient(180deg,#34d399 0%,#059669 45%,#022c22 100%)',
  }),

  /** Uses `bg_plain.png` — long-grass art not shipped; plain field matches repo assets. */
  scene('Deep Long Grass', 'bg_plain.png', {
    sidebarGradient: 'linear-gradient(180deg, #2a5c18 0%, #142e0c 55%, #081808 100%)',
    tabBarGradient: 'linear-gradient(180deg, #050f03 0%, #1a3f0f 50%, #264f14 100%)',
    tabBarBorder: 'rgba(190, 242, 100, 0.48)',
    seamGradient:
      'linear-gradient(90deg, transparent 0%, rgba(163, 230, 53, 0.14) 20%, rgba(202, 240, 133, 0.52) 50%, rgba(163, 230, 53, 0.14) 80%, transparent 100%)',
    panelBorder: 'rgba(190, 242, 100, 0.45)',
    panelHeaderBg:
      'linear-gradient(90deg, rgba(132, 204, 22, 0.26) 0%, rgba(101, 163, 13, 0.1) 55%, transparent 100%)',
    accent: '#d9f99d',
    accentMuted: '#f7fee7',
    uiMuted: '#7a9258',
    uiMutedHover: '#c5e075',
    cardActiveBorder: 'rgba(217, 249, 157, 0.62)',
    cardActiveShadow: 'rgba(217, 249, 157, 0.35)',
    secondaryBtnBorder: 'rgba(163, 230, 53, 0.45)',
    kbdBorder: 'rgba(132, 204, 22, 0.42)',
    commandBarGradient: 'linear-gradient(180deg, #315f1a 0%, #0f1f08 100%)',
    headerBarGradient: 'linear-gradient(90deg, #4d7c0f 0%, #365314 50%, #3f6212 100%)',
    exploreBorder: 'rgba(202, 240, 133, 0.55)',
    exploreText: '#ecfccb',
    pillActiveBg: 'rgba(132, 204, 22, 0.28)',
    pillActiveText: '#fefce8',
    pillRing: 'rgba(217, 249, 157, 0.55)',
    achievementBorder: 'rgba(190, 242, 100, 0.4)',
    achievementBg: 'linear-gradient(180deg, rgba(101, 163, 13, 0.18) 0%, rgba(54, 83, 20, 0.1) 100%)',
    currencyBarBorder: 'rgba(163, 230, 53, 0.42)',
    currencyBarBg: 'linear-gradient(90deg, rgba(54, 83, 20, 0.35) 0%, rgba(26, 46, 5, 0.2) 100%)',
    sceneFallbackGradient: 'linear-gradient(180deg,#d9f99d 0%,#65a30d 50%,#1a2e05 100%)',
  }),

  /** Uses `bg_plain.png` — open grass art not shipped. */
  scene('Open Grassland', 'bg_plain.png', {
    sidebarGradient: 'linear-gradient(180deg, #1e5636 0%, #0e2e1c 55%, #05140c 100%)',
    tabBarGradient: 'linear-gradient(180deg, #030a06 0%, #123222 48%, #1a4530 100%)',
    tabBarBorder: 'rgba(74, 222, 128, 0.48)',
    seamGradient:
      'linear-gradient(90deg, transparent 0%, rgba(34, 197, 94, 0.12) 22%, rgba(110, 231, 183, 0.5) 50%, rgba(34, 197, 94, 0.12) 78%, transparent 100%)',
    panelBorder: 'rgba(74, 222, 128, 0.46)',
    panelHeaderBg:
      'linear-gradient(90deg, rgba(34, 197, 94, 0.24) 0%, rgba(22, 163, 74, 0.09) 50%, transparent 100%)',
    accent: '#86efac',
    accentMuted: '#dcfce7',
    uiMuted: '#5d8f6e',
    uiMutedHover: '#a3d9b5',
    cardActiveBorder: 'rgba(134, 239, 172, 0.62)',
    cardActiveShadow: 'rgba(134, 239, 172, 0.38)',
    secondaryBtnBorder: 'rgba(52, 211, 153, 0.44)',
    kbdBorder: 'rgba(16, 185, 129, 0.4)',
    commandBarGradient: 'linear-gradient(180deg, #225839 0%, #0a1f14 100%)',
    headerBarGradient: 'linear-gradient(90deg, #15803d 0%, #14532d 50%, #166534 100%)',
    exploreBorder: 'rgba(134, 239, 172, 0.52)',
    exploreText: '#bbf7d0',
    pillActiveBg: 'rgba(34, 197, 94, 0.28)',
    pillActiveText: '#f0fdf4',
    pillRing: 'rgba(110, 231, 183, 0.55)',
    achievementBorder: 'rgba(74, 222, 128, 0.4)',
    achievementBg: 'linear-gradient(180deg, rgba(22, 163, 74, 0.16) 0%, rgba(5, 46, 22, 0.1) 100%)',
    currencyBarBorder: 'rgba(52, 211, 153, 0.42)',
    currencyBarBg: 'linear-gradient(90deg, rgba(5, 46, 22, 0.36) 0%, rgba(2, 26, 12, 0.2) 100%)',
    sceneFallbackGradient: 'linear-gradient(180deg,#6ee7b7 0%,#22c55e 48%,#052e16 100%)',
  }),

  /** Uses `bg_forest.png` — grassy-place variant not shipped. */
  scene('Grassy Place', 'bg_forest.png', {
    sidebarGradient: 'linear-gradient(180deg, #35521e 0%, #1a2e10 55%, #0c1508 100%)',
    tabBarGradient: 'linear-gradient(180deg, #060c04 0%, #1f3512 50%, #2d4718 100%)',
    tabBarBorder: 'rgba(202, 240, 133, 0.46)',
    seamGradient:
      'linear-gradient(90deg, transparent 0%, rgba(190, 242, 100, 0.14) 21%, rgba(217, 249, 157, 0.5) 50%, rgba(190, 242, 100, 0.14) 79%, transparent 100%)',
    panelBorder: 'rgba(202, 240, 133, 0.44)',
    panelHeaderBg:
      'linear-gradient(90deg, rgba(190, 242, 100, 0.22) 0%, rgba(132, 204, 22, 0.1) 52%, transparent 100%)',
    accent: '#ecfccb',
    accentMuted: '#f7fee7',
    uiMuted: '#7f965c',
    uiMutedHover: '#c8e085',
    cardActiveBorder: 'rgba(236, 252, 203, 0.58)',
    cardActiveShadow: 'rgba(217, 249, 157, 0.32)',
    secondaryBtnBorder: 'rgba(190, 242, 100, 0.42)',
    kbdBorder: 'rgba(163, 230, 53, 0.4)',
    commandBarGradient: 'linear-gradient(180deg, #3d5c22 0%, #121c0b 100%)',
    headerBarGradient: 'linear-gradient(90deg, #65a30d 0%, #4d7c0f 50%, #3f6212 100%)',
    exploreBorder: 'rgba(217, 249, 157, 0.5)',
    exploreText: '#f7fee7',
    pillActiveBg: 'rgba(190, 242, 100, 0.26)',
    pillActiveText: '#ffffff',
    pillRing: 'rgba(236, 252, 203, 0.52)',
    achievementBorder: 'rgba(202, 240, 133, 0.38)',
    achievementBg: 'linear-gradient(180deg, rgba(132, 204, 22, 0.15) 0%, rgba(54, 83, 20, 0.09) 100%)',
    currencyBarBorder: 'rgba(190, 242, 100, 0.4)',
    currencyBarBg: 'linear-gradient(90deg, rgba(54, 83, 20, 0.34) 0%, rgba(28, 45, 10, 0.18) 100%)',
    sceneFallbackGradient: 'linear-gradient(180deg,#ecfccb 0%,#84cc16 50%,#1c2d0a 100%)',
  }),

  scene('Mountain Ridge', 'bg_mountain.png', {
    sidebarGradient: 'linear-gradient(180deg, #3d342f 0%, #1c1815 55%, #0c0a09 100%)',
    tabBarGradient: 'linear-gradient(180deg, #080706 0%, #241f1c 48%, #322b26 100%)',
    tabBarBorder: 'rgba(251, 191, 36, 0.48)',
    seamGradient:
      'linear-gradient(90deg, transparent 0%, rgba(245, 158, 11, 0.12) 22%, rgba(251, 191, 36, 0.52) 50%, rgba(245, 158, 11, 0.12) 78%, transparent 100%)',
    panelBorder: 'rgba(253, 186, 116, 0.42)',
    panelHeaderBg:
      'linear-gradient(90deg, rgba(251, 146, 60, 0.22) 0%, rgba(194, 65, 12, 0.1) 52%, transparent 100%)',
    accent: '#fdba74',
    accentMuted: '#ffedd5',
    uiMuted: '#9c8b78',
    uiMutedHover: '#d4b896',
    cardActiveBorder: 'rgba(253, 186, 116, 0.58)',
    cardActiveShadow: 'rgba(251, 191, 36, 0.35)',
    secondaryBtnBorder: 'rgba(245, 158, 11, 0.45)',
    kbdBorder: 'rgba(217, 119, 6, 0.42)',
    commandBarGradient: 'linear-gradient(180deg, #453831 0%, #151210 100%)',
    headerBarGradient: 'linear-gradient(90deg, #9a3412 0%, #431407 45%, #7c2d12 100%)',
    exploreBorder: 'rgba(251, 191, 36, 0.52)',
    exploreText: '#fed7aa',
    pillActiveBg: 'rgba(245, 158, 11, 0.24)',
    pillActiveText: '#fffbeb',
    pillRing: 'rgba(253, 186, 116, 0.52)',
    achievementBorder: 'rgba(251, 146, 60, 0.4)',
    achievementBg: 'linear-gradient(180deg, rgba(194, 65, 12, 0.14) 0%, rgba(67, 20, 7, 0.1) 100%)',
    currencyBarBorder: 'rgba(217, 119, 6, 0.42)',
    currencyBarBg: 'linear-gradient(90deg, rgba(67, 20, 7, 0.32) 0%, rgba(40, 12, 4, 0.18) 100%)',
    sceneFallbackGradient: 'linear-gradient(180deg,#fdba74 0%,#ea580c 42%,#292524 100%)',
  }),

  scene('Natural Cave', 'bg_cave.png', {
    sidebarGradient: 'linear-gradient(180deg, #2a3844 0%, #12181e 55%, #06090c 100%)',
    tabBarGradient: 'linear-gradient(180deg, #040506 0%, #1a222a 48%, #243038 100%)',
    tabBarBorder: 'rgba(125, 211, 252, 0.42)',
    seamGradient:
      'linear-gradient(90deg, transparent 0%, rgba(56, 189, 248, 0.1) 22%, rgba(125, 211, 252, 0.48) 50%, rgba(56, 189, 248, 0.1) 78%, transparent 100%)',
    panelBorder: 'rgba(148, 163, 184, 0.45)',
    panelHeaderBg:
      'linear-gradient(90deg, rgba(100, 116, 139, 0.28) 0%, rgba(51, 65, 85, 0.12) 52%, transparent 100%)',
    accent: '#bae6fd',
    accentMuted: '#e0f2fe',
    uiMuted: '#6b7d8f',
    uiMutedHover: '#a8bdd4',
    cardActiveBorder: 'rgba(186, 230, 253, 0.55)',
    cardActiveShadow: 'rgba(125, 211, 252, 0.32)',
    secondaryBtnBorder: 'rgba(56, 189, 248, 0.4)',
    kbdBorder: 'rgba(14, 165, 233, 0.38)',
    commandBarGradient: 'linear-gradient(180deg, #2f3f4d 0%, #0e1318 100%)',
    headerBarGradient: 'linear-gradient(90deg, #475569 0%, #1e293b 50%, #334155 100%)',
    exploreBorder: 'rgba(148, 163, 184, 0.5)',
    exploreText: '#cbd5e1',
    pillActiveBg: 'rgba(71, 85, 105, 0.32)',
    pillActiveText: '#f1f5f9',
    pillRing: 'rgba(186, 230, 253, 0.48)',
    achievementBorder: 'rgba(148, 163, 184, 0.38)',
    achievementBg: 'linear-gradient(180deg, rgba(71, 85, 105, 0.2) 0%, rgba(30, 41, 59, 0.12) 100%)',
    currencyBarBorder: 'rgba(100, 116, 139, 0.42)',
    currencyBarBg: 'linear-gradient(90deg, rgba(30, 41, 59, 0.4) 0%, rgba(15, 23, 42, 0.22) 100%)',
    sceneFallbackGradient: 'linear-gradient(180deg,#94a3b8 0%,#475569 50%,#0f172a 100%)',
  }),

  scene('Scalding Cave', 'bg_cave_scalding.png', {
    sidebarGradient: 'linear-gradient(180deg, #4a1c0e 0%, #220c06 55%, #0f0503 100%)',
    tabBarGradient: 'linear-gradient(180deg, #0a0402 0%, #2a1008 48%, #3d180e 100%)',
    tabBarBorder: 'rgba(248, 113, 113, 0.52)',
    seamGradient:
      'linear-gradient(90deg, transparent 0%, rgba(239, 68, 68, 0.14) 20%, rgba(251, 113, 133, 0.55) 50%, rgba(239, 68, 68, 0.14) 80%, transparent 100%)',
    panelBorder: 'rgba(252, 165, 165, 0.46)',
    panelHeaderBg:
      'linear-gradient(90deg, rgba(248, 113, 113, 0.26) 0%, rgba(185, 28, 28, 0.14) 50%, transparent 100%)',
    accent: '#fecaca',
    accentMuted: '#fff1f2',
    uiMuted: '#b07870',
    uiMutedHover: '#eab4ad',
    cardActiveBorder: 'rgba(254, 202, 202, 0.58)',
    cardActiveShadow: 'rgba(248, 113, 113, 0.38)',
    secondaryBtnBorder: 'rgba(239, 68, 68, 0.48)',
    kbdBorder: 'rgba(220, 38, 38, 0.45)',
    commandBarGradient: 'linear-gradient(180deg, #4f1f10 0%, #140805 100%)',
    headerBarGradient: 'linear-gradient(90deg, #b91c1c 0%, #450a0a 45%, #7f1d1d 100%)',
    exploreBorder: 'rgba(252, 165, 165, 0.52)',
    exploreText: '#fecdd3',
    pillActiveBg: 'rgba(239, 68, 68, 0.26)',
    pillActiveText: '#ffffff',
    pillRing: 'rgba(254, 202, 202, 0.52)',
    achievementBorder: 'rgba(248, 113, 113, 0.42)',
    achievementBg: 'linear-gradient(180deg, rgba(185, 28, 28, 0.18) 0%, rgba(69, 10, 10, 0.12) 100%)',
    currencyBarBorder: 'rgba(220, 38, 38, 0.45)',
    currencyBarBg: 'linear-gradient(90deg, rgba(69, 10, 10, 0.38) 0%, rgba(40, 6, 6, 0.2) 100%)',
    sceneFallbackGradient: 'linear-gradient(180deg,#fb923c 0%,#ef4444 40%,#450a0a 100%)',
  }),

  scene('Torma Cavern', 'bg_cave_torma.png', {
    sidebarGradient: 'linear-gradient(180deg, #2e2c4a 0%, #151424 55%, #08070f 100%)',
    tabBarGradient: 'linear-gradient(180deg, #05040a 0%, #1a1830 48%, #252244 100%)',
    tabBarBorder: 'rgba(165, 180, 252, 0.48)',
    seamGradient:
      'linear-gradient(90deg, transparent 0%, rgba(99, 102, 241, 0.14) 22%, rgba(165, 180, 252, 0.52) 50%, rgba(99, 102, 241, 0.14) 78%, transparent 100%)',
    panelBorder: 'rgba(199, 210, 254, 0.42)',
    panelHeaderBg:
      'linear-gradient(90deg, rgba(129, 140, 248, 0.26) 0%, rgba(79, 70, 229, 0.12) 52%, transparent 100%)',
    accent: '#c7d2fe',
    accentMuted: '#eef2ff',
    uiMuted: '#7c7a9e',
    uiMutedHover: '#b4b3dc',
    cardActiveBorder: 'rgba(199, 210, 254, 0.58)',
    cardActiveShadow: 'rgba(165, 180, 252, 0.35)',
    secondaryBtnBorder: 'rgba(129, 140, 248, 0.45)',
    kbdBorder: 'rgba(99, 102, 241, 0.42)',
    commandBarGradient: 'linear-gradient(180deg, #35325a 0%, #0c0b14 100%)',
    headerBarGradient: 'linear-gradient(90deg, #4f46e5 0%, #312e81 48%, #4338ca 100%)',
    exploreBorder: 'rgba(165, 180, 252, 0.5)',
    exploreText: '#e0e7ff',
    pillActiveBg: 'rgba(99, 102, 241, 0.28)',
    pillActiveText: '#ffffff',
    pillRing: 'rgba(199, 210, 254, 0.52)',
    achievementBorder: 'rgba(165, 180, 252, 0.4)',
    achievementBg: 'linear-gradient(180deg, rgba(79, 70, 229, 0.16) 0%, rgba(30, 27, 75, 0.12) 100%)',
    currencyBarBorder: 'rgba(129, 140, 248, 0.42)',
    currencyBarBg: 'linear-gradient(90deg, rgba(30, 27, 75, 0.38) 0%, rgba(15, 14, 40, 0.2) 100%)',
    sceneFallbackGradient: 'linear-gradient(180deg,#a5b4fc 0%,#6366f1 45%,#1e1b4b 100%)',
  }),

  scene('Frozen Field', 'bg_snow.png', {
    sidebarGradient: 'linear-gradient(180deg, #174058 0%, #0a1e2b 55%, #040d14 100%)',
    tabBarGradient: 'linear-gradient(180deg, #02080c 0%, #0f2a3c 48%, #1a3d52 100%)',
    tabBarBorder: 'rgba(56, 189, 248, 0.48)',
    seamGradient:
      'linear-gradient(90deg, transparent 0%, rgba(14, 165, 233, 0.12) 22%, rgba(125, 211, 252, 0.52) 50%, rgba(14, 165, 233, 0.12) 78%, transparent 100%)',
    panelBorder: 'rgba(125, 211, 252, 0.44)',
    panelHeaderBg:
      'linear-gradient(90deg, rgba(56, 189, 248, 0.22) 0%, rgba(3, 105, 161, 0.12) 52%, transparent 100%)',
    accent: '#7dd3fc',
    accentMuted: '#e0f2fe',
    uiMuted: '#5e8aa3',
    uiMutedHover: '#9ecce8',
    cardActiveBorder: 'rgba(125, 211, 252, 0.58)',
    cardActiveShadow: 'rgba(56, 189, 248, 0.38)',
    secondaryBtnBorder: 'rgba(14, 165, 233, 0.44)',
    kbdBorder: 'rgba(2, 132, 199, 0.4)',
    commandBarGradient: 'linear-gradient(180deg, #1c4a63 0%, #071018 100%)',
    headerBarGradient: 'linear-gradient(90deg, #0284c7 0%, #0c4a6e 50%, #0369a1 100%)',
    exploreBorder: 'rgba(125, 211, 252, 0.52)',
    exploreText: '#bae6fd',
    pillActiveBg: 'rgba(14, 165, 233, 0.26)',
    pillActiveText: '#f0f9ff',
    pillRing: 'rgba(125, 211, 252, 0.55)',
    achievementBorder: 'rgba(56, 189, 248, 0.4)',
    achievementBg: 'linear-gradient(180deg, rgba(3, 105, 161, 0.16) 0%, rgba(8, 47, 73, 0.12) 100%)',
    currencyBarBorder: 'rgba(14, 165, 233, 0.42)',
    currencyBarBg: 'linear-gradient(90deg, rgba(8, 47, 73, 0.36) 0%, rgba(4, 24, 38, 0.2) 100%)',
    sceneFallbackGradient: 'linear-gradient(180deg,#e0f2fe 0%,#38bdf8 45%,#082f49 100%)',
  }),

  scene('Sandy Flats', 'bg_sand.png', {
    sidebarGradient: 'linear-gradient(180deg, #4d3a22 0%, #281c10 55%, #120d08 100%)',
    tabBarGradient: 'linear-gradient(180deg, #080604 0%, #2e2214 48%, #3d2e1a 100%)',
    tabBarBorder: 'rgba(250, 204, 21, 0.46)',
    seamGradient:
      'linear-gradient(90deg, transparent 0%, rgba(234, 179, 8, 0.14) 22%, rgba(253, 224, 71, 0.5) 50%, rgba(234, 179, 8, 0.14) 78%, transparent 100%)',
    panelBorder: 'rgba(253, 224, 71, 0.4)',
    panelHeaderBg:
      'linear-gradient(90deg, rgba(250, 204, 21, 0.2) 0%, rgba(180, 83, 9, 0.12) 52%, transparent 100%)',
    accent: '#fde047',
    accentMuted: '#fef9c3',
    uiMuted: '#9a8a68',
    uiMutedHover: '#d4c48a',
    cardActiveBorder: 'rgba(253, 224, 71, 0.55)',
    cardActiveShadow: 'rgba(250, 204, 21, 0.32)',
    secondaryBtnBorder: 'rgba(234, 179, 8, 0.44)',
    kbdBorder: 'rgba(202, 138, 4, 0.4)',
    commandBarGradient: 'linear-gradient(180deg, #524026 0%, #16100a 100%)',
    headerBarGradient: 'linear-gradient(90deg, #a16207 0%, #422006 45%, #713f12 100%)',
    exploreBorder: 'rgba(253, 224, 71, 0.48)',
    exploreText: '#fef3c7',
    pillActiveBg: 'rgba(234, 179, 8, 0.24)',
    pillActiveText: '#fffbeb',
    pillRing: 'rgba(253, 224, 71, 0.5)',
    achievementBorder: 'rgba(250, 204, 21, 0.38)',
    achievementBg: 'linear-gradient(180deg, rgba(180, 83, 9, 0.15) 0%, rgba(66, 32, 6, 0.1) 100%)',
    currencyBarBorder: 'rgba(202, 138, 4, 0.42)',
    currencyBarBg: 'linear-gradient(90deg, rgba(66, 32, 6, 0.34) 0%, rgba(38, 18, 4, 0.18) 100%)',
    sceneFallbackGradient: 'linear-gradient(180deg,#facc15 0%,#ca8a04 50%,#422006 100%)',
  }),

  scene('Pond Shore', 'bg_pond.png', {
    sidebarGradient: 'linear-gradient(180deg, #0c3a4f 0%, #051a24 55%, #020d12 100%)',
    tabBarGradient: 'linear-gradient(180deg, #010608 0%, #082636 48%, #0e3a4f 100%)',
    tabBarBorder: 'rgba(14, 165, 233, 0.48)',
    seamGradient:
      'linear-gradient(90deg, transparent 0%, rgba(2, 132, 199, 0.12) 22%, rgba(56, 189, 248, 0.52) 50%, rgba(2, 132, 199, 0.12) 78%, transparent 100%)',
    panelBorder: 'rgba(56, 189, 248, 0.44)',
    panelHeaderBg:
      'linear-gradient(90deg, rgba(14, 165, 233, 0.24) 0%, rgba(3, 105, 161, 0.12) 52%, transparent 100%)',
    accent: '#38bdf8',
    accentMuted: '#e0f2fe',
    uiMuted: '#4f7d95',
    uiMutedHover: '#8ec4e0',
    cardActiveBorder: 'rgba(125, 211, 252, 0.55)',
    cardActiveShadow: 'rgba(56, 189, 248, 0.35)',
    secondaryBtnBorder: 'rgba(2, 132, 199, 0.44)',
    kbdBorder: 'rgba(3, 105, 161, 0.4)',
    commandBarGradient: 'linear-gradient(180deg, #104b63 0%, #040f15 100%)',
    headerBarGradient: 'linear-gradient(90deg, #0369a1 0%, #082f49 48%, #0c4a6e 100%)',
    exploreBorder: 'rgba(56, 189, 248, 0.5)',
    exploreText: '#bae6fd',
    pillActiveBg: 'rgba(2, 132, 199, 0.28)',
    pillActiveText: '#f0f9ff',
    pillRing: 'rgba(125, 211, 252, 0.52)',
    achievementBorder: 'rgba(14, 165, 233, 0.4)',
    achievementBg: 'linear-gradient(180deg, rgba(3, 105, 161, 0.16) 0%, rgba(8, 47, 73, 0.12) 100%)',
    currencyBarBorder: 'rgba(2, 132, 199, 0.42)',
    currencyBarBg: 'linear-gradient(90deg, rgba(8, 47, 73, 0.38) 0%, rgba(4, 24, 38, 0.2) 100%)',
    sceneFallbackGradient: 'linear-gradient(180deg,#38bdf8 0%,#0284c7 45%,#0c1929 100%)',
  }),

  scene('Water Surface', 'bg_water.png', {
    sidebarGradient: 'linear-gradient(180deg, #083c4a 0%, #031820 55%, #010b0e 100%)',
    tabBarGradient: 'linear-gradient(180deg, #010506 0%, #062830 48%, #0a3c48 100%)',
    tabBarBorder: 'rgba(45, 212, 191, 0.46)',
    seamGradient:
      'linear-gradient(90deg, transparent 0%, rgba(13, 148, 136, 0.12) 22%, rgba(45, 212, 191, 0.5) 50%, rgba(13, 148, 136, 0.12) 78%, transparent 100%)',
    panelBorder: 'rgba(94, 234, 212, 0.42)',
    panelHeaderBg:
      'linear-gradient(90deg, rgba(45, 212, 191, 0.22) 0%, rgba(15, 118, 110, 0.12) 52%, transparent 100%)',
    accent: '#5eead4',
    accentMuted: '#ccfbf1',
    uiMuted: '#4d8f88',
    uiMutedHover: '#8fd4cc',
    cardActiveBorder: 'rgba(94, 234, 212, 0.55)',
    cardActiveShadow: 'rgba(45, 212, 191, 0.34)',
    secondaryBtnBorder: 'rgba(20, 184, 166, 0.44)',
    kbdBorder: 'rgba(13, 148, 136, 0.4)',
    commandBarGradient: 'linear-gradient(180deg, #0a4f5c 0%, #020e10 100%)',
    headerBarGradient: 'linear-gradient(90deg, #0f766e 0%, #042f2e 48%, #134e4a 100%)',
    exploreBorder: 'rgba(45, 212, 191, 0.48)',
    exploreText: '#99f6e4',
    pillActiveBg: 'rgba(13, 148, 136, 0.28)',
    pillActiveText: '#f0fdfa',
    pillRing: 'rgba(94, 234, 212, 0.5)',
    achievementBorder: 'rgba(45, 212, 191, 0.38)',
    achievementBg: 'linear-gradient(180deg, rgba(15, 118, 110, 0.16) 0%, rgba(4, 47, 46, 0.12) 100%)',
    currencyBarBorder: 'rgba(20, 184, 166, 0.4)',
    currencyBarBg: 'linear-gradient(90deg, rgba(4, 47, 46, 0.36) 0%, rgba(2, 26, 25, 0.2) 100%)',
    sceneFallbackGradient: 'linear-gradient(180deg,#2dd4bf 0%,#0d9488 48%,#042f2e 100%)',
  }),

  scene('Electric Zone', 'bg_electric.png', {
    sidebarGradient: 'linear-gradient(180deg, #3d3514 0%, #1c1808 55%, #0c0a04 100%)',
    tabBarGradient: 'linear-gradient(180deg, #050402 0%, #252010 48%, #342e18 100%)',
    tabBarBorder: 'rgba(250, 204, 21, 0.5)',
    seamGradient:
      'linear-gradient(90deg, transparent 0%, rgba(234, 179, 8, 0.16) 20%, rgba(253, 224, 71, 0.55) 50%, rgba(234, 179, 8, 0.16) 80%, transparent 100%)',
    panelBorder: 'rgba(253, 224, 71, 0.44)',
    panelHeaderBg:
      'linear-gradient(90deg, rgba(250, 204, 21, 0.22) 0%, rgba(161, 98, 7, 0.12) 52%, transparent 100%)',
    accent: '#fef08a',
    accentMuted: '#fefce8',
    uiMuted: '#9d9460',
    uiMutedHover: '#d9cf8a',
    cardActiveBorder: 'rgba(253, 224, 71, 0.58)',
    cardActiveShadow: 'rgba(250, 204, 21, 0.36)',
    secondaryBtnBorder: 'rgba(234, 179, 8, 0.46)',
    kbdBorder: 'rgba(202, 138, 4, 0.42)',
    commandBarGradient: 'linear-gradient(180deg, #453c18 0%, #121005 100%)',
    headerBarGradient: 'linear-gradient(90deg, #ca8a04 0%, #422006 42%, #a16207 100%)',
    exploreBorder: 'rgba(253, 224, 71, 0.5)',
    exploreText: '#fef9c3',
    pillActiveBg: 'rgba(234, 179, 8, 0.26)',
    pillActiveText: '#ffffff',
    pillRing: 'rgba(253, 224, 71, 0.52)',
    achievementBorder: 'rgba(250, 204, 21, 0.4)',
    achievementBg: 'linear-gradient(180deg, rgba(161, 98, 7, 0.16) 0%, rgba(66, 32, 6, 0.1) 100%)',
    currencyBarBorder: 'rgba(202, 138, 4, 0.44)',
    currencyBarBg: 'linear-gradient(90deg, rgba(66, 32, 6, 0.34) 0%, rgba(38, 18, 4, 0.18) 100%)',
    sceneFallbackGradient: 'linear-gradient(180deg,#fde047 0%,#eab308 40%,#422006 100%)',
  }),

  scene('Misty Clearing', 'bg_misty.png', {
    sidebarGradient: 'linear-gradient(180deg, #243548 0%, #111a24 55%, #060a0f 100%)',
    tabBarGradient: 'linear-gradient(180deg, #030508 0%, #162536 48%, #1f3548 100%)',
    tabBarBorder: 'rgba(167, 139, 250, 0.42)',
    seamGradient:
      'linear-gradient(90deg, transparent 0%, rgba(124, 58, 237, 0.1) 22%, rgba(196, 181, 253, 0.48) 50%, rgba(124, 58, 237, 0.1) 78%, transparent 100%)',
    panelBorder: 'rgba(196, 181, 253, 0.4)',
    panelHeaderBg:
      'linear-gradient(90deg, rgba(167, 139, 250, 0.22) 0%, rgba(91, 33, 182, 0.1) 52%, transparent 100%)',
    accent: '#ddd6fe',
    accentMuted: '#f5f3ff',
    uiMuted: '#7a7399',
    uiMutedHover: '#b8b0d9',
    cardActiveBorder: 'rgba(221, 214, 254, 0.55)',
    cardActiveShadow: 'rgba(167, 139, 250, 0.32)',
    secondaryBtnBorder: 'rgba(139, 92, 246, 0.42)',
    kbdBorder: 'rgba(124, 58, 237, 0.38)',
    commandBarGradient: 'linear-gradient(180deg, #2a3d52 0%, #0a1018 100%)',
    headerBarGradient: 'linear-gradient(90deg, #6d28d9 0%, #1e1b4b 48%, #5b21b6 100%)',
    exploreBorder: 'rgba(196, 181, 253, 0.48)',
    exploreText: '#ede9fe',
    pillActiveBg: 'rgba(124, 58, 237, 0.24)',
    pillActiveText: '#ffffff',
    pillRing: 'rgba(196, 181, 253, 0.5)',
    achievementBorder: 'rgba(167, 139, 250, 0.36)',
    achievementBg: 'linear-gradient(180deg, rgba(91, 33, 182, 0.14) 0%, rgba(30, 27, 75, 0.1) 100%)',
    currencyBarBorder: 'rgba(139, 92, 246, 0.4)',
    currencyBarBg: 'linear-gradient(90deg, rgba(30, 27, 75, 0.36) 0%, rgba(15, 14, 40, 0.2) 100%)',
    sceneFallbackGradient: 'linear-gradient(180deg,#c4b5fd 0%,#8b5cf6 45%,#1e1b4b 100%)',
  }),

  /** Uses `bg_building.png` — indoor arena art not shipped. */
  scene('Indoor Arena', 'bg_building.png', {
    sidebarGradient: 'linear-gradient(180deg, #3f2e28 0%, #1c1411 55%, #0c0908 100%)',
    tabBarGradient: 'linear-gradient(180deg, #060403 0%, #241a16 48%, #32241f 100%)',
    tabBarBorder: 'rgba(249, 115, 22, 0.46)',
    seamGradient:
      'linear-gradient(90deg, transparent 0%, rgba(234, 88, 12, 0.12) 22%, rgba(251, 146, 60, 0.5) 50%, rgba(234, 88, 12, 0.12) 78%, transparent 100%)',
    panelBorder: 'rgba(253, 186, 116, 0.42)',
    panelHeaderBg:
      'linear-gradient(90deg, rgba(251, 146, 60, 0.22) 0%, rgba(194, 65, 12, 0.12) 52%, transparent 100%)',
    accent: '#fdba74',
    accentMuted: '#fff7ed',
    uiMuted: '#9c8578',
    uiMutedHover: '#d4b59e',
    cardActiveBorder: 'rgba(253, 186, 116, 0.56)',
    cardActiveShadow: 'rgba(249, 115, 22, 0.32)',
    secondaryBtnBorder: 'rgba(234, 88, 12, 0.44)',
    kbdBorder: 'rgba(194, 65, 12, 0.4)',
    commandBarGradient: 'linear-gradient(180deg, #45332c 0%, #120d0b 100%)',
    headerBarGradient: 'linear-gradient(90deg, #c2410c 0%, #431407 45%, #9a3412 100%)',
    exploreBorder: 'rgba(251, 146, 60, 0.5)',
    exploreText: '#fed7aa',
    pillActiveBg: 'rgba(234, 88, 12, 0.24)',
    pillActiveText: '#ffffff',
    pillRing: 'rgba(253, 186, 116, 0.5)',
    achievementBorder: 'rgba(249, 115, 22, 0.38)',
    achievementBg: 'linear-gradient(180deg, rgba(194, 65, 12, 0.14) 0%, rgba(67, 20, 7, 0.1) 100%)',
    currencyBarBorder: 'rgba(234, 88, 12, 0.4)',
    currencyBarBg: 'linear-gradient(90deg, rgba(67, 20, 7, 0.32) 0%, rgba(40, 12, 4, 0.18) 100%)',
    sceneFallbackGradient: 'linear-gradient(180deg,#fb923c 0%,#c2410c 50%,#292524 100%)',
  }),

  scene('Building Grounds', 'bg_building.png', {
    sidebarGradient: 'linear-gradient(180deg, #35302d 0%, #181615 55%, #0a0908 100%)',
    tabBarGradient: 'linear-gradient(180deg, #050404 0%, #1f1c1a 48%, #2a2624 100%)',
    tabBarBorder: 'rgba(251, 113, 133, 0.42)',
    seamGradient:
      'linear-gradient(90deg, transparent 0%, rgba(225, 29, 72, 0.1) 22%, rgba(253, 164, 175, 0.45) 50%, rgba(225, 29, 72, 0.1) 78%, transparent 100%)',
    panelBorder: 'rgba(253, 164, 175, 0.4)',
    panelHeaderBg:
      'linear-gradient(90deg, rgba(251, 113, 133, 0.2) 0%, rgba(159, 18, 57, 0.12) 52%, transparent 100%)',
    accent: '#fda4af',
    accentMuted: '#fff1f2',
    uiMuted: '#9a7d82',
    uiMutedHover: '#d4a8b0',
    cardActiveBorder: 'rgba(253, 164, 175, 0.54)',
    cardActiveShadow: 'rgba(251, 113, 133, 0.3)',
    secondaryBtnBorder: 'rgba(244, 63, 94, 0.42)',
    kbdBorder: 'rgba(225, 29, 72, 0.38)',
    commandBarGradient: 'linear-gradient(180deg, #3a3432 0%, #0f0e0d 100%)',
    headerBarGradient: 'linear-gradient(90deg, #be123c 0%, #1c1917 48%, #9f1239 100%)',
    exploreBorder: 'rgba(253, 164, 175, 0.46)',
    exploreText: '#fecdd3',
    pillActiveBg: 'rgba(225, 29, 72, 0.22)',
    pillActiveText: '#ffffff',
    pillRing: 'rgba(253, 164, 175, 0.48)',
    achievementBorder: 'rgba(251, 113, 133, 0.36)',
    achievementBg: 'linear-gradient(180deg, rgba(159, 18, 57, 0.14) 0%, rgba(40, 10, 16, 0.1) 100%)',
    currencyBarBorder: 'rgba(244, 63, 94, 0.38)',
    currencyBarBg: 'linear-gradient(90deg, rgba(40, 10, 16, 0.34) 0%, rgba(20, 5, 8, 0.18) 100%)',
    sceneFallbackGradient: 'linear-gradient(180deg,#fda4af 0%,#e11d48 42%,#1c1917 100%)',
  }),

  scene('Psychic Realm', 'bg_psychic.png', {
    sidebarGradient: 'linear-gradient(180deg, #3f1860 0%, #1c0a2c 55%, #0c0514 100%)',
    tabBarGradient: 'linear-gradient(180deg, #050208 0%, #240e38 48%, #34154e 100%)',
    tabBarBorder: 'rgba(232, 121, 249, 0.48)',
    seamGradient:
      'linear-gradient(90deg, transparent 0%, rgba(192, 38, 211, 0.14) 22%, rgba(240, 171, 252, 0.52) 50%, rgba(192, 38, 211, 0.14) 78%, transparent 100%)',
    panelBorder: 'rgba(240, 171, 252, 0.42)',
    panelHeaderBg:
      'linear-gradient(90deg, rgba(217, 70, 239, 0.24) 0%, rgba(134, 25, 143, 0.12) 52%, transparent 100%)',
    accent: '#f0abfc',
    accentMuted: '#fdf4ff',
    uiMuted: '#9d6fa8',
    uiMutedHover: '#d8a8e3',
    cardActiveBorder: 'rgba(240, 171, 252, 0.56)',
    cardActiveShadow: 'rgba(232, 121, 249, 0.34)',
    secondaryBtnBorder: 'rgba(192, 38, 211, 0.44)',
    kbdBorder: 'rgba(168, 85, 247, 0.4)',
    commandBarGradient: 'linear-gradient(180deg, #4a1c6e 0%, #100818 100%)',
    headerBarGradient: 'linear-gradient(90deg, #a21caf 0%, #3b0764 45%, #86198f 100%)',
    exploreBorder: 'rgba(240, 171, 252, 0.48)',
    exploreText: '#fae8ff',
    pillActiveBg: 'rgba(192, 38, 211, 0.26)',
    pillActiveText: '#ffffff',
    pillRing: 'rgba(240, 171, 252, 0.5)',
    achievementBorder: 'rgba(232, 121, 249, 0.38)',
    achievementBg: 'linear-gradient(180deg, rgba(134, 25, 143, 0.16) 0%, rgba(59, 7, 100, 0.12) 100%)',
    currencyBarBorder: 'rgba(192, 38, 211, 0.4)',
    currencyBarBg: 'linear-gradient(90deg, rgba(59, 7, 100, 0.36) 0%, rgba(30, 4, 50, 0.2) 100%)',
    sceneFallbackGradient: 'linear-gradient(180deg,#e879f9 0%,#c026d3 45%,#3b0764 100%)',
  }),

  scene('Trick Stage', 'bg_trick.png', {
    sidebarGradient: 'linear-gradient(180deg, #3f2258 0%, #1c0f28 55%, #0c0612 100%)',
    tabBarGradient: 'linear-gradient(180deg, #050308 0%, #241433 48%, #341c48 100%)',
    tabBarBorder: 'rgba(244, 114, 182, 0.46)',
    seamGradient:
      'linear-gradient(90deg, transparent 0%, rgba(219, 39, 119, 0.12) 22%, rgba(249, 168, 212, 0.5) 50%, rgba(219, 39, 119, 0.12) 78%, transparent 100%)',
    panelBorder: 'rgba(249, 168, 212, 0.42)',
    panelHeaderBg:
      'linear-gradient(90deg, rgba(244, 114, 182, 0.22) 0%, rgba(190, 24, 93, 0.12) 52%, transparent 100%)',
    accent: '#fbcfe8',
    accentMuted: '#fdf2f8',
    uiMuted: '#9f7594',
    uiMutedHover: '#dcb0cc',
    cardActiveBorder: 'rgba(249, 168, 212, 0.55)',
    cardActiveShadow: 'rgba(244, 114, 182, 0.32)',
    secondaryBtnBorder: 'rgba(236, 72, 153, 0.42)',
    kbdBorder: 'rgba(219, 39, 119, 0.38)',
    commandBarGradient: 'linear-gradient(180deg, #4a2862 0%, #100a16 100%)',
    headerBarGradient: 'linear-gradient(90deg, #db2777 0%, #500724 45%, #be185d 100%)',
    exploreBorder: 'rgba(249, 168, 212, 0.48)',
    exploreText: '#fce7f3',
    pillActiveBg: 'rgba(219, 39, 119, 0.24)',
    pillActiveText: '#ffffff',
    pillRing: 'rgba(249, 168, 212, 0.5)',
    achievementBorder: 'rgba(244, 114, 182, 0.36)',
    achievementBg: 'linear-gradient(180deg, rgba(190, 24, 93, 0.14) 0%, rgba(80, 7, 36, 0.1) 100%)',
    currencyBarBorder: 'rgba(236, 72, 153, 0.38)',
    currencyBarBg: 'linear-gradient(90deg, rgba(80, 7, 36, 0.34) 0%, rgba(45, 4, 20, 0.18) 100%)',
    sceneFallbackGradient: 'linear-gradient(180deg,#f9a8d4 0%,#ec4899 45%,#500724 100%)',
  }),

  scene('Spooky Woods', 'bg_spooky.png', {
    sidebarGradient: 'linear-gradient(180deg, #1a2b26 0%, #0c1512 55%, #050a09 100%)',
    tabBarGradient: 'linear-gradient(180deg, #020403 0%, #0f1c18 48%, #162823 100%)',
    tabBarBorder: 'rgba(45, 212, 191, 0.36)',
    seamGradient:
      'linear-gradient(90deg, transparent 0%, rgba(16, 185, 129, 0.1) 22%, rgba(110, 231, 183, 0.38) 50%, rgba(16, 185, 129, 0.1) 78%, transparent 100%)',
    panelBorder: 'rgba(110, 231, 183, 0.38)',
    panelHeaderBg:
      'linear-gradient(90deg, rgba(45, 212, 191, 0.16) 0%, rgba(19, 78, 74, 0.12) 52%, transparent 100%)',
    accent: '#6ee7b7',
    accentMuted: '#d1fae5',
    uiMuted: '#4d7068',
    uiMutedHover: '#8cbfb0',
    cardActiveBorder: 'rgba(110, 231, 183, 0.5)',
    cardActiveShadow: 'rgba(45, 212, 191, 0.28)',
    secondaryBtnBorder: 'rgba(20, 184, 166, 0.38)',
    kbdBorder: 'rgba(15, 118, 110, 0.35)',
    commandBarGradient: 'linear-gradient(180deg, #1e332d 0%, #060c0a 100%)',
    headerBarGradient: 'linear-gradient(90deg, #0f766e 0%, #022c22 48%, #134e4a 100%)',
    exploreBorder: 'rgba(110, 231, 183, 0.42)',
    exploreText: '#a7f3d0',
    pillActiveBg: 'rgba(19, 78, 74, 0.28)',
    pillActiveText: '#ecfdf5',
    pillRing: 'rgba(110, 231, 183, 0.45)',
    achievementBorder: 'rgba(45, 212, 191, 0.32)',
    achievementBg: 'linear-gradient(180deg, rgba(19, 78, 74, 0.14) 0%, rgba(4, 47, 46, 0.1) 100%)',
    currencyBarBorder: 'rgba(20, 184, 166, 0.34)',
    currencyBarBg: 'linear-gradient(90deg, rgba(4, 47, 46, 0.32) 0%, rgba(2, 26, 25, 0.18) 100%)',
    sceneFallbackGradient: 'linear-gradient(180deg,#6ee7b7 0%,#0f766e 40%,#020617 100%)',
  }),
];

export function battleScene(index: number): BattleScene {
  const i = ((index % BATTLE_SCENE_COUNT) + BATTLE_SCENE_COUNT) % BATTLE_SCENE_COUNT;
  return SCENES[i];
}

export function getBattleAmbience(index: number): BattleAmbience {
  return battleScene(index).ambience;
}

/** Per-scene sprite nudges (px); combine with global % anchors in BattleReviewSurface. */
export function getBattleSpriteOffsets(index: number): {
  wildX: number;
  wildY: number;
  playerX: number;
  playerY: number;
} {
  const s = battleScene(index);
  return {
    wildX: s.wildOffsetX,
    wildY: s.wildOffsetY,
    playerX: s.playerOffsetX,
    playerY: s.playerOffsetY,
  };
}

export function battleAmbienceCssVars(amb: BattleAmbience): CSSProperties {
  return {
    '--pkr-sidebar-gradient': amb.sidebarGradient,
    '--pkr-tab-bar-gradient': amb.tabBarGradient,
    '--pkr-tab-bar-border': amb.tabBarBorder,
    '--pkr-seam-gradient': amb.seamGradient,
    '--pkr-panel-border': amb.panelBorder,
    '--pkr-panel-header-bg': amb.panelHeaderBg,
    '--pkr-accent': amb.accent,
    '--pkr-accent-muted': amb.accentMuted,
    '--pkr-ui-muted': amb.uiMuted,
    '--pkr-ui-muted-hover': amb.uiMutedHover,
    '--pkr-card-active-border': amb.cardActiveBorder,
    '--pkr-card-active-shadow': amb.cardActiveShadow,
    '--pkr-secondary-btn-border': amb.secondaryBtnBorder,
    '--pkr-kbd-border': amb.kbdBorder,
    '--pkr-command-bar-gradient': amb.commandBarGradient,
    '--pkr-header-bar-gradient': amb.headerBarGradient,
    '--pkr-explore-border': amb.exploreBorder,
    '--pkr-explore-text': amb.exploreText,
    '--pkr-pill-active-bg': amb.pillActiveBg,
    '--pkr-pill-active-text': amb.pillActiveText,
    '--pkr-pill-ring': amb.pillRing,
    '--pkr-achievement-border': amb.achievementBorder,
    '--pkr-achievement-bg': amb.achievementBg,
    '--pkr-currency-bar-border': amb.currencyBarBorder,
    '--pkr-currency-bar-bg': amb.currencyBarBg,
    transition: 'background 0.45s ease, border-color 0.45s ease, color 0.35s ease',
  } as CSSProperties;
}

function base(rootURL: string | undefined): string {
  return (rootURL ?? '').replace(/\/?$/, '/');
}

export function battleSceneImageUrl(rootURL: string | undefined, index: number): string {
  return `${base(rootURL)}assets/battle_scenes/team_aqua/${battleScene(index).file}`;
}

export function battleSceneBackgroundStyle(rootURL: string | undefined, index: number): {
  backgroundImage: string;
  backgroundSize: string;
  backgroundPosition: string;
  backgroundRepeat: 'no-repeat';
} {
  return {
    backgroundImage: `url(${battleSceneImageUrl(rootURL, index)})`,
    backgroundSize: '100% 100%',
    backgroundPosition: 'center center',
    backgroundRepeat: 'no-repeat',
  };
}
