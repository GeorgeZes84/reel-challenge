export const MAP_VIEWBOX_WIDTH = 1000;
export const MAP_VIEWBOX_HEIGHT = 500;
export const MAP_MIN_SCALE = 1;
export const MAP_MAX_SCALE = 7;

export type MapTransform = { scale: number; x: number; y: number };
export type MapPoint = { x: number; y: number };
export type CountryCentroid = { id: string; x: number; y: number; tiny?: boolean };
export type MapViewportMetrics = {
  left: number;
  top: number;
  width: number;
  height: number;
  pixelsPerViewUnit: number;
};

export const WORLD_MAP_TRANSFORM: MapTransform = { scale: 1, x: 0, y: 0 };

export function clampMapScale(scale: number) {
  return Math.min(MAP_MAX_SCALE, Math.max(MAP_MIN_SCALE, scale));
}

export function clampMapTransform(transform: MapTransform): MapTransform {
  const scale = clampMapScale(transform.scale);
  return {
    scale,
    x: Math.min(0, Math.max(MAP_VIEWBOX_WIDTH - MAP_VIEWBOX_WIDTH * scale, transform.x)),
    y: Math.min(0, Math.max(MAP_VIEWBOX_HEIGHT - MAP_VIEWBOX_HEIGHT * scale, transform.y)),
  };
}

export function zoomMapAroundPoint(transform: MapTransform, nextScale: number, focus: MapPoint): MapTransform {
  const scale = clampMapScale(nextScale);
  const mapX = (focus.x - transform.x) / transform.scale;
  const mapY = (focus.y - transform.y) / transform.scale;
  return clampMapTransform({
    scale,
    x: focus.x - mapX * scale,
    y: focus.y - mapY * scale,
  });
}

export function centerMapOnPoint(point: MapPoint, scale: number): MapTransform {
  return clampMapTransform({
    scale,
    x: MAP_VIEWBOX_WIDTH / 2 - point.x * scale,
    y: MAP_VIEWBOX_HEIGHT / 2 - point.y * scale,
  });
}

export function fittedMapViewport(
  rect: Pick<DOMRect, "left" | "top" | "width" | "height">,
): MapViewportMetrics {
  const pixelsPerViewUnit = Math.min(
    rect.width / MAP_VIEWBOX_WIDTH,
    rect.height / MAP_VIEWBOX_HEIGHT,
  );
  const width = MAP_VIEWBOX_WIDTH * pixelsPerViewUnit;
  const height = MAP_VIEWBOX_HEIGHT * pixelsPerViewUnit;
  return {
    left: rect.left + (rect.width - width) / 2,
    top: rect.top + (rect.height - height) / 2,
    width,
    height,
    pixelsPerViewUnit,
  };
}

export function clientPointToViewPoint(
  clientPoint: MapPoint,
  rect: Pick<DOMRect, "left" | "top" | "width" | "height">,
): MapPoint {
  const viewport = fittedMapViewport(rect);
  return {
    x: (clientPoint.x - viewport.left) / viewport.pixelsPerViewUnit,
    y: (clientPoint.y - viewport.top) / viewport.pixelsPerViewUnit,
  };
}

export function viewPointToClientPoint(
  viewPoint: MapPoint,
  rect: Pick<DOMRect, "left" | "top" | "width" | "height">,
): MapPoint {
  const viewport = fittedMapViewport(rect);
  return {
    x: viewport.left + viewPoint.x * viewport.pixelsPerViewUnit,
    y: viewport.top + viewPoint.y * viewport.pixelsPerViewUnit,
  };
}

export function clientPointToMapPoint(
  clientPoint: MapPoint,
  rect: Pick<DOMRect, "left" | "top" | "width" | "height">,
  transform: MapTransform,
): MapPoint {
  const { x: viewX, y: viewY } = clientPointToViewPoint(clientPoint, rect);
  return {
    x: (viewX - transform.x) / transform.scale,
    y: (viewY - transform.y) / transform.scale,
  };
}

export function nearestSmallCountry(
  point: MapPoint,
  countries: readonly CountryCentroid[],
  scale: number,
  screenRadius = 22,
  pixelsPerViewUnit = 1,
) {
  if (scale < 1.45) return null;
  const mapRadius = screenRadius / Math.max(Number.EPSILON, scale * pixelsPerViewUnit);
  let closest: { id: string; distance: number } | null = null;
  for (const country of countries) {
    if (!country.tiny) continue;
    const distance = Math.hypot(country.x - point.x, country.y - point.y);
    if (distance <= mapRadius && (!closest || distance < closest.distance)) closest = { id: country.id, distance };
  }
  return closest?.id ?? null;
}
