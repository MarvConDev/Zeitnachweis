import { useCallback, useLayoutEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ZoomablePanView } from '../components/ZoomablePanView';
import { useTheme } from '../ThemeContext';
import { saveTimesheetPdf, shareTimesheetPdf } from '../pdf';
import { getTimesheet, loadProfile } from '../storage';
import type { RootStackParamList, Timesheet } from '../types';
import { MONTH_NAMES, formatHours, sumDurations } from '../utils/time';

type Props = NativeStackScreenProps<RootStackParamList, 'Timesheet'>;

/** Feste Spaltenbreiten: Tag+Beginn+Ende+Dauer+Pause+Objekt */
const TABLE_WIDTH = 48 + 68 + 68 + 62 + 62 + 192;

export function TimesheetScreen({ navigation, route }: Props) {
  const { id } = route.params;
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [timesheet, setTimesheet] = useState<Timesheet | null>(null);
  const [personnelNumber, setPersonnelNumber] = useState('');
  const [exporting, setExporting] = useState(false);
  const styles = makeStyles(colors);

  const refresh = useCallback(async () => {
    const [next, profile] = await Promise.all([getTimesheet(id), loadProfile()]);
    setTimesheet(next);
    setPersonnelNumber(profile?.personnelNumber ?? '');
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  useLayoutEffect(() => {
    if (!timesheet) return;
    navigation.setOptions({
      title: `${MONTH_NAMES[timesheet.month - 1]} ${timesheet.year}`,
    });
  }, [navigation, timesheet]);

  async function runPdfAction(action: 'save' | 'share') {
    if (!timesheet) return;
    try {
      setExporting(true);
      if (action === 'save') {
        await saveTimesheetPdf(timesheet);
        Alert.alert('Gespeichert', 'Die PDF wurde auf dem Gerät gespeichert.');
      } else {
        await shareTimesheetPdf(timesheet);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
      if (message.includes('abgebrochen')) return;
      Alert.alert('PDF fehlgeschlagen', message);
    } finally {
      setExporting(false);
    }
  }

  function onExportPdf() {
    if (!timesheet || exporting) return;
    Alert.alert('PDF exportieren', 'Speichern oder teilen (Mail, WhatsApp, …)?', [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Auf Gerät speichern', onPress: () => void runPdfAction('save') },
      { text: 'Teilen', onPress: () => void runPdfAction('share') },
    ]);
  }

  if (!timesheet) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const total = sumDurations(timesheet.days);
  const bottomPad = Math.max(insets.bottom, 12);

  return (
    <View style={styles.root}>
      <View style={styles.meta}>
        <Text style={styles.metaLabel}>Name</Text>
        <Text style={styles.metaValue}>{timesheet.employeeName}</Text>
        {personnelNumber ? (
          <>
            <Text style={[styles.metaLabel, { marginTop: 8 }]}>Pers.-Nr.</Text>
            <Text style={styles.metaValue}>{personnelNumber}</Text>
          </>
        ) : null}
        <Text style={[styles.metaLabel, { marginTop: 8 }]}>Monat / Jahr</Text>
        <Text style={styles.metaValue}>
          {MONTH_NAMES[timesheet.month - 1]} {timesheet.year}
        </Text>
        <Text style={styles.sum}>Summe: {formatHours(total)} h</Text>
        <Text style={styles.zoomHint}>1 Finger: verschieben · 2 Finger: zoomen</Text>
      </View>

      <ZoomablePanView>
        <View style={styles.tableWrap}>
          <View style={[styles.row, styles.headRow]}>
            <Text style={[styles.cell, styles.dayCol, styles.head]}>Tag</Text>
            <Text style={[styles.cell, styles.timeCol, styles.head]}>Beginn</Text>
            <Text style={[styles.cell, styles.timeCol, styles.head]}>Ende</Text>
            <Text style={[styles.cell, styles.numCol, styles.head]}>Dauer</Text>
            <Text style={[styles.cell, styles.numCol, styles.head]}>Pause</Text>
            <Text style={[styles.cell, styles.objCol, styles.head]}>Objekt/Veranstaltung</Text>
          </View>
          {timesheet.days.map((day) => {
            const filled = Boolean(day.start || day.end || day.object);
            return (
              <Pressable
                key={day.day}
                style={[styles.row, filled && styles.rowFilled]}
                onPress={() =>
                  navigation.navigate('EntryForm', {
                    timesheetId: timesheet.id,
                    day: day.day,
                  })
                }
              >
                <Text style={[styles.cell, styles.dayCol]}>{day.day}</Text>
                <Text style={[styles.cell, styles.timeCol]}>{day.start ?? ''}</Text>
                <Text style={[styles.cell, styles.timeCol]}>{day.end ?? ''}</Text>
                <Text style={[styles.cell, styles.numCol]}>
                  {filled || day.duration ? formatHours(day.duration) : '0'}
                </Text>
                <Text style={[styles.cell, styles.numCol]}>
                  {day.pause !== undefined ? formatHours(day.pause) : ''}
                </Text>
                <Text style={[styles.cell, styles.objCol]} numberOfLines={1}>
                  {day.object ?? ''}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ZoomablePanView>

      <View style={[styles.actions, { paddingBottom: bottomPad }]}>
        <Pressable
          style={styles.secondaryBtn}
          onPress={() => navigation.navigate('EntryForm', { timesheetId: timesheet.id })}
        >
          <Text style={styles.secondaryBtnText}>Bearbeiten</Text>
        </Pressable>
        <Pressable style={styles.primaryBtn} onPress={onExportPdf} disabled={exporting}>
          <Text style={styles.primaryBtnText}>
            {exporting ? 'PDF…' : 'Als PDF herunterladen'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    meta: {
      backgroundColor: colors.surface,
      margin: 12,
      marginBottom: 8,
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.line,
    },
    metaLabel: { color: colors.muted, fontSize: 12, fontWeight: '600' },
    metaValue: { color: colors.ink, fontSize: 16, fontWeight: '600', marginTop: 2 },
    sum: {
      marginTop: 12,
      color: colors.accent,
      fontWeight: '700',
      fontSize: 16,
    },
    zoomHint: { marginTop: 8, color: colors.muted, fontSize: 12 },
    tableWrap: {
      width: TABLE_WIDTH,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surface,
      marginLeft: 12,
    },
    row: {
      flexDirection: 'row',
      width: TABLE_WIDTH,
      borderBottomWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surface,
    },
    headRow: { backgroundColor: colors.tableHead },
    rowFilled: { backgroundColor: colors.rowFilled },
    cell: {
      paddingVertical: 10,
      paddingHorizontal: 6,
      color: colors.ink,
      fontSize: 13,
      borderRightWidth: 1,
      borderColor: colors.line,
    },
    head: { fontWeight: '700', fontSize: 12 },
    dayCol: { width: 48, textAlign: 'center' },
    timeCol: { width: 68, textAlign: 'center' },
    numCol: { width: 62, textAlign: 'center' },
    objCol: { width: 192, borderRightWidth: 0 },
    actions: {
      flexDirection: 'row',
      gap: 10,
      paddingHorizontal: 12,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: colors.line,
      backgroundColor: colors.surface,
    },
    secondaryBtn: {
      flex: 1,
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 12,
      paddingVertical: 15,
      alignItems: 'center',
    },
    secondaryBtnText: { color: colors.ink, fontWeight: '700' },
    primaryBtn: {
      flex: 1.3,
      backgroundColor: colors.accent,
      borderRadius: 12,
      paddingVertical: 15,
      alignItems: 'center',
    },
    primaryBtnText: { color: '#fff', fontWeight: '700' },
  });
}
