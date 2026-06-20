/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Player {
  id: number;
  name: string;
  isAI: boolean;
  cash: number;
  bankLoan: number;
  position: number;
  properties: number[]; // Tile IDs
  inJail: boolean;
  jailTurns: number;
  color: string;
  emoji: string;
  bankrupt: boolean;
}

export interface BoardTile {
  id: number;
  type: 'go' | 'biz' | 'tax' | 'chance' | 'jail' | 'utility' | 'free' | 'gotojail';
  name: string;
  icon: string;
  color: string;
  price?: number;
  baseRent?: number;
  tier?: 'micro' | 'service' | 'resto' | 'hospitality' | 'corporate' | 'culture' | 'premium' | 'tech' | 'luxury' | 'elite' | 'utility';
  group?: string;
  taxRate?: number;
  ownerId?: number | null;
  level?: number; // 1 = base, 2 = level 1 building, 3 = level 2, 4 = level 3
  mortgaged?: boolean;
}

export interface ChanceCard {
  text: string;
  effect: 'advanceGO' | 'cash' | 'viral' | 'crash' | 'jail' | 'collectFromAll' | 'payAll' | 'jailFree';
  amount?: number;
  perBiz?: number;
  pct?: number;
}

export interface RandomEvent {
  title: string;
  desc: string;
  type: 'good' | 'bad' | 'event';
  action: 'stimulus' | 'allLose' | 'perOwned' | 'pctLose' | 'perProp' | 'perMono';
  amount?: number;
  pct?: number;
}

export interface ArenaLogItem {
  id: string;
  player: string;
  action: string;
  type: 'event' | 'bad' | 'good' | 'info';
  timestamp: string;
}

export interface GameState {
  players: Player[];
  currentPlayerIdx: number;
  turn: number;
  dice: [number, number];
  rolling: boolean;
  doublesCount: number;
  waitingForAction: boolean;
  numPlayers: number;
  mode: 'ai' | 'online';
  difficulty: 'easy' | 'normal' | 'hard';
  startCapital: number;
  gameStarted: boolean;
  arenaLog: ArenaLogItem[];
  jailFreeCards: { [playerId: number]: number };
  randomEventQueue: number[];
  lastInterrupted: { type: string; args: any[] } | null;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  profession: string;
  gender: string;
  status: string;
  assets: string;
  elo: number;
  gamesPlayed: number;
  wins: number;
  createdAt: string;
  updatedAt: string;
}

export interface GameSave {
  saveId: string;
  userId: string;
  name: string;
  turn: number;
  players: Player[];
  currentPlayerIdx: number;
  tiles: { id: number; ownerId: number | null; level: number; mortgaged: boolean }[];
  randomEventQueue: number[];
  jailFreeCards: { [playerId: number]: number };
  arenaLog: ArenaLogItem[];
  lastInterrupted: { type: string; args: any[] } | null;
  createdAt: string;
  updatedAt: string;
}
