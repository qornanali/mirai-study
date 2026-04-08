# Mirai Study Product Requirements Document

## 1. Product Vision

Build an offline-first Progressive Web App for Japanese learning, targeting absolute beginners through JLPT N3.

The product must be:

- Free to use
- Portfolio-grade in engineering quality (Clean Code, SOLID, system design)
- Built with test-driven development as a core practice
- Minimal, responsive, and fast on desktop and mobile

## 2. Scope

### 2.1 In Scope (MVP)

- Reading module
- Listening module
- Writing module
- Kanji stroke module
- Spaced repetition engine
- Offline data and full PWA capability in the first milestone

### 2.2 Out of Scope

- Backend APIs and authentication
- Cloud sync and multi-device sync
- Native mobile apps
- Monetization and premium tiers
- Live tutoring and social/community features

## 3. Target Users and Learning Coverage

- Primary audience: absolute beginners and early/intermediate learners
- Content coverage: JLPT-aligned progression from beginner to N3
- Initial dataset target: expanded N5-N3 coverage

## 4. Technology Stack

- Framework: Vite + React + TypeScript
- Styling/UI: custom CSS (no Tailwind dependency)
- Theme baseline: warm, light-first visual style with responsive layout
- State management: Zustand with persistence middleware
- Local database: Dexie.js on IndexedDB
- Testing: Vitest + React Testing Library
- PWA: web app manifest + service worker strategy for offline usage

## 5. Data Sources and Content Model

- Vocabulary and dictionary structure based on JMDict-compatible format
- Kanji stroke data from KanjiVG SVG paths
- Audio via browser Web Speech API using Japanese voices when available
- No blind synthetic content generation for core learning data

Required high-level entities:

- VocabItem
- KanjiItem
- SentenceItem
- UserProgress
- ReviewState
- StudyAttempt

All persisted data must be runtime-validated with Zod when loaded from IndexedDB.

## 6. Functional Requirements

### 6.1 Reading Module

- Hiragana and Katakana recognition exercises
- Kanji reading exercises
- Furigana toggle (show/hide readings dynamically)
- Word and sentence reading prompts

### 6.2 Listening Module (Dictation)

- System plays TTS prompt and user enters transcription
- Fuzzy matching with Levenshtein-based scoring for typo tolerance
- Thresholds configurable by prompt type (word vs sentence)
- Voice fallback behavior required when preferred Japanese voice is unavailable

### 6.3 Writing Module (English to Japanese)

- Prompt types: verbs, words, and sentences
- Accept direct IME input and normalized romanized input paths
- Normalize input before grading to reduce false negatives
- Writing focus filters: hiragana-only, katakana-only, kanji
- Visible keyboard mode selector in practice: Auto, Hiragana, Katakana

### 6.4 Kanji Stroke Module

- Interactive HTML5 canvas drawing
- KanjiVG ghost/background render for guidance
- Track stroke order and direction
- v1 grading strictness: lenient path tolerance with order awareness

### 6.5 Spaced Repetition (SRS)

- Hybrid strategy:
  - Leitner-style progression in early onboarding
  - Transition to SM-2 style scheduling after stability threshold
- Scheduler implemented as pure, deterministic logic
- Review queue generated from stored progress state

### 6.6 Session and Goal Orchestration

- Practice mode selector:
  - Streak (continuous mixed practice)
  - Listening-only
  - Reading-only
  - Writing-only
- Daily goals configurable per skill (listening, reading, writing)
- Daily progress tracking updates after each submitted attempt
- Users can continue learning after goals are reached

## 7. Non-Functional Requirements

### 7.1 Performance

- IndexedDB queries must remain responsive for expanded N5-N3 dataset
- Canvas interactions must be smooth on typical laptop/mobile hardware

### 7.2 Reliability and Offline-First Behavior

- App must function without network after initial install/seed
- User progress must persist locally and survive browser restarts
- Service worker and cache policy must avoid stale core app shell states

### 7.3 Quality and Maintainability

- Strict TypeScript configuration
- Separation of concerns across domain, data, and UI layers
- Repository pattern for data access
- Strategy pattern for grading and scheduling behaviors

### 7.4 Accessibility and UX

- Keyboard-usable core interactions
- Responsive layouts for mobile and desktop
- Consistent readability in default light theme

## 8. Architecture and Design Constraints

- Domain-driven modular boundaries:
  - Domain logic (grading, scheduling)
  - Data access (repositories, Dexie adapters)
  - Presentation layer (React components)
- Define IJapaneseDataRepo before concrete Dexie implementations
- Keep core algorithms framework-agnostic and unit-testable

## 9. Testing Strategy (TDD)

Core rule: write tests for pure logic before UI integration.

Required unit test areas:

- SRS scheduling logic (Leitner and SM-2 transition paths)
- Fuzzy matching (spaces, punctuation, kana/romanization normalization)
- Stroke validation heuristics (lenient path + order checks)

Required component/integration test areas:

- Furigana toggle behavior
- Answering flow and grading feedback updates
- Session queue progression and persistence integration

## 10. Execution Roadmap

### Phase 1: Foundation and Contracts

- Initialize project structure
- Define TypeScript and Zod contracts for core entities
- Define repository and strategy interfaces

### Phase 2: Core Scheduling and Grading Logic

- Implement calculateNextReview and related pure scheduling functions
- Implement Hybrid SRS transition rules
- Deliver full unit test suite for scheduler behavior

### Phase 3: Data Layer and Seeding

- Implement Dexie schema, indexes, and migrations
- Implement seeding pipeline from JMDict-compatible source data
- Include level-based kana JSON seed packs for hiragana/katakana-focused writing practice
- Validate hydration paths with Zod

### Phase 4: Shared App Shell and PWA Infrastructure

- Build dashboard shell, navigation, and global state slices
- Add manifest and service worker caching baseline

### Phase 5: Learning Modules

- Reading and Writing modules
- Listening module with TTS orchestration and fallback
- Kanji Stroke module with lenient v1 validation

### Phase 6: Integration, Hardening, and Release Readiness

- Unified StudySession orchestration
- Offline resilience and persistence validation
- Performance and compatibility checks
- Final quality gates and release checklist

## 11. Acceptance Criteria

- All in-scope modules are functional in a single offline-capable PWA
- Hybrid SRS produces deterministic, test-verified scheduling outcomes
- N5-N3 seed data loads and supports stable study session generation
- Kana JSON seed packs are ingested successfully for N5-N3
- Users can switch keyboard mode (Auto/Hiragana/Katakana) during practice
- Users can complete a full study loop without network after initial load
- Test suite covers core domain logic and critical user flows
