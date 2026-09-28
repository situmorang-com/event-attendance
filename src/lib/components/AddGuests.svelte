<script lang="ts">
	import { enhance } from '$app/forms';
	import { nameFromLinkedin, REPLY_LABEL, type Reply } from '$lib/invitations';
	import ListPlus from '@lucide/svelte/icons/list-plus';
	import SquarePen from '@lucide/svelte/icons/square-pen';
	import X from '@lucide/svelte/icons/x';

	interface Person {
		id: string;
		name: string;
		jobTitle: string;
		email: string | null;
		invited: boolean;
	}

	interface AddResult {
		added: number;
		duplicates: string[];
		skipped: string[];
		truncated: boolean;
		company: string;
	}

	/** One person, field by field, while being checked before saving. */
	interface Entry {
		key: number;
		name: string;
		company: string;
		jobTitle: string;
		email: string;
		phone: string;
		linkedin: string;
		reply: Reply;
		note: string;
	}

	interface Props {
		eventId: string;
		/** Nobody is on the list yet, so explain what the list is for. */
		first?: boolean;
		autofocus?: boolean;
		onclose: () => void;
	}

	let { eventId, first = false, autofocus = false, onclose }: Props = $props();

	let company = $state('');
	let names = $state('');
	let people = $state<Person[]>([]);
	let picked = $state<string[]>([]);
	let busy = $state(false);
	let message = $state('');
	let problem = $state('');
	let refresh = $state(0);
	/** null while typing; the rows being checked once "Check each field" is pressed. */
	let entries = $state<Entry[] | null>(null);
	let nextKey = 0;
	const REPLY_ORDER: Reply[] = ['pending', 'yes', 'maybe', 'no'];

	const PLACEHOLDER =
		'Rina Wijaya\nAndi Pratama, IT Manager, andi@bataviafoods.co.id, 0812 3456 7890';

	// Everyone the contact database knows at this company, looked up as the name is typed.
	$effect(() => {
		const q = company.trim();
		void refresh;
		if (!q) {
			people = [];
			picked = [];
			return;
		}
		const controller = new AbortController();
		const timer = setTimeout(async () => {
			try {
				const url = `/admin/events/${eventId}/invitations/people.json?company=${encodeURIComponent(q)}`;
				const res = await fetch(url, { signal: controller.signal });
				if (!res.ok) return;
				people = ((await res.json()) as { people: Person[] }).people;
				picked = picked.filter((id) => people.some((p) => p.id === id && !p.invited));
			} catch {
				// Aborted by the next keystroke, or offline: keep what's showing.
			}
		}, 200);
		return () => {
			clearTimeout(timer);
			controller.abort();
		};
	});

	const available = $derived(people.filter((p) => !p.invited));
	const allPicked = $derived(available.length > 0 && available.every((p) => picked.includes(p.id)));

	function toggleAll() {
		picked = allPicked ? [] : available.map((p) => p.id);
	}

	function listNames(list: string[]) {
		return list.length <= 3
			? list.join(', ')
			: `${list.slice(0, 2).join(', ')} and ${list.length - 2} others`;
	}

	function summarize(r: AddResult) {
		const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
		const parts: string[] = [];
		if (r.added)
			parts.push(
				`Added ${plural(r.added, 'person', 'people')}${r.company ? ` from ${r.company}` : ''}.`
			);
		if (r.duplicates.length)
			parts.push(
				`${listNames(r.duplicates)} ${r.duplicates.length === 1 ? 'was' : 'were'} already on the list.`
			);
		if (r.skipped.length)
			parts.push(
				`Skipped ${plural(r.skipped.length, 'line', 'lines')} without a name. Use “Check each field” to fill them in.`
			);
		if (r.truncated) parts.push('Only the first 1,000 lines were read.');
		return parts.join(' ');
	}

	function entry(fields: Partial<Omit<Entry, 'key'>> = {}): Entry {
		return {
			key: nextKey++,
			name: '',
			company: company.trim(),
			jobTitle: '',
			email: '',
			phone: '',
			linkedin: '',
			reply: 'pending',
			note: '',
			...fields
		};
	}

	/** Splits the typed lines into fields on the server, the same way adding them would. */
	async function review() {
		busy = true;
		problem = '';
		message = '';
		try {
			const res = await fetch(`/admin/events/${eventId}/invitations/review.json`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ company, names })
			});
			if (!res.ok) throw new Error(String(res.status));
			const { guests } = (await res.json()) as {
				guests: (Omit<Entry, 'key' | 'email' | 'phone' | 'linkedin'> & {
					email: string | null;
					phone: string | null;
					linkedin: string | null;
				})[];
			};
			entries = guests.length
				? guests.map((g) =>
						entry({ ...g, email: g.email ?? '', phone: g.phone ?? '', linkedin: g.linkedin ?? '' })
					)
				: [entry()];
		} catch {
			problem = 'Couldn’t split those lines. Please try again.';
		} finally {
			busy = false;
		}
	}

	// A profile link pasted into an empty row usually spells out the name.
	function fillNameFromLinkedin(e: Entry) {
		if (!e.name.trim() && e.linkedin.includes('/in/')) e.name = nameFromLinkedin(e.linkedin) ?? '';
	}

	// Only the reviewed rows can be counted exactly; typed lines are split on the server.
	const toAdd = $derived(entries ? entries.length + picked.length : null);
	const canAdd = $derived(entries ? !!toAdd : !!names.trim() || picked.length > 0);

	function maybeFocus(node: HTMLInputElement) {
		if (autofocus) node.focus();
	}
</script>

<form
	class="card add rise"
	method="POST"
	action="?/add"
	use:enhance={() => {
		busy = true;
		message = '';
		problem = '';
		return async ({ result, update }) => {
			await update({ reset: false });
			busy = false;
			if (result.type === 'success' && result.data) {
				message = summarize(result.data as unknown as AddResult);
				names = '';
				entries = null;
				picked = [];
				refresh++;
			} else if (result.type === 'failure') {
				problem = String(result.data?.addError ?? 'That didn’t work. Please try again.');
			}
		};
	}}
>
	<div class="add-head">
		<div>
			<h2>{first ? 'Start your guest list' : 'Add people'}</h2>
			<p class="muted">
				{first
					? 'List who you’re inviting, company by company, then record each reply as it comes in. On the day, everyone who checks in is ticked off.'
					: 'Pick people from your contacts, type names, or paste rows from a spreadsheet.'}
			</p>
		</div>
		<button type="button" class="btn btn-ghost btn-icon btn-sm" onclick={onclose} title="Close">
			<X size={18} /><span class="sr-only">Close</span>
		</button>
	</div>

	<div class="field company">
		<label class="label" for="add-company">Company</label>
		<input
			class="input"
			id="add-company"
			name="company"
			list="company-options"
			autocomplete="off"
			placeholder="Batavia Foods"
			bind:value={company}
			use:maybeFocus
		/>
	</div>

	{#if people.length}
		<fieldset class="contacts">
			<div class="contacts-head">
				<legend class="label">
					In your contacts <span class="optional">· {people.length} at {company.trim()}</span>
				</legend>
				{#if available.length > 1}
					<button type="button" class="btn btn-ghost btn-sm" onclick={toggleAll}>
						{allPicked ? 'Clear' : 'Select all'}
					</button>
				{/if}
			</div>
			<div class="picks">
				{#each people as person (person.id)}
					<label class="pick" class:done={person.invited}>
						{#if person.invited}
							<input type="checkbox" checked disabled />
						{:else}
							<input type="checkbox" name="contact" value={person.id} bind:group={picked} />
						{/if}
						<span class="pick-text">
							<span class="pick-name">{person.name}</span>
							<span class="pick-meta">
								{person.invited ? 'On the list' : person.jobTitle || person.email || ''}
							</span>
						</span>
					</label>
				{/each}
			</div>
		</fieldset>
	{/if}

	{#if entries}
		<fieldset class="entries">
			<div class="entries-head">
				<legend class="label">
					Check each person <span class="optional">· nothing is saved until you add them</span>
				</legend>
				<button type="button" class="btn btn-ghost btn-sm" onclick={() => (entries = null)}>
					Edit as text
				</button>
			</div>
			<input type="hidden" name="guests" value={JSON.stringify(entries)} />
			{#each entries as e, i (e.key)}
				<div class="entry">
					<div class="entry-head">
						<span class="entry-number">{i + 1}</span>
						<button
							type="button"
							class="btn btn-ghost btn-icon btn-sm"
							title="Remove this row"
							onclick={() => entries?.splice(i, 1)}
						>
							<X size={16} /><span class="sr-only">Remove row {i + 1}</span>
						</button>
					</div>
					<div class="entry-fields">
						<label class="cell wide">
							<span class="cell-label">Name</span>
							<input
								class="input"
								bind:value={e.name}
								required
								aria-invalid={e.name.trim() ? undefined : 'true'}
								placeholder={e.linkedin ? 'Not in the link: type it' : ''}
							/>
						</label>
						<label class="cell">
							<span class="cell-label">Company</span>
							<input
								class="input"
								bind:value={e.company}
								list="company-options"
								autocomplete="off"
							/>
						</label>
						<label class="cell">
							<span class="cell-label">Job title</span>
							<input class="input" bind:value={e.jobTitle} />
						</label>
						<label class="cell wide">
							<span class="cell-label">Email</span>
							<input class="input" type="email" bind:value={e.email} />
						</label>
						<label class="cell">
							<span class="cell-label">Mobile</span>
							<input class="input" type="tel" bind:value={e.phone} />
						</label>
						<label class="cell wide">
							<span class="cell-label">LinkedIn</span>
							<input
								class="input"
								bind:value={e.linkedin}
								placeholder="linkedin.com/in/…"
								onblur={() => fillNameFromLinkedin(e)}
							/>
						</label>
						<label class="cell">
							<span class="cell-label">Reply</span>
							<select class="input" bind:value={e.reply}>
								{#each REPLY_ORDER as r (r)}<option value={r}>{REPLY_LABEL[r]}</option>{/each}
							</select>
						</label>
						<label class="cell wide">
							<span class="cell-label">Note</span>
							<input class="input" bind:value={e.note} />
						</label>
					</div>
				</div>
			{/each}
			<button
				type="button"
				class="btn btn-soft btn-sm add-row"
				onclick={() => entries?.push(entry())}
			>
				<ListPlus size={16} /> Add a row
			</button>
		</fieldset>
	{:else}
		<div class="field">
			<label class="label" for="add-names">{people.length ? 'Anyone else' : 'Names'}</label>
			<textarea
				class="input textarea"
				id="add-names"
				name="names"
				rows="5"
				placeholder={PLACEHOLDER}
				bind:value={names}></textarea>
			<p class="hint">
				One person per line. After the name you can add a job title, email, mobile or LinkedIn link,
				separated by commas; a LinkedIn link on its own is enough. Pasting from a spreadsheet?
				Include its header row (Name, Company, Email, Mobile…) and each column lands in the right
				place. Use <strong>Check each field</strong> to see and fix every field before anything is saved.
			</p>
		</div>
	{/if}

	{#if message}<p class="banner banner-brand" role="status">{message}</p>{/if}
	{#if problem}<p class="error-text" role="alert">{problem}</p>{/if}

	<div class="add-actions">
		<button type="button" class="btn btn-ghost" onclick={onclose}
			>{message ? 'Done' : 'Cancel'}</button
		>
		{#if !entries}
			<button type="button" class="btn btn-secondary" disabled={busy} onclick={review}>
				<SquarePen size={16} /> Check each field
			</button>
		{/if}
		<button class="btn btn-primary" disabled={busy || !canAdd}>
			{#if busy}<span class="spinner"></span>{/if}
			{toAdd ? `Add ${toAdd} to guest list` : 'Add to guest list'}
		</button>
	</div>
</form>

<style>
	.add {
		display: grid;
		gap: 16px;
		padding: 20px;
		margin-bottom: 14px;
	}

	.add-head {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 12px;
	}

	.add-head h2 {
		font-size: 19px;
		margin-bottom: 4px;
	}

	.add-head p {
		font-size: 14.5px;
		max-width: 620px;
	}

	.company {
		max-width: 420px;
	}

	.contacts {
		border: 0;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 8px;
		min-width: 0;
	}

	.contacts-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}

	.contacts-head legend {
		padding: 0;
	}

	.picks {
		display: grid;
		gap: 8px;
		grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
		max-height: 264px;
		overflow-y: auto;
		padding: 2px;
	}

	.pick {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 10px 12px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border-strong);
		background: var(--surface);
		cursor: pointer;
		transition:
			border-color 0.15s ease,
			background-color 0.15s ease;
	}

	.pick:hover:not(.done) {
		border-color: color-mix(in oklab, var(--brand) 45%, var(--border-strong));
	}

	.pick:has(input:checked):not(.done) {
		border-color: var(--brand);
		background: var(--brand-soft);
	}

	.pick.done {
		cursor: default;
		opacity: 0.6;
	}

	.pick input {
		flex: none;
		width: 18px;
		height: 18px;
		margin: 0;
		accent-color: var(--brand);
	}

	.pick-text {
		display: grid;
		min-width: 0;
	}

	.pick-name {
		font-weight: 650;
		font-size: 14.5px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.pick-meta {
		font-size: 13px;
		color: var(--muted);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.textarea {
		height: auto;
		min-height: 128px;
		padding: 12px 14px;
		line-height: 1.5;
		resize: vertical;
	}

	.add-actions {
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-end;
		gap: 8px;
	}

	.entries {
		border: 0;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 10px;
		min-width: 0;
	}

	.entries-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}

	.entries-head legend {
		padding: 0;
	}

	.entry {
		display: grid;
		grid-template-columns: 28px minmax(0, 1fr);
		gap: 10px;
		padding: 12px;
		border-radius: var(--radius);
		border: 1px solid var(--border-strong);
		background: var(--surface);
	}

	.entry:has([aria-invalid='true']) {
		border-color: color-mix(in oklab, var(--bad) 45%, var(--border-strong));
	}

	.entry-head {
		display: grid;
		justify-items: center;
		align-content: start;
		gap: 6px;
		padding-top: 22px;
	}

	.entry-number {
		display: grid;
		place-items: center;
		width: 24px;
		height: 24px;
		border-radius: 50%;
		background: var(--surface-2);
		color: var(--muted);
		font-size: 12px;
		font-weight: 700;
	}

	.entry-head .btn {
		--h: 28px;
	}

	.entry-fields {
		display: grid;
		gap: 8px 10px;
		grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
	}

	.cell {
		display: grid;
		gap: 4px;
		min-width: 0;
	}

	.cell.wide {
		grid-column: span 2;
	}

	.cell-label {
		font-size: 12.5px;
		font-weight: 650;
		color: var(--muted);
	}

	.cell .input {
		height: 40px;
		padding: 0 10px;
		border-radius: 10px;
	}

	.add-row {
		justify-self: start;
	}

	@media (max-width: 560px) {
		.cell.wide {
			grid-column: 1 / -1;
		}

		.entry-fields {
			grid-template-columns: 1fr 1fr;
		}
	}
</style>
