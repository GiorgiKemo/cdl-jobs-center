export type PasswordStrengthLevel = "weak" | "fair" | "good" | "strong";

export interface PasswordStrengthResult {
  score: number;
  label: PasswordStrengthLevel;
  feedback: string;
}

const HAS_LOWER_RE = /[a-z]/;
const HAS_UPPER_RE = /[A-Z]/;
const HAS_NUMBER_RE = /\d/;
const HAS_SYMBOL_RE = /[^A-Za-z0-9]/;

export function getPasswordStrength(password: string): PasswordStrengthResult {
  const hasMinLength = password.length >= 12;
  const hasLower = HAS_LOWER_RE.test(password);
  const hasUpper = HAS_UPPER_RE.test(password);
  const hasNumber = HAS_NUMBER_RE.test(password);
  const hasSymbol = HAS_SYMBOL_RE.test(password);

  const score = [hasMinLength, hasLower, hasUpper, hasNumber, hasSymbol].filter(Boolean).length;

  if (!password) {
    return {
      score: 0,
      label: "weak",
      feedback: "Use at least 12 characters with upper/lowercase, a number, and a symbol.",
    };
  }

  if (score <= 2) {
    return {
      score,
      label: "weak",
      feedback: "Use at least 12 characters with upper/lowercase, a number, and a symbol.",
    };
  }

  if (score === 3) {
    return {
      score,
      label: "fair",
      feedback: "Add one more requirement to make this stronger.",
    };
  }

  if (score === 4) {
    return {
      score,
      label: "good",
      feedback: "Almost there. Add the missing requirement for strongest protection.",
    };
  }

  return {
    score,
    label: "strong",
    feedback: "Strong password.",
  };
}
