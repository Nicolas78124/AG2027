#!/usr/bin/env python3
"""AG 2027 — construit le réseau routier hors ligne de l'île Maurice.

Entrée : un extrait OpenStreetMap (.osm.pbf ou .osm) de Maurice.
Sorties :
  carte/routes.bin  graphe routier compact lu par carte.js (calcul d'itinéraire dans le téléphone)
  carte/lieux.json  lieux nommés pour la recherche hors ligne

Usage : python3 tools/carte/build_routes.py mauritius.osm.pbf carte/
"""
import json
import math
import struct
import sys
from collections import defaultdict

import osmium

# Île principale seulement (Rodrigues et Agaléga exclues)
BBOX = (57.28, -20.55, 57.82, -19.95)  # lon min, lat min, lon max, lat max

SPEED = {  # km/h réalistes
    'motorway': 85, 'motorway_link': 50, 'trunk': 65, 'trunk_link': 45,
    'primary': 55, 'primary_link': 40, 'secondary': 48, 'secondary_link': 35,
    'tertiary': 42, 'tertiary_link': 30, 'unclassified': 35, 'residential': 28,
    'living_street': 12, 'service': 18, 'road': 30,
}
MAJOR = {'motorway', 'trunk', 'primary', 'secondary', 'motorway_link', 'trunk_link', 'primary_link'}

PLACE_KINDS = {
    ('place', 'city'): 'ville', ('place', 'town'): 'ville', ('place', 'village'): 'village',
    ('place', 'suburb'): 'quartier', ('place', 'hamlet'): 'village', ('place', 'locality'): 'lieu-dit',
    ('place', 'neighbourhood'): 'quartier',
    ('tourism', 'hotel'): 'hôtel', ('tourism', 'resort'): 'hôtel', ('tourism', 'attraction'): 'à voir',
    ('tourism', 'viewpoint'): 'point de vue', ('tourism', 'museum'): 'musée',
    ('amenity', 'restaurant'): 'restaurant', ('amenity', 'cafe'): 'café', ('amenity', 'bar'): 'bar',
    ('amenity', 'fuel'): 'station-service', ('amenity', 'pharmacy'): 'pharmacie',
    ('amenity', 'hospital'): 'hôpital', ('amenity', 'clinic'): 'clinique', ('amenity', 'atm'): 'distributeur',
    ('shop', 'supermarket'): 'supermarché', ('shop', 'mall'): 'centre commercial',
    ('leisure', 'golf_course'): 'golf', ('natural', 'beach'): 'plage', ('aeroway', 'aerodrome'): 'aéroport',
    ('aeroway', 'terminal'): 'aéroport', ('amenity', 'ferry_terminal'): 'embarcadère',
    ('leisure', 'marina'): 'embarcadère', ('man_made', 'pier'): 'embarcadère', ('natural', 'peak'): 'sommet',
    ('natural', 'waterfall'): 'cascade', ('waterway', 'waterfall'): 'cascade',
}


def inside(lon, lat):
    return BBOX[0] <= lon <= BBOX[2] and BBOX[1] <= lat <= BBOX[3]


def hav(a, b):
    lat1, lon1 = a
    lat2, lon2 = b
    p = math.pi / 180
    x = math.sin((lat2 - lat1) * p / 2) ** 2 + math.cos(lat1 * p) * math.cos(lat2 * p) * math.sin((lon2 - lon1) * p / 2) ** 2
    return 12742000 * math.asin(math.sqrt(x))


def tag_name(t):
    return t.get('name:fr') or t.get('name') or ''


def place_kind(t):
    for (k, v), kind in PLACE_KINDS.items():
        if t.get(k) == v:
            return kind
    return None


def speed_of(hw, t):
    s = SPEED[hw]
    ms = t.get('maxspeed', '')
    try:
        v = float(ms.split()[0])
        if 'mph' in ms:
            v *= 1.609
        if 5 <= v <= 130:
            s = min(s, v * 0.9)
    except (ValueError, IndexError):
        pass
    return s


class H(osmium.SimpleHandler):
    def __init__(self):
        super().__init__()
        self.ways = []      # (refs, coords, flags, speed_kmh, penalty, name)
        self.places = []

    def node(self, n):
        if not n.tags or not n.location.valid():
            return
        t = n.tags
        nm = tag_name(t)
        kind = place_kind(t) if nm else None
        if kind and inside(n.location.lon, n.location.lat):
            self.places.append((nm, kind, n.location.lat, n.location.lon))

    def way(self, w):
        t = w.tags
        nm = tag_name(t)
        kind = place_kind(t) if nm else None
        if kind:
            pts = [(x.lat, x.lon) for x in w.nodes if x.location.valid()]
            if pts:
                lat = sum(p[0] for p in pts) / len(pts)
                lon = sum(p[1] for p in pts) / len(pts)
                if inside(lon, lat):
                    self.places.append((nm, kind, lat, lon))
        hw = t.get('highway')
        if hw not in SPEED:
            return
        if hw == 'service' and t.get('service') in ('parking_aisle', 'driveway', 'drive-through', 'emergency_access'):
            return
        acc = t.get('motor_vehicle') or t.get('motorcar') or t.get('vehicle') or t.get('access') or 'yes'
        if acc in ('no', 'agricultural', 'forestry', 'delivery'):
            return
        if t.get('area') == 'yes':
            return
        penalty = 4.0 if acc in ('private', 'destination', 'customers', 'permissive') else 1.0
        refs, coords = [], []
        for x in w.nodes:
            if not x.location.valid():
                return
            refs.append(x.ref)
            coords.append((x.lat, x.lon))
        if len(refs) < 2 or not any(inside(c[1], c[0]) for c in coords):
            return
        ow = t.get('oneway', '')
        rb = t.get('junction') in ('roundabout', 'circular')
        if ow == '-1':
            refs.reverse(); coords.reverse(); ow = 'yes'
        oneway = ow in ('yes', '1', 'true') or ((rb or hw in ('motorway', 'motorway_link')) and ow != 'no')
        flags = (1 if oneway else 0) | (2 if rb else 0) | (4 if hw.endswith('_link') else 0) | (8 if hw in MAJOR else 0)
        name = nm or t.get('ref', '')
        if nm and t.get('ref'):
            name = t.get('ref') + ' · ' + nm
        self.ways.append((refs, coords, flags, speed_of(hw, t), penalty, name))


def main():
    src, out = sys.argv[1], sys.argv[2].rstrip('/')
    h = H()
    h.apply_file(src, locations=True)
    print('voies routières :', len(h.ways), '· lieux :', len(h.places))

    use = defaultdict(int)
    for refs, *_ in h.ways:
        use[refs[0]] += 2
        use[refs[-1]] += 2
        for r in refs:
            use[r] += 1

    vid, vpos = {}, []
    names, name_id = [], {}
    edges = []  # (a, b, length, time, nameIdx, flags, geom[])

    def vertex(ref, c):
        if ref not in vid:
            vid[ref] = len(vpos)
            vpos.append(c)
        return vid[ref]

    for refs, coords, flags, kmh, pen, name in h.ways:
        if name and name not in name_id:
            name_id[name] = len(names); names.append(name)
        ni = name_id.get(name, -1) if name else -1
        start = 0
        for i in range(1, len(refs)):
            if use[refs[i]] >= 2 or i == len(refs) - 1:
                seg = coords[start:i + 1]
                ln = sum(hav(seg[k], seg[k + 1]) for k in range(len(seg) - 1))
                a, b = vertex(refs[start], coords[start]), vertex(refs[i], coords[i])
                if a != b or ln > 0:
                    edges.append((a, b, ln, ln / (kmh / 3.6) * pen, ni, flags, seg[1:-1]))
                start = i

    # Plus grande composante connexe (ignore les bouts de route isolés)
    parent = list(range(len(vpos)))

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]; x = parent[x]
        return x
    for e in edges:
        ra, rb = find(e[0]), find(e[1])
        if ra != rb:
            parent[ra] = rb
    size = defaultdict(int)
    for v in range(len(vpos)):
        size[find(v)] += 1
    main_root = max(size, key=size.get)
    keep = [find(v) == main_root for v in range(len(vpos))]
    remap, nv = {}, []
    for v in range(len(vpos)):
        if keep[v]:
            remap[v] = len(nv); nv.append(vpos[v])
    edges = [(remap[a], remap[b], ln, tm, ni, fl, g) for a, b, ln, tm, ni, fl, g in edges if keep[a] and keep[b]]
    print('sommets :', len(nv), '· tronçons :', len(edges))

    arcs = defaultdict(list)
    for i, (a, b, ln, tm, ni, fl, g) in enumerate(edges):
        arcs[a].append(i * 2)
        if not fl & 1:
            arcs[b].append(i * 2 + 1)
    arc_start, arc_list = [0], []
    for v in range(len(nv)):
        arc_list.extend(arcs.get(v, []))
        arc_start.append(len(arc_list))

    geo_start, glat, glon = [0], [], []
    for e in edges:
        for la, lo in e[6]:
            glat.append(round(la * 1e6)); glon.append(round(lo * 1e6))
        geo_start.append(len(glat))

    nE, nV = len(edges), len(nv)
    name_bytes = json.dumps(names, ensure_ascii=False).encode('utf-8')
    flags_b = bytes(e[5] for e in edges)
    flags_b += b'\0' * ((4 - len(flags_b) % 4) % 4)

    with open(out + '/routes.bin', 'wb') as f:
        f.write(b'AGR1')
        f.write(struct.pack('<5I', nV, nE, len(glat), len(arc_list), len(name_bytes)))
        f.write(struct.pack('<%di' % nV, *[round(p[0] * 1e6) for p in nv]))
        f.write(struct.pack('<%di' % nV, *[round(p[1] * 1e6) for p in nv]))
        f.write(struct.pack('<%dI' % (nV + 1), *arc_start))
        f.write(struct.pack('<%dI' % len(arc_list), *arc_list))
        f.write(struct.pack('<%dI' % nE, *[e[0] for e in edges]))
        f.write(struct.pack('<%dI' % nE, *[e[1] for e in edges]))
        f.write(struct.pack('<%df' % nE, *[e[2] for e in edges]))
        f.write(struct.pack('<%df' % nE, *[e[3] for e in edges]))
        f.write(struct.pack('<%di' % nE, *[e[4] for e in edges]))
        f.write(flags_b)
        f.write(struct.pack('<%dI' % (nE + 1), *geo_start))
        f.write(struct.pack('<%di' % len(glat), *glat))
        f.write(struct.pack('<%di' % len(glon), *glon))
        f.write(name_bytes)

    # Lieux : dédoublonnage par nom + type à moins de 300 m
    seen, places = {}, []
    order = ['aéroport', 'golf', 'ville', 'hôtel', 'plage', 'à voir', 'embarcadère', 'village', 'quartier']
    h.places.sort(key=lambda p: order.index(p[1]) if p[1] in order else 99)
    for nm, kind, la, lo in h.places:
        k = (nm.lower(), kind)
        if any(hav((la, lo), q) < 300 for q in seen.get(k, [])):
            continue
        seen.setdefault(k, []).append((la, lo))
        places.append([nm, kind, round(la, 5), round(lo, 5)])
    with open(out + '/lieux.json', 'w', encoding='utf-8') as f:
        json.dump(places, f, ensure_ascii=False, separators=(',', ':'))
    print('lieux gardés :', len(places))


if __name__ == '__main__':
    main()
