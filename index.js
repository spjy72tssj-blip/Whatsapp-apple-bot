const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const http = require('http');
http.createServer((req,res)=>res.end('Apple Bot OK')).listen(process.env.PORT||10000);

let games = {};
const PHONE_NUMBER = "22898123456"; // <--- TON NUMÉRO ICI SANS + et SANS ESPACE

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth');
  const sock = makeWASocket({ auth: state, printQRInTerminal: false, browser: ["Ubuntu","Chrome","20"] });
  sock.ev.on('creds.update', saveCreds);

  if(!state.creds.registered) {
    setTimeout(async () => {
      try {
        let code = await sock.requestPairingCode(PHONE_NUMBER);
        console.log(`\n\n========================`);
        console.log(`TON CODE: ${code}`);
        console.log(`WhatsApp > Appareils liés > Lier avec numéro`);
        console.log(`========================\n\n`);
      } catch(e){ console.log("Erreur:", e.message); }
    }, 4000);
  }

  sock.ev.on('connection.update', u => { if(u.connection==='open') console.log("✅ CONNECTE!"); });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0]; if(!msg.message || msg.key.fromMe) return;
    const txt = (msg.message.conversation || msg.message.extendedTextMessage?.text || "").trim().toLowerCase();
    const jid = msg.key.remoteJid;
    if(txt==='jouer' || txt==='menu') { games[jid]={l:1,m:1,t:[1,2,2,3,3],a:true}; await sock.sendMessage(jid,{text:`🍎 *APPLE ÉDUCATIF*\nÉtage 1/5 - Tape 1 à 5\nChance 80% - *proba* pour les maths`}); return; }
    if(['1','2','3','4','5'].includes(txt) && games[jid]?.a) {
      let g=games[jid]; let trap=[]; while(trap.length<g.t[g.l-1]){let r=Math.floor(Math.random()*5); if(!trap.includes(r)) trap.push(r);}
      if(trap.includes(parseInt(txt)-1)){ await sock.sendMessage(jid,{text:`💀 BOOM niveau ${g.l}\n${[0,1,2,3,4].map(i=>trap.includes(i)?'💀':'🍎').join(' ')}\n*jouer* pour recommencer`}); delete games[jid]; }
      else{ g.m+=0.7; g.l++; if(g.l>5){ await sock.sendMessage(jid,{text:`🏆 SOMMET! x${g.m.toFixed(2)} - Tu as fait partie des 4.6%!`}); delete games[jid]; } else await sock.sendMessage(jid,{text:`🍎 SAFE x${g.m.toFixed(2)}\nÉtage ${g.l}/5 - Tape 1-5 ou *stop*`}); }
    }
    if(txt==='stop' && games[jid]){ await sock.sendMessage(jid,{text:`✅ Encaissé x${games[jid].m.toFixed(2)}`}); delete games[jid]; }
    if(txt==='proba'){ await sock.sendMessage(jid,{text:`📊 *COURS DE PROBA:*\nNiv1: 80% (4/5)\nNiv2: 60% (3/5)\nNiv3: 60%\nNiv4: 40% (2/5)\nNiv5: 40%\nArriver au sommet = 0.8*0.6*0.6*0.4*0.4 = 4.6%`}); }
  });
}
startBot();
