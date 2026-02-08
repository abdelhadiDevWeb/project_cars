/**
 * Frontend validation utilities
 */

/**
 * Validate email format
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim().toLowerCase());
};

/**
 * Validate phone number (Algerian format)
 */
export const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^[0-9+\s()-]{8,20}$/;
  return phoneRegex.test(phone.trim());
};

/**
 * Validate password strength
 */
export const validatePassword = (password: string): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Le mot de passe doit contenir au moins 8 caractères");
  }
  if (password.length > 128) {
    errors.push("Le mot de passe ne peut pas dépasser 128 caractères");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Le mot de passe doit contenir au moins une minuscule");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Le mot de passe doit contenir au moins une majuscule");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Le mot de passe doit contenir au moins un chiffre");
  }
  if (!/[@$!%*?&]/.test(password)) {
    errors.push("Le mot de passe doit contenir au moins un caractère spécial (@$!%*?&)");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Sanitize string input - remove dangerous characters
 */
export const sanitizeInput = (input: string): string => {
  if (typeof input !== "string") {
    return "";
  }

  return input
    .trim()
    .replace(/[<>]/g, "") // Remove < and >
    .replace(/javascript:/gi, "") // Remove javascript: protocol
    .replace(/on\w+=/gi, ""); // Remove event handlers
};

/**
 * Validate name (first name, last name)
 */
export const validateName = (name: string): { valid: boolean; error?: string } => {
  const trimmed = name.trim();

  if (trimmed.length < 2) {
    return { valid: false, error: "Le nom doit contenir au moins 2 caractères" };
  }

  if (trimmed.length > 50) {
    return { valid: false, error: "Le nom ne peut pas dépasser 50 caractères" };
  }

  if (!/^[a-zA-ZÀ-ÿ\s'-]+$/.test(trimmed)) {
    return { valid: false, error: "Le nom ne peut contenir que des lettres" };
  }

  return { valid: true };
};

/**
 * Validate verification code
 */
export const validateVerificationCode = (code: string): boolean => {
  return /^\d{6}$/.test(code.trim());
};
