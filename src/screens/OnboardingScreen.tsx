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
  const [personnelNumber, setPersonnelNumber] = useState('');
  const [error, setError] = useState('');

  async function onContinue() {
    if (!firstName.trim() || !lastName.trim()) {
      setError('Bitte fülle alle Pflichtfelder aus.');
      return;
    }
    await saveProfile({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      personnelNumber: personnelNumber.trim() || undefined,
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
          Dein Name wird in jeden Stundenzettel übernommen (Format: Name, Vorname).
          {'\n'}Felder mit * sind Pflichtfelder.
        </Text>

        <Text style={styles.label}>
          Vorname <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={[styles.input, error && !firstName.trim() && styles.inputError]}
          value={firstName}
          onChangeText={(value) => {
            setFirstName(value);
            if (error) setError('');
          }}
          placeholder="Vorname"
          placeholderTextColor={colors.muted}
          autoCapitalize="words"
        />

        <Text style={styles.label}>
          Name <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={[styles.input, error && !lastName.trim() && styles.inputError]}
          value={lastName}
          onChangeText={(value) => {
            setLastName(value);
            if (error) setError('');
          }}
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
    required: {
      color: colors.danger,
      fontWeight: '700',
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
    inputError: {
      borderColor: colors.danger,
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
