import assert from "node:assert/strict";
import test from "node:test";

import {
  GAME_CONFIG,
  actionableMovieCount,
  attemptAssignment,
  canUseEliminationHint,
  createInitialGame,
  hintCostForMovie,
  hasNextStage,
  purchaseDirectorHint,
  purchaseHint,
  remainingDirectorCandidates,
  runAccuracy,
  scoreMultiplierForStreak,
  stageAccuracy,
  startNextStage,
} from "../app/data/game-engine.ts";
import { directors } from "../app/data/directors.ts";
import {
  DIRECTOR_DIFFICULTY_TIER_BY_ID,
  DIRECTOR_DIFFICULTY_TIERS,
  STAGE_DIFFICULTY_MIXES,
  directorDifficultyTier,
} from "../app/data/director-difficulty.ts";
import { DIRECTOR_HINT_PROFILES, DIRECTOR_HINT_TYPES } from "../app/data/director-hints.ts";
import { GENRE_COLORS, genreColor, genreFamily } from "../app/data/genre-colors.ts";

function directorPool(count = 20) {
  return Array.from({ length: count }, (_, directorIndex) => ({
    id: `director-${directorIndex}`,
    name: `Director ${directorIndex}`,
    initials: `D${directorIndex}`,
    films: Array.from({ length: 3 }, (_, filmIndex) => ({
      id: `director-${directorIndex}-film-${filmIndex}`,
      title: `Film ${directorIndex}-${filmIndex}`,
      year: 1980 + directorIndex + filmIndex,
      genre: "Drama",
      accent: "#ff00aa",
    })),
  }));
}

function ownerOf(state, filmId) {
  return state.movies[filmId].ownerDirectorId;
}

function actionableFilm(state) {
  return state.visibleMovieIds.find((filmId) => state.activeDirectorIds.includes(ownerOf(state, filmId)));
}

function resolveCorrect(state, config = GAME_CONFIG) {
  const filmId = actionableFilm(state);
  assert.ok(filmId, "expected an actionable movie");
  return attemptAssignment(state, filmId, ownerOf(state, filmId), config);
}

function assertPlayingField(state, config = GAME_CONFIG) {
  if (state.status !== "playing") return;
  const unresolvedStageMovies = state.stageDirectorIds.reduce(
    (total, directorId) => total + config.moviesPerDirector - state.assignments[directorId].length,
    0,
  );
  assert.equal(
    state.visibleMovieIds.length,
    Math.min(config.visibleMovieCount, unresolvedStageMovies),
    "playing field must stay full until cleanup runs out of stage movies",
  );
  assert.equal(
    new Set(state.visibleMovieIds).size,
    state.visibleMovieIds.length,
    "playing field must not contain duplicate tickets",
  );
  assert.ok(state.activeDirectorIds.length > 0, "a playing state must have a legal director target");
  assert.ok(
    state.activeDirectorIds.length <= config.maximumActiveDirectors,
    "active director capacity must be respected",
  );
  assert.equal(
    new Set(state.activeDirectorIds).size,
    state.activeDirectorIds.length,
    "active directors must be unique",
  );
  assert.equal(state.directorSlots.length, config.maximumActiveDirectors, "director slot count must stay fixed");
  assert.deepEqual(
    state.directorSlots.filter(Boolean).sort(),
    [...state.activeDirectorIds].sort(),
    "fixed director slots must contain every active director exactly once",
  );
  assert.ok(actionableFilm(state), "a playing field must expose an active-owner movie");
  for (const filmId of state.visibleMovieIds) {
    assert.ok(state.movies[filmId], `visible runtime missing for ${filmId}`);
    assert.ok(
      state.movies[filmId].status === "active" || state.movies[filmId].status === "waiting_for_director",
      `visible ticket ${filmId} has invalid status ${state.movies[filmId].status}`,
    );
  }
}

test("the real 60-director pool is unique and supports randomized runs", () => {
  assert.equal(directors.length, 60);
  assert.equal(new Set(directors.map((director) => director.id)).size, directors.length);
  const filmIds = directors.flatMap((director) => director.films.map((film) => film.id));
  assert.equal(new Set(filmIds).size, filmIds.length);
  assert.ok(directors.every((director) => director.films.length >= GAME_CONFIG.moviesPerDirector));

  const runSignatures = new Set();
  for (let seedIndex = 0; seedIndex < 200; seedIndex += 1) {
    const state = createInitialGame(directors, `real-pool-${seedIndex}`);
    assert.equal(state.runDirectorIds.length, directors.length);
    assert.equal(state.stageDirectorIds.length, GAME_CONFIG.stageDirectorCount);
    assertPlayingField(state);
    runSignatures.add(state.runDirectorIds.join("|"));
  }
  assert.ok(runSignatures.size > 190, "real runs should not collapse into a fixed director order");
});

test("the provisional tier list covers the library and creates a rising stage curve", () => {
  assert.equal(Object.keys(DIRECTOR_DIFFICULTY_TIER_BY_ID).length, directors.length);
  assert.deepEqual(
    Object.fromEntries(DIRECTOR_DIFFICULTY_TIERS.map((tier) => [
      tier,
      directors.filter((director) => directorDifficultyTier(director.id) === tier).length,
    ])),
    { accessible: 16, familiar: 19, challenging: 17, archive: 8 },
  );

  for (const director of directors) {
    assert.ok(DIRECTOR_DIFFICULTY_TIER_BY_ID[director.id], `${director.name} needs a difficulty tier`);
  }

  for (let seedIndex = 0; seedIndex < 40; seedIndex += 1) {
    const state = createInitialGame(directors, `tier-curve-${seedIndex}`);
    STAGE_DIFFICULTY_MIXES.forEach((expectedMix, stageIndex) => {
      const stageIds = state.runDirectorIds.slice(
        stageIndex * GAME_CONFIG.stageDirectorCount,
        (stageIndex + 1) * GAME_CONFIG.stageDirectorCount,
      );
      const actualMix = Object.fromEntries(DIRECTOR_DIFFICULTY_TIERS.map((tier) => [
        tier,
        stageIds.filter((directorId) => directorDifficultyTier(directorId) === tier).length,
      ]));
      assert.deepEqual(actualMix, expectedMix, `stage ${stageIndex + 1} should keep its configured tier mix`);
    });
  }

  assert.equal(STAGE_DIFFICULTY_MIXES[0].archive, 0);
  assert.ok(STAGE_DIFFICULTY_MIXES.at(-1).archive > STAGE_DIFFICULTY_MIXES[0].archive);
  assert.equal(GAME_CONFIG.moviesPerDirector, 3, "tiers must not change the completion workload");
});

test("every director has six authored clues that do not disclose the movie set", () => {
  assert.equal(Object.keys(DIRECTOR_HINT_PROFILES).length, directors.length);
  for (const director of directors) {
    const profile = DIRECTOR_HINT_PROFILES[director.id];
    assert.ok(profile, `missing director profile for ${director.name}`);
    assert.deepEqual(Object.keys(profile), [...DIRECTOR_HINT_TYPES]);
    for (const type of DIRECTOR_HINT_TYPES) {
      assert.ok(profile[type].length >= 25, `${director.name} ${type} should be specific`);
    }
    const profileCopy = Object.values(profile).join(" ").toLowerCase();
    for (const film of director.films) {
      const escapedTitle = film.title.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const exactTitle = new RegExp(`(?:^|[^a-z0-9])${escapedTitle}(?:$|[^a-z0-9])`);
      if (film.title.length > 4) assert.ok(!exactTitle.test(profileCopy), `${director.name}'s clues disclose ${film.title}`);
    }
  }
});

test("director hints use their own paid, persistent context", () => {
  let state = createInitialGame(directors, "director-hint-context");
  state = { ...state, coins: 20 };
  const directorId = state.activeDirectorIds[0];
  const cost = GAME_CONFIG.directorHintCosts.origin;
  const result = purchaseDirectorHint(state, directorId, "origin");
  assert.equal(result.ok, true);
  assert.equal(result.state.coins, 20 - cost);
  assert.equal(result.state.coinsSpent, cost);
  assert.equal(result.state.directorHints[directorId].origin?.content, DIRECTOR_HINT_PROFILES[directorId].origin);

  const duplicate = purchaseDirectorHint(result.state, directorId, "origin");
  assert.equal(duplicate.ok, false);
  assert.equal(duplicate.reason, "already_owned");
  assert.equal(duplicate.state, result.state);

  const inactive = state.upcomingDirectorIds[0];
  assert.ok(inactive);
  assert.equal(purchaseDirectorHint(state, inactive, "styleNote").reason, "not_active");
});

test("every movie uses the explicit seven-family color equals genre rule", () => {
  assert.deepEqual(GENRE_COLORS, {
    Romance: "#ff7eb6",
    Comedy: "#ffd84a",
    Drama: "#5d8dff",
    Horror: "#ff504e",
    "Sci-Fi": "#61eee0",
    Fantasy: "#8fdc62",
    "Crime/Thriller": "#b07cff",
  });
  assert.equal(genreFamily("Sci-fi horror"), "Horror");
  assert.equal(genreFamily("Neo-noir"), "Crime/Thriller");
  assert.equal(genreFamily("Adventure"), "Fantasy");
  assert.equal(genreFamily("Period drama"), "Drama");

  for (const film of directors.flatMap((director) => director.films)) {
    const family = genreFamily(film.genre);
    assert.ok(family in GENRE_COLORS, `${film.title} needs a supported visible genre family`);
    assert.equal(genreColor(film.genre), GENRE_COLORS[family]);
  }
});

test("starts with two directors and a fixed ten-card field", () => {
  const state = createInitialGame(directorPool(), "opening-seed");
  assert.equal(GAME_CONFIG.moviesPerDirector, 3);
  assert.equal(state.activeDirectorIds.length, 2);
  state.activeDirectorIds.forEach((directorId) => assert.equal(state.directorFilmIds[directorId].length, 3));
  assert.equal(state.visibleMovieIds.length, 10);
  assert.equal(new Set(state.visibleMovieIds).size, 10);
  assert.equal(state.nextDirectorIn, GAME_CONFIG.initialDirectorCountdown);
  assert.equal(state.runDirectorIds.length, 20);
  assert.equal(state.stageDirectorIds.length, GAME_CONFIG.stageDirectorCount);
  assert.deepEqual(state.stageDirectorIds, state.runDirectorIds.slice(0, GAME_CONFIG.stageDirectorCount));
  assert.equal(actionableMovieCount(state), 6);
  assert.equal(state.nextDirectorIn, 3);
});

test("the fixed board uses a configurable best-effort actionable movie target", () => {
  const pool = directorPool();
  const fiveTarget = { ...GAME_CONFIG, targetActionableMovieCount: 5 };
  let state = createInitialGame(pool, "density-five", fiveTarget);
  assert.equal(state.visibleMovieIds.length, 10);
  assert.equal(actionableMovieCount(state), 5);
  assert.equal(state.visibleMovieIds.length - actionableMovieCount(state), 5);

  state = resolveCorrect(state, fiveTarget).state;
  assert.equal(state.visibleMovieIds.length, 10);
  assert.equal(actionableMovieCount(state), 5, "an unseen active movie should refill the vacated slot up to the target");

  const sevenTarget = { ...GAME_CONFIG, targetActionableMovieCount: 7 };
  state = createInitialGame(pool, "density-seven", sevenTarget);
  assert.equal(actionableMovieCount(state), 6, "the target is best-effort when two active directors only have six movies");

  const threeDirectorTarget = { ...GAME_CONFIG, startingDirectors: 3, targetActionableMovieCount: 7 };
  state = createInitialGame(pool, "density-three-directors", threeDirectorTarget);
  assert.equal(state.visibleMovieIds.length, 10);
  assert.equal(actionableMovieCount(state), 7);
  assert.equal(state.visibleMovieIds.length - actionableMovieCount(state), 3, "future-director tickets remain on the board");
});

test("correct matches pay out, advance the countdown, and replenish the field", () => {
  const state = createInitialGame(directorPool(), "correct-seed");
  const outcome = resolveCorrect(state);
  assert.equal(outcome.kind, "correct");
  assert.equal(outcome.coinsAwarded, GAME_CONFIG.correctMatchCoins);
  assert.equal(outcome.scoreAwarded, GAME_CONFIG.correctMatchScore);
  assert.equal(outcome.state.correctAttempts, 1);
  assert.equal(outcome.state.coins, state.coins + GAME_CONFIG.correctMatchCoins);
  assert.equal(outcome.state.score, GAME_CONFIG.correctMatchScore);
  assert.equal(outcome.state.nextDirectorIn, GAME_CONFIG.initialDirectorCountdown - 1);
  assert.equal(outcome.state.visibleMovieIds.length, 10);
  assert.equal(runAccuracy(outcome.state), 100);
});

test("wrong answers keep the ticket playable and add an uncapped punch memory", () => {
  const pool = directorPool();
  const config = { ...GAME_CONFIG, initialDirectorCountdown: 99 };
  let state = createInitialGame(pool, "wrong-seed", config);
  const filmId = actionableFilm(state);
  assert.ok(filmId);
  const owner = ownerOf(state, filmId);
  const wrongTarget = state.activeDirectorIds.find((id) => id !== owner);
  assert.ok(wrongTarget);
  const wrong = attemptAssignment(state, filmId, wrongTarget, config);
  assert.equal(wrong.kind, "wrong");
  assert.equal(wrong.coinsAwarded, 0);
  assert.equal(wrong.scoreAwarded, 0);
  assert.equal(wrong.state.coins, state.coins);
  assert.equal("correctDirectorId" in wrong, false);
  assert.equal(wrong.state.movies[filmId].status, "active");
  assert.equal(wrong.state.movies[filmId].ownerDirectorId, owner);
  assert.equal(wrong.state.movies[filmId].punchCount, 1);
  assert.equal(wrong.state.visibleMovieIds.includes(filmId), true);
  assert.equal(wrong.state.visibleMovieIds.length, config.visibleMovieCount);
  assert.deepEqual(wrong.newlyVisibleMovieIds, []);
  state = wrong.state;

  for (let index = 1; index < 20; index += 1) {
    state = attemptAssignment(state, filmId, wrongTarget, config).state;
    assert.equal(state.visibleMovieIds.includes(filmId), true);
    assert.equal(state.movies[filmId].punchCount, index + 1);
  }
  assert.equal(state.wrongAttempts, 20);
  assert.deepEqual(state.movies[filmId].wrongDirectorIds, [wrongTarget]);
});

test("three correct movies complete a director and move its stack to victory", () => {
  const config = { ...GAME_CONFIG, initialDirectorCountdown: 99 };
  let state = createInitialGame(directorPool(), "completion-seed", config);
  const directorId = state.activeDirectorIds[0];
  const completedSlot = state.directorSlots.indexOf(directorId);
  const otherSlotSnapshot = [...state.directorSlots];
  const films = state.directorFilmIds[directorId];
  let lastOutcome;
  for (const filmId of films) {
    assert.ok(state.visibleMovieIds.includes(filmId));
    lastOutcome = attemptAssignment(state, filmId, directorId, config);
    state = lastOutcome.state;
  }
  assert.equal(lastOutcome.completedDirectorId, directorId);
  assert.equal(lastOutcome.coinsAwarded, config.correctMatchCoins + config.directorCompletionCoins);
  assert.equal(lastOutcome.scoreAwarded, config.correctMatchScore + config.directorCompletionScore);
  assert.equal(state.activeDirectorIds.includes(directorId), false);
  assert.equal(state.directorSlots[completedSlot], null);
  otherSlotSnapshot.forEach((slotDirectorId, index) => {
    if (index !== completedSlot) assert.equal(state.directorSlots[index], slotDirectorId, "other directors must not slide into a cleared slot");
  });
  assert.equal(state.victoryDirectors.length, 1);
  assert.deepEqual(state.victoryDirectors[0].filmIds, films);
  assert.equal(state.assignments[directorId].length, 3);
  assert.equal(
    state.coins,
    config.startingCoins + config.moviesPerDirector * config.correctMatchCoins + config.directorCompletionCoins,
  );
});

test("the countdown spawns a director, then overflows at configured capacity", () => {
  const pool = directorPool();
  const spawnConfig = { ...GAME_CONFIG, initialDirectorCountdown: 1 };
  let state = createInitialGame(pool, "spawn-seed", spawnConfig);
  state = resolveCorrect(state, spawnConfig).state;
  assert.equal(state.activeDirectorIds.length, 3);
  assert.equal(state.directorSlots.filter(Boolean).length, 3);

  const overflowConfig = { ...GAME_CONFIG, maximumActiveDirectors: 2, initialDirectorCountdown: 1 };
  state = createInitialGame(pool, "overflow-seed", overflowConfig);
  state = resolveCorrect(state, overflowConfig).state;
  assert.equal(state.status, "lost");
  assert.equal(state.endReason, "board_overflow");
});

test("hints are gated, paid, stack on a ticket, and survive wrong punches", () => {
  const pool = directorPool();
  const config = { ...GAME_CONFIG, startingCoins: 100, initialDirectorCountdown: 1 };
  let state = createInitialGame(pool, "hint-seed", config);
  const filmId = actionableFilm(state);
  assert.ok(filmId);
  assert.equal(purchaseHint(state, filmId, "elimination", pool, config).reason, "not_available");
  assert.equal(purchaseHint(state, filmId, "directAnswer", pool, config).reason, "not_available");

  state = purchaseHint(state, filmId, "movieIdentification", pool, config).state;
  state = purchaseHint(state, filmId, "releaseDate", pool, config).state;
  state = purchaseHint(state, filmId, "verbalDirectorClue", pool, config).state;
  assert.ok(state.movies[filmId].hints.movieIdentification);
  assert.equal(state.movies[filmId].hints.releaseDate.content, `Released in ${pool.flatMap((director) => director.films).find((film) => film.id === filmId).year}.`);
  assert.ok(state.movies[filmId].hints.verbalDirectorClue);
  assert.equal(state.coins, 100 - config.hintCosts.movieIdentification - config.hintCosts.releaseDate - config.hintCosts.verbalDirectorClue);

  const owner = ownerOf(state, filmId);
  const wrongTarget = state.activeDirectorIds.find((id) => id !== owner);
  state = attemptAssignment(state, filmId, wrongTarget, config).state;
  assert.ok(state.movies[filmId].hints.movieIdentification);
  assert.ok(state.movies[filmId].hints.releaseDate);
  assert.ok(state.movies[filmId].hints.verbalDirectorClue);

  const nextFilm = actionableFilm(state);
  state = attemptAssignment(state, nextFilm, ownerOf(state, nextFilm), config).state;
  assert.equal(state.activeDirectorIds.length, 3);
  const eligibleFilm = actionableFilm(state);
  const elimination = purchaseHint(state, eligibleFilm, "elimination", pool, config);
  assert.equal(elimination.ok, true);
  assert.match(elimination.sticker.content, /^Crossed out: Director /);
});

test("Cross One Out is reusable, escalates 2 → 3 → 5, and preserves the correct final candidate", () => {
  const pool = directorPool();
  const config = { ...GAME_CONFIG, startingCoins: 100, eliminationHintCosts: [2, 3, 5] };
  let state = createInitialGame(pool, "repeatable-elimination", config);
  const filmId = actionableFilm(state);
  const owner = ownerOf(state, filmId);
  state = {
    ...state,
    activeDirectorIds: [owner, ...state.runDirectorIds.filter((directorId) => directorId !== owner).slice(0, 4)],
  };

  const charged = [];
  for (const expectedCost of [2, 3, 5, 5]) {
    assert.equal(canUseEliminationHint(state, filmId), true);
    assert.equal(hintCostForMovie(state, filmId, "elimination", config), expectedCost);
    const beforeCoins = state.coins;
    const result = purchaseHint(state, filmId, "elimination", pool, config);
    assert.equal(result.ok, true);
    assert.notEqual(result.sticker.eliminatedDirectorId, owner);
    charged.push(beforeCoins - result.state.coins);
    state = result.state;
  }

  assert.deepEqual(charged, [2, 3, 5, 5]);
  assert.equal(state.movies[filmId].hints.elimination.purchaseCount, 4);
  assert.equal(new Set(state.movies[filmId].hints.elimination.eliminatedDirectorIds).size, 4);
  assert.deepEqual(remainingDirectorCandidates(state, filmId), [owner]);
  assert.equal(canUseEliminationHint(state, filmId), false);
  const finalAttempt = purchaseHint(state, filmId, "elimination", pool, config);
  assert.equal(finalAttempt.ok, false);
  assert.equal(finalAttempt.reason, "no_candidate");
  assert.equal(finalAttempt.state.coins, state.coins);
});

test("Cross One Out respects the escalating price before changing the ticket", () => {
  const pool = directorPool();
  const config = { ...GAME_CONFIG, startingCoins: 2, eliminationHintCosts: [2, 3, 5] };
  let state = createInitialGame(pool, "elimination-wallet", config);
  const filmId = actionableFilm(state);
  const owner = ownerOf(state, filmId);
  state = {
    ...state,
    activeDirectorIds: [owner, ...state.runDirectorIds.filter((directorId) => directorId !== owner).slice(0, 2)],
  };
  state = purchaseHint(state, filmId, "elimination", pool, config).state;
  const beforeSticker = state.movies[filmId].hints.elimination;
  const result = purchaseHint(state, filmId, "elimination", pool, config);
  assert.equal(result.ok, false);
  assert.equal(result.reason, "not_enough_coins");
  assert.equal(result.state.movies[filmId].hints.elimination, beforeSticker);
});

test("Emergency Answer reveals the correct director and applies only its configurable match-score reduction", () => {
  const pool = directorPool();
  const config = {
    ...GAME_CONFIG,
    startingCoins: 100,
    moviesPerDirector: 1,
    emergencyAnswerScoreMultiplier: 0.5,
  };
  let state = createInitialGame(pool, "emergency-answer", config);
  const filmId = actionableFilm(state);
  const owner = ownerOf(state, filmId);
  state = {
    ...state,
    activeDirectorIds: [owner, ...state.runDirectorIds.filter((directorId) => directorId !== owner).slice(0, 2)],
  };

  const purchase = purchaseHint(state, filmId, "directAnswer", pool, config);
  assert.equal(purchase.ok, true);
  assert.equal(purchase.sticker.label, "EMERGENCY ANSWER");
  assert.equal(purchase.sticker.content, `Correct director: ${pool.find((director) => director.id === owner).name}.`);
  assert.equal(purchase.state.coins, 100 - config.hintCosts.directAnswer);
  assert.equal(purchase.state.moveCount, state.moveCount, "buying Emergency Answer must not spend a move");

  const outcome = attemptAssignment(purchase.state, filmId, owner, config);
  const reducedMatchScore = Math.round(config.correctMatchScore * config.emergencyAnswerScoreMultiplier);
  assert.equal(outcome.scoreAwarded, reducedMatchScore + config.directorCompletionScore);
  assert.equal(outcome.state.score, reducedMatchScore + config.directorCompletionScore);
  assert.equal(outcome.coinsAwarded, config.correctMatchCoins + config.directorCompletionCoins);
});

test("a stage stops future content, enters cleanup, and completes only after the table is empty", () => {
  const pool = directorPool(4);
  const config = {
    ...GAME_CONFIG,
    stageDirectorCount: 2,
    startingDirectors: 2,
    visibleMovieCount: 10,
    targetActionableMovieCount: 6,
    initialDirectorCountdown: 99,
  };
  let state = createInitialGame(pool, "stage-cleanup", config);
  const firstStageIds = [...state.stageDirectorIds];
  const futureStageIds = state.runDirectorIds.filter((directorId) => !firstStageIds.includes(directorId));
  assert.equal(state.upcomingDirectorIds.length, 0);
  assert.equal(state.stagePhase, "cleanup");
  assert.equal(state.visibleMovieIds.length, 6);
  assert.ok(state.visibleMovieIds.every((filmId) => firstStageIds.includes(ownerOf(state, filmId))));
  assert.ok(state.visibleMovieIds.every((filmId) => !futureStageIds.includes(ownerOf(state, filmId))));

  const cleanupCounts = [state.visibleMovieIds.length];
  while (state.status === "playing") {
    const outcome = resolveCorrect(state, config);
    assert.deepEqual(outcome.newlyVisibleMovieIds, [], "cleanup matches must not replenish solved tickets");
    state = outcome.state;
    cleanupCounts.push(state.visibleMovieIds.length);
  }
  assert.deepEqual(cleanupCounts, [6, 5, 4, 3, 2, 1, 0]);
  assert.equal(state.status, "stage_complete");
  assert.equal(state.visibleMovieIds.length, 0);
  assert.equal(state.activeDirectorIds.length, 0);
  assert.equal(state.victoryDirectors.length, 2);
  assert.equal(stageAccuracy(state), 100);
  assert.equal(hasNextStage(state, config), true);

  const stageOneScore = state.score;
  const stageOneCombo = state.correctStreak;
  state = startNextStage(state, config);
  assert.equal(state.status, "playing");
  assert.equal(state.stageNumber, 2);
  assert.equal(state.score, stageOneScore);
  assert.equal(state.correctStreak, stageOneCombo);
  assert.equal(state.stageStartScore, stageOneScore);
  assert.deepEqual(state.stageDirectorIds, futureStageIds);
  assert.ok(state.visibleMovieIds.every((filmId) => futureStageIds.includes(ownerOf(state, filmId))));
});

test("cleanup waits until every remaining stage movie is physically on the board", () => {
  const pool = directorPool(4);
  const config = {
    ...GAME_CONFIG,
    stageDirectorCount: 4,
    startingDirectors: 4,
    initialDirectorCountdown: 99,
  };
  let state = createInitialGame(pool, "cleanup-backlog", config);
  assert.equal(state.upcomingDirectorIds.length, 0);
  assert.equal(state.visibleMovieIds.length, 10);
  assert.equal(state.stagePhase, "active", "two unresolved stage movies are still off-board");

  let outcome = resolveCorrect(state, config);
  state = outcome.state;
  assert.equal(state.visibleMovieIds.length, 10);
  assert.equal(outcome.newlyVisibleMovieIds.length, 1);
  assert.equal(state.stagePhase, "active");

  outcome = resolveCorrect(state, config);
  state = outcome.state;
  assert.equal(state.visibleMovieIds.length, 10);
  assert.equal(outcome.newlyVisibleMovieIds.length, 1);
  assert.equal(state.stagePhase, "cleanup", "cleanup starts once all ten remaining movies are visible");

  outcome = resolveCorrect(state, config);
  assert.equal(outcome.state.visibleMovieIds.length, 9);
  assert.deepEqual(outcome.newlyVisibleMovieIds, []);
  assert.equal(outcome.state.stagePhase, "cleanup");
});

test("correct streaks heat to ×2, catch fire at ×3, pay bonus coins, and reset on a mistake", () => {
  const pool = directorPool();
  const config = {
    ...GAME_CONFIG,
    initialDirectorCountdown: 99,
    directorCountdownProgression: [99],
    directorCompletionCoins: 0,
    directorCompletionScore: 0,
  };
  let state = createInitialGame(pool, "combo-heat", config);
  const expectedMultipliers = [1, 1, 1, 2, 2, 3];
  const expectedCoinBonuses = [0, 0, 0, 1, 1, 2];

  expectedMultipliers.forEach((expectedMultiplier, index) => {
    const outcome = resolveCorrect(state, config);
    assert.equal(outcome.multiplier, expectedMultiplier);
    assert.equal(outcome.combo, index + 1);
    assert.equal(outcome.comboBonusCoins, expectedCoinBonuses[index]);
    assert.equal(outcome.scoreAwarded, config.correctMatchScore * expectedMultiplier);
    assert.equal(outcome.coinsAwarded, config.correctMatchCoins + expectedCoinBonuses[index]);
    state = outcome.state;
  });
  assert.equal(state.correctStreak, 6);
  assert.equal(state.currentMultiplier, 3);
  assert.equal(state.bestCombo, 6);
  assert.equal(state.highestMultiplier, 3);
  assert.equal(scoreMultiplierForStreak(4, config), 2);
  assert.equal(scoreMultiplierForStreak(6, config), 3);

  const filmId = actionableFilm(state);
  const owner = ownerOf(state, filmId);
  const wrongTarget = state.runDirectorIds.find((directorId) => directorId !== owner);
  if (!state.activeDirectorIds.includes(wrongTarget)) state = { ...state, activeDirectorIds: [...state.activeDirectorIds, wrongTarget] };
  const wrong = attemptAssignment(state, filmId, wrongTarget, config);
  assert.equal(wrong.state.correctStreak, 0);
  assert.equal(wrong.state.currentMultiplier, 1);
  assert.equal(wrong.state.bestCombo, 6);
});

test("100 deterministic perfect runs clear every staged director with score continuity", () => {
  const pool = directorPool();
  for (let seedIndex = 0; seedIndex < 100; seedIndex += 1) {
    let state = createInitialGame(pool, `perfect-run-${seedIndex}`);
    let safety = 0;
    while (state.status !== "won" && state.status !== "lost") {
      if (state.status === "stage_complete") {
        const scoreBefore = state.score;
        state = startNextStage(state);
        assert.equal(state.score, scoreBefore);
        continue;
      }
      assertPlayingField(state);
      state = resolveCorrect(state).state;
      safety += 1;
      assert.ok(safety <= pool.length * GAME_CONFIG.moviesPerDirector + 5);
    }
    assert.equal(state.status, "won", `perfect seed ${seedIndex} should be winnable`);
    assert.equal(state.endReason, "archive_complete");
    assert.equal(state.victoryDirectors.length, pool.length);
    assert.equal(
      state.victoryDirectors.reduce((total, director) => total + director.filmIds.length, 0),
      pool.length * GAME_CONFIG.moviesPerDirector,
    );
    assert.equal(state.correctAttempts, pool.length * GAME_CONFIG.moviesPerDirector);
    assert.equal(state.wrongAttempts, 0);
  }
});

test("150 deterministic mixed-play runs preserve staged playability invariants", () => {
  const pool = directorPool();
  for (let seedIndex = 0; seedIndex < 150; seedIndex += 1) {
    let state = createInitialGame(pool, `mixed-run-${seedIndex}`);
    let step = 0;
    while (state.status !== "won" && state.status !== "lost" && step < 180) {
      if (state.status === "stage_complete") {
        assert.equal(state.visibleMovieIds.length, 0);
        state = startNextStage(state);
        continue;
      }
      assertPlayingField(state);
      const filmId = actionableFilm(state);
      assert.ok(filmId);
      const ownerId = ownerOf(state, filmId);
      const wrongTarget = state.activeDirectorIds.find((directorId) => directorId !== ownerId);
      const deliberatelyWrong = step % 5 === 4 && wrongTarget;
      state = attemptAssignment(state, filmId, deliberatelyWrong || ownerId).state;
      step += 1;
    }
    assert.ok(state.status === "won" || state.status === "lost", `mixed seed ${seedIndex} should terminate within the safety bound`);
    assert.ok(state.status === "won" || state.status === "lost");
  }
});

test("200 deterministic punched tickets stay visible, playable, and keep every hint", () => {
  const pool = directorPool();
  const config = {
    ...GAME_CONFIG,
    startingCoins: 100,
    initialDirectorCountdown: 99,
    directorCountdownProgression: [99],
  };

  for (let seedIndex = 0; seedIndex < 200; seedIndex += 1) {
    let state = createInitialGame(pool, `punch-run-${seedIndex}`, config);
    const filmId = actionableFilm(state);
    assert.ok(filmId);
    const ownerId = ownerOf(state, filmId);
    const otherDirectorId = state.activeDirectorIds.find((directorId) => directorId !== ownerId);
    assert.ok(otherDirectorId);

    state = purchaseHint(state, filmId, "movieIdentification", pool, config).state;
    state = purchaseHint(state, filmId, "verbalDirectorClue", pool, config).state;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const wrong = attemptAssignment(state, filmId, otherDirectorId, config);
      assert.equal("correctDirectorId" in wrong, false);
      assert.deepEqual(wrong.newlyVisibleMovieIds, []);
      state = wrong.state;
      assert.equal(state.visibleMovieIds.includes(filmId), true);
      assert.equal(state.movies[filmId].status, "active");
      assert.equal(state.movies[filmId].punchCount, attempt + 1);
      assertPlayingField(state, config);
    }

    assert.equal(state.moveCount, 8);
    assert.ok(state.movies[filmId].hints.movieIdentification);
    assert.ok(state.movies[filmId].hints.verbalDirectorClue);
    assert.deepEqual(state.movies[filmId].wrongDirectorIds, [otherDirectorId]);
  }
});

test("a due third match frees capacity before the scheduled arrival in 200 seeds", () => {
  const pool = directorPool();
  const config = {
    ...GAME_CONFIG,
    maximumActiveDirectors: 2,
    initialDirectorCountdown: 3,
    directorCountdownProgression: [3],
  };

  for (let seedIndex = 0; seedIndex < 200; seedIndex += 1) {
    let state = createInitialGame(pool, `clutch-run-${seedIndex}`, config);
    const completingDirectorId = state.activeDirectorIds[0];
    let finalOutcome;
    for (const filmId of state.directorFilmIds[completingDirectorId]) {
      finalOutcome = attemptAssignment(state, filmId, completingDirectorId, config);
      state = finalOutcome.state;
    }
    assert.equal(state.status, "playing", `clutch seed ${seedIndex} must not overflow`);
    assert.equal(finalOutcome.completedDirectorId, completingDirectorId);
    assert.ok(finalOutcome.spawnedDirectorId);
    assert.equal(state.activeDirectorIds.length, config.maximumActiveDirectors);
    assert.equal(state.victoryDirectors.length, 1);
    assertPlayingField(state, config);
  }
});

test("a due arrival at full capacity overflows consistently in 200 seeds", () => {
  const pool = directorPool();
  const config = {
    ...GAME_CONFIG,
    maximumActiveDirectors: 2,
    initialDirectorCountdown: 1,
    directorCountdownProgression: [1],
  };

  for (let seedIndex = 0; seedIndex < 200; seedIndex += 1) {
    const initial = createInitialGame(pool, `overflow-run-${seedIndex}`, config);
    assertPlayingField(initial, config);
    const outcome = resolveCorrect(initial, config);
    assert.equal(outcome.state.status, "lost");
    assert.equal(outcome.state.endReason, "board_overflow");
    assert.equal(outcome.state.activeDirectorIds.length, config.maximumActiveDirectors);
    assert.equal(outcome.state.visibleMovieIds.length, config.visibleMovieCount - 1);
  }
});
