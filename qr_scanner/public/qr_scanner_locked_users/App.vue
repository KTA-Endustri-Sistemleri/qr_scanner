<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

const frappe = (window as any).frappe;

interface LockedUser {
  name: string;
  full_name: string;
}

const lockedUsers = ref<LockedUser[]>([]);
const isLoading = ref(true);
const isUnlocking = ref<Record<string, boolean>>({});
let pollInterval: any = null;

const fetchUsers = async () => {
  try {
    const res = await frappe.call({
      method: 'qr_scanner.api.get_locked_users'
    });
    if (res && res.message) {
      lockedUsers.value = res.message;
    } else {
      lockedUsers.value = [];
    }
  } catch (err) {
    console.error('Failed to fetch locked users', err);
  } finally {
    isLoading.value = false;
  }
};

const unlockUser = async (user: string) => {
  if (isUnlocking.value[user]) return;
  
  isUnlocking.value[user] = true;
  try {
    const res = await frappe.call({
      method: 'qr_scanner.api.remote_unlock',
      args: { target_user: user }
    });
    
    if (res.message && res.message.ok) {
      frappe.show_alert({ message: 'User unlocked successfully!', indicator: 'green' });
      lockedUsers.value = lockedUsers.value.filter(u => u.name !== user);
    } else {
      frappe.show_alert({ message: res.message?.msg || 'Verification failed', indicator: 'red' });
    }
  } catch (err) {
    frappe.show_alert({ message: 'Error unlocking user', indicator: 'red' });
  } finally {
    isUnlocking.value[user] = false;
  }
};

onMounted(() => {
  fetchUsers();
  // Poll every 5 seconds to keep the list fresh
  pollInterval = setInterval(fetchUsers, 5000);
});

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval);
});
</script>

<template>
  <div class="locked-users-container" style="max-width: 800px; margin: 0 auto; padding: 20px;">
    
    <div v-if="isLoading" class="text-muted" style="text-align: center; padding: 40px;">
      Data is loading...
    </div>
    
    <div v-else-if="lockedUsers.length === 0" class="empty-state" style="text-align: center; padding: 60px 20px; background: var(--control-bg); border-radius: 8px;">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.4; margin-bottom: 12px;">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
      </svg>
      <div style="font-size: 1.1rem; color: var(--text-muted); font-weight: 500;">
        Harika! Kilitli hiçbir kullanıcı yok.
      </div>
      <div style="font-size: 0.9rem; color: var(--text-light); margin-top: 4px;">
        Saha operasyonu kesintisiz devam ediyor.
      </div>
    </div>

    <div v-else class="locked-list">
      <div class="list-headers" style="display: grid; grid-template-columns: 2fr 1fr; padding: 10px 16px; border-bottom: 1px solid var(--border-color); color: var(--text-muted); font-size: 12px; font-weight: 600; text-transform: uppercase;">
        <div>Kullanıcı</div>
        <div style="text-align: right;">İşlem</div>
      </div>
      
      <div v-for="user in lockedUsers" :key="user.name" class="locked-item" style="display: grid; grid-template-columns: 2fr 1fr; align-items: center; padding: 12px 16px; border-bottom: 1px solid var(--border-color); background: var(--card-bg); transition: background 0.2s ease;">
        <div class="user-info" style="display: flex; flex-direction: column;">
          <span style="font-weight: 600; color: var(--text-color); font-size: 14px;">{{ user.full_name }}</span>
          <span style="font-size: 12px; color: var(--text-muted);">{{ user.name }}</span>
        </div>
        
        <div class="item-actions" style="text-align: right;">
          <button 
            @click="unlockUser(user.name)"
            :disabled="isUnlocking[user.name]"
            class="btn btn-danger btn-sm"
            style="display: inline-flex; align-items: center; gap: 6px; font-weight: 500;"
          >
            <svg v-if="isUnlocking[user.name]" width="14" height="14" viewBox="0 0 24 24" fill="none" class="spin-anim" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="2" x2="12" y2="6"></line>
              <line x1="12" y1="18" x2="12" y2="22"></line>
              <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
              <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
              <line x1="2" y1="12" x2="6" y2="12"></line>
              <line x1="18" y1="12" x2="22" y2="12"></line>
              <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
              <line x1="16.24" y1="4.93" x2="19.07" y2="7.76"></line>
            </svg>
            <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 9.9-1"></path>
            </svg>
            {{ isUnlocking[user.name] ? 'Açılıyor...' : 'Kilidi Kaldır' }}
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.btn-danger {
  background-color: var(--red-500, #dc3545);
  color: white;
  border: none;
  border-radius: 6px;
  padding: 6px 14px;
  cursor: pointer;
  transition: opacity 0.2s;
}
.btn-danger:hover {
  opacity: 0.9;
}
.btn-danger:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.spin-anim {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  100% {
    transform: rotate(360deg);
  }
}

.locked-item:hover {
  background: var(--bg-color);
}
</style>
