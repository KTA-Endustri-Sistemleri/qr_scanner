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
<!-- components/QrOverlays.vue -->
<style scoped>
/* Kartı tamamen kaplayan opak overlay katmanı */
.qr-overlay{
  position: absolute;
  inset: 0;
  z-index: 1;
  border-radius: inherit;
  display: block;          /* görünürlüğü inline style ile yönetiyoruz */
  pointer-events: none;    /* görünürken tıklamalar bloklansın istiyorsan 'all' yapabilirsin */
}

.qr-overlay .qr-overlay-content{
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  width: 100%;
  height: 100%;
  gap: 8px;
  font-weight: 600;
  padding: 18px;
  color: inherit;
}

/* LOADING */
.qr-overlay.loading{
  background: #1e40af; /* blue-800 */
  color: #ffffff;
}
.qr-overlay.loading .qr-spinner{
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255,255,255,.35);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: qrs .8s linear infinite;
}

/* SUCCESS */
.qr-overlay.success{
  background: #166534; /* green-800 */
  color: #ffffff;
}
.qr-overlay.success .qr-dot-ok{
  width: 12px; height: 12px; border-radius: 50%; background: #ffffff;
}

/* WARNING */
.qr-overlay.warning{
  background: #92400e; /* amber-800 */
  color: #ffffff;
}
.qr-overlay.warning .qr-dot-ok{
  width: 12px; height: 12px; border-radius: 50%; background: #ffffff;
}

@keyframes qrs { to { transform: rotate(360deg); } }

@media (prefers-color-scheme: dark){
  .qr-overlay.loading{ background:#1e3a8a; }  /* blue-900 */
  .qr-overlay.success{ background:#14532d; }  /* green-900 */
  .qr-overlay.warning{ background:#78350f; }  /* amber-900 */
}
</style>