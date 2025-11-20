import axios, { AxiosError } from 'axios';
import router from '@/router';
import { toast } from '@/utils/toast';

const initInterceptors = () => {
    axios.interceptors.response.use(
        async (response) => {
            return response;
        },
        async (error: AxiosError) => {
            // 如果是 401，通常意味着密码错误或 Cookie 过期
            // 我们不在全局弹出 generic Error，交给具体的页面逻辑处理（如登录页）
            // 或者让用户知道需要登录
            if (error.response?.status === 401) {
                // 只有在非登录页才跳转，防止循环
                if (router.currentRoute.value.path !== '/login') {
                    await router.push('/login');
                }
            } else {
                // 其他错误才弹窗
                toast(error.message || "Error", "error");
            }
            return Promise.reject(error);
        });
}

export { initInterceptors };
