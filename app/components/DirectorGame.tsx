"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { directors, type Film } from "../data/directors";
import type { DirectorHintType } from "../data/director-hints";
import { GENRE_LEGEND } from "../data/genre-colors";
import {
  GAME_CONFIG,
  attemptAssignment,
  createInitialGame,
  currentRank,
  purchaseDirectorHint,
  purchaseHint,
  runAccuracy,
  startNextStage,
  type AttemptOutcome,
  type DirectorHintReveal,
  type HintType,
} from "../data/game-engine";
import { CrtTelevision } from "./CrtTelevision";
import {
  COIN_STAGGER_MS,
  COIN_WALLET_DELAY_MS,
  CoinRewardLayer,
  coinRewardLifetime,
  type CoinRewardEvent,
} from "./CoinRewardFx";
import { CompletionArchiveSequence } from "./CompletionArchiveSequence";
import { DirectorSlot, MovieTicket, type Position } from "./ConstellationCard";
import { GameHud } from "./GameHud";
import { GameLoopTutorial } from "./GameLoopTutorial";
import { RankPopup } from "./RankPopup";
import { StageResultsOverlay } from "./StageResultsOverlay";
import { MovieDossierOverlay } from "./MovieDossierOverlay";

const TICKET_LAYOUT: Position[] = [
  { x: 3, y: 7, rotation: -3.5 },
  { x: 21, y: 5, rotation: 2.2 },
  { x: 39, y: 7, rotation: -1.4 },
  { x: 57, y: 5, rotation: 3.4 },
  { x: 75, y: 8, rotation: -2.4 },
  { x: 4, y: 73, rotation: 2.5 },
  { x: 22, y: 75, rotation: -3.2 },
  { x: 40, y: 74, rotation: 1.3 },
  { x: 58, y: 76, rotation: -2 },
  { x: 76, y: 73, rotation: 3.1 },
];

const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value));

function initialTicketSlots(movieIds: string[]) {
  return Object.fromEntries(movieIds.map((filmId, index) => [filmId, index]));
}

function initialPositions(movieIds: string[]) {
  return Object.fromEntries(movieIds.map((filmId, index) => [filmId, TICKET_LAYOUT[index] ?? TICKET_LAYOUT[0]]));
}

type DirectorFeedback = { directorId: string; kind: "correct" | "wrong" } | null;
type ArchiveSequence = { directorId: string; directorName: string; filmTitles: string[] } | null;
type DragRecord = {
  filmId: string;
  pointerId: number;
  startX: number;
  startY: number;
  startPosition: Position;
  boardRect: DOMRect;
};

function makeLookupMaps() {
  return {
    directorsById: new Map(directors.map((director) => [director.id, director])),
    filmsById: new Map(directors.flatMap((director) => director.films.map((film) => [film.id, film] as const))),
  };
}

const LOOKUPS = makeLookupMaps();

export function DirectorGame({ initialSeed }: { initialSeed: string }) {
  const lookups = LOOKUPS;
  const [game, setGame] = useState(() => createInitialGame(directors, initialSeed));
  const [positions, setPositions] = useState<Record<string, Position>>(() => initialPositions(game.visibleMovieIds));
  const [ticketSlots, setTicketSlots] = useState<Record<string, number>>(() => initialTicketSlots(game.visibleMovieIds));
  const [draggingFilmId, setDraggingFilmId] = useState<string | null>(null);
  const [hoveredDirectorId, setHoveredDirectorId] = useState<string | null>(null);
  const [selectedFilmId, setSelectedFilmId] = useState<string | null>(null);
  const [hintContextFilmId, setHintContextFilmId] = useState<string | null>(null);
  const [hintContextDirectorId, setHintContextDirectorId] = useState<string | null>(null);
  const [lastHintByFilm, setLastHintByFilm] = useState<Record<string, HintType>>({});
  const [autoOpenHint, setAutoOpenHint] = useState<{ filmId: string; type: HintType } | null>(null);
  const [dossierFilmId, setDossierFilmId] = useState<string | null>(null);
  const [openDirectorHintKey, setOpenDirectorHintKey] = useState<{ directorId: string; type: DirectorHintType } | null>(null);
  const [hintRescueVisible, setHintRescueVisible] = useState(false);
  const [rejectedFilmId, setRejectedFilmId] = useState<string | null>(null);
  const [spawningMovieIds, setSpawningMovieIds] = useState<string[]>(() => game.visibleMovieIds);
  const [spawningDirectorId, setSpawningDirectorId] = useState<string | null>(null);
  const [directorFeedback, setDirectorFeedback] = useState<DirectorFeedback>(null);
  const [rankToast, setRankToast] = useState<ReturnType<typeof currentRank> | null>(null);
  const [archiveSequence, setArchiveSequence] = useState<ArchiveSequence>(null);
  const [scoreBurst, setScoreBurst] = useState<string | null>(null);
  const [coinRewards, setCoinRewards] = useState<CoinRewardEvent[]>([]);
  const [showHelp, setShowHelp] = useState(true);
  const [actionLocked, setActionLocked] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [crtEnabled, setCrtEnabled] = useState(true);
  const [hudMessage, setHudMessage] = useState("Pick up a movie ticket and drag it to a director. The verdict comes after release.");

  const boardRef = useRef<HTMLElement | null>(null);
  const coinWalletRef = useRef<HTMLDivElement | null>(null);
  const directorRefs = useRef(new Map<string, HTMLDivElement>());
  const coinRewardSerialRef = useRef(0);
  const dragRef = useRef<DragRecord | null>(null);
  const didMoveRef = useRef(false);
  const suppressClickUntilRef = useRef(0);
  const timersRef = useRef<number[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const wrongStreakRef = useRef(0);
  const hintRescueCooldownMoveRef = useRef(0);

  const schedule = (callback: () => void, delay: number) => {
    const timer = window.setTimeout(() => {
      timersRef.current = timersRef.current.filter((candidate) => candidate !== timer);
      callback();
    }, delay);
    timersRef.current.push(timer);
  };

  useEffect(() => () => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    audioContextRef.current?.close().catch(() => undefined);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setSpawningMovieIds([]), 520);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!dossierFilmId && !showHelp) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDossierFilmId(null);
        setShowHelp(false);
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [showHelp, dossierFilmId]);

  const playSound = (cue: "pick" | "correct" | "wrong" | "hint" | "punch" | "complete" | "spawn" | "coin") => {
    if (!soundEnabled || typeof window === "undefined") return;
    const context = audioContextRef.current ?? new AudioContext();
    audioContextRef.current = context;
    void context.resume();
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const notes = {
      pick: [220, 280, 0.06],
      correct: [520, 880, 0.18],
      wrong: [150, 78, 0.22],
      hint: [420, 640, 0.12],
      punch: [260, 96, 0.09],
      complete: [440, 1040, 0.34],
      spawn: [105, 190, 0.15],
      coin: [680, 1120, 0.07],
    } as const;
    const [from, to, duration] = notes[cue];
    oscillator.type = cue === "wrong" ? "sawtooth" : cue === "complete" || cue === "punch" ? "square" : "triangle";
    oscillator.frequency.setValueAtTime(from, now);
    oscillator.frequency.exponentialRampToValueAtTime(to, now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(cue === "wrong" ? 0.085 : 0.055, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  };

  const selectedFilm = selectedFilmId ? lookups.filmsById.get(selectedFilmId) ?? null : null;
  const hintContextFilm = hintContextFilmId ? lookups.filmsById.get(hintContextFilmId) ?? null : null;
  const hintContextDirector = hintContextDirectorId ? lookups.directorsById.get(hintContextDirectorId) ?? null : null;
  const openDirectorHint: DirectorHintReveal | null = openDirectorHintKey
    ? game.directorHints[openDirectorHintKey.directorId]?.[openDirectorHintKey.type] ?? null
    : null;
  const dossierFilm = dossierFilmId ? lookups.filmsById.get(dossierFilmId) ?? null : null;
  const dossierRuntime = dossierFilmId ? game.movies[dossierFilmId] ?? null : null;
  const isCleanup = game.stagePhase === "cleanup";

  const registerDirectorRef = (directorId: string, element: HTMLDivElement | null) => {
    if (element) directorRefs.current.set(directorId, element);
    else directorRefs.current.delete(directorId);
  };

  const directorAtPoint = (clientX: number, clientY: number) => {
    for (const [directorId, element] of directorRefs.current) {
      const rect = element.getBoundingClientRect();
      if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) return directorId;
    }
    return null;
  };

  const launchCoinReward = (amount: number, directorId: string, bonusAmount = 0, multiplier = 1) => {
    if (amount <= 0) return;
    const boardRect = boardRef.current?.getBoundingClientRect();
    const directorRect = directorRefs.current.get(directorId)?.getBoundingClientRect();
    const walletRect = coinWalletRef.current?.getBoundingClientRect();
    coinRewardSerialRef.current += 1;
    const event: CoinRewardEvent = {
      id: coinRewardSerialRef.current,
      amount,
      startX: boardRect && directorRect
        ? clamp(((directorRect.left + directorRect.width / 2 - boardRect.left) / boardRect.width) * 100, 4, 92)
        : 52,
      startY: boardRect && directorRect
        ? clamp(((directorRect.top + directorRect.height / 2 - boardRect.top) / boardRect.height) * 100, 8, 90)
        : 48,
      targetY: boardRect && walletRect
        ? clamp(((walletRect.top + walletRect.height / 2 - boardRect.top) / boardRect.height) * 100, 9, 91)
        : 46,
      bonusAmount,
      multiplier,
    };
    setCoinRewards((current) => [...current, event]);
    Array.from({ length: amount }, (_, index) => {
      schedule(() => playSound("coin"), COIN_WALLET_DELAY_MS + index * COIN_STAGGER_MS);
    });
    schedule(() => {
      setCoinRewards((current) => current.filter((reward) => reward.id !== event.id));
    }, coinRewardLifetime(amount, bonusAmount > 0));
  };

  const reconcileTicketLayout = (outcome: AttemptOutcome) => {
    const removedSlot = ticketSlots[outcome.filmId] ?? 0;
    setTicketSlots((current) => {
      const next = { ...current };
      delete next[outcome.filmId];
      const occupied = new Set(Object.values(next));
      outcome.newlyVisibleMovieIds.forEach((filmId, index) => {
        const preferred = index === 0 ? removedSlot : TICKET_LAYOUT.findIndex((_, slot) => !occupied.has(slot));
        const slot = preferred >= 0 ? preferred : 0;
        next[filmId] = slot;
        occupied.add(slot);
      });
      return next;
    });
    setPositions((current) => {
      const next = { ...current };
      delete next[outcome.filmId];
      outcome.newlyVisibleMovieIds.forEach((filmId, index) => {
        const slot = index === 0 ? removedSlot : (removedSlot + index) % TICKET_LAYOUT.length;
        next[filmId] = TICKET_LAYOUT[slot];
      });
      return next;
    });
    if (outcome.newlyVisibleMovieIds.length > 0) {
      setSpawningMovieIds(outcome.newlyVisibleMovieIds);
      schedule(() => setSpawningMovieIds([]), 520);
    }
  };

  const applyOutcome = (outcome: AttemptOutcome) => {
    setGame(outcome.state);
    if (outcome.kind === "correct") reconcileTicketLayout(outcome);
    setSelectedFilmId(null);
    if (outcome.kind === "correct") setHintContextFilmId((current) => current === outcome.filmId ? null : current);
    if (outcome.kind === "correct") setDossierFilmId((current) => current === outcome.filmId ? null : current);
    if (outcome.completedDirectorId) {
      setHintContextDirectorId((current) => current === outcome.completedDirectorId ? null : current);
      setOpenDirectorHintKey((current) => current?.directorId === outcome.completedDirectorId ? null : current);
    }
    if (outcome.spawnedDirectorId) {
      setSpawningDirectorId(outcome.spawnedDirectorId);
      playSound("spawn");
      schedule(() => setSpawningDirectorId(null), 700);
    }
    if (outcome.rankUnlocked && outcome.state.status === "playing") {
      schedule(() => {
        setRankToast(outcome.rankUnlocked ?? null);
        schedule(() => setRankToast(null), 2800);
      }, outcome.completedDirectorId ? 1050 : 0);
    }
    if (outcome.completedDirectorId) {
      const completedName = lookups.directorsById.get(outcome.completedDirectorId)?.name ?? "Director";
      setHudMessage(`${completedName} archived. Slot cleared. +${outcome.coinsAwarded} coins total.`);
    }
    if (game.stagePhase !== "cleanup" && outcome.state.stagePhase === "cleanup") {
      setHudMessage(`Cleanup phase. ${outcome.state.visibleMovieIds.length} movies remain; solved tickets will not be replaced.`);
    }
    if (outcome.state.status === "lost") setHudMessage("All five channels were occupied when a new director arrived.");
    if (outcome.state.status === "stage_complete") setHudMessage(`Stage ${outcome.state.stageNumber} cleared. The table is clean.`);
    if (outcome.state.status === "won") setHudMessage("Every available director is archived.");
  };

  const resolveAssignment = (filmId: string, targetDirectorId: string, returnPosition?: Position) => {
    if (actionLocked || game.status !== "playing" || !game.visibleMovieIds.includes(filmId)) return;
    const runtime = game.movies[filmId];
    const isCorrect = runtime.ownerDirectorId === targetDirectorId;
    setActionLocked(true);
    setDirectorFeedback({ directorId: targetDirectorId, kind: isCorrect ? "correct" : "wrong" });
    suppressClickUntilRef.current = performance.now() + 300;

    if (isCorrect) {
      wrongStreakRef.current = 0;
      const outcome = attemptAssignment(game, filmId, targetDirectorId);
      const completed = Boolean(outcome.completedDirectorId);
      launchCoinReward(outcome.coinsAwarded, targetDirectorId, outcome.comboBonusCoins, outcome.multiplier);
      setScoreBurst(`+${outcome.scoreAwarded} · ×${outcome.multiplier}`);
      const comboCoins = outcome.comboBonusCoins > 0 ? ` +${outcome.comboBonusCoins} combo coins.` : "";
      setHudMessage(completed ? `Three for three. Archive sequence engaged.${comboCoins}` : `Match locked. +${outcome.coinsAwarded} coins.${comboCoins}`);
      if (completed && outcome.completedDirectorId) {
        const completedDirectorId = outcome.completedDirectorId;
        const completedName = lookups.directorsById.get(completedDirectorId)?.name ?? "Director";
        const victory = outcome.state.victoryDirectors.find((director) => director.directorId === completedDirectorId);
        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const applyDelay = reducedMotion ? 80 : 1720;
        const finishDelay = reducedMotion ? 140 : 1900;
        setArchiveSequence({
          directorId: completedDirectorId,
          directorName: completedName,
          filmTitles: (victory?.filmIds ?? []).map((id) => lookups.filmsById.get(id)?.title ?? id),
        });
        if (reducedMotion) {
          playSound("punch");
          schedule(() => playSound("complete"), 70);
        } else {
          [70, 170, 270].forEach((delay) => schedule(() => playSound("pick"), delay));
          schedule(() => playSound("punch"), 650);
          schedule(() => playSound("complete"), 920);
        }
        schedule(() => applyOutcome(outcome), applyDelay);
        schedule(() => {
          setArchiveSequence(null);
          setDirectorFeedback(null);
          setScoreBurst(null);
          setActionLocked(false);
        }, finishDelay);
        return;
      }
      playSound("correct");
      applyOutcome(outcome);
      schedule(() => {
        setDirectorFeedback(null);
        setScoreBurst(null);
        setActionLocked(false);
      }, 520);
      return;
    }

    if (returnPosition) {
      setPositions((current) => ({ ...current, [filmId]: returnPosition }));
    }
    const outcome = attemptAssignment(game, filmId, targetDirectorId);
    setRejectedFilmId(filmId);
    setHudMessage(`Rejected. One punch added—the ticket stays on the table and remains playable.`);
    playSound("wrong");
    applyOutcome(outcome);
    wrongStreakRef.current += 1;
    if (wrongStreakRef.current >= 4 && outcome.state.status === "playing" && outcome.state.moveCount >= hintRescueCooldownMoveRef.current) {
      wrongStreakRef.current = 0;
      hintRescueCooldownMoveRef.current = outcome.state.moveCount + 8;
      setHintRescueVisible(true);
      schedule(() => setHintRescueVisible(false), 4200);
    }
    schedule(() => {
      setRejectedFilmId(null);
      setDirectorFeedback(null);
      setActionLocked(false);
    }, 620);
  };

  const startDragging = (event: ReactPointerEvent<HTMLElement>, filmId: string) => {
    if (actionLocked || game.status !== "playing" || event.button !== 0) return;
    const boardRect = boardRef.current?.getBoundingClientRect();
    const startPosition = positions[filmId];
    if (!boardRect || !startPosition) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      filmId,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startPosition,
      boardRect,
    };
    didMoveRef.current = false;
    setHintContextFilmId(filmId);
    setHintContextDirectorId(null);
    setOpenDirectorHintKey(null);
    setDraggingFilmId(filmId);
    playSound("pick");
  };

  const moveDragging = (event: ReactPointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    if (Math.hypot(deltaX, deltaY) > 4 && !didMoveRef.current) {
      didMoveRef.current = true;
      setSelectedFilmId(drag.filmId);
      setHudMessage("Ticket in hand. Release it on a glowing director; the three sockets show where it goes.");
    }
    if (!didMoveRef.current) return;
    event.preventDefault();
    setPositions((current) => ({
      ...current,
      [drag.filmId]: {
        ...drag.startPosition,
        x: clamp(drag.startPosition.x + (deltaX / drag.boardRect.width) * 100, 1, 84),
        y: clamp(drag.startPosition.y + (deltaY / drag.boardRect.height) * 100, 2, 76),
        rotation: 0,
      },
    }));
    setHoveredDirectorId(directorAtPoint(event.clientX, event.clientY));
  };

  const stopDragging = (event: ReactPointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const targetDirectorId = didMoveRef.current ? directorAtPoint(event.clientX, event.clientY) : null;
    if (didMoveRef.current) suppressClickUntilRef.current = performance.now() + 250;
    dragRef.current = null;
    didMoveRef.current = false;
    setDraggingFilmId(null);
    setHoveredDirectorId(null);
    if (targetDirectorId) resolveAssignment(drag.filmId, targetDirectorId, drag.startPosition);
  };

  const cancelDragging = (event: ReactPointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (didMoveRef.current) suppressClickUntilRef.current = performance.now() + 250;
    dragRef.current = null;
    didMoveRef.current = false;
    setPositions((current) => ({ ...current, [drag.filmId]: drag.startPosition }));
    setDraggingFilmId(null);
    setHoveredDirectorId(null);
    setHudMessage("Drag cancelled. The ticket is still parked on the board.");
  };

  const handleSelect = (filmId: string) => {
    if (performance.now() < suppressClickUntilRef.current) return;
    setSelectedFilmId((current) => current === filmId ? null : filmId);
    setHintContextFilmId(filmId);
    setHintContextDirectorId(null);
    setOpenDirectorHintKey(null);
    setHudMessage("Movie ticket selected. Drag it to a director, buy a clue, or choose a director in the side panel.");
  };

  const handleMovieHintContext = (filmId: string) => {
    setHintContextFilmId(filmId);
    setHintContextDirectorId(null);
    setOpenDirectorHintKey(null);
  };

  const handleDirectorHintContext = (directorId: string) => {
    setSelectedFilmId(null);
    setHintContextFilmId(null);
    setHintContextDirectorId(directorId);
    setOpenDirectorHintKey(null);
    setHintRescueVisible(false);
    setHudMessage(`${lookups.directorsById.get(directorId)?.name ?? "Director"} file selected. Choose a director hint.`);
  };

  const buyHint = (type: HintType) => {
    if (actionLocked || !hintContextFilmId) {
      setHudMessage("Hover or select a ticket before visiting the hint shop.");
      return;
    }
    const targetFilmId = hintContextFilmId;
    const result = purchaseHint(game, targetFilmId, type, directors);
    if (!result.ok) {
      const messages = {
        not_visible: "That ticket has left the screen.",
        already_owned: "That sticker is already attached.",
        not_enough_coins: "Not enough coins. Correct matches pay out.",
        not_available: "That clue unlocks when three directors are active.",
        no_candidate: "Only the final candidate remains. No more directors can be crossed out.",
      } as const;
      setHudMessage(messages[result.reason ?? "no_candidate"]);
      return;
    }
    setGame(result.state);
    wrongStreakRef.current = 0;
    setHintRescueVisible(false);
    setLastHintByFilm((current) => ({ ...current, [targetFilmId]: type }));
    setAutoOpenHint({ filmId: targetFilmId, type });
    setSelectedFilmId(targetFilmId);
    schedule(() => {
      setAutoOpenHint((current) => current?.filmId === targetFilmId && current.type === type ? null : current);
    }, 1200);
    setDossierFilmId(targetFilmId);
    setHudMessage(`${result.sticker?.label ?? "Hint"} filed. The movie evidence file is open.`);
    playSound("hint");
  };

  const openDossier = (filmId: string) => {
    if (!game.movies[filmId]) return;
    setDossierFilmId(filmId);
    if (game.visibleMovieIds.includes(filmId)) setSelectedFilmId(filmId);
    setHintContextFilmId(filmId);
    setHintContextDirectorId(null);
    setOpenDirectorHintKey(null);
    setHudMessage(`${lookups.filmsById.get(filmId)?.title ?? "Movie"} evidence file opened.`);
    playSound("hint");
  };

  const showDirectorHint = (directorId: string, type: DirectorHintType) => {
    setOpenDirectorHintKey({ directorId, type });
    schedule(() => {
      setOpenDirectorHintKey((current) => current?.directorId === directorId && current.type === type ? null : current);
    }, 4200);
  };

  const buyDirectorHint = (type: DirectorHintType) => {
    if (actionLocked || !hintContextDirectorId) {
      setHudMessage("Select a director card before opening a director file.");
      return;
    }
    const targetDirectorId = hintContextDirectorId;
    const result = purchaseDirectorHint(game, targetDirectorId, type);
    if (!result.ok) {
      const messages = {
        not_active: "That director has already left the active board.",
        already_owned: "That director note is already filed.",
        not_enough_coins: "Not enough coins. Correct matches pay out.",
        no_profile: "That director file is still being restored.",
      } as const;
      setHudMessage(messages[result.reason ?? "no_profile"]);
      return;
    }
    setGame(result.state);
    wrongStreakRef.current = 0;
    setHintRescueVisible(false);
    showDirectorHint(targetDirectorId, type);
    setHudMessage(`${result.reveal?.label ?? "Director hint"} added to the director file.`);
    playSound("hint");
  };

  const reopenDirectorHint = (type: DirectorHintType) => {
    if (!hintContextDirectorId || !game.directorHints[hintContextDirectorId]?.[type]) return;
    showDirectorHint(hintContextDirectorId, type);
    playSound("hint");
  };

  const newGame = () => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
    const seed = crypto.randomUUID();
    const fresh = createInitialGame(directors, seed);
    setGame(fresh);
    setPositions(initialPositions(fresh.visibleMovieIds));
    setTicketSlots(initialTicketSlots(fresh.visibleMovieIds));
    setDraggingFilmId(null);
    setHoveredDirectorId(null);
    setSelectedFilmId(null);
    setHintContextFilmId(null);
    setHintContextDirectorId(null);
    setLastHintByFilm({});
    setAutoOpenHint(null);
    setDossierFilmId(null);
    setOpenDirectorHintKey(null);
    setHintRescueVisible(false);
    setRejectedFilmId(null);
    setSpawningMovieIds(fresh.visibleMovieIds);
    setSpawningDirectorId(null);
    setDirectorFeedback(null);
    setRankToast(null);
    setArchiveSequence(null);
    setScoreBurst(null);
    setCoinRewards([]);
    setShowHelp(false);
    setActionLocked(false);
    wrongStreakRef.current = 0;
    hintRescueCooldownMoveRef.current = 0;
    setHudMessage("Fresh tape, fresh cast. Two directors are live.");
    schedule(() => setSpawningMovieIds([]), 520);
  };

  const continueStage = () => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
    const next = startNextStage(game);
    setGame(next);
    setPositions(initialPositions(next.visibleMovieIds));
    setTicketSlots(initialTicketSlots(next.visibleMovieIds));
    setDraggingFilmId(null);
    setHoveredDirectorId(null);
    setSelectedFilmId(null);
    setHintContextFilmId(null);
    setHintContextDirectorId(null);
    setAutoOpenHint(null);
    setDossierFilmId(null);
    setOpenDirectorHintKey(null);
    setHintRescueVisible(false);
    setRejectedFilmId(null);
    setSpawningMovieIds(next.visibleMovieIds);
    setSpawningDirectorId(null);
    setDirectorFeedback(null);
    setRankToast(null);
    setArchiveSequence(null);
    setScoreBurst(null);
    setCoinRewards([]);
    setActionLocked(false);
    wrongStreakRef.current = 0;
    hintRescueCooldownMoveRef.current = next.moveCount;
    setHudMessage(next.status === "playing" ? `Stage ${next.stageNumber}. New directors, same high-score run.` : "Every available director is archived.");
    if (next.status === "playing") schedule(() => setSpawningMovieIds([]), 520);
  };

  const consoleContent = (
    <GameHud
      game={game}
      selectedFilm={selectedFilm}
      hintContextFilm={hintContextFilm}
      hintContextDirector={hintContextDirector}
      openDirectorHint={openDirectorHint}
      hintRescueVisible={hintRescueVisible}
      directorsById={lookups.directorsById}
      message={hudMessage}
      coinRewards={coinRewards}
      coinWalletRef={coinWalletRef}
      onHint={buyHint}
      onDirectorHint={buyDirectorHint}
      onOpenDirectorHint={reopenDirectorHint}
      onAssign={(directorId) => selectedFilmId && resolveAssignment(selectedFilmId, directorId)}
    />
  );

  const controls = (
    <>
      <button type="button" onClick={() => setShowHelp(true)}><span aria-hidden="true">?</span> How to play</button>
      <button type="button" aria-pressed={soundEnabled} onClick={() => setSoundEnabled((enabled) => !enabled)}><span aria-hidden="true">♪</span> Sound {soundEnabled ? "on" : "off"}</button>
      <button type="button" aria-pressed={crtEnabled} onClick={() => setCrtEnabled((enabled) => !enabled)}><span aria-hidden="true">▥</span> CRT FX {crtEnabled ? "on" : "off"}</button>
      <button type="button" onClick={newGame}><span aria-hidden="true">↻</span> New signal</button>
    </>
  );

  return (
    <CrtTelevision
      crtEnabled={crtEnabled}
      console={consoleContent}
      controls={controls}
      status={game.status === "playing" ? hudMessage : game.status === "stage_complete" ? `Stage ${game.stageNumber} complete · results ready` : game.status === "won" ? "Archive complete · final results ready" : "Signal overload · final results ready"}
    >
      <section
        className={`director-board-screen pressure-${Math.min(GAME_CONFIG.maximumActiveDirectors, Math.max(1, game.activeDirectorIds.length))} ${draggingFilmId ? "is-dragging" : ""} ${isCleanup ? "is-cleanup" : ""}`}
        ref={boardRef}
        onPointerMove={moveDragging}
        onPointerUp={stopDragging}
        onPointerCancel={cancelDragging}
        onLostPointerCapture={cancelDragging}
        aria-label="Movie sorting board"
      >
        <div className="screen-grid" aria-hidden="true" />
        <div className="on-air-bug" aria-hidden="true"><i /> ON AIR</div>
        <div
          className={`screen-instruction match-route ${isCleanup ? "is-cleanup" : ""}`}
          aria-label={isCleanup ? `Cleanup phase. ${game.visibleMovieIds.length} movies remain and solved tickets will not be replaced.` : "Drag a movie ticket to a director"}
        >
          {isCleanup ? (
            <>
              <b>CLEANUP PHASE <i aria-hidden="true">↓</i> {game.visibleMovieIds.length} LEFT</b>
              <span>Every match now clears space. No replacements.</span>
            </>
          ) : (
            <>
              <b>MOVIE TICKET <i aria-hidden="true">→</i> DIRECTOR</b>
              <span>{draggingFilmId ? "Release on a glowing director. Its three sockets are ready." : "Pick up a ticket, then release it on a director."}</span>
            </>
          )}
          <div className="genre-rule" aria-label="Color equals genre: Romance pink, Comedy yellow, Drama blue, Horror red, Sci-Fi cyan, Fantasy green, Crime and Thriller purple">
            <strong>Color = Genre</strong>
            <div aria-hidden="true">
              {GENRE_LEGEND.map(({ genre, color }) => <i style={{ "--genre-color": color } as CSSProperties} title={genre} key={genre} />)}
            </div>
          </div>
        </div>

        {game.visibleMovieIds.map((filmId) => {
          const film = lookups.filmsById.get(filmId);
          const runtime = game.movies[filmId];
          const position = positions[filmId];
          if (!film || !runtime || !position) return null;
          return (
            <MovieTicket
              film={film}
              runtime={runtime}
              position={position}
              isDragging={draggingFilmId === filmId}
              isRejected={rejectedFilmId === filmId}
              isSpawning={spawningMovieIds.includes(filmId)}
              isSelected={selectedFilmId === filmId}
              lastHintType={lastHintByFilm[filmId]}
              autoOpenHintType={autoOpenHint?.filmId === filmId ? autoOpenHint.type : undefined}
              onPointerDown={startDragging}
              onSelect={handleSelect}
              onHintContext={handleMovieHintContext}
              onOpenDossier={openDossier}
              key={filmId}
            />
          );
        })}

        <div className="director-slots" aria-label={`${game.activeDirectorIds.length} active directors in 5 slots`}>
          {Array.from({ length: GAME_CONFIG.maximumActiveDirectors }, (_, slotIndex) => {
            const directorId = game.activeDirectorIds[slotIndex];
            const director = directorId ? lookups.directorsById.get(directorId) ?? null : null;
            const assignedFilmIds = directorId ? game.assignments[directorId] ?? [] : [];
            const assignedFilms = assignedFilmIds.map((id) => lookups.filmsById.get(id)).filter((film): film is Film => Boolean(film));
            const eliminationSticker = selectedFilmId ? game.movies[selectedFilmId]?.hints.elimination : undefined;
            const eliminationIds = eliminationSticker?.eliminatedDirectorIds ?? (eliminationSticker?.eliminatedDirectorId ? [eliminationSticker.eliminatedDirectorId] : []);
            const feedback = directorFeedback && directorFeedback.directorId === directorId ? directorFeedback.kind : null;
            const dropState = draggingFilmId && hoveredDirectorId === directorId ? "neutral" as const : feedback;
            return (
              <DirectorSlot
                slotIndex={slotIndex}
                director={director}
                films={assignedFilms}
                expectedFilmIds={directorId ? game.directorFilmIds[directorId] : []}
                isReceiving={Boolean(draggingFilmId)}
                dropState={dropState}
                isSpawning={spawningDirectorId === directorId}
                isArchiving={archiveSequence?.directorId === directorId}
                isEliminated={Boolean(directorId && eliminationIds.includes(directorId))}
                isSelected={hintContextDirectorId === directorId}
                registerRef={registerDirectorRef}
                onSelect={handleDirectorHintContext}
                onOpenDossier={openDossier}
                key={directorId ?? `empty-${slotIndex}`}
              />
            );
          })}
        </div>

        <CoinRewardLayer events={coinRewards} />
        {scoreBurst ? <div className="score-burst" aria-hidden="true">{scoreBurst}</div> : null}
        {archiveSequence ? <CompletionArchiveSequence directorName={archiveSequence.directorName} filmTitles={archiveSequence.filmTitles} /> : null}
        <RankPopup rank={rankToast} />

        {dossierFilm && dossierRuntime ? (
          <MovieDossierOverlay
            film={dossierFilm}
            runtime={dossierRuntime}
            activeDirectors={Array.from({ length: GAME_CONFIG.maximumActiveDirectors }, (_, index) => lookups.directorsById.get(game.activeDirectorIds[index]) ?? null)}
            onClose={() => setDossierFilmId(null)}
          />
        ) : null}

        {showHelp ? (
          <GameLoopTutorial onClose={() => setShowHelp(false)} />
        ) : null}

        {game.status === "stage_complete" ? <StageResultsOverlay game={game} onContinue={continueStage} /> : null}

        {game.status === "won" || game.status === "lost" ? (
          <div className={`screen-overlay results-overlay is-${game.status}`} role="dialog" aria-modal="true" aria-labelledby="result-title">
            <p>{game.status === "won" ? "Archive complete" : "Signal overloaded"}</p>
            <h2 id="result-title">{game.status === "won" ? "Every reel found its director." : "The directors took over."}</h2>
            <div className="final-rank"><span>Final rank</span><strong>{currentRank(game).title}</strong><small>{currentRank(game).quip}</small></div>
            <div className="results-grid">
              <div><span>Score</span><strong>{game.score.toLocaleString("en-US")}</strong></div>
              <div><span>Accuracy</span><strong>{runAccuracy(game)}%</strong></div>
              <div><span>Directors</span><strong>{game.victoryDirectors.length}/{game.runDirectorIds.length}</strong></div>
              <div><span>Best combo</span><strong>{game.bestCombo}</strong></div>
              <div><span>Top multiplier</span><strong>×{game.highestMultiplier}</strong></div>
              <div><span>Moves</span><strong>{game.moveCount}</strong></div>
              <div><span>Correct</span><strong>{game.correctAttempts}</strong></div>
              <div><span>Wrong</span><strong>{game.wrongAttempts}</strong></div>
              <div><span>Hints spent</span><strong>{game.coinsSpent}●</strong></div>
              <div><span>Coins left</span><strong>{game.coins}●</strong></div>
            </div>
            <button type="button" className="primary-pixel-button" onClick={newGame}>Play another tape</button>
          </div>
        ) : null}
      </section>
    </CrtTelevision>
  );
}
