// Small, deliberately text-only Markdown subset: no embedded HTML, images or scripts.
export function escapeHtml(value: unknown) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
}
export function renderMarkdown(source: string): string {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: string[] = [],
    paragraph: string[] = [],
    list: string[] = [];
  let listType = "",
    code: string[] | null = null;
  const flushParagraph = () => {
    if (paragraph.length)
      blocks.push(`<p>${paragraph.splice(0).map(escapeHtml).join("<br>")}</p>`);
  };
  const flushList = () => {
    if (list.length)
      blocks.push(
        `<${listType}>${list
          .splice(0)
          .map((s) => `<li>${escapeHtml(s)}</li>`)
          .join("")}</${listType}>`,
      );
    listType = "";
  };
  for (const line of lines) {
    if (line.startsWith("```")) {
      flushParagraph();
      flushList();
      if (code) {
        blocks.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`);
        code = null;
      } else code = [];
      continue;
    }
    if (code) {
      code.push(line);
      continue;
    }
    const heading = line.match(/^(#{1,3})\s+(.+)$/),
      bullet = line.match(/^\s*([-*]|\d+\.)\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();
      const level = Number(heading[1].length) + 1;
      blocks.push(`<h${level}>${escapeHtml(heading[2])}</h${level}>`);
    } else if (bullet) {
      flushParagraph();
      const next = /\d/.test(bullet[1]) ? "ol" : "ul";
      if (listType && listType !== next) flushList();
      listType = next;
      list.push(bullet[2]);
    } else if (!line.trim()) {
      flushParagraph();
      flushList();
    } else {
      flushList();
      paragraph.push(line);
    }
  }
  flushParagraph();
  flushList();
  if (code)
    blocks.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`);
  return blocks.join("\n");
}
