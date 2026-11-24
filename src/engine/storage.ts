import { ESSENCES, generateAuctionListings, generateRandomMercenaries } from '../data/loreData';
import { DAILY_LORE_NEWS } from '../data/loreFlavor';
import { GameState } from '../types/game';

export type SaveSlotId = 1 | 2 | 3;

const LEGACY_STORAGE_KEY = 'dungeon_stone_v4';
const ACTIVE_SLOT_KEY = 'dungeon_stone_active_slot';

function slotKey(slot: SaveSlotId): string {
  return `dungeon_stone_slot_${slot}`;
}

export function getActiveSlot(): SaveSlotId {
  try {
    const raw = localStorage.getItem(ACTIVE_SLOT_KEY);
    if (raw === '2') return 2;
    if (raw === '3') return 3;
    return 1;
  } catch {
    return 1;
  }
}

export function setActiveSlot(slot: SaveSlotId): void {
  try {
    localStorage.setItem(ACTIVE_SLOT_KEY, String(slot));
  } catch {
    // Ignore
  }
}

function hydrateState(parsed: GameState): GameState | null {
  if (!parsed || !parsed.player || typeof parsed.player.gp !== 'number') {
    return null;
  }
  if (!parsed.dailyNews) parsed.dailyNews = DAILY_LORE_NEWS[0];
  if (!parsed.essenceKnowledge) parsed.essenceKnowledge = {};
  if (!Array.isArray(parsed.purchasedEssenceBooks)) parsed.purchasedEssenceBooks = [];
  if (!Array.isArray(parsed.tavernMercenaries) || parsed.tavernMercenaries.length === 0) {
    parsed.tavernMercenaries = generateRandomMercenaries(4, parsed.day ?? 1, parsed.cityId ?? 'lafdonia');
  }
  if (!Array.isArray(parsed.auctionListings) || parsed.auctionListings.length === 0) {
    parsed.auctionListings = generateAuctionListings(parsed.day ?? 1);
  }
  if (typeof parsed.freeRumorUsedToday !== 'boolean') parsed.freeRumorUsedToday = false;
  if (!parsed.player.explorerRank) parsed.player.explorerRank = 9;
  if (!Array.isArray(parsed.player.registeredEssenceIds)) parsed.player.registeredEssenceIds = [];
  if (typeof parsed.player.riftStones !== 'number') parsed.player.riftStones = 0;
  if (typeof parsed.player.guardTurns !== 'number') parsed.player.guardTurns = 0;
  if (!parsed.player.weaponMastery) parsed.player.weaponMastery = { hammer: 0, axe: 0, sword: 0 };
  if (typeof parsed.loanDebt !== 'number') parsed.loanDebt = 0;
  if (typeof parsed.loanDueDay !== 'number') parsed.loanDueDay = 0;
  if (parsed.expeditionStats === undefined) parsed.expeditionStats = null;
  if (parsed.lastExpeditionSummary === undefined) parsed.lastExpeditionSummary = null;
  if (!parsed.partyTactic) parsed.partyTactic = 'balanced';
  if (!parsed.partyTrust) parsed.partyTrust = {};
  if (!Array.isArray(parsed.awakenedPartyIds)) parsed.awakenedPartyIds = [];
  if (!parsed.noarkWarChoice) parsed.noarkWarChoice = 'none';
  if (typeof parsed.ngPlusCount !== 'number') parsed.ngPlusCount = 0;
  if (Array.isArray(parsed.player.essences)) {
    parsed.player.essences = parsed.player.essences.map((ess) =>
      ESSENCES[ess.id] ? { ...ESSENCES[ess.id] } : ess
    );
  }
  return parsed;
}

export function saveGameState(state: GameState, slot: SaveSlotId = getActiveSlot()): void {
  try {
    localStorage.setItem(slotKey(slot), JSON.stringify(state));
  } catch {
    // Ignore storage quota errors
  }
}

export function loadGameState(slot: SaveSlotId = getActiveSlot()): GameState | null {
  try {
    let raw = localStorage.getItem(slotKey(slot));
    if (!raw && slot === 1) {
      raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    }
    if (!raw) return null;
    return hydrateState(JSON.parse(raw) as GameState);
  } catch {
    return null;
  }
}

export function clearSavedGame(slot: SaveSlotId = getActiveSlot()): void {
  try {
    localStorage.removeItem(slotKey(slot));
    if (slot === 1) localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // Ignore
  }
}

export interface SaveSlotSummary {
  slot: SaveSlotId;
  empty: boolean;
  name?: string;
  day?: number;
  rank?: number;
  floor?: number;
  ngPlusCount?: number;
}

export function getSlotSummaries(): SaveSlotSummary[] {
  return ([1, 2, 3] as SaveSlotId[]).map((slot) => {
    const st = loadGameState(slot);
    if (!st || st.phase === 'setup') return { slot, empty: true };
    return {
      slot,
      empty: false,
      name: st.player.name,
      day: st.day,
      rank: st.player.explorerRank,
      floor: st.currentFloor,
      ngPlusCount: st.ngPlusCount,
    };
  });
}
