# دليل التثبيت والاستخدام — حصالة

**آخر تحديث:** 3 نوفمبر 2026

الدليل ده مكتوب خطوة بخطوة لأي حد عايز يثبّت **حصالة** ويستخدمها، سواء كان
مختبر بياخد ZIP، أو مطوّر معاه دعوة للريبو الخاص، أو مستخدم عادي بعد نشر
الإضافة على Chrome Web Store.

---

## 1) قبل ما تبدأ

### المتطلبات

- متصفح مبني على Chromium:
  - Google Chrome 109 أو أحدث
  - Brave
  - Microsoft Edge
  - Chromium
- **Python 3.9+** لو عايز تحفظ الكلمات في ملف Markdown (الـ Native Host).
- صلاحية كتابة في الفولدر اللي هتحط فيه الإضافة.

### يعني إيه «ريبو خاص»؟

الريبو بتاع حصالة **Private** على GitHub، يعني مش أي حد يقدر يشوف الكود أو
ينزّله من غير دعوة. فيه طريقتين للوصول:

1. **دعوة للريبو:** صاحب المشروع يضيفك Collaborator، وبعدها تقدر تعمل Clone.
2. **ZIP للمختبرين:** صاحب المشروع يبعتلك `hassala-2.0.4-testers.zip` مباشرة.
   دي الحزمة الكاملة: الإضافة + الـ Native Host + الدليل.

المستخدم العادي بعد النشر هياخد الإضافة من Chrome Web Store، ومش محتاج GitHub
خالص.

> **ملاحظة:** فيه كمان `hassala-2.0.4.zip`، وهي حزمة Chrome Web Store
> (الإضافة بس). استخدمها لو هترفع على المتجر، أو لو هتجيب الـ Native Host من
> الريبو بنفسك.

---

## 2) التثبيت من ZIP (الطريقة الأسهل للمختبرين)

1. خُد ملف `hassala-2.0.4-testers.zip`.
2. فك الضغط في مكان ثابت، مثلًا:

   ```text
   Linux/macOS:  ~/Hassala
   Windows:      %USERPROFILE%\Hassala
   ```

3. اتأكد إن المسار بقى كده:

   ```text
   ~/Hassala/manifest.json
   ~/Hassala/src/background.js
   ~/Hassala/src/fonts/BalooBhaijaan2-Variable.woff2
   ~/Hassala/native/install.sh
   ~/Hassala/docs/INSTALL.md
   ```

   لو لقيت فولدر زيادة جوه `Hassala` (مثل `hassala-2.0.4/`)، خُد الملفات
   اللي جواه وحرّكها لفوق.

4. افتح صفحة الإضافات حسب المتصفح:

   | المتصفح | العنوان |
   | --- | --- |
   | Chrome | `chrome://extensions` |
   | Brave | `brave://extensions` |
   | Edge | `edge://extensions` |
   | Chromium | `chromium://extensions` |

5. شغّل **Developer mode** من أعلى يمين الصفحة.
6. اضغط **Load unpacked**.
7. اختار فولدر `Hassala` اللي فيه `manifest.json` مباشرة.
8. هتظهر الإضافة. اضغط **Pin** من قائمة البازل 🧩 عشان الأيقونة تفضل في شريط
   الأدوات.
9. عشان الحفظ يشتغل، كمّل الخطوة اللي بعد كده: **تثبيت Native Host** من نفس
   فولدر `Hassala`. الحزمة فيها فولدر `native/` جاهز.

> **مهم جدًا:** سيب الفولدر في مكانه. لو نقلته أو غيّرت اسمه، Chrome بيعتبره
> إضافة جديدة، والـ Extension ID بيتغيّر، والـ Native Host القديم مش هيعرف
> يكلمها.

---

## 3) التثبيت من السورس (لو معاك دعوة)

```bash
git clone <repo-url>
cd hassala
```

بعدها:

1. افتح صفحة الإضافات.
2. شغّل Developer mode.
3. **Load unpacked** واختار فولدر `hassala`.
4. ثبّت الأيقونة بـ Pin.

> لو مش معاك رابط الريبو، اطلبه من صاحب المشروع. الريبو خاص ومش بيتحمل من
> غير دعوة.

---

## 4) تثبيت Native Host (الحفظ في Markdown)

الحفظ في ملف Markdown بيحتاج برنامج صغير اسمه **Native Messaging Host**.
الترجمة والسبتايتل والزرار العائم بيشتغلوا من غيره، لكن **أضف للحصالة** مش
هيشتغل.

### 4.1) Linux وmacOS

من جوه فولدر `Hassala` المفكوك (اللي فيه `manifest.json` و`native/`):

```bash
bash native/install.sh
```

السكريبت بيعمل الآتي:

- يتأكد إن Python موجود.
- يحسب Extension ID من مسار الفولدر (لو مش متحدد).
- يسجّل الـ Host في Brave وChrome وChromium وEdge.
- يمسح أي تسجيلات قديمة من نسخ سابقة.
- يطبع اسم الـ Host والـ ID والمسار.

بعد كده:

1. ارجع لصفحة الإضافات.
2. اضغط **Reload** على حصالة.
3. افتح الإعدادات وتأكد إن الحالة **متصل**.

#### لو عندك نسخة Chrome Web Store

الـ Extension ID في المتجر ثابت، وبتلاقيه في صفحة الإضافة أو من
`chrome://extensions`. سجّل الـ Host بالـ ID ده:

```bash
HASSALA_EXT_ID=<extension-id> bash native/install.sh
```

#### إزالة التسجيل

```bash
bash native/install.sh --uninstall
```

### 4.2) Windows

#### المتطلبات

- Python 3.9+ من [python.org](https://www.python.org/downloads/windows/).
- أثناء التثبيت فعّل **Add Python to PATH**.
- اتأكد من PowerShell:

  ```powershell
  python --version
  ```

#### الخطوات

1. افتح صفحة الإضافات (`chrome://extensions` أو `edge://extensions`).
2. شغّل Developer mode.
3. انسخ **ID** الإضافة من تحت اسم «حصالة».
4. من فولدر `Hassala`، شغّل:

   ```powershell
   powershell -ExecutionPolicy Bypass -File native\install.ps1 -ExtensionId <id>
   ```

5. ارجع لصفحة الإضافات واعمل **Reload**.
6. افتح الإعدادات وتأكد إن الحالة **متصل**.

#### إزالة التسجيل

```powershell
powershell -ExecutionPolicy Bypass -File native\install.ps1 -Uninstall
```

#### التسجيل اليدوي (لو PowerShell معطّل)

1. اعمل فولدر:

   ```text
   %LOCALAPPDATA%\Hassala
   ```

2. اعمل ملف `com.hassala.writer.json` فيه:

   ```json
   {
     "name": "com.hassala.writer",
     "description": "Hassala word bank writer (Markdown)",
     "path": "C:\\Users\\<you>\\Hassala\\native\\hassala_writer.bat",
     "type": "stdio",
     "allowed_origins": ["chrome-extension://<extension-id>/"]
   }
   ```

   غيّر `<you>` و`<extension-id>` بالقيم الحقيقية.

3. سجّل الملف في الريجستري لكل متصفح:

   ```bat
   reg add "HKCU\Software\Google\Chrome\NativeMessagingHosts\com.hassala.writer" /ve /t REG_SZ /d "%LOCALAPPDATA%\Hassala\com.hassala.writer.json" /f
   reg add "HKCU\Software\Chromium\NativeMessagingHosts\com.hassala.writer" /ve /t REG_SZ /d "%LOCALAPPDATA%\Hassala\com.hassala.writer.json" /f
   reg add "HKCU\Software\BraveSoftware\Brave-Browser\NativeMessagingHosts\com.hassala.writer" /ve /t REG_SZ /d "%LOCALAPPDATA%\Hassala\com.hassala.writer.json" /f
   reg add "HKCU\Software\Microsoft\Edge\NativeMessagingHosts\com.hassala.writer" /ve /t REG_SZ /d "%LOCALAPPDATA%\Hassala\com.hassala.writer.json" /f
   ```

4. اعمل Reload للإضافة.

> **ملاحظة:** الـ Host على Windows بيستخدم `hassala_writer.bat` عشان يشغّل
> Python. لازم Python يكون في PATH.

---

## 5) الاستخدام اليومي

### الترجمة

- **من البوب:** اضغط أيقونة حصالة في شريط الأدوات.
- **من الصفحة:** اضغط الزرار العائم.
- **من التحديد:** حدد كلام في أي صفحة، واضغط **ترجمة**.
- اكتب عربي أو إنجليزي؛ الاتجاه بيتحدد لوحده.
- **Enter** يترجم فورًا، و**Esc** يقفل الصندوق العائم أو يمسح الكتابة في البوب.

### الحفظ

1. بعد ظهور الترجمة، اضغط **أضف للحصالة**.
2. بعد الحفظ بنجاح، الكلمة والترجمة بيتلاشوا بحركة هادية، وبعدها المربع
   بيتفضّى تلقائيًا ورسالة التأكيد بتظهر مكان الترجمة، جاهز للكلمة اللي بعدها.
3. أول مرة، لو الملف الافتراضي مش موجود، حصالة بتنشئه تلقائيًا.
4. لو اخترت مسار مخصص، لازم يكون ملف `.md` موجود بالفعل.
5. التكرار بيتم منعه تلقائيًا.

### فتح الملف وتغيير المسار

- **افتح الملف**: بيفتح الملف الحالي بتطبيق Markdown الافتراضي.
- **تغيير المسار**: نافذة سريعة فيها المسار الحالي والافتراضي.
- **الإعدادات**: اختيار ملف من متصفح الملفات، أو كتابة مسار كامل.

### يوتيوب

1. شغّل **CC**.
2. مرّر الماوس على كلمة → الفيديو يقف.
3. اضغط كلمة → ترجمة.
4. اسحب على جملة → ترجمة الجملة.

### الزرار العائم والمواقع

- من البوب: إظهار/إخفاء الزرار العائم.
- من الإعدادات: تعطيل حصالة على موقع أو دومين كامل.
- المواقع المتعطلة بترجع لطبيعتها فورًا، وسبتايتل يوتيوب الأصلي بيرجع.

---

## 6) ملف الحصالة

### الملف الافتراضي

```text
~/Documents/Hassala Words.md
```

- بيتعمل تلقائيًا أول حفظ لو مش موجود.
- لو عايز تغيّره، اختار ملف `.md` موجود من الإعدادات.
- المسار المخصص لازم يكون موجود؛ ده حماية عشان الإضافة ما تنشئش ملفات في
  أماكن غلط.

### شكل الملف

```markdown
---
tags:
  - english
  - vocabulary
  - hassala
---

| # | English | Arabic |
| --- | --- | --- |
| 1 | hello | مرحبًا |
| 2 | book | كتاب |
```

- الإنجليزي دايمًا في العمود الأول، والعربي في التاني.
- الكاونتر بيزيد مع كل صف جديد.
- التكرار بيتم منعه بنفس زوج الكلمة والترجمة.
- الرموز الخطيرة في Markdown بتتهرّب، عشان الكلمات اللي فيها `<` أو `|` ما
  تكسرش الجدول.

---

## 7) التأكد من إن كل حاجة شغالة

1. **الترجمة:** اكتب `hello` في البوب، لازم تظهر «مرحبًا».
2. **الحفظ:** اضغط **أضف للحصالة**، لازم تظهر «اتحوشت ✓ اكتب الكلمة اللي
   بعدها»، والمربع يتفضّى والتركيز يرجع له.
3. **التكرار:** اكتب `hello` تاني واضغط حفظ، لازم تظهر «كانت موجودة عندك ✓
   اكتب الكلمة اللي بعدها».
4. **الملف:** افتح الملف، لازم تلاقي صف `hello`.
5. **يوتيوب:** شغّل فيديو وCC، وجرّب تضغط كلمة.
6. **الزرار العائم:** افتح أي صفحة، لازم يظهر الزرار.

---

## 8) إلغاء التثبيت

### الإضافة

- من صفحة الإضافات، اضغط **Remove** على حصالة.

### Native Host

```bash
# Linux/macOS
bash native/install.sh --uninstall

# Windows
powershell -ExecutionPolicy Bypass -File native\install.ps1 -Uninstall
```

### البيانات

- امسح ملف الحصالة من مكانه.
- امسح بيانات الإضافة من المتصفح لو عايز تمسح الإعدادات والسجل.

---

## 9) مشاكل شائعة

### «الربط مش مفعّل»

- الـ Native Host مش متسجل → شغّل `install.sh` / `install.ps1`.
- Extension ID اتغيّر بعد نقل الفولدر → أعد تسجيل الـ Host.
- Python مش موجود → ثبّته وأعد التسجيل.
- محتاج Reload للإضافة بعد التسجيل.

### «الملف مش موجود»

- المسار المخصص مش موجود → اختار ملف `.md` موجود.
- أو استخدم الملف الافتراضي، وده بيتعمل تلقائيًا.

### «مقدرتش أحوش»

- الملف مش قابل للكتابة → راجع صلاحيات الملف.
- المسار غلط → افتح الإعدادات وشوف المعاينة.
- جرّب ملف اختبار في `~/Documents`.

### الترجمة مش شغالة

- اتأكد من الإنترنت.
- جرّب كلمة تانية.
- ممكن خدمة الترجمة تكون مش متاحة مؤقتًا؛ جرّب بعد شوية.

### يوتيوب مش تفاعلي

- شغّل CC.
- اعمل Refresh للصفحة.
- اتأكد إن يوتيوب مش في قائمة المواقع المتعطلة.

### الزرار العائم مش ظاهر

- من البوب: فعّل «الزرار العائم».
- من الإعدادات: شوف المواقع المتعطلة.
- بعض صفحات المتصفح الداخلية (`chrome://`، متجر الإضافات) مش بيشتغل عليها
  المحتوى لأسباب أمنية.

---

## 10) للنشر على Chrome Web Store

قبل النشر:

1. `bash scripts/check.sh`
2. `bash scripts/package.sh`
3. ارفع `dist/hassala-2.0.4.zip`.
4. املأ صفحة المتجر من `store/listing-ar.md` و`store/listing-en.md`.
5. حط رابط سياسة الخصوصية العام.
6. ارفع لقطات الشاشة.
7. راجع `store/permissions.md` لتبرير كل صلاحية.

التفاصيل في [STORE-RELEASE.md](STORE-RELEASE.md).
