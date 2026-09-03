# The Director Game

A playful, browser-only cinema-knowledge game presented inside a responsive, vector-built 90s CRT television. Each Stage uses the same growing movie archive in a different challenge—no backend required.

## Game loop

- A run begins with two active directors and exactly ten visible film tickets.
- Stage 1 is the Director matching game. Stage 2 turns the movies just cleared into a Release Timeline minigame; later Stage modes remain intentionally open for future design.
- In the Release Timeline, choose one familiar Stage 1 movie as the dated anchor, then place seven hidden-date tickets before, between, or after the growing chronology. Large ticket years and a live decade ruler make the chronology readable; each era shows its current movie count and can center that section. Correct positions earn 500 points; mistakes reveal the year and file the ticket correctly so every attempt adds knowledge.
- The opening How to Play is a controlled interactive lesson built from the real ticket and Director components: one correct drag, one deliberate wrong drag and punch, Director completion, then free Movie and Director hint samples. Afterward it becomes a compact replayable reference.
- Drag a movie ticket onto an active director. Every director has three visible ticket receivers that wake up during a drag; empty future director positions stay inert. A correct match scores points and coins, while a wrong match is rejected, punched, and returned to its previous position without revealing its owner.
- Every ticket always shows its genre; the interface never labels films by whether their director is currently on the board.
- Match all three films for a director to move that completed set into the Victory Area and free its slot.
- Director cards form a left-packed conveyor. Completing one closes the gap by sliding every card to its right one position left without changing their order; the next arrival always joins at the right edge of the active queue.
- Completing a set now triggers a film-first archive sequence: the three tickets snap together, receive a physical archive punch with synchronized sound, compress into a stack, travel toward the Victory Area, and only then clear the director from the board.
- A visible move countdown introduces more directors until all five slots can be occupied.
- The oversized Next Director number moves from green through yellow and orange to red at one move; at four occupied slots with one move left, it enters a muted-red “last safe move” pulse.
- Wrong drops flash red, return the ticket to its prior table position, and physically punch it; every ticket stays visible and playable, with no attempt cap.
- Ticket color now has one explicit meaning—COLOR = GENRE—with seven consistent genre families; every ticket and every locked director-stack film keeps its release year visible.
- Selecting or picking up a ticket gives the Hint Shop a locked movie context; moving the pointer or keyboard focus across other tickets does not retarget it. Purchased stickers plop onto the selected ticket, lightweight text hints auto-open for 4.2 seconds, and a cooled-down rescue reminder appears after four consecutive misses.
- Frame Check and Visual DNA use one near-full-screen inspection overlay with a dimmed board, large imagery, explicit movie-title and hint-type hierarchy, a prominent close control, and Escape-key support.
- Selecting the name/portrait area of an active director switches the shop to DIRECTOR HINTS. Six authored file notes cover origin, career period, genre tendency, thematic DNA, style and wider significance without listing that director’s three movie answers.
- Cross One Out is reusable per ticket while valid candidates remain, never removes the correct director, and follows a configurable 2 → 3 → 5 coin curve.
- Emergency Answer is a separate, high-cost panic option that names the correct director; its movie match score is reduced by a configurable multiplier while completion bonuses remain intact.
- Four consecutive correct matches heat the score to ×2 and add one bonus coin per match; six ignite ×3 and add two. A wrong answer resets the live combo to ×1 while preserving run-best stats.
- The full library is divided into configurable ten-director stages using a provisional four-tier difficulty curve. Early stages favor recognizable associations; Challenging and Archive directors increasingly enter later, while order remains shuffled inside each stage.
- Every director still requires exactly three films. Difficulty comes from the staged knowledge curve rather than giving harder directors more sockets or more work under the three-move arrival timer.
- Each clean table triggers a score-counting Stage Results celebration with stage score, total score, combo, multiplier, director, accuracy, mistake, and move stats. Continuing preserves the high score, coins, and combo.
- Stage number and Director progress remain visible in the score panel, while each Stage begins with a short continuing-run announcement.
- If a new director is due while every slot is occupied, the board overflows and the run ends. Clearing the complete local director library produces the archive-complete report.

## Hints and controls

- Select a film ticket to inspect it, purchase hints, or open its trailer when one is available.
- Select a director’s “Open file” control for a second, clearly labelled hint context. Purchased director notes remain owned and can be reopened for free.
- Five persistent, escalating hints cover movie identification, visual language, a verbal clue, director elimination, and the direct answer.
- Elimination unlocks with at least three active directors; the direct answer unlocks with more than two. Hints cost coins and do not consume a move.
- Drag tickets around the screen to organize the board; dropping on empty space keeps the new position.
- Correct matches send one coin pip per earned coin toward the bezel, then pulse the wallet in the Hint Shop; combo bonus coins are called out separately and accumulate into the same wallet.
- Correct and wrong match feedback no longer blocks the next useful input; the larger Director archive sequence was shortened from 1.9 seconds to about 1.1 seconds.
- The CRT treatment uses static scanlines and vignette layers rather than a continuously repainting noise animation. Smoke, Director arrivals, and coin flights use compositor-friendly transforms, and pointer movement updates only the ticket being dragged instead of rerendering the entire game.
- Use the bezel controls to mute sound, reduce the CRT treatment, or start a fresh shuffled game.
- The desktop cabinet is constrained to a complete 16:9 view, with a natural-height stacked layout on smaller screens.
- CRT scanlines and motion are decorative only. The interface keeps readable text and focusable controls, respects `prefers-reduced-motion`, and provides an in-game CRT effects toggle.

## Run locally

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Build

```bash
npm run build
```

## Test and lint

```bash
npm test
npm run lint
```

## Project shape

- `app/components/DirectorGame.tsx` — interactive board, CRT HUD, dragging, hints, feedback, and progression
- `app/components/GameLoopTutorial.tsx` — controlled real-object drag lesson, wrong-answer punch, completion, free hint samples, and compact reference
- `app/components/CompletionArchiveSequence.tsx` — three-ticket snap, punch, stack compression, and Victory Area handoff
- `app/components/StageResultsOverlay.tsx` — animated stage score transfer, performance stats, and next-stage handoff
- `app/components/ReleaseTimelineStage.tsx` — Stage 2 anchor selection, chronological ticket placement, scoring HUD, and results handoff
- `app/components/ConstellationCard.tsx` — reusable movie tickets, director slots, hint stickers, and victory chips
- `app/components/VisualHintOverlay.tsx` — shared full-screen Frame Check and Visual DNA inspection experience
- `app/data/game-engine.ts` — deterministic state transitions, fairness rules, economy, ranks, and centralized `GAME_CONFIG`
- `app/data/directors.ts` and `app/data/expanded-directors.ts` — local typed director and film pool
- `app/data/director-hints.ts` — six authored, answer-safe profile clues for every director
- `app/globals.css` — responsive CRT cabinet, screen effects, pixel-inspired UI, and motion fallbacks
- `tests/` — game-engine and rendered-interface checks

Edit `GAME_CONFIG` in `app/data/game-engine.ts` to tune stage size, director capacity, ticket count, arrival timing, combo thresholds, rewards, and hint prices. All content and run state remain local to the browser: there is no backend, database, login, persistence, or runtime data API.
