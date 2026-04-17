import { StyleSheet } from 'react-native';

export const adminColors = {
  admin: '#8B5CF6',
  adminLight: '#F3E8FF',
};

export const createAdminStyles = (theme: any, shadows: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },

    header: {
      flexDirection: 'row-reverse',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 8,
    },
    headerTitle: { fontSize: 20, fontWeight: '800', color: theme.textPrimary, textAlign: 'right' },
    headerSubtitle: { fontSize: 13, color: theme.textSecondary, marginTop: 2, textAlign: 'right' },
    headerBadge: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      backgroundColor: adminColors.adminLight,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      gap: 6,
    },
    headerBadgeText: { fontSize: 13, fontWeight: '700', color: adminColors.admin },

    banner: { height: 120, marginHorizontal: 16, borderRadius: 16, marginTop: 8, marginBottom: 16 },

    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 10 },
    statCard: { width: '47%', padding: 16, borderRadius: 16, alignItems: 'center', gap: 6, ...shadows.card },
    statValue: { fontSize: 24, fontWeight: '900' },
    statLabel: { fontSize: 12, fontWeight: '700', color: theme.textSecondary },

    card: { backgroundColor: theme.surface, marginHorizontal: 16, marginTop: 16, padding: 16, borderRadius: 16, ...shadows.card },
    cardTitle: { fontSize: 16, fontWeight: '800', color: theme.textPrimary, textAlign: 'right', marginBottom: 12 },

    row: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.borderLight },
    rowTitle: { fontSize: 14, fontWeight: '700', color: theme.textPrimary, textAlign: 'right' },
    rowSubtitle: { fontSize: 12, color: theme.textSecondary, textAlign: 'right', marginTop: 2 },

    chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
    chipText: { fontSize: 11, fontWeight: '800' },

    emptyText: { fontSize: 14, color: theme.textTertiary, textAlign: 'center', paddingVertical: 20 },
  });
