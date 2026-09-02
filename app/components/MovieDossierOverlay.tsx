"use client";

/* eslint-disable @next/next/no-img-element -- frame evidence uses YouTube thumbnails or Wikimedia Commons */

import { useEffect, useRef, useState } from "react";
import type { Director, Film } from "../data/directors";
import { GAME_CONFIG, type MovieRuntime } from "../data/game-engine";

const frameCache = new Map<string, string[]>();

function useEvidenceFrame(film: Film, enabled: boolean) {
  const trailerFrame = film.youtubeId ? [`https://i.ytimg.com/vi/${film.youtubeId}/mq1.jpg`] : [];
  const cached = frameCache.get(film.id);
  const [searchedFrames, setSearchedFrames] = useState<string[]>(cached ?? []);
  const [loading, setLoading] = useState(enabled && !film.youtubeId && !cached);

  useEffect(() => {
    if (!enabled || film.youtubeId || frameCache.has(film.id)) return;
    const controller = new AbortController();
    const parameters = new URLSearchParams({
      action: "query",
      format: "json",
      origin: "*",
      generator: "search",
      gsrsearch: `${film.title} ${film.year} film`,
      gsrnamespace: "6",
      gsrlimit: "6",
      prop: "imageinfo",
      iiprop: "url",
      iiurlwidth: "1200",
    });

    void fetch(`https://commons.wikimedia.org/w/api.php?${parameters}`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("Frame search failed")))
      .then((payload: { query?: { pages?: Record<string, { imageinfo?: Array<{ thumburl?: string; url?: string }> }> } }) => {
        const found = Object.values(payload.query?.pages ?? {})
          .flatMap((page) => page.imageinfo ?? [])
          .map((image) => image.thumburl ?? image.url)
          .find((url): url is string => Boolean(url && /\.(?:jpe?g|png|webp)(?:\?|$)/i.test(url)));
        const frames = found ? [found] : [];
        frameCache.set(film.id, frames);
        setSearchedFrames(frames);
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) frameCache.set(film.id, []);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [enabled, film.id, film.title, film.year, film.youtubeId]);

  return { frame: trailerFrame[0] ?? searchedFrames[0], loading };
}

function LockedBlock({ label, detail }: { label: string; detail: string }) {
  return <div className="dossier-placeholder"><b>{label}</b><span>{detail}</span><small>Buy this clue in the Hint Shop</small></div>;
}

type MovieDossierOverlayProps = {
  film: Film;
  runtime: MovieRuntime;
  activeDirectors: Array<Director | null>;
  onClose: () => void;
};

export function MovieDossierOverlay({ film, runtime, activeDirectors, onClose }: MovieDossierOverlayProps) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const frameHint = runtime.hints.movieIdentification;
  const dateHint = runtime.hints.releaseDate;
  const noteHint = runtime.hints.verbalDirectorClue;
  const eliminationHint = runtime.hints.elimination;
  const answerHint = runtime.hints.directAnswer;
  const { frame, loading } = useEvidenceFrame(film, Boolean(frameHint));
  const crossedOutIds = new Set(eliminationHint?.eliminatedDirectorIds ?? (eliminationHint?.eliminatedDirectorId ? [eliminationHint.eliminatedDirectorId] : []));
  const purchasedCount = [frameHint, dateHint, noteHint, eliminationHint, answerHint].filter(Boolean).length;
  const titleId = `movie-dossier-title-${film.id}`;

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "Tab") {
        event.preventDefault();
        closeButtonRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    closeButtonRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, [onClose]);

  return (
    <div className="dossier-layer" onPointerDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="movie-dossier" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className="dossier-heading">
          <span>Movie evidence file · {purchasedCount}/5 clues filed</span>
          <h2 id={titleId}>{film.title}</h2>
          <p>{film.genre} · {dateHint ? film.year : "release date locked"}</p>
        </header>

        <div className="dossier-grid">
          <article className={`dossier-block dossier-frame ${frameHint ? "is-owned" : "is-locked"}`}>
            <header><span aria-hidden="true">▣</span><div><b>Frame check</b><small>{frameHint ? "Evidence filed" : `${GAME_CONFIG.hintCosts.movieIdentification} coins`}</small></div></header>
            {frameHint ? (
              <div className="dossier-frame-view">
                {loading ? <strong>Loading frame…</strong> : frame ? <img src={frame} alt={`${film.title} production frame`} decoding="async" draggable={false} /> : <strong>Frame signal unavailable</strong>}
                <p>{frameHint.content}</p>
              </div>
            ) : <LockedBlock label="Image placeholder" detail="One production frame will appear here." />}
          </article>

          <article className={`dossier-block dossier-date ${dateHint ? "is-owned" : "is-locked"}`}>
            <header><span aria-hidden="true">#</span><div><b>Release date</b><small>{dateHint ? "Evidence filed" : `${GAME_CONFIG.hintCosts.releaseDate} coins`}</small></div></header>
            {dateHint ? <div className="dossier-date-value"><strong>{film.year}</strong><p>{dateHint.content}</p></div> : <LockedBlock label="????" detail="The release year is hidden." />}
          </article>

          <article className={`dossier-block dossier-note ${noteHint ? "is-owned" : "is-locked"}`}>
            <header><span aria-hidden="true">≡</span><div><b>Director note</b><small>{noteHint ? "Evidence filed" : `${GAME_CONFIG.hintCosts.verbalDirectorClue} coins`}</small></div></header>
            {noteHint ? <blockquote>{noteHint.content}</blockquote> : <LockedBlock label="Text block" detail="A related directing credit will appear here." />}
          </article>

          <article className={`dossier-block dossier-elimination ${eliminationHint ? "is-owned" : "is-locked"}`}>
            <header><span aria-hidden="true">×</span><div><b>Cross one out</b><small>{eliminationHint ? `${eliminationHint.purchaseCount ?? 1} filed` : `${GAME_CONFIG.eliminationHintCosts[0]} coins`}</small></div></header>
            <div className="dossier-director-row" aria-label="Current Director candidates">
              {Array.from({ length: GAME_CONFIG.maximumActiveDirectors }, (_, index) => {
                const director = activeDirectors[index];
                const eliminated = Boolean(director && crossedOutIds.has(director.id));
                return <span className={eliminated ? "is-crossed-out" : director ? "is-candidate" : "is-empty"} key={director?.id ?? `candidate-${index}`}><b>{index + 1}</b><small>{director?.name ?? "Empty"}</small>{eliminated ? <i>×</i> : null}</span>;
              })}
            </div>
            {eliminationHint ? <p>{eliminationHint.content}</p> : <div className="dossier-inline-placeholder">Ruled-out Directors will be marked here and on the board.</div>}
          </article>

          <article className={`dossier-block dossier-answer ${answerHint ? "is-owned" : "is-locked"}`}>
            <header><span aria-hidden="true">!</span><div><b>Emergency answer</b><small>{answerHint ? "Evidence filed" : `${GAME_CONFIG.hintCosts.directAnswer} coins · no move`}</small></div></header>
            {answerHint ? <div className="dossier-answer-value"><strong>{answerHint.content}</strong><small>No move was spent. Match score remains reduced.</small></div> : <LockedBlock label="Answer sealed" detail="Reveal the correct Director without spending a move." />}
          </article>

          <article className="dossier-block dossier-trailer">
            <header><span aria-hidden="true">▶</span><div><b>Trailer evidence</b><small>Always available</small></div></header>
            {film.youtubeId ? <iframe src={`https://www.youtube-nocookie.com/embed/${film.youtubeId}?rel=0`} title={`${film.title} official trailer`} allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /> : <div className="dossier-inline-placeholder">Trailer signal unavailable for this movie.</div>}
          </article>
        </div>

        <button className="dossier-close" ref={closeButtonRef} type="button" onClick={onClose} aria-label={`Close the movie file for ${film.title}`}><b aria-hidden="true">×</b><span>Close file</span></button>
      </section>
    </div>
  );
}
