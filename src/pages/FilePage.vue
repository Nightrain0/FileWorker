<script setup lang="ts">
import { onMounted, onUnmounted, ref, type Ref } from 'vue';
import useFileStore from '@/store/file';
import { formatBytes, copyToClipboard } from '@/utils/utils';
import { PutFile } from '@/api';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

const router = useRouter();
const { t: $t } = useI18n();
const fileStore = useFileStore();

let fileUploadInput = ref();

let requestUploadFile = () => {
  fileUploadInput.value.click();
}

interface UploadedFile {
  name: string;
  size: number;
  visibility: string;
  done: boolean;
  progress: number;
}

let uploadedFiles: Ref<UploadedFile[]> = ref([]);

const uploadSingle = async (index: number, filename: string, file: File) => {
  try {
    await PutFile(filename, file, fileStore.visibility, "file", (progress) => {
      uploadedFiles.value[index - 1].progress = progress;
    });
    uploadedFiles.value[index - 1].done = true;
  } catch (e) {
    console.error(e);
  }
}

const handleFiles = async (files: FileList | null) => {
  if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const index = uploadedFiles.value.push({
          name: file.name,
          size: file.size,
          visibility: fileStore.visibility,
          done: false,
          progress: 0
        });
        uploadSingle(index, file.name, file);
      }
    }
}

onMounted(() => {
  if (fileUploadInput.value) {
    fileUploadInput.value.addEventListener('change', async (event: Event) => {
      const target = event.target as HTMLInputElement;
      const { files } = target;
      await handleFiles(files);
      target.value = ''; 
    });
  }
});

// 拖拽上传逻辑修复
let fileUploadArea = ref();
const isDragOver = ref(false);
const dragCounter = ref(0); // 使用计数器解决子元素导致的闪烁问题

const onDragEnter = (e: DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
  dragCounter.value++;
  if (dragCounter.value > 0) {
    isDragOver.value = true;
  }
};

const onDragLeave = (e: DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
  dragCounter.value--;
  if (dragCounter.value <= 0) {
    dragCounter.value = 0; // 防止计数器变成负数
    isDragOver.value = false;
  }
};

const onDragOver = (e: DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
  // 必须阻止默认行为才能触发 drop
  isDragOver.value = true; 
};

const onDrop = async (e: DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
  isDragOver.value = false;
  dragCounter.value = 0;
  const files = e.dataTransfer?.files;
  await handleFiles(files || null);
};

onMounted(() => {
  if (fileUploadArea.value) {
    fileUploadArea.value.addEventListener('dragenter', onDragEnter);
    fileUploadArea.value.addEventListener('dragover', onDragOver);
    fileUploadArea.value.addEventListener('dragleave', onDragLeave);
    fileUploadArea.value.addEventListener('drop', onDrop);
  }
});

onUnmounted(() => {
  if (fileUploadArea.value) {
    fileUploadArea.value.removeEventListener('dragenter', onDragEnter);
    fileUploadArea.value.removeEventListener('dragover', onDragOver);
    fileUploadArea.value.removeEventListener('dragleave', onDragLeave);
    fileUploadArea.value.removeEventListener('drop', onDrop);
  }
});

const getFileUrl = (filename: string) => {
  // 修改：对 filename 进行编码
  return `${window.location.origin}/${encodeURIComponent(filename)}`;
}

const onCopyLink = (filename: string) => {
  copyToClipboard(getFileUrl(filename));
}

const goHome = () => router.push('/');
const goManage = () => router.push('/filemanage');

</script>

<template>
  <div class="page-container">
    <div class="w-full max-w-3xl flex justify-between items-center mb-6">
      <button @click="goHome" class="flex items-center text-gray-500 hover:text-gray-900 transition-colors">
        <div class="i-mdi-arrow-left text-xl mr-1"></div>
        <span class="font-medium">{{ $t("page_title.index") }}</span>
      </button>
      <h1 class="text-xl font-bold text-gray-800">{{ $t("page_title.file") }}</h1>
      <button @click="goManage" class="flex items-center text-blue-500 hover:text-blue-600 transition-colors bg-blue-50 px-3 py-1.5 rounded-lg">
        <div class="i-mdi-folder-open mr-1"></div>
        <span class="text-sm font-medium">{{ $t("page_title.filemanage") }}</span>
      </button>
    </div>

    <div class="w-full max-w-3xl bg-white rounded-2xl shadow-sm border-2 border-dashed transition-all duration-300 overflow-hidden relative"
         :class="isDragOver ? 'border-blue-500 bg-blue-50/50 scale-[1.01]' : 'border-gray-200 hover:border-blue-300'">
      
      <div class="h-64 flex flex-col items-center justify-center cursor-pointer" @click="requestUploadFile" ref="fileUploadArea">
        <input ref="fileUploadInput" type="file" class="hidden" multiple />
        
        <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 text-blue-500 transition-transform duration-300" :class="{ 'scale-110': isDragOver }">
          <div class="i-mdi-cloud-upload text-3xl"></div>
        </div>
        
        <p class="text-lg font-medium text-gray-700">{{ $t('message.drop_hint') }}</p>
        <p class="text-sm text-gray-400 mt-1">Supports multiple files</p>
        
        <div v-if="isDragOver" class="absolute inset-0 bg-blue-500/10 backdrop-blur-sm flex items-center justify-center z-10 pointer-events-none">
          <div class="bg-white px-6 py-3 rounded-full shadow-lg text-blue-600 font-bold flex items-center animate-bounce">
            <div class="i-mdi-tray-arrow-down text-xl mr-2"></div>
            Release to Upload
          </div>
        </div>
      </div>

      <div class="bg-gray-50 px-4 py-3 border-t border-gray-100 flex items-center justify-between">
         <span class="text-xs text-gray-500 font-medium uppercase tracking-wide">Visibility Settings</span>
         <div class="relative">
            <select class="appearance-none bg-white border border-gray-200 text-gray-700 text-sm rounded-md pl-3 pr-8 py-1.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer" v-model="fileStore.visibility">
              <option value="private">{{ $t('common.private') }}</option>
              <option value="public">{{ $t('common.public') }}</option>
            </select>
            <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
              <div class="i-mdi-chevron-down text-sm"></div>
            </div>
         </div>
      </div>
    </div>
    
    <div class="w-full max-w-3xl mt-8 space-y-4">
      <transition-group name="list">
        <div v-for="file in uploadedFiles" :key="file.name" class="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-4 transition-all hover:shadow-md">
          <div class="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500 shrink-0">
            <div class="i-mdi-file text-2xl"></div>
          </div>
          
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between mb-1">
               <a class="text-gray-800 font-medium truncate hover:text-blue-600 transition-colors" :href="`/${encodeURIComponent(file.name)}`" target="_blank">{{ file.name }}</a>
               <span class="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-500">{{ formatBytes(file.size) }}</span>
            </div>
            
            <div v-if="!file.done" class="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div class="h-full bg-blue-500 rounded-full transition-all duration-300" :style="{ width: file.progress + '%' }"></div>
            </div>
            <div v-else class="flex items-center text-xs text-green-600 gap-1">
              <div class="i-mdi-check-circle"></div>
              <span>Upload Complete</span>
              <span class="text-gray-300 mx-1">|</span>
              <span class="text-gray-400">{{ file.visibility === 'public' ? $t('common.public') : $t('common.private') }}</span>
            </div>
          </div>
          
          <div v-if="file.done" class="shrink-0">
             <button class="w-9 h-9 flex items-center justify-center rounded-full bg-gray-50 text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-colors" 
                :title="$t('common.copy_link')" @click="onCopyLink(file.name)">
                <div class="i-mdi-link-variant text-lg"></div>
             </button>
          </div>
        </div>
      </transition-group>
    </div>
  </div>
</template>

<style scoped>
.list-enter-active,
.list-leave-active {
  transition: all 0.5s ease;
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateY(30px);
}
</style>
