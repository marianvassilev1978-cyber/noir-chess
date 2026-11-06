# Bot calibration log

Run 2026-11-06T13:28:36.926Z: 20 games per neighbouring pair (colours alternate), 2 pass(es), native Stockfish, same selection code as the app (src/botbrain.js).

## Pass 1 (measure + adjust) (37.8 min)

| Pair | Elo gap | Expected (stronger) | Observed | Skill gap | Verdict |
|---|---|---|---|---|---|
| bean (100) – pip (200) | 100 | 64% | 48% | 100 | too weak, widen |
| pip (200) – nell (300) | 100 | 64% | 63% | 100 | ok |
| nell (300) – otto (450) | 150 | 70% | 48% | 150 | too weak, widen |
| otto (450) – mila (600) | 150 | 70% | 55% | 150 | too weak, widen |
| mila (600) – teo (750) | 150 | 70% | 57% | 150 | ok |
| teo (750) – ravi (900) | 150 | 70% | 50% | 150 | too weak, widen |
| ravi (900) – ivo (1000) | 100 | 64% | 73% | 100 | ok |
| ivo (1000) – sara (1100) | 100 | 64% | 75% | 100 | ok |
| sara (1100) – bruno (1200) | 100 | 64% | 63% | 100 | ok |
| bruno (1200) – jules (1300) | 100 | 64% | 63% | 100 | ok |
| jules (1300) – vlad (1400) | 100 | 64% | 50% | 100 | ok |
| vlad (1400) – zorg (1500) | 100 | 64% | 63% | 100 | ok |
| zorg (1500) – wren (1600) | 100 | 64% | 68% | 100 | ok |
| wren (1600) – hana (1700) | 100 | 64% | 57% | 100 | ok |
| hana (1700) – ada (1800) | 100 | 64% | 60% | 100 | ok |
| ada (1800) – marco (1900) | 100 | 64% | 70% | 100 | ok |
| marco (1900) – nadia (2000) | 100 | 64% | 73% | 100 | ok |
| nadia (2000) – chen (2100) | 100 | 64% | 68% | 100 | ok |
| chen (2100) – elena (2200) | 100 | 64% | 57% | 100 | ok |
| elena (2200) – kofi (2350) | 150 | 70% | 45% | 150 | too weak, widen |
| kofi (2350) – magda (2500) | 150 | 70% | 65% | 150 | ok |
| magda (2500) – leon (2600) | 100 | 64% | 53% | 100 | ok |
| leon (2600) – boris (2700) | 100 | 64% | 53% | 100 | ok |
| boris (2700) – yara (2800) | 100 | 64% | 50% | 100 | ok |
| yara (2800) – atlas (2900) | 100 | 64% | 53% | 100 | ok |
| atlas (2900) – noir (3000) | 100 | 64% | 53% | 100 | ok |
| noir (3000) – max (3200) | 200 | 76% | 53% | 200 | too weak, widen |

## Pass 2 (verify) (41.6 min)

| Pair | Elo gap | Expected (stronger) | Observed | Skill gap | Verdict |
|---|---|---|---|---|---|
| bean (100) – pip (200) | 100 | 64% | 70% | 170 | ok |
| pip (200) – nell (300) | 100 | 64% | 43% | 100 | too weak, widen |
| nell (300) – otto (450) | 150 | 70% | 80% | 255 | ok |
| otto (450) – mila (600) | 150 | 70% | 75% | 255 | ok |
| mila (600) – teo (750) | 150 | 70% | 57% | 150 | ok |
| teo (750) – ravi (900) | 150 | 70% | 83% | 255 | ok |
| ravi (900) – ivo (1000) | 100 | 64% | 80% | 100 | too strong, narrow |
| ivo (1000) – sara (1100) | 100 | 64% | 45% | 100 | too weak, widen |
| sara (1100) – bruno (1200) | 100 | 64% | 35% | 100 | too weak, widen |
| bruno (1200) – jules (1300) | 100 | 64% | 57% | 100 | ok |
| jules (1300) – vlad (1400) | 100 | 64% | 55% | 100 | ok |
| vlad (1400) – zorg (1500) | 100 | 64% | 57% | 100 | ok |
| zorg (1500) – wren (1600) | 100 | 64% | 75% | 100 | ok |
| wren (1600) – hana (1700) | 100 | 64% | 57% | 100 | ok |
| hana (1700) – ada (1800) | 100 | 64% | 63% | 100 | ok |
| ada (1800) – marco (1900) | 100 | 64% | 60% | 100 | ok |
| marco (1900) – nadia (2000) | 100 | 64% | 53% | 100 | ok |
| nadia (2000) – chen (2100) | 100 | 64% | 57% | 100 | ok |
| chen (2100) – elena (2200) | 100 | 64% | 48% | 100 | too weak, widen |
| elena (2200) – kofi (2350) | 150 | 70% | 48% | 255 | too weak, widen |
| kofi (2350) – magda (2500) | 150 | 70% | 63% | 150 | ok |
| magda (2500) – leon (2600) | 100 | 64% | 48% | 100 | too weak, widen |
| leon (2600) – boris (2700) | 100 | 64% | 50% | 100 | ok |
| boris (2700) – yara (2800) | 100 | 64% | 53% | 100 | ok |
| yara (2800) – atlas (2900) | 100 | 64% | 50% | 100 | ok |
| atlas (2900) – noir (3000) | 100 | 64% | 48% | 100 | too weak, widen |
| noir (3000) – max (3200) | 200 | 76% | 45% | 340 | too weak, widen |

## Final internal skills

- bean: Elo 100 → skill 100
- pip: Elo 200 → skill 270
- nell: Elo 300 → skill 370
- otto: Elo 450 → skill 625
- mila: Elo 600 → skill 880
- teo: Elo 750 → skill 1030
- ravi: Elo 900 → skill 1285
- ivo: Elo 1000 → skill 1385
- sara: Elo 1100 → skill 1485
- bruno: Elo 1200 → skill 1585
- jules: Elo 1300 → skill 1685
- vlad: Elo 1400 → skill 1785
- zorg: Elo 1500 → skill 1885
- wren: Elo 1600 → skill 1985
- hana: Elo 1700 → skill 2085
- ada: Elo 1800 → skill 2185
- marco: Elo 1900 → skill 2285
- nadia: Elo 2000 → skill 2385
- chen: Elo 2100 → skill 2485
- elena: Elo 2200 → skill 2585
- kofi: Elo 2350 → skill 2840
- magda: Elo 2500 → skill 2990
- leon: Elo 2600 → skill 3090
- boris: Elo 2700 → skill 3190
- yara: Elo 2800 → skill 3290
- atlas: Elo 2900 → skill 3390
- noir: Elo 3000 → skill 3490
- max: Elo 3200 → skill 3830

## Applied values (top tier capped)

Pass 2 shows the 100–2100 range landing within ±15% of the Elo prediction for most pairs (20 games per pair: ±11% is the noise level). Above 2200 the engine's strength saturates: strong bots mostly draw each other, so the measured gap stays near 50% however far the internal skill is pushed, and the fitted skills crossed the full-strength threshold (3150) from Boris up. Applied: the fitted skills up to Chen (2100); Elena → Yara spread evenly from 2585 to 3050; Atlas 3085, Noir 3120, Stockfish Max 3200 (full strength). Generated players interpolate between these. Absolute strength against humans cannot be measured without human games; Glicko corrects your rating as you play.
