"use client";

import { useEffect, useRef, type CSSProperties } from "react";

export const GAME_TITLE = "CineRuckus";
export const GAME_TAGLINE = "The movie-night game show";

export type GameMenuView = "home" | "select";
export type GameSelection = "director" | "timeline" | "cast-call";

const GAME_OPTIONS: Array<{
  id: GameSelection;
  number: string;
  title: string;
  description: string;
  skill: string;
  accent: string;
}> = [
  {
    id: "director",
    number: "01",
    title: "Find the Director",
    description: "Match movie tickets to the filmmaker behind them.",
    skill: "Deduction · Drag & drop",
    accent: "#c7f45b",
  },
  {
    id: "timeline",
    number: "02",
    title: "Release Timeline",
    description: "Put cinema history in the correct chronological order.",
    skill: "Dates · Global cinema",
    accent: "#61eee0",
  },
  {
    id: "cast-call",
    number: "03",
    title: "Cast Call",
    description: "Match each actor to the movie where they belong.",
    skill: "Recognition · Fast flow",
    accent: "#ff6fb3",
  },
];

export function GameMenu({
  view,
  onNewRun,
  onOpenSelect,
  onBack,
  onLaunch,
}: {
  view: GameMenuView;
  onNewRun: () => void;
  onOpenSelect: () => void;
  onBack: () => void;
  onLaunch: (game: GameSelection) => void;
}) {
  const newRunRef = useRef<HTMLButtonElement | null>(null);
  const selectHeadingRef = useRef<HTMLHeadingElement | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (view === "home") newRunRef.current?.focus({ preventScroll: true });
      else selectHeadingRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [view]);

  useEffect(() => {
    if (view !== "select") return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onBack();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onBack, view]);

  if (view === "select") {
    return (
      <section className="game-menu game-select-menu" aria-labelledby="game-select-title">
        <div className="menu-confetti" aria-hidden="true"><i /><i /><i /><i /><i /></div>
        <button type="button" className="menu-back-button" onClick={onBack}>← Main menu</button>
        <header className="game-select-heading">
          <span>Quick play · score starts fresh</span>
          <h2 id="game-select-title" ref={selectHeadingRef} tabIndex={-1}>Select a game</h2>
          <p>Skip straight to the mode you want to test. Every game launches as a clean standalone session.</p>
        </header>
        <div className="game-select-grid">
          {GAME_OPTIONS.map((option) => (
            <button
              type="button"
              className={`game-select-card mode-${option.id}`}
              style={{ "--menu-accent": option.accent } as CSSProperties}
              onClick={() => onLaunch(option.id)}
              key={option.id}
            >
              <span>Game {option.number}</span>
              <strong>{option.title}</strong>
              <small>{option.description}</small>
              <b>{option.skill}</b>
              <i aria-hidden="true">PLAY →</i>
            </button>
          ))}
        </div>
        <div className="next-premiere-tease"><span>More games are in production</span><b>Next premiere · coming soon</b></div>
      </section>
    );
  }

  return (
    <section className="game-menu game-home-menu" aria-labelledby="game-title">
      <div className="menu-confetti" aria-hidden="true"><i /><i /><i /><i /><i /></div>
      <div className="game-title-lockup">
        <span>Zero Guilt presents</span>
        <h2 id="game-title"><i>CINE</i><strong>RUCKUS!</strong></h2>
        <p>{GAME_TAGLINE}</p>
      </div>
      <div className="game-menu-actions">
        <button type="button" className="menu-action-button is-primary" ref={newRunRef} onClick={onNewRun}>
          <span><b>New run</b><small>Play the full lineup from the beginning</small></span><i aria-hidden="true">▶</i>
        </button>
        <button type="button" className="menu-action-button is-secondary" onClick={onOpenSelect}>
          <span><b>Select game</b><small>Jump straight to any game for quick play</small></span><i aria-hidden="true">03</i>
        </button>
      </div>
      <footer><span>Movie night, game on.</span><b>3 games online · more in production</b></footer>
    </section>
  );
}

export function GameMenuConsole({ view }: { view: GameMenuView }) {
  if (view === "select") {
    return (
      <>
        <section className="hud-panel menu-console-panel is-live"><span className="hud-label">Game library</span><strong>3 games online</strong><small>Choose any title for a fresh-score quick session.</small></section>
        <section className="hud-panel menu-lineup-panel"><span className="hud-label">Tonight&apos;s lineup</span>{GAME_OPTIONS.map((option) => <div key={option.id}><b>{option.number}</b><span>{option.title}</span></div>)}</section>
        <section className="hud-panel menu-console-note"><span className="hud-label">Quick play</span><p>Use this menu to test a mode without clearing the earlier games.</p></section>
      </>
    );
  }

  return (
    <>
      <section className="hud-panel menu-console-panel is-live"><span className="hud-label">Now showing</span><strong>CineRuckus!</strong><small>One movie universe. A growing lineup of different games.</small></section>
      <section className="hud-panel menu-console-panel"><span className="hud-label">New run</span><strong>Full lineup</strong><small>Your score carries from one movie challenge into the next.</small></section>
      <section className="hud-panel menu-console-panel"><span className="hud-label">Select game</span><strong>Quick play</strong><small>Jump directly to Director, Timeline, or Cast Call.</small></section>
    </>
  );
}
