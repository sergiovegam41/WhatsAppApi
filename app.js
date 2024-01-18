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
// import multer from 'multer';
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

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
  

  const bot = new PrincipalCoreClass(adapterDB, adapterProvider);

  const port = process.env.PORT || 3000
  // QRPortalWeb()
 

  
  app.get('/require-scan', function(req, res) {
    res.send(!bot.isReady());
  });

  app.get('/qr', async function(req, res) {
    let token = req.query.token||""
    if(! await bot.hasAuthority(token)) return res.send({
      success:false,
      message: "UNAUTHORIZED",
    })
    const path = `${process.cwd()}`;
    res.sendFile(path + `/bot.qr.png`);
  });

  app.get('/ping', function (req, res) {
    res.send(true)
  })


  app.post('/sendImage', upload.any(), async (req, res) =>  {

    if(!bot.isReady()){
      return false
    }

    let token = req.body.token||""
    if(! await bot.hasAuthority(token)) return res.send({
      success:false,
      message: "UNAUTHORIZED",
    })

   try {
    let phone = req.body.phone
    let message = req.body.message
    
    if(phone == null) return res.send({
      success:false,
      message: "PHONE_IS_REQUIRED",
    })
  
    let i = 0;
    for (const image of req.files) {  

      await adapterProvider.sendImage(phone+"@s.whatsapp.net", image.path, i==0?message:"")

    
     try {
      fs.unlink(image.path, (err) => {
        if (err) {
          console.error(err.message);
          return;
        }
      });

     } catch (error) {
      
     }

      i++
  }
    console.log("hola")
    
    res.send(true)
    
  } catch (error) {
    console.log(error)
     res.send(false)
    
   }
  });  


  app.post('/send', async function  (req, res) {

    try {

      if(bot.isReady()){

        let token = req.body.token||""
        if(! await bot.hasAuthority(token)) return res.send({
          success:false,
          message: "UNAUTHORIZED",
        })
        
        let phone = req.body.phone
        let message = req.body.message
        
        if(phone == null) return res.send({
          success:false,
          message: "PHONE_IS_REQUIRED",
        })
      
        
        console.log("[ACTIVE_API]")

        const patronTelefono = /^[0-9]{12}$/;

        if( phone && message && patronTelefono.test(phone) ){

          if(phone!=null && message != null){
           if(phone!="" && message != ""){
              
            console.log(phone)
            console.log(message)
            bot.sendFlowSimple([{ answer: message}], phone);
            res.send(true)
           }
      
          }
    

        }else{
          res.send(false)
        }
        
      }else{
        res.send(false)
      }

    } catch (error) {
      res.send(false)
    }
      
  })

  const server = app.listen(port, () => {

    console.log(`La aplicación está corriendo en el puerto: ${port}`);
    // console.log(`Api ready.`)
  })

  adapterProvider.on('ready', async () => { });

 
}



main()