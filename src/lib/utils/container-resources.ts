/**
 * Container resource-string parsers, shared between the create modal, the
 * edit modal, and the in-place update Apply buttons in ContainerSettingsTab.
 *
 * Two of these previously lived in CreateContainerModal AND EditContainerModal
 * as identical copies — moved here to prevent the drift that started when one
 * gained `tb` support and the other didn't.
 */

/**
 * Parse a memory string like "512m", "1g", "2.5gb" into bytes.
 * Bare numbers are treated as bytes. Returns undefined for empty/garbage input.
 *
 * Units: k/kb, m/mb, g/gb, t/tb — base 1024 (binary), matching Docker's CLI.
 */
export function parseMemory(value: string | number | null | undefined): number | undefined {
	if (value === null || value === undefined) return undefined;
	if (typeof value === 'number') return value > 0 ? Math.floor(value) : undefined;
	const trimmed = value.trim();
	if (!trimmed) return undefined;
	const match = trimmed.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*([kmgt]?b?)?$/);
	if (!match) return undefined;
	const num = parseFloat(match[1]);
	const unit = match[2] || '';
	switch (unit) {
		case 'k': case 'kb': return Math.floor(num * 1024);
		case 'm': case 'mb': return Math.floor(num * 1024 * 1024);
		case 'g': case 'gb': return Math.floor(num * 1024 * 1024 * 1024);
		case 't': case 'tb': return Math.floor(num * 1024 * 1024 * 1024 * 1024);
		default: return Math.floor(num);
	}
}

/**
 * Parse a CPU-limit string like "0.5", "1.5", "2" into NanoCpus (1e9 = 1 CPU).
 * Returns undefined for empty/garbage input.
 */
export function parseNanoCpus(value: string | number | null | undefined): number | undefined {
	if (value === null || value === undefined) return undefined;
	if (typeof value === 'number') return value > 0 ? Math.floor(value) : undefined;
	const trimmed = value.trim();
	if (!trimmed) return undefined;
	const num = parseFloat(trimmed);
	if (isNaN(num) || num <= 0) return undefined;
	return Math.floor(num * 1e9);
}

/** Parse a bare positive integer string. Returns undefined for empty/garbage. */
export function parsePositiveInt(value: string | number | null | undefined): number | undefined {
	if (value === null || value === undefined) return undefined;
	if (typeof value === 'number') return value > 0 ? Math.floor(value) : undefined;
	const trimmed = value.trim();
	if (!trimmed) return undefined;
	const num = parseInt(trimmed, 10);
	if (isNaN(num) || num <= 0) return undefined;
	return num;
}
