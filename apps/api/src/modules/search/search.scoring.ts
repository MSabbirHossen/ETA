/**
 * Relevance scoring and normalization for ETA Global Search Engine (PRD §53).
 */
export interface ScorableItem {
  title: string;
  subtitle?: string;
  snippet?: string;
  code?: string;
  isFeatured?: boolean;
  updatedAt?: Date | string;
}

export function calculateRelevanceScore(query: string, item: ScorableItem): number {
  const q = query.trim().toLowerCase();
  const title = (item.title || '').trim().toLowerCase();
  const subtitle = (item.subtitle || '').trim().toLowerCase();
  const code = (item.code || '').trim().toLowerCase();
  const snippet = (item.snippet || '').trim().toLowerCase();

  let score = 0.3; // Baseline score for any matched record

  if (title === q) {
    score = 1.0;
  } else if (code === q) {
    score = 0.95;
  } else if (title.startsWith(q)) {
    score = 0.85;
  } else if (title.includes(q)) {
    score = 0.70;
  } else if (subtitle.includes(q) || code.includes(q)) {
    score = 0.60;
  } else {
    // Word-by-word title match
    const words = q.split(/\s+/).filter(Boolean);
    const matchedWords = words.filter((w) => title.includes(w));
    if (matchedWords.length > 0) {
      score = 0.45 + (matchedWords.length / words.length) * 0.15;
    } else if (snippet.includes(q)) {
      score = 0.40;
    }
  }

  // Editorial Featured Boost
  if (item.isFeatured) {
    score += 0.05;
  }

  // Recency Boost (within past 30 days)
  if (item.updatedAt) {
    const updatedDate = new Date(item.updatedAt);
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    if (updatedDate.getTime() > thirtyDaysAgo) {
      score += 0.05;
    }
  }

  // Normalize / clamp between 0.1 and 1.0
  return Math.min(1.0, Math.max(0.1, Number(score.toFixed(3))));
}
