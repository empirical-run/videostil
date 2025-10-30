# Design Document: Video Chapter Annotations

## Overview
Add YouTube-style chapter annotations to the "All Frames" filmstrip view, allowing users to segment and label portions of the video timeline while browsing frames.

---

## 1. Feature Requirements

### 1.1 Core Functionality
- **Mark Start/End**: Set current frame as chapter start or end timestamp
- **Add Chapter**: Create chapter with title and marked timestamps
- **Edit Chapters**: Modify title and timestamps
- **Delete Chapters**: Remove chapters
- **Visual Indicators**: Show chapter markers in filmstrip
- **Persistence**: Save/load chapters with analysis

### 1.2 Simplified Scope
- ✅ Simple title + timestamps only
- ✅ Filmstrip-only UI (frame modal)
- ✅ All Frames tab only
- ❌ No color coding
- ❌ No descriptions
- ❌ No timeline visualization (initial version)

### 1.3 User Stories
- As a user viewing frames in filmstrip, I want to mark the current frame as a chapter boundary
- As a user, I want to create a chapter from marked start/end frames with a simple title
- As a user, I want to see which chapter the current frame belongs to
- As a user, I want to export chapters for documentation

---

## 2. Data Model

### 2.1 Chapter Schema
```typescript
interface VideoChapter {
  id: string;                    // Unique identifier (UUID)
  startTime: number;             // Start time in seconds
  endTime: number;               // End time in seconds
  title: string;                 // Chapter title (required)
  createdAt: string;            // ISO timestamp
  updatedAt: string;            // ISO timestamp
}

interface ChapterMetadata {
  chapters: VideoChapter[];
  videoDurationSeconds: number;
  totalFramesCount: number;
  analysisId: string;
  version: string;              // Schema version (e.g., "1.0")
}
```

### 2.2 Storage Location
```
~/.videostil/{analysis-id}/
  ├── analysis-result.json      # Existing
  ├── frame-diff-data.json      # Existing
  ├── chapters.json             # NEW - Chapter annotations
  ├── frames/
  └── unique_frames/
```

**Example chapters.json:**
```json
{
  "version": "1.0",
  "analysisId": "abc123",
  "videoDurationSeconds": 83,
  "totalFramesCount": 150,
  "chapters": [
    {
      "id": "ch-uuid-1",
      "startTime": 0,
      "endTime": 12,
      "title": "Dashboard create automation flow",
      "createdAt": "2025-01-27T10:30:00Z",
      "updatedAt": "2025-01-27T10:30:00Z"
    },
    {
      "id": "ch-uuid-2",
      "startTime": 12,
      "endTime": 50,
      "title": "Dashboard create discount flow",
      "createdAt": "2025-01-27T10:31:00Z",
      "updatedAt": "2025-01-27T10:31:00Z"
    }
  ]
}
```

---

## 3. UI Design

### 3.1 Frame Modal (Filmstrip View) - All Frames Tab Only

```
┌────────────────────────────────────────────────────────────┐
│  Frame 45/150                                         [×]   │
├────────────────────────────────────────────────────────────┤
│                                                             │
│                    [Large Frame Image]                      │
│                                                             │
│                       0:30 / 1:23                          │
├────────────────────────────────────────────────────────────┤
│  📖 Chapter: Dashboard create discount flow (0:12-0:50)    │
├────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────┐   │
│  │  📍 Mark Timestamps                                 │   │
│  │  Current Frame: 0:30                                │   │
│  │  [Mark as Start] [Mark as End]                      │   │
│  │                                                      │   │
│  │  Selected Range:                                    │   │
│  │  Start: 0:12  End: 0:50                            │   │
│  │  [Clear Selection]                                  │   │
│  └────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌────────────────────────────────────────────────────┐   │
│  │  ➕ Create Chapter                                  │   │
│  │  Title: ┌─────────────────────────────────────┐   │   │
│  │         │ Dashboard create discount flow      │   │   │
│  │         └─────────────────────────────────────┘   │   │
│  │  Range: 0:12 - 0:50 (38 seconds)                  │   │
│  │                            [Cancel] [Create]       │   │
│  └────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌────────────────────────────────────────────────────┐   │
│  │  📚 All Chapters (3)                    [Collapse]  │   │
│  ├────────────────────────────────────────────────────┤   │
│  │  ► 0:00-0:12  Dashboard create automation flow     │   │
│  │                                  [Edit] [Delete]    │   │
│  │  ► 0:12-0:50  Dashboard create discount flow       │   │
│  │                                  [Edit] [Delete]    │   │
│  │  ► 0:50-1:23  Store login flow                     │   │
│  │                                  [Edit] [Delete]    │   │
│  └────────────────────────────────────────────────────┘   │
│                                                             │
│  [< Previous]                               [Next >]       │
└────────────────────────────────────────────────────────────┘
```

### 3.2 Workflow Components

#### 3.2.1 Current Chapter Display
```tsx
// Show which chapter the current frame belongs to
{currentChapter && (
  <div className="current-chapter-indicator">
    📖 Chapter: {currentChapter.title} 
    ({formatTime(currentChapter.startTime)}-{formatTime(currentChapter.endTime)})
  </div>
)}
```

#### 3.2.2 Mark Timestamps Panel
```tsx
<div className="timestamp-marker-panel">
  <h4>📍 Mark Timestamps</h4>
  <div>Current Frame: {currentFrameTime}</div>
  <div className="actions">
    <button onClick={markAsStart}>Mark as Start</button>
    <button onClick={markAsEnd}>Mark as End</button>
  </div>
  {(markedStart !== null || markedEnd !== null) && (
    <div className="selected-range">
      <div>Selected Range:</div>
      <div>Start: {markedStart ? formatTime(markedStart) : '—'}</div>
      <div>End: {markedEnd ? formatTime(markedEnd) : '—'}</div>
      <button onClick={clearSelection}>Clear Selection</button>
    </div>
  )}
</div>
```

#### 3.2.3 Create Chapter Form
```tsx
{markedStart !== null && markedEnd !== null && (
  <div className="create-chapter-form">
    <h4>➕ Create Chapter</h4>
    <input 
      type="text" 
      placeholder="Chapter title" 
      value={chapterTitle}
      onChange={(e) => setChapterTitle(e.target.value)}
    />
    <div>
      Range: {formatTime(markedStart)} - {formatTime(markedEnd)} 
      ({markedEnd - markedStart} seconds)
    </div>
    <div className="actions">
      <button onClick={cancelCreate}>Cancel</button>
      <button onClick={createChapter} disabled={!chapterTitle.trim()}>
        Create
      </button>
    </div>
  </div>
)}
```

#### 3.2.4 Chapter List
```tsx
<div className="chapters-list">
  <div className="header">
    <h4>📚 All Chapters ({chapters.length})</h4>
    <button onClick={toggleCollapse}>
      {collapsed ? 'Expand' : 'Collapse'}
    </button>
  </div>
  {!collapsed && chapters.map(chapter => (
    <div key={chapter.id} className="chapter-item">
      <div className="chapter-info">
        ► {formatTime(chapter.startTime)}-{formatTime(chapter.endTime)} 
        {chapter.title}
      </div>
      <div className="chapter-actions">
        <button onClick={() => editChapter(chapter)}>Edit</button>
        <button onClick={() => deleteChapter(chapter.id)}>Delete</button>
      </div>
    </div>
  ))}
</div>
```

---

## 4. Technical Implementation

### 4.1 Backend API Endpoints

```typescript
// Server: src/server/index.ts

// GET /api/chapters?analysisId={id}
// Returns: ChapterMetadata | { chapters: [] }

// POST /api/chapters
// Body: { analysisId: string, chapter: VideoChapter }
// Returns: { success: true, chapter: VideoChapter }

// PUT /api/chapters/:chapterId
// Body: { analysisId: string, updates: Partial<VideoChapter> }
// Returns: { success: true, chapter: VideoChapter }

// DELETE /api/chapters/:chapterId
// Query: ?analysisId={id}
// Returns: { success: true }
```

### 4.2 Frontend State Management

```typescript
// viewer/src/components/frame-modal.tsx

interface FrameModalProps {
  frames: Frame[];
  initialIndex: number;
  onClose: () => void;
  activeTab: 'unique' | 'all';  // NEW - to know which tab we're in
  analysisId: string;            // NEW - for API calls
}

// State for chapter marking
const [markedStart, setMarkedStart] = useState<number | null>(null);
const [markedEnd, setMarkedEnd] = useState<number | null>(null);
const [chapterTitle, setChapterTitle] = useState<string>('');
const [chapters, setChapters] = useState<VideoChapter[]>([]);
const [editingChapter, setEditingChapter] = useState<VideoChapter | null>(null);

// Helper: Get current frame's timestamp
const getCurrentFrameTime = (frameIndex: number, fps: number): number => {
  return frameIndex / fps;
};

// Helper: Find chapter for current frame
const getCurrentChapter = (): VideoChapter | null => {
  const currentTime = getCurrentFrameTime(currentIndex, fps);
  return chapters.find(
    ch => currentTime >= ch.startTime && currentTime <= ch.endTime
  ) || null;
};

// Actions
const markAsStart = () => {
  const time = getCurrentFrameTime(currentIndex, fps);
  setMarkedStart(time);
};

const markAsEnd = () => {
  const time = getCurrentFrameTime(currentIndex, fps);
  setMarkedEnd(time);
};

const createChapter = async () => {
  if (!chapterTitle.trim() || markedStart === null || markedEnd === null) {
    return;
  }
  
  const newChapter: VideoChapter = {
    id: crypto.randomUUID(),
    startTime: markedStart,
    endTime: markedEnd,
    title: chapterTitle.trim(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  await createChapterAPI(analysisId, newChapter);
  await loadChapters();
  clearMarks();
};

const clearMarks = () => {
  setMarkedStart(null);
  setMarkedEnd(null);
  setChapterTitle('');
};
```

### 4.3 New API Functions

```typescript
// viewer/src/lib/api.ts

export async function fetchChapters(analysisId: string): Promise<ChapterMetadata> {
  const response = await fetch(`/api/chapters?analysisId=${encodeURIComponent(analysisId)}`);
  if (!response.ok) {
    throw new Error('Failed to fetch chapters');
  }
  return response.json();
}

export async function createChapter(
  analysisId: string, 
  chapter: VideoChapter
): Promise<VideoChapter> {
  const response = await fetch('/api/chapters', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ analysisId, chapter }),
  });
  if (!response.ok) {
    throw new Error('Failed to create chapter');
  }
  const data = await response.json();
  return data.chapter;
}

export async function updateChapter(
  analysisId: string,
  chapterId: string,
  updates: Partial<VideoChapter>
): Promise<VideoChapter> {
  const response = await fetch(`/api/chapters/${chapterId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ analysisId, updates }),
  });
  if (!response.ok) {
    throw new Error('Failed to update chapter');
  }
  const data = await response.json();
  return data.chapter;
}

export async function deleteChapter(
  analysisId: string,
  chapterId: string
): Promise<void> {
  const response = await fetch(
    `/api/chapters/${chapterId}?analysisId=${encodeURIComponent(analysisId)}`,
    { method: 'DELETE' }
  );
  if (!response.ok) {
    throw new Error('Failed to delete chapter');
  }
}
```

### 4.4 Modified Components

```typescript
// viewer/src/components/frame-modal.tsx
// Add chapter UI only when activeTab === 'all'

{activeTab === 'all' && (
  <div className="chapter-controls">
    {/* Current chapter display */}
    {/* Mark timestamps panel */}
    {/* Create chapter form */}
    {/* Chapter list */}
  </div>
)}
```

---

## 5. User Workflows

### 5.1 Create Chapter Flow
1. User opens All Frames tab
2. User clicks on a frame to open filmstrip modal
3. User navigates to desired start frame
4. User clicks "Mark as Start" → Start timestamp saved
5. User navigates to desired end frame
6. User clicks "Mark as End" → End timestamp saved
7. User enters chapter title
8. User clicks "Create" → Chapter saved
9. Chapter appears in list
10. Marked timestamps cleared

### 5.2 Edit Chapter Flow
1. User opens filmstrip modal
2. User sees chapter list
3. User clicks "Edit" on a chapter
4. Inline edit form appears with pre-filled data
5. User modifies title or timestamps (manual input)
6. User clicks "Save" → Chapter updated

### 5.3 Delete Chapter Flow
1. User clicks "Delete" on a chapter
2. Confirmation dialog: "Delete chapter '{title}'?"
3. User confirms → Chapter removed

### 5.4 Navigate by Chapter
1. User clicks on a chapter in the list
2. Modal jumps to first frame of that chapter
3. Optional: Highlight chapter indicator

---

## 6. Validation Rules

### 6.1 Time Validation
- `startTime` must be >= 0
- `endTime` must be > `startTime`
- `endTime` must be <= video duration
- Warning (not blocking) if chapters overlap

### 6.2 Title Validation
- Required field
- 1-200 characters
- Trim whitespace
- Warning if duplicate titles exist

---

## 7. Backend Implementation Details

### 7.1 Server API Handler

```typescript
// src/server/index.ts

// GET /api/chapters
if (url.pathname === '/api/chapters' && req.method === 'GET') {
  const analysisId = url.searchParams.get('analysisId');
  if (!analysisId) {
    res.statusCode = 400;
    res.end('analysisId required');
    return;
  }

  const chaptersPath = path.join(rootPath, analysisId, 'chapters.json');
  
  try {
    const data = await fs.promises.readFile(chaptersPath, 'utf8');
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(data);
  } catch {
    // Return empty chapters if file doesn't exist
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      version: '1.0',
      analysisId,
      chapters: [],
      videoDurationSeconds: 0,
      totalFramesCount: 0,
    }));
  }
  return;
}

// POST /api/chapters
if (url.pathname === '/api/chapters' && req.method === 'POST') {
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', async () => {
    const { analysisId, chapter } = JSON.parse(body);
    const chaptersPath = path.join(rootPath, analysisId, 'chapters.json');
    
    let metadata: ChapterMetadata;
    try {
      const data = await fs.promises.readFile(chaptersPath, 'utf8');
      metadata = JSON.parse(data);
    } catch {
      metadata = {
        version: '1.0',
        analysisId,
        chapters: [],
        videoDurationSeconds: 0,
        totalFramesCount: 0,
      };
    }
    
    metadata.chapters.push(chapter);
    metadata.chapters.sort((a, b) => a.startTime - b.startTime);
    
    await fs.promises.writeFile(
      chaptersPath, 
      JSON.stringify(metadata, null, 2), 
      'utf8'
    );
    
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true, chapter }));
  });
  return;
}

// PUT /api/chapters/:chapterId
// DELETE /api/chapters/:chapterId
// (Similar implementations)
```

---

## 8. Export Functionality

### 8.1 Export Format

**Simple Text Format:**
```
Dashboard create automation flow (0:00 - 0:12)
Dashboard create discount flow (0:12 - 0:50)
Store login flow (0:50 - 1:23)
```

**YouTube Chapters Format:**
```
0:00 Dashboard create automation flow
0:12 Dashboard create discount flow
0:50 Store login flow
```

**JSON Export:**
```json
{
  "videoUrl": "https://...",
  "duration": "1:23",
  "chapters": [
    { "time": "0:00", "title": "Dashboard create automation flow" },
    { "time": "0:12", "title": "Dashboard create discount flow" },
    { "time": "0:50", "title": "Store login flow" }
  ]
}
```

### 8.2 Export Button
```tsx
<button onClick={exportChapters}>
  Export Chapters
</button>

// In modal or chapter list section
const exportChapters = () => {
  const text = chapters
    .map(ch => `${formatTime(ch.startTime)} ${ch.title}`)
    .join('\n');
  
  navigator.clipboard.writeText(text);
  // Show toast: "Chapters copied to clipboard"
};
```

---

## 9. Implementation Plan

### Phase 1: Backend (Days 1-2)
- [ ] Add chapters.json storage structure
- [ ] Implement GET /api/chapters endpoint
- [ ] Implement POST /api/chapters endpoint
- [ ] Implement PUT /api/chapters/:id endpoint
- [ ] Implement DELETE /api/chapters/:id endpoint
- [ ] Add validation logic

### Phase 2: Frontend State (Day 3)
- [ ] Add chapter types to TypeScript definitions
- [ ] Create API functions in lib/api.ts
- [ ] Add state management to frame-modal.tsx
- [ ] Implement helper functions (getCurrentChapter, etc.)

### Phase 3: UI Components (Days 4-5)
- [ ] Build mark timestamps panel
- [ ] Build create chapter form
- [ ] Build chapter list component
- [ ] Build edit chapter inline form
- [ ] Add current chapter indicator
- [ ] Conditionally show only in All Frames tab

### Phase 4: Polish (Day 6)
- [ ] Add validation and error handling
- [ ] Add loading states
- [ ] Add success/error toasts
- [ ] Add keyboard shortcuts (optional)
- [ ] Add export functionality
- [ ] Style with Tailwind CSS

### Phase 5: Testing (Day 7)
- [ ] Manual testing of all workflows
- [ ] Edge case testing (overlaps, boundaries)
- [ ] Test with different video lengths
- [ ] Test data persistence
- [ ] Write documentation

---

## 10. Future Enhancements (Phase 2)

- **Visual Timeline**: Add chapter markers to a visual timeline scrubber
- **Auto-suggestions**: Suggest chapter titles based on frame descriptions
- **Bulk operations**: Merge, split, or reorder chapters
- **Templates**: Save chapter structures as templates
- **Keyboard shortcuts**: 
  - `s` - Mark as start
  - `e` - Mark as end
  - `c` - Create chapter
- **Chapter thumbnails**: Show preview image for each chapter
- **Scene detection**: Auto-suggest chapter boundaries using AI

---

## 11. Open Questions

1. **Overlap handling**: Should we prevent or warn about overlapping chapters?
   - **Decision**: Warn but allow (flexibility for edge cases)

2. **Auto-save**: Save chapters immediately or require explicit save?
   - **Decision**: Save immediately on create/edit/delete

3. **Empty chapters.json**: Create file on first chapter or on analysis creation?
   - **Decision**: Create on first chapter addition

4. **Frame precision**: Allow sub-second timestamps or round to nearest frame?
   - **Decision**: Use exact frame timestamp (frame_index / fps)

---

## 12. Success Metrics

- 40%+ of All Frames views include chapter creation
- Average 3-5 chapters per video
- Chapter creation time < 30 seconds per chapter
- Zero data loss incidents
- Positive user feedback on simplicity

---

## Files to Create/Modify

### New Files
- `/docs/CHAPTER_ANNOTATIONS_DESIGN.md` (this file)
- `/viewer/src/components/chapter-list.tsx`
- `/viewer/src/lib/chapters.ts` (helper functions)

### Modified Files
- `/src/server/index.ts` - Add chapter API endpoints
- `/viewer/src/types/index.ts` - Add chapter types
- `/viewer/src/lib/api.ts` - Add chapter API functions
- `/viewer/src/components/frame-modal.tsx` - Add chapter UI
- `/viewer/src/app.tsx` - Pass activeTab to modal

---

**Status**: Ready for implementation
**Version**: 1.0
**Last Updated**: 2025-01-27
