"""爬取 jinjiancheng.com 的公众号文章正文（不含评论），保存为 Markdown。

- https://www.jinjiancheng.com/articles/jinjiancheng -> docs/articles/jinjiancheng/
- https://www.jinjiancheng.com/articles/tianjiqitan  -> docs/articles/tianjiqitan/
"""

from __future__ import annotations

import argparse
import random
import re
import time
from collections.abc import Callable
from pathlib import Path
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

BASE_URL = "https://www.jinjiancheng.com"
OUTPUT_ROOT = Path(__file__).parent / "docs" / "articles"
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
    ),
    "Accept-Language": "zh-CN,zh;q=0.9",
}

# 文章地址形如 /articles/<公众号>/<YYYY-MM-DD>
ARTICLE_PATH_RE = re.compile(r"^/articles/[a-z0-9-]+/\d{4}-\d{2}-\d{2}$")

SECTIONS = {
    "jinjiancheng": "/articles/jinjiancheng",
    "tianjiqitan": "/articles/tianjiqitan",
}


def safe_filename(title: str) -> str:
    """将文章标题转换为可安全使用的文件名。"""
    name = re.sub(r'[\\/:*?"<>|\x00-\x1f]', "-", title)
    name = re.sub(r"\s+", " ", name).strip(" .-")
    return name or "未命名"


class Crawler:
    def __init__(self, delay: float = 1.0, timeout: int = 20, retries: int = 3):
        self.session = requests.Session()
        self.session.headers.update(HEADERS)
        self.delay = delay
        self.timeout = timeout
        self.retries = retries

    def get(self, url: str) -> str:
        last_error: Exception | None = None
        for attempt in range(1, self.retries + 1):
            try:
                resp = self.session.get(url, timeout=self.timeout)
                resp.raise_for_status()
                # 站点未在响应头声明 charset，requests 会误判为 ISO-8859-1
                if "charset" not in resp.headers.get("Content-Type", "").lower():
                    resp.encoding = "utf-8"
                return resp.text
            except requests.RequestException as exc:
                last_error = exc
                time.sleep(self.delay * attempt * 2)
        raise RuntimeError(f"请求失败 {url}: {last_error}")

    def sleep(self) -> None:
        time.sleep(self.delay + random.uniform(0, 0.4))

    def collect_links(
        self, list_path: str, is_saved: Callable[[str], bool] | None = None
    ) -> list[str]:
        """遍历分页收集文章地址。

        列表按时间倒序，新文章只会出现在前面；传入 is_saved 后，
        遇到整页都已下载就停止翻页。
        """
        seen: set[str] = set()
        ordered: list[str] = []
        page = 1
        while True:
            url = BASE_URL + (list_path if page == 1 else f"{list_path}/p/{page}")
            print(f"[列表] {url}")
            soup = BeautifulSoup(self.get(url), "html.parser")
            # 页脚的“最新文章”也匹配文章地址，因此只取正文区域的链接
            scope = soup.select_one("main") or soup

            page_links: list[str] = []
            for a in scope.select("a[href]"):
                href = urljoin(BASE_URL, a["href"]).split("#")[0].split("?")[0]
                path = href[len(BASE_URL):]
                if ARTICLE_PATH_RE.match(path) and href not in seen:
                    seen.add(href)
                    page_links.append(href)
            ordered.extend(page_links)

            total_pages = self._total_pages(scope)
            print(
                f"       新增 {len(page_links)} 篇，累计 {len(ordered)} 篇"
                f"（第 {page}/{total_pages} 页）"
            )

            if is_saved is not None and page_links and all(map(is_saved, page_links)):
                print("       本页已全部下载，停止翻页")
                break
            if page >= total_pages:
                break
            page += 1
            self.sleep()
        return ordered

    @staticmethod
    def _total_pages(soup: BeautifulSoup) -> int:
        pages = {1}
        for a in soup.select("a[href]"):
            m = re.search(r"/p/(\d+)$", a["href"])
            if m:
                pages.add(int(m.group(1)))
        return max(pages)

    def fetch_article(self, url: str) -> tuple[str, str] | None:
        """返回 (标题, 正文 Markdown)，正文取 div.prose，不含评论区。"""
        soup = BeautifulSoup(self.get(url), "html.parser")
        body = soup.select_one("article div.prose") or soup.select_one("div.prose")
        if body is None:
            return None

        title_el = soup.select_one("h1")
        title = title_el.get_text(strip=True) if title_el else url.rsplit("/", 1)[-1]

        # 部分文章整篇装在一个 <p> 里，靠 <br> 分段
        for br in body.find_all("br"):
            br.replace_with("\n")

        def segments(node) -> list[str]:
            raw = node.get_text(" ", strip=False)
            parts = (re.sub(r"[^\S\n]+", " ", p).strip() for p in raw.split("\n"))
            return [p for p in parts if p]

        lines: list[str] = []
        for node in body.find_all(["h1", "h2", "h3", "h4", "p", "li", "blockquote", "pre"]):
            name = node.name
            if name == "pre":
                lines.append(f"```\n{node.get_text()}\n```")
                continue

            parts = segments(node)
            if not parts:
                continue
            if name in {"h1", "h2", "h3", "h4"}:
                lines.append("#" * (int(name[1]) + 1) + f" {' '.join(parts)}")
            elif name == "li":
                lines.append(f"- {' '.join(parts)}")
            elif name == "blockquote":
                lines.extend(f"> {p}" for p in parts)
            else:
                lines.extend(parts)

        if not lines:
            text = body.get_text("\n", strip=True)
            lines = [ln.strip() for ln in text.splitlines() if ln.strip()]

        return title, "\n\n".join(lines)

    def run(
        self, section: str, list_path: str, overwrite: bool = False, full: bool = False
    ) -> None:
        out_dir = OUTPUT_ROOT / section
        out_dir.mkdir(parents=True, exist_ok=True)

        def date_of(url: str) -> str:
            return url.rsplit("/", 1)[-1]

        def saved_path(url: str) -> Path | None:
            return next(out_dir.glob(f"{date_of(url)}-*.md"), None)

        incremental = not (full or overwrite)
        links = self.collect_links(
            list_path, is_saved=(lambda u: saved_path(u) is not None) if incremental else None
        )
        print(f"\n[{section}] 待处理 {len(links)} 篇文章，输出目录 {out_dir}\n")

        saved = skipped = failed = 0
        for idx, url in enumerate(links, 1):
            old_path = saved_path(url)
            if old_path is not None and not overwrite:
                skipped += 1
                continue

            try:
                result = self.fetch_article(url)
            except RuntimeError as exc:
                print(f"  [{idx}/{len(links)}] 失败 {url}: {exc}")
                failed += 1
                continue

            if result is None:
                print(f"  [{idx}/{len(links)}] 无正文 {url}")
                failed += 1
                continue

            title, content = result
            path = out_dir / f"{date_of(url)}-{safe_filename(title)}.md"
            if old_path is not None and old_path != path:
                old_path.unlink()
            path.write_text(f"# {title}\n\n{content}\n", encoding="utf-8")
            saved += 1
            print(f"  [{idx}/{len(links)}] 已保存 {path.name} · {title}")
            self.sleep()

        print(f"\n[{section}] 完成：新增 {saved}，跳过 {skipped}，失败 {failed}\n")


def main() -> None:
    parser = argparse.ArgumentParser(description="爬取 jinjiancheng.com 文章正文")
    parser.add_argument(
        "--section",
        choices=[*SECTIONS, "both"],
        default="both",
        help="要爬取的栏目，默认两个都爬",
    )
    parser.add_argument("--delay", type=float, default=1.0, help="请求间隔秒数")
    parser.add_argument("--overwrite", action="store_true", help="覆盖已存在的文件")
    parser.add_argument(
        "--full", action="store_true", help="遍历全部分页，不在整页已下载时提前停止"
    )
    args = parser.parse_args()

    crawler = Crawler(delay=args.delay)
    targets = SECTIONS.items() if args.section == "both" else [
        (args.section, SECTIONS[args.section])
    ]
    for section, list_path in targets:
        crawler.run(section, list_path, overwrite=args.overwrite, full=args.full)


if __name__ == "__main__":
    main()
