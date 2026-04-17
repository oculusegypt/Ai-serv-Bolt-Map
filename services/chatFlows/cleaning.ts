import type { ServiceChatFlow } from './types';

function rangeOptions(prefix: string, from: number, to: number, subtitle?: (n: number) => string) {
  const out: { text: string; subtitle?: string }[] = [];
  for (let n = from; n <= to; n += 1) {
    out.push({ text: `${prefix} ${n}`, subtitle: subtitle ? subtitle(n) : undefined });
  }
  return out;
}

export const cleaningFlow: ServiceChatFlow = {
  serviceId: 'cleaning',
  pricing: {
    model: 'rooms_bathrooms',
    base_per_room: 120,
    base_per_bathroom: 80,
    deep_multiplier: 1.7,
    move_multiplier: 1.9,
    now_fee: 30,
    extras: {
      'تنظيف المطبخ بعمق': 120,
      'تنظيف الحمامات بعمق': 120,
      'غسيل شبابيك': 80,
      'تنظيف بلكونة': 60,
      'تنظيف ثلاجة': 70,
      'تنظيف فرن': 70,
      'كيّ ملابس': 60,
    },
  },
  quickOptionsByState: {
    // Guided flow starts here for cleaning
    cleaning_type: [
      {
        text: 'تنظيف أساسي',
        subtitle: 'تنظيف يومي/أسبوعي سريع',
        priceText: 'حسب الغرف والحمامات',
        infoTitle: 'تنظيف أساسي',
        infoText:
          'يشمل مسح وغبار وأرضيات وتنظيم بسيط + تنظيف مطبخ/حمام بشكل قياسي حسب الحالة. (يمكن تعديل التفاصيل من لوحة الأدمن لاحقًا)',
      },
      {
        text: 'تنظيف عميق',
        subtitle: 'تفاصيل أكثر وبقع/دهون',
        priceText: 'أعلى من الأساسي',
        infoTitle: 'تنظيف عميق',
        infoText:
          'يشمل كل الأساسي + تركيز على الزوايا/الحمامات/المطبخ وإزالة تراكمات. غالبًا أعلى من الأساسي 50%–100% حسب الحالة.',
      },
      {
        text: 'تنظيف انتقال/قبل السكن',
        subtitle: 'لشقة فاضية أو قبل استلام',
        priceText: 'مناسب للشقق الفاضية',
        infoTitle: 'تنظيف انتقال/قبل السكن',
        infoText:
          'مناسب للشقق الفاضية/قبل استلام/قبل نقل عفش. عادةً أعلى من الأساسي بسبب الغبار والوقت.',
      },
    ],
    cleaning_rooms: [
      ...rangeOptions('غرف', 1, 6, (n) => (n <= 2 ? 'مساحة صغيرة' : n <= 4 ? 'مساحة متوسطة' : 'مساحة كبيرة')),
      { text: 'أكثر من 6', subtitle: 'سنحسبها كحالة خاصة' },
    ],
    cleaning_bathrooms: [
      ...rangeOptions('حمامات', 1, 4, (n) => (n === 1 ? 'حمام واحد' : `${n} حمامات`)),
      { text: 'أكثر من 4', subtitle: 'سنحسبها كحالة خاصة' },
    ],
    cleaning_extras: [
      { text: 'تنظيف المطبخ بعمق', subtitle: 'تركيز على الدهون والفرن' },
      { text: 'تنظيف الحمامات بعمق', subtitle: 'إزالة الترسبات والاهتمام بالتفاصيل' },
      { text: 'غسيل شبابيك', subtitle: 'زجاج + إطارات' },
      { text: 'تنظيف بلكونة', subtitle: 'غبار وأرضيات' },
      { text: 'تنظيف ثلاجة', subtitle: 'تفريغ وتنظيف داخلي' },
      { text: 'تنظيف فرن', subtitle: 'إزالة الدهون المتراكمة' },
      { text: 'كيّ ملابس', subtitle: 'بالساعة' },
      { text: 'لا إضافات', subtitle: 'نكمّل للموعد' },
      { text: 'تم', subtitle: 'استمرار' },
    ],
    cleaning_photos: [
      { text: 'إرسال صور', subtitle: 'اختياري (يساعد في دقة التسعير)' },
      { text: 'تخطي', subtitle: 'بدون صور' },
    ],
    ask_timing: [
      { text: 'الآن', subtitle: 'إرسال الطلب فورًا لأقرب مزود' },
    ],
    cleaning_schedule_day: [
      { text: 'اليوم', subtitle: 'تحديد وقت' },
      { text: 'بكرة', subtitle: 'تحديد وقت' },
      { text: 'اختيار تاريخ', subtitle: 'اكتب التاريخ' },
    ],
    cleaning_schedule_time: [
      { text: '09:00 ص', subtitle: 'صباح' },
      { text: '12:00 م', subtitle: 'ظهر' },
      { text: '04:00 م', subtitle: 'عصر' },
      { text: '07:00 م', subtitle: 'مساء' },
    ],
    confirm_order: [
      { text: 'تأكيد', subtitle: 'تأكيد الطلب وإرساله للمزود' },
      { text: 'تعديل', subtitle: 'الرجوع وتعديل الاختيارات' },
    ],

    confirm_order_final: [
      { text: 'تأكيد', subtitle: 'تأكيد نهائي وإرسال الطلب' },
      { text: 'تعديل', subtitle: 'تغيير الاختيارات' },
    ],
  },
};
