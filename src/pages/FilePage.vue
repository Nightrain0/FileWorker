<script setup lang="ts">
import { onMounted, onUnmounted, ref, type Ref } from 'vue';
import useFileStore from '@/store/file';
import { formatBytes, copyToClipboard } from '@/utils/utils';
import { PutFile } from '@/api';
import { useI18n } from 'vue-i18n';

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
  fileUploadInput.value.addEventListener('change', async (event: Event) => {
    const target = event.target as HTMLInputElement;
    const { files } = target;
    await handleFiles(files);
    target.value = ''; 
  });
});

let fileUploadArea = ref();
const isDragOver = ref(false);

const onDragEvent = async (event: DragEvent) => {
  event.preventDefault();
  event.stopPropagation();
  if (event.type === 'dragover') {
    isDragOver.value = true;
  } else {
    isDragOver.value = false;
  }
  if (event.type === 'drop') {
    const files = event.dataTransfer?.files;
    await handleFiles(files || null);
  }
}

onMounted(() => {
  fileUploadArea.value.addEventListener('dragenter', onDragEvent);
  fileUploadArea.value.addEventListener('dragover', onDragEvent);
  fileUploadArea.value.addEventListener('dragleave', onDragEvent);
  fileUploadArea.value.addEventListener('drop', onDragEvent);
});
onUnmounted(() => {
  fileUploadArea.value.removeEventListener('dragenter', onDragEvent);
  fileUploadArea.value.removeEventListener('dragover', onDragEvent);
  fileUploadArea.value.removeEventListener('dragleave', onDragEvent);
  fileUploadArea.value.removeEventListener('drop', onDragEvent);
});

const getFileUrl = (filename: string) => {
  return `${window.location.origin}/${filename}`;
}

const onCopyLink = (filename: string) => {
  copyToClipboard(getFileUrl(filename));
}

</script>

<template>
  <div class="flex flex-col items-center">
    <div class="file-area flex flex-col mt-4 transition-all" :class="{ 'drag-over': isDragOver }">
      <div class="files" @click="requestUploadFile" ref="fileUploadArea">
        <input ref="fileUploadInput" type="file" class="hidden" multiple />
        <div v-if="isDragOver" class="drag-hint">{{ $t('message.drop_hint') }}</div>
      </div>
      <div class="footer p-2 border-t border-gray-100">
        <select class="public-select" v-model="fileStore.visibility">
          <option value="private">{{ $t('common.private') }}</option>
          <option value="public">{{ $t('common.public') }}</option>
        </select>
      </div>
    </div>
    
    <div class="px-4 py-4 max-w-screen-md w-4/5">
      <div v-for="file in uploadedFiles" :key="file.name" class="w-full flex flex-col mt-3 rounded-lg border border-gray-200 p-3 bg-white shadow-sm">
        <div class="flex flex-row items-center">
          <div class="w-10 h-10 i-mdi-file-document-outline shrink-0 text-gray-600"></div>
          <div class="flex flex-col min-w-0 flex-1 mx-3">
            <a class="text-base font-medium truncate hover:text-blue-600 text-gray-800" :href="`/${file.name}`" target="_blank">{{ file.name }}</a>
            <div class="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
               <span>{{ formatBytes(file.size) }}</span>
               <span class="w-1 h-1 rounded-full bg-gray-300"></span>
               <span>{{ file.visibility === 'public' ? $t('common.public') : $t('common.private') }}</span>
            </div>
          </div>
          
          <div class="flex flex-row gap-2 ml-auto shrink-0 items-center">
             <!-- Copy Link Button -->
             <button v-if="file.done" class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition text-gray-500 hover:text-blue-600" 
                :title="$t('common.copy_link')" @click="onCopyLink(file.name)">
                <div class="i-mdi-link text-lg"></div>
             </button>
             <!-- Status Icon -->
             <div class="w-6 h-6 flex items-center justify-center">
                <div v-if="file.done" class="i-mdi-check-circle text-green-500 text-xl"></div>
                <div v-else class="i-mdi-loading animate-spin text-blue-500 text-xl"></div>
             </div>
          </div>
        </div>
        
        <!-- Progress Bar -->
        <div v-if="!file.done" class="w-full bg-gray-100 rounded-full h-1 mt-3 overflow-hidden">
          <div class="bg-blue-500 h-full rounded-full transition-all duration-300" :style="{ width: file.progress + '%' }"></div>
        </div>
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

.file-area {
  --uno: rounded-lg max-w-screen-md w-4/5 border-2 border-dashed border-gray-300 transition-colors duration-200 shadow-sm overflow-hidden;
  background-color: white;
}

.file-area:hover {
  border-color: #b0b0b0;
}

/* 响应式拖拽样式 */
.file-area.drag-over {
  border-color: #3b82f6;
  background-color: #eff6ff;
  transform: scale(1.01);
}

.file-area .footer {
  --uno: flex flex-row bg-gray-50;
}

.file-area .footer .public-select {
  --uno: border border-gray-300 rounded px-3 py-1.5 text-sm bg-white text-gray-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500;
}

.files {
  --uno: h-48 cursor-pointer relative flex items-center justify-center;
  background: url(../assets/upload.svg) center center no-repeat;
  background-size: 64px;
}

.drag-hint {
  position: absolute;
  background: rgba(59, 130, 246, 0.9);
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  pointer-events: none;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}
</style>
