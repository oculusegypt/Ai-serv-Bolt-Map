export type ChatUiState =
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

export type QuickOption = {
  text: string;
  subtitle?: string;
  priceText?: string;
  infoTitle?: string;
  infoText?: string;
};

export type ServiceChatFlow = {
  serviceId: string;
  quickOptionsByState: Partial<Record<ChatUiState, QuickOption[]>>;
  pricing?: any;
};
