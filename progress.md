Original prompt: tamam hadi başlayalım. gözle görülür bişey oluşsun. geliştirelim

- SLS, Orion ve NASA astronot modelleriyle 3D kalkış ve kabin prototipi.
- Sırada Mars inişi, ortak iniş verisi ve koloni kaynakları.

- Playwright ile GLB yükleme, kalkış ve transfer geçişi kontrol edildi. NASA astronot modeli yerel Draco çözücüsü ile yükleniyor.
- Birinci şahıs kamera, WASD, klavyeyle bakış, mesafeye bağlı E etkileşimi, kabin güç görevi ve Q ile kol bilgisayarı eklendi. Playwright yürüyüş, panel mesafesi, kalkış, güç ve sıfırlamayı doğruladı.
- Dış, kabin ve rota kameraları, egzoz, hesaplanan Hohmann transferi ve temsili Mars inişi eklendi. Playwright kamera, duraklatma ve tam uçuş akışını doğruladı.

## Task 1 — Foundation (2026-11-14)

- Request: replace fake launch/timed phases with deterministic 50 Hz physics, architecture boundaries, real SLS data, atmospheres, orbital mechanics, Hohmann transfer, lifting Mars EDL, mission/consumables and README landing payload; meaningful Vitest tests and Turkish PHYSICS.md; no visual polish or commits.
- Added core loop/store/rebindable input; pure sim modules; sourced SLS/Orion and explicit transit/lander assumptions. Moved Three.js into src/render and HUD into src/ui. Removed src/flight.js and fixed-duration phase animation. main.js is the application composition root.
- Reference ascent: max-Q 56.58 s / 29.008 kPa; SRB separation 126.02 s; insertion 469.02 s into 180.04 x 195.87 km; max 3.8006 g. Core shuts down early by guidance; approximately 49.3 t remains in discarded core. Approximate SRB envelope leaves ~2.2 t residual.
- Standalone EDL: touchdown 1.5003 m/s, ~4.96 t propellant remaining. Full mission including deorbit: ~4.39 t. Gross 3-crew metabolic consumption over 259 d: 652.68 kg oxygen, 2735.04 kg water, 481.74 kg food.
- Important source discrepancy: actual NASA Glenn Mars fit gives 0.01503 kg/m³ surface density, not generic 0.020. Test verifies the published equation; docs explain the difference.
- Browser client from develop-web-game skill ran. Full separate Playwright flow also passed launch, safe warp, orbit, pause, cabin power/watch, TMI, actual ~259 d cruise consumption, MOI warp downgrade, deorbit/EDL, landing payload, reset; no new console/page errors. Screenshots inspected under ignored output/.
- Fixed initial RAF negative delta under virtual-time tooling, deterministic advanceTime request completion, and high-warp residual time safety at engine ignition.
- Next task: visuals only. Existing Orion GLB temporarily represents the Mars lander; planet/landing visuals remain scaled. Finite TMI/MOI trajectory integration, real ephemerides, 3D inclination, weather, heat-shield sizing, terrain and closed-loop life support remain out of scope. Patched-conic maneuver fuel/time and ideal engines are documented assumptions, not validated hardware.
- Controls: B starts TMI in parking orbit or deorbit in Mars orbit; MOI starts at calculated arrival; T cycles allowed warp, P pauses. README JSON shape unchanged; 1 supply game unit = 1 whole-crew day for that resource.
- Final verification: 8 Vitest files / 33 tests passed; npm run build passed (existing Three.js bundle-size advisory only); git diff --check passed. Latest full browser run passed with no errors. No commit or push performed. Dev server for this session is http://127.0.0.1:5175/.
