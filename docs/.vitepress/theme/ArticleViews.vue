<script setup>
import { computed } from 'vue'
import { useData, useRoute } from 'vitepress'

const { page } = useData()
const route = useRoute()

const isArticle = computed(() => /^articles\/(jinjiancheng|tianjiqitan)\/\d{4}-\d{2}-\d{2}-.+\.md$/.test(page.value.relativePath))
const badgeUrl = computed(() => {
  const pathname = route.path.replace(/\/$/, '')
  return `https://api.visitor.plantree.me/visitor-badge/pv?namespace=tianji.plantree.me&key=${pathname}`
})
</script>

<template>
  <div v-if="isArticle" class="article-views" aria-label="文章访问量">
    <span>阅读量</span>
    <img :src="badgeUrl" alt="文章访问量" height="20">
  </div>
</template>

<style scoped>
.article-views {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 20px;
  margin-bottom: 1rem;
  color: var(--vp-c-text-2);
  font-size: 0.875rem;
}

.article-views img {
  display: block;
  margin: 0;
}
</style>