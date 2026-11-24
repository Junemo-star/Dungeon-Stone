import { useCallback, useEffect, useState } from 'react';
import { ChevronDown, Coins, RotateCcw, ScrollText, Swords } from 'lucide-react';
import { CharacterPanel } from './components/CharacterPanel';
import { CityView } from './components/CityView';
import { LabyrinthView } from './components/LabyrinthView';
import { LoadoutModal, LoadoutTab } from './components/LoadoutModal';
import { SetupView } from './components/SetupView';
import {
  advanceClosedCycle,
  buyItemInCity,
  buyRank7Lore,
  dismissPartyMember,
  extractEssenceAtTemple,
  hirePartyMember,
  payTaxInCity,
  purifyCursesAtTemple,
  repairArmorInCity,
  restAtInn,
  sellAllMagicStones,
  sellEssenceVial,
  useGamerKnowledge,
} from './engine/cityActions';
import {
  absorbDroppedEssence,
  activateEssenceSkill,
  activateRacialSkill,
  bottleDroppedEssence,
  createInitialGameState,
  descendNextFloor,
  enterLabyrinth,
  enterRift,
  equipItemFromInventory,
  resolveRandomEvent,
  returnToCity,
  startGameWithSetup,
  stepPlayer,
  useConsumable,
} from './engine/gameEngine';
import { clearSavedGame, loadGameState, saveGameState } from './engine/storage';

export default function App() {
  const [state, setState] = useState(() => loadGameState() ?? createInitialGameState());
  const [showAllLogs, setShowAllLogs] = useState(false);
  const [loadoutTab, setLoadoutTab] = useState<LoadoutTab | null>(null);

  useEffect(() => {
    if (state.phase !== 'setup') {
      saveGameState(state);
    }
  }, [state]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (state.phase === 'setup') return;
      if (e.key === 'Escape' && loadoutTab) {
        setLoadoutTab(null);
      } else if ((e.key === 'i' || e.key === 'I') && !state.activeEvent) {
        setLoadoutTab((prev) => (prev ? null : 'gear'));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state.phase, state.activeEvent, loadoutTab]);

  const handleMove = useCallback((dx: number, dy: number) => {
    setState((prev) => stepPlayer(prev, dx, dy));
  }, []);

  const handleResetGame = () => {
    clearSavedGame();
    setLoadoutTab(null);
    setState(createInitialGameState());
  };

  const visibleLogs = showAllLogs ? state.logs : state.logs.slice(0, 2);

  return (
    <div className="app-shell">
      <header className="top-bar">
        <div className="title-group">
          <h1>
            <Swords size={22} /> Dungeon &amp; Stone
          </h1>
        </div>
        <div className="resource-pills">
          {state.phase !== 'setup' && (
            <>
              <div className="pill">วันที่ {state.day}</div>
              <div className="pill" style={{ color: '#fbbf24' }}>
                <Coins size={15} /> {state.gold} Gold
              </div>
              <button
                type="button"
                className="btn btn-sm"
                onClick={handleResetGame}
                title="ล้างเซฟและเริ่มใหม่"
              >
                <RotateCcw size={14} /> เริ่มใหม่
              </button>
            </>
          )}
          <div className="pill">
            {state.phase === 'setup'
              ? 'เลือกโหมดและเผ่าพันธุ์'
              : state.phase === 'city'
                ? 'เมืองลาฟโดเนีย'
                : state.phase === 'labyrinth'
                  ? state.inRift
                    ? 'รอยแยกชั้นที่ 1'
                    : `เขาวงกตชั้นที่ ${state.currentFloor}`
                  : 'Game Over'}
          </div>
        </div>
      </header>

      {state.phase === 'setup' ? (
        <SetupView
          onStartGame={(mode, raceId, name) =>
            setState(startGameWithSetup(mode, raceId, name))
          }
        />
      ) : (
        <div className="main-grid">
          <CharacterPanel state={state} onOpenModal={(tab) => setLoadoutTab(tab)} />

          <div className="right-pane">
            <div className="main-stage">
              {state.phase === 'city' && (
                <CityView
                  state={state}
                  onBuyItem={(id) => setState((prev) => buyItemInCity(prev, id))}
                  onSellStones={() => setState((prev) => sellAllMagicStones(prev))}
                  onSellVial={(uid) => setState((prev) => sellEssenceVial(prev, uid))}
                  onHireParty={(id) => setState((prev) => hirePartyMember(prev, id))}
                  onDismissParty={(id) => setState((prev) => dismissPartyMember(prev, id))}
                  onPayTax={() => setState((prev) => payTaxInCity(prev))}
                  onPurifyCurses={() => setState((prev) => purifyCursesAtTemple(prev))}
                  onExtractEssence={(id) => setState((prev) => extractEssenceAtTemple(prev, id))}
                  onUseGamerKnowledge={() => setState((prev) => useGamerKnowledge(prev))}
                  onBuyRank7Lore={() => setState((prev) => buyRank7Lore(prev))}
                  onRepairArmor={() => setState((prev) => repairArmorInCity(prev))}
                  onRestInn={() => setState((prev) => restAtInn(prev))}
                  onAdvanceClosedCycle={() => setState((prev) => advanceClosedCycle(prev))}
                  onEnterLabyrinth={(floor) => setState((prev) => enterLabyrinth(prev, floor))}
                />
              )}

              {state.phase === 'labyrinth' && (
                <LabyrinthView
                  state={state}
                  onMove={handleMove}
                  onReturnToCity={() => setState((prev) => returnToCity(prev))}
                  onDescendFloor={() => setState((prev) => descendNextFloor(prev))}
                  onEnterRift={() => setState((prev) => enterRift(prev))}
                  onRacialSkill={() => setState((prev) => activateRacialSkill(prev))}
                  onActivateEssence={(id) => setState((prev) => activateEssenceSkill(prev, id))}
                  onAbsorbEssence={(uid) => setState((prev) => absorbDroppedEssence(prev, uid))}
                  onBottleEssence={(uid) => setState((prev) => bottleDroppedEssence(prev, uid))}
                />
              )}

              {state.phase === 'gameover' && (
                <div className="card" style={{ borderColor: '#ef4444' }}>
                  <h2 style={{ color: '#fca5a5' }}>สิ้นสุดการผจญภัย (Game Over)</h2>
                  <p style={{ fontSize: '0.96rem' }}>{state.gameOverReason}</p>
                  <button className="btn btn-primary" onClick={handleResetGame}>
                    กลับไปหน้าเลือกโหมดและเผ่าพันธุ์
                  </button>
                </div>
              )}
            </div>

            <div className="card log-panel" style={{ padding: '10px 14px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 8,
                }}
              >
                <span
                  style={{
                    fontSize: '0.92rem',
                    fontWeight: 700,
                    color: '#f59e0b',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <ScrollText size={15} /> บันทึกเหตุการณ์ล่าสุด
                </span>
                {state.logs.length > 2 && (
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => setShowAllLogs((v) => !v)}
                  >
                    {showAllLogs ? 'ย่อบันทึก' : `ดูทั้งหมด (${state.logs.length})`}
                    <ChevronDown
                      size={14}
                      className={`chevron ${showAllLogs ? 'chevron-open' : ''}`}
                    />
                  </button>
                )}
              </div>
              <div className={`log-box ${showAllLogs ? 'log-box-expanded' : ''}`}>
                {visibleLogs.map((log) => (
                  <div key={log.id} className={`log-item log-${log.tone}`}>
                    <strong>[T{log.turn}]</strong> {log.text}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {loadoutTab && (
        <LoadoutModal
          state={state}
          activeTab={loadoutTab}
          onChangeTab={setLoadoutTab}
          onClose={() => setLoadoutTab(null)}
          onUseConsumable={(id) => setState((prev) => useConsumable(prev, id))}
          onEquipItem={(id) => setState((prev) => equipItemFromInventory(prev, id))}
        />
      )}

      {state.activeEvent && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h2 style={{ margin: '0 0 8px', color: '#fbbf24', fontSize: '1.12rem' }}>
              {state.activeEvent.title}
            </h2>
            <p style={{ fontSize: '0.94rem', color: '#cbd5e1', margin: '0 0 14px' }}>
              {state.activeEvent.description}
            </p>
            <div style={{ display: 'grid', gap: 8 }}>
              {state.activeEvent.choices.map((choice) => (
                <button
                  key={choice.effectKey}
                  className="btn btn-primary"
                  onClick={() => setState((prev) => resolveRandomEvent(prev, choice.effectKey))}
                >
                  {choice.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
