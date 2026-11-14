# Mars’a İlk Koloni — Koloni ve Kaynaklar

**Sorumlu: İhan · Görev 2**

Mars’a ulaşan üç astronotun yanlarında getirdikleri ekipmanla üs kurabildiği yüzey bölümünü geliştir.

- [ ] Küçük bir ızgarada envanterden yaşam modülü, güneş paneli, batarya, oksijen ünitesi, su geri dönüşümü ve sera kurulabilsin.
- [ ] Üç astronotu inşaat, bakım veya üretime ata. Her sol enerji üretimini ve tüketimini, erzak tüketimini ve kalan stokları hesapla.
- [ ] Bir toz fırtınasında panel üretimini düşür. Oyuncu enerjiyi yaşamsal sistemlere öncelik vererek dağıtabilsin.
- [ ] İlk sürümü 10 solda bitir. Kazanmak için üç astronot hayatta kalmalı ve son üç solun her birinde temel ihtiyaçlar karşılanmalı. Sonucu ve nedenlerini Samet’in rapor ekranına ver.

**İlk teslim:** Örnek iniş verisiyle üç sol ilerletilebilen koloni. Yeterli ve yetersiz enerjiyle birer deneme yapın.

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

