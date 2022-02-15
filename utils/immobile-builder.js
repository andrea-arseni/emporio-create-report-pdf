const errorHandler = require('./throwError');
const prezzoZona = require('./prezzo-zona');

const retrieveImmobile = async (connection, idImmobile)=>{
    const immobileTextQuery = `SELECT * FROM immobile WHERE id = ${idImmobile}`;
    const immobileQueryRes = await connection.execute(immobileTextQuery); 
    if(!immobileQueryRes[0][0]) return errorHandler.throwError(`Immobile indicato non presente, procedura annullata`);
    return immobileQueryRes[0][0];
}

const retrieveLogsImmobile = async (connection, idImmobile)=>{
    const logsTextQuery = `SELECT * FROM log WHERE immobile = ${idImmobile}`;
    const logQueryRes = await connection.execute(logsTextQuery); 
    return !logQueryRes[0][0] ? [] : logQueryRes[0];
}

const retrieveFilesImmobile = async (connection, immobile)=>{
    const filesTextQuery = `SELECT * FROM file WHERE immobile = ${immobile.id} OR persona = ${immobile.proprietario}`;
    const fileQueryRes = await connection.execute(filesTextQuery); 
    return !fileQueryRes[0][0] ? [] : fileQueryRes[0];
}

const retrieveCaratteristicheImmobile = async(connection, id)=>{
    const featuresTextQuery = `SELECT * FROM caratteristiche_immobile WHERE id = ${id}`;
    const featuresQueryRes = await connection.execute(featuresTextQuery); 
    if(!featuresQueryRes[0][0]) return errorHandler.throwError(`Immobile indicato senza caratteristiche, procedura annullata`);
    return featuresQueryRes[0][0];
}

const retrieveVisiteImmobile = async (connection, idImmobile, from, to)=>{
    const visiteTextQuery = `SELECT * FROM visita INNER JOIN persona ON visita.persona=persona.id WHERE immobile = ${idImmobile} AND quando BETWEEN '${from}' AND '${to}'`;
    const visiteQueryRes = await connection.execute(visiteTextQuery); 
    return !visiteQueryRes[0][0] ? [] : visiteQueryRes[0];
}

exports.buildImmobile = async(connection, idImmobile, from, to) => {

    const domani = new Date(new Date(to).getTime()+1000*60*60*24);
    to = `${domani.getFullYear()}-${domani.getMonth()+1}-${domani.getDate()}`;

    const immobile = await retrieveImmobile(connection, idImmobile);
    immobile.logs = await retrieveLogsImmobile(connection, idImmobile);
    immobile.caratteristiche = await retrieveCaratteristicheImmobile(connection, immobile.caratteristiche);
    immobile.datiZona = await prezzoZona.retrieveDatiZona(immobile);
    immobile.visite = await retrieveVisiteImmobile(connection, idImmobile, from, to);
    immobile.files = await retrieveFilesImmobile(connection, immobile);
    return immobile;
}