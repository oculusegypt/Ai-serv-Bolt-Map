// Khidmati AI Chatbot State Machine
// Egyptian Colloquial Arabic - Multi-turn conversation engine

import { ServiceId, SERVICES, PRICING, calculatePrice } from '../constants/config';
import { getCachedProvidersForService } from './providerDirectory';
import type { Provider } from './mockData';
import { getPricingForRegion } from './chatFlows';
import { initCleaningSession, processCleaningMessage } from './chatEngineModules/cleaning';
import { initPlumbingSession, processPlumbingMessage } from './chatEngineModules/plumbing';
import { initElectricalSession, processElectricalMessage } from './chatEngineModules/electrical';
import { initAcSession, processAcMessage } from './chatEngineModules/ac';
import { initPestSession, processPestMessage } from './chatEngineModules/pest';
import { initPaintingSession, processPaintingMessage } from './chatEngineModules/painting';
import { initCarpentrySession, processCarpentryMessage } from './chatEngineModules/carpentry';
import { initApplianceSession, processApplianceMessage } from './chatEngineModules/appliance';
import { initHandymanSession, processHandymanMessage } from './chatEngineModules/handyman';
import { initCarpetSession, processCarpetMessage } from './chatEngineModules/carpet';
import type { ChatMessage, ChatSession, ChatState } from './chatEngineTypes';

export type { ChatMessage, ChatSession, ChatState };

function getProvidersForService(serviceId: ServiceId): Provider[] {
  return getCachedProvidersForService(serviceId) as unknown as Provider[];
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function generateOrderNumber(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `KH-${new Date().getFullYear()}-${num}`;
}

function createMessage(text: string, sender: 'bot' | 'user' | 'system', type?: string, data?: any): ChatMessage {
  return {
    id: generateId(),
    text,
    sender,
    timestamp: new Date(),
    type: (type as any) || 'text',
    data,
  };
}

type ServiceHandler = {
  init?: () => { state: ChatState; messages: ChatMessage[] };
  process?: (session: ChatSession, userText: string) => ChatSession;
};

const handlers: Partial<Record<ServiceId, ServiceHandler>> = {
  cleaning: {
    init: () =>
      initCleaningSession({
        createMessage,
        generateOrderNumber,
        getProvidersForService,
        computeCleaningTotal,
      }),
    process: (session, userText) =>
      processCleaningMessage(session, userText, {
        createMessage,
        generateOrderNumber,
        getProvidersForService,
        computeCleaningTotal,
      }),
  },
  plumbing: {
    init: () =>
      initPlumbingSession({
        createMessage,
        generateOrderNumber,
        getProvidersForService,
      }),
    process: (session, userText) =>
      processPlumbingMessage(session, userText, {
        createMessage,
        generateOrderNumber,
        getProvidersForService,
      }),
  },
  electrical: {
    init: () =>
      initElectricalSession({
        createMessage,
        generateOrderNumber,
        getProvidersForService,
      }),
    process: (session, userText) =>
      processElectricalMessage(session, userText, {
        createMessage,
        generateOrderNumber,
        getProvidersForService,
      }),
  },
  ac: {
    init: () =>
      initAcSession({
        createMessage,
        generateOrderNumber,
        getProvidersForService,
      }),
    process: (session, userText) =>
      processAcMessage(session, userText, {
        createMessage,
        generateOrderNumber,
        getProvidersForService,
      }),
  },
  pest: {
    init: () =>
      initPestSession({
        createMessage,
        generateOrderNumber,
        getProvidersForService,
      }),
    process: (session, userText) =>
      processPestMessage(session, userText, {
        createMessage,
        generateOrderNumber,
        getProvidersForService,
      }),
  },
  painting: {
    init: () =>
      initPaintingSession({
        createMessage,
        generateOrderNumber,
        getProvidersForService,
      }),
    process: (session, userText) =>
      processPaintingMessage(session, userText, {
        createMessage,
        generateOrderNumber,
        getProvidersForService,
      }),
  },
  carpentry: {
    init: () =>
      initCarpentrySession({
        createMessage,
        generateOrderNumber,
        getProvidersForService,
      }),
    process: (session, userText) =>
      processCarpentryMessage(session, userText, {
        createMessage,
        generateOrderNumber,
        getProvidersForService,
      }),
  },
  appliance: {
    init: () =>
      initApplianceSession({
        createMessage,
        generateOrderNumber,
        getProvidersForService,
      }),
    process: (session, userText) =>
      processApplianceMessage(session, userText, {
        createMessage,
        generateOrderNumber,
        getProvidersForService,
      }),
  },
  handyman: {
    init: () =>
      initHandymanSession({
        createMessage,
        generateOrderNumber,
        getProvidersForService,
      }),
    process: (session, userText) =>
      processHandymanMessage(session, userText, {
        createMessage,
        generateOrderNumber,
        getProvidersForService,
      }),
  },
  carpet: {
    init: () =>
      initCarpetSession({
        createMessage,
        generateOrderNumber,
        getProvidersForService,
      }),
    process: (session, userText) =>
      processCarpetMessage(session, userText, {
        createMessage,
        generateOrderNumber,
        getProvidersForService,
      }),
  },
};

const SERVICE_GREETINGS: Record<ServiceId, string[]> = {
  cleaning: [
    'أهلاً يا باشا! 👋 محتاج تنظيف للبيت؟ أنا هنا أساعدك',
    'إزيك يا معلم! محتاج شغل تنظيف النهاردة؟ قولي إيه اللي عايزه بالظبط',
  ],
  plumbing: [
    'أهلاً بيك يا باشا! 🔧 فيه مشكلة سباكة؟ قولي إيه الموضوع وأنا هحله',
    'إزيك يا معلم! عندك مشكلة في المواسير ولا حنفية؟ قولي بالتفصيل',
  ],
  electrical: [
    'أهلاً يا باشا! ⚡ فيه مشكلة كهرباء؟ قولي إيه اللي حاصل',
    'إزيك يا معلم! محتاج أعمال كهرباء؟ وصفلي المشكلة وأنا هساعدك',
  ],
  ac: [
    'أهلاً بيك يا باشا! ❄️ التكييف محتاج صيانة؟ قولي نوعه وإيه المشكلة',
    'إزيك يا معلم! عايز صيانة تكييف؟ قولي التفاصيل وأنا هعملك سعر كويس',
  ],
  painting: [
    'أهلاً يا باشا! 🎨 عايز دهان ولا ديكور؟ قولي إيه في بالك',
    'إزيك يا معلم! محتاج دهان؟ قولي عدد الأوض وإيه اللي عايزه',
  ],
  carpentry: [
    'أهلاً بيك يا باشا! 🪚 محتاج نجارة؟ تركيب أثاث ولا إصلاح؟',
    'إزيك يا معلم! عايز شغل نجارة؟ قولي بالتفصيل وأنا هقولك السعر',
  ],
  pest: [
    'أهلاً يا باشا! 🛡️ عندك مشكلة حشرات؟ قولي نوعها ومساحة المكان',
    'إزيك يا معلم! محتاج مكافحة حشرات؟ صراصير ولا نمل ولا إيه بالظبط؟',
  ],
  appliance: [
    'أهلاً بيك يا باشا! 🔌 فيه جهاز محتاج صيانة؟ قولي نوعه والمشكلة',
    'إزيك يا معلم! عندك جهاز عطلان؟ غسالة ولا ثلاجة ولا إيه؟',
  ],
  handyman: [
    'أهلاً يا باشا! 🛠️ محتاج فني يعملك أي حاجة في البيت؟ قولي إيه اللي عايزه',
    'إزيك يا معلم! أنا فني متعدد المهارات. قولي إيه الشغل المطلوب',
  ],
  carpet: [
    'أهلاً بيك يا باشا! ✨ عايز تنظيف سجاد ولا كنب ولا ستائر؟',
    'إزيك يا معلم! محتاج غسيل وتنظيف بالبخار؟ قولي إيه اللي عايز تنظفه',
  ],
};

const DETAIL_RESPONSES: Record<ServiceId, string> = {
  cleaning: 'تمام يا باشا! كام أوضة في الشقة؟ وعايز تنظيف عادي ولا عميق؟',
  plumbing: 'تمام! كده فهمت المشكلة. هل المشكلة في الحمام ولا المطبخ؟ وهل فيه تسريب؟',
  electrical: 'تمام يا معلم! هل محتاج تركيب جديد ولا إصلاح حاجة موجودة؟',
  ac: 'ماشي! كام تكييف عندك؟ ونوعه إيه؟ سبليت ولا شباك؟',
  painting: 'تمام يا باشا! كام أوضة عايز تدهنها؟ وعايز لون إيه؟',
  carpentry: 'ماشي يا معلم! هل ده تركيب أثاث جديد ولا إصلاح أثاث قديم؟',
  pest: 'تمام! مساحة الشقة قد إيه تقريباً؟ وإيه نوع الحشرات اللي شايفها؟',
  appliance: 'ماشي يا باشا! إيه نوع الجهاز بالظبط وإيه الأعراض اللي بيعملها؟',
  handyman: 'تمام! قولي بالتفصيل إيه الشغل اللي محتاجه يتعمل',
  carpet: 'ماشي يا باشا! كام قطعة عايز تنظفها؟ وهل هي في مكانها ولا هنقلها؟',
};

const TIMING_RESPONSE = 'حلو أوي يا باشا! 👍 عايز الشغل ده امتى؟ النهاردة ولا بكرة ولا يوم تاني؟';

const EXTRAS_RESPONSE = (serviceId: ServiceId): string => {
  const extras = PRICING[serviceId].extras;
  const extrasList = extras.map((e, i) => `${i + 1}. ${e.name} (+${e.price} ج.م)`).join('\n');
  return `كويس أوي! 💪 فيه خدمات إضافية ممكن تحتاجها:\n\n${extrasList}\n\nعايز تضيف أي حاجة منهم؟ أو قولي "لا شكراً" ونكمل`;
};

export function initChatSession(serviceId: ServiceId, regionId?: string | null): ChatSession {
  const greetings = SERVICE_GREETINGS[serviceId];
  const greeting = greetings[Math.floor(Math.random() * greetings.length)];

  const handlerInit = handlers[serviceId]?.init;
  const handlerBoot = handlerInit ? handlerInit() : null;

  const initialState: ChatState = handlerBoot?.state || 'greeting';
  const initialMessages = handlerBoot?.messages || [createMessage(greeting, 'bot')];

  return {
    serviceId,
    state: initialState,
    messages: initialMessages,
    details: '',
    hours: PRICING[serviceId].minimumHours,
    selectedExtras: [],
    isUrgent: false,
    selectedProvider: null,
    orderNumber: null,
    scheduledDate: '',
    scheduledTime: '',
    cleaningType: undefined,
    roomsCount: undefined,
    bathroomsCount: undefined,
    estimatedTotal: undefined,
    regionId: regionId ?? null,
  };
}

function computeCleaningTotal(session: ChatSession): number {
  const rooms = session.roomsCount || 1;
  const baths = session.bathroomsCount || 1;

  const pricing = getPricingForRegion('cleaning', session.regionId || null) || {};
  const basePerRoom = Number(pricing.base_per_room || 120);
  const basePerBath = Number(pricing.base_per_bathroom || 80);
  const deepMult = Number(pricing.deep_multiplier || 1.7);
  const moveMult = Number(pricing.move_multiplier || 1.9);
  const nowFee = Number(pricing.now_fee || 30);

  let mult = 1;
  if (session.cleaningType === 'deep') mult = deepMult;
  if (session.cleaningType === 'move') mult = moveMult;

  const extrasPrices: Record<string, number> = (pricing.extras as any) || {};
  const extrasTotal = (session.selectedExtras || []).reduce((sum, x) => sum + Number(extrasPrices[x] || 0), 0);

  const subtotal = (rooms * basePerRoom + baths * basePerBath) * mult;
  const urgentFee = session.isUrgent ? nowFee : 0;
  return Math.round(subtotal + extrasTotal + urgentFee);
}

export function processUserMessage(session: ChatSession, userText: string): ChatSession {
  const handlerProcess = handlers[session.serviceId]?.process;
  if (handlerProcess) return handlerProcess(session, userText);

  const newMessages = [...session.messages, createMessage(userText, 'user')];
  let newState = { ...session, messages: newMessages };

  switch (session.state) {
    case 'greeting': {
      newState.details = userText;
      newState.state = 'ask_details';
      newState.messages.push(createMessage(DETAIL_RESPONSES[session.serviceId], 'bot'));
      break;
    }

    case 'ask_details': {
      newState.details += ' - ' + userText;
      // Try to estimate hours from conversation
      const hasLargeJob = userText.includes('كبير') || userText.includes('كتير') || userText.includes('كله');
      newState.hours = hasLargeJob
        ? PRICING[session.serviceId].minimumHours + 2
        : PRICING[session.serviceId].minimumHours;
      newState.state = 'ask_timing';
      newState.messages.push(createMessage(TIMING_RESPONSE, 'bot'));
      break;
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
      newState.messages.push(createMessage(EXTRAS_RESPONSE(session.serviceId), 'bot'));
      break;
    }

    case 'ask_extras': {
      const lowerText = userText.toLowerCase();
      const noExtras = lowerText.includes('لا') || lowerText.includes('مش') || lowerText.includes('كفاية');
      
      if (!noExtras) {
        const extras = PRICING[session.serviceId].extras;
        extras.forEach((extra) => {
          if (userText.includes(extra.name) || userText.includes(extra.name.split(' ')[0])) {
            newState.selectedExtras.push(extra.name);
          }
        });
        // If user said a number, pick that extra
        const numbers = userText.match(/[١٢٣٤1234]/g);
        if (numbers) {
          numbers.forEach((n) => {
            const idx = parseInt(n.replace('١', '1').replace('٢', '2').replace('٣', '3').replace('٤', '4')) - 1;
            if (idx >= 0 && idx < extras.length && !newState.selectedExtras.includes(extras[idx].name)) {
              newState.selectedExtras.push(extras[idx].name);
            }
          });
        }
      }

      const priceCalc = calculatePrice(
        session.serviceId,
        newState.hours,
        newState.selectedExtras,
        newState.isUrgent
      );

      const urgentText = newState.isUrgent ? '\n⚡ رسوم خدمة عاجلة: ' + priceCalc.urgentFee + ' ج.م' : '';
      const extrasText =
        newState.selectedExtras.length > 0
          ? '\n➕ خدمات إضافية: ' + priceCalc.extrasTotal + ' ج.م'
          : '';

      const priceMessage = `تمام يا باشا! 💰 كده الحساب:\n\n🔹 رسوم الخدمة الأساسية: ${priceCalc.subtotal} ج.م${extrasText}${urgentText}\n\n💵 الإجمالي: ${priceCalc.total} ج.م\n\nموافق على السعر ده؟`;

      newState.state = 'show_price';
      newState.messages.push(createMessage(priceMessage, 'bot', 'price', priceCalc));
      break;
    }

    case 'show_price': {
      const accepted = userText.includes('تمام') || userText.includes('موافق') || userText.includes('أيوه') || userText.includes('ماشي') || userText.includes('اه');
      
      if (accepted) {
        const providers = getProvidersForService(session.serviceId);
        const service = SERVICES.find((s) => s.id === session.serviceId)!;
        
        let providerText = `ممتاز يا باشا! 🎉 خلينا نشوف أقرب فنيين ${service.name} ليك:\n\n`;
        providers.forEach((p, i) => {
          providerText += `${i + 1}. ${p.name}\n⭐ ${p.rating} (${p.reviewCount} تقييم) | 📍 ${p.distance} | ⏱️ ${p.responseTime}\n\n`;
        });
        providerText += 'اختار رقم الفني اللي يعجبك أو قولي "الأقرب"';

        newState.state = 'show_providers';
        newState.messages.push(createMessage(providerText, 'bot', 'providers', providers));
      } else {
        newState.messages.push(
          createMessage('طيب يا باشا، عايز تعدل حاجة في الطلب؟ قولي وأنا هعدل', 'bot')
        );
      }
      break;
    }

    case 'show_providers': {
      const providers = getProvidersForService(session.serviceId);
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
      const orderNum = generateOrderNumber();
      newState.orderNumber = orderNum;

      const priceCalc = calculatePrice(
        session.serviceId,
        newState.hours,
        newState.selectedExtras,
        newState.isUrgent
      );

      const confirmMsg = `تم اختيار ${selectedProvider.name} ✅\n\n📋 ملخص الطلب:\n🔹 الخدمة: ${SERVICES.find((s) => s.id === session.serviceId)?.name}\n📍 التوقيت: ${newState.scheduledDate}\n💰 الإجمالي: ${priceCalc.total} ج.م\n👨‍🔧 الفني: ${selectedProvider.name}\n\nأأكد الطلب؟ قول "تأكيد" وهنبدأ على طول!`;

      newState.state = 'confirm_order';
      newState.messages.push(createMessage(confirmMsg, 'bot'));
      break;
    }

    case 'confirm_order': {
      const confirmed = userText.includes('تأكيد') || userText.includes('تمام') || userText.includes('أيوه') || userText.includes('اه') || userText.includes('موافق');
      
      if (confirmed) {
        const orderMsg = `🎉 تم تأكيد الطلب بنجاح!\n\n📌 رقم الطلب: ${newState.orderNumber}\n\nجاري توصيلك بأقرب فني... خليك معايا يا معلم 🤝\n\n${newState.selectedProvider?.name} هيتواصل معاك خلال دقائق. ممكن تتابع الطلب من صفحة "طلباتي"`;

        newState.state = 'order_created';
        newState.messages.push(createMessage(orderMsg, 'bot', 'order', { orderNumber: newState.orderNumber }));
        
        // Simulate handover
        setTimeout(() => {}, 2000);
        newState.messages.push(
          createMessage(
            `أنا ${newState.selectedProvider?.name}، وصلني طلبك يا باشا! أنا جاي خلال ${newState.selectedProvider?.responseTime} إن شاء الله. لو محتاج أي حاجة كلمني هنا 👋`,
            'bot'
          )
        );
        newState.state = 'handover';
      } else {
        newState.messages.push(createMessage('طيب يا باشا، عايز تغير حاجة ولا نلغي الطلب؟', 'bot'));
      }
      break;
    }

    case 'order_created':
    case 'handover': {
      // Free-form chat after order
      newState.messages.push(
        createMessage('تمام يا باشا، أي حاجة تانية أنا تحت أمرك! لو محتاج تعدل أي حاجة في الطلب قولي', 'bot')
      );
      break;
    }
  }

  return newState;
}
