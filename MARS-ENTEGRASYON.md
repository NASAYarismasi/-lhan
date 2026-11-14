# Mars’a İlk Koloni

**İhan · Görev 2.** [Issue 1](https://github.com/NASAYarismasi/-lhan/issues/1) · [Issue 2](https://github.com/NASAYarismasi/-lhan/issues/2) · [Issue 3](https://github.com/NASAYarismasi/-lhan/issues/3)

## Çalıştırma

**Yaşam desteği demosu.** `MARS-JEZERO-YASAM-DESTEGI.html` dosyasını aç. Dünya yük planında erzak ve cihazları seç, kütleyi kontrol et ve Mars operasyonunu başlat. İki güneş paneli, iki batarya ve diğer tüm cihazları uygun zemine kur. İlk sol üç astronotu inşaata ata. İkinci sol kalan cihazları kurmak için en az iki astronotu inşaata ver. Tarım için üretim, panel bakımı için bakım görevini kullan.

Tariflerde yetiştirme süreleri oyun süresidir. Yüzey yük ağırlıkları, enerji, su geri kazanım oranı ve stok miktarları senaryo varsayımlarıdır. Yüzey kaynak birimi kişi-sol, uçuş JSON’u ise ekip-günü olarak ele alınır. Yüzey kütle hesabında bir sol yaklaşık 1,0275 Dünya günü olarak alınır. Kurgu Mars görevinin yaşam desteği [ISS ECLSS](https://www.nasa.gov/reference/environmental-control-and-life-support-systems-eclss/) ve [Apollo su ve yemek düzeni](https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-022-apollo-lunar-lander.pdf) üzerinden modellenmiştir. Transfer erzak tahmini için [NASA tüketim referansı](https://ntrs.nasa.gov/citations/20160005782) kullanılmıştır.

Bu sürümde yürüme ve yerleştirme yüzeyi Jezero [HiRISE DTM](https://www.uahirise.org/dtm/dtm.php?ID=ESP_048842_1985) yaklaşık 1 metre örnek aralığındaki merkez kesitinden gelir. Çevre daha seyrek örneklenir. Renk verilmiş ortofoto aynı arazi kesitine hizalanır. Tarım, maden ve bina yerleri oyun senaryosudur. Önceki MOLA GLB’si arşivde tarihsel model olarak bulunur.

Güncel ekip demosu `MARS-JEZERO-EKIP.html` ile açılır. **Bilek ekranı** düğmesi veya FPS sahnesinde **Sol Alt** ile Samet’in kol geometrisine bağlanan telemetriyi aç. Ekran, koloninin anlık batarya, su, oksijen ve yiyeceğini gösterir. Varsayılan karakter olarak Emre’nin uçuş dalındaki NASA astronot GLB’si gömülüdür. [Samet’in bilek terminali](https://github.com/NASAYarismasi/Samet/commit/7710a26) · [Emre’nin uçuş sürümü](https://github.com/NASAYarismasi/Emre/commit/83a2cb7)

**İniş verisi** alanına Emre’nin `getTelemetry().landingPayload` nesnesinin JSON çıktısını yükle. Kaynaklar, yük listesi, mürettebat sağlığı ve yüzey enerjisi bu veriden gelir. `createColonyFromFlight(payload)` yalnızca su, oksijen ve yiyeceği ekip-gününden kişi-gününe çevirir. Örnek demo mevcut oyun birimlerini kullanır. Saha tercihi ekranda gösterilir. Demo aynı Jezero kesitinde çalışır.

`MARS-KOLONI.html` dosyasını Edge veya Chrome’da aç. Demo çevrimdışı çalışır. Perseverance modelini sahneye eklemek için ilgili düğmeyi kullan. Modüller 3B sahnede zemindeki seçilen noktaya yerleştirilir. Güneş paneli yaşam modülünün üstündeki işaretli platforma da oturur.

**Birinci şahıs görünümü.** Astronotu seçip **Astronotun gözünden gez** düğmesine bas. WASD ile yürü. Fareyle bakmak için sahneye tıkla veya ok tuşlarını kullan. Zeminde istediğin noktayı hedefle ve E’ye bas. Çatı için yaşam modülüne bakıp R’ye bas, paneli istediğin noktaya nişanla ve E ile yerleştir. R ile yere in, Esc ile üs planına dön.

**Ekip karakterleri.** Astronotu seç, **Ekip karakteri yükle** bölümünden dokuları içine gömülü bir GLB aç. Demo modeli 1,88 metreye ölçekler ve seçilen astronota atar. Diğer astronotun gözünden baktığında yüklenen modeli sahnede görebilirsin. Dosyalar mevcut tarayıcı oturumunda kullanılır. FPS kontrolü `work/mars-fps.mjs`, sahne ve karakter yükleme `work/mars-demo.mjs` içindedir.

1. Hazırlıklı turda envanterdeki altı modülü çakışmayacak noktalara yerleştir. Sol 1’de üç astronota inşaat görevi ver.
2. Sol 2–10 arasında her seferinde bir astronota üretim, birine bakım görevi ver ve **Bir sol ilerlet** düğmesine bas. Yaşam desteği önceliği açık kalsın.
3. Hazırlıksız tur için **Yeniden başla** ve bataryayı envanterde bırak. Aynı atamaları yap. Fırtına 5–8. sollarda panel üretimini düşürür. Son üç solun ihtiyaçları raporda ayrı ayrı değerlendirilir.

## Ortak veri ve sonuç

**Atölye.** `MARS-KOLONI-FPS.html` sürümünde maden ve buz yatakları her sol bir kez toplanabilir. Atölyede buzdan tarım suyu, işlenen astronot atığından kompost üretilir. Gelir görev kredisi olarak tutulur. Mahsul teslim edilebilir veya erzağa aktarılabilir. Patates kabini başlangıçta, fasulye seviye 2’de, bodur elma seviye 3’te açılır. Kabinler seranın çalıştığı sollarda büyür. Bir kabini yerleştirdikten sonra etkinleştirmek için inşaat ataması gerekir. Atölye durumu ve tarifler `outputs/mars-atolye.mjs` içindedir. Biyolojik süreçler, hasat süreleri ve fiyatlar oyun değerleridir.

`createColony(landing)` README’deki ortak iniş nesnesini alır. `exampleLanding` aynı alanları ve örnek değerleri içerir. İşlemler yeni durum döndürür. Astronot görevleri her sol sonunda sıfırlanır.

```js
import {
  createColony, placeModule, assignAstronaut, advanceSol, colonyReport,
} from "./mars-koloni.mjs"

let state = createColony(landingFromEmre)
state = placeModule(state, "habitat-1", { x: 1.25, z: 2.8 })
state = placeModule(state, "solarPanel-1", { x: 1.35, z: 2.8, supportId: "habitat-1" })
state = assignAstronaut(state, state.crew[0].id, "construction")
state = advanceSol(state, { prioritizeLifeSupport: true })
const reportForSamet = colonyReport(state)
```

Rapor alanları `status` (`in-progress`, `success`, `failed`), `completedSols`, `crew` (kimlik, sağlık, hayatta mı), `lastThreeSols` (sol ve ihtiyaç durumları) ve `reasons`. `placementError(state, itemId, { x, z, supportId })` önizleme ve Türkçe hata mesajı için kullanılabilir. Dünya koordinatları metre cinsindendir. `supportId` yalnızca çatı montajında yaşam modülünün kimliğini taşır. Önceki sayısal hücre çağrıları desteklenir. Aynı türde birden fazla yük gelirse her envanter kopyasının ayrı bir kimliği vardır. `state.timeline` sol bazında üretim, tüketim, batarya ve stokları içerir.

## GLB kaynakları ve ölçek

- **Arazi · Jezero Krateri.** [NASA Mars Trek](https://trek.nasa.gov/mars/) bölge seçimi ve inceleme için referanstır. Yükseklik örnekleri [NASA PDS MGS/MOLA MEGDR](https://pds-geosciences.wustl.edu/missions/mgs/megdr.html) 128 piksel/derece topografya katmanının [megt44n000hb](https://pds-geosciences.wustl.edu/mgs/mgs-m-mola-5-megdr-l3-v1/mgsl_300x/meg128/megt44n000hb.lbl) parçasından alındı. Piksel merkezleri 18.33984–18.52734° K, 77.08203–77.26953° D. Kesit 25 × 25 örnek, yaklaşık 10,54 × 11,11 km. Örnek aralığı yaklaşık 439 m doğu-batı ve 463 m kuzey-güney. Eksenler X doğu, Y yukarı, Z güney. `jezero-mola.glb` metre birimindedir. En düşük yükseklik taban kabul edildi (−2280 m), 584 m bağıl kabartma korundu, örneklere üçgen yüzey ve sentetik renk atandı. Demo bu arka planı 0,011 ölçeğinde gösterir. Ön plandaki yapı alanı oyun geometrisidir. Eğim, modülün tabanındaki yerel yükseklik farkından hesaplanır.
- **Yaşam modülü.** NASA/LaRC [Habitat Demonstration Unit](https://science.nasa.gov/3d-resources/habitat-demonstration-unit/) orijinal GLB’si oyunda 5,12 m genişliğe ölçeklenir. Üstteki işaretli platform ve taşıyıcılar oyun için eklendi.
- **Güneş paneli.** NASA/Brian E. Kumanchik [InSight Cruise Lander](https://science.nasa.gov/3d-resources/insight-cruise-lander/) GLB’sindeki sol güneş dizisi sahnede ayrılır ve 2,18 m genişliğe ölçeklenir. Tam InSight modeli de sahnede 6 m genişlikte gösterilir.
- **Diğer üs donanımı.** Batarya, sera, su dönüşümü ve oksijen ünitesi oyun için hazırlanan konsept modellerdir. Oksijen üretimi [NASA MOXIE](https://science.nasa.gov/mission/mars-2020-perseverance/science-highlights/) deneyinden esinlenir.
- **Perseverance.** [NASA/JPL 3D Resources](https://science.nasa.gov/3d-resources/mars-2020-perseverance-rover/) arşivinden özgün GLB. Kaynak dosya olduğu gibi saklandı, demo sahnesinde görüntüleme için ölçeklendirildi. [NASA medya kullanım kuralları](https://www.nasa.gov/nasa-brand-center/images-and-media/) geçerlidir.
- **Üretim.** GLB’ler Three.js ile üretildi ve Blender’a glTF 2.0 olarak içe alınabilir. Blender düzenleme adımı gerçekleştirilmedi. Enerji, erzak ve fırtına sayıları oyun birimleridir. Tozun güneş üretimini düşürmesi için [NASA Mars Surface Power Considerations](https://www.nasa.gov/wp-content/uploads/2024/12/acr24-mars-surface-power-decision.pdf) kullanıldı.
