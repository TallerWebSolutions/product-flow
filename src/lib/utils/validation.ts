/**
 * Validation utilities for auth forms
 */

/**
 * Validates an email address
 * @param email Email address to validate
 * @returns Object with isValid and message properties
 */
export const validateEmail = (email: string): { isValid: boolean; message: string } => {
  if (!email) return { isValid: false, message: 'Email is required' };

  // Basic email regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, message: 'Please enter a valid email address' };
  }

  return { isValid: true, message: '' };
};

/**
 * Validates a password
 * @param password Password to validate
 * @returns Object with isValid and message properties
 */
export const validatePassword = (password: string): { isValid: boolean; message: string } => {
  if (!password) return { isValid: false, message: 'Password is required' };

  if (password.length < 8) {
    return { isValid: false, message: 'Password must be at least 8 characters long' };
  }

  // Check for at least one number and one letter
  const hasNumber = /\d/.test(password);
  const hasLetter = /[a-zA-Z]/.test(password);

  if (!hasNumber || !hasLetter) {
    return { isValid: false, message: 'Password must contain at least one letter and one number' };
  }

  return { isValid: true, message: '' };
};

/**
 * Validates that password and confirmation match
 * @param password Password
 * @param confirmation Password confirmation
 * @returns Object with isValid and message properties
 */
export const validatePasswordConfirmation = (
  password: string,
  confirmation: string
): { isValid: boolean; message: string } => {
  if (!confirmation) return { isValid: false, message: 'Please confirm your password' };

  if (password !== confirmation) {
    return { isValid: false, message: 'Passwords do not match' };
  }

  return { isValid: true, message: '' };
};