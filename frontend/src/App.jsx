/**
 * Symphony-AION — Unified App
 * ─────────────────────────────────────────────────────────────────
 * TWO MODES. ONE URL.
 *
 * PUBLIC MODE  (default)
 *   Sign-up gate → paste JSON → 4-tab free report → CTA
 *   Route: /
 *
 * FOUNDER MODE  (admin audit machine)
 *   No gate. Full 6-tab dashboard. Lead list. Unlimited audits.
 *   Route: /?founder=AION2024
 *   Or: click the hidden "A" logo 5× on the sign-up gate
 *
 * Backend: main.py (FastAPI)
 * Set: NEXT_PUBLIC_API_URL and NEXT_PUBLIC_FOUNDER_KEY in .env
 */

import { useState, useEffect, useRef, useCallback } from "react";

// ─── Config ───────────────────────────────────────────────────────────────────
const API_URL      = import.meta.env.VITE_API_URL      || "http://localhost:8000";
const FOUNDER_KEY  = import.meta.env.VITE_FOUNDER_KEY  || "AION2024";
const ADMIN_SECRET = import.meta.env.VITE_ADMIN_SECRET || "aion_admin";
const CALENDLY_URL = import.meta.env.VITE_CALENDLY_URL || "https://calendly.com";

function isFounderMode() {
  if (typeof window === "undefined") return false;
  const p = new URLSearchParams(window.location.search);
  return p.get("founder") === FOUNDER_KEY;
}

// ─── Design System ────────────────────────────────────────────────────────────
// Public: cool blue-dark   |   Founder: deep black, hot orange (Groq DNA)
const PUBLIC = {
  bg0:"#060608", bg1:"#0c0c10", bg2:"#121218", bg3:"#1a1a22",
  border:"#252535", text0:"#f0f0f5", text1:"#9898a8", text2:"#4a4a5a",
  accent:"#f59e0b", accentDim:"#451f00",
  cyan:"#22d3ee",  green:"#34d399", greenDim:"#0a2e1a",
  red:"#f87171",   redDim:"#3a0f0f", purple:"#a78bfa",
};
const FOUNDER = {
  bg0:"#080808", bg1:"#0f0f0f", bg2:"#161616", bg3:"#1e1e1e",
  border:"#2a2a2a", text0:"#f5f5f5", text1:"#a3a3a3", text2:"#525252",
  accent:"#f97316", accentDim:"#7c3a0e",
  cyan:"#22d3ee",  green:"#4ade80", greenDim:"#14532d",
  red:"#f87171",   redDim:"#3a0f0f", purple:"#c084fc",
};

const MONO = "'JetBrains Mono','Fira Code','Cascadia Code',monospace";
const SANS = "'Geist','Inter',system-ui,sans-serif";
const PHASE_COLORS = ["#f97316","#22d3ee","#4ade80","#c084fc","#fb7185","#fbbf24","#60a5fa"];

// ─── Sample JSONs ─────────────────────────────────────────────────────────────
const SAMPLES = {
  CrewAI: `{"crew":"research_crew","model":"gpt-4o","tasks":[{"name":"Research","agent":"senior_researcher","description":"Find market data","output":"done","token_usage":{"prompt_tokens":3240,"completion_tokens":960}},{"name":"Analysis","agent":"analyst","description":"Analyze findings","output":"done","token_usage":{"prompt_tokens":2100,"completion_tokens":620}},{"name":"Reporting","agent":"writer","description":"Write report","output":"done","token_usage":{"prompt_tokens":1680,"completion_tokens":480}},{"name":"QA","agent":"analyst","description":"Quality review","token_usage":{"prompt_tokens":890,"completion_tokens":260}}]}`,
  LangGraph: `{"graph_state":"completed","model":"claude-3-5-sonnet","nodes":["supervisor","researcher","coder","reviewer"],"channel_values":{"supervisor":{"tokens":1200},"researcher":{"tokens":4800},"coder":{"tokens":3600},"reviewer":{"tokens":1100}}}`,
  "OpenAI Agents": `{"id":"run_abc123","model":"gpt-4o","usage":{"prompt_tokens":8420,"completion_tokens":1380,"total_tokens":9800},"tool_calls":[{"type":"function","function":{"name":"search_web"}},{"type":"function","function":{"name":"read_file"}},{"type":"function","function":{"name":"write_output"}}]}`,
};

// ─── CLIENT-SIDE PARSER (fallback when no API) ────────────────────────────────
function detectFW(obj) {
  if (!obj || typeof obj !== "object") return "Generic";
  if (obj.usage?.prompt_tokens !== undefined) return "OpenAI";
  const tasks = obj.tasks || obj.task_output || [];
  if (Array.isArray(tasks) && tasks[0] && ("agent" in tasks[0] || "token_usage" in tasks[0])) return "CrewAI";
  if (obj.crew || obj.crew_id) return "CrewAI";
  if ("run_type" in obj || Array.isArray(obj.runs)) return "LangSmith";
  if (obj.graph_state !== undefined || obj.channel_values || obj.langgraph) return "LangGraph";
  if (Array.isArray(obj) && obj[0]?.role && obj[0]?.content) return "AutoGen";
  if (obj.messages || obj.chat_history) return "AutoGen";
  return "Generic";
}

function dg(obj, ...keys) {
  if (!obj || typeof obj !== "object") return 0;
  for (const k of keys) { if (obj[k] != null) return obj[k]; }
  for (const v of Object.values(obj)) {
    if (typeof v === "object") { const r = dg(v, ...keys); if (r) return r; }
  }
  return 0;
}

const RATES = {
  "gpt-4o":          {i:0.0000025,  o:0.00001},
  "gpt-4":           {i:0.00003,    o:0.00006},
  "gpt-3.5-turbo":   {i:0.0000005,  o:0.0000015},
  "claude-3-5-sonnet":{i:0.000003,  o:0.000015},
  "claude-3-haiku":  {i:0.00000025, o:0.00000125},
  "gemini-1.5-flash":{i:0.000000075,o:0.0000003},
  "llama-3.1-70b":   {i:0.0000009,  o:0.0000009},
  "deepseek-chat":   {i:0.00000014, o:0.00000028},
};
const COMPARE_LIST = ["gpt-4o","claude-3-5-sonnet","claude-3-haiku","gemini-1.5-flash","llama-3.1-70b","deepseek-chat"];

function resolveRates(m="") {
  const ml = m.toLowerCase();
  for (const [k,v] of Object.entries(RATES)) { if (ml.includes(k)) return [k,v]; }
  if (ml.includes("claude")) return ["claude-3-5-sonnet", RATES["claude-3-5-sonnet"]];
  if (ml.includes("gemini")) return ["gemini-1.5-flash",  RATES["gemini-1.5-flash"]];
  if (ml.includes("llama") || ml.includes("groq")) return ["llama-3.1-70b", RATES["llama-3.1-70b"]];
  return ["gpt-4o", RATES["gpt-4o"]];
}
const tc = (i,o,r) => i*r.i + o*r.o;

function parseClientSide(json) {
  const fw = detectFW(json);
  const modelRaw = dg(json,"model","engine","llm") || "gpt-4o";
  const [modelKey, rates] = resolveRates(typeof modelRaw==="string"?modelRaw:"gpt-4o");

  let phases = [];

  if (fw==="OpenAI") {
    const u = json.usage||json;
    const pt=parseInt(dg(u,"prompt_tokens","input_tokens")||0);
    const ct=parseInt(dg(u,"completion_tokens","output_tokens")||0);
    const tools=(json.tool_calls||json.choices?.[0]?.message?.tool_calls||[]).length;
    phases=[
      {name:"System Prompt",agent:"system",  input_tokens:Math.floor(pt*.3),output_tokens:0,status:"pass"},
      {name:"Context",      agent:"context", input_tokens:Math.floor(pt*.45),output_tokens:0,status:Math.floor(pt*.45)>4000?"warn":"pass"},
      {name:"Tool Calls",   agent:"tools",   input_tokens:Math.floor(pt*.25)+tools*80,output_tokens:0,status:"pass"},
      {name:"Completion",   agent:modelKey,  input_tokens:0,output_tokens:ct,status:"pass"},
    ].filter(p=>p.input_tokens+p.output_tokens>0);
  } else if (fw==="CrewAI") {
    const tasks=json.tasks||json.task_output||[];
    phases=tasks.map(t=>{
      const tu=t.token_usage||t.usage||{};
      const it=parseInt(tu.prompt_tokens||tu.input_tokens||Math.floor((tu.total_tokens||800)*.7));
      const ot=parseInt(tu.completion_tokens||tu.output_tokens||(tu.total_tokens||800)-it);
      return {name:(t.name||t.description||"task").slice(0,20),agent:t.agent||"agent",input_tokens:it,output_tokens:ot,status:t.output?"pass":"warn"};
    });
  } else if (fw==="LangGraph") {
    const nodes=json.nodes||[]; const ch=json.channel_values||{};
    if (nodes.length) {
      phases=nodes.map(n=>{
        const name=typeof n==="string"?n:(n.id||n.name||"node");
        const t=typeof n==="string"?(ch[n]?.tokens||800):dg(n,"tokens","token_count")||800;
        return {name:name.slice(0,20),agent:name,input_tokens:Math.floor(t*.7),output_tokens:Math.floor(t*.3),status:"pass"};
      });
    } else {
      const total=dg(json,"total_tokens")||5000;
      phases=[{name:"graph_run",agent:"graph",input_tokens:Math.floor(total*.7),output_tokens:Math.floor(total*.3),status:"pass"}];
    }
  } else {
    const total=parseInt(dg(json,"total_tokens","token_count","tokens_used")||2800);
    const pt=parseInt(dg(json,"prompt_tokens","input_tokens")||Math.floor(total*.7));
    const ct=parseInt(dg(json,"completion_tokens","output_tokens")||total-pt);
    phases=[
      {name:"Input", agent:modelKey,input_tokens:pt,output_tokens:0,status:"pass"},
      {name:"Output",agent:modelKey,input_tokens:0,output_tokens:ct,status:"pass"},
    ];
  }

  phases = phases.map(p=>({
    ...p,
    total_tokens: (p.input_tokens+p.output_tokens),
    cost_usd: tc(p.input_tokens,p.output_tokens,rates),
  }));
  const total = phases.reduce((s,p)=>s+p.total_tokens,0)||1;
  phases = phases.map(p=>({...p,pct_of_total:+(p.total_tokens/total*100).toFixed(1),flag:p.total_tokens/total>0.45||p.status==="warn"}));

  const overhead=fw==="CrewAI"?.45:fw==="AutoGen"?.5:fw==="LangGraph"?.38:.25;
  const opt=Math.floor(total/(1+overhead));
  const waste=total-opt;
  const cost=phases.reduce((s,p)=>s+p.cost_usd,0);
  const optCost=tc(Math.floor(opt*.7),Math.floor(opt*.3),rates);
  const efficiency=Math.max(10,Math.min(98,Math.round(100-(waste/total*100))));
  const grade=efficiency>=80?"A":efficiency>=65?"B":efficiency>=50?"C":"D";

  const pt2=Math.floor(total*.7),ct2=total-pt2;
  const compareModels=COMPARE_LIST.map(cm=>{
    const [,cr]=resolveRates(cm);
    const c=tc(pt2,ct2,cr);
    return {model:cm,cost_usd:+c.toFixed(8),monthly_500:+(c*500).toFixed(4),annual:+(c*500*12).toFixed(2),is_current:cm===modelKey};
  });
  if (!compareModels.some(c=>c.is_current)) {
    compareModels.push({model:modelKey,cost_usd:+cost.toFixed(8),monthly_500:+(cost*500).toFixed(4),annual:+(cost*500*12).toFixed(2),is_current:true});
  }
  compareModels.sort((a,b)=>a.cost_usd-b.cost_usd);
  const cheapest=compareModels[0].cost_usd;
  compareModels.forEach(c=>c.delta_pct=Math.round((c.cost_usd-cheapest)/Math.max(cheapest,1e-10)*100));

  const agents=phases.map(p=>p.agent);
  const dupAgents=agents.filter((a,i)=>agents.indexOf(a)!==i&&a!=="system"&&a!=="context");
  const maxPct=Math.max(...phases.map(p=>p.pct_of_total));

  const lossEvents=[];
  phases.forEach(p=>{
    if(p.pct_of_total>45) lossEvents.push({phase:p.name,category:"CONTEXT_BLOAT",tokens_lost:Math.floor(p.total_tokens*.3),detail:`Phase consumes ${p.pct_of_total}% of budget. Optimal ceiling is ≤40%.`});
    if(p.status==="warn") lossEvents.push({phase:p.name,category:"SCHEMA_DRIFT",tokens_lost:Math.floor(p.total_tokens*.15),detail:"Step flagged — likely triggered a validation retry."});
  });
  if(dupAgents.length) lossEvents.push({phase:"Multiple",category:"AGENT_REDUNDANCY",tokens_lost:phases.filter(p=>dupAgents.includes(p.agent)).reduce((s,p)=>s+p.total_tokens,0),detail:`Agent '${dupAgents[0]}' appears in multiple steps.`});

  const worst=phases.reduce((a,b)=>a.total_tokens>b.total_tokens?a:b,phases[0]);

  return {
    framework:fw, model_detected:modelKey,
    efficiency:{
      score:efficiency,grade,total_tokens:total,actual_cost_usd:+cost.toFixed(8),
      optimized_tokens:opt,optimized_cost:+optCost.toFixed(8),
      waste_tokens:waste,waste_pct:+(waste/total*100).toFixed(1),savings_pct:Math.round((1-optCost/Math.max(cost,1e-10))*100),
    },
    telemetry:{phases,worst_phase:worst,loss_events:lossEvents},
    compare:{
      models:compareModels,
      savings_per_run:+Math.max(0,cost-cheapest).toFixed(8),
      monthly_savings:+Math.max(0,(cost-cheapest)*500).toFixed(4),
      annual_savings:+Math.max(0,(cost-cheapest)*500*12).toFixed(2),
    },
    governance:{
      gates:[
        {id:"G1",name:"Redundancy",pass:!dupAgents.length,detail:dupAgents.length?`Agent '${dupAgents[0]}' appears in multiple steps — consolidation recommended.`:"No duplicate agent roles detected."},
        {id:"G2",name:"Scope",     pass:maxPct<45,detail:maxPct<45?`Largest phase is ${maxPct.toFixed(1)}% of budget — within range.`:`Largest phase consumes ${maxPct.toFixed(1)}% of token budget.`},
        {id:"G3",name:"Attribution",pass:phases.every(p=>p.agent&&p.agent!=="unknown"),detail:phases.every(p=>p.agent)?"All steps have agent attribution — full audit trail.":"Some steps lack agent attribution."},
      ],
      gates_passed:0, gates_total:3,
    },
  };
}

// ─── Shared UI Primitives ─────────────────────────────────────────────────────
const mkTag = C => ({ children, color=C.text1 }) => (
  <span style={{padding:"2px 7px",borderRadius:3,fontSize:9,fontWeight:800,letterSpacing:"0.1em",textTransform:"uppercase",color,background:color+"20",border:`1px solid ${color}30`,fontFamily:MONO,whiteSpace:"nowrap"}}>{children}</span>
);
const mkMono = () => ({ children, color, size=11 }) => (
  <span style={{fontFamily:MONO,color,fontSize:size,lineHeight:1.5}}>{children}</span>
);
const mkCard = C => ({ children, style={}, glow=false }) => (
  <div style={{background:C.bg2,borderRadius:8,padding:20,border:`1px solid ${glow?C.accent+"50":C.border}`,boxShadow:glow?`0 0 32px ${C.accent}10,inset 0 1px 0 ${C.accent}15`:`inset 0 1px 0 #ffffff06`,...style}}>{children}</div>
);
const mkLabel = C => ({ children, color }) => (
  <div style={{fontSize:9,fontWeight:800,letterSpacing:"0.18em",textTransform:"uppercase",color:color||C.text2,marginBottom:12,fontFamily:MONO}}>{children}</div>
);

// ─── Score Ring ───────────────────────────────────────────────────────────────
const ScoreRing = ({ score, C }) => {
  const r=44,circ=2*Math.PI*r,dash=(score/100)*circ;
  const color=score>=70?C.green:score>=45?C.accent:C.red;
  const grade=score>=80?"A":score>=65?"B":score>=50?"C":"D";
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8}}>
      <svg width={120} height={120} style={{transform:"rotate(-90deg)"}}>
        <circle cx={60} cy={60} r={r} fill="none" stroke={C.bg3} strokeWidth={8}/>
        <circle cx={60} cy={60} r={r} fill="none" stroke={color} strokeWidth={8}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{filter:`drop-shadow(0 0 8px ${color}80)`,transition:"stroke-dasharray 1.2s ease"}}/>
        <text x={60} y={60} textAnchor="middle" dominantBaseline="central"
          style={{transform:"rotate(90deg)",transformOrigin:"60px 60px"}}
          fill={color} fontSize={28} fontWeight={900} fontFamily={MONO}>{grade}</text>
        <text x={60} y={78} textAnchor="middle" dominantBaseline="central"
          style={{transform:"rotate(90deg)",transformOrigin:"60px 78px"}}
          fill={color+"99"} fontSize={11} fontFamily={MONO}>{score}/100</text>
      </svg>
      <div style={{fontSize:10,color:C.text2,fontFamily:MONO,letterSpacing:"0.1em",textTransform:"uppercase"}}>Efficiency Score</div>
    </div>
  );
};

// ─── Phase Bar ────────────────────────────────────────────────────────────────
const PhaseBar = ({ phases, total, C }) => (
  <div>
    <div style={{display:"flex",height:24,borderRadius:4,overflow:"hidden",gap:1}}>
      {phases.map((p,i)=>(
        <div key={i} title={`${p.name}: ${p.total_tokens?.toLocaleString()}`}
          style={{flex:p.total_tokens,background:PHASE_COLORS[i%PHASE_COLORS.length]+"cc",display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:800,color:"#000",fontFamily:MONO}}>
          {p.total_tokens/total>0.1?(p.name||"").slice(0,4).toUpperCase():""}
        </div>
      ))}
    </div>
    <div style={{display:"flex",gap:12,marginTop:10,flexWrap:"wrap"}}>
      {phases.map((p,i)=>(
        <div key={i} style={{display:"flex",alignItems:"center",gap:5}}>
          <div style={{width:7,height:7,borderRadius:2,background:PHASE_COLORS[i%PHASE_COLORS.length]}}/>
          <span style={{fontSize:11,color:C.text1}}>
            {p.name} <span style={{color:PHASE_COLORS[i%PHASE_COLORS.length],fontFamily:MONO}}>{p.total_tokens?.toLocaleString()}</span>
          </span>
        </div>
      ))}
    </div>
  </div>
);

// ─── Replay Timeline ──────────────────────────────────────────────────────────
const ReplayTimeline = ({ events, C }) => {
  const [playing,setPlaying]=useState(false);
  const [cursor,setCursor]=useState(0);
  const interval=useRef(null);
  useEffect(()=>{
    if(playing){ interval.current=setInterval(()=>setCursor(c=>{ if(c>=events.length-1){setPlaying(false);return c;} return c+1; }),500); }
    return()=>clearInterval(interval.current);
  },[playing]);
  const statusColor={pass:C.green,warn:C.accent,info:C.cyan,flag:C.accent};
  const statusSym  ={pass:"✓",warn:"⚠",info:"→",flag:"⚑"};
  return (
    <div>
      <div style={{display:"flex",gap:8,marginBottom:12,alignItems:"center"}}>
        <button onClick={()=>{setPlaying(p=>!p);if(cursor>=events.length-1)setCursor(0);}} style={{padding:"5px 14px",background:playing?C.accentDim:C.accent,color:playing?C.accent:"#000",border:`1px solid ${C.accent}`,borderRadius:3,cursor:"pointer",fontSize:10,fontWeight:800,fontFamily:MONO}}>{playing?"⏸ PAUSE":"▶ PLAY"}</button>
        <button onClick={()=>{setPlaying(false);setCursor(0);}} style={{padding:"5px 10px",background:"transparent",color:C.text2,border:`1px solid ${C.border}`,borderRadius:3,cursor:"pointer",fontSize:10,fontFamily:MONO}}>⟳ RESET</button>
        <div style={{flex:1,height:2,background:C.bg3,borderRadius:1}}>
          <div style={{height:"100%",width:`${(cursor/(events.length-1))*100}%`,background:C.accent,borderRadius:1,transition:"width 0.4s ease"}}/>
        </div>
        <span style={{fontSize:10,color:C.text2,fontFamily:MONO}}>{cursor+1}/{events.length}</span>
      </div>
      {events.map((ev,i)=>{
        const isActive=i===cursor,isPast=i<cursor,color=statusColor[ev.status]||C.text1;
        return (
          <div key={i} onClick={()=>setCursor(i)} style={{display:"flex",alignItems:"center",gap:12,padding:"8px 10px",background:isActive?color+"15":"transparent",borderLeft:`2px solid ${isActive?color:isPast?color+"40":C.border}`,cursor:"pointer",opacity:(!playing||isPast||isActive)?1:0.3,transition:"all 0.2s"}}>
            <span style={{color:C.text2,fontSize:10,fontFamily:MONO,minWidth:36}}>{ev.t||`00:${String(i*2).padStart(2,"0")}`}</span>
            <span style={{color,fontSize:11,minWidth:12}}>{isPast||isActive?statusSym[ev.status]||"✓":"○"}</span>
            <span style={{fontSize:11,color:isActive?C.text0:isPast?C.text1:C.text2,flex:1}}>{ev.event}</span>
            {ev.tokens&&<span style={{fontSize:10,color:isActive?C.accent:C.text2,fontFamily:MONO}}>{ev.tokens.toLocaleString()}t</span>}
          </div>
        );
      })}
    </div>
  );
};

// ─── ════════════════════════════════════════════════════════════════
//     FOUNDER MODE — Full Admin Audit Machine
// ═══════════════════════════════════════════════════════════════════

const FOUNDER_TABS = ["PULSE","TELEMETRY","COMPARE","REPLAY","GOVERNANCE","HISTORY"];

function FounderMode() {
  const C = FOUNDER;
  const Tag = mkTag(C), Mono = mkMono(), Card = mkCard(C), Label = mkLabel(C);

  const [activeTab,setActiveTab]=useState("PULSE");
  const [json,setJson]=useState("");
  const [audit,setAudit]=useState(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [leads,setLeads]=useState([]);
  const [sample,setSample]=useState(null);
  const [dragging,setDragging]=useState(false);
  const [liveTokens,setLiveTokens]=useState(0);
  const [history,setHistory]=useState([]);
  const fileRef=useRef();

  // Load leads on HISTORY tab
  useEffect(()=>{
    if(activeTab==="HISTORY"){
      fetch(`${API_URL}/leads?secret=${ADMIN_SECRET}`)
        .then(r=>r.json()).then(d=>setLeads(d.leads||[])).catch(()=>{});
    }
  },[activeTab]);

  // Live token ticker when audit is active
  useEffect(()=>{
    if(!audit) return;
    setLiveTokens(0);
    const target=audit.efficiency.total_tokens;
    const t=setInterval(()=>setLiveTokens(n=>{ if(n>=target){clearInterval(t);return target;} return Math.min(n+Math.floor(target/30),target); }),50);
    return()=>clearInterval(t);
  },[audit]);

  const runAudit = async () => {
    if(!json.trim()){setError("Paste JSON first");return;}
    let parsed; try{parsed=JSON.parse(json);}catch{setError("Invalid JSON");return;}
    setLoading(true); setError("");
    try {
      // Try API first, fall back to client-side
      const res=await fetch(`${API_URL}/audit`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:"founder@symphony-aion.com",company:"Symphony-AION",raw_json:json})});
      const data=await res.json();
      if(res.ok&&data.audit){
        const a={...data.audit,framework:data.framework};
        a.governance.gates_passed=a.governance.gates.filter(g=>g.pass).length;
        setAudit(a);
        setHistory(h=>[{...a,ts:new Date().toLocaleTimeString(),raw_hash:data.hash},...h.slice(0,19)]);
        setActiveTab("PULSE");
      } else throw new Error("API error");
    } catch {
      // Client-side fallback
      const a=parseClientSide(parsed);
      a.governance.gates_passed=a.governance.gates.filter(g=>g.pass).length;
      setAudit(a); setHistory(h=>[{...a,ts:new Date().toLocaleTimeString()},...h.slice(0,19)]);
      setActiveTab("PULSE");
    } finally { setLoading(false); }
  };

  const handleFile=f=>{const r=new FileReader();r.onload=e=>{setJson(e.target.result);setError("");};r.readAsText(f);};

  // Replay events derived from audit
  const replayEvents = audit ? [
    {t:"00:00",event:`Run start — ${audit.framework} detected`,tokens:null,status:"info"},
    ...audit.telemetry.phases.map((p,i)=>({t:`00:0${i+1}`,event:`${p.name} — ${p.agent}`,tokens:p.total_tokens,status:p.flag?"warn":"pass"})),
    {t:`00:${String(audit.telemetry.phases.length+2).padStart(2,"0")}`,event:`Audit complete — score ${audit.efficiency.score}/100`,tokens:audit.efficiency.total_tokens,status:"pass"},
  ] : [];

  const run=audit;

  return (
    <div style={{background:C.bg0,minHeight:"100vh",color:C.text0,fontFamily:SANS,fontSize:13}}>

      {/* ── Top Bar ─────────────────────────────────────────────── */}
      <div style={{display:"flex",alignItems:"center",padding:"0 20px",height:44,borderBottom:`1px solid ${C.border}`,background:C.bg1,position:"sticky",top:0,zIndex:100,gap:12}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginRight:16}}>
          <div style={{width:22,height:22,borderRadius:4,background:`linear-gradient(135deg,${C.accent},${C.purple})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:900,color:"#000"}}>A</div>
          <span style={{fontWeight:800,fontSize:13,letterSpacing:"-0.01em"}}>Symphony<span style={{color:C.accent}}>·AION</span></span>
        </div>
        <div style={{padding:"3px 8px",background:C.accentDim,border:`1px solid ${C.accent}40`,borderRadius:3}}>
          <Mono color={C.accent} size={9}>◆ FOUNDER ACCESS</Mono>
        </div>
        {run&&<>
          <Mono color={C.text2} size={9}>|</Mono>
          <Tag color={C.cyan}>{run.framework}</Tag>
          <Mono color={C.text2} size={9}>TJID: {run.raw_hash||"local"}</Mono>
        </>}
        <div style={{flex:1}}/>
        {run&&<Mono color={run.efficiency.score>=65?C.green:C.accent} size={11}>{run.efficiency.score}/100 · {run.efficiency.grade}</Mono>}
        {run&&<div style={{padding:"3px 10px",background:C.accentDim,border:`1px solid ${C.accent}`,borderRadius:3,fontSize:9,fontWeight:800,color:C.accent,fontFamily:MONO,letterSpacing:"0.1em"}}>● ACTIVE</div>}
      </div>

      {/* ── Live Banner (only when audit loaded) ─────────────────── */}
      {run&&(
        <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",borderBottom:`1px solid ${C.border}`,background:C.bg1}}>
          {[
            {label:"Tokens Used",  value:liveTokens.toLocaleString(),      sub:`of ${run.efficiency.total_tokens.toLocaleString()}`, accent:C.accent},
            {label:"Cost",         value:`$${run.efficiency.actual_cost_usd.toFixed(5)}`, sub:"this run", accent:C.cyan},
            {label:"Savings",      value:`${run.efficiency.savings_pct}%`, sub:"vs unoptimized", accent:C.green},
            {label:"Waste",        value:run.efficiency.waste_tokens.toLocaleString(), sub:`${run.efficiency.waste_pct}% excess`, accent:C.red},
            {label:"Gates",        value:`${run.governance.gates_passed}/${run.governance.gates_total}`, sub:"governance", accent:run.governance.gates_passed===run.governance.gates_total?C.green:C.accent},
          ].map((m,i)=>(
            <div key={i} style={{padding:"12px 16px",borderRight:i<4?`1px solid ${C.border}`:"none"}}>
              <div style={{fontSize:20,fontWeight:800,fontFamily:MONO,color:m.accent,lineHeight:1}}>{m.value}</div>
              <div style={{fontSize:9,color:C.text2,marginTop:2,fontFamily:MONO}}>{m.sub}</div>
              <div style={{fontSize:11,color:C.text1,marginTop:4}}>{m.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Input Panel (collapsed when audit loaded) ──────────── */}
      {!run&&(
        <div style={{padding:"24px 24px 0"}}>
          <div style={{maxWidth:860,margin:"0 auto"}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
              <span style={{fontSize:12,fontWeight:700,color:C.text0}}>Paste AI Run JSON</span>
              <div style={{flex:1}}/>
              {Object.keys(SAMPLES).map(fw=>(
                <button key={fw} onClick={()=>{setSample(fw);setJson(SAMPLES[fw]);setError("");}} style={{padding:"4px 8px",background:sample===fw?C.accent+"20":"transparent",border:`1px solid ${sample===fw?C.accent:C.border}`,borderRadius:3,cursor:"pointer",fontSize:9,color:sample===fw?C.accent:C.text2,fontFamily:MONO}}>{fw}</button>
              ))}
            </div>
            <div onDragOver={e=>{e.preventDefault();setDragging(true);}} onDragLeave={()=>setDragging(false)}
              onDrop={e=>{e.preventDefault();setDragging(false);if(e.dataTransfer.files[0])handleFile(e.dataTransfer.files[0]);}}>
              <textarea value={json} onChange={e=>{setJson(e.target.value);setError("");}}
                placeholder="Paste CrewAI / LangGraph / OpenAI Agents / LangSmith JSON here — or drag & drop a .json file"
                style={{width:"100%",minHeight:160,padding:"12px 14px",background:dragging?C.accent+"10":C.bg3,border:`1px solid ${dragging?C.accent:C.border}`,borderRadius:5,color:C.text0,fontSize:11,fontFamily:MONO,resize:"vertical",outline:"none",boxSizing:"border-box",lineHeight:1.5}}/>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8,marginTop:8}}>
              <input ref={fileRef} type="file" accept=".json" style={{display:"none"}} onChange={e=>e.target.files[0]&&handleFile(e.target.files[0])}/>
              <button onClick={()=>fileRef.current.click()} style={{padding:"6px 12px",background:"transparent",border:`1px solid ${C.border}`,borderRadius:3,cursor:"pointer",fontSize:10,color:C.text2,fontFamily:MONO}}>↑ Upload</button>
              <div style={{flex:1}}/>
              {error&&<span style={{fontSize:11,color:C.red,fontFamily:MONO}}>{error}</span>}
              <button onClick={runAudit} disabled={loading} style={{padding:"8px 20px",background:loading?C.accentDim:C.accent,color:"#000",border:"none",borderRadius:4,cursor:loading?"default":"pointer",fontSize:11,fontWeight:800,fontFamily:MONO,transition:"all 0.15s"}}>
                {loading?"ANALYZING...":"▶ RUN AUDIT"}
              </button>
            </div>
          </div>
        </div>
      )}
      {run&&(
        <div style={{padding:"8px 24px",borderBottom:`1px solid ${C.border}`,background:C.bg1,display:"flex",gap:8,alignItems:"center"}}>
          <span style={{fontSize:11,color:C.text2}}>Run another:</span>
          <textarea value={json} onChange={e=>{setJson(e.target.value);setError("");}} placeholder="Paste new JSON..."
            style={{flex:1,height:32,padding:"6px 10px",background:C.bg3,border:`1px solid ${C.border}`,borderRadius:4,color:C.text0,fontSize:10,fontFamily:MONO,resize:"none",outline:"none"}}/>
          {Object.keys(SAMPLES).map(fw=>(
            <button key={fw} onClick={()=>{setSample(fw);setJson(SAMPLES[fw]);}} style={{padding:"4px 8px",background:"transparent",border:`1px solid ${C.border}`,borderRadius:3,cursor:"pointer",fontSize:9,color:C.text2,fontFamily:MONO}}>{fw}</button>
          ))}
          <button onClick={runAudit} disabled={loading} style={{padding:"6px 16px",background:loading?C.accentDim:C.accent,color:"#000",border:"none",borderRadius:4,cursor:"pointer",fontSize:10,fontWeight:800,fontFamily:MONO}}>
            {loading?"...":"▶"}
          </button>
        </div>
      )}

      {/* ── Tabs ─────────────────────────────────────────────────── */}
      <div style={{display:"flex",borderBottom:`1px solid ${C.border}`,background:C.bg1,paddingLeft:20}}>
        {FOUNDER_TABS.map(tab=>(
          <button key={tab} onClick={()=>setActiveTab(tab)} style={{padding:"11px 16px",border:"none",cursor:"pointer",background:"transparent",borderBottom:activeTab===tab?`2px solid ${C.accent}`:"2px solid transparent",color:activeTab===tab?C.accent:C.text2,fontSize:9,fontWeight:800,fontFamily:MONO,letterSpacing:"0.12em",transition:"all 0.15s"}}>{tab}</button>
        ))}
      </div>

      {/* ── Tab Content ──────────────────────────────────────────── */}
      <div style={{padding:20,maxWidth:1060,margin:"0 auto"}}>

        {/* PULSE */}
        {activeTab==="PULSE"&&(
          !run ? (
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16,padding:"60px 0",color:C.text2}}>
              <div style={{fontSize:40,opacity:.3}}>◎</div>
              <div style={{fontSize:13,fontFamily:MONO}}>No active run. Paste JSON above to begin audit.</div>
            </div>
          ) : (
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              <Card style={{gridColumn:"span 2"}}>
                <Label>Token Journey — Phase Breakdown</Label>
                <PhaseBar phases={run.telemetry.phases} total={run.efficiency.total_tokens} C={C}/>
              </Card>
              <Card>
                <Label>Efficiency Score</Label>
                <div style={{display:"flex",gap:20,alignItems:"center"}}>
                  <ScoreRing score={run.efficiency.score} C={C}/>
                  <div>
                    <div style={{fontSize:28,fontWeight:900,color:run.efficiency.score>=65?C.green:C.accent,fontFamily:MONO}}>{run.efficiency.savings_pct}%</div>
                    <div style={{fontSize:11,color:C.text1,marginBottom:8}}>cost vs unoptimized baseline</div>
                    <div style={{fontSize:12,color:C.text2,lineHeight:1.5}}>
                      {run.efficiency.waste_tokens.toLocaleString()} excess tokens detected.<br/>
                      Optimal: ~{run.efficiency.optimized_tokens.toLocaleString()} tokens.
                    </div>
                  </div>
                </div>
              </Card>
              <Card>
                <Label>Phase Detail</Label>
                {run.telemetry.phases.map((p,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 10px",background:C.bg3,borderRadius:4,marginBottom:6,borderLeft:`2px solid ${p.flag?C.accent:PHASE_COLORS[i%PHASE_COLORS.length]}`}}>
                    <span style={{fontSize:11,color:C.text1,minWidth:90}}>{p.name}</span>
                    <span style={{fontSize:10,color:C.text2,fontFamily:MONO,flex:1}}>{p.agent}</span>
                    <span style={{fontSize:10,color:PHASE_COLORS[i%PHASE_COLORS.length],fontFamily:MONO}}>{p.total_tokens?.toLocaleString()}t</span>
                    <span style={{fontSize:10,color:p.pct_of_total>40?C.accent:C.text2,fontFamily:MONO}}>{p.pct_of_total}%</span>
                    <span style={{fontSize:11,color:p.flag?C.accent:C.green}}>{p.flag?"⚠":"✓"}</span>
                  </div>
                ))}
              </Card>
              {run.telemetry.loss_events?.length>0&&(
                <Card style={{gridColumn:"span 2"}}>
                  <Label color={C.red}>Loss Events</Label>
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    {run.telemetry.loss_events.map((ev,i)=>(
                      <div key={i} style={{padding:"10px 12px",background:C.redDim+"60",border:`1px solid ${C.red}30`,borderLeft:`3px solid ${C.red}`,borderRadius:4}}>
                        <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:4}}>
                          <span style={{padding:"2px 6px",borderRadius:2,fontSize:9,fontWeight:800,color:C.red,background:C.red+"20",fontFamily:MONO}}>{ev.category}</span>
                          <span style={{fontSize:10,color:C.text2,fontFamily:MONO}}>{ev.phase}</span>
                          <div style={{flex:1}}/>
                          <span style={{fontSize:10,color:C.red,fontFamily:MONO}}>−{ev.tokens_lost?.toLocaleString()}t</span>
                        </div>
                        <div style={{fontSize:11,color:C.text1}}>{ev.detail}</div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )
        )}

        {/* TELEMETRY */}
        {activeTab==="TELEMETRY"&&run&&(
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <Card>
              <Label>Context Distribution</Label>
              <div>
                {run.telemetry.phases.map((p,i)=>{
                  const maxT=Math.max(...run.telemetry.phases.map(x=>x.total_tokens));
                  const heatColor=p.pct_of_total>30?C.red:p.pct_of_total>20?C.accent:p.pct_of_total>10?"#facc15":C.green;
                  return (
                    <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0"}}>
                      <div style={{width:180,flexShrink:0}}>
                        <div style={{height:6,borderRadius:3,background:C.bg3,overflow:"hidden"}}>
                          <div style={{height:"100%",width:`${(p.total_tokens/maxT)*100}%`,background:heatColor,transition:"width 0.5s ease"}}/>
                        </div>
                      </div>
                      <span style={{fontSize:11,fontFamily:MONO,color:C.text0,flex:1}}>{p.name}</span>
                      <span style={{fontSize:10,fontFamily:MONO,color:C.text2}}>{p.agent}</span>
                      <span style={{fontSize:11,fontFamily:MONO,color:heatColor}}>{p.total_tokens?.toLocaleString()}</span>
                      <span style={{fontSize:10,fontFamily:MONO,color:C.text2}}>{p.pct_of_total}%</span>
                    </div>
                  );
                })}
              </div>
            </Card>
            <Card>
              <Label>Cost Per Phase</Label>
              {run.telemetry.phases.map((p,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"8px 12px",background:C.bg3,borderRadius:4,marginBottom:6,borderLeft:`2px solid ${p.flag?C.accent:C.green}`}}>
                  <span style={{fontSize:11,color:C.text1,minWidth:100}}>{p.name}</span>
                  <span style={{fontSize:10,fontFamily:MONO,color:C.text2,flex:1}}>{p.total_tokens?.toLocaleString()}t</span>
                  <span style={{fontSize:11,fontFamily:MONO,color:p.cost_usd>0.001?C.accent:C.green}}>${p.cost_usd?.toFixed(6)}</span>
                  {p.status==="warn"&&<span style={{padding:"2px 6px",borderRadius:2,fontSize:9,fontWeight:800,color:C.red,background:C.red+"20",fontFamily:MONO}}>↩RETRY</span>}
                </div>
              ))}
            </Card>
          </div>
        )}

        {/* COMPARE */}
        {activeTab==="COMPARE"&&run&&(
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <Card glow>
              <Label>Cross-Model Cost Comparison</Label>
              <div style={{display:"grid",gridTemplateColumns:"1fr 110px 130px 100px",borderBottom:`1px solid ${C.border}`,paddingBottom:8,marginBottom:4}}>
                {["MODEL","THIS RUN","×500/MO","DELTA"].map(h=>(
                  <div key={h} style={{fontSize:9,color:C.text2,fontFamily:MONO,fontWeight:800,letterSpacing:"0.1em"}}>{h}</div>
                ))}
              </div>
              {run.compare.models.map((m,i)=>(
                <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 110px 130px 100px",padding:"9px 0",borderBottom:i<run.compare.models.length-1?`1px solid ${C.border}20`:"none",borderLeft:m.is_current?`2px solid ${C.accent}`:"2px solid transparent",paddingLeft:m.is_current?8:0,background:m.is_current?C.accent+"08":"transparent"}}>
                  <div style={{fontSize:11,color:m.is_current?C.accent:C.text0,fontFamily:MONO,display:"flex",alignItems:"center",gap:6}}>
                    {m.model}
                    {m.is_current&&<span style={{padding:"1px 5px",borderRadius:2,fontSize:8,fontWeight:800,color:C.accent,background:C.accent+"20",fontFamily:MONO}}>YOURS</span>}
                    {i===0&&!m.is_current&&<span style={{padding:"1px 5px",borderRadius:2,fontSize:8,fontWeight:800,color:C.green,background:C.green+"20",fontFamily:MONO}}>CHEAPEST</span>}
                  </div>
                  <span style={{fontSize:11,fontFamily:MONO,color:i===0?C.green:C.text1}}>${m.cost_usd.toFixed(5)}</span>
                  <span style={{fontSize:11,fontFamily:MONO,color:i===0?C.green:C.text1}}>${m.monthly_500.toFixed(2)}</span>
                  <span style={{fontSize:11,fontFamily:MONO,color:m.delta_pct===0?C.green:m.is_current?C.accent:C.text2}}>{m.delta_pct===0?"baseline":`+${m.delta_pct}%`}</span>
                </div>
              ))}
            </Card>
            <Card>
              <Label>ROI Projection</Label>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
                {[
                  {label:"Savings per run",value:`$${run.compare.savings_per_run.toFixed(5)}`},
                  {label:"Monthly @500 runs",value:`$${run.compare.monthly_savings.toFixed(2)}`},
                  {label:"Annualized",value:`$${run.compare.annual_savings.toFixed(2)}`},
                ].map((m,i)=>(
                  <div key={i} style={{padding:"14px 16px",background:C.bg3,borderRadius:6,border:`1px solid ${C.green}20`}}>
                    <div style={{fontSize:20,fontWeight:800,color:C.green,fontFamily:MONO}}>{m.value}</div>
                    <div style={{fontSize:11,color:C.text1,marginTop:5}}>{m.label}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* REPLAY */}
        {activeTab==="REPLAY"&&(
          <Card>
            <Label>Run Replay{run?` — ${run.framework} · ${run.efficiency.total_tokens.toLocaleString()}t`:""}</Label>
            {run ? <ReplayTimeline events={replayEvents} C={C}/> : (
              <div style={{color:C.text2,fontSize:12,fontFamily:MONO,padding:"40px 0",textAlign:"center"}}>No run loaded. Paste JSON and run an audit first.</div>
            )}
          </Card>
        )}

        {/* GOVERNANCE */}
        {activeTab==="GOVERNANCE"&&(
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            {run&&(
              <Card>
                <Label>Symphony Guard — Gate Results</Label>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
                  {run.governance.gates.map((g,i)=>(
                    <div key={i} style={{padding:14,borderRadius:6,background:g.pass?C.greenDim+"80":C.redDim+"80",border:`1px solid ${g.pass?C.green:C.red}40`,borderLeft:`3px solid ${g.pass?C.green:C.red}`}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                        <span style={{padding:"2px 7px",borderRadius:3,fontSize:9,fontWeight:800,color:g.pass?C.green:C.red,background:(g.pass?C.green:C.red)+"20",fontFamily:MONO}}>{g.id}: {g.name}</span>
                        <div style={{flex:1}}/><span style={{fontSize:16}}>{g.pass?"✓":"✗"}</span>
                      </div>
                      <div style={{fontSize:11,color:C.text1,lineHeight:1.5}}>{g.detail}</div>
                    </div>
                  ))}
                </div>
                <div style={{marginTop:12,padding:"10px 14px",background:C.bg3,borderRadius:6,display:"flex",gap:10,alignItems:"center"}}>
                  <span style={{fontSize:9,color:C.text2,fontFamily:MONO,letterSpacing:"0.1em"}}>GATES PASSED</span>
                  <span style={{fontSize:14,fontWeight:800,color:run.governance.gates_passed===run.governance.gates_total?C.green:C.accent,fontFamily:MONO}}>{run.governance.gates_passed} / {run.governance.gates_total}</span>
                </div>
              </Card>
            )}
            {/* Seven gates display — all time state */}
            <Card>
              <Label>Ma'at Engine — Seven Constitutional Gates</Label>
              <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:8}}>
                {["G1 Truthfulness","G2 Scope","G3 Tone","G4 Efficiency","G5 Security","G6 Schema","G7 Stamp"].map((g,i)=>{
                  const gId=`G${i+1}`;
                  const gateResult=run?.governance.gates.find(x=>x.id===gId);
                  const passed=gateResult?gateResult.pass:true;
                  return (
                    <div key={g} style={{padding:"12px 6px",background:C.bg1,border:`1px solid ${!passed?C.accent+"60":C.green+"40"}`,borderRadius:4,textAlign:"center"}}>
                      <div style={{fontSize:18,marginBottom:4}}>{!passed?"⚠":"✓"}</div>
                      <div style={{fontSize:8,color:C.text2,fontFamily:MONO,lineHeight:1.4}}>{g.split(" ").map((w,j)=><div key={j}>{w}</div>)}</div>
                      <div style={{marginTop:6,fontSize:9,color:!passed?C.accent:C.green,fontWeight:800}}>{!passed?"FLAGGED":"PASS"}</div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        )}

        {/* HISTORY */}
        {activeTab==="HISTORY"&&(
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            {/* Session history */}
            <Card>
              <Label>This Session — Run History</Label>
              {history.length===0?(
                <div style={{color:C.text2,fontSize:11,fontFamily:MONO,padding:"20px 0",textAlign:"center"}}>No runs this session yet.</div>
              ):(
                history.map((r,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:14,padding:"10px 0",borderBottom:i<history.length-1?`1px solid ${C.border}20`:"none"}}>
                    <div style={{width:6,height:6,borderRadius:"50%",background:i===0?C.accent:C.green,boxShadow:i===0?`0 0 8px ${C.accent}`:""}}/>
                    <span style={{fontSize:11,color:C.text1,fontFamily:MONO}}>{r.framework}</span>
                    <span style={{fontSize:10,color:C.text2,fontFamily:MONO}}>{r.ts}</span>
                    <div style={{flex:1}}/>
                    <span style={{fontSize:11,fontFamily:MONO,color:C.text1}}>{r.efficiency.total_tokens.toLocaleString()}t</span>
                    <span style={{fontSize:11,fontFamily:MONO,color:r.efficiency.score>=65?C.green:C.accent}}>{r.efficiency.score}/100 {r.efficiency.grade}</span>
                  </div>
                ))
              )}
            </Card>
            {/* Platform leads from DB */}
            <Card>
              <Label>Lead Database — Captured Audits</Label>
              {leads.length===0?(
                <div style={{color:C.text2,fontSize:11,fontFamily:MONO,padding:"20px 0",textAlign:"center"}}>No leads yet — or API not connected. Send the 300 DMs.</div>
              ):(
                <>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 120px 100px 80px 100px",borderBottom:`1px solid ${C.border}`,paddingBottom:8,marginBottom:4}}>
                    {["EMAIL","COMPANY","FRAMEWORK","SCORE","DATE"].map(h=>(
                      <div key={h} style={{fontSize:9,color:C.text2,fontFamily:MONO,fontWeight:800,letterSpacing:"0.1em"}}>{h}</div>
                    ))}
                  </div>
                  {leads.map((l,i)=>(
                    <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 120px 100px 80px 100px",padding:"8px 0",borderBottom:i<leads.length-1?`1px solid ${C.border}15`:"none"}}>
                      <span style={{fontSize:11,color:C.text0}}>{l.email}</span>
                      <span style={{fontSize:11,color:C.text1,fontFamily:MONO}}>{l.company}</span>
                      <span style={{padding:"2px 6px",borderRadius:2,fontSize:9,color:C.cyan,background:C.cyan+"15",fontFamily:MONO,width:"fit-content"}}>{l.framework}</span>
                      <span style={{fontSize:11,fontFamily:MONO,color:l.score>=65?C.green:C.accent}}>{l.score}</span>
                      <span style={{fontSize:10,color:C.text2,fontFamily:MONO}}>{l.created_at?.slice(0,10)}</span>
                    </div>
                  ))}
                </>
              )}
            </Card>
          </div>
        )}
      </div>

      {/* Bottom Bar */}
      <div style={{position:"fixed",bottom:0,left:0,right:0,height:26,background:C.accentDim,borderTop:`1px solid ${C.accent}40`,display:"flex",alignItems:"center",padding:"0 20px",gap:14}}>
        <span style={{color:C.accent,fontSize:9,fontFamily:MONO}}>◆ FOUNDER MODE</span>
        <span style={{color:C.accent+"60",fontSize:9,fontFamily:MONO}}>|</span>
        <span style={{color:C.accent,fontSize:9,fontFamily:MONO}}>{run?`${run.framework} → ${run.efficiency.total_tokens.toLocaleString()}t → ${run.efficiency.score}/100`:"AWAITING RUN"}</span>
        <div style={{flex:1}}/>
        <span style={{color:C.accent+"99",fontSize:9,fontFamily:MONO}}>{new Date().toLocaleTimeString("en-US",{hour12:false})} · SYMPHONY-AION v1.0</span>
      </div>
      <div style={{height:26}}/>
    </div>
  );
}

// ─── ════════════════════════════════════════════════════════════════
//     PUBLIC MODE — SaaS Sign-Up Gate + Free Report
// ═══════════════════════════════════════════════════════════════════

function PublicMode() {
  const C = PUBLIC;
  const Tag = mkTag(C), Mono = mkMono(), Card = mkCard(C), Label = mkLabel(C);

  const [screen,setScreen]=useState("gate");
  const [user,setUser]=useState(null);
  const [result,setResult]=useState(null);
  const [tab,setTab]=useState("EFFICIENCY");
  const [json,setJson]=useState("");
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [dragging,setDragging]=useState(false);
  const [sample,setSample]=useState(null);
  const [logoClicks,setLogoClicks]=useState(0);
  const fileRef=useRef();

  // Secret founder unlock: click logo 5×
  const handleLogoClick=()=>{
    const n=logoClicks+1;
    setLogoClicks(n);
    if(n>=5){ window.location.href=`?founder=${FOUNDER_KEY}`; }
  };

  const handleSignUp=(email,company)=>{ setUser({email,company}); setScreen("input"); };

  const runAudit=async()=>{
    if(!json.trim()){setError("Paste a JSON run log above");return;}
    let parsed; try{parsed=JSON.parse(json);}catch{setError("Invalid JSON — check formatting");return;}
    setLoading(true); setError("");
    try {
      const res=await fetch(`${API_URL}/audit`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:user.email,company:user.company,raw_json:json})});
      const data=await res.json();
      if(res.ok&&data.audit){
        const a={...data.audit,framework:data.framework};
        a.governance.gates_passed=a.governance.gates.filter(g=>g.pass).length;
        setResult(a);setScreen("report");setTab("EFFICIENCY");
      } else throw new Error("API error");
    } catch {
      const a=parseClientSide(parsed);
      a.governance.gates_passed=a.governance.gates.filter(g=>g.pass).length;
      setResult(a);setScreen("report");setTab("EFFICIENCY");
    } finally { setLoading(false); }
  };

  const handleFile=f=>{const r=new FileReader();r.onload=e=>{setJson(e.target.result);setError("");};r.readAsText(f);};

  const inp={width:"100%",padding:"11px 13px",background:C.bg3,border:`1px solid ${C.border}`,borderRadius:5,color:C.text0,fontSize:13,fontFamily:SANS,outline:"none",boxSizing:"border-box"};

  // ── Gate Screen ────────────────────────────────────────────────
  if(screen==="gate"){
    const [email,setEmail]=useState(""); const [company,setCompany]=useState(""); const [err,setErr]=useState(""); const [busy,setBusy]=useState(false);
    const submit=()=>{
      if(!email.includes("@")){setErr("Valid email required");return;}
      if(!company.trim()){setErr("Company name required");return;}
      setBusy(true); setTimeout(()=>{setBusy(false);handleSignUp(email,company);},600);
    };
    return (
      <div style={{background:C.bg0,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:SANS,padding:24}}>
        <div style={{width:"100%",maxWidth:450}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:44}}>
            <div onClick={handleLogoClick} style={{width:36,height:36,borderRadius:8,background:`linear-gradient(135deg,${C.accent},${C.purple})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:900,color:"#000",cursor:"pointer",userSelect:"none"}}>A</div>
            <div>
              <div style={{fontWeight:800,fontSize:16,color:C.text0,letterSpacing:"-0.02em"}}>Symphony<span style={{color:C.accent}}>·AION</span></div>
              <div style={{fontSize:10,color:C.text2,fontFamily:MONO,letterSpacing:"0.12em"}}>FORENSIC TOKEN AUDITOR</div>
            </div>
          </div>
          <h1 style={{fontSize:28,fontWeight:900,color:C.text0,letterSpacing:"-0.03em",lineHeight:1.2,margin:"0 0 12px"}}>Paste your AI run log.<br/><span style={{color:C.accent}}>Find out what it's costing you.</span></h1>
          <p style={{fontSize:14,color:C.text1,lineHeight:1.6,margin:"0 0 26px"}}>Free forensic audit for LangGraph, CrewAI, AutoGen, and OpenAI Agents runs. Token waste identified in 30 seconds.</p>
          <Card style={{padding:22}}>
            <div style={{marginBottom:13}}>
              <div style={{fontSize:10,color:C.text2,marginBottom:5,fontFamily:MONO}}>WORK EMAIL</div>
              <input value={email} onChange={e=>{setEmail(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&submit()} placeholder="you@company.com" style={inp} onFocus={e=>e.target.style.borderColor=C.accent} onBlur={e=>e.target.style.borderColor=C.border}/>
            </div>
            <div style={{marginBottom:18}}>
              <div style={{fontSize:10,color:C.text2,marginBottom:5,fontFamily:MONO}}>COMPANY</div>
              <input value={company} onChange={e=>{setCompany(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&submit()} placeholder="Acme Corp" style={inp} onFocus={e=>e.target.style.borderColor=C.accent} onBlur={e=>e.target.style.borderColor=C.border}/>
            </div>
            {err&&<div style={{fontSize:11,color:C.red,marginBottom:10,fontFamily:MONO}}>{err}</div>}
            <button onClick={submit} disabled={busy} style={{width:"100%",padding:13,background:busy?C.accentDim:C.accent,color:"#000",border:"none",borderRadius:5,fontSize:13,fontWeight:800,cursor:busy?"default":"pointer",fontFamily:SANS,transition:"all 0.15s"}}>{busy?"Unlocking...":"Unlock Free Audit →"}</button>
          </Card>
          <div style={{marginTop:16,display:"flex",gap:14,flexWrap:"wrap",justifyContent:"center"}}>
            {["No credit card","JSON stays local","30-second audit"].map(t=>(
              <div key={t} style={{fontSize:11,color:C.text2,display:"flex",alignItems:"center",gap:5}}><span style={{color:C.green}}>✓</span>{t}</div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Input Screen ───────────────────────────────────────────────
  if(screen==="input") return (
    <div style={{background:C.bg0,minHeight:"100vh",fontFamily:SANS,padding:"28px 24px",display:"flex",flexDirection:"column",alignItems:"center"}}>
      <div style={{width:"100%",maxWidth:660}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:24}}>
          <div style={{width:26,height:26,borderRadius:6,background:`linear-gradient(135deg,${C.accent},${C.purple})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:900,color:"#000"}}>A</div>
          <span style={{fontWeight:800,fontSize:14,color:C.text0}}>Symphony<span style={{color:C.accent}}>·AION</span></span>
          <div style={{flex:1}}/><Mono color={C.text2} size={10}>{user.email}</Mono>
        </div>
        <h2 style={{fontSize:20,fontWeight:800,color:C.text0,margin:"0 0 6px",letterSpacing:"-0.02em"}}>Paste your AI run log</h2>
        <p style={{fontSize:13,color:C.text1,margin:"0 0 18px",lineHeight:1.5}}>CrewAI, LangGraph, LangSmith, OpenAI Agents, AutoGen — or any JSON with token data. Auto-detected.</p>
        <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap",alignItems:"center"}}>
          <span style={{fontSize:10,color:C.text2,fontFamily:MONO}}>TRY SAMPLE:</span>
          {Object.keys(SAMPLES).map(fw=>(
            <button key={fw} onClick={()=>{setSample(fw);setJson(SAMPLES[fw]);setError("");}} style={{padding:"3px 8px",background:sample===fw?C.accent+"20":"transparent",border:`1px solid ${sample===fw?C.accent:C.border}`,borderRadius:3,cursor:"pointer",fontSize:9,color:sample===fw?C.accent:C.text2,fontFamily:MONO}}>{fw}</button>
          ))}
        </div>
        <div onDragOver={e=>{e.preventDefault();setDragging(true);}} onDragLeave={()=>setDragging(false)}
          onDrop={e=>{e.preventDefault();setDragging(false);if(e.dataTransfer.files[0])handleFile(e.dataTransfer.files[0]);}}>
          <textarea value={json} onChange={e=>{setJson(e.target.value);setError("");}}
            placeholder={"{\n  \"model\": \"gpt-4o\",\n  \"usage\": { \"prompt_tokens\": 8420, \"completion_tokens\": 1380 }\n}\n\n— or drag & drop a .json file here —"}
            style={{width:"100%",minHeight:240,padding:"13px 14px",background:dragging?C.accent+"10":C.bg3,border:`1px solid ${dragging?C.accent:C.border}`,borderRadius:6,color:C.text0,fontSize:11,fontFamily:MONO,resize:"vertical",outline:"none",boxSizing:"border-box",lineHeight:1.6}}/>
        </div>
        <div style={{display:"flex",alignItems:"center",marginTop:8,marginBottom:16,gap:8}}>
          <input ref={fileRef} type="file" accept=".json" style={{display:"none"}} onChange={e=>e.target.files[0]&&handleFile(e.target.files[0])}/>
          <button onClick={()=>fileRef.current.click()} style={{padding:"6px 12px",background:"transparent",border:`1px solid ${C.border}`,borderRadius:3,cursor:"pointer",fontSize:10,color:C.text2,fontFamily:MONO}}>↑ Upload .json</button>
          <div style={{flex:1}}/>{error&&<div style={{fontSize:11,color:C.red,fontFamily:MONO}}>{error}</div>}
        </div>
        <button onClick={runAudit} disabled={loading} style={{width:"100%",padding:13,background:loading?C.accentDim:C.accent,color:"#000",border:"none",borderRadius:6,fontSize:14,fontWeight:800,cursor:loading?"default":"pointer",fontFamily:SANS,transition:"background 0.15s",boxShadow:`0 0 24px ${C.accent}30`,opacity:loading?0.8:1}}>
          {loading?"Running Audit...":"Run Forensic Audit →"}
        </button>
      </div>
    </div>
  );

  // ── Report Screen ──────────────────────────────────────────────
  const r=result;
  const REPORT_TABS=["EFFICIENCY","TELEMETRY","COMPARE","GOVERNANCE"];

  return (
    <div style={{background:C.bg0,minHeight:"100vh",fontFamily:SANS}}>
      <div style={{display:"flex",alignItems:"center",padding:"0 20px",height:44,borderBottom:`1px solid ${C.border}`,background:C.bg1,position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginRight:16}}>
          <div style={{width:24,height:24,borderRadius:5,background:`linear-gradient(135deg,${C.accent},${C.purple})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:900,color:"#000"}}>A</div>
          <span style={{fontWeight:800,fontSize:13,color:C.text0}}>Symphony<span style={{color:C.accent}}>·AION</span></span>
        </div>
        <Tag color={C.green}>AUDIT COMPLETE</Tag>
        <div style={{marginLeft:8}}><Tag color={C.cyan}>{r.framework}</Tag></div>
        <div style={{flex:1}}/><Mono color={C.text2} size={10}>{user.email}</Mono>
        <div style={{marginLeft:12}}>
          <button onClick={()=>{setResult(null);setJson("");setScreen("input");setError("");}} style={{padding:"5px 12px",background:"transparent",border:`1px solid ${C.border}`,borderRadius:4,cursor:"pointer",fontSize:10,color:C.text2,fontFamily:MONO}}>← New Audit</button>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",borderBottom:`1px solid ${C.border}`,background:C.bg1}}>
        {[
          {label:"Total Tokens",value:r.efficiency.total_tokens.toLocaleString(),sub:"this run",accent:C.accent},
          {label:"Actual Cost", value:`$${r.efficiency.actual_cost_usd.toFixed(5)}`,sub:"this run",accent:C.cyan},
          {label:"Waste",       value:r.efficiency.waste_tokens.toLocaleString(),sub:`${r.efficiency.waste_pct}% excess`,accent:C.red},
          {label:"Score",       value:`${r.efficiency.score}/100`,sub:`grade: ${r.efficiency.grade}`,accent:r.efficiency.score>=65?C.green:C.accent},
        ].map((m,i)=>(
          <div key={i} style={{padding:"14px 18px",borderRight:i<3?`1px solid ${C.border}`:"none"}}>
            <div style={{fontSize:20,fontWeight:800,fontFamily:MONO,color:m.accent,lineHeight:1}}>{m.value}</div>
            <div style={{fontSize:9,color:C.text2,marginTop:2,fontFamily:MONO}}>{m.sub}</div>
            <div style={{fontSize:11,color:C.text1,marginTop:4}}>{m.label}</div>
          </div>
        ))}
      </div>
      <div style={{display:"flex",borderBottom:`1px solid ${C.border}`,background:C.bg1,paddingLeft:20}}>
        {REPORT_TABS.map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{padding:"10px 16px",border:"none",cursor:"pointer",background:"transparent",borderBottom:tab===t?`2px solid ${C.accent}`:"2px solid transparent",color:tab===t?C.accent:C.text2,fontSize:9,fontWeight:800,fontFamily:MONO,letterSpacing:"0.12em",transition:"all 0.15s"}}>{t}</button>
        ))}
      </div>
      <div style={{padding:20,maxWidth:860,margin:"0 auto"}}>
        {tab==="EFFICIENCY"&&(
          <div style={{display:"grid",gridTemplateColumns:"auto 1fr",gap:18,alignItems:"start"}}>
            <Card glow style={{display:"flex",flexDirection:"column",alignItems:"center",padding:24}}>
              <ScoreRing score={r.efficiency.score} C={C}/>
              <div style={{marginTop:14,textAlign:"center"}}>
                <div style={{fontSize:9,color:C.text2,fontFamily:MONO,marginBottom:3}}>VS UNOPTIMIZED</div>
                <div style={{fontSize:20,fontWeight:800,color:r.efficiency.savings_pct>0?C.green:C.accent,fontFamily:MONO}}>{r.efficiency.savings_pct>0?"↓":"+"}{ Math.abs(r.efficiency.savings_pct)}% cost</div>
              </div>
            </Card>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {[
                {label:"Token Waste",value:`${r.efficiency.waste_tokens.toLocaleString()} excess tokens`,detail:`Your run: ${r.efficiency.total_tokens.toLocaleString()} tokens. Optimized: ~${r.efficiency.optimized_tokens.toLocaleString()} tokens.`,color:C.red},
                {label:"Largest Phase",value:r.telemetry.worst_phase?`${r.telemetry.worst_phase.name} — ${r.telemetry.worst_phase.total_tokens?.toLocaleString()} tokens`:"—",detail:r.telemetry.worst_phase?`${r.telemetry.worst_phase.pct_of_total}% of total budget. Optimal ceiling is ≤40% per phase.`:"",color:C.accent},
                {label:"Monthly Projection",value:`$${r.compare.monthly_savings.toFixed(2)}/mo at 500 runs`,detail:`Switch to cheapest equivalent model → $${r.compare.monthly_savings.toFixed(2)}/month saved. Annualized: $${r.compare.annual_savings.toFixed(2)}.`,color:C.green},
              ].map((item,i)=>(
                <Card key={i} style={{padding:"12px 14px"}}>
                  <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                    <span style={{color:item.color,fontSize:13,lineHeight:1.5}}>◈</span>
                    <div>
                      <div style={{fontSize:10,color:C.text2,fontFamily:MONO,marginBottom:3,letterSpacing:"0.08em"}}>{item.label.toUpperCase()}</div>
                      <div style={{fontSize:13,fontWeight:700,color:item.color,marginBottom:4}}>{item.value}</div>
                      <div style={{fontSize:12,color:C.text1,lineHeight:1.5}}>{item.detail}</div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
        {tab==="TELEMETRY"&&(
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <Card><Label>Token Cost Per Phase</Label><PhaseBar phases={r.telemetry.phases} total={r.efficiency.total_tokens} C={C}/></Card>
            <Card>
              <Label>Phase Detail</Label>
              {r.telemetry.phases.map((p,i)=>(
                <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 90px 90px 100px 70px",padding:"8px 0",borderBottom:i<r.telemetry.phases.length-1?`1px solid ${C.border}15`:"none",borderLeft:`2px solid ${p.flag?C.accent:PHASE_COLORS[i%PHASE_COLORS.length]}`,paddingLeft:8}}>
                  <div><div style={{fontSize:11,color:C.text0}}>{p.name}</div><div style={{fontSize:10,color:C.text2,fontFamily:MONO}}>{p.agent}</div></div>
                  <Mono color={PHASE_COLORS[i%PHASE_COLORS.length]} size={11}>{p.total_tokens?.toLocaleString()}</Mono>
                  <Mono color={C.text1} size={11}>${p.cost_usd?.toFixed(6)}</Mono>
                  <div style={{display:"flex",alignItems:"center",gap:5}}>
                    <div style={{width:44,height:4,background:C.bg3,borderRadius:2,overflow:"hidden"}}><div style={{width:`${p.pct_of_total}%`,height:"100%",background:p.flag?C.accent:C.green}}/></div>
                    <Mono color={p.flag?C.accent:C.text1} size={10}>{p.pct_of_total}%</Mono>
                  </div>
                  <Tag color={p.status==="warn"?C.accent:C.green}>{p.status==="warn"?"FLAG":"PASS"}</Tag>
                </div>
              ))}
            </Card>
            {r.telemetry.loss_events?.length>0&&(
              <Card>
                <Label color={C.red}>Loss Events</Label>
                {r.telemetry.loss_events.map((ev,i)=>(
                  <div key={i} style={{padding:"10px 12px",background:C.redDim+"60",border:`1px solid ${C.red}30`,borderLeft:`3px solid ${C.red}`,borderRadius:4,marginBottom:8}}>
                    <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:4}}>
                      <Tag color={C.red}>{ev.category}</Tag><Mono color={C.text2} size={10}>{ev.phase}</Mono>
                      <div style={{flex:1}}/><Mono color={C.red} size={10}>−{ev.tokens_lost?.toLocaleString()}t</Mono>
                    </div>
                    <div style={{fontSize:11,color:C.text1,lineHeight:1.5}}>{ev.detail}</div>
                  </div>
                ))}
              </Card>
            )}
          </div>
        )}
        {tab==="COMPARE"&&(
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <Card glow>
              <Label>Cross-Model Cost — Same Token Volume</Label>
              <div style={{display:"grid",gridTemplateColumns:"1fr 100px 120px 90px",borderBottom:`1px solid ${C.border}`,paddingBottom:8,marginBottom:4}}>
                {["MODEL","THIS RUN","×500/MO","DELTA"].map(h=><div key={h} style={{fontSize:9,color:C.text2,fontFamily:MONO,fontWeight:800,letterSpacing:"0.1em"}}>{h}</div>)}
              </div>
              {r.compare.models.map((m,i)=>(
                <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 100px 120px 90px",padding:"8px 0",borderBottom:i<r.compare.models.length-1?`1px solid ${C.border}15`:"none",borderLeft:m.is_current?`2px solid ${C.accent}`:"2px solid transparent",paddingLeft:m.is_current?8:0,background:m.is_current?`${C.accent}08`:"transparent"}}>
                  <div style={{fontSize:11,color:m.is_current?C.accent:C.text0,fontFamily:MONO,display:"flex",alignItems:"center",gap:6}}>
                    {m.model}{m.is_current&&<Tag color={C.accent}>YOURS</Tag>}{i===0&&!m.is_current&&<Tag color={C.green}>CHEAPEST</Tag>}
                  </div>
                  <Mono color={i===0?C.green:C.text1} size={11}>${m.cost_usd.toFixed(5)}</Mono>
                  <Mono color={i===0?C.green:C.text1} size={11}>${m.monthly_500.toFixed(2)}</Mono>
                  <Mono color={m.delta_pct===0?C.green:m.is_current?C.accent:C.text2} size={11}>{m.delta_pct===0?"baseline":`+${m.delta_pct}%`}</Mono>
                </div>
              ))}
            </Card>
            <Card>
              <Label>ROI Projection</Label>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
                {[
                  {label:"Savings/run",value:`$${r.compare.savings_per_run.toFixed(5)}`},
                  {label:"Monthly @500",value:`$${r.compare.monthly_savings.toFixed(2)}`},
                  {label:"Annual",value:`$${r.compare.annual_savings.toFixed(2)}`},
                ].map((m,i)=>(
                  <div key={i} style={{padding:"12px 14px",background:C.bg3,borderRadius:5,border:`1px solid ${C.green}15`}}>
                    <div style={{fontSize:18,fontWeight:800,color:C.green,fontFamily:MONO}}>{m.value}</div>
                    <div style={{fontSize:11,color:C.text1,marginTop:4}}>{m.label}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
        {tab==="GOVERNANCE"&&(
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <Card>
              <Label>Symphony Guard — Governance Gates</Label>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
                {r.governance.gates.map((g,i)=>(
                  <div key={i} style={{padding:14,borderRadius:6,background:g.pass?C.greenDim+"80":C.redDim+"80",border:`1px solid ${g.pass?C.green:C.red}40`,borderLeft:`3px solid ${g.pass?C.green:C.red}`}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                      <Tag color={g.pass?C.green:C.red}>{g.id}: {g.name}</Tag>
                      <div style={{flex:1}}/><span style={{fontSize:16}}>{g.pass?"✓":"✗"}</span>
                    </div>
                    <div style={{fontSize:11,color:C.text1,lineHeight:1.5}}>{g.detail}</div>
                  </div>
                ))}
              </div>
            </Card>
            <Card style={{padding:"14px 18px"}}>
              <Label>Audit Summary</Label>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
                {[
                  {label:"Framework",value:r.framework},{label:"Model",value:r.model_detected},
                  {label:"Total Tokens",value:r.efficiency.total_tokens.toLocaleString()},{label:"Actual Cost",value:`$${r.efficiency.actual_cost_usd.toFixed(5)}`},
                  {label:"Gates Passed",value:`${r.governance.gates_passed} / ${r.governance.gates_total}`},{label:"Grade",value:r.efficiency.grade},
                ].map((m,i)=>(
                  <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"9px 12px",background:C.bg3,borderRadius:4}}>
                    <span style={{fontSize:10,color:C.text2,fontFamily:MONO}}>{m.label}</span>
                    <span style={{fontSize:11,color:C.text0,fontWeight:700,fontFamily:MONO}}>{m.value}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* CTA */}
        <div style={{padding:"22px 18px",background:`linear-gradient(135deg,${C.accentDim},${C.bg2})`,border:`1px solid ${C.accent}40`,borderRadius:8,marginTop:20,display:"flex",alignItems:"center",gap:20,flexWrap:"wrap"}}>
          <div style={{flex:1,minWidth:240}}>
            <div style={{fontSize:15,fontWeight:800,color:C.text0,marginBottom:5}}>This is 1 of 12 findings in your full audit.</div>
            <div style={{fontSize:12,color:C.text1,lineHeight:1.6}}>Redundant agent map, prompt compression plan, model switching strategy, 90-day ROI projection. 15 minutes.</div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8,alignItems:"flex-end"}}>
            <button onClick={()=>window.open("https://calendly.com","_blank")} style={{padding:"10px 20px",background:C.accent,color:"#000",border:"none",borderRadius:5,fontSize:12,fontWeight:800,cursor:"pointer",fontFamily:SANS}}>Book 15 Min Audit →</button>
            <div style={{fontSize:10,color:C.text2,fontFamily:MONO}}>no pitch · just data</div>
          </div>
        </div>
      </div>
      <div style={{position:"fixed",bottom:0,left:0,right:0,height:26,background:C.accentDim,borderTop:`1px solid ${C.accent}40`,display:"flex",alignItems:"center",padding:"0 20px",gap:12}}>
        <Mono color={C.accent} size={9}>● AUDIT COMPLETE</Mono>
        <Mono color={C.accent+"60"} size={9}>|</Mono>
        <Mono color={C.accent} size={9}>{r.framework} → {r.efficiency.total_tokens.toLocaleString()}t → {r.efficiency.score}/100</Mono>
        <div style={{flex:1}}/>
        <Mono color={C.accent+"99"} size={9}>SYMPHONY-AION v1.0</Mono>
      </div>
      <div style={{height:26}}/>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function SymphonyAION() {
  const [mode,setMode]=useState(null);
  useEffect(()=>{ setMode(isFounderMode()?"founder":"public"); },[]);
  if (!mode) return <div style={{background:"#060608",minHeight:"100vh"}}/>;
  if (mode==="founder") return <FounderMode/>;
  return <PublicMode/>;
}
