(()=>{
  const byId=id=>document.getElementById("screen-"+id);
  let settings=readSetup();
  let order=[...settings.order,...Object.keys(viewLabels).filter(v=>!settings.order.includes(v))];
  const send=(action={})=>link.send({type:"setup",setup:settings,...action});
  const link=projectionLink(msg=>{if(msg?.type==="ready")send();},ok=>{
    byId("status").textContent=ok?"Proyector conectado":"Proyector desconectado";
    if(ok)send();
  });
  function save(action){
    localStorage.setItem(screenKey,JSON.stringify(settings));send(action);
  }
  function paint(){
    byId("category").value=settings.category;
    byId("seconds").value=settings.seconds;
    byId("auto").checked=settings.auto;
    byId("paused").checked=settings.paused;
    byId("order").innerHTML=order.map((v,i)=>'<div class="row"><label><input type="checkbox" style="width:auto" data-view="'+v+'" '+(settings.order.includes(v)?"checked":"")+'> '+viewLabels[v]+'</label>'+
      '<button class="btn" data-up="'+v+'" aria-label="Subir '+viewLabels[v]+'" '+(i===0?"disabled":"")+'>↑</button>'+
      '<button class="btn" data-down="'+v+'" aria-label="Bajar '+viewLabels[v]+'" '+(i===order.length-1?"disabled":"")+'>↓</button></div>').join("");
    const stages=[...new Set(fixturesFor(settings.category).filter(m=>!isGroup(m)).map(m=>m.stage.split(" ")[0]))];
    byId("view").innerHTML=settings.order.flatMap(v=>v==="cuadro"?stages.map(r=>new Option(viewLabels[v]+" · "+r,v+"/"+r).outerHTML):[new Option(viewLabels[v],v).outerHTML]).join("");
  }
  byId("category").replaceChildren(...categoryNames.map(c=>new Option(c,c)));
  byId("category").onchange=e=>{settings.category=e.target.value;paint();save();};
  byId("seconds").onchange=e=>{if(e.target.validity.valid && Number.isInteger(e.target.valueAsNumber))settings.seconds=e.target.valueAsNumber;paint();save();};
  byId("auto").onchange=e=>{settings.auto=e.target.checked;delete settings.fixed;save();};
  byId("paused").onchange=e=>{settings.paused=e.target.checked;save();};
  byId("order").onchange=e=>{
    const enabled=new Set(settings.order),v=e.target.dataset.view;
    if(e.target.checked)enabled.add(v);else enabled.delete(v);
    if(enabled.size)settings.order=order.filter(v=>enabled.has(v));
    paint();save();
  };
  byId("order").onclick=e=>{
    const {up,down}=e.target.dataset;if(!up && !down)return;
    const i=order.indexOf(up||down),j=i+(up?-1:1);
    [order[i],order[j]]=[order[j],order[i]];
    settings.order=order.filter(v=>settings.order.includes(v));paint();save();
  };
  byId("prev").onclick=()=>{delete settings.fixed;save({step:-1});};
  byId("next").onclick=()=>{delete settings.fixed;save({step:1});};
  byId("pin").onclick=()=>{settings.auto=false;settings.fixed=byId("view").value;byId("auto").checked=false;save({page:byId("view").value});};
  byId("offer").onclick=async()=>{try{byId("code").value=await link.offer();byId("code").select();byId("status").textContent="Copia el código en el proyector.";}catch{byId("status").textContent="Este navegador no ha podido iniciar la conexión.";}};
  byId("connect").onclick=async()=>{try{byId("status").textContent="Conectando…";await link.finish(byId("reply").value);}catch{byId("status").textContent="Revisa la respuesta del proyector.";}};
  window.addEventListener("torneo-publicado",e=>link.send({type:"published",data:e.detail}));
  paint();
})();
