import React, { useState } from 'react';
import { BrandRule, FindingCategory, FindingSeverity } from '../types/brandlens';
import { 
  BookOpen, 
  Search, 
  Plus, 
  Trash2, 
  Check, 
  X, 
  RotateCcw
} from 'lucide-react';
import { DEFAULT_BRAND_RULES } from '../data/defaultKnowledge';

interface KnowledgeBaseProps {
  rules: BrandRule[];
  setRules: React.Dispatch<React.SetStateAction<BrandRule[]>>;
  onNotify: (msg: string, type?: 'success' | 'info' | 'warning') => void;
}

export const KnowledgeBase: React.FC<KnowledgeBaseProps> = ({
  rules,
  setRules,
  onNotify
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | FindingCategory>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Rule Form State
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<FindingCategory>('voice');
  const [newSeverity, setNewSeverity] = useState<FindingSeverity>('warning');
  const [newDescription, setNewDescription] = useState('');
  const [newAvoid, setNewAvoid] = useState('');
  const [newPrefer, setNewPrefer] = useState('');

  // Toggle rule active status
  const handleToggleRule = (id: string) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isActive: !r.isActive } : r))
    );
    const target = rules.find((r) => r.id === id);
    onNotify(
      `Rule "${target?.title}" is now ${target?.isActive ? 'disabled' : 'active'}.`,
      'info'
    );
  };

  // Delete custom rule
  const handleDeleteRule = (id: string) => {
    const target = rules.find((r) => r.id === id);
    if (target?.isSystem) {
      onNotify('System rules cannot be deleted; you can toggle them inactive instead.', 'warning');
      return;
    }
    setRules((prev) => prev.filter((r) => r.id !== id));
    onNotify('Custom brand rule removed.', 'info');
  };

  // Reset to default rules
  const handleResetDefaults = () => {
    if (window.confirm('Reset all brand rules and approved facts to SPIRIT AI defaults?')) {
      setRules(DEFAULT_BRAND_RULES);
      onNotify('Brand rules reset to default SPIRIT AI configuration.', 'success');
    }
  };

  // Add new rule
  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDescription.trim()) {
      onNotify('Please provide both a Title and Description for the rule.', 'warning');
      return;
    }

    const createdRule: BrandRule = {
      id: `custom-rule-${Date.now()}`,
      title: newTitle.trim(),
      category: newCategory,
      severity: newSeverity,
      description: newDescription.trim(),
      avoidExample: newAvoid.trim(),
      preferExample: newPrefer.trim(),
      isActive: true,
      isSystem: false
    };

    setRules((prev) => [createdRule, ...prev]);
    setIsModalOpen(false);

    // Reset form
    setNewTitle('');
    setNewCategory('voice');
    setNewSeverity('warning');
    setNewDescription('');
    setNewAvoid('');
    setNewPrefer('');

    onNotify(`Added new rule: "${createdRule.title}"`, 'success');
  };

  // Filtering
  const filteredRules = rules.filter((rule) => {
    if (selectedCategory !== 'all' && rule.category !== selectedCategory) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = rule.title.toLowerCase().includes(q);
      const matchDesc = rule.description.toLowerCase().includes(q);
      const matchAvoid = rule.avoidExample.toLowerCase().includes(q);
      const matchPrefer = rule.preferExample.toLowerCase().includes(q);
      return matchTitle || matchDesc || matchAvoid || matchPrefer;
    }
    return true;
  });

  const activeCount = rules.filter((r) => r.isActive).length;
  const customCount = rules.filter((r) => !r.isSystem).length;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Knowledge Base Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-400" />
              Brand Knowledge & Approved Facts
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Active governance rules, verified benchmark numbers, and legal disclaimers used by the Review Queue.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium border border-slate-700 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Defaults</span>
            </button>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Brand Rule</span>
            </button>
          </div>
        </div>

        {/* Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-800">
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <div className="text-[11px] text-slate-400 font-medium">Total Rules</div>
            <div className="text-lg font-bold font-mono text-white mt-0.5 tabular-nums">
              {rules.length}
            </div>
          </div>
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <div className="text-[11px] text-slate-400 font-medium">Active Enforced</div>
            <div className="text-lg font-bold font-mono text-emerald-400 mt-0.5 tabular-nums">
              {activeCount}
            </div>
          </div>
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <div className="text-[11px] text-slate-400 font-medium">SPIRIT System Rules</div>
            <div className="text-lg font-bold font-mono text-indigo-400 mt-0.5 tabular-nums">
              {rules.length - customCount}
            </div>
          </div>
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <div className="text-[11px] text-slate-400 font-medium">Custom User Rules</div>
            <div className="text-lg font-bold font-mono text-amber-400 mt-0.5 tabular-nums">
              {customCount}
            </div>
          </div>
        </div>
      </div>

      {/* Search & Category Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search rules, keywords, or examples..."
            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg overflow-x-auto text-xs">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors ${
              selectedCategory === 'all'
                ? 'bg-slate-800 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All Categories
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('voice')}
            className={`px-3 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors ${
              selectedCategory === 'voice'
                ? 'bg-slate-800 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Voice & Tone
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('facts')}
            className={`px-3 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors ${
              selectedCategory === 'facts'
                ? 'bg-slate-800 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Approved Facts
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('compliance')}
            className={`px-3 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors ${
              selectedCategory === 'compliance'
                ? 'bg-slate-800 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Compliance & Legal
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('style')}
            className={`px-3 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors ${
              selectedCategory === 'style'
                ? 'bg-slate-800 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Style & Clarity
          </button>
        </div>
      </div>

      {/* Rules Grid */}
      {filteredRules.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center space-y-2">
          <BookOpen className="w-8 h-8 text-slate-600 mx-auto" />
          <h3 className="text-sm font-semibold text-white">No Matching Rules Found</h3>
          <p className="text-xs text-slate-400">
            Try adjusting your search query or category filter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRules.map((rule) => (
            <div
              key={rule.id}
              className={`bg-slate-900 border rounded-xl p-5 space-y-3.5 transition-all ${
                rule.isActive
                  ? 'border-slate-800 hover:border-slate-700 shadow-sm'
                  : 'border-slate-800/50 opacity-60 bg-slate-950'
              }`}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${
                        rule.category === 'facts'
                          ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-800/40'
                          : rule.category === 'compliance'
                          ? 'bg-rose-950/70 text-rose-400 border border-rose-800/40'
                          : rule.category === 'voice'
                          ? 'bg-indigo-950/70 text-indigo-400 border border-indigo-800/40'
                          : 'bg-sky-950/70 text-sky-400 border border-sky-800/40'
                      }`}
                    >
                      {rule.category}
                    </span>

                    {rule.isSystem ? (
                      <span className="text-[10px] font-mono text-slate-500">
                        SPIRIT Core
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-amber-400/80">
                        Custom User Rule
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-semibold text-white leading-snug">
                    {rule.title}
                  </h3>
                </div>

                {/* Active Toggle Switch */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggleRule(rule.id)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      rule.isActive ? 'bg-indigo-600' : 'bg-slate-800'
                    }`}
                    title={rule.isActive ? 'Disable rule' : 'Enable rule'}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        rule.isActive ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>

                  {!rule.isSystem && (
                    <button
                      type="button"
                      onClick={() => handleDeleteRule(rule.id)}
                      className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                      title="Delete custom rule"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Description */}
              <p className="text-xs text-slate-300 leading-relaxed">
                {rule.description}
              </p>

              {/* Examples Comparison */}
              {(rule.avoidExample || rule.preferExample) && (
                <div className="space-y-2 pt-2 border-t border-slate-800 text-xs">
                  {rule.avoidExample && (
                    <div className="bg-rose-950/30 border border-rose-900/40 p-2.5 rounded-lg text-rose-300">
                      <div className="text-[10px] font-bold text-rose-400 uppercase tracking-wide mb-1 flex items-center gap-1">
                        <X className="w-3 h-3" /> Avoid
                      </div>
                      <div className="font-mono text-xs">"{rule.avoidExample}"</div>
                    </div>
                  )}

                  {rule.preferExample && (
                    <div className="bg-emerald-950/30 border border-emerald-900/40 p-2.5 rounded-lg text-emerald-300">
                      <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wide mb-1 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Approved / Preferred
                      </div>
                      <div className="font-mono text-xs">"{rule.preferExample}"</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add New Rule Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-400" />
                Add Brand Governance Rule
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddRule} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Rule Title
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g., Claim Verification: Enterprise SLA Guarantee"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Category
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as FindingCategory)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="voice">Voice & Tone</option>
                    <option value="facts">Approved Facts</option>
                    <option value="compliance">Compliance & Legal</option>
                    <option value="style">Style & Clarity</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Severity
                  </label>
                  <select
                    value={newSeverity}
                    onChange={(e) => setNewSeverity(e.target.value as FindingSeverity)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="critical">Critical</option>
                    <option value="warning">Warning</option>
                    <option value="suggestion">Suggestion</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Description & Guidance
                </label>
                <textarea
                  required
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Explain why this rule exists and how authors should adhere to it..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Phrase or Pattern to Avoid
                </label>
                <input
                  type="text"
                  value={newAvoid}
                  onChange={(e) => setNewAvoid(e.target.value)}
                  placeholder='e.g., "100% unbreakable uptime"'
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Approved / Preferred Replacement
                </label>
                <input
                  type="text"
                  value={newPrefer}
                  onChange={(e) => setNewPrefer(e.target.value)}
                  placeholder='e.g., "99.95% enterprise uptime SLA"'
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                >
                  Save Brand Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
