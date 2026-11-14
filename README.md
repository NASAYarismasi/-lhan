# Mars’a İlk Koloni & Ay Krater Yaşam Destek Üssü

**Sorumlu: İlhan · Görev 2**

### 🌕 Yeni: Ay & Mars Krater Ekosistemi (NASA ECLSS & Gerçekçi Morfoloji)
Kullanıcının BBC News referans fotoğrafındaki gibi gerçekçi, yükseltilmiş kenarlı (rim crest), derin çanaklı ve sert vakum gölgeli krater arazisi:

- **Dosya:** [AY-KRATER-EKOSISTEM.html](./AY-KRATER-EKOSISTEM.html) (Çift tıklanarak doğrudan Chrome veya Edge'de çevrimdışı açılır, 599 KB tek dosya).
- **Özellikler:**
  - 📸 **BBC / Apollo Panoraması:** Referans görseldeki eğimli ufuk çizgisi, sert beyaz krater yamaçları ve zifiri karanlık gölgeler.
  - 🚶 **Astronot FPS Keşif Modu:** WASD ve fareyle krater kenarında gerçek göz hizasından (1.75m) serbestçe yürüme.
  - 🚀 **Bilimsel Üs:** Basınçlı habitat modülü, fotosentetik mor LED'li şeffaf sera kubbesi, ECLSS su geri dönüşüm ünitesi, çift kanatlı güneş panelleri, rover ve astronotlar.
  - 🔬 **NASA Yaşam Desteği (ECLSS):** Arcade / oyun mekaniği (coin, XP, seviye atlama) tamamen kaldırılmıştır. 3 kişilik mürettebat için saf bilimsel kütle/enerji dengesi (su, oksijen, kalori) ve kapalı döngü simülasyonu sunar.
  - 🪐 **Ortam Değiştirici:** Tek tıkla 🌕 Ay (Referans Görsel) ile 🪐 Mars (Jezero Krateri) arasında geçiş.

### 💻 Düzenlenebilir kaynak proje

Tüm demoların okunabilir kaynak kodu [`kaynak/`](./kaynak) klasöründedir (Vite + Three.js).

```bash
cd kaynak
npm install
npm run dev
```

- Menü: `http://localhost:5173`
- Sayfalar: `ay-krater.html` (Ay/Mars krater), `mars.html` (koloni FPS), `jezero.html` (Jezero arazi)
- Kurulum ve dosya yapısı: [kaynak/README.md](./kaynak/README.md)
- Tek dosya çevrimdışı HTML sürümleri depo kökündedir.

---

## Orijinal Görev Tanımı (Görev 2)

- [ ] Küçük bir ızgarada envanterden yaşam modülü, güneş paneli, batarya, oksijen ünitesi, su geri dönüşümü ve sera kurulabilsin.
- [ ] Üç astronotu inşaat, bakım veya üretime ata. Her sol enerji üretimini ve tüketimini, erzak tüketimini ve kalan stokları hesapla.
- [ ] Bir toz fırtınasında panel üretimini düşür. Oyuncu enerjiyi yaşamsal sistemlere öncelik vererek dağıtabilsin.
- [ ] İlk sürümü 10 solda bitir. Kazanmak için üç astronot hayatta kalmalı ve son üç solun her birinde temel ihtiyaçlar karşılanmalı. Sonucu ve nedenlerini Samet’in rapor ekranına ver.

**İlk teslim:** Örnek iniş verisiyle üç sol ilerletilebilen koloni. Yeterli ve yetersiz enerjiyle birer deneme yapın.

## Oynanabilir FPS demosu

[MARS-KOLONI-FPS.html](./MARS-KOLONI-FPS.html) (en güncel sürüm) veya [MARS-TARIM-ATOLYE.html](./MARS-TARIM-ATOLYE.html) dosyasını indir, sonra Chrome veya Edge’de çift tıklayarak aç. Oyun çevrimdışı çalışır ve doğrudan astronotun gözünden başlar.

- **WASD** ile yürü. **E** ile kaynak topla veya seçtiğin modülü hedeflediğin zemine yerleştir. **Esc** ile üst görünüme geç.
- **Atölye ve tarım** bölümünde buz ve organik atığı işle, kapalı tarım kabinleri üret. Hasadı erzağa aktar veya kredi karşılığında teslim et. Tarım XP’si yeni tarifler açar.
- [Ekip paketi](./MARS-KOLONI-EKIP.zip) derlenebilir kaynakları ve GLB modellerini içerir. [Entegrasyon kılavuzu](./MARS-ENTEGRASYON.md) ortak iniş verisini ve görev raporunu açıklar. [Koloni simülasyonu](./mars-koloni.mjs) ve [atölye kuralları](./mars-atolye.mjs) doğrudan incelenebilir.

### Demo dosyaları

| Dosya | İçerik |
| --- | --- |
| [AY-KRATER-EKOSISTEM.html](./AY-KRATER-EKOSISTEM.html) | Ay/Mars krater ekosistemi, ECLSS, FPS (599 KB) |
| [MARS-KOLONI-FPS.html](./MARS-KOLONI-FPS.html) | Jezero kolonisi, tam FPS ve yaşam desteği (18 MB) |
| [MARS-JEZERO-EKIP.html](./MARS-JEZERO-EKIP.html) | Ekip yönetimi sürümü (18 MB) |
| [MARS-JEZERO-HIDROPONIK.html](./MARS-JEZERO-HIDROPONIK.html) | Hidroponik tarım sürümü (14 MB) |
| [MARS-JEZERO-ASTRONOT.html](./MARS-JEZERO-ASTRONOT.html) | Astronot görev sürümü (17 MB) |
| [JEZERO-EKOSISTEM.html](./JEZERO-EKOSISTEM.html) | Jezero ekosistem sahnesi (9 MB) |
| [JEZERO-KRATERLI-ARAZI.html](./JEZERO-KRATERLI-ARAZI.html) | Kraterli arazi testi (9 MB) |
| [MARS-KOLONI.html](./MARS-KOLONI.html) | Koloni kurma demosu (13 MB) |
| [GOREV-DEMO.html](./GOREV-DEMO.html) | Görev ve simülasyon demo ekranı |
| [index.html](./index.html) | AY-KRATER ile aynı (hızlı açılış) |

3B modeller `mars-modelleri/` klasöründe (GLB), simülasyon ve araç kaynakları `*.mjs` dosyalarında bulunur.

## Ortak iniş verisi

Emre üretir, Samet aktarır, İlhan koloni başlangıcında okur. İlk entegrasyon için aynı örneği kullanın. Sayılar oyun birimidir.

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

- [Gerçek Mars arazi verisi ve 3D üs modellerini hazırla](https://github.com/NASAYarismasi/-lhan/issues/1)
- [3D üs kurma ve astronot atamayı geliştir](https://github.com/NASAYarismasi/-lhan/issues/2)
- [Kaynak simülasyonu, fırtına ve koloni sonucunu geliştir](https://github.com/NASAYarismasi/-lhan/issues/3)
