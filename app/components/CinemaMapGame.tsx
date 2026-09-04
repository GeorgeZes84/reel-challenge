"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { MovieGeoQuestion } from "../data/cinema-map-data";
import {
  advanceCinemaMap,
  cinemaMapProgress,
  cinemaMapResult,
  createCinemaMapState,
  currentCinemaMapMovie,
  markCinemaMapReady,
  resolveCinemaMapPlacement,
  type CinemaMapProgress,
  type CinemaMapResult,
  type CinemaMapState,
} from "../data/cinema-map-engine";
import { CinemaMapResults } from "./CinemaMapHud";
import {
  CinemaWorldMap,
  cinemaCountryName,
  type CinemaMapFeedback,
  type CinemaWorldMapHandle,
} from "./CinemaWorldMap";
import { MovieGeoTicket, type MovieGeoTicketPhase } from "./MovieGeoTicket";

type DragRecord = {
  pointerId: number;
  startX: number;
  startY: number;
  element: HTMLButtonElement;
  moved: boolean;
};

const INITIAL_MESSAGE = "Pick a region, then drag the movie ticket or tap its country of origin.";

export function CinemaMapGame({
  movies,
  seed,
  totalScore,
  onProgress,
  onContinue,
  onSound,
  onStatus,
  quickPlay = false,
  onSelectGame,
}: {
  movies: readonly MovieGeoQuestion[];
  seed: string;
  totalScore: number;
  onProgress: (progress: CinemaMapProgress) => void;
  onContinue: (result: CinemaMapResult) => void;
  onSound: (cue: "pick" | "correct" | "wrong" | "punch" | "complete") => void;
  onStatus: (message: string) => void;
  quickPlay?: boolean;
  onSelectGame?: () => void;
}) {
  const [game, setGame] = useState(() => createCinemaMapState(movies, `${seed}:cinema-map`));
  const [replayNumber, setReplayNumber] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [selected, setSelected] = useState(true);
  const [hoveredCountryId, setHoveredCountryId] = useState<string | null>(null);
  const [message, setMessage] = useState(INITIAL_MESSAGE);
  const [reducedMotion, setReducedMotion] = useState(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const gameRef = useRef(game);
  const mapRef = useRef<CinemaWorldMapHandle | null>(null);
  const ticketRef = useRef<HTMLButtonElement | null>(null);
  const dragRef = useRef<DragRecord | null>(null);
  const interactionLockedRef = useRef(true);
  const continueLockedRef = useRef(false);
  const suppressClickUntilRef = useRef(0);
  const resultsHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const onProgressRef = useRef(onProgress);
  const onStatusRef = useRef(onStatus);
  const onSoundRef = useRef(onSound);

  useEffect(() => { onProgressRef.current = onProgress; }, [onProgress]);
  useEffect(() => { onStatusRef.current = onStatus; }, [onStatus]);
  useEffect(() => { onSoundRef.current = onSound; }, [onSound]);
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReducedMotion(preference.matches);
    updatePreference();
    preference.addEventListener("change", updatePreference);
    return () => preference.removeEventListener("change", updatePreference);
  }, []);

  const reportMessage = useCallback((nextMessage: string) => {
    setMessage(nextMessage);
    onStatusRef.current(nextMessage);
  }, []);

  const replaceGame = useCallback((next: CinemaMapState) => {
    gameRef.current = next;
    setGame(next);
    onProgressRef.current(cinemaMapProgress(next));
  }, []);

  useEffect(() => {
    onProgressRef.current(cinemaMapProgress(gameRef.current));
    onStatusRef.current(INITIAL_MESSAGE);
  }, []);

  useEffect(() => {
    if (game.status === "awaitingPlacement") {
      interactionLockedRef.current = false;
      return;
    }
    interactionLockedRef.current = true;
    if (game.status === "roundComplete") {
      const frame = window.requestAnimationFrame(() => resultsHeadingRef.current?.focus({ preventScroll: true }));
      onSoundRef.current("complete");
      return () => window.cancelAnimationFrame(frame);
    }
    const delay = game.status === "presentingTicket"
      ? reducedMotion ? 0 : 280
      : game.status === "resolvingCorrect"
        ? reducedMotion ? 120 : 680
        : game.lastResolution?.revealed
          ? reducedMotion ? 220 : 1050
          : reducedMotion ? 120 : 520;
    const serial = game.transitionSerial;
    const timer = window.setTimeout(() => {
      if (gameRef.current.transitionSerial !== serial || gameRef.current.status !== game.status) return;
      if (game.status === "presentingTicket") {
        setSelected(true);
        replaceGame(markCinemaMapReady(gameRef.current));
        reportMessage("Zoom into a region, then place the ticket. Country names appear as you get closer.");
      } else {
        const next = advanceCinemaMap(gameRef.current);
        setSelected(true);
        if (ticketRef.current) {
          ticketRef.current.style.transform = "";
          ticketRef.current.style.removeProperty("--geo-snap-x");
          ticketRef.current.style.removeProperty("--geo-snap-y");
        }
        replaceGame(next);
        if (next.status === "presentingTicket") reportMessage("New destination. Keep this view or use World View to travel elsewhere.");
      }
    }, delay);
    return () => window.clearTimeout(timer);
  }, [game.status, game.transitionSerial, game.lastResolution?.revealed, reducedMotion, replaceGame, reportMessage]);

  const currentMovie = currentCinemaMapMovie(game, movies);
  const markerCounts = useMemo(() => game.answers.reduce<Record<string, number>>((counts, answer) => {
    counts[answer.resolvedCountryId] = (counts[answer.resolvedCountryId] ?? 0) + 1;
    return counts;
  }, {}), [game.answers]);

  const feedback: CinemaMapFeedback = game.status === "resolvingCorrect" && game.lastResolution
    ? { countryId: game.lastResolution.selectedCountryId, kind: "correct" }
    : game.status === "resolvingWrong" && game.lastResolution
      ? game.lastResolution.revealed
        ? { countryId: game.lastResolution.correctCountryId, kind: "revealed" }
        : { countryId: game.lastResolution.selectedCountryId, kind: "wrong" }
      : null;

  const clearTicketMotion = () => {
    const element = ticketRef.current;
    if (!element) return;
    element.style.transform = "";
    element.style.removeProperty("--geo-snap-x");
    element.style.removeProperty("--geo-snap-y");
  };

  const submitCountry = (countryId: string) => {
    if (interactionLockedRef.current || gameRef.current.status !== "awaitingPlacement") return;
    interactionLockedRef.current = true;
    const outcome = resolveCinemaMapPlacement(gameRef.current, countryId, movies);
    if (!outcome.accepted) {
      interactionLockedRef.current = false;
      return;
    }
    const resolution = outcome.state.lastResolution;
    setHoveredCountryId(null);
    setSelected(false);
    if (outcome.correct && resolution) {
      const target = mapRef.current?.countryClientPoint(resolution.correctCountryId);
      const card = ticketRef.current?.getBoundingClientRect();
      if (target && card && ticketRef.current && !reducedMotion) {
        ticketRef.current.style.setProperty("--geo-snap-x", `${target.x - (card.left + card.width / 2)}px`);
        ticketRef.current.style.setProperty("--geo-snap-y", `${target.y - (card.top + card.height / 2)}px`);
        ticketRef.current.style.transform = "";
      }
      onSoundRef.current("punch");
      reportMessage(`${cinemaCountryName(resolution.correctCountryId)} stamped. +${resolution.scoreAwarded.toLocaleString("en-US")} points.`);
    } else if (resolution?.revealed) {
      clearTicketMotion();
      onSoundRef.current("wrong");
      reportMessage(`Route revealed: ${cinemaCountryName(resolution.correctCountryId)}. This ticket is filed so the journey can continue.`);
    } else if (resolution) {
      clearTicketMotion();
      onSoundRef.current("wrong");
      reportMessage(resolution.regionHint
        ? `${cinemaCountryName(resolution.selectedCountryId)} is not the route. Region hint: ${resolution.regionHint}.`
        : `${cinemaCountryName(resolution.selectedCountryId)} is not the route. Try again—nothing has been revealed.`);
    }
    replaceGame(outcome.state);
  };

  const startDragging = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (gameRef.current.status !== "awaitingPlacement" || interactionLockedRef.current || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, element: event.currentTarget, moved: false };
    setDragging(true);
    setSelected(true);
    onSoundRef.current("pick");
    reportMessage("Carry the ticket over the map. The country beneath it will glow.");
  };

  const moveDragging = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    if (Math.hypot(deltaX, deltaY) > 5) drag.moved = true;
    const tilt = Math.max(-6, Math.min(6, deltaX / 45));
    drag.element.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0) rotate(${tilt}deg) scale(1.035)`;
    const countryId = mapRef.current?.countryAtClientPoint(event.clientX, event.clientY) ?? null;
    setHoveredCountryId((current) => current === countryId ? current : countryId);
  };

  const stopDragging = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setDragging(false);
    setHoveredCountryId(null);
    suppressClickUntilRef.current = performance.now() + 280;
    if (!drag.moved) {
      clearTicketMotion();
      setSelected(true);
      reportMessage("Ticket selected. Tap a country on the map, or use the country search below it.");
      return;
    }
    const regionId = mapRef.current?.regionAtClientPoint(event.clientX, event.clientY) ?? null;
    if (regionId) {
      clearTicketMotion();
      mapRef.current?.zoomToRegion(regionId);
      reportMessage("Region enlarged. Now place the ticket on a country inside it.");
      return;
    }
    const countryId = mapRef.current?.countryAtClientPoint(event.clientX, event.clientY) ?? null;
    if (!countryId) {
      clearTicketMotion();
      reportMessage("The ticket returned to the travel desk. Drop it directly on land, or tap a country.");
      return;
    }
    submitCountry(countryId);
  };

  const cancelDragging = () => {
    if (!dragRef.current) return;
    dragRef.current = null;
    setDragging(false);
    setHoveredCountryId(null);
    clearTicketMotion();
    reportMessage(INITIAL_MESSAGE);
  };

  const replay = () => {
    const nextReplayNumber = replayNumber + 1;
    const next = createCinemaMapState(movies, `${seed}:cinema-map:${nextReplayNumber}`);
    continueLockedRef.current = false;
    interactionLockedRef.current = true;
    dragRef.current = null;
    clearTicketMotion();
    mapRef.current?.resetView();
    setReplayNumber(nextReplayNumber);
    setDragging(false);
    setHoveredCountryId(null);
    setSelected(true);
    setMessage(INITIAL_MESSAGE);
    replaceGame(next);
  };

  const continueRun = () => {
    if (continueLockedRef.current || gameRef.current.status !== "roundComplete") return;
    continueLockedRef.current = true;
    onContinue(cinemaMapResult(gameRef.current));
  };

  const ticketPhase: MovieGeoTicketPhase = dragging
    ? "dragging"
    : game.status === "presentingTicket"
      ? "presenting"
      : game.status === "resolvingCorrect"
        ? "correct"
        : game.status === "resolvingWrong"
          ? game.lastResolution?.revealed ? "revealed" : "wrong"
          : "ready";

  return (
    <div
      className={`cinema-map-stage is-${game.status}${dragging ? " is-dragging" : ""}`}
      onPointerMove={moveDragging}
      onPointerUp={stopDragging}
      onPointerCancel={cancelDragging}
      onLostPointerCapture={cancelDragging}
    >
      <header className="cinema-map-heading">
        <span>{quickPlay ? "GAME 04 · CINEMA MAP" : "STAGE 4 · CINEMA MAP"}</span>
        <h2>Where in the world was it made?</h2>
        <p>Explore the map, zoom close, then stamp each movie ticket onto its country of origin.</p>
      </header>

      <CinemaWorldMap
        ref={mapRef}
        disabled={game.status !== "awaitingPlacement"}
        feedback={feedback}
        hoveredCountryId={hoveredCountryId}
        markerCounts={markerCounts}
        onCountrySelect={submitCountry}
        onStatus={reportMessage}
      />

      <aside className="cinema-map-ticket-dock" aria-label="Current movie ticket">
        <div className="cinema-map-question-count"><span>Current departure</span><b>{Math.min(game.currentIndex + 1, game.movieOrder.length)} / {game.movieOrder.length}</b></div>
        {currentMovie ? (
          <MovieGeoTicket
            movie={currentMovie}
            phase={ticketPhase}
            selected={selected}
            ticketRef={ticketRef}
            onPointerDown={startDragging}
            onSelect={() => {
              if (performance.now() < suppressClickUntilRef.current || gameRef.current.status !== "awaitingPlacement") return;
              setSelected(true);
              reportMessage("Ticket selected. Tap a country on the map, or use the country search below it.");
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setSelected(false);
                reportMessage("Ticket selection cleared. Select it again whenever you are ready.");
              }
            }}
          />
        ) : <div className="cinema-map-deck-complete">JOURNEY COMPLETE ✓</div>}
        <div className="cinema-map-attempts" aria-label={`${game.attemptsCurrentMovie} of 3 misses used`}>
          <span>Passport attempts</span>
          <div>{Array.from({ length: 3 }, (_, index) => <i className={index < game.attemptsCurrentMovie ? "is-used" : ""} key={index} />)}</div>
          <small>Third miss reveals the route. No timer.</small>
        </div>
      </aside>

      <div className={`cinema-map-status${game.status === "resolvingWrong" ? " is-wrong" : game.status === "resolvingCorrect" ? " is-correct" : ""}`} role="status" aria-live={game.status === "resolvingWrong" ? "assertive" : "polite"}>{message}</div>

      {game.status === "roundComplete" ? (
        <CinemaMapResults
          result={cinemaMapResult(game)}
          totalScore={totalScore}
          headingRef={resultsHeadingRef}
          onReplay={replay}
          onContinue={continueRun}
          quickPlay={quickPlay}
          onSelectGame={onSelectGame}
        />
      ) : null}
    </div>
  );
}
