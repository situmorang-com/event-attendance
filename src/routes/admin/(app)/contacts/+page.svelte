<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { initials } from '$lib/names';
	import { timeAgo } from '$lib/time';
	import Download from '@lucide/svelte/icons/download';
	import Search from '@lucide/svelte/icons/search';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let timer: ReturnType<typeof setTimeout>;
	function search(value: string) {
		clearTimeout(timer);
		timer = setTimeout(() => {
			const url = value ? `?q=${encodeURIComponent(value)}` : '?';
			goto(url, { keepFocus: true, replaceState: true, noScroll: true });
		}, 250);
	}
</script>

<svelte:head>
	<title>Contacts · Hadir</title>
</svelte:head>

<div class="head">
	<div>
		<h1>Contacts</h1>
		<p class="muted">
			{data.total.toLocaleString()} people, de-duplicated by email across every event
		</p>
	</div>
	<a class="btn btn-secondary" href="/admin/contacts/export.csv"
		><Download size={17} /> Export CSV</a
	>
</div>

<section class="card">
	<form class="tools" method="GET" onsubmit={(e) => e.preventDefault()}>
		<label class="search">
			<Search size={17} />
			<span class="sr-only">Search contacts</span>
			<input
				class="input"
				type="search"
				name="q"
				value={data.q}
				placeholder="Search name, email, company or mobile"
				oninput={(e) => search(e.currentTarget.value)}
			/>
		</label>
		{#if data.q}<p class="muted">
				{data.contacts.length} match{data.contacts.length === 1 ? '' : 'es'}
			</p>{/if}
	</form>

	{#if data.contacts.length === 0}
		<p class="placeholder muted">
			{data.q ? `No one matches “${data.q}”.` : 'Contacts appear here as soon as people check in.'}
		</p>
	{:else}
		<div class="table-wrap">
			<table class="table">
				<thead>
					<tr>
						<th>Name</th>
						<th>Email</th>
						<th>Mobile</th>
						<th>Company</th>
						<th>Events</th>
						<th>Last seen</th>
						<th><span class="sr-only">Actions</span></th>
					</tr>
				</thead>
				<tbody>
					{#each data.contacts as c (c.id)}
						<tr>
							<td>
								<div class="person">
									<span class="avatar" aria-hidden="true">{initials(c.name)}</span>
									<span class="person-name">{c.name}</span>
								</div>
							</td>
							<td
								>{#if c.email}<a href="mailto:{c.email}">{c.email}</a>{:else}<span class="muted"
										>–</span
									>{/if}</td
							>
							<td class="num">
								{#if c.phone}
									<a
										href="https://wa.me/{c.phone.replace(/\D/g, '')}"
										target="_blank"
										rel="noreferrer"
										title="Open in WhatsApp">{c.phone}</a
									>
								{:else}<span class="muted">–</span>{/if}
							</td>
							<td>
								{c.company || '–'}
								{#if c.job_title}<div class="muted small">{c.job_title}</div>{/if}
							</td>
							<td class="num">{c.events_attended}</td>
							<td class="last-seen">
								{#if c.last_seen_at}
									<div>{c.last_event_name}</div>
									<div class="muted small">{timeAgo(c.last_seen_at, data.now)}</div>
								{:else}<span class="muted">–</span>{/if}
							</td>
							<td>
								<form
									method="POST"
									action="?/delete"
									use:enhance={({ cancel }) => {
										if (!confirm(`Permanently delete ${c.name} and their check-in history?`))
											cancel();
									}}
								>
									<input type="hidden" name="id" value={c.id} />
									<button class="btn btn-ghost btn-icon btn-sm" title="Delete contact">
										<Trash2 size={16} /><span class="sr-only">Delete {c.name}</span>
									</button>
								</form>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</section>

<style>
	.head {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 16px;
		flex-wrap: wrap;
		margin-bottom: 24px;
	}

	h1 {
		font-size: 32px;
		margin-bottom: 4px;
	}

	section {
		padding: 16px 0 8px;
		overflow: hidden;
	}

	.tools {
		display: flex;
		align-items: center;
		gap: 14px;
		padding: 0 16px 14px;
		flex-wrap: wrap;
	}

	.search {
		position: relative;
		display: flex;
		align-items: center;
		color: var(--muted);
		flex: 1;
		max-width: 420px;
	}

	.search :global(svg) {
		position: absolute;
		left: 12px;
		pointer-events: none;
	}

	.search .input {
		height: 44px;
		padding-left: 38px;
	}

	.placeholder {
		padding: 36px 16px;
		text-align: center;
	}

	.table :global(th:first-child),
	.table :global(td:first-child) {
		padding-left: 20px;
	}

	.person {
		display: flex;
		align-items: center;
		gap: 10px;
		min-width: 170px;
	}

	.person-name {
		font-weight: 650;
	}

	.avatar {
		flex: none;
		display: grid;
		place-items: center;
		width: 34px;
		height: 34px;
		border-radius: 50%;
		background: var(--brand-soft);
		color: var(--brand-text);
		font-size: 12.5px;
		font-weight: 750;
	}

	.small {
		font-size: 13px;
	}

	.last-seen {
		min-width: 190px;
	}

	td a {
		color: inherit;
		text-decoration: none;
	}

	td a:hover {
		color: var(--brand-text);
		text-decoration: underline;
	}
</style>
