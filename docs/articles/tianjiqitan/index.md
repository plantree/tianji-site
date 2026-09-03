---
title: 天机奇谈
---

<script setup>
import { data } from '../../.vitepress/articles.data.mjs'
const list = data.tianjiqitan
</script>

# 天机奇谈

共 {{ list.length }} 篇，{{ list[list.length - 1].date }} 至 {{ list[0].date }}。

<ul class="archive">
  <li v-for="a in list" :key="a.link">
    <span class="date">{{ a.date }}</span>
    <a :href="a.link">{{ a.title }}</a>
  </li>
</ul>

<style scoped>
.archive {
  list-style: none;
  padding: 0;
}
.archive li {
  display: flex;
  gap: 0.75rem;
  padding: 0.25rem 0;
}
.archive .date {
  color: var(--vp-c-text-3);
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}
</style>
