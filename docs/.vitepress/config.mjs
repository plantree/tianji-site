import { defineConfig } from 'vitepress'
import { SECTIONS, articlesOf, groupByYearMonth } from './articles.mjs'

function sidebarOf(dir) {
  const groups = [...groupByYearMonth(articlesOf(dir))].map(([year, months]) => ({
    text: `${year} 年`,
    collapsed: true,
    items: [...months].map(([month, list]) => ({
      text: `${Number(month)} 月（${list.length}）`,
      collapsed: true,
      items: list.map((a) => ({
        text: `${a.month}-${a.day} ${a.title}`,
        link: a.link,
      })),
    })),
  }))

  // 默认展开最新的年份与月份
  if (groups.length) {
    groups[0].collapsed = false
    groups[0].items[0].collapsed = false
  }
  return groups
}

export default defineConfig({
  title: '金渐成/天机奇谈',
  description: '金渐成与天机奇谈的公众号文章归档',
  lang: 'zh-CN',
  lastUpdated: true,
  cleanUrls: true,
  ignoreDeadLinks: true,
  head: [['meta', { name: 'theme-color', content: '#3c8772' }]],
  themeConfig: {
    nav: SECTIONS.map((s) => ({ text: s.text, link: `/articles/${s.dir}/` })),
    sidebar: Object.fromEntries(
      SECTIONS.map((s) => [`/articles/${s.dir}/`, sidebarOf(s.dir)])
    ),
    search: { provider: 'local' },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/plantree/tianji-site' },
    ],
    outline: { level: [2, 3], label: '本页目录' },
    docFooter: { prev: '上一篇', next: '下一篇' },
    lastUpdatedText: '最后更新',
    returnToTopLabel: '回到顶部',
    darkModeSwitchLabel: '主题',
    sidebarMenuLabel: '目录',
    footer: {
      message: '内容版权归原作者所有，本站仅作个人阅读归档。',
      copyright:
        'Released under the MIT License. Authored by <a href="https://plantree.me" target="_blank">Plantree</a>.',
    },
  },
})
