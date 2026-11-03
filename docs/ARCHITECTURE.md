# معمارية حصالة

**آخر تحديث:** 3 نوفمبر 2026

الملف ده بيشرح إزاي حصالة متقسّمة من جوه: مين بيكلم مين، الرسائل بتمر إزاي،
وفين البيانات بتتخزن. الكود نفسه مش مربوط بأي framework، وكل ملف ليه مسؤولية
واحدة واضحة.

---

## 1) نظرة سريعة

حصالة إضافة Manifest V3 من غير build step. كل حاجة جوه الحزمة، ومفيش سيرفر
خاص بالمشروع.

```mermaid
flowchart TB
    subgraph Browser["Browser"]
        Page["Web page / YouTube tab"]
        subgraph CS["Content scripts (isolated world)"]
            Policy["site-policy.js<br/>domain + block list"]
            Floating["floating.js<br/>closed Shadow DOM UI"]
            YouTube["youtube.js<br/>interactive captions"]
        end
        SW["background.js<br/>service worker"]
        Popup["popup.html + popup.js"]
        Options["options.html + options.js"]
        Offscreen["offscreen.html + offscreen.js"]
        Storage[("chrome.storage.local")]
    end

    subgraph Device["User device"]
        Host["Native host<br/>hassala_writer.py"]
        Note[("Markdown word bank<br/>user-chosen .md")]
    end

    subgraph Cloud["Third-party services"]
        Google["Google Translate<br/>+ TTS"]
        MyMemory["MyMemory API"]
    end

    Page --> Policy
    Page --> Floating
    Page --> YouTube
    Policy --> Floating
    Policy --> YouTube
    Floating -->|"runtime.sendMessage"| SW
    YouTube -->|"isolated-world API"| Floating
    Popup -->|"runtime.sendMessage"| SW
    Options -->|"runtime.sendMessage"| SW
    SW <-->|"chrome.storage.local"| Storage
    Floating <-->|"chrome.storage.local"| Storage
    Popup <-->|"chrome.storage.local"| Storage
    Options <-->|"chrome.storage.local"| Storage
    SW -->|"runtime.sendNativeMessage"| Host
    Host -->|"append row"| Note
    SW -->|"HTTPS"| Google
    SW -->|"HTTPS fallback"| MyMemory
    SW -->|"createDocument"| Offscreen
    Floating -.->|"toolbar injection"| SW
```

**قواعد الاتجاه:**

- الصفحة ما بتكلمش الـ service worker مباشرة من كود الصفحة؛ الـ content script
  هو اللي بيكلم، والـ extension APIs مش متاحة لـ JavaScript الصفحة.
- الـ background هو الوسيط الوحيد للترجمة والحفظ والنطق.
- الـ native host ما بيكلمش أي حاجة غير الإضافة، وما بيعملش أي اتصال شبكي.

---

## 2) المكوّنات ومسؤولياتها

| المكوّن | الملف | المسؤولية |
| --- | --- | --- |
| Service worker | `src/background.js` | الترجمة، fallback، كاش، النطق، الحفظ، التحقق من المرسل، رسائل التبويب |
| الصندوق العائم | `src/content/floating.js` | واجهة الترجمة، تحديد النص، الزرار العائم، مسار الحفظ، Shadow DOM مغلق |
| سياسة المواقع | `src/content/site-policy.js` | تطبيع الدومينات، قراءة قائمة التعطيل، أحداث `storage` |
| يوتيوب | `src/content/youtube.js` | قراءة السبتايتل، عرض سطرين، الوقوف عند المرور، الترجمة عند الضغط |
| البوب | `src/popup/` | ترجمة سريعة، حفظ، فتح الملف، سجل آخر ٨ كلمات، إظهار/إخفاء الزرار العائم |
| الإعدادات | `src/options/` | مسار ملف الحصالة، متصفح الملفات، المواقع المتعطلة، الحالة |
| النطق | `src/offscreen/` | تشغيل الصوت خارج الصفحة |
| Native host | `native/hassala_writer.py` | كتابة صفوف Markdown، منع التكرار، فحص المسارات، فتح الملف |
| السكربتات | `scripts/` | فحص المشروع، بناء ZIP، توليد الأيقونات |
| الاختبارات | `tests/` | اختبار Native Host من غير أي اعتماد خارجي |

---

## 3) تدفق الترجمة

```mermaid
sequenceDiagram
    autonumber
    actor User as المستخدم
    participant UI as Popup / Floating
    participant BG as background.js
    participant G as Google Translate
    participant M as MyMemory

    User->>UI: يكتب كلمة أو يحدد نص
    UI->>UI: يكتشف الاتجاه + debounce 350ms
    UI->>BG: { type: "translate", text, mode }
    BG->>BG: ينظّف النص + يحدد المفتاح
    alt الكاش فيه النتيجة
        BG-->>UI: { ok: true, translation, cached: true }
    else مفيش كاش
        BG->>G: طلب ترجمة (endpoint أول)
        alt Google رجّع نتيجة
            G-->>BG: ترجمة
        else Google فشل
            BG->>G: endpoint تاني
            alt التاني فشل
                BG->>M: طلب fallback
                M-->>BG: ترجمة أو خطأ
            end
        end
        BG->>BG: يحفظ في كاش الذاكرة (حد أقصى)
        BG-->>UI: { ok: true, translation }
    end
    UI-->>User: يعرض الترجمة + أزرار النسخ والنطق والحفظ
```

**ملاحظات:**

- الكاش في ذاكرة الـ service worker بس، وبيتمسح لما المتصفح يقفل أو الـ worker
  يتوقف. مفيش كاش دائم للنص.
- مفيش مفتاح API، ومفيش حساب. الخدمات العامة هي المصدر.
- لو كل الخدمات فشلت، الـ background بيرجّع `{ ok: false, code: 'failed' }`
  والواجهة بتعرض رسالة مفهومة.

---

## 4) تدفق الحفظ

```mermaid
sequenceDiagram
    autonumber
    actor User as المستخدم
    participant UI as Popup / Floating
    participant BG as background.js
    participant H as hassala_writer.py
    participant F as ملف .md

    User->>UI: يضغط «أضف للحصالة»
    UI->>BG: { type: "saveToHassala", word, translation, mode }
    BG->>BG: يتحقق من sender.id + ينظّف الحقول
    BG->>H: { type: "append", word, translation, mode, file? }
    H->>H: يقرأ config.json + يتحقق من المسار
    alt الملف الافتراضي مش موجود
        H->>F: ينشئ الملف + الهيدر + tag
    else مسار مخصص
        H->>H: لازم يكون ملف .md موجود
    end
    H->>F: يقرأ المحتوى + يهرّب الرموز
    alt نفس الكلمة والترجمة موجودين
        H-->>BG: { ok: true, duplicate: true }
        BG-->>UI: «موجودة عندك ✓»
    else جديدة
        H->>F: يضيف صف بكاونتر جديد
        H-->>BG: { ok: true, duplicate: false, count }
        BG-->>UI: «اتحوشت ✓»
    end
```

**الضمانات:**

- الكتابة في ملف `.md` واحد بس.
- المسار المخصص لازم يكون موجود؛ الملف الافتراضي فقط هو اللي بيتعمل تلقائيًا.
- التكرار بيتم منعه بالزوج (كلمة + ترجمة) في الاتجاهين.
- الرموز `&`, `<`, `>`, `|`, `\` بتتهرّب قبل الكتابة.

---

## 5) تدفق يوتيوب

```mermaid
flowchart LR
    A["YouTube player"] --> B["youtube.js<br/>readCaptionLines()"]
    B --> C{"فيه CC؟"}
    C -->|"لأ"| D["السبتايتل الأصلي ظاهر"]
    C -->|"أيوه"| E["render(lines)<br/>سطرين بحد أقصى"]
    E --> F["hover على كلمة"]
    F --> G["pauseVideo()"]
    E --> H["click على كلمة"]
    H --> I["__AET_FLOATING_API__.translate()"]
    E --> J["drag على جملة"]
    J --> I
    I --> K["floating.js<br/>يفتح الصندوق ويترجم"]
```

- `youtube.js` و`floating.js` في نفس الـ isolated world، فالاتصال بينهم عن
  طريق كائن `globalThis.__AET_FLOATING_API__` مش DOM event.
- ده بيمنع أي سكربت في الصفحة إنه يطلق حدث ترجمة مزيف.
- السبتايتل الأصلي بيتخفي بـ CSS، ويرجع تاني لو مفيش CC أو الموقع متعطل.

---

## 6) التخزين

| المفتاح | المكان | المحتوى | ملاحظات |
| --- | --- | --- | --- |
| `hassalaFile` | `chrome.storage.local` | مسار ملف الحصالة الكامل | المفتاح الرسمي |
| `obsidianFile` | `chrome.storage.local` | مسار من نسخة قديمة | بيتقرأ مرة واحدة، بيتنقل لـ `hassalaFile`، وبعدها بيتمسح |
| `fabHidden` | `chrome.storage.local` | هل الزرار العائم مخفي | |
| `fabPos` | `chrome.storage.local` | مكان الزرار العائم | |
| `panelPos` | `chrome.storage.local` | مكان الصندوق | |
| `panelPinned` | `chrome.storage.local` | هل الصندوق مثبّت | |
| `blockedSites` | `chrome.storage.local` | قائمة المواقع المتعطلة | |
| `history` | `chrome.storage.local` | آخر ٨ كلمات | |
| `mode` | `chrome.storage.local` | اتجاه الترجمة المفضل | |

كاش الترجمة وكاش الصوت **مش** في التخزين الدائم؛ هما `Map` جوه الـ service
worker.

---

## 7) بروتوكول الـ Native Host

الرسائل بتتبعت بـ `chrome.runtime.sendNativeMessage` بصيغة JSON، وكل رسالة
ليها `type`:

| النوع | المدخلات | المخرجات |
| --- | --- | --- |
| `info` | — | اسم الـ host، النسخة، المسار الافتراضي، حالة الملف |
| `checkFile` | `file` | `ok`, `create`, `filePath`, أو `error` |
| `append` | `word`, `translation`, `mode`, `file?` | `ok`, `duplicate`, `count`, `filePath` |
| `openFile` | `file?` | `ok` أو `error` |
| `browse` | `root`, `files`, `showHidden` | قائمة ملفات/مجلدات |

**أخطاء معروفة:** `invalid_file`, `file_missing`, `write_failed`,
`vault_missing`, `config_error`, `timeout`.

**حدود:**

- أقصى حجم رسالة 1MB.
- أقصى طول حقل 200 حرف.
- أقصى طول مسار 4096 حرف.
- الـ host بيقرأ `config.json` جنبه، وبيتحقق من `realpath` قبل أي كتابة.

---

## 8) قرارات تصميمية

### ليه Shadow DOM مغلق؟

عشان الصفحة ما تقرأش النص المترجم أو عناصر الإدخال. الـ host element نفسه
ظاهر (عشان يتموضع)، لكن المحتوى جواه مش متاح لـ `page.shadowRoot`.

### ليه الـ background هو الوسيط الوحيد؟

- بيقلل عدد الأماكن اللي بتتعامل مع الشبكة.
- بيسمح بالتحقق من `sender.id` في مكان واحد.
- بيخلي النطق والحفظ والترجمة كلهم تحت نفس سياسة الأخطاء.

### ليه Native Host مش ملف مباشر؟

المتصفح ما بيسمحش لـ extension يكتب في أي مكان على القرص. الـ host عملية
محلية منفصلة، بتتقفل على Extension ID، وبتشتغل بصلاحيات المستخدم.

### ليه مفيش build step؟

- المشروع صغير ومقروء.
- أي حد يقدر يفتح `src/` ويفهمه.
- مفيش supply chain من مكتبات خارجية.
- الـ ZIP هو نفسه الملفات المصدرية.

### ليه الخط مضمّن؟

**Baloo Bhaijaan 2** بيضمن شكل موحّد للعربي والإنجليزي على كل الأجهزة، من غير
طلب شبكة إضافي. الترخيص SIL OFL موجود في `src/fonts/OFL.txt`.

---

## 9) حدود معروفة

- الترجمة بتعتمد على خدمات عامة، وممكن تفشل أو تتغير من غير إشعار.
- الـ Native Host لازم يتثبت يدويًا، ولازم يتعاد تسجيله لو الـ Extension ID
  اتغيّر.
- صفحات `chrome://` وصفحات المتجر الداخلية مش بيشتغل عليها content script.
- الملفات الكبيرة جدًا في `browse` ممكن تكون بطيئة؛ الـ host بيرجّع قائمة
  محدودة.
- مفيش مزامنة بين الأجهزة؛ كل جهاز ليه ملفه وإعداداته.

التفاصيل الأمنية في [SECURITY.md](SECURITY.md)، وسياسة الخصوصية في
[PRIVACY.md](PRIVACY.md).
