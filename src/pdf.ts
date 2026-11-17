import { Platform } from 'react-native';
import { EncodingType, File, Paths } from 'expo-file-system';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { Timesheet } from './types';
import {
  MONTH_NAMES,
  formatHours,
  sumDurations,
  timesheetFileBaseName,
} from './utils/time';
import { LOGO_DATA_URI } from './logoBase64';
import { loadProfile } from './storage';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function safeFileName(name: string): string {
  return name.replace(/[^\w.\-]+/g, '_');
}

export function buildTimesheetHtml(timesheet: Timesheet): string {
  const monthName = MONTH_NAMES[timesheet.month - 1];
  const total = sumDurations(timesheet.days);
  const rows = timesheet.days
    .map((day) => {
      const hasWork = Boolean(day.start || day.end || day.object);
      return `
        <tr>
          <td class="day">${day.day}</td>
          <td class="time">${day.start ? escapeHtml(day.start) : ''}</td>
          <td class="time">${day.end ? escapeHtml(day.end) : ''}</td>
          <td class="num">${hasWork || day.duration ? formatHours(day.duration) : '0'}</td>
          <td class="num">${day.pause !== undefined ? formatHours(day.pause) : ''}</td>
          <td class="obj">${day.object ? escapeHtml(day.object) : ''}</td>
        </tr>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <style>
    @page { size: A4; margin: 7mm 8mm; }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      font-family: Helvetica, Arial, sans-serif;
      color: #111;
      font-size: 9px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 4mm;
    }
    h1 {
      font-size: 18px;
      margin: 0;
      letter-spacing: 0.4px;
      line-height: 1.1;
    }
    .logo {
      height: 14mm;
      width: auto;
      object-fit: contain;
    }
    .meta {
      width: 72%;
      border-collapse: collapse;
      margin-bottom: 3mm;
    }
    .meta td {
      padding: 1.2mm 1.5mm;
      vertical-align: bottom;
    }
    .label { font-weight: 600; width: 38mm; }
    .value { border-bottom: 1px solid #222; }
    table.sheet {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }
    table.sheet th, table.sheet td {
      border: 1px solid #222;
      padding: 0.4mm 1.2mm;
      height: 5.1mm;
      line-height: 1.05;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
    table.sheet th {
      background: #efefef;
      font-size: 8px;
      text-align: center;
      height: 5.4mm;
    }
    .day { width: 11%; text-align: center; }
    .num { text-align: center; width: 11%; }
    .time { width: 12%; text-align: center; }
    .obj { width: 43%; }
    .sum-row td {
      font-weight: 700;
      background: #f7f7f7;
      height: 5.4mm;
    }
    .footer-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 3.5mm;
      gap: 8mm;
    }
    .footer {
      flex: 1;
      font-size: 8.5px;
      line-height: 1.35;
    }
    .sign-box {
      width: 48mm;
      text-align: center;
      border-top: 1px solid #222;
      padding-top: 1.5mm;
      font-size: 8.5px;
      flex-shrink: 0;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Stundenzettel</h1>
    <img class="logo" src="${LOGO_DATA_URI}" alt="Logo" />
  </div>
  <table class="meta">
    <tr>
      <td class="label">Name des Mitarbeiters:</td>
      <td class="value">${escapeHtml(timesheet.employeeName)}</td>
    </tr>
    <tr>
      <td class="label">Monat/Jahr:</td>
      <td class="value">${escapeHtml(monthName)} ${timesheet.year}</td>
    </tr>
    <tr>
      <td class="label">Pers.-Nr.:</td>
      <td class="value"></td>
    </tr>
  </table>

  <table class="sheet">
    <thead>
      <tr>
        <th>Kalendertag</th>
        <th>Beginn</th>
        <th>Ende</th>
        <th>Dauer</th>
        <th>Pause</th>
        <th>Objekt/Verantsaltung</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
      <tr class="sum-row">
        <td colspan="3" style="text-align:right;">Summe:</td>
        <td class="num">${formatHours(total)}</td>
        <td></td>
        <td></td>
      </tr>
    </tbody>
  </table>

  <div class="footer-row">
    <div class="footer">
      Hiermit wird bestätigt, dass alle Pausenzeiten gemäß<br />
      Arbeitsschutzgesetz eingehalten wurden.
    </div>
    <div class="sign-box">Unterschrift</div>
  </div>
</body>
</html>`;
}

type PreparedPdf = {
  uri: string;
  fileName: string;
  displayName: string;
  base64: string;
};

async function prepareTimesheetPdf(timesheet: Timesheet): Promise<PreparedPdf> {
  const profile = await loadProfile();
  const baseName = profile
    ? timesheetFileBaseName(profile.firstName, profile.lastName, timesheet.month, timesheet.year)
    : `Zeitnachweis_${MONTH_NAMES[timesheet.month - 1]}_${timesheet.year}`;

  const displayName = `${baseName}.pdf`;
  const fileName = `${safeFileName(baseName)}.pdf`;
  const html = buildTimesheetHtml(timesheet);

  // Base64 erzeugen und selbst in den App-Speicher schreiben —
  // so vermeiden wir READ-Permission-Fehler auf dem Temp-Pfad von printToFileAsync.
  const printed = await Print.printToFileAsync({ html, base64: true });
  if (!printed.base64) {
    throw new Error('PDF konnte nicht erzeugt werden.');
  }

  const file = new File(Paths.document, fileName);
  if (file.exists) {
    file.delete();
  }
  file.create();
  await file.write(printed.base64, { encoding: EncodingType.Base64 });

  return {
    uri: file.uri,
    fileName,
    displayName,
    base64: printed.base64,
  };
}

/** Teilen über System-Dialog (Mail, WhatsApp, Drive, …). */
export async function shareTimesheetPdf(timesheet: Timesheet): Promise<void> {
  const pdf = await prepareTimesheetPdf(timesheet);

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Teilen ist auf diesem Gerät nicht verfügbar.');
  }

  await Sharing.shareAsync(pdf.uri, {
    mimeType: 'application/pdf',
    dialogTitle: pdf.displayName,
    UTI: 'com.adobe.pdf',
  });
}

/** Auf dem Gerät speichern (Android: Ordner wählen). */
export async function saveTimesheetPdf(timesheet: Timesheet): Promise<void> {
  const pdf = await prepareTimesheetPdf(timesheet);

  if (Platform.OS === 'android') {
    const permissions =
      await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
    if (!permissions.granted) {
      throw new Error('Speichern abgebrochen – kein Ordner gewählt.');
    }

    const destUri = await FileSystem.StorageAccessFramework.createFileAsync(
      permissions.directoryUri,
      pdf.fileName.replace(/\.pdf$/i, ''),
      'application/pdf',
    );
    await FileSystem.writeAsStringAsync(destUri, pdf.base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return;
  }

  // iOS: Speichern läuft über den Teilen-Dialog („In Dateien sichern“).
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Speichern ist auf diesem Gerät nicht verfügbar.');
  }
  await Sharing.shareAsync(pdf.uri, {
    mimeType: 'application/pdf',
    dialogTitle: pdf.displayName,
    UTI: 'com.adobe.pdf',
  });
}

/** @deprecated use shareTimesheetPdf / saveTimesheetPdf */
export async function exportTimesheetPdf(timesheet: Timesheet): Promise<void> {
  await shareTimesheetPdf(timesheet);
}
