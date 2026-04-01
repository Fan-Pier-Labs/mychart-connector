/**
 * Returns true if the imaging study is an advanced type (CT, MRI, etc.)
 * that we don't yet support viewing in the web UI.
 */
export function isAdvancedImaging(orderName: string, totalStudies: number): boolean {
  const name = orderName.toLowerCase();
  return totalStudies > 10
    || name.includes('ct ') || name.includes('ct,') || name.startsWith('ct ')
    || name.includes('mri') || name.includes('ultrasound')
    || name.includes('mammogram') || name.includes('fluoroscop')
    || name.includes('arthrogram') || name.includes('pet ')
    || name.includes('nuclear') || name.includes('angiography');
}
