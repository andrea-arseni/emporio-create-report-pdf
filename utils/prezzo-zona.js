const axios = require("axios");
const MERCATO_IMMOBILIARE_URL =
    "https://www.immobiliare.it/mercato-immobiliare/lombardia";
exports.retrieveDatiZona = async (immobile) => {
    immobile.comune = immobile.comune.trim().replace(/\s/g, "-");
    const zona =
        immobile.comune === "segrate" || immobile.comune === "milano"
            ? immobile.comune + "/" + immobile.zona
            : immobile.comune;
    try {
        const url = MERCATO_IMMOBILIARE_URL + "/" + zona;
        const { data } = await axios.get(url);
        const porzioneHTMLconDati = data
            .split("Quotazioni immobiliari")[1]
            .split("https://www.immobiliare.it/agenzie-immobiliari")[0];
        const index = immobile.contratto === "vendita" ? 1 : 2;
        return {
            periodoRiferimento: porzioneHTMLconDati
                .split("Il periodo di riferimento &egrave; ")[1]
                .split("</b>.</p>")[0],
            prezzoMetroQuadro: porzioneHTMLconDati
                .split('nd-cgHighlighted__text">')
                [index].split("</p>")[0],
            range: porzioneHTMLconDati
                .split('<p class="nd-cgHighlighted__subtext">')
                [index].split("</p>")[0],
        };
    } catch (e) {
        console.log(e);
        return null;
    }
};
