console.log('🚀 Bot iniciando...')

const fs = require('fs')
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason
} = require('@whiskeysockets/baileys')
const P = require('pino')
const readline = require('readline')

// ===== Interface de leitura para pegar número =====
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function askNumber() {
  return new Promise(resolve => {
    rl.question('📱 Número com código do país: ', num => {
      rl.close()
      resolve(num.replace(/\D/g, '')) // remove caracteres não numéricos
    })
  })
}

// ===== Lista de usuários fixos =====
const usuarios = {
  JN: '244951648320@s.whatsapp.net',
  Lara: '351925251857@s.whatsapp.net',
  Bruna: '351964236577@s.whatsapp.net',
  Nih: '351966948495@s.whatsapp.net',
  Fábio: '351930630881@s.whatsapp.net'
}

// ===== Dados do bot =====
let muted = new Set()
let banned = new Set()
let xp = {}

// ===== Função para pegar autenticação =====
async function getAuth() {
  if (fs.existsSync('./auth')) {
    console.log('🔑 Sessão encontrada. Conectando automaticamente...')
    return useMultiFileAuthState('auth')
  } else {
    console.log('📲 Primeira vez. Digite seu número para gerar sessão via QR')
    const { state, saveCreds } = await useMultiFileAuthState('auth')
    const number = await askNumber()
    console.log(`💡 Escaneie o QR code no WhatsApp para o número: ${number}`)
    return { state, saveCreds }
  }
}

// ===== Função principal do bot =====
async function startBot() {
  const { state, saveCreds } = await getAuth()

  // ===== Criação do socket =====
  const sock = makeWASocket({
    auth: state,
    logger: P({ level: 'silent' })
  })

  sock.ev.on('creds.update', saveCreds)

  // ===== Monitoramento de conexão =====
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update
    if (connection === 'open') console.log('✅ Bot conectado!')
    if (connection === 'close') {
      const reason = lastDisconnect?.error?.output?.statusCode
      console.log('❌ Conexão fechada:', reason)
      if (reason !== DisconnectReason.loggedOut) startBot()
    }
  })

  // ===== Recebimento de mensagens =====
  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0]
    if (!msg.message || msg.key.fromMe) return

    const from = msg.key.remoteJid
    const isGroup = from.endsWith('@g.us') // Verifica se é grupo
    const sender = msg.key.participant || msg.key.remoteJid

    const text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      ''

    const mentions =
      msg.message.extendedTextMessage?.contextInfo?.mentionedJid || []

    // ===== Participantes do grupo (se aplicável) =====
    let participants = []
    if (isGroup) {
      const groupMetadata = await sock.groupMetadata(from)
      participants = groupMetadata.participants
    }

    const isAdmin = jid => participants.find(p => p.id === jid)?.admin

    // ===== RESPONDER SE MARCAR @JN =====
    if (mentions.includes(usuarios.JN)) {
      await sock.sendMessage(from, {
        text: 'O mais Roludo',
        mentions: [usuarios.JN]
      })
    }

    // ===== XP do usuário =====
    xp[sender] = (xp[sender] || 0) + 1

    // ===== Remove mutados do grupo =====
    if (muted.has(sender) && isGroup) {
      await sock.groupParticipantsUpdate(from, [sender], 'remove')
      return
    }

    // ===== Ignora banidos =====
    if (banned.has(sender)) return

    const reply = (text, mentions = []) =>
      sock.sendMessage(from, { text, mentions })

    const command = text.split(' ')[0].toLowerCase()

    // ===== COMANDOS =====

    // ---------- MENU ----------
    if (command === '/menu') {
      return reply(
`MENU DO BOT
/todos
/ban @user
/desban
/mutar @user
/promover @user
/rico
/pobre
/rank
/nivel
/levelup @user
/roludo
/santa
/corno
/maisbonita
/info`
      )
    }

    // ---------- TODOS (grupo) ----------
    else if (command === '/todos' && isGroup) {
      let t = 'Todos:\n'
      let m = []
      participants.forEach(p => {
        t += `@${p.id.split('@')[0]} `
        m.push(p.id)
      })
      return reply(t, m)
    }

    // ---------- MENÇÕES FIXAS ----------
    else if (command === '/roludo') {
      const jid = usuarios.JN
      return reply(`O mais roludo é @${jid.split('@')[0]}`, [jid])
    }

    else if (command === '/santa') {
      const jid = usuarios.Lara
      return reply(`A mais santa é @${jid.split('@')[0]}`, [jid])
    }

    else if (command === '/corno') {
      const jid = usuarios.Fábio
      return reply(`O mais corno é @${jid.split('@')[0]}`, [jid])
    }

    else if (command === '/maisbonita') {
      const lista = ['Lara', 'Bruna', 'Nih']
      const nome = lista[Math.floor(Math.random() * lista.length)]
      const jid = usuarios[nome]
      return reply(`A mais bonita é @${jid.split('@')[0]}`, [jid])
    }

    else if (command === '/info') {
      const jid = usuarios.JN
      return reply(`Esse bot foi desenvolvido por @${jid.split('@')[0]}`, [jid])
    }

    // ---------- BAN ----------
    else if (command === '/ban' && isGroup) {
      if (!isAdmin(sender)) return reply('❌ Apenas admins podem banir.')
      if (mentions.length === 0) return reply('❌ Marque alguém para banir.')
      mentions.forEach(jid => banned.add(jid))
      return reply(`✅ Usuário(s) banido(s).`, mentions)
    }

    // ---------- DESBAN ----------
    else if (command === '/desban' && isGroup) {
      if (!isAdmin(sender)) return reply('❌ Apenas admins podem desbanir.')
      if (mentions.length === 0) return reply('❌ Marque alguém para desbanir.')
      mentions.forEach(jid => banned.delete(jid))
      return reply(`✅ Usuário(s) desbanido(s).`, mentions)
    }

    // ---------- MUTAR ----------
    else if (command === '/mutar' && isGroup) {
      if (!isAdmin(sender)) return reply('❌ Apenas admins podem mutar.')
      if (mentions.length === 0) return reply('❌ Marque alguém para mutar.')
      mentions.forEach(jid => muted.add(jid))
      return reply(`✅ Usuário(s) mutado(s).`, mentions)
    }

    // ---------- PROMOVER ----------
    else if (command === '/promover' && isGroup) {
      if (!isAdmin(sender)) return reply('❌ Apenas admins podem promover.')
      if (mentions.length === 0) return reply('❌ Marque alguém para promover.')
      await sock.groupParticipantsUpdate(from, mentions, 'promote')
      return reply(`✅ Usuário(s) promovido(s).`, mentions)
    }

    // ---------- RICO ----------
    else if (command === '/rico') {
      const lista = isGroup ? participants.map(p => p.id) : [sender]
      const nome = lista[Math.floor(Math.random() * lista.length)]
      return reply(`O mais rico é @${nome.split('@')[0]}`, [nome])
    }

    // ---------- POBRE ----------
    else if (command === '/pobre') {
      const lista = isGroup ? participants.map(p => p.id) : [sender]
      const nome = lista[Math.floor(Math.random() * lista.length)]
      return reply(`O mais pobre é @${nome.split('@')[0]}`, [nome])
    }

    // ---------- RANK / NÍVEL ----------
    else if ((command === '/rank' || command === '/nivel') && isGroup) {
      const ranking = Object.entries(xp)
        .sort((a, b) => b[1] - a[1])
        .map(([jid, xp]) => `@${jid.split('@')[0]} - XP: ${xp}`)
        .join('\n')
      return reply(`🏆 Ranking XP:\n${ranking}`, Object.keys(xp))
    }

    // ---------- LEVELUP ----------
    else if (command === '/levelup' && isGroup) {
      if (mentions.length === 0) return reply('❌ Marque alguém para dar level up.')
      mentions.forEach(jid => {
        xp[jid] = (xp[jid] || 0) + 50
      })
      return reply(`✅ Level up aplicado!`, mentions)
    }

  })
}

// ===== INICIA BOT =====
startBot().catch(err => {
  console.error('❌ ERRO FATAL:', err)
})
