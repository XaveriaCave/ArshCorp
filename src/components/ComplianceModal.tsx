import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  FileText, 
  Map, 
  Cookie, 
  Award, 
  X, 
  ExternalLink,
  ChevronRight,
  Database,
  Lock,
  Globe,
  HelpCircle,
  HelpCircle as CheckIcon
} from 'lucide-react';

interface ComplianceModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'privacy' | 'terms' | 'sitemap' | 'cookie' | 'age';
}

export const ComplianceModal: React.FC<ComplianceModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'privacy'
}) => {
  const [activeTab, setActiveTab] = useState<'privacy' | 'terms' | 'sitemap' | 'cookie' | 'age'>(initialTab);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const tabs = [
    { id: 'privacy', label: 'PRIVACY POLICY', icon: Shield },
    { id: 'terms', label: 'TERMS & CONDITIONS', icon: FileText },
    { id: 'sitemap', label: 'SITEMAP HUD', icon: Map },
    { id: 'cookie', label: 'COOKIE DISCLOSURE', icon: Cookie },
    { id: 'age', label: 'AGE & RATING CLARITY', icon: Award },
  ] as const;

  return (
    <div 
      id="compliance-modal-overlay"
      className="fixed inset-0 bg-[#02050a]/90 backdrop-blur-md z-[9995] flex items-center justify-center p-4 select-text"
      onClick={onClose}
    >
      <div 
        id="compliance-modal-container"
        className="relative bg-[#070c14]/98 border border-[rgba(0,212,255,0.25)] rounded-lg shadow-[0_0_40px_rgba(0,212,255,0.15)] w-full max-w-4xl h-[90vh] md:h-[80vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Neon scanline accent */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500" />

        {/* Modal Header */}
        <div className="p-4 border-b border-[rgba(0,212,255,0.15)] flex justify-between items-center bg-black/40 shrink-0">
          <div>
            <span className="text-[10px] items-center font-mono text-[#00d4ff] tracking-widest uppercase">
              // ARSHCORP CENTRAL COMPLIANCE REGISTRY
            </span>
            <h2 className="text-[18px] font-sans font-black tracking-wide text-white">
              LEGAL AGREEMENTS &amp; PROTOCOLS
            </h2>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 rounded border border-slate-800 bg-transparent text-slate-400 hover:text-white hover:border-cyan-400 transition cursor-pointer"
            title="Close Compliance panel"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Content Split Panel */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
          
          {/* Left Navigation Rails */}
          <div className="w-full md:w-[240px] border-b md:border-b-0 md:border-r border-[rgba(0,212,255,0.15)] bg-black/25 flex flex-row md:flex-col overflow-x-auto md:overflow-x-visible md:overflow-y-auto shrink-0 scrollbar-none p-2 gap-1 font-mono">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2.5 px-3 py-2 text-[10px] md:text-[11px] font-bold tracking-wider rounded text-left transition whitespace-nowrap cursor-pointer w-auto md:w-full min-h-[38px] ${
                    isSelected 
                      ? 'bg-cyan-950/30 border border-cyan-400/50 text-cyan-400 font-extrabold shadow-[0_0_10px_rgba(0,212,255,0.05)]' 
                      : 'border border-transparent text-slate-400 hover:bg-slate-900/45 hover:text-slate-200'
                  }`}
                >
                  <Icon size={14} className={isSelected ? 'text-cyan-400' : 'text-slate-500'} />
                  <span>{tab.label}</span>
                </button>
              );
            })}

            {/* Aesthetic Meta Box on desktop */}
            <div className="hidden md:block mt-auto p-3 border-t border-[rgba(0,212,255,0.08)] bg-black/40 rounded-b">
              <div className="text-[9px] text-[#00d4ff]/40 font-bold uppercase mb-1">DATA FLOW ENCRYPTED</div>
              <div className="text-[8px] text-slate-500 flex flex-col gap-1 font-mono leading-relaxed">
                <span>SECURE-NODE: ACTIVE</span>
                <span>REGISTRY: GLOBAL-V1</span>
                <span>STATUS: CERTIFIED</span>
              </div>
            </div>
          </div>

          {/* Right Text Space */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#04080e]/50 text-[13px] leading-relaxed text-slate-300">
            
            {/* 1. PRIVACY Policy */}
            {activeTab === 'privacy' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 border-b border-[rgba(0,212,255,0.15)] pb-3">
                  <div className="w-9 h-9 rounded bg-cyan-950/20 border border-cyan-400/30 flex items-center justify-center text-cyan-400">
                    <Shield size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-[15px] uppercase">PRIVACY POLICY PROTOCOL</h3>
                    <p className="text-[10px] font-mono text-slate-500">LAST REVISED: JUNE 2026</p>
                  </div>
                </div>

                <p className="italic text-[#00d4ff]/80 font-mono text-[11px]">
                  Welcome to ArshCorp. We are dedicated to respecting and protecting the sovereignty of your data. This policy delineates how we handle information across our cyberpunk economic board game.
                </p>

                <h4 className="font-mono text-white text-[12px] uppercase font-bold tracking-wide mt-4 flex items-center gap-2">
                  <span className="text-[#00d4ff]">01 //</span> RECIENT INFO COLLECTION (WHAT WE ACQUIRE)
                </h4>
                <p>
                  We compile minimal data required to build, operate, and persist your simulated digital empire. This includes:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-slate-400">
                  <li>
                    <strong className="text-slate-200">Account Credentials:</strong> Email coordinates, cryptographic passwords, and display avatars processed when registering via Google Firebase Authentication.
                  </li>
                  <li>
                    <strong className="text-slate-200">Local Guest Information:</strong> If you use Guest login, we construct local identities stored solely in your local browser sandbox parameters.
                  </li>
                  <li>
                    <strong className="text-slate-200">Empire Save Sessions:</strong> Save indices (cash balances, asset ownership logs, liabilities portfolio, board positions) backed up securely to the user's personal Google Firebase Firestore database sandbox.
                  </li>
                </ul>

                <h4 className="font-mono text-white text-[12px] uppercase font-bold tracking-wide mt-4 flex items-center gap-2">
                  <span className="text-[#00d4ff]">02 //</span> CORE UTILIZATION OF RAW INTEL (HOW DATA IS APPLIED)
                </h4>
                <p>
                  Your information is exclusively funneled into in-game processes of the ArshCorp ecosystem:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-slate-400">
                  <li>To reconstruct previous match states when activating your loaded empire slots.</li>
                  <li>To provide high-fidelity leaderboards or statistics indicators comparing performance.</li>
                  <li>To evaluate local game parameters such as simulated asset mortgaging and computer-aided bargains.</li>
                </ul>

                <h4 className="font-mono text-white text-[12px] uppercase font-bold tracking-wide mt-4 flex items-center gap-2">
                  <span className="text-[#00d4ff]">03 //</span> TRANS-SECTOR TRANSFERS (DATA SHARING RULES)
                </h4>
                <p>
                  Your personal data is never traded, sold, or distributed to downstream advertisement sectors. Storage is strictly bounded within Google Firebase servers complying with top-tier global physical safety structures.
                </p>

                <h4 className="font-mono text-white text-[12px] uppercase font-bold tracking-wide mt-4 flex items-center gap-2">
                  <span className="text-[#00d4ff]">04 //</span> EXECUTIVE SOVEREIGNTY (YOUR DATA RIGHTS)
                </h4>
                <p>
                  You retain full sovereign authority over your registries. You can purge your account details, wipe cache registers, or delete active saving slots at any instant directly via the in-built profile HUD controls.
                </p>
              </div>
            )}

            {/* 2. TERMS & Conditions */}
            {activeTab === 'terms' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 border-b border-[rgba(0,212,255,0.15)] pb-3">
                  <div className="w-9 h-9 rounded bg-cyan-950/20 border border-cyan-400/30 flex items-center justify-center text-cyan-400">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-[15px] uppercase">COVENANT TERMS &amp; CONDITIONS</h3>
                    <p className="text-[10px] font-mono text-slate-500">EFFECTIVE PROTOCOLS FOR EMPIRE PARTICIPANTS</p>
                  </div>
                </div>

                <p className="italic text-[#00d4ff]/80 font-mono text-[11px]">
                  By launching the ArshCorp corporate board simulated workspace, you bind your entity to the rules of engagement highlighted herein.
                </p>

                <h4 className="font-mono text-white text-[12px] uppercase font-bold tracking-wide mt-4 flex items-center gap-2">
                  <span className="text-[#00d4ff]">01 //</span> NO REAL WORLD TENDER (SIMULATION CLAUSE)
                </h4>
                <p className="bg-cyan-950/15 border border-cyan-800/25 p-3 rounded text-slate-300 font-mono text-[11px]">
                  CRITICAL PROVISION: All transactions, bank loans, cash resources, asset prices, rents, construction fees, tax payouts, and properties within ArshCorp are 100% fictional simulations. They possess zero actual liquidity, real-world valuation, or conversion capability into statutory currency. This app constitutes under no grounds real-money gambling, lottery, or credit underwriting.
                </p>

                <h4 className="font-mono text-white text-[12px] uppercase font-bold tracking-wide mt-4 flex items-center gap-2">
                  <span className="text-[#00d4ff]">02 //</span> LICENSING &amp; COGNITIVE PROPERTY
                </h4>
                <p>
                  The graphics, styling frameworks, cyberpunk board configurations, custom formulas for building rents, and trading mechanics are intellectual reserves of ArshCorp. You are granted a limited, personal, non-exclusive license to operate these features inside standard browser environments for amusement.
                </p>

                <h4 className="font-mono text-white text-[12px] uppercase font-bold tracking-wide mt-4 flex items-center gap-2">
                  <span className="text-[#00d4ff]">03 //</span> EMPIRE ENGAGEMENT STATUTE
                </h4>
                <p>
                  We expect participants to play fair. Tampering, injecting malicious scripts, or utilizing client-side vulnerabilities to hack saves is strictly forbidden.
                </p>

                <h4 className="font-mono text-white text-[12px] uppercase font-bold tracking-wide mt-4 flex items-center gap-2">
                  <span className="text-[#00d4ff]">04 //</span> FORCE MAJEURE DISCLAIMERS
                </h4>
                <p>
                  The system operates 'as-is' and 'as available'. We are not responsible for any connection drops, database latency, local cache corruption, or lost virtual fortunes due to structural maintenance or device instability.
                </p>
              </div>
            )}

            {/* 3. SITEMAP HUD */}
            {activeTab === 'sitemap' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 border-b border-[rgba(0,212,255,0.15)] pb-3">
                  <div className="w-9 h-9 rounded bg-cyan-950/20 border border-cyan-400/30 flex items-center justify-center text-[#00d4ff]">
                    <Map size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-[15px] uppercase">SITEMAP DIRECTORY HUD</h3>
                    <p className="text-[10px] font-mono text-slate-500">APPLICATION STRUCTURE &amp; HUD ROUTER</p>
                  </div>
                </div>

                <p className="text-[12px] font-mono text-[#00d4ff]/80">
                  Below lies the structural index mapping all functional chambers of the ArshCorp terminal.
                </p>

                {/* Sitemap visual tree */}
                <div className="space-y-3 font-mono text-[11.5px] bg-black/30 p-4 border border-[rgba(0,212,255,0.12)] rounded">
                  <div className="tree-node text-[#00d4ff] font-extrabold flex items-center gap-1">
                    <Globe size={13} />
                    <span>arshcorp_root_terminal /</span>
                  </div>
                  
                  <div className="pl-4 space-y-2 border-l border-cyan-900/40 ml-1.5 pt-1">
                    <div className="tree-leaf flex items-start gap-1">
                      <span className="text-slate-500 font-normal">├──</span>
                      <div className="bg-cyan-950/10 p-1.5 rounded border border-cyan-900/20 w-full">
                        <strong className="text-white">Authentication Terminal [Secure Auth HUD]</strong>
                        <p className="text-[10px] text-slate-500">Provides secure login portals via Firebase Auth and quick bypass access for Guest players.</p>
                      </div>
                    </div>

                    <div className="tree-leaf flex items-start gap-1">
                      <span className="text-slate-500 font-normal">├──</span>
                      <div className="bg-cyan-950/10 p-1.5 rounded border border-cyan-900/20 w-full">
                        <strong className="text-white">Main Lobby Workspace [Management Deck]</strong>
                        <p className="text-[10px] text-slate-500">Enables configuration of new empires, slot headcount parameters, difficulty, customized names, and the Firebase Slot Save list.</p>
                      </div>
                    </div>

                    <div className="tree-leaf flex items-start gap-1">
                      <span className="text-slate-500 font-normal">├──</span>
                      <div className="bg-cyan-950/10 p-1.5 rounded border border-cyan-900/20 w-full">
                        <strong className="text-white">Economic Board HUD [Active Arena Grid]</strong>
                        <p className="text-[10px] text-slate-500">The core playboard rendering the digital assets map. Features coordinates for the 3D dice generator and random cyber events.</p>
                      </div>
                    </div>

                    <div className="tree-leaf flex items-start gap-1">
                      <span className="text-slate-500 font-normal">├──</span>
                      <div className="bg-cyan-950/10 p-1.5 rounded border border-cyan-900/20 w-full">
                        <strong className="text-white">Profile Control Center [Executive Console]</strong>
                        <p className="text-[10px] text-slate-500">Enables review of connected email profiles, current session saves, and secure database resets.</p>
                      </div>
                    </div>

                    <div className="tree-leaf flex items-start gap-1">
                      <span className="text-slate-500 font-normal">└──</span>
                      <div className="bg-cyan-950/10 p-1.5 rounded border border-cyan-900/20 w-full">
                        <strong className="text-white">Mortgages &amp; Liability Deck [Financial Panels]</strong>
                        <p className="text-[10px] text-slate-500">Allows interactive cash leveraging, storefront mortgaging, bank borrowing, and liability redemption.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 font-mono mt-2 text-right">
                  System links utilize unified server routes: <span className="text-[#00d4ff]">#lobby</span> and <span className="text-[#00d4ff]">#game-arena</span>.
                </div>
              </div>
            )}

            {/* 4. COOKIE Policy */}
            {activeTab === 'cookie' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 border-b border-[rgba(0,212,255,0.15)] pb-3">
                  <div className="w-9 h-9 rounded bg-cyan-950/20 border border-cyan-400/30 flex items-center justify-center text-cyan-400">
                    <Cookie size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-[15px] uppercase">COOKIE DISCLOSURE STATUTE</h3>
                    <p className="text-[10px] font-mono text-slate-500">ESSENTIAL PRESETS &amp; STORAGE RULES</p>
                  </div>
                </div>

                <p className="italic text-[#00d4ff]/80 font-mono text-[11px]">
                  At ArshCorp, transparency is a non-negotiable directive. This disclosure outlines how we employ browser cookies and HTML5 storage.
                </p>

                <h4 className="font-mono text-white text-[12px] uppercase font-bold tracking-wide mt-4 flex items-center gap-2">
                  <span className="text-[#00d4ff]">01 //</span> RECIENT LOCAL STORAGE PARADIGMS
                </h4>
                <p>
                  Unlike standard advertising sites, we do NOT load any invasive third-party demographic marketing packages. We rely exclusively on first-party storage to run the terminal:
                </p>
                
                <div className="space-y-2.5 mt-2">
                  <div className="bg-black/35 p-3 rounded border border-[rgba(0,212,255,0.1)]">
                    <span className="font-mono text-white text-[11px] font-bold block mb-1">Session &amp; Guest State Cookies (Essential)</span>
                    <p className="text-slate-400 text-[12px]">
                      Ensures you stay signed into your guest profile or registered email session during transitions between match spaces.
                    </p>
                  </div>
                  <div className="bg-black/35 p-3 rounded border border-[rgba(0,212,255,0.11)]">
                    <span className="font-mono text-white text-[11px] font-bold block mb-1">Game Customization Parameters (Functional)</span>
                    <p className="text-slate-400 text-[12px]">
                      Remembers volume toggles, background audio preferences, color presets, and dismissal flags for tutorial guides.
                    </p>
                  </div>
                </div>

                <h4 className="font-mono text-white text-[12px] uppercase font-bold tracking-wide mt-4">
                  <span className="text-[#00d4ff]">02 //</span> HOW TO MODIFY PERMISSIONS
                </h4>
                <p>
                  Because these storage values are purely functional, blocking them through browser security menus will prevent local match saves or profile state recovery. You are free to purge all local registry coordinates anytime by executing your browser's "Clear Site Data" utility.
                </p>
              </div>
            )}

            {/* 5. AGE RATING CLARITY */}
            {activeTab === 'age' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 border-b border-[rgba(0,212,255,0.15)] pb-3">
                  <div className="w-9 h-9 rounded bg-cyan-950/20 border border-cyan-400/30 flex items-center justify-center text-cyan-400">
                    <Award size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-[15px] uppercase">AGE RATING AND AUDIENCE APPROVAL</h3>
                    <p className="text-[10px] font-mono text-slate-500">GLOBAL INTERACTION CLASSIFICATION</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 bg-cyan-950/10 border border-cyan-500/25 p-4 rounded mt-2">
                  <div className="shrink-0 flex flex-col items-center justify-center border-2 border-cyan-400 bg-black w-20 h-24 font-mono font-black text-center p-2 rounded">
                    <div className="text-[8px] text-[#00d4ff] uppercase tracking-widest">ARSHCORP</div>
                    <div className="text-[28px] text-white">12+</div>
                    <div className="text-[8px] text-slate-400 mt-1 font-bold">RATED TEEN</div>
                  </div>
                  <div>
                    <span className="font-mono text-[#00d4ff] text-[11px] font-bold block uppercase mb-1">// COGNITIVE ECONOMIC ENGAGEMENT VALUE</span>
                    <p className="text-slate-200 font-bold leading-snug">
                      Approved for ages 12 and above (Rated teen/everyone 10+ due to mock financial risk scenarios).
                    </p>
                    <p className="text-slate-400 text-[12px] mt-1">
                      No real-money transactions, simulated gambling, or commercial liability. Includes pedagogical themes of calculated investment and margin allocation.
                    </p>
                  </div>
                </div>

                <h4 className="font-mono text-white text-[12px] uppercase font-bold tracking-wide mt-4">
                  PEGI-12 &amp; ESRB TEEN PARITY CRITERIA:
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-[11px]">
                  <div className="p-3 bg-black/40 rounded border border-slate-800">
                    <span className="text-[#00d4ff] font-bold block mb-1">🎮 NO RAW GAMBLING</span>
                    <p className="text-slate-400 text-[11.5px]">While dice and event outcomes utilize RNG algorithms, they simulate basic board game parameters instead of slot systems or gambling setups.</p>
                  </div>
                  <div className="p-3 bg-black/40 rounded border border-slate-800">
                    <span className="text-[#00d4ff] font-bold block mb-1">💡 COGNITIVE DEVELOPMENT</span>
                    <p className="text-slate-400 text-[11.5px]">Promotes strategic planning, liability calculations, asset amortizations, and basic negotiation mechanics.</p>
                  </div>
                  <div className="p-3 bg-black/40 rounded border border-slate-800">
                    <span className="text-[#00d4ff] font-bold block mb-1">📦 NO IN-APP COPPER STORES</span>
                    <p className="text-slate-400 text-[11.5px]">Zero micro-transactions or hidden loot structures. Strictly server-safe offline or guest profiles.</p>
                  </div>
                  <div className="p-3 bg-black/40 rounded border border-slate-800">
                    <span className="text-[#00d4ff] font-bold block mb-1">🛡️ HIGH CONTRAST EYE CONFORT</span>
                    <p className="text-slate-400 text-[11.5px]">Includes cyberpunk scanline controls making visual indicators dimmable for player comfort.</p>
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[rgba(0,212,255,0.15)] bg-slate-950 flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0 text-[11px] font-mono text-slate-500">
          <span>ALL COMMUNICATIONS VERIFIED ON SHA-256 SYSTEM</span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-1.5 rounded bg-cyan-950/20 border border-cyan-400 text-cyan-400 hover:bg-cyan-400/10 transition cursor-pointer font-bold text-[10px]"
          >
            CONFIRM LICENSE AGREEMENT &amp; DISMISS
          </button>
        </div>

      </div>
    </div>
  );
};


/* ── PERSISTENT COOKIE CONSENT BANNER ── */
interface CookieBannerProps {
  onOpenCompliance: () => void;
}

export const CookieBanner: React.FC<CookieBannerProps> = ({ onOpenCompliance }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Check local storage for existing consent
    const consent = localStorage.getItem('arshcorp_cookie_consent');
    if (!consent) {
      // Small timeout for polished screen slide-in transition
      const timer = setTimeout(() => {
        setVisible(true);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('arshcorp_cookie_consent', 'accepted');
    setVisible(false);
  };

  const handleDecline = () => {
    // Decline registers as declined, but doesn't store active profile saves locally
    localStorage.setItem('arshcorp_cookie_consent', 'declined');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div 
      id="cookie-consent-banner"
      className="fixed bottom-4 left-4 right-4 md:left-[inherit] md:right-4 md:w-[380px] bg-[#070d16]/95 border border-[#00d4ff]/40 shadow-[0_0_25px_rgba(0,212,255,0.15)] rounded-lg p-4 z-[9990] animate-in slide-in-from-bottom border-l-4 border-l-cyan-400 font-sans select-text"
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded bg-cyan-950/30 border border-cyan-400/20 flex items-center justify-center shrink-0 text-cyan-400 mt-0.5">
          <Cookie size={16} className="animate-pulse" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-[11px] font-mono text-[#00d4ff] font-bold tracking-widest uppercase mb-1">
            // COOKIE CONSENT ENGAGED
          </h4>
          <p className="text-[12px] text-slate-300 leading-relaxed">
            ArshCorp demands browser cooking tokens to track matching sessions and load state saves. No external monitoring scripts are loaded. Use of our hub is bound by our protocols.
          </p>
          <div className="flex items-center gap-1 mt-1.5 text-[10px] font-mono">
            <button 
              type="button"
              onClick={onOpenCompliance}
              className="text-cyan-400 hover:underline bg-transparent border-none p-0 cursor-pointer font-bold inline-flex items-center gap-0.5"
            >
              Protocol Policies &amp; Disclosure <ExternalLink size={8} />
            </button>
          </div>
          
          <div className="flex justify-end gap-2 mt-3 font-mono text-[10px]">
            <button
              onClick={handleDecline}
              className="px-3 py-1.5 rounded border border-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer"
            >
              DECLINE
            </button>
            <button
              onClick={handleAccept}
              className="px-4 py-1.5 rounded bg-cyan-950/20 border border-cyan-400 text-cyan-400 hover:bg-cyan-400/10 font-bold transition cursor-pointer"
            >
              ACCEPT TOKENS
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
