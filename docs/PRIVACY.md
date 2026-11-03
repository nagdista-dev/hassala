# سياسة الخصوصية — حصالة

**آخر تحديث:** 3 نوفمبر 2026

**نسخة عامة للمتجر:**
<https://gist.github.com/nagdista-dev/282cc2ce8fe35c5fb7199f7ffd2cd705>

حصالة إضافة متصفح عربية لترجمة الكلمات وحفظها في بنك كلمات على جهازك. السياسة
دي بتشرح إيه البيانات اللي الإضافة بتتعامل معاها، وفين بتروح، وإزاي تقدر
تتحكم فيها.

## 1. البيانات اللي الإضافة بتتعامل معاها

- **النص اللي بتكتبه أو بتحدده للترجمة:** الكلمة أو الجملة اللي بتطلب ترجمتها.
- **الكلمات المحفوظة:** الكلمة الأصلية والترجمة، وبيتكتبوا في ملف Markdown
  على جهازك.
- **الإعدادات:** مسار ملف الحصالة، حالة الزرار العائم، مكان الصندوق، والمواقع
  اللي عطّلت عليها الإضافة.
- **سجل آخر الكلمات:** آخر ٨ كلمات بتتخزن محليًا في المتصفح لتسهيل الرجوع لها.
- **كاش الترجمة:** في ذاكرة الـ service worker، وبيتمسح لما المتصفح يقفل أو
  الـ worker يتوقف.
- **كاش الصوت:** ملفات النطق المؤقتة في ذاكرة الـ service worker، وبتتمسح
  تلقائيًا.

الإضافة **مش** بتجمع: الاسم، الإيميل، رقم الهاتف، الموقع الجغرافي، سجل التصفح،
أو أي بيانات شخصية تانية.

## 2. النص بيتستخدم إزاي

النص اللي بتطلب ترجمته بيتبعت مباشرة لخدمات الترجمة:

- **Google Translate endpoints** (`translate.googleapis.com` و
  `clients5.google.com`)
- **MyMemory** (`api.mymemory.translated.net`) كخطة بديلة لو Google فشل.
- **Google Translate TTS** (`translate.googleapis.com` و
  `translate.google.com`) لو ضغطت على زرار النطق.

الخدمات دي بترجّع الترجمة أو الصوت للإضافة. حصالة مش بتحتفظ بالنص على
سيرفراتها، ومفيش سيرفر خاص بحصالة أصلًا.

## 3. الكلمات المحفوظة

لما بتضغط **أضف للحصالة**، الإضافة بتبعت الكلمة والترجمة لـ Native Messaging
Host صغير على جهازك. الـ Host بيكتبهم في ملف Markdown واحد انت اللي اخترته
بمساره الكامل.

- الحفظ بيتم محليًا على جهازك.
- الـ Host مش بيبعت الكلمات لأي مكان.
- الـ Host بيرفض أي ملف مش `.md`، وبيرفض إنشاء ملفات مخصصة غير موجودة.
- الملف الافتراضي الوحيد اللي ممكن يتعمل تلقائيًا هو
  `~/Documents/Hassala Words.md`.
- الـ Host مش بيكتب في أي ملف تاني غير الملف المختار.

## 4. مين بيشوف البيانات

- **خدمات الترجمة:** النص بيتبعت لـ Google و/أو MyMemory حسب الحاجة. راجع
  سياسات الخصوصية بتاعتهم:
  - [Google Privacy Policy](https://policies.google.com/privacy)
  - [MyMemory Privacy Policy](https://mymemory.translated.net/doc/privacy.php)
- **مفيش طرف تالت تاني:** مفيش تحليلات، مفيش تتبع، مفيش إعلانات، ومفيش بيع
  بيانات.
- **مفيش حسابات:** الإضافة مش بتطلب تسجيل دخول.

## 5. التخزين والمدة

- إعدادات الإضافة وسجل آخر الكلمات بيتخزنوا في `chrome.storage.local` على
  جهازك.
- كاش الترجمة وكاش الصوت في ذاكرة الـ service worker، وبيتمسحوا تلقائيًا.
- ملف الحصالة بيفضل موجود على جهازك لحد ما انت تمسحه.
- تقدر تمسح سجل الكلمات من البوب، أو تمسح بيانات الإضافة من المتصفح.
- لو عايز تمسح كل حاجة: امسح ملف الحصالة، وامسح الإضافة أو بياناتها من
  المتصفح.

## 6. الصلاحيات وليه محتاجة كل واحدة

- **`storage`**: حفظ الإعدادات وسجل الكلمات محليًا.
- **`nativeMessaging`**: التواصل مع الـ Native Host اللي بيكتب ملف الحصالة.
- **`scripting`**: حقن واجهة المترجم في الصفحة لما تدوس على أيقونة الإضافة.
- **`activeTab`**: التعامل مع التاب الحالي لما تطلب الترجمة.
- **`offscreen`**: تشغيل النطق الصوتي من غير ما تفتح نافذة.
- **Host permissions**: الاتصال بخدمات الترجمة المذكورة فوق بس.

الإضافة مش بتطلب صلاحية قراءة كل بياناتك، ومش بتشتغل على صفحات المتصفح
الداخلية (`chrome://` وغيرها).

## 7. الأمان

- كل الاتصالات بخدمات الترجمة بتتم عبر HTTPS.
- الـ Native Host بيستقبل رسائل من الإضافة بس، عن طريق `allowed_origins`
  اللي فيه Extension ID.
- الـ Host بيرفض المسارات اللي مش `.md`، وبيرفض إنشاء ملفات مخصصة غير موجودة،
  وبيتحقق من إن الملف موجود وقابل للكتابة.
- الكلمات اللي فيها رموز Markdown خطيرة بتتهرّب قبل الكتابة، عشان ما تكسرش
  الملف وما تشغّلش HTML.
- الإضافة مش بتحمّل كود من الإنترنت، وكل الكود جوه الحزمة.
- مفيش `eval`، مفيش `new Function`، ومفيش سكربتات inline.

التفاصيل الكاملة في [SECURITY.md](SECURITY.md).

## 8. الأطفال

حصالة مش موجهة للأطفال تحت 13 سنة، ومش بتجمع بيانات شخصية منهم.

## 9. التغييرات على السياسة

لو السياسة اتغيرت، هنحدّث التاريخ فوق وهنوضح التغيير في الريبو. استمرارك في
استخدام الإضافة بعد التحديث معناه موافقتك على السياسة الجديدة.

## 10. التواصل

لأي سؤال أو طلب يتعلق بالخصوصية:

- لو معاك وصول للريبو الخاص، افتح Issue.
- أو استخدم تبويب **Support** في صفحة الإضافة على Chrome Web Store.

---

# Privacy Policy — Hassala

**Last updated:** November 3, 2026

Hassala is an Arabic-first browser extension for translating words and saving
them to a word bank on your device. This policy explains what data the extension
handles, where it goes, and how you can control it.

## Data the extension handles

- **Text you type or select for translation.**
- **Saved words:** the source word and its translation, written to a Markdown
  file on your device.
- **Settings:** your word-bank file path, floating-button state, panel position,
  and blocked sites.
- **Recent words:** the last 8 words are stored locally in the browser.
- **Translation cache:** translations cached in service-worker memory only.
- **Audio cache:** temporary pronunciation audio in service-worker memory only.

Hassala does **not** collect your name, email, phone number, location, browsing
history, or any other personal data.

## How text is used

Text you ask to translate is sent directly to translation providers:

- **Google Translate endpoints** (`translate.googleapis.com` and
  `clients5.google.com`)
- **MyMemory** (`api.mymemory.translated.net`) as a fallback.
- **Google Translate TTS** (`translate.googleapis.com` and
  `translate.google.com`) when you press the pronunciation button.

Hassala has no backend server and does not retain your text.

## Saved words

When you click **Add to Hassala**, the extension sends the word and translation
to a small native messaging host on your device. The host appends them to one
Markdown file whose full path you chose. Everything stays local. The host does
not upload your words, rejects non-Markdown files, and does not create custom
files that do not already exist. The only file it may create automatically is
the default `~/Documents/Hassala Words.md`.

## Sharing

- Text is shared only with the translation providers listed above, as needed.
- No analytics, tracking, advertising, or data sales.
- No accounts or sign-in.

## Retention and control

- Settings and recent words live in `chrome.storage.local`.
- Translation and audio caches are in memory and are cleared automatically.
- Your Markdown word bank stays on your device until you delete it.
- You can clear the word history from the extension settings or clear the
  extension's data from your browser.

## Permissions

- **`storage`** — save settings and recent words locally.
- **`nativeMessaging`** — write your Markdown word bank through the local host.
- **`scripting`** — inject the translator UI when you click the toolbar icon.
- **`activeTab`** — act on the current tab when you request a translation.
- **`offscreen`** — play pronunciation audio without opening a window.
- **Host permissions** — connect only to the translation providers above.

## Security

- All translation requests use HTTPS.
- The native host accepts messages only from this extension via
  `allowed_origins`.
- The host rejects non-Markdown paths, refuses to create custom files that do
  not exist, and verifies that the selected file exists and is writable.
- Dangerous Markdown/HTML characters are escaped before writing.
- The extension does not load remote code.

## Children

Hassala is not directed to children under 13 and does not knowingly collect
personal data from them.

## Changes

If this policy changes, the date above will be updated and the change will be
documented in the repository.

## Contact

If you have access to the private repository, open an issue. Otherwise use the
**Support** tab on the Chrome Web Store listing.
