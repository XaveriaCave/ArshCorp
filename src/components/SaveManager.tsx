/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, doc, setDoc, getDocs, deleteDoc, query, orderBy } from 'firebase/firestore';
import { Player, BoardTile, GameSave } from '../types';
import { fmtK } from '../utils';

interface SaveManagerProps {
  userId: string;
  isGuest: boolean;
  players: Player[];
  tiles: BoardTile[];
  currentPlayerIdx: number;
  turn: number;
  randomEventQueue: number[];
  jailFreeCards: { [playerId: number]: number };
  arenaLog: any[];
  lastInterrupted: any;
  onLoadGame: (save: GameSave) => void;
  onSaveCompleted: () => void;
}

export const SaveManager: React.FC<SaveManagerProps> = ({
  userId,
  isGuest,
  players,
  tiles,
  currentPlayerIdx,
  turn,
  randomEventQueue,
  jailFreeCards,
  arenaLog,
  lastInterrupted,
  onLoadGame,
  onSaveCompleted,
}) => {
  const [saves, setSaves] = useState<GameSave[]>([]);
  const [slotName, setSlotName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  const fetchSaves = async () => {
    if (isGuest || !userId) return;
    setLoading(true);
    setErrorLocal(null);
    const savesPath = `users/${userId}/saves`;
    try {
      const q = query(collection(db, savesPath), orderBy('updatedAt', 'desc'));
      const snapshot = await getDocs(q);
      const loaded: GameSave[] = [];
      snapshot.forEach(docSnap => {
        loaded.push(docSnap.data() as GameSave);
      });
      setSaves(loaded);
    } catch (err) {
      console.error('Fetch Saves Error: ', err);
      try {
        handleFirestoreError(err, OperationType.GET, savesPath);
      } catch (logErr: any) {
        setErrorLocal('Offline / Failed to fetch state saves.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCurrent = async (slotId: string, customName?: string) => {
    if (isGuest || !userId) return;
    setLoading(true);
    setErrorLocal(null);

    const sName = customName || slotName || `Empire Save #${saves.length + 1}`;
    const savesPath = `users/${userId}/saves`;
    const docRef = doc(db, savesPath, slotId);

    // Prepare serialization of board tiles
    const tilesState = tiles.map(t => ({
      id: t.id,
      ownerId: t.ownerId !== undefined ? t.ownerId : null,
      level: t.level || 1,
      mortgaged: t.mortgaged || false,
    }));

    const saveObj: GameSave = {
      saveId: slotId,
      userId: userId,
      name: sName,
      turn: turn,
      players: players,
      currentPlayerIdx: currentPlayerIdx,
      tiles: tilesState,
      randomEventQueue: randomEventQueue,
      jailFreeCards: jailFreeCards,
      arenaLog: arenaLog,
      lastInterrupted: lastInterrupted,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await setDoc(docRef, saveObj);
      setSlotName('');
      onSaveCompleted();
      await fetchSaves();
    } catch (err) {
      console.error('Save Error: ', err);
      try {
        handleFirestoreError(err, OperationType.WRITE, `${savesPath}/${slotId}`);
      } catch (logErr: any) {
        setErrorLocal('Failed to write save slot.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSave = async (slotId: string) => {
    if (isGuest || !userId) return;
    setLoading(true);
    setErrorLocal(null);
    const savePath = `users/${userId}/saves/${slotId}`;
    try {
      await deleteDoc(doc(db, `users/${userId}/saves`, slotId));
      await fetchSaves();
    } catch (err) {
      console.error('Delete Save Error: ', err);
      try {
        handleFirestoreError(err, OperationType.DELETE, savePath);
      } catch (logErr: any) {
        setErrorLocal('Failed to delete save slot.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSaves();
  }, [userId, isGuest]);

  if (isGuest) {
    return (
      <div className="bg-[#080d16] border border-orange-500/20 rounded p-4 text-[#ffb700] flex flex-col gap-2 font-mono text-[11px] leading-relaxed">
        <span className="font-bold text-[12px]">⚠️ GUEST OFFLINE MODE</span>
        <span>Game state persistence has been initialized client-side. To enable persistent slots and sync boards, register/sign-in above.</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-4 bg-[#080d16]/95 border border-[rgba(0,212,255,0.25)] rounded-lg text-slate-100 select-none bracket">
      <div className="flex items-center justify-between border-b border-[rgba(0,212,255,0.15)] pb-1.5 mb-1">
        <span className="font-mono text-[11px] text-[#00d4ff] uppercase tracking-wider font-bold">💾 CLOUD SAVES MANAGER</span>
        <button onClick={fetchSaves} className="text-[10px] text-slate-400 font-mono underline hover:text-[#00d4ff] bg-transparent border-none cursor-pointer">REFRESH</button>
      </div>

      {errorLocal && (
        <div className="p-2 text-center text-red-500 font-mono text-[10px] bg-red-950/15 border border-red-500/30 rounded">
          {errorLocal}
        </div>
      )}

      {/* New Save Slot Form */}
      <div className="flex gap-2">
        <input
          type="text"
          value={slotName}
          onChange={(e) => setSlotName(e.target.value)}
          placeholder="Label your save..."
          className="bg-black/35 border border-[rgba(0,212,255,0.15)] rounded p-2 text-[12px] flex-1 text-white focus:outline-none focus:border-[#00d4ff]"
        />
        <button
          onClick={() => handleSaveCurrent(`slot_${Date.now()}`)}
          disabled={loading}
          className="px-3 bg-gradient-to-r from-cyan-950/15 to-purple-950/15 border border-[#00d4ff] text-[#00d4ff] rounded font-mono text-[10px] font-bold hover:bg-[#00d4ff]/10 transition cursor-pointer min-h-[34px] disabled:opacity-40"
        >
          CREATE
        </button>
      </div>

      {/* Save Slots List */}
      <div className="flex flex-col gap-2 max-h-[160px] overflow-y-auto pr-1">
        {loading && saves.length === 0 ? (
          <div className="text-[10px] text-center font-mono py-4 text-slate-500 animate-pulse">
            RETRIEVING SAVES FROM FIRESTORE...
          </div>
        ) : saves.length === 0 ? (
          <div className="text-[10px] text-center text-slate-500 font-mono italic py-4">
            No saved files compiled yet.
          </div>
        ) : (
          saves.map(save => (
            <div
              key={save.saveId}
              className="bg-black/20 border border-[rgba(0,212,255,0.08)] rounded p-2 flex items-center justify-between gap-3"
            >
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] font-semibold text-white truncate text-ellipsis">{save.name}</span>
                <span className="text-[9px] text-[#ffb700] font-mono mt-0.5">
                  Turn {save.turn} · {save.players.filter(p => !p.bankrupt).length} Active · {new Date(save.updatedAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => onLoadGame(save)}
                  className="px-2 py-1 bg-green-950/20 border border-[#00ff88] text-[#00ff88] rounded font-mono text-[9px] hover:bg-green-500/10 cursor-pointer"
                >
                  LOAD
                </button>
                <button
                  onClick={() => handleSaveCurrent(save.saveId, save.name)}
                  className="px-2 py-1 bg-cyan-950/20 border border-[#00d4ff] text-[#00d4ff] rounded font-mono text-[9px] hover:bg-cyan-500/10 cursor-pointer"
                  title="Overwrite this slot with your current game"
                >
                  SAVE
                </button>
                <button
                  onClick={() => handleDeleteSave(save.saveId)}
                  className="px-1.5 py-1 text-slate-500 hover:text-red-500 cursor-pointer"
                  title="Delete slot"
                >
                  ✕
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
