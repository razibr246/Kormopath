// Probaho Coach: transparent, deterministic analysis of a spoken or typed answer.
// No imports, so it is unit-tested under `node --test`.
//
// What it measures and what it deliberately does not:
// - Content: which expected topics the answer covered (word-boundary matching with synonyms).
// - Structure: example given, conclusion, sentence length, repetition.
// - Delivery: filler words per 100 words, and pace only when real elapsed time is known.
// - It does NOT score pronunciation or accent. Browser speech-to-text is not reliable enough
//   for that, and accents are not errors.

export type Lang = "en" | "bn";

export interface Topic {
  id: string;
  label: string;
  terms: string[]; // any one of these counts as covering the topic
  followUp: string; // question to ask if the topic was missed
}

export interface Question {
  id: string;
  track: "technical" | "hr" | "academic" | "bangla";
  level: "beginner" | "intermediate" | "advanced";
  lang: Lang;
  prompt: string;
  targetSeconds: number;
  topics: Topic[];
  modelAnswer: string; // an example of a strong answer, shown after the attempt
}

export const QUESTIONS: Question[] = [
  {
    id: "tech-race",
    track: "technical",
    level: "advanced",
    lang: "en",
    prompt: "How do you prevent race conditions when a payment webhook updates a user's balance in PostgreSQL?",
    targetSeconds: 90,
    topics: [
      { id: "txn", label: "Database transaction", terms: ["transaction", "begin", "commit"], followUp: "Where exactly would the transaction begin and commit in your handler?" },
      { id: "lock", label: "Row locking or atomic update", terms: ["select for update", "row lock", "lock", "atomic update", "balance = balance +", "atomic"], followUp: "How would you stop two requests reading the same old balance at once?" },
      { id: "idem", label: "Idempotency for duplicate deliveries", terms: ["idempotent", "idempotency", "unique constraint", "dedupe", "deduplicate", "event id", "webhook id"], followUp: "The provider retries the same webhook three times. What stops you crediting it three times?" },
      { id: "verify", label: "Verifying the webhook signature", terms: ["signature", "hmac", "verify the webhook", "secret"], followUp: "How do you know the webhook really came from the payment provider?" },
    ],
    modelAnswer: "I wrap the update in a transaction and either lock the balance row with SELECT ... FOR UPDATE or use a single atomic UPDATE balance = balance + amount. Before applying it, I insert the provider's event ID into a table with a unique constraint, so a retried webhook fails the insert and is ignored. I also verify the webhook's HMAC signature first. For example, in a bKash sandbox project this stopped double credits when the provider retried. So: verify, deduplicate, then update atomically inside one transaction.",
  },
  {
    id: "tech-queue",
    track: "technical",
    level: "intermediate",
    lang: "en",
    prompt: "How would you design a background job queue that survives a server restart?",
    targetSeconds: 90,
    topics: [
      { id: "durable", label: "Durable storage of jobs", terms: ["durable", "persist", "persistent", "database", "redis", "rabbitmq", "broker"], followUp: "Where are the jobs stored while the server is down?" },
      { id: "ack", label: "Acknowledge only after success", terms: ["ack", "acks", "acknowledge", "acknowledges", "acknowledged", "acknowledgement", "visibility timeout"], followUp: "When does a worker tell the queue that a job is done?" },
      { id: "retry", label: "Retries with backoff", terms: ["retry", "retries", "backoff", "exponential"], followUp: "What happens when a job fails halfway?" },
      { id: "dlq", label: "Dead-letter queue", terms: ["dead letter", "dead-letter", "dlq", "poison"], followUp: "What do you do with a job that fails every time?" },
    ],
    modelAnswer: "I keep jobs in a durable broker or database table, not in memory. A worker acknowledges a job only after it finishes, so if the server restarts the job becomes visible again. Failed jobs are retried with exponential backoff, and after a few attempts they move to a dead-letter queue for a human to inspect. Jobs are idempotent so a retry is safe. For example, an email job records the message ID so a retry doesn't send twice.",
  },
  {
    id: "tech-react",
    track: "technical",
    level: "intermediate",
    lang: "en",
    prompt: "A React dashboard becomes slow over time. How do you find and fix the cause?",
    targetSeconds: 90,
    topics: [
      { id: "profile", label: "Measure first (profiler)", terms: ["profiler", "profiling", "devtools", "measure", "flamegraph", "performance tab"], followUp: "What tool would you open first, and what would you look for?" },
      { id: "memo", label: "Avoid unnecessary re-renders", terms: ["memo", "usememo", "usecallback", "re-render", "rerender", "react.memo"], followUp: "How do you stop a child re-rendering when its props didn't change?" },
      { id: "cleanup", label: "Clean up effects and subscriptions", terms: ["cleanup", "clean up", "unsubscribe", "removeeventlistener", "memory leak", "clearinterval"], followUp: "Why might the page get slower the longer it stays open?" },
      { id: "virtual", label: "Virtualise long lists", terms: ["virtualize", "virtualise", "virtualization", "windowing", "react-window", "pagination"], followUp: "The table has 10,000 rows. What would you change?" },
    ],
    modelAnswer: "I measure first with the React DevTools profiler and the browser performance tab to see which components re-render and how long they take. Then I memoise expensive values and callbacks so children don't re-render needlessly. Because it slows down over time, I check effects for missing cleanup, such as WebSocket subscriptions or intervals that are never cleared. For long tables I virtualise the list. Finally I measure again to confirm the fix.",
  },
  {
    id: "hr-intro",
    track: "hr",
    level: "beginner",
    lang: "en",
    prompt: "Tell me about yourself.",
    targetSeconds: 60,
    topics: [
      { id: "now", label: "Who you are now (role / study)", terms: ["i am", "i'm", "currently", "student", "studying", "work as", "working as", "developer", "engineer", "graduate"], followUp: "What do you do right now, in one sentence?" },
      { id: "proof", label: "One concrete achievement", terms: ["built", "led", "created", "won", "improved", "delivered", "launched", "project"], followUp: "What is one thing you built or achieved that you are proud of?" },
      { id: "why", label: "Why this role", terms: ["this role", "this position", "your company", "this job", "interested in", "excited", "apply"], followUp: "Why are you interested in this particular role?" },
    ],
    modelAnswer: "I'm a final-year CSE student at a university in Dhaka and I work part-time as a React developer. Last year I built a bKash-based fee collection app for my university club that 300 students now use. I enjoy turning messy processes into simple tools, which is why I'm excited about this role on your payments team.",
  },
  {
    id: "hr-weakness",
    track: "hr",
    level: "intermediate",
    lang: "en",
    prompt: "What is one weakness you are working on?",
    targetSeconds: 60,
    topics: [
      { id: "real", label: "A real, specific weakness", terms: ["weakness", "struggle", "difficult for me", "not good at", "i tend to", "used to"], followUp: "Can you name the weakness more specifically?" },
      { id: "action", label: "What you are doing about it", terms: ["working on", "practice", "practising", "practicing", "started", "now i", "course", "habit"], followUp: "What exactly are you doing to improve it?" },
      { id: "result", label: "Evidence of progress", terms: ["improved", "now", "since then", "result", "better"], followUp: "What has changed since you started working on it?" },
    ],
    modelAnswer: "I used to say yes to every request and then struggle with deadlines. I now keep a written list of commitments and estimate each task before agreeing. Since I started doing that three months ago, I've delivered my last two projects on time and I'm more comfortable saying when something needs more time.",
  },
  {
    id: "acad-project",
    track: "academic",
    level: "intermediate",
    lang: "en",
    prompt: "Explain your final-year project: the problem, your method, and your results.",
    targetSeconds: 120,
    topics: [
      { id: "problem", label: "The problem and why it matters", terms: ["problem", "issue", "challenge", "because", "matters", "important"], followUp: "Who has this problem, and why does it matter?" },
      { id: "method", label: "Your method", terms: ["method", "approach", "we used", "i used", "dataset", "model", "algorithm", "designed", "implemented"], followUp: "Walk me through your method step by step." },
      { id: "result", label: "Results with a number", terms: ["result", "accuracy", "percent", "%", "improved", "reduced", "compared"], followUp: "What was your main result, as a number?" },
      { id: "limit", label: "Limitations and future work", terms: ["limitation", "limited", "future work", "next step", "could improve", "weakness"], followUp: "What are the limitations of your work?" },
    ],
    modelAnswer: "Farmers in our district lose part of their tomato harvest to late blight because they notice it too late. We built an image classifier using 2,400 labelled leaf photos and a MobileNet model so it can run on a phone. It reached 91% accuracy on a held-out test set, compared with 78% for a baseline. Its main limitation is that photos were taken in daylight only, so next we want night and rain images.",
  },
  {
    id: "bn-intro",
    track: "bangla",
    level: "beginner",
    lang: "bn",
    prompt: "নিজের সম্পর্কে সংক্ষেপে বলুন (চাকরির ভাইভা)।",
    targetSeconds: 60,
    topics: [
      { id: "now", label: "বর্তমান পরিচয় (পড়াশোনা/কাজ)", terms: ["আমি", "পড়াশোনা", "অধ্যয়ন", "শিক্ষার্থী", "স্নাতক", "কাজ করছি", "চাকরি"], followUp: "এখন আপনি কী করছেন, এক বাক্যে বলুন।" },
      { id: "proof", label: "একটি নির্দিষ্ট অর্জন", terms: ["অর্জন", "করেছি", "তৈরি", "নেতৃত্ব", "পুরস্কার", "প্রকল্প", "প্রজেক্ট"], followUp: "এমন একটি কাজের কথা বলুন যা নিয়ে আপনি গর্বিত।" },
      { id: "why", label: "কেন এই পদ", terms: ["এই পদ", "এই চাকরি", "আগ্রহ", "কারণ", "প্রতিষ্ঠান"], followUp: "এই পদে কেন আগ্রহী?" },
    ],
    modelAnswer: "আমি ঢাকার একটি বিশ্ববিদ্যালয় থেকে হিসাববিজ্ঞানে স্নাতক শেষ করেছি। পড়াশোনার সময় একটি স্বেচ্ছাসেবী সংগঠনের তহবিলের হিসাব রেখেছি এবং ২০০ জন সদস্যের জন্য মাসিক রিপোর্ট তৈরি করেছি। হিসাব স্বচ্ছ রাখা আমার পছন্দের কাজ, তাই এই প্রতিষ্ঠানের হিসাব বিভাগের পদে আমি আগ্রহী।",
  },
  {
    id: "bn-current",
    track: "bangla",
    level: "intermediate",
    lang: "bn",
    prompt: "বাংলাদেশের তরুণদের কর্মসংস্থানের একটি বড় চ্যালেঞ্জ ও সম্ভাব্য সমাধান বলুন।",
    targetSeconds: 90,
    topics: [
      { id: "challenge", label: "চ্যালেঞ্জ স্পষ্টভাবে বলা", terms: ["চ্যালেঞ্জ", "সমস্যা", "বেকারত্ব", "দক্ষতার ঘাটতি", "অভাব"], followUp: "চ্যালেঞ্জটি ঠিক কী, এক বাক্যে বলুন।" },
      { id: "cause", label: "কারণ ব্যাখ্যা", terms: ["কারণ", "যেহেতু", "ফলে", "কেননা"], followUp: "এই সমস্যার মূল কারণ কী বলে মনে করেন?" },
      { id: "solution", label: "বাস্তবসম্মত সমাধান", terms: ["সমাধান", "প্রশিক্ষণ", "উদ্যোগ", "করা যেতে পারে", "প্রয়োজন", "উচিত"], followUp: "আপনার প্রস্তাবিত সমাধান কীভাবে বাস্তবায়ন হবে?" },
      { id: "example", label: "উদাহরণ বা তথ্য", terms: ["উদাহরণ", "যেমন", "শতাংশ", "জরিপ", "দেখা গেছে"], followUp: "আপনার বক্তব্যের পক্ষে একটি উদাহরণ দিন।" },
    ],
    modelAnswer: "বড় চ্যালেঞ্জ হলো পড়াশোনা ও চাকরির বাজারের দক্ষতার মধ্যে ফারাক। কারণ অনেক পাঠ্যক্রমে হাতে-কলমে কাজের সুযোগ কম। সমাধান হিসেবে বিশ্ববিদ্যালয় ও শিল্পপ্রতিষ্ঠান মিলে ইন্টার্নশিপ বাধ্যতামূলক করা যেতে পারে। যেমন, কিছু প্রকৌশল বিশ্ববিদ্যালয়ে শিল্প-সংযুক্তি চালুর পর শিক্ষার্থীদের চাকরি পাওয়া সহজ হয়েছে। তাই দক্ষতাভিত্তিক শিক্ষাই মূল উপায়।",
  },
  {
    id: "hr-conflict",
    track: "hr",
    level: "intermediate",
    lang: "en",
    prompt: "Tell me about a time you disagreed with a teammate. What did you do?",
    targetSeconds: 120,
    topics: [
      { id: "situation", label: "The situation and your role", terms: ["project", "team", "when i was", "during", "we were", "my role"], followUp: "Set the scene: what was the project and what was your role?" },
      { id: "disagree", label: "What the disagreement was", terms: ["disagreed", "disagreement", "different opinion", "conflict", "wanted to", "argued"], followUp: "What exactly did you disagree about?" },
      { id: "action", label: "What you personally did", terms: ["i suggested", "i proposed", "i listened", "i asked", "i talked", "i met", "i explained", "compromise"], followUp: "What did *you* do, step by step?" },
      { id: "result", label: "Outcome and what you learned", terms: ["result", "in the end", "finally", "learned", "outcome", "agreed", "delivered"], followUp: "How did it end, and what would you do differently?" },
    ],
    modelAnswer: "In my final-year project, my teammate wanted to rewrite our backend two weeks before the demo; I thought it was too risky, and my role was to keep the demo build stable. I asked him to list what the rewrite would fix, and we found that two of the three problems could be fixed with small changes. I proposed we make those fixes now and schedule the rewrite after the demo. In the end we delivered on time with no crashes, and I learned to argue with data rather than opinions.",
  },
  {
    id: "tech-rest-graphql",
    track: "technical",
    level: "intermediate",
    lang: "en",
    prompt: "Compare REST and GraphQL architectures. When would you choose one over the other in a production system?",
    targetSeconds: 90,
    topics: [
      { id: "fetching", label: "Over-fetching and under-fetching", terms: ["over-fetching", "overfetching", "under-fetching", "underfetching", "single request", "exact fields", "payload"], followUp: "How does GraphQL handle client-specific data requirements compared to REST?" },
      { id: "endpoints", label: "Endpoints and HTTP verbs vs single endpoint", terms: ["multiple endpoints", "single endpoint", "/graphql", "http verbs", "post request", "crud", "routes"], followUp: "How do client requests differ structurally between REST routes and a GraphQL endpoint?" },
      { id: "caching", label: "Caching and network efficiency", terms: ["caching", "cache", "http cache", "cdn", "browser cache", "varnish", "status codes"], followUp: "Why is network and CDN caching simpler in REST than GraphQL?" },
      { id: "complexity", label: "Schema design, N+1 problem, and complexity", terms: ["schema", "strongly typed", "n+1", "dataloader", "query complexity", "rate limiting", "resolver"], followUp: "What performance and security pitfalls arise with arbitrary nested GraphQL queries?" },
    ],
    modelAnswer: "REST exposes multiple resource-oriented endpoints with standard HTTP verbs and status codes, which makes HTTP and CDN caching straightforward. However, it can cause over-fetching or under-fetching when mobile clients need tailored payloads. GraphQL uses a single endpoint where clients request exact fields against a strongly typed schema, eliminating multiple round trips. The trade-off is server complexity: GraphQL makes network caching harder and risks the N+1 problem unless you use tools like DataLoader. For example, in an e-commerce dashboard with diverse mobile screens, I chose GraphQL to cut client round trips by 60%, but for a public-facing file API, REST is better for HTTP caching. So, choose GraphQL for complex client-driven UIs and REST for resource caching and simplicity.",
  },
  {
    id: "tech-db-index",
    track: "technical",
    level: "advanced",
    lang: "en",
    prompt: "How do database indexes work under the hood, and how do you optimize a slow query in PostgreSQL?",
    targetSeconds: 90,
    topics: [
      { id: "structure", label: "Index structures (B-tree / Hash / GIN)", terms: ["b-tree", "btree", "binary tree", "balanced tree", "gin", "gist", "data structure", "leaf nodes"], followUp: "What internal data structure does a standard PostgreSQL index use to locate rows?" },
      { id: "explain", label: "Execution plan analysis with EXPLAIN ANALYZE", terms: ["explain", "explain analyze", "execution plan", "query plan", "cost", "planner"], followUp: "What diagnostic tool do you run first to see why the database chosen a specific execution path?" },
      { id: "scan", label: "Sequential scan vs index scan / bitmap scan", terms: ["sequential scan", "seq scan", "index scan", "bitmap index scan", "table scan", "full table scan"], followUp: "What type of table scan indicates a missing or unused index on a large dataset?" },
      { id: "tradeoff", label: "Index trade-offs and composite index ordering", terms: ["write penalty", "overhead", "composite index", "column order", "selectivity", "cardinality", "insert", "update"], followUp: "Why shouldn't you put an index on every single column in an OLTP database?" },
    ],
    modelAnswer: "PostgreSQL default indexes use a balanced B-tree structure where leaf nodes point to heap tuples, providing O(log N) lookups. To optimize a slow query, I first run EXPLAIN ANALYZE to inspect the execution plan and execution cost. If I see an expensive sequential scan on a table with millions of rows, I add an index on the filtered or joined columns, considering column order and selectivity for composite indexes. However, indexes carry write penalty overhead on inserts and updates, so I avoid indexing low-cardinality flags. For example, by replacing a seq scan with a composite B-tree index on user_id and created_at, we reduced our ledger query latency from 850ms to 4ms. Therefore, always analyze with EXPLAIN first and balance read speed against write overhead.",
  },
  {
    id: "tech-microservices",
    track: "technical",
    level: "advanced",
    lang: "en",
    prompt: "When should an engineering team migrate from a monolithic architecture to microservices, and what trade-offs must they manage?",
    targetSeconds: 90,
    topics: [
      { id: "boundary", label: "Domain boundaries and team scaling", terms: ["domain", "bounded context", "domain-driven", "team size", "independent teams", "scale teams", "decouple"], followUp: "How do you decide where to draw service boundaries when decomposing a monolith?" },
      { id: "deploy", label: "Independent deployment and release velocity", terms: ["independent deployment", "deploy independently", "ci/cd", "release cycle", "different tech", "polyglot"], followUp: "What operational advantage does microservices offer for deployment velocity?" },
      { id: "distributed", label: "Distributed transactions and data consistency", terms: ["eventual consistency", "saga", "distributed transaction", "two-phase", "acid", "data consistency", "outbox"], followUp: "How do you maintain data consistency across services without shared database transactions?" },
      { id: "observability", label: "Operational complexity and observability", terms: ["observability", "distributed tracing", "network latency", "overhead", "kubernetes", "service mesh", "monitoring", "failure modes"], followUp: "What infrastructure capabilities must a team establish before moving to distributed microservices?" },
    ],
    modelAnswer: "Teams should consider microservices when the engineering organization has grown so large that multiple independent teams are bottlenecked by a single monolithic deployment pipeline. Decomposing by domain-driven bounded contexts allows independent deployment and localized scaling. However, microservices introduce substantial operational complexity: network latency, cascading failure modes, and distributed data consistency where you must adopt eventual consistency or saga patterns instead of ACID transactions. You also need distributed tracing and robust observability. For example, in a previous fintech project with 40 engineers, separating the payments service reduced release cycle blockers from 2 weeks to daily deploys. In summary, start with a modular monolith and migrate to microservices only when organizational scale justifies the operational overhead.",
  },
  {
    id: "bn-bcs-intro",
    track: "bangla",
    level: "intermediate",
    lang: "bn",
    prompt: "বিসিএস বা বাংলাদেশ ব্যাংকের ভাইভায় নিজের শিক্ষাগত পটভূমি, এই পেশা বেছে নেওয়ার কারণ এবং ভবিষ্যৎ কর্মপরিকল্পনা সংক্ষেপে বলুন।",
    targetSeconds: 90,
    topics: [
      { id: "background", label: "শিক্ষাগত পটভূমি ও অর্জিত জ্ঞান", terms: ["স্নাতক", "বিশ্ববিদ্যালয়", "পড়াশোনা", "বিভাগ", "ডিগ্রি", "সিজিপিএ", "শিক্ষা"], followUp: "আপনার স্নাতক পর্যায়ের অর্জিত জ্ঞান কীভাবে এই পদের কাজে লাগবে?" },
      { id: "motivation", label: "সরকারি সেবা বা কেন্দ্রীয় ব্যাংকে যোগদানের কারণ", terms: ["পাবলিক সার্ভিস", "সেবা", "নীতি নির্ধারণ", "আর্থিক শৃঙ্খলা", "কেন্দ্রীয় ব্যাংক", "জনসেবা", "জাতির সেবা", "দায়িত্ব"], followUp: "কর্পোরেট চাকরির বদলে এই পেশাকে কেন অগ্রাধিকার দিলেন?" },
      { id: "integrity", label: "পেশাগত সততা ও প্রশাসনিক নীতি", terms: ["সততা", "নিষ্ঠা", "স্বচ্ছতা", "নৈতিকতা", "জবাবদিহিতা", "সুশাসন"], followUp: "চাপ বা প্রলোভনের মুখে আপনি কীভাবে সিদ্ধান্ত নেবেন?" },
      { id: "vision", label: "দীর্ঘমেয়াদী রূপকল্প ও জনকল্যাণ", terms: ["রূপকল্প", "পরিকল্পনা", "উন্নয়ন", "ডিজিটাল", "ভবিষ্যৎ", "স্মার্ট বাংলাদেশ", "আর্থিক অন্তর্ভুক্তি"], followUp: "আগামী ৫ থেকে ১০ বছরে আপনার কার্যক্ষেত্রে কী পরিবর্তন আনতে চান?" },
    ],
    modelAnswer: "আমি একটি সরকারি বিশ্ববিদ্যালয় থেকে অর্থনীতিতে স্নাতক সম্পন্ন করেছি, যেখানে মুদ্রানীতি ও উন্নয়ন অর্থনীতি বিষয়ে গবেষণা করেছি। কেন্দ্রীয় ব্যাংকে যোগ দিয়ে দেশের আর্থিক শৃঙ্খলা রক্ষা এবং সাধারণ প্রান্তিক মানুষের আর্থিক অন্তর্ভুক্তি নিশ্চিত করার নীতি বাস্তবায়নে অংশ নেওয়া আমার মূল লক্ষ্য। যেকোনো প্রশাসনিক দায়িত্ব পালনে সততা, পেশাদারিত্ব ও জবাবদিহিতা বজায় রাখাই আমার নীতিগত অঙ্গীকার। উদাহরণ হিসেবে বলা যায়, মাঠপর্যায়ে ক্ষুদ্রঋণ নিয়ে আমার একাডেমিক ফিল্ডওয়ার্ক আমাকে নীতি প্রণয়নের বাস্তব চ্যালেঞ্জ বুঝতে শিখিয়েছে। সবশেষে, অর্জিত জ্ঞান ও নিষ্ঠার সমন্বয়ে দেশের অর্থনৈতিক সুশাসন প্রতিষ্ঠায় আমি কার্যকর অবদান রাখতে চাই।",
  },
  {
    id: "bn-econ-priorities",
    track: "bangla",
    level: "advanced",
    lang: "bn",
    prompt: "বাংলাদেশের বর্তমান অর্থনৈতিক প্রেক্ষাপটে প্রধান তিনটি অগ্রাধিকার কী হওয়া উচিত বলে আপনি মনে করেন এবং কেন?",
    targetSeconds: 120,
    topics: [
      { id: "export", label: "রপ্তানি বহুমুখীকরণ (তৈরি পোশাকের বাইরে)", terms: ["রপ্তানি", "তৈরি পোশাক", "আরএমজি", "বহুমুখীকরণ", "আইটি", "চামড়া", "ফার্মাসিউটিক্যাল", "পোশাক খাতের বাইরে"], followUp: "তৈরি পোশাক খাতের বাইরে রপ্তানি বাড়াতে কী কী নীতি সহায়তা প্রয়োজন?" },
      { id: "remittance", label: "প্রবাসী আয় ও বৈদেশিক মুদ্রার রিজার্ভ", terms: ["প্রবাসী আয়", "রেমিট্যান্স", "রিজার্ভ", "হুন্ডি", "বৈদেশিক মুদ্রা", "বৈধ চ্যানেল"], followUp: "বৈধ চ্যানেলে রেমিট্যান্স প্রবাহ ধরে রাখতে বাংলাদেশ ব্যাংকের কী পদক্ষেপ নেওয়া উচিত?" },
      { id: "inflation", label: "মূল্যস্ফীতি নিয়ন্ত্রণ ও আর্থিক খাতের সুশাসন", terms: ["মূল্যস্ফীতি", "সুশাসন", "মুদ্রানীতি", "খেলাপি ঋণ", "ব্যাংক খাত", "মুদ্রাস্ফীতি", "আর্থিক খাত"], followUp: "খেলাপি ঋণ আদায় ও বাজার তদারকিতে কোন কৌশলটি সবচেয়ে জরুরি?" },
      { id: "human_capital", label: "মানবসম্পদ উন্নয়ন ও কর্মসংস্থান", terms: ["মানবসম্পদ", "দক্ষতা", "কর্মসংস্থান", "প্রযুক্তি", "কারিগরি", "চতুর্থ শিল্পবিপ্লব", "প্রশিক্ষণ"], followUp: "আমাদের তরুণ জনশক্তিকে বিশ্ববাজারের উপযোগী করতে শিক্ষাব্যবস্থায় কী সংস্কার দরকার?" },
    ],
    modelAnswer: "বর্তমান অর্থনৈতিক প্রেক্ষাপটে প্রধান অগ্রাধিকারগুলো হলো রপ্তানি বহুমুখীকরণ, বৈদেশিক মুদ্রার রিজার্ভ স্থিতিশীল রাখা, মূল্যস্ফীতি নিয়ন্ত্রণ এবং তরুণদের মানবসম্পদ উন্নয়ন। প্রথমত, তৈরি পোশাকের বাইরে আইটি ও ওষুধ খাতের রপ্তানি সম্প্রসারণ জরুরি। দ্বিতীয়ত, হুন্ডি প্রতিরোধ করে বৈধ চ্যানেলে প্রবাসী আয় বা রেমিট্যান্স আকর্ষণ করতে হবে যেন রিজার্ভ শক্তিশালী থাকে। তৃতীয়ত, ব্যাংক খাতের খেলাপি ঋণ কমিয়ে সুশাসন নিশ্চিত করা ও সংকোচনমূলক মুদ্রানীতির মাধ্যমে মূল্যস্ফীতি সহনীয় রাখা অপরিহার্য। পাশাপাশি তরুণদের কারিগরি দক্ষতা ও মানবসম্পদ উন্নয়ন নিশ্চিত করা প্রয়োজন যেন কর্মসংস্থান বৃদ্ধি পায়। উদাহরণ হিসেবে, তৈরি পোশাকের বিকল্প হিসেবে আইসিটি খাতে নগদ প্রণোদনায় ইতিবাচক ফল মিলেছে। তাই কাঠামোগত সংস্কার ও আর্থিক শৃঙ্খলা নিশ্চিত করাই হবে দীর্ঘমেয়াদী সমৃদ্ধির পথ।",
  },
  {
    id: "acad-methodology",
    track: "academic",
    level: "advanced",
    lang: "en",
    prompt: "How did you conduct your literature review and choose your research methodology for your thesis or paper?",
    targetSeconds: 120,
    topics: [
      { id: "gap", label: "Identifying the research gap", terms: ["research gap", "gap in literature", "unresolved", "prior work", "existing literature", "limitation of previous", "previous studies"], followUp: "What specific gap did previous studies leave unaddressed?" },
      { id: "search", label: "Systematic search strategy and synthesis", terms: ["systematic", "ieee", "acm", "google scholar", "keywords", "inclusion criteria", "synthesize", "survey"], followUp: "What databases and search criteria did you use to filter papers?" },
      { id: "rationale", label: "Methodology selection and justification", terms: ["methodology", "quantitative", "qualitative", "experimental", "dataset", "framework", "baseline", "model"], followUp: "Why was your chosen methodology superior to alternative approaches for this question?" },
      { id: "validation", label: "Validation, reproducibility, and metrics", terms: ["validation", "cross-validation", "metrics", "reproducible", "f1-score", "accuracy", "benchmark", "ablation"], followUp: "How did you ensure your experimental results were statistically valid and reproducible?" },
    ],
    modelAnswer: "I began by conducting a systematic literature review across IEEE Xplore, ACM, and Google Scholar using structured keywords and strict inclusion criteria. Through this synthesis, I identified a clear research gap: prior work in Bengali speech recognition achieved high accuracy on studio speech but degraded heavily on noisy mobile recordings. To address this, I chose a quantitative experimental methodology combining an acoustic preprocessing pipeline with fine-tuned Whisper models. For validation, I evaluated on an independent 10-fold cross-validation split using word error rate and latency metrics against a published baseline. For example, our approach reduced the word error rate from 24% to 11.5% in street noise conditions. In conclusion, grounding our methodology in identified prior limitations ensured rigorous and reproducible results.",
  },
  {
    id: "acad-reviewer-feedback",
    track: "academic",
    level: "intermediate",
    lang: "en",
    prompt: "A peer reviewer strongly questions the novelty and experimental validation of your research paper. How do you respond?",
    targetSeconds: 90,
    topics: [
      { id: "tone", label: "Professional and appreciative tone", terms: ["thank the reviewer", "appreciate", "constructive", "respectful", "professional", "gratitude"], followUp: "How do you frame your opening response to maintain professional academic discourse?" },
      { id: "point", label: "Point-by-point itemized rebuttal", terms: ["point-by-point", "itemized", "each comment", "response document", "line-by-line", "direct response"], followUp: "How do you organize your revisions so reviewers can easily track every change?" },
      { id: "experiment", label: "Supplementary experiments and ablation studies", terms: ["ablation", "supplementary", "additional experiment", "baseline comparison", "new data", "statistical significance"], followUp: "What concrete empirical evidence do you add to defend your claims?" },
      { id: "clarity", label: "Clarifying manuscript text without defensiveness", terms: ["revised manuscript", "clarified", "rewrote", "highlighted changes", "expanded section", "manuscript text"], followUp: "How do you ensure the main paper is improved rather than just debating in the response letter?" },
    ],
    modelAnswer: "First, I welcome the reviewer's feedback with a respectful and constructive tone, treating tough critiques as an opportunity to strengthen the manuscript. In our response document, I organize a point-by-point rebuttal where every critique is addressed directly. To address questions regarding novelty and validation, I do not just argue in text; I conduct supplementary experiments, including an ablation study and a comparison against two additional state-of-the-art baselines. In the revised manuscript, I clearly highlight the expanded sections explaining our architectural novelty. For example, adding an ablation study with 500 test trials confirmed our attention module provided a statistically significant 4.2% accuracy gain. So, pairing courteous responses with empirical evidence is the most effective way to address skeptical reviewers.",
  },
  {
    id: "hr-setback",
    track: "hr",
    level: "intermediate",
    lang: "en",
    prompt: "Describe a major technical setback or unexpected obstacle during a project. How did you handle it using the STAR framework?",
    targetSeconds: 120,
    topics: [
      { id: "situation", label: "Situation: context, timeline, and stakes", terms: ["when i was", "at my", "in my project", "during", "we were building", "deadline", "our team"], followUp: "What was the project, the deadline, and what was at stake when the obstacle hit?" },
      { id: "task", label: "Task: your specific responsibility", terms: ["my role", "my job was", "i was responsible", "i had to", "my task", "the goal was", "i needed to"], followUp: "What were you specifically responsible for solving?" },
      { id: "action", label: "Action: step-by-step troubleshooting and communication", terms: ["i decided", "i investigated", "i proposed", "i built", "i refactored", "i talked", "i rolled back", "root cause", "mitigation"], followUp: "What methodical steps did you take to isolate the root cause and resolve it?" },
      { id: "result", label: "Result: outcome, metrics, and retrospective learnings", terms: ["as a result", "in the end", "the result", "finally", "we delivered", "i learned", "prevented", "uptime", "on time"], followUp: "What was the final measurable outcome, and how did you prevent it from happening again?" },
    ],
    modelAnswer: "In my final semester capstone project, our team was building an automated hospital triage portal when our database crashed 48 hours before the final faculty evaluation. As the backend lead, my task was to restore database availability and prevent permanent data loss while the frontend team was blocked. I immediately isolated the root cause: an unindexed nested query was exhausting connection pools under load. I decided to roll back the latest migration, added connection pooling with PgBouncer, and created composite indexes on patient records. In the end, we delivered the live demo on time with zero data loss, handling 250 concurrent requests with sub-50ms response times, and I learned the importance of load testing early. So, staying calm and addressing root causes under pressure was key.",
  },
];

const EN_FILLERS = ["um", "umm", "uh", "uhh", "erm", "hmm", "you know", "i mean", "kind of", "sort of", "basically", "actually", "literally"];
const BN_FILLERS = ["মানে", "আসলে", "ইয়ে", "আচ্ছা", "হুম", "উম", "তো মানে"];

const EXAMPLE_CUES = ["for example", "for instance", "such as", "in my project", "in one project", "last year", "e.g", "উদাহরণ", "যেমন", "আমার প্রজেক্টে"];
const CONCLUSION_CUES = ["so,", "so ", "therefore", "in summary", "overall", "to sum up", "that's why", "which is why", "finally", "তাই", "সুতরাং", "অতএব", "সবশেষে", "সংক্ষেপে"];

const STOP = new Set(["the", "a", "an", "and", "or", "to", "of", "in", "on", "is", "it", "i", "we", "that", "this", "for", "with", "be", "as", "so", "my", "you", "are", "was", "at", "by", "if", "then", "but", "আমি", "এবং", "ও", "এই", "যে", "করে", "হয়", "থেকে", "জন্য", "একটি", "না", "কি"]);

function normalise(text: string) {
  return text.toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, " ").trim();
}

/** Word-boundary match for Latin terms; substring match for Bangla (no reliable \b in JS). */
export function containsTerm(text: string, term: string): boolean {
  const t = normalise(text);
  const k = normalise(term);
  if (/[\u0980-\u09FF]/.test(k)) return t.includes(k);
  const esc = k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\ /g, "\\s+").replace(/ /g, "\\s+");
  return new RegExp(`(^|[^a-z0-9])${esc}($|[^a-z0-9])`, "i").test(t);
}

export function countFillers(text: string, lang: Lang): { word: string; count: number }[] {
  const t = ` ${normalise(text).replace(/[.!?।]/g, " , ")} `;
  const list = lang === "bn" ? BN_FILLERS : EN_FILLERS;
  const out: { word: string; count: number }[] = [];
  for (const f of list) {
    let count = 0;
    if (lang === "bn") {
      count = t.split(` ${f} `).length - 1;
    } else {
      const re = new RegExp(`(^|[^a-z])${f.replace(/ /g, "\\s+")}(?=[^a-z]|$)`, "g");
      count = (t.match(re) ?? []).length;
    }
    if (count) out.push({ word: f, count });
  }
  if (lang === "en") {
    // "like" only when used as a pause word: set off by commas or followed by another filler.
    const like = (t.match(/,\s*like\s*,|\blike,\s|\blike\s+(?:um|uh|you know)\b/g) ?? []).length;
    if (like) out.push({ word: "like", count: like });
  }
  return out.sort((a, b) => b.count - a.count);
}

export function words(text: string): string[] {
  return normalise(text).replace(/[^\p{L}\p{N}'\s-]/gu, " ").split(/\s+/).filter(Boolean);
}

export function sentences(text: string): string[] {
  return text.split(/(?<=[.!?।])\s+|\n+/).map((s) => s.trim()).filter((s) => words(s).length > 0);
}

export interface Analysis {
  wordCount: number;
  seconds: number | null;
  wpm: number | null; // null when no reliable elapsed time
  paceNote: string | null;
  fillers: { word: string; count: number }[];
  fillerPer100: number;
  covered: Topic[];
  missing: Topic[];
  hasExample: boolean;
  hasConclusion: boolean;
  sentenceCount: number;
  avgSentenceWords: number;
  longestSentenceWords: number;
  repeated: { word: string; count: number }[];
  timeNote: string | null;
  score: { content: number; structure: number; delivery: number; total: number };
  tips: string[];
  followUp: string | null;
}

/**
 * Analyse an answer. `seconds` is the real recording time, or null for typed answers.
 * The score is a transparent sum: content (0-50) + structure (0-20) + delivery (0-30).
 */
export function analyzeAnswer(text: string, q: Question, seconds: number | null): Analysis {
  const w = words(text);
  const wordCount = w.length;
  const lang = q.lang;
  const fillers = countFillers(text, lang);
  const fillerTotal = fillers.reduce((a, f) => a + f.count, 0);
  const fillerPer100 = wordCount ? Math.round((fillerTotal / wordCount) * 1000) / 10 : 0;

  const covered = q.topics.filter((tp) => tp.terms.some((term) => containsTerm(text, term)));
  const missing = q.topics.filter((tp) => !covered.includes(tp));

  const lower = ` ${normalise(text)} `;
  const hasExample = EXAMPLE_CUES.some((c) => lower.includes(c)) || /\b\d+(?:\.\d+)?\s?(?:%|percent|users|students|ms|seconds|days)\b/.test(lower) || /[০-৯]+/.test(text);
  const hasConclusion = CONCLUSION_CUES.some((c) => lower.includes(` ${c}`));
  const sents = sentences(text);
  const lens = sents.map((s) => words(s).length);
  const avgSentenceWords = lens.length ? Math.round((lens.reduce((a, b) => a + b, 0) / lens.length) * 10) / 10 : 0;
  const longestSentenceWords = lens.length ? Math.max(...lens) : 0;

  const freq = new Map<string, number>();
  for (const x of w) if (!STOP.has(x) && x.length > 2) freq.set(x, (freq.get(x) ?? 0) + 1);
  const repeated = [...freq.entries()].filter(([, c]) => c >= 4 && c / Math.max(1, wordCount) > 0.04).map(([word, count]) => ({ word, count })).sort((a, b) => b.count - a.count).slice(0, 3);

  const reliableTime = seconds !== null && seconds >= 10;
  const wpm = reliableTime ? Math.round(wordCount / (seconds! / 60)) : null;
  // English conversational pace is often cited around 120–160 wpm; we only use it as a broad band.
  let paceNote: string | null = null;
  if (wpm !== null && lang === "en") {
    if (wpm < 100) paceNote = "Slower than typical conversation — fine if deliberate; try fewer long pauses.";
    else if (wpm > 170) paceNote = "Faster than typical conversation — slow down at key points so the examiner can follow.";
    else paceNote = "Within a typical conversational range.";
  } else if (wpm !== null) {
    paceNote = "বাংলা বক্তব্যের গতি শব্দ গণনায় সঠিকভাবে মাপা কঠিন — শুধু নিজের আগের চেষ্টার সাথে তুলনা করুন।";
  }

  let timeNote: string | null = null;
  if (reliableTime) {
    if (seconds! < q.targetSeconds * 0.4) timeNote = lang === "bn" ? "উত্তর খুব ছোট — আরেকটু ব্যাখ্যা ও উদাহরণ দিন।" : "Quite short for this question — add an explanation or example.";
    else if (seconds! > q.targetSeconds * 1.6) timeNote = lang === "bn" ? "সময়ের চেয়ে অনেক বড় — মূল কথাগুলো আগে বলুন।" : "Much longer than the target — lead with the key points.";
  }

  // Transparent score.
  const content = Math.round((covered.length / Math.max(1, q.topics.length)) * 50);
  const structure = (hasExample ? 8 : 0) + (hasConclusion ? 6 : 0) + (avgSentenceWords > 0 && avgSentenceWords <= 25 ? 6 : avgSentenceWords <= 35 ? 3 : 0);
  const fillerPts = fillerPer100 <= 1 ? 20 : fillerPer100 <= 3 ? 14 : fillerPer100 <= 6 ? 8 : 3;
  const pacePts = wpm === null ? 10 : lang === "en" ? (wpm >= 100 && wpm <= 170 ? 10 : 5) : 10;
  const lengthOk = wordCount >= 25;
  const delivery = lengthOk ? fillerPts + pacePts : Math.min(10, fillerPts);
  const total = Math.min(100, content + structure + delivery);

  const tips: string[] = [];
  const en = lang === "en";
  if (wordCount < 25) tips.push(en ? "Say at least three or four full sentences so there is something to assess." : "অন্তত তিন-চারটি পূর্ণ বাক্যে উত্তর দিন।");
  if (missing.length) tips.push(en ? `Not covered: ${missing.map((m) => m.label).join("; ")}.` : `বাদ পড়েছে: ${missing.map((m) => m.label).join("; ")}।`);
  if (!hasExample) tips.push(en ? "Add one concrete example or number from your own experience." : "নিজের অভিজ্ঞতা থেকে একটি নির্দিষ্ট উদাহরণ বা সংখ্যা যোগ করুন।");
  if (!hasConclusion) tips.push(en ? "Finish with a one-line summary (\"So, …\")." : "শেষে এক লাইনে সারসংক্ষেপ বলুন (\"তাই…\")।");
  if (fillerPer100 > 3) tips.push(en ? `Fillers: ${fillers.slice(0, 3).map((f) => `"${f.word}" ×${f.count}`).join(", ")}. Pause silently instead.` : `ফিলার শব্দ: ${fillers.slice(0, 3).map((f) => `"${f.word}" ×${f.count}`).join(", ")}। এর বদলে একটু থামুন।`);
  if (longestSentenceWords > 40) tips.push(en ? "One sentence ran over 40 words — split long thoughts into shorter sentences." : "একটি বাক্য অনেক লম্বা — ছোট ছোট বাক্যে ভাগ করুন।");
  if (repeated.length) tips.push(en ? `You repeated "${repeated[0].word}" ${repeated[0].count} times — vary your wording.` : `"${repeated[0].word}" শব্দটি ${repeated[0].count} বার বলেছেন।`);
  if (timeNote) tips.push(timeNote);

  return {
    wordCount, seconds, wpm, paceNote, fillers, fillerPer100, covered, missing, hasExample, hasConclusion,
    sentenceCount: sents.length, avgSentenceWords, longestSentenceWords, repeated, timeNote,
    score: { content, structure, delivery, total },
    tips,
    followUp: missing[0]?.followUp ?? null,
  };
}

export interface SessionRecord {
  id: string;
  questionId: string;
  date: string; // ISO
  total: number;
  content: number;
  structure: number;
  delivery: number;
  wordCount: number;
  wpm: number | null;
  fillerPer100: number;
  transcript?: string; // only if the user chose to keep it
}

export function progressSummary(records: SessionRecord[]) {
  if (!records.length) return null;
  const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
  const last5 = sorted.slice(-5);
  const first5 = sorted.slice(0, 5);
  const avg = (xs: number[]) => Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10;
  return {
    sessions: records.length,
    recentAvg: avg(last5.map((r) => r.total)),
    earlyAvg: avg(first5.map((r) => r.total)),
    recentFillers: avg(last5.map((r) => r.fillerPer100)),
    weakest: (["content", "structure", "delivery"] as const)
      .map((k) => ({ k, pct: avg(last5.map((r) => r[k])) / (k === "content" ? 50 : k === "structure" ? 20 : 30) }))
      .sort((a, b) => a.pct - b.pct)[0].k,
    daysPractised: new Set(records.map((r) => r.date.slice(0, 10))).size,
  };
}

export interface StarCheck {
  situation: boolean;
  task: boolean;
  action: boolean;
  result: boolean;
  missing: ("situation" | "task" | "action" | "result")[];
}

const STAR_CUES = {
  situation: ["when i was", "at my", "in my", "during", "last year", "last semester", "we were", "there was", "the situation"],
  task: ["my role", "my job was", "i was responsible", "i had to", "my task", "the goal was", "i needed to", "we needed to"],
  action: ["i decided", "i suggested", "i proposed", "i built", "i wrote", "i asked", "i talked", "i organised", "i organized", "i created", "i led", "so i", "i started", "i explained", "i listened"],
  result: ["as a result", "in the end", "the result", "finally", "outcome", "we delivered", "i learned", "i learnt", "which led to", "it reduced", "it increased", "improved"],
} as const;

/**
 * STAR (Situation, Task, Action, Result) check for behavioural answers. A cue-word heuristic:
 * it tells the speaker which parts they may have skipped, it does not judge the story.
 */
export function starCheck(text: string): StarCheck {
  const t = ` ${normalise(text)} `;
  const has = (k: keyof typeof STAR_CUES) => STAR_CUES[k].some((c) => t.includes(` ${c}`));
  const r = { situation: has("situation"), task: has("task"), action: has("action"), result: has("result") };
  return { ...r, missing: (["situation", "task", "action", "result"] as const).filter((k) => !r[k]) };
}

/** Consecutive days practised ending today or yesterday (so the streak survives until tonight). */
export function practiceStreak(records: SessionRecord[], today: string): { current: number; best: number } {
  const days = [...new Set(records.map((r) => r.date.slice(0, 10)))].filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
  if (!days.length) return { current: 0, best: 0 };
  const num = (d: string) => Math.floor(Date.parse(d + "T00:00:00Z") / 86_400_000);
  let best = 1;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    run = num(days[i]) - num(days[i - 1]) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
  }
  const gap = num(today) - num(days[days.length - 1]);
  return { current: gap <= 1 ? run : 0, best };
}

export interface CustomQuestionInput {
  prompt: string;
  track?: Question["track"];
  targetSeconds?: number;
  lang?: Lang;
  keywords?: string[];
}

export function extractKeywords(text: string, lang: Lang): string[] {
  const w = words(text);
  const candidates: string[] = [];
  for (const word of w) {
    if (STOP.has(word)) continue;
    if (word.length < 4 && !/[\u0980-\u09FF]/.test(word)) continue;
    if (!candidates.includes(word)) candidates.push(word);
  }
  return candidates.slice(0, 5);
}

export function createCustomQuestion(input: CustomQuestionInput): Question {
  const prompt = input.prompt.trim();
  const track = input.track ?? "technical";
  const targetSeconds = input.targetSeconds && input.targetSeconds > 0 ? input.targetSeconds : 90;
  const isBn = /[\u0980-\u09FF]/.test(prompt);
  const lang: Lang = input.lang ?? (isBn ? "bn" : "en");

  let topics: Topic[] = [];
  if (input.keywords && input.keywords.length > 0) {
    topics = input.keywords.filter(Boolean).map((kw, i) => {
      const k = kw.trim();
      return {
        id: `topic-${i + 1}`,
        label: k,
        terms: [k],
        followUp: lang === "bn" ? `এই বিষয়ে বিস্তারিত বলুন: "${k}"` : `Could you elaborate further on "${k}"?`,
      };
    });
  }
  
  if (topics.length === 0) {
    const extracted = extractKeywords(prompt, lang);
    if (extracted.length > 0) {
      topics = extracted.map((term, i) => ({
        id: `kw-${i + 1}`,
        label: term,
        terms: [term],
        followUp: lang === "bn" ? `"${term}" সংক্রান্ত দিকগুলো আরেকটু ব্যাখ্যা করুন।` : `Can you expand on how "${term}" applies here?`,
      }));
    } else {
      topics = [
        { id: "core", label: lang === "bn" ? "মূল ধারণা" : "Core concept & explanation", terms: ["because", "means", "concept", "মূল", "কারণ", "অর্থ"], followUp: lang === "bn" ? "মূল ধারণাটি পরিষ্কার বাক্যে বলুন।" : "Can you define the core concept in one sentence?" },
        { id: "practical", label: lang === "bn" ? "বাস্তব উদাহরণ বা যুক্তি" : "Practical example or justification", terms: ["example", "project", "trade-off", "used", "যেমন", "উদাহরণ", "প্রকল্প"], followUp: lang === "bn" ? "একটি বাস্তব উদাহরণ দিন।" : "Give one concrete example or trade-off." },
      ];
    }
  }

  return {
    id: `custom-${Math.random().toString(36).slice(2, 8)}`,
    track,
    level: "intermediate",
    lang,
    prompt,
    targetSeconds,
    topics,
    modelAnswer: "",
  };
}

export function evaluateViva(text: string, q: Question, seconds: number | null): Analysis {
  return analyzeAnswer(text, q, seconds);
}
