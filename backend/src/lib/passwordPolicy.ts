/** Shared password policy for register / reset / admin create. */
export const MIN_PASSWORD_LENGTH = 8;

export function passwordTooShort(password: string) {
  return password.length < MIN_PASSWORD_LENGTH;
}
