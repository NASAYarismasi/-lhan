// Reference data for UI explanations only. Never drives İhan's colony rules.
import { SOL } from '../sim/landingPayload.js';

export const REALISM_SOURCES = Object.freeze({
  bvad: { label: 'NASA BVAD · NASA/TP-2015-218570', url: 'https://ntrs.nasa.gov/citations/20150002905' },
  moxie: { label: 'NASA/JPL · MOXIE, 6 Eylül 2023', url: 'https://www.nasa.gov/solar-system/nasas-oxygen-generating-experiment-moxie-completes-mars-mission/' },
  solar: { label: 'NASA · Mars yüzey güç sistemleri', url: 'https://ntrs.nasa.gov/citations/19910057365' },
  earth: { label: 'NASA · Dünya bilgi sayfası', url: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html' },
  storm: { label: 'NASA · Opportunity ve 2018 fırtınası', url: 'https://science.nasa.gov/mission/mer-opportunity/' },
  mars: { label: 'NASA · Mars bilgi sayfası', url: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html' },
  gravity: { label: 'NASA/JPL · Gezegen fiziksel parametreleri', url: 'https://ssd.jpl.nasa.gov/planets/phys_par.html' },
  rems: { label: 'NASA/JPL · Curiosity REMS, Gale mevsimleri', url: 'https://www.jpl.nasa.gov/news/second-cycle-of-martian-seasons-completing-for-curiosity-rover/' },
});

export const REALISM = Object.freeze({
  // kg per person per Earth day; drinking/food-preparation water and dry food.
  // https://ntrs.nasa.gov/citations/20150002905
  crewKgPerEarthDay: Object.freeze({ oxygen: 0.84, water: 3.52, food: 0.62 }),
  // Mean sol, seconds; source and precision are shared with the handoff conversion.
  solSeconds: SOL,
  // https://www.nasa.gov/solar-system/nasas-oxygen-generating-experiment-moxie-completes-mars-mission/
  moxiePeakOxygenKgPerHour: 0.012,
  // Atmosphere-top mean irradiance, W/m²; not surface panel electrical output.
  // https://ntrs.nasa.gov/citations/19910057365
  marsSolarIrradiance: 590,
  // https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html
  earthSolarIrradiance: 1361,
  // Approximate equatorial surface gravity, m/s² (GM / equatorial radius²).
  // https://ssd.jpl.nasa.gov/planets/phys_par.html
  marsGravity: 3.71,
  // Rounded representative surface pressure, Pa; varies by altitude and season.
  // https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html
  marsSurfacePressure: 600,
  // Observed air-temperature range during Curiosity's first two Mars years, °C.
  // UI reference only, not a thermal simulation or a global Mars range.
  // https://www.jpl.nasa.gov/news/second-cycle-of-martian-seasons-completing-for-curiosity-rover/
  galeObservedAirCelsius: Object.freeze({ min: -100, max: 15.9 }),
});

const number = (value, digits = 2) => value.toLocaleString('tr-TR', { maximumFractionDigits: digits });

export const REALISM_NOTES = Object.freeze([
  {
    id: 'supplies', title: 'Erzak: kişi-sol ve kilogram', sources: ['bvad', 'mars'],
    // GAME ASSUMPTION: one colony supply unit is one person's requirement for one sol.
    text: `1 oyun erzak birimi = 1 kişinin 1 sollük ihtiyacı. NASA BVAD günlük referansı: kişi başına ${number(REALISM.crewKgPerEarthDay.oxygen)} kg O₂, ${number(REALISM.crewKgPerEarthDay.water)} kg içme/yemek hazırlama suyu ve ${number(REALISM.crewKgPerEarthDay.food)} kg kuru gıda. Bu oranlar Dünya günü içindir; uçuş–koloni devrinde daha uzun Mars solu hesaba katılır. Yedek parçalar adet, üretim ve geri dönüşüm kapasiteleri oyun değeridir.`,
  },
  {
    id: 'moxie', title: 'Oksijen: MOXIE ölçeği', sources: ['moxie'],
    text: `Perseverance üzerindeki MOXIE, en yüksek veriminde yaklaşık ${number(REALISM.moxiePeakOxygenKgPerHour * 1000)} g O₂/saat üretti. Bu bir teknoloji gösterimidir. Oyundaki oksijen ünitesinin kişi-sol üretimi, MOXIE’nin ölçülmüş kapasitesi değildir.`,
  },
  {
    id: 'solar', title: 'Güneş ve toz fırtınaları', sources: ['solar', 'earth', 'storm'],
    text: `Atmosferin üstünde ortalama güneş ışınımı Mars’ta yaklaşık ${number(REALISM.marsSolarIrradiance)} W/m², Dünya’da ${number(REALISM.earthSolarIrradiance)} W/m²’dir. Yüzeye ulaşan ışık ve panelin elektrik üretimi daha düşüktür; açı, mevsim, toz ve verime bağlıdır. Opportunity’nin 2018 küresel toz fırtınasında güneş enerjisi ciddi ölçüde azaldı. Oyunun enerji/batarya birimleri ve fırtına katsayıları sadeleştirilmiştir.`,
  },
  {
    id: 'environment', title: 'Mars’ta bir sol', sources: ['mars', 'gravity'],
    text: `Yüzey yerçekimi yaklaşık ${number(REALISM.marsGravity)} m/s²; temsilî yüzey basıncı yaklaşık ${number(REALISM.marsSurfacePressure / 1000)} kPa. Bir sol yaklaşık 24 saat 39 dakika 35 saniyedir. Basınç konuma ve mevsime göre değişir; bu değerler Jezero için canlı hava verisi değildir.`,
  },
  {
    id: 'temperature', title: 'Gale’de sıcaklık: Curiosity / REMS', sources: ['rems'],
    // https://www.jpl.nasa.gov/news/second-cycle-of-martian-seasons-completing-for-curiosity-rover/
    text: `Curiosity’nin ilk iki Mars yılında REMS, Gale’de ${number(REALISM.galeObservedAirCelsius.min)} °C ile +${number(REALISM.galeObservedAirCelsius.max)} °C arasında hava sıcaklığı ölçtü. Gündüz donma noktasının üzerine çıkan sıcaklık gece −90 °C’nin altına düşebilir. Bu gözlenen aralık tüm Mars’ın sınırları veya Jezero hava tahmini değildir. Hava ve zemin sıcaklıkları farklıdır; koloni sağlık ve sera kuralları ayrıntılı bir termal model içermez.`,
  },
]);
