# tianji-site

归档 [jinjiancheng.com](https://www.jinjiancheng.com) 上的公众号文章，只保留正文（不含评论、标签、页脚等）。

## 目录结构

| 目录 | 来源 | 篇数 |
| --- | --- | --- |
| `articles/jinjiancheng/` | `/articles/jinjiancheng` | 441 |
| `articles/tianjiqitan/` | `/articles/tianjiqitan` | 317 |

两个公众号分开爬取，目录之间不重叠。

文件名为 `<公众号>-<日期>.md`，例如 `tianjiqitan-2024-10-15.md`。内容以 `# 标题` 开头，其后是正文。

## 使用

```bash
pip install -r requirements.txt

python crawler.py                       # 增量爬取两个公众号
python crawler.py --section tianjiqitan # 只爬天机奇谈（或 jinjiancheng）
python crawler.py --delay 1.5           # 放慢请求间隔（秒）
python crawler.py --full                # 遍历全部分页
python crawler.py --overwrite           # 重新抓取并覆盖已有文件
```

### 增量逻辑

列表页按时间倒序，新文章只会出现在前面。默认情况下，当某一页的文章全部已存在于本地时就停止翻页，因此常规运行只需请求 1～2 个列表页。

积压较多时会自动继续往后翻，无需调整参数。`--full` 会强制遍历全部分页，适合怀疑归档中间有缺漏时使用。

## 自动更新

[.github/workflows/crawl.yml](.github/workflows/crawl.yml) 每周一 UTC 02:00（北京时间 10:00）运行一次增量爬取，也可在 Actions 页面手动触发，仅在有新文章时提交。

需要在 **Settings → Actions → General → Workflow permissions** 中启用 “Read and write permissions”，否则推送会因权限不足失败。

## 实现说明

- 正文取自文章页的 `div.prose`，评论、标签、相关链接、页脚均在该容器之外。
- 列表页只取 `<main>` 内的链接，避免页脚的“最新文章”把其他公众号的文章混进来。
- 站点响应头未声明 charset，代码强制按 UTF-8 解码。
- 请求失败会退避重试，请求之间有随机间隔。
