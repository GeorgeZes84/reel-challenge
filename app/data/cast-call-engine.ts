import type { CastCallMovie } from "./cast-call-data";

export const CAST_CALL_CONFIG = {
  activeMovieCount: 2,
  baseScore: 100,
  firstTryBonus: 50,
  maximumStreakBonus: 50,
  streakBonusStep: 5,
  quickBonus: 25,
  steadyBonus: 10,
  quickThresholdMs: 3000,
  steadyThresholdMs: 6000,
  failedActorSpacing: 2,
} as const;

export type CastCallStatus =
  | "presentingActor"
  | "awaitingInput"
  | "resolvingCorrect"
  | "resolvingWrong"
  | "retryPause"
  | "movieComplete"
  | "roundComplete";

export type CastCallResolution = {
  actorId: string;
  targetMovieId: string;
  correct: boolean;
  firstTry: boolean;
  scoreAwarded: number;
  speedBonus: number;
};

export type CastCallState = {
  seed: string;
  movieOrder: string[];
  activeMovieIds: string[];
  reserveMovieIds: string[];
  completedMovieIds: string[];
  completedCastByMovie: Record<string, string[]>;
  actorQueue: string[];
  currentActorId: string | null;
  attemptsByActor: Record<string, number>;
  totalCorrect: number;
  totalIncorrect: number;
  firstTryCorrect: number;
  streak: number;
  bestStreak: number;
  score: number;
  status: CastCallStatus;
  promptStartedAtMs: number | null;
  transitionSerial: number;
  pendingCompletedMovieId: string | null;
  enteringMovieId: string | null;
  retryActorId: string | null;
  lastResolution: CastCallResolution | null;
};

export type CastCallProgress = {
  moviesCompleted: number;
  moviesTotal: number;
  castCompleted: number;
  castTotal: number;
  correct: number;
  incorrect: number;
  firstTryCorrect: number;
  streak: number;
  bestStreak: number;
  score: number;
};

export type CastCallResult = CastCallProgress & {
  accuracy: number;
};

export type CastDropOutcome = {
  accepted: boolean;
  correct: boolean;
  state: CastCallState;
};

function seededShuffle<T>(items: readonly T[], seed: string): T[] {
  let value = 2166136261;
  for (const character of seed) value = Math.imul(value ^ character.charCodeAt(0), 16777619);
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    value += 0x6d2b79f5;
    let random = value;
    random = Math.imul(random ^ (random >>> 15), random | 1);
    random ^= random + Math.imul(random ^ (random >>> 7), random | 61);
    const swapIndex = Math.floor((((random ^ (random >>> 14)) >>> 0) / 4294967296) * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function movieMap(movies: readonly CastCallMovie[]) {
  return new Map(movies.map((movie) => [movie.id, movie] as const));
}

function validateCastCallMovies(movies: readonly CastCallMovie[]) {
  if (movies.length < CAST_CALL_CONFIG.activeMovieCount) throw new Error("Cast Call needs at least two movies.");
  const movieIds = new Set<string>();
  for (const movie of movies) {
    if (movieIds.has(movie.id)) throw new Error(`Cast Call movie IDs must be unique: ${movie.id}.`);
    movieIds.add(movie.id);
    if (movie.cast.length === 0) throw new Error(`Cast Call movie ${movie.id} needs at least one cast member.`);
    const actorIds = new Set<string>();
    for (const actor of movie.cast) {
      if (actorIds.has(actor.actorId)) throw new Error(`Cast Call actor IDs must be unique within ${movie.id}: ${actor.actorId}.`);
      actorIds.add(actor.actorId);
    }
  }
}

export function validCastMovieIds(state: CastCallState, actorId: string, movies: readonly CastCallMovie[]): string[] {
  const byId = movieMap(movies);
  return state.activeMovieIds.filter((movieId) => {
    const movie = byId.get(movieId);
    return Boolean(movie?.cast.some((actor) => actor.actorId === actorId))
      && !(state.completedCastByMovie[movieId] ?? []).includes(actorId);
  });
}

function unresolvedActorIds(state: CastCallState, movies: readonly CastCallMovie[]) {
  const byId = movieMap(movies);
  return Array.from(new Set(state.activeMovieIds.flatMap((movieId) => {
    const completed = new Set(state.completedCastByMovie[movieId] ?? []);
    return (byId.get(movieId)?.cast ?? []).filter((actor) => !completed.has(actor.actorId)).map((actor) => actor.actorId);
  })));
}

function normalizedQueue(state: CastCallState, movies: readonly CastCallMovie[], deferredActorId?: string | null) {
  const unresolved = new Set(unresolvedActorIds(state, movies));
  const kept = state.actorQueue.filter((actorId, index, queue) => unresolved.has(actorId) && queue.indexOf(actorId) === index);
  const missing = seededShuffle(
    [...unresolved].filter((actorId) => !kept.includes(actorId)),
    `${state.seed}:queue:${state.transitionSerial}`,
  );
  const queue = [...kept, ...missing];
  if (deferredActorId && unresolved.has(deferredActorId)) {
    const withoutDeferred = queue.filter((actorId) => actorId !== deferredActorId);
    const insertionIndex = Math.min(
      withoutDeferred.length,
      Math.max(Math.min(CAST_CALL_CONFIG.failedActorSpacing, withoutDeferred.length), Math.floor(withoutDeferred.length * 0.62)),
    );
    withoutDeferred.splice(insertionIndex, 0, deferredActorId);
    return withoutDeferred;
  }
  return queue;
}

function presentNextActor(state: CastCallState, movies: readonly CastCallMovie[], deferredActorId?: string | null): CastCallState {
  if (state.completedMovieIds.length >= state.movieOrder.length) {
    return {
      ...state,
      activeMovieIds: [],
      actorQueue: [],
      currentActorId: null,
      status: "roundComplete",
      promptStartedAtMs: null,
      pendingCompletedMovieId: null,
      enteringMovieId: null,
      retryActorId: null,
    };
  }
  const queue = normalizedQueue(state, movies, deferredActorId);
  const currentActorId = queue[0] ?? null;
  if (!currentActorId) {
    return { ...state, currentActorId: null, actorQueue: [], status: "roundComplete", promptStartedAtMs: null };
  }
  return {
    ...state,
    actorQueue: queue.slice(1),
    currentActorId,
    status: "presentingActor",
    promptStartedAtMs: null,
    pendingCompletedMovieId: null,
    retryActorId: null,
  };
}

export function createCastCallState(movies: readonly CastCallMovie[], seed: string): CastCallState {
  validateCastCallMovies(movies);
  const movieOrder = seededShuffle(movies.map((movie) => movie.id), `${seed}:movies`);
  const activeMovieIds = movieOrder.slice(0, CAST_CALL_CONFIG.activeMovieCount);
  const base: CastCallState = {
    seed,
    movieOrder,
    activeMovieIds,
    reserveMovieIds: movieOrder.slice(CAST_CALL_CONFIG.activeMovieCount),
    completedMovieIds: [],
    completedCastByMovie: Object.fromEntries(movieOrder.map((movieId) => [movieId, []])),
    actorQueue: seededShuffle(
      Array.from(new Set(movies.filter((movie) => activeMovieIds.includes(movie.id)).flatMap((movie) => movie.cast.map((actor) => actor.actorId)))),
      `${seed}:opening-cast`,
    ),
    currentActorId: null,
    attemptsByActor: {},
    totalCorrect: 0,
    totalIncorrect: 0,
    firstTryCorrect: 0,
    streak: 0,
    bestStreak: 0,
    score: 0,
    status: "presentingActor",
    promptStartedAtMs: null,
    transitionSerial: 0,
    pendingCompletedMovieId: null,
    enteringMovieId: null,
    retryActorId: null,
    lastResolution: null,
  };
  return presentNextActor(base, movies);
}

export function markCastActorReady(state: CastCallState, nowMs: number): CastCallState {
  if (state.status !== "presentingActor" || !state.currentActorId) return state;
  return { ...state, status: "awaitingInput", promptStartedAtMs: nowMs, enteringMovieId: null };
}

function speedBonusFor(elapsedMs: number) {
  if (elapsedMs <= CAST_CALL_CONFIG.quickThresholdMs) return CAST_CALL_CONFIG.quickBonus;
  if (elapsedMs <= CAST_CALL_CONFIG.steadyThresholdMs) return CAST_CALL_CONFIG.steadyBonus;
  return 0;
}

export function resolveCastDrop(
  state: CastCallState,
  targetMovieId: string,
  nowMs: number,
  movies: readonly CastCallMovie[],
): CastDropOutcome {
  if (state.status !== "awaitingInput" || !state.currentActorId || !state.activeMovieIds.includes(targetMovieId)) {
    return { accepted: false, correct: false, state };
  }
  const actorId = state.currentActorId;
  const previousAttempts = state.attemptsByActor[actorId] ?? 0;
  const attemptsByActor = { ...state.attemptsByActor, [actorId]: previousAttempts + 1 };
  const correct = validCastMovieIds(state, actorId, movies).includes(targetMovieId);
  if (!correct) {
    return {
      accepted: true,
      correct: false,
      state: {
        ...state,
        attemptsByActor,
        totalIncorrect: state.totalIncorrect + 1,
        streak: 0,
        status: "resolvingWrong",
        promptStartedAtMs: null,
        lastResolution: { actorId, targetMovieId, correct: false, firstTry: false, scoreAwarded: 0, speedBonus: 0 },
      },
    };
  }

  const byId = movieMap(movies);
  const movie = byId.get(targetMovieId);
  if (!movie) return { accepted: false, correct: false, state };
  const completedCast = [...(state.completedCastByMovie[targetMovieId] ?? []), actorId];
  const completedCastByMovie = { ...state.completedCastByMovie, [targetMovieId]: completedCast };
  const nextStreak = state.streak + 1;
  const priorCorrectPlacements = Object.values(state.completedCastByMovie)
    .filter((actorIds) => actorIds.includes(actorId)).length;
  const firstTry = previousAttempts === priorCorrectPlacements;
  const elapsedMs = Math.max(0, nowMs - (state.promptStartedAtMs ?? nowMs));
  const speedBonus = speedBonusFor(elapsedMs);
  const streakBonus = Math.min(CAST_CALL_CONFIG.maximumStreakBonus, Math.max(0, nextStreak - 1) * CAST_CALL_CONFIG.streakBonusStep);
  const scoreAwarded = CAST_CALL_CONFIG.baseScore + (firstTry ? CAST_CALL_CONFIG.firstTryBonus : 0) + speedBonus + streakBonus;
  const movieComplete = completedCast.length >= movie.cast.length;
  return {
    accepted: true,
    correct: true,
    state: {
      ...state,
      completedCastByMovie,
      attemptsByActor,
      totalCorrect: state.totalCorrect + 1,
      firstTryCorrect: state.firstTryCorrect + (firstTry ? 1 : 0),
      streak: nextStreak,
      bestStreak: Math.max(state.bestStreak, nextStreak),
      score: state.score + scoreAwarded,
      status: movieComplete ? "movieComplete" : "resolvingCorrect",
      promptStartedAtMs: null,
      pendingCompletedMovieId: movieComplete ? targetMovieId : null,
      lastResolution: { actorId, targetMovieId, correct: true, firstTry, scoreAwarded, speedBonus },
    },
  };
}

export function advanceCastCall(state: CastCallState, movies: readonly CastCallMovie[]): CastCallState {
  if (state.status === "retryPause" && state.retryActorId) {
    return presentNextActor(
      { ...state, transitionSerial: state.transitionSerial + 1, retryActorId: null },
      movies,
      state.retryActorId,
    );
  }
  if (!state.currentActorId || !["resolvingCorrect", "resolvingWrong", "movieComplete"].includes(state.status)) return state;
  const resolvedActorId = state.currentActorId;
  let next: CastCallState = {
    ...state,
    transitionSerial: state.transitionSerial + 1,
    currentActorId: null,
    enteringMovieId: null,
    retryActorId: null,
  };

  if (state.status === "resolvingWrong") {
    const alternatives = unresolvedActorIds(next, movies).filter((actorId) => actorId !== resolvedActorId);
    if (alternatives.length === 0) {
      return {
        ...next,
        actorQueue: [],
        status: "retryPause",
        promptStartedAtMs: null,
        pendingCompletedMovieId: null,
        retryActorId: resolvedActorId,
      };
    }
    return presentNextActor(next, movies, resolvedActorId);
  }

  if (state.status === "movieComplete" && state.pendingCompletedMovieId) {
    const completedMovieId = state.pendingCompletedMovieId;
    const completedSlot = state.activeMovieIds.indexOf(completedMovieId);
    const replacementMovieId = state.reserveMovieIds[0] ?? null;
    const activeMovieIds = [...state.activeMovieIds];
    if (completedSlot >= 0) {
      if (replacementMovieId) activeMovieIds[completedSlot] = replacementMovieId;
      else activeMovieIds.splice(completedSlot, 1);
    }
    next = {
      ...next,
      activeMovieIds,
      reserveMovieIds: replacementMovieId ? state.reserveMovieIds.slice(1) : state.reserveMovieIds,
      completedMovieIds: [...state.completedMovieIds, completedMovieId],
      actorQueue: state.actorQueue.filter((actorId) => actorId !== resolvedActorId),
      pendingCompletedMovieId: null,
      enteringMovieId: replacementMovieId,
    };
  }

  return presentNextActor(next, movies, resolvedActorId);
}

export function castCallProgress(state: CastCallState, movies: readonly CastCallMovie[]): CastCallProgress {
  const castTotal = movies.reduce((total, movie) => total + movie.cast.length, 0);
  const castCompleted = Object.values(state.completedCastByMovie).reduce((total, actorIds) => total + actorIds.length, 0);
  return {
    moviesCompleted: state.completedMovieIds.length,
    moviesTotal: movies.length,
    castCompleted,
    castTotal,
    correct: state.totalCorrect,
    incorrect: state.totalIncorrect,
    firstTryCorrect: state.firstTryCorrect,
    streak: state.streak,
    bestStreak: state.bestStreak,
    score: state.score,
  };
}

export function castCallResult(state: CastCallState, movies: readonly CastCallMovie[]): CastCallResult {
  const progress = castCallProgress(state, movies);
  const attempts = progress.correct + progress.incorrect;
  return { ...progress, accuracy: attempts === 0 ? 100 : Math.round((progress.correct / attempts) * 100) };
}
