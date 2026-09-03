import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ARTICLES_ROOT = fileURLToPath(new URL('../articles/', import.meta.url))

export const SECTIONS = [
  { dir: 'jinjiancheng', text: '金渐成' },
  { dir: 'tianjiqitan', text: '天机奇谈' },
]

// 文件名形如 2024-10-15-文章标题.md
const FILE_RE = /^(\d{4})-(\d{2})-(\d{2})-.+\.md$/

function readTitle(file) {
  const heading = fs
    .readFileSync(file, 'utf-8')
    .split('\n')
    .find((line) => line.startsWith('# '))
  return heading ? heading.slice(2).trim() : path.basename(file, '.md')
}

/** 读取某个公众号的全部文章，按时间倒序。 */
export function articlesOf(dir) {
  const abs = path.join(ARTICLES_ROOT, dir)
  if (!fs.existsSync(abs)) return []
  return fs
    .readdirSync(abs)
    .filter((name) => FILE_RE.test(name))
    .map((name) => {
      const [, year, month, day] = FILE_RE.exec(name)
      return {
        year,
        month,
        day,
        date: `${year}-${month}-${day}`,
        title: readTitle(path.join(abs, name)),
        link: `/articles/${dir}/${name.slice(0, -3)}`,
      }
    })
    .sort((a, b) => b.date.localeCompare(a.date))
}

/** 按年、月两级分组，顺序与传入数组一致。 */
export function groupByYearMonth(articles) {
  const years = new Map()
  for (const article of articles) {
    if (!years.has(article.year)) years.set(article.year, new Map())
    const months = years.get(article.year)
    if (!months.has(article.month)) months.set(article.month, [])
    months.get(article.month).push(article)
  }
  return years
}
