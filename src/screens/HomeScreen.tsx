import { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../ThemeContext';
import {
  deleteTimesheet,
  loadProfile,
  loadTimesheets,
  upsertTimesheet,
} from '../storage';
import type { RootStackParamList, Timesheet, UserProfile } from '../types';
import {
  MONTH_NAMES,
  createEmptyDays,
  formatEmployeeName,
  sumDurations,
} from '../utils/time';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export function HomeScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = makeStyles(colors);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear] = useState(new Date().getFullYear());

  const refresh = useCallback(async () => {
    const [nextProfile, nextTimesheets] = await Promise.all([
      loadProfile(),
      loadTimesheets(),
    ]);
    setProfile(nextProfile);
    setTimesheets(nextTimesheets);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  async function createTimesheet() {
    if (!profile) return;

    const exists = timesheets.some(
      (item) => item.year === selectedYear && item.month === selectedMonth,
    );
    if (exists) {
      Alert.alert(
        'Bereits vorhanden',
        `Für ${MONTH_NAMES[selectedMonth - 1]} ${selectedYear} gibt es schon einen Zeitnachweis.`,
      );
      return;
    }

    const now = new Date().toISOString();
    const timesheet: Timesheet = {
      id: `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${Date.now()}`,
      year: selectedYear,
      month: selectedMonth,
      employeeName: formatEmployeeName(profile.lastName, profile.firstName),
      days: createEmptyDays(selectedYear, selectedMonth),
      createdAt: now,
      updatedAt: now,
    };

    await upsertTimesheet(timesheet);
    setPickerVisible(false);
    navigation.navigate('Timesheet', { id: timesheet.id });
  }

  function confirmDelete(id: string, title: string) {
    Alert.alert('Löschen?', `„${title}“ wirklich löschen?`, [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Löschen',
        style: 'destructive',
        onPress: async () => {
          await deleteTimesheet(id);
          await refresh();
        },
      },
    ]);
  }

  const fabBottom = Math.max(insets.bottom, 12) + 8;
  const statusBarHeight =
    Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0;
  const headerTop = Math.max(insets.top, statusBarHeight, 24) + 14;

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: headerTop }]}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.hello}>Hallo{profile ? `, ${profile.firstName}` : ''}</Text>
            <Text style={styles.headerSub}>Deine Zeitnachweise</Text>
          </View>
          <Pressable style={styles.settingsBtn} onPress={() => navigation.navigate('Settings')}>
            <Text style={styles.settingsBtnText}>Einstellungen</Text>
          </Pressable>
        </View>
      </View>

      <FlatList
        data={timesheets}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: fabBottom + 72 }]}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Noch keine Zeitnachweise</Text>
            <Text style={styles.emptyText}>
              Lege den ersten Stundenzettel an – Name und Jahr werden automatisch eingetragen.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const title = `${MONTH_NAMES[item.month - 1]} ${item.year}`;
          const hours = sumDurations(item.days);
          return (
            <Pressable
              style={styles.card}
              onPress={() => navigation.navigate('Timesheet', { id: item.id })}
              onLongPress={() => confirmDelete(item.id, title)}
            >
              <View style={styles.cardTop}>
                <Text style={styles.cardTitle}>{title}</Text>
                <Text style={styles.cardHours}>{String(hours).replace('.', ',')} h</Text>
              </View>
              <Text style={styles.cardName}>{item.employeeName}</Text>
              <Text style={styles.cardHint}>Tippen zum Ansehen · Lang drücken zum Löschen</Text>
            </Pressable>
          );
        }}
      />

      <Pressable
        style={[styles.fab, { bottom: fabBottom }]}
        onPress={() => setPickerVisible(true)}
      >
        <Text style={styles.fabText}>+ Neuer Zeitnachweis</Text>
      </Pressable>

      <Modal visible={pickerVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Neuen Zeitnachweis</Text>
            <Text style={styles.modalSub}>
              Name: {profile ? formatEmployeeName(profile.lastName, profile.firstName) : '—'}
            </Text>
            <Text style={styles.modalSub}>Jahr: {selectedYear}</Text>

            <Text style={styles.monthLabel}>Monat wählen</Text>
            <View style={styles.monthGrid}>
              {MONTH_NAMES.map((name, index) => {
                const month = index + 1;
                const active = month === selectedMonth;
                return (
                  <Pressable
                    key={name}
                    style={[styles.monthChip, active && styles.monthChipActive]}
                    onPress={() => setSelectedMonth(month)}
                  >
                    <Text style={[styles.monthChipText, active && styles.monthChipTextActive]}>
                      {name.slice(0, 3)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.modalActions}>
              <Pressable style={styles.secondaryBtn} onPress={() => setPickerVisible(false)}>
                <Text style={styles.secondaryBtnText}>Verwerfen</Text>
              </Pressable>
              <Pressable style={styles.primaryBtn} onPress={createTimesheet}>
                <Text style={styles.primaryBtnText}>Anlegen</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    header: {
      backgroundColor: colors.header,
      paddingBottom: 22,
      paddingHorizontal: 20,
    },
    headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    hello: { color: colors.headerMuted, fontSize: 14, fontWeight: '600' },
    headerSub: { color: '#fff', fontSize: 26, fontWeight: '700', marginTop: 4 },
    settingsBtn: {
      backgroundColor: 'rgba(255,255,255,0.14)',
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginTop: 4,
    },
    settingsBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
    list: { padding: 16 },
    empty: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 22,
      borderWidth: 1,
      borderColor: colors.line,
    },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.ink, marginBottom: 8 },
    emptyText: { color: colors.muted, lineHeight: 20 },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.line,
    },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cardTitle: { fontSize: 18, fontWeight: '700', color: colors.ink },
    cardHours: {
      backgroundColor: colors.accentSoft,
      color: colors.accent,
      fontWeight: '700',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      overflow: 'hidden',
    },
    cardName: { color: colors.muted, marginTop: 6 },
    cardHint: { color: colors.muted, fontSize: 12, marginTop: 10, opacity: 0.8 },
    fab: {
      position: 'absolute',
      left: 16,
      right: 16,
      backgroundColor: colors.accent,
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: 'center',
    },
    fabText: { color: '#fff', fontWeight: '700', fontSize: 16 },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(15,20,25,0.55)',
      justifyContent: 'center',
      padding: 20,
    },
    modalCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
    },
    modalTitle: { fontSize: 20, fontWeight: '700', color: colors.ink },
    modalSub: { color: colors.muted, marginTop: 6 },
    monthLabel: { marginTop: 18, marginBottom: 10, fontWeight: '600', color: colors.ink },
    monthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    monthChip: {
      width: '22.5%',
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.line,
      alignItems: 'center',
      backgroundColor: colors.chipBg,
    },
    monthChipActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    monthChipText: { color: colors.ink, fontWeight: '600' },
    monthChipTextActive: { color: '#fff' },
    modalActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
    secondaryBtn: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 10,
      paddingVertical: 13,
      alignItems: 'center',
    },
    secondaryBtnText: { color: colors.ink, fontWeight: '600' },
    primaryBtn: {
      flex: 1,
      backgroundColor: colors.accent,
      borderRadius: 10,
      paddingVertical: 13,
      alignItems: 'center',
    },
    primaryBtnText: { color: '#fff', fontWeight: '700' },
  });
}
