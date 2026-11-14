# Mars güneş tarlası

`AY-KRATER-EKOSISTEM.html` dosyasında Mars moduna eklenen ayrı tarla. Varsayılan kamera tarlaya bakar; eski kamera ve FPS kontrolleri korunur. Ay modu düğmesi bu teslimde gizlidir.

- 42 açılır masa, her masada 10 fiziksel 1×2 m panel: 420 panel ve 840 m² aktif yüzey.
- 6 sıra × 7 masa; eğim 0,55 radyan. Sıra araları bakım yollarını barındırır. Eğim ve sıra aralıkları yıllık gölgelenme optimizasyonu yapılmış değerler değildir.
- 50×58 m, 2.900 m² kavramsal hazırlanmış saha; metrik ölçek, düzleştirilmiş teras, ayaklar, çerçeve, hücre dokuları, DC kanalları ve üs bağlantı kablosu.
- FPS için masa/kabin engelleri. Panel, çerçeve ve taşıyıcılarda InstancedMesh kullanılır.
- 10×25 kWh batarya kabini, toplam 250 kWh nominal. Kabin geometrisi kavramsaldır; paket kütlesi, hücre hacmi, termal kontrolü doğrulanmamıştır.

## Enerji varsayımları

Önceki üç kişilik koloni ön bütçesi: tasarım payı dahil 413 kWh/sol. Günlük yüzey ışınımı 2,5 kWh/m²/sol, panel verimi %25 ve toplam enerji verim çarpanı %80 alınır. Bunlar sahaya ait doğrulanmış ölçümler değildir.

`840 × 2,5 × 0,25 × 0,80 = 420 kWh/sol`, yani yalnızca 7 kWh/sol fazla. Yaşam desteği için yeterlilik garantisi değildir. Fırtına düğmesi ışınımı örnek olarak %80 düşürür: 84 kWh/sol üretim, 329 kWh/sol açık. Arayüz senaryosudur; atmosfer ve Güneş için fiziksel hava modeli değildir.

Batarya: `250 × 0,8 × 0,9 = 180 kWh` çıkış enerjisi. Normal gece: `10,7 × 12,33 ≈ 132 kWh`. Batarya doluyken bu örnek gece karşılanır; uzun fırtınalara yetmez. Oksijen üretimi, sera ve buz tesisi bu dosyadaki önceki yaşam destek hesaplarıyla otomatik birleştirilmiş değildir; 413 kWh bütçe bağımsız ön tasarım hedefidir.

NASA referansı: https://www.nasa.gov/wp-content/uploads/2024/01/mars-surface-power-generation-challenges-and-considerations.pdf

Arazi, bu reponun mevcut prosedürel arazi modelidir; gerçek Jezero sayısal yükseklik verisi değildir.

## Kaynak ve derleme

`kaynak/src/solar-farm.mjs` yeni modül, `kaynak/src/crater-ecosystem.mjs` entegrasyon ve `kaynak/ay-krater.html` arayüzdür. Kaynak klasöründe `npm install`, ardından `node build-solar.mjs` ile tek dosyalık `AY-KRATER-EKOSISTEM.html` yenilenir.
