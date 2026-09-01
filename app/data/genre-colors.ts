export const GENRE_COLORS = {
  Romance: "#ff7eb6",
  Comedy: "#ffd84a",
  Drama: "#5d8dff",
  Horror: "#ff504e",
  "Sci-Fi": "#61eee0",
  Fantasy: "#8fdc62",
  "Crime/Thriller": "#b07cff",
} as const;

export type GenreFamily = keyof typeof GENRE_COLORS;

export const GENRE_LEGEND = (Object.entries(GENRE_COLORS) as [GenreFamily, string][]).map(([genre, color]) => ({ genre, color }));

export function genreFamily(rawGenre: string): GenreFamily {
  const genre = rawGenre.toLowerCase();

  if (genre.includes("romance")) return "Romance";
  if (genre.includes("comedy")) return "Comedy";
  if (genre.includes("horror")) return "Horror";
  if (genre.includes("sci-fi") || genre.includes("science fiction") || genre.includes("dystopian")) return "Sci-Fi";
  if (genre.includes("fantasy") || genre.includes("adventure") || genre.includes("animation") || genre.includes("wuxia") || genre.includes("epic") || genre.includes("samurai")) return "Fantasy";
  if (genre.includes("crime") || genre.includes("thriller") || genre.includes("noir") || genre.includes("mystery") || genre.includes("action") || genre.includes("western") || genre.includes("surreal")) return "Crime/Thriller";
  return "Drama";
}

export function genreColor(rawGenre: string) {
  return GENRE_COLORS[genreFamily(rawGenre)];
}
