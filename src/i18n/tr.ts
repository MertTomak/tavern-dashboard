export const tr = {
  app: {
    name: "Taverna Paneli",
    tagline: "Hearthstone istatistiklerin, sadece sende.",
  },
  nav: {
    overview: "Genel Bakış",
    games: "Maçlar",
    decks: "Desteler",
    matchups: "Eşleşmeler",
    sessions: "Seanslar",
    battlegrounds: "Battlegrounds",
    arena: "Arena",
    import: "İçe Aktar",
    settings: "Ayarlar",
  },
  theme: {
    toggle: "Temayı değiştir",
    light: "Açık",
    dark: "Koyu",
  },
  filters: {
    range: "Tarih aralığı",
    mode: "Mod",
    format: "Format",
    deck: "Deste",
    class: "Sınıf",
    reset: "Filtreleri temizle",
    all: "Tümü",
    ranges: {
      today: "Bugün",
      "7d": "Son 7 gün",
      "30d": "Son 30 gün",
      season: "Bu sezon",
      all: "Tümü",
      custom: "Özel",
    },
    modes: {
      RANKED: "Dereceli",
      CASUAL: "Gündelik",
      ARENA: "Arena",
      BATTLEGROUNDS: "Battlegrounds",
      BATTLEGROUNDS_DUOS: "BG Duos",
      BRAWL: "Meyhane Kavgası",
      FRIENDLY: "Arkadaş Maçı",
      OTHER: "Diğer",
    },
    formats: {
      STANDARD: "Standart",
      WILD: "Vahşi",
      TWIST: "Twist",
      CLASSIC: "Klasik",
    },
  },
  pages: {
    overview: {
      title: "Genel Bakış",
      description: "Tüm maçlarının özeti burada toplanır.",
    },
    games: {
      title: "Maçlar",
      description: "Kaydettiğin her maç, filtrelenebilir bir listede.",
    },
    decks: {
      title: "Desteler",
      description: "Desteni kodla ekle, sürümlerini ve performansını izle.",
    },
    matchups: {
      title: "Eşleşmeler",
      description: "Hangi sınıf ve arketipe karşı güçlü, hangisine zayıfsın.",
    },
    sessions: {
      title: "Seanslar",
      description: "Oturum bazlı performans ve tilt uyarıları.",
    },
    battlegrounds: {
      title: "Battlegrounds",
      description: "Sıralama dağılımı, kahramanlar ve MMR geçmişi.",
    },
    arena: {
      title: "Arena",
      description: "Run geçmişin ve galibiyet dağılımın.",
    },
    import: {
      title: "İçe Aktar",
      description: "CSV, JSON veya Power.log dosyasından maç yükle.",
    },
    settings: {
      title: "Ayarlar",
      description: "Log klasörü, kart verisi, yedekleme ve daha fazlası.",
    },
  },
  empty: {
    title: "Henüz maç yok",
    body: "İlk maçını ekleyince grafikler ve içgörüler burada belirecek.",
    addGame: "Hızlı maç ekle",
    importLog: "Log yükle",
    comingSoon: "Bu ekran sıradaki fazlarda açılacak.",
  },
  errors: {
    generic: "Bir şeyler ters gitti. Lütfen tekrar dene.",
  },
} as const;
