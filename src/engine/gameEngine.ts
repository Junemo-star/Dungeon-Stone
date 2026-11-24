import { ESSENCES, FLOORS, ITEMS, MONSTERS, RACES } from '../data/loreData';
import {
  DroppedEssence,
  DroppedLoot,
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

const GRID_W = 15;
const GRID_H = 11;

let uidCounter = 1;
export function nextUid(prefix: string): string {
  uidCounter += 1;
  return `${prefix}_${Date.now()}_${uidCounter}`;
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
  const weaponAtk = weapon?.attackBonus ?? 0;
  const armorDef = player.armorDurability > 0 ? (armor?.defenseBonus ?? 0) : 0;
  const shieldDef = shield?.defenseBonus ?? 0;
  const bagBonus = player.hasExpandableBag ? (ITEMS.expandable_bag.weightCapacityBonus ?? 18) : 0;

  const maxCarryWeight = Math.round((20 + strength * 2.5 + bagBonus) * 10) / 10;
  const currentWeight = getInventoryWeight(player.inventory);

  // Stepped curse penalty (every 3 stacks: -1 stats; every 5 stacks: -10 Max HP)
  const statCursePenalty = Math.floor(player.curses / 3);
  const hpCursePenalty = Math.floor(player.curses / 5) * 10;

  const hasErwen = player.party.some((p) => p.id === 'erwen' && p.hp > 0);
  const effectiveVision = Math.max(
    2,
    vision + (hasErwen ? 2 : 0) + (player.torchTurns > 0 ? 3 : 0) - statCursePenalty
  );

  return {
    strength: Math.max(1, strength - statCursePenalty),
    flexibility: Math.max(1, flexibility - statCursePenalty),
    vision: effectiveVision,
    obsession,
    manaPool,
    maxHp: Math.max(20, player.maxHp + maxHpBonus - hpCursePenalty),
    attack: Math.max(4, Math.round((strength - statCursePenalty) * 1.4 + weaponAtk)),
    defense: Math.max(
      0,
      armorDef + shieldDef + essDefenseBonus + racialDefBonus + Math.floor(strength * 0.25) - statCursePenalty
    ),
    maxCarryWeight,
    currentWeight,
    isOverweight: currentWeight > maxCarryWeight,
    hasAcidFluid: player.essences.some((e) => e.hasAcidFluid),
    hasAcidResistantArmor: Boolean(armor?.acidResistant) && player.armorDurability > 0,
    autoRegenHp,
    stoneBonusPct,
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

function spawnMonster(templateId: string, x: number, y: number): MonsterInstance {
  const t = MONSTERS[templateId];
  return {
    uid: nextUid('mon'),
    templateId: t.id,
    name: t.name,
    rank: t.rank,
    hp: t.maxHp,
    maxHp: t.maxHp,
    attack: t.attack,
    defense: t.defense,
    flexibility: t.flexibility,
    x,
    y,
    isBoss: t.isBoss,
    symbol: t.symbol,
  };
}

function emptyExploredGrid(): boolean[][] {
  return Array.from({ length: GRID_H }, () => Array.from({ length: GRID_W }, () => false));
}

export function generateFloor(
  floor: FloorId,
  inRift: boolean
): {
  grid: TileType[][];
  monsters: MonsterInstance[];
} {
  const grid: TileType[][] = Array.from({ length: GRID_H }, (_, y) =>
    Array.from({ length: GRID_W }, (_, x) => {
      if (x === 0 || x === GRID_W - 1 || y === 0 || y === GRID_H - 1) return 'wall';
      return 'floor';
    })
  );

  const obstacleCoords: [number, number][] =
    floor % 2 === 1
      ? [
          [3, 2], [3, 3], [3, 7], [3, 8],
          [6, 1], [6, 4], [6, 6], [6, 9],
          [9, 2], [9, 3], [9, 7], [9, 8],
          [11, 4], [11, 6],
        ]
      : [
          [2, 2], [2, 8], [4, 4], [4, 6],
          [7, 2], [7, 5], [7, 8],
          [10, 3], [10, 7], [12, 2], [12, 8],
        ];

  for (const [cx, cy] of obstacleCoords) {
    grid[cy][cx] = 'crystal';
  }

  grid[5][1] = 'exit';

  if (inRift) {
    grid[5][13] = 'boss_altar';
    return {
      grid,
      monsters: [
        spawnMonster('mimic', 5, 3),
        spawnMonster('stone_golem', 7, 7),
        spawnMonster('corpse_golem', 9, 4),
        spawnMonster('vampire_guardian', 13, 5),
      ],
    };
  }

  if (floor === 1) {
    grid[1][12] = 'rift_portal';
    grid[9][12] = 'portal_down';
    grid[5][13] = 'boss_altar';
    return {
      grid,
      monsters: [
        spawnMonster('gnome', 4, 5),
        spawnMonster('cave_bat', 5, 2),
        spawnMonster('goblin_swordsman', 7, 7),
        spawnMonster('goblin_archer', 8, 3),
        spawnMonster('goblin_swordsman', 10, 5),
        spawnMonster('corpse_golem', 11, 2),
        spawnMonster('dreadfear', 13, 5),
      ],
    };
  }

  if (floor === 2) {
    grid[9][13] = 'portal_down';
    grid[5][13] = 'boss_altar';
    return {
      grid,
      monsters: [
        spawnMonster('goblin_swordsman', 4, 5),
        spawnMonster('goblin_archer', 6, 3),
        spawnMonster('goblin_archer', 6, 8),
        spawnMonster('blade_wolf', 8, 5),
        spawnMonster('blade_wolf', 10, 2),
        spawnMonster('krungbee', 11, 7),
        spawnMonster('alpha_blade_wolf', 13, 5),
      ],
    };
  }

  if (floor === 3) {
    grid[9][13] = 'portal_down';
    grid[5][13] = 'boss_altar';
    return {
      grid,
      monsters: [
        spawnMonster('bone_knight', 4, 4),
        spawnMonster('orc_warrior', 6, 7),
        spawnMonster('orc_shaman', 8, 2),
        spawnMonster('orc_shaman', 9, 8),
        spawnMonster('stone_golem', 10, 5),
        spawnMonster('orc_hero', 13, 5),
      ],
    };
  }

  if (floor === 4) {
    grid[9][13] = 'portal_down';
    grid[5][13] = 'boss_altar';
    return {
      grid,
      monsters: [
        spawnMonster('doppel_clone', 4, 5),
        spawnMonster('doppel_clone', 6, 3),
        spawnMonster('death_knight', 8, 7),
        spawnMonster('doppel_clone', 10, 4),
        spawnMonster('death_knight', 11, 2),
        spawnMonster('doppelganger_boss', 13, 5),
      ],
    };
  }

  if (floor === 5) {
    grid[9][13] = 'portal_down';
    grid[5][13] = 'boss_altar';
    return {
      grid,
      monsters: [
        spawnMonster('soul_eater', 5, 3),
        spawnMonster('drake', 6, 7),
        spawnMonster('troll', 9, 4),
        spawnMonster('soul_eater', 10, 8),
        spawnMonster('drake', 11, 2),
        spawnMonster('flameless_spirit', 13, 5),
      ],
    };
  }

  if (floor === 6) {
    grid[9][13] = 'portal_down';
    grid[5][13] = 'boss_altar';
    return {
      grid,
      monsters: [
        spawnMonster('lanemut_warrior', 5, 5),
        spawnMonster('lanemut_shaman', 7, 2),
        spawnMonster('lanemut_shaman', 7, 8),
        spawnMonster('deep_sea_giant', 10, 4),
        spawnMonster('lanemut_warrior', 11, 7),
        spawnMonster('grabnich', 13, 5),
      ],
    };
  }

  // Floor 7: Dark Continent / Panthelion Ruins
  grid[5][13] = 'boss_altar';
  return {
    grid,
    monsters: [
      spawnMonster('metcrow', 5, 4),
      spawnMonster('vampire_lord', 7, 7),
      spawnMonster('manticore', 9, 3),
      spawnMonster('ogre', 11, 6),
      spawnMonster('dikol_king', 13, 5),
    ],
  };
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
  const { grid, monsters } = generateFloor(1, false);
  return {
    phase: 'setup',
    mode: 'story',
    day: 1,
    turn: 0,
    gold: 80,
    livingCostPerDay: 25,
    currentFloor: 1,
    inRift: false,
    floorBossDefeated: false,
    killsOnFloor: 0,
    discoveredFloors: [1],
    labyrinthOpenDaysLeft: 7,
    taxDue: 200,
    taxDeadlineDay: 7,
    gamerKnowledgeUsed: false,
    unlockedCorpseGolemLore: false,
    activeEvent: null,
    player: buildPlayerForRace('barbarian', 'Bjorn Yandel'),
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
  const { grid, monsters } = generateFloor(1, false);
  const chosenRaceId: RaceId = mode === 'story' ? 'barbarian' : raceId;
  const trimmedName = customName.trim();
  const playerName =
    mode === 'story' ? 'Bjorn Yandel' : trimmedName || `Explorer (${RACES[chosenRaceId].name})`;
  const raceDef = RACES[chosenRaceId];

  const logs: LogEntry[] = [
    {
      id: nextUid('log'),
      turn: 0,
      tone: 'lore',
      text:
        mode === 'story'
          ? 'โหมดเนื้อเรื่อง: ตื่นในร่าง Bjorn Yandel (Barbarian) ณ เมืองลาฟโดเนีย (มีเงินติดตัว 80 Gold)'
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
    day: 1,
    turn: 0,
    gold: 80,
    livingCostPerDay: 25,
    currentFloor: 1,
    inRift: false,
    floorBossDefeated: false,
    killsOnFloor: 0,
    discoveredFloors: [1],
    labyrinthOpenDaysLeft: 7,
    taxDue: 200,
    taxDeadlineDay: 7,
    gamerKnowledgeUsed: false,
    unlockedCorpseGolemLore: false,
    activeEvent: null,
    player: buildPlayerForRace(chosenRaceId, playerName),
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
  const race = RACES[state.player.raceId];
  const multiplier = state.gamerKnowledgeUsed ? 1.0 : race.merchantBuyMultiplier;
  return Math.ceil(item.basePrice * multiplier);
}

export function getSellPrice(state: GameState, itemId: string): number {
  const item = ITEMS[itemId];
  if (!item) return 0;
  const race = RACES[state.player.raceId];
  const multiplier = state.gamerKnowledgeUsed ? 1.0 : race.merchantSellMultiplier;
  return Math.floor(item.basePrice * multiplier);
}

export function enterLabyrinth(state: GameState, floor: FloorId = state.currentFloor): GameState {
  if (state.labyrinthOpenDaysLeft <= 0) {
    return {
      ...state,
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
      logs: appendLog(
        state.logs,
        state.turn,
        'ชั้นที่ 6 มหาสมุทรใหญ่ ต้องซื้อ "ใบอนุญาตเดินเรือ & ต้นหน" จากตลาดอาร์มินัสก่อน!',
        'danger'
      ),
    };
  }

  const { grid, monsters } = generateFloor(floor, false);
  const stats = getEffectiveStats(state.player);
  let logs = appendLog(
    state.logs,
    state.turn,
    `เข้าสู่ ${floorDef.thaiName} (-1 วันเปิดเขาวงกต) — ค้นหาประตูมิติฝั่งตะวันออก (▼) เพื่อลงชั้นถัดไป`,
    'lore'
  );
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
    floorBossDefeated: false,
    killsOnFloor: 0,
    labyrinthOpenDaysLeft: Math.max(0, state.labyrinthOpenDaysLeft - 1),
    grid,
    explored: emptyExploredGrid(),
    monsters,
    droppedEssences: [],
    droppedLoot: [],
    player: {
      ...state.player,
      maxMana: stats.manaPool,
      mana: Math.min(state.player.mana, stats.manaPool),
      x: 1,
      y: 5,
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
      logs: appendLog(
        state.logs,
        state.turn,
        'ไม่สามารถข้ามมหาสมุทรชั้นที่ 6 ได้! ต้องกลับเมืองไปซื้อ "ใบอนุญาตเดินเรือ & ต้นหน" ก่อน',
        'danger'
      ),
    };
  }

  const { grid, monsters } = generateFloor(nextFloor, false);
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
    discoveredFloors,
    grid,
    explored: emptyExploredGrid(),
    monsters,
    droppedEssences: [],
    droppedLoot: [],
    player: {
      ...state.player,
      x: 1,
      y: 5,
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

  const { grid, monsters } = generateFloor(1, true);
  const nextState: GameState = {
    ...state,
    inRift: true,
    grid,
    explored: emptyExploredGrid(),
    monsters,
    droppedEssences: [],
    droppedLoot: [],
    player: {
      ...state.player,
      x: 1,
      y: 5,
      assimilationTurns: 0,
    },
    logs: appendLog(
      state.logs,
      state.turn,
      'ก้าวเข้าสู่รอยแยกชั้นที่ 1! อัตราดรอปแก่นแท้สูงมาก แต่ระวังแวมไพร์ (Rank 5) และคำสาป!',
      'danger'
    ),
  };
  const visible = computeVisibleTiles(nextState);
  return { ...nextState, explored: mergeExplored(nextState, visible) };
}

export function returnToCity(state: GameState): GameState {
  let nextLogs = appendLog(
    state.logs,
    state.turn,
    'ถอยออกจากเขาวงกตกลับสู่เมืองลาฟโดเนียอย่างปลอดภัย',
    'success'
  );
  let activeEvent = state.activeEvent;

  if (!activeEvent && state.mode === 'story' && Math.random() < 0.25) {
    activeEvent = {
      id: 'evil_spirit_letter',
      title: 'จดหมายปริศนาถึงวิญญาณร้าย',
      description:
        'มีจดหมายลึกลับพร้อมยาเม็ดถูกส่งมาที่ห้องพัก เตือนว่าห้ามเปิดเผยตัวว่าเป็นผู้เล่นแม้ถูกนักล่าวิญญาณร้ายจับได้',
      choices: [
        { label: 'เผาจดหมายและเก็บยาเม็ดไว้ (+1 Healing Potion)', effectKey: 'letter_keep' },
        { label: 'ตรวจสอบเบาะแสจากข้อความ (+35 Gold)', effectKey: 'letter_intel' },
      ],
    };
  }

  return {
    ...state,
    phase: 'city',
    inRift: false,
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
      next.logs = appendLog(next.logs, next.turn, 'นำข้อมูลเบาะแสไปขายต่ออย่างลับ ๆ (+35 Gold)', 'lore');
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
  } else if (item.type === 'bag') {
    nextPlayer.hasExpandableBag = true;
  } else {
    return state;
  }

  return {
    ...state,
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
      player: {
        ...state.player,
        hasShipLicense: true,
        inventory: removeItemFromInventory(state.player.inventory, itemId, 1),
      },
      logs: appendLog(state.logs, state.turn, 'ลงทะเบียนใบอนุญาตเดินเรือชั้นที่ 6 เรียบร้อย!', 'lore'),
    };
  }

  const stats = getEffectiveStats(state.player);
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

  const actionLogText = item.grantTorchTurns
    ? `จุด ${item.name} — กำลังใช้งานอยู่ (+3 Vision, เหลือ ${newTorch} เทิร์น)`
    : item.cureBleed
      ? `ใช้ ${item.name} — ห้ามเลือดเรียบร้อย (HP: ${newHp}/${stats.maxHp})`
      : item.reduceCurse
        ? `ใช้ ${item.name} — ชำระคำสาปแล้ว (เหลือ ${newCurses}/15)`
        : `ใช้ ${item.name} (HP: ${newHp}/${stats.maxHp}, Thirst: ${newThirst}/${state.player.maxThirst})`;

  const nextState: GameState = {
    ...state,
    player: {
      ...state.player,
      hp: newHp,
      thirst: newThirst,
      torchTurns: newTorch,
      bleedTurns: newBleed,
      curses: newCurses,
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

  const nextState: GameState = {
    ...state,
    player: {
      ...state.player,
      mana: nextMana,
      thirst: nextThirst,
      racialBuffTurns: 4,
    },
    logs: appendLog(
      state.logs,
      state.turn,
      `เปิดใช้งาน ${race.racialSkillName}! ${race.racialSkillDesc}`,
      'success'
    ),
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
): { player: PlayerState; logs: LogEntry[]; bossKilled: boolean; kills: number } {
  let updatedPlayer = { ...player, defeatedMonsterIds: [...player.defeatedMonsterIds] };
  let logs = nextLogs;
  let bossKilled = false;
  const floorDef = FLOORS[state.currentFloor];

  for (const dead of monstersKilled) {
    const template = MONSTERS[dead.templateId];

    if (dead.templateId === floorDef.gatekeeperBossId && !state.inRift) {
      bossKilled = true;
      logs = appendLog(
        logs,
        turn,
        `พิชิตผู้คุมผนึก ${dead.name}! พอร์ทัลลงชั้นถัดไป (▼) ปลดล็อกแล้ว!`,
        'success'
      );
    }

    if (template.isClone) {
      updatedPlayer.exp += template.expReward;
      logs = appendLog(
        logs,
        turn,
        `ทำลาย ${dead.name} (+${template.expReward} EXP) — ร่างโคลนสลายไปโดยไม่ดรอปหินเวทหรือแก่นแท้`,
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
      logs = appendLog(
        logs,
        turn,
        `LEVEL UP! เลเวล ${updatedPlayer.level} — [แก่นแท้ที่ดูดซับได้สูงสุดเพิ่มขึ้น +1] (รวม ${updatedPlayer.maxEssenceSlots} ช่อง)`,
        'lore'
      );
    }
  }

  return { player: updatedPlayer, logs, bossKilled, kills: monstersKilled.length };
}

export function activateEssenceSkill(state: GameState, essenceId: string): GameState {
  if (state.phase !== 'labyrinth') return state;
  const ess = state.player.essences.find((e) => e.id === essenceId);
  if (!ess) return state;

  if (state.player.mana < ess.activeSkill.manaCost) {
    return {
      ...state,
      logs: appendLog(
        state.logs,
        state.turn,
        `Mana ไม่พอใช้สกิล ${ess.activeSkill.name} (ต้องการ ${ess.activeSkill.manaCost})`,
        'danger'
      ),
    };
  }

  let nextPlayer = {
    ...state.player,
    mana: state.player.mana - ess.activeSkill.manaCost,
  };
  let nextMonsters = [...state.monsters];
  let nextLogs = state.logs;
  const stats = getEffectiveStats(nextPlayer);

  if (essenceId === 'gnome' || essenceId === 'doppelganger') {
    nextPlayer.assimilationTurns = essenceId === 'doppelganger' ? 2 : 3;
    nextLogs = appendLog(
      nextLogs,
      state.turn,
      `ใช้ ${ess.activeSkill.name}! พรางตัวจากมอนสเตอร์ ${nextPlayer.assimilationTurns} เทิร์น`,
      'success'
    );
  } else if (essenceId === 'goblin_swordsman' || essenceId === 'mimic') {
    nextPlayer.keenFocusActive = true;
    nextLogs = appendLog(
      nextLogs,
      state.turn,
      `ใช้ ${ess.activeSkill.name}! การโจมตีครั้งถัดไปแม่นยำ 100% และแรงขึ้น +45%`,
      'success'
    );
  } else if (essenceId === 'cave_bat') {
    let hits = 0;
    nextMonsters = nextMonsters.map((m) => {
      const dist = Math.abs(m.x - nextPlayer.x) + Math.abs(m.y - nextPlayer.y);
      if (dist <= 3) {
        hits += 1;
        return { ...m, hp: Math.max(0, m.hp - 16), flexibility: Math.max(0, m.flexibility - 2) };
      }
      return m;
    });
    nextLogs = appendLog(
      nextLogs,
      state.turn,
      `ใช้ Ultrasonic Screech! กระทบมอนสเตอร์ในระยะ ${hits} ตัว`,
      'combat'
    );
  } else if (essenceId === 'stone_golem' || essenceId === 'bone_knight') {
    const repair = essenceId === 'bone_knight' ? 30 : 25;
    const heal = essenceId === 'bone_knight' ? 20 : 15;
    nextPlayer.armorDurability = Math.min(100, nextPlayer.armorDurability + repair);
    nextPlayer.hp = Math.min(stats.maxHp, nextPlayer.hp + heal);
    nextLogs = appendLog(
      nextLogs,
      state.turn,
      `ใช้ ${ess.activeSkill.name}! ฟื้นความทนทานเกราะ +${repair}% และ HP +${heal}`,
      'success'
    );
  } else if (essenceId === 'vampire') {
    const drainDmg = 28;
    let drained = 0;
    nextMonsters = nextMonsters.map((m) => {
      const dist = Math.abs(m.x - nextPlayer.x) + Math.abs(m.y - nextPlayer.y);
      if (dist <= 2 && drained === 0) {
        drained = 1;
        return { ...m, hp: m.hp - drainDmg };
      }
      return m;
    });
    if (drained > 0) {
      nextPlayer.hp = Math.min(stats.maxHp, nextPlayer.hp + 22);
      nextLogs = appendLog(
        nextLogs,
        state.turn,
        `ใช้ Blood Drain! ดูดเลือดศัตรู ${drainDmg} dmg และฟื้นฟู HP +22`,
        'combat'
      );
    } else {
      nextLogs = appendLog(nextLogs, state.turn, 'ไม่มีศัตรูในระยะ 2 ช่องสำหรับ Blood Drain', 'info');
    }
  } else if (essenceId === 'stormgush') {
    nextPlayer.hp = Math.min(stats.maxHp, nextPlayer.hp + 25);
    const dmg = Math.round(stats.strength * 2.0 + 24);
    nextMonsters = nextMonsters.map((m) =>
      Math.abs(m.x - nextPlayer.x) + Math.abs(m.y - nextPlayer.y) <= 3
        ? { ...m, hp: m.hp - dmg }
        : m
    );
    nextLogs = appendLog(nextLogs, state.turn, `ใช้ Tempest Guard! ฟื้น HP +25 และซัดพายุ ${dmg} dmg`, 'combat');
  } else {
    // Burst AoE skills: corpse_golem, orc_hero, flameless_spirit, grabnich, manticore, ogre
    const hpCost = ess.activeSkill.hpCost ?? 0;
    if (hpCost > 0 && nextPlayer.hp <= hpCost) {
      return {
        ...state,
        logs: appendLog(nextLogs, state.turn, 'HP ไม่พอสำหรับใช้สกิลนี้!', 'danger'),
      };
    }
    const burstDamage =
      essenceId === 'flameless_spirit'
        ? Math.round(stats.manaPool * 1.4 + 28)
        : essenceId === 'ogre'
          ? Math.round(stats.strength * 2.8 + 30)
          : essenceId === 'grabnich'
            ? Math.round(stats.strength * 2.6 + 24)
            : Math.round(stats.strength * 2.3 + 16);
    nextPlayer.hp -= hpCost;
    const radius = essenceId === 'flameless_spirit' ? 3 : 2;
    let hitCount = 0;
    nextMonsters = nextMonsters.map((m) => {
      const dist = Math.abs(m.x - nextPlayer.x) + Math.abs(m.y - nextPlayer.y);
      if (dist <= radius) {
        hitCount += 1;
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

  return advanceTurnEffects({
    ...state,
    floorBossDefeated: state.floorBossDefeated || killResult.bossKilled,
    killsOnFloor: state.killsOnFloor + killResult.kills,
    player: killResult.player,
    monsters: survivors,
    droppedLoot: nextLoot,
    droppedEssences: nextEssences,
    logs: killResult.logs,
  });
}

export function absorbDroppedEssence(state: GameState, dropUid: string): GameState {
  const drop = state.droppedEssences.find((d) => d.uid === dropUid);
  if (!drop || drop.x !== state.player.x || drop.y !== state.player.y) return state;

  const essence = ESSENCES[drop.essenceId];
  if (!essence) return state;

  if (state.player.essences.length >= state.player.maxEssenceSlots) {
    return {
      ...state,
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
    player: updatedPlayer,
    droppedEssences: state.droppedEssences.filter((d) => d.uid !== dropUid),
    logs,
  };
}

export function bottleDroppedEssence(state: GameState, dropUid: string): GameState {
  const drop = state.droppedEssences.find((d) => d.uid === dropUid);
  if (!drop || drop.x !== state.player.x || drop.y !== state.player.y) return state;

  const hasVial = state.player.inventory.some((e) => e.item.id === 'essence_vial' && e.quantity > 0);
  if (!hasVial) {
    return {
      ...state,
      logs: appendLog(state.logs, state.turn, 'ไม่มีหลอดทดลอง (Essence Vial) สำหรับเก็บแก่นแท้!', 'danger'),
    };
  }

  const essence = ESSENCES[drop.essenceId];
  return {
    ...state,
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
      const isCrit = Math.random() < Math.min(0.35, stats.flexibility * 0.025);
      const critMult = isCrit ? 1.5 : 1.0;
      const rawDamage = Math.max(3, Math.round(stats.attack * focusMult * critMult - monster.defense));

      const updatedHp = monster.hp - rawDamage;
      nextPlayer.keenFocusActive = false;

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
      nextLogs = appendLog(nextLogs, state.turn, `เก็บ Magic Stone x${totalStones}`, 'success');
    }
  }

  return advanceTurnEffects({
    ...state,
    floorBossDefeated: state.floorBossDefeated || bossKilled,
    killsOnFloor: state.killsOnFloor + kills,
    player: nextPlayer,
    monsters: nextMonsters,
    droppedLoot: nextLoot,
    droppedEssences: nextEssences,
    logs: nextLogs,
  });
}

function advanceTurnEffects(state: GameState): GameState {
  const nextTurn = state.turn + 1;
  let nextPlayer = { ...state.player, party: state.player.party.map((p) => ({ ...p })) };
  let nextLogs = state.logs;
  const nextMonsters = [...state.monsters];
  const nextLoot = [...state.droppedLoot];
  const nextEssences = [...state.droppedEssences];
  let bossKilled = state.floorBossDefeated;
  let kills = state.killsOnFloor;
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
    nextLogs = appendLog(nextLogs, nextTurn, `เลือดไหล (Bleed)! เสีย HP 5 (เหลือ ${nextPlayer.bleedTurns}T)`, 'danger');
  }

  if (nextPlayer.curses >= 12) {
    nextPlayer.hp -= 10;
    nextLogs = appendLog(nextLogs, nextTurn, `คำสาปวิกฤต (${nextPlayer.curses}/15)! วิญญาณถูกกัดกร่อน เสีย HP 10`, 'danger');
  }

  const thirstDrain = stats.isOverweight ? 3 : 2;
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
        // Archer kite away if adjacent and space available
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
          nextLogs = appendLog(nextLogs, nextTurn, `หลบการโจมตีของ ${m.name} ได้!`, 'info');
        } else {
          const baseAtk = Math.round(m.attack * essenceFailPenalty);
          let dmg = canRangedHit
            ? Math.max(2, baseAtk - Math.floor(stats.defense * 0.6))
            : Math.max(1, baseAtk - stats.defense);

          // Party vulnerability on ranged attacks
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
          nextLogs = appendLog(
            nextLogs,
            nextTurn,
            `${m.name} ${canRangedHit ? 'ยิงโจมตีระยะไกล!' : 'โจมตีคุณ!'} เสีย HP ${dmg}`,
            'danger'
          );

          if (tmpl?.inflictsCurse && Math.random() < 0.55) {
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
      nextMonsters.push(spawnMonster(pick.id, rx, ry));
      nextLogs = appendLog(nextLogs, nextTurn, `มอนสเตอร์ ${pick.name} เกิดใหม่ (Respawn)!`, 'info');
    }
  }

  let activeEvent = state.activeEvent;
  if (!activeEvent && nextTurn % 18 === 0 && Math.random() < 0.45) {
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

  if (nextPlayer.hp <= 0) {
    return {
      ...state,
      turn: nextTurn,
      phase: 'gameover',
      floorBossDefeated: bossKilled,
      killsOnFloor: kills,
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
    floorBossDefeated: bossKilled,
    killsOnFloor: kills,
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
