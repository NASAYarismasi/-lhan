# Hava ve su sistemleri

Kök dizindeki `hava.html` ve `su.html` bağımsız 3D demolarıdır. Three.js ve modeller dosyaların içine paketlenmiştir. Mevcut ekosistem dosyaları değiştirilmez.

## Kaynaklar

- `hava.mjs`: oksijen üretimi, ekip tüketimi, CO₂ temizleme, rezerv ve hava tesisi modeli.
- `su.mjs`: buzdan su çıkarma, temiz/atık su, geri kazanım ve su tesisi modeli.
- `equipment-kit.mjs`: metal/yalıtım dokuları, mekanik parçalar, kontrollü dirsekler, flanşlar ve göstergeler.
- `demo.mjs`: kamera, Mars zemini, ışık, arayüz ve çalışma kontrolleri.
- `hava-kaynak.html`, `su-kaynak.html`: düzenlenebilir ekranlar.

Sistemi ilerlet düğmesi seçilen süreyi hesaplar; görünüm animasyonları gerçek zamanda çalışır. Gücü kes, sonraki hesap adımı için ayrılan elektriği sıfırlar. Sıfırla simülasyonu ve kamerayı başlangıca döndürür.

## Yeniden derleme

Bu klasörde `npm install`, ardından `npm run build`. Kök dizindeki iki HTML yenilenir. `npm run dev` ile kaynak ekranları yerel sunucuda açabilirsiniz.

## Entegrasyon

`createAirSystem(scene, {x,z,heightAt})` ve `createWaterSystem(scene, {x,z,heightAt})` mevcut Three.js sahnesine model ekler. Dönen nesneler `group`, `update(state)`, `frame(time, deltaSeconds)` ve `dispose()` içerir. Zaman birimleri: model animasyonunda saniye, `stepAir`/`stepWater` hesaplarında saat.

`createAirState()` / `createWaterState()` başlangıç verisi verir. `stepAir(state,hours,{powerKW,plantsKgHour})` ve `stepWater(state,hours,{powerKW,extract,recycle})` yeni durum döndürür. Bir adım 0–24,66 saat aralığındadır. Ortak iniş JSON'u bu modüller tarafından değiştirilmez; bağlantı ev sahibi sahneye bırakılmıştır.

## Bilimsel sınırlar

Görseller kavramsal mühendislik modelleridir. Hava üretim varsayımı toplam 0,108 kg O₂/saat ve 2,7 kW'tır: dokuz küçük MOXIE'nin zirve hızının sürekli sağlandığı varsayımıdır; böyle bir yaşam destek tesisi Mars'ta doğrulanmış değildir. Fan ve CO₂ temizleyici tüketimleri ön tasarım değeridir. Kabin basıncı, sıcaklığı, nemi, gaz karışımı ve gerçek güvenlik eşikleri simüle edilmez. CO₂ değeri sistemde kalan kütledir; ppm veya güvenlik göstergesi değildir.

Su çıkarma 2 kW ile 20 L/6 saat; hammadde buz oranı %50, yakalama verimi %80 kabul edilir. Geri kazanım %85, ünitesi 0,3 kW ve 5 L/saat kabul edilir. Kirletici türleri, kazı direnci ve ısıtma başlangıcı ayrıntılı modellenmez. İnsan tüketim değerleri Dünya günü üzerinden saatlik hesaplanır. Su/O₂ tüketim ve kayıpları vardır; bu modüller eksiksiz bir koloni tasarımı veya gerçek yaşam desteği yeterlilik garantisi değildir.
