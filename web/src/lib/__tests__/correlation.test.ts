import { describe, it, expect } from 'bun:test'
import {
  normaliseDate,
  normaliseProvider,
  providersMatch,
  correlateEvents,
} from '../correlation'

describe('normaliseDate', () => {
  it('parses ISO dates', () => {
    expect(normaliseDate('2026-01-15')).toBe('2026-01-15')
    expect(normaliseDate('2026-01-15T10:30:00Z')).toBe('2026-01-15')
  })

  it('parses US dates MM/DD/YYYY', () => {
    expect(normaliseDate('01/10/2026')).toBe('2026-01-10')
    expect(normaliseDate('12/20/2025')).toBe('2025-12-20')
  })

  it('parses US dates with time', () => {
    expect(normaliseDate('02/28/2026 8:30 AM')).toBe('2026-02-28')
    expect(normaliseDate('01/10/2026 9:15 AM')).toBe('2026-01-10')
  })

  it('handles single-digit month/day', () => {
    expect(normaliseDate('1/5/2026')).toBe('2026-01-05')
  })

  it('returns null for empty/null/undefined', () => {
    expect(normaliseDate(null)).toBeNull()
    expect(normaliseDate(undefined)).toBeNull()
    expect(normaliseDate('')).toBeNull()
  })

  it('returns null for unparseable strings', () => {
    expect(normaliseDate('not a date')).toBeNull()
  })
})

describe('normaliseProvider', () => {
  it('strips Dr. prefix', () => {
    expect(normaliseProvider('Dr. Emily Chen')).toBe('emily chen')
  })

  it('strips MD suffix', () => {
    expect(normaliseProvider('Emily Chen, MD')).toBe('emily chen')
  })

  it('strips multiple titles', () => {
    expect(normaliseProvider('Dr. Emily Chen, MD, PhD')).toBe('emily chen')
  })

  it('handles NP, DO, PA', () => {
    expect(normaliseProvider('Maria Santos, NP')).toBe('maria santos')
    expect(normaliseProvider('Dr. John Doe, DO')).toBe('john doe')
  })

  it('returns empty for null/undefined', () => {
    expect(normaliseProvider(null)).toBe('')
    expect(normaliseProvider(undefined)).toBe('')
  })
})

describe('providersMatch', () => {
  it('matches identical names', () => {
    expect(providersMatch('Dr. Emily Chen', 'Dr. Emily Chen')).toBe(true)
  })

  it('matches across title differences', () => {
    expect(providersMatch('Dr. Emily Chen', 'Emily Chen, MD')).toBe(true)
  })

  it('matches with partial names (substring)', () => {
    expect(providersMatch('Dr. Emily Chen', 'Emily Chen')).toBe(true)
  })

  it('does not match different providers', () => {
    expect(providersMatch('Dr. Emily Chen', 'Dr. James Park')).toBe(false)
  })

  it('returns false when both are empty/null', () => {
    expect(providersMatch(null, null)).toBe(false)
    expect(providersMatch('', '')).toBe(false)
  })
})

describe('correlateEvents', () => {
  it('returns empty array for empty data', () => {
    expect(correlateEvents({})).toEqual([])
    expect(correlateEvents(null)).toEqual([])
    expect(correlateEvents(undefined)).toEqual([])
  })

  it('groups a visit and bill on the same date with the same provider', () => {
    const data = {
      pastVisits: {
        List: {
          org1: {
            List: [
              { Date: '01/10/2026', VisitTypeName: 'Office Visit', PrimaryProviderName: 'Dr. Emily Chen', PrimaryDepartment: { Name: 'BMG' } },
            ],
          },
        },
      },
      billing: [
        {
          billingDetails: {
            Data: {
              UnifiedVisitList: [
                { StartDateDisplay: '01/10/2026', Description: 'Office Visit', Provider: 'Dr. Emily Chen', SelfAmountDue: '$25.00' },
              ],
              InformationalVisitList: [],
            },
          },
        },
      ],
    }

    const groups = correlateEvents(data as ScrapeResults)
    expect(groups.length).toBe(1)
    expect(groups[0].date).toBe('2026-01-10')
    expect(groups[0].events.length).toBe(2)
    expect(groups[0].events.map(e => e.category)).toContain('visit')
    expect(groups[0].events.map(e => e.category)).toContain('bill')
  })

  it('groups a visit, bill, and lab on the same date', () => {
    const data = {
      pastVisits: {
        List: {
          org1: {
            List: [
              { Date: '01/10/2026', VisitTypeName: 'Office Visit', PrimaryProviderName: 'Dr. Emily Chen' },
            ],
          },
        },
      },
      billing: [
        {
          billingDetails: {
            Data: {
              UnifiedVisitList: [
                { StartDateDisplay: '01/10/2026', Description: 'Office Visit', Provider: 'Dr. Emily Chen' },
              ],
              InformationalVisitList: [],
            },
          },
        },
      ],
      labResults: [
        {
          orderName: 'CBC',
          results: [
            { orderMetadata: { resultTimestampDisplay: '01/10/2026 9:15 AM', orderProviderName: 'Dr. Emily Chen' } },
          ],
        },
      ],
    }

    const groups = correlateEvents(data as ScrapeResults)
    expect(groups.length).toBe(1)
    expect(groups[0].events.length).toBe(3)
    const categories = groups[0].events.map(e => e.category)
    expect(categories).toContain('visit')
    expect(categories).toContain('bill')
    expect(categories).toContain('lab')
  })

  it('does not group events on different dates with different providers', () => {
    const data = {
      pastVisits: {
        List: {
          org1: {
            List: [
              { Date: '01/10/2026', VisitTypeName: 'Office Visit', PrimaryProviderName: 'Dr. Emily Chen' },
              { Date: '12/20/2025', VisitTypeName: 'Cardiology', PrimaryProviderName: 'Dr. James Park' },
            ],
          },
        },
      },
      billing: [
        {
          billingDetails: {
            Data: {
              UnifiedVisitList: [
                { StartDateDisplay: '01/10/2026', Description: 'Office Visit', Provider: 'Dr. Emily Chen' },
                { StartDateDisplay: '12/20/2025', Description: 'Cardiology', Provider: 'Dr. James Park' },
              ],
              InformationalVisitList: [],
            },
          },
        },
      ],
    }

    const groups = correlateEvents(data as ScrapeResults)
    expect(groups.length).toBe(2)
    // Each group should have 2 events (visit + bill)
    for (const g of groups) {
      expect(g.events.length).toBe(2)
    }
  })

  it('merges a letter within 5 days of a visit by the same provider', () => {
    const data = {
      pastVisits: {
        List: {
          org1: {
            List: [
              { Date: '01/10/2026', VisitTypeName: 'Office Visit', PrimaryProviderName: 'Dr. Emily Chen' },
            ],
          },
        },
      },
      billing: [
        {
          billingDetails: {
            Data: {
              UnifiedVisitList: [
                { StartDateDisplay: '01/10/2026', Description: 'Office Visit', Provider: 'Dr. Emily Chen' },
              ],
              InformationalVisitList: [],
            },
          },
        },
      ],
      letters: [
        { dateISO: '2026-01-15', reason: 'Annual Physical Results', providerName: 'Dr. Emily Chen' },
      ],
    }

    const groups = correlateEvents(data as ScrapeResults)
    // The letter should be merged into the visit group
    expect(groups.length).toBe(1)
    expect(groups[0].events.length).toBe(3)
    expect(groups[0].events.map(e => e.category)).toContain('letter')
  })

  it('does NOT merge a letter more than 5 days from any visit', () => {
    const data = {
      pastVisits: {
        List: {
          org1: {
            List: [
              { Date: '01/10/2026', VisitTypeName: 'Office Visit', PrimaryProviderName: 'Dr. Emily Chen' },
            ],
          },
        },
      },
      billing: [
        {
          billingDetails: {
            Data: {
              UnifiedVisitList: [
                { StartDateDisplay: '01/10/2026', Description: 'Office Visit', Provider: 'Dr. Emily Chen' },
              ],
              InformationalVisitList: [],
            },
          },
        },
      ],
      letters: [
        { dateISO: '2026-02-10', reason: 'Lab Results Discussion', providerName: 'Dr. Emily Chen' },
      ],
    }

    const groups = correlateEvents(data as ScrapeResults)
    // Visit+bill in one group, letter is a singleton (filtered out since <2 events)
    expect(groups.length).toBe(1)
    expect(groups[0].events.length).toBe(2) // just visit+bill
  })

  it('fuzzy-merges a bill within 5 days of a visit by the same provider', () => {
    const data = {
      pastVisits: {
        List: {
          org1: {
            List: [
              { Date: '12/16/2019', VisitTypeName: 'Office Visit', PrimaryProviderName: 'Dr. Robert Atkind' },
            ],
          },
        },
      },
      billing: [
        {
          billingDetails: {
            Data: {
              UnifiedVisitList: [
                { StartDateDisplay: '12/16/2019', Description: 'Office Visit', Provider: 'Dr. Robert Atkind', SelfAmountDue: '$389.00' },
                { StartDateDisplay: '12/12/2019', Description: 'LAB', Provider: 'Dr. Robert Atkind', SelfAmountDue: '$67.00' },
              ],
              InformationalVisitList: [],
            },
          },
        },
      ],
    }

    const groups = correlateEvents(data as ScrapeResults)
    // The 12/12 bill should fuzzy-merge into the 12/16 visit group
    expect(groups.length).toBe(1)
    expect(groups[0].date).toBe('2019-12-16')
    expect(groups[0].events.length).toBe(3) // visit + same-day bill + fuzzy-merged bill
    expect(groups[0].events.filter(e => e.category === 'bill').length).toBe(2)
  })

  it('filters out singleton groups (events with no correlations)', () => {
    const data = {
      labResults: [
        {
          orderName: 'Lipid Panel',
          results: [
            { orderMetadata: { resultTimestampDisplay: '06/15/2025', orderProviderName: 'Dr. Nobody' } },
          ],
        },
      ],
    }

    const groups = correlateEvents(data as ScrapeResults)
    expect(groups.length).toBe(0) // Single event, no correlation
  })

  it('sorts groups by date descending', () => {
    const data = {
      pastVisits: {
        List: {
          org1: {
            List: [
              { Date: '01/10/2026', VisitTypeName: 'Visit A', PrimaryProviderName: 'Dr. A' },
              { Date: '12/20/2025', VisitTypeName: 'Visit B', PrimaryProviderName: 'Dr. B' },
            ],
          },
        },
      },
      billing: [
        {
          billingDetails: {
            Data: {
              UnifiedVisitList: [
                { StartDateDisplay: '01/10/2026', Description: 'Bill A', Provider: 'Dr. A' },
                { StartDateDisplay: '12/20/2025', Description: 'Bill B', Provider: 'Dr. B' },
              ],
              InformationalVisitList: [],
            },
          },
        },
      ],
    }

    const groups = correlateEvents(data as ScrapeResults)
    expect(groups.length).toBe(2)
    expect(groups[0].date).toBe('2026-01-10')
    expect(groups[1].date).toBe('2025-12-20')
  })

  it('sorts events within a group by category order', () => {
    const data = {
      pastVisits: {
        List: {
          org1: {
            List: [
              { Date: '01/10/2026', VisitTypeName: 'Office Visit', PrimaryProviderName: 'Dr. Chen' },
            ],
          },
        },
      },
      billing: [
        {
          billingDetails: {
            Data: {
              UnifiedVisitList: [
                { StartDateDisplay: '01/10/2026', Description: 'Bill', Provider: 'Dr. Chen' },
              ],
              InformationalVisitList: [],
            },
          },
        },
      ],
      labResults: [
        {
          orderName: 'CBC',
          results: [
            { orderMetadata: { resultTimestampDisplay: '01/10/2026', orderProviderName: 'Dr. Chen' } },
          ],
        },
      ],
      documents: [
        { title: 'AVS', documentType: 'AVS', date: '01/10/2026', providerName: 'Dr. Chen', organizationName: 'BMG' },
      ],
    }

    const groups = correlateEvents(data as ScrapeResults)
    expect(groups.length).toBe(1)
    const cats = groups[0].events.map(e => e.category)
    // visit < lab < bill < document
    expect(cats.indexOf('visit')).toBeLessThan(cats.indexOf('lab'))
    expect(cats.indexOf('lab')).toBeLessThan(cats.indexOf('bill'))
    expect(cats.indexOf('bill')).toBeLessThan(cats.indexOf('document'))
  })

  it('groups imaging results with matching bills', () => {
    const data = {
      billing: [
        {
          billingDetails: {
            Data: {
              UnifiedVisitList: [],
              InformationalVisitList: [
                { StartDateDisplay: '11/15/2025', Description: 'Chest X-Ray', Provider: 'Dr. James Park', SelfAmountDue: '$50.50' },
              ],
            },
          },
        },
      ],
      imagingResults: [
        { orderName: 'Chest X-Ray (PA and Lateral)', resultDate: '11/15/2025', orderProvider: 'Dr. James Park' },
      ],
    }

    const groups = correlateEvents(data as ScrapeResults)
    expect(groups.length).toBe(1)
    expect(groups[0].events.length).toBe(2)
    const cats = groups[0].events.map(e => e.category)
    expect(cats).toContain('imaging')
    expect(cats).toContain('bill')
  })

  it('handles the full demo data shape', () => {
    // Minimal version of demoData to test the full pipeline
    const data = {
      pastVisits: {
        List: {
          org1: {
            List: [
              { Date: '01/10/2026', VisitTypeName: 'Office Visit', PrimaryProviderName: 'Dr. Emily Chen', PrimaryDepartment: { Name: 'BMG' } },
              { Date: '12/20/2025', VisitTypeName: 'Cardiology Consultation', PrimaryProviderName: 'Dr. James Park', PrimaryDepartment: { Name: 'BHC' } },
              { Date: '11/15/2025', VisitTypeName: 'Imaging', PrimaryProviderName: 'Dr. James Park', PrimaryDepartment: { Name: 'BIC' } },
            ],
          },
        },
      },
      billing: [
        {
          billingDetails: {
            Data: {
              UnifiedVisitList: [
                { StartDateDisplay: '01/10/2026', Description: 'Office Visit - Annual Physical', Provider: 'Dr. Emily Chen' },
                { StartDateDisplay: '12/20/2025', Description: 'Cardiology Consultation', Provider: 'Dr. James Park' },
              ],
              InformationalVisitList: [
                { StartDateDisplay: '11/15/2025', Description: 'Chest X-Ray', Provider: 'Dr. James Park' },
              ],
            },
          },
        },
      ],
      labResults: [
        {
          orderName: 'CBC',
          results: [{ orderMetadata: { resultTimestampDisplay: '01/10/2026 9:15 AM', orderProviderName: 'Dr. Emily Chen' } }],
        },
      ],
      imagingResults: [
        { orderName: 'Chest X-Ray', resultDate: '11/15/2025', orderProvider: 'Dr. James Park' },
      ],
      letters: [
        { dateISO: '2026-01-15', reason: 'Annual Physical Results', providerName: 'Dr. Emily Chen' },
      ],
      documents: [
        { title: 'After Visit Summary', documentType: 'AVS', date: '01/10/2026', providerName: 'Dr. Emily Chen', organizationName: 'BMG' },
        { title: 'Cardiology Note', documentType: 'Clinical Note', date: '12/20/2025', providerName: 'Dr. James Park', organizationName: 'BHC' },
      ],
    }

    const groups = correlateEvents(data as ScrapeResults)
    expect(groups.length).toBeGreaterThanOrEqual(3)

    // Check the 01/10/2026 group has visit + bill + lab + document + letter (fuzzy merged)
    const janGroup = groups.find(g => g.date === '2026-01-10')
    expect(janGroup).toBeDefined()
    const janCats = janGroup!.events.map(e => e.category)
    expect(janCats).toContain('visit')
    expect(janCats).toContain('bill')
    expect(janCats).toContain('lab')
    expect(janCats).toContain('document')
    expect(janCats).toContain('letter') // fuzzy merged (5 days away)

    // Check the 11/15/2025 group has visit + bill + imaging
    const novGroup = groups.find(g => g.date === '2025-11-15')
    expect(novGroup).toBeDefined()
    const novCats = novGroup!.events.map(e => e.category)
    expect(novCats).toContain('visit')
    expect(novCats).toContain('bill')
    expect(novCats).toContain('imaging')
  })

  it('handles visits with unexpected object shapes (e.g. {Patient, Physician, Department, Date, Time})', () => {
    const data = {
      pastVisits: {
        List: {
          org1: {
            List: [
              // Some MyChart instances return simplified visit objects with non-standard keys
              { Patient: 'John Doe', Physician: 'Dr. Smith', Department: 'Internal Medicine', Date: '03/15/2026', Time: '10:00 AM' },
            ],
          },
        },
      },
    }

    // Should not throw even with unexpected visit shapes
    const groups = correlateEvents(data as ScrapeResults)
    // Single visit = singleton, filtered out (no correlations)
    expect(groups.length).toBe(0)
  })

  it('handles visits where VisitTypeName is an object instead of a string', () => {
    const data = {
      pastVisits: {
        List: {
          org1: {
            List: [
              { Date: '01/10/2026', VisitTypeName: { Name: 'Office Visit' } as unknown as string, PrimaryProviderName: 'Dr. Chen' },
            ],
          },
        },
      },
      billing: [
        {
          billingDetails: {
            Data: {
              UnifiedVisitList: [
                { StartDateDisplay: '01/10/2026', Description: 'Office Visit', Provider: 'Dr. Chen' },
              ],
              InformationalVisitList: [],
            },
          },
        },
      ],
    }

    // Should not throw and should use 'Visit' fallback for object VisitTypeName
    const groups = correlateEvents(data as ScrapeResults)
    expect(groups.length).toBe(1)
    const visitEvent = groups[0].events.find(e => e.category === 'visit')
    expect(visitEvent).toBeDefined()
    expect(typeof visitEvent!.title).toBe('string')
    expect(visitEvent!.title).toBe('Visit') // Falls back since VisitTypeName is not a string
  })

  it('includes medications and referrals in groups when they share date+provider', () => {
    const data = {
      pastVisits: {
        List: {
          org1: {
            List: [
              { Date: '03/15/2025', VisitTypeName: 'Office Visit', PrimaryProviderName: 'Dr. Emily Chen' },
            ],
          },
        },
      },
      medications: {
        medications: [
          { name: 'Lisinopril 10mg', startDate: '03/15/2025', authorizingProviderName: 'Dr. Emily Chen' },
        ],
      },
    }

    const groups = correlateEvents(data as ScrapeResults)
    expect(groups.length).toBe(1)
    const cats = groups[0].events.map(e => e.category)
    expect(cats).toContain('visit')
    expect(cats).toContain('medication')
  })
})
