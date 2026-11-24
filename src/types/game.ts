export type GamePhase = 'setup' | 'city' | 'labyrinth' | 'gameover';

export type GameMode = 'story' | 'custom';

export type FloorId = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type PartyRole = 'archer' | 'striker' | 'tank' | 'mage';

export type RaceId =
  | 'barbarian'
  | 'human'
  | 'beastman'
  | 'dwarf'
  | 'elf'
  | 'dragonkin';

export type EssenceColor = 'Gray' | 'Green' | 'Purple' | 'Red' | 'Blue';

export interface CharacterStats {
  physique: {
    strength: number;
    flexibility: number;
    vision: number;
  };
  spirit: {
    manaPool: number;
    obsession: number;
  };
}

export interface RaceDefinition {
  id: RaceId;
  name: string;
  thaiName: string;
  portraitUrl: string;
  description: string;
  racialSkillName: string;
  racialSkillCost: number;
  racialSkillDesc: string;
  baseStats: CharacterStats;
  maxHp: number;
  merchantBuyMultiplier: number;
  merchantSellMultiplier: number;
}

export interface PartyMemberTemplate {
  id: string;
  name: string;
  race: string;
  role: PartyRole;
  roleLabel: string;
  portraitUrl: string;
  maxHp: number;
  attack: number;
  defense: number;
  hireCost: number;
  canAbsorbEssence: boolean;
  description: string;
}

export interface PartyMemberInstance {
  id: string;
  name: string;
  race: string;
  role: PartyRole;
  roleLabel: string;
  portraitUrl: string;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
}

export interface EssenceSkill {
  name: string;
  manaCost: number;
  hpCost?: number;
  description: string;
}

export interface Essence {
  id: string;
  name: string;
  monsterName: string;
  rank: number;
  color: EssenceColor;
  marketValue: number;
  activeSkill: EssenceSkill;
  passiveName: string;
  passiveDescription: string;
  statBonus: {
    strength?: number;
    flexibility?: number;
    vision?: number;
    manaPool?: number;
    maxHp?: number;
    defense?: number;
    obsession?: number;
  };
  hasAcidFluid?: boolean;
  autoRegenHp?: number;
  stoneBonusPct?: number;
}

export interface StoredEssenceVial {
  uid: string;
  essenceId: string;
}

export type ItemType =
  | 'weapon'
  | 'armor'
  | 'shield'
  | 'bag'
  | 'consumable'
  | 'utility'
  | 'magic_stone'
  | 'vial';

export interface Item {
  id: string;
  name: string;
  type: ItemType;
  weight: number;
  basePrice: number;
  description: string;
  attackBonus?: number;
  defenseBonus?: number;
  weightCapacityBonus?: number;
  acidResistant?: boolean;
  restoreThirst?: number;
  restoreHp?: number;
  grantTorchTurns?: number;
  cureBleed?: boolean;
  reduceCurse?: number;
  isShipLicense?: boolean;
}

export interface InventoryItem {
  item: Item;
  quantity: number;
}

export interface FloorDefinition {
  id: FloorId;
  name: string;
  thaiName: string;
  description: string;
  recommendedLevel: number;
  gatekeeperBossId: string;
  isDark?: boolean;
  requiresShipLicense?: boolean;
  minEssenceRecommended?: number;
}

export interface MonsterTemplate {
  id: string;
  name: string;
  rank: number;
  maxHp: number;
  attack: number;
  defense: number;
  flexibility: number;
  expReward: number;
  magicStoneMin: number;
  magicStoneMax: number;
  essenceDropChance: number;
  essenceId: string | null;
  rangedRange?: number;
  inflictsCurse?: boolean;
  inflictsBleed?: boolean;
  inflictsBlind?: boolean;
  isClone?: boolean;
  enragesAtHalf?: boolean;
  isBoss?: boolean;
  symbol: string;
  description: string;
}

export interface MonsterInstance {
  uid: string;
  templateId: string;
  name: string;
  rank: number;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  flexibility: number;
  x: number;
  y: number;
  enraged?: boolean;
  isBoss?: boolean;
  symbol: string;
}

export type TileType =
  | 'wall'
  | 'floor'
  | 'crystal'
  | 'exit'
  | 'boss_altar'
  | 'portal_down'
  | 'rift_portal';

export interface DroppedEssence {
  uid: string;
  essenceId: string;
  x: number;
  y: number;
  turnsRemaining: number;
}

export interface DroppedLoot {
  uid: string;
  x: number;
  y: number;
  magicStones: number;
}

export interface RandomEventChoice {
  label: string;
  effectKey: string;
}

export interface RandomEvent {
  id: string;
  title: string;
  description: string;
  choices: RandomEventChoice[];
}

export interface LogEntry {
  id: string;
  turn: number;
  text: string;
  tone: 'info' | 'combat' | 'danger' | 'success' | 'lore';
}

export interface PlayerState {
  name: string;
  race: string;
  raceId: RaceId;
  level: number;
  exp: number;
  expToNext: number;
  defeatedMonsterIds: string[];
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  thirst: number;
  maxThirst: number;
  armorDurability: number;
  maxArmorDurability: number;
  curses: number;
  bleedTurns: number;
  blindTurns: number;
  torchTurns: number;
  hasShipLicense: boolean;
  baseStats: CharacterStats;
  essences: Essence[];
  maxEssenceSlots: number;
  storedVials: StoredEssenceVial[];
  inventory: InventoryItem[];
  equippedWeaponId: string;
  equippedArmorId: string;
  equippedShieldId: string | null;
  hasExpandableBag: boolean;
  party: PartyMemberInstance[];
  x: number;
  y: number;
  racialBuffTurns: number;
  assimilationTurns: number;
  keenFocusActive: boolean;
}

export interface GameState {
  phase: GamePhase;
  mode: GameMode;
  day: number;
  turn: number;
  gold: number;
  livingCostPerDay: number;
  currentFloor: FloorId;
  inRift: boolean;
  floorBossDefeated: boolean;
  killsOnFloor: number;
  discoveredFloors: FloorId[];
  labyrinthOpenDaysLeft: number;
  taxDue: number;
  taxDeadlineDay: number;
  gamerKnowledgeUsed: boolean;
  unlockedCorpseGolemLore: boolean;
  activeEvent: RandomEvent | null;
  player: PlayerState;
  grid: TileType[][];
  explored: boolean[][];
  monsters: MonsterInstance[];
  droppedEssences: DroppedEssence[];
  droppedLoot: DroppedLoot[];
  logs: LogEntry[];
  gameOverReason?: string;
}
