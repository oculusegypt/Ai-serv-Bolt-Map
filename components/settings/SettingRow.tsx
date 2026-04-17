import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

export default function SettingRow({
  icon,
  title,
  value,
  onPress,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  value?: string;
  onPress?: () => void;
}) {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          flexDirection: 'row-reverse',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: 12,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 10 }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            backgroundColor: theme.surfaceSecondary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MaterialIcons name={icon} size={20} color={theme.textSecondary} />
        </View>
        <Text style={{ fontSize: 14, fontWeight: '700', color: theme.textPrimary, textAlign: 'right' }}>{title}</Text>
      </View>

      {value ? (
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 13, color: theme.textSecondary }}>{value}</Text>
          <MaterialIcons name="chevron-left" size={22} color={theme.textTertiary} />
        </View>
      ) : (
        <MaterialIcons name="chevron-left" size={22} color={theme.textTertiary} />
      )}
    </Pressable>
  );
}
