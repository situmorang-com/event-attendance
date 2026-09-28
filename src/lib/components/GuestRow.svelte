<script lang="ts">
	import { enhance } from '$app/forms';
	import {
		followUpLink,
		followUpMessage,
		greetingName,
		REPLY_LABEL,
		type Guest,
		type Reply
	} from '$lib/invitations';
	import { initials } from '$lib/names';
	import { formatTime } from '$lib/time';
	import Check from '@lucide/svelte/icons/check';
	import CircleQuestionMark from '@lucide/svelte/icons/circle-question-mark';
	import Mail from '@lucide/svelte/icons/mail';
	import MessageCircle from '@lucide/svelte/icons/message-circle';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import X from '@lucide/svelte/icons/x';

	interface EditValues {
		name: string;
		company: string;
		jobTitle: string;
		email: string;
		phone: string;
		linkedin: string;
	}

	interface Props {
		guest: Guest;
		/** What to show, which may run ahead of `guest.reply` while a change is saving. */
		reply: Reply;
		event: { name: string; venue: string; starts_at: number | null; timezone: string };
		/** Set after a failed save of this guest's details. */
		errors?: Record<string, string | undefined>;
		values?: EditValues | null;
		/** Called as a reply is sent; returns a function to call once it has saved. */
		onreply: (reply: Reply) => () => void;
	}

	let { guest, reply, event, errors = {}, values = null, onreply }: Props = $props();

	let editing = $state(false);

	const CHOICES = [
		{ reply: 'yes', icon: Check },
		{ reply: 'maybe', icon: CircleQuestionMark },
		{ reply: 'no', icon: X }
	] as const;

	// What the prepared message does, so the button can say so.
	const PURPOSE: Record<Reply, string> = {
		pending: 'Invite',
		yes: 'Confirm with',
		maybe: 'Follow up with',
		no: 'Thank'
	};

	const details = $derived([guest.job_title, guest.email, guest.phone].filter(Boolean));
	const first = $derived(greetingName(guest.name));
	const link = $derived(followUpLink(guest, event.name, followUpMessage(reply, guest.name, event)));
	const linkLabel = $derived(
		link && `${PURPOSE[reply]} ${first} ${link.via === 'whatsapp' ? 'on WhatsApp' : 'by email'}`
	);
	const fields = $derived<EditValues>(
		values ?? {
			name: guest.name,
			company: guest.company,
			jobTitle: guest.job_title,
			email: guest.email ?? '',
			phone: guest.phone ?? '',
			linkedin: guest.linkedin ?? ''
		}
	);

	function focus(node: HTMLInputElement) {
		node.focus();
		node.select();
	}

	function closeOnEscape(e: KeyboardEvent) {
		if (e.key === 'Escape') editing = false;
	}

	// Saved on leaving the field (Enter leaves it too), and only when it actually changed.
	function saveNote(e: FocusEvent & { currentTarget: HTMLInputElement }) {
		const input = e.currentTarget;
		if (input.value.replace(/\s+/g, ' ').trim() !== guest.note) input.form?.requestSubmit();
	}

	function noteKeys(e: KeyboardEvent & { currentTarget: HTMLInputElement }) {
		if (e.key === 'Enter') {
			e.preventDefault();
			e.currentTarget.blur();
		} else if (e.key === 'Escape') {
			e.currentTarget.value = guest.note;
			e.currentTarget.blur();
		}
	}
</script>

<li class="row" class:editing>
	{#if editing}
		<form
			class="edit"
			method="POST"
			action="?/update"
			use:enhance={({ action, cancel }) => {
				if (action.search.includes('remove') && !confirm(`Remove ${guest.name} from the list?`)) {
					cancel();
					return;
				}
				return async ({ result, update }) => {
					await update({ reset: false });
					if (result.type === 'success') editing = false;
				};
			}}
		>
			<input type="hidden" name="id" value={guest.id} />
			<div class="edit-grid">
				<div class="field">
					<label class="label" for="name-{guest.id}">Name</label>
					<input
						class="input"
						id="name-{guest.id}"
						name="name"
						onkeydown={closeOnEscape}
						value={fields.name}
						required
						use:focus
						aria-invalid={errors.name ? 'true' : undefined}
					/>
					{#if errors.name}<p class="error-text">{errors.name}</p>{/if}
				</div>
				<div class="field">
					<label class="label" for="title-{guest.id}">Job title</label>
					<input
						class="input"
						id="title-{guest.id}"
						name="jobTitle"
						onkeydown={closeOnEscape}
						value={fields.jobTitle}
					/>
				</div>
				<div class="field">
					<label class="label" for="company-{guest.id}">Company</label>
					<input
						class="input"
						id="company-{guest.id}"
						name="company"
						onkeydown={closeOnEscape}
						list="company-options"
						autocomplete="off"
						value={fields.company}
					/>
				</div>
				<div class="field">
					<label class="label" for="email-{guest.id}">Email</label>
					<input
						class="input"
						id="email-{guest.id}"
						name="email"
						onkeydown={closeOnEscape}
						type="email"
						value={fields.email}
						aria-invalid={errors.email ? 'true' : undefined}
					/>
					{#if errors.email}<p class="error-text">{errors.email}</p>{/if}
				</div>
				<div class="field">
					<label class="label" for="phone-{guest.id}">Mobile</label>
					<input
						class="input"
						id="phone-{guest.id}"
						name="phone"
						onkeydown={closeOnEscape}
						type="tel"
						value={fields.phone}
					/>
				</div>
				<div class="field">
					<label class="label" for="linkedin-{guest.id}">LinkedIn</label>
					<input
						class="input"
						id="linkedin-{guest.id}"
						name="linkedin"
						onkeydown={closeOnEscape}
						placeholder="linkedin.com/in/…"
						value={fields.linkedin}
						aria-invalid={errors.linkedin ? 'true' : undefined}
					/>
					{#if errors.linkedin}<p class="error-text">{errors.linkedin}</p>{/if}
				</div>
			</div>
			<div class="edit-actions">
				<button class="btn btn-danger btn-sm" formaction="?/remove" formnovalidate>
					<Trash2 size={15} /> Remove
				</button>
				<span class="spacer"></span>
				<button type="button" class="btn btn-ghost btn-sm" onclick={() => (editing = false)}>
					Cancel
				</button>
				<button class="btn btn-primary btn-sm">Save</button>
			</div>
		</form>
	{:else}
		<div class="person">
			<span class="avatar" aria-hidden="true">{initials(guest.name)}</span>
			<div class="who">
				<p class="name-line">
					<span class="person-name">{guest.name}</span>
					{#if guest.arrived_at}
						<span class="pill pill-good tiny">
							<Check size={12} strokeWidth={3} /> Checked in {formatTime(
								guest.arrived_at,
								event.timezone
							)}
						</span>
					{/if}
				</p>
				{#if details.length || guest.linkedin}
					<p class="details">
						{details.join(' · ')}{details.length && guest.linkedin
							? ' · '
							: ''}{#if guest.linkedin}<a
								href={guest.linkedin}
								target="_blank"
								rel="noreferrer"
								title="Open {first}’s LinkedIn profile">LinkedIn</a
							>{/if}
					</p>
				{/if}
			</div>
		</div>

		<form
			class="note-form"
			method="POST"
			action="?/note"
			use:enhance={() =>
				async ({ update }) =>
					update({ reset: false })}
		>
			<input type="hidden" name="id" value={guest.id} />
			<input
				class="note"
				name="note"
				value={guest.note}
				placeholder="Add a note"
				aria-label="Note about {guest.name}"
				maxlength="300"
				autocomplete="off"
				onkeydown={noteKeys}
				onblur={saveNote}
			/>
		</form>

		<form
			class="reply-form"
			method="POST"
			action="?/reply"
			use:enhance={({ formData }) => {
				const settle = onreply(formData.get('reply') as Reply);
				return async ({ update }) => {
					await update({ reset: false });
					settle();
				};
			}}
		>
			<input type="hidden" name="id" value={guest.id} />
			<div class="reply" role="group" aria-label="Reply from {guest.name}">
				{#each CHOICES as choice (choice.reply)}
					{@const on = reply === choice.reply}
					<button
						class="choice {choice.reply}"
						name="reply"
						value={on ? 'pending' : choice.reply}
						aria-pressed={on}
						title={on ? 'Click again to clear the reply' : undefined}
					>
						<choice.icon size={16} />
						<span>{REPLY_LABEL[choice.reply]}</span>
					</button>
				{/each}
			</div>
		</form>

		<div class="actions">
			{#if link}
				<a
					class="btn btn-ghost btn-icon btn-sm"
					href={link.href}
					target="_blank"
					rel="noreferrer"
					title={linkLabel}
				>
					{#if link.via === 'whatsapp'}<MessageCircle size={17} />{:else}<Mail size={17} />{/if}
					<span class="sr-only">{linkLabel}</span>
				</a>
			{/if}
			<button
				class="btn btn-ghost btn-icon btn-sm"
				onclick={() => (editing = true)}
				title="Edit details"
			>
				<Pencil size={16} /><span class="sr-only">Edit {guest.name}</span>
			</button>
		</div>
	{/if}
</li>

<style>
	.row {
		display: grid;
		/* Fixed-width actions, so rows with and without a message button line up. */
		grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr) auto 76px;
		grid-template-areas: 'person note reply actions';
		align-items: center;
		gap: 8px 14px;
		padding: 10px 16px 10px 20px;
		border-top: 1px solid var(--border);
		transition: background-color 0.15s ease;
	}

	.row:hover:not(.editing) {
		background: color-mix(in oklab, var(--surface-2) 55%, transparent);
	}

	.row.editing {
		grid-template-columns: minmax(0, 1fr);
		grid-template-areas: 'edit';
		background: var(--surface-2);
		padding: 16px 20px;
	}

	.person {
		grid-area: person;
		display: flex;
		align-items: center;
		gap: 12px;
		min-width: 0;
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

	.who {
		min-width: 0;
	}

	.name-line {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 2px 8px;
	}

	.person-name {
		font-weight: 650;
	}

	.tiny {
		gap: 4px;
		padding: 2px 8px;
		font-size: 12px;
	}

	.details {
		font-size: 13.5px;
		color: var(--muted);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.details a {
		color: inherit;
		font-weight: 600;
	}

	.details a:hover {
		color: var(--brand-text);
	}

	.note-form {
		grid-area: note;
		min-width: 0;
	}

	.note {
		width: 100%;
		height: 36px;
		padding: 0 10px;
		border-radius: 10px;
		border: 1px solid transparent;
		background: transparent;
		color: var(--text-2);
		/* 16px or iOS Safari zooms the page on focus. */
		font-size: 16px;
		text-overflow: ellipsis;
		transition:
			background-color 0.15s ease,
			border-color 0.15s ease,
			box-shadow 0.15s ease;
	}

	.note::placeholder {
		color: color-mix(in oklab, var(--muted) 70%, transparent);
	}

	.note:hover {
		background: var(--surface-2);
	}

	.note:focus {
		outline: none;
		background: var(--surface);
		border-color: var(--brand);
		box-shadow: var(--ring);
		color: var(--text);
	}

	.reply-form {
		grid-area: reply;
	}

	.reply {
		display: flex;
		gap: 3px;
		padding: 3px;
		border-radius: 12px;
		background: var(--surface-2);
	}

	.choice {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		height: 34px;
		padding: 0 11px;
		border: 0;
		border-radius: 9px;
		background: transparent;
		color: var(--text-2);
		font-size: 13.5px;
		font-weight: 650;
		white-space: nowrap;
		cursor: pointer;
		transition:
			background-color 0.15s ease,
			color 0.15s ease,
			box-shadow 0.15s ease;
	}

	.choice:hover {
		background: var(--surface);
		color: var(--text);
	}

	.choice[aria-pressed='true'].yes {
		background: var(--good-soft);
		color: var(--good);
		box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--good) 35%, transparent);
	}

	.choice[aria-pressed='true'].maybe {
		background: var(--warn-soft);
		color: var(--warn);
		box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--warn) 35%, transparent);
	}

	.choice[aria-pressed='true'].no {
		background: var(--bad-soft);
		color: var(--bad);
		box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--bad) 35%, transparent);
	}

	.actions {
		grid-area: actions;
		display: flex;
		justify-content: flex-end;
		gap: 2px;
	}

	.edit {
		grid-area: edit;
		display: grid;
		gap: 14px;
	}

	.edit-grid {
		display: grid;
		gap: 12px;
		grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
	}

	.edit .input {
		height: 44px;
	}

	.edit-actions {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.spacer {
		flex: 1;
	}

	@media (max-width: 900px) {
		.row {
			grid-template-columns: minmax(0, 1fr) 76px;
			grid-template-areas:
				'person actions'
				'reply reply'
				'note note';
			padding: 14px 16px;
		}

		.choice {
			flex: 1;
		}

		.note {
			background: var(--surface-2);
		}
	}

	@media (max-width: 380px) {
		.choice {
			padding: 0 6px;
			gap: 4px;
			font-size: 13px;
		}
	}
</style>
