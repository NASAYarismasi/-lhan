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

## 3D kalkış prototipi

```powershell
npm ci
npm run dev
```

Terminaldeki yerel adresi açın. Modeli fareyle döndürün, **Kalkışı başlat** ile 3D fırlatmayı izleyin ve kabinde **Kol bilgisayarını aç** ile görev süresini kontrol edin. **Görevi sıfırla** rampaya dönüyor.

SLS ve Orion, README’deki NASA STL kaynaklarından Blender’da sadeleştirilip GLB’ye çevrildi. NASA astronot GLB’si kendi Draco sıkıştırmasıyla yüklü. Bu önizleme için yaklaşık model ölçekleri ve animasyon profili kullanılıyor. Kol bilgisayarı şimdilik süre ve aktif adımı gösteriyor. Mars inişi ve fizik hesabı sonraki aşama.

