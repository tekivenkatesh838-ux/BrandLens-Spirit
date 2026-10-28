import React from 'react';
import { AuditRecord } from '../types/brandlens';
import { 
  BarChart3, 
  Download, 
  Trash2, 
  Clock, 
  ArrowUpRight, 
  ExternalLink 
} from 'lucide-react';

interface InsightsViewProps {
  auditRecords: AuditRecord[];
  onClearHistory: () => void;
  onSelectRecordForReview: (snippet: string, role: string, channel: string) => void;
  onNotify: (msg: string, type?: 'success' | 'info' | 'warning') => void;
  onGoToReview: () => void;
}

export const InsightsView: React.FC<InsightsViewProps> = ({
  auditRecords,
  onClearHistory,
  onSelectRecordForReview,
  onNotify,
  onGoToReview
}) => {
  // Compute authentic stats strictly from actual application data
  const totalReviews = auditRecords.length;
  const totalIssuesDetected = auditRecords.reduce((sum, r) => sum + r.issuesCount, 0);
  const totalFixesAccepted = auditRecords.reduce((sum, r) => sum + r.acceptedCount, 0);
  const totalDismissed = auditRecords.reduce((sum, r) => sum + r.dismissedCount, 0);

  const acceptanceRate = totalIssuesDetected > 0
    ? Math.round((totalFixesAccepted / totalIssuesDetected) * 100)
    : 0;

  const avgInitialScore = totalReviews > 0
    ? Math.round(auditRecords.reduce((sum, r) => sum + r.initialScore, 0) / totalReviews)
    : 0;

  const avgCurrentScore = totalReviews > 0
    ? Math.round(auditRecords.reduce((sum, r) => sum + r.currentScore, 0) / totalReviews)
    : 0;

  const scoreImprovement = avgCurrentScore - avgInitialScore;

  // Breakdown by Role
  const roleCounts: Record<string, number> = {};
  for (const r of auditRecords) {
    roleCounts[r.role] = (roleCounts[r.role] || 0) + 1;
  }

  // Breakdown by Channel
  const channelCounts: Record<string, number> = {};
  for (const r of auditRecords) {
    channelCounts[r.channel] = (channelCounts[r.channel] || 0) + 1;
  }

  const handleExportJSON = () => {
    if (auditRecords.length === 0) {
      onNotify('No audit logs available to export.', 'warning');
      return;
    }
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(auditRecords, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `brandlens-audit-log-${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    onNotify('Audit logs exported successfully.', 'success');
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-400" />
              Governance Insights & Audit Trail
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Operational metrics and compliance history derived directly from content evaluated in BrandLens.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportJSON}
              disabled={totalReviews === 0}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                totalReviews === 0
                  ? 'bg-slate-800/50 text-slate-600 border-slate-800 cursor-not-allowed'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Audit Trail (JSON)</span>
            </button>

            {totalReviews > 0 && (
              <button
                type="button"
                onClick={onClearHistory}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 rounded-lg text-xs font-medium border border-slate-700 hover:border-rose-800/40 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear History</span>
              </button>
            )}
          </div>
        </div>

        {/* Real KPIs derived from actual state */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-slate-800">
          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
            <div className="text-xs text-slate-400 font-medium">Evaluations Conducted</div>
            <div className="text-2xl font-bold font-mono text-white mt-1 tabular-nums">
              {totalReviews}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Active sessions tracked
            </div>
          </div>

          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
            <div className="text-xs text-slate-400 font-medium">Total Issues Flagged</div>
            <div className="text-2xl font-bold font-mono text-amber-400 mt-1 tabular-nums">
              {totalIssuesDetected}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {totalFixesAccepted} accepted · {totalDismissed} dismissed
            </div>
          </div>

          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
            <div className="text-xs text-slate-400 font-medium">Fix Acceptance Rate</div>
            <div className="text-2xl font-bold font-mono text-emerald-400 mt-1 tabular-nums">
              {acceptanceRate}%
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Suggested changes applied
            </div>
          </div>

          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
            <div className="text-xs text-slate-400 font-medium">Average Compliance Score</div>
            <div className="text-2xl font-bold font-mono text-indigo-400 mt-1 tabular-nums">
              {avgCurrentScore > 0 ? `${avgCurrentScore}/100` : '—'}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {scoreImprovement > 0 ? `+${scoreImprovement} pts after fixes` : 'Baseline score'}
            </div>
          </div>
        </div>
      </div>

      {totalReviews === 0 ? (
        /* Empty State */
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto text-slate-400">
            <Clock className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-white">No Audit History Recorded Yet</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Run content checks in the Review Queue. Every review, accepted fix, and dismissal will generate verifiable audit metrics here.
            </p>
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={onGoToReview}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Go to Review Queue</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Distribution by Role & Channel */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Activity by Author Role
              </h3>
              <div className="space-y-2">
                {Object.entries(roleCounts).map(([role, count]) => (
                  <div key={role} className="flex items-center justify-between text-xs">
                    <span className="text-slate-300">{role}</span>
                    <div className="flex items-center gap-3">
                      <div className="w-24 bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-indigo-500 h-full rounded-full"
                          style={{ width: `${Math.round((count / totalReviews) * 100)}%` }}
                        />
                      </div>
                      <span className="font-mono text-slate-400 tabular-nums w-8 text-right">
                        {count} ({Math.round((count / totalReviews) * 100)}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Activity by Channel
              </h3>
              <div className="space-y-2">
                {Object.entries(channelCounts).map(([chan, count]) => (
                  <div key={chan} className="flex items-center justify-between text-xs">
                    <span className="text-slate-300">{chan}</span>
                    <div className="flex items-center gap-3">
                      <div className="w-24 bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full"
                          style={{ width: `${Math.round((count / totalReviews) * 100)}%` }}
                        />
                      </div>
                      <span className="font-mono text-slate-400 tabular-nums w-8 text-right">
                        {count} ({Math.round((count / totalReviews) * 100)}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Audit Trail Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Detailed Audit Records ({auditRecords.length})
              </h3>
              <span className="text-[11px] text-slate-500">
                Sorted by most recent
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-slate-400 text-[11px] font-semibold border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Author Role</th>
                    <th className="px-4 py-3">Channel</th>
                    <th className="px-4 py-3">Content Excerpt</th>
                    <th className="px-4 py-3 text-center">Score Delta</th>
                    <th className="px-4 py-3 text-center">Issues</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-normal">
                  {auditRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-400 tabular-nums whitespace-nowrap">
                        {new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                      <td className="px-4 py-3 font-medium text-white whitespace-nowrap">
                        {record.role}
                      </td>
                      <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                        {record.channel}
                      </td>
                      <td className="px-4 py-3 max-w-xs truncate text-slate-300 font-mono text-[11px]">
                        "{record.snippet}"
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span className="font-mono tabular-nums text-slate-400">
                          {record.initialScore}
                        </span>
                        <span className="text-slate-600 mx-1">→</span>
                        <span className={`font-mono font-semibold tabular-nums ${
                          record.currentScore >= 90
                            ? 'text-emerald-400'
                            : record.currentScore >= 70
                            ? 'text-amber-400'
                            : 'text-rose-400'
                        }`}>
                          {record.currentScore}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap font-mono tabular-nums text-[11px]">
                        <span className="text-amber-400">{record.issuesCount} found</span>
                        <span className="text-slate-600 mx-1">·</span>
                        <span className="text-emerald-400">{record.acceptedCount} fixed</span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onSelectRecordForReview(record.snippet, record.role, record.channel)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white rounded transition-colors"
                        >
                          <span>Re-open</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
