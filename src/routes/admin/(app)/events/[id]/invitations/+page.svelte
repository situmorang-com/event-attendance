<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import AddGuests from '$lib/components/AddGuests.svelte';
	import EventTabs from '$lib/components/EventTabs.svelte';
	import GuestRow from '$lib/components/GuestRow.svelte';
	import QuickAdd from '$lib/components/QuickAdd.svelte';
	import ReplyBar from '$lib/components/ReplyBar.svelte';
	import { isReply, REPLIES, REPLY_LABEL, type Guest, type Reply } from '$lib/invitations';
	import { connectLive } from '$lib/live';
	import { initials } from '$lib/names';
	import { formatDateTime, formatTime } from '$lib/time';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import ClipboardList from '@lucide/svelte/icons/clipboard-list';
	import Download from '@lucide/svelte/icons/download';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Plus from '@lucide/svelte/icons/plus';
	import Search from '@lucide/svelte/icons/search';
	import UserPlus from '@lucide/svelte/icons/user-plus';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	type Filter = Reply | 'all' | 'arrived' | 'missing';

	const event = $derived(data.event);
	// A string, so the live connection below survives every reload of the page data.
	const eventId = $derived(data.event.id);
	const total = $derived(data.groups.reduce((n, g) => n + g.guests.length, 0));

	// An empty list opens straight onto the form that fills it.
	// svelte-ignore state_referenced_locally
	let adding = $state(total === 0);
	let focusAdd = $state(false);
	let query = $state('');
	let filter = $state<Filter>('all');
	let renaming = $state<string | null>(null);

	// On the day the list is live: each arrival ticks its guest off without a reload.
	$effect(() => {
		let pending: ReturnType<typeof setTimeout> | undefined;
		const refresh = () => {
			clearTimeout(pending);
			pending = setTimeout(() => invalidateAll(), 400);
		};
		const disconnect = connectLive(eventId, { checkin: refresh, refresh });
		return () => {
			clearTimeout(pending);
			disconnect();
		};
	});

	// A tapped reply shows at once; the saved one takes over when the page data catches up.
	let optimistic = $state<Record<number, Reply>>({});
	const latest: Record<number, number> = {};
	let sequence = 0;

	function beginReply(id: number, reply: Reply) {
		optimistic[id] = reply;
		const mine = (latest[id] = ++sequence);
		return () => {
			// A quicker second tap wins: only the last reply sent clears the placeholder.
			if (latest[id] === mine) delete optimistic[id];
		};
	}

	const replyOf = (g: Guest) => optimistic[g.id] ?? g.reply;

	const counts = $derived.by(() => {
		const c: Record<Filter, number> = {
			all: 0,
			yes: 0,
			maybe: 0,
			no: 0,
			pending: 0,
			arrived: 0,
			missing: 0
		};
		for (const group of data.groups) {
			for (const guest of group.guests) {
				const reply = replyOf(guest);
				c.all++;
				c[reply]++;
				if (guest.arrived_at) c.arrived++;
				else if (reply === 'yes') c.missing++;
			}
		}
		return c;
	});

	const filters = $derived<{ key: Filter; label: string; hint?: string }[]>([
		{ key: 'all', label: 'All' },
		...REPLIES.map((r) => ({ key: r, label: REPLY_LABEL[r] })),
		...(data.checkins
			? [
					{ key: 'arrived' as const, label: 'Checked in' },
					{
						key: 'missing' as const,
						label: 'Not arrived',
						hint: 'Said they’re attending but haven’t checked in'
					}
				]
			: [])
	]);

	function shows(g: Guest, q: string) {
		const reply = replyOf(g);
		if (filter === 'arrived' && !g.arrived_at) return false;
		if (filter === 'missing' && (reply !== 'yes' || g.arrived_at)) return false;
		if (isReply(filter) && reply !== filter) return false;
		return (
			!q ||
			[g.name, g.company, g.job_title, g.email, g.phone, g.note].some((v) =>
				v?.toLowerCase().includes(q)
			)
		);
	}

	const q = $derived(query.trim().toLowerCase());
	const filtering = $derived(filter !== 'all' || q !== '');
	const groups = $derived(
		data.groups
			.map((group) => ({ ...group, shown: group.guests.filter((g) => shows(g, q)) }))
			.filter((group) => group.shown.length)
	);
	const walkIns = $derived(
		filter === 'all' || filter === 'arrived'
			? data.walkIns.filter(
					(w) => !q || [w.name, w.company, w.jobTitle].some((v) => v.toLowerCase().includes(q))
				)
			: []
	);

	/** "5 invited · 3 attending · 4 checked in" */
	function groupSummary(guests: Guest[]) {
		const yes = guests.filter((g) => replyOf(g) === 'yes').length;
		const parts = [
			`${guests.length.toLocaleString()} invited`,
			`${yes.toLocaleString()} attending`
		];
		if (data.checkins) {
			const arrived = guests.filter((g) => g.arrived_at).length;
			parts.push(`${arrived.toLocaleString()} checked in`);
		}
		return parts.join(' · ');
	}

	function openAdd() {
		// Already open: the button still takes you to it.
		if (adding) document.getElementById('add-company')?.focus();
		adding = true;
		focusAdd = true;
	}

	function focusSelect(node: HTMLInputElement) {
		node.focus();
		node.select();
	}

	const editErrors = $derived(form && 'editId' in form ? form : null);
	const plural = (n: number, word: string) => `${n.toLocaleString()} ${word}${n === 1 ? '' : 's'}`;
</script>

<svelte:head>
	<title>Invitations · {event.name} · Hadir</title>
</svelte:head>

<a class="back btn btn-ghost btn-sm" href="/admin"><ArrowLeft size={16} /> Events</a>

<header class="head">
	<div class="title">
		<div class="status">
			{#if event.is_open}
				<span class="pill pill-good"><span class="dot dot-live"></span> Check-in open</span>
			{:else}
				<span class="pill">Check-in closed</span>
			{/if}
		</div>
		<h1>{event.name}</h1>
		<p class="muted">
			{#if event.starts_at}{formatDateTime(event.starts_at, event.timezone)}{/if}
			{#if event.starts_at && event.venue}&nbsp;·&nbsp;{/if}
			{event.venue}
		</p>
	</div>
	<div class="head-actions">
		{#if total}
			<a class="btn btn-secondary" href="/admin/events/{event.id}/invitations.csv">
				<Download size={17} /> CSV
			</a>
		{/if}
		<button class="btn btn-primary" onclick={openAdd} aria-expanded={adding}>
			<UserPlus size={18} /> Add people
		</button>
	</div>
</header>

<EventTabs eventId={event.id} current="invitations" checkins={data.checkins} invitations={total} />

<datalist id="company-options">
	{#each data.companies as company (company.name)}
		<option value={company.name}>
			{company.contacts ? plural(company.contacts, 'contact') : ''}
		</option>
	{/each}
</datalist>

{#if adding}
	<AddGuests
		eventId={event.id}
		first={total === 0}
		autofocus={focusAdd}
		onclose={() => (adding = false)}
	/>
{/if}

{#if total === 0}
	{#if !adding}
		<section class="card empty rise">
			<div class="empty-icon"><ClipboardList size={30} /></div>
			<h2>Plan who you’re inviting</h2>
			<p class="muted">
				List people company by company, record each reply as it comes in, and see who turns up on
				the day.
			</p>
			<button class="btn btn-primary btn-lg" onclick={openAdd}>
				<UserPlus size={20} /> Add people
			</button>
		</section>
	{/if}
{:else}
	<section class="card summary">
		<div class="figures">
			<div class="figure">
				<p class="figure-label">Attending</p>
				<p class="hero-value">{counts.yes.toLocaleString()}</p>
				<p class="figure-sub muted">
					of {total.toLocaleString()} invited{#if counts.pending}&nbsp;· {counts.pending.toLocaleString()}
						still to reply{/if}
				</p>
			</div>
			{#if data.checkins}
				<div class="figure">
					<p class="figure-label">Checked in</p>
					<p class="figure-value">{counts.arrived.toLocaleString()}</p>
					<p class="figure-sub muted">
						{counts.missing.toLocaleString()} attending not here yet{#if data.walkIns.length}&nbsp;·
							{plural(data.walkIns.length, 'walk-in')}{/if}
					</p>
				</div>
			{/if}
		</div>
		<ReplyBar
			counts={{ yes: counts.yes, maybe: counts.maybe, no: counts.no, pending: counts.pending }}
		/>
	</section>

	<div class="toolbar">
		<label class="search">
			<Search size={17} />
			<span class="sr-only">Search the guest list</span>
			<input
				class="input"
				type="search"
				placeholder="Search names, companies, notes"
				bind:value={query}
			/>
		</label>
		<div class="chips" role="group" aria-label="Show">
			{#each filters as f (f.key)}
				<button
					class="chip"
					aria-pressed={filter === f.key}
					title={f.hint}
					onclick={() => (filter = f.key)}
				>
					{#if isReply(f.key)}<span class="swatch {f.key}"></span>{/if}
					{f.label}
					<span class="chip-count">{counts[f.key].toLocaleString()}</span>
				</button>
			{/each}
		</div>
	</div>

	{#each groups as group (group.key)}
		<section class="card group">
			<header class="group-head">
				{#if renaming === group.key}
					<form
						class="rename"
						method="POST"
						action="?/rename"
						use:enhance={() =>
							async ({ result, update }) => {
								await update({ reset: false });
								if (result.type === 'success') renaming = null;
							}}
					>
						<input type="hidden" name="from" value={group.key} />
						<input
							class="input"
							name="to"
							value={group.name}
							required
							aria-label="Company name"
							use:focusSelect
							onkeydown={(e) => e.key === 'Escape' && (renaming = null)}
						/>
						<button class="btn btn-primary btn-sm">Save</button>
						<button type="button" class="btn btn-ghost btn-sm" onclick={() => (renaming = null)}>
							Cancel
						</button>
					</form>
				{:else}
					<div class="group-title">
						<h2>{group.name || 'No company'}</h2>
						{#if group.key}
							<button
								class="btn btn-ghost btn-icon btn-sm rename-btn"
								onclick={() => (renaming = group.key)}
								title="Rename company"
							>
								<Pencil size={14} /><span class="sr-only">Rename {group.name}</span>
							</button>
						{/if}
					</div>
					<p class="group-meta muted">{groupSummary(group.guests)}</p>
				{/if}
			</header>
			<ul class="guests">
				{#each group.shown as guest (guest.id)}
					<GuestRow
						{guest}
						reply={replyOf(guest)}
						{event}
						errors={editErrors?.editId === guest.id ? editErrors.editErrors : undefined}
						values={editErrors?.editId === guest.id ? editErrors.editValues : null}
						onreply={(reply) => beginReply(guest.id, reply)}
					/>
				{/each}
			</ul>
			{#if !filtering}<QuickAdd company={group.name} />{/if}
		</section>
	{/each}

	{#if walkIns.length}
		<section class="card group walk-ins">
			<header class="group-head">
				<div class="group-title"><h2>Walk-ins</h2></div>
				<p class="group-meta muted">Checked in, but not on the guest list</p>
			</header>
			<ul class="guests">
				{#each walkIns as w (w.checkinId)}
					<li class="walk-in">
						<span class="avatar" aria-hidden="true">{initials(w.name)}</span>
						<div class="who">
							<p class="person-name">{w.name}</p>
							{#if w.jobTitle || w.company}
								<p class="details">{[w.jobTitle, w.company].filter(Boolean).join(' · ')}</p>
							{/if}
						</div>
						<span class="time muted">{formatTime(w.checkedInAt, event.timezone)}</span>
						<form method="POST" action="?/walkin" use:enhance>
							<input type="hidden" name="checkin" value={w.checkinId} />
							<button class="btn btn-soft btn-sm" aria-label="Add {w.name} to the guest list">
								<Plus size={16} /><span class="walk-in-label">Add to list</span>
							</button>
						</form>
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	{#if filtering && !groups.length && !walkIns.length}
		<div class="card no-match">
			<p class="muted">
				{q ? `No one matches “${query.trim()}”` : 'No one here yet'}{filter !== 'all'
					? ` in ${filters.find((f) => f.key === filter)?.label}`
					: ''}.
			</p>
			<button
				class="btn btn-secondary btn-sm"
				onclick={() => {
					query = '';
					filter = 'all';
				}}>Show everyone</button
			>
		</div>
	{/if}
{/if}

<style>
	.back {
		margin: -8px 0 12px -10px;
	}

	.head {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		flex-wrap: wrap;
		gap: 16px;
		margin-bottom: 20px;
	}

	.title {
		display: grid;
		gap: 8px;
	}

	.status {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
	}

	h1 {
		font-size: clamp(28px, 4vw, 38px);
		font-weight: 800;
		letter-spacing: -0.035em;
	}

	.head-actions {
		display: flex;
		gap: 10px;
		flex-wrap: wrap;
	}

	.summary {
		display: grid;
		gap: 18px;
		padding: 20px;
		margin-bottom: 4px;
		background:
			radial-gradient(
				120% 140% at 100% 0%,
				color-mix(in oklab, var(--aurora-1) 12%, transparent),
				transparent 60%
			),
			var(--surface);
	}

	.figures {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 16px 40px;
	}

	.figure {
		display: grid;
		gap: 6px;
		align-content: start;
	}

	.figure-label {
		font-size: 14px;
		font-weight: 650;
		color: var(--text-2);
	}

	.hero-value {
		font-size: 60px;
		font-weight: 700;
		letter-spacing: -0.045em;
		line-height: 1;
	}

	.figure-value {
		font-size: 34px;
		font-weight: 700;
		letter-spacing: -0.03em;
		line-height: 1;
	}

	.figure-sub {
		font-size: 14px;
	}

	.toolbar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 10px 14px;
		padding: 14px 0;
		margin-bottom: 4px;
	}

	.search {
		position: relative;
		display: flex;
		align-items: center;
		color: var(--muted);
		flex: 1 1 260px;
		max-width: 340px;
	}

	.search :global(svg) {
		position: absolute;
		left: 12px;
		pointer-events: none;
	}

	.search .input {
		height: 40px;
		padding-left: 38px;
	}

	.chips {
		display: flex;
		gap: 6px;
		overflow-x: auto;
		scrollbar-width: none;
		max-width: 100%;
	}

	.chip {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		height: 36px;
		padding: 0 12px;
		border-radius: 999px;
		border: 1px solid var(--border-strong);
		background: var(--surface);
		color: var(--text-2);
		font-size: 14px;
		font-weight: 650;
		white-space: nowrap;
		cursor: pointer;
		transition:
			border-color 0.15s ease,
			background-color 0.15s ease,
			color 0.15s ease;
	}

	.chip:hover {
		border-color: color-mix(in oklab, var(--brand) 50%, var(--border-strong));
		color: var(--text);
	}

	.chip[aria-pressed='true'] {
		background: var(--brand-soft);
		border-color: color-mix(in oklab, var(--brand) 55%, transparent);
		color: var(--brand-text);
	}

	.chip-count {
		font-size: 13px;
		font-weight: 700;
		color: var(--muted);
		font-variant-numeric: tabular-nums;
	}

	.chip[aria-pressed='true'] .chip-count {
		color: inherit;
	}

	/* The legend for the reply bar: same fills, same order. */
	.swatch {
		width: 10px;
		height: 10px;
		border-radius: 3px;
	}

	.swatch.yes {
		background: var(--status-good);
	}

	.swatch.maybe {
		background: var(--status-warn);
	}

	.swatch.no {
		background: var(--status-bad);
	}

	.swatch.pending {
		background: var(--border-strong);
	}

	.group {
		overflow: hidden;
		margin-bottom: 14px;
	}

	.group-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 4px 16px;
		min-height: 58px;
		padding: 10px 16px 10px 20px;
	}

	.group-title {
		display: flex;
		align-items: center;
		gap: 4px;
		min-width: 0;
	}

	.group-title h2 {
		font-size: 17px;
	}

	.group-meta {
		font-size: 13.5px;
	}

	.rename-btn {
		--h: 32px;
		opacity: 0;
		transition: opacity 0.15s ease;
	}

	.group-head:hover .rename-btn,
	.rename-btn:focus-visible {
		opacity: 1;
	}

	@media (hover: none) {
		.rename-btn {
			opacity: 1;
		}
	}

	.rename {
		display: flex;
		align-items: center;
		gap: 8px;
		flex: 1;
		max-width: 520px;
	}

	.rename .input {
		height: 38px;
	}

	.guests {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.walk-in {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 10px 16px 10px 20px;
		border-top: 1px solid var(--border);
	}

	.avatar {
		flex: none;
		display: grid;
		place-items: center;
		width: 34px;
		height: 34px;
		border-radius: 50%;
		background: var(--surface-3);
		color: var(--text-2);
		font-size: 12.5px;
		font-weight: 750;
	}

	.who {
		flex: 1;
		min-width: 0;
	}

	.person-name {
		font-weight: 650;
	}

	.details {
		font-size: 13.5px;
		color: var(--muted);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.time {
		font-size: 13.5px;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}

	.no-match {
		display: grid;
		justify-items: center;
		gap: 12px;
		padding: 36px 16px;
		text-align: center;
	}

	.empty {
		display: grid;
		justify-items: center;
		text-align: center;
		gap: 12px;
		padding: 56px 24px;
		max-width: 620px;
		margin: 24px auto 0;
	}

	.empty h2 {
		font-size: 24px;
	}

	.empty p {
		max-width: 440px;
		margin-bottom: 8px;
	}

	.empty-icon {
		display: grid;
		place-items: center;
		width: 72px;
		height: 72px;
		border-radius: 22px;
		background: var(--grad);
		color: #fff;
		box-shadow: var(--glow);
		margin-bottom: 6px;
	}

	@media (min-width: 900px) {
		/* The search and filters stay in reach down a long list. */
		.toolbar {
			position: sticky;
			top: 64px;
			z-index: 5;
			background: color-mix(in oklab, var(--bg) 88%, transparent);
			backdrop-filter: blur(12px);
			-webkit-backdrop-filter: blur(12px);
		}
	}

	@media (max-width: 560px) {
		.hero-value {
			font-size: 52px;
		}

		.search {
			max-width: none;
		}

		.walk-in-label {
			display: none;
		}
	}
</style>
