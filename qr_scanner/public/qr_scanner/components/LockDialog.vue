<script setup lang="ts">
import { ref, watch } from 'vue';

type Props = {
  show: boolean;
  desc: string;
  error: string | null;
  busy?: boolean;
};
const props = withDefaults(defineProps<Props>(), {
  show: false,
  desc: 'Duplicate barcode detected. Enter admin password to continue.',
  error: null,
  busy: false,
});

const emit = defineEmits<{ (e: 'submit', password: string): void }>();

const inputEl = ref<HTMLInputElement | null>(null);
const btnEl = ref<HTMLButtonElement | null>(null);
const formEl = ref<HTMLFormElement | null>(null);

function onSubmit(e: Event) {
  e.preventDefault();
  const pw = (inputEl.value?.value || '').trim();
  if (!pw) return;
  emit('submit', pw);
  if (inputEl.value) inputEl.value.value = '';
}

watch(() => props.show, (v) => {
  if (v) {
    setTimeout(() => {
      if (btnEl.value) {
        btnEl.value.removeAttribute('disabled');
        btnEl.value.removeAttribute('aria-busy');
        (btnEl.value as any).style && ((btnEl.value as any).style.pointerEvents = 'auto');
      }
      inputEl.value && (inputEl.value.value = '');
      inputEl.value?.focus();
    }, 50);
  }
});

defineExpose({ inputEl, formEl, btnEl });
</script>

<template>
  <div
    id="qrLock"
    class="qr-lock"
    role="dialog"
    aria-modal="true"
    aria-labelledby="qrLockTitle"
    :class="{ show: show }"
  >
    <div class="qr-lock-inner">
      <div id="qrLockTitle" class="qr-lock-title">Access Locked</div>
      <div id="qrLockDesc" class="qr-lock-desc">{{ desc }}</div>
      <form id="qrLockForm" ref="formEl" class="qr-lock-form" autocomplete="off" @submit="onSubmit">
        <input type="text" tabindex="-1" aria-hidden="true" style="position:absolute;left:-9999px;top:-9999px" />
        <input
          id="qrLockInput"
          ref="inputEl"
          class="qr-lock-input"
          type="password"
          placeholder="Admin password"
          name="unlock_pwd"
          autocomplete="new-password"
          autocapitalize="off"
          autocorrect="off"
          spellcheck="false"
          inputmode="text"
        />
        <button
          id="qrLockBtn"
          ref="btnEl"
          class="qr-lock-btn"
          type="submit"
          :disabled="busy"
          :aria-busy="busy ? 'true' : 'false'"
        >
          Unlock
        </button>
      </form>
      <div id="qrLockError" class="qr-lock-error" :style="{ display: error ? 'block' : 'none' }">
        {{ error || 'Invalid password.' }}
      </div>
    </div>
  </div>
</template>