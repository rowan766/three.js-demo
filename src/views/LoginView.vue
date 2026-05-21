<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { ElMessage } from 'element-plus'

const router = useRouter()
const userStore = useUserStore()

const form = reactive({ username: 'admin', password: '123456' })
const loading = ref(false)

async function handleLogin() {
  loading.value = true
  await new Promise(r => setTimeout(r, 600))
  const ok = userStore.login(form.username, form.password)
  loading.value = false
  if (ok) {
    router.push('/')
  } else {
    ElMessage.error('账号或密码错误，请使用 admin / 123456')
  }
}
</script>

<template>
  <div class="login-wrap">
    <div class="login-bg">
      <div class="grid-overlay" />
    </div>
    <div class="login-box">
      <div class="login-header">
        <div class="logo-icon">🚄</div>
        <h1>铁路教培系统</h1>
        <p>Railway Training 3D Demo Platform</p>
      </div>
      <el-form @submit.prevent="handleLogin" class="login-form">
        <el-form-item>
          <el-input
            v-model="form.username"
            placeholder="用户名"
            prefix-icon="User"
            size="large"
          />
        </el-form-item>
        <el-form-item>
          <el-input
            v-model="form.password"
            type="password"
            placeholder="密码"
            prefix-icon="Lock"
            show-password
            size="large"
            @keyup.enter="handleLogin"
          />
        </el-form-item>
        <el-form-item>
          <el-button
            type="primary"
            size="large"
            :loading="loading"
            class="login-btn"
            @click="handleLogin"
          >
            登 录
          </el-button>
        </el-form-item>
      </el-form>
      <p class="hint">演示账号：admin / 123456</p>
    </div>
  </div>
</template>

<style scoped>
.login-wrap {
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-dark);
  position: relative;
  overflow: hidden;
}

.login-bg {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 50% 50%, #0d2040 0%, #0a0e1a 70%);
}

.grid-overlay {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(0, 229, 255, 0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 229, 255, 0.06) 1px, transparent 1px);
  background-size: 40px 40px;
}

.login-box {
  position: relative;
  z-index: 1;
  width: 400px;
  background: rgba(13, 21, 38, 0.92);
  border: 1px solid rgba(0, 229, 255, 0.3);
  border-radius: 12px;
  padding: 48px 40px;
  box-shadow: 0 0 40px rgba(0, 229, 255, 0.1), 0 20px 60px rgba(0, 0, 0, 0.5);
}

.login-header {
  text-align: center;
  margin-bottom: 36px;
}

.logo-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.login-header h1 {
  color: var(--color-text-primary);
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 2px;
  margin-bottom: 6px;
}

.login-header p {
  color: var(--color-text-secondary);
  font-size: 12px;
  letter-spacing: 1px;
}

.login-form :deep(.el-input__wrapper) {
  background: rgba(0, 229, 255, 0.04);
  border: 1px solid rgba(0, 229, 255, 0.2);
  box-shadow: none;
}

.login-form :deep(.el-input__wrapper:hover) {
  border-color: rgba(0, 229, 255, 0.5);
}

.login-form :deep(.el-input__wrapper.is-focus) {
  border-color: var(--color-border-cyan);
  box-shadow: 0 0 8px rgba(0, 229, 255, 0.2);
}

.login-form :deep(.el-input__inner) {
  color: var(--color-text-primary);
}

.login-btn {
  width: 100%;
  background: linear-gradient(135deg, #00b4d8, #00e5ff);
  border: none;
  font-size: 16px;
  letter-spacing: 4px;
  height: 44px;
}

.login-btn:hover {
  background: linear-gradient(135deg, #00e5ff, #80ffff);
}

.hint {
  text-align: center;
  color: rgba(0, 229, 255, 0.4);
  font-size: 12px;
  margin-top: 16px;
}
</style>
