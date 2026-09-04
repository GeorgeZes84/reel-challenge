export type CountryIso = string;

export type CountryValidationRule = "PRIMARY_COUNTRY" | "ANY_VALID_COUNTRY";

export type MovieGeoQuestion = {
  id: string;
  title: string;
  year: number;
  director: string;
  genre: string;
  accent: string;
  image?: string;
  countryOfOrigin: readonly CountryIso[];
  primaryCountry: CountryIso;
  regionHint: string;
};

/**
 * Curated for clear national associations in the first playable round.
 * The schema deliberately supports coproductions even though V1 uses one
 * primary country per movie.
 */
export const CINEMA_MAP_MOVIES: readonly MovieGeoQuestion[] = [
  {
    id: "parasite",
    title: "Parasite",
    year: 2019,
    director: "Bong Joon-ho",
    genre: "Thriller",
    accent: "#c7f45b",
    countryOfOrigin: ["KR"],
    primaryCountry: "KR",
    regionHint: "East Asia",
  },
  {
    id: "dogtooth",
    title: "Dogtooth",
    year: 2009,
    director: "Yorgos Lanthimos",
    genre: "Drama",
    accent: "#ff6fb3",
    countryOfOrigin: ["GR"],
    primaryCountry: "GR",
    regionHint: "Southern Europe",
  },
  {
    id: "the-400-blows",
    title: "The 400 Blows",
    year: 1959,
    director: "François Truffaut",
    genre: "Drama",
    accent: "#61eee0",
    countryOfOrigin: ["FR"],
    primaryCountry: "FR",
    regionHint: "Western Europe",
  },
  {
    id: "seven-samurai",
    title: "Seven Samurai",
    year: 1954,
    director: "Akira Kurosawa",
    genre: "Drama",
    accent: "#ffcb51",
    countryOfOrigin: ["JP"],
    primaryCountry: "JP",
    regionHint: "East Asia",
  },
  {
    id: "roma",
    title: "Roma",
    year: 2018,
    director: "Alfonso Cuarón",
    genre: "Drama",
    accent: "#637cff",
    countryOfOrigin: ["MX"],
    primaryCountry: "MX",
    regionHint: "North America",
  },
  {
    id: "bicycle-thieves",
    title: "Bicycle Thieves",
    year: 1948,
    director: "Vittorio De Sica",
    genre: "Drama",
    accent: "#ff8d55",
    countryOfOrigin: ["IT"],
    primaryCountry: "IT",
    regionHint: "Southern Europe",
  },
  {
    id: "a-separation",
    title: "A Separation",
    year: 2011,
    director: "Asghar Farhadi",
    genre: "Drama",
    accent: "#ae78ff",
    countryOfOrigin: ["IR"],
    primaryCountry: "IR",
    regionHint: "Middle East",
  },
  {
    id: "the-godfather",
    title: "The Godfather",
    year: 1972,
    director: "Francis Ford Coppola",
    genre: "Crime",
    accent: "#ff6275",
    countryOfOrigin: ["US"],
    primaryCountry: "US",
    regionHint: "North America",
  },
] as const;

export const CINEMA_MAP_COUNTRY_NAMES: Readonly<Record<CountryIso, string>> = {
  FR: "France",
  GR: "Greece",
  IR: "Iran",
  IT: "Italy",
  JP: "Japan",
  KR: "South Korea",
  MX: "Mexico",
  US: "United States of America",
};

