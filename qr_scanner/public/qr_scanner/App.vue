<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { useQrScannerStore } from './stores/qrScanner';
import InputRow from './components/InputRow.vue';
import QrOverlays from './components/QrOverlays.vue';
import LockDialog from './components/LockDialog.vue';

const store = useQrScannerStore();

const inputRef = ref<InstanceType<typeof InputRow> | null>(null);
const lockRef  = ref<InstanceType<typeof LockDialog> | null>(null);

function focusInputSoon() { inputRef.value?.focusSoon(); }

function onEnter(code: string) {
  store.submitCode(code, focusInputSoon);
}

function onUnlockSubmit(pw: string) {
  store.unlock(pw, focusInputSoon);
}

onMounted(async () => {
  await store.init();
  focusInputSoon();
});

onBeforeUnmount(() => store.dispose());
</script>

<template>
  <div class="qr-container">
    <div id="qrCard" class="card qr-card">
      <div class="qr-section" role="region" aria-live="polite" aria-atomic="true">
        <div class="qr-title">USB / Keyboard Wedge</div>

        <InputRow
          ref="inputRef"
          :disabled="store.state.inFlight || store.state.isLocked || store.state.mode !== 'none'"
          :autofocus="true"
          :autofocusBack="!!store.CFG.autofocus_back"
          @enter="onEnter"
        />

        <div class="qr-help">
          States are displayed as opaque overlays inside the card. On duplicate, a red lock requires admin password.
        </div>
      </div>

      <QrOverlays
        :mode="store.state.mode"
        :successName="store.state.successName"
        :warnMsg="store.state.warnMsg"
      />
    </div>

    <LockDialog
      ref="lockRef"
      :show="store.state.isLocked"
      :desc="store.state.lockDesc"
      :error="store.state.lockError"
      :busy="store.state.lockBusy"
      @submit="onUnlockSubmit"
    />
  </div>
</template>

<style>
/* Global bırakıyoruz ki child’lara da geçsin */
.qr-container { width:100%; max-width:960px; margin:16px auto; padding:0 12px; }
.qr-card { position: relative; } /* overlays need positioning */
.qr-section { padding:18px; }
.qr-title { font-weight:700; font-size:1.05rem; margin-bottom:8px; }
.qr-row { display:flex; gap:10px; align-items:center; }
.qr-help { color:#6b7280; margin-top:8px; }
@media (prefers-color-scheme: dark){ .qr-help{ color:#9ca3af; } }

.qr-input{
  flex:1; font-size:1.1rem; padding:12px 14px;
  border-radius:10px; border:1px solid #e5e7eb; background:#fff; color:#0f172a;
}
.qr-input:focus{ outline:none; border-color:#60a5fa; box-shadow:0 0 0 3px rgba(96,165,250,.22); }
@media (prefers-color-scheme: dark){
  .qr-input{ background:#0f172a; color:#e5e7eb; border-color:#243042; }
}
</style>