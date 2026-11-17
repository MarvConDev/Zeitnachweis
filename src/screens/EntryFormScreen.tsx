import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../ThemeContext';
import { getTimesheet, upsertTimesheet } from '../storage';
import type { DayEntry, RootStackParamList } from '../types';
import {
  MONTH_NAMES,
  calculateDurationHours,
  calculatePause,
  formatHours,
  formatMinutesAsTime,
  parseTimeToMinutes,
} from '../utils/time';

type Props = NativeStackScreenProps<RootStackParamList, 'EntryForm'>;

function dateFromParts(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function timeStringToDate(value: string, fallbackHour: number): Date {
  const minutes = parseTimeToMinutes(value);
  const date = new Date();
  if (minutes === null) {
    date.setHours(fallbackHour, 0, 0, 0);
    return date;
  }
  date.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return date;
}

export function EntryFormScreen({ navigation, route }: Props) {
  const { timesheetId, day: initialDay } = route.params;
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = makeStyles(colors);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [day, setDay] = useState(initialDay ?? new Date().getDate());
  const [start, setStart] = useState('08:00');
  const [end, setEnd] = useState('16:00');
  const [objectText, setObjectText] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void (async () => {
      const timesheet = await getTimesheet(timesheetId);
      if (!timesheet) {
        Alert.alert('Fehler', 'Zeitnachweis nicht gefunden.');
        navigation.goBack();
        return;
      }

      setYear(timesheet.year);
      setMonth(timesheet.month);

      const dayNumber =
        initialDay && initialDay <= timesheet.days.length
          ? initialDay
          : Math.min(new Date().getDate(), timesheet.days.length);
      setDay(dayNumber);

      const existing = timesheet.days.find((item) => item.day === dayNumber);
      if (existing?.start) setStart(existing.start);
      if (existing?.end) setEnd(existing.end);
      if (existing?.object) setObjectText(existing.object);
      setReady(true);
    })();
  }, [initialDay, navigation, timesheetId]);

  const preview = useMemo(() => {
    const hasTimes = Boolean(start.trim() && end.trim());
    if (!hasTimes) {
      return { duration: 0, pause: undefined as number | undefined, valid: true };
    }
    const duration = calculateDurationHours(start, end);
    if (duration === null) {
      return { duration: 0, pause: undefined, valid: false };
    }
    return {
      duration,
      pause: calculatePause(duration),
      valid: true,
    };
  }, [start, end]);

  function onDateChange(_event: DateTimePickerEvent, selected?: Date) {
    setShowDatePicker(Platform.OS === 'ios');
    if (!selected) return;
    if (selected.getFullYear() !== year || selected.getMonth() + 1 !== month) {
      Alert.alert(
        'Falscher Monat',
        `Bitte ein Datum in ${MONTH_NAMES[month - 1]} ${year} wählen.`,
      );
      return;
    }
    setDay(selected.getDate());
  }

  function onStartChange(_event: DateTimePickerEvent, selected?: Date) {
    setShowStartPicker(Platform.OS === 'ios');
    if (!selected) return;
    setStart(formatMinutesAsTime(selected.getHours() * 60 + selected.getMinutes()));
  }

  function onEndChange(_event: DateTimePickerEvent, selected?: Date) {
    setShowEndPicker(Platform.OS === 'ios');
    if (!selected) return;
    setEnd(formatMinutesAsTime(selected.getHours() * 60 + selected.getMinutes()));
  }

  async function onSave() {
    if (!objectText.trim() && !(start.trim() && end.trim())) {
      Alert.alert('Eingabe fehlt', 'Bitte Zeiten und/oder Objekt/Veranstaltung eintragen.');
      return;
    }

    if ((start.trim() || end.trim()) && !preview.valid) {
      Alert.alert('Ungültige Zeit', 'Bitte Beginn und Ende als HH:MM eingeben.');
      return;
    }

    const timesheet = await getTimesheet(timesheetId);
    if (!timesheet) return;

    const entry: DayEntry = {
      day,
      start: start.trim() || undefined,
      end: end.trim() || undefined,
      duration: preview.duration,
      pause: preview.pause,
      object: objectText.trim() || undefined,
    };

    if (!entry.start && !entry.end) {
      entry.duration = 0;
      entry.pause = undefined;
    }

    timesheet.days = timesheet.days.map((item) => (item.day === day ? entry : item));
    timesheet.updatedAt = new Date().toISOString();
    await upsertTimesheet(timesheet);
    navigation.goBack();
  }

  if (!ready) {
    return <View style={styles.root} />;
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 16) },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Text style={styles.title}>Eintrag bearbeiten</Text>
          <Text style={styles.subtitle}>
            {MONTH_NAMES[month - 1]} {year} · Dauer und Pause werden automatisch berechnet
          </Text>

          <Text style={styles.label}>Datum</Text>
          <Pressable style={styles.selector} onPress={() => setShowDatePicker(true)}>
            <Text style={styles.selectorText}>
              {String(day).padStart(2, '0')}.{String(month).padStart(2, '0')}.{year}
            </Text>
          </Pressable>

          <Text style={styles.label}>Beginn</Text>
          <View style={styles.rowField}>
            <TextInput
              style={[styles.input, styles.flexInput]}
              value={start}
              onChangeText={setStart}
              placeholder="08:00"
              placeholderTextColor={colors.muted}
              keyboardType="numbers-and-punctuation"
            />
            <Pressable style={styles.pickBtn} onPress={() => setShowStartPicker(true)}>
              <Text style={styles.pickBtnText}>Uhr</Text>
            </Pressable>
          </View>

          <Text style={styles.label}>Ende</Text>
          <View style={styles.rowField}>
            <TextInput
              style={[styles.input, styles.flexInput]}
              value={end}
              onChangeText={setEnd}
              placeholder="16:00"
              placeholderTextColor={colors.muted}
              keyboardType="numbers-and-punctuation"
            />
            <Pressable style={styles.pickBtn} onPress={() => setShowEndPicker(true)}>
              <Text style={styles.pickBtnText}>Uhr</Text>
            </Pressable>
          </View>

          <Text style={styles.label}>Objekt/Verantsaltung</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={objectText}
            onChangeText={setObjectText}
            placeholder="z. B. Männerwohnheim"
            placeholderTextColor={colors.muted}
            multiline
          />

          <View style={styles.preview}>
            <Text style={styles.previewText}>
              Dauer: {preview.valid ? `${formatHours(preview.duration)} h` : 'ungültig'}
            </Text>
            <Text style={styles.previewText}>
              Pause:{' '}
              {preview.pause !== undefined ? `${formatHours(preview.pause)} h` : '—'}
            </Text>
          </View>

          <View style={styles.actions}>
            <Pressable style={styles.secondaryBtn} onPress={() => navigation.goBack()}>
              <Text style={styles.secondaryBtnText}>Verwerfen</Text>
            </Pressable>
            <Pressable style={styles.primaryBtn} onPress={onSave}>
              <Text style={styles.primaryBtnText}>Speichern</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {showDatePicker ? (
        <DateTimePicker
          value={dateFromParts(year, month, day)}
          mode="date"
          display="default"
          onChange={onDateChange}
          minimumDate={dateFromParts(year, month, 1)}
          maximumDate={dateFromParts(year, month, new Date(year, month, 0).getDate())}
        />
      ) : null}
      {showStartPicker ? (
        <DateTimePicker
          value={timeStringToDate(start, 8)}
          mode="time"
          is24Hour
          display="default"
          onChange={onStartChange}
        />
      ) : null}
      {showEndPicker ? (
        <DateTimePicker
          value={timeStringToDate(end, 16)}
          mode="time"
          is24Hour
          display="default"
          onChange={onEndChange}
        />
      ) : null}
    </KeyboardAvoidingView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    scrollContent: {
      padding: 16,
      flexGrow: 1,
      justifyContent: 'center',
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 18,
      borderWidth: 1,
      borderColor: colors.line,
    },
    title: { fontSize: 22, fontWeight: '700', color: colors.ink },
    subtitle: { color: colors.muted, marginTop: 6, marginBottom: 16, lineHeight: 20 },
    label: { fontWeight: '600', color: colors.ink, marginBottom: 6, marginTop: 4 },
    selector: {
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      marginBottom: 8,
      backgroundColor: colors.accentSoft,
    },
    selectorText: { color: colors.accent, fontWeight: '700', fontSize: 16 },
    rowField: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 10 },
    flexInput: { flex: 1, marginBottom: 0 },
    pickBtn: {
      backgroundColor: colors.accentSoft,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: colors.line,
    },
    pickBtnText: { color: colors.accent, fontWeight: '700' },
    input: {
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 11,
      marginBottom: 10,
      fontSize: 16,
      color: colors.ink,
      backgroundColor: colors.inputBg,
    },
    multiline: { minHeight: 72, textAlignVertical: 'top' },
    preview: {
      backgroundColor: colors.previewBg,
      borderRadius: 10,
      padding: 12,
      marginTop: 4,
      marginBottom: 14,
      gap: 4,
    },
    previewText: { color: colors.ink, fontWeight: '600' },
    actions: { flexDirection: 'row', gap: 10 },
    secondaryBtn: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: 'center',
    },
    secondaryBtnText: { color: colors.ink, fontWeight: '700' },
    primaryBtn: {
      flex: 1,
      backgroundColor: colors.accent,
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: 'center',
    },
    primaryBtnText: { color: '#fff', fontWeight: '700' },
  });
}
