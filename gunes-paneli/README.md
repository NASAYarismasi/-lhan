# Güneş paneli — ayrı kaynak dosyaları

Bu klasör ayrı bir modüldür. Mevcut ekosistem HTML'si ve kaynak dosyaları değiştirilmemiştir.

- solar-farm.mjs: güneş masaları, hücre dokuları, taşıyıcılar, kablolar ve ayrı batarya grubu.
- enerji-paneli.html: isteğe bağlı enerji hesabı arayüzü parçası. Ekosistemin panel/metric-grid/bar stillerini kullanır.

## Sahneye sonradan eklemek için

Three.js 0.187.0 kullanan ES modül projesinde:

```js
import { createSolarFarm, SOLAR, energyBalance } from './gunes-paneli/solar-farm.mjs';

const farm = createSolarFarm(scene, getTerrainHeight, baseObstacles);
```

scene mevcut Three.js sahnesi; getTerrainHeight(x,z) metre cinsinden yüzey kotu döndüren fonksiyon; baseObstacles FPS çarpışmaları için kullanılan Box3 listesidir (FPS yoksa boş dizi verilebilir). Modül kendi kamerasını, renderer'ını veya animasyon döngüsünü oluşturmaz. Kamera ayarı ve enerji-paneli.html parçasının eklenmesi geliştiricinin kontrolündedir. Enerji arayüzü eklenmezse 3D tarla yine oluşturulur.

Tarla merkezi (-62,52) konumundadır. Paneller için bu merkez çevresinde en az 50×58 m düz arazi gereklidir; yan batarya alanıyla toplam yaklaşık 66×58 m boş alan ayrılmalıdır. Modül arazi geometrisini düzleştirmez ve mevcut taşları silmez. Zemini düzleştirmek/taşları temizlemek, gerekiyorsa ev sahibi sahnede ayrı yapılmalıdır. Bataryaların ayakları sağlanan yükseklik fonksiyonuna göre oturur. Tabela ve zemini örten platform içermez.

## Ölçüler ve ön hesap

42 masa × 10 panel × 2 m² = 420 panel, 840 m² aktif yüzey. 10 kavramsal batarya kabini × 25 kWh = 250 kWh nominal kapasite.

840 × 2,5 kWh/m²/sol × %25 panel verimi × %80 sistem çarpanı = 420 kWh/sol. 413 kWh/sol örnek bütçeye göre yalnızca 7 kWh fazla. Fırtına düğmesi örnek olarak üretimi %80 düşürür; 84 kWh/sol üretim ve 329 kWh/sol açık verir.

Bataryanın çıkışta kullanılabilir enerjisi 250 × 0,8 × 0,9 = 180 kWh. Örnek gece tüketimi 10,7 × 12,33 ≈ 132 kWh.

Değerler seçilmiş tasarım varsayımlarıdır, Mars'ta doğrulanmış üretim garantisi değildir. Yerel ışınım, gölgelenme, batarya kütlesi ve termal ihtiyaç ayrıca doğrulanmalıdır. Enerji paneli mevcut yaşam destek simülasyonunun tüketimini otomatik hesaplamaz.
