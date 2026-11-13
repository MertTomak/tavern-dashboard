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

### Faz 0.5b — "In the Tavern" tasarım turu

- [x] Moodboard (Dribbble, Behance, Awwwards) → kullanıcı seçimi: A için 2 + 4, B için 1 + 7, ikisi için 10
- [x] İki konsept (`/design-lab/a`, `/design-lab/b`) gerçek kart görselleri ve seed verisiyle; A seçildi, B'den merdiven çubuğu ve deste okunurluğu alındı
- [x] Güncel görseller: en yeni set (Reign of the Black Empire) otomatik bulunur, günün kartı her gün döner, sınıf görseli o sınıfın en yeni efsanevisi
- [x] Uygulama kabuğu ve Genel Bakış "In the Tavern" ile yeniden yapıldı (madalyon navigasyon, hero, son maçlar, el, kahraman seçme, kilit anlı grafikler)
- [x] Ayarlar: sınıf portresi / kahraman skin seçici (`preferences` tablosu)
- [x] Henüz yapılmamış sayfalar için dürüst "Opens in Phase N" sayfaları, hata ve 404 sayfaları
- [x] Mobil desenler (alt çubuk + More, filtre alt sayfası), font yedeklerinde Arial/Roboto yok

### Faz 0.5c — Tasarım v3 (`docs/tasks/design-v3.md`)

- [x] Kaynaklar: Skiper UI, React Bits, ThreeUI incelendi (hiçbiri eklenmedi, bkz. Kararlar)
- [x] Kenar çubuğu kaldırıldı: üstte oyun menüsü gibi pirinç sekmeler; sayfalar menü sırasıyla yan yana, yöne göre kayan geçiş (React `<ViewTransition>`), ← → tuşları, telefonda alt çubuk + sağa/sola kaydırma
- [x] Lenis ile yumuşak kaydırma; Overview dikey kaydırmayla ilerleyen yatay bölüm yolculuğu (Scoreboard → Last games → Win rate → Your hand → Matchups → Ranked climb), bölüm göstergesi, paralaks, varışta animasyonlar; telefonda ve Reduce motion'da dikey sayfa
- [x] Hero'da etkileşimli 3B kart (React Three Fiber + drei): sürükle-döndür, tıkla-çevir, folyo parlaması, közler, klavye ve dokunmatik; WebGL yoksa veya Reduce motion açıksa 2B görsel
- [x] 1440 / 800 / 390 px Chrome kontrolü, proje kuralları güncellendi, `docs/demos/design-v3.gif`

### Faz 0.5d — Tasarım v4: kaydırma animasyonları (`docs/tasks/design-v4.md`)

- [x] Kaydırma hızına tepki: kartlar, son maçlar ve başlıklar hızlı kaydırmada kayma yönüne hafifçe eğilip uzar, yavaşlayınca yaya gibi geri döner (sınırlı, tablo ve grafiklerde yok)
- [x] Kinetik bölüm başlıkları: Fraunces'ta çok büyük, harf harf açılır; kayarken yay gibi bükülür, bölüm ortadayken düzleşir
- [x] Şerit geçişi: bölümler üst üste durur, ortada kısa bir süre bekler, sonra giden bölüm 6 yatay şeride bölünüp farklı hızlarda kayarak sonrakini açar (kaydırmaya bağlı, geri alınabilir)
- [x] Son maçlar derinlik galerisi (CSS 3B): yeni maçlar önde ve keskin, eskiler geride, küçük, hafif bulanık; kaydırınca derinliğe göre paralaks, üzerine gelince öne gelir
- [x] Görsel erimesi: hero kartının görseli giderken aynı canvas'ta dikey çizgilere erir (shader); sonraki bölümün görseli çizgilerden yeniden oluşur
- [x] "Your hand" için Fan / Wall seçimi: kavisli meyhane duvarında asılı desteler, kaydırınca duvar boyunca yürünür; varsayılan yelpaze
- [x] Köz dağılması: 3B kart çevrilince veya yeni maç gelince közlere ayrılıp toplanır (aynı canvas)
- [x] Ayarlar › Effects: Full / Light / Off (`preferences.effects`, `PUT /api/preferences/effects`)
- [x] 1440 / 800 / 390 px Chrome kontrolü ve bölüm bölüm kare ölçümü, `ui.md` güncellendi, `docs/demos/design-v4.gif`

**Sıradaki:** Faz 3 (Power.log) ve Faz 4 (canlı izleyici), Faz 1'den **önce** yapılır (kullanıcı kararı, 2026-11-13). Sonra Faz 1, Faz 2.

## Faz 3 — Power.log yükleme

- [x] Kullanıcıdan gerçek Power.log örnekleri iste, anonimleştirip fixture yap (3 ranked maç, `scripts/anonymise-log.ts`)
- [x] Parser + fixture testleri (`src/lib/parser/`, `scripts/parse-log.ts`)
- [x] `/import` sayfasında Power.log sürükle-bırak → bulunan maçların önizlemesi → onay (geçmiş içe aktarmalar + geri al)
- [ ] Ayarlar: log.config durum kontrolü ve onaylı düzeltme

**Kabul:** Gerçek bir oturum logu yüklenince maçlar doğru sonuç, sınıf ve sırayla gelir. Aynı log tekrar yüklenince 0 yeni, N atlandı.

## Faz 4 — Otomatik takip (canlı)

- [x] `scripts/watch-logs.ts` (chokidar, byte offset, yeniden deneme kuyruğu)
- [x] `POST /api/import/watcher` + `GET /api/events` (SSE)
- [x] Dashboard'da canlı güncelleme + toast (maç sürerken efektler otomatik Light)
- [ ] Ayarlar'da izleyici durumu (çalışıyor mu, son okunan dosya, son maç)

**Kabul:** `npm run dev:all` açıkken Hearthstone'da bir maç bitirilir. Birkaç saniye içinde dashboard kendiliğinden güncellenir.

## Faz 1 — Veri girişi

- [ ] Hızlı maç ekleme formu (klavye kısayollarıyla)
- [ ] Maç listesi: filtre, sıralama, sayfalama, satır içi düzenleme, silme (AlertDialog)
- [ ] Deste yönetimi: deste kodu yapıştırarak ekle (`deckstrings` + kart önbelleği), kart listesi görünümü
- [ ] İçe aktarma geçmişi ve batch'i tek tıkla geri alma

**Kabul:** Kullanıcı Chrome'da 5 maç ekler, birini düzenler, birini siler. Hepsi listede doğru görünür. (CSV/JSON "Sonra"ya taşındı.)

## Faz 2 — Dashboard ve istatistikler

- [ ] `src/lib/stats/` metrikleri + birim testleri
- [ ] Genel Bakış: KPI kartları, kayan WR, sınıf/deste WR, son maçlar
- [ ] Rank ilerleme grafiği
- [ ] Eşleşme ısı haritası sayfası
- [ ] İlk oynayan / coin, saat × gün ısı haritası, maç süresi dağılımı
- [ ] URL tabanlı global filtreler, tüm grafiklere bağlı (Genel Bakış'ta tarih aralığı, mod ve format Faz 0.5'te bağlandı; deste, sınıf ve özel tarih kaldı)

**Kabul:** Seed verisiyle tüm grafikler dolu. Filtre değişince her şey güncellenir. Yeni maç eklenince sayfa yenilemeden rakamlar değişir.

## Faz 5 — Fark yaratan analizler (HSTopDecks'ten daha iyi olduğumuz yer)

- [ ] **Rakip arketip tespiti:** rakibin açılan kartlarından arketip bul. Arketip editörü (Ayarlar): ad, sınıf, imza kartları. Deste kodu yapıştırarak arketip oluşturma (ör. HSTopDecks'ten kopyalanan kod). Eşleşme matrisi sınıf ↔ arketip arasında geçiş yapabilsin
- [ ] **Kişisel kart istatistikleri** (`/decks/[id]`): her kart için mulligan'da tutulunca WR, çekilince WR, oynanınca WR, ortalama oynanma turu. Az veri uyarısıyla
- [ ] **Deste sürümleri:** sürümler arası kart farkı (+/−) ve WR karşılaştırması ("v3 → v4: %48 → %56")
- [ ] **Maç dökümü** (`/games/[id]`): tur tur kim ne oynadı. Basit, okunaklı bir zaman çizelgesi
- [ ] **İçgörüler paneli:** Genel Bakış'ın üstünde 3-5 otomatik İngilizce içgörü
- [ ] **Seans ve tilt analizi:** seans içi maç sırasına göre WR, art arda kayıp uyarısı
- [ ] **Legend tahmini:** mevcut WR ve rank'la tahmini kalan maç sayısı

**Kabul:** Gerçek loglarla en az bir destenin kart istatistikleri ve rakip arketip matrisi dolu. İçgörüler yanlış veya abartılı bir şey söylemiyor (az veride susuyor).

## Faz 6 — Arena

- [ ] Arena: run takibi (parser + manuel), Arena sayfası

## Faz 7 — Cilalama

- [ ] `Cmd+K` komut paleti: sayfaya git, hızlı maç ekle, deste ara
- [ ] Sezon özeti paylaşım kartı (PNG): ay sonu WR, en iyi deste, en zor eşleşme, rank grafiği
- [ ] Dışa aktarma: CSV, JSON, grafik PNG
- [ ] Ayarlar'dan tek tıkla veritabanı yedeği ve geri yükleme
- [ ] Erişilebilirlik ve performans geçişi (Lighthouse), E2E testleri ana akışları kapsar
- [ ] `README.md`: kurulum, kullanım, sık sorunlar (İngilizce)

## Sonra / planlanmıyor

- [ ] CSV/JSON içe aktarma: şablon indir, önizleme, Zod doğrulama, satır bazlı hata raporu, tekrar kontrolü. Kullanıcı kararı (2026-11-14): gerçek maçlar Power.log ve canlı izleyiciden geliyor, telefondaki maçlar Quick add ile; CSV/JSON şimdilik gerekmiyor. Batch altyapısı (`import_batches`, geri al) hazır.
- [ ] Battlegrounds: parser'dan sıralama ve kahraman, manuel MMR girişi, BG sayfası. Kullanıcı BG oynamıyor (2026-11-13); menüden kaldırıldı. Parser BG oyunlarında hata vermez ve sıralamayı okur, `/battlegrounds` sayfası ve BG modları kodda duruyor.

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
- 2026-11-13 — Tasarım: **"In the Tavern"** (konsept A) seçildi. B'den Bronze → Legend segmentli çubuk ve okunur deste kartları alındı. Konsept sayfaları silindi, `/design-lab` stil rehberi olarak kaldı.
- 2026-11-13 — Şimdilik yalnızca koyu tema (oyun içi his, renkler token'da). Açık "parşömen" tema ileride ayrı iş; açık token'lar ve kontrast testi duruyor.
- 2026-11-13 — HearthstoneJSON'un en büyük görseli 512×512. Hero tam genişlik keskin görsel yerine: bulanık + renk düzeltmeli arka plan + sağda keskin görsel.
- 2026-11-13 — En yeni set = içinde en yüksek dbfId'li efsanevi kartın bulunduğu set (skin, Core, Legacy, Event hariç). Kod değişmeden yeni genişlemeye geçer.
- 2026-11-13 — Sınıf görseli: kullanıcı seçimi (Ayarlar) → sınıfın en yeni setteki efsanevi minyonu → varsayılan kahraman. Seçim `preferences` tablosunda (`classArt:CLASS`).
- 2026-11-13 — Seed üreteci gerçekçi yapıldı (tırmanış Silver'dan başlar, her ~60 maçta yeni deste, deste değişimi seyrek) ki grafikteki kilit anlar görünsün; demo verisi yeniden üretildi.
- 2026-11-13 — Chrome doğrulaması faz sonunda bir kez yapılır (kullanıcı isteği); görsel bir şey bozulursa hemen.
- 2026-11-13 — Faz sırası değişti: Faz 3 (Power.log) ve Faz 4 (canlı izleyici) Faz 1'den önce. Import sayfası Power.log yüklemesiyle açılacağı için kilidi "Opens in Phase 3" oldu.
- 2026-11-13 — Kenar çubuğu kaldırıldı; navigasyon üstte oyun menüsü gibi pirinç sekmeler (etiketler ≥1280 px, altında ipuçlu madalyon). Sayfalar menü sırasıyla yan yana durur; geçiş React `<ViewTransition>` ile (Next 16'da yerleşik): ileri gidince yeni sayfa sağdan, geri gidince soldan kayar, eski sayfa hafifçe küçülüp kararır (500 ms). Tarayıcının geri/ileri tuşu yön taşımadığı için onda kayma yok.
- 2026-11-13 — ← → tuşları sayfa değiştirir; metin alanında, açık diyalogda veya okları kendisi kullanan öğede (`data-own-arrows`, ör. 3B kart) devre dışı. Telefonda yatay kaydırma (≥70 px, dikeyden belirgin yatay) sayfa değiştirir; yatay kayan listelerde ve `data-swipe-ignore` öğelerde çalışmaz. `overscroll-behavior-x: none` ile Chrome'un iki parmak geri hareketi engellendi.
- 2026-11-13 — Lenis tüm uygulamada (`ReactLenis root`, `respectReducedMotion`). shadcn/Base UI açılır pencereleri CLI'ya ait olduğu için `data-lenis-prevent` yerine Lenis `prevent` seçicisiyle (`data-slot=…`) doğal kaydırır.
- 2026-11-13 — GSAP eklenmedi: yatay yolculuk Motion ile (yapışkan alan + `transform`) temiz yapılabildi; iki kütüphaneyi aynı öğede kullanma riski de yok. Vanta.js veya ikinci 3B motor yok.
- 2026-11-13 — Yolculuk yalnızca ≥768 px genişlik, ≥600 px yükseklik ve Reduce motion kapalıyken çalışır (CSS `journey:` varyantı + `JOURNEY_QUERY`). Bölüm başına ~0,85 ekran dikey kaydırma, zorla oturtma (snap) yok. Bölüm animasyonları bölüm ortalanmadan önce (yolun ~%55'inde) tek sefer oynar; dikey düzende görününce oynar.
- 2026-11-13 — Hazır bileşen kaynakları: React Bits ücretsiz (MIT + Commons Clause, kişisel kullanıma uygun) ama ihtiyacımız olan parçalar (sayfa kayması, yatay yolculuk, 3B kart) orada yok veya ek paket (gsap/ogl) getiriyor; eklenmedi. Skiper UI'ın ilgili bileşenleri ücretli (Premium), kullanılmadı. ThreeUI'ın "Community" lisansı ve kurulumu doğrulanamadı, kullanılmadı.
- 2026-11-13 — Lenis vitrin sayfası listeyi tarayıcıda yüklediği için okunamadı; Lenis'in şablon sayfasından 6 site metin olarak incelendi (hareket görülemedi). Alınanlar: Fuel'den sürekli görünen bölüm dizini (bölüm göstergesi), Rep Republic ve Kora'dan numaralı adım/varışta açılan bölüm, Arpeggio'dan bölüm içi sıralı giriş, Gaspar'dan yavaş kayan görsel katmanı (paralaks), Mattis'ten "kaydır" ipucu fikri.
- 2026-11-13 — 3B kart: React Three Fiber + drei (`PerformanceMonitor`: kare hızı düşerse çözünürlük 2x→1x). Kartın iki yüzü canvas'a token renkleri ve fontlarla çizilir; tek WebGL canvas, ekran dışındayken çizim durur. Telefonda kart yazının üstünde kendi alanında (yazının arkasında okunurluğu bozuyordu).
- 2026-11-13 — three 0.182'ye sabitlendi: 0.183+ `THREE.Clock`'u eskimiş sayıp konsola uyarı basıyor ve React Three Fiber 9 (kararlı) hâlâ onu kullanıyor. R3F yeni saate geçince güncellenecek.
- 2026-11-13 — Tasarım v4 Overview yolculuğu: paneller artık yan yana kayan bir şerit değil, üst üste duran sahneler. Her bölüm kaydırmanın %40'ında ortada bekler (okunsun diye), kalan kısımda 6 şeritle sonrakine geçer. Bölüm başına kaydırma 0,85 → 1 ekran. Bölüm, şeritler onu açmaya başlayınca "varmış" sayılır.
- 2026-11-13 — Şerit geçişi tek bir `clip-path` çokgeniyle yapıldı (her şeridin sağ kenarı kendi hızında çekilir, panel bir miktar sola kayar). Her şerit için panelin kopyasını çizmek (grafik ve 3B canvas ile birlikte 6 kez) 60 fps'i bozacaktı.
- 2026-11-13 — Görsel erimesi kartın kendi malzemesine yamalandı (`onBeforeCompile`), ışık ve cila korunuyor. Sonraki bölümün arka plan görseli canvas'ın dışında olduğu için çizgilerden oluşma DOM'da 16 sütunla (yalnızca `transform`) yapıldı. Sütunlarda bulanıklık/renk filtresi yok: filtreli hâli kare başına ~10 ms tutuyordu.
- 2026-11-13 — Köz dağılması: kart yüzü 80×112 noktalık bulut (tek çizim çağrısı, renk görünen yüzden), sürüklenme dünya uzayında ve kameradan uzağa, canvas kenarına yaklaşan kıvılcımlar söner. 1,3 sn.
- 2026-11-13 — Effects seviyeleri: Full = hepsi. Light = geçişler kalır; erime shader'ı, közler (dağılma ve arka plandaki köz alanı) ve derinlik bulanıklığı kapanır. Off = yalnızca sade hareket: düz silme geçişi, eğilme/bükülme/paralaks yok. Ayar veritabanında (`preferences`) duruyor ki ileride izleyici oyun sırasında Light'a geçirebilsin (not `phase-3-4.md` 4. adımda).
- 2026-11-13 — GSAP yine eklenmedi: tüm kaydırma efektleri Motion motion value'ları ve Lenis hızıyla temiz yapıldı. Tam 3B dünya içinde uçuş yapılmadı (3B model ister, oyunun yanında ağır kalır).
- 2026-11-13 — Parser: istemci her olayı iki kez yazıyor (`GameState` ve `PowerTaskList`); yalnızca `GameState` satırları okunur. "Sen" olan taraf mulligan'dan önce elindeki kartları `SHOW_ENTITY` ile açılan oyuncudur (The Coin `FULL_ENTITY` ile açık oluşturulduğu için sayılmaz); yedek yol logda adı yazılan tek oyuncu. Sınıf kahraman varlığının `CLASS` etiketinden okunur (skin'lerde de çalışır). Tur sayısı = oyun sayacının yarısı yukarı yuvarlanmış (her oyuncunun kendi turu); ham sayaç `gameTurns` olarak duruyor. Süre `CREATE_GAME` ile oyunun `COMPLETE` olması arası. Kart olayları yalnızca kurulumda destede/elde başlayan koleksiyon kartları için (üretilen kartlar, The Coin, kahraman güçleri hariç).
- 2026-11-13 — Battlegrounds menüden kaldırıldı (kullanıcı oynamıyor); iş "Sonra / planlanmıyor" altında. Kod ve parser desteği duruyor.
- 2026-11-14 — Tekrar kontrolü anahtarı oturum klasörü adını içermiyor: `sha256(oyun başlangıcı (saniye) + iki kahraman CardID)`. Klasörsüz yüklenen bir dosya ile izleyici aynı oyuna aynı anahtarı üretsin diye. Klasörsüz dosyanın tarihi son yazılma zamanından, logdaki gece yarısı geçişleri geriye sayılarak bulunur.
- 2026-11-14 — Yüklenen log sunucuda ayrıştırılır, sonuç onaya kadar 30 dk bellekte tutulur (tek kullanımlık jeton); dosya iki kez gönderilmez ve onay adımında veri değiştirilemez. Yazma uçları başka bir siteden gelen istekleri (farklı `Origin`) reddeder.
- 2026-11-14 — Maç sürerken (izleyicinin bildirdiği) Full efektler Light çalışır; kayıtlı ayar değişmez. Durum yalnızca sunucu belleğinde, 45 dk sessizlikte kendiliğinden düşer.
- 2026-11-14 — Destesi eşleşme: oyunda görülen farklı kartların en az %80'i kayıtlı (demo olmayan, aynı format) bir destede olmalı, en az 4 kart; yoksa `deck_id` boş. Şu an gerçek deste olmadığı için maçlar destesiz kaydediliyor (Faz 1'de deste kodu ile eklenecek).
- 2026-11-14 — CSV/JSON içe aktarma "Sonra"ya taşındı (kullanıcı kararı); Faz 1 gerçek maçlara odaklandı (Games, Decks, rank girişi, Quick add).
