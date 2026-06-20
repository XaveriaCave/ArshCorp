/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { auth, db } from '../firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

interface AuthScreenProps {
  onAuthSuccess: (user: any, isGuest: boolean) => void;
  onOpenCompliance?: (tab: 'privacy' | 'terms' | 'sitemap' | 'cookie' | 'age') => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthSuccess, onOpenCompliance }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      if (isSignUp) {
        if (!displayName) {
          setErrorMsg('Display name is required for registration.');
          setLoading(false);
          return;
        }
        // Register user
        const res = await createUserWithEmailAndPassword(auth, email, password);
        const userObj = res.user;

        // Create document in Firestore users/
        await setDoc(doc(db, 'users', userObj.uid), {
          uid: userObj.uid,
          displayName: displayName,
          email: email,
          profession: 'Investor',
          gender: 'Prefer not to say',
          status: 'Single',
          assets: 'None yet',
          elo: 1000,
          gamesPlayed: 0,
          wins: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        
        onAuthSuccess(userObj, false);
      } else {
        // Sign in
        const res = await signInWithEmailAndPassword(auth, email, password);
        onAuthSuccess(res.user, false);
      }
    } catch (error: any) {
      console.error('Email Auth Error: ', error);
      setErrorMsg(error.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    setErrorMsg(null);
    const provider = new GoogleAuthProvider();

    try {
      const res = await signInWithPopup(auth, provider);
      const userObj = res.user;

      // Check if user document already exists, if not create one
      const docRef = doc(db, 'users', userObj.uid);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        await setDoc(docRef, {
          uid: userObj.uid,
          displayName: userObj.displayName || 'Tycoon User',
          email: userObj.email || '',
          profession: 'Venture Capitalist',
          gender: 'Prefer not to say',
          status: 'Single',
          assets: 'None yet',
          elo: 1000,
          gamesPlayed: 0,
          wins: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      onAuthSuccess(userObj, false);
    } catch (error: any) {
      console.error('Google Auth Error: ', error);
      setErrorMsg(error.message || 'Google Auth flow was aborted.');
    } finally {
      setLoading(false);
    }
  };

  const skipAsGuest = () => {
    onAuthSuccess({ uid: 'GUEST_PROFILE_ID', displayName: 'Guest Tycoon', email: 'guest@arshcorp.local' }, true);
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4 select-none relative bg-[#04080f]">
      {/* Background glow filters */}
      <div className="absolute top-[20%] left-[50%] -translate-x-[50%] w-[320px] h-[150px] bg-[radial-gradient(ellipse,rgba(0,212,255,0.15)_0%,transparent_70%)] pointer-events-none" />

      <div className="w-full max-w-[420px] bg-[#080d16]/95 border border-[rgba(0,212,255,0.25)] rounded-lg p-6 shadow-2xl relative z-10 bracket">
        
        {/* Game Title Logo */}
        <div className="text-center mb-6">
          <h1 className="font-sans font-black tracking-wider text-[28px] text-white leading-none">
            ARSH<br /><span className="text-[#00d4ff]">CORP</span>
          </h1>
          <p className="text-[9px] text-slate-400 font-mono tracking-widest mt-1.5 uppercase">EMPIRE LOGIN HUD</p>
        </div>

        {errorMsg && (
          <div className="p-3 mb-4 bg-red-950/20 border border-[rgba(255,51,102,0.35)] text-[#ff3366] rounded text-[11px] font-mono leading-relaxed text-center whitespace-pre-wrap">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleEmailAuth} className="flex flex-col gap-3">
          {isSignUp && (
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-[#00d4ff] font-mono tracking-wide uppercase">DisplayName</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. TycoonBoss"
                className="bg-black/30 border border-[rgba(0,212,255,0.2)] rounded p-2.5 text-[14px] text-white focus:outline-none focus:border-[#00d4ff] transition"
                required={isSignUp}
              />
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-[#00d4ff] font-mono tracking-wide uppercase">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@empire.com"
              className="bg-black/30 border border-[rgba(0,212,255,0.2)] rounded p-2.5 text-[14px] text-white focus:outline-none focus:border-[#00d4ff] transition"
              required
            />
          </div>

          <div className="flex flex-col gap-1 mb-2">
            <label className="text-[10px] text-[#00d4ff] font-mono tracking-wide uppercase">Password Key</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="bg-black/30 border border-[rgba(0,212,255,0.2)] rounded p-2.5 text-[14px] text-white focus:outline-none focus:border-[#00d4ff] transition"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full p-3 bg-gradient-to-r from-cyan-950/20 to-purple-950/20 border border-[#00d4ff] rounded text-[#00d4ff] font-mono text-[13px] font-bold hover:bg-[#00d4ff]/10 hover:shadow-[0_0_15px_rgba(0,212,255,0.3)] transition cursor-pointer min-h-[46px] disabled:opacity-40"
          >
            {loading ? 'PROCESSING MODULE...' : isSignUp ? 'REGISTER PROFILE' : 'INITIATE SESSION'}
          </button>
        </form>

        {/* Separator lines */}
        <div className="flex items-center gap-3 my-4">
          <hr className="flex-1 border-[rgba(0,212,255,0.15)]" />
          <span className="text-[9px] font-mono text-slate-500 uppercase">OR OAUTH HUD</span>
          <hr className="flex-1 border-[rgba(0,212,255,0.15)]" />
        </div>

        {/* Google Authentication */}
        <button
          onClick={handleGoogleAuth}
          disabled={loading}
          className="w-full p-2.5 mb-3 bg-gradient-to-r from-red-950/10 to-amber-950/10 border border-[#ffb700] rounded text-[#ffb700] font-mono text-[12px] font-bold hover:bg-[#ffb700]/10 hover:shadow-[0_0_15px_rgba(255,183,0,0.25)] transition cursor-pointer min-h-[42px] flex items-center justify-center gap-2 disabled:opacity-40"
        >
          <span>🌐</span> AUTH WITH GOOGLE
        </button>

        {/* Switch signup/login Link */}
        <div className="text-center text-[11px] text-slate-400">
          {isSignUp ? (
            <span>
              Already registered?{' '}
              <button onClick={() => setIsSignUp(false)} className="text-[#00d4ff] font-semibold underline hover:text-white cursor-pointer bg-transparent border-none">
                Sign In
              </button>
            </span>
          ) : (
            <span>
              Need a profile?{' '}
              <button onClick={() => setIsSignUp(true)} className="text-[#00d4ff] font-semibold underline hover:text-white cursor-pointer bg-transparent border-none">
                Register Now
              </button>
            </span>
          )}
        </div>

        {/* Guest profile fallback button */}
        <button
          onClick={skipAsGuest}
          className="w-full mt-4 p-2 bg-slate-900 border border-slate-600 rounded text-slate-300 font-mono text-[11px] hover:bg-slate-800 transition cursor-pointer min-h-[36px]"
        >
          🎮 ENTER AS GUEST (OFFLINE ONLY)
        </button>

        {/* Legal Compliances footer */}
        {onOpenCompliance && (
          <footer id="auth-legal-footer" className="mt-6 pt-4 border-t border-[rgba(0,212,255,0.08)] text-center text-[9px] text-slate-500 font-mono tracking-widest flex flex-wrap justify-center gap-x-2.5 gap-y-1.5 uppercase">
            <span className="text-cyan-400/60">PG // 12+</span>
            <span className="text-slate-800">|</span>
            <button type="button" onClick={() => onOpenCompliance('privacy')} className="hover:text-cyan-400 underline cursor-pointer bg-transparent border-none">PRIVACY</button>
            <span className="text-slate-800">|</span>
            <button type="button" onClick={() => onOpenCompliance('terms')} className="hover:text-cyan-400 underline cursor-pointer bg-transparent border-none">T&amp;C</button>
            <span className="text-slate-800">|</span>
            <button type="button" onClick={() => onOpenCompliance('cookie')} className="hover:text-cyan-400 underline cursor-pointer bg-transparent border-none">COOKIES</button>
            <span className="text-slate-800">|</span>
            <button type="button" onClick={() => onOpenCompliance('sitemap')} className="hover:text-[#00d4ff] underline cursor-pointer bg-transparent border-none">SITEMAP</button>
            <span className="text-slate-800">|</span>
            <button type="button" onClick={() => onOpenCompliance('age')} className="hover:text-[#00d4ff] underline cursor-pointer bg-transparent border-none font-bold">RATING</button>
          </footer>
        )}

      </div>
    </div>
  );
};
