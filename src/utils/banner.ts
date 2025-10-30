/**
 * Get display width of a string, accounting for emojis taking 2 columns
 * Removes variation selectors and counts each emoji as 2 characters
 */
function getDisplayWidth(text: string): number {
  // Remove variation selectors (\uFE0F) which are invisible modifiers
  const cleanText = text.replace(/\uFE0F/g, '');
  
  let width = 0;
  for (const char of cleanText) {
    const code = char.codePointAt(0) || 0;
    // Emoji ranges take 2 columns in terminal
    if (
      (code >= 0x1f000 && code <= 0x1ffff) || // Emoji blocks (🎬, etc)
      (code >= 0x2600 && code <= 0x26ff) ||   // Misc symbols
      (code >= 0x2700 && code <= 0x27bf) ||   // Dingbats  
      (code >= 0x2763 && code <= 0x2767)      // Hearts (❤)
    ) {
      width += 2;
    } else {
      width += 1;
    }
  }
  return width;
}

/**
 * Creates a centered banner with automatic padding
 * @param lines - Array of text lines to display in the banner
 * @param width - Total width of the banner (default: 65)
 */
export function createBanner(lines: string[], width = 65): void {
  const horizontalLine = "═".repeat(width);
  const emptyLine = `║${" ".repeat(width - 2)}║`;

  console.log("");
  console.log(`╔${horizontalLine}╗`);
  console.log(emptyLine);

  for (const line of lines) {
    const displayWidth = getDisplayWidth(line);
    const padding = Math.max(0, width - 2 - displayWidth);
    const leftPad = Math.floor(padding / 2);
    const rightPad = padding - leftPad;
    console.log(`║${" ".repeat(leftPad)}${line}${" ".repeat(rightPad)}║`);
  }

  console.log(emptyLine);
  console.log(`╚${horizontalLine}╝`);
  console.log("");
}
