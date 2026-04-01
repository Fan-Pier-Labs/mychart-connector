import { MyChartRequest } from "./myChartRequest";
import { getRequestVerificationTokenFromBody } from "./util";
import * as cheerio from 'cheerio';

export type CareTeamMember = {
  name: string;
  role: string;
  specialty: string;
}

export async function getCareTeam(mychartRequest: MyChartRequest): Promise<CareTeamMember[]> {
  const resp = await mychartRequest.makeRequest({ path: '/Clinical/CareTeam' });
  const html = await resp.text();
  const $ = cheerio.load(html);

  const members: CareTeamMember[] = [];

  // Try structured HTML selectors first (works for some instances and fake-mychart)
  $('.careteam-provider, .provider-card, [data-testid="care-team-member"]').each((_, el) => {
    const name = $(el).find('.provider-name, .name, h3, h4').first().text().trim();
    const role = $(el).find('.provider-role, .role').first().text().trim();
    const specialty = $(el).find('.provider-specialty, .specialty').first().text().trim();
    if (name) {
      members.push({ name, role, specialty });
    }
  });

  if (members.length > 0) return members;

  // Fallback: call the message recipients API which returns structured JSON.
  // Many instances (e.g. UCSF) render care team via client-side JS, so the HTML
  // above yields nothing. The recipients endpoint reliably returns providers.
  const token = getRequestVerificationTokenFromBody(html);
  if (token) {
    try {
      const apiResp = await mychartRequest.makeRequest({
        path: '/api/medicaladvicerequests/GetMedicalAdviceRequestRecipients',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          '__RequestVerificationToken': token,
        },
        body: JSON.stringify({ organizationId: '' }),
      });
      const text = await apiResp.text();
      const json = JSON.parse(text);

      // Different instances wrap the list differently
      const list: unknown[] = Array.isArray(json)
        ? json
        : (json?.recipients ?? json?.recipientList ?? json?.Providers ??
           json?.providers ?? json?.ProviderList ?? json?.providerList ?? []);

      for (const item of list) {
        const r = item as Record<string, unknown>;
        const name = String(r.displayName ?? r.DisplayName ?? r.name ?? r.Name ?? '').trim();
        if (!name) continue;
        members.push({
          name,
          role: String(r.pcpTypeDisplayName ?? r.PcpTypeDisplayName ?? r.role ?? r.Role ?? '').trim(),
          specialty: String(r.specialty ?? r.Specialty ?? '').trim(),
        });
      }
    } catch {
      // API not available on this instance — return empty
    }
  }

  return members;
}
