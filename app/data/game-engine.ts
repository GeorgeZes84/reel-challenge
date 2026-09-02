import type { Director, Film } from "./directors";
import {
  DIRECTOR_DIFFICULTY_TIERS,
  STAGE_DIFFICULTY_MIXES,
  directorDifficultyTier,
  type StageDifficultyMix,
} from "./director-difficulty.ts";
import {
  DIRECTOR_HINT_LABELS,
  directorHintProfile,
  type DirectorHintType,
} from "./director-hints.ts";

export const HINT_TYPES = [
  "movieIdentification",
  "releaseDate",
  "verbalDirectorClue",
  "elimination",
  "directAnswer",
] as const;

export type HintType = (typeof HINT_TYPES)[number];
export type GameStatus = "playing" | "stage_complete" | "won" | "lost";
export type StagePhase = "active" | "cleanup";
export type MovieStatus = "unseen" | "active" | "assigned" | "waiting_for_director" | "completed";

export type HintSticker = {
  type: HintType;
  label: string;
  content: string;
  eliminatedDirectorId?: string;
  eliminatedDirectorIds?: string[];
  purchaseCount?: number;
  purchasedAtMove: number;
};

export type MovieRuntime = {
  filmId: string;
  ownerDirectorId: string;
  status: MovieStatus;
  punchCount: number;
  wrongDirectorIds: string[];
  hints: Partial<Record<HintType, HintSticker>>;
};

export type DirectorHintReveal = {
  type: DirectorHintType;
  label: string;
  content: string;
  purchasedAtMove: number;
};

export type VictoryDirector = {
  directorId: string;
  filmIds: string[];
  completedAtMove: number;
};

export type GameState = {
  seed: string;
  status: GameStatus;
  endReason: "archive_complete" | "board_overflow" | null;
  runDirectorIds: string[];
  stageNumber: number;
  stagePhase: StagePhase;
  stageDirectorIds: string[];
  directorFilmIds: Record<string, string[]>;
  activeDirectorIds: string[];
  upcomingDirectorIds: string[];
  assignments: Record<string, string[]>;
  victoryDirectors: VictoryDirector[];
  visibleMovieIds: string[];
  movies: Record<string, MovieRuntime>;
  directorHints: Record<string, Partial<Record<DirectorHintType, DirectorHintReveal>>>;
  moveCount: number;
  nextDirectorIn: number;
  drawSerial: number;
  score: number;
  coins: number;
  coinsSpent: number;
  correctAttempts: number;
  wrongAttempts: number;
  correctStreak: number;
  currentMultiplier: number;
  bestCombo: number;
  highestMultiplier: number;
  stageStartScore: number;
  stageStartMoveCount: number;
  stageStartCorrectAttempts: number;
  stageStartWrongAttempts: number;
  stageStartVictoryCount: number;
  stageBestCombo: number;
  stageHighestMultiplier: number;
};

export type GameConfig = {
  startingDirectors: number;
  maximumActiveDirectors: number;
  moviesPerDirector: number;
  visibleMovieCount: number;
  stageDirectorCount: number;
  stageDifficultyMixes: readonly StageDifficultyMix[];
  initialDirectorCountdown: number;
  directorCountdownProgression: number[];
  targetActionableMovieCount: number;
  startingCoins: number;
  correctMatchCoins: number;
  directorCompletionCoins: number;
  correctMatchScore: number;
  directorCompletionScore: number;
  comboTwoMultiplierAt: number;
  comboThreeMultiplierAt: number;
  comboTwoCoinBonus: number;
  comboThreeCoinBonus: number;
  emergencyAnswerScoreMultiplier: number;
  hintCosts: Record<HintType, number>;
  directorHintCosts: Record<DirectorHintType, number>;
  eliminationHintCosts: number[];
};

export const GAME_CONFIG: GameConfig = {
  startingDirectors: 2,
  maximumActiveDirectors: 5,
  moviesPerDirector: 3,
  visibleMovieCount: 10,
  stageDirectorCount: 10,
  stageDifficultyMixes: STAGE_DIFFICULTY_MIXES,
  initialDirectorCountdown: 3,
  directorCountdownProgression: [3],
  // Best-effort composition target for the fixed ten-ticket board. This is a
  // playtest tuning value, not a guarantee: the remaining unresolved movies
  // for active directors can legitimately fall below it between arrivals.
  targetActionableMovieCount: 6,
  startingCoins: 4,
  correctMatchCoins: 2,
  directorCompletionCoins: 5,
  correctMatchScore: 100,
  directorCompletionScore: 500,
  comboTwoMultiplierAt: 4,
  comboThreeMultiplierAt: 6,
  comboTwoCoinBonus: 1,
  comboThreeCoinBonus: 2,
  emergencyAnswerScoreMultiplier: 0.5,
  hintCosts: {
    movieIdentification: 1,
    releaseDate: 2,
    verbalDirectorClue: 4,
    elimination: 2,
    directAnswer: 10,
  },
  directorHintCosts: {
    origin: 1,
    careerPeriod: 1,
    genreTendency: 2,
    thematicDNA: 2,
    styleNote: 3,
    knownFor: 4,
  },
  eliminationHintCosts: [2, 3, 5],
};

export const RANKS = [
  { clears: 0, title: "Popcorn Intern", quip: "The trailers were very informative." },
  { clears: 1, title: "Trailer Detective", quip: "Can identify a montage at twenty paces." },
  { clears: 3, title: "Matinee Menace", quip: "Now correcting the group chat's movie picks." },
  { clears: 5, title: "Letterboxd Loudmouth", quip: "Arrived with rankings and a lighting opinion." },
  { clears: 7, title: "Auteur Whisperer", quip: "Directors adjust their framing when you enter." },
  { clears: 9, title: "Cinema Oracle", quip: "The film does not start until you are seated." },
] as const;

function randomFromSeed(seed: string) {
  let state = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    state ^= seed.charCodeAt(index);
    state = Math.imul(state, 16777619);
  }
  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffleWith<T>(items: readonly T[], random: () => number): T[] {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function tieredDirectorOrder(
  directors: readonly Director[],
  random: () => number,
  config: GameConfig,
): Director[] {
  if (config.stageDifficultyMixes.length === 0) return shuffleWith(directors, random);

  const buckets = Object.fromEntries(
    DIRECTOR_DIFFICULTY_TIERS.map((tier) => [
      tier,
      shuffleWith(directors.filter((director) => directorDifficultyTier(director.id) === tier), random),
    ]),
  ) as Record<(typeof DIRECTOR_DIFFICULTY_TIERS)[number], Director[]>;
  const ordered: Director[] = [];
  let stageIndex = 0;

  while (ordered.length < directors.length) {
    const stageSize = Math.min(config.stageDirectorCount, directors.length - ordered.length);
    const mix = config.stageDifficultyMixes[
      Math.min(stageIndex, config.stageDifficultyMixes.length - 1)
    ];
    const stage: Director[] = [];

    for (const tier of DIRECTOR_DIFFICULTY_TIERS) {
      const requested = Math.min(mix?.[tier] ?? 0, stageSize - stage.length);
      stage.push(...buckets[tier].splice(0, requested));
    }

    // Custom pools and future data may not match the default mix exactly.
    // Fill any shortage without dropping Directors or changing stage size.
    while (stage.length < stageSize) {
      const fallbackTier = DIRECTOR_DIFFICULTY_TIERS.find((tier) => buckets[tier].length > 0);
      if (!fallbackTier) break;
      const nextDirector = buckets[fallbackTier].shift();
      if (nextDirector) stage.push(nextDirector);
    }

    ordered.push(...shuffleWith(stage, random));
    stageIndex += 1;
  }

  return ordered;
}

function filmMap(directorPool: readonly Director[]) {
  return new Map(directorPool.flatMap((director) => director.films.map((film) => [film.id, film] as const)));
}

function directorMap(directorPool: readonly Director[]) {
  return new Map(directorPool.map((director) => [director.id, director] as const));
}

function canDraw(movie: MovieRuntime, state: GameState) {
  if (state.visibleMovieIds.includes(movie.filmId)) return false;
  if (movie.status === "assigned" || movie.status === "completed") return false;
  return true;
}

export function actionableMovieCount(state: GameState): number {
  const activeSet = new Set(state.activeDirectorIds);
  return state.visibleMovieIds.filter((filmId) => activeSet.has(state.movies[filmId].ownerDirectorId)).length;
}

function refillMovieField(state: GameState, config: GameConfig): GameState {
  if (state.status !== "playing" || state.stagePhase === "cleanup") return state;
  const missing = config.visibleMovieCount - state.visibleMovieIds.length;
  if (missing <= 0) return state;

  const random = randomFromSeed(`${state.seed}:draw:${state.drawSerial}`);
  const runtimes = Object.values(state.movies);
  const activeSet = new Set(state.activeDirectorIds);
  const stageSet = new Set(state.stageDirectorIds);
  const drawable = runtimes.filter((movie) => stageSet.has(movie.ownerDirectorId) && canDraw(movie, state));

  const activeCandidates = shuffleWith(
    drawable.filter((movie) => activeSet.has(movie.ownerDirectorId)),
    random,
  );
  const otherCandidates = shuffleWith(
    drawable.filter((movie) => !activeSet.has(movie.ownerDirectorId)),
    random,
  );

  const targetActionable = Math.max(
    1,
    Math.min(config.visibleMovieCount, Math.round(config.targetActionableMovieCount)),
  );
  const actionableOnField = actionableMovieCount(state);
  const actionableNeeded = Math.max(0, targetActionable - actionableOnField);
  const activeFill = activeCandidates
    .slice(0, Math.min(actionableNeeded, missing));
  const activeFillIds = new Set(activeFill.map((movie) => movie.filmId));
  const slotsAfterActiveTarget = missing - activeFill.length;

  // Preserve future-director tickets whenever the stage pool can supply them.
  // Active movies beyond the target are used only when otherwise required to
  // keep the fixed board full (for example during late-stage cleanup).
  const futureFill = otherCandidates.slice(0, slotsAfterActiveTarget);
  const slotsAfterFuture = slotsAfterActiveTarget - futureFill.length;
  const activeOverflow = activeCandidates
    .filter((movie) => !activeFillIds.has(movie.filmId))
    .slice(0, slotsAfterFuture);
  const newMovies = [...activeFill, ...futureFill, ...activeOverflow];
  const nextMovies = { ...state.movies };
  for (const movie of newMovies) {
    nextMovies[movie.filmId] = {
      ...movie,
      status: activeSet.has(movie.ownerDirectorId) ? "active" : "waiting_for_director",
    };
  }

  return {
    ...state,
    movies: nextMovies,
    visibleMovieIds: [...state.visibleMovieIds, ...newMovies.map((movie) => movie.filmId)],
    drawSerial: state.drawSerial + 1,
  };
}

function enterCleanupIfReady(state: GameState): GameState {
  if (state.status !== "playing" || state.stagePhase === "cleanup" || state.upcomingDirectorIds.length > 0) {
    return state;
  }

  const stageSet = new Set(state.stageDirectorIds);
  const hasOffBoardStageMovie = Object.values(state.movies).some(
    (movie) => stageSet.has(movie.ownerDirectorId) && canDraw(movie, state),
  );
  return hasOffBoardStageMovie ? state : { ...state, stagePhase: "cleanup" };
}

function directorCountdown(config: GameConfig, completedCount: number) {
  return config.directorCountdownProgression[Math.min(completedCount, config.directorCountdownProgression.length - 1)]
    ?? config.initialDirectorCountdown;
}

function advanceMoveAndDirector(state: GameState, config: GameConfig) {
  const moved: GameState = {
    ...state,
    moveCount: state.moveCount + 1,
    nextDirectorIn: state.upcomingDirectorIds.length > 0 ? Math.max(0, state.nextDirectorIn - 1) : 0,
  };
  if (moved.upcomingDirectorIds.length === 0) return moved;

  const scheduledArrival = moved.nextDirectorIn <= 0;
  const activeSet = new Set(moved.activeDirectorIds);
  const hasPlayableMovie = moved.visibleMovieIds.some((filmId) =>
    activeSet.has(moved.movies[filmId].ownerDirectorId)
  ) || Object.values(moved.movies).some((movie) =>
    activeSet.has(movie.ownerDirectorId) && canDraw(movie, moved)
  );
  const needsPlayableDirector = !hasPlayableMovie
    && moved.activeDirectorIds.length < config.maximumActiveDirectors;
  if (!scheduledArrival && !needsPlayableDirector) return moved;
  if (scheduledArrival && moved.activeDirectorIds.length >= config.maximumActiveDirectors) {
    return { ...moved, status: "lost" as const, endReason: "board_overflow" as const };
  }

  const [spawnedDirectorId, ...remainingUpcoming] = moved.upcomingDirectorIds;
  const nextMovies = { ...moved.movies };
  for (const movie of Object.values(nextMovies)) {
    if (movie.ownerDirectorId === spawnedDirectorId && moved.visibleMovieIds.includes(movie.filmId)) {
      nextMovies[movie.filmId] = { ...movie, status: "active" };
    }
  }
  return {
    ...moved,
    movies: nextMovies,
    activeDirectorIds: [...moved.activeDirectorIds, spawnedDirectorId],
    upcomingDirectorIds: remainingUpcoming,
    // An emergency arrival prevents an empty-board lock without consuming the
    // scheduled timer. A normal due arrival starts the next countdown.
    nextDirectorIn: scheduledArrival
      ? directorCountdown(config, moved.victoryDirectors.length)
      : moved.nextDirectorIn,
  };
}

export function createInitialGame(directorPool: readonly Director[], seed: string, config: GameConfig = GAME_CONFIG): GameState {
  const random = randomFromSeed(seed);
  const eligible = directorPool.filter((director) => director.films.length >= config.moviesPerDirector);
  const selected = tieredDirectorOrder(eligible, random, config);
  const directorFilmIds: Record<string, string[]> = {};
  const movies: Record<string, MovieRuntime> = {};

  for (const director of selected) {
    const selectedFilms = shuffleWith(director.films, random).slice(0, config.moviesPerDirector);
    directorFilmIds[director.id] = selectedFilms.map((film) => film.id);
    for (const film of selectedFilms) {
      movies[film.id] = {
        filmId: film.id,
        ownerDirectorId: director.id,
        status: "unseen",
        punchCount: 0,
        wrongDirectorIds: [],
        hints: {},
      };
    }
  }

  const runDirectorIds = selected.map((director) => director.id);
  const stageDirectorIds = runDirectorIds.slice(0, config.stageDirectorCount);
  const state: GameState = {
    seed,
    status: "playing",
    endReason: null,
    runDirectorIds,
    stageNumber: 1,
    stagePhase: "active",
    stageDirectorIds,
    directorFilmIds,
    activeDirectorIds: stageDirectorIds.slice(0, config.startingDirectors),
    upcomingDirectorIds: stageDirectorIds.slice(config.startingDirectors),
    assignments: Object.fromEntries(runDirectorIds.map((directorId) => [directorId, []])),
    victoryDirectors: [],
    visibleMovieIds: [],
    movies,
    directorHints: Object.fromEntries(runDirectorIds.map((directorId) => [directorId, {}])),
    moveCount: 0,
    nextDirectorIn: config.initialDirectorCountdown,
    drawSerial: 0,
    score: 0,
    coins: config.startingCoins,
    coinsSpent: 0,
    correctAttempts: 0,
    wrongAttempts: 0,
    correctStreak: 0,
    currentMultiplier: 1,
    bestCombo: 0,
    highestMultiplier: 1,
    stageStartScore: 0,
    stageStartMoveCount: 0,
    stageStartCorrectAttempts: 0,
    stageStartWrongAttempts: 0,
    stageStartVictoryCount: 0,
    stageBestCombo: 0,
    stageHighestMultiplier: 1,
  };
  return enterCleanupIfReady(refillMovieField(state, config));
}

export function scoreMultiplierForStreak(streak: number, config: GameConfig = GAME_CONFIG): number {
  if (streak >= config.comboThreeMultiplierAt) return 3;
  if (streak >= config.comboTwoMultiplierAt) return 2;
  return 1;
}

export function comboCoinBonus(multiplier: number, config: GameConfig = GAME_CONFIG): number {
  if (multiplier >= 3) return config.comboThreeCoinBonus;
  if (multiplier >= 2) return config.comboTwoCoinBonus;
  return 0;
}

export function currentStageVictoryCount(state: GameState): number {
  return state.victoryDirectors.filter((victory) => state.stageDirectorIds.includes(victory.directorId)).length;
}

export function hasNextStage(state: GameState, config: GameConfig = GAME_CONFIG): boolean {
  return state.stageNumber * config.stageDirectorCount < state.runDirectorIds.length;
}

export function stageAccuracy(state: GameState): number {
  const correct = state.correctAttempts - state.stageStartCorrectAttempts;
  const wrong = state.wrongAttempts - state.stageStartWrongAttempts;
  const attempts = correct + wrong;
  return attempts === 0 ? 100 : Math.round((correct / attempts) * 100);
}

function finishStageIfCleared(state: GameState, config: GameConfig): GameState {
  if (state.status !== "playing") return state;
  const everyDirectorCleared = state.stageDirectorIds.every(
    (directorId) => (state.assignments[directorId]?.length ?? 0) >= config.moviesPerDirector,
  );
  if (!everyDirectorCleared || state.activeDirectorIds.length > 0 || state.upcomingDirectorIds.length > 0 || state.visibleMovieIds.length > 0) {
    return state;
  }
  return { ...state, status: "stage_complete", nextDirectorIn: 0 };
}

export function startNextStage(state: GameState, config: GameConfig = GAME_CONFIG): GameState {
  if (state.status !== "stage_complete") throw new Error("The current stage is not complete.");
  const nextStageNumber = state.stageNumber + 1;
  const startIndex = state.stageNumber * config.stageDirectorCount;
  const stageDirectorIds = state.runDirectorIds.slice(startIndex, startIndex + config.stageDirectorCount);
  if (stageDirectorIds.length === 0) {
    return { ...state, status: "won", endReason: "archive_complete" };
  }

  const nextState: GameState = {
    ...state,
    status: "playing",
    endReason: null,
    stageNumber: nextStageNumber,
    stagePhase: "active",
    stageDirectorIds,
    activeDirectorIds: stageDirectorIds.slice(0, config.startingDirectors),
    upcomingDirectorIds: stageDirectorIds.slice(config.startingDirectors),
    visibleMovieIds: [],
    nextDirectorIn: config.initialDirectorCountdown,
    stageStartScore: state.score,
    stageStartMoveCount: state.moveCount,
    stageStartCorrectAttempts: state.correctAttempts,
    stageStartWrongAttempts: state.wrongAttempts,
    stageStartVictoryCount: state.victoryDirectors.length,
    stageBestCombo: state.correctStreak,
    stageHighestMultiplier: state.currentMultiplier,
  };
  return enterCleanupIfReady(refillMovieField(nextState, config));
}

export type AttemptOutcome = {
  kind: "correct" | "wrong";
  filmId: string;
  targetDirectorId: string;
  coinsAwarded: number;
  comboBonusCoins: number;
  scoreAwarded: number;
  combo: number;
  multiplier: number;
  completedDirectorId?: string;
  spawnedDirectorId?: string;
  newlyVisibleMovieIds: string[];
  rankUnlocked?: (typeof RANKS)[number];
  state: GameState;
};

export function attemptAssignment(
  state: GameState,
  filmId: string,
  targetDirectorId: string,
  config: GameConfig = GAME_CONFIG,
): AttemptOutcome {
  if (state.status !== "playing") throw new Error("The run is not active.");
  if (!state.visibleMovieIds.includes(filmId)) throw new Error("That movie is not on the field.");
  if (!state.activeDirectorIds.includes(targetDirectorId)) throw new Error("That director is not active.");

  const movie = state.movies[filmId];
  const previousVisible = new Set(state.visibleMovieIds);

  if (movie.ownerDirectorId !== targetDirectorId) {
    const wrongMovie: MovieRuntime = {
      ...movie,
      punchCount: movie.punchCount + 1,
      wrongDirectorIds: movie.wrongDirectorIds.includes(targetDirectorId)
        ? movie.wrongDirectorIds
        : [...movie.wrongDirectorIds, targetDirectorId],
    };
    let nextState: GameState = {
      ...state,
      movies: { ...state.movies, [filmId]: wrongMovie },
      wrongAttempts: state.wrongAttempts + 1,
      correctStreak: 0,
      currentMultiplier: 1,
    };
    nextState = advanceMoveAndDirector(nextState, config);
    nextState = enterCleanupIfReady(nextState);
    return {
      kind: "wrong",
      filmId,
      targetDirectorId,
      coinsAwarded: 0,
      comboBonusCoins: 0,
      scoreAwarded: 0,
      combo: 0,
      multiplier: 1,
      spawnedDirectorId: nextState.activeDirectorIds.find((id) => !state.activeDirectorIds.includes(id)),
      newlyVisibleMovieIds: [],
      state: nextState,
    };
  }

  const remainingVisible = state.visibleMovieIds.filter((id) => id !== filmId);

  const nextAssignments = {
    ...state.assignments,
    [targetDirectorId]: [...state.assignments[targetDirectorId], filmId],
  };
  const completed = nextAssignments[targetDirectorId].length >= config.moviesPerDirector;
  const nextMovies = { ...state.movies, [filmId]: { ...movie, status: "assigned" as const } };
  const combo = state.correctStreak + 1;
  const multiplier = scoreMultiplierForStreak(combo, config);
  const comboBonusCoins = comboCoinBonus(multiplier, config);
  const matchScore = Math.max(
    0,
    Math.round(config.correctMatchScore * (movie.hints.directAnswer ? config.emergencyAnswerScoreMultiplier : 1)),
  );
  const rawScore = matchScore + (completed ? config.directorCompletionScore : 0);
  const scoreAwarded = rawScore * multiplier;
  let activeDirectorIds = state.activeDirectorIds;
  let victoryDirectors = state.victoryDirectors;
  let coins = state.coins + config.correctMatchCoins + comboBonusCoins;
  const score = state.score + scoreAwarded;
  let rankUnlocked: (typeof RANKS)[number] | undefined;

  if (completed) {
    activeDirectorIds = state.activeDirectorIds.filter((id) => id !== targetDirectorId);
    const completedFilms = nextAssignments[targetDirectorId];
    for (const completedFilmId of completedFilms) {
      nextMovies[completedFilmId] = { ...nextMovies[completedFilmId], status: "completed" };
    }
    victoryDirectors = [
      ...state.victoryDirectors,
      { directorId: targetDirectorId, filmIds: completedFilms, completedAtMove: state.moveCount + 1 },
    ];
    coins += config.directorCompletionCoins;
    rankUnlocked = RANKS.find((rank) => rank.clears === victoryDirectors.length);
  }

  let nextState: GameState = {
    ...state,
    movies: nextMovies,
    assignments: nextAssignments,
    activeDirectorIds,
    victoryDirectors,
    visibleMovieIds: remainingVisible,
    correctAttempts: state.correctAttempts + 1,
    correctStreak: combo,
    currentMultiplier: multiplier,
    bestCombo: Math.max(state.bestCombo, combo),
    highestMultiplier: Math.max(state.highestMultiplier, multiplier),
    stageBestCombo: Math.max(state.stageBestCombo, combo),
    stageHighestMultiplier: Math.max(state.stageHighestMultiplier, multiplier),
    coins,
    score,
  };
  nextState = advanceMoveAndDirector(nextState, config);
  nextState = refillMovieField(nextState, config);
  nextState = enterCleanupIfReady(nextState);
  nextState = finishStageIfCleared(nextState, config);
  return {
    kind: "correct",
    filmId,
    targetDirectorId,
    coinsAwarded: config.correctMatchCoins + comboBonusCoins + (completed ? config.directorCompletionCoins : 0),
    comboBonusCoins,
    scoreAwarded,
    combo,
    multiplier,
    completedDirectorId: completed ? targetDirectorId : undefined,
    spawnedDirectorId: nextState.activeDirectorIds.find((id) => !activeDirectorIds.includes(id)),
    newlyVisibleMovieIds: nextState.visibleMovieIds.filter((id) => !previousVisible.has(id)),
    rankUnlocked,
    state: nextState,
  };
}

export type HintPurchaseResult = {
  ok: boolean;
  reason?: "not_visible" | "already_owned" | "not_enough_coins" | "not_available" | "no_candidate";
  sticker?: HintSticker;
  state: GameState;
};

export type DirectorHintPurchaseResult = {
  ok: boolean;
  reason?: "not_active" | "already_owned" | "not_enough_coins" | "no_profile";
  reveal?: DirectorHintReveal;
  state: GameState;
};

const hintLabels: Record<HintType, string> = {
  movieIdentification: "Frame check",
  releaseDate: "Release date",
  verbalDirectorClue: "Director note",
  elimination: "Cross one out",
  directAnswer: "EMERGENCY ANSWER",
};

function eliminationHistory(movie: MovieRuntime): string[] {
  const sticker = movie.hints.elimination;
  if (!sticker) return [];
  if (sticker.eliminatedDirectorIds) return sticker.eliminatedDirectorIds;
  return sticker.eliminatedDirectorId ? [sticker.eliminatedDirectorId] : [];
}

export function remainingDirectorCandidates(state: GameState, filmId: string): string[] {
  const movie = state.movies[filmId];
  if (!movie) return [];
  const crossedOut = new Set([...movie.wrongDirectorIds, ...eliminationHistory(movie)]);
  return state.activeDirectorIds.filter((directorId) => !crossedOut.has(directorId));
}

export function hintCostForMovie(
  state: GameState,
  filmId: string,
  type: HintType,
  config: GameConfig = GAME_CONFIG,
): number {
  if (type !== "elimination") return config.hintCosts[type];
  const movie = state.movies[filmId];
  const useCount = movie ? movie.hints.elimination?.purchaseCount ?? eliminationHistory(movie).length : 0;
  const costs = config.eliminationHintCosts.length > 0 ? config.eliminationHintCosts : [config.hintCosts.elimination];
  return costs[Math.min(useCount, costs.length - 1)];
}

export function canUseEliminationHint(state: GameState, filmId: string): boolean {
  const movie = state.movies[filmId];
  if (!movie || state.activeDirectorIds.length < 3) return false;
  const candidates = remainingDirectorCandidates(state, filmId);
  return candidates.length > 1 && candidates.some((directorId) => directorId !== movie.ownerDirectorId);
}

export function purchaseHint(
  state: GameState,
  filmId: string,
  type: HintType,
  directorPool: readonly Director[],
  config: GameConfig = GAME_CONFIG,
): HintPurchaseResult {
  if (!state.visibleMovieIds.includes(filmId)) return { ok: false, reason: "not_visible", state };
  const movie = state.movies[filmId];
  if (type !== "elimination" && movie.hints[type]) return { ok: false, reason: "already_owned", state };
  if ((type === "elimination" || type === "directAnswer") && state.activeDirectorIds.length < 3) {
    return { ok: false, reason: "not_available", state };
  }
  if (type === "elimination" && !canUseEliminationHint(state, filmId)) {
    return { ok: false, reason: "no_candidate", state };
  }
  const cost = hintCostForMovie(state, filmId, type, config);
  if (state.coins < cost) return { ok: false, reason: "not_enough_coins", state };

  const directorsById = directorMap(directorPool);
  const filmsById = filmMap(directorPool);
  const owner = directorsById.get(movie.ownerDirectorId);
  const film = filmsById.get(filmId);
  if (!owner || !film) return { ok: false, reason: "no_candidate", state };

  let content = "Open the sticker to inspect this clue.";
  let eliminatedDirectorId: string | undefined;
  let eliminatedDirectorIds: string[] | undefined;
  let purchaseCount = 1;
  if (type === "movieIdentification") {
    content = `Inspect one production frame from this ${film.genre.toLowerCase()} movie. No credits attached.`;
  } else if (type === "releaseDate") {
    content = `Released in ${film.year}.`;
  } else if (type === "verbalDirectorClue") {
    const otherFilm = owner.films.find((candidate) => candidate.id !== filmId) ?? owner.films[0];
    content = `This director also made “${otherFilm.title}.”`;
  } else if (type === "elimination") {
    const previousEliminations = eliminationHistory(movie);
    eliminatedDirectorId = remainingDirectorCandidates(state, filmId).find(
      (directorId) => directorId !== movie.ownerDirectorId,
    );
    if (!eliminatedDirectorId) return { ok: false, reason: "no_candidate", state };
    eliminatedDirectorIds = [...previousEliminations, eliminatedDirectorId];
    purchaseCount = (movie.hints.elimination?.purchaseCount ?? previousEliminations.length) + 1;
    const eliminatedNames = eliminatedDirectorIds.map((directorId) => directorsById.get(directorId)?.name ?? "this director");
    content = `Crossed out: ${eliminatedNames.join(" · ")}.`;
  } else if (type === "directAnswer") {
    content = `Correct director: ${owner.name}.`;
  }

  const sticker: HintSticker = {
    type,
    label: type === "elimination" && purchaseCount > 1 ? `${hintLabels[type]} ×${purchaseCount}` : hintLabels[type],
    content,
    eliminatedDirectorId,
    eliminatedDirectorIds,
    purchaseCount,
    purchasedAtMove: state.moveCount,
  };
  return {
    ok: true,
    sticker,
    state: {
      ...state,
      coins: state.coins - cost,
      coinsSpent: state.coinsSpent + cost,
      movies: {
        ...state.movies,
        [filmId]: { ...movie, hints: { ...movie.hints, [type]: sticker } },
      },
    },
  };
}

export function purchaseDirectorHint(
  state: GameState,
  directorId: string,
  type: DirectorHintType,
  config: GameConfig = GAME_CONFIG,
): DirectorHintPurchaseResult {
  if (!state.activeDirectorIds.includes(directorId)) return { ok: false, reason: "not_active", state };
  const owned = state.directorHints[directorId]?.[type];
  if (owned) return { ok: false, reason: "already_owned", reveal: owned, state };
  const content = directorHintProfile(directorId)?.[type];
  if (!content) return { ok: false, reason: "no_profile", state };
  const cost = config.directorHintCosts[type];
  if (state.coins < cost) return { ok: false, reason: "not_enough_coins", state };

  const reveal: DirectorHintReveal = {
    type,
    label: DIRECTOR_HINT_LABELS[type],
    content,
    purchasedAtMove: state.moveCount,
  };
  return {
    ok: true,
    reveal,
    state: {
      ...state,
      coins: state.coins - cost,
      coinsSpent: state.coinsSpent + cost,
      directorHints: {
        ...state.directorHints,
        [directorId]: { ...state.directorHints[directorId], [type]: reveal },
      },
    },
  };
}

export function currentRank(state: GameState) {
  return RANKS.reduce(
    (current, rank) => state.victoryDirectors.length >= rank.clears ? rank : current,
    RANKS[0],
  );
}

export function runAccuracy(state: GameState) {
  const attempts = state.correctAttempts + state.wrongAttempts;
  return attempts === 0 ? 100 : Math.round((state.correctAttempts / attempts) * 100);
}

export function filmForId(directorPool: readonly Director[], filmId: string): Film | undefined {
  return filmMap(directorPool).get(filmId);
}
