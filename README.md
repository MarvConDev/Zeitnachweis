# Zeitnachweis (Android)

Android-App zum digitalen Ausfüllen von Stundenzetteln im Stil der Excel-Vorlage
`Vorname_Nachname_Monat_Jahr.xlsx`.

**Aktuell:** Version **1.1.4** · Android Build **6** · Package `de.zeitnachweis.app`  
**Stack:** Expo SDK 58 / React Native · lokale Speicherung (AsyncStorage)

## Funktionen

### Erfassung
- Ersteinrichtung: Vorname* / Name* (Pflicht), Personalnummer optional
- Monate anlegen, ansehen, löschen (Langdruck)
- Tageseinträge: Von/Bis-Zeitraum, Beginn, Ende, Objekt/Veranstaltung
- Objekt ist Pflicht; Zeiten optional (z. B. Urlaub) — Zeiten ohne Objekt nicht erlaubt
- Objekt-Vorschläge aus zuletzt genutzten Orten
- Tag/Zeitraum leeren (mit Bestätigung)
- Dauer inkl. Sommer-/Winterzeit (Nachtschicht)
- Pause automatisch (`<10h → 0,5` / `≥10h → 0,75`)

### Tabelle & Export
- Monatstabelle mit Zoom (2 Finger) und Verschieben (1 Finger, randbegrenzt)
- Optional Wochentags-Kürzel (Mo, Di, …) — nur in der App, nicht im PDF
- Heutiger Tag optisch hervorgehoben
- PDF speichern oder teilen (eine Seite, Logo, Unterschrift)

### Einstellungen
- Profil (Name, Pers.-Nr.)
- Dark Mode
- Feste Arbeitszeiten (Vorbelegung in der Eintragsmaske)
- Mindeststunden mit Ampel auf der Startseite
- Objekt-Vorschläge bearbeiten/löschen
- Backup lokal speichern, teilen oder wiederherstellen
- Verstecktes Debug-Menü (8× auf die Versionsnummer tippen)

### Persistenz
- Daten bleiben bei App-Updates erhalten (gleiche App-ID + Signatur)
- Vor Deinstallation oder Gerätewechsel: Backup in den Einstellungen

## Start mit Expo Go

```bash
cd C:\Users\mdeit\Coding\zeitnachweis
npm install
npm start
```

1. Bis „Tunnel ready“ warten  
2. Expo Go **SDK 58** → QR / `exp://…exp.direct`  
3. Bei Problemen: Expo Go neu starten  

Nur LAN: `npm run start:lan`

Weitere Checks:

```bash
npx tsc --noEmit
npm run check:time
npx expo-doctor
```

## Fertige APK / AAB bauen (EAS)

```bash
npx eas-cli login
npm run build:apk   # Preview-APK (direkt installierbar)
npm run build:aab   # Production-AAB (Google Play)
```

Builds: https://expo.dev/accounts/matvcondev/projects/zeitnachweis  
Repo: https://github.com/MarvConDev/Zeitnachweis

**Release 1.1.4 (Build 6):**  
APK: https://expo.dev/artifacts/eas/MUXgXk1FyMDSb3veP-XPkDeQutt2G5RS049bSXplqj0.apk

APK installieren: Datei öffnen → ggf. „Unbekannte Apps“ erlauben.  
Update: über die bestehende Installation installieren — lokale Daten bleiben erhalten.

**Wichtig:** `android.package` (`de.zeitnachweis.app`) und Signatur nicht ändern.

## Projektstruktur

- `App.tsx` / `index.ts` – Einstieg, Navigation, Splash
- `src/screens` – UI (Home, Timesheet, EntryForm, Settings, …)
- `src/components/ZoomablePanView.tsx` – Tabellen-Pan/Zoom
- `src/utils/time.ts` – Dauer, Pause, Zeitumstellung, Wochentage
- `src/pdf.ts` – PDF-Export
- `src/storage.ts` / `src/backup.ts` – lokale Daten + Backup
- `src/ThemeContext.tsx` – Light/Dark
- `docs/` – Produktpräsentation (PDF)
- `eas.json` – Build-Profile (preview=APK, production=AAB)
