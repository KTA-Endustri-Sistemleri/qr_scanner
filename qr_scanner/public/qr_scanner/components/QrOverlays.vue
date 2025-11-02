<script setup lang="ts">
type Props = {
  mode: 'none' | 'loading' | 'success' | 'warning';
  successName?: string | null;
  warnMsg?: string | null;
};
const props = withDefaults(defineProps<Props>(), {
  mode: 'none',
  successName: null,
  warnMsg: 'Code must be exactly 33 characters. Please rescan.',
});
</script>

<template>
  <!-- OPAQUE LOADING -->
  <div
    id="overlayLoading"
    class="qr-overlay loading"
    aria-hidden="true"
    :style="{ display: props.mode === 'loading' ? 'block' : 'none', pointerEvents: props.mode === 'loading' ? 'all' : 'none' }"
  >
    <div class="qr-overlay-content" aria-live="polite">
      <div class="qr-spinner" aria-hidden="true"></div>
      <div>Processing…</div>
      <div class="qr-help" style="color:#fff;opacity:.9">Submitting record, please wait.</div>
    </div>
  </div>

  <!-- OPAQUE SUCCESS -->
  <div
    id="overlaySuccess"
    class="qr-overlay success"
    aria-hidden="true"
    :style="{ display: props.mode === 'success' ? 'block' : 'none', pointerEvents: props.mode === 'success' ? 'all' : 'none' }"
  >
    <div class="qr-overlay-content" aria-live="polite">
      <div class="qr-dot-ok" aria-hidden="true"></div>
      <div>Saved</div>
      <div id="successDesc" class="qr-help" style="color:#fff;opacity:.9">
        {{ props.successName ? `Document: ${props.successName}` : 'Done.' }}
      </div>
    </div>
  </div>

  <!-- OPAQUE WARNING -->
  <div
    id="overlayWarn"
    class="qr-overlay warning"
    aria-hidden="true"
    :style="{ display: props.mode === 'warning' ? 'block' : 'none', pointerEvents: props.mode === 'warning' ? 'all' : 'none' }"
  >
    <div class="qr-overlay-content" aria-live="polite">
      <div class="qr-dot-ok" aria-hidden="true"></div>
      <div>Warning</div>
      <div id="warnDesc" class="qr-help" style="color:#fff;opacity:.9">
        {{ props.warnMsg }}
      </div>
    </div>
  </div>
</template>