/**
 * Encode the AuthConfig JSON as base64url **with `=` padding** for the
 * Docker X-Registry-Auth header. The Docker daemon decodes the header with
 * Go's `base64.URLEncoding.DecodeString`, which is base64url with padding —
 * unpadded base64url (Node's default 'base64url' Buffer encoding) is
 * silently treated as malformed, causing the daemon to fall back to
 * anonymous and trip the registry rate limit (#1105).
 *
 * Reference: moby/api/pkg/authconfig/authconfig.go uses
 * `base64.URLEncoding.EncodeToString` / `DecodeString`.
 */
export function encodeRegistryAuth(authConfig: object): string {
	const unpadded = Buffer.from(JSON.stringify(authConfig)).toString('base64url');
	return unpadded + '='.repeat((4 - (unpadded.length % 4)) % 4);
}
