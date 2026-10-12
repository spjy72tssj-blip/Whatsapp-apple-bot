const { default: makeWASocket, useMultiFileAuthState, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');
const fs = require('fs');
const http = require('http');
http.createServer((req,res)=>res.end('Apple Bot OK')).listen(process.env.PORT||10000);

// RESTAURE LA SESSION DEPUIS RENDER ENV VAR
if(process.env.SESSION_ID){
  try{
    const data = Buffer.from(process.env.SESSION_ID, 'base64').toString();
    fs.mkdirSync('auth', {recursive:true});
    fs.writeFileSync('auth/creds.json', data);
    console.log("✅ SESSION RESTAURÉE");
  }catch(e){ console.log("Erreur session:", e.message); }
}

let games = {};
async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth');
  const sock = makeWASocket({
    auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, console.log) },
    printQRInTerminal: false,
    browser: ["Ubuntu","Chrome","20"]
  });
  sock.ev.on('creds.update', saveCreds);

  // Si pas de session, génère le code comme avant
  if(!state.creds.registered) {
    setTimeout(async () => {
      try{
        let code = await sock.requestPairingCode("22896352213");
        console.log(`\n\nTON CODE (à usage unique): ${code}\n\n`);
        console.log("Une fois connecté, tape ceci dans Shell pour récupérer ta SESSION:");
        console.log("cat auth/creds.json | base64 -w 0\n");
      }catch(e){ console.log(e.message); }
    }, 5000);
  }

  sock.ev.on('connection.update', async (u) => {
    if(u.connection==='open'){
      console.log("✅ CONNECTÉ! 22896352213");
      // Affiche la SESSION à copier
      try{
        const creds = fs.readFileSync('auth/creds.json','utf8');
        const session = Buffer.from(creds).toString('base64');
        console.log(`\n\n===== TA SESSION À SAUVEGARDER =====`);
        console.log(session);
        console.log(`===== FIN SESSION =====\n\n`);
        console.log("Copie ce long texte et mets le dans Render > Environment > SESSION_ID");
      }catch(e){}
    }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0]; if(!msg.message || msg.key.fromMe) return;
    const txt = (msg.message.conversation || msg.message.extendedTextMessage?.text || "").trim().toLowerCase();
    const jid = msg.key.remoteJid;
    if(txt==='jouer' || txt==='menu'){ games[jid]={l:1,m:1,t:[1,2,2,3,3],a:true}; await sock.sendMessage(jid,{text:`🍎 APPLE EDUCATIF\nEtage 1/5 - Tape 1-5\nChance 80%`}); return; }
    if(['1','2','3','4','5'].includes(txt) && games[jid]?.a){
      let g=games[jid]; let trap=[]; while(trap.length<g.t[g.l-1]){let r=Math.floor(Math.random()*5); if(!trap.includes(r)) trap.push(r);}
      if(trap.includes(parseInt(txt)-1)){ await sock.sendMessage(jid,{text:`💀 BOOM niv ${g.l} - ${[0,1,2,3,4].map(i=>trap.includes(i)?'💀':'🍎').join(' ')}`}); delete games[jid]; }
      else{ g.m+=0.7; g.l++; if(g.l>5){ await sock.sendMessage(jid,{text:`🏆 SOMMET x${g.m.toFixed(2)}!`}); delete games[jid]; } else await sock.sendMessage(jid,{text:`✅ SAFE x${g.m.toFixed(2)} Etage ${g.l}/5`}); }
    }
  });
}
startBot();
