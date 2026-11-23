# Cherche des photos libres de plages de Maurice sur Wikimedia Commons et en télécharge des vignettes
import json, os, re, urllib.parse, urllib.request
UA = {'User-Agent': 'AG2027-site/1.0 (github.com/Nicolas78124/AG2027)'}
def get(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60).read()
os.makedirs('candidats', exist_ok=True)
seen, out = set(), []
for q in ['Mauritius beach', 'Mauritius lagoon', 'Le Morne beach', 'Belle Mare beach', 'Flic en Flac beach', 'Trou aux Biches', 'Ile aux Cerfs', 'Mauritius sea sky', 'Grand Baie beach', 'Mauritius coast']:
    api = 'https://commons.wikimedia.org/w/api.php?' + urllib.parse.urlencode({
        'action': 'query', 'format': 'json', 'generator': 'search', 'gsrsearch': q + ' filetype:bitmap', 'gsrnamespace': 6, 'gsrlimit': 20,
        'prop': 'imageinfo', 'iiprop': 'url|size|extmetadata', 'iiurlwidth': 500})
    for p in json.loads(get(api)).get('query', {}).get('pages', {}).values():
        t = p['title']
        if t in seen or not p.get('imageinfo'): continue
        seen.add(t); ii = p['imageinfo'][0]; md = ii.get('extmetadata', {})
        lic = md.get('LicenseShortName', {}).get('value', '')
        if not re.search(r'CC0|Public domain|CC BY(-SA)? [234]', lic, re.I): continue
        if ii.get('width', 0) < 1600: continue
        n = len(out); fn = 'candidats/%02d.jpg' % n
        try: open(fn, 'wb').write(get(ii['thumburl']))
        except Exception as e: print('échec', t, e); continue
        out.append({'n': n, 'titre': t, 'licence': lic, 'auteur': re.sub('<[^>]+>', '', md.get('Artist', {}).get('value', '')).strip(),
                    'w': ii['width'], 'h': ii['height'], 'url': ii['url'], 'page': ii['descriptionurl']})
        if len(out) >= 60: break
    if len(out) >= 60: break
json.dump(out, open('candidats/liste.json', 'w'), ensure_ascii=False, indent=1)
print(len(out), 'photos')
