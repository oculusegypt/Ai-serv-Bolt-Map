import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TextInput, RefreshControl } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { adminColors, createAdminStyles } from '../../components/admin/adminStyles';

export default function AdminUsersScreen() {
  const insets = useSafeAreaInsets();
  const { allUsers, refreshUsers } = useAuth();
  const [q, setQ] = useState('');
  const { theme, shadows } = useTheme();
  const adminStyles = useMemo(() => createAdminStyles(theme, shadows), [theme, shadows]);

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await refreshUsers();
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    refreshUsers().catch(() => {});
  }, [refreshUsers]);

  const filtered = useMemo(() => {
    const s = q.trim();
    if (!s) return allUsers;
    return allUsers.filter((u) => (u.name || '').includes(s) || (u.phone || '').includes(s) || (u.email || '').includes(s));
  }, [allUsers, q]);

  const roleLabel = (r: string) => (r === 'admin' ? 'أدمن' : r === 'provider' ? 'فني' : 'عميل');
  const roleColor = (r: string) => (r === 'admin' ? adminColors.admin : r === 'provider' ? theme.secondary : theme.primary);
  const roleBg = (r: string) => (r === 'admin' ? adminColors.adminLight : r === 'provider' ? 'rgba(13,148,136,0.1)' : theme.primaryFaded);

  return (
    <SafeAreaView edges={['top']} style={adminStyles.container}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              onRefresh().catch(() => {});
            }}
            colors={[theme.primary]}
            tintColor={theme.primary}
          />
        }
      >
        <View style={adminStyles.header}>
          <View style={{ flex: 1 }}>
            <Text style={adminStyles.headerTitle}>المستخدمين</Text>
            <Text style={adminStyles.headerSubtitle}>{filtered.length} مستخدم</Text>
          </View>
          <View style={adminStyles.headerBadge}>
            <MaterialIcons name="people" size={20} color={adminColors.admin} />
            <Text style={adminStyles.headerBadgeText}>إدارة</Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: 16, marginTop: 4 }}>
          <View
            style={{
              flexDirection: 'row-reverse',
              alignItems: 'center',
              backgroundColor: theme.surfaceSecondary,
              borderRadius: 16,
              paddingHorizontal: 14,
              height: 50,
              gap: 10,
            }}
          >
            <MaterialIcons name="search" size={22} color={theme.textTertiary} />
            <TextInput
              style={{ flex: 1, fontSize: 14, color: theme.textPrimary, textAlign: 'right' }}
              placeholder="ابحث بالاسم أو الهاتف أو البريد"
              placeholderTextColor={theme.textTertiary}
              value={q}
              onChangeText={setQ}
              textAlign="right"
            />
          </View>
        </View>

        <View style={adminStyles.card}>
          <Text style={adminStyles.cardTitle}>القائمة</Text>

          {filtered.length === 0 ? (
            <Text style={adminStyles.emptyText}>لا توجد نتائج</Text>
          ) : (
            filtered.map((u) => (
              <View key={u.id} style={adminStyles.row}>
                <Image
                  source={{ uri: u.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop' }}
                  style={{ width: 40, height: 40, borderRadius: 20 }}
                  contentFit="cover"
                />
                <View style={{ flex: 1 }}>
                  <Text style={adminStyles.rowTitle}>{u.name || 'مستخدم'}</Text>
                  <Text style={adminStyles.rowSubtitle}>{u.phone || u.email || ''}</Text>
                </View>
                <View style={[adminStyles.chip, { backgroundColor: roleBg(u.role) }]}>
                  <Text style={[adminStyles.chipText, { color: roleColor(u.role) }]}>{roleLabel(u.role)}</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
