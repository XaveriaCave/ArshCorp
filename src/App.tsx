/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Player, BoardTile, ChanceCard, RandomEvent, ArenaLogItem, GameSave } from './types';
import {
  GROUP_CONFIG,
  RENT_MULT,
  MONO_BONUS,
  MORT_RATIO,
  UNMORT_RATIO,
  JAIL_FINE,
  GO_SALARY,
  BANK_LOAN_MAX,
  BANK_LOAN_RATE,
  INITIAL_BOARD_TILES,
  CHANCE_CARDS,
  RANDOM_EVENTS,
  PLAYER_COLORS,
  PLAYER_EMOJIS,
  AI_NAMES,
  FACES,
} from './constants';
import { fmtK, getTilePos, capitalize, getBizDesc } from './utils';
import { Board } from './components/Board';
import { SidebarLeft } from './components/SidebarLeft';
import { SidebarRight } from './components/SidebarRight';
import { TileDetail } from './components/TileDetail';
import { AuthScreen } from './components/AuthScreen';
import { SaveManager } from './components/SaveManager';
import { InfoModal, AuctionModal, MortgageManagerModal, RandomEventModal, ChanceCardModal } from './components/Modals';
import { ComplianceModal, CookieBanner } from './components/ComplianceModal';
import { auth, db } from './firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

export default function App() {
  // ── AUTH & VIEW ROUTING ──
  const [user, setUser] = useState<any>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [activeScreen, setActiveScreen] = useState<'lobby' | 'game' | 'profile'>('lobby');

  // ── COMPLIANCE MODAL STATE ──
  const [complianceModal, setComplianceModal] = useState<{
    isOpen: boolean;
    tab: 'privacy' | 'terms' | 'sitemap' | 'cookie' | 'age';
  }>({
    isOpen: false,
    tab: 'privacy',
  });

  // ── LOBBY CONFIGURATIONS ──
  const [numPlayers, setNumPlayers] = useState(2);
  const [difficulty, setDifficulty] = useState<'easy' | 'normal' | 'hard'>('normal');
  const [customNames, setCustomNames] = useState<string[]>(['You', '', '', '', '', '']);

  // ── CORE ACTIVE GAME STATE ──
  const [gameStarted, setGameStarted] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [tiles, setTiles] = useState<BoardTile[]>(INITIAL_BOARD_TILES.map(t => ({ ...t })));
  const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0);
  const [turn, setTurn] = useState(1);
  const [dice, setDice] = useState<[number, number]>([1, 1]);
  const [rolling, setRolling] = useState(false);
  const [doublesCount, setDoublesCount] = useState(0);
  const [arenaLog, setArenaLog] = useState<ArenaLogItem[]>([]);
  const [jailFreeCards, setJailFreeCards] = useState<{ [playerId: number]: number }>({});
  const [randomEventQueue, setRandomEventQueue] = useState<number[]>([]);
  
  // Custom resume states tracking
  const [lastInterrupted, setLastInterrupted] = useState<{ type: string; args: any[] } | null>(null);
  const [waitingForAction, setWaitingForAction] = useState(false);

  // ── MOBILE LAYOUT CONTROLS ──
  const [mobilePanel, setMobilePanel] = useState<'board' | 'dashboard' | 'arena'>('board');

  // ── TILE DETAIL SELECTION ──
  const [selectedTile, setSelectedTile] = useState<BoardTile | null>(null);
  const [selectedTileIdx, setSelectedTileIdx] = useState<number | null>(null);

  // ── MODAL DIALOG CONTROLS ──
  const [infoModal, setInfoModal] = useState<{
    isOpen: boolean;
    icon: string;
    title: string;
    sub: string;
    price: string;
    rent: string;
    owner: string;
    desc: string;
    actions: { label: string; cls: string; cb: () => void }[];
  }>({
    isOpen: false,
    icon: '🚀',
    title: '',
    sub: '',
    price: '',
    rent: '',
    owner: '',
    desc: '',
    actions: [],
  });

  const [auctionModal, setAuctionModal] = useState<{
    isOpen: boolean;
    tile: BoardTile | null;
    skippedPlayerId: number;
    finalizeCb?: (winner: Player | null, finalBid: number) => void;
  }>({
    isOpen: false,
    tile: null,
    skippedPlayerId: 0,
  });

  const [mortgageModalOpen, setMortgageModalOpen] = useState(false);
  
  const [eventModal, setEventModal] = useState<{
    isOpen: boolean;
    event: RandomEvent | null;
  }>({
    isOpen: false,
    event: null,
  });

  const [chanceModal, setChanceModal] = useState<{
    isOpen: boolean;
    card: ChanceCard | null;
    player: Player | null;
    isDoubles: boolean;
  }>({
    isOpen: false,
    card: null,
    player: null,
    isDoubles: false,
  });

  const [nextPlayerDelayedIdx, setNextPlayerDelayedIdx] = useState<number | null>(null);

  const [inspectedPlayerId, setInspectedPlayerId] = useState<number | null>(null);

  // ── REFS TO INTEGRATE UNIFIED STATE READS FOR TIMEOUTS (Avoids React StrictMode double schedule & stale closures) ──
  const playersRef = useRef<Player[]>([]);
  const tilesRef = useRef<BoardTile[]>([]);
  const currentPlayerIdxRef = useRef<number>(0);
  const rollingRef = useRef<boolean>(false);
  const waitingForActionRef = useRef<boolean>(false);

  playersRef.current = players;
  tilesRef.current = tiles;
  currentPlayerIdxRef.current = currentPlayerIdx;
  rollingRef.current = rolling;
  waitingForActionRef.current = waitingForAction;

  // ── TOAST MESSAGES SYSTEM ──
  const [_toasts, setToasts] = useState<any[]>([]);

  const showToast = (title: string, body: string, type: 'good' | 'bad' | 'info' | 'event' = 'info') => {
    const container = document.getElementById('toast-container');
    if (!container) return;

    // Check if there is an exact duplicate toast currently visible to avoid spamming
    const existing = container.getElementsByClassName('game-toast');
    for (let i = 0; i < existing.length; i++) {
      const el = existing[i] as HTMLElement;
      const existingTitle = el.querySelector('.toast-title')?.textContent;
      const existingBody = el.querySelector('.toast-body')?.textContent;
      if (existingTitle === title && existingBody === body) {
        return; // Prevent duplicate toast render
      }
    }

    const t = document.createElement('div');
    t.className = `game-toast toast-${type} toast-show`;
    t.innerHTML = `
      <button class="toast-close" aria-label="Close notification">✕</button>
      <div class="toast-title">${title}</div>
      <div class="toast-body">${body}</div>
    `;
    container.appendChild(t);

    let dismissed = false;
    let autoDismissTimeout: any = null;

    const dismiss = () => {
      if (dismissed) return;
      dismissed = true;
      if (autoDismissTimeout) clearTimeout(autoDismissTimeout);
      t.className = `game-toast toast-${type} toast-hide`;
      setTimeout(() => t.remove(), 400);
    };

    const closeBtn = t.querySelector('.toast-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dismiss();
      });
    }

    autoDismissTimeout = setTimeout(dismiss, 4500);
  };

  const addArenaLog = (player: string, action: string, type: 'event' | 'good' | 'bad' | 'info' = 'info') => {
    const time = new Date();
    const timestamp = `${time.getHours()}:${String(time.getMinutes()).padStart(2, '0')}`;
    const logObj: ArenaLogItem = {
      id: Math.random().toString(36).substr(2, 9),
      player,
      action,
      type,
      timestamp,
    };
    setArenaLog(prev => [logObj, ...prev].slice(0, 50));
  };

  // ── AUTH HANDLER ──
  const openComplianceTab = (tab: 'privacy' | 'terms' | 'sitemap' | 'cookie' | 'age') => {
    setComplianceModal({ isOpen: true, tab });
  };

  const handleAuthSuccess = (authUser: any, checkGuest: boolean) => {
    setUser(authUser);
    setIsGuest(checkGuest);
    if (checkGuest) {
      addArenaLog('GUEST_TYCOON', 'Logged in as Offline Guest. Data sync is bypassed.', 'event');
    } else {
      addArenaLog(authUser.displayName || 'TYCOON', 'Secure Firebase Profile Synchronized.', 'good');
    }
    setActiveScreen('lobby');
  };

  const handleSignOut = async () => {
    await auth.signOut();
    setUser(null);
    setIsGuest(false);
    setGameStarted(false);
    setActiveScreen('lobby');
  };

  // ── LOBBY TRIGGERS ──
  const launchGame = () => {
    const capital = difficulty === 'easy' ? 500000 : difficulty === 'normal' ? 300000 : 150000;
    
    // Setup Player list
    const initialPlayers: Player[] = [];
    const jailCards: { [pid: number]: number } = {};

    for (let i = 0; i < numPlayers; i++) {
      const nm = i === 0 ? (customNames[0] || 'You') : customNames[i] || AI_NAMES[i - 1] || `AI Mogul ${i}`;
      initialPlayers.push({
        id: i,
        name: nm,
        isAI: i > 0,
        cash: capital,
        bankLoan: 0,
        position: 0,
        properties: [],
        inJail: false,
        jailTurns: 0,
        color: PLAYER_COLORS[i],
        emoji: PLAYER_EMOJIS[i],
        bankrupt: false,
      });
      jailCards[i] = 0;
    }

    // Set states
    setPlayers(initialPlayers);
    setTiles(INITIAL_BOARD_TILES.map(t => ({ ...t, ownerId: null, level: 1, mortgaged: false })));
    setCurrentPlayerIdx(0);
    setTurn(1);
    setDice([1, 1]);
    setRolling(false);
    setDoublesCount(0);
    setJailFreeCards(jailCards);
    setLastInterrupted(null);
    setWaitingForAction(false);
    setSelectedTile(null);
    setSelectedTileIdx(null);
    
    // Arena begin log
    const introStr = 'ArshCorp Empire begins! Trade assets and dominate the digital economy. 🚀';
    setArenaLog([
      {
        id: 'start_game',
        player: 'SYSTEM',
        action: introStr,
        type: 'event',
        timestamp: new Date().toLocaleTimeString().slice(0, 5),
      },
    ]);

    // Schedule irregular random markets events turns queue (e.g. at turns 5, 12, 21)
    const queue: number[] = [];
    let start = 5 + Math.floor(Math.random() * 4);
    while (start < 100) {
      queue.push(start);
      start += 5 + Math.floor(Math.random() * 8);
    }
    setRandomEventQueue(queue);

    setGameStarted(true);
    setActiveScreen('game');
    showToast('🚀 EMPIRE COMMENCED', 'Welcome to ArshCorp! Manage your cash and leverage liabilities wisely.', 'event');
  };

  // ── RESUME/RECOVER FROM GAME SLOTS ──
  const handleLoadGame = (savedState: GameSave) => {
    // 1. Reset transient play states to ensure clean interactive restoration
    setRolling(false);
    setDoublesCount(0);
    setNextPlayerDelayedIdx(null);
    setInspectedPlayerId(null);
    
    // Set waitingForAction based on whether there's an active interruption being restored
    const isInterrupted = !!savedState.lastInterrupted;
    setWaitingForAction(isInterrupted);

    // 2. Set loaded core states
    setTurn(savedState.turn);
    setPlayers(savedState.players);
    setCurrentPlayerIdx(savedState.currentPlayerIdx);
    setJailFreeCards(savedState.jailFreeCards);
    setArenaLog(savedState.arenaLog);
    setRandomEventQueue(savedState.randomEventQueue);
    setLastInterrupted(savedState.lastInterrupted);
    
    // Restore dynamic tiles data
    const reconstructedTiles = INITIAL_BOARD_TILES.map(t => {
      const match = savedState.tiles.find(st => st.id === t.id);
      if (match) {
        return {
          ...t,
          ownerId: match.ownerId,
          level: match.level,
          mortgaged: match.mortgaged,
        };
      }
      return { ...t, ownerId: null, level: 1, mortgaged: false };
    });
    setTiles(reconstructedTiles);

    // 3. Update refs immediately to avoid race conditions with stale refs in effects/routines
    playersRef.current = savedState.players;
    tilesRef.current = reconstructedTiles;
    currentPlayerIdxRef.current = savedState.currentPlayerIdx;
    rollingRef.current = false;
    waitingForActionRef.current = isInterrupted;

    setGameStarted(true);
    setActiveScreen('game');
    showToast('💾 GAME RESTORED', `Loaded successfully: "${savedState.name}"`, 'good');
    addArenaLog('SYSTEM', `Hydrated game from cloud slot: "${savedState.name}" at Turn ${savedState.turn}.`, 'event');

    // Auto trigger pending overlays on resume to guarantee perfect UX visibility
    if (savedState.lastInterrupted) {
      setTimeout(() => {
        const { type, args } = savedState.lastInterrupted!;
        if (type === 'buy') {
          const freshHuman = savedState.players.find(p => p.id === 0) || savedState.players[0];
          const freshTile = reconstructedTiles.find(t => t.id === args[0].id) || args[0];
          openVacantPurchaseOverlay(freshHuman, freshTile, args[2]);
        } else if (type === 'jail') {
          const freshHuman = savedState.players.find(p => p.id === 0) || savedState.players[0];
          openJailChoicesModal(freshHuman, args[1], args[2]);
        } else if (type === 'insolvency') {
          const freshHuman = savedState.players.find(p => p.id === args[0].id) || args[0];
          openInsolvencyModalOverlay(freshHuman, args[1], args[2], args[3]);
        }
      }, 300);
    }
  };

  // ── PERSIST GAME FINALIZE OR TRIGGER WINNER UPDATE ──
  const updateProfileWins = async (winnerUid: string) => {
    if (isGuest || !user) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const uData = userSnap.data();
        const nextWins = (uData.wins || 0) + (winnerUid === user.uid ? 1 : 0);
        const nextGames = (uData.gamesPlayed || 0) + 1;
        const nextElo = (uData.elo || 1000) + (winnerUid === user.uid ? 25 : -10);

        await setDoc(userRef, {
          ...uData,
          wins: nextWins,
          gamesPlayed: nextGames,
          elo: nextElo,
          updatedAt: new Date().toISOString(),
        });
        showToast('🏆 PROFILE UPDATED', `ELO rating set to ${nextElo}. Matches played: ${nextGames}`, 'event');
      }
    } catch (err) {
      console.error('Win Update Fail: ', err);
    }
  };

  // ── REUSABLE HELPER COMPUTATIONS ──
  const ownsFullGroupLocal = (player: Player, group: string) => {
    const gt = INITIAL_BOARD_TILES.filter(t => t.group === group && (t.type === 'biz' || t.type === 'utility'));
    return gt.length > 0 && gt.every(t => {
      const live = tilesRef.current.find(tile => tile.id === t.id) || tiles.find(tile => tile.id === t.id);
      return live && live.ownerId === player.id && !live.mortgaged;
    });
  };

  const getTileRent = (tile: BoardTile) => {
    if (!tile.baseRent) return 0;
    if (tile.mortgaged) return 0;
    let rent = Math.floor(tile.baseRent * RENT_MULT[tile.level || 1]);
    const ow = playersRef.current.find(p => p.id === tile.ownerId) || players.find(p => p.id === tile.ownerId);
    if (ow && tile.group && ownsFullGroupLocal(ow, tile.group) && tile.level === 1) {
      rent = Math.floor(tile.baseRent * MONO_BONUS);
    }
    return rent;
  };

  // ── DICE LOGICS ──
  const rollDice = () => {
    if (rolling || waitingForAction) return;
    const cp = players[currentPlayerIdx];
    if (!cp || cp.isAI || cp.bankrupt) return;

    initiateDiceRoll(cp);
  };

  const initiateDiceRoll = (player: Player) => {
    if (activeScreen !== 'game') return;
    if (rollingRef.current || waitingForActionRef.current) {
      console.warn(`[BLOCKED] Parallel roll request ignored for ${player.name}`);
      return;
    }
    setRolling(true);
    setWaitingForAction(true);
    rollingRef.current = true;
    waitingForActionRef.current = true;

    let ticks = 0;
    const interval = setInterval(() => {
      const mock1 = Math.ceil(Math.random() * 6);
      const mock2 = Math.ceil(Math.random() * 6);
      setDice([mock1, mock2]);
      ticks++;

      if (ticks > 12) {
        clearInterval(interval);
        const r1 = Math.ceil(Math.random() * 6);
        const r2 = Math.ceil(Math.random() * 6);
        setDice([r1, r2]);
        setRolling(false);

        const total = r1 + r2;
        const dbl = r1 === r2;
        addArenaLog(player.name, `rolled dice 🎲 ${r1}+${r2}=${total}${dbl ? ' (DOUBLES!)' : ''}`, dbl ? 'good' : 'info');

        let nextDoubles = dbl ? doublesCount + 1 : 0;
        setDoublesCount(nextDoubles);

        if (dbl && nextDoubles >= 3) {
          setDoublesCount(0);
          showToast('🚔 JAILD LOCKED', 'Three consecutive doubles — sent directly to jail!', 'bad');
          addArenaLog(player.name, 'sent to jail due to 3 consecutive doubles.', 'bad');
          
          setPlayers(prev => prev.map(p => {
            if (p.id !== player.id) return p;
            return { ...p, inJail: true, jailTurns: 0, position: 10 };
          }));
          setWaitingForAction(false);
          setTimeout(() => advanceTurn(false), 1200);
          return;
        }

        // Jail status handling
        if (player.inJail) {
          if (dbl) {
            showToast('🔓 ESCAPED JAIL', 'Rolled doubles! You are released for free!', 'good');
            addArenaLog(player.name, 'escaped jail free by rolling doubles.', 'good');
            setPlayers(prev => prev.map(p => {
              if (p.id !== player.id) return p;
              return { ...p, inJail: false, jailTurns: 0 };
            }));
            setWaitingForAction(false);
            animateMove(player.id, total, false);
          } else {
            const currentTurns = (player.jailTurns || 0) + 1;
            setPlayers(prev => prev.map(p => {
              if (p.id !== player.id) return p;
              return { ...p, jailTurns: currentTurns };
            }));
            
            if (player.isAI) {
              // AI automated jail bail decision
              if (currentTurns >= 3 || player.cash >= JAIL_FINE) {
                const pays = player.cash >= JAIL_FINE;
                setPlayers(prev => prev.map(p => {
                  if (p.id !== player.id) return p;
                  return {
                    ...p,
                    cash: pays ? p.cash - JAIL_FINE : p.cash,
                    inJail: false,
                    jailTurns: 0,
                  };
                }));
                addArenaLog(player.name, pays ? `paid $${fmtK(JAIL_FINE)} bail — free!` : 'escaped jail (3 turns limit).', 'good');
                setWaitingForAction(false);
                animateMove(player.id, total, false);
              } else {
                addArenaLog(player.name, `remains in jail (Turn ${currentTurns}/3).`, 'bad');
                setWaitingForAction(false);
                setTimeout(() => advanceTurn(false), 1200);
              }
            } else {
              // Present choices to human player
              setPlayers(prev => {
                const refreshedHuman = prev.find(p => p.id === 0)!;
                setTimeout(() => {
                  openJailChoicesModal(refreshedHuman, total, dbl);
                }, 0);
                return prev;
              });
            }
          }
        } else {
          // Free walk movement
          animateMove(player.id, total, dbl);
        }
      }
    }, 90);
  };

  // ── HUMAN IN JAIL ACTION OVERLAYS ──
  const openJailChoicesModal = (humanPlayer: Player, steps: number, isDoubles: boolean) => {
    const hasCard = (jailFreeCards[0] || 0) > 0;
    const canPay = humanPlayer.cash >= JAIL_FINE;
    const bChoices = [];

    if (canPay) {
      bChoices.push({
        label: `Pay Bail $${fmtK(JAIL_FINE)}`,
        cls: 'buy',
        cb: () => {
          setInfoModal(prev => ({ ...prev, isOpen: false }));
          setPlayers(prev => prev.map(p => {
            if (p.id !== 0) return p;
            return { ...p, cash: p.cash - JAIL_FINE, inJail: false, jailTurns: 0 };
          }));
          addArenaLog(humanPlayer.name, `paid $${fmtK(JAIL_FINE)} bail — released!`, 'good');
          setWaitingForAction(false);
          animateMove(0, steps, isDoubles);
        },
      });
    }

    if (hasCard) {
      bChoices.push({
        label: 'Use Get Out of Jail Card',
        cls: 'upgrade',
        cb: () => {
          setInfoModal(prev => ({ ...prev, isOpen: false }));
          setJailFreeCards(prev => ({ ...prev, 0: prev[0] - 1 }));
          setPlayers(prev => prev.map(p => {
            if (p.id !== 0) return p;
            return { ...p, inJail: false, jailTurns: 0 };
          }));
          addArenaLog(humanPlayer.name, 'used Get Out of Jail Free card — released!', 'good');
          setWaitingForAction(false);
          animateMove(0, steps, isDoubles);
        },
      });
    }

    if (humanPlayer.jailTurns >= 3) {
      bChoices.push({
        label: `Forced Bail $${fmtK(JAIL_FINE)}`,
        cls: 'auction',
        cb: () => {
          setInfoModal(prev => ({ ...prev, isOpen: false }));
          setPlayers(prev => prev.map(p => {
            if (p.id !== 0) return p;
            return { ...p, cash: Math.max(0, p.cash - JAIL_FINE), inJail: false, jailTurns: 0 };
          }));
          addArenaLog(humanPlayer.name, `paid forced bail of $${fmtK(JAIL_FINE)} (3 turns done).`, 'event');
          setWaitingForAction(false);
          animateMove(0, steps, isDoubles);
        },
      });
    } else {
      bChoices.push({
        label: `Wait (${3 - (humanPlayer.jailTurns || 1)} turns left)`,
        cls: 'skip',
        cb: () => {
          setInfoModal(prev => ({ ...prev, isOpen: false }));
          addArenaLog(humanPlayer.name, `stays in jail (Turn ${humanPlayer.jailTurns}/3).`, 'bad');
          setWaitingForAction(false);
          setLastInterrupted(null);
          setTimeout(() => advanceTurn(isDoubles), 800);
        },
      });
    }

    setInfoModal({
      isOpen: true,
      icon: '🚔',
      title: '🚔 CONFINED IN JAIL',
      sub: `Turn ${humanPlayer.jailTurns || 1} of 3`,
      price: `$${fmtK(humanPlayer.cash)}`,
      rent: `$${fmtK(JAIL_FINE)}`,
      owner: humanPlayer.name,
      desc: 'You are currently locked. Pay the $50K bail fee, use your Get Out Free card, or trial roll.',
      actions: bChoices,
    });
    setLastInterrupted({ type: 'jail', args: [humanPlayer, isDoubles] });
  };

  // ── MOVE TRANSITIONS ──
  const animateMove = (playerId: number, steps: number, isDoubles: boolean) => {
    let stepCount = 0;
    const initialPos = playersRef.current.find(p => p.id === playerId)!.position;

    const interval = setInterval(() => {
      stepCount++;
      setPlayers(prev => prev.map(p => {
        if (p.id !== playerId) return p;
        const nextPos = (p.position + 1) % 40;
        let nextCash = p.cash;
        if (nextPos === 0 && stepCount < steps) {
          nextCash += GO_SALARY;
          showToast('🚀 PASSED GO!', `Collected salary reward of $${fmtK(GO_SALARY)}!`, 'good');
          addArenaLog(p.name, `earned pass GO reward of $${fmtK(GO_SALARY)} salary!`, 'good');
        }
        return { ...p, position: nextPos, cash: nextCash };
      }));

      if (stepCount >= steps) {
        clearInterval(interval);
        // Wait 150ms to allow final movement state updates to fully flush, then resolve landing ONCE
        setTimeout(() => {
          const freshPlayer = playersRef.current.find(p => p.id === playerId);
          if (freshPlayer) {
            const finalPos = freshPlayer.position;
            const freshTile = tilesRef.current[finalPos];
            handleLandOnTile(freshPlayer, freshTile, isDoubles);
          }
        }, 150);
      }
    }, 110);
  };

  // ── TILE-LAND ACTIONS ROUTING ──
  const handleLandOnTile = (player: Player, tile: BoardTile, isDoubles: boolean) => {
    switch (tile.type) {
      case 'go':
        setPlayers(prev => prev.map(p => {
          if (p.id !== player.id) return p;
          return { ...p, cash: p.cash + GO_SALARY };
        }));
        showToast('🚀 LANDED ON GO!', `${player.name} landed on GO and collected a double salary bonus of $${fmtK(GO_SALARY)}!`, 'good');
        addArenaLog(player.name, `landed directly on GO — bonus salary $${fmtK(GO_SALARY)}!`, 'good');
        setTimeout(() => advanceTurn(isDoubles), 1200);
        break;

      case 'jail':
        showToast('👀 JUST VISITING', `${player.name} is just visiting jail. Relishing the tycoon sights.`, 'info');
        addArenaLog(player.name, 'is just visiting the jail compound.', 'info');
        setTimeout(() => advanceTurn(isDoubles), 1000);
        break;

      case 'gotojail':
        setPlayers(prev => prev.map(p => {
          if (p.id !== player.id) return p;
          return { ...p, inJail: true, jailTurns: 0, position: 10 };
        }));
        showToast('🚔 GO TO JAIL IMMED', `${player.name} was sent directly to jail! Teleported onto tile 10.`, 'bad');
        addArenaLog(player.name, 'sent to jail directly from Go to Jail tile.', 'bad');
        setTimeout(() => advanceTurn(false), 1400);
        break;

      case 'free':
        setPlayers(prev => prev.map(p => {
          if (p.id !== player.id) return p;
          return { ...p, cash: p.cash + 15000 };
        }));
        showToast('🎯 FREE MARKET WINDFALL', `${player.name} landed in the Free Trade hub! Collected $15,000.`, 'good');
        addArenaLog(player.name, 'hit the Free Market zone and grabbed a $15,000 bonus!', 'good');
        setTimeout(() => advanceTurn(isDoubles), 1200);
        break;

      case 'chance':
        handleChanceLanding(player, isDoubles);
        break;

      case 'tax':
        handleTaxLanding(player, tile, isDoubles);
        break;

      case 'biz':
      case 'utility':
        handlePropertyLanding(player, tile, isDoubles);
        break;

      default:
        setTimeout(() => advanceTurn(isDoubles), 1000);
    }
  };

  // ── CHANCE CARDS RESOLUTION ──
  const handleChanceLanding = (player: Player, isDoubles: boolean) => {
    const card = CHANCE_CARDS[Math.floor(Math.random() * CHANCE_CARDS.length)];
    const isGood = ['advanceGO', 'viral', 'collectFromAll', 'jailFree'].includes(card.effect) || (card.effect === 'cash' && card.amount! > 0);
    
    showToast('🃏 CHANCE CARD DRAWN', `${player.name} drew: "${card.text}"`, isGood ? 'good' : 'bad');
    addArenaLog(player.name, `drew Chance Card: "${card.text}"`, isGood ? 'good' : 'bad');

    setPlayers(prev => {
      return prev.map(p => {
        if (p.id !== player.id) {
          // secondary updates for payments
          if (card.effect === 'collectFromAll') {
            const val = Math.min(card.amount!, p.cash);
            return { ...p, cash: p.cash - val };
          }
          if (card.effect === 'payAll') {
            return { ...p, cash: p.cash + card.amount! };
          }
          return p;
        }

        let nextCash = p.cash;
        let nextPos = p.position;
        let nextJail = p.inJail;
        let nextJailTurns = p.jailTurns;

        switch (card.effect) {
          case 'cash':
            nextCash = Math.max(0, p.cash + card.amount!);
            break;
          case 'advanceGO':
            nextPos = 0;
            nextCash += GO_SALARY;
            break;
          case 'viral':
            nextCash += p.properties.length * card.perBiz!;
            break;
          case 'crash':
            nextCash = Math.max(0, p.cash - Math.floor(p.cash * card.pct!));
            break;
          case 'jail':
            nextPos = 10;
            nextJail = true;
            nextJailTurns = 0;
            break;
          case 'collectFromAll':
            const playersCount = prev.filter(x => !x.bankrupt && x.id !== p.id).length;
            nextCash += playersCount * card.amount!;
            break;
          case 'payAll':
            const others = prev.filter(x => !x.bankrupt && x.id !== p.id).length;
            nextCash = Math.max(0, p.cash - others * card.amount!);
            break;
          case 'jailFree':
            setJailFreeCards(prevDict => ({ ...prevDict, [p.id]: (prevDict[p.id] || 0) + 1 }));
            break;
        }

        return { ...p, cash: nextCash, position: nextPos, inJail: nextJail, jailTurns: nextJailTurns };
      });
    });

    setChanceModal({
      isOpen: true,
      card,
      player,
      isDoubles,
    });
  };

  // ── TAX REGULATORY REGIME LAND ──
  const handleTaxLanding = (player: Player, tile: BoardTile, isDoubles: boolean) => {
    const rate = tile.taxRate || 0.1;
    const taxValue = Math.floor(player.cash * rate);

    setPlayers(prev => prev.map(p => {
      if (p.id !== player.id) return p;
      return { ...p, cash: Math.max(0, p.cash - taxValue) };
    }));

    showToast(`🏛️ ${tile.name.toUpperCase()}`, `${player.name} paid standard regulatory tax rate equal to ${Math.round(rate * 100)}% (-$${fmtK(taxValue)})`, 'bad');
    addArenaLog(player.name, `paid regulatory fees of $${fmtK(taxValue)} tax to the city registry.`, 'bad');

    // Check insolvency limits
    setTimeout(() => {
      setPlayers(prev => {
        const curr = prev.find(p => p.id === player.id)!;
        if (curr.cash <= 0) {
          addArenaLog(curr.name, '⚠️ treasury fully depleted from taxes!', 'bad');
        }
        return prev;
      });
      advanceTurn(isDoubles);
    }, 1500);
  };

  // ── COMMERCE LANDING HANDLER ──
  const handlePropertyLanding = (landingPlayer: Player, tile: BoardTile, isDoubles: boolean) => {
    // Read the latest fresh tile details from tilesRef to handle real-time properties
    const freshTile = tilesRef.current.find(t => t.id === tile.id) || tile;

    if (freshTile.mortgaged) {
      showToast('🏦 TILES MORTGAGED', 'No rent is due because this storefront is mortgaged.', 'info');
      addArenaLog(landingPlayer.name, `lands on mortgaged storefront ${freshTile.icon} ${freshTile.name}.`, 'info');
      setTimeout(() => advanceTurn(isDoubles), 1000);
      return;
    }

    if (freshTile.ownerId === null || freshTile.ownerId === undefined) {
      // Vacant property
      if (landingPlayer.isAI) {
        // AI Buying Decision Algorithm
        const shortfall = freshTile.price! - landingPlayer.cash;

        if (shortfall <= 0) {
          // AI has enough cash directly to purchase! Buy immediately.
          setPlayers(prev => prev.map(p => {
            if (p.id !== landingPlayer.id) return p;
            return {
              ...p,
              cash: p.cash - freshTile.price!,
              properties: Array.from(new Set([...p.properties, freshTile.id])),
            };
          }));
          
          setTiles(prev => prev.map(t => {
            if (t.id !== freshTile.id) return t;
            return { ...t, ownerId: landingPlayer.id, level: 1 };
          }));

          addArenaLog(landingPlayer.name, `bought ${freshTile.icon} ${freshTile.name} directly for $${fmtK(freshTile.price!)}`, 'good');
          showToast('💰 PROPERTY BOUGHT', `${landingPlayer.name} bought ${freshTile.icon} ${freshTile.name} for $${fmtK(freshTile.price!)}!`, 'good');
          
          if (ownsFullGroupLocal(landingPlayer, freshTile.group!)) {
            addArenaLog(landingPlayer.name, `achieved a perfect MONOPOLY on colors ${freshTile.group?.toUpperCase()}!`, 'event');
            showToast('👑 MONOPOLY UNLOCKED', `${landingPlayer.name} unlocked full color monopoly on ${freshTile.group?.toUpperCase()}!`, 'event');
          }
          setTimeout(() => advanceTurn(isDoubles), 1200);
        } else {
          // AI does not have enough cash directly.
          // Check potential cash raising via bank loan headroom and mortgaging options
          const maxLoanHeadroom = BANK_LOAN_MAX - landingPlayer.bankLoan;
          const maxLoanCashValue = Math.floor(maxLoanHeadroom * (1 - BANK_LOAN_RATE));

          // Find AI's unmortgaged properties
          const unmortgagedProperties = tilesRef.current.filter(t => t.ownerId === landingPlayer.id && !t.mortgaged);
          const totalMortgageValue = unmortgagedProperties.reduce((sum, t) => sum + Math.floor((t.price || 0) * 0.5), 0);

          const maxRaisable = maxLoanCashValue + totalMortgageValue;

          // AI can choose to mortgage/borrow if they can cover the shortfall and a random check succeeds (increased to 85% probability)
          const chooseToLeverage = shortfall <= maxRaisable && Math.random() <= 0.85;

          if (chooseToLeverage) {
            let currentShortfall = shortfall;
            let loanToTake = 0;
            let cashRaisedFromLoan = 0;

            if (maxLoanHeadroom > 0) {
              const loanNeeded = Math.ceil(currentShortfall / (1 - BANK_LOAN_RATE));
              loanToTake = Math.min(loanNeeded, maxLoanHeadroom);
              cashRaisedFromLoan = loanToTake - Math.floor(loanToTake * BANK_LOAN_RATE);
              currentShortfall -= cashRaisedFromLoan;
            }

            const mortgagedTileIds: number[] = [];
            let cashRaisedFromMortgages = 0;

            if (currentShortfall > 0) {
              for (const pTile of unmortgagedProperties) {
                const mortVal = Math.floor((pTile.price || 0) * 0.5);
                mortgagedTileIds.push(pTile.id);
                cashRaisedFromMortgages += mortVal;
                currentShortfall -= mortVal;
                if (currentShortfall <= 0) break;
              }
            }

            // Execute transactions
            setPlayers(prev => prev.map(p => {
              if (p.id !== landingPlayer.id) return p;
              const nextCash = p.cash + cashRaisedFromLoan + cashRaisedFromMortgages - freshTile.price!;
              return {
                ...p,
                cash: nextCash,
                bankLoan: p.bankLoan + loanToTake,
                properties: Array.from(new Set([...p.properties, freshTile.id]))
              };
            }));

            setTiles(prev => prev.map(t => {
              if (t.id === freshTile.id) {
                return { ...t, ownerId: landingPlayer.id, level: 1 };
              }
              if (mortgagedTileIds.includes(t.id)) {
                return { ...t, mortgaged: true };
              }
              return t;
            }));

            if (loanToTake > 0) {
              addArenaLog(landingPlayer.name, `leveraged $${fmtK(loanToTake)} bank credit limit (net $${fmtK(cashRaisedFromLoan)}) to fund transaction.`, 'info');
            }
            if (mortgagedTileIds.length > 0) {
              addArenaLog(landingPlayer.name, `mortgaged ${mortgagedTileIds.length} properties to secure an extra $${fmtK(cashRaisedFromMortgages)} fallback funds.`, 'bad');
            }

            addArenaLog(landingPlayer.name, `successfully purchased ${freshTile.icon} ${freshTile.name} for $${fmtK(freshTile.price!)} using emergency cash!`, 'good');
            showToast('🏦 CREDIT PURCHASE', `${landingPlayer.name} leveraged credit and cash to acquire ${freshTile.icon} ${freshTile.name}!`, 'event');
            
            if (ownsFullGroupLocal(landingPlayer, freshTile.group!)) {
              addArenaLog(landingPlayer.name, `achieved a perfect MONOPOLY on colors ${freshTile.group?.toUpperCase()}!`, 'event');
              showToast('👑 MONOPOLY UNLOCKED', `${landingPlayer.name} unlocked full color monopoly on ${freshTile.group?.toUpperCase()}!`, 'event');
            }

            setTimeout(() => advanceTurn(isDoubles), 1400);
          } else {
            // Cannot raise enough cash OR chose not to leverage. Start public auction!
            addArenaLog(landingPlayer.name, `does not have sufficient liquid funds to purchase ${freshTile.icon} ${freshTile.name}; starting public auction.`, 'info');
            showToast('🔨 AUCTION CREATED', `${landingPlayer.name} initiated auction for ${freshTile.icon} ${freshTile.name}!`, 'info');
            startPropertyAuction(freshTile, landingPlayer.id, isDoubles);
          }
        }
      } else {
        // Show human purchase options
        openVacantPurchaseOverlay(landingPlayer, freshTile, isDoubles);
      }
    } else if (freshTile.ownerId === landingPlayer.id) {
      // Visited own property
      showToast('🏠 HOME PROPERTY', `You are visiting your storefront: ${freshTile.icon} ${freshTile.name}.`, 'info');
      addArenaLog(landingPlayer.name, `visited their own headquarters ${freshTile.icon} ${freshTile.name}.`, 'info');
      setTimeout(() => advanceTurn(isDoubles), 1000);
    } else {
      // Rent payment due
      const owner = playersRef.current.find(p => p.id === freshTile.ownerId)!;
      const rentValue = getTileRent(freshTile);

      if (landingPlayer.cash >= rentValue) {
        // Execute transfer
        setPlayers(prev => prev.map(p => {
          if (p.id === landingPlayer.id) {
            return { ...p, cash: p.cash - rentValue };
          }
          if (p.id === owner.id) {
            return { ...p, cash: p.cash + rentValue };
          }
          return p;
        }));

        const isMe = landingPlayer.id === 0;
        const toMe = owner.id === 0;

        if (isMe) showToast('💸 RENT PAID', `Paid $${fmtK(rentValue)} rent to ${owner.name} for ${freshTile.icon} ${freshTile.name}.`, 'bad');
        else if (toMe) showToast('💰 RENT COLLECTED', `${landingPlayer.name} paid you $${fmtK(rentValue)} rent for ${freshTile.icon} ${freshTile.name}! 🎉`, 'good');
        else showToast('💸 COMMERCE DUE', `${landingPlayer.name} paid $${fmtK(rentValue)} to ${owner.name}.`, 'info');

        addArenaLog(landingPlayer.name, `paid $${fmtK(rentValue)} rent to ${owner.name} at ${freshTile.icon} ${freshTile.name}`, 'bad');
        setTimeout(() => advanceTurn(isDoubles), 1500);
      } else {
        // Insolvency
        if (landingPlayer.isAI) {
          // AI automatically finances down
          aiFinancesUpToCover(landingPlayer, owner, rentValue, isDoubles);
        } else {
          // Prompt human insolvency menu
          setPlayers(prev => {
            const currentHuman = prev.find(p => p.id === 0)!;
            openInsolvencyModalOverlay(currentHuman, owner, rentValue, isDoubles);
            return prev;
          });
        }
      }
    }
  };

  // ── VACANT DIRECT TRANSACTION OVERLAY ──
  const openVacantPurchaseOverlay = (human: Player, tile: BoardTile, isDoubles: boolean) => {
    const canAfford = human.cash >= tile.price!;
    const canLoan = (BANK_LOAN_MAX - human.bankLoan) > 0;
    const choices = [];

    if (canAfford) {
      choices.push({
        label: `TRANSACT $${fmtK(tile.price!)}`,
        cls: 'buy',
        cb: () => {
          setInfoModal(prev => ({ ...prev, isOpen: false }));
          buyPropertyDirect(human, tile, isDoubles);
        },
      });
    }

    if (!canAfford && canLoan) {
      choices.push({
        label: '🏦 BORROW TO BUY',
        cls: 'upgrade',
        cb: () => {
          // Open loan popup
          setInfoModal(prev => ({ ...prev, isOpen: false }));
          triggerLoanPopupOverlay(tile.price! - human.cash, (ok) => {
            if (ok) {
              setPlayers(latestPlayers => {
                const recheckedHuman = latestPlayers.find(p => p.id === 0)!;
                if (recheckedHuman.cash >= tile.price!) {
                  buyPropertyDirect(recheckedHuman, tile, isDoubles);
                } else {
                  openVacantPurchaseOverlay(recheckedHuman, tile, isDoubles);
                }
                return latestPlayers;
              });
            } else {
              setPlayers(latestPlayers => {
                openVacantPurchaseOverlay(latestPlayers.find(p => p.id === 0)!, tile, isDoubles);
                return latestPlayers;
              });
            }
          });
        },
      });
    }

    choices.push({
      label: '🔨 PUBLIC AUCTION',
      cls: 'auction',
      cb: () => {
        setInfoModal(prev => ({ ...prev, isOpen: false }));
        startPropertyAuction(tile, 0, isDoubles);
      },
    });

    choices.push({
      label: 'SKIP AS VACANT',
      cls: 'skip',
      cb: () => {
        setInfoModal(prev => ({ ...prev, isOpen: false }));
        setWaitingForAction(false);
        setLastInterrupted(null);
        startPropertyAuction(tile, 0, isDoubles);
      },
    });

    setInfoModal({
      isOpen: true,
      icon: tile.icon,
      title: `BUY ${tile.name.toUpperCase()}`,
      sub: `${capitalize(tile.tier || tile.type)} · Base rent $${fmtK(tile.baseRent || 0)}`,
      price: `$${fmtK(tile.price!)}`,
      rent: `$${fmtK(tile.baseRent || 0)}`,
      owner: 'VACANT',
      desc: getBizDesc(tile),
      actions: choices,
    });
    setLastInterrupted({ type: 'buy', args: [tile, human, isDoubles] });
  };

  const buyPropertyDirect = (buyer: Player, tile: BoardTile, isDoubles: boolean) => {
    setPlayers(prev => prev.map(p => {
      if (p.id !== buyer.id) return p;
      return {
        ...p,
        cash: p.cash - tile.price!,
        properties: Array.from(new Set([...p.properties, tile.id])),
      };
    }));

    setTiles(prev => prev.map(t => {
      if (t.id !== tile.id) return t;
      return { ...t, ownerId: buyer.id, level: 1 };
    }));

    showToast('🏢 INCORPORATED', `${tile.name} was added to your balance sheet!`, 'good');
    addArenaLog(buyer.name, `bought ${tile.icon} ${tile.name} on landing, paying $${fmtK(tile.price!)}`, 'good');

    setPlayers(latestPlayers => {
      const p = latestPlayers.find(x => x.id === buyer.id)!;
      if (ownsFullGroupLocal(p, tile.group!)) {
        showToast('♛ COLOR MONOPOLY UNLOCKED', `You compiled full group ${tile.group?.toUpperCase()}! Landlord rent bonus is now active.`, 'event');
        addArenaLog(p.name, `achieved color MONOPOLY on group ${tile.group?.toUpperCase()}!`, 'event');
      }
      return latestPlayers;
    });

    setWaitingForAction(false);
    setLastInterrupted(null);
    setTimeout(() => advanceTurn(isDoubles), 1400);
  };

  // ── MORTGAGE MANAGE TRIGGERS ──
  const handleToggleMortgage = (tileId: number, wantMortgage: boolean) => {
    setTiles(prev => prev.map(t => {
      if (t.id !== tileId) return t;
      return { ...t, mortgaged: wantMortgage };
    }));

    setPlayers(prev => prev.map(p => {
      if (p.id !== 0) return p;
      const t = tiles.find(x => x.id === tileId)!;
      const diffVal = wantMortgage ? Math.floor(t.price! * MORT_RATIO) : -Math.floor(t.price! * UNMORT_RATIO);
      return { ...p, cash: p.cash + diffVal };
    }));

    const tileObj = tiles.find(x => x.id === tileId)!;
    if (wantMortgage) {
      showToast('🏦 STORE MORTGAGED', `${tileObj?.name} mortgaged. Cash raised!`, 'event');
      addArenaLog(players[0].name, `mortgaged storefront ${tileObj?.icon} ${tileObj?.name} for $${fmtK(tileObj?.price! * 0.5)}`, 'event');
    } else {
      showToast('✅ PROPERTY RESTORED', `${tileObj?.name} has been reactivated. Rent resumed!`, 'good');
      addArenaLog(players[0].name, `paid $${fmtK(tileObj?.price! * 0.55)} to reactivate ${tileObj?.icon} ${tileObj?.name}`, 'good');
    }
  };

  // ── IN-GAME PUBLIC AUCTIONS ──
  const startPropertyAuction = (tile: BoardTile, skippedId: number, isDoubles: boolean) => {
    setAuctionModal({
      isOpen: true,
      tile: tile,
      skippedPlayerId: skippedId,
      finalizeCb: (winner, finalBid) => {
        if (winner) {
          setPlayers(prev => prev.map(p => {
            if (p.id !== winner.id) return p;
            return {
              ...p,
              cash: p.cash - finalBid,
              properties: Array.from(new Set([...p.properties, tile.id])),
            };
          }));

          setTiles(prev => prev.map(t => {
            if (t.id !== tile.id) return t;
            return { ...t, ownerId: winner.id, level: 1 };
          }));

          showToast('🔨 AUCTION CONCLUDED', `${winner.name} secured ${tile.name} for $${fmtK(finalBid)}!`, 'event');
          addArenaLog(winner.name, `won auction of ${tile.icon} ${tile.name} with bid of $${fmtK(finalBid)}`, 'event');
        } else {
          showToast('🔨 NO BIDS RECORDED', `${tile.name} stays vacant.`, 'info');
          addArenaLog('SYSTEM', `Auction ended without matching bids. Storefront ${tile.icon} ${tile.name} stays vacant.`, 'info');
        }

        setWaitingForAction(false);
        setLastInterrupted(null);
        setTimeout(() => advanceTurn(isDoubles), 1500);
      },
    });
    setLastInterrupted({ type: 'auction', args: [tile, skippedId, isDoubles] });
  };

  // ── DEBT RESOLUTION MODAL OVERLAYS ──
  const openInsolvencyModalOverlay = (human: Player, creditor: Player, debt: number, isDoubles: boolean) => {
    setInfoModal({
      isOpen: true,
      icon: '💸',
      title: '💸 TREASURY CRASH',
      sub: `Due: $${fmtK(debt)} to ${creditor.name}`,
      price: `$${fmtK(human.cash)}`,
      rent: `$${fmtK(debt)}`,
      owner: creditor.name,
      desc: `Your current liquid reserves are insufficient. Mortgage inventory assets, take a bank loan, or surrender entire business and declare bankruptcy immediately.`,
      actions: [], // handled inside the nested modal custom logic
    });
    setLastInterrupted({ type: 'insolvency', args: [human, creditor, debt, isDoubles] });
  };

  // ── AI INSOLVENT AUTO FINANCE ALGORITHM ──
  const aiFinancesUpToCover = (aiPlayer: Player, creditor: Player, debt: number, isDoubles: boolean) => {
    // 1. Try mortgaging holdings first
    const unmortgagedIdList = aiPlayer.properties.filter(id => {
      const tile = tiles.find(t => t.id === id);
      return tile && !tile.mortgaged;
    });

    let currentCash = aiPlayer.cash;
    const mortgageActions: number[] = [];

    for (const tid of unmortgagedIdList) {
      if (currentCash >= debt) break;
      const tile = tiles.find(t => t.id === tid)!;
      const raised = Math.floor(tile.price! * 0.5);
      currentCash += raised;
      mortgageActions.push(tid);
    }

    // Apply mortgages in state
    if (mortgageActions.length > 0) {
      setTiles(prev => prev.map(t => {
        if (mortgageActions.includes(t.id)) {
          return { ...t, mortgaged: true };
        }
        return t;
      }));
      setPlayers(prev => prev.map(p => {
        if (p.id !== aiPlayer.id) return p;
        const totalRaised = mortgageActions.reduce((s, id) => s + Math.floor(tiles.find(t => t.id === id)!.price! * 0.5), 0);
        return {
          ...p,
          cash: p.cash + totalRaised,
          properties: p.properties, // preserve properties although mortgaged
        };
      }));
      addArenaLog(aiPlayer.name, `mortgaged ${mortgageActions.length} holding(s) to raise bail funds.`, 'bad');
    }

    // 2. Try bank loan if still short
    if (currentCash < debt && (BANK_LOAN_MAX - aiPlayer.bankLoan) > 0) {
      const need = debt - currentCash;
      const allowance = BANK_LOAN_MAX - aiPlayer.bankLoan;
      const loan = Math.min(need, allowance);
      const penaltyVal = Math.floor(loan * BANK_LOAN_RATE);

      currentCash += (loan - penaltyVal);

      setPlayers(prev => prev.map(p => {
        if (p.id !== aiPlayer.id) return p;
        return {
          ...p,
          cash: p.cash + (loan - penaltyVal),
          bankLoan: p.bankLoan + loan,
        };
      }));
      addArenaLog(aiPlayer.name, `secured regulatory bank loan of $${fmtK(loan)} (paying $${fmtK(penaltyVal)} fine upfront) to bypass default.`, 'event');
    }

    // Final deduction check after raising funds
    if (currentCash >= debt) {
      setPlayers(prev => prev.map(p => {
        if (p.id === aiPlayer.id) {
          return { ...p, cash: currentCash - debt };
        }
        if (p.id === creditor.id) {
          return { ...p, cash: p.cash + debt };
        }
        return p;
      }));
      addArenaLog(aiPlayer.name, `successfully balanced ledger to cover $${fmtK(debt)} rent due.`, 'bad');
      setTimeout(() => advanceTurn(isDoubles), 1500);
    } else {
      // FULL BANKRUPTCY
      executeBankruptcy(aiPlayer, creditor);
    }
  };

  const executeBankruptcy = (debtor: Player, creditor: Player | null) => {
    setPlayers(prev => {
      const updated = prev.map(p => {
        if (p.id === debtor.id) {
          return { ...p, bankrupt: true, cash: 0, properties: [] };
        }
        if (creditor && p.id === creditor.id) {
          // Transfer entire estate
          return {
            ...p,
            properties: Array.from(new Set([...p.properties, ...debtor.properties])),
          };
        }
        return p;
      });

      // Clear dynamic tiles
      setTiles(prevTiles => prevTiles.map(t => {
        if (t.ownerId === debtor.id) {
          return {
            ...t,
            ownerId: creditor ? creditor.id : null,
            level: 1,
            mortgaged: false,
          };
        }
        return t;
      }));

      addArenaLog(debtor.name, `declared absolute BANKRUPTCY! ${creditor ? `Surrenders holdings to ${creditor.name}.` : 'Holdings transferred to database vaults.'}`, 'bad');
      showToast('💀 BOARD BANKRUPTCY', `${debtor.name} collapsed in default! Surrendered all remaining assets.`, 'bad');

      // Check win limits
      const aliveCount = updated.filter(x => !x.bankrupt);
      if (aliveCount.length <= 1) {
        const winner = aliveCount[0];
        addArenaLog('SYSTEM', `🏆 GAME OVER! Tycoon champion is declared: ${winner.name.toUpperCase()}!`, 'good');
        showToast('🏆 TYCOON CHAMPION', `Imperial victory declared for ${winner.name}!`, 'good');
        updateProfileWins(winner.id === 0 ? user.uid : 'SYSTEM_AI');
      }

      return updated;
    });

    // Schedule turn advancement to make sure the cycle continues
    setTimeout(() => {
      const currentPlayersState = playersRef.current;
      const aliveCount = currentPlayersState.filter(x => !x.bankrupt);
      if (aliveCount.length > 1) {
        advanceTurn(false);
      }
    }, 1500);
  };

  // ── BANK LOAN AND UPFRONT FEE ──
  const triggerLoanPopupOverlay = (suggestedAmount: number, onDone: (ok: boolean) => void) => {
    const human = players.find(p => p.id === 0)!;
    const remaining = BANK_LOAN_MAX - human.bankLoan;

    if (remaining <= 0) {
      showToast('🏦 LOAN AT CEILING', `You reached the supreme $${fmtK(BANK_LOAN_MAX)} bank liability limit.`, 'bad');
      onDone(false);
      return;
    }

    const limits = [30000, 75000, 150000, remaining].filter(x => x > 0 && x <= remaining);

    setInfoModal({
      isOpen: true,
      icon: '🏦',
      title: '🏦 BANK LIABILITY LOAN',
      sub: `Available headroom: $${fmtK(remaining)}`,
      price: `$${fmtK(human.cash)}`,
      rent: `Headroom: $${fmtK(remaining)}`,
      owner: 'FEDERAL BANK',
      desc: `Secure currency lines from the bank. 10% interest rate penalty is deducted upfront upon transaction, resulting in net leverage.`,
      actions: [
        ...limits.map(amt => ({
          label: `Borrow $${fmtK(amt)} (Net $${fmtK(Math.floor(amt * 0.9))})`,
          cls: 'buy',
          cb: () => {
            setInfoModal(prev => ({ ...prev, isOpen: false }));
            setPlayers(prev => prev.map(p => {
              if (p.id !== 0) return p;
              const upfrontFee = Math.floor(amt * BANK_LOAN_RATE);
              return {
                ...p,
                cash: p.cash + (amt - upfrontFee),
                bankLoan: p.bankLoan + amt,
              };
            }));
            showToast('🏦 LOAN GRANTED', `Debt increased by $${fmtK(amt)}. Net checks of $${fmtK(amt * 0.9)} acquired.`, 'event');
            addArenaLog(human.name, `acquired a bank leverage note of $${fmtK(amt)} (prepaid $${fmtK(amt * 0.1)} fee).`, 'event');
            onDone(true);
          },
        })),
        {
          label: 'ABORT REQUEST',
          cls: 'skip',
          cb: () => {
            setInfoModal(prev => ({ ...prev, isOpen: false }));
            onDone(false);
          },
        },
      ],
    });
  };

  const handleLoanRepayment = (amountVal: number) => {
    setPlayers(prev => prev.map(p => {
      if (p.id !== 0) return p;
      return {
        ...p,
        cash: p.cash - amountVal,
        bankLoan: p.bankLoan - amountVal,
      };
    }));
    showToast('🏦 LIABILITY REDUCED', `Amortized $${fmtK(amountVal)} bank loan. Outstanding: $${fmtK(players.find(x => x.id === 0)!.bankLoan - amountVal)}`, 'good');
    addArenaLog(players[0].name, `repaid $${fmtK(amountVal)} bank loan balance.`, 'good');
  };

  // ── TURN ENGINE ADVANCEMENT ──
  const startNextPlayerTurn = (nextIdx: number) => {
    setCurrentPlayerIdx(nextIdx);
    updateTurnHUDLocal(nextIdx);
  };

  const handleRandomEventClose = () => {
    setEventModal({ isOpen: false, event: null });
    setWaitingForAction(false);
    if (nextPlayerDelayedIdx !== null) {
      startNextPlayerTurn(nextPlayerDelayedIdx);
      setNextPlayerDelayedIdx(null);
    }
  };

  const handleChanceClose = () => {
    const doubleFlag = chanceModal.isDoubles;
    setChanceModal({ isOpen: false, card: null, player: null, isDoubles: false });
    advanceTurn(doubleFlag);
  };

  const advanceTurn = (isDoubles: boolean) => {
    setWaitingForAction(false);
    setLastInterrupted(null);

    const currentPlayers = playersRef.current;
    const currentIdx = currentPlayerIdxRef.current;

    // Doubles gets another roll
    if (isDoubles) {
      const activeCurrent = currentPlayers.find(p => p.id === currentIdx)!;
      if (!activeCurrent.inJail && !activeCurrent.bankrupt) {
        showToast('🎉 DOUBLE THROW!', 'Take another throw! Roll dice.', 'good');
        addArenaLog(activeCurrent.name, 'gets another turn due to matching doubles.', 'good');
        return;
      }
    }

    // Normal progression next index
    const aliveCount = currentPlayers.filter(p => !p.bankrupt).length;
    if (aliveCount <= 1) return;

    let nextIdx = currentIdx;
    let safeguard = 0;
    let isNewRound = false;
    while (safeguard < 12) {
      nextIdx = (nextIdx + 1) % currentPlayers.length;
      if (nextIdx === 0) {
        isNewRound = true;
      }
      if (!currentPlayers[nextIdx].bankrupt) {
        break;
      }
      safeguard++;
    }

    if (isNewRound) {
      const nextTurnCount = turn + 1;
      setTurn(nextTurnCount);

      if (randomEventQueue.length && nextTurnCount >= randomEventQueue[0]) {
        setRandomEventQueue(prevQueue => {
          const copy = [...prevQueue];
          copy.shift();
          return copy;
        });
        setWaitingForAction(true);
        setNextPlayerDelayedIdx(nextIdx);
        setTimeout(() => triggerRandomEventHUD(), 1500);
        return;
      }
    }

    startNextPlayerTurn(nextIdx);
  };

  const updateTurnHUDLocal = (idx: number) => {
    const current = players[idx];
    if (!current) return;
    const hud = document.getElementById('turn-player-name');
    if (hud) {
      hud.textContent = current.isAI ? `${current.name.toUpperCase()}'S TURN` : 'YOUR TURN';
    }
    const globalTurnHUD = document.getElementById('turn-num');
    if (globalTurnHUD) {
      globalTurnHUD.textContent = String(turn);
    }
  };

  const triggerRandomEventHUD = () => {
    const ev = RANDOM_EVENTS[Math.floor(Math.random() * RANDOM_EVENTS.length)];
    setEventModal({
      isOpen: true,
      event: ev,
    });
    
    // Apply immediate cash modifications
    setPlayers(prev => prev.map(p => {
      if (p.bankrupt) return p;
      let cash = p.cash;
      switch (ev.action) {
        case 'stimulus':
          cash += ev.amount!;
          break;
        case 'allLose':
          cash = Math.max(0, p.cash - ev.amount!);
          break;
        case 'perOwned':
          cash += p.properties.length * ev.amount!;
          break;
        case 'pctLose':
          cash = Math.max(0, p.cash - Math.floor(p.cash * ev.pct!));
          break;
        case 'perProp':
          cash = Math.max(0, p.cash - p.properties.length * ev.amount!);
          break;
        case 'perMono':
          const monopoliesCount = Array.from(new Set(p.properties.map(id => tiles.find(t => t.id === id)?.group).filter(Boolean)))
            .filter(g => ownsFullGroupLocal(p, g as string)).length;
          cash += monopoliesCount * ev.amount!;
          break;
      }
      return { ...p, cash };
    }));

    addArenaLog('MARKET ALERT', `⚡ ${ev.title} — ${ev.desc}`, 'event');
  };

  // ── CORE HOOKS FOR BOARD SELECTIONS ──
  const handleTileSelection = (tile: BoardTile, idxVal: number) => {
    // Look up live details sync
    const liveTile = tiles.find(t => t.id === tile.id) || tile;
    setSelectedTile(liveTile);
    setSelectedTileIdx(idxVal);
  };

  // ── TRADING OFFER TRIGGERS ──
  const handleBargainTradeOffer = (priceAsked: number) => {
    setPlayers(prev => prev.map(p => {
      if (p.id !== 0) return p;
      return {
        ...p,
        cash: p.cash - priceAsked,
        properties: Array.from(new Set([...p.properties, selectedTile!.id])),
      };
    }));

    setTiles(prev => prev.map(t => {
      if (t.id !== selectedTile!.id) return t;
      return { ...t, ownerId: 0, level: 1, mortgaged: false };
    }));

    showToast('🤝 DEAL CONFIRMED', `Acquired ${selectedTile!.name} from AI registry!`, 'good');
    addArenaLog('You', `successfully bargained and acquired ownership of ${selectedTile!.icon} ${selectedTile!.name} for $${fmtK(priceAsked)}.`, 'good');
    
    setInfoModal(prev => ({ ...prev, isOpen: false }));
    setWaitingForAction(false);
    setLastInterrupted(null);
  };

  // ── BUILDING CONSTRUCTION UPGRADES ──
  const handleBuildingConstruction = (tileId: number) => {
    const tile = tiles.find(t => t.id === tileId)!;
    const cost = GROUP_CONFIG[tile.group!].buildingCosts[(tile.level || 1)];

    setPlayers(prev => prev.map(p => {
      if (p.id !== 0) return p;
      return { ...p, cash: p.cash - cost };
    }));

    setTiles(prev => prev.map(t => {
      if (t.id !== tileId) return t;
      return { ...t, level: Math.min((t.level || 1) + 1, 4) };
    }));

    const upgradeLabel = GROUP_CONFIG[tile.group!].buildingNames[tile.level || 1];
    showToast('🏗️ ARCHITECTURE BUILT', `Constructed ${upgradeLabel} upgrades! Rents are now scaled.`, 'good');
    addArenaLog('You', `constructed and deployed ${upgradeLabel} expansion unit on ${tile.icon} ${tile.name} for $${fmtK(cost)}.`, 'good');
    
    // update detail panel
    setSelectedTile(prev => prev ? { ...prev, level: Math.min((prev.level || 1) + 1, 4) } : null);
  };

  // ── RE-ENGAGE AI AUTOPLAY TIMER WHEN RETURN TO GAME SCREEN ──
  useEffect(() => {
    if (activeScreen === 'game' && gameStarted && !rolling && !waitingForAction) {
      const activePlayerObj = players[currentPlayerIdx];
      if (activePlayerObj && activePlayerObj.isAI) {
        const timer = setTimeout(() => {
          initiateDiceRoll(activePlayerObj);
        }, 1300);
        return () => clearTimeout(timer);
      }
    }
  }, [activeScreen, gameStarted, currentPlayerIdx, rolling, waitingForAction, players]);

  // ── AI AUTO-DISMISS CHANCE MODAL TIMER ──
  useEffect(() => {
    if (chanceModal.isOpen && chanceModal.player?.isAI) {
      const timer = setTimeout(() => {
        handleChanceClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [chanceModal.isOpen, chanceModal.player?.id]);

  // ── AUTH CHECK STATE ──
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(authUser => {
      if (authUser) {
        setUser(authUser);
      } else {
        setUser(null);
      }
    });
    return () => unsub();
  }, []);

  return (
    <div className="relative text-[#ddeeff] min-h-screen flex flex-col font-sans select-none overflow-x-hidden bg-[#04080f]">
      <div id="toast-container" className="fixed top-[64px] right-3 flex flex-col gap-2 z-[9990] pointer-events-none w-[300px]" />
      
      {/* ── SECURITY SCANLINES GLITTER ── */}
      <div className="scanlines fixed inset-0 pointer-events-none z-[9999]" />
      <div className="grid-bg fixed inset-0 pointer-events-none z-0" />

      {/* ── SCREEN ROUTER ── */}
      {!user && !isGuest ? (
        <AuthScreen onAuthSuccess={handleAuthSuccess} onOpenCompliance={openComplianceTab} />
      ) : activeScreen === 'lobby' ? (
        <div className="lobby-container flex flex-col items-center justify-center p-4 min-h-screen relative z-10">
          <div className="logo-zone mb-6 text-center">
            <div className="logo-glow" />
            <h1 className="game-title text-[4rem] tracking-wider leading-none uppercase font-black font-sans text-white">
              ARSH<br /><span className="text-[#00d4ff]">CORP</span>
            </h1>
            <p className="game-sub tracking-widest text-[#00d4ff]/50 font-mono text-[10px] mt-2">CYBERPUNK ECONOMIC HUDS</p>
          </div>

          <div className="lobby-panels w-full max-w-[500px] flex flex-col gap-4">
            
            {/* Save manager slots */}
            <SaveManager
              userId={user?.uid || ''}
              isGuest={isGuest}
              players={players}
              tiles={tiles}
              currentPlayerIdx={currentPlayerIdx}
              turn={turn}
              randomEventQueue={randomEventQueue}
              jailFreeCards={jailFreeCards}
              arenaLog={arenaLog}
              lastInterrupted={lastInterrupted}
              onLoadGame={handleLoadGame}
              onSaveCompleted={() => showToast('💾 EMPIRE COMMITTED', 'Your progress slot was updated on Firestore.', 'good')}
            />

            {/* players headcount counts */}
            <div className="setup-panel bracket p-4 bg-black/45 border border-[rgba(0,212,255,0.25)] rounded">
              <div className="panel-label text-[10px] text-[#00d4ff] uppercase tracking-wider mb-2 font-mono">1. EMPIRE HEADCOUNT LIST (PLAYERS)</div>
              <div className="player-count-row flex gap-2">
                {[2, 3, 4, 5, 6].map(num => (
                  <button
                    key={num}
                    onClick={() => setNumPlayers(num)}
                    className={`count-btn flex-1 p-2 border ${
                      numPlayers === num ? 'border-cyan-400 bg-cyan-950/20 text-cyan-400' : 'border-slate-700 text-slate-400'
                    } font-mono rounded cursor-pointer transition min-h-[40px]`}
                  >
                    {num} PLAYERS
                  </button>
                ))}
              </div>
            </div>

            {/* capitals rookie offsets */}
            <div className="setup-panel bracket p-4 bg-black/45 border border-[rgba(0,212,255,0.25)] rounded">
              <div className="panel-label text-[10px] text-[#00d4ff] uppercase tracking-wider mb-2 font-mono">2. DIFFICULTY AND SEED FUNDING</div>
              <div className="diff-row grid grid-cols-3 gap-2">
                {(['easy', 'normal', 'hard'] as const).map(diff => {
                  const label = diff === 'easy' ? 'ROOKIE ($500K)' : diff === 'normal' ? 'EXECUTIVE ($300K)' : 'TYCOON ($150K)';
                  return (
                    <button
                      key={diff}
                      onClick={() => setDifficulty(diff)}
                      className={`p-2 border rounded font-mono text-[9px] font-bold min-h-[44px] cursor-pointer transition ${
                        difficulty === diff ? 'border-cyan-400 bg-cyan-950/20 text-cyan-400' : 'border-slate-700 text-slate-400'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* customized player names inputs */}
            <div className="setup-panel bracket p-4 bg-black/45 border border-[rgba(0,212,255,0.25)] rounded">
              <div className="panel-label text-[10px] text-[#00d4ff] uppercase tracking-wider mb-2 font-mono font-bold">3. TYCOONS REGISTRY NAMES</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {Array.from({ length: numPlayers }).map((_, idx) => (
                  <div key={idx} className="flex flex-col gap-0.5">
                    <span className="text-[8px] font-mono text-slate-500 uppercase">Tycoon Player {idx + 1}</span>
                    <input
                      type="text"
                      placeholder={idx === 0 ? 'Your Name' : `System Tycoon AI #${idx}`}
                      value={idx === 0 ? customNames[0] : (customNames[idx] || AI_NAMES[idx - 1] || '')}
                      onChange={(e) => {
                        const copy = [...customNames];
                        copy[idx] = e.target.value;
                        setCustomNames(copy);
                      }}
                      className="bg-black/40 border border-[rgba(0,212,255,0.15)] text-[12px] p-2 text-white rounded focus:outline-none focus:border-[#00d4ff]"
                    />
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={launchGame}
              className="launch-btn w-full p-3 font-mono font-bold text-[14px] bg-gradient-to-r from-cyan-950/20 to-purple-950/20 border border-cyan-400 text-cyan-400 hover:bg-cyan-400/10 cursor-pointer transition flex items-center justify-center gap-2 rounded min-h-[50px]"
            >
              LAUNCH EMPIRE ▶
            </button>
            
            {user && (
              <button
                onClick={handleSignOut}
                className="w-full text-slate-500 hover:text-red-500 font-mono text-[9px] uppercase tracking-widest text-center mt-2 cursor-pointer bg-transparent border-none"
              >
                Log Out Profile Account
              </button>
            )}

            {/* Lobby compliance footer */}
            <footer id="lobby-legal-footer" className="mt-8 pt-4 border-t border-[rgba(0,212,255,0.08)] text-center text-[9px] text-[#00d4ff]/40 font-mono tracking-widest flex flex-wrap justify-center gap-x-3 gap-y-2 uppercase w-full">
              <span className="text-cyan-400/60 font-bold">PG // 12+ RATED</span>
              <span className="text-slate-800">|</span>
              <button type="button" onClick={() => openComplianceTab('privacy')} className="hover:text-cyan-400 underline cursor-pointer bg-transparent border-none">PRIVACY POLICY</button>
              <span className="text-slate-800">|</span>
              <button type="button" onClick={() => openComplianceTab('terms')} className="hover:text-cyan-400 underline cursor-pointer bg-transparent border-none">TERMS &amp; CONDITIONS</button>
              <span className="text-slate-800">|</span>
              <button type="button" onClick={() => openComplianceTab('cookie')} className="hover:text-cyan-400 underline cursor-pointer bg-transparent border-none">COOKIE PRESETS</button>
              <span className="text-slate-800">|</span>
              <button type="button" onClick={() => openComplianceTab('sitemap')} className="hover:text-[#00d4ff] underline cursor-pointer bg-transparent border-none">SITEMAP MAP</button>
              <span className="text-slate-800">|</span>
              <button type="button" onClick={() => openComplianceTab('age')} className="hover:text-[#00d4ff] underline cursor-pointer bg-transparent border-none font-bold">AGE INDEX</button>
            </footer>
          </div>
        </div>
      ) : (
        <div className="flex flex-col h-screen overflow-hidden relative z-10">
          
          {/* ── TOP HUD NAVIGATION ── */}
          <header className="top-hud flex items-center justify-between w-full h-[52px] bg-black/95 border-b border-[rgba(0,212,255,0.15)] px-4 shrink-0">
            <span className="hud-brand font-sans font-black tracking-widest text-slate-300 text-[11px] uppercase">
              ARSHCORP <span className="text-[#00d4ff]">EMPIRE</span>
            </span>

            <div className="turn-indicator flex items-center gap-2 font-mono text-[11px]">
              <span className="turn-label text-[8px] text-slate-500 tracking-wider">TURN</span>
              <span id="turn-num" className="turn-num font-bold text-amber-400 text-[14px]">{turn}</span>
              <span id="turn-player-name" className="turn-player text-slate-300 uppercase tracking-wide">
                {players[currentPlayerIdx]?.isAI ? `${players[currentPlayerIdx].name.toUpperCase()}'s TURN` : 'YOUR TURN'}
              </span>
            </div>

            <div className="hud-actions flex gap-2">
              <button onClick={() => setActiveScreen('lobby')} className="hud-btn w-8 h-8 rounded border border-slate-700 bg-transparent flex items-center justify-center hover:border-cyan-400 transition cursor-pointer text-slate-300">💾</button>
              <button onClick={() => setActiveScreen('profile')} className="hud-btn w-8 h-8 rounded border border-slate-700 bg-transparent flex items-center justify-center hover:border-cyan-400 transition cursor-pointer text-slate-300">👤</button>
              <button onClick={handleSignOut} className="hud-btn w-8 h-8 rounded border border-slate-700 bg-transparent flex items-center justify-center hover:border-red-500 transition cursor-pointer text-slate-300">⏻</button>
            </div>
          </header>

          {/* ── INTERACTIVE MATRIX RESPONSIVE ── */}
          <main className="game-layout flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-[220px_1fr_220px] max-w-full">
            
            {/* Left Column Dashboard */}
            <div className={`md:flex flex-col ${mobilePanel === 'dashboard' ? 'flex fixed inset-y-12 left-0 right-0 z-50 bg-[#080d16]' : 'hidden'}`}>
              <SidebarLeft
                humanPlayer={players.find(p => p.id === 0) || players[0]}
                players={players}
                tiles={tiles}
                onTileSelect={handleTileSelection}
                onPlayerSelect={(idx) => setInspectedPlayerId(idx)}
                onOpenMortgageManager={() => setMortgageModalOpen(true)}
              />
            </div>

            {/* Center Column grid board */}
            <div className={`flex flex-col items-center justify-start p-2 gap-3 overflow-y-auto ${mobilePanel === 'board' ? 'flex' : 'hidden md:flex'}`}>
              
              {/* Relative wrapper holding both Board and the Central Overlay Card */}
              <div className="relative w-full aspect-square max-w-full">
                <Board
                  players={players}
                  tiles={tiles}
                  currentPlayerIdx={currentPlayerIdx}
                  onTileClick={handleTileSelection}
                  activeTileId={selectedTileIdx}
                />

                {/* Selected Tile Inspector - Overlayed inside the board's empty center region */}
                {selectedTile && (
                  <div className="absolute inset-[11.2%] z-20 overflow-hidden flex flex-col pointer-events-auto bg-[#080d16]/98 border border-[rgba(0,212,255,0.25)] rounded-md shadow-2xl">
                    <TileDetail
                      tile={selectedTile}
                      idx={selectedTileIdx!}
                      players={players}
                      onClose={() => {
                        setSelectedTile(null);
                        setSelectedTileIdx(null);
                      }}
                      onBuild={handleBuildingConstruction}
                      onSellModal={(tid) => showToast('💰 MANUAL AUCTION', 'To list, define initial reserve bid higher than purchase cost.', 'event')}
                      onMortgageManager={() => setMortgageModalOpen(true)}
                      onOfferModal={openOfferToBuyModal}
                    />
                  </div>
                )}
              </div>

              {/* Central rolls mechanics */}
              <div className="dice-container flex items-center gap-3 p-3 bg-black/45 border border-[rgba(0,212,255,0.15)] rounded-lg min-w-[280px]" style={{ zIndex: 10 }}>
                <div className="flex gap-2">
                  <span className="text-[20px] font-mono p-1 bg-black/60 rounded border border-[rgba(0,212,255,0.08)] leading-none select-none">{FACES[dice[0] - 1]}</span>
                  <span className="text-[20px] font-mono p-1 bg-black/60 rounded border border-[rgba(0,212,255,0.08)] leading-none select-none">{FACES[dice[1] - 1]}</span>
                </div>
                <div className="flex-1 flex flex-col justify-center min-w-0">
                  <div className="text-[10px] text-slate-400 font-mono tracking-wider">THROW DECISION KEY:</div>
                  <div id="roll-result" className="text-[12px] text-amber-400 font-mono font-bold truncate">
                    {rolling ? 'ROLLING SIMULATION...' : `SUM ACCRUED: ${dice[0] + dice[1]}`}
                  </div>
                </div>
                <button
                  type="button"
                  id="roll-btn"
                  onClick={rollDice}
                  disabled={rolling || waitingForAction || players[currentPlayerIdx]?.isAI}
                  className="px-4 py-2 text-[11px] font-mono font-bold bg-cyan-950/20 border border-[#00d4ff] text-[#00d4ff] rounded hover:bg-[#00d4ff]/10 disabled:opacity-40 select-none transition cursor-pointer min-h-[38px]"
                >
                  {rolling ? 'ROLLING' : 'ROLL DICE'}
                </button>
              </div>

              {!selectedTile && (
                <div className="text-[11px] font-mono text-slate-500 italic py-2 text-center">
                  🔍 Click on any segment item on the grid to inspect details and properties.
                </div>
              )}
            </div>

            {/* Right Column Dashboard */}
            <div className={`md:flex flex-col ${mobilePanel === 'arena' ? 'flex fixed inset-y-12 left-0 right-0 z-50 bg-[#080d16]' : 'hidden'}`}>
              <SidebarRight
                players={players}
                tiles={tiles}
                arenaLog={arenaLog}
                onPlayerSelect={(idx) => setInspectedPlayerId(idx)}
              />
            </div>

          </main>

          {/* ── MOBILE NAVS OVERLAYS BAR ── */}
          <nav className="bottom-nav border-t border-[rgba(0,212,255,0.12)] bg-[#050a0f] flex md:hidden items-center justify-around h-[56px] select-none text-slate-400">
            <button
               onClick={() => setMobilePanel('board')}
               className={`flex flex-col items-center bg-transparent border-none ${mobilePanel === 'board' ? 'text-cyan-400' : 'text-slate-400'}`}
            >
              <span className="text-[16px]">🎯</span>
              <span className="text-[9px] font-mono uppercase tracking-wider mt-0.5">BOARD</span>
            </button>
            <button
               onClick={() => setMobilePanel('dashboard')}
               className={`flex flex-col items-center bg-transparent border-none ${mobilePanel === 'dashboard' ? 'text-cyan-400' : 'text-slate-400'}`}
            >
              <span className="text-[16px]">📊</span>
              <span className="text-[9px] font-mono uppercase tracking-wider mt-0.5">EMPIRE</span>
            </button>
            <button
               onClick={() => setMobilePanel('arena')}
               className={`flex flex-col items-center bg-transparent border-none ${mobilePanel === 'arena' ? 'text-cyan-400' : 'text-slate-400'}`}
            >
              <span className="text-[16px]">⚡</span>
              <span className="text-[9px] font-mono uppercase tracking-wider mt-0.5">ARENA</span>
            </button>
          </nav>

          {/* ── RESUME LOCK OVERLAY BAR ── */}
          {lastInterrupted && (
            <div id="resume-bar" style={{ display: 'flex' }} className="fixed bottom-0 inset-x-0 h-11 bg-amber-950/20 border-t border-amber-500 font-mono text-[10px] text-amber-400 p-2 flex items-center justify-between z-[9998] backdrop-blur-md">
              <span>⚠️ ACTION PENDING — DECISION HUD LOCKED</span>
              <div className="flex gap-2">
                <button
                   onClick={resumeLastAction}
                   className="px-2 py-1 bg-amber-500/10 border border-amber-400 text-amber-400 rounded text-[9px] hover:bg-amber-500/20 cursor-pointer min-h-[30px]"
                >
                  RESUME Action
                </button>
                <button
                   onClick={discardAction}
                   className="px-2 py-1 bg-red-950/20 border border-red-500 text-red-500 rounded text-[9px] hover:bg-red-500/10 cursor-pointer min-h-[30px]"
                >
                  FORFEIT & SKIP
                </button>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ── PROFILE SCREEN ── */}
      {activeScreen === 'profile' && (
        <div className="screen active z-40 bg-[#04080f]/95" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div className="profile-container w-full max-w-[500px]">
            <div className="flex items-center justify-between mb-4 border-b border-[rgba(0,212,255,0.15)] pb-3">
              <h2 className="profile-title text-cyan-400 font-sans font-black text-[18px]">TYCOON COSMETIC PROFILE</h2>
              <button onClick={() => setActiveScreen('game')} className="back-btn text-cyan-400 underline font-mono text-[10px] border border-cyan-400/30 px-3.5 py-1.5 rounded cursor-pointer hover:bg-cyan-500/10 transition">← CLOSE HUD</button>
            </div>
            
            <div className="profile-card bracket bg-[#080d16] p-6 border border-cyan-500/30 flex flex-col items-center gap-4">
              <div className="profile-avatar text-[72px]">🧑</div>
              <div className="profile-fields w-full flex flex-col gap-3 font-mono text-[11px] uppercase text-[#00d4ff]">
                
                <div className="flex flex-col gap-1">
                  <label>Tycoon Badge Name</label>
                  <input
                    type="text"
                    value={customNames[0]}
                    onChange={(e) => {
                      const copy = [...customNames];
                      copy[0] = e.target.value;
                      setCustomNames(copy);
                    }}
                    className="bg-black/35 border border-cyan-500/20 text-[12px] p-2 text-white rounded focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label>Business Class Spec</label>
                  <select className="bg-black/35 border border-cyan-500/20 text-[12px] p-2 text-white rounded focus:outline-none">
                    <option>Venture Capitalist</option>
                    <option>Real Estate Baron</option>
                    <option>Tech Founder</option>
                    <option>Global Arbitrageur</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label>Imperial Gender</label>
                  <select className="bg-black/35 border border-cyan-500/20 text-[12px] p-2 text-white rounded focus:outline-none">
                    <option>Non-binary</option>
                    <option>Male</option>
                    <option>Female</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label>Registry Civil Status</label>
                  <select className="bg-black/35 border border-cyan-500/20 text-[12px] p-2 text-white rounded focus:outline-none">
                    <option>Single Player</option>
                    <option>Entity Alliance</option>
                  </select>
                </div>

                <div className="pf-note text-[9px] text-[#ffb700] bg-orange-950/20 border border-orange-500/30 rounded p-2 tracking-wide uppercase leading-normal">
                  ℹ️ Profile identifiers are cosmetic only — no affect on game rules or rents.
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setActiveScreen('game');
                    showToast('✅ PROFILE SYNCD', 'Cosmetic details synchronized.', 'good');
                  }}
                  className="launch-btn w-full p-2 bg-[#00d4ff]/10 border border-[#00d4ff] text-[#00d4ff] font-bold rounded cursor-pointer uppercase min-h-[42px]"
                >
                  SAVE HUD PROFILE
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── ALL SYSTEM DIALOG OVERLAYS ── */}

      {/* 1. Generic modal triggers (VACANT BUY OPTIONS, JAILS, ETC) */}
      <InfoModal
        isOpen={infoModal.isOpen}
        icon={infoModal.icon}
        title={infoModal.title}
        sub={infoModal.sub}
        price={infoModal.price}
        rent={infoModal.rent}
        owner={infoModal.owner}
        desc={infoModal.desc}
        actions={infoModal.actions}
        onOutsideClick={() => {
          setInfoModal(prev => ({ ...prev, isOpen: false }));
          showToast('🔒 DECISION LOCKED', 'Incomplete transaction. Re-open via Resume Bar if needed.', 'event');
        }}
      />

      {/* 2. Public auction modal against Ai */}
      <AuctionModal
        isOpen={auctionModal.isOpen}
        tile={auctionModal.tile}
        players={players}
        skippedPlayerId={auctionModal.skippedPlayerId}
        onAddArenaLog={addArenaLog}
        onBankLoanRequest={triggerLoanPopupOverlay}
        onFinalize={(winner, bid) => {
          setTimeout(() => {
            setAuctionModal(prev => ({ ...prev, isOpen: false }));
            if (auctionModal.finalizeCb) {
              auctionModal.finalizeCb(winner, bid);
            }
          }, 0);
        }}
      />

      {/* 3. Mortgage panels overlays */}
      <MortgageManagerModal
        isOpen={mortgageModalOpen}
        player={players.find(p => p.id === 0) || players[0]}
        tiles={tiles}
        onClose={() => setMortgageModalOpen(false)}
        onMortgage={(tid) => handleToggleMortgage(tid, true)}
        onUnmortgage={(tid) => handleToggleMortgage(tid, false)}
        onRepayLoan={handleLoanRepayment}
      />

      {/* 4. Spontaneous/Pre-scheduled Event Modal */}
      <RandomEventModal
        isOpen={eventModal.isOpen}
        event={eventModal.event}
        onClose={handleRandomEventClose}
      />

      {/* Spontaneous Chance Card Modal popup */}
      <ChanceCardModal
        isOpen={chanceModal.isOpen}
        card={chanceModal.card}
        player={chanceModal.player}
        onClose={handleChanceClose}
      />

      {/* 5. Player Status Inspector Modal */}
      {inspectedPlayerId !== null && players[inspectedPlayerId] && (
        <div className="modal-overlay open select-none" onClick={() => setInspectedPlayerId(null)}>
          <div className="ps-box bracket bg-[#080d16]/95 border border-[rgba(0,212,255,0.4)] relative p-5 max-w-[480px]" onClick={e => e.stopPropagation()}>
            <div className="ps-header flex items-center justify-between border-b border-[rgba(0,212,255,0.15)] pb-2 mb-3">
              <div className="flex items-center gap-3">
                <div className="ps-token w-10 h-10 rounded-full flex items-center justify-center text-[18px]" style={{ backgroundColor: players[inspectedPlayerId].color }}>
                  {players[inspectedPlayerId].emoji}
                </div>
                <div>
                  <h3 className="ps-name font-sans font-black text-[13px] text-white uppercase">{players[inspectedPlayerId].name}</h3>
                  <p className="ps-sub text-[9px] text-[#00d4ff] font-mono tracking-wider">{players[inspectedPlayerId].isAI ? 'SYSTEM AI TYCOON' : 'HUMAN TYCOON'}</p>
                </div>
              </div>
              <button onClick={() => setInspectedPlayerId(null)} className="td-close w-7 h-7 rounded border border-slate-700 bg-transparent flex items-center justify-center font-mono hover:text-red-500 cursor-pointer">✕</button>
            </div>

            <div className="ps-stats-grid grid grid-cols-3 gap-2 text-center text-slate-100 mb-3">
              <div className="ps-stat bg-black/35 p-2 rounded border border-[rgba(0,212,255,0.06)]">
                <div className="ps-sv text-[11px] font-mono text-[#00ff88] font-bold">${fmtK(players[inspectedPlayerId].cash)}</div>
                <div className="ps-sl text-[7px] text-slate-400">CASH</div>
              </div>
              <div className="ps-stat bg-black/35 p-2 rounded border border-[rgba(0,212,255,0.06)]">
                <div className="ps-sv text-[11px] font-mono text-[#ff3366] font-bold">-${fmtK(players[inspectedPlayerId].bankLoan)}</div>
                <div className="ps-sl text-[7px] text-slate-400">LIABILITY</div>
              </div>
              <div className="ps-stat bg-black/35 p-2 rounded border border-[rgba(0,212,255,0.06)]">
                <div className="ps-sv text-[11px] font-mono text-[#ffb700] font-bold">${fmtK(getNetWorthLocal(players[inspectedPlayerId]))}</div>
                <div className="ps-sl text-[7px] text-slate-400">NET WORTH</div>
              </div>
            </div>

            <div className="ps-section-label text-[9px] font-mono text-cyan-400 uppercase tracking-widest pb-1 border-b border-cyan-500/20 mb-2">
              ♛ PROPERTY HOLDINGS
            </div>

            <div className="max-h-[160px] overflow-y-auto flex flex-col gap-1.5 pr-1">
              {players[inspectedPlayerId].properties.length === 0 ? (
                <div className="text-[10px] text-center font-mono py-4 text-slate-500 h-[100%] italic">
                  No registered real estate inventory holding units.
                </div>
              ) : (
                Array.from(new Set(players[inspectedPlayerId].properties)).map(id => {
                  const t = tiles.find(u => u.id === id);
                  if (!t) return null;
                  return (
                    <div key={id} className="ps-prop-row flex items-center justify-between p-1.5 bg-black/25 rounded text-[10px] text-slate-200">
                      <div className="flex items-center gap-1.5">
                        <span>{t.icon}</span>
                        <span className="font-semibold text-white">{t.name}</span>
                        {t.mortgaged && <span className="bg-red-950 text-[#ff3366] text-[8px] px-1 rounded line scale-90 border border-red-500">MORT</span>}
                      </div>
                      <div className="flex gap-2">
                        <span className="text-[#00ff88] font-mono">${fmtK(getTileRent(t))}/v</span>
                        {inspectedPlayerId !== 0 && (
                          <button
                            onClick={() => {
                              setInspectedPlayerId(null);
                              openOfferToBuyModal(t.id);
                            }}
                            className="bg-cyan-950/20 border border-cyan-400 text-cyan-400 px-1.5 py-0.5 rounded text-[8px] cursor-pointer"
                          >
                            OFFER
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── CENTRAL COMPLIANCE REGISTRY OVERLAYS ── */}
      <ComplianceModal
        isOpen={complianceModal.isOpen}
        initialTab={complianceModal.tab}
        onClose={() => setComplianceModal(prev => ({ ...prev, isOpen: false }))}
      />

      {/* ── PERSISTENT COOKIE BANNER OVERLAY ── */}
      <CookieBanner onOpenCompliance={openComplianceTab} />

    </div>
  );

  function getNetWorthLocal(p: Player) {
    const pv = p.properties.reduce((acc, tid) => {
      const t = tiles.find(tile => tile.id === tid);
      if (!t) return acc;
      return acc + (t.mortgaged ? Math.floor(t.price! * 0.5) : (t.price || 0) * (t.level || 1));
    }, 0);
    return p.cash + pv - p.bankLoan;
  }

  function resumeLastAction() {
    hideResumeBar();
    if (!lastInterrupted) {
      setWaitingForAction(false);
      return;
    }
    const { type, args } = lastInterrupted;
    if (type === 'buy') {
      openVacantPurchaseOverlay(args[1], args[0], args[2]);
    } else if (type === 'build') {
      showToast('🏗️ UPGRADE PROGRESSING', 'Upgrade construction is managed through selected tile menus.', 'info');
    } else if (type === 'jail') {
      openJailChoicesModal(args[0], args[1], args[2]);
    } else if (type === 'insolvency') {
      openInsolvencyModalOverlay(args[0], args[1], args[2], args[3]);
    } else {
      setWaitingForAction(false);
    }
  }

  function discardAction() {
    hideResumeBar();
    setLastInterrupted(null);
    setWaitingForAction(false);
    showToast('👁️ ACTION BYPASSED', 'Forfeited incomplete modal action.', 'event');
    advanceTurn(false);
  }

  function resumeOfferFlow(tileId: number) {
    openOfferToBuyModal(tileId);
  }

  function openOfferToBuyModal(tileId: number) {
    const tile = tiles.find(t => t.id === tileId);
    if (!tile || tile.ownerId === null || tile.ownerId === undefined) return;
    const seller = players.find(p => p.id === tile.ownerId)!;
    const buyer = players.find(p => p.id === 0)!;
    const fairPrice = tile.price! * (tile.level || 1);
    const minAccept = Math.floor(tile.price! * 0.85);

    const checkLoan = BANK_LOAN_MAX - buyer.bankLoan > 0;

    const offerBids = [minAccept, Math.floor(fairPrice * 0.9), fairPrice, Math.floor(fairPrice * 1.1)].filter(v => v > 0);

    setInfoModal({
      isOpen: true,
      icon: tile.icon,
      title: `BUY ${tile.name.toUpperCase()}`,
      sub: `Proposing buy offer directly to: ${seller.name}`,
      price: `$${fmtK(fairPrice)}`,
      rent: `$${fmtK(getTileRent(tile))}`,
      owner: seller.name,
      desc: `Make a direct commercial purchase offer for ${tile.name}. Seller may accept, reject, or prompt counter-price. Min acceptable consider value is $${fmtK(minAccept)}.`,
      actions: [
        ...offerBids.map((amt, idx) => ({
          label: idx < 1 ? `LOWBALL $${fmtK(amt)}` : idx < 2 ? `FAIR $${fmtK(amt)}` : idx < 3 ? `FAIR VALUE $${fmtK(amt)}` : `PREMIUM $${fmtK(amt)}`,
          cls: idx < 1 ? 'skip' : idx < 3 ? 'auction' : 'buy',
          cb: () => {
            setInfoModal(prev => ({ ...prev, isOpen: false }));
            if (buyer.cash < amt) {
              showToast('❌ FUNDS EXHAUSTED', 'You do not have enough cash to carry out this purchase.', 'bad');
              return;
            }
            // Bank abruption check
            if (Math.random() < 0.12) {
              showToast('⛔ DEALS BLOCKED', 'The central bank has blocked this contract transaction due to regulatory review!', 'bad');
              addArenaLog('BANK', `blocked deal for ${tile.icon} ${tile.name} between You and ${seller.name} due to compliance check.`, 'bad');
              return;
            }

            // AI seller decision calculations
            const ratio = amt / fairPrice;
            if (ratio >= 0.95 || Math.random() < ratio * 0.6) {
              // Complete deal
              setPlayers(prev => prev.map(p => {
                if (p.id === 0) {
                  return { ...p, cash: p.cash - amt, properties: Array.from(new Set([...p.properties, tile.id])) };
                }
                if (p.id === seller.id) {
                  return { ...p, cash: p.cash + amt, properties: p.properties.filter(id => id !== tile.id) };
                }
                return p;
              }));
              setTiles(prev => prev.map(t => {
                if (t.id === tile.id) {
                  return { ...t, ownerId: 0, level: 1, mortgaged: false };
                }
                return t;
              }));
              showToast('🤝 ACQUIRED SUCCESS', `Acquired storefront ${tile.name} for $${fmtK(amt)}!`, 'good');
              addArenaLog('You', `acquired ${tile.icon} ${tile.name} from ${seller.name} for $${fmtK(amt)}.`, 'good');
            } else {
              // Counter-bargain at 15% high
              const asks = Math.floor(fairPrice * (0.95 + Math.random() * 0.2));
              showAIAskingCounterModal(buyer, seller, tile, amt, asks);
            }
          },
        })),
        {
          label: 'ABORT',
          cls: 'skip',
          cb: () => {
            setInfoModal(prev => ({ ...prev, isOpen: false }));
          },
        },
      ],
    });
  };

  function showAIAskingCounterModal(buyer: Player, seller: Player, tile: BoardTile, proposed: number, demands: number) {
    const hasLoan = BANK_LOAN_MAX - buyer.bankLoan > 0;
    const canAfford = buyer.cash >= demands;

    setInfoModal({
      isOpen: true,
      icon: tile.icon,
      title: '🤝 SELLER COUNTER-BARGAIN',
      sub: `${seller.name} demands more for ${tile.name}`,
      price: `$${fmtK(demands)}`,
      rent: `$${fmtK(proposed)}`,
      owner: seller.name,
      desc: `${seller.name} rejected your proposed $${fmtK(proposed)} and counter-demands $${fmtK(demands)}. Accept, negotiate midpoint, or close proposal.`,
      actions: [
        ...(canAfford ? [{
          label: `ACCEPT COUNTER $${fmtK(demands)}`,
          cls: 'buy',
          cb: () => {
            setInfoModal(prev => ({ ...prev, isOpen: false }));
            handleBargainTradeOffer(demands);
          },
        }] : []),
        {
          label: `MIDPOINT $${fmtK(Math.floor((proposed + demands) / 2))}`,
          cls: 'auction',
          cb: () => {
            setInfoModal(prev => ({ ...prev, isOpen: false }));
            const mid = Math.floor((proposed + demands) / 2);
            if (buyer.cash < mid) {
              showToast('❌ SHORT OF CASH', 'Midpoint exceeds your current available funding.', 'bad');
              return;
            }
            // AI accepts midpoint with highly realistic probability
            if (mid >= demands * 0.9 || Math.random() > 0.4) {
              handleBargainTradeOffer(mid);
            } else {
              showToast('❌ REJECTED MIDPOINT', `${seller.name} rejected midpoint offer of $${fmtK(mid)}!`, 'bad');
              addArenaLog(seller.name, `rejected midpoint counter-offer for ${tile.icon} ${tile.name}.`, 'bad');
            }
          },
        },
        {
          label: 'DISMISS PROPOSAL',
          cls: 'skip',
          cb: () => {
            setInfoModal(prev => ({ ...prev, isOpen: false }));
          },
        },
      ],
    });
  }

  function hideResumeBar() {
    const b = document.getElementById('resume-bar');
    if (b) b.style.display = 'none';
  }
}
