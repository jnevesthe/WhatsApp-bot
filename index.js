const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const client = new Client();

let mutados = new Set();

client.on('qr', qr => {
    qrcode.generate(qr, { small: false }); // QR Code maior
    console.log('📱 Escaneie o QR Code acima com o WhatsApp');
});


client.on('ready', () => {
    console.log('🤖 Bot online');
});

client.on('message', async msg => {
    const chat = await msg.getChat();

    // remover quem está mutado
    if (mutados.has(msg.author)) {
        await chat.removeParticipants([msg.author]);
        return;
    }

    // MENU
    if (msg.body === '/menu') {
        msg.reply(
`📜 *MENU DO BOT*
/menu
/admins
/todos
/info
/regras
/listar
/ativos
/mutar @user
/desmutar @user
/ban @user
/avisar @user
/elogiar @user
/rank
/rico
/tempo
/sobre`
        );
    }

    // LISTAR MEMBROS
    if (msg.body === '/listar' && chat.isGroup) {
        let texto = '👥 Membros do grupo:\n';
        chat.participants.forEach(p => {
            texto += `- ${p.id.user}\n`;
        });
        msg.reply(texto);
    }

    // TODOS
    if (msg.body === '/todos' && chat.isGroup) {
        let texto = '📢 ';
        chat.participants.forEach(p => {
            texto += `@${p.id.user} `;
        });
        msg.reply(texto, null, {
            mentions: chat.participants.map(p => p.id._serialized)
        });
    }

    // MUTAR
    if (msg.body.startsWith('/mutar') && msg.hasQuotedMsg) {
        const q = await msg.getQuotedMessage();
        mutados.add(q.author);
        msg.reply('🔇 Usuário mutado');
    }

    // DESMUTAR
    if (msg.body.startsWith('/desmutar') && msg.hasQuotedMsg) {
        const q = await msg.getQuotedMessage();
        mutados.delete(q.author);
        msg.reply('🔊 Usuário desmutado');
    }

    // BANIR
    if (msg.body.startsWith('/ban') && msg.hasQuotedMsg) {
        const q = await msg.getQuotedMessage();
        await chat.removeParticipants([q.author]);
        msg.reply('🚫 Usuário removido');
    }

    // ELOGIAR
    if (msg.body.startsWith('/elogiar') && msg.hasQuotedMsg) {
        msg.reply('✨ Essa pessoa é top demais!');
    }

    // RICO (ZOAÇÃO)
    if (msg.body === '/rico') {
        msg.reply('💰 O mais rico do grupo é… o Wi-Fi 😂');
    }

    // TEMPO
    if (msg.body === '/tempo') {
        msg.reply(`⏰ Hora atual: ${new Date().toLocaleTimeString()}`);
    }

    // SOBRE
    if (msg.body === '/sobre') {
        msg.reply('🤖 Bot criado por Josemar | WhatsApp Group Bot');
    }

    // YOUTUBE (placeholder)
    if (msg.body.startsWith('/musica')) {
        msg.reply('🎵 Envie o link do YouTube (função em desenvolvimento)');
    }
});

client.initialize();
