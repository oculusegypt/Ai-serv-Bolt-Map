import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { updateMyProfile } from '../../services/profilesService';
import { uploadAvatar, uploadVerificationDoc } from '../../services/storageService';

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme, shadows } = useTheme();
  const { user } = useAuth();

  const styles = useMemo(() => createStyles(theme, shadows), [theme, shadows]);

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar || '');
  const [docUrls, setDocUrls] = useState<string[]>(user?.documents || []);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  if (!user) {
    return (
      <SafeAreaView edges={['top']} style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.title}>لازم تسجل دخول الأول</Text>
        </View>
      </SafeAreaView>
    );
  }

  const pickAvatar = async () => {
    Haptics.selectionAsync();
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('تنبيه', 'يلزم السماح بالصور');
      return;
    }

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.85,
    });

    if (res.canceled || !res.assets?.[0]?.uri) return;

    setUploadingAvatar(true);
    try {
      const up = await uploadAvatar({ userId: user.id, uri: res.assets[0].uri });
      if (!up.ok || !up.url) {
        Alert.alert('خطأ', up.error || 'فشل رفع الصورة');
        return;
      }
      setAvatarUrl(up.url);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const pickDoc = async () => {
    Haptics.selectionAsync();
    setUploadingDoc(true);
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true, multiple: false });
      if (res.canceled || !res.assets?.[0]?.uri) return;
      const a = res.assets[0];
      const up = await uploadVerificationDoc({ userId: user.id, uri: a.uri, fileName: a.name });
      if (!up.ok || !up.url) {
        Alert.alert('خطأ', up.error || 'فشل رفع الملف');
        return;
      }
      setDocUrls((prev) => [...prev, up.url!]);
    } finally {
      setUploadingDoc(false);
    }
  };

  const onSave = async () => {
    Haptics.selectionAsync();

    const n = name.trim();
    if (!n) {
      Alert.alert('تنبيه', 'اكتب الاسم');
      return;
    }

    setSaving(true);
    try {
      const res = await updateMyProfile({
        userId: user.id,
        name: n,
        phone: phone.trim(),
        avatar: avatarUrl ? avatarUrl : null,
        documents: docUrls,
      });
      if (!res.ok) {
        Alert.alert('خطأ', res.error || 'فشل حفظ البيانات');
        return;
      }
      Alert.alert('تم', 'تم حفظ البيانات');
      router.back();
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => { Haptics.selectionAsync(); router.back(); }} style={styles.headerBtn}>
          <MaterialIcons name="arrow-forward" size={22} color={theme.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>البيانات الشخصية</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 16, paddingTop: 14 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <View style={styles.avatarRow}>
            <Image
              source={{ uri: avatarUrl || user.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop' }}
              style={styles.avatar}
              contentFit="cover"
            />
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text style={styles.cardTitle}>الصورة الشخصية</Text>
              <Text style={styles.cardHint}>سيتم رفع الصورة إلى التخزين</Text>
            </View>
          </View>

          <Pressable style={styles.actionBtn} onPress={pickAvatar} disabled={uploadingAvatar}>
            {uploadingAvatar ? <ActivityIndicator color="#FFF" /> : <MaterialIcons name="photo" size={18} color="#FFF" />}
            <Text style={styles.actionBtnText}>تغيير الصورة</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.inputLabel}>الاسم</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            style={styles.input}
            placeholder="الاسم"
            placeholderTextColor={theme.textTertiary}
            textAlign="right"
          />

          <Text style={[styles.inputLabel, { marginTop: 10 }]}>رقم الهاتف</Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            style={styles.input}
            placeholder="01xxxxxxxxx"
            placeholderTextColor={theme.textTertiary}
            textAlign="right"
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.card}>
          <View style={styles.docHeader}>
            <Text style={styles.cardTitle}>ملفات التحقق</Text>
            <Text style={styles.cardHint}>{docUrls.length} ملفات</Text>
          </View>

          <Pressable style={styles.actionBtnSecondary} onPress={pickDoc} disabled={uploadingDoc}>
            {uploadingDoc ? <ActivityIndicator color={theme.primary} /> : <MaterialIcons name="upload-file" size={18} color={theme.primary} />}
            <Text style={styles.actionBtnSecondaryText}>رفع ملف</Text>
          </Pressable>

          {docUrls.length > 0 ? (
            <View style={{ marginTop: 10, gap: 8 }}>
              {docUrls.slice(0, 6).map((u, idx) => (
                <View key={idx} style={styles.docRow}>
                  <MaterialIcons name="insert-drive-file" size={18} color={theme.textSecondary} />
                  <Text style={styles.docUrl} numberOfLines={1}>{u}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        <Pressable style={[styles.saveBtn, saving && { opacity: 0.7 }]} onPress={onSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#FFF" /> : <MaterialIcons name="save" size={18} color="#FFF" />}
          <Text style={styles.saveBtnText}>حفظ</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: any, shadows: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.backgroundSecondary },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
    header: {
      height: 56,
      backgroundColor: theme.background,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      paddingHorizontal: 12,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 16, fontWeight: '900', color: theme.textPrimary },
    title: { fontSize: 16, fontWeight: '900', color: theme.textPrimary },
    card: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 14,
      borderWidth: 1,
      borderColor: theme.border,
      ...shadows.card,
      marginBottom: 12,
    },
    avatarRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
    avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: theme.surfaceSecondary },
    cardTitle: { fontSize: 14, fontWeight: '900', color: theme.textPrimary, textAlign: 'right' },
    cardHint: { marginTop: 4, fontSize: 12, fontWeight: '700', color: theme.textSecondary, textAlign: 'right' },
    actionBtn: {
      marginTop: 12,
      height: 44,
      borderRadius: 14,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row-reverse',
      gap: 8,
    },
    actionBtnText: { color: '#FFF', fontWeight: '900' },
    inputLabel: { fontSize: 12, fontWeight: '900', color: theme.textSecondary, textAlign: 'right' },
    input: {
      marginTop: 8,
      height: 46,
      borderRadius: 14,
      backgroundColor: theme.surfaceSecondary,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: theme.border,
      color: theme.textPrimary,
      fontWeight: '800',
    },
    docHeader: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
    actionBtnSecondary: {
      marginTop: 10,
      height: 44,
      borderRadius: 14,
      backgroundColor: theme.primaryFaded,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row-reverse',
      gap: 8,
    },
    actionBtnSecondaryText: { color: theme.primary, fontWeight: '900' },
    docRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
    docUrl: { flex: 1, color: theme.textSecondary, fontWeight: '700', textAlign: 'right' },
    saveBtn: {
      height: 48,
      borderRadius: 16,
      backgroundColor: theme.success,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row-reverse',
      gap: 10,
      marginTop: 8,
    },
    saveBtnText: { color: '#FFF', fontWeight: '900', fontSize: 15 },
  });
