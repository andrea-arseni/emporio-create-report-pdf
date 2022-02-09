const prezzoZona = require('./prezzo-zona');

const getImmobiliCambiati = async(connection, from, to, tipologia)=>{
    // get immobili con log azione ATTIVO con data compresa tra from e to
    const immobiliCambiatiTextQuery = `SELECT immobile.ref, immobile.titolo, log.data FROM log INNER JOIN immobile ON log.immobile=immobile.id WHERE log.azione = '${tipologia}' AND log.data BETWEEN '${from}' AND '${to}' ORDER BY log.data`;
    const immobiliCambiatiQueryRes = await connection.execute(immobiliCambiatiTextQuery); 
    if (!immobiliCambiatiQueryRes[0][0]) return []; 
    // togli lista con lo stesso ref
    // per ogni elemento cerca lo stesso ref, se lo trova elimina l'elemento con data più vecchia
    let listaImmobiliCambiati = immobiliCambiatiQueryRes[0];
    return listaImmobiliCambiati.filter((element, index)=>{
        const indexComparation = listaImmobiliCambiati.map(el => el.ref).lastIndexOf(element.ref);
        return index===indexComparation;
    })
    
}

const getListaImmobiliAttivi = async (connection) => {
    // get immobili con status ATTIVO
    const immobiliAttiviTextQuery = `SELECT ref, titolo, superficie, prezzo, comune, zona, indirizzo, contratto, categoria, stato FROM immobile WHERE status = 'ATTIVO' ORDER BY ref`;
    const immobiliAttiviQueryRes = await connection.execute(immobiliAttiviTextQuery); 
    if (!immobiliAttiviQueryRes[0][0]) return [];
    // per ogni immobile get prezzoZona 
    const listaImmobili = immobiliAttiviQueryRes[0];
    for(let immobile of listaImmobili){
        immobile.datiZona = await prezzoZona.retrieveDatiZona(immobile);
    }
    return listaImmobili;
}



const getVisiteEffettuate = async(connection, from, to)=>{
    // get visite con data between from e to
    const visiteTextQuery = `SELECT * FROM visita WHERE quando BETWEEN '${from}' AND '${to}' ORDER BY quando`;
    const visiteQueryRes = await connection.execute(visiteTextQuery); 
    return !visiteQueryRes[0][0] ? [] : visiteQueryRes[0];
}

const getLavoriConSteps = async(connection, from, to)=>{
    // get all steps con data between from e to
    const lavoroTextQuery = `SELECT step.lavoro, step.id, lavoro.titolo, step.data, step.descrizione FROM step INNER JOIN lavoro ON step.lavoro=lavoro.id  WHERE data BETWEEN '${from}' AND '${to}' ORDER BY step.lavoro, step.id`;
    const lavoroQueryRes = await connection.execute(lavoroTextQuery); 
    if(!lavoroQueryRes[0][0]) return [];
    const listaLavori = lavoroQueryRes[0];
    // hai un array di oggetti, vuoi creare un array di oggetti con un array dentro
    const results = [];
    listaLavori.forEach(element=>{
        const lavoroObjectIndex = results.findIndex(el=>el.lavoro===element.lavoro);
        if(lavoroObjectIndex!==-1){
            results[lavoroObjectIndex].steps.push({id: element.id, titolo: element.titolo, data: element.data});
        }else{
            results.push({lavoro:element.lavoro, steps:[{id: element.id, titolo: element.titolo, data: element.data}]})
        }
    })
    return results;
}

const getOperazioni = async(connection, from, to)=>{
    // get all operazioni con data between from e to
    const operazioniTextQuery = `SELECT * FROM contabilita WHERE data BETWEEN '${from}' AND '${to}' ORDER BY data`;
    const operazioniQueryRes = await connection.execute(operazioniTextQuery); 
    return !operazioniQueryRes[0][0] ? [] : operazioniQueryRes[0];
}

exports.buildDataOffice = async(connection, from, to, details) => {
    const dataOffice = {};
    // hai bisogno degli immobili Acquisiti
    dataOffice.acquisizioni = await getImmobiliCambiati(connection, from, to, 'ATTIVO');
    // degli immobili disattivati
    dataOffice.conclusi = await getImmobiliCambiati(connection, from, to, 'DISATTIVO');
    // degli immobili attivi
    dataOffice.attivi = await getListaImmobiliAttivi(connection);
    // delle visite effettuate
    dataOffice.visite = await getVisiteEffettuate(connection, from, to);
    // dei lavori con i loro step
    dataOffice.lavori = await getLavoriConSteps(connection, from, to);
    // della contabilità
    if(details) dataOffice.getOperazioni = await getOperazioni(connection, from, to);
    return dataOffice;
}