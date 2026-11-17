import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../ThemeContext';
import { saveProfile } from '../storage';
import type { RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

export function OnboardingScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');

  async function onContinue() {
    if (!firstName.trim() || !lastName.trim()) {
      setError('Bitte Vor- und Nachnamen eingeben.');
      return;
    }
    await saveProfile({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
    });
    navigation.replace('Home');
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.kicker}>Zeitnachweis</Text>
        <Text style={styles.title}>Wie heißt du?</Text>
        <Text style={styles.subtitle}>
          Dein Name wird in jeden Stundenzettel übernommen (Format: Nachname, Vorname).
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

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable style={styles.button} onPress={onContinue}>
          <Text style={styles.buttonText}>Weiter</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.bg,
      justifyContent: 'center',
      padding: 20,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 22,
      borderWidth: 1,
      borderColor: colors.line,
    },
    kicker: {
      color: colors.accent,
      fontWeight: '700',
      letterSpacing: 1,
      textTransform: 'uppercase',
      fontSize: 12,
      marginBottom: 8,
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.ink,
      marginBottom: 8,
    },
    subtitle: {
      color: colors.muted,
      marginBottom: 22,
      lineHeight: 20,
    },
    label: {
      color: colors.ink,
      fontWeight: '600',
      marginBottom: 6,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      marginBottom: 14,
      fontSize: 16,
      color: colors.ink,
      backgroundColor: colors.inputBg,
    },
    error: {
      color: colors.danger,
      marginBottom: 10,
    },
    button: {
      backgroundColor: colors.accent,
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 6,
    },
    buttonText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: 16,
    },
  });
}
