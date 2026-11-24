import { useState } from 'react';
import {
  BedDouble,
  BookMarked,
  Coins,
  Compass,
  Landmark,
  ShoppingBag,
  Users,
  Wrench,
} from 'lucide-react';
import { ESSENCES, FLOORS, ITEMS, PARTY_ROSTER, RACES } from '../data/loreData';
import { getBuyPrice, getSellPrice } from '../engine/gameEngine';
import { FloorId, GameState } from '../types/game';

interface CityViewProps {
  state: GameState;
  onBuyItem: (itemId: string) => void;
  onSellStones: () => void;
  onSellVial: (vialUid: string) => void;
  onHireParty: (memberId: string) => void;
  onDismissParty: (memberId: string) => void;
  onPayTax: () => void;
  onPurifyCurses: () => void;
  onExtractEssence: (essenceId: string) => void;
  onUseGamerKnowledge: () => void;
  onBuyRank7Lore: () => void;
  onRepairArmor: () => void;
  onRestInn: () => void;
  onAdvanceClosedCycle: () => void;
  onEnterLabyrinth: (floor: FloorId) => void;
}

type CityTab = 'hub' | 'market' | 'party' | 'temple';

const SHOP_ITEM_IDS = [
  'ration_meal',
  'healing_potion',
  'torch',
  'bandage',
  'holy_water',
  'essence_vial',
  'one_hand_hammer',
  'iron_greataxe',
  'acro_longsword',
  'acid_leather_armor',
  'adamantium_plate',
  'laetium_shield',
  'expandable_bag',
  'ship_license',
];

export function CityView({
  state,
  onBuyItem,
  onSellStones,
  onSellVial,
  onHireParty,
  onDismissParty,
  onPayTax,
  onPurifyCurses,
  onExtractEssence,
  onUseGamerKnowledge,
  onBuyRank7Lore,
  onRepairArmor,
  onRestInn,
  onAdvanceClosedCycle,
  onEnterLabyrinth,
}: CityViewProps) {
  const [activeTab, setActiveTab] = useState<CityTab>('hub');
  const [selectedFloor, setSelectedFloor] = useState<FloorId>(state.currentFloor);

  const stoneEntry = state.player.inventory.find((e) => e.item.id === 'magic_stone');
  const stoneCount = stoneEntry?.quantity ?? 0;
  const stoneSellUnit = getSellPrice(state, 'magic_stone');
  const race = RACES[state.player.raceId];

  return (
    <div className="card">
      <div className="tab-bar">
        <button
          type="button"
          className={`tab-btn ${activeTab === 'hub' ? 'tab-btn-active' : ''}`}
          onClick={() => setActiveTab('hub')}
        >
          <Compass size={16} /> ศูนย์กลาง &amp; ดันเจี้ยน
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'market' ? 'tab-btn-active' : ''}`}
          onClick={() => setActiveTab('market')}
        >
          <ShoppingBag size={16} /> ตลาดอาร์มินัส
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'party' ? 'tab-btn-active' : ''}`}
          onClick={() => setActiveTab('party')}
        >
          <Users size={16} /> สำนักงานปาร์ตี้
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'temple' ? 'tab-btn-active' : ''}`}
          onClick={() => setActiveTab('temple')}
        >
          <Landmark size={16} /> วิหาร &amp; ภาษี
        </button>
      </div>

      {activeTab === 'hub' && (
        <div style={{ display: 'grid', gap: 12 }}>
          <div
            className="stat-box"
            style={{
              padding: 14,
              borderColor: 'rgba(245, 158, 11, 0.45)',
              background: 'linear-gradient(135deg, rgba(217, 119, 6, 0.14), rgba(16, 22, 35, 0.9))',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#fbbf24' }}>
                ประตูสู่เขาวงกต ({state.labyrinthOpenDaysLeft > 0 ? `เปิดอีก ${state.labyrinthOpenDaysLeft} วัน` : 'ปิดทำการชั่วคราว'})
              </div>
              {state.taxDue > 0 && (
                <span className="badge badge-warn">
                  ภาษีค้างชำระ: {state.taxDue} G (ภายในวันที่ {state.taxDeadlineDay})
                </span>
              )}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '10px 0' }}>
              {state.discoveredFloors.map((fid) => (
                <button
                  key={fid}
                  type="button"
                  className={`btn btn-sm ${selectedFloor === fid ? 'btn-primary' : ''}`}
                  onClick={() => setSelectedFloor(fid)}
                >
                  ชั้น {fid}
                </button>
              ))}
            </div>

            <p style={{ fontSize: '0.92rem', color: '#dbe4f0', margin: '0 0 12px' }}>
              <strong>{FLOORS[selectedFloor].thaiName}:</strong> {FLOORS[selectedFloor].description}{' '}
              (แนะนำ Lv.{FLOORS[selectedFloor].recommendedLevel}+)
            </p>

            {state.labyrinthOpenDaysLeft > 0 ? (
              <button className="btn btn-primary" onClick={() => onEnterLabyrinth(selectedFloor)}>
                <Compass size={17} /> เข้าสู่ {FLOORS[selectedFloor].thaiName} (-1 วัน)
              </button>
            ) : (
              <button className="btn btn-lore" onClick={onAdvanceClosedCycle}>
                รอเขาวงกตเปิดรอบถัดไป (ข้าม 21 วัน)
              </button>
            )}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(215px, 1fr))',
              gap: 10,
            }}
          >
            <div className="shop-item">
              <div>
                <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Coins size={16} color="#fbbf24" /> แลก Magic Stones
                </div>
                <div style={{ fontSize: '0.88rem', color: '#9aa9c1', marginTop: 4 }}>
                  มีอยู่ {stoneCount} ชิ้น (รับซื้อ {stoneSellUnit} G/ชิ้น)
                </div>
              </div>
              <button className="btn btn-sm" onClick={onSellStones} disabled={stoneCount === 0}>
                ขายทั้งหมด ({stoneCount * stoneSellUnit} G)
              </button>
            </div>

            <div className="shop-item">
              <div>
                <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <BedDouble size={16} color="#38bdf8" /> โรงแรมในลาฟโดเนีย
                </div>
                <div style={{ fontSize: '0.88rem', color: '#9aa9c1', marginTop: 4 }}>
                  พักผ่อนข้ามวัน ฟื้นตัวละคร &amp; ปาร์ตี้เต็ม
                </div>
              </div>
              <button className="btn btn-sm" onClick={onRestInn}>
                พักค้างคืน ({state.livingCostPerDay} G)
              </button>
            </div>

            <div className="shop-item">
              <div>
                <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Wrench size={16} color="#cbd5e1" /> ช่างตีเหล็ก
                </div>
                <div style={{ fontSize: '0.88rem', color: '#9aa9c1', marginTop: 4 }}>
                  ความทนทานเกราะปัจจุบัน: {state.player.armorDurability}%
                </div>
              </div>
              <button
                className="btn btn-sm"
                onClick={onRepairArmor}
                disabled={state.player.armorDurability >= 100}
              >
                ซ่อมเกราะ (35 G)
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'market' && (
        <div style={{ display: 'grid', gap: 12 }}>
          <div
            className="stat-box"
            style={{
              padding: 10,
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <div style={{ fontSize: '0.9rem', color: '#cbd5e1' }}>
              เรทราคาเผ่า {race.name}:{' '}
              {state.gamerKnowledgeUsed ? (
                <strong style={{ color: '#86efac' }}>เป็นธรรม 100% (ใช้ความรู้ 9 ปีแล้ว)</strong>
              ) : (
                <span>
                  ซื้อ {Math.round(race.merchantBuyMultiplier * 100)}% / ขาย{' '}
                  {Math.round(race.merchantSellMultiplier * 100)}%
                </span>
              )}
            </div>
            {!state.gamerKnowledgeUsed && (
              <button className="btn btn-lore btn-sm" onClick={onUseGamerKnowledge}>
                ใช้ความรู้ 9 ปี: รู้ทันกลโกงพ่อค้า
              </button>
            )}
          </div>

          {state.player.storedVials.length > 0 && (
            <div className="stat-box" style={{ padding: 12, borderColor: 'rgba(168, 85, 247, 0.4)' }}>
              <div style={{ fontWeight: 700, fontSize: '0.94rem', color: '#e9d5ff', marginBottom: 8 }}>
                ขายหลอดบรรจุแก่นแท้ (ตลาดกลางอาร์มินัส)
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {state.player.storedVials.map((vial) => {
                  const ess = ESSENCES[vial.essenceId];
                  return (
                    <button
                      key={vial.uid}
                      className="btn btn-sm btn-primary"
                      onClick={() => onSellVial(vial.uid)}
                    >
                      ขาย {ess.name} (+{ess.marketValue} G)
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="shop-list">
            {SHOP_ITEM_IDS.map((id) => {
              const item = ITEMS[id];
              const price = getBuyPrice(state, id);
              const licenseOwned = Boolean(item.isShipLicense && state.player.hasShipLicense);
              return (
                <div key={id} className="shop-item">
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.96rem' }}>{item.name}</div>
                    <div style={{ fontSize: '0.86rem', color: '#9aa9c1', marginTop: 4 }}>
                      {item.description}
                    </div>
                    <div style={{ fontSize: '0.84rem', color: '#cbd5e1', marginTop: 4 }}>
                      น้ำหนัก: {item.weight} kg
                    </div>
                  </div>
                  <button
                    className="btn btn-sm"
                    disabled={state.gold < price || licenseOwned}
                    onClick={() => onBuyItem(id)}
                  >
                    {licenseOwned ? 'มีใบอนุญาตแล้ว' : `ซื้อ (${price} Gold)`}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'party' && (
        <div style={{ display: 'grid', gap: 12 }}>
          <div className="stat-box" style={{ padding: 12, fontSize: '0.92rem', color: '#cbd5e1' }}>
            <strong>สำนักงานจัดการเขาวงกต — คาถาผูกมัด:</strong>{' '}
            ร่ายคาถาผูกมัดเพื่อเดินทางผ่านพอร์ทัลและต่อสู้ร่วมกัน (จ้างได้สูงสุด 2 คน · ปัจจุบัน{' '}
            {state.player.party.length}/2)
          </div>

          <div className="shop-list">
            {Object.values(PARTY_ROSTER).map((member) => {
              const isHired = state.player.party.some((p) => p.id === member.id);
              return (
                <div key={member.id} className="shop-item">
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <div className="portrait-frame portrait-sm">
                      <img src={member.portraitUrl} alt={member.name} className="portrait-img" />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{member.name}</div>
                      <div style={{ fontSize: '0.84rem', color: '#fbbf24' }}>
                        {member.race} · {member.roleLabel}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.86rem', color: '#9aa9c1' }}>{member.description}</div>
                  <div style={{ fontSize: '0.84rem', color: '#cbd5e1' }}>
                    HP {member.maxHp} · ATK {member.attack} · DEF {member.defense}
                  </div>
                  {isHired ? (
                    <button className="btn btn-sm" onClick={() => onDismissParty(member.id)}>
                      ยกเลิกสัญญา
                    </button>
                  ) : (
                    <button
                      className="btn btn-sm btn-primary"
                      disabled={state.player.party.length >= 2 || state.gold < member.hireCost}
                      onClick={() => onHireParty(member.id)}
                    >
                      ทำสัญญา ({member.hireCost} Gold)
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'temple' && (
        <div style={{ display: 'grid', gap: 12 }}>
          <div className="shop-list">
            <div className="shop-item">
              <div>
                <div style={{ fontWeight: 700, color: '#fbbf24', fontSize: '0.98rem' }}>
                  ภาษีราชวงศ์ลาฟโดเนีย
                </div>
                <div style={{ fontSize: '0.88rem', color: '#9aa9c1', marginTop: 4 }}>
                  {state.taxDue > 0
                    ? `ค้างชำระ ${state.taxDue} Gold (กำหนดภายในวันที่ ${state.taxDeadlineDay})`
                    : 'ชำระภาษีรอบปัจจุบันครบถ้วนแล้ว'}
                </div>
              </div>
              <button
                className="btn btn-sm btn-primary"
                disabled={state.taxDue <= 0 || state.gold < state.taxDue}
                onClick={onPayTax}
              >
                ชำระภาษี ({state.taxDue} Gold)
              </button>
            </div>

            <div className="shop-item">
              <div>
                <div style={{ fontWeight: 700, color: '#93c5fd', fontSize: '0.98rem' }}>
                  พิธีล้างคำสาปที่วิหาร
                </div>
                <div style={{ fontSize: '0.88rem', color: '#9aa9c1', marginTop: 4 }}>
                  คำสาปสะสม: {state.player.curses}/15 (ทุก 3 คำสาปลดสเตตัส · ครบ 12 เสียเลือดต่อเทิร์น)
                </div>
              </div>
              <button
                className="btn btn-sm"
                disabled={state.player.curses <= 0 || state.gold < state.player.curses * 15}
                onClick={onPurifyCurses}
              >
                ล้างคำสาป ({state.player.curses * 15} Gold)
              </button>
            </div>
          </div>

          {state.player.essences.length > 0 && (
            <div className="stat-box" style={{ padding: 12 }}>
              <div style={{ fontWeight: 700, fontSize: '0.94rem', marginBottom: 8 }}>
                ถอดแก่นแท้ที่วิหาร (100 Gold / ชิ้น)
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {state.player.essences.map((ess) => (
                  <button
                    key={ess.id}
                    className="btn btn-sm"
                    disabled={state.gold < 100}
                    onClick={() => onExtractEssence(ess.id)}
                  >
                    ถอด {ess.name} (100 G)
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="stat-box" style={{ padding: 14 }}>
            <div style={{ fontWeight: 700, color: '#e9d5ff', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.96rem' }}>
              <BookMarked size={16} /> กิลด์นักผจญภัย — ข่าวกรองชั้น 1–7
            </div>
            <p style={{ fontSize: '0.88rem', color: '#9aa9c1', margin: '6px 0 10px' }}>
              ซื้อข้อมูลมอนสเตอร์ระดับสูง กฎชั้น 5–7 และบอสประจำชั้น
            </p>
            {!state.unlockedCorpseGolemLore ? (
              <button className="btn btn-sm btn-lore" onClick={onBuyRank7Lore}>
                ซื้อข้อมูลจากกิลด์ (80 Gold)
              </button>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 20, fontSize: '0.88rem', color: '#cbd5e1', display: 'grid', gap: 5 }}>
                <li>
                  <strong>ชั้น 4 ป่าดอปเปลแกงเกอร์:</strong> ร่างโคลนไม่ดรอปของ ต้องปราบตัวจริง
                </li>
                <li>
                  <strong>ชั้น 5:</strong> ต้องมีแก่นแท้อย่างน้อย 5 ชิ้น ไม่งั้นโดนตีแรงขึ้น +30%
                </li>
                <li>
                  <strong>ชั้น 6 มหาสมุทรใหญ่:</strong> ต้องซื้อใบอนุญาตเดินเรือ (350G) ก่อนลง
                </li>
                <li>
                  <strong>ชั้น 7 ทวีปทมิฬ:</strong> หมอกดำลด Vision -1 ถาวร พกคบไฟหรือจ้างเออร์เวน!
                </li>
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
