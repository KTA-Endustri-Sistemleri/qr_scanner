<script setup lang="ts">
import { ref, watchEffect } from 'vue';

type Props = {
  disabled?: boolean;
  autofocus?: boolean;
  autofocusBack?: boolean;
};
const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  autofocus: true,
  autofocusBack: true,
});
const emit = defineEmits<{ (e: 'enter', code: string): void }>();

const inputEl = ref<HTMLInputElement | null>(null);

function focusSoon() { setTimeout(() => inputEl.value?.focus(), 30); }

function onKeydown(e: KeyboardEvent) {
  if (props.disabled) { e.preventDefault(); return; }
  if (e.key === 'Enter') {
    e.preventDefault();
    const val = (inputEl.value?.value || '').trim();
    if (inputEl.value) inputEl.value.value = '';
    if (val) emit('enter', val);
  }
}

function onBlur() {
  if (props.autofocusBack && !props.disabled) {
    setTimeout(() => inputEl.value?.focus(), 50);
  }
}

watchEffect(() => {
  if (props.autofocus) focusSoon();
});

defineExpose({ focusSoon, el: inputEl });
</script>

<template>
  <div class="qr-row">
    <input
      id="manual"
      ref="inputEl"
      type="text"
      class="form-control qr-input"
      placeholder="Scan with USB scanner or type and press Enter"
      :autofocus="autofocus"
      :disabled="disabled"
      @keydown="onKeydown"
      @blur="onBlur"
    />
  </div>
</template>