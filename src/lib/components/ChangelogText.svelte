<script lang="ts">
	import { GitPullRequestArrow } from 'lucide-svelte';
	import { parseChangelogTokens, tokenHref, type ChangelogToken } from '$lib/utils/changelog-tokens';

	let { text }: { text: string } = $props();

	type Group = { kind: 'text'; value: string } | { kind: 'refs'; refs: ChangelogToken[] };

	const groups = $derived.by<Group[]>(() => {
		const tokens = parseChangelogTokens(text);
		const result: Group[] = [];
		let textBuf = '';
		let refBuf: ChangelogToken[] = [];

		const flushText = () => {
			if (textBuf) {
				result.push({ kind: 'text', value: textBuf });
				textBuf = '';
			}
		};
		const flushRefs = () => {
			if (refBuf.length) {
				result.push({ kind: 'refs', refs: refBuf });
				refBuf = [];
			}
		};

		for (const t of tokens) {
			if (t.kind === 'text') {
				// If the gap between consecutive ref groups is only "glue" (whitespace,
				// commas, parens), keep collecting into the same refs group. Otherwise
				// it ends the group.
				if (refBuf.length && /^[\s,()]*$/.test(t.value)) {
					continue;
				}
				if (refBuf.length) {
					flushRefs();
				}
				// Strip a trailing " (" left over before the upcoming refs group.
				textBuf += t.value;
			} else {
				// Trim trailing glue from textBuf so we don't render "foo (".
				if (refBuf.length === 0) {
					textBuf = textBuf.replace(/[\s(]+$/, '');
				}
				flushText();
				refBuf.push(t);
			}
		}
		flushRefs();
		// Trim trailing glue (e.g. ")") from leftover text.
		textBuf = textBuf.replace(/^[\s,)]+/, '');
		flushText();
		return result;
	});

	function refLabel(token: ChangelogToken): string {
		if (token.kind === 'issue') return `#${token.num}`;
		if (token.kind === 'pr') return `#${token.num}`;
		if (token.kind === 'user') return `@${token.name}`;
		return '';
	}

	function refTitle(token: ChangelogToken): string {
		if (token.kind === 'issue') return `Issue #${token.num}`;
		if (token.kind === 'pr') return `Pull request #${token.num}`;
		if (token.kind === 'user') return `@${token.name} on GitHub`;
		return '';
	}
</script>

<span class="text-sm">
	{#each groups as group, i (i)}
		{#if group.kind === 'text'}
			{group.value}
		{:else}
			<span class="changelog-refs">
				<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
					<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
				</svg>
				{#each group.refs as ref, j (j)}
					{#if j > 0}<span class="changelog-refs-sep"> · </span>{/if}
					<a
						href={tokenHref(ref)}
						target="_blank"
						rel="noopener noreferrer"
						title={refTitle(ref)}
						class="changelog-refs-link"
					>{#if ref.kind === 'pr'}<GitPullRequestArrow class="changelog-pr-icon" />{/if}{refLabel(ref)}</a>
				{/each}
			</span>
		{/if}
	{/each}
</span>

<style>
	.changelog-refs {
		display: inline;
		opacity: 0.55;
		margin-left: 4px;
		font-size: 0.75em;
	}
	.changelog-refs svg {
		display: inline;
		width: 10px;
		height: 10px;
		vertical-align: -1px;
		margin-right: 3px;
	}
	.changelog-refs-link {
		color: inherit;
		text-decoration: none;
	}
	.changelog-refs-link:hover {
		text-decoration: underline;
	}
	.changelog-refs-sep {
		color: inherit;
	}
	.changelog-refs-link :global(.changelog-pr-icon) {
		display: inline;
		width: 10px;
		height: 10px;
		vertical-align: -1px;
		margin-right: 2px;
	}
</style>
