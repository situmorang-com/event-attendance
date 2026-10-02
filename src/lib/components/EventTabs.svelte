<script lang="ts">
	interface Props {
		eventId: string;
		current: 'checkins' | 'invitations' | 'planning';
		checkins: number;
		invitations: number;
		/** Suggested people waiting for a decision. */
		suggestions: number;
	}

	let { eventId, current, checkins, invitations, suggestions }: Props = $props();

	const tabs = $derived([
		{ key: 'checkins', label: 'Check-ins', href: `/admin/events/${eventId}`, count: checkins },
		{
			key: 'invitations',
			label: 'Invitations',
			href: `/admin/events/${eventId}/invitations`,
			count: invitations
		},
		{
			key: 'planning',
			label: 'Planning',
			href: `/admin/events/${eventId}/planning`,
			count: suggestions
		}
	]);
</script>

<nav aria-label="Event sections">
	{#each tabs as tab (tab.key)}
		<a href={tab.href} aria-current={tab.key === current ? 'page' : undefined}>
			{tab.label}
			<span class="count">{tab.count.toLocaleString()}</span>
		</a>
	{/each}
</nav>

<style>
	nav {
		display: flex;
		gap: 4px;
		margin-bottom: 20px;
		border-bottom: 1px solid var(--border);
		overflow-x: auto;
		scrollbar-width: none;
	}

	a {
		position: relative;
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 10px 12px 12px;
		font-size: 15px;
		font-weight: 650;
		color: var(--text-2);
		text-decoration: none;
		white-space: nowrap;
		transition: color 0.15s ease;
	}

	a:hover {
		color: var(--text);
	}

	a[aria-current='page'] {
		color: var(--text);
	}

	a[aria-current='page']::after {
		content: '';
		position: absolute;
		left: 10px;
		right: 10px;
		bottom: -1px;
		height: 2px;
		border-radius: 2px;
		background: var(--brand);
	}

	.count {
		min-width: 24px;
		padding: 1px 8px;
		border-radius: 999px;
		background: var(--surface-2);
		color: var(--muted);
		font-size: 12.5px;
		font-weight: 700;
		text-align: center;
	}

	a[aria-current='page'] .count {
		background: var(--brand-soft);
		color: var(--brand-text);
	}
</style>
