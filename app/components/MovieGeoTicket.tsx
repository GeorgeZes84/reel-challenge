"use client";

/* eslint-disable @next/next/no-img-element -- optional licensed artwork has a resilient local placeholder. */

import { useState, type CSSProperties, type KeyboardEvent, type PointerEvent as ReactPointerEvent, type Ref } from "react";
import type { MovieGeoQuestion } from "../data/cinema-map-data";

export type MovieGeoTicketPhase = "presenting" | "ready" | "dragging" | "correct" | "wrong" | "revealed";

export function MovieGeoTicket({
  movie,
  phase,
  selected,
  ticketRef,
  onPointerDown,
  onSelect,
  onKeyDown,
}: {
  movie: MovieGeoQuestion;
  phase: MovieGeoTicketPhase;
  selected: boolean;
  ticketRef?: Ref<HTMLButtonElement>;
  onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onSelect: () => void;
  onKeyDown?: (event: KeyboardEvent<HTMLButtonElement>) => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(movie.image && !imageFailed);
  return (
    <button
      ref={ticketRef}
      type="button"
      className={`movie-geo-ticket is-${phase}${selected ? " is-selected" : ""}`}
      style={{ "--geo-accent": movie.accent } as CSSProperties}
      onPointerDown={onPointerDown}
      onClick={onSelect}
      onKeyDown={onKeyDown}
      aria-label={`${movie.title}, ${movie.year}, directed by ${movie.director}. Drag this ticket to its country of origin, or select it and choose a country.`}
      aria-pressed={selected}
      aria-disabled={phase !== "ready"}
    >
      <span className="geo-ticket-spine" aria-hidden="true">WORLD<br />PREMIERE</span>
      <span className={`geo-ticket-art${showImage ? "" : " is-placeholder"}`}>
        {showImage ? <img src={movie.image} alt={`${movie.title} artwork`} draggable={false} onError={() => setImageFailed(true)} /> : <><i aria-hidden="true">◎</i><b>35</b><small>MM</small></>}
      </span>
      <span className="geo-ticket-copy">
        <small>COUNTRY OF ORIGIN · CLASSIFIED</small>
        <strong>{movie.title}</strong>
        <span><b>{movie.year}</b><i aria-hidden="true" />{movie.genre}</span>
        <em>Directed by {movie.director}</em>
      </span>
      <span className="geo-ticket-route" aria-hidden="true">✈</span>
      {phase === "correct" || phase === "revealed" ? <span className="geo-passport-stamp">{phase === "correct" ? "STAMPED" : "ROUTE REVEALED"}</span> : null}
    </button>
  );
}

