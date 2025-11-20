<script setup lang="ts">
import { onBeforeMount, ref, type Ref } from 'vue';
import { formatBytes, copyToClipboard } from '@/utils/utils';
import { DeleteFile, ListFiles } from '@/api';
import { useI18n } from 'vue-i18n';
import { toast } from '@/utils/toast';
import type { _Object } from '@aws-sdk/client-s3';

const { t: $t } = useI18n();
let uploadedFiles: Ref<_Object[]> = ref([]);

function decodeKey(key: string) {
    try {
        return decodeURIComponent(key);
    } catch (e) {
        return key;
    }
}

const refreshFiles = async () => {
    try {
        const res = await ListFiles();
        // 检查 res.Contents 是否存在
        if (res && res.Contents) {
            // 关键修复：创建副本 [...res.Contents] 再排序，防止修改只读对象报错
            // 并处理 LastModified 可能不存在的情况
            uploadedFiles.value = [...res.Contents].sort((a, b) => {
                const timeA = a.LastModified ? new Date(a.LastModified).getTime() : 0;
                const timeB = b.LastModified ? new Date(b.LastModified).getTime() : 0;
                return timeB - timeA; // 新的在前
            });
        } else {
            uploadedFiles.value = [];
        }
    } catch (error) {
        console.error("Failed to load files:", error);
        toast($t('message.load_fail'), 'error');
        uploadedFiles.value = [];
    }
};

onBeforeMount(async () => {
    await refreshFiles();
});

const onDeleteFileClick = async (key?: string) => {
    if (!key) {
        return;
    }
    if (!confirm($t('message.delete_confirm', { filename: decodeKey(key) }))) {
        return;
    }
    try {
        await DeleteFile(key);
        toast($t('message.delete_success'), 'success');
        await refreshFiles();
    } catch (e) {
        console.error(e);
        toast($t('message.delete_fail'), 'error');
    }
};

const getFileUrl = (key: string) => {
  return `${window.location.origin}/${key}`;
}

const onCopyLink = (key?: string) => {
    if(key) copyToClipboard(getFileUrl(key));
}

</script>

<template>
    <div class="flex flex-col items-center mt-5">
        <h1 class="text-lg font-bold">{{ $t("page_title.filemanage") }}</h1>
        <div class="px-4 py-4 max-w-screen-md w-4/5">
            <div v-for="file in uploadedFiles" :key="file.Key"
                class="w-full flex flex-row items-center mt-4 rounded border-1 border-gray-300 px-4 py-3 hover:bg-gray-50 transition shadow-sm bg-white">
                <div class="w-10 h-10 i-mdi-file-document-outline shrink-0 text-blue-500"></div>
                <div class="flex flex-col title flex-1 min-w-0 mx-3">
                    <a class="text-lg font-semibold truncate hover:text-blue-600 text-gray-800" :title="decodeKey(file.Key!)" :href="`/${file.Key}`" target="_blank">{{ decodeKey(file.Key!) }}</a>
                    <div class="text-sm text-gray-500 flex gap-3 mt-1">
                        <span class="bg-gray-100 px-2 rounded">{{ formatBytes(file.Size ?? 0) }}</span>
                        <span v-if="file.LastModified" class="self-center">{{ new Date(file.LastModified).toLocaleString() }}</span>
                    </div>
                </div>
                
                <div class="flex gap-3 ml-auto shrink-0 items-center">
                    <button class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-blue-100 transition"
                        :title="$t('common.copy_link')"
                        @click="onCopyLink(file.Key)">
                        <div class="i-mdi-content-copy text-gray-600 text-lg"></div>
                    </button>
                    <button class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-100 transition"
                        :title="$t('common.delete')"
                        @click="onDeleteFileClick(file.Key)">
                        <div class="i-mdi-trash-can-outline text-red-500 text-lg"></div>
                    </button>
                </div>
            </div>
            
            <div v-if="uploadedFiles.length === 0" class="text-center text-gray-400 mt-10 flex flex-col items-center">
                <div class="i-mdi-folder-open-outline w-16 h-16 mb-2"></div>
                {{ $t('message.no_files') }}
            </div>
        </div>
    </div>
</template>

<style>
html,
body,
#app {
    margin: 0;
    padding: 0;
    background-color: #f8f9fa;
}
.title {
    overflow: hidden;
}
</style>
