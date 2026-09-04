import type { CountryIso, CountryValidationRule, MovieGeoQuestion } from "./cinema-map-data";

export const CINEMA_MAP_CONFIG = {
  roundSize: 8,
  maximumAttempts: 3,
  pointsByAttempt: [1000, 650, 350] as const,
  firstTryStreakStep: 50,
  maximumFirstTryStreakBonus: 250,
  validationRule: "PRIMARY_COUNTRY" as CountryValidationRule,
} as const;

export type CinemaMapStatus =
  | "presentingTicket"
  | "awaitingPlacement"
  | "resolvingCorrect"
  | "resolvingWrong"
  | "roundComplete";

export type CinemaMapAnswer = {
  movieId: string;
  attemptedCountryIds: CountryIso[];
  resolvedCountryId: CountryIso;
  acceptedCountryId: CountryIso | null;
  attempts: number;
  correct: boolean;
  firstTry: boolean;
  revealed: boolean;
  scoreAwarded: number;
};

export type CinemaMapResolution = {
  movieId: string;
  selectedCountryId: CountryIso;
  correctCountryId: CountryIso;
  correct: boolean;
  revealed: boolean;
  regionHint: string | null;
  attempts: number;
  scoreAwarded: number;
};

export type CinemaMapState = {
  seed: string;
  movieOrder: string[];
  currentIndex: number;
  attemptsCurrentMovie: number;
  attemptedCountriesCurrentMovie: CountryIso[];
  answers: CinemaMapAnswer[];
  totalCorrect: number;
  totalIncorrect: number;
  firstTryCorrect: number;
  streak: number;
  bestStreak: number;
  score: number;
  status: CinemaMapStatus;
  transitionSerial: number;
  lastResolution: CinemaMapResolution | null;
};

export type CinemaMapProgress = {
  moviesPlaced: number;
  moviesTotal: number;
  correct: number;
  incorrect: number;
  firstTryCorrect: number;
  streak: number;
  bestStreak: number;
  score: number;
};

export type CinemaMapResult = CinemaMapProgress & {
  accuracy: number;
  visitedCountryIds: CountryIso[];
  visitedCountryCounts: Record<CountryIso, number>;
  revealedMovies: number;
};

export type CinemaMapPlacementOutcome = {
  accepted: boolean;
  correct: boolean;
  state: CinemaMapState;
};

type CinemaMapConfig = typeof CINEMA_MAP_CONFIG;

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

function normalizeCountryIso(countryIso: string) {
  return countryIso.trim().toUpperCase();
}

function validateMovies(movies: readonly MovieGeoQuestion[]) {
  if (movies.length === 0) throw new Error("Cinema Map needs at least one movie.");
  const ids = new Set<string>();
  for (const movie of movies) {
    if (ids.has(movie.id)) throw new Error(`Cinema Map movie IDs must be unique: ${movie.id}.`);
    ids.add(movie.id);
    if (movie.countryOfOrigin.length === 0) throw new Error(`Cinema Map movie ${movie.id} needs a country of origin.`);
    if (!movie.countryOfOrigin.map(normalizeCountryIso).includes(normalizeCountryIso(movie.primaryCountry))) {
      throw new Error(`Cinema Map primary country must be present in countryOfOrigin: ${movie.id}.`);
    }
  }
}

function movieById(movies: readonly MovieGeoQuestion[]) {
  return new Map(movies.map((movie) => [movie.id, movie] as const));
}

export function isValidCountryForMovie(
  movie: MovieGeoQuestion,
  countryIso: CountryIso,
  rule: CountryValidationRule = CINEMA_MAP_CONFIG.validationRule,
) {
  const normalized = normalizeCountryIso(countryIso);
  if (rule === "ANY_VALID_COUNTRY") {
    return movie.countryOfOrigin.some((candidate) => normalizeCountryIso(candidate) === normalized);
  }
  return normalizeCountryIso(movie.primaryCountry) === normalized;
}

export function createCinemaMapState(
  movies: readonly MovieGeoQuestion[],
  seed: string,
  config: CinemaMapConfig = CINEMA_MAP_CONFIG,
): CinemaMapState {
  validateMovies(movies);
  const movieOrder = seededShuffle(movies.map((movie) => movie.id), `${seed}:cinema-map`).slice(0, config.roundSize);
  return {
    seed,
    movieOrder,
    currentIndex: 0,
    attemptsCurrentMovie: 0,
    attemptedCountriesCurrentMovie: [],
    answers: [],
    totalCorrect: 0,
    totalIncorrect: 0,
    firstTryCorrect: 0,
    streak: 0,
    bestStreak: 0,
    score: 0,
    status: "presentingTicket",
    transitionSerial: 0,
    lastResolution: null,
  };
}

export function currentCinemaMapMovie(state: CinemaMapState, movies: readonly MovieGeoQuestion[]) {
  const id = state.movieOrder[state.currentIndex];
  return id ? movieById(movies).get(id) ?? null : null;
}

export function markCinemaMapReady(state: CinemaMapState): CinemaMapState {
  if (state.status !== "presentingTicket" || !state.movieOrder[state.currentIndex]) return state;
  return { ...state, status: "awaitingPlacement", lastResolution: null };
}

export function resolveCinemaMapPlacement(
  state: CinemaMapState,
  countryIso: CountryIso,
  movies: readonly MovieGeoQuestion[],
  config: CinemaMapConfig = CINEMA_MAP_CONFIG,
  validationRule: CountryValidationRule = config.validationRule,
): CinemaMapPlacementOutcome {
  if (state.status !== "awaitingPlacement") return { accepted: false, correct: false, state };
  const movie = currentCinemaMapMovie(state, movies);
  if (!movie) return { accepted: false, correct: false, state };

  const selectedCountryId = normalizeCountryIso(countryIso);
  const attempts = state.attemptsCurrentMovie + 1;
  const attemptedCountryIds = [...state.attemptedCountriesCurrentMovie, selectedCountryId];
  const correct = isValidCountryForMovie(movie, selectedCountryId, validationRule);

  if (correct) {
    const firstTry = attempts === 1;
    const nextStreak = firstTry ? state.streak + 1 : 0;
    const baseScore = config.pointsByAttempt[Math.min(attempts - 1, config.pointsByAttempt.length - 1)] ?? 0;
    const streakBonus = firstTry
      ? Math.min(config.maximumFirstTryStreakBonus, Math.max(0, nextStreak - 1) * config.firstTryStreakStep)
      : 0;
    const scoreAwarded = baseScore + streakBonus;
    const resolvedCountryId = validationRule === "ANY_VALID_COUNTRY"
      ? selectedCountryId
      : normalizeCountryIso(movie.primaryCountry);
    const answer: CinemaMapAnswer = {
      movieId: movie.id,
      attemptedCountryIds,
      resolvedCountryId,
      acceptedCountryId: selectedCountryId,
      attempts,
      correct: true,
      firstTry,
      revealed: false,
      scoreAwarded,
    };
    return {
      accepted: true,
      correct: true,
      state: {
        ...state,
        answers: [...state.answers, answer],
        totalCorrect: state.totalCorrect + 1,
        firstTryCorrect: state.firstTryCorrect + (firstTry ? 1 : 0),
        streak: nextStreak,
        bestStreak: Math.max(state.bestStreak, nextStreak),
        score: state.score + scoreAwarded,
        status: "resolvingCorrect",
        transitionSerial: state.transitionSerial + 1,
        lastResolution: {
          movieId: movie.id,
          selectedCountryId,
          correctCountryId: resolvedCountryId,
          correct: true,
          revealed: false,
          regionHint: null,
          attempts,
          scoreAwarded,
        },
      },
    };
  }

  const revealed = attempts >= config.maximumAttempts;
  const resolution: CinemaMapResolution = {
    movieId: movie.id,
    selectedCountryId,
    correctCountryId: normalizeCountryIso(movie.primaryCountry),
    correct: false,
    revealed,
    regionHint: attempts >= 2 && !revealed ? movie.regionHint : null,
    attempts,
    scoreAwarded: 0,
  };
  const answer: CinemaMapAnswer | null = revealed ? {
    movieId: movie.id,
    attemptedCountryIds,
    resolvedCountryId: normalizeCountryIso(movie.primaryCountry),
    acceptedCountryId: null,
    attempts,
    correct: false,
    firstTry: false,
    revealed: true,
    scoreAwarded: 0,
  } : null;

  return {
    accepted: true,
    correct: false,
    state: {
      ...state,
      attemptsCurrentMovie: attempts,
      attemptedCountriesCurrentMovie: attemptedCountryIds,
      answers: answer ? [...state.answers, answer] : state.answers,
      totalIncorrect: state.totalIncorrect + 1,
      streak: 0,
      status: "resolvingWrong",
      transitionSerial: state.transitionSerial + 1,
      lastResolution: resolution,
    },
  };
}

export function advanceCinemaMap(state: CinemaMapState): CinemaMapState {
  if (state.status !== "resolvingCorrect" && state.status !== "resolvingWrong") return state;
  if (state.status === "resolvingWrong" && !state.lastResolution?.revealed) {
    return { ...state, status: "awaitingPlacement" };
  }
  const nextIndex = state.currentIndex + 1;
  if (nextIndex >= state.movieOrder.length) {
    return {
      ...state,
      currentIndex: nextIndex,
      attemptsCurrentMovie: 0,
      attemptedCountriesCurrentMovie: [],
      status: "roundComplete",
      lastResolution: null,
    };
  }
  return {
    ...state,
    currentIndex: nextIndex,
    attemptsCurrentMovie: 0,
    attemptedCountriesCurrentMovie: [],
    status: "presentingTicket",
    transitionSerial: state.transitionSerial + 1,
    lastResolution: null,
  };
}

export function cinemaMapProgress(state: CinemaMapState): CinemaMapProgress {
  return {
    moviesPlaced: state.answers.length,
    moviesTotal: state.movieOrder.length,
    correct: state.totalCorrect,
    incorrect: state.totalIncorrect,
    firstTryCorrect: state.firstTryCorrect,
    streak: state.streak,
    bestStreak: state.bestStreak,
    score: state.score,
  };
}

export function cinemaMapResult(state: CinemaMapState): CinemaMapResult {
  const progress = cinemaMapProgress(state);
  const attempts = progress.correct + progress.incorrect;
  const visitedCountryCounts = state.answers.reduce<Record<CountryIso, number>>((counts, answer) => {
    counts[answer.resolvedCountryId] = (counts[answer.resolvedCountryId] ?? 0) + 1;
    return counts;
  }, {});
  return {
    ...progress,
    accuracy: attempts === 0 ? 100 : Math.round((progress.correct / attempts) * 100),
    visitedCountryIds: Object.keys(visitedCountryCounts),
    visitedCountryCounts,
    revealedMovies: state.answers.filter((answer) => answer.revealed).length,
  };
}
