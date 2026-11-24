import {
  ESSENCE_BOOKS,
  ESSENCES,
  generateAuctionListings,
  generateRandomMercenaries,
  isMainCharacterUnlocked,
  ITEMS,
  PARTY_ROSTER,
} from '../data/loreData';
import { DAILY_LORE_NEWS, pickRandom, TAVERN_GOSSIP_LINES } from '../data/loreFlavor';
import { COMMUNITY_OFFERS, STORY_QUESTS } from '../data/storyData';
import { CityId, EssenceBookTier, EssenceKnowledgeLevel, GameState } from '../types/game';
import {
  addItemToInventory,
  appendLog,
  getBuyPrice,
  getEffectiveStats,
  getSellPrice,
  removeItemFromInventory,
  upgradeEssenceKnowledge,
} from './gameEngine';

function pickUnknownEssenceIds(
  knowledge: Record<string, EssenceKnowledgeLevel>,
  count: number
): string[] {
  const unknownIds = Object.keys(ESSENCES).filter((id) => (knowledge[id] ?? 'unknown') === 'unknown');
  if (unknownIds.length === 0) return [];
  const shuffled = [...unknownIds];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

export function buyItemInCity(state: GameState, itemId: string, quantity = 1): GameState {
  const item = ITEMS[itemId];
  if (!item || quantity <= 0) return state;
  const unitPrice = getBuyPrice(state, itemId);
  const totalCost = unitPrice * quantity;
  if (state.gold < totalCost) {
    return {
      ...state,
      logs: appendLog(
        state.logs,
        state.turn,
        `เงินไม่พอซื้อ ${item.name} x${quantity} (ต้องการ ${totalCost} Gold)`,
        'danger'
      ),
    };
  }

  if (item.isShipLicense) {
    if (state.player.hasShipLicense) return state;
    return {
      ...state,
      gold: state.gold - unitPrice,
      player: { ...state.player, hasShipLicense: true },
      logs: appendLog(state.logs, state.turn, `ซื้อ ${item.name} ราคา ${unitPrice} Gold (ปลดล็อกชั้นที่ 6!)`, 'lore'),
    };
  }

  const nextPlayer = {
    ...state.player,
    inventory: addItemToInventory(state.player.inventory, itemId, quantity),
  };

  if (item.type === 'weapon') {
    nextPlayer.equippedWeaponId = itemId;
  } else if (item.type === 'armor') {
    nextPlayer.equippedArmorId = itemId;
    nextPlayer.armorDurability = 100;
  } else if (item.type === 'shield') {
    nextPlayer.equippedShieldId = itemId;
  } else if (item.type === 'number_item') {
    nextPlayer.equippedNumberItemId = itemId;
  } else if (item.type === 'bag') {
    nextPlayer.hasExpandableBag = true;
  }

  return {
    ...state,
    gold: state.gold - totalCost,
    player: nextPlayer,
    logs: appendLog(
      state.logs,
      state.turn,
      `ซื้อ ${item.name} x${quantity} ราคา ${totalCost} Gold`,
      'success'
    ),
  };
}

export function refreshDailyNews(state: GameState): GameState {
  const nextNews = pickRandom(DAILY_LORE_NEWS);
  return {
    ...state,
    dailyNews: nextNews,
    logs: appendLog(state.logs, state.turn, `ข่าวลือที่ได้ยิน: ${nextNews}`, 'lore'),
  };
}

export function switchCity(state: GameState, targetCity: CityId): GameState {
  if (state.phase !== 'city' || state.cityId === targetCity) return state;
  if (targetCity === 'noark' && !state.unlockedNoark && !state.discoveredFloors.includes(2)) {
    return {
      ...state,
      logs: appendLog(
        state.logs,
        state.turn,
        'ยังไม่พบเส้นทางใต้ดินสู่โนอาร์ค! ต้องปลดล็อกเขาวงกตชั้นที่ 2 หรือทำภารกิจเนื้อเรื่องก่อน',
        'danger'
      ),
    };
  }
  return {
    ...state,
    cityId: targetCity,
    unlockedNoark: state.unlockedNoark || targetCity === 'noark',
    tavernMercenaries: generateRandomMercenaries(4, state.day, targetCity),
    logs: appendLog(
      state.logs,
      state.turn,
      targetCity === 'noark'
        ? 'ลอบเดินทางผ่านท่อระบายน้ำสู่ "เมืองใต้ดินโนอาร์ค" (ตลาดมืดปลอดค่าปรับบาร์บาเรียน!)'
        : 'เดินทางกลับสู่เมืองบนพื้นผิว "ลาฟโดเนีย"',
      'lore'
    ),
  };
}

export function isQuestCompleted(state: GameState, questId: string): boolean {
  switch (questId) {
    case 'quest_crystal_survivor':
      return state.player.defeatedMonsterIds.length >= 3;
    case 'quest_goblin_forest':
      return state.discoveredFloors.includes(2);
    case 'quest_rift_clear':
      return (
        state.player.defeatedMonsterIds.includes('vampire_guardian') ||
        state.player.defeatedMonsterIds.includes('lycanthrope_guardian') ||
        state.player.defeatedMonsterIds.includes('cannibalo')
      );
    case 'quest_doppel_forest':
      return state.discoveredFloors.includes(4);
    case 'quest_flameless_master':
      return state.player.defeatedMonsterIds.includes('flameless_spirit');
    default:
      return false;
  }
}

export function claimStoryQuest(state: GameState, questId: string): GameState {
  if (state.claimedQuestIds.includes(questId)) return state;
  if (!isQuestCompleted(state, questId)) return state;
  const quest = STORY_QUESTS.find((q) => q.id === questId);
  if (!quest) return state;

  return {
    ...state,
    gold: state.gold + quest.rewardGold,
    unlockedNoark: state.unlockedNoark || Boolean(quest.unlocksNoark),
    claimedQuestIds: [...state.claimedQuestIds, questId],
    player: {
      ...state.player,
      gp: state.player.gp + quest.rewardGp,
    },
    logs: appendLog(
      state.logs,
      state.turn,
      `สำเร็จภารกิจ "${quest.title}"! รับ +${quest.rewardGold} Gold, +${quest.rewardGp} GP${quest.unlocksNoark ? ' (ปลดล็อกเมืองโนอาร์ค!)' : ''}`,
      'lore'
    ),
  };
}

export function buyCommunityOffer(state: GameState, offerId: string): GameState {
  const offer = COMMUNITY_OFFERS.find((o) => o.id === offerId);
  if (!offer) return state;
  if (state.player.gp < offer.gpCost) {
    return {
      ...state,
      logs: appendLog(state.logs, state.turn, `แต้ม GP ไม่พอ (ต้องการ ${offer.gpCost} GP)`, 'danger'),
    };
  }

  let nextGold = state.gold;
  let nextInventory = state.player.inventory;
  let nextShipLicense = state.player.hasShipLicense;
  const nextSuspicion = Math.max(0, Math.min(100, state.player.suspicion + offer.suspicionIncrease));

  if (offerId === 'offer_gold_exchange') {
    nextGold += 120;
  } else if (offerId === 'offer_vial_pack') {
    nextInventory = addItemToInventory(nextInventory, 'essence_vial', 3);
  } else if (offerId === 'offer_ship_pass') {
    nextShipLicense = true;
  }

  return {
    ...state,
    gold: nextGold,
    purchasedCommunityIds: [...state.purchasedCommunityIds, offerId],
    player: {
      ...state.player,
      gp: state.player.gp - offer.gpCost,
      suspicion: nextSuspicion,
      inventory: nextInventory,
      hasShipLicense: nextShipLicense,
    },
    logs: appendLog(
      state.logs,
      state.turn,
      `แลกเปลี่ยนจากคอมมูนิตี้วิญญาณร้าย: ${offer.title} (ความสงสัย ${nextSuspicion}/100)`,
      'lore'
    ),
  };
}

export function sellAllMagicStones(state: GameState): GameState {
  const entry = state.player.inventory.find((e) => e.item.id === 'magic_stone');
  if (!entry || entry.quantity <= 0) {
    return {
      ...state,
      logs: appendLog(state.logs, state.turn, 'ไม่มี Magic Stone สำหรับขาย', 'info'),
    };
  }

  const unitPrice = getSellPrice(state, 'magic_stone');
  const totalGold = unitPrice * entry.quantity;

  return {
    ...state,
    gold: state.gold + totalGold,
    player: {
      ...state.player,
      inventory: removeItemFromInventory(state.player.inventory, 'magic_stone', entry.quantity),
    },
    logs: appendLog(
      state.logs,
      state.turn,
      `ขาย Magic Stone x${entry.quantity} ได้รับ ${totalGold} Gold (${unitPrice}G/ชิ้น)`,
      'success'
    ),
  };
}

export function sellEssenceVial(state: GameState, vialUid: string): GameState {
  const vial = state.player.storedVials.find((v) => v.uid === vialUid);
  if (!vial) return state;
  const ess = ESSENCES[vial.essenceId];
  const price = ess.marketValue;

  return {
    ...state,
    gold: state.gold + price,
    player: {
      ...state.player,
      storedVials: state.player.storedVials.filter((v) => v.uid !== vialUid),
    },
    logs: appendLog(
      state.logs,
      state.turn,
      `ขายหลอดบรรจุ ${ess.name} ได้รับ ${price} Gold!`,
      'success'
    ),
  };
}

export function auctionSellEssenceVial(state: GameState, vialUid: string): GameState {
  const vial = state.player.storedVials.find((v) => v.uid === vialUid);
  if (!vial) return state;
  const ess = ESSENCES[vial.essenceId];
  const auctionPrice = Math.round(ess.marketValue * 1.35);

  return {
    ...state,
    gold: state.gold + auctionPrice,
    player: {
      ...state.player,
      storedVials: state.player.storedVials.filter((v) => v.uid !== vialUid),
    },
    logs: appendLog(
      state.logs,
      state.turn,
      `ประมูลขาย ${ess.name} ที่โรงประมูลได้ราคาพิเศษ +${auctionPrice} Gold (+35%)!`,
      'lore'
    ),
  };
}

export function buyAuctionEssence(state: GameState, listingId: string): GameState {
  const listing = state.auctionListings.find((l) => l.id === listingId && !l.sold);
  if (!listing) return state;
  const ess = ESSENCES[listing.essenceId];
  if (!ess) return state;

  if (state.gold < listing.price) {
    return {
      ...state,
      logs: appendLog(
        state.logs,
        state.turn,
        `เงินไม่พอประมูล ${ess.name} (ราคา ${listing.price} Gold)`,
        'danger'
      ),
    };
  }

  return {
    ...state,
    gold: state.gold - listing.price,
    essenceKnowledge: upgradeEssenceKnowledge(state.essenceKnowledge, ess.id, 'guild'),
    auctionListings: state.auctionListings.map((l) =>
      l.id === listingId ? { ...l, sold: true } : l
    ),
    player: {
      ...state.player,
      storedVials: [
        ...state.player.storedVials,
        { uid: `vial_${Date.now()}_${Math.floor(Math.random() * 10000)}`, essenceId: ess.id },
      ],
    },
    logs: appendLog(
      state.logs,
      state.turn,
      `ชนะประมูล ${ess.name} ราคา ${listing.price} Gold! (เก็บลงหลอดทดลองในกระเป๋าแล้ว)`,
      'lore'
    ),
  };
}

export function absorbStoredVial(state: GameState, vialUid: string): GameState {
  const vial = state.player.storedVials.find((v) => v.uid === vialUid);
  if (!vial) return state;
  const essence = ESSENCES[vial.essenceId];
  if (!essence) return state;

  if (state.player.essences.length >= state.player.maxEssenceSlots) {
    return {
      ...state,
      logs: appendLog(
        state.logs,
        state.turn,
        `ช่องแก่นแท้เต็มแล้ว (${state.player.essences.length}/${state.player.maxEssenceSlots})! ต้องถอดที่วิหารหรือเพิ่มเลเวลก่อน`,
        'danger'
      ),
    };
  }

  if (state.player.essences.some((e) => e.id === essence.id)) {
    return {
      ...state,
      logs: appendLog(state.logs, state.turn, `คุณมี ${essence.name} อยู่ในร่างกายอยู่แล้ว`, 'info'),
    };
  }

  const nextPlayer = {
    ...state.player,
    essences: [...state.player.essences, essence],
    storedVials: state.player.storedVials.filter((v) => v.uid !== vialUid),
  };
  const stats = getEffectiveStats(nextPlayer);
  nextPlayer.maxMana = stats.manaPool;
  nextPlayer.mana = Math.min(stats.manaPool, nextPlayer.mana + (essence.statBonus.manaPool ?? 0));
  nextPlayer.hp = Math.min(stats.maxHp, nextPlayer.hp + (essence.statBonus.maxHp ?? 0));

  return {
    ...state,
    essenceKnowledge: upgradeEssenceKnowledge(state.essenceKnowledge, essence.id, 'verified'),
    player: nextPlayer,
    logs: appendLog(
      state.logs,
      state.turn,
      `ดูดซับ ${essence.name} จากหลอดทดลองสำเร็จ! (ข้อมูลถูกยืนยัน 100% ในสารานุกรม)`,
      'lore'
    ),
  };
}

export function hirePartyMember(state: GameState, memberId: string): GameState {
  const mainTmpl = PARTY_ROSTER[memberId];
  const tmpl = mainTmpl ?? state.tavernMercenaries.find((m) => m.id === memberId);
  if (!tmpl) return state;

  if (mainTmpl && !isMainCharacterUnlocked(state, memberId)) {
    return {
      ...state,
      logs: appendLog(
        state.logs,
        state.turn,
        `ยังไม่สามารถจ้าง ${mainTmpl.name} ได้ (${mainTmpl.unlockHint ?? 'ยังไม่ปลดล็อก'})`,
        'danger'
      ),
    };
  }

  if (state.player.party.length >= 2) {
    return {
      ...state,
      logs: appendLog(state.logs, state.turn, 'ปาร์ตี้เต็มแล้ว (จ้างร่วมทีมได้สูงสุด 2 คนในเฟสนี้)', 'danger'),
    };
  }
  if (state.player.party.some((p) => p.id === memberId)) {
    return state;
  }
  if (state.gold < tmpl.hireCost) {
    return {
      ...state,
      logs: appendLog(
        state.logs,
        state.turn,
        `เงินไม่พอทำสัญญาคาถาผูกมัดกับ ${tmpl.name} (ต้องการ ${tmpl.hireCost} Gold)`,
        'danger'
      ),
    };
  }

  return {
    ...state,
    gold: state.gold - tmpl.hireCost,
    player: {
      ...state.player,
      party: [
        ...state.player.party,
        {
          id: tmpl.id,
          name: tmpl.name,
          race: tmpl.race,
          role: tmpl.role,
          roleLabel: tmpl.roleLabel,
          portraitUrl: tmpl.portraitUrl,
          level: 1,
          hp: tmpl.maxHp,
          maxHp: tmpl.maxHp,
          attack: tmpl.attack,
          defense: tmpl.defense,
          canAbsorbEssence: tmpl.canAbsorbEssence,
          isMainCharacter: tmpl.isMainCharacter,
        },
      ],
    },
    logs: appendLog(
      state.logs,
      state.turn,
      `ร่าย [คาถาผูกมัด] สำเร็จ! ${tmpl.name} เข้าร่วมปาร์ตี้ (-${tmpl.hireCost} Gold)`,
      'lore'
    ),
  };
}

export function rerollTavernMercenaries(state: GameState): GameState {
  const cost = 10;
  if (state.gold < cost) {
    return {
      ...state,
      logs: appendLog(state.logs, state.turn, `เงินไม่พอจ่ายค่าข่าวสอดส่องหานักสำรวจ (${cost} Gold)`, 'danger'),
    };
  }
  return {
    ...state,
    gold: state.gold - cost,
    tavernMercenaries: generateRandomMercenaries(4, state.day, state.cityId),
    logs: appendLog(
      state.logs,
      state.turn,
      `จ่าย ${cost} Gold ให้เจ้าของร้านเหล้าช่วยเรียกนักสำรวจรับจ้างชุดใหม่มาแนะนำตัว`,
      'lore'
    ),
  };
}

export function freeTavernGossip(state: GameState): GameState {
  if (state.freeRumorUsedToday) {
    return {
      ...state,
      logs: appendLog(state.logs, state.turn, 'วันนี้ฟังข่าวลือฟรีในร้านเหล้าไปแล้ว ลองสั่งเครื่องดื่มหรือรอวันพรุ่งนี้', 'info'),
    };
  }

  const nextNews = pickRandom(DAILY_LORE_NEWS);
  const picked = Math.random() < 0.65 ? pickUnknownEssenceIds(state.essenceKnowledge, 1) : [];
  let nextKnowledge = state.essenceKnowledge;
  let extraText = '';

  if (picked.length > 0) {
    const essId = picked[0];
    nextKnowledge = upgradeEssenceKnowledge(nextKnowledge, essId, 'rumor');
    extraText = ` และได้ยินข่าวลือไม่ยืนยันเกี่ยวกับ [${ESSENCES[essId].name}] (บันทึกในสารานุกรมแบบไม่ชัวร์)`;
  }

  return {
    ...state,
    freeRumorUsedToday: true,
    dailyNews: nextNews,
    essenceKnowledge: nextKnowledge,
    logs: appendLog(
      state.logs,
      state.turn,
      `${pickRandom(TAVERN_GOSSIP_LINES)}${extraText}`,
      'lore'
    ),
  };
}

export function drinkAtTavern(state: GameState): GameState {
  const cost = 15;
  if (state.gold < cost) {
    return {
      ...state,
      logs: appendLog(state.logs, state.turn, `เงินไม่พอสั่งเหล้าที่บาร์ (${cost} Gold)`, 'danger'),
    };
  }

  const picked = pickUnknownEssenceIds(state.essenceKnowledge, 1);
  let nextKnowledge = state.essenceKnowledge;
  let logText: string;

  if (picked.length > 0) {
    const ess = ESSENCES[picked[0]];
    nextKnowledge = upgradeEssenceKnowledge(nextKnowledge, ess.id, 'rumor');
    logText = `สั่งเครื่องดื่มที่ร้านเหล้า (-${cost}G) — นักสำรวจข้างโต๊ะกระซิบข่าวลือเกี่ยวกับ [${ess.name}] (สถานะ: ไม่ชัวร์ในสารานุกรม)`;
  } else {
    logText = `สั่งเครื่องดื่มที่ร้านเหล้า (-${cost}G) — ${pickRandom(TAVERN_GOSSIP_LINES)} (ไม่มีข่าวแก่นแท้ใหม่แล้ว)`;
  }

  return {
    ...state,
    gold: state.gold - cost,
    essenceKnowledge: nextKnowledge,
    player: {
      ...state.player,
      thirst: Math.min(state.player.maxThirst, state.player.thirst + 15),
    },
    logs: appendLog(state.logs, state.turn, logText, 'lore'),
  };
}

export function buyRoundAtTavern(state: GameState): GameState {
  const cost = 45;
  if (state.gold < cost) {
    return {
      ...state,
      logs: appendLog(state.logs, state.turn, `เงินไม่พอเลี้ยงเหล้าทั้งโต๊ะ (${cost} Gold)`, 'danger'),
    };
  }

  const picked = pickUnknownEssenceIds(state.essenceKnowledge, 2);
  let nextKnowledge = state.essenceKnowledge;
  for (const id of picked) {
    nextKnowledge = upgradeEssenceKnowledge(nextKnowledge, id, 'rumor');
  }
  const nextSuspicion = Math.max(0, state.player.suspicion - 8);

  const rumorNames = picked.map((id) => ESSENCES[id].name).join(', ');
  const msg =
    picked.length > 0
      ? `เลี้ยงเหล้าทั้งโต๊ะ (-${cost}G)! ได้ข่าวลือแก่นแท้เพิ่ม ${picked.length} ชิ้น: ${rumorNames} (ไม่ชัวร์) และลดความสงสัยเหลือ ${nextSuspicion}/100`
      : `เลี้ยงเหล้าทั้งโต๊ะ (-${cost}G)! ทุกคนคุยกันอย่างเป็นมิตร ความสงสัยลดลงเหลือ ${nextSuspicion}/100`;

  return {
    ...state,
    gold: state.gold - cost,
    essenceKnowledge: nextKnowledge,
    player: {
      ...state.player,
      thirst: Math.min(state.player.maxThirst, state.player.thirst + 30),
      suspicion: nextSuspicion,
    },
    logs: appendLog(state.logs, state.turn, msg, 'lore'),
  };
}

export function buyEssenceBook(state: GameState, tier: EssenceBookTier): GameState {
  if (state.purchasedEssenceBooks.includes(tier)) return state;
  const book = ESSENCE_BOOKS.find((b) => b.tier === tier);
  if (!book) return state;

  if (state.gold < book.price) {
    return {
      ...state,
      logs: appendLog(state.logs, state.turn, `เงินไม่พอซื้อ ${book.title} (ต้องการ ${book.price} Gold)`, 'danger'),
    };
  }

  let nextKnowledge = state.essenceKnowledge;
  for (const id of book.essenceIds) {
    nextKnowledge = upgradeEssenceKnowledge(nextKnowledge, id, 'guild');
  }

  return {
    ...state,
    gold: state.gold - book.price,
    essenceKnowledge: nextKnowledge,
    purchasedEssenceBooks: [...state.purchasedEssenceBooks, tier],
    logs: appendLog(
      state.logs,
      state.turn,
      `ซื้อ [${book.title}] จากกิลด์ (-${book.price}G)! บันทึกข้อมูลแก่นแท้ ${book.essenceIds.length} ชนิดระดับ "ยืนยันโดยกิลด์" ลงในสารานุกรมแล้ว`,
      'lore'
    ),
  };
}

export function dismissPartyMember(state: GameState, memberId: string): GameState {
  const target = state.player.party.find((p) => p.id === memberId);
  if (!target) return state;
  return {
    ...state,
    player: {
      ...state.player,
      party: state.player.party.filter((p) => p.id !== memberId),
    },
    logs: appendLog(state.logs, state.turn, `ยกเลิกสัญญาปาร์ตี้กับ ${target.name}`, 'info'),
  };
}

export function payTaxInCity(state: GameState): GameState {
  if (state.taxDue <= 0) return state;
  if (state.gold < state.taxDue) {
    return {
      ...state,
      logs: appendLog(state.logs, state.turn, `เงินไม่พอจ่ายภาษี (${state.taxDue} Gold)!`, 'danger'),
    };
  }
  const paid = state.taxDue;
  return {
    ...state,
    gold: state.gold - paid,
    taxDue: 0,
    logs: appendLog(state.logs, state.turn, `ชำระภาษีเมืองลาฟโดเนีย ${paid} Gold เรียบร้อยแล้ว`, 'success'),
  };
}

export function purifyCursesAtTemple(state: GameState): GameState {
  if (state.player.curses <= 0) return state;
  const cost = state.player.curses * 15;
  if (state.gold < cost) {
    return {
      ...state,
      logs: appendLog(state.logs, state.turn, `เงินไม่พอทำพิธีล้างคำสาป (ต้องการ ${cost} Gold)`, 'danger'),
    };
  }
  return {
    ...state,
    gold: state.gold - cost,
    player: {
      ...state.player,
      curses: 0,
    },
    logs: appendLog(state.logs, state.turn, `ทำพิธีล้างคำสาปที่วิหารสำเร็จ (-${cost} Gold)`, 'success'),
  };
}

export function extractEssenceAtTemple(state: GameState, essenceId: string): GameState {
  const ess = state.player.essences.find((e) => e.id === essenceId);
  if (!ess) return state;
  const cost = 100;
  if (state.gold < cost) {
    return {
      ...state,
      logs: appendLog(state.logs, state.turn, `เงินไม่พอถอดแก่นแท้ที่วิหาร (ต้องการ ${cost} Gold)`, 'danger'),
    };
  }
  return {
    ...state,
    gold: state.gold - cost,
    player: {
      ...state.player,
      essences: state.player.essences.filter((e) => e.id !== essenceId),
    },
    logs: appendLog(
      state.logs,
      state.turn,
      `ถอด ${ess.name} ออกจากจิตวิญญาณที่วิหารสำเร็จ (-${cost} Gold)`,
      'lore'
    ),
  };
}

export function useGamerKnowledge(state: GameState): GameState {
  if (state.gamerKnowledgeUsed) return state;
  return {
    ...state,
    gamerKnowledgeUsed: true,
    logs: appendLog(
      state.logs,
      state.turn,
      'ใช้ความรู้จากเกม 9 ปี: รู้ทันกลโกงพ่อค้าในตลาดกลางอาร์มินัส! ราคาซื้อ-ขายเป็นธรรมแล้ว',
      'lore'
    ),
  };
}

export function buyRank7Lore(state: GameState): GameState {
  if (state.unlockedCorpseGolemLore) return state;
  const cost = 80;
  if (state.gold < cost) {
    return {
      ...state,
      logs: appendLog(state.logs, state.turn, `เงินไม่พอซื้อข้อมูลจากกิลด์ (ต้องการ ${cost} Gold)`, 'danger'),
    };
  }
  return {
    ...state,
    gold: state.gold - cost,
    unlockedCorpseGolemLore: true,
    logs: appendLog(
      state.logs,
      state.turn,
      'ปลดล็อกข้อมูล Rank 3–7: เคล็ดลับผ่านชั้น 1–7 และบอสประจำชั้น!',
      'lore'
    ),
  };
}

export function repairArmorInCity(state: GameState): GameState {
  if (state.player.armorDurability >= 100) return state;
  const cost = 35;
  if (state.gold < cost) {
    return {
      ...state,
      logs: appendLog(state.logs, state.turn, `เงินไม่พอซ่อมเกราะ (ต้องการ ${cost} Gold)`, 'danger'),
    };
  }
  return {
    ...state,
    gold: state.gold - cost,
    player: {
      ...state.player,
      armorDurability: 100,
    },
    logs: appendLog(state.logs, state.turn, 'ซ่อมแซมชุดเกราะกลับสู่สภาพ 100%', 'success'),
  };
}

export function advanceClosedCycle(state: GameState): GameState {
  if (state.labyrinthOpenDaysLeft > 0) return state;
  const nextDay = state.day + 21;
  const newTax = state.taxDue > 0 ? state.taxDue + 250 : 250;
  return {
    ...state,
    day: nextDay,
    labyrinthOpenDaysLeft: 7,
    taxDue: newTax,
    taxDeadlineDay: nextDay + 6,
    freeRumorUsedToday: false,
    tavernMercenaries: generateRandomMercenaries(4, nextDay, state.cityId),
    auctionListings: generateAuctionListings(nextDay),
    dailyNews: pickRandom(DAILY_LORE_NEWS),
    logs: appendLog(
      state.logs,
      state.turn,
      `เวลาผ่านไป 3 สัปดาห์ (วันที่ ${nextDay}) — เขาวงกตเปิดทำการอีกครั้ง (7 วัน) และภาษีรอบใหม่คือ ${newTax} Gold`,
      'lore'
    ),
  };
}

export function restAtInn(state: GameState): GameState {
  if (state.gold < state.livingCostPerDay) {
    return {
      ...state,
      logs: appendLog(
        state.logs,
        state.turn,
        `เงินไม่พอจ่ายค่าที่พักรายวัน (${state.livingCostPerDay} Gold)!`,
        'danger'
      ),
    };
  }

  const nextDay = state.day + 1;
  if (state.taxDue > 0 && nextDay > state.taxDeadlineDay) {
    return {
      ...state,
      phase: 'gameover',
      gameOverReason:
        'คุณค้างชำระภาษีเมืองลาฟโดเนียเกินกำหนด — ในกฎหมายอาณาจักร ผู้ไม่มีเงินจ่ายภาษีจะถูกประหารชีวิต',
    };
  }

  const stats = getEffectiveStats(state.player);
  const nextOpenDays = Math.max(0, state.labyrinthOpenDaysLeft - 1);

  return {
    ...state,
    day: nextDay,
    gold: state.gold - state.livingCostPerDay,
    labyrinthOpenDaysLeft: nextOpenDays,
    freeRumorUsedToday: false,
    tavernMercenaries: generateRandomMercenaries(4, nextDay, state.cityId),
    auctionListings: generateAuctionListings(nextDay),
    dailyNews: pickRandom(DAILY_LORE_NEWS),
    player: {
      ...state.player,
      hp: stats.maxHp,
      mana: stats.manaPool,
      thirst: state.player.maxThirst,
      bleedTurns: 0,
      blindTurns: 0,
      party: state.player.party.map((p) => ({ ...p, hp: p.maxHp })),
    },
    logs: appendLog(
      state.logs,
      state.turn,
      `พักผ่อนที่โรงแรม (วันที่ ${nextDay}) — ฟื้นฟูตัวละครและปาร์ตี้เต็ม! (เขาวงกตเปิดอีก ${nextOpenDays} วัน)`,
      'success'
    ),
  };
}
