<script setup lang="ts">
import { minimalSetup } from "codemirror"
import { EditorState } from "@codemirror/state"
import { EditorView, lineNumbers, highlightSpecialChars, drawSelection, dropCursor } from "@codemirror/view"

import { onMounted, onBeforeUnmount, ref } from "vue";
import useClipStore from "@/store/clip";

import { PutFile } from "@/api";
import { getRandomFilename, copyToClipboard } from "@/utils/utils";
import { toast } from '@/utils/toast';
import { useI18n } from 'vue-i18n';

const { t: $t } = useI18n();

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
  ]
})

onMounted(() => {
  editor = new EditorView({
    state: startState,
    parent: editorElement.value,
  })
  editor.requestMeasure({
    read: () => {
      editor.focus();
    }
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

</script>

<template>
  <div class="flex flex-col items-center">
    <div class="text-area flex flex-col mt-4 shadow-sm">
      <div class="header p-2 flex flex-row items-center gap-2 border-b border-gray-200">
        <input class="filename-input monospace bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none" type="text" v-model="filename" :placeholder="$t('common.filename')" />
        <button @click="refreshRandomFileName" class="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-200 transition text-gray-600" :title="$t('common.refresh_filename')">
            <div class="i-mdi-refresh text-xl"></div>
        </button>
        
        <div class="ml-auto flex items-center gap-1">
             <!-- Copy Link -->
             <button class="w-8 h-8 flex items-center justify-center rounded hover:bg-blue-50 transition text-gray-600 hover:text-blue-600" :title="$t('common.copy_link')" @click="onCopyLink">
                <div class="i-mdi-link text-xl"></div>
             </button>
             <!-- Copy Content -->
             <button class="w-8 h-8 flex items-center justify-center rounded hover:bg-blue-50 transition text-gray-600 hover:text-blue-600" :title="$t('common.copy_content')" @click="onCopyContent">
                <div class="i-mdi-content-copy text-lg"></div>
             </button>
             <!-- Status Indicator -->
             <div class="ml-2 flex items-center justify-center w-6 h-6" :title="modified ? $t('common.unsaved_changes') : $t('common.saved')">
                <div :class="modified ? 'unsave-attention' : 'save-attention'"></div>
             </div>
        </div>
      </div>
      <div ref="editorElement"></div>
      <div class="footer p-2 border-t border-gray-200 bg-gray-50">
        <select class="public-select" v-model="clipStore.visibility">
          <option value="private">{{ $t('common.private') }}</option>
          <option value="public">{{ $t('common.public') }}</option>
        </select>
        <button class="save-btn transition" @click="onSaveBtnClick">{{ $t('common.save') }}</button>
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

.text-area {
  --uno: rounded-lg max-w-screen-md w-4/5 border border-gray-300 overflow-hidden;
  background-color: white;
}

.text-area .header {
  background-color: #f9fafb;
}

.text-area .footer {
  --uno: flex flex-row items-center;
}

.text-area .footer .public-select {
  --uno: border border-gray-300 rounded px-3 py-1.5 text-sm bg-white text-gray-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500;
}

.text-area .footer .save-btn {
  --uno: rounded px-5 py-1.5 text-sm ml-auto text-white font-medium shadow-sm;
  background-color: #1f883d;
}

.text-area .footer .save-btn:hover {
  background-color: #1a7f37;
}

.text-area .header .filename-input {
  --uno: border border-gray-300 rounded px-3 py-1.5 text-sm w-60 text-gray-700;
}

.cm-editor {
  height: 500px; /* 增加一点高度 */
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}

.cm-editor.cm-focused {
  outline: none;
}

.cm-scroller {
    overflow: auto;
}

.cm-gutter.cm-lineNumbers {
  background-color: #f9fafb;
  color: #9ca3af;
  border-right: 1px solid #e5e7eb;
}

.cm-gutters {
  border-right: 1px solid #e5e7eb !important;
  background-color: #f9fafb;
}

.cm-selectionBackground {
  background-color: #bae6fd !important; /* blue-200 */
}

.unsave-attention {
  --uno: i-mdi-circle w-3 h-3;
  color: #eab308 !important; /* yellow-500 */
}

.save-attention {
  --uno: i-mdi-circle w-3 h-3;
  color: #22c55e !important; /* green-500 */
}
</style>
