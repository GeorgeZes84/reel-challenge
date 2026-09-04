"use client";

/* eslint-disable @next/next/no-img-element -- portrait and artwork URLs are data-driven, optional, and must support an inline failure fallback. */

import { useState, type CSSProperties, type KeyboardEvent, type MouseEvent, type PointerEvent as ReactPointerEvent, type Ref } from "react";
import { actorInitials, type CastCallMovie, type CastMember } from "../data/cast-call-data";

export type ActorPolaroidPhase = "presenting" | "ready" | "dragging" | "correct" | "wrong";

export function ActorPolaroid({
  actor,
  phase,
  showPortrait = true,
  showName = true,
  showCharacterName = false,
  cardRef,
  onPointerDown,
  onKeyDown,
}: {
  actor: CastMember;
  phase: ActorPolaroidPhase;
  showPortrait?: boolean;
  showName?: boolean;
  showCharacterName?: boolean;
  cardRef?: Ref<HTMLButtonElement>;
  onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLButtonElement>) => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = showPortrait && actor.portrait && !imageFailed;

  return (
    <button
      ref={cardRef}
      type="button"
      className={`actor-polaroid is-${phase}`}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      aria-label={`${actor.actorName}. Current casting photo. Drag to a movie, use left or right arrow, or choose a movie ticket.`}
      aria-disabled={phase !== "ready"}
    >
      <span className="actor-photo-frame">
        {showImage ? (
          <img
            src={actor.portrait}
            alt={`Casting portrait of ${actor.actorName}`}
            draggable={false}
            decoding="async"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <span className="actor-photo-placeholder" role="img" aria-label={`Portrait placeholder for ${actor.actorName}`}>
            <i aria-hidden="true" />
            <strong>{actorInitials(actor.actorName)}</strong>
            <small>CASTING PHOTO</small>
          </span>
        )}
        <span className="actor-photo-develop" aria-hidden="true" />
      </span>
      <span className="actor-polaroid-caption">
        {showName ? <strong>{actor.actorName}</strong> : <strong aria-hidden="true">CLASSIFIED</strong>}
        {showCharacterName && actor.characterName ? <small>as {actor.characterName}</small> : <small>CAST CALL · TAKE 01</small>}
      </span>
      <span className="polaroid-paperclip" aria-hidden="true" />
    </button>
  );
}

export type MovieTargetFeedback = "neutral" | "hovered" | "correct" | "wrong" | "completing";

function MovieArtwork({ movie }: { movie: CastCallMovie }) {
  const [imageFailed, setImageFailed] = useState(false);
  if (movie.image && !imageFailed) {
    return <span className="cast-ticket-art"><img src={movie.image} alt={`${movie.title} artwork`} draggable={false} decoding="async" onError={() => setImageFailed(true)} /></span>;
  }
  return <span className="cast-ticket-art is-placeholder" aria-hidden="true"><i>◉</i><b>35</b><small>MM</small></span>;
}

export function MovieCastTarget({
  movie,
  completedActors,
  feedback,
  isEntering,
  disabled,
  targetRef,
  onChoose,
}: {
  movie: CastCallMovie;
  completedActors: readonly CastMember[];
  feedback: MovieTargetFeedback;
  isEntering: boolean;
  disabled: boolean;
  targetRef: (element: HTMLButtonElement | null) => void;
  onChoose: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
  const completed = completedActors.length >= movie.cast.length;
  const progressLabel = `Cast ${completedActors.length} of ${movie.cast.length}`;

  return (
    <section
      className={`movie-cast-station is-${feedback}${isEntering ? " is-entering" : ""}${completed ? " is-complete" : ""}`}
      style={{ "--cast-accent": movie.accent } as CSSProperties}
      aria-label={`${movie.title}, ${progressLabel}`}
    >
      <button
        ref={targetRef}
        type="button"
        className="cast-movie-ticket"
        onClick={onChoose}
        disabled={disabled}
        aria-label={`Assign current actor to ${movie.title}. ${progressLabel}.`}
      >
        <span className="cast-ticket-spine" aria-hidden="true">ADMIT<br />ONE</span>
        <MovieArtwork movie={movie} />
        <span className="cast-ticket-copy">
          <small>NOW CASTING · FEATURE PICTURE</small>
          <strong>{movie.title}</strong>
          <span><b>{movie.year}</b><i aria-hidden="true" />{movie.genre}</span>
        </span>
        <span className="cast-ticket-progress">
          <small>CAST</small>
          <strong>{completedActors.length}/{movie.cast.length}</strong>
        </span>
        <span className="cast-drop-prompt" aria-hidden="true">DROP PHOTO HERE</span>
      </button>

      <div className="cast-member-list" aria-label={`Cast filed for ${movie.title}`}>
        {completedActors.map((actor) => (
          <span className="cast-member-tag" key={actor.actorId}>
            <i aria-hidden="true">✓</i>{actor.actorName}
          </span>
        ))}
        {Array.from({ length: Math.max(0, movie.cast.length - completedActors.length) }, (_, index) => (
          <span className="cast-member-tag is-empty" aria-hidden="true" key={`empty-${index}`}><i>□</i>•••</span>
        ))}
      </div>

      {feedback === "completing" ? (
        <div className="cast-complete-stamp" role="status">{movie.completionLabel ?? "CAST COMPLETE"}</div>
      ) : null}
    </section>
  );
}

export function CameraFlash({ serial }: { serial: number }) {
  return <div className="cast-camera-flash" data-flash={serial} aria-hidden="true" />;
}
