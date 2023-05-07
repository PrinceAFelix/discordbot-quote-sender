require('dotenv/config');
const express = require('express');
const axios = require('axios');

const CronJob = require('cron').CronJob;

const { Client, GatewayIntentBits, REST, Routes, EmbedBuilder } = require('discord.js');


var admin = require("firebase-admin");

var serviceAccount = require("./firebase.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseUrl: process.env.FIREBASE_URL,
});

const date = new Date();

const DB = admin.firestore();
const collectionRef = DB.collection('quotes');
const testnumRef = DB.collection('number');
// const collectionRef = DB.collection('test');
// const testnumRef = DB.collection('testnum');

function VerifyDiscordRequest(clientKey) {
    return function (req, res, buf, encoding) {
        const signature = req.get('X-Signature-Ed25519');
        const timestamp = req.get('X-Signature-Timestamp');

        const isValidRequest = verifyKey(buf, signature, timestamp, clientKey);
        if (!isValidRequest) {
            res.status(401).send('Bad request signature');
            throw new Error('Bad request signature');
        }
    };




}

const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN)


// Create an express app
const app = express();

const PORT = process.env.PORT || 3000;

// Parse request body and verifies incoming requests using discord-interactions package
app.use(express.json({ verify: VerifyDiscordRequest(process.env.PUBLIC_KEY) }));

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent,
    ],
    partials: ['CHANNEL']
});


client.on('ready', async () => {
    console.log(`${client.user.tag} has logged in!`)
    const job = new CronJob('0 9 * * *', () => {
        embedLayout.spliceFields(0, 25)
        setIndex().then(i => {
            searchQuote(i.index).then((quote) => {
                sendMessage(quote, true);
                console.log('Daily Quote Sent: ' + getTimeDate(date))
            })
        })
    }, null, true, 'America/Toronto');
    job.start();
})




client.on('messageCreate', async message => {


    if (!message.author.bot || message.channel.type === '1') {
        if (message.content.toLocaleLowerCase() == 'quotes') {
            embedLayout.spliceFields(0, 25)
            setIndex().then(i => {
                searchQuote(i.index).then((quote) => {
                    sendMessage(quote, false);
                })
            })
            console.log('Quote Sent: ' + getTimeDate(date))
        } else if (message.content.toLocaleLowerCase() === 'hi') {
            message.reply('hello')
        } else {
            return;
        }

        return;


    }



})


const setIndex = async () => {

    const snapshot = await testnumRef.orderBy('index').limit(1).get();


    if (!snapshot.empty) {
        const document = snapshot.docs[0];
        testnumRef.doc(snapshot.docs[0].id).delete()
        return document.data();
    }

    return null;
};



const sendMessage = (quote, isDaily) => {

    client.users.fetch(`${process.env.USERID}`, false).then((user) => {
        getGif()
            .then((link) => {

                embedLayout.setTitle(isDaily ? 'Good Morning Leticiaaaaa' : 'Annyeonghaseyo ヅ')
                embedLayout.setDescription(isDaily ? `Here's your daily quotes quote of the day!` : '🐷🐰🐥🐢')
                embedLayout.addFields({ name: '\u200B', value: '\u200B' })
                embedLayout.addFields({ name: `"${quote.quote}"`, value: '\u200B' })

                embedLayout.setImage(`${link}`)

                embedLayout.addFields({ name: '\u200B', value: '\u200B' })
                user.send({ embeds: [embedLayout] })

            })
            .catch((error) => {
                console.error(error);
            });

    });


}

// Perform a binary search for a quote with a specific ID
const searchQuote = async (id) => {

    const snapshot = await collectionRef.orderBy('id').get();

    let low = 0;
    let high = snapshot.size - 1;

    while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        const quote = snapshot.docs[mid].data();

        if (quote.id === id) {
            await collectionRef.doc(snapshot.docs[mid].id).delete();
            return quote;
        } else if (quote.id < id) {
            low = mid + 1;
        } else {
            high = mid - 1;
        }
    }

    return null;

};

const getQuote = () => {

    const index = Math.floor(Math.random() * yourDailyQuotes.length);
    const yourQuote = yourDailyQuotes[index];

    yourDailyQuotes.splice(index, 1);

    return yourQuote;
}

const getGif = async () => {
    const API_KEY = process.env.GIF_KEY;
    const API_URL = `https://api.giphy.com/v1/gifs/search`;

    const response = await axios.get(API_URL, {
        params: {
            api_key: API_KEY,
            q: `minions`,
            limit: 50,
            rating: 'G',
        }
    });


    const randomIndex = Math.floor(Math.random() * response.data.data.length);
    const gif = response.data.data[randomIndex];

    return gif.images.original.url;
}

function getTimeDate(date) {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const year = date.getFullYear();
    let hours = date.getHours();
    const minutes = date.getMinutes();

    const amPm = hours < 12 ? 'AM' : 'PM';

    if (hours > 12) {
        hours -= 12;
    } else if (hours === 0) {
        hours = 12;
    }

    return `${month}/${day}/${year} @ ${hours}:${minutes}${amPm}`;
}


// const lib = require('lib')({token: process.env.STDLIB_SECRET_TOKEN});


let embedLayout = new EmbedBuilder()
    .setColor(0xff7700)
    .setTimestamp()
    .setFooter({ text: `Sent` });





const main = {
    commands: [

    ],
    init: async () => {
        try {
            console.log('Refreshing application (/) commands');
            await rest.put(Routes.applicationGuildCommands(process.env.APP_ID, process.env.GUILD_ID), {
                body: main.commands
            })
            client.login(process.env.BOT_TOKEN);

        } catch (err) {
            console.log(err)
        }
    }


}

main.init()
