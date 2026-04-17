import type { Provider } from './mockData';
import type { ServiceId } from '../constants/config';

export type ChatState =
  | 'greeting'
  | 'ask_details'
  | 'cleaning_type'
  | 'cleaning_rooms'
  | 'cleaning_bathrooms'
  | 'cleaning_extras'
  | 'cleaning_photos'
  | 'cleaning_schedule_day'
  | 'cleaning_schedule_time'
  | 'cleaning_schedule_custom'
  | 'ask_timing'
  | 'ask_extras'
  | 'show_price'
  | 'show_providers'
  | 'confirm_order'
  | 'confirm_order_final'
  | 'order_created'
  | 'handover';

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'bot' | 'user' | 'system';
  timestamp: Date;
  type?: 'text' | 'price' | 'providers' | 'order' | 'photo';
  data?: any;
}

export interface ChatSession {
  serviceId: ServiceId;
  state: ChatState;
  messages: ChatMessage[];
  details: string;
  hours: number;
  selectedExtras: string[];
  isUrgent: boolean;
  selectedProvider: Provider | null;
  orderNumber: string | null;
  scheduledDate: string;
  scheduledTime: string;
  cleaningType?: 'basic' | 'deep' | 'move';
  roomsCount?: number;
  bathroomsCount?: number;
  estimatedTotal?: number;
  regionId?: string | null;
}
