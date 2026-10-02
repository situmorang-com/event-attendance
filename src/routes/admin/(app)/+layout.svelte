<script lang="ts">
	import { page } from '$app/state';
	import Logo from '$lib/components/Logo.svelte';
	import LogOut from '@lucide/svelte/icons/log-out';

	let { children } = $props();

	const links = [
		{
			href: '/admin',
			label: 'Events',
			active: (p: string) => p === '/admin' || p.startsWith('/admin/events')
		},
		{
			href: '/admin/contacts',
			label: 'Contacts',
			active: (p: string) => p.startsWith('/admin/contacts')
		}
	];
</script>

<div class="shell">
	<header>
		<div class="bar">
			<a href="/admin" class="home" aria-label="Event Planner home"><Logo size={30} /></a>
			<nav>
				{#each links as link (link.href)}
					<a href={link.href} aria-current={link.active(page.url.pathname) ? 'page' : undefined}>
						{link.label}
					</a>
				{/each}
			</nav>
			<form method="POST" action="/admin/logout">
				<button class="btn btn-ghost btn-sm" aria-label="Sign out"
					><LogOut size={17} /><span class="label-text">Sign out</span></button
				>
			</form>
		</div>
	</header>

	<main>
		{@render children()}
	</main>
</div>

<style>
	.shell {
		min-height: 100dvh;
	}

	header {
		position: sticky;
		top: 0;
		z-index: 20;
		background: color-mix(in oklab, var(--bg) 82%, transparent);
		backdrop-filter: saturate(1.4) blur(14px);
		-webkit-backdrop-filter: saturate(1.4) blur(14px);
		border-bottom: 1px solid var(--border);
	}

	.bar {
		max-width: 1200px;
		margin: 0 auto;
		height: 64px;
		padding: 0 16px;
		display: flex;
		align-items: center;
		gap: 20px;
	}

	.home {
		text-decoration: none;
	}

	nav {
		display: flex;
		gap: 4px;
		flex: 1;
	}

	nav a {
		padding: 8px 12px;
		border-radius: 10px;
		font-weight: 650;
		font-size: 15px;
		color: var(--text-2);
		text-decoration: none;
		transition: background-color 0.15s ease;
	}

	nav a:hover {
		background: var(--surface-2);
		color: var(--text);
	}

	nav a[aria-current='page'] {
		background: var(--surface);
		color: var(--text);
		box-shadow: var(--shadow-sm);
		border: 1px solid var(--border);
		padding: 7px 11px;
	}

	main {
		max-width: 1200px;
		margin: 0 auto;
		padding: 28px 16px 80px;
	}

	@media (max-width: 560px) {
		.home :global(.word),
		.label-text {
			display: none;
		}

		.bar {
			gap: 10px;
		}
	}
</style>
