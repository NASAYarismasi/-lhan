# Görsel uçuş katmanı

`src/main.js` yalnızca `bootstrap()` çağırır. `src/core/app.js` komutları, 50 Hz simülasyonu, bağımsız anlık görüntüleri ve çizimi bağlar. Fizik çekirdeği, kütle muhasebesi, görev geçişleri ve ortak iniş JSON sözleşmesi korunur.

## Zaman, koordinatlar ve sahiplik

- `captureRenderState()` simülasyondaki gerçek konum/hız vektörünü, kademe bağlantılarını, atmosferi, olayları ve orbital elemanları kopyalar. Render kodu canlı görev nesnesine erişmez.
- `interpolateState(previous, current, alpha)` konumu, yönelimi, zamanı, gezegen konumlarını ve ayrılan parçaları enterpole eder. Referans çerçevesi değişen fazlar arasında enterpolasyon yapılmaz.
- Yerel araç sahnesi metre ve Y-yukarı kullanır. GPU'ya yüklenmeden önce çift duyarlıkta araç konumu çıkarılır, gözlemcinin radyal/teğetsel tabanına dönülür. Gezegenler gerçek yarıçaplıdır; logaritmik derinlik tamponu kullanılır. Yerel rampa yüzeyi, küresel düşük detay yüzeyinin hemen üstündedir.
- Seyirde uzaktaki gezegenlerin konum farkı **ve yarıçapı birlikte** 10⁻⁵ ile ölçeklenir; açısal boyut korunur. Harita ayrı ölçekli sahnedir; heliosentrik harita gezegen simgelerini görünürlük için büyütür.
- `sceneManager` etkin sahnenin `enter(ctx)`, `update(state, alpha)`, `exit()` yaşam döngüsünü yönetir. Geometriler, malzemeler, shader doku birimleri, gölge hedefleri ve dinleyiciler temizlenir. Paylaşılan kaynak GLB/dokuların sahibi varlık önbelleğidir; uygulama kapanınca onlar da bırakılır.
- Dumanın yayıldığı konumlar sabit fizik döngüsünden 5 Hz'de örneklenir. Parçacıklar dünyaya bağlı konumlarını korur; yaşlanma simülasyon saatine bağlıdır. Görsel rüzgâr/buoyancy, türbülans ve toz kuvvet çözümü değildir.

## Kontroller ve demo akışı

1. **Geri sayımı başlat** veya **Boşluk/E**: T−10. RS-25 başlangıcı T−6,5; SRB ateşleme/kalkış T0. `src/sim/countdown.js` saf ve testlidir. Geri sayım beklemesinde uçuş yakıtı tüketilmez; bu terminal motor başlangıcının görsel/sekans yaklaşımıdır.
2. **1–6** doğrudan kamera seçer; **C** sıradaki kamerayı seçer. Takip kamerası fare sürükleme/tekerlek ile kontrol edilir. Kabin kameraları üç mürettebatı, canlı CanvasTexture ekranlarını ve aynı dış gezegen sahnesini gösterir.
3. **, / .** hız azaltır/artırır, **T** hız artırır. 10× üstü motor kapalı/atmosfer dışı koşuluna tabidir. **B** Dünya park yörüngesinde TMI, Mars yörüngesinde deorbit başlatır. Varış/MOI otomatiktir.
4. **A** yalnızca kalkış/TMI/MOI'de manuel gaz kolunu açar. **Shift/Ctrl** artırır/azaltır, **Z/X** tam/kes. SRB ve EDL gazı kullanıcı kontrolünde değildir. Varsayılan kılavuzlama otopilottur.
5. **Esc/P** duraklatır; menüden kalite, uyarlama, ses ve sıfırlama seçilir. **H/Q** yardım, **M** ses, **F** tam ekran.

`window.advanceTime(ms)` aynı fizik adımlarını tamamlar ve gerçek zamanlı fizik akışını test süresince durdurur. Kamera/çizim RAF'ı çalışır. `window.missionControl` yalnızca normal kullanıcı komutlarını sunar; faz/konum ayarlayıcısı yoktur. `render_game_to_text()` SI telemetri, kamera, geri sayım, hız, kalite ve GPU sayaçları verir.

## Görsel ve ses yaklaşımı

ACES/sRGB, fiziksel ışıklandırma, rampa gölgeleri, UnrealBloomPass, FXAA, hafif gren/vinyet. Kamera ivme ve dinamik basınca bağlı küçük sarsıntı uygular. Güneş yönü yaklaşık bir aydınlatma yönüdür; takvim ephemerisi değildir.

NASA SLS tek parça geometrisi uzamsal olarak SRB/ana gövde/ICPS/Orion/LAS bölümlerine ayrılır. LOD seçimi kamera görüş açısını hesaba katar; uzun lens gerçek detayını korur. Ayrılan parçalar `src/sim/debris.js` içinde ters-kare yerçekimi ve varsayılan ayrılma impulsu/açısal hızıyla ilerler. Ana uçuşun kütle/yörüngesini değiştirmezler. Aerodinamikleri ve yere çarpmaları modellenmez; 90 s sonra bırakılırlar.

Altı başlangıç motoru için ayrı shader plume vardır; ortam basıncı azaldıkça genişler. SRB turuncu-beyaz, hydrolox mavi-mor ve düşük irtifada Mach elmaslıdır. Mach 0,9–1,1 civarında yoğuşma, EDL'de anlık Sutton–Graves ısı akısından plazma, motorlu inişte retro egzoz/toz gösterilir. Bunlar mühendislik CFD/ışınım çözümleri değildir.

WebAudio gürültü kaynakları rumble/crackle üretir. Yer kamerası geçmiş itki örneklerini mesafe/343 s gecikmeyle duyar; kabin filtrelenmiş titreşim duyar. Atmosfer dışında dış kamera sessizdir. İşitsel yayılım hava sıcaklığı/rüzgârını çözmez.

## Performans ve sınırlar

Statik rampa kafesleri malzemeye göre birleştirilir; scrub/kayalar instancing kullanır. Parçacık sayısı sınırlıdır. Düşük/Orta/Yüksek piksel oranı tavanları 0,8/1,15/1,6; düşük ayarda bloom/gölge kapalıdır. Otomatik kalite uzun süreli yavaşlamada çözünürlüğü düşürür. **60 FPS hedeftir; gerçek orta sınıf dizüstünde ölçüm yapılmadı.** SwiftShader doğrulaması görsel/doğruluk içindir.

Bulut haritası, LC-39B ayrıntıları, Mars lander ve yerel Mars arazisi prosedürel/temsili. Gerçek Mars DEM/normal haritası yoktur. Kabin ölçüleri ve astronotların verteks tabanlı oturma pozu yaklaşık, rig animasyonu değildir. Atmosfer tek saçılma benzeri rim/yoğunluk yaklaşımıdır; hacimsel bulut/soft-depth parçacık çözümü değildir. TMI/MOI'nin temel modeldeki darbeli manevra yaklaşımı devam eder; ayrı ayrıntılı NTR dış modeli yoktur.

## Doğrulama

`npm test`, `npm run build`. Tarayıcı akışı: `npm run preview -- --host 127.0.0.1 --port 5177`, sonra `node scripts/render-qa.mjs`. Playwright yolu bu çalışma ortamındaki beceri kurulumuna aittir; başka makinelerde import yolunu uyarlayın. `GAME_URL` ile dev/preview adresi değiştirilebilir.

QA gerçek görev adımlarından görüntü alır, sim durumuna faz/konum enjekte etmez. Ekran görüntüleri ve eşleşen telemetri `docs/screenshots/` içindedir; konsol hataları `browser-errors.json` dosyasındadır.
