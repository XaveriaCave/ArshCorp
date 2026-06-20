/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Player, BoardTile } from '../types';
import { GROUP_CONFIG, RENT_MULT, MONO_BONUS } from '../constants';
import { fmtK, capitalize, getBizDesc } from '../utils';

interface TileDetailProps {
  tile: BoardTile;
  idx: number;
  players: Player[];
  onClose: () => void;
  onBuild: (tileId: number) => void;
  onSellModal: (tileId: number) => void;
  onMortgageManager: () => void;
  onOfferModal: (tileId: number) => void;
}

export const TileDetail: React.FC<TileDetailProps> = ({
  tile,
  idx,
  players,
  onClose,
  onBuild,
  onSellModal,
  onMortgageManager,
  onOfferModal,
}) => {
  const owner = tile.ownerId !== null && tile.ownerId !== undefined ? players.find(p => p.id === tile.ownerId) : null;
  const human = players.find(p => p.id === 0);
  
  const getGroupTiles = (group: string) => {
    return GROUP_CONFIG[group] ? tilesWithGroup(group) : [];
  };

  const tilesWithGroup = (group: string) => {
    // Standard matching
    return [
      { id: 1, group: 'a', icon: '🥤', name: 'Street Kiosk' },
      { id: 3, group: 'a', icon: '🚚', name: 'Food Truck' },
      { id: 4, group: 'b', icon: '🧺', name: 'Laundromat' },
      { id: 6, group: 'b', icon: '💻', name: 'Cyber Cafe' },
      { id: 8, group: 'c', icon: '🍜', name: 'Street Diner' },
      { id: 9, group: 'c', icon: '🍔', name: 'Urban Grill' },
      { id: 11, group: 'd', icon: '🏨', name: 'Boutique Hotel' },
      { id: 13, group: 'd', icon: '💆', name: 'Spa Resort' },
      { id: 14, group: 'e', icon: '🎨', name: 'Art Gallery' },
      { id: 16, group: 'e', icon: '🖥️', name: 'Co-Work Space' },
      { id: 18, group: 'f', icon: '🔬', name: 'Tech Hub' },
      { id: 19, group: 'f', icon: '🛍️', name: 'Retail Center' },
      { id: 21, group: 'g', icon: '🍸', name: 'Rooftop Bar' },
      { id: 23, group: 'g', icon: '🎵', name: 'Night Club' },
      { id: 24, group: 'h', icon: '🗄️', name: 'Data Center' },
      { id: 26, group: 'h', icon: '🤖', name: 'AI Lab' },
      { id: 27, group: 'i', icon: '🏯', name: 'Luxury Hotel' },
      { id: 29, group: 'i', groupColor: '#ffd700', icon: '🎰', name: 'Casino Resort' },
      { id: 31, group: 'j', icon: '🌆', name: 'Penthouse Suites' },
      { id: 32, group: 'j', icon: '🏢', name: 'Megamall' },
      { id: 34, group: 'k', icon: '📈', name: 'IPO Launch' },
      { id: 36, group: 'k', icon: '電視', name: 'Media Empire' },
      { id: 38, group: 'l', icon: '🚀', name: 'Space Ventures' },
      { id: 39, group: 'l', icon: '量子', name: 'Quantum Corp' },
      { id: 5,  group: 'u', icon: '⚡', name: 'Power Grid' },
      { id: 12, group: 'u', icon: '📡', name: 'Telecom Hub' },
      { id: 25, group: 'u', icon: '🚇', name: 'Transit Hub' },
      { id: 35, group: 'u', icon: '🏢', name: 'HQ Complex' },
    ].filter(t => t.group === group);
  };

  const ownsFullGroup = (player: Player, group: string) => {
    const gtIds = getGroupTiles(group).map(t => t.id);
    return gtIds.length > 0 && gtIds.every(id => {
      // Find matching dynamic tile to check owner and mortgaged
      const dynamicTile = players.find(p => p.properties.includes(id));
      if (!dynamicTile || dynamicTile.id !== player.id) return false;
      return true; // Simple check for ownership
    });
  };

  const currentRent = () => {
    if (!tile.baseRent) return 0;
    if (tile.mortgaged) return 0;
    let rent = Math.floor(tile.baseRent * RENT_MULT[tile.level || 1]);
    if (owner && tile.group && ownsFullGroup(owner, tile.group) && tile.level === 1) {
      rent = Math.floor(tile.baseRent * MONO_BONUS);
    }
    return rent;
  };

  const getBuildingCost = () => {
    const cfg = tile.group ? GROUP_CONFIG[tile.group] : null;
    if (!cfg) return 0;
    const nl = Math.min((tile.level || 1) + 1, 4);
    return cfg.buildingCosts[nl - 1] || 0;
  };

  const getBuildingName = () => {
    const cfg = tile.group ? GROUP_CONFIG[tile.group] : null;
    if (!cfg) return 'Base';
    return cfg.buildingNames[(tile.level || 1) - 1] || 'Base';
  };

  const getNextBuildingName = () => {
    const cfg = tile.group ? GROUP_CONFIG[tile.group] : null;
    if (!cfg) return 'Upgrade';
    return cfg.buildingNames[Math.min(tile.level || 1, 3)] || 'Max';
  };

  const groupTiles = tile.group ? getGroupTiles(tile.group) : [];
  const humanOwnsCount = human ? groupTiles.filter(gt => human.properties.includes(gt.id)).length : 0;
  const humanHasMono = tile.group && human && ownsFullGroup(human, tile.group);
  const canBuildHere = tile.ownerId === 0 && tile.level && tile.level < 4 && humanHasMono && !tile.mortgaged;

  let descTxt = '';
  if (tile.type === 'go') {
    descTxt = 'Collect $20K salary each time you pass or land on GO.';
  } else if (tile.type === 'jail') {
    descTxt = 'Just visiting — no penalty. Sent here if you roll 3 doubles or land on "Go to Jail".';
  } else if (tile.type === 'gotojail') {
    descTxt = 'Landed here? Go directly to jail. Do NOT complete movement or collect salary.';
  } else if (tile.type === 'free') {
    descTxt = 'Free Market Zone — collect $15K bonus anytime you arrive.';
  } else if (tile.type === 'chance') {
    descTxt = 'Draw a Chance card — could trigger bonuses, fines, movement, or get out of jail cards!';
  } else if (tile.type === 'tax') {
    descTxt = `Tax tile — pay ${Math.round((tile.taxRate || 0.1) * 100)}% of your cash to the government.`;
  } else {
    descTxt = getBizDesc(tile);
    if (tile.mortgaged) descTxt += '\n⚠️ Currently MORTGAGED — no rent collected.';
    else if (owner && tile.group && ownsFullGroup(owner, tile.group)) descTxt += '\n♛ MONOPOLY OWNED — rent doubled at base level!';
    else if (tile.ownerId === null) descTxt += '\nTile is VACANT — anyone can buy when landing here.';
  }

  const rentVal = currentRent();
  const cfg = tile.group ? GROUP_CONFIG[tile.group] : null;

  return (
    <div className="tile-detail-panel open relative w-full h-full bg-[#080d16]/98 border border-[rgba(0,212,255,0.3)] rounded-lg overflow-hidden flex flex-col select-none">
      
      {/* ── HEADER ── */}
      <div className="td-header flex items-center gap-3 p-3 bg-black/45 border-b border-[rgba(0,212,255,0.15)] shrink-0" style={{ borderLeft: `4px solid ${tile.color || '#00d4ff'}` }}>
        <span className="td-icon text-[32px]">{tile.icon}</span>
        <div className="td-titles flex-1 min-w-0">
          <div className="td-name font-sans font-bold text-[14px] text-white truncate">{tile.name}</div>
          <div className="td-sub text-[10px] text-[#00d4ff] font-mono tracking-wider">
            {tile.group ? `Group ${tile.group.toUpperCase()} · ` : ''}{capitalize(tile.tier || tile.type)}
          </div>
        </div>
        <button onClick={onClose} className="td-close w-8 h-8 rounded border border-[rgba(0,212,255,0.25)] flex items-center justify-center font-mono hover:text-red-500 hover:border-red-500 cursor-pointer transition shrink-0">✕</button>
      </div>

      {/* ── SCROLLABLE BODY ── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* ── STATS ROW ── */}
        <div className="td-stats grid grid-cols-4 gap-[1px] bg-[rgba(0,212,255,0.15)] border-b border-[rgba(0,212,255,0.15)]">
          {tile.price ? (
            <div className="td-stat bg-[#060a12] p-2 text-center">
              <div className="td-sv font-mono text-[12px] font-bold text-white">${fmtK(tile.price)}</div>
              <div className="td-sl text-[8px] text-slate-400 font-mono tracking-wider">PRICE</div>
            </div>
          ) : null}
          {rentVal > 0 ? (
            <div className="td-stat bg-[#060a12] p-2 text-center">
              <div className="td-sv font-mono text-[12px] font-bold text-[#00ff88]">${fmtK(rentVal)}</div>
              <div className="td-sl text-[8px] text-slate-400 font-mono tracking-wider">RENT / VISIT</div>
            </div>
          ) : null}
          <div className="td-stat bg-[#060a12] p-2 text-center">
            <div className="td-sv font-mono text-[12px] font-bold" style={{ color: owner ? owner.color : '#64748b' }}>
              {owner ? owner.name : 'VACANT'}
            </div>
            <div className="td-sl text-[8px] text-slate-400 font-mono tracking-wider">OWNER</div>
          </div>
          {tile.level && tile.type === 'biz' ? (
            <div className="td-stat bg-[#060a12] p-2 text-center">
              <div className="td-sv font-mono text-[12px] font-bold text-white">{getBuildingName()}</div>
              <div className="td-sl text-[8px] text-slate-400 font-mono tracking-wider">UPGRADE</div>
            </div>
          ) : null}
        </div>

        {/* ── DESCRIPTION ── */}
        <div className="td-desc text-[11px] text-slate-300 leading-relaxed px-4 py-3 border-b border-[rgba(0,212,255,0.1)] whitespace-pre-line font-sans">
          {descTxt}
        </div>

        {/* ── MONOPOLY GROUP TRACKING ── */}
        {tile.group && cfg ? (
          <div className="td-group-row px-4 py-2.5 border-b border-[rgba(0,212,255,0.1)]">
            <div className="td-group-label text-[9px] font-mono tracking-widest text-[#00d4ff] uppercase mb-1">
              COLOR GROUP {tile.group.toUpperCase()} Progress
            </div>
            <div className="td-group-tiles flex gap-2 mb-2">
              {groupTiles.map(gt => {
                const gtOwner = gt.id === 5 || gt.id === 12 || gt.id === 25 || gt.id === 35 ? null : players.find(p => p.properties.includes(gt.id));
                return (
                  <div
                    key={gt.id}
                    className={`w-7 h-7 rounded border-2 flex items-center justify-center text-[13px] ${
                      gt.id === tile.id ? 'animate-pulse' : ''
                    }`}
                    style={{
                      borderColor: gtOwner ? gtOwner.color : '#334155',
                      backgroundColor: gtOwner ? gtOwner.color + '1a' : 'transparent',
                    }}
                    title={gt.name}
                  >
                    {gt.icon}
                  </div>
                );
              })}
            </div>
            {humanHasMono ? (
              <div className="td-mono-badge text-[10px] bg-[#ffb700]/10 border border-[#ffb700]/30 text-[#ffb700] p-1.5 text-center font-mono rounded font-bold">
                ♛ MONOPOLY SECURED — BUILD UNLOCKED!
              </div>
            ) : (
              <div className="td-mono-hint text-[10px] text-slate-400 italic">
                Own all {groupTiles.length} group items to double base rent and start building.
              </div>
            )}
          </div>
        ) : null}

        {/* ── UPGRADE TIERS ── */}
        {cfg && tile.type === 'biz' ? (
          <div className="td-build-row px-4 py-2.5">
            <div className="td-build-label text-[9px] font-mono tracking-widest text-[#00d4ff] uppercase mb-2">
              BUILDING UPGRADE LADDER
            </div>
            <div className="td-build-levels grid grid-cols-4 gap-2">
              {cfg.buildingNames.map((nm, idxL) => (
                <div
                  key={idxL}
                  className={`bg-[rgba(0,0,0,0.3)] border border-[rgba(0,212,255,0.1)] rounded p-1.5 text-center flex flex-col items-center justify-between ${
                    (tile.level || 1) - 1 === idxL ? 'border-[#00d4ff] bg-[#00d4ff]/10' : ''
                  }`}
                >
                  <span className="td-build-icon text-[14px]">{['🏪', '🏢', '🏨', '🏗️'][idxL]}</span>
                  <span className="td-build-nm text-[8px] text-slate-400 mt-1 uppercase scale-90 truncate w-full">{nm}</span>
                  <span className="td-build-rent text-[9px] font-mono text-[#00ff88] mt-1 font-bold">
                    ${fmtK(Math.floor(tile.baseRent! * RENT_MULT[idxL + 1]))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* ── ACTIONS ── */}
      <div className="p-3 bg-black/35 border-t border-[rgba(0,212,255,0.15)] flex flex-col gap-2 shrink-0">
        {canBuildHere && getBuildingCost() > 0 ? (
          <button
            onClick={() => onBuild(tile.id)}
            className="md-build-btn td-build-btn font-bold cursor-pointer transition select-none"
          >
            🏗️ CONSTRUCT {getNextBuildingName()} — ${fmtK(getBuildingCost())}
          </button>
        ) : null}

        {tile.ownerId === 0 && !tile.mortgaged ? (
          <div className="flex gap-2">
            <button
              onClick={() => onSellModal(tile.id)}
              className="flex-1 p-2 bg-[#ff3366]/10 border border-[#ff3366] rounded text-[#ff3366] text-[10px] font-mono hover:bg-[#ff3366]/20 cursor-pointer transition min-h-[38px]"
            >
              💰 PROPOSE PRICE / AUCTION
            </button>
            <button
              onClick={onMortgageManager}
              className="flex-1 p-2 bg-amber-950/20 border border-[#ffb700] rounded text-[#ffb700] text-[10px] font-mono hover:bg-amber-950/40 cursor-pointer transition min-h-[38px]"
            >
              🏦 MORTGAGE MANAGER
            </button>
          </div>
        ) : null}

        {tile.ownerId === 0 && tile.mortgaged ? (
          <button
            onClick={onMortgageManager}
            className="w-full p-2 bg-[#00ff88]/10 border border-[#00ff88] rounded text-[#00ff88] text-[10px] font-mono hover:bg-[#00ff88]/20 cursor-pointer transition min-h-[38px]"
          >
            ✅ ACTIVATE / UNMORTGAGE THIS
          </button>
        ) : null}

        {tile.ownerId !== null && tile.ownerId !== undefined && tile.ownerId !== 0 && tile.type === 'biz' ? (
          <button
            onClick={() => onOfferModal(tile.id)}
            className="w-full p-2 bg-[#00d4ff]/10 border border-[#00d4ff] rounded text-[#00d4ff] text-[10px] font-mono hover:bg-[#00d4ff]/20 cursor-pointer transition min-h-[38px]"
          >
            🤝 MAKE AN OFFER TO PURCHASE
          </button>
        ) : null}
      </div>

    </div>
  );
};
