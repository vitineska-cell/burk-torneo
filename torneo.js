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

/* ═══════════════════════════════════════════════════════
   BÜRK · mejora cuadros con tandas y pistas v1
   Asignación automática estable + corrección manual en admin
   ═══════════════════════════════════════════════════════ */
(function () {
  "use strict";

  function validPositiveInt(v) {
    return Number.isInteger(Number(v)) && Number(v) > 0;
  }

  function qfPotential(br) {
    return br.qf.map(function (m) { return !!(m && (m.a || m.b)); });
  }

  function roundIsPlayable(br, round, idx) {
    if (!br) return false;
    if (round === "qf") {
      var q = br.qf[idx];
      return !!(q && q.a && q.b);
    }
    var qp = qfPotential(br);
    if (round === "sf") {
      return !!(qp[idx * 2] && qp[idx * 2 + 1]);
    }
    if (round === "f") {
      var sf0 = !!(qp[0] || qp[1]);
      var sf1 = !!(qp[2] || qp[3]);
      return sf0 && sf1;
    }
    return false;
  }

  function bracketScheduleRefs(bracket) {
    if (!bracket || !bracket.main || !bracket.cons) return [];
    var refs = [];
    ["qf", "sf", "f"].forEach(function (round) {
      ["main", "cons"].forEach(function (draw) {
        var br = bracket[draw];
        (br[round] || []).forEach(function (match, idx) {
if (!roundIsPlayable(br, round, idx)) return;
refs.push({ draw: draw, round: round, idx: idx, match: match });
        });
      });
    });
    return refs;
  }

  function ensureBracketSchedule(bracket, courtCount, reset) {
    if (!bracket) return false;
    var courts = Math.max(1, Number(courtCount) || 1);
    var changed = false;
    var refs = bracketScheduleRefs(bracket);
    var stages = ["qf", "sf", "f"];
    var nextSlot = 1;

    stages.forEach(function (round) {
      var stage = refs.filter(function (r) { return r.round === round; });
      stage.forEach(function (ref, i) {
        var slot = nextSlot + Math.floor(i / courts);
        var court = i % courts + 1;
        if (reset || !validPositiveInt(ref.match.slot)) {
if (Number(ref.match.slot) !== slot) changed = true;
ref.match.slot = slot;
        }
        if (reset || !validPositiveInt(ref.match.court)) {
if (Number(ref.match.court) !== court) changed = true;
ref.match.court = court;
        }
      });
      if (stage.length) nextSlot += Math.ceil(stage.length / courts);
    });

    if (reset || !validPositiveInt(bracket.scheduleCourts)) {
      if (Number(bracket.scheduleCourts) !== courts) changed = true;
      bracket.scheduleCourts = courts;
    }
    return changed;
  }

  function refKey(ref) {
    return ref.draw + ":" + ref.round + ":" + ref.idx;
  }

  function maxScheduledSlot(bracket) {
    var max = 0;
    bracketScheduleRefs(bracket).forEach(function (ref) {
      max = Math.max(max, Number(ref.match.slot) || 0);
    });
    return max;
  }

  function roundTitle(round) {
    return round === "qf" ? "Cuartos" : round === "sf" ? "Semifinal" : "Final";
  }

  function drawTitle(draw) {
    return draw === "main" ? "principal" : "consolación";
  }

  function matchCode(ref) {
    return (ref.round === "qf" ? "QF" : ref.round === "sf" ? "SF" : "F") + (ref.idx + 1);
  }

  function participantsFor(br, round, idx) {
    if (round === "qf") return [br.qf[idx].a, br.qf[idx].b];
    var d = bracketDerived(br);
    if (round === "sf") return d.sfPairs[idx] || [null, null];
    return [d.sfW[0], d.sfW[1]];
  }

  function fallbackParticipants(ref) {
    if (ref.round === "sf") {
      return "Ganador QF" + (ref.idx * 2 + 1) + " / Ganador QF" + (ref.idx * 2 + 2);
    }
    if (ref.round === "f") return "Ganador SF1 / Ganador SF2";
    return "Por definir";
  }

  function matchupText(bracket, ref) {
    var p = participantsFor(bracket[ref.draw], ref.round, ref.idx);
    if (p[0] && p[1]) return p[0].name + " — " + p[1].name;
    if (p[0] || p[1]) return (p[0] || p[1]).name + " — Por definir";
    return fallbackParticipants(ref);
  }

  function scheduleCollisions(bracket) {
    var seen = {}, bad = {};
    bracketScheduleRefs(bracket).forEach(function (ref) {
      var k = Number(ref.match.slot) + ":" + Number(ref.match.court);
      if (seen[k]) {
        bad[k] = true;
      } else {
        seen[k] = true;
      }
    });
    return bad;
  }

  function injectBracketStyles() {
    if (document.getElementById("burk-bracket-courts-css")) return;
    var style = document.createElement("style");
    style.id = "burk-bracket-courts-css";
    style.textContent = [
      ".bk-label{display:flex;align-items:center;justify-content:space-between;gap:8px;padding-right:8px}",
      ".bk-court-tag{display:inline-block;color:var(--gold);border:1px solid #3A3020;padding:2px 6px;font-family:Archivo,sans-serif;font-size:9px;letter-spacing:.08em;white-space:nowrap}",
      ".bk-court-tag.off{color:var(--dim);border-color:var(--line)}",
      ".bk-court-controls{display:flex;gap:8px;padding:8px 10px;border-top:1px solid var(--line2);background:#0C0C0E}",
      ".bk-court-controls label{flex:1;font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:var(--mut2)}",
      ".bk-court-controls select{width:100%;margin-top:4px;background:#0A0A0B;border:1px solid #2A2A2F;color:#fff;padding:6px;font:600 11px Archivo,sans-serif}",
      ".bracket-plan .panel-head{justify-content:space-between}",
      ".bracket-plan-actions{margin-left:auto;display:flex;align-items:center;gap:8px}",
      ".bracket-wave{border-top:1px solid var(--line2)}",
      ".bracket-wave-head{padding:9px 14px;font:700 11px Archivo,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:var(--gold);background:#11100C}",
      ".bracket-plan-row{display:flex;align-items:center;gap:10px;padding:9px 14px;border-top:1px solid var(--line2)}",
      ".bracket-plan-row:first-child{border-top:0}",
      ".bracket-plan-row.conflict{background:#1B1010}",
      ".bracket-plan-meta{min-width:145px;font-size:10px;color:var(--mut2);letter-spacing:.05em;text-transform:uppercase}",
      ".bracket-plan-names{flex:1;min-width:0;font-size:12px;color:#B9B9C0;overflow-wrap:anywhere}",
      ".bracket-warning{padding:9px 14px;color:#E7B14C;font-size:11px;border-top:1px solid #3A3020;background:#171307}",
      "@media(max-width:640px){.bracket-plan-row{align-items:flex-start;flex-wrap:wrap}.bracket-plan-meta{min-width:0;width:100%}.bracket-plan-names{width:100%}}"
    ].join("");
    document.head.appendChild(style);
  }

  function optionList(max, selected) {
    var html = "";
    for (var i = 1; i <= max; i++) {
      html += '<option value="' + i + '"' + (Number(selected) === i ? " selected" : "") + ">" + i + "</option>";
    }
    return html;
  }

  function buildPlanPanel(bracket, courtCount, editable, onReset) {
    var refs = bracketScheduleRefs(bracket).slice().sort(function (a, b) {
      return Number(a.match.slot) - Number(b.match.slot) || Number(a.match.court) - Number(b.match.court) || refKey(a).localeCompare(refKey(b));
    });
    var collisions = scheduleCollisions(bracket);
    var panel = document.createElement("div");
    panel.className = "panel bracket-plan";
    var html = '<div class="panel-head gold"><span>Plan de pistas · cuadros</span>';
    if (editable) html += '<span class="bracket-plan-actions"><button class="btn" type="button" id="btn-reset-bracket-courts">Recalcular pistas</button></span>';
    html += "</div>";

    if (Number(bracket.scheduleCourts) !== Number(courtCount)) {
      html += '<div class="bracket-warning">⚠ Los cuadros se planificaron con ' + escHtml(bracket.scheduleCourts) + " pista(s), pero ahora hay " + escHtml(courtCount) + ". Pulsa Recalcular pistas para adaptarlos.</div>";
    }

    var currentSlot = null;
    refs.forEach(function (ref) {
      var slot = Number(ref.match.slot), court = Number(ref.match.court);
      if (slot !== currentSlot) {
        if (currentSlot !== null) html += "</div>";
        currentSlot = slot;
        html += '<div class="bracket-wave"><div class="bracket-wave-head">Tanda ' + slot + "</div>";
      }
      var collision = collisions[slot + ":" + court];
      html += '<div class="bracket-plan-row' + (collision ? " conflict" : "") + '">' +
        '<span class="pista-chip">PISTA ' + court + "</span>" +
        '<span class="bracket-plan-meta">' + escHtml(roundTitle(ref.round) + " " + drawTitle(ref.draw) + " · " + matchCode(ref)) + "</span>" +
        '<span class="bracket-plan-names">' + escHtml(matchupText(bracket, ref)) + (collision ? " · ⚠ pista duplicada" : "") + "</span></div>";
    });
    if (currentSlot !== null) html += "</div>";
    if (!refs.length) html += '<div class="empty">No hay partidos eliminatorios que necesiten pista.</div>';
    html += '<div class="hint">Cada tanda empieza cuando han terminado los partidos necesarios de la anterior. La asignación se genera automáticamente y, desde el panel, puede corregirse manualmente.</div>';
    panel.innerHTML = html;
    if (editable) {
      var reset = panel.querySelector("#btn-reset-bracket-courts");
      if (reset) reset.addEventListener("click", onReset);
    }
    return panel;
  }

  function drawPanel(container, draw) {
    var panels = container.querySelectorAll(".panel");
    for (var i = 0; i < panels.length; i++) {
      var head = panels[i].querySelector(".panel-head");
      if (!head) continue;
      var text = head.textContent.toLowerCase();
      if (draw === "main" && text.indexOf("cuadro principal") !== -1) return panels[i];
      if (draw === "cons" && text.indexOf("consolación") !== -1) return panels[i];
    }
    return null;
  }

  function decorateMatches(container, bracket, editable, courtCount, onChange) {
    var active = {};
    bracketScheduleRefs(bracket).forEach(function (ref) { active[refKey(ref)] = ref; });
    ["main", "cons"].forEach(function (draw) {
      var panel = drawPanel(container, draw);
      if (!panel) return;
      var nodes = panel.querySelectorAll(".bk-match");
      var ordered = [];
      ["qf", "sf", "f"].forEach(function (round) {
        (bracket[draw][round] || []).forEach(function (match, idx) {
ordered.push({ draw: draw, round: round, idx: idx, match: match });
        });
      });
      nodes.forEach(function (node, i) {
        var ref = ordered[i];
        if (!ref) return;
        var scheduled = active[refKey(ref)];
        var label = node.querySelector(".bk-label");
        if (label) {
var tag = document.createElement("span");
tag.className = "bk-court-tag" + (scheduled ? "" : " off");
tag.textContent = scheduled ? "TANDA " + ref.match.slot + " · PISTA " + ref.match.court : (ref.round === "qf" && ((ref.match.a && !ref.match.b) || (!ref.match.a && ref.match.b)) ? "PASE DIRECTO" : "SIN PARTIDO");
label.appendChild(tag);
        }
        if (!editable || !scheduled) return;
        var controls = document.createElement("div");
        controls.className = "bk-court-controls";
        var slotMax = Math.max(6, maxScheduledSlot(bracket) + 2);
        controls.innerHTML = '<label>Tanda<select data-kind="slot">' + optionList(slotMax, ref.match.slot) + '</select></label>' +
'<label>Pista<select data-kind="court">' + optionList(Math.max(1, Number(courtCount) || 1), ref.match.court) + "</select></label>";
        controls.querySelectorAll("select").forEach(function (select) {
select.addEventListener("change", function () {
  ref.match[select.dataset.kind] = Number(select.value);
  onChange();
});
        });
        node.appendChild(controls);
      });
    });
  }

  function installAdminEnhancement() {
    var original = window.renderCuadros;
    if (typeof original !== "function") return;
    window.renderCuadros = function () {
      var changed = false;
      if (state && state.bracket) changed = ensureBracketSchedule(state.bracket, courts(), false);
      if (changed && typeof markDirty === "function") markDirty();
      original();
      var container = document.getElementById("v-cuadros");
      if (!container || !state.bracket) return;
      decorateMatches(container, state.bracket, true, courts(), function () {
        if (typeof markDirty === "function") markDirty();
        window.renderCuadros();
      });
      var plan = buildPlanPanel(state.bracket, courts(), true, function () {
        ensureBracketSchedule(state.bracket, courts(), true);
        if (typeof markDirty === "function") markDirty();
        window.renderCuadros();
      });
      container.insertBefore(plan, container.firstChild);
    };
    window.renderCuadros();
  }

  function installPublicEnhancement() {
    var original = window.renderCuadros;
    if (typeof original !== "function") return;
    window.renderCuadros = function () {
      if (DATA && DATA.bracket) ensureBracketSchedule(DATA.bracket, courts(), false);
      original();
      var container = document.getElementById("v-cuadros");
      if (!container || !DATA || !DATA.bracket) return;
      decorateMatches(container, DATA.bracket, false, courts(), function () {});
      container.insertBefore(buildPlanPanel(DATA.bracket, courts(), false, function () {}), container.firstChild);
    };
    window.renderCuadros();
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports.bracketScheduleRefs = bracketScheduleRefs;
    module.exports.ensureBracketSchedule = ensureBracketSchedule;
    module.exports.roundIsPlayable = roundIsPlayable;
  }

  if (typeof document === "undefined") return;
  document.addEventListener("DOMContentLoaded", function () {
    injectBracketStyles();
    if (document.getElementById("v-inscripcion")) installAdminEnhancement();
    else installPublicEnhancement();
  });
}());

