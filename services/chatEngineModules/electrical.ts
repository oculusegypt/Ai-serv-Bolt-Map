import { SERVICES, PRICING, calculatePrice } from '../../constants/config';
import type { ChatSession, ChatMessage, ChatState } from '../chatEngineTypes';
import type { Provider } from '../mockData';

type Helpers = {
  createMessage: (text: string, sender: 'bot' | 'user' | 'system', type?: string, data?: any) => ChatMessage;
  generateOrderNumber: () => string;
  getProvidersForService: (serviceId: ChatSession['serviceId']) => Provider[];
};

const ELECTRICAL_ALLOWED_EXTRAS = ['تركيب نجفة', 'إصلاح فيشة', 'تمديد كابلات', 'تركيب لمبات'];

export function initElectricalSession(h: Helpers): { state: ChatState; messages: ChatMessage[] } {
  return {
    state: 'ask_details',
    messages: [h.createMessage('خلّينا نحدد طلب الكهرباء بسرعة 👇 اختار نوع المشكلة/الخدمة:', 'bot')],
  };
}

export function processElectricalMessage(session: ChatSession, userText: string, h: Helpers): ChatSession {
  const newMessages = [...session.messages, h.createMessage(userText, 'user')];
  let newState: ChatSession = { ...session, messages: newMessages };

  const TIMING_RESPONSE = 'حلو ✅ اختار التوقيت:';
  const EXTRAS_RESPONSE = 'تمام ✅ تحب تضيف خدمات إضافية؟ تقدر تختار/تلغي من الكروت، واضغط (تم) للاستمرار.';

  const normalizeYes = (t: string) =>
    t.includes('تمام') || t.includes('موافق') || t.includes('أيوه') || t.includes('ماشي') || t.includes('اه');

  const isEdit = (t: string) => t.includes('تعديل') || t.includes('غيّر') || t.includes('تغير');

  const resetToStart = () => {
    newState.details = '';
    newState.selectedExtras = [];
    newState.isUrgent = false;
    newState.hours = PRICING.electrical.minimumHours;
    newState.orderNumber = null;
    newState.selectedProvider = null;
    newState.state = 'ask_details';
    newState.messages.push(h.createMessage('تمام ✅ اختار نوع المشكلة/الخدمة من الكروت عشان نكمل 👇', 'bot'));
    return newState;
  };

  switch (session.state) {
    case 'ask_details': {
      const pickedOther = userText.includes('أخرى');
      const pickedKnown =
        userText.includes('عطل') ||
        userText.includes('نجفة') ||
        userText.includes('إضاءة') ||
        userText.includes('فيشة') ||
        userText.includes('مفتاح') ||
        userText.includes('كابلات') ||
        userText.includes('تمديد') ||
        userText.includes('لوحة');

      if (!pickedKnown && !pickedOther) {
        if (newState.details === 'كهرباء - أخرى' && userText.trim()) {
          newState.details = `كهرباء - ${userText.trim()}`;
        } else {
          newState.messages.push(h.createMessage('اختار نوع المشكلة من الكروت 👇 (أو اختار "أخرى" واكتب التفاصيل).', 'bot'));
          return newState;
        }
      }

      if (pickedOther) {
        newState.details = 'كهرباء - أخرى';
        newState.messages.push(h.createMessage('تمام ✅ اكتب المشكلة بالتفصيل (مثال: القاطع بيفصل عند تشغيل السخان).', 'bot'));
        return newState;
      }

      if (!newState.details) {
        newState.details = `كهرباء - ${userText.trim()}`;
      }

      const hasLargeJob = userText.includes('كبير') || userText.includes('كتير') || userText.includes('كله');
      newState.hours = hasLargeJob ? PRICING.electrical.minimumHours + 2 : PRICING.electrical.minimumHours;
      newState.state = 'ask_timing';
      newState.messages.push(h.createMessage(TIMING_RESPONSE, 'bot'));
      return newState;
    }

    case 'ask_timing': {
      if (isEdit(userText)) return resetToStart();

      const isNow = userText.includes('الآن') || userText.includes('دلوقتي') || userText.includes('حالاً');
      const isUrgent = isNow || userText.includes('ضروري');
      newState.isUrgent = isUrgent;

      if (isNow) {
        newState.scheduledDate = 'النهاردة';
        newState.scheduledTime = 'خلال ساعة';
      } else if (userText.includes('النهاردة') || isUrgent) {
        newState.scheduledDate = 'النهاردة';
      } else if (userText.includes('بكرة')) {
        newState.scheduledDate = 'بكرة';
      } else {
        newState.scheduledDate = userText.trim() || 'موعد آخر';
      }

      if (!newState.scheduledTime) newState.scheduledTime = '10:00 ص';

      newState.state = 'ask_extras';
      newState.messages.push(h.createMessage(EXTRAS_RESPONSE, 'bot'));
      return newState;
    }

    case 'ask_extras': {
      if (isEdit(userText)) return resetToStart();

      const done = userText.includes('تم');
      const pickedNoExtras = userText.includes('لا إضافات') || userText.includes('بدون');

      if (pickedNoExtras) {
        newState.selectedExtras = [];
      } else if (ELECTRICAL_ALLOWED_EXTRAS.includes(userText)) {
        if (newState.selectedExtras.includes(userText)) {
          newState.selectedExtras = newState.selectedExtras.filter((x) => x !== userText);
          newState.messages.push(
            h.createMessage(`تم حذف الإضافة: ${userText} ✅\nتقدر تختار إضافات تانية أو اضغط (تم) للاستمرار.`, 'bot')
          );
        } else {
          newState.selectedExtras = [...newState.selectedExtras, userText];
        }
      } else if (!done && !pickedNoExtras) {
        newState.messages.push(h.createMessage('اختار الإضافات من الكروت 👇 أو اضغط (تم) للاستمرار.', 'bot'));
        return newState;
      }

      if (!done && !pickedNoExtras) {
        newState.messages.push(h.createMessage('تمام ✅ تقدر تختار إضافات أخرى أو اضغط (تم) للاستمرار.', 'bot'));
        return newState;
      }

      const priceCalc = calculatePrice('electrical', newState.hours, newState.selectedExtras, newState.isUrgent);
      const urgentText = newState.isUrgent ? '\n⚡ رسوم خدمة عاجلة: ' + priceCalc.urgentFee + ' ج.م' : '';
      const extrasText =
        newState.selectedExtras.length > 0 ? '\n➕ خدمات إضافية: ' + priceCalc.extrasTotal + ' ج.م' : '';

      const priceMessage = `تمام ✅ دي الفاتورة المبدئية:\n\n🔹 رسوم الخدمة الأساسية: ${priceCalc.subtotal} ج.م${extrasText}${urgentText}\n\n💵 الإجمالي: ${priceCalc.total} ج.م\n\nلو موافق اضغط (موافق) عشان نختار الفني. أو (تعديل) لتغيير التفاصيل.`;

      newState.state = 'show_price';
      newState.messages.push(h.createMessage(priceMessage, 'bot', 'price', priceCalc));
      return newState;
    }

    case 'show_price': {
      if (isEdit(userText)) return resetToStart();

      const accepted = normalizeYes(userText) || userText.includes('موافق');

      if (accepted) {
        const providers = h.getProvidersForService('electrical');
        const service = SERVICES.find((s: any) => s.id === 'electrical')!;

        if (!providers || providers.length === 0) {
          newState.messages.push(
            h.createMessage(
              `حاليًا مفيش فنيين ${service.name} متاحين في منطقتك.\n\nجرب تختار (تعديل) لتغيير التوقيت أو ارجع وحاول بعد شوية.`,
              'bot'
            )
          );
          return newState;
        }

        let providerText = `ممتاز يا باشا! 🎉 خلينا نشوف أقرب فنيين ${service.name} ليك:\n\n`;
        providers.forEach((p: any, i: number) => {
          providerText += `${i + 1}. ${p.name}\n⭐ ${p.rating} (${p.reviewCount} تقييم) | 📍 ${p.distance} | ⏱️ ${p.responseTime}\n\n`;
        });
        providerText += 'اختار رقم الفني اللي يعجبك أو قولي "الأقرب"';

        newState.state = 'show_providers';
        newState.messages.push(h.createMessage(providerText, 'bot', 'providers', providers));
      } else {
        newState.messages.push(h.createMessage('اختار (موافق) عشان نكمل أو (تعديل) لتغيير التفاصيل 👇', 'bot'));
      }
      return newState;
    }

    case 'show_providers': {
      const providers = h.getProvidersForService('electrical');
      let selectedProvider: Provider | null = null;

      if (!providers || providers.length === 0) {
        newState.messages.push(
          h.createMessage('حاليًا مفيش فنيين متاحين. اختار (تعديل) لتغيير تفاصيل الطلب أو جرّب لاحقًا.', 'bot')
        );
        newState.state = 'show_price';
        return newState;
      }

      if (userText.includes('1') || userText.includes('١') || userText.includes('الأول')) {
        selectedProvider = providers[0];
      } else if (userText.includes('2') || userText.includes('٢') || userText.includes('التاني')) {
        selectedProvider = providers[1];
      } else if (userText.includes('3') || userText.includes('٣') || userText.includes('التالت')) {
        selectedProvider = providers[2] || providers[0];
      } else if (userText.includes('الأقرب') || userText.includes('أي حد')) {
        selectedProvider = providers[0];
      } else {
        selectedProvider = providers[0];
      }

      newState.selectedProvider = selectedProvider;
      const orderNum = h.generateOrderNumber();
      newState.orderNumber = orderNum;

      const priceCalc = calculatePrice('electrical', newState.hours, newState.selectedExtras, newState.isUrgent);
      const confirmMsg = `تم اختيار ${selectedProvider.name} ✅\n\n📋 ملخص الطلب:\n🔹 الخدمة: ${SERVICES.find((s: any) => s.id === 'electrical')?.name}\n📍 التوقيت: ${newState.scheduledDate}\n💰 الإجمالي: ${priceCalc.total} ج.م\n👨‍🔧 الفني: ${selectedProvider.name}\n\nأأكد الطلب؟ قول "تأكيد" وهنبدأ على طول!`;

      newState.state = 'confirm_order';
      newState.messages.push(h.createMessage(confirmMsg, 'bot'));
      return newState;
    }

    case 'confirm_order': {
      if (isEdit(userText)) return resetToStart();

      const confirmed =
        userText.includes('تأكيد') ||
        normalizeYes(userText) ||
        userText.includes('موافق');

      if (confirmed) {
        const orderMsg = `🎉 تم تأكيد الطلب بنجاح!\n\n📌 رقم الطلب: ${newState.orderNumber}\n\nجاري توصيلك بأقرب فني... خليك معايا يا معلم 🤝\n\n${newState.selectedProvider?.name} هيتواصل معاك خلال دقائق. ممكن تتابع الطلب من صفحة "طلباتي"`;

        newState.state = 'order_created';
        newState.messages.push(
          h.createMessage(orderMsg, 'bot', 'order', { orderNumber: newState.orderNumber })
        );

        newState.messages.push(
          h.createMessage(
            `أنا ${newState.selectedProvider?.name}، وصلني طلبك يا باشا! أنا جاي خلال ${newState.selectedProvider?.responseTime} إن شاء الله. لو محتاج أي حاجة كلمني هنا 👋`,
            'bot'
          )
        );
        newState.state = 'handover';
      } else {
        newState.messages.push(h.createMessage('طيب يا باشا، عايز تغير حاجة ولا نلغي الطلب؟', 'bot'));
      }
      return newState;
    }

    case 'order_created':
    case 'handover': {
      newState.messages.push(
        h.createMessage('تمام يا باشا، أي حاجة تانية أنا تحت أمرك! لو محتاج تعدل أي حاجة في الطلب قولي', 'bot')
      );
      return newState;
    }

    default:
      return newState;
  }
}
