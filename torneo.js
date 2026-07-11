/* ═══════════════════════════════════════════════════════
   BÜRK · Torneo — lógica compartida (visor + panel)  v2
   Formato dinámico · tandas por pistas · cuadros con byes
   ═══════════════════════════════════════════════════════ */

var GROUP_LETTERS = "ABCDEFGH".split("");

function defaultState() {
  return {
    meta: { title: "BÜRK · TORNEO EN DIRECTO", updatedAt: null },
    pairs: [],              // [{id:"p1", p1:"Nombre", p2:"Nombre"}]
    groups: null,           // [[pairId,...], ...] tras el sorteo
    results: {},            // "g-r-m" -> {s1,s2}  (g = índice de grupo)
    bracket: null,          // {main:{qf,sf,f}, cons:{qf,sf,f}}
    raffle: { winners: [] } // [{name, prize, at}]
  };
}

function pairName(p) {
  var a = (p && p.p1 || "").trim(), b = (p && p.p2 || "").trim();
  if (a && b) return a + " / " + b;
  return a || b || "(sin nombre)";
}

function pairById(state, id) {
  for (var i = 0; i < state.pairs.length; i++) if (state.pairs[i].id === id) return state.pairs[i];
  return null;
}

/* ── formato según nº de parejas: grupos de 5, 6 o 7 (mín. 4 partidos) ── */
function computeFormat(P) {
  if (P < 10) return null;
  var G = Math.floor(P / 5);
  if (G > GROUP_LETTERS.length) G = GROUP_LETTERS.length;
  var base = Math.floor(P / G), rem = P % G;
  var sizes = [];
  for (var i = 0; i < G; i++) sizes.push(base + (i < rem ? 1 : 0));
  if (sizes[0] > 7) return null; // fuera de rango razonable
  sizes.sort(function (a, b) { return b - a; });
  return { sizes: sizes, groups: G };
}

/* ── calendario round robin (método del círculo) para n = 4..7 ── */
function genSchedule(n) {
  var odd = n % 2 === 1;
  var m = odd ? n + 1 : n;           // añadimos "fantasma" si es impar
  var arr = [];
  for (var i = 0; i < m; i++) arr.push(i);
  var rounds = [];
  for (var r = 0; r < m - 1; r++) {
    var pairs = [], rest = null;
    for (var k = 0; k < m / 2; k++) {
      var a = arr[k], b = arr[m - 1 - k];
      if (odd && (a === m - 1 || b === m - 1)) { rest = a === m - 1 ? b : a; continue; }
      pairs.push(k === 0 ? [a, b] : [Math.min(a, b), Math.max(a, b)]);
    }
    rounds.push({ rest: rest, pairs: pairs });
    // rotar (fijo el 0)
    arr.splice(1, 0, arr.pop());
  }
  return rounds;
}

var _schedCache = {};
function scheduleFor(n) {
  if (!_schedCache[n]) _schedCache[n] = genSchedule(n);
  return _schedCache[n];
}

/* ── barajado con Fisher-Yates ── */
function shuffle(list, rnd) {
  rnd = rnd || Math.random;
  var a = list.slice();
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(rnd() * (i + 1));
    var t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

/* Sorteo de grupos: devuelve [[pairId,...],...] o null si no hay formato */
function drawGroups(state, rnd) {
  var fmt = computeFormat(state.pairs.length);
  if (!fmt) return null;
  var ids = shuffle(state.pairs.map(function (p) { return p.id; }), rnd);
  var groups = [], off = 0;
  for (var g = 0; g < fmt.sizes.length; g++) {
    groups.push(ids.slice(off, off + fmt.sizes[g]));
    off += fmt.sizes[g];
  }
  return groups;
}

/* ── resultados ── */
function isPlayed(res) {
  if (!res || res.s1 === "" || res.s2 === "" || res.s1 == null || res.s2 == null) return false;
  var s1 = Number(res.s1), s2 = Number(res.s2);
  return !isNaN(s1) && !isNaN(s2) && s1 !== s2;
}

function groupMatchList(state) {
  // lista plana de todos los partidos de grupos: {g,r,m,i,j,key}
  var out = [];
  if (!state.groups) return out;
  state.groups.forEach(function (grp, g) {
    scheduleFor(grp.length).forEach(function (round, r) {
      round.pairs.forEach(function (pr, m) {
        out.push({ g: g, r: r, m: m, i: pr[0], j: pr[1], key: g + "-" + r + "-" + m });
      });
    });
  });
  return out;
}

function playedCount(state) {
  var n = 0;
  groupMatchList(state).forEach(function (mm) { if (isPlayed(state.results[mm.key])) n++; });
  return n;
}

/* ── clasificación de un grupo (victorias → h2h → dif → PF) ── */
function groupStats(g, state) {
  var grp = state.groups[g];
  var sched = scheduleFor(grp.length);
  var stats = grp.map(function (pid, i) {
    var p = pairById(state, pid);
    return { idx: i, id: pid, name: pairName(p), group: g, letter: GROUP_LETTERS[g], pj: 0, w: 0, l: 0, pf: 0, pc: 0 };
  });
  sched.forEach(function (round, r) {
    round.pairs.forEach(function (pr, m) {
      var res = state.results[g + "-" + r + "-" + m];
      if (!isPlayed(res)) return;
      var s1 = Number(res.s1), s2 = Number(res.s2);
      var a = stats[pr[0]], b = stats[pr[1]];
      a.pj++; b.pj++; a.pf += s1; a.pc += s2; b.pf += s2; b.pc += s1;
      if (s1 > s2) { a.w++; b.l++; } else { b.w++; a.l++; }
    });
  });
  stats.forEach(function (s) {
    s.diff = s.pf - s.pc;
    s.ratio = s.pj ? s.w / s.pj : 0;
    s.avgDiff = s.pj ? s.diff / s.pj : 0;
  });
  var headToHead = function (tied) {
    var ids = {}; tied.forEach(function (t) { ids[t.idx] = true; });
    var mini = {}; tied.forEach(function (t) { mini[t.idx] = { w: 0, diff: 0 }; });
    sched.forEach(function (round, r) {
      round.pairs.forEach(function (pr, m) {
        if (!ids[pr[0]] || !ids[pr[1]]) return;
        var res = state.results[g + "-" + r + "-" + m];
        if (!isPlayed(res)) return;
        var s1 = Number(res.s1), s2 = Number(res.s2);
        mini[pr[0]].diff += s1 - s2; mini[pr[1]].diff += s2 - s1;
        if (s1 > s2) mini[pr[0]].w++; else mini[pr[1]].w++;
      });
    });
    return tied.slice().sort(function (a, b) {
      return mini[b.idx].w - mini[a.idx].w || mini[b.idx].diff - mini[a.idx].diff ||
        b.diff - a.diff || b.pf - a.pf || a.name.localeCompare(b.name);
    });
  };
  var byWins = stats.slice().sort(function (a, b) { return b.w - a.w; });
  var ordered = [], i = 0;
  while (i < byWins.length) {
    var j = i;
    while (j < byWins.length && byWins[j].w === byWins[i].w) j++;
    var tied = byWins.slice(i, j);
    ordered = ordered.concat(tied.length > 1 ? headToHead(tied) : tied);
    i = j;
  }
  return ordered;
}

/* comparación entre grupos de distinto tamaño: % victorias → dif. media → PF medio */
function crossRank(list) {
  return list.slice().sort(function (a, b) {
    return b.ratio - a.ratio || b.avgDiff - a.avgDiff ||
      (b.pj ? b.pf / b.pj : 0) - (a.pj ? a.pf / a.pj : 0) || a.name.localeCompare(b.name);
  });
}

/* clasificación general: bloques por posición, 8 a principal y hasta 8 a consolación */
function computeQualification(state) {
  var standings = state.groups.map(function (_, g) { return groupStats(g, state); });
  var maxSize = 0; standings.forEach(function (s) { if (s.length > maxSize) maxSize = s.length; });
  var ordered = [], blocks = [];
  for (var pos = 0; pos < maxSize; pos++) {
    var block = [];
    standings.forEach(function (s) { if (s[pos]) block.push(s[pos]); });
    block = crossRank(block);
    block.forEach(function (t) { t.pos = pos; });
    blocks.push(block);
    ordered = ordered.concat(block);
  }
  var main = ordered.slice(0, 8);
  var cons = ordered.slice(8, 16);
  var seedsCons = cons.slice();
  while (seedsCons.length < 8) seedsCons.push(null); // byes al final = pasan los mejores
  return { standings: standings, blocks: blocks, ordered: ordered, main: main, cons: cons, seedsCons: seedsCons };
}

/* zona de cada posición (para colorear tablas): devuelve mapa id->"main"/"cons"/"out" */
function zoneMap(qual) {
  var z = {};
  qual.main.forEach(function (t) { z[t.id] = "main"; });
  qual.cons.forEach(function (t) { if (t) z[t.id] = "cons"; });
  return z;
}

/* ── cuadros: 1v8·4v5·2v7·3v6, evitando mismo grupo en cuartos ── */
function seedBracket(seeds) {
  var order = [[0, 7], [3, 4], [1, 6], [2, 5]];
  var qf = order.map(function (o) { return { a: seeds[o[0]] || null, b: seeds[o[1]] || null }; });
  for (var x = 0; x < qf.length; x++) {
    if (!qf[x].a || !qf[x].b || qf[x].a.group !== qf[x].b.group) continue;
    for (var y = 0; y < qf.length; y++) {
      if (y === x || !qf[y].b) continue;
      var okX = !qf[y].b || qf[x].a.group !== qf[y].b.group;
      var okY = !qf[y].a || !qf[x].b || qf[y].a.group !== qf[x].b.group;
      if (okX && okY) { var t = qf[x].b; qf[x].b = qf[y].b; qf[y].b = t; break; }
    }
  }
  return qf;
}

function makeBracket(qual) {
  var empty = function () { return { s1: "", s2: "", aId: null, bId: null }; };
  var slim = function (t) { return t ? { id: t.id, name: t.name, group: t.group, letter: t.letter } : null; };
  var mk = function (seeds) {
    return {
      qf: seedBracket(seeds).map(function (m) {
        var e = empty(); e.a = slim(m.a); e.b = slim(m.b); return e;
      }),
      sf: [empty(), empty()],
      f: [empty()]
    };
  };
  return { main: mk(qual.main), cons: mk(qual.seedsCons) };
}

/* ganador de un partido de cuadro; bye = pasa el presente */
function winnerOf(m, a, b) {
  if (a && !b) return a;
  if (b && !a) return b;
  if (!a || !b) return null;
  if (!m || m.s1 === "" || m.s2 === "" || m.s1 == null || m.s2 == null) return null;
  if (m.aId !== a.id || m.bId !== b.id) return null; // resultado obsoleto
  var s1 = Number(m.s1), s2 = Number(m.s2);
  if (isNaN(s1) || isNaN(s2) || s1 === s2) return null;
  return s1 > s2 ? a : b;
}

function bracketDerived(br) {
  var qfW = br.qf.map(function (m) { return winnerOf(m, m.a, m.b); });
  var sfPairs = [[qfW[0], qfW[1]], [qfW[2], qfW[3]]];
  var sfW = sfPairs.map(function (p, i) { return p[0] && p[1] ? winnerOf(br.sf[i], p[0], p[1]) : (p[0] && !p[1] ? p[0] : (!p[0] && p[1] ? p[1] : null)); });
  var champ = sfW[0] && sfW[1] ? winnerOf(br.f[0], sfW[0], sfW[1]) : null;
  return { qfW: qfW, sfPairs: sfPairs, sfW: sfW, champ: champ };
}

/* ═══ PLANIFICADOR DE TANDAS ═══
   Rellena cada tanda con hasta C partidos de distintos grupos, en orden de
   calendario y sin que una pareja juegue dos veces en la misma tanda.
   Se usa tanto para el horario real como para el estimador. */
function buildTandas(sizes, courts) {
  // todos los partidos, con precedencia real por pareja:
  // una pareja puede jugar la jornada r cuando ha completado sus jornadas < r
  var all = [];
  sizes.forEach(function (n, g) {
    scheduleFor(n).forEach(function (round, r) {
      round.pairs.forEach(function (pr, m) {
        all.push({ g: g, r: r, m: m, i: pr[0], j: pr[1], key: g + "-" + r + "-" + m, done: false });
      });
    });
  });
  // partidos previos de cada pareja: prev[g][pareja] = [partidos con r menor]
  var prev = {};
  all.forEach(function (mm) {
    [mm.i, mm.j].forEach(function (p) {
      var k = mm.g + ":" + p;
      if (!prev[k]) prev[k] = [];
      prev[k].push(mm);
    });
  });
  var remainingByGroup = sizes.map(function (n) { return n * (n - 1) / 2; });
  var tandas = [];
  var remaining = all.length;
  var guard = 0;
  while (remaining > 0 && guard++ < 500) {
    var tanda = [], busy = {}, inTanda = sizes.map(function () { return 0; });
    var pickable = function (mm) {
      if (mm.done || busy[mm.g + ":" + mm.i] || busy[mm.g + ":" + mm.j]) return false;
      // ambas parejas deben haber jugado (en tandas anteriores) sus jornadas previas
      var ok = true;
      [mm.i, mm.j].forEach(function (p) {
        prev[mm.g + ":" + p].forEach(function (o) {
          if (o.r < mm.r && !o.done) ok = false;
        });
      });
      return ok;
    };
    while (tanda.length < courts) {
      var best = null;
      for (var x = 0; x < all.length; x++) {
        var mm = all[x];
        if (!pickable(mm)) continue;
        if (!best) { best = mm; continue; }
        // prioridad: jornada más temprana → grupo más retrasado → menos en esta tanda
        if (mm.r < best.r ||
          (mm.r === best.r && remainingByGroup[mm.g] > remainingByGroup[best.g]) ||
          (mm.r === best.r && remainingByGroup[mm.g] === remainingByGroup[best.g] && inTanda[mm.g] < inTanda[best.g])) {
          best = mm;
        }
      }
      if (!best) break;
      busy[best.g + ":" + best.i] = busy[best.g + ":" + best.j] = true;
      best.pendingTanda = true; // se marca done al cerrar la tanda
      tanda.push(best);
      inTanda[best.g]++;
      remainingByGroup[best.g]--;
      remaining--;
      best.done = true; // done, pero "busy" impide reutilizar a sus parejas en esta tanda
    }
    if (tanda.length === 0) break; // seguridad
    // orden estable para mostrar: jornada, grupo, partido; asignar pista
    tanda.sort(function (a, b) { return a.r - b.r || a.g - b.g || a.m - b.m; });
    tandas.push(tanda.map(function (mm, idx) {
      return { g: mm.g, r: mm.r, m: mm.m, i: mm.i, j: mm.j, key: mm.key, court: idx + 1 };
    }));
  }
  return tandas;
}

/* ═══ ESTIMADOR DE DURACIÓN ═══ */
function consRoundMatches(consN) {
  var r1 = Math.max(0, consN - 4);
  var sf = consN > 4 ? 2 : Math.max(0, consN - 2);
  var f = consN >= 2 ? 1 : 0;
  return { r1: r1, sf: sf, f: f };
}

function estimateTournament(P, courts, slotMin, interMin) {
  var fmt = computeFormat(P);
  if (!fmt) return null;
  var tandas = buildTandas(fmt.sizes, courts);
  var groupMatches = 0;
  fmt.sizes.forEach(function (n) { groupMatches += n * (n - 1) / 2; });
  var consN = Math.min(8, P - 8);
  var cr = consRoundMatches(consN);
  var koWaves = [
    4 + cr.r1,  // cuartos (principal + consolación)
    2 + cr.sf,  // semifinales
    1 + cr.f    // finales
  ];
  var koTandas = 0;
  koWaves.forEach(function (w) { koTandas += Math.ceil(w / courts); });
  var koMatches = 7 + (consN - 1 > 0 ? consN - 1 : 0);
  var minutes = (tandas.length + koTandas) * slotMin + interMin;
  var minPerPair = Math.min.apply(null, fmt.sizes) - 1;
  var maxPerPair = Math.max.apply(null, fmt.sizes) - 1;
  return {
    P: P, sizes: fmt.sizes, groupMatches: groupMatches, koMatches: koMatches,
    totalMatches: groupMatches + koMatches,
    groupTandas: tandas.length, koTandas: koTandas,
    minutes: minutes, minPerPair: minPerPair, maxPerPair: maxPerPair
  };
}

function fmtDuration(min) {
  var h = Math.floor(min / 60), m = min % 60;
  if (h === 0) return m + " min";
  return h + " h" + (m ? " " + (m < 10 ? "0" : "") + m + " min" : "");
}

/* ── utilidades varias ── */
function escHtml(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}
function fmtDiff(d) { return d > 0 ? "+" + d : String(d); }

function rafflePool(state) {
  var winners = {};
  (state.raffle && state.raffle.winners || []).forEach(function (w) { winners[w.name] = true; });
  var pool = [];
  state.pairs.forEach(function (p) {
    [p.p1, p.p2].forEach(function (n) {
      n = (n || "").trim();
      if (n && !winners[n]) pool.push(n);
    });
  });
  return pool;
}

/* export para pruebas en node */
if (typeof module !== "undefined") module.exports = {
  GROUP_LETTERS: GROUP_LETTERS, defaultState: defaultState, pairName: pairName, pairById: pairById,
  computeFormat: computeFormat, genSchedule: genSchedule, scheduleFor: scheduleFor, shuffle: shuffle,
  drawGroups: drawGroups, isPlayed: isPlayed, groupMatchList: groupMatchList, playedCount: playedCount,
  groupStats: groupStats, crossRank: crossRank, computeQualification: computeQualification, zoneMap: zoneMap,
  seedBracket: seedBracket, makeBracket: makeBracket, winnerOf: winnerOf, bracketDerived: bracketDerived,
  buildTandas: buildTandas, estimateTournament: estimateTournament, fmtDuration: fmtDuration,
  escHtml: escHtml, fmtDiff: fmtDiff, rafflePool: rafflePool, consRoundMatches: consRoundMatches
};
