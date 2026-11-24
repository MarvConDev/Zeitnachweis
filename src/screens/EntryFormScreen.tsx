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
import {
  getTimesheet,
  loadRecentObjects,
  loadSettings,
  rememberObject,
  upsertTimesheet,
} from '../storage';
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

function emptyDay(day: number): DayEntry {
  return { day, duration: 0 };
}

function formatDay(day: number, month: number, year: number): string {
  return `${String(day).padStart(2, '0')}.${String(month).padStart(2, '0')}.${year}`;
}

function buildEntryForDay(
  dayNumber: number,
  year: number,
  month: number,
  start: string,
  end: string,
  objectText: string,
): DayEntry | null {
  const startTrim = start.trim();
  const endTrim = end.trim();
  const objectTrim = objectText.trim();

  // Objekt ist Pflicht; Zeiten sind optional (z. B. Urlaub), aber nur gemeinsam gültig.
  if (!objectTrim) {
    return null;
  }
  if ((startTrim || endTrim) && !(startTrim && endTrim)) {
    return null;
  }

  let duration = 0;
  let pause: number | undefined;
  let startValue: string | undefined;
  let endValue: string | undefined;

  if (startTrim && endTrim) {
    const calculated = calculateDurationHours(startTrim, endTrim, year, month, dayNumber);
    if (calculated === null) {
      return null;
    }
    duration = calculated;
    pause = calculatePause(calculated);
    startValue = startTrim;
    endValue = endTrim;
  }

  return {
    day: dayNumber,
    start: startValue,
    end: endValue,
    duration,
    pause,
    object: objectTrim,
  };
}

export function EntryFormScreen({ navigation, route }: Props) {
  const { timesheetId, day: initialDay } = route.params;
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = makeStyles(colors);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [day, setDay] = useState(initialDay ?? new Date().getDate());
  const [dayEnd, setDayEnd] = useState(initialDay ?? new Date().getDate());
  const [daysInMonth, setDaysInMonth] = useState(31);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [objectText, setObjectText] = useState('');
  const [recentObjects, setRecentObjects] = useState<string[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [ready, setReady] = useState(false);
  const [hasExistingEntry, setHasExistingEntry] = useState(false);

  useEffect(() => {
    void (async () => {
      const [timesheet, recent, settings] = await Promise.all([
        getTimesheet(timesheetId),
        loadRecentObjects(),
        loadSettings(),
      ]);
      if (!timesheet) {
        Alert.alert('Fehler', 'Zeitnachweis nicht gefunden.');
        navigation.goBack();
        return;
      }

      setYear(timesheet.year);
      setMonth(timesheet.month);
      setDaysInMonth(timesheet.days.length);
      setRecentObjects(recent);

      const dayNumber =
        initialDay && initialDay <= timesheet.days.length
          ? initialDay
          : Math.min(new Date().getDate(), timesheet.days.length);
      setDay(dayNumber);
      setDayEnd(dayNumber);

      const existing = timesheet.days.find((item) => item.day === dayNumber);
      const filled = Boolean(
        existing && (existing.start || existing.end || existing.object || existing.duration),
      );
      setHasExistingEntry(filled);

      if (filled) {
        setStart(existing?.start ?? '');
        setEnd(existing?.end ?? '');
        setObjectText(existing?.object ?? '');
      } else if (settings.fixedWorkTimes.enabled) {
        setStart(settings.fixedWorkTimes.start);
        setEnd(settings.fixedWorkTimes.end);
        setObjectText('');
      } else {
        setStart('');
        setEnd('');
        setObjectText('');
      }
      setReady(true);
    })();
  }, [initialDay, navigation, timesheetId]);

  const rangeFrom = Math.min(day, dayEnd);
  const rangeTo = Math.max(day, dayEnd);
  const isRange = rangeTo > rangeFrom;

  const filteredSuggestions = useMemo(() => {
    const query = objectText.trim().toLowerCase();
    if (!query) return recentObjects.slice(0, 8);
    return recentObjects
      .filter((item) => item.toLowerCase().includes(query) && item.toLowerCase() !== query)
      .slice(0, 8);
  }, [objectText, recentObjects]);

  const preview = useMemo(() => {
    const hasTimes = Boolean(start.trim() && end.trim());
    if (!hasTimes) {
      return { duration: 0, pause: undefined as number | undefined, valid: true };
    }
    const duration = calculateDurationHours(start, end, year, month, day);
    if (duration === null) {
      return { duration: 0, pause: undefined, valid: false };
    }
    return {
      duration,
      pause: calculatePause(duration),
      valid: true,
    };
  }, [start, end, year, month, day]);

  function onStartDateChange(_event: DateTimePickerEvent, selected?: Date) {
    setShowDatePicker(Platform.OS === 'ios');
    if (!selected) return;
    if (selected.getFullYear() !== year || selected.getMonth() + 1 !== month) {
      Alert.alert(
        'Falscher Monat',
        `Bitte ein Datum in ${MONTH_NAMES[month - 1]} ${year} wählen.`,
      );
      return;
    }
    const nextDay = selected.getDate();
    setDay(nextDay);
    if (dayEnd < nextDay) {
      setDayEnd(nextDay);
    }
  }

  function onEndDateChange(_event: DateTimePickerEvent, selected?: Date) {
    setShowEndDatePicker(Platform.OS === 'ios');
    if (!selected) return;
    if (selected.getFullYear() !== year || selected.getMonth() + 1 !== month) {
      Alert.alert(
        'Falscher Monat',
        `Bitte ein Datum in ${MONTH_NAMES[month - 1]} ${year} wählen.`,
      );
      return;
    }
    const nextDay = selected.getDate();
    setDayEnd(nextDay);
    if (nextDay < day) {
      setDay(nextDay);
    }
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

  async function saveRange(from: number, to: number) {
    const timesheet = await getTimesheet(timesheetId);
    if (!timesheet) return;

    const entries: DayEntry[] = [];
    for (let d = from; d <= to; d += 1) {
      const entry = buildEntryForDay(d, year, month, start, end, objectText);
      if (!entry) {
        Alert.alert('Ungültige Zeit', 'Bitte Beginn und Ende als HH:MM eingeben.');
        return;
      }
      entries.push(entry);
    }

    const byDay = new Map(entries.map((item) => [item.day, item]));
    timesheet.days = timesheet.days.map((item) => byDay.get(item.day) ?? item);
    timesheet.updatedAt = new Date().toISOString();
    await upsertTimesheet(timesheet);

    const objectValue = objectText.trim();
    if (objectValue) {
      await rememberObject(objectValue);
    }
    navigation.goBack();
  }

  async function onSave() {
    if (!objectText.trim()) {
      Alert.alert(
        'Objekt fehlt',
        'Bitte Objekt/Veranstaltung eintragen. Zeiten ohne Objekt sind nicht erlaubt.',
      );
      return;
    }

    if ((start.trim() || end.trim()) && !(start.trim() && end.trim())) {
      Alert.alert('Ungültige Zeit', 'Bitte Beginn und Ende zusammen als HH:MM eingeben.');
      return;
    }

    if (start.trim() && end.trim() && !preview.valid) {
      Alert.alert('Ungültige Zeit', 'Bitte Beginn und Ende als HH:MM eingeben.');
      return;
    }

    const from = rangeFrom;
    const to = rangeTo;

    if (to > from) {
      const timesheet = await getTimesheet(timesheetId);
      if (!timesheet) return;
      const overlapping = timesheet.days.filter((item) => {
        if (item.day < from || item.day > to) return false;
        return Boolean(item.start || item.end || item.object || item.duration);
      });

      if (overlapping.length > 0) {
        Alert.alert(
          'Zeitraum überschreibt Einträge',
          `${overlapping.length} bereits ausgefüllte Tage werden überschrieben (${formatDay(from, month, year)} – ${formatDay(to, month, year)}).`,
          [
            { text: 'Abbrechen', style: 'cancel' },
            {
              text: 'Überschreiben',
              style: 'destructive',
              onPress: () => {
                void saveRange(from, to);
              },
            },
          ],
        );
        return;
      }
    }

    await saveRange(from, to);
  }

  function onClearDay() {
    const label = isRange
      ? `Einträge vom ${formatDay(rangeFrom, month, year)} bis ${formatDay(rangeTo, month, year)}`
      : `Eintrag für Tag ${day}`;
    Alert.alert('Wirklich leeren?', `${label} wird gelöscht.`, [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Leeren',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            const timesheet = await getTimesheet(timesheetId);
            if (!timesheet) return;
            timesheet.days = timesheet.days.map((item) =>
              item.day >= rangeFrom && item.day <= rangeTo ? emptyDay(item.day) : item,
            );
            timesheet.updatedAt = new Date().toISOString();
            await upsertTimesheet(timesheet);
            navigation.goBack();
          })();
        },
      },
    ]);
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
            {MONTH_NAMES[month - 1]} {year} · Objekt Pflicht · Zeiten optional · Pause automatisch
          </Text>

          <Text style={styles.label}>Von</Text>
          <Pressable style={styles.selector} onPress={() => setShowDatePicker(true)}>
            <Text style={styles.selectorText}>{formatDay(day, month, year)}</Text>
          </Pressable>

          <Text style={styles.label}>Bis (optional für Zeitraum)</Text>
          <Pressable style={styles.selector} onPress={() => setShowEndDatePicker(true)}>
            <Text style={styles.selectorText}>{formatDay(dayEnd, month, year)}</Text>
          </Pressable>
          <Text style={styles.hint}>
            {isRange
              ? `Gleicher Eintrag für ${rangeTo - rangeFrom + 1} Tage (${formatDay(rangeFrom, month, year)} – ${formatDay(rangeTo, month, year)})`
              : 'Für mehrere Tage: anderes „Bis“-Datum wählen (z. B. 01.–04.).'}
          </Text>

          <Text style={styles.label}>Beginn</Text>
          <View style={styles.rowField}>
            <TextInput
              style={[styles.input, styles.flexInput]}
              value={start}
              onChangeText={setStart}
              placeholder="Beginn"
              placeholderTextColor={colors.muted}
              keyboardType="numbers-and-punctuation"
            />
            {start ? (
              <Pressable style={styles.pickBtn} onPress={() => setStart('')}>
                <Text style={styles.pickBtnText}>Leer</Text>
              </Pressable>
            ) : null}
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
              placeholder="Ende"
              placeholderTextColor={colors.muted}
              keyboardType="numbers-and-punctuation"
            />
            {end ? (
              <Pressable style={styles.pickBtn} onPress={() => setEnd('')}>
                <Text style={styles.pickBtnText}>Leer</Text>
              </Pressable>
            ) : null}
            <Pressable style={styles.pickBtn} onPress={() => setShowEndPicker(true)}>
              <Text style={styles.pickBtnText}>Uhr</Text>
            </Pressable>
          </View>

          <Text style={styles.label}>Objekt/Veranstaltung</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={objectText}
            onChangeText={setObjectText}
            placeholder="Objekt/Veranstaltung"
            placeholderTextColor={colors.muted}
            multiline
          />

          {filteredSuggestions.length > 0 ? (
            <View style={styles.suggestions}>
              {filteredSuggestions.map((item) => (
                <Pressable key={item} style={styles.chip} onPress={() => setObjectText(item)}>
                  <Text style={styles.chipText}>{item}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          <View style={styles.preview}>
            <Text style={styles.previewText}>
              Dauer: {preview.valid ? `${formatHours(preview.duration)} h` : 'ungültig'}
              {isRange ? ' (pro Tag)' : ''}
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
            <Pressable style={styles.primaryBtn} onPress={() => void onSave()}>
              <Text style={styles.primaryBtnText}>
                {isRange ? `${rangeTo - rangeFrom + 1} Tage speichern` : 'Speichern'}
              </Text>
            </Pressable>
          </View>

          {hasExistingEntry || isRange ? (
            <Pressable style={styles.dangerBtn} onPress={onClearDay}>
              <Text style={styles.dangerBtnText}>
                {isRange ? 'Zeitraum leeren' : 'Tag leeren'}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>

      {showDatePicker ? (
        <DateTimePicker
          value={dateFromParts(year, month, day)}
          mode="date"
          display="default"
          onChange={onStartDateChange}
          minimumDate={dateFromParts(year, month, 1)}
          maximumDate={dateFromParts(year, month, daysInMonth)}
        />
      ) : null}
      {showEndDatePicker ? (
        <DateTimePicker
          value={dateFromParts(year, month, dayEnd)}
          mode="date"
          display="default"
          onChange={onEndDateChange}
          minimumDate={dateFromParts(year, month, 1)}
          maximumDate={dateFromParts(year, month, daysInMonth)}
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
    root: { flex: 1, backgroundColor: colors.bg },
    scrollContent: { padding: 16, flexGrow: 1, justifyContent: 'center' },
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
    hint: { color: colors.muted, fontSize: 13, lineHeight: 18, marginBottom: 10, marginTop: -2 },
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
    suggestions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 10,
      marginTop: -2,
    },
    chip: {
      backgroundColor: colors.accentSoft,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: colors.line,
    },
    chipText: { color: colors.accent, fontWeight: '600', fontSize: 13 },
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
    dangerBtn: {
      marginTop: 12,
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
