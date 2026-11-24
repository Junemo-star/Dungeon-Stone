import { useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ChevronDown,
  Eye,
  Flame,
  FlaskConical,
  HelpCircle,
  LogOut,
  Sparkles,
  Swords,
} from 'lucide-react';
import { ESSENCES, FLOORS, RACES } from '../data/loreData';
import { computeVisibleTiles, getSightRadius } from '../engine/gameEngine';
import { GameState } from '../types/game';

interface LabyrinthViewProps {
  state: GameState;
  onMove: (dx: number, dy: number) => void;
  onReturnToCity: () => void;
  onDescendFloor: () => void;
  onEnterRift: () => void;
  onRacialSkill: () => void;
  onActivateEssence: (essenceId: string) => void;
  onAbsorbEssence: (dropUid: string) => void;
  onBottleEssence: (dropUid: string) => void;
}

export function LabyrinthView({
  state,
  onMove,
  onReturnToCity,
  onDescendFloor,
  onEnterRift,
  onRacialSkill,
  onActivateEssence,
  onAbsorbEssence,
  onBottleEssence,
}: LabyrinthViewProps) {
  const { player, grid, explored, monsters, droppedEssences, droppedLoot } = state;
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
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onMove, state.activeEvent]);

  const visibleTiles = computeVisibleTiles(state);
  const sightRadius = getSightRadius(state);

  const currentTile = grid[player.y]?.[player.x];
  const onExitTile = currentTile === 'exit';
  const onPortalDown = currentTile === 'portal_down';
  const onRiftPortal = currentTile === 'rift_portal';
  const essenceHere = droppedEssences.find((d) => d.x === player.x && d.y === player.y);
  const vialCount =
    player.inventory.find((e) => e.item.id === 'essence_vial')?.quantity ?? 0;

  return (
    <div className="card">
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
            {state.inRift ? 'รอยแยกชั้นที่ 1 (Rift)' : FLOORS[state.currentFloor].thaiName}
            <span className="badge">Turn {state.turn}</span>
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
            <span className="badge">
              <Eye size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              ระยะมองเห็น {sightRadius} ช่อง
            </span>
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
                โฟกัสโจมตี: กำลังใช้งานอยู่ (นัดถัดไป +45%)
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
              เข้าสู่รอยแยก (Rift)
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

            const fogClass = !isExplored
              ? 'tile-unexplored'
              : !isVisible
                ? 'tile-dimmed'
                : '';

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
                        ? `${ESSENCES[ess.essenceId].name} (เหลือ ${ess.turnsRemaining} เทิร์น)`
                        : isVisible
                          ? tile
                          : 'พื้นที่สำรวจแล้ว (นอกระยะสายตา)'
                }
                onClick={() => {
                  if (isAdjacent) onMove(x - player.x, y - player.y);
                }}
              >
                {!isExplored ? null : isPlayer ? (
                  <div className="entity-player" title={player.name}>
                    {player.name.charAt(0).toUpperCase()}
                  </div>
                ) : monster ? (
                  <div className={monster.isBoss ? 'entity-boss' : 'entity-monster'}>
                    {monster.symbol}
                  </div>
                ) : ess ? (
                  <span style={{ color: '#d8b4fe' }}>✦</span>
                ) : loot ? (
                  <span style={{ color: '#38bdf8' }}>◆</span>
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

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
        <button
          className="btn btn-sm"
          onClick={onRacialSkill}
          disabled={player.mana < race.racialSkillCost || player.racialBuffTurns > 0}
          title={race.racialSkillDesc}
        >
          <Swords size={15} /> {race.racialSkillName} ({race.racialSkillCost} MP){' '}
          {player.racialBuffTurns > 0 ? `[${player.racialBuffTurns}T]` : ''}
        </button>

        {player.essences.map((ess) => (
          <button
            key={ess.id}
            className="btn btn-sm btn-lore"
            onClick={() => onActivateEssence(ess.id)}
            disabled={player.mana < ess.activeSkill.manaCost}
            title={ess.activeSkill.description}
          >
            <Sparkles size={15} /> {ess.activeSkill.name} ({ess.activeSkill.manaCost} MP)
          </button>
        ))}

        {essenceHere && (
          <>
            <button
              className="btn btn-sm btn-primary"
              onClick={() => onAbsorbEssence(essenceHere.uid)}
            >
              ดูดซับ {ESSENCES[essenceHere.essenceId].name} ({essenceHere.turnsRemaining}T)
            </button>
            <button
              className="btn btn-sm"
              disabled={vialCount === 0}
              onClick={() => onBottleEssence(essenceHere.uid)}
            >
              <FlaskConical size={14} /> เก็บใส่หลอดทดลอง ({vialCount})
            </button>
          </>
        )}
      </div>
    </div>
  );
}
