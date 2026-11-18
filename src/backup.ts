import { Platform } from 'react-native';
import { EncodingType, File, Paths } from 'expo-file-system';
import * as FileSystem from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { createBackup, restoreBackup } from './storage';
import type { AppBackup } from './types';

function isAppBackup(value: unknown): value is AppBackup {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as AppBackup;
  return Array.isArray(candidate.timesheets);
}

async function prepareBackupFile(): Promise<{
  uri: string;
  fileName: string;
  displayName: string;
  json: string;
}> {
  const backup = await createBackup();
  const stamp = new Date().toISOString().slice(0, 10);
  const fileName = `zeitnachweis-backup-${stamp}.json`;
  const displayName = `Zeitnachweis Backup ${stamp}`;
  const json = JSON.stringify(backup, null, 2);
  const file = new File(Paths.document, fileName);

  if (file.exists) {
    file.delete();
  }
  file.create();
  await file.write(json, { encoding: EncodingType.UTF8 });

  return { uri: file.uri, fileName, displayName, json };
}

/** Teilen über System-Dialog (Drive, Mail, …). */
export async function shareBackupFile(): Promise<void> {
  const prepared = await prepareBackupFile();

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Teilen ist auf diesem Gerät nicht verfügbar.');
  }

  await Sharing.shareAsync(prepared.uri, {
    mimeType: 'application/json',
    dialogTitle: prepared.displayName,
    UTI: 'public.json',
  });
}

/** Lokal speichern (Android: Ordner wählen). */
export async function saveBackupLocally(): Promise<void> {
  const prepared = await prepareBackupFile();

  if (Platform.OS === 'android') {
    const permissions =
      await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
    if (!permissions.granted) {
      throw new Error('Speichern abgebrochen – kein Ordner gewählt.');
    }

    const destUri = await FileSystem.StorageAccessFramework.createFileAsync(
      permissions.directoryUri,
      prepared.fileName.replace(/\.json$/i, ''),
      'application/json',
    );
    await FileSystem.writeAsStringAsync(destUri, prepared.json, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    return;
  }

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Speichern ist auf diesem Gerät nicht verfügbar.');
  }
  await Sharing.shareAsync(prepared.uri, {
    mimeType: 'application/json',
    dialogTitle: prepared.displayName,
    UTI: 'public.json',
  });
}

/** @deprecated use saveBackupLocally / shareBackupFile */
export async function exportBackupFile(): Promise<void> {
  await shareBackupFile();
}

export async function importBackupFile(): Promise<boolean> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/json', 'text/plain', '*/*'],
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (result.canceled || !result.assets?.[0]?.uri) {
    return false;
  }

  const picked = new File(result.assets[0].uri);
  const raw = await picked.text();
  const parsed: unknown = JSON.parse(raw);

  if (!isAppBackup(parsed)) {
    throw new Error('Die Datei ist kein gültiges Zeitnachweis-Backup.');
  }

  await restoreBackup(parsed);
  return true;
}
