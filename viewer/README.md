# Videostil Viewer UI

Modern React + TypeScript + Tailwind CSS viewer for Videostil analysis results.

## Development

```bash
npm install
npm run dev
```

This will start the Vite dev server at http://localhost:5173 with HMR enabled.

The dev server is configured to proxy API requests to the Videostil server at http://127.0.0.1:63745.

## Building

```bash
npm run build
```

This builds the app to `../dist/viewer/` which is served by the Videostil server.

## Features

- **Analysis List**: Browse all saved video analyses
- **Frames Grid**: View unique frames with metadata
- **Frame Modal**: Full-screen frame viewer with keyboard navigation
- **Graph Visualization**: Interactive Chart.js graphs showing frame differences
- **Results Panel**: View analysis text and interleaved results

## Tech Stack

- **React 18**: UI framework
- **TypeScript**: Type safety
- **Tailwind CSS**: Utility-first styling
- **Vite**: Fast build tool with HMR
- **Chart.js**: Interactive graph visualization
