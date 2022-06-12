const aws = require("aws-sdk");
const mysql = require("mysql2/promise");
const s3 = new aws.S3({ apiVersion: "2006-03-01" });
const immobileUtil = require("./utils/immobile-builder");
const dataOfficeUtil = require("./utils/data-office-builder");
const pdfUtil = require("./utils/pdf-handler");
const errorHandler = require("./utils/throwError");

let connection = null;

mysql
    .createConnection({
        host: process.env.RDS_HOSTNAME,
        user: process.env.RDS_USERNAME,
        password: process.env.RDS_PASSWORD,
        database: process.env.RDS_DB_NAME,
    })
    .then((con) => (connection = con));

exports.handler = async (event) => {
    //se non siamo già connessi get connection
    if (!connection) {
        console.log("Nuova connessione");
        connection = await mysql.createConnection({
            host: process.env.RDS_HOSTNAME,
            user: process.env.RDS_USERNAME,
            password: process.env.RDS_PASSWORD,
            database: process.env.RDS_DB_NAME,
        });
    }

    // in base al path definisci tipologia
    const tipologia =
        event.pathParameters && event.pathParameters.idImmobile
            ? "immobile"
            : "generico";

    // se c'è immobile check id valido
    const idImmobile =
        tipologia === "immobile" ? event.pathParameters.idImmobile : null;
    if (tipologia === "immobile" && idImmobile <= 0)
        return errorHandler.throwError(
            "idImmobile deve essere un numero maggiore di zero"
        );

    // get req body
    if (!event.body)
        return errorHandler.throwError(
            "Necessario avere il corpo della richiesta"
        );
    const reqBody = JSON.parse(event.body);

    // check formato corretto date immesse
    if (!reqBody.from || !reqBody.to)
        return errorHandler.throwError(
            "Il corpo della richiesta deve contenere data inizio e data fine"
        );

    const { from, to, details, overwrite } = reqBody;
    if (isNaN(Date.parse(from)) || isNaN(Date.parse(to)))
        return errorHandler.throwError(
            "Le date inserite devono essere in formato 'yyyy-MM-dd'"
        );

    if (new Date(from).getTime() >= new Date(to).getTime()) {
        return errorHandler.throwError(
            "La data d'inizio report deve essere precedente la data di fine report"
        );
    }

    // definisci nome futuro file
    const nomeFile = `report_da_${from}_a_${to}.pdf`;

    // check che non esista già un report con quelle caratteristiche, nel caso ritorna errore
    const checkDocAlreadyExists = `SELECT codice_bucket FROM file WHERE immobile ${
        idImmobile ? "= " + idImmobile : "IS NULL"
    } AND nome = '${nomeFile}'`;
    const resQuery = await connection.execute(checkDocAlreadyExists);
    const oldFileRecord = resQuery[0][0];
    if (!overwrite && oldFileRecord)
        return errorHandler.throwError(
            `Il file richiesto è già stato creato. Crearne uno nuovo sovrascrivendo il vecchio?`
        );

    const codiceBucket = oldFileRecord ? oldFileRecord.codice_bucket : null;

    let immobile = null;
    let dataOffice = null;

    // se c'è idImmobile retrieve l'intero immobile
    if (tipologia === "immobile") {
        immobile = await immobileUtil.buildImmobile(
            connection,
            idImmobile,
            from,
            to
        );
        if (immobile === "Immobile non presente") {
            return errorHandler.throwError(
                `Immobile indicato non presente, procedura annullata`
            );
        } else if (immobile == "Caratteristiche non presenti") {
            return errorHandler.throwError(
                `Caratteristiche immobile non presenti, procedura annullata`
            );
        }

        const fotoCopertina = immobile.files.find(
            (el) => el.nome === "1" && el.tipologia === "FOTO"
        );
        if (fotoCopertina)
            immobile.foto = await readFileFromS3(
                process.env.BUCKET_FOTO_FIRMATE,
                fotoCopertina.codice_bucket
            );
    } else {
        dataOffice = await dataOfficeUtil.buildDataOffice(
            connection,
            from,
            to,
            details
        );
    }

    // leggi logo
    const file = await readFileFromS3(
        process.env.BUCKET_NAME,
        process.env.PATH_LOGO
    );

    // crea payload da passare per la creazione del documento
    const payload = {
        tipologia,
        from,
        to,
        immobile,
        dataOffice,
        details,
        logo: file,
    };

    // elabora il documento
    const doc = pdfUtil.creaReport(payload);

    // crea nome nuovo file nel caso non sia già presente
    const nuovoCodiceBucket = immobile
        ? `immobili/${immobile.ref}/${new Date().getTime()}.pdf`
        : `documenti/${new Date().getTime()}.pdf`;
    const Key = codiceBucket ? codiceBucket : nuovoCodiceBucket;

    // salva documento
    params = {
        Bucket: process.env.BUCKET_NAME,
        Key,
        Body: doc,
        ContentType: process.env.CONTENT_TYPE,
    };

    try {
        await s3.upload(params).promise();
    } catch (e) {
        return errorHandler.throwError(
            "Errore nel salvataggio del file, procedura annullata"
        );
    }

    // interazione con il db
    const createRecord = `INSERT INTO \`file\` (immobile, tipologia, nome, codice_bucket) VALUES (${
        immobile ? immobile.id : null
    }, 'DOCUMENTO', '${nomeFile}', '${Key}')`;

    try {
        await connection.execute(createRecord);
    } catch (e) {
        throwError(
            "Errore nell'aggiornamento del database, procedura annullata"
        );
    }

    // TODO implement
    const response = {
        statusCode: 200,
        body: "Report creato con successo",
    };
    return response;
};

const readFileFromS3 = async (Bucket, Key) => {
    const params = {
        Bucket,
        Key,
    };
    try {
        const { Body } = await s3.getObject(params).promise();
        return Body;
    } catch (e) {
        return errorHandler.throwError(
            "Errore nella lettura del file, operazione annullata"
        );
    }
};
