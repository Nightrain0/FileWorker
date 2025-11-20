<script setup lang="ts">
import { onBeforeMount, ref, type Ref } from 'vue';
import { formatBytes, copyToClipboard } from '@/utils/utils';
import { DeleteFile, ListFiles } from '@/api';
import { useI18n } from 'vue-i18n';
import { toast } from '@/utils/toast';
import type { _Object } from '@aws-sdk/client-s3';
import { useRouter } from 'vue-router';

const router = useRouter();
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
        if (res && res.Contents) {
            uploadedFiles.value = [...res.Contents].sort((a, b) => {
                const timeA = a.LastModified ? new Date(a.LastModified).getTime() : 0;
                const timeB = b.LastModified ? new Date(b.LastModified).getTime() : 0;
                return timeB - timeA; 
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

const goHome = () => router.push('/');
const goUpload = () => router.push('/file');

</script>

<template>
    <div class="page-container">
        <div class="w-full max-w-4xl flex justify-between items-center mb-6">
             <div class="flex items-center gap-4">
                 <button @click="goHome" class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 transition-colors text-gray-600">
                    <div class="i-mdi-home text-xl"></div>
                 </button>
                 <h1 class="text-2xl font-bold text-gray-800">{{ $t("page_title.filemanage") }}</h1>
             </div>
             <button @click="goUpload" class="flex items-center gap-2 text-white bg-blue-600 hover:bg-blue-700 transition-colors px-4 py-2 rounded-lg font-medium shadow-sm">
                <div class="i-mdi-cloud-upload text-lg"></div>
                <span>Upload</span>
             </button>
        </div>

        <div class="w-full max-w-4xl bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div v-if="uploadedFiles.length > 0" class="divide-y divide-gray-50">
                <div v-for="file in uploadedFiles" :key="file.Key"
                    class="group flex flex-row items-center px-6 py-4 hover:bg-gray-50 transition-colors duration-150">
                    
                    <div class="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500 shrink-0 group-hover:scale-110 transition-transform">
                        <div class="i-mdi-file-outline text-2xl"></div>
                    </div>
                    
                    <div class="flex flex-col min-w-0 flex-1 mx-4">
                        <a class="text-base font-medium text-gray-800 truncate hover:text-blue-600 transition-colors" 
                           :title="decodeKey(file.Key!)" 
                           :href="`/${file.Key}`" 
                           target="_blank">
                           {{ decodeKey(file.Key!) }}
                        </a>
                        <div class="text-xs text-gray-400 flex gap-3 mt-1">
                            <span>{{ formatBytes(file.Size ?? 0) }}</span>
                            <span class="w-px h-3 bg-gray-300 self-center"></span>
                            <span v-if="file.LastModified">{{ new Date(file.LastModified).toLocaleString() }}</span>
                        </div>
                    </div>
                    
                    <div class="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <button class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-blue-100 text-gray-400 hover:text-blue-600 transition-colors"
                            :title="$t('common.copy_link')"
                            @click="onCopyLink(file.Key)">
                            <div class="i-mdi-content-copy text-lg"></div>
                        </button>
                        <button class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors"
                            :title="$t('common.delete')"
                            @click="onDeleteFileClick(file.Key)">
                            <div class="i-mdi-trash-can-outline text-lg"></div>
                        </button>
                    </div>
                </div>
            </div>
            
            <div v-else class="py-20 flex flex-col items-center text-center">
                <div class="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                    <div class="i-mdi-folder-open-outline text-4xl text-gray-300"></div>
                </div>
                <p class="text-gray-500 font-medium">{{ $t('message.no_files') }}</p>
                <p class="text-gray-400 text-sm mt-1">Upload some files to get started</p>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* 已使用 Tailwind/UnoCSS */
</style>
