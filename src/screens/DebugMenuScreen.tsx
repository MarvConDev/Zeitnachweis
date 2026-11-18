import { useCallback, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { CommonActions, useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { shareBackupFile } from '../backup';
import { useTheme } from '../ThemeContext';
import {
  calculateDurationHours,
  calculatePause,
  createEmptyDays,
  formatEmployeeName,
  MONTH_NAMES,
} from '../utils/time';
import {
  getStorageStats,
  loadProfile,
  loadSettings,
  loadTimesheets,
  resetAppData,
  saveRecentObjects,
  saveTimesheets,
  updateSettings,
  upsertTimesheet,
} from '../storage';
import type { RootStackParamList } from '../types';
import { ANDROID_VERSION_CODE, APP_VERSION } from '../version';

type Props = NativeStackScreenProps<RootStackParamList, 'DebugMenu'>;

export function DebugMenuScreen({ navigation }: Props) {
  const { colors, darkMode, setDarkMode } = useTheme();
  const styles = makeStyles(colors);
  const [allowDuplicates, setAllowDuplicates] = useState(false);
  const [stats, setStats] = useState({
    timesheets: 0,
    filledDays: 0,
    recentObjects: 0,
    hasProfile: false,
  });

  const refresh = useCallback(async () => {
    const [settings, nextStats] = await Promise.all([loadSettings(), getStorageStats()]);
    setAllowDuplicates(settings.debug.allowDuplicateMonths);
    setStats(nextStats);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  async function onToggleDuplicates(value: boolean) {
    setAllowDuplicates(value);
    await updateSettings((current) => ({
      ...current,
      debug: { ...current.debug, allowDuplicateMonths: value },
    }));
  }

  function onResetApp() {
    Alert.alert(
      'App zurücksetzen?',
      'Alle Daten, Einstellungen und der Name werden gelöscht. Die Ersteinrichtung startet neu.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Zurücksetzen',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              await resetAppData();
              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [{ name: 'Onboarding' }],
                }),
              );
            })();
          },
        },
      ],
    );
  }

  async function onSeedDemo() {
    const profile = await loadProfile();
    if (!profile) {
      Alert.alert('Kein Profil', 'Bitte zuerst die Ersteinrichtung abschließen.');
      return;
    }
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const days = createEmptyDays(year, month);
    days[0] = {
      day: 1,
      start: '20:00',
      end: '08:00',
      duration: 12,
      pause: 0.75,
      object: 'Demo Objekt',
    };
    days[1] = {
      day: 2,
      duration: 0,
      object: 'Urlaub',
    };
    await upsertTimesheet({
      id: `debug-${year}-${month}-${Date.now()}`,
      year,
      month,
      employeeName: formatEmployeeName(profile.lastName, profile.firstName),
      days,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });
    await saveRecentObjects(['Demo Objekt', 'Männerwohnheim', 'Abbau Bryan Adams']);
    await refresh();
    Alert.alert('Demo geladen', `Beispieldaten für ${MONTH_NAMES[month - 1]} ${year} angelegt.`);
  }

  async function onClearObjects() {
    await saveRecentObjects([]);
    await refresh();
    Alert.alert('Erledigt', 'Objekt-Vorschläge geleert.');
  }

  async function onExportRaw() {
    try {
      await shareBackupFile();
    } catch (error) {
      Alert.alert(
        'Export fehlgeschlagen',
        error instanceof Error ? error.message : 'Unbekannter Fehler',
      );
    }
  }

  async function onShowStats() {
    const next = await getStorageStats();
    setStats(next);
    const sheets = await loadTimesheets();
    Alert.alert(
      'Speicher-Status',
      [
        `Profile: ${next.hasProfile ? 'ja' : 'nein'}`,
        `Monate: ${next.timesheets}`,
        `Gefüllte Tage: ${next.filledDays}`,
        `Objekt-Vorschläge: ${next.recentObjects}`,
        `IDs: ${sheets.map((s) => s.id).slice(0, 3).join(', ') || '—'}`,
      ].join('\n'),
    );
  }

  function onDstSelfTest() {
    const fall = calculateDurationHours('20:00', '08:00', 2026, 10, 24);
    const spring = calculateDurationHours('20:00', '08:00', 2026, 3, 28);
    const normal = calculateDurationHours('20:00', '08:00', 2026, 1, 15);
    Alert.alert(
      'Zeitumstellung-Test',
      [
        `Normal (Jan): ${normal} h (erwartet 12)`,
        `Winterzeit (24./25.10.): ${fall} h (erwartet 13)`,
        `Sommerzeit (28./29.03.): ${spring} h (erwartet 11)`,
        fall === 13 && spring === 11 && normal === 12
          ? 'Ergebnis: OK'
          : 'Ergebnis: Abweichung prüfen',
      ].join('\n'),
    );
  }

  async function onFillMonthPattern() {
    const profile = await loadProfile();
    if (!profile) {
      Alert.alert('Kein Profil', 'Bitte zuerst die Ersteinrichtung abschließen.');
      return;
    }
    const sheets = await loadTimesheets();
    if (sheets.length === 0) {
      Alert.alert('Kein Monat', 'Lege zuerst einen Zeitnachweis an.');
      return;
    }
    const target = sheets[0];
    const days = createEmptyDays(target.year, target.month).map((day) => {
      if (day.day % 7 === 0 || day.day % 7 === 6) {
        return { ...day, object: 'Frei' };
      }
      const start = '20:00';
      const end = '08:00';
      const duration = calculateDurationHours(
        start,
        end,
        target.year,
        target.month,
        day.day,
      );
      if (duration === null) return day;
      return {
        ...day,
        start,
        end,
        duration,
        pause: calculatePause(duration),
        object: 'Nachtschicht Debug',
      };
    });
    await upsertTimesheet({
      ...target,
      days,
      updatedAt: new Date().toISOString(),
    });
    await refresh();
    Alert.alert(
      'Monat gefüllt',
      `${MONTH_NAMES[target.month - 1]} ${target.year} mit Mo–Fr Nachtschichten befüllt.`,
    );
  }

  function onToggleTheme() {
    void setDarkMode(!darkMode);
  }

  function onClearTimesheetsOnly() {
    Alert.alert(
      'Nur Monate löschen?',
      'Profil und Einstellungen bleiben erhalten. Alle Zeitnachweise werden gelöscht.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Löschen',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              await saveTimesheets([]);
              await refresh();
              Alert.alert('Erledigt', 'Alle Monate gelöscht.');
            })();
          },
        },
      ],
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.kicker}>Verstecktes Debug-Menü</Text>
      <Text style={styles.hint}>
        Nur für Tests. Version {APP_VERSION} · Build {ANDROID_VERSION_CODE}
      </Text>

      <View style={styles.card}>
        <Text style={styles.section}>Daten</Text>
        <Text style={styles.stat}>
          {stats.timesheets} Monate · {stats.filledDays} Einträge · {stats.recentObjects} Objekte
        </Text>
        <Pressable style={styles.btn} onPress={onShowStats}>
          <Text style={styles.btnText}>Speicher-Status anzeigen</Text>
        </Pressable>
        <Pressable style={styles.btn} onPress={onExportRaw}>
          <Text style={styles.btnText}>Roh-Backup exportieren</Text>
        </Pressable>
        <Pressable style={styles.btn} onPress={onSeedDemo}>
          <Text style={styles.btnText}>Demo-Monat anlegen</Text>
        </Pressable>
        <Pressable style={styles.btn} onPress={() => void onFillMonthPattern()}>
          <Text style={styles.btnText}>Neuesten Monat mit Schichten füllen</Text>
        </Pressable>
        <Pressable style={styles.btn} onPress={onClearObjects}>
          <Text style={styles.btnText}>Objekt-Vorschläge leeren</Text>
        </Pressable>
        <Pressable style={styles.btn} onPress={onClearTimesheetsOnly}>
          <Text style={styles.btnText}>Nur Monate löschen (Profil behalten)</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.section}>Tests & UI</Text>
        <Pressable style={styles.btn} onPress={onDstSelfTest}>
          <Text style={styles.btnText}>Zeitumstellung selbst testen</Text>
        </Pressable>
        <Pressable style={styles.btn} onPress={onToggleTheme}>
          <Text style={styles.btnText}>
            Theme umschalten (aktuell: {darkMode ? 'Dunkel' : 'Hell'})
          </Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.section}>Flags</Text>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>Doppelte Monate erlauben</Text>
            <Text style={styles.hint}>Mehrere Zeitnachweise für denselben Monat möglich</Text>
          </View>
          <Switch
            value={allowDuplicates}
            onValueChange={(value) => {
              void onToggleDuplicates(value);
            }}
            trackColor={{ false: colors.line, true: colors.accent }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.section}>Gefahrzone</Text>
        <Pressable style={styles.dangerBtn} onPress={onResetApp}>
          <Text style={styles.dangerBtnText}>App zurücksetzen (Werkszustand)</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    content: { padding: 16, gap: 12 },
    kicker: { color: colors.accent, fontWeight: '700', letterSpacing: 0.5 },
    hint: { color: colors.muted, lineHeight: 18, marginBottom: 4 },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.line,
      gap: 10,
    },
    section: { fontSize: 17, fontWeight: '700', color: colors.ink },
    stat: { color: colors.muted, marginBottom: 4 },
    btn: {
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: 'center',
      backgroundColor: colors.inputBg,
    },
    btnText: { color: colors.ink, fontWeight: '700' },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    rowTitle: { fontWeight: '700', color: colors.ink, fontSize: 15 },
    dangerBtn: {
      borderWidth: 1,
      borderColor: colors.danger,
      backgroundColor: colors.dangerSoft,
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: 'center',
    },
    dangerBtnText: { color: colors.danger, fontWeight: '700' },
  });
}
