import type { ServiceChatFlow } from './types';

export const electricalFlow: ServiceChatFlow = {
  serviceId: 'electrical',
  quickOptionsByState: {
    ask_details: [
      {
        text: 'عطل كهرباء',
        subtitle: 'قاطع/فيوز/تماس',
        infoTitle: 'عطل كهرباء',
        infoText: 'اختار ده لو فيه فصل مفاجئ، قاطع بيفصل، أو ريحة حرق/شرارة. هنحدد التفاصيل والتوقيت.',
      },
      {
        text: 'تركيب نجفة/إضاءة',
        subtitle: 'نجف/سبوت/لمبات',
        infoTitle: 'تركيب إضاءة',
        infoText: 'تركيب نجفة أو سبوت لايت أو تغيير وحدات الإضاءة مع اختبار التشغيل.',
      },
      {
        text: 'فيشة/مفتاح',
        subtitle: 'تبديل/إصلاح',
        infoTitle: 'فيشة/مفتاح',
        infoText: 'إصلاح أو تغيير فيشة/مفتاح/مفتاح ديمر حسب الحالة.',
      },
      {
        text: 'سحب/تمديد كابلات',
        subtitle: 'تمديد جديد',
        infoTitle: 'تمديد كابلات',
        infoText: 'تمديد نقطة جديدة أو سحب كابلات/أسلاك. قد تختلف التكلفة حسب المسافة والمواد.',
      },
      {
        text: 'لوحة كهرباء',
        subtitle: 'قواطع/توزيع',
        infoTitle: 'لوحة كهرباء',
        infoText: 'تنظيم/تغيير قواطع أو فحص لوحة التوزيع. يتم تحديد المطلوب بعد التشخيص.',
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
      { text: 'تركيب نجفة', subtitle: 'إضافة خدمة تركيب' },
      { text: 'تركيب لمبات', subtitle: 'تبديل/تركيب' },
      { text: 'إصلاح فيشة', subtitle: 'فحص + إصلاح' },
      { text: 'تمديد كابلات', subtitle: 'سحب/تمديد جديد' },
      { text: 'لا إضافات', subtitle: 'بدون خدمات إضافية' },
      { text: 'تم', subtitle: 'استمرار' },
    ],

    show_price: [
      { text: 'موافق', subtitle: 'متابعة لاختيار الفني' },
      { text: 'تعديل', subtitle: 'تغيير التفاصيل/الإضافات' },
    ],

    confirm_order: [
      { text: 'تأكيد', subtitle: 'تأكيد الطلب وإرساله' },
      { text: 'تعديل', subtitle: 'الرجوع للتعديل' },
    ],
  },
};
