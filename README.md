# Zeitnachweis (Android)

Android-App zum Ausfüllen von Stundenzetteln im Stil der Excel-Vorlage
`Vorname_Nachname_Monat_Jahr.xlsx`.

## Funktionen

- Beim ersten Start: Vor- und Nachname abfragen
- Liste aller erstellten Zeitnachweise
- Neuen Zeitnachweis anlegen (Name + aktuelles Jahr vorausgefüllt, Monat wählen)
- Ansehen der Monatstabelle
- Bearbeiten über eine einfache Maske: Datum, Beginn, Ende, Objekt/Verantsaltung, Verwerfen/Speichern
- Dauer wird automatisch berechnet (auch Nachtschichten über Mitternacht)
- Pause automatisch:
  - unter 10 Stunden → **0,5**
  - ab 10 Stunden → **0,75**
- Monatssumme wird automatisch addiert
- PDF herunterladen / teilen

## Start auf dem Handy

Voraussetzung: [Node.js](https://nodejs.org/) und die App **Expo Go** aus dem Play Store (SDK 58).

```bash
cd C:\Users\mdeit\Coding\zeitnachweis
npm install
npm start
```

`npm start` nutzt **Tunnel-Modus** (`--tunnel ngrok`). Das Handy muss **nicht** im gleichen WLAN sein – wichtig gegen den Fehler `failed to download remote update`.

1. Am PC: `npm start` laufen lassen, bis „Tunnel ready“ erscheint  
2. Expo Go muss **SDK 58** sein (wie dieses Projekt)  
3. In **Expo Go** den QR-Code scannen (oder die `exp://…exp.direct`-URL öffnen)  
4. Bei Problemen: Expo Go komplett schließen, nochmal scannen  

Nur im gleichen WLAN (ohne Tunnel): `npm run start:lan`

## Eigene APK bauen (optional)

Mit einem Expo-Account:

```bash
npx eas-cli login
npx eas build -p android --profile preview
```

## Projektstruktur

- `src/screens` – Onboarding, Liste, Detail, Eintragsmaske
- `src/utils/time.ts` – Dauer-/Pausenlogik
- `src/pdf.ts` – PDF im Stundenzettel-Layout
- `src/storage.ts` – lokale Speicherung auf dem Gerät
