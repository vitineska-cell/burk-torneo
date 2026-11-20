// Componentes comunes al panel, al visor público y al iframe de WordPress.
function categoryNav(selected) {
  return categoryNames.map(name => '<button type="button" class="tab ' + (selected === name ? 'tab-on' : '') +
    '" data-category="' + name + '" aria-pressed="' + (selected === name) + '">' + name + '</button>').join("");
}

function groupTables(view, editable) {
  return Object.entries(view.tables).map(([group, table]) => {
    const title = 'Grupo ' + group;
    const rows = table.rows.map((row, index) => '<tr><td>' + (index + 1) + '</td><td>' +
      escHtml(row.slot + ' · ' + pairName(row.pair)) + '</td><td>' + row.pj + '</td><td>' + row.w +
      '</td><td>' + row.pf + '</td><td>' + row.pc + '</td><td>' + fmtDiff(row.diff) + '</td></tr>').join('');
    const tie = table.blocks.some(block => block.length > 1);
    const action = editable && table.complete && !table.confirmed
      ? '<div class="gen-box"><button class="btn" data-confirm="' + group + '">' +
        (tie ? 'Sortear el empate y confirmar puestos' : 'Confirmar puestos') + '</button></div>' : '';
    return '<div class="panel"><div class="panel-head">' + title + '<span class="rest">' +
      (table.confirmed ? 'Puestos confirmados' : 'Clasificación provisional') + '</span></div>' +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>#</th><th>Pareja</th><th>PJ</th><th>PG</th>' +
      '<th>PF</th><th>PC</th><th>DIF</th></tr></thead><tbody>' + rows + '</tbody></table></div>' + action + '</div>';
  }).join('');
}

function scoreCard(game, editable) {
  const {match, a, b, status, winner} = game;
  const rules = matchRules(match);
  const fields = (pair, source, key) => {
    const cells = status.sets.map((set, i) => {
      if (!editable) return '<span class="bk-score">' + (escHtml(set[key]) || '–') + '</span>';
      return '<input class="score-in" type="number" inputmode="numeric" min="0" max="21" step="1" ' +
        'aria-label="' + escHtml(match.id + ' · ' + source + ' · set ' + (i + 1)) +
        '" data-field="' + key + '" data-set="' + i + '" value="' + escHtml(set[key]) + '"' + (a && b ? '' : ' disabled') + '>';
    }).join('');
    return '<div class="bk-row' + (winner && pair === winner ? ' bk-win' : '') + '"><span class="bk-name">' +
      escHtml(pair ? pairName(pair) : source) + '</span><span class="bk-score-cells">' + cells + '</span></div>';
  };
  return '<div class="panel" data-match="' + match.id + '"><div class="panel-head">' +
    match.start + '–' + match.end + ' · Pista ' + match.court + '<span class="rest">' + match.id + ' · ' + match.stage +
    '</span></div><div class="bk-rule">' + (rules.bestOf === 1 ? '1 set a 21' : 'Mejor de 3 sets a 21') +
    ' · punto de oro en 20–20</div>' + fields(a, match.a, "s1") + fields(b, match.b, "s2") +
    (editable && a && b ? '<div class="gen-box"><button class="btn" data-save="' + match.id +
      '">Guardar marcador</button></div>' : '') + '</div>';
}

function scheduleHTML(view, category, filter, editable) {
  return fixturesFor(category).filter(filter).map(match => scoreCard(view.matches.get(match.id), editable)).join("");
}

function pendingDraw() {
  return '<div class="panel"><div class="empty">Pendiente del sorteo de grupos de esta modalidad.</div></div>';
}

function registeredPlayers(state) {
  const names = categoryNames.flatMap(name => state.categories[name].pairs.flatMap(pair => [pair.p1.trim(), pair.p2.trim()]));
  return [...new Set(names.filter(Boolean))];
}
