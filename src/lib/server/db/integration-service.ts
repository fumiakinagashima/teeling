import { MASKED_SECRET } from '$lib/types/integration';

const SECRET_FIELDS = ['value', 'password'] as const;

// Mask secret fields (token/password) for the client
export function maskAuthConfig(authConfig: Record<string, string>): Record<string, string> {
	const masked = { ...authConfig };
	for (const key of SECRET_FIELDS) {
		if (masked[key]) masked[key] = MASKED_SECRET;
	}
	return masked;
}

// On PATCH, keep the existing value if a secret field is still the mask value (unchanged)
export function mergeAuthConfig(
	existing: Record<string, string>,
	incoming: Record<string, string>
): Record<string, string> {
	const merged = { ...incoming };
	for (const key of SECRET_FIELDS) {
		if (merged[key] === MASKED_SECRET) {
			merged[key] = existing[key] ?? '';
		}
	}
	return merged;
}
