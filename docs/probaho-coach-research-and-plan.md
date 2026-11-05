# Probaho Coach — research and plan

## Audit
Before: WPM clamped 110–160; "confidence" = 100 − 4×fillers with a floor of 60; score capped at 98; substring keyword matching ("ack" in "back"); "like" always a filler; analysis could run before the last speech result; 3 questions; no typed mode, consent, history or feedback beyond one sentence.

## Research (checked 2026-11-05)

| # | Reference | Finding | Reliability |
|---|---|---|---|
| 1 | Yoodli interview-preparation page; UW career services page | Follow-up questions from your answer; report on pacing and filler words | Vendor + university |
| 2 | Leadr / bestaitools reviews of Yoodli | Also eye contact and gestures via webcam | Reviews |
| 3 | Big Interview (via comparison articles) | Courses + AI mock interviews grading pace, fillers, tone; often free via universities | Reviews |
| 4 | Orai (via comparison articles) | Solo presentation practice with instant feedback | Reviews |
| 5 | Poised (via comparison articles) | Live interview copilot, not a practice coach | Reviews |
| 6 | hyperbound.ai "best speech coaching apps 2025" | Market overview | Vendor blog |
| 7 | Chrome Web Speech API docs | Continuous recognition with interim results; cloud processing in Chrome | Official |

No independent accuracy evaluation of these tools was found; one sample readout in results looked illustrative and was ignored.

**Conclusions used**
1. Leading coaches all report fillers and pace and ask follow-ups → implemented, but deterministic and explained.
2. None of the sources showed reliable pronunciation scoring in a browser → no pronunciation or accent score; stated in the UI.
3. Interview coaches emphasise content structure → topic coverage, example, conclusion and sentence length are scored and shown separately.

## Scoring (transparent)
- Content 0–50: covered topics ÷ topics.
- Structure 0–20: example (8) + conclusion (6) + average sentence length ≤25 words (6, or 3 if ≤35).
- Delivery 0–30: fillers per 100 words (20/14/8/3) + pace 10 (English 100–170 wpm; typed answers get 10, no pace penalty).
- Every question's model answer is tested to cover all its own topics.

## Roadmap

| Priority | Item | Status |
|---|---|---|
| P0 | Remove clamps and fake metrics; word-boundary matching; contextual "like" | Done |
| P0 | Consent notice; no upload of audio; optional local playback | Done |
| P1 | 8 questions in 4 tracks incl. Bangla; follow-ups; model answers | Done |
| P1 | Local history with opt-in transcripts; progress summary | Done |
| P2 | Pause analysis (needs audio-level analysis via Web Audio) | Not done |
| P2 | Model-graded answers grounded in quotes (reuse `/api/viva` pattern) | Not done |
| P2 | Larger, reviewed question bank per subject | Not done |

## Testing
`tests/speech.test.ts` (9 tests). Browser: typed weak answer → follow-up, missing topics, fillers → model answer → history/progress persist → Bangla track → mic consent notice.
