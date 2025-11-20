<script setup lang="ts">
import { minimalSetup } from "codemirror"
import { EditorState } from "@codemirror/state"
import { EditorView, lineNumbers, highlightSpecialChars, drawSelection, dropCursor } from "@codemirror/view"

import { onMounted, onBeforeUnmount, ref } from "vue";
import useClipStore from "@/store/clip";

import { PutFile } from "@/api";
import { getRandomFilename, copyToClipboard } from "@/utils/utils";
import { toast } from '@/utils/toast';

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
    // 文件拖动
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
  // 重置修改状态，因为看起来像是新文件
  // modified.value = true; // 或者保持状态
}

const clipStore = useClipStore();

let onSaveBtnClick = async () => {
  await PutFile(filename.value, code.value, clipStore.visibility, "text");
  modified.value = false;
  toast('Saved successfully', 'success');
}

let saveContentKeydown = (e: KeyboardEvent) => {
  if ((e.ctrlKey && e.key === "s") || (e.metaKey && e.key === "s")) {
    e.preventDefault();
    onSaveBtnClick();
  }
}

let onPasteFile = async (e: ClipboardEvent) => {
  // 仅当编辑器聚焦或没有明确焦点时处理，防止干扰 input
  const target = e.target as HTMLElement;
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' && target !== editor.contentDOM)) {
    return;
  }

  if (!e.clipboardData?.files.length) {
    return;
  }
  const file = e.clipboardData.files[0];
  console.log(file);
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
    <div class="text-area flex flex-col mt-4">
      <div class="header p-2 flex flex-row items-center gap-2">
        <input class="filename-input monospace" type="text" v-model="filename" :placeholder="$t('common.filename')" />
        <button @click="refreshRandomFileName" class="i-mdi-refresh w-5 h-5 cursor-pointer hover:text-blue-500" title="Refresh Filename"></button>
        
        <div class="ml-auto flex items-center gap-2">
             <!-- Copy Link -->
             <button class="i-mdi-link w-5 h-5 cursor-pointer hover:text-blue-500" title="Copy Link" @click="onCopyLink"></button>
             <!-- Copy Content -->
             <button class="i-mdi-content-copy w-5 h-5 cursor-pointer hover:text-blue-500" title="Copy Content" @click="onCopyContent"></button>
             <!-- Status Indicator -->
             <div :class="modified ? 'unsave-attention' : 'save-attention'" :title="modified ? 'Unsaved changes' : 'Saved'"></div>
        </div>
      </div>
      <div ref="editorElement"></div>
      <div class="footer p-2">
        <select class="public-select" v-model="clipStore.visibility">
          <option value="private">{{ $t('common.private') }}</option>
          <option value="public">{{ $t('common.public') }}</option>
        </select>
        <button class="save-btn" @click="onSaveBtnClick">{{ $t('common.save') }}</button>
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
  --uno: rounded max-w-screen-md w-4/5 border-1 border-gray-300;
  background-color: white;
}

.text-area .header {
  background-color: #f5f5f5;
}

.text-area .footer {
  --uno: flex flex-row;
  background-color: #f5f5f5;
}

.text-area .footer .public-select {
  --uno: border-1 rounded px-6 py-1.5 text-sm;
  border-color: #d1d1d1;
  outline-color: #0969da;
}

.text-area .footer .save-btn {
  --uno: rounded px-6 py-1.5 text-sm ml-auto text-white;
  background-color: #1f883d;
}

.text-area .footer .save-btn:hover {
  background-color: #1a7f37;
}

.text-area .header .filename-input {
  --uno: border-1 rounded px-3 py-2 text-sm w-60;
  border-color: #d1d1d1;
  outline-color: #0969da;
}

.cm-editor {
  height: 400px;
  border-top: 1px solid #ddd;
  border-bottom: 1px solid #ddd;
}

.cm-editor.cm-focused {
  outline: none;
}

.cm-gutter.cm-lineNumbers {
  background-color: white;
}

.cm-gutters {
  border: none !important;
}

.cm-selectionBackground {
  background-color: #54aeff66 !important;
}

.unsave-attention {
  --uno: i-mdi-circle-medium w-6 h-6;
  color: #eab308 !important; /* yellow-500 */
}

.save-attention {
  --uno: i-mdi-circle-medium w-6 h-6;
  color: #22c55e !important; /* green-500 */
}
</style>
