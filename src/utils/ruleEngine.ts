import { AnalysisResult, BrandRule, Finding, RoleType, ChannelType } from '../types/brandlens';

interface RuleMatchPattern {
  ruleId: string;
  pattern: RegExp | string;
  category: 'voice' | 'facts' | 'compliance' | 'style';
  severity: 'critical' | 'warning' | 'suggestion';
  explanation: string;
  suggestedFix: string;
}

const ENGINE_PATTERNS: RuleMatchPattern[] = [
  {
    ruleId: 'rule-brand-casing',
    pattern: /\b(SpiritAI|spirit\.ai|spirit\s+AI|Spirit\s+Ai|spiritAI|SpiritAi|spirit\s+ai|Spirit\s+ai|SPIRITAI)\b/g,
    category: 'facts',
    severity: 'critical',
    explanation: 'Violates official SPIRIT AI brand casing convention. The registered brand name is strictly "SPIRIT AI".',
    suggestedFix: 'SPIRIT AI'
  },
  {
    ruleId: 'rule-spirit-humility',
    pattern: /\b100%\s+hallucination-free\b/gi,
    category: 'voice',
    severity: 'critical',
    explanation: 'Unsubstantiated absolute claim. Enterprise guidelines require empirical benchmark verification rather than absolute claims.',
    suggestedFix: 'achieves verified precision across enterprise tests'
  },
  {
    ruleId: 'rule-spirit-humility',
    pattern: /\btotally\s+unhackable\b/gi,
    category: 'voice',
    severity: 'critical',
    explanation: 'Hyperbolic security claim. Compliance forbids absolute security guarantees.',
    suggestedFix: 'designed with robust security controls'
  },
  {
    ruleId: 'rule-spirit-humility',
    pattern: /\bcompletely\s+obliterates\s+existing\s+alternatives\b/gi,
    category: 'voice',
    severity: 'critical',
    explanation: 'Violates SPIRIT Humility & Integrity guideline. Unsubstantiated competitive smearing.',
    suggestedFix: 'offers measurable throughput advantages over traditional architectures'
  },
  {
    ruleId: 'rule-verified-benchmarks',
    pattern: /\b(10x|20x)\s+(faster|performance\s+leap)(?:\s+inference)?\b/gi,
    category: 'facts',
    severity: 'critical',
    explanation: 'Unverified benchmark multiplier. Only audited benchmark claims are approved by Brand Governance.',
    suggestedFix: 'up to 3.4x faster inference'
  },
  {
    ruleId: 'rule-security-compliance',
    pattern: /\b(military-grade\s+)?SOC\s*3(\s+impenetrable\s+data\s+shields)?\b/gi,
    category: 'compliance',
    severity: 'critical',
    explanation: 'Fictitious or incorrect certification tier. SPIRIT AI is certified under SOC 2 Type II and ISO/IEC 27001.',
    suggestedFix: 'SOC 2 Type II certification and ISO/IEC 27001:2022 compliance'
  },
  {
    ruleId: 'rule-ai-attribution',
    pattern: /\bwithout\s+any\s+(supervision\s+needed|oversight)\b/gi,
    category: 'compliance',
    severity: 'warning',
    explanation: 'Missing mandated AI assistance disclosure for autonomous enterprise actions.',
    suggestedFix: '(AI-assisted output; human review recommended before publication)'
  },
  {
    ruleId: 'rule-beta-disclaimer',
    pattern: /Deploy the Autonomous Agent Orchestrator directly to production/gi,
    category: 'compliance',
    severity: 'warning',
    explanation: 'Autonomous Agent Orchestrator is in Public Beta and cannot be marketed as enterprise production-ready without beta labeling.',
    suggestedFix: 'Evaluate the Autonomous Agent Orchestrator (currently in Public Beta)'
  },
  {
    ruleId: 'rule-tone-collaborative',
    pattern: /\b(completely\s+destroys\s+bloated\s+legacy\s+tools|crushes\s+legacy\s+dinosaurs)\b/gi,
    category: 'voice',
    severity: 'warning',
    explanation: 'Combative and unprofessional tone toward existing vendors. Violates brand voice standards.',
    suggestedFix: 'modernizes legacy enterprise workflows with high-efficiency pipelines'
  },
  {
    ruleId: 'rule-style-conciseness',
    pattern: /It is important to note that going forward into the foreseeable future/gi,
    category: 'style',
    severity: 'suggestion',
    explanation: 'Bureaucratic filler text that weakens message clarity and impact.',
    suggestedFix: 'Going forward'
  },
  {
    ruleId: 'rule-spirit-humility',
    pattern: /\bexperience\s+perfection\b/gi,
    category: 'voice',
    severity: 'suggestion',
    explanation: 'Subjective hyperbole unsupported by quantifiable metrics.',
    suggestedFix: 'experience reliable enterprise intelligence'
  }
];

export function analyzeContentWithRules(
  content: string,
  role: RoleType,
  channel: ChannelType,
  activeRules: BrandRule[],
  existingSessionId?: string
): AnalysisResult {
  const sessionId = existingSessionId || `session-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const trimmed = content.trim();
  const wordCount = trimmed ? trimmed.split(/\s+/).length : 0;
  const characterCount = content.length;

  if (!trimmed) {
    return {
      sessionId,
      overallScore: 100,
      summary: 'No content submitted for evaluation.',
      findings: [],
      analyzedAt: new Date().toISOString(),
      role,
      channel,
      wordCount: 0,
      characterCount: 0,
      engine: 'demo',
      engineModel: 'Demo Rule Engine (Heuristic Pattern Matcher)'
    };
  }

  const findings: Finding[] = [];
  const activeRuleIds = new Set(activeRules.filter(r => r.isActive).map(r => r.id));

  // Run pattern checks
  for (const item of ENGINE_PATTERNS) {
    if (!activeRuleIds.has(item.ruleId)) {
      continue;
    }

    const ruleObj = activeRules.find(r => r.id === item.ruleId);
    const ruleTitle = ruleObj ? ruleObj.title : 'Brand Governance Rule';

    if (item.pattern instanceof RegExp) {
      const regex = new RegExp(item.pattern.source, item.pattern.flags);
      let match: RegExpExecArray | null;
      while ((match = regex.exec(content)) !== null) {
        const flaggedText = match[0];
        if (item.ruleId === 'rule-brand-casing' && flaggedText === 'SPIRIT AI') {
          continue;
        }
        const startIndex = match.index;
        const endIndex = startIndex + flaggedText.length;

        // Check if an existing finding already covers this exact range
        const isDuplicateRange = findings.some(
          f => f.startIndex !== undefined && f.endIndex !== undefined &&
               ((startIndex >= f.startIndex && startIndex < f.endIndex) ||
                (endIndex > f.startIndex && endIndex <= f.endIndex))
        );

        if (!isDuplicateRange) {
          findings.push({
            id: `finding-${item.ruleId}-${findings.length + 1}`,
            category: item.category,
            severity: item.severity,
            flaggedText,
            explanation: item.explanation,
            ruleReference: ruleTitle,
            suggestedFix: item.suggestedFix,
            startIndex,
            endIndex,
            dismissed: false,
            accepted: false
          });
        }
      }
    }
  }

  // Check custom active rules created by user
  for (const rule of activeRules) {
    if (!rule.isSystem && rule.isActive && rule.avoidExample) {
      const avoidPhrase = rule.avoidExample.trim();
      if (!avoidPhrase) continue;

      let searchIndex = 0;
      const lowerContent = content.toLowerCase();
      const lowerAvoid = avoidPhrase.toLowerCase();

      while ((searchIndex = lowerContent.indexOf(lowerAvoid, searchIndex)) !== -1) {
        const startIndex = searchIndex;
        const endIndex = startIndex + avoidPhrase.length;
        const flaggedText = content.substring(startIndex, endIndex);

        const isDuplicateRange = findings.some(
          f => f.startIndex !== undefined && f.endIndex !== undefined &&
               ((startIndex >= f.startIndex && startIndex < f.endIndex) ||
                (endIndex > f.startIndex && endIndex <= f.endIndex))
        );

        if (!isDuplicateRange) {
          findings.push({
            id: `custom-finding-${rule.id}-${findings.length + 1}`,
            category: rule.category,
            severity: rule.severity,
            flaggedText,
            explanation: rule.description,
            ruleReference: rule.title,
            suggestedFix: rule.preferExample || 'Remove or rephrase based on brand guideline',
            startIndex,
            endIndex,
            dismissed: false,
            accepted: false
          });
        }

        searchIndex += avoidPhrase.length;
      }
    }
  }

  // Sort findings by position in document
  findings.sort((a, b) => (a.startIndex ?? 0) - (b.startIndex ?? 0));

  // Calculate score based on actual findings count and severity
  let scorePenalty = 0;
  for (const f of findings) {
    if (f.severity === 'critical') scorePenalty += 18;
    else if (f.severity === 'warning') scorePenalty += 10;
    else scorePenalty += 5;
  }
  const overallScore = Math.max(15, Math.min(100, 100 - scorePenalty));

  let summary = '';
  if (findings.length === 0) {
    summary = `Draft adheres to all ${activeRules.filter(r => r.isActive).length} active brand rules and approved SPIRIT AI facts. Verified for ${channel}.`;
  } else {
    const criticalCount = findings.filter(f => f.severity === 'critical').length;
    const warningCount = findings.filter(f => f.severity === 'warning').length;
    summary = `Detected ${findings.length} brand compliance ${findings.length === 1 ? 'item' : 'items'} (${criticalCount} critical, ${warningCount} warnings). Review suggested fixes before publication.`;
  }

  return {
    sessionId,
    overallScore,
    summary,
    findings,
    analyzedAt: new Date().toISOString(),
    role,
    channel,
    wordCount,
    characterCount,
    engine: 'demo',
    engineModel: 'Demo Rule Engine (SPIRIT Heuristics)'
  };
}
