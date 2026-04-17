-- Seed data for regions + cleaning flows
-- Run in Supabase Dashboard -> SQL Editor after supabase_schema.sql

begin;

-- Ensure bbox columns exist (in case regions table was created before bbox upgrade)
alter table public.regions add column if not exists min_lat double precision;
alter table public.regions add column if not exists max_lat double precision;
alter table public.regions add column if not exists min_lng double precision;
alter table public.regions add column if not exists max_lng double precision;

-- 1) Regions
insert into public.regions (slug, name, extra_fee, is_active, min_lat, max_lat, min_lng, max_lng)
values
  ('out_of_coverage', 'خارج نطاق الخدمة', 75, true, null, null, null, null)
on conflict (slug)
do update set
  name = excluded.name,
  extra_fee = excluded.extra_fee,
  is_active = excluded.is_active;

 -- 0) App settings (commission)
 insert into public.app_settings (key, value_num)
 values ('platform_commission_percent', 15)
 on conflict (key)
 do update set value_num = excluded.value_num;

-- Example region (Cairo core bbox) for testing
insert into public.regions (slug, name, extra_fee, is_active, min_lat, max_lat, min_lng, max_lng)
values
  ('cairo_core', 'القاهرة - نطاق أساسي', 0, true, 30.00, 30.20, 31.10, 31.35)
on conflict (slug)
do update set
  name = excluded.name,
  extra_fee = excluded.extra_fee,
  is_active = excluded.is_active,
  min_lat = excluded.min_lat,
  max_lat = excluded.max_lat,
  min_lng = excluded.min_lng,
  max_lng = excluded.max_lng;

 -- 0.1) Starter services (basic)
 insert into public.services (id, name_ar, description_ar, is_active, sort_order)
 values
   ('cleaning', 'تنظيف', 'تنظيف منزلي/مكتبي', true, 10),
   ('plumbing', 'سباكة', 'إصلاح تسريبات وتركيبات', true, 20),
   ('electrical', 'كهرباء', 'أعطال وتركيبات كهربائية', true, 30)
 on conflict (id)
 do update set
   name_ar = excluded.name_ar,
   description_ar = excluded.description_ar,
   is_active = excluded.is_active,
   sort_order = excluded.sort_order;

-- 2) Cleaning flow (GLOBAL)
insert into public.service_chat_flows (service_id, region_id, flow_json)
values (
  'cleaning',
  null,
  jsonb_build_object(
    'pricing', jsonb_build_object(
      'model','rooms_bathrooms',
      'base_per_room',120,
      'base_per_bathroom',80,
      'deep_multiplier',1.7,
      'move_multiplier',1.9,
      'now_fee',30,
      'extras', jsonb_build_object(
        'تنظيف المطبخ بعمق', 120,
        'تنظيف الحمامات بعمق', 120,
        'غسيل شبابيك', 80,
        'تنظيف بلكونة', 60,
        'تنظيف ثلاجة', 70,
        'تنظيف فرن', 70,
        'كيّ ملابس', 60
      )
    ),
    'quickOptionsByState', jsonb_build_object(
      'cleaning_type', jsonb_build_array(
        jsonb_build_object(
          'text','تنظيف أساسي',
          'subtitle','تنظيف يومي/أسبوعي سريع',
          'priceText','حسب الغرف والحمامات',
          'infoTitle','تنظيف أساسي',
          'infoText','يشمل مسح وغبار وأرضيات وتنظيم بسيط + تنظيف مطبخ/حمام بشكل قياسي حسب الحالة. (يمكن تعديل التفاصيل من لوحة الأدمن لاحقًا)'
        ),
        jsonb_build_object(
          'text','تنظيف عميق',
          'subtitle','تفاصيل أكثر وبقع/دهون',
          'priceText','أعلى من الأساسي',
          'infoTitle','تنظيف عميق',
          'infoText','يشمل كل الأساسي + تركيز على الزوايا/الحمامات/المطبخ وإزالة تراكمات. غالبًا أعلى من الأساسي 50%–100% حسب الحالة.'
        ),
        jsonb_build_object(
          'text','تنظيف انتقال/قبل السكن',
          'subtitle','لشقة فاضية أو قبل استلام',
          'priceText','مناسب للشقق الفاضية',
          'infoTitle','تنظيف انتقال/قبل السكن',
          'infoText','مناسب للشقق الفاضية/قبل استلام/قبل نقل عفش. عادةً أعلى من الأساسي بسبب الغبار والوقت.'
        )
      ),
      'cleaning_rooms', jsonb_build_array(
        jsonb_build_object('text','غرف 1','subtitle','مساحة صغيرة'),
        jsonb_build_object('text','غرف 2','subtitle','مساحة صغيرة'),
        jsonb_build_object('text','غرف 3','subtitle','مساحة متوسطة'),
        jsonb_build_object('text','غرف 4','subtitle','مساحة متوسطة'),
        jsonb_build_object('text','غرف 5','subtitle','مساحة كبيرة'),
        jsonb_build_object('text','غرف 6','subtitle','مساحة كبيرة'),
        jsonb_build_object('text','أكثر من 6','subtitle','سنحسبها كحالة خاصة')
      ),
      'cleaning_bathrooms', jsonb_build_array(
        jsonb_build_object('text','حمامات 1','subtitle','حمام واحد'),
        jsonb_build_object('text','حمامات 2','subtitle','2 حمامات'),
        jsonb_build_object('text','حمامات 3','subtitle','3 حمامات'),
        jsonb_build_object('text','حمامات 4','subtitle','4 حمامات'),
        jsonb_build_object('text','أكثر من 4','subtitle','سنحسبها كحالة خاصة')
      ),
      'cleaning_extras', jsonb_build_array(
        jsonb_build_object('text','تنظيف المطبخ بعمق','subtitle','تركيز على الدهون والفرن'),
        jsonb_build_object('text','تنظيف الحمامات بعمق','subtitle','إزالة الترسبات والاهتمام بالتفاصيل'),
        jsonb_build_object('text','غسيل شبابيك','subtitle','زجاج + إطارات'),
        jsonb_build_object('text','تنظيف بلكونة','subtitle','غبار وأرضيات'),
        jsonb_build_object('text','تنظيف ثلاجة','subtitle','تفريغ وتنظيف داخلي'),
        jsonb_build_object('text','تنظيف فرن','subtitle','إزالة الدهون المتراكمة'),
        jsonb_build_object('text','كيّ ملابس','subtitle','بالساعة'),
        jsonb_build_object('text','لا إضافات','subtitle','نكمّل للموعد'),
        jsonb_build_object('text','تم','subtitle','استمرار')
      ),
      'cleaning_photos', jsonb_build_array(
        jsonb_build_object('text','إرسال صور','subtitle','اختياري (يساعد في دقة التسعير)'),
        jsonb_build_object('text','تخطي','subtitle','بدون صور')
      ),
      'ask_timing', jsonb_build_array(
        jsonb_build_object('text','الآن','subtitle','إرسال الطلب فورًا لأقرب مزود')
      ),
      'cleaning_schedule_day', jsonb_build_array(
        jsonb_build_object('text','اليوم','subtitle','تحديد وقت'),
        jsonb_build_object('text','بكرة','subtitle','تحديد وقت'),
        jsonb_build_object('text','اختيار تاريخ','subtitle','اكتب التاريخ')
      ),
      'cleaning_schedule_time', jsonb_build_array(
        jsonb_build_object('text','09:00 ص','subtitle','صباح'),
        jsonb_build_object('text','12:00 م','subtitle','ظهر'),
        jsonb_build_object('text','04:00 م','subtitle','عصر'),
        jsonb_build_object('text','07:00 م','subtitle','مساء')
      ),
      'confirm_order', jsonb_build_array(
        jsonb_build_object('text','تأكيد','subtitle','تأكيد الطلب وإرساله للمزود'),
        jsonb_build_object('text','تعديل','subtitle','الرجوع وتعديل الاختيارات')
      ),
      'confirm_order_final', jsonb_build_array(
        jsonb_build_object('text','تأكيد','subtitle','تأكيد نهائي وإرسال الطلب'),
        jsonb_build_object('text','تعديل','subtitle','تغيير الاختيارات')
      )
    )
  )
)
on conflict (service_id, region_id)
do update set
  flow_json = excluded.flow_json;

-- 2.1) Plumbing flow (GLOBAL)
insert into public.service_chat_flows (service_id, region_id, flow_json)
values (
  'plumbing',
  null,
  jsonb_build_object(
    'quickOptionsByState', jsonb_build_object(
      'ask_details', jsonb_build_array(
        jsonb_build_object('text','تسريب مياه','subtitle','حنفية/خلاط/مواسير','infoTitle','تسريب مياه','infoText','اختار ده لو في تسريب واضح أو تنقيط مستمر. هنطلب منك تحديد المكان وبعدها الموعد.'),
        jsonb_build_object('text','انسداد صرف','subtitle','حوض/بانيو/مطبخ','infoTitle','انسداد صرف','infoText','تسليك صرف للحمام أو المطبخ. لو الانسداد شديد ممكن يحتاج وقت أطول.'),
        jsonb_build_object('text','تركيب خلاط','subtitle','مطبخ/حمام','infoTitle','تركيب خلاط','infoText','تركيب خلاط جديد + اختبار التسريب بعد التركيب.'),
        jsonb_build_object('text','تركيب حنفية','subtitle','تبديل/تركيب جديد','infoTitle','تركيب حنفية','infoText','تركيب أو تغيير حنفية مع التأكد من عدم وجود تسريب.'),
        jsonb_build_object('text','إصلاح سخان','subtitle','تشخيص + إصلاح','infoTitle','إصلاح سخان','infoText','تشخيص مشكلة السخان ومحاولة الإصلاح. قطع الغيار تُحسب حسب الحالة.'),
        jsonb_build_object('text','أخرى','subtitle','اكتب المشكلة بالتفصيل','infoTitle','مشكلة أخرى','infoText','لو مش لاقي اختيار مناسب، اختار (أخرى) واكتب التفاصيل.')
      ),
      'ask_timing', jsonb_build_array(
        jsonb_build_object('text','الآن','subtitle','طلب عاجل (قد تُضاف رسوم)'),
        jsonb_build_object('text','النهاردة','subtitle','في نفس اليوم'),
        jsonb_build_object('text','بكرة','subtitle','في اليوم التالي'),
        jsonb_build_object('text','موعد آخر','subtitle','اكتب الموعد المناسب')
      ),
      'ask_extras', jsonb_build_array(
        jsonb_build_object('text','تركيب خلاط','subtitle','إضافة خدمة تركيب'),
        jsonb_build_object('text','تسليك مواسير','subtitle','حل انسداد/ضعف صرف'),
        jsonb_build_object('text','إصلاح سخان','subtitle','تشخيص + إصلاح'),
        jsonb_build_object('text','تركيب حنفية','subtitle','تبديل/تركيب'),
        jsonb_build_object('text','لا إضافات','subtitle','بدون خدمات إضافية'),
        jsonb_build_object('text','تم','subtitle','استمرار')
      ),
      'show_price', jsonb_build_array(
        jsonb_build_object('text','موافق','subtitle','متابعة لاختيار الفني'),
        jsonb_build_object('text','تعديل','subtitle','تغيير التفاصيل/الإضافات')
      ),
      'confirm_order', jsonb_build_array(
        jsonb_build_object('text','تأكيد','subtitle','تأكيد الطلب وإرساله'),
        jsonb_build_object('text','تعديل','subtitle','الرجوع للتعديل')
      )
    )
  )
)
on conflict (service_id, region_id)
do update set
  flow_json = excluded.flow_json;

-- 2.2) Electrical flow (GLOBAL)
insert into public.service_chat_flows (service_id, region_id, flow_json)
values (
  'electrical',
  null,
  jsonb_build_object(
    'quickOptionsByState', jsonb_build_object(
      'ask_details', jsonb_build_array(
        jsonb_build_object('text','عطل كهرباء','subtitle','قاطع/فيوز/تماس','infoTitle','عطل كهرباء','infoText','اختار ده لو فيه فصل مفاجئ، قاطع بيفصل، أو ريحة حرق/شرارة. هنحدد التفاصيل والتوقيت.'),
        jsonb_build_object('text','تركيب نجفة/إضاءة','subtitle','نجف/سبوت/لمبات','infoTitle','تركيب إضاءة','infoText','تركيب نجفة أو سبوت لايت أو تغيير وحدات الإضاءة مع اختبار التشغيل.'),
        jsonb_build_object('text','فيشة/مفتاح','subtitle','تبديل/إصلاح','infoTitle','فيشة/مفتاح','infoText','إصلاح أو تغيير فيشة/مفتاح/مفتاح ديمر حسب الحالة.'),
        jsonb_build_object('text','سحب/تمديد كابلات','subtitle','تمديد جديد','infoTitle','تمديد كابلات','infoText','تمديد نقطة جديدة أو سحب كابلات/أسلاك. قد تختلف التكلفة حسب المسافة والمواد.'),
        jsonb_build_object('text','لوحة كهرباء','subtitle','قواطع/توزيع','infoTitle','لوحة كهرباء','infoText','تنظيم/تغيير قواطع أو فحص لوحة التوزيع. يتم تحديد المطلوب بعد التشخيص.'),
        jsonb_build_object('text','أخرى','subtitle','اكتب المشكلة بالتفصيل','infoTitle','مشكلة أخرى','infoText','لو مش لاقي اختيار مناسب، اختار (أخرى) واكتب التفاصيل.')
      ),
      'ask_timing', jsonb_build_array(
        jsonb_build_object('text','الآن','subtitle','طلب عاجل (قد تُضاف رسوم)'),
        jsonb_build_object('text','النهاردة','subtitle','في نفس اليوم'),
        jsonb_build_object('text','بكرة','subtitle','في اليوم التالي'),
        jsonb_build_object('text','موعد آخر','subtitle','اكتب الموعد المناسب')
      ),
      'ask_extras', jsonb_build_array(
        jsonb_build_object('text','تركيب نجفة','subtitle','إضافة خدمة تركيب'),
        jsonb_build_object('text','تركيب لمبات','subtitle','تبديل/تركيب'),
        jsonb_build_object('text','إصلاح فيشة','subtitle','فحص + إصلاح'),
        jsonb_build_object('text','تمديد كابلات','subtitle','سحب/تمديد جديد'),
        jsonb_build_object('text','لا إضافات','subtitle','بدون خدمات إضافية'),
        jsonb_build_object('text','تم','subtitle','استمرار')
      ),
      'show_price', jsonb_build_array(
        jsonb_build_object('text','موافق','subtitle','متابعة لاختيار الفني'),
        jsonb_build_object('text','تعديل','subtitle','تغيير التفاصيل/الإضافات')
      ),
      'show_providers', jsonb_build_array(
        jsonb_build_object('text','1','subtitle','اختيار الفني الأول'),
        jsonb_build_object('text','2','subtitle','اختيار الفني الثاني'),
        jsonb_build_object('text','3','subtitle','اختيار الفني الثالث'),
        jsonb_build_object('text','الأقرب','subtitle','اختيار الأقرب')
      ),
      'confirm_order', jsonb_build_array(
        jsonb_build_object('text','تأكيد','subtitle','تأكيد الطلب وإرساله'),
        jsonb_build_object('text','تعديل','subtitle','الرجوع للتعديل')
      )
    )
  )
)
on conflict (service_id, region_id)
do update set
  flow_json = excluded.flow_json;

-- 3) Cleaning flow override (Cairo core) - example: disable "الآن"
insert into public.service_chat_flows (service_id, region_id, flow_json)
select
  'cleaning',
  r.id,
  jsonb_build_object(
    'quickOptionsByState', jsonb_build_object(
      'ask_timing', jsonb_build_array(
        jsonb_build_object('text','موعد مسبق','subtitle','هذه المنطقة تتطلب تحديد موعد مسبق')
      )
    ),
    'pricing', jsonb_build_object(
      'now_fee', 0,
      'notes','Override مثال: تعطيل خيار الآن داخل نطاق معين'
    )
  )
from public.regions r
where r.slug = 'cairo_core'
on conflict (service_id, region_id)
do update set
  flow_json = excluded.flow_json;

commit;
