# video-core

Videos are large. LL M context windows are small. You need a way to "compress" a video so that it fits. We've got you.

## Usage

Run videodice locally by passing a video path or URL.

This converts a video into valid multi-modal input that can be passed to an LLM. If an LLM API key is found in environment
variables, it will get the final analysis from Claude Sonnet 4.

```
npx videodice <path-or-url>
```

This will extract frames from the video, run de-duplication, and open a browser window for you to review output.

### Parameters

```
npx videodice extract <path-or-url> --fps 20 --threshold 0.01 --dedup-algo "greedy"
```

## Use as API

```ts
import { dice } from "videodice";
const result = await dice.run({ ... })
```

## Contribute

TBD
