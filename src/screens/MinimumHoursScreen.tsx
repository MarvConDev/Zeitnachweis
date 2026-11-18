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

type Props = NativeStackScreenProps<RootStackParamList, 'MinimumHours'>;

export function MinimumHoursScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [enabled, setEnabled] = useState(false);
  const [hoursText, setHoursText] = useState('160');

  useEffect(() => {
    void (async () => {
      const settings = await loadSettings();
      setEnabled(settings.minimumHours.enabled);
      setHoursText(String(settings.minimumHours.hours).replace('.', ','));
    })();
  }, []);

  async function onSave() {
    const normalized = hoursText.replace(',', '.').trim();
    const hours = Number(normalized);
    if (!Number.isFinite(hours) || hours <= 0) {
      Alert.alert('Ungültig', 'Bitte eine gültige Stundenzahl eingeben.');
      return;
    }
    await updateSettings((current) => ({
      ...current,
      minimumHours: {
        enabled,
        hours,
      },
    }));
    Alert.alert('Gespeichert', 'Mindeststunden wurden aktualisiert.');
    navigation.goBack();
  }

  return (
    <View style={styles.root}>
      <View style={styles.card}>
        <Text style={styles.section}>Mindeststunden</Text>
        <Text style={styles.hint}>
          Hinterlege deine vertraglichen Stunden pro Monat. Auf der Startseite wird die
          Monatssumme grün, wenn du die Vorgabe erreichst oder überschreitest – sonst rot.
          Die Anzeige kannst du hier ein- und ausschalten.
        </Text>

        <View style={styles.row}>
          <Text style={styles.rowTitle}>Anzeige aktiv</Text>
          <Switch
            value={enabled}
            onValueChange={setEnabled}
            trackColor={{ false: colors.line, true: colors.accent }}
            thumbColor="#FFFFFF"
          />
        </View>

        <Text style={styles.label}>Mindeststunden / Monat</Text>
        <TextInput
          style={styles.input}
          value={hoursText}
          onChangeText={setHoursText}
          placeholder="z. B. 160"
          placeholderTextColor={colors.muted}
          keyboardType="decimal-pad"
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
