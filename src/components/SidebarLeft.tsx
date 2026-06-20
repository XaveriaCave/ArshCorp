/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Player, BoardTile } from '../types';
import { GROUP_CONFIG } from '../constants';
import { fmtK } from '../utils';

interface SidebarLeftProps {
  humanPlayer: Player;
  players: Player[];
  tiles: BoardTile[];
  onTileSelect: (tile: BoardTile, idx: number) => void;
  onPlayerSelect: (idx: number) => void;
  onOpenMortgageManager: () => void;
}

export const SidebarLeft: React.FC<SidebarLeftProps> = ({
  humanPlayer: propHumanPlayer,
  players,
  tiles,
  onTileSelect,
  onPlayerSelect,
  onOpenMortgageManager,
}) => {
  const humanPlayer = propHumanPlayer || {
    id: 0,
    name: 'GUEST',
    color: '#00d4ff',
    emoji: '🤖',
    cash: 0,
    bankLoan: 0,
    properties: [],
    position: 0,
    isAI: false
  };

  const getNetWorth = (p: Player) => {
    const pv = p.properties.reduce((acc, tid) => {
      const t = tiles.find(tile => tile.id === tid);
      if (!t) return acc;
      return acc + (t.mortgaged ? Math.floor(t.price! * 0.5) : (t.price || 0) * (t.level || 1));
    }, 0);
    return p.cash + pv - p.bankLoan;
  };

  const ownsFullGroup = (p: Player, group: string) => {
    const gt = tiles.filter(t => t.group === group && (t.type === 'biz' || t.type === 'utility'));
    return gt.length > 0 && gt.every(t => t.ownerId === p.id && !t.mortgaged);
  };

  const getMonopolies = (p: Player) => {
    const groups = new Set(p.properties.map(id => tiles.find(t => t.id === id)?.group).filter(Boolean));
    return Array.from(groups).filter(g => ownsFullGroup(p, g as string));
  };

  const otherPlayers = players.filter(p => p.id !== 0);

  return (
    <div className="sidebar-left flex flex-col gap-4 overflow-y-auto p-3 bg-[#080d16] text-[#ddeeff] border-r border-[rgba(0,212,255,0.15)] select-none">
      
      {/* ── MY EMPIRE ── */}
      <div className="flex flex-col">
        <div className="text-[10px] font-mono tracking-widest text-[#00d4ff] uppercase border-b border-[rgba(0,212,255,0.15)] pb-1 mb-2">
          MY EMPIRE
        </div>
        
        <div className="flex items-center gap-3 mb-3">
          <div 
            className="w-9 h-9 rounded-full flex items-center justify-center text-[16px] shadow-md shrink-0"
            style={{ backgroundColor: humanPlayer.color, boxShadow: `0 0 10px ${humanPlayer.color}` }}
          >
            {humanPlayer.emoji}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-sans font-semibold text-[13px] text-white truncate">{humanPlayer.name}</span>
            <span className="text-[10px] text-[#ffb700] uppercase font-mono">
              RANK #{(() => {
                const sorted = [...players].sort((a, b) => getNetWorth(b) - getNetWorth(a));
                const idx = sorted.findIndex(p => p.id === humanPlayer.id);
                return idx === -1 ? 1 : idx + 1;
              })()}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-[rgba(0,0,0,0.3)] border border-[rgba(0,212,255,0.15)] rounded p-1.5 text-center">
            <div className="font-mono text-[12px] font-semibold text-[#00ff88]">${fmtK(humanPlayer.cash)}</div>
            <div className="text-[9px] text-slate-400 font-mono tracking-wider">CASH</div>
          </div>
          <div className="bg-[rgba(0,0,0,0.3)] border border-[rgba(0,212,255,0.15)] rounded p-1.5 text-center">
            <div className="font-mono text-[12px] font-semibold text-[#ff3366]">${fmtK(humanPlayer.bankLoan)}</div>
            <div className="text-[9px] text-slate-400 font-mono tracking-wider">BANK LOAN</div>
          </div>
          <div className="bg-[rgba(0,0,0,0.3)] border border-[rgba(0,212,255,0.15)] rounded p-1.5 text-center">
            <div className="font-mono text-[12px] font-semibold text-[#ffb700]">${fmtK(getNetWorth(humanPlayer))}</div>
            <div className="text-[9px] text-slate-400 font-mono tracking-wider">NET WORTH</div>
          </div>
          <div className="bg-[rgba(0,0,0,0.3)] border border-[rgba(0,212,255,0.15)] rounded p-1.5 text-center">
            <div className="font-mono text-[12px] font-semibold text-[#00d4ff]">{humanPlayer.properties.length}</div>
            <div className="text-[9px] text-slate-400 font-mono tracking-wider">PORTFOLIO</div>
          </div>
        </div>
      </div>

      {/* ── PORTFOLIO LIST ── */}
      <div className="flex flex-col">
        <div className="text-[10px] font-mono tracking-widest text-[#00d4ff] uppercase border-b border-[rgba(0,212,255,0.15)] pb-1 mb-2">
          MY PORTFOLIO
        </div>

        <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
          {humanPlayer.properties.length === 0 ? (
            <div className="text-[10px] text-slate-400 text-center py-4 italic line-height-relaxed">
              No holdings yet.<br />Purchase assets on the grid!
            </div>
          ) : (
            Array.from(new Set(humanPlayer.properties)).map(id => {
              const t = tiles.find(tile => tile.id === id);
              if (!t) return null;
              const hasMono = t.group && ownsFullGroup(humanPlayer, t.group);
              const bCosts = GROUP_CONFIG[t.group!]?.buildingNames;
              const bName = bCosts ? bCosts[(t.level || 1) - 1] || 'Base' : 'Base';
              return (
                <div
                  key={id}
                  onClick={() => onTileSelect(t, id)}
                  className={`bg-[rgba(0,0,0,0.2)] border border-[rgba(0,212,255,0.1)] rounded p-1.5 flex items-center gap-2 cursor-pointer transition hover:bg-[rgba(0,212,255,0.06)] ${
                    t.mortgaged ? 'opacity-50' : ''
                  }`}
                >
                  <span className="text-[14px] shrink-0 bg-black/40 w-6 h-6 rounded flex items-center justify-center">{t.icon}</span>
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="text-[11px] text-slate-100 font-semibold truncate flex items-center gap-1">
                      {t.name}
                      {t.mortgaged && (
                        <span className="text-[8px] bg-red-950 text-[#ff3366] px-1 border border-red-500 rounded tracking-wider scale-90">MORT</span>
                      )}
                      {hasMono && !t.mortgaged && (
                        <span className="text-[#ffb700] text-[10px]">♛</span>
                      )}
                    </div>
                    <div className="text-[9px] text-[#00ff88] font-mono">
                      {hasMono ? '♛ ' : ''}${fmtK(t.mortgaged ? 0 : t.price! * 0.1)} / visit · {bName}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Monopolies Indicator */}
        {getMonopolies(humanPlayer).length > 0 && (
          <div className="mt-2 text-[10px] p-1.5 bg-[#ffb700]/10 border border-[#ffb700]/30 text-[#ffb700] rounded font-mono leading-relaxed">
            ♛ MONOPOLIES: {getMonopolies(humanPlayer).map(g => (
              <span key={g} style={{ color: GROUP_CONFIG[g as string].color }} className="font-semibold mx-1">
                {g?.toUpperCase()}
              </span>
            ))}
          </div>
        )}

        {/* Global Mortgage trigger */}
        {humanPlayer.properties.length > 0 && (
          <button
            onClick={onOpenMortgageManager}
            className="mt-2 w-full p-2 bg-gradient-to-r from-amber-950/20 to-purple-950/20 border border-[#ffb700] rounded text-[#ffb700] font-mono text-[10px] font-bold hover:bg-amber-950/40 cursor-pointer min-h-[38px] transition"
          >
            🏦 MORTGAGE MANAGER
          </button>
        )}
      </div>

      {/* ── OTHER PLAYERS ── */}
      <div className="flex flex-col">
        <div className="text-[10px] font-mono tracking-widest text-[#00d4ff] uppercase border-b border-[rgba(0,212,255,0.15)] pb-1 mb-2">
          OTHER TYCOONS <span className="text-[8px] text-slate-500 font-normal tracking-normal lowercase">(tap to inspect)</span>
        </div>

        <div className="flex flex-col gap-1.5 max-h-[160px] overflow-y-auto pr-1">
          {otherPlayers.map(p => {
            const monoCount = getMonopolies(p).length;
            return (
              <div
                key={p.id}
                onClick={() => onPlayerSelect(p.id)}
                className={`flex items-center gap-2 p-1.5 bg-[rgba(0,0,0,0.2)] border border-[rgba(0,212,255,0.06)] rounded cursor-pointer hover:border-[rgba(0,212,255,0.2)] transition ${
                  p.bankrupt ? 'opacity-40' : ''
                }`}
              >
                <div className="w-5 h-5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                <span className="text-[11px] text-slate-200 flex-1 truncate font-semibold">
                  {p.name}
                  {p.bankrupt && ' 💀'}
                  {p.inJail && ' 🔒'}
                  {monoCount > 0 && (
                    <span className="text-[#ffb700] text-[9pt] font-mono font-bold ml-1">
                      ♛×{monoCount}
                    </span>
                  )}
                </span>
                <span className="text-[10px] font-mono text-[#ffb700] font-bold">${fmtK(getNetWorth(p))}</span>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
