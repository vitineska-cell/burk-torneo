"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const torneo = require("../torneo.js");

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

function play(match, a, b, s1, s2) {
  match.aId = a.id;
  match.bId = b.id;
  match.s1 = String(s1);
  match.s2 = String(s2);
}

function finishQuarterfinals(br) {
  br.qf.forEach((match, index) => {
    assert.ok(match.a && match.b, "El QF" + (index + 1) + " debe tener dos participantes");
    play(match, match.a, match.b, 11, 7);
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

function testThirdPlaceProgression() {
  const bracket = newBracket(8);
  const br = bracket.main;
  assert.equal(br.third.length, 1);
  assert.deepEqual(br.third[0], torneo.emptyBracketMatch());

  finishQuarterfinals(br);
  let derived = torneo.bracketDerived(br);
  play(br.sf[0], derived.sfPairs[0][0], derived.sfPairs[0][1], 11, 6);
  play(br.sf[1], derived.sfPairs[1][0], derived.sfPairs[1][1], 8, 11);

  derived = torneo.bracketDerived(br);
  assert.equal(derived.sfL[0].id, derived.sfPairs[0][1].id);
  assert.equal(derived.sfL[1].id, derived.sfPairs[1][0].id);

  play(br.f[0], derived.sfW[0], derived.sfW[1], 11, 9);
  play(br.third[0], derived.sfL[0], derived.sfL[1], 12, 10);
  derived = torneo.bracketDerived(br);

  assert.equal(derived.champ.id, derived.sfW[0].id);
  assert.equal(derived.runnerUp.id, derived.sfW[1].id);
  assert.equal(derived.thirdPlace.id, derived.sfL[0].id);
  assert.equal(derived.fourthPlace.id, derived.sfL[1].id);

  br.sf[0].s1 = "5";
  br.sf[0].s2 = "11";
  derived = torneo.bracketDerived(br);
  assert.equal(derived.thirdPlace, null, "Un cambio de semifinal debe invalidar el resultado obsoleto del 3.º/4.º");
  assert.equal(derived.fourthPlace, null);
}

function testScheduleAndMigration() {
  const bracket = newBracket(8);
  assert.equal(torneo.ensureBracketSchedule(bracket, 5, true), true);
  const refs = torneo.bracketScheduleRefs(bracket);
  assert.equal(refs.length, 16, "Deben programarse 8 QF, 4 SF, 2 finales y 2 partidos de 3.º/4.º");
  assert.equal(bracket.main.third[0].slot, 4);
  assert.equal(bracket.main.third[0].court, 3);
  assert.equal(bracket.cons.third[0].slot, 4);
  assert.equal(bracket.cons.third[0].court, 4);
  assertNoScheduleCollisions(bracket);

  bracket.main.qf[0].slot = 9;
  bracket.main.qf[0].court = 5;
  bracket.main.f[0].slot = 4;
  bracket.main.f[0].court = 3;
  bracket.cons.f[0].slot = 4;
  bracket.cons.f[0].court = 4;
  delete bracket.main.third;
  delete bracket.cons.third;

  assert.equal(torneo.ensureBracketSchedule(bracket, 5, false), true);
  assert.equal(bracket.main.qf[0].slot, 9, "La tanda manual existente debe conservarse");
  assert.equal(bracket.main.qf[0].court, 5, "La pista manual existente debe conservarse");
  assert.equal(bracket.main.f[0].court, 3, "La pista manual de la final debe conservarse");
  assert.equal(bracket.cons.f[0].court, 4, "La pista manual de la final de consolación debe conservarse");
  assert.equal(bracket.main.third[0].court, 1, "El nuevo partido debe usar una pista libre");
  assert.equal(bracket.cons.third[0].court, 2, "El nuevo partido debe usar otra pista libre");
  assertNoScheduleCollisions(bracket);
}

function testByesDoNotInventThirdPlaceMatch() {
  const bracket = newBracket(2);
  torneo.ensureBracketSchedule(bracket, 5, true);
  const consRefs = torneo.bracketScheduleRefs(bracket).filter((ref) => ref.draw === "cons");
  assert.deepEqual(consRefs.map((ref) => ref.round), ["f"]);
  assert.equal(torneo.roundIsPlayable(bracket.cons, "third", 0), false);
}

function testEstimatorIncludesBothNewMatches() {
  const estimate = torneo.estimateTournament(25, 5, 15, 15);
  assert.equal(estimate.koMatches, 16);
  assert.equal(estimate.totalMatches, 66);
  assert.equal(estimate.koTandas, 4);
  assert.equal(estimate.minutes, 225);
}

function testEverySupportedSizeAndCourtCount() {
  for (let pairCount = 10; pairCount <= 25; pairCount++) {
    const consCount = Math.min(8, pairCount - 8);
    const expectedThirdMatches = 1 + (torneo.consRoundMatches(consCount).third ? 1 : 0);
    for (let courts = 1; courts <= 5; courts++) {
      const bracket = newBracket(consCount);
      torneo.ensureBracketSchedule(bracket, courts, true);
      const refs = torneo.bracketScheduleRefs(bracket);
      assert.equal(
        refs.filter((ref) => ref.round === "third").length,
        expectedThirdMatches,
        pairCount + " parejas y " + courts + " pistas: partidos de 3.º/4.º"
      );
      refs.forEach((ref) => {
        assert.ok(ref.match.court >= 1 && ref.match.court <= courts);
        assert.ok(ref.match.slot >= 1);
      });
      assertNoScheduleCollisions(bracket);

      const maxQf = Math.max(...refs.filter((ref) => ref.round === "qf").map((ref) => ref.match.slot));
      const minSf = Math.min(...refs.filter((ref) => ref.round === "sf").map((ref) => ref.match.slot));
      const maxSf = Math.max(...refs.filter((ref) => ref.round === "sf").map((ref) => ref.match.slot));
      const minPodium = Math.min(...refs.filter((ref) => ref.round === "f" || ref.round === "third").map((ref) => ref.match.slot));
      assert.ok(minSf > maxQf, pairCount + " parejas: las semifinales deben ir después de cuartos");
      assert.ok(minPodium > maxSf, pairCount + " parejas: final y 3.º/4.º deben ir después de semifinales");
    }
  }
}

function testInlineScriptsCompile() {
  ["admin.html", "index.html", "embed.html"].forEach((filename) => {
    const html = fs.readFileSync(path.join(__dirname, "..", filename), "utf8");
    const scripts = Array.from(html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi));
    scripts.forEach((match) => new Function(match[1]));
  });
}

testThirdPlaceProgression();
testScheduleAndMigration();
testByesDoNotInventThirdPlaceMatch();
testEstimatorIncludesBothNewMatches();
testEverySupportedSizeAndCourtCount();
testInlineScriptsCompile();

console.log("OK · cuadros, 3.º/4.º puesto, migración, pistas, byes, estimador y vistas");
