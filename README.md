# Mars’a İlk Koloni — Roket ve Uçuş

**Sorumlu: Emre**

Oyuncunun Dünya’da hazırlık yapıp üç astronotla Mars’a ulaşmasını geliştir.

- [ ] Roket ve yük seçimi ekranı yap. Kütle ve bütçeyi anlık göster, sınır aşılırsa nedenini açıkla.
- [ ] Kalkış ve üç turluk yolculuk akışını yaz. Bir güç arızasında oyuncu bilim cihazını kapatsın veya yedek parça harcasın.
- [ ] Mars’a inişte yakın ve engebeli alan ile uzak ve düz alan arasında seçim sun. İnişin yakıt veya yüzey enerjisi üzerindeki maliyetini raporla.
- [ ] İniş sonunda aşağıdaki veriyi Samet’in oyun akışına ver. Tüketilen erzak ve parçalar koloniye kalan miktarlarıyla ulaşmalı.

**İlk teslim:** Tek roket, bir yolculuk olayı ve bir inişle çalışan demo. Kütle sınırını aşan ve güvenle inen birer yükü deneyin.

## Ortak iniş verisi

Emre üretir, Samet aktarır, İhan koloni başlangıcında okur. İlk entegrasyon için aynı örneği kullanın. Sayılar oyun birimidir.

```json
{
  "crew": [
    { "id": "astronaut-1", "health": 100 },
    { "id": "astronaut-2", "health": 100 },
    { "id": "astronaut-3", "health": 100 }
  ],
  "supplies": { "food": 12, "water": 12, "oxygen": 12, "spareParts": 1 },
  "modules": ["habitat", "solarPanel", "battery", "oxygenUnit", "waterRecycler", "greenhouse"],
  "landingSite": "flat",
  "surfaceEnergy": 8
}
```

Ortak alanları değiştirmeden önce üç kişi birlikte karar versin.

[Ekip repoları](https://github.com/orgs/NASAYarismasi/repositories)

## Ortak 3D geliştirme planı

- **Aday teknik temel:** Vite + Three.js, JavaScript ES modülleri. Üç ekip üyesi aynı paket sürümünü kullanır. Samet ana uygulamayı ve sahne geçişlerini yönetir.
- **Model biçimi:** Blender’da içe al, ölçeği ve geometriyi kontrol et, glTF/GLB olarak dışa aktar. Three.js sahnelerinde metre ve Y-yukarı kullan. Bir modelin kaynak URL’sini, kullanım koşullarını ve yapılan düzenlemeleri kaydet. [NASA medya kullanım kuralları](https://www.nasa.gov/nasa-brand-center/images-and-media/)
- **Görev bağlamı:** SLS ve Orion gerçek araçlardan alınan görsel referanslardır. Mars transfer aracı, insanlı iniş aracı ve yüzey üssü oyun için tasarlanan konseptlerdir.
- **Entegrasyon:** README’deki ortak iniş JSON’u korunur. Uçuş sahnesi başarılı inişte bu veriyi döndürür, koloni aynı nesneyi alır. Sahne kapatılırken olay dinleyicileri, animasyonlar ve GPU kaynakları temizlenir.
- **İlk ortak demo:** 3D kalkış → yolculuk kararı → 3D iniş → üç modül kur → bir sol ilerlet → görev raporu. Modeli yüklenemeyen bir sahne hata bilgisi ve yeniden deneme sunar.

## Atanan GitHub görevleri

- [NASA roket, kapsül ve astronot modellerini hazırla](https://github.com/NASAYarismasi/Emre/issues/1)
- [3D kalkış ve Mars transfer sahnelerini geliştir](https://github.com/NASAYarismasi/Emre/issues/2)
- [Mars inişini ve koloniye veri teslimini tamamla](https://github.com/NASAYarismasi/Emre/issues/3)

## Çalıştırma ve demo

```powershell
npm ci
npm run dev
```

**Geri sayımı başlat** ile T−10'dan kalkışa geçilir. Varsayılan otopilot gerçek fizik çekirdeğini izler. Yörüngeye ulaşınca **B** Mars transferini başlatır; seyirde **.** ile 100000× hız seçilebilir. Mars yakalama otomatik, Mars yörüngesindeki **B** inişi başlatır.

| Kontrol | İşlev |
|---|---|
| 1 / 2 / 3 / 4 / 5 / 6 | Takip / kabin / yer takibi / motor / sinematik / harita |
| C | Kamera değiştir |
| Fare sürükleme / tekerlek | Takip kamerası yörüngeleme / yakınlaştırma |
| Boşluk / E | Geri sayım; uçuşta güvenli kademe atımı |
| B | Park yörüngesinde TMI veya Mars deorbit |
| , / . / T | Zamanı yavaşlat / hızlandır / hızlandır |
| A, ardından Shift / Ctrl / Z / X | Manuel gaz; artır / azalt / tam / kes |
| Esc / P | Duraklat, kalite/ses/sıfırlama menüsü |
| H / Q · M · F | Yardım · sesi kapat/aç · tam ekran |

Manuel gaz yalnız kalkış ve transfer/yakalama yanışlarında aktiftir. Atmosferde veya motor yanarken en fazla 10× hızlandırma uygulanır. NASA modelleri, gezegenler ve yıldız haritası yereldir; demo internet gerektirmez.

## Uçuş ve görsel katman

50 Hz deterministik SLS kalkışı, Kepler yörüngeleri, Hohmann transferi, yakıt/erzak muhasebesi ve kuvvet tabanlı Mars EDL bulunur. [Fizik modeli ve sınırları](docs/PHYSICS.md).

Araç merkezli kayan koordinatlar, gerçek yarıçaplı gezegenler, ACES/sRGB, gölgeli LC-39B, bloom/FXAA, altı kamera, canlı kabin ekranları, basınçla genişleyen motor egzozları, dünyaya bağlı duman, balistik kademe ayrılması, plazma, retro egzoz/toz, Türkçe HUD ve prosedürel WebAudio eklidir. [Render mimarisi ve sınırlamalar](docs/RENDERING.md), [varlık kaynakları/lisansları](ASSETS.md).

Mars iniş aracı ve NTR görevi konsepttir. Mars yerel arazisi, kabin ve bulutlar prosedüreldir; gerçek arazi DEM'i ve tam atmosfer ışınım çözümü yoktur. 60 FPS hedeflenir; kalite menüsünden çözünürlük ve pahalı efektler azaltılabilir.

```powershell
npm test
npm run build
npm run preview -- --host 127.0.0.1 --port 5177
# Ayrı terminalde, bu makinedeki Playwright kurulumu ile:
node scripts/render-qa.mjs
```

`window.render_game_to_text()` SI telemetri ve kamera durumunu verir; `window.advanceTime(ms)` aynı fizik döngüsünü deterministik ilerletir. Ekran görüntüleri ve eşleşen görev durumları [docs/screenshots](docs/screenshots/) içindedir. Ortak iniş verisi sözleşmesi korunmuştur.
