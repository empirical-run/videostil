export interface ApiKeysConfig {
  ANTHROPIC_API_KEY?: string;
  GOOGLE_API_KEY?: string;
  OPENAI_API_KEY?: string;
}

export function checkApiKeys(): {
  hasKeys: boolean;
  keys: ApiKeysConfig;
} {
  const keys: ApiKeysConfig = {
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  };

  const hasKeys = Boolean(
    keys.ANTHROPIC_API_KEY || keys.GOOGLE_API_KEY || keys.OPENAI_API_KEY,
  );

  if (!hasKeys) {
    console.warn(
      "At least one API key must be provided (ANTHROPIC_API_KEY, GOOGLE_API_KEY, or OPENAI_API_KEY), " +
        "export the key as an environment variable to enable LLM analysis.",
    );
  }

  return { hasKeys, keys };
}
