# النشر على Chrome Web Store — حصالة

**آخر تحديث:** 3 نوفمبر 2026

الملف ده هو تشيك ليست النشر الكامل. اتبعه بالترتيب قبل أي إصدار، وبعده بعد كل
تحديث.

---

## 0) قبل ما تبدأ

### حساب المطوّر

- [ ] حساب Google Chrome Web Store Developer مفعّل.
- [ ] رسوم التسجيل مرة واحدة مدفوعة.
- [ ] البريد الإلكتروني للحساب متأكد.
- [ ] التحقق بخطوتين مفعّل على حساب Google.
- [ ] بيانات الدفع والعنوان محدثة (Chrome Web Store بيطلبها للنشر).

### الأصول المطلوبة

| الأصل | المقاس | المكان |
| --- | --- | --- |
| أيقونة المتجر | 128×128 PNG | `src/icons/icon128.png` |
| أيقونة 512 (اختياري) | 512×512 PNG | `assets/icon-1024.png` بعد التصغير |
| لقطات شاشة | 1280×800 أو 640×400 | تُلتقط يدويًا |
| صورة ترويجية صغيرة | 440×280 | اختياري |
| صورة ترويجية كبيرة | 1400×560 | اختياري |
| فيديو | YouTube URL | اختياري |

### الروابط العامة

- **سياسة الخصوصية (عامة):**
  <https://gist.github.com/nagdista-dev/282cc2ce8fe35c5fb7199f7ffd2cd705>
- **الريبو:** <https://github.com/nagdista-dev/hassala> — عام ومفتوح المصدر.
- **الدعم:** تبويب **Support** في صفحة المتجر، أو
  [GitHub Issues](https://github.com/nagdista-dev/hassala/issues).

> **مهم:** سياسة الخصوصية لازم تفضل متاحة للعامة. لو الـ Gist اتغير، حدّث
> الرابط في صفحة المتجر وفي `store/listing-*.md`.

---

## 1) تجهيز الإصدار

### رقم الإصدار

- [ ] `manifest.json` فيه رقم إصدار جديد (مثال: `2.0.4`).
- [ ] `src/options/options.html` بيعرض نفس الرقم.
- [ ] `CHANGELOG.md` فيه مدخل للنسخة.
- [ ] `docs/ROADMAP.md` محدّث.
- [ ] مفيش رقم قديم في أي مكان.

### الفحص

```bash
bash scripts/check.sh
```

لازم يعدي:

- JavaScript: `node --check` لكل ملف.
- Python: `py_compile` لكل ملف.
- JSON: `jq empty` لكل ملف.
- Shell: `bash -n`.
- المراجع: كل ملف في المانيفست والـ HTML موجود.
- الأمان: مفيش `eval`، مفيش `new Function`، مفيش inline script، مفيش اسم
  شخصي أو مسار بيت.
- Native Host: كل الاختبارات.

### الحزمة

```bash
bash scripts/package.sh
```

- [ ] الحزمة اسمها `dist/hassala-<version>.zip`.
- [ ] جواها `manifest.json` + `src/` بس.
- [ ] مفيش `docs/`، `native/`، `tests/`، `store/`، `.git`، `TODO.md`،
      `dist/`، `__pycache__`، أو أي ملف شخصي.
- [ ] الأيقونة الجديدة موجودة، ومفيش أي أثر للأيقونة القديمة.
- [ ] الخط موجود: `src/fonts/BalooBhaijaan2-Variable.woff2` + `OFL.txt`.
- [ ] الحجم أقل من حد المتجر (حاليًا 2 GB، لكن خليها خفيفة).

### فحص الحزمة

```bash
unzip -l dist/hassala-2.0.4.zip
sha256sum dist/hassala-2.0.4.zip
```

- [ ] سجّل الـ SHA256 في مكان آمن.
- [ ] جرّب تحميل نفس الـ ZIP كـ **Load unpacked** في بروفايل متصفح نظيف.
- [ ] جرّب الترجمة، الحفظ، التكرار، يوتيوب، الزرار العائم، والإعدادات.

---

## 2) تجربة المتصفح النظيف

اعمل بروفايل جديد (مش بروفايلك اليومي) وجرّب:

1. **Load unpacked** من فولدر الحزمة المفكوكة.
2. اتأكد إن الأيقونة ظاهرة وواضحة في شريط الأدوات.
3. اكتب `hello` → لازم تظهر «مرحبًا».
4. اضغط **أضف للحصالة** → لازم يتعمل ملف `~/Documents/Hassala Words.md`
   (لو مش موجود) ويتكتب الصف، والمربع يتفضّى وتظهر رسالة التأكيد.
5. اكتب `hello` تاني واضغط حفظ → لازم تظهر «كانت موجودة عندك ✓».
6. افتح يوتيوب وفيديو بيه CC → جرّب الوقوف عند المرور والضغط على كلمة.
7. افتح صفحة عادية → جرّب الزرار العائم وتحديد النص.
8. من الإعدادات → جرّب تغيير المسار، تعطيل موقع، ومسح السجل.
9. اعمل Reload للإضافة → اتأكد إن الإعدادات والمسار لسه موجودين.
10. اقفل المتصفح وافتحه → اتأكد إن كل حاجة شغالة.

### اختبار الهجرة من نسخة قديمة

لو عندك نسخة قديمة مسجلة:

- [ ] ثبّت النسخة القديمة، اختار مسار، واعمل ترجمة.
- [ ] ثبّت `2.0.4` فوقها (نفس فولدر التحميل أو Reload).
- [ ] اتأكد إن المسار القديم اتنقل لـ `hassalaFile`، وإن الحفظ شغال.
- [ ] اتأكد إن مفتاح `obsidianFile` اتمسح بعد الترحيل.

---

## 3) صفحة المتجر

### المعلومات الأساسية

- **الاسم:** حصالة — مترجم وحافظ الكلمات
- **الاسم المختصر:** حصالة
- **الفئة:** Education
- **اللغة الأساسية:** العربية
- **الوصف القصير:** من `store/listing-ar.md`
- **الوصف الكامل:** من `store/listing-ar.md`
- **الكلمات المفتاحية:** من `store/listing-ar.md`

### الصور

- [ ] أيقونة 128×128 واضحة.
- [ ] 5 لقطات شاشة بالمقاس المطلوب.
- [ ] لقطة البوب فيها ترجمة + زرار الحفظ.
- [ ] لقطة الصندوق العائم فوق صفحة حقيقية.
- [ ] لقطة يوتيوب بسبتايتل تفاعلي.
- [ ] لقطة الإعدادات.
- [ ] لقطة ملف Markdown بعد الحفظ.
- [ ] مفيش أي بيانات شخصية أو إيميل أو مسار بيت في اللقطات.

### الخصوصية والصلاحيات

- [ ] رابط سياسة الخصوصية العام شغال.
- [ ] كل صلاحية ليها تبرير في `store/permissions.md`.
- [ ] **Single purpose** مكتوب بوضوح.
- [ ] إقرار **Remote code**: «لا يوجد».
- [ ] إقرار استخدام البيانات: ترجمة عند الطلب فقط، تخزين محلي، مفيش بيع.
- [ ] توضيح إن الـ Native Host اختياري وبيتثبت محليًا.

### ملاحظة المراجع (Reviewer notes)

انسخ النص ده في خانة الملاحظات:

```text
Hassala translates Arabic <-> English and saves words to a local Markdown file.

How to test translation:
1. Click the Hassala toolbar icon or the floating button on any page.
2. Type "hello" and press Enter. The Arabic translation appears automatically.

How to test saving:
Saving uses an optional local native messaging host (Python 3) because Chrome
extensions cannot write to arbitrary files. Translation, YouTube subtitles, and
the floating panel work without it.
- Linux/macOS: run `bash native/install.sh` from the extension folder.
- Windows: run `native\install.ps1` with the extension ID.
- Then open Settings and confirm the connection status is "connected".
- Click "Add to Hassala"; a row is appended to ~/Documents/Hassala Words.md.

No remote code is loaded. All JavaScript is bundled. No analytics, accounts,
or tracking. Privacy policy:
https://gist.github.com/nagdista-dev/282cc2ce8fe35c5fb7199f7ffd2cd705
```

> **ملاحظة:** لو المراجع مش قادر يثبت Python، وضّح في الوصف إن الحفظ اختياري
> وإن باقي الميزات شغالة من غيره. ده بيقلل خطر الرفض بسبب ميزة مش قابلة
> للاختبار.

---

## 4) الرفع

1. افتح [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).
2. اضغط **New item** (أو **Upload new package** للتحديث).
3. ارفع `dist/hassala-<version>.zip`.
4. املأ كل الحقول.
5. راجع **Privacy practices**.
6. اضغط **Submit for review**.
7. تابع الإيميل بتاع الحساب.

### بعد الموافقة

- [ ] الإضافة ظهرت في المتجر.
- [ ] جرّب التثبيت من المتجر في بروفايل نظيف.
- [ ] سجّل الـ Extension ID المنشور.
- [ ] حدّث `native/install.sh` / `install.ps1` بالـ ID المنشور عند الحاجة.
- [ ] حدّث `README.md` و`docs/INSTALL.md` برابط المتجر.
- [ ] أنشئ Release `v<version>` في الريبو العام بالـ ZIP وSHA256.

---

## 5) الرفض والأخطاء الشائعة

| السبب | الحل |
| --- | --- |
| صلاحية مش مبررة | راجع `store/permissions.md` ووضّح كل واحدة في الاستمارة |
| سياسة خصوصية مش متاحة | تأكد إن رابط الـ Gist عام ويفتح من متصفح تاني |
| Remote code | اتأكد إن مفيش سكربت خارجي أو `eval` |
| Native host مش قابل للاختبار | وضّح إنه اختياري + خطوات التثبيت + إن الحفظ مش أساسي |
| وصف مضلل | اكتب بالظبط اللي الإضافة بتعمله، ومتنكرش إن الحفظ محتاج host |
| أيقونة مش واضحة | استخدم `icon128.png` الجديدة |
| بيانات مستخدم مش معلنة | راجع قسم Data usage في الاستمارة |

لو الرفض بسبب ميزة معينة، ممكن تنشر نسخة بدونها مؤقتًا، لكن الأفضل تصلح
السبب وتعيد الرفع.

---

## 6) الريبو العام

- الريبو **Public** على GitHub:
  <https://github.com/nagdista-dev/hassala>.
- المشروع مفتوح المصدر تحت ترخيص MIT، وأي حد يقدر يفتح Issue أو Pull Request.
- المختبرين بياخدوا ZIP من صفحة
  [Releases](https://github.com/nagdista-dev/hassala/releases).
- ممنوع رفع:
  - `native/config.json` اللي فيه مسار شخصي.
  - `.env` أو مفاتيح أو توكنات.
  - `dist/` أو `TODO.md`.
  - أي لقطة شاشة فيها بيانات شخصية.
- سياسة الخصوصية العامة في Gist منفصل، وموجودة كمان في
  [PRIVACY.md](PRIVACY.md).

### طريقة إصدار نسخة جديدة

1. اتأكد إن `bash scripts/check.sh` بيعدي.
2. ابنِ الحزمتين:

   ```bash
   bash scripts/package.sh
   bash scripts/package-testers.sh
   ```

3. اعمل tag وارفع التغييرات:

   ```bash
   git tag v<version>
   git push origin main --tags
   ```

4. من GitHub → **Releases** → **Draft a new release**، اختار الـ tag،
   وارفع `hassala-<version>.zip` و`hassala-<version>-testers.zip` مع ملفات
   الـ SHA256.
5. اكتب ملاحظات الإصدار من `CHANGELOG.md`، وحدّث `manifest.json` و
   `options.html`.

> أي حد عنده رابط الـ Release يقدر ينزّل الحزمة؛ مش محتاج حساب GitHub.

### تنظيف التاريخ

لو حصل إن اسم شخصي أو إيميل دخل في commit:

```bash
git filter-branch --force --env-filter '
export GIT_AUTHOR_NAME="Hassala Maintainers"
export GIT_AUTHOR_EMAIL="hassala-maintainers@users.noreply.github.com"
export GIT_COMMITTER_NAME="Hassala Maintainers"
export GIT_COMMITTER_EMAIL="hassala-maintainers@users.noreply.github.com"
' --tag-name-filter cat -- --all
```

أو استخدم `git-filter-repo` (أسرع وأنضف). بعدها:

```bash
git push --force --all
git push --force --tags
```

> **تحذير:** ده بيعيد كتابة التاريخ. أي حد عنده Clone قديم لازم يعمل Clone
> جديد. متعملهوش من غير نسخة احتياطية.

---

## 7) الإصدارات

- **SemVer:** `MAJOR.MINOR.PATCH`.
- **MAJOR:** تغيير في طريقة الحفظ أو الصلاحيات أو الهوية.
- **MINOR:** ميزة جديدة متوافقة.
- **PATCH:** إصلاحات صغيرة.
- كل إصدار لازم يكون له:
  - مدخل في `CHANGELOG.md`.
  - ZIP جديد.
  - Release في GitHub (عام).
  - SHA256.
  - تحديث `manifest.json` و`options.html`.

---

## 8) التراجع (Rollback)

لو إصدار فيه مشكلة:

1. من Developer Dashboard، **Unpublish** الإصدار الحالي.
2. ارفع نسخة سابقة (نفس رقم الإصدار مش مسموح؛ لازم رقم جديد).
3. اختبر النسخة السابقة في بروفايل نظيف.
4. انشرها.
5. وثّق المشكلة في `CHANGELOG.md`.

---

## 9) الخصوصية والأمان قبل كل نشر

- [ ] مفيش تتبع أو تحليلات.
- [ ] مفيش طلبات شبكة جديدة من غير توثيق.
- [ ] مفيش صلاحيات جديدة من غير تبرير.
- [ ] مفيش كود بعيد.
- [ ] الـ Native Host لسه بيقبل Extension ID بس.
- [ ] الـ Native Host لسه بيرفض غير `.md`.
- [ ] الملف الافتراضي بس هو اللي بيتعمل تلقائيًا.
- [ ] الرموز بتتهرّب قبل الكتابة.
- [ ] سياسة الخصوصية محدّثة.
- [ ] `bash scripts/check.sh` ناجح.

---

## 10) مراجع

- [Chrome Web Store Program Policies](https://developer.chrome.com/docs/webstore/program-policies/)
- [Prepare your extension for distribution](https://developer.chrome.com/docs/webstore/prepare)
- [Publish in the Chrome Web Store](https://developer.chrome.com/docs/webstore/publish)
- [Native messaging](https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging)
- [User Data Policy](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq)
