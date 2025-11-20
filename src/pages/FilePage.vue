<script setup lang="ts">
import { onMounted, onUnmounted, ref, type Ref } from 'vue';
import useFileStore from '@/store/file';
import { formatBytes, copyToClipboard } from '@/utils/utils';
import { PutFile } from '@/api';

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
  progress: number; // 添加进度字段
}

let uploadedFiles: Ref<UploadedFile[]> = ref([]);

const uploadSingle = async (index: number, filename: string, file: File) => {
  await PutFile(filename, file, fileStore.visibility, "file", (progress) => {
    uploadedFiles.value[index - 1].progress = progress;
  });
  uploadedFiles.value[index - 1].done = true;
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
        try {
          uploadSingle(index, file.name, file);
        } catch (error) {
          console.error(error);
          // 可以在这里处理错误状态
        }
      }
    }
}

onMounted(() => {
  fileUploadInput.value.addEventListener('change', async (event: Event) => {
    const target = event.target as HTMLInputElement;
    const { files } = target;
    await handleFiles(files);
    // 清空 input，防止上传同名文件不触发 change
    target.value = ''; 
  });
});

let fileUploadArea = ref();
const isDragOver = ref(false); // 使用响应式变量控制样式

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
    <div class="file-area flex flex-col mt-4" :class="{ 'drag-over': isDragOver }">
      <div class="files" @click="requestUploadFile" ref="fileUploadArea">
        <input ref="fileUploadInput" type="file" class="hidden" multiple />
        <div v-if="isDragOver" class="drag-hint">Drop files here</div>
      </div>
      <div class="footer p-2">
        <select class="public-select" v-model="fileStore.visibility">
          <option value="private">{{ $t('common.private') }}</option>
          <option value="public">{{ $t('common.public') }}</option>
        </select>
      </div>
    </div>
    <div class="px-4 py-4 max-w-screen-md w-4/5">
      <div v-for="file in uploadedFiles" :key="file.name" class="w-full flex flex-col mt-4 rounded border-1 border-gray-200 p-2">
        <div class="flex flex-row items-center">
          <div class="w-10 h-10 i-mdi-file-document-outline shrink-0"></div>
          <div class="flex flex-col min-w-0 flex-1 mx-2">
            <a class="text-lg font-semibold truncate hover:text-blue-500" :href="`/${file.name}`" target="_blank">{{ file.name }}</a>
            <div class="text-sm text-gray">{{ formatBytes(file.size) }} · {{ file.visibility }}</div>
          </div>
          
          <div class="flex flex-row gap-2 ml-auto shrink-0">
             <!-- Copy Link Button -->
             <button v-if="file.done" class="w-6 h-6 i-mdi-content-copy cursor-pointer text-gray-500 hover:text-blue-500" 
                title="Copy Link" @click="onCopyLink(file.name)"></button>
             <!-- Status Icon -->
             <div class="w-6 h-6" :class="file.done ? 'i-mdi-check text-green-500' : 'i-mdi-loading animate-spin text-blue-500'"></div>
          </div>
        </div>
        
        <!-- Progress Bar -->
        <div v-if="!file.done" class="w-full bg-gray-200 rounded-full h-1.5 mt-2">
          <div class="bg-blue-600 h-1.5 rounded-full transition-all duration-300" :style="{ width: file.progress + '%' }"></div>
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

.pannel {
  --uno: my-6 px-4 py-4 max-w-screen-md w-4/5 rounded shadow-md;
}

.tips-pannel {
  background-color: #d1e7dd;
}

.file-area {
  --uno: rounded max-w-screen-md w-4/5 border-1 border-gray-300 transition-colors duration-200;
  background-color: white;
}

/* 响应式拖拽样式 */
.file-area.drag-over {
  border-color: #0969da;
  background-color: #f0f8ff;
}

.file-area .header {
  background-color: #f5f5f5;
}

.file-area .footer {
  --uno: flex flex-row;
  background-color: #f5f5f5;
}

.file-area .footer .public-select {
  --uno: border-1 rounded px-6 py-1.5 text-sm;
  border-color: #d1d1d1;
  outline-color: #0969da;
}

.file-area .footer .save-btn {
  --uno: rounded px-6 py-1.5 text-sm ml-auto text-white;
  background-color: #1f883d;
}

.file-area .footer .save-btn:hover {
  background-color: #1a7f37;
}

.file-area .header .filename-input {
  --uno: border-1 rounded px-3 py-2 text-sm w-60;
  border-color: #d1d1d1;
  outline-color: #0969da;
}

.files {
  --uno: h-50 border-dashed border-2 cursor-pointer relative flex items-center justify-center;
  border-color: transparent; /* 由父级控制边框颜色 */
  background: url(../assets/upload.svg) center center no-repeat;
  /* background-color: white; removed to let parent background show */
}

.drag-hint {
  position: absolute;
  background: rgba(255, 255, 255, 0.8);
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: bold;
  pointer-events: none;
}
</style>
