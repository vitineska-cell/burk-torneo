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
  const channels = [];
  class TestChannel {
    constructor(name) { this.channel = new BroadcastChannel(name); channels.push(this.channel); }
    set onmessage(fn) { this.channel.onmessage = fn; }
    postMessage(message) { this.channel.postMessage(message); }
  }
  let projection;
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
        win.BroadcastChannel = TestChannel;
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
    const filter = () => query(win, '#v-'+win.activeTab+' [data-pending-filter]');
    const visible = () => [...query(win,'#v-'+win.activeTab).querySelectorAll("[data-match]")].filter(card=>!card.hidden).length;
    const beforeFilter=JSON.stringify(win.state);
    filter().click();
    assert.equal(visible(),10);
    assert.equal(JSON.stringify(win.state),beforeFilter,"Filtrar no modifica el torneo");
    const unsaved=query(win,'[data-match="FG01"] [data-field="s1"]');
    unsaved.value="17";
    filter().click();filter().click();
    assert.equal(unsaved.value,"17","Alternar el filtro conserva los puntos sin guardar");
    let savedEvents=0;
    win.addEventListener("marcador-guardado",()=>savedEvents++);
    save("FG01",[[21,21]]);
    assert.equal(savedEvents,0,"Un marcador inválido no se transmite al pabellón");
    assert.equal(win.state.categories.Femenino.results["FG01"], undefined);
    for (let n=1;n<=10;n++) save("FG"+String(n).padStart(2,"0"), [[21,20]]);
    assert.equal(visible(),0,"Guardar retira los partidos completados");
    assert.equal(query(win,"[data-no-pending]").hidden,false);
    filter().click();assert.equal(visible(),10);
    save("FG01",[["",""]]);
    filter().click();assert.equal(visible(),1,"Un resultado anulado vuelve a pendientes");
    save("FG01",[[21,20]]);
    filter().click();
    savedEvents-=2;
    assert.equal(savedEvents,10,"Se transmite cada marcador válido al guardarlo");
    tab(win,"cuadros");
    assert.ok(query(win,'[data-match="FS1"] input').disabled);
    tab(win,"clasificados");
    query(win,"[data-confirm]").click();
    tab(win,"cuadros");
    save("FS1",[[15,12],[12,15],[15,14]]);
    assert.equal(win.state.categories.Femenino.results.FS1, undefined);
    assert.match(query(win,'[data-match="FS1"] .bk-rule').textContent,/20–20.*al saque/);
    save("FS1",[[21,12],[12,21],[21,20]]);
    save("FS2",[[21,0],[21,0]]);
    save("FFIN",[[20,21],[13,21]]);
    assert.match(win.buildSummary(),/FFIN Final/);
    assert.equal(query(win,'[data-match="FBR"]'),null);
    assert.doesNotMatch(win.buildSummary(),/FBR Bronce/);
    select(win,"Masculino");tab(win,"inscripcion");query(win,"#btn-draw").click();
    select(win,"Mixto");tab(win,"inscripcion");query(win,"#btn-draw").click();
    assert.deepEqual(Object.keys(win.state.categories.Mixto.groups).map(s => s[1]).sort(),
      Array.from("AAAAABBBBCCCC"));

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
      if (conflict) { conflict=false; publishedPayload.categories.Femenino.results.FS2.sets[0].s2="2"; return new Response(null, {status:409}); }
      const request = JSON.parse(init.body);
      assert.equal(request.sha,"test-sha");
      assert.equal(request.branch,"main");
      publishedPayload=JSON.parse(Buffer.from(request.content,"base64").toString());
      return Response.json({});
    };
    query(win,"#btn-pub").click();
    await waitFor(() => apiPuts === 1 || !query(win,"#btn-pub").disabled, "publicación simulada");
    assert.equal(apiPuts,1,query(win,"#toast").textContent);
    assert.equal(win.dirty,false);
    assert.deepEqual(publishedPayload,JSON.parse(JSON.stringify(win.state)));
    query(win,"#btn-load").click();
    await waitFor(() => apiGets===2 && !query(win,"#btn-load").disabled,"recarga");
    select(win,"Femenino");tab(win,"resultados");
    const pendingInput=query(win,'[data-match="FG01"] [data-set="0"][data-field="s1"]');
    pendingInput.value="9";
    publishedPayload.meta.updatedAt="2026-11-21T16:00:00.000Z";
    await win.publish();
    assert.equal(apiPuts,1,"Una actualización solo de fecha sincroniza sin reescribir los marcadores");
    assert.equal(win.state.meta.updatedAt,publishedPayload.meta.updatedAt);
    assert.equal(pendingInput.value,"9","La sincronización no borra un tanteo aún sin guardar");
    tab(win,"clasificados");
    win.state.categories.Femenino.results.FFIN.sets[0].s1="19";win.markDirty();
    publishedPayload.categories.Femenino.results.FS2.sets[0].s2="1";
    await win.publish();
    assert.equal(apiPuts,2,"Dos marcadores distintos se publican juntos");
    assert.equal(win.dirty,false);
    assert.equal(publishedPayload.categories.Femenino.results.FFIN.sets[0].s1,"19");
    assert.equal(publishedPayload.categories.Femenino.results.FS2.sets[0].s2,"1");
    assert.deepEqual(JSON.parse(win.baseline),publishedPayload);
    win.state.categories.Femenino.results.FFIN.sets[0].s1="18";win.markDirty();
    publishedPayload.categories.Femenino.results.FFIN.sets[0].s1="17";
    await win.publish();
    assert.equal(apiPuts,2,"Un conflicto sobre el mismo partido conserva el borrador");
    assert.equal(win.dirty,true);
    assert.equal(win.state.categories.Femenino.results.FFIN.sets[0].s1,"18");
    publishedPayload.categories.Femenino.results.FFIN.sets[0].s1="19";
    win.state.categories.Femenino.results.FFIN.sets[0].s1="18";
    win.markDirty();
    conflict=true;
    await win.publish();
    assert.equal(apiPuts,4,"El conflicto 409 reintenta con la última publicación");
    assert.equal(win.dirty,false);
    assert.equal(publishedPayload.categories.Femenino.results.FFIN.sets[0].s1,"18");
    assert.equal(publishedPayload.categories.Femenino.results.FS2.sets[0].s2,"2");
    const altered=JSON.parse(JSON.stringify(publishedPayload));
    [altered.categories.Femenino.groups.F1,altered.categories.Femenino.groups.F2]=
      [altered.categories.Femenino.groups.F2,altered.categories.Femenino.groups.F1];
    assert.throws(()=>win.mergePublished(publishedPayload,publishedPayload,altered),
      /cruce.*ha cambiado/,"Un sorteo alterado no puede publicar actas con rivales equivocados");
    assert.deepEqual(adminErrors,[]);

    const projectionErrors=[];
    projection=await JSDOM.fromURL(baseUrl+"/pabellon.html",{
      runScripts:"dangerously",resources:new LocalResources(),pretendToBeVisual:true,
      virtualConsole:createConsole(projectionErrors),beforeParse(w){
        w.BroadcastChannel=TestChannel;
        w.requestAnimationFrame=()=>0;
        w.Date.now=()=>Date.parse("2026-11-21T13:35:00Z");
        w.fetch=async()=>Response.json(publishedPayload);
      }
    });
    const projected=projection.window;
    const ctl=id=>query(win,"#screen-"+id);
    ctl("category").value="Masculino + Femenino";
    ctl("category").dispatchEvent(new win.Event("change"));
    ctl("view").value="horario";ctl("pin").click();
    const count=()=>projected.document.querySelectorAll("tbody tr").length;
    await waitFor(()=>query(projected,"#mode").textContent==="Masculino + Femenino" && count()===15,"pantalla conjunta enlazada");
    select(win,"Masculino");tab(win,"resultados");
    save("MG01",[[21,20]]);
    await waitFor(()=>count()===14,"Guardar marcador retira el partido por BroadcastChannel");
    save("MG01",[[21,21]]);
    await wait(50);assert.equal(count(),14,"El resultado inválido conserva el último marcador");
    save("MG01",[["",""]]);
    await waitFor(()=>count()===15,"Anular el marcador recupera el próximo partido");
    assert.deepEqual(projectionErrors,[]);
    const mockToken="test-token-for-copy";
    query(win,"#cfg-token").value=mockToken;
    let copied;
    Object.defineProperty(win.navigator,"clipboard",{configurable:true,value:{writeText:async text=>{copied=text;}}});
    query(win,"#cfg-copy-token").click();await waitFor(()=>copied===mockToken,"copiar token enmascarado");
    assert.equal(query(win,"#cfg-token").type,"password");
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
    assert.equal(publicWindow.document.querySelector('[data-match="FBR"]'),null);
    assert.ok(query(publicWindow,"#v-clas").textContent.includes(firstName.value));
    select(publicWindow,"Masculino");
    assert.equal(query(publicWindow,"#champ-banner").textContent,"");
    assert.equal(publicWindow.document.querySelectorAll("#v-horario [data-match]").length,35);
    select(publicWindow,"Mixto");
    assert.equal(publicWindow.document.querySelectorAll("#v-horario [data-match]").length,34);
    // JSDOM supplies the DOM but not the native dialog methods.
    const agenda = query(publicWindow, "#agenda");
    agenda.showModal = () => { agenda.open = true; };
    agenda.close = () => { agenda.open = false; agenda.dispatchEvent(new publicWindow.Event("close")); };
    const agendaList = query(publicWindow, "#agenda-list");
    const source = query(publicWindow, '#v-horario [data-match="XG01"] [data-agenda]');
    const pairId = source.dataset.agenda;
    source.click();
    assert.equal(agenda.open, true);
    assert.equal(agendaList.querySelectorAll("li").length, 4);
    assert.match(agendaList.querySelector("strong").textContent, /09:30 · Pista 1/);
    const mixed = publishedPayload.categories.Mixto;
    mixed.results.XG01 = {aId:mixed.groups.XA2,bId:mixed.groups.XA5,sets:[{s1:"21",s2:"18"}]};
    publicWindow.document.dispatchEvent(new publicWindow.Event("visibilitychange"));
    await waitFor(() => agendaList.querySelectorAll("li").length === 3, "actualización de la agenda abierta");
    assert.equal(agenda.open, true);
    delete mixed.results.XG01;
    publicWindow.load();
    await waitFor(() => agendaList.querySelectorAll("li").length === 4, "corrección de marcador");
    query(publicWindow, "#agenda-close").click();
    assert.equal(publicWindow.document.activeElement.dataset.agenda, pairId);
    select(publicWindow,"Femenino");
    query(publicWindow,'#v-cuadros [data-match="FFIN"] [data-agenda]').click();
    assert.match(agendaList.textContent,/Sin partidos pendientes/);
    const women = publishedPayload.categories.Femenino;
    delete women.results.FS2;
    publicWindow.load();
    await waitFor(() => agendaList.textContent.includes("Rival por confirmar"), "finalista con rival pendiente");
    assert.equal(agendaList.querySelectorAll("li").length,1);
    query(publicWindow, "#agenda-close").click();
    select(publicWindow,"Masculino");
    publishedPayload.categories.Masculino.groups=null;
    publicWindow.load();
    await waitFor(() => query(publicWindow,".insc-item [data-agenda]"), "inscripción pública");
    query(publicWindow,".insc-item [data-agenda]").click();
    assert.match(agendaList.textContent,/Pendiente del sorteo/);
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
    assert.equal(embedWindow.document.querySelectorAll("#v-horario [data-match]").length, 34);
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
    projection?.window.close();
    channels.forEach(channel=>channel.close());
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
