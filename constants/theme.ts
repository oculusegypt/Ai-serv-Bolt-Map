// Khidmati Theme - Egyptian Home Services Marketplace
// Archetype B (Content Feed) + Q3 (Alert + Playful) adaptation

export const theme = {
  // Primary - Warm Orange (Energy, Trust, Egyptian warmth)
  primary: '#F97316',
  primaryLight: '#FB923C',
  primaryDark: '#EA580C',
  primaryFaded: 'rgba(249, 115, 22, 0.1)',

  // Secondary - Teal (Professional, Clean)
  secondary: '#0D9488',
  secondaryLight: '#2DD4BF',
  secondaryDark: '#0F766E',

  // Backgrounds
  background: '#FFFFFF',
  backgroundSecondary: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceSecondary: '#F1F5F9',

  // Text
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  textTertiary: '#94A3B8',
  textOnPrimary: '#FFFFFF',

  // Status
  success: '#10B981',
  successLight: '#D1FAE5',
  error: '#EF4444',
  errorLight: '#FEE2E2',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  info: '#3B82F6',
  infoLight: '#DBEAFE',

  // Chat
  chatBotBubble: '#F1F5F9',
  chatUserBubble: '#F97316',
  chatBotText: '#0F172A',
  chatUserText: '#FFFFFF',

  // Borders
  border: '#E2E8F0',
  borderLight: '#F1F5F9',

  // Shadows
  shadowColor: '#000000',

  // Spacing
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },

  // Border Radius
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    full: 9999,
  },

  // Typography
  typography: {
    heroTitle: { fontSize: 28, fontWeight: '700' as const },
    title: { fontSize: 22, fontWeight: '700' as const },
    subtitle: { fontSize: 18, fontWeight: '600' as const },
    body: { fontSize: 15, fontWeight: '400' as const },
    bodyBold: { fontSize: 15, fontWeight: '600' as const },
    caption: { fontSize: 13, fontWeight: '400' as const },
    captionBold: { fontSize: 13, fontWeight: '600' as const },
    small: { fontSize: 11, fontWeight: '400' as const },
    smallBold: { fontSize: 11, fontWeight: '600' as const },
    price: { fontSize: 24, fontWeight: '700' as const },
    chatMessage: { fontSize: 15, fontWeight: '400' as const },
  },
};

export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardElevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  modal: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
};
