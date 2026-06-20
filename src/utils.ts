/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BoardTile } from './types';
import { BW, BH, CORNER, SIDE } from './constants';

export function fmtK(n: number): string {
  n = Math.max(0, Math.floor(n || 0));
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return Math.floor(n / 1000) + 'K';
  return String(n);
}

export function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

export function getTilePos(i: number) {
  if (i <= 10) return { x: BW - CORNER - i * SIDE, y: BH - CORNER, w: (i === 0 || i === 10) ? CORNER : SIDE, h: CORNER };
  if (i <= 19) { const n = i - 10; return { x: 0, y: BH - CORNER - n * SIDE, w: CORNER, h: SIDE }; }
  if (i <= 30) { const n = i - 20; return { x: n === 0 ? 0 : CORNER + (n - 1) * SIDE, y: 0, w: (n === 0 || n === 10) ? CORNER : SIDE, h: CORNER }; }
  const n = i - 30; return { x: BW - CORNER, y: CORNER + (n - 1) * SIDE, w: CORNER, h: SIDE };
}

export function getBizDesc(tile: BoardTile): string {
  const d = {
    micro: 'High-turnover micro-business with strong foot traffic.',
    service: 'Essential services generating steady recurring revenue.',
    resto: 'Bustling food establishment with high visitor revenue.',
    hospitality: 'Premium hospitality targeting upscale clientele.',
    corporate: 'Modern corporate facility in the business district.',
    culture: 'Cultural hub attracting premium clientele.',
    premium: 'Luxury entertainment with VIP clientele.',
    tech: 'Cutting-edge technology with exponential growth potential.',
    luxury: 'Ultra-premium destination. Extraordinary returns.',
    elite: 'Landmark empire asset. Only the wealthiest qualify.',
    utility: 'Critical infrastructure relied on by all businesses.'
  };
  return d[tile.tier || 'micro'] || 'A lucrative business opportunity.';
}
