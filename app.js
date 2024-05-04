require('dotenv').config()
const express = require('express')
const app = express()
const { CoreClass } = require('@bot-whatsapp/bot')
// const BaileysProvider = require('@bot-whatsapp/provider/baileys')
const MockAdapter = require('@bot-whatsapp/database/mock')
const PrincipalCoreClass = require('./PrincipalCoreClass.class')
const QRPortalWeb = require('@bot-whatsapp/portal')
const fs = require('fs');
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.json());
const cors = require('cors')
const MongoAdapter = require('@bot-whatsapp/database/mongo')

const { init } = require("bot-ws-plugin-openai");
const BaileysProvider = require("@bot-whatsapp/provider/baileys")
const { handlerAI } = require("./utils");
const { textToVoice } = require("./services/eventlab");


const {
  createBot,
  createProvider,
  createFlow,
  addKeyword,
  EVENTS,
} = require("@bot-whatsapp/bot");

const corsOptions = {
  origin: '*', // dominio permitido
  methods: ['GET', 'POST', 'PUT'] // métodos HTTP permitidos
};

app.use(cors(corsOptions)); 



const main = async () => {
  
  const adapterDB = new MongoAdapter({
      dbUri: process.env.MONGO_URI,
      dbName:  process.env.MONGO_DATABASE,
  })



  

  const adapterProvider = await new BaileysProvider({});
  
  // const flowVoiceNote = addKeyword(EVENTS.VOICE_NOTE).addAction(
  //   async (ctx, ctxFn) => {
  //       console.log("Mensaje de voz...");

  //       // if(!this.isReady()){
  //       // return;
  //       // }
    
  //       const body = await handlerAI(ctx);
  //       console.log(`[TEXT]: ${body}`);
        
  //       bot.webhookSend(body,ctx.from)
    
  //   }
  //   );
    
  //   const adapterFlow = createFlow([
  //    flowVoiceNote
  //   ]);


  const bot = new PrincipalCoreClass(adapterDB, adapterProvider);


 

  // createBot({
  //   flow: adapterFlow,
  //   provider: adapterProvider,
  //   database: adapterDB,
  // });
  const port = process.env.PORT || 3000
  // QRPortalWeb()
 
  
  app.get('/require-scan', function(req, res) {
    res.send(!bot.isReady());
  });

  app.get('/qr', function(req, res) {
    const path = `${process.cwd()}`;
    res.sendFile(path + `/bot.qr.png`);
  });

  app.get('/ping', function (req, res) {
    res.send(true)
  })

  app.post('/send', async function  (req, res) {
    const phone = req.body.phone;
    const message = req.body.message;

    // Validación de entrada
    if (!phone || !message) {
      return res.status(400).json({
        success: false,
        message: "PHONE_AND_MESSAGE_ARE_REQUIRED",
      });
    }

    const patronTelefono = /^[0-9]{12}$/;
    if (!patronTelefono.test(phone)) {
      return res.status(400).json({
        success: false,
        message: "INVALID_PHONE_FORMAT",
      });
    }

    if (!bot.isReady()) {
      return res.status(503).json({
        success: false,
        message: "BOT_NOT_READY",
      });
    }

    try {
      await bot.sendFlowSimple([{answer: message}], phone);
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        success: false,
        message: "INTERNAL_SERVER_ERROR",
      });
    }
  })

  const server = app.listen(port, () => {

    console.log(`La aplicación está corriendo en el puerto: ${port}`);
    // console.log(`Api ready.`)
  })

  adapterProvider.on('ready', async () => { });

 
}


main().then(r => console.log("Bot is ready")).catch(e => console.log(e));
