import DefaultTheme from 'vitepress/theme'
import { h } from 'vue'
import ArticleViews from './ArticleViews.vue'

export default {
  extends: DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, {
      'doc-before': () => h(ArticleViews),
    })
  },
}