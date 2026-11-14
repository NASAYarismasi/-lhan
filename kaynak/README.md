# Mars'a İlk Koloni — Kaynak Proje

Bu klasör, depo kökündeki tek dosya (çevrimdışı) HTML demolarının **düzenlenebilir kaynak halidir**.
Kod parçalara ayrılmıştır, VS Code'da açıp değiştirebilir, tarayıcıda anında görebilirsin.

## Hızlı başlangıç

Gerekli: [Node.js](https://nodejs.org) 20 veya üzeri.

```bash
cd kaynak
npm install
npm run dev
```

Tarayıcı `http://localhost:5173` adresinde açılır. Menüden demo seç:

| Sayfa | Demo |
| --- | --- |
| `index.html` | Demo menüsü |
| `ay-krater.html` | Mars krater ekosistemi, düz koloni sahası (ECLSS + FPS) |
| `mars.html` | Mars kolonisi, atölye, tarım, görev planı |
| `jezero.html` | Jezero Krateri arazi ve ekosistem sahnesi |

Üretim çıktısı almak için:

```bash
npm run build     # dist/ klasörüne yazar
npm run onizleme  # dist/ çıktısını yerelde açar
```

## Klasör yapısı

```
kaynak/
├─ index.html            demo menüsü
├─ ay-krater.html        krater demosunun sayfası (HTML + CSS)
├─ mars.html             Mars FPS demosunun sayfası
├─ jezero.html           Jezero demosunun sayfası
├─ src/
│  ├─ crater-ecosystem.mjs   Mars krater sahnesi, ECLSS hesabı, FPS
│  ├─ mars-demo.mjs          koloni kurma, atölye, tarım, görev planı akışı
│  ├─ jezero-ecosystem.mjs   Jezero arazi sahnesi
│  ├─ mars-fps.mjs           birinci şahıs kamera ve yürüme
│  ├─ mars-wrist.mjs         astronot kol ekranı (STL modeli)
│  ├─ mars-models.mjs        prosedürel modül ve arazi modelleri
│  ├─ mars-koloni.mjs        koloni simülasyonu (enerji, erzak, sol döngüsü)
│  ├─ mars-atolye.mjs        atölye ve tarım kuralları
│  ├─ mars-gorev-plani.mjs   iniş/görev planı ve kargo hesabı
│  ├─ dev-assets.js          geliştirme sırasında modelleri yükler
│  ├─ baslat-mars.js         Mars sayfası giriş noktası
│  └─ baslat-jezero.js       Jezero sayfası giriş noktası
├─ data/
│  ├─ jezero.json            MOLA yükseklik ızgarası
│  └─ jezero-hirise.json     HiRISE arazi detay verisi
└─ public/models/            GLB, STL ve doku dosyaları
```

## Nasıl çalışır?

- Tarayıcı modülleri (`import`) doğrudan kullanılır; tarayıcı `three` paketini Vite üzerinden çözer.
- `dev-assets.js`, tek dosya sürümlerde HTML içine gömülen modelleri `public/models/` klasöründen
  yükleyip sayfadaki `<script id="...">` etiketlerine base64 olarak yazar. Bu yüzden demo kodu
  (`decode(...)`, `byId("rover-data")` vb.) hiç değiştirilmeden çalışır.
- Draco sıkıştırıcı üç paketinin içinden (`three/examples/jsm/libs/draco/gltf`) alınır.

## Tek dosya HTML sürümü

Depo kökündeki `AY-KRATER-EKOSISTEM.html`, `MARS-KOLONI-FPS.html`, `MARS-JEZERO-*.html` dosyaları
esbuild ile paketlenip modellerin base64 olarak HTML'e gömülmesiyle üretilir:
çift tıklayınca internet olmadan da açılır. Kaynak kodu burada değiştirdikten sonra yeni bir tek dosya
sürüm üretmek isterseniz mevcut `build-crater.ps1` / `build-mars.ps1` akışı kullanılabilir
(esbuild + `three` bağımlılığı gerekir).

## Veri ve görsel kaynakları

- Jezero Krateri yükseklik verisi: NASA/JPL-Caltech/UArizona, HiRISE DTM (ESP_048842_1985)
- Ay krater profilleri: Pike (1977), Melosh — Impact Cratering
- ECLSS tüketim değerleri: NASA BVAD, NASA ECLSS Overview
- 3B modeller: NASA 3D Resources (Perseverance, Ingenuity, InSight, habitat)

Ortak iniş verisi biçimi ve ekip entegrasyonu için depo kökündeki `README.md` ve
`MARS-ENTEGRASYON.md` dosyalarına bakın.
