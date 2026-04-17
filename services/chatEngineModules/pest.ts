import { SERVICES, PRICING, calculatePrice } from '../../constants/config';
import type { ChatSession, ChatMessage, ChatState } from '../chatEngineTypes';
import type { Provider } from '../mockData';

type Helpers = {
  createMessage: (text: string, sender: 'bot' | 'user' | 'system', type?: string, data?: any) => ChatMessage;
  generateOrderNumber: () => string;
  getProvidersForService: (serviceId: ChatSession['serviceId']) => Provider[];
};

export function initPestSession(_h: Helpers): { state: ChatState; messages: ChatMessage[] } {
  return {
    state: 'greeting',
    messages: [],
  };
}

export function processPestMessage(session: ChatSession, userText: string, h: Helpers): ChatSession {
  const newMessages = [...session.messages, h.createMessage(userText, 'user')];
  let newState: ChatSession = { ...session, messages: newMessages };

  const DETAIL_RESPONSE = 'تمام! مساحة الشقة قد إيه تقريباً؟ وإيه نوع الحشرات اللي شايفها؟';
  const TIMING_RESPONSE = 'حلو أوي يا باشا! 👍 عايز الشغل ده امتى؟ النهاردة ولا بكرة ولا يوم تاني؟';
  const EXTRAS_RESPONSE = (): string => {
    const extras = PRICING.pest.extras;
    const extrasList = extras
      .map((e: any, i: number) => `${i + 1}. ${e.name} (+${e.price} ج.م)`)
      .join('\n');
    return `كويس أوي! 💪 فيه خدمات إضافية ممكن تحتاجها:\n\n${extrasList}\n\nعايز تضيف أي حاجة منهم؟ أو قولي "لا شكراً" ونكمل`;
  };

  switch (session.state) {
    case 'greeting': {
      newState.details = userText;
      newState.state = 'ask_details';
      newState.messages.push(h.createMessage(DETAIL_RESPONSE, 'bot'));
      return newState;
    }

    case 'ask_details': {
      newState.details += ' - ' + userText;
      const hasLargeJob = userText.includes('كبير') || userText.includes('كتير') || userText.includes('كله');
      newState.hours = hasLargeJob ? PRICING.pest.minimumHours + 2 : PRICING.pest.minimumHours;
      newState.state = 'ask_timing';
      newState.messages.push(h.createMessage(TIMING_RESPONSE, 'bot'));
      return newState;
    }

    case 'ask_timing': {
      const isUrgent = userText.includes('دلوقتي') || userText.includes('حالاً') || userText.includes('ضروري');
      newState.isUrgent = isUrgent;

      if (userText.includes('النهاردة') || isUrgent) {
        newState.scheduledDate = 'النهاردة';
      } else if (userText.includes('بكرة')) {
        newState.scheduledDate = 'بكرة';
      } else {
        newState.scheduledDate = userText;
      }
      newState.scheduledTime = '10:00 ص';

      newState.state = 'ask_extras';
      newState.messages.push(h.createMessage(EXTRAS_RESPONSE(), 'bot'));
      return newState;
    }

    case 'ask_extras': {
      const lowerText = userText.toLowerCase();
      const noExtras = lowerText.includes('لا') || lowerText.includes('مش') || lowerText.includes('كفاية');

      if (!noExtras) {
        const extras = PRICING.pest.extras;
        extras.forEach((extra: any) => {
          if (userText.includes(extra.name) || userText.includes(extra.name.split(' ')[0])) {
            if (!newState.selectedExtras.includes(extra.name)) newState.selectedExtras.push(extra.name);
          }
        });

        const numbers = userText.match(/[١٢٣٤1234]/g);
        if (numbers) {
          numbers.forEach((n: string) => {
            const idx =
              parseInt(n.replace('١', '1').replace('٢', '2').replace('٣', '3').replace('٤', '4')) - 1;
            if (idx >= 0 && idx < extras.length && !newState.selectedExtras.includes(extras[idx].name)) {
              newState.selectedExtras.push(extras[idx].name);
            }
          });
        }
      }

      const priceCalc = calculatePrice('pest', newState.hours, newState.selectedExtras, newState.isUrgent);
      const urgentText = newState.isUrgent ? '\n⚡ رسوم خدمة عاجلة: ' + priceCalc.urgentFee + ' ج.م' : '';
      const extrasText =
        newState.selectedExtras.length > 0 ? '\n➕ خدمات إضافية: ' + priceCalc.extrasTotal + ' ج.م' : '';

      const priceMessage = `تمام يا باشا! 💰 كده الحساب:\n\n🔹 رسوم الخدمة الأساسية: ${priceCalc.subtotal} ج.م${extrasText}${urgentText}\n\n💵 الإجمالي: ${priceCalc.total} ج.م\n\nموافق على السعر ده؟`;

      newState.state = 'show_price';
      newState.messages.push(h.createMessage(priceMessage, 'bot', 'price', priceCalc));
      return newState;
    }

    case 'show_price': {
      const accepted =
        userText.includes('تمام') ||
        userText.includes('موافق') ||
        userText.includes('أيوه') ||
        userText.includes('ماشي') ||
        userText.includes('اه');

      if (accepted) {
        const providers = h.getProvidersForService('pest');
        const service = SERVICES.find((s: any) => s.id === 'pest')!;

        let providerText = `ممتاز يا باشا! 🎉 خلينا نشوف أقرب فنيين ${service.name} ليك:\n\n`;
        providers.forEach((p: any, i: number) => {
          providerText += `${i + 1}. ${p.name}\n⭐ ${p.rating} (${p.reviewCount} تقييم) | 📍 ${p.distance} | ⏱️ ${p.responseTime}\n\n`;
        });
        providerText += 'اختار رقم الفني اللي يعجبك أو قولي "الأقرب"';

        newState.state = 'show_providers';
        newState.messages.push(h.createMessage(providerText, 'bot', 'providers', providers));
      } else {
        newState.messages.push(h.createMessage('طيب يا باشا، عايز تعدل حاجة في الطلب؟ قولي وأنا هعدل', 'bot'));
      }
      return newState;
    }

    case 'show_providers': {
      const providers = h.getProvidersForService('pest');
      let selectedProvider: Provider | null = null;

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

      const priceCalc = calculatePrice('pest', newState.hours, newState.selectedExtras, newState.isUrgent);
      const confirmMsg = `تم اختيار ${selectedProvider.name} ✅\n\n📋 ملخص الطلب:\n🔹 الخدمة: ${SERVICES.find((s: any) => s.id === 'pest')?.name}\n📍 التوقيت: ${newState.scheduledDate}\n💰 الإجمالي: ${priceCalc.total} ج.م\n👨‍🔧 الفني: ${selectedProvider.name}\n\nأأكد الطلب؟ قول "تأكيد" وهنبدأ على طول!`;

      newState.state = 'confirm_order';
      newState.messages.push(h.createMessage(confirmMsg, 'bot'));
      return newState;
    }

    case 'confirm_order': {
      const confirmed =
        userText.includes('تأكيد') ||
        userText.includes('تمام') ||
        userText.includes('أيوه') ||
        userText.includes('اه') ||
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
