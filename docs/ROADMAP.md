# Yol Haritası

Bu dosya sırayla takip edilir; biten maddeler `[x]` ile işaretlenir. Her faz sonunda: testler geçer, arayüz Chrome'da gösterilir, `docs/demos/faz-N.gif` kaydedilir, kullanıcıya kısa özet verilir.

## Faz 0 — İskelet

- [x] Next.js + TypeScript (strict) + Tailwind + ESLint kurulumu. Klasör boş olmadığı için `create-next-app`'i geçici klasöre kur, dosyaları taşı. `docs/` dosyalarına dokunma
- [x] shadcn/ui kurulumu, koyu/açık tema, temel layout (yan menü + üst filtre çubuğu iskeleti)
- [x] Drizzle + better-sqlite3, şema (veri modeli), ilk migration, `data/` klasörü ve `.gitignore`
- [x] Tüm npm script'leri (`dev:all`, `db:*`, `cards:sync`, `typecheck` …)
- [x] `cards:sync`: HearthstoneJSON verisini `data/cards/`'a indir, sınıf listesini buradan türet
- [x] Vitest ve Playwright kurulumu, birer örnek test
- [x] `db:seed`: gerçekçi 300 sahte maç (farklı modlar, desteler, tarihler)
- [x] `git init` + ilk commit

**Kabul:** `npm run dev` çalışır. Chrome'da boş dashboard iskeleti açılır, konsol temiz.

## Faz 0.5 — Tasarım geçişi

- [x] Üç görsel yön (Hearth, Arcane, Broadcast) seed verisiyle `/design-lab/1-3` taslakları olarak gösterildi
- [x] Seçilen yön (Hearth görünümü + Broadcast yapısı) token'lara çevrildi: renkler (koyu + açık), sonuç ve sınıf renkleri, fontlar (`next/font`), köşe, gölge, parıltı. WCAG AA testi
- [x] `motion` kuruldu: sayfa geçişi, sıralı panel girişi, sayan/dönen KPI rakamları, grafik girişi, hover/tap, filtre değişince satır animasyonu, canlı eklenen maç vurgusu, kazanç kutlaması, `reducedMotion="user"`
- [x] Hazır bileşen kaynakları değerlendirildi (bu fazda bileşen eklenmedi, bkz. Kararlar)
- [x] Uygulama kabuğu, Genel Bakış ve Ayarlar yeni tasarımla yeniden yapıldı; `/design-lab` canlı stil rehberi oldu
- [x] Proje kuralları tasarım + hareket kurallarıyla güncellendi
- [x] `docs/demos/design-pass.gif`

**Kabul:** Genel Bakış seed verisiyle dolu, filtre değişince sayılar döner ve tablo yeniden sıralanır, CLS 0, konsol temiz.

## Faz 1 — Veri girişi

- [ ] Hızlı maç ekleme formu (klavye kısayollarıyla)
- [ ] Maç listesi: filtre, sıralama, sayfalama, satır içi düzenleme, silme (AlertDialog)
- [ ] Deste yönetimi: deste kodu yapıştırarak ekle (`deckstrings` + kart önbelleği), kart listesi görünümü
- [ ] CSV/JSON içe aktarma: şablon indir, önizleme, Zod doğrulama, satır bazlı hata raporu, tekrar kontrolü
- [ ] İçe aktarma geçmişi ve batch'i tek tıkla geri alma

**Kabul:** Kullanıcı Chrome'da 5 maç ekler, birini düzenler, birini siler, bir CSV yükler. Hepsi listede doğru görünür.

## Faz 2 — Dashboard ve istatistikler

- [ ] `src/lib/stats/` metrikleri + birim testleri
- [ ] Genel Bakış: KPI kartları, kayan WR, sınıf/deste WR, son maçlar
- [ ] Rank ilerleme grafiği
- [ ] Eşleşme ısı haritası sayfası
- [ ] İlk oynayan / coin, saat × gün ısı haritası, maç süresi dağılımı
- [ ] URL tabanlı global filtreler, tüm grafiklere bağlı (Genel Bakış'ta tarih aralığı, mod ve format Faz 0.5'te bağlandı; deste, sınıf ve özel tarih kaldı)

**Kabul:** Seed verisiyle tüm grafikler dolu. Filtre değişince her şey güncellenir. Yeni maç eklenince sayfa yenilemeden rakamlar değişir.

## Faz 3 — Power.log yükleme

- [ ] Kullanıcıdan gerçek Power.log örnekleri iste, anonimleştirip fixture yap
- [ ] Parser + fixture testleri
- [ ] `/import` sayfasında Power.log sürükle-bırak → bulunan maçların önizlemesi → onay
- [ ] Ayarlar: log.config durum kontrolü ve onaylı düzeltme

**Kabul:** Gerçek bir oturum logu yüklenince maçlar doğru sonuç, sınıf ve sırayla gelir. Aynı log tekrar yüklenince 0 yeni, N atlandı.

## Faz 4 — Otomatik takip (canlı)

- [ ] `scripts/watch-logs.ts` (chokidar, byte offset, yeniden deneme kuyruğu)
- [ ] `POST /api/import/watcher` + `GET /api/events` (SSE)
- [ ] Dashboard'da canlı güncelleme + toast
- [ ] Ayarlar'da izleyici durumu (çalışıyor mu, son okunan dosya, son maç)

**Kabul:** `npm run dev:all` açıkken Hearthstone'da bir maç bitirilir. Birkaç saniye içinde dashboard kendiliğinden güncellenir.

## Faz 5 — Fark yaratan analizler (HSTopDecks'ten daha iyi olduğumuz yer)

- [ ] **Rakip arketip tespiti:** rakibin açılan kartlarından arketip bul. Arketip editörü (Ayarlar): ad, sınıf, imza kartları. Deste kodu yapıştırarak arketip oluşturma (ör. HSTopDecks'ten kopyalanan kod). Eşleşme matrisi sınıf ↔ arketip arasında geçiş yapabilsin
- [ ] **Kişisel kart istatistikleri** (`/decks/[id]`): her kart için mulligan'da tutulunca WR, çekilince WR, oynanınca WR, ortalama oynanma turu. Az veri uyarısıyla
- [ ] **Deste sürümleri:** sürümler arası kart farkı (+/−) ve WR karşılaştırması ("v3 → v4: %48 → %56")
- [ ] **Maç dökümü** (`/games/[id]`): tur tur kim ne oynadı. Basit, okunaklı bir zaman çizelgesi
- [ ] **İçgörüler paneli:** Genel Bakış'ın üstünde 3-5 otomatik İngilizce içgörü
- [ ] **Seans ve tilt analizi:** seans içi maç sırasına göre WR, art arda kayıp uyarısı
- [ ] **Legend tahmini:** mevcut WR ve rank'la tahmini kalan maç sayısı

**Kabul:** Gerçek loglarla en az bir destenin kart istatistikleri ve rakip arketip matrisi dolu. İçgörüler yanlış veya abartılı bir şey söylemiyor (az veride susuyor).

## Faz 6 — Battlegrounds ve Arena

- [ ] BG: parser'dan sıralama ve kahraman, manuel MMR girişi, BG sayfası
- [ ] Arena: run takibi (parser + manuel), Arena sayfası

## Faz 7 — Cilalama

- [ ] `Cmd+K` komut paleti: sayfaya git, hızlı maç ekle, deste ara
- [ ] Sezon özeti paylaşım kartı (PNG): ay sonu WR, en iyi deste, en zor eşleşme, rank grafiği
- [ ] Dışa aktarma: CSV, JSON, grafik PNG
- [ ] Ayarlar'dan tek tıkla veritabanı yedeği ve geri yükleme
- [ ] Erişilebilirlik ve performans geçişi (Lighthouse), E2E testleri ana akışları kapsar
- [ ] `README.md`: kurulum, kullanım, sık sorunlar (İngilizce)

## Kararlar

Varsayım yapılan ürün kararlarını buraya tarihle bir satır olarak ekle.

- 2026-11-12 — Ranked sezon sınırı takvim ayı olarak kabul edildi (İstanbul saati).
- 2026-11-12 — Node 22+ gerekli (Next.js 16, better-sqlite3 13); `.nvmrc` ve `engines` eklendi. Terminalin varsayılan Node 18'i yetersiz, Homebrew Node 26 kullanıldı.
- 2026-11-12 — E2E testleri Playwright'ın kendi tarayıcısını indirmek yerine kurulu Chrome'u kullanır (`channel: "chrome"`).
- 2026-11-12 — Seed, veritabanında maç varsa hiçbir şey eklemez (verileri korumak için).
- 2026-11-12 — Demo veri "seed" adlı import batch + `decks.is_demo` ile işaretlenir; `npm run db:unseed` ve Ayarlar > "Demo verisini sil" yalnızca bunları siler.
- 2026-11-12 — Next.js 16 `cacheComponents` açık: veritabanı okuyan sayfalar `await connection()` + `Suspense` kullanmalı, yoksa veri derleme anında donar.
- 2026-11-12 — Arayüz dili İngilizce (en-GB), saat dilimi Europe/Istanbul. Metinler `src/i18n/en.ts` sözlüğünde (`Dictionary` tipi), başka dil aynı yapıda eklenir. Hızlı giriş kısayolları `W` (win) / `L` (loss) oldu.
- 2026-11-12 — Rank/MMR Power.log'dan okunamadığı için elle girilir. Oyun belleği okunmayacak.
- 2026-11-12 — Tasarım yönü: **Hearth görünümü + Broadcast yapısı** (kullanıcı seçimi). Meşe/pirinç/parşömen paleti, kenar çubuğu korunur; skor bandı, son maçlar ticker'ı ve rakip sınıf sıralama tablosu Broadcast'ten. Fontlar: Fraunces (yalnızca sayfa başlığı ve büyük WR), Barlow Condensed (tüm rakamlar), Instrument Sans (gövde). Arcane'deki çark grafiği kullanılmadı.
- 2026-11-12 — Galibiyet/mağlubiyet rengi yeşil/kırmızı yerine **verdigris (#6DC5B0) / köz (#EE7B52)**: kahverengi zeminde AA geçiyor ve döteranopide ayrışıyor (ΔE 11.6). Her yerde W/L harfi veya ✓/✕ ikonu da var.
- 2026-11-12 — Hareket: Broadcast zamanlaması (150–300 ms, overshoot yok) + Hearth parıltısı (hover, kazanç). `motion` paketi; Motion+ (ücretli) bileşenleri kullanılmadı, sayaç/rakam dönmesi kendi `StatNumber` bileşenimiz.
- 2026-11-12 — Hazır bileşen kaynağı: istenen parçalar (animasyonlu sayı, parıltılı kart, animasyonlu sekme) `motion` ile birkaç düzine satır olduğu ve hazır sürümler çoğunlukla ek paket (`framer-motion`, `@number-flow/react`) getirdiği için sıfırdan yazıldı. Komut paleti Faz 7'de shadcn `Command` ile yeniden değerlendirilecek.
- 2026-11-12 — `/design-lab` canlı stil rehberi olarak kaldı (token'lar, tipografi, hareket denemesi); production build'de 404 döner.
- 2026-11-12 — Seed üretecinde rank Legend'de (50) sınırlandı; demo verisi kullanıcı onayıyla yeniden üretildi.
- 2026-11-12 — Filtre çubuğunda "All time" seçilince varsayılan 30 güne dönen hata düzeltildi ("all" değeri hem "filtre yok" hem "tüm zamanlar" anlamına geliyordu).
