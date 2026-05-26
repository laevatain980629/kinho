const BLOCKED_JWT_SECRETS = new Set([
  'secret',
  'change_this_to_a_long_random_value',
  'KinhoJwt_2026_change_to_a_long_random_value_please',
]);

export function getJwtSecret() {
  const secret = process.env.JWT_SECRET?.trim();

  if (!secret || secret.length < 32 || BLOCKED_JWT_SECRETS.has(secret)) {
    throw new Error(
      'JWT_SECRET is missing, too short, or uses a known default value. Set a strong random JWT_SECRET before starting the API.',
    );
  }

  return secret;
}
