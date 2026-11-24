import { useCallback, useEffect, useState } from 'react';
import {
  ChevronDown,
  Coins,
  RotateCcw,
  ScrollText,
  Swords,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { CharacterPanel } from './components/CharacterPanel';
import { CityView } from './components/CityView';
import { CommunityModal } from './components/CommunityModal';
import { LabyrinthView } from './components/LabyrinthView';
import { LoadoutModal, LoadoutTab } from './components/LoadoutModal';
import { SetupView } from './components/SetupView';
import {
  absorbStoredVial,
  advanceClosedCycle,
  auctionSellEssenceVial,
  buyAuctionEssence,
  buyCommunityOffer,
  buyEssenceBook,
  buyItemInCity,
  buyRank7Lore,
  buyRoundAtTavern,
  claimStoryQuest,
  dismissPartyMember,
  drinkAtTavern,
  extractEssenceAtTemple,
  freeTavernGossip,
  hirePartyMember,
  payTaxInCity,
  purifyCursesAtTemple,
  refreshDailyNews,
  repairArmorInCity,
  rerollTavernMercenaries,
  restAtInn,
  sellAllMagicStones,
  sellEssenceVial,
  switchCity,
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
  exitRiftToFloor,
  giveEssenceToPartyMember,
  resolveRandomEvent,
  returnToCity,
  startGameWithSetup,
  stepPlayer,
  useConsumable,
} from './engine/gameEngine';
import { playSfx, SfxType } from './engine/sound';
import { clearSavedGame, loadGameState, saveGameState } from './engine/storage';

export default function App() {
  const [state, setState] = useState(() => loadGameState() ?? createInitialGameState());
  const [showAllLogs, setShowAllLogs] = useState(false);
  const [loadoutTab, setLoadoutTab] = useState<LoadoutTab | null>(null);
  const [showCommunity, setShowCommunity] = useState(false);

  useEffect(() => {
    if (state.phase !== 'setup') {
      saveGameState(state);
    }
  }, [state]);

  useEffect(() => {
    if (!state.lastSfx) return;
    const sfxType = state.lastSfx.split(':')[0] as SfxType;
    playSfx(sfxType, state.soundMuted);
  }, [state.lastSfx, state.soundMuted]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (state.phase === 'setup') return;
      if (e.key === 'Escape') {
        if (loadoutTab) setLoadoutTab(null);
        if (showCommunity) setShowCommunity(false);
      } else if ((e.key === 'i' || e.key === 'I') && !state.activeEvent) {
        setShowCommunity(false);
        setLoadoutTab((prev) => (prev ? null : 'gear'));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state.phase, state.activeEvent, loadoutTab, showCommunity]);

  const handleMove = useCallback((dx: number, dy: number) => {
    setState((prev) => stepPlayer(prev, dx, dy));
  }, []);

  const handleResetGame = () => {
    clearSavedGame();
    setLoadoutTab(null);
    setShowCommunity(false);
    setState(createInitialGameState());
  };

  const visibleLogs = showAllLogs ? state.logs : state.logs.slice(0, 2);

  const isNoarkTheme = state.phase === 'city' && state.cityId === 'noark';

  return (
    <div className={`app-shell ${isNoarkTheme ? 'theme-noark' : ''}`}>
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
                onClick={() =>
                  setState((prev) => ({ ...prev, soundMuted: !prev.soundMuted }))
                }
                title="เปิด/ปิดเสียงประกอบ"
              >
                {state.soundMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
              </button>
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
                ? state.cityId === 'noark'
                  ? 'เมืองใต้ดินโนอาร์ค'
                  : 'เมืองลาฟโดเนีย'
                : state.phase === 'labyrinth'
                  ? state.inRift
                    ? 'รอยแยก'
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
                  onBuyItem={(id, qty) => setState((prev) => buyItemInCity(prev, id, qty))}
                  onSellStones={() => setState((prev) => sellAllMagicStones(prev))}
                  onSellVial={(uid) => setState((prev) => sellEssenceVial(prev, uid))}
                  onAuctionSellVial={(uid) => setState((prev) => auctionSellEssenceVial(prev, uid))}
                  onBuyAuctionEssence={(lid) => setState((prev) => buyAuctionEssence(prev, lid))}
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
                  onSwitchCity={(city) => setState((prev) => switchCity(prev, city))}
                  onOpenCommunity={() => setShowCommunity(true)}
                  onRefreshNews={() => setState((prev) => refreshDailyNews(prev))}
                  onFreeTavernGossip={() => setState((prev) => freeTavernGossip(prev))}
                  onDrinkTavern={() => setState((prev) => drinkAtTavern(prev))}
                  onBuyRoundTavern={() => setState((prev) => buyRoundAtTavern(prev))}
                  onBuyEssenceBook={(tier) => setState((prev) => buyEssenceBook(prev, tier))}
                  onRerollMercenaries={() => setState((prev) => rerollTavernMercenaries(prev))}
                />
              )}

              {state.phase === 'labyrinth' && (
                <LabyrinthView
                  state={state}
                  onMove={handleMove}
                  onReturnToCity={() => setState((prev) => returnToCity(prev))}
                  onExitRiftToFloor={() => setState((prev) => exitRiftToFloor(prev))}
                  onDescendFloor={() => setState((prev) => descendNextFloor(prev))}
                  onEnterRift={() => setState((prev) => enterRift(prev))}
                  onRacialSkill={() => setState((prev) => activateRacialSkill(prev))}
                  onActivateEssence={(id) => setState((prev) => activateEssenceSkill(prev, id))}
                  onAbsorbEssence={(uid) => setState((prev) => absorbDroppedEssence(prev, uid))}
                  onGiveEssenceToAlly={(uid, memberId) =>
                    setState((prev) => giveEssenceToPartyMember(prev, uid, memberId))
                  }
                  onBottleEssence={(uid) => setState((prev) => bottleDroppedEssence(prev, uid))}
                  onUseConsumable={(itemId) => setState((prev) => useConsumable(prev, itemId))}
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
          onAbsorbStoredVial={(uid) => setState((prev) => absorbStoredVial(prev, uid))}
        />
      )}

      {showCommunity && (
        <CommunityModal
          state={state}
          onClose={() => setShowCommunity(false)}
          onClaimQuest={(qid) => setState((prev) => claimStoryQuest(prev, qid))}
          onBuyOffer={(oid) => setState((prev) => buyCommunityOffer(prev, oid))}
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
