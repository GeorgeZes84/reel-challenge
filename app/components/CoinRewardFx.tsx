"use client";

import type { CSSProperties } from "react";

export const COIN_FLIGHT_MS = 760;
export const COIN_STAGGER_MS = 95;
export const COIN_WALLET_DELAY_MS = 620;

export type CoinRewardEvent = {
  id: number;
  amount: number;
  startX: number;
  startY: number;
  targetY: number;
  bonusAmount?: number;
  multiplier?: number;
};

export function coinRewardLifetime(amount: number, hasComboBonus = false) {
  return COIN_FLIGHT_MS + Math.max(0, amount - 1) * COIN_STAGGER_MS + 320 + (hasComboBonus ? 450 : 0);
}

export function CoinRewardLayer({ events }: { events: readonly CoinRewardEvent[] }) {
  if (events.length === 0) return null;

  return (
    <div className="coin-reward-layer" aria-hidden="true">
      {events.map((event) => (
        <div
          className="coin-reward-event"
          style={{
            "--coin-start-x": `${event.startX}%`,
            "--coin-start-y": `${event.startY}%`,
            "--coin-target-y": `${event.targetY}%`,
          } as CSSProperties}
          key={event.id}
        >
          {Array.from({ length: event.amount }, (_, index) => (
            <i
              className="coin-flight"
              style={{ "--coin-delay": `${index * COIN_STAGGER_MS}ms` } as CSSProperties}
              key={`${event.id}-${index}`}
            ><span>●</span></i>
          ))}
          <span className="coin-reward-summary">
            +{event.amount} COINS
            {event.bonusAmount ? <b>+{event.bonusAmount} FROM ×{event.multiplier ?? 1}</b> : null}
          </span>
        </div>
      ))}
    </div>
  );
}

export function CoinWalletEffects({ events }: { events: readonly CoinRewardEvent[] }) {
  if (events.length === 0) return null;

  return (
    <span className="coin-wallet-effects" aria-hidden="true">
      {events.map((event) => (
        <span className="coin-wallet-event" key={event.id}>
          {Array.from({ length: event.amount }, (_, index) => (
            <i
              className="coin-wallet-pop"
              style={{
                "--coin-pop-delay": `${COIN_WALLET_DELAY_MS + index * COIN_STAGGER_MS}ms`,
              } as CSSProperties}
              key={`${event.id}-wallet-${index}`}
            ><b>+1</b></i>
          ))}
          {event.bonusAmount ? (
            <i className="coin-combo-pop" style={{ "--coin-pop-delay": `${COIN_WALLET_DELAY_MS + event.amount * COIN_STAGGER_MS}ms` } as CSSProperties}>
              +{event.bonusAmount} COMBO
            </i>
          ) : null}
        </span>
      ))}
    </span>
  );
}
