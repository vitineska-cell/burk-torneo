"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.join(__dirname, "..");
const scripts = ["torneo.js", "calendario-almanzor.js", "almanzor.js"].map(f => fs.readFileSync(path.join(root, f), "utf8"));
const api = vm.runInThisContext("(function(){" + scripts.join("\n") +
  "\nreturn {FIXTURES,GROUP_SLOTS,checkEvent,checkRoster,importPairs,drawDivision,competition,confirmGroup,withScore,rankBlocks,isGroup,matchRules};})()");
const {FIXTURES, GROUP_SLOTS, checkEvent, checkRoster, importPairs, drawDivision, competition, confirmGroup, withScore, rankBlocks, isGroup, matchRules} = api;
const data = checkEvent(JSON.parse(fs.readFileSync(path.join(root, "datos-almanzor-2026.json"))));
const expected = {Mixto:[13,15,28], Masculino:[13,15,32], Femenino:[5,10,13]};
for (const name of Object.keys(expected)) data.categories[name] = {pairs:[],groups:null,confirmed:{},results:{}};
const seed = structuredClone(data);
const roster = {eventId:data.eventId, categories:{}};
for (const [name, [n]] of Object.entries(expected)) {
  roster.categories[name] = Array.from({length:n}, (_, i) => ({id:"p"+i, p1:name+" A"+i, p2:name+" B"+i}));
}
assert.throws(() => checkEvent(JSON.parse(fs.readFileSync(path.join(root, "datos.json")))));
assert.throws(() => checkRoster(roster.categories.Mixto.slice(1), "Mixto", true));
assert.throws(() => checkRoster(Array(13).fill(roster.categories.Mixto[0]), "Mixto", true));
assert.throws(() => importPairs(data, {...roster, categories:{...roster.categories, Femenino:[]}}));
assert.deepEqual(data, seed, "La importación fallida debe ser atómica");
importPairs(data, roster);
assert.equal(FIXTURES.length, 73);
assert.equal(new Set(FIXTURES.map(m => m.id)).size, 73);
const minutes = value => value.split(":").reduce((h,m) => Number(h)*60+Number(m), 0);
for (const [i, game] of FIXTURES.entries()) {
  assert.ok(game.court >= 1 && game.court <= 7);
  assert.ok(minutes(game.end) > minutes(game.start));
  for (const prior of FIXTURES.slice(0,i).filter(m => m.court === game.court)) {
    assert.ok(minutes(prior.end) <= minutes(game.start), game.id+" colisión de pista con "+prior.id);
  }
}
for (let trial=0; trial<12; trial++) {
  for (const [category, [count, groupCount, total]] of Object.entries(expected)) {
    let division = structuredClone(data.categories[category]);
    const size = GROUP_SLOTS[category];
    assert.deepEqual(Object.values(size).map(slots => slots.length), category === "Femenino" ? [5] : [4,3,3,3]);
    drawDivision(division, category);
    assert.deepEqual(new Set(Object.values(division.groups)), new Set(division.pairs.map(p => p.id)));
    assert.equal(Object.keys(division.groups).length, count);
    const games = FIXTURES.filter(m => m.category === category);
    assert.equal(games.length, total);
    assert.equal(games.filter(isGroup).length, groupCount);
    const roundRobin = new Set(games.filter(isGroup).map(m => [m.a,m.b].sort().join(":")));
    for (const slots of Object.values(size)) {
      for (const [i,a] of slots.entries()) for (const b of slots.slice(i+1)) assert.ok(roundRobin.has([a,b].sort().join(":")));
    }
    let confirmed = false;
    const appearances = new Map(division.pairs.map(p => [p.id,[]]));
    for (const game of games) {
      if (!isGroup(game) && !confirmed) {
        for (const group of Object.keys(size)) confirmGroup(division, category, group);
        confirmed = true;
      }
      const match = competition(division, category).matches.get(game.id);
      assert.ok(match.a && match.b && match.a !== match.b, game.id+" pendiente");
      for (const p of [match.a,match.b]) {
        const history = appearances.get(p.id);
        if (history.length) assert.ok(minutes(game.start)-minutes(history.at(-1).end)>=10, game.id+" descanso insuficiente");
        history.push(game);
      }
      const firstWins = (trial + Number(game.id.slice(2))) % 3 !== 0;
      const point = firstWins ? {s1:"21",s2:"20"} : {s1:"20",s2:"21"};
      const sets = matchRules(game).bestOf === 1 ? [point] :
        [point, {s1:point.s2,s2:point.s1}, point];
      if (game === games[0]) {
        for (const invalid of [[22,20],[20,20],[20,19],[15,9],[-1,21]]) {
          assert.throws(() => withScore(division,category,game.id,[{s1:invalid[0],s2:invalid[1]}]));
        }
      }
      division = withScore(division, category, game.id, sets).next;
    }
    const view = competition(division,category);
    assert.equal([...view.matches.values()].filter(g => g.winner).length, total);
    const final = games.find(m => m.stage === "Final");
    const semi = games.find(m => m.stage === "Semifinal 1");
    const oldSemi = view.matches.get(semi.id);
    const opposite = oldSemi.winner === oldSemi.a ? {s1:"19",s2:"21"} : {s1:"21",s2:"19"};
    const changed = withScore(division,category,semi.id,[opposite,opposite,{s1:"",s2:""}]);
    assert.ok(changed.removed.includes(final.id));
    assert.equal(changed.removed.length, category === "Femenino" ? 1 : 2);
    assert.throws(() => withScore(division,category,semi.id,[opposite,opposite,opposite]));
    assert.ok([...appearances.values()].every(games => games.length >= 4 && games.length <= 6));
    if (category === "Femenino") {
      assert.deepEqual([...appearances.values()].map(a => a.length).sort(),[4,5,5,6,6]);
    }
  }
}
const a = {id:"a",w:2,diff:3,pf:86}, b={id:"b",w:2,diff:3,pf:90}, c={id:"c",w:2,diff:0,pf:92};
assert.deepEqual(rankBlocks([b,c,a], new Map([["a:b","a"]])),[[a],[b],[c]]);
assert.deepEqual(rankBlocks([b,c,a].map(row => ({...row,diff:0,pf:90})),new Map()).map(g=>g.length),[3]);
console.log("OK · 73 partidos, tres modalidades, 12 torneos completos, descansos, desempates y correcciones");
