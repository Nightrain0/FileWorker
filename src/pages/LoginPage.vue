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
    
    // 1. 先设置 Cookie，因为 API 请求会自动带上
    Cookies.set('PASSWORD', password.value);

    try {
        // 2. 尝试请求一个接口来验证密码 (获取1个文件)
        await ListFiles("1");
        
        // 3. 成功则提示并跳转
        toast($t("login.setting_success"), 'success');
        setTimeout(() => {
            if (window.history.state.back) {
                router.back();
            } else {
                router.replace({ path: '/' })
            }
        }, 500);
    } catch (e) {
        // 4. 失败则清除 Cookie 并提示
        Cookies.remove('PASSWORD');
        toast($t("login.login_fail"), 'error');
    } finally {
        loading.value = false;
    }
}
</script>

<template>
    <div class="cursor-default flex flex-col items-center">
        <div id="board">
            <h1 class="text-lg">{{ $t("login.login_title") }}</h1>
            <input class="my-5 px-2 py-1 w-64 border-2 rounded outline-blue-500" 
                   type="password" 
                   v-model="password"
                   @keyup.enter="onSubmitBtnClick"
                   :placeholder="$t('login.password_placeholder')">
            <button id="submit-button" class="btn flex justify-center items-center" 
                    :class="{ 'opacity-50 cursor-not-allowed': loading }"
                    @click="onSubmitBtnClick">
                <div v-if="loading" class="i-mdi-loading animate-spin mr-2"></div>
                {{ $t("login.login_button") }}
            </button>
        </div>
    </div>
</template>

<style scoped>
#board {
    @apply rounded-lg flex flex-col bg-gray-100 border-2 border-gray-200 my-5 mx-2 p-4 justify-center items-center dark:(bg-dark-100 border-dark-300 text-gray-400);
}

.btn {
    @apply rounded cursor-pointer outline-none bg-green-500 text-white text-lg py-1 px-4 transition w-64 hover:bg-green-600;
}
</style>
