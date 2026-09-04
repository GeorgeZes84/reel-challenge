import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const SOURCE_REVISION = "f1890d9f152c896d250a77557a5751a93d494776"; // Natural Earth v5.1.2
const SOURCE_ROOT = `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/${SOURCE_REVISION}/geojson`;
const COUNTRIES_URL = `${SOURCE_ROOT}/ne_50m_admin_0_countries.geojson`;
const TINY_COUNTRIES_URL = `${SOURCE_ROOT}/ne_50m_admin_0_tiny_countries.geojson`;
const OUTPUT = resolve("app/data/world-map-countries.json");
const WIDTH = 1000;
const HEIGHT = 500;

function project([longitude, latitude]) {
  return [((longitude + 180) / 360) * WIDTH, ((90 - latitude) / 180) * HEIGHT];
}

function rounded(value) {
  return Number(value.toFixed(2));
}

function pointSegmentDistanceSquared(point, start, end) {
  let x = start[0];
  let y = start[1];
  const deltaX = end[0] - x;
  const deltaY = end[1] - y;
  if (deltaX !== 0 || deltaY !== 0) {
    const ratio = ((point[0] - x) * deltaX + (point[1] - y) * deltaY) / (deltaX * deltaX + deltaY * deltaY);
    if (ratio > 1) {
      x = end[0];
      y = end[1];
    } else if (ratio > 0) {
      x += deltaX * ratio;
      y += deltaY * ratio;
    }
  }
  const distanceX = point[0] - x;
  const distanceY = point[1] - y;
  return distanceX * distanceX + distanceY * distanceY;
}

function simplifyOpenLine(points, toleranceSquared) {
  if (points.length <= 2) return points;
  let maximumDistance = toleranceSquared;
  let splitIndex = -1;
  for (let index = 1; index < points.length - 1; index += 1) {
    const distance = pointSegmentDistanceSquared(points[index], points[0], points.at(-1));
    if (distance > maximumDistance) {
      splitIndex = index;
      maximumDistance = distance;
    }
  }
  if (splitIndex < 0) return [points[0], points.at(-1)];
  const left = simplifyOpenLine(points.slice(0, splitIndex + 1), toleranceSquared);
  const right = simplifyOpenLine(points.slice(splitIndex), toleranceSquared);
  return [...left.slice(0, -1), ...right];
}

function simplifyRing(points, tolerance = 0.22) {
  if (points.length <= 5) return points;
  const open = points[0][0] === points.at(-1)[0] && points[0][1] === points.at(-1)[1] ? points.slice(0, -1) : points;
  let splitIndex = 1;
  let maximumDistance = 0;
  for (let index = 1; index < open.length; index += 1) {
    const distance = (open[index][0] - open[0][0]) ** 2 + (open[index][1] - open[0][1]) ** 2;
    if (distance > maximumDistance) {
      splitIndex = index;
      maximumDistance = distance;
    }
  }
  const firstHalf = simplifyOpenLine(open.slice(0, splitIndex + 1), tolerance ** 2);
  const secondHalf = simplifyOpenLine([...open.slice(splitIndex), open[0]], tolerance ** 2);
  const simplified = [...firstHalf, ...secondHalf.slice(1, -1)];
  return simplified.length >= 3 ? [...simplified, simplified[0]] : points;
}

function stableId(properties) {
  const iso2 = [properties.ISO_A2_EH, properties.ISO_A2].find((value) => typeof value === "string" && /^[A-Z]{2}$/.test(value));
  if (iso2) return iso2;
  const iso3 = [properties.ADM0_A3, properties.SOV_A3, properties.ISO_A3_EH, properties.ISO_A3]
    .find((value) => typeof value === "string" && /^[A-Z0-9]{3}$/.test(value));
  return `NE-${iso3 ?? properties.NE_ID}`;
}

function pathForRing(ring) {
  const projected = simplifyRing(ring.map(project));
  return projected.map(([x, y], index) => {
    return `${index === 0 ? "M" : "L"}${rounded(x)} ${rounded(y)}`;
  }).join("") + "Z";
}

function pathForGeometry(geometry) {
  if (geometry.type === "Polygon") return geometry.coordinates.map(pathForRing).join("");
  if (geometry.type === "MultiPolygon") return geometry.coordinates.flatMap((polygon) => polygon.map(pathForRing)).join("");
  return "";
}

function coordinatesForPoint(feature) {
  if (feature?.geometry?.type !== "Point") return null;
  const [x, y] = project(feature.geometry.coordinates);
  return { x: rounded(x), y: rounded(y) };
}

const [countriesResponse, tinyResponse] = await Promise.all([fetch(COUNTRIES_URL), fetch(TINY_COUNTRIES_URL)]);
if (!countriesResponse.ok) throw new Error(`Natural Earth countries download failed: ${countriesResponse.status}`);
if (!tinyResponse.ok) throw new Error(`Natural Earth tiny-country download failed: ${tinyResponse.status}`);
const countriesGeoJson = await countriesResponse.json();
const tinyGeoJson = await tinyResponse.json();

const tinyById = new Map(tinyGeoJson.features.map((feature) => [stableId(feature.properties), coordinatesForPoint(feature)]));
const ids = new Set();
const polygonCountries = countriesGeoJson.features.map((feature) => {
  const properties = feature.properties;
  let id = stableId(properties);
  if (ids.has(id)) id = `${id}-${properties.NE_ID}`;
  ids.add(id);
  const tinyPoint = tinyById.get(stableId(properties));
  const labelLongitude = Number(properties.LABEL_X ?? properties.LABEL_LON ?? properties.LONGITUDE ?? 0);
  const labelLatitude = Number(properties.LABEL_Y ?? properties.LABEL_LAT ?? properties.LATITUDE ?? 0);
  const [labelX, labelY] = project([labelLongitude, labelLatitude]);
  return {
    id,
    iso2: /^[A-Z]{2}$/.test(id) ? id : null,
    iso3: properties.ADM0_A3 ?? properties.SOV_A3 ?? null,
    name: properties.NAME_EN ?? properties.ADMIN ?? properties.NAME_LONG ?? properties.NAME,
    continent: properties.CONTINENT ?? "",
    region: properties.SUBREGION ?? properties.REGION_UN ?? "",
    labelRank: Number(properties.LABELRANK ?? properties.LABEL_RANK ?? 99),
    x: tinyPoint?.x ?? rounded(labelX),
    y: tinyPoint?.y ?? rounded(labelY),
    tiny: Boolean(tinyPoint),
    pointOnly: false,
    path: pathForGeometry(feature.geometry),
  };
}).filter((country) => country.path);

const pointCountries = tinyGeoJson.features.flatMap((feature) => {
  const properties = feature.properties;
  const point = coordinatesForPoint(feature);
  const id = stableId(properties);
  if (!point || ids.has(id)) return [];
  ids.add(id);
  return [{
    id,
    iso2: /^[A-Z]{2}$/.test(id) ? id : null,
    iso3: properties.ADM0_A3 ?? properties.SOV_A3 ?? null,
    name: properties.NAME_EN ?? properties.ADMIN ?? properties.NAME_LONG ?? properties.NAME,
    continent: properties.CONTINENT ?? "",
    region: properties.SUBREGION ?? properties.REGION_UN ?? "",
    labelRank: Number(properties.LABELRANK ?? properties.LABEL_RANK ?? 99),
    x: point.x,
    y: point.y,
    tiny: true,
    pointOnly: true,
    path: "",
  }];
});

const countries = [...polygonCountries, ...pointCountries];

const payload = {
  source: {
    name: "Natural Earth 1:50m Admin-0 Countries and Tiny Country Points",
    version: "5.1.2",
    revision: SOURCE_REVISION,
    license: "Public domain",
    url: "https://www.naturalearthdata.com/downloads/50m-cultural-vectors/",
    terms: "https://www.naturalearthdata.com/about/terms-of-use/",
    projection: "Equirectangular, 1000 x 500",
  },
  countries,
};

await writeFile(OUTPUT, `${JSON.stringify(payload)}\n`, "utf8");
console.log(`Wrote ${countries.length} countries to ${OUTPUT}`);
