import { describe, it, expect } from 'bun:test'
import { safeText } from '../data-display'

describe('safeText', () => {
  it('returns string values as-is', () => {
    expect(safeText('hello')).toBe('hello')
    expect(safeText('Dr. Smith')).toBe('Dr. Smith')
  })

  it('returns empty string for null/undefined', () => {
    expect(safeText(null)).toBe('')
    expect(safeText(undefined)).toBe('')
  })

  it('converts numbers to strings', () => {
    expect(safeText(42)).toBe('42')
    expect(safeText(0)).toBe('0')
  })

  it('converts objects to JSON strings instead of throwing', () => {
    const obj = { Patient: 'John', Physician: 'Dr. Smith', Department: 'Internal Medicine', Date: '3/15/26', Time: '10am' }
    const result = safeText(obj)
    expect(typeof result).toBe('string')
    expect(result).toContain('Patient')
    expect(result).toContain('John')
  })

  it('converts arrays to JSON strings', () => {
    const arr = ['a', 'b', 'c']
    const result = safeText(arr)
    expect(typeof result).toBe('string')
  })

  it('converts booleans to strings', () => {
    expect(safeText(true)).toBe('true')
    expect(safeText(false)).toBe('false')
  })
})
