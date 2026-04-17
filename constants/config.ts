// Khidmati App Configuration

export const APP_CONFIG = {
  name: 'خدماتي',
  nameEn: 'Khidmati',
  tagline: 'كل خدمات بيتك في مكان واحد',
  currency: 'ج.م',
  locale: 'ar-EG',
  isRTL: true,
};

export type ServiceId = 
  | 'cleaning'
  | 'plumbing'
  | 'electrical'
  | 'ac'
  | 'painting'
  | 'carpentry'
  | 'pest'
  | 'appliance'
  | 'handyman'
  | 'carpet';

export interface Service {
  id: ServiceId;
  name: string;
  icon: string;
  color: string;
  colorLight: string;
  image: { uri: string };
  description: string;
}

export const SERVICES: Service[] = [
  {
    id: 'cleaning',
    name: 'تنظيف المنزل',
    icon: 'cleaning-services',
    color: '#F97316',
    colorLight: '#FFF7ED',
    image: { uri: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=400&fit=crop' },
    description: 'تنظيف شامل للشقة أو الفيلا',
  },
  {
    id: 'plumbing',
    name: 'سباكة',
    icon: 'plumbing',
    color: '#3B82F6',
    colorLight: '#EFF6FF',
    image: { uri: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=400&h=400&fit=crop' },
    description: 'إصلاح وتركيب مواسير ومعدات صحية',
  },
  {
    id: 'electrical',
    name: 'كهرباء',
    icon: 'electrical-services',
    color: '#EAB308',
    colorLight: '#FEFCE8',
    image: { uri: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&h=400&fit=crop' },
    description: 'أعمال كهربائية وتركيب وصيانة',
  },
  {
    id: 'ac',
    name: 'صيانة مكيفات',
    icon: 'ac-unit',
    color: '#0D9488',
    colorLight: '#F0FDFA',
    image: { uri: 'https://images.unsplash.com/photo-1631545806609-35d4ae440431?w=400&h=400&fit=crop' },
    description: 'تنظيف وصيانة وتركيب تكييفات',
  },
  {
    id: 'painting',
    name: 'دهان وديكور',
    icon: 'format-paint',
    color: '#8B5CF6',
    colorLight: '#F5F3FF',
    image: { uri: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=400&h=400&fit=crop' },
    description: 'دهانات وديكورات داخلية وخارجية',
  },
  {
    id: 'carpentry',
    name: 'نجارة وتركيب أثاث',
    icon: 'handyman',
    color: '#92400E',
    colorLight: '#FFFBEB',
    image: { uri: 'https://images.unsplash.com/photo-1588854337236-6889d631faa8?w=400&h=400&fit=crop' },
    description: 'تركيب وإصلاح أثاث ومطابخ',
  },
  {
    id: 'pest',
    name: 'مكافحة حشرات',
    icon: 'pest-control',
    color: '#16A34A',
    colorLight: '#F0FDF4',
    image: { uri: 'https://images.unsplash.com/photo-1632935190665-582e2bfa5e82?w=400&h=400&fit=crop' },
    description: 'رش وإبادة جميع أنواع الحشرات',
  },
  {
    id: 'appliance',
    name: 'صيانة أجهزة منزلية',
    icon: 'kitchen',
    color: '#DC2626',
    colorLight: '#FEF2F2',
    image: { uri: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400&h=400&fit=crop' },
    description: 'إصلاح غسالات وثلاجات وبوتاجازات',
  },
  {
    id: 'handyman',
    name: 'أعمال يدوية عامة',
    icon: 'build',
    color: '#EA580C',
    colorLight: '#FFF7ED',
    image: { uri: 'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?w=400&h=400&fit=crop' },
    description: 'فني متعدد المهارات لأي شغل في البيت',
  },
  {
    id: 'carpet',
    name: 'تنظيف سجاد وكنب وستائر',
    icon: 'weekend',
    color: '#EC4899',
    colorLight: '#FDF2F8',
    image: { uri: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=400&fit=crop' },
    description: 'غسيل وتنظيف بالبخار في المنزل',
  },
];

// Dynamic Pricing Engine
export interface PricingRule {
  baseFee: number;
  perHour: number;
  minimumHours: number;
  extras: { name: string; price: number }[];
  urgentMultiplier: number;
}

export const PRICING: Record<ServiceId, PricingRule> = {
  cleaning: {
    baseFee: 150,
    perHour: 80,
    minimumHours: 2,
    extras: [
      { name: 'تنظيف مطبخ عميق', price: 100 },
      { name: 'تنظيف حمامات', price: 80 },
      { name: 'كي ملابس', price: 50 },
      { name: 'ترتيب دواليب', price: 60 },
    ],
    urgentMultiplier: 1.5,
  },
  plumbing: {
    baseFee: 100,
    perHour: 120,
    minimumHours: 1,
    extras: [
      { name: 'تركيب خلاط', price: 150 },
      { name: 'تسليك مواسير', price: 200 },
      { name: 'إصلاح سخان', price: 250 },
      { name: 'تركيب حنفية', price: 100 },
    ],
    urgentMultiplier: 1.8,
  },
  electrical: {
    baseFee: 100,
    perHour: 130,
    minimumHours: 1,
    extras: [
      { name: 'تركيب نجفة', price: 100 },
      { name: 'إصلاح فيشة', price: 80 },
      { name: 'تمديد كابلات', price: 200 },
      { name: 'تركيب لمبات', price: 50 },
    ],
    urgentMultiplier: 1.8,
  },
  ac: {
    baseFee: 200,
    perHour: 150,
    minimumHours: 1,
    extras: [
      { name: 'تنظيف فلتر', price: 100 },
      { name: 'شحن فريون', price: 350 },
      { name: 'تركيب وحدة جديدة', price: 500 },
      { name: 'صيانة دورية', price: 200 },
    ],
    urgentMultiplier: 1.5,
  },
  painting: {
    baseFee: 300,
    perHour: 100,
    minimumHours: 3,
    extras: [
      { name: 'دهان أوضة واحدة', price: 500 },
      { name: 'معجون وتجهيز', price: 300 },
      { name: 'دهان سقف', price: 200 },
      { name: 'ورق حائط', price: 400 },
    ],
    urgentMultiplier: 1.3,
  },
  carpentry: {
    baseFee: 150,
    perHour: 120,
    minimumHours: 2,
    extras: [
      { name: 'تركيب مطبخ', price: 800 },
      { name: 'تركيب دولاب', price: 400 },
      { name: 'إصلاح باب', price: 200 },
      { name: 'تركيب رفوف', price: 150 },
    ],
    urgentMultiplier: 1.4,
  },
  pest: {
    baseFee: 250,
    perHour: 100,
    minimumHours: 1,
    extras: [
      { name: 'رش صراصير', price: 200 },
      { name: 'مكافحة نمل', price: 150 },
      { name: 'مكافحة بق', price: 350 },
      { name: 'رش حديقة', price: 300 },
    ],
    urgentMultiplier: 1.6,
  },
  appliance: {
    baseFee: 150,
    perHour: 140,
    minimumHours: 1,
    extras: [
      { name: 'صيانة غسالة', price: 300 },
      { name: 'صيانة ثلاجة', price: 350 },
      { name: 'صيانة بوتاجاز', price: 250 },
      { name: 'صيانة ميكروويف', price: 200 },
    ],
    urgentMultiplier: 1.5,
  },
  handyman: {
    baseFee: 100,
    perHour: 100,
    minimumHours: 1,
    extras: [
      { name: 'تعليق تلفزيون', price: 150 },
      { name: 'تركيب ستارة', price: 100 },
      { name: 'إصلاحات متنوعة', price: 80 },
      { name: 'تجميع أثاث ايكيا', price: 200 },
    ],
    urgentMultiplier: 1.5,
  },
  carpet: {
    baseFee: 200,
    perHour: 100,
    minimumHours: 2,
    extras: [
      { name: 'تنظيف سجادة كبيرة', price: 150 },
      { name: 'تنظيف كنبة', price: 200 },
      { name: 'تنظيف ستائر', price: 180 },
      { name: 'تنظيف مراتب', price: 120 },
    ],
    urgentMultiplier: 1.4,
  },
};

export function calculatePrice(
  serviceId: ServiceId,
  hours: number,
  selectedExtras: string[],
  isUrgent: boolean
): { subtotal: number; extrasTotal: number; urgentFee: number; total: number } {
  const pricing = PRICING[serviceId];
  const effectiveHours = Math.max(hours, pricing.minimumHours);
  const subtotal = pricing.baseFee + pricing.perHour * effectiveHours;
  const extrasTotal = pricing.extras
    .filter((e) => selectedExtras.includes(e.name))
    .reduce((sum, e) => sum + e.price, 0);
  const baseTotal = subtotal + extrasTotal;
  const urgentFee = isUrgent ? baseTotal * (pricing.urgentMultiplier - 1) : 0;
  const total = baseTotal + urgentFee;
  return { subtotal, extrasTotal, urgentFee, total: Math.round(total) };
}
