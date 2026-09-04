export type CastMember = {
  actorId: string;
  actorName: string;
  portrait?: string;
  characterName?: string;
};

export type CastCallMovie = {
  id: string;
  title: string;
  year: number;
  genre: string;
  accent: string;
  image?: string;
  completionLabel?: string;
  cast: readonly CastMember[];
};

export const CAST_CALL_MOVIES: readonly CastCallMovie[] = [
  {
    id: "alien",
    title: "Alien",
    year: 1979,
    genre: "Sci-Fi Horror",
    accent: "#61eee0",
    completionLabel: "CAST LOCKED",
    cast: [
      { actorId: "sigourney-weaver", actorName: "Sigourney Weaver", characterName: "Ripley" },
      { actorId: "tom-skerritt", actorName: "Tom Skerritt", characterName: "Dallas" },
      { actorId: "ian-holm", actorName: "Ian Holm", characterName: "Ash" },
      { actorId: "john-hurt", actorName: "John Hurt", characterName: "Kane" },
    ],
  },
  {
    id: "the-matrix",
    title: "The Matrix",
    year: 1999,
    genre: "Sci-Fi",
    accent: "#c7f45b",
    completionLabel: "CAST LOCKED",
    cast: [
      { actorId: "keanu-reeves", actorName: "Keanu Reeves", characterName: "Neo" },
      { actorId: "carrie-anne-moss", actorName: "Carrie-Anne Moss", characterName: "Trinity" },
      { actorId: "laurence-fishburne", actorName: "Laurence Fishburne", characterName: "Morpheus" },
      { actorId: "hugo-weaving", actorName: "Hugo Weaving", characterName: "Agent Smith" },
    ],
  },
  {
    id: "titanic",
    title: "Titanic",
    year: 1997,
    genre: "Romance",
    accent: "#ff6fb3",
    completionLabel: "PICTURE LOCKED",
    cast: [
      { actorId: "leonardo-dicaprio", actorName: "Leonardo DiCaprio", characterName: "Jack" },
      { actorId: "kate-winslet", actorName: "Kate Winslet", characterName: "Rose" },
      { actorId: "billy-zane", actorName: "Billy Zane", characterName: "Cal" },
      { actorId: "kathy-bates", actorName: "Kathy Bates", characterName: "Molly Brown" },
    ],
  },
  {
    id: "parasite",
    title: "Parasite",
    year: 2019,
    genre: "Thriller",
    accent: "#637cff",
    completionLabel: "CAST LOCKED",
    cast: [
      { actorId: "song-kang-ho", actorName: "Song Kang-ho", characterName: "Kim Ki-taek" },
      { actorId: "lee-sun-kyun", actorName: "Lee Sun-kyun", characterName: "Park Dong-ik" },
      { actorId: "cho-yeo-jeong", actorName: "Cho Yeo-jeong", characterName: "Choi Yeon-gyo" },
      { actorId: "choi-woo-shik", actorName: "Choi Woo-shik", characterName: "Kim Ki-woo" },
    ],
  },
] as const;

export function castActorMap(movies: readonly CastCallMovie[]) {
  return new Map(movies.flatMap((movie) => movie.cast.map((actor) => [actor.actorId, actor] as const)));
}

export function actorInitials(actorName: string) {
  const words = actorName.split(/\s+/).filter(Boolean);
  return `${words[0]?.[0] ?? "?"}${words.at(-1)?.[0] ?? ""}`.toUpperCase();
}
