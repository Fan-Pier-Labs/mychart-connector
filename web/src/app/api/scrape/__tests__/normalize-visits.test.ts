import { describe, it, expect } from 'bun:test'

// We need to test the normalization functions from the route.
// Since they're not exported, we'll copy them here for testing.
// In a real refactor these would be in a shared module.

function normalizeVisit(raw: Record<string, unknown>): {
  Date: string;
  Time?: string;
  VisitTypeName: string;
  PrimaryProviderName?: string;
  PrimaryDepartment?: { Name: string };
  Location?: string;
} {
  if (typeof raw.VisitTypeName === 'string') {
    const deptAddr = (raw.PrimaryDepartment as { Address?: string[] })?.Address;
    const location = Array.isArray(deptAddr) ? deptAddr.filter(Boolean).join(', ') : undefined;
    return {
      Date: String(raw.Date ?? ''),
      Time: raw.Time != null ? String(raw.Time) : undefined,
      VisitTypeName: raw.VisitTypeName,
      PrimaryProviderName: typeof raw.PrimaryProviderName === 'string' ? raw.PrimaryProviderName : undefined,
      PrimaryDepartment: (raw.PrimaryDepartment as { Name?: string })?.Name
        ? { Name: String((raw.PrimaryDepartment as { Name: string }).Name) }
        : undefined,
      Location: location || undefined,
    };
  }

  const visitType = [raw.VisitType, raw.VisitTypeName, raw.Type, raw.type]
    .find(v => typeof v === 'string' && (v as string).trim());
  const dept = typeof raw.Department === 'string' ? (raw.Department as string).trim() : undefined;
  const loc = typeof raw.Location === 'string' ? (raw.Location as string).trim() : undefined;
  return {
    Date: String(raw.Date ?? ''),
    Time: raw.Time != null ? String(raw.Time) : undefined,
    VisitTypeName: (visitType as string) ?? 'Visit',
    PrimaryProviderName: String(raw.Physician ?? raw.Provider ?? raw.PrimaryProviderName ?? raw.provider ?? '').trim() || undefined,
    PrimaryDepartment: (dept || (raw.PrimaryDepartment as { Name?: string })?.Name)
      ? { Name: String(dept ?? (raw.PrimaryDepartment as { Name: string })?.Name ?? '') }
      : undefined,
    Location: loc || undefined,
  };
}

describe('normalizeVisit', () => {
  it('passes through standard Epic visit format', () => {
    const raw = {
      Date: '01/10/2026 09:00:00 AM',
      Time: '9:00 AM',
      VisitTypeName: 'Office Visit',
      PrimaryProviderName: 'Dr. Emily Chen',
      PrimaryDepartment: { Name: 'Internal Medicine', Id: '123', Address: ['123 Main St', 'Springfield'] },
      Csn: 'CSN-123',
      Providers: [{ Name: 'Dr. Emily Chen' }],
    };

    const result = normalizeVisit(raw);
    expect(result.Date).toBe('01/10/2026 09:00:00 AM');
    expect(result.Time).toBe('9:00 AM');
    expect(result.VisitTypeName).toBe('Office Visit');
    expect(result.PrimaryProviderName).toBe('Dr. Emily Chen');
    expect(result.PrimaryDepartment).toEqual({ Name: 'Internal Medicine' });
    expect(result.Location).toBe('123 Main St, Springfield');
  });

  it('normalizes UCLA-style {Patient, Physician, Department, Date, Time} format', () => {
    const raw = {
      Patient: 'John Doe',
      Physician: 'Dr. Smith',
      Department: 'Internal Medicine',
      Date: '03/15/2026',
      Time: '10:00 AM',
    };

    const result = normalizeVisit(raw);
    expect(result.Date).toBe('03/15/2026');
    expect(result.Time).toBe('10:00 AM');
    expect(result.VisitTypeName).toBe('Visit');
    expect(result.PrimaryProviderName).toBe('Dr. Smith');
    expect(result.PrimaryDepartment).toEqual({ Name: 'Internal Medicine' });
    expect(result.Location).toBeUndefined(); // No Location in this format
  });

  it('keeps Department and Location as separate fields', () => {
    const raw = {
      Date: '03/15/2026',
      Time: '10:00 AM',
      VisitType: 'Annual Physical',
      Provider: 'Dr. Jones',
      Department: 'Cardiology',
      Location: 'Springfield General Hospital, Suite 200',
    };

    const result = normalizeVisit(raw);
    expect(result.PrimaryDepartment).toEqual({ Name: 'Cardiology' });
    expect(result.Location).toBe('Springfield General Hospital, Suite 200');
  });

  it('normalizes format with VisitType instead of VisitTypeName', () => {
    const raw = {
      Date: '03/15/2026',
      Time: '10:00 AM',
      VisitType: 'Annual Physical',
      Provider: 'Dr. Jones',
      Location: 'Springfield General',
    };

    const result = normalizeVisit(raw);
    expect(result.VisitTypeName).toBe('Annual Physical');
    expect(result.PrimaryProviderName).toBe('Dr. Jones');
    expect(result.PrimaryDepartment).toBeUndefined(); // No Department provided
    expect(result.Location).toBe('Springfield General');
  });

  it('handles missing optional fields gracefully', () => {
    const raw = {
      Date: '03/15/2026',
    };

    const result = normalizeVisit(raw);
    expect(result.Date).toBe('03/15/2026');
    expect(result.Time).toBeUndefined();
    expect(result.VisitTypeName).toBe('Visit');
    expect(result.PrimaryProviderName).toBeUndefined();
    expect(result.PrimaryDepartment).toBeUndefined();
    expect(result.Location).toBeUndefined();
  });

  it('handles object values in fields by converting to strings', () => {
    const raw = {
      Date: { display: '03/15/2026' },
      VisitTypeName: { Name: 'Office Visit' },
    };

    const result = normalizeVisit(raw as unknown as Record<string, unknown>);
    expect(typeof result.Date).toBe('string');
    expect(result.VisitTypeName).toBe('Visit');
  });

  it('strips empty PrimaryProviderName', () => {
    const raw = {
      Date: '03/15/2026',
      Physician: '  ',
    };

    const result = normalizeVisit(raw);
    expect(result.PrimaryProviderName).toBeUndefined();
  });

  it('extracts Location from standard PrimaryDepartment.Address array', () => {
    const raw = {
      Date: '01/10/2026',
      VisitTypeName: 'Office Visit',
      PrimaryDepartment: { Name: 'Cardiology', Address: ['100 Hospital Dr', 'Building A', 'Floor 3'] },
    };

    const result = normalizeVisit(raw);
    expect(result.PrimaryDepartment).toEqual({ Name: 'Cardiology' });
    expect(result.Location).toBe('100 Hospital Dr, Building A, Floor 3');
  });
});
