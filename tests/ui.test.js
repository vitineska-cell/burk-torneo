"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { JSDOM, ResourceLoader, VirtualConsole } = require("jsdom");

const root = path.join(__dirname, "..");
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function waitFor(test, label, timeout = 5000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const value = test();
    if (value) return value;
    await wait(20);
  }
  throw new Error("Tiempo agotado esperando: " + label);
}

class LocalResources extends ResourceLoader {
  fetch(url, options) {
    if (url.startsWith("https://fonts.googleapis.com/")) return Promise.resolve(Buffer.from(""));
    return super.fetch(url, options);
  }
}

function createConsole(errors) {
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", (error) => errors.push("jsdomError: " + error.message));
  virtualConsole.on("error", (...args) => errors.push("console.error: " + args.join(" ")));
  return virtualConsole;
}

function browserFetch(win) {
  return (input, init) => {
    const raw = typeof input === "string" ? input : input.url;
    return fetch(new URL(raw, win.location.href), init);
  };
}

function change(win, input, value) {
  assert.ok(input, "No se encontró el campo que se quería editar");
  input.value = value;
  input.dispatchEvent(new win.Event("change", { bubbles: true }));
}

function query(win, selector) {
  return win.document.querySelector(selector);
}

function scoreSelector(draw, round, matchIndex, setIndex, field) {
  return `.bk-in[data-draw="${draw}"][data-round="${round}"][data-idx="${matchIndex}"]` +
    `[data-set="${setIndex}"][data-f="${field}"]`;
}

function enterSet(win, draw, round, matchIndex, setIndex, a, b, scoreA, scoreB) {
  assert.equal(
    win.setBracketScore(draw, round, matchIndex, setIndex, "s1", String(scoreA), a.id, b.id),
    true,
    win.lastScoreError
  );
  assert.equal(
    win.setBracketScore(draw, round, matchIndex, setIndex, "s2", String(scoreB), a.id, b.id),
    true,
    win.lastScoreError
  );
}

function enterMatch(win, draw, round, matchIndex, a, b, scores) {
  scores.forEach((score, setIndex) => {
    enterSet(win, draw, round, matchIndex, setIndex, a, b, score[0], score[1]);
  });
}

function contentType(filename) {
  if (filename.endsWith(".html")) return "text/html; charset=utf-8";
  if (filename.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (filename.endsWith(".json")) return "application/json; charset=utf-8";
  return "application/octet-stream";
}

function startServer() {
  const server = http.createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    const relative = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
    const filename = path.resolve(root, relative);
    if (!filename.startsWith(root + path.sep)) {
      response.writeHead(403).end("Forbidden");
      return;
    }
    fs.readFile(filename, (error, contents) => {
      if (error) {
        response.writeHead(error.code === "ENOENT" ? 404 : 500).end("Not found");
        return;
      }
      response.writeHead(200, { "content-type": contentType(filename) }).end(contents);
    });
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

async function run() {
  const server = await startServer();
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  let admin;
  let publicPage;
  let embedPage;
  let parentPage;

  try {
    const adminErrors = [];
    admin = await JSDOM.fromURL(baseUrl + "/admin.html", {
      runScripts: "dangerously",
      resources: new LocalResources(),
      pretendToBeVisual: true,
      virtualConsole: createConsole(adminErrors),
      beforeParse(win) {
        win.fetch = browserFetch(win);
        win.confirm = () => true;
        win.alert = () => {};
      }
    });
    const win = admin.window;
    await waitFor(() => win.document.readyState === "complete", "carga del panel");
    query(win, "#btn-load").click();
    await waitFor(() => win.state && win.state.pairs.length === 25, "datos publicados del panel");

    assert.equal(win.state.schemaVersion, 3);
    assert.deepEqual(Array.from(win.state.groups, (group) => group.length), [5, 5, 5, 5, 5]);
    assert.equal(win.groupMatchList(win.state).length, 50);

    query(win, '.tab[data-tab="resultados"]').click();
    const firstRow = query(win, ".match[data-key]");
    const firstKey = firstRow.dataset.key;
    change(win, firstRow.querySelector('[data-f="s1"]'), "15");
    change(win, firstRow.querySelector('[data-f="s2"]'), "14");
    assert.equal(win.state.results[firstKey].s2, "", "15-14 debía rechazarse");
    assert.match(query(win, "#toast").textContent, /2 puntos/);

    change(win, firstRow.querySelector('[data-f="s2"]'), "13");
    assert.equal(win.isPlayed(win.state.results[firstKey]), true, "15-13 debía aceptarse");
    change(win, firstRow.querySelector('[data-f="s2"]'), "");
    change(win, firstRow.querySelector('[data-f="s1"]'), "26");
    change(win, firstRow.querySelector('[data-f="s2"]'), "24");
    assert.equal(win.isPlayed(win.state.results[firstKey]), true, "26-24 debía aceptarse");

    assert.equal(query(win, "#btn-gen"), null, "No debe generarse un cuadro provisional");
    win.document.querySelectorAll(".match[data-key]").forEach((row) => {
      if (row.dataset.key === firstKey) return;
      change(win, row.querySelector('[data-f="s1"]'), "15");
      change(win, row.querySelector('[data-f="s2"]'), "13");
    });
    assert.equal(win.playedCount(win.state), 50);
    assert.equal(win.groupStageComplete(win.state), true);

    query(win, '.tab[data-tab="clasificados"]').click();
    assert.ok(query(win, "#btn-gen"), "El botón debe aparecer al completar los 50 partidos");
    query(win, "#btn-gen").click();
    assert.ok(win.state.bracket && win.state.bracket.main && win.state.bracket.cons);

    ["main", "cons"].forEach((draw) => {
      win.state.bracket[draw].qf.forEach((match, matchIndex) => {
        enterMatch(win, draw, "qf", matchIndex, match.a, match.b, [[15, 13]]);
      });
    });
    win.renderCuadros();

    assert.equal(win.document.querySelectorAll('.bk-in[data-draw="main"][data-round="sf"]').length, 12);
    assert.equal(win.document.querySelectorAll('.bk-in[data-draw="cons"][data-round="sf"]').length, 4);
    assert.equal(win.document.querySelectorAll('.bk-in[data-draw="main"][data-round="third"]').length, 6);
    assert.equal(win.document.querySelectorAll('.bk-in[data-draw="cons"][data-round="third"]').length, 2);
    assert.match(query(win, '.bk-in[data-draw="main"][data-round="third"]').closest(".bk-match").textContent, /S3 · 11/);

    assert.equal(query(win, scoreSelector("main", "sf", 0, 1, "s1")).disabled, true);
    change(win, query(win, scoreSelector("main", "sf", 0, 0, "s1")), "15");
    change(win, query(win, scoreSelector("main", "sf", 0, 0, "s2")), "13");
    assert.equal(query(win, scoreSelector("main", "sf", 0, 1, "s1")).disabled, false);
    change(win, query(win, scoreSelector("main", "sf", 0, 1, "s1")), "13");
    change(win, query(win, scoreSelector("main", "sf", 0, 1, "s2")), "15");
    assert.equal(query(win, scoreSelector("main", "sf", 0, 2, "s1")).disabled, false);

    change(win, query(win, scoreSelector("main", "sf", 0, 2, "s1")), "11");
    change(win, query(win, scoreSelector("main", "sf", 0, 2, "s2")), "10");
    assert.equal(win.state.bracket.main.sf[0].sets[2].s2, "", "11-10 debía rechazarse");
    change(win, query(win, scoreSelector("main", "sf", 0, 2, "s1")), "26");
    change(win, query(win, scoreSelector("main", "sf", 0, 2, "s2")), "24");
    assert.equal(win.matchScoreStatus(win.state.bracket.main.sf[0], win.matchFormat("main", "sf")).complete, true);

    let main = win.bracketDerived(win.state.bracket.main, "main");
    enterMatch(win, "main", "sf", 1, main.sfPairs[1][0], main.sfPairs[1][1], [[15, 7], [15, 9]]);
    main = win.bracketDerived(win.state.bracket.main, "main");
    enterMatch(win, "main", "f", 0, main.sfW[0], main.sfW[1], [[15, 13], [13, 15], [11, 9]]);
    enterMatch(win, "main", "third", 0, main.sfL[0], main.sfL[1], [[15, 8], [15, 10]]);

    let consolation = win.bracketDerived(win.state.bracket.cons, "cons");
    consolation.sfPairs.forEach((pair, matchIndex) => {
      enterMatch(win, "cons", "sf", matchIndex, pair[0], pair[1], [[15, 13]]);
    });
    consolation = win.bracketDerived(win.state.bracket.cons, "cons");
    enterMatch(win, "cons", "f", 0, consolation.sfW[0], consolation.sfW[1], [[15, 13]]);
    enterMatch(win, "cons", "third", 0, consolation.sfL[0], consolation.sfL[1], [[26, 24]]);
    win.renderCuadros();

    assert.ok(win.bracketDerived(win.state.bracket.main, "main").champ);
    assert.ok(win.bracketDerived(win.state.bracket.main, "main").thirdPlace);
    assert.ok(win.bracketDerived(win.state.bracket.cons, "cons").champ);
    assert.ok(win.bracketDerived(win.state.bracket.cons, "cons").thirdPlace);

    let apiGets = 0;
    let apiPuts = 0;
    let publishedPayload = null;
    win.localStorage.setItem(win.LS_CFG, JSON.stringify({
      owner: "vitineska-cell",
      repo: "burk-torneo",
      token: "test-token"
    }));
    win.fetch = async (input, init = {}) => {
      const url = String(input);
      if (url.includes("api.github.com/repos/")) {
        if ((init.method || "GET") === "GET") {
          apiGets++;
          const currentData = publishedPayload || JSON.parse(JSON.stringify(win.state));
          return new Response(JSON.stringify({
            sha: "sha-actual",
            content: Buffer.from(JSON.stringify(currentData), "utf8").toString("base64")
          }), {
            status: 200,
            headers: { "content-type": "application/json" }
          });
        }
        apiPuts++;
        const request = JSON.parse(init.body);
        publishedPayload = JSON.parse(Buffer.from(request.content, "base64").toString("utf8"));
        return new Response(JSON.stringify({ content: { sha: "sha-nuevo" } }), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      }
      return browserFetch(win)(input, init);
    };
    query(win, "#btn-pub").click();
    await waitFor(
      () => apiPuts === 1 && query(win, "#btn-pub").disabled === false,
      "publicación simulada"
    );
    assert.equal(apiGets, 1);
    assert.equal(apiPuts, 1);
    assert.equal(publishedPayload.schemaVersion, 3);
    assert.equal(publishedPayload.pairs.length, 25);
    assert.deepEqual(publishedPayload.groups, JSON.parse(JSON.stringify(win.state.groups)));
    assert.equal(win.dirty, false);
    assert.match(query(win, "#toast").textContent, /Publicado/);

    query(win, "#btn-load").click();
    await waitFor(
      () => apiGets === 2 && /Datos publicados cargados/.test(query(win, "#toast").textContent),
      "recarga desde la API simulada"
    );
    assert.equal(win.state.pairs.length, 25);
    assert.ok(win.bracketDerived(win.state.bracket.main, "main").champ);
    assert.match(query(win, "#toast").textContent, /Datos publicados cargados/);
    assert.deepEqual(adminErrors, []);

    const publicErrors = [];
    publicPage = await JSDOM.fromURL(baseUrl + "/index.html", {
      runScripts: "dangerously",
      resources: new LocalResources(),
      pretendToBeVisual: true,
      virtualConsole: createConsole(publicErrors),
      beforeParse(publicWindow) {
        publicWindow.fetch = browserFetch(publicWindow);
      }
    });
    const publicWindow = publicPage.window;
    await waitFor(
      () => publicWindow.DATA && publicWindow.DATA.pairs && publicWindow.DATA.pairs.length === 25,
      "datos de la web pública"
    );
    publicWindow.DATA = JSON.parse(JSON.stringify(win.state));
    publicWindow.migrateTournamentState(publicWindow.DATA);
    publicWindow.renderAll();

    const publicText = query(publicWindow, "#v-cuadros").textContent;
    assert.match(publicText, /Grupo Oro/);
    assert.match(publicText, /Grupo Consolación/);
    assert.match(publicText, /S3 · 11/);
    assert.match(publicText, /26/);
    assert.match(query(publicWindow, "#v-clas").textContent, /Clasificación final/);
    assert.match(query(publicWindow, "#champ-banner").textContent, /Campeones del torneo/);
    assert.deepEqual(publicErrors, []);

    const embedErrors = [];
    embedPage = await JSDOM.fromURL(baseUrl + "/embed.html", {
      runScripts: "dangerously",
      resources: new LocalResources(),
      pretendToBeVisual: true,
      virtualConsole: createConsole(embedErrors),
      beforeParse(embedWindow) {
        embedWindow.fetch = browserFetch(embedWindow);
      }
    });
    const embedWindow = embedPage.window;
    await waitFor(
      () => embedWindow.DATA && embedWindow.DATA.pairs && embedWindow.DATA.pairs.length === 25,
      "datos de la vista embebida"
    );
    assert.equal(embedWindow.groupMatchList(embedWindow.DATA).length, 50);
    assert.match(embedWindow.document.documentElement.textContent, /TORNEO NOCTURNO EN DIRECTO/);
    assert.ok(
      Array.from(embedWindow.document.querySelectorAll("style")).some((style) => style.textContent.includes("max-width:1400px")),
      "La vista embebida debe conservar el ancho especial de WordPress"
    );

    const heightMessages = [];
    embedWindow.postMessage = (data, targetOrigin) => heightMessages.push({ data, targetOrigin });
    const embedWrap = query(embedWindow, ".wrap");
    let measuredBottom = 3180;
    embedWrap.getBoundingClientRect = () => ({ bottom: measuredBottom });
    embedWindow.dispatchEvent(new embedWindow.Event("resize"));
    assert.equal(heightMessages[0].data.type, "burk-torneo:height");
    assert.equal(heightMessages[0].data.height, 3228);
    assert.equal(heightMessages[0].targetOrigin, "*");
    embedWindow.dispatchEvent(new embedWindow.Event("resize"));
    assert.equal(heightMessages.length, 1, "No debe repetir una altura que no ha cambiado");
    measuredBottom = 1180;
    embedWindow.dispatchEvent(new embedWindow.Event("resize"));
    assert.equal(heightMessages[1].data.height, 1228, "El iframe también debe poder reducir su altura");
    assert.deepEqual(embedErrors, []);

    const parentErrors = [];
    parentPage = new JSDOM(
      '<!DOCTYPE html><html><body><iframe id="burk-torneo-frame"></iframe>' +
      '<script src="' + baseUrl + '/embed-parent.js"></script></body></html>',
      {
        url: baseUrl + "/wordpress-test.html",
        runScripts: "dangerously",
        resources: new LocalResources(),
        pretendToBeVisual: true,
        virtualConsole: createConsole(parentErrors)
      }
    );
    const parentWindow = parentPage.window;
    await waitFor(() => parentWindow.document.readyState === "complete", "puente de altura de WordPress");
    const parentFrame = query(parentWindow, "#burk-torneo-frame");
    parentWindow.dispatchEvent(new parentWindow.MessageEvent("message", {
      origin: "https://vitineska-cell.github.io",
      source: parentFrame.contentWindow,
      data: { type: "burk-torneo:height", height: 3228 }
    }));
    assert.equal(parentFrame.style.height, "3228px");
    parentWindow.dispatchEvent(new parentWindow.MessageEvent("message", {
      origin: "https://otra-web.example",
      source: parentFrame.contentWindow,
      data: { type: "burk-torneo:height", height: 900 }
    }));
    assert.equal(parentFrame.style.height, "3228px", "Debe ignorar mensajes de otro origen");
    parentWindow.dispatchEvent(new parentWindow.MessageEvent("message", {
      origin: "https://vitineska-cell.github.io",
      source: parentFrame.contentWindow,
      data: { type: "burk-torneo:height", height: 50000 }
    }));
    assert.equal(parentFrame.style.height, "3228px", "Debe rechazar alturas disparatadas");
    assert.deepEqual(parentErrors, []);

    console.log(
      "OK · panel, carga de datos, validación 15/11 sin límite, cuadros Oro/Consolación, " +
      "publicación simulada, web pública, vista embebida y scroll único en WordPress"
    );
  } finally {
    if (parentPage) parentPage.window.close();
    if (embedPage) embedPage.window.close();
    if (publicPage) publicPage.window.close();
    if (admin) admin.window.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

run().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
