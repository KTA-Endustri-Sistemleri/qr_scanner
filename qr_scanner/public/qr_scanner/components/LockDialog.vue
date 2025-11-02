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
<style scoped>
.qr-lock{position:fixed;inset:0;background:#dc3545;z-index:10000;display:none;color:#fff}
.qr-lock.show{display:flex}
.qr-lock-inner{margin:auto;width:min(560px,90vw);background:rgba(0,0,0,.18);border-radius:14px;padding:20px;box-shadow:0 12px 40px rgba(0,0,0,.35);backdrop-filter:blur(2px)}
.qr-lock-title{font-size:1.15rem;font-weight:700;margin-bottom:6px}
.qr-lock-desc{opacity:.9;margin-bottom:14px}
.qr-lock-form{display:flex;gap:8px}
.qr-lock-input{flex:1;padding:12px 14px;border-radius:10px;border:none;outline:none;font-size:1rem}
.qr-lock-btn{padding:12px 16px;border-radius:10px;border:none;cursor:pointer;font-weight:600}
.qr-lock-error{margin-top:10px;font-weight:600;display:block}

/* Küçük ekran hotfix */
@media (max-width: 420px) and (max-height: 720px){
  .qr-lock-form{flex-direction:column}
  .qr-lock-btn{width:100%}
}
</style>