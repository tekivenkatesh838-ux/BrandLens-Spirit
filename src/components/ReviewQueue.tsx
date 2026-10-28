import React, { useState, useEffect } from 'react';
import { 
  RoleType, 
  ChannelType, 
  BrandRule, 
  AnalysisResult, 
  Finding, 
  FindingSeverity,
  FindingCategory 
} from '../types/brandlens';
import { SAMPLE_DRAFTS, SampleDraft } from '../data/defaultKnowledge';
import { analyzeContentWithRules } from '../utils/ruleEngine';
import { applySafeReplacement, shiftAndValidateFindings } from '../utils/replacementEngine';
import { 
  CheckCircle, 
  AlertTriangle, 
  AlertOctagon, 
  Info, 
  Sparkles, 
  Check, 
  X, 
  Copy, 
  RotateCcw, 
  FileText, 
  Sliders, 
  Send, 
  ArrowRight,
  ExternalLink,
  ChevronDown,
  RefreshCw
} from 'lucide-react';

interface ReviewQueueProps {
  content: string;
  setContent: (val: string) => void;
  role: RoleType;
  setRole: (role: RoleType) => void;
  channel: ChannelType;
  setChannel: (channel: ChannelType) => void;
  rules: BrandRule[];
  analysisResult: AnalysisResult | null;
  setAnalysisResult: React.Dispatch<React.SetStateAction<AnalysisResult | null>>;
  onRecordAudit: (result: AnalysisResult, initialScore: number, acceptedCount: number, dismissedCount: number) => void;
  onNotify: (msg: string, type?: 'success' | 'info' | 'warning') => void;
  aiConfigured: boolean;
}

const ROLES: RoleType[] = [
  'Marketing & Growth',
  'Developer Relations',
  'Executive PR & Comms',
  'Product Management',
  'Legal & Compliance'
];

const CHANNELS: ChannelType[] = [
  'Social Post (X/LinkedIn)',
  'Blog Post & Press Release',
  'Developer Documentation',
  'Customer Email / Announcement',
  'Investor & Board Update'
];

export const ReviewQueue: React.FC<ReviewQueueProps> = ({
  content,
  setContent,
  role,
  setRole,
  channel,
  setChannel,
  rules,
  analysisResult,
  setAnalysisResult,
  onRecordAudit,
  onNotify,
  aiConfigured
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<'all' | FindingCategory>('all');
  const [selectedSeverityFilter, setSelectedSeverityFilter] = useState<'all' | FindingSeverity>('all');
  const [copied, setCopied] = useState(false);
  const [sampleMenuOpen, setSampleMenuOpen] = useState(false);

  // Compute character & word count
  const trimmed = content.trim();
  const wordCount = trimmed ? trimmed.split(/\s+/).length : 0;
  const charCount = content.length;

  const handleLoadSample = (sample: SampleDraft) => {
    setContent(sample.content);
    if (ROLES.includes(sample.role as RoleType)) {
      setRole(sample.role as RoleType);
    }
    if (CHANNELS.includes(sample.channel as ChannelType)) {
      setChannel(sample.channel as ChannelType);
    }
    setSampleMenuOpen(false);
    onNotify(`Loaded sample: "${sample.name}"`, 'info');
  };

  const handleCheckContent = async () => {
    if (!content.trim()) {
      onNotify('Please enter or load draft content to evaluate.', 'warning');
      return;
    }

    setIsAnalyzing(true);
    const newSessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    try {
      let result: AnalysisResult;

      // Attempt server-side API call
      try {
        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content,
            role,
            channel,
            rules,
            sessionId: newSessionId
          })
        });

        if (response.ok) {
          result = await response.json();
        } else {
          // If server returns error, use client-side rule engine
          console.warn('Server analyze returned non-ok status, falling back to local engine');
          result = analyzeContentWithRules(content, role, channel, rules, newSessionId);
        }
      } catch (err) {
        console.warn('Server unreachable, running client-side engine:', err);
        result = analyzeContentWithRules(content, role, channel, rules, newSessionId);
      }

      setAnalysisResult(result);
      onRecordAudit(result, result.overallScore, 0, 0);

      if (result.findings.length === 0) {
        onNotify('Content passed all active brand rules! Score: ' + result.overallScore + '/100', 'success');
      } else {
        onNotify(`Analysis complete: ${result.findings.length} findings identified.`, 'info');
      }
    } catch (error: any) {
      console.error('Analysis failed:', error);
      onNotify('Evaluation failed. Please try again.', 'warning');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Accept a fix: replace the exact finding occurrence and adjust downstream offsets
  const handleAcceptFix = (finding: Finding) => {
    const result = applySafeReplacement(content, finding);

    if (!result.replaced) {
      onNotify(result.reviewReason || `Could not locate "${finding.flaggedText}" in text (it may have already been modified).`, "warning");
      return;
    }

    setContent(result.newContent);

    if (result.requiresManualReview) {
      onNotify(`Fix accepted with review notice: ${result.reviewReason}`, "warning");
    } else {
      onNotify(`Accepted fix for "${finding.flaggedText}".`, "success");
    }

    // Update findings state and adjust downstream offsets
    if (analysisResult) {
      const delta = result.delta;
      const targetStart = result.actualStart;

      const updatedFindings = analysisResult.findings.map(f => {
        if (f.id === finding.id) {
          return {
            ...f,
            accepted: true,
            dismissed: false,
            requiresManualReview: result.requiresManualReview,
            reviewReason: result.reviewReason
          };
        }
        // Shift downstream findings after the replacement
        if (
          delta !== 0 &&
          f.startIndex !== undefined &&
          f.startIndex > targetStart
        ) {
          return {
            ...f,
            startIndex: f.startIndex + delta,
            endIndex: f.endIndex !== undefined ? f.endIndex + delta : undefined
          };
        }
        return f;
      });

      // Recalculate score
      const remainingUnfixed = updatedFindings.filter(f => !f.accepted && !f.dismissed);
      let penalty = 0;
      for (const f of remainingUnfixed) {
        if (f.severity === "critical") penalty += 18;
        else if (f.severity === "warning") penalty += 10;
        else penalty += 5;
      }
      const newScore = Math.max(15, Math.min(100, 100 - penalty));

      const updatedResult: AnalysisResult = {
        ...analysisResult,
        findings: updatedFindings,
        overallScore: newScore
      };
      setAnalysisResult(updatedResult);

      const acceptedCount = updatedFindings.filter(f => f.accepted).length;
      const dismissedCount = updatedFindings.filter(f => f.dismissed).length;
      onRecordAudit(updatedResult, analysisResult.overallScore, acceptedCount, dismissedCount);
    }
  };

  // Dismiss finding
  const handleDismissFinding = (finding: Finding) => {
    if (!analysisResult) return;

    const updatedFindings = analysisResult.findings.map(f => {
      if (f.id === finding.id) {
        return { ...f, dismissed: true, accepted: false };
      }
      return f;
    });

    const remainingUnfixed = updatedFindings.filter(f => !f.accepted && !f.dismissed);
    let penalty = 0;
    for (const f of remainingUnfixed) {
      if (f.severity === 'critical') penalty += 18;
      else if (f.severity === 'warning') penalty += 10;
      else penalty += 5;
    }
    const newScore = Math.max(15, Math.min(100, 100 - penalty));

    const updatedResult: AnalysisResult = {
      ...analysisResult,
      findings: updatedFindings,
      overallScore: newScore
    };
    setAnalysisResult(updatedResult);

    const acceptedCount = updatedFindings.filter(f => f.accepted).length;
    const dismissedCount = updatedFindings.filter(f => f.dismissed).length;
    onRecordAudit(updatedResult, analysisResult.overallScore, acceptedCount, dismissedCount);
    onNotify('Finding dismissed.', 'info');
  };

  // Undo dismiss or accept
  const handleResetFinding = (finding: Finding) => {
    if (!analysisResult) return;

    const updatedFindings = analysisResult.findings.map(f => {
      if (f.id === finding.id) {
        return { ...f, dismissed: false, accepted: false };
      }
      return f;
    });

    const remainingUnfixed = updatedFindings.filter(f => !f.accepted && !f.dismissed);
    let penalty = 0;
    for (const f of remainingUnfixed) {
      if (f.severity === 'critical') penalty += 18;
      else if (f.severity === 'warning') penalty += 10;
      else penalty += 5;
    }
    const newScore = Math.max(15, Math.min(100, 100 - penalty));

    const updatedResult: AnalysisResult = {
      ...analysisResult,
      findings: updatedFindings,
      overallScore: newScore
    };
    setAnalysisResult(updatedResult);

    const acceptedCount = updatedFindings.filter(f => f.accepted).length;
    const dismissedCount = updatedFindings.filter(f => f.dismissed).length;
    onRecordAudit(updatedResult, analysisResult.overallScore, acceptedCount, dismissedCount);
    onNotify('Finding restored to review queue.', 'info');
  };

  const handleCopyContent = () => {
    if (!content) return;
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onNotify('Content copied to clipboard!', 'success');
  };

  // Filtered findings
  const activeFindings = analysisResult?.findings || [];
  const filteredFindings = activeFindings.filter(f => {
    if (selectedCategoryFilter !== 'all' && f.category !== selectedCategoryFilter) {
      return false;
    }
    if (selectedSeverityFilter !== 'all' && f.severity !== selectedSeverityFilter) {
      return false;
    }
    return true;
  });

  const pendingFindings = filteredFindings.filter(f => !f.accepted && !f.dismissed);
  const resolvedFindings = filteredFindings.filter(f => f.accepted || f.dismissed);

  // Score styling
  const score = analysisResult ? analysisResult.overallScore : 0;
  const getScoreColor = (val: number) => {
    if (val >= 90) return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
    if (val >= 70) return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
    return 'text-rose-400 border-rose-500/30 bg-rose-500/10';
  };

  const getSeverityBadge = (sev: FindingSeverity) => {
    switch (sev) {
      case 'critical':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-400 bg-rose-950/60 border border-rose-800/50 px-2 py-0.5 rounded">
            <AlertOctagon className="w-3 h-3" /> Critical
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-400 bg-amber-950/60 border border-amber-800/50 px-2 py-0.5 rounded">
            <AlertTriangle className="w-3 h-3" /> Warning
          </span>
        );
      case 'suggestion':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-sky-400 bg-sky-950/60 border border-sky-800/50 px-2 py-0.5 rounded">
            <Info className="w-3 h-3" /> Suggestion
          </span>
        );
    }
  };

  const getCategoryLabel = (cat: FindingCategory) => {
    switch (cat) {
      case 'voice': return 'Voice & Tone';
      case 'facts': return 'Approved Facts';
      case 'compliance': return 'Compliance & Legal';
      case 'style': return 'Style & Clarity';
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Workbench Header & Target Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              Review Queue
              <span className="text-xs font-normal text-slate-400">
                · SPIRIT AI Hackathon Governance Engine
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Analyze draft communications against brand guidelines, verified benchmark claims, and legal requirements.
            </p>
          </div>

          {/* Engine indicator */}
          <div className="flex items-center gap-2 self-start md:self-auto">
            {aiConfigured ? (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-950/50 border border-emerald-800/40 rounded-lg text-xs text-emerald-400">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-medium">Gemini 3.5 Flash AI Engine</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-800/80 border border-slate-700 rounded-lg text-xs text-slate-300">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="font-medium">Demo Rule Engine (SPIRIT Heuristics)</span>
              </div>
            )}
          </div>
        </div>

        {/* Role & Channel Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Author Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as RoleType)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Publishing Channel
            </label>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value as ChannelType)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
            >
              {CHANNELS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Active Brand Rules
            </label>
            <div className="h-9 flex items-center px-3 bg-slate-950/60 border border-slate-800 rounded-lg text-xs text-slate-400">
              <span className="font-mono text-slate-200 font-semibold mr-1.5">
                {rules.filter(r => r.isActive).length}
              </span> 
              of {rules.length} active rules enforced
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Draft Samples
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setSampleMenuOpen(!sampleMenuOpen)}
                className="w-full flex items-center justify-between bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 transition-colors"
              >
                <span className="truncate">Load Realistic Sample...</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
              </button>

              {sampleMenuOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1 z-30">
                  <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 border-b border-slate-800">
                    SELECT A PRESET DRAFT
                  </div>
                  {SAMPLE_DRAFTS.map((sample) => (
                    <button
                      key={sample.id}
                      type="button"
                      onClick={() => handleLoadSample(sample)}
                      className="w-full text-left p-2.5 hover:bg-slate-800 rounded-lg transition-colors group"
                    >
                      <div className="text-xs font-semibold text-white group-hover:text-indigo-400">
                        {sample.name}
                      </div>
                      <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                        {sample.description}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1">
                        {sample.role} · {sample.channel}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Two-Column Workbench */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Editor & Controls (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm flex flex-col">
            {/* Editor Toolbar */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800">
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span className="font-semibold text-slate-300">Draft Content</span>
                <span>·</span>
                <span className="font-mono tabular-nums">{wordCount}</span> words
                <span>·</span>
                <span className="font-mono tabular-nums">{charCount}</span> chars
              </div>

              <div className="flex items-center gap-2">
                {content && (
                  <>
                    <button
                      type="button"
                      onClick={handleCopyContent}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setContent('');
                        setAnalysisResult(null);
                        onNotify('Editor cleared.', 'info');
                      }}
                      className="px-2.5 py-1 text-xs text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
                    >
                      Clear
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Textarea */}
            <div className="p-4 bg-slate-950">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={(e) => {
                  // Prevent triggering during composition (IME)
                  if (e.nativeEvent.isComposing) return;
                  // Handle Cmd+Enter or Ctrl+Enter
                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                    e.preventDefault();
                    if (!isAnalyzing && content.trim()) {
                      handleCheckContent();
                    }
                  }
                }}
                aria-label="Draft Content to Review"
                placeholder="Paste draft copy, announcement, or documentation here to evaluate against SPIRIT AI brand rules, or click 'Load Realistic Sample' above..."
                rows={12}
                className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-600 focus:outline-none resize-y font-normal leading-relaxed min-h-[260px]"
              />
            </div>

            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-slate-900 border-t border-slate-800">
              <div className="text-xs text-slate-400 flex items-center gap-2">
                <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] font-mono text-slate-400">
                  Ctrl / ⌘ + Enter
                </kbd>
                <span>to check content</span>
              </div>

              <button
                type="button"
                onClick={handleCheckContent}
                disabled={isAnalyzing || !content.trim()}
                className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold transition-all shadow-sm ${
                  isAnalyzing || !content.trim()
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20'
                }`}
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Analyzing Brand Guidelines...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Check Content</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick Guidance Box */}
          <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-xl text-xs text-slate-400 space-y-1.5">
            <div className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-indigo-400" />
              <span>SPIRIT AI Compliance Workflow</span>
            </div>
            <p>
              1. Load or paste text into the editor.
              <br />
              2. Click <strong className="text-slate-300">Check Content</strong> to run full governance checks.
              <br />
              3. Click <strong className="text-slate-300">Accept Fix</strong> to instantly apply recommended replacements to the draft.
            </p>
          </div>
        </div>

        {/* Right Column: Findings & Score Panel (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {isAnalyzing ? (
            /* Skeleton Loading State */
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4 animate-pulse">
              <div className="h-6 bg-slate-800 rounded w-1/3"></div>
              <div className="h-16 bg-slate-800 rounded w-full"></div>
              <div className="h-24 bg-slate-800 rounded w-full"></div>
              <div className="h-24 bg-slate-800 rounded w-full"></div>
            </div>
          ) : !analysisResult ? (
            /* Empty State */
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto text-slate-400">
                <FileText className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-white">
                  Ready for Review
                </h3>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  Paste draft content or load a sample draft to inspect compliance against active brand rules.
                </p>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => handleLoadSample(SAMPLE_DRAFTS[0])}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition-colors"
                >
                  <ArrowRight className="w-3 h-3 text-indigo-400" />
                  <span>Load Sample 1 (Marketing Launch)</span>
                </button>
              </div>
            </div>
          ) : (
            /* Active Analysis Results */
            <div className="space-y-4">
              {/* Score & Summary Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-medium text-slate-400">
                      Brand Compliance Score
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Evaluated for {analysisResult.channel}
                    </div>
                  </div>

                  <div className={`px-3 py-1.5 rounded-lg border text-base font-bold font-mono tabular-nums ${getScoreColor(score)}`}>
                    {score} / 100
                  </div>
                </div>

                {/* Score Progress Bar */}
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      score >= 90 ? 'bg-emerald-500' : score >= 70 ? 'bg-amber-500' : 'bg-rose-500'
                    }`}
                    style={{ width: `${score}%` }}
                  />
                </div>

                {/* Summary Prose */}
                <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/70 p-3 rounded-lg border border-slate-800/80">
                  {analysisResult.summary}
                </p>

                {/* Engine Source Badge */}
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-800/60">
                  <span>Engine: {analysisResult.engineModel || analysisResult.engine}</span>
                  <span className="font-mono tabular-nums">
                    {new Date(analysisResult.analyzedAt).toLocaleTimeString()}
                  </span>
                </div>
              </div>

              {/* Filter controls */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setSelectedSeverityFilter('all')}
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                      selectedSeverityFilter === 'all'
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    All ({activeFindings.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedSeverityFilter('critical')}
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                      selectedSeverityFilter === 'critical'
                        ? 'bg-rose-950 text-rose-300'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Critical ({activeFindings.filter(f => f.severity === 'critical').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedSeverityFilter('warning')}
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                      selectedSeverityFilter === 'warning'
                        ? 'bg-amber-950 text-amber-300'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Warnings ({activeFindings.filter(f => f.severity === 'warning').length})
                  </button>
                </div>

                <div className="text-xs text-slate-400">
                  {pendingFindings.length} pending / {resolvedFindings.length} resolved
                </div>
              </div>

              {/* Clean State: If all findings accepted or no findings */}
              {pendingFindings.length === 0 && (
                <div className="bg-emerald-950/30 border border-emerald-800/50 rounded-xl p-5 text-center space-y-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-emerald-200">
                      {activeFindings.length === 0
                        ? '100% Brand Compliant!'
                        : 'All Findings Addressed!'}
                    </h4>
                    <p className="text-xs text-slate-400 max-w-xs mx-auto">
                      This content meets all active SPIRIT AI brand rules, approved benchmark claims, and disclosure standards.
                    </p>
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={handleCopyContent}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Approved Copy</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Pending Findings List */}
              <div className="space-y-3">
                {pendingFindings.map((finding) => (
                  <div
                    key={finding.id}
                    className={`bg-slate-900 border rounded-xl p-4 space-y-3 transition-colors ${
                      finding.severity === 'critical'
                        ? 'border-rose-900/60 bg-gradient-to-b from-slate-900 to-rose-950/10'
                        : finding.severity === 'warning'
                        ? 'border-amber-900/60 bg-gradient-to-b from-slate-900 to-amber-950/10'
                        : 'border-slate-800'
                    }`}
                  >
                    {/* Finding Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {getSeverityBadge(finding.severity)}
                        <span className="text-xs font-medium text-slate-400">
                          {getCategoryLabel(finding.category)}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {finding.ruleReference}
                      </span>
                    </div>

                    {/* Flagged Context */}
                    <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-xs font-mono text-rose-300">
                      <span className="text-slate-500 select-none mr-2">Flagged:</span>
                      "{finding.flaggedText}"
                    </div>

                    {/* Explanation */}
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {finding.explanation}
                    </p>

                    {/* Suggested Fix */}
                    <div className="bg-emerald-950/30 p-2.5 rounded-lg border border-emerald-900/50 text-xs text-emerald-300">
                      <div className="text-[11px] font-semibold text-emerald-400 mb-1 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Recommended Fix:
                      </div>
                      <div className="font-mono">{finding.suggestedFix}</div>
                    </div>

                    {/* Manual Review Alert if flagged */}
                    {finding.requiresManualReview && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-950/50 border border-amber-800/60 rounded-lg text-xs text-amber-300">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>Manual Review Recommended: {finding.reviewReason}</span>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-800/60">
                      <button
                        type="button"
                        onClick={() => handleDismissFinding(finding)}
                        className="px-2.5 py-1 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
                      >
                        Dismiss
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAcceptFix(finding)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-medium transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Accept Fix</span>
                      </button>
                    </div>
                  </div>
                ))}

                {/* Resolved / Accepted Findings */}
                {resolvedFindings.length > 0 && (
                  <div className="pt-2 space-y-2">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-1">
                      Resolved ({resolvedFindings.length})
                    </div>
                    {resolvedFindings.map((finding) => (
                      <div
                        key={finding.id}
                        className="bg-slate-900/50 border border-slate-800/60 rounded-lg p-3 flex items-center justify-between gap-3 text-xs opacity-75"
                      >
                        <div className="flex items-center gap-2 truncate">
                          {finding.accepted ? (
                            <span className="text-emerald-400 flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" /> Accepted
                            </span>
                          ) : (
                            <span className="text-slate-500 flex items-center gap-1">
                              <X className="w-3.5 h-3.5" /> Dismissed
                            </span>
                          )}
                          <span className="text-slate-300 truncate font-mono">
                            "{finding.flaggedText}"
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleResetFinding(finding)}
                          className="text-[11px] text-slate-400 hover:text-white shrink-0"
                        >
                          Undo
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
