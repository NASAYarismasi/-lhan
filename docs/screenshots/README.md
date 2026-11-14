# Görev görüntüleri

Görüntüler Playwright Chromium / ANGLE SwiftShader ile 1440×900 çözünürlükte gerçek simülasyon adımlarından alındı. Komutlar normal oyun kontrolleridir; faz, konum veya hız enjekte edilmedi. Her PNG'nin aynı adlı JSON'u SI telemetriyi, kamera bilgisini ve render sayaçlarını içerir.

| Görüntü | İçerik |
|---|---|
| [01-pad-chase.png](01-pad-chase.png) | T−10, LC-39B, takip kamerası |
| [02-liftoff-ground.png](02-liftoff-ground.png) | T+8 s, 5 km uzaktan yer takip kamerası |
| [03-max-q-chase.png](03-max-q-chase.png) | Yaklaşık T+56,6 s / 29,0 kPa, Max-Q |
| [04-srb-separation.png](04-srb-separation.png) | T+128,8 s, balistik ayrılan SRB'ler |
| [05-orbit-onboard.png](05-orbit-onboard.png) | ~186 km yörünge, üç kişilik kabin ve gerçek Dünya ufku |
| [06-cruise-map.png](06-cruise-map.png) | ~109. gün, sim gezegen konumları ve Hohmann yayı |
| [07-edl-plasma.png](07-edl-plasma.png) | ~65,7 km, Mach 17,3, 18 kW/m² anlık ısı akısı |
| [08-touchdown.png](08-touchdown.png) | Mars yüzeyi, 1,50 m/s güvenli temas |
| [09-earth-orbit-map.png](09-earth-orbit-map.png) | Ek: Dünya yörüngesi, gerçekleşen iz ve öngörülen yörünge |
| [10-powered-descent.png](10-powered-descent.png) | Ek: ~35 m, retro egzoz ve son yaklaşma |

Son doğrulama: **39 Vitest testi**, üretim derlemesi, tam uçuş/iniş ve temel kontroller geçti. [Tarayıcı hata kaydı](browser-errors.json) boştur. FPS sayıları yazılım tabanlı SwiftShader'a aittir; gerçek dizüstü GPU performansı ölçülmedi. Görsel/model sınırlamaları [RENDERING.md](../RENDERING.md), lisanslar [ASSETS.md](../../ASSETS.md) içinde.
