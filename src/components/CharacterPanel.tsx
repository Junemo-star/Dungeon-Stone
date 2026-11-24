import { Backpack, BookOpen, Droplets, Heart, Shield, Sparkles, Zap } from 'lucide-react';
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
  const stats = getEffectiveStats(player, state.awakenedPartyIds);
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
          <div
            className="font-display"
            style={{ fontWeight: 700, fontSize: '1.12rem', color: 'var(--accent-bright)' }}
          >
            {player.name}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 4 }}>
            <span className="badge badge-lore">Rank {player.explorerRank}</span>
            <span className="badge">{player.race}</span>
            <span className="badge">
              Lv.{player.level} ({player.exp}/{player.expToNext})
            </span>
            <span className="badge" style={{ background: '#3b2458', color: '#e9d5ff' }}>
              Rift Stone: {player.riftStones}
            </span>
            {state.ngPlusCount > 0 && (
              <span className="badge badge-warn">NG+{state.ngPlusCount}</span>
            )}
          </div>
        </div>
      </div>

      {(player.curses > 0 ||
        player.bleedTurns > 0 ||
        player.blindTurns > 0 ||
        player.torchTurns > 0 ||
        player.guardTurns > 0 ||
        player.racialBuffTurns > 0 ||
        player.assimilationTurns > 0 ||
        player.keenFocusActive ||
        state.loanDebt > 0 ||
        stats.noPotionHeal ||
        stats.extraThirstDrain > 0 ||
        stats.rangedVulnPct > 0 ||
        stats.armorWearExtra > 0 ||
        stats.extraManaCost > 0 ||
        stats.isOverweight) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {state.loanDebt > 0 && (
            <span className="badge badge-warn">
              หนี้ธนาคาร: {state.loanDebt} G (ด.{state.loanDueDay})
            </span>
          )}
          {player.guardTurns > 0 && (
            <span className="badge badge-success">บล็อก ({player.guardTurns}T)</span>
          )}
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
              คบไฟ: กำลังใช้งาน ({player.torchTurns}T)
            </span>
          )}
          {player.racialBuffTurns > 0 && (
            <span className="badge badge-lore">
              {race.racialSkillName} ({player.racialBuffTurns}T)
            </span>
          )}
          {player.assimilationTurns > 0 && (
            <span className="badge badge-lore">
              พรางตัว ({player.assimilationTurns}T)
            </span>
          )}
          {player.keenFocusActive && (
            <span className="badge" style={{ background: '#684414', color: '#fde68a' }}>
              โฟกัสโจมตี (+45%)
            </span>
          )}
          {stats.noPotionHeal && (
            <span className="badge badge-warn">โพชั่นไม่เข้า</span>
          )}
          {stats.extraThirstDrain > 0 && (
            <span className="badge badge-warn">หิวไว +{stats.extraThirstDrain}</span>
          )}
          {stats.rangedVulnPct > 0 && (
            <span className="badge badge-warn">แพ้ตีไกล +{stats.rangedVulnPct}%</span>
          )}
          {stats.armorWearExtra > 0 && (
            <span className="badge badge-warn">เกราะสึกไว +{stats.armorWearExtra}%</span>
          )}
          {stats.extraManaCost > 0 && (
            <span className="badge badge-warn">สกิล +{stats.extraManaCost}MP</span>
          )}
          {stats.isOverweight && <span className="badge badge-warn">หนักเกิน!</span>}
        </div>
      )}

      <div>
        <div className="bar-wrap">
          <div className="bar-label">
            <span className="bar-label-left">
              <Heart size={14} color="#ef4444" /> HP
            </span>
            <span>
              {player.hp} / {stats.maxHp}
            </span>
          </div>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${hpPct}%`, background: 'linear-gradient(90deg, #9b2c2c, #e53e3e)' }} />
          </div>
        </div>

        <div className="bar-wrap">
          <div className="bar-label">
            <span className="bar-label-left">
              <Zap size={14} color="#63b3ed" /> Mana
            </span>
            <span>
              {player.mana} / {stats.manaPool}
            </span>
          </div>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${manaPct}%`, background: 'linear-gradient(90deg, #2b6cb0, #4299e1)' }} />
          </div>
        </div>

        <div className="bar-wrap">
          <div className="bar-label">
            <span className="bar-label-left">
              <Droplets size={14} color="#ecc94b" /> Thirst
            </span>
            <span>
              {player.thirst} / {player.maxThirst}
            </span>
          </div>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${thirstPct}%`, background: 'linear-gradient(90deg, #b7791f, #ecc94b)' }} />
          </div>
        </div>
      </div>

      <div className="stat-grid">
        <div className="rune-stat"><span className="rune-label">STR</span><strong>{stats.strength}</strong></div>
        <div className="rune-stat"><span className="rune-label">FLEX</span><strong>{stats.flexibility}</strong></div>
        <div className="rune-stat"><span className="rune-label">VIS</span><strong>{stats.vision}</strong></div>
        <div className="rune-stat"><span className="rune-label">OBS</span><strong>{stats.obsession}</strong></div>
        <div className="rune-stat"><span className="rune-label">ATK</span><strong>{stats.attack}</strong></div>
        <div className="rune-stat"><span className="rune-label">DEF</span><strong>{stats.defense}</strong></div>
      </div>

      {stats.activeSynergies.length > 0 && (
        <div style={{ display: 'grid', gap: 5 }}>
          {stats.activeSynergies.map((syn) => (
            <div key={syn.tag} className="synergy-chip" style={{ borderColor: syn.color }}>
              <span style={{ fontWeight: 700, color: syn.color }}>
                ✦ {syn.name} ({syn.count})
              </span>
              <span style={{ color: '#e6dac8', fontSize: '0.76rem' }}>{syn.bonusText}</span>
            </div>
          ))}
        </div>
      )}

      {player.party.length > 0 && (
        <div className="party-mini-list">
          {player.party.map((ally) => {
            const allyPct = Math.max(0, Math.min(100, (ally.hp / ally.maxHp) * 100));
            return (
              <div
                key={ally.id}
                className="party-mini-card"
                onClick={() => onOpenModal('party')}
                style={{ cursor: 'pointer' }}
                title={`${ally.name} — ${ally.roleLabel}`}
              >
                <div className="portrait-frame portrait-xs">
                  <img src={ally.portraitUrl} alt={ally.name} className="portrait-img" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      color: ally.hp > 0 ? '#efe5d5' : '#fc8181',
                    }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {ally.name}
                    </span>
                    <span style={{ flexShrink: 0, marginLeft: 6 }}>
                      {ally.hp}/{ally.maxHp}
                    </span>
                  </div>
                  <div className="bar-track bar-track-sm" style={{ marginTop: 3 }}>
                    <div
                      className="bar-fill"
                      style={{
                        width: `${allyPct}%`,
                        background: ally.hp > 0 ? '#48bb78' : '#718096',
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="stat-box" style={{ fontSize: '0.84rem', display: 'grid', gap: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, color: '#efe5d5' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Shield size={14} color="#63b3ed" /> {weapon?.name}
          </span>
          <span className="badge badge-lore">Mastery Lv.{stats.weaponMasteryLv}</span>
        </div>
        <div style={{ color: 'var(--muted)' }}>
          เกราะ: {armor?.name} ({player.armorDurability}%) · {stats.currentWeight}/{stats.maxCarryWeight} kg
        </div>
      </div>

      <div style={{ display: 'grid', gap: 7, marginTop: 'auto' }}>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => onOpenModal('gear')}
        >
          <Backpack size={16} /> อุปกรณ์ &amp; กระเป๋า (I)
        </button>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
          <button
            type="button"
            className="btn btn-lore btn-sm"
            onClick={() => onOpenModal('essences')}
          >
            <Sparkles size={15} /> แก่นแท้ ({player.essences.length}/{player.maxEssenceSlots})
          </button>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => onOpenModal('codex')}
          >
            <BookOpen size={15} /> สารานุกรม
          </button>
        </div>
      </div>
    </div>
  );
}
