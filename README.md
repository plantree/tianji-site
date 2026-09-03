# tianji-site

归档 [jinjiancheng.com](https://www.jinjiancheng.com) 上的公众号文章（只保留正文），并用 VitePress 构建成可检索的静态站点。

## 目录结构

```
docs/
├── .vitepress/
│   ├── config.mjs         # 站点配置，侧边栏构建时生成
│   ├── articles.mjs       # 扫描文章目录、读标题、按年月分组
│   └── articles.data.mjs  # 数据加载器，供索引页渲染列表
├── index.md               # 首页
└── articles/
    ├── jinjiancheng/      # 金渐成，441 篇
    └── tianjiqitan/       # 天机奇谈，317 篇
crawler.py                    # 爬虫
```

两个公众号分开爬取，目录之间不重叠。文章文件名为 `<日期>-<标题>.md`，例如 `2024-10-15-有个事注意一下.md`，内容以 `# 标题` 开头。标题会被提取用作侧边栏和索引页的条目文字。

## 站点

```bash
npm install
npm run dev      # 本地预览
npm run build    # 构建到 docs/.vitepress/dist
npm run preview  # 预览构建结果
```

侧边栏不需要手写：构建时扫描 `docs/articles/*/` 下的文件，按年、月两级分组，最新的年份与月份默认展开。新文章爬下来后直接重新构建即可生效。

## 爬虫

```bash
pip install -r requirements.txt

python crawler.py                       # 增量爬取两个公众号
python crawler.py --section tianjiqitan # 只爬天机奇谈（或 jinjiancheng）
python crawler.py --delay 1.5           # 放慢请求间隔（秒）
python crawler.py --full                # 遍历全部分页
python crawler.py --overwrite           # 重新抓取并覆盖已有文件
```

抓取结果写入 `docs/articles/<公众号>/`。

### 增量逻辑

列表页按时间倒序，新文章只会出现在前面。默认情况下，当某一页的文章全部已存在于本地时就停止翻页，因此常规运行只需请求 1～2 个列表页。

积压较多时会自动继续往后翻，无需调整参数。`--full` 会强制遍历全部分页，适合怀疑归档中间有缺漏时使用。

## 自动化

[crawl.yml](.github/workflows/crawl.yml) 每周一 UTC 02:00 自动增量爬取，也可手动触发；仅在发现新文章时提交。

需要在 **Settings → Actions → General → Workflow permissions** 中启用 **Read and write permissions**，否则爬虫推送会因权限不足失败。

## 实现说明

- 正文取自文章页的 `div.prose`，评论、标签、相关链接、页脚均在该容器之外。
- 列表页只取 `<main>` 内的链接，避免页脚的“最新文章”把其他公众号的文章混进来。
- 站点响应头未声明 charset，代码强制按 UTF-8 解码。
- 请求失败会退避重试，请求之间有随机间隔。
