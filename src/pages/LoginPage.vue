<script setup lang="ts">
import { ref } from 'vue';
import Cookies from 'js-cookie'
import { toast } from '@/utils/toast';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { ListFiles } from '@/api';

const router = useRouter();
const { t: $t } = useI18n();

const password = ref('');
const loading = ref(false);

const onSubmitBtnClick = async () => {
    if (loading.value) return;
    loading.value = true;
    
    Cookies.set('PASSWORD', password.value);

    try {
        await ListFiles("1");
        toast($t("login.setting_success"), 'success');
        setTimeout(() => {
            if (window.history.state.back) {
                router.back();
            } else {
                router.replace({ path: '/' })
            }
        }, 500);
    } catch (e) {
        Cookies.remove('PASSWORD');
        toast($t("login.login_fail"), 'error');
    } finally {
        loading.value = false;
    }
}
</script>

<template>
    <div class="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div class="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-gray-100 transition-all duration-300 hover:shadow-2xl">
            <div class="flex flex-col items-center mb-8">
                <div class="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4 text-blue-500">
                    <div class="i-mdi-lock text-3xl"></div>
                </div>
                <h1 class="text-2xl font-bold text-gray-800">{{ $t("login.login_title") }}</h1>
                <p class="text-gray-500 text-sm mt-2">FileWorker</p>
            </div>

            <div class="space-y-6">
                <div>
                    <input 
                        class="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-gray-700 placeholder-gray-400"
                        type="password" 
                        v-model="password"
                        @keyup.enter="onSubmitBtnClick"
                        :placeholder="$t('login.password_placeholder')"
                    >
                </div>
                
                <button 
                    class="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-lg shadow-lg shadow-blue-600/20 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    :disabled="loading"
                    @click="onSubmitBtnClick"
                >
                    <div v-if="loading" class="i-mdi-loading animate-spin text-xl"></div>
                    <span>{{ $t("login.login_button") }}</span>
                </button>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* 样式已通过 Tailwind/UnoCSS 类实现 */
</style>
