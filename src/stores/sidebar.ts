import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSidebarStore = defineStore('sidebar', () => {
  const collapsed = ref(false)
  const activeDemo = ref('demo/01')

  function toggle() {
    collapsed.value = !collapsed.value
  }

  function setActive(path: string) {
    activeDemo.value = path
  }

  return { collapsed, activeDemo, toggle, setActive }
}, {
  persist: true,
})
