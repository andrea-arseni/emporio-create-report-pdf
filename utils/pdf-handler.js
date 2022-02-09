const PDFDocument = require('pdfkit');
const sizeOf = require('image-size');

const MESI = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", 
"Ottobre", "Novembre", "Dicembre"];

const PAGINA = {
  INTESTAZIONE: 'INTESTAZIONE', 
  ANNUNCIO_IMMOBILE: 'ANNUNCIO_IMMOBILE', 
  VISITE_IMMOBILE: 'VISITE_IMMOBILE', 
  DOCS_IMMOBILE: 'DOCS_IMMOBILE', 
  LOGS_IMMOBILE: 'LOGS_IMMOBILE'
}

const COLORS = {
  BLUE: '#007BFF',
  RED: '#a80d0d',
  GREEN: '#2daa03',
  NORMAL: '#232323',
  WHITE: '#ffffff'
} 

const getDate = (giornoEmissione) => 
`${new Date(giornoEmissione).getDate()} ${MESI[new Date(giornoEmissione).getMonth()]} ${new Date(giornoEmissione).getFullYear()}`;

const formatNumber = number => {
  const array = number.toString().split('').reverse();
  const res = array.map((el, index)=>{
    return ((index)%3===0 && index!==0) ? el+'.':el
  });
  return res.reverse().join('');
}

const capitalize = string => string ? string.charAt(0).toUpperCase() + string.slice(1): "";

const creaPagina = (doc)=>{
    doc.addPage({
      margins: {
        top: 50,
        bottom: 25,
        left: 50,
        right: 50
      }
    });
}

const disegnaIntestazione = (doc, logo) => {
    // definiamo gradiente prima pagina
    let grad = doc.linearGradient(0, 0, doc.page.width, 150);
    grad.stop(0, '#022D57', 1)
        .stop(1, '#022D57', 0.7);
  
    // disegnamo colonna in alto    
    doc.rect(0, 0, doc.page.width, 150);
    doc.fill(grad);
  
    // introduciamo logo in alto a sinistra
    doc.image(logo, 50, 25, {
      fit: [100, 100]
    });
}

const disegnaTitolo = (doc, titolo)=>{
  doc.fontSize(20)
  .font('Helvetica-BoldOblique')
  .fillColor(COLORS.WHITE)
  .text(titolo[0], {width: doc.page.width,align: 'center'})
  .text(titolo[1], {width: doc.page.width,align: 'center'})
  .fillColor(COLORS.NORMAL)
  .moveDown(4)
}

const creaHeader = (doc, payload, titolo)=>{

  creaPagina(doc);

  const {logo} = payload;

  disegnaIntestazione(doc, logo);

  disegnaTitolo(doc, titolo);
}

const displayNumeroPagina = (doc, numberPage, totalNumber) => {
  doc
  .fillColor(COLORS.NORMAL)  
  .fontSize(9)
  .font('Helvetica')
  .text("Pagina "+numberPage+" di "+ totalNumber, doc.page.width - 116, doc.page.height - 50);
}

const displayFooter = (doc, firstPage = false)=>{
    const webAddress = "https://www.emporio-case.com";
    const email = "emporiocase@emporiocase.com";
    const sede = "Sede: Via Gramsci 34, Segrate (MI)";
  
    doc
    .fontSize(12)
    .font('Helvetica')
    .fillColor(COLORS.NORMAL);

    if(firstPage){
      doc
      .text("Emporio Case sas", 250, doc.page.height - 87)
      .text(sede)
      .text("Email: ", {continued: true})
      .fillColor(COLORS.BLUE)
      .text(email, {link: "mailto:"+email})
      .fillColor(COLORS.NORMAL)
      .text("Sito: ", {continued: true})
      .fillColor(COLORS.BLUE)
      .text(webAddress, {link: webAddress});
    }else{
      conf = {width: doc.page.width,align: 'center'};
      doc.text("Emporio Case sas", 0, doc.page.height - 82, conf) 
      .text(sede, conf)
      .fillColor(COLORS.BLUE)
      .text(email, {link: "mailto:"+email, ...conf})
      .fillColor(COLORS.BLUE)
      .text(webAddress, {link: webAddress, ...conf});
    }
}

const displayParagrafoKeyValueACapo = (doc, key, value, rows, startingHorizontalPoint)=>{
    doc
    .font('Helvetica-BoldOblique')
    .text(key, startingHorizontalPoint);

    value.forEach(val=>{
        doc.font('Helvetica-Oblique')
        .text(val, startingHorizontalPoint);
    })

    doc.moveDown(rows);
}

const creaPrimaPagina = (doc, payload)=>{

    // estrai dati
    const {tipologia, from, to, immobile, details, logo} = payload;

    // crea nuova pagina
    creaPagina(doc);
    
    // definiamo gradiente prima pagina
    let grad = doc.linearGradient(0, 0, 200, 1200);
    grad.stop(0, '#022D57', 1)
        .stop(1, '#022D57', 0.5);
  
    // disegnamo colonna sinistra    
    doc.rect(0, 0, 200, 1200);
    doc.fill(grad);
  
    // introduciamo logo in alto a sinistra
    doc.image(logo, 50, 50, {
      fit: [100, 100]
    });

    // text header
    const textHeader = tipologia==='immobile' ?
     'Attività Immobile rif. '+immobile.ref: 'Attività Agenzia';

    const textObject = tipologia==='immobile' ? 
    ['Analisi Annuncio e Valutazione Prezzo', 'Analisi Visite Effettuate', 'Analisi Foto e Documenti']:
    ['Analisi Acquisizioni e Chiusure', 'Analisi Immobili Attivi', 'Analisi Lavori Attivi'];

    if(details){
        tipologia==='immobile' ?
            textObject.push('Analisi Modifiche Effettuate') :
            textObject.push('Analisi Operazioni');
    }
  
    // intestazione Header
    doc.fontSize(23)
    .font('Helvetica-Bold')
    .text(textHeader, 250, 85)
    .moveDown(3).fontSize(15);
  
    // Tipologia
    displayParagrafoKeyValueACapo(doc, 'Oggetto:', textObject, 3, 250);
  
    // Creato il 
    displayParagrafoKeyValueACapo(doc, 'Periodo:', [`Dal ${getDate(from)} al ${getDate(to)}`], 3, 250);
    
    // footer link al sito
    displayFooter(doc, true);

    const pagine = getPagine(payload, PAGINA.INTESTAZIONE);    
    displayNumeroPagina(doc, pagine.corrente, pagine.totali);

  }

const creaPaginaAnnuncioImmobile = (doc, payload)=>{

    // estrai dati
    const {immobile, logo} = payload;

    // porzione per creazione e pubblicazione annuncio
    const logPubblicato = immobile.logs.find(el=>el.azione==='ATTIVO');
    const pubblicatoText = logPubblicato ? getDate(logPubblicato.data): "Mai pubblicato";
    const pubblicatoColor = logPubblicato ? COLORS.NORMAL : COLORS.RED;

    // parte dichiarazione prezzo
    const prezzoMetroQuadro = formatNumber((immobile.prezzo/immobile.superficie).toFixed(0))+" € / m² ";
    const prezzoText = formatNumber(immobile.prezzo)+" € ";
    const superficieText = formatNumber(immobile.superficie)+" m² ";

    // parte classe energetica
    const classeEnergeticaText = immobile.classe_energetica && immobile.consumo ?
    immobile.classe_energetica+": "+immobile.consumo+" m² / kWh" : "NON RILEVATA";

    creaHeader(doc, payload, ['Analisi Annuncio e', 'Valutazione Prezzo']);

    doc
    .fontSize(12)
    .fillColor(COLORS.NORMAL)
    .text('Titolo: ', 60, 180, {continued: true})
    .font('Helvetica-Oblique')
    .text(immobile.titolo)
    .moveDown(1)
    .font('Helvetica-BoldOblique')
    .text('Rif: ', {continued: true})
    .font('Helvetica-Oblique')
    .text(immobile.ref, {continued: true})
    .font('Helvetica-BoldOblique')
    .text('    Contratto: ', {continued: true})
    .font('Helvetica-Oblique')
    .text(capitalize(immobile.contratto), {continued: true})
    .font('Helvetica-BoldOblique')
    .text('    Categoria: ', {continued: true})
    .font('Helvetica-Oblique')
    .text(capitalize(immobile.categoria), {continued: true})
    .font('Helvetica-BoldOblique')
    .text('    Stato: ', {continued: true})
    .font('Helvetica-Oblique')
    .text(capitalize(immobile.stato))
    .moveDown(1)
    .font('Helvetica-BoldOblique')
    .text('Comune: ', {continued: true})
    .font('Helvetica-Oblique')
    .text(capitalize(immobile.comune), {continued: true})
    .font('Helvetica-BoldOblique')
    .text('    Indirizzo: ', {continued: true})
    .font('Helvetica-Oblique')
    .text(capitalize(immobile.indirizzo))
    .moveDown(1)
    .font('Helvetica-BoldOblique')
    .text('Creato: ', {continued: true})
    .font('Helvetica-Oblique')
    .text(getDate(immobile.logs[0].data), {continued: true})
    .font('Helvetica-BoldOblique')
    .text('    Pubblicato: ', {continued: true})
    .font('Helvetica-Oblique')
    .fillColor(pubblicatoColor)
    .text(pubblicatoText, {continued:true})
    .font('Helvetica-BoldOblique')
    .text('    Attualmente: ', {continued: true})
    .fillColor(immobile.status==='ATTIVO' ? COLORS.GREEN : COLORS.RED)
    .text(' '+immobile.status)
    .moveDown(1)
    .fillColor(COLORS.NORMAL)
    .font('Helvetica-BoldOblique')
    .text('Prezzo: ', {continued: true})
    .font('Helvetica-Oblique')
    .text(prezzoText, {continued: true})
    .font('Helvetica-BoldOblique')
    .text('    Superficie: ', {continued: true})
    .font('Helvetica-Oblique')
    .text(superficieText, {continued: true})
    .font('Helvetica-BoldOblique')
    .text('    Prezzo / metro quadro: ', {continued: true})
    .font('Helvetica-Oblique')
    .text(prezzoMetroQuadro)
    .moveDown(1);

    if(immobile.datiZona){
      const prezzoZonaText = "Prezzo medio di zona a "+immobile.datiZona.periodoRiferimento+": ";
      let prezzoZona = immobile.datiZona.prezzoMetroQuadro+" ("+immobile.datiZona.range+")";
      prezzoZona = prezzoZona.replace(/€/g, "€ ");
      prezzoZona = prezzoZona.replace(/m/g, " m");
      doc.text(prezzoZonaText, {continued: true})
      .text(prezzoZona)
      .moveDown(1);
    }

    doc
    .font('Helvetica-BoldOblique')
    .text('Classe Energetica: ', {continued: true})
    .font('Helvetica-Oblique')
    .fillColor(classeEnergeticaText==='NON RILEVATA' ? COLORS.RED : classeEnergeticaText.startsWith('A') ? COLORS.GREEN : COLORS.NORMAL)
    .text(capitalize(classeEnergeticaText))
    .fillColor(COLORS.NORMAL)
    .moveDown(1)
    .font('Helvetica-BoldOblique')
    .text('Descrizione annuncio:')
    .font('Helvetica-Oblique')
    .fontSize(11)
    .text(capitalize(immobile.caratteristiche.descrizione), {
      width: doc.page.width-120,
      align: 'justify'
    })

    // footer link al sito
    displayFooter(doc);

    // numero pagina
    const pagine = getPagine(payload, PAGINA.ANNUNCIO_IMMOBILE);
    displayNumeroPagina(doc, pagine.corrente, pagine.totali);
}

const creaPaginaVisiteImmobile = (doc, payload)=>{

  // estrai dati
  const {immobile, from, to} = payload;

  const pagine = getPagine(payload, PAGINA.VISITE_IMMOBILE);

  creaHeader(doc, payload, ['Analisi Visite', 'Effettuate']);

  const titolo = `Dal ${getDate(from)} al ${getDate(to)} ${immobile.visite.length===0 ? 'non':''} sono state effettuate ${immobile.visite.length===0 ? '' : immobile.visite.length+" "}visite`;

  doc
  .fontSize(13)
  .fillColor(immobile.visite.length===0 ? COLORS.RED : COLORS.NORMAL)
  .font('Helvetica-Oblique')
  .text(titolo)
  .fillColor(COLORS.NORMAL)
  .moveDown(1);

  // ordina visite
  immobile.visite.sort((firstEl, secondEl)=> new Date(firstEl.quando).getTime() - new Date(secondEl.quando).getTime());

  // per ogni visita scrivila, se le visite sono più di 8 cambia pagina ogni 10
  immobile.visite.forEach((visita, index)=>{
    if(index===8 || (index-8)%10===0){
      displayFooter(doc);
      displayNumeroPagina(doc, pagine.corrente, pagine.totali);
      pagine.corrente = pagine.corrente+1;
      creaPagina(doc);
    }
    const visitaText = visita.note ? `${visita.nome} (${visita.note})` : visita.nome;
    doc
    .fontSize(13)
    .font('Helvetica-BoldOblique')
    .text(`${++index}) ${getDate(visita.quando)}`, {continued: true})
    .font('Helvetica-Oblique')
    .text(' - '+capitalize(visitaText))
    .moveDown(1)
  })

  // footer link al sito
  displayFooter(doc);

  // numero pagina
  displayNumeroPagina(doc, pagine.corrente, pagine.totali);
}

const reportDocumentoPresent = (files, nome, doc, continued) => { 
    doc.font('Helvetica-Oblique');
    nome = nome.toLowerCase();
    if(nome.split(' ').length>1) nome = nome.split(' ').join('-');
    const dato = files.find(el=>{
      const fileName = el.nome.toLowerCase();
      return fileName.includes(nome)
    })
    dato ?
    doc.fillColor(COLORS.GREEN).text('Presente', {continued}).fillColor(COLORS.NORMAL):
    doc.fillColor(COLORS.RED).text('Non Presente', {continued}).fillColor(COLORS.NORMAL);
    if(!continued) doc.moveDown(1);
}

const getNumeroFoto = (doc, files)=>{
  doc
  .font('Helvetica-BoldOblique')
  .text("Numero foto acquisite: ", {continued: true});

  const numeroFoto = files.filter(el=>el.tipologia==='FOTO'&&el.nome!=='21').length;

  if(numeroFoto < 5){
    doc.fillColor(COLORS.RED);
  }else if(numeroFoto < 15){
    doc.fillColor(COLORS.NORMAL);
  }else{
    doc.fillColor(COLORS.GREEN);
  }

  doc.font('Helvetica-Oblique').text(numeroFoto+" su 20 possibili").moveDown(1);
}

const displayFotoCopertina = (doc, foto)=>{
  const {width, height} = sizeOf(foto);
  // definisci fit in base alle caratteristiche dell'immagine - 3 optioni
  let fit = [];
  if(width > height){
    fit = [300,225];
  }else if (width < height){
    fit = [225,300];
  }else{
    fit = [300,300];
  }

  doc.image(foto, {fit})
  .fontSize(10)
  .fillColor(COLORS.NORMAL)
  .moveDown(1)
  .font('Helvetica-Oblique')
  .text('Foto di Copertina')
}

const creaPaginaDocumentiEFoto = (doc, payload)=>{

  // estrai dati
  const {immobile} = payload;

  creaHeader(doc, payload, ['Analisi Foto', 'e Documenti']);

  doc
  .fontSize(13)
  .font('Helvetica-BoldOblique')
  .text("Planimetria catastale: ", {continued: true})
  reportDocumentoPresent(immobile.files, 'planimetria catastale', doc, true); 
  doc.font('Helvetica-BoldOblique')
  .text("    Visura catastale: ", {continued: true})
  reportDocumentoPresent(immobile.files, 'visura catastale', doc, false); 
  doc.font('Helvetica-BoldOblique')
  .text("Atto provenienza: ", {continued: true})
  reportDocumentoPresent(immobile.files, 'atto provenienza', doc, true); 
  doc.font('Helvetica-BoldOblique')
  .text("    Consuntivo spese: ", {continued: true})
  reportDocumentoPresent(immobile.files, 'consuntivo spese', doc, false); 
  doc.font('Helvetica-BoldOblique')
  .text("Certificazione energetica: ", {continued: true})
  reportDocumentoPresent(immobile.files, 'certificazione energetica', doc, true); 
  doc.font('Helvetica-BoldOblique')
  .text("    Identificativo proprietario: ", {continued: true})
  reportDocumentoPresent(immobile.files, 'identificativo proprietario', doc, false); 
  doc.font('Helvetica-BoldOblique')
  .text("Contratto collaborazione: ", {continued: true})
  reportDocumentoPresent(immobile.files, 'contratto collaborazione', doc, false);  
  
  // get numero foto escludi 21
  getNumeroFoto(doc, immobile.files);
    
  // display foto copertina con footer
  if(immobile.foto) displayFotoCopertina(doc, immobile.foto);

  // footer link al sito
  displayFooter(doc);

  const pagine = getPagine(payload, PAGINA.DOCS_IMMOBILE);
  displayNumeroPagina(doc, pagine.corrente, pagine.totali);

};

const creaPaginaModificheImmobile = (doc, payload) => {

  creaHeader(doc, payload, ['Analisi Modifiche', 'Effettuate sull\'Immobile']);

  // estrai dati
  const {immobile} = payload;

  const pagine = getPagine(payload, PAGINA.LOGS_IMMOBILE);

  // build title
  const titolo = `Sono state effettuate ${immobile.logs.length} azioni sull'immobile con rif. ${immobile.ref} `;

  doc.fontSize(13).text(titolo).moveDown(1);
  
  // ordina visite
  immobile.logs.sort((firstEl, secondEl)=> new Date(firstEl.data).getTime() - new Date(secondEl.data).getTime());

  // per ogni visita scrivila, se le visite sono più di 8 cambia pagina ogni 10
  immobile.logs.forEach((log, index)=>{
    if(index===14 || (index-14)%16===0){
      displayFooter(doc);
      displayNumeroPagina(doc, pagine.corrente, pagine.totali);
      pagine.corrente = pagine.corrente+1;
      creaPagina(doc);
    }
    doc
    .fontSize(13)
    .font('Helvetica-BoldOblique')
    .text(`${++index}) ${getDate(log.data)}`, {continued: true})
    .font('Helvetica-Oblique')
    .text(' - '+capitalize(log.azione.toLowerCase()))
    .moveDown(1)
  })

  // footer link al sito
  displayFooter(doc);

  displayNumeroPagina(doc, pagine.corrente, pagine.totali);

}

getPagine = (payload, pagina) => {
  const {details} = payload;
  let numeroPagineTotali = 0;
  
  if(payload.tipologia==='immobile'){
    const {visite, logs} = payload.immobile;
    // 1 intestazione 2 annuncio 3 docs 4 visite 5logs
    numeroPagineTotali = details ? 5 : 4;
    // controlla se ci sono pagine in più
    const numeroVisiteEccedenti = visite.length - 8;
    const numeroLogsEccedenti = logs.length - 14;
    if(numeroVisiteEccedenti>0) numeroPagineTotali = Math.ceil(numeroPagineTotali + numeroVisiteEccedenti / 10);
    if(numeroLogsEccedenti>0) numeroPagineTotali = Math.ceil(numeroPagineTotali + numeroLogsEccedenti / 16);
    // retrieve current page
    switch(pagina){
      case PAGINA.INTESTAZIONE: return  {totali: numeroPagineTotali, corrente: 1};
      case PAGINA.ANNUNCIO_IMMOBILE: return {totali: numeroPagineTotali, corrente: 2};
      case PAGINA.VISITE_IMMOBILE: return {totali: numeroPagineTotali, corrente: 3};
      case PAGINA.DOCS_IMMOBILE: return {totali: numeroPagineTotali, corrente: Math.ceil(4+numeroVisiteEccedenti/10)};
      case PAGINA.LOGS_IMMOBILE: return {totali: numeroPagineTotali, corrente: Math.ceil(5+numeroVisiteEccedenti/10)};
    }
  }else{
    return {totali: 1, corrente: 1}
  }
}

displayListaImmobili = (lista, doc, pagine, offset = 2) => {
    const limit = 16 - offset;
    let counter = 0;
    lista.forEach((el, index)=>{
      if(index===limit || (index-limit)%16===0){
        counter = 0;
        displayFooter(doc);
        displayNumeroPagina(doc, pagine.corrente, pagine.totali);
        pagine.corrente = pagine.corrente+1;
        creaPagina(doc);
      }
      doc.fontSize(13)
      .font('Helvetica-BoldOblique')
      .text(`${index+1}`, {continued: true})
      .font('Helvetica-Oblique')
      .text(` - (${getDate(el.data)}) Rif. ${el.ref}: ${el.titolo.length > 46 ? el.titolo.substr(0, 40)+"..." : el.titolo}`)
      .moveDown(1)
      counter++;
  })
  return counter;
}

displayListaAttivi = (lista, doc, pagine)=>{

  lista.forEach((immobile, index)=>{

    if(index===2 || (index-2)%3===0){
      displayFooter(doc);
      displayNumeroPagina(doc, pagine.corrente, pagine.totali);
      pagine.corrente = pagine.corrente+1;
      creaPagina(doc);
    }

    const prezzoMetroQuadro = formatNumber((immobile.prezzo/immobile.superficie).toFixed(0))+" € / m² ";
    const prezzoText = formatNumber(immobile.prezzo)+" € ";
    const superficieText = formatNumber(immobile.superficie)+" m² ";

    doc
    .fontSize(13)
    .fillColor(COLORS.NORMAL)
    .font('Helvetica-BoldOblique')
    .text('Rif: ', {continued: true})
    .font('Helvetica-Oblique')
    .text(immobile.ref, {continued: true})
    .font('Helvetica-BoldOblique')
    .text('    Titolo: ', {continued: true})
    .font('Helvetica-Oblique')
    .text(immobile.titolo)
    .moveDown(1)
    .font('Helvetica-BoldOblique')
    .text('Contratto: ', {continued: true})
    .font('Helvetica-Oblique')
    .text(capitalize(immobile.contratto), {continued: true})
    .font('Helvetica-BoldOblique')
    .text('    Categoria: ', {continued: true})
    .font('Helvetica-Oblique')
    .text(capitalize(immobile.categoria), {continued: true})
    .font('Helvetica-BoldOblique')
    .text('    Stato: ', {continued: true})
    .font('Helvetica-Oblique')
    .text(capitalize(immobile.stato))
    .moveDown(1)
    .font('Helvetica-BoldOblique')
    .text('Comune: ', {continued: true})
    .font('Helvetica-Oblique')
    .text(capitalize(immobile.comune), {continued: true})
    .font('Helvetica-BoldOblique')
    .text('    Indirizzo: ', {continued: true})
    .font('Helvetica-Oblique')
    .text(capitalize(immobile.indirizzo))
    .moveDown(1)
    .font('Helvetica-BoldOblique')
    .text('Prezzo: ', {continued: true})
    .font('Helvetica-Oblique')
    .text(prezzoText, {continued: true})
    .font('Helvetica-BoldOblique')
    .text('    Superficie: ', {continued: true})
    .font('Helvetica-Oblique')
    .text(superficieText, {continued: true})
    .font('Helvetica-BoldOblique')
    .text('    Prezzo / metro quadro: ', {continued: true})
    .font('Helvetica-Oblique')
    .text(prezzoMetroQuadro)
    .moveDown(1);

    if(immobile.datiZona){
      doc.font('Helvetica-BoldOblique')
      .text('Disponibile prezzo medio di zona rilevato a '+immobile.datiZona.periodoRiferimento)
      let prezzoZona = immobile.datiZona.prezzoMetroQuadro+" ("+immobile.datiZona.range+")";
      prezzoZona = prezzoZona.replace(/€/g, "€ ");
      prezzoZona = prezzoZona.replace(/m/g, " m");
      doc
      .fillColor(COLORS.BLUE)
      .font('Helvetica-Oblique')
      .moveDown(1)
      .text(prezzoZona)
      .moveDown(1);
    }

    doc.moveDown(1);

  })

}

const creaPaginaImmobiliCambiati = (doc, payload)=>{

  const {from, to, dataOffice} = payload;

  const {acquisizioni, conclusi} = dataOffice;

  const pagine = getPagine(payload, null);

  creaHeader(doc, payload, ["Immobili Acquisiti", "e Conclusi"]);

  doc.font('Helvetica-BoldOblique').fontSize(13)
  .text(`Periodo di riferimento: ${getDate(from)} - ${getDate(to)}`)
  .moveDown(1)
  .text(`Immobili acquisiti: ${acquisizioni.length}`)
  .moveDown(1);

  const offset = displayListaImmobili(acquisizioni, doc, pagine);

  const titoloConclusioni = `Immobili disattivati: ${conclusi.length}`;

  doc.font('Helvetica-BoldOblique').text(titoloConclusioni).moveDown(1);

  displayListaImmobili(conclusi, doc, pagine, offset);

  displayFooter(doc);

  displayNumeroPagina(doc, pagine.corrente, pagine.totali);

}

const creaPagineImmobiliAttivi = (doc, payload)=>{

  const {from, to, dataOffice} = payload;

  const {attivi} = dataOffice;

  const pagine = getPagine(payload, null);

  creaHeader(doc, payload, ["Lista Immobili Attivi", "con Analisi Prezzo e Visite"]);

  doc.font('Helvetica-BoldOblique').fontSize(13)
  .text(`Periodo di riferimento: ${getDate(from)} - ${getDate(to)}`)
  .moveDown(1)
  .text(`Immobili attivi: ${attivi.length}`)
  .moveDown(1);

  displayListaAttivi(attivi, doc, pagine);
}

const creaPaginaLavori = (doc, payload)=>{

  creaHeader(doc, payload, ["Analisi Lavori e", "Relativi Passaggi"]);
  
}

const creaPaginaOperazioni = (doc, payload)=>{

  creaHeader(doc, payload, ["Analisi Operazioni", "Effettuate"]);

  
}

const creaReportImmobile = (doc, payload) =>{
  // crea prima pagina
  creaPrimaPagina(doc, payload);
  // crea pagina annuncio con valutazione prezzo
  creaPaginaAnnuncioImmobile(doc, payload);
  // crea pagina visite effettuate
  creaPaginaVisiteImmobile(doc, payload);
  // crea pagina analisi documenti
  creaPaginaDocumentiEFoto(doc, payload);
  // if details crea pagina logs
  if(payload.details) creaPaginaModificheImmobile(doc, payload);
}

const creaReportGenerico = (doc, payload) =>{
  // crea prima pagina
  creaPrimaPagina(doc, payload);
  // crea pagina acquisizioni e chiusure
  creaPaginaImmobiliCambiati(doc, payload);
  // per ogni immobile attivo crea pagina annuncio e pagina visite
  creaPagineImmobiliAttivi(doc, payload);
  // crea pagina lavori
  creaPaginaLavori(doc, payload);
  // if details crea pagina operazioni
  if(payload.details) creaPaginaOperazioni(doc, payload);
}

exports.creaReport = payload =>{
    // iniziamo la creazione del documento
    const doc = new PDFDocument({autoFirstPage: false});    
    // in base alla tipologia crea report generico o specifico
    payload.tipologia==='immobile' ? creaReportImmobile(doc, payload): creaReportGenerico(doc, payload); 
    // chiudi documento
    doc.end();
    return doc;
}

