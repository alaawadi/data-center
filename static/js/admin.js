(function () {
  'use strict';

  var TEXT = {
    ar: {
      brandTitle: 'لوحة التحكم',
      brandSub: 'مركز داتا للتدريب',
      adminRole: 'مشرف النظام',
      viewSite: 'عرض الموقع',
      menu: 'القائمة',
      logout: 'تسجيل الخروج',
      secOverview: 'نظرة عامة',
      secUsers: 'الطلاب',
      secReferralPoints: 'نقاط الإحالة',
      secTrainers: 'المدربون',
      secTrainingCategories: 'المجالات التدريبية',
      secFreelancerCategories: 'فئات المستقلين',
      trainingCategoryDrag: 'اسحب لترتيب المجال',
      secCourses: 'الدورات الأونلاين',
      secInPersonCourses: 'الدورات الوجاهية',
      secInPersonWorkshopCourses: 'الورشات',
      secInPersonStudents: 'الطلاب وجاهي',
      secLessons: 'الدروس',
      secProjects: 'المشاريع',
      secWorkshops: 'الورشات',
      secCourseRegistrationRequests: 'طلبات التسجيل',
      secSubscriptions: 'الاشتراكات',
      secStudentCertificates: 'مراجعة الشهادات',
      secInPersonPaymentInvoices: 'إدارة اشتراكات الوجاهي',
      secOnlineCourseInvoices: 'إدارة اشتراكات الأونلاين',
      secDailies: 'اليوميات',
      secSettings: 'الإعدادات',
      subOverview: 'ملخص أداء المنصة ومحتواها في مكان واحد',
      subUsers: 'إدارة حسابات الطلاب وحالاتهم',
      subReferralPoints: 'عرض أرصدة نقاط الإحالة وتصفيرها',
      referralPointsEmpty: 'لا يوجد طلاب لديهم رصيد نقاط إحالة حالياً.',
      referralPointsBalance: 'رصيد النقاط',
      referralPointsReset: 'تصفير النقاط',
      referralPointsResetConfirm: 'هل تريد تصفير كامل رصيد نقاط الإحالة لهذا الطالب؟',
      referralPointsResetSuccess: 'تم تصفير نقاط الإحالة بنجاح.',
      referralPointsResetFailed: 'تعذر تصفير نقاط الإحالة.',
      subTrainers: 'إدارة فريق التدريب وتخصصاتهم ودوراتهم',
      subTrainingCategories: 'إدارة الفئات المستخدمة في الدورات والمشاريع والمستقلين',
      subFreelancerCategories: 'إدارة الفئات المستخدمة لتصنيف المستقلين في صفحة كل المستقلين',
      freelancerCategoryDeleteConfirm: 'سيؤدي حذف الفئة إلى إزالة التخصص المرتبط بها من ملفات المستقلين. هل تريد المتابعة؟',
      subCourses: 'إدارة الدورات الأونلاين والمدربين المرتبطين بها',
      subInPersonCourses: 'عرض وإدارة الدورات الحضورية المنشورة والمسودات',
      subInPersonStudents: 'قائمة الطلاب المقبولين في الدورات الوجاهية',
      inPersonStudentsEmpty: 'لا يوجد طلاب مسجلون في الدورات الوجاهية حالياً.',
      emptyInPersonCourses: 'لا توجد دورات وجاهية حتى الآن.',
      emptyInPersonCoursesSub: 'يمكنك إضافة دورة جديدة من محرر الدورات.',
      emptyWorkshops: 'لا توجد ورشات حتى الآن.',
      emptyWorkshopsSub: 'أضف ورشة وجاهية أو أونلاين من محرر الورشات.',
      subLessons: 'إدارة دروس كل دورة ووحداتها التعليمية',
      subProjects: 'إدارة مشاريع الطلاب وحالة نشرها',
      subWorkshops: 'إدارة الورشات الوجاهية والأونلاين',
      subCourseRegistrationRequests: 'مراجعة بيانات المتقدمين للدورات الوجاهية وطرق التواصل معهم',
      subSubscriptions: 'إنشاء ومتابعة اشتراكات الطلاب في الدورات الوجاهية والأونلاين',
      subscriptionAdd: 'اشتراك جديد',
      subscriptionAddTitle: 'تسجيل اشتراك طالب',
      subscriptionType: 'نوع الدورة',
      subscriptionTypeOnline: 'أونلاين',
      subscriptionTypeInPerson: 'وجاهي',
      subscriptionCourse: 'الدورة',
      subscriptionCourseSearch: 'ابحث عن اسم الدورة',
      subscriptionCourseNoMatches: 'لا توجد دورات منشورة مطابقة.',
      subscriptionStudentNoMatches: 'لا يوجد طلاب مطابقون.',
      subscriptionCohort: 'الشعبة',
      subscriptionCohortChoose: 'اختر الشعبة',
      subscriptionCohortUnavailable: 'لا توجد شعبة نشطة لهذه الدورة.',
      subscriptionPrice: 'قيمة الاشتراك',
      subscriptionPriceHint: 'يُعبأ تلقائياً من سعر الدورة وبعملتها.',
      subscriptionDiscount: 'قيمة الخصم (اختياري)',
      subscriptionDiscountHint: 'اتركه فارغاً إذا لم يوجد خصم.',
      subscriptionDiscountInvalid: 'يجب ألا يتجاوز الخصم قيمة الاشتراك.',
      subscriptionInitialPayment: 'دفعة عند الاشتراك',
      subscriptionCreateButton: 'تأكيد الاشتراك',
      subscriptionCreateSuccess: 'تم تسجيل الاشتراك وإضافة الطالب إلى الدورة.',
      subscriptionCreateFailed: 'تعذر تسجيل الاشتراك.',
      subscriptionEmpty: 'لا توجد اشتراكات مسجلة حالياً.',
      subscriptionFilterType: 'كل أنواع الدورات',
      subscriptionFilterBalance: 'حالة المبلغ المتبقي',
      subscriptionHasBalance: 'عليهم مبلغ متبقٍ',
      subscriptionHistory: 'سجل اشتراكات الطالب',
      subscriptionHistoryEmpty: 'لا توجد اشتراكات سابقة لهذا الطالب.',
      subscriptionHistoryOpen: 'عرض سجل اشتراكات الطالب',
      subscriptionHistoryAddPayment: 'دفعة جديدة',
      subscriptionHistoryPaymentSaved: 'تم تسجيل الدفعة بنجاح.',
      subscriptionHistoryPaymentFailed: 'تعذر تسجيل الدفعة.',
      subInPersonPaymentInvoices: 'متابعة قيمة الاشتراك والدفعات والمبالغ المتبقية لطلاب الوجاهي',
      inPersonPaymentInvoicesEmpty: 'لا يوجد طلاب مقبولون في الدورات الوجاهية حالياً.',
      inPersonPaymentAmount: 'قيمة الاشتراك',
      subOnlineCourseInvoices: 'إصدار فواتير اشتراكات الدورات الأونلاين ومتابعة الدفعات',
      onlineCourseInvoiceEmpty: 'لا توجد فواتير اشتراكات أونلاين حالياً.',
      onlineCourseInvoiceAdd: 'إنشاء فاتورة جديدة',
      onlineCourseInvoiceAddTitle: 'إنشاء فاتورة اشتراك أونلاين',
      onlineCourseInvoiceStudent: 'الطالب',
      onlineCourseInvoiceStudentSearch: 'ابحث باسم الطالب أو رقم الهاتف أو البريد الإلكتروني',
      onlineCourseInvoiceStudentNoMatches: 'لا توجد نتائج مطابقة.',
      onlineCourseInvoiceCourseSearch: 'ابحث عن دورة أونلاين',
      onlineCourseInvoiceCourseNoMatches: 'لا توجد دورات مطابقة.',
      onlineCourseInvoiceCourse: 'الدورة الأونلاين',
      onlineCourseInvoiceChooseCourse: 'اختر الدورة',
      onlineCourseInvoiceDiscountType: 'نوع الخصم',
      onlineCourseInvoiceDiscountFixed: 'مبلغ ثابت',
      onlineCourseInvoiceDiscountPercentage: 'نسبة مئوية',
      onlineCourseInvoiceDiscountValue: 'قيمة الخصم',
      onlineCourseInvoiceDiscountHint: 'سعر الاشتراك يُحسب من سعر الدورة ويمكن تطبيق خصم ثابت أو نسبة مئوية.',
      onlineCourseInvoiceNoStudents: 'لا يوجد طلاب لاختيارهم.',
      onlineCourseInvoiceNoCourses: 'لا توجد دورات أونلاين منشورة.',
      onlineCourseInvoiceCreateSuccess: 'تم إنشاء فاتورة الاشتراك وتسجيل الطالب في الدورة.',
      onlineCourseInvoiceCreateFailed: 'تعذر إنشاء فاتورة الاشتراك.',
      onlineCourseInvoicePaymentSaved: 'تمت إضافة دفعة الفاتورة.',
      onlineCourseInvoicePaymentFailed: 'تعذرت إضافة دفعة الفاتورة.',
      onlineCourseInvoiceDuplicate: 'توجد فاتورة بالفعل لهذا الطالب في هذه الدورة.',
      onlineCourseInvoiceDiscountInvalid: 'أدخل قيمة خصم صحيحة.',
      onlineCourseInvoiceCreateButton: 'إنشاء الفاتورة',
      onlineCourseInvoiceDiscount: 'الخصم',
      registrationRequestName: 'اسم المتقدم',
      registrationRequestPhone: 'رقم الهاتف / واتساب',
      registrationRequestAddress: 'العنوان',
      registrationRequestSpecialty: 'التخصص',
      registrationRequestGovernorate: 'المحافظة',
      registrationRequestGovernorateGaza: 'غزة',
      registrationRequestGovernorateCentral: 'الوسطى',
      registrationRequestGovernorateOnline: 'أونلاين',
      registrationRequestGovernorateInvalid: 'اختر المحافظة.',
      registrationRequestStudyYear: 'السنة الدراسية',
      registrationRequestStudyYearInvalid: 'أدخل السنة الدراسية كرقم صحيح موجب.',
      registrationRequestStudent: 'طالب',
      registrationRequestGraduate: 'خريج',
      registrationRequestStudentStatus: 'الحالة الدراسية',
      registrationRequestStatus: 'حالة الطلب',
      registrationRequestNew: 'جديد',
      registrationRequestContacted: 'تم التواصل',
      registrationRequestAccepted: 'مقبول',
      registrationRequestRejected: 'مرفوض',
      registrationRequestDate: 'تاريخ الطلب',
      registrationRequestCourse: 'الدورة',
      registrationRequestCourseFilter: 'تصفية حسب الدورة',
      registrationRequestAllCourses: 'كل الدورات',
      registrationRequestCohortFilter: 'تصفية حسب شعبة الدورة',
      registrationRequestAllCohorts: 'كل الشُعب',
      registrationRequestSource: 'مصدر الطلب',
      registrationRequestDirect: 'مباشر',
      registrationRequestEmpty: 'لا توجد طلبات تسجيل حتى الآن.',
      registrationRequestAdd: 'إضافة طلب جديد',
      registrationRequestAddTitle: 'إضافة طلب تسجيل',
      registrationRequestChooseCourse: 'اختر الدورة',
      registrationRequestNoCourses: 'لا توجد دورات وجاهية منشورة لإضافة طلب عليها.',
      registrationRequestNameInvalid: 'أدخل اسم المتقدم بشكل صحيح.',
      registrationRequestPhoneInvalid: 'أدخل رقم هاتف صحيحاً يبدأ بـ +.',
      registrationRequestInvalid: 'أكمل العنوان والتخصص والحالة الدراسية بشكل صحيح.',
      registrationRequestCreated: 'تمت إضافة طلب التسجيل بنجاح.',
      workshopAdd: 'إضافة ورشة',
      workshopNew: 'ورشة جديدة',
      workshopInPerson: 'ورشة وجاهية',
      workshopOnline: 'ورشة أونلاين',
      workshopChooseType: 'اختر نوع الورشة',
      workshopEdit: 'تعديل الورشة',
      workshopTitle: 'اسم الورشة',
      workshopTrainer: 'اسم المدرب',
      workshopDescription: 'وصف الورشة',
      workshopStartsAt: 'موعد الورشة',
      workshopDuration: 'المدة بالدقائق',
      workshopMinutes: 'دقيقة',
      workshopLocation: 'الموقع',
      workshopAttendees: 'الحضور',
      workshopAttendeesTitle: 'طلاب الورشة',
      workshopNoAttendees: 'لم يسجل أي طالب حضوره في هذه الورشة بعد.',
      workshopAttendeesLoading: 'جارٍ تحميل قائمة الحضور...',
      workshopAttendeesError: 'تعذر تحميل قائمة الحضور.',
      workshopAttendedAt: 'وقت الحضور',
      workshopAttendanceIsOpen: 'مفتوح',
      workshopAttendanceIsClosed: 'مغلق',
      workshopOpenAttendance: 'فتح الحضور',
      workshopCloseAttendance: 'إغلاق الحضور',
      workshopRegenerateQr: 'تجديد رمز QR',
      workshopShowQr: 'عرض رمز QR',
      workshopDownloadQr: 'تنزيل رمز QR',
      inPersonStudentAccount: 'حساب الطالب',
      studentEdit: 'تعديل بيانات الطالب',
      studentUpdated: 'تم تحديث بيانات الطالب.',
      studentAccountReady: 'الحساب جاهز',
      studentHasOnlineAccount: 'لديه حساب بالفعل',
      studentAccountCreatedLabel: 'تم إنشاء حساب',
      studentSetupLinkCreate: 'إنشاء رابط إعداد كلمة المرور',
      studentSetupLinkCopy: 'نسخ رابط إعداد كلمة المرور',
      studentSetupLinkShowQr: 'عرض رمز QR لرابط الإعداد',
      studentSetupLinkCreated: 'تم إنشاء رابط إعداد كلمة المرور.',
      studentAccountCreated: 'تم إنشاء حساب جديد للطالب بنجاح',
      studentAccountAlreadyReady: 'لديه حساب بالفعل',
      studentSetupLinkCopied: 'تم نسخ رابط إعداد كلمة المرور.',
      studentSetupLinkCopyFailed: 'تعذر نسخ الرابط من هذا المتصفح.',
      studentSetupLinkQrTitle: 'رابط إعداد حساب الطالب',
      studentSetupLinkExpires: 'ينتهي الرابط في',
      studentSetupLinkExpired: 'انتهت صلاحية الرابط. أنشئ رابطاً جديداً.',
      studentSetupLinkOpen: 'فتح الرابط',
      courseRegistrationStatusClick: 'انقر للتغيير إلى',
      courseRegistrationStatusUpdated: 'تم تحديث حالة الطلب.',
      workshopDelete: 'حذف الورشة',
      workshopDeleteConfirm: 'سيؤدي حذف الورشة إلى حذف سجلات الحضور وشهاداتها نهائياً. هل تريد المتابعة؟',
      workshopQrRotated: 'تم تجديد الرمز وإغلاق الحضور. افتح الحضور يدوياً عند الجاهزية.',
      workshopQrConfirm: 'سيتم إبطال رمز QR الحالي وإغلاق الحضور حتى تفتحه مجدداً. متابعة؟',
      subStudentCertificates: 'مراجعة الشهادات اليدوية التي يضيفها الطلاب والمدربون',
      subDailies: 'إدارة يوميات الطلاب وحالة نشرها',
      subSettings: 'بيانات المنصة وخيارات التشغيل والنسخ الاحتياطي',
      groupManage: 'الإدارة',
      groupContent: 'المحتوى',
      groupOperations: 'العمليات',
      groupSystem: 'النظام',
      searchPh: 'بحث…',
      all: 'الكل',
      allStatus: 'كل الحالات',
      workshopCourseTypeFilter: 'نوع الورشة',
      export: 'تصدير CSV',
      exported: 'تم تجهيز ملف التصدير',
      clearSel: 'إلغاء التحديد',
      bulkDelete: 'حذف المحدد',
      noResults: 'لا توجد نتائج مطابقة',
      showing: 'عرض',
      of: 'من',
      prev: 'السابق',
      next: 'التالي',
      selected: 'عنصر محدد',
      cancel: 'إلغاء',
      save: 'حفظ',
      saveChanges: 'حفظ التغييرات',
      delete: 'حذف',
      edit: 'تعديل',
      confirmDelete: 'هل أنت متأكد من الحذف؟ لن تتمكن من التراجع عن هذه العملية.',
      confirmRemoveStudent: 'هل تريد إزالة هذا الطالب من الدورة؟ سيتم حذف تقدمه وشهادة الدورة إن وُجدت.',
      redeemReferralPoints: 'استبدال 100 نقطة باشتراك مجاني في دورة',
      redeemPointsTitle: 'استبدال نقاط الإحالة',
      redeemPointsCourse: 'الدورة المدفوعة',
      redeemPointsBalance: 'رصيد الطالب الحالي',
      redeemPointsHint: 'سيتم خصم 100 نقطة وتسجيل الطالب مجاناً في الدورة المختارة.',
      redeemPointsSubmit: 'تأكيد الاستبدال',
      redeemPointsSuccess: 'تم استبدال 100 نقطة وتسجيل الطالب في الدورة.',
      redeemPointsNoCourses: 'لا توجد دورات مدفوعة منشورة للاستبدال.',
      selectCourse: 'اختر الدورة',
      fieldRequired: 'حقل مطلوب',
      userEmailInvalid: 'أدخل بريداً إلكترونياً صحيحاً.',
      userPhoneInvalid: 'رقم الجوال يجب أن يحتوي على أرقام فقط، ويمكن أن يبدأ بـ +.',
      userPhoneTaken: 'رقم الجوال مستخدم بالفعل.',
      trainerWhatsapp: 'رقم واتساب',
      trainerWhatsappHint: 'اختياري: + ثم حتى 12 رقماً.',
      trainerWhatsappInvalid: 'أدخل + اختيارياً ثم من 1 إلى 12 رقماً.',
      trainerPassword: 'كلمة المرور الأولية',
      accountPassword: 'كلمة المرور',
      passwordKeepHint: 'اتركه فارغاً للإبقاء على كلمة المرور الحالية.',
      saveError: 'تعذر حفظ البيانات. حاول مرة أخرى.',
      userHandleTaken: 'المعرّف مستخدم بالفعل.',
      created: 'تمت الإضافة بنجاح',
      updated: 'تم التحديث بنجاح',
      deleted: 'تم الحذف بنجاح',
      trainingCategoryAdd: 'إضافة مجال',
      trainingCategoryEdit: 'تعديل المجال',
      trainingCategoryName: 'اسم المجال التدريبي',
      trainingCategoryProjectsFilter: 'في فلاتر صفحة كل المشاريع',
      trainingCategoryDeleteConfirm: 'سيؤدي حذف المجال إلى إزالته من الدورات والمشاريع وتخصصات المستقلين المرتبطة به. هل تريد المتابعة؟',
      trainingCategoryTrainers: 'المدربون',
      trainingCategoryStudents: 'الطلاب',
      trainerActivate: 'إعادة تفعيل المدرب',
      trainerDeactivate: 'إيقاف المدرب مؤقتاً',
      trainerContentAllowed: 'النشر مسموح',
      trainerContentDenied: 'النشر متوقف',
      trainerAllowContent: 'السماح للمدرب بالنشر العلني للدورات والمشاريع',
      trainerDenyContent: 'إيقاف النشر العلني للدورات والمشاريع',
      courseVisibility: 'ظهور الدورة',
      courseVisibilityPlatform: 'تظهر في المنصة',
      courseVisibilityProfile: 'في البروفايل فقط',
      courseVisibilityShow: 'إظهار الدورة في المنصة',
      courseVisibilityHide: 'إظهار الدورة في البروفايل فقط',
      courseVisibilityConfirmShow: 'هل تريد إظهار هذه الدورة في المنصة؟',
      courseVisibilityConfirmHide: 'هل تريد إخفاء هذه الدورة من المنصة وإظهارها في البروفايل فقط؟',
      courseVisibilityTrainerDisabled: 'يجب السماح للمدرب بالنشر أولاً قبل إظهار الدورة في المنصة.',
      courseHomepageVisibility: 'ظهورها في الرئيسية',
      courseHomepageVisible: 'تظهر في الرئيسية',
      courseHomepageHidden: 'في بروفايل المدرب فقط',
      courseHomepageConfirmShow: 'هل تريد عرض هذه الدورة الوجاهية في الرئيسية؟',
      courseHomepageConfirmHide: 'هل تريد قصر ظهور هذه الدورة الوجاهية على بروفايل المدرب؟',
      studentActivate: 'إعادة تفعيل الطالب',
      studentSuspend: 'إيقاف الطالب',
      statusUpd: 'تم تغيير الحالة',
      emptyTitle: 'لا توجد عناصر بعد',
      emptySub: 'ابدأ بإضافة عناصر جديدة لتظهر هنا.',
      stActive: 'نشط',
      stSuspended: 'موقوف',
      stPublished: 'منشور',
      stDraft: 'مسودة',
      stInactive: 'غير نشط',
      stArchived: 'مؤرشف',
      stPaused: 'متوقف مؤقتاً',
      stPending: 'قيد المراجعة',
      roleAdmin: 'مشرف',
      roleTrainer: 'مدرب',
      roleStudent: 'طالب',
      roleModerator: 'مشرف محتوى',
      typeVideo: 'فيديو',
      typeArticle: 'مقال',
      typeQuiz: 'اختبار',
      typeProject: 'مشروع',
      lVideoUrl: 'رابط الفيديو',
      lProject: 'المشروع المرتبط',
      lPickProject: 'اختر مشروعاً',
      colName: 'الاسم',
      colHandle: 'المعرّف',
      colContact: 'التواصل',
      colRole: 'الدور',
      colStatus: 'الحالة',
      colJoined: 'الانضمام',
      colReferralVisits: 'زيارات الإحالة',
      colReferralPoints: 'نقاط الإحالة',
      colReferralStatsVisibility: 'إظهار إحصاءات الإحالة',
      referralStatsVisible: 'مفعّل',
      referralStatsHidden: 'غير مفعّل',
      referralStatsUpdated: 'تم تحديث إظهار إحصاءات الإحالة.',
      colRegisteredDevices: 'الأجهزة المسجلة',
      manageDevices: 'إدارة الجلسات',
      deviceSessionsTitle: 'جلسات تسجيل الدخول',
      noDeviceSessions: 'لا توجد جلسات نشطة لهذا الطالب.',
      deviceSessionRevoke: 'إنهاء هذه الجلسة',
      deviceSessionsRevokeAll: 'إنهاء جميع الجلسات',
      deviceSessionsConfirmAll: 'سيتم تسجيل خروج الطالب من جميع الأجهزة. هل تريد المتابعة؟',
      deviceSessionsLoading: 'جارٍ تحميل الجلسات...',
      deviceSessionsRevoked: 'تم إنهاء الجلسة وتسجيل الخروج من الجهاز.',
      deviceSessionsRevokedAll: 'تم إنهاء جميع الجلسات.',
      deviceLastSeen: 'آخر نشاط',
      deviceIp: 'عنوان IP',
      colActions: 'إجراءات',
      colTitle: 'العنوان',
      colTrainer: 'المدرب',
      colCategory: 'التصنيف',
      colPrice: 'السعر',
      colDuration: 'المدة',
      colLessons: 'الدروس',
      colCourse: 'الدورة',
      colSection: 'الوحدة',
      colLesson: 'الدرس',
      colType: 'النوع',
      colFree: 'مجاني',
      colStats: 'الإحصاءات',
      colDate: 'التاريخ',
      colContent: 'المحتوى',
      colOwner: 'الصاحب',
      colSpecialty: 'التخصص',
      colRating: 'التقييم',
      colTags: 'الوسوم',
      colCover: 'الغلاف',
      colActivity: 'آخر نشاط',
      statUsers: 'الطلاب',
      statTrainers: 'المدربون',
      statCourses: 'الدورات',
      statLessons: 'الدروس',
      statProjects: 'المشاريع',
      statDailies: 'اليوميات',
      statComments: 'التعليقات',
      statLikes: 'الإعجابات',
      statSiteVisits: 'زيارات الموقع',
      statActive: 'نشط',
      growthTitle: 'نمو المحتوى',
      growthSub: 'عدد الدورات والمشاريع واليوميات المُنشأة شهرياً',
      lgCourses: 'الدورات',
      lgProjects: 'المشاريع',
      lgDailies: 'اليوميات',
      statusTitle: 'حالة المحتوى',
      published: 'منشور',
      drafts: 'مسودات',
      total: 'الإجمالي',
      catsTitle: 'الدورات حسب التصنيف',
      uncat: 'بدون تصنيف',
      feedTitle: 'آخر النشاطات',
      feedEmpty: 'لا توجد نشاطات بعد — كل عملية تنفّذها من اللوحة تُسجَّل هنا',
      recentContent: 'أحدث المحتوى',
      topProjects: 'أعلى المشاريع مشاهدة',
      topDailies: 'الأكثر إعجاباً',
      viewsN: 'مشاهدة',
      likesN: 'إعجاب',
      entUsers: 'مستخدم',
      entTrainers: 'مدرب',
      entCourses: 'دورة',
      entLessons: 'درس',
      entProjects: 'مشروع',
      entDailies: 'يومية',
      actCreate: 'إضافة',
      actUpdate: 'تحديث',
      actDelete: 'حذف',
      actStatus: 'حالة',
      fName: 'اسم المنصة',
      fHomepageTitle: 'عنوان بانر الرئيسية',
      fTagline: 'الشعار النصي',
      fEmail: 'البريد الإلكتروني',
      fPhone: 'رقم الهاتف',
      fWa: 'رقم واتساب',
      fSite: 'الموقع الإلكتروني',
      brandPalette: 'ألوان المنصة',
      brandPaletteHint: 'اختر مجموعة متناسقة لتطبيقها على أزرار وروابط وتدرجات المنصة',
      paletteCurrent: 'ألوان المنصة الحالية',
      paletteOcean: 'أزرق محيطي',
      paletteViolet: 'بنفسجي هادئ',
      paletteEmerald: 'أخضر زمردي',
      paletteSunset: 'غروب دافئ',
      paletteRose: 'وردي أنيق',
      paletteSlate: 'رمادي عصري',
      setInfo: 'بيانات المنصة',
      setInfoSub: 'تظهر هذه البيانات في واجهة الموقع والصفحات العامة',
      setOptions: 'خيارات التشغيل',
      setSummary: 'ملخص المحتوى',
      setData: 'البيانات والنسخ الاحتياطي',
      setDataSub: 'تصدير واستعادة سجلات قاعدة البيانات وملفات المنصة؛ الاستعادة تضيف السجلات غير الموجودة ولا تستبدل الحالية',
      databaseSize: 'حجم قاعدة البيانات',
      databaseSizeScale: 'مقياس بصري حتى 1 جيجابايت، وليس حداً أقصى للتخزين',
      databaseSizeVisualScale: 'من مقياس 1 جيجابايت',
      optMaintenance: 'وضع الصيانة',
      optMaintenanceH: 'إيقاف واجهة الموقع مؤقتاً لزواره مع بقاء اللوحة تعمل',
      optSignup: 'السماح بالتسجيل الجديد',
      optSignupH: 'عند الإيقاف لا يتمكن الزوار من إنشاء حسابات جديدة',
      btnExport: 'تصدير نسخة احتياطية',
      btnImport: 'استيراد نسخة',
      importConfirm: 'ستتم إضافة السجلات غير الموجودة فقط، مع إبقاء السجلات الحالية كما هي. متابعة؟',
      importOk: 'تم دمج النسخة بنجاح',
      importErr: 'الملف غير صالح أو تالف',
      savedOk: 'تم حفظ الإعدادات',
      settingsErr: 'تعذر حفظ الإعدادات. تحقق من البيانات وحاول مجدداً.',
      backupErr: 'تعذر إكمال عملية النسخ الاحتياطي.',
      trainerRequired: 'اختر مدرباً صالحاً لهذه الدورة',
      courseActivate: 'تفعيل الدورة',
      courseDeactivate: 'إيقاف الدورة',
      courseCohorts: 'الشُعب والطلبات',
      courseCohortsTitle: 'شُعب الدورة',
      courseCohort: 'الشعبة',
      courseCohortActive: 'نشطة',
      courseCohortClosed: 'مغلقة',
      courseCohortStart: 'تاريخ البداية',
      courseCohortEnd: 'تاريخ النهاية',
      courseCohortApplicants: 'طلبات التسجيل',
      courseCohortNoApplicants: 'لا توجد طلبات تسجيل في هذه الشعبة.',
      courseCohortApplicantSearch: 'البحث عن متقدم',
      courseCohortApplicantPlaceholder: 'ابحث بالاسم أو رقم الهاتف',
      courseCohortSourceSearch: 'تصفية حسب الطالب المُحيل',
      courseCohortAllSources: 'كل مصادر الإحالة',
      courseCohortNoApplicantMatches: 'لا توجد طلبات مطابقة لخيارات البحث.',
      courseCohortNoHistory: 'لا توجد شُعب لهذه الدورة حتى الآن.',
      courseCohortBack: 'العودة إلى الدورات الوجاهية',
      courseCohortCourseMissing: 'تعذر العثور على الدورة المطلوبة.',
      courseCohortActiveRequests: 'طلبات الشعبة النشطة',
      courseCohortNoActive: 'لا توجد شعبة نشطة لهذه الدورة حالياً.',
      courseCohortHistory: 'سجل الشُعب السابقة',
      courseCohortViewRequests: 'عرض الطلبات',
      courseCohortHideRequests: 'إخفاء الطلبات',
      courseCohortRequestDetails: 'تفاصيل طلب التسجيل',
      courseCohortApplicantInfo: 'بيانات المتقدم',
      courseCohortApplicationInfo: 'معلومات الطلب',
      courseRequestOpenWhatsApp: 'مراسلة عبر واتساب',
      secInPersonCourseCohorts: 'الشُعب والطلبات',
      subInPersonCourseCohorts: 'طلبات التسجيل وسجل شُعب الدورة الوجاهية',
      courseRegistrationConfirm: 'تأكيد التسجيل',
      courseRegistrationConfirmed: 'تم تأكيد التسجيل',
      courseRegistrationConfirmFailed: 'تعذر تأكيد التسجيل.',
      courseRegistrationRejectedCannotConfirm: 'لا يمكن تأكيد طلب مرفوض.',
      courseRegistrationPaidAmount: 'المبلغ المدفوع',
      courseRegistrationPaymentDetails: 'الدفعات والمبلغ المتبقي',
      courseRegistrationAmountOfCourse: 'سعر الدورة',
      courseRegistrationNewPayment: 'أدخل قيمة الدفعة',
      courseRegistrationConfirmPayment: 'تأكيد إضافة الدفعة',
      courseRegistrationRemaining: 'المبلغ المتبقي',
      courseRegistrationPaymentRequired: 'أدخل قيمة الدفعة.',
      courseRegistrationPaymentFormatInvalid: 'أدخل مبلغاً صحيحاً بمنزلتين عشريتين كحد أقصى.',
      courseRegistrationPaymentMustBePositive: 'يجب أن تكون الدفعة أكبر من صفر.',
      courseRegistrationPaymentExceedsRemaining: 'لا يمكن أن تتجاوز الدفعة المبلغ المتبقي.',
      courseRegistrationPaidAmountSaved: 'تمت إضافة الدفعة',
      courseRegistrationPaidAmountSaveFailed: 'تعذر إضافة الدفعة.',
      courseActive: 'نشطة',
      courseInactive: 'غير نشطة',
      projectActivate: 'تفعيل المشروع',
      projectDeactivate: 'إيقاف المشروع',
      projectActive: 'نشط',
      projectInactive: 'غير نشط',
      projectVisibility: 'ظهور المشروع',
      projectVisibilityPublic: 'كل المشاريع',
      projectVisibilityPersonal: 'في البروفايل فقط',
      projectVisibilityConfirmPublic: 'هل تريد عرض هذا المشروع ضمن كل المشاريع؟',
      projectVisibilityConfirmPersonal: 'هل تريد قصر ظهور هذا المشروع على بروفايل صاحبه؟',
      backupReady: 'تم تنزيل النسخة الاحتياطية',
      mUser: 'بيانات المستخدم',
      mTrainer: 'بيانات المدرب',
      mCourse: 'بيانات الدورة',
      mLesson: 'بيانات الدرس',
      uAdd: 'إضافة طالب',
      uName: 'الاسم الكامل',
      fullNameArabic: 'الاسم العربي الكامل',
      fullNameEnglish: 'الاسم الإنجليزي الكامل',
      uHandle: 'المعرّف',
      uEmail: 'البريد الإلكتروني',
      uPhone: 'رقم الجوال',
      uRole: 'الدور',
      uStatus: 'حالة الحساب',
      uVerified: 'حساب موثّق',
      uBio: 'نبذة مختصرة',
      fRole: 'كل الأدوار',
      bulkActivate: 'تفعيل المحدد',
      bulkSuspend: 'إيقاف المحدد',
      emptyUsers: 'لا يوجد طلاب',
      emptyUsersSub: 'ابدأ بإضافة طلاب جدد إلى المنصة.',
      tAdd: 'إضافة مدرب',
      tSpecialty: 'التخصص',
      tRating: 'التقييم',
      tLinkedin: 'رابط LinkedIn',
      tGithub: 'رابط GitHub',
      fTrainerStatus: 'كل المدربين',
      emptyTrainers: 'لا يوجد مدربون',
      emptyTrainersSub: 'أضف فريق التدريب ليظهر للطلاب في صفحة الدورات.',
      cAdd: 'دورة جديدة',
      cTrainer: 'المدرب',
      cTrainerPick: 'اختر مدرباً',
      cPeriod: 'عدد اللقاءات',
      cSummary: 'وصف مختصر',
      cImage: 'صورة الغلاف',
      cUpload: 'رفع صورة',
      cRemove: 'إزالة',
      fCat: 'كل التصنيفات',
      fTrainer: 'كل المدربين',
      noTrainer: 'غير محدد',
      openCourse: 'عرض الدورة',
      editCourse: 'فتح المحرر',
      quickEdit: 'تعديل سريع',
      emptyCourses: 'لا توجد دورات',
      emptyCoursesSub: 'أنشئ أول دورة من محرر الدورات في المنصة.',
      lAdd: 'إضافة درس',
      lCourse: 'الدورة',
      lSection: 'الوحدة',
      lSectionHint: 'اختر وحدة قائمة أو اكتب اسماً جديداً لإنشائها',
      lNewSection: 'وحدة جديدة…',
      lTitle: 'عنوان الدرس',
      lDuration: 'المدة (دقيقة:ثانية)',
      lContent: 'وصف مختصر للدرس',
      fCourse: 'كل الدورات',
      fType: 'كل الأنواع',
      emptyLessons: 'لا توجد دروس',
      emptyLessonsSub: 'أضف دروساً لأي دورة في المنصة ورتّبها داخل وحداتها.',
      pAdd: 'مشروع جديد',
      pView: 'عرض المشروع',
      pEdit: 'فتح المحرر',
      fOwner: 'كل أصحاب المشاريع',
      projectType: 'نوع المشروع',
      projectTypeTrainer: 'مشاريع مدربين',
      projectTypeCourse: 'مشاريع دورات',
      projectTypeStudentCourse: 'مشاريع طلاب دورات',
      projectTypeStudentManual: 'مشاريع طلاب يدوية',
      projectOwnerLabel: 'صاحب المشروع',
      projectDownloads: 'مرات التنزيل',
      certificateCourse: 'شهادة دورة',
      certificateExternal: 'شهادة خارجية',
      certificateWorkshop: 'شهادة ورشة وجاهية',
      certificateAdd: 'إضافة شهادة',
      certificateBackToList: 'العودة إلى الشهادات',
      studentCertificatesTitle: 'الشهادات',
      studentCertificatesEmpty: 'لم يحصل الطالب على شهادات دورات أو ورشات بعد.',
      studentActiveCoursesTitle: 'الدورات النشطة',
      studentTypeFilter: 'نوع الطالب',
      studentTypeOnline: 'أونلاين',
      studentTypeInPerson: 'وجاهي',
      studentActiveCoursesEmpty: 'لا توجد دورات نشطة لهذا الطالب.',
      studentCompleted: 'منجزة',
      studentNotCompleted: 'غير منجزة',
      studentSubscriptionExpired: 'منتهي الاشتراك',
      progress: 'التقدم',
      certificateType: 'نوع الشهادة',
      certificateStudent: 'الطالب',
      certificateIssuer: 'الجهة المانحة',
      certificateCourseTitle: 'الدورة / الورشة',
      certificateReviewStatus: 'حالة الاعتماد',
      certificateReviewPending: 'قيد المراجعة',
      certificateReviewApproved: 'معروضة في البروفايل',
      certificateReviewRejected: 'مرفوضة',
      certificateRejectionReason: 'سبب الرفض',
      certificateRejectionReasonRequired: 'يرجى كتابة سبب رفض الشهادة.',
      certificateRejectionTitle: 'سبب رفض الشهادة',
      certificateReviewSaved: 'تم تحديث حالة الشهادة.',
      certificateReviewSave: 'حفظ الحالة',
      certificateReviewCancel: 'إلغاء',
      certificateIssued: 'صادرة',
      certificateDate: 'تاريخ الإصدار',
      certificateCode: 'رقم الشهادة',
      workshopDuration: 'مدة الورشة',
      minutesShort: 'دقيقة',
      workshopLocation: 'مكان الورشة',
      certificateCategory: 'التصنيف',
      certificateDescription: 'الوصف',
      certificateSkills: 'المهارات',
      certificateVerifyLink: 'رابط التحقق',
      certificateViewDetails: 'عرض تفاصيل الشهادة',
      certificateNoImage: 'لا توجد صورة مرفقة',
      certificateVisible: 'معروضة في الملف',
      certificateHidden: 'مخفية من الملف',
      emptyCertificates: 'لا توجد شهادات',
      emptyCertificatesSub: 'ستظهر هنا شهادات الدورات والورشات الوجاهية والشهادات الخارجية.',
      pointDiscountPoints: 'النقاط المستبدلة',
      certificateActivate: 'إظهار الشهادة في الملف',
      certificateDeactivate: 'إخفاء الشهادة من الملف',
      emptyProjects: 'لا توجد مشاريع',
      emptyProjectsSub: 'أنشئ مشروعاً جديداً ليظهر في صفحة المشاريع.',
      dAdd: 'يومية جديدة',
      dView: 'عرض اليومية',
      dEdit: 'تعديل اليومية',
      emptyDailies: 'لا توجد يوميات',
      emptyDailiesSub: 'أنشئ أول يومية لتوثيق رحلة التعلّم.',
      excerpt: 'مقتطف',
      uAvatar: 'الصورة الشخصية',
      guardOwner: 'لا يمكن حذف حساب مالك المنصة',
      bulkPublish: 'نشر المحدد',
      bulkDraft: 'تحويل لمسودة',
      colStudents: 'الطلاب',
      mStudents: 'طلاب الدورة',
      actStudents: 'عرض الطلاب',
      actLessons: 'دروس الدورة',
      addStudent: 'إضافة طالب',
      enrollOk: 'تم تسجيل الطالب في الدورة',
      unenroll: 'إزالة الطالب',
      unenrollOk: 'تمت إزالة الطالب من الدورة',
      noStudents: 'لا يوجد طلاب مسجلون في هذه الدورة',
      noStudentsSub: 'أضف طلاباً ليدرسوا دروسها ويتابعوا تقدمهم.',
      searchStudents: 'ابحث عن طالب بالاسم أو المعرّف أو الهاتف',
      searchStudentsMin: 'اكتب حرفين على الأقل للبحث.',
      searchStudentsEmpty: 'لا يوجد طلاب مطابقون للبحث.',
      searchingStudents: 'جارٍ البحث...',
      studentsEnrolled: 'الطلاب المسجلون',
      alreadyEnrolled: 'الطالب مسجل بالفعل في الدورة',
      progress: 'الإنجاز',
      enrolledAt: 'تاريخ الالتحاق',
      noEnrollable: 'لا يوجد مستخدمون متاحون للتسجيل',
      courseLessonsTitle: 'دروس الدورة',
      noLessonsCourse: 'لا توجد دروس في هذه الدورة بعد',
      noLessonsCourseSub: 'أضف دروساً ورتّبها داخل وحدات للبدء.',
      entEnrollments: 'تسجيل',
      lessonComplete: 'شاهدوه للنهاية',
      mCompleters: 'من أكمل الدرس',
      noCompleters: 'لم يُكمل أحد هذا الدرس بعد',
      noCompletersSub: 'سيظهر هنا الطلاب الذين شاهدوا الدرس حتى النهاية.',
      completedAt: 'أتمّ الدرس',
      entCompletions: 'إكمال',
      tagsHint: 'اكتب ثم Enter لإضافة وسم',
      addImages: 'إضافة صور',
      addFiles: 'إضافة ملفات',
      addMedia: 'إضافة وسائط',
      mediaTooBig: 'حجم الفيديو كبير جداً (الحد 2MB)',
      rteBold: 'عريض',
      rteItalic: 'مائل',
      rteHead: 'عنوان',
      rteList: 'قائمة',
      rteQuote: 'اقتباس',
      rteLink: 'رابط',
      secBasic: 'الأساسيات',
      secContent: 'المحتوى',
      secMedia: 'الوسائط',
      secLinks: 'الروابط',
      secMeta: 'التفاصيل والحالة',
      secRelated: 'المحتوى المرتبط',
      cLevel: 'المستوى',
      cLanguage: 'اللغة',
      cCredential: 'معرّف الشهادة',
      cVerifyUrl: 'رابط التحقق',
      cOutcomes: 'المخرجات التعليمية',
      cSkills: 'المهارات المكتسبة',
      cRelatedHint: 'ملخّص الدروس والتسجيلات المرتبطة بهذا المسار.',
      pCover: 'صورة الغلاف',
      pContent: 'المحتوى الكامل',
      pGallery: 'معرض الصور',
      pFiles: 'الملفات المرفقة',
      linkGithub: 'رابط GitHub',
      linkDemo: 'رابط العرض',
      pRelatedHint: 'إحصاءات التفاعل والملفات المرتبطة.',
      dRatio: 'أبعاد الوسائط',
      dMedia: 'الوسائط',
      dRelatedHint: 'تفاعل المنشور.',
      lRelatedHint: 'عدد من أكمل هذا الدرس.',
      uRelatedHint: 'تسجيلات المستخدم والدروس المكتملة.',
      tRelatedHint: 'المسارات التي يدرّسها هذا المدرّب.',
      statViews: 'المشاهدات'
    },
    en: {
      brandTitle: 'Admin panel',
      brandSub: 'Data Center training',
      adminRole: 'System admin',
      viewSite: 'View site',
      menu: 'Menu',
      logout: 'Log out',
      secOverview: 'Overview',
      secUsers: 'Online students',
      secReferralPoints: 'Referral points',
      secTrainers: 'Trainers',
      secTrainingCategories: 'Training fields',
      secFreelancerCategories: 'Freelancer categories',
      trainingCategoryDrag: 'Drag to reorder this field',
      secCourses: 'Online courses',
      secInPersonCourses: 'In-person courses',
      secInPersonWorkshopCourses: 'Workshops',
      secInPersonStudents: 'In-person students',
      secLessons: 'Lessons',
      secProjects: 'Projects',
      secWorkshops: 'Workshops',
      secCourseRegistrationRequests: 'In-person course applications',
      secSubscriptions: 'Subscriptions',
      secStudentCertificates: 'Review certificates',
      secInPersonPaymentInvoices: 'In-person subscriptions',
      secOnlineCourseInvoices: 'Online subscriptions',
      secDailies: 'Journals',
      secSettings: 'Settings',
      subOverview: 'Platform performance and content at a glance',
      subUsers: 'Manage student accounts and their status',
      subReferralPoints: 'View and reset referral point balances',
      referralPointsEmpty: 'No students currently have a referral point balance.',
      referralPointsBalance: 'Points balance',
      referralPointsReset: 'Reset points',
      referralPointsResetConfirm: 'Reset this student’s entire referral point balance?',
      referralPointsResetSuccess: 'Referral points reset successfully.',
      referralPointsResetFailed: 'Could not reset referral points.',
      subTrainers: 'Manage the training team and specialties',
      subTrainingCategories: 'Manage categories used for courses, projects, and freelancers',
      subFreelancerCategories: 'Manage categories used to filter freelancers on the public listing',
      freelancerCategoryDeleteConfirm: 'Deleting this category will clear the matching specialty from freelancer profiles. Continue?',
      subCourses: 'Manage online courses and their assigned trainers',
      subInPersonCourses: 'View and manage published in-person courses and drafts',
      subInPersonStudents: 'Students accepted into in-person courses',
      inPersonStudentsEmpty: 'There are no students registered in in-person courses yet.',
      emptyInPersonCourses: 'There are no in-person courses yet.',
      emptyInPersonCoursesSub: 'Add a course using the course editor.',
      emptyWorkshops: 'There are no workshops yet.',
      emptyWorkshopsSub: 'Add an in-person or online workshop using the workshop editor.',
      subLessons: 'Manage lessons of every course and section',
      subProjects: 'Manage student projects and their status',
      subWorkshops: 'Manage in-person and online workshops',
      subCourseRegistrationRequests: 'Review applicants for in-person courses and their contact details',
      subSubscriptions: 'Create and manage student subscriptions to in-person and online courses',
      subscriptionAdd: 'New subscription',
      subscriptionAddTitle: 'Create a student subscription',
      subscriptionType: 'Course type',
      subscriptionTypeOnline: 'Online',
      subscriptionTypeInPerson: 'In-person',
      subscriptionCourse: 'Course',
      subscriptionCourseSearch: 'Search for a course',
      subscriptionCourseNoMatches: 'No matching published courses.',
      subscriptionStudentNoMatches: 'No matching students.',
      subscriptionCohort: 'Cohort',
      subscriptionCohortChoose: 'Choose a cohort',
      subscriptionCohortUnavailable: 'No active cohort is available for this course.',
      subscriptionPrice: 'Subscription amount',
      subscriptionPriceHint: 'Filled automatically from the course price and currency.',
      subscriptionDiscount: 'Discount amount (optional)',
      subscriptionDiscountHint: 'Leave blank if there is no discount.',
      subscriptionDiscountInvalid: 'The discount cannot exceed the subscription amount.',
      subscriptionInitialPayment: 'Payment at enrollment',
      subscriptionCreateButton: 'Confirm subscription',
      subscriptionCreateSuccess: 'Subscription created and student added to the course.',
      subscriptionCreateFailed: 'Could not create the subscription.',
      subscriptionEmpty: 'There are no subscriptions yet.',
      subscriptionFilterType: 'All course types',
      subscriptionFilterBalance: 'Remaining balance',
      subscriptionHasBalance: 'Has an outstanding balance',
      subscriptionHistory: 'Student subscription history',
      subscriptionHistoryEmpty: 'This student has no previous subscriptions.',
      subscriptionHistoryOpen: 'View student subscription history',
      subscriptionHistoryAddPayment: 'New payment',
      subscriptionHistoryPaymentSaved: 'Payment recorded successfully.',
      subscriptionHistoryPaymentFailed: 'Could not record the payment.',
      subInPersonPaymentInvoices: 'Track subscription prices, payments, and remaining balances for in-person students',
      inPersonPaymentInvoicesEmpty: 'There are no accepted in-person course students.',
      inPersonPaymentAmount: 'Subscription price',
      subOnlineCourseInvoices: 'Issue online course subscription invoices and track payments',
      onlineCourseInvoiceEmpty: 'There are no online subscription invoices yet.',
      onlineCourseInvoiceAdd: 'Create new invoice',
      onlineCourseInvoiceAddTitle: 'Create online subscription invoice',
      onlineCourseInvoiceStudent: 'Student',
      onlineCourseInvoiceStudentSearch: 'Search by student name, phone, or email',
      onlineCourseInvoiceStudentNoMatches: 'No matching students found.',
      onlineCourseInvoiceCourseSearch: 'Search online courses',
      onlineCourseInvoiceCourseNoMatches: 'No matching courses found.',
      onlineCourseInvoiceCourse: 'Online course',
      onlineCourseInvoiceChooseCourse: 'Choose a course',
      onlineCourseInvoiceDiscountType: 'Discount type',
      onlineCourseInvoiceDiscountFixed: 'Fixed amount',
      onlineCourseInvoiceDiscountPercentage: 'Percentage',
      onlineCourseInvoiceDiscountValue: 'Discount value',
      onlineCourseInvoiceDiscountHint: 'The subscription price is based on the course price and can include a fixed or percentage discount.',
      onlineCourseInvoiceNoStudents: 'There are no students to choose from.',
      onlineCourseInvoiceNoCourses: 'There are no published online courses.',
      onlineCourseInvoiceCreateSuccess: 'The subscription invoice was created and the student was enrolled.',
      onlineCourseInvoiceCreateFailed: 'Could not create the subscription invoice.',
      onlineCourseInvoicePaymentSaved: 'Invoice payment added.',
      onlineCourseInvoicePaymentFailed: 'Could not add invoice payment.',
      onlineCourseInvoiceDuplicate: 'An invoice already exists for this student in this course.',
      onlineCourseInvoiceDiscountInvalid: 'Enter a valid discount value.',
      onlineCourseInvoiceCreateButton: 'Create invoice',
      onlineCourseInvoiceDiscount: 'Discount',
      registrationRequestName: 'Applicant',
      registrationRequestPhone: 'Phone / WhatsApp',
      registrationRequestAddress: 'Address',
      registrationRequestSpecialty: 'Specialty',
      registrationRequestGovernorate: 'Governorate',
      registrationRequestGovernorateGaza: 'Gaza',
      registrationRequestGovernorateCentral: 'Central',
      registrationRequestGovernorateOnline: 'Online',
      registrationRequestGovernorateInvalid: 'Select a governorate.',
      registrationRequestStudyYear: 'Study year',
      registrationRequestStudyYearInvalid: 'Enter the study year as a positive whole number.',
      registrationRequestStudent: 'Student',
      registrationRequestGraduate: 'Graduate',
      registrationRequestStudentStatus: 'Student status',
      registrationRequestStatus: 'Application status',
      registrationRequestNew: 'New',
      registrationRequestContacted: 'Contacted',
      registrationRequestAccepted: 'Accepted',
      registrationRequestRejected: 'Rejected',
      registrationRequestDate: 'Applied on',
      registrationRequestCourse: 'Course',
      registrationRequestCourseFilter: 'Filter by course',
      registrationRequestAllCourses: 'All courses',
      registrationRequestCohortFilter: 'Filter by course cohort',
      registrationRequestAllCohorts: 'All cohorts',
      registrationRequestSource: 'Referral source',
      registrationRequestDirect: 'Direct',
      registrationRequestEmpty: 'There are no registration requests yet.',
      registrationRequestAdd: 'Add new request',
      registrationRequestAddTitle: 'Add registration request',
      registrationRequestChooseCourse: 'Choose a course',
      registrationRequestNoCourses: 'There are no published in-person courses to add a request for.',
      registrationRequestNameInvalid: 'Enter a valid applicant name.',
      registrationRequestPhoneInvalid: 'Enter a valid phone number starting with +.',
      registrationRequestInvalid: 'Enter a valid address, specialty, and student status.',
      registrationRequestCreated: 'Registration request added successfully.',
      workshopAdd: 'Add workshop',
      workshopNew: 'New workshop',
      workshopInPerson: 'In-person workshop',
      workshopOnline: 'Online workshop',
      workshopChooseType: 'Choose workshop type',
      workshopEdit: 'Edit workshop',
      workshopTitle: 'Workshop title',
      workshopTrainer: 'Trainer name',
      workshopDescription: 'Workshop description',
      workshopStartsAt: 'Workshop date and time',
      workshopDuration: 'Duration in minutes',
      workshopMinutes: 'minutes',
      workshopLocation: 'Location',
      workshopAttendees: 'Attendees',
      workshopAttendeesTitle: 'Workshop attendees',
      workshopNoAttendees: 'No students have attended this workshop yet.',
      workshopAttendeesLoading: 'Loading attendance list...',
      workshopAttendeesError: 'Could not load the attendance list.',
      workshopAttendedAt: 'Attendance time',
      workshopAttendanceIsOpen: 'Open',
      workshopAttendanceIsClosed: 'Closed',
      workshopOpenAttendance: 'Open attendance',
      workshopCloseAttendance: 'Close attendance',
      workshopRegenerateQr: 'Regenerate QR code',
      workshopShowQr: 'Show QR code',
      workshopDownloadQr: 'Download QR code',
      inPersonStudentAccount: 'Student account',
      studentEdit: 'Edit student details',
      studentUpdated: 'Student details updated.',
      studentAccountReady: 'Account ready',
      studentHasOnlineAccount: 'Already has an account',
      studentAccountCreatedLabel: 'Account created',
      studentSetupLinkCreate: 'Create password setup link',
      studentSetupLinkCopy: 'Copy password setup link',
      studentSetupLinkShowQr: 'Show setup-link QR code',
      studentSetupLinkCreated: 'Password setup link created.',
      studentAccountCreated: 'Student account created successfully',
      studentAccountAlreadyReady: 'Already has an account',
      studentSetupLinkCopied: 'Password setup link copied.',
      studentSetupLinkCopyFailed: 'This browser could not copy the link.',
      studentSetupLinkQrTitle: 'Student account setup link',
      studentSetupLinkExpires: 'Link expires',
      studentSetupLinkExpired: 'This link has expired. Create a new link.',
      studentSetupLinkOpen: 'Open link',
      courseRegistrationStatusClick: 'Click to change to',
      courseRegistrationStatusUpdated: 'Registration status updated.',
      workshopDelete: 'Delete workshop',
      workshopDeleteConfirm: 'Deleting this workshop permanently removes its attendance records and certificates. Continue?',
      workshopQrRotated: 'QR code regenerated and attendance closed. Open attendance manually when ready.',
      workshopQrConfirm: 'The current QR code will be revoked and attendance closed until you reopen it. Continue?',
      subStudentCertificates: 'Review manual certificates submitted by students and trainers',
      subDailies: 'Manage student journals and their status',
      subSettings: 'Platform info, options and backups',
      groupManage: 'Management',
      groupContent: 'Content',
      groupOperations: 'Operations',
      groupSystem: 'System',
      searchPh: 'Search…',
      all: 'All',
      allStatus: 'All statuses',
      workshopCourseTypeFilter: 'Workshop format',
      export: 'Export CSV',
      exported: 'Export file is ready',
      clearSel: 'Clear selection',
      bulkDelete: 'Delete selected',
      noResults: 'No matching results',
      showing: 'Showing',
      of: 'of',
      prev: 'Prev',
      next: 'Next',
      page: 'Page',
      selected: 'selected',
      cancel: 'Cancel',
      save: 'Save',
      saveChanges: 'Save changes',
      delete: 'Delete',
      edit: 'Edit',
      confirmDelete: 'Are you sure? This action cannot be undone.',
      confirmRemoveStudent: 'Remove this student from the course? Their progress and course certificate, if any, will be deleted.',
      redeemReferralPoints: 'Redeem 100 points for a free course subscription',
      redeemPointsTitle: 'Redeem referral points',
      redeemPointsCourse: 'Paid course',
      redeemPointsBalance: 'Current student balance',
      redeemPointsHint: '100 points will be deducted and the student will be enrolled in the selected course for free.',
      redeemPointsSubmit: 'Confirm redemption',
      redeemPointsSuccess: '100 points redeemed and the student enrolled in the course.',
      redeemPointsNoCourses: 'There are no published paid courses available for redemption.',
      selectCourse: 'Select a course',
      fieldRequired: 'Required field',
      userEmailInvalid: 'Enter a valid email address.',
      userPhoneInvalid: 'Phone number must contain digits only and may start with +.',
      userPhoneTaken: 'This phone number is already in use.',
      trainerWhatsapp: 'WhatsApp number',
      trainerWhatsappHint: 'Optional: + followed by up to 12 digits.',
      trainerWhatsappInvalid: 'Enter an optional + followed by 1 to 12 digits.',
      trainerPassword: 'Initial password',
      accountPassword: 'Password',
      passwordKeepHint: 'Leave blank to keep the current password.',
      saveError: 'Could not save the data. Please try again.',
      userHandleTaken: 'This handle is already in use.',
      created: 'Created successfully',
      updated: 'Updated successfully',
      deleted: 'Deleted successfully',
      trainingCategoryAdd: 'Add field',
      trainingCategoryEdit: 'Edit field',
      trainingCategoryName: 'Training field name',
      trainingCategoryProjectsFilter: 'All Projects filter',
      trainingCategoryDeleteConfirm: 'Deleting this field removes it from associated courses, projects, and freelancer specialties. Continue?',
      trainingCategoryTrainers: 'Trainers',
      trainingCategoryStudents: 'Students',
      trainerActivate: 'Reactivate trainer',
      trainerDeactivate: 'Pause trainer',
      trainerContentAllowed: 'Publishing allowed',
      trainerContentDenied: 'Publishing disabled',
      trainerAllowContent: 'Allow this trainer to publish courses and projects publicly',
      trainerDenyContent: 'Stop this trainer from publishing courses and projects publicly',
      studentActivate: 'Reactivate student',
      studentSuspend: 'Suspend student',
      statusUpd: 'Status changed',
      emptyTitle: 'Nothing here yet',
      emptySub: 'Add new items to see them here.',
      stActive: 'Active',
      stSuspended: 'Suspended',
      stPublished: 'Published',
      stDraft: 'Draft',
      stInactive: 'Inactive',
      stArchived: 'Archived',
      stPaused: 'Paused',
      stPending: 'Pending',
      roleAdmin: 'Admin',
      roleTrainer: 'Trainer',
      roleStudent: 'Student',
      roleModerator: 'Moderator',
      typeVideo: 'Video',
      typeArticle: 'Article',
      typeQuiz: 'Quiz',
      typeProject: 'Project',
      lVideoUrl: 'Video URL',
      lProject: 'Linked project',
      lPickProject: 'Select a project',
      colName: 'Name',
      colHandle: 'Handle',
      colContact: 'Contact',
      colRole: 'Role',
      colStatus: 'Status',
      colJoined: 'Joined',
      colReferralVisits: 'Referral visits',
      colReferralPoints: 'Referral points',
      colReferralStatsVisibility: 'Show referral stats',
      referralStatsVisible: 'Enabled',
      referralStatsHidden: 'Disabled',
      referralStatsUpdated: 'Referral stats visibility updated.',
      colRegisteredDevices: 'Signed-in devices',
      manageDevices: 'Manage sessions',
      deviceSessionsTitle: 'Login sessions',
      noDeviceSessions: 'This student has no active sessions.',
      deviceSessionRevoke: 'End this session',
      deviceSessionsRevokeAll: 'End all sessions',
      deviceSessionsConfirmAll: 'This will sign the student out of all devices. Continue?',
      deviceSessionsLoading: 'Loading sessions...',
      deviceSessionsRevoked: 'Session ended and the device was signed out.',
      deviceSessionsRevokedAll: 'All sessions ended.',
      deviceLastSeen: 'Last active',
      deviceIp: 'IP address',
      colActions: 'Actions',
      colTitle: 'Title',
      colTrainer: 'Trainer',
      colCategory: 'Category',
      colPrice: 'Price',
      colDuration: 'Duration',
      colLessons: 'Lessons',
      colCourse: 'Course',
      colSection: 'Section',
      colLesson: 'Lesson',
      colType: 'Type',
      colFree: 'Free',
      colStats: 'Stats',
      colDate: 'Date',
      colContent: 'Content',
      colOwner: 'Owner',
      colSpecialty: 'Specialty',
      colRating: 'Rating',
      colTags: 'Tags',
      colCover: 'Cover',
      colActivity: 'Last activity',
      statUsers: 'Students',
      statTrainers: 'Trainers',
      statCourses: 'Courses',
      statLessons: 'Lessons',
      statProjects: 'Projects',
      statDailies: 'Journals',
      statComments: 'Comments',
      statLikes: 'Likes',
      statSiteVisits: 'Site visits',
      statActive: 'active',
      growthTitle: 'Content growth',
      growthSub: 'Courses, projects and journals created per month',
      lgCourses: 'Courses',
      lgProjects: 'Projects',
      lgDailies: 'Journals',
      statusTitle: 'Content status',
      published: 'Published',
      drafts: 'Drafts',
      total: 'Total',
      catsTitle: 'Courses by category',
      uncat: 'Uncategorized',
      feedTitle: 'Recent activity',
      feedEmpty: 'No activity yet — every action you take here is logged',
      recentContent: 'Latest content',
      topProjects: 'Top projects by views',
      topDailies: 'Most liked journals',
      viewsN: 'views',
      likesN: 'likes',
      entUsers: 'user',
      entTrainers: 'trainer',
      entCourses: 'course',
      entLessons: 'lesson',
      entProjects: 'project',
      entDailies: 'journal',
      actCreate: 'Created',
      actUpdate: 'Updated',
      actDelete: 'Deleted',
      actStatus: 'Status',
      fName: 'Platform name',
      fHomepageTitle: 'Homepage banner title',
      fTagline: 'Tagline',
      fEmail: 'Contact email',
      fPhone: 'Phone number',
      fWa: 'WhatsApp number',
      fSite: 'Website',
      brandPalette: 'Platform colors',
      brandPaletteHint: 'Choose a coordinated palette for platform buttons, links, and gradients',
      paletteCurrent: 'Current platform colors',
      paletteOcean: 'Ocean blue',
      paletteViolet: 'Soft violet',
      paletteEmerald: 'Emerald green',
      paletteSunset: 'Warm sunset',
      paletteRose: 'Elegant rose',
      paletteSlate: 'Modern slate',
      setInfo: 'Platform info',
      setInfoSub: 'Shown on the site header and public pages',
      setOptions: 'Operation options',
      setSummary: 'Content summary',
      setData: 'Data & backup',
      setDataSub: 'Export and restore database records and platform files; restore adds missing records without replacing current ones',
      databaseSize: 'Database size',
      databaseSizeScale: 'Visual scale up to 1 GB; this is not a storage limit',
      databaseSizeVisualScale: 'of a 1 GB visual scale',
      optMaintenance: 'Maintenance mode',
      optMaintenanceH: 'Take the public site offline while the panel keeps working',
      optSignup: 'Allow new sign-ups',
      optSignupH: 'When off, visitors cannot create accounts',
      btnExport: 'Export backup',
      btnImport: 'Import backup',
      importConfirm: 'Only records that do not already exist will be added. Existing records will remain unchanged. Continue?',
      importOk: 'Backup merged successfully',
      importErr: 'Invalid or corrupted file',
      savedOk: 'Settings saved',
      settingsErr: 'Could not save settings. Check the values and try again.',
      backupErr: 'The backup operation could not be completed.',
      trainerRequired: 'Select a valid trainer for this course',
      courseActivate: 'Activate course',
      courseDeactivate: 'Deactivate course',
      courseVisibility: 'Course visibility',
      courseVisibilityPlatform: 'Visible on platform',
      courseVisibilityProfile: 'Profile only',
      courseVisibilityShow: 'Show course on platform',
      courseVisibilityHide: 'Show course on profile only',
      courseVisibilityConfirmShow: 'Show this course on the platform?',
      courseVisibilityConfirmHide: 'Hide this course from the platform and show it on the profile only?',
      courseVisibilityTrainerDisabled: 'Allow this trainer to publish before showing the course on the platform.',
      courseHomepageVisibility: 'Homepage visibility',
      courseHomepageVisible: 'Shown on homepage',
      courseHomepageHidden: 'Trainer profile only',
      courseHomepageConfirmShow: 'Show this in-person course on the homepage?',
      courseHomepageConfirmHide: 'Show this in-person course only on the trainer profile?',
      courseCohorts: 'Cohorts & applications',
      courseCohortsTitle: 'Course cohorts',
      courseCohort: 'Cohort',
      courseCohortActive: 'Active',
      courseCohortClosed: 'Closed',
      courseCohortStart: 'Start date',
      courseCohortEnd: 'End date',
      courseCohortApplicants: 'Applications',
      courseCohortNoApplicants: 'There are no applications in this cohort.',
      courseCohortApplicantSearch: 'Search applicants',
      courseCohortApplicantPlaceholder: 'Search by name or phone number',
      courseCohortSourceSearch: 'Filter by referring student',
      courseCohortAllSources: 'All referral sources',
      courseCohortNoApplicantMatches: 'No applications match these filters.',
      courseCohortNoHistory: 'This course has no cohorts yet.',
      courseCohortBack: 'Back to in-person courses',
      courseCohortCourseMissing: 'The requested course could not be found.',
      courseCohortActiveRequests: 'Active cohort applications',
      courseCohortNoActive: 'There is no active cohort for this course.',
      courseCohortHistory: 'Previous cohorts',
      courseCohortViewRequests: 'View applications',
      courseCohortHideRequests: 'Hide applications',
      courseCohortRequestDetails: 'Registration request details',
      courseCohortApplicantInfo: 'Applicant details',
      courseCohortApplicationInfo: 'Application details',
      courseRequestOpenWhatsApp: 'Message on WhatsApp',
      secInPersonCourseCohorts: 'Cohorts & applications',
      subInPersonCourseCohorts: 'Applications and cohort history for this in-person course',
      courseRegistrationConfirm: 'Confirm registration',
      courseRegistrationConfirmed: 'Registration confirmed',
      courseRegistrationConfirmFailed: 'Could not confirm registration.',
      courseRegistrationRejectedCannotConfirm: 'A rejected application cannot be confirmed.',
      courseRegistrationPaidAmount: 'Paid amount',
      courseRegistrationPaymentDetails: 'Payments and remaining balance',
      courseRegistrationAmountOfCourse: 'Course price',
      courseRegistrationNewPayment: 'Enter payment amount',
      courseRegistrationConfirmPayment: 'Confirm payment',
      courseRegistrationRemaining: 'Remaining amount',
      courseRegistrationPaymentRequired: 'Enter a payment amount.',
      courseRegistrationPaymentFormatInvalid: 'Enter a valid amount with no more than two decimal places.',
      courseRegistrationPaymentMustBePositive: 'The payment must be greater than zero.',
      courseRegistrationPaymentExceedsRemaining: 'The payment cannot exceed the remaining amount.',
      courseRegistrationPaidAmountSaved: 'Payment added',
      courseRegistrationPaidAmountSaveFailed: 'Could not add the payment.',
      courseActive: 'Active',
      courseInactive: 'Inactive',
      projectActivate: 'Activate project',
      projectDeactivate: 'Deactivate project',
      projectActive: 'Active',
      projectInactive: 'Inactive',
      projectVisibility: 'Project visibility',
      projectVisibilityPublic: 'All projects',
      projectVisibilityPersonal: 'Profile only',
      projectVisibilityConfirmPublic: 'Show this project in the public projects listing?',
      projectVisibilityConfirmPersonal: 'Show this project only on its owner’s profile?',
      backupReady: 'Backup downloaded',
      mUser: 'User details',
      mTrainer: 'Trainer details',
      mCourse: 'Course details',
      mLesson: 'Lesson details',
      uAdd: 'Add student',
      uName: 'Full name',
      fullNameArabic: 'Full name in Arabic',
      fullNameEnglish: 'Full name in English',
      uHandle: 'Handle',
      uEmail: 'Email',
      uPhone: 'Phone',
      uRole: 'Role',
      uStatus: 'Account status',
      uVerified: 'Verified account',
      uBio: 'Short bio',
      fRole: 'All roles',
      bulkActivate: 'Activate selected',
      bulkSuspend: 'Suspend selected',
      emptyUsers: 'No students yet',
      emptyUsersSub: 'Start by adding students to the platform.',
      tAdd: 'Add trainer',
      tSpecialty: 'Specialty',
      tRating: 'Rating',
      tLinkedin: 'LinkedIn URL',
      tGithub: 'GitHub URL',
      fTrainerStatus: 'All trainers',
      emptyTrainers: 'No trainers yet',
      emptyTrainersSub: 'Add your training team so students can see them.',
      cAdd: 'New course',
      cTrainer: 'Trainer',
      cTrainerPick: 'Select a trainer',
      cPeriod: 'Sessions',
      cSummary: 'Short description',
      cImage: 'Cover image',
      cUpload: 'Upload image',
      cRemove: 'Remove',
      fCat: 'All categories',
      fTrainer: 'All trainers',
      noTrainer: 'Unassigned',
      openCourse: 'Open course',
      editCourse: 'Open editor',
      quickEdit: 'Quick edit',
      emptyCourses: 'No courses yet',
      emptyCoursesSub: 'Create your first course from the course editor.',
      lAdd: 'Add lesson',
      lCourse: 'Course',
      lSection: 'Section',
      lSectionHint: 'Pick an existing section or type a new name to create one',
      lNewSection: 'New section…',
      lTitle: 'Lesson title',
      lDuration: 'Duration (mm:ss)',
      lContent: 'Short lesson summary',
      fCourse: 'All courses',
      fType: 'All types',
      emptyLessons: 'No lessons yet',
      emptyLessonsSub: 'Add lessons to any course and organize them in sections.',
      pAdd: 'New project',
      pView: 'Open project',
      pEdit: 'Open editor',
      fOwner: 'All owners',
      projectType: 'Project type',
      projectTypeTrainer: 'Trainer projects',
      projectTypeCourse: 'Course projects',
      projectTypeStudentCourse: 'Student course projects',
      projectTypeStudentManual: 'Manual student projects',
      projectOwnerLabel: 'Project owner',
      projectDownloads: 'Downloads',
      certificateCourse: 'Course certificate',
      certificateExternal: 'External certificate',
      certificateWorkshop: 'In-person workshop certificate',
      certificateAdd: 'Add certificate',
      certificateBackToList: 'Back to certificates',
      studentCertificatesTitle: 'Certificates',
      studentCertificatesEmpty: 'This student has no course or workshop certificates yet.',
      studentActiveCoursesTitle: 'Active courses',
      studentTypeFilter: 'Student type',
      studentTypeOnline: 'Online',
      studentTypeInPerson: 'In-person',
      studentActiveCoursesEmpty: 'This student has no active courses.',
      studentCompleted: 'Completed',
      studentNotCompleted: 'Not completed',
      studentSubscriptionExpired: 'Subscription expired',
      progress: 'Progress',
      certificateType: 'Certificate type',
      certificateStudent: 'Student',
      certificateIssuer: 'Issuer',
      certificateCourseTitle: 'Course / Workshop',
      certificateReviewStatus: 'Review status',
      certificateReviewPending: 'Pending review',
      certificateReviewApproved: 'Shown on profile',
      certificateReviewRejected: 'Rejected',
      certificateRejectionReason: 'Rejection reason',
      certificateRejectionReasonRequired: 'Enter a reason for rejecting the certificate.',
      certificateRejectionTitle: 'Certificate rejection reason',
      certificateReviewSaved: 'Certificate status updated.',
      certificateReviewSave: 'Save status',
      certificateReviewCancel: 'Cancel',
      certificateIssued: 'Issued',
      certificateDate: 'Issue date',
      certificateCode: 'Certificate ID',
      workshopDuration: 'Workshop duration',
      minutesShort: 'minutes',
      workshopLocation: 'Workshop location',
      certificateCategory: 'Category',
      certificateDescription: 'Description',
      certificateSkills: 'Skills',
      certificateVerifyLink: 'Verification link',
      certificateViewDetails: 'View certificate details',
      certificateNoImage: 'No image attached',
      certificateVisible: 'Shown on profile',
      certificateHidden: 'Hidden from profile',
      emptyCertificates: 'No certificates',
      emptyCertificatesSub: 'Course, in-person workshop, and external student certificates will appear here.',
      pointDiscountPoints: 'Points redeemed',
      certificateActivate: 'Show certificate on profile',
      certificateDeactivate: 'Hide certificate from profile',
      emptyProjects: 'No projects yet',
      emptyProjectsSub: 'Create a project to show on the projects page.',
      dAdd: 'New journal',
      dView: 'Open journal',
      dEdit: 'Edit journal',
      emptyDailies: 'No journals yet',
      emptyDailiesSub: 'Create the first journal to document the learning journey.',
      excerpt: 'Excerpt',
      uAvatar: 'Avatar',
      guardOwner: 'The platform owner account cannot be deleted',
      bulkPublish: 'Publish selected',
      bulkDraft: 'Draft selected',
      colStudents: 'Students',
      mStudents: 'Course students',
      actStudents: 'View students',
      actLessons: 'Course lessons',
      addStudent: 'Add student',
      enrollOk: 'Student enrolled in the course',
      unenroll: 'Remove student',
      unenrollOk: 'Student removed from the course',
      noStudents: 'No students enrolled in this course',
      noStudentsSub: 'Add students to follow its lessons and track progress.',
      searchStudents: 'Search students by name, username, or phone',
      searchStudentsMin: 'Enter at least two characters to search.',
      searchStudentsEmpty: 'No students match your search.',
      searchingStudents: 'Searching...',
      studentsEnrolled: 'Enrolled students',
      alreadyEnrolled: 'Student is already enrolled in this course',
      progress: 'Progress',
      enrolledAt: 'Enrolled date',
      noEnrollable: 'No available users to enroll',
      courseLessonsTitle: 'Course lessons',
      noLessonsCourse: 'This course has no lessons yet',
      noLessonsCourseSub: 'Add lessons and organize them into sections.',
      entEnrollments: 'Enrollment',
      lessonComplete: 'Watched to the end',
      mCompleters: 'Finished by',
      noCompleters: 'No one has finished this lesson yet',
      noCompletersSub: 'Students who watch the lesson to the end will appear here.',
      completedAt: 'Completed the lesson',
      entCompletions: 'Completion',
      tagsHint: 'Type then Enter to add a tag',
      addImages: 'Add images',
      addFiles: 'Add files',
      addMedia: 'Add media',
      mediaTooBig: 'Video too large (2MB max)',
      rteBold: 'Bold',
      rteItalic: 'Italic',
      rteHead: 'Heading',
      rteList: 'List',
      rteQuote: 'Quote',
      rteLink: 'Link',
      secBasic: 'Basics',
      secContent: 'Content',
      secMedia: 'Media',
      secLinks: 'Links',
      secMeta: 'Details & status',
      secRelated: 'Related content',
      cLevel: 'Level',
      cLanguage: 'Language',
      cCredential: 'Credential ID',
      cVerifyUrl: 'Verify URL',
      cOutcomes: 'Learning outcomes',
      cSkills: 'Skills gained',
      cRelatedHint: 'Lessons and enrollments linked to this course.',
      pCover: 'Cover image',
      pContent: 'Full content',
      pGallery: 'Gallery',
      pFiles: 'Attached files',
      linkGithub: 'GitHub link',
      linkDemo: 'Live demo link',
      pRelatedHint: 'Engagement stats and related files.',
      dRatio: 'Media ratio',
      dMedia: 'Media',
      dRelatedHint: 'Post engagement.',
      lRelatedHint: 'Number of students who completed this lesson.',
      uRelatedHint: "This user's enrollments and completed lessons.",
      tRelatedHint: 'Courses taught by this trainer.',
      statViews: 'Views'
    }
  };
  var preserveAdminDashboardEditor =
    document.body.getAttribute('data-admin-course-editor') === 'true' ||
    document.body.getAttribute('data-admin-project-editor') === 'true';
  var dashboardEditorMounted = document.body.getAttribute('data-admin-dashboard-editor') === 'true';
  var dashboardEditorRoute = dashboardEditorMounted
    ? location.hash || (document.body.getAttribute('data-admin-course-editor') === 'true' ? '#/courses' : '#/projects')
    : '';
  var dashboardEditorLeaveHandler = null;
  var handlingDashboardHashChange = false;
  var ignoreDashboardHashChange = false;
  var loadingDashboardEditor = '';

  function lang() { return I18n.getLang() === 'en' ? 'en' : 'ar'; }
  function t(k) {
    var d = TEXT[lang()] || TEXT.ar;
    if (d[k] != null) return d[k];
    if (TEXT.ar[k] != null) return TEXT.ar[k];
    return k;
  }
  function e(s) { return UI.esc(s); }

  var SECTIONS = [
    { id: 'overview', icon: 'layers', label: 'secOverview', sub: 'subOverview', group: null },
    { id: 'freelancer-categories', icon: 'users', label: 'secFreelancerCategories', sub: 'subFreelancerCategories', group: 'groupManage' },
    { id: 'users', icon: 'users', label: 'secUsers', sub: 'subUsers', group: 'groupManage' },
    { id: 'trainers', icon: 'user', label: 'secTrainers', sub: 'subTrainers', group: 'groupManage' },
    { id: 'training-categories', icon: 'layers', label: 'secTrainingCategories', sub: 'subTrainingCategories', group: 'groupContent' },
    { id: 'workshops', icon: 'calendar', label: 'secWorkshops', sub: 'subWorkshops', group: 'groupContent' },
    { id: 'in-person-courses', icon: 'users', label: 'secInPersonCourses', sub: 'subInPersonCourses', group: 'groupContent' },
    { id: 'in-person-course-cohorts', icon: 'clipboard', label: 'secInPersonCourseCohorts', sub: 'subInPersonCourseCohorts', group: 'groupContent', hidden: true },
    { id: 'courses', icon: 'graduation-cap', label: 'secCourses', sub: 'subCourses', group: 'groupContent' },
    { id: 'projects', icon: 'folder', label: 'secProjects', sub: 'subProjects', group: 'groupContent' },
    { id: 'course-registration-requests', icon: 'clipboard', label: 'secCourseRegistrationRequests', sub: 'subCourseRegistrationRequests', group: 'groupOperations' },
    { id: 'subscriptions', icon: 'file-text', label: 'secSubscriptions', sub: 'subSubscriptions', group: 'groupOperations' },
    { id: 'referral-points', icon: 'award', label: 'secReferralPoints', sub: 'subReferralPoints', group: 'groupOperations' },
    { id: 'student-certificates', icon: 'award', label: 'secStudentCertificates', sub: 'subStudentCertificates', group: 'groupOperations' },
    { id: 'settings', icon: 'sliders', label: 'secSettings', sub: 'subSettings', group: 'groupSystem' }
  ];

  var regs = {};
  var handlers = {};
  var tblCfgs = {};
  var T = {};
  var focusKey = null;
  var focusPos = null;
  var searchTimer = null;
  var lastScrollY = window.scrollY || 0;
  var filterScrollDirection = 0;
  var filterScrollDistance = 0;
  var filterScrollLockUntil = 0;
  var tableFiltersCollapsed = false;

  function register(id, def) { regs[id] = def; }
  function on(act, fn) { handlers[act] = fn; }

  function ts(key) {
    if (!T[key]) T[key] = { q: '', page: 1, sort: null, dir: 1, filters: {}, sel: {} };
    return T[key];
  }

  function selIds(key) {
    var s = ts(key).sel;
    return Object.keys(s).filter(function (k) { return s[k]; });
  }

  function meta(id) {
    return SECTIONS.filter(function (s) { return s.id === id; })[0] || SECTIONS[0];
  }

  function dashboardEditorFromHash() {
    var match = (location.hash || '').replace(/^#\/?/, '').match(/^editor\/(course|in-person-course|in-person-workshop|online-workshop|workshop|project)\/(.+)$/);
    if (!match) return null;
    var id = match[2] === 'new' ? '' : match[2];
    try { id = id ? decodeURIComponent(id) : ''; } catch (error) { /* Keep malformed route values encoded. */ }
    return {
      type: match[1] === 'project' ? 'project' : 'course',
      inPerson: match[1] === 'in-person-course' ||
        match[1] === 'in-person-workshop' || match[1] === 'workshop',
      workshop: match[1] === 'in-person-workshop' ||
        match[1] === 'online-workshop' || match[1] === 'workshop',
      id: id,
      hash: location.hash
    };
  }

  function curSection() {
    var editor = dashboardEditorFromHash();
    if (editor) {
      if (editor.type !== 'course') return 'projects';
      if (editor.workshop) return 'workshops';
      return editor.inPerson ? 'in-person-courses' : 'courses';
    }
    var h = (location.hash || '').replace(/^#\/?/, '');
    if (h === 'certificate-creator') return 'student-certificates';
    if (h.indexOf('in-person-course-cohorts/') === 0) {
      return new URLSearchParams(h.split('?')[1] || '').get('from') === 'workshops'
        ? 'workshops'
        : 'in-person-course-cohorts';
    }
    if (h.indexOf('in-person-students/') === 0) return 'in-person-students';
    return regs[h] ? h : 'overview';
  }

  function navigate(id) {
    var targetHash = '#/' + id;
    if (location.hash === targetHash) { render(); return; }
    location.hash = targetHash;
  }

  function statusChip(status) {
    var map = {
      active: 'st-ok', published: 'st-ok',
      suspended: 'st-danger', draft: 'st-mute',
      paused: 'st-warn', archived: 'st-mute', pending: 'st-warn'
    };
    var label = { active: 'stActive', published: 'stPublished', suspended: 'stSuspended', draft: 'stDraft', paused: 'stPaused', archived: 'stArchived', pending: 'stPending' }[status] || 'stActive';
    return '<span class="st ' + (map[status] || 'st-brand') + '">' + e(t(label)) + '</span>';
  }

  function roleChip(role) {
    var label = { admin: 'roleAdmin', trainer: 'roleTrainer', moderator: 'roleModerator', student: 'roleStudent' }[role] || 'roleStudent';
    var cls = role === 'admin' ? '' : role === 'trainer' ? ' ok' : role === 'moderator' ? ' warn' : ' neutral';
    return '<span class="chip' + cls + '">' + e(t(label)) + '</span>';
  }

  function emptyBlock(cfg) {
    var em = cfg.empty || {};
    return UI.emptyState(em.icon || 'inbox', em.title || t('emptyTitle'), em.sub || t('emptySub'), em.action || '');
  }

  function tableView(cfg) {
    var st = ts(cfg.key);
    var rows = cfg.rows.slice();
    (cfg.filters || []).forEach(function (f) {
      var v = st.filters[f.k];
      if (!v) return;
      if (f.filterRow) {
        rows = rows.map(function (row) { return f.filterRow(row, v); }).filter(Boolean);
        return;
      }
      rows = rows.filter(function (r) {
        var value = f.val(r);
        return Array.isArray(value)
          ? value.some(function (item) { return String(item) === String(v); })
          : String(value) === String(v);
      });
    });
    if (st.q) {
      var q = st.q.toLowerCase();
      rows = rows.filter(function (r) { return String(cfg.search ? cfg.search(r) : '').toLowerCase().indexOf(q) >= 0; });
    }
    if (st.sort) {
      var col = cfg.columns.filter(function (c) { return c.k === st.sort; })[0];
      if (col && col.sortVal) {
        rows.sort(function (a, b) {
          var A = col.sortVal(a), B = col.sortVal(b);
          if (A == null) A = '';
          if (B == null) B = '';
          if (typeof A === 'number' && typeof B === 'number') return (A - B) * st.dir;
          return String(A).localeCompare(String(B), lang() === 'ar' ? 'ar' : 'en') * st.dir;
        });
      }
    }
    var total = rows.length;
    var size = Math.min(cfg.pageSize || 10, 10);
    var pages = Math.max(1, Math.ceil(total / size));
    if (st.page > pages) st.page = pages;
    if (st.page < 1) st.page = 1;
    var from = total ? (st.page - 1) * size + 1 : 0;
    var to = Math.min(total, st.page * size);
    return { rows: rows, pageRows: rows.slice((st.page - 1) * size, st.page * size), total: total, pages: pages, from: from, to: to };
  }

  function toolbarHTML(cfg, view) {
    var st = ts(cfg.key);
    var parts = [];
    if (cfg.search !== false) {
      parts.push(
        '<div class="tbl-search">' + UI.icon('search', 16) +
        '<input class="input" type="search" data-tq="' + cfg.key + '" data-focus="q:' + cfg.key + '" value="' + e(st.q) + '" placeholder="' + e(cfg.searchPh || t('searchPh')) + '" autocomplete="off">' +
        '</div>'
      );
    }
    (cfg.filters || []).forEach(function (f) {
      var cur = st.filters[f.k] || '';
      parts.push(
        '<select class="tbl-select" data-tkey="' + cfg.key + '" data-tfilter="' + f.k + '" aria-label="' + e(f.label) + '">' +
        '<option value="">' + e(f.label) + '</option>' +
        f.options.map(function (o) {
          return '<option value="' + e(o.v) + '"' + (String(cur) === String(o.v) ? ' selected' : '') + '>' + e(o.l) + '</option>';
        }).join('') +
        '</select>'
      );
    });
    parts.push(
      '<button type="button" class="tbl-filter-toggle" aria-label="' +
      e(lang() === 'ar' ? 'فتح البحث والفلاتر' : 'Open search and filters') +
      '" aria-expanded="true">' + UI.icon('search', 17) + '</button>'
    );
    parts.push('<div class="tbl-toolbar-scroll" aria-label="' + e(lang() === 'ar' ? 'تمرير الجدول أفقياً' : 'Scroll table horizontally') + '" hidden><div></div></div>');
    return '<div class="tbl-toolbar">' + parts.join('') + '</div>';
  }

  function syncTableFilterToolbars(root) {
    var toolbars = (root || document).querySelectorAll('.tbl-toolbar');
    Array.prototype.forEach.call(toolbars, function (toolbar) {
      toolbar.classList.toggle('is-collapsed', tableFiltersCollapsed);
      var toggle = toolbar.querySelector('.tbl-filter-toggle');
      if (toggle) toggle.setAttribute('aria-expanded', tableFiltersCollapsed ? 'false' : 'true');
    });
  }

  function tableActionsHTML(cfg) {
    var actions = [];
    if (cfg.exportable !== false) {
      actions.push('<button class="btn btn-ghost btn-sm" data-act="export" data-tkey="' + cfg.key + '">' + UI.icon('download', 15) + e(t('export')) + '</button>');
    }
    if (cfg.add) {
      var addCls = cfg.add.primary === false ? 'btn-soft' : 'btn-primary';
      if (cfg.add.url) {
        actions.push('<a class="btn ' + addCls + ' btn-sm" href="' + e(cfg.add.url) + '">' + UI.icon(cfg.add.icon || 'plus', 15) + e(cfg.add.label) + '</a>');
      } else {
        actions.push('<button class="btn ' + addCls + ' btn-sm" data-act="' + e(cfg.add.act) + '">' + UI.icon(cfg.add.icon || 'plus', 15) + e(cfg.add.label) + '</button>');
      }
    }
    return actions.length ? '<div class="tbl-actions">' + actions.join('') + '</div>' : '';
  }

  function bulkHTML(cfg, view) {
    var st = ts(cfg.key);
    var ids = selIds(cfg.key);
    if (!ids.length || !cfg.bulk || !cfg.bulk.length) return '';
    return '<div class="tbl-bulk">' +
      UI.icon('check-circle', 16) +
      '<span>' + ids.length + ' ' + e(t('selected')) + '</span>' +
      '<span class="spacer"></span>' +
      cfg.bulk.map(function (b) {
        return '<button class="btn btn-sm ' + (b.danger ? 'btn-danger' : 'btn-ghost') + '" data-act="' + e(b.act) + '" data-tkey="' + cfg.key + '">' +
          UI.icon(b.icon || 'pencil', 14) + e(b.label) + '</button>';
      }).join('') +
      '<button class="btn btn-sm btn-ghost" data-act="clear-sel" data-tkey="' + cfg.key + '">' + UI.icon('x', 14) + e(t('clearSel')) + '</button>' +
      '</div>';
  }

  function pagerHTML(cfg, view) {
    if (!view.total) return '';
    var st = ts(cfg.key);
    var btns = [];
    var p = st.page, n = view.pages;
    function b(num, label, cls) {
      return '<button class="' + (cls || '') + '" data-act="page" data-tkey="' + cfg.key + '" data-page="' + num + '"' + (num === p && !cls ? ' class="on"' : '') + '>' + label + '</button>';
    }
    btns.push('<button data-act="page" data-tkey="' + cfg.key + '" data-page="' + (p - 1) + '"' + (p <= 1 ? ' disabled' : '') + '>' + e(t('prev')) + '</button>');
    var nums = [];
    var i;
    for (i = 1; i <= n; i++) {
      if (i === 1 || i === n || Math.abs(i - p) <= 1) nums.push(i);
      else if (nums[nums.length - 1] !== '…') nums.push('…');
    }
    nums.forEach(function (num) {
      if (num === '…') { btns.push('<button disabled>…</button>'); return; }
      btns.push('<button class="' + (num === p ? 'on' : '') + '" data-act="page" data-tkey="' + cfg.key + '" data-page="' + num + '">' + num + '</button>');
    });
    btns.push('<button data-act="page" data-tkey="' + cfg.key + '" data-page="' + (p + 1) + '"' + (p >= n ? ' disabled' : '') + '>' + e(t('next')) + '</button>');
    return '<div class="tbl-foot">' +
      '<span>' + e(t('showing')) + ' <b>' + view.from + '–' + view.to + '</b> ' + e(t('of')) + ' <b>' + view.total + '</b></span>' +
      '<span class="spacer"></span>' +
      '<div class="pager">' + btns.join('') + '</div>' +
      '</div>';
  }

  function tableHTML(cfg) {
    tblCfgs[cfg.key] = cfg;
    var st = ts(cfg.key);
    st.sel = {};
    var view = tableView(cfg);
    var draggableRows = !!cfg.draggableRows &&
      !st.q &&
      !st.sort &&
      !Object.keys(st.filters).some(function (key) { return !!st.filters[key]; }) &&
      view.pageRows.length > 0;
    var head = cfg.columns.map(function (c) {
      var cls = (c.sortVal ? ' sortable' : '') + (c.cls ? ' ' + c.cls : '');
      var arrow = '';
      if (c.sortVal && st.sort === c.k) {
        arrow = '<span class="sort-ic" style="transform:rotate(' + (st.dir === 1 ? 180 : 0) + 'deg);display:inline-block">' + UI.icon('chevron-down', 13) + '</span>';
      }
      return '<th class="' + cls.trim() + '"' + (c.sortVal ? ' data-tkey="' + cfg.key + '" data-tsort="' + c.k + '"' : '') + (c.width ? ' style="width:' + c.width + '"' : '') + '>' + e(c.label) + arrow + '</th>';
    });

    var body;
    if (!view.pageRows.length) {
      body = '<tr><td class="empty-cell" colspan="' + head.length + '">' + emptyBlock(cfg) + '</td></tr>';
    } else {
      body = view.pageRows.map(function (r) {
        var id = cfg.id ? cfg.id(r) : null;
        var cells = cfg.columns.map(function (c) {
          return '<td class="' + (c.cls || '') + '">' + c.render(r) + '</td>';
        }).join('');
        var rowClasses = [];
        if (draggableRows) rowClasses.push('draggable-row');
        var rowAttrs = rowClasses.length ? ' class="' + rowClasses.join(' ') + '"' : '';
        if (draggableRows) {
          rowAttrs += ' data-row-id="' + e(id) + '" draggable="true"';
        }
        return '<tr' + rowAttrs + '>' + cells + '</tr>';
      }).join('');
    }

    return '<div class="tbl-card">' +
      toolbarHTML(cfg, view) +
      tableActionsHTML(cfg) +
      bulkHTML(cfg, view) +
      '<div class="tbl-wrap"><table class="adm-table" data-table-key="' + e(cfg.key) + '"><thead><tr>' + head.join('') + '</tr></thead><tbody>' + body + '</tbody></table></div>' +
      pagerHTML(cfg, view) +
      '</div>';
  }

  var adminOrderDrag = null;
  var adminOrderSaving = false;

  function adminOrderRows(tbody) {
    return Array.prototype.slice.call(tbody.querySelectorAll('tr[data-row-id]'));
  }

  document.addEventListener('dragstart', function (event) {
    var row = event.target.closest && event.target.closest(
      'table[data-table-key] tbody tr[draggable="true"][data-row-id]'
    );
    if (!row) return;
    var table = row.closest('table[data-table-key]');
    var key = table && table.getAttribute('data-table-key');
    var cfg = key && tblCfgs[key];
    if (!cfg || !cfg.reorderKind) return;
    if (adminOrderSaving) {
      event.preventDefault();
      return;
    }
    adminOrderDrag = {
      row: row,
      tbody: row.parentElement,
      key: key,
      originalIds: adminOrderRows(row.parentElement).map(function (item) {
        return item.getAttribute('data-row-id');
      })
    };
    row.classList.add('is-dragging');
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', row.getAttribute('data-row-id'));
    }
  });

  document.addEventListener('dragover', function (event) {
    if (!adminOrderDrag) return;
    var target = event.target.closest && event.target.closest(
      'table[data-table-key] tbody tr[draggable="true"][data-row-id]'
    );
    if (!target || target.parentElement !== adminOrderDrag.tbody) return;
    event.preventDefault();
    if (target === adminOrderDrag.row) return;
    var bounds = target.getBoundingClientRect();
    var after = event.clientY > bounds.top + bounds.height / 2;
    adminOrderDrag.tbody.insertBefore(
      adminOrderDrag.row,
      after ? target.nextElementSibling : target
    );
  });

  document.addEventListener('drop', function (event) {
    if (!adminOrderDrag) return;
    var table = event.target.closest && event.target.closest('table[data-table-key]');
    if (!table || table.querySelector('tbody') !== adminOrderDrag.tbody) return;
    event.preventDefault();
    var drag = adminOrderDrag;
    adminOrderDrag = null;
    drag.row.classList.remove('is-dragging');
    var pageIds = adminOrderRows(drag.tbody).map(function (row) {
      return row.getAttribute('data-row-id');
    });
    if (pageIds.join(',') === drag.originalIds.join(',')) return;

    var cfg = tblCfgs[drag.key];
    var state = ts(drag.key);
    var fullOrder = cfg.rows.map(function (item) {
      return String(cfg.id(item));
    });
    var pageSize = Math.min(cfg.pageSize || 10, 10);
    var pageStart = ((state.page || 1) - 1) * pageSize;
    fullOrder.splice.apply(fullOrder, [pageStart, pageIds.length].concat(pageIds));

    adminOrderSaving = true;
    table.classList.add('is-saving-order');
    fetch(SITE.u('adminDisplayOrder'), {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': window.CSRF_TOKEN || ''
      },
      body: JSON.stringify({ kind: cfg.reorderKind, order: fullOrder })
    }).then(function (response) {
      return response.json().then(function (data) {
        if (!response.ok || !data.ok) throw new Error(data.message || t('saveError'));
        cfg.rows.forEach(function (item) {
          var index = fullOrder.indexOf(String(cfg.id(item)));
          if (index >= 0) item.displayOrder = index;
        });
        Admin.render();
        UI.toast(t('updated'), 'success');
      });
    }).catch(function (error) {
      Admin.render();
      UI.toast(error.message || t('saveError'), 'error');
    }).then(function () {
      adminOrderSaving = false;
      var currentTable = document.querySelector(
        'table[data-table-key="' + drag.key + '"]'
      );
      if (currentTable) currentTable.classList.remove('is-saving-order');
    });
  });

  document.addEventListener('dragend', function () {
    if (!adminOrderDrag) return;
    adminOrderDrag.row.classList.remove('is-dragging');
    adminOrderDrag = null;
  });

  var tableRtlScrollModel = null;

  function getTableRtlScrollModel(element) {
    if (tableRtlScrollModel !== null) return tableRtlScrollModel;
    var previous = element.scrollLeft;
    element.scrollLeft = 0;
    element.scrollLeft = -1;
    if (element.scrollLeft < 0) tableRtlScrollModel = 'negative';
    else {
      element.scrollLeft = 1;
      tableRtlScrollModel = element.scrollLeft > 0 ? 'reverse' : 'default';
    }
    element.scrollLeft = previous;
    return tableRtlScrollModel;
  }

  function getTableScrollPosition(element) {
    var max = Math.max(0, element.scrollWidth - element.clientWidth);
    var position = element.scrollLeft;
    if (window.getComputedStyle(element).direction !== 'rtl') {
      return Math.max(0, Math.min(max, position));
    }
    var model = getTableRtlScrollModel(element);
    if (model === 'negative') position = -position;
    else if (model === 'default') position = max - position;
    return Math.max(0, Math.min(max, position));
  }

  function setTableScrollPosition(element, position) {
    var max = Math.max(0, element.scrollWidth - element.clientWidth);
    position = Math.max(0, Math.min(max, position));
    if (window.getComputedStyle(element).direction !== 'rtl') {
      element.scrollLeft = position;
      return;
    }
    var model = getTableRtlScrollModel(element);
    if (model === 'negative') element.scrollLeft = -position;
    else if (model === 'default') element.scrollLeft = max - position;
    else element.scrollLeft = position;
  }

  function syncTableScrollbars(root) {
    syncTableFilterToolbars(root);
    var cards = root.querySelectorAll('.tbl-card');
    Array.prototype.forEach.call(cards, function (card) {
      var tableWrap = card.querySelector('.tbl-wrap');
      var toolbarScrollbar = card.querySelector('.tbl-toolbar-scroll');
      var scrollbarContent = toolbarScrollbar && toolbarScrollbar.firstElementChild;
      var toolbar = card.querySelector('.tbl-toolbar');
      if (!tableWrap || !toolbarScrollbar || !scrollbarContent) return;
      function updateWidth() {
        var table = tableWrap.querySelector('.adm-table');
        var topbar = document.getElementById('admTop');
        var width = table ? table.scrollWidth : tableWrap.scrollWidth;
        var overflowing = width > tableWrap.clientWidth + 1;
        toolbarScrollbar.hidden = !overflowing;
        scrollbarContent.style.width = width + 'px';
        if (toolbar) {
          card.style.setProperty('--tbl-head-top', (topbar ? topbar.offsetHeight : 0) + 'px');
        }
        if (!overflowing && table) table.style.transform = '';
        else syncHorizontalPosition();
      }

      function syncHorizontalPosition() {
        var table = tableWrap.querySelector('.adm-table');
        if (!table) return;
        var rtl = window.getComputedStyle(toolbarScrollbar).direction === 'rtl';
        var position = getTableScrollPosition(toolbarScrollbar);
        table.style.transform = 'translateX(' + (rtl ? position : -position) + 'px)';
      }

      var touchStart = null;
      tableWrap.addEventListener('touchstart', function (event) {
        if (event.touches.length !== 1 || toolbarScrollbar.hidden) {
          touchStart = null;
          return;
        }
        var touch = event.touches[0];
        touchStart = {
          x: touch.clientX,
          y: touch.clientY,
          position: getTableScrollPosition(toolbarScrollbar),
          horizontal: false
        };
      }, { passive: true });
      tableWrap.addEventListener('touchmove', function (event) {
        if (!touchStart || event.touches.length !== 1) return;
        var touch = event.touches[0];
        var deltaX = touch.clientX - touchStart.x;
        var deltaY = touch.clientY - touchStart.y;
        if (!touchStart.horizontal && Math.abs(deltaX) > 8 &&
            Math.abs(deltaX) > Math.abs(deltaY)) {
          touchStart.horizontal = true;
        }
        if (!touchStart.horizontal) return;
        event.preventDefault();
        var rtl = window.getComputedStyle(toolbarScrollbar).direction === 'rtl';
        setTableScrollPosition(
          toolbarScrollbar,
          touchStart.position + (rtl ? deltaX : -deltaX)
        );
        syncHorizontalPosition();
      }, { passive: false });
      tableWrap.addEventListener('touchend', function () { touchStart = null; }, { passive: true });
      tableWrap.addEventListener('touchcancel', function () { touchStart = null; }, { passive: true });

      toolbarScrollbar.addEventListener('scroll', function () {
        syncHorizontalPosition();
      }, { passive: true });
      updateWidth();
      if (typeof ResizeObserver === 'function') {
        var observer = new ResizeObserver(updateWidth);
        observer.observe(tableWrap);
        if (toolbar) observer.observe(toolbar);
        var topbar = document.getElementById('admTop');
        if (topbar) observer.observe(topbar);
        var table = tableWrap.querySelector('.adm-table');
        if (table) observer.observe(table);
      } else {
        window.addEventListener('resize', updateWidth, { passive: true });
      }
    });
  }

  function csvExport(name, columns, rows) {
    var lines = [columns.map(function (c) { return c.label; })];
    rows.forEach(function (r) {
      lines.push(columns.map(function (c) {
        var v = c.csv ? c.csv(r) : (c.val ? c.val(r) : '');
        if (v == null) v = '';
        return String(v).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      }));
    });
    var csv = '﻿' + lines.map(function (row) {
      return row.map(function (cell) { return '"' + String(cell).replace(/"/g, '""') + '"'; }).join(',');
    }).join('\r\n');
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = name + '-' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 600);
  }

  function readJSON(el) {
    try { return el && el.value ? JSON.parse(el.value) : []; } catch (err) { return []; }
  }

  function tagChipHTML(text) {
    return '<span class="tag-chip" data-val="' + e(text) + '">' + e(text) +
      '<button type="button" class="tag-x" aria-label="' + e(t('cRemove')) + '">' + UI.icon('x', 12) + '</button></span>';
  }

  function tagsFieldHTML(f, arr) {
    return '<div class="tag-field" data-tag-field="' + f.k + '">' +
      '<div class="tag-chips">' + arr.map(tagChipHTML).join('') + '</div>' +
      '<input class="input" type="text" data-tag-input="' + f.k + '" placeholder="' + e(f.placeholder || t('tagsHint')) + '">' +
      '<input type="hidden" data-fk="' + f.k + '" value="' + e(JSON.stringify(arr)) + '">' +
      '</div>';
  }

  function galItemHTML(src, i) {
    return '<span class="gal-item"><img src="' + e(src) + '" alt="" loading="lazy" decoding="async">' +
      '<button type="button" class="gal-x" data-gal-del="1" data-i="' + i + '" aria-label="' + e(t('cRemove')) + '">' + UI.icon('x', 12) + '</button></span>';
  }

  function galleryFieldHTML(f, arr) {
    return '<div class="gal-field" data-gal-field="' + f.k + '">' +
      '<div class="gal-grid" data-gal-grid="' + f.k + '">' + arr.map(galItemHTML).join('') + '</div>' +
      '<button type="button" class="btn btn-ghost btn-sm" data-gal-add="' + f.k + '">' + UI.icon('upload', 14) + e(t('addImages')) + '</button>' +
      '<input type="hidden" data-fk="' + f.k + '" value="' + e(JSON.stringify(arr)) + '">' +
      '</div>';
  }

  function mediaItemHTML(item, i) {
    var inner = item && item.type === 'video'
      ? '<video src="' + e(item.src) + '" muted preload="none"></video>'
      : '<img src="' + e(item && item.src) + '" alt="" loading="lazy" decoding="async">';
    return '<span class="gal-item">' + inner +
      '<button type="button" class="gal-x" data-media-del="1" data-i="' + i + '" aria-label="' + e(t('cRemove')) + '">' + UI.icon('x', 12) + '</button></span>';
  }

  function mediaFieldHTML(f, arr) {
    return '<div class="gal-field" data-media-field="' + f.k + '">' +
      '<div class="gal-grid" data-media-grid="' + f.k + '">' + (arr || []).map(mediaItemHTML).join('') + '</div>' +
      '<button type="button" class="btn btn-ghost btn-sm" data-media-add="' + f.k + '">' + UI.icon('upload', 14) + e(t('addMedia')) + '</button>' +
      '<input type="hidden" data-fk="' + f.k + '" value="' + e(JSON.stringify(arr)) + '">' +
      '</div>';
  }

  function fileItemHTML(f, i) {
    return '<div class="file-item"><span class="file-ic">' + UI.icon('file-text', 16) + '</span>' +
      '<div class="file-meta"><b>' + e(f.name) + '</b><span>' + e(UI.fileSize(f.size || 0)) + '</span></div>' +
      '<button type="button" class="btn-icon danger" data-files-del="1" data-i="' + i + '" aria-label="' + e(t('cRemove')) + '">' + UI.icon('x', 15) + '</button></div>';
  }

  function filesFieldHTML(fk, arr) {
    return '<div class="files-field" data-files-field="' + fk + '">' +
      '<div class="files-list">' + (arr || []).map(fileItemHTML).join('') + '</div>' +
      '<button type="button" class="btn btn-ghost btn-sm" data-files-add="' + fk + '">' + UI.icon('upload', 14) + e(t('addFiles')) + '</button>' +
      '<input type="hidden" data-fk="' + fk + '" value="' + e(JSON.stringify(arr)) + '">' +
      '</div>';
  }

  function rteBtn(cmd, icon, label) {
    return '<button type="button" class="rte-b" data-rte-cmd="' + cmd + '" title="' + e(label) + '" aria-label="' + e(label) + '">' + UI.icon(icon, 15) + '</button>';
  }

  function richFieldHTML(f, val) {
    return '<div class="rte-field" data-rte-field="' + f.k + '">' +
      '<div class="rte-tools">' +
      rteBtn('bold', 'bold', t('rteBold')) +
      rteBtn('italic', 'italic', t('rteItalic')) +
      rteBtn('formatBlock:h2', 'heading', t('rteHead')) +
      rteBtn('insertUnorderedList', 'list', t('rteList')) +
      rteBtn('formatBlock:blockquote', 'quote', t('rteQuote')) +
      rteBtn('createLink', 'link', t('rteLink')) +
      '</div>' +
      '<div class="rte" contenteditable="true" data-rte="' + f.k + '">' + (val || '') + '</div>' +
      '</div>';
  }

  function fieldHTML(f) {
    var val = f.value == null ? '' : f.value;
    var ph = f.placeholder ? ' placeholder="' + e(f.placeholder) + '"' : '';
    var inner;
    if (f.type === 'section') {
      return '<div class="form-sec"><span>' + e(f.label) + '</span>' + (f.hint ? '<em>' + e(f.hint) + '</em>' : '') + '</div>';
    }
    if (f.type === 'info') {
      return '<div class="form-info">' + (f.html || '') + '</div>';
    }
    if (f.type === 'category-search') {
      var categorySearchId = f.k + '-search';
      var categoryResultsId = f.k + '-results';
      var selectedCategory = (f.options || []).filter(function (option) {
        return String(option.v) === String(val);
      })[0];
      return '<div class="field full online-invoice-search-field">' +
        '<label class="label" for="' + e(categorySearchId) + '">' + e(f.label) + '</label>' +
        '<div class="online-invoice-search-picker">' +
        '<input class="input" type="search" id="' + e(categorySearchId) +
        '" data-fk-search="' + e(f.k) + '" role="combobox" aria-autocomplete="list"' +
        ' aria-expanded="false" aria-controls="' + e(categoryResultsId) + '"' +
        ' autocomplete="off" placeholder="' + e(f.placeholder || '') +
        '" value="' + e(selectedCategory ? selectedCategory.l : '') + '">' +
        '<input type="hidden" data-fk="' + e(f.k) + '" value="' + e(val) + '">' +
        '<div class="online-invoice-search-results" id="' + e(categoryResultsId) +
        '" role="listbox" hidden></div></div></div>';
    }
    if (f.type === 'invoice-search') {
      var searchId = f.k + '-search';
      var resultsId = f.k + '-results';
      return '<div class="field full online-invoice-search-field">' +
        '<label class="label" for="' + e(searchId) + '">' + e(f.label) +
        (f.required ? ' <span class="req">*</span>' : '') + '</label>' +
        '<div class="online-invoice-search-picker">' +
        '<input class="input" type="search" id="' + e(searchId) +
        '" data-fk-search="' + e(f.k) + '" role="combobox" aria-autocomplete="list"' +
        ' aria-expanded="false" aria-controls="' + e(resultsId) + '"' +
        ' autocomplete="off" placeholder="' + e(f.placeholder || '') + '">' +
        '<input type="hidden" data-fk="' + e(f.k) + '" value="' + e(val) + '">' +
        '<div class="online-invoice-search-results" id="' + e(resultsId) +
        '" role="listbox" hidden></div></div>' +
        (f.required ? '<span class="hint error" data-validation-for="' + e(f.k) +
          '" aria-live="polite"></span>' : '') +
        (f.hint ? '<span class="hint">' + e(f.hint) + '</span>' : '') +
        '</div>';
    } else if (f.type === 'textarea') {
      inner = '<textarea class="textarea" rows="' + (f.rows || 3) + '" data-fk="' + f.k + '"' + ph +
        (f.readonly ? ' readonly' : '') + '>' + e(val) + '</textarea>';
    } else if (f.type === 'select') {
      inner = '<select class="select" data-fk="' + f.k + '">' + (f.options || []).map(function (o) {
        return '<option value="' + e(o.v) + '"' + (String(o.v) === String(val) ? ' selected' : '') + '>' + e(o.l) + '</option>';
      }).join('') + '</select>';
    } else if (f.type === 'number') {
      inner = '<input class="input" type="number" data-fk="' + f.k + '" value="' + e(val) + '"' + ph + (f.min != null ? ' min="' + f.min + '"' : '') + (f.max != null ? ' max="' + f.max + '"' : '') + (f.step != null ? ' step="' + f.step + '"' : '') + (f.readonly ? ' readonly' : '') + '>';
    } else if (f.type === 'date') {
      inner = '<input class="input" type="date" data-fk="' + f.k + '" value="' + e(val) + '">';
    } else if (f.type === 'switch') {
      return '<div class="switch-row"><div class="sw-t"><b>' + e(f.label) + '</b>' + (f.hint ? '<span>' + e(f.hint) + '</span>' : '') + '</div>' +
        '<label class="switch"><input type="checkbox" data-fk="' + f.k + '"' + (val ? ' checked' : '') + '><span class="track"></span></label></div>';
    } else if (f.type === 'image') {
      var src = val || StoreHelpers.grad('#1d4ed8', '#3b82f6', f.emoji || '⭐', 800, 500);
      inner = '<div class="image-pick">' +
        '<img class="ip-prev" data-img-prev="' + f.k + '" src="' + e(src) + '" alt="" loading="lazy" decoding="async">' +
        '<div class="ip-btns">' +
        '<button type="button" class="btn btn-ghost btn-sm" data-img-pick="' + f.k + '">' + UI.icon('upload', 14) + e(t('cUpload')) + '</button>' +
        '<button type="button" class="btn btn-ghost btn-sm" data-img-clear="' + f.k + '">' + UI.icon('trash', 14) + e(t('cRemove')) + '</button>' +
        '</div></div>' +
        '<input type="hidden" data-fk="' + f.k + '" value="' + e(val) + '">';
    } else if (f.type === 'tags') {
      inner = tagsFieldHTML(f, Array.isArray(val) ? val : (val ? String(val).split(',').map(function (x) { return x.trim(); }).filter(Boolean) : []));
    } else if (f.type === 'gallery') {
      inner = galleryFieldHTML(f, Array.isArray(val) ? val : []);
    } else if (f.type === 'media') {
      inner = mediaFieldHTML(f, Array.isArray(val) ? val : []);
    } else if (f.type === 'files') {
      inner = filesFieldHTML(f.k, Array.isArray(val) ? val : []);
    } else if (f.type === 'richtext') {
      inner = richFieldHTML(f, val);
    } else {
      var inputType = f.inputType || 'text';
      inner = '<input class="input" type="' + e(inputType) + '" data-fk="' + f.k + '" value="' + e(val) + '"' + ph +
        (f.dir ? ' dir="' + e(f.dir) + '"' : '') +
        (f.maxLength ? ' maxlength="' + f.maxLength + '"' : '') +
        (f.inputMode ? ' inputmode="' + e(f.inputMode) + '"' : '') +
        (f.autocomplete ? ' autocomplete="' + e(f.autocomplete) + '"' : '') +
        (f.pattern ? ' pattern="' + e(f.pattern) + '"' : '') +
        (f.readonly ? ' readonly' : '') +
        (f.required ? ' required' : '') +
        (f.numericOnly ? ' data-numeric-only="true"' : '') + '>';
    }
    var validationHint = f.required || f.validate
      ? '<span class="hint error" data-validation-for="' + f.k + '" aria-live="polite"></span>'
      : '';
    return '<div class="field' + (f.full ? ' full' : '') + '"><label class="label">' + e(f.label) + (f.required ? ' <span class="req">*</span>' : '') + '</label>' + inner +
      validationHint + (f.hint ? '<span class="hint">' + e(f.hint) + '</span>' : '') + '</div>';
  }

  function fieldsHTML(fields) {
    var out = '';
    var i = 0;
    while (i < fields.length) {
      var f = fields[i];
      if (f.type === 'switch') { out += fieldHTML(f); i++; continue; }
      var short = !f.full && ['text', 'select', 'date', 'number'].indexOf(f.type || 'text') >= 0;
      var next = fields[i + 1];
      var nextShort = next && next.type !== 'switch' && !next.full && ['text', 'select', 'date', 'number'].indexOf(next.type || 'text') >= 0;
      if (short && nextShort) {
        out += '<div class="field-row">' + fieldHTML(f) + fieldHTML(next) + '</div>';
        i += 2;
      } else {
        out += fieldHTML(f);
        i++;
      }
    }
    return out;
  }

  function formModal(opts) {
    var m = UI.modal({
      title: opts.title,
      size: opts.size || 'md',
      body: (opts.note ? '<div class="form-note">' + UI.icon('sparkles', 15) + '<span>' + e(opts.note) + '</span></div>' : '') + fieldsHTML(opts.fields || []),
      footer: '<button class="btn btn-ghost" data-fm="cancel">' + e(t('cancel')) + '</button>' +
        '<button class="btn btn-primary" data-fm="save">' + UI.icon('check', 15) + e(opts.submit || t('saveChanges')) + '</button>'
    });

    var validationFields = (opts.fields || []).filter(function (f) {
      return f.type !== 'section' && f.type !== 'info' && (f.required || f.validate);
    });

    function validateField(f) {
      var el = m.body.querySelector('[data-fk="' + f.k + '"]');
      if (!el) return true;
      var control = m.body.querySelector('[data-fk-search="' + f.k + '"]') || el;
      var value = String(el.value || '').trim();
      var message = f.required && !value ? t('fieldRequired') + ' — ' + f.label : '';
      if (!message && f.validate) message = f.validate(value) || '';
      var error = m.body.querySelector('[data-validation-for="' + f.k + '"]');
      if (error) error.textContent = message;
      control.classList.toggle('is-invalid', !!message);
      if (message) control.setAttribute('aria-invalid', 'true');
      else control.removeAttribute('aria-invalid');
      return !message;
    }

    validationFields.forEach(function (f) {
      var el = m.body.querySelector('[data-fk="' + f.k + '"]');
      if (!el) return;
      el.addEventListener('input', function () {
        if (el.getAttribute('data-numeric-only') === 'true') {
          var digits = el.value.replace(/[^0-9]/g, '').slice(0, Number(el.maxLength) || 10);
          if (digits !== el.value) el.value = digits;
        }
        validateField(f);
      });
      el.addEventListener('change', function () {
        validateField(f);
      });
      el.addEventListener('blur', function () {
        validateField(f);
      });
    });

    (opts.fields || []).filter(function (field) {
      return field.type === 'category-search';
    }).forEach(function (field) {
      var input = m.body.querySelector('[data-fk-search="' + field.k + '"]');
      var value = m.body.querySelector('[data-fk="' + field.k + '"]');
      var results = m.body.querySelector('#' + field.k + '-results');
      var activeIndex = -1;
      if (!input || !value || !results) return;

      function normalize(value) {
        return String(value || '').toLocaleLowerCase()
          .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
          .replace(/[أإآ]/g, 'ا')
          .replace(/ى/g, 'ي')
          .replace(/ة/g, 'ه')
          .trim();
      }

      function closeResults() {
        results.hidden = true;
        input.setAttribute('aria-expanded', 'false');
        input.removeAttribute('aria-activedescendant');
        activeIndex = -1;
      }

      function renderResults(query) {
        var normalizedQuery = normalize(query);
        var queryWords = normalizedQuery ? normalizedQuery.split(/\s+/) : [];
        var options = (field.options || []).filter(function (option) {
          var searchable = normalize(option.l);
          return queryWords.every(function (word) {
            return searchable.indexOf(word) !== -1;
          });
        });
        results.innerHTML = options.length
          ? options.map(function (option, index) {
            return '<button class="online-invoice-search-option" type="button" role="option"' +
              ' id="' + e(field.k) + '-option-' + index + '" aria-selected="' +
              (String(option.v) === String(value.value) ? 'true' : 'false') +
              '" data-category-option="' + e(field.k) + '" data-option-value="' +
              e(option.v) + '" data-option-label="' + e(option.l) + '">' +
              e(option.l || (I18n.getLang() === 'en' ? 'No specialization' : 'بدون تخصص')) +
              '</button>';
          }).join('')
          : '<div class="online-invoice-search-empty" role="presentation">' +
            e(I18n.getLang() === 'en' ? 'No matching categories' : 'لا توجد فئات مطابقة') +
            '</div>';
        results.hidden = false;
        input.setAttribute('aria-expanded', 'true');
        activeIndex = -1;
      }

      input.addEventListener('focus', function () {
        renderResults(input.value);
      });
      input.addEventListener('input', function () {
        value.value = '';
        renderResults(input.value);
      });
      input.addEventListener('keydown', function (event) {
        var options = results.querySelectorAll('[data-category-option]');
        if (event.key === 'Escape') {
          closeResults();
          var selected = (field.options || []).filter(function (option) {
            return String(option.v) === String(value.value);
          })[0];
          input.value = selected ? selected.l : '';
          return;
        }
        if (!options.length || (event.key !== 'ArrowDown' && event.key !== 'ArrowUp')) {
          if (event.key === 'Enter' && activeIndex >= 0 && options[activeIndex]) {
            event.preventDefault();
            options[activeIndex].click();
          }
          return;
        }
        event.preventDefault();
        activeIndex = event.key === 'ArrowDown'
          ? (activeIndex + 1) % options.length
          : (activeIndex - 1 + options.length) % options.length;
        Array.prototype.forEach.call(options, function (option, index) {
          option.classList.toggle('is-active', index === activeIndex);
        });
        input.setAttribute('aria-activedescendant', options[activeIndex].id);
      });
      results.addEventListener('mousedown', function (event) {
        if (event.target.closest('[data-category-option]')) event.preventDefault();
      });
      results.addEventListener('click', function (event) {
        var option = event.target.closest('[data-category-option]');
        if (!option || option.getAttribute('data-category-option') !== field.k) return;
        value.value = option.getAttribute('data-option-value');
        input.value = option.getAttribute('data-option-label');
        closeResults();
        value.dispatchEvent(new Event('change', { bubbles: true }));
      });
      input.addEventListener('blur', function () {
        window.setTimeout(function () {
          if (results.contains(document.activeElement)) return;
          closeResults();
          var selected = (field.options || []).filter(function (option) {
            return String(option.v) === String(value.value);
          })[0];
          input.value = selected ? selected.l : '';
        }, 0);
      });
    });

    function syncHidden(fieldEl, fk, arr) {
      var hidden = fieldEl.querySelector('[data-fk="' + fk + '"]');
      if (hidden) hidden.value = JSON.stringify(arr);
    }

    function pickImages(cb) {
      var inp = document.createElement('input');
      inp.type = 'file'; inp.accept = 'image/*'; inp.multiple = true;
      inp.addEventListener('change', function () {
        var files = Array.prototype.slice.call(inp.files || []);
        if (!files.length) return;
        Promise.all(files.map(function (fl) { return UI.compressImage(fl, 1200, 0.8); })).then(cb);
      });
      inp.click();
    }

    function pickMedia(field, fk) {
      var inp = document.createElement('input');
      inp.type = 'file'; inp.accept = 'image/*,video/*'; inp.multiple = true;
      inp.addEventListener('change', function () {
        var files = Array.prototype.slice.call(inp.files || []);
        if (!files.length) return;
        var jobs = files.map(function (fl) {
          if (fl.type.indexOf('video') === 0) {
            if (fl.size > 2000000) { UI.toast(t('mediaTooBig'), 'error'); return Promise.resolve(null); }
            return new Promise(function (res) {
              var r = new FileReader();
              r.onload = function () { res({ type: 'video', src: r.result }); };
              r.onerror = function () { res(null); };
              r.readAsDataURL(fl);
            });
          }
          return UI.compressImage(fl, 1200, 0.8).then(function (src) { return { type: 'image', src: src }; });
        });
        Promise.all(jobs).then(function (list) {
          var arr = readJSON(field.querySelector('[data-fk="' + fk + '"]'));
          list.filter(Boolean).forEach(function (item) { arr.push(item); });
          syncHidden(field, fk, arr);
          field.querySelector('[data-media-grid]').innerHTML = arr.map(mediaItemHTML).join('');
        });
      });
      inp.click();
    }

    function pickFiles(cb) {
      var inp = document.createElement('input');
      inp.type = 'file'; inp.multiple = true;
      inp.addEventListener('change', function () {
        var files = Array.prototype.slice.call(inp.files || []);
        if (!files.length) return;
        Promise.all(files.map(function (fl) {
          return new Promise(function (res) {
            var base = { id: Store.uid('f'), name: fl.name, size: fl.size, type: fl.type, dataUrl: '' };
            if (fl.size <= 400000) {
              var r = new FileReader();
              r.onload = function () { base.dataUrl = r.result; res(base); };
              r.onerror = function () { res(base); };
              r.readAsDataURL(fl);
            } else res(base);
          });
        })).then(cb);
      });
      inp.click();
    }

    m.body.addEventListener('click', function (ev) {
      var pick = ev.target.closest('[data-img-pick]');
      if (pick) {
        var k = pick.getAttribute('data-img-pick');
        pickImages(function (list) {
          var hidden = m.body.querySelector('[data-fk="' + k + '"]');
          var img = m.body.querySelector('[data-img-prev="' + k + '"]');
          if (hidden) hidden.value = list[0] || '';
          if (img && list[0]) img.src = list[0];
        });
        return;
      }
      var clear = ev.target.closest('[data-img-clear]');
      if (clear) {
        var k2 = clear.getAttribute('data-img-clear');
        var hidden2 = m.body.querySelector('[data-fk="' + k2 + '"]');
        var img2 = m.body.querySelector('[data-img-prev="' + k2 + '"]');
        if (hidden2) hidden2.value = '';
        if (img2) img2.src = StoreHelpers.grad('#1d4ed8', '#3b82f6', '⭐', 800, 500);
        return;
      }

      var rte = ev.target.closest('[data-rte-cmd]');
      if (rte) {
        ev.preventDefault();
        var area = rte.closest('.rte-field').querySelector('[data-rte]');
        if (!area) return;
        area.focus();
        var cmd = rte.getAttribute('data-rte-cmd');
        var parts = cmd.split(':');
        if (parts[0] === 'createLink') {
          var url = window.prompt(t('rteLink'), 'https://');
          if (url) document.execCommand('createLink', false, url);
        } else if (parts.length > 1) {
          document.execCommand(parts[0], false, parts[1]);
        } else {
          document.execCommand(cmd, false, null);
        }
        return;
      }

      var ink = ev.target.closest('.tag-x');
      if (ink) {
        var tfield = ink.closest('.tag-field');
        ink.closest('.tag-chip').remove();
        syncHidden(tfield, tfield.getAttribute('data-tag-field'), Array.prototype.map.call(tfield.querySelectorAll('.tag-chip'), function (c) { return c.getAttribute('data-val'); }));
        return;
      }

      var galAdd = ev.target.closest('[data-gal-add]');
      if (galAdd) {
        var gk = galAdd.getAttribute('data-gal-add');
        var gfield = galAdd.closest('.gal-field');
        pickImages(function (list) {
          var arr = readJSON(gfield.querySelector('[data-fk="' + gk + '"]'));
          list.forEach(function (src) { arr.push(src); });
          syncHidden(gfield, gk, arr);
          gfield.querySelector('[data-gal-grid]').innerHTML = arr.map(galItemHTML).join('');
        });
        return;
      }
      var galDel = ev.target.closest('[data-gal-del]');
      if (galDel) {
        var gfield2 = galDel.closest('.gal-field');
        var gk2 = gfield2.getAttribute('data-gal-field');
        var arr2 = readJSON(gfield2.querySelector('[data-fk="' + gk2 + '"]'));
        arr2.splice(Number(galDel.getAttribute('data-i')), 1);
        syncHidden(gfield2, gk2, arr2);
        gfield2.querySelector('[data-gal-grid]').innerHTML = arr2.map(galItemHTML).join('');
        return;
      }

      var medAdd = ev.target.closest('[data-media-add]');
      if (medAdd) {
        pickMedia(medAdd.closest('.gal-field'), medAdd.getAttribute('data-media-add'));
        return;
      }
      var medDel = ev.target.closest('[data-media-del]');
      if (medDel) {
        var mfield = medDel.closest('.gal-field');
        var mk = mfield.getAttribute('data-media-field');
        var arr3 = readJSON(mfield.querySelector('[data-fk="' + mk + '"]'));
        arr3.splice(Number(medDel.getAttribute('data-i')), 1);
        syncHidden(mfield, mk, arr3);
        mfield.querySelector('[data-media-grid]').innerHTML = arr3.map(mediaItemHTML).join('');
        return;
      }

      var fileAdd = ev.target.closest('[data-files-add]');
      if (fileAdd) {
        var fk = fileAdd.getAttribute('data-files-add');
        var ffield = fileAdd.closest('.files-field');
        pickFiles(function (list) {
          var arr = readJSON(ffield.querySelector('[data-fk="' + fk + '"]'));
          list.forEach(function (item) { arr.push(item); });
          syncHidden(ffield, fk, arr);
          ffield.querySelector('.files-list').innerHTML = arr.map(fileItemHTML).join('');
        });
        return;
      }
      var fileDel = ev.target.closest('[data-files-del]');
      if (fileDel) {
        var ffield2 = fileDel.closest('.files-field');
        var fk2 = ffield2.getAttribute('data-files-field');
        var arr4 = readJSON(ffield2.querySelector('[data-fk="' + fk2 + '"]'));
        arr4.splice(Number(fileDel.getAttribute('data-i')), 1);
        syncHidden(ffield2, fk2, arr4);
        ffield2.querySelector('.files-list').innerHTML = arr4.map(fileItemHTML).join('');
      }
    });

    m.body.querySelectorAll('[data-tag-input]').forEach(function (input) {
      var tk = input.getAttribute('data-tag-input');
      var field = input.closest('.tag-field');
      function store() {
        syncHidden(field, tk, Array.prototype.map.call(field.querySelectorAll('.tag-chip'), function (c) { return c.getAttribute('data-val'); }));
      }
      input.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter' || ev.key === ',') {
          ev.preventDefault();
          var v = input.value.trim().replace(/,+$/, '');
          if (!v) return;
          field.querySelector('.tag-chips').insertAdjacentHTML('beforeend', tagChipHTML(v));
          input.value = '';
          store();
        } else if (ev.key === 'Backspace' && !input.value) {
          var chips = field.querySelectorAll('.tag-chip');
          if (chips.length) { chips[chips.length - 1].remove(); store(); }
        }
      });
    });

    m.el.querySelector('[data-fm="cancel"]').addEventListener('click', m.close);
    m.el.querySelector('[data-fm="save"]').addEventListener('click', function () {
      var values = {};
      var ARRAY = { tags: 1, gallery: 1, files: 1, media: 1 };
      (opts.fields || []).forEach(function (f) {
        if (f.type === 'section' || f.type === 'info') return;
        if (f.type === 'richtext') {
          var area = m.body.querySelector('[data-rte="' + f.k + '"]');
          values[f.k] = area ? area.innerHTML.trim() : '';
          return;
        }
        var el = m.body.querySelector('[data-fk="' + f.k + '"]');
        if (!el) return;
        if (f.type === 'switch') values[f.k] = el.checked;
        else if (f.type === 'number') values[f.k] = el.value === '' ? '' : Number(el.value);
        else if (ARRAY[f.type]) { try { values[f.k] = el.value ? JSON.parse(el.value) : []; } catch (err) { values[f.k] = []; } }
        else values[f.k] = String(el.value || '').trim();
      });
      var missing = (opts.fields || []).filter(function (f) {
        if (f.type === 'section' || f.type === 'info') return false;
        var v = values[f.k];
        if (ARRAY[f.type]) return f.required && (!v || !v.length);
        return f.required && !v;
      })[0];
      if (missing) {
        UI.toast(t('fieldRequired') + ' — ' + missing.label, 'error');
        var mel = m.body.querySelector('[data-fk="' + missing.k + '"]');
        validateField(missing);
        var missingControl = m.body.querySelector('[data-fk-search="' + missing.k + '"]') || mel;
        if (missingControl && missingControl.focus) missingControl.focus();
        return;
      }
      var invalid = validationFields.filter(function (f) { return !validateField(f); })[0];
      if (invalid) {
        var invalidEl = m.body.querySelector('[data-fk-search="' + invalid.k + '"]') ||
          m.body.querySelector('[data-fk="' + invalid.k + '"]');
        if (invalidEl && invalidEl.focus) invalidEl.focus();
        return;
      }
      var res = opts.onSubmit ? opts.onSubmit(values, m) : null;
      if (res !== false) m.close();
    });

    setTimeout(function () {
      var first = m.body.querySelector('[data-fk-search]') ||
        m.body.querySelector('[data-fk]:not([type="hidden"])');
      if (first && first.focus) first.focus();
    }, 60);
    return m;
  }

  function sideHTML() {
    var s = AdminData.stats();
    var counts = {
      users: s.users, trainers: s.trainers, courses: s.courses,
      lessons: s.lessons, projects: s.projects, dailies: s.dailies
    };
    counts['in-person-courses'] = Store.collection('certificates').filter(function (course) {
      return course.courseType === 'in_person';
    }).length;
    counts['in-person-students'] = AdminData.courseRegistrationRequests().filter(function (registration) {
      return registration.status === 'accepted';
    }).length;
    counts['referral-points'] = Store.collection('users').filter(function (user) {
      return user.role === 'student' && Number(user.referralPoints) > 0;
    }).length;
    counts.subscriptions = AdminData.courseRegistrationRequests().filter(function (request) {
      return request.status === 'accepted';
    }).length + AdminData.onlineCourseInvoices().length;
    counts['online-course-invoices'] = AdminData.onlineCourseInvoices().length;
    var cur = curSection();
    var html = '<a class="adm-brand" href="' + SITE.u('landing') + '">' +
      '<img src="' + SITE.assets('images/logo.svg') + '" alt="">' +
      '<span class="bt"><b>' + e(t('brandTitle')) + '</b><span>' + e(t('brandSub')) + '</span></span>' +
      '</a>';
    var lastGroup = '__start__';
    html += '<nav class="adm-nav">';
    SECTIONS.forEach(function (sec) {
      if (sec.hidden) return;
      if (sec.group && sec.group !== lastGroup) {
        html += '<div class="adm-sec-label">' + e(t(sec.group)) + '</div>';
      }
      if (!sec.group && lastGroup !== '__start__') {
        html += '<div class="adm-sec-label">' + e(t('secOverview')) + '</div>';
      }
      lastGroup = sec.group || '__none__';
      var count = counts[sec.id];
      html += '<a class="adm-link' + (cur === sec.id ? ' on' : '') + '" href="#/' + sec.id + '" data-sec="' + sec.id + '">' +
        UI.icon(sec.icon, 18) + '<span>' + e(t(sec.label)) + '</span>' +
        (count != null ? '<span class="adm-link-count">' + count + '</span>' : '') +
        '</a>';
    });
    html += '</nav>';
    var prof = Store.state.profile;
    var currentAdminName = JSON.parse(
      document.getElementById('admin-current-user-name').textContent
    );
    html += '<div class="adm-side-foot">' +
      UI.avatarOf(prof, 38) +
      '<span class="who"><b>' + e(currentAdminName) + '</b><span>' + e(t('adminRole')) + '</span></span>' +
      '</div>';
    return html;
  }

  function topHTML() {
    var m = meta(curSection());
    var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    return '<button class="btn-icon adm-burger" data-act="burger" aria-label="' + e(t('menu')) + '">' + UI.icon('sliders', 19) + '</button>' +
      '<div class="titles"><h1>' + UI.icon(m.icon, 19) + e(t(m.label)) + '</h1><p>' + e(t(m.sub)) + '</p></div>' +
      '<span class="spacer"></span>' +
      '<button class="btn-icon" id="headerThemeBtn" title="' + (isDark ? 'تفعيل المظهر الفاتح' : 'تفعيل المظهر الداكن') + '" aria-label="' + (isDark ? 'تفعيل المظهر الفاتح' : 'تفعيل المظهر الداكن') + '">' + UI.icon(isDark ? 'sun' : 'moon', 18) + '</button>' +
      '<form method="post" action="' + e(SITE.u('logout')) + '" style="margin:0">' +
      '<input type="hidden" name="csrfmiddlewaretoken" value="' + e(window.CSRF_TOKEN || '') + '">' +
      '<button class="btn-icon" type="submit" title="' + e(t('logout')) + '" aria-label="' + e(t('logout')) + '">' + UI.icon('log-out', 18) + '</button></form>' +
      '<a class="btn btn-soft btn-sm hide-sm" href="' + SITE.u('landing') + '">' + UI.icon('external-link', 15) + e(t('viewSite')) + '</a>';
  }

  function restoreFocus() {
    if (!focusKey) return;
    var el = document.querySelector('[data-focus="' + focusKey + '"]');
    focusKey = null;
    if (!el) return;
    el.focus();
    if (focusPos != null && el.setSelectionRange) {
      try { el.setSelectionRange(focusPos, focusPos); } catch (err) { /* ignore */ }
    }
    focusPos = null;
  }

  function render() {
    renderSide();
    renderTop();
    renderContent();
  }

  function renderSide() {
    var host = document.getElementById('admSide');
    if (!host) return;
    var nav = host.querySelector('.adm-nav');
    var scrollTop = nav ? nav.scrollTop : 0;
    host.innerHTML = sideHTML();
    nav = host.querySelector('.adm-nav');
    if (nav) nav.scrollTop = scrollTop;
  }

  function renderTop() {
    var host = document.getElementById('admTop');
    if (host) host.innerHTML = topHTML();
  }

  function renderContent() {
    if (preserveAdminDashboardEditor) return;
    var editorRoute = dashboardEditorFromHash();
    if (editorRoute) {
      renderDashboardEditor(editorRoute);
      return;
    }
    if ((location.hash || '').replace(/^#\/?/, '') === 'certificate-creator') {
      var certificateHost = document.getElementById('admContent');
      if (!certificateHost) return;
      certificateHost.innerHTML =
        '<div class="adm-certificate-creator-toolbar">' +
        '<button type="button" class="btn btn-soft btn-sm" data-act="certificate-list">' +
        UI.icon('arrow-right', 15) + e(t('certificateBackToList')) + '</button></div>' +
        '<iframe class="adm-certificate-creator-frame" src="' +
        e(SITE.assets('html/certificate-creator.html')) + '" title="' +
        e(t('certificateAdd')) + '" loading="lazy"></iframe>';
      var certificateFrame = certificateHost.querySelector('.adm-certificate-creator-frame');
      if (certificateFrame) {
        certificateFrame.addEventListener('load', function () {
          var frameWindow = certificateFrame.contentWindow;
          var frameBody = certificateFrame.contentDocument.body;
          function fitCertificateFrame() {
            var height = Math.ceil(frameBody.scrollHeight) + 4;
            if (certificateFrame.offsetHeight !== height) certificateFrame.style.height = height + 'px';
          }
          fitCertificateFrame();
          frameWindow.addEventListener('resize', fitCertificateFrame);
          if (typeof ResizeObserver === 'function') {
            var observer = new ResizeObserver(fitCertificateFrame);
            observer.observe(frameBody);
          }
        });
      }
      document.title = t('certificateAdd') + ' — ' + t('brandTitle');
      return;
    }
    var id = curSection();
    var route = (location.hash || '').replace(/^#\/?/, '');
    var contentId = route.split('?')[0].indexOf('in-person-course-cohorts/') === 0
      ? 'in-person-course-cohorts'
      : id;
    var def = regs[contentId];
    var host = document.getElementById('admContent');
    if (!def || !host) return;
    host.innerHTML = def.render();
    if (def.wire) def.wire(host);
    syncTableScrollbars(host);
    document.title = t(meta(id).label) + ' — ' + t('brandTitle');
    restoreFocus();
  }

  function renderDashboardEditor(route) {
    if (dashboardEditorMounted && dashboardEditorRoute === route.hash) return;
    if (loadingDashboardEditor === route.hash) return;

    var host = document.getElementById('admContent');
    if (!host) return;
    var urlKey = route.type === 'course'
      ? (route.id ? 'adminCourseEditorEdit' : 'adminCourseEditorCreate')
      : (route.id ? 'adminProjectEditorEdit' : 'adminProjectEditorCreate');
    var url = route.id ? SITE.u(urlKey, route.id) : SITE.u(urlKey);
    loadingDashboardEditor = route.hash;
    host.innerHTML = '<div class="adm-loading" role="status" aria-label="' + e(I18n.t('loading')) + '"><span class="adm-loading-spinner" aria-hidden="true"></span></div>';

    fetch(url, { credentials: 'same-origin', headers: { 'X-Requested-With': 'XMLHttpRequest' } })
      .then(function (response) {
        if (!response.ok) throw new Error('تعذر تحميل محرر ' + (route.type === 'course' ? 'الدورة.' : 'المشروع.'));
        return response.text();
      })
      .then(function (html) {
        if (location.hash !== route.hash) return;
        var parsed = new DOMParser().parseFromString(html, 'text/html');
        var editorContent = parsed.body;
        if (!editorContent || !editorContent.querySelector('#edTitle')) {
          throw new Error('استجابة محرر لوحة التحكم غير مكتملة.');
        }
        if (route.type === 'project') {
          var projectGalleryBox = editorContent.querySelector('#edProjectGalleryBox');
          if (!projectGalleryBox || !projectGalleryBox.querySelector('#edProjectGalleryInput')) {
            throw new Error('معرض صور المشروع غير موجود في المحرر.');
          }
          projectGalleryBox.hidden = false;
        }
        if (route.type === 'course' && !route.inPerson && !route.workshop) {
          var courseTypeField = editorContent.querySelector('#edCourseTypeField');
          if (courseTypeField) courseTypeField.remove();
        }
        if (route.type === 'course' && route.workshop) {
          var workshopTypeField = editorContent.querySelector('#edCourseTypeField');
          var workshopTypeInput = editorContent.querySelector('#edCourseType');
          var workshopKindField = editorContent.querySelector('#edInPersonKindField');
          var workshopKindInput = editorContent.querySelector('#edInPersonKind');
          if (workshopTypeField && workshopTypeInput) {
            workshopTypeField.parentNode.insertBefore(workshopTypeInput, workshopTypeField);
            workshopTypeField.remove();
          }
          if (workshopKindField && workshopKindInput && !route.inPerson) {
            workshopKindField.parentNode.insertBefore(workshopKindInput, workshopKindField);
            workshopKindField.remove();
          }
          if (workshopTypeInput) {
            workshopTypeInput.value = route.inPerson ? 'in_person' : 'online';
          }
          if (workshopKindInput && !route.inPerson) workshopKindInput.value = 'workshop';
        }
        host.innerHTML = editorContent.innerHTML;
        document.body.setAttribute('data-page', route.type === 'course' ? 'edit-course' : 'edit-project');
        document.body.setAttribute('data-admin-dashboard-editor', 'true');
        document.body.setAttribute(route.type === 'course' ? 'data-admin-course-editor' : 'data-admin-project-editor', 'true');
        if (route.workshop) {
          document.body.setAttribute('data-admin-in-person-workshop-editor', 'true');
        } else {
          document.body.removeAttribute('data-admin-in-person-workshop-editor');
        }
        document.title = parsed.title || document.title;
        dashboardEditorMounted = true;
        dashboardEditorRoute = route.hash;
        if (!window.ContentEditor || typeof window.ContentEditor.mount !== 'function') {
          throw new Error('محرر لوحة التحكم غير جاهز.');
        }
        window.ContentEditor.mount(
          route.type === 'course' ? 'edit-course' : 'edit-project',
          route.id,
          route.inPerson ? 'in_person' : '',
          route.workshop ? 'workshop' : ''
        );
      })
      .catch(function (error) {
        if (location.hash !== route.hash) return;
        host.innerHTML = '<div class="adm-empty-error" role="alert">' + e(error.message || 'تعذر تحميل المحرر.') + '</div>';
        UI.toast(error.message || 'تعذر تحميل المحرر.', 'error');
      })
      .then(function () {
        if (loadingDashboardEditor === route.hash) loadingDashboardEditor = '';
      });
  }

  function handleDashboardHashChange() {
    if (ignoreDashboardHashChange) {
      ignoreDashboardHashChange = false;
      return;
    }
    preserveAdminDashboardEditor = false;
    if (handlingDashboardHashChange) return;

    if (dashboardEditorMounted && dashboardEditorRoute !== location.hash) {
      var previousHash = dashboardEditorRoute || '#/overview';
      var nextHash = location.hash;
      handlingDashboardHashChange = true;
      Promise.resolve(dashboardEditorLeaveHandler ? dashboardEditorLeaveHandler(nextHash) : true)
        .then(function (canLeave) {
          handlingDashboardHashChange = false;
          if (!canLeave) {
            ignoreDashboardHashChange = true;
            location.hash = previousHash;
            return;
          }
          dashboardEditorMounted = false;
          dashboardEditorRoute = '';
          document.body.setAttribute('data-page', 'admin');
          document.body.removeAttribute('data-admin-dashboard-editor');
          document.body.removeAttribute('data-admin-course-editor');
          document.body.removeAttribute('data-admin-project-editor');
          document.body.removeAttribute('data-admin-in-person-workshop-editor');
          document.body.classList.remove('course-editor-flow');
          dashboardEditorLeaveHandler = null;
          render();
        })
        .catch(function (error) {
          handlingDashboardHashChange = false;
          UI.toast(error.message || 'تعذر مغادرة المحرر.', 'error');
          ignoreDashboardHashChange = true;
          location.hash = previousHash;
        });
      return;
    }
    render();
  }

  function openSide() {
    document.getElementById('admSide').classList.add('open');
    document.getElementById('admScrim').hidden = false;
  }

  function closeSide() {
    var side = document.getElementById('admSide');
    if (side) side.classList.remove('open');
    var scrim = document.getElementById('admScrim');
    if (scrim) scrim.hidden = true;
  }

  function overviewHTML() {
    var s = AdminData.stats();
    var st = Store.state;
    var siteVisitCount = 0;
    var siteVisitData = document.getElementById('admin-site-visit-count');
    if (siteVisitData) {
      try { siteVisitCount = Number(JSON.parse(siteVisitData.textContent)) || 0; } catch (err) { siteVisitCount = 0; }
    }
    var cards = [
      { icon: 'users', v: s.users, l: t('statUsers'), go: 'users', sub: s.activeUsers + ' ' + t('statActive'), cls: '' },
      { icon: 'user', v: s.trainers, l: t('statTrainers'), go: 'trainers', cls: 'ok' },
      { icon: 'graduation-cap', v: s.courses, l: t('statCourses'), go: 'courses', cls: '' },
      { icon: 'folder', v: s.projects, l: t('statProjects'), go: 'projects', cls: 'ok' },
      { icon: 'heart', v: s.likes, l: t('statLikes'), go: 'projects', cls: 'pink' },
      { icon: 'eye', v: siteVisitCount.toLocaleString(lang() === 'ar' ? 'ar' : 'en'), l: t('statSiteVisits'), cls: 'ok' }
    ];

    var statHTML = '<div class="adm-grid stat-grid">' + cards.map(function (c) {
      return '<div class="stat-card">' +
        '<span class="sic ' + c.cls + '">' + UI.icon(c.icon, 21) + '</span>' +
        '<div><div class="sv">' + c.v + '</div><div class="sl">' + e(c.l) + (c.sub ? ' · ' + e(c.sub) : '') + '</div></div>' +
        (c.go ? '<button class="sgo" data-act="go-sec" data-sec="' + c.go + '">' + e(t('sec' + c.go.charAt(0).toUpperCase() + c.go.slice(1))) + UI.icon('chevron-left', 13) + '</button>' : '') +
        '</div>';
    }).join('') + '</div>';

    var months = AdminData.growth(6);
    var max = 1;
    months.forEach(function (m) { max = Math.max(max, m.courses, m.projects, m.dailies); });
    var loc = lang() === 'ar' ? 'ar' : 'en';
    var bars = months.map(function (m) {
      function h(v) { return Math.max(3, Math.round((v / max) * 100)); }
      var lbl;
      try { lbl = new Date(m.y, m.m, 1).toLocaleDateString(loc, { month: 'short' }); }
      catch (err) { lbl = (m.m + 1) + '/' + String(m.y).slice(2); }
      return '<div class="bar-group">' +
        '<div class="bar-stack">' +
        '<i class="bar b1" style="height:' + h(m.courses) + '%" title="' + e(t('lgCourses')) + ': ' + m.courses + '"></i>' +
        '<i class="bar b2" style="height:' + h(m.projects) + '%" title="' + e(t('lgProjects')) + ': ' + m.projects + '"></i>' +
        '<i class="bar b3" style="height:' + h(m.dailies) + '%" title="' + e(t('lgDailies')) + ': ' + m.dailies + '"></i>' +
        '</div><span class="bar-lbl">' + e(lbl) + '</span></div>';
    }).join('');

    var totalContent = Math.max(1, s.published + s.drafts);
    var pubPct = Math.round((s.published / totalContent) * 100);
    var donutBg = 'conic-gradient(var(--brand) 0 ' + pubPct + '%, var(--line) ' + pubPct + '% 100%)';

    var cats = AdminData.countBy(Store.collection('certificates'), function (c) { return c.category || t('uncat'); }).slice(0, 6);
    var maxCat = cats.length ? cats[0].count : 1;
    var catHTML = cats.length ? cats.map(function (c) {
      return '<div class="hbar-row"><span class="hb-name">' + e(c.key) + '</span>' +
        '<span class="hb-track"><i class="hb-fill" style="width:' + Math.round((c.count / maxCat) * 100) + '%"></i></span>' +
        '<span class="hb-val">' + c.count + '</span></div>';
    }).join('') : '<p class="tiny muted">' + e(t('emptySub')) + '</p>';

    var acts = st.activity && st.activity.length
      ? st.activity.slice(0, 8).map(function (a) {
        var kindCls = a.kind === 'delete' ? 'del' : a.kind === 'update' || a.kind === 'status' ? 'upd' : '';
        var kindIc = a.kind === 'delete' ? 'trash' : a.kind === 'update' ? 'pencil' : a.kind === 'status' ? 'refresh-cw' : 'plus';
        var entLabel = t('ent' + String(a.entity || 'users').charAt(0).toUpperCase() + String(a.entity || 'users').slice(1));
        var kindLabel = t(a.kind === 'create' ? 'actCreate' : a.kind === 'delete' ? 'actDelete' : a.kind === 'status' ? 'actStatus' : 'actUpdate');
        return '<div class="feed-item"><span class="fi ' + kindCls + '">' + UI.icon(kindIc, 15) + '</span>' +
          '<span class="ft"><b>' + e(a.text || '') + '</b><span>' + e(kindLabel + ' · ' + entLabel) + '</span></span>' +
          '<span class="fa">' + e(UI.timeAgo(a.at)) + '</span></div>';
      }).join('')
      : '<p class="tiny muted" style="padding:8px 2px">' + e(t('feedEmpty')) + '</p>';

    var recent = AdminData.recentItems(5);
    var recentHTML = recent.map(function (r) {
      return '<a class="top-item" href="' + e(r.href) + '">' +
        '<span class="rank">' + UI.icon(r.icon, 13) + '</span>' +
        '<span class="tt">' + e(r.title) + '</span>' +
        '<span class="fa tiny muted">' + e(UI.timeAgo(r.at)) + '</span></a>';
    }).join('');

    var topP = Store.collection('projects').slice().sort(function (a, b) { return (b.views || 0) - (a.views || 0); }).slice(0, 5);
    var topHTML = topP.map(function (p, i) {
      return '<a class="top-item" href="' + SITE.u('project', e(p.id)) + '">' +
        '<span class="rank">' + (i + 1) + '</span>' +
        '<span class="tt">' + e(p.title) + '</span>' +
        '<span class="tv">' + UI.icon('eye', 13) + (p.views || 0) + '</span></a>';
    }).join('');

    return '<div class="overview-page">' + statHTML +
      '<div class="adm-grid ov-two overview-row">' +
      '<section class="panel">' +
      '<div class="sec-head"><div><h2>' + UI.icon('layers', 18) + e(t('growthTitle')) + '</h2><p>' + e(t('growthSub')) + '</p></div></div>' +
      '<div class="bars">' + bars + '</div>' +
      '<div class="legend">' +
      '<span><i style="background:var(--brand)"></i>' + e(t('lgCourses')) + '</span>' +
      '<span><i style="background:#10b981"></i>' + e(t('lgProjects')) + '</span>' +
      '<span><i style="background:#f59e0b"></i>' + e(t('lgDailies')) + '</span>' +
      '</div>' +
      '</section>' +
      '<section class="panel">' +
      '<div class="sec-head"><div><h2>' + UI.icon('check-circle', 18) + e(t('statusTitle')) + '</h2></div></div>' +
      '<div class="donut-wrap">' +
      '<div class="donut" style="background:' + donutBg + '"><div class="donut-mid">' + pubPct + '%<span>' + e(t('published')) + '</span></div></div>' +
      '<div class="donut-legend">' +
      '<div class="dl-row"><i style="background:var(--brand)"></i>' + e(t('published')) + '<b>' + s.published + '</b></div>' +
      '<div class="dl-row"><i style="background:var(--line)"></i>' + e(t('drafts')) + '<b>' + s.drafts + '</b></div>' +
      '<div class="dl-row"><i style="background:var(--faint)"></i>' + e(t('total')) + '<b>' + (s.published + s.drafts) + '</b></div>' +
      '</div></div></section>' +
      '</div>' +
      '<div class="adm-grid ov-two overview-row">' +
      '<section class="panel"><div class="sec-head"><div><h2>' + UI.icon('award', 18) + e(t('catsTitle')) + '</h2></div></div>' +
      '<div class="hbars">' + catHTML + '</div></section>' +
      '<section class="panel"><div class="sec-head"><div><h2>' + UI.icon('eye', 18) + e(t('topProjects')) + '</h2></div></div>' +
      '<div class="toplist">' + (topHTML || '<p class="tiny muted">' + e(t('emptySub')) + '</p>') + '</div></section>' +
      '</div>' +
      '<div class="adm-grid ov-two overview-row">' +
      '<section class="panel"><div class="sec-head"><div><h2>' + UI.icon('zap', 18) + e(t('feedTitle')) + '</h2></div></div>' +
      '<div class="feed">' + acts + '</div>' +
      '</section>' +
      '<section class="panel"><div class="sec-head"><div><h2>' + UI.icon('clock', 18) + e(t('recentContent')) + '</h2></div></div>' +
      '<div class="toplist">' + (recentHTML || '<p class="tiny muted">' + e(t('emptySub')) + '</p>') + '</div>' +
      '</section>' +
      '</div></div>';
  }

  function settingsHTML() {
    var s = AdminData.settings();
    var st = AdminData.settingsSummary();
    var databaseSizeBytes = Math.max(0, Number(st.databaseSizeBytes) || 0);
    var databaseSizeScaleBytes = 1024 * 1024 * 1024;
    var databaseSizePercent = Math.min(100, databaseSizeBytes / databaseSizeScaleBytes * 100);

    return '<div class="adm-grid set-grid">' +
      '<section class="panel">' +
      '<div class="sec-head"><div><h2>' + UI.icon('layers', 18) + e(t('setInfo')) + '</h2><p>' + e(t('setInfoSub')) + '</p></div></div>' +
      '<div class="field-row">' +
      '<div class="field"><label class="label">' + e(t('fName')) + '</label><input class="input" data-fk="name" value="' + e(s.name || '') + '"></div>' +
      '<div class="field"><label class="label">' + e(t('fHomepageTitle')) + '</label><input class="input" data-fk="homepageTitle" value="' + e(s.homepageTitle || '') + '"></div>' +
      '</div>' +
      '<div class="field-row">' +
      '<div class="field"><label class="label">' + e(t('fTagline')) + '</label><input class="input" data-fk="tagline" value="' + e(s.tagline || '') + '"></div>' +
      '</div>' +
      '<div class="field-row">' +
      '<div class="field"><label class="label">' + e(t('fEmail')) + '</label><input class="input" dir="ltr" data-fk="email" value="' + e(s.email || '') + '"></div>' +
      '<div class="field"><label class="label">' + e(t('fPhone')) + '</label><input class="input" dir="ltr" data-fk="phone" value="' + e(s.phone || '') + '"></div>' +
      '</div>' +
      '<div class="field-row">' +
      '<div class="field"><label class="label">' + e(t('fWa')) + '</label><input class="input" dir="ltr" data-fk="whatsapp" value="' + e(s.whatsapp || '') + '"></div>' +
      '<div class="field"><label class="label">' + e(t('fSite')) + '</label><input class="input" dir="ltr" data-fk="website" value="' + e(s.website || '') + '"></div>' +
      '</div>' +
      '<div class="field-row">' +
      '<div class="field"><label class="label" for="brandPalette">' + e(t('brandPalette')) + '</label>' +
      '<select class="input" id="brandPalette" data-fk="brandPalette">' +
      paletteOption('current', 'paletteCurrent', s.brandPalette) +
      paletteOption('ocean', 'paletteOcean', s.brandPalette) +
      paletteOption('violet', 'paletteViolet', s.brandPalette) +
      paletteOption('emerald', 'paletteEmerald', s.brandPalette) +
      paletteOption('sunset', 'paletteSunset', s.brandPalette) +
      paletteOption('rose', 'paletteRose', s.brandPalette) +
      paletteOption('slate', 'paletteSlate', s.brandPalette) +
      '</select><span class="hint">' + e(t('brandPaletteHint')) + '</span></div>' +
      '<div class="field palette-preview-field"><label class="label">' + e(t('brandPalette')) + '</label>' +
      palettePreview(s.brandPalette) + '</div>' +
      '</div>' +
      '<button class="btn btn-primary" data-act="set-save">' + UI.icon('check', 15) + e(t('saveChanges')) + '</button>' +
      '</section>' +

      '<section class="panel">' +
      '<div class="sec-head"><div><h2>' + UI.icon('sliders', 18) + e(t('setOptions')) + '</h2></div></div>' +
      '<div class="set-block">' +
      optRow('maintenance', 'optMaintenance', 'optMaintenanceH', s.maintenance) +
      optRow('allowSignup', 'optSignup', 'optSignupH', s.allowSignup) +
      '</div></section>' +

      '<section class="panel">' +
      '<div class="sec-head"><div><h2>' + UI.icon('inbox', 18) + e(t('setSummary')) + '</h2></div></div>' +
      '<div class="info-list">' +
      infoRow(t('statUsers'), st.users + ' (' + st.activeUsers + ' ' + t('statActive') + ')') +
      infoRow(t('statTrainers'), st.trainers) +
      infoRow(t('statCourses'), st.courses) +
      infoRow(t('statLessons'), st.lessons) +
      infoRow(t('colStudents'), st.enrolled) +
      infoRow(t('statProjects'), st.projects) +
      '</div></section>' +

      '<section class="panel">' +
      '<div class="sec-head"><div><h2>' + UI.icon('save', 18) + e(t('setData')) + '</h2><p>' + e(t('setDataSub')) + '</p></div></div>' +
      '<div class="database-size">' +
      '<div class="database-size-head"><b>' + e(t('databaseSize')) + '</b><span dir="ltr">' + e(formatBytes(databaseSizeBytes)) + '</span></div>' +
      '<div class="meter database-size-meter" role="progressbar" aria-label="' + e(t('databaseSize')) + '" aria-valuemin="0" aria-valuemax="' + databaseSizeScaleBytes + '" aria-valuenow="' + Math.min(databaseSizeBytes, databaseSizeScaleBytes) + '">' +
      '<i style="width:' + databaseSizePercent.toFixed(2) + '%"></i></div>' +
      '<p class="tiny muted">' + e(t('databaseSizeScale')) + ' · ' + e(formatBytes(databaseSizeScaleBytes)) + ' ' + e(t('databaseSizeVisualScale')) + '</p>' +
      '</div>' +
      '<div class="dz-actions" style="display:flex;gap:10px;flex-wrap:wrap;margin-top:6px">' +
      '<button class="btn btn-soft" data-act="backup">' + UI.icon('download', 15) + e(t('btnExport')) + '</button>' +
      '<button class="btn btn-ghost" data-act="set-import">' + UI.icon('upload', 15) + e(t('btnImport')) + '</button>' +
      '</div>' +
      '</section>' +
      '</div>';
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    var units = ['KB', 'MB', 'GB', 'TB'];
    var value = bytes;
    var unitIndex = -1;
    do {
      value /= 1024;
      unitIndex++;
    } while (value >= 1024 && unitIndex < units.length - 1);
    return value.toFixed(value < 10 ? 2 : 1) + ' ' + units[unitIndex];
  }

  function optRow(k, labelKey, hintKey, val) {
    return '<div class="switch-row"><div class="sw-t"><b>' + e(t(labelKey)) + '</b><span>' + e(t(hintKey)) + '</span></div>' +
      '<label class="switch"><input type="checkbox" data-act="set-toggle" data-k="' + k + '"' + (val ? ' checked' : '') + '><span class="track"></span></label></div>';
  }

  function paletteOption(id, labelKey, selected) {
    return '<option value="' + id + '"' + (selected === id ? ' selected' : '') + '>' +
      e(t(labelKey)) + '</option>';
  }

  function palettePreview(id) {
    var colors = {
      current: ['#2563eb', '#4f46e5', '#ff9f1a'],
      ocean: ['#2563eb', '#4f46e5', '#60a5fa'],
      violet: ['#7c3aed', '#a21caf', '#c084fc'],
      emerald: ['#059669', '#0f766e', '#34d399'],
      sunset: ['#ea580c', '#db2777', '#fb923c'],
      rose: ['#e11d48', '#be123c', '#fb7185'],
      slate: ['#475569', '#334155', '#94a3b8']
    };
    var selected = colors[id] || colors.ocean;
    return '<div class="palette-preview" aria-hidden="true">' +
      paletteSwatches(selected) +
      '</div>';
  }

  function paletteSwatches(colors) {
    return colors.map(function (color) { return '<i style="background:' + color + '"></i>'; }).join('');
  }

  function infoRow(k, v) {
    return '<div class="if-row"><span class="k">' + e(k) + '</span><span class="v">' + e(String(v)) + '</span></div>';
  }

  function setTableFiltersCollapsed(collapsed) {
    if (tableFiltersCollapsed === collapsed) return;
    tableFiltersCollapsed = collapsed;
    filterScrollDirection = 0;
    filterScrollDistance = 0;
    filterScrollLockUntil = Date.now() + 320;
    syncTableFilterToolbars(document);
    Array.prototype.forEach.call(document.querySelectorAll('.tbl-toolbar'), function (toolbar) {
      toolbar.classList.remove('is-open');
    });
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        lastScrollY = window.scrollY || document.documentElement.scrollTop || 0;
      });
    });
  }

  function bindGlobal() {
    window.addEventListener('scroll', function () {
      var scrollY = window.scrollY || document.documentElement.scrollTop || 0;
      var delta = scrollY - lastScrollY;
      lastScrollY = scrollY;
      if (scrollY <= 120) {
        filterScrollDirection = 0;
        filterScrollDistance = 0;
        if (tableFiltersCollapsed) setTableFiltersCollapsed(false);
        return;
      }
      if (Date.now() < filterScrollLockUntil) {
        filterScrollDirection = 0;
        filterScrollDistance = 0;
        return;
      }
      if (Math.abs(delta) < 1) return;

      var direction = delta > 0 ? 1 : -1;
      if (direction !== filterScrollDirection) {
        filterScrollDirection = direction;
        filterScrollDistance = delta;
      } else {
        filterScrollDistance += delta;
      }

      var scrollThreshold = window.matchMedia && window.matchMedia('(max-width: 640px)').matches ? 48 : 24;
      if (filterScrollDistance >= scrollThreshold && !tableFiltersCollapsed) {
        setTableFiltersCollapsed(true);
        filterScrollDistance = 0;
      } else if (filterScrollDistance <= -scrollThreshold && tableFiltersCollapsed) {
        setTableFiltersCollapsed(false);
        filterScrollDistance = 0;
      }
    }, { passive: true });

    document.addEventListener('click', function (ev) {
      var link = ev.target.closest ? ev.target.closest('.adm-link') : null;
      if (link) closeSide();

      if (ev.target.closest && ev.target.closest('#admScrim')) { closeSide(); return; }

      var filterToggle = ev.target.closest ? ev.target.closest('.tbl-filter-toggle') : null;
      if (filterToggle) {
        var toolbar = filterToggle.closest('.tbl-toolbar');
        if (!toolbar) return;
        var opening = toolbar.classList.contains('is-collapsed');
        filterScrollDirection = 0;
        filterScrollDistance = 0;
        filterScrollLockUntil = Date.now() + 320;
        setTableFiltersCollapsed(!opening);
        toolbar.classList.toggle('is-open', opening);
        if (opening) {
          var searchInput = toolbar.querySelector('[data-tq]');
          if (searchInput) searchInput.focus();
        }
        ev.preventDefault();
        ev.stopPropagation();
        return;
      }

      var sortEl = ev.target.closest('[data-tsort]');
      if (sortEl) {
        var key = sortEl.getAttribute('data-tkey');
        var colK = sortEl.getAttribute('data-tsort');
        var st = ts(key);
        if (st.sort === colK) st.dir = -st.dir;
        else { st.sort = colK; st.dir = 1; }
        renderContent();
        return;
      }

      var actEl = ev.target.closest('[data-act]');
      if (!actEl) return;
      var act = actEl.getAttribute('data-act');
      if (actEl.matches('select[data-act="certificate-review-status"]')) return;
      var fn = handlers[act];
      if (!fn) return;
      ev.preventDefault();
      ev.stopPropagation();
      fn(actEl, ev);
    });

    document.addEventListener('input', function (ev) {
      var el = ev.target;
      if (!el.matches || !el.matches('[data-tq]')) return;
      focusKey = 'q:' + el.getAttribute('data-tq');
      focusPos = el.selectionStart;
      clearTimeout(searchTimer);
      var val = el.value;
      searchTimer = setTimeout(function () {
        var st = ts(el.getAttribute('[data-tq]') || focusKey.split(':')[1]);
        st.q = val;
        st.page = 1;
        renderContent();
      }, 220);
    });

    document.addEventListener('change', function (ev) {
      var el = ev.target;
      if (!el.matches) return;
      if (el.matches('[data-act="certificate-review-status"]')) {
        var reviewHandler = handlers[el.getAttribute('data-act')];
        if (reviewHandler) {
          ev.preventDefault();
          ev.stopPropagation();
          reviewHandler(el, ev);
        }
      } else if (el.matches('[data-fk="brandPalette"]')) {
        var paletteColors = {
          current: ['#2563eb', '#4f46e5', '#ff9f1a'],
          ocean: ['#2563eb', '#4f46e5', '#60a5fa'],
          violet: ['#7c3aed', '#a21caf', '#c084fc'],
          emerald: ['#059669', '#0f766e', '#34d399'],
          sunset: ['#ea580c', '#db2777', '#fb923c'],
          rose: ['#e11d48', '#be123c', '#fb7185'],
          slate: ['#475569', '#334155', '#94a3b8']
        };
        var preview = document.querySelector('.palette-preview');
        if (preview) preview.innerHTML = paletteSwatches(paletteColors[el.value] || paletteColors.ocean);
      } else if (el.matches('[data-tfilter]')) {
        var k = el.getAttribute('data-tkey');
        var st = ts(k);
        st.filters[el.getAttribute('data-tfilter')] = el.value;
        st.page = 1;
        renderContent();
      } else if (el.matches('[data-tsel]')) {
        var k2 = el.getAttribute('data-tsel');
        ts(k2).sel[el.getAttribute('data-id')] = el.checked;
        renderContent();
      }
    });

    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') closeSide();
    });
  }

  on('burger', function () {
    var side = document.getElementById('admSide');
    if (side.classList.contains('open')) closeSide(); else openSide();
  });
  on('go-sec', function (el) { navigate(el.getAttribute('data-sec')); });
  on('quick', function (el) {
    var url = el.getAttribute('data-url');
    if (url) { location.href = url; return; }
    var sec = el.getAttribute('data-sec');
    var open = el.getAttribute('data-open');
    navigate(sec);
    if (open) setTimeout(function () { if (handlers[open]) handlers[open](el); }, 80);
  });
  function readAdminResponse(response) {
    return response.json().then(function (data) {
      if (!response.ok || !data.ok) throw new Error(data.message || t('backupErr'));
      return data;
    });
  }

  function postAdminJson(url, data) {
    return fetch(url, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': window.CSRF_TOKEN || ''
      },
      body: JSON.stringify(data)
    }).then(readAdminResponse);
  }

  on('backup', function () {
    fetch(SITE.u('databaseBackup'), { credentials: 'same-origin' })
      .then(function (response) {
        if (!response.ok) {
          return readAdminResponse(response).then(function () { throw new Error(t('backupErr')); });
        }
        return response.blob();
      })
      .then(function (blob) {
        var url = URL.createObjectURL(blob);
        var link = document.createElement('a');
        link.href = url;
        link.download = 'data-center-backup-' + new Date().toISOString().slice(0, 10) + '.zip';
        document.body.appendChild(link);
        link.click();
        setTimeout(function () { URL.revokeObjectURL(url); link.remove(); }, 600);
        UI.toast(t('backupReady'), 'success');
      })
      .catch(function (err) { UI.toast(err.message || t('backupErr'), 'error'); });
  });
  on('export', function (el) {
    var cfg = tblCfgs[el.getAttribute('data-tkey')];
    if (!cfg) return;
    var view = tableView(cfg);
    var cols = cfg.columns.filter(function (c) { return !c.noCsv; });
    csvExport(cfg.key, cols, view.rows);
    UI.toast(t('exported'), 'success');
  });
  on('page', function (el) {
    var key = el.getAttribute('data-tkey');
    var page = parseInt(el.getAttribute('data-page'), 10);
    var cfg = tblCfgs[key];
    var view = cfg ? tableView(cfg) : null;
    if (!view) return;
    if (page < 1 || page > view.pages) return;
    ts(key).page = page;
    renderContent();
    var host = document.getElementById('admContent');
    if (host) host.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  on('clear-sel', function (el) {
    ts(el.getAttribute('data-tkey')).sel = {};
    renderContent();
  });
  on('certificate-add', function () { navigate('certificate-creator'); });
  on('certificate-list', function () { navigate('student-certificates'); });

  on('set-save', function (button) {
    var host = document.getElementById('admContent');
    function v(k) { var el = host.querySelector('[data-fk="' + k + '"]'); return el ? String(el.value || '').trim() : ''; }
    var patch = {
      name: v('name'), homepageTitle: v('homepageTitle'), tagline: v('tagline'), email: v('email'),
      phone: v('phone'), whatsapp: v('whatsapp'), website: v('website'),
      brandPalette: v('brandPalette')
    };
    button.disabled = true;
    postAdminJson(SITE.u('platformSettings'), patch)
      .then(function (data) {
        AdminData.updateSettings(data.settings);
        UI.toast(t('savedOk'), 'success');
        setTimeout(function () { location.reload(); }, 500);
      })
      .catch(function (err) { UI.toast(err.message || t('settingsErr'), 'error'); })
      .then(function () { button.disabled = false; });
  });

  on('set-toggle', function (el) {
    var k = el.getAttribute('data-k');
    var patch = {};
    patch[k] = el.checked;
    el.disabled = true;
    postAdminJson(SITE.u('platformSettings'), patch)
      .then(function (data) {
        AdminData.updateSettings(data.settings);
        UI.toast(t('savedOk'), 'success');
      })
      .catch(function (err) {
        el.checked = !patch[k];
        UI.toast(err.message || t('settingsErr'), 'error');
      })
      .then(function () { el.disabled = false; });
  });

  on('set-import', function () {
    var inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'application/zip,.zip';
    inp.addEventListener('change', function () {
      var file = inp.files[0];
      if (!file) return;
      UI.confirm(t('importConfirm')).then(function (ok) {
        if (!ok) return;
        var body = new FormData();
        body.append('backup', file);
        fetch(SITE.u('databaseBackup'), {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'X-CSRFToken': window.CSRF_TOKEN || '' },
          body: body
        }).then(readAdminResponse).then(function (data) {
            UI.toast(t('importOk') + ' (' + data.added + ' / ' + data.skipped + ')', 'success');
            setTimeout(function () { location.reload(); }, 700);
        }).catch(function (err) { UI.toast(err.message || t('importErr'), 'error'); });
      });
    });
    inp.click();
  });

  register('overview', { render: overviewHTML });
  register('settings', { render: settingsHTML });

  function start() {
    AdminData.ensure();
    UI.init();
    bindGlobal();
    window.addEventListener('hashchange', handleDashboardHashChange);
    document.addEventListener('i18n:change', function () { render(); });
    render();
  }

  window.Admin = {
    t: t,
    e: e,
    lang: lang,
    on: on,
    register: register,
    start: start,
    ts: ts,
    selIds: selIds,
    table: tableHTML,
    formModal: formModal,
    navigate: navigate,
    render: renderContent,
    renderAll: render,
    setEditorLeaveHandler: function (handler) { dashboardEditorLeaveHandler = handler; },
    isDashboardEditor: function () { return dashboardEditorMounted; },
    section: curSection,
    statusChip: statusChip,
    roleChip: roleChip,
    csv: csvExport,
    empty: emptyBlock,
    tableView: tableView
  };
})();
