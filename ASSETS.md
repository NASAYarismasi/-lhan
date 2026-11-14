# Görsel varlıklar ve kaynaklar

Bu görev yeni dış görsel varlık eklemez. Mevcut model dosyaları korunmuş ve çizim kodu `src/render/` altına taşınmıştır.

| Yerel dosya | Kaynak | Kullanım / değişiklik |
|---|---|---|
| `public/assets/sls.glb` | [NASA SLS Block 1](https://science.nasa.gov/3d-resources/space-launch-system-sls-block-1/) | Önceki prototipte NASA STL’sinden Blender ile sadeleştirilip GLB’ye dönüştürülmüş. |
| `public/assets/orion.glb` | [NASA Orion Capsule](https://science.nasa.gov/3d-resources/orion-capsule/) | Önceki prototipte NASA STL’sinden sadeleştirilmiş GLB. Mars inişinde yalnızca geçici temsili geometri; fizik aracı Orion değildir. |
| `public/assets/astronaut.glb` | [NASA Astronaut](https://science.nasa.gov/3d-resources/astronaut/) | Prototipte bulunan Draco sıkıştırmalı GLB; bu görevde değiştirilmedi. |
| `public/draco/*` | [Three.js Draco dağıtımı](https://github.com/mrdoob/three.js/tree/dev/examples/jsm/libs/draco) | Mevcut çözücüler, yerel `THREE-LICENSE.txt` korunur; çözücülerin üst bilgi lisansları geçerlidir. |

NASA tarafından üretilen modeller [NASA medya kullanım koşulları](https://www.nasa.gov/nasa-brand-center/images-and-media/) kapsamında eğitimsel gösterimde kullanılır. NASA adı, rozet ve amblemleri için ayrı marka sınırlamaları vardır; NASA desteği/onayı iddia edilmez. Kaynak sayfalarında belirtilen üçüncü taraf istisnaları varsa onlar geçerlidir.

Gezegen desenleri, yıldızlar, rampalar, kabin, duman ve alev geometrileri kodda programatik üretilir. Dış doku veya üçüncü taraf oyun kodu eklenmemiştir.
