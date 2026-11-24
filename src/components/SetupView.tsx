import { useState } from 'react';
import { BookOpen, Sparkles, Swords, User } from 'lucide-react';
import { RACES } from '../data/loreData';
import { GameMode, RaceId } from '../types/game';

interface SetupViewProps {
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

export function SetupView({ onStartGame }: SetupViewProps) {
  const [mode, setMode] = useState<GameMode>('story');
  const [raceId, setRaceId] = useState<RaceId>('barbarian');
  const [customName, setCustomName] = useState('');

  const effectiveRaceId: RaceId = mode === 'story' ? 'barbarian' : raceId;
  const selectedRace = RACES[effectiveRaceId];

  return (
    <div className="setup-grid">
      <div className="setup-pane" style={{ display: 'grid', gap: 14, alignContent: 'start' }}>
        <div className="card">
          <h2>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              <BookOpen size={17} /> เลือกโหมดการผจญภัย
            </span>
          </h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 10,
            }}
          >
            <button
              type="button"
              className="shop-item"
              onClick={() => setMode('story')}
              style={{
                textAlign: 'left',
                cursor: 'pointer',
                borderColor: mode === 'story' ? '#f59e0b' : '#263147',
                background: mode === 'story' ? 'rgba(217, 119, 6, 0.14)' : '#161d2c',
              }}
            >
              <div>
                <div style={{ fontWeight: 700, color: '#fbbf24', fontSize: '0.95rem' }}>
                  โหมดเนื้อเรื่อง (Story Mode)
                </div>
                <div style={{ fontSize: '0.8rem', color: '#cbd5e1', marginTop: 4 }}>
                  รับบทเป็น <strong>Bjorn Yandel</strong> เผ่าคนเถื่อน (Barbarian)
                  ตามเส้นเรื่องหลักของ Dungeon &amp; Stone
                </div>
              </div>
            </button>

            <button
              type="button"
              className="shop-item"
              onClick={() => setMode('custom')}
              style={{
                textAlign: 'left',
                cursor: 'pointer',
                borderColor: mode === 'custom' ? '#a855f7' : '#263147',
                background: mode === 'custom' ? 'rgba(168, 85, 247, 0.14)' : '#161d2c',
              }}
            >
              <div>
                <div style={{ fontWeight: 700, color: '#e9d5ff', fontSize: '0.95rem' }}>
                  โหมดสร้างตัวละครเอง (Custom Race)
                </div>
                <div style={{ fontSize: '0.8rem', color: '#cbd5e1', marginTop: 4 }}>
                  ตั้งชื่อและเลือกเผ่าพันธุ์จาก 6 เผ่าในโลกของเขาวงกตได้ตามใจ
                </div>
              </div>
            </button>
          </div>
        </div>

        {mode === 'custom' && (
          <div className="card">
            <h2>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                <User size={17} /> ชื่อและเผ่าพันธุ์
              </span>
            </h2>

            <div style={{ marginBottom: 12 }}>
              <label
                htmlFor="custom-name-input"
                style={{ display: 'block', fontSize: '0.82rem', marginBottom: 5, color: '#cbd5e1' }}
              >
                ชื่อนักสำรวจ (Explorer Name)
              </label>
              <input
                id="custom-name-input"
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="เช่น Hansu, Ainar, Erwen..."
                style={{
                  width: '100%',
                  maxWidth: 320,
                  padding: '8px 10px',
                  borderRadius: 7,
                  border: '1px solid #263147',
                  background: '#07090e',
                  color: '#eef2f8',
                  fontSize: '0.88rem',
                }}
              />
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))',
                gap: 8,
              }}
            >
              {RACE_ORDER.map((id) => {
                const r = RACES[id];
                const active = raceId === id;
                return (
                  <button
                    key={id}
                    type="button"
                    className="shop-item"
                    onClick={() => setRaceId(id)}
                    style={{
                      textAlign: 'left',
                      cursor: 'pointer',
                      padding: 9,
                      borderColor: active ? '#f59e0b' : '#263147',
                      background: active ? '#1e273a' : '#161d2c',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <div className="portrait-frame portrait-sm">
                        <img
                          src={r.portraitUrl}
                          alt={r.name}
                          className="portrait-img"
                        />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.84rem', color: active ? '#fbbf24' : '#eef2f8' }}>
                          {r.name}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#8b9bb4' }}>
                          HP {r.maxHp} · STR {r.baseStats.physique.strength}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="card setup-pane" style={{ borderColor: 'rgba(245, 158, 11, 0.35)' }}>
        <h2>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <Sparkles size={17} /> ข้อมูลตัวละครที่เลือก
          </span>
          <span className="badge">{selectedRace.name}</span>
        </h2>

        <div className="portrait-frame portrait-lg" style={{ marginBottom: 14 }}>
          <img
            src={selectedRace.portraitUrl}
            alt={selectedRace.thaiName}
            className="portrait-img"
          />
        </div>

        <div style={{ textAlign: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: '1.08rem', fontWeight: 700, color: '#fbbf24' }}>
            {mode === 'story'
              ? 'Bjorn Yandel'
              : customName.trim() || `Explorer (${selectedRace.name})`}
          </div>
          <div style={{ fontSize: '0.82rem', color: '#8b9bb4' }}>{selectedRace.thaiName}</div>
        </div>

        <p style={{ fontSize: '0.82rem', color: '#cbd5e1', margin: '0 0 12px' }}>
          {selectedRace.description}
        </p>

        <div className="stat-grid" style={{ marginBottom: 10 }}>
          <div className="stat-box">HP: {selectedRace.maxHp}</div>
          <div className="stat-box">Mana: {selectedRace.baseStats.spirit.manaPool}</div>
          <div className="stat-box">Strength: {selectedRace.baseStats.physique.strength}</div>
          <div className="stat-box">Flexibility: {selectedRace.baseStats.physique.flexibility}</div>
          <div className="stat-box">Vision: {selectedRace.baseStats.physique.vision}</div>
          <div className="stat-box">
            ตลาด: {Math.round(selectedRace.merchantBuyMultiplier * 100)}% /{' '}
            {Math.round(selectedRace.merchantSellMultiplier * 100)}%
          </div>
        </div>

        <div
          className="stat-box"
          style={{ marginBottom: 14, borderColor: 'rgba(59, 130, 246, 0.4)' }}
        >
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#93c5fd' }}>
            สกิลเผ่า: {selectedRace.racialSkillName} ({selectedRace.racialSkillCost} MP)
          </div>
          <div style={{ fontSize: '0.76rem', color: '#cbd5e1', marginTop: 2 }}>
            {selectedRace.racialSkillDesc}
          </div>
        </div>

        <button
          className="btn btn-primary"
          style={{ width: '100%', padding: '10px 14px', fontSize: '0.92rem' }}
          onClick={() => onStartGame(mode, raceId, customName)}
        >
          <Swords size={16} /> เริ่มเกมเข้าสู่เมือง Rafdonia
        </button>
      </div>
    </div>
  );
}
