const express = require('express')
const app = express()
const port = process.env.PORT || 80
fs = require('fs')
var bodyParser = require('body-parser')

var jsonParser = bodyParser.json()

var urlencodedParser = bodyParser.urlencoded({extended: false})

const {initializeApp, applicationDefault, cert} = require('firebase-admin/app');
const {getFirestore, Timestamp, FieldValue} = require('firebase-admin/firestore');
const {credential} = require("firebase-admin");

const serviceAccount = require('./serviceAccountKey.json');
app.use(express.urlencoded());
app.use(express.json());

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

app.get('/getChats', async (req, res) => {
    const snapshot = await db.collection('chats').get();
    const documents = [];
    snapshot.forEach(doc => {
        const document = {[doc.id]: doc.data()};
        documents.push(document);
    })
    res.send(documents);
})

app.delete('/deleteChat/:chatId', async (req, res) => {
    const chatId = req.params.chatId;
    await db.collection('chats').doc(chatId).delete();
    res.send({"result": "Success"});
});

app.get('/getMessages/:chatId', async (req, res) => {
    const chatId = req.params.chatId;
    const snapshot = await db.collection('chats').doc(chatId).collection('messages').get();
    const documents = [];
    snapshot.forEach(doc => {
        const document = {[doc.id]: doc.data()};
        documents.push(document);
    })
    res.send(documents);
})

app.post('/createChat', async (req, res) => {

    const userId = req.headers["userid"];
    const chatId = Date.now();
    const name = req.body.name;
    const photo = req.body.photo;
    const participants_count = req.body.participants_count;

    const snapshot = await db.collection('chats').add({userId, chatId, name, photo, participants_count});
    res.send({"result": "Success"});
})

app.post('/sendMessage', async (req, res) => {
    const userId = req.headers["userid"];
    const chatId = req.body.chatId;
    const message = req.body.message;
    let response = await messageSender(userId, chatId, message);
    res.send(response);
})

async function messageSender(userId, chatId, message) {
    let response;
    let attempts = 0;
    while (true) {
        attempts++;
        if (attempts > 3) {
            console.log("result : Error. Encryption server is unavailable. Please try again later.")
            return response = {"result": "Error. Encryption server is unavailable. Please try again later."}
            break;
        }
        console.log("Connecting to encryption server")
        if (encryptionError()) {
            console.log('Attempt ' + attempts + '. Error encryption server is unavailable');
        } else {
            console.log("Success")
            const snapshot = await db.collection('chats').doc(chatId).collection("messages").add({
                userId,
                message,
                timestamp: Timestamp.now()
            });
            return response = {"result": "success"};
            break;
        }

        await sleep(2000);
    }
}

function encryptionError() {
    const shouldPass = Math.random() < 0.3;
    return shouldPass;
}


async function sleep(ms) {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve()
        }, ms);
    });
}

app.post('/postTest', async (req, res) => {
    res.setHeader("Content-Type", "text/html")
    res.write("<p>first message</p>");
    await sleep(1000);
    res.write("<p>second try</p>");
    res.end();
})


app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
})

app.use(express.static(__dirname));