import { BrandRule } from '../types/brandlens';

export const DEFAULT_BRAND_RULES: BrandRule[] = [
  {
    id: 'rule-spirit-humility',
    title: 'SPIRIT Integrity: Avoid Hyperbole & Unsubstantiated Absolutes',
    category: 'voice',
    severity: 'critical',
    description: 'Do not use exaggerated, unprovable marketing buzzwords such as "100% hallucination-free", "world\'s best AI", "totally unhackable", or "infinitely scalable". Brand communications must remain humble, evidence-backed, and grounded.',
    avoidExample: 'Our model is 100% error-free and completely obliterates existing alternatives.',
    preferExample: 'Validated on benchmark datasets, our model achieves verified precision across enterprise tests.',
    isActive: true,
    isSystem: true
  },
  {
    id: 'rule-brand-casing',
    title: 'Brand Naming: Canonical "SPIRIT AI" Casing',
    category: 'facts',
    severity: 'critical',
    description: 'The official brand name must always be written in uppercase as "SPIRIT AI". Avoid improper variations such as "SpiritAI", "spirit.ai", "Spirit Ai", or "spirit AI".',
    avoidExample: 'Welcome to SpiritAI Studio where our spirit AI models run.',
    preferExample: 'Welcome to SPIRIT AI Studio where our SPIRIT AI models run.',
    isActive: true,
    isSystem: true
  },
  {
    id: 'rule-verified-benchmarks',
    title: 'Approved Fact: Maximum Verified Inference Speedup (3.4x)',
    category: 'facts',
    severity: 'critical',
    description: 'Only cite benchmark gains that have undergone third-party audit. The approved inference speed claim is "up to 3.4x faster inference on validated enterprise workloads". Do not claim 10x, 20x, or arbitrary multipliers without audit approval.',
    avoidExample: 'SPIRIT AI runs 10x faster than GPT and Claude combined.',
    preferExample: 'SPIRIT AI delivers up to 3.4x faster inference on validated enterprise workloads.',
    isActive: true,
    isSystem: true
  },
  {
    id: 'rule-security-compliance',
    title: 'Security & Certifications: SOC 2 Type II and ISO 27001',
    category: 'compliance',
    severity: 'critical',
    description: 'Do not state false certifications such as "SOC 3 certified" or "impenetrable security". The approved compliance profile is "SOC 2 Type II certified and ISO/IEC 27001:2022 compliant".',
    avoidExample: 'Backed by military-grade SOC 3 impenetrable data shields.',
    preferExample: 'Operating under SOC 2 Type II certification and ISO/IEC 27001:2022 compliance.',
    isActive: true,
    isSystem: true
  },
  {
    id: 'rule-ai-attribution',
    title: 'Transparency: AI Assistance Disclosure',
    category: 'compliance',
    severity: 'warning',
    description: 'When releasing automated or generated workflows to customers, state clearly: "AI-assisted output; human review recommended before publication." Transparent disclosure maintains customer trust.',
    avoidExample: 'Autonomous agent publishes all your executive emails without any oversight.',
    preferExample: 'Autonomous agent drafts suggested communications (AI-assisted output; human review recommended before publication).',
    isActive: true,
    isSystem: true
  },
  {
    id: 'rule-beta-disclaimer',
    title: 'Product Lifecycle: Public Beta Notice for Autonomous Agent',
    category: 'compliance',
    severity: 'warning',
    description: 'The Autonomous Agent Orchestrator is currently in Public Beta. All mentions must denote its beta lifecycle status to set accurate client expectations.',
    avoidExample: 'Deploy the Autonomous Agent Orchestrator directly to production today.',
    preferExample: 'Evaluate the Autonomous Agent Orchestrator (currently in Public Beta) in your development environment.',
    isActive: true,
    isSystem: true
  },
  {
    id: 'rule-tone-collaborative',
    title: 'Tone: Respectful & Solution-Oriented (No Competitor Smearing)',
    category: 'voice',
    severity: 'warning',
    description: 'Focus on SPIRIT AI strengths rather than aggressive derogatory attacks on competitors (e.g., avoid "crushes legacy dinosaurs", "kills slow tools").',
    avoidExample: 'Our engine completely destroys bloated legacy tools.',
    preferExample: 'Our engine eliminates architectural bottlenecks to streamline high-throughput workflows.',
    isActive: true,
    isSystem: true
  },
  {
    id: 'rule-style-conciseness',
    title: 'Clarity & Style: Direct Action and Tabular Precision',
    category: 'style',
    severity: 'suggestion',
    description: 'Avoid vague bureaucratic filler phrases like "it is important to note that" or "going forward into the future". Lead with concrete nouns, active verbs, and specific metrics.',
    avoidExample: 'It should be noted that going forward into the foreseeable future we aim to help teams.',
    preferExample: 'SPIRIT AI helps enterprise teams automate compliance audits in minutes.',
    isActive: true,
    isSystem: true
  }
];

export interface SampleDraft {
  id: string;
  name: string;
  role: string;
  channel: string;
  description: string;
  content: string;
}

export const SAMPLE_DRAFTS: SampleDraft[] = [
  {
    id: 'sample-marketing-hyperbolic',
    name: 'Marketing Launch Post (Multiple Violations)',
    role: 'Marketing & Growth',
    channel: 'Social Post (X/LinkedIn)',
    description: 'Features hyperbolic claims, brand misspellings, unapproved 10x benchmark, and missing disclaimer.',
    content: `🚀 Today we are thrilled to unleash SpiritAI v2.4 to the universe!

Our spirit AI models are 100% hallucination-free and totally unhackable. Independent tests confirm our new architecture is 10x faster than everyone else on the market and completely obliterates existing alternatives.

It is important to note that going forward into the foreseeable future, our Autonomous Agent Orchestrator can handle all corporate decisions without any supervision needed!

Check out SpiritAI today and experience perfection.`
  },
  {
    id: 'sample-devrel-announcement',
    name: 'Developer Release Notes (Benchmark & Beta Flags)',
    role: 'Developer Relations',
    channel: 'Developer Documentation',
    description: 'Contains unofficial name casing "spirit.ai", unverified 20x claim, and missing beta disclaimer.',
    content: `spirit.ai SDK v2.4 Release Notes:

We have upgraded our inference engine with zero latency overhead. Developers will experience a 20x performance leap on heavy matrix workloads compared to any legacy system.

Deploy the Autonomous Agent Orchestrator directly to production pipelines today. Our API guarantees zero bugs and 100% uptime with military-grade SOC 3 impenetrable data shields.

Get started with npm install @spirit-ai/core.`
  },
  {
    id: 'sample-pr-executive',
    name: 'Executive PR Statement (Tone & Certification Flags)',
    role: 'Executive PR & Comms',
    channel: 'Blog Post & Press Release',
    description: 'Contains aggressive competitor smearing, inaccurate SOC 3 claim, and unverified promises.',
    content: `FOR IMMEDIATE RELEASE:

SPIRIT AI today announced a transformative breakthrough that completely destroys bloated legacy tools and crushes legacy dinosaurs in the enterprise software space.

Our revolutionary platform is backed by military-grade SOC 3 impenetrable data shields and provides an unbreakable guarantee against system failure. Going forward, enterprise customers can replace their entire compliance department with our autonomous workflows.

Join us in pioneering the future of absolute artificial intelligence.`
  },
  {
    id: 'sample-clean-compliant',
    name: 'Compliant & Verified Post (High Score Example)',
    role: 'Marketing & Growth',
    channel: 'Social Post (X/LinkedIn)',
    description: 'Demonstrates approved SPIRIT AI guidelines, 3.4x verified benchmark citation, and proper disclaimers.',
    content: `We are pleased to introduce SPIRIT AI Studio v2.4, engineered for mission-critical enterprise workflows.

Validated on third-party industry benchmarks, SPIRIT AI delivers up to 3.4x faster inference on validated enterprise workloads while maintaining strict data governance. Our platform operates under SOC 2 Type II certification and ISO/IEC 27001:2022 compliance.

Teams can also evaluate the Autonomous Agent Orchestrator (currently in Public Beta) to assist with high-throughput document verification (AI-assisted output; human review recommended before publication).

Learn more about our methodology and verified benchmarks at spirit-ai.internal/benchmarks.`
  }
];
