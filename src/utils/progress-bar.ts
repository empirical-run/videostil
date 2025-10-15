export function updateProgressBar(
  current: number,
  total: number,
  prefix: string = "",
  suffix: string = "",
): void {
  const percentage = Math.round((current / total) * 100);
  const progressBar =
    "█".repeat(Math.floor(percentage / 5)) +
    "░".repeat(20 - Math.floor(percentage / 5));
  
  const prefixStr = prefix ? `[${prefix}] ` : "";
  const suffixStr = suffix ? ` ${suffix}` : "";
  
  process.stdout.write(
    `\r${prefixStr}[${progressBar}] ${percentage}% (${current}/${total})${suffixStr}`,
  );
}

export function finishProgressBar(): void {
  process.stdout.write("\n");
}
