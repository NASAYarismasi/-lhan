# Görev simülasyonu

Yerel demo için `GOREV-DEMO.html` dosyasını tarayıcıda aç. Modül ve veri HTML’ye gömülüdür, demo çevrimdışı çalışabilir.

## Oyun ekranına bağlama

`gorev-simulasyonu.mjs` dosyasını projenin kaynak klasörüne ekle. Ekrandaki seçimleri aşağıdaki anahtarlarla gönder. Örnek proje yolu dosyanın konumuna göre değişebilir.

```js
import { simulateMission } from "./gorev-simulasyonu.mjs"

const report = simulateMission({
  objective: "detail",
  orbit: "low",
  camera: "narrow",
  launcher: "dedicated",
  antenna: "highRate",
  storage: "standard",
  days: 3,
  imagesPerDay: 4,
})
```

| Alan | Seçenekler |
| --- | --- |
| `objective` | `coverage`, `detail` |
| `orbit` | `low` (50 km), `high` (100 km) |
| `camera` | `wide`, `narrow` |
| `launcher` | `shared`, `dedicated` |
| `antenna` | `standard`, `highRate` |
| `storage` | `standard`, `expanded` |
| `days` | 1–12, tam sayı |
| `imagesPerDay` | 1–8, tam sayı |

- `report.status` sonucu verir. Olası durumlar `success`, `objective-missed` ve `preflight-failed`.
- `report.resources` kullanılan kaynakları ve sınırlarını içerir.
- `report.observation` seçilen yörüngedeki görüntü ölçeğini, çekim şeridini ve hedef görüntü sayısını verir.
- `report.timeline` her günün çekilen, gönderilen, depoda kalan, yer olmadığı için kaydedilemeyen ve gözlem penceresi olmadığı için atlanan çekimlerini içerir.
- `report.issues` oyuncuya gösterilebilecek Türkçe başarısızlık nedenlerini içerir. Geçersiz seçim veya sayı `RangeError` üretir.

## Jüri demosu

Yukarıdaki senaryoda standart anteni seçerek 6/12 görüntünün ulaştığını göster. Yüksek hızlı anten 12/12 görüntü iletir, ancak güç 80 W ve bütçe 110 kredi sınırına gelir. Standart antenle görevi altı güne uzatmak da 12 görüntüyü iletir.

## Modelin dayanağı

50 km irtifadaki kamera çözünürlükleri ve çekim şeridi genişlikleri [NASA PDS LRO/LROC](https://pds.nasa.gov/ds-view/pds/viewProfile.jsp?dsid=LRO-L-LROC-2-EDR-V1.0) verisinden alınmıştır. 100 km değerleri basit bir irtifa oranıyla hesaplanır. İletişim pencereleri, çekim fırsatları, kütle, güç, bütçe ve görev hedefleri oyun modelinin varsayımlarıdır. Simülasyon önce günlük çekimleri depolar, ardından o gün aktarılabilen görüntüleri gönderir.
