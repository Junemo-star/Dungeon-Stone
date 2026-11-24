import { ESSENCES, generateAuctionListings, generateRandomMercenaries } from '../data/loreData';
import { DAILY_LORE_NEWS } from '../data/loreFlavor';
import { GameState } from '../types/game';

const STORAGE_KEY = 'dungeon_stone_v4';

export function saveGameState(state: GameState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors
  }
}

export function loadGameState(): GameState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GameState;
    if (!parsed || !parsed.player || typeof parsed.player.gp !== 'number') {
      return null;
    }
    if (!parsed.dailyNews) {
      parsed.dailyNews = DAILY_LORE_NEWS[0];
    }
    if (!parsed.essenceKnowledge) {
      parsed.essenceKnowledge = {};
    }
    if (!Array.isArray(parsed.purchasedEssenceBooks)) {
      parsed.purchasedEssenceBooks = [];
    }
    if (!Array.isArray(parsed.tavernMercenaries) || parsed.tavernMercenaries.length === 0) {
      parsed.tavernMercenaries = generateRandomMercenaries(4, parsed.day ?? 1, parsed.cityId ?? 'lafdonia');
    }
    if (!Array.isArray(parsed.auctionListings) || parsed.auctionListings.length === 0) {
      parsed.auctionListings = generateAuctionListings(parsed.day ?? 1);
    }
    if (typeof parsed.freeRumorUsedToday !== 'boolean') {
      parsed.freeRumorUsedToday = false;
    }
    if (Array.isArray(parsed.player.essences)) {
      parsed.player.essences = parsed.player.essences.map((ess) =>
        ESSENCES[ess.id] ? { ...ESSENCES[ess.id] } : ess
      );
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearSavedGame(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore
  }
}
