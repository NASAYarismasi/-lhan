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

İlk sürüm için düz JavaScript modülleri kullanın. Ortak alanları değiştirmeden önce üç kişi birlikte karar versin.

[Ekip repoları](https://github.com/orgs/NASAYarismasi/repositories)

