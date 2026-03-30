/**
 * Parse a timed text string into an array of sentences.
 * Each sentence is a newline-delimited line of the form:
 *   [start]word chunk[t]word chunk[t]...[end]
 *
 * Returns:
 * [
 *   {
 *     start: number,
 *     end: number,
 *     words: [{ text: string, t: number }, ...]
 *   },
 *   ...
 * ]
 */
export function parseText(text) {
  const TOKEN = /\[(\d+(?:\.\d+)?)\]/g

  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      // Split into alternating [timestamp, chunk, timestamp, chunk, ..., timestamp]
      const parts = line.split(TOKEN)
      // parts = ['', t0, chunk0, t1, chunk1, ..., tN, '']
      // odd indices are timestamps, even are text chunks

      const words = []
      let start = null
      let end = null

      for (let i = 0; i < parts.length; i++) {
        if (i % 2 === 1) {
          // timestamp
          const t = parseFloat(parts[i])
          const chunk = parts[i + 1] ?? ''
          if (start === null) start = t
          if (chunk.trim() === '') {
            // trailing timestamp = sentence end
            end = t
          } else {
            words.push({ text: chunk, t })
          }
        }
      }

      return { start, end, words }
    })
    .filter((s) => s.words.length > 0)
}

/**
 * Strip punctuation from a word chunk to use as glossary lookup key.
 */
export function stripPunctuation(text) {
  // Remove common punctuation, including CJK and Western; lowercase for case-insensitive lookup
  // eslint-disable-next-line no-misleading-character-class
  return text
    .replace(/[\s.,!?;:\u3001\u3002\uff01\uff1f\uff1b\uff1a\u2026\u2014\u300c\u300d\u300e\u300f\u3010\u3011\u300a\u300b\u201c\u201d\u2018\u2019]+/g, '')
    .trim()
    .toLowerCase()
}
