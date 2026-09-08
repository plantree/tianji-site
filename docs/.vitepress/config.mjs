import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitepress'
import { SECTIONS, articlesOf, groupByYearMonth } from './articles.mjs'

const DOCS_ROOT = fileURLToPath(new URL('../', import.meta.url))
const SITE_URL = 'http://tianji.plantree.me'
const SITE_NAME = '金渐成/天机奇谈'
const SITE_DESCRIPTION = '金渐成与天机奇谈的公众号文章归档，按时间整理并提供全文搜索。'

function pageRoute(relativePath) {
  const route = relativePath.replace(/\.md$/, '').replace(/\/index$/, '/')
  return route === 'index' ? '/' : `/${route}`
}

function articleDate(relativePath) {
  return relativePath.match(/\/(\d{4}-\d{2}-\d{2})-/)?.[1]
}

function pageDescription(pageData) {
  if (pageData.description) return pageData.description
  const file = path.join(DOCS_ROOT, pageData.relativePath)
  if (!fs.existsSync(file)) return SITE_DESCRIPTION

  const text = fs
    .readFileSync(file, 'utf-8')
    .replace(/^---[\s\S]*?---/m, '')
    .replace(/^#{1,6}\s+.*$/gm, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_`>#~-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return text ? `${text.slice(0, 150)}${text.length > 150 ? '…' : ''}` : SITE_DESCRIPTION
}

function absoluteUrl(relativePath) {
  return new URL(pageRoute(relativePath), `${SITE_URL}/`).href
}

function seoHead(pageData) {
  const description = pageDescription(pageData)
  const canonical = absoluteUrl(pageData.relativePath)
  const date = articleDate(pageData.relativePath)
  const isArticle = Boolean(date)
  const title = pageData.title || SITE_NAME
  const head = [
    ['meta', { name: 'description', content: description }],
    ['meta', { property: 'og:locale', content: 'zh_CN' }],
    ['meta', { property: 'og:site_name', content: SITE_NAME }],
    ['meta', { property: 'og:type', content: isArticle ? 'article' : 'website' }],
    ['meta', { property: 'og:title', content: title }],
    ['meta', { property: 'og:description', content: description }],
    ['meta', { name: 'twitter:card', content: 'summary' }],
    ['meta', { name: 'twitter:title', content: title }],
    ['meta', { name: 'twitter:description', content: description }],
  ]

  head.push(['link', { rel: 'canonical', href: canonical }])
  head.push(['meta', { property: 'og:url', content: canonical }])
  if (date) {
    head.push(['meta', { property: 'article:published_time', content: date }])
  }

  const structuredData = isArticle
    ? {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: title,
        description,
        datePublished: date,
        inLanguage: 'zh-CN',
        author: { '@type': 'Organization', name: pageData.relativePath.includes('/tianjiqitan/') ? '天机奇谈' : '金渐成' },
        mainEntityOfPage: canonical,
        url: canonical,
      }
    : {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: title,
        description,
        inLanguage: 'zh-CN',
        url: canonical,
      }
  head.push(['script', { type: 'application/ld+json' }, JSON.stringify(structuredData)])
  return head
}

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
  title: SITE_NAME,
  description: SITE_DESCRIPTION,
  lang: 'zh-CN',
  lastUpdated: true,
  cleanUrls: true,
  ignoreDeadLinks: true,
  head: [
    ['meta', { name: 'theme-color', content: '#3c8772' }],
    ['meta', { name: 'robots', content: 'index, follow, max-image-preview:large' }],
    ['meta', { name: 'keywords', content: '金渐成,天机奇谈,公众号文章,投资,财经,文章归档' }],
  ],
  transformHead: ({ pageData }) => seoHead(pageData),
  sitemap: { hostname: SITE_URL },
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
