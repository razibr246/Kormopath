# WP1 API: lib/legal (pure, import with relative .ts paths from tests, or @/lib/legal/<file> from app code)

Facts: every helpline/law the UI shows must come from data.ts (HELPLINES, LAWS, LEGAL_SOURCES, each with source {label,url,checked}). Never hardcode another number or law. Eligibility wording: ELIGIBILITY_NOTE_BN/EN; information disclaimer: NOT_LEGAL_ADVICE_BN/EN. Storage: usePersistentState(storageKey("legal","caseFiles"), [], sanitizeCaseFiles). Districts are keyed by English name (BD_DISTRICTS[i].en). Demo-only: DEMO_MANDATORY_DISTRICTS, consultationScript (role-play), lawyerTracker deadlines (design rules).

## data.ts
- L18 export const LEGAL_CHECKED = "2026-11-17";
- L20 export interface LegalSource 
- L28 export const NLASO_HOME = src("বাংলাদেশ আইনগত সহায়তা অধিদপ্তর (nlaso.gov.bd)", "https://nlaso.gov.bd/");
- L29 export const NLASO_HELPLINE_PAGE = src("আইনগত সহায়তা অধিদপ্তর — জাতীয় হেল্পলাইন ১৬৬৯৯", "https://nlaso.gov.bd/pages/static-pages/69ca4e8234fc363bf320ca55");
- L30 export const NLASO_LEGAL_AID_PAGE = src("আইনগত সহায়তা অধিদপ্তর — সরকারি খরচে আইনগত সহায়তা", "https://nlaso.gov.bd/pages/static-pages/6922dc72933eb65569e106d0");
- L31 export const NLASO_DISTRICT_OFFICES = src("আইনগত সহায়তা অধিদপ্তর — জেলা লিগ্যাল এইড অফিস", "https://nlaso.gov.bd/pages/officers?filters=%7B%22officer_category%22%3A%20%226922d29b81fc96cef9e99564%22%7D");
- L32 export const BDLAWS = src("Laws of Bangladesh (bdlaws.minlaw.gov.bd)", "http://bdlaws.minlaw.gov.bd/");
- L34 export type HelplineId = "legal_aid" | "emergency" | "women_children" | "govt_info" | "land";
- L36 export interface Helpline 
- L46 export const HELPLINES: readonly Helpline[] = [
- L79 export const helplineById = (id: HelplineId): Helpline => HELPLINES.find((h) => h.id === id)!;
- L81 export type LawId =
- L87 export interface Law 
- L100 export const LAWS: Readonly<Record<LawId, Law>> = 
- L122 export const LEGAL_SOURCES: readonly LegalSource[] = [NLASO_HOME, NLASO_HELPLINE_PAGE, NLASO_LEGAL_AID_PAGE, NLASO_DISTRICT_OFFICES, BDLAWS];
- L125 export const ELIGIBILITY_NOTE_BN = "এটি শুধু একটি প্রাথমিক ধারণা। আপনি সরকারি খরচে আইনি সহায়তা পেতে পারেন কি না, তা আপনার জেলা লিগ্যাল এইড অফিস ঠিক করবে। জানতে ১৬৬৯৯ নম্বরে ফোন করুন।";
- L126 export const ELIGIBILITY_NOTE_EN = "This is only a first idea. Whether you get government legal aid is decided by your district legal aid office. Call 16699 to ask.";
- L127 export const NOT_LEGAL_ADVICE_BN = "এটি আইনি তথ্য, আইনি পরামর্শ নয়। আপনার নিজের বিষয়ে সিদ্ধান্তের আগে আইনজীবী বা লিগ্যাল এইড অফিসের সঙ্গে কথা বলুন।";
- L128 export const NOT_LEGAL_ADVICE_EN = "This is legal information, not legal advice. Talk to a lawyer or your legal aid office before deciding anything about your own case.";

## caseFile.ts
- L14 export const MAX_CASE_FILES = 20;
- L15 export const MAX_TIMELINE = 200;
- L16 export const MAX_PROBLEM_CHARS = 2000;
- L17 export const MAX_NOTE_CHARS = 500;
- L20 export type CaseFileStatus = "draft" | "ready" | "contacted_helpline" | "visited_office" | "got_help" | "closed";
- L22 export const CASE_FILE_STATUS_LABELS: Record<CaseFileStatus, { bn: string; en: string }> = 
- L31 export type TimelineKind = "created" | "edited" | "status" | "note" | "document";
- L33 export interface TimelineEvent 
- L40 export interface ApplicantInfo 
- L49 export interface CaseFile 
- L64 export interface NewCaseFileInput 
- L84 export function validateNewCaseFile(input: NewCaseFileInput): string[] 
- L92 export function newCaseFile(input: NewCaseFileInput, id: string, nowIso: string): CaseFile 
- L118 export function appendEvent(file: CaseFile, event: TimelineEvent): CaseFile 
- L124 export function setStatus(file: CaseFile, status: CaseFileStatus, nowIso: string): CaseFile 
- L129 export function editCaseFile(file: CaseFile, patch: Partial<Pick<CaseFile, "problem" | "documents" | "districtId" | "subcategoryId">> & { applicant?: Partial<ApplicantInfo> }, nowIso: string): CaseFile 
- L151 export function sanitizeCaseFiles(raw: unknown): CaseFile[] | null 
- L192 export function applicationText(file: CaseFile): string 

## eligibility.ts
- L36 export type EligibilityStrength = "decisive" | "supporting" | "conditional";
- L38 export interface EligibilityGround 
- L48 export interface EligibilityDecision 
- L74 export interface ApplicantFacts 
- L97 export interface ActRef { bn: string; en: string; section: null; url: string | null; lawId: LawId | null }
- L160 export function assessLegalAidEligibility(facts: ApplicantFacts): EligibilityDecision 

## severity.ts
- L8 export type SeverityLevel = "emergency" | "high" | "priority" | "standard";
- L10 export interface SeverityClassification 
- L159 export const SEVERITY_RULES: SeverityRule[] = [
- L457 export const IMMEDIATE_CRISIS_CATEGORY = "Immediate Crisis & Safety";
- L459 export function isSensitiveClassification(result: 
- L507 export function tagForSelection(
- L569 export interface SeveritySelection 
- L574 export function classifySeverity(
- L648 export function getSeverityClassificationKnowledgeBlock(): string 
- L667 export function getSeverityFactorsMeaning(): Record<string, string> 
- L680 export function urgencyForSeverity(severity: SeverityLevel): string 
- L686 export function priorityForSeverity(severity: SeverityLevel): string 

## taxonomy.ts
- L23 export interface ProblemSubcategory 
- L29 export interface ProblemCategory 
- L40 export const OTHER_CATEGORY_ID = "other";
- L51 export const OTHER_SUBCATEGORY_ID = "other";
- L52 export const OTHER_SUBCATEGORY_BN = "অন্যান্য — নিজের সমস্যা লিখুন";
- L53 export const OTHER_SUBCATEGORY_EN = "Other — describe your own problem";
- L56 export function listSubcategoryOptions(
- L68 export function isOtherSubcategory(subcategoryId: string | null | undefined): boolean 
- L72 export const PROBLEM_CATEGORIES: ProblemCategory[] = [
- L266 export function getProblemCategory(id: string | null | undefined): ProblemCategory | null 
- L271 export function getProblemSubcategory(

## districts.ts
- L2 export interface District 
- L18 export const BD_DISTRICTS: District[] = [
- L91 export function extractDistrict(address: string): string | null 

## category.ts
- L7 export function inferLegalCategory(problem: string): string 

## caseDomain.ts
- L19 export const CASE_STATUSES = [
- L29 export type CaseStatus = (typeof CASE_STATUSES)[number];
- L32 export const TERMINAL_STATUSES: readonly CaseStatus[] = ["settled", "unresolved"];
- L34 export function isClosed(status: CaseStatus): boolean 
- L39 export const CITIZEN_STATUS_LABELS: Record<CaseStatus, { bn: string; en: string }> = 
- L57 export type CaseTrack = "district" | "appellate" | "labour" | "chowki";
- L59 export function trackForRole(role: string): CaseTrack 
- L67 export function trackSkipsMediation(track: CaseTrack): boolean 
- L74 export interface CaseFacts 
- L97 export type ActionKey = "advise" | "mediation" | "assignLawyer" | "referOut" | "requestPay" | "transfer";
- L99 export interface ActionVerdict 
- L107 export type CaseActionState = Record<ActionKey, ActionVerdict>;
- L117 export function caseActionState(facts: CaseFacts, mandatoryDistricts: readonly string[] = []): CaseActionState 
- L200 export function isCaseActionable(facts: CaseFacts, key: ActionKey, mandatory?: readonly string[]): boolean 
- L207 export interface SlaStageDefinition 
- L219 export const SLA_STAGES: SlaStageDefinition[] = [
- L233 export function slaStage(stage: SlaStageDefinition["stage"]): SlaStageDefinition 
- L239 export type SlaLevel = "ok" | "near" | "breach";
- L241 export interface SlaAssessment 
- L251 export function assessSla(
- L276 export function daysInStageTone(days: number, stage?: SlaStageDefinition["stage"]): SlaLevel 
- L290 export interface SlaCandidate 
- L298 export interface SlaLogEntry extends SlaCandidate 
- L305 export function slaScan(candidates: readonly SlaCandidate[], now: Date = new Date()): SlaLogEntry[] 
- L321 export interface SlaAlerts 
- L328 export function slaAlerts(log: readonly SlaLogEntry[], role?: "dlao" | "chief"): SlaAlerts 
- L340 export const DEFAULT_MANDATORY_DISTRICTS: readonly string[] = [];
- L342 export const DEMO_MANDATORY_DISTRICTS: readonly string[] = [
- L347 export function isMandatoryDistrict(code: string, list: readonly string[] = DEFAULT_MANDATORY_DISTRICTS): boolean 
- L355 export function caseIdFor(districtCode: string, year: number, serial: number): string 
- L359 export function applicationToCase(app: { appId: string; districtCode: string }, year = new Date().getFullYear()): string 
- L375 export function certificationState(

## audit.ts
- L17 export type AuditKind =
- L35 export interface AuditEntry 
- L51 export function createAuditEntry(
- L67 export type Channel = "sms" | "voice" | "portal" | "rep";
- L68 export type SendRule = "allow" | "window" | "block";
- L70 export interface SafeContactDestination 
- L80 export interface SafeContactProfile 
- L91 export interface SendDecision 
- L105 export function decideSend(
- L130 export function sensitiveOpenNotice(actorName: string, caseId: string): { en: string; bn: string } 
- L138 export function assistVerdict(level: "high" | "normal"): { level: "high" | "normal"; ranksOnly: true } 

## mediation.ts
- L34 export type MediationOutcome = "scheduled" | "settled" | "failed";
- L37 export const MEDIATION_WEEKDAYS = [
- L45 export type WorkdayCode = (typeof MEDIATION_WEEKDAYS)[number]["code"];
- L106 export function weekStart(date: Date): Date 
- L112 export function workdaysOfWeek(date: Date): Date[] 
- L117 export function addDays(date: Date, days: number): Date 
- L121 export function sameDay(a: Date, b: Date): boolean 
- L134 export function toDateKey(date: Date): string 
- L140 export function fromDateKey(key: string): Date 
- L154 export function isWorkday(date: Date): boolean 
- L162 export function weekdayBn(date: Date): string 
- L168 export function bdDayOfMonth(date: Date): number 
- L181 export function weekdayBnShort(date: Date): string 
- L187 export function bdMonthOfYear(date: Date): number 
- L192 export function bdTimeBn(date: Date): string 
- L200 export function isDateKey(value: string): boolean 
- L206 export function formatBn(date: Date, withWeekday = true): string 
- L224 export interface MediationCaseRow 
- L252 export function trackForCase(row: Pick<MediationCaseRow, "category" | "problem_category">): CaseTrack 
- L295 export function caseFactsFromCase(row: MediationCaseRow): CaseFacts 
- L324 export function bookingVerdict(
- L332 export interface ActionVerdictLite 
- L339 export function validateBookingDate(
- L357 export const OUTCOME_LABELS: Record<MediationOutcome, { bn: string; en: string }> = 

## settlement.ts
- L29 export type ClauseSource =
- L41 export interface SettlementClause 
- L57 export interface SettlementDraftInput 
- L72 export interface SettlementDraft 
- L97 export function draftSettlement(input: SettlementDraftInput): SettlementDraft 
- L222 export function renderSettlementText(draft: SettlementDraft): string 

## safeWindow.ts
- L23 export interface SafeWindowRow 
- L33 export interface SafeWindow 
- L61 export function parseHhMm(value: string | null | undefined): number | null 
- L85 export function readWindow(row: SafeWindowRow | null | undefined): SafeWindow | null 
- L106 export function describeWindow(startMin: number, endMin: number, days: number[]): string 
- L117 export interface WindowStatus 
- L144 export function windowStatus(window: SafeWindow, now: Date = new Date()): WindowStatus 
- L203 export function bdDateTimeString(date: Date): string 
- L209 export function bdDateString(date: Date): string 
- L215 export function bdTimeBn(date: Date): string 
- L220 export function bdDayTimeBn(date: Date): string 

## lawyerTracker.ts
- L16 export type LawyerActionCode =
- L25 export type LawyerTrack = "all" | "court" | "mediation";
- L27 export interface LawyerAction 
- L35 export const LAWYER_ACTION_PLAN: readonly LawyerAction[] = [
- L45 export type ActionState = "done" | "due_soon" | "overdue" | "pending" | "na";
- L47 export interface TrackedAction 
- L63 export const DUE_SOON_DAYS = 3;
- L69 export function actionsForTrack(track: LawyerTrack): LawyerAction[] 
- L74 export function deadlineFrom(from: string | Date, days: number): string 
- L79 export interface TrackedActionInput 
- L91 export function gradeAction(
- L142 export interface TrackerSummary 
- L155 export function summariseTracker(actions: TrackedAction[], assignedAt: string, now: Date = new Date()): TrackerSummary 
- L183 export function describeTracker(summary: TrackerSummary): string 

## consultationScript.ts
- L34 export type ConsultationPhase =
- L44 export type TurnSpeaker = "dlao" | "applicant" | "system";
- L46 export interface ConsultationTurn 
- L60 export interface ConsultationScript 
- L72 export interface ConsultationInput 
- L96 export function consultationPhaseLabel(phase: ConsultationPhase): string 
- L103 export function toBanglaDigits(input: string): string 
- L108 export function buildConsultationScript(input: ConsultationInput): ConsultationScript 

## phone.ts
- L2 export type BangladeshOperator = "Grameenphone" | "Robi" | "Banglalink" | "Airtel" | "Robi/Airtel" | "Unknown";
- L4 export interface PhoneValidationResult 
- L21 export function normalizeBengaliDigits(input: string): string 
- L25 export function extractPhoneDigits(input: string): string 
- L29 export function appendPhoneDigits(current: string, input: string): string 
- L33 export function normalizeBangladeshPhone(input: string): string 
- L39 export function getBangladeshOperator(phone: string): BangladeshOperator | null 
- L45 export function generateRandomBangladeshPhone(): string 
- L56 export function validateBangladeshPhone(input: string): PhoneValidationResult 

