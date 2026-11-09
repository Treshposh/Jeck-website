"""One-time generator for the JECK v2 editable site.

Reads each page in v2/, marks its editable text, photos and lists with data attributes,
writes the current wording to v2/content/pages/<page>.json and writes v2/admin/config.yml.

Run from the repository root:  python3 v2/_tools/build_cms.py
After the first run the JSON files are the source of truth (the school edits them in the
admin panel), so only re-run this after changing a page's HTML structure, and copy any
edited wording back first. Folders starting with "_" are not published by GitHub Pages.
"""
import json, os, re, sys
from bs4 import BeautifulSoup, NavigableString, Tag

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
PAGES = [('home', 'Home page'), ('welcome', 'Welcome'), ('learning', 'Learning'),
         ('school-life', 'School life'), ('admissions', 'Admissions'), ('news', 'News'),
         ('alumni', 'Alumni'), ('contact', 'Contact')]

EXCLUDE = {'film', 'crumbs', 'row', 'btn', 'more', 'smap', 'maplink', 'stage', 'welcome-to', 'scroll-cue', 'ic', 'side'}
TEXT_TAGS = {'h1', 'h2', 'h3', 'h4', 'p', 'li', 'figcaption', 'blockquote', 'summary', 'dt', 'dd', 'time', 'b', 'span'}
BLOCKISH = {'h1', 'h2', 'h3', 'h4', 'p', 'li', 'figcaption', 'blockquote', 'summary', 'dt', 'dd', 'div', 'ul',
            'ol', 'figure', 'img', 'section', 'article', 'details', 'time', 'dl', 'table', 'svg', 'form'}
INLINE_OK = {'strong', 'b', 'em', 'i', 'a', 'br', 'span'}
LIST_CLASSES = {'faq', 'gallery2', 'gallery', 'news-grid', 'people'}
MD_TAGS = {'p', 'blockquote', 'dd', 'li'}

SETTINGS_TEXT = [('phone1', '0913 070 4152'), ('phone2', '0806 873 8164'), ('email', 'jeckcollege@yahoo.com'),
                 ('address', 'No 5 Jeck Close, off Oro-Igwe Road, Elimgbu, Port Harcourt, Rivers State'),
                 ('hours', '8am – 5pm'), ('hours', '8am to 5pm')]


def excluded(el):
    for e in [el] + list(el.parents):
        if not isinstance(e, Tag):
            continue
        if e.name in ('svg', 'aside', 'form', 'button', 'script', 'style'):
            return True
        if e.get('aria-hidden') == 'true':
            return True
        if EXCLUDE & set(e.get('class') or []):
            return True
    return False


def is_leaf(el):
    if el.name not in TEXT_TAGS or not el.get_text(strip=True):
        return False
    return not any(isinstance(d, Tag) and d.name in BLOCKISH for d in el.descendants)


def to_md(el):
    out = []
    for c in el.children:
        if isinstance(c, NavigableString):
            out.append(re.sub(r'\s+', ' ', str(c)))
        elif c.name in ('strong', 'b'):
            out.append('**' + to_md(c).strip() + '**')
        elif c.name in ('em', 'i'):
            out.append('*' + to_md(c).strip() + '*')
        elif c.name == 'a':
            out.append('[' + to_md(c).strip() + '](' + c.get('href', '') + ')')
        elif c.name == 'br':
            out.append('\n')
        else:
            out.append(to_md(c))
    return ''.join(out)


def label_for(el, in_details=False):
    cls = ' '.join(el.get('class') or [])
    n = el.name
    if n == 'img': return 'Photo'
    if 'eyebrow' in cls: return 'Small label above heading'
    if 'tag' in cls: return 'Category'
    if 'role' in cls: return 'Role'
    if n == 'span' and 'k' in (el.get('class') or []): return 'Label'
    if n == 'h1': return 'Page title'
    if n == 'h2': return 'Heading'
    if n == 'h3': return 'Title'
    if n == 'h4': return 'Small heading'
    if n == 'p' and in_details: return 'Answer'
    if n == 'p' and 'lead' in cls: return 'Intro paragraph'
    if n == 'p': return 'Paragraph'
    if n == 'li': return 'Point'
    if n == 'figcaption': return 'Caption'
    if n == 'blockquote': return 'Quote'
    if n == 'summary': return 'Question'
    if n == 'dt': return 'Label'
    if n == 'dd': return 'Details'
    if n == 'time': return 'Year or date'
    if n == 'b': return 'Name'
    return 'Text'


def leaves_in(root, skip):
    """Editable leaves and photos under root, in document order, skipping list containers in skip."""
    found = []

    def walk(el):
        for c in el.children:
            if not isinstance(c, Tag) or excluded(c):
                continue
            if c in skip:
                found.append(('list', c))
                continue
            if c.name == 'img':
                if 'crest' not in c.get('src', ''):
                    found.append(('img', c))
            elif is_leaf(c):
                found.append(('text', c))
            else:
                walk(c)
    walk(root)
    return found


def signature(el):
    return (el.name, ' '.join(sorted(el.get('class') or [])))


def find_lists(section):
    lists = []
    for el in section.find_all(True):
        if excluded(el) or any(p in lists for p in el.parents):
            continue
        kids = [k for k in el.children if isinstance(k, Tag)]
        if len(kids) < 2 or len({signature(k) for k in kids}) != 1:
            continue
        cls = set(el.get('class') or [])
        if not (el.name in ('ul', 'ol', 'dl') or len(kids) >= 3 or cls & LIST_CLASSES):
            continue
        first = kids[0]
        if not (is_leaf(first) or leaves_in(first, set())):
            continue
        lists.append(el)
    return lists


def humanize_list(el, section_label):
    cls = set(el.get('class') or [])
    names = {'faq': ('Questions', 'question'), 'gallery2': ('Photos', 'photo'), 'news-grid': ('News items', 'news item'),
             'people': ('People', 'person'), 'steps': ('Steps', 'step'), 'timeline': ('Timeline', 'timeline entry'),
             'facts-list': ('Details', 'detail'), 'vlist': ('Values', 'value'), 'tri': ('Boxes', 'box'),
             'cards': ('Cards', 'card')}
    for c, v in names.items():
        if c in cls:
            return v
    if el.name in ('ul', 'ol'):
        return ('Points', 'point')
    return ('Items', 'item')


def field_cfg(name, label, kind, el=None):
    if kind == 'img':
        return [{'name': name, 'label': label, 'widget': 'image', 'required': False},
                {'name': name + '_alt', 'label': label + ' description', 'widget': 'string', 'required': False,
                 'hint': 'A few words describing the photo, read aloud to blind visitors.'}]
    if el is not None and el.name in MD_TAGS:
        return [{'name': name, 'label': label, 'widget': 'markdown', 'required': False,
                 'modes': ['rich_text'], 'buttons': ['bold', 'italic', 'link'], 'editor_components': []}]
    return [{'name': name, 'label': label, 'widget': 'string', 'required': False}]


def value_of(kind, el):
    if kind == 'img':
        return el.get('src', ''), el.get('alt', '')
    return to_md(el).strip() if el.name in MD_TAGS else el.get_text(' ', strip=True)


def number_labels(fields):
    counts = {}
    for f in fields:
        counts[f['label']] = counts.get(f['label'], 0) + 1
    seen = {}
    for f in fields:
        if f['label'].endswith(' description'):
            continue
        if counts[f['label']] > 1:
            seen[f['label']] = seen.get(f['label'], 0) + 1
            base = f['label']
            f['label'] = f'{base} {seen[base]}'
    # keep photo description labels in step with their photo
    for i, f in enumerate(fields):
        if f['label'].endswith(' description') and i > 0:
            f['label'] = fields[i - 1]['label'] + ' description'
    return fields


def build_page(slug, title):
    path = os.path.join(ROOT, slug + '.html')
    soup = BeautifulSoup(open(path, encoding='utf-8').read(), 'html.parser')
    main = soup.find('main')
    data, blocks = {}, []
    sections = [s for s in main.find_all('section') if not s.find_parent('section')]
    for si, sec in enumerate(sections, 1):
        key = (sec.get('id') or f's{si}').replace('-', '_')
        h = sec.find(['h1', 'h2'])
        eyebrow = sec.find(class_='eyebrow')
        if 'pbanner' in (sec.get('class') or []):
            slabel = 'Page banner'
        elif 'hhero' in (sec.get('class') or []):
            slabel = 'Top of page'
        else:
            slabel = (h.get_text(' ', strip=True) if h else eyebrow.get_text(' ', strip=True) if eyebrow else f'Section {si}')
        if eyebrow and slabel not in ('Page banner', 'Top of page') and h:
            slabel = f"{eyebrow.get_text(' ', strip=True)}: {slabel}"
        lists = find_lists(sec)
        items = leaves_in(sec, set(lists))
        if not items:
            continue
        sdata, sfields, fi, li = {}, [], 0, 0
        for kind, el in items:
            if kind == 'list':
                li += 1
                lkey = f'l{li}'
                el['data-cl'] = f'{key}.{lkey}'
                kids = [k for k in el.children if isinstance(k, Tag)]
                plural, singular = humanize_list(el, slabel)
                first = kids[0]
                in_details = first.name == 'details'
                if is_leaf(first):
                    tmpl = [('text', first, 'text')]
                else:
                    tmpl = [(k, e, None) for k, e in leaves_in(first, set())]
                ifields, names = [], []
                for n, (k, e, forced) in enumerate(tmpl, 1):
                    nm = forced or f'f{n}'
                    names.append(nm)
                    ifields += field_cfg(nm, label_for(e, in_details), k, e)
                if first.name == 'a':
                    ifields.append({'name': 'link', 'label': 'Opens this page when clicked', 'widget': 'string',
                                    'required': False, 'hint': 'A page such as school-life.html#culture, or a full web address.'})
                ifields = number_labels(ifields)
                arr = []
                for kid in kids:
                    item = {}
                    if is_leaf(kid):
                        kid['data-ci'] = 'text'
                        item['text'] = value_of('text', kid)
                    else:
                        kl = leaves_in(kid, set())
                        if len(kl) != len(tmpl):
                            print(f'  ! {slug} {key}.{lkey}: item shape differs ({len(kl)} vs {len(tmpl)})', file=sys.stderr)
                        for n, (k, e) in enumerate(kl, 1):
                            nm = f'f{n}'
                            e['data-ci'] = nm
                            if k == 'img':
                                item[nm], item[nm + '_alt'] = value_of('img', e)
                            else:
                                item[nm] = value_of(k, e)
                    if kid.name == 'a':
                        item['link'] = kid.get('href', '')
                    arr.append(item)
                sdata[lkey] = arr
                summ = next((f['name'] for f in ifields if f['widget'] in ('string',) and not f['name'].endswith('_alt')),
                            next((f['name'] for f in ifields if f['widget'] == 'markdown'), None))
                cfg = {'name': lkey, 'label': plural, 'label_singular': singular, 'widget': 'list',
                       'collapsed': True, 'required': False, 'fields': ifields}
                if summ:
                    cfg['summary'] = '{{' + summ + '}}'
                sfields.append(cfg)
                continue
            fi += 1
            nm = f'f{fi}'
            el['data-c'] = f'{key}.{nm}'
            if kind == 'img':
                sdata[nm], sdata[nm + '_alt'] = value_of('img', el)
            else:
                sdata[nm] = value_of(kind, el)
            sfields += field_cfg(nm, label_for(el, el.find_parent('details') is not None), kind, el)
        data[key] = sdata
        blocks.append({'name': key, 'label': slabel, 'widget': 'object', 'collapsed': True,
                       'fields': number_labels(sfields)})

    # site-wide contact details outside the page content
    for node in list(soup.find_all(string=True)):
        if node.find_parent('main') or node.find_parent('script') or node.find_parent('style') or node.find_parent('title'):
            continue
        text = str(node)
        hits = [(k, v) for k, v in SETTINGS_TEXT if v in text]
        if not hits:
            continue
        pattern = '(' + '|'.join(re.escape(v) for _, v in hits) + ')'
        parts = re.split(pattern, text)
        new = []
        for part in parts:
            k = next((k for k, v in hits if v == part), None)
            if k:
                sp = soup.new_tag('span')
                sp['data-set'] = k
                sp.string = part
                new.append(sp)
            elif part:
                new.append(NavigableString(part))
        for n in new:
            node.insert_before(n)
        node.extract()

    # load the content script before the page scripts
    tag = soup.new_tag('script', src='cms.js')
    first_script = soup.find('script', src='assets-data.js') or soup.find_all('script')[-1]
    first_script.insert_before(tag)
    first_script.insert_before('\n')
    body = soup.find('body')
    open(path, 'w', encoding='utf-8').write(str(soup))
    os.makedirs(os.path.join(ROOT, 'content', 'pages'), exist_ok=True)
    json.dump(data, open(os.path.join(ROOT, 'content', 'pages', slug + '.json'), 'w', encoding='utf-8'),
              ensure_ascii=False, indent=2)
    nfields = sum(1 for b in blocks for f in b['fields'])
    print(f'{slug}: {len(blocks)} sections, {nfields} fields')
    return {'name': slug.replace('-', '_'), 'label': title, 'file': f'v2/content/pages/{slug}.json', 'fields': blocks}


def main():
    files = [build_page(s, t) for s, t in PAGES]
    settings = {
        'notice_show': False,
        'notice_text': 'Admissions are open for the new session. Book a school visit today.',
        'notice_link': 'admissions.html',
        'phone1': '0913 070 4152', 'phone2': '0806 873 8164', 'whatsapp': '2349130704152',
        'email': 'jeckcollege@yahoo.com',
        'address': 'No 5 Jeck Close, off Oro-Igwe Road, Elimgbu, Port Harcourt, Rivers State',
        'hours': '8am – 5pm',
    }
    if not os.path.exists(os.path.join(ROOT, 'content', 'settings.json')):
        json.dump(settings, open(os.path.join(ROOT, 'content', 'settings.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
    settings_fields = [
        {'name': 'notice_show', 'label': 'Show the announcement bar', 'widget': 'boolean', 'required': False,
         'hint': 'A green bar across the top of every page. Switch it off when the news is over.'},
        {'name': 'notice_text', 'label': 'Announcement', 'widget': 'string', 'required': False},
        {'name': 'notice_link', 'label': 'Announcement opens', 'widget': 'string', 'required': False,
         'hint': 'Optional. A page such as admissions.html, or a full web address.'},
        {'name': 'phone1', 'label': 'Main phone number', 'widget': 'string', 'required': False,
         'hint': 'Shown in the top bar and the footer of every page.'},
        {'name': 'phone2', 'label': 'Second phone number', 'widget': 'string', 'required': False},
        {'name': 'whatsapp', 'label': 'WhatsApp number', 'widget': 'string', 'required': False,
         'hint': 'Country code and number with no spaces or +, for example 2349130704152. Every WhatsApp button and enquiry form sends messages here.',
         'pattern': ['^[0-9]{10,15}$', 'Use digits only, starting with 234, for example 2349130704152.']},
        {'name': 'email', 'label': 'Email address', 'widget': 'string', 'required': False},
        {'name': 'address', 'label': 'Address', 'widget': 'string', 'required': False},
        {'name': 'hours', 'label': 'Opening hours', 'widget': 'string', 'required': False},
    ]
    config = {
        'backend': {'name': 'github', 'repo': 'Treshposh/Jeck-website', 'branch': 'main',
                    'commit_messages': {'update': 'Website edit: {{collection}} “{{slug}}”',
                                        'uploadMedia': 'Website edit: upload “{{path}}”',
                                        'deleteMedia': 'Website edit: delete “{{path}}”'}},
        'site_url': 'https://treshposh.github.io/Jeck-website/v2/home.html',
        'display_url': 'https://treshposh.github.io/Jeck-website/v2/home.html',
        'logo_url': 'https://treshposh.github.io/Jeck-website/v2/assets/crest.png',
        'media_folder': 'v2/assets/uploads',
        'public_folder': 'assets/uploads',
        'media_libraries': {'default': {'config': {'max_file_size': 15000000, 'transformations': {
            'raster_image': {'format': 'webp', 'quality': 82, 'width': 1800, 'height': 1800}}}}},
        'collections': [
            {'name': 'settings', 'label': 'Contact details and announcement', 'label_singular': 'Settings',
             'icon': 'settings', 'files': [{'name': 'settings', 'label': 'Contact details and announcement',
                                            'file': 'v2/content/settings.json', 'fields': settings_fields}]},
            {'name': 'pages', 'label': 'Pages', 'icon': 'description', 'files': files},
        ],
    }
    import yaml
    os.makedirs(os.path.join(ROOT, 'admin'), exist_ok=True)
    with open(os.path.join(ROOT, 'admin', 'config.yml'), 'w', encoding='utf-8') as fh:
        fh.write('# Generated by v2/_tools/build_cms.py. The admin panel for the JECK website.\n')
        yaml.safe_dump(config, fh, allow_unicode=True, sort_keys=False, width=1000)


if __name__ == '__main__':
    main()
