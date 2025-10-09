export const DEDUP_CONFIG = {
  DEFAULT_APPROACH: "greedy" as const,
  DP_MAX_LOOKBACK: 5,
  SLIDING_WINDOW_SIZE: 3,
  ENABLE_PERFORMANCE_LOGGING: true,
};

export const ALGO_MAP: Record<string, string> = {
  gd: "greedy",
  dp: "dynamic-programming",
  sw: "sliding-window",
};
