export interface Persona {
  id: string;
  name: string;
  city: string;
  oneLine: string;
  cv: string;
  client: { name: string; country: string; type: string; scope: string; valueUsd: number; days: number };
  monthlyUsd: number;
  platform: "fiverr" | "upwork" | "none";
}

export const PERSONAS: Persona[] = [
  {
    id: "tahmid",
    name: "Tahmid Hasan",
    city: "Dhaka",
    oneLine: "Tahmid Hasan (Dhaka CSE Undergrad) — React/Django Full-Stack Portfolio & GitHub Audit ($25/hr Target)",
    platform: "none",
    monthlyUsd: 600,
    cv: `Tahmid Hasan
Final-year B.Sc. CSE student, Dhaka. Full-stack web developer.

Skills: React, Next.js, TypeScript, Node, Express, Django, PostgreSQL, Tailwind, Docker (basic).

Projects
- Bus seat booking app for intercity routes built with Next.js and PostgreSQL, 300 weekly users on campus.
- REST API in Django for a club's event registrations with JWT auth.
- Built a payment webhook handler in Node and Express for a bKash sandbox checkout.

Experience: 1 year of part-time freelance projects for local shops.
Looking for remote full-stack work at around $25/hour.`,
    client: { name: "Lena Fischer", country: "Germany", type: "a Berlin bike-rental startup", scope: "Build a booking dashboard in Next.js with Stripe test payments and an admin panel.", valueUsd: 1200, days: 30 },
  },
  {
    id: "apu",
    name: "Sudiptta Apu",
    city: "Khulna",
    oneLine: "Sudiptta Apu (Khulna Web/Shopify Dev) — Transitioning $850/mo Fiverr Income to Direct Contracts",
    platform: "fiverr",
    monthlyUsd: 850,
    cv: `Sudiptta Apu
Shopify and WordPress developer, Khulna. Level 2 seller on Fiverr.

I earn about $850/month on Fiverr building and fixing online stores.
- 3 years customising Shopify themes with Liquid and theme app extensions.
- WooCommerce and Elementor store builds for small fashion brands.
- Speed optimisation: lifted Core Web Vitals scores for 20+ stores.
- Basic JavaScript and SEO audits.

During the July 2024 internet shutdown I missed two deliveries and lost my Level 2 badge for a month.
I want my own clients with clear contracts.`,
    client: { name: "Maya Ortiz", country: "United States", type: "a Texas candle brand", scope: "Rebuild the Shopify theme for speed, add a bundle builder and fix checkout upsells.", valueUsd: 900, days: 21 },
  },
  {
    id: "nusrat",
    name: "Nusrat Jahan",
    city: "Chattogram",
    oneLine: "Nusrat Jahan (AI & UI/UX bootcamp grad) — Auditing Upwork Profile + $1,200 Cross-Border Payout",
    platform: "upwork",
    monthlyUsd: 1200,
    cv: `Nusrat Jahan
UI/UX designer and AI automation builder, Chattogram. Bootcamp graduate.

- Design in Figma: wireframes, prototyping and a design system for a fintech wallet app.
- Builds AI agents and automations with n8n, Make.com and the OpenAI API for lead handling.
- Set up a RAG chatbot over a client's help docs using LangChain.
- 2 years on Upwork, Top Rated, last month's payout $1,200.

Wants to move repeat clients to direct retainers.`,
    client: { name: "Arjun Mehta", country: "United Kingdom", type: "a London recruitment agency", scope: "Automate lead intake from forms into the CRM with an AI agent that scores and routes leads.", valueUsd: 1500, days: 25 },
  },
];
