import { ESSENCES, ITEMS, PARTY_ROSTER } from '../data/loreData';
import { GameState } from '../types/game';
import {
  addItemToInventory,
  appendLog,
  getBuyPrice,
  getEffectiveStats,
  getSellPrice,
  removeItemFromInventory,
} from './gameEngine';

export function buyItemInCity(state: GameState, itemId: string): GameState {
  const item = ITEMS[itemId];
  if (!item) return state;
  const price = getBuyPrice(state, itemId);
  if (state.gold < price) {
    return {
      ...state,
      logs: appendLog(state.logs, state.turn, `เงินไม่พอซื้อ ${item.name} (ต้องการ ${price} Gold)`, 'danger'),
    };
  }

  if (item.isShipLicense) {
    if (state.player.hasShipLicense) return state;
    return {
      ...state,
      gold: state.gold - price,
      player: { ...state.player, hasShipLicense: true },
      logs: appendLog(state.logs, state.turn, `ซื้อ ${item.name} ราคา ${price} Gold (ปลดล็อกชั้นที่ 6!)`, 'lore'),
    };
  }

  const nextPlayer = {
    ...state.player,
    inventory: addItemToInventory(state.player.inventory, itemId, 1),
  };

  if (item.type === 'weapon') {
    nextPlayer.equippedWeaponId = itemId;
  } else if (item.type === 'armor') {
    nextPlayer.equippedArmorId = itemId;
    nextPlayer.armorDurability = 100;
  } else if (item.type === 'shield') {
    nextPlayer.equippedShieldId = itemId;
  } else if (item.type === 'bag') {
    nextPlayer.hasExpandableBag = true;
  }

  return {
    ...state,
    gold: state.gold - price,
    player: nextPlayer,
    logs: appendLog(state.logs, state.turn, `ซื้อ ${item.name} ราคา ${price} Gold`, 'success'),
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
      `ขายหลอดบรรจุ ${ess.name} ที่ตลาดกลางอาร์มินัส ได้รับ ${price} Gold!`,
      'success'
    ),
  };
}

export function hirePartyMember(state: GameState, memberId: string): GameState {
  const tmpl = PARTY_ROSTER[memberId];
  if (!tmpl) return state;
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
          hp: tmpl.maxHp,
          maxHp: tmpl.maxHp,
          attack: tmpl.attack,
          defense: tmpl.defense,
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
