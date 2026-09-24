<script lang="ts">
	import '@fontsource-variable/plus-jakarta-sans';
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Hadir · Event check-in</title>
</svelte:head>

{@render children()}
