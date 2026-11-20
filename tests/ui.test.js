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

function query(win, selector) {
  return win.document.querySelector(selector);
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
    if (relative === "datos-almanzor-2026.json") {
      const data = JSON.parse(fs.readFileSync(filename, "utf8"));
      for (const name of Object.keys(data.categories)) {
        data.categories[name] = {pairs:[], groups:null, confirmed:{}, results:{}};
      }
      data.raffle.winners = [];
      response.writeHead(200, {"content-type":"application/json"}).end(JSON.stringify(data));
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
        win.localStorage.setItem("burk-admin-state-v2", '{"pairs":["Pinto"]}');
        win.confirm = () => true;
        win.alert = () => {};
      }
    });
    const win = admin.window;
    await waitFor(() => win.state, "carga del panel");
    assert.equal(win.state.eventId, "almanzor-2026-11-21");
    const initial = JSON.parse(JSON.stringify(win.state));
    assert.equal(win.localStorage.getItem("burk-admin-state-v2"), null);
    assert.ok(!query(win, "#v-inscripcion").textContent.includes("Pinto"));
    const select = (window, name) => query(window, '[data-category="' + name + '"]').click();
    const tab = (window, name) => query(window, '#tabs [data-tab="' + name + '"]').click();

    const names = {Mixto:13,Masculino:13,Femenino:5};
    const file = {eventId:initial.eventId, categories:{}};
    for (const [name, count] of Object.entries(names)) {
      file.categories[name] = Array.from({length:count}, (_,i) => ({id:"p"+i,p1:name+" A"+i,p2:name+" B"+i}));
    }
    const upload = query(win, "#roster-file");
    const workbook = fs.readFileSync(path.join(root, "tests/fixtures/parejas.xlsx"));
    Object.defineProperty(upload, "files", {value:[{
      name:"parejas.xlsx", size:workbook.length,
      arrayBuffer:async () => Uint8Array.from(workbook).buffer
    }]});
    upload.dispatchEvent(new win.Event("change", {bubbles:true}));
    await waitFor(() => query(win, '.pair-row input'), "carga de la lista editable");
    for (const [name, count] of Object.entries(names)) {
      assert.deepEqual(JSON.parse(JSON.stringify(win.state.categories[name].pairs)),file.categories[name]);
      select(win, name);
      assert.equal(win.document.querySelectorAll(".pair-row").length, count);
      assert.equal(win.state.categories[name].groups, null);
    }
    const firstName = query(win, '.pair-row input');
    firstName.value = "Nombre corregido <Ana>";
    firstName.dispatchEvent(new win.Event("input", {bubbles:true}));
    query(win,"#btn-draw").click();
    assert.equal(win.state.categories.Mixto.groups, null);
    assert.ok(query(win,"#v-clasificados").textContent.includes(firstName.value));
    tab(win,"resultados");
    const save = (id, scores) => {
      const card = query(win, '[data-match="'+id+'"]');
      scores.forEach(([a,b],i) => {
        card.querySelector('[data-set="'+i+'"][data-field="s1"]').value=a;
        card.querySelector('[data-set="'+i+'"][data-field="s2"]').value=b;
      });
      card.querySelector("[data-save]").click();
    };
    save("F-01",[[21,21]]);
    assert.equal(win.state.categories.Femenino.results["F-01"], undefined);
    for (let n=1;n<=10;n++) save("F-"+String(n).padStart(2,"0"), [[21,20]]);
    tab(win,"cuadros");
    assert.ok(query(win,'[data-match="F-11"] input').disabled);
    tab(win,"clasificados");
    query(win,"[data-confirm]").click();
    tab(win,"cuadros");
    save("F-11",[[21,18],[18,21],[21,20]]);
    save("F-12",[[21,0],[21,0]]);
    save("F-13",[[20,21],[19,21]]);
    assert.match(win.buildSummary(),/F-13 Final/);
    assert.ok(!query(win,"#v-cuadros").textContent.includes("3.er puesto"));
    select(win,"Masculino");tab(win,"inscripcion");query(win,"#btn-draw").click();
    select(win,"Mixto");tab(win,"inscripcion");query(win,"#btn-draw").click();
    assert.deepEqual(Object.keys(win.state.categories.Mixto.groups).map(s => s[1]).sort(),
      Array.from("AAAABBBCCCDDD"));

    let apiPuts = 0, apiGets = 0, publishedPayload = initial;
    let conflict = false;
    win.localStorage.setItem(win.LS_CFG, JSON.stringify({owner:"fixture",repo:"tournament",token:"test-only"}));
    win.fetch = async (url, init={}) => {
      assert.ok(String(url).includes("/contents/datos-almanzor-2026.json"));
      if (init.method !== "PUT") {
        apiGets++;
        return Response.json({sha:"test-sha",content:Buffer.from(JSON.stringify(publishedPayload)).toString("base64")});
      }
      apiPuts++;
      if (conflict) return new Response(null, {status:409});
      const request = JSON.parse(init.body);
      assert.equal(request.sha,"test-sha");
      assert.equal(request.branch,"main");
      publishedPayload=JSON.parse(Buffer.from(request.content,"base64").toString());
      return Response.json({});
    };
    query(win,"#btn-pub").click();
    await waitFor(() => apiPuts === 1 && !query(win,"#btn-pub").disabled, "publicación simulada");
    assert.equal(win.dirty,false);
    assert.deepEqual(publishedPayload,JSON.parse(JSON.stringify(win.state)));
    query(win,"#btn-load").click();
    await waitFor(() => apiGets===2 && !query(win,"#btn-load").disabled,"recarga");
    conflict=true;win.markDirty();
    await win.publish();
    assert.equal(apiPuts,2,"Un conflicto no debe provocar una sobrescritura automática");
    assert.equal(win.dirty,true);
    publishedPayload.meta.updatedAt += "-otra-mesa";
    await win.publish();
    assert.equal(apiPuts,2,"La mesa desactualizada debe conservar el borrador sin publicar");
    publishedPayload=JSON.parse(JSON.stringify(win.state));
    assert.deepEqual(adminErrors,[]);

    const publicErrors=[];
    publicPage = await JSDOM.fromURL(baseUrl + "/index.html", {
      runScripts:"dangerously", resources:new LocalResources(), pretendToBeVisual:true,
      virtualConsole:createConsole(publicErrors), beforeParse(w) {
        w.fetch=async () => Response.json(publishedPayload);
      }
    });
    const publicWindow=publicPage.window;
    await waitFor(() => publicWindow.DATA,"visor");
    select(publicWindow,"Femenino");
    tab(publicWindow,"cuadros");
    assert.match(query(publicWindow,"#champ-banner").textContent,/Campeones · Femenino/);
    assert.equal(publicWindow.document.querySelectorAll("#v-cuadros [data-match]").length,3);
    assert.equal(publicWindow.document.querySelectorAll("#v-horario [data-match]").length,13);
    assert.ok(query(publicWindow,"#v-clas").textContent.includes(firstName.value));
    select(publicWindow,"Masculino");
    assert.equal(query(publicWindow,"#champ-banner").textContent,"");
    assert.equal(publicWindow.document.querySelectorAll("#v-horario [data-match]").length,32);
    select(publicWindow,"Mixto");
    assert.equal(publicWindow.document.querySelectorAll("#v-horario [data-match]").length,28);
    assert.deepEqual(publicErrors,[]);
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
      () => embedWindow.DATA && embedWindow.DATA.eventId === "almanzor-2026-11-21",
      "datos de la vista embebida"
    );
    assert.equal(embedWindow.document.querySelectorAll("#v-horario [data-match]").length, 28);
    assert.match(embedWindow.document.documentElement.textContent, /Torneo BÜRK Almanzor/);
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
      "OK · panel, importación, corrección de nombres, tres sorteos, final femenina, conflictos, " +
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
