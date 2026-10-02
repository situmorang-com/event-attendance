<script lang="ts">
	import Logo from '$lib/components/Logo.svelte';
	import ScanLine from '@lucide/svelte/icons/scan-line';
	import ContactRound from '@lucide/svelte/icons/contact-round';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import BookUser from '@lucide/svelte/icons/book-user';
</script>

<svelte:head>
	<title>Event Planner · Scan. Tap. You’re in.</title>
</svelte:head>

<div class="aurora" aria-hidden="true"></div>

<header>
	<Logo />
	<a class="btn btn-ghost btn-sm" href="/admin">Organizer sign in</a>
</header>

<main>
	<section class="hero rise">
		<p class="pill pill-brand"><ScanLine size={15} /> Event check-in, no app needed</p>
		<h1>Scan. Tap. <span class="gradient-text">You’re in.</span></h1>
		<p class="lede">
			Attendees scan the code at the door and fill in their details from their phone’s own contact
			card. You get a live arrivals screen and one clean contact list across every event.
		</p>
	</section>

	<section class="attendee card rise" style="animation-delay: 80ms">
		<div class="icon"><ScanLine size={26} /></div>
		<div>
			<h2>Here to check in?</h2>
			<p class="muted">
				Point your phone camera at the QR code at the entrance. The check-in page opens by itself.
			</p>
		</div>
	</section>

	<ul class="features">
		<li class="rise" style="animation-delay: 140ms">
			<ContactRound size={22} />
			<h3>From the phone’s contact card</h3>
			<p class="muted">
				iPhone AutoFill and Android’s contact picker fill name, email and mobile in one tap.
			</p>
		</li>
		<li class="rise" style="animation-delay: 200ms">
			<ShieldCheck size={22} />
			<h3>A QR code that can’t be forwarded</h3>
			<p class="muted">
				The entrance screen shows a new code every 20 seconds, so a shared photo stops working.
			</p>
		</li>
		<li class="rise" style="animation-delay: 260ms">
			<BookUser size={22} />
			<h3>One contact database</h3>
			<p class="muted">
				Repeat visitors are recognised by email, their details stay current, and it all exports to
				CSV.
			</p>
		</li>
	</ul>
</main>

<style>
	.aurora {
		position: fixed;
		inset: -20vmax -10vmax auto;
		height: 70vmax;
		z-index: -1;
		background:
			radial-gradient(
				40% 50% at 20% 30%,
				color-mix(in oklab, var(--aurora-1) 34%, transparent),
				transparent 70%
			),
			radial-gradient(
				35% 45% at 75% 20%,
				color-mix(in oklab, var(--aurora-2) 26%, transparent),
				transparent 70%
			),
			radial-gradient(
				30% 40% at 55% 60%,
				color-mix(in oklab, var(--aurora-3) 18%, transparent),
				transparent 70%
			);
		filter: blur(20px);
	}

	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		max-width: 1080px;
		margin: 0 auto;
		padding: 20px 16px;
	}

	main {
		max-width: 1080px;
		margin: 0 auto;
		padding: 24px 16px 72px;
		display: grid;
		gap: 40px;
	}

	.hero {
		display: grid;
		gap: 20px;
		justify-items: start;
		max-width: 760px;
		padding-top: 4vh;
	}

	h1 {
		font-size: clamp(44px, 9vw, 88px);
		font-weight: 800;
		letter-spacing: -0.045em;
		line-height: 0.98;
	}

	.lede {
		font-size: clamp(17px, 2.2vw, 20px);
		color: var(--text-2);
		max-width: 620px;
	}

	.attendee {
		display: flex;
		gap: 16px;
		align-items: center;
		padding: 20px;
		max-width: 560px;
	}

	.attendee h2 {
		font-size: 18px;
		margin-bottom: 4px;
	}

	.icon {
		flex: none;
		display: grid;
		place-items: center;
		width: 52px;
		height: 52px;
		border-radius: 16px;
		background: var(--grad);
		color: #fff;
		box-shadow: var(--glow);
	}

	.features {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
		gap: 16px;
	}

	.features li {
		display: grid;
		gap: 8px;
		align-content: start;
		padding: 22px;
		border-radius: var(--radius-lg);
		background: color-mix(in oklab, var(--surface) 70%, transparent);
		border: 1px solid var(--border);
		backdrop-filter: blur(12px);
		color: var(--brand-text);
	}

	.features h3 {
		font-size: 16.5px;
		color: var(--text);
		margin-top: 6px;
	}

	.features p {
		font-size: 15px;
	}
</style>
