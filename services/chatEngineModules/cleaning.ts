import type { ChatSession, ChatMessage, ChatState } from '../chatEngineTypes';

type Helpers = {
  createMessage: (text: string, sender: 'bot' | 'user' | 'system', type?: string, data?: any) => ChatMessage;
  generateOrderNumber: () => string;
  getProvidersForService: (serviceId: ChatSession['serviceId']) => any[];
  computeCleaningTotal: (session: ChatSession) => number;
};

function parseFirstNumber(text: string): number | null {
  const m = text.match(/\d+/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
}

export function initCleaningSession(h: Helpers): { state: ChatState; messages: ChatMessage[] } {
  return {
    state: 'cleaning_type',
    messages: [h.createMessage('خلّينا نحدد طلب النظافة بسرعة 👇 اختار نوع التنظيف:', 'bot')],
  };
}

export function processCleaningMessage(session: ChatSession, userText: string, h: Helpers): ChatSession {
  const newMessages = [...session.messages, h.createMessage(userText, 'user')];
  let newState: ChatSession = { ...session, messages: newMessages };

  switch (session.state) {
    case 'cleaning_type': {
      const t = userText;
      if (t.includes('أساسي')) newState.cleaningType = 'basic';
      else if (t.includes('عميق')) newState.cleaningType = 'deep';
      else if (t.includes('انتقال') || t.includes('قبل')) newState.cleaningType = 'move';

      if (!newState.cleaningType) {
        newState.messages.push(h.createMessage('اختار نوع التنظيف من الكروت عشان نكمل 👇', 'bot'));
        return newState;
      }

      newState.state = 'cleaning_rooms';
      newState.messages.push(h.createMessage('تمام ✅ دلوقتي اختار عدد الغرف:', 'bot'));
      return newState;
    }

    case 'cleaning_rooms': {
      const n = parseFirstNumber(userText);
      if (userText.includes('أكثر') || (n !== null && n > 6)) {
        newState.roomsCount = 7;
      } else if (n !== null && n >= 1) {
        newState.roomsCount = n;
      }

      if (!newState.roomsCount) {
        newState.messages.push(h.createMessage('اختار عدد الغرف من الكروت 👇', 'bot'));
        return newState;
      }

      newState.state = 'cleaning_bathrooms';
      newState.messages.push(h.createMessage('حلو ✅ اختار عدد الحمامات:', 'bot'));
      return newState;
    }

    case 'cleaning_bathrooms': {
      const n = parseFirstNumber(userText);
      if (userText.includes('أكثر') || (n !== null && n > 4)) {
        newState.bathroomsCount = 5;
      } else if (n !== null && n >= 1) {
        newState.bathroomsCount = n;
      }

      if (!newState.bathroomsCount) {
        newState.messages.push(h.createMessage('اختار عدد الحمامات من الكروت 👇', 'bot'));
        return newState;
      }

      newState.state = 'cleaning_extras';
      newState.messages.push(h.createMessage('تمام ✅ تحب تضيف خدمات إضافية؟', 'bot'));
      return newState;
    }

    case 'cleaning_extras': {
      const done = userText.includes('تم');
      const pickedNoExtras = userText.includes('لا إضافات') || userText.includes('بدون');

      if (pickedNoExtras) {
        newState.selectedExtras = [];
      } else {
        const allowed = [
          'تنظيف المطبخ بعمق',
          'تنظيف الحمامات بعمق',
          'غسيل شبابيك',
          'تنظيف بلكونة',
          'تنظيف ثلاجة',
          'تنظيف فرن',
          'كيّ ملابس',
        ];
        if (allowed.includes(userText)) {
          if (newState.selectedExtras.includes(userText)) {
            newState.selectedExtras = newState.selectedExtras.filter((x) => x !== userText);
            newState.messages.push(h.createMessage(`تم حذف الإضافة: ${userText} ✅\nتقدر تختار إضافات تانية أو اضغط (تم) للاستمرار.`, 'bot'));
          } else {
            newState.selectedExtras = [...newState.selectedExtras, userText];
          }
        }
      }

      if (!done && !pickedNoExtras) {
        newState.messages.push(h.createMessage('تمام ✅ تقدر تختار إضافات أخرى أو اضغط (تم) للاستمرار.', 'bot'));
        return newState;
      }

      newState.state = 'cleaning_photos';
      newState.messages.push(h.createMessage('آخر خطوة قبل الموعد: تحب تبعت صور للمكان؟ (اختياري)', 'bot'));
      return newState;
    }

    case 'cleaning_photos': {
      const wantsPhotos = userText.includes('إرسال صور') || userText.includes('صور');
      const skip = userText.includes('تخطي');

      if (!wantsPhotos && !skip) {
        newState.messages.push(h.createMessage('اختار (إرسال صور) أو (تخطي) 👇', 'bot'));
        return newState;
      }

      if (wantsPhotos) {
        newState.messages.push(
          h.createMessage('تمام ✅ (ميزة الصور هتتفعّل بالكامل لاحقًا). دلوقتي نكمّل تحديد الموعد.', 'bot')
        );
      }

      newState.state = 'ask_timing';
      newState.messages.push(h.createMessage('حلو ✅ اختار التوقيت:', 'bot'));
      return newState;
    }

    case 'ask_timing': {
      const isUrgent = userText.includes('الآن') || userText.includes('دلوقتي');
      if (isUrgent) {
        newState.isUrgent = true;
        newState.scheduledDate = 'النهاردة';
        newState.scheduledTime = 'خلال ساعة';

        const total = h.computeCleaningTotal(newState);
        newState.estimatedTotal = total;
        newState.state = 'confirm_order';
        newState.messages.push(h.createMessage('راجع الفاتورة المبدئية واضغط (تأكيد) لإرسال الطلب أو (تعديل) لتغيير الاختيارات.', 'bot'));
        return newState;
      }

      // Pre-booking is disabled in the initial version.
      const wantsPrebook = userText.includes('موعد') || userText.includes('مسبق');
      if (wantsPrebook) {
        newState.messages.push(h.createMessage('حالياً الطلبات فورية فقط ✅ (الحجز المسبق قريباً). اختار (الآن) لإرسال الطلب.', 'bot'));
        return newState;
      }

      newState.isUrgent = false;
      newState.state = 'cleaning_schedule_day';
      newState.messages.push(h.createMessage('تمام ✅ اختار اليوم:', 'bot'));
      return newState;
    }

    case 'cleaning_schedule_day': {
      if (userText.includes('اختيار تاريخ')) {
        newState.state = 'cleaning_schedule_custom';
        newState.messages.push(h.createMessage('اكتب التاريخ (مثال: 2026-03-05 أو 5/3):', 'bot'));
        return newState;
      }

      if (userText.includes('اليوم')) {
        newState.scheduledDate = 'اليوم';
      } else if (userText.includes('بكرة')) {
        newState.scheduledDate = 'بكرة';
      } else {
        newState.messages.push(h.createMessage('اختار (اليوم) أو (بكرة) أو (اختيار تاريخ) 👇', 'bot'));
        return newState;
      }

      newState.state = 'cleaning_schedule_time';
      newState.messages.push(h.createMessage('اختار الوقت:', 'bot'));
      return newState;
    }

    case 'cleaning_schedule_custom': {
      newState.scheduledDate = userText.trim() || 'موعد مسبق';
      newState.state = 'cleaning_schedule_time';
      newState.messages.push(h.createMessage('اختار الوقت:', 'bot'));
      return newState;
    }

    case 'cleaning_schedule_time': {
      const t = userText.trim();
      if (!t) {
        newState.messages.push(h.createMessage('اختار الوقت من الكروت 👇', 'bot'));
        return newState;
      }

      newState.scheduledTime = t;

      const total = h.computeCleaningTotal(newState);
      newState.estimatedTotal = total;
      newState.state = 'confirm_order';
      newState.messages.push(h.createMessage('راجع الفاتورة المبدئية واضغط (تأكيد) لإرسال الطلب أو (تعديل) لتغيير الاختيارات.', 'bot'));
      return newState;
    }

    case 'show_price': {
      // Legacy state (kept for compatibility). We now go directly to confirm_order.
      newState.state = 'confirm_order';
      newState.messages.push(h.createMessage('راجع الفاتورة المبدئية واضغط (تأكيد) لإرسال الطلب أو (تعديل) لتغيير الاختيارات.', 'bot'));
      return newState;
    }

    case 'confirm_order': {
      const wantsEdit = userText.includes('تعديل');
      if (wantsEdit) {
        newState.state = 'cleaning_type';
        newState.cleaningType = undefined;
        newState.roomsCount = undefined;
        newState.bathroomsCount = undefined;
        newState.selectedExtras = [];
        newState.isUrgent = false;
        newState.estimatedTotal = undefined;
        newState.messages.push(h.createMessage('تمام ✅ خلّينا نبدأ من الأول. اختار نوع التنظيف:', 'bot'));
        return newState;
      }

      const confirmed = userText.includes('تأكيد') || userText.includes('تمام') || userText.includes('موافق');
      if (!confirmed) {
        newState.messages.push(h.createMessage('لو عايز تعدل اختياراتك ارجع خطوة خطوة من الكروت 👇', 'bot'));
        return newState;
      }

      const providers = h.getProvidersForService(session.serviceId);
      if (!providers || providers.length === 0) {
        newState.messages.push(h.createMessage('حالياً مفيش فنيين متاحين قريبين. جرّب وقت تاني 🙏', 'bot'));
        return newState;
      }

      newState.state = 'show_providers';
      newState.messages.push(
        h.createMessage('اختار الفني اللي يناسبك 👇', 'bot', 'providers', providers)
      );
      return newState;
    }

    case 'show_providers': {
      const providers = h.getProvidersForService(session.serviceId);
      let selected: any = providers[0] || null;

      if (userText.includes('1') || userText.includes('١') || userText.includes('الأول')) selected = providers[0];
      else if (userText.includes('2') || userText.includes('٢') || userText.includes('التاني')) selected = providers[1] || providers[0];
      else if (userText.includes('3') || userText.includes('٣') || userText.includes('التالت')) selected = providers[2] || providers[0];
      else if (userText.includes('الأقرب') || userText.includes('أي حد')) selected = providers[0];

      newState.selectedProvider = selected;
      const orderNum = h.generateOrderNumber();
      newState.orderNumber = orderNum;

      const total = typeof newState.estimatedTotal === 'number' ? newState.estimatedTotal : h.computeCleaningTotal(newState);
      newState.estimatedTotal = total;

      newState.state = 'confirm_order_final';
      newState.messages.push(h.createMessage('راجع الفاتورة النهائية واضغط (تأكيد) لإرسال الطلب أو (تعديل) لتغيير الاختيارات.', 'bot'));
      return newState;
    }

    case 'confirm_order_final': {
      const wantsEdit = userText.includes('تعديل');
      if (wantsEdit) {
        newState.state = 'cleaning_type';
        newState.cleaningType = undefined;
        newState.roomsCount = undefined;
        newState.bathroomsCount = undefined;
        newState.selectedExtras = [];
        newState.isUrgent = false;
        newState.estimatedTotal = undefined;
        newState.selectedProvider = null as any;
        newState.orderNumber = null as any;
        newState.messages.push(h.createMessage('تمام ✅ خلّينا نبدأ من الأول. اختار نوع التنظيف:', 'bot'));
        return newState;
      }

      const confirmed = userText.includes('تأكيد') || userText.includes('تمام') || userText.includes('موافق');
      if (!confirmed) {
        newState.messages.push(h.createMessage('اضغط (تأكيد) لإرسال الطلب أو (تعديل) لتغيير الاختيارات.', 'bot'));
        return newState;
      }

      const selected = newState.selectedProvider;
      const orderNum = newState.orderNumber || h.generateOrderNumber();
      newState.orderNumber = orderNum;
      const total = typeof newState.estimatedTotal === 'number' ? newState.estimatedTotal : h.computeCleaningTotal(newState);
      newState.estimatedTotal = total;

      const orderMsg = `🎉 تم تأكيد الطلب بنجاح!\n\n📌 رقم الطلب: ${orderNum}\n\n💵 الإجمالي: ${total} ج.م\n👨‍🔧 الفني: ${selected?.name}\n\nجاري توصيلك بالفني...`;
      newState.state = 'order_created';
      newState.messages.push(h.createMessage(orderMsg, 'bot', 'order', { orderNumber: orderNum }));
      newState.messages.push(
        h.createMessage(
          `أنا ${selected?.name}، وصلني طلبك يا باشا! أنا جاي خلال ${selected?.responseTime || 'دقايق'} إن شاء الله. لو محتاج أي حاجة كلمني هنا 👋`,
          'bot'
        )
      );
      newState.state = 'handover';
      return newState;
    }

    case 'order_created':
    case 'handover': {
      newState.messages.push(h.createMessage('تمام ✅ لو محتاج تعدل أي حاجة في الطلب قولي.', 'bot'));
      return newState;
    }
  }

  return newState;
}
