import {
  ESSENCES,
  FLOORS,
  generateAuctionListings,
  generateRandomMercenaries,
  ITEMS,
  MONSTERS,
  RACES,
  SYNERGY_BONUSES,
} from '../data/loreData';
import {
  BARBARIAN_BATTLE_CRIES,
  DAILY_LORE_NEWS,
  EXPLORATION_WHISPERS,
  PARTY_BANTER,
  pickRandom,
  ROLE_BANTER,
} from '../data/loreFlavor';
import {
  DroppedEssence,
  DroppedLoot,
  Essence,
  EssenceKnowledgeLevel,
  EssenceSynergyTag,
  FloatingPopup,
  FloorId,
  GameMode,
  GameState,
  InventoryItem,
  LogEntry,
  MonsterInstance,
  PlayerState,
  RaceId,
  TileType,
} from '../types/game';
import {
  generateProceduralFloor,
  getRiftTypeForFloor,
  spawnMonsterInstance,
} from './mapGen';
import { SfxType } from './sound';

const GRID_W = 15;
const GRID_H = 11;

let uidCounter = 1;
export function nextUid(prefix: string): string {
  uidCounter += 1;
  return `${prefix}_${Date.now()}_${uidCounter}`;
}

const KNOWLEDGE_RANK: Record<EssenceKnowledgeLevel, number> = {
  unknown: 0,
  rumor: 1,
  guild: 2,
  verified: 3,
};

export function upgradeEssenceKnowledge(
  current: Record<string, EssenceKnowledgeLevel>,
  essenceId: string,
  target: EssenceKnowledgeLevel
): Record<string, EssenceKnowledgeLevel> {
  const existing = current[essenceId] ?? 'unknown';
  if (KNOWLEDGE_RANK[target] <= KNOWLEDGE_RANK[existing]) {
    return current;
  }
  return { ...current, [essenceId]: target };
}

export interface ActiveSynergy {
  tag: EssenceSynergyTag;
  name: string;
  bonusText: string;
  color: string;
  count: number;
}

export function getActiveSynergies(essences: Essence[]): ActiveSynergy[] {
  const counts: Partial<Record<EssenceSynergyTag, number>> = {};
  for (const ess of essences) {
    if (!ess.synergyTag) continue;
    counts[ess.synergyTag] = (counts[ess.synergyTag] ?? 0) + 1;
  }
  const active: ActiveSynergy[] = [];
  for (const tag of Object.keys(counts) as EssenceSynergyTag[]) {
    const count = counts[tag] ?? 0;
    if (count >= 2) {
      const info = SYNERGY_BONUSES[tag];
      active.push({ ...info, count });
    }
  }
  return active;
}

export function getEffectiveStats(player: PlayerState) {
  let strength = player.baseStats.physique.strength;
  let flexibility = player.baseStats.physique.flexibility;
  let vision = player.baseStats.physique.vision;
  let manaPool = player.baseStats.spirit.manaPool;
  let obsession = player.baseStats.spirit.obsession;
  let maxHpBonus = 0;
  let essDefenseBonus = 0;
  let autoRegenHp = 0;
  let stoneBonusPct = 0;
  let critBonusPct = 0;
  let extraThirstDrain = 0;
  let noPotionHeal = false;
  let rangedVulnPct = 0;
  let curseVulnBonus = 0;
  let extraManaCost = 0;
  let armorWearExtra = 0;

  for (const ess of player.essences) {
    strength += ess.statBonus.strength ?? 0;
    flexibility += ess.statBonus.flexibility ?? 0;
    vision += ess.statBonus.vision ?? 0;
    manaPool += ess.statBonus.manaPool ?? 0;
    obsession += ess.statBonus.obsession ?? 0;
    maxHpBonus += ess.statBonus.maxHp ?? 0;
    essDefenseBonus += ess.statBonus.defense ?? 0;
    autoRegenHp += ess.autoRegenHp ?? 0;
    stoneBonusPct += ess.stoneBonusPct ?? 0;
    extraThirstDrain += ess.extraThirstDrain ?? 0;
    rangedVulnPct += ess.rangedVulnPct ?? 0;
    curseVulnBonus += ess.curseVulnBonus ?? 0;
    extraManaCost += ess.extraManaCost ?? 0;
    armorWearExtra += ess.armorWearExtra ?? 0;
    if (ess.noPotionHeal) noPotionHeal = true;
  }

  const activeSynergies = getActiveSynergies(player.essences);
  for (const syn of activeSynergies) {
    if (syn.tag === 'iron') {
      essDefenseBonus += 4;
      maxHpBonus += 25;
    } else if (syn.tag === 'shadow') {
      vision += 3;
      flexibility += 4;
      critBonusPct += 12;
    } else if (syn.tag === 'blood') {
      autoRegenHp += 4;
      strength += 4;
    } else if (syn.tag === 'arcane') {
      manaPool += 20;
      obsession += 4;
    } else if (syn.tag === 'beast') {
      strength += 5;
      flexibility += 3;
    }
  }

  let racialDefBonus = 0;
  if (player.racialBuffTurns > 0) {
    switch (player.raceId) {
      case 'barbarian':
        strength += 4;
        racialDefBonus = 3;
        break;
      case 'human':
        strength += 3;
        flexibility += 3;
        racialDefBonus = 2;
        break;
      case 'beastman':
        flexibility += 6;
        strength += 3;
        break;
      case 'dwarf':
        strength += 2;
        racialDefBonus = 6;
        break;
      case 'elf':
        flexibility += 4;
        vision += 4;
        break;
      case 'dragonkin':
        strength += 5;
        racialDefBonus = 5;
        break;
    }
  }

  const weapon = ITEMS[player.equippedWeaponId];
  const armor = ITEMS[player.equippedArmorId];
  const shield = player.equippedShieldId ? ITEMS[player.equippedShieldId] : null;
  const numItem = player.equippedNumberItemId ? ITEMS[player.equippedNumberItemId] : null;

  const weaponAtk = (weapon?.attackBonus ?? 0) + (numItem?.attackBonus ?? 0);
  const armorDef = player.armorDurability > 0 ? (armor?.defenseBonus ?? 0) : 0;
  const shieldDef = shield?.defenseBonus ?? 0;
  const numDef = numItem?.defenseBonus ?? 0;
  const bagBonus = player.hasExpandableBag ? (ITEMS.expandable_bag.weightCapacityBonus ?? 18) : 0;

  flexibility += numItem?.flexBonus ?? 0;
  vision += numItem?.visionBonus ?? 0;
  autoRegenHp += numItem?.regenHpBonus ?? 0;
  critBonusPct += numItem?.critBonusPct ?? 0;

  const maxCarryWeight = Math.round((20 + strength * 2.5 + bagBonus) * 10) / 10;
  const currentWeight = getInventoryWeight(player.inventory);

  const statCursePenalty = Math.floor(player.curses / 3);
  const hpCursePenalty = Math.floor(player.curses / 5) * 10;

  const hasErwen = player.party.some((p) => p.id === 'erwen' && p.hp > 0);
  const hasMercArcher = !hasErwen && player.party.some((p) => p.role === 'archer' && p.hp > 0);
  const effectiveVision = Math.max(
    2,
    vision + (hasErwen ? 2 : hasMercArcher ? 1 : 0) + (player.torchTurns > 0 ? 3 : 0) - statCursePenalty
  );

  return {
    strength: Math.max(1, strength - statCursePenalty),
    flexibility: Math.max(1, flexibility - statCursePenalty),
    vision: effectiveVision,
    obsession: Math.max(0, obsession),
    manaPool: Math.max(10, manaPool),
    maxHp: Math.max(25, player.maxHp + maxHpBonus - hpCursePenalty),
    attack: Math.max(4, Math.round((strength - statCursePenalty) * 1.4 + weaponAtk)),
    defense: Math.max(
      0,
      armorDef + shieldDef + numDef + essDefenseBonus + racialDefBonus + Math.floor(strength * 0.25) - statCursePenalty
    ),
    maxCarryWeight,
    currentWeight,
    isOverweight: currentWeight > maxCarryWeight,
    hasAcidFluid: player.essences.some((e) => e.hasAcidFluid),
    hasAcidResistantArmor: Boolean(armor?.acidResistant) && player.armorDurability > 0,
    autoRegenHp,
    stoneBonusPct,
    critBonusPct,
    extraThirstDrain,
    noPotionHeal,
    rangedVulnPct,
    curseVulnBonus,
    extraManaCost,
    armorWearExtra,
    activeSynergies,
  };
}

export function getSightRadius(state: GameState): number {
  const stats = getEffectiveStats(state.player);
  const floorDef = FLOORS[state.currentFloor];
  const darkPenalty = floorDef?.isDark ? 1 : 0;
  const blindPenalty = state.player.blindTurns > 0 ? 2 : 0;
  return Math.max(2, Math.floor(stats.vision / 2) - darkPenalty - blindPenalty);
}

function hasLineOfSight(grid: TileType[][], x0: number, y0: number, x1: number, y1: number): boolean {
  let cx = x0;
  let cy = y0;
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  while (cx !== x1 || cy !== y1) {
    if (!(cx === x0 && cy === y0)) {
      const tile = grid[cy]?.[cx];
      if (tile === 'wall' || tile === 'crystal') {
        return false;
      }
    }
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      cx += sx;
    }
    if (e2 < dx) {
      err += dx;
      cy += sy;
    }
  }
  return true;
}

export function computeVisibleTiles(state: GameState): boolean[][] {
  const radius = getSightRadius(state);
  const px = state.player.x;
  const py = state.player.y;
  return state.grid.map((row, y) =>
    row.map((_, x) => {
      const dist = Math.max(Math.abs(x - px), Math.abs(y - py));
      if (dist > radius) return false;
      return hasLineOfSight(state.grid, px, py, x, y);
    })
  );
}

function mergeExplored(state: GameState, visible: boolean[][]): boolean[][] {
  return state.explored.map((row, y) =>
    row.map((wasExplored, x) => wasExplored || Boolean(visible[y]?.[x]))
  );
}

export function getInventoryWeight(inventory: InventoryItem[]): number {
  const total = inventory.reduce((sum, entry) => sum + entry.item.weight * entry.quantity, 0);
  return Math.round(total * 10) / 10;
}

export function addItemToInventory(
  inventory: InventoryItem[],
  itemId: string,
  quantity: number
): InventoryItem[] {
  const item = ITEMS[itemId];
  if (!item || quantity <= 0) return inventory;
  const existing = inventory.find((e) => e.item.id === itemId);
  if (existing) {
    return inventory.map((e) =>
      e.item.id === itemId ? { ...e, quantity: e.quantity + quantity } : e
    );
  }
  return [...inventory, { item, quantity }];
}

export function removeItemFromInventory(
  inventory: InventoryItem[],
  itemId: string,
  quantity: number
): InventoryItem[] {
  return inventory
    .map((e) => (e.item.id === itemId ? { ...e, quantity: e.quantity - quantity } : e))
    .filter((e) => e.quantity > 0);
}

export function appendLog(
  logs: LogEntry[],
  turn: number,
  text: string,
  tone: LogEntry['tone'] = 'info'
): LogEntry[] {
  const entry: LogEntry = { id: nextUid('log'), turn, text, tone };
  return [entry, ...logs].slice(0, 60);
}

function makeSfxToken(sfx: SfxType): string {
  return `${sfx}:${Date.now()}:${Math.random()}`;
}

function makePopup(x: number, y: number, text: string, color: string): FloatingPopup {
  return { id: nextUid('pop'), x, y, text, color };
}

function emptyExploredGrid(): boolean[][] {
  return Array.from({ length: GRID_H }, () => Array.from({ length: GRID_W }, () => false));
}

function buildPlayerForRace(raceId: RaceId, name: string): PlayerState {
  const race = RACES[raceId];
  const initialInventory: InventoryItem[] = [
    { item: ITEMS.wooden_club, quantity: 1 },
    { item: ITEMS.cloth_loincloth, quantity: 1 },
    { item: ITEMS.ration_meal, quantity: 3 },
    { item: ITEMS.healing_potion, quantity: 1 },
    { item: ITEMS.torch, quantity: 1 },
  ];

  return {
    name,
    race: race.name,
    raceId,
    level: 1,
    exp: 0,
    expToNext: 10,
    defeatedMonsterIds: [],
    hp: race.maxHp,
    maxHp: race.maxHp,
    mana: race.baseStats.spirit.manaPool,
    maxMana: race.baseStats.spirit.manaPool,
    thirst: 100,
    maxThirst: 100,
    armorDurability: 100,
    maxArmorDurability: 100,
    curses: 0,
    bleedTurns: 0,
    blindTurns: 0,
    torchTurns: 0,
    hasShipLicense: false,
    gp: 0,
    suspicion: 0,
    baseStats: {
      physique: { ...race.baseStats.physique },
      spirit: { ...race.baseStats.spirit },
    },
    essences: [],
    maxEssenceSlots: 3,
    storedVials: [],
    inventory: initialInventory,
    equippedWeaponId: 'wooden_club',
    equippedArmorId: 'cloth_loincloth',
    equippedShieldId: null,
    equippedNumberItemId: null,
    hasExpandableBag: false,
    party: [],
    x: 1,
    y: 5,
    racialBuffTurns: 0,
    assimilationTurns: 0,
    keenFocusActive: false,
  };
}

export function createInitialGameState(): GameState {
  const { grid, monsters, spawnX, spawnY } = generateProceduralFloor(1, null);
  const player = buildPlayerForRace('barbarian', 'Bjorn Yandel');
  player.x = spawnX;
  player.y = spawnY;

  return {
    phase: 'setup',
    mode: 'story',
    cityId: 'lafdonia',
    unlockedNoark: false,
    day: 1,
    turn: 0,
    gold: 80,
    livingCostPerDay: 25,
    currentFloor: 1,
    inRift: false,
    activeRiftType: null,
    floorBossDefeated: false,
    killsOnFloor: 0,
    turnsOnCurrentFloor: 0,
    cannibaloSpawned: false,
    discoveredFloors: [1],
    labyrinthOpenDaysLeft: 7,
    taxDue: 200,
    taxDeadlineDay: 7,
    gamerKnowledgeUsed: false,
    unlockedCorpseGolemLore: false,
    claimedQuestIds: [],
    purchasedCommunityIds: [],
    essenceKnowledge: {},
    purchasedEssenceBooks: [],
    tavernMercenaries: generateRandomMercenaries(4, 1, 'lafdonia'),
    auctionListings: generateAuctionListings(1),
    freeRumorUsedToday: false,
    dailyNews: pickRandom(DAILY_LORE_NEWS),
    soundMuted: false,
    popups: [],
    lastSfx: null,
    screenShake: 0,
    activeEvent: null,
    player,
    grid,
    explored: emptyExploredGrid(),
    monsters,
    droppedEssences: [],
    droppedLoot: [],
    logs: [],
  };
}

export function startGameWithSetup(
  mode: GameMode,
  raceId: RaceId,
  customName: string
): GameState {
  const { grid, monsters, spawnX, spawnY } = generateProceduralFloor(1, null);
  const chosenRaceId: RaceId = mode === 'story' ? 'barbarian' : raceId;
  const trimmedName = customName.trim();
  const playerName =
    mode === 'story' ? 'Bjorn Yandel' : trimmedName || `Explorer (${RACES[chosenRaceId].name})`;
  const raceDef = RACES[chosenRaceId];
  const player = buildPlayerForRace(chosenRaceId, playerName);
  player.x = spawnX;
  player.y = spawnY;

  const logs: LogEntry[] = [
    {
      id: nextUid('log'),
      turn: 0,
      tone: 'lore',
      text:
        mode === 'story'
          ? 'โหมดเนื้อเรื่อง: ตื่นในร่าง Bjorn Yandel (Barbarian) ณ เมืองลาฟโดเนีย (มีเงิน 80 Gold)'
          : `โหมดสร้างตัวละครเอง: ${playerName} (${raceDef.thaiName}) เริ่มต้น ณ เมืองลาฟโดเนีย`,
    },
    {
      id: nextUid('log'),
      turn: 0,
      tone: 'info',
      text: 'ประตูมิติลงชั้นถัดไป (▼) อยู่ฝั่งตะวันออก และต้องจ่ายภาษี 200 Gold ภายในวันที่ 7!',
    },
  ];

  return {
    phase: 'city',
    mode,
    cityId: 'lafdonia',
    unlockedNoark: false,
    day: 1,
    turn: 0,
    gold: 80,
    livingCostPerDay: 25,
    currentFloor: 1,
    inRift: false,
    activeRiftType: null,
    floorBossDefeated: false,
    killsOnFloor: 0,
    turnsOnCurrentFloor: 0,
    cannibaloSpawned: false,
    discoveredFloors: [1],
    labyrinthOpenDaysLeft: 7,
    taxDue: 200,
    taxDeadlineDay: 7,
    gamerKnowledgeUsed: false,
    unlockedCorpseGolemLore: false,
    claimedQuestIds: [],
    purchasedCommunityIds: [],
    essenceKnowledge: {},
    purchasedEssenceBooks: [],
    tavernMercenaries: generateRandomMercenaries(4, 1, 'lafdonia'),
    auctionListings: generateAuctionListings(1),
    freeRumorUsedToday: false,
    dailyNews: pickRandom(DAILY_LORE_NEWS),
    soundMuted: false,
    popups: [],
    lastSfx: null,
    screenShake: 0,
    activeEvent: null,
    player,
    grid,
    explored: emptyExploredGrid(),
    monsters,
    droppedEssences: [],
    droppedLoot: [],
    logs,
  };
}

export function getBuyPrice(state: GameState, itemId: string): number {
  const item = ITEMS[itemId];
  if (!item) return 0;
  if (state.cityId === 'noark') return item.basePrice; // Noark doesn't apply Barbarian penalty
  const race = RACES[state.player.raceId];
  const multiplier = state.gamerKnowledgeUsed ? 1.0 : race.merchantBuyMultiplier;
  return Math.ceil(item.basePrice * multiplier);
}

export function getSellPrice(state: GameState, itemId: string): number {
  const item = ITEMS[itemId];
  if (!item) return 0;
  if (state.cityId === 'noark') return item.basePrice;
  const race = RACES[state.player.raceId];
  const multiplier = state.gamerKnowledgeUsed ? 1.0 : race.merchantSellMultiplier;
  return Math.floor(item.basePrice * multiplier);
}

export function enterLabyrinth(state: GameState, floor: FloorId = state.currentFloor): GameState {
  if (state.labyrinthOpenDaysLeft <= 0) {
    return {
      ...state,
      lastSfx: makeSfxToken('warning'),
      logs: appendLog(
        state.logs,
        state.turn,
        'เขาวงกตปิดชั่วคราวแล้ว! ต้องรอ 3 สัปดาห์ในแท็บศูนย์กลางเพื่อเข้าสู่รอบถัดไป',
        'danger'
      ),
    };
  }

  const floorDef = FLOORS[floor];
  if (floorDef.requiresShipLicense && !state.player.hasShipLicense) {
    return {
      ...state,
      lastSfx: makeSfxToken('warning'),
      logs: appendLog(
        state.logs,
        state.turn,
        'ชั้นที่ 6 มหาสมุทรใหญ่ ต้องซื้อ "ใบอนุญาตเดินเรือ & ต้นหน" ก่อน!',
        'danger'
      ),
    };
  }

  const { grid, monsters, spawnX, spawnY, hasRiftPortal } = generateProceduralFloor(floor, null);
  const stats = getEffectiveStats(state.player);
  let logs = appendLog(
    state.logs,
    state.turn,
    `เข้าสู่ ${floorDef.thaiName} (แผนที่สุ่มใหม่, -1 วันเปิดเขาวงกต) — ประตูมิติลงชั้นถัดไป (▼) อยู่ฝั่งตะวันออก!`,
    'lore'
  );
  if (hasRiftPortal) {
    logs = appendLog(
      logs,
      state.turn,
      'สัมผัสได้ถึงความผันผวนของ "รอยแยก (◎)" ในชั้นนี้ — มีโอกาสพบแก่นแท้หายาก!',
      'lore'
    );
  }
  if (floorDef.minEssenceRecommended && state.player.essences.length < floorDef.minEssenceRecommended) {
    logs = appendLog(
      logs,
      state.turn,
      `คำเตือนชั้น 5: คุณมีแก่นแท้ ${state.player.essences.length}/${floorDef.minEssenceRecommended} ชิ้น — ศัตรูจะโจมตีแรงขึ้น +30%!`,
      'danger'
    );
  }

  const baseState: GameState = {
    ...state,
    phase: 'labyrinth',
    currentFloor: floor,
    inRift: false,
    activeRiftType: null,
    floorBossDefeated: false,
    killsOnFloor: 0,
    turnsOnCurrentFloor: 0,
    cannibaloSpawned: false,
    labyrinthOpenDaysLeft: Math.max(0, state.labyrinthOpenDaysLeft - 1),
    grid,
    explored: emptyExploredGrid(),
    monsters,
    droppedEssences: [],
    droppedLoot: [],
    popups: [],
    lastSfx: makeSfxToken('portal'),
    player: {
      ...state.player,
      maxMana: stats.manaPool,
      mana: Math.min(state.player.mana, stats.manaPool),
      x: spawnX,
      y: spawnY,
      assimilationTurns: 0,
      racialBuffTurns: 0,
      keenFocusActive: false,
    },
    logs,
  };

  const visible = computeVisibleTiles(baseState);
  return { ...baseState, explored: mergeExplored(baseState, visible) };
}

export function descendNextFloor(state: GameState): GameState {
  if (state.phase !== 'labyrinth' || state.inRift) return state;
  const tile = state.grid[state.player.y]?.[state.player.x];
  if (tile !== 'portal_down') return state;

  const nextFloor = (state.currentFloor + 1) as FloorId;
  const nextFloorDef = FLOORS[nextFloor];
  if (!nextFloorDef) return state;

  if (nextFloorDef.requiresShipLicense && !state.player.hasShipLicense) {
    return {
      ...state,
      lastSfx: makeSfxToken('warning'),
      logs: appendLog(
        state.logs,
        state.turn,
        'ไม่สามารถข้ามมหาสมุทรชั้นที่ 6 ได้! ต้องกลับเมืองไปซื้อ "ใบอนุญาตเดินเรือ & ต้นหน" ก่อน',
        'danger'
      ),
    };
  }

  const { grid, monsters, spawnX, spawnY } = generateProceduralFloor(nextFloor, null);
  const discoveredFloors = state.discoveredFloors.includes(nextFloor)
    ? state.discoveredFloors
    : [...state.discoveredFloors, nextFloor];

  let logs = appendLog(
    state.logs,
    state.turn,
    `「เข้าสู่ ${nextFloorDef.thaiName} แล้ว」 — ปลดล็อกจุดเริ่มต้นชั้นที่ ${nextFloor}!`,
    'lore'
  );
  if (state.player.level < nextFloorDef.recommendedLevel) {
    logs = appendLog(
      logs,
      state.turn,
      `คำเตือน: เลเวลของคุณ (${state.player.level}) ต่ำกว่าที่แนะนำ (Lv.${nextFloorDef.recommendedLevel}+) — ระวังมอนสเตอร์ระดับสูง!`,
      'danger'
    );
  }
  if (nextFloorDef.minEssenceRecommended && state.player.essences.length < nextFloorDef.minEssenceRecommended) {
    logs = appendLog(
      logs,
      state.turn,
      `คำเตือนชั้น 5: แก่นแท้ยังไม่ถึง 5 ชิ้น ศัตรูจะโจมตีแรงขึ้น +30%!`,
      'danger'
    );
  }

  const nextState: GameState = {
    ...state,
    currentFloor: nextFloor,
    floorBossDefeated: false,
    killsOnFloor: 0,
    turnsOnCurrentFloor: 0,
    cannibaloSpawned: false,
    discoveredFloors,
    grid,
    explored: emptyExploredGrid(),
    monsters,
    droppedEssences: [],
    droppedLoot: [],
    popups: [],
    lastSfx: makeSfxToken('portal'),
    player: {
      ...state.player,
      x: spawnX,
      y: spawnY,
      assimilationTurns: 0,
    },
    logs,
  };

  const visible = computeVisibleTiles(nextState);
  return { ...nextState, explored: mergeExplored(nextState, visible) };
}

export function enterRift(state: GameState): GameState {
  if (state.phase !== 'labyrinth' || state.inRift) return state;
  const tile = state.grid[state.player.y]?.[state.player.x];
  if (tile !== 'rift_portal') return state;

  const riftType = getRiftTypeForFloor(state.currentFloor) ?? 'vampire_rift';
  const { grid, monsters, spawnX, spawnY } = generateProceduralFloor(state.currentFloor, riftType);

  const riftLabel =
    riftType === 'glacial_cave'
      ? 'ถ้ำธารน้ำแข็ง (Glacial Cave)'
      : riftType === 'witch_forest'
        ? 'ป่าแม่มด (Witch Forest)'
        : 'รอยแยกแวมไพร์ชั้นที่ 1';

  const nextState: GameState = {
    ...state,
    inRift: true,
    activeRiftType: riftType,
    turnsOnCurrentFloor: 0,
    cannibaloSpawned: false,
    grid,
    explored: emptyExploredGrid(),
    monsters,
    droppedEssences: [],
    droppedLoot: [],
    popups: [],
    lastSfx: makeSfxToken('portal'),
    player: {
      ...state.player,
      x: spawnX,
      y: spawnY,
      assimilationTurns: 0,
    },
    logs: appendLog(
      state.logs,
      state.turn,
      `ก้าวเข้าสู่รอยแยก: ${riftLabel}! อัตราดรอปแก่นแท้สูงมาก แต่ระวังผู้พิทักษ์รอยแยก!`,
      'danger'
    ),
  };
  const visible = computeVisibleTiles(nextState);
  return { ...nextState, explored: mergeExplored(nextState, visible) };
}

export function exitRiftToFloor(state: GameState): GameState {
  if (state.phase !== 'labyrinth' || !state.inRift) return state;
  const tile = state.grid[state.player.y]?.[state.player.x];
  if (tile !== 'exit') return state;

  const { grid, monsters, spawnX, spawnY } = generateProceduralFloor(state.currentFloor, null);
  const nextState: GameState = {
    ...state,
    inRift: false,
    activeRiftType: null,
    turnsOnCurrentFloor: 0,
    cannibaloSpawned: false,
    grid,
    explored: emptyExploredGrid(),
    monsters,
    droppedEssences: [],
    droppedLoot: [],
    popups: [],
    lastSfx: makeSfxToken('portal'),
    player: {
      ...state.player,
      x: spawnX,
      y: spawnY,
      assimilationTurns: 0,
    },
    logs: appendLog(
      state.logs,
      state.turn,
      `ก้าวออกจากรอยแยก กลับสู่ ${FLOORS[state.currentFloor].thaiName} เรียบร้อย`,
      'success'
    ),
  };
  const visible = computeVisibleTiles(nextState);
  return { ...nextState, explored: mergeExplored(nextState, visible) };
}

export function returnToCity(state: GameState): GameState {
  const cityLabel = state.cityId === 'noark' ? 'เมืองใต้ดินโนอาร์ค' : 'เมืองลาฟโดเนีย';
  const nextLogs = appendLog(
    state.logs,
    state.turn,
    `ถอยออกจากเขาวงกตกลับสู่${cityLabel}อย่างปลอดภัย`,
    'success'
  );
  let activeEvent = state.activeEvent;

  if (!activeEvent && state.cityId === 'lafdonia' && state.player.suspicion >= 60) {
    activeEvent = {
      id: 'ghostbuster_check',
      title: 'นักล่าวิญญาณร้ายเข้าตรวจสอบ!',
      description: `ค่าความสงสัยวิญญาณร้ายของคุณสูงถึง ${state.player.suspicion}/100! เจ้าหน้าที่สงสัยว่าคุณเป็นวิญญาณร้าย`,
      choices: [
        { label: 'ตีเนียนเป็นคนเถื่อนโง่ ๆ (เสีย 50 Gold ติดสินบน, -30 ความสงสัย)', effectKey: 'gb_bribe' },
        { label: 'ตอบคำถามอย่างนิ่งสงบ (เสี่ยงเสีย HP 20, -25 ความสงสัย)', effectKey: 'gb_bluff' },
      ],
    };
  } else if (!activeEvent && state.mode === 'story' && Math.random() < 0.22) {
    activeEvent = {
      id: 'evil_spirit_letter',
      title: 'จดหมายปริศนาถึงวิญญาณร้าย',
      description:
        'มีจดหมายลึกลับพร้อมยาเม็ดถูกส่งมา เตือนว่าห้ามเปิดเผยตัวว่าเป็นผู้เล่นแม้ถูกนักล่าวิญญาณร้ายจับได้',
      choices: [
        { label: 'เผาจดหมายและเก็บยาเม็ดไว้ (+1 Healing Potion)', effectKey: 'letter_keep' },
        { label: 'ตรวจสอบเบาะแสจากข้อความ (+35 Gold, +100 GP)', effectKey: 'letter_intel' },
      ],
    };
  }

  return {
    ...state,
    phase: 'city',
    inRift: false,
    activeRiftType: null,
    popups: [],
    lastSfx: makeSfxToken('portal'),
    activeEvent,
    player: {
      ...state.player,
      racialBuffTurns: 0,
      assimilationTurns: 0,
      keenFocusActive: false,
    },
    logs: nextLogs,
  };
}

export function resolveRandomEvent(state: GameState, effectKey: string): GameState {
  if (!state.activeEvent) return state;

  const next = { ...state, activeEvent: null };
  switch (effectKey) {
    case 'letter_keep':
      next.player = {
        ...next.player,
        inventory: addItemToInventory(next.player.inventory, 'healing_potion', 1),
      };
      next.logs = appendLog(next.logs, next.turn, 'เก็บยาเม็ดฟื้นฟูจากจดหมายปริศนา (+1 Healing Potion)', 'lore');
      break;
    case 'letter_intel':
      next.gold += 35;
      next.player = { ...next.player, gp: next.player.gp + 100 };
      next.logs = appendLog(next.logs, next.turn, 'นำข้อมูลเบาะแสไปขายต่ออย่างลับ ๆ (+35 Gold, +100 GP)', 'lore');
      break;
    case 'gb_bribe': {
      const paid = Math.min(next.gold, 50);
      next.gold -= paid;
      next.player = { ...next.player, suspicion: Math.max(0, next.player.suspicion - 30) };
      next.logs = appendLog(next.logs, next.turn, `จ่ายเงิน ${paid} Gold กลบเกลื่อนความสงสัย (-30 ความสงสัย)`, 'info');
      break;
    }
    case 'gb_bluff':
      next.player = {
        ...next.player,
        hp: Math.max(1, next.player.hp - 20),
        suspicion: Math.max(0, next.player.suspicion - 25),
      };
      next.logs = appendLog(next.logs, next.turn, 'ทนรับการสอบสวนอย่างเยือกเย็น (-20 HP, -25 ความสงสัย)', 'danger');
      break;
    case 'noark_fight': {
      const gained = 50;
      next.gold += gained;
      next.player = { ...next.player, hp: Math.max(1, next.player.hp - 15) };
      next.logs = appendLog(
        next.logs,
        next.turn,
        `ปะทะทีมปล้นสะดมจากโนอาร์ค! บาดเจ็บ 15 HP แต่ชิงมาได้ ${gained} Gold`,
        'combat'
      );
      break;
    }
    case 'noark_bribe': {
      const lost = Math.min(next.gold, 30);
      next.gold -= lost;
      next.logs = appendLog(
        next.logs,
        next.turn,
        `เจรจาจ่าย ${lost} Gold เพื่อเลี่ยงการปะทะกับกลุ่มโนอาร์ค`,
        'info'
      );
      break;
    }
    case 'help_explorer':
      next.player = {
        ...next.player,
        gp: next.player.gp + 80,
        inventory: removeItemFromInventory(next.player.inventory, 'healing_potion', 1),
      };
      next.explored = next.grid.map((r) => r.map(() => true));
      next.logs = appendLog(
        next.logs,
        next.turn,
        'ช่วยนักสำรวจด้วย Healing Potion — เขาเปิดแผนที่ชั้นนี้ให้ทั้งหมด (+80 GP)!',
        'lore'
      );
      break;
    case 'ignore_explorer':
      next.logs = appendLog(next.logs, next.turn, 'คุณเดินผ่านนักสำรวจบาดเจ็บไปอย่างระมัดระวัง', 'info');
      break;
    case 'karui_bless': {
      const paid = Math.min(next.gold, 30);
      const st = getEffectiveStats(next.player);
      next.gold -= paid;
      next.player = {
        ...next.player,
        curses: Math.max(0, next.player.curses - 4),
        hp: Math.min(st.maxHp, next.player.hp + 20),
      };
      next.logs = appendLog(
        next.logs,
        next.turn,
        `ถวาย ${paid} Gold แด่นักบวชคารูอิ — รับพรล้างคำสาป (-4 Curse, +20 HP)!`,
        'lore'
      );
      break;
    }
    case 'karui_talk':
      next.player = { ...next.player, gp: next.player.gp + 30 };
      next.logs = appendLog(next.logs, next.turn, 'สนทนากับนักบวชคารูอิ ได้รับข้อมูลเชิงลึก (+30 GP)', 'info');
      break;
    case 'search_pack': {
      const roll = Math.random();
      if (roll < 0.45) {
        next.player = {
          ...next.player,
          inventory: addItemToInventory(next.player.inventory, 'torch', 1),
        };
        next.logs = appendLog(next.logs, next.turn, 'ค้นกระเป๋านักสำรวจที่ล่วงลับ พบคบไฟเขาวงกต x1!', 'success');
      } else if (roll < 0.8) {
        next.player = {
          ...next.player,
          inventory: addItemToInventory(next.player.inventory, 'magic_stone', 3),
        };
        next.logs = appendLog(next.logs, next.turn, 'พบ Magic Stone x3 ในเป้นักสำรวจ!', 'success');
      } else {
        next.player = { ...next.player, curses: next.player.curses + 1 };
        next.logs = appendLog(next.logs, next.turn, 'เป้นั้นติดกับดักคำสาป! (+1 Curse)', 'danger');
      }
      break;
    }
    case 'skip_pack':
      next.logs = appendLog(next.logs, next.turn, 'ไม่เสี่ยงแตะต้องศพนักสำรวจ เดินหน้าต่อ', 'info');
      break;
  }
  return next;
}

export function equipItemFromInventory(state: GameState, itemId: string): GameState {
  const item = ITEMS[itemId];
  if (!item) return state;
  const owned = state.player.inventory.some((e) => e.item.id === itemId && e.quantity > 0);
  if (!owned) return state;

  const nextPlayer = { ...state.player };
  if (item.type === 'weapon') {
    nextPlayer.equippedWeaponId = itemId;
  } else if (item.type === 'armor') {
    nextPlayer.equippedArmorId = itemId;
  } else if (item.type === 'shield') {
    nextPlayer.equippedShieldId = itemId;
  } else if (item.type === 'number_item') {
    nextPlayer.equippedNumberItemId = itemId;
  } else if (item.type === 'bag') {
    nextPlayer.hasExpandableBag = true;
  } else {
    return state;
  }

  return {
    ...state,
    lastSfx: makeSfxToken('loot'),
    player: nextPlayer,
    logs: appendLog(state.logs, state.turn, `สวมใส่ ${item.name} เรียบร้อยแล้ว`, 'success'),
  };
}

export function useConsumable(state: GameState, itemId: string): GameState {
  const item = ITEMS[itemId];
  if (!item || (item.type !== 'consumable' && item.type !== 'utility')) return state;
  const hasItem = state.player.inventory.some((e) => e.item.id === itemId && e.quantity > 0);
  if (!hasItem) return state;

  if (item.isShipLicense) {
    return {
      ...state,
      lastSfx: makeSfxToken('loot'),
      player: {
        ...state.player,
        hasShipLicense: true,
        inventory: removeItemFromInventory(state.player.inventory, itemId, 1),
      },
      logs: appendLog(state.logs, state.turn, 'ลงทะเบียนใบอนุญาตเดินเรือชั้นที่ 6 เรียบร้อย!', 'lore'),
    };
  }

  const stats = getEffectiveStats(state.player);
  if (itemId === 'healing_potion' && stats.noPotionHeal) {
    return {
      ...state,
      lastSfx: makeSfxToken('warning'),
      logs: appendLog(
        state.logs,
        state.turn,
        'ผลข้างเคียงแก่นแท้ฟื้นฟูอมตะ: โพชั่นรักษาไม่มีผลต่อร่างกายของคุณ! (พึ่งพา Auto-Regen หรือสกิลฟื้นฟูแทน)',
        'danger'
      ),
    };
  }
  const newHp = Math.min(stats.maxHp, state.player.hp + (item.restoreHp ?? 0));
  const newThirst = Math.min(
    state.player.maxThirst,
    state.player.thirst + (item.restoreThirst ?? 0)
  );
  const newTorch = item.grantTorchTurns
    ? state.player.torchTurns + item.grantTorchTurns
    : state.player.torchTurns;
  const newBleed = item.cureBleed ? 0 : state.player.bleedTurns;
  const newCurses = item.reduceCurse
    ? Math.max(0, state.player.curses - item.reduceCurse)
    : state.player.curses;
  const newSuspicion = item.reduceSuspicion
    ? Math.max(0, state.player.suspicion - item.reduceSuspicion)
    : state.player.suspicion;

  const actionLogText = item.grantTorchTurns
    ? `จุด ${item.name} — กำลังใช้งานอยู่ (+3 Vision, เหลือ ${newTorch} เทิร์น)`
    : item.cureBleed
      ? `ใช้ ${item.name} — ห้ามเลือดเรียบร้อย (HP: ${newHp}/${stats.maxHp})`
      : item.reduceCurse
        ? `ใช้ ${item.name} — ชำระคำสาปแล้ว (เหลือ ${newCurses}/15)`
        : item.reduceSuspicion
          ? `ดื่ม ${item.name} — ลดความสงสัยวิญญาณร้ายเหลือ ${newSuspicion}/100`
          : `ใช้ ${item.name} (HP: ${newHp}/${stats.maxHp}, Thirst: ${newThirst}/${state.player.maxThirst})`;

  const popups: FloatingPopup[] = [];
  if ((item.restoreHp ?? 0) > 0) {
    popups.push(makePopup(state.player.x, state.player.y, `+${item.restoreHp} HP`, '#4ade80'));
  } else if (item.grantTorchTurns) {
    popups.push(makePopup(state.player.x, state.player.y, 'TORCH ON!', '#fbbf24'));
  }

  const nextState: GameState = {
    ...state,
    popups,
    lastSfx: makeSfxToken('skill'),
    player: {
      ...state.player,
      hp: newHp,
      thirst: newThirst,
      torchTurns: newTorch,
      bleedTurns: newBleed,
      curses: newCurses,
      suspicion: newSuspicion,
      inventory: removeItemFromInventory(state.player.inventory, itemId, 1),
    },
    logs: appendLog(state.logs, state.turn, actionLogText, 'success'),
  };

  if (nextState.phase === 'labyrinth') {
    const visible = computeVisibleTiles(nextState);
    return { ...nextState, explored: mergeExplored(nextState, visible) };
  }
  return nextState;
}

export function activateRacialSkill(state: GameState): GameState {
  if (state.phase !== 'labyrinth') return state;
  const race = RACES[state.player.raceId];
  const manaCost = race.racialSkillCost;
  if (state.player.mana < manaCost) {
    return {
      ...state,
      lastSfx: makeSfxToken('warning'),
      logs: appendLog(
        state.logs,
        state.turn,
        `Spirit (Mana) ไม่พอสำหรับ ${race.racialSkillName} (ต้องการ ${manaCost})!`,
        'danger'
      ),
    };
  }

  const stats = getEffectiveStats(state.player);
  let nextMana = state.player.mana - manaCost;
  if (state.player.raceId === 'elf') {
    nextMana = Math.min(stats.manaPool, nextMana + 8);
  }
  const nextThirst =
    state.player.raceId === 'barbarian'
      ? Math.max(0, state.player.thirst - 8)
      : state.player.thirst;

  let racialLogs = appendLog(
    state.logs,
    state.turn,
    `เปิดใช้งาน ${race.racialSkillName}! ${race.racialSkillDesc}`,
    'success'
  );
  if (state.player.raceId === 'barbarian') {
    racialLogs = appendLog(racialLogs, state.turn, `${state.player.name}: "${pickRandom(BARBARIAN_BATTLE_CRIES)}"`, 'lore');
  }

  const nextState: GameState = {
    ...state,
    popups: [
      makePopup(
        state.player.x,
        state.player.y,
        state.player.raceId === 'barbarian' ? 'เบเฮลลา!!' : race.racialSkillName,
        '#c084fc'
      ),
    ],
    lastSfx: makeSfxToken('skill'),
    player: {
      ...state.player,
      mana: nextMana,
      thirst: nextThirst,
      racialBuffTurns: 4,
    },
    logs: racialLogs,
  };

  const visible = computeVisibleTiles(nextState);
  return { ...nextState, explored: mergeExplored(nextState, visible) };
}

function handleMonsterDefeated(
  state: GameState,
  player: PlayerState,
  monstersKilled: MonsterInstance[],
  nextLoot: DroppedLoot[],
  nextEssences: DroppedEssence[],
  nextLogs: LogEntry[],
  turn: number,
  stoneBonusPct: number
): { player: PlayerState; logs: LogEntry[]; bossKilled: boolean; kills: number; leveledUp: boolean } {
  const updatedPlayer = {
    ...player,
    defeatedMonsterIds: [...player.defeatedMonsterIds],
    party: player.party.map((p) => ({ ...p })),
  };
  let logs = nextLogs;
  let bossKilled = false;
  let leveledUp = false;
  const floorDef = FLOORS[state.currentFloor];

  for (const dead of monstersKilled) {
    const template = MONSTERS[dead.templateId];

    if (dead.templateId === floorDef.gatekeeperBossId && !state.inRift) {
      bossKilled = true;
      logs = appendLog(
        logs,
        turn,
        `พิชิตบอสประจำชั้น ${dead.name} (+50 GP)!`,
        'success'
      );
      updatedPlayer.gp += 50;
    }

    if (template.isClone) {
      updatedPlayer.exp += template.expReward;
      logs = appendLog(
        logs,
        turn,
        `ทำลาย ${dead.name} (+${template.expReward} EXP) — ร่างโคลนสลายไปโดยไม่ดรอปของ`,
        'info'
      );
      continue;
    }

    const baseStones =
      template.magicStoneMin +
      Math.floor(Math.random() * (template.magicStoneMax - template.magicStoneMin + 1));
    const bonusStones = Math.floor((baseStones * stoneBonusPct) / 100);
    const totalStones = baseStones + bonusStones;
    if (totalStones > 0) {
      nextLoot.push({ uid: nextUid('loot'), x: dead.x, y: dead.y, magicStones: totalStones });
    }

    const isFirstKill = !updatedPlayer.defeatedMonsterIds.includes(template.id);
    const expGain = template.expReward * (isFirstKill ? 2 : 1);
    if (isFirstKill) updatedPlayer.defeatedMonsterIds.push(template.id);
    updatedPlayer.exp += expGain;
    updatedPlayer.gp += template.isBoss ? 80 : 10;

    const dropChance = state.inRift
      ? Math.min(0.95, template.essenceDropChance * 1.6)
      : template.essenceDropChance;

    if (template.essenceId && Math.random() < dropChance) {
      nextEssences.push({
        uid: nextUid('ess'),
        essenceId: template.essenceId,
        x: dead.x,
        y: dead.y,
        turnsRemaining: 12,
      });
      logs = appendLog(
        logs,
        turn,
        `${dead.name} สลายเป็นฝุ่น ดรอป ${ESSENCES[template.essenceId].name} (+${expGain} EXP)!`,
        'lore'
      );
    } else {
      logs = appendLog(
        logs,
        turn,
        `กำจัด ${dead.name} สำเร็จ! (+${expGain} EXP, Stone x${totalStones})`,
        'combat'
      );
    }

    if (updatedPlayer.exp >= updatedPlayer.expToNext) {
      leveledUp = true;
      updatedPlayer.exp -= updatedPlayer.expToNext;
      updatedPlayer.level += 1;
      updatedPlayer.expToNext = Math.round(updatedPlayer.expToNext * 1.5);
      updatedPlayer.maxEssenceSlots += 1;
      updatedPlayer.maxHp += 10;
      updatedPlayer.hp = Math.min(updatedPlayer.maxHp, updatedPlayer.hp + 15);
      updatedPlayer.baseStats = {
        physique: {
          ...updatedPlayer.baseStats.physique,
          strength: updatedPlayer.baseStats.physique.strength + 1,
        },
        spirit: {
          ...updatedPlayer.baseStats.spirit,
          manaPool: updatedPlayer.baseStats.spirit.manaPool + 3,
        },
      };
      // Level up hired party members too!
      updatedPlayer.party = updatedPlayer.party.map((ally) => ({
        ...ally,
        level: ally.level + 1,
        maxHp: ally.maxHp + 8,
        hp: Math.min(ally.maxHp + 8, ally.hp + 8),
        attack: ally.attack + 2,
      }));
      logs = appendLog(
        logs,
        turn,
        `LEVEL UP! เลเวล ${updatedPlayer.level} — [แก่นแท้สูงสุด +1] (${updatedPlayer.maxEssenceSlots} ช่อง) และปาร์ตี้แข็งแกร่งขึ้น!`,
        'lore'
      );
    }
  }

  return { player: updatedPlayer, logs, bossKilled, kills: monstersKilled.length, leveledUp };
}

export function activateEssenceSkill(state: GameState, essenceId: string): GameState {
  if (state.phase !== 'labyrinth') return state;
  const ess = state.player.essences.find((e) => e.id === essenceId);
  if (!ess) return state;

  const baseStats = getEffectiveStats(state.player);
  const effectiveManaCost = ess.activeSkill.manaCost + baseStats.extraManaCost;

  if (state.player.mana < effectiveManaCost) {
    return {
      ...state,
      lastSfx: makeSfxToken('warning'),
      logs: appendLog(
        state.logs,
        state.turn,
        `Mana ไม่พอใช้สกิล ${ess.activeSkill.name} (ต้องการ ${effectiveManaCost} MP)`,
        'danger'
      ),
    };
  }

  let nextPlayer = {
    ...state.player,
    mana: state.player.mana - effectiveManaCost,
  };
  let nextMonsters = [...state.monsters];
  let nextLogs = state.logs;
  const stats = getEffectiveStats(nextPlayer);
  const popups: FloatingPopup[] = [];

  if (essenceId === 'gnome' || essenceId === 'doppelganger') {
    nextPlayer.assimilationTurns = essenceId === 'doppelganger' ? 2 : 3;
    popups.push(makePopup(nextPlayer.x, nextPlayer.y, 'STEALTH', '#c084fc'));
    nextLogs = appendLog(
      nextLogs,
      state.turn,
      `ใช้ ${ess.activeSkill.name}! พรางตัวจากมอนสเตอร์ ${nextPlayer.assimilationTurns} เทิร์น`,
      'success'
    );
  } else if (essenceId === 'goblin_swordsman' || essenceId === 'mimic') {
    nextPlayer.keenFocusActive = true;
    popups.push(makePopup(nextPlayer.x, nextPlayer.y, 'FOCUS +45%', '#fbbf24'));
    nextLogs = appendLog(
      nextLogs,
      state.turn,
      `ใช้ ${ess.activeSkill.name}! การโจมตีครั้งถัดไปแม่นยำ 100% และแรงขึ้น +45%`,
      'success'
    );
  } else if (essenceId === 'cave_bat' || essenceId === 'ice_lord') {
    const dmg = essenceId === 'ice_lord' ? Math.round(stats.manaPool * 0.9 + 22) : 16;
    let hits = 0;
    nextMonsters = nextMonsters.map((m) => {
      const dist = Math.abs(m.x - nextPlayer.x) + Math.abs(m.y - nextPlayer.y);
      if (dist <= 3) {
        hits += 1;
        popups.push(makePopup(m.x, m.y, `-${dmg}`, '#38bdf8'));
        return { ...m, hp: Math.max(0, m.hp - dmg), flexibility: Math.max(0, m.flexibility - 2) };
      }
      return m;
    });
    nextLogs = appendLog(
      nextLogs,
      state.turn,
      `ใช้ ${ess.activeSkill.name}! กระทบมอนสเตอร์ในระยะ ${hits} ตัว (${dmg} dmg, ลด Flex)`,
      'combat'
    );
  } else if (essenceId === 'goblin_archer' || essenceId === 'curse_shaman') {
    const rangedDmg =
      essenceId === 'curse_shaman'
        ? Math.round(stats.manaPool * 1.15 + 22)
        : Math.round(stats.strength * 1.4 + 14);
    let bestIdx = -1;
    let bestDist = 99;
    nextMonsters.forEach((m, idx) => {
      const d = Math.abs(m.x - nextPlayer.x) + Math.abs(m.y - nextPlayer.y);
      if (d <= 4 && d < bestDist) {
        bestDist = d;
        bestIdx = idx;
      }
    });
    if (bestIdx !== -1) {
      const target = nextMonsters[bestIdx];
      nextMonsters[bestIdx] = { ...target, hp: target.hp - rangedDmg };
      popups.push(makePopup(target.x, target.y, `-${rangedDmg}`, '#67e8f9'));
      nextLogs = appendLog(
        nextLogs,
        state.turn,
        `ใช้ ${ess.activeSkill.name}! ยิงไกลใส่ ${target.name} (${rangedDmg} dmg)`,
        'combat'
      );
    } else {
      nextLogs = appendLog(nextLogs, state.turn, 'ไม่มีศัตรูในระยะยิง 4 ช่อง!', 'info');
    }
  } else if (essenceId === 'stone_golem' || essenceId === 'bone_knight') {
    const repair = essenceId === 'bone_knight' ? 30 : 25;
    const heal = essenceId === 'bone_knight' ? 20 : 15;
    nextPlayer.armorDurability = Math.min(100, nextPlayer.armorDurability + repair);
    nextPlayer.hp = Math.min(stats.maxHp, nextPlayer.hp + heal);
    popups.push(makePopup(nextPlayer.x, nextPlayer.y, `+${heal} HP`, '#4ade80'));
    nextLogs = appendLog(
      nextLogs,
      state.turn,
      `ใช้ ${ess.activeSkill.name}! ฟื้นความทนทานเกราะ +${repair}% และ HP +${heal}`,
      'success'
    );
  } else if (essenceId === 'iron_feather' || essenceId === 'vol_herchan') {
    const repair = essenceId === 'vol_herchan' ? 45 : 15;
    const heal = essenceId === 'vol_herchan' ? 25 : 0;
    const aoeDmg = essenceId === 'vol_herchan' ? Math.round(stats.defense * 1.8 + 20) : Math.round(stats.strength * 1.4 + 10);
    nextPlayer.armorDurability = Math.min(100, nextPlayer.armorDurability + repair);
    nextPlayer.hp = Math.min(stats.maxHp, nextPlayer.hp + heal);
    nextMonsters = nextMonsters.map((m) => {
      if (Math.abs(m.x - nextPlayer.x) + Math.abs(m.y - nextPlayer.y) <= 2) {
        popups.push(makePopup(m.x, m.y, `-${aoeDmg}`, '#93c5fd'));
        return { ...m, hp: m.hp - aoeDmg };
      }
      return m;
    });
    if (heal > 0) popups.push(makePopup(nextPlayer.x, nextPlayer.y, `+${heal} HP`, '#4ade80'));
    nextLogs = appendLog(
      nextLogs,
      state.turn,
      `ใช้ ${ess.activeSkill.name}! ซ่อมเกราะ +${repair}%${heal > 0 ? `, +${heal} HP` : ''} และกระแทกศัตรู ${aoeDmg} dmg`,
      'combat'
    );
  } else if (essenceId === 'troll_regen' || essenceId === 'beorn') {
    const healAmt = essenceId === 'beorn' ? 35 : 30;
    nextPlayer.hp = Math.min(stats.maxHp, nextPlayer.hp + healAmt);
    if (essenceId === 'beorn') nextPlayer.bleedTurns = 0;
    popups.push(makePopup(nextPlayer.x, nextPlayer.y, `+${healAmt} HP`, '#4ade80'));
    nextLogs = appendLog(
      nextLogs,
      state.turn,
      `ใช้ ${ess.activeSkill.name}! ฟื้นฟู +${healAmt} HP${essenceId === 'beorn' ? ' และหยุดเลือดไหล!' : ''}`,
      'success'
    );
  } else if (essenceId === 'gachapon') {
    const roll = Math.random();
    if (roll < 0.34) {
      nextPlayer.armorDurability = Math.min(100, nextPlayer.armorDurability + 35);
      popups.push(makePopup(nextPlayer.x, nextPlayer.y, 'ARMOR +35%', '#93c5fd'));
      nextLogs = appendLog(nextLogs, state.turn, 'กาชาบอนออกผล [ซ่อมเกราะ]! +35% Durability', 'success');
    } else if (roll < 0.67) {
      nextPlayer.hp = Math.min(stats.maxHp, nextPlayer.hp + 28);
      popups.push(makePopup(nextPlayer.x, nextPlayer.y, '+28 HP', '#4ade80'));
      nextLogs = appendLog(nextLogs, state.turn, 'กาชาบอนออกผล [ฟื้นฟูฉุกเฉิน]! +28 HP', 'success');
    } else {
      const dmg = Math.round(stats.strength * 2.4 + 22);
      nextMonsters = nextMonsters.map((m) => {
        if (Math.abs(m.x - nextPlayer.x) + Math.abs(m.y - nextPlayer.y) <= 2) {
          popups.push(makePopup(m.x, m.y, `-${dmg}`, '#fbbf24'));
          return { ...m, hp: m.hp - dmg };
        }
        return m;
      });
      nextLogs = appendLog(nextLogs, state.turn, `กาชาบอนออกผล [แจ็กพอต]! ฟาดศัตรูรอบตัว ${dmg} dmg`, 'combat');
    }
  } else if (essenceId === 'vampire' || essenceId === 'cannibalo' || essenceId === 'death_knight') {
    const drainDmg = essenceId === 'death_knight' ? 36 : essenceId === 'cannibalo' ? 34 : 28;
    const healAmt = essenceId === 'death_knight' ? 12 : essenceId === 'cannibalo' ? 18 : 22;
    let drained = 0;
    nextMonsters = nextMonsters.map((m) => {
      const dist = Math.abs(m.x - nextPlayer.x) + Math.abs(m.y - nextPlayer.y);
      if (dist <= 2 && drained === 0) {
        drained = 1;
        popups.push(makePopup(m.x, m.y, `-${drainDmg}`, '#f43f5e'));
        return { ...m, hp: m.hp - drainDmg };
      }
      return m;
    });
    if (drained > 0) {
      nextPlayer.hp = Math.min(stats.maxHp, nextPlayer.hp + healAmt);
      popups.push(makePopup(nextPlayer.x, nextPlayer.y, `+${healAmt} HP`, '#4ade80'));
      nextLogs = appendLog(
        nextLogs,
        state.turn,
        `ใช้ ${ess.activeSkill.name}! ดูดพลังชีวิต ${drainDmg} dmg และฟื้น HP +${healAmt}`,
        'combat'
      );
    } else {
      nextLogs = appendLog(nextLogs, state.turn, 'ไม่มีศัตรูในระยะ 2 ช่อง!', 'info');
    }
  } else if (essenceId === 'stormgush') {
    nextPlayer.hp = Math.min(stats.maxHp, nextPlayer.hp + 25);
    const dmg = Math.round(stats.strength * 2.0 + 24);
    popups.push(makePopup(nextPlayer.x, nextPlayer.y, '+25 HP', '#4ade80'));
    nextMonsters = nextMonsters.map((m) => {
      if (Math.abs(m.x - nextPlayer.x) + Math.abs(m.y - nextPlayer.y) <= 3) {
        popups.push(makePopup(m.x, m.y, `-${dmg}`, '#38bdf8'));
        return { ...m, hp: m.hp - dmg };
      }
      return m;
    });
    nextLogs = appendLog(nextLogs, state.turn, `ใช้ Tempest Guard! ฟื้น HP +25 และซัดพายุ ${dmg} dmg`, 'combat');
  } else {
    const hpCost = ess.activeSkill.hpCost ?? 0;
    if (hpCost > 0 && nextPlayer.hp <= hpCost) {
      return {
        ...state,
        lastSfx: makeSfxToken('warning'),
        logs: appendLog(nextLogs, state.turn, 'HP ไม่พอสำหรับใช้สกิลนี้!', 'danger'),
      };
    }
    const burstDamage =
      essenceId === 'chaos_riakis'
        ? Math.round(stats.strength * 3.1 + 40)
        : essenceId === 'flameless_spirit' || essenceId === 'yeti' || essenceId === 'ifrit' || essenceId === 'doom_fire_fairy'
          ? Math.round(stats.manaPool * 1.3 + 26)
          : essenceId === 'ogre'
            ? Math.round(stats.strength * 2.8 + 30)
            : essenceId === 'twin_hydra'
              ? Math.round(stats.strength * 2.7 + 26)
              : essenceId === 'grabnich'
                ? Math.round(stats.strength * 2.6 + 24)
                : essenceId === 'abyss_tongue'
                  ? 12
                  : Math.round(stats.strength * 2.3 + 16);
    nextPlayer.hp -= hpCost;
    if (essenceId === 'orc_warlord') {
      nextPlayer.keenFocusActive = true;
    }
    const radius =
      essenceId === 'flameless_spirit' ||
      essenceId === 'ifrit' ||
      essenceId === 'doom_fire_fairy' ||
      essenceId === 'chaos_riakis'
        ? 3
        : 2;
    let hitCount = 0;
    nextMonsters = nextMonsters.map((m) => {
      const dist = Math.abs(m.x - nextPlayer.x) + Math.abs(m.y - nextPlayer.y);
      if (dist <= radius) {
        hitCount += 1;
        popups.push(makePopup(m.x, m.y, `-${burstDamage}`, '#fbbf24'));
        return { ...m, hp: m.hp - burstDamage };
      }
      return m;
    });
    nextLogs = appendLog(
      nextLogs,
      state.turn,
      `ใช้ ${ess.activeSkill.name}! สร้างความเสียหาย ${burstDamage} แก่มอนสเตอร์ ${hitCount} ตัว`,
      'combat'
    );
  }

  const defeated = nextMonsters.filter((m) => m.hp <= 0);
  const survivors = nextMonsters.filter((m) => m.hp > 0);
  const nextLoot = [...state.droppedLoot];
  const nextEssences = [...state.droppedEssences];

  const killResult = handleMonsterDefeated(
    state,
    nextPlayer,
    defeated,
    nextLoot,
    nextEssences,
    nextLogs,
    state.turn,
    stats.stoneBonusPct
  );

  return advanceTurnEffects(
    {
      ...state,
      floorBossDefeated: state.floorBossDefeated || killResult.bossKilled,
      killsOnFloor: state.killsOnFloor + killResult.kills,
      player: killResult.player,
      monsters: survivors,
      droppedLoot: nextLoot,
      droppedEssences: nextEssences,
      logs: killResult.logs,
    },
    popups,
    killResult.leveledUp ? 'levelup' : 'skill',
    0
  );
}

export function absorbDroppedEssence(state: GameState, dropUid: string): GameState {
  const drop = state.droppedEssences.find((d) => d.uid === dropUid);
  if (!drop || drop.x !== state.player.x || drop.y !== state.player.y) return state;

  const essence = ESSENCES[drop.essenceId];
  if (!essence) return state;

  if (state.player.essences.length >= state.player.maxEssenceSlots) {
    return {
      ...state,
      lastSfx: makeSfxToken('warning'),
      logs: appendLog(
        state.logs,
        state.turn,
        `「ตัวละครได้ถึงขีดจำกัดของแก่นแท้ (${state.player.maxEssenceSlots}/${state.player.maxEssenceSlots}) แล้ว ล่ามอนสเตอร์ใหม่และเพิ่มเลเวล!」`,
        'danger'
      ),
    };
  }

  if (state.player.essences.some((e) => e.id === essence.id)) {
    return {
      ...state,
      logs: appendLog(state.logs, state.turn, `คุณมี ${essence.name} อยู่ในร่างกายแล้ว`, 'info'),
    };
  }

  const updatedPlayer: PlayerState = {
    ...state.player,
    essences: [...state.player.essences, essence],
  };
  const newStats = getEffectiveStats(updatedPlayer);
  updatedPlayer.maxMana = newStats.manaPool;
  updatedPlayer.mana = Math.min(
    newStats.manaPool,
    updatedPlayer.mana + (essence.statBonus.manaPool ?? 0)
  );
  updatedPlayer.hp = Math.min(newStats.maxHp, updatedPlayer.hp + (essence.statBonus.maxHp ?? 0));

  let logs = appendLog(
    state.logs,
    state.turn,
    `ดูดซับ ${essence.name} (Rank ${essence.rank}) สำเร็จ! ได้รับ ${essence.activeSkill.name} และ ${essence.passiveName}`,
    'lore'
  );
  if (essence.hasAcidFluid && !newStats.hasAcidResistantArmor) {
    logs = appendLog(
      logs,
      state.turn,
      'คำเตือน: Acid Fluid ทำให้เลือดเป็นกรด! รีบหา Acid-Resistant Leather ไม่งั้นเกราะจะพังไวมาก',
      'danger'
    );
  }

  return {
    ...state,
    popups: [makePopup(state.player.x, state.player.y, '+ESSENCE!', '#d8b4fe')],
    lastSfx: makeSfxToken('essence'),
    essenceKnowledge: upgradeEssenceKnowledge(state.essenceKnowledge, drop.essenceId, 'verified'),
    player: updatedPlayer,
    droppedEssences: state.droppedEssences.filter((d) => d.uid !== dropUid),
    logs,
  };
}

export function giveEssenceToPartyMember(
  state: GameState,
  dropUid: string,
  memberId: string
): GameState {
  const drop = state.droppedEssences.find((d) => d.uid === dropUid);
  if (!drop || drop.x !== state.player.x || drop.y !== state.player.y) return state;
  const essence = ESSENCES[drop.essenceId];
  const member = state.player.party.find((p) => p.id === memberId);
  if (!essence || !member || !member.canAbsorbEssence) return state;

  const updatedParty = state.player.party.map((p) =>
    p.id === memberId
      ? {
          ...p,
          maxHp: p.maxHp + 25,
          hp: Math.min(p.maxHp + 25, p.hp + 25),
          attack: p.attack + 5,
          absorbedEssenceName: essence.name,
        }
      : p
  );

  return {
    ...state,
    popups: [makePopup(state.player.x, state.player.y, `${member.name} +5 ATK`, '#4ade80')],
    lastSfx: makeSfxToken('essence'),
    essenceKnowledge: upgradeEssenceKnowledge(state.essenceKnowledge, drop.essenceId, 'verified'),
    player: { ...state.player, party: updatedParty },
    droppedEssences: state.droppedEssences.filter((d) => d.uid !== dropUid),
    logs: appendLog(
      state.logs,
      state.turn,
      `มอบ ${essence.name} ให้ ${member.name} ดูดซับ! (HP +25, ATK +5)`,
      'lore'
    ),
  };
}

export function bottleDroppedEssence(state: GameState, dropUid: string): GameState {
  const drop = state.droppedEssences.find((d) => d.uid === dropUid);
  if (!drop || drop.x !== state.player.x || drop.y !== state.player.y) return state;

  const hasVial = state.player.inventory.some((e) => e.item.id === 'essence_vial' && e.quantity > 0);
  if (!hasVial) {
    return {
      ...state,
      lastSfx: makeSfxToken('warning'),
      logs: appendLog(state.logs, state.turn, 'ไม่มีหลอดทดลอง (Essence Vial) สำหรับเก็บแก่นแท้!', 'danger'),
    };
  }

  const essence = ESSENCES[drop.essenceId];
  return {
    ...state,
    popups: [makePopup(state.player.x, state.player.y, 'BOTTLED!', '#38bdf8')],
    lastSfx: makeSfxToken('loot'),
    essenceKnowledge: upgradeEssenceKnowledge(state.essenceKnowledge, drop.essenceId, 'verified'),
    player: {
      ...state.player,
      inventory: removeItemFromInventory(state.player.inventory, 'essence_vial', 1),
      storedVials: [...state.player.storedVials, { uid: nextUid('vial'), essenceId: drop.essenceId }],
    },
    droppedEssences: state.droppedEssences.filter((d) => d.uid !== dropUid),
    logs: appendLog(
      state.logs,
      state.turn,
      `บรรจุ ${essence.name} ลงหลอดทดลองเรียบร้อย! นำไปขายได้ที่ตลาดกลางอาร์มินัส`,
      'success'
    ),
  };
}

export function stepPlayer(state: GameState, dx: number, dy: number): GameState {
  if (state.phase !== 'labyrinth' || state.activeEvent) return state;

  const targetX = state.player.x + dx;
  const targetY = state.player.y + dy;

  if (targetX < 0 || targetX >= GRID_W || targetY < 0 || targetY >= GRID_H) return state;
  const tile = state.grid[targetY][targetX];
  if (tile === 'wall' || tile === 'crystal') {
    return state;
  }

  let nextPlayer = { ...state.player };
  const nextMonsters = [...state.monsters];
  let nextLoot: DroppedLoot[] = [...state.droppedLoot];
  const nextEssences: DroppedEssence[] = [...state.droppedEssences];
  let nextLogs = state.logs;
  let bossKilled = false;
  let kills = 0;
  let leveledUp = false;
  const popups: FloatingPopup[] = [];
  let sfx: SfxType = 'step';
  let shake = 0;

  if (nextPlayer.assimilationTurns > 0) {
    nextPlayer.assimilationTurns = 0;
    nextLogs = appendLog(nextLogs, state.turn, 'การเคลื่อนที่ทำให้การพรางตัวถูกยกเลิก', 'info');
  }

  const stats = getEffectiveStats(nextPlayer);
  const targetMonsterIdx = nextMonsters.findIndex((m) => m.x === targetX && m.y === targetY);
  if (targetMonsterIdx !== -1) {
    const monster = nextMonsters[targetMonsterIdx];
    const hitChance = nextPlayer.keenFocusActive
      ? 1.0
      : Math.min(0.95, Math.max(0.55, 0.78 + (stats.flexibility - monster.flexibility) * 0.03));

    if (Math.random() <= hitChance) {
      const focusMult = nextPlayer.keenFocusActive ? 1.45 : 1.0;
      const critChance = Math.min(0.5, stats.flexibility * 0.025 + stats.critBonusPct / 100);
      const isCrit = Math.random() < critChance;
      const critMult = isCrit ? 1.5 : 1.0;
      const rawDamage = Math.max(3, Math.round(stats.attack * focusMult * critMult - monster.defense));

      const updatedHp = monster.hp - rawDamage;
      nextPlayer.keenFocusActive = false;

      sfx = isCrit ? 'crit' : 'hit';
      if (isCrit) {
        shake = state.screenShake + 1;
        if (nextPlayer.raceId === 'barbarian' && Math.random() < 0.5) {
          nextLogs = appendLog(
            nextLogs,
            state.turn,
            `${nextPlayer.name}: "${pickRandom(BARBARIAN_BATTLE_CRIES)}"`,
            'lore'
          );
        }
      }
      popups.push(
        makePopup(
          monster.x,
          monster.y,
          isCrit ? `CRIT -${rawDamage}!` : `-${rawDamage}`,
          isCrit ? '#fbbf24' : '#f87171'
        )
      );

      if (updatedHp <= 0) {
        const [dead] = nextMonsters.splice(targetMonsterIdx, 1);
        const killRes = handleMonsterDefeated(
          state,
          nextPlayer,
          [dead],
          nextLoot,
          nextEssences,
          nextLogs,
          state.turn,
          stats.stoneBonusPct
        );
        nextPlayer = killRes.player;
        nextLogs = killRes.logs;
        bossKilled = killRes.bossKilled;
        kills = killRes.kills;
        leveledUp = killRes.leveledUp;
      } else {
        const tmpl = MONSTERS[monster.templateId];
        const shouldEnrage = Boolean(tmpl?.enragesAtHalf && !monster.enraged && updatedHp <= monster.maxHp * 0.5);
        nextMonsters[targetMonsterIdx] = {
          ...monster,
          hp: updatedHp,
          enraged: monster.enraged || shouldEnrage,
          attack: shouldEnrage ? monster.attack + 6 : monster.attack,
        };
        nextLogs = appendLog(
          nextLogs,
          state.turn,
          `โจมตี ${monster.name} เข้าเป้า ${rawDamage} dmg${isCrit ? ' (CRIT!)' : ''} (เหลือ ${updatedHp}/${monster.maxHp})`,
          'combat'
        );
        if (shouldEnrage) {
          nextLogs = appendLog(nextLogs, state.turn, `${monster.name} เข้าสู่โหมดคลั่ง (Enrage +6 ATK)!`, 'danger');
        }
      }
    } else {
      nextPlayer.keenFocusActive = false;
      popups.push(makePopup(monster.x, monster.y, 'MISS', '#94a3b8'));
      nextLogs = appendLog(nextLogs, state.turn, `โจมตี ${monster.name} พลาดเป้า!`, 'info');
    }
  } else {
    nextPlayer.x = targetX;
    nextPlayer.y = targetY;

    const lootAtTile = nextLoot.filter((l) => l.x === targetX && l.y === targetY);
    if (lootAtTile.length > 0) {
      const totalStones = lootAtTile.reduce((s, l) => s + l.magicStones, 0);
      nextPlayer.inventory = addItemToInventory(nextPlayer.inventory, 'magic_stone', totalStones);
      nextLoot = nextLoot.filter((l) => !(l.x === targetX && l.y === targetY));
      sfx = 'loot';
      popups.push(makePopup(targetX, targetY, `+${totalStones} Stone`, '#38bdf8'));
      nextLogs = appendLog(nextLogs, state.turn, `เก็บ Magic Stone x${totalStones}`, 'success');
    }
  }

  return advanceTurnEffects(
    {
      ...state,
      floorBossDefeated: state.floorBossDefeated || bossKilled,
      killsOnFloor: state.killsOnFloor + kills,
      player: nextPlayer,
      monsters: nextMonsters,
      droppedLoot: nextLoot,
      droppedEssences: nextEssences,
      logs: nextLogs,
    },
    popups,
    leveledUp ? 'levelup' : sfx,
    shake
  );
}

function advanceTurnEffects(
  state: GameState,
  initialPopups: FloatingPopup[],
  initialSfx: SfxType,
  initialShake: number
): GameState {
  const nextTurn = state.turn + 1;
  const nextTurnsOnFloor = state.turnsOnCurrentFloor + 1;
  let nextCannibaloSpawned = state.cannibaloSpawned;
  let nextPlayer = { ...state.player, party: state.player.party.map((p) => ({ ...p })) };
  let nextLogs = state.logs;
  const nextMonsters = [...state.monsters];
  const nextLoot = [...state.droppedLoot];
  const nextEssences = [...state.droppedEssences];
  let bossKilled = state.floorBossDefeated;
  let kills = state.killsOnFloor;
  const popups = [...initialPopups];
  let sfx: SfxType = initialSfx;
  let shake = initialShake;
  const stats = getEffectiveStats(nextPlayer);

  if (nextPlayer.racialBuffTurns > 0) nextPlayer.racialBuffTurns -= 1;
  if (nextPlayer.assimilationTurns > 0) nextPlayer.assimilationTurns -= 1;
  if (nextPlayer.torchTurns > 0) nextPlayer.torchTurns -= 1;
  if (nextPlayer.blindTurns > 0) nextPlayer.blindTurns -= 1;

  nextPlayer.mana = Math.min(stats.manaPool, nextPlayer.mana + 1);

  if (stats.autoRegenHp > 0 && nextPlayer.hp < stats.maxHp) {
    nextPlayer.hp = Math.min(stats.maxHp, nextPlayer.hp + stats.autoRegenHp);
  }

  if (nextPlayer.bleedTurns > 0) {
    nextPlayer.bleedTurns -= 1;
    nextPlayer.hp -= 5;
    popups.push(makePopup(nextPlayer.x, nextPlayer.y, '-5 BLEED', '#ef4444'));
    nextLogs = appendLog(nextLogs, nextTurn, `เลือดไหล (Bleed)! เสีย HP 5 (เหลือ ${nextPlayer.bleedTurns}T)`, 'danger');
  }

  if (nextPlayer.curses >= 12) {
    nextPlayer.hp -= 10;
    popups.push(makePopup(nextPlayer.x, nextPlayer.y, '-10 CURSE', '#a855f7'));
    nextLogs = appendLog(nextLogs, nextTurn, `คำสาปวิกฤต (${nextPlayer.curses}/15)! วิญญาณถูกกัดกร่อน เสีย HP 10`, 'danger');
  }

  const thirstDrain = (stats.isOverweight ? 3 : 2) + stats.extraThirstDrain;
  nextPlayer.thirst = Math.max(0, nextPlayer.thirst - thirstDrain);
  if (nextPlayer.thirst === 0) {
    nextPlayer.hp -= 4;
    nextLogs = appendLog(nextLogs, nextTurn, 'กระหายน้ำ/ขาดเสบียงอย่างหนัก! เสีย HP 4', 'danger');
  }

  // Party offensive assist
  if (nextPlayer.party.length > 0 && nextMonsters.length > 0) {
    for (const member of nextPlayer.party) {
      if (member.hp <= 0 || member.role === 'tank') continue;
      const range = member.role === 'archer' || member.role === 'mage' ? 4 : 1;
      const targetIdx = nextMonsters.findIndex(
        (m) => Math.abs(m.x - nextPlayer.x) + Math.abs(m.y - nextPlayer.y) <= range
      );
      if (targetIdx !== -1) {
        const m = nextMonsters[targetIdx];
        const dmg =
          member.role === 'mage'
            ? member.attack
            : Math.max(2, member.attack - Math.floor(m.defense * 0.5));
        const newHp = m.hp - dmg;
        popups.push(makePopup(m.x, m.y, `-${dmg}`, '#60a5fa'));
        if (newHp <= 0) {
          const [dead] = nextMonsters.splice(targetIdx, 1);
          nextLogs = appendLog(
            nextLogs,
            nextTurn,
            `${member.name} ปิดฉาก ${dead.name} (${dmg} dmg)!`,
            'combat'
          );
          const killRes = handleMonsterDefeated(
            state,
            nextPlayer,
            [dead],
            nextLoot,
            nextEssences,
            nextLogs,
            nextTurn,
            stats.stoneBonusPct
          );
          nextPlayer = killRes.player;
          nextLogs = killRes.logs;
          if (killRes.bossKilled) bossKilled = true;
          kills += killRes.kills;
        } else {
          nextMonsters[targetIdx] = { ...m, hp: newHp };
          nextLogs = appendLog(
            nextLogs,
            nextTurn,
            `${member.name} โจมตีสนับสนุน ${m.name} (${dmg} dmg)`,
            'combat'
          );
        }
        const banterPool = PARTY_BANTER[member.id];
        if (banterPool && Math.random() < 0.35) {
          nextLogs = appendLog(nextLogs, nextTurn, pickRandom(banterPool), 'lore');
        } else if (!banterPool && Math.random() < 0.25) {
          const genericPool = ROLE_BANTER[member.role];
          if (genericPool) {
            nextLogs = appendLog(nextLogs, nextTurn, `${member.name}: ${pickRandom(genericPool)}`, 'lore');
          }
        }
      }
    }
  }

  const remainingEssences = nextEssences
    .map((e) => ({ ...e, turnsRemaining: e.turnsRemaining - 1 }))
    .filter((e) => {
      if (e.turnsRemaining <= 0) {
        nextLogs = appendLog(
          nextLogs,
          nextTurn,
          `${ESSENCES[e.essenceId].name} สลายหายไปตามเวลาแล้ว`,
          'info'
        );
        return false;
      }
      return true;
    });

  const floorDef = FLOORS[state.currentFloor];
  const essenceFailPenalty =
    floorDef.minEssenceRecommended && nextPlayer.essences.length < floorDef.minEssenceRecommended
      ? 1.3
      : 1.0;

  if (nextPlayer.assimilationTurns === 0) {
    for (let i = 0; i < nextMonsters.length; i++) {
      const m = nextMonsters[i];
      const tmpl = MONSTERS[m.templateId];
      const dist = Math.abs(m.x - nextPlayer.x) + Math.abs(m.y - nextPlayer.y);
      const rangedRange = tmpl?.rangedRange ?? 0;
      const canRangedHit =
        rangedRange > 0 &&
        dist > 1 &&
        dist <= rangedRange &&
        hasLineOfSight(state.grid, m.x, m.y, nextPlayer.x, nextPlayer.y);

      if (dist === 1 || canRangedHit) {
        if (dist === 1 && tmpl?.rangedRange && Math.random() < 0.45) {
          const awayX = m.x + Math.sign(m.x - nextPlayer.x);
          const awayY = m.y + Math.sign(m.y - nextPlayer.y);
          const t = state.grid[awayY]?.[awayX];
          const occupied =
            (awayX === nextPlayer.x && awayY === nextPlayer.y) ||
            nextMonsters.some((o) => o.uid !== m.uid && o.x === awayX && o.y === awayY);
          if (t && t !== 'wall' && t !== 'crystal' && !occupied) {
            nextMonsters[i] = { ...m, x: awayX, y: awayY };
            nextLogs = appendLog(nextLogs, nextTurn, `${m.name} ถอยฉากเว้นระยะยิง!`, 'info');
            continue;
          }
        }

        const dodgeChance = Math.min(0.35, Math.max(0.05, (stats.flexibility - m.flexibility) * 0.03));
        if (Math.random() < dodgeChance) {
          popups.push(makePopup(nextPlayer.x, nextPlayer.y, 'DODGE', '#93c5fd'));
          nextLogs = appendLog(nextLogs, nextTurn, `หลบการโจมตีของ ${m.name} ได้!`, 'info');
        } else {
          const baseAtk = Math.round(m.attack * essenceFailPenalty);
          let dmg = canRangedHit
            ? Math.max(2, baseAtk - Math.floor(stats.defense * 0.6))
            : Math.max(1, baseAtk - stats.defense);

          if (canRangedHit && stats.rangedVulnPct > 0) {
            dmg = Math.round(dmg * (1 + stats.rangedVulnPct / 100));
          }

          const livingBackline = nextPlayer.party.filter((p) => p.hp > 0 && p.role !== 'tank');
          if (canRangedHit && livingBackline.length > 0 && Math.random() < 0.25) {
            const victim = livingBackline[Math.floor(Math.random() * livingBackline.length)];
            const allyDmg = Math.max(2, baseAtk - victim.defense);
            victim.hp = Math.max(0, victim.hp - allyDmg);
            nextLogs = appendLog(
              nextLogs,
              nextTurn,
              `${m.name} ยิงระยะไกลโดน ${victim.name}! (-${allyDmg} HP, เหลือ ${victim.hp}/${victim.maxHp})`,
              'danger'
            );
            continue;
          }

          const activeTank = nextPlayer.party.find((p) => p.role === 'tank' && p.hp > 0);
          if (activeTank) {
            const absorbed = Math.ceil(dmg * 0.35);
            dmg = Math.max(1, dmg - absorbed);
            activeTank.hp = Math.max(0, activeTank.hp - absorbed);
            nextLogs = appendLog(
              nextLogs,
              nextTurn,
              `${activeTank.name} ยกโล่รับแทน ${absorbed} dmg (เหลือ ${activeTank.hp}/${activeTank.maxHp})`,
              'info'
            );
          }

          nextPlayer.hp -= dmg;
          if (sfx === 'step') sfx = 'hurt';
          if (m.isBoss) shake = state.screenShake + 1;
          popups.push(makePopup(nextPlayer.x, nextPlayer.y, `-${dmg}`, '#ef4444'));
          nextLogs = appendLog(
            nextLogs,
            nextTurn,
            `${m.name} ${canRangedHit ? 'ยิงโจมตีระยะไกล!' : 'โจมตีคุณ!'} เสีย HP ${dmg}`,
            'danger'
          );

          if (tmpl?.inflictsCurse && Math.random() < Math.min(0.95, 0.55 + stats.curseVulnBonus)) {
            nextPlayer.curses += 1;
            nextLogs = appendLog(
              nextLogs,
              nextTurn,
              `ติดคำสาปจาก ${m.name}! (สะสม ${nextPlayer.curses}/15)`,
              'danger'
            );
          }

          if (tmpl?.inflictsBleed && Math.random() < 0.4) {
            nextPlayer.bleedTurns = Math.max(nextPlayer.bleedTurns, 3);
            nextLogs = appendLog(nextLogs, nextTurn, `${m.name} ทำให้คุณเลือดไหล (Bleed 3T)!`, 'danger');
          }

          if (tmpl?.inflictsBlind && Math.random() < 0.4) {
            nextPlayer.blindTurns = Math.max(nextPlayer.blindTurns, 2);
            nextLogs = appendLog(nextLogs, nextTurn, `${m.name} ทำให้ตาพร่ามัว (Vision -2 นาน 2T)!`, 'danger');
          }

          if (stats.armorWearExtra > 0 && nextPlayer.armorDurability > 0) {
            nextPlayer.armorDurability = Math.max(0, nextPlayer.armorDurability - stats.armorWearExtra);
          }

          if (stats.hasAcidFluid && !stats.hasAcidResistantArmor && nextPlayer.armorDurability > 0) {
            nextPlayer.armorDurability = Math.max(0, nextPlayer.armorDurability - 12);
            nextLogs = appendLog(
              nextLogs,
              nextTurn,
              `เลือดกรด (Acid Fluid) กัดกร่อนชุดเกราะ! เหลือ ${nextPlayer.armorDurability}%`,
              'danger'
            );
          }
        }
      } else if (dist <= 7) {
        const stepX = m.x < nextPlayer.x ? 1 : m.x > nextPlayer.x ? -1 : 0;
        const stepY = m.y < nextPlayer.y ? 1 : m.y > nextPlayer.y ? -1 : 0;
        const candidates: [number, number][] =
          Math.abs(m.x - nextPlayer.x) >= Math.abs(m.y - nextPlayer.y)
            ? [[m.x + stepX, m.y], [m.x, m.y + stepY]]
            : [[m.x, m.y + stepY], [m.x + stepX, m.y]];

        for (const [cx, cy] of candidates) {
          const t = state.grid[cy]?.[cx];
          const occupied =
            (cx === nextPlayer.x && cy === nextPlayer.y) ||
            nextMonsters.some((other) => other.uid !== m.uid && other.x === cx && other.y === cy);
          if (t && t !== 'wall' && t !== 'crystal' && !occupied) {
            nextMonsters[i] = { ...m, x: cx, y: cy };
            break;
          }
        }
      }
    }
  }

  // Cannibalo Anti-Camping Hunter (Lore Ch.61)
  const cannibaloThreshold = Math.max(20, 38 - nextPlayer.level * 2);
  if (!nextCannibaloSpawned && nextTurnsOnFloor >= cannibaloThreshold) {
    for (const [dx, dy] of [
      [3, 0],
      [-3, 0],
      [0, 3],
      [0, -3],
      [2, 2],
    ]) {
      const cx = nextPlayer.x + dx;
      const cy = nextPlayer.y + dy;
      const t = state.grid[cy]?.[cx];
      const occupied = nextMonsters.some((m) => m.x === cx && m.y === cy);
      if (t === 'floor' && !occupied) {
        nextMonsters.push(spawnMonsterInstance('cannibalo', cx, cy));
        nextCannibaloSpawned = true;
        sfx = 'warning';
        shake = state.screenShake + 1;
        nextLogs = appendLog(
          nextLogs,
          nextTurn,
          'คำเตือน! คุณอยู่ในชั้นเดิมนานเกินไป — แคนนิบาโล (Rank 7) ปรากฏตัวออกมาล่าคุณแล้ว!',
          'danger'
        );
        break;
      }
    }
  }

  // Respawn mechanic every 15 turns
  if (nextTurn % 15 === 0 && nextMonsters.length < 7) {
    const pools: Record<FloorId, string[]> = {
      1: ['gnome', 'goblin_swordsman', 'cave_bat', 'goblin_archer'],
      2: ['goblin_archer', 'blade_wolf', 'krungbee'],
      3: ['bone_knight', 'orc_warrior', 'orc_shaman'],
      4: ['doppel_clone', 'death_knight'],
      5: ['soul_eater', 'drake', 'troll'],
      6: ['lanemut_warrior', 'lanemut_shaman'],
      7: ['metcrow', 'vampire_lord', 'manticore'],
    };
    const pool = pools[state.currentFloor];
    const pick = MONSTERS[pool[Math.floor(Math.random() * pool.length)]];
    const rx = 4 + Math.floor(Math.random() * 8);
    const ry = 2 + Math.floor(Math.random() * 7);
    const tile = state.grid[ry]?.[rx];
    const occupied =
      (rx === nextPlayer.x && ry === nextPlayer.y) ||
      nextMonsters.some((m) => m.x === rx && m.y === ry);
    if (tile === 'floor' && !occupied) {
      nextMonsters.push(spawnMonsterInstance(pick.id, rx, ry));
      nextLogs = appendLog(nextLogs, nextTurn, `มอนสเตอร์ ${pick.name} เกิดใหม่ (Respawn)!`, 'info');
    }
  }

  if (nextTurn % 7 === 0 && Math.random() < 0.38) {
    nextLogs = appendLog(nextLogs, nextTurn, pickRandom(EXPLORATION_WHISPERS), 'info');
  }

  let activeEvent = state.activeEvent;
  if (!activeEvent && nextTurn % 14 === 0 && Math.random() < 0.45) {
    const roll = Math.random();
    const hasPotion = nextPlayer.inventory.some((e) => e.item.id === 'healing_potion' && e.quantity > 0);
    if (roll < 0.3 && hasPotion) {
      activeEvent = {
        id: 'injured_explorer',
        title: 'พบนักสำรวจกิลด์บาดเจ็บสาหัส',
        description:
          'นักสำรวจรุ่นน้องนอนพิงเสาคริสตัลด้วยบาดแผลฉกรรจ์ เขาเอ่ยขอความช่วยเหลือแลกกับแผนที่ชั้นนี้',
        choices: [
          { label: 'มอบ Healing Potion ช่วยรักษา (เปิดแผนที่ทั้งชั้น +80 GP)', effectKey: 'help_explorer' },
          { label: 'เดินผ่านไป (เขาวงกตไม่ใช่ที่สำหรับคนอ่อนแอ)', effectKey: 'ignore_explorer' },
        ],
      };
    } else if (roll < 0.55) {
      activeEvent = {
        id: 'karui_priest',
        title: 'พบนักบวชแห่งคารูอิในเขาวงกต',
        description: 'นักบวชผู้ศรัทธาแห่งคารูอิกำลังสวดภาวนาอยู่กลางความมืด พร้อมมอบพรแก่ผู้ร่วมทาง',
        choices: [
          { label: 'ถวาย 30 Gold รับพรชำระล้าง (-4 Curse, +20 HP)', effectKey: 'karui_bless' },
          { label: 'สนทนาสอบถามเส้นทางเขาวงกต (+30 GP)', effectKey: 'karui_talk' },
        ],
      };
    } else if (roll < 0.8) {
      activeEvent = {
        id: 'abandoned_pack',
        title: 'พบเป้นักสำรวจผู้ล่วงลับ',
        description: 'ศพของผู้เสียชีวิตถูกมอนสเตอร์เมินเฉยตามกฎของเขาวงกต แต่ยังมีสัมภาระหลงเหลืออยู่',
        choices: [
          { label: 'ค้นกระเป๋าอย่างระมัดระวัง (สุ่มได้ไอเทมหรือเสี่ยงคำสาป)', effectKey: 'search_pack' },
          { label: 'ไม่แตะต้องและเดินหน้าต่อ', effectKey: 'skip_pack' },
        ],
      };
    } else {
      activeEvent = {
        id: 'noark_raiders',
        title: 'พบทีมปล้นสะดมจากโนอาร์ค!',
        description: 'กลุ่มนักสำรวจใต้ดินจากเมืองโนอาร์คดักซุ่มอยู่เบื้องหน้า พร้อมจะปล้นหินเวทของคุณ',
        choices: [
          { label: 'พุ่งเข้าสู้เพื่อชิงทรัพย์ (+50 Gold, เสีย 15 HP)', effectKey: 'noark_fight' },
          { label: 'จ่ายค่าผ่านทาง (เสีย 30 Gold)', effectKey: 'noark_bribe' },
        ],
      };
    }
  }

  if (nextPlayer.hp <= 0) {
    return {
      ...state,
      turn: nextTurn,
      turnsOnCurrentFloor: nextTurnsOnFloor,
      cannibaloSpawned: nextCannibaloSpawned,
      phase: 'gameover',
      floorBossDefeated: bossKilled,
      killsOnFloor: kills,
      popups,
      lastSfx: makeSfxToken('warning'),
      screenShake: shake,
      player: { ...nextPlayer, hp: 0 },
      monsters: nextMonsters,
      droppedLoot: nextLoot,
      droppedEssences: remainingEssences,
      activeEvent: null,
      logs: appendLog(nextLogs, nextTurn, `${nextPlayer.name} สิ้นใจในเขาวงกต...`, 'danger'),
      gameOverReason: `คุณเสียชีวิตใน ${FLOORS[state.currentFloor].thaiName} — ในโลกของ Dungeon & Stone ความตายคือจุดจบ`,
    };
  }

  const nextState: GameState = {
    ...state,
    turn: nextTurn,
    turnsOnCurrentFloor: nextTurnsOnFloor,
    cannibaloSpawned: nextCannibaloSpawned,
    floorBossDefeated: bossKilled,
    killsOnFloor: kills,
    popups: popups.slice(0, 6),
    lastSfx: makeSfxToken(sfx),
    screenShake: shake,
    player: nextPlayer,
    monsters: nextMonsters,
    droppedLoot: nextLoot,
    droppedEssences: remainingEssences,
    activeEvent,
    logs: nextLogs,
  };

  const visible = computeVisibleTiles(nextState);
  return { ...nextState, explored: mergeExplored(nextState, visible) };
}
