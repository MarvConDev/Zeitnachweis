# Zeitnachweis (Android)

Android-App zum Ausfüllen von Stundenzetteln im Stil der Excel-Vorlage
`Vorname_Nachname_Monat_Jahr.xlsx`.

## Funktionen

- Beim ersten Start: Vorname* / Name* (Pflichtfelder)
- Liste aller erstellten Zeitnachweise
- Neuen Zeitnachweis anlegen (Name + aktuelles Jahr vorausgefüllt, Monat wählen)
- Ansehen der Monatstabelle
- Bearbeiten: Datum, Beginn, Ende, Objekt/Veranstaltung, Verwerfen/Speichern
- Objekt-Vorschläge aus zuletzt genutzten Orten
- Tag leeren (mit Bestätigung)
- Dauer + Pause automatisch (`<10h → 0,5` / `≥10h → 0,75`)
- PDF speichern/teilen (Logo, eine Seite)
- Einstellungen: Name, Dark Mode, Backup/Restore, Versionsnummer
- Daten bleiben bei App-Updates erhalten (Package `de.zeitnachweis.app`)

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

## Fertige APK / AAB bauen (EAS)

1. Expo-Account anlegen: https://expo.dev/signup  
2. Einloggen und Projekt verknüpfen:

```bash
npx eas-cli login
npx eas-cli build:configure
```

3. Builds starten:

```bash
# APK zum direkten Installieren auf dem Handy
npm run build:apk

# AAB für Google Play
npm run build:aab
```

Nach dem Build: Download-Link in der Konsole / auf https://expo.dev/accounts/matvcondev/projects/zeitnachweis

**Release 1.0.0 (Build 1):**
- APK: https://expo.dev/artifacts/eas/S0kv1WkAaQErYgKjbwktkXjjGPaSS6mvvWuwSQ0bxw8.apk
- AAB: https://expo.dev/artifacts/eas/bsVUNZzCOg7fniqGdfXsq9O8h_XxuGn1ylJ5faasYpQ.aab

APK auf dem Handy installieren: Datei öffnen → „Unbekannte Apps“ erlauben falls gefragt.

**Wichtig für Updates:** `android.package` (`de.zeitnachweis.app`) und Signatur nicht ändern – sonst gehen die lokalen Daten verloren. Vor großen Änderungen zusätzlich Backup in den Einstellungen.

## Projektstruktur

- `src/screens` – UI-Screens
- `src/utils/time.ts` – Dauer-/Pausenlogik
- `src/pdf.ts` – PDF-Export
- `src/storage.ts` / `src/backup.ts` – lokale Daten + Backup
- `eas.json` – Build-Profile (preview=APK, production=AAB)
