import { useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Bug,
  ChevronDown,
  Crown,
  Eye,
  Flame,
  FlaskConical,
  Ghost,
  HelpCircle,
  LogOut,
  Skull,
  Sparkles,
  Swords,
} from 'lucide-react';
import { ESSENCES, FLOORS, RACES } from '../data/loreData';
import { computeVisibleTiles, getEffectiveStats, getSightRadius } from '../engine/gameEngine';
import { getRiftTypeForFloor } from '../engine/mapGen';
import { GameState, MonsterInstance } from '../types/game';

interface LabyrinthViewProps {
  state: GameState;
  onMove: (dx: number, dy: number) => void;
  onReturnToCity: () => void;
  onExitRiftToFloor: () => void;
  onDescendFloor: () => void;
  onEnterRift: () => void;
  onRacialSkill: () => void;
  onActivateEssence: (essenceId: string) => void;
  onAbsorbEssence: (dropUid: string) => void;
  onGiveEssenceToAlly: (dropUid: string, memberId: string) => void;
  onBottleEssence: (dropUid: string) => void;
  onUseConsumable: (itemId: string) => void;
}

function renderMonsterIcon(m: MonsterInstance) {
  if (m.isBoss) return <Crown size={18} />;
  const id = m.templateId;
  if (id.includes('wolf') || id === 'manticore') return <Swords size={16} />;
  if (id.includes('ghost') || id.includes('spirit') || id.includes('soul') || id.includes('witch') || id === 'doppel_clone') {
    return <Ghost size={16} />;
  }
  if (id === 'krungbee' || id === 'cave_bat' || id === 'metcrow') return <Bug size={16} />;
  return <Skull size={16} />;
}

export function LabyrinthView({
  state,
  onMove,
  onReturnToCity,
  onExitRiftToFloor,
  onDescendFloor,
  onEnterRift,
  onRacialSkill,
  onActivateEssence,
  onAbsorbEssence,
  onGiveEssenceToAlly,
  onBottleEssence,
  onUseConsumable,
}: LabyrinthViewProps) {
  const { player, grid, explored, monsters, droppedEssences, droppedLoot, popups } = state;
  const race = RACES[player.raceId];
  const [showLegend, setShowLegend] = useState(false);
  const [showDpad, setShowDpad] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (state.activeEvent) return;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        onMove(0, -1);
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        onMove(0, 1);
      } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        onMove(-1, 0);
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        onMove(1, 0);
      } else if (e.key === '1') {
        e.preventDefault();
        onRacialSkill();
      } else if (['2', '3', '4', '5'].includes(e.key)) {
        const ess = player.essences[Number(e.key) - 2];
        if (ess) {
          e.preventDefault();
          onActivateEssence(ess.id);
        }
      } else if (e.key === 'q' || e.key === 'Q') {
        e.preventDefault();
        onUseConsumable('healing_potion');
      } else if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        onUseConsumable('torch');
      } else if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        onUseConsumable('bandage');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onMove, onRacialSkill, onActivateEssence, onUseConsumable, player.essences, state.activeEvent]);

  const visibleTiles = computeVisibleTiles(state);
  const sightRadius = getSightRadius(state);
  const playerStats = getEffectiveStats(player);

  const currentTile = grid[player.y]?.[player.x];
  const onExitTile = currentTile === 'exit';
  const onPortalDown = currentTile === 'portal_down';
  const onRiftPortal = currentTile === 'rift_portal';
  const essenceHere = droppedEssences.find((d) => d.x === player.x && d.y === player.y);
  const vialCount =
    player.inventory.find((e) => e.item.id === 'essence_vial')?.quantity ?? 0;

  let portalHint: string | null = null;
  if (!state.inRift && state.currentFloor < 7) {
    let py = -1;
    let px = -1;
    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[y].length; x++) {
        if (grid[y][x] === 'portal_down') {
          px = x;
          py = y;
        }
      }
    }
    if (px !== -1) {
      if (px === player.x && py === player.y) {
        portalHint = `อยู่บนประตูมิติ (▼) ชั้น ${state.currentFloor + 1} แล้ว!`;
      } else {
        const ns = py < player.y ? 'เหนือ' : py > player.y ? 'ใต้' : '';
        const ew = px > player.x ? 'ตะวันออก' : px < player.x ? 'ตะวันตก' : '';
        portalHint = `ทางลงชั้น ${state.currentFloor + 1} (▼): ทิศ${ns}${ew}`;
      }
    }
  }

  const riftType = getRiftTypeForFloor(state.currentFloor);
  const riftButtonLabel =
    riftType === 'glacial_cave'
      ? 'เข้ารอยแยก: ถ้ำธารน้ำแข็ง'
      : riftType === 'witch_forest'
        ? 'เข้ารอยแยก: ป่าแม่มด'
        : 'เข้ารอยแยก: แวมไพร์';

  const activeRiftTitle =
    state.activeRiftType === 'glacial_cave'
      ? 'รอยแยก: ถ้ำธารน้ำแข็ง (Glacial Cave)'
      : state.activeRiftType === 'witch_forest'
        ? 'รอยแยก: ป่าแม่มด (Witch Forest)'
        : 'รอยแยกชั้นที่ 1 (Vampire Rift)';

  return (
    <div key={state.screenShake} className={`card ${state.screenShake > 0 ? 'shake-anim' : ''}`}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 10,
          marginBottom: 10,
        }}
      >
        <div>
          <h2 style={{ margin: 0, border: 'none', padding: 0 }}>
            {state.inRift ? activeRiftTitle : FLOORS[state.currentFloor].thaiName}
            <span className="badge">Turn {state.turn}</span>
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
            <span className="badge">
              <Eye size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              ระยะมองเห็น {sightRadius} ช่อง
            </span>
            {portalHint && (
              <span className="badge" style={{ background: '#1e3a5f', color: '#93c5fd' }}>
                {portalHint}
              </span>
            )}
            {player.torchTurns > 0 && (
              <span className="badge badge-success">
                <Flame size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                คบไฟ: กำลังใช้งานอยู่ ({player.torchTurns} เทิร์น)
              </span>
            )}
            {player.racialBuffTurns > 0 && (
              <span className="badge badge-lore">
                {race.racialSkillName}: กำลังใช้งานอยู่ ({player.racialBuffTurns} เทิร์น)
              </span>
            )}
            {player.assimilationTurns > 0 && (
              <span className="badge badge-lore">
                พรางตัว: กำลังใช้งานอยู่ ({player.assimilationTurns} เทิร์น)
              </span>
            )}
            {player.keenFocusActive && (
              <span className="badge" style={{ background: '#78350f', color: '#fde68a' }}>
                โฟกัสโจมตี: กำลังใช้งานอยู่ (+45%)
              </span>
            )}
            {!state.inRift && state.currentFloor === 5 && player.essences.length < 5 && (
              <span className="badge badge-warn">
                แก่นแท้ {player.essences.length}/5 (โดนตีแรง +30%)
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setShowLegend((v) => !v)}
          >
            <HelpCircle size={14} /> สัญลักษณ์
            <ChevronDown size={14} className={`chevron ${showLegend ? 'chevron-open' : ''}`} />
          </button>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setShowDpad((v) => !v)}
          >
            ปุ่มทิศทาง
            <ChevronDown size={14} className={`chevron ${showDpad ? 'chevron-open' : ''}`} />
          </button>
          {onExitTile && state.inRift && (
            <button className="btn btn-lore btn-sm" onClick={onExitRiftToFloor}>
              ออกจากรอยแยกกลับชั้นที่ {state.currentFloor}
            </button>
          )}
          {onExitTile && (
            <button className="btn btn-primary btn-sm" onClick={onReturnToCity}>
              <LogOut size={14} /> กลับเมือง
            </button>
          )}
          {onPortalDown && (
            <button className="btn btn-primary btn-sm" onClick={onDescendFloor}>
              ลงสู่ชั้นที่ {state.currentFloor + 1}
            </button>
          )}
          {onRiftPortal && (
            <button className="btn btn-lore btn-sm" onClick={onEnterRift}>
              {riftButtonLabel}
            </button>
          )}
        </div>
      </div>

      {showLegend && (
        <div
          className="stat-box"
          style={{
            marginBottom: 10,
            fontSize: '0.86rem',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <span><strong>E</strong>: ทางออกเมือง</span>
          <span style={{ color: '#93c5fd' }}><strong>▼</strong>: ลงชั้นถัดไป</span>
          <span style={{ color: '#e9d5ff' }}><strong>◎</strong>: รอยแยก</span>
          <span><strong>☠</strong>: แท่นบอส</span>
          <span style={{ color: '#d8b4fe' }}><strong>✦</strong>: Essence</span>
          <span style={{ color: '#38bdf8' }}><strong>◆</strong>: Magic Stone</span>
        </div>
      )}

      <div className="dungeon-stage-wrap">
        <div className="dungeon-grid">
          {grid.map((row, y) =>
            row.map((tile, x) => {
              const isVisible = Boolean(visibleTiles[y]?.[x]);
              const isExplored = Boolean(explored[y]?.[x]);
              const isPlayer = player.x === x && player.y === y;
              const monster = isVisible ? monsters.find((m) => m.x === x && m.y === y) : undefined;
              const ess = isVisible ? droppedEssences.find((d) => d.x === x && d.y === y) : undefined;
              const loot = isVisible ? droppedLoot.find((l) => l.x === x && l.y === y) : undefined;
              const isAdjacent = Math.abs(player.x - x) + Math.abs(player.y - y) === 1;
              const tilePopups = popups.filter((p) => p.x === x && p.y === y);

              const fogClass = !isExplored
                ? 'tile-unexplored'
                : !isVisible
                  ? 'tile-dimmed'
                  : player.torchTurns > 0
                    ? 'tile-torch-lit'
                    : '';

              const monHpPct = monster ? Math.max(0, Math.round((monster.hp / monster.maxHp) * 100)) : 0;

              return (
                <div
                  key={`${x}_${y}`}
                  className={`tile tile-${tile} ${fogClass} ${isAdjacent ? 'tile-clickable' : ''}`}
                  title={
                    !isExplored
                      ? 'พื้นที่มืด (ยังไม่สำรวจ)'
                      : monster
                        ? `${monster.name} (Rank ${monster.rank} | HP ${monster.hp}/${monster.maxHp})`
                        : ess
                          ? `${ESSENCES[ess.essenceId].name}${(state.essenceKnowledge[ess.essenceId] ?? 'unknown') === 'unknown' ? ' (ไม่รู้ข้อมูล)' : state.essenceKnowledge[ess.essenceId] === 'rumor' ? ' (ไม่ชัวร์)' : ''} (เหลือ ${ess.turnsRemaining} เทิร์น)`
                          : isVisible
                            ? tile
                            : 'พื้นที่สำรวจแล้ว (นอกระยะสายตา)'
                  }
                  onClick={() => {
                    if (isAdjacent) onMove(x - player.x, y - player.y);
                  }}
                >
                  {tilePopups.map((p) => (
                    <span key={p.id} className="floating-popup" style={{ color: p.color }}>
                      {p.text}
                    </span>
                  ))}

                  {!isExplored ? null : isPlayer ? (
                    <div className="entity-player" title={player.name}>
                      {player.name.charAt(0).toUpperCase()}
                    </div>
                  ) : monster ? (
                    <div className={monster.isBoss ? 'entity-boss' : 'entity-monster'}>
                      {renderMonsterIcon(monster)}
                      {monster.hp < monster.maxHp && (
                        <div className="mon-hp-bar">
                          <div className="mon-hp-fill" style={{ width: `${monHpPct}%` }} />
                        </div>
                      )}
                    </div>
                  ) : ess ? (
                    <span style={{ color: '#d8b4fe' }}>✦</span>
                  ) : loot ? (
                    <span style={{ color: '#63b3ed' }}>◆</span>
                  ) : tile === 'exit' ? (
                    'E'
                  ) : tile === 'portal_down' ? (
                    '▼'
                  ) : tile === 'rift_portal' ? (
                    '◎'
                  ) : tile === 'crystal' ? (
                    '▲'
                  ) : tile === 'boss_altar' ? (
                    '☠'
                  ) : (
                    ''
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {showDpad && (
        <div style={{ marginTop: 10 }}>
          <div className="dpad">
            <div />
            <button className="btn btn-sm" onClick={() => onMove(0, -1)} aria-label="Move Up">
              <ArrowUp size={16} />
            </button>
            <div />
            <button className="btn btn-sm" onClick={() => onMove(-1, 0)} aria-label="Move Left">
              <ArrowLeft size={16} />
            </button>
            <button className="btn btn-sm" onClick={() => onMove(0, 1)} aria-label="Move Down">
              <ArrowDown size={16} />
            </button>
            <button className="btn btn-sm" onClick={() => onMove(1, 0)} aria-label="Move Right">
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {essenceHere && (() => {
        const essenceMeta = ESSENCES[essenceHere.essenceId];
        const kLevel = state.essenceKnowledge[essenceHere.essenceId] ?? 'unknown';
        const statusBadge =
          kLevel === 'unknown' ? (
            <span className="badge">ไม่รู้ข้อมูล</span>
          ) : kLevel === 'rumor' ? (
            <span className="badge badge-warn">ไม่ชัวร์ — ข่าวลือ</span>
          ) : kLevel === 'guild' ? (
            <span className="badge badge-lore">ยืนยันโดยกิลด์</span>
          ) : (
            <span className="badge badge-success">ยืนยันแล้ว 100%</span>
          );

        return (
          <div className="essence-banner">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Sparkles size={16} color="#e9d8fd" />
              <strong style={{ color: '#e9d8fd', fontSize: '0.92rem' }}>
                พบแก่นแท้: {essenceMeta.name} (เหลือ {essenceHere.turnsRemaining}T)
              </strong>
              {statusBadge}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <button
                className="btn btn-sm btn-primary"
                onClick={() => onAbsorbEssence(essenceHere.uid)}
                title={
                  kLevel === 'unknown'
                    ? 'ยังไม่มีข้อมูลในสารานุกรม — ดูดซับเพื่อยืนยันผลลัพธ์จริง'
                    : kLevel === 'rumor'
                      ? `ข่าวลือ (ไม่ชัวร์): ${essenceMeta.rumorText}`
                      : essenceMeta.passiveDescription
                }
              >
                ดูดซับทันที
              </button>
              {player.party
                .filter((p) => p.canAbsorbEssence)
                .map((ally) => (
                  <button
                    key={ally.id}
                    className="btn btn-sm"
                    onClick={() => onGiveEssenceToAlly(essenceHere.uid, ally.id)}
                  >
                    ให้ {ally.name} ดูดซับ
                  </button>
                ))}
              <button
                className="btn btn-sm"
                disabled={vialCount === 0}
                onClick={() => onBottleEssence(essenceHere.uid)}
              >
                <FlaskConical size={14} /> ใส่หลอด ({vialCount})
              </button>
            </div>
          </div>
        );
      })()}

      {(() => {
        const qtyOf = (id: string) =>
          player.inventory.find((e) => e.item.id === id)?.quantity ?? 0;

        const quickBelt: Array<{ id: string; label: string; keyHint?: string; activeGlow?: boolean }> = [
          { id: 'healing_potion', label: 'โพชั่น', keyHint: 'Q' },
          { id: 'torch', label: 'คบไฟ', keyHint: 'T', activeGlow: player.torchTurns > 0 },
          { id: 'bandage', label: 'ผ้าพันแผล', keyHint: 'B' },
          { id: 'holy_water', label: 'น้ำมนต์' },
          { id: 'ration_meal', label: 'เสบียง' },
        ];

        return (
          <div className="hotbar-dock">
            <div className="hotbar-group">
              <span className="hotbar-label">สกิล:</span>
              <button
                className="btn btn-sm hotbar-slot"
                onClick={onRacialSkill}
                disabled={player.mana < race.racialSkillCost || player.racialBuffTurns > 0}
                title={race.racialSkillDesc}
              >
                <span className="hotkey-cap">1</span>
                {race.racialSkillName} ({race.racialSkillCost}MP)
                {player.racialBuffTurns > 0 ? ` [${player.racialBuffTurns}T]` : ''}
              </button>

              {player.essences.map((ess, idx) => {
                const effCost = ess.activeSkill.manaCost + playerStats.extraManaCost;
                return (
                  <button
                    key={ess.id}
                    className="btn btn-sm btn-lore hotbar-slot"
                    onClick={() => onActivateEssence(ess.id)}
                    disabled={player.mana < effCost}
                    title={`${ess.activeSkill.description}${ess.drawbackText ? ` | ⚠️ ข้อเสีย: ${ess.drawbackText}` : ''}`}
                  >
                    {idx < 4 && <span className="hotkey-cap">{idx + 2}</span>}
                    {ess.activeSkill.name} ({effCost}MP)
                  </button>
                );
              })}
            </div>

            <div className="hotbar-group">
              <span className="hotbar-label">เข็มขัด:</span>
              {quickBelt.map((slot) => {
                const qty = qtyOf(slot.id);
                return (
                  <button
                    key={slot.id}
                    type="button"
                    className={`btn btn-sm hotbar-slot ${slot.activeGlow ? 'btn-primary' : ''}`}
                    disabled={qty <= 0}
                    onClick={() => onUseConsumable(slot.id)}
                    title={
                      slot.id === 'torch' && player.torchTurns > 0
                        ? `คบไฟกำลังใช้งานอยู่ (เหลือ ${player.torchTurns} เทิร์น)`
                        : `ใช้ ${slot.label}`
                    }
                  >
                    {slot.keyHint && <span className="hotkey-cap">{slot.keyHint}</span>}
                    {slot.label} ({qty})
                  </button>
                );
              })}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
