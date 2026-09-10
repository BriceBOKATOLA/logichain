import React from 'react';
import { View, FlatList, StyleSheet, Text } from 'react-native';
import { colors, spacing, typography } from '../theme/theme';
import TaskCard from '../components/TaskCard';
import { useTasks } from '../hooks/useTasks';
import { useEventContext } from '../context/EventContext';

export default function TaskListScreen({ navigation }) {
  const { eventId } = useEventContext();
  const { tasks, loading, refresh } = useTasks(eventId);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tâches & matériel</Text>
      <FlatList
        data={tasks}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <TaskCard item={item} onPress={() => navigation.navigate('Scan', { presetQr: item.qrCode })} />
        )}
        onRefresh={refresh}
        refreshing={loading}
        ListEmptyComponent={<Text style={styles.empty}>Aucun élément en cache. Connectez-vous une première fois.</Text>}
        contentContainerStyle={{ paddingBottom: spacing.xl }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  title: { ...typography.h1, fontSize: 22, marginBottom: spacing.md },
  empty: { ...typography.caption, textAlign: 'center', marginTop: spacing.xl },
});
