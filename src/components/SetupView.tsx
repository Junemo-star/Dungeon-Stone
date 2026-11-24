import { useState } from 'react';
import {
  BookOpen,
  Coins,
  Compass,
  Flame,
  ShieldAlert,
  Sparkles,
  Swords,
  User,
} from 'lucide-react';
import { RACES } from '../data/loreData';
import { getSlotSummaries, SaveSlotId } from '../engine/storage';
import { GameMode, RaceId } from '../types/game';

interface SetupViewProps {
  activeSlot: SaveSlotId;
  onSelectSlot: (slot: SaveSlotId) => void;
  onStartGame: (mode: GameMode, raceId: RaceId, customName: string) => void;
}

const RACE_ORDER: RaceId[] = [
  'barbarian',
  'human',
  'beastman',
  'dwarf',
  'elf',
  'dragonkin',
];

export function SetupView({ activeSlot, onSelectSlot, onStartGame }: SetupViewProps) {
  const [mode, setMode] = useState<GameMode>('story');
  const [raceId, setRaceId] = useState<RaceId>('barbarian');
  const [customName, setCustomName] = useState('');
  const slots = getSlotSummaries();

  const effectiveRaceId: RaceId = mode === 'story' ? 'barbarian' : raceId;
  const selectedRace = RACES[effectiveRaceId];

  return (
    <div className="setup-grid">
      {/* Left Grimoire Page */}
      <div className="card setup-page">
        <div style={{ display: 'grid', gap: 12 }}>
          <div
            className="stat-box"
            style={{
              padding: '8px 10px',
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent-bright)' }}>
              ช่องบันทึก (Save Slots):
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {slots.map((s) => (
                <button
                  key={s.slot}
                  type="button"
                  className={`btn btn-sm ${activeSlot === s.slot ? 'btn-primary' : ''}`}
                  onClick={() => onSelectSlot(s.slot)}
                >
                  S{s.slot}:{' '}
                  {s.empty
                    ? 'ว่าง'
                    : `${s.name} (D${s.day} · R${s.rank}${s.ngPlusCount ? ` · NG+${s.ngPlusCount}` : ''})`}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h2>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                <BookOpen size={17} /> เลือกโหมดการผจญภัย
              </span>
              <span className="badge">บทที่ 1 · ลาฟโดเนีย</span>
            </h2>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 10,
              }}
            >
              <button
                type="button"
                className={`mode-card ${mode === 'story' ? 'mode-card-active' : ''}`}
                onClick={() => setMode('story')}
              >
                <div style={{ fontWeight: 700, color: 'var(--accent-bright)', fontSize: '0.96rem' }}>
                  โหมดเนื้อเรื่อง (Story Mode)
                </div>
                <div style={{ fontSize: '0.84rem', color: '#e6dac8' }}>
                  รับบทเป็น <strong>Bjorn Yandel</strong> เผ่าคนเถื่อน (Barbarian) ตามเส้นเรื่องหลักของ Dungeon &amp; Stone
                </div>
              </button>

              <button
                type="button"
                className={`mode-card ${mode === 'custom' ? 'mode-card-active' : ''}`}
                onClick={() => setMode('custom')}
              >
                <div style={{ fontWeight: 700, color: mode === 'custom' ? '#fde68a' : '#e9d8fd', fontSize: '0.96rem' }}>
                  โหมดสร้างตัวละครเอง (Custom Race)
                </div>
                <div style={{ fontSize: '0.84rem', color: 'var(--muted)' }}>
                  ตั้งชื่อและเลือกเผ่าพันธุ์จากทั้ง 6 เผ่าในโลกเขาวงกตได้ตามต้องการ
                </div>
              </button>
            </div>
          </div>

          {mode === 'story' ? (
            <div style={{ display: 'grid', gap: 11 }}>
              <div className="chronicle-quote">
                “9 ปีที่เล่นเกม Dungeon &amp; Stone จบลงในพริบตา เมื่อลืมตาตื่นขึ้นในร่างนักรบคนเถื่อน บียอร์น แย็นเดล ณ เมืองลาฟโดเนีย — ที่นี่ไม่มีคำสั่งรีสตาร์ท มีเพียงชีวิตจริง เขาวงกตที่เปิดเพียงเดือนละ 7 วัน และกฎเหล็กของผู้รอดชีวิต”
              </div>

              <div className="tenets-grid">
                <div className="tenet-box">
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#fde68a', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Coins size={15} color="#e0a94c" /> ภาษีราชวงศ์ 7 วัน
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                    ต้องชำระภาษี 200 G ภายในวันที่ 7 หากค้างชำระเกินกำหนดจะถูกประหารชีวิตตามกฎหมายอาณาจักร
                  </div>
                </div>

                <div className="tenet-box">
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#e9d8fd', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Sparkles size={15} color="#b794f4" /> แก่นแท้ 33 ชนิด &amp; ข้อเสีย
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                    ดูดซับเสริมพลังและผสาน Synergy 5 สาย แต่แทบทุกชิ้นมีผลข้างเคียง — สืบข่าวร้านเหล้าหรือซื้อตำรากิลด์ก่อนเสี่ยง!
                  </div>
                </div>

                <div className="tenet-box">
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#9ae6b4', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Flame size={15} color="#48bb78" /> หมอกสงคราม &amp; แคนนิบาโล
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                    จุดคบไฟเปิดระยะสายตาและหาประตูมิติลงชั้นถัดไป (▼) อย่าแช่อยู่ชั้นเดิมนานเกินไปไม่งั้นแคนนิบาโลจะออกมาล่า!
                  </div>
                </div>

                <div className="tenet-box">
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#90cdf4', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Compass size={15} color="#63b3ed" /> โนอาร์ค &amp; โรงประมูล
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                    ปลดล็อกชั้น 2 เพื่อเปิดทางสู่ตลาดมืดโนอาร์ค, ประมูลแก่นแท้หายาก และจ้างปาร์ตี้ตัวละครหลัก + นักสำรวจสุ่มรายวัน
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              <div>
                <label
                  htmlFor="custom-name-input"
                  style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.86rem', marginBottom: 5, color: '#e6dac8', fontWeight: 600 }}
                >
                  <User size={15} color="var(--accent-bright)" /> ชื่อนักสำรวจ (Explorer Name)
                </label>
                <input
                  id="custom-name-input"
                  type="text"
                  className="grimoire-input"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="เช่น Hansu, Ainar, Erwen..."
                />
              </div>

              <div className="race-grid-6">
                {RACE_ORDER.map((id) => {
                  const r = RACES[id];
                  const active = raceId === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      className={`race-card ${active ? 'race-card-active' : ''}`}
                      onClick={() => setRaceId(id)}
                    >
                      <div className="portrait-frame portrait-sm">
                        <img
                          src={r.portraitUrl}
                          alt={r.name}
                          className="portrait-img"
                        />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: active ? '#fde68a' : 'var(--text)' }}>
                          {r.name}
                        </div>
                        <div style={{ fontSize: '0.76rem', color: 'var(--muted)' }}>
                          HP {r.maxHp} · STR {r.baseStats.physique.strength} · MP {r.baseStats.spirit.manaPool}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#e0a94c' }}>
                          เรทซื้อ {Math.round(r.merchantBuyMultiplier * 100)}%
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div
          className="stat-box"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 8,
            fontSize: '0.82rem',
            color: 'var(--muted)',
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#e6dac8' }}>
            <ShieldAlert size={14} color="var(--accent-bright)" /> คำเตือน: โหมดเขาวงกตไม่มีโหลดเซฟย้อนหลังเมื่อสิ้นใจ (Permadeath)
          </span>
          <span>7 ชั้น + 3 รอยแยก · 33 แก่นแท้ · Hotbar 1–5</span>
        </div>
      </div>

      {/* Right Grimoire Page */}
      <div className="card setup-page" style={{ borderColor: 'var(--border-gold)' }}>
        <div style={{ display: 'grid', gap: 10 }}>
          <h2>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              <Sparkles size={17} /> บันทึกข้อมูลตัวละคร
            </span>
            <span className="badge badge-lore">{selectedRace.name}</span>
          </h2>

          <div className="portrait-frame portrait-hero">
            <img
              src={selectedRace.portraitUrl}
              alt={selectedRace.thaiName}
              className="portrait-img"
            />
          </div>

          <div style={{ textAlign: 'center' }}>
            <div
              className="font-display"
              style={{ fontSize: '1.24rem', fontWeight: 800, color: 'var(--accent-bright)' }}
            >
              {mode === 'story'
                ? 'Bjorn Yandel'
                : customName.trim() || `Explorer (${selectedRace.name})`}
            </div>
            <div style={{ fontSize: '0.84rem', color: 'var(--muted)' }}>{selectedRace.thaiName}</div>
          </div>

          <p style={{ fontSize: '0.85rem', color: '#e6dac8', margin: 0, textAlign: 'center' }}>
            {selectedRace.description}
          </p>

          <div className="stat-grid">
            <div className="rune-stat"><span className="rune-label">HP</span><strong>{selectedRace.maxHp}</strong></div>
            <div className="rune-stat"><span className="rune-label">MANA</span><strong>{selectedRace.baseStats.spirit.manaPool}</strong></div>
            <div className="rune-stat"><span className="rune-label">STR</span><strong>{selectedRace.baseStats.physique.strength}</strong></div>
            <div className="rune-stat"><span className="rune-label">FLEX</span><strong>{selectedRace.baseStats.physique.flexibility}</strong></div>
            <div className="rune-stat"><span className="rune-label">VIS</span><strong>{selectedRace.baseStats.physique.vision}</strong></div>
            <div className="rune-stat">
              <span className="rune-label">ตลาด</span>
              <strong>
                {Math.round(selectedRace.merchantBuyMultiplier * 100)}/{Math.round(selectedRace.merchantSellMultiplier * 100)}%
              </strong>
            </div>
          </div>

          <div className="racial-skill-box">
            <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#fde68a' }}>
              สกิลเผ่า: {selectedRace.racialSkillName} ({selectedRace.racialSkillCost} MP)
            </div>
            <div style={{ fontSize: '0.8rem', color: '#e6dac8', marginTop: 2 }}>
              {selectedRace.racialSkillDesc}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 8 }}>
          <div style={{ fontSize: '0.79rem', color: 'var(--muted)', textAlign: 'center' }}>
            สัมภาระเริ่มต้น: กระบองไม้ · เกราะหนัง · เสบียง x3 · โพชั่น x1 · คบไฟ x1 · 80 Gold
          </div>
          <button
            className="btn btn-primary"
            style={{ width: '100%', padding: '11px 14px', fontSize: '0.96rem' }}
            onClick={() => onStartGame(mode, raceId, customName)}
          >
            <Swords size={17} /> เริ่มการผจญภัยเข้าสู่เมืองลาฟโดเนีย (Lafdonia)
          </button>
        </div>
      </div>
    </div>
  );
}
