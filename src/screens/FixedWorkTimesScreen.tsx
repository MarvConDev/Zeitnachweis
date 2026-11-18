import { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../ThemeContext';
import { loadSettings, updateSettings } from '../storage';
import type { RootStackParamList } from '../types';
import { parseTimeToMinutes } from '../utils/time';

type Props = NativeStackScreenProps<RootStackParamList, 'FixedWorkTimes'>;

export function FixedWorkTimesScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [enabled, setEnabled] = useState(false);
  const [start, setStart] = useState('20:00');
  const [end, setEnd] = useState('08:00');

  useEffect(() => {
    void (async () => {
      const settings = await loadSettings();
      setEnabled(settings.fixedWorkTimes.enabled);
      setStart(settings.fixedWorkTimes.start);
      setEnd(settings.fixedWorkTimes.end);
    })();
  }, []);

  async function onSave() {
    if (enabled) {
      if (parseTimeToMinutes(start) === null || parseTimeToMinutes(end) === null) {
        Alert.alert('Ungültige Zeit', 'Bitte Beginn und Ende als HH:MM eingeben.');
        return;
      }
    }
    await updateSettings((current) => ({
      ...current,
      fixedWorkTimes: {
        enabled,
        start: start.trim(),
        end: end.trim(),
      },
    }));
    Alert.alert('Gespeichert', 'Feste Arbeitszeiten wurden aktualisiert.');
    navigation.goBack();
  }

  return (
    <View style={styles.root}>
      <View style={styles.card}>
        <Text style={styles.section}>Feste Arbeitszeiten</Text>
        <Text style={styles.hint}>
          Wenn aktiv, werden Beginn und Ende in der Eintragsmaske automatisch vorausgefüllt –
          praktisch bei immer denselben Schichten (z. B. 20:00–08:00). Du kannst die Zeiten
          pro Tag weiterhin ändern oder für Urlaub leeren.
        </Text>

        <View style={styles.row}>
          <Text style={styles.rowTitle}>Aktiv</Text>
          <Switch
            value={enabled}
            onValueChange={setEnabled}
            trackColor={{ false: colors.line, true: colors.accent }}
            thumbColor="#FFFFFF"
          />
        </View>

        <Text style={styles.label}>Beginn</Text>
        <TextInput
          style={styles.input}
          value={start}
          onChangeText={setStart}
          placeholder="HH:MM"
          placeholderTextColor={colors.muted}
          editable={enabled}
        />

        <Text style={styles.label}>Ende</Text>
        <TextInput
          style={styles.input}
          value={end}
          onChangeText={setEnd}
          placeholder="HH:MM"
          placeholderTextColor={colors.muted}
          editable={enabled}
        />

        <Pressable style={styles.primaryBtn} onPress={onSave}>
          <Text style={styles.primaryBtnText}>Speichern</Text>
        </Pressable>
      </View>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg, padding: 16 },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.line,
    },
    section: { fontSize: 18, fontWeight: '700', color: colors.ink, marginBottom: 6 },
    hint: { color: colors.muted, marginBottom: 16, lineHeight: 20 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14,
    },
    rowTitle: { fontWeight: '700', color: colors.ink, fontSize: 16 },
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
  });
}
