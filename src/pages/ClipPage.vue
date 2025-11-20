<script setup lang="ts">
import { minimalSetup } from "codemirror"
import { EditorState } from "@codemirror/state"
import { EditorView, lineNumbers, highlightSpecialChars, drawSelection, dropCursor } from "@codemirror/view"

import { onMounted, onBeforeUnmount, ref } from "vue";
import useClipStore from "@/store/clip";
import { useRouter } from 'vue-router';

import { PutFile } from "@/api";
import { getRandomFilename, copyToClipboard } from "@/utils/utils";
import { toast } from '@/utils/toast';
import { useI18n } from 'vue-i18n';

const { t: $t } = useI18n();
const router = useRouter();

const code = ref("");
const modified = ref(false);
const editorElement = ref();
let editor: EditorView;

let startState = EditorState.create({
  doc: "",
  extensions: [
    minimalSetup,
    lineNumbers(),
    highlightSpecialChars(),
    drawSelection(),
    dropCursor(),
    EditorView.updateListener.of((update) => {
      code.value = update.state.doc.toString();
      if (update.docChanged) {
        modified.value = true;
      }
    }),
    EditorView.theme({
      "&": { height: "100%" },
      ".cm-scroller": { fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }
    })
  ]
})

onMounted(() => {
  editor = new EditorView({
    state: startState,
    parent: editorElement.value,
  })
})

let filename = ref(getRandomFilename());

let refreshRandomFileName = () => {
  filename.value = getRandomFilename();
}

const clipStore = useClipStore();

let onSaveBtnClick = async () => {
  await PutFile(filename.value, code.value, clipStore.visibility, "text");
  modified.value = false;
  toast($t('message.save_success'), 'success');
}

let saveContentKeydown = (e: KeyboardEvent) => {
  if ((e.ctrlKey && e.key === "s") || (e.metaKey && e.key === "s")) {
    e.preventDefault();
    onSaveBtnClick();
  }
}

let onPasteFile = async (e: ClipboardEvent) => {
  const target = e.target as HTMLElement;
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' && target !== editor.contentDOM)) {
    return;
  }

  if (!e.clipboardData?.files.length) {
    return;
  }
  const file = e.clipboardData.files[0];
  const text = await file.text();
  const cursor = editor.state.selection.main.head;
  editor.dispatch({
    changes: { from: cursor, insert: text },
  });
}


onMounted(() => {
  window.addEventListener("keydown", saveContentKeydown);
  document.addEventListener("paste", onPasteFile);
})

onBeforeUnmount(() => {
  window.removeEventListener("keydown", saveContentKeydown);
  document.removeEventListener("paste", onPasteFile);
})

const getFileUrl = () => {
  return `${window.location.origin}/${filename.value}`;
}

const onCopyLink = () => {
  copyToClipboard(getFileUrl());
}

const onCopyContent = () => {
  copyToClipboard(code.value);
}

const goHome = () => router.push('/');
</script>

<template>
  <div class="page-container h-screen overflow-hidden !py-4">
    <!-- 顶部工具栏 -->
    <div class="w-full max-w-5xl bg-white rounded-t-xl border border-gray-200 border-b-0 shadow-sm p-2 flex items-center gap-3 z-10 relative">
      <button @click="goHome" class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
        <div class="i-mdi-arrow-left text-xl"></div>
      </button>
      
      <div class="h-6 w-px bg-gray-200 mx-1"></div>

      <div class="flex items-center bg-gray-50 rounded-lg border border-gray-200 px-2 py-1 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
         <input class="bg-transparent outline-none text-sm w-32 sm:w-48 text-gray-700 font-mono" type="text" v-model="filename" :placeholder="$t('common.filename')" />
         <button @click="refreshRandomFileName" class="text-gray-400 hover:text-blue-500 transition-colors ml-1 p-1">
            <div class="i-mdi-refresh text-lg"></div>
         </button>
      </div>

      <div class="ml-auto flex items-center gap-2">
         <div class="hidden sm:flex items-center gap-1 mr-2">
             <button class="p-1.5 rounded-md hover:bg-gray-100 text-gray-600 transition-colors" :title="$t('common.copy_link')" @click="onCopyLink">
                <div class="i-mdi-link-variant text-lg"></div>
             </button>
             <button class="p-1.5 rounded-md hover:bg-gray-100 text-gray-600 transition-colors" :title="$t('common.copy_content')" @click="onCopyContent">
                <div class="i-mdi-content-copy text-lg"></div>
             </button>
         </div>
         
         <select class="bg-gray-50 border border-gray-200 text-gray-600 text-xs rounded-md px-2 py-1.5 focus:outline-none cursor-pointer hover:bg-gray-100" v-model="clipStore.visibility">
            <option value="private">{{ $t('common.private') }}</option>
            <option value="public">{{ $t('common.public') }}</option>
         </select>

         <button class="flex items-center gap-2 px-4 py-1.5 rounded-lg text-white text-sm font-medium shadow-sm transition-all" 
            :class="modified ? 'bg-amber-500 hover:bg-amber-600' : 'bg-green-600 hover:bg-green-700'"
            @click="onSaveBtnClick">
            <div v-if="modified" class="i-mdi-content-save-edit text-lg"></div>
            <div v-else class="i-mdi-check text-lg"></div>
            <span class="hidden sm:inline">{{ modified ? 'Save *' : $t('common.saved') }}</span>
         </button>
      </div>
    </div>

    <!-- 编辑器区域 -->
    <div class="w-full max-w-5xl flex-1 bg-white rounded-b-xl border border-gray-200 shadow-sm overflow-hidden relative">
        <div ref="editorElement" class="h-full text-sm"></div>
    </div>
  </div>
</template>

<style>
/* Codemirror Customization */
.cm-editor {
  height: 100%;
}
.cm-scroller {
    padding-top: 0.5rem;
}
.cm-gutters {
    background-color: #fff !important;
    border-right: 1px solid #f3f4f6 !important;
    color: #9ca3af !important;
}
.cm-activeLineGutter {
    background-color: #f0f9ff !important;
    color: #0ea5e9 !important;
}
.cm-activeLine {
    background-color: #f0f9ff40 !important;
}
.cm-selectionBackground {
    background-color: #bae6fd80 !important;
}
</style>
