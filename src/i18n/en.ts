// All UI copy lives here. To add a language, create a file with the same shape
// (it must satisfy `Dictionary`) and register it in `./index.ts`.
export const en = {
  app: {
    name: "Tavern Dashboard",
    tagline: "Your Hearthstone stats, kept only on your Mac.",
  },
  a11y: {
    mainNav: "Main menu",
    mobileNav: "Mobile menu",
    filters: "Filters",
  },
  nav: {
    overview: "Overview",
    games: "Games",
    decks: "Decks",
    matchups: "Matchups",
    sessions: "Sessions",
    battlegrounds: "Battlegrounds",
    arena: "Arena",
    import: "Import",
    settings: "Settings",
  },
  theme: {
    toggle: "Toggle theme",
    light: "Light",
    dark: "Dark",
  },
  filters: {
    range: "Date range",
    mode: "Mode",
    format: "Format",
    deck: "Deck",
    class: "Class",
    reset: "Clear filters",
    all: "All",
    ranges: {
      today: "Today",
      "7d": "Last 7 days",
      "30d": "Last 30 days",
      season: "This season",
      all: "All time",
      custom: "Custom",
    },
    modes: {
      RANKED: "Ranked",
      CASUAL: "Casual",
      ARENA: "Arena",
      BATTLEGROUNDS: "Battlegrounds",
      BATTLEGROUNDS_DUOS: "BG Duos",
      BRAWL: "Tavern Brawl",
      FRIENDLY: "Friendly",
      OTHER: "Other",
    },
    formats: {
      STANDARD: "Standard",
      WILD: "Wild",
      TWIST: "Twist",
      CLASSIC: "Classic",
    },
  },
  pages: {
    overview: {
      title: "Overview",
      description: "A summary of all your games lives here.",
    },
    games: {
      title: "Games",
      description: "Every game you log, in one filterable list.",
    },
    decks: {
      title: "Decks",
      description: "Add a deck by code, then track its versions and performance.",
    },
    matchups: {
      title: "Matchups",
      description: "Which classes and archetypes you beat, and which beat you.",
    },
    sessions: {
      title: "Sessions",
      description: "Per-session performance and tilt warnings.",
    },
    battlegrounds: {
      title: "Battlegrounds",
      description: "Placement spread, heroes and MMR history.",
    },
    arena: {
      title: "Arena",
      description: "Your run history and win distribution.",
    },
    import: {
      title: "Import",
      description: "Bring in games from a CSV, JSON or Power.log file.",
    },
    settings: {
      title: "Settings",
      description: "Log folder, card data, backups and more.",
    },
  },
  empty: {
    title: "No games yet",
    body: "Add your first game and charts and insights will appear here.",
    addGame: "Quick add game",
    importLog: "Import a log",
    comingSoon: "This screen opens in an upcoming phase.",
  },
  settings: {
    demo: {
      title: "Demo data",
      description:
        "Fake games and decks added so you can try the app. They never mix with your real data and can be removed in one click.",
      summary: (games: string, decks: string) => `${games} demo games and ${decks} demo decks.`,
      none: "No demo data. Only your own records are in the database.",
      clear: "Delete demo data",
      confirmTitle: "Delete demo data?",
      confirmBody: (games: string, decks: string) =>
        `${games} demo games and ${decks} demo decks will be permanently deleted. Games and decks you added yourself are not touched. This cannot be undone.`,
      cancel: "Cancel",
      confirm: "Yes, delete",
      deleting: "Deleting...",
      done: (games: string, decks: string) => `Deleted ${games} demo games and ${decks} demo decks.`,
      failed: "Could not delete the demo data. Please try again.",
    },
  },
  errors: {
    generic: "Something went wrong. Please try again.",
  },
};

export type Dictionary = typeof en;
