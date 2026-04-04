import { describe, it, expect } from 'bun:test';
import { isAdvancedImaging } from '../imaging-utils';

describe('isAdvancedImaging', () => {
  it('returns false for X-ray studies', () => {
    expect(isAdvancedImaging('X-ray Chest 2 Views', 1)).toBe(false);
    expect(isAdvancedImaging('XR Right Shoulder', 2)).toBe(false);
    expect(isAdvancedImaging('Radiograph Left Knee', 1)).toBe(false);
  });

  it('returns false for CT studies (now supported)', () => {
    expect(isAdvancedImaging('CT Head without Contrast', 1)).toBe(false);
    expect(isAdvancedImaging('CT Chest with Contrast', 0)).toBe(false);
    expect(isAdvancedImaging('CT, Abdomen', 2)).toBe(false);
  });

  it('returns true for MRI studies', () => {
    expect(isAdvancedImaging('MRI Spine', 1)).toBe(true);
    expect(isAdvancedImaging('MRI Lumbar Spine', 0)).toBe(true);
  });

  it('returns true for ultrasound studies', () => {
    expect(isAdvancedImaging('Ultrasound Abdomen', 1)).toBe(true);
  });

  it('returns true for mammogram studies', () => {
    expect(isAdvancedImaging('Mammogram Bilateral', 2)).toBe(true);
  });

  it('returns true for fluoroscopy studies', () => {
    expect(isAdvancedImaging('Fluoroscopy Upper GI', 1)).toBe(true);
  });

  it('returns true for PET studies', () => {
    expect(isAdvancedImaging('PET Scan', 1)).toBe(true);
  });

  it('returns true for nuclear medicine', () => {
    expect(isAdvancedImaging('Nuclear Bone Scan', 1)).toBe(true);
  });

  it('returns true for angiography', () => {
    expect(isAdvancedImaging('CT Angiography', 1)).toBe(true);
  });

  it('returns true when totalStudies exceeds 10 regardless of name', () => {
    expect(isAdvancedImaging('X-ray Chest', 11)).toBe(true);
    expect(isAdvancedImaging('Unknown Study', 50)).toBe(true);
  });

  it('returns false for low study count with non-advanced name', () => {
    expect(isAdvancedImaging('Unknown Study', 3)).toBe(false);
    expect(isAdvancedImaging('Pathology Report', 1)).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(isAdvancedImaging('mri spine', 1)).toBe(true);
    expect(isAdvancedImaging('MRI SPINE', 1)).toBe(true);
  });
});
