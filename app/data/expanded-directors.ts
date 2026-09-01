import type { Director, Film } from "./directors";

type FilmSeed = readonly [title: string, year: number, genre: string];
type DirectorSeed = { id: string; name: string; films: readonly FilmSeed[] };

const accents = ["#69C7E4", "#FFB0D0", "#FFB54A", "#B6E35D"];

const d = (id: string, name: string, films: readonly FilmSeed[]): DirectorSeed => ({ id, name, films });

const expandedDirectorSeeds = [
  d("alfred-hitchcock", "Alfred Hitchcock", [["Psycho", 1960, "Horror"], ["Vertigo", 1958, "Thriller"], ["Rear Window", 1954, "Mystery"]]),
  d("martin-scorsese", "Martin Scorsese", [["Goodfellas", 1990, "Crime"], ["Taxi Driver", 1976, "Drama"], ["The Departed", 2006, "Crime"]]),
  d("steven-spielberg", "Steven Spielberg", [["Jaws", 1975, "Thriller"], ["E.T.", 1982, "Sci-fi"], ["Jurassic Park", 1993, "Adventure"]]),
  d("francis-ford-coppola", "Francis Ford Coppola", [["The Godfather", 1972, "Crime"], ["Apocalypse Now", 1979, "War"], ["The Conversation", 1974, "Thriller"]]),
  d("quentin-tarantino", "Quentin Tarantino", [["Pulp Fiction", 1994, "Crime"], ["Kill Bill: Vol. 1", 2003, "Action"], ["Django Unchained", 2012, "Western"]]),
  d("christopher-nolan", "Christopher Nolan", [["Inception", 2010, "Sci-fi"], ["The Dark Knight", 2008, "Action"], ["Interstellar", 2014, "Sci-fi"]]),
  d("david-fincher", "David Fincher", [["Fight Club", 1999, "Drama"], ["Se7en", 1995, "Thriller"], ["The Social Network", 2010, "Drama"]]),
  d("james-cameron", "James Cameron", [["Titanic", 1997, "Romance"], ["Avatar", 2009, "Sci-fi"], ["Terminator 2", 1991, "Action"]]),
  d("akira-kurosawa", "Akira Kurosawa", [["Seven Samurai", 1954, "Epic"], ["Rashomon", 1950, "Drama"], ["Yojimbo", 1961, "Samurai"]]),
  d("federico-fellini", "Federico Fellini", [["8½", 1963, "Drama"], ["La Dolce Vita", 1960, "Drama"], ["Amarcord", 1973, "Comedy"]]),
  d("ingmar-bergman", "Ingmar Bergman", [["The Seventh Seal", 1957, "Drama"], ["Persona", 1966, "Drama"], ["Wild Strawberries", 1957, "Drama"]]),
  d("coen-brothers", "Coen Brothers", [["No Country for Old Men", 2007, "Crime"], ["Fargo", 1996, "Crime"], ["The Big Lebowski", 1998, "Comedy"]]),
  d("guillermo-del-toro", "Guillermo del Toro", [["Pan's Labyrinth", 2006, "Fantasy"], ["The Shape of Water", 2017, "Fantasy"], ["Hellboy", 2004, "Action"]]),
  d("alejandro-inarritu", "Alejandro González Iñárritu", [["Birdman", 2014, "Drama"], ["The Revenant", 2015, "Western"], ["Babel", 2006, "Drama"]]),
  d("spike-lee", "Spike Lee", [["Do the Right Thing", 1989, "Drama"], ["BlacKkKlansman", 2018, "Crime"], ["Malcolm X", 1992, "Biopic"]]),
  d("david-lynch", "David Lynch", [["Mulholland Drive", 2001, "Mystery"], ["Blue Velvet", 1986, "Mystery"], ["Eraserhead", 1977, "Surrealism"]]),
  d("tim-burton", "Tim Burton", [["Edward Scissorhands", 1990, "Fantasy"], ["Beetlejuice", 1988, "Comedy"], ["Batman", 1989, "Action"]]),
  d("peter-jackson", "Peter Jackson", [["The Lord of the Rings", 2001, "Fantasy"], ["King Kong", 2005, "Adventure"], ["Heavenly Creatures", 1994, "Drama"]]),
  d("george-miller", "George Miller", [["Mad Max: Fury Road", 2015, "Action"], ["Babe: Pig in the City", 1998, "Fantasy"], ["The Road Warrior", 1981, "Action"]]),
  d("park-chan-wook", "Park Chan-wook", [["Oldboy", 2003, "Thriller"], ["The Handmaiden", 2016, "Thriller"], ["Decision to Leave", 2022, "Mystery"]]),
  d("wong-kar-wai", "Wong Kar-wai", [["In the Mood for Love", 2000, "Romance"], ["Chungking Express", 1994, "Romance"], ["Fallen Angels", 1995, "Drama"]]),
  d("ang-lee", "Ang Lee", [["Life of Pi", 2012, "Adventure"], ["Crouching Tiger, Hidden Dragon", 2000, "Wuxia"], ["Brokeback Mountain", 2005, "Drama"]]),
  d("pedro-almodovar", "Pedro Almodóvar", [["Talk to Her", 2002, "Drama"], ["Volver", 2006, "Drama"], ["All About My Mother", 1999, "Drama"]]),
  d("jean-luc-godard", "Jean-Luc Godard", [["Breathless", 1960, "Crime"], ["Pierrot le Fou", 1965, "Drama"], ["Contempt", 1963, "Drama"]]),
  d("francois-truffaut", "François Truffaut", [["The 400 Blows", 1959, "Drama"], ["Jules and Jim", 1962, "Romance"], ["Day for Night", 1973, "Comedy"]]),
  d("roman-polanski", "Roman Polanski", [["Chinatown", 1974, "Neo-noir"], ["Rosemary's Baby", 1968, "Horror"], ["The Pianist", 2002, "Drama"]]),
  d("terrence-malick", "Terrence Malick", [["The Tree of Life", 2011, "Drama"], ["Badlands", 1973, "Crime"], ["The Thin Red Line", 1998, "War"]]),
  d("paul-thomas-anderson", "Paul Thomas Anderson", [["There Will Be Blood", 2007, "Drama"], ["Boogie Nights", 1997, "Drama"], ["Phantom Thread", 2017, "Drama"]]),
  d("darren-aronofsky", "Darren Aronofsky", [["Black Swan", 2010, "Thriller"], ["Requiem for a Dream", 2000, "Drama"], ["The Wrestler", 2008, "Drama"]]),
  d("michel-gondry", "Michel Gondry", [["Eternal Sunshine of the Spotless Mind", 2004, "Romance"], ["The Science of Sleep", 2006, "Fantasy"], ["Be Kind Rewind", 2008, "Comedy"]]),
  d("charlie-kaufman", "Charlie Kaufman", [["Synecdoche, New York", 2008, "Drama"], ["I'm Thinking of Ending Things", 2020, "Drama"], ["Anomalisa", 2015, "Animation"]]),
  d("yorgos-lanthimos", "Yorgos Lanthimos", [["The Favourite", 2018, "Comedy"], ["Poor Things", 2023, "Fantasy"], ["The Lobster", 2015, "Comedy"]]),
  d("taika-waititi", "Taika Waititi", [["Thor: Ragnarok", 2017, "Action"], ["Jojo Rabbit", 2019, "Comedy"], ["Hunt for the Wilderpeople", 2016, "Comedy"]]),
  d("edgar-wright", "Edgar Wright", [["Baby Driver", 2017, "Action"], ["Shaun of the Dead", 2004, "Comedy"], ["Hot Fuzz", 2007, "Comedy"]]),
  d("robert-zemeckis", "Robert Zemeckis", [["Back to the Future", 1985, "Sci-fi"], ["Forrest Gump", 1994, "Drama"], ["Who Framed Roger Rabbit", 1988, "Comedy"]]),
  d("michael-mann", "Michael Mann", [["Heat", 1995, "Crime"], ["Collateral", 2004, "Thriller"], ["The Insider", 1999, "Drama"]]),
  d("sergio-leone", "Sergio Leone", [["The Good, the Bad and the Ugly", 1966, "Western"], ["Once Upon a Time in the West", 1968, "Western"], ["A Fistful of Dollars", 1964, "Western"]]),
  d("billy-wilder", "Billy Wilder", [["Some Like It Hot", 1959, "Comedy"], ["Sunset Boulevard", 1950, "Noir"], ["The Apartment", 1960, "Comedy"]]),
  d("orson-welles", "Orson Welles", [["Citizen Kane", 1941, "Drama"], ["Touch of Evil", 1958, "Noir"], ["The Magnificent Ambersons", 1942, "Drama"]]),
  d("john-carpenter", "John Carpenter", [["Halloween", 1978, "Horror"], ["The Thing", 1982, "Horror"], ["Escape from New York", 1981, "Action"]]),
  d("luc-besson", "Luc Besson", [["Léon: The Professional", 1994, "Crime"], ["The Fifth Element", 1997, "Sci-fi"], ["La Femme Nikita", 1990, "Thriller"]]),
  d("george-lucas", "George Lucas", [["Star Wars", 1977, "Sci-fi"], ["American Graffiti", 1973, "Comedy"], ["THX 1138", 1971, "Sci-fi"]]),
  d("kathryn-bigelow", "Kathryn Bigelow", [["The Hurt Locker", 2008, "War"], ["Point Break", 1991, "Action"], ["Zero Dark Thirty", 2012, "Thriller"]]),
  d("jane-campion", "Jane Campion", [["The Piano", 1993, "Drama"], ["The Power of the Dog", 2021, "Western"], ["Bright Star", 2009, "Romance"]]),
  d("alfonso-cuaron", "Alfonso Cuarón", [["Children of Men", 2006, "Sci-fi"], ["Roma", 2018, "Drama"], ["Gravity", 2013, "Sci-fi"]]),
  d("satyajit-ray", "Satyajit Ray", [["Pather Panchali", 1955, "Drama"], ["Charulata", 1964, "Drama"], ["The Music Room", 1958, "Drama"]]),
  d("celine-sciamma", "Céline Sciamma", [["Portrait of a Lady on Fire", 2019, "Romance"], ["Petite Maman", 2021, "Fantasy"], ["Girlhood", 2014, "Drama"]]),
  d("hirokazu-kore-eda", "Hirokazu Kore-eda", [["Shoplifters", 2018, "Drama"], ["After Life", 1998, "Fantasy"], ["Nobody Knows", 2004, "Drama"]]),
  d("brian-de-palma", "Brian De Palma", [["Scarface", 1983, "Crime"], ["The Untouchables", 1987, "Crime"], ["Carrie", 1976, "Horror"]]),
  d("john-ford", "John Ford", [["The Searchers", 1956, "Western"], ["Stagecoach", 1939, "Western"], ["The Grapes of Wrath", 1940, "Drama"]]),
] as const satisfies readonly DirectorSeed[];

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function initialsFor(name: string) {
  const words = name.replace("Brothers", "B").split(/\s+/).filter(Boolean);
  return `${words[0]?.[0] ?? "?"}${words.at(-1)?.[0] ?? ""}`.toUpperCase();
}

export const expandedDirectors: Director[] = expandedDirectorSeeds.map((director, directorIndex) => ({
  id: director.id,
  name: director.name,
  initials: initialsFor(director.name),
  films: director.films.map(([title, year, genre], filmIndex): Film => ({
    id: `${director.id}-${slugify(title)}`,
    title,
    year,
    genre,
    accent: accents[(directorIndex + filmIndex) % accents.length],
    factoids: [
      `Released in ${year}, this ${genre.toLowerCase()} card belongs to a very particular cinematic world.`,
      "Look for the choices in setting, movement and sound that make the film instantly recognizable.",
    ],
  })),
}));
