import type { Skill } from "./types";

const BILL_ITEMIZATION: Skill = {
  id: "bill_itemization",
  title: "Find bills to itemize",
  description: "Surface medical bills that don't yet have an itemized statement, then offer to request one.",
  icon: "$",
  kickoffMessage:
    "Find any historical bills I haven't already requested an itemized statement for, then offer to send those requests for me.",
  playbook: [
    "[Skill: Find bills to itemize]",
    "Goal: identify medical bills the patient has NOT yet requested an itemized statement for, and offer to send those requests through MyChart.",
    "",
    "Step 1. Call get_billing to list historical bills (with amounts and dates).",
    "Step 2. Call get_messages to read prior conversations with the billing department / patient accounts.",
    "Step 3. For each bill, decide whether the patient already asked for an itemized statement. Look in the messages for phrases like \"itemized\", \"itemization\", \"itemized bill\", \"detailed statement\", \"line-item\", or anything functionally equivalent. If a message references a bill (by date or amount) and asks for an itemized version, treat that bill as already requested.",
    "Step 4. Build the candidate list: bills with NO matching itemized request. Sort by amount descending. Skip bills under $25 and bills older than 24 months unless the patient explicitly asks for them.",
    "Step 5. Present the candidate list to the patient. For each one, draft a short, polite message to the billing department requesting an itemized statement (include the bill date and amount). Also surface get_message_recipients so you have a real billing recipient to send to — pick the one that looks like billing (\"Billing\", \"Patient Accounts\", \"Customer Service\").",
    "Step 6. Ask the patient to confirm which to send. They can reply with \"all\", a specific number, or skip. Confirm BEFORE every send_message call.",
    "Step 7. Send each confirmed request with send_message. After each successful send, summarize what went out.",
    "",
    "Be efficient with tool calls — don't re-fetch billing or messages mid-skill unless something changed.",
    "If the patient has zero bills or zero billing-recipient options, say so plainly and stop.",
  ].join("\n"),
};

const ANALYZE_HISTORY: Skill = {
  id: "analyze_history",
  title: "Analyze medical history",
  description: "Look across labs, conditions, and history for patterns worth discussing with your doctor.",
  icon: "✦",
  kickoffMessage:
    "Look across my medical records and surface anything I should consider discussing with my doctor — recurring out-of-range labs, missing routine screenings, or risk patterns I might not have noticed.",
  playbook: [
    "[Skill: Analyze medical history]",
    "Goal: review the patient's records and surface patterns worth bringing up with their care team.",
    "",
    "Hard rule: you are NOT a doctor. Do NOT diagnose, prescribe, or recommend specific treatments. Frame every observation as something to consider asking the care team about. Use language like \"worth asking about\", \"consider mentioning at your next visit\", or \"this might be worth follow-up\".",
    "",
    "Step 1. Pull data: get_health_summary, get_health_issues, get_medications, get_allergies, get_lab_results, get_imaging_results, get_vitals, get_immunizations, get_preventive_care, get_medical_history. You can call these in any order; if one returns nothing useful, skip it.",
    "Step 2. Look for patterns the patient might not be aware of, such as:",
    "  - Lab values that are repeatedly out of range across multiple draws (the trend matters more than a single result).",
    "  - Combinations that suggest a screening worth asking about (e.g. persistently elevated ferritin/iron over multiple draws → genetic iron-overload screening like HFE testing is something to ask the care team about).",
    "  - Routine preventive care that appears overdue based on age/sex/risk and the user's preventive-care list.",
    "  - Medication patterns worth a check-in (long-term meds without a recent prescriber visit, drugs with monitoring needs).",
    "Step 3. Produce a prioritized list. For each item include:",
    "  - What you saw (cite specific lab names, dates, values where relevant)",
    "  - Why it might matter (one sentence)",
    "  - A specific question the patient could ask their doctor",
    "Step 4. Cap the list at the 5 most useful items. Better fewer strong suggestions than a long list of weak ones.",
    "Step 5. Close with: \"These are conversation starters, not diagnoses — your care team has the full picture.\"",
    "",
    "If the records are too sparse to find anything, say so plainly. Don't fabricate observations.",
  ].join("\n"),
};

const RECOMMEND_INSURANCE: Skill = {
  id: "recommend_insurance",
  title: "Recommend an insurance fit",
  description: "Estimate your medical spend pattern and suggest what kind of plan profile likely fits going forward.",
  icon: "⛨",
  kickoffMessage:
    "Based on my historic billing and ongoing care, what kind of insurance plan profile (HDHP, PPO, etc.) would likely fit me going forward? I'm trying to pick a plan at open enrollment.",
  playbook: [
    "[Skill: Recommend an insurance fit]",
    "Goal: estimate the patient's annual medical spend pattern and suggest what kind of plan profile likely fits going forward — not a specific plan, since you don't have access to the actual plans on offer.",
    "",
    "Hard rule: you are NOT an insurance advisor. Be explicit that this is a rough fit assessment based only on past MyChart bills and current care, and that they need to compare actual plans + premiums + networks at open enrollment.",
    "",
    "Step 1. Pull data: get_billing (as much history as available), get_medications, get_upcoming_visits, get_referrals, get_health_issues, get_insurance (current plan if it's there).",
    "Step 2. Estimate annual spend pattern from the past 12–24 months:",
    "  - Total billed",
    "  - Patient responsibility (what the patient actually paid out of pocket, if visible)",
    "  - Frequency: visits per year, imaging studies, labs, ER/urgent care, specialist visits",
    "  - Recurring prescription costs (long-term meds visible in medications)",
    "  - Any known upcoming care (referrals, scheduled imaging, surgery prep)",
    "Step 3. Categorize utilization roughly: low (mostly preventive), moderate (a few specialist visits + some labs/imaging), high (chronic conditions, frequent visits, ongoing imaging, expensive meds).",
    "Step 4. Suggest plan profiles that tend to fit:",
    "  - LOW utilization → HDHP + HSA tends to win on total cost; preventive is covered pre-deductible. Good if cash flow can absorb a rare big bill.",
    "  - MODERATE utilization → PPO with copays often beats HDHP once you're hitting copays/specialist visits regularly. Worth modeling both.",
    "  - HIGH utilization → low-deductible / high-premium plans often win because you'll hit the deductible and out-of-pocket max early; lower premium plans can lose to large gross costs.",
    "  - Specialty-care or specific-network needs → emphasize network width over deductible math.",
    "Step 5. Present the assessment in this shape:",
    "  - One paragraph: estimated utilization category + the numbers behind it.",
    "  - 1–2 plan profiles that tend to fit, with one-sentence reasoning each.",
    "  - 2–3 specific things to look at when comparing actual plans (deductible, OOP max, specialist copay, in-network of their care team, prescription tier coverage).",
    "Step 6. Close with: \"This is a rough fit based on past records. Compare the actual plans, premiums, and networks at open enrollment before deciding.\"",
    "",
    "If billing history is too thin to estimate utilization, say so and stop — don't guess.",
  ].join("\n"),
};

export const SKILLS: Skill[] = [
  BILL_ITEMIZATION,
  ANALYZE_HISTORY,
  RECOMMEND_INSURANCE,
];

export function getSkillById(id: string): Skill | undefined {
  return SKILLS.find((s) => s.id === id);
}
