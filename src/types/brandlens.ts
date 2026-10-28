export type RoleType = 
  | 'Marketing & Growth'
  | 'Developer Relations'
  | 'Executive PR & Comms'
  | 'Product Management'
  | 'Legal & Compliance';

export type ChannelType = 
  | 'Social Post (X/LinkedIn)'
  | 'Blog Post & Press Release'
  | 'Developer Documentation'
  | 'Customer Email / Announcement'
  | 'Investor & Board Update';

export type FindingCategory = 'voice' | 'facts' | 'compliance' | 'style';
export type FindingSeverity = 'critical' | 'warning' | 'suggestion';

export interface Finding {
  id: string;
  category: FindingCategory;
  severity: FindingSeverity;
  flaggedText: string;
  explanation: string;
  ruleReference: string;
  suggestedFix: string;
  startIndex?: number;
  endIndex?: number;
  dismissed?: boolean;
  accepted?: boolean;
  requiresManualReview?: boolean;
  reviewReason?: string;
  appliedFixText?: string;
  originalReplacedText?: string;
}

export interface AnalysisResult {
  sessionId: string;
  overallScore: number;
  summary: string;
  findings: Finding[];
  analyzedAt: string;
  role: RoleType;
  channel: ChannelType;
  wordCount: number;
  characterCount: number;
  engine: 'gemini' | 'demo';
  engineModel?: string;
}

export interface BrandRule {
  id: string;
  title: string;
  category: FindingCategory;
  severity: FindingSeverity;
  description: string;
  avoidExample: string;
  preferExample: string;
  isActive: boolean;
  isSystem?: boolean;
}

export interface AuditRecord {
  id: string;
  timestamp: string;
  role: RoleType;
  channel: ChannelType;
  snippet: string;
  initialScore: number;
  currentScore: number;
  issuesCount: number;
  acceptedCount: number;
  dismissedCount: number;
  engine: 'gemini' | 'demo';
}
