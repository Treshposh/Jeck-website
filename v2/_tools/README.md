# How the editable site works

- Each page in `v2/` keeps its full wording in the HTML, so it always shows something.
- `cms.js` loads `content/pages/<page>.json` and `content/settings.json` and puts the latest wording,
  photos and lists in place. Elements are linked by `data-c` (single fields), `data-cl` (lists, one
  child per item) and `data-ci` (fields inside a list item). `data-set` marks the phone, email,
  address and hours in the top bar and footer.
- The school edits those JSON files at `/v2/admin/` (Sveltia CMS, config in `admin/config.yml`).
  Each save is a commit to `main`, and GitHub Pages republishes in about a minute.
- Uploaded photos go to `assets/uploads/`, converted to WebP and shrunk to at most 1800px.
- Not editable from the admin panel: the virtual tour, the page films, the menus and the layout.

`build_cms.py` generated the bindings, the JSON and `admin/config.yml` once from the original pages.
The JSON is now the source of truth. If you change a page's structure, edit `content/` and
`admin/config.yml` by hand, or re-run the script on clean copies of the pages and merge the school's
saved wording back in.
