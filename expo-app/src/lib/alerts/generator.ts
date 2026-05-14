import { executeScraperTool } from "@/lib/scrapers/session-manager";
import { upsertAlerts, type AlertInput } from "@/lib/storage/database";
import type { BillingAccount } from "../../../../scrapers/myChart/bills/types";
import type { MedicationsResult, Medication } from "../../../../scrapers/myChart/medications";
import type { LabTestResultWithHistory } from "../../../../scrapers/myChart/labs_and_procedure_results/labtestresulttype";

let inFlight: Promise<{ added: number; skipped: number }> | null = null;

export async function regenerateAlerts(hostname?: string): Promise<{ added: number; skipped: number }> {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    const inputs: AlertInput[] = [];
    try {
      const bills = (await executeScraperTool("get_billing", hostname ? { instance: hostname } : {})) as BillingAccount[];
      inputs.push(...buildBillAlerts(bills, hostname));
    } catch (err) {
      console.warn("[alerts] get_billing failed:", (err as Error).message);
    }
    try {
      const meds = (await executeScraperTool("get_medications", hostname ? { instance: hostname } : {})) as MedicationsResult;
      inputs.push(...buildRefillAlerts(meds.medications, hostname));
    } catch (err) {
      console.warn("[alerts] get_medications failed:", (err as Error).message);
    }
    try {
      const labs = (await executeScraperTool("get_lab_results", hostname ? { instance: hostname } : {})) as LabTestResultWithHistory[];
      inputs.push(...buildLabAlerts(labs));
    } catch (err) {
      console.warn("[alerts] get_lab_results failed:", (err as Error).message);
    }
    return upsertAlerts(inputs);
  })();
  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}

function buildBillAlerts(accounts: BillingAccount[], hostname?: string): AlertInput[] {
  const out: AlertInput[] = [];
  for (const acct of accounts) {
    const data = acct.billingDetails?.Data;
    const visits = [
      ...(data?.UnifiedVisitList ?? []),
      ...(data?.InformationalVisitList ?? []),
    ];
    const payUrl = data?.URLMakePayment;
    for (const v of visits) {
      if (!v.SelfAmountDueRaw || v.SelfAmountDueRaw <= 0) continue;
      const amount = v.SelfAmountDue ?? `$${v.SelfAmountDueRaw.toFixed(2)}`;
      const service = v.Description?.trim() || "Medical visit";
      const date = v.StartDateDisplay?.trim();
      const description = date ? `${amount} for ${service} — ${date}` : `${amount} for ${service}`;
      const fullPayUrl = payUrl ? toAbsoluteUrl(payUrl, hostname ?? acct.guarantorNumber) : null;
      out.push({
        type: "bill",
        title: "Outstanding bill",
        description,
        metadata: {
          amount,
          amount_cents: Math.round(v.SelfAmountDueRaw * 100),
          service,
          service_date: date ?? null,
          patient: acct.patientName,
        },
        cta_label: "Pay bill",
        uses_ai: false,
        action_kind: fullPayUrl ? "open_url" : "ai_chat",
        action_payload: fullPayUrl
          ? { url: fullPayUrl }
          : { prompt: `Help me pay my bill for ${service} (${amount}).` },
        dedup_key: `bill:${acct.guarantorNumber}:${v.HospitalAccountId ?? v.Index}`,
      });
    }
  }
  return out;
}

function buildRefillAlerts(meds: Medication[], hostname?: string): AlertInput[] {
  const out: AlertInput[] = [];
  for (const m of meds) {
    if (!m.isRefillable) continue;
    const drug = m.commonName?.trim() || m.name.trim();
    const dose = m.sig?.trim();
    const lastFilled = m.dateToDisplay?.trim();
    const daySupply = m.refillDetails?.daySupply?.trim();
    const parts: string[] = [];
    if (dose) parts.push(dose);
    if (daySupply) parts.push(`${daySupply}-day supply`);
    if (lastFilled) parts.push(`last filled ${lastFilled}`);
    const description = parts.length > 0 ? parts.join(" · ") : "Refillable prescription";
    out.push({
      type: "refill",
      title: drug,
      description,
      metadata: {
        medication_name: m.name,
        common_name: m.commonName,
        sig: m.sig,
        last_filled: lastFilled ?? null,
        day_supply: daySupply ?? null,
        prescriber: m.authorizingProviderName ?? m.orderingProviderName ?? null,
      },
      cta_label: "Request refill",
      uses_ai: false,
      action_kind: "request_refill",
      action_payload: { medication_name: m.name, instance: hostname },
      dedup_key: `refill:${m.medicationKey ?? m.name}`,
    });
  }
  return out;
}

function buildLabAlerts(tests: LabTestResultWithHistory[]): AlertInput[] {
  const out: AlertInput[] = [];
  for (const test of tests) {
    for (const r of test.results ?? []) {
      if (!r.isAbnormal) continue;
      const flagged = (r.resultComponents ?? []).filter((c) => {
        const v = c.componentResultInfo?.abnormalFlagCategoryValue;
        return v !== undefined && v !== null && v !== "" && v !== 0;
      });
      const summary = flagged.slice(0, 2).map((c) => {
        const name = c.componentInfo?.commonName || c.componentInfo?.name || "Component";
        const value = c.componentResultInfo?.value ?? "";
        const units = c.componentInfo?.units ?? "";
        return `${name}: ${value}${units ? ` ${units}` : ""}`;
      });
      const date = r.orderMetadata?.resultTimestampDisplay?.trim();
      const description = [summary.join(", "), date ? `(${date})` : null]
        .filter(Boolean)
        .join(" ") || "Abnormal lab result";
      out.push({
        type: "lab",
        title: `Abnormal: ${r.name || test.orderName}`,
        description,
        metadata: {
          test_name: r.name || test.orderName,
          date: date ?? null,
          provider: r.orderMetadata?.orderProviderName ?? null,
          flagged: flagged.map((c) => ({
            name: c.componentInfo?.commonName || c.componentInfo?.name,
            value: c.componentResultInfo?.value,
            range: c.componentResultInfo?.referenceRange?.formattedReferenceRange,
          })),
        },
        cta_label: "Discuss",
        uses_ai: true,
        action_kind: "ai_chat",
        action_payload: {
          prompt: `My recent ${r.name || test.orderName} result came back abnormal${date ? ` on ${date}` : ""}: ${summary.join(", ")}. What does this mean and should I be concerned?`,
        },
        dedup_key: `lab:${r.key || r.name}`,
      });
    }
  }
  return out;
}

function toAbsoluteUrl(maybeRelative: string, hostname: string): string {
  if (/^https?:\/\//i.test(maybeRelative)) return maybeRelative;
  const base = hostname.startsWith("http") ? hostname : `https://${hostname}`;
  const path = maybeRelative.startsWith("/") ? maybeRelative : `/${maybeRelative}`;
  return `${base}${path}`;
}
