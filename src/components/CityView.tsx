import { useState } from 'react';
import {
  Award,
  BedDouble,
  Beer,
  BookMarked,
  BookOpen,
  Coins,
  Compass,
  Landmark,
  Lock,
  MapPin,
  Newspaper,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  Users,
  Wrench,
} from 'lucide-react';
import {
  ESSENCE_BOOKS,
  ESSENCES,
  FLOORS,
  isMainCharacterUnlocked,
  ITEMS,
  PARTY_ROSTER,
  RACES,
  SYNERGY_BONUSES,
} from '../data/loreData';
import { getBuyPrice, getSellPrice } from '../engine/gameEngine';
import { CityId, EssenceBookTier, FloorId, GameState } from '../types/game';

interface CityViewProps {
  state: GameState;
  onBuyItem: (itemId: string, quantity?: number) => void;
  onSellStones: () => void;
  onSellVial: (vialUid: string) => void;
  onAuctionSellVial: (vialUid: string) => void;
  onBuyAuctionEssence: (listingId: string) => void;
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
  onSwitchCity: (city: CityId) => void;
  onOpenCommunity: () => void;
  onRefreshNews: () => void;
  onFreeTavernGossip: () => void;
  onDrinkTavern: () => void;
  onBuyRoundTavern: () => void;
  onBuyEssenceBook: (tier: EssenceBookTier) => void;
  onRerollMercenaries: () => void;
}

type CityTab = 'hub' | 'inn' | 'market' | 'party' | 'temple';
type PartyFilter = 'all' | 'main' | 'merc';
type MarketSubTab = 'shop' | 'auction';

const LAFDONIA_SHOP_IDS = [
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

const NOARK_SHOP_IDS = [
  'memory_potion',
  'number_35_claw',
  'number_77_amulet',
  'number_12_cloak',
  'essence_vial',
  'acid_leather_armor',
  'healing_potion',
];

export function CityView({
  state,
  onBuyItem,
  onSellStones,
  onSellVial,
  onAuctionSellVial,
  onBuyAuctionEssence,
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
  onSwitchCity,
  onOpenCommunity,
  onRefreshNews,
  onFreeTavernGossip,
  onDrinkTavern,
  onBuyRoundTavern,
  onBuyEssenceBook,
  onRerollMercenaries,
}: CityViewProps) {
  const [activeTab, setActiveTab] = useState<CityTab>('hub');
  const [selectedFloor, setSelectedFloor] = useState<FloorId>(state.currentFloor);
  const [partyFilter, setPartyFilter] = useState<PartyFilter>('all');
  const [marketSubTab, setMarketSubTab] = useState<MarketSubTab>('shop');

  const stoneEntry = state.player.inventory.find((e) => e.item.id === 'magic_stone');
  const stoneCount = stoneEntry?.quantity ?? 0;
  const stoneSellUnit = getSellPrice(state, 'magic_stone');
  const race = RACES[state.player.raceId];
  const shopIds = state.cityId === 'noark' ? NOARK_SHOP_IDS : LAFDONIA_SHOP_IDS;
  const totalEssencesCount = Object.keys(ESSENCES).length;
  const knownEssencesCount = Object.values(state.essenceKnowledge).filter((lvl) => lvl !== 'unknown').length;

  return (
    <div className="card">
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 8,
          marginBottom: 10,
        }}
      >
        <div className="tab-bar" style={{ margin: 0, border: 'none', padding: 0 }}>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'hub' ? 'tab-btn-active' : ''}`}
            onClick={() => setActiveTab('hub')}
          >
            <Compass size={16} /> ศูนย์กลาง
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'inn' ? 'tab-btn-active' : ''}`}
            onClick={() => setActiveTab('inn')}
          >
            <Beer size={16} /> โรงแรม &amp; ร้านเหล้า
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'market' ? 'tab-btn-active' : ''}`}
            onClick={() => setActiveTab('market')}
          >
            <ShoppingBag size={16} /> {state.cityId === 'noark' ? 'ตลาดมืดโนอาร์ค' : 'ตลาด & ประมูล'}
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'party' ? 'tab-btn-active' : ''}`}
            onClick={() => setActiveTab('party')}
          >
            <Users size={16} /> ปาร์ตี้ ({state.player.party.length}/2)
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'temple' ? 'tab-btn-active' : ''}`}
            onClick={() => setActiveTab('temple')}
          >
            <Landmark size={16} /> วิหาร &amp; กิลด์
          </button>
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-sm btn-lore" onClick={onOpenCommunity}>
            <Award size={14} /> ภารกิจ &amp; GP ({state.player.gp})
          </button>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => onSwitchCity(state.cityId === 'lafdonia' ? 'noark' : 'lafdonia')}
          >
            <MapPin size={14} />
            {state.cityId === 'lafdonia' ? 'ไปเมืองใต้ดินโนอาร์ค' : 'กลับลาฟโดเนีย'}
          </button>
        </div>
      </div>

      {activeTab === 'hub' && (
        <div style={{ display: 'grid', gap: 12 }}>
          <div
            className="stat-box"
            style={{
              padding: 14,
              borderColor:
                state.cityId === 'noark'
                  ? 'rgba(168, 85, 247, 0.5)'
                  : 'rgba(245, 158, 11, 0.45)',
              background:
                state.cityId === 'noark'
                  ? 'linear-gradient(135deg, rgba(109, 40, 217, 0.16), rgba(16, 22, 35, 0.9))'
                  : 'linear-gradient(135deg, rgba(217, 119, 6, 0.14), rgba(16, 22, 35, 0.9))',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#fbbf24' }}>
                {state.cityId === 'noark'
                  ? 'เมืองใต้ดินโนอาร์ค (เมืองแห่งสัตว์ร้าย)'
                  : 'เมืองบนพื้นผิว: ลาฟโดเนีย'}{' '}
                · ({state.labyrinthOpenDaysLeft > 0 ? `เขาวงกตเปิดอีก ${state.labyrinthOpenDaysLeft} วัน` : 'ปิดชั่วคราว'})
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
            className="stat-box"
            style={{
              padding: '10px 14px',
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 10,
              borderColor: 'rgba(56, 189, 248, 0.35)',
            }}
          >
            <div style={{ fontSize: '0.88rem', color: '#dbe4f0', flex: '1 1 280px' }}>
              <strong style={{ color: '#7dd3fc', display: 'inline-flex', alignItems: 'center', gap: 5, marginRight: 6 }}>
                <Newspaper size={14} /> ข่าวสารประจำวัน:
              </strong>
              {state.dailyNews}
            </div>
            <button type="button" className="btn btn-sm" onClick={onRefreshNews}>
              ฟังข่าวลือใหม่
            </button>
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
                  <BedDouble size={16} color="#38bdf8" /> โรงแรม &amp; ร้านเหล้า ({state.cityId === 'noark' ? 'โนอาร์ค' : 'ลาฟโดเนีย'})
                </div>
                <div style={{ fontSize: '0.88rem', color: '#9aa9c1', marginTop: 4 }}>
                  พักผ่อนข้ามวัน หรือแวะร้านเหล้าสืบข่าวแก่นแท้
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button className="btn btn-sm" onClick={onRestInn}>
                  พักค้างคืน ({state.livingCostPerDay} G)
                </button>
                <button className="btn btn-sm btn-lore" onClick={() => setActiveTab('inn')}>
                  เข้าร้านเหล้า
                </button>
              </div>
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

      {activeTab === 'inn' && (
        <div style={{ display: 'grid', gap: 12 }}>
          <div
            className="stat-box"
            style={{
              padding: 14,
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 10,
              borderColor: 'rgba(245, 158, 11, 0.45)',
            }}
          >
            <div>
              <div style={{ fontWeight: 700, fontSize: '1.02rem', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Beer size={18} />
                {state.cityId === 'noark' ? 'โรงแรม & บาร์ใต้ดินโนอาร์ค' : 'โรงเตี๊ยมนักสำรวจแห่งลาฟโดเนีย'}
              </div>
              <div style={{ fontSize: '0.88rem', color: '#cbd5e1', marginTop: 4 }}>
                พักค้างคืนเพื่อฟื้นพลังเต็มและสุ่มนักสำรวจชุดใหม่ หรือดื่มเหล้าสืบข่าวแก่นแท้ (คำบอกเล่าในร้านเหล้ามีสถานะ "ไม่ชัวร์")
              </div>
            </div>
            <span className="badge badge-lore">
              <BookOpen size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              สารานุกรมแก่นแท้: {knownEssencesCount}/{totalEssencesCount}
            </span>
          </div>

          <div className="shop-list">
            <div className="shop-item">
              <div>
                <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, color: '#7dd3fc' }}>
                  <BedDouble size={16} /> พักค้างคืนที่ห้องพัก
                </div>
                <div style={{ fontSize: '0.86rem', color: '#9aa9c1', marginTop: 4 }}>
                  ข้ามสู่วันใหม่ (เหลือเปิด {Math.max(0, state.labyrinthOpenDaysLeft - 1)} วัน) ฟื้น HP/Mana/Thirst และปาร์ตี้เต็ม พร้อมสุ่มนักสำรวจใหม่
                </div>
              </div>
              <button className="btn btn-sm btn-primary" onClick={onRestInn}>
                พักค้างคืน ({state.livingCostPerDay} G)
              </button>
            </div>

            <div className="shop-item">
              <div>
                <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, color: '#fde68a' }}>
                  <Newspaper size={16} /> นั่งฟังข่าวลือหน้าเคาน์เตอร์
                </div>
                <div style={{ fontSize: '0.86rem', color: '#9aa9c1', marginTop: 4 }}>
                  ฟรีวันละ 1 ครั้ง — ฟังเรื่องเล่าประจำวัน และมีโอกาส 65% ได้ข่าวลือแก่นแท้ 1 ชนิด (ไม่ชัวร์)
                </div>
              </div>
              <button
                className="btn btn-sm"
                disabled={state.freeRumorUsedToday}
                onClick={onFreeTavernGossip}
              >
                {state.freeRumorUsedToday ? 'ฟังของวันนี้แล้ว' : 'ฟังข่าวลือ (ฟรี)'}
              </button>
            </div>

            <div className="shop-item">
              <div>
                <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, color: '#fbbf24' }}>
                  <Beer size={16} /> สั่งเครื่องดื่มคุยกับโต๊ะข้าง ๆ
                </div>
                <div style={{ fontSize: '0.86rem', color: '#9aa9c1', marginTop: 4 }}>
                  ฟื้น Thirst +15 และปลดล็อกข่าวลือแก่นแท้ใหม่ 1 ชนิดในสารานุกรม (ระดับ: ไม่ชัวร์)
                </div>
              </div>
              <button
                className="btn btn-sm btn-lore"
                disabled={state.gold < 15}
                onClick={onDrinkTavern}
              >
                สั่งเหล้า (15 G)
              </button>
            </div>

            <div className="shop-item">
              <div>
                <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, color: '#e9d5ff' }}>
                  <Sparkles size={16} /> เลี้ยงเหล้าทั้งโต๊ะ!
                </div>
                <div style={{ fontSize: '0.86rem', color: '#9aa9c1', marginTop: 4 }}>
                  ฟื้น Thirst +30, ปลดล็อกข่าวลือแก่นแท้สูงสุด 2 ชนิด และสร้างสัมพันธ์กับคนพื้นเมือง (ความสงสัย -8)
                </div>
              </div>
              <button
                className="btn btn-sm btn-primary"
                disabled={state.gold < 45}
                onClick={onBuyRoundTavern}
              >
                เลี้ยงเหล้าทั้งร้าน (45 G)
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'market' && (
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="button"
                className={`btn btn-sm ${marketSubTab === 'shop' ? 'btn-primary' : ''}`}
                onClick={() => setMarketSubTab('shop')}
              >
                ร้านค้าอุปกรณ์ &amp; เสบียง
              </button>
              <button
                type="button"
                className={`btn btn-sm ${marketSubTab === 'auction' ? 'btn-lore' : ''}`}
                onClick={() => setMarketSubTab('auction')}
              >
                <Sparkles size={14} /> โรงประมูลแก่นแท้ (+35%)
              </button>
            </div>
            {state.cityId === 'lafdonia' && !state.gamerKnowledgeUsed && (
              <button className="btn btn-lore btn-sm" onClick={onUseGamerKnowledge}>
                ใช้ความรู้ 9 ปี: รู้ทันกลโกงพ่อค้า
              </button>
            )}
          </div>

          {marketSubTab === 'shop' ? (
            <>
              <div className="stat-box" style={{ padding: 10, fontSize: '0.88rem', color: '#e6dac8' }}>
                {state.cityId === 'noark' ? (
                  <strong style={{ color: '#e9d8fd' }}>
                    ตลาดมืดโนอาร์ค: ปลอดค่าปรับบาร์บาเรียน (100%) และมีนัมเบอร์ไอเทมขาย!
                  </strong>
                ) : (
                  <>
                    เรทราคาเผ่า {race.name}:{' '}
                    {state.gamerKnowledgeUsed ? (
                      <strong style={{ color: '#86efac' }}>เป็นธรรม 100% (ใช้ความรู้ 9 ปีแล้ว)</strong>
                    ) : (
                      <span>
                        ซื้อ {Math.round(race.merchantBuyMultiplier * 100)}% / ขาย{' '}
                        {Math.round(race.merchantSellMultiplier * 100)}%
                      </span>
                    )}
                  </>
                )}
              </div>

              {state.player.storedVials.length > 0 && (
                <div className="stat-box" style={{ padding: 12, borderColor: 'rgba(159, 122, 234, 0.45)' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#e9d8fd', marginBottom: 8 }}>
                    ขายหลอดแก่นแท้ที่หน้าร้าน (แนะนำไปแท็บ "โรงประมูลแก่นแท้" เพื่อรับราคา +35%!)
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {state.player.storedVials.map((vial) => {
                      const ess = ESSENCES[vial.essenceId];
                      return (
                        <button
                          key={vial.uid}
                          className="btn btn-sm"
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
                {shopIds.map((id) => {
                  const item = ITEMS[id];
                  const price = getBuyPrice(state, id);
                  const licenseOwned = Boolean(item.isShipLicense && state.player.hasShipLicense);
                  const ownedQty =
                    state.player.inventory.find((e) => e.item.id === id)?.quantity ?? 0;
                  const isBulkable =
                    item.type === 'consumable' ||
                    item.type === 'vial' ||
                    (item.type === 'utility' && !item.isShipLicense);

                  return (
                    <div key={id} className="shop-item">
                      <div>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            gap: 6,
                          }}
                        >
                          <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{item.name}</span>
                          <span className={ownedQty > 0 || licenseOwned ? 'badge badge-success' : 'badge'}>
                            {licenseOwned ? 'มีแล้ว' : `ในกระเป๋า: ${ownedQty}`}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: 4 }}>
                          {item.description}
                        </div>
                        <div style={{ fontSize: '0.83rem', color: '#e6dac8', marginTop: 4 }}>
                          ราคา {price} G/ชิ้น · น้ำหนัก {item.weight} kg
                        </div>
                      </div>
                      {isBulkable ? (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                          {([1, 3, 5] as const).map((qty) => (
                            <button
                              key={qty}
                              className="btn btn-sm"
                              disabled={state.gold < price * qty}
                              onClick={() => onBuyItem(id, qty)}
                              title={`ซื้อ ${qty} ชิ้น ราคา ${price * qty} Gold`}
                            >
                              ซื้อ x{qty}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <button
                          className="btn btn-sm"
                          disabled={state.gold < price || licenseOwned}
                          onClick={() => onBuyItem(id, 1)}
                        >
                          {licenseOwned ? 'มีใบอนุญาตแล้ว' : `ซื้อ (${price} Gold)`}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              <div className="stat-box" style={{ padding: 12, borderColor: 'var(--border-gold)' }}>
                <div style={{ fontWeight: 700, color: 'var(--accent-bright)', fontSize: '0.96rem' }}>
                  โรงประมูลแก่นแท้แห่งลาฟโดเนีย (Auction House)
                </div>
                <div style={{ fontSize: '0.86rem', color: 'var(--muted)', marginTop: 4 }}>
                  นำหลอดแก่นแท้มาเปิดประมูลเพื่อรับราคาสูงกว่าตลาด +35% หรือร่วมประมูลแก่นแท้หายากที่หมุนเวียนเปลี่ยนใหม่ทุกวัน!
                </div>
              </div>

              {state.player.storedVials.length > 0 && (
                <div className="stat-box" style={{ padding: 12, borderColor: 'rgba(72, 187, 120, 0.45)' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#c6f6d5', marginBottom: 8 }}>
                    นำหลอดแก่นแท้ของคุณขึ้นประมูล (+35% Gold)
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {state.player.storedVials.map((vial) => {
                      const ess = ESSENCES[vial.essenceId];
                      const aucPrice = Math.round(ess.marketValue * 1.35);
                      return (
                        <button
                          key={vial.uid}
                          className="btn btn-sm btn-primary"
                          onClick={() => onAuctionSellVial(vial.uid)}
                        >
                          ประมูลขาย {ess.name} (+{aucPrice} G)
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="shop-list">
                {state.auctionListings.map((listing) => {
                  const ess = ESSENCES[listing.essenceId];
                  const syn = SYNERGY_BONUSES[ess.synergyTag];
                  return (
                    <div
                      key={listing.id}
                      className={`shop-item ${listing.sold ? 'equip-slot-empty' : ''}`}
                      style={{ borderColor: listing.sold ? undefined : 'rgba(183, 148, 244, 0.45)' }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, color: '#e9d8fd', fontSize: '0.94rem' }}>
                            {ess.name}
                          </span>
                          <span className="badge badge-lore">
                            Rank {ess.rank} · {ess.color}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: syn.color, marginTop: 4 }}>
                          ✦ {syn.name}
                        </div>
                        <div style={{ fontSize: '0.84rem', color: 'var(--muted)', marginTop: 4 }}>
                          {ess.passiveDescription}
                        </div>
                        {ess.drawbackText && (
                          <div style={{ fontSize: '0.8rem', color: '#feb2b2', marginTop: 3 }}>
                            ⚠️ ข้อเสีย: {ess.drawbackText}
                          </div>
                        )}
                      </div>
                      <button
                        className="btn btn-sm btn-lore"
                        disabled={Boolean(listing.sold) || state.gold < listing.price}
                        onClick={() => onBuyAuctionEssence(listing.id)}
                      >
                        {listing.sold ? 'ประมูลไปแล้ว' : `ชนะประมูลทันที (${listing.price} G)`}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'party' && (
        <div style={{ display: 'grid', gap: 12 }}>
          <div
            className="stat-box"
            style={{
              padding: 12,
              fontSize: '0.9rem',
              color: '#cbd5e1',
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <div style={{ flex: '1 1 260px' }}>
              <strong>สำนักงานจัดการเขาวงกต &amp; กระดานร้านเหล้า:</strong>{' '}
              จ้างได้สูงสุด 2 คน ({state.player.party.length}/2) — ตัวละครหลักจะอยู่ประจำเมื่อปลดล็อก ผสมกับนักสำรวจรับจ้างที่สุ่มเปลี่ยนทุกวัน
            </div>
            <button
              type="button"
              className="btn btn-sm btn-lore"
              disabled={state.gold < 10}
              onClick={onRerollMercenaries}
            >
              <RefreshCw size={14} /> หาคนเพิ่มในร้านเหล้า (10 G)
            </button>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {(
              [
                ['all', 'ทั้งหมด'],
                ['main', 'ตัวละครหลัก (เนื้อเรื่อง)'],
                ['merc', 'นักสำรวจรับจ้าง (สุ่มรายวัน)'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={`btn btn-sm ${partyFilter === key ? 'btn-primary' : ''}`}
                onClick={() => setPartyFilter(key)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="shop-list">
            {state.player.party
              .filter(
                (hired) =>
                  !PARTY_ROSTER[hired.id] &&
                  !state.tavernMercenaries.some((m) => m.id === hired.id)
              )
              .map((hired) => (
                <div key={hired.id} className="shop-item" style={{ borderColor: 'rgba(56, 189, 248, 0.5)' }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <div className="portrait-frame portrait-sm">
                      <img src={hired.portraitUrl} alt={hired.name} className="portrait-img" />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <span>{hired.name}</span>
                        <span className="badge badge-success">ร่วมทีมอยู่</span>
                      </div>
                      <div style={{ fontSize: '0.84rem', color: '#7dd3fc' }}>
                        {hired.race} · {hired.roleLabel}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.84rem', color: '#cbd5e1' }}>
                    Lv.{hired.level} · HP {hired.hp}/{hired.maxHp} · ATK {hired.attack} · DEF {hired.defense}
                  </div>
                  <button className="btn btn-sm" onClick={() => onDismissParty(hired.id)}>
                    ยกเลิกสัญญา
                  </button>
                </div>
              ))}

            {partyFilter !== 'merc' &&
              Object.values(PARTY_ROSTER).map((member) => {
                const isUnlocked = isMainCharacterUnlocked(state, member.id);
                const isHired = state.player.party.some((p) => p.id === member.id);

                if (!isUnlocked) {
                  return (
                    <div key={member.id} className="shop-item equip-slot-empty">
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <div className="portrait-frame portrait-sm" style={{ filter: 'grayscale(100%) opacity(0.55)' }}>
                          <img src={member.portraitUrl} alt={member.name} className="portrait-img" />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#94a3b8', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <span>{member.name}</span>
                            <span className="badge">
                              <Lock size={11} style={{ verticalAlign: 'middle', marginRight: 3 }} />
                              ยังไม่ปลดล็อก
                            </span>
                          </div>
                          <div style={{ fontSize: '0.82rem', color: '#9aa9c1', marginTop: 2 }}>
                            {member.race} · {member.roleLabel}
                          </div>
                        </div>
                      </div>
                      <div style={{ fontSize: '0.84rem', color: '#fcd34d' }}>
                        เงื่อนไข: {member.unlockHint}
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={member.id} className="shop-item" style={{ borderColor: 'rgba(245, 158, 11, 0.45)' }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <div className="portrait-frame portrait-sm">
                        <img src={member.portraitUrl} alt={member.name} className="portrait-img" />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                          <span>{member.name}</span>
                          <span className="badge" style={{ background: '#78350f', color: '#fde68a' }}>
                            ตัวละครหลัก
                          </span>
                        </div>
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

            {partyFilter !== 'main' &&
              state.tavernMercenaries.map((member) => {
                const isHired = state.player.party.some((p) => p.id === member.id);
                return (
                  <div key={member.id} className="shop-item">
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <div className="portrait-frame portrait-sm">
                        <img src={member.portraitUrl} alt={member.name} className="portrait-img" />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                          <span>{member.name}</span>
                          <span className="badge badge-lore">นักสำรวจรับจ้าง</span>
                        </div>
                        <div style={{ fontSize: '0.84rem', color: '#7dd3fc' }}>
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

          <div className="stat-box" style={{ padding: 14, display: 'grid', gap: 10 }}>
            <div style={{ fontWeight: 700, color: '#e9d5ff', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.96rem' }}>
              <BookMarked size={16} /> กิลด์นักผจญภัย — ข่าวกรอง &amp; ตำราสารานุกรมแก่นแท้
            </div>

            {!state.unlockedCorpseGolemLore ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '0.88rem', color: '#9aa9c1' }}>
                  ซื้อข่าวกรองกฎชั้น 4–7 และวิธีรับมือแคนนิบาโล
                </span>
                <button className="btn btn-sm btn-lore" onClick={onBuyRank7Lore}>
                  ซื้อข่าวกรองชั้น 1–7 (80 Gold)
                </button>
              </div>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 20, fontSize: '0.86rem', color: '#cbd5e1', display: 'grid', gap: 4 }}>
                <li>
                  <strong>แคนนิบาโล (Rank 7):</strong> หากแช่อยู่ชั้นเดิมนานเกินไป จะโผล่ออกมาล่าคุณ!
                </li>
                <li>
                  <strong>ชั้น 4 ป่าดอปเปลแกงเกอร์:</strong> ร่างโคลนไม่ดรอปของ ต้องปราบตัวจริง
                </li>
                <li>
                  <strong>ชั้น 5:</strong> ต้องมีแก่นแท้อย่างน้อย 5 ชิ้น ไม่งั้นโดนตีแรงขึ้น +30%
                </li>
                <li>
                  <strong>ชั้น 6 มหาสมุทรใหญ่:</strong> ต้องซื้อใบอนุญาตเดินเรือ (350G) ก่อนลง
                </li>
              </ul>
            )}

            <div className="shop-list" style={{ marginTop: 4 }}>
              {ESSENCE_BOOKS.map((book) => {
                const owned = state.purchasedEssenceBooks.includes(book.tier);
                return (
                  <div key={book.tier} className="shop-item">
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#93c5fd' }}>
                        {book.title}
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#9aa9c1', marginTop: 3 }}>
                        {book.description}
                      </div>
                    </div>
                    <button
                      className="btn btn-sm btn-primary"
                      disabled={owned || state.gold < book.price}
                      onClick={() => onBuyEssenceBook(book.tier)}
                    >
                      {owned ? 'บันทึกแล้ว (ยืนยันโดยกิลด์)' : `ซื้อตำรา (${book.price} G)`}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
