const aws = require('aws-sdk');
const axios = require('axios');
const mysql = require('mysql2/promise');
const s3 = new aws.S3({ apiVersion: '2006-03-01' });

const pdfUtil = require('./utils/pdf-handler');

let connection = null;

mysql.createConnection({
    host     : process.env.RDS_HOSTNAME,
    user     : process.env.RDS_USERNAME,
    password : process.env.RDS_PASSWORD,
    database : process.env.RDS_DB_NAME 
}).then(con=>connection = con);

exports.handler = async (event) => {

    //se non siamo già connessi get connection
    if(!connection){
        console.log("Nuova connessione");
        connection = await mysql.createConnection({
            host     : process.env.RDS_HOSTNAME,
            user     : process.env.RDS_USERNAME,
            password : process.env.RDS_PASSWORD,
            database : process.env.RDS_DB_NAME 
        })
    }

    // in base al path definisci tipologia
    const tipologia = (event.pathParameters && event.pathParameters.idImmobile) ? 'immobile' : 'generico';
    
    // se c'è immobile check id valido
    const idImmobile = (tipologia==='immobile') ? event.pathParameters.idImmobile : null;
    if(tipologia==='immobile' && idImmobile <= 0) throwError("idImmobile deve essere un numero maggiore di zero");
    
    // get req body
    if(!event.body) return throwError("Necessario avere il corpo della richiesta");
    const reqBody = JSON.parse(event.body);

    // check formato corretto date immesse
    if(!reqBody.from || !reqBody.to) return throwError("Il corpo della richiesta deve contenere data inizio e data fine");
    const {from, to, details} = reqBody;
    if(isNaN(Date.parse(from)) || isNaN(Date.parse(to))) return throwError("Le date inserite devono essere in formato 'yyyy-MM-dd'");

    let immobile = null;
    // se c'è idImmobile retrieve l'intero immobile
    if(tipologia==='immobile'){
        const immobileTextQuery = `SELECT * FROM immobile WHERE id = ${idImmobile}`;
        const results = await connection.execute(immobileTextQuery); 
        if(!results[0][0]) return throwError(`Immobile indicato non presente, procedura annullata`);
        immobile = results[0][0];
    }
    
    // leggi logo
    const file = await readFileFromS3(process.env.PATH_LOGO);

    // crea payload da passare per la creazione del documento
    const payload = {
        tipologia, from, to, immobile, details, logo: file
    }

    // elabora il documento
    const doc = pdfUtil.creaReport(payload);

    // crea data oggi
    const oggi = `${new Date().getDate()}-${new Date().getMonth()+1}-${new Date().getFullYear()}`;

    // crea nome nuovo file
    const Key = immobile ? `${immobile.ref}/report/${oggi}.pdf` : `report/${oggi}.pdf`;

    // salva documento
    params = {
        Bucket: process.env.BUCKET_NAME,
        Key,
        Body: doc,
        ContentType: process.env.CONTENT_TYPE
    }

    await s3.upload(params).promise();

    // TODO implement
    const response = {
        statusCode: 200,
        body: JSON.stringify({immobile}),
    };
    return response;
};

const throwError = (message)=>{
    return {
        "statusCode": 400,
        "body": message,
        "isBase64Encoded": false
    }
}

const readFileFromS3 = async(Key)=> {
    const params = {
        Bucket: process.env.BUCKET_NAME,
        Key,
    };
    try{
        const {Body} = await s3.getObject(params).promise();
        return Body;
    }catch(e){
        throwError('File non trovato, operazione annullata');
    }
}