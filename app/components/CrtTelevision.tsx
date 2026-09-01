"use client";

import type { ReactNode } from "react";

type CrtTelevisionProps = {
  children: ReactNode;
  console: ReactNode;
  controls: ReactNode;
  crtEnabled: boolean;
  status: string;
};

export function CrtTelevision({ children, console, controls, crtEnabled, status }: CrtTelevisionProps) {
  return (
    <main className="director-game" data-crt={crtEnabled ? "on" : "off"}>
      <div className="tv-aerial" aria-hidden="true"><i /><i /></div>
      <section className="crt-tv" aria-label="The Director Game arcade cabinet">
        <header className="crt-top-bezel">
          <div className="tv-brand-block">
            <span className="tv-live-light" aria-hidden="true" />
            <div>
              <p>Zero Guilt Home Video System</p>
              <h1>The Director Game</h1>
            </div>
          </div>
          <div className="tv-marquee" role="status" aria-live="polite">
            <span>Now transmitting</span>
            <strong>{status}</strong>
          </div>
          <div className="tv-model" aria-hidden="true">DG–1997<br /><b>COLOR</b></div>
        </header>

        <div className="crt-middle">
          <div className="crt-screen-frame">
            <div className="crt-screen">
              <div className="crt-content">{children}</div>
              <div className="crt-glass" aria-hidden="true" />
              <div className="crt-scanlines" aria-hidden="true" />
              <div className="crt-vignette" aria-hidden="true" />
            </div>
          </div>
          <aside className="crt-console" aria-label="Game console">{console}</aside>
        </div>

        <footer className="crt-bottom-bezel">
          <div className="speaker-grille" aria-hidden="true">
            {Array.from({ length: 28 }, (_, index) => <i key={index} />)}
          </div>
          <div className="bezel-controls">{controls}</div>
          <div className="channel-knobs" aria-hidden="true"><i /><i /></div>
        </footer>
        <div className="tv-feet" aria-hidden="true"><i /><i /></div>
      </section>
    </main>
  );
}
