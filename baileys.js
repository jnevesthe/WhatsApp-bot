const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason
} = require('@whiskeysockets/baileys')

const P = require('pino')
const readline = require('readline')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function perguntarNumero() {
  return new Promise(resolve => {
    rl.question('Digite seu número com código do país (ex: 244912345678): ', num => {
      rl.close()
      resolve(num.replace(/\D/g, ''))
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
let xp = {} // mensagens por usuário

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth')

  const sock = makeWASocket({
    logger: P({ level: 'silent' }),
    auth: state
  })

  sock.ev.on('creds.update', saveCreds)

  // ===== Conexão =====
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update

    if (connection === 'open') {
      console.log('✅ Bot conectado!')
    }

    if (connection === 'close') {
      const reason = lastDisconnect?.error?.output?.statusCode
      console.log('❌ Conexão fechada:', reason)
      if (reason !== DisconnectReason.loggedOut) {
        console.log('🔁 Reconectando...')
        startBot()
      }
    }
  })

  // ===== Mensagens =====
  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0]
    if (!msg.message || msg.key.fromMe) return

    const from = msg.key.remoteJid
    const isGroup = from.endsWith('@g.us')
    const sender = msg.key.participant || msg.key.remoteJid

    if (!isGroup) return

    const text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      ''

    const groupMetadata = await sock.groupMetadata(from)
    const participants = groupMetadata.participants

    const isAdmin = jid => participants.find(p => p.id === jid)?.admin

    // ===== XP / LEVEL =====
    xp[sender] = (xp[sender] || 0) + 1
    const level = Math.floor(xp[sender] / 50)

    // ===== MUTE AUTOMÁTICO =====
    if (muted.has(sender)) {
      await sock.groupParticipantsUpdate(from, [sender], 'remove')
      return
    }

    const reply = (text, mentions = []) =>
      sock.sendMessage(from, { text, mentions })

    const command = text.split(' ')[0].toLowerCase()

    // ===== COMANDOS PRINCIPAIS =====
    if (command === '/menu') {
      return reply(
`MENU DO BOT
/todos
/ban @user
/desban @user
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

    if (command === '/todos') {
      let t = 'Todos:\n'
      let m = []
      participants.forEach(p => {
        t += `@${p.id.split('@')[0]} `
        m.push(p.id)
      })
      return reply(t, m)
    }

    if (command === '/ban') {
      if (!isAdmin(sender)) return reply('❌ Só admins podem banir')
      const target = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
      if (!target) return reply('❌ Marque alguém')
      if (isAdmin(target)) return reply('❌ Não posso banir admin')
      await sock.groupParticipantsUpdate(from, [target], 'remove')
      return reply('🚫 Usuário banido')
    }

    if (command === '/desban') {
      if (!isAdmin(sender)) return reply('❌ Só admins')
      return reply('ℹ️ WhatsApp não permite re-adicionar automaticamente. Use o link do grupo.')
    }

    if (command === '/mutar') {
      if (!isAdmin(sender)) return reply('❌ Só admins')
      const target = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
      if (!target) return reply('❌ Marque alguém')
      muted.add(target)
      return reply('🔇 Usuário mutado')
    }

    if (command === '/promover') {
      if (!isAdmin(sender)) return reply('❌ Só admins')
      const target = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
      if (!target) return reply('❌ Marque alguém')
      await sock.groupParticipantsUpdate(from, [target], 'promote')
      return reply('⬆️ Usuário promovido a admin')
    }

    if (command === '/rico') {
      const p = participants[Math.floor(Math.random() * participants.length)]
      return reply(`💰 O mais rico é @${p.id.split('@')[0]}`, [p.id])
    }

    if (command === '/pobre') {
      const p = participants[Math.floor(Math.random() * participants.length)]
      return reply(`🪙 O mais pobre é @${p.id.split('@')[0]}`, [p.id])
    }

    if (command === '/rank') {
      let ranking = Object.entries(xp).sort((a, b) => b[1] - a[1]).slice(0, 5)
      let txt = '🏆 TOP ATIVOS:\n'
      let m = []
      ranking.forEach(([jid, msgs], i) => {
        txt += `${i + 1}. @${jid.split('@')[0]} — ${msgs} msgs\n`
        m.push(jid)
      })
      return reply(txt, m)
    }

    if (command === '/nivel') {
      return reply(`📊 Nível: ${level}\n📨 Mensagens: ${xp[sender]}`)
    }

    if (command === '/levelup') {
      if (!isAdmin(sender)) return reply('❌ Só admins')
      const target = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
      if (!target) return reply('❌ Marque alguém')
      xp[target] = (xp[target] || 0) + 50
      return reply('⬆️ Level aumentado')
    }

    // ===== COMANDOS ESPECIAIS (CORRIGIDOS PARA MARCAR) =====
    if (command === '/roludo') {
      const jid = usuarios.JN
      await sock.sendMessage(from, {
        text: `O mais roludo é @${jid.split('@')[0]}`,
        contextInfo: { mentionedJid: [jid] }
      })
    }

    if (command === '/santa') {
      const jid = usuarios.Lara
      await sock.sendMessage(from, {
        text: `Vai marcar @${jid.split('@')[0]}`,
        contextInfo: { mentionedJid: [jid] }
      })
    }

    if (command === '/corno') {
      const jid = usuarios.Fábio
      await sock.sendMessage(from, {
        text: `Vai marcar @${jid.split('@')[0]}`,
        contextInfo: { mentionedJid: [jid] }
      })
    }

    if (command === '/maisbonita') {
      const nomes = ['Lara', 'Bruna', 'Nih']
      const escolha = nomes[Math.floor(Math.random() * nomes.length)]
      const jid = usuarios[escolha]
      await sock.sendMessage(from, {
        text: `Vai marcar @${jid.split('@')[0]}`,
        contextInfo: { mentionedJid: [jid] }
      })
    }

    if (command === '/info') {
      const jid = usuarios.JN
      await sock.sendMessage(from, {
        text: `Esse bot foi desenvolvido por @${jid.split('@')[0]}`,
        contextInfo: { mentionedJid: [jid] }
      })
    }

  })
}

// ===== INICIAR BOT =====
startBot()
