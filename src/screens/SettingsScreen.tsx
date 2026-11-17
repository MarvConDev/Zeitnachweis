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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../ThemeContext';
import { loadProfile, updateProfileName } from '../storage';
import type { RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

export function SettingsScreen({ navigation }: Props) {
  const { colors, darkMode, setDarkMode } = useTheme();
  const insets = useSafeAreaInsets();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      const profile = await loadProfile();
      if (profile) {
        setFirstName(profile.firstName);
        setLastName(profile.lastName);
      }
    })();
  }, []);

  async function onSaveName() {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Name fehlt', 'Bitte Vor- und Nachnamen eingeben.');
      return;
    }
    setSaving(true);
    try {
      await updateProfileName({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
      Alert.alert('Gespeichert', 'Name wurde aktualisiert.');
      navigation.goBack();
    } finally {
      setSaving(false);
    }
  }

  const styles = makeStyles(colors);

  return (
    <View style={[styles.root, { paddingBottom: Math.max(insets.bottom, 16) }]}>
      <View style={styles.card}>
        <Text style={styles.section}>Name</Text>
        <Text style={styles.hint}>
          Wird in allen Zeitnachweisen als „Nachname, Vorname“ angezeigt.
        </Text>

        <Text style={styles.label}>Vorname</Text>
        <TextInput
          style={styles.input}
          value={firstName}
          onChangeText={setFirstName}
          placeholder="Marwin"
          placeholderTextColor={colors.muted}
          autoCapitalize="words"
        />

        <Text style={styles.label}>Nachname</Text>
        <TextInput
          style={styles.input}
          value={lastName}
          onChangeText={setLastName}
          placeholder="Deiter"
          placeholderTextColor={colors.muted}
          autoCapitalize="words"
        />

        <Pressable style={styles.primaryBtn} onPress={onSaveName} disabled={saving}>
          <Text style={styles.primaryBtnText}>{saving ? 'Speichern…' : 'Name speichern'}</Text>
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
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.bg,
      padding: 16,
      gap: 12,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.line,
    },
    section: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.ink,
      marginBottom: 6,
    },
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
    row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    rowTitle: { fontWeight: '700', color: colors.ink, fontSize: 16 },
  });
}
