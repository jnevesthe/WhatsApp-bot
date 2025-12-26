console.log('🚀 Bot iniciando...')

const {
  default: makeWASocket,
  useMultiFileAuthState
} = require('@whiskeysockets/baileys')

const P = require('pino')
const readline = require('readline')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function askNumber() {
  return new Promise(resolve => {
    rl.question('📱 Número com código do país: ', num => {
      rl.close()
      resolve(num.replace(/\D/g, ''))
    })
  })
}

async function startBot() {
  console.log('⚙️ Carregando autenticação...')
  const { state, saveCreds } = await useMultiFileAuthState('auth')

  console.log('🔌 Criando socket...')
  const sock = makeWASocket({
    auth: state,
    logger: P({ level: 'silent' })
  })

  sock.ev.on('creds.update', saveCreds)

  console.log('🔑 Gerando código...')
  const number = await askNumber()
  const code = await sock.requestPairingCode(number)

  console.log('\n🔗 CÓDIGO:\n')
  console.log(code.match(/.{1,4}/g).join('-'))
  console.log('\n📲 WhatsApp > Aparelhos conectados > Conectar com código\n')
}

startBot().catch(err => {
  console.error('❌ ERRO FATAL:', err)
})
