<script setup lang="ts">
import { onBeforeMount, ref, type Ref, computed } from 'vue';
import { formatBytes, copyToClipboard } from '@/utils/utils';
import { DeleteFile, ListFiles, PutFile } from '@/api';
import { useI18n } from 'vue-i18n';
import { toast } from '@/utils/toast';
import type { _Object, CommonPrefix } from '@aws-sdk/client-s3';
import { useRouter } from 'vue-router';

const router = useRouter();
const { t: $t } = useI18n();

let uploadedFiles: Ref<_Object[]> = ref([]);
let folders: Ref<CommonPrefix[]> = ref([]);
const currentPrefix = ref(""); // 当前路径，如 "folder1/sub2/"

function decodeKey(key: string) {
    try {
        return decodeURIComponent(key);
    } catch (e) {
        return key;
    }
}

const refreshFiles = async () => {
    try {
        // 传递 Delimiter='/' 来获取目录层级结构
        const res = await ListFiles(undefined, currentPrefix.value, undefined, "/");
        
        // 1. 处理文件夹 (CommonPrefixes)
        if (res && res.CommonPrefixes) {
            folders.value = [...res.CommonPrefixes];
        } else {
            folders.value = [];
        }

        // 2. 处理当前目录下的具体文件
        if (res && res.Contents) {
            uploadedFiles.value = [...res.Contents]
                // 过滤掉代表当前目录本身的空占位文件
                .filter(item => item.Key !== currentPrefix.value)
                .sort((a, b) => {
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
        folders.value = [];
    }
};

onBeforeMount(async () => {
    await refreshFiles();
});

const onDeleteFileClick = async (key?: string) => {
    if (!key) return;
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
  return `${window.location.origin}/${encodeURIComponent(key)}`;
}

const onCopyLink = (key?: string) => {
    if(key) copyToClipboard(getFileUrl(key));
}

// 导航到特定层级
const navigateTo = (prefix: string) => {
    currentPrefix.value = prefix;
    refreshFiles();
}

// 计算面包屑导航
const breadcrumbs = computed(() => {
    if (!currentPrefix.value) return [];
    const parts = currentPrefix.value.split('/').filter(p => p);
    let path = '';
    return parts.map(part => {
        path += part + '/';
        return { name: part, path: path };
    });
});

// 新建文件夹功能（S3虚拟目录本质上是个以 / 结尾的0字节对象）
const onCreateFolder = async () => {
    const name = prompt("请输入新建文件夹的名称:");
    if (!name) return;
    let folderName = name.trim();
    if (folderName.includes('/')) {
        toast("文件夹名称不能包含 '/'", "error");
        return;
    }
    const folderKey = currentPrefix.value + folderName + "/";
    try {
        await PutFile(folderKey, "", "public", "folder");
        toast("文件夹创建成功", "success");
        await refreshFiles();
    } catch (e) {
        console.error(e);
        toast("文件夹创建失败", "error");
    }
}

const goHome = () => router.push('/');
// 去上传页时，附带当前目录的 Query 参数，实现就地上传
const goUpload = () => router.push({ path: '/file', query: { path: currentPrefix.value } });

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
             <div class="flex gap-2">
                 <button @click="onCreateFolder" class="flex items-center gap-1 text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-colors px-3 py-2 rounded-lg font-medium shadow-sm">
                    <div class="i-mdi-folder-plus-outline text-lg"></div>
                    <span class="text-sm">New Folder</span>
                 </button>
                 <button @click="goUpload" class="flex items-center gap-1 text-white bg-blue-600 hover:bg-blue-700 transition-colors px-3 py-2 rounded-lg font-medium shadow-sm">
                    <div class="i-mdi-cloud-upload text-lg"></div>
                    <span class="text-sm">Upload</span>
                 </button>
             </div>
        </div>

        <div class="w-full max-w-4xl flex items-center flex-wrap gap-2 mb-4 px-2 text-sm text-gray-600">
            <button @click="navigateTo('')" class="hover:text-blue-600 transition-colors flex items-center gap-1">
                <div class="i-mdi-home-variant-outline text-lg"></div>
                <span>Root</span>
            </button>
            <template v-for="(crumb, index) in breadcrumbs" :key="crumb.path">
                <div class="i-mdi-chevron-right text-gray-400"></div>
                <button @click="navigateTo(crumb.path)" 
                        class="hover:text-blue-600 transition-colors"
                        :class="{ 'font-semibold text-gray-800': index === breadcrumbs.length - 1 }">
                    {{ crumb.name }}
                </button>
            </template>
        </div>

        <div class="w-full max-w-4xl bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div v-if="folders.length > 0 || uploadedFiles.length > 0" class="divide-y divide-gray-50">
                
                <div v-for="folder in folders" :key="folder.Prefix"
                    class="group flex flex-row items-center px-6 py-4 hover:bg-gray-50 transition-colors duration-150 cursor-pointer"
                    @click="navigateTo(folder.Prefix!)">
                    
                    <div class="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-500 shrink-0 group-hover:scale-110 transition-transform">
                        <div class="i-mdi-folder text-2xl"></div>
                    </div>
                    
                    <div class="flex flex-col min-w-0 flex-1 mx-4">
                        <span class="text-base font-medium text-gray-800 truncate group-hover:text-blue-600 transition-colors">
                            {{ decodeKey(folder.Prefix!).slice(currentPrefix.length, -1) }}
                        </span>
                    </div>
                    
                    <div class="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <div class="w-8 h-8 flex items-center justify-center text-gray-400">
                            <div class="i-mdi-chevron-right text-xl"></div>
                        </div>
                    </div>
                </div>

                <div v-for="file in uploadedFiles" :key="file.Key"
                    class="group flex flex-row items-center px-6 py-4 hover:bg-gray-50 transition-colors duration-150">
                    
                    <div class="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500 shrink-0 group-hover:scale-110 transition-transform">
                        <div class="i-mdi-file-outline text-2xl"></div>
                    </div>
                    
                    <div class="flex flex-col min-w-0 flex-1 mx-4">
                        <a class="text-base font-medium text-gray-800 truncate hover:text-blue-600 transition-colors" 
                           :title="decodeKey(file.Key!)" 
                           :href="`/${encodeURIComponent(file.Key!)}`" 
                           target="_blank"
                           @click.stop>
                           {{ decodeKey(file.Key!).replace(currentPrefix, '') }}
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
                            @click.stop="onCopyLink(file.Key)">
                            <div class="i-mdi-content-copy text-lg"></div>
                        </button>
                        <button class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors"
                            :title="$t('common.delete')"
                            @click.stop="onDeleteFileClick(file.Key)">
                            <div class="i-mdi-trash-can-outline text-lg"></div>
                        </button>
                    </div>
                </div>
            </div>
            
            <div v-else class="py-20 flex flex-col items-center text-center">
                <div class="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                    <div class="i-mdi-folder-open-outline text-4xl text-gray-300"></div>
                </div>
                <p class="text-gray-500 font-medium">{{ currentPrefix ? 'This folder is empty' : $t('message.no_files') }}</p>
                <p v-if="!currentPrefix" class="text-gray-400 text-sm mt-1">Upload some files to get started</p>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* 样式保留你的 Tailwind 配置 */
</style>
