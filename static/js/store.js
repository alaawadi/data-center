(function () {
  'use strict';

  var KEY = 'student_portfolio_v2';

  function uid(prefix) {
    return (prefix || 'id') + '_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
  }

  function daysAgo(n, h) {
    var d = new Date();
    d.setDate(d.getDate() - n);
    if (h != null) d.setHours(h, 20, 0, 0);
    return d.toISOString();
  }

  function monthsAgo(n) {
    var d = new Date();
    d.setMonth(d.getMonth() - n);
    d.setDate(12);
    return d.toISOString();
  }

  function svgURI(svg) {
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  function grad(a, b, emoji, w, h) {
    w = w || 800; h = h || 500;
    return svgURI(
      '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '">' +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + a + '"/><stop offset="1" stop-color="' + b + '"/></linearGradient>' +
      '<pattern id="d" width="36" height="36" patternUnits="userSpaceOnUse"><circle cx="5" cy="5" r="1.5" fill="rgba(255,255,255,.18)"/></pattern></defs>' +
      '<rect width="' + w + '" height="' + h + '" fill="url(#g)"/><rect width="' + w + '" height="' + h + '" fill="url(#d)"/>' +
      '<circle cx="' + (w - 90) + '" cy="70" r="150" fill="rgba(255,255,255,.09)"/>' +
      '<circle cx="90" cy="' + (h - 60) + '" r="170" fill="rgba(0,0,0,.10)"/>' +
      '<text x="50%" y="54%" text-anchor="middle" font-size="' + Math.round(Math.min(w, h) * 0.28) + '">' + (emoji || '⭐') + '</text>' +
      '</svg>'
    );
  }

  function fileData(name, text) {
    return 'data:text/plain;charset=utf-8;base64,' + btoa(unescape(encodeURIComponent(text || '')));
  }

  function seed() {
    return {
      version: 2,
      profile: {
        id: 'me',
        name: 'أحمد خالد الحسن',
        handle: 'ahmadkhaled',
        verified: true,
        title: 'مطوّر واجهات أمامية · طالب هندسة برمجيات',
        bio: 'أبني واجهات سريعة وجميلة، وأوثّق رحلة التعلّم عبر الشهادات والمشاريع اليومية. مهتم بتجربة المستخدم والمنتجات الرقمية.',
        avatar: '',
        location: 'الرياض، السعودية',
        website: 'ahmadkhaled.dev',
        email: 'ahmad@example.com',
        joined: monthsAgo(14),
        socials: {
          github: 'https://github.com/ahmadkhaled',
          linkedin: 'https://linkedin.com/in/ahmadkhaled',
          behance: ''
        }
      },
      skills: [
        { id: 'sk1', name: 'HTML & CSS', level: 92 },
        { id: 'sk2', name: 'JavaScript', level: 86 },
        { id: 'sk3', name: 'React', level: 74 },
        { id: 'sk4', name: 'UI/UX Design', level: 70 },
        { id: 'sk5', name: 'Node.js', level: 62 },
        { id: 'sk6', name: 'Git & GitHub', level: 80 },
        { id: 'sk7', name: 'Figma', level: 68 },
        { id: 'sk8', name: 'Python', level: 55 }
      ],
      certificates: [
        {
          id: 'c1',
          title: 'أساسيات تطوير الواجهات الأمامية',
          issuer: 'أكاديمية المستقبل التقنية',
          category: 'برمجة',
          price: '₪180',
          duration: '36 ساعة',
          period: '12 لقاءات',
          date: monthsAgo(3),
          image: grad('#1d4ed8', '#3b82f6', '💻'),
          credentialId: 'FE-2026-48192',
          verifyUrl: 'https://example.com/verify/FE-2026-48192',
          description: 'برنامج تدريبي مكثّف (12 أسبوعاً) يغطي HTML5 وCSS3 وJavaScript الحديثة وبناء واجهات متجاوبة تتبع معايير الوصولية، مع مشروع تخرّج تفاعلي.',
          skills: ['HTML', 'CSS', 'JavaScript', 'Responsive Design'],
          syllabus: [
            { title: 'البداية مع HTML', lessons: [
              { title: 'مقدمة في تطوير الواجهات', duration: '08:20', type: 'video', free: true, content: 'نظرة عامة على مسار تطوير الواجهات الأمامية وما ستبنيه في هذه الدورة خطوة بخطوة.' },
              { title: 'بنية صفحة HTML5', duration: '14:05', type: 'video', content: 'الوسوم الأساسية، العناصر الدلالية، وبنية المستند الصحيح.' },
              { title: 'النصوص والروابط والصور', duration: '16:40', type: 'video', content: 'التعامل مع المحتوى النصي والروابط والصور والوسائط داخل الصفحة.' }
            ] },
            { title: 'التنسيق بـ CSS3', lessons: [
              { title: 'أساسيات CSS والمحددات', duration: '18:10', type: 'video', content: 'المحددات، التسلسل الهرمي، الألوان والمسافات وخصائص التخطيط الأساسية.' },
              { title: 'ال Flexbox والشبكات', duration: '22:15', type: 'video', content: 'بناء تخطيطات مرنة باستخدام Flexbox و Grid بأمثلة عملية.' },
              { title: 'التصميم المتجاوب', duration: '19:50', type: 'video', free: true, content: 'جعل الواجهة تتكيف مع الشاشات الصغيرة والمتوسطة والكبيرة.' }
            ] },
            { title: 'JavaScript الحديثة', lessons: [
              { title: 'المتغيرات والدوال', duration: '20:30', type: 'video', content: 'أساسيات اللغة: المتغيرات، الدوال، المصفوفات، والكائنات.' },
              { title: 'التفاعل مع DOM', duration: '24:45', type: 'video', content: 'اختيار العناصر، مستمعي الأحداث، وتحديث محتوى الصفحة ديناميكياً.' },
              { title: 'مشروع عملي: صفحة تسجيل تفاعلية', duration: '28:00', type: 'video', content: 'نبني معاً صفحة تسجيل كاملة مع تحقق من المدخلات وتنسيق حي.' }
            ] },
            { title: 'الخاتمة', lessons: [
              { title: 'إتاحة الوصول وتحسين الظهور', duration: '15:25', type: 'article', content: 'معايير الوصولية WAI-ARIA وأساسيات تحسين ظهور الصفحات في محركات البحث.' },
              { title: 'مشروع التخرّج وخطوات ما بعد الدورة', duration: '17:10', type: 'video', content: 'متطلبات مشروع التخرّج وكيف توثّق مشروعك وتنشره في بورتفوليوك.' }
            ] }
          ],
          addedAt: daysAgo(80)
        },
        {
          id: 'c2',
          title: 'شهادة تدريب تطوير البرمجيات',
          issuer: 'شركة نُور للتقنية',
          category: 'تدريب مهني',
          price: '₪200',
          duration: '32 ساعة',
          period: '8 لقاءات',
          date: monthsAgo(6),
          image: grad('#0f766e', '#14b8a6', '🏢'),
          credentialId: 'INTERN-2025-773',
          verifyUrl: 'https://example.com/verify/INTERN-2025-773',
          description: 'تدريب صيفي مدته 8 أسابيع ضمن فريق المنتجات، عملت فيه على لوحة تحكم داخلية باستخدام React، وطوّرت نظاماً لإدارة طلبات الدعم مع فريق الواجهة الخلفية.',
          skills: ['React', 'REST API', 'Agile', 'Teamwork'],
          syllabus: [
            { title: 'الانضمام لفريق المنتج', lessons: [
              { title: 'أهلاً بك في التدريب', duration: '07:45', type: 'video', free: true, content: 'خريطة التدريب، طريقة العمل داخل الفريق، والتوقعات منك كمتدرب.' },
              { title: 'كيف نعمل بمنهج Agile', duration: '13:20', type: 'video', content: 'السباقات (Sprints)، الاجتماعات اليومية، وتنظيم المهام على لوحة الفريق.' }
            ] },
            { title: 'بناء لوحة التحكم', lessons: [
              { title: 'تهيئة بيئة React', duration: '16:00', type: 'video', content: 'تجهيز المشروع، بنية المجلدات، وتشغيل خادم التطوير.' },
              { title: 'واجهة الطلبات مع REST API', duration: '25:30', type: 'video', content: 'جلب البيانات وعرضها وربطها بنماذج الإدخال مع معالجة الأخطاء.' },
              { title: 'إدارة الحالة', duration: '18:40', type: 'video', content: 'تنظيم الحالة المشتركة بين المكوّنات وتحسين أداء اللوحة.' }
            ] },
            { title: 'المراجعة والتسليم', lessons: [
              { title: 'مراجعة الكود مع الفريق', duration: '12:10', type: 'article', content: 'آداب مراجعة الكود، الملاحظات البنّاءة، ومعايير الدمج.' },
              { title: 'تسليم المشروع النهائي', duration: '10:55', type: 'video', content: 'تجهيز النسخة النهائية، التوثيق، والعرض أمام الفريق.' }
            ] }
          ],
          addedAt: daysAgo(150)
        },
        {
          id: 'c3',
          title: 'تصميم تجربة المستخدم — المستوى الأول',
          issuer: 'DesignLab Academy',
          category: 'تصميم',
          price: '₪150',
          duration: '18 ساعة',
          period: '6 لقاءات',
          date: monthsAgo(2),
          image: grad('#7c3aed', '#a78bfa', '🎨'),
          credentialId: 'UX-101-90211',
          verifyUrl: 'https://example.com/verify/UX-101-90211',
          description: 'دورة عملية تركز على أبحاث المستخدم، ورسم الرحلات، والنماذج الأولية في Figma، واختبار قابلية الاستخدام مع مستخدمين حقيقيين.',
          skills: ['Figma', 'User Research', 'Prototyping', 'Usability'],
          syllabus: [
            { title: 'أبحاث المستخدم', lessons: [
              { title: 'ما هي تجربة المستخدم', duration: '09:30', type: 'video', free: true, content: 'مفاهيم تجربة المستخدم ودورها في نجاح المنتج الرقمي.' },
              { title: 'مقابلات المستخدمين', duration: '17:20', type: 'video', content: 'إعداد الأسئلة، إجراء المقابلات، واستخلاص الأنماط من الإجابات.' }
            ] },
            { title: 'النماذج في Figma', lessons: [
              { title: 'أساسيات Figma', duration: '21:15', type: 'video', content: 'الأدوات، المكوّنات، وأنماط التصميم داخل Figma.' },
              { title: 'بناء نموذج تفاعلي', duration: '26:00', type: 'video', content: 'ربط الشاشات وبناء رحلة استخدام قابلة للتجربة.' }
            ] },
            { title: 'الاختبار والتحسين', lessons: [
              { title: 'اختبار قابلية الاستخدام', duration: '15:45', type: 'article', content: 'تصميم جلسة اختبار، ملاحظة المستخدمين، وتوثيق النتائج.' },
              { title: 'تقرير التحسينات', duration: '12:30', type: 'video', content: 'تحويل ملاحظات الاختبار إلى توصيات تصميمية قابلة للتنفيذ.' }
            ] }
          ],
          addedAt: daysAgo(45)
        },
        {
          id: 'c4',
          title: 'التحليل البيانات باستخدام Python',
          issuer: 'منصة بيانات العرب',
          category: 'بيانات',
          price: '₪220',
          duration: '30 ساعة',
          period: '10 لقاءات',
          date: monthsAgo(9),
          image: grad('#b45309', '#f59e0b', '📊'),
          credentialId: 'DA-PY-33418',
          verifyUrl: 'https://example.com/verify/DA-PY-33418',
          description: 'برنامج يشمل Pandas وتحليل البيانات وتمثيلها بصرياً بـ Matplotlib، مع مشروع تحليل مقارنة بين مسارات تعلّم البرمجة.',
          skills: ['Python', 'Pandas', 'Data Visualization'],
          syllabus: [
            { title: 'تهيئة البيئة', lessons: [
              { title: 'مقدمة Python للتحليل', duration: '11:20', type: 'video', free: true, content: 'لماذا Python للبيانات؟ جولة على الأدوات والبيئات المستخدمة.' },
              { title: 'تثبيت Anaconda وJupyter', duration: '13:05', type: 'video', content: 'تجهيز بيئة العمل وتشغيل دفتر Jupyter Notebook.' }
            ] },
            { title: 'العمل مع Pandas', lessons: [
              { title: 'هياكل البيانات في Pandas', duration: '24:30', type: 'video', content: 'Series وDataFrame، الفهرسة، والتصفية الشرطية.' },
              { title: 'تنظيف وتحويل البيانات', duration: '27:15', type: 'video', content: 'معالجة القيم المفقودة، الدمج، والتجميعات المتقدمة.' }
            ] },
            { title: 'التمثيل البصري والمشروع', lessons: [
              { title: 'Matplotlib وSeaborn', duration: '22:40', type: 'video', content: 'رسوم بيانية احترافية: خطوط، أعمدة، توزيعات، وخرائط حرارية.' },
              { title: 'مشروع: تحليل مقارنة مسارات التعلّم', duration: '30:00', type: 'article', content: 'مشروع ختامي يجمع كل ما تعلّمته: من بيانات خام إلى تقرير مرئي.' }
            ] }
          ],
          addedAt: daysAgo(210)
        },
        {
          id: 'c5',
          title: 'أساسيات Git وإدارة المشاريع مفتوحة المصدر',
          issuer: 'مجتمع مطوّري الخليج',
          category: 'أدوات',
          price: '₪90',
          duration: '6 ساعات',
          period: '3 لقاءات',
          date: monthsAgo(1),
          image: grad('#334155', '#64748b', '🌱'),
          credentialId: 'GIT-OSS-1220',
          verifyUrl: 'https://example.com/verify/GIT-OSS-1220',
          description: 'ورشة عملية عن سير العمل مع Git، ومراجعة الكود Pull Requests، ودمج مشاريع مفتوحة المصدر لأول مرة.',
          skills: ['Git', 'GitHub', 'Open Source', 'Code Review'],
          syllabus: [
            { title: 'أساسيات Git', lessons: [
              { title: 'أوامر الإنشاء والالتزام', duration: '12:15', type: 'video', free: true, content: 'init وadd وcommit: البناء الأساسي لأي مستودع نظيف.' },
              { title: 'الفروع والدمج', duration: '18:35', type: 'video', content: 'إنشاء الفروع، الدمج، وحل التعارضيات الشائعة.' }
            ] },
            { title: 'المساهمة مفتوحة المصدر', lessons: [
              { title: 'فتح Pull Request', duration: '14:50', type: 'video', content: 'fork، الآلة الزمنية، وكتابة وصف واضح لطلب الدمج.' },
              { title: 'مراجعة الكود ودمجه', duration: '16:25', type: 'article', content: 'كيف تراجع طلبات الآخرين وتعامل مع الملاحظات باحترافية.' }
            ] }
          ],
          addedAt: daysAgo(25)
        }
      ],
      projects: [
        {
          id: 'p1',
          title: 'منصّة المشاريع الطلابية',
          slug: 'student-projects-platform',
          cover: grad('#1e3a8a', '#3b82f6', '🎓'),
          summary: 'منصة تربط الطلاب بالمشاريع الحقيقية وتساعدهم على بناء سير أعمالهم الدراسي.',
          content:
            '<h2>نظرة عامة</h2><p>فكرة المشروع وُلدت من حاجة واضحة: الطلاب ينجزون مشاريع ممتازة داخل الجامعة ثم تختفي. هذه المنصة تمنح كل طالب <strong>بورتفوليو حيّاً</strong> يعرض مشاريعه وشهاداته ومهاراته في رابط واحد.</p>' +
            '<h2>المشكلة</h2><ul><li>غياب مكان موحّد لإنجازات الطلاب</li><li>صعوبة الوصول للجهات التي تبحث عن مواهب</li><li>السيرة الذاتية الورقية لا تُظهر المشاريع التطبيقية</li></ul>' +
            '<h2>الحل</h2><p>تطبيق ويب متجاوب يتيح للطالب إضافة مشاريعه ورفع ملفاته، مع لوحة تحكم للجهات تتيح البحث حسب المهارة والتخصص.</p>' +
            '<h2>ما تعلّمته</h2><p>التعامل مع التصميم بالاتجاهين RTL/LTR، وبناء نظام مكوّنات قابل لإعادة الاستخدام، وأدّيت إلى تحسين زمن التحميل بنسبة 40% بعد تحسين الصور.</p>',
          tags: ['React', 'Node.js', 'MongoDB', 'RTL'],
          category: 'تطوير ويب',
          role: 'مطوّر الواجهة الأمامية',
          date: monthsAgo(4),
          links: { github: 'https://github.com/ahmadkhaled/student-platform', demo: 'https://example.com/demo' },
          files: [
            { id: 'f1', name: 'README.md', size: 2400, type: 'text/markdown', dataUrl: fileData('README.md', '# منصّة المشاريع الطلابية\n\nمشروع تخرّج — واجهة أمامية بـ React.\n\n## التشغيل\nnpm install\nnpm run dev\n') },
            { id: 'f2', name: 'presentation.pdf', size: 1843200, type: 'application/pdf', dataUrl: '' }
          ],
          gallery: [grad('#312e81', '#6366f1', '🧩'), grad('#1e40af', '#60a5fa', '🚀'), grad('#0f172a', '#334155', '📈')],
          views: 342, likes: 48, liked: false, saved: false,
          comments: [
            { id: 'cm1', author: 'سارة المطيري', handle: 'sara.m', avatar: '', text: 'فكرة رائعة! جرّبت المنصة وتصميمها سلس جداً، بالتوفيق 🚀', createdAt: daysAgo(9, 14), likes: 3, liked: false, replies: [] },
            { id: 'cm2', author: 'خالد العنزي', handle: 'khaled.a', avatar: '', text: 'هل فكّرت بإضافة نظام توصيات للمشاريع المميزة؟', createdAt: daysAgo(5, 19), likes: 1, liked: false, replies: [
              { id: 'cm2r1', author: 'أحمد خالد الحسن', handle: 'ahmadkhaled', avatar: '', text: 'ممتاز! هذه في الإصدار القادم إن شاء الله 😄', createdAt: daysAgo(5, 21), likes: 0, liked: false, replies: [] }
            ] }
          ],
          status: 'published',
          createdAt: daysAgo(120), updatedAt: daysAgo(9)
        },
        {
          id: 'p2',
          title: 'تطبيق متابعة الميزانية',
          slug: 'budget-tracker',
          cover: grad('#065f46', '#10b981', '💰'),
          summary: 'تطبيق خفيف لتتبع المصروفات اليومية مع رسوم بيانية ذكية وتذكيرات شهرية.',
          content:
            '<h2>الفكرة</h2><p>أردت أداة بسيطة لا تُشتّت المستخدم: تدخل مصروفك في ثوانٍ، وتشوف وين فلوسك تروح بنهاية الشهر.</p>' +
            '<h2>أبرز المزايا</h2><ol><li>إدخال سريع بثلاث نقرات</li><li>تصنيف تلقائي للمصروفات</li><li>تقرير شهري برسم بياني</li><li>وضع بلا إنترنت</li></ol>' +
            '<h2>التحديات</h2><p>أكبر تحدٍّ كان مزامنة البيانات بين الأجهزة دون فقدان أي معاملة، حللتها ببناء طبقة مزامنة تعمل بالمعاملات مع حل تعارض آخر-كتابة-يفوز.</p>',
          tags: ['JavaScript', 'IndexedDB', 'PWA', 'Chart.js'],
          category: 'تطبيق ويب',
          role: 'مطوّر مقدّم وتصميم',
          date: monthsAgo(2),
          links: { github: 'https://github.com/ahmadkhaled/budget-tracker', demo: '' },
          files: [
            { id: 'f3', name: 'budget-tracker.zip', size: 3250176, type: 'application/zip', dataUrl: '' }
          ],
          gallery: [grad('#064e3b', '#34d399', '📱'), grad('#115e59', '#2dd4bf', '📉')],
          views: 218, likes: 35, liked: true, saved: true,
          comments: [
            { id: 'cm3', author: 'ريم القحطاني', handle: 'reem.o', avatar: '', text: 'استخدمته شهر كامل ووفّر عليّ كثير، خصوصاً رسم المصروفات 🙌', createdAt: daysAgo(14, 11), likes: 5, liked: false, replies: [] }
          ],
          status: 'published',
          createdAt: daysAgo(70), updatedAt: daysAgo(14)
        },
        {
          id: 'p3',
          title: 'هوية بصرية لمبادرة بيئية',
          slug: 'green-initiative-brand',
          cover: grad('#14532d', '#4ade80', '🌍'),
          summary: 'تصميم هوية متكاملة: شعار، ألوان، مواد مطبوعة ورقمية لمبادرة تشجير في الأحياء.',
          content:
            '<h2>التحدي</h2><p>مبادرة مجتمعية صغيرة بميزانية محدودة تحتاج هوية تُقنع الشركات بالرعاية وتجذب المتطوعين.</p>' +
            '<h2>العمل</h2><p>صمّمت شعاراً يدمج شجرة ودائرة (رمز الاستمرارية)، مع نظام ألوان مستوحى من الطبيعة، ودليل استخدام كامل بـ16 صفحة، وقوالب منشورات جاهزة للسوشال ميديا.</p>' +
            '<h2>النتيجة</h2><p>ارتفع عدد المتطوعين 3 مرات خلال شهرين من إطلاق الهوية الجديدة.</p>',
          tags: ['Figma', 'Branding', 'Illustrator'],
          category: 'تصميم',
          role: 'مصمّم جرافيك',
          date: monthsAgo(7),
          links: { github: '', demo: 'https://behance.net/example' },
          files: [],
          gallery: [grad('#166534', '#86efac', '🍃'), grad('#15803d', '#bbf7d0', '🏷️'), grad('#052e16', '#22c55e', '📦')],
          views: 489, likes: 76, liked: false, saved: false,
          comments: [
            { id: 'cm4', author: 'نورة الشمري', handle: 'noura.s', avatar: '', text: 'الشعار ذكي جداً، أحببت فكرة دائرة الاستمرارية 💚', createdAt: daysAgo(30, 16), likes: 8, liked: false, replies: [] },
            { id: 'cm5', author: 'عبدالله باوزير', handle: 'abdullah.b', avatar: '', text: 'هل عندك قوالب السوشال ميديا متاحة للتحميل؟', createdAt: daysAgo(22, 13), likes: 2, liked: false, replies: [] }
          ],
          status: 'published',
          createdAt: daysAgo(200), updatedAt: daysAgo(30)
        },
        {
          id: 'p4',
          title: 'أتمتة نشر المحتوى',
          slug: 'content-autopost',
          cover: grad('#4c1d95', '#8b5cf6', '⚙️'),
          summary: 'سكربت Python ينشر المقالات تلقائياً على منصات متعددة مع جدولة ذكية.',
          content:
            '<h2>لماذا؟</h2><p>كنت أنسخ المقال يدوياً لكل منصة، والعملية تأخذ 20 دقيقة لكل قطعة محتوى.</p>' +
            '<h2>كيف يعمل</h2><p>سكربت يقرأ المقال من ملف Markdown، يحوّله لكل صيغة منصة (نص + وسوم + صور مصغّرة)، ثم ينشرها عبر الـ API ويسجّل النتائج في تقرير.</p>',
          tags: ['Python', 'API', 'Automation'],
          category: 'أدوات',
          role: 'مطوّر',
          date: monthsAgo(1),
          links: { github: 'https://github.com/ahmadkhaled/autopost', demo: '' },
          files: [{ id: 'f4', name: 'autopost.py', size: 9216, type: 'text/x-python', dataUrl: fileData('autopost.py', '"""أتمتة نشر المحتوى"""\nimport json\nfrom datetime import datetime\n\ndef publish(article):\n    # ينشر المقال على المنصات المتصلة\n    report = {"article": article["title"], "time": str(datetime.now())}\n    return report\n') }],
          gallery: [],
          views: 96, likes: 19, liked: false, saved: false,
          comments: [],
          status: 'published',
          createdAt: daysAgo(35), updatedAt: daysAgo(20)
        }
      ],
      posts: [
        {
          id: 'd1',
          content: '<p>أنهيت اليوم آخر وحدة في مسار <strong>React</strong> 🎉 — صراحة أصعب جزء كان فهم إعادة الاستخدام بين المكوّنات، لكن بعد ما بنيت مشروعي الصغير صار كل شي واضح.</p><p>نصيحة للي يبدأ: لا تكمل الدورة كاملة بدون مشروع عملي، التطبيق أهم من الشهادة 💪</p>',
          images: [grad('#1e40af', '#60a5fa', '⚛️')],
          tags: ['React', 'تعلّم', 'برمجة'],
          createdAt: daysAgo(1, 21),
          likes: 34, liked: false, saved: false,
          comments: [
            { id: 'dc1', author: 'سارة المطيري', handle: 'sara.m', avatar: '', text: 'كلامك 100% صح، التطبيق بيعلّمك أسرع من أي دورة 😄', createdAt: daysAgo(1, 22), likes: 2, liked: false, replies: [] },
            { id: 'dc2', author: 'ماجد الدوسري', handle: 'majed.d', avatar: '', text: 'أي مشروع صغير بنيت؟ ودي أشوفه!', createdAt: daysAgo(1, 23), likes: 0, liked: false, replies: [
              { id: 'dc2r1', author: 'أحمد خالد الحسن', handle: 'ahmadkhaled', avatar: '', text: 'تطبيق قائمة مهام بالسحب والإفلات، بنشره كمشروع قريب إن شاء الله 🚀', createdAt: daysAgo(0, 8), likes: 1, liked: false, replies: [] }
            ] }
          ],
          status: 'published'
        },
        {
          id: 'd2',
          content: '<p>اليوم كان أول يوم تدريبي في شركة <strong>نُور للتقنية</strong> 🏢<br>الإحساس إنك تشتغل مع فريق حقيقي على منتج يستخدمه ناس فعلية — شي ثاني تماماً عن المشاريع الدراسية.</p><p>أهم ملاحظة: طريقة مراجعة الكود Code Review عندهم ممتازة، كل Pull Request يراجعه شخصان مع اختبارات آلية. رح أطبّقها في مشروعي.</p>',
          images: [grad('#0f766e', '#2dd4bf', '🏢'), grad('#115e59', '#5eead4', '🤝')],
          ratio: '4:5',
          tags: ['تدريب', 'مهنة', 'CodeReview'],
          createdAt: daysAgo(6, 18),
          likes: 87, liked: true, saved: true,
          comments: [
            { id: 'dc3', author: 'ريم القحطاني', handle: 'reem.o', avatar: '', text: 'مبروك! أول يوم تدريبي دايماً أجمل يوم 😍', createdAt: daysAgo(6, 20), likes: 4, liked: false, replies: [] },
            { id: 'dc4', author: 'خالد العنزي', handle: 'khaled.a', avatar: '', text: 'كم ساعة التدريب يومياً؟', createdAt: daysAgo(5, 9), likes: 0, liked: false, replies: [
              { id: 'dc4r1', author: 'أحمد خالد الحسن', handle: 'ahmadkhaled', avatar: '', text: 'من 9 لـ 4، وفيه يوم مرن للجامعة 👌', createdAt: daysAgo(5, 10), likes: 1, liked: false, replies: [] }
            ] }
          ],
          status: 'published'
        },
        {
          id: 'd3',
          content: '<p>شاركنا في <strong>هاكاثون الجامعة</strong> 24 ساعة ⏱️ فريق من 4، وبنينا نموذج أولي لمنصة تواصل بين الطلاب والأساتذة.</p><p>ما وصلنا لنهائيات لكن خرجنا بأهم شي: تعلّمتش كيفية التقسيم السريع للعمل واعتماد على الأدوات الجاهزة بدل إعادة البناء من الصفر.</p>',
          images: [grad('#7c2d12', '#fb923c', '🏆'), grad('#9a3412', '#fdba74', '💻'), grad('#431407', '#f97316', '🌙')],
          tags: ['هاكاثون', 'فريق', 'innovation'],
          createdAt: daysAgo(12, 23),
          likes: 129, liked: false, saved: false,
          comments: [
            { id: 'dc5', author: 'نورة الشمري', handle: 'noura.s', avatar: '', text: 'المشاركة أهم من الجائزة، تجربة تُحسب 💯', createdAt: daysAgo(11, 10), likes: 6, liked: false, replies: [] }
          ],
          status: 'published'
        },
        {
          id: 'd4',
          content: '<p>أنهيت اليوم شهادة <strong>تصميم تجربة المستخدم</strong> 🎨 أول وحدة كانت عن أبحاث المستخدم، وغيّرت نظرتي للتصميم كلياً.</p><p>الدرس الأهم: لا تصمّم لحد ما تسأل المستخدم عن مشكلته. أنا صمّمت زرّين اكتشفت بعدها إن المستخدمين ما يحتاجونهما أصلاً 😅</p>',
          images: [grad('#5b21b6', '#a78bfa', '🎨')],
          ratio: '4:5',
          tags: ['UIUX', 'Figma', 'شهادة'],
          createdAt: daysAgo(20, 16),
          likes: 56, liked: false, saved: false,
          comments: [],
          status: 'published'
        }
      ].map(function (p) {
        if (!p.media) p.media = (p.images || []).map(function (src) { return { type: 'image', src: src }; });
        if (!p.ratio) p.ratio = '1:1';
        if (p.shares == null) p.shares = 0;
        if (p.saves == null) p.saves = 0;
        return p;
      }),
      ui: { theme: 'light', lang: 'ar' },
      i18nOverrides: { ar: {}, en: {} }
    };
  }

  var state = null;
  var listeners = [];

  /* المشاريع القادمة من السيرفر (Django) تحل مكان بيانات العرض التوضيحي */
  var SERVER_PROJECTS = (function () {
    var el = document.getElementById('projects-data');
    if (!el) return null;
    try {
      var data = JSON.parse(el.textContent);
      return Array.isArray(data) ? data : null;
    } catch (err) { return null; }
  })();

  /* Projects saved by the current profile owner. */
  var SERVER_SAVED_PROJECTS = (function () {
    var el = document.getElementById('saved-projects-data');
    if (!el) return null;
    try {
      var data = JSON.parse(el.textContent);
      return Array.isArray(data) ? data : null;
    } catch (err) { return null; }
  })();

  /* المنشورات (اليوميات) القادمة من السيرفر (Django) */
  var SERVER_POSTS = (function () {
    var el = document.getElementById('posts-data');
    if (!el) return null;
    try {
      var data = JSON.parse(el.textContent);
      return Array.isArray(data) ? data : null;
    } catch (err) { return null; }
  })();

  /* الدورات القادمة من السيرفر (Django) تحل مكان بيانات العرض التوضيحي */
  var SERVER_COURSES = (function () {
    var el = document.getElementById('courses-data');
    if (!el) return null;
    try {
      var data = JSON.parse(el.textContent);
      return Array.isArray(data) ? data : null;
    } catch (err) { return null; }
  })();

  /* الشهادات التي اكتسبها المستخدم الحالي بعد إتمام دوراته */
  var SERVER_MY_CERTS = (function () {
    var el = document.getElementById('my-certs-data');
    if (!el) return null;
    try {
      var data = JSON.parse(el.textContent);
      return Array.isArray(data) ? data : null;
    } catch (err) { return null; }
  })();

  /* الشهادات التي اكتسبها صاحب البروفايل المفتوح */
  var SERVER_PROFILE_CERTS = (function () {
    var el = document.getElementById('profile-certs-data');
    if (!el) return null;
    try {
      var data = JSON.parse(el.textContent);
      return Array.isArray(data) ? data : null;
    } catch (err) { return null; }
  })();

  /* دورات المدرب صاحب الحساب (منشورة + مسودّات) لقسم «الدورات التدريبية» */
  var SERVER_MY_COURSES = (function () {
    var el = document.getElementById('my-courses-data');
    if (!el) return null;
    try {
      var data = JSON.parse(el.textContent);
      return Array.isArray(data) ? data : null;
    } catch (err) { return null; }
  })();

  function backfillCerts(st) {
    if (!st || !st.certificates) return;
    var defs = {};
    try { seed().certificates.forEach(function (c) { defs[c.id] = c; }); } catch (e) { return; }
    st.certificates.forEach(function (c) {
      var d = defs[c.id];
      if (!d) return;
      if (c.price == null) c.price = d.price;
      if (c.duration == null) c.duration = d.duration;
      if (c.period == null) c.period = d.period;
      if (c.image == null) c.image = d.image;
      if (c.syllabus == null) c.syllabus = d.syllabus || [];
    });
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        state = JSON.parse(raw);
        if (!state || state.version !== 2) state = seed();
      } else {
        state = seed();
      }
    } catch (e) {
      state = seed();
    }
    backfillCerts(state);
    return state;
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
      return true;
    } catch (e) {
      if (window.UI && UI.toast) UI.toast(I18n.t('storageFull'), 'error');
      return false;
    }
  }

  function emit() {
    listeners.forEach(function (fn) { try { fn(state); } catch (e) { console.error(e); } });
  }

  var Store = {
    uid: uid,
    get state() { return state || load(); },
    init: function () { if (!state) load(); return state; },
    save: function (silent) {
      var ok = save();
      if (!silent) emit();
      return ok;
    },
    commit: function () { save(); emit(); },
    subscribe: function (fn) { listeners.push(fn); return function () { listeners = listeners.filter(function (f) { return f !== fn; }); }; },
    reset: function () { state = seed(); save(); emit(); },
    usingServerProjects: !!SERVER_PROJECTS,
    usingServerPosts: !!SERVER_POSTS,
    usingServerCourses: !!SERVER_COURSES,
    /* شهاداتي المكتسبة (null عندما لا تكون الصفحة مخصّصة لمستخدم مسجّل) */
    myCerts: function () { return SERVER_MY_CERTS; },
    addManualCertificate: function (certificate) {
      if (!Array.isArray(SERVER_MY_CERTS)) return false;
      SERVER_MY_CERTS.push(certificate);
      return true;
    },
    profileCerts: function () { return SERVER_PROFILE_CERTS; },
    /* دورات المدرب صاحب الحساب (منشورة + مسودّات) — null لغير المدرب */
    myCourses: function () { return SERVER_MY_COURSES; },
    /* قائمة الدورات مع استبدال الدورات المكتملة بشهاداتها المكتسبة (نفس الاسم والتفاصيل) */
    certificatesWithEarned: function () {
      var all = this.collection('certificates');
      var mine = SERVER_MY_CERTS;
      if (!mine || !mine.length) return all;
      var byId = {};
      mine.forEach(function (c) { byId[c.id] = c; });
      var out = all.map(function (c) { return byId[c.id] || c; });
      mine.forEach(function (c) {
        var exists = all.some(function (x) { return x.id === c.id; });
        if (!exists) out.push(c);
      });
      return out;
    },
    collection: function (name) {
      if (name === 'projects' && SERVER_PROJECTS) return SERVER_PROJECTS;
      if (name === 'savedProjects') return SERVER_SAVED_PROJECTS || [];
      if (name === 'posts' && SERVER_POSTS) return SERVER_POSTS;
      if (name === 'certificates' && SERVER_COURSES) return SERVER_COURSES;
      return this.state[name] || [];
    },
    find: function (name, id) {
      var list = this.collection(name);
      var hit = list.filter(function (x) { return x.id === id; })[0];
      /* الدورات: السيرفر يقبل الـ slug أو الـ pk — نطابقهما معاً */
      if (!hit && name === 'certificates' && id !== '' && id != null) {
        hit = list.filter(function (x) { return x.pk != null && String(x.pk) === String(id); })[0];
      }
      return hit || null;
    },
    upsert: function (name, obj) {
      var list = this.state[name];
      if (!list) list = this.state[name] = [];
      var i = list.findIndex(function (x) { return x.id === obj.id; });
      if (i >= 0) list[i] = obj; else list.unshift(obj);
      save(); emit();
      return obj;
    },
    remove: function (name, id) {
      this.state[name] = this.collection(name).filter(function (x) { return x.id !== id; });
      save(); emit();
    },
    updateProfile: function (patch) {
      Object.assign(this.state.profile, patch);
      save(); emit();
    },
    totals: function () {
      var projects = this.collection('projects');
      var posts = this.collection('posts');
      var certs = this.certificatesWithEarned();
      var likes = 0;
      posts.concat(projects).forEach(function (p) { likes += (p.likes || 0); });
      return {
        certificates: certs.length,
        projects: projects.length,
        posts: posts.filter(function (p) { return p.status !== 'draft'; }).length,
        likes: likes
      };
    },
    slugify: function (text, fallback) {
      var s = String(text || '').trim().toLowerCase();
      s = s.replace(/[\u0600-\u06FF\s]+/g, '-').replace(/[^a-z0-9\u0600-\u06FF-]/g, '');
      s = s.replace(/-+/g, '-').replace(/^-|-$/g, '');
      return s || (fallback || 'item-' + Date.now().toString(36));
    },
    allTags: function () {
      var set = {};
      this.collection('projects').forEach(function (p) { (p.tags || []).forEach(function (t) { set[t] = 1; }); });
      this.collection('posts').forEach(function (p) { (p.tags || []).forEach(function (t) { set[t] = 1; }); });
      return Object.keys(set);
    }
  };

  window.Store = Store;
  window.StoreHelpers = { grad: grad, svgURI: svgURI, fileData: fileData };
})();
