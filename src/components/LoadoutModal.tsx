import { useState } from 'react';
import { Backpack, Flame, Package, Shield, Sparkles, Sword, Users, X } from 'lucide-react';
import { ESSENCES, ITEMS, RACES } from '../data/loreData';
import { getEffectiveStats } from '../engine/gameEngine';
import { GameState } from '../types/game';

export type LoadoutTab = 'gear' | 'essences' | 'party';
type InventoryFilter = 'all' | 'use' | 'gear' | 'loot';

interface LoadoutModalProps {
  state: GameState;
  activeTab: LoadoutTab;
  onChangeTab: (tab: LoadoutTab) => void;
  onClose: () => void;
  onUseConsumable: (itemId: string) => void;
  onEquipItem: (itemId: string) => void;
}

export function LoadoutModal({
  state,
  activeTab,
  onChangeTab,
  onClose,
  onUseConsumable,
  onEquipItem,
}: LoadoutModalProps) {
  const { player } = state;
  const stats = getEffectiveStats(player);
  const [filter, setFilter] = useState<InventoryFilter>('all');

  const weapon = ITEMS[player.equippedWeaponId];
  const armor = ITEMS[player.equippedArmorId];
  const shield = player.equippedShieldId ? ITEMS[player.equippedShieldId] : null;
  const weightPct = Math.min(100, (stats.currentWeight / stats.maxCarryWeight) * 100);
  const durColor =
    player.armorDurability > 60 ? '#22c55e' : player.armorDurability > 30 ? '#eab308' : '#ef4444';

  const filteredItems = player.inventory.filter((entry) => {
    const t = entry.item.type;
    if (filter === 'use') return t === 'consumable' || t === 'utility';
    if (filter === 'gear') return t === 'weapon' || t === 'armor' || t === 'shield' || t === 'bag';
    if (filter === 'loot') return t === 'magic_stone' || t === 'vial';
    return true;
  });

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="loadout-modal" onClick={(e) => e.stopPropagation()}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 10,
            borderBottom: '1px solid #263147',
            paddingBottom: 10,
          }}
        >
          <div className="tab-bar" style={{ border: 'none', padding: 0, margin: 0 }}>
            <button
              type="button"
              className={`tab-btn ${activeTab === 'gear' ? 'tab-btn-active' : ''}`}
              onClick={() => onChangeTab('gear')}
            >
              <Backpack size={16} /> อุปกรณ์ &amp; กระเป๋า
            </button>
            <button
              type="button"
              className={`tab-btn ${activeTab === 'essences' ? 'tab-btn-active' : ''}`}
              onClick={() => onChangeTab('essences')}
            >
              <Sparkles size={16} /> แก่นแท้ ({player.essences.length}/{player.maxEssenceSlots})
            </button>
            <button
              type="button"
              className={`tab-btn ${activeTab === 'party' ? 'tab-btn-active' : ''}`}
              onClick={() => onChangeTab('party')}
            >
              <Users size={16} /> ปาร์ตี้ ({player.party.length}/2)
            </button>
          </div>
          <button type="button" className="btn btn-sm" onClick={onClose} title="ปิด (Esc)">
            <X size={16} /> ปิด
          </button>
        </div>

        <div className="loadout-body">
          {activeTab === 'gear' && (
            <div style={{ display: 'grid', gap: 14 }}>
              {/* Top Summary Strip */}
              <div
                className="stat-box"
                style={{
                  padding: '10px 14px',
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <div style={{ flex: '1 1 240px' }}>
                  <div className="bar-label" style={{ marginBottom: 4 }}>
                    <span>น้ำหนักกระเป๋า (Weight)</span>
                    <span style={{ color: stats.isOverweight ? '#fca5a5' : '#eef2f8' }}>
                      {stats.currentWeight} / {stats.maxCarryWeight} kg
                      {stats.isOverweight ? ' (หนักเกิน!)' : ''}
                    </span>
                  </div>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{
                        width: `${weightPct}%`,
                        background: stats.isOverweight ? '#ef4444' : '#38bdf8',
                      }}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  <span className="badge">ATK {stats.attack}</span>
                  <span className="badge">DEF {stats.defense}</span>
                  <span className="badge">Vision {stats.vision}</span>
                  {stats.hasAcidResistantArmor && (
                    <span className="badge badge-success">กันกรด</span>
                  )}
                </div>
              </div>

              {/* Active Items / Buffs Banner */}
              {(player.torchTurns > 0 ||
                player.racialBuffTurns > 0 ||
                player.assimilationTurns > 0 ||
                player.keenFocusActive) && (
                <div
                  className="stat-box"
                  style={{
                    padding: '10px 14px',
                    borderColor: 'rgba(34, 197, 94, 0.45)',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <strong style={{ fontSize: '0.9rem', color: '#86efac' }}>
                    กำลังใช้งานอยู่:
                  </strong>
                  {player.torchTurns > 0 && (
                    <span className="badge badge-success">
                      <Flame size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                      คบไฟเขาวงกต (+3 Vision, เหลือ {player.torchTurns} เทิร์น)
                    </span>
                  )}
                  {player.racialBuffTurns > 0 && (
                    <span className="badge badge-lore">
                      {RACES[player.raceId].racialSkillName} (เหลือ {player.racialBuffTurns} เทิร์น)
                    </span>
                  )}
                  {player.assimilationTurns > 0 && (
                    <span className="badge badge-lore">
                      พรางตัว (เหลือ {player.assimilationTurns} เทิร์น)
                    </span>
                  )}
                  {player.keenFocusActive && (
                    <span className="badge" style={{ background: '#78350f', color: '#fde68a' }}>
                      โฟกัสโจมตี (นัดถัดไป +45%)
                    </span>
                  )}
                </div>
              )}

              <div className="loadout-split">
                {/* Left Column: Paper-Doll Equipment Slots */}
                <div className="paperdoll-grid">
                  <div className="equip-slot">
                    <div style={{ fontSize: '0.84rem', color: '#9aa9c1', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Sword size={14} color="#f59e0b" /> อาวุธ (Weapon)
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.96rem', marginTop: 4 }}>
                      {weapon?.name}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#cbd5e1', marginTop: 2 }}>
                      +{weapon?.attackBonus ?? 0} Attack · {weapon?.weight ?? 0} kg
                    </div>
                  </div>

                  <div className="equip-slot">
                    <div style={{ fontSize: '0.84rem', color: '#9aa9c1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <Shield size={14} color="#38bdf8" /> เกราะ (Armor)
                      </span>
                      {armor?.acidResistant ? (
                        <span className="badge badge-success">กันกรด</span>
                      ) : stats.hasAcidFluid ? (
                        <span className="badge badge-warn">เสี่ยงกรดกัด!</span>
                      ) : null}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.96rem', marginTop: 4 }}>
                      {armor?.name}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#cbd5e1', marginTop: 2, marginBottom: 6 }}>
                      +{armor?.defenseBonus ?? 0} Defense · ความทนทาน {player.armorDurability}%
                    </div>
                    <div className="bar-track">
                      <div
                        className="bar-fill"
                        style={{ width: `${player.armorDurability}%`, background: durColor }}
                      />
                    </div>
                  </div>

                  <div className={`equip-slot ${!shield ? 'equip-slot-empty' : ''}`}>
                    <div style={{ fontSize: '0.84rem', color: '#9aa9c1', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Shield size={14} color="#22c55e" /> โล่ (Shield)
                    </div>
                    {shield ? (
                      <>
                        <div style={{ fontWeight: 700, fontSize: '0.96rem', marginTop: 4 }}>
                          {shield.name}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#cbd5e1', marginTop: 2 }}>
                          +{shield.defenseBonus ?? 0} Defense · {shield.weight} kg
                        </div>
                      </>
                    ) : (
                      <div style={{ fontSize: '0.88rem', color: '#8b9bb4', marginTop: 4 }}>
                        ยังไม่ได้สวมโล่ (ซื้อได้ที่ตลาดอาร์มินัส)
                      </div>
                    )}
                  </div>

                  <div className={`equip-slot ${!player.hasExpandableBag ? 'equip-slot-empty' : ''}`}>
                    <div style={{ fontSize: '0.84rem', color: '#9aa9c1', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Package size={14} color="#a855f7" /> กระเป๋าเสริม (Bag)
                    </div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, marginTop: 4 }}>
                      {player.hasExpandableBag
                        ? 'กระเป๋าเป้ขยายได้ (+18 kg ความจุ)'
                        : 'ยังไม่มีกระเป๋าเสริม'}
                    </div>
                  </div>
                </div>

                {/* Right Column: Filterable Bag Items */}
                <div style={{ display: 'grid', gap: 10, alignContent: 'start' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {(
                      [
                        ['all', 'ทั้งหมด'],
                        ['use', 'ใช้งาน'],
                        ['gear', 'สวมใส่'],
                        ['loot', 'ของขาย / หลอด'],
                      ] as const
                    ).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        className={`btn btn-sm ${filter === key ? 'btn-primary' : ''}`}
                        onClick={() => setFilter(key)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <div style={{ display: 'grid', gap: 8 }}>
                    {filteredItems.map(({ item, quantity }) => {
                      const isEquipped =
                        player.equippedWeaponId === item.id ||
                        player.equippedArmorId === item.id ||
                        player.equippedShieldId === item.id ||
                        (item.type === 'bag' && player.hasExpandableBag);
                      const isGear =
                        item.type === 'weapon' ||
                        item.type === 'armor' ||
                        item.type === 'shield' ||
                        item.type === 'bag';
                      const isUsable = item.type === 'consumable' || item.type === 'utility';

                      return (
                        <div
                          key={item.id}
                          className="equip-slot"
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: 10,
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.94rem' }}>
                              {item.name} <span className="badge">x{quantity}</span>
                              {isEquipped && (
                                <span className="badge badge-success" style={{ marginLeft: 6 }}>
                                  สวมใส่อยู่
                                </span>
                              )}
                              {item.id === 'torch' && player.torchTurns > 0 && (
                                <span className="badge badge-success" style={{ marginLeft: 6 }}>
                                  กำลังใช้งานอยู่ ({player.torchTurns}T)
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.84rem', color: '#9aa9c1', marginTop: 3 }}>
                              {item.description} · {item.weight} kg
                            </div>
                          </div>
                          {isUsable && (
                            <button
                              className="btn btn-sm btn-primary"
                              onClick={() => onUseConsumable(item.id)}
                            >
                              ใช้ทันที
                            </button>
                          )}
                          {isGear && !isEquipped && (
                            <button
                              className="btn btn-sm"
                              onClick={() => onEquipItem(item.id)}
                            >
                              สวมใส่
                            </button>
                          )}
                        </div>
                      );
                    })}

                    {(filter === 'all' || filter === 'loot') && player.storedVials.length > 0 && (
                      <div className="equip-slot" style={{ borderColor: 'rgba(168, 85, 247, 0.45)' }}>
                        <div style={{ fontWeight: 700, color: '#e9d5ff', fontSize: '0.94rem' }}>
                          หลอดบรรจุแก่นแท้ ({player.storedVials.length} หลอด)
                        </div>
                        <div style={{ fontSize: '0.86rem', color: '#cbd5e1', marginTop: 4 }}>
                          {player.storedVials
                            .map((v) => `${ESSENCES[v.essenceId].name} (${ESSENCES[v.essenceId].marketValue}G)`)
                            .join(', ')}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'essences' && (
            <div style={{ display: 'grid', gap: 10 }}>
              {player.essences.length === 0 ? (
                <p style={{ fontSize: '0.94rem', color: '#9aa9c1', margin: 0 }}>
                  ยังไม่ได้ดูดซับแก่นแท้ — ล่ามอนสเตอร์ในเขาวงกตหรือรอยแยกเพื่อดูดซับพลัง!
                </p>
              ) : (
                player.essences.map((ess) => (
                  <div key={ess.id} className="equip-slot">
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: '#e9d5ff' }}>
                      {ess.name}{' '}
                      <span className="badge badge-lore">
                        Rank {ess.rank} · {ess.color}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.9rem', color: '#cbd5e1', marginTop: 6 }}>
                      <strong>(Passive) {ess.passiveName}:</strong> {ess.passiveDescription}
                    </div>
                    <div style={{ fontSize: '0.9rem', color: '#93c5fd', marginTop: 4 }}>
                      <strong>(Active) {ess.activeSkill.name} ({ess.activeSkill.manaCost} MP):</strong>{' '}
                      {ess.activeSkill.description}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'party' && (
            <div style={{ display: 'grid', gap: 10 }}>
              {player.party.length === 0 ? (
                <p style={{ fontSize: '0.94rem', color: '#9aa9c1', margin: 0 }}>
                  ยังไม่มีสมาชิกปาร์ตี้ — จ้างได้ที่แท็บ "สำนักงานปาร์ตี้" ในเมืองลาฟโดเนีย
                </p>
              ) : (
                player.party.map((member) => (
                  <div
                    key={member.id}
                    className="equip-slot"
                    style={{ display: 'flex', gap: 14, alignItems: 'center' }}
                  >
                    <div className="portrait-frame portrait-md">
                      <img src={member.portraitUrl} alt={member.name} className="portrait-img" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '1rem', color: '#fbbf24' }}>
                        {member.name}
                      </div>
                      <div style={{ fontSize: '0.88rem', color: '#cbd5e1', marginTop: 2 }}>
                        {member.race} · {member.roleLabel}
                      </div>
                      <div style={{ fontSize: '0.88rem', color: '#fca5a5', marginTop: 4 }}>
                        HP: {member.hp}/{member.maxHp} · ATK {member.attack} · DEF {member.defense}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
