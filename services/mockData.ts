// Mock Data - Providers, Orders, Conversations

export interface Provider {
  id: string;
  name: string;
  rating: number;
  reviewCount: number;
  distance: string;
  responseTime: string;
  completedJobs: number;
  services: string[];
  isAvailable: boolean;
  priceModifier: number; // 0.9 = 10% cheaper, 1.1 = 10% more expensive
  avatar: string;
  latitude?: number;
  longitude?: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  serviceId: string;
  serviceName: string;
  customerId: string;
  providerId: string;
  providerName: string;
  status:
    | 'pending'
    | 'accepted'
    | 'on_way'
    | 'arrived'
    | 'in_progress'
    | 'completed'
    | 'customer_paid'
    | 'paid'
    | 'cancelled';
  totalPrice: number;
  address: string;
  latitude?: number;
  longitude?: number;
  scheduledDate: string;
  scheduledTime: string;
  createdAt: string;
  rating?: number;
  customerName?: string;

  cancelledBy?: 'customer' | 'provider' | 'admin' | 'system';
  cancelReason?: string;
  cancelledAt?: string;
  refundStatus?: 'none' | 'requested' | 'approved' | 'rejected' | 'processing' | 'refunded';
  refundAmount?: number;
  refundMethod?: string;
  refundReference?: string;
}

export const MOCK_PROVIDERS: Provider[] = [
  {
    id: 'p1',
    name: 'أحمد محمد',
    rating: 4.9,
    reviewCount: 342,
    distance: '1.2 كم',
    responseTime: '5 دقائق',
    completedJobs: 1250,
    services: ['cleaning', 'carpet'],
    isAvailable: true,
    priceModifier: 1.0,
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop',
    latitude: 30.0462,
    longitude: 31.2336,
  },
  {
    id: 'p2',
    name: 'محمد عبد الرحمن',
    rating: 4.8,
    reviewCount: 215,
    distance: '2.5 كم',
    responseTime: '8 دقائق',
    completedJobs: 890,
    services: ['plumbing', 'handyman'],
    isAvailable: true,
    priceModifier: 0.95,
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop',
    latitude: 30.0409,
    longitude: 31.2428,
  },
  {
    id: 'p3',
    name: 'عمرو حسن',
    rating: 4.7,
    reviewCount: 189,
    distance: '3.1 كم',
    responseTime: '12 دقيقة',
    completedJobs: 620,
    services: ['electrical', 'ac', 'handyman'],
    isAvailable: true,
    priceModifier: 1.05,
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop',
    latitude: 30.0521,
    longitude: 31.2282,
  },
  {
    id: 'p4',
    name: 'حسام الدين',
    rating: 4.9,
    reviewCount: 456,
    distance: '0.8 كم',
    responseTime: '3 دقائق',
    completedJobs: 1800,
    services: ['ac', 'appliance'],
    isAvailable: true,
    priceModifier: 1.1,
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop',
    latitude: 30.0442,
    longitude: 31.2318,
  },
  {
    id: 'p5',
    name: 'كريم سعيد',
    rating: 4.6,
    reviewCount: 134,
    distance: '4.2 كم',
    responseTime: '15 دقيقة',
    completedJobs: 430,
    services: ['painting', 'carpentry'],
    isAvailable: true,
    priceModifier: 0.9,
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&h=200&fit=crop',
    latitude: 30.0602,
    longitude: 31.2197,
  },
  {
    id: 'p6',
    name: 'طارق عبد الله',
    rating: 4.8,
    reviewCount: 278,
    distance: '1.8 كم',
    responseTime: '7 دقائق',
    completedJobs: 960,
    services: ['pest', 'cleaning'],
    isAvailable: true,
    priceModifier: 1.0,
    avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&h=200&fit=crop',
    latitude: 30.0348,
    longitude: 31.2405,
  },
  {
    id: 'p7',
    name: 'إبراهيم فؤاد',
    rating: 4.5,
    reviewCount: 98,
    distance: '5.0 كم',
    responseTime: '20 دقيقة',
    completedJobs: 310,
    services: ['carpentry', 'handyman', 'painting'],
    isAvailable: false,
    priceModifier: 0.85,
    avatar: 'https://images.unsplash.com/photo-1480455624313-e29b44bbfde1?w=200&h=200&fit=crop',
    latitude: 30.0704,
    longitude: 31.2488,
  },
  {
    id: 'p8',
    name: 'ياسر عادل',
    rating: 4.9,
    reviewCount: 512,
    distance: '2.0 كم',
    responseTime: '6 دقائق',
    completedJobs: 2100,
    services: ['electrical', 'appliance', 'ac'],
    isAvailable: true,
    priceModifier: 1.15,
    avatar: 'https://images.unsplash.com/photo-1504257432389-52343af06ae3?w=200&h=200&fit=crop',
    latitude: 30.0489,
    longitude: 31.2621,
  },
  {
    id: 'p9',
    name: 'مصطفى نور',
    rating: 4.7,
    reviewCount: 167,
    distance: '3.5 كم',
    responseTime: '10 دقائق',
    completedJobs: 540,
    services: ['plumbing', 'handyman'],
    isAvailable: true,
    priceModifier: 0.95,
    avatar: 'https://images.unsplash.com/photo-1463453091185-61582044d556?w=200&h=200&fit=crop',
    latitude: 30.0372,
    longitude: 31.2206,
  },
  {
    id: 'p10',
    name: 'سامي رشاد',
    rating: 4.8,
    reviewCount: 301,
    distance: '1.5 كم',
    responseTime: '4 دقائق',
    completedJobs: 1100,
    services: ['carpet', 'cleaning', 'pest'],
    isAvailable: true,
    priceModifier: 1.0,
    avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&h=200&fit=crop',
    latitude: 30.0425,
    longitude: 31.2493,
  },
];

export const MOCK_ORDERS: Order[] = [
  {
    id: 'o1',
    orderNumber: 'KH-2024-001',
    serviceId: 'cleaning',
    serviceName: 'تنظيف المنزل',
    customerId: 'c1',
    providerId: 'p1',
    providerName: 'أحمد محمد',
    status: 'completed',
    totalPrice: 310,
    address: '15 شارع التحرير، الدقي',
    scheduledDate: '2024-12-15',
    scheduledTime: '10:00 ص',
    createdAt: '2024-12-14',
    rating: 5,
  },
  {
    id: 'o2',
    orderNumber: 'KH-2024-002',
    serviceId: 'plumbing',
    serviceName: 'سباكة',
    customerId: 'c2',
    providerId: 'p2',
    providerName: 'محمد عبد الرحمن',
    status: 'completed',
    totalPrice: 450,
    address: '8 شارع مصطفى كامل، المعادي',
    scheduledDate: '2024-12-18',
    scheduledTime: '2:00 م',
    createdAt: '2024-12-17',
    rating: 4,
  },
  {
    id: 'o3',
    orderNumber: 'KH-2024-003',
    serviceId: 'ac',
    serviceName: 'صيانة مكيفات',
    customerId: 'c3',
    providerId: 'p4',
    providerName: 'حسام الدين',
    status: 'in_progress',
    totalPrice: 550,
    address: '22 شارع الهرم، الجيزة',
    scheduledDate: '2024-12-20',
    scheduledTime: '11:00 ص',
    createdAt: '2024-12-19',
  },
  {
    id: 'o4',
    orderNumber: 'KH-2024-004',
    serviceId: 'electrical',
    serviceName: 'كهرباء',
    customerId: 'c4',
    providerId: 'p8',
    providerName: 'ياسر عادل',
    status: 'on_way',
    totalPrice: 380,
    address: '45 شارع النيل، الزمالك',
    scheduledDate: '2024-12-20',
    scheduledTime: '3:00 م',
    createdAt: '2024-12-20',
  },
];

export function getProvidersForService(serviceId: string): Provider[] {
  return MOCK_PROVIDERS
    .filter((p) => p.services.includes(serviceId) && p.isAvailable)
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 3);
}

export const ORDER_STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: 'بانتظار القبول', color: '#F59E0B' },
  accepted: { label: 'تم القبول', color: '#3B82F6' },
  on_way: { label: 'في الطريق', color: '#8B5CF6' },
  arrived: { label: 'وصل', color: '#0D9488' },
  in_progress: { label: 'جاري التنفيذ', color: '#F97316' },
  completed: { label: 'مكتمل', color: '#10B981' },
  customer_paid: { label: 'بانتظار تأكيد الدفع', color: '#16A34A' },
  paid: { label: 'تم الدفع', color: '#22C55E' },
  cancelled: { label: 'ملغي', color: '#EF4444' },
};
