export type ChangelogToken =
	| { kind: 'text'; value: string }
	| { kind: 'issue'; num: number }
	| { kind: 'pr'; num: number }
	| { kind: 'user'; name: string };

const PATTERN = /PR#(\d+)|#(\d+)|@([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,38}))/g;

export function parseChangelogTokens(text: string): ChangelogToken[] {
	const tokens: ChangelogToken[] = [];
	let lastIndex = 0;
	for (const match of text.matchAll(PATTERN)) {
		const start = match.index ?? 0;
		if (start > lastIndex) {
			tokens.push({ kind: 'text', value: text.slice(lastIndex, start) });
		}
		if (match[1]) {
			tokens.push({ kind: 'pr', num: Number(match[1]) });
		} else if (match[2]) {
			tokens.push({ kind: 'issue', num: Number(match[2]) });
		} else if (match[3]) {
			tokens.push({ kind: 'user', name: match[3] });
		}
		lastIndex = start + match[0].length;
	}
	if (lastIndex < text.length) {
		tokens.push({ kind: 'text', value: text.slice(lastIndex) });
	}
	return tokens;
}

export const GITHUB_REPO = 'Finsys/dockhand';

export function tokenHref(token: ChangelogToken): string | null {
	switch (token.kind) {
		case 'issue':
			return `https://github.com/${GITHUB_REPO}/issues/${token.num}`;
		case 'pr':
			return `https://github.com/${GITHUB_REPO}/pull/${token.num}`;
		case 'user':
			return `https://github.com/${token.name}`;
		default:
			return null;
	}
}
