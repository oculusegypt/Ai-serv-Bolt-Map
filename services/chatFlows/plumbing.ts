import type { ServiceChatFlow } from './types';

export const plumbingFlow: ServiceChatFlow = {
  serviceId: 'plumbing',
  quickOptionsByState: {
    ask_details: [
      {
        text: 'تسريب مياه',
        subtitle: 'حنفية/خلاط/مواسير',
        infoTitle: 'تسريب مياه',
        infoText: 'اختار ده لو في تسريب واضح أو تنقيط مستمر. هنطلب منك تحديد المكان وبعدها الموعد.',
      },
      {
        text: 'انسداد صرف',
        subtitle: 'حوض/بانيو/مطبخ',
        infoTitle: 'انسداد صرف',
        infoText: 'تسليك صرف للحمام أو المطبخ. لو الانسداد شديد ممكن يحتاج وقت أطول.',
      },
      {
        text: 'تركيب خلاط',
        subtitle: 'مطبخ/حمام',
        infoTitle: 'تركيب خلاط',
        infoText: 'تركيب خلاط جديد + اختبار التسريب بعد التركيب.',
      },
      {
        text: 'تركيب حنفية',
        subtitle: 'تبديل/تركيب جديد',
        infoTitle: 'تركيب حنفية',
        infoText: 'تركيب أو تغيير حنفية مع التأكد من عدم وجود تسريب.',
      },
      {
        text: 'إصلاح سخان',
        subtitle: 'تشخيص + إصلاح',
        infoTitle: 'إصلاح سخان',
        infoText: 'تشخيص مشكلة السخان ومحاولة الإصلاح. قطع الغيار تُحسب حسب الحالة.',
      },
      {
        text: 'أخرى',
        subtitle: 'اكتب المشكلة بالتفصيل',
        infoTitle: 'مشكلة أخرى',
        infoText: 'لو مش لاقي اختيار مناسب، اختار (أخرى) واكتب التفاصيل.',
      },
    ],

    ask_timing: [
      { text: 'الآن', subtitle: 'طلب عاجل (قد تُضاف رسوم)' },
      { text: 'النهاردة', subtitle: 'في نفس اليوم' },
      { text: 'بكرة', subtitle: 'في اليوم التالي' },
      { text: 'موعد آخر', subtitle: 'اكتب الموعد المناسب' },
    ],

    ask_extras: [
      { text: 'تركيب خلاط', subtitle: 'إضافة خدمة تركيب' },
      { text: 'تسليك مواسير', subtitle: 'حل انسداد/ضعف صرف' },
      { text: 'إصلاح سخان', subtitle: 'تشخيص + إصلاح' },
      { text: 'تركيب حنفية', subtitle: 'تبديل/تركيب' },
      { text: 'لا إضافات', subtitle: 'بدون خدمات إضافية' },
      { text: 'تم', subtitle: 'استمرار' },
    ],

    show_price: [
      { text: 'موافق', subtitle: 'متابعة لاختيار الفني' },
      { text: 'تعديل', subtitle: 'تغيير التفاصيل/الإضافات' },
    ],

    show_providers: [
      { text: '1', subtitle: 'اختيار الفني الأول' },
      { text: '2', subtitle: 'اختيار الفني الثاني' },
      { text: '3', subtitle: 'اختيار الفني الثالث' },
      { text: 'الأقرب', subtitle: 'اختيار الأقرب' },
    ],

    confirm_order: [
      { text: 'تأكيد', subtitle: 'تأكيد الطلب وإرساله' },
      { text: 'تعديل', subtitle: 'الرجوع للتعديل' },
    ],
  },
};
