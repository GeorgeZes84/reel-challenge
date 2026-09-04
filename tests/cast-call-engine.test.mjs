import assert from "node:assert/strict";
import test from "node:test";

import { CAST_CALL_MOVIES } from "../app/data/cast-call-data.ts";
import {
  CAST_CALL_CONFIG,
  advanceCastCall,
  castCallProgress,
  castCallResult,
  createCastCallState,
  markCastActorReady,
  resolveCastDrop,
  validCastMovieIds,
} from "../app/data/cast-call-engine.ts";

function ready(state, now = 1000) {
  return markCastActorReady(state, now);
}

function correctTarget(state, movies = CAST_CALL_MOVIES) {
  assert.ok(state.currentActorId, "expected a current actor");
  const [target] = validCastMovieIds(state, state.currentActorId, movies);
  assert.ok(target, "expected a legal movie target");
  return target;
}

test("opens deterministically with two active movies and exactly one actor prompt", () => {
  const first = createCastCallState(CAST_CALL_MOVIES, "opening");
  const second = createCastCallState(CAST_CALL_MOVIES, "opening");
  assert.deepEqual(first, second);
  assert.equal(first.activeMovieIds.length, 2);
  assert.equal(first.reserveMovieIds.length, 2);
  assert.equal(first.status, "presentingActor");
  assert.ok(first.currentActorId);
  assert.equal(new Set([first.currentActorId, ...first.actorQueue]).size, 8);
  assert.ok([first.currentActorId, ...first.actorQueue].every((actorId) => validCastMovieIds(first, actorId, CAST_CALL_MOVIES).length > 0));
});

test("a correct first placement scores once and files only an actor name", () => {
  const initial = ready(createCastCallState(CAST_CALL_MOVIES, "correct"));
  const actorId = initial.currentActorId;
  const target = correctTarget(initial);
  const outcome = resolveCastDrop(initial, target, 1700, CAST_CALL_MOVIES);
  assert.equal(outcome.accepted, true);
  assert.equal(outcome.correct, true);
  assert.equal(outcome.state.totalCorrect, 1);
  assert.equal(outcome.state.firstTryCorrect, 1);
  assert.equal(outcome.state.completedCastByMovie[target].includes(actorId), true);
  assert.equal(outcome.state.score, CAST_CALL_CONFIG.baseScore + CAST_CALL_CONFIG.firstTryBonus + CAST_CALL_CONFIG.quickBonus);

  const duplicate = resolveCastDrop(outcome.state, target, 1710, CAST_CALL_MOVIES);
  assert.equal(duplicate.accepted, false);
  assert.equal(duplicate.state, outcome.state, "resolution lock must make rapid duplicate input a no-op");
});

test("a wrong actor is rejected without revealing its answer and returns later, never immediately", () => {
  const initial = ready(createCastCallState(CAST_CALL_MOVIES, "wrong-return"));
  const failedActorId = initial.currentActorId;
  const validTargets = validCastMovieIds(initial, failedActorId, CAST_CALL_MOVIES);
  const wrongTarget = initial.activeMovieIds.find((movieId) => !validTargets.includes(movieId));
  assert.ok(wrongTarget);
  const outcome = resolveCastDrop(initial, wrongTarget, 1500, CAST_CALL_MOVIES);
  assert.equal(outcome.correct, false);
  assert.equal(outcome.state.totalIncorrect, 1);
  assert.equal(outcome.state.score, 0);
  assert.equal("correctMovieId" in outcome, false);
  assert.equal("correctMovieId" in outcome.state.lastResolution, false);

  const next = advanceCastCall(outcome.state, CAST_CALL_MOVIES);
  assert.notEqual(next.currentActorId, failedActorId);
  assert.ok(next.actorQueue.includes(failedActorId), "failed actor should be spaced into the remaining queue");
  assert.notEqual(next.actorQueue[0], failedActorId, "at least two other retrievals should precede the retry when possible");
});

test("completing either movie replaces that exact slot without hardcoding completion order", () => {
  const opening = createCastCallState(CAST_CALL_MOVIES, "replace-slot");
  const completedMovieId = opening.activeMovieIds[1];
  const completedMovie = CAST_CALL_MOVIES.find((movie) => movie.id === completedMovieId);
  assert.ok(completedMovie);
  const finalActor = completedMovie.cast.at(-1);
  assert.ok(finalActor);
  const almostComplete = {
    ...opening,
    currentActorId: finalActor.actorId,
    actorQueue: opening.actorQueue.filter((actorId) => actorId !== finalActor.actorId),
    completedCastByMovie: {
      ...opening.completedCastByMovie,
      [completedMovieId]: completedMovie.cast.slice(0, -1).map((actor) => actor.actorId),
    },
    status: "awaitingInput",
    promptStartedAtMs: 1000,
  };
  const outcome = resolveCastDrop(almostComplete, completedMovieId, 1700, CAST_CALL_MOVIES);
  assert.equal(outcome.state.status, "movieComplete");
  const replacementId = opening.reserveMovieIds[0];
  const next = advanceCastCall(outcome.state, CAST_CALL_MOVIES);
  assert.equal(next.completedMovieIds.includes(completedMovieId), true);
  assert.equal(next.activeMovieIds[1], replacementId);
  assert.equal(next.activeMovieIds[0], opening.activeMovieIds[0]);
  assert.equal(next.enteringMovieId, replacementId);
  assert.equal(markCastActorReady(next, 2000).enteringMovieId, null, "replacement entrance is transient");
});

test("a lone failed retrieval receives a neutral retake beat before it can return", () => {
  const movies = [
    { id: "one", title: "One", year: 2001, genre: "Drama", accent: "#fff", cast: [{ actorId: "one-actor", actorName: "One Actor" }] },
    { id: "two", title: "Two", year: 2002, genre: "Drama", accent: "#fff", cast: [{ actorId: "two-actor", actorName: "Two Actor" }] },
  ];
  const opening = createCastCallState(movies, "last-retry");
  const state = {
    ...opening,
    activeMovieIds: ["one", "two"],
    currentActorId: "one-actor",
    actorQueue: [],
    completedCastByMovie: { one: [], two: ["two-actor"] },
    status: "awaitingInput",
    promptStartedAtMs: 1000,
  };
  const wrong = resolveCastDrop(state, "two", 1400, movies);
  const pause = advanceCastCall(wrong.state, movies);
  assert.equal(pause.status, "retryPause");
  assert.equal(pause.currentActorId, null);
  assert.equal(pause.retryActorId, "one-actor");
  const retry = advanceCastCall(pause, movies);
  assert.equal(retry.status, "presentingActor");
  assert.equal(retry.currentActorId, "one-actor");
});

test("an overlapping actor may be cast into either active movie", () => {
  const overlapMovies = [
    { id: "one", title: "One", year: 2001, genre: "Drama", accent: "#fff", cast: [{ actorId: "shared", actorName: "Shared Actor" }, { actorId: "one-only", actorName: "One Actor" }] },
    { id: "two", title: "Two", year: 2002, genre: "Drama", accent: "#fff", cast: [{ actorId: "shared", actorName: "Shared Actor" }, { actorId: "two-only", actorName: "Two Actor" }] },
  ];
  const opening = createCastCallState(overlapMovies, "overlap");
  const state = { ...opening, currentActorId: "shared", status: "awaitingInput", promptStartedAtMs: 1000 };
  assert.deepEqual(validCastMovieIds(state, "shared", overlapMovies).sort(), ["one", "two"]);
  assert.equal(resolveCastDrop(state, "one", 1400, overlapMovies).correct, true);
  assert.equal(resolveCastDrop(state, "two", 1400, overlapMovies).correct, true);
});

test("a shared actor can earn a first-try placement for each movie", () => {
  const overlapMovies = [
    { id: "one", title: "One", year: 2001, genre: "Drama", accent: "#fff", cast: [{ actorId: "shared", actorName: "Shared Actor" }, { actorId: "one-only", actorName: "One Actor" }] },
    { id: "two", title: "Two", year: 2002, genre: "Drama", accent: "#fff", cast: [{ actorId: "shared", actorName: "Shared Actor" }, { actorId: "two-only", actorName: "Two Actor" }] },
  ];
  const opening = createCastCallState(overlapMovies, "overlap-first-try");
  const firstPrompt = { ...opening, currentActorId: "shared", status: "awaitingInput", promptStartedAtMs: 1000 };
  const first = resolveCastDrop(firstPrompt, "one", 1400, overlapMovies);
  assert.equal(first.state.lastResolution.firstTry, true);
  const secondPrompt = { ...first.state, currentActorId: "shared", status: "awaitingInput", promptStartedAtMs: 2000 };
  const second = resolveCastDrop(secondPrompt, "two", 2400, overlapMovies);
  assert.equal(second.state.lastResolution.firstTry, true);
  assert.equal(second.state.firstTryCorrect, 2);
});

test("invalid fixtures fail early instead of creating an unwinnable round", () => {
  const emptyCast = [
    { id: "empty", title: "Empty", year: 2001, genre: "Drama", accent: "#fff", cast: [] },
    { id: "other", title: "Other", year: 2002, genre: "Drama", accent: "#fff", cast: [{ actorId: "actor", actorName: "Actor" }] },
  ];
  assert.throws(() => createCastCallState(emptyCast, "invalid"), /needs at least one cast member/);
});

test("a perfect four-movie round terminates and replay starts pristine", () => {
  let state = createCastCallState(CAST_CALL_MOVIES, "perfect-round");
  let now = 1000;
  let safety = 0;
  while (state.status !== "roundComplete") {
    if (state.status === "presentingActor") {
      state = markCastActorReady(state, now);
    } else if (state.status === "awaitingInput") {
      const outcome = resolveCastDrop(state, correctTarget(state), now + 500, CAST_CALL_MOVIES);
      assert.equal(outcome.correct, true);
      state = outcome.state;
      now += 1000;
    } else {
      state = advanceCastCall(state, CAST_CALL_MOVIES);
    }
    safety += 1;
    assert.ok(safety < 80, "perfect round should always terminate");
  }

  const progress = castCallProgress(state, CAST_CALL_MOVIES);
  const result = castCallResult(state, CAST_CALL_MOVIES);
  assert.equal(progress.moviesCompleted, 4);
  assert.equal(progress.castCompleted, 16);
  assert.equal(progress.correct, 16);
  assert.equal(progress.incorrect, 0);
  assert.equal(result.accuracy, 100);
  assert.equal(result.bestStreak, 16);

  const replay = createCastCallState(CAST_CALL_MOVIES, "perfect-round:replay");
  assert.equal(replay.totalCorrect, 0);
  assert.equal(replay.totalIncorrect, 0);
  assert.equal(replay.score, 0);
  assert.deepEqual(replay.completedMovieIds, []);
  assert.ok(Object.values(replay.completedCastByMovie).every((cast) => cast.length === 0));
});
