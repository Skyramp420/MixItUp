# MixItUp 🎧

ChatMix pre SteelSeries slúchadlá **bez Sonaru** – koliesko na slúchadlách stišuje hru alebo Discord priamo vo Windowse.
Žiadne virtuálne zariadenia, žiadne SteelSeries GG na pozadí. Súčasť rodiny **WheresTheApp**.

## Inštalácia

1. Stiahni najnovší `MixItUp_x.y.z_x64-setup.exe` z [Releases](../../releases/latest) a spusti ho.
2. Pri prvom spustení ťa prevedie sprievodca: nájde slúchadlá, uprace SteelSeries GG a Sonar a vyberieš si chat aplikácie.
3. Hotovo. Okno môžeš zavrieť – ChatMix beží na pozadí a spúšťa sa so systémom.

Aktualizácie: appka sa pri štarte sama pozrie, či je nová verzia, a ponúkne **Aktualizovať**.

## Čo vie

- **ChatMix** – koliesko mení hlasitosť aplikácií vo Windows mixéri: chat appky (Discord, TeamSpeak, Teams…) vs. všetko ostatné.
- **Len na slúchadlách** – reproduktory a iné výstupy ostávajú na svojej hlasitosti. Keď prepneš zvuk na reproduktory, nič nie je stíšené.
- **Bezpečné vrátenie** – pôvodné hlasitosti si pamätá v súbore, takže ich vráti aj po páde alebo reštarte.
- **SteelSeries kontrola** – ukončí GG, vypne jeho autoštart (ako Správca úloh, vratne), vráti predvolený výstup/mikrofón zo Sonaru, voliteľne skryje Sonar zariadenia.
- **Prehľad** – živá poloha kolieska, batéria, ktoré aplikácie sú v chate a ktoré v hre.

Overené na **Arctis Nova 5X**. Mal by fungovať na ďalších Arctis s kolieskom ChatMix (Nova 5/7, 7+) – protokol vychádza z linuxového ovládača `hid-steelseries`.

## Ako to funguje

```
Arctis dongle ──USB HID──► MixItUp.exe --engine ──► Windows mixér (hlasitosť aplikácií na slúchadlách)
                  0x45 [game, chat] pri každom pohnutí kolieskom
                  0xb0 stav (batéria, poloha) na vyžiadanie
```

Jeden `MixItUp.exe` má dva režimy:

| Spustenie | Čo robí |
|---|---|
| `MixItUp.exe` | okno na nastavenie (Tauri, téma Čistá) |
| `MixItUp.exe --engine` | ChatMix na pozadí, bez okna a bez WebView – pár MB pamäte |
| `MixItUp.exe --stop` | slušne ukončí engine a vráti hlasitosti |
| `MixItUp.exe --uninstall` | to isté + vypne autoštart (volá ho odinštalátor) |

Nastavenia: `%APPDATA%\MixItUp\config.json` (appka zapisuje, engine si zmenu načíta sám).
Pôvodné hlasitosti: `%APPDATA%\MixItUp\volumes.json`.

## Štruktúra

```
app/ui/            UI (HTML/CSS/JS, téma Čistá) – v prehliadači beží s ukážkovými dátami
app/src-tauri/src/
  main.rs          režimy a príkazy pre UI
  engine.rs        ChatMix na pozadí
  headset.rs       čítanie kolieska a batérie cez HID (+ testy na reálnych dátach)
  audio.rs         výstupy, hlasitosti aplikácií, predvolené zariadenie
  steelseries.rs   kontrola a vypnutie GG / Sonaru
  update.rs        aktualizácie z GitHub Releases
```

## Vydanie novej verzie

Actions → **build** → *Run workflow* → zadaj verziu (napr. `0.2.0`). Alebo pushni tag `v0.2.0`.
