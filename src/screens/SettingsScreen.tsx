import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { importBackupFile, saveBackupLocally, shareBackupFile } from '../backup';
import { useTheme } from '../ThemeContext';
import { loadProfile, updateProfileName } from '../storage';
import type { RootStackParamList } from '../types';
import { ANDROID_VERSION_CODE, APP_VERSION } from '../version';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

export function SettingsScreen({ navigation }: Props) {
  const { colors, darkMode, setDarkMode } = useTheme();
  const insets = useSafeAreaInsets();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [personnelNumber, setPersonnelNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const tapCount = useRef(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    void (async () => {
      const profile = await loadProfile();
      if (profile) {
        setFirstName(profile.firstName);
        setLastName(profile.lastName);
        setPersonnelNumber(profile.personnelNumber ?? '');
      }
    })();
  }, []);

  async function onSaveName() {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Name fehlt', 'Bitte fülle alle Pflichtfelder aus.');
      return;
    }
    setSaving(true);
    try {
      await updateProfileName({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        personnelNumber: personnelNumber.trim() || undefined,
      });
      Alert.alert('Gespeichert', 'Profil wurde aktualisiert.');
      navigation.goBack();
    } finally {
      setSaving(false);
    }
  }

  async function runBackupAction(action: 'save' | 'share') {
    try {
      setBusy(true);
      if (action === 'save') {
        await saveBackupLocally();
        Alert.alert('Gespeichert', 'Das Backup wurde auf dem Gerät gespeichert.');
      } else {
        await shareBackupFile();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
      if (message.includes('abgebrochen')) return;
      Alert.alert('Backup fehlgeschlagen', message);
    } finally {
      setBusy(false);
    }
  }

  function onExportBackup() {
    if (busy) return;
    Alert.alert('Backup speichern', 'Lokal herunterladen oder teilen?', [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Auf Gerät speichern', onPress: () => void runBackupAction('save') },
      { text: 'Teilen', onPress: () => void runBackupAction('share') },
    ]);
  }

  function onImportBackup() {
    Alert.alert(
      'Backup wiederherstellen?',
      'Vorhandene Daten werden durch das Backup ersetzt.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Wiederherstellen',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                setBusy(true);
                const restored = await importBackupFile();
                if (!restored) return;
                const profile = await loadProfile();
                setFirstName(profile?.firstName ?? '');
                setLastName(profile?.lastName ?? '');
                setPersonnelNumber(profile?.personnelNumber ?? '');
                Alert.alert('Wiederhergestellt', 'Backup wurde erfolgreich geladen.');
              } catch (error) {
                Alert.alert(
                  'Wiederherstellen fehlgeschlagen',
                  error instanceof Error ? error.message : 'Unbekannter Fehler',
                );
              } finally {
                setBusy(false);
              }
            })();
          },
        },
      ],
    );
  }

  function onVersionTap() {
    tapCount.current += 1;
    if (tapTimer.current) clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => {
      tapCount.current = 0;
    }, 1800);
    if (tapCount.current >= 8) {
      tapCount.current = 0;
      navigation.navigate('DebugMenu');
    }
  }

  const styles = makeStyles(colors);

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) }]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.card}>
        <Text style={styles.section}>Name</Text>
        <Text style={styles.hint}>
          Wird in allen Zeitnachweisen als „Name, Vorname“ angezeigt. Felder mit * sind Pflicht.
        </Text>

        <Text style={styles.label}>
          Vorname <Text style={{ color: colors.danger, fontWeight: '700' }}>*</Text>
        </Text>
        <TextInput
          style={styles.input}
          value={firstName}
          onChangeText={setFirstName}
          placeholder="Vorname"
          placeholderTextColor={colors.muted}
          autoCapitalize="words"
        />

        <Text style={styles.label}>
          Name <Text style={{ color: colors.danger, fontWeight: '700' }}>*</Text>
        </Text>
        <TextInput
          style={styles.input}
          value={lastName}
          onChangeText={setLastName}
          placeholder="Name"
          placeholderTextColor={colors.muted}
          autoCapitalize="words"
        />

        <Text style={styles.label}>Personalnummer</Text>
        <TextInput
          style={styles.input}
          value={personnelNumber}
          onChangeText={setPersonnelNumber}
          placeholder="Optional"
          placeholderTextColor={colors.muted}
        />

        <Pressable style={styles.primaryBtn} onPress={onSaveName} disabled={saving || busy}>
          <Text style={styles.primaryBtnText}>{saving ? 'Speichern…' : 'Profil speichern'}</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.section}>Darstellung</Text>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>Dark Mode</Text>
            <Text style={styles.hint}>Dunkles Farbschema für die App</Text>
          </View>
          <Switch
            value={darkMode}
            onValueChange={(value) => {
              void setDarkMode(value);
            }}
            trackColor={{ false: colors.line, true: colors.accent }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.section}>Arbeit</Text>
        <Pressable style={styles.linkRow} onPress={() => navigation.navigate('FixedWorkTimes')}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>Feste Arbeitszeiten</Text>
            <Text style={styles.hint}>Standard Beginn/Ende für die Eintragsmaske</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
        <Pressable style={styles.linkRow} onPress={() => navigation.navigate('MinimumHours')}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>Mindeststunden</Text>
            <Text style={styles.hint}>Monatsziel und Ampel auf der Startseite</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
        <Pressable style={styles.linkRow} onPress={() => navigation.navigate('RecentObjects')}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>Objekt-Vorschläge</Text>
            <Text style={styles.hint}>Gespeicherte Orte bearbeiten oder löschen</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.section}>Daten</Text>
        <Text style={styles.hint}>
          Deine Nachweise bleiben bei App-Updates erhalten (gleiche App-ID). Zusätzlich kannst du
          ein Backup lokal speichern oder teilen und wiederherstellen.
        </Text>
        <Pressable style={styles.secondaryBtn} onPress={onExportBackup} disabled={busy}>
          <Text style={styles.secondaryBtnText}>
            {busy ? 'Bitte warten…' : 'Backup speichern'}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.secondaryBtn, { marginTop: 10 }]}
          onPress={onImportBackup}
          disabled={busy}
        >
          <Text style={styles.secondaryBtnText}>Backup wiederherstellen</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.section}>App-Info</Text>
        <Pressable onPress={onVersionTap}>
          <Text style={styles.infoLine}>Version {APP_VERSION}</Text>
          <Text style={styles.infoLine}>Build {ANDROID_VERSION_CODE}</Text>
        </Pressable>
        <Text style={styles.hint}>Package: de.zeitnachweis.app</Text>
      </View>
    </ScrollView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    content: { padding: 16, gap: 12 },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.line,
    },
    section: { fontSize: 18, fontWeight: '700', color: colors.ink, marginBottom: 6 },
    hint: { color: colors.muted, marginBottom: 12, lineHeight: 18 },
    label: { fontWeight: '600', color: colors.ink, marginBottom: 6 },
    input: {
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      marginBottom: 12,
      fontSize: 16,
      color: colors.ink,
      backgroundColor: colors.inputBg,
    },
    primaryBtn: {
      backgroundColor: colors.accent,
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 4,
    },
    primaryBtnText: { color: '#fff', fontWeight: '700' },
    secondaryBtn: {
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: 'center',
      backgroundColor: colors.inputBg,
    },
    secondaryBtnText: { color: colors.ink, fontWeight: '700' },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    rowTitle: { fontWeight: '700', color: colors.ink, fontSize: 16 },
    linkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      borderTopWidth: 1,
      borderTopColor: colors.line,
      gap: 8,
    },
    chevron: { color: colors.muted, fontSize: 28, fontWeight: '300', marginTop: -4 },
    infoLine: { color: colors.ink, fontWeight: '600', marginBottom: 4, fontSize: 15 },
  });
}
