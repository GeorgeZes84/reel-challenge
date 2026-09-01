"use client";

/* eslint-disable @next/next/no-img-element -- hint frames come from YouTube thumbnails or Wikimedia Commons */

import { useEffect, useRef, useState } from "react";
import type { Film } from "../data/directors";
import type { HintSticker, HintType } from "../data/game-engine";

export type VisualHintType = Extract<HintType, "movieIdentification" | "visualLanguage">;

const frameCache = new Map<string, string[]>();

function useVisualFrames(film: Film) {
  const trailerFrames = film.youtubeId
    ? [1, 2, 3].map((frame) => `https://i.ytimg.com/vi/${film.youtubeId}/mq${frame}.jpg`)
    : [];
  const cached = frameCache.get(film.id);
  const [searchedFrames, setSearchedFrames] = useState<string[]>(cached ?? []);
  const [loading, setLoading] = useState(!film.youtubeId && !cached);

  useEffect(() => {
    if (film.youtubeId || frameCache.has(film.id)) return;
    const controller = new AbortController();
    const parameters = new URLSearchParams({
      action: "query",
      format: "json",
      origin: "*",
      generator: "search",
      gsrsearch: `${film.title} ${film.year} film`,
      gsrnamespace: "6",
      gsrlimit: "8",
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
          .filter((url): url is string => Boolean(url && /\.(?:jpe?g|png|webp)(?:\?|$)/i.test(url)));
        const uniqueFrames = [...new Set(found)].slice(0, 3);
        const filledFrames = uniqueFrames.length > 0
          ? Array.from({ length: 3 }, (_, index) => uniqueFrames[index % uniqueFrames.length])
          : [];
        frameCache.set(film.id, filledFrames);
        setSearchedFrames(filledFrames);
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) frameCache.set(film.id, []);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [film.id, film.title, film.year, film.youtubeId]);

  return { frames: trailerFrames.length === 3 ? trailerFrames : searchedFrames, loading };
}

type VisualHintOverlayProps = {
  film: Film;
  sticker: HintSticker;
  type: VisualHintType;
  onClose: () => void;
};

export function VisualHintOverlay({ film, sticker, type, onClose }: VisualHintOverlayProps) {
  const { frames, loading } = useVisualFrames(film);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const shownFrames = type === "movieIdentification" ? frames.slice(0, 1) : frames.slice(0, 3);
  const titleId = `visual-hint-title-${film.id}`;

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "Tab") {
        event.preventDefault();
        closeButtonRef.current?.focus();
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus();
    return () => previousFocus?.focus();
  }, []);

  return (
    <div className="visual-hint-layer" onPointerDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className={`visual-hint-dialog is-${type}`} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className="visual-hint-heading">
          <span>Movie title</span>
          <h2 id={titleId}>{film.title}</h2>
          <p>{sticker.label}</p>
        </header>

        <div className={`visual-hint-content ${type === "movieIdentification" ? "is-frame-check" : "is-visual-dna"}`}>
          {loading ? <div className="visual-hint-loading"><i aria-hidden="true" /><strong>Loading inspection frames…</strong></div> : null}
          {!loading && shownFrames.length === 0 ? (
            <div className="visual-hint-unavailable"><b>NO FRAME SIGNAL</b><span>The archive image is unavailable. Your hint remains owned.</span></div>
          ) : null}
          {shownFrames.map((src, index) => (
            <figure key={`${src}-${index}`}>
              <img src={src} alt={`${film.title} inspection frame ${index + 1}`} decoding="async" draggable={false} />
              <figcaption>{type === "movieIdentification" ? "Primary frame" : `Visual sample ${index + 1}`}</figcaption>
            </figure>
          ))}
        </div>

        <footer className="visual-hint-caption">
          <span>{type === "movieIdentification" ? "FRAME CHECK" : "VISUAL DNA"}</span>
          <p>{sticker.content}</p>
        </footer>

        <button className="visual-hint-close" ref={closeButtonRef} type="button" onClick={onClose} aria-label={`Close ${sticker.label} for ${film.title}`}>
          <b aria-hidden="true">×</b><span>Close</span>
        </button>
      </section>
    </div>
  );
}
