import { toast } from "./toast";
import i18n from "@/i18n";

// 获取 i18n 的 t 函数，用于在非组件文件中使用翻译
const $t = i18n.global.t;

const getRandomFilename = () => {
    const filename = Math.random().toString(36).substring(2, 8);
    return filename;
}

function formatBytes(bytes: number) {
    if (bytes == 0) return '0 Bytes';
    const k = 1024,
        dm = 2,
        sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'],
        i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * 复制文本到剪贴板
 */
const copyToClipboard = async (text: string) => {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            toast($t('message.copy_success'), 'success');
        } else {
            // 降级方案
            const textArea = document.createElement("textarea");
            textArea.value = text;
            textArea.style.position = "fixed";
            textArea.style.left = "-9999px";
            textArea.style.top = "0";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);
            if (successful) {
                toast($t('message.copy_success'), 'success');
            } else {
                throw new Error('Unable to copy');
            }
        }
    } catch (err) {
        console.error('Failed to copy: ', err);
        toast($t('message.copy_fail'), 'error');
    }
}

export { getRandomFilename, formatBytes, copyToClipboard };
