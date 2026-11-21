// Reglas del cuadrante. Las inscripciones tienen identificadores estables y el
// sorteo las asigna a códigos de pista (XA1, MA1, F1…) de forma independiente.
const categoryNames = Object.keys(GROUP_SLOTS);
const fixturesFor = category => FIXTURES.filter(match => match.category === category);
const isGroup = match => match.stage.startsWith("Grupo ");
const matchRules = match => /^(Semifinal|Final$)/.test(match.stage)
  ? {bestOf: 3, goldenPoint: true, targets: [15, 15, 15]}
  : {bestOf: 1, targets: [21]};
const groupOf = match => match.stage.split(" · ")[0].slice(6);
const targetSize = category => Object.values(GROUP_SLOTS[category]).flat().length;

function checkRoster(pairs, category, complete) {
  if (!Array.isArray(pairs) || pairs.length > targetSize(category) ||
      (complete && pairs.length !== targetSize(category))) {
    throw Error(category + " requiere " + targetSize(category) + " parejas para el sorteo.");
  }
  const ids = new Set();
  const players = new Set();
  for (const pair of pairs) {
    if (!pair || typeof pair.id !== "string" || !/^[a-z0-9_-]+$/i.test(pair.id) || ids.has(pair.id)) {
      throw Error("Identificador de pareja repetido o incorrecto en " + category + ".");
    }
    ids.add(pair.id);
    for (const field of ["p1", "p2"]) {
      if (typeof pair[field] !== "string") throw Error("Nombre de jugador incorrecto.");
      if (!complete) continue;
      const name = pair[field].trim().normalize("NFC").toLocaleLowerCase("es");
      if (!name || players.has(name)) throw Error("Revisa los nombres vacíos o repetidos en " + category + ".");
      players.add(name);
    }
  }
}

function checkEvent(data) {
  if (!data || data.eventId !== EVENT_ID || !data.meta || !Array.isArray(data.raffle?.winners)) {
    throw Error("El archivo no corresponde al torneo de Almanzor.");
  }
  for (const category of categoryNames) {
    const division = data.categories?.[category];
    if (!division || !division.results || !division.confirmed) throw Error("Falta la modalidad " + category);
    checkRoster(division.pairs, category, false);
    if (division.groups) {
      const slots = Object.values(GROUP_SLOTS[category]).flat();
      const ids = new Set(division.pairs.map(pair => pair.id));
      if (ids.size !== slots.length || new Set(Object.values(division.groups)).size !== slots.length ||
          !slots.every(slot => ids.has(division.groups[slot]))) throw Error("Sorteo incompleto en " + category);
    }
  }
  return data;
}

function drawDivision(division, category, random) {
  checkRoster(division.pairs, category, true);
  const slots = Object.values(GROUP_SLOTS[category]).flat();
  const pairs = shuffle(division.pairs, random);
  division.groups = Object.fromEntries(slots.map((slot, index) => [slot, pairs[index].id]));
  division.results = {};
  division.confirmed = {};
}

function importPairs(data, file) {
  if (file?.eventId !== EVENT_ID || !file.categories) throw Error("Selecciona el listado de Almanzor.");
  for (const category of categoryNames) {
    if (data.categories[category].groups) throw Error("La importación completa debe hacerse antes del primer sorteo.");
    checkRoster(file.categories[category], category, true);
  }
  for (const category of categoryNames) {
    data.categories[category].pairs = file.categories[category].map(({id, p1, p2}) => ({id, p1, p2}));
  }
}

// Devuelve bloques ordenados. Las parejas que siguen en un mismo bloque
// necesitan el sorteo de desempate previsto en la hoja Formato.
function rankBlocks(rows) {
  function rank(tied, criteria) {
    if (tied.length < 2) return [tied];
    if (!criteria.length) return [tied];
    const [field, ...next] = criteria;
    const values = [...new Set(tied.map(row => row[field]))].sort((a, b) => b - a);
    return values.flatMap(value => rank(tied.filter(row => row[field] === value), next));
  }
  return rank(rows, ["w", "diff", "pf"]);
}

function acceptedOrder(blocks, order) {
  if (!Array.isArray(order) || order.length !== blocks.flat().length || new Set(order).size !== order.length) return false;
  let offset = 0;
  return blocks.every(block => {
    const section = order.slice(offset, offset + block.length);
    offset += block.length;
    return block.every(row => section.includes(row.id));
  });
}

function readMatch(match, division, a, b) {
  const result = division.results[match.id];
  const score = a && b && result?.aId === a.id && result.bId === b.id ? result : null;
  const status = matchScoreStatus(score, matchRules(match));
  const winner = status.complete ? (status.winner === 1 ? a : b) : null;
  return {match, a, b, score, status, winner, loser: winner ? (winner === a ? b : a) : null};
}

function competition(division, category) {
  const fixtures = fixturesFor(category);
  const pairs = new Map(division.pairs.map(pair => [pair.id, pair]));
  const slotPair = slot => pairs.get(division.groups?.[slot]);
  const matches = new Map();
  const tables = {};
  for (const [group, slots] of Object.entries(GROUP_SLOTS[category])) {
    const rows = new Map();
    for (const slot of slots) {
      const pair = slotPair(slot);
      if (pair) rows.set(pair.id, {id: pair.id, pair, slot, pj: 0, w: 0, pf: 0, pc: 0, diff: 0});
    }
    let complete = true;
    for (const match of fixtures.filter(m => isGroup(m) && groupOf(m) === group)) {
      const game = readMatch(match, division, slotPair(match.a), slotPair(match.b));
      matches.set(match.id, game);
      if (!game.winner) { complete = false; continue; }
      const a = rows.get(game.a.id), b = rows.get(game.b.id);
      const {s1, s2} = game.status.sets[0];
      a.pj++; b.pj++; a.pf += Number(s1); b.pf += Number(s2);
      a.pc += Number(s2); b.pc += Number(s1);
      rows.get(game.winner.id).w++;
    }
    for (const row of rows.values()) row.diff = row.pf - row.pc;
    const blocks = rankBlocks([...rows.values()]);
    const order = division.confirmed[group];
    const confirmed = complete && acceptedOrder(blocks, order);
    tables[group] = {blocks, complete, confirmed, rows: confirmed ? order.map(id => rows.get(id)) : blocks.flat()};
  }

  function participant(source) {
    const rank = /^(\d+)\.º grupo (.+)$/.exec(source);
    if (rank) {
      const table = tables[rank[2]];
      return table.confirmed ? table.rows[Number(rank[1]) - 1].pair : null;
    }
    const [kind, previous] = source.split(" ");
    return matches.get(previous)?.[kind === "Gan." ? "winner" : "loser"];
  }
  for (const match of fixtures.filter(match => !isGroup(match))) {
    matches.set(match.id, readMatch(match, division, participant(match.a), participant(match.b)));
  }
  return {matches, tables};
}

function confirmGroup(division, category, group, random) {
  const table = competition(division, category).tables[group];
  if (!table?.complete || table.confirmed) throw Error("El grupo debe estar completo y pendiente de confirmación.");
  division.confirmed[group] = table.blocks.flatMap(block => shuffle(block, random).map(row => row.id));
}

// Ensaya la corrección en una copia. La mesa confirma antes de descartar actas
// posteriores cuyos rivales cambien. El resto de partidos conserva sus puntos.
function withScore(division, category, id, sets) {
  const previous = competition(division, category);
  const game = previous.matches.get(id);
  if (!game?.a || !game.b) throw Error("Faltan las parejas de este cruce.");
  const rules = matchRules(game.match);
  if (sets.length !== rules.bestOf) throw Error("Número de sets incorrecto.");
  const result = {aId: game.a.id, bId: game.b.id, sets};
  const status = matchScoreStatus(result, rules);
  const clear = !sets.some(scoreSetHasValue);
  if (!clear && !status.complete) throw Error(status.message || "Completa el marcador antes de guardarlo.");
  const next = {...division, confirmed: {...division.confirmed}, results: {...division.results}};
  if (clear) delete next.results[id];
  else next.results[id] = result;
  // Si la corrección introduce un empate absoluto nuevo, la mesa debe sortearlo.
  if (isGroup(game.match)) {
    const group = groupOf(game.match);
    if (next.confirmed[group]) {
      const tied = table => table.blocks.filter(b => b.length > 1).map(b => b.map(r => r.id).sort().join(":"));
      const before = tied(previous.tables[group]);
      const after = tied(competition(next, category).tables[group]);
      if (after.some(block => !before.includes(block))) delete next.confirmed[group];
    }
  }
  const updated = competition(next, category);
  for (const [group, table] of Object.entries(updated.tables)) {
    if (!table.confirmed) delete next.confirmed[group];
  }
  const removed = [];
  for (const [key, match] of updated.matches) {
    if (next.results[key] && !match.score) {
      removed.push(key);
      delete next.results[key];
    }
  }
  return {next, removed};
}
