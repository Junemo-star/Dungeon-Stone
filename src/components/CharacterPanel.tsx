import { Backpack, Droplets, Heart, Shield, Sparkles, Users, Zap } from 'lucide-react';
import { ITEMS, RACES } from '../data/loreData';
import { getEffectiveStats } from '../engine/gameEngine';
import { GameState } from '../types/game';
import { LoadoutTab } from './LoadoutModal';

interface CharacterPanelProps {
  state: GameState;
  onOpenModal: (tab: LoadoutTab) => void;
}

export function CharacterPanel({ state, onOpenModal }: CharacterPanelProps) {
  const { player } = state;
  const stats = getEffectiveStats(player);
  const race = RACES[player.raceId];
  const weapon = ITEMS[player.equippedWeaponId];
  const armor = ITEMS[player.equippedArmorId];

  const hpPct = Math.max(0, Math.min(100, (player.hp / stats.maxHp) * 100));
  const manaPct = Math.max(0, Math.min(100, (player.mana / stats.manaPool) * 100));
  const thirstPct = Math.max(0, Math.min(100, (player.thirst / player.maxThirst) * 100));

  return (
    <div className="card sidebar-pane">
      <div className="hud-header">
        <div className="portrait-frame portrait-md">
          <img src={race.portraitUrl} alt={player.name} className="portrait-img" />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '1.12rem', color: '#fbbf24' }}>
            {player.name}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 4 }}>
            <span className="badge">{player.race}</span>
            <span className="badge">
              Lv.{player.level} ({player.exp}/{player.expToNext})
            </span>
          </div>
        </div>
      </div>

      {/* Status Alerts */}
      {(player.curses > 0 ||
        player.bleedTurns > 0 ||
        player.blindTurns > 0 ||
        player.torchTurns > 0 ||
        player.racialBuffTurns > 0 ||
        player.assimilationTurns > 0 ||
        player.keenFocusActive ||
        stats.isOverweight) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {player.curses > 0 && (
            <span className={player.curses >= 12 ? 'badge badge-warn' : 'badge'}>
              คำสาป {player.curses}/15
            </span>
          )}
          {player.bleedTurns > 0 && (
            <span className="badge badge-warn">เลือดไหล ({player.bleedTurns}T)</span>
          )}
          {player.blindTurns > 0 && (
            <span className="badge badge-warn">ตาพร่า ({player.blindTurns}T)</span>
          )}
          {player.torchTurns > 0 && (
            <span className="badge badge-success">
              คบไฟ: กำลังใช้งานอยู่ ({player.torchTurns}T)
            </span>
          )}
          {player.racialBuffTurns > 0 && (
            <span className="badge badge-lore">
              {race.racialSkillName}: กำลังใช้งานอยู่ ({player.racialBuffTurns}T)
            </span>
          )}
          {player.assimilationTurns > 0 && (
            <span className="badge badge-lore">
              พรางตัว: กำลังใช้งานอยู่ ({player.assimilationTurns}T)
            </span>
          )}
          {player.keenFocusActive && (
            <span className="badge" style={{ background: '#78350f', color: '#fde68a' }}>
              โฟกัสโจมตี: กำลังใช้งานอยู่
            </span>
          )}
          {stats.isOverweight && <span className="badge badge-warn">หนักเกิน!</span>}
        </div>
      )}

      <div>
        <div className="bar-wrap">
          <div className="bar-label">
            <span className="bar-label-left">
              <Heart size={15} color="#ef4444" /> HP
            </span>
            <span>
              {player.hp} / {stats.maxHp}
            </span>
          </div>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${hpPct}%`, background: '#ef4444' }} />
          </div>
        </div>

        <div className="bar-wrap">
          <div className="bar-label">
            <span className="bar-label-left">
              <Zap size={15} color="#3b82f6" /> Spirit / Mana
            </span>
            <span>
              {player.mana} / {stats.manaPool}
            </span>
          </div>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${manaPct}%`, background: '#3b82f6' }} />
          </div>
        </div>

        <div className="bar-wrap">
          <div className="bar-label">
            <span className="bar-label-left">
              <Droplets size={15} color="#eab308" /> Thirst (เสบียง)
            </span>
            <span>
              {player.thirst} / {player.maxThirst}
            </span>
          </div>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${thirstPct}%`, background: '#eab308' }} />
          </div>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-box">STR: <strong>{stats.strength}</strong></div>
        <div className="stat-box">FLEX: <strong>{stats.flexibility}</strong></div>
        <div className="stat-box">VIS: <strong>{stats.vision}</strong></div>
        <div className="stat-box">OBS: <strong>{stats.obsession}</strong></div>
        <div className="stat-box">ATK: <strong>{stats.attack}</strong></div>
        <div className="stat-box">DEF: <strong>{stats.defense}</strong></div>
      </div>

      <div className="stat-box" style={{ fontSize: '0.88rem', display: 'grid', gap: 3 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#cbd5e1' }}>
          <Shield size={14} color="#38bdf8" /> {weapon?.name}
        </div>
        <div style={{ color: '#9aa9c1' }}>
          เกราะ: {armor?.name} ({player.armorDurability}%) · น้ำหนัก {stats.currentWeight}/{stats.maxCarryWeight} kg
        </div>
      </div>

      <div style={{ display: 'grid', gap: 8, marginTop: 'auto' }}>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => onOpenModal('gear')}
        >
          <Backpack size={16} /> อุปกรณ์ &amp; กระเป๋า (I)
        </button>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <button
            type="button"
            className="btn btn-lore"
            onClick={() => onOpenModal('essences')}
          >
            <Sparkles size={15} /> แก่นแท้ ({player.essences.length}/{player.maxEssenceSlots})
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => onOpenModal('party')}
          >
            <Users size={15} /> ปาร์ตี้ ({player.party.length}/2)
          </button>
        </div>
      </div>
    </div>
  );
}
