import { useState } from 'react';
import { AlertTriangle, Award, Globe, MessageSquare, X } from 'lucide-react';
import { COMMUNITY_OFFERS, COMMUNITY_POSTS, STORY_QUESTS } from '../data/storyData';
import { isQuestCompleted } from '../engine/cityActions';
import { GameState } from '../types/game';

interface CommunityModalProps {
  state: GameState;
  onClose: () => void;
  onClaimQuest: (questId: string) => void;
  onBuyOffer: (offerId: string) => void;
}

export function CommunityModal({
  state,
  onClose,
  onClaimQuest,
  onBuyOffer,
}: CommunityModalProps) {
  const [tab, setTab] = useState<'quests' | 'forum'>('quests');

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
              className={`tab-btn ${tab === 'quests' ? 'tab-btn-active' : ''}`}
              onClick={() => setTab('quests')}
            >
              <Award size={16} /> ภารกิจเนื้อเรื่อง
            </button>
            <button
              type="button"
              className={`tab-btn ${tab === 'forum' ? 'tab-btn-active' : ''}`}
              onClick={() => setTab('forum')}
            >
              <Globe size={16} /> คอมมูนิตี้วิญญาณร้าย ({state.player.gp} GP)
            </button>
          </div>
          <button type="button" className="btn btn-sm" onClick={onClose}>
            <X size={16} /> ปิด
          </button>
        </div>

        <div className="loadout-body">
          {tab === 'quests' && (
            <div style={{ display: 'grid', gap: 10 }}>
              {STORY_QUESTS.map((quest) => {
                const claimed = state.claimedQuestIds.includes(quest.id);
                const ready = isQuestCompleted(state, quest.id);
                return (
                  <div
                    key={quest.id}
                    className="equip-slot"
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.98rem', color: '#fbbf24' }}>
                        {quest.title}{' '}
                        {claimed && <span className="badge badge-success">รับรางวัลแล้ว</span>}
                      </div>
                      <div style={{ fontSize: '0.88rem', color: '#cbd5e1', marginTop: 3 }}>
                        {quest.description}
                      </div>
                      <div style={{ fontSize: '0.84rem', color: '#9aa9c1', marginTop: 3 }}>
                        เงื่อนไข: {quest.requirementText} · รางวัล: +{quest.rewardGold} Gold, +
                        {quest.rewardGp} GP{quest.unlocksNoark ? ' + ปลดล็อกโนอาร์ค' : ''}
                      </div>
                    </div>
                    <button
                      className="btn btn-sm btn-primary"
                      disabled={claimed || !ready}
                      onClick={() => onClaimQuest(quest.id)}
                    >
                      {claimed ? 'สำเร็จ' : ready ? 'รับรางวัล' : 'ยังไม่ผ่าน'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'forum' && (
            <div style={{ display: 'grid', gap: 14 }}>
              <div
                className="stat-box"
                style={{
                  padding: '10px 14px',
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <div style={{ fontSize: '0.94rem' }}>
                  <strong>แต้ม GP คงเหลือ:</strong>{' '}
                  <span style={{ color: '#c084fc', fontWeight: 700 }}>{state.player.gp} GP</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem' }}>
                  <AlertTriangle
                    size={15}
                    color={state.player.suspicion >= 60 ? '#ef4444' : '#fbbf24'}
                  />
                  ความสงสัยนักล่าวิญญาณร้าย:{' '}
                  <strong style={{ color: state.player.suspicion >= 60 ? '#fca5a5' : '#fde68a' }}>
                    {state.player.suspicion}/100
                  </strong>
                </div>
              </div>

              <div>
                <h3 style={{ margin: '0 0 8px', fontSize: '0.96rem', color: '#e9d5ff' }}>
                  แลกเปลี่ยนแต้ม GP (ร้านค้าลับผู้เล่น)
                </h3>
                <div className="shop-list">
                  {COMMUNITY_OFFERS.map((offer) => (
                    <div key={offer.id} className="shop-item">
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.94rem' }}>{offer.title}</div>
                        <div style={{ fontSize: '0.84rem', color: '#9aa9c1', marginTop: 4 }}>
                          {offer.description}
                        </div>
                        <div style={{ fontSize: '0.82rem', color: '#fbbf24', marginTop: 4 }}>
                          {offer.suspicionIncrease > 0
                            ? `เพิ่มความสงสัย +${offer.suspicionIncrease}`
                            : `ลดความสงสัย ${offer.suspicionIncrease}`}
                        </div>
                      </div>
                      <button
                        className="btn btn-sm btn-lore"
                        disabled={state.player.gp < offer.gpCost}
                        onClick={() => onBuyOffer(offer.id)}
                      >
                        ใช้ {offer.gpCost} GP
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3
                  style={{
                    margin: '0 0 8px',
                    fontSize: '0.96rem',
                    color: '#93c5fd',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <MessageSquare size={15} /> กระทู้ข่าวกรองในคอมมูนิตี้
                </h3>
                <div style={{ display: 'grid', gap: 8 }}>
                  {COMMUNITY_POSTS.map((post) => (
                    <div key={post.id} className="equip-slot">
                      <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#93c5fd' }}>
                        {post.title} <span className="badge">โดย {post.author}</span>
                      </div>
                      <div style={{ fontSize: '0.86rem', color: '#cbd5e1', marginTop: 4 }}>
                        {post.content}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
