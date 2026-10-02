<script lang="ts">
	let { size = 32, wordmark = true }: { size?: number; wordmark?: boolean } = $props();
	const uid = $props.id();
	const id = `logo-${uid}`;
</script>

<span class="logo">
	<svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
		<defs>
			<linearGradient {id} x1="0" y1="0" x2="1" y2="1">
				<stop offset="0" stop-color="#7a5cff" />
				<stop offset="1" stop-color="#2f6fe4" />
			</linearGradient>
		</defs>
		<rect width="64" height="64" rx="18" fill="url(#{id})" />
		<rect x="14" y="14" width="36" height="36" rx="11" fill="none" stroke="#fff" stroke-width="5" />
		<path
			d="M24 32.5l6 6 11-13"
			fill="none"
			stroke="#fff"
			stroke-width="5.5"
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
	</svg>
	{#if wordmark}<span class="word">Event Planner</span>{/if}
</span>

<style>
	.logo {
		display: inline-flex;
		align-items: center;
		gap: 10px;
	}

	.word {
		font-size: 19px;
		font-weight: 800;
		letter-spacing: -0.03em;
		color: var(--text);
		white-space: nowrap;
	}
</style>
