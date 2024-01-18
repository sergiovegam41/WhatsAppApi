const  {CoreClass} = require("@bot-whatsapp/bot");
const express = require('express')
var request = require('request');

const app = express()

const readline = require('readline');
var redis = require("redis");

const { MongoClient, ServerApiVersion } = require('mongodb');
const { Console } = require("console");
const ObjectID = require('mongodb').ObjectID;


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
var isReady = false;

const DATABASE = process.env.MONGO_DATABASE || "Bots" 
const uriMongo = process.env.MONGO_URI;

const Mongoclient = new MongoClient(uriMongo, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
var BotsCollection = null
var ConfigCollection = null

class PrincipalCoreClass extends CoreClass {

    constructor  (_database, _provider) {

        console.log("PrincipalCoreClass")
        super (null, _database, _provider);

        this.providerClass.on('ready', () => {
            this.handleReadyEvent();
            isReady = true;
            console.log("ready")

        });

        this.providerClass.on('require_action', async () => {
            isReady = false;
        })
      
    }

    isReady = () => {

      return isReady
    
    }

    handleReadyEvent() {

        Mongoclient.connect( async err => {
            BotsCollection = Mongoclient.db(DATABASE).collection("Bots");
            ConfigCollection = Mongoclient.db(DATABASE).collection("Config");
            if(err){ console.log(err) } else {
                this.ready = true
            }
            console.log("Mongo Conectado a: "+DATABASE);
        });


    
       
    }

    handleMsg = async (ctx) =>  {

        try {

            const { from, body } = ctx;

       

            if(!this.isReady){
                return;
            }
    
    
            if(body == null){
                return;
            }
    
            if(body == undefined){
                return;
            }
    
            if(body.includes("_event_voice_note_")){
    
                const text = await handlerAI(ctx);
                console.log(`[TEXT]: ${text}`);
    
                if(text != "ERROR"){
                    this.webhookSend(text,from)
                }
    
    
                console.log("NOTA DE VOZ")
                return;
            }
    
            if(!body){
                return;
            }
    
            if(body.includes("_event_") || body.trim() === ""){
                console.log("unanswered")
                return;
            }
    
            this.webhookSend(body,from)
            // this.sendFlowSimple([{ answer: body}],from );

            
        } catch (error) {
             console.log(error)
        }

    };

    webhookSend = async (body,from) => {
        let webhook = await ConfigCollection.findOne({ name: "webhook" })
        let TokenWebhook = await ConfigCollection.findOne({ name: "TokenWebhook" })
        
        if(webhook){
            try {
                console.log(webhook.value)
                var options = {
                'method': 'POST',
                'url': webhook.value,
                'headers': {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                "phone": from,
                "message": body,
                "TokenWebhook":TokenWebhook.value
                })
                    }; 
                        request(options, function (error, response) { 
                            if (error) throw new Error(error); 
                            console.log(response.body); 
                    }); 
                } catch (error) {
                    console.log(error);
                }
        }
    }
    

    hasAuthority = async (token) => {
        // let TokenWebhook = await ConfigCollection.findOne({ name: "TokenWebhook" })
        // return token == TokenWebhook.value
        return true
    }
    
    
}



module.exports = PrincipalCoreClass;