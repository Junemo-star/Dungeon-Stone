import { useState } from 'react';
import {
  Backpack,
  BookOpen,
  Flame,
  Hash,
  Package,
  Shield,
  Sparkles,
  Sword,
  Users,
  X,
} from 'lucide-react';
import { ESSENCES, ITEMS, MONSTERS, RACES, SYNERGY_BONUSES } from '../data/loreData';
import { getActiveSynergies, getEffectiveStats } from '../engine/gameEngine';
import { GameState } from '../types/game';

export type LoadoutTab = 'gear' | 'essences' | 'party' | 'codex';
type InventoryFilter = 'all' | 'use' | 'gear' | 'loot';
type CodexSubTab = 'monsters' | 'essences';
type EssenceFilter = 'all' | 'confirmed' | 'rumor' | 'unknown';

interface LoadoutModalProps {
  state: GameState;
  activeTab: LoadoutTab;
  onChangeTab: (tab: LoadoutTab) => void;
  onClose: () => void;
  onUseConsumable: (itemId: string) => void;
  onEquipItem: (itemId: string) => void;
  onAbsorbStoredVial: (vialUid: string) => void;
}

export function LoadoutModal({
  state,
  activeTab,
  onChangeTab,
  onClose,
  onUseConsumable,
  onEquipItem,
  onAbsorbStoredVial,
}: LoadoutModalProps) {
  const { player } = state;
  const stats = getEffectiveStats(player);
  const [filter, setFilter] = useState<InventoryFilter>('all');
  const [codexSubTab, setCodexSubTab] = useState<CodexSubTab>('monsters');
  const [essenceFilter, setEssenceFilter] = useState<EssenceFilter>('all');

  const allEssences = Object.values(ESSENCES);
  const knownEssenceCount = allEssences.filter(
    (e) => (state.essenceKnowledge[e.id] ?? 'unknown') !== 'unknown'
  ).length;

  const weapon = ITEMS[player.equippedWeaponId];
  const armor = ITEMS[player.equippedArmorId];
  const shield = player.equippedShieldId ? ITEMS[player.equippedShieldId] : null;
  const numItem = player.equippedNumberItemId ? ITEMS[player.equippedNumberItemId] : null;
  const weightPct = Math.min(100, (stats.currentWeight / stats.maxCarryWeight) * 100);
  const durColor =
    player.armorDurability > 60 ? '#22c55e' : player.armorDurability > 30 ? '#eab308' : '#ef4444';

  const filteredItems = player.inventory.filter((entry) => {
    const t = entry.item.type;
    if (filter === 'use') return t === 'consumable' || t === 'utility';
    if (filter === 'gear')
      return t === 'weapon' || t === 'armor' || t === 'shield' || t === 'bag' || t === 'number_item';
    if (filter === 'loot') return t === 'magic_stone' || t === 'vial';
    return true;
  });

  const allMonsters = Object.values(MONSTERS);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="loadout-modal" onClick={(e) => e.stopPropagation()}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 10,
            borderBottom: '1px solid var(--border)',
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
            <button
              type="button"
              className={`tab-btn ${activeTab === 'codex' ? 'tab-btn-active' : ''}`}
              onClick={() => onChangeTab('codex')}
            >
              <BookOpen size={16} /> สารานุกรม ({player.defeatedMonsterIds.length}/{allMonsters.length})
            </button>
          </div>
          <button type="button" className="btn btn-sm" onClick={onClose} title="ปิด (Esc)">
            <X size={16} /> ปิด
          </button>
        </div>

        <div className="loadout-body">
          {activeTab === 'gear' && (
            <div style={{ display: 'grid', gap: 14 }}>
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
                  {stats.hasAcidResistantArmor && <span className="badge badge-success">กันกรด</span>}
                </div>
              </div>

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
                  <strong style={{ fontSize: '0.9rem', color: '#86efac' }}>กำลังใช้งานอยู่:</strong>
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
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, marginTop: 4 }}>
                      {shield ? `${shield.name} (+${shield.defenseBonus} DEF)` : 'ยังไม่ได้สวมโล่'}
                    </div>
                  </div>

                  <div className={`equip-slot ${!numItem ? 'equip-slot-empty' : ''}`}>
                    <div style={{ fontSize: '0.84rem', color: '#9aa9c1', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Hash size={14} color="#fbbf24" /> ไอเทมตัวเลข (Number Item)
                    </div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, marginTop: 4, color: numItem ? '#fde68a' : '#8b9bb4' }}>
                      {numItem ? numItem.name : 'ยังไม่ได้สวมใส่ (หาซื้อได้ที่โนอาร์ค)'}
                    </div>
                  </div>

                  <div className={`equip-slot ${!player.hasExpandableBag ? 'equip-slot-empty' : ''}`}>
                    <div style={{ fontSize: '0.84rem', color: '#9aa9c1', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Package size={14} color="#a855f7" /> กระเป๋าเสริม (Bag)
                    </div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, marginTop: 4 }}>
                      {player.hasExpandableBag ? 'กระเป๋าเป้ขยายได้ (+18 kg)' : 'ยังไม่มีกระเป๋าเสริม'}
                    </div>
                  </div>
                </div>

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
                        player.equippedNumberItemId === item.id ||
                        (item.type === 'bag' && player.hasExpandableBag);
                      const isGear =
                        item.type === 'weapon' ||
                        item.type === 'armor' ||
                        item.type === 'shield' ||
                        item.type === 'number_item' ||
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
                            <button className="btn btn-sm" onClick={() => onEquipItem(item.id)}>
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

          {activeTab === 'essences' && (() => {
            const activeSynergies = getActiveSynergies(player.essences);
            return (
              <div style={{ display: 'grid', gap: 12 }}>
                <div className="stat-box" style={{ padding: 12, borderColor: 'var(--border-gold)' }}>
                  <div style={{ fontWeight: 700, color: 'var(--accent-bright)', fontSize: '0.92rem', marginBottom: 6 }}>
                    โบนัสผสานจิตวิญญาณ (Synergy — ถือครองสายเดียวกัน ≥ 2 ชิ้น)
                  </div>
                  {activeSynergies.length === 0 ? (
                    <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                      ยังไม่มี Synergy ที่ทำงาน — ลองสะสมแก่นแท้สายเดียวกัน (Iron / Shadow / Blood / Arcane / Beast) อย่างน้อย 2 ชิ้น
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gap: 6 }}>
                      {activeSynergies.map((syn) => (
                        <div key={syn.tag} className="synergy-chip" style={{ borderColor: syn.color }}>
                          <strong style={{ color: syn.color }}>✦ {syn.name} ({syn.count} ชิ้น)</strong>
                          <span style={{ color: '#e6dac8', fontSize: '0.84rem' }}>{syn.bonusText}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {player.essences.length === 0 ? (
                  <p style={{ fontSize: '0.94rem', color: 'var(--muted)', margin: 0 }}>
                    ยังไม่ได้ดูดซับแก่นแท้ — ล่ามอนสเตอร์ในเขาวงกตหรือประมูลหลอดแก่นแท้มาดูดซับ!
                  </p>
                ) : (
                  player.essences.map((ess) => {
                    const syn = ess.synergyTag ? SYNERGY_BONUSES[ess.synergyTag] : null;
                    return (
                      <div key={ess.id} className="equip-slot">
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                          <span style={{ fontWeight: 700, fontSize: '1rem', color: '#e9d8fd' }}>
                            {ess.name}
                          </span>
                          <span className="badge badge-lore">
                            Rank {ess.rank} · {ess.color}
                          </span>
                          {syn && (
                            <span className="badge" style={{ color: syn.color }}>
                              {syn.name}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.9rem', color: '#efe5d5', marginTop: 6 }}>
                          <strong>(Passive) {ess.passiveName}:</strong> {ess.passiveDescription}
                        </div>
                        <div style={{ fontSize: '0.9rem', color: '#90cdf4', marginTop: 4 }}>
                          <strong>(Active) {ess.activeSkill.name} ({ess.activeSkill.manaCost} MP):</strong>{' '}
                          {ess.activeSkill.description}
                        </div>
                        {ess.drawbackText && (
                          <div style={{ fontSize: '0.84rem', color: '#feb2b2', marginTop: 4 }}>
                            ⚠️ <strong>ข้อเสีย:</strong> {ess.drawbackText}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}

                {player.storedVials.length > 0 && (
                  <div className="stat-box" style={{ padding: 12, borderColor: 'rgba(159, 122, 234, 0.45)' }}>
                    <div style={{ fontWeight: 700, color: '#e9d8fd', fontSize: '0.92rem', marginBottom: 8 }}>
                      หลอดบรรจุแก่นแท้ในกระเป๋า (กดดูดซับได้ทันที หรือนำไปประมูลขายในเมือง)
                    </div>
                    <div style={{ display: 'grid', gap: 8 }}>
                      {player.storedVials.map((vial) => {
                        const ess = ESSENCES[vial.essenceId];
                        return (
                          <div
                            key={vial.uid}
                            className="equip-slot"
                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}
                          >
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#fde68a' }}>
                                {ess.name} (Rank {ess.rank})
                              </div>
                              <div style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                                {ess.passiveDescription}
                              </div>
                              {ess.drawbackText && (
                                <div style={{ fontSize: '0.8rem', color: '#feb2b2', marginTop: 2 }}>
                                  ⚠️ ข้อเสีย: {ess.drawbackText}
                                </div>
                              )}
                            </div>
                            <button
                              type="button"
                              className="btn btn-sm btn-primary"
                              disabled={player.essences.length >= player.maxEssenceSlots}
                              onClick={() => onAbsorbStoredVial(vial.uid)}
                            >
                              ดูดซับทันที
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

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
                        {member.name} <span className="badge">Lv.{member.level}</span>
                        {member.absorbedEssenceName && (
                          <span className="badge badge-lore" style={{ marginLeft: 6 }}>
                            {member.absorbedEssenceName}
                          </span>
                        )}
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

          {activeTab === 'codex' && (
            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    type="button"
                    className={`btn btn-sm ${codexSubTab === 'monsters' ? 'btn-primary' : ''}`}
                    onClick={() => setCodexSubTab('monsters')}
                  >
                    มอนสเตอร์ ({player.defeatedMonsterIds.length}/{allMonsters.length})
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${codexSubTab === 'essences' ? 'btn-primary' : ''}`}
                    onClick={() => setCodexSubTab('essences')}
                  >
                    สารานุกรมแก่นแท้ ({knownEssenceCount}/{allEssences.length})
                  </button>
                </div>

                {codexSubTab === 'essences' && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {(
                      [
                        ['all', 'ทั้งหมด'],
                        ['confirmed', 'ยืนยันแล้ว'],
                        ['rumor', 'ไม่ชัวร์'],
                        ['unknown', 'ยังไม่รู้'],
                      ] as const
                    ).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        className={`btn btn-sm ${essenceFilter === key ? 'btn-lore' : ''}`}
                        onClick={() => setEssenceFilter(key)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {codexSubTab === 'monsters' ? (
                <div className="shop-list">
                  {allMonsters.map((mon) => {
                    const seen = player.defeatedMonsterIds.includes(mon.id);
                    const ess = mon.essenceId ? ESSENCES[mon.essenceId] : null;
                    return (
                      <div
                        key={mon.id}
                        className={`shop-item ${!seen ? 'equip-slot-empty' : ''}`}
                      >
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.94rem', color: seen ? '#fbbf24' : '#8b9bb4' }}>
                            {seen ? mon.name : `??? (Rank ${mon.rank})`}
                          </div>
                          <div style={{ fontSize: '0.82rem', color: '#9aa9c1', marginTop: 4 }}>
                            {seen
                              ? `HP ${mon.maxHp} · ATK ${mon.attack} · DEF ${mon.defense} — ${mon.description}`
                              : 'กำจัดมอนสเตอร์นี้ในเขาวงกตเพื่อปลดล็อกข้อมูล'}
                          </div>
                          {seen && ess && (
                            <div style={{ fontSize: '0.8rem', color: '#e9d5ff', marginTop: 4 }}>
                              แก่นแท้: {ess.name} (Rank {ess.rank})
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="shop-list">
                  {allEssences
                    .filter((ess) => {
                      const lvl = state.essenceKnowledge[ess.id] ?? 'unknown';
                      if (essenceFilter === 'confirmed') return lvl === 'guild' || lvl === 'verified';
                      if (essenceFilter === 'rumor') return lvl === 'rumor';
                      if (essenceFilter === 'unknown') return lvl === 'unknown';
                      return true;
                    })
                    .map((ess) => {
                      const lvl = state.essenceKnowledge[ess.id] ?? 'unknown';
                      if (lvl === 'unknown') {
                        return (
                          <div key={ess.id} className="shop-item equip-slot-empty">
                            <div style={{ fontWeight: 700, fontSize: '0.94rem', color: '#8b9bb4' }}>
                              ??? (Rank {ess.rank})
                            </div>
                            <div style={{ fontSize: '0.82rem', color: '#9aa9c1', marginTop: 4 }}>
                              ยังไม่มีข้อมูล — สืบข่าวในร้านเหล้า ซื้อตำราที่กิลด์ หรือดูดซับแก่นแท้จริงในเขาวงกต
                            </div>
                          </div>
                        );
                      }

                      if (lvl === 'rumor') {
                        return (
                          <div
                            key={ess.id}
                            className="shop-item"
                            style={{ borderColor: 'rgba(234, 179, 8, 0.55)' }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6, flexWrap: 'wrap' }}>
                              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fde047' }}>
                                {ess.name} (Rank {ess.rank})
                              </span>
                              <span className="badge badge-warn">ไม่ชัวร์ — ข่าวลือ</span>
                            </div>
                            <div style={{ fontSize: '0.84rem', color: '#fef08a', marginTop: 4 }}>
                              "{ess.rumorText}"
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#9aa9c1', marginTop: 4 }}>
                              สี: {ess.color} · Active/Passive: ยังไม่ยืนยันแน่ชัด · มูลค่าตลาดประมาณ ~{ess.marketValue} G (?)
                            </div>
                            <div style={{ fontSize: '0.78rem', color: '#feb2b2', marginTop: 3 }}>
                              ข้อเสีย: ??? (ข่าวลือยังไม่ยืนยันผลข้างเคียง)
                            </div>
                          </div>
                        );
                      }

                      const isVerified = lvl === 'verified';
                      const syn = ess.synergyTag ? SYNERGY_BONUSES[ess.synergyTag] : null;
                      return (
                        <div
                          key={ess.id}
                          className="shop-item"
                          style={{
                            borderColor: isVerified
                              ? 'rgba(72, 187, 120, 0.55)'
                              : 'rgba(99, 179, 237, 0.55)',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6, flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: isVerified ? '#c6f6d5' : '#bee3f8' }}>
                              {ess.name} (Rank {ess.rank} · {ess.color})
                            </span>
                            <span className={`badge ${isVerified ? 'badge-success' : 'badge-lore'}`}>
                              {isVerified ? 'ยืนยันแล้ว 100%' : 'ยืนยันโดยกิลด์'}
                            </span>
                          </div>
                          {syn && (
                            <div style={{ fontSize: '0.78rem', color: syn.color, marginTop: 2 }}>
                              ✦ {syn.name}
                            </div>
                          )}
                          <div style={{ fontSize: '0.83rem', color: '#efe5d5', marginTop: 4 }}>
                            <strong>Passive ({ess.passiveName}):</strong> {ess.passiveDescription}
                          </div>
                          <div style={{ fontSize: '0.83rem', color: '#90cdf4', marginTop: 3 }}>
                            <strong>Active ({ess.activeSkill.name} · {ess.activeSkill.manaCost} MP):</strong> {ess.activeSkill.description}
                          </div>
                          {ess.drawbackText && (
                            <div style={{ fontSize: '0.8rem', color: '#feb2b2', marginTop: 3 }}>
                              ⚠️ <strong>ข้อเสีย:</strong> {ess.drawbackText}
                            </div>
                          )}
                          <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: 3 }}>
                            ดรอปจาก: {ess.monsterName} · มูลค่าตลาด: {ess.marketValue} G
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
