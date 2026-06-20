/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Player, BoardTile, ArenaLogItem } from '../types';
import { fmtK } from '../utils';

interface SidebarRightProps {
  players: Player[];
  tiles: BoardTile[];
  arenaLog: ArenaLogItem[];
  onPlayerSelect: (idx: number) => void;
}

export const SidebarRight: React.FC<SidebarRightProps> = ({
  players,
  tiles,
  arenaLog,
  onPlayerSelect,
}) => {
  const getNetWorth = (p: Player) => {
    const pv = p.properties.reduce((acc, tid) => {
      const t = tiles.find(tile => tile.id === tid);
      if (!t) return acc;
      return acc + (t.mortgaged ? Math.floor(t.price! * 0.5) : (t.price || 0) * (t.level || 1));
    }, 0);
    return p.cash + pv - p.bankLoan;
  };

  const sortedLeaderboard = [...players].sort((a, b) => getNetWorth(b) - getNetWorth(a));

  return (
    <div className="sidebar-right flex flex-col gap-4 overflow-y-auto p-3 bg-[#080d16] text-[#ddeeff] border-l border-[rgba(0,212,255,0.15)] select-none">
      
      {/* ── LIVE ARENA ── */}
      <div className="flex flex-col flex-1 min-h-0">
        <div className="text-[10px] font-mono tracking-widest text-[#00d4ff] uppercase border-b border-[rgba(0,212,255,0.15)] pb-1 mb-2">
          ⚡ LIVE ARENA FEED
        </div>
        
        <div className="feed-container flex-1 overflow-y-auto flex flex-col gap-1.5 pr-1 max-h-[360px] scrollbar-thin">
          {arenaLog.length === 0 ? (
            <div className="text-[10px] text-slate-500 text-center py-6 italic font-mono">
              Waiting for actions...
            </div>
          ) : (
            arenaLog.map(item => {
              // Custom borders based on status levels
              let borderCol = 'border-l-[#00d4ff]';
              if (item.type === 'good') borderCol = 'border-l-[#00ff88]';
              if (item.type === 'bad') borderCol = 'border-l-[#ff3366]';
              if (item.type === 'event') borderCol = 'border-l-[#ffb700]';

              return (
                <div
                  key={item.id}
                  className={`bg-[rgba(0,0,0,0.3)] border border-[rgba(0,212,255,0.06)] border-l-2 ${borderCol} rounded-r p-1.5 flex flex-col gap-0.5 shrink-0`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[9px] font-mono text-[#00d4ff] truncate font-semibold">
                      {item.player}
                    </span>
                    <span className="text-[8px] text-slate-500 font-mono shrink-0">{item.timestamp}</span>
                  </div>
                  <div className="text-[10px] text-slate-300 leading-normal font-sans">
                    {item.action}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── LEADERBOARD ── */}
      <div className="flex flex-col shrink-0">
        <div className="text-[10px] font-mono tracking-widest text-[#00d4ff] uppercase border-b border-[rgba(0,212,255,0.15)] pb-1 mb-2">
          🏆 LEADERBOARDS Standings <span className="text-[8px] text-slate-500 font-normal tracking-normal lowercase">(tap)</span>
        </div>

        <div className="flex flex-col gap-1">
          {sortedLeaderboard.map((p, idx) => (
            <div
              key={p.id}
              onClick={() => onPlayerSelect(p.id)}
              className={`flex items-center gap-1.5 p-1 bg-[rgba(0,0,0,0.15)] border border-[rgba(0,212,255,0.04)] rounded cursor-pointer hover:border-[rgba(0,212,255,0.15)] transition ${
                p.bankrupt ? 'opacity-35' : ''
              }`}
            >
              <span className="text-[10px] font-mono text-[#ffb700] w-4 text-center">#{idx + 1}</span>
              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
              <span className="text-[10px] text-slate-200 flex-1 truncate font-semibold">
                {p.name}
                {p.bankrupt && ' 💀'}
              </span>
              <span className="text-[10px] font-mono text-[#00ff88] font-bold">
                ${fmtK(getNetWorth(p))}
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
