"use client";

import { createPortal } from "react-dom";
import type { CSSProperties } from "react";

export type DirectorArrivalEvent = {
  id: string;
  directorName: string;
  initials: string;
  startX: number;
  startY: number;
  arcX: number;
  arcY: number;
  approachX: number;
  approachY: number;
  endX: number;
  endY: number;
  width: number;
  height: number;
};

type ArrivalStyle = CSSProperties & Record<`--arrival-${string}`, string>;

export function DirectorArrivalFx({ event }: { event: DirectorArrivalEvent | null }) {
  if (!event || typeof document === "undefined") return null;

  const style: ArrivalStyle = {
    "--arrival-start-x": `${event.startX}px`,
    "--arrival-start-y": `${event.startY}px`,
    "--arrival-arc-x": `${event.arcX}px`,
    "--arrival-arc-y": `${event.arcY}px`,
    "--arrival-approach-x": `${event.approachX}px`,
    "--arrival-approach-y": `${event.approachY}px`,
    "--arrival-end-x": `${event.endX}px`,
    "--arrival-end-y": `${event.endY}px`,
    "--arrival-width": `${event.width}px`,
    "--arrival-height": `${event.height}px`,
  };

  return createPortal(
    <div className="director-arrival-flight" style={style} aria-hidden="true" key={event.id}>
      <div className="director-arrival-card">
        <span className="director-arrival-portrait">{event.initials}</span>
        <span className="director-arrival-copy"><small>Incoming director</small><strong>{event.directorName}</strong></span>
        <span className="director-arrival-sockets"><i /><i /><i /></span>
        <b className="director-arrival-speedline" />
      </div>
    </div>,
    document.body,
  );
}
