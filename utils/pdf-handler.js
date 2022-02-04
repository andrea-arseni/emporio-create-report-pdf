const PDFDocument = require('pdfkit');

const MESI = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", 
"Ottobre", "Novembre", "Dicembre"]

const getDate = (giornoEmissione) => 
`${new Date(giornoEmissione).getDate()} ${MESI[new Date(giornoEmissione).getMonth()]} ${new Date(giornoEmissione).getFullYear()}`;

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

const displayFooter = (doc)=>{
    const webAddress = "https://www.emporio-case.com";
    const email = "emporiocase@emporiocase.com";
    const sede = "Sede: Via Gramsci 34, Segrate (MI)";
  
    doc
    .fontSize(12)
    .font('Helvetica')
    .fillColor('#232323')
    .text("Emporio Case sas", 250, doc.page.height - 87)
    .text(sede)
    .text("Email: ", {
        continued: true
    }).fillColor('#007BFF')
    .text(email, {
        link: "mailto:"+email
    }).fillColor('#232323')
    .text("Sito: ", {
       continued: true
     }).fillColor('#007BFF')
     .text(webAddress, {
      link: webAddress,
    });
}

const displayParagrafoPDF = (doc, key, value, rows, startingHorizontalPoint)=>{
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
    ['Analisi annuncio e valutazione prezzo', 'Analisi visite effettuate', 'Analisi documenti']:
    ['Analisi acquisizioni e chiusure', 'Analisi immobili attivi', 'Analisi lavori attivi'];

    if(details){
        tipologia==='immobile' ?
            textObject.push('Analisi modifiche effettuate') :
            textObject.push('Analisi operazioni');
    }
  
    // intestazione Header
    doc.fontSize(23)
    .font('Helvetica-Bold')
    .text(textHeader, 250, 85)
    .moveDown(3).fontSize(15);
  
    // Tipologia
    displayParagrafoPDF(doc, 'Oggetto:', textObject, 3, 250);
  
    // Creato il 
    displayParagrafoPDF(doc, 'Periodo:', [`Dal ${getDate(from)} al ${getDate(to)}`], 3, 250);
    
    // footer link al sito
    displayFooter(doc);
  }

const displayPaginaScheda = async(doc, image, images, fascicolo, user, timeOffset, timeZone)=>{
    // Acquisisco index
    const index = images.findIndex(el=>el._id === image._id);
    
    // crea pagina
    creaPagina(doc);
  
    // crea intestazione
    // definiamo gradiente prima pagina
    let grad = doc.linearGradient(0, 0, doc.page.width, 150);
    grad.stop(0, '#022D57', 1)
        .stop(1, '#022D57', 0.7);
  
    // disegnamo colonna in alto    
    doc.rect(0, 0, doc.page.width, 150);
    doc.fill(grad);
  
    // introduciamo logo in alto a sinistra
    doc.image('public/img/logo.png', 50, 25, {
      fit: [100, 100]
    });
  
    // intestazione
    doc.fontSize(20)
    .font('Helvetica-BoldOblique')
    .fillColor('#ffffff')
    .text(`Immagine ${index + 1}`, 0, 65, {align: 'center'})
    .moveDown(4).fontSize(12);
  
    // Acquisisco immagine dal bucket
    const key = getKey(image);
  
    try{
      image.file = await handleS3.getFile(key);
    }catch(e){
      return next(new ErrorApp(500, "File richiesto non trovato, procedura annullata"));
    }
    
    // acquisisci width e height immagine
    const width = sizeOf(image.file).width;
    const height = sizeOf(image.file).height;
  
    const sharpResizeConfig = width>height ? {height: 400} : {width:400};
  
    // image resize
    const sharpImage = sharp(image.file);
    image.file = await sharpImage.resize(sharpResizeConfig).toBuffer();  
  
    // definisci fit in base alle caratteristiche dell'immagine - 3 optioni
    let fit = [];
    if(width > height){
      fit = [400,300];
    }else if (width < height){
      fit = [300,400];
    }else{
      fit = [400,400];
    }
  
    doc.image(image.file, (doc.page.width - fit[0])/2, 200, {
      fit,
      align: 'center',
      valign: 'center'
    });
  
    doc
    .fillColor('#022D57')
    .moveDown(width <= height ? 31 : 26);
  
    if(image.fascicolo !== fascicolo._id){
      const imageProfile = await Profile.findById(image.profile);
      user = await User.findById(imageProfile.user);
    }
  
  
    // Acquisita da nome(email)
    displayParagrafoPDF(doc, "Autore:", `${user.name} (${user.email})`, 1, (doc.page.width - fit[0])/2);
  
    // Il giorno alle ore
    displayParagrafoPDF(doc, "Data:", `${getDate(image.time, "estesa")} alle ore ${new Date(image.time.getTime() - timeOffset).toString().split(' ')[4].substr(0,5)} (${timeZone})`, 1, (doc.page.width - fit[0])/2);
  
    // Diretto link di acquisizione
    doc
    .fillColor('#007BFF')
     .text("Luogo di acquisizione", {
      underline: true,
      link: `https://www.google.com/maps/search/?api=1&query=${image.coordinate.lat},${image.coordinate.lng}`,
    });
  
}

exports.creaReport = payload =>{
    // iniziamo la creazione del documento
    const doc = new PDFDocument({autoFirstPage: false});
    // crea prima pagina
    creaPrimaPagina(doc, payload);
    // chiudi documento
    doc.end();
    return doc;
}