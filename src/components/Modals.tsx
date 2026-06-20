/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Player, BoardTile, RandomEvent, ChanceCard } from '../types';
import { GROUP_CONFIG, MORT_RATIO, UNMORT_RATIO, BANK_LOAN_MAX, INITIAL_BOARD_TILES } from '../constants';
import { fmtK, capitalize } from '../utils';

// ── Generic Info Modal Props ──
interface InfoModalProps {
  isOpen: boolean;
  icon: string;
  title: string;
  sub: string;
  price: string;
  rent: string;
  owner: string;
  desc: string;
  actions: { label: string; cls: string; cb: () => void }[];
  onOutsideClick: () => void;
}

export const InfoModal: React.FC<InfoModalProps> = ({
  isOpen,
  icon,
  title,
  sub,
  price,
  rent,
  owner,
  desc,
  actions,
  onOutsideClick,
}) => {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay open select-none" onClick={onOutsideClick}>
      <div className="modal-box bracket bg-[#080d16]/95 border border-[rgba(0,212,255,0.4)] relative p-6" onClick={e => e.stopPropagation()}>
        {/* Top-Right Dismiss Button */}
        <button
          onClick={onOutsideClick}
          className="absolute top-4 right-4 text-slate-400 hover:text-white hover:scale-115 transition font-black font-mono text-[14px] cursor-pointer z-50"
          title="Dismiss Decision Dialog"
        >
          ✕
        </button>
        <div className="modal-header flex items-center gap-4 mb-4">
          <span className="modal-biz-icon text-[32px]">{icon}</span>
          <div className="min-w-0">
            <h3 className="modal-title font-sans font-bold text-[14px] text-white truncate">{title}</h3>
            <p className="modal-subtitle text-[10px] text-[#00d4ff] font-mono tracking-wider">{sub}</p>
          </div>
        </div>
        
        <div className="modal-stats-row grid grid-cols-3 gap-2 mb-4">
          <div className="ms-item bg-black/35 border border-[rgba(0,212,255,0.15)] rounded p-2 text-center">
            <div className="ms-val font-mono text-[11px] font-bold text-white">{price}</div>
            <div className="ms-lbl text-[8px] text-slate-400 font-mono tracking-widerUpper uppercase">Price</div>
          </div>
          <div className="ms-item bg-black/35 border border-[rgba(0,212,255,0.15)] rounded p-2 text-center">
            <div className="ms-val font-mono text-[11px] font-bold text-[#00ff88]">{rent}</div>
            <div className="ms-lbl text-[8px] text-slate-400 font-mono tracking-widerUpper uppercase">Income</div>
          </div>
          <div className="ms-item bg-black/35 border border-[rgba(0,212,255,0.15)] rounded p-2 text-center">
            <div className="ms-val font-mono text-[11px] font-bold text-[#ffb700] truncate">{owner}</div>
            <div className="ms-lbl text-[8px] text-slate-400 font-mono tracking-widerUpper uppercase">Owner</div>
          </div>
        </div>

        <div className="modal-desc text-[11px] text-slate-300 leading-relaxed mb-4 max-h-[120px] overflow-y-auto whitespace-pre-wrap font-sans pr-1">
          {desc}
        </div>

        <div className="modal-actions flex flex-wrap gap-2">
          {actions.map((act, i) => (
            <button
              key={i}
              onClick={act.cb}
              className={`ma-btn flex-1 p-2.5 rounded font-mono text-[11px] font-bold min-h-[40px] cursor-pointer transition uppercase tracking-wider ${
                act.cls === 'buy' ? 'bg-[#00ff88]/15 border border-[#00ff88] text-[#00ff88] hover:bg-[#00ff88]/25' :
                act.cls === 'upgrade' ? 'bg-[#7b2fff]/15 border border-[#7b2fff] text-[#e040fb] hover:bg-[#7b2fff]/25' :
                act.cls === 'auction' ? 'bg-[#ffb700]/15 border border-[#ffb700] text-[#ffb700] hover:bg-[#ffb700]/25' :
                'bg-slate-900 border border-slate-600 text-slate-300 hover:bg-slate-800'
              }`}
            >
              {act.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};


// ── Real-Time Smart Auction Modal Props & logic ──
interface AuctionModalProps {
  isOpen: boolean;
  tile: BoardTile | null;
  players: Player[];
  skippedPlayerId: number;
  onFinalize: (winner: Player | null, finalBid: number) => void;
  onAddArenaLog: (player: string, action: string, type: 'event'|'good'|'bad'|'info') => void;
  onBankLoanRequest: (suggestedAmount: number, onDone: (ok: boolean) => void) => void;
}

export const AuctionModal: React.FC<AuctionModalProps> = ({
  isOpen,
  tile,
  players,
  skippedPlayerId,
  onFinalize,
  onAddArenaLog,
  onBankLoanRequest,
}) => {
  const [currentBid, setCurrentBid] = useState(0);
  const [highBidder, setHighBidder] = useState<Player | null>(null);
  const [maxBids, setMaxBids] = useState<{ [playerId: number]: number }>({});
  const [biddingDone, setBiddingDone] = useState(false);
  const [gavelStage, setGavelStage] = useState<number>(4); // 4 = active, 3 = Going once!, 2 = Going twice!, 1 = SOLD!, 0 = concluded

  // Initialize AI target limitations
  const initAuction = () => {
    if (!tile) return;
    const active = players.filter(p => !p.bankrupt);
    const calculated: { [pid: number]: number } = {};

    active.forEach(p => {
      // Calculate group count for multiplier
      const ownedCount = p.properties.filter(id => {
        const gTile = INITIAL_BOARD_TILES.find(t => t.id === id);
        return gTile && gTile.group === tile.group;
      }).length;

      const agg = 0.4 + Math.random() * 0.6; // random aggression 0.4 - 1.0
      const stratFactor = ownedCount > 0 ? (0.65 + ownedCount * 0.3) : 0.45;
      const raw = Math.floor(p.cash * agg * stratFactor);
      
      // limit max bids realistically
      calculated[p.id] = Math.min(Math.max(raw, Math.floor(tile.price! * 0.6)), Math.floor(p.cash * 0.92));
    });

    setMaxBids(calculated);
    setCurrentBid(Math.floor((tile.price || 40000) * 0.5));
    setHighBidder(null);
    setBiddingDone(false);
    setGavelStage(4);
  };

  useEffect(() => {
    if (isOpen && tile) {
      initAuction();
    }
  }, [isOpen, tile]);

  // Reset gavelStage when bid is updated, keeps the auction alive
  useEffect(() => {
    if (isOpen) {
      setGavelStage(4);
    }
  }, [isOpen, currentBid, highBidder]);

  // Gavel automatic countdown scheduler
  useEffect(() => {
    if (!isOpen || biddingDone || !tile) return;

    const timer = setTimeout(() => {
      if (gavelStage > 1) {
        const next = gavelStage - 1;
        if (next === 3) {
          onAddArenaLog('AUCTIONEER', `Going once for $${fmtK(currentBid)}...`, 'info');
        } else if (next === 2) {
          onAddArenaLog('AUCTIONEER', `Going twice for $${fmtK(currentBid)}!`, 'info');
        }
        setGavelStage(next);
      } else if (gavelStage === 1) {
        onAddArenaLog('AUCTIONEER', highBidder ? `SOLD to ${highBidder.name} for $${fmtK(currentBid)}! 🔨` : `No bids! Property remains vacant.`, 'good');
        setBiddingDone(true);
        onFinalize(highBidder, currentBid);
      }
    }, gavelStage === 4 ? 4000 : 2200);

    return () => clearTimeout(timer);
  }, [isOpen, biddingDone, tile, gavelStage, currentBid, highBidder, onFinalize, onAddArenaLog]);

  // AI Automatic bidding logic scheduler
  useEffect(() => {
    if (!isOpen || biddingDone || !tile) return;

    // Staggered trigger timers for active AI players
    const timer = setTimeout(() => {
      const activeAIs = players.filter(p => p.isAI && !p.bankrupt && p.id !== skippedPlayerId && p.id !== highBidder?.id);
      if (activeAIs.length === 0) return;

      // Pick a random AI to bid
      const randomAI = activeAIs[Math.floor(Math.random() * activeAIs.length)];
      const maxBVal = maxBids[randomAI.id] || 0;

      if (maxBVal > currentBid + 4999 && randomAI.cash >= currentBid + 5000) {
        // Non-uniform bid increment (random multiple of 5K)
        const inc = Math.floor((5000 + Math.random() * 25000) / 5000) * 5000;
        const target = Math.min(currentBid + inc, maxBVal, Math.floor(randomAI.cash * 0.92));

        if (target > currentBid) {
          setCurrentBid(target);
          setHighBidder(randomAI);
          onAddArenaLog(randomAI.name, `🔨 bid $${fmtK(target)} on ${tile.icon} ${tile.name}`, 'event');
        }
      }
    }, 2200 + Math.random() * 1500);

    return () => clearTimeout(timer);
  }, [isOpen, biddingDone, currentBid, highBidder, maxBids, players, skippedPlayerId, tile]);

  if (!isOpen || !tile) return null;

  const handleHumanBid = (amount: number) => {
    if (!tile) return;
    const human = players.find(p => p.id === 0)!;
    if (amount > human.cash) return;
    setCurrentBid(amount);
    setHighBidder(human);
    onAddArenaLog(human.name, `🔨 bid $${fmtK(amount)} on ${tile.icon} ${tile.name}`, 'event');
  };

  const currentHuman = players.find(p => p.id === 0)!;
  const humanMax = Math.floor(currentHuman.cash * 0.95);
  
  // Custom bid levels
  const bidIncrements = [currentBid + 5000, currentBid + 15000, currentBid + 30000, humanMax]
    .filter((v, i, arr) => v > currentBid && v <= currentHuman.cash && arr.indexOf(v) === i);

  return (
    <div className="modal-overlay open select-none">
      <div className="modal-box bracket auction-box bg-[#080d16]/95 border border-[rgba(0,212,255,0.4)] relative p-5 max-w-[480px]">
        {/* Top-Right Dismiss Button */}
        <button
          onClick={() => {
            setBiddingDone(true);
            onFinalize(highBidder, currentBid);
          }}
          className="absolute top-4 right-4 text-slate-400 hover:text-white hover:scale-115 transition font-black font-mono text-[14px] cursor-pointer z-50"
          title="Conclude / Forfeit Auction"
        >
          ✕
        </button>
        
        <div className="auc-header flex items-center gap-3 mb-4">
          <span className="auc-icon-big text-[36px]">{tile.icon}</span>
          <div className="auc-head-text flex-1">
            <h3 className="modal-title font-sans font-black text-[15px] text-white uppercase">PROPERTY AUCTION</h3>
            <p className="modal-subtitle text-[10px] text-[#00d4ff] font-mono tracking-wider">{tile.name} · Group {tile.group?.toUpperCase()}</p>
          </div>
          <span className="auc-gavel text-[24px]">🔨</span>
        </div>

        <div className="auc-bid-panel bg-black/35 border border-[rgba(0,212,255,0.15)] rounded-md p-3 mb-4">
          <div className="auc-bid-row flex gap-4 mb-2">
            <div className="auc-bid-block flex-1">
              <div className="auc-bid-label text-[8px] font-mono text-slate-400 tracking-wider">CURRENT HIGH BID</div>
              <div className="auc-bid-val font-sans font-black text-[18px] text-[#ffb700]">${fmtK(currentBid)}</div>
            </div>
            <div className="auc-bid-block flex-1">
              <div className="auc-bid-label text-[8px] font-mono text-slate-400 tracking-wider font-semibold">HIGH BIDDER</div>
              <div className="auc-bid-val font-sans font-black text-[13px] text-[#00d4ff] truncate pt-1">
                {highBidder ? highBidder.name : 'No bids yet'}
              </div>
            </div>
          </div>
          <div className="auc-desc text-[10px] text-slate-300 italic font-mono mb-2">
            Original price: ${fmtK(tile.price!)} · Base Rent: ${fmtK(tile.baseRent!)}/v · Your cash: ${fmtK(currentHuman.cash)}
          </div>

          {/* Gavel tension countdown display */}
          <div className="pt-2 border-t border-[rgba(0,212,255,0.08)] flex justify-between items-center bg-[#070e19]/50 px-2 py-1 rounded">
            <span className="text-[8px] font-mono tracking-wider text-slate-400 uppercase">GAVEL TENSION STATUS:</span>
            <span className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded leading-none ${
              gavelStage === 4 ? 'bg-[#00d4ff]/10 border border-[#00d4ff]/20 text-[#00d4ff]' :
              gavelStage === 3 ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400 animate-pulse' :
              gavelStage === 2 ? 'bg-orange-500/10 border border-orange-500/20 text-orange-400 animate-pulse' :
              'bg-[#00ff88]/10 border border-[#00ff88]/20 text-[#00ff88]'
            }`}>
              {gavelStage === 4 && '⚡ ACTIVE BIDDING'}
              {gavelStage === 3 && '🔨 GOING ONCE...'}
              {gavelStage === 2 && '🔨 GOING TWICE!'}
              {gavelStage === 1 && '🎉 SOLD!'}
            </span>
          </div>
        </div>

        <div className="auc-separator text-[9px] font-mono tracking-widest text-[#00d4ff] uppercase border-b border-[rgba(0,212,255,0.12)] pb-1 mb-2">
          BIDDERS AND CONTROLS
        </div>

        <div className="auc-bids flex flex-col gap-2 max-h-[160px] overflow-y-auto">
          {players.filter(p => !p.bankrupt).map(p => {
            const isSkipped = p.id === skippedPlayerId;
            const isCurrentHigh = highBidder && p.id === highBidder.id;
            
            return (
              <div key={p.id} className="auc-player-row flex items-center justify-between gap-3 bg-black/25 border border-[rgba(0,212,255,0.06)] rounded p-2">
                <div className="flex items-center gap-2">
                  <div className="auc-token w-4 h-4 rounded-full" style={{ backgroundColor: p.color }} />
                  <span className="auc-pname text-[11px] font-semibold text-slate-200">
                    {p.name}
                    {isSkipped && <span className="auc-tag font-bold ml-1 scale-90">DECLINED</span>}
                    {isCurrentHigh && <span className="auc-tag font-bold ml-1 scale-90" style={{ color: '#00ff88', borderColor: '#00ff88' }}>LEADING</span>}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="auc-cash text-[10px] font-mono text-[#00ff88] mr-2">${fmtK(p.cash)}</span>
                  {p.id === 0 && !isSkipped && (
                    <div className="flex gap-1">
                      {bidIncrements.map((stepVal, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleHumanBid(stepVal)}
                          className="auc-bid-btn bg-purple-950/20 border border-[#7b2fff] text-[9px] px-1.5 py-1 text-[#e040fb] rounded font-mono font-bold hover:bg-purple-500/10 cursor-pointer"
                        >
                          ${fmtK(stepVal)}
                        </button>
                      ))}
                      {currentHuman.cash < currentBid + 5000 && BANK_LOAN_MAX - currentHuman.bankLoan > 0 && (
                        <button
                          onClick={() => onBankLoanRequest(tile.price! - currentHuman.cash, (ok) => {})}
                          className="auc-bid-btn border-[#ffb700] text-[#ffb700] text-[9px] hover:bg-[#ffb700]/10 rounded font-mono font-bold cursor-pointer"
                        >
                          🏦 LOAN
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={() => {
            setBiddingDone(true);
            onFinalize(highBidder, currentBid);
          }}
          className="launch-btn w-full mt-4 p-2.5 bg-gradient-to-r from-cyan-950/20 to-purple-950/20 border border-cyan-500 text-cyan-400 font-mono text-[11px] font-bold rounded cursor-pointer min-h-[44px]"
        >
          {highBidder ? `DECLARE SOLD TO ${highBidder.name.toUpperCase()} — $${fmtK(currentBid)}` : 'GIVE UP & LEAVE VACANT'}
        </button>

      </div>
    </div>
  );
};


// ── Mortgage Manager Modal Props ──
interface MortgageModalProps {
  isOpen: boolean;
  player: Player;
  tiles: BoardTile[];
  onClose: () => void;
  onMortgage: (tileId: number) => void;
  onUnmortgage: (tileId: number) => void;
  onRepayLoan: (amount: number) => void;
}

export const MortgageManagerModal: React.FC<MortgageModalProps> = ({
  isOpen,
  player,
  tiles,
  onClose,
  onMortgage,
  onUnmortgage,
  onRepayLoan,
}) => {
  if (!isOpen || !player) return null;

  const userProps = Array.from(new Set(player.properties)).map(id => tiles.find(t => t.id === id)).filter(Boolean) as BoardTile[];
  const repayAmount = Math.min(player.bankLoan, player.cash);

  return (
    <div className="modal-overlay open select-none">
      <div className="modal-box bracket mortgage-box bg-[#080d16]/95 border border-[rgba(0,212,255,0.4)] relative p-5 max-w-[480px]">
        
        <div className="mort-header flex flex-col gap-1.5 mb-3 border-b border-[rgba(0,212,255,0.15)] pb-2">
          <h3 className="mort-title font-sans font-black text-[14px] text-[#ffb700] uppercase">MORTGAGE MANAGEMENT HUD</h3>
          <div className="mort-stats-row flex gap-4 text-[11px] font-mono leading-relaxed mt-1">
            <div className="mort-stat">
              <span className="mort-stat-lbl text-[8px] text-slate-400 font-semibold tracking-wide uppercase">CASH FUNDS:</span>
              <span className="mort-stat-val text-[#00ff88] font-bold">${fmtK(player.cash)}</span>
            </div>
            <div className="mort-stat">
              <span className="mort-stat-lbl text-[8px] text-slate-400 font-semibold tracking-wide uppercase">BANK LIABILITY:</span>
              <span className="mort-stat-val text-[#ff3366] font-bold">${fmtK(player.bankLoan)}</span>
            </div>
          </div>
        </div>

        <div className="mort-info-box bg-slate-900 border border-[rgba(0,212,255,0.1)] rounded p-2.5 mb-3 text-[10px] text-slate-400 leading-relaxed font-mono">
          <div>🏦 <strong>Mortgage:</strong> Get 50% cash. No rent while active.</div>
          <div>🏦 <strong>Repay:</strong> Pay 55% principal (10% standard fee applied) to reactivate.</div>
        </div>

        {/* Dynamic outstanding loan repayment button */}
        {player.bankLoan > 0 && player.cash > 0 && (
          <div className="mort-loan-row flex items-center justify-between p-2 bg-[#ffb700]/5 border border-[#ffb700]/25 rounded mb-3">
            <span className="text-[11px] text-[#ffb700] font-mono">🏦 Outstanding Debt: -${fmtK(player.bankLoan)}</span>
            <button
              onClick={() => onRepayLoan(repayAmount)}
              className="px-3 py-1.5 bg-[#00ff88]/15 border border-[#00ff88] text-[#00ff88] font-mono text-[10px] font-bold rounded hover:bg-[#00ff88]/25 cursor-pointer min-h-[32px]"
            >
              REPAY ${fmtK(repayAmount)}
            </button>
          </div>
        )}

        <div className="mort-list flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
          {userProps.length === 0 ? (
            <div className="text-[11px] text-slate-500 font-mono text-center py-6 italic">
              No real-estate assets mapped.
            </div>
          ) : (
            userProps.map(t => {
              const mVal = Math.floor(t.price! * MORT_RATIO);
              const umVal = Math.floor(t.price! * UNMORT_RATIO);
              return (
                <div key={t.id} className="mort-row flex items-center gap-3 bg-black/25 border border-[rgba(0,212,255,0.06)] rounded p-2 font-mono text-[11px]">
                  <span className="mort-icon text-[14px] bg-black/35 w-6 h-6 rounded flex items-center justify-center">{t.icon}</span>
                  <div className="mort-info flex-1 min-w-0">
                    <div className="mort-name font-semibold text-white truncate flex items-center gap-1.5">
                      {t.name}
                      {t.mortgaged && <span className="mort-badge bg-red-950 text-[#ff3366] px-1 line border border-red-500 rounded text-[8px] transform scale-90">MORTGAGED</span>}
                    </div>
                    <div className="mort-val text-[9px] text-slate-400 mt-0.5">
                      {t.mortgaged ? `Reactivate Key: $${fmtK(umVal)}` : `Secures Cash: $${fmtK(mVal)}`}
                    </div>
                  </div>
                  <button
                    onClick={() => t.mortgaged ? onUnmortgage(t.id) : onMortgage(t.id)}
                    className={`px-3 py-1.5 rounded font-mono text-[10px] font-bold min-h-[34px] min-w-[124px] cursor-pointer transition uppercase ${
                      t.mortgaged
                        ? 'bg-[#00ff88]/15 border border-[#00ff88] text-[#00ff88] hover:bg-[#00ff88]/25'
                        : 'bg-[#ff3366]/15 border border-[#ff3366] text-[#ff3366] hover:bg-[#ff3366]/25'
                    }`}
                  >
                    {t.mortgaged ? 'UNMORTGAGE' : 'MORTGAGE'}
                  </button>
                </div>
              );
            })
          )}
        </div>

        <button
          onClick={onClose}
          className="launch-btn w-full mt-4 p-2 bg-gradient-to-r from-cyan-950/20 to-purple-950/20 border border-[#00d4ff] text-[#00d4ff] font-mono text-[11px] font-bold rounded cursor-pointer min-h-[44px]"
        >
          FINALIZE AND EXIT
        </button>

      </div>
    </div>
  );
};


// ── Random Event Modal Props ──
interface EventModalProps {
  isOpen: boolean;
  event: RandomEvent | null;
  onClose: () => void;
}

export const RandomEventModal: React.FC<EventModalProps> = ({
  isOpen,
  event,
  onClose,
}) => {
  if (!isOpen || !event) return null;
  
  const isGood = event.type === 'good';
  const isBad = event.type === 'bad';

  return (
    <div className="modal-overlay open select-none" onClick={onClose}>
      <div className="modal-box bracket event-modal bg-[#080d16]/95 border border-[rgba(0,212,255,0.4)] relative p-6 text-center max-w-[380px]" onClick={e => e.stopPropagation()}>
        <div className="event-badge text-[11px] font-mono tracking-widest uppercase mb-3" style={{ color: isGood ? '#00ff88' : isBad ? '#ff3366' : '#ffb700' }}>
          {isGood ? '📈 MARKET BOOM' : isBad ? '📉 MARKET FLUCTUATION' : '⚡ SYSTEM ALIGNMENT'}
        </div>
        
        <h3 className="modal-title font-sans font-black text-[16px] text-white uppercase mb-2">
          {event.title}
        </h3>
        
        <p className="modal-desc text-[11px] text-slate-300 leading-normal mb-6 whitespace-pre-wrap font-sans">
          {event.desc}
        </p>

        <button
          onClick={onClose}
          className={`w-full p-2.5 rounded font-mono text-[11px] font-bold min-h-[40px] cursor-pointer transition uppercase tracking-wider ${
            isGood ? 'bg-[#00ff88]/15 border border-[#00ff88] text-[#00ff88] hover:bg-[#00ff88]/25' :
            isBad ? 'bg-[#ff3366]/15 border border-[#ff3366] text-[#ff3366] hover:bg-[#ff3366]/25' :
            'bg-[#ffb700]/15 border border-[#ffb700] text-[#ffb700] hover:bg-[#ffb700]/25'
          }`}
        >
          ACKNOWLEDGE MARKET SIGNAL
        </button>
      </div>
    </div>
  );
};


// ── Chance Card Drawer Modal Props ──
interface ChanceCardModalProps {
  isOpen: boolean;
  card: ChanceCard | null;
  player: Player | null;
  onClose: () => void;
}

export const ChanceCardModal: React.FC<ChanceCardModalProps> = ({
  isOpen,
  card,
  player,
  onClose,
}) => {
  if (!isOpen || !card) return null;
  
  const isGood = ['advanceGO', 'viral', 'collectFromAll', 'jailFree'].includes(card.effect) || (card.effect === 'cash' && (card.amount || 0) > 0);

  return (
    <div className="modal-overlay open select-none" onClick={onClose}>
      <div className="modal-box bracket event-modal bg-[#080d16]/95 border border-[rgba(0,212,255,0.4)] relative p-6 text-center max-w-[380px]" onClick={e => e.stopPropagation()}>
        <div className="event-badge text-[11px] font-mono tracking-widest uppercase mb-3" style={{ color: isGood ? '#00ff88' : '#ff3366' }}>
          {isGood ? '📈 FORTUNE REWARD' : '📉 MARKET RISK'}
        </div>
        
        <h3 className="modal-title font-sans font-black text-[16px] text-white uppercase mb-1">
          CHANCE CARD DRAWN
        </h3>
        <p className="text-[10px] text-[#00d4ff] font-mono tracking-wider mb-4 uppercase">
          CLIENT: {player?.name || 'SYSTEM PLAYER'}
        </p>
        
        <div className="bg-black/45 border border-slate-800 rounded-lg p-5 mb-5 font-sans text-[12px] text-slate-200 leading-relaxed flex flex-col items-center justify-center min-h-[90px] shadow-inner shadow-black/80">
          <span className="text-[32px] mb-2.5">🃏</span>
          <span className="text-center font-medium">{card.text}</span>
        </div>

        <button
          onClick={onClose}
          className={`w-full p-2.5 rounded font-mono text-[11px] font-bold min-h-[44px] cursor-pointer transition uppercase tracking-wider ${
            isGood ? 'bg-[#00ff88]/15 border border-[#00ff88] text-[#00ff88] hover:bg-[#00ff88]/25' :
            'bg-[#ff3366]/15 border border-[#ff3366] text-[#ff3366] hover:bg-[#ff3366]/25'
          }`}
        >
          ACKNOWLEDGE SIGNAL
        </button>
      </div>
    </div>
  );
};

