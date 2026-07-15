"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const torneo = require("../torneo.js");

const root = path.join(__dirname, "..");
const published = JSON.parse(fs.readFileSync(path.join(root, "datos.json"), "utf8"));

function seeds(count, prefix) {
  const list = [];
  for (let i = 0; i < count; i++) {
    list.push({
      id: prefix + (i + 1),
      name: "Pareja " + prefix.toUpperCase() + (i + 1),
      group: i % 5,
      letter: String.fromCharCode(65 + (i % 5))
    });
  }
  while (list.length < 8) list.push(null);
  return list;
}

function newBracket(consCount) {
  return torneo.makeBracket({
    main: seeds(8, "m"),
    seedsCons: seeds(consCount, "c")
  });
}

function play(match, a, b, scores, format) {
  match.aId = a.id;
  match.bId = b.id;
  match.sets = format.targets.map((_, index) => ({
    s1: scores[index] ? String(scores[index][0]) : "",
    s2: scores[index] ? String(scores[index][1]) : ""
  }));
  const status = torneo.matchScoreStatus(match, format);
  assert.equal(status.valid, true, status.message);
  assert.equal(status.complete, true, "El partido de prueba debe quedar completado");
}

function finishQuarterfinals(br) {
  br.qf.forEach((match, index) => {
    assert.ok(match.a && match.b, "El QF" + (index + 1) + " debe tener dos participantes");
    play(match, match.a, match.b, index === 0 ? [[26, 24]] : [[15, 7]], torneo.SINGLE_SET_15);
  });
}

function fillGroupResults(state) {
  state.results = {};
  torneo.groupMatchList(state).forEach((match) => {
    state.results[match.key] = match.i < match.j ? { s1: "15", s2: "7" } : { s1: "7", s2: "15" };
  });
}

function assertNoScheduleCollisions(bracket) {
  const occupied = new Set();
  torneo.bracketScheduleRefs(bracket).forEach((ref) => {
    const key = ref.match.slot + ":" + ref.match.court;
    assert.equal(occupied.has(key), false, "Pista duplicada en " + key);
    occupied.add(key);
  });
}

function testScoreValidation() {
  const valid15 = [[15, 0], [15, 13], [16, 14], [26, 24], [24, 26]];
  valid15.forEach(([s1, s2]) => {
    const status = torneo.setScoreStatus({ s1, s2 }, 15);
    assert.equal(status.valid && status.complete, true, s1 + "-" + s2 + " debe ser válido a 15");
  });

  const invalid15 = [[14, 12], [15, 14], [16, 13], [26, 23], [15, 15], [-1, 15], [15.5, 13]];
  invalid15.forEach(([s1, s2]) => {
    assert.equal(torneo.setScoreStatus({ s1, s2 }, 15).valid, false, s1 + "-" + s2 + " debe rechazarse a 15");
  });

  const valid11 = [[11, 0], [11, 9], [12, 10], [26, 24]];
  valid11.forEach(([s1, s2]) => {
    const status = torneo.setScoreStatus({ s1, s2 }, 11);
    assert.equal(status.valid && status.complete, true, s1 + "-" + s2 + " debe ser válido a 11");
  });
  [[10, 8], [11, 10], [12, 9], [26, 23]].forEach(([s1, s2]) => {
    assert.equal(torneo.setScoreStatus({ s1, s2 }, 11).valid, false, s1 + "-" + s2 + " debe rechazarse a 11");
  });

  assert.equal(torneo.isPlayed({ s1: "26", s2: "24" }), true);
  assert.equal(torneo.isPlayed({ s1: "15", s2: "14" }), false);
  assert.equal(torneo.scoreValueIsValid("260"), true);
  assert.equal(torneo.scoreValueIsValid("-1"), false);
  assert.equal(torneo.scoreValueIsValid("1.5"), false);
  assert.equal(torneo.scoreValueIsValid("999999999999999999999"), false);
}

function testMatchFormats() {
  assert.deepEqual(torneo.matchFormat("main", "qf").targets, [15]);
  ["sf", "f", "third"].forEach((round) => {
    assert.deepEqual(torneo.matchFormat("main", round).targets, [15, 15, 11]);
    assert.equal(torneo.matchFormat("main", round).bestOf, 3);
  });
  ["qf", "sf", "f", "third"].forEach((round) => {
    assert.deepEqual(torneo.matchFormat("cons", round).targets, [15]);
    assert.equal(torneo.matchFormat("cons", round).bestOf, 1);
  });

  const straight = torneo.emptyBracketMatch(torneo.BEST_OF_3_15_15_11);
  play(straight, { id: "a" }, { id: "b" }, [[15, 8], [26, 24]], torneo.BEST_OF_3_15_15_11);
  assert.equal(torneo.matchScoreStatus(straight, torneo.BEST_OF_3_15_15_11).winner, 1);
  assert.equal(torneo.scoreSetIsEnabled(straight, torneo.BEST_OF_3_15_15_11, 2), false);

  const threeSets = torneo.emptyBracketMatch(torneo.BEST_OF_3_15_15_11);
  play(threeSets, { id: "a" }, { id: "b" }, [[15, 13], [12, 15], [26, 24]], torneo.BEST_OF_3_15_15_11);
  assert.equal(torneo.matchScoreStatus(threeSets, torneo.BEST_OF_3_15_15_11).winner, 1);
  assert.equal(torneo.formatMatchScore(threeSets, torneo.BEST_OF_3_15_15_11), "15-13 · 12-15 · 26-24");

  const unnecessaryThird = JSON.parse(JSON.stringify(straight));
  unnecessaryThird.sets[2] = { s1: "11", s2: "5" };
  assert.equal(torneo.matchScoreStatus(unnecessaryThird, torneo.BEST_OF_3_15_15_11).valid, false);
  torneo.pruneUnusedSets(unnecessaryThird, torneo.BEST_OF_3_15_15_11);
  assert.deepEqual(unnecessaryThird.sets[2], { s1: "", s2: "" });
}

function testPublishedPairsGroupsAndQualification() {
  assert.equal(published.schemaVersion, torneo.SCORE_SCHEMA_VERSION);
  assert.equal(published.pairs.length, 25);
  assert.deepEqual(published.groups.map((group) => group.length), [5, 5, 5, 5, 5]);
  assert.equal(new Set(published.groups.flat()).size, 25);
  assert.deepEqual(new Set(published.groups.flat()), new Set(published.pairs.map((pair) => pair.id)));
  assert.deepEqual(torneo.computeFormat(25), { sizes: [5, 5, 5, 5, 5], groups: 5 });

  const schedule = torneo.scheduleFor(5);
  const pairings = schedule.flatMap((round) => round.pairs);
  assert.equal(schedule.length, 5);
  assert.equal(pairings.length, 10);
  assert.equal(new Set(pairings.map((pair) => pair.slice().sort((a, b) => a - b).join("-"))).size, 10);
  for (let team = 0; team < 5; team++) {
    assert.equal(pairings.filter((pair) => pair.includes(team)).length, 4);
  }

  assert.equal(torneo.groupMatchList(published).length, 50);
  assert.equal(torneo.groupStageComplete(published), false);
  const state = JSON.parse(JSON.stringify(published));
  fillGroupResults(state);
  assert.equal(torneo.playedCount(state), 50);
  assert.equal(torneo.groupStageComplete(state), true);

  const qualification = torneo.computeQualification(state);
  assert.deepEqual(qualification.main.map((team) => team.pos).sort((a, b) => a - b), [0, 0, 0, 0, 0, 1, 1, 1]);
  assert.deepEqual(qualification.cons.map((team) => team.pos).sort((a, b) => a - b), [1, 1, 2, 2, 2, 2, 2, 3]);

  function lcg(seed) {
    let value = seed >>> 0;
    return () => ((value = (1664525 * value + 1013904223) >>> 0) / 2 ** 32);
  }
  for (let seed = 1; seed <= 100; seed++) {
    const groups = torneo.drawGroups({ pairs: published.pairs }, lcg(seed));
    assert.deepEqual(groups.map((group) => group.length), [5, 5, 5, 5, 5]);
    assert.equal(new Set(groups.flat()).size, 25);
  }
}

function testFullTournamentProgression() {
  const state = JSON.parse(JSON.stringify(published));
  fillGroupResults(state);
  const bracket = torneo.makeBracket(torneo.computeQualification(state));
  torneo.ensureBracketSchedule(bracket, 5, true);
  assert.equal(torneo.bracketScheduleRefs(bracket).length, 16);
  assertNoScheduleCollisions(bracket);

  finishQuarterfinals(bracket.main);
  finishQuarterfinals(bracket.cons);
  let main = torneo.bracketDerived(bracket.main, "main");
  let cons = torneo.bracketDerived(bracket.cons, "cons");

  play(bracket.main.sf[0], main.sfPairs[0][0], main.sfPairs[0][1], [[15, 8], [26, 24]], torneo.BEST_OF_3_15_15_11);
  play(bracket.main.sf[1], main.sfPairs[1][0], main.sfPairs[1][1], [[13, 15], [15, 9], [11, 7]], torneo.BEST_OF_3_15_15_11);
  play(bracket.cons.sf[0], cons.sfPairs[0][0], cons.sfPairs[0][1], [[15, 13]], torneo.SINGLE_SET_15);
  play(bracket.cons.sf[1], cons.sfPairs[1][0], cons.sfPairs[1][1], [[24, 26]], torneo.SINGLE_SET_15);

  main = torneo.bracketDerived(bracket.main, "main");
  cons = torneo.bracketDerived(bracket.cons, "cons");
  assert.ok(main.sfW[0] && main.sfW[1] && main.sfL[0] && main.sfL[1]);
  assert.ok(cons.sfW[0] && cons.sfW[1] && cons.sfL[0] && cons.sfL[1]);

  play(bracket.main.f[0], main.sfW[0], main.sfW[1], [[15, 10], [14, 16], [26, 24]], torneo.BEST_OF_3_15_15_11);
  play(bracket.main.third[0], main.sfL[0], main.sfL[1], [[15, 7], [15, 13]], torneo.BEST_OF_3_15_15_11);
  play(bracket.cons.f[0], cons.sfW[0], cons.sfW[1], [[15, 8]], torneo.SINGLE_SET_15);
  play(bracket.cons.third[0], cons.sfL[0], cons.sfL[1], [[16, 14]], torneo.SINGLE_SET_15);

  main = torneo.bracketDerived(bracket.main, "main");
  cons = torneo.bracketDerived(bracket.cons, "cons");
  assert.ok(main.champ && main.runnerUp && main.thirdPlace && main.fourthPlace);
  assert.ok(cons.champ && cons.runnerUp && cons.thirdPlace && cons.fourthPlace);

  bracket.main.sf[0].sets[0] = { s1: "8", s2: "15" };
  main = torneo.bracketDerived(bracket.main, "main");
  assert.equal(main.sfW[0], null, "Cambiar una semifinal debe invalidar la final anterior");
  assert.equal(main.champ, null);
  assert.equal(main.thirdPlace, null);
}

function testMigrationPreservesPublishedStructure() {
  const state = JSON.parse(JSON.stringify(published));
  fillGroupResults(state);
  state.bracket = torneo.makeBracket(torneo.computeQualification(state));
  const pairsBefore = JSON.stringify(state.pairs);
  const groupsBefore = JSON.stringify(state.groups);
  delete state.schemaVersion;

  const legacyQf = state.bracket.main.qf[0];
  legacyQf.s1 = "26";
  legacyQf.s2 = "24";
  legacyQf.aId = legacyQf.a.id;
  legacyQf.bId = legacyQf.b.id;
  legacyQf.slot = 7;
  legacyQf.court = 4;
  delete legacyQf.sets;

  const legacySf = state.bracket.main.sf[0];
  legacySf.s1 = "15";
  legacySf.s2 = "7";
  delete legacySf.sets;

  assert.equal(torneo.migrateTournamentState(state), true);
  assert.equal(state.schemaVersion, torneo.SCORE_SCHEMA_VERSION);
  assert.equal(JSON.stringify(state.pairs), pairsBefore);
  assert.equal(JSON.stringify(state.groups), groupsBefore);
  assert.equal(state.bracket.main.qf[0].sets.length, 1);
  assert.deepEqual(state.bracket.main.qf[0].sets[0], { s1: "26", s2: "24" });
  assert.equal(state.bracket.main.qf[0].slot, 7);
  assert.equal(state.bracket.main.qf[0].court, 4);
  assert.equal(state.bracket.main.sf[0].sets.length, 3);
  assert.equal(state.bracket.cons.sf[0].sets.length, 1);
  assert.equal("s1" in state.bracket.main.qf[0], false);
  assert.equal(torneo.migrateTournamentState(state), false, "La migración debe ser idempotente");
}

function testScheduleByesAndEstimator() {
  const bracket = newBracket(2);
  torneo.ensureBracketSchedule(bracket, 5, true);
  const consRefs = torneo.bracketScheduleRefs(bracket).filter((ref) => ref.draw === "cons");
  assert.deepEqual(consRefs.map((ref) => ref.round), ["f"]);
  assert.equal(torneo.roundIsPlayable(bracket.cons, "third", 0), false);

  const estimate = torneo.estimateTournament(25, 5, 15, 15);
  assert.equal(estimate.groupMatches, 50);
  assert.equal(estimate.koMatches, 16);
  assert.equal(estimate.totalMatches, 66);
  assert.equal(estimate.koTandas, 4);
  assert.equal(estimate.koSlotUnits, 8);
  assert.equal(estimate.minutes, 285);

  for (let pairCount = 10; pairCount <= 25; pairCount++) {
    const consCount = Math.min(8, pairCount - 8);
    for (let courts = 1; courts <= 5; courts++) {
      const current = newBracket(consCount);
      torneo.ensureBracketSchedule(current, courts, true);
      torneo.bracketScheduleRefs(current).forEach((ref) => {
        assert.ok(ref.match.court >= 1 && ref.match.court <= courts);
        assert.ok(ref.match.slot >= 1);
      });
      assertNoScheduleCollisions(current);
    }
  }
}

function testViewsAndConnectionCodeCompile() {
  ["admin.html", "index.html", "embed.html"].forEach((filename) => {
    const html = fs.readFileSync(path.join(root, filename), "utf8");
    const scripts = Array.from(html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi));
    scripts.forEach((match) => new Function(match[1]));
  });
  const admin = fs.readFileSync(path.join(root, "admin.html"), "utf8");
  const publicView = fs.readFileSync(path.join(root, "index.html"), "utf8");
  assert.match(admin, /function apiGet\(cfg\)/);
  assert.match(admin, /method:"PUT"/);
  assert.match(admin, /data-set=/);
  assert.match(admin, /No se pueden generar los cuadros hasta completar/);
  assert.match(publicView, /Clasificación provisional/);
  assert.doesNotMatch(admin, /partidos a 11 puntos/);
}

testScoreValidation();
testMatchFormats();
testPublishedPairsGroupsAndQualification();
testFullTournamentProgression();
testMigrationPreservesPublishedStructure();
testScheduleByesAndEstimator();
testViewsAndConnectionCodeCompile();

console.log("OK · 25 parejas, grupos, clasificación, formatos 15/15/11, rally score, migración, cuadros, pistas y vistas");
