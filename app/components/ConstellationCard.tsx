"use client";

import { type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import type { Director, Film } from "../data/directors";
import { genreColor, genreFamily } from "../data/genre-colors";
import { HINT_TYPES, type HintSticker, type HintType, type MovieRuntime } from "../data/game-engine";

export type Position = { x: number; y: number; rotation: number };

const stickerGlyphs: Record<HintType, string> = {
  movieIdentification: "▣",
  releaseDate: "#",
  verbalDirectorClue: "≡",
  elimination: "×",
  directAnswer: "★",
};

function HintStickerButton({ sticker, isLatest, isAutoOpen, onOpenDossier }: { sticker: HintSticker; isLatest: boolean; isAutoOpen: boolean; onOpenDossier: () => void }) {
  return (
    <button
      className={`hint-sticker hint-${sticker.type}${isLatest ? " is-latest" : ""}${isAutoOpen ? " is-new" : ""}`}
      type="button"
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation();
        onOpenDossier();
      }}
      aria-label={`Open movie file. ${sticker.label} is owned.`}
    >
      <span aria-hidden="true">{stickerGlyphs[sticker.type]}</span>
    </button>
  );
}

type MovieTicketProps = {
  film: Film;
  runtime: MovieRuntime;
  position: Position;
  isDragging: boolean;
  isRejected: boolean;
  isSpawning: boolean;
  isSelected: boolean;
  lastHintType?: HintType;
  autoOpenHintType?: HintType;
  onPointerDown: (event: ReactPointerEvent<HTMLElement>, filmId: string) => void;
  onSelect: (filmId: string) => void;
  onHintContext: (filmId: string) => void;
  onOpenDossier: (filmId: string) => void;
};

const PUNCH_HOLE_POSITIONS = [
  { x: 42, y: 7 },
  { x: 65, y: 7 },
  { x: 94, y: 49 },
  { x: 68, y: 93 },
  { x: 44, y: 93 },
  { x: 6, y: 54 },
] as const;

export function MovieTicket({ film, runtime, position, isDragging, isRejected, isSpawning, isSelected, lastHintType, autoOpenHintType, onPointerDown, onSelect, onHintContext, onOpenDossier }: MovieTicketProps) {
  const stickers = HINT_TYPES.map((type) => runtime.hints[type]).filter((sticker): sticker is HintSticker => Boolean(sticker));
  const displayGenre = genreFamily(film.genre);
  const previewPlacement = `${position.y < 32 ? "preview-below" : ""} ${position.x < 18 ? "preview-right" : position.x > 69 ? "preview-left" : ""}`;
  const visiblePunches = PUNCH_HOLE_POSITIONS.slice(0, runtime.punchCount);
  const punchMask = visiblePunches
    .map(({ x, y }) => `radial-gradient(circle 7px at ${x}% ${y}%, transparent 0 5px, #000 6.5px)`)
    .join(", ");
  const ticketStyle = {
    left: `${position.x}%`,
    top: `${position.y}%`,
    "--ticket-accent": genreColor(film.genre),
    "--ticket-rotation": `${position.rotation}deg`,
    "--ticket-hole-mask": punchMask || "linear-gradient(#000 0 0)",
  } as CSSProperties;

  return (
    <article
      className={`movie-ticket ${previewPlacement} ${visiblePunches.length ? "has-punches" : ""} ${isDragging ? "is-dragging" : ""} ${isRejected ? "is-rejected" : ""} ${isSpawning ? "is-spawning" : ""} ${isSelected ? "is-selected" : ""} ${autoOpenHintType ? "has-open-hint" : ""}`}
      style={ticketStyle}
      onPointerDown={(event) => onPointerDown(event, film.id)}
      onMouseEnter={() => onHintContext(film.id)}
      onFocusCapture={() => onHintContext(film.id)}
      data-movie-id={film.id}
      data-punch-count={runtime.punchCount}
    >
      <button
        className="ticket-select-surface"
        type="button"
        aria-pressed={isSelected}
        onClick={() => onSelect(film.id)}
        aria-label={`Movie ticket: ${film.title}${runtime.hints.releaseDate ? `, released ${film.year}` : ", release date unknown"}. ${runtime.punchCount} ${runtime.punchCount === 1 ? "wrong-answer punch" : "wrong-answer punches"}. Select it, then choose a director; or drag it onto a director.`}
      >
        <span className="ticket-perforation" aria-hidden="true" />
        <span className="ticket-copy">
          <strong>{film.title}</strong>
          <small className="ticket-meta"><span>{displayGenre}</span>{runtime.hints.releaseDate ? <><i aria-hidden="true">·</i><b>{film.year}</b></> : <b className="ticket-date-locked">DATE ?</b>}</small>
        </span>
      </button>
      <button className="ticket-dossier" type="button" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); onOpenDossier(film.id); }} aria-label={`Open the movie file for ${film.title}`}><span aria-hidden="true">⌕</span></button>
      {stickers.length > 0 ? (
        <span className="ticket-stickers">
          {stickers.map((sticker) => <HintStickerButton sticker={sticker} isLatest={sticker.type === lastHintType} isAutoOpen={sticker.type === autoOpenHintType} onOpenDossier={() => onOpenDossier(film.id)} key={`${sticker.type}-${sticker.purchaseCount ?? 1}`} />)}
        </span>
      ) : null}
      {visiblePunches.length > 0 ? (
        <span className="ticket-punches" aria-hidden="true">
          {visiblePunches.map(({ x, y }, index) => (
            <i style={{ "--punch-x": `${x}%`, "--punch-y": `${y}%` } as CSSProperties} key={index} />
          ))}
        </span>
      ) : null}
      {isRejected ? <span className="ticket-rejection-mark" aria-hidden="true">No match · Punched</span> : null}
    </article>
  );
}

type DirectorSlotProps = {
  slotIndex: number;
  director: Director | null;
  films: Film[];
  expectedFilmIds: string[];
  isReceiving: boolean;
  dropState: "neutral" | "correct" | "wrong" | null;
  isSpawning: boolean;
  isArchiving: boolean;
  isEliminated: boolean;
  isSelected: boolean;
  registerRef: (directorId: string, element: HTMLDivElement | null) => void;
  onSelect: (directorId: string) => void;
  onOpenDossier: (filmId: string) => void;
};

export function DirectorSlot({ slotIndex, director, films, expectedFilmIds, isReceiving, dropState, isSpawning, isArchiving, isEliminated, isSelected, registerRef, onSelect, onOpenDossier }: DirectorSlotProps) {
  if (!director) {
    return (
      <div
        className="director-slot is-empty"
        data-slot={slotIndex}
        data-drop-target="false"
        aria-disabled="true"
        aria-label={`Inactive director position ${slotIndex + 1}`}
      >
        <span>{String(slotIndex + 1).padStart(2, "0")}</span>
        <strong>Director offline</strong>
      </div>
    );
  }

  const socketCount = expectedFilmIds.length;

  return (
    <div
      ref={(element) => registerRef(director.id, element)}
      className={`director-slot is-active ${isReceiving ? "is-receiving" : ""} ${dropState ? `is-${dropState}` : ""} ${isSpawning ? "is-spawning" : ""} ${isArchiving ? "is-archiving" : ""} ${isEliminated ? "is-eliminated" : ""} ${isSelected ? "is-selected" : ""}`}
      data-slot={slotIndex}
      data-director-id={director.id}
      data-drop-target="director"
      data-socket-count={socketCount}
      aria-label={`Director ${director.name}. Select the director file for hints, or drop a movie ticket here. ${films.length} of ${socketCount} matched.`}
    >
      <button
        className="director-context-button"
        type="button"
        aria-pressed={isSelected}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={() => onSelect(director.id)}
        aria-label={`Open director hints for ${director.name}`}
      >
        <span className="pixel-portrait" aria-hidden="true"><span>{director.initials}</span><i /><b /></span>
        <span className="director-slot-copy"><small>Director · {films.length}/{socketCount} matched</small><strong>{director.name}</strong><em>Open file +</em></span>
      </button>
      <ol className="director-sockets" aria-label={`${socketCount} movie ticket receivers, ${films.length} filled`}>
        {Array.from({ length: socketCount }, (_, index) => {
          const isFilled = index < films.length;
          const isHighlighted = dropState === "neutral" && !isFilled;
          return (
            <li
              className={`director-socket ${isFilled ? "is-filled" : "is-open"} ${isReceiving && !isFilled ? "is-ready" : ""} ${isHighlighted ? "is-highlighted" : ""}`}
              data-receiver-state={isFilled ? "filled" : "open"}
              key={index}
            >
              <span aria-hidden="true">{isFilled ? "✓" : index + 1}</span>
              <small>{isFilled ? "Matched" : "Ticket"}</small>
            </li>
          );
        })}
      </ol>
      {films.length > 0 ? (
        <span className="director-mini-stack">
          {films.map((film) => (
            <button type="button" onClick={() => onOpenDossier(film.id)} aria-label={`Open the movie file for ${film.title}`} key={film.id}>
              <span>{film.title}</span><small>{film.year}</small>
            </button>
          ))}
        </span>
      ) : null}
      <span className="drop-readout">{dropState === "correct" ? "MATCHED ✓" : dropState === "wrong" ? "NOT A MATCH" : dropState === "neutral" ? "RELEASE TO SUBMIT" : isReceiving ? "DROP MOVIE HERE" : "MOVIE RECEIVER"}</span>
      {isEliminated ? <span className="eliminated-stamp">NOT THIS ONE</span> : null}
    </div>
  );
}

export function VictoryChip({ director, films }: { director: Director; films: Film[] }) {
  return (
    <div className="victory-chip">
      <span>{director.initials}</span>
      <span><strong>{director.name}</strong><small>{films.map((film) => `${film.title} (${film.year})`).join(" · ")}</small></span>
      <b aria-hidden="true">✓</b>
    </div>
  );
}
