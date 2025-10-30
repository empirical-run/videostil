export interface DefaultCommandOptions {
  fps: string;
  threshold: string;
  start: string;
  duration: string;
  output: string;
  serve: boolean;
  model: string;
  systemPrompt?: string;
  userPrompt?: string;
}

export interface ServeCommandOptions {
  port: string;
  host: string;
  open: boolean;
}
