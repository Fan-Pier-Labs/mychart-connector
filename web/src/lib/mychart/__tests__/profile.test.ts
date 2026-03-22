import { describe, it, expect } from 'bun:test'
import { parseProfileHtml } from '../profile'

describe('parseProfileHtml', () => {
  it('parses a standard profile page', () => {
    const html = `
      <html>
        <body>
          <div class="printheader">Name: John Smith | DOB: 1/15/1990 | MRN: 123456 | PCP: Dr. Jane Doe</div>
        </body>
      </html>
    `
    expect(parseProfileHtml(html)).toEqual({
      name: 'John Smith',
      dob: '1/15/1990',
      mrn: '123456',
      pcp: 'Dr. Jane Doe',
    })
  })

  it('parses profile with two-digit month and day', () => {
    const html = `
      <div class="printheader">Name: Alice Johnson | DOB: 12/25/1985 | MRN: 789012 | PCP: Dr. Bob Williams</div>
    `
    expect(parseProfileHtml(html)).toEqual({
      name: 'Alice Johnson',
      dob: '12/25/1985',
      mrn: '789012',
      pcp: 'Dr. Bob Williams',
    })
  })

  it('parses profile with single-digit month and day', () => {
    const html = `
      <div class="printheader">Name: Test User | DOB: 3/5/2000 | MRN: 111222 | PCP: Dr. Smith</div>
    `
    expect(parseProfileHtml(html)).toEqual({
      name: 'Test User',
      dob: '3/5/2000',
      mrn: '111222',
      pcp: 'Dr. Smith',
    })
  })

  it('parses profile with empty PCP', () => {
    const html = `
      <div class="printheader">Name: No PCP Patient | DOB: 6/1/1995 | MRN: 333444 | PCP: </div>
    `
    const result = parseProfileHtml(html)
    expect(result).not.toBeNull()
    expect(result!.name).toBe('No PCP Patient')
    expect(result!.pcp).toBe('')
  })

  it('parses profile with long PCP name including credentials', () => {
    const html = `
      <div class="printheader">Name: Jane Doe | DOB: 7/20/1988 | MRN: 555666 | PCP: Robert A. Johnson, MD, FACP</div>
    `
    const result = parseProfileHtml(html)
    expect(result).not.toBeNull()
    expect(result!.pcp).toBe('Robert A. Johnson, MD, FACP')
  })

  it('returns null when printheader div is missing', () => {
    const html = `
      <html>
        <body>
          <div class="some-other-class">Content here</div>
        </body>
      </html>
    `
    expect(parseProfileHtml(html)).toBeNull()
  })

  it('returns null when printheader has wrong format', () => {
    const html = `
      <div class="printheader">Welcome to MyChart</div>
    `
    expect(parseProfileHtml(html)).toBeNull()
  })

  it('returns null for empty HTML', () => {
    expect(parseProfileHtml('')).toBeNull()
  })

  it('returns null when printheader exists but has no text', () => {
    const html = `<div class="printheader"></div>`
    expect(parseProfileHtml(html)).toBeNull()
  })

  it('handles name with hyphens and suffixes', () => {
    const html = `
      <div class="printheader">Name: Mary-Jane O'Brien III | DOB: 11/30/1975 | MRN: 999888 | PCP: Dr. Lee</div>
    `
    const result = parseProfileHtml(html)
    expect(result).not.toBeNull()
    expect(result!.name).toBe("Mary-Jane O'Brien III")
    expect(result!.mrn).toBe('999888')
  })

  it('handles realistic page with surrounding content', () => {
    const html = `
      <!DOCTYPE html>
      <html>
      <head><title>MyChart - Home</title></head>
      <body>
        <header>
          <nav>Navigation content</nav>
        </header>
        <div class="printheader">Name: Ryan Hughes | DOB: 4/10/1992 | MRN: 112233 | PCP: Dr. Sarah Connor</div>
        <div class="main-content">
          <h1>Welcome, Ryan!</h1>
          <p>Your next appointment is tomorrow.</p>
        </div>
        <footer>Footer content</footer>
      </body>
      </html>
    `
    expect(parseProfileHtml(html)).toEqual({
      name: 'Ryan Hughes',
      dob: '4/10/1992',
      mrn: '112233',
      pcp: 'Dr. Sarah Connor',
    })
  })

  it('handles printheader with extra whitespace', () => {
    const html = `
      <div class="printheader">
        Name: Whitespace User | DOB: 2/28/1980 | MRN: 445566 | PCP: Dr. Space
      </div>
    `
    // The regex matches within the text, so whitespace around is fine
    const result = parseProfileHtml(html)
    expect(result).not.toBeNull()
    expect(result!.name).toBe('Whitespace User')
  })

  it('parses MyChart Central format with only Name and DOB', () => {
    const html = `
      <div class="printheader">
                Name: Nathan Aune | DOB: 4/2/1973
            </div>
    `
    const result = parseProfileHtml(html)
    expect(result).not.toBeNull()
    expect(result!.name).toBe('Nathan Aune')
    expect(result!.dob).toBe('4/2/1973')
    expect(result!.mrn).toBe('')
    expect(result!.pcp).toBe('')
  })

  it('parses Name | DOB | MRN without PCP', () => {
    const html = `
      <div class="printheader">Name: Jane Doe | DOB: 6/15/1990 | MRN: 112233</div>
    `
    const result = parseProfileHtml(html)
    expect(result).not.toBeNull()
    expect(result!.name).toBe('Jane Doe')
    expect(result!.dob).toBe('6/15/1990')
    expect(result!.mrn).toBe('112233')
    expect(result!.pcp).toBe('')
  })
})
