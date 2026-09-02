#!/usr/bin/env python3
"""Move ticket citations out of the visible text into hidden HTML comments.

The pages were authored with visible evidence citations so every sentence could be
checked against its ticket. A real wiki does not read like that, and the links leak
into the chunks the agent retrieves. This script rewrites each page so that

    **Evidence.** [FW-021](https://github.com/.../issues/21), [FW-064](...)
        ->  <!-- evidence: FW-021, FW-064 -->

    ...prose. Evidence: [FW-192](...), [FW-021](...).
    ...tickets come from ([FW-201](...), [FW-137](...)). More prose.
        ->  ...prose. More prose.
            <!-- evidence: FW-192, FW-021, FW-201, FW-137 -->

GitHub renders nothing for an HTML comment; build_kb.py strips comments from entry
bodies and emits the ticket numbers in the entry's `evidence` field, so the
traceability survives. Idempotent: a second run changes nothing.

    python3 wiki/hide_evidence.py            # rewrite pages in place
    python3 wiki/hide_evidence.py --check    # report only, and list citation shapes
                                             # the script does not handle
"""
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SKIP = {"README.md", "coverage.md", "_Sidebar.md", "_Footer.md"}

LINK = r"\[FW-(\d{3})\]\(https://github\.com/podlodka-ai-club/flywheel/issues/\d+\)"
LINK_RE = re.compile(LINK)
LIST = r"(?:" + LINK + r")(?:\s*,\s*(?:" + LINK + r"))*"
EVIDENCE_LINE = re.compile(r"^\*\*Evidence\.\*\*\s*(?P<list>" + LIST + r")\s*\.?\s*$")
EVIDENCE_SENTENCE = re.compile(r"\s*Evidence:\s*(?P<list>" + LIST + r")\s*\.?")
PARENTHETICAL = re.compile(r"\s*\((?P<list>" + LIST + r")\)")
COMMA_LINK = re.compile(r"\s*,\s*(?P<list>" + LIST + r")(?=\))")      # (text, [FW-149](...))
LINK_COMMA = re.compile(r"(?<=\()(?P<list>" + LIST + r")\s*,\s*")      # ([FW-219](...), [Page](Page))
COMMENT = re.compile(r"^<!-- evidence: (?P<ids>[^>]*) -->$")


def numbers(text):
    return ["FW-" + n for n in LINK_RE.findall(text)]


def dedupe(seq):
    seen, out = set(), []
    for x in seq:
        if x not in seen:
            seen.add(x)
            out.append(x)
    return out


def tidy(line):
    line = re.sub(r"[ \t]{2,}", " ", line)
    line = re.sub(r"\s+([.,;:])(?=\s|$)", r"\1", line)
    return line.rstrip()


def process_block(lines, leftovers, path, lineno):
    """One paragraph block (consecutive non-blank lines) in, rewritten lines out."""
    out, collected, trailing = [], [], None
    for i, line in enumerate(lines):
        m = EVIDENCE_LINE.match(line.strip())
        if m:
            ids = numbers(m.group("list"))
            if i == len(lines) - 1:
                trailing = ids  # becomes the block's comment
            else:
                out.append(f"<!-- evidence: {', '.join(ids)} -->")
            continue
        cm = COMMENT.match(line.strip())
        if cm:
            if i == len(lines) - 1:
                trailing = [x.strip() for x in cm.group("ids").split(",") if x.strip()]
            else:
                out.append(line)
            continue
        new = line
        for pat in (EVIDENCE_SENTENCE, PARENTHETICAL, COMMA_LINK, LINK_COMMA):
            for m in pat.finditer(new):
                collected.extend(numbers(m.group("list")))
            new = pat.sub("", new)
        if LINK_RE.search(new):
            for m in LINK_RE.finditer(new):
                s = max(0, m.start() - 40)
                leftovers.append(f"{os.path.basename(path)}:{lineno + i}: ...{new[s:m.end() + 10]}...")
        out.append(tidy(new) if new != line else line)
    ids = dedupe((trailing or []) + collected)
    if ids:
        out.append(f"<!-- evidence: {', '.join(ids)} -->")
    return out


def rewrite(src, path):
    lines = src.split("\n")
    result, block, leftovers, start = [], [], [], 0
    in_fence = False
    for n, line in enumerate(lines, start=1):
        if line.startswith("```"):
            in_fence = not in_fence
        if line.strip() == "" and not in_fence:
            if block:
                result.extend(process_block(block, leftovers, path, start))
                block = []
            result.append(line)
        else:
            if not block:
                start = n
            block.append(line)
    if block:
        result.extend(process_block(block, leftovers, path, start))
    return "\n".join(result), leftovers


def main():
    check = "--check" in sys.argv
    total_hidden, total_left = 0, 0
    for name in sorted(os.listdir(HERE)):
        if not name.endswith(".md") or name in SKIP:
            continue
        path = os.path.join(HERE, name)
        src = open(path, encoding="utf-8").read()
        before = len(LINK_RE.findall(src))
        new, leftovers = rewrite(src, path)
        after = len(LINK_RE.findall(new))
        comments = len(re.findall(r"<!-- evidence:", new))
        total_hidden += before - after
        total_left += after
        status = "unchanged" if new == src else f"{before - after} citations hidden, {comments} comment lines"
        print(f"{name}: {status}")
        for item in leftovers:
            print("  LEFTOVER", item)
        if new != src and not check:
            open(path, "w", encoding="utf-8").write(new)
    print(f"{'would hide' if check else 'hidden'}: {total_hidden} citations; visible links left: {total_left}")
    return 1 if total_left else 0


if __name__ == "__main__":
    sys.exit(main())
