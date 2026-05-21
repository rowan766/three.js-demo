import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useUserStore = defineStore('user', () => {
  const token = ref<string | null>(null)
  const username = ref<string>('')

  const isLoggedIn = computed(() => !!token.value)

  function login(user: string, pass: string): boolean {
    if (user === 'admin' && pass === '123456') {
      token.value = 'railway-demo-token'
      username.value = user
      return true
    }
    return false
  }

  function logout() {
    token.value = null
    username.value = ''
  }

  return { token, username, isLoggedIn, login, logout }
}, {
  persist: true,
})
