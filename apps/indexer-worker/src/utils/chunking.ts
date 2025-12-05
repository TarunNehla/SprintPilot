export interface Chunk {
  text: string;
  tokenCount: number;
}

const MAX_TOKENS = 512;
const CHARS_PER_TOKEN = 4; // Simple approximation: 1 token ≈ 4 characters

/**
 * Estimates token count based on character count
 * Simple heuristic: ~4 characters = 1 token
 */
function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/**
 * Splits text into sentences (simple regex-based)
 */
function splitIntoSentences(text: string): string[] {
  // Split on sentence boundaries: period + space, question mark, exclamation
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Hard split text at token limit (character-based)
 */
function hardSplit(text: string, maxTokens: number): string[] {
  const maxChars = maxTokens * CHARS_PER_TOKEN;
  const chunks: string[] = [];

  for (let i = 0; i < text.length; i += maxChars) {
    chunks.push(text.slice(i, i + maxChars));
  }

  return chunks;
}

/**
 * Chunks text using hybrid strategy:
 * 1. Split by paragraphs (\n\n)
 * 2. If paragraph > MAX_TOKENS → split by sentences
 * 3. If sentence > MAX_TOKENS → hard split at MAX_TOKENS
 */
export function chunkText(text: string): Chunk[] {
  const chunks: Chunk[] = [];

  // Step 1: Split by paragraphs
  const paragraphs = text
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  for (const paragraph of paragraphs) {
    const paragraphTokens = estimateTokenCount(paragraph);

    // Case 1: Paragraph fits within limit
    if (paragraphTokens <= MAX_TOKENS) {
      chunks.push({
        text: paragraph,
        tokenCount: paragraphTokens,
      });
      continue;
    }

    // Case 2: Paragraph too large → split by sentences
    const sentences = splitIntoSentences(paragraph);
    let currentChunk = "";
    let currentTokenCount = 0;

    for (const sentence of sentences) {
      const sentenceTokens = estimateTokenCount(sentence);

      // Case 2a: Single sentence > MAX_TOKENS → hard split
      if (sentenceTokens > MAX_TOKENS) {
        // Save current chunk if exists
        if (currentChunk) {
          chunks.push({
            text: currentChunk.trim(),
            tokenCount: currentTokenCount,
          });
          currentChunk = "";
          currentTokenCount = 0;
        }

        // Hard split the long sentence
        const hardChunks = hardSplit(sentence, MAX_TOKENS);
        for (const hardChunk of hardChunks) {
          chunks.push({
            text: hardChunk,
            tokenCount: estimateTokenCount(hardChunk),
          });
        }
        continue;
      }

      // Case 2b: Adding sentence would exceed limit
      if (currentTokenCount + sentenceTokens > MAX_TOKENS) {
        // Save current chunk
        chunks.push({
          text: currentChunk.trim(),
          tokenCount: currentTokenCount,
        });
        // Start new chunk with this sentence
        currentChunk = sentence;
        currentTokenCount = sentenceTokens;
      } else {
        // Add sentence to current chunk
        currentChunk += (currentChunk ? " " : "") + sentence;
        currentTokenCount += sentenceTokens;
      }
    }

    // Save remaining chunk
    if (currentChunk) {
      chunks.push({
        text: currentChunk.trim(),
        tokenCount: currentTokenCount,
      });
    }
  }

  return chunks;
}
