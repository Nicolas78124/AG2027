/* AG 2027 — carte hors ligne de l'île Maurice, itinéraire et guidage GPS.
   Fond de carte : OpenStreetMap / Protomaps (carte/maurice.pmtiles)
   Réseau routier : carte/routes.bin (calcul d'itinéraire dans le téléphone, sans réseau) */
(function () {
'use strict';

var CACHE = 'ag2027-carte';
var BASE = 'carte/';
var BIG = ['maurice.pmtiles', 'routes.bin', 'lieux.json'];
var SMALL = ['carte.js', 'maplibre-gl.js', 'maplibre-gl.css', 'pmtiles.js', 'style.json', 'sprites/dark.json', 'sprites/dark.png', 'sprites/dark@2x.json', 'sprites/dark@2x.png'];
['Noto Sans Regular', 'Noto Sans Medium', 'Noto Sans Italic'].forEach(function (f) {
  ['0-255', '256-511', '8192-8447'].forEach(function (r) { SMALL.push('fonts/' + f + '/' + r + '.pbf'); });
});
var CENTER = [57.58, -20.25];
var FAVORIS = [
  { nom: 'The Bay Club · Anahita', type: 'hôtel', lat: -20.2790, lon: 57.7885, ic: 'hotel' },
  { nom: 'Golf d\'Anahita (club-house)', type: 'golf', lat: -20.27798, lon: 57.78813, ic: 'golf' },
  { nom: 'Aéroport Sir Seewoosagur Ramgoolam', type: 'aéroport', lat: -20.4317, lon: 57.6833, ic: 'avion' },
  { nom: 'Trou d\'Eau Douce', type: 'village', lat: -20.2386, lon: 57.7848, ic: 'pin' },
  { nom: 'Port-Louis · Caudan Waterfront', type: 'ville', lat: -20.1617, lon: 57.4973, ic: 'pin' },
  { nom: 'Grand Baie', type: 'ville', lat: -20.0130, lon: 57.5820, ic: 'pin' },
  { nom: 'Mahébourg', type: 'ville', lat: -20.4075, lon: 57.7003, ic: 'pin' }
];

var IC = {
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  back: '<path d="m15 6-6 6 6 6"/>',
  swap: '<path d="M7 4v16M7 4 3 8M7 4l4 4M17 20V4M17 20l-4-4M17 20l4-4"/>',
  gps: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="7"/>',
  pin: '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  hotel: '<path d="M3 21h18M5 21V8l7-4 7 4v13M9 21v-5h6v5"/>',
  golf: '<path d="M8 21V3l9 4-9 4"/><ellipse cx="12" cy="21" rx="8" ry="1.5"/>',
  avion: '<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  down: '<path d="M12 4v11M7 10l5 5 5-5M4 20h16"/>',
  go: '<path d="M3 11 21 3l-8 18-2-8z"/>',
  vol: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>',
  mute: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="m17 9 5 6M22 9l-5 6"/>',
  ext: '<path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"/>',
  straight: '<path d="M12 21V4M6 10l6-6 6 6"/>',
  right: '<path d="M7 21v-8a4 4 0 0 1 4-4h9M15 4l5 5-5 5"/>',
  left: '<path d="M17 21v-8a4 4 0 0 0-4-4H4M9 4 4 9l5 5"/>',
  sright: '<path d="M9 21v-7l8-8M11 6h6v6"/>',
  sleft: '<path d="M15 21v-7L7 6M13 6H7v6"/>',
  uturn: '<path d="M8 21V9a5 5 0 0 1 10 0v4M14 9l4 4 4-4" transform="translate(-3 0)"/>',
  rb: '<circle cx="12" cy="10" r="4"/><path d="M12 21v-7M15 7l4-4M15 3h4v4"/>',
  flag: '<path d="M5 21V4h11l-2 4 2 4H5"/>'
};
function ic(n, s, sw) { return '<svg width="' + (s || 20) + '" height="' + (s || 20) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (sw || 1.9) + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (IC[n] || '') + '</svg>'; }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function km(m) { return m < 950 ? (Math.round(m / 10) * 10) + ' m' : (m < 9950 ? (m / 1000).toFixed(1).replace('.', ',') : Math.round(m / 1000)) + ' km'; }
function dur(s) { var m = Math.max(1, Math.round(s / 60)); return m < 60 ? m + ' min' : Math.floor(m / 60) + ' h ' + (m % 60 < 10 ? '0' : '') + (m % 60); }
function hhmm(d) { return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }); }
function toast(t) { var e = document.getElementById('toast'); if (!e) return; e.textContent = t; e.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(function () { e.hidden = true; }, 3500); }
function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

/* ---------------- géométrie ---------------- */
var R = 6371008.8, RAD = Math.PI / 180;
function dist(lat1, lon1, lat2, lon2) {
  var x = Math.sin((lat2 - lat1) * RAD / 2), y = Math.sin((lon2 - lon1) * RAD / 2);
  var a = x * x + Math.cos(lat1 * RAD) * Math.cos(lat2 * RAD) * y * y;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}
function bearing(lat1, lon1, lat2, lon2) {
  var y = Math.sin((lon2 - lon1) * RAD) * Math.cos(lat2 * RAD);
  var x = Math.cos(lat1 * RAD) * Math.sin(lat2 * RAD) - Math.sin(lat1 * RAD) * Math.cos(lat2 * RAD) * Math.cos((lon2 - lon1) * RAD);
  return (Math.atan2(y, x) / RAD + 360) % 360;
}
var KX = Math.cos(20.25 * RAD); // échelle locale (latitude de Maurice)
// Projection d'un point sur un segment (coordonnées locales planes) -> {t, d2}
function projSeg(plat, plon, alat, alon, blat, blon) {
  var ax = (alon - plon) * KX, ay = alat - plat, bx = (blon - plon) * KX, by = blat - plat;
  var dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
  var t = l2 > 0 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / l2)) : 0;
  var cx = ax + t * dx, cy = ay + t * dy;
  return { t: t, d2: cx * cx + cy * cy };
}

/* ---------------- réseau routier ---------------- */
var G = null;
function loadGraph(buf) {
  var dv = new DataView(buf);
  if (String.fromCharCode(dv.getUint8(0), dv.getUint8(1), dv.getUint8(2), dv.getUint8(3)) !== 'AGR1') throw new Error('routes.bin invalide');
  var nV = dv.getUint32(4, true), nE = dv.getUint32(8, true), nG = dv.getUint32(12, true), nA = dv.getUint32(16, true), nN = dv.getUint32(20, true);
  var o = 24;
  function take(T, n) { var a = new T(buf, o, n); o += n * T.BYTES_PER_ELEMENT; return a; }
  var g = { nV: nV, nE: nE };
  g.vlat = take(Int32Array, nV); g.vlon = take(Int32Array, nV);
  g.arcStart = take(Uint32Array, nV + 1); g.arcs = take(Uint32Array, nA);
  g.efrom = take(Uint32Array, nE); g.eto = take(Uint32Array, nE);
  g.elen = take(Float32Array, nE); g.etime = take(Float32Array, nE);
  g.ename = take(Int32Array, nE);
  g.eflags = new Uint8Array(buf, o, nE); o += nE + ((4 - nE % 4) % 4);
  g.geoStart = take(Uint32Array, nE + 1);
  g.glat = take(Int32Array, nG); g.glon = take(Int32Array, nG);
  g.names = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, o, nN)));
  // degré de chaque sommet (nombre de tronçons qui s'y rejoignent)
  g.deg = new Uint8Array(nV);
  for (var e = 0; e < nE; e++) { if (g.deg[g.efrom[e]] < 255) g.deg[g.efrom[e]]++; if (g.deg[g.eto[e]] < 255) g.deg[g.eto[e]]++; }
  // grille pour retrouver la route la plus proche d'un point
  g.cell = 0.004; g.grid = new Map();
  for (e = 0; e < nE; e++) {
    var pts = edgePts(g, e, 0), minA = 1e9, maxA = -1e9, minO = 1e9, maxO = -1e9;
    for (var i = 0; i < pts.length; i += 2) { minA = Math.min(minA, pts[i]); maxA = Math.max(maxA, pts[i]); minO = Math.min(minO, pts[i + 1]); maxO = Math.max(maxO, pts[i + 1]); }
    for (var cy = Math.floor(minA / g.cell); cy <= Math.floor(maxA / g.cell); cy++) {
      for (var cx = Math.floor(minO / g.cell); cx <= Math.floor(maxO / g.cell); cx++) {
        var k = cy * 100000 + cx, l = g.grid.get(k);
        if (!l) g.grid.set(k, l = []);
        l.push(e);
      }
    }
  }
  return g;
}
// Points d'un tronçon [lat, lon, lat, lon…] dans le sens dir (0 : départ→arrivée)
function edgePts(g, e, dir) {
  var a = g.efrom[e], b = g.eto[e], s = g.geoStart[e], t = g.geoStart[e + 1], p = [g.vlat[a] / 1e6, g.vlon[a] / 1e6];
  for (var i = s; i < t; i++) p.push(g.glat[i] / 1e6, g.glon[i] / 1e6);
  p.push(g.vlat[b] / 1e6, g.vlon[b] / 1e6);
  if (dir) { var r = []; for (i = p.length - 2; i >= 0; i -= 2) r.push(p[i], p[i + 1]); return r; }
  return p;
}
// Route la plus proche : {e, off (m depuis le début du tronçon), lat, lon, d (m)}
function snap(g, lat, lon) {
  var cy0 = Math.floor(lat / g.cell), cx0 = Math.floor(lon / g.cell), best = null, bestD = Infinity, seen = new Set();
  for (var ring = 0; ring < 40; ring++) {
    for (var cy = cy0 - ring; cy <= cy0 + ring; cy++) {
      for (var cx = cx0 - ring; cx <= cx0 + ring; cx++) {
        if (Math.max(Math.abs(cy - cy0), Math.abs(cx - cx0)) !== ring) continue;
        var l = g.grid.get(cy * 100000 + cx); if (!l) continue;
        for (var j = 0; j < l.length; j++) {
          var e = l[j]; if (seen.has(e)) continue; seen.add(e);
          var p = edgePts(g, e, 0), acc = 0;
          for (var i = 0; i < p.length - 2; i += 2) {
            var sl = dist(p[i], p[i + 1], p[i + 2], p[i + 3]);
            var r = projSeg(lat, lon, p[i], p[i + 1], p[i + 2], p[i + 3]);
            var d = Math.sqrt(r.d2) * 111195;
            if (d < bestD) { bestD = d; best = { e: e, off: acc + r.t * sl, lat: p[i] + r.t * (p[i + 2] - p[i]), lon: p[i + 1] + r.t * (p[i + 3] - p[i + 1]), d: d }; }
            acc += sl;
          }
        }
      }
    }
    if (best && bestD < ring * g.cell * 111195 * KX) break;
  }
  if (best) { var L = g.elen[best.e]; best.off = Math.min(L, best.off); }
  return best;
}
// Tas binaire minimal
function Heap(n) { this.k = new Float64Array(n); this.v = new Int32Array(n); this.n = 0; }
Heap.prototype.push = function (key, val) {
  if (this.n >= this.k.length) { var k = new Float64Array(this.k.length * 2), v = new Int32Array(this.k.length * 2); k.set(this.k); v.set(this.v); this.k = k; this.v = v; }
  var i = this.n++; this.k[i] = key; this.v[i] = val;
  while (i > 0) { var p = (i - 1) >> 1; if (this.k[p] <= key) break; this.k[i] = this.k[p]; this.v[i] = this.v[p]; i = p; }
  this.k[i] = key; this.v[i] = val;
};
Heap.prototype.pop = function () {
  var top = this.v[0], last = --this.n, key = this.k[last], val = this.v[last], i = 0;
  while (true) {
    var c = 2 * i + 1; if (c >= last) break;
    if (c + 1 < last && this.k[c + 1] < this.k[c]) c++;
    if (this.k[c] >= key) break;
    this.k[i] = this.k[c]; this.v[i] = this.v[c]; i = c;
  }
  this.k[i] = key; this.v[i] = val; this.lastKey = this.k[0];
  return top;
};

// Itinéraire le plus rapide entre deux points accrochés à la route
function route(g, A, B) {
  var nV = g.nV, gs = g._g || (g._g = new Float64Array(nV)), prev = g._p || (g._p = new Int32Array(nV));
  gs.fill(Infinity); prev.fill(-1);
  var h = new Heap(1024), VMAX = 85 / 3.6;
  var bLat = B.lat, bLon = B.lon;
  function H(v) { return dist(g.vlat[v] / 1e6, g.vlon[v] / 1e6, bLat, bLon) / VMAX; }
  var ea = A.e, La = g.elen[ea] || 1, Ta = g.etime[ea], oneA = g.eflags[ea] & 1;
  var eb = B.e, Lb = g.elen[eb] || 1, Tb = g.etime[eb], oneB = g.eflags[eb] & 1;
  function seed(v, c) { if (c < gs[v]) { gs[v] = c; prev[v] = -2; h.push(c + H(v), v); } }
  seed(g.eto[ea], (La - A.off) / La * Ta);
  if (!oneA) seed(g.efrom[ea], A.off / La * Ta);
  var best = Infinity, bestEnd = null;
  // même tronçon
  if (ea === eb && (B.off >= A.off || !oneA)) { best = Math.abs(B.off - A.off) / La * Ta; bestEnd = { direct: true }; }
  var tA = g.efrom[eb], tB = g.eto[eb];
  var costA = B.off / Lb * Tb, costB = oneB ? Infinity : (Lb - B.off) / Lb * Tb;
  while (h.n) {
    var f = h.k[0], v = h.pop();
    if (f >= best) break;
    var gv = gs[v];
    if (f - H(v) > gv + 1e-6) continue;
    if (v === tA && gv + costA < best) { best = gv + costA; bestEnd = { v: v, dir: 0 }; }
    if (v === tB && gv + costB < best) { best = gv + costB; bestEnd = { v: v, dir: 1 }; }
    for (var i = g.arcStart[v], end = g.arcStart[v + 1]; i < end; i++) {
      var arc = g.arcs[i], e = arc >> 1, dir = arc & 1;
      var w = dir ? g.efrom[e] : g.eto[e];
      var c = gv + g.etime[e];
      if (c < gs[w]) { gs[w] = c; prev[w] = arc; h.push(c + H(w), w); }
    }
  }
  if (!bestEnd) return null;
  // Reconstitution : liste de [tronçon, sens, début (m), fin (m)]
  var legs = [];
  if (bestEnd.direct) legs.push([ea, B.off >= A.off ? 0 : 1, A.off, B.off]);
  else {
    legs.push([eb, bestEnd.dir, bestEnd.dir ? Lb : 0, B.off]);
    var v2 = bestEnd.v;
    while (prev[v2] >= 0) {
      var a = prev[v2], e2 = a >> 1, d2 = a & 1;
      legs.push([e2, d2, d2 ? g.elen[e2] : 0, d2 ? 0 : g.elen[e2]]);
      v2 = d2 ? g.eto[e2] : g.efrom[e2];
    }
    legs.push(v2 === g.eto[ea] ? [ea, 0, A.off, La] : [ea, 1, A.off, 0]);
    legs.reverse();
  }
  return buildRoute(g, legs, A, B, best);
}
// Découpe d'un tronçon entre deux distances (m depuis le début du tronçon)
function cutEdge(g, e, from, to) {
  var p = edgePts(g, e, 0), out = [], acc = 0, lo = Math.min(from, to), hi = Math.max(from, to);
  for (var i = 0; i < p.length - 2; i += 2) {
    var sl = dist(p[i], p[i + 1], p[i + 2], p[i + 3]), a = acc, b = acc + sl;
    if (b >= lo && a <= hi && sl > 0) {
      var t0 = Math.max(0, (lo - a) / sl), t1 = Math.min(1, (hi - a) / sl);
      if (!out.length) out.push(p[i] + t0 * (p[i + 2] - p[i]), p[i + 1] + t0 * (p[i + 3] - p[i + 1]));
      out.push(p[i] + t1 * (p[i + 2] - p[i]), p[i + 1] + t1 * (p[i + 3] - p[i + 1]));
    }
    acc = b;
  }
  if (out.length < 4) { var q = p.slice(0, 2); out = q.concat(q); }
  if (to < from) { var r = []; for (i = out.length - 2; i >= 0; i -= 2) r.push(out[i], out[i + 1]); out = r; }
  return out;
}
function niceName(n) { var m = /^(.+?) · (.+)$/.exec(n); return m ? m[2] + ' (' + m[1] + ')' : n; }
function roadRef(n) { var m = /\(([A-Z]\d+[A-Za-z]?)\)$/.exec(n || '') || /^([A-Z]\d+[A-Za-z]?)$/.exec(n || ''); return m ? m[1] : null; }
function sameRoad(a, b) { return a === b || (!!roadRef(a) && roadRef(a) === roadRef(b)); }
function turnWord(d) {
  var a = Math.abs(d), s = d > 0 ? 'droite' : 'gauche';
  if (a < 25) return null;
  if (a < 60) return { t: d > 0 ? 'sright' : 'sleft', txt: 'Serrez à ' + s };
  if (a < 150) return { t: d > 0 ? 'right' : 'left', txt: 'Tournez à ' + s };
  return { t: 'uturn', txt: 'Faites demi-tour' };
}
function ordinal(n) { return n === 1 ? '1re' : n + 'e'; }
function buildRoute(g, legs, A, B, time) {
  var coords = [], cum = [], ctime = [], steps = [], total = 0, ttot = 0;
  var segs = legs.map(function (l) {
    var e = l[0], L = g.elen[e] || 1, len = Math.abs(l[3] - l[2]);
    return { e: e, pts: cutEdge(g, e, l[2], l[3]), len: len, time: len / L * g.etime[e], name: g.ename[e] >= 0 ? niceName(g.names[g.ename[e]]) : '', rb: !!(g.eflags[e] & 2), v: l[1] ? g.efrom[e] : g.eto[e] };
  }).filter(function (s, i, all) { return s.len > 0.5 || all.length === 1; });
  segs.forEach(function (s) {
    for (var i = 0; i < s.pts.length; i += 2) {
      var la = s.pts[i], lo = s.pts[i + 1];
      if (coords.length) {
        var pl = coords[coords.length - 1], d = dist(pl[1], pl[0], la, lo);
        if (d < 0.3) continue;
        total += d; ttot += s.len > 0 ? d / s.len * s.time : 0;
      }
      coords.push([lo, la]); cum.push(total); ctime.push(ttot);
    }
    s.endAt = total;
  });
  function headOut(s) { var p = s.pts; for (var i = 2; i < p.length; i += 2) if (dist(p[0], p[1], p[i], p[i + 1]) > 12 || i === p.length - 2) return bearing(p[0], p[1], p[i], p[i + 1]); return 0; }
  function headIn(s) { var p = s.pts, n = p.length; for (var i = n - 4; i >= 0; i -= 2) if (dist(p[i], p[i + 1], p[n - 2], p[n - 1]) > 12 || i === 0) return bearing(p[i], p[i + 1], p[n - 2], p[n - 1]); return 0; }
  var first = segs[0];
  steps.push({ at: 0, t: 'straight', txt: 'Partez' + (first && first.name ? ' sur ' + first.name : ''), name: first ? first.name : '' });
  for (var i = 0; i < segs.length - 1; i++) {
    var s = segs[i], n = segs[i + 1];
    if (!s.rb && n.rb) {
      // rond-point : compter les sorties jusqu'à celle qu'on prend
      var exits = 0, j = i + 1;
      while (j < segs.length && segs[j].rb) {
        var v = segs[j].v, outs = 0;
        for (var k = g.arcStart[v]; k < g.arcStart[v + 1]; k++) if (!(g.eflags[g.arcs[k] >> 1] & 2)) outs++;
        if (outs > 0) exits++;
        j++;
      }
      var nx = segs[j] || segs[segs.length - 1];
      steps.push({ at: s.endAt, t: 'rb', txt: 'Au rond-point, prenez la ' + ordinal(Math.max(1, exits)) + ' sortie' + (nx.name ? ' vers ' + nx.name : ''), name: nx.name });
      i = j - 1;
      continue;
    }
    if (s.rb) continue;
    var hin = headIn(s), d = ((headOut(n) - hin + 540) % 360) - 180;
    var tw = turnWord(d), deg = g.deg[s.v];
    if (deg <= 2 && Math.abs(d) < 60) continue; // simple virage de la route
    if (tw && Math.abs(d) < 60) {
      // léger virage : on ne l'annonce que si une autre route part plus droit
      var straighter = false;
      for (var q = g.arcStart[s.v]; q < g.arcStart[s.v + 1]; q++) {
        var ar = g.arcs[q]; if ((ar >> 1) === n.e || (ar >> 1) === s.e) continue;
        var pp = edgePts(g, ar >> 1, ar & 1), m = 2;
        while (m < pp.length - 2 && dist(pp[0], pp[1], pp[m], pp[m + 1]) < 12) m += 2;
        var od = ((bearing(pp[0], pp[1], pp[m], pp[m + 1]) - hin + 540) % 360) - 180;
        if (Math.abs(od) < Math.abs(d) + 10) { straighter = true; break; }
      }
      if (!straighter) tw = null;
    }
    if (tw) steps.push({ at: s.endAt, t: tw.t, txt: tw.txt + (n.name ? ' sur ' + n.name : ''), name: n.name });
    else if (n.name && !sameRoad(n.name, s.name) && !sameRoad(n.name, steps[steps.length - 1].name) && deg > 2) steps.push({ at: s.endAt, t: 'straight', txt: 'Continuez sur ' + n.name, name: n.name });
  }
  steps.push({ at: total, t: 'flag', txt: 'Vous êtes arrivé', name: '' });
  var startWalk = A.d, endWalk = B.d;
  return { coords: coords, cum: cum, ctime: ctime, steps: steps, dist: total, time: ttot || time, off: [startWalk, endWalk] };
}

/* ---------------- stockage hors ligne ---------------- */
function cacheOpen() { return caches.open(CACHE); }
function isReady() {
  if (!('caches' in window)) return Promise.resolve(false);
  return cacheOpen().then(function (c) { return Promise.all(BIG.map(function (f) { return c.match(BASE + f); })); })
    .then(function (r) { return r.every(Boolean); }).catch(function () { return false; });
}
function readCached(f) { return cacheOpen().then(function (c) { return c.match(BASE + f); }).then(function (r) { if (!r) throw new Error('absent : ' + f); return r; }); }
function download(onProgress) {
  var ver;
  return fetch(BASE + 'version.json?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error('carte pas encore prête'); return r.json(); }).then(function (v) {
    ver = v;
    var total = (v.pmtiles || 0) + (v.routes || 0) + (v.lieux || 0), done = 0;
    return cacheOpen().then(function (c) {
      var chain = Promise.resolve();
      BIG.forEach(function (f) {
        chain = chain.then(function () {
          return fetch(BASE + f + '?v=' + encodeURIComponent(v.date), { cache: 'no-store' }).then(function (r) {
            if (!r.ok) throw new Error('téléchargement impossible : ' + f);
            if (!r.body || !r.body.getReader) return r.blob().then(function (b) { done += b.size; onProgress(done, total); return b; });
            var rd = r.body.getReader(), parts = [];
            function pump() { return rd.read().then(function (x) { if (x.done) return new Blob(parts); parts.push(x.value); done += x.value.length; onProgress(done, total); return pump(); }); }
            return pump();
          }).then(function (b) { return c.put(BASE + f, new Response(b, { headers: { 'Content-Length': String(b.size) } })); });
        });
      });
      // petits fichiers (polices, pictogrammes, style)
      chain = chain.then(function () { return Promise.all(SMALL.map(function (f) { return fetch(BASE + f).then(function (r) { if (r.ok) return c.put(BASE + f, r); }).catch(function () {}); })); });
      return chain;
    });
  }).then(function () { lsSet('ag27-carte-v', ver.date); return ver; });
}
function serverVersion() { return fetch(BASE + 'version.json?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }); }

/* ---------------- interface ---------------- */
var M = { open: false };
var CSS = '#mapov{position:fixed;inset:0;z-index:65;background:#0A1630;display:flex;flex-direction:column;color:#F5EEDC;font-family:Inter,system-ui,sans-serif}' +
  '#mapov .mtop{position:absolute;top:0;left:0;right:0;z-index:3;display:flex;align-items:center;gap:8px;padding:calc(10px + env(safe-area-inset-top)) 12px 8px;pointer-events:none}' +
  '#mapov .mtop>*{pointer-events:auto}' +
  '#mapov .rb{width:44px;height:44px;border-radius:50%;border:1px solid rgba(212,175,90,.4);background:rgba(10,22,48,.92);color:#F5EEDC;display:flex;align-items:center;justify-content:center;flex-shrink:0}' +
  '#mapov #mapdiv{flex:1;min-height:0}' +
  '#mapov .msheet{position:absolute;left:0;right:0;bottom:0;z-index:3;background:#0A1630;border-top:1px solid rgba(212,175,90,.35);border-radius:22px 22px 0 0;padding:14px 16px calc(14px + env(safe-area-inset-bottom));display:flex;flex-direction:column;gap:10px;max-height:72vh;overflow-y:auto;box-shadow:0 -10px 30px rgba(0,0,0,.35)}' +
  '#mapov .fld{display:flex;align-items:center;gap:10px;min-height:48px;padding:0 12px;border-radius:14px;background:#12224A;border:1px solid transparent;width:100%;color:inherit;font:inherit;text-align:left}' +
  '#mapov .fld.on{border-color:#E9C977}' +
  '#mapov .fld .lab{font-size:11px;color:#9FAAC4;text-transform:uppercase;letter-spacing:1px;width:58px;flex-shrink:0}' +
  '#mapov .fld .val{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:15px;font-weight:600}' +
  '#mapov .fld .val.ph{color:#9FAAC4;font-weight:400}' +
  '#mapov .dot{width:12px;height:12px;border-radius:50%;flex-shrink:0}' +
  '#mapov .mbtn{min-height:50px;border-radius:16px;border:0;background:#D4AF5A;color:#0A1630;font-size:15px;font-weight:700;display:flex;align-items:center;justify-content:center;gap:8px;padding:0 16px;font-family:inherit}' +
  '#mapov .mbtn.gh{background:transparent;border:1px solid #D4AF5A;color:#E9C977;font-weight:600}' +
  '#mapov .opt{display:flex;align-items:center;gap:12px;min-height:48px;padding:6px 4px;border:0;border-bottom:1px solid rgba(212,175,90,.15);background:none;color:inherit;font:inherit;text-align:left;width:100%}' +
  '#mapov .opt .oi{width:34px;height:34px;border-radius:50%;background:#12224A;color:#E9C977;display:flex;align-items:center;justify-content:center;flex-shrink:0}' +
  '#mapov .opt .on1{font-size:15px;font-weight:600}#mapov .opt .on2{font-size:12px;color:#9FAAC4}' +
  '#mapov .srch{display:flex;align-items:center;gap:8px;min-height:46px;padding:0 12px;border-radius:14px;background:#12224A;color:#9FAAC4}' +
  '#mapov .srch input{flex:1;min-width:0;border:0;background:none;color:#F5EEDC;font-size:16px;outline:none}' +
  '#mapov .sm{font-size:12px;color:#9FAAC4;line-height:1.5}' +
  '#mapov .bar{height:8px;border-radius:99px;background:#12224A;overflow:hidden}#mapov .bar>div{height:100%;background:#D4AF5A;width:0}' +
  '#mapov .navtop{position:absolute;top:0;left:0;right:0;z-index:4;padding:calc(10px + env(safe-area-inset-top)) 12px 0}' +
  '#mapov .navcard{display:flex;align-items:center;gap:14px;padding:14px 16px;border-radius:20px;background:#12224A;border:1px solid #D4AF5A;box-shadow:0 8px 24px rgba(0,0,0,.4)}' +
  '#mapov .navcard .ni{width:56px;height:56px;border-radius:16px;background:#D4AF5A;color:#0A1630;display:flex;align-items:center;justify-content:center;flex-shrink:0}' +
  '#mapov .navcard .nd{font-size:28px;font-weight:700;color:#E9C977;font-variant-numeric:tabular-nums;line-height:1}' +
  '#mapov .navcard .nt{font-size:15px;font-weight:600;line-height:1.3;margin-top:4px}' +
  '#mapov .navnext{margin:6px 0 0 12px;display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:12px;background:rgba(10,22,48,.92);font-size:13px;color:#C9D0E0}' +
  '#mapov .pop{display:flex;flex-direction:column;gap:6px;min-width:170px;font-family:Inter,system-ui,sans-serif}' +
  '#mapov .pop button{min-height:40px;border-radius:12px;border:0;font-weight:700;font-size:14px;font-family:inherit}' +
  '#mapov .maplibregl-popup-content{background:#12224A;color:#F5EEDC;border-radius:14px;padding:10px;border:1px solid rgba(212,175,90,.4)}' +
  '#mapov .maplibregl-popup-tip{border-top-color:#12224A!important;border-bottom-color:#12224A!important}' +
  '#mapov .maplibregl-popup-close-button{display:none}' +
  '#mapov .maplibregl-ctrl-attrib{font-size:10px;background:rgba(10,22,48,.7)}#mapov .maplibregl-ctrl-attrib a{color:#C9D0E0}' +
  '#mapov .me{width:22px;height:22px;border-radius:50%;background:#4AA3FF;border:3px solid #fff;box-shadow:0 0 0 6px rgba(74,163,255,.25)}' +
  '#mapov .me.nav{width:34px;height:34px;border:0;background:none;box-shadow:none}' +
  '#mapov .pinA,#mapov .pinB{width:18px;height:18px;border-radius:50%;border:3px solid #0A1630;box-shadow:0 0 0 2px #E9C977}' +
  '#mapov .pinA{background:#8FD3A8}#mapov .pinB{background:#F2A3AC}';

function el(id) { return document.getElementById(id); }
function loadCss(href) { return new Promise(function (ok) { var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href; l.onload = ok; l.onerror = ok; document.head.appendChild(l); }); }
function loadJs(src) { return new Promise(function (ok, ko) { var s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = function () { ko(new Error('script ' + src)); }; document.head.appendChild(s); }); }
var libs = null;
function loadLibs() {
  if (libs) return libs;
  libs = Promise.all([loadCss(BASE + 'maplibre-gl.css'), loadJs(BASE + 'maplibre-gl.js'), loadJs(BASE + 'pmtiles.js')]).catch(function (e) { libs = null; throw e; });
  return libs;
}

function open() {
  if (M.open) return;
  M.open = true;
  if (!el('mapcss')) { var st = document.createElement('style'); st.id = 'mapcss'; st.textContent = CSS; document.head.appendChild(st); }
  var ov = document.createElement('div'); ov.id = 'mapov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', 'Carte de Maurice');
  ov.innerHTML = '<div id="mapdiv"></div><div class="mtop" id="mtop"><button type="button" class="rb" data-m="close" aria-label="Fermer la carte">' + ic('x', 18, 2) + '</button><div style="flex:1"></div><button type="button" class="rb" data-m="locate" aria-label="Ma position">' + ic('gps', 20) + '</button></div><div class="msheet" id="msheet"></div><div id="navui"></div>';
  document.body.appendChild(ov);
  document.body.style.overflow = 'hidden';
  ov.addEventListener('click', onClick);
  ov.addEventListener('input', onInput);
  M.field = M.field || null;
  M.A = M.A || null; M.B = M.B || null;
  isReady().then(function (ok) {
    if (!M.open) return;
    if (ok) start(); else sheetDownload();
  });
}
function close() {
  if (!M.open) return;
  stopNav();
  M.open = false;
  if (M.map) { try { M.map.remove(); } catch (e) {} M.map = null; }
  var ov = el('mapov'); if (ov) ov.remove();
  document.body.style.overflow = '';
}

function sheetDownload(err) {
  var sh = el('msheet'); if (!sh) return;
  serverVersion().then(function (v) {
    if (!M.open) return;
    var size = v ? Math.round(((v.pmtiles || 0) + (v.routes || 0) + (v.lieux || 0)) / 1e5) / 10 : null;
    sh.innerHTML = '<span style="font-family:\'Cormorant Garamond\',Georgia,serif;font-size:26px;font-weight:700">Carte hors ligne</span>' +
      (v ? '<span class="sm" style="font-size:14px;color:#C9D0E0">Pour utiliser la carte et le GPS à Maurice sans réseau, télécharge-la une fois maintenant, de préférence en wifi' + (size ? ' (' + String(size).replace('.', ',') + ' Mo)' : '') + '. Elle reste ensuite dans le téléphone.</span>' +
        '<div class="bar" id="dlbar" hidden><div></div></div><span class="sm" id="dltxt"></span>' +
        '<button type="button" class="mbtn" data-m="download">' + ic('down', 20, 2) + 'Télécharger la carte</button>'
        : '<span class="sm" style="font-size:14px;color:#C9D0E0">' + (navigator.onLine === false ? 'Pas de réseau : la carte n\'a pas encore été téléchargée sur ce téléphone. Reviens ici avec une connexion pour la télécharger.' : 'La carte de Maurice est en cours de préparation sur le site. Réessaie dans quelques minutes.') + '</span>') +
      (err ? '<span class="sm" style="color:#F2A3AC">' + esc(err) + '</span>' : '') +
      '<span class="sm">Carte © contributeurs OpenStreetMap.</span>';
  });
}
function doDownload(btn) {
  btn.disabled = true; btn.textContent = 'Téléchargement…';
  var bar = el('dlbar'), txt = el('dltxt'); if (bar) bar.hidden = false;
  download(function (d, t) {
    if (bar) bar.firstChild.style.width = (t ? Math.min(100, d / t * 100) : 50) + '%';
    if (txt) txt.textContent = (d / 1e6).toFixed(1).replace('.', ',') + ' Mo' + (t ? ' sur ' + (t / 1e6).toFixed(1).replace('.', ',') + ' Mo' : '');
  }).then(function () {
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () {});
    toast('Carte téléchargée : elle marche maintenant sans réseau.');
    if (M.open) start();
  }, function (e) { sheetDownload('Le téléchargement a échoué (' + (e && e.message || 'réseau') + '). Réessaie.'); });
}

function start() {
  var sh = el('msheet'); if (sh) sh.innerHTML = '<span class="sm">Ouverture de la carte…</span>';
  Promise.all([loadLibs(), readCached('maurice.pmtiles').then(function (r) { return r.blob(); }), G ? null : readCached('routes.bin').then(function (r) { return r.arrayBuffer(); }), M.lieux ? null : readCached('lieux.json').then(function (r) { return r.json(); })])
    .then(function (res) {
      if (!M.open) return;
      if (res[2]) G = loadGraph(res[2]);
      if (res[3]) M.lieux = res[3];
      buildMap(res[1]);
      sheetPlan();
      checkMapUpdate();
    }).catch(function (e) {
      if (sh) sh.innerHTML = '<span class="sm" style="color:#F2A3AC">La carte n\'a pas pu s\'ouvrir (' + esc(e && e.message || e) + ').</span><button type="button" class="mbtn gh" data-m="redownload">Télécharger à nouveau</button>';
    });
}
function checkMapUpdate() {
  if (navigator.onLine === false) return;
  serverVersion().then(function (v) {
    if (v && v.date && lsGet('ag27-carte-v') && v.date !== lsGet('ag27-carte-v')) M.updateAvail = v;
    if (M.updateAvail && !M.nav) sheetPlan();
  });
}

function buildMap(blob) {
  var file = new File([blob], 'maurice.pmtiles');
  if (!window._agPmProto) { window._agPmProto = new pmtiles.Protocol(); maplibregl.addProtocol('pmtiles', window._agPmProto.tile); }
  var pm = new pmtiles.PMTiles(new pmtiles.FileSource(file));
  window._agPmProto.add(pm);
  return fetch(BASE + 'style.json').then(function (r) { return r.json(); }).catch(function () { return readCached('style.json').then(function (r) { return r.json(); }); }).then(function (style) {
    var base = new URL(BASE, location.href).href;
    style.glyphs = base + 'fonts/{fontstack}/{range}.pbf';
    style.sprite = base + 'sprites/dark';
    style.sources.maurice.url = 'pmtiles://maurice.pmtiles';
    var saved = null; try { saved = JSON.parse(lsGet('ag27-carte-cam') || 'null'); } catch (e) {}
    var map = M.map = new maplibregl.Map({
      container: 'mapdiv', style: style, center: saved ? saved.c : CENTER, zoom: saved ? saved.z : 9.6,
      maxBounds: [[56.9, -20.9], [58.2, -19.6]], attributionControl: { compact: true }, pitchWithRotate: false, dragRotate: false
    });
    map.touchZoomRotate.disableRotation();
    map.on('moveend', function () { if (!M.nav) lsSet('ag27-carte-cam', JSON.stringify({ c: map.getCenter().toArray(), z: map.getZoom() })); });
    map.on('load', function () {
      map.addSource('rt', { type: 'geojson', data: emptyFC() });
      map.addLayer({ id: 'rt-casing', type: 'line', source: 'rt', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': '#0A1630', 'line-width': ['interpolate', ['linear'], ['zoom'], 9, 6, 16, 14] } });
      map.addLayer({ id: 'rt-line', type: 'line', source: 'rt', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': '#E9C977', 'line-width': ['interpolate', ['linear'], ['zoom'], 9, 3.5, 16, 9] } });
      map.addSource('done', { type: 'geojson', data: emptyFC() });
      map.addLayer({ id: 'done-line', type: 'line', source: 'done', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': '#6B7898', 'line-width': ['interpolate', ['linear'], ['zoom'], 9, 3.5, 16, 9] } });
      drawRoute();
    });
    map.on('click', function (ev) {
      if (M.nav) return;
      var ll = ev.lngLat;
      if (M.field) { setPoint(M.field, { nom: 'Point sur la carte', lat: ll.lat, lon: ll.lng, ic: 'pin' }); return; }
      if (M.popup) M.popup.remove();
      var d = document.createElement('div'); d.className = 'pop';
      d.innerHTML = '<button type="button" data-m="popA" style="background:#8FD3A8;color:#0A1630">Partir d\'ici</button><button type="button" data-m="popB" style="background:#D4AF5A;color:#0A1630">Aller ici</button>';
      d.addEventListener('click', function (e) {
        var b = e.target.closest('[data-m]'); if (!b) return;
        e.stopPropagation();
        setPoint(b.getAttribute('data-m') === 'popA' ? 'A' : 'B', { nom: 'Point sur la carte', lat: ll.lat, lon: ll.lng, ic: 'pin' });
        if (M.popup) M.popup.remove();
      });
      M.popup = new maplibregl.Popup({ closeButton: false, offset: 8 }).setLngLat(ll).setDOMContent(d).addTo(map);
    });
  });
}
function emptyFC() { return { type: 'FeatureCollection', features: [] }; }

function pointLabel(p) { return p ? p.nom : ''; }
function sheetPlan() {
  var sh = el('msheet'); if (!sh || M.nav) return;
  var f = M.field;
  var fld = function (k, lab, color) {
    var p = M[k];
    return '<button type="button" class="fld' + (f === k ? ' on' : '') + '" data-m="field' + k + '"><span class="dot" style="background:' + color + '"></span><span class="lab">' + lab + '</span><span class="val' + (p ? '' : ' ph') + '">' + esc(p ? pointLabel(p) : (k === 'A' ? 'Choisir le départ' : 'Choisir l\'arrivée')) + '</span></button>';
  };
  var h = '<div style="display:flex;gap:8px;align-items:center"><div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:8px">' + fld('A', 'Départ', '#8FD3A8') + fld('B', 'Arrivée', '#F2A3AC') + '</div>' +
    '<button type="button" class="rb" data-m="swap" aria-label="Inverser départ et arrivée">' + ic('swap', 20) + '</button></div>';
  if (f) {
    h += '<div class="srch">' + ic('search', 18) + '<input id="msrch" type="search" placeholder="Rechercher un lieu" autocomplete="off" value="' + esc(M.q || '') + '"></div>' +
      '<div id="mres">' + resultsHtml() + '</div>' +
      '<span class="sm">Ou touche la carte pour placer le point.</span>';
  } else if (M.R) {
    var r = M.R, eta = new Date(Date.now() + r.time * 1000);
    h += '<div style="display:flex;align-items:baseline;gap:10px"><span style="font-size:28px;font-weight:700;color:#E9C977">' + dur(r.time) + '</span><span style="font-size:15px;color:#C9D0E0">' + km(r.dist) + ' · arrivée ' + hhmm(eta) + '</span></div>' +
      '<button type="button" class="mbtn" data-m="go">' + ic('go', 20, 2) + 'Démarrer le guidage</button>' +
      '<div style="display:flex;gap:8px"><button type="button" class="mbtn gh" style="flex:1;min-height:44px;font-size:13px" data-m="ext-g">' + ic('ext', 16) + 'Google</button><button type="button" class="mbtn gh" style="flex:1;min-height:44px;font-size:13px" data-m="ext-w">' + ic('ext', 16) + 'Waze</button><button type="button" class="mbtn gh" style="flex:1;min-height:44px;font-size:13px" data-m="ext-a">' + ic('ext', 16) + 'Plans</button></div>' +
      '<span class="sm">Le guidage AG 2027 marche sans réseau (GPS du téléphone). Google Maps, Waze et Plans demandent du réseau ou leur propre carte hors ligne.</span>';
  } else if (M.A && M.B) {
    h += '<span class="sm" style="color:#F2A3AC">' + esc(M.routeErr || 'Pas d\'itinéraire trouvé entre ces deux points.') + '</span>';
  } else {
    h += '<span class="sm">Choisis un départ et une arrivée : dans la liste, avec ta position, ou en touchant la carte.</span>';
  }
  if (M.updateAvail && !f) h += '<button type="button" class="mbtn gh" style="min-height:42px;font-size:13px" data-m="redownload">' + ic('down', 16) + 'Nouvelle version de la carte disponible</button>';
  sh.innerHTML = h;
  if (f) { var i = el('msrch'); if (i && M.focusSearch) { M.focusSearch = false; setTimeout(function () { try { i.focus(); } catch (e) {} }, 30); } }
}
function norm(s) { return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' '); }
function resultsHtml() {
  var q = norm(M.q || '').trim(), out = [];
  var opt = function (key, i1, n1, n2) { return '<button type="button" class="opt" data-pick="' + esc(key) + '"><span class="oi">' + ic(i1, 18) + '</span><span style="display:flex;flex-direction:column;min-width:0"><span class="on1">' + esc(n1) + '</span>' + (n2 ? '<span class="on2">' + esc(n2) + '</span>' : '') + '</span></button>'; };
  if (!q) {
    out.push(opt('me', 'gps', 'Ma position', 'GPS du téléphone'));
    FAVORIS.forEach(function (p, i) { out.push(opt('f' + i, p.ic, p.nom, p.type)); });
    return out.join('');
  }
  var words = q.split(/\s+/).filter(Boolean), res = [];
  FAVORIS.forEach(function (p, i) { var n = norm(p.nom); if (words.every(function (w) { return n.indexOf(w) >= 0; })) res.push(['f' + i, p]); });
  (M.lieux || []).some(function (p, i) {
    var n = norm(p[0]);
    if (words.every(function (w) { return n.indexOf(w) >= 0; })) res.push(['l' + i, { nom: p[0], type: p[1] }]);
    return res.length >= 40;
  });
  res.sort(function (a, b) { var sa = norm(a[1].nom).indexOf(words[0]) === 0 ? 0 : 1, sb = norm(b[1].nom).indexOf(words[0]) === 0 ? 0 : 1; return sa - sb; });
  if (!res.length) return '<span class="sm">Aucun lieu trouvé. Touche la carte pour placer le point.</span>';
  return res.slice(0, 25).map(function (r) { var t = r[1].type; return opt(r[0], t === 'golf' ? 'golf' : t === 'hôtel' ? 'hotel' : t === 'aéroport' ? 'avion' : 'pin', r[1].nom, t); }).join('');
}
function pick(key) {
  var f = M.field; if (!f) return;
  if (key === 'me') {
    locateOnce().then(function (p) { setPoint(f, { nom: 'Ma position', lat: p.lat, lon: p.lon, ic: 'gps', me: true }); }, function () { toast('Position GPS indisponible : autorise la localisation pour ce site.'); });
    return;
  }
  var p = key.charAt(0) === 'f' ? FAVORIS[+key.slice(1)] : (function (l) { return { nom: l[0], type: l[1], lat: l[2], lon: l[3], ic: 'pin' }; })(M.lieux[+key.slice(1)]);
  setPoint(f, { nom: p.nom, lat: p.lat, lon: p.lon, ic: p.ic });
}
function setPoint(k, p) {
  M[k] = p; M.q = '';
  M.field = k === 'A' && !M.B ? 'B' : (k === 'B' && !M.A ? 'A' : null);
  M.focusSearch = false;
  computeRoute();
}
function computeRoute() {
  M.R = null; M.routeErr = null;
  if (M.A && M.B && G) {
    var a = snap(G, M.A.lat, M.A.lon), b = snap(G, M.B.lat, M.B.lon);
    if (!a || !b) M.routeErr = 'Ce point est trop loin d\'une route.';
    else {
      M.R = route(G, a, b);
      if (!M.R) M.routeErr = 'Pas d\'itinéraire en voiture entre ces deux points.';
    }
  }
  drawRoute(true);
  sheetPlan();
}
function drawRoute(fit) {
  var map = M.map; if (!map || !map.getSource || !map.getSource('rt')) return;
  map.getSource('rt').setData(M.R ? { type: 'Feature', geometry: { type: 'LineString', coordinates: M.R.coords } } : emptyFC());
  map.getSource('done').setData(emptyFC());
  ['A', 'B'].forEach(function (k) {
    if (M['mk' + k]) { M['mk' + k].remove(); M['mk' + k] = null; }
    var p = M[k]; if (!p || (p.me && M.nav)) return;
    var d = document.createElement('div'); d.className = 'pin' + k;
    M['mk' + k] = new maplibregl.Marker({ element: d }).setLngLat([p.lon, p.lat]).addTo(map);
  });
  if (fit && M.R && M.R.coords.length > 1) {
    var b = new maplibregl.LngLatBounds(M.R.coords[0], M.R.coords[0]);
    M.R.coords.forEach(function (c) { b.extend(c); });
    var sh = el('msheet');
    map.fitBounds(b, { padding: { top: 80, left: 40, right: 40, bottom: (sh ? sh.offsetHeight : 200) + 30 }, maxZoom: 16, duration: 600 });
  } else if (fit && !M.R) {
    var p = M.B || M.A; if (p) map.easeTo({ center: [p.lon, p.lat], zoom: Math.max(map.getZoom(), 13) });
  }
}

/* ---------------- position ---------------- */
function locateOnce() {
  return new Promise(function (ok, ko) {
    if (!navigator.geolocation) return ko(new Error('GPS indisponible'));
    navigator.geolocation.getCurrentPosition(function (p) { ok({ lat: p.coords.latitude, lon: p.coords.longitude, acc: p.coords.accuracy }); }, ko, { enableHighAccuracy: true, timeout: 20000, maximumAge: 10000 });
  });
}
function showMe(lat, lon, nav) {
  if (!M.map) return;
  if (!M.me) { var d = document.createElement('div'); M.me = new maplibregl.Marker({ element: d, rotationAlignment: 'map' }).setLngLat([lon, lat]).addTo(M.map); }
  var e = M.me.getElement();
  e.className = 'me' + (nav ? ' nav' : '');
  e.innerHTML = nav ? '<svg width="34" height="34" viewBox="0 0 24 24"><path d="M12 2 20 21 12 16.5 4 21z" fill="#4AA3FF" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>' : '';
  M.me.setLngLat([lon, lat]);
}
function locate() {
  locateOnce().then(function (p) {
    showMe(p.lat, p.lon, false);
    if (M.map) M.map.easeTo({ center: [p.lon, p.lat], zoom: Math.max(M.map.getZoom(), 14) });
    if (p.lat < -20.6 || p.lat > -19.9 || p.lon < 57.2 || p.lon > 57.9) toast('Tu n\'es pas à Maurice pour le moment !');
  }, function () { toast('Position GPS indisponible : autorise la localisation pour ce site.'); });
}

/* ---------------- guidage ---------------- */
function startNav() {
  if (!M.R) return;
  M.nav = { spoken: {}, off: 0, s: 0, idx: 0, last: null };
  M.voice = lsGet('ag27-carte-voix') !== '0';
  el('msheet').style.display = 'none';
  el('mtop').style.display = 'none';
  if (M.popup) M.popup.remove();
  if (M.map) { M.map.setMaxZoom(18); }
  try { if (navigator.wakeLock) navigator.wakeLock.request('screen').then(function (w) { M.wake = w; }).catch(function () {}); } catch (e) {}
  if (M.A && M.A.me && M.mkA) { M.mkA.remove(); M.mkA = null; }
  navUi();
  speak(M.R.steps[1] ? 'C\'est parti. ' + M.R.steps[0].txt + '.' : 'C\'est parti.');
  if (navigator.geolocation) {
    M.watch = navigator.geolocation.watchPosition(onPos, function () { toast('Signal GPS perdu…'); }, { enableHighAccuracy: true, maximumAge: 1000, timeout: 30000 });
  }
  if (M.A && !M.A.me) {
    // départ choisi ailleurs que sur la position : on affiche le début du trajet
    var c = M.R.coords[0];
    M.map.easeTo({ center: c, zoom: 16.5, pitch: 50, bearing: M.R.coords[1] ? bearing(c[1], c[0], M.R.coords[1][1], M.R.coords[1][0]) : 0, duration: 800 });
  }
}
function stopNav() {
  if (M.watch != null && navigator.geolocation) navigator.geolocation.clearWatch(M.watch);
  M.watch = null;
  if (M.sim) { clearInterval(M.sim); M.sim = null; }
  if (M.wake) { try { M.wake.release(); } catch (e) {} M.wake = null; }
  try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) {}
  var wasNav = !!M.nav;
  M.nav = null;
  var nu = el('navui'); if (nu) nu.innerHTML = '';
  if (!wasNav) return;
  var sh = el('msheet'); if (sh) sh.style.display = '';
  var mt = el('mtop'); if (mt) mt.style.display = '';
  if (M.map) { M.map.easeTo({ pitch: 0, bearing: 0, duration: 500 }); if (M.me) showMe(M.me.getLngLat().lat, M.me.getLngLat().lng, false); }
  drawRoute(true); sheetPlan();
}
function speak(t) {
  if (!M.voice || !window.speechSynthesis) return;
  try { var u = new SpeechSynthesisUtterance(t); u.lang = 'fr-FR'; u.rate = 1.02; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (e) {}
}
function navUi() {
  var n = M.nav, r = M.R; if (!n || !r) return;
  var s = n.s, k = 1;
  while (k < r.steps.length - 1 && r.steps[k].at <= s + 8) k++;
  var st = r.steps[k], nx = r.steps[k + 1];
  var d = Math.max(0, st.at - s);
  var remain = Math.max(0, r.dist - s), tRemain = Math.max(0, r.time - interp(r.cum, r.ctime, s));
  var eta = new Date(Date.now() + tRemain * 1000);
  el('navui').innerHTML = '<div class="navtop"><div class="navcard"><span class="ni">' + ic(st.t, 34, 2.2) + '</span><div style="flex:1;min-width:0"><div class="nd">' + km(d) + '</div><div class="nt">' + esc(st.txt) + '</div></div></div>' +
    (nx && st.t !== 'flag' && nx.at - st.at < 400 ? '<div class="navnext">Puis ' + ic(nx.t, 16) + ' ' + esc(nx.t === 'flag' ? 'arrivée' : nx.txt.replace(/ sur .*/, '').toLowerCase()) + '</div>' : '') + '</div>' +
    '<div class="msheet" style="flex-direction:row;align-items:center;gap:12px"><div style="flex:1;display:flex;flex-direction:column;gap:2px"><span style="font-size:24px;font-weight:700;color:#E9C977">' + dur(tRemain) + '</span><span class="sm" style="font-size:13px">' + km(remain) + ' · arrivée ' + hhmm(eta) + '</span></div>' +
    '<button type="button" class="rb" data-m="voice" aria-label="' + (M.voice ? 'Couper la voix' : 'Activer la voix') + '">' + ic(M.voice ? 'vol' : 'mute', 20) + '</button>' +
    '<button type="button" class="rb" data-m="recenter" aria-label="Recentrer">' + ic('gps', 20) + '</button>' +
    '<button type="button" class="mbtn" style="background:#B83A48;color:#fff;min-height:44px" data-m="stop">Arrêter</button></div>';
  // annonces vocales
  var key = k + ':';
  if (st.t === 'flag') { if (d < 30 && !n.spoken[key + 'a']) { n.spoken[key + 'a'] = 1; speak('Vous êtes arrivé.'); } return; }
  if (d < 45 && !n.spoken[key + '0']) { n.spoken[key + '0'] = n.spoken[key + '1'] = n.spoken[key + '2'] = 1; speak(st.txt + '.'); }
  else if (d < 220 && d > 90 && !n.spoken[key + '1']) { n.spoken[key + '1'] = n.spoken[key + '2'] = 1; speak('Dans ' + km(Math.round(d / 50) * 50) + ', ' + lc(st.txt) + '.'); }
  else if (d < 1100 && d > 600 && !n.spoken[key + '2']) { n.spoken[key + '2'] = 1; speak('Dans ' + km(Math.round(d / 100) * 100) + ', ' + lc(st.txt) + '.'); }
}
function lc(t) { return t.charAt(0).toLowerCase() + t.slice(1); }
function interp(xs, ys, x) {
  var lo = 0, hi = xs.length - 1; if (hi < 1) return 0;
  while (hi - lo > 1) { var m = (lo + hi) >> 1; if (xs[m] <= x) lo = m; else hi = m; }
  var span = xs[hi] - xs[lo]; return span > 0 ? ys[lo] + (ys[hi] - ys[lo]) * (x - xs[lo]) / span : ys[lo];
}
// position projetée sur l'itinéraire, autour de l'index courant
function project(lat, lon) {
  var r = M.R, c = r.coords, n = M.nav, best = { d: Infinity }, from = Math.max(0, n.idx - 5), to = Math.min(c.length - 1, n.idx + 400);
  for (var pass = 0; pass < 2; pass++) {
    for (var i = from; i < to; i++) {
      var p = projSeg(lat, lon, c[i][1], c[i][0], c[i + 1][1], c[i + 1][0]), d = Math.sqrt(p.d2) * 111195;
      if (d < best.d) best = { d: d, i: i, s: r.cum[i] + p.t * (r.cum[i + 1] - r.cum[i]) };
    }
    if (best.d < 60) break;
    from = 0; to = c.length - 1;
  }
  return best;
}
function onPos(pos) {
  var n = M.nav; if (!n || !M.R) return;
  var lat = pos.coords.latitude, lon = pos.coords.longitude, acc = pos.coords.accuracy || 20;
  var pr = project(lat, lon);
  if (pr.d > Math.max(45, acc * 1.5)) {
    n.off++;
    if (n.off >= 3 && G && Date.now() - (n.lastReroute || 0) > 8000) {
      n.lastReroute = Date.now();
      var a = snap(G, lat, lon), b = snap(G, M.B.lat, M.B.lon);
      var rr = a && b ? route(G, a, b) : null;
      if (rr) { M.R = rr; n.idx = 0; n.s = 0; n.off = 0; n.spoken = {}; drawRoute(false); speak('Nouvel itinéraire.'); pr = project(lat, lon); }
    }
  } else n.off = 0;
  if (pr.d < 80) { n.idx = pr.i; n.s = Math.max(n.s - 30, pr.s); }
  showMe(lat, lon, true);
  // tracé déjà parcouru
  if (M.map && M.map.getSource('done')) M.map.getSource('done').setData({ type: 'Feature', geometry: { type: 'LineString', coordinates: M.R.coords.slice(0, n.idx + 1).concat([[lon, lat]]) } });
  var hd = pos.coords.heading;
  var c = M.R.coords, i = Math.min(n.idx, c.length - 2);
  var rb = c.length > 1 ? bearing(c[i][1], c[i][0], c[i + 1][1], c[i + 1][0]) : 0;
  var brg = (hd != null && !isNaN(hd) && (pos.coords.speed || 0) > 2) ? hd : rb;
  if (M.me) M.me.setRotation(brg);
  if (M.map && !n.free) {
    var spd = pos.coords.speed || 0;
    M.map.easeTo({ center: [lon, lat], bearing: brg, pitch: 55, zoom: spd > 20 ? 15.5 : 16.6, padding: { top: 200, bottom: 120, left: 0, right: 0 }, duration: 900 });
  }
  n.last = [lat, lon];
  navUi();
}
// Simulation (tests) : avance le long de l'itinéraire
function simulate(speedKmh) {
  if (!M.nav) startNav();
  if (M.watch != null) { navigator.geolocation.clearWatch(M.watch); M.watch = null; }
  var s = 0, v = (speedKmh || 50) / 3.6;
  M.sim = setInterval(function () {
    var r = M.R; s = Math.min(r.dist, s + v);
    var k = 0; while (k < r.cum.length - 2 && r.cum[k + 1] < s) k++;
    var t = (s - r.cum[k]) / ((r.cum[k + 1] - r.cum[k]) || 1), a = r.coords[k], b = r.coords[k + 1] || a;
    onPos({ coords: { latitude: a[1] + t * (b[1] - a[1]), longitude: a[0] + t * (b[0] - a[0]), accuracy: 5, heading: bearing(a[1], a[0], b[1], b[0]), speed: v } });
    if (s >= r.dist) { clearInterval(M.sim); M.sim = null; }
  }, 1000);
}

function extUrl(kind) {
  var A = M.A, B = M.B, ll = function (p) { return p.lat.toFixed(6) + ',' + p.lon.toFixed(6); };
  if (kind === 'w') return 'https://waze.com/ul?ll=' + ll(B) + '&navigate=yes';
  if (kind === 'a') return 'https://maps.apple.com/?' + (A && !A.me ? 'saddr=' + ll(A) + '&' : '') + 'daddr=' + ll(B) + '&dirflg=d';
  return 'https://www.google.com/maps/dir/?api=1' + (A && !A.me ? '&origin=' + ll(A) : '') + '&destination=' + ll(B) + '&travelmode=driving&dir_action=navigate';
}

function onClick(ev) {
  var t = ev.target.closest('[data-m],[data-pick]'); if (!t) return;
  if (t.hasAttribute('data-pick')) { pick(t.getAttribute('data-pick')); return; }
  var a = t.getAttribute('data-m');
  switch (a) {
    case 'close': close(); break;
    case 'locate': locate(); break;
    case 'download': doDownload(t); break;
    case 'redownload': M.updateAvail = null; if (M.map) { try { M.map.remove(); } catch (e) {} M.map = null; } G = null; M.lieux = null; sheetDownload(); break;
    case 'fieldA': case 'fieldB': var k = a.slice(-1); M.field = M.field === k ? null : k; M.q = ''; M.focusSearch = false; if (M.popup) M.popup.remove(); sheetPlan(); break;
    case 'swap': var x = M.A; M.A = M.B; M.B = x; computeRoute(); break;
    case 'go': startNav(); break;
    case 'stop': stopNav(); break;
    case 'voice': M.voice = !M.voice; lsSet('ag27-carte-voix', M.voice ? '1' : '0'); if (!M.voice) try { speechSynthesis.cancel(); } catch (e) {} navUi(); break;
    case 'recenter': if (M.nav) { M.nav.free = false; if (M.nav.last) onPos({ coords: { latitude: M.nav.last[0], longitude: M.nav.last[1], accuracy: 10 } }); } break;
    case 'ext-g': case 'ext-w': case 'ext-a': window.open(extUrl(a.slice(-1)), '_blank', 'noopener'); break;
  }
}
function onInput(ev) {
  if (ev.target.id !== 'msrch') return;
  M.q = ev.target.value;
  var r = el('mres'); if (r) r.innerHTML = resultsHtml();
}
// pendant le guidage, si on déplace la carte à la main, on arrête de la suivre
document.addEventListener('touchmove', function (e) { if (M.nav && e.target.closest && e.target.closest('#mapdiv')) M.nav.free = true; }, { passive: true });

window.AGMap = { open: open, close: close, isOpen: function () { return M.open; }, _sim: simulate, _M: M };
})();
