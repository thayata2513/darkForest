//
//
//  auto invade & capture 
//

import { html, render, useState, useLayoutEffect } 
    from "https://unpkg.com/htm/preact/standalone.module.js";



// css
export const buttonStyle = {
  border: "1px solid #ffffff",
  display: "inline-flex",
  justifyContent: "center",
  alignItems: "center",
  width: "100px",
  height: "30px",
  margin: "5px",
  padding: "0 0.3em",
  color: "white",
  textAlign: "center",
  transition: "background-color 0.2s, color 0.2s",
  borderRadius: "3px",
};

export const divStyle = {
textAlign: 'center',
justifyContent: "space-around",
width: "100%",
marginTop: "10px"
};

export function infoWithColor(text,textColor) {
  return html`<div style=${{ color: textColor }}>${text}</div>`;
}

let EMPTY_ADDRESS = "0x0000000000000000000000000000000000000000";
// function

const sleep = ms => new Promise(resolve => setTimeout(resolve,ms));

function drawRound(ctx, p, color,width=1) {
  if (!p) return '(???,???)';
  const viewport = ui.getViewport();
  //ctx.strokeStyle = '#FFC0CB';
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  const {
      x,
      y
  } = viewport.worldToCanvasCoords(p.location.coords);
  const range = p.range * 0.01 * 20;
  const trueRange = viewport.worldToCanvasDist(range);
  ctx.beginPath();
  // ctx.setLineDash([10,10]);
  ctx.arc(x, y, trueRange, 0, 2 * Math.PI);
  ctx.stroke();
  return `(${p.location.coords.x},${p.location.coords.y})`;
}

export let getEnergyPercent = (planet) => {
  if(!planet) return 0;
  return Math.floor(planet.energy / planet.energyCap * 100);
}

const destroyedFilter = plt => {
  return plt.location!==undefined && plt.destroyed === false ;
}

// const isInZones = planet => {
//   let zonesInvade = Array.from(df.captureZoneGenerator.zones);
//   let coords = planet.location.coords;

//   for(let i = 0;i<zonesInvade.length;i++){
//       let zone = zonesInvade[i];
//       let dist = df.getDistCoords(zone.coords,coords);
//       if(dist<zone.radius) return true;
//   }
//   return false;
// }

const isInZones  = planet => 
  ui.getCaptureZoneGenerator().isInZone(planet.locationId);

const canInvade = planet => {
  return planet.invadeStartBlock === undefined;
}


const canCaptureLater= p =>{ 
  let aboutState = p.capturer === EMPTY_ADDRESS && p.invader !== EMPTY_ADDRESS;
  return aboutState;
}

const canCapture = p =>{
  let currentBlockNumber = df.contractsAPI.ethConnection.blockNumber;
  let beginBlockNumber = p.invadeStartBlock;
  let delta = df.contractConstants.CAPTURE_ZONE_HOLD_BLOCKS_REQUIRED;//256*8;
  
  let aboutTime = beginBlockNumber+delta<currentBlockNumber; 
  let aboutState = p.capturer === EMPTY_ADDRESS && p.invader !== EMPTY_ADDRESS;
  
  return aboutTime && aboutState;
}

let showInvadablePlanets =[];
let showCaptureLaterPlanets = [];
let showCapturePlanets = [];
let loopSign = false;

let invadeColor = '#FF9900';
let captureLaterColor = '#FFFF66';
let caputureColor = '#CCFFFF';
let infoColor = '#66CC00';

let waitTime = 10; // 表示等待10s

function invadeAndCapture() {

    const [info, setInfo] = useState('');
    const [waitInfo,setWaitInfo] = useState('');
  

    async function  letInvade(){
      let plts = Array.from(df.getMyPlanets())
          .filter(destroyedFilter)
          .filter(p=>p.planetLevel>=2)
          .filter(isInZones)
          .filter(canInvade);

      showInvadablePlanets  = plts;

      let content = 'invade '+plts.length+ ' planet(s)';
      let itemInfo = infoWithColor(content,invadeColor);
      setInfo(itemInfo);

      await sleep(1000);
      showInvadablePlanets  =  [];

      for(let i = 0; i<plts.length;i++){
        let plt = plts[i];
        try{
          await df.invadePlanet(plt.locationId);

        }catch(e){
          console.error('invade planet fail');
          console.error(e);
        }
      
        await sleep(1000);
      }
     
    }

    async function letCaptureLater(){
      let plts = Array.from(df.getMyPlanets())
      .filter(destroyedFilter)
      .filter(p=>p.planetLevel>=2)
      .filter(canCaptureLater);

      showCaptureLaterPlanets = plts;
      let score = 0;
      for(let i = 0;i<plts.length;i++){
        let p = plts[i];
        let pLevel = p.planetLevel;
        score +=  ui.potentialCaptureScore(pLevel);
        // if(pLevel===2) score += 250000;
        // else if(pLevel===3) score += 500000;
        // else if(pLevel===4) score+=750000;
        // else if(pLevel===5) score+=1000000;
        // else if(pLevel===6) score+=10000000;
        // else if(pLevel===7) score+=20000000;
        // else if(pLevel===8) score+=50000000;
        // else if(pLevel===9) score+=100000000;        
      }
      let content = 'after caputre '+plts.length+ ' planet(s) get '+score +' score';
      let itemInfo = infoWithColor(content,captureLaterColor);
      setInfo(itemInfo);
      await sleep(1000);
      showCaptureLaterPlanets = [];  
    }



    async function letCapture(){
      let plts = Array.from(df.getMyPlanets())
          .filter(destroyedFilter)
          .filter(p=>p.planetLevel>=2)
          .filter(canCapture)
          .filter(p=>getEnergyPercent(p)>=80);
      
      // plts =[];
      // let plt = df.getPlanetWithId('00002c4a0024e197e96c07e80cf48ee406f9217b97c1d391f02e4ed2d6966e63');
      // plts.push(plt);

      showCapturePlanets  = plts;



      
      
      

      let content = 'capture '+plts.length+ ' planet(s)';
      let itemInfo = infoWithColor(content,caputureColor);
      setInfo(itemInfo);
      
      await sleep(1000);

    

      for(let i = 0; i<plts.length;i++){
        let plt = plts[i];
        

        try{
          await df.capturePlanet(plt.locationId);

        }catch(e){
          console.warn('capture planet fail');
          console.error(e);
        }

        console.log('helllo');
        await sleep(1000);
      }

      
      showCapturePlanets  = [];
      
    }

    async function startLoop(){

      loopSign = true;
      let content = 'loop begin';
      let itemInfo = infoWithColor(content,infoColor);
      setInfo(itemInfo);
      await sleep(1000);
	

      while(true){
        if(loopSign === false) {
          let content = 'loop end';
          let itemInfo = infoWithColor(content,infoColor);
          setInfo(itemInfo);
          break;
        }

        await letInvade();

        if(loopSign === false) {
          let content = 'loop end';
          let itemInfo = infoWithColor(content,infoColor);
          setInfo(itemInfo);
          break;
        }

        await letCaptureLater();

        if(loopSign === false) {
          let content = 'loop end';
          let itemInfo = infoWithColor(content,infoColor);
          setInfo(itemInfo);
          break;
        }

        await letCapture();

        if(loopSign === false) {
          let content = 'loop end';
          let itemInfo = infoWithColor(content,infoColor);
          setInfo(itemInfo);
          break;
        }
        
        await sleep(5*1000);
      }
    }

    async function endLoop(){
      loopSign = false;
    }
       
    return html`<div style=${divStyle} >
    <h1>Invade & Capture </h1>
   
    <button style=${buttonStyle} onClick=${letInvade}>invade </button>
    <button style=${buttonStyle} onClick=${letCapture}>capture </button>
    <button style=${buttonStyle} onClick=${letCaptureLater}>get score</button>
    <button style=${buttonStyle} onClick=${startLoop}>start loop</button>
    <button style=${buttonStyle} onClick=${endLoop}>end loop</button>
    <div>${info}</div>
    </div>`;

}



class Plugin {
    constructor() {
        this.container = null;
    }
    async render(container) {
        this.container = container;
        container.style.width = "350px";
        container.style.height = "200px";
        render(html`<${invadeAndCapture}/>`, container);

    }

    draw(ctx) {
      showCapturePlanets.forEach(p=>drawRound(ctx,p,caputureColor,5));
      showCaptureLaterPlanets.forEach(p=>drawRound(ctx,p,captureLaterColor,5));
      showInvadablePlanets.forEach(p=>drawRound(ctx,p,invadeColor,5));

    }
    destroy() {
        render(null, this.container);
    }
}

export default Plugin;




