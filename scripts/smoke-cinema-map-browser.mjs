const cdpPort = Number(process.env.CINEMA_CDP_PORT ?? 9223);
const baseUrl = process.env.CINEMA_BASE_URL ?? "http://localhost:3000/";

const target = await fetch(`http://127.0.0.1:${cdpPort}/json/new?${encodeURIComponent(baseUrl)}`, { method: "PUT" }).then((response) => {
  if (!response.ok) throw new Error(`Could not open Chrome test tab: ${response.status}`);
  return response.json();
});

const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

let serial = 0;
const pending = new Map();
socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (!message.id || !pending.has(message.id)) return;
  const { resolve, reject } = pending.get(message.id);
  pending.delete(message.id);
  if (message.error) reject(new Error(message.error.message));
  else resolve(message.result);
});

function call(method, params = {}) {
  serial += 1;
  socket.send(JSON.stringify({ id: serial, method, params }));
  return new Promise((resolve, reject) => pending.set(serial, { resolve, reject }));
}

async function evaluate(expression) {
  const result = await call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function waitFor(expression, label, timeout = 10000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (await evaluate(`Boolean(${expression})`)) return;
    await delay(80);
  }
  const snapshot = await evaluate(`({ title: document.title, url: location.href, text: document.body?.innerText?.slice(0, 1200), html: document.body?.innerHTML?.slice(0, 1200) })`);
  throw new Error(`Timed out waiting for ${label}: ${JSON.stringify(snapshot)}`);
}

async function clickSelector(selector) {
  const clicked = await evaluate(`(() => { const element = document.querySelector(${JSON.stringify(selector)}); if (!element) return false; element.click(); return true; })()`);
  if (!clicked) throw new Error(`Missing clickable selector: ${selector}`);
}

async function realClickSelector(selector) {
  const point = await evaluate(`(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  })()`);
  if (!point) throw new Error(`Missing real-click selector: ${selector}`);
  await call("Input.dispatchMouseEvent", { type: "mouseMoved", x: point.x, y: point.y });
  await call("Input.dispatchMouseEvent", { type: "mousePressed", x: point.x, y: point.y, button: "left", buttons: 1, clickCount: 1 });
  await call("Input.dispatchMouseEvent", { type: "mouseReleased", x: point.x, y: point.y, button: "left", buttons: 0, clickCount: 1 });
}

async function setCountrySearch(countryName) {
  const set = await evaluate(`(() => {
    const input = document.querySelector("#cinema-country-choice");
    if (!input) return false;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    setter.call(input, ${JSON.stringify(countryName)});
    input.dispatchEvent(new Event("input", { bubbles: true }));
    return true;
  })()`);
  if (!set) throw new Error("Country search input was unavailable");
  await delay(50);
}

async function submitCountryByName(countryName) {
  await setCountrySearch(countryName);
  await clickSelector(".cinema-country-search button");
}

async function currentTitle() {
  return evaluate(`document.querySelector(".geo-ticket-copy > strong")?.textContent?.trim() ?? null`);
}

const answers = {
  "Parasite": { iso: "KR", name: "South Korea", region: "Asia" },
  "Dogtooth": { iso: "GR", name: "Greece", region: "Europe" },
  "The 400 Blows": { iso: "FR", name: "France", region: "Europe" },
  "Seven Samurai": { iso: "JP", name: "Japan", region: "Asia" },
  "Roma": { iso: "MX", name: "Mexico", region: "N. America" },
  "Bicycle Thieves": { iso: "IT", name: "Italy", region: "Europe" },
  "A Separation": { iso: "IR", name: "Iran", region: "Middle East" },
  "The Godfather": { iso: "US", name: "United States of America", region: "N. America" },
};

await call("Page.enable");
await call("Runtime.enable");
await call("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await call("Page.navigate", { url: baseUrl });
await waitFor(`document.readyState === "complete"`, "page load");
await waitFor(`document.querySelector(".game-home-menu")`, "main menu");
await delay(1000);
await clickSelector(".menu-action-button.is-secondary");
await waitFor(`document.querySelector(".game-select-card.mode-cinema-map")`, "Cinema Map menu card");
await clickSelector(".game-select-card.mode-cinema-map");
await waitFor(`document.querySelector(".cinema-map-stage")`, "Cinema Map stage");
await waitFor(`document.querySelector(".movie-geo-ticket.is-ready")`, "first movie ticket");

const mapAudit = await evaluate(`(() => ({
  countryPaths: document.querySelectorAll("[data-country-id]").length,
  labeledCountries: document.querySelectorAll("[data-country-id][aria-label]").length,
  hasWorldView: Boolean([...document.querySelectorAll("button")].find((button) => button.textContent.trim() === "World view")),
  hasCountrySearch: Boolean(document.querySelector("#cinema-country-choice")),
}))()`);
if (mapAudit.countryPaths < 200 || mapAudit.labeledCountries !== mapAudit.countryPaths || !mapAudit.hasWorldView || !mapAudit.hasCountrySearch) {
  throw new Error(`Map audit failed: ${JSON.stringify(mapAudit)}`);
}

await evaluate(`[...document.querySelectorAll(".cinema-region-nav button")].find((button) => button.textContent.trim() === "Europe")?.click()`);
await delay(450);
if (await evaluate(`document.querySelector(".cinema-zoom-controls output")?.textContent?.trim() === "100%"`)) throw new Error("Europe shortcut did not zoom the map");
await realClickSelector(".cinema-zoom-controls .is-world");
await delay(450);
if (!(await evaluate(`document.querySelector(".cinema-zoom-controls output")?.textContent?.trim() === "100%"`))) throw new Error("World View did not reset the map");

const firstTitle = await currentTitle();
const firstAnswer = answers[firstTitle];
if (!firstAnswer) throw new Error(`Unknown first movie: ${firstTitle}`);
const wrongCountry = firstAnswer.name === "Italy" ? "Greece" : "Italy";
await submitCountryByName(wrongCountry);
await waitFor(`document.querySelector(".cinema-map-status.is-wrong")`, "visible wrong-answer feedback");
const wrongMessage = await evaluate(`document.querySelector(".cinema-map-status")?.textContent ?? ""`);
if (!/not the route/i.test(wrongMessage)) throw new Error(`Wrong feedback was unclear: ${wrongMessage}`);
await waitFor(`document.querySelector(".movie-geo-ticket.is-ready")`, "retry-ready ticket");

await evaluate(`[...document.querySelectorAll(".cinema-region-nav button")].find((button) => button.textContent.trim() === ${JSON.stringify(firstAnswer.region)})?.click()`);
await delay(450);
const dragPoints = await evaluate(`(() => {
  const ticket = document.querySelector(".movie-geo-ticket");
  const viewport = document.querySelector(".cinema-map-viewport");
  if (!ticket || !viewport) return null;
  const ticketRect = ticket.getBoundingClientRect();
  const mapRect = viewport.getBoundingClientRect();
  let destination = null;
  for (let y = mapRect.top + 3; y < mapRect.bottom - 3 && !destination; y += 4) {
    for (let x = mapRect.left + 3; x < mapRect.right - 3; x += 4) {
      if (document.elementsFromPoint(x, y).find((element) => element.dataset?.countryId)?.dataset?.countryId === ${JSON.stringify(firstAnswer.iso)}) {
        destination = { x, y };
        break;
      }
    }
  }
  return destination ? { start: { x: ticketRect.left + ticketRect.width / 2, y: ticketRect.top + ticketRect.height / 2 }, destination } : null;
})()`);
if (!dragPoints) throw new Error(`Could not locate a visible ${firstAnswer.iso} drop point after regional zoom`);
await call("Input.dispatchMouseEvent", { type: "mouseMoved", x: dragPoints.start.x, y: dragPoints.start.y });
await call("Input.dispatchMouseEvent", { type: "mousePressed", x: dragPoints.start.x, y: dragPoints.start.y, button: "left", buttons: 1, clickCount: 1 });
for (let step = 1; step <= 6; step += 1) {
  const progress = step / 6;
  await call("Input.dispatchMouseEvent", {
    type: "mouseMoved",
    x: dragPoints.start.x + (dragPoints.destination.x - dragPoints.start.x) * progress,
    y: dragPoints.start.y + (dragPoints.destination.y - dragPoints.start.y) * progress,
    button: "left",
    buttons: 1,
  });
}
await call("Input.dispatchMouseEvent", { type: "mouseReleased", x: dragPoints.destination.x, y: dragPoints.destination.y, button: "left", buttons: 0, clickCount: 1 });
await waitFor(`document.querySelector(".cinema-map-status.is-correct")`, "correct drag feedback");

for (let placed = 1; placed < 8; placed += 1) {
  await waitFor(`document.querySelector(".movie-geo-ticket.is-ready")`, `ticket ${placed + 1}`);
  const title = await currentTitle();
  const answer = answers[title];
  if (!answer) throw new Error(`Unknown movie during full round: ${title}`);
  await submitCountryByName(answer.name);
  await waitFor(`document.querySelector(".cinema-map-status.is-correct")`, `correct feedback for ${title}`);
}

await waitFor(`document.querySelector(".cinema-map-results-overlay")`, "Cinema Map results", 15000);
const resultsAudit = await evaluate(`(() => ({
  text: document.querySelector(".cinema-map-results-overlay")?.textContent ?? "",
  journeyMap: Boolean(document.querySelector(".cinema-journey-map")),
  markers: document.querySelectorAll(".cinema-journey-pin").length,
}))()`);
if (!/Movies placed\s*8\/8/i.test(resultsAudit.text) || !resultsAudit.journeyMap || resultsAudit.markers < 8) {
  throw new Error(`Results audit failed: ${JSON.stringify(resultsAudit)}`);
}

await clickSelector(".cinema-map-result-actions .primary-pixel-button");
await waitFor(`document.querySelector(".movie-geo-ticket.is-ready")`, "replayed first ticket");
const replayAudit = await evaluate(`(() => ({
  question: document.querySelector(".cinema-map-question-count b")?.textContent?.split(" ").filter(Boolean).join(" ").trim(),
  markers: document.querySelectorAll(".cinema-map-markers > g").length,
  resultsVisible: Boolean(document.querySelector(".cinema-map-results-overlay")),
}))()`);
if (replayAudit.question !== "1 / 8" || replayAudit.markers !== 0 || replayAudit.resultsVisible) {
  throw new Error(`Replay audit failed: ${JSON.stringify(replayAudit)}`);
}

await evaluate(`document.querySelector(".movie-geo-ticket")?.focus()`);
await call("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape" });
await call("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape" });
await waitFor(`document.querySelector(".movie-geo-ticket")?.getAttribute("aria-pressed") === "false"`, "cleared ticket selection");
await realClickSelector(".movie-geo-ticket");
await waitFor(`document.querySelector(".movie-geo-ticket")?.getAttribute("aria-pressed") === "true"`, "pointer ticket selection");

const responsiveAudits = [];
for (const viewport of [{ label: "laptop", width: 1024, height: 768 }, { label: "tablet", width: 768, height: 1024 }]) {
  await call("Emulation.setDeviceMetricsOverride", { width: viewport.width, height: viewport.height, deviceScaleFactor: 1, mobile: false });
  await delay(180);
  const audit = await evaluate(`(() => ({
    mapWidth: Math.round(document.querySelector(".cinema-map-viewport")?.getBoundingClientRect().width ?? 0),
    mapHeight: Math.round(document.querySelector(".cinema-map-viewport")?.getBoundingClientRect().height ?? 0),
    panelHeight: Math.round(document.querySelector(".cinema-map-panel")?.getBoundingClientRect().height ?? 0),
    stageHeight: Math.round(document.querySelector(".cinema-map-stage")?.getBoundingClientRect().height ?? 0),
    headingHeight: Math.round(document.querySelector(".cinema-map-heading")?.getBoundingClientRect().height ?? 0),
    statusHeight: Math.round(document.querySelector(".cinema-map-status")?.getBoundingClientRect().height ?? 0),
    panelRows: getComputedStyle(document.querySelector(".cinema-map-panel")).gridTemplateRows,
    navPosition: getComputedStyle(document.querySelector(".cinema-region-nav")).position,
    searchPosition: getComputedStyle(document.querySelector(".cinema-country-search")).position,
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  }))()`);
  if (audit.mapWidth < 300 || audit.mapHeight < 190 || audit.horizontalOverflow) throw new Error(`${viewport.label} audit failed: ${JSON.stringify(audit)}`);
  responsiveAudits.push({ ...viewport, ...audit });
}

await call("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
await delay(250);
const mobileAudit = await evaluate(`(() => ({
  viewportWidth: innerWidth,
  stageWidth: Math.round(document.querySelector(".cinema-map-stage")?.getBoundingClientRect().width ?? 0),
  mapHeight: Math.round(document.querySelector(".cinema-map-viewport")?.getBoundingClientRect().height ?? 0),
  horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  zoomTargetHeight: Math.round(document.querySelector(".cinema-zoom-controls button")?.getBoundingClientRect().height ?? 0),
  contained: (() => {
    const screen = document.querySelector(".crt-screen")?.getBoundingClientRect();
    const stage = document.querySelector(".cinema-map-stage")?.getBoundingClientRect();
    const status = document.querySelector(".cinema-map-status")?.getBoundingClientRect();
    return Boolean(screen && stage && status && stage.top >= screen.top - 1 && stage.bottom <= screen.bottom + 1 && status.bottom <= screen.bottom + 1);
  })(),
}))()`);
if (mobileAudit.viewportWidth !== 390 || mobileAudit.stageWidth <= 0 || mobileAudit.mapHeight < 300 || mobileAudit.horizontalOverflow || mobileAudit.zoomTargetHeight < 40 || !mobileAudit.contained) {
  throw new Error(`Mobile audit failed: ${JSON.stringify(mobileAudit)}`);
}

await evaluate(`document.querySelector(".cinema-map-viewport")?.scrollIntoView({ block: "center" })`);
await delay(180);
await call("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 2 });
const touchMapRect = await evaluate(`(() => { const rect = document.querySelector(".cinema-map-viewport")?.getBoundingClientRect(); return rect ? { left: rect.left, top: rect.top, width: rect.width, height: rect.height } : null; })()`);
if (!touchMapRect) throw new Error("Mobile map rectangle was unavailable");
const touchCenter = { x: touchMapRect.left + touchMapRect.width / 2, y: touchMapRect.top + touchMapRect.height / 2 };
await call("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [
  { x: touchCenter.x - 35, y: touchCenter.y, id: 1, radiusX: 6, radiusY: 6, force: 1 },
  { x: touchCenter.x + 35, y: touchCenter.y, id: 2, radiusX: 6, radiusY: 6, force: 1 },
] });
await call("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [
  { x: touchCenter.x - 82, y: touchCenter.y, id: 1, radiusX: 6, radiusY: 6, force: 1 },
  { x: touchCenter.x + 82, y: touchCenter.y, id: 2, radiusX: 6, radiusY: 6, force: 1 },
] });
await call("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
await delay(220);
const pinchZoom = Number.parseInt(await evaluate(`document.querySelector(".cinema-zoom-controls output")?.textContent ?? "0"`), 10);
if (pinchZoom <= 100) throw new Error(`Pinch gesture did not zoom the map: ${pinchZoom}%`);

await realClickSelector(".cinema-zoom-controls .is-world");
await delay(420);
const replayTitle = await currentTitle();
const replayAnswer = answers[replayTitle];
if (!replayAnswer) throw new Error(`Unknown replay movie: ${replayTitle}`);
await evaluate(`[...document.querySelectorAll(".cinema-region-nav button")].find((button) => button.textContent.trim() === ${JSON.stringify(replayAnswer.region)})?.click()`);
await delay(420);
const touchCountryPoint = await evaluate(`(() => {
  const viewport = document.querySelector(".cinema-map-viewport");
  if (!viewport) return null;
  const rect = viewport.getBoundingClientRect();
  for (let y = Math.max(0, rect.top + 2); y < Math.min(innerHeight, rect.bottom - 2); y += 3) {
    for (let x = Math.max(0, rect.left + 2); x < Math.min(innerWidth, rect.right - 2); x += 3) {
      if (document.elementsFromPoint(x, y).find((element) => element.dataset?.countryId)?.dataset?.countryId === ${JSON.stringify(replayAnswer.iso)}) return { x, y };
    }
  }
  return null;
})()`);
if (!touchCountryPoint) throw new Error(`Could not find mobile tap point for ${replayAnswer.iso}`);
await call("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: touchCountryPoint.x, y: touchCountryPoint.y, id: 3, radiusX: 6, radiusY: 6, force: 1 }] });
await call("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
await waitFor(`document.querySelector(".cinema-map-status.is-correct")`, "correct mobile country tap");

await waitFor(`document.querySelector(".movie-geo-ticket.is-ready")`, "mobile ticket after correct placement");
const restartButtonFound = await evaluate(`(() => {
  const button = [...document.querySelectorAll(".bezel-controls button")].find((candidate) => candidate.textContent.includes("Restart game"));
  if (!button) return false;
  button.click();
  return true;
})()`);
if (!restartButtonFound) throw new Error("Global Restart game control was unavailable");
await waitFor(`document.querySelector(".movie-geo-ticket.is-ready")`, "globally restarted Cinema Map");
const globalRestartAudit = await evaluate(`(() => ({
  question: document.querySelector(".cinema-map-question-count b")?.textContent?.split(" ").filter(Boolean).join(" ").trim(),
  markers: document.querySelectorAll(".cinema-map-markers > g").length,
}))()`);
if (globalRestartAudit.question !== "1 / 8" || globalRestartAudit.markers !== 0) throw new Error(`Global restart did not reset Cinema Map: ${JSON.stringify(globalRestartAudit)}`);

await call("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
if (!(await evaluate(`matchMedia("(prefers-reduced-motion: reduce)").matches`))) throw new Error("Reduced-motion emulation was not honored");
await delay(80);
const reducedMotionAudit = await evaluate(`(() => ({
  mapTransition: getComputedStyle(document.querySelector(".cinema-map-transform")).transitionDuration,
  ticketAnimation: getComputedStyle(document.querySelector(".movie-geo-ticket")).animationName,
}))()`);
if (reducedMotionAudit.mapTransition !== "0s" || reducedMotionAudit.ticketAnimation !== "none") throw new Error(`Reduced-motion styles were not active: ${JSON.stringify(reducedMotionAudit)}`);

console.log(JSON.stringify({ mapAudit, wrongMessage, results: { journeyMap: resultsAudit.journeyMap, markers: resultsAudit.markers }, replayAudit, responsiveAudits, mobileAudit, touchAudit: { pinchZoom, tappedCountry: replayAnswer.iso }, globalRestartAudit, reducedMotionAudit }, null, 2));
await call("Page.close");
socket.close();
