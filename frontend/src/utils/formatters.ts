export interface RichTextSegment {
  type: "text" | "link" | "email";
  value: string;
}

const URL_OR_EMAIL_REGEX =
  /(https?:\/\/[^\s),]+|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;

/** Split message or FAQ text safely into plain text, URLs, and emails without HTML injection. */
export function splitTextWithLinks(text: string): RichTextSegment[] {
  if (!text) return [];
  const segments: RichTextSegment[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(URL_OR_EMAIL_REGEX)) {
    const rawValue = match[0];
    const startIndex = match.index ?? 0;

    if (startIndex > lastIndex) {
      segments.push({ type: "text", value: text.slice(lastIndex, startIndex) });
    }

    // Trim trailing sentence punctuation like a trailing period or semicolon cleanly.
    const trimmed = rawValue.replace(/[.;,]+$/, "");
    const trailingPunct = rawValue.slice(trimmed.length);

    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      segments.push({ type: "link", value: trimmed });
    } else {
      segments.push({ type: "email", value: trimmed });
    }

    if (trailingPunct) {
      segments.push({ type: "text", value: trailingPunct });
    }

    lastIndex = startIndex + rawValue.length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: "text", value: text.slice(lastIndex) });
  }

  return segments;
}

export function formatCategoryLabel(category: string): string {
  return category
    .split("_")
    .filter(Boolean)
    .map((word) => {
      if (word.toLowerCase() === "hod") return "HOD";
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

export function formatTimestamp(isoString: string): string {
  const parsed = new Date(isoString);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function formatConfidencePercent(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}

export function isHttpUrl(value: string | null | undefined): boolean {
  if (!value) return false;
  return value.startsWith("http://") || value.startsWith("https://");
}

function normalizeComparableUrl(rawUrl: string): string {
  const cleaned = rawUrl.trim().replace(/[.;,]+$/, "");
  try {
    const parsed = new URL(cleaned);
    const pathname = parsed.pathname.replace(/\/+$/, "");
    return `${parsed.protocol.toLowerCase()}//${parsed.host.toLowerCase()}${pathname}${parsed.search}`;
  } catch {
    return cleaned.replace(/\/+$/, "").toLowerCase();
  }
}

export function formatSourceLabel(source: string): string {
  if (!isHttpUrl(source)) {
    return source;
  }

  try {
    const parsed = new URL(source);
    const path = parsed.pathname.toLowerCase().replace(/\/+$/, "");

    if (!path) {
      return "Official University Website";
    }
    if (path.endsWith(".pdf")) {
      return "Official Prospectus Document (PDF)";
    }
    if (path.includes("admission")) {
      return "Official Admissions Portal";
    }
    if (path.includes("contact")) {
      return "Official Contact Page";
    }
    if (path.includes("fee")) {
      return "Official Fee Structure Page";
    }
    if (path.includes("scholarship")) {
      return "Official Scholarships Page";
    }
    if (path.includes("placement")) {
      return "Official Placements Portal";
    }
    if (path.includes("hostel")) {
      return "Official Hostel Information";
    }
    if (
      path.includes("course") ||
      path.includes("program") ||
      path.includes("academic")
    ) {
      return "Official Academic Programs Page";
    }

    return `Official College Page (${parsed.hostname})`;
  } catch {
    return "Official College Source";
  }
}

const HTTP_URL_MATCH_REGEX = /https?:\/\/[^\s),]+/g;

/**
 * Remove duplicate source URLs from verified FAQ answers when the same URL
 * is already rendered in the dedicated Source section below the answer.
 */
export function cleanVerifiedAnswerText(
  answer: string,
  source?: string | null,
): string {
  if (!answer || !source || !isHttpUrl(source)) {
    return answer;
  }

  const normalizedSource = normalizeComparableUrl(source);
  const matchingSpans: Array<{ start: number; end: number }> = [];

  for (const match of answer.matchAll(HTTP_URL_MATCH_REGEX)) {
    const rawMatch = match[0];
    const start = match.index ?? 0;
    const trimmedUrl = rawMatch.replace(/[.;,!?]+$/, "");
    const end = start + trimmedUrl.length;

    if (normalizeComparableUrl(trimmedUrl) === normalizedSource) {
      matchingSpans.push({ start, end });
    }
  }

  if (matchingSpans.length === 0) {
    return answer;
  }

  let updated = answer;
  for (let i = matchingSpans.length - 1; i >= 0; i--) {
    const { start, end } = matchingSpans[i];
    let before = updated.slice(0, start);
    let after = updated.slice(end);
    let replacement = "";

    // Case 1: Parenthetical source attribution containing only the duplicate URL.
    if (
      /\(\s*(?:(?:source|see|visit|at|on|via|from)\s*:?\s*)?$/i.test(before) &&
      /^\s*\)/.test(after)
    ) {
      before = before.replace(
        /\s*\(\s*(?:(?:source|see|visit|at|on|via|from)\s*:?\s*)?$/i,
        "",
      );
      after = after.replace(/^\s*\)/, "");
    } else if (/^\s+and\s+/i.test(after)) {
      // Case 2: Leading coordinate item ("are <sourceUrl> and <otherUrl>").
      after = after.replace(/^\s+and\s+/i, "");
    } else if (/(?:\s+(?:and|or)|,)\s*$/i.test(before) && /^(?:\s*[.,;:!?]|\s*$)/.test(after)) {
      // Case 3: Trailing coordinated URL ("... and <sourceUrl>.").
      before = before.replace(/(?:\s+(?:and|or)|,)\s*$/i, "");
    } else if (/^(?:\s*[.,;:!?]|\s*$)/.test(after)) {
      // Case 4: Clause/sentence-ending preposition or colon before duplicate URL.
      before = before.replace(
        /(?:\s+(?:available\s+at|published\s+at|listed\s+at|located\s+at|accessible\s+at|hosted\s+at|found\s+at|check\s+at|visit|see|check|at|on|via|from)\s*|\s*:\s*)$/i,
        "",
      );
    } else {
      // Case 5: Mid-sentence reference followed by further prose ("Visit <URL> to apply").
      replacement = "the official portal";
    }

    updated = `${before}${replacement}${after}`;
  }

  return updated
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+([.,;:!?])/g, "$1")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .trim();
}

