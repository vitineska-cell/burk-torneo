// Canal local entre las ventanas de la mesa. El enlace WebRTC opcional une dos equipos de la misma red.
const screenKey = EVENT_ID + "-pantalla-v1";
const viewLabels = {clas:"Clasificación", horario:"Próximos partidos", resultados:"Últimos resultados", cuadro:"Cuadro eliminatorio"};
const screenDefaults = {category:"Mixto", order:Object.keys(viewLabels), seconds:10, auto:true, paused:false};
function validSetup(s) {
  return s && categoryNames.includes(s.category) && Array.isArray(s.order) && s.order.length &&
    new Set(s.order).size === s.order.length && s.order.every(k=>Object.hasOwn(viewLabels,k)) &&
    Number.isInteger(s.seconds) && s.seconds>=3 && s.seconds<=300 &&
    typeof s.auto==="boolean" && typeof s.paused==="boolean";
}
function readSetup() {
  try {const s=JSON.parse(localStorage.getItem(screenKey)); if(validSetup(s)) return s;} catch {}
  return {...screenDefaults, order:[...screenDefaults.order]};
}
function projectionLink(receive, connected) {
  const channel = typeof BroadcastChannel==="function" ? new BroadcastChannel(screenKey) : null;
  if(channel) channel.onmessage=e=>receive(e.data);
  let peer, wire;
  function bind(dc) {
    wire=dc;
    dc.onmessage=e=>{try {receive(JSON.parse(e.data));} catch {}};
    dc.onopen=()=>connected(true);
    dc.onclose=()=>connected(false);
  }
  function start() {
    if(peer) peer.close();
    peer=new RTCPeerConnection();
    peer.ondatachannel=e=>bind(e.channel);
    return peer;
  }
  async function code(pc, description) {
    await pc.setLocalDescription(description);
    if(pc.iceGatheringState!=="complete") await new Promise(resolve=>{
      const done=()=>{if(pc.iceGatheringState==="complete"){clearTimeout(timer);resolve();}};
      const timer=setTimeout(resolve,5000);
      pc.addEventListener("icegatheringstatechange",done);
      done();
    });
    return btoa(JSON.stringify(pc.localDescription));
  }
  function parse(value,type) {
    const d=JSON.parse(atob(value.trim()));
    if(d.type!==type || typeof d.sdp!=="string") throw Error("Código incorrecto");
    return d;
  }
  return {
    send(msg){channel?.postMessage(msg);if(wire?.readyState==="open")wire.send(JSON.stringify(msg));},
    async offer(){const pc=start();bind(pc.createDataChannel("pantalla"));return code(pc,await pc.createOffer());},
    async answer(input){const offer=parse(input,"offer");const pc=start();await pc.setRemoteDescription(offer);return code(pc,await pc.createAnswer());},
    finish(input){return peer.setRemoteDescription(parse(input,"answer"));}
  };
}
