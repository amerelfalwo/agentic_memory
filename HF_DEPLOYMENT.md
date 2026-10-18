# دليل رفع وتشغيل الباك إند على Hugging Face Spaces 🚀
# Hugging Face Spaces Backend Deployment Guide

هذا الدليل يوضح خطوة بخطوة كيفية رفع وتشغيل الـ Backend (FastAPI + LangGraph + Weaviate + Groq) على **Hugging Face Spaces** باستخدام **Docker Space** بدلاً من Render.

---

## 🌟 مميزات Hugging Face Spaces مقارنة بـ Render
1. **مجاني وبدون حدود وقت صارمة**: يوفر مساحة عمل سحابية قوية ومستقرة.
2. **دعم كامل لـ Docker**: يعمل المشروع بنفس بيئته وبكافة ملحقاته (Weaviate, Groq, PDF parsing).
3. **سرعة الاستجابة**: يدعم Server-Sent Events (SSE) والـ Streaming بكفاءة عالية وبدون انقطاع.

---

## الخطوة 1: إنشاء Space جديد على Hugging Face
1. ادخل على حسابك في [Hugging Face](https://huggingface.co/).
2. اضغط على صورتك الشخصية واختر **New Space** أو توجه مباشرة إلى:
   👉 **[https://huggingface.co/new-space](https://huggingface.co/new-space)**
3. املأ البيانات كالتالي:
   - **Space name**: مثلاً `mnemos-backend` أو `agentic-memory`
   - **License**: `apache-2.0` أو `mit`
   - **Select the Space SDK**: اختر **Docker** 🐳 ثم **Blank**.
   - **Space hardware**: اختر **CPU basic · 2 vCPU · 16 GB · Free** (كافٍ جداً ومجاني).
   - **Visibility**: اختر **Public** (ليتمكن الفرونت إند من الاتصال به).
4. اضغط على **Create Space**.

---

## الخطوة 2: إضافة المتغيرات السرية (Secrets) في Hugging Face
قبل رفع الكود، يجب إضافة مفاتيح الـ API في إعدادات الـ Space ليعمل بشكل سليم:

1. من داخل صفحة الـ Space، اضغط على تبويب **Settings**.
2. انزل إلى قسم **Variables and secrets**.
3. في قسم **Secrets**، اضغط **New secret** وأضف القيم التالية:

| Secret Name | القيمة (Value) | الوصف |
|---|---|---|
| `GROQ_API_KEY` | مفتاح Groq الخاص بك (مثلاً `gsk_...`) | للاتصال بنماذج الذكاء الاصطناعي |
| `WEAVIATE_API_KEY` | مفتاح Weaviate Cloud الخاص بك | لقاعدة البيانات الشعاعية |
| `WEAVIATE_URL` | عنوان كلاستر Weaviate (مثلاً `cgth...weaviate.cloud`) | رابط قاعدة بيانات المعرفة |
| `model` | `qwen/qwen3.8-27b` | الموديل الأساسي (اختياري) |

---

## الخطوة 3: رفع الكود إلى Hugging Face Space

### الطريقة الأولى: الرفع المباشر عبر Git (الأسهل والأسرع)
في جهازك المحلي داخل مجلد المشروع، نفذ الأوامر التالية (استبدل `YOUR_USERNAME` و `YOUR_SPACE_NAME` باسم حسابك واسم الـ Space):

```bash
# 1. إضافة الـ Remote الخاص بـ Hugging Face
git remote add hf https://huggingface.co/spaces/YOUR_USERNAME/YOUR_SPACE_NAME

# 2. رفع الكود (سيطلب منك Hugging Face Username والـ Access Token ككلمة مرور)
git push hf main
```

> **ملاحظة:** عند طلب كلمة المرور، استخدم **Access Token** بصلاحية Write من:
> 👉 [https://huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)

---

### الطريقة الثانية: المزامنة التلقائية عبر GitHub Actions (CI/CD)
إذا كان الكود موجوداً على GitHub وتريد أن يقوم GitHub تلقائياً برفع أي تحديث إلى Hugging Face:

1. في مستودع GitHub الخاص بك، اذهب إلى:
   `Settings` -> `Secrets and variables` -> `Actions` -> `New repository secret`
2. أضف سراً جديداً باسم:
   - `HF_TOKEN`: التوكن الخاص بحسابك في Hugging Face (نوعه Write).
3. تم إعداد ملف Workflow مسبقاً في:
   `.github/workflows/sync_to_hf.yml`
   بمجرد تفعيل الـ Secret وعمل Push على `main`، سيتم التحديث في Hugging Face تلقائياً!

---

## الخطوة 4: التحقق من نجاح التشغيل والحصول على الرابط الحي
1. بعد الرفع، سيبدأ الـ Space في بناء الـ Docker Container تلقائياً (Build -> Running).
2. الرابط الحي للـ API سيكون بالصيغة:
   ```
   https://YOUR_USERNAME-YOUR_SPACE_NAME.hf.space
   ```
3. يمكنك اختبار الـ Endpoints مباشرة في المتصفح:
   - فحص الصحة: `https://YOUR_USERNAME-YOUR_SPACE_NAME.hf.space/health`
   - توثيق الـ API التفاعلي: `https://YOUR_USERNAME-YOUR_SPACE_NAME.hf.space/docs`

---

## الخطوة 5: ربط الواجهة الأمامية (Frontend) على Vercel
لتوجيه الفرونت إند لاستخدام سيرفر Hugging Face بدلاً من Render:

1. اذهب إلى لوحة تحكم مشروعك على [Vercel](https://vercel.com/).
2. اختر مشروع الفرونت إند -> `Settings` -> `Environment Variables`.
3. قم بتعديل أو إضافة المتغير:
   - **Key**: `NEXT_PUBLIC_API_URL`
   - **Value**: `https://YOUR_USERNAME-YOUR_SPACE_NAME.hf.space/api/v1`
4. أعد نشر الفرونت إند (Redeploy) في Vercel لتطبيق الرابط الجديد.
