<script setup lang="ts">
import { useI18n } from "vue-i18n";
import useI18nStore from "../store/i18n";
import { useRouter } from "vue-router";

const router = useRouter();

const i18nStore = useI18nStore();
let updateLocale = (locale: string) => {
  i18nStore.setLocale(locale);
};

const { locale } = useI18n();
if (i18nStore.locale !== "") {
  locale.value = i18nStore.locale;
}

let onClipAreaClick = () => {
  router.push("/clip");
};

let onUploadClick = () => {
  router.push("/file");
};
</script>

<template>
  <div class="page-container justify-center sm:justify-start">
    <div class="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 md:mt-20">
      
      <!-- 文件传输卡片 -->
      <div class="group relative overflow-hidden rounded-2xl bg-white shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer border border-blue-100 h-64 flex flex-col" @click="onUploadClick">
        <div class="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all"></div>
        
        <div class="p-6 flex-1 flex flex-col items-center justify-center z-10">
          <div class="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
            <div class="i-mdi-cloud-upload text-4xl text-blue-500"></div>
          </div>
          <h2 class="text-2xl font-bold text-gray-800 group-hover:text-blue-600 transition-colors">{{ $t("index.file_channel_title") }}</h2>
          <p class="text-gray-400 mt-2 text-sm">{{ $t("index.tips_content") }}</p>
        </div>
        
        <div class="bg-blue-50 p-3 text-center text-blue-600 font-medium text-sm group-hover:bg-blue-100 transition-colors">
          <span class="group-hover:underline decoration-dashed underline-offset-4">Go to Files &rarr;</span>
        </div>
      </div>

      <!-- 剪贴板卡片 -->
      <div class="group relative overflow-hidden rounded-2xl bg-white shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer border border-rose-100 h-64 flex flex-col" @click="onClipAreaClick">
        <div class="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl group-hover:bg-rose-500/20 transition-all"></div>
        
        <div class="p-6 flex-1 flex flex-col items-center justify-center z-10">
          <div class="w-20 h-20 bg-rose-50 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
            <div class="i-mdi-clipboard-text text-4xl text-rose-500"></div>
          </div>
          <h2 class="text-2xl font-bold text-gray-800 group-hover:text-rose-600 transition-colors">{{ $t("index.clip_channel_title") }}</h2>
          <p class="text-gray-400 mt-2 text-sm">Sync text instantly</p>
        </div>

        <div class="bg-rose-50 p-3 text-center text-rose-600 font-medium text-sm group-hover:bg-rose-100 transition-colors">
          <span class="group-hover:underline decoration-dashed underline-offset-4">Go to Clipboard &rarr;</span>
        </div>
      </div>

    </div>

    <div class="mt-12">
      <div class="relative inline-block">
        <select v-model="$i18n.locale" class="appearance-none bg-white border border-gray-200 text-gray-700 py-2 pl-4 pr-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer shadow-sm text-sm font-medium" @change="updateLocale($i18n.locale)">
          <option v-for="locale in $i18n.availableLocales" :key="`locale-${locale}`" :value="locale">{{ locale === 'zh' ? '简体中文' : 'English' }}</option>
        </select>
        <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
          <div class="i-mdi-chevron-down text-lg"></div>
        </div>
      </div>
    </div>
    
    <div class="mt-auto py-6 text-gray-300 text-xs">
       Powered by FileWorker
    </div>
  </div>
</template>

<style scoped>
/* 使用 UnoCSS/Tailwind 类，大部分自定义 CSS 已移除 */
</style>
