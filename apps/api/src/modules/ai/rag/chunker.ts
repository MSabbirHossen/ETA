import crypto from 'node:crypto';

export interface TextChunk {
  chunkIndex: number;
  content: string;
  contentHash: string;
}

/**
 * Pedagogically sensible semantic chunker — PRD §93, §94
 *
 * Chunks content preserving section/header boundaries, with bounded size
 * and rolling overlap to maintain contextual continuity.
 */
export function chunkDocument(
  text: string,
  options?: { targetWordCount?: number; overlapWords?: number },
): TextChunk[] {
  const targetWords = options?.targetWordCount ?? 250;
  const overlap = options?.overlapWords ?? 40;

  if (!text || text.trim().length === 0) {
    return [];
  }

  // Split by markdown headers or double newlines (paragraphs)
  const sections = text.split(/(?=\n#{1,4}\s)|\n\n+/);
  const chunks: TextChunk[] = [];
  let currentBuffer: string[] = [];
  let currentWordCount = 0;
  let chunkIndex = 0;

  for (const section of sections) {
    const trimmed = section.trim();
    if (!trimmed) continue;

    const words = trimmed.split(/\s+/);

    if (currentWordCount + words.length > targetWords && currentBuffer.length > 0) {
      const chunkText = currentBuffer.join('\n\n').trim();
      const hash = crypto.createHash('sha256').update(chunkText).digest('hex');
      chunks.push({
        chunkIndex: chunkIndex++,
        content: chunkText,
        contentHash: hash,
      });

      // Keep overlapping words from end of buffer
      const bufferWords = chunkText.split(/\s+/);
      const overlapSlice = bufferWords.slice(-overlap).join(' ');
      currentBuffer = [overlapSlice];
      currentWordCount = overlapSlice.split(/\s+/).length;
    }

    currentBuffer.push(trimmed);
    currentWordCount += words.length;
  }

  if (currentBuffer.length > 0) {
    const chunkText = currentBuffer.join('\n\n').trim();
    if (chunkText.length > 0) {
      const hash = crypto.createHash('sha256').update(chunkText).digest('hex');
      chunks.push({
        chunkIndex: chunkIndex++,
        content: chunkText,
        contentHash: hash,
      });
    }
  }

  return chunks;
}
