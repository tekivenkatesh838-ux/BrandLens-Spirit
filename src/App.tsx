import React, { useState, useEffect } from 'react';
import { 
  RoleType, 
  ChannelType, 
  BrandRule, 
  AnalysisResult, 
  AuditRecord 
} from './types/brandlens';
import { DEFAULT_BRAND_RULES, SAMPLE_DRAFTS } from './data/defaultKnowledge';
import { ReviewQueue } from './components/ReviewQueue';
import { KnowledgeBase } from './components/KnowledgeBase';
import { InsightsView } from './components/InsightsView';
import { 
  Sparkles, 
  BookOpen, 
  BarChart3, 
  Shield, 
  CheckCircle2, 
  AlertCircle,
  FileSearch,
  Layers
} from 'lucide-react';

export default function App() {
  // Navigation tab state with hash sync
  const [activeTab, setActiveTab] = useState<'review' | 'knowledge' | 'insights'>('review');

  // Core application state
  const [content, setContent] = useState<string>(SAMPLE_DRAFTS[0].content);
  const [role, setRole] = useState<RoleType>('Marketing & Growth');
  const [channel, setChannel] = useState<ChannelType>('Social Post (X/LinkedIn)');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  // Persistence: Brand rules
  const [rules, setRules] = useState<BrandRule[]>(() => {
    try {
      const stored = localStorage.getItem('brandlens_rules_v1');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Failed to load rules from localStorage:', e);
    }
    return DEFAULT_BRAND_RULES;
  });

  // Persistence: Audit records
  const [auditRecords, setAuditRecords] = useState<AuditRecord[]>(() => {
    try {
      const stored = localStorage.getItem('brandlens_audits_v1');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Failed to load audits from localStorage:', e);
    }
    return [];
  });

  // AI Configuration status from server
  const [aiConfigured, setAiConfigured] = useState<boolean>(false);
  const [engineModel, setEngineModel] = useState<string>('Detecting...');

  // Toast notification
  const [notification, setNotification] = useState<{
    msg: string;
    type: 'success' | 'info' | 'warning';
  } | null>(null);

  // Sync hash with active tab on mount and popstate
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash === 'review' || hash === 'knowledge' || hash === 'insights') {
        setActiveTab(hash);
      }
    };

    handleHashChange();
    window.addEventListener('popstate', handleHashChange);
    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('popstate', handleHashChange);
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  const switchTab = (tab: 'review' | 'knowledge' | 'insights') => {
    setActiveTab(tab);
    window.location.hash = `#${tab}`;
  };

  // Check server status
  useEffect(() => {
    fetch('/api/status')
      .then(res => res.json())
      .then(data => {
        setAiConfigured(Boolean(data.aiConfigured));
        setEngineModel(data.aiConfigured ? (data.model === 'gemini-3.5-flash' ? 'Gemini 3.5 Flash' : data.model || 'Gemini AI') : 'Demo Rule Engine');
      })
      .catch(() => {
        setAiConfigured(false);
        setEngineModel('Demo Rule Engine');
      });
  }, []);

  // Save rules to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('brandlens_rules_v1', JSON.stringify(rules));
    } catch (e) {
      console.error('Failed to save rules to localStorage:', e);
    }
  }, [rules]);

  // Save auditRecords to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('brandlens_audits_v1', JSON.stringify(auditRecords));
    } catch (e) {
      console.error('Failed to save audits to localStorage:', e);
    }
  }, [auditRecords]);

  // Toast trigger helper
  const showNotification = (msg: string, type: 'success' | 'info' | 'warning' = 'info') => {
    setNotification({ msg, type });
    setTimeout(() => {
      setNotification((curr) => (curr?.msg === msg ? null : curr));
    }, 3200);
  };

  // Record or update audit history for a review session
  const handleRecordAudit = (
    result: AnalysisResult,
    initialScore: number,
    acceptedCount: number,
    dismissedCount: number
  ) => {
    const recordId = result.sessionId || `audit-${Date.now()}`;

    setAuditRecords((prev) => {
      const existingIdx = prev.findIndex((r) => r.id === recordId);
      if (existingIdx !== -1) {
        // Update existing session audit record in place
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          currentScore: result.overallScore,
          issuesCount: result.findings.length,
          acceptedCount,
          dismissedCount,
          engine: result.engine
        };
        return updated;
      }

      // New session evaluation record
      const newRecord: AuditRecord = {
        id: recordId,
        timestamp: new Date().toISOString(),
        role: result.role,
        channel: result.channel,
        snippet: content.substring(0, 90).replace(/\n/g, ' ') + (content.length > 90 ? '...' : ''),
        initialScore,
        currentScore: result.overallScore,
        issuesCount: result.findings.length,
        acceptedCount,
        dismissedCount,
        engine: result.engine
      };
      return [newRecord, ...prev];
    });
  };

  // Clear audit history
  const handleClearHistory = () => {
    if (window.confirm('Clear all recorded audit history?')) {
      setAuditRecords([]);
      showNotification('Audit history cleared.', 'info');
    }
  };

  // Re-open past record in Review Queue
  const handleSelectRecordForReview = (snippet: string, pastRole: string, pastChannel: string) => {
    // If the snippet was from one of the samples, try to find full content
    const matchedSample = SAMPLE_DRAFTS.find(s => s.content.includes(snippet.replace('...', '')));
    if (matchedSample) {
      setContent(matchedSample.content);
    } else {
      setContent(snippet);
    }
    setRole(pastRole as RoleType);
    setChannel(pastChannel as ChannelType);
    setAnalysisResult(null);
    switchTab('review');
    showNotification('Loaded record into Review Queue.', 'info');
  };

  const pendingFindingsCount = analysisResult
    ? analysisResult.findings.filter(f => !f.accepted && !f.dismissed).length
    : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Bar Navigation */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Brand Wordmark */}
          <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30">
              <Shield className="w-4 h-4" />
            </div>
            <a 
              href="#review" 
              onClick={(e) => { e.preventDefault(); switchTab('review'); }}
              className="text-lg font-bold tracking-tight text-white hover:text-indigo-300 transition-colors"
            >
              BrandLens
            </a>
            <span className="hidden sm:inline-block text-xs font-mono text-indigo-400 bg-indigo-950/60 border border-indigo-800/40 px-2 py-0.5 rounded">
              SPIRIT AI
            </span>
          </div>

          {/* Zone 2: Navigation Links */}
          <nav className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => switchTab('review')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                activeTab === 'review'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-850'
              }`}
            >
              <FileSearch className="w-4 h-4 text-indigo-400" />
              <span>Review Queue</span>
              {pendingFindingsCount > 0 && (
                <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-bold">
                  {pendingFindingsCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => switchTab('knowledge')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                activeTab === 'knowledge'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-850'
              }`}
            >
              <BookOpen className="w-4 h-4 text-indigo-400" />
              <span>Knowledge</span>
              <span className="font-mono text-[10px] text-slate-500">
                {rules.filter(r => r.isActive).length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => switchTab('insights')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                activeTab === 'insights'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-850'
              }`}
            >
              <BarChart3 className="w-4 h-4 text-indigo-400" />
              <span>Insights</span>
              {auditRecords.length > 0 && (
                <span className="font-mono text-[10px] text-slate-500">
                  {auditRecords.length}
                </span>
              )}
            </button>
          </nav>

          {/* Zone 3: Engine State / Primary Action */}
          <div className="hidden md:flex items-center gap-3 shrink-0">
            {aiConfigured ? (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-950/60 border border-emerald-800/40 rounded-lg text-xs text-emerald-400">
                <Sparkles className="w-3.5 h-3.5" />
                <span className="font-mono">Gemini AI Active</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800/80 border border-slate-700/60 rounded-lg text-xs text-slate-300">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="text-[11px]">Demo Mode (Rule Engine)</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full">
        {activeTab === 'review' && (
          <ReviewQueue
            content={content}
            setContent={setContent}
            role={role}
            setRole={setRole}
            channel={channel}
            setChannel={setChannel}
            rules={rules}
            analysisResult={analysisResult}
            setAnalysisResult={setAnalysisResult}
            onRecordAudit={handleRecordAudit}
            onNotify={showNotification}
            aiConfigured={aiConfigured}
          />
        )}

        {activeTab === 'knowledge' && (
          <KnowledgeBase
            rules={rules}
            setRules={setRules}
            onNotify={showNotification}
          />
        )}

        {activeTab === 'insights' && (
          <InsightsView
            auditRecords={auditRecords}
            onClearHistory={handleClearHistory}
            onSelectRecordForReview={handleSelectRecordForReview}
            onNotify={showNotification}
            onGoToReview={() => switchTab('review')}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            BrandLens · Enterprise AI Brand Governance & Review Queue
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>SPIRIT AI Hackathon</span>
            <span>·</span>
            <span>WCAG AA Legible</span>
            <span>·</span>
            <span className="font-mono">{engineModel}</span>
          </div>
        </div>
      </footer>

      {/* Toast Notification Container */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-2.5 bg-slate-900 border border-slate-700 text-white rounded-xl shadow-2xl text-xs animate-in fade-in slide-in-from-bottom-2 duration-200">
          {notification.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
          {notification.type === 'warning' && <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />}
          {notification.type === 'info' && <Shield className="w-4 h-4 text-indigo-400 shrink-0" />}
          <span>{notification.msg}</span>
        </div>
      )}
    </div>
  );
}
