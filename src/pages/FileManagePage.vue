<script setup lang="ts">
import { onBeforeMount, ref, type Ref } from 'vue';
import { formatBytes, copyToClipboard } from '@/utils/utils';
import { DeleteFile, ListFiles } from '@/api';
import type { _Object } from '@aws-sdk/client-s3';

let uploadedFiles: Ref<_Object[]> = ref([]);

function decodeKey(key: string) {
    return decodeURIComponent(key)
}

const refreshFiles = async () => {
    const res = await ListFiles();
    if (res.hasOwnProperty('Contents') && res.Contents) {
        // 按时间倒序排列，最新的在前面
        uploadedFiles.value = res.Contents.sort((a, b) => {
            return (b.LastModified?.getTime() ?? 0) - (a.LastModified?.getTime() ?? 0);
        });
    } else {
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
    if (!confirm(`Are you sure you want to delete "${decodeKey(key)}"?`)) {
        return;
    }
    await DeleteFile(key);
    await refreshFiles();
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
        <h1 class="text-lg">{{ $t("page_title.filemanage") }}</h1>
        <div class="px-4 py-4 max-w-screen-md w-4/5">
            <div v-for="file in uploadedFiles" :key="file.Key"
                class="w-full flex flex-row items-center mt-4 rounded border-1 border-gray-300 px-2 py-2 hover:bg-gray-50 transition">
                <div class="w-10 h-10 i-mdi-file-document-outline shrink-0"></div>
                <div class="flex flex-col title flex-1 min-w-0 mx-2">
                    <a class="text-lg font-semibold truncate hover:text-blue-500" :title="decodeKey(file.Key!)" :href="`/${file.Key}`" target="_blank">{{ decodeKey(file.Key!) }}</a>
                    <div class="text-sm text-gray flex gap-2">
                        <span>{{ formatBytes(file.Size ?? 0) }}</span>
                        <span v-if="file.LastModified" class="text-gray-400 text-xs self-center">{{ new Date(file.LastModified).toLocaleString() }}</span>
                    </div>
                </div>
                
                <div class="flex gap-3 ml-auto shrink-0">
                    <div class="w-6 h-6 i-mdi-content-copy cursor-pointer text-gray-500 hover:text-blue-500"
                        title="Copy Link"
                        @click="onCopyLink(file.Key)"></div>
                    <div class="w-6 h-6 i-mdi-trash-can-outline cursor-pointer text-gray-500 hover:text-red-500"
                        title="Delete"
                        @click="onDeleteFileClick(file.Key)"></div>
                </div>
            </div>
            
            <div v-if="uploadedFiles.length === 0" class="text-center text-gray-500 mt-10">
                No files found.
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
