<script lang="ts">
  let { message }: { message: string } = $props()
</script>

<div class="toast" role="status" aria-live="polite">{message}</div>

<style>
  .toast {
    min-height: 1.5rem;
    color: var(--muted);
  }
</style>
