import { Finding } from '../types/brandlens';

export interface SafeReplacementResult {
  newContent: string;
  replaced: boolean;
  actualStart: number;
  actualEnd: number;
  delta: number;
  absorbedPrefix?: string;
  absorbedSuffix?: string;
  requiresManualReview?: boolean;
  reviewReason?: string;
  appliedFix: string;
  originalReplacedText?: string;
}

// Set of recognized finite active verbs (3rd-person singular present or base present forms)
// Note: Past participles (-ed) following copulas (e.g. "is designed", "is fortified")
// function as predicate adjectives / passive complements and must NOT absorb the copula.
const FINITE_ACTIVE_VERBS = new Set([
  'achieve', 'achieves',
  'deliver', 'delivers',
  'provide', 'provides',
  'offer', 'offers',
  'operate', 'operates',
  'eliminate', 'eliminates',
  'help', 'helps',
  'modernize', 'modernizes',
  'guarantee', 'guarantees',
  'feature', 'features',
  'demonstrate', 'demonstrates',
  'include', 'includes',
  'support', 'supports',
  'protect', 'protects',
  'replace', 'replaces',
  'reduce', 'reduces',
  'accelerate', 'accelerates',
  'scale', 'scales',
  'run', 'runs',
  'meet', 'meets',
  'maintain', 'maintains',
  'exceed', 'exceeds',
  'perform', 'performs',
  'ensure', 'ensures',
  'verify', 'verifies',
  'empower', 'empowers',
  'streamline', 'streamlines',
  'serve', 'serves',
  'lead', 'leads',
  'bring', 'brings',
  'give', 'gives'
]);

/**
 * Checks if a string starts with a finite active verb (e.g. "achieves", "delivers")
 * as opposed to participles ("designed", "fortified", "achieving") or nouns/adjectives.
 */
export function startsWithFiniteVerb(text: string): boolean {
  const trimmed = text.trim();
  const firstWordMatch = trimmed.match(/^[a-zA-Z]+/);
  if (!firstWordMatch) return false;
  const firstWord = firstWordMatch[0].toLowerCase();

  if (FINITE_ACTIVE_VERBS.has(firstWord)) return true;

  // General 3rd-person singular present verbs (-s / -es), excluding common non-verbs
  if (/^[a-z]+(?:s|es)$/i.test(firstWord)) {
    const nonVerbs = new Set([
      'this', 'is', 'as', 'us', 'yes', 'always', 'less', 'series',
      'status', 'process', 'business', 'continuous', 'rigorous',
      'autonomous', 'various', 'obvious', 'previous', 'plus', 'minus'
    ]);
    if (!nonVerbs.has(firstWord) && firstWord.length > 3) {
      return true;
    }
  }

  return false;
}

/**
 * Determines whether the replacement requires manual review due to ambiguity,
 * missing offsets with repeated phrases, or placeholders.
 */
export function evaluateReviewRequirement(
  content: string,
  finding: Finding,
  occurrences: number[]
): { requiresReview: boolean; reason?: string } {
  // Check for unresolved placeholders in suggestedFix
  if (/\[(?:insert|tbd|placeholder|date|metrics?|link)[\s\w]*\]/i.test(finding.suggestedFix) ||
      /\b(?:TODO|TBD|FIXME)\b/.test(finding.suggestedFix)) {
    return {
      requiresReview: true,
      reason: 'Suggested fix contains template placeholders requiring manual author review.'
    };
  }

  // Check for identical flagged and fix
  if (finding.flaggedText.trim().toLowerCase() === finding.suggestedFix.trim().toLowerCase()) {
    return {
      requiresReview: true,
      reason: 'Suggested replacement is identical to flagged text.'
    };
  }

  // Check for ambiguous repeated identical phrases when no reliable offset is available
  if (occurrences.length > 1) {
    if (finding.startIndex === undefined || finding.endIndex === undefined) {
      return {
        requiresReview: true,
        reason: `Found ${occurrences.length} identical occurrences of "${finding.flaggedText}" with no source offset.`
      };
    }
    // If startIndex is given but none of the occurrences is close to it
    const hasCloseOccurrence = occurrences.some(idx => Math.abs(idx - finding.startIndex!) <= 20);
    if (!hasCloseOccurrence) {
      return {
        requiresReview: true,
        reason: `Text modified: ${occurrences.length} identical occurrences found, but none aligns with original offset.`
      };
    }
  }

  return { requiresReview: false };
}

/**
 * Applies a finding's suggested fix to content while preventing grammatical collisions:
 * - Prevents copula collisions (e.g. "is achieves" -> "achieves")
 * - Prevents duplicate articles (e.g. "a a" -> "a")
 * - Prevents duplicate words (e.g. "is is" -> "is")
 * - Prevents double punctuation (e.g. "tests.." -> "tests.")
 * - Adjusts mid-sentence trailing punctuation when connecting with conjunctions
 * - Preserves exact occurrence by source offsets and shifts downstream offsets safely
 * - Flags for review when safe correction cannot be determined
 */
export function applySafeReplacement(
  content: string,
  finding: Finding
): SafeReplacementResult {
  // 1. Locate all occurrences of flaggedText in content
  const occurrences: number[] = [];
  let searchIdx = 0;
  while ((searchIdx = content.indexOf(finding.flaggedText, searchIdx)) !== -1) {
    occurrences.push(searchIdx);
    searchIdx += Math.max(1, finding.flaggedText.length);
  }

  // Check review requirement
  const reviewCheck = evaluateReviewRequirement(content, finding, occurrences);

  // Determine target bounds
  let targetStart: number | undefined;
  let targetEnd: number | undefined;

  // Strategy A: Exact verified source offset
  if (
    finding.startIndex !== undefined &&
    finding.endIndex !== undefined &&
    finding.startIndex >= 0 &&
    finding.endIndex <= content.length &&
    content.slice(finding.startIndex, finding.endIndex) === finding.flaggedText
  ) {
    targetStart = finding.startIndex;
    targetEnd = finding.endIndex;
  } else if (occurrences.length === 1) {
    // Strategy B: Unique substring match
    targetStart = occurrences[0];
    targetEnd = targetStart + finding.flaggedText.length;
  } else if (occurrences.length > 1) {
    // Strategy C: Multiple occurrences - pick closest to original startIndex
    if (finding.startIndex !== undefined) {
      targetStart = occurrences.reduce((closest, curr) =>
        Math.abs(curr - finding.startIndex!) < Math.abs(closest - finding.startIndex!) ? curr : closest
      , occurrences[0]);
      targetEnd = targetStart + finding.flaggedText.length;
    } else {
      targetStart = occurrences[0];
      targetEnd = targetStart + finding.flaggedText.length;
    }
  }

  if (targetStart === undefined || targetEnd === undefined) {
    return {
      newContent: content,
      replaced: false,
      actualStart: -1,
      actualEnd: -1,
      delta: 0,
      requiresManualReview: true,
      reviewReason: `Could not locate "${finding.flaggedText}" in text (it may have already been modified).`,
      appliedFix: finding.suggestedFix
    };
  }

  // If review is strictly required due to ambiguity, do not alter surrounding text
  if (reviewCheck.requiresReview) {
    const rawReplacement = content.slice(0, targetStart) + finding.suggestedFix + content.slice(targetEnd);
    return {
      newContent: rawReplacement,
      replaced: true,
      actualStart: targetStart,
      actualEnd: targetEnd,
      delta: finding.suggestedFix.length - (targetEnd - targetStart),
      requiresManualReview: true,
      reviewReason: reviewCheck.reason,
      appliedFix: finding.suggestedFix
    };
  }

  // 2. Analyze surrounding context for grammatical collisions
  let effectiveStart = targetStart;
  let effectiveEnd = targetEnd;
  let effectiveFix = finding.suggestedFix;
  let absorbedPrefix: string | undefined;
  let absorbedSuffix: string | undefined;

  const prefix = content.slice(0, targetStart);
  const suffix = content.slice(targetEnd);

  // Check A: Copula collision with finite verb
  // e.g. "Our product is " + "achieves a 94.2%..." -> absorb "is "
  const copulaMatch = prefix.match(/(?:(?:\b|\s)(is|are|was|were|am|has\s+been|have\s+been|had\s+been)|['’](?:s|re|m))\s+$/i);
  if (copulaMatch && startsWithFiniteVerb(effectiveFix)) {
    const matchedStr = copulaMatch[0];
    // Remove any leading space from matchedStr so we keep word boundaries intact
    const copulaWithTrailingSpace = matchedStr.replace(/^\s+/, '');
    const absorbLen = copulaWithTrailingSpace.length;
    absorbedPrefix = prefix.slice(prefix.length - absorbLen);
    effectiveStart = targetStart - absorbLen;
  }

  // Check B: Duplicate identical word collision (e.g. "is is", "the the", "a a")
  const firstFixWordMatch = effectiveFix.trim().match(/^[a-zA-Z]+/);
  if (firstFixWordMatch) {
    const firstWord = firstFixWordMatch[0];
    const prefixWordMatch = content.slice(0, effectiveStart).match(new RegExp(`(?:^|\\s)(${firstWord})\\s+$`, 'i'));
    if (prefixWordMatch) {
      const matchedStr = prefixWordMatch[0].replace(/^\s+/, '');
      effectiveStart -= matchedStr.length;
      absorbedPrefix = (absorbedPrefix || '') + matchedStr;
    }
  }

  // Check B2: Duplicate boundary word overlap at suffix
  // e.g. effectiveFix ends with "inference" and suffix begins with " inference." -> absorb duplicate word from suffix
  const fixWords = effectiveFix.trimEnd().replace(/[.,!?;:)\]]+$/, '').split(/\s+/);
  if (fixWords.length > 0) {
    const maxOverlap = Math.min(fixWords.length, 3);
    for (let count = maxOverlap; count >= 1; count--) {
      const trailingSlice = fixWords.slice(fixWords.length - count).join(' ');
      const escapedSlice = trailingSlice.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const suffixOverlapMatch = content.slice(effectiveEnd).match(new RegExp(`^\\s*(${escapedSlice})\\b`, 'i'));
      if (suffixOverlapMatch) {
        const matchedStr = suffixOverlapMatch[0];
        absorbedSuffix = (absorbedSuffix || '') + matchedStr;
        effectiveEnd += matchedStr.length;
        break;
      }
    }
  }

  // Check C: Punctuation collision at end of replacement
  // e.g. fix ends in "." and suffix starts with "." -> absorb trailing period from suffix
  if (/[.?!,;:]$/.test(effectiveFix.trimEnd())) {
    const lastPunct = effectiveFix.trimEnd().slice(-1);
    if (suffix.startsWith(lastPunct)) {
      absorbedSuffix = (absorbedSuffix || '') + lastPunct;
      effectiveEnd = targetEnd + 1;
    }
  }

  // Check D: Trailing period mid-sentence
  // If effectiveFix ends with a period, but suffix continues with coordinating conjunction or comma
  const trimmedSuffix = content.slice(effectiveEnd).trimStart();
  if (effectiveFix.endsWith('.') && /^(?:and|or|but|while|because|with|,)\b/i.test(trimmedSuffix)) {
    effectiveFix = effectiveFix.slice(0, -1);
  }

  // Check E: Whitespace boundary normalization
  const currentPrefix = content.slice(0, effectiveStart);
  if (currentPrefix.length > 0 && !/\s$/.test(currentPrefix) && !/^\s/.test(effectiveFix) && !/^[.,!?;:)\]]/.test(effectiveFix)) {
    // Missing space between prefix and fix
    effectiveFix = ' ' + effectiveFix;
  } else if (/\s$/.test(currentPrefix) && /^\s/.test(effectiveFix)) {
    // Double space
    effectiveFix = effectiveFix.trimStart();
  }

  // 3. Assemble final content
  const newContent = content.slice(0, effectiveStart) + effectiveFix + content.slice(effectiveEnd);
  const delta = newContent.length - content.length;

  return {
    newContent,
    replaced: true,
    actualStart: effectiveStart,
    actualEnd: effectiveEnd,
    delta,
    absorbedPrefix,
    absorbedSuffix,
    requiresManualReview: false,
    appliedFix: effectiveFix,
    originalReplacedText: content.slice(effectiveStart, effectiveEnd)
  };
}

/**
 * Updates downstream finding offsets and validates all findings against the updated content.
 * The current draft content is always the single source of truth.
 */
export function shiftAndValidateFindings(
  findings: Finding[],
  acceptedFindingId: string,
  actualStart: number,
  actualEnd: number,
  delta: number,
  newContent: string,
  appliedFix: string,
  originalReplacedText?: string,
  requiresManualReview?: boolean,
  reviewReason?: string
): Finding[] {
  return findings.map((f) => {
    if (f.id === acceptedFindingId) {
      return {
        ...f,
        accepted: true,
        dismissed: false,
        requiresManualReview: requiresManualReview || f.requiresManualReview,
        reviewReason: reviewReason || f.reviewReason,
        startIndex: actualStart,
        endIndex: actualStart + appliedFix.length,
        appliedFixText: appliedFix,
        originalReplacedText: originalReplacedText || f.flaggedText
      };
    }

    // Already accepted or dismissed findings: update coordinates if downstream
    if (f.accepted || f.dismissed) {
      if (f.startIndex !== undefined && f.startIndex >= actualEnd) {
        return {
          ...f,
          startIndex: f.startIndex + delta,
          endIndex: f.endIndex !== undefined ? f.endIndex + delta : undefined
        };
      }
      return f;
    }

    // Pending finding:
    if (f.startIndex !== undefined && f.endIndex !== undefined) {
      if (f.startIndex >= actualEnd) {
        // Downstream finding: shift by delta
        const shiftedStart = f.startIndex + delta;
        const shiftedEnd = f.endIndex + delta;

        // Verify that the substring in newContent matches the expected flaggedText
        if (newContent.slice(shiftedStart, shiftedEnd) === f.flaggedText) {
          return {
            ...f,
            startIndex: shiftedStart,
            endIndex: shiftedEnd
          };
        }
      } else if (f.endIndex <= actualStart) {
        // Upstream finding: text is unaffected
        if (newContent.slice(f.startIndex, f.endIndex) === f.flaggedText) {
          return f;
        }
      } else {
        // Overlapping with replaced range
        return {
          ...f,
          requiresManualReview: true,
          reviewReason: 'Source text was modified by a prior replacement.'
        };
      }
    }

    // Fallback search in newContent if offset shifted or was not exact
    const occurrences: number[] = [];
    let sIdx = 0;
    while ((sIdx = newContent.indexOf(f.flaggedText, sIdx)) !== -1) {
      occurrences.push(sIdx);
      sIdx += Math.max(1, f.flaggedText.length);
    }

    if (occurrences.length === 1) {
      return {
        ...f,
        startIndex: occurrences[0],
        endIndex: occurrences[0] + f.flaggedText.length
      };
    } else if (occurrences.length > 1 && f.startIndex !== undefined) {
      const closest = occurrences.reduce((prev, curr) =>
        Math.abs(curr - f.startIndex!) < Math.abs(prev - f.startIndex!) ? curr : prev
      , occurrences[0]);
      return {
        ...f,
        startIndex: closest,
        endIndex: closest + f.flaggedText.length
      };
    }

    return {
      ...f,
      requiresManualReview: true,
      reviewReason: `Could not locate "${f.flaggedText}" in text (it may have already been modified).`
    };
  });
}
