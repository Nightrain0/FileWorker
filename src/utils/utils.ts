import { toast } from "./toast";

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
 * 优先使用 navigator.clipboard，降级使用 document.execCommand
 */
const copyToClipboard = async (text: string) => {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            toast('Copied to clipboard', 'success');
        } else {
            // Fallback for older browsers or non-secure contexts
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
                toast('Copied to clipboard', 'success');
            } else {
                throw new Error('Unable to copy');
            }
        }
    } catch (err) {
        console.error('Failed to copy: ', err);
        toast('Failed to copy', 'error');
    }
}

export { getRandomFilename, formatBytes, copyToClipboard };
