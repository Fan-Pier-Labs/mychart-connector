/**
 * Validates change-password form fields.
 * Returns an error message string, or null if valid.
 */
export function validateChangePassword(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string,
): string | null {
  if (!currentPassword || !newPassword || !confirmPassword) {
    return "Please fill in all fields.";
  }
  if (newPassword.length < 8) {
    return "New password must be at least 8 characters.";
  }
  if (newPassword !== confirmPassword) {
    return "New passwords do not match.";
  }
  return null;
}
