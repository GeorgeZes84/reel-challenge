import type { CSSProperties } from "react";

type CompletionArchiveSequenceProps = {
  directorName: string;
  filmTitles: string[];
};

const TICKET_ENTRANCES = [
  { x: "-190px", y: "-92px", rotation: "-13deg" },
  { x: "0px", y: "-132px", rotation: "5deg" },
  { x: "190px", y: "-88px", rotation: "14deg" },
] as const;

export function CompletionArchiveSequence({ directorName, filmTitles }: CompletionArchiveSequenceProps) {
  return (
    <div className="archive-sequence" role="status" aria-live="polite">
      <div className="archive-sequence-copy">
        <span>3 films matched</span>
        <strong>{directorName}</strong>
      </div>

      <div className="archive-ticket-stage" aria-hidden="true">
        {filmTitles.slice(0, 3).map((title, index) => {
          const entrance = TICKET_ENTRANCES[index] ?? TICKET_ENTRANCES[1];
          return (
            <i
              className="archive-ticket"
              style={{
                "--archive-index": index,
                "--archive-start-x": entrance.x,
                "--archive-start-y": entrance.y,
                "--archive-start-rotate": entrance.rotation,
                "--archive-stack-y": `${index * 7}px`,
                "--archive-compress-y": `${index * 2.5}px`,
                "--archive-stack-rotate": `${(index - 1) * 2.5}deg`,
              } as CSSProperties}
              key={`${title}-${index}`}
            >
              <b>{String(index + 1).padStart(2, "0")}</b>
              <span>{title}</span>
            </i>
          );
        })}
        <em className="archive-punch-mark">ARCHIVED</em>
      </div>

      <small>To Victory Area →</small>
    </div>
  );
}
