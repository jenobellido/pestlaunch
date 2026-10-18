/**
 * Models sometimes wrap a suggested line in quote marks, or leave stray JSON punctuation at
 * the end; the UI adds its own framing.
 */
export const unquote = (text: string) =>
  text
    .trim()
    .replace(/["”'’}\],\s]+$/g, (tail) => (/[}\]]/.test(tail) ? "" : tail))
    .replace(/^["“'‘]+|["”'’]+$/g, "")
    .trim();
