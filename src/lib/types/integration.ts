// Mask value used when sending secret fields such as authConfig's value/password to the client.
// If this value is sent back on PATCH, the existing value is kept (treated as unchanged).
export const MASKED_SECRET = '********';
