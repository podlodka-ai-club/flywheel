#!/usr/bin/env python3
"""Chunk the wiki pages into retrievable knowledge-base entries.

The pages are written for people and run to a couple of hundred lines each,
which retrieves badly through a keyword search: one page matches every query.
This script emits one entry per atomic unit instead - a triage row, an
escalation trigger, a confusable pair, a glossary sub-table, or a plain
section - each self-contained and tagged with its page's tags.

Output shape matches fixtures/kb_articles.json (id, title, tags, body) plus
`source` and `page`, so the mock KnowledgeBaseConnector can serve it as-is.

    python3 wiki/build_kb.py            # writes wiki/kb_entries.json
    python3 wiki/build_kb.py --check    # also validates links and identifiers
    python3 wiki/build_kb.py --coverage # also rewrites wiki/coverage.md

Sources: every entry or paragraph on a page is followed by a hidden comment
`<!-- evidence: FW-021, FW-064 -->` (hide_evidence.py produces them from visible
citations). Comments are stripped from entry bodies; the ticket numbers go into
the entry's `evidence` field.
"""
import json
import os
import re
import statistics
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SKIP = {"README.md", "coverage.md", "_Sidebar.md", "_Footer.md"}

IDENT = re.compile(r"^(?:[EQXUK]-\d{3}|T-[A-Z]{2,5}-\d{2})$")
LINK = re.compile(r"\[([^\]]+)\]\(([^)]+)\)")
WIKI_LINK = re.compile(r"\[[^\]]+\]\(([A-Za-z0-9-]+)\)")
STOP = {
    "the", "and", "for", "with", "from", "that", "this", "when", "what", "into",
    "than", "then", "your", "have", "does", "not", "are", "was", "were", "will",
    "also", "asked", "only", "after", "before", "still", "while", "over",
}


def read_meta(src):
    meta = {"id": None, "type": "page", "audience": "support", "tags": []}
    m = re.match(r"\s*<!-- meta\n(.*?)\n-->", src, re.S)
    if not m:
        return meta
    for line in m.group(1).splitlines():
        if ":" not in line:
            continue
        key, _, value = line.partition(":")
        key, value = key.strip(), value.strip()
        if key == "tags":
            meta["tags"] = [t.strip() for t in value.strip("[]").split(",") if t.strip()]
        else:
            meta[key] = value
    return meta


def flatten(text):
    """Markdown to plain prose: keep the words, drop the scaffolding."""
    text = LINK.sub(r"\1", text)
    text = re.sub(r"<!--.*?-->", "", text, flags=re.S)
    lines = []
    for raw in text.splitlines():
        line = raw.rstrip()
        if not line.strip():
            lines.append("")
            continue
        if re.match(r"^\s*\|?\s*:?-{3,}", line):  # table separator row
            continue
        if line.lstrip().startswith("|"):
            cells = [c.strip() for c in line.strip().strip("|").split("|")]
            line = " | ".join(c for c in cells if c)
        line = re.sub(r"^\s*>\s?", "", line)
        line = re.sub(r"^\s*[-*+]\s+", "- ", line)
        line = re.sub(r"[*_`]", "", line)
        lines.append(line.strip())
    out = "\n".join(lines)
    out = re.sub(r"\n{3,}", "\n\n", out)
    return out.strip()


FW = re.compile(r"\bFW-(\d{3})\b")


def evidence_ids(raw):
    """Ticket numbers referenced in a raw markdown block (comments or links)."""
    seen, out = set(), []
    for n in FW.findall(raw):
        if n not in seen:
            seen.add(n)
            out.append("FW-" + n)
    return out


def heading_tags(*texts):
    tags = []
    for t in texts:
        for w in re.findall(r"[a-z][a-z0-9]+", t.lower()):
            if len(w) > 3 and w not in STOP and w not in tags:
                tags.append(w)
    return tags


def split_long(body, limit=1800):
    """Split an overlong body at paragraph boundaries."""
    if len(body) <= limit:
        return [body]
    parts, cur = [], ""
    for para in body.split("\n\n"):
        if cur and len(cur) + len(para) + 2 > limit:
            parts.append(cur.strip())
            cur = para
        else:
            cur = (cur + "\n\n" + para) if cur else para
    if cur.strip():
        parts.append(cur.strip())
    return parts


def harvest(path):
    src = open(path, encoding="utf-8").read()
    meta = read_meta(src)
    page = os.path.splitext(os.path.basename(path))[0]
    slug = meta.get("id") or page.lower()
    title_m = re.search(r"^# (.+)$", src, re.M)
    page_title = title_m.group(1).strip() if title_m else page
    body_src = src[title_m.end():] if title_m else src

    entries = []
    # split into ## sections (keep preamble)
    pieces = re.split(r"^(?=## )", body_src, flags=re.M)
    preamble = pieces[0]
    pre_text = flatten(preamble)
    if len(pre_text) > 200:
        entries.append({
            "id": f"{slug}-intro",
            "title": page_title,
            "tags": meta["tags"][:],
            "body": pre_text,
            "evidence": evidence_ids(preamble),
            "source": f"{page_title} — overview",
            "page": page,
        })
    for si, sec in enumerate(pieces[1:], start=1):
        sec_title = re.match(r"## (.+)", sec).group(1).strip()
        sec_title_clean = re.sub(r"^\d+\.\s*", "", sec_title)
        subs = re.split(r"^(?=### )", sec, flags=re.M)
        sec_body = flatten(re.sub(r"^## .+\n", "", subs[0], count=1))
        if len(subs) == 1:
            if len(sec_body) < 80:
                continue
            for pi, part in enumerate(split_long(sec_body)):
                suffix = "" if pi == 0 else f"-{chr(97 + pi)}"
                entries.append({
                    "id": f"{slug}-s{si}{suffix}",
                    "title": f"{page_title}: {sec_title_clean}",
                    "tags": meta["tags"] + heading_tags(sec_title_clean),
                    "body": part,
                    "evidence": evidence_ids(subs[0]),
                    "source": f"{page_title} § {sec_title_clean}",
                    "page": page,
                })
            continue
        if len(sec_body) >= 200:
            entries.append({
                "id": f"{slug}-s{si}",
                "title": f"{page_title}: {sec_title_clean}",
                "tags": meta["tags"] + heading_tags(sec_title_clean),
                "body": sec_body,
                "evidence": evidence_ids(subs[0]),
                "source": f"{page_title} § {sec_title_clean}",
                "page": page,
            })
        for ui, sub in enumerate(subs[1:], start=1):
            sub_title = re.match(r"### (.+)", sub).group(1).strip()
            sub_body = flatten(re.sub(r"^### .+\n", "", sub, count=1))
            if len(sub_body) < 40:
                continue
            ident = None
            m = re.match(r"^([A-Z]+-[A-Z0-9]+(?:-\d+)?)\s+[—-]\s+(.+)$", sub_title)
            if m and IDENT.match(m.group(1)):
                ident = m.group(1)
                short = m.group(2).strip()
            else:
                short = sub_title
            base_id = ident.lower() if ident else f"{slug}-s{si}-{ui}"
            for pi, part in enumerate(split_long(sub_body)):
                suffix = "" if pi == 0 else f"-{chr(97 + pi)}"
                entries.append({
                    "id": f"{base_id}{suffix}",
                    "title": sub_title if pi == 0 else f"{sub_title} (cont.)",
                    "tags": meta["tags"] + heading_tags(sec_title_clean, short),
                    "body": part,
                    "evidence": evidence_ids(sub),
                    "source": f"{page_title} § {sec_title_clean}",
                    "page": page,
                })
    return entries, meta, src, page


def write_coverage(pages):
    """coverage.md: which pages reference each ticket (from the evidence comments)."""
    cites = {}
    for p in pages:
        src = open(os.path.join(HERE, p), encoding="utf-8").read()
        for n in FW.findall(src):
            cites.setdefault(int(n), set()).add(os.path.splitext(p)[0])
    titles = {}
    try:
        import subprocess
        raw = subprocess.run(
            ["gh", "issue", "list", "-R", "podlodka-ai-club/flywheel", "--state", "all",
             "--limit", "300", "--json", "number,title"],
            capture_output=True, text=True, timeout=60).stdout
        titles = {i["number"]: i["title"].replace("HotezaStream", "AcmeStream").replace("Hoteza", "Acme")
                  for i in json.loads(raw or "[]")}
    except Exception:
        pass
    uncited = [n for n in range(1, 251) if n not in cites]
    lines = ["# Ticket coverage", "",
             "Generated by `python3 wiki/build_kb.py --coverage` from the hidden evidence comments: "
             "which pages reference each ticket; tickets no page references are listed at the end.",
             "", "| Ticket | Title | Referenced by |", "|---|---|---|"]
    for n in range(1, 251):
        title = titles.get(n, "").replace("|", "/")
        lines.append(f"| FW-{n:03d} | {title} | {', '.join(sorted(cites.get(n, [])))} |")
    lines += ["", f"**Not referenced ({len(uncited)}):** " +
              (", ".join(f"FW-{n:03d}" for n in uncited) if uncited else "none"), ""]
    out = os.path.join(HERE, "coverage.md")
    open(out, "w", encoding="utf-8").write("\n".join(lines))
    print(f"{250 - len(uncited)}/250 tickets referenced -> {os.path.relpath(out)}")


def main():
    check = "--check" in sys.argv
    pages = sorted(p for p in os.listdir(HERE) if p.endswith(".md") and p not in SKIP)
    all_entries, problems = [], []
    names = {os.path.splitext(p)[0] for p in pages}
    seen_ids = {}
    for p in pages:
        entries, meta, src, page = harvest(os.path.join(HERE, p))
        if not meta.get("id"):
            problems.append(f"{p}: missing meta block / id")
        for target in WIKI_LINK.findall(src):
            if target not in names and target != "Home":
                problems.append(f"{p}: link to unknown page '{target}'")
        for e in entries:
            if e["id"] in seen_ids:
                problems.append(f"{p}: duplicate entry id {e['id']} (also in {seen_ids[e['id']]})")
            seen_ids[e["id"]] = p
        all_entries.extend(entries)
    out = os.path.join(HERE, "kb_entries.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(all_entries, f, ensure_ascii=False, indent=2)
        f.write("\n")
    lengths = [len(e["body"]) for e in all_entries]
    print(f"{len(all_entries)} entries from {len(pages)} pages -> {os.path.relpath(out)}")
    print(f"body length: median {int(statistics.median(lengths))}, max {max(lengths)}")
    if "--coverage" in sys.argv:
        write_coverage(pages)
    if check:
        for pr in problems:
            print("WARN", pr)
        print(f"{len(problems)} problems")
        return 1 if problems else 0
    return 0


if __name__ == "__main__":
    sys.exit(main())
