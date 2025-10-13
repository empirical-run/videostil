export interface ApiKeysConfig {
  ANTHROPIC_API_KEY?: string;
  GOOGLE_API_KEY?: string;
  OPENAI_API_KEY?: string;
}

export function checkApiKeys(
  providedKeys?: ApiKeysConfig,
): { hasKeys: boolean; keys: ApiKeysConfig } {
  const keys: ApiKeysConfig = {
    ANTHROPIC_API_KEY:
      providedKeys?.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY,
    GOOGLE_API_KEY: providedKeys?.GOOGLE_API_KEY || process.env.GOOGLE_API_KEY,
    OPENAI_API_KEY: providedKeys?.OPENAI_API_KEY || process.env.OPENAI_API_KEY,
  };

  const hasKeys = Boolean(
    keys.ANTHROPIC_API_KEY || keys.GOOGLE_API_KEY || keys.OPENAI_API_KEY,
  );

  return { hasKeys, keys };
}

export function requireApiKeys(providedKeys?: ApiKeysConfig): ApiKeysConfig {
  const { hasKeys, keys } = checkApiKeys(providedKeys);

  if (!hasKeys) {
    throw new Error(
      "At least one API key must be provided (ANTHROPIC_API_KEY, GOOGLE_API_KEY, or OPENAI_API_KEY). " +
        "Provide them as arguments or set them in environment variables.",
    );
  }

  return keys;
}
