(function(){
  "use strict";

  var frame=document.getElementById("burk-torneo-frame");
  if(!frame)return;

  window.addEventListener("message",function(event){
    var data=event.data;
    if(event.origin!=="https://vitineska-cell.github.io")return;
    if(event.source!==frame.contentWindow)return;
    if(!data||data.type!=="burk-torneo:height")return;

    var height=Math.ceil(Number(data.height));
    if(!Number.isFinite(height)||height<400||height>20000)return;
    frame.style.height=height+"px";
  });
})();
