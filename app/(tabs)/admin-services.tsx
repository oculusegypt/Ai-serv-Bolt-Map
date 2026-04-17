import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TextInput } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { SERVICES } from '../../constants/config';
import { useTheme } from '../../contexts/ThemeContext';
import { adminColors, createAdminStyles } from '../../components/admin/adminStyles';

export default function AdminServicesScreen() {
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState('');
  const { theme, shadows } = useTheme();
  const adminStyles = useMemo(() => createAdminStyles(theme, shadows), [theme, shadows]);

  const filtered = useMemo(() => {
    const s = q.trim();
    if (!s) return SERVICES;
    return SERVICES.filter((x) => x.name.includes(s) || x.description.includes(s));
  }, [q]);

  return (
    <SafeAreaView edges={['top']} style={adminStyles.container}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={adminStyles.header}>
          <View style={{ flex: 1 }}>
            <Text style={adminStyles.headerTitle}>الخدمات</Text>
            <Text style={adminStyles.headerSubtitle}>{filtered.length} خدمة</Text>
          </View>
          <View style={adminStyles.headerBadge}>
            <MaterialIcons name="miscellaneous-services" size={20} color={adminColors.admin} />
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
              placeholder="ابحث عن خدمة"
              placeholderTextColor={theme.textTertiary}
              value={q}
              onChangeText={setQ}
              textAlign="right"
            />
          </View>
        </View>

        <View style={adminStyles.card}>
          <Text style={adminStyles.cardTitle}>القائمة</Text>

          {filtered.map((s) => (
            <View key={s.id} style={adminStyles.row}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  backgroundColor: s.colorLight,
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}
              >
                <Image source={s.image} style={{ width: 44, height: 44 }} contentFit="cover" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={adminStyles.rowTitle}>{s.name}</Text>
                <Text style={adminStyles.rowSubtitle}>{s.description}</Text>
              </View>
              <View style={[adminStyles.chip, { backgroundColor: theme.primaryFaded }]}>
                <Text style={[adminStyles.chipText, { color: theme.primary }]}>مفعل</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
