#!/usr/bin/env python3
"""Chunk the wiki pages into retrievable knowledge-base entries.

The pages are written for humans and run well over a thousand words each, which
retrieves badly: one page matches every query. This emits one entry per atomic
unit instead - a triage row, an escalation rule, a confusable pair - each
self-contained and carrying the tags of its page.

Output shape matches fixtures/kb_articles.json: id, title, tags, body.
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
LINK = re.compile(r'\[([^\]]+)\]\((?:https?://[^)]+|[A-Za-z0-9-]+)\)')
IDENT = r'(?:[EUXQ]-\d{3}|T-[A-Z]{3}-\d{2})'
ENTRY = re.compile(r'^### (' + IDENT + r') [-—] (.+)$')
ROW = re.compile(r'^\| \*{0,2}(' + IDENT + r')\*{0,2} \|')
SECTION = re.compile(r'^## (?:\d+\. )?(.+)$')


def flatten(text):
    """Markdown to plain prose, keeping the words and dropping the scaffolding."""
    text = LINK.sub(r'\1', text)
    text = re.sub(r'^\s*>\s?', '', text, flags=re.M)
    text = re.sub(r'[*`#]', '', text)
    text = re.sub(r'\n{2,}', ' ', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()


def read_meta(src):
    meta = {'tags': [], 'type': 'page', 'id': None}
    block = re.match(r'<!-- meta\n(.*?)\n-->', src, re.S)
    if not block:
        return meta
    for line in block.group(1).splitlines():
        if ':' not in line:
            continue
        key, _, value = line.partition(':')
        key, value = key.strip(), value.strip()
        if key == 'tags':
            meta['tags'] = [t.strip() for t in value.strip('[]').split(',') if t.strip()]
        else:
            meta[key] = value
    return meta


def page_title(src):
    m = re.search(r'^# (.+)$', src, re.M)
    return m.group(1).strip() if m else 'Untitled'


def harvest(path):
    """One page in, a list of KB entries out."""
    src = open(path, encoding='utf-8').read()
    meta = read_meta(src)
    page = page_title(src)
    slug = os.path.splitext(os.path.basename(path))[0]
    out = []

    # Identifier-led sections: ### U-001 - Running the network without authentication
    lines = src.splitlines()
    current, buf = None, []
    for line in lines + ['## sentinel']:
        m = ENTRY.match(line)
        if m or line.startswith('## '):
            if current:
                out.append(entry(current[0], current[1], buf, meta, page, slug))
            current, buf = ((m.group(1), m.group(2)) if m else None), []
        elif current:
            buf.append(line)

    # Triage table rows: | T-CMD-01 | symptom | first check | owner | sev |
    for line in lines:
        if not ROW.match(line):
            continue
        cells = [c.strip().strip('*') for c in line.strip().strip('|').split('|')]
        ident = cells[0]
        if len(cells) >= 5:
            symptom, check, owner, sev = cells[1:5]
            body = (f"Symptom: {flatten(symptom)}. First check: {flatten(check)}. "
                    f"Owner: {flatten(owner)}. Default severity: {sev}.")
            extra = ['symptom', sev.lower()]
        elif len(cells) >= 2:
            body = '. '.join(flatten(c) for c in cells[1:] if c)
            extra = ['gate']
        else:
            continue
        out.append({
            'id': ident.lower(),
            'title': f'{ident} — {flatten(cells[1])}',
            'tags': sorted(set(meta['tags'] + ['triage'] + extra)),
            'body': body,
            'source': page,
            'page': slug,
        })

    # Pages built entirely from tables carry no identifiers; chunk them by section.
    if not out:
        current, buf = None, []
        for line in lines + ['## sentinel']:
            m = SECTION.match(line)
            if m or line == '## sentinel':
                if current and buf:
                    out.append({
                        'id': f'{slug.lower()}-{len(out) + 1:02d}',
                        'title': f'{page}: {current}',
                        'tags': sorted(set(meta['tags'] + ['triage'])),
                        'body': flatten('\n'.join(buf))[:1800],
                        'source': page,
                        'page': slug,
                    })
                current, buf = (m.group(1) if m else None), []
            elif current:
                buf.append(line)
    return out


def entry(ident, title, buf, meta, page, slug):
    body = flatten('\n'.join(buf))
    return {
        'id': ident.lower(),
        'title': f'{ident} — {title}',
        'tags': sorted(set(meta['tags'] + ['triage', meta.get('type', 'page')])),
        'body': body[:1800],
        'source': page,
        'page': slug,
    }


def main():
    entries = []
    for name in sorted(os.listdir(HERE)):
        if not name.endswith('.md') or name.startswith('_') or name == 'README.md':
            continue
        entries.extend(harvest(os.path.join(HERE, name)))

    entries = [e for e in entries
               if re.match(r'^(?:[euxq]-\d{3}|t-[a-z]{3}-\d{2})$', e['id'])
               or len(e['body']) > 40]
    seen, unique = set(), []
    for e in entries:
        if e['id'] in seen:
            continue
        seen.add(e['id'])
        unique.append(e)

    out = os.path.join(HERE, 'kb_entries.json')
    with open(out, 'w', encoding='utf-8') as fh:
        json.dump(unique, fh, indent=2, ensure_ascii=False)
        fh.write('\n')

    print(f'{len(unique)} entries -> {os.path.relpath(out)}')
    by_page = {}
    for e in unique:
        by_page[e['page']] = by_page.get(e['page'], 0) + 1
    for page, n in sorted(by_page.items(), key=lambda kv: -kv[1]):
        print(f'  {n:3d}  {page}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
