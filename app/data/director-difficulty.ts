export const DIRECTOR_DIFFICULTY_TIERS = [
  "accessible",
  "familiar",
  "challenging",
  "archive",
] as const;

export type DirectorDifficultyTier = (typeof DIRECTOR_DIFFICULTY_TIERS)[number];
export type StageDifficultyMix = Record<DirectorDifficultyTier, number>;

export const DIRECTOR_DIFFICULTY_LABELS: Record<DirectorDifficultyTier, string> = {
  accessible: "Accessible",
  familiar: "Familiar",
  challenging: "Challenging",
  archive: "Archive",
};

// This is a playtest hypothesis for movie-curious players, not a permanent
// judgment about the filmmakers. Move IDs between buckets as telemetry and
// observed play reveal which individual movie associations cause friction.
export const DIRECTOR_DIFFICULTY_TIER_BY_ID: Record<string, DirectorDifficultyTier> = {
  "stanley-kubrick": "accessible",
  "ridley-scott": "accessible",
  "greta-gerwig": "accessible",
  "jordan-peele": "accessible",
  "wes-anderson": "accessible",
  "denis-villeneuve": "accessible",
  "martin-scorsese": "accessible",
  "steven-spielberg": "accessible",
  "quentin-tarantino": "accessible",
  "christopher-nolan": "accessible",
  "david-fincher": "accessible",
  "james-cameron": "accessible",
  "tim-burton": "accessible",
  "peter-jackson": "accessible",
  "robert-zemeckis": "accessible",
  "george-lucas": "accessible",

  "bong-joon-ho": "familiar",
  "hayao-miyazaki": "familiar",
  "alfred-hitchcock": "familiar",
  "francis-ford-coppola": "familiar",
  "coen-brothers": "familiar",
  "guillermo-del-toro": "familiar",
  "spike-lee": "familiar",
  "george-miller": "familiar",
  "taika-waititi": "familiar",
  "edgar-wright": "familiar",
  "ang-lee": "familiar",
  "alfonso-cuaron": "familiar",
  "sergio-leone": "familiar",
  "john-carpenter": "familiar",
  "brian-de-palma": "familiar",
  "luc-besson": "familiar",
  "kathryn-bigelow": "familiar",
  "michael-mann": "familiar",
  "darren-aronofsky": "familiar",

  "sofia-coppola": "challenging",
  "akira-kurosawa": "challenging",
  "alejandro-inarritu": "challenging",
  "david-lynch": "challenging",
  "park-chan-wook": "challenging",
  "wong-kar-wai": "challenging",
  "pedro-almodovar": "challenging",
  "roman-polanski": "challenging",
  "terrence-malick": "challenging",
  "paul-thomas-anderson": "challenging",
  "michel-gondry": "challenging",
  "charlie-kaufman": "challenging",
  "yorgos-lanthimos": "challenging",
  "jane-campion": "challenging",
  "billy-wilder": "challenging",
  "orson-welles": "challenging",
  "celine-sciamma": "challenging",

  "agnes-varda": "archive",
  "federico-fellini": "archive",
  "ingmar-bergman": "archive",
  "jean-luc-godard": "archive",
  "francois-truffaut": "archive",
  "satyajit-ray": "archive",
  "hirokazu-kore-eda": "archive",
  "john-ford": "archive",
};

// Each row is one ten-Director stage. The totals deliberately match the
// current 16 / 19 / 17 / 8 tier distribution across the sixty-Director pool.
export const STAGE_DIFFICULTY_MIXES: readonly StageDifficultyMix[] = [
  { accessible: 6, familiar: 3, challenging: 1, archive: 0 },
  { accessible: 5, familiar: 3, challenging: 2, archive: 0 },
  { accessible: 3, familiar: 4, challenging: 2, archive: 1 },
  { accessible: 2, familiar: 4, challenging: 3, archive: 1 },
  { accessible: 0, familiar: 3, challenging: 5, archive: 2 },
  { accessible: 0, familiar: 2, challenging: 4, archive: 4 },
];

export function directorDifficultyTier(directorId: string): DirectorDifficultyTier {
  return DIRECTOR_DIFFICULTY_TIER_BY_ID[directorId] ?? "familiar";
}
