"use client";

import {
  forwardRef,
  memo,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import worldMapData from "../data/world-map-countries.json";
import {
  MAP_VIEWBOX_HEIGHT,
  MAP_VIEWBOX_WIDTH,
  WORLD_MAP_TRANSFORM,
  centerMapOnPoint,
  clampMapTransform,
  clientPointToViewPoint,
  clientPointToMapPoint,
  fittedMapViewport,
  nearestSmallCountry,
  viewPointToClientPoint,
  zoomMapAroundPoint,
  type MapPoint,
  type MapTransform,
} from "../data/cinema-map-viewport";

export type WorldCountry = {
  id: string;
  iso2: string | null;
  iso3: string | null;
  name: string;
  continent: string;
  region: string;
  labelRank: number;
  x: number;
  y: number;
  tiny: boolean;
  pointOnly?: boolean;
  path: string;
};

const WORLD_COUNTRIES = (worldMapData as unknown as { countries: WorldCountry[] }).countries;
const WORLD_COUNTRY_BY_ID = new Map(WORLD_COUNTRIES.map((country) => [country.id, country] as const));
const EXTRA_FORGIVING_COUNTRIES = new Set(["BE", "CZ", "DK", "GR", "HK", "IL", "KR", "LB", "LU", "NL", "SG", "XK"]);
const INTERACTIVE_CENTROIDS = WORLD_COUNTRIES.map((country) => ({
  id: country.id,
  x: country.x,
  y: country.y,
  tiny: country.tiny || EXTRA_FORGIVING_COUNTRIES.has(country.id),
}));

export const CINEMA_MAP_REGIONS = [
  { id: "north-america", label: "N. America", point: { x: 222, y: 132 }, scale: 2.15, radiusX: 92, radiusY: 78 },
  { id: "south-america", label: "S. America", point: { x: 337, y: 303 }, scale: 2.3, radiusX: 58, radiusY: 88 },
  { id: "europe", label: "Europe", point: { x: 532, y: 112 }, scale: 3.65, radiusX: 55, radiusY: 39 },
  { id: "africa", label: "Africa", point: { x: 548, y: 255 }, scale: 2.45, radiusX: 72, radiusY: 82 },
  { id: "middle-east", label: "Middle East", point: { x: 628, y: 180 }, scale: 3.55, radiusX: 50, radiusY: 33 },
  { id: "asia", label: "Asia", point: { x: 772, y: 155 }, scale: 2.25, radiusX: 142, radiusY: 83 },
  { id: "oceania", label: "Oceania", point: { x: 884, y: 327 }, scale: 2.7, radiusX: 92, radiusY: 62 },
] as const;

type RegionId = (typeof CINEMA_MAP_REGIONS)[number]["id"];

export type CinemaMapFeedback = { countryId: string; kind: "correct" | "wrong" | "revealed" } | null;

export type CinemaWorldMapHandle = {
  countryAtClientPoint: (clientX: number, clientY: number) => string | null;
  regionAtClientPoint: (clientX: number, clientY: number) => RegionId | null;
  countryClientPoint: (countryId: string) => MapPoint | null;
  zoomToRegion: (regionId: RegionId) => void;
  resetView: () => void;
};

type Gesture = {
  mode: "pan" | "pinch";
  startTransform: MapTransform;
  startPointers: Map<number, MapPoint>;
  moved: boolean;
};

function midpoint(first: MapPoint, second: MapPoint): MapPoint {
  return { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
}

function distance(first: MapPoint, second: MapPoint) {
  return Math.hypot(second.x - first.x, second.y - first.y);
}

const CountryLayer = memo(function CountryLayer({
  feedback,
  hoveredCountryId,
  markerCounts,
  showLabels,
}: {
  feedback: CinemaMapFeedback;
  hoveredCountryId: string | null;
  markerCounts: Readonly<Record<string, number>>;
  showLabels: boolean;
}) {
  return (
    <>
      <g className="cinema-country-layer">
        {WORLD_COUNTRIES.map((country) => {
          const feedbackKind = feedback?.countryId === country.id ? feedback.kind : null;
          const markerCount = markerCounts[country.id] ?? 0;
          return country.pointOnly ? (
            <circle
              cx={country.x}
              cy={country.y}
              r="1.25"
              className={`cinema-country cinema-country-point${hoveredCountryId === country.id ? " is-hovered" : ""}${feedbackKind ? ` is-${feedbackKind}` : ""}${markerCount ? " is-visited" : ""}`}
              data-country-id={country.id}
              role="img"
              aria-label={country.name}
              key={country.id}
            >
              <title>{country.name}</title>
            </circle>
          ) : (
            <path
              d={country.path}
              className={`cinema-country${hoveredCountryId === country.id ? " is-hovered" : ""}${feedbackKind ? ` is-${feedbackKind}` : ""}${markerCount ? " is-visited" : ""}`}
              data-country-id={country.id}
              role="img"
              aria-label={country.name}
              key={country.id}
            >
              <title>{country.name}</title>
            </path>
          );
        })}
      </g>
      {showLabels ? (
        <g className="cinema-country-labels" aria-hidden="true">
          {WORLD_COUNTRIES.filter((country) => country.labelRank <= 4).map((country) => (
            <text x={country.x} y={country.y} key={country.id}>{country.name}</text>
          ))}
        </g>
      ) : null}
      <g className="cinema-map-markers" aria-hidden="true">
        {Object.entries(markerCounts).map(([countryId, count]) => {
          const country = WORLD_COUNTRY_BY_ID.get(countryId);
          if (!country) return null;
          return (
            <g transform={`translate(${country.x} ${country.y})`} key={countryId}>
              <circle r="7" />
              <path d="M-3.8 -1.8h7.6v5.6h-7.6zM-2.6 -3.6h1.7v1.8h-1.7zM.9 -3.6h1.7v1.8h-1.7z" />
              {count > 1 ? <text x="7" y="-5">×{count}</text> : null}
            </g>
          );
        })}
      </g>
    </>
  );
});

export const CinemaWorldMap = forwardRef<CinemaWorldMapHandle, {
  disabled?: boolean;
  feedback: CinemaMapFeedback;
  hoveredCountryId: string | null;
  markerCounts: Readonly<Record<string, number>>;
  onCountrySelect: (countryId: string) => void;
  onStatus?: (message: string) => void;
}>(function CinemaWorldMap({ disabled = false, feedback, hoveredCountryId, markerCounts, onCountrySelect, onStatus }, ref) {
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<SVGGElement | null>(null);
  const smoothTimerRef = useRef<number | null>(null);
  const transformRef = useRef<MapTransform>(WORLD_MAP_TRANSFORM);
  const pointersRef = useRef(new Map<number, MapPoint>());
  const gestureRef = useRef<Gesture | null>(null);
  const [transform, setTransform] = useState<MapTransform>(WORLD_MAP_TRANSFORM);
  const [countrySearch, setCountrySearch] = useState("");

  const countryByName = useMemo(() => new Map(WORLD_COUNTRIES.map((country) => [country.name.toLocaleLowerCase(), country.id] as const)), []);
  const displayTransform = (next: MapTransform, commit = true, smooth = false) => {
    const clamped = clampMapTransform(next);
    transformRef.current = clamped;
    const viewport = viewportRef.current;
    if (viewport) {
      if (smooth) {
        viewport.classList.add("is-smoothing");
        void viewport.getBoundingClientRect();
        if (smoothTimerRef.current) window.clearTimeout(smoothTimerRef.current);
        smoothTimerRef.current = window.setTimeout(() => viewport.classList.remove("is-smoothing"), 420);
      } else viewport.classList.remove("is-smoothing");
      viewport.setAttribute("transform", `translate(${clamped.x} ${clamped.y}) scale(${clamped.scale})`);
    }
    if (commit) setTransform(clamped);
  };

  const zoomToRegion = (regionId: RegionId) => {
    const region = CINEMA_MAP_REGIONS.find((candidate) => candidate.id === regionId);
    if (!region) return;
    displayTransform(centerMapOnPoint(region.point, region.scale), true, true);
    onStatus?.(`${region.label} enlarged. Choose a country, or keep exploring the map.`);
  };

  const resetView = () => {
    displayTransform(WORLD_MAP_TRANSFORM, true, true);
    onStatus?.("World view restored.");
  };

  const elementCountryAtPoint = (clientX: number, clientY: number) => {
    const element = document.elementsFromPoint(clientX, clientY)
      .find((candidate) => candidate instanceof SVGElement && candidate.dataset.countryId) as SVGElement | undefined;
    return element?.dataset.countryId ?? null;
  };

  const countryAtClientPoint = (clientX: number, clientY: number) => {
    const exact = elementCountryAtPoint(clientX, clientY);
    if (exact) return exact;
    const surface = surfaceRef.current;
    if (!surface) return null;
    const rect = surface.getBoundingClientRect();
    const viewport = fittedMapViewport(rect);
    const mapPoint = clientPointToMapPoint({ x: clientX, y: clientY }, rect, transformRef.current);
    return nearestSmallCountry(mapPoint, INTERACTIVE_CENTROIDS, transformRef.current.scale, 22, viewport.pixelsPerViewUnit);
  };

  const regionAtClientPoint = (clientX: number, clientY: number) => {
    const element = document.elementsFromPoint(clientX, clientY)
      .find((candidate) => candidate instanceof SVGElement && candidate.dataset.regionId) as SVGElement | undefined;
    return (element?.dataset.regionId as RegionId | undefined) ?? null;
  };

  useImperativeHandle(ref, () => ({
    countryAtClientPoint,
    regionAtClientPoint,
    countryClientPoint: (countryId) => {
      const country = WORLD_COUNTRY_BY_ID.get(countryId);
      const surface = surfaceRef.current;
      if (!country || !surface) return null;
      const rect = surface.getBoundingClientRect();
      const current = transformRef.current;
      return viewPointToClientPoint({
        x: country.x * current.scale + current.x,
        y: country.y * current.scale + current.y,
      }, rect);
    },
    zoomToRegion,
    resetView,
  }));

  const startGesture = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 && event.pointerType === "mouse") return;
    if ((event.target as Element).closest(".cinema-zoom-controls")) return;
    event.preventDefault();
    viewportRef.current?.classList.remove("is-smoothing");
    event.currentTarget.setPointerCapture(event.pointerId);
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const startPointers = new Map(pointersRef.current);
    gestureRef.current = {
      mode: startPointers.size >= 2 ? "pinch" : "pan",
      startTransform: transformRef.current,
      startPointers,
      moved: startPointers.size >= 2,
    };
  };

  const moveGesture = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.has(event.pointerId)) return;
    event.preventDefault();
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const gesture = gestureRef.current;
    const surface = surfaceRef.current;
    if (!gesture || !surface) return;
    const rect = surface.getBoundingClientRect();
    const currentPointers = [...pointersRef.current.values()];
    const startPointers = [...gesture.startPointers.values()];

    if (currentPointers.length >= 2 && startPointers.length >= 2) {
      gesture.mode = "pinch";
      gesture.moved = true;
      const startMid = midpoint(startPointers[0], startPointers[1]);
      const currentMid = midpoint(currentPointers[0], currentPointers[1]);
      const startDistance = Math.max(1, distance(startPointers[0], startPointers[1]));
      const scale = gesture.startTransform.scale * (distance(currentPointers[0], currentPointers[1]) / startDistance);
      const viewport = fittedMapViewport(rect);
      const startFocus = clientPointToViewPoint(startMid, rect);
      const zoomed = zoomMapAroundPoint(gesture.startTransform, scale, startFocus);
      const deltaX = (currentMid.x - startMid.x) / viewport.pixelsPerViewUnit;
      const deltaY = (currentMid.y - startMid.y) / viewport.pixelsPerViewUnit;
      displayTransform({ ...zoomed, x: zoomed.x + deltaX, y: zoomed.y + deltaY }, false);
      return;
    }

    const start = startPointers[0];
    const current = currentPointers[0];
    if (!start || !current) return;
    const deltaClientX = current.x - start.x;
    const deltaClientY = current.y - start.y;
    const viewport = fittedMapViewport(rect);
    if (Math.hypot(deltaClientX, deltaClientY) > 5) gesture.moved = true;
    displayTransform({
      ...gesture.startTransform,
      x: gesture.startTransform.x + deltaClientX / viewport.pixelsPerViewUnit,
      y: gesture.startTransform.y + deltaClientY / viewport.pixelsPerViewUnit,
    }, false);
  };

  const finishGesture = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.has(event.pointerId)) return;
    const gesture = gestureRef.current;
    const wasSingleTap = gesture?.mode === "pan" && !gesture.moved && pointersRef.current.size === 1;
    pointersRef.current.delete(event.pointerId);
    displayTransform(transformRef.current);

    if (wasSingleTap && !disabled) {
      const regionId = transformRef.current.scale <= 1.2 ? regionAtClientPoint(event.clientX, event.clientY) : null;
      if (regionId) zoomToRegion(regionId);
      else {
        const countryId = countryAtClientPoint(event.clientX, event.clientY);
        if (countryId) onCountrySelect(countryId);
      }
    }

    if (pointersRef.current.size === 1) {
      gestureRef.current = {
        mode: "pan",
        startTransform: transformRef.current,
        startPointers: new Map(pointersRef.current),
        moved: true,
      };
    } else if (pointersRef.current.size === 0) gestureRef.current = null;
  };

  const cancelGesture = () => {
    pointersRef.current.clear();
    gestureRef.current = null;
    displayTransform(transformRef.current);
  };

  const handleWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const surface = surfaceRef.current;
    if (!surface) return;
    const rect = surface.getBoundingClientRect();
    const focus = clientPointToViewPoint({ x: event.clientX, y: event.clientY }, rect);
    const factor = Math.exp(-event.deltaY * 0.0014);
    displayTransform(zoomMapAroundPoint(transformRef.current, transformRef.current.scale * factor, focus));
  };

  const submitSearch = () => {
    const countryId = countryByName.get(countrySearch.trim().toLocaleLowerCase());
    if (!countryId || disabled) {
      onStatus?.("Choose a country name from the search suggestions first.");
      return;
    }
    onCountrySelect(countryId);
  };

  return (
    <section className="cinema-map-panel" aria-label="Interactive world cinema map" inert={disabled}>
      <nav className="cinema-region-nav" aria-label="Map region shortcuts">
        <button type="button" onClick={resetView} className={transform.scale <= 1.05 ? "is-active" : ""}>World</button>
        {CINEMA_MAP_REGIONS.map((region) => (
          <button type="button" onClick={() => zoomToRegion(region.id)} key={region.id}>{region.label}</button>
        ))}
      </nav>
      <div
        className="cinema-map-viewport"
        ref={surfaceRef}
        onPointerDown={startGesture}
        onPointerMove={moveGesture}
        onPointerUp={finishGesture}
        onPointerCancel={cancelGesture}
        onLostPointerCapture={() => pointersRef.current.size === 0 && cancelGesture()}
        onWheel={handleWheel}
      >
        <svg viewBox={`0 0 ${MAP_VIEWBOX_WIDTH} ${MAP_VIEWBOX_HEIGHT}`} role="img" aria-label="World map. Pan, zoom, or tap a country to place the current movie.">
          <defs>
            <pattern id="cinema-map-grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" /></pattern>
          </defs>
          <rect width={MAP_VIEWBOX_WIDTH} height={MAP_VIEWBOX_HEIGHT} className="cinema-map-ocean" />
          <rect width={MAP_VIEWBOX_WIDTH} height={MAP_VIEWBOX_HEIGHT} fill="url(#cinema-map-grid)" className="cinema-map-grid-lines" />
          <g ref={viewportRef} className="cinema-map-transform">
            <CountryLayer feedback={feedback} hoveredCountryId={hoveredCountryId} markerCounts={markerCounts} showLabels={transform.scale >= 2.35} />
            {transform.scale <= 1.2 ? (
              <g className="cinema-region-hotspots">
                {CINEMA_MAP_REGIONS.map((region) => (
                  <g data-region-id={region.id} transform={`translate(${region.point.x} ${region.point.y})`} key={region.id}>
                    <ellipse rx={region.radiusX} ry={region.radiusY} />
                    <text>{region.label}</text>
                  </g>
                ))}
              </g>
            ) : null}
          </g>
        </svg>
        <div className="cinema-zoom-controls" aria-label="Map zoom controls">
          <button type="button" aria-label="Zoom in" onClick={() => displayTransform(zoomMapAroundPoint(transformRef.current, transformRef.current.scale * 1.45, { x: 500, y: 250 }), true, true)}>+</button>
          <output aria-label="Current map zoom">{Math.round(transform.scale * 100)}%</output>
          <button type="button" aria-label="Zoom out" onClick={() => displayTransform(zoomMapAroundPoint(transformRef.current, transformRef.current.scale / 1.45, { x: 500, y: 250 }), true, true)}>−</button>
          <button type="button" className="is-world" onClick={resetView}>World view</button>
        </div>
        <div className="cinema-map-compass" aria-hidden="true"><i>N</i><span /></div>
      </div>
      <details className="cinema-country-search">
        <summary>Choose country by name</summary>
        <div>
          <label htmlFor="cinema-country-choice">Accessible country search</label>
          <input id="cinema-country-choice" list="cinema-country-options" value={countrySearch} onChange={(event) => setCountrySearch(event.target.value)} />
          <datalist id="cinema-country-options">{WORLD_COUNTRIES.map((country) => <option value={country.name} key={country.id} />)}</datalist>
          <button type="button" onClick={submitSearch} disabled={disabled}>Stamp country</button>
        </div>
      </details>
    </section>
  );
});

export function CinemaJourneyMap({ visitedCountryCounts }: { visitedCountryCounts: Readonly<Record<string, number>> }) {
  return (
    <div className="cinema-journey-map" aria-label={`Cinema journey across ${Object.keys(visitedCountryCounts).length} countries`}>
      <svg viewBox={`0 0 ${MAP_VIEWBOX_WIDTH} ${MAP_VIEWBOX_HEIGHT}`} role="img" aria-label="World map highlighting countries visited during the round">
        <rect width={MAP_VIEWBOX_WIDTH} height={MAP_VIEWBOX_HEIGHT} className="cinema-map-ocean" />
        {WORLD_COUNTRIES.map((country) => (
          country.pointOnly
            ? <circle cx={country.x} cy={country.y} r="1.25" className={`cinema-country cinema-country-point${visitedCountryCounts[country.id] ? " is-visited" : ""}`} aria-label={country.name} key={country.id} />
            : <path d={country.path} className={`cinema-country${visitedCountryCounts[country.id] ? " is-visited" : ""}`} aria-label={country.name} key={country.id} />
        ))}
        {Object.entries(visitedCountryCounts).map(([countryId, count]) => {
          const country = WORLD_COUNTRY_BY_ID.get(countryId);
          return country ? <g className="cinema-journey-pin" transform={`translate(${country.x} ${country.y})`} key={countryId}><circle r="8" /><text x="10" y="-7">{count > 1 ? `×${count}` : "★"}</text></g> : null;
        })}
      </svg>
    </div>
  );
}

export function cinemaCountryName(countryId: string) {
  return WORLD_COUNTRY_BY_ID.get(countryId)?.name ?? countryId;
}
