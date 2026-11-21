"use strict";
const el=id=>document.getElementById(id);
const frame=el("frame");
let setup=readSetup(), page, data, previousHTML="", elapsed=0, position=0, bottomTime=0, lastFrame=null;
function rounds(cat){
  return [...new Set(fixturesFor(cat).filter(m=>!isGroup(m)).map(m=>m.stage.split(" ")[0]))];
}
function pages(){
  return setup.order.flatMap(k=>k==="cuadro"?rounds(setup.category).map(r=>"cuadro/"+r):[k]);
}
function resetMotion(){frame.scrollTop=position=elapsed=bottomTime=0;lastFrame=null;}
function move(step){
  const list=pages();
  page=list[(list.indexOf(page)+step+list.length)%list.length];
  resetMotion();render();
}
function update(msg){
  if(msg?.type==="published"){acceptData(msg.data);return;}
  if(msg?.type!=="setup" || !validSetup(msg.setup))return;
  const changed=setup.category!==msg.setup.category;
  setup=msg.setup;
  const list=pages();
  if(changed || !list.includes(page)){page=list[0];resetMotion();}
  const wanted=msg.page || (!setup.auto && !msg.step && setup.fixed);
  if(wanted && list.includes(wanted) && page!==wanted){page=wanted;resetMotion();}
  if(msg.step===1 || msg.step===-1)move(msg.step);else render();
}
const link=projectionLink(update,ok=>{el("linkStatus").textContent=ok?"Mesa conectada":"Conexión cerrada";if(ok)el("pairing").close();});
function render(){
  page ||= (!setup.auto && pages().includes(setup.fixed) ? setup.fixed : pages()[0]);
  const [view,round]=page.split("/");
  el("heading").textContent=viewLabels[view]+(round?" · "+round:"");
  el("mode").textContent=setup.category;
  if(!data)return;
  const div=data.categories[setup.category], comp=competition(div,setup.category);
  let html;
  if(view==="clas"){
    const columns=["Puesto","Pareja","PJ","PG","PF","PC","DIF"];
    html=Object.entries(comp.tables).filter(([,table])=>table.rows.length).map(([group,table])=>{
      const label="Grupo "+escHtml(group);
      const rows=table.rows.map((r,i)=>{
        const values=[i+1,escHtml(pairName(r.pair)),r.pj,r.w,r.pf,r.pc,r.diff];
        return "<tr>"+values.map(value=>"<td>"+value+"</td>").join("")+"</tr>";
      });
      return '<table class="group-table" aria-label="'+label+'"><colgroup><col class="place"><col><col class="stat" span="5"></colgroup><thead><tr><th colspan="7">'+label+
        "</th></tr><tr>"+columns.map(c=>'<th scope="col">'+c+"</th>").join("")+
        "</tr></thead><tbody>"+rows.join("")+"</tbody></table>";
    }).join("") || "<p>Pendiente del sorteo de grupos.</p>";
  }else{
    const rows=[];
    let games=fixturesFor(setup.category).map(m=>comp.matches.get(m.id));
    if(view==="horario")games=games.filter(g=>!g.winner);
    if(view==="resultados"){
      games=Object.keys(div.results).reverse().map(id=>comp.matches.get(id)).filter(g=>g?.winner);
    }
    if(view==="cuadro")games=games.filter(g=>g.match.stage.split(" ")[0]===round);
    const heads=["Hora","Pista","Parejas",view==="horario"?"Fase":"Marcador"];
    for(const g of games){
      const names=[g.a?pairName(g.a):g.match.a,g.b?pairName(g.b):g.match.b];
      const score=g.status.sets.filter(s=>s.s1!=="" && s.s2!=="").map(s=>s.s1+"–"+s.s2).join(" / ");
      rows.push([g.match.start,g.match.court,names.map(n=>"<span>"+escHtml(n)+"</span>").join(""),view==="horario"?escHtml(g.match.stage):score||"Pendiente"]);
    }
    const empty=view==="resultados"?"Todavía no hay resultados publicados.":"Todos los partidos han terminado.";
    html=rows.length?"<table><thead><tr>"+heads.map(h=>"<th>"+h+"</th>").join("")+"</tr></thead><tbody>"+rows.map(row=>"<tr>"+row.map((v,i)=>{
    const cls=["time","num","pairs",""][i];
    return '<td class="'+cls+'">'+v+"</td>";
  }).join("")+"</tr>").join("")+"</tbody></table>":"<p>"+empty+"</p>";
  }
  if(html!==previousHTML){frame.innerHTML=html;previousHTML=html;frame.scrollTop=position;}
}
function tick(now){
  const dt=lastFrame===null?0:Math.min(100,now-lastFrame);
  lastFrame=now;
  if(data && !setup.paused && !document.hidden){
    elapsed+=dt;
    const max=Math.max(0,frame.scrollHeight-frame.clientHeight);
    if(max && elapsed>=3000){
      position=Math.min(max,position+dt*.035);
      frame.scrollTop=position;
      bottomTime=position>=max?bottomTime+dt:0;
    }
    if(elapsed>=setup.seconds*1000 && (!max || bottomTime>=3000)){
      if(setup.auto && pages().length>1)move(1);
      else if(max)resetMotion();
    }
  }
  requestAnimationFrame(tick);
}
function acceptData(next){
  checkEvent(next);
  if(data && next.meta.updatedAt<data.meta.updatedAt)return;
  data=next;render();
  el("sync").textContent="Actualizado · "+new Date(next.meta.updatedAt).toLocaleTimeString("es-ES",{timeZone:"Europe/Madrid"});
}
async function refresh(){
  try{const r=await fetch(DATA_FILE+"?t="+Date.now(),{cache:"no-store"});if(!r.ok)throw Error();acceptData(await r.json());}
  catch{el("sync").textContent=data?"Sin conexión · mostrando la última actualización":"Esperando conexión…";}
  finally{setTimeout(refresh,10000);}
}
el("pair").onclick=()=>el("pairing").showModal();
el("closePair").onclick=()=>el("pairing").close();
el("answer").onclick=async()=>{try{el("reply").value=await link.answer(el("offer").value);el("reply").select();el("linkStatus").textContent="Copia esta respuesta en el panel de la mesa.";}catch{el("linkStatus").textContent="Revisa el código y vuelve a intentarlo.";}};
el("full").onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{el("sync").textContent="Utiliza el modo de pantalla completa del navegador."; }};
render();link.send({type:"ready"});refresh();requestAnimationFrame(tick);
