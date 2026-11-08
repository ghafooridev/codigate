<div dir="rtl" lang="fa">

# کدگیت (Codigate) — سند کامل معماری، فلوها و سناریوها

این سند توصیف صفر تا صد مخزن `codigate` است؛ همان چیزی که امروز در کد پیاده‌سازی شده، نه طرح قدیمی‌تر. منبع حقیقت، کد TypeScript داخل `apps/` و `packages/` است. فایل `CG.md` یک راهنمای معماری قدیمی با نام «Pod MCP» است و با محصول فعلی (پلتفرم تحلیل ایستا به‌علاوه بازبینی اختیاری هوش مصنوعی) یکی نیست. فایل `README.md` فقط ورود سریع است. تصمیم معماری رسمی در `docs/adr/0001-product-surfaces-and-analysis-architecture.md` ثبت شده و در بخش‌های پایین با رفتار واقعی کد تطبیق داده شده است.

جهت نوشتار این فایل راست‌به‌چپ است. شناسه‌های کد، مسیر فایل‌ها، دستورها و بلوک‌های کد به زبان اصلی منبع مانده‌اند تا با مخزن یکی باشند.

---

## ۱. محصول چیست

کدگیت یک موتور تحلیل مهندسی نرم‌افزار برای مخزن کد است. کار اصلی‌اش این است:

1. فایل‌های متنی پروژه را بخواند.
2. قانون‌های ایستا (امنیت، کیفیت، معماری، تست، کارایی، سئو، قرارداد تیمی) را روی آن‌ها اجرا کند.
3. ساختار کد را با عبارت منظم ایندکس کند و جای خالی تست را تخمین بزند.
4. امتیاز دسته‌بندی‌شده و امتیاز کلی بسازد.
5. نتیجه را در تاریخچه محلی `.codigate/history.jsonl` ذخیره کند.
6. در صورت پیکربندی یک نقطهٔ پایانی سازگار با OpenAI، همان یافته‌ها را با مدل زبانی غنی کند، اصلاح پیشنهاد دهد و تست تولید کند.
7. در حالت تحلیل درخواستی، آسیب‌پذیری و کهنگی وابستگی npm را هم بررسی کند و اگر پوشش تست زیر آستانه باشد، تا چند دور تست تولید و اعمال کند.
8. نتیجه را از سه سطح محصول تحویل دهد: خط فرمان، افزونهٔ VS Code، و سرور MCP برای عامل‌های هوش مصنوعی.
9. دروازهٔ کیفیت را برای CI ارزیابی کند و در صورت رد شدن، کد خروج غیرصفر برگرداند.
10. یک پنل محلی فقط روی `127.0.0.1` نشان دهد.
11. در صورت وجود ریموت گیت‌هاب و توکن، پول‌ریکوئست بسازد یا روی پول‌ریکوئست موجود کامنت بگذارد.
12. اگر آرگومان یک آدرس گیت‌لب باشد، مخزن را کم‌عمق کلون یا به‌روز کند و بعد تحلیل کند.

اصل محصول، که در ADR هم آمده: **یافتهٔ قانون ایستا منبع حقیقت است.** مدل زبانی جایگزین قانون نیست؛ اگر کلید یا آدرس یا نام مدل نباشد، `scan` و `gate` همچنان کار می‌کنند. دستور `analyze` هم بدون هوش مصنوعی گزارش می‌دهد، ولی تولید تست و `fix` به هر سه مقدار پیکربندی هوش مصنوعی نیاز دارند.

سطوح محصول:

| سطح | نقش | چه کاری از موتور می‌گیرد |
| --- | --- | --- |
| CLI (`apps/cli`) | سطح اصلی روزانه و CI | اسکن، تحلیل، دروازه، اصلاح، تولید تست، اجرای تست، پنل، پول‌ریکوئست |
| افزونهٔ VS Code (`apps/vscode-extension`) | سطح اصلی داخل ادیتور | اسکن، تحلیل، تشخیص درون‌خطی، درخت امتیاز و یافته، اصلاح، باز کردن پنل |
| سرور MCP (`apps/mcp-server`) | آداپتر نازک برای عامل | ساختار پوشه، اسکن ایستا، خواندن فایل داخل ریشه |

منطق کسب‌وکار داخل نقطهٔ ورود این سه برنامه نیست. هر سه، یوزکیس‌های `packages/application` را صدا می‌زنند و پیاده‌سازی پورت‌ها در `packages/core` است.

---

## ۲. پشته و ابزار ساخت

| لایه | انتخاب |
| --- | --- |
| زمان اجرا | Node.js (در CI نسخهٔ ۲۲) |
| زبان | TypeScript سخت‌گیر (`strict`، هدف `es2022`، ماژول `nodenext`) |
| مونوریپو | Nx 23.1 با پلاگین‌های `@nx/js` و `@nx/eslint` |
| مدیر بسته | npm workspaces روی `packages/*` و `apps/*` |
| باندل برنامه‌ها | esbuild از طریق `@nx/esbuild`، خروجی CommonJS |
| کتابخانه‌ها | کامپایل با `@nx/js:tsc`، فقط declaration در تنظیم پایه (`emitDeclarationOnly`) به‌علاوه ساخت Nx |
| تست | Vitest 3، محیط node، الگوی `packages/**/*.spec.ts` و `apps/**/*.spec.ts` |
| لینت | ESLint 9 تخت به‌علاوه typescript-eslint و prettier |
| قالب | Prettier با `singleQuote: true` |
| YAML | بستهٔ `yaml` نسخهٔ ۲٫۹ فقط در `@codigate/core` |
| اعتبارسنجی ورودی MCP | Zod 4 |
| پروتکل عامل | `@modelcontextprotocol/server` نسخهٔ ۲، حمل روی stdio |
| API گیت‌هاب | `fetch` به `https://api.github.com` |
| API مدل | `POST {apiBase}/chat/completions` با `Authorization: Bearer` |
| مجوز مخزن | MIT، بستهٔ ریشه خصوصی با نام `@codigate/source` و نسخهٔ `0.0.0` |

اسکریپت‌های ریشه در `package.json`:

| اسکریپت | کار |
| --- | --- |
| `dev` | `nx run-many -t build --watch` |
| `build` | ساخت همهٔ هدف‌های build |
| `build:server` | `nx build mcp-server` |
| `start` | اجرای `apps/mcp-server/dist/main.js` |
| `codigate` | اجرای `apps/cli/dist/main.js` |
| `serve` | `nx serve mcp-server` |
| `graph` | گراف Nx |
| `lint` | لینت همه |
| `format` / `format:check` | نوشتن یا بررسی قالب Nx |
| `test` | `vitest run` |
| `clean` | پاک کردن `dist` و `node_modules/.cache` |

نام‌های بسته:

- `@codigate/domain`
- `@codigate/application`
- `@codigate/core`
- `@codigate/shared`
- `@codigate/cli` (باینری `codigate` به `./dist/main.js`)
- `@codigate/mcp-server`
- `@codigate/vscode-extension` (ناشر `codigate`، موتور VS Code `^1.90.0`، دستهٔ Linters)

شرط صادرات داخلی هر کتابخانه `@codigate/source` است و به سورس TypeScript اشاره می‌کند تا داخل مونوریپو بدون بیلد میانی هم resolve شود. `tsconfig.base.json` این مسیرها را alias کرده است:

- `@codigate/domain` → `packages/domain`
- `@codigate/application` → `packages/application`
- `@codigate/core` → `packages/core`
- `@codigate/shared` → `packages/shared`

`customConditions` در تنظیم کامپایلر مقدار `@org/source` دارد؛ صادرات بسته‌ها شرط `@codigate/source` را تعریف کرده‌اند. Vitest جداگانه alias مستقیم به `src/index.ts` هر بسته دارد و به این شرط وابسته نیست.

---

## ۳. معماری و جهت وابستگی

سبک، معماری تمیز (Clean Architecture) به‌صورت مونولیت ماژولار است. وابستگی فقط به سمت داخل مجاز است:

```text
apps/cli
apps/vscode-extension
apps/mcp-server
        │
        ▼
packages/core          آداپترها، IO، فرایند، HTTP، git، YAML
        │
        ▼
packages/application   یوزکیس، قانون، امتیاز، پورت (رابط)
        │
        ▼
packages/domain        نوع‌ها و مدل‌ها، بدون IO
```

`packages/shared` به این زنجیره وصل نیست. فقط تابع `shared()` را برمی‌گرداند که رشتهٔ `'shared'` است. در یوزکیس‌ها استفاده نشده و یک جای‌نگهدار Nx است. تابع `application()` در `packages/application/src/lib/application.ts` هم همین‌طور است و رشتهٔ `'application'` برمی‌گرداند.

قانون وابستگی:

- دامنه هیچ بسته‌ای از کدگیت را import نمی‌کند.
- اپلیکیشن فقط `@codigate/domain` را می‌شناسد. پورت‌ها را تعریف می‌کند و پیاده‌سازی‌شان را نمی‌داند.
- هسته، اپلیکیشن و دامنه را می‌شناسد و پورت‌ها را پیاده می‌کند.
- برنامه‌ها هسته (و گاهی اپلیکیشن و دامنه) را می‌شناسند. سرور MCP مستقیماً یوزکیس ساختار را از کانتینر خودش هم می‌سازد.

`createEngine` در `packages/core/src/composition/create-engine.ts` تنها محل سیم‌کشی (composition root) مشترک CLI و افزونه و MCP است. MCP برای ابزار ساختار پوشه یک کانتینر جدا هم دارد که پایین‌تر توضیح داده شده است.

---

## ۴. ساختار مخزن

```text
codigate/
├── apps/
│   ├── cli/
│   │   └── src/
│   │       ├── main.ts              تجزیهٔ دستور، مسیریابی، کد خروج
│   │       └── report.ts            متن گزارش اسکن، یافته، دروازه
│   ├── mcp-server/
│   │   └── src/
│   │       ├── main.ts              stdio
│   │       ├── server.ts            ثبت ابزارها
│   │       ├── composition/container.ts
│   │       └── tools/
│   │           ├── get-project-structure.ts
│   │           ├── scan-project.ts
│   │           └── read-file.ts
│   └── vscode-extension/
│       ├── media/icon.svg
│       └── src/
│           ├── main.ts              فعال‌سازی، دستورها، تشخیص
│           ├── findings-tree.ts
│           └── scores-tree.ts
├── packages/
│   ├── domain/src/entities/         مدل‌ها
│   ├── application/src/
│   │   ├── use-cases/               سناریوهای کاربردی
│   │   ├── ports/                   رابط‌های معکوس‌شده
│   │   ├── rules/                   کاتالوگ و چک‌کننده‌ها
│   │   ├── scoring/                 موتور امتیاز
│   │   ├── testing/                 پوشش و تست گم‌شده
│   │   ├── project/detect-stack.ts
│   │   └── sources/gitlab-remote.ts
│   ├── core/src/
│   │   ├── composition/create-engine.ts
│   │   ├── file-system/
│   │   ├── rule-engine/
│   │   ├── code-index/
│   │   ├── config/
│   │   ├── analysis-store/
│   │   ├── git/
│   │   ├── test-runner/
│   │   ├── llm/
│   │   ├── github/
│   │   ├── gitlab/
│   │   ├── audit/
│   │   ├── panel/
│   │   └── registery/ToolRegistery.ts
│   └── shared/src/lib/shared.ts
├── .codigate/
│   ├── config.yml
│   └── rules/no-direct-axios.yml
├── .github/workflows/codigate.yml
├── docs/adr/0001-product-surfaces-and-analysis-architecture.md
├── nx.json
├── package.json
├── tsconfig.base.json
├── tsconfig.json
├── vitest.config.ts
├── eslint.config.mjs
├── .prettierrc
├── .gitignore
├── README.md
├── CG.md
└── CG_FA.Md                         همین سند
```

پوشه‌های تولیدشده که در git نادیده گرفته می‌شوند: `dist`، `node_modules`، `.nx/cache`، `.nx/workspace-data`، `.codigate/history.jsonl`، `.codigate/cache`، `.codigate/coverage-report`.

فایل‌های VS Code که نگه داشته می‌شوند: `.vscode/settings.json`، `.vscode/launch.json`، `.vscode/extensions.json`.

---

## ۵. مدل دامنه

همه از `packages/domain/src/index.ts` صادر می‌شوند. دامنه رفتار اجرایی ندارد، جز کلاس خیلی کوچک `Tool` و تابع نگهبان `isSeverity`.

### ۵.۱ شدت و یافته

فایل: `packages/domain/src/entities/finding.ts`

`Severity` یکی از این چهار مقدار است: `high`، `medium`، `low`، `info`. تابع `isSeverity` فقط همین‌ها را می‌پذیرد. مقدار قدیمی `critical` در دامنه وجود ندارد؛ اگر مدل زبانی `critical` بفرستد، در `review-code.ts` به `high` نگاشت می‌شود. در ممیزی npm هم `critical` به `high` تبدیل می‌شود.

`FindingCategory` یکی از این‌هاست:

`security`، `quality`، `architecture`، `testing`، `performance`، `conventions`، `seo`، `dependencies`.

هر `Finding` این فیلدها را دارد:

| فیلد | معنی |
| --- | --- |
| `id` | شناسهٔ پایدار برای نمایش و دستور `fix`. الگوی رایج: `{ruleId}:{filePath}:{line}` |
| `ruleId` | شناسهٔ قانون، مثلاً `sec.eval` یا `ai.review` یا `dep.vuln` |
| `category` | دستهٔ امتیازدهی |
| `severity` | شدت |
| `filePath` | مسیر فایل. در اسکن معمولاً مسیر مطلق است چون `listFiles` مسیر مطلق برمی‌گرداند. در ممیزی npm مقدار ثابت `package.json` است |
| `line` | شمارهٔ خط، از ۱ |
| `column` | اختیاری. موتور الگو آن را پر نمی‌کند |
| `message` | متن کوتاه |
| `explanation` | چرا مهم است |
| `suggestion` | چه باید عوض شود |

### ۵.۲ قانون

فایل: `packages/domain/src/entities/rule.ts`

`Rule` الگو را نگه می‌دارد، نه رخداد را:

| فیلد | نقش |
| --- | --- |
| `id` | یکتا. override پیکربندی با همین شناسه وصل می‌شود |
| `category` / `severity` | به یافته کپی می‌شوند |
| `title` | عنوان انسانی. در یافته کپی نمی‌شود |
| `message` / `explanation` / `suggestion` | متن یافته |
| `glob` | اگر باشد، قانون فقط روی فایل‌های منطبق اجرا می‌شود. اگر نباشد، همهٔ فایل‌های بارگذاری‌شده |
| `pattern` | عبارت منظم. قانون‌های سئو و ساختار طولانی/تو در تو pattern ندارند و موتور الگو از آن‌ها رد می‌شود؛ چک‌کنندهٔ جدا آن‌ها را اجرا می‌کند |

### ۵.۳ کارت امتیاز

فایل: `packages/domain/src/entities/scorecard.ts`

`Scorecard` هشت عدد ۰ تا ۱۰۰ دارد: `overall`، `security`، `quality`، `architecture`، `testing`، `performance`، `conventions`، `seo`. دستهٔ `dependencies` ستون جدا ندارد و داخل امنیت جمع می‌شود.

`FindingCounts` شمارش چهار شدت است.

`FileScorecard` برای هر فایلِ دارای یافته: امتیاز امنیت، کیفیت، معماری، سئو، تعداد یافته، و خود آرایهٔ یافته‌ها. عملکرد و قرارداد و تست در کارت فایل نیستند.

### ۵.۴ قرارداد تیمی

فایل: `packages/domain/src/entities/convention-set.ts`

`ConventionSet` فیلدهای اختیاری دارد: `architecture`، `naming` (رشته یا نگاشت)، `react`، `api`، `state`، `backend`، `testing`، `security`. این شیء هم به مدل زبانی داده می‌شود و هم با جست‌وجوی متنی به قانون قراردادی تبدیل می‌شود (بخش ۸).

### ۵.۵ دروازهٔ کیفیت

فایل: `packages/domain/src/entities/quality-gate.ts`

آستانه‌های اختیاری `QualityGate`:

- حداقل‌ها: `securityMin`، `qualityMin`، `architectureMin`، `testingMin`، `overallMin`، `seoMin`
- سقف یافتهٔ شدید: `highMax`
- `criticalMax` منسوخ است ولی هنوز به‌عنوان سقف یافتهٔ `high` اعمال می‌شود. اگر هر دو باشند، کوچک‌ترشان ملاک است
- `testsMin` حداقل میانگین درصدهای داخل `testingCoverage`

`QualityGateResult` دو فیلد دارد: `passed` و `failures` (متن‌های انگلیسی شکست).

### ۵.۶ پیکربندی پروژه

فایل: `packages/domain/src/entities/project-config.ts`

`ProjectConfig` این بلوک‌ها را دارد:

- `conventions`
- `gate`
- `rules`: نگاشت شناسهٔ قانون به `RuleOverride` با `enabled` و `severity`
- `coverage`: `threshold`، `unitGlobs`، `componentGlobs`، `integrationGlobs`
- `panel`: `port`
- `gitlab`: `cacheDir`
- `ai`: `apiBase`، `apiKey`، `model`

### ۵.۷ اجرای تحلیل

فایل: `packages/domain/src/entities/analysis-run.ts`

`AnalysisRun` خروجی واحد تقریباً همهٔ مسیرهای تحلیل است:

| فیلد | منبع |
| --- | --- |
| `id` | `crypto.randomUUID()` در اسکن |
| `timestamp` | ISO زمان اجرا |
| `projectName` | فیلد `name` در `package.json`، وگرنه `project` |
| `stack` | خروجی `detectStack` |
| `gitRevision` / `gitBranch` | `git rev-parse` |
| `scores` | موتور امتیاز |
| `previousScores` | امتیازهای آخرین رکورد تاریخچه، قبل از ذخیرهٔ رکورد جدید |
| `counts` | شمارش شدت |
| `findings` | اجتماع یافته‌ها |
| `fileScores` | کارت هر فایل |
| `missingTests` | در اسکن، نام فایل‌های بدون تست متناظر؛ بعد از اندازه‌گیری پوشش واقعی، مسیر فایل‌های زیر آستانه |
| `testingCoverage` | در اسکن، درصد تقریبی سرویس/کنترلر/هوک/ابزار؛ در تحلیل درخواستی، درصد خطی unit/component/integration اگر اندازه‌گیری شده باشد |
| `coverageNote` | توضیح متنی اندازه‌گیری پوشش یا توقف تولید تست |

`AnalysisTrend` با فیلدهای `previous`، `current`، `delta` در دامنه تعریف شده ولی مسیر گزارش CLI روند را خودش از `previousScores` حساب می‌کند و از این نوع استفاده نمی‌کند.

### ۵.۸ ایندکس کد

فایل: `packages/domain/src/entities/code-index.ts`

`IndexedSymbol`: نام، گونه (`class` | `function` | `component` | `hook` | `unknown`)، مسیر، خط.

`IndexedFile`: مسیر، زبان، `isTest`، گونهٔ فایل (`service` | `controller` | `hook` | `util` | `component` | `other`)، نمادها.

`CodeIndex`: آرایهٔ فایل‌ها و آرایهٔ تخت نمادها.

### ۵.۹ درخت پوشه

فایل: `packages/domain/src/entities/directory-tree.ts`

`DirectoryTree`: `name`، `path` (مطلق)، `type` برابر `file` یا `directory`، و `children` فقط برای پوشه و فقط اگر عمق اجازهٔ نزول داده باشد.

### ۵.۱۰ ابزار

فایل: `packages/domain/src/entities/Tools.ts`

کلاس `Tool` فقط `name` و `description` دارد. رجیستری درون‌حافظه در هسته آن را نگه می‌دارد. ابزارهای واقعی MCP از این کلاس رد نمی‌شوند و مستقیم روی `McpServer` ثبت می‌شوند. این مسیر یک باقی‌ماندهٔ طراحی اولیه است.

---

## ۶. پورت‌ها (قرارداد معکوس وابستگی)

همه در `packages/application/src/ports/` هستند. هسته آن‌ها را پیاده می‌کند. یوزکیس فقط همین رابط‌ها را می‌بیند.

### ۶.۱ `FileSystem`

- `getProjectStructure(root, maxDepth?)`
- `readFile(root, target)`
- `writeFile(root, target, content)`
- `listFiles(root)` آرایهٔ مسیر مطلق، مرتب‌شده
- `exists(root, target)`
- `findProjectRoot(start)` بالا می‌رود تا `.git` یا `package.json` بیابد؛ اگر به ریشهٔ فایل‌سیستم برسد، همان مسیر شروع را برمی‌گرداند

### ۶.۲ `RuleEngine`

`analyze(files, rules) → Finding[]`. هر `SourceFile` فقط `path` و `content` است.

### ۶.۳ `CodeIndexer`

`index(files) → CodeIndex`.

### ۶.۴ `ProjectConfigLoader`

`load(root) → ProjectConfig`. اگر فایلی نباشد، شیء خالی.

### ۶.۵ `AnalysisStore`

- `save(root, run)`
- `latest(root)`
- `history(root)`

### ۶.۶ `GitRepository`

- `isGitRepo`
- `getBranch` (`rev-parse --abbrev-ref HEAD`)
- `getRevision` (`rev-parse HEAD`)
- `getChangedFiles(root, base?)` پیش‌فرض پایه `HEAD~1`، خروجی `diff --name-only`
- `getDiff(root, base?)` پیش‌فرض همان پایه
- `getRemote` آدرس `origin`

شکست git به‌جای پرتاب خطا، مقدار خالی یا `false` برمی‌گرداند. `getDiff` در یوزکیس فعلی صدا زده نمی‌شود؛ فقط روی پورت و آداپتر وجود دارد. `isGitRepo` هم در مسیر تحلیل استفاده نمی‌شود؛ ریشه با وجود `.git` یا `package.json` پیدا می‌شود.

### ۶.۷ `LlmGateway`

`complete(messages) → string`. پیام نقش `system` | `user` | `assistant` دارد.

### ۶.۸ `TestRunner`

- `detectCommand(root)` اگر `package.json` اسکریپت `test` داشته باشد، رشتهٔ `npm test`
- `run(root, command?)` مهلت ۱۲۰ ثانیه
- `measureCoverage(root, threshold, globs?)` مهلت ۱۸۰ ثانیه و بافر ۲۰ مگابایت

`TestRunResult`: `passed`، `output`، `command`.

`CoverageMeasurement`: `measured`، `note`، `byKind`، `uncovered` (مسیر نسبی و گونه).

### ۶.۹ `DependencyAuditor`

`audit(root) → Finding[]`.

### ۶.۱۰ `PullRequestPort`

- `createPullRequest` با مالک، مخزن، عنوان، بدنه، `head`، `base` و خروجی `url` و `number`
- `commentOnPullRequest` با مالک، مخزن، شماره، بدنه، و فیلد اختیاری `path` و `line` که آداپتر گیت‌هاب امروز از آن‌ها استفاده نمی‌کند

### ۶.۱۱ `ToolRepository`

`register(tool)` و `getTools()`. پیاده‌سازی `ToolRegistry` در `packages/core/src/registery/ToolRegistery.ts` یک آرایهٔ درون‌حافظه است. نام پوشه و فایل عمداً با املای `registery` در مخزن است.

---

## ۷. یوزکیس‌ها، تابع‌به‌تابع

### ۷.۱ `GetProjectStructureUseCase`

فایل: `packages/application/src/use-cases/get-project-structure.ts`

ورودی ریشه و عمق اختیاری را بدون تغییر به `fileSystem.getProjectStructure` می‌دهد. در MCP اگر عمق نیاید، ۴ گذاشته می‌شود. عمق ۰ یعنی فقط گرهٔ ریشه بدون فرزند.

### ۷.۲ `RegisterToolUseCase`

فایل: `packages/application/src/use-cases/register-tool.ts`

یک `Tool` می‌سازد و در رجیستری ثبت می‌کند. سرور MCP فعلی این یوزکیس را موقع بالا آمدن صدا نمی‌زند. فقط از `apps/mcp-server/src/composition/container.ts` صادر شده است.

### ۷.۳ `AnalyzeProjectUseCase` — اسکن ایستا

فایل: `packages/application/src/use-cases/analyze-project.ts`

این قلب محصول است. `scan`، `gate`، `findings`، `fix`، و زیربنای `analyze` / `pr` از اینجا شروع می‌شوند.

ورودی `AnalyzeProjectInput`:

- `root`
- `extraRules` اختیاری
- `changedFilesOnly` اختیاری (پرچم CLI `--diff`)

سازنده این وابستگی‌ها را می‌گیرد: فایل‌سیستم، موتور قانون، ایندکسر، بارگذار پیکربندی، انباره، git، بارگذار اختیاری قانون سفارشی، و یک `ScoringEngine`.

`createEngine` تابع `loadCustomRules` را به‌عنوان بارگذار اضافی می‌دهد.

#### فلو `execute`

1. `findProjectRoot` تا رسیدن به `.git` یا `package.json`.
2. خواندن پیکربندی YAML.
3. جمع قانون اضافی از ورودی و از `.codigate/rules`.
4. بارگذاری فایل‌های متنی.
5. ساخت فهرست نهایی قانون با `collectRules`.
6. سه‌منبع یافته:
   - `ruleEngine.analyze` برای قانون‌های دارای `pattern`
   - `structuralFindings` برای تابع طولانی و تو در تو
   - `documentFindings` برای سئو و نشانه‌های حیاتی سند
7. ایندکس فایل‌ها.
8. `missingTestTargets(index)`.
9. `testingCoverageFromIndex(index)` (تخمین بر اساس نام، نه پوشش خطی).
10. امتیاز، شمارش، کارت فایل.
11. خواندن آخرین اجرای تاریخچه برای `previousScores`. این خواندن قبل از `save` است، پس اجرای جاری با خودش مقایسه نمی‌شود.
12. نام و متن `package.json` برای نام پروژه و تشخیص پشته.
13. شاخه و رویژن git.
14. ساخت `AnalysisRun` و `store.save`.
15. برگرداندن همان شیء.

#### بارگذاری فایل

پسوندهای پذیرفته‌شده:

`.ts` `.tsx` `.js` `.jsx` `.mjs` `.cjs` `.json` `.yml` `.yaml` `.md` `.env` `.py` `.go` `.rs` `.java` `.kt` `.cs` `.sql` `.graphql` `.html` `.css` `.scss`

فایل بدون نقطه اگر نامش به `dockerfile` یا `.env` ختم شود هم متنی حساب می‌شود.

حذف‌ها:

- فایل بزرگ‌تر از ۵۱۲٬۰۰۰ نویسه (`MAX_FILE_BYTES` روی `content.length` است، نه بایت دقیق فایل).
- فایلی که خواندنش خطا بدهد.
- فایلی که مسیر نرمال‌شده‌اش با `/(built-in-rules|convention-rules).(ts|js)$` جور شود تا خود کاتالوگ قانون، خودش را جریمه نکند.
- هر مسیری که `NodeFileSystem` به‌خاطر نام پیش‌فرض یا `.gitignore` نادیده گرفته (بخش ۱۶).

اگر `changedFilesOnly` روشن باشد، فقط مسیرهایی می‌مانند که یا دقیقاً در `git diff --name-only HEAD~1` باشند، یا مسیر مطلقشان به مسیر نسبی تغییریافته ختم شود، یا آن را در خود داشته باشد. تطبیق شامل‌بودن ممکن است فایل‌های هم‌نام در پوشه‌های دیگر را هم بیاورد.

#### جمع قانون

ترتیب ورود به `applyRuleOverrides`:

1. `builtInRules()`
2. `conventionRules(config.conventions)`
3. قانون‌های اضافی و سفارشی

اگر دو قانون `id` یکسان داشته باشند، دومی در `Map` روی اولی می‌نشیند. قانون سفارشی با شناسهٔ تکراری، قانون توکار را جایگزین می‌کند و بعد override پیکربندی روی همان شناسه اعمال می‌شود.

### ۷.۴ `AnalyzeWithAiUseCase`

فایل: `packages/application/src/use-cases/analyze-with-ai.ts`

1. اسکن ایستا.
2. اگر `llmAvailable()` نادرست باشد، همان اجرای ایستا برمی‌گردد. تاریخچه را اسکن قبلاً نوشته است.
3. تا ۸ مسیر یکتای فایل‌های دارای یافته انتخاب می‌شود.
4. محتوای همان فایل‌ها دوباره خوانده می‌شود. خطای خواندن یک فایل، آن فایل را حذف می‌کند و بقیه ادامه دارند.
5. `ReviewCodeUseCase` با یافته‌های موجود و پیکربندی.
6. اگر تکمیل مدل خطا بدهد، اجرای ایستا بدون یافتهٔ هوش مصنوعی برمی‌گردد.
7. یافته‌های مدل به انتهای فهرست چسبانده می‌شوند. شناسهٔ تکراری حذف نمی‌شود.
8. شمارش، امتیاز، کارت فایل دوباره حساب می‌شود و در انباره ذخیره می‌شود. این ذخیره یک رکورد دوم در تاریخچه می‌سازد (رکورد اول را خود اسکن نوشته است).

فایل‌هایی که یافته ندارند به مدل فرستاده نمی‌شوند. پس بازبینی هوش مصنوعی نمونه‌ای از فایل‌های متخلف است، نه کل مخزن.

### ۷.۵ `ReviewCodeUseCase`

فایل: `packages/application/src/use-cases/review-code.ts`

حداکثر ۱۲ فایل (ورودی از مرحلهٔ قبل حداکثر ۸ تا است). هر فایل تا ۴۰۰۰ نویسهٔ اول. یافته‌های موجود تا ۳۰ تای اول داخل پرامپت JSON می‌شوند.

پرامپت از مدل می‌خواهد فقط یک آرایهٔ JSON برگرداند با کلیدهای `ruleId`، `category`، `severity`، `filePath`، `line`، `message`، `explanation`، `suggestion`. سیستم‌پرامپت: `Return valid JSON only. No markdown.` قراردادهای پروژه و یافته‌های ایستا هم در پرامپت هستند تا مدل تکرار نکند؛ ولی کد، تکرار را بعد از پاسخ حذف نمی‌کند.

`parseFindings`:

- اولین `[` تا آخرین `]` را JSON می‌کند. اگر آرایه نباشد، فهرست خالی.
- آیتم بدون `filePath` یا بدون `message` دور ریخته می‌شود.
- `line` نامعتبر به ۱ تبدیل می‌شود.
- `ruleId` خالی می‌شود `ai.review`.
- دستهٔ خارج از فهرست هشت‌تایی می‌شود `quality`.
- `severity === 'critical'` می‌شود `high`. شدت ناشناس می‌شود `medium`.
- شناسهٔ یافته: `` `${ruleId}:${filePath}:${line}` ``.

### ۷.۶ `AnalyzeOnDemandUseCase` — تحلیل درخواستی

فایل: `packages/application/src/use-cases/analyze-on-demand.ts`

این مسیر دستور `analyze` در CLI و دستور `Codigate: Analyze` در VS Code است.

ثابت‌ها: حداکثر ۳ دور (`MAX_ROUNDS`)، حداکثر ۸ فایل در هر دور (`MAX_FILES_PER_ROUND`).

فلو:

1. `analyzeWithAi.execute` (که خودش اسکن ایستا به‌علاوه بازبینی اختیاری مدل است).
2. خواندن پیکربندی. آستانهٔ پوشش پیش‌فرض ۸۰ اگر `coverage.threshold` نباشد.
3. `auditor.audit` (npm audit و npm outdated).
4. `testRunner.measureCoverage` با گلاب‌های اختیاری پیکربندی.
5. اگر مدل در دسترس باشد و پوشش اندازه‌گیری شده باشد و حداقل یک گونه زیر آستانه باشد، حلقه:
   - تا ۸ فایل از `uncovered`.
   - اگر فهرست خالی باشد، یادداشت می‌نویسد که پوشش زیر آستانه است ولی فایل بدون پوشش فهرست نشده، و حلقه را می‌شکند.
   - برای هر هدف، `generateTests` و سپس `applyPatch` (نوشتن واقعی روی دیسک).
   - خطای تولید، یادداشت را با پیام خطا پر می‌کند و حلقهٔ داخلی را می‌شکند.
   - اگر هیچ فایلی نوشته نشود، دور تمام می‌شود.
   - بعد از دور، پوشش دوباره اندازه‌گیری می‌شود.
6. اگر مدل نباشد و پوشش زیر آستانه باشد، یادداشت انگلیسی می‌گوید برای تولید تست باید آدرس، کلید و مدل تنظیم شود. پوشش اندازه‌گیری‌شده همچنان در نتیجه هست.
7. یافته‌های اسکن/هوش مصنوعی با یافته‌های ممیزی بر اساس `id` یکتا می‌شوند. تکرار بعدی، قبلی را جایگزین می‌کند.
8. اگر پوشش اندازه‌گیری شده باشد، `testingCoverage` فقط گونه‌های تعریف‌شده (unit / component / integration) است و `missingTests` به مسیر فایل‌های زیر آستانه عوض می‌شود. تخمین ایندکس (Services/Controllers/...) در این حالت دور ریخته می‌شود.
9. اگر اندازه‌گیری نشده باشد، `missingTests` همان تخمین اسکن می‌ماند و `testingCoverage` تهی است (`definedCoverage` روی شیء خالی `undefined` برمی‌گرداند).
10. امتیاز و کارت فایل با فهرست جدید دوباره حساب و یک بار دیگر ذخیره می‌شود.

نتیجهٔ عملی: دستور `analyze` ممکن است فایل تست جدید داخل پروژه بنویسد. این رفتار نوشتنی است. `scan` و `gate` فایل تست نمی‌نویسند.

### ۷.۷ `ProposeFixUseCase`

فایل: `packages/application/src/use-cases/propose-fix.ts`

ورودی: ریشه و یک `Finding`.

1. کل فایل خوانده می‌شود.
2. مدل با سیستم‌پرامپت «فقط محتوای کامل فایل به‌روز، بدون حصار مارک‌داون» و شرح قانون، پیام، پیشنهاد، خط و متن اصلی صدا زده می‌شود.
3. `stripFence` حصار ابتدایی و انتهایی را برمی‌دارد و یک newline آخر اضافه می‌کند.
4. خروجی `ProposedFix` است: `filePath`، `original`، `updated`، `diff`.

`makeDiff` یک دیف ساده‌خطی است، نه دیف زمینه‌ای یونیکس. خط‌های برابر با پیشوند فاصله، خط حذف‌شده با `-` و خط جدید با `+`. اگر طول دو نسخه فرق کند، خط‌های اضافه فقط یک طرفه نشان داده می‌شوند. این دیف برای نمایش است. اعمال اصلاح، دیف را پارس نمی‌کند و کل `updated` را روی فایل می‌نویسد.

اگر مدل پیکربندی نشده باشد، `complete` خطا می‌دهد و دستور `fix` با همان خطا تمام می‌شود.

### ۷.۸ `ApplyPatchUseCase`

فایل: `packages/application/src/use-cases/apply-patch.ts`

`writeFile` روی ریشه و مسیر نسبی یا مطلق داخل ریشه. پوشهٔ والد ساخته نمی‌شود. مسیر باید از قبل وجود داشته باشد، مگر اینکه نوشتن در فایل جدید داخل پوشهٔ موجود باشد (خود `writeFile` نود فایل را می‌سازد، نه پوشه را).

محافظت از فرار از ریشه داخل `NodeFileSystem.resolveWithin` است، نه داخل این یوزکیس.

### ۷.۹ `GenerateTestsUseCase`

فایل: `packages/application/src/use-cases/generate-tests.ts`

ورودی: ریشه، `targetPath`، و گونهٔ اختیاری `unit` | `component` | `integration` (پیش‌فرض `unit`).

پرامپت سیستم:

- component: تست کامپوننت، رندر و رفتار قابل‌دیدن، ترجیح Vitest و Testing Library برای ری‌اکت.
- integration: تست یکپارچه با همکارهای ماژول، Vitest یا `node:test`.
- unit: تست واحد متمرکز، Vitest یا `node:test`.

خروجی مدل با `stripFence` تمیز می‌شود و هنوز روی دیسک نوشته نمی‌شود. نوشتن کار `ApplyPatchUseCase` است.

`toTestPath`:

- اگر مسیر از قبل `.spec.` یا `.test.` داشته باشد، همان مسیر برمی‌گردد.
- وگرنه پسوند آخر عوض می‌شود:
  - integration → `.integration.spec` قبل از پسوند
  - component → `.component.spec`
  - unit → `.spec`
- مثال: `src/foo.ts` → `src/foo.spec.ts`

### ۷.۱۰ `ValidateTestsUseCase`

فایل: `packages/application/src/use-cases/validate-tests.ts`

این مسیر دستور `generate-tests` است. حداکثر تکرار پیش‌فرض ۳.

1. تست تولید می‌شود.
2. اگر `apply` نادرست باشد، چیزی نوشته نمی‌شود و نتیجه این است: `passed: false`، `iterations: 0`، پیام «Tests generated but not written...»، و `testPath`. CLI به‌خاطر `passed === false` کد خروج ۱ می‌گذارد، حتی وقتی کاربر عمداً بدون `--apply` فقط پیش‌نمایش خواسته باشد. محتوای تولیدشده در این شاخه به خروجی استاندارد هم ریخته نمی‌شود؛ فقط مسیر و آن پیام.
3. اگر `apply` باشد، فایل نوشته می‌شود و تا ۳ بار کل سوئیت تست پروژه (`testRunner.run` بدون فیلتر فایل) اجرا می‌شود.
4. اگر رد شد، مدل با متن تست فعلی و تا ۶۰۰۰ نویسه از خروجی شکست، فایل را اصلاح می‌کند و دوباره نوشته می‌شود.
5. اگر در میانه پاس شد، حلقه می‌شکند.
6. نتیجه: `passed`، تعداد تکرار، خروجی آخرین اجرا، مسیر تست.

گونهٔ پوشش به `generateTests` داده نمی‌شود، پس این دستور همیشه تست واحد (پسوند `.spec`) می‌سازد. گونهٔ component/integration فقط در حلقهٔ `analyze` پاس داده می‌شود.

### ۷.۱۱ `RunTestsUseCase`

فایل: `packages/application/src/use-cases/run-tests.ts`

فقط `testRunner.run(root)`. دستور `codigate test`.

### ۷.۱۲ `EvaluateQualityGateUseCase`

فایل: `packages/application/src/use-cases/evaluate-quality-gate.ts`

برای هر حداقل تعریف‌شده، اگر امتیاز کمتر باشد یک رشتهٔ شکست اضافه می‌شود، مثلاً `Security 70 < 80`.

سقف شدید: اگر تعداد `high` بیشتر از سقف باشد، `High N > M`.

`testsMin`:

- اگر `testingCoverage` تهی یا غایب باشد: `Tests were not measured and gate requires {testsMin}` و دروازه رد می‌شود.
- وگرنه میانگین همهٔ مقدارها (نه حداقلِ بدترین گونه) با آستانه مقایسه می‌شود: `Tests 42 < 50`.

`passed` یعنی `failures` خالی باشد. خود یوزکیس `process.exit` نمی‌زند. CLI این کار را می‌کند.

دروازهٔ پیش‌فرض وقتی بلوک `gate` در پیکربندی نباشد، در `scan --gate` و `gate`:

- `securityMin: 80`
- `highMax: 5`
- `overallMin: 75`

در بازبینی پول‌ریکوئست اگر `gate` نباشد:

- `highMax: 0`
- `securityMin: 80`

پیکربندی واقعی این مخزن بلوک `gate` دارد، پس این پیش‌فرض‌ها فقط برای پروژه‌ای است که کدگیت را بدون بلوک gate اجرا کند.

### ۷.۱۳ `CreatePullRequestUseCase`

فایل: `packages/application/src/use-cases/create-pull-request.ts`

1. `git remote get-url origin`.
2. `parseGithubRemote` فقط URL گیت‌هاب را می‌فهمد: `github.com:owner/repo` یا `github.com/owner/repo` با `.git` اختیاری. گیت‌لب اینجا قبول نیست.
3. اگر ریموت گیت‌هاب نباشد: `GitHub remote was not found. Set origin to a GitHub URL.`
4. شاخهٔ فعلی، یا `HEAD` اگر شاخه معلوم نباشد (حالت detached).
5. عنوان: `chore: codigate analysis {overall}/100`.
6. بدنه از `renderPullRequestBody`: امتیاز امنیت، کیفیت، سئو، عملکرد، میانگین پوشش، تعداد high و medium، تعداد تست گم‌شده، امتیاز کلی. معماری و قرارداد در بدنه نیستند.
7. `base` پیش‌فرض `main`. CLI امروز آرگومان base را پاس نمی‌دهد، پس همیشه `main` است.
8. توکن را خود آداپتر چک می‌کند.

### ۷.۱۴ `ReviewPullRequestUseCase`

فایل: `packages/application/src/use-cases/review-pull-request.ts`

همان پارس ریموت. وضعیت خط اول: `❌ PR blocked` یا `✓ Passed` بر اساس پرچم `blocked` که CLI از نتیجهٔ دروازه می‌سازد (`blocked = !gate.passed`). سپس بدنهٔ پول‌ریکوئست و تا ۱۰ یافتهٔ `high` به شکل `HIGH: message in file:line`. کامنت از API کامنت issue زده می‌شود، نه review comment روی خط کد. فیلدهای `path` و `line` پورت پر نمی‌شوند.

---

## ۸. کاتالوگ قانون توکار

منبع: `packages/application/src/rules/built-in-rules.ts`. تابع `builtInRules()` اجتماع این گروه‌هاست.

موتور الگو هر قانون دارای `pattern` را خط‌به‌خط با پرچم `gi` اجرا می‌کند. قانون بدون `pattern` از موتور الگو رد می‌شود.

### ۸.۱ امنیت — شدت بالا مگر خلافش گفته شود

| شناسه | الگو (خلاصه) | پیام | پیشنهاد |
| --- | --- | --- | --- |
| `sec.secret.aws-access-key` | `AKIA` به‌علاوه ۱۶ حرف/عدد بزرگ | کلید دسترسی AWS | انتقال به متغیر محیط یا مدیر راز |
| `sec.secret.private-key` | هدر PEM برای کلید خصوصی RSA/EC/OPENSSH | مادهٔ کلید خصوصی | حذف و چرخش کلید |
| `sec.secret.generic-token` | انتساب `api_key` / `secret` / `token` / `password` / `passwd` / `auth` به رشتهٔ حداقل ۸ نویسه‌ای | توکن سخت‌کد | محیط یا خزانه |
| `sec.secret.jwt` | `jwt_secret` یا `JWT_SECRET` برابر رشته | راز امضای JWT | متغیر محیط |
| `sec.eval` | `eval(` یا `new Function(` | اجرای پویا | پارس به‌جای eval |
| `sec.inner-html` | `.innerHTML =` یا `dangerouslySetInnerHTML` | تزریق HTML | API امن یا خروجی پاک‌سازی‌شده |
| `sec.child-process` | `exec` / `execSync` / `spawn` / `spawnSync` فقط روی `js,ts,mjs,cjs` | اجرای پوسته | آرایهٔ آرگومان و اعتبارسنجی |
| `sec.disable-tls` | `rejectUnauthorized: false` یا `NODE_TLS_REJECT_UNAUTHORIZED` برابر ۰ | خاموش بودن تأیید TLS | روشن نگه داشتن تأیید |
| `sec.sql-concat` | `SELECT/INSERT/UPDATE/DELETE` و بعد `+` یا `${` در همان خط | الحاق SQL | پرس‌وجوی پارامتریک |
| `sec.shell-interpolation` | `exec`/`execSync` با قالب رشته‌ای که `${` دارد، فقط js/ts | درون‌یابی پوسته | آرایهٔ آرگومان |
| `sec.math-random` | `token/secret/password/nonce/api_key` و تا ۸۰ نویسه بعد `Math.random` | تصادف ناامن | `crypto.randomBytes` یا `getRandomValues` |
| `sec.cors-wildcard` | شدت medium. هدر یا `origin` برابر `*` | CORS ستاره‌ای | فهرست صریح مبدأ |
| `sec.http-asset` | شدت medium. URL با `http://` که به js/css/تصویر/فونت ختم شود | دارایی ناامن | `https://` |
| `sec.hash-password` | `createHash('md5'|'sha1')` یا فراخوانی md5/sha1 نزدیک password/secret | هش ضعیف گذرواژه | scrypt / bcrypt / argon2 |

این‌ها جست‌وجوی خطی هستند و مثبت کاذب دارند؛ مثلاً `spawn(` در هر فایل اسکریپتی، یا کلمهٔ `token:` داخل مثال.

### ۸.۲ کیفیت و کارایی (الگویی)

| شناسه | دسته | شدت | محدود به | معنی |
| --- | --- | --- | --- | --- |
| `qual.any-type` | quality | medium | `ts,tsx` | `: any` یا `as any` یا `<any>` |
| `qual.empty-catch` | quality | medium | همه | `catch` با بدنهٔ خالی |
| `qual.console-log` | quality | low | js/ts/tsx/jsx | `console.log(` |
| `qual.todo` | quality | info | همه | کلمهٔ `TODO` یا `FIXME` |
| `perf.nested-loop` | performance | low | همه | `for` و تا ۲۰۰ نویسه بعد یک `for` دیگر. `forEach` در عنوان آمده ولی الگو فقط `for` است |

### ۸.۳ معماری

| شناسه | شدت | گلاب | الگو |
| --- | --- | --- | --- |
| `arch.direct-db` | high | فایل‌هایی با نام `*.controller/service/resolver/route/handler.ts|js` و همچنین هر tsx/jsx | `prisma.` یا `db.` یا `knex.` یا `mongoose.` |
| `arch.axios-in-ui` | medium | tsx/jsx | `axios(` یا `fetch(` |

گلاب `*.controller.ts` به بخش نام فایل نگاه می‌کند (`matchesGlob` هم کل مسیر را امتحان می‌کند هم نام پایه را). پس `user.controller.ts` منطبق است، ولی `src/controllers/user.ts` با این گلاب خاص منطبق نیست مگر پسوند مرکب را داشته باشد.

### ۸.۴ تست

`test.skipped` شدت medium، فقط روی `*.spec.*` و `*.test.*` و مسیر `__tests__`: الگوی `it.skip` / `it.only` / `test.skip` / `test.only` / `describe.skip` / `describe.only`.

### ۸.۵ ساختار (بدون pattern؛ چک‌کنندهٔ جدا)

| شناسه | شدت | آستانه |
| --- | --- | --- |
| `qual.long-function` | medium | بلندتر از ۸۰ خط |
| `qual.deep-nesting` | medium | عمق آکولاد بیش از ۴ نسبت به شروع تابع |

منطق در بخش ۱۰ است.

### ۸.۶ سئو (بدون pattern؛ چک‌کنندهٔ سند)

| شناسه | شدت | شرط نقض |
| --- | --- | --- |
| `seo.missing-title` | high | نه `<title>`، نه `og:title`، نه `export const metadata` |
| `seo.missing-meta-description` | medium | نبود `name="description"` |
| `seo.missing-canonical` | medium | نبود `rel="canonical"` |
| `seo.missing-lang` | medium | وجود `<html` بدون `lang` |
| `seo.missing-h1` | medium | صفر تگ `h1` |
| `seo.multiple-h1` | low | بیش از یک `h1` |
| `seo.image-alt` | medium | خط دارای `img` یا `Image` بدون `alt`، حداکثر ۲۰ مورد در فایل |
| `seo.missing-og-title` | low | نبود `property="og:title"` |
| `seo.missing-og-description` | low | نبود `property="og:description"` |

### ۸.۷ نشانه‌های حیاتی کارایی سند

| شناسه | شدت | شرط |
| --- | --- | --- |
| `perf.img-dimensions` | medium | `img`/`Image` بدون هر دو `width` و `height` در همان خط، حداکثر ۲۰ |
| `perf.render-blocking-script` | medium | فقط HTML: داخل `head` تگ `script` بدون `defer`/`async`/`type="module"`، حداکثر ۲۰ |
| `perf.font-display` | low | بلوک `@font-face` در css/scss بدون `font-display` |
| `perf.missing-viewport` | high | نبود `name="viewport"` و نبود `export const viewport` |

در پیکربندی همین مخزن، `seo.missing-meta-description` صریحاً `enabled: true` و `severity: medium` است که همان پیش‌فرض قانون است.

---

## ۹. قانون قراردادی تولیدشده از پیکربندی

فایل: `packages/application/src/rules/convention-rules.ts`

کل شیء `conventions` با `JSON.stringify` به حروف کوچک تبدیل می‌شود و زیررشته جست‌وجو می‌شود. یعنی کلمهٔ داخل هر فیلد، حتی داخل یک مقدار نام‌ربط، می‌تواند قانون را روشن کند.

| اگر متن شامل باشد | شناسه | دسته | شدت | اثر |
| --- | --- | --- | --- | --- |
| `repository` | `conv.repository-pattern` | conventions | high | همان الگوی prisma/db روی کنترلر، سرویس، route، handler و tsx/jsx. knex و mongoose اینجا نیستند |
| `react query` یا `tanstack` | `conv.react-query-only` | conventions | medium | `axios(` یا `fetch(` در tsx/jsx |
| `zustand` | `conv.zustand-only` | conventions | medium | import از redux / react-redux / jotai / recoil / mobx |
| `pascalcase` | `conv.pascal-components` | conventions | low | `export function` با نام شروع‌شده با حرف کوچک در tsx/jsx. تابع معمولی را هم می‌گیرد |
| `no secrets` یا `secret` | `conv.no-secrets` | conventions | high | انتساب secret/password/token به رشتهٔ حداقل ۸ نویسه‌ای |

پیکربندی فعلی مخزن همهٔ این‌ها را روشن می‌کند، چون متنش این‌ها را دارد:

- معماری: `Clean Architecture` (کلمهٔ repository ندارد؛ پس قانون repository از این فیلد روشن نمی‌شود)
- نام‌گذاری کامپوننت: `PascalCase` → قانون پاسکال روشن است
- API: `React Query only` → قانون React Query روشن است
- state: `Zustand only for client state` → قانون Zustand روشن است
- بک‌اند: `Repository pattern` → قانون repository روشن است
- امنیت: `No secrets in source` → هم `secret` و هم `no secrets` قانون راز را روشن می‌کند

پس در این مخزن، علاوه بر قانون توکار، این پنج قانون قراردادی هم فعال‌اند. قانون axios در UI با قانون سفارشی فایل YAML (بخش ۱۱) هم‌پوشانی دارد ولی شناسه‌شان فرق دارد و هر دو می‌توانند روی یک خط دو یافته بسازند: `arch.axios-in-ui` و `conv.react-query-only` و `custom.no-direct-axios`.

---

## ۱۰. چک‌کننده‌های ساختاری و سندی

### ۱۰.۱ `structuralFindings`

فایل: `packages/application/src/rules/structural-checker.ts`

اگر هیچ‌کدام از دو قانون `qual.long-function` و `qual.deep-nesting` در فهرست نهایی نباشد (مثلاً هر دو `enabled: false`)، خروجی خالی است.

فایل minified رد می‌شود: اگر خط اول بلندتر از ۵۰۰ نویسه باشد.

برای هر خط:

- شروع تابع اگر `function` یا `=> {` داشته باشد، یا الگوی متد کلاسی/تابعی باشد که با `if/for/while/switch/catch/with` اشتباه گرفته نشود.
- عمق با شمارش `{` و `}` همان خط عوض می‌شود. رشته و کامنت نادیده گرفته نمی‌شوند؛ آکولاد داخل رشته عمق را خراب می‌کند.
- اگر عمق نسبت به پایهٔ تابع بیشتر از ۴ شود و قانون تو در تو فعال باشد، یک یافته روی همان خط، فقط یک بار برای هر تابع (`frame.nested`).
- وقتی عمق به پایهٔ قاب برگردد، اگر طول تابع (خط پایان منهای شروع به‌علاوه ۱) بیشتر از ۸۰ باشد، یافتهٔ تابع طولانی روی خط شروع ثبت می‌شود.
- نام تابع از `function name` یا شناسهٔ قبل از `=` یا `(` استخراج می‌شود، وگرنه کلمهٔ `function`.
- پیام یافته جزئیات را هم دارد: «Function is longer than 80 lines: foo is 91 lines» یا «nests more than 4 blocks».

### ۱۰.۲ `documentFindings`

فایل: `packages/application/src/rules/document-checker.ts`

سه مسیر:

1. سند: اگر HTML/HTM باشد، یا نام فایل دقیقاً `layout.tsx|jsx`، `_document.tsx|jsx`، `document.tsx|jsx` باشد. چک‌های سطح سند (عنوان، توضیح، کانونیکال، lang، h1، og، viewport) و برای HTML خالص، اسکریپت مسدودکنندهٔ head.
2. مارک‌آپ: هر html/htm/tsx/jsx برای alt و ابعاد تصویر، خط‌به‌خط. تگ چندخطی را نمی‌بیند چون `alt` باید همان خط `img` باشد.
3. استایل: css/scss برای `@font-face`.

قانون غیرفعال (نبودن در Map بعد از override) یافته نمی‌سازد. خط یافته‌های سطح سند همیشه ۱ است.

وجود `export const metadata` فقط قانون عنوان را ساکت می‌کند، نه توضیح متا یا کانونیکال را. وجود `export const viewport` فقط قانون viewport را ساکت می‌کند.

---

## ۱۱. قانون سفارشی YAML

بارگذار: `loadCustomRules` در `packages/core/src/config/yaml-project-config-loader.ts`

پوشه: `{root}/.codigate/rules`

هر `.yml` / `.yaml` یا یک شیء قانون است یا آرایه‌ای از قانون. شیء بدون `id` نادیده گرفته می‌شود. `severity` باید یکی از چهار مقدار معتبر باشد وگرنه بارگذاری با خطا می‌ایستد و کل اسکن شکست می‌خورد (خطا بلعیده نمی‌شود؛ `catch` فقط برای نبودن پوشه یا خطای خواندن پوشه است. خطای `assertRule` از داخل حلقه بالا می‌رود).

نمونهٔ موجود `.codigate/rules/no-direct-axios.yml`:

- شناسه `custom.no-direct-axios`
- دسته `conventions`، شدت `high`
- گلاب `**/*.{ts,tsx,js,jsx}`
- الگو: import از `'axios'` یا `axios.`
- پیشنهاد: عبور HTTP از `ApiClient`

تفاوت با `arch.axios-in-ui`: این یکی import و استفادهٔ نقطه‌ای را در فایل‌های غیر UI هم می‌گیرد، نه فقط `axios(` داخل tsx.

### override در `applyRuleOverrides`

فایل: `packages/application/src/rules/apply-rule-overrides.ts`

- `enabled: false` قانون را کاملاً حذف می‌کند، حتی اگر سفارشی باشد.
- `severity` نامعتبر خطا می‌دهد: `Invalid severity "..." for {id}. Use high, medium, low, or info.`
- `severity` معتبر جایگزین شدت اصلی می‌شود و بقیهٔ فیلدها می‌مانند.
- قانون‌هایی که در `rules` پیکربندی نیستند دست نمی‌خورند.
- کلید override برای شناسه‌ای که قانونی با آن نیست، نادیده گرفته می‌شود.

`YamlProjectConfigLoader.load` هم قبل از برگرداندن پیکربندی، شدت overrideها را با `assertOverrides` چک می‌کند. پس شدت بد، هم موقع خواندن پیکربندی و هم موقع اعمال قانون خطا می‌دهد. خواندن پیکربندی در CLI قبل از `createEngine` انجام می‌شود؛ اگر YAML خراب باشد یا شدت بد باشد، حلقهٔ `load` به فایل بعدی می‌رود (`catch` همهٔ خطاها را می‌بلعد) و اگر هیچ فایلی سالم خوانده نشود، پیکربندی خالی برمی‌گردد. این یعنی YAML نامعتبر در `config.yml` سکوت‌کننده است، ولی YAML نامعتبر در قانون سفارشی (وقتی پوشه خوانده شود و `assertRule` پرتاب کند) اسکن را می‌ترکاند. تفاوت مهم عملیاتی است.

ترتیب نامزدهای پیکربندی:

1. `.codigate/config.yml`
2. `.codigate/config.yaml`
3. `codigate.yml` در ریشه

اولین فایلی که خوانده و پارس شود برنده است. بقیه ادغام نمی‌شوند.

---

## ۱۲. ایندکس، تست گم‌شده، تشخیص پشته

### ۱۲.۱ `RegexCodeIndexer`

فایل: `packages/core/src/code-index/regex-code-indexer.ts`

برای هر فایل:

- تست است اگر `.spec.` یا `.test.` در مسیر باشد یا مسیر `/__tests__/` داشته باشد.
- زبان: `typescript` برای ts/tsx، `javascript` برای js/jsx، `python` برای py، وگرنه `text`.
- نمادها خط‌به‌خط:
  - `class Name` با حرف بزرگ → گونهٔ `class`
  - وگرنه `useX` به‌صورت const یا function → `hook`
  - وگرنه `function name` → اگر خط `<` داشته باشد یا فایل tsx باشد `component`، وگرنه `function`
- گونهٔ فایل، به ترتیب اولویت:
  1. مسیر شامل `controller` → controller
  2. شامل `service` → service
  3. شامل `hook` یا وجود نماد hook → hook
  4. شامل `util` یا `helper` → util
  5. پسوند tsx/jsx → component
  6. وگرنه `other`

کلمهٔ `service` داخل هر مسیر، فایل را سرویس می‌کند؛ مثلاً `customer-service-notes.md` اگر پسوند متنی مجاز باشد و الگو جور شود. مارک‌داون نماد function ندارد ولی گونهٔ فایل از روی نام مسیر است.

### ۱۲.۲ `missingTestTargets`

فایل: `packages/application/src/testing/missing-tests.ts`

نام‌های تست‌شده = نام پایهٔ فایل‌های تست به‌علاوه نام نمادهای داخل فایل تست.

کاندید = فایل غیرتست با گونهٔ service، controller، hook، یا util. کامپوننت و other در این فهرست نیستند.

اگر نه نام پایهٔ فایل و نه هیچ نمادش در مجموعهٔ نام‌های تست باشد، نام پایه (بدون پسوند) به فهرست گم‌شده اضافه می‌شود. خروجی یکتا و مرتب است. مسیر کامل نیست. پس دو فایل `a/foo.ts` و `b/foo.ts` یک نام می‌شوند.

جریمه در امتیاز تست: هر نام گم‌شده ۴ امتیاز، سقف ۴۰.

### ۱۲.۳ `testingCoverageFromIndex`

فایل: `packages/application/src/testing/coverage-from-index.ts`

چهار سطل: `Services`، `Controllers`، `Utils`، `Hooks`.

فایل تست، و گونهٔ `other` و `component` در مخرج نیستند.

تطابق پوشش شل است: نام پایهٔ فایل تست (حروف کوچک) شامل نام فایل باشد، یا نام فایل شامل نام تست بعد از حذف `.spec` و `.test` باشد. این تطبیق دوطرفه مثبت کاذب می‌سازد (نام کوتاه داخل نام بلند).

اگر مخرج یک سطل صفر باشد، درصد آن سطل ۱۰۰ است، نه «اندازه‌گیری نشده». به همین دلیل یک پروژهٔ بدون سرویس و کنترلر و هوک و util در اسکن، هر چهار درصد را ۱۰۰ نشان می‌دهد و `testsMin` را پاس می‌کند، حتی اگر هیچ تستی وجود نداشته باشد.

این درصدها فقط خروجی `scan` / `gate` / `findings` / ابزار MCP `scan_project` هستند. `analyze` اگر پوشش خطی را اندازه بگیرد، این شیء را با unit/component/integration عوض می‌کند.

### ۱۲.۴ `detectStack`

فایل: `packages/application/src/project/detect-stack.ts`

از `dependencies` و `devDependencies`:

- وجود `next` → `Next.js`
- هر نام با پیشوند `@nestjs/` → `NestJS`
- وجود `react` و نبود Next در فهرست → `React`
- وجود `typescript` یا `@types/node` → `TypeScript`
- وجود `express` و نبود Nest → `Express`

خروجی با ` / ` به هم وصل می‌شود. JSON خراب یا بدون این نام‌ها → `undefined` و در گزارش خط Stack چاپ نمی‌شود.

این مخزن خودش Next/Nest/React/Express نیست؛ `typescript` در devDependencies ریشه نیست (در بستهٔ ریشه devDependency است: `typescript`). وقتی کدگیت روی خودش اسکن شود، `package.json` ریشه کلید `typescript` را در devDependencies دارد، پس پشته حداقل `TypeScript` تشخیص داده می‌شود.

---

## ۱۳. موتور امتیاز

فایل: `packages/application/src/scoring/scoring-engine.ts`

جریمهٔ هر یافته:

| شدت | جریمه |
| --- | --- |
| high | ۲۰ |
| medium | ۸ |
| low | ۳ |
| info | ۰ |

امتیاز یک دسته = `clamp(100 - جمع جریمهٔ یافته‌های آن دسته)`. `clamp` بین ۰ و ۱۰۰ و گرد شده.

گروه‌بندی:

- امنیت نمایشی و کلی = دسته‌های `security` + `dependencies`
- کیفیت = `quality` + `architecture` + `conventions`
- معماری، عملکرد، قرارداد، سئو = همان تک‌دسته
- تست = امتیاز دستهٔ `testing` منهای جریمهٔ تست گم‌شده (حداکثر ۴۰) منهای جریمهٔ پوشش

جریمهٔ پوشش اگر `coverage` داده شده باشد: `round((100 - میانگین مقدارها) * 0.3)`. اگر داده نشده باشد صفر است. در اسکن، coverage ایندکس همیشه داده می‌شود (چهار عدد)، پس این جریمه همیشه در اسکن هست. اگر هر چهار سطل ۱۰۰ باشند، جریمهٔ پوشش صفر است.

امتیاز کلی، گرد شده:

```text
overall = security * 0.30
        + quality  * 0.25
        + testing  * 0.20
        + performance * 0.15
        + seo * 0.10
```

معماری و قرارداد وزن مستقل در کلی ندارند؛ داخل کیفیت (وزن ۰٫۲۵) هستند و همزمان ستون جدا در `Scorecard` دارند. پس یک یافتهٔ معماری هم کیفیت را کم می‌کند هم ستون معماری را، ولی در کلی فقط از مسیر کیفیت اثر دارد.

`fileScores` یافته‌ها را بر اساس مسیر گروه می‌کند، برای هر فایل امنیت (security+dependencies)، کیفیت (quality+architecture+conventions)، معماری، و سئو را جدا حساب می‌کند، و بر اساس تعداد یافته نزولی مرتب می‌کند. فایل بدون یافته در این فهرست نیست.

یک یافتهٔ `high` امنیتی به‌تنهایی امنیت را به ۸۰ می‌رساند. پنج یافتهٔ high امنیت را به ۰ می‌رساند.

---

## ۱۴. گونه و خلاصهٔ پوشش خطی

فایل: `packages/application/src/testing/coverage-kind.ts`

`coverageKind`:

- فایل تست (`.spec.` / `.test.` / `__tests__`) و فایل `.d.ts` → `undefined` (در میانگین نمی‌آید).
- اگر گلاب سفارشی باشد، به این ترتیب اولین تطبیق: component، بعد integration، بعد unit.
- وگرنه اگر مسیر `/integration/` یا `.integration.` داشته باشد → integration.
- وگرنه tsx/jsx یا `.component.` → component.
- وگرنه ts/js/mjs/cjs → unit.
- بقیه (md، json، html، ...) → خارج از پوشش.

`summarizeCoverage` میانگین درصد خط هر گونه را گرد می‌کند و فایل‌های زیر `threshold` را در `uncovered` با گونه می‌گذارد.

گلاب ساده: `**` یعنی `.*`، `*` یعنی `[^/]*`، آکولاد `{a,b}` گسترش می‌یابد، پرچم `i`. این همان موتور گلاب قانون نیست؛ قانون از `matchesGlob` در `ignored-paths.ts` استفاده می‌کند که کمی متفاوت است (لنگر ابتدا/انتها با `/`، و پشتیبانی `?`).

---

## ۱۵. هسته: آداپترها

### ۱۵.۱ فایل‌سیستم

`NodeFileSystem` در `packages/core/src/file-system/node-file-system.ts`

`ignored-paths.ts`:

نام‌هایی که هر بخش مسیر اگر برابرشان باشد کل زیرشاخه حذف می‌شود:

`.git`، `.codigate`، `node_modules`، `dist`، `build`، `.next`، `coverage`، `.nx`، `.turbo`، `out`، `tmp`، `vendor`، `__pycache__`، `.venv`، `workspace_modules`

نتیجه: خود پیکربندی `.codigate` و تاریخچه و کش گیت‌لب و گزارش پوشش، وارد اسکن نمی‌شوند. `node_modules` هم وارد نمی‌شود.

`.gitignore` خوانده می‌شود. خط خالی و خط با `#` حذف می‌شوند. نفی با `!` پیاده نشده و آن الگو همیشه «نادیده‌نگرفته» برمی‌گرداند (یعنی استثنا کار نمی‌کند). الگوی ختم‌شده به `/` فقط پوشه است و اگر بخش آخر نقطه داشته باشد (فایل) رد نمی‌شود. الگوی بدون اسلش به `**/{pattern}` تبدیل می‌شود. الگوی با اسلش ابتدایی، اسلش اول را از دست می‌دهد و نسبی می‌شود.

`assertWithinRoot`: مسیر حل‌شده باید خود ریشه یا با پیشوند `root + sep` باشد. وگرنه `Path escapes project root: ...`. این مانع `../` برای خواندن و نوشتن خارج از پروژه است. لینک نمادین بعد از `resolve` چک می‌شود، پس لینکی که بیرون را نشان دهد باید توسط `resolve` به مسیر واقعی بیرون تبدیل شود و رد شود. `listFiles` لینک نمادین به فایل را جمع نمی‌کند (`isFile` برای سیم‌لینک معمولاً false است، مگر اینکه نود آن را فایل ببیند). در درخت ساختار، سیم‌لینک به‌صورت فایل برگ نشان داده می‌شود و دنبال نمی‌شود.

پیمایش درخت فرزندان را با `localeCompare` مرتب می‌کند. `listFiles` در پایان کل فهرست را مرتب می‌کند.

### ۱۵.۲ موتور الگوی قانون

`PatternRuleEngine`:

برای هر فایل و هر قانون، اگر گلاب رد کند یا pattern نباشد، ادامه. عبارت با پرچم `gi` ساخته می‌شود. اگر نامعتبر باشد، `new RegExp` کل `analyze` را با استثنا متوقف می‌کند. بعد از هر `test`، `lastIndex` صفر می‌شود چون پرچم `g` وضعیت را نگه می‌دارد. هر خط حداکثر یک یافته برای هر قانون، حتی اگر چند تطبیق داشته باشد. شمارهٔ خط از ۱. شناسه `` `${rule.id}:${file.path}:${line}` ``.

### ۱۵.۳ انبارهٔ تاریخچه

`JsonlAnalysisStore`:

مسیر: `{root}/.codigate/history.jsonl`

`save` پوشه را می‌سازد، همهٔ رکوردها را می‌خواند، رکورد جدید را ته اضافه می‌کند، فقط ۵۰ تای آخر را نگه می‌دارد، و کل فایل را دوباره می‌نویسد. هر خط یک JSON کامل `AnalysisRun` است، شامل همهٔ یافته‌ها. فیلد `compact` در کد همان run است و یافته‌ها را کم نمی‌کند.

خط خراب در `JSON.parse` کل `readAll` را به شکست می‌اندازد و `catch` فهرست خالی برمی‌گرداند؛ یعنی یک خط خراب تاریخچه را از دید خواننده پاک می‌کند و `save` بعدی فقط رکورد جدید را می‌نویسد (قبلی‌ها در حافظه نیستند و روی دیسک بازنویسی می‌شوند).

### ۱۵.۴ Git

`NodeGitRepository` با `execFile('git', args)` بدون شل. خطاها بلعیده می‌شوند. پایهٔ پیش‌فرض diff برابر `HEAD~1` است، نه diff کاری نسبت به ایندکس. پس `--diff` تغییرات stage‌نشدهٔ commit‌نشده را نسبت به والد HEAD می‌بیند فقط اگر آن‌ها در `git diff HEAD~1` باشند؛ تغییرات فقط working tree که هنوز در هیچ commit نیستند در `git diff HEAD~1` نیستند مگر اینکه نسبت به والد HEAD فرق داشته باشند. رفتار دقیق همان `git diff --name-only HEAD~1` است: تفاوت بین درخت والد اول HEAD و working tree به‌همراه ایندکس، طبق معنای پیش‌فرض `git diff <commit>`.

### ۱۵.۵ پیکربندی YAML

در بخش ۱۱ توضیح داده شد. کلاس `YamlProjectConfigLoader`.

### ۱۵.۶ مدل زبانی

`resolveAiConfig` در `packages/core/src/llm/resolve-ai-config.ts`

`pick` اولین رشتهٔ غیرخالی بعد از `trim` را برمی‌گرداند.

دو حالت:

1. اگر شیء `settings` پاس داده شود (افزونهٔ VS Code همیشه پاس می‌دهد): ترتیب تنظیمات ادیتور، بعد `project.ai`، بعد متغیر محیط.
2. اگر `settings` نباشد (CLI): ترتیب متغیر محیط، بعد `project.ai`.
3. `createEngine()` بدون آرگومان (سرور MCP): فقط `process.env`. بلوک `ai` داخل YAML برای MCP خوانده نمی‌شود، چون `createServer` پیکربندی پروژه را به `resolveAiConfig` نمی‌دهد. ابزارهای فعلی MCP هم مسیر مدل را صدا نمی‌زنند؛ اسکنشان ایستا است.

متغیرها:

- `CODIGATE_API_BASE`
- `CODIGATE_API_KEY`
- `CODIGATE_MODEL`

`OpenAiCompatibleAdapter`:

- `available()` یعنی هر سه مقدار بعد از trim غیرخالی باشند. درخواست شبکه برای سلامت نمی‌زند.
- `complete` اگر ناقص باشد: `AI is not configured. Set the API base URL, API key, and model.`
- URL: اسلش انتهای `apiBase` حذف و `/chat/completions` چسبانده می‌شود.
- بدنه: `model`، `messages`، `temperature: 0.1`
- هدر: `authorization: Bearer {apiKey}` و `content-type: application/json`
- خطای HTTP: `AI request failed: HTTP {status}` بدون بدنهٔ پاسخ
- متن پاسخ: `choices[0].message.content` یا رشتهٔ خالی

پیکربندیcommitted این مخزن:

```yaml
ai:
  apiBase: https://aifa-chatbot.dev.dotin.ir/v1
  apiKey: ""
  model: assistance-model
```

کلید خالی است. در CLI، اگر محیط کلید را بدهد و آدرس و مدل را ندهد، `pick` از مقدار خالی محیط رد می‌شود و آدرس و مدل YAML را برمی‌دارد. پس با فقط `CODIGATE_API_KEY` روی این مخزن، هر سه مقدار پر می‌شوند. اگر محیط آدرس دیگری بدهد، آدرس محیط بر YAML غلبه می‌کند.

در VS Code ترتیب برعکس محیط است: تنظیم ادیتور اگر غیرخالی باشد اول است. تنظیم خالی رد می‌شود و نوبت YAML و سپس محیط می‌رسد.

### ۱۵.۷ اجرای تست و پوشش

`NodeTestRunner`:

`run`: اگر دستوری نباشد و اسکریپت `test` نباشد، `passed: false` و خروجی `No test script found in package.json`. اجرا با `exec` (شل) و timeout ۱۲۰۰۰۰ میلی‌ثانیه. خروج صفر یعنی پاس. خروج غیرصفر یعنی شکست و stdout/stderr در `output`.

`measureCoverage`:

- نبود `package.json` → `measured: false` و یادداشت «not a Node project».
- نبود اسکریپت test → «no test script».
- پوشهٔ `.codigate/coverage-report` پاک و دوباره ساخته می‌شود.
- انتخاب دستور:
  - اگر وابستگی `vitest` باشد یا اسکریپت شامل `vitest`: `npx vitest run --coverage --coverage.reporter=json-summary --coverage.reportsDirectory=.codigate/coverage-report`
  - وگرنه jest: `npx jest --coverage --coverageReporters=json-summary --coverageDirectory=...`
  - وگرنه: `npm test -- --coverage --coverage.reporter=json-summary --coverage.reportsDirectory=...`
- شکست اجرای تست پوشش را باطل نمی‌کند؛ اگر JSON نوشته شده باشد خوانده می‌شود.
- نامزد فایل خلاصه: `coverage-summary.json` سپس `coverage-final.json`.
- اگر هیچ‌کدام نباشد: «the test run did not write a coverage summary».
- درصد از `lines.pct`. کلید `total` رد می‌شود. تطبیق مسیر: برابری، یا ختم یکی به دیگری با `/`.
- هر فایل متنی که `listFiles` برگرداند و در خلاصه نباشد، درصد ۰ می‌گیرد و اگر ۰ زیر آستانه باشد «بدون پوشش» حساب می‌شود. این شامل markdown و json و yaml هم می‌شود فقط اگر `coverageKind` برایشان تعریف شود؛ برای md و json گونه `undefined` است و در `summarizeCoverage` حذف می‌شوند. فایل ts که در گزارش نیست ۰٪ unit می‌گیرد و وارد تولید تست می‌شود.

پوشش Istanbul/V8 باید reporter از نوع `json-summary` را واقعاً در آن پوشه بنویسد. اگر ابزار پروژه این پرچم را نشناسد، `measured` false می‌ماند و حلقهٔ تولید تست شروع نمی‌شود.

### ۱۵.۸ ممیزی وابستگی

`NpmDependencyAuditor`:

- بدون `package.json`: یک یافتهٔ info با شناسه `dep.audit.skipped`.
- `npm audit --json` با timeout ۶۰ ثانیه و بافر ۲۰ مگ. اگر خروج غیرصفر باشد ولی stdout با `{` شروع شود (رفتار عادی npm audit وقتی آسیب‌پذیری هست)، همان JSON پارس می‌شود.
- شکست واقعی: یافتهٔ info با شناسه `dep.audit.failed`.
- هر کلید `vulnerabilities`: یافته با شناسه `dep.vuln.{name}`، قانون `dep.vuln`، دسته `dependencies`، فایل `package.json` خط ۱. شدت npm: critical/high → high، moderate/medium → medium، low → low، بقیه info. پیشنهاد نسخه اگر `fixAvailable.version` باشد.
- `npm outdated --json` مشابه. اگر current و latest فرق داشته باشند: شناسه `dep.outdated.{name}`. اگر major آخرین بزرگ‌تر از major فعلی باشد شدت medium، وگرنه low. `major` اولین عدد داخل رشته است.
- شکست outdated: یافتهٔ info با `dep.outdated.failed`.

این یافته‌ها فقط در `analyze` (مسیر درخواستی) به نتیجه اضافه می‌شوند، نه در `scan` و نه در `gate`. پس CI این مخزن آسیب‌پذیری npm را در دروازه نمی‌بیند.

امنیت امتیاز، یافتهٔ `dependencies` را هم جریمه می‌کند. یک advisory با شدت high، ۲۰ امتیاز از امنیت کم می‌کند.

### ۱۵.۹ گیت‌هاب

`GithubPullRequestAdapter` توکن را از `process.env.GITHUB_TOKEN` در لحظهٔ ساخت می‌خواند (موقع `createEngine`). اگر خالی باشد هنگام درخواست: `GITHUB_TOKEN is required for pull request operations.`

- ساخت: `POST /repos/{owner}/{repo}/pulls` با title، body، head، base. هدر `accept: application/vnd.github+json`.
- کامنت: `POST /repos/{owner}/{repo}/issues/{number}/comments` فقط با body.
- خطای API: `GitHub API {status}: {body}`.

### ۱۵.۱۰ گیت‌لب

`isGitlabRemote` در اپلیکیشن:

- الگوی `git@host:path` فقط اگر رشته شامل `gitlab` باشد.
- URL با پروتکل http یا https که hostname شامل `gitlab` باشد.

پس `git@gitlab.example.com:group/proj.git` و `https://gitlab.com/group/proj.git` قبول‌اند. گیت‌هاب قبول نیست. یک URL گیت‌لب self-hosted فقط اگر نام میزبان کلمهٔ gitlab را داشته باشد قبول است.

`GitlabCheckout.resolve(target, workspace, cacheDir)`:

- اگر ریموت گیت‌لب نباشد، همان رشتهٔ target برمی‌گردد (برای مسیر محلی).
- مقصد: `{workspace}/{cacheDir}/{۱۶ نویسهٔ اول sha256 آدرس}`.
- `cacheDir` پیش‌فرض `.codigate/cache`، قابل تغییر با `gitlab.cacheDir`.
- اگر `.git` آنجا باشد: `git pull --ff-only --depth 1`.
- وگرنه پوشه پاک و `git clone --depth 1`.
- توکن `GITLAB_TOKEN` اگر باشد و خط جدید نداشته باشد، با `-c http.extraHeader=Authorization: Bearer {token}` پاس داده می‌شود. توکن در پیام خطا با `***` جایگزین می‌شود.
- شکست: `GitLab checkout failed: ...` یا `GitLab update failed: ...`.

تحلیل بعدی روی همین پوشهٔ کش انجام می‌شود، نه روی workspace فعلی. پیکربندی، قانون و تاریخچه هم از همان کلون خوانده و نوشته می‌شوند. پنل CLI با ریشهٔ workspace (محل اجرای دستور) بالا می‌آید نه لزوماً با پوشهٔ کلون؛ `ensurePanel(root, port)` در CLI متغیر `root` را بعد از حل گیت‌لب صدا می‌زند، پس پنل روی پوشهٔ کلون است. این با خواندن کد `main.ts` سازگار است: `root` دوباره انتساب داده می‌شود و همان به `analyzeOnDemand` و `ensurePanel` می‌رود.

کلون کم‌عمق است. `git diff HEAD~1` در کلون depth=1 ممکن است والد نداشته باشد و فهرست تغییر خالی بدهد. دستور `analyze` پرچم `--diff` را پاس نمی‌دهد، پس این محدودیت فقط اگر کسی بعداً اسکن diff را روی همان کش اجرا کند مهم است.

### ۱۵.۱۱ پنل محلی

`startAnalysisPanel` در `packages/core/src/panel/analysis-panel.ts`

- آدرس `http://127.0.0.1:{port}` و listen فقط روی `127.0.0.1`، نه `0.0.0.0`.
- اگر پورت از قبل باز باشد، سرور جدید ساخته نمی‌شود و `alreadyRunning: true`. تشخیص با یک اتصال TCP. هر پردازه‌ای که آن پورت را گرفته باشد «پنل کدگیت» فرض می‌شود.
- `GET` هر مسیری که با `/api/run` شروع شود: JSON آخرین `AnalysisRun` یا `null`.
- بقیه: HTML از `renderPanel`.
- خطای داخلی: وضعیت ۵۰۰ و متن خطا.

`renderPanel`:

- بدون اجرا: پیام `No analysis yet. Run codigate analyze in the project root.`
- با اجرا: نام پروژه، پشته، شاخه، ۷ نویسهٔ اول رویژن، زمان، نشان شدت، حلقهٔ امتیاز برای Overall / Security / Quality / SEO / Performance / Testing (معماری و قرارداد حلقه ندارند)، فهرست پوشش یا `Not measured.`، یادداشت پوشش، بخش Packages برای دستهٔ dependencies، بخش Issues برای بقیه تا ۲۰۰ یافته.
- رنگ حلقه: ۸۰ به بالا سبز `#15803d`، ۵۰ تا ۷۹ کهربایی `#b45309`، زیر ۵۰ قرمز `#b91c1c`.
- HTML با `escapeHtml` برای متن‌ها. صفحه `lang="en"` است.

پورت پیش‌فرض ۴۳۱۸، هم در کد و هم در `.codigate/config.yml` این مخزن (`panel.port: 4318`).

دستور `analyze` در CLI یک فرایند جدا با `spawn` از همان باینری و آرگومان‌های `panel {root}` می‌سازد، `detached` و `stdio: ignore` و `unref`. سپس URL را چاپ می‌کند. اگر پورت اشغال باشد، فرزند بلافاصله بعد از چاپ «already available» خارج می‌شود. اگر آزاد باشد، فرزند تا kill شدن گوش می‌دهد.

دستور `panel` خودش اگر سرور را ساخته باشد با `await new Promise(() => undefined)` زنده می‌ماند.

افزونه پنل را در همان فرایند اکستنشن بالا می‌آورد و URL را با `vscode.env.openExternal` باز می‌کند. `panelUrl` برای عمر فعال‌سازی کش می‌شود؛ تغییر پورت در همان جلسه دوباره خوانده نمی‌شود.

### ۱۵.۱۲ `createEngine`

خروجی `CodigateEngine` این عضوها را دارد و به همین شکل سیم‌کشی شده‌اند:

| عضو | نمونه |
| --- | --- |
| `fileSystem` | `NodeFileSystem` |
| `getProjectStructure` | یوزکیس روی همان فایل‌سیستم |
| `analyzeProject` | با `loadCustomRules` |
| `analyzeWithAi` | اسکن + بازبینی، ذخیره در همان store |
| `analyzeOnDemand` | هوش مصنوعی + ممیزی npm + تست‌رانر + تولید و اعمال تست |
| `gitlab` | `GitlabCheckout` |
| `store` | `JsonlAnalysisStore` |
| `proposeFix` / `applyPatch` / `generateTests` / `validateTests` | روی LLM و فایل‌سیستم و تست‌رانر مشترک |
| `runTests` | همان `NodeTestRunner` |
| `evaluateGate` | بدون وابستگی |
| `createPullRequest` / `reviewPullRequest` | git مشترک + `GithubPullRequestAdapter` |
| `configLoader` | `YamlProjectConfigLoader` |
| `llm` | `OpenAiCompatibleAdapter` |
| `loadCustomRules` | خود تابع |

یک موتور = یک انباره، یک مدل، یک git. تاریخچه بین اسکن و تحلیل درخواستی مشترک است، به همین دلیل یک دستور `analyze` چند رکورد پشت سر هم می‌نویسد (اسکن، سپس در صورت موفقیت هوش مصنوعی یک ذخیرهٔ دیگر، سپس ذخیرهٔ نهایی درخواستی).

---

## ۱۶. پیکربندی این مخزن، بند به بند

فایل `.codigate/config.yml`:

| بلوک | مقدار | اثر |
| --- | --- | --- |
| `conventions.architecture` | Clean Architecture | فقط متن برای مدل و برای جست‌وجوی زیررشته. کلمهٔ repository ندارد |
| `conventions.naming.components` | PascalCase | قانون `conv.pascal-components` |
| `conventions.naming.functions` | camelCase | قانون نام جداگانه‌ای برای camelCase ساخته نمی‌شود |
| `conventions.react` | Server Components by default | قانون الگویی مستقیم ندارد؛ به مدل داده می‌شود |
| `conventions.api` | React Query only | `conv.react-query-only` |
| `conventions.state` | Zustand only for client state | `conv.zustand-only` |
| `conventions.backend` | Repository pattern | `conv.repository-pattern` |
| `conventions.testing` | Vitest | قانون الگویی جدا ندارد |
| `conventions.security` | No secrets in source | `conv.no-secrets` |
| `panel.port` | 4318 | پورت پنل |
| `coverage.threshold` | 80 | آستانهٔ حلقهٔ تولید تست در `analyze` |
| `gitlab.cacheDir` | `.codigate/cache` | محل کلون |
| `ai.apiBase` | آدرس `/v1` داخل فایل | پایهٔ chat completions اگر محیط خالی باشد |
| `ai.apiKey` | رشتهٔ خالی | تا وقتی محیط یا تنظیم VS Code کلید ندهد، مدل در دسترس نیست |
| `ai.model` | `assistance-model` | نام مدل |
| `rules.seo.missing-meta-description` | enabled true، severity medium | همان پیش‌فرض |
| `gate.securityMin` | 80 | |
| `gate.overallMin` | 75 | |
| `gate.highMax` | 5 | |
| `gate.testsMin` | 50 | میانگین `testingCoverage` |

گلاب‌های سفارشی پوشش در این فایل نیستند، پس گونهٔ فایل از روی پسوند و نام مسیر تعیین می‌شود.

دروازهٔ CI (`codigate gate`) از همین چهار آستانه استفاده می‌کند، ولی پوششش تخمین ایندکس است نه پوشش Vitest، چون `gate` مسیر `analyzeOnDemand` را اجرا نمی‌کند. اگر میانگین Services/Controllers/Utils/Hooks زیر ۵۰ باشد، حتی با امتیاز کلی خوب، دروازه رد می‌شود. اگر `analyze` پوشش را اندازه نگیرد و کسی دروازه را روی آن اجرا کند، `testingCoverage` تهی است و `testsMin` شکست «اندازه‌گیری نشده» می‌دهد. دستور `gate` خودش همیشه اسکن ایستا است و coverage ایندکس را پر می‌کند، پس این شکست خاص برای `gate` پیش نمی‌آید مگر اینکه مسیر دیگری دروازه را روی اجرای درخواستیِ اندازه‌گیری‌نشده حساب کند. `pr --review` دروازه را روی نتیجهٔ `analyzeWithAi` حساب می‌کند که coverage ایندکس را از اسکن داخلی دارد، مگر اینکه هوش مصنوعی همان شیء را عوض کند (عوض نمی‌کند؛ فقط یافته و امتیاز را عوض می‌کند). پس `pr --review` هم تخمین ایندکس را می‌بیند، نه پوشش خطی.

---

## ۱۷. برنامهٔ CLI — دستور به دستور

ورود: `apps/cli/src/main.ts`. شِبَنگ `#!/usr/bin/env node`. آرگومان‌ها از `process.argv.slice(2)`.

تجزیه:

- اولین واژه دستور است. اگر نباشد، `scan`.
- واژه‌های شروع‌شده با `--` پرچم‌اند (مجموعه). `--apply` و `--gate` و `--diff` و `--review` این‌طور دیده می‌شوند. مقدار چسبیده مثل `--foo=bar` هم پرچم است و مقدارش جدا پارس نمی‌شود.
- بقیه positional هستند.
- `splitRoot`: اگر اولین positional وجود داشته باشد و پوشهٔ واقعی روی دیسک باشد، ریشه همان است و بقیه آرگومان فرمان‌اند. وگرنه ریشه `process.cwd()` است و همهٔ positionalها آرگومان فرمان‌اند. یک فایل (نه پوشه) ریشه حساب نمی‌شود. URL گیت‌لب پوشه نیست، پس ریشهٔ workspace همان cwd می‌ماند و URL در `args` می‌ماند. این برای `analyze` ضروری است.
- سپس `findProjectRoot` و بارگذاری YAML از ریشهٔ workspace (نه از کلون گیت‌لب؛ آن بارگذاری دوم داخل دستور analyze است).
- `createEngine(resolveAiConfig({ project: project.ai, env: process.env }))`.

خطای نوک `main` پیام را روی stderr می‌نویسد و `exitCode = 1` می‌گذارد. از `process.exit` فوری استفاده نمی‌کند، جز اینکه کد خروج را ست می‌کند.

### ۱۷.۱ `scan [path] [--gate] [--diff]`

`analyzeProject` با `changedFilesOnly` اگر `--diff`. گزارش `renderScanReport` روی stdout.

اگر `--gate`: بارگذاری مجدد پیکربندی، ارزیابی دروازه، چاپ نتیجه. اگر رد شود `exitCode = 1` ولی گزارش اسکن قبلاً چاپ شده است.

### ۱۷.۲ `analyze [path|gitlab-url]`

اگر یکی از آرگومان‌ها `isGitlabRemote` باشد، اول checkout/pull در کش، بعد `analyzeOnDemand` روی آن پوشه. وگرنه روی ریشهٔ حل‌شده.

گزارش چاپ می‌شود. سپس پنل جداگانه روی پورت `gitlab workspace config` یا ۴۳۱۸. ترتیب خواندن پورت: اول پیکربندی ریشه‌ای که تحلیل شده (کلون یا پروژه)، اگر `panel.port` نباشد پورت workspace، اگر آن هم نباشد ۴۳۱۸. چون `??` فقط `null/undefined` را رد می‌کند، پورت ۰ اگر صریحاً باشد استفاده می‌شود.

این دستور دروازه را چک نمی‌کند و کد خروج را به‌خاطر امتیاز پایین عوض نمی‌کند. شکست checkout یا اسکن، کد ۱ از catch اصلی است.

### ۱۷.۳ `panel [path]`

پورت از پیکربندی یا ۴۳۱۸. اگر از قبل بالا باشد یک خط و خروج. وگرنه سرور می‌ماند تا فرایند کشته شود.

### ۱۷.۴ `gate [path]`

مثل scan بدون `--diff`، و همیشه دروازه. این همان دستوری است که GitHub Action اجرا می‌کند.

### ۱۷.۵ `findings [path]`

اسکن کامل، سپس هر یافته با یک خط خالی فاصله، قالب:

```text
path:line
SEVERITY  ruleId
message
Suggested: ...
```

سقف ۴۰ تای گزارش خلاصه اینجا نیست؛ همهٔ یافته‌ها چاپ می‌شوند.

### ۱۷.۶ `fix [findingId] [--apply]`

یک اسکن تازه. اگر شناسه داده شده باشد همان `finding.id`، وگرنه اولین یافتهٔ آرایه. اگر هیچ یافته‌ای نباشد: `No finding to fix.`

دیف روی stdout. با `--apply` کل فایل بازنویسی می‌شود و `Applied {path}` چاپ می‌شود. بدون `--apply` فقط نمایش است و دیسک عوض نمی‌شود.

شناسه شامل مسیر مطلق و دونقطه است. در پوسته باید نقل شود.

### ۱۷.۷ `generate-tests <file> [--apply]`

اگر فایل نباشد: `Usage: codigate generate-tests <file>`. مسیر نسبت به ریشهٔ حل‌شده به فایل‌سیستم داده می‌شود؛ `readFile` آن را داخل ریشه resolve می‌کند.

خروجی: مسیر تست، خروجی اجرا (یا پیام ننوشتن)، و `Tests passed` یا `Tests did not pass`. کد خروج ۱ اگر پاس نشده باشد.

### ۱۷.۸ `test [path]`

اجرای `npm test` پروژهٔ هدف. stdout/stderr چاپ می‌شود. کد خروج ۰ یا ۱ بر اساس `passed`.

### ۱۷.۹ `pr [--review] [pullNumber]`

همیشه اول `analyzeWithAi` (نه ممیزی npm و نه تولید تست).

- بدون `--review`: ساخت پول‌ریکوئست و چاپ URL.
- با `--review`: شماره از `args[0]` با `Number`. اگر عدد نباشد، `NaN` به API می‌رود و گیت‌هاب خطا می‌دهد. دروازه با پیکربندی یا پیش‌فرض سخت‌گیر (`highMax: 0` و `securityMin: 80`) حساب می‌شود و کامنت گذاشته می‌شود. نتیجهٔ دروازه هم چاپ می‌شود. کد خروج به‌خاطر رد دروازه اینجا ست نمی‌شود؛ فقط کامنت «blocked» می‌رود.

### ۱۷.۱۰ دستور ناشناس

متن Usage روی stderr و کد ۱. Usage رسمی داخل کد:

```text
codigate scan [path] [--gate] [--diff]
codigate analyze [path|gitlab-url]
codigate panel [path]
codigate gate [path]
codigate findings [path]
codigate fix [findingId] [--apply]
codigate generate-tests <file> [--apply]
codigate test [path]
codigate pr [--review] [pullNumber]
```

### ۱۷.۱۱ قالب گزارش اسکن

`renderScanReport` در `apps/cli/src/report.ts`:

- عنوان `Codigate Analysis`
- نام پروژه و در صورت وجود پشته
- بلوک `CODIGATE SCORE` با Overall، Security، Code Quality، SEO، Performance، Testing. هر عدد سه‌رقمی راست‌چین. معماری و قرارداد چاپ نمی‌شوند
- اگر `previousScores` باشد: Previous، Current، دلتا با `↑` / `↓` / `→`
- شمارش High/Medium/Low/Info
- بخش Testing Coverage: یا `Not measured` یا هر کلید با درصد
- `coverageNote` اگر باشد
- فهرست `Missing tests` اگر ناتهی
- بخش Packages فقط یافته‌های `dependencies`، بدون سقف
- بخش Issues تا ۴۰ یافتهٔ غیر وابستگی
- بخش Files تا ۲۰ فایل با بیشترین یافته

`renderGate`: یا `✓ Codigate Quality Gate PASSED` یا `❌ Codigate Quality Gate FAILED` به‌علاوه هر خط شکست.

---

## ۱۸. افزونهٔ VS Code

فعال‌سازی: `onStartupFinished`. نقطهٔ ورود `./dist/main.js`. تابع `activate` / `deactivate`.

### ۱۸.۱ سهم‌ها (contributes)

دستورها:

| شناسه | عنوان |
| --- | --- |
| `codigate.scan` | Codigate: Scan Workspace |
| `codigate.analyze` | Codigate: Analyze |
| `codigate.openPanel` | Codigate: Open Panel |
| `codigate.fix` | Codigate: Fix Finding |

دستور `codigate.openFinding` در package.json ثبت نشده و فقط از درخت یافته با `command` روی آیتم صدا زده می‌شود. چون در `activate` با `registerCommand` ثبت می‌شود، از داخل اکستنشن کار می‌کند.

کانتینر نوار فعالیت با شناسه `codigate` و آیکون `media/icon.svg`. دو نما:

- `codigate.scores` با نام Project Score
- `codigate.findings` با نام Findings

تنظیمات کاربر:

- `codigate.ai.apiBase` رشته، پیش‌فرض خالی. توضیح: آدرس سازگار با OpenAI شامل `/v1`
- `codigate.ai.apiKey` رشته، پیش‌فرض خالی. به‌عنوان Bearer فرستاده می‌شود
- `codigate.ai.model` رشته، پیش‌فرض خالی

### ۱۸.۲ موتور هر بار تازه ساخته می‌شود

`workspaceEngine` هر بار `createEngine` جدید می‌سازد. ریشه همیشه اولین `workspaceFolders[0]` است. اگر پوشه‌ای باز نباشد: `Open a workspace folder to run Codigate.`

ترتیب پیکربندی هوش مصنوعی: تنظیمات VS Code، بعد YAML پروژه، بعد محیط. نگاه کنید به بخش ۱۵.۶.

### ۱۸.۳ `codigate.scan`

`analyzeProject` روی ریشهٔ پوشه. نتیجه در `latestRun`. درخت امتیاز و درخت یافته به‌روز می‌شوند. تشخیص‌ها منتشر می‌شوند. پیام اطلاعات: `Codigate overall {n}/100`. نوار پیشرفت ندارد.

### ۱۸.۴ `codigate.analyze`

همان کار با `analyzeOnDemand` داخل `withProgress` با عنوان `Codigate analyze`. سپس `openPanel`. چون تحلیل درخواستی ممکن است تست بنویسد و npm audit بزند، این دستور از اسکن کندتر و دارای اثر جانبی روی دیسک است.

### ۱۸.۵ تشخیص درون‌خطی

کالکشن `codigate`. قبل از پر شدن پاک می‌شود.

برای هر یافته یک `Diagnostic` از ستون ۰ (یا `column` اگر باشد) تا ستون ۲۰۰ روی همان خط. پیام: `SEVERITY: message` و اگر پیشنهاد باشد ` — Fix: suggestion`. `source = Codigate` و `code = ruleId`.

نگاشت شدت:

| یافته | DiagnosticSeverity |
| --- | --- |
| high | Error |
| medium | Warning |
| low و info | Information |

مسیر باید برای `vscode.Uri.file` معتبر باشد. یافته‌های npm با `filePath: 'package.json'` نسبی هستند و ممکن است به فایل درست workspace نچسبند، چون URI فایل نسبی نسبت به فرآیند ساخته می‌شود نه لزوماً ریشهٔ پوشه.

`deactivate` کالکشن را پاک می‌کند.

### ۱۸.۶ درخت امتیاز

اگر هنوز اجرایی نباشد: یک آیتم `Run Codigate: Scan Workspace`. بعد از اجرا شش آیتم: Overall، Security، Quality، SEO، Performance، Testing. کلیک فرمان ندارد.

### ۱۸.۷ درخت یافته

سطح اول چهار گره شدت با شمارش، حتی اگر صفر باشد، همگی Collapsed. فرزندها یافته‌های همان شدت. برچسب = پیام، description = `path:line`، tooltip = پیام و در صورت وجود پیشنهاد. کلیک: `codigate.openFinding` که سند را باز می‌کند، مکان‌نما را اول خط می‌گذارد و رنج را reveal می‌کند.

### ۱۸.۸ اصلاح از ادیتور

`codigate.fix` یافته را از آرگومان درخت (`item.finding`) یا از اولین یافتهٔ `latestRun` برمی‌دارد. اگر نباشد هشدار: `No Codigate finding to fix.`

دیف در یک سند بی‌عنوان با زبان `diff` باز می‌شود (روی دیسک نیست). سپس پرسش `Apply fix to {path}?` با دکمهٔ `Apply`. فقط در صورت تأیید، `applyPatch` کل فایل را می‌نویسد. رد کردن پرسش، دیسک را عوض نمی‌کند.

این مسیر از آیتم درخت فقط اگر فرمان fix با آن آیتم صدا زده شود کار می‌کند. منوی زمینهٔ صریحی در `package.json` برای کلیک‌راست روی یافته ثبت نشده؛ فرمان از پالت دستور در دسترس است و آن وقت آرگومان درخت را ندارد، پس اولین یافته را برمی‌دارد.

### ۱۸.۹ پنل از اکستنشن

اگر `panelUrl` خالی باشد سرور را در فرایند اکستنشن بالا می‌آورد و URL را کش می‌کند، بعد مرورگر سیستم را باز می‌کند. بستن پنجرهٔ مرورگر سرور را خاموش نمی‌کند. تا وقتی VS Code پنجره را نبسته، listen می‌ماند. اگر پورت اشغال باشد، URL همان پورت موجود باز می‌شود حتی اگر مال کدگیت نباشد.

دیباگ: `.vscode/launch.json` پیکربندی `Debug @codigate/mcp-server with Nx` روی پورت inspect ۹۲۲۹ و `Debug @codigate/vscode-extension with Nx` روی ۹۲۳۰. هدف serve برای اکستنشن در `package.json` اکستنشن تعریف نشده؛ فقط build با esbuild هست. پس پیکربندی launch اکستنشن به هدف Nxای اشاره می‌کند که در بسته ثبت نشده است.

ساخت اکستنشن: esbuild، خروجی `apps/vscode-extension/dist`، قالب cjs، `bundle: true`، و `vscode` خارجی. سورس‌مپ در development روشن و در production خاموش.

---

## ۱۹. سرور MCP

### ۱۹.۱ بالا آمدن

`apps/mcp-server/src/main.ts` تابع `serveStdio(createServer)` از SDK را صدا می‌زند. خطاها روی stderr. بعد از شروع، `Codigate MCP server running on stdio` هم روی stderr است تا stdout مخصوص پروتکل بماند.

`createServer` یک `McpServer` با نام `codigate` و نسخهٔ `0.0.1` می‌سازد، `createEngine()` بدون پیکربندی پروژه، و سه ابزار ثبت می‌کند.

کانتینر `composition/container.ts` یک فایل‌سیستم و یک `ToolRegistry` جدا از موتور می‌سازد. فقط ابزار ساختار پوشه از `getProjectStructureUseCase` این کانتینر استفاده می‌کند. اسکن و خواندن فایل از موتور `createEngine` استفاده می‌کنند. دو نمونهٔ `NodeFileSystem` هم‌زمان وجود دارد؛ رفتارشان یکی است چون حالت داخلی ندارند.

`registerToolUseCase` ساخته و صادر شده ولی در `server.ts` استفاده نمی‌شود.

ساخت: esbuild بدون باندل (`bundle: false`)، خروجی `apps/mcp-server/dist`، به‌علاوه هدف‌های Nx برای هرس lockfile و کپی ماژول‌های workspace تا بتوان سرور را جدا اجرا کرد. دارایی‌ها از `apps/mcp-server/src/assets` کپی می‌شوند؛ این پوشه در سورس فعلی الزاماً پر نیست.

اجرای بازرسی که README گفته:

```bash
npx nx build mcp-server
npx @modelcontextprotocol/inspector node apps/mcp-server/dist/main.js
```

### ۱۹.۲ ابزار `get_project_structure`

ورودی Zod:

- `root` اختیاری. پیش‌فرض `process.cwd()`
- `maxDepth` اختیاری، عدد صحیح ≥ ۰. پیش‌فرض ۴. صفر یعنی فقط ریشه

خواندنی، غیردخرب، تکرارپذیر (`readOnlyHint`، `destructiveHint: false`، `idempotentHint: true`).

خروجی: JSON درخت با تورفتگی ۲، داخل content از نوع text. خطا: `isError: true` و پیام.

عمق و نادیده‌گیری همان `NodeFileSystem` است. `.git` و `node_modules` و `.codigate` در درخت نیستند.

### ۱۹.۳ ابزار `scan_project`

ورودی: `root` اختیاری، پیش‌فرض cwd.

`analyzeProject` بدون `--diff`. خروجی JSON با `scores`، `counts`، حداکثر ۱۰۰ یافتهٔ اول، و `missingTests`. بقیهٔ فیلدهای `AnalysisRun` (کارت فایل، شاخه، پشته، پوشش) در پاسخ MCP نیستند، ولی در تاریخچهٔ پروژه ذخیره شده‌اند.

اسکن ایستا است. ممیزی npm و مدل زبانی این ابزار را طی نمی‌کنند.

### ۱۹.۴ ابزار `read_file`

ورودی: `root` اختیاری و `path` الزامی نسبت به ریشهٔ پروژه.

اول `findProjectRoot`، بعد `readFile`. فرار از ریشه خطا است و به‌صورت `isError` برمی‌گردد. محتوا خام متن است، نه JSON.

ابزار نوشتن فایل در MCP نیست. عامل از این سرور نمی‌تواند `applyPatch` بزند.

---

## ۲۰. سناریوهای انتها‌به‌انتها

### سناریو ۱ — اسکن محلی بدون هیچ کلیدی

1. کاربر در ریشهٔ پروژه `node apps/cli/dist/main.js scan` می‌زند (بعد از `npx nx build cli`).
2. CLI ریشه را با بالا رفتن تا `package.json` یا `.git` پیدا می‌کند.
3. YAML خوانده می‌شود. کلید هوش مصنوعی خالی است و اگر محیط هم خالی باشد، مدل «در دسترس نیست» است؛ ولی scan اصلاً مدل را صدا نمی‌زند.
4. فایل‌ها جز مسیرهای نادیده و جز فایل بزرگ و جز کاتالوگ قانون خوانده می‌شوند.
5. قانون توکار + قراردادی + `custom.no-direct-axios` با overrideها اعمال می‌شوند.
6. سه موتور یافته می‌سازند، ایندکس و امتیاز و تخمین تست حساب می‌شود.
7. یک خط JSON در `.codigate/history.jsonl` اضافه می‌شود (حداکثر ۵۰ خط).
8. گزارش متنی چاپ می‌شود. کد خروج ۰، مگر اینکه استثنایی مثل قانون YAML خراب رخ دهد.

### سناریو ۲ — دروازه در CI

فایل `.github/workflows/codigate.yml` نامش Codigate Quality Gate است.

رویداد: هر pull_request، و push به `main` یا `master`.

گام‌ها: checkout، نصب Node ۲۲ با کش npm، `npm ci`، `npx nx build cli`، `node apps/cli/dist/main.js gate`.

`gate` اسکن ایستا کامل (نه diff) است و دروازهٔ YAML را اعمال می‌کند: امنیت ≥ ۸۰، کلی ≥ ۷۵، تعداد high ≤ ۵، میانگین پوشش تخمینی ≥ ۵۰. رد شدن یعنی `exitCode = 1` و شکست job. هوش مصنوعی، npm audit، و پنل در این مسیر نیستند. توکن گیت‌هاب برای کامنت استفاده نمی‌شود؛ فقط شکست یا موفقیت چک است.

### سناریو ۳ — اسکن فقط فایل‌های متفاوت با والد

`codigate scan --diff` یا همراه `--gate`.

`git diff --name-only HEAD~1` فهرست را محدود می‌کند. اگر مخزن git نباشد، فهرست تغییر خالی است و هیچ فایلی تحلیل نمی‌شود؛ امتیازها نزدیک ۱۰۰ می‌مانند چون یافته‌ای نیست و سطل‌های تست خالی ۱۰۰٪ هستند. این یک گوشهٔ مهم است: `--diff` خارج از git می‌تواند دروازه را به‌اشتباه پاس کند.

### سناریو ۴ — تحلیل درخواستی با مدل و پوشش پایین

1. سه مقدار هوش مصنوعی پر است.
2. `analyze` اسکن می‌کند، تا ۸ فایل متخلف را به مدل می‌دهد، یافته‌ها را ادغام و دوباره ذخیره می‌کند.
3. `npm audit` و `npm outdated` یافتهٔ وابستگی می‌سازند.
4. Vitest/Jest با reporter خلاصه در `.codigate/coverage-report` اجرا می‌شود.
5. اگر مثلاً unit زیر ۸۰ باشد، تا ۸ فایل کم‌پوشش انتخاب می‌شوند، برای هرکدام تست تولید و بلافاصله نوشته می‌شود.
6. حداکثر ۳ دور. هر دور پوشش را دوباره می‌سنجد.
7. امتیاز نهایی با یافته‌های یکتاشده و پوشش خطی حساب و ذخیره می‌شود.
8. پنل پس‌زمینه بالا می‌آید و گزارش چاپ می‌شود.

اگر در دور دوم تولید تست خطا بدهد، یادداشت خطا در گزارش هست و دورهای بعدی ادامه نمی‌یابند. تست‌های نوشته‌شده تا آن لحظه روی دیسک می‌مانند؛ تراکنش یا rollback نیست.

### سناریو ۵ — تحلیل بدون مدل

`analyze` اسکن می‌کند، مدل را رد می‌کند، ممیزی npm را انجام می‌دهد، پوشش را اندازه می‌گیرد. اگر زیر آستانه باشد تست نمی‌نویسد و یادداشت پیکربندی را در گزارش می‌گذارد. امتیاز با یافته‌های ممیزی و در صورت موفقیت اندازه‌گیری، با درصد خطی دوباره حساب می‌شود.

### سناریو ۶ — اصلاح یک یافته

1. `codigate fix` یا `codigate fix "{id}"` اسکن می‌کند.
2. مدل باید در دسترس باشد وگرنه همان اول `complete` خطا می‌دهد.
3. دیف نمایش داده می‌شود.
4. `--apply` یا دکمهٔ Apply در VS Code کل محتوای برگشتی مدل را جایگزین فایل می‌کند. اگر مدل حصار را بد برگرداند، `stripFence` فقط یک حصار ابتدا و یکی انتها را برمی‌دارد. اگر مدل توضیح اضافه قبل از کد بگذارد، آن توضیح داخل فایل نوشته می‌شود. اعتبارسنجی نحوی بعد از نوشتن نیست.

### سناریو ۷ — تولید تست و تعمیر تا ۳ بار

`generate-tests src/foo.ts --apply`:

فایل `src/foo.spec.ts` نوشته می‌شود. `npm test` کل پروژه سه بار تا پاس شدن صدا زده می‌شود. شکست هر تست دیگری در پروژه هم این حلقه را به تعمیر همان فایل تست جدید می‌فرستد، چون خروجی کل سوئیت به مدل داده می‌شود و فقط همان فایل تست بازنویسی می‌شود. اگر مقصر تست دیگری باشد، سه بار بازنویسی بی‌اثر می‌ماند و کد خروج ۱ است.

بدون `--apply` فایلی نوشته نمی‌شود و CLI شکست را اعلام می‌کند.

### سناریو ۸ — پول‌ریکوئست گزارش

پیش‌شرط: `origin` گیت‌هاب، `GITHUB_TOKEN`، شاخهٔ محلی که گیت‌هاب به‌عنوان head بپذیرد، و `base` برابر `main`.

`codigate pr` تحلیل با هوش مصنوعی را اجرا می‌کند (اگر مدل نباشد فقط ایستا) و PR می‌سازد. عنوان شامل امتیاز کلی است. بدنه خلاصهٔ امتیاز و شمارش است، نه فهرست کامل یافته.

### سناریو ۹ — کامنت روی PR موجود

`codigate pr --review 123`

دروازه حساب می‌شود. اگر امنیت زیر ۸۰ باشد یا تعداد high بیشتر از سقف پیکربندی (در این مخزن ۵، نه ۰، چون gate در YAML هست) کامنت با «PR blocked» نوشته می‌شود. کد فرایند الزاماً ۱ نمی‌شود.

### سناریو ۱۰ — تحلیل یک مخزن گیت‌لب

`codigate analyze https://gitlab.example.com/group/proj.git`

1. ریشهٔ workspace برای خواندن `gitlab.cacheDir` و پورت پنل اولیه استفاده می‌شود.
2. اگر کش نباشد clone با عمق ۱. اگر `GITLAB_TOKEN` باشد هدر Bearer می‌رود.
3. تحلیل درخواستی داخل پوشهٔ هش‌شده اجرا می‌شود و `history.jsonl` همان‌جا نوشته می‌شود.
4. پنل روی همان پوشهٔ کلون بالا می‌آید.
5. دفعهٔ بعد به‌جای clone، `pull --ff-only --depth 1`.

اگر نام میزبان کلمهٔ gitlab را نداشته باشد، URL یک آرگومان معمولی است، پوشه نیست، ریشه همان cwd می‌ماند، و `analyzeOnDemand` روی پروژهٔ محلی اجرا می‌شود. URL گم می‌شود. این رفتار برای گیت‌سرورهایی است که در نام میزبان gitlab ندارند.

### سناریو ۱۱ — عامل MCP ساختار را می‌فهمد و اسکن می‌کند

1. کلاینت سرور را با stdio بالا می‌آورد.
2. `get_project_structure` با عمق ۴ درخت را برمی‌گرداند.
3. `read_file` یک مسیر نسبی را می‌خواند. `../` خارج از ریشه خطا است.
4. `scan_project` امتیاز و تا ۱۰۰ یافته را JSON می‌کند و تاریخچه را در پروژه می‌نویسد.

عامل از این سه ابزار نمی‌تواند fix یا PR یا analyze درخواستی را صدا بزند. آن کارها فقط CLI و بخشی‌شان VS Code هستند.

### سناریو ۱۲ — کاربر داخل VS Code

1. بعد از startup اکستنشن آماده‌است ولی تا دستور، اسکن خودکار نمی‌زند. `activationEvents` شروع را جلو می‌اندازد ولی `activate` فقط دستور و درخت را ثبت می‌کند.
2. Scan Workspace تشخیص‌ها را می‌گذارد و سایدبار را پر می‌کند.
3. کلیک روی یافته فایل را باز می‌کند.
4. Analyze علاوه بر آن، ممیزی و شاید نوشتن تست و باز کردن مرورگر پنل را انجام می‌دهد.
5. Fix Finding دیف را نشان می‌دهد و فقط با تأیید می‌نویسد.

### سناریو ۱۳ — پنل تنها

`codigate panel` آخرین رکورد تاریخچه را نشان می‌دهد. اگر کسی هنوز scan نزده باشد، صفحه می‌گوید تحلیلی نیست. `/api/run` برای مصرف برنامه‌ای همان JSON یا `null` است. پنل زنده به‌روز نمی‌شود؛ رفرش مرورگر، `latest` را دوباره از دیسک می‌خواند. websocket نیست.

### سناریو ۱۴ — خاموش کردن یک قانون پرنویز

در `.codigate/config.yml`:

```yaml
rules:
  qual.console-log:
    enabled: false
  qual.any-type:
    severity: low
```

اسکن بعدی `console.log` را گزارش نمی‌کند و `any` را با شدت low (جریمهٔ ۳ به‌جای ۸) گزارش می‌کند. شناسه باید دقیقاً همان `id` قانون باشد.

### سناریو ۱۵ — افزودن قانون تیمی

فایل تازه در `.codigate/rules/my-rule.yml` با `id`، `category`، `severity`، `message`، و معمولاً `pattern`. اسکن بعدی آن را با قانون‌های توکار قاطی می‌کند. اگر `severity` غلط باشد، دستور با خطا می‌میرد. اگر `pattern` نامعتبر باشد، `new RegExp` وسط تحلیل استثنا می‌دهد و کل دستور شکست می‌خورد، نه فقط آن قانون.

---

## ۲۱. امنیت داخلی خود ابزار

این‌ها کنترل‌های خود کدگیت هستند، نه قانون‌هایی که روی پروژهٔ هدف اجرا می‌شود.

- خواندن و نوشتن فایل بعد از resolve باید داخل ریشه بماند (`assertWithinRoot`).
- پنل فقط به loopback وصل می‌شود. احراز هویت ندارد. هر فرایند محلی می‌تواند `/api/run` را بخواند و یافته‌ها، که ممکن است تکه‌ای از خط مشکوک به راز را در `message` داشته باشند، را ببیند. خود مقدار راز را قانون در پیام کپی نمی‌کند؛ پیام ثابت است. ولی مسیر فایل و شمارهٔ خط هست.
- کلید مدل در YAML اگر پر شود داخل مخزن می‌ماند. پیاده‌سازی فعلی این مخزن کلید را خالی گذاشته و انتظار متغیر محیط یا تنظیم VS Code را دارد. تنظیم `codigate.ai.apiKey` در VS Code یک رشتهٔ معمولی است، نه secret storage.
- `GITLAB_TOKEN` و `GITHUB_TOKEN` فقط از محیط خوانده می‌شوند. توکن گیت‌لب در متن خطای git بازنویسی می‌شود. توکن گیت‌هاب در پیام خطای HTTP بازنویسی نمی‌شود؛ بدنهٔ پاسخ گیت‌هاب ممکن است آن را نداشته باشد، ولی هدر در پیام خطا نیست.
- تاریخچه تا ۵۰ اجرای کامل با همهٔ یافته‌ها روی دیسک پروژه است و gitignore شده (` .codigate/history.jsonl`). اگر کسی gitignore را عوض کند، یافته‌ها ممکن است commit شوند.
- `exec` در تست‌رانر و ممیزی npm از شل استفاده می‌کند. دستور از اسکریپت ثابت خود کدگیت است، نه از ورودی آزاد کاربر، جز اینکه `run(root, command)` اگر روزی فرمان خارجی بگیرد همان را در شل اجرا می‌کند. CLI امروز فرمان سفارشی پاس نمی‌دهد.
- git با `execFile` و بدون شل است.
- کلون گیت‌لب URL را از آرگومان کاربر می‌گیرد و به `git clone` به‌صورت آرگومان جدا می‌دهد، نه رشتهٔ شل. باز هم URL باید قابل اعتماد باشد چون محتوای کلون بعداً تحلیل و شاید توسط مدل به تست تبدیل و نوشته می‌شود.
- تولید تست و `--apply` کد مدل را بدون بازبینی انسانی روی دیسک می‌نویسند. مسیر `analyze` این کار را خودکار می‌کند. مسیر VS Code fix تأیید می‌گیرد. مسیر CLI fix فقط با `--apply` می‌نویسد.
- `.gitignore` با نفی `!` پشتیبانی نمی‌شود.
- قانون‌های راز، شناسایی تقریبی هستند و جایگزین اسکنر تخصصی راز نیستند. خطی هستند و راز چندخطی PEM را فقط اگر هدر روی یک خط باشد می‌گیرند (الگوی هدر PEM روی همان خط است و معمولاً هدر یک خط است).

---

## ۲۲. تست‌های خود مخزن

Vitest این مشخصه‌ها را شامل می‌شود (الگوی `packages/**/*.spec.ts`):

| فایل | موضوع |
| --- | --- |
| `packages/application/src/rules/document-checker.spec.ts` | چک سند و مارک‌آپ |
| `packages/application/src/rules/apply-rule-overrides.spec.ts` | خاموشی و شدت |
| `packages/application/src/use-cases/analyze-on-demand.spec.ts` | حلقهٔ تحلیل درخواستی |
| `packages/application/src/use-cases/evaluate-quality-gate.spec.ts` | دروازه |
| `packages/application/src/use-cases/get-project-structure.spec.ts` | یوزکیس درخت |
| `packages/application/src/scoring/scoring-engine.spec.ts` | امتیاز |
| `packages/application/src/testing/coverage-kind.spec.ts` | گونه و گلاب پوشش |
| `packages/application/src/sources/gitlab-remote.spec.ts` | تشخیص ریموت گیت‌لب |
| `packages/core/src/llm/resolve-ai-config.spec.ts` | اولویت تنظیمات |
| `packages/core/src/panel/render-panel.spec.ts` | HTML پنل |
| `packages/core/src/file-system/ignored-paths.spec.ts` | نادیده‌گیری و گلاب |
| `packages/core/src/file-system/node-file-system.spec.ts` | فایل‌سیستم نود |

تست جداگانه‌ای برای CLI، اکستنشن، سرور MCP، آداپتر گیت‌هاب، ممیزی npm، و موتور الگو در این فهرست نیست. اجرای محلی: `npm test`.

---

## ۲۳. تفاوت عمدی سطح‌ها (خلاصهٔ عملی)

| توانایی | scan / gate / MCP scan | analyze | VS Code Scan | VS Code Analyze | pr |
| --- | --- | --- | --- | --- | --- |
| قانون ایستا | بله | بله، از داخل | بله | بله | بله، از داخل analyzeWithAi |
| مدل زبانی | خیر | اگر پیکربندی شده باشد | خیر | اگر پیکربندی شده باشد | اگر پیکربندی شده باشد |
| npm audit / outdated | خیر | بله | خیر | بله | خیر |
| پوشش خطی و نوشتن تست | خیر | بله، نوشتن فقط اگر مدل باشد و پوشش کم باشد | خیر | بله | خیر |
| دروازه و کد خروج | gate و scan --gate | خیر | خیر | خیر | فقط کامنت، بدون کد خروج دروازه |
| تاریخچه | یک رکورد | تا سه رکورد در یک دستور | یک رکورد | تا سه رکورد | دو رکورد اگر مدل موفق باشد (اسکن + ذخیرهٔ هوش مصنوعی) |
| پنل | خیر | بله، فرایند جدا | فقط با دستور Open Panel | بله | خیر |
| تشخیص ادیتور | خیر | خیر | بله | بله | خیر |

شمارش رکورد تاریخچه دقیق است: `AnalyzeProjectUseCase` همیشه ذخیره می‌کند؛ `AnalyzeWithAiUseCase` فقط وقتی مدل یافته برگرداند دوباره ذخیره می‌کند (اگر مدل در دسترس نباشد همان رکورد اسکن می‌ماند؛ اگر مدل خطا بدهد هم ذخیرهٔ دوم نیست)؛ `AnalyzeOnDemandUseCase` همیشه یک ذخیرهٔ نهایی دارد. پس `analyze` بدون مدل دو رکورد می‌نویسد (اسکن + نهایی درخواستی) و با مدل موفق سه رکورد.

---

## ۲۴. آنچه در کد هست ولی در مسیر محصول امروز سیم نشده

- `GitRepository.getDiff` و `isGitRepo` پیاده شده‌اند و هیچ یوزکیسی آن‌ها را صدا نمی‌زند.
- `Tool`، `ToolRegistry`، `RegisterToolUseCase` به ثبت ابزار MCP وصل نیستند.
- `packages/shared` و `application()` فقط جای‌نگهدارند.
- `AnalysisTrend` نوع دامنه است و گزارش از آن استفاده نمی‌کند.
- `PullRequestCommentInput.path` و `line` به API review گیت‌هاب وصل نیستند.
- ستون‌های `architecture` و `conventions` در امتیاز حساب می‌شوند ولی در گزارش CLI، درخت VS Code، و حلقهٔ پنل نشان داده نمی‌شوند. در کارت فایل، معماری و سئو و امنیت و کیفیت هستند.
- ADR می‌گوید گیت‌هاب تنها میزبان git در MVP است. کد علاوه بر آن checkout گیت‌لب برای دستور `analyze` دارد. ساخت PR همچنان فقط گیت‌هاب است.
- `CG.md` موجودیت‌هایی مثل Agent و Capability و Prompt را به‌عنوان مثال دامنه آورده است. آن موجودیت‌ها در `packages/domain` نیستند. موجودیت‌های واقعی همین سند بخش ۵ هستند.

---

## ۲۵. گردش داده، از دیسک تا امتیاز

```text
مسیر شروع (cwd یا آرگومان پوشه یا URL گیت‌لب)
        │
        ▼
findProjectRoot  →  ریشه با .git یا package.json
        │
        ├─ YAML: .codigate/config.yml | config.yaml | codigate.yml
        ├─ rules: .codigate/rules/*.yml
        └─ .gitignore + فهرست نادیده‌گیری پیش‌فرض
        │
        ▼
listFiles → فیلتر پسوند، حجم، کاتالوگ قانون، و در صورت --diff فیلتر git
        │
        ▼
الگوهای خطی + ساختار آکولاد + سند HTML/TSX
        │
        ▼
ایندکس نماد → تست گم‌شده + درصد سطل‌ها
        │
        ▼
امتیاز و AnalysisRun → history.jsonl (حداکثر ۵۰)
        │
        ├─ اختیاری: تا ۸ فایل به chat/completions → ادغام یافته → ذخیره
        ├─ اختیاری: npm audit/outdated
        ├─ اختیاری: vitest/jest coverage → تا ۳ دور تولید تست
        └─ اختیاری: دروازه → کد خروج یا کامنت گیت‌هاب
        │
        ▼
خروجی انسان: stdout CLI، Diagnostics و Tree در VS Code،
             JSON ابزار MCP، HTML/JSON پنل 127.0.0.1
```

هیچ پایگاه داده و هیچ سرویس پس‌زمینه‌ای جز پنل محلی و فرایندهای `npm`/`git`/`npx` وجود ندارد. حالت مشترک بین اجراها فقط فایل‌های داخل `.codigate/` و خود سورس پروژه است.

---

## ۲۶. ساخت و اجرا، کوتاه

```bash
npm ci
npx nx build cli
node apps/cli/dist/main.js scan
node apps/cli/dist/main.js analyze
node apps/cli/dist/main.js gate
```

یا بعد از build، اسکریپت ریشه: `npm run codigate -- scan`.

افزونه را `npx nx build vscode-extension` می‌سازد و خروجی را باید به‌عنوان اکستنشن VS Code بار کرد. دستور داخل ادیتور: Codigate: Scan Workspace.

سرور MCP:

```bash
npx nx build mcp-server
node apps/mcp-server/dist/main.js
```

متغیرهای اثرگذار فرایند:

| متغیر | کجا مصرف می‌شود |
| --- | --- |
| `CODIGATE_API_BASE` | آدرس مدل |
| `CODIGATE_API_KEY` | Bearer مدل |
| `CODIGATE_MODEL` | نام مدل |
| `GITHUB_TOKEN` | ساخت PR و کامنت |
| `GITLAB_TOKEN` | هدر clone/pull |
| `NODE_OPTIONS` | فقط در launch دیباگ VS Code |

---

## ۲۷. واژه‌نامهٔ کوتاه

| اصطلاح در کد | معنی در این سند |
| --- | --- |
| Finding | یک رخداد مشخص از یک قانون در یک خط |
| Rule | الگوی قابل استفادهٔ مجدد |
| Scorecard | اعداد ۰ تا ۱۰۰ |
| Quality gate | مقایسهٔ امتیاز و شمارش با آستانه؛ شکست یعنی فهرست `failures` |
| Scan | تحلیل ایستا `AnalyzeProjectUseCase` |
| Analyze | تحلیل درخواستی `AnalyzeOnDemandUseCase` |
| Engine | شیء `createEngine` با همهٔ یوزکیس‌های آماده |
| Port | رابط TypeScript در اپلیکیشن |
| Adapter | کلاس پیاده‌ساز در هسته |
| Coverage (scan) | درصد نام‌محور سرویس/کنترلر/ابزار/هوک |
| Coverage (analyze) | درصد خط از گزارش تست، به تفکیک unit/component/integration |
| Panel | سرور HTTP حلقه‌بک برای آخرین اجرا |
| History | فایل JSONL حداکثر ۵۰ اجرا |

---

## ۲۸. فهرست کامل شناسهٔ قانون و محل اجرا

هر شناسه فقط در یکی از این چهار جا «اجرا» می‌شود. بودن در کاتالوگ به‌تنهایی کافی نیست.

| محل اجرا | شرط |
| --- | --- |
| `PatternRuleEngine` | قانون `pattern` داشته باشد و گلاب فایل را رد نکند |
| `structuralFindings` | شناسه دقیقاً `qual.long-function` یا `qual.deep-nesting` باشد |
| `documentFindings` | شناسه یکی از شناسه‌های سئو یا `perf.missing-viewport` / `perf.render-blocking-script` / `perf.font-display` / `perf.img-dimensions` / `seo.image-alt` باشد |
| ممیزی npm | شناسهٔ ساخته‌شده در زمان اجرا، نه داخل `builtInRules` |
| مدل زبانی | شناسه‌ای که خود مدل در JSON بگذارد؛ پیش‌فرض `ai.review` |

شناسه‌های توکار امنیتی، همه الگویی:

`sec.secret.aws-access-key`، `sec.secret.private-key`، `sec.secret.generic-token`، `sec.secret.jwt`، `sec.eval`، `sec.inner-html`، `sec.child-process`، `sec.disable-tls`، `sec.sql-concat`، `sec.shell-interpolation`، `sec.math-random`، `sec.cors-wildcard`، `sec.http-asset`، `sec.hash-password`.

شناسه‌های الگویی کیفیت، معماری، تست و کارایی:

`qual.any-type`، `qual.empty-catch`، `qual.console-log`، `qual.todo`، `perf.nested-loop`، `arch.direct-db`، `arch.axios-in-ui`، `test.skipped`.

شناسه‌های بدون الگو که اگر در فهرست نهایی باشند چک‌کنندهٔ جدا آن‌ها را برمی‌دارد:

`qual.long-function`، `qual.deep-nesting`، `seo.missing-title`، `seo.missing-meta-description`، `seo.missing-canonical`، `seo.missing-lang`، `seo.missing-h1`، `seo.multiple-h1`، `seo.image-alt`، `seo.missing-og-title`، `seo.missing-og-description`، `perf.img-dimensions`، `perf.render-blocking-script`، `perf.font-display`، `perf.missing-viewport`.

شناسه‌های قراردادی، فقط اگر متن `conventions` زیررشتهٔ مربوط را داشته باشد:

`conv.repository-pattern`، `conv.react-query-only`، `conv.zustand-only`، `conv.pascal-components`، `conv.no-secrets`.

شناسهٔ سفارشی موجود در این مخزن: `custom.no-direct-axios`.

شناسه‌هایی که ممیزی می‌سازد و در کاتالوگ YAML نیستند:

- `dep.audit.skipped`
- `dep.audit.failed`
- `dep.outdated.failed`
- `dep.vuln.{نام بسته}` با `ruleId` ثابت `dep.vuln`
- `dep.outdated.{نام بسته}` با `ruleId` ثابت `dep.outdated`

عبارت منظم دقیق قانون‌های امنیتی، همان رشته‌ای که به `new RegExp(pattern, 'gi')` داده می‌شود:

| شناسه | pattern |
| --- | --- |
| `sec.secret.aws-access-key` | `AKIA[0-9A-Z]{16}` |
| `sec.secret.private-key` | `-----BEGIN (?:RSA \|EC \|OPENSSH )?PRIVATE KEY-----` |
| `sec.secret.generic-token` | `(?:api[_-]?key\|apikey\|secret\|token\|password\|passwd\|auth)\s*[:=]\s*["'][^"']{8,}["']` |
| `sec.secret.jwt` | `(?:jwt[_-]?secret\|JWT_SECRET)\s*[:=]\s*["'][^"']+["']` |
| `sec.eval` | `\beval\s*\(\|\bnew Function\s*\(` |
| `sec.inner-html` | `\.innerHTML\s*=\|dangerouslySetInnerHTML` |
| `sec.child-process` | `\b(?:exec\|execSync\|spawn\|spawnSync)\s*\(` |
| `sec.disable-tls` | `rejectUnauthorized\s*:\s*false\|NODE_TLS_REJECT_UNAUTHORIZED\s*[:=]\s*["']?0` |
| `sec.sql-concat` | در بلوک زیر، ردیف sql |
| `sec.shell-interpolation` | در بلوک زیر، ردیف shell |
| `sec.math-random` | `(?:token\|secret\|password\|nonce\|api[_-]?key)\s*[:=][^\n]{0,80}Math\.random` |
| `sec.cors-wildcard` | `Access-Control-Allow-Origin["']?\s*[:=]\s*["']\*["']\|origin\s*:\s*["']\*["']` |
| `sec.http-asset` | `["']http://[^"']+\.(?:js\|css\|png\|jpe?g\|gif\|svg\|webp\|woff2?)["']` |
| `sec.hash-password` | `createHash\s*\(\s*["'](?:md5\|sha1)["']\|\b(?:md5\|sha1)\s*\([^)\n]*(?:password\|secret)` |

دو الگویی که بک‌تیک داخل خود عبارت دارند، در جدول نمی‌گنجند. مقدار دقیق فیلد `pattern` در سورس این است:

```text
sec.sql-concat
(?:SELECT|INSERT|UPDATE|DELETE)[^;\n]*(?:\+|`\$\{)

sec.shell-interpolation
\b(?:exec|execSync)\s*\(\s*`[^`]*\$\{
```

در رشتهٔ جاوااسکریپت، بک‌اسلش‌ها یکی بیشتر نوشته شده‌اند. متن بالا همان چیزی است که به `RegExp` می‌رسد. کلاس `[^;\n]` یعنی «نه نقطه‌ویرگول و نه خط جدید». بک‌تیک شروع قالب رشته است و `\$\{` خود دنبالهٔ دلار و آکولاد را می‌جوید، نه درون‌یابی.

عبارت‌های کیفیت و معماری و تست:

| شناسه | pattern | glob |
| --- | --- | --- |
| `qual.any-type` | `:\s*any\b\|as any\b\|<any>` | `**/*.{ts,tsx}` |
| `qual.empty-catch` | `catch\s*\([^)]*\)\s*\{\s*\}` | ندارد |
| `qual.console-log` | `\bconsole\.log\s*\(` | `**/*.{js,ts,tsx,jsx}` |
| `qual.todo` | `\b(?:TODO\|FIXME)\b` | ندارد |
| `perf.nested-loop` | `for\s*\([^)]*\)\s*\{[^}]{0,200}for\s*\(` | ندارد |
| `arch.direct-db` | `\b(?:prisma\|db\|knex\|mongoose)\s*\.\w+` | `**/*.{controller,service,resolver,route,handler}.{ts,js}` و `**/*.{tsx,jsx}` |
| `arch.axios-in-ui` | `\b(?:axios\|fetch)\s*\(` | `**/*.{tsx,jsx}` |
| `test.skipped` | `\b(?:it\|test\|describe)\.(?:skip\|only)\s*\(` | `**/*.{spec,test}.{ts,tsx,js,jsx}` و `**/__tests__/**` |
| `custom.no-direct-axios` | `\bfrom\s+['"]axios['"]\|\baxios\.` | `**/*.{ts,tsx,js,jsx}` |

چون پرچم `i` روشن است، `TODO` و `todo` و `Todo` هر سه منطبق‌اند. پرچم `g` فقط برای ریست `lastIndex` مهم است؛ هر خط حداکثر یک یافته می‌گیرد.

---

## ۲۹. کاتالوگ پیام خطا و متن ثابت

این رشته‌ها دقیقاً از کد می‌آیند. کاربر یا CI همین متن را می‌بیند.

| محل | متن |
| --- | --- |
| شدت نامعتبر در override یا قانون YAML | `Invalid severity "{value}" for {id}. Use high, medium, low, or info.` |
| فرار از ریشه | `Path escapes project root: {target}` |
| مدل ناقص | `AI is not configured. Set the API base URL, API key, and model.` |
| HTTP مدل | `AI request failed: HTTP {status}` |
| توکن گیت‌هاب خالی | `GITHUB_TOKEN is required for pull request operations.` |
| خطای API گیت‌هاب | `GitHub API {status}: {body}` |
| ریموت گیت‌هاب در ساخت PR | `GitHub remote was not found. Set origin to a GitHub URL.` |
| ریموت در کامنت PR | `GitHub remote was not found.` |
| کلون گیت‌لب | `GitLab checkout failed: {message}` با جایگزینی توکن به `***` |
| به‌روزرسانی گیت‌لب | `GitLab update failed: {message}` |
| بدون یافته برای fix | `No finding to fix.` |
| بدون آرگومان generate-tests | `Usage: codigate generate-tests <file>` |
| تولید بدون نوشتن | `Tests generated but not written. Re-run with apply to execute.` |
| CLI بعد از اعتبارسنجی | `Tests passed` یا `Tests did not pass` |
| اعمال اصلاح CLI | `Applied {filePath}` |
| اسکریپت تست نیست | `No test script found in package.json` |
| پوشش، پروژهٔ نود نیست | `Coverage was not measured: not a Node project.` |
| پوشش، اسکریپت نیست | `Coverage was not measured: no test script in package.json.` |
| پوشش، فایل خلاصه نیست | `Coverage was not measured: the test run did not write a coverage summary.` |
| حلقهٔ تولید، هدف خالی | `Coverage is under the threshold, but no uncovered source files were listed.` |
| توقف تولید | `Test generation stopped: {message}` |
| مدل نیست و پوشش کم است | `Coverage is under the threshold. Set the AI API base URL, API key, and model to generate the missing tests.` |
| ممیزی رد شده | `Dependency audit skipped: not a Node project.` |
| شکست audit | `npm audit failed: {message}` |
| شکست outdated | `npm outdated failed: {message}` |
| دروازه پاس | `✓ Codigate Quality Gate PASSED` |
| دروازه رد | `❌ Codigate Quality Gate FAILED` |
| شکست حداقل | `{Label} {value} < {min}` با برچسب Security، Quality، Architecture، Testing، SEO، Overall |
| شکست سقف | `High {count} > {max}` |
| پوشش دروازه نیست | `Tests were not measured and gate requires {testsMin}` |
| پوشش دروازه کم است | `Tests {roundedAverage} < {testsMin}` |
| دستور ناشناس | `Unknown command: {command}` به‌علاوه بلوک Usage |
| پوشهٔ VS Code نیست | `Open a workspace folder to run Codigate.` |
| یافته برای fix در ادیتور نیست | `No Codigate finding to fix.` |
| پرسش اعمال در ادیتور | `Apply fix to {filePath}?` دکمهٔ `Apply` |
| پیام اطلاعات اسکن | `Codigate overall {n}/100` |
| پنل از قبل | `Panel already available at {url}` |
| پنل تازه | `Panel {url}` |
| پنل از analyze | خط `Panel: http://127.0.0.1:{port}` |
| پنل خالی | `No analysis yet. Run codigate analyze in the project root.` |
| عنوان PR | `chore: codigate analysis {overall}/100` |
| کامنت PR | خط اول `❌ PR blocked` یا `✓ Passed` |
| سیستم‌پرامپت بازبینی | `Return valid JSON only. No markdown.` |
| سیستم‌پرامپت اصلاح | `You fix source files. Return the full updated file contents only. No markdown fences.` |
| سیستم‌پرامپت تعمیر تست | `Fix the failing test file. Return the full file only.` |

سیستم‌پرامپت تولید تست سه جملهٔ ثابت بخش ۷.۹ است و گونه را در جملهٔ کاربر هم تکرار می‌کند: `Create {kind} tests for {path}:`.

---

## ۳۰. کد خروج و اثر روی دیسک

| مسیر | کد خروج | نوشتن روی سورس پروژه | نوشتن در `.codigate` |
| --- | --- | --- | --- |
| `scan` موفق | ۰ | خیر | `history.jsonl` |
| `scan --gate` رد شده | ۱ | خیر | تاریخچه |
| `gate` رد شده | ۱ | خیر | تاریخچه |
| `analyze` موفق | ۰ | بله، اگر مدل باشد و پوشش زیر آستانه باشد فایل تست جدید | تاریخچه، شاید `coverage-report`، شاید کش گیت‌لب |
| `fix` بدون `--apply` | ۰ اگر مدل جواب بدهد | خیر | تاریخچهٔ اسکن |
| `fix --apply` | ۰ | جایگزینی کامل یک فایل | تاریخچه |
| `generate-tests` بدون `--apply` | ۱ چون `passed` نادرست است | خیر | تاریخچه ندارد؛ این دستور اسکن نمی‌کند |
| `generate-tests --apply` و تست پاس | ۰ | فایل تست، شاید چند بار بازنویسی | گزارش پوشش فقط اگر خود تست پروژه پوشش بنویسد؛ این یوزکیس `measureCoverage` را صدا نمی‌زند |
| `generate-tests --apply` و تست رد | ۱ | همان فایل تست تا ۳ نسخه | — |
| `test` پاس / رد | ۰ / ۱ | خیر | — |
| `pr` موفق | ۰ | خیر، جز اثر داخلی `analyzeWithAi` که فقط تاریخچه است | تاریخچه |
| `pr` بدون توکن یا بدون ریموت گیت‌هاب | ۱ | همان | تاریخچه قبل از پرتاب خطا نوشته شده، چون تحلیل قبل از PR است |
| `panel` وقتی پورت آزاد است | تا وقتی کشته نشود تمام نمی‌شود | خیر | خیر، فقط می‌خواند |
| `findings` | ۰ | خیر | تاریخچه |
| استثنای نوک CLI | ۱ و پیام روی stderr | بستگی به اینکه خطا قبل از نوشتن باشد | — |
| MCP `isError: true` | فرایند سرور زنده می‌ماند؛ خطا داخل پاسخ ابزار است | خیر | اسکن تاریخچه می‌نویسد؛ خواندن فایل و درخت نه |

`generate-tests` و `test` و `fix` اگر به اسکن نیاز داشته باشند فقط `fix` اسکن می‌کند. `test` انباره را لمس نمی‌کند.

ترتیب اثر جانبی داخل یک `analyze` موفق با مدل و پوشش کم:

1. ذخیرهٔ اسکن ایستا.
2. ذخیرهٔ دوم اگر مدل آرایهٔ معتبر برگرداند.
3. پاک و ساخت `.codigate/coverage-report` و اجرای تست با پوشش.
4. نوشتن فایل‌های `*.spec.ts` یا `*.component.spec.*` یا `*.integration.spec.*`.
5. اجرای دوبارهٔ پوشش، حداکثر تا سه بار اندازه‌گیری اضافه.
6. ذخیرهٔ نهایی با یافتهٔ ممیزی و درصد خطی.

بین گام ۴ و ۶ اگر فرایند کشته شود، تست‌های نوشته‌شده می‌مانند و رکورد نهایی ممکن است نباشد. تاریخچهٔ گام ۱ هنوز هست و پنل اگر قبل از ذخیرهٔ نهایی رفرش شود همان رکورد قدیمی‌تر را نشان می‌دهد، چون `latest` ته فایل است و ته فایل آخرین `save` موفق است.

---

## ۳۱. رفتارهایی که تست قفل کرده است

این‌ها انتظار اجرایی هستند، نه فقط توضیح. اگر کد عوض شود و این تست‌ها بشکنند، رفتار سند هم عوض شده است.

### امتیاز — `scoring-engine.spec.ts`

- بدون یافته و بدون تست گم‌شده، امنیت و سئو و کلی برابر ۱۰۰. تست گم‌شدهٔ خالی جریمه ندارد. پوشش داده نشده، پس جریمهٔ پوشش صفر است.
- یک یافتهٔ `high` امنیتی امنیت را دقیقاً ۸۰ می‌کند و `counts.high` برابر ۱ است.
- یک یافتهٔ `high` معماری، کیفیت را ۸۰ می‌کند (معماری داخل سطل کیفیت است) حتی اگر ستون امنیت دست نخورد.
- یک یافتهٔ `medium` در دستهٔ `dependencies` امنیت را ۹۲ می‌کند (جریمهٔ ۸). پس ۱۰۰ − ۸ = ۹۲. این تست ثابت می‌کند وابستگی وارد امنیت می‌شود و وارد کیفیت نمی‌شود.

### دروازه — `evaluate-quality-gate.spec.ts`

- امتیازها همه ۹۰ و یک یافتهٔ high، با `highMax: 0` رد می‌شود و اولین شکست شامل کلمهٔ `High` است.
- اگر هم‌زمان `criticalMax: 0` و `highMax: 5` باشد، سقف مؤثر ۰ است (کمینهٔ دو مقدار) و یک high دروازه را رد می‌کند. یعنی فیلد منسوخ هنوز از `highMax` سخت‌گیرتر می‌تواند باشد.

### تحلیل درخواستی — `analyze-on-demand.spec.ts`

- اگر ممیزی یک یافتهٔ `dep.vuln.left-pad` با شدت high بدهد و اندازه‌گیری پوشش `measured: false` با یادداشت «no test script» برگردد، حتی وقتی `llmAvailable` مقدار true دارد:
  - یافته در نتیجه هست
  - امنیت کمتر از ۱۰۰ است
  - `testingCoverage` برابر `undefined` است نه شیء خالی
  - یادداشت شامل `not measured` است
  - `generateTests` اصلاً صدا زده نمی‌شود
  - `save` دقیقاً یک بار صدا زده می‌شود (ذخیرهٔ داخلی اسکن در این تست وجود ندارد چون `analyzeWithAi` جعل شده است)
- اگر اندازه‌گیری اول `unit: 40` و یک فایل `src/util.ts` زیر آستانه باشد و اندازه‌گیری دوم `unit: 90` و فهرست خالی، با پیکربندی خالی (آستانهٔ پیش‌فرض ۸۰) تولید تست دقیقاً یک بار صدا زده می‌شود، پوشش نهایی `{ unit: 90 }` است، و `measureCoverage` دو بار صدا زده می‌شود. دور سوم لازم نیست چون بعد از دور اول دیگر زیر آستانه نیست.

### override — `apply-rule-overrides.spec.ts`

- `enabled: false` روی کلید AWS آن قانون را حذف می‌کند و شدت `low` روی `seo.missing-title` فقط همان یکی را با شدت جدید برمی‌گرداند. ترتیب خروجی، ترتیب ورود قانون‌های باقی‌مانده است.
- مقدار `critical` به‌عنوان شدت پرتاب می‌کند و متن خطا با `Invalid severity` جور است. نوع TypeScript این را منع می‌کند؛ تست با ادعای نوع آن را رد می‌کند تا YAML بد در زمان اجرا بترکد.

### مدل — `resolve-ai-config.spec.ts`

- بدون `settings`، هر سه متغیر محیط بر هر سه مقدار پروژه غلبه می‌کنند. این قرارداد CLI است.
- با `settings` که فقط `apiBase` پر دارد و کلید و مدل خالی‌اند، آدرس از تنظیمات می‌آید، کلید از پروژه، و مدل از محیط. رشتهٔ خالی «تنظیم نشده» است و نوبت را به منبع بعدی می‌دهد. این قرارداد VS Code است.

### گیت‌لب — `gitlab-remote.spec.ts`

قبول: `https://gitlab.com/group/project`، `https://gitlab.example.com/group/project.git`، `git@gitlab.com:group/project.git`.

رد: `https://github.com/group/project` و مسیر محلی `/tmp/project`.

### سند و ساختار — `document-checker.spec.ts`

- فایل `index.html` با `<html><body><img src="a.png" alt="A"></body></html>` هم `seo.missing-title` می‌گیرد هم `perf.img-dimensions`، چون alt هست ولی width و height نیست و title نیست.
- تابع `longOne` با ۹۰ خط `const value = 1;` داخل بدنه، به‌علاوه خط شروع و خط آکولاد بسته، از ۸۰ خط رد می‌شود و `qual.long-function` می‌گیرد. قانون تو در تو در این fixture نیست، پس فقط طول چک می‌شود.

### پوشش — `coverage-kind.spec.ts`

- `src/util.ts` واحد، `src/button.tsx` کامپوننت، `src/integration/api.ts` یکپارچه، `src/util.spec.ts` خارج از پوشش.
- میانگین واحد برای درصدهای ۵۰ و ۱۰۰ برابر ۷۵ است. کامپوننت ۱۰ می‌ماند. با آستانهٔ ۸۰، بدون‌پوشش‌ها `src/util.ts` و `src/button.tsx` هستند و فایل ۱۰۰٪ در فهرست نیست.

### نادیده‌گیری — `ignored-paths.spec.ts`

- `node_modules/left-pad/index.js` و `.git/HEAD` نادیده هستند. `src/main.ts` نیست.
- گلاب `**/*.{ts,tsx}` روی `src/app.tsx` درست و روی `src/app.py` نادرست است.

### پنل — `render-panel.spec.ts`

برای امتیاز کلی ۵۸، SVG باید `stroke-dasharray="58 42"` داشته باشد (پر شده ۵۸، باقی‌مانده ۴۲ از ۱۰۰). هر چهار کلاس نشان شدت در صفحه هستند حتی اگر شمارش low صفر باشد، چون نوار بالا هر چهار شدت را از `counts` چاپ می‌کند. یافتهٔ وابستگی در بخش Packages می‌رود و متن `Why it matters` به‌علاوه توضیح، و `What to change` به‌علاوه پیشنهاد دیده می‌شود. یافتهٔ کیفیت شناسهٔ `qual.deep-nesting` را در بخش Issues نشان می‌دهد.

### فایل‌سیستم — `node-file-system.spec.ts`

- درختی با عمق حداکثر ۲، پوشهٔ `src` را نشان می‌دهد و `node_modules` را نه.
- `readFile(root, '../secret.txt')` با عبارتی که شامل `escapes project root` است رد می‌شود.

### ساختار — `get-project-structure.spec.ts`

یوزکیس درخت را عیناً از پورت برمی‌گرداند و خودش فیلتر یا عمق اضافه اعمال نمی‌کند. عمق را فقط به پورت پاس می‌دهد. در تست جعلی، پورت عمق را نادیده می‌گیرد و همان درخت ثابت را برمی‌گرداند؛ پس این تست قرارداد «عبور مستقیم» است نه الگوریتم پیمایش.

تستی برای این‌ها در مخزن نیست و رفتارشان فقط با خواندن پیاده‌سازی تضمین شده، نه با spec: موتور الگو، ایندکسر، git، گیت‌هاب، گیت‌لب checkout، ممیزی npm، اجراکنندهٔ تست، CLI، اکستنشن، سرور MCP، `ProposeFix`، `ValidateTests`، `CreatePullRequest`، `ReviewCode`.

---

## ۳۲. نقشهٔ تابع و کلاس به فایل

هر نام عمومی که از بسته صادر می‌شود یا نقطهٔ ورود برنامه است.

### دامنه

| نام | فایل | گونه |
| --- | --- | --- |
| `isSeverity` | `entities/finding.ts` | تابع |
| `Tool` | `entities/Tools.ts` | کلاس |
| بقیه | `entities/*.ts` | فقط `interface` و `type` |

### اپلیکیشن، یوزکیس

| کلاس | متد عمومی |
| --- | --- |
| `GetProjectStructureUseCase` | `execute(root, maxDepth?)` |
| `RegisterToolUseCase` | `execute(name, description)` |
| `AnalyzeProjectUseCase` | `execute(input)` |
| `AnalyzeWithAiUseCase` | `execute(root)` |
| `AnalyzeOnDemandUseCase` | `execute(root)` |
| `ReviewCodeUseCase` | `execute({ files, existing, config })` |
| `ProposeFixUseCase` | `execute({ root, finding })` |
| `ApplyPatchUseCase` | `execute({ root, filePath, content })` |
| `GenerateTestsUseCase` | `execute({ root, targetPath, kind? })` |
| `ValidateTestsUseCase` | `execute({ root, targetPath, apply })` |
| `RunTestsUseCase` | `execute(root)` |
| `EvaluateQualityGateUseCase` | `execute(run, gate)` |
| `CreatePullRequestUseCase` | `execute({ root, run, base? })` |
| `ReviewPullRequestUseCase` | `execute({ root, run, pullNumber, blocked })` |
| `ScoringEngine` | `counts`، `scoreCategory`، `scoreCategories`، `score`، `fileScores` |

تابع‌های صادرشدهٔ غیرکلاسی:

`applyRuleOverrides`، `builtInRules`، `conventionRules`، `documentFindings`، `structuralFindings`، `missingTestTargets`، `testingCoverageFromIndex`، `coverageKind`، `summarizeCoverage`، `detectStack`، `isGitlabRemote`، `stripFence`، `makeDiff`، `toTestPath`، `parseGithubRemote`، `renderPullRequestBody`، `application`.

`BUILT_IN_*_RULES` هم از فایل قانون صادر می‌شوند ولی `index.ts` اپلیکیشن فقط `builtInRules` را دوباره صادر می‌کند، نه ثابت‌های جدا را. واردکنندهٔ بیرون از بسته آن ثابت‌ها را نمی‌بیند مگر مسیر فایل را مستقیم import کند. تست‌ها و هسته این کار را نمی‌کنند.

تابع‌های خصوصی که صادر نمی‌شوند ولی رفتار را می‌سازند: `collectRules`، `loadSourceFiles`، `readPackageName`، `isRuleCatalog`، `hasTextExtension`، `parseFindings`، `extractJson`، `asCategory`، `asSeverity`، `globsFrom`، `belowThreshold`، `definedCoverage`، `dedupe`، `highCap`، `checkMin`، `checkMax`، `averageCoverage`، `promptFor`.

### هسته

| نام | فایل |
| --- | --- |
| `createEngine` | `composition/create-engine.ts` |
| `NodeFileSystem` | `file-system/node-file-system.ts` |
| `isIgnored`، `parseGitignore`، `matchesGlob`، `assertWithinRoot`، `DEFAULT_IGNORE_NAMES` | `file-system/ignored-paths.ts` |
| `PatternRuleEngine` | `rule-engine/pattern-rule-engine.ts` |
| `RegexCodeIndexer` | `code-index/regex-code-indexer.ts` |
| `YamlProjectConfigLoader`، `loadCustomRules` | `config/yaml-project-config-loader.ts` |
| `JsonlAnalysisStore` | `analysis-store/jsonl-analysis-store.ts` |
| `NodeGitRepository` | `git/node-git-repository.ts` |
| `NodeTestRunner` | `test-runner/node-test-runner.ts` |
| `OpenAiCompatibleAdapter`، `resolveAiConfig` | `llm/` |
| `GithubPullRequestAdapter` | `github/github-pull-request-adapter.ts` |
| `GitlabCheckout` | `gitlab/gitlab-checkout.ts` |
| `NpmDependencyAuditor` | `audit/npm-dependency-auditor.ts` |
| `startAnalysisPanel`، `renderPanel` | `panel/` |
| `ToolRegistry` | `registery/ToolRegistery.ts` |

### برنامه‌ها

| نام | فایل | نقش |
| --- | --- | --- |
| `main` | `apps/cli/src/main.ts` | ورودی CLI، صادر نمی‌شود |
| `renderScanReport`، `renderFinding`، `renderGate` | `apps/cli/src/report.ts` | متن انسان‌خوان |
| `activate`، `deactivate` | `apps/vscode-extension/src/main.ts` | قرارداد VS Code |
| `FindingsTreeProvider`، `FindingItem` | `findings-tree.ts` | نمای یافته |
| `ScoresTreeProvider` | `scores-tree.ts` | نمای امتیاز |
| `createServer` | `apps/mcp-server/src/server.ts` | کارخانهٔ MCP |
| `registerScanProjectTool` | `tools/scan-project.ts` | ابزار `scan_project` |
| `registerGetProjectStructureTool` | `tools/get-project-structure.ts` | ابزار `get_project_structure` |
| `registerReadFileTool` | `tools/read-file.ts` | ابزار `read_file` |
| `getProjectStructureUseCase`، `registerToolUseCase` | `composition/container.ts` | نمونه‌های ماژول‌سطح |

تابع‌های داخلی CLI که صادر نمی‌شوند: `failIfGate`، `ensurePanel`، `splitRoot`.

تابع‌های داخلی اکستنشن: `workspaceEngine`، `scanWorkspace`، `workspaceRoot`، `publishDiagnostics`، `openFinding`، `openPanel`، `toSeverity`.

---

## ۳۳. نمونهٔ دادهٔ روی سیم

### درخواست مدل

`OpenAiCompatibleAdapter.complete` این JSON را POST می‌کند:

```json
{
  "model": "assistance-model",
  "temperature": 0.1,
  "messages": [
    { "role": "system", "content": "..." },
    { "role": "user", "content": "..." }
  ]
}
```

هدرها: `authorization: Bearer {apiKey}` و `content-type: application/json`. مسیر، `{apiBase بدون اسلش ته}/chat/completions`. پاسخ فقط `choices[0].message.content` خوانده می‌شود. `usage`، `finish_reason` و ابزار فراخوانی تابع نادیده گرفته می‌شوند. اگر مدل به‌جای متن، آرایهٔ محتوا برگرداند، کد فرض می‌کند `content` رشته است و در غیر این صورت به رشتهٔ خالی می‌افتد (`?? ''`). آرایهٔ محتوا باعث می‌شود `parseFindings` هیچ یافته‌ای نسازد.

### یک خط تاریخچه

هر خط `history.jsonl` یک `AnalysisRun` کامل است. شکل حداقلی بعد از اسکن:

```json
{
  "id": "uuid",
  "timestamp": "ISO-8601",
  "projectName": "package.json name",
  "stack": "TypeScript",
  "gitRevision": "40 hex",
  "gitBranch": "main",
  "scores": {
    "overall": 0,
    "security": 0,
    "quality": 0,
    "architecture": 0,
    "testing": 0,
    "performance": 0,
    "conventions": 0,
    "seo": 0
  },
  "previousScores": {},
  "counts": { "high": 0, "medium": 0, "low": 0, "info": 0 },
  "findings": [],
  "fileScores": [],
  "missingTests": [],
  "testingCoverage": { "Services": 100, "Controllers": 100, "Utils": 100, "Hooks": 100 }
}
```

`coverageNote` فقط وقتی هست که مسیر درخواستی آن را ست کرده باشد. اسکن خالی این فیلد را ندارد. `previousScores` در اولین اجرا `undefined` است و در JSON اگر صریحاً ست نشده باشد حذف می‌شود، چون شیء قبل از `JSON.stringify` فیلد را از اجرای قبلی کپی می‌کند و اگر `latest` تهی باشد فیلد `undefined` است و `JSON.stringify` آن را حذف می‌کند.

### پاسخ ابزار `scan_project`

فقط این کلیدها، با حداکثر ۱۰۰ یافته:

`scores`، `counts`، `findings`، `missingTests`.

### پاسخ `/api/run`

کل آخرین `AnalysisRun` یا `null` با `content-type: application/json; charset=utf-8`.

### بدنهٔ ساخت PR گیت‌هاب

```json
{
  "title": "chore: codigate analysis 80/100",
  "body": "## Codigate Bot\n\n...",
  "head": "branch-name",
  "base": "main"
}
```

پاسخ مورد استفاده فقط `html_url` و `number` است.

### کامنت

```json
{ "body": "✓ Passed\n\n## Codigate Bot\n..." }
```

---

## ۳۴. ساخت TypeScript، Nx و مرز ماژول

ریشهٔ `tsconfig.json` خودش فایلی کامپایل نمی‌کند (`files: []`) و فقط مرجع پروژه‌هاست: `apps/cli`، `apps/mcp-server`، `apps/vscode-extension`، `packages/domain`، `packages/application`، `packages/core`، `packages/shared`. `compileOnSave` خاموش است.

`tsconfig.base.json` برای همه: `strict`، `noImplicitOverride`، `noImplicitReturns`، `noUnusedLocals`، `noFallthroughCasesInSwitch`، `isolatedModules`، `importHelpers`، هدف و lib برابر `es2022`، ماژول `nodenext`، `skipLibCheck`، `ignoreDeprecations: 6.0`. `emitDeclarationOnly` در پایه true است. کتابخانه‌ها در `tsconfig.lib.json` آن را false می‌کنند تا خروجی JS هم ساخته شود. `customConditions` مقدار `@org/source` دارد.

مرجع‌های کامپایل برنامهٔ CLI به سه `tsconfig.lib.json` دامنه، اپلیکیشن و هسته است. هسته به اپلیکیشن و دامنه وابسته است. اپلیکیشن فقط به دامنه. دامنه مرجع پروژه‌ای ندارد. shared هم تنهاست. این همان جهت بخش ۳ است، این بار در سطح پروژهٔ TypeScript.

`nx.json`: آنالیتیکس خاموش. پلاگین `@nx/js/typescript` هدف‌های `typecheck`، `build`، `build-deps`، `watch-deps` را از `tsconfig.lib.json` می‌سازد. پلاگین ESLint هدف `lint` را می‌سازد. هدف esbuild کش می‌شود و به `^build` وابسته است. ورودی تولید، فایل‌های پروژه به‌جز eslintrc است.

ESLint ریشه (`eslint.config.mjs`) پیکربندی تخت Nx برای base و TypeScript و JavaScript است، پوشه‌های `dist` و `out-tsc` را نادیده می‌گیرد، و قانون `@nx/enforce-module-boundaries` را روی خطا می‌گذارد با `enforceBuildableLibDependency: true`. قید تگ امروز باز است: هر `sourceTag: *` می‌تواند به هر کتابخانه با تگ `*` وابسته باشد. پس مرز لایه‌ها را ESLint با تگ اجبار نمی‌کند؛ اجبار عملی از روی importهای واقعی و نبود وابستگی معکوس در `package.json` است. دامنه در وابستگی‌هایش فقط `tslib` دارد. اپلیکیشن دامنه را دارد. هسته دامنه و اپلیکیشن و `yaml` را دارد. CLI هر سه را دارد. MCP دامنه را مستقیم در package.json ندارد و از هسته و اپلیکیشن و SDK و Zod استفاده می‌کند. اکستنشن هر سه بستهٔ کدگیت را دارد و `vscode` را خارجی می‌گذارد.

هر بستهٔ کتابخانه یک `eslint.config.mjs` محلی دارد که معمولاً پیکربندی Nx همان پوشه است. قانون اضافهٔ محصول داخل آن‌ها نیست.

Prettier فقط `singleQuote: true` را در `.prettierrc` ثابت کرده است. بقیه پیش‌فرض Prettier است. اسکریپت `format` از `nx format:write` استفاده می‌کند.

پیشنهاد اکستنشن در `.vscode/extensions.json`: `nrwl.angular-console`، `esbenp.prettier-vscode`، `dbaeumer.vscode-eslint`. تنظیم workspace در `.vscode/settings.json` فقط `snyk.advanced.autoSelectOrganization: true` است و به رفتار کدگیت ربطی ندارد.

Launch دیباگ دو پیکربندی دارد که هر دو `npx nx serve` را با `NODE_OPTIONS=--inspect` اجرا می‌کنند: سرور MCP روی پورت ۹۲۲۹ و اکستنشن روی ۹۲۳۰. `skipFiles` داخلی نود را رد می‌کند و `outFiles` را به `dist` همان برنامه محدود می‌کند به‌جز `node_modules`.

---

## ۳۵. سناریوهای تکمیلی با عدد و شرط

### سناریو ۱۶ — اولین اسکن روی مخزن خالی از کد

اگر ریشه فقط `package.json` بدون وابستگی شناخته‌شده و بدون فایل متنی قابل‌تحلیل باشد: یافته خالی است، هر سطل تست ایندکس مخرج صفر دارد پس هر چهار درصد ۱۰۰ است، جریمهٔ تست گم‌شده صفر است، همهٔ امتیازها ۱۰۰، `missingTests` خالی، پشته `undefined` مگر نام بستهٔ شناخته‌شده در package.json باشد. دروازهٔ این مخزن (امنیت ۸۰، کلی ۷۵، high حداکثر ۵، تست ۵۰) پاس می‌شود. این حالت «پروژهٔ سالم» نیست؛ «چیزی برای جریمه پیدا نشد».

### سناریو ۱۷ — پنج راز high

پنج یافتهٔ high امنیتی جریمهٔ ۱۰۰ می‌سازند و امنیت ۰ است. کلی حداقل از کانال امنیت `0 * 0.3` خسارت می‌بیند و اگر بقیه ۱۰۰ باشند کلی ۷۰ است: کیفیت ۲۵، تست ۲۰، عملکرد ۱۵، سئو ۱۰. با `overallMin: 75` دروازه رد می‌شود حتی اگر `highMax: 5` هنوز اجازهٔ دقیقاً ۵ مورد را بدهد (شرط `>` است نه `>=`). پنجم هنوز مجاز است برای سقف تعداد، ولی امتیاز کلی را زیر ۷۵ می‌برد. شش high هم سقف تعداد را می‌شکند (`6 > 5`) و هم امنیت را روی ۰ نگه می‌دارد چون از ۰ پایین‌تر نمی‌رود.

### سناریو ۱۸ — فقط info

`TODO` شدت info جریمهٔ ۰ دارد. شمارش info بالا می‌رود، امتیازها ۱۰۰ می‌مانند، دروازهٔ این مخزن تعداد info را نگاه نمی‌کند. در VS Code این تشخیص Information است نه Error.

### سناریو ۱۹ — فایل بزرگ و باینری متنی‌نما

فایل `.ts` با بیش از ۵۱۲۰۰۰ نویسه خوانده نمی‌شود و هیچ قانونی روی آن اجرا نمی‌شود. خطا نیست. فایل `.png` اصلاً پسوند متنی نیست. `Dockerfile` بدون نقطه اگر نامش به `dockerfile` ختم شود خوانده می‌شود. `.env` خوانده می‌شود و قانون راز می‌تواند روی آن یافته بسازد، به شرطی که gitignore آن را حذف نکرده باشد. اگر `.env` در gitignore باشد، `isIgnored` آن را از `listFiles` حذف می‌کند و اسکن نمی‌بیند. این تفاوت مهم است: راز داخل `.env` نادیده‌شده گزارش نمی‌شود، راز داخل `.env` ترک‌نشده گزارش می‌شود.

### سناریو ۲۰ — قانون سفارشی با pattern خراب

`loadCustomRules` الگو را کامپایل نمی‌کند. اسکن تا `PatternRuleEngine` جلو می‌رود و `new RegExp` استثنا می‌دهد. CLI آن را به کد ۱ تبدیل می‌کند. هیچ تاریخچه‌ای برای آن اجرا نوشته نمی‌شود، چون `save` بعد از ساخت یافته‌هاست و استثنا قبل از آن است. اگر قانون خراب گلاب داشته باشد و هیچ فایلی منطبق نباشد، `toRegex` هنوز برای هر فایل منطبق صدا زده می‌شود؛ اگر هیچ فایلی گلاب را پاس نکند، الگو هرگز کامپایل نمی‌شود و اسکن زنده می‌ماند.

### سناریو ۲۱ — YAML پیکربندی خراب

`load` خطا را می‌بلعد و سراغ فایل بعدی می‌رود. اگر هر سه نامزد خراب یا غایب باشند، پیکربندی `{}` است. آن وقت قانون قراردادی ساخته نمی‌شود، دروازه به پیش‌فرض CLI برمی‌گردد (`securityMin: 80`، `highMax: 5`، `overallMin: 75` و بدون `testsMin`)، پورت پنل ۴۳۱۸ است، آستانهٔ پوشش ۸۰ است، و هوش مصنوعی فقط از محیط می‌آید. سکوت در این مسیر یعنی افتادن به پیش‌فرض، نه توقف دستور.

### سناریو ۲۲ — تاریخچهٔ خراب

اگر یک خط `history.jsonl` JSON نباشد، `readAll` خالی برمی‌گردد. `previousScores` تهی است. `save` بعدی فقط رکورد جدید را می‌نویسد و خط‌های قبلی را از دست می‌دهد، چون بازنویسی کامل فایل است نه append خام. سقف ۵۰ بعد از این بازیابی از صفر شروع می‌شود.

### سناریو ۲۳ — پورت ۴۳۱۸ اشغال است

`analyze` فرزند `panel` را جدا می‌کند. فرزند `portOpen` را true می‌بیند، سرور نمی‌سازد، یک خط می‌نویسد و خارج می‌شود. CLI والد همچنان `Panel: http://127.0.0.1:4318` را چاپ می‌کند. اگر اشغال‌کننده کدگیت نباشد، کاربر آدرس را باز می‌کند و پاسخ آن فرایند را می‌بیند، نه پنل کدگیت. اکستنشن هم URL را کش می‌کند و تا ری‌استارت پنجره همان را باز می‌کند.

### سناریو ۲۴ — `--diff` روی کلون depth=1

`git diff HEAD~1` در مخزن تک‌کامیتی شکست می‌خورد، `getChangedFiles` فهرست خالی برمی‌گرداند، و اسکن هیچ فایلی ندارد. امتیازها ۱۰۰ و دروازه احتمالاً پاس. `analyze` این پرچم را ندارد، پس سناریوی گیت‌لب عادی کل درخت کلون را می‌خواند، نه diff را.

### سناریو ۲۵ — هم‌زمانی دو analyze

دو فرایند هم‌زمان `save` را خواندن-سپس-نوشتن می‌کنند و قفل فایل ندارند. آخرین نویسنده کل فایل را عوض می‌کند و رکورد فرایند دیگر ممکن است پاک شود. پنل و CLI این رقابت را هندل نمی‌کنند.

### سناریو ۲۶ — عامل MCP فایل را می‌خواند و اسکن جدا ذخیره می‌کند

`read_file` تاریخچه نمی‌نویسد. `scan_project` می‌نویسد. اگر عامل اول بخواند و بعد اسکن کند، محتوای فایل همان لحظهٔ خواندن است و ممکن است تا اسکن عوض شده باشد. ابزارها تراکنش مشترک ندارند. `root` اگر داده نشود cwd فرایند سرور است، نه لزوماً پوشهٔ باز ادیتور. برای عامل باید `root` مطلق داده شود.

### سناریو ۲۷ — اصلاح از پالت فرمان VS Code

بدون آرگومان درخت، `item?.finding` تهی است و اولین عنصر `latestRun.findings` انتخاب می‌شود. ترتیب آرایه، ترتیب تولید است: اول یافته‌های موتور الگو (ترتیب فایل مرتب‌شدهٔ `listFiles`، سپس ترتیب قانون)، بعد ساختاری، بعد سندی. «اولین یافته» شدیدترین یافته نیست. اگر کاربر Analyze زده باشد، یافته‌های مدل و ممیزی هم در آرایه هستند و اولین عنصر هنوز از اسکن ایستا است مگر فهرست ایستا خالی باشد.

### سناریو ۲۸ — میانگین دروازه با سطل‌های ناهمگن

ایندکس اسکن چهار عدد می‌دهد. اگر Services برابر ۰ و سه سطل دیگر ۱۰۰ باشند، میانگین ۷۵ است و `testsMin: 50` پاس می‌شود در حالی که هیچ سرویسی تست ندارد. دروازه بدترین سطل را نگاه نمی‌کند. بعد از `analyze` اگر فقط `unit: 40` اندازه‌گیری شود، میانگین همان ۴۰ است و دروازه اگر روی آن شیء اجرا شود رد می‌شود. خود دستور `gate` این شیء خطی را نمی‌سازد.

### سناریو ۲۹ — تصویر چندخطی

```html
<img
  src="a.png"
  alt="A"
  width="10"
  height="10"
>
```

چک alt و ابعاد فقط همان خطی را می‌بیند که `<img` یا `<Image` دارد. خط اول نه alt دارد نه width و height، پس هر دو یافته ثبت می‌شود حتی اگر خط‌های بعد کامل باشند. سقف ۲۰ یافته برای هر کدام در یک فایل است؛ تصویر بیست‌ویکم گزارش نمی‌شود.

### سناریو ۳۰ — تابع طولانی minified

اگر خط اول فایل بیش از ۵۰۰ نویسه باشد، `structuralFindings` کل فایل را رد می‌کند. موتور الگو هنوز خط‌به‌خط روی همان فایل کار می‌کند. پس راز داخل باندل minified دیده می‌شود، ولی تابع ۸۰خطی داخل آن دیده نمی‌شود.

---

## ۳۶. تصمیم داخل `AnalyzeOnDemandUseCase` به‌صورت شرط

شروع: `run = analyzeWithAi(root)` سپس `config = load(root)` سپس `threshold = config.coverage.threshold ?? 80`.

سپس همیشه `auditFindings = auditor.audit(root)` و `coverage = measureCoverage(...)`.

ورود به حلقه فقط اگر هر چهار شرط هم‌زمان درست باشند:

1. `rounds < 3`
2. `llmAvailable()` در ابتدای دستور true بوده باشد. این تابع یک بار قبل از حلقه صدا زده می‌شود و نتیجهٔ همان لحظه تا آخر دستور ثابت می‌ماند. اگر وسط کار کلید پاک شود، همین دستور همچنان وارد حلقه می‌شود.
3. `coverage.measured === true`
4. حداقل یکی از مقدارهای `byKind` تعریف‌شده و کوچک‌تر از آستانه باشد. گونهٔ غایب (مثلاً نبودن integration) شرط را true نمی‌کند.

داخل حلقه، `targets = uncovered.slice(0, 8)`. اگر خالی باشد یادداشت ثابت نوشته می‌شود و `break`. برای هر هدف، تولید و سپس نوشتن. اولین استثنا یادداشت `Test generation stopped:` را می‌سازد و از حلقهٔ فایل‌ها خارج می‌شود، ولی `rounds` بعد از آن یکی زیاد می‌شود. اگر تا آن استثنا فایلی نوشته شده باشد `wrote` true است و بعد از افزایش دور، پوشش دوباره اندازه‌گیری می‌شود مگر اینکه `break` داخلی، حلقهٔ while را هم شکسته باشد. `break` داخلی فقط while فایل‌ها را می‌شکند؛ سپس کد به `rounds += 1` می‌رسد. اگر `wrote` false باشد while بیرونی هم `break` می‌شود و پوشش دوباره سنجیده نمی‌شود. اگر استثنا بعد از حداقل یک نوشتن موفق رخ دهد، `wrote` true می‌ماند، پوشش دوباره سنجیده می‌شود، و اگر هنوز زیر آستانه باشد دور بعدی شروع می‌شود.

بعد از پایان while، اگر مدل از اول false بوده و پوشش اندازه‌گیری شده و زیر آستانه است، یادداشت پیکربندی جایگزین یادداشت اندازه‌گیری می‌شود. اگر مدل true باشد این جایگزینی انجام نمی‌شود و یادداشت آخر، یادداشت خود `measureCoverage` یا یادداشت توقف یا یادداشت فهرست خالی است.

سپس `dedupe` بر اساس `id`. یافتهٔ ممیزی با همان id یافتهٔ قبلی را جایگزین می‌کند. ترتیب، ترتیب درج Map است: اول یافته‌های run، بعد ممیزی‌های جدید.

`missingTests` فقط وقتی عوض می‌شود که `coverage.measured` باشد. در آن حالت مسیر فایل‌های زیر آستانه است، نه نام پایه. امتیاز تست با این فهرست جدید جریمهٔ `min(40, length * 4)` می‌گیرد. هشت فایل زیر آستانه یعنی جریمهٔ ۳۲ از سقف ۴۰، به‌علاوه جریمهٔ فاصلهٔ پوشش.

---

## ۳۷. آنچه هنوز محصول نیست

برای اینکه سند با مخزن یکی بماند، این نبودها هم بخشی از رفتار امروزند:

- سرور HTTP محصول، به‌جز پنل فقط‌خواندنی حلقه‌بک، وجود ندارد. `npm start` سرور MCP روی stdio است نه پورت وب.
- احراز هویت کاربر، چندمستأجری، و پایگاه داده نیست.
- صف، زمان‌بند، و watch خودکار فایل نیست. اسکن فقط با دستور تازه اجرا می‌شود. ذخیرهٔ فایل در VS Code اسکن را دوباره راه نمی‌اندازد.
- قانون برای Rust و Go و Python و Java به‌جز خوانده‌شدن به‌عنوان متن و خوردن قانون‌های بدون گلاب (مثل `eval` اگر در آن خط باشد، یا TODO) زبان‌آگاه نیست. ایندکسر زبان را برچسب می‌زند ولی استخراج نماد فقط الگوی جاوااسکریپت است (`function`، `class`، `useX`). یک تابع `def` پایتون نماد نمی‌شود و گونهٔ فایل از روی نام مسیر است نه نحو.
- `ScoringEngine.scoreCategory` صادر و عمومی است ولی هیچ یوزکیسی آن را صدا نمی‌زند؛ یوزکیس‌ها `score` و `scoreCategories` و `counts` و `fileScores` را صدا می‌زنند.
- فیلد `column` یافته هیچ تولیدکننده‌ای در موتور فعلی آن را پر نمی‌کند. اکستنشن اگر تهی باشد ستون ۰ را استفاده می‌کند.
- فیلد `title` قانون در یافته، گزارش CLI، پنل، و تشخیص VS Code کپی نمی‌شود. فقط `message` دیده می‌شود.
- وزن کلی معماری و قرارداد را جدا نشان نمی‌دهد. تغییر عمدی در فرمول نیست؛ ستون‌ها حساب می‌شوند و در سه سطح نمایش حذف شده‌اند.

---

بخش‌های ۱ تا ۲۷ مسیر محصول، مدل، یوزکیس، قانون، سطح‌های اجرا و سناریوهای اصلی را پوشش می‌دهند. بخش‌های ۲۸ تا ۳۷ شناسه و عبارت منظم، متن خطا، کد خروج، انتظار تست‌ها، نقشهٔ تابع، شکل دادهٔ روی سیم، ساخت و لینت، و سناریوهای گوشه را اضافه می‌کنند. منبع هر بند، فایل همان نام در `packages/` یا `apps/` است.

</div>
