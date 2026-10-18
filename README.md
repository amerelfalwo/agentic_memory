---
title: Mnemos Cognitive Memory Backend
emoji: 🧠
colorFrom: green
colorTo: indigo
sdk: gradio
sdk_version: 5.20.0
app_file: app.py
pinned: false
license: apache-2.0
---

# Mnemos — Cognitive Memory AI Engine 🧠⚡

[![Deploy with Vercel](https://img.shields.io/badge/Frontend-Vercel-black?logo=vercel&style=flat-square)](https://rapid-geode-upm1g2t.vercel.app)
[![Deployed on Render](https://img.shields.io/badge/Backend-Render-46E3B7?logo=render&style=flat-square)](https://mnemos-backend-ehi5.onrender.com)
[![LangGraph](https://img.shields.io/badge/Orchestration-LangGraph-orange?style=flat-square)](https://github.com/langchain-ai/langgraph)
[![Weaviate](https://img.shields.io/badge/Vector%20DB-Weaviate%20Cloud-green?logo=weaviate&style=flat-square)](https://weaviate.io)
[![FastAPI](https://img.shields.io/badge/API-FastAPI-009688?logo=fastapi&style=flat-square)](https://fastapi.tiangolo.com)
[![Next.js 16](https://img.shields.io/badge/UI-Next.js%2016-black?logo=next.js&style=flat-square)](https://nextjs.org)

**Mnemos** هو محرك ذكاء اصطناعي إدراكي متكامل مبني على إطار عمل **CoALA** (Cognitive Architectures for Language Agents) و **LangGraph**. يقوم النظام بتحويل التفاعل مع النماذج اللغوية من مجرد محادثة لحظية عديمة الحالة (Stateless) إلى وكيل إدراكي ذكي يمتلك ذاكرة رباعية الأبعاد (رباعية الطبقات)، مع حراسة أمنية استباقية (Security Guardrail)، وتمثيل بصري تفاعلي لحركة البيانات بين الذاكرة والوكيل، وتتبع تفصيلي لحظة بلحظة (Turn-by-Turn Diff) لكل نوع من أنواع الذاكرة.

---

## 🌐 الروابط الحية للمشروع (Live Deployments)

| المكون (Component) | رابط النشر (Live URL) | الحالة (Status) |
|---|---|---|
| **الواجهة الأمامية (Frontend UI)** | 🚀 **[https://rapid-geode-upm1g2t.vercel.app](https://rapid-geode-upm1g2t.vercel.app)** | ✅ Live on Vercel |
| **الخلفية ومحرك الذكاء (FastAPI Backend)** | ⚙️ **[https://mnemos-backend-ehi5.onrender.com](https://mnemos-backend-ehi5.onrender.com)** | ✅ Live on Render |
| **فحص الصحة الحية (Health Check)** | 🩺 **[https://mnemos-backend-ehi5.onrender.com/health](https://mnemos-backend-ehi5.onrender.com/health)** | ✅ 200 OK |
| **توثيق الواجهات التفاعلي (Swagger UI)** | 📖 **[https://mnemos-backend-ehi5.onrender.com/docs](https://mnemos-backend-ehi5.onrender.com/docs)** | ✅ Interactive Docs |

---

## 🏗️ ملخص ما تم إنجازه في المشروع (What Was Built)

### 1. تحويل الـ Jupyter Notebook إلى بنية تحتية برمجية بمعمارية Clean Architecture
* تم تفكيك ملف التجارب الأولي (`agentic_memory_langgraph.ipynb`) إلى مشروع برمجيات مؤسسي كامل مفصول الطبقات وفقاً لمبادئ **Clean Architecture**:
  * **Domain Layer**: يحتوي على النماذج الأساسية (`EpisodicRecord`, `SemanticChunk`, `ProceduralRule`, `TurnMemoryDiff`) والعقود والمنافذ (`Ports`).
  * **Application Layer**: خدمات التنسيق وقياس الفروقات (`SnapshotCoordinatorService`, `MemoryDiffEngine`, DTOs).
  * **Infrastructure Layer**: محرك `LangGraphEngine`، محول `WeaviateAdapter` مع دعم السحابة والـ Fallback المحلي، وتكامل `GroqService`، وحارس `SecurityGuardrail`.
  * **Presentation Layer**: واجهات REST و Server-Sent Events (SSE) متقدمة مع توثيق OpenAPI كامل.

### 2. محرك الذاكرة الإدراكية الرباعي (CoALA 4-Tier Memory System)
* **⚡ Working Memory (الذاكرة العاملة)**: تدير سياق الحوار الحالي، وتطبق تلخيصاً تلقائياً ذكياً (Context Summarization) عند تجاوز عتبة الـ 10 رسائل لمنع امتلاء سياق النموذج (Context Window Overflow).
* **📖 Episodic Memory (الذاكرة العرضية / العبر المستفادة)**: تسجل تجارب التفاعل السابقة، وتستخلص بعد كل حوار مراجعة ذاتية (Self-Reflection): *"ما الذي نجح؟ (What Worked)"* و *"ما الذي يجب تفاديه؟ (What to Avoid)"*، وتخزنها في قاعدة Weaviate السحابية.
* **📚 Semantic Memory (الذاكرة الدلالية / المعرفية)**: مستودع المعرفة المرجعية لورقة بحث CoALA الأكاديمية (`CoALA_Paper.pdf`) مع بحث متجهي وهجين (Hybrid & BM25 Vector Search) لتزويد الوكيل بإجابات موثقة علمياً.
* **📋 Procedural Memory (الذاكرة الإجرائية / القواعد السلوكية)**: ملف القواعد الحية (`procedural_memory_lg.txt`) الذي يوجه طريقة تفكير الوكيل وصياغة ردوده. تتطور القواعد تلقائياً أو يمكن تعديلها لحظياً من خلال الواجهة.

### 3. درع الحماية الأمني (Security Guardrail)
* طبقة حماية تستبق تنفيذ أي أمر، تقوم بفحص مدخلات المستخدم ضد هجمات الـ Prompt Injection، ومحاولات تسريب التوجيهات النظامية (System Prompt Leakage)، أو كسر القواعد (Jailbreaking)، وإيقاف أي هجوم مع إصدار تنبيه أمني فوري في الواجهة.

### 4. واجهة المستخدم التفاعلية (Next.js 16 + React Flow + Tailwind)
* **رسم بياني لتوصيلات الذاكرة (Memory Connection Topology Graph)**:
  * جراف تفاعلي حي مبني بـ React Flow يربط بين عقل الوكيل (`Mnemos Core Agent`) وكافة أنظمة الذاكرة الأربعة بالإضافة إلى درع الحماية والأدوات.
  * نبضات بصرية تفاعلية (Active Data Pulses) تُظهر بالزمن الحقيقي أي ذاكرة يتم قراءتها أو تحديثها أثناء التفكير.
* **مفتش التحديثات الفارق لحظة بلحظة (Turn-by-Turn Granular Memory Diff Inspector)**:
  * تلبية لطلب المستخدم: عند زيادة الحوار، يتيح المفتش استعراض ما طرأ على كل ذاكرة بشكل منفصل في كل Turn:
    * الفروقات النصية الدقيقة الملونة في القواعد الإجرائية (`ADDED`, `MODIFIED`, `UNCHANGED`).
    * القطع المعرفية المسترجعة من الذاكرة الدلالية مع درجات التشابه (Relevance Scores).
    * الانعكاسات المحفوظة في الذاكرة العرضية.
    * حجم استهلاك الـ Tokens وعدد الرسائل في الذاكرة العاملة.
* **محرر القواعد الإجرائية الحي (Procedural Rules Modal)**: تحرير مباشر لقواعد الوكيل وحفظها على السيرفر مباشرة.
* **مؤشرات الاتصال الحية (Health & Service Status)**: حالة اتصال Groq LLM، و Weaviate Cloud، ومحرك الأمان.

### 5. حل معضلة الردود الفارغة (LangGraph State Reducer Fix)
* تم اكتشاف وحل مشكلة اختفاء الردود الناتجة عن مسح تاريخ الرسائل أثناء استدعاء الأدوات (`ToolNode`)، من خلال إضافة `Annotated[List[Any], add_messages]` في `AgentState` داخل [state.py](file:///mnt/work/agentic_memory/backend/app/infrastructure/langgraph/state.py)، مما ضمن استقرار الحوار وعمل البث المباشر للردود بكفاءة تامة.

### 6. النشر السحابي الكامل (Production Cloud Deployments)
* **Render**: نشر الـ Backend باستخدام بيئة Python الحديثة، وتجهيز منافذ الـ CORS، ودعم اتصالات Weaviate Cloud.
* **Weaviate Cloud (WCS)**: ربط قاعدة البيانات السحابية مع آلية المرونة الذاتية (Resilient Fallback) لمنع أي انقطاع للخدمة.
* **Vercel**: نشر الـ Frontend على أحدث بنية تحتية لـ Next.js وتوجيه الطلبات تلقائياً إلى سيرفر Render.

---

## 🏛️ المخطط المعماري للنظام (System Architecture)

```mermaid
flowchart TB
    subgraph Client["Frontend UI (Next.js 16 / Vercel)"]
        UI_Chat["💬 Chat Panel (SSE Stream)"]
        UI_Graph["🕸️ Memory Topology Graph (React Flow)"]
        UI_Diff["🔍 Turn-by-Turn Memory Diff Inspector"]
        UI_Rules["✏️ Procedural Rules Editor"]
    end

    subgraph Backend["FastAPI Backend (Render)"]
        subgraph Guard["Security Layer"]
            Sec["🛡️ Security Guardrail\n(Prompt Injection Interceptor)"]
        end

        subgraph Core["LangGraph Cognitive Engine"]
            Agent["🤖 Mnemos Core Agent\n(Groq Qwen 3.8-27B)"]
            Router{"Decision / Tool Router"}
            Reflect["🧠 Memory Reflection Node"]
            Summary["📝 History Summarizer"]
        end

        subgraph MemoryStores["CoALA 4-Tier Memory Subsystem"]
            WM["⚡ Working Memory\n(In-Memory Dialogue Buffer)"]
            EM["📖 Episodic Memory\n(Weaviate Cloud / Episodic_memory)"]
            SM["📚 Semantic Memory\n(CoALA_Paper Hybrid Vectors)"]
            PM["📋 Procedural Memory\n(procedural_memory_lg.txt)"]
        end
    end

    UI_Chat -->|1. User Prompt (SSE)| Sec
    Sec -->|Safe Prompt| Agent
    Sec -.->|Blocked Attack| UI_Chat

    Agent <-->|Read / Compress| WM
    Agent <-->|Recall / Update Reflections| EM
    Agent <-->|Hybrid Search| SM
    Agent <-->|Read Rules / Evolve| PM

    Agent --> Router
    Router -->|Finalize Turn| Reflect
    Reflect -->|Audit & Diff Snapshot| UI_Diff
    Reflect -->|Live Node Pulse| UI_Graph
```

---

## 📁 هيكلية المشروع (Project Directory Tree)

```text
agentic_memory/
├── backend/                                # FastAPI Clean Architecture Backend
│   └── app/
│       ├── core/                           # الإعدادات، الحماية، التسجيل، الأخطاء
│       │   ├── config.py                   # استقراء المتغيرات البيئية من .env و Render
│       │   ├── guardrail.py                # فاحص الاختراق وحماية الـ System Prompt
│       │   └── logging.py                  # تسلسل الأحداث المهيكل
│       ├── domain/                         # نطاق التطبيق والمفاهيم المجردة
│       │   ├── models/                     # نماذج الذاكرة والفروقات (Diff Models)
│       │   └── ports/                      # واجهات التجريد للـ Vector DB و الـ LLM
│       ├── application/                    # طبقة التطبيق ومنطق الأعمال
│       │   ├── services/                   # خدمة التنسيق والتقاط الفروقات (SnapshotCoordinator)
│       │   └── dtos/                       # كائنات نقل البيانات (Request/Response DTOs)
│       ├── infrastructure/                 # طبقة البنية التحتية والربط الخارجي
│       │   ├── langgraph/                  # عُقد ومسارات LangGraph و AgentState
│       │   ├── vector_db/                  # محول Weaviate السحابي + InMemoryFallback
│       │   ├── llm/                        # ربط Groq LLM (Qwen 3.8-27B)
│       │   └── repositories/               # مستودعات تخزين القواعد والفروقات
│       └── presentation/                   # طبقة العرض والواجهات البرمجية
│           ├── main.py                     # نقطة دخول FastAPI وإعدادات CORS
│           └── api/v1/                     # مسارات /chat, /memories, /rules
├── frontend/                               # Next.js 16 Web Application
│   ├── src/
│   │   ├── app/                            # Next.js App Router (الصفحة الرئيسية /chat)
│   │   ├── components/                     # المكونات التفاعلية
│   │   │   ├── ChatPanel.tsx               # شاشة المحادثة والبث المباشر
│   │   │   ├── MemoryTopologyGraph.tsx     # جراف توصيلات الذاكرة التفاعلي (React Flow)
│   │   │   ├── MemoryDiffView.tsx          # مفتش تحديثات الذاكرة التفصيلي
│   │   │   └── ProceduralRulesModal.tsx    # محرر القواعد الإجرائية
│   │   ├── lib/api.ts                      # عميل استدعاء الـ API ودعم SSE
│   │   └── types/                          # تعريفات TypeScript الكاملة
│   ├── .env.production                     # إعدادات الإنتاج لنشر Vercel
│   └── package.json
├── langgraph/
│   ├── agentic_memory_langgraph.ipynb      # النوت بوك الأصلي الاستكشافي
│   └── procedural_memory_lg.txt            # القواعد الإجرائية الحية القابلة للتطور
├── CoALA_Paper.pdf                         # مرجع ورقة CoALA للبحث الدلالي
├── render.yaml                             # ملف تكوين النشر السحابي على Render
├── docker-compose.yml                      # لتشغيل Weaviate محلياً عبر Docker
├── pyproject.toml                          # حزم واعتمادات Python
└── README.md                               # الدليل الشامل للمشروع
```

---

## 🛠️ دليل التشغيل المحلي (Local Development Setup)

### المتطلبات الأساسية
* Python 3.10+ (يفضل استخدام `uv`)
* Node.js 18+ و `npm`
* مفتاح Groq API Key

### 1. إعداد الخلفية (Backend)
```bash
# 1. تثبيت الحزم باستخدام uv
uv sync
# أو باستخدام pip التقليدي:
# pip install -e .

# 2. إنشاء وتعديل ملف البيئة .env
cp .env.example .env
```
محتوى ملف `.env`:
```env
GROQ_API_KEY=gsk_your_groq_api_key_here
model=groq:qwen/qwen3.8-27b
WEAVIATE_URL=https://your-cluster-url.weaviate.cloud
WEAVIATE_API_KEY=your_weaviate_api_key_here
```

تشغيل سيرفر الـ Backend:
```bash
uv run uvicorn backend.app.presentation.main:app --host 0.0.0.0 --port 8000 --reload
```
سيكون التوثيق التفاعلي متاحاً على:
* [http://localhost:8000/docs](http://localhost:8000/docs)

---

### 2. إعداد الواجهة الأمامية (Frontend)
في نافذة طرفية جديدة:
```bash
cd frontend
npm install
npm run dev
```
افتح المتصفح على:
* **[http://localhost:3000](http://localhost:3000)**

---

## 🚀 دليل النشر السحابي (Cloud Deployment Guide)

### أولاً: نشر الـ Backend على Render
1. في لوحة تحكم **Render**، أنشئ **New Web Service** واربط مستودع الـ GitHub.
2. حدد الإعدادات التالية:
   * **Root Directory**: فارغ (جذر المستودع).
   * **Environment**: `Python 3`
   * **Build Command**: `pip install -e .`
   * **Start Command**: `uvicorn backend.app.presentation.main:app --host 0.0.0.0 --port $PORT`
3. في تبويب **Environment** أضف المتغيرات:
   * `GROQ_API_KEY`: مفتاح Groq الخاص بك.
   * `WEAVIATE_URL`: رابط كلاستر Weaviate Cloud الخاص بك.
   * `WEAVIATE_API_KEY`: مفتاح Weaviate Cloud الخاص بك.

### ثانياً: نشر الـ Frontend على Vercel
1. في لوحة تحكم **Vercel**، اختر **Import Project** وحدد مستودع المشروع.
2. حدد **Root Directory** ليكون مجلد `frontend`.
3. أضف متغير البيئة:
   * `NEXT_PUBLIC_API_URL`: رابط الـ Backend على Render متبوعاً بـ `/api/v1` (مثال: `https://mnemos-backend-ehi5.onrender.com/api/v1`).
4. اضغط **Deploy**.

---

## 📡 واجهات البرمجة الرئيسية (API Reference)

| المسار (Endpoint) | الطريقة (Method) | الوصف (Description) |
|---|---|---|
| `/health` | `GET` | فحص صحة النظام، حالة Groq، ونوع اتصال Weaviate. |
| `/api/v1/chat/stream` | `POST` | بث محادثة الوكيل حياً بالـ Tokens وتحديثات الذاكرة عبر SSE. |
| `/api/v1/memories/topology` | `GET` | إرجاع هيكلية الـ Graph والروابط الحية بين الوكيل وأنظمة الذاكرة. |
| `/api/v1/memories/diffs/{session_id}` | `GET` | قائمة الفروقات الدقيقة لكل دور (Turn-by-Turn Memory Diff). |
| `/api/v1/memories/procedural` | `GET / PUT` | جلب القواعد الإجرائية الحية وتعديلها بالكامل. |
| `/api/v1/chat/reset` | `POST` | تصفير الجلسة ومسح الذاكرة العاملة لبدء حوار جديد. |

---

## 📜 المراجع الأكاديمية (References)
* **CoALA Framework**: *Cognitive Architectures for Language Agents* (Sumers et al., 2023) - [arXiv:2309.02427](https://arxiv.org/abs/2309.02427).
* **LangGraph**: *Building Stateful Multi-Actor Applications with LLMs* - LangChain.
* **Weaviate**: *Cloud Vector Database for Semantic Search and Hybrid Retrieval*.
