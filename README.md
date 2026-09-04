# CineRuckus

**The Movie-Night Game Show**

CineRuckus is a playful, browser-only collection of cinema games presented inside a responsive, vector-built 90s CRT television. A full run carries one growing movie archive and score through the lineup, while quick play makes every finished mode directly testable—no backend required.

## Main menu

- **New Run** starts the full CineRuckus lineup from the beginning, preserving score and progress as each game hands off to the next.
- **Select Game** opens a quick-play submenu so a mode can be launched immediately with a fresh score, without clearing the earlier games first.

The current quick-play lineup has four games:

1. **Find the Director** — match movie tickets to the filmmaker behind them.
2. **Release Timeline** — arrange films in chronological order.
3. **Cast Call** — match actors to the movies where they belong.
4. **Cinema Map** — place landmark films on their countries of origin.

## Game loop

- A run begins with two active directors and exactly ten visible film tickets.
- Stage 1 is the Director matching game. Stage 2 turns the movies just cleared into a Release Timeline minigame. Stage 3 is Cast Call, a fast actor-to-movie sorting game. Stage 4 is Cinema Map, a world-cinema geography game; later Stage modes remain intentionally open for future design.
- In the Release Timeline, choose one familiar Stage 1 movie as the dated anchor, then place seven hidden-date tickets before, between, or after the growing chronology. Large ticket years and a live decade ruler make the chronology readable; each era shows its current movie count and can center that section. Correct positions earn 500 points; mistakes reveal the year and file the ticket correctly so every attempt adds knowledge.
- In Cast Call, two movie tickets stay active while one Polaroid-style actor prompt appears at a time. Correct drops file a compact cast-name tag; wrong drops reveal nothing and return that actor later after other prompts. Completing a movie stamps and replaces its ticket, and finishing all four movies reports accuracy, first tries, mistakes, best streak and Stage score.
- Cast Call has no countdown. Base points, a first-try bonus, streak points and a deliberately small optional recognition-speed bonus reward flow without making hesitation a failure. Mouse/touch dragging, movie-ticket clicking and left/right keyboard choices all use the same locked state transition, so rapid duplicate input cannot score twice.
- Cinema Map presents eight movie tickets one at a time on an interactive vector world map. Players can wheel/pinch to zoom, pan with pointer or touch, jump to a named region, restore World View, drag a ticket onto a country, tap the country directly, or use the secondary searchable country control.
- Country shapes use stable normalized ISO identifiers. Exact country geometry wins first; after regional zoom, selected small countries gain nearest-centroid snapping so a correct idea is not lost to pixel hunting. Three misses reveal and file the route, while first-attempt placements, streaks and retry-aware scoring feed the shared run total.
- Every resolved route leaves a compact cinema marker on the map. Results preserve that visual memory in a highlighted “Your Cinema Journey” map, with placed movies, first tries, mistakes, accuracy, best streak and revealed routes.
- A New Run opens with a controlled How to Play lesson built from the real ticket and Director components: one correct drag, one deliberate wrong drag and punch, Director completion, then free Movie and Director hint samples. Every action has a dedicated instruction strip above the board, a marked destination, or a nearby click callout—never text covering the movie tickets; afterward it becomes a compact replayable reference.
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
- The Hint Shop uses dark inactive surfaces so unavailable choices recede while purchasable and owned clues keep visual emphasis.
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
- Use the bezel controls to return to the main menu, mute sound, reduce the CRT treatment, or restart the current session.
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
- `app/components/GameMenu.tsx` — CineRuckus title screen, New Run entry point, and four-mode quick-play submenu
- `app/components/GameLoopTutorial.tsx` — controlled real-object drag lesson, wrong-answer punch, completion, free hint samples, and compact reference
- `app/components/CompletionArchiveSequence.tsx` — three-ticket snap, punch, stack compression, and Victory Area handoff
- `app/components/StageResultsOverlay.tsx` — animated stage score transfer, performance stats, and next-stage handoff
- `app/components/ReleaseTimelineStage.tsx` — Stage 2 anchor selection, chronological ticket placement, scoring HUD, and results handoff
- `app/components/CastCallGame.tsx` — Stage 3 one-at-a-time prompt flow, pointer interaction, feedback timing, replay, and results handoff
- `app/components/CastCallCards.tsx` and `app/components/CastCallHud.tsx` — flexible Polaroid, movie target, cast progress, HUD, and results presentation
- `app/components/CinemaMapGame.tsx`, `app/components/CinemaWorldMap.tsx`, and `app/components/MovieGeoTicket.tsx` — Stage 4 flow, vector map gestures/hit testing, journey markers, and physical ticket interaction
- `app/components/CinemaMapProgressHud.tsx` — lightweight Cinema Map console progress outside the lazy map bundle
- `app/components/CinemaMapHud.tsx` — end-of-round journey report inside the lazy map bundle
- `app/components/ConstellationCard.tsx` — reusable movie tickets, director slots, hint stickers, and victory chips
- `app/components/MovieDossierOverlay.tsx` — shared full-screen movie hint inspection experience
- `app/data/game-engine.ts` — deterministic state transitions, fairness rules, economy, ranks, and centralized `GAME_CONFIG`
- `app/data/cast-call-engine.ts` and `app/data/cast-call-data.ts` — deterministic Cast Call queue/scoring logic and replaceable four-film prototype content
- `app/data/cinema-map-engine.ts`, `app/data/cinema-map-data.ts`, and `app/data/cinema-map-viewport.ts` — deterministic country validation/scoring, curated eight-film content, and pure map-transform helpers
- `app/data/cinema-map-assets.json` — replaceable 2:3 movie-image requirements; the prototype intentionally uses safe CSS placeholders
- `app/data/world-map-countries.json` — preprocessed local SVG paths and centroids generated by `scripts/build-cinema-map-data.mjs`
- `app/data/directors.ts` and `app/data/expanded-directors.ts` — local typed director and film pool
- `app/data/director-hints.ts` — six authored, answer-safe profile clues for every director
- `app/globals.css` — responsive CRT cabinet, screen effects, pixel-inspired UI, and motion fallbacks
- `tests/` — game-engine and rendered-interface checks

Edit `GAME_CONFIG` in `app/data/game-engine.ts` to tune stage size, director capacity, ticket count, arrival timing, combo thresholds, rewards, and hint prices. All content and run state remain local to the browser: there is no backend, database, login, persistence, or runtime data API.

## Map data

Cinema Map uses **Natural Earth 1:50m Admin-0 Countries and Tiny Country Points, version 5.1.2**, pinned to the published release revision and preprocessed into an equirectangular SVG dataset. Natural Earth data is public domain and does not require attribution; provenance is retained here and in the generated manifest. Natural Earth depicts de-facto boundaries by default. Regenerate the local payload with:

```bash
node scripts/build-cinema-map-data.mjs
```

Source: [Natural Earth 1:50m Cultural Vectors](https://www.naturalearthdata.com/downloads/50m-cultural-vectors/) · [Terms of Use](https://www.naturalearthdata.com/about/terms-of-use/)
