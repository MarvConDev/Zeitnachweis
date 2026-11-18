import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../ThemeContext';
import { loadRecentObjects, removeRecentObject, saveRecentObjects } from '../storage';
import type { RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'RecentObjects'>;

export function RecentObjectsScreen(_props: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [objects, setObjects] = useState<string[]>([]);

  const refresh = useCallback(async () => {
    setObjects(await loadRecentObjects());
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  function onDelete(value: string) {
    Alert.alert('Objekt löschen?', `„${value}“ aus den Vorschlägen entfernen?`, [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Löschen',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setObjects(await removeRecentObject(value));
          })();
        },
      },
    ]);
  }

  function onClearAll() {
    Alert.alert('Alle Vorschläge löschen?', 'Die Liste der vorgeschlagenen Objekte wird geleert.', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Alles löschen',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            await saveRecentObjects([]);
            setObjects([]);
          })();
        },
      },
    ]);
  }

  return (
    <View style={styles.root}>
      <Text style={styles.hint}>
        Hier erscheinen Objekte/Veranstaltungen, die du bereits eingetragen hast. Tippe auf
        Löschen, wenn du irgendwo nie wieder arbeitest.
      </Text>

      <FlatList
        data={objects}
        keyExtractor={(item) => item}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Noch keine Vorschläge gespeichert.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.rowText}>{item}</Text>
            <Pressable style={styles.deleteBtn} onPress={() => onDelete(item)}>
              <Text style={styles.deleteBtnText}>Löschen</Text>
            </Pressable>
          </View>
        )}
      />

      {objects.length > 0 ? (
        <Pressable style={styles.clearBtn} onPress={onClearAll}>
          <Text style={styles.clearBtnText}>Alle Vorschläge löschen</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg, padding: 16 },
    hint: { color: colors.muted, marginBottom: 14, lineHeight: 20 },
    empty: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 18,
      borderWidth: 1,
      borderColor: colors.line,
    },
    emptyText: { color: colors.muted },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.line,
      gap: 10,
    },
    rowText: { flex: 1, color: colors.ink, fontWeight: '600' },
    deleteBtn: {
      backgroundColor: colors.dangerSoft,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: colors.danger,
    },
    deleteBtnText: { color: colors.danger, fontWeight: '700' },
    clearBtn: {
      marginTop: 8,
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.danger,
      backgroundColor: colors.dangerSoft,
    },
    clearBtnText: { color: colors.danger, fontWeight: '700' },
  });
}
