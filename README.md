# HotSeat — Verbal Formative Assessment App

**Arena:** GSD Learning Systems  
**Slack:** #proj-hotseat (C0AJ46VT4NP)  
**Status:** MVP Complete

## What It Is

HotSeat is an anti-AI-cheating formative assessment tool for college courses. Students answer timed verbal questions via webcam — no typing, no AI assistance possible. Responses are auto-transcribed via OpenAI Whisper and scored by content area using Claude.

## Student Flow

1. **Landing page** — Enter Student ID + Course ID
2. **Setup screen** — Webcam + mic permission check
3. **Practice question** — Ungraded, tests mic/cam
4. **Begin Assessment** — Once clicked, no stopping
5. **5 questions** — One at a time, 60-second countdown each
6. **Auto-advances** — Timer hits 0, next question loads
7. **Assessment Complete** — PDF report generated

## Hardcoded Demo (Medical Assistant — Week 3: Vital Signs)

1. Describe the correct technique for measuring blood pressure.
2. What is the normal resting heart rate range for an adult?
3. Explain the difference between systolic and diastolic pressure.
4. At what temperature reading would you consider a patient to have a fever?
5. Name three factors that can affect a patient's blood pressure reading.

**Content Areas:** Vital Signs Measurement, Normal Values, Cardiovascular Physiology, Patient Assessment Factors

## Tech Stack

- **Next.js 15** (App Router)
- **OpenAI Whisper** for transcription
- **Anthropic Claude** (claude-3-haiku) for scoring
- **MediaRecorder API** for webcam/audio capture
- **jsPDF** for PDF report generation
- **Tailwind CSS** — dark, clinical styling

## Setup

### 1. Clone & Install

```bash
git clone https://github.com/andallr/hotseat.git
cd hotseat
npm install
```

### 2. Environment Variables

Create `.env.local` in the project root:

```env
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

### 3. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 4. Build

```bash
npm run build
```

## PDF Report Format

- Header: HotSeat Assessment Report
- Student ID, Course ID, Date/Time
- Score summary (correct / partial / incorrect)
- Content area breakdown with concept gap flags
- Per-question: question text, transcription, score, notes
- Footer: reviewer disclaimer

## Integrity Features

- **Tab switch detection** — logs to session, surfaced in PDF report
- **No pause/back** — once assessment starts, it runs to completion
- **Webcam active throughout** — visual deterrent

## Roadmap (v2)

- [ ] Supabase session persistence
- [ ] Admin panel (instructor dashboard)
- [ ] LMS grade passback (Moodle/Canvas)
- [ ] Custom question sets per course
- [ ] Webcam frame capture for facial verification
- [ ] Multi-language support

## GSD Product Angle

Allied health schools need this. Sell as SaaS — per-seat or per-institution pricing.
