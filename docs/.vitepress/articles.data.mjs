import { SECTIONS, articlesOf } from './articles.mjs'

// VitePress 数据加载器：构建时把文章列表注入页面
export default {
  watch: ['../articles/*/*.md'],
  load() {
    return Object.fromEntries(SECTIONS.map((s) => [s.dir, articlesOf(s.dir)]))
  },
}
