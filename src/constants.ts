/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BoardTile, ChanceCard, RandomEvent } from './types';

export const GROUP_CONFIG: {
  [group: string]: {
    monopolySize: number;
    color: string;
    buildingNames: string[];
    buildingCosts: number[];
  };
} = {
  a: { monopolySize: 2, color: '#00d4ff', buildingNames: ['Kiosk', 'Storage Unit', 'Small Office', 'Franchise HQ'], buildingCosts: [0, 30000, 60000, 120000] },
  b: { monopolySize: 2, color: '#9b5de5', buildingNames: ['Shop', 'Branch Office', 'Service Center', 'Corp Office'], buildingCosts: [0, 40000, 80000, 160000] },
  c: { monopolySize: 2, color: '#f72585', buildingNames: ['Stall', 'Diner', 'Restaurant', 'Food Chain HQ'], buildingCosts: [0, 50000, 100000, 200000] },
  d: { monopolySize: 2, color: '#ff6b35', buildingNames: ['Room', 'Guesthouse', 'Boutique', 'Resort Tower'], buildingCosts: [0, 75000, 150000, 300000] },
  e: { monopolySize: 2, color: '#7400b8', buildingNames: ['Gallery', 'Studio', 'Arts Hub', 'Cultural Palace'], buildingCosts: [0, 80000, 160000, 320000] },
  f: { monopolySize: 2, color: '#00ff88', buildingNames: ['Office', 'Bungalow', 'Tech Campus', 'Corp Tower'], buildingCosts: [0, 100000, 200000, 400000] },
  g: { monopolySize: 2, color: '#e040fb', buildingNames: ['Lounge', 'Club', 'Entertainment Hub', 'VIP Complex'], buildingCosts: [0, 120000, 240000, 480000] },
  h: { monopolySize: 2, color: '#ff6b35', buildingNames: ['Lab', 'R&D Wing', 'Innovation Hub', 'Tech Godown'], buildingCosts: [0, 140000, 280000, 560000] },
  i: { monopolySize: 2, color: '#ffd700', buildingNames: ['Suite', 'Villa', 'Luxury Tower', 'Palace Resort'], buildingCosts: [0, 160000, 320000, 640000] },
  j: { monopolySize: 2, color: '#00d4ff', buildingNames: ['Unit', 'Block', 'Tower', 'Mega Complex'], buildingCosts: [0, 180000, 360000, 720000] },
  k: { monopolySize: 2, color: '#9b5de5', buildingNames: ['Startup', 'Agency', 'Media Hub', 'Empire HQ'], buildingCosts: [0, 200000, 400000, 800000] },
  l: { monopolySize: 2, color: '#ff6b35', buildingNames: ['Garage', 'Workshop', 'Godown', 'Global HQ'], buildingCosts: [0, 220000, 440000, 880000] },
  u: { monopolySize: 4, color: '#ffb700', buildingNames: ['Station', 'Hub', 'Network', 'Grid HQ'], buildingCosts: [0, 0, 0, 0] },
};

export const RENT_MULT = [0, 1, 2.2, 3.8, 6.0];
export const MONO_BONUS = 2.0;
export const MORT_RATIO = 0.50;
export const UNMORT_RATIO = 0.55;
export const JAIL_FINE = 50000;
export const GO_SALARY = 20000;
export const BANK_LOAN_RATE = 0.10;
export const BANK_LOAN_MAX = 300000;
export const BANK_ABORT_CHANCE = 0.12;

export const INITIAL_BOARD_TILES: BoardTile[] = [
  { id: 0,  type: 'go',       name: 'GO',               icon: '🚀', color: '#00ff88' },
  { id: 1,  type: 'biz',      name: 'Street Kiosk',     icon: '🥤', color: '#00d4ff', price: 40000,  baseRent: 4000,  tier: 'micro',       group: 'a' },
  { id: 2,  type: 'tax',      name: 'Tax Office',       icon: '🏛️', color: '#ff3366', taxRate: 0.08 },
  { id: 3,  type: 'biz',      name: 'Food Truck',       icon: '🚚', color: '#00d4ff', price: 60000,  baseRent: 7000,  tier: 'micro',       group: 'a' },
  { id: 4,  type: 'biz',      name: 'Laundromat',       icon: '🧺', color: '#9b5de5', price: 80000,  baseRent: 10000, tier: 'service',     group: 'b' },
  { id: 5,  type: 'utility',  name: 'Power Grid',       icon: '⚡', color: '#ffb700', price: 100000, baseRent: 12000, tier: 'utility',     group: 'u' },
  { id: 6,  type: 'biz',      name: 'Cyber Cafe',       icon: '💻', color: '#9b5de5', price: 90000,  baseRent: 12000, tier: 'service',     group: 'b' },
  { id: 7,  type: 'chance',   name: 'Chance',           icon: '🃏', color: '#ffb700' },
  { id: 8,  type: 'biz',      name: 'Street Diner',     icon: '🍜', color: '#f72585', price: 100000, baseRent: 14000, tier: 'micro',       group: 'c' },
  { id: 9,  type: 'biz',      name: 'Urban Grill',      icon: '🍔', color: '#f72585', price: 120000, baseRent: 18000, tier: 'resto',       group: 'c' },
  { id: 10, type: 'jail',     name: 'Just Visiting',    icon: '👀', color: '#555' },
  { id: 11, type: 'biz',      name: 'Boutique Hotel',   icon: '🏨', color: '#ff6b35', price: 150000, baseRent: 22000, tier: 'hospitality', group: 'd' },
  { id: 12, type: 'utility',  name: 'Telecom Hub',      icon: '📡', color: '#ffb700', price: 120000, baseRent: 15000, tier: 'utility',     group: 'u' },
  { id: 13, type: 'biz',      name: 'Spa Resort',       icon: '💆', color: '#ff6b35', price: 140000, baseRent: 20000, tier: 'hospitality', group: 'd' },
  { id: 14, type: 'biz',      name: 'Art Gallery',      icon: '🎨', color: '#7400b8', price: 160000, baseRent: 25000, tier: 'culture',     group: 'e' },
  { id: 15, type: 'chance',   name: 'Opportunity',      icon: '💡', color: '#ffb700' },
  { id: 16, type: 'biz',      name: 'Co-Work Space',    icon: '🖥️', color: '#7400b8', price: 180000, baseRent: 28000, tier: 'corporate',   group: 'e' },
  { id: 17, type: 'tax',      name: 'VAT Inspector',    icon: '📋', color: '#ff3366', taxRate: 0.12 },
  { id: 18, type: 'biz',      name: 'Tech Hub',         icon: '🔬', color: '#00ff88', price: 200000, baseRent: 35000, tier: 'corporate',   group: 'f' },
  { id: 19, type: 'biz',      name: 'Retail Center',    icon: '🛍️', color: '#00ff88', price: 220000, baseRent: 40000, tier: 'corporate',   group: 'f' },
  { id: 20, type: 'free',     name: 'Free Market',      icon: '🎯', color: '#00ff88' },
  { id: 21, type: 'biz',      name: 'Rooftop Bar',      icon: '🍸', color: '#e040fb', price: 240000, baseRent: 44000, tier: 'premium',     group: 'g' },
  { id: 22, type: 'chance',   name: 'Wild Card',        icon: '🎲', color: '#ffb700' },
  { id: 23, type: 'biz',      name: 'Night Club',       icon: '🎵', color: '#e040fb', price: 260000, baseRent: 48000, tier: 'premium',     group: 'g' },
  { id: 24, type: 'biz',      name: 'Data Center',      icon: '🗄️', color: '#ff6b35', price: 280000, baseRent: 52000, tier: 'tech',        group: 'h' },
  { id: 25, type: 'utility',  name: 'Transit Hub',      icon: '🚇', color: '#ffb700', price: 150000, baseRent: 20000, tier: 'utility',     group: 'u' },
  { id: 26, type: 'biz',      name: 'AI Lab',           icon: '🤖', color: '#ff6b35', price: 300000, baseRent: 58000, tier: 'tech',        group: 'h' },
  { id: 27, type: 'biz',      name: 'Luxury Hotel',     icon: '🏯', color: '#ffd700', price: 320000, baseRent: 65000, tier: 'luxury',      group: 'i' },
  { id: 28, type: 'tax',      name: 'Audit Season',     icon: '⚖️', color: '#ff3366', taxRate: 0.15 },
  { id: 29, type: 'biz',      name: 'Casino Resort',    icon: '🎰', color: '#ffd700', price: 350000, baseRent: 72000, tier: 'luxury',      group: 'i' },
  { id: 30, type: 'gotojail', name: 'Go to Jail',       icon: '🚔', color: '#ff3366' },
  { id: 31, type: 'biz',      name: 'Penthouse Suites', icon: '🌆', color: '#00d4ff', price: 380000, baseRent: 80000, tier: 'elite',       group: 'j' },
  { id: 32, type: 'biz',      name: 'Megamall',         icon: '🏢', color: '#00d4ff', price: 400000, baseRent: 88000, tier: 'elite',       group: 'j' },
  { id: 33, type: 'chance',   name: 'Event Card',       icon: '📰', color: '#ffb700' },
  { id: 34, type: 'biz',      name: 'IPO Launch',       icon: '📈', color: '#9b5de5', price: 440000, baseRent: 95000, tier: 'elite',       group: 'k' },
  { id: 35, type: 'utility',  name: 'HQ Complex',       icon: '🏛️', color: '#ffb700', price: 200000, baseRent: 28000, tier: 'utility',     group: 'u' },
  { id: 36, type: 'biz',      name: 'Media Empire',     icon: '📺', color: '#9b5de5', price: 480000, baseRent: 102000,tier: 'elite',       group: 'k' },
  { id: 37, type: 'tax',      name: 'Global Tax',       icon: '🌐', color: '#ff3366', taxRate: 0.18 },
  { id: 38, type: 'biz',      name: 'Space Ventures',   icon: '🚀', color: '#ff6b35', price: 500000, baseRent: 110000,tier: 'elite',       group: 'l' },
  { id: 39, type: 'biz',      name: 'Quantum Corp',     icon: '⚛️', color: '#ff6b35', price: 550000, baseRent: 120000,tier: 'elite',       group: 'l' },
];

export const CHANCE_CARDS: ChanceCard[] = [
  { text: 'Advance to GO — collect salary!',              effect: 'advanceGO' },
  { text: 'Investor conference nets you $35K.',           effect: 'cash', amount: 35000 },
  { text: 'Shark Tank win! Gain $50K.',                   effect: 'cash', amount: 50000 },
  { text: 'Tax audit — pay $25K penalty.',                effect: 'cash', amount: -25000 },
  { text: 'Viral moment! Earn $8K per business you own.', effect: 'viral', perBiz: 8000 },
  { text: 'Equipment failure — pay $15K.',                effect: 'cash', amount: -15000 },
  { text: 'Angel investor injects $60K!',                 effect: 'cash', amount: 60000 },
  { text: 'Market crash — lose 10% of your cash.',        effect: 'crash', pct: 0.10 },
  { text: 'Government grant: $40K awarded.',              effect: 'cash', amount: 40000 },
  { text: 'Supply disruption — pay $20K.',                effect: 'cash', amount: -20000 },
  { text: 'Dividend payout — collect $30K.',              effect: 'cash', amount: 30000 },
  { text: 'Go directly to jail. Do not pass GO.',         effect: 'jail' },
  { text: 'Each other player pays you $10K.',             effect: 'collectFromAll', amount: 10000 },
  { text: 'Pay $10K to each other player.',               effect: 'payAll', amount: 10000 },
  { text: 'You receive a Get Out of Jail Free card.',     effect: 'jailFree' },
];

export const RANDOM_EVENTS: RandomEvent[] = [
  { title: 'Stock Market Surge!',    desc: 'All players gain $20K from bull market!',      type: 'good',  action: 'stimulus', amount: 20000 },
  { title: 'Pandemic Protocol',      desc: 'Each player loses $15K in reduced earnings.',  type: 'bad',   action: 'allLose', amount: 15000 },
  { title: 'Viral Marketing Boost',  desc: 'Earn $6K per business you own!',               type: 'good',  action: 'perOwned', amount: 6000 },
  { title: 'Crypto Collapse',        desc: 'Lose 12% of current cash.',                    type: 'bad',   action: 'pctLose', pct: 0.12 },
  { title: 'Tourism Boom',           desc: 'All players earn $25K tourism windfall!',      type: 'good',  action: 'stimulus', amount: 25000 },
  { title: 'Recession Warning',      desc: 'Pay $8K per property you own.',                type: 'bad',   action: 'perProp', amount: 8000 },
  { title: 'Government Stimulus',    desc: 'Every player receives $30K!',                  type: 'good',  action: 'stimulus', amount: 30000 },
  { title: 'Energy Crisis',          desc: 'Lose $20K in increased operating costs.',       type: 'bad',   action: 'allLose', amount: 20000 },
  { title: 'Investor Confidence',    desc: 'Gain $10K per monopoly group you control!',    type: 'good',  action: 'perMono', amount: 10000 },
  { title: 'Regulatory Crackdown',   desc: 'Pay $10K fine per property owned.',            type: 'bad',   action: 'perProp', amount: 10000 },
];

export const PLAYER_COLORS = ['#00d4ff', '#ff3366', '#00ff88', '#ffb700', '#e040fb', '#ff6b35'];
export const PLAYER_EMOJIS = ['🧑', '🤖', '👾', '🎭', '🦊', '🐲'];
export const AI_NAMES = ['CyberCorp AI', 'NexusTech AI', 'OmegaVentures', 'AlphaInvest AI', 'QuantumAI'];
export const FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

export const BW = 480;
export const BH = 480;
export const CORNER = 52;
export const SIDE = (480 - 104) / 9;
