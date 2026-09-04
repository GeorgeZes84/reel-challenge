import assert from "node:assert/strict";
import test from "node:test";

import { CINEMA_MAP_MOVIES } from "../app/data/cinema-map-data.ts";
import {
  advanceCinemaMap,
  cinemaMapResult,
  createCinemaMapState,
  currentCinemaMapMovie,
  isValidCountryForMovie,
  markCinemaMapReady,
  resolveCinemaMapPlacement,
} from "../app/data/cinema-map-engine.ts";
import {
  MAP_VIEWBOX_HEIGHT,
  MAP_VIEWBOX_WIDTH,
  WORLD_MAP_TRANSFORM,
  clampMapTransform,
  clientPointToMapPoint,
  fittedMapViewport,
  nearestSmallCountry,
  viewPointToClientPoint,
  zoomMapAroundPoint,
} from "../app/data/cinema-map-viewport.ts";

const dogtooth = CINEMA_MAP_MOVIES.find((movie) => movie.id === "dogtooth");

test("Cinema Map uses one deterministic eight-ticket order per seed", () => {
  const first = createCinemaMapState(CINEMA_MAP_MOVIES, "map-seed");
  const second = createCinemaMapState(CINEMA_MAP_MOVIES, "map-seed");
  assert.equal(first.status, "presentingTicket");
  assert.equal(first.movieOrder.length, 8);
  assert.deepEqual(first.movieOrder, second.movieOrder);
  assert.notEqual(currentCinemaMapMovie(first, CINEMA_MAP_MOVIES), null);
});

test("Dogtooth accepts Greece and rejects rapid duplicate scoring", () => {
  assert.ok(dogtooth);
  let state = markCinemaMapReady(createCinemaMapState([dogtooth], "dogtooth-correct"));
  const outcome = resolveCinemaMapPlacement(state, "GR", [dogtooth]);
  assert.equal(outcome.accepted, true);
  assert.equal(outcome.correct, true);
  assert.equal(outcome.state.score, 1000);
  assert.equal(outcome.state.firstTryCorrect, 1);

  const duplicate = resolveCinemaMapPlacement(outcome.state, "GR", [dogtooth]);
  assert.equal(duplicate.accepted, false);
  assert.equal(duplicate.state, outcome.state);

  state = advanceCinemaMap(outcome.state);
  assert.equal(state.status, "roundComplete");
});

test("Dogtooth on Italy retries, hints, then reveals Greece on the third miss", () => {
  assert.ok(dogtooth);
  let state = markCinemaMapReady(createCinemaMapState([dogtooth], "dogtooth-wrong"));

  let outcome = resolveCinemaMapPlacement(state, "IT", [dogtooth]);
  assert.equal(outcome.correct, false);
  assert.equal(outcome.state.lastResolution.revealed, false);
  assert.equal(outcome.state.lastResolution.regionHint, null);
  assert.equal(outcome.state.answers.length, 0);
  state = advanceCinemaMap(outcome.state);
  assert.equal(state.status, "awaitingPlacement");
  assert.equal(state.currentIndex, 0);

  outcome = resolveCinemaMapPlacement(state, "FR", [dogtooth]);
  assert.equal(outcome.state.lastResolution.regionHint, "Southern Europe");
  state = advanceCinemaMap(outcome.state);

  outcome = resolveCinemaMapPlacement(state, "AL", [dogtooth]);
  assert.equal(outcome.state.lastResolution.revealed, true);
  assert.equal(outcome.state.lastResolution.correctCountryId, "GR");
  assert.equal(outcome.state.answers[0].revealed, true);
  assert.equal(outcome.state.answers[0].acceptedCountryId, null);
  assert.equal(advanceCinemaMap(outcome.state).status, "roundComplete");
});

test("country validation supports primary-country and any-valid-country rules", () => {
  const coproduction = {
    ...dogtooth,
    id: "coproduction",
    countryOfOrigin: ["FR", "DE"],
    primaryCountry: "FR",
  };
  assert.equal(isValidCountryForMovie(coproduction, "FR", "PRIMARY_COUNTRY"), true);
  assert.equal(isValidCountryForMovie(coproduction, "DE", "PRIMARY_COUNTRY"), false);
  assert.equal(isValidCountryForMovie(coproduction, "DE", "ANY_VALID_COUNTRY"), true);

  const ready = markCinemaMapReady(createCinemaMapState([coproduction], "coproduction"));
  const outcome = resolveCinemaMapPlacement(ready, "DE", [coproduction], undefined, "ANY_VALID_COUNTRY");
  assert.equal(outcome.state.lastResolution.correctCountryId, "DE");
  assert.equal(outcome.state.answers[0].resolvedCountryId, "DE");
});

test("a perfect eight-movie journey reaches results and a replay starts cleanly", () => {
  let state = createCinemaMapState(CINEMA_MAP_MOVIES, "perfect-map");
  const byId = new Map(CINEMA_MAP_MOVIES.map((movie) => [movie.id, movie]));
  while (state.status !== "roundComplete") {
    if (state.status === "presentingTicket") state = markCinemaMapReady(state);
    const movie = byId.get(state.movieOrder[state.currentIndex]);
    const outcome = resolveCinemaMapPlacement(state, movie.primaryCountry, CINEMA_MAP_MOVIES);
    assert.equal(outcome.correct, true);
    state = advanceCinemaMap(outcome.state);
  }

  const result = cinemaMapResult(state);
  assert.equal(result.moviesPlaced, 8);
  assert.equal(result.correct, 8);
  assert.equal(result.firstTryCorrect, 8);
  assert.equal(result.accuracy, 100);
  assert.equal(result.bestStreak, 8);
  assert.equal(result.revealedMovies, 0);
  assert.equal(Object.values(result.visitedCountryCounts).reduce((total, count) => total + count, 0), 8);

  const replay = createCinemaMapState(CINEMA_MAP_MOVIES, "perfect-map:replay");
  assert.equal(replay.answers.length, 0);
  assert.equal(replay.score, 0);
  assert.equal(replay.totalCorrect, 0);
  assert.equal(replay.totalIncorrect, 0);
  assert.equal(replay.streak, 0);
});

test("result accuracy counts retries without treating hesitation as failure", () => {
  assert.ok(dogtooth);
  let state = markCinemaMapReady(createCinemaMapState([dogtooth], "accuracy"));
  state = advanceCinemaMap(resolveCinemaMapPlacement(state, "IT", [dogtooth]).state);
  state = advanceCinemaMap(resolveCinemaMapPlacement(state, "GR", [dogtooth]).state);
  const result = cinemaMapResult(state);
  assert.equal(result.correct, 1);
  assert.equal(result.incorrect, 1);
  assert.equal(result.accuracy, 50);
  assert.equal(result.moviesPlaced, 1);
});

test("map viewport helpers preserve the zoom focus and clamp the ocean bounds", () => {
  const focus = { x: 420, y: 210 };
  const mapBefore = { x: (focus.x - WORLD_MAP_TRANSFORM.x) / WORLD_MAP_TRANSFORM.scale, y: (focus.y - WORLD_MAP_TRANSFORM.y) / WORLD_MAP_TRANSFORM.scale };
  const zoomed = zoomMapAroundPoint(WORLD_MAP_TRANSFORM, 3, focus);
  const mapAfter = { x: (focus.x - zoomed.x) / zoomed.scale, y: (focus.y - zoomed.y) / zoomed.scale };
  assert.deepEqual(mapAfter, mapBefore);

  const clamped = clampMapTransform({ scale: 4, x: 9999, y: -9999 });
  assert.equal(clamped.x, 0);
  assert.equal(clamped.y, MAP_VIEWBOX_HEIGHT - MAP_VIEWBOX_HEIGHT * 4);

  const converted = clientPointToMapPoint(
    { x: 500, y: 250 },
    { left: 0, top: 0, width: MAP_VIEWBOX_WIDTH, height: MAP_VIEWBOX_HEIGHT },
    WORLD_MAP_TRANSFORM,
  );
  assert.deepEqual(converted, { x: 500, y: 250 });

  const tallRect = { left: 20, top: 10, width: 320, height: 500 };
  const fitted = fittedMapViewport(tallRect);
  assert.deepEqual(fitted, { left: 20, top: 180, width: 320, height: 160, pixelsPerViewUnit: 0.32 });
  const centerClient = viewPointToClientPoint({ x: 500, y: 250 }, tallRect);
  assert.deepEqual(centerClient, { x: 180, y: 260 });
  assert.deepEqual(clientPointToMapPoint(centerClient, tallRect, WORLD_MAP_TRANSFORM), { x: 500, y: 250 });
});

test("forgiving small-country snapping chooses the nearest centroid", () => {
  const countries = [
    { id: "GR", x: 545, y: 210, tiny: true },
    { id: "IT", x: 530, y: 205, tiny: true },
    { id: "FR", x: 510, y: 190, tiny: false },
  ];
  assert.equal(nearestSmallCountry({ x: 544, y: 210 }, countries, 3, 24), "GR");
  assert.equal(nearestSmallCountry({ x: 531, y: 205 }, countries, 3, 24), "IT");
  assert.equal(nearestSmallCountry({ x: 544, y: 210 }, countries, 1, 24), null);
  assert.equal(nearestSmallCountry({ x: 555, y: 210 }, countries, 3, 22, 0.32), "GR");
});
