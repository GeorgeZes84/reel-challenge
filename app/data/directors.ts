import { expandedDirectors } from "./expanded-directors.ts";

export type Film = {
  id: string;
  title: string;
  year: number;
  genre: string;
  accent: string;
  youtubeId?: string;
  factoids?: string[];
};

export type Director = {
  id: string;
  name: string;
  initials: string;
  films: Film[];
};

export const directors: Director[] = [
  {
    id: "stanley-kubrick",
    name: "Stanley Kubrick",
    initials: "SK",
    films: [
      { id: "2001-space-odyssey", title: "2001: A Space Odyssey", year: 1968, genre: "Sci-fi", accent: "#69C7E4", youtubeId: "oR_e9y-bka0", factoids: ["A rotating centrifuge set let the actors appear to walk on walls.", "Front projection placed studio performers inside large-format African landscapes."] },
      { id: "the-shining", title: "The Shining", year: 1980, genre: "Horror", accent: "#FFB0D0", youtubeId: "5Cb3ik6zP2I", factoids: ["Steadicam made the low, gliding journeys through the Overlook possible.", "The Timberline Lodge supplied the exterior; the hotel interiors were built at Elstree."] },
      { id: "clockwork-orange", title: "A Clockwork Orange", year: 1971, genre: "Dystopian", accent: "#FFB54A", youtubeId: "T54uZPI4Z8A", factoids: ["Kubrick used real modernist locations around London instead of a giant studio build.", "Wendy Carlos reshaped classical music with an electronic score made on synthesizers."] },
    ],
  },
  {
    id: "ridley-scott",
    name: "Ridley Scott",
    initials: "RS",
    films: [
      { id: "alien", title: "Alien", year: 1979, genre: "Sci-fi horror", accent: "#B6E35D", youtubeId: "LjLamj-b0I8", factoids: ["H. R. Giger's biomechanical art shaped both the creature and the derelict ship.", "The chestburster scene used several cameras so the cast's reactions could unfold at once."] },
      { id: "blade-runner", title: "Blade Runner", year: 1982, genre: "Neo-noir", accent: "#FFB0D0", youtubeId: "eogpIG53Cis", factoids: ["Visual futurist Syd Mead helped turn Scott's sketches into the film's layered city.", "Much of the Los Angeles night work was filmed during demanding all-night shoots."] },
      { id: "gladiator", title: "Gladiator", year: 2000, genre: "Historical epic", accent: "#FFB54A", youtubeId: "P5ieIbInFpg", factoids: ["A partial Colosseum was built in Malta, then extended into a full arena digitally.", "Oliver Reed's unfinished material was completed through rewrites and digital compositing."] },
      { id: "thelma-louise", title: "Thelma & Louise", year: 1991, genre: "Road drama", accent: "#69C7E4" },
    ],
  },
  {
    id: "sofia-coppola",
    name: "Sofia Coppola",
    initials: "SC",
    films: [
      { id: "lost-translation", title: "Lost in Translation", year: 2003, genre: "Drama", accent: "#FFB0D0", youtubeId: "W6iVPCRflQM", factoids: ["Coppola wrote the Tokyo-set screenplay from her own memories of the city.", "The production worked with a small crew inside the Park Hyatt Tokyo and neon streets."] },
      { id: "virgin-suicides", title: "The Virgin Suicides", year: 1999, genre: "Drama", accent: "#B6E35D", youtubeId: "YRPXQ3XcpKc", factoids: ["Bill Owens's photographs of American suburbia became a key visual reference.", "Toronto locations stood in for the story's dreamlike 1970s Michigan suburb."] },
      { id: "marie-antoinette", title: "Marie Antoinette", year: 2006, genre: "Period drama", accent: "#FFB54A", youtubeId: "yBWyKRoh98U", factoids: ["The crew filmed inside Versailles under strict preservation rules.", "Milena Canonero's costumes mixed historical silhouettes with a youthful pastel palette."] },
    ],
  },
  {
    id: "bong-joon-ho",
    name: "Bong Joon Ho",
    initials: "BJ",
    films: [
      { id: "parasite", title: "Parasite", year: 2019, genre: "Thriller", accent: "#B6E35D", youtubeId: "isOGD_7hNIY", factoids: ["The Park family house was designed and built as a set, not borrowed from an architect.", "The flood-prone neighborhood was built inside a water tank for the storm sequence."] },
      { id: "memories-murder", title: "Memories of Murder", year: 2003, genre: "Crime", accent: "#69C7E4", youtubeId: "0n_HQwQU8ls", factoids: ["Rural locations and period details reconstructed South Korea in the late 1980s.", "For the 1986 setting, the art department sourced period paper stock and hand-designed obsolete newspaper fonts character by character."] },
      { id: "snowpiercer", title: "Snowpiercer", year: 2013, genre: "Sci-fi", accent: "#FFB0D0", youtubeId: "nX5PwfEMBM0", factoids: ["Twenty-six train-car sets were built at Prague's Barrandov Studios.", "A giant gimbal rocked the carriages to simulate a train racing along the track."] },
    ],
  },
  {
    id: "greta-gerwig",
    name: "Greta Gerwig",
    initials: "GG",
    films: [
      { id: "lady-bird", title: "Lady Bird", year: 2017, genre: "Coming-of-age", accent: "#FFB0D0", youtubeId: "cNi_HC839Wo", factoids: ["The film is Gerwig's visual love letter to her hometown of Sacramento.", "Its image texture was designed to feel like a photocopy of a printed photograph."] },
      { id: "little-women", title: "Little Women", year: 2019, genre: "Period drama", accent: "#B6E35D", youtubeId: "AST2-4db4ic", factoids: ["Massachusetts locations connected the production to Louisa May Alcott's home territory.", "The two timelines use distinct color temperatures: warmer memory, cooler present day."] },
      { id: "barbie", title: "Barbie", year: 2023, genre: "Comedy", accent: "#FFB54A", youtubeId: "pBk4NYhWNMM", factoids: ["Barbieland relied on practical sets, painted skies and deliberately artificial horizons.", "The design team created a controlled family of pinks so the huge set stayed legible."] },
    ],
  },
  {
    id: "hayao-miyazaki",
    name: "Hayao Miyazaki",
    initials: "HM",
    films: [
      { id: "spirited-away", title: "Spirited Away", year: 2001, genre: "Fantasy", accent: "#69C7E4", youtubeId: "ByXuk9QqQkk", factoids: ["Miyazaki shaped Chihiro for the ten-year-old daughters of family friends.", "The bathhouse draws from several Japanese buildings rather than one literal location."] },
      { id: "totoro", title: "My Neighbor Totoro", year: 1988, genre: "Fantasy", accent: "#B6E35D", youtubeId: "92a7Hj0ijLs", factoids: ["Totoro originally opened as a double feature with Grave of the Fireflies.", "The countryside evokes the wooded Sayama Hills on the edge of Tokyo."] },
      { id: "princess-mononoke", title: "Princess Mononoke", year: 1997, genre: "Adventure", accent: "#FFB54A", youtubeId: "4OiMOHRDs14", factoids: ["The film combined hand-drawn animation with Ghibli's early digital paint and compositing.", "Ancient forests including Yakushima helped inspire the world around the Forest Spirit."] },
    ],
  },
  {
    id: "jordan-peele",
    name: "Jordan Peele",
    initials: "JP",
    films: [
      { id: "get-out", title: "Get Out", year: 2017, genre: "Horror", accent: "#B6E35D", youtubeId: "DzfpyUB60YY", factoids: ["Alabama locations doubled for the story's supposedly liberal upstate New York setting.", "The Sunken Place was built from darkness, suspension work and carefully layered imagery."] },
      { id: "us", title: "Us", year: 2019, genre: "Horror", accent: "#FFB0D0", youtubeId: "hNCmb-4oXJA", factoids: ["The Santa Cruz Beach Boardwalk gave the opening and climax a real seaside landmark.", "Red jumpsuits, a single glove and gold scissors formed the Tethered's visual uniform."] },
      { id: "nope", title: "Nope", year: 2022, genre: "Sci-fi horror", accent: "#69C7E4", youtubeId: "In8fuzj3gck", factoids: ["Night exteriors combined infrared capture with large-format film photography.", "Jupiter's Claim was built as a complete set and later joined Universal's studio tour."] },
    ],
  },
  {
    id: "wes-anderson",
    name: "Wes Anderson",
    initials: "WA",
    films: [
      { id: "grand-budapest", title: "The Grand Budapest Hotel", year: 2014, genre: "Comedy", accent: "#FFB0D0", youtubeId: "1Fg5iWmQjwk", factoids: ["Three aspect ratios distinguish the story's different historical periods.", "Miniatures supplied the hotel's impossible exterior and mountain railway views."] },
      { id: "moonrise-kingdom", title: "Moonrise Kingdom", year: 2012, genre: "Comedy", accent: "#FFB54A", youtubeId: "7N8wkVA4_8s", factoids: ["Rhode Island locations became the fictional island of New Penzance.", "Every young-adult book seen on screen received its own invented cover and story."] },
      { id: "fantastic-fox", title: "Fantastic Mr. Fox", year: 2009, genre: "Animation", accent: "#B6E35D", youtubeId: "n2igjYFojUo", factoids: ["The stop-motion deliberately kept a handmade, slightly staccato rhythm.", "Anderson recorded some dialogue outdoors so the voices carried real location texture."] },
    ],
  },
  {
    id: "denis-villeneuve",
    name: "Denis Villeneuve",
    initials: "DV",
    films: [
      { id: "arrival", title: "Arrival", year: 2016, genre: "Sci-fi", accent: "#69C7E4", youtubeId: "tFMo3UJ4B4g", factoids: ["The design team built a working dictionary for the circular alien logograms.", "James Turrell's light installations influenced the dark chamber inside the shell."] },
      { id: "dune", title: "Dune", year: 2021, genre: "Sci-fi epic", accent: "#FFB54A", youtubeId: "8g18jFHCLXk", factoids: ["The production built at enormous scale to give performers real light, shadow and dust.", "Jordan and Abu Dhabi landscapes supplied the geography of Arrakis."] },
      { id: "incendies", title: "Incendies", year: 2010, genre: "Drama", accent: "#FFB0D0", youtubeId: "0nycksytL1A", factoids: ["The forty-day shoot split its story between Quebec and Jordan.", "The production kept the Middle Eastern country unnamed to avoid tying it to one conflict."] },
    ],
  },
  {
    id: "agnes-varda",
    name: "Agnès Varda",
    initials: "AV",
    films: [
      { id: "cleo", title: "Cléo from 5 to 7", year: 1962, genre: "Drama", accent: "#B6E35D" },
      { id: "vagabond", title: "Vagabond", year: 1985, genre: "Drama", accent: "#69C7E4" },
      { id: "gleaners", title: "The Gleaners and I", year: 2000, genre: "Documentary", accent: "#FFB54A" },
    ],
  },
  ...expandedDirectors,
];

export type RoundDefinition = {
  id: number;
  label: string;
  subtitle: string;
  directorIds: string[];
  filmIds: string[];
};
