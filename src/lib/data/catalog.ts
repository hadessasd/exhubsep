import { STRIPE_BUY_BUTTONS, stripeButtonForTier } from "./stripe";
export type ProductCategory =
  | "sat"
  | "act"
  | "proctoring"
  | "bundle"
  | "contests"
  | "tools"
  | "research"
  | "internship";

export type ProductTier = "standard" | "pro" | "premium";

export interface Product {
  id: string;
  slug: string;
  name: string;
  category: ProductCategory;
  tier?: ProductTier;
  priceUsd: number;
  shortDescription: string;
  longDescription: string;
  features: string[];
  regions?: string[];
  giftCardUrl?: string;
  /** When set, checkout uses Stripe Buy Button only (no crypto). */
  stripeBuyButtonId?: string;
  badge?: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string[];
}

/** G2A Crypto Voucher — buyer picks a key amount that covers the product price */
export const GIFT_CARD_CHECKOUT_URL =
  "https://www.g2a.com/crypto-voucher-450-usd-key-global-i10000337580102";

export const GIFT_CARD_LINKS = {
  standard: GIFT_CARD_CHECKOUT_URL,
  pro: GIFT_CARD_CHECKOUT_URL,
  premium: GIFT_CARD_CHECKOUT_URL,
  bundle: GIFT_CARD_CHECKOUT_URL,
  tool: GIFT_CARD_CHECKOUT_URL,
} as const;

export type CryptoAssetId = "sol" | "usdc" | "eth" | "ltc";

export const CRYPTO_ASSETS: Record<
  CryptoAssetId,
  {
    id: CryptoAssetId;
    label: string;
    symbol: string;
    network: string;
    address: string;
    geckoId: string;
    decimals: number;
  }
> = {
  sol: {
    id: "sol",
    label: "Solana",
    symbol: "SOL",
    network: "Solana",
    address: "HURGHDRWAUzYytho5NSjRJnD916fKinDHietcnXw6JYx",
    geckoId: "solana",
    decimals: 4,
  },
  usdc: {
    id: "usdc",
    label: "USDC",
    symbol: "USDC",
    network: "Ethereum",
    address: "0x244e661B08403741854369d940032cd9134aD47A",
    geckoId: "usd-coin",
    decimals: 2,
  },
  eth: {
    id: "eth",
    label: "Ethereum",
    symbol: "ETH",
    network: "Ethereum",
    address: "0x244e661B08403741854369d940032cd9134aD47A",
    geckoId: "ethereum",
    decimals: 5,
  },
  ltc: {
    id: "ltc",
    label: "Litecoin",
    symbol: "LTC",
    network: "Litecoin",
    address: "LZtej5oU5ZAps9MYEW3iWcsKZbJGNF5kRj",
    geckoId: "litecoin",
    decimals: 4,
  },
};

/** @deprecated use CRYPTO_ASSETS — kept so older imports still resolve */
export const CRYPTO_WALLETS = {
  sol: CRYPTO_ASSETS.sol.address,
  eth: CRYPTO_ASSETS.eth.address,
  usdc: CRYPTO_ASSETS.usdc.address,
  ltc: CRYPTO_ASSETS.ltc.address,
} as const;

/** Card → crypto on-ramps (KYC). For buyers who don't already hold crypto. */
export const CRYPTO_BUY_LINKS = [
  {
    id: "moonpay",
    label: "MoonPay",
    url: "https://www.moonpay.com/buy",
    note: "Card / bank · KYC · buy SOL, ETH, USDC, LTC",
  },
  {
    id: "transak",
    label: "Transak",
    url: "https://global.transak.com/",
    note: "Card · KYC · 100+ countries",
  },
  {
    id: "banxa",
    label: "Banxa",
    url: "https://banxa.com/",
    note: "Card / Apple Pay · KYC",
  },
  {
    id: "coinbase",
    label: "Coinbase",
    url: "https://www.coinbase.com/",
    note: "Sign up · KYC · buy then withdraw on-chain",
  },
  {
    id: "binance",
    label: "Binance",
    url: "https://www.binance.com/en/crypto/buy",
    note: "KYC · buy then send on-chain",
  },
] as const;

export const CONTACT_METHODS = [
  { id: "discord", label: "Discord" },
  { id: "telegram", label: "Telegram" },
  { id: "email", label: "Email" },
  { id: "instagram", label: "Instagram" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "phone", label: "Phone" },
] as const;

/** On-chain + hosted crypto rails shown at checkout */
export const CRYPTO_RAILS = [
  {
    id: "onchain",
    label: "On-chain wallet",
    description: "Send BTC, SOL, or ETH directly to ExamHub wallets",
    kind: "wallet" as const,
  },
  {
    id: "bitpay",
    label: "BitPay",
    description: "Pay with BitPay invoice / wallet link",
    kind: "hosted" as const,
    hint: "Create a BitPay payment and paste the invoice ID or TX reference",
  },
  {
    id: "coinbase",
    label: "Coinbase Commerce",
    description: "Coinbase Commerce charge or payment link",
    kind: "hosted" as const,
    hint: "Paste the Commerce charge code or payment ID",
  },
  {
    id: "nowpayments",
    label: "NOWPayments",
    description: "NOWPayments multi-coin checkout",
    kind: "hosted" as const,
    hint: "Paste the payment ID after you pay",
  },
  {
    id: "binance",
    label: "Binance Pay",
    description: "Binance Pay order reference",
    kind: "hosted" as const,
    hint: "Paste Binance Pay order / transfer ID",
  },
  {
    id: "other_crypto",
    label: "Other crypto",
    description: "Any other network or exchange transfer",
    kind: "hosted" as const,
    hint: "Paste TX hash or payment reference",
  },
] as const;

/** Max open (non-cancelled / non-closed) product orders per user */
export const MAX_ORDERS_PER_USER = 5;

/** Locked — see @/lib/admin-lock. Never accept overrides. */
export { LOCKED_ADMIN_EMAIL as ADMIN_EMAIL } from "@/lib/admin-lock";
export const SUPPORT_DISCORD = "minjunio";

const YEAR = 2026;

const SAT_FEATURES = {
  standard: [
    "AI-assisted practice engine",
    "Normal sandbox environment",
    "Full digital SAT coverage (RW + Math)",
    "Score tracking dashboard",
    "Email support within 24h",
  ],
  pro: [
    "Everything in Standard",
    "Guaranteed 1600 SAT pathway",
    "Enhanced sandbox isolation",
    "Leak-aware adaptive modules",
    "Priority live support",
    "Full-length timed simulations",
  ],
  premium: [
    "Everything in Pro",
    "Guaranteed 1600 SAT result pathway",
    "Maximum-security sandbox stack",
    "1:1 strategy coaching session",
    "Unlimited retake practice packs",
    "Same-day support SLA",
    "Post-exam review + score report kit",
  ],
} as const;

const ACT_FEATURES = {
  standard: [
    "AI-assisted ACT practice",
    "Normal sandbox environment",
    "English, Math, Reading, Science modules",
    "Composite score tracking",
    "Email support within 24h",
  ],
  pro: [
    "Everything in Standard",
    "Guaranteed 36 ACT pathway",
    "Enhanced sandbox isolation",
    "Leak-aware adaptive modules",
    "Priority live support",
    "Full-length timed simulations",
  ],
  premium: [
    "Everything in Pro",
    "Guaranteed 36 ACT result pathway",
    "Maximum-security sandbox stack",
    "1:1 strategy coaching session",
    "Unlimited retake practice packs",
    "Same-day support SLA",
    "Post-exam review + score report kit",
  ],
} as const;

function powerSeoTitle(
  name: string,
  price: number,
  category: string,
  extra?: string,
): string {
  const base = `${name} $${price} | ExamHub ${category}`;
  if (extra) return `${name} $${price} — ${extra} | ExamHub ${YEAR}`.slice(0, 70);
  return base.slice(0, 70);
}

function powerSeoDesc(name: string, short: string, price: number): string {
  return `${short} Order ${name} for $${price} on ExamHub. Crypto gift card & on-chain checkout. US, UK, Europe & global · ${YEAR}.`.slice(
    0,
    160,
  );
}

function examProduct(
  exam: "sat" | "act",
  tier: ProductTier,
  price: number,
  giftKey: keyof typeof GIFT_CARD_LINKS,
): Product {
  const label = exam.toUpperCase();
  const features = exam === "sat" ? SAT_FEATURES[tier] : ACT_FEATURES[tier];
  const tierLabel = tier[0]!.toUpperCase() + tier.slice(1);
  const score = exam === "sat" ? "1600" : "36";
  const name = `${label} ${tierLabel}`;
  return {
    id: `${exam}-${tier}`,
    slug: `${exam}-${tier}`,
    name,
    category: exam,
    tier,
    priceUsd: price,
    shortDescription:
      tier === "standard"
        ? `AI-powered ${label} prep with standard sandboxing`
        : tier === "pro"
          ? `Pro ${label} pathway with enhanced sandboxing and score guarantee`
          : `Premium ${label} pathway — top-tier sandbox, coaching, and guarantees`,
    longDescription:
      tier === "standard"
        ? `ExamHub ${label} Standard pairs a modern AI practice engine with a reliable sandbox. Ideal for students who want structured prep, digital exam coverage, and clear progress tracking.`
        : tier === "pro"
          ? `ExamHub ${label} Pro upgrades isolation, unlocks leak-aware adaptive modules, and targets a top score pathway (${score}) with priority support.`
          : `ExamHub ${label} Premium is the flagship stack: maximum sandbox security, guaranteed top-score pathway, 1:1 coaching, unlimited practice, and same-day support.`,
    features: [...features],
    giftCardUrl: GIFT_CARD_LINKS[giftKey],
    stripeBuyButtonId: stripeButtonForTier(tier),
    badge:
      tier === "premium" ? "Best results" : tier === "pro" ? "Most popular" : undefined,
    seoTitle: powerSeoTitle(
      name,
      price,
      label,
      tier === "premium"
        ? `${score} Guarantee Premium`
        : tier === "pro"
          ? `${score} Pathway Pro Sandbox`
          : "AI Standard Sandbox",
    ),
    seoDescription: powerSeoDesc(
      name,
      `Buy ${label} ${tierLabel} on ExamHub for $${price}. AI sandbox prep${tier !== "standard" ? `, enhanced isolation, and ${score} score pathway` : ""}.`,
      price,
    ),
    seoKeywords: [
      `${label} prep`,
      `${label} ${tier}`,
      `${label} AI`,
      `${label} sandbox`,
      `digital ${label}`,
      "exam hub",
      "online exam prep",
      `buy ${label} ${tier}`,
      String(YEAR),
    ],
  };
}

function makeTool(
  name: string,
  category: ProductCategory,
  priceUsd: number,
  shortDescription: string,
  longDescription: string,
  features: string[],
  keywords: string[],
  opts?: { regions?: string[]; badge?: string; giftKey?: keyof typeof GIFT_CARD_LINKS },
): Omit<Product, "id" | "slug"> {
  // Olympiads, proctor, tools, bundles → always Standard $190 Stripe button
  const price = 190;
  return {
    name,
    category,
    priceUsd: price,
    shortDescription,
    longDescription,
    features,
    regions: opts?.regions,
    giftCardUrl: GIFT_CARD_LINKS[opts?.giftKey ?? "tool"],
    stripeBuyButtonId: STRIPE_BUY_BUTTONS.standard,
    badge: opts?.badge,
    seoTitle: powerSeoTitle(name, price, category === "proctoring" ? "Proctor Support" : category === "contests" ? "Contest Prep" : "Exam Tool"),
    seoDescription: powerSeoDesc(name, shortDescription, price),
    seoKeywords: [...keywords, "ExamHub", "exam prep", String(YEAR)],
  };
}

export const PROCTOR_TOOLS: Omit<Product, "id" | "slug">[] = [
  makeTool(
    "Universal Proctor Bypass",
    "proctoring",
    600,
    "One stack for every major proctor & lockdown tool",
    "ExamHub Universal Proctor Bypass covers LockDown Browser, Honorlock, Proctorio, SEB, ProctorU, Examity and 30+ US/UK/EU platforms — one $190 Stripe checkout.",
    [
      "Works across 30+ proctor & lockdown platforms",
      "US · UK · Europe · APAC coverage",
      "Single $190 Stripe checkout",
      "Priority 24/7 support channel",
      "Pre-exam dry-run included",
      "Sandbox isolation guidance pack",
      "Same-day handoff window",
    ],
    [
      "universal proctor bypass",
      "all proctoring tools",
      "LockDown Browser",
      "Honorlock",
      "Proctorio",
      "Safe Exam Browser",
    ],
    {
      regions: ["United States", "United Kingdom", "Europe", "Canada", "Asia-Pacific", "Global"],
      badge: "Universal · $190",
      giftKey: "bundle",
    },
  ),
  makeTool(
    "Respondus LockDown Browser",
    "proctoring",
    190,
    "LockDown Browser exam support package",
    "Full ExamHub support for Respondus LockDown Browser environments used by US and international universities.",
    ["LockDown Browser environment support", "Pre-exam compatibility checklist", "US & international campus coverage", "Secure handoff workflow", "24h support"],
    ["LockDown Browser", "Respondus", "proctored exam"],
    { regions: ["United States", "Canada", "United Kingdom", "Europe", "Australia"], badge: "Most requested" },
  ),
  makeTool("Honorlock", "proctoring", 190, "Honorlock proctored exam support", "Browser extension flows, room scan prep, and delivery coordination for Honorlock sessions.", ["Honorlock browser + room scan prep", "Identity verification walkthrough", "US & UK institutions", "Secure handoff", "24h support"], ["Honorlock", "online proctoring"], { regions: ["United States", "United Kingdom", "Europe"] }),
  makeTool("Proctorio", "proctoring", 190, "Proctorio Chrome extension exam support", "Support for Proctorio on Canvas, Blackboard, and Moodle with camera/mic checks.", ["Chrome extension support", "Canvas / Blackboard / Moodle", "Camera & mic pre-check", "US, UK & EU", "24h support"], ["Proctorio", "Chrome proctoring"], { regions: ["United States", "United Kingdom", "Europe", "Canada"] }),
  makeTool("ProctorU / Meazure Learning", "proctoring", 190, "ProctorU live & auto proctoring support", "Live and automated ProctorU / Meazure Learning session prep and handoff.", ["Live & automated flows", "Appointment scheduling guidance", "Workspace compliance checklist", "Global time zones", "24h support"], ["ProctorU", "Meazure Learning"], { regions: ["United States", "United Kingdom", "Europe", "Asia-Pacific"] }),
  makeTool("Examity", "proctoring", 190, "Examity proctored assessment support", "College and professional Examity session prep with tech checks.", ["Session prep", "Tech checklist", "US higher-ed focus", "Secure handoff", "24h support"], ["Examity"], { regions: ["United States", "Canada"] }),
  makeTool("Proctortrack", "proctoring", 190, "Proctortrack AI proctoring support", "AI proctoring prep for Proctortrack university programs.", ["AI proctoring prep", "Identity & room scan", "US + international", "Secure handoff", "24h support"], ["Proctortrack"], { regions: ["United States", "India", "Europe"] }),
  makeTool("Respondus Monitor", "proctoring", 190, "Respondus Monitor webcam proctoring support", "Companion package for Respondus Monitor often paired with LockDown Browser.", ["Webcam session prep", "Pairs with LockDown Browser", "US campus coverage", "Secure handoff", "24h support"], ["Respondus Monitor"], { regions: ["United States", "Canada", "United Kingdom"] }),
  makeTool("Examplify / ExamSoft", "proctoring", 190, "ExamSoft Examplify secure exam support", "Law, medical, and professional Examplify setup and handoff.", ["Examplify setup guide", "Law & medical programs", "US & UK coverage", "Secure handoff", "24h support"], ["Examplify", "ExamSoft"], { regions: ["United States", "United Kingdom", "Canada"] }),
  makeTool("Talview", "proctoring", 190, "Talview remote proctoring (EU & global)", "European universities and global hiring assessments on Talview.", ["EU-friendly prep", "Academic + hiring", "Europe + global", "Secure handoff", "24h support"], ["Talview", "Europe proctoring"], { regions: ["Europe", "United Kingdom", "Middle East", "Asia-Pacific"] }),
  makeTool("Inspera Assessment", "proctoring", 190, "Inspera Assessment support (UK & Nordics)", "Digital assessments widely used across UK and Scandinavian higher education.", ["Inspera platform prep", "UK & Nordic universities", "Secure browser guidance", "Secure handoff", "24h support"], ["Inspera"], { regions: ["United Kingdom", "Norway", "Sweden", "Denmark", "Europe"] }),
  makeTool("PSI Bridge / Remote Proctor", "proctoring", 190, "PSI Bridge remote proctoring support", "Professional certification exams via PSI Bridge / Remote Proctor.", ["Professional cert prep", "US & EU windows", "ID verification guidance", "Secure handoff", "24h support"], ["PSI Bridge", "Remote Proctor"], { regions: ["United States", "United Kingdom", "Europe"] }),
  makeTool("Pearson VUE OnVUE", "proctoring", 190, "Pearson VUE OnVUE online proctoring support", "OnVUE online proctored professional exams (IT, finance, language certs).", ["OnVUE system check", "Professional cert focus", "Global windows", "Secure handoff", "24h support"], ["OnVUE", "Pearson VUE"], { regions: ["United States", "United Kingdom", "Europe", "Asia-Pacific", "Middle East"] }),
  makeTool("RPNow / Kryterion", "proctoring", 190, "RPNow Kryterion online proctoring support", "Kryterion RPNow certification and university exam support.", ["RPNow session prep", "Cert & academic exams", "US & global", "Secure handoff", "24h support"], ["RPNow", "Kryterion"], { regions: ["United States", "Europe", "Asia-Pacific"] }),
  makeTool("SMOWL", "proctoring", 190, "SMOWL proctoring support (Spain & Europe)", "SMOWL platforms popular with Spanish and broader European online universities.", ["SMOWL EU prep", "Spanish & EU online unis", "GDPR-aware notes", "Secure handoff", "24h support"], ["SMOWL"], { regions: ["Spain", "Europe", "Latin America"] }),
  makeTool("ProctorExam", "proctoring", 190, "ProctorExam support (Netherlands & EU)", "European online invigilation platform based in the Netherlands.", ["EU invigilation prep", "Dutch & EU universities", "Multi-camera guidance", "Secure handoff", "24h support"], ["ProctorExam"], { regions: ["Netherlands", "Europe", "United Kingdom"] }),
  makeTool("TestReach", "proctoring", 190, "TestReach proctoring (UK & Ireland)", "Remote invigilation for UK and Irish professional bodies and universities.", ["UK & Ireland focus", "Professional body exams", "Remote invigilation prep", "Secure handoff", "24h support"], ["TestReach"], { regions: ["United Kingdom", "Ireland", "Europe"] }),
  makeTool("Safe Exam Browser (SEB)", "proctoring", 190, "Safe Exam Browser lockdown support", "Open-source SEB lockdown browser used widely in Europe and APAC universities.", ["SEB config support", "Moodle / ILIAS / Canvas", "Europe & APAC focus", "Secure handoff", "24h support"], ["Safe Exam Browser", "SEB"], { regions: ["Europe", "Switzerland", "Germany", "Australia", "Asia-Pacific"], badge: "EU lockdown" }),
  makeTool("Questionmark Secure", "proctoring", 190, "Questionmark Secure browser support", "Secure browser package for Questionmark assessments in enterprise and higher-ed.", ["Secure browser prep", "Enterprise + higher-ed", "US & UK", "Secure handoff", "24h support"], ["Questionmark Secure"], { regions: ["United States", "United Kingdom", "Europe"] }),
  makeTool("LockDown Browser + Monitor Bundle", "proctoring", 190, "Respondus LockDown + Monitor combo support", "Combined LockDown Browser and Monitor workflow in one support package.", ["LockDown + Monitor together", "Room scan + browser lock", "US campus standard", "Secure handoff", "24h support"], ["LockDown Browser", "Respondus Monitor"], { regions: ["United States", "Canada", "United Kingdom"], badge: "Combo" }),
  makeTool("Canvas Quizzes Lockdown", "proctoring", 190, "Canvas LMS lockdown quiz support", "Canvas New Quizzes with lockdown / proctoring integrations support package.", ["Canvas New Quizzes", "Lockdown integrations", "US & global campuses", "Secure handoff", "24h support"], ["Canvas lockdown", "Canvas quizzes"], { regions: ["United States", "Canada", "United Kingdom", "Europe"] }),
  makeTool("Blackboard SafeAssign + Proctor", "proctoring", 190, "Blackboard proctored assessment support", "Blackboard Learn proctored exams and SafeAssign-adjacent workflows.", ["Blackboard Learn prep", "Proctor integrations", "US higher-ed", "Secure handoff", "24h support"], ["Blackboard proctoring"], { regions: ["United States", "United Kingdom"] }),
  makeTool("Moodle Safe Exam / Proctoring", "proctoring", 190, "Moodle SEB & proctor plugins support", "Moodle quizzes with Safe Exam Browser and common proctor plugins.", ["Moodle quiz prep", "SEB + plugins", "EU universities heavy", "Secure handoff", "24h support"], ["Moodle proctoring", "Moodle SEB"], { regions: ["Europe", "United Kingdom", "Latin America", "Asia-Pacific"] }),
  makeTool("Zoom Proctoring / Live Invigilation", "proctoring", 190, "Live Zoom invigilation support package", "Instructor-led Zoom proctoring common at smaller colleges and overseas programs.", ["Live Zoom session prep", "Multi-camera guidance", "Global coverage", "Secure handoff", "24h support"], ["Zoom proctoring", "live invigilation"], { regions: ["United States", "United Kingdom", "Europe", "Asia-Pacific"] }),
  makeTool("Microsoft Teams Proctored Exams", "proctoring", 190, "Teams-based live proctoring support", "Microsoft Teams invigilated exams for corporate training and some universities.", ["Teams session setup", "Corporate + academic", "US & EU", "Secure handoff", "24h support"], ["Teams proctoring"], { regions: ["United States", "Europe", "United Kingdom"] }),
  makeTool("Mercer Mettl", "proctoring", 190, "Mercer Mettl proctoring support", "Popular in India, Middle East, and enterprise hiring assessments.", ["Mettl AI proctoring prep", "Hiring + academic", "IN / ME / global", "Secure handoff", "24h support"], ["Mercer Mettl", "Mettl"], { regions: ["India", "Middle East", "Asia-Pacific", "Europe"] }),
  makeTool("HirePro / Wheebox", "proctoring", 190, "HirePro & Wheebox exam support", "Campus hiring and Indian university online exams on HirePro / Wheebox stacks.", ["Campus hiring exams", "India-focused platforms", "Secure handoff", "24h support"], ["HirePro", "Wheebox"], { regions: ["India", "Asia-Pacific"] }),
  makeTool("ATLAS / Wise Proctor", "proctoring", 190, "Wise Proctor & ATLAS support", "Browser-based AI proctoring used by US online colleges.", ["Wise Proctor prep", "Online college focus", "US coverage", "Secure handoff", "24h support"], ["Wise Proctor", "ATLAS proctoring"], { regions: ["United States"] }),
  makeTool("Integrity Advocate", "proctoring", 190, "Integrity Advocate proctoring support", "Canadian and international online course proctoring via Integrity Advocate.", ["Identity verification", "Canada + international", "LMS plugins", "Secure handoff", "24h support"], ["Integrity Advocate"], { regions: ["Canada", "United States", "International"] }),
  makeTool("ProctorFree", "proctoring", 190, "ProctorFree automated proctoring support", "Automated ProctorFree sessions for US community colleges and online programs.", ["Automated proctoring prep", "Community college focus", "US coverage", "Secure handoff", "24h support"], ["ProctorFree"], { regions: ["United States"] }),
  makeTool("SmarterProctoring", "proctoring", 190, "SmarterProctoring support package", "Flexible proctoring options (live, automated, in-person) via SmarterProctoring.", ["Live + automated options", "Flexible scheduling", "US higher-ed", "Secure handoff", "24h support"], ["SmarterProctoring"], { regions: ["United States"] }),
  makeTool("Tegrity / YuJa Proctor", "proctoring", 190, "YuJa / Tegrity proctoring support", "Lecture-capture ecosystems with proctoring modules used by many campuses.", ["YuJa proctor modules", "Campus LMS links", "US & Canada", "Secure handoff", "24h support"], ["YuJa proctor", "Tegrity"], { regions: ["United States", "Canada"] }),
  makeTool("Exam.net", "proctoring", 190, "Exam.net digital exam support (Nordics)", "Nordic digital exam platform popular in Sweden, Norway, and Finland.", ["Exam.net platform prep", "Nordic schools & unis", "Secure handoff", "24h support"], ["Exam.net", "Nordic exams"], { regions: ["Sweden", "Norway", "Finland", "Europe"] }),
  makeTool("Wiseflow / UNIwise", "proctoring", 190, "Wiseflow digital assessment support", "UNIwise Wiseflow assessments common in Danish and European higher education.", ["Wiseflow prep", "Danish & EU unis", "Secure handoff", "24h support"], ["Wiseflow", "UNIwise"], { regions: ["Denmark", "Europe", "United Kingdom"] }),
  makeTool("Digiexam", "proctoring", 190, "Digiexam lockdown client support", "Digiexam secure client used across European secondary and higher-ed.", ["Digiexam client prep", "EU secondary + HE", "Secure handoff", "24h support"], ["Digiexam"], { regions: ["Europe", "Sweden", "Germany"] }),
  makeTool("Turnitin + Proctor Combo", "proctoring", 190, "Turnitin integrity + proctor combo support", "Integrity stack combining Turnitin workflows with common proctor tools.", ["Turnitin integrity notes", "Pairs with major proctors", "Global campuses", "Secure handoff", "24h support"], ["Turnitin proctor"], { regions: ["United States", "United Kingdom", "Europe", "Asia-Pacific"] }),
];

export const CONTEST_PRODUCTS: Omit<Product, "id" | "slug">[] = [
  makeTool("USACO Bronze", "contests", 190, "USACO Bronze division contest support", "USA Computing Olympiad Bronze pathway with problem sets, timed mocks, and contest-day coordination.", ["Bronze syllabus coverage", "Timed mock contests", "Problem walkthroughs", "Contest-day support window"], ["USACO", "USACO Bronze", "competitive programming"], { badge: "USACO", giftKey: "standard" }),
  makeTool("USACO Silver", "contests", 250, "USACO Silver division contest support", "Silver algorithms, data structures, and contest strategy for promotion track.", ["Silver topics pack", "Graph & DP intros", "Timed mocks", "Contest-day support"], ["USACO Silver", "competitive programming"], { giftKey: "standard" }),
  makeTool("USACO Gold", "contests", 350, "USACO Gold division contest support", "Advanced Gold preparation for serious USACO competitors.", ["Gold algorithms", "Hard mock sets", "Editorial-style review", "Priority contest support"], ["USACO Gold"], { giftKey: "standard", badge: "Advanced" }),
  makeTool("USACO Platinum", "contests", 450, "USACO Platinum division contest support", "Top-tier Platinum track aiming at camp / IOI pipeline readiness.", ["Platinum problem bank", "Elite coaching notes", "Full contest sims", "Priority support"], ["USACO Platinum", "IOI pipeline"], { giftKey: "pro", badge: "Elite" }),
  makeTool("AMC 8 / 10 / 12", "contests", 190, "AMC math contest prep package", "American Mathematics Competitions coverage for AMC 8, 10, and 12.", ["AMC 8/10/12 modules", "Timed practice tests", "Topic drills", "Score tracking"], ["AMC 10", "AMC 12", "math contest"], { giftKey: "standard" }),
  makeTool("AIME", "contests", 280, "AIME contest prep package", "American Invitational Mathematics Examination problem sets and strategy.", ["AIME problem bank", "Proof-style solutions", "Timed sections", "Score targets"], ["AIME", "math olympiad"], { giftKey: "standard" }),
  makeTool("USAJMO / USAMO", "contests", 450, "USAJMO & USAMO olympiad support", "Proof olympiad pathway for USAJMO and USAMO qualifiers.", ["Proof writing labs", "Past paper packs", "Mentor feedback cycles", "Priority support"], ["USAMO", "USAJMO"], { giftKey: "pro", badge: "Olympiad" }),
  makeTool("IMO Training Track", "contests", 550, "International Math Olympiad training track", "Long-form IMO-style training for national team aspirants.", ["IMO shortlist practice", "Topic camps (geo, NT, combo, algebra)", "Mock IMOs", "Coach reviews"], ["IMO", "math olympiad"], { giftKey: "pro" }),
  makeTool("IOI Training Track", "contests", 550, "International Olympiad in Informatics track", "Competitive programming olympiad track aligned with IOI syllabus.", ["IOI syllabus map", "Contest sims", "Code review cycles", "Priority support"], ["IOI", "competitive programming"], { giftKey: "pro" }),
  makeTool("Codeforces / AtCoder Coaching", "contests", 220, "CF & AtCoder rated contest coaching", "Rating climb plans for Codeforces and AtCoder regular contests.", ["Rating roadmap", "Virtual contests", "Editorial review", "Weekly goals"], ["Codeforces", "AtCoder"], { giftKey: "standard" }),
  makeTool("LeetCode Contest Pack", "contests", 190, "LeetCode weekly & biweekly contest pack", "Interview + contest hybrid prep for LeetCode weekly events.", ["Weekly contest drills", "Pattern sheets", "Timed mocks", "Review notes"], ["LeetCode contest"], { giftKey: "standard" }),
  makeTool("ACS / ACSL", "contests", 190, "ACSL computer science contest support", "American Computer Science League contest modules.", ["ACSL topics", "Past contests", "Team & individual modes", "Support window"], ["ACSL", "ACS contest"], { giftKey: "standard" }),
  makeTool("F=ma / USAPhO", "contests", 280, "Physics olympiad F=ma & USAPhO support", "Physics bowl-to-olympiad pathway for F=ma and USAPhO.", ["F=ma drills", "USAPhO free response", "Labs theory pack", "Timed mocks"], ["F=ma", "USAPhO", "physics olympiad"], { giftKey: "standard" }),
  makeTool("USABO", "contests", 250, "USA Biology Olympiad support", "USABO open and semifinal preparation packages.", ["Open exam drills", "Semifinal free response", "Bio topic maps", "Support window"], ["USABO", "biology olympiad"], { giftKey: "standard" }),
  makeTool("USNCO", "contests", 250, "US National Chemistry Olympiad support", "Local and national USNCO chemistry olympiad prep.", ["Local exam pack", "National free response", "Lab theory", "Timed practice"], ["USNCO", "chemistry olympiad"], { giftKey: "standard" }),
  makeTool("Science Bowl / Quiz Bowl", "contests", 190, "Science Bowl & Quiz Bowl team pack", "Buzzer-style STEM and quiz bowl team preparation.", ["Toss-up drills", "Team strategy", "Category banks", "Mock matches"], ["Science Bowl", "Quiz Bowl"], { giftKey: "standard" }),
  makeTool("Regents Exams (NY)", "contests", 190, "NY Regents exam support pack", "New York Regents subject exams preparation and support.", ["Core Regents subjects", "Past papers", "Scoring guides", "Support window"], ["NY Regents"], { giftKey: "standard", regions: ["United States", "New York"] }),
  makeTool("AP Exams Bundle Support", "contests", 220, "AP exam support (multi-subject)", "Advanced Placement exam support across popular AP subjects.", ["AP subject modules", "FRQ practice", "MCQ drills", "Score target plans"], ["AP exams", "Advanced Placement"], { giftKey: "standard" }),
  makeTool("IB Exams Support", "contests", 250, "International Baccalaureate exam support", "IB DP exam support for HL/SL subjects with paper practice.", ["HL/SL paper practice", "IA guidance notes", "Markscheme review"], ["IB exams", "International Baccalaureate"], { giftKey: "standard", regions: ["United Kingdom", "Europe", "United States", "Asia-Pacific"] }),
  makeTool("A-Levels Support", "contests", 250, "UK A-Level exam support package", "A-Level subject support for OCR, AQA, Edexcel boards.", ["Board-specific packs", "Past papers", "Mark schemes", "UK focus"], ["A-Levels", "AQA", "OCR", "Edexcel"], { giftKey: "standard", regions: ["United Kingdom"] }),
  makeTool("GCSE Support", "contests", 190, "UK GCSE exam support package", "GCSE subject support across major UK exam boards.", ["Core GCSE subjects", "Past papers", "Grade 9 pathways", "UK support"], ["GCSE"], { giftKey: "standard", regions: ["United Kingdom"] }),
  makeTool("GRE Prep Pathway", "contests", 220, "GRE general test prep pathway", "Quant, Verbal, and AWA GRE prep with score targets.", ["Quant + Verbal modules", "AWA templates", "Full mocks", "Score tracking"], ["GRE prep"], { giftKey: "standard" }),
  makeTool("GMAT Focus Prep", "contests", 280, "GMAT Focus Edition prep pathway", "Business school GMAT Focus prep with adaptive mocks.", ["Focus Edition syllabus", "Adaptive mocks", "Data Insights drills", "Score targets"], ["GMAT Focus"], { giftKey: "standard" }),
  makeTool("LSAT Prep Pathway", "contests", 280, "LSAT prep pathway", "Law school admission test prep with LR, LG, and RC modules.", ["LR / LG / RC packs", "Timed sections", "PT reviews", "Score targets"], ["LSAT"], { giftKey: "standard" }),
  makeTool("MCAT Prep Pathway", "contests", 350, "MCAT prep pathway", "Medical college admission test content + CARS support.", ["Content review map", "CARS drills", "Full-length mocks", "Score targets"], ["MCAT"], { giftKey: "standard" }),
];

export const EXTRA_TOOLS: Omit<Product, "id" | "slug">[] = [
  makeTool("Digital SAT Device Setup", "tools", 90, "Device & browser setup for digital SAT", "Pre-exam device checklist, Bluebook app setup, and network readiness.", ["Bluebook app setup", "Device compliance", "Network checklist", "Day-of runbook"], ["digital SAT setup", "Bluebook"], { giftKey: "standard" }),
  makeTool("ACT Online Testing Setup", "tools", 90, "ACT online testing environment setup", "Online ACT testing environment readiness and troubleshooting.", ["Online ACT checklist", "Browser readiness", "Account verification", "Support window"], ["ACT online"], { giftKey: "standard" }),
  makeTool("Calculator & Formula Pack", "tools", 60, "Exam calculator policies & formula sheets", "Approved calculator lists and printable formula quick-sheets for SAT/ACT/AP.", ["Calculator policy guide", "Formula sheets", "Subject packs", "Print-ready PDFs"], ["exam calculator", "formula sheet"], { giftKey: "standard" }),
  makeTool("Score Verification Assist", "tools", 120, "Score report verification assistance", "Help verifying official score reports and understanding superscores.", ["Score report walkthrough", "Superscore guidance", "College send checklist", "Support window"], ["score verification"], { giftKey: "standard" }),
  makeTool("College Board Account Recovery", "tools", 80, "College Board account recovery help", "Assistance recovering College Board accounts and linking scores.", ["Account recovery steps", "Score linking", "Security checklist", "Support window"], ["College Board account"], { giftKey: "standard" }),
  makeTool("Proctor Dry-Run Session", "tools", 100, "30-min proctor environment dry-run", "Live dry-run of your proctoring stack before the real exam.", ["30-min live dry-run", "Environment fixes", "Device audit", "Written report"], ["proctor dry run"], { giftKey: "standard", badge: "Popular" }),
  makeTool("Exam Day Concierge", "tools", 150, "Exam-day live concierge support", "Real-time support channel during your exam window.", ["Live chat during window", "Escalation path", "Timezone coverage", "Post-exam debrief"], ["exam day support"], { giftKey: "standard" }),
  makeTool("Accommodations Filing Help", "tools", 140, "SSD / exam accommodations filing help", "Guidance packaging documentation for SSD and similar accommodations.", ["SSD paperwork checklist", "Timeline planner", "Document packaging", "Support window"], ["SSD accommodations"], { giftKey: "standard" }),
  makeTool("TOEFL iBT Support", "tools", 190, "TOEFL iBT test support package", "TOEFL iBT section prep and online testing environment support.", ["4-skill modules", "Speaking practice", "Home edition notes", "Score targets"], ["TOEFL iBT"], { giftKey: "standard" }),
  makeTool("IELTS Support", "tools", 190, "IELTS Academic & General support", "IELTS band-target prep for Academic and General Training.", ["Band target plan", "Writing task labs", "Speaking mocks", "UKVI notes"], ["IELTS"], { giftKey: "standard" }),
  makeTool("Duolingo English Test Support", "tools", 150, "DET support package", "Duolingo English Test adaptive practice and readiness checklist.", ["Adaptive practice", "Score estimator", "Device checklist", "Support window"], ["Duolingo English Test", "DET"], { giftKey: "standard" }),
  makeTool("Plagiarism Check Pass", "tools", 50, "Similarity check + rewrite notes", "Similarity report review with actionable rewrite notes for essays and papers.", ["Similarity report", "Rewrite guidance", "Citation tips", "Fast turnaround"], ["plagiarism check"], { giftKey: "standard" }),
  makeTool("Citation & Formatting Pass", "tools", 60, "APA / MLA / IEEE formatting pass", "Professional citation and document formatting for academic submissions.", ["APA 7 / MLA / IEEE", "Reference cleanup", "Layout polish", "48h option"], ["APA formatting", "citation"], { giftKey: "standard" }),
  makeTool("Statement of Purpose Review", "tools", 120, "SOP / personal statement review", "Admissions essay review with structural and voice feedback.", ["Full SOP review", "Structure rewrite notes", "2 revision rounds", "Admissions tone guide"], ["statement of purpose", "SOP"], { giftKey: "standard" }),
  makeTool("Resume + LinkedIn Student Pack", "tools", 90, "Student resume & LinkedIn polish", "Internship-ready resume and LinkedIn profile rewrite.", ["1-page resume", "LinkedIn rewrite", "ATS keywords", "2 revisions"], ["student resume", "LinkedIn"], { giftKey: "standard" }),
];

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function withIds(
  items: Omit<Product, "id" | "slug">[],
  prefix: string,
): Product[] {
  return items.map((tool) => {
    const slug = `${prefix}-${slugify(tool.name)}`;
    return { ...tool, id: slug, slug } satisfies Product;
  });
}

export const PRODUCTS: Product[] = [
  examProduct("sat", "standard", 190, "standard"),
  examProduct("sat", "pro", 450, "pro"),
  examProduct("sat", "premium", 890, "premium"),
  examProduct("act", "standard", 190, "standard"),
  examProduct("act", "pro", 450, "pro"),
  examProduct("act", "premium", 890, "premium"),
  {
    id: "bundle-pro-sat-act-lockdown",
    slug: "bundle-pro-sat-act-lockdown",
    name: "Pro Bundle: SAT + ACT + LockDown",
    category: "bundle",
    priceUsd: 190,
    shortDescription: "SAT + ACT + LockDown pathway — Standard Stripe checkout",
    longDescription:
      "The ExamHub bundle for SAT, ACT, and Respondus LockDown Browser support at the Standard $190 Stripe price.",
    features: [
      "SAT pathway support",
      "ACT pathway support",
      "Respondus LockDown Browser support",
      "Priority support channel",
      "Single Stripe checkout",
    ],
    giftCardUrl: GIFT_CARD_LINKS.bundle,
    stripeBuyButtonId: STRIPE_BUY_BUTTONS.standard,
    badge: "Standard $190",
    seoTitle: powerSeoTitle(
      "SAT ACT LockDown Bundle",
      190,
      "Bundle",
      "Standard Stripe",
    ),
    seoDescription: powerSeoDesc(
      "SAT ACT LockDown Bundle",
      "Standard $190 Stripe package for SAT, ACT, and LockDown Browser support.",
      190,
    ),
    seoKeywords: [
      "SAT ACT bundle",
      "LockDown Browser bundle",
      "ExamHub bundle",
      String(YEAR),
    ],
  },
  ...withIds(PROCTOR_TOOLS, "proctor"),
  ...withIds(CONTEST_PRODUCTS, "contest"),
  ...withIds(EXTRA_TOOLS, "tool"),
  {
    id: "research",
    slug: "research",
    name: "Research paper package",
    category: "research",
    priceUsd: 800,
    shortDescription: "Custom research paper package with progress tracking",
    longDescription:
      "Flat research paper package. Submit crypto or a G2A voucher, leave contact, and admin updates delivery.",
    features: [
      "Custom paper request",
      "Admin progress updates",
      "Crypto or G2A voucher checkout",
    ],
    giftCardUrl: GIFT_CARD_CHECKOUT_URL,
    seoTitle: powerSeoTitle("Research paper package", 800, "Research"),
    seoDescription: powerSeoDesc(
      "Research paper package",
      "Custom research paper package.",
      800,
    ),
    seoKeywords: ["research paper", "ExamHub", String(YEAR)],
  },
  {
    id: "internship",
    slug: "internship",
    name: "Internship placement",
    category: "internship",
    priceUsd: 750,
    shortDescription: "Internship matching with admin progress tracking",
    longDescription:
      "Flat internship placement. Pay with crypto or a G2A voucher, leave contact, admin completes the order.",
    features: [
      "Field + region matching",
      "Admin progress updates",
      "Crypto or G2A voucher checkout",
    ],
    giftCardUrl: GIFT_CARD_CHECKOUT_URL,
    seoTitle: powerSeoTitle("Internship placement", 750, "Internships"),
    seoDescription: powerSeoDesc(
      "Internship placement",
      "Internship matching package.",
      750,
    ),
    seoKeywords: ["internship", "ExamHub", String(YEAR)],
  },
];

export function productPublicPath(slug: string): string {
  return `/products/${slug}`;
}

export function getSeoDirectory(): {
  name: string;
  path: string;
  seoTitle: string;
  seoDescription: string;
  category: string;
  priceUsd: number;
}[] {
  const staticPages = [
    {
      name: "Home",
      path: "/",
      seoTitle: "ExamHub | SAT ACT Prep, LockDown Browser, USACO, Honorlock",
      seoDescription:
        "ExamHub: SAT/ACT pathways, full proctor stack, contests, research papers, internships.",
      category: "page",
      priceUsd: 0,
    },
    {
      name: "Research papers",
      path: "/research",
      seoTitle: `Research Papers | Custom Quotes — ExamHub ${YEAR}`,
      seoDescription:
        "Custom research paper requests. Q1/Q2 journal targets, methodology, rush options. Contact for payment.",
      category: "research",
      priceUsd: 0,
    },
    {
      name: "Internships",
      path: "/internships",
      seoTitle: `Internships | US & Global Placement — ExamHub ${YEAR}`,
      seoDescription:
        "Internship placement with field selection, state search, priority fast track, weekly salary estimates.",
      category: "internship",
      priceUsd: 0,
    },
    {
      name: "Live demo",
      path: "/demo",
      seoTitle: `SAT Assist Demo & Sandbox Visual | ExamHub ${YEAR}`,
      seoDescription:
        "Interactive SAT assist demo with discreet answer overlay settings and sandbox isolation visual.",
      category: "page",
      priceUsd: 0,
    },
    {
      name: "Blog",
      path: "/blog",
      seoTitle: `Exam Prep Blog | SAT ACT Proctoring Guides — ExamHub ${YEAR}`,
      seoDescription:
        "SEO-optimized ExamHub blog on SAT, ACT, proctoring tools, contests, and student success.",
      category: "page",
      priceUsd: 0,
    },
    {
      name: "Sitemap",
      path: "/sitemap.xml",
      seoTitle: "XML Sitemap",
      seoDescription: "Machine-readable sitemap for Google indexing.",
      category: "seo",
      priceUsd: 0,
    },
  ];
  const products = PRODUCTS.map((p) => ({
    name: p.name,
    path: productPublicPath(p.slug),
    seoTitle: p.seoTitle,
    seoDescription: p.seoDescription,
    category: p.category,
    priceUsd: p.priceUsd,
  }));
  return [...staticPages, ...products];
}

export const CATEGORIES: {
  id: ProductCategory | "all";
  label: string;
  description: string;
  href: string;
}[] = [
  {
    id: "all",
    label: "All tools",
    description: "Browse every ExamHub product",
    href: "/#catalog",
  },
  {
    id: "sat",
    label: "SAT",
    description: "Standard · Pro · Premium pathways",
    href: "/category/sat",
  },
  {
    id: "act",
    label: "ACT",
    description: "Standard · Pro · Premium pathways",
    href: "/category/act",
  },
  {
    id: "proctoring",
    label: "Proctor & lockdown",
    description: "Universal · LockDown · 30+ tools",
    href: "/category/proctoring",
  },
  {
    id: "contests",
    label: "Contests & olympiads",
    description: "USACO, AMC, AIME, IOI, AP, IB & more",
    href: "/category/contests",
  },
  {
    id: "tools",
    label: "Extra tools",
    description: "Setup, dry-runs, essays, TOEFL & more",
    href: "/category/tools",
  },
  {
    id: "bundle",
    label: "Bundles",
    description: "Pro SAT + ACT + LockDown deal",
    href: "/category/bundle",
  },
  {
    id: "research",
    label: "Research papers",
    description: "Custom research requests",
    href: "/research",
  },
  {
    id: "internship",
    label: "Internships",
    description: "US + international placement",
    href: "/internships",
  },
];

export function getProductBySlug(slug: string): Product | undefined {
  return PRODUCTS.find((p) => p.slug === slug || p.id === slug);
}

export function getProductsByCategory(category: ProductCategory): Product[] {
  return PRODUCTS.filter((p) => p.category === category);
}

export function searchProducts(query: string): Product[] {
  const q = query.trim().toLowerCase();
  if (!q) return PRODUCTS;
  return PRODUCTS.filter((p) => {
    const hay = [
      p.name,
      p.shortDescription,
      p.longDescription,
      p.category,
      ...(p.regions ?? []),
      ...p.seoKeywords,
      ...p.features,
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}

export const RESEARCH_SUBJECTS = [
  "Computer Science",
  "Business & Economics",
  "Psychology",
  "Biology & Life Sciences",
  "Medicine & Health",
  "Engineering",
  "Education",
  "Law & Legal Studies",
  "Sociology",
  "Political Science",
  "Environmental Science",
  "Mathematics & Statistics",
  "Chemistry",
  "Physics",
  "Literature & Humanities",
  "Marketing",
  "Finance & Accounting",
  "Nursing",
  "Public Health",
  "Data Science & AI",
] as const;

/** All research add-ons are FREE — flat $800 package via Stripe. */
export const RESEARCH_OPTIONS: {
  id: string;
  label: string;
  description: string;
  priceUsd: number;
}[] = [
  { id: "q1-journal", label: "Q1 journal target", description: "Top-quartile indexing aim (Scopus/WoS Q1)", priceUsd: 0 },
  { id: "q2-journal", label: "Q2 journal target", description: "Second-quartile indexing aim", priceUsd: 0 },
  { id: "q3-journal", label: "Q3 journal target", description: "Solid mid-tier indexing aim", priceUsd: 0 },
  { id: "scopus", label: "Scopus indexing", description: "Scopus-eligible structure & keywords", priceUsd: 0 },
  { id: "wos", label: "Web of Science", description: "WoS-oriented framing & references", priceUsd: 0 },
  { id: "literature-review", label: "Extended literature review", description: "Deep related-work chapter (40+ sources)", priceUsd: 0 },
  { id: "methodology", label: "Methodology design", description: "Full methods section + instruments", priceUsd: 0 },
  { id: "data-analysis", label: "Data analysis package", description: "Stats tables, figures, interpretation", priceUsd: 0 },
  { id: "plagiarism-report", label: "Plagiarism report", description: "Similarity check + rewrite pass", priceUsd: 0 },
  { id: "rush-7d", label: "7-day rush", description: "Priority delivery in one week", priceUsd: 0 },
  { id: "revision-rounds", label: "3 revision rounds", description: "Post-delivery polish cycles", priceUsd: 0 },
  { id: "presentation", label: "Defense presentation", description: "Slide deck for oral defense", priceUsd: 0 },
  { id: "apa-format", label: "APA 7th formatting", description: "Full APA layout & citations", priceUsd: 0 },
  { id: "ieee-format", label: "IEEE formatting", description: "Full IEEE layout & citations", priceUsd: 0 },
];

export const RESEARCH_STRIPE_BUTTON = STRIPE_BUY_BUTTONS.research;

export const RESEARCH_BASE_USD = 800;

/** Flat internship package price — includes all free add-ons. */
export const INTERNSHIP_FLAT_USD = 750;
export const INTERNSHIP_STRIPE_BUTTON = STRIPE_BUY_BUTTONS.internship;


export const INTERNSHIP_FIELDS: {
  id: string;
  label: string;
  basePriceUsd: number;
  weeklySalaryMin: number;
  weeklySalaryMax: number;
  hotStates?: string[];
}[] = [
  { id: "software-engineering", label: "Software Engineering", basePriceUsd: 750, weeklySalaryMin: 900, weeklySalaryMax: 1800, hotStates: ["California", "Washington", "New York", "Texas", "Massachusetts"] },
  { id: "data-science", label: "Data Science & ML", basePriceUsd: 750, weeklySalaryMin: 850, weeklySalaryMax: 1700, hotStates: ["California", "New York", "Washington", "Massachusetts"] },
  { id: "ai-research", label: "AI Research", basePriceUsd: 750, weeklySalaryMin: 1000, weeklySalaryMax: 2000, hotStates: ["California", "Washington", "New York", "Massachusetts"] },
  { id: "cybersecurity", label: "Cybersecurity", basePriceUsd: 750, weeklySalaryMin: 800, weeklySalaryMax: 1600, hotStates: ["Virginia", "Maryland", "Texas", "California"] },
  { id: "product-management", label: "Product Management", basePriceUsd: 750, weeklySalaryMin: 750, weeklySalaryMax: 1500, hotStates: ["California", "New York", "Washington"] },
  { id: "finance", label: "Finance & Investment", basePriceUsd: 750, weeklySalaryMin: 950, weeklySalaryMax: 1900, hotStates: ["New York", "Illinois", "Connecticut", "California"] },
  { id: "marketing", label: "Digital Marketing", basePriceUsd: 750, weeklySalaryMin: 500, weeklySalaryMax: 1100, hotStates: ["New York", "California", "Texas", "Illinois"] },
  { id: "design", label: "UI/UX Design", basePriceUsd: 750, weeklySalaryMin: 550, weeklySalaryMax: 1200, hotStates: ["California", "New York", "Washington"] },
  { id: "biotech", label: "Biotech & Life Sciences", basePriceUsd: 750, weeklySalaryMin: 700, weeklySalaryMax: 1400, hotStates: ["Massachusetts", "California", "Maryland", "North Carolina"] },
  { id: "law", label: "Legal / Law Firm", basePriceUsd: 750, weeklySalaryMin: 600, weeklySalaryMax: 1300, hotStates: ["New York", "District of Columbia", "California", "Illinois"] },
  { id: "consulting", label: "Management Consulting", basePriceUsd: 750, weeklySalaryMin: 1000, weeklySalaryMax: 2000, hotStates: ["New York", "Illinois", "Massachusetts", "District of Columbia"] },
  { id: "healthcare", label: "Healthcare Admin", basePriceUsd: 750, weeklySalaryMin: 500, weeklySalaryMax: 1100, hotStates: ["California", "Texas", "Florida", "New York"] },
  { id: "media", label: "Media & Communications", basePriceUsd: 750, weeklySalaryMin: 450, weeklySalaryMax: 1000, hotStates: ["New York", "California", "Georgia"] },
  { id: "mechanical", label: "Mechanical Engineering", basePriceUsd: 750, weeklySalaryMin: 650, weeklySalaryMax: 1350, hotStates: ["Michigan", "Texas", "Ohio", "California"] },
  { id: "electrical", label: "Electrical Engineering", basePriceUsd: 750, weeklySalaryMin: 700, weeklySalaryMax: 1450, hotStates: ["California", "Texas", "Arizona", "Massachusetts"] },
];

export const US_STATES = [
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan","Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire","New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia","Wisconsin","Wyoming","District of Columbia","Remote / Any state",
] as const;

export const INTERNSHIP_COUNTRIES: {
  id: string;
  label: string;
  setupNote: string;
  feeMult: number;
}[] = [
  { id: "us", label: "United States", setupNote: "Standard US placement with state-based salary model.", feeMult: 1 },
  { id: "uk", label: "United Kingdom", setupNote: "UK setup — visa/right-to-work notes and London weighting.", feeMult: 1 },
  { id: "ca", label: "Canada", setupNote: "Canadian placement setup (co-op friendly pathways).", feeMult: 1 },
  { id: "eu", label: "European Union", setupNote: "EU setup — country-specific host matching after contact.", feeMult: 1 },
  { id: "au", label: "Australia", setupNote: "AU setup with semester-aligned internship windows.", feeMult: 1 },
  { id: "sg", label: "Singapore", setupNote: "SG setup for finance, tech, and consulting hosts.", feeMult: 1 },
  { id: "ae", label: "UAE / Middle East", setupNote: "Gulf setup — Dubai/Abu Dhabi focused host search.", feeMult: 1 },
  { id: "other", label: "Other country", setupNote: "Custom international setup — we design the search after you submit.", feeMult: 1 },
];

export const INTERNSHIP_EXTRAS: {
  id: string;
  label: string;
  description: string;
  priceUsd: number;
  group: "matching" | "docs" | "speed" | "coaching";
}[] = [
  { id: "priority-fast-track", label: "Priority fast track", description: "Jump the queue — first host outreach within 72 hours", priceUsd: 0, group: "speed" },
  { id: "rush-7d", label: "7-day priority matching", description: "Expedited host shortlist in one week", priceUsd: 0, group: "speed" },
  { id: "ai-matching", label: "AI role matching", description: "AI-optimized host & role matching against your profile", priceUsd: 0, group: "matching" },
  { id: "advanced-state-search", label: "Advanced state search", description: "Deep employer scan focused on your selected US state", priceUsd: 0, group: "matching" },
  { id: "remote", label: "Remote-friendly placement", description: "Prioritize remote or hybrid roles", priceUsd: 0, group: "matching" },
  { id: "fortune500", label: "Fortune 500 preference", description: "Target large enterprise hosts", priceUsd: 0, group: "matching" },
  { id: "startup", label: "Startup track", description: "High-growth startup hosts", priceUsd: 0, group: "matching" },
  { id: "resume", label: "Resume + LinkedIn polish", description: "Professional rewrite package", priceUsd: 0, group: "docs" },
  { id: "interview-coach", label: "Interview coaching", description: "2 mock interview sessions", priceUsd: 0, group: "coaching" },
  { id: "visa-letter", label: "CPT/OPT letter support", description: "Documentation guidance for F-1 students", priceUsd: 0, group: "docs" },
];

export const CONTACT_METHODS = [
  { id: "email", label: "Email" },
  { id: "instagram", label: "Instagram" },
  { id: "discord", label: "Discord" },
  { id: "telegram", label: "Telegram" },
  { id: "whatsapp", label: "WhatsApp" },
] as const;

export function estimateWeeklySalary(
  fieldId: string,
  state: string,
  countryId = "us",
): { min: number; max: number; mid: number; marketNote: string } {
  const field = INTERNSHIP_FIELDS.find((f) => f.id === fieldId);
  if (!field) return { min: 500, max: 1000, mid: 750, marketNote: "General estimate" };

  if (countryId !== "us") {
    const country = INTERNSHIP_COUNTRIES.find((c) => c.id === countryId);
    const mult = country?.id === "uk" || country?.id === "sg" ? 1.15 : country?.id === "eu" ? 1.05 : 0.95;
    const min = Math.round(field.weeklySalaryMin * mult);
    const max = Math.round(field.weeklySalaryMax * mult);
    return {
      min,
      max,
      mid: Math.round((min + max) / 2),
      marketNote: country?.setupNote ?? "International market estimate",
    };
  }

  const highCost = ["California","New York","Massachusetts","Washington","District of Columbia","New Jersey","Connecticut"];
  const lowCost = ["Mississippi","Arkansas","West Virginia","Alabama","Oklahoma","Kentucky","South Dakota"];
  let mult = 1;
  let marketNote = "Average US market for this field";
  if (highCost.includes(state)) {
    mult = 1.22;
    marketNote = `High-cost market · ${state}`;
  } else if (lowCost.includes(state)) {
    mult = 0.88;
    marketNote = `Lower-cost market · ${state}`;
  } else if (state === "Remote / Any state") {
    mult = 1.05;
    marketNote = "Remote / multi-state average";
  } else {
    marketNote = `State-adjusted · ${state}`;
  }

  if (field.hotStates?.includes(state)) {
    mult *= 1.06;
    marketNote += " · strong hiring state for this field";
  }

  const min = Math.round(field.weeklySalaryMin * mult);
  const max = Math.round(field.weeklySalaryMax * mult);
  return { min, max, mid: Math.round((min + max) / 2), marketNote };
}

export function internshipBaseWithCountry(_fieldId: string, _countryId: string): number {
  // Flat $750 package — free add-ons included
  return INTERNSHIP_FLAT_USD;
}

export const GROUP_BUY_TIERS = [
  { people: 1, discountPct: 0, label: "Solo" },
  { people: 2, discountPct: 30, label: "Duo · 30% off" },
  { people: 3, discountPct: 40, label: "Trio+ · 40% off" },
] as const;

export function groupBuyDiscountPct(people: number): number {
  if (people >= 3) return 40;
  if (people >= 2) return 30;
  return 0;
}

export function groupBuyPrice(baseUsd: number, people: number): {
  perPerson: number;
  total: number;
  discountPct: number;
  savedPerPerson: number;
} {
  const n = Math.max(1, Math.min(20, Math.floor(people || 1)));
  const discountPct = groupBuyDiscountPct(n);
  const perPerson = Math.round(baseUsd * (1 - discountPct / 100));
  return {
    perPerson,
    total: perPerson * n,
    discountPct,
    savedPerPerson: baseUsd - perPerson,
  };
}

export type SpecialOffer = {
  id: string;
  title: string;
  description: string;
  badge: string;
  href: string;
  params?: { slug?: string; cat?: string };
  priceLabel: string;
  highlight?: string;
};

export const SPECIAL_OFFERS: SpecialOffer[] = [];
