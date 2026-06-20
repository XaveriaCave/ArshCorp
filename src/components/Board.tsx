/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { Player, BoardTile } from '../types';
import { GROUP_CONFIG, BW, BH, CORNER, SIDE } from '../constants';
import { getTilePos } from '../utils';

interface BoardProps {
  players: Player[];
  tiles: BoardTile[];
  currentPlayerIdx: number;
  onTileClick: (tile: BoardTile, idx: number) => void;
  activeTileId: number | null;
}

export const Board: React.FC<BoardProps> = ({
  players,
  tiles,
  currentPlayerIdx,
  onTileClick,
  activeTileId,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const drawBoard = (ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, BW, BH);

    // Deep space dark cyberpunk base background
    ctx.fillStyle = '#060a0f';
    ctx.fillRect(0, 0, BW, BH);

    // Grid lines decoration
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.05)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 10; i++) {
      ctx.beginPath();
      ctx.moveTo(CORNER + i * SIDE, 0);
      ctx.lineTo(CORNER + i * SIDE, BH);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, CORNER + i * SIDE);
      ctx.lineTo(BW, CORNER + i * SIDE);
      ctx.stroke();
    }

    // Centered glowing grid radial panel
    const gradient = ctx.createRadialGradient(BW / 2, BH / 2, 10, BW / 2, BH / 2, 160);
    gradient.addColorStop(0, 'rgba(0, 212, 255, 0.08)');
    gradient.addColorStop(1, 'rgba(5, 10, 15, 0.95)');
    ctx.fillStyle = gradient;
    ctx.fillRect(CORNER, CORNER, BW - 2 * CORNER, BH - 2 * CORNER);

    // Central Brand Typography
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(0, 212, 255, 0.55)';
    ctx.font = '900 13px Orbitron, sans-serif';
    ctx.fillText('ARSHCORP', BW / 2, BH / 2 - 1);
    ctx.fillStyle = 'rgba(0, 212, 255, 0.28)';
    ctx.font = '500 9px "Share Tech Mono", monospace';
    ctx.fillText('DIGITAL EMPIRE', BW / 2, BH / 2 + 15);
    ctx.restore();

    // Draw individual tiles
    for (let i = 0; i < 40; i++) {
      drawTile(ctx, tiles[i], getTilePos(i), i);
    }

    // Draw player tokens
    drawTokens(ctx);
  };

  const drawTile = (ctx: CanvasRenderingContext2D, tile: BoardTile, pos: any, idx: number) => {
    const { x, y, w, h } = pos;
    const isV = h > w;
    const B = 9; // Line width for color indicators

    // Background base
    ctx.fillStyle = 'rgba(6, 10, 18, 0.97)';
    ctx.fillRect(x, y, w, h);

    // Group Color Tint
    if (tile.group && (tile.type === 'biz' || tile.type === 'utility')) {
      const gc = GROUP_CONFIG[tile.group];
      if (gc) {
        ctx.fillStyle = gc.color + '1a'; // 10% opacity tint
        ctx.fillRect(x, y, w, h);
      }
    }

    // Mortgage hatch pattern overlay
    if (tile.mortgaged) {
      ctx.fillStyle = 'rgba(255, 51, 102, 0.10)';
      ctx.fillRect(x, y, w, h);
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 51, 102, 0.35)';
      ctx.lineWidth = 1.2;
      const step = 6;
      for (let ry = y + step; ry < y + h; ry += step) {
        ctx.beginPath();
        ctx.moveTo(x, ry);
        ctx.lineTo(x + w, ry);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Color band on centerpiece interior-facing edge
    if ((tile.type === 'biz' || tile.type === 'utility') && !tile.mortgaged) {
      const gc = tile.group ? GROUP_CONFIG[tile.group] : null;
      const bandCol = gc ? gc.color : tile.color;
      ctx.fillStyle = bandCol + 'cc';
      if (idx >= 1 && idx <= 9)   ctx.fillRect(x, y, w, B);          // Bottom Row -> top edge
      if (idx >= 11 && idx <= 19) ctx.fillRect(x + w - B, y, B, h);  // Left Col -> right edge
      if (idx >= 21 && idx <= 29) ctx.fillRect(x, y + h - B, w, B);  // Top Row -> bottom edge
      if (idx >= 31 && idx <= 39) ctx.fillRect(x, y, B, h);          // Right Col -> left edge
    }

    // Ownership properties
    const ow = tile.ownerId !== null && tile.ownerId !== undefined ? players.find(p => p.id === tile.ownerId) : null;
    const hasMono = ow && tile.group && ownsFullGroupLocal(ow, tile.group);

    if (ow && !tile.mortgaged) {
      const pc = ow.color;

      // Bold stripe on opposite exterior edge
      if (idx >= 1 && idx <= 9)   { ctx.fillStyle = pc + 'f8'; ctx.fillRect(x, y + h - B, w, B); }
      if (idx >= 11 && idx <= 19) { ctx.fillStyle = pc + 'f8'; ctx.fillRect(x, y, B, h); }
      if (idx >= 21 && idx <= 29) { ctx.fillStyle = pc + 'f8'; ctx.fillRect(x, y, w, B); }
      if (idx >= 31 && idx <= 39) { ctx.fillStyle = pc + 'f8'; ctx.fillRect(x + w - B, y, B, h); }

      // Whole tile wash
      ctx.fillStyle = hasMono ? pc + '30' : pc + '18';
      ctx.fillRect(x, y, w, h);

      // Ownership dot
      let dotX = x + w / 2;
      let dotY = y + h / 2;
      if (idx >= 1 && idx <= 9)   { dotX = x + w - 6; dotY = y + 6; }
      if (idx >= 11 && idx <= 19) { dotX = x + w - 6; dotY = y + 6; }
      if (idx >= 21 && idx <= 29) { dotX = x + 6;     dotY = y + h - 6; }
      if (idx >= 31 && idx <= 39) { dotX = x + 6;     dotY = y + 6; }

      ctx.beginPath();
      ctx.arc(dotX, dotY, 4, 0, Math.PI * 2);
      ctx.fillStyle = pc;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Building structures drawing
      const bLevel = (tile.level || 1) - 1;
      if (bLevel > 0) {
        const count = Math.min(bLevel, 3);
        for (let lv = 0; lv < count; lv++) {
          let px2, py2;
          if (idx >= 1 && idx <= 9)   { px2 = x + 6 + lv * 10; py2 = y + 6; }
          if (idx >= 11 && idx <= 19) { px2 = x + w - 9;       py2 = y + 6 + lv * 10; }
          if (idx >= 21 && idx <= 29) { px2 = x + 6 + lv * 10; py2 = y + h - 8; }
          if (idx >= 31 && idx <= 39) { px2 = x + 8;          py2 = y + 6 + lv * 10; }

          if (px2 !== undefined && py2 !== undefined) {
            ctx.fillStyle = '#ffd700';
            ctx.fillRect(px2 - 3, py2 - 2, 6, 4);
            ctx.beginPath();
            ctx.moveTo(px2 - 4, py2 - 2);
            ctx.lineTo(px2, py2 - 6);
            ctx.lineTo(px2 + 4, py2 - 2);
            ctx.fillStyle = '#ff9900';
            ctx.fill();
          }
        }
      }

      // Monopoly crown icon
      if (hasMono) {
        ctx.save();
        ctx.fillStyle = '#ffd700';
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 4;
        ctx.font = 'bold 9px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        let crownX = x + w / 2;
        let crownY = y + h / 2;
        if (idx >= 1 && idx <= 9)   { crownX = x + w / 2; crownY = y + 14; }
        if (idx >= 11 && idx <= 19) { crownX = x + w - 14; crownY = y + h / 2; }
        if (idx >= 21 && idx <= 29) { crownX = x + w / 2; crownY = y + h - 14; }
        if (idx >= 31 && idx <= 39) { crownX = x + 14;  crownY = y + h / 2; }

        ctx.fillText('♛', crownX, crownY);
        ctx.restore();
      }
    }

    // Mortgage overlay text label
    if (tile.mortgaged) {
      ctx.save();
      ctx.font = 'bold 5px monospace';
      ctx.fillStyle = '#ff3366dd';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('MORT', x + w / 2, y + h / 2 - 3);
      ctx.fillText('GAGED', x + w / 2, y + h / 2 + 3);
      ctx.restore();
    }

    // Borders
    ctx.strokeStyle = ow ? ow.color + '60' : 'rgba(0, 212, 255, 0.10)';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(x, y, w, h);

    // Emojis / Content Icons
    ctx.save();
    ctx.font = (Math.min(w, h) > 42 ? '13' : '9') + 'px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let ox = 0, oy = 0;
    if (idx >= 1 && idx <= 9)   oy = 5;
    if (idx >= 11 && idx <= 19) ox = -4;
    if (idx >= 21 && idx <= 29) oy = -5;
    if (idx >= 31 && idx <= 39) ox = 4;
    ctx.fillText(tile.icon, x + w / 2 + ox, y + h / 2 + oy);
    ctx.restore();

    // Active pointer highlight
    const cp = players[currentPlayerIdx];
    if (cp && cp.position === idx) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
    }

    // Selected click highlight
    if (activeTileId === idx) {
      ctx.strokeStyle = 'var(--cyan)';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
    }
  };

  const ownsFullGroupLocal = (player: Player, group: string) => {
    const gt = tiles.filter(t => t.group === group && (t.type === 'biz' || t.type === 'utility'));
    return gt.length > 0 && gt.every(t => t.ownerId === player.id && !t.mortgaged);
  };

  const drawTokens = (ctx: CanvasRenderingContext2D) => {
    const positions: { [pos: number]: { p: Player; pi: number }[] } = {};
    players.forEach((p, pi) => {
      if (!p.bankrupt) {
        const pos = p.position;
        if (!positions[pos]) {
          positions[pos] = [];
        }
        positions[pos].push({ p, pi });
      }
    });

    const offsets = [
      [0.3, 0.45], [0.65, 0.45],
      [0.3, 0.72], [0.65, 0.72],
      [0.5, 0.45], [0.5, 0.72]
    ];

    Object.entries(positions).forEach(([tileIdxStr, grp]) => {
      const tileIdx = parseInt(tileIdxStr);
      const pos = getTilePos(tileIdx);

      grp.forEach(({ p, pi }, sl) => {
        const [ox, oy] = offsets[sl % 6];
        const px = pos.x + pos.w * ox;
        const py = pos.y + pos.h * oy;

        // Shadow
        ctx.beginPath();
        ctx.arc(px + 1, py + 1, 8, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fill();

        // Glow ring
        ctx.beginPath();
        ctx.arc(px, py, 11, 0, Math.PI * 2);
        ctx.strokeStyle = p.color + '77';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Body
        ctx.beginPath();
        ctx.arc(px, py, 8, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Label txt
        ctx.font = 'bold 7px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#000000';
        ctx.fillText(`P${pi + 1}`, px, py);

        // Jail padlock
        if (p.inJail) {
          ctx.font = '8px Arial';
          ctx.fillStyle = '#ff3366';
          ctx.fillText('🔒', px + 9, py - 9);
        }
      });
    });
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = BW / rect.width;
    const scaleY = BH / rect.height;

    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    // Scan, find which tile was clicked
    for (let i = 0; i < 40; i++) {
      const { x, y, w, h } = getTilePos(i);
      if (mx >= x && mx <= x + w && my >= y && my <= y + h) {
        onTileClick(tiles[i], i);
        return;
      }
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawBoard(ctx);
  }, [players, tiles, currentPlayerIdx, activeTileId]);

  return (
    <div className="board-wrap w-full aspect-square relative max-w-full">
      <canvas
        ref={canvasRef}
        width={BW}
        height={BH}
        onClick={handleCanvasClick}
        className="w-full h-full block rounded border border-[rgba(0,212,255,0.2)]"
        style={{ cursor: 'crosshair' }}
      />
    </div>
  );
};
