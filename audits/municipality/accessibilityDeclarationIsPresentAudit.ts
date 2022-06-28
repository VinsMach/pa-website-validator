"use strict";

import { CheerioAPI } from "cheerio";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import lighthouse from "lighthouse";
import {
  loadPageData,
  getHttpsRequestStatusCode,
  hostnameExists,
  isHttpsUrl,
  isInternalUrl,
  buildUrl,
} from "../../utils/utils";

const Audit = lighthouse.Audit;

const greenResult = "Il link è corretto e nella posizione corretta.";
const redResult = "Il link è errato o non è nella posizione corretta.";

class LoadAudit extends Audit {
  static get meta() {
    return {
      id: "municipality-legislation-accessibility-declaration-is-present",
      title:
        "C.SI.3.2 - DICHIARAZIONE DI ACCESSIBILITÀ - Il sito comunale deve esporre la dichiarazione di accessibilità.",
      failureTitle:
        "C.SI.3.2 - DICHIARAZIONE DI ACCESSIBILITÀ - Il sito comunale deve esporre la dichiarazione di accessibilità.",
      scoreDisplayMode: Audit.SCORING_MODES.BINARY,
      description:
        "CONDIZIONI DI SUCCESSO: il sito presenta una voce nel footer che riporta alla dichiarazione di accessibilità di AgID, in conformità al modello e alle linee guida rese disponibile da AgID in ottemperanza alla normativa vigente in materia di accessibilità, con livelli di accessibilità contemplati nelle specifiche tecniche WCAG 2.1; MODALITÀ DI VERIFICA: viene verificata la presenza e posizione del link nel footer e che riporti correttamente ad AgID; RIFERIMENTI TECNICI E NORMATIVI: AgID Dichiarazione di accessibilità, AgID Linee guida sull’accessibilità degli strumenti informatici, Direttiva UE n. 2102/2016, Legge 9 gennaio 2004 n. 4, Web Content Accessibility Guidelines WCAG 2.1.",
      requiredArtifacts: ["origin"],
    };
  }

  static async audit(
    artifacts: LH.Artifacts & {
      origin: string;
    }
  ): Promise<{ score: number; details: LH.Audit.Details.Table }> {
    const url = artifacts.origin
    let score = 0;

    const headings = [
      {
        key: "result",
        itemType: "text",
        text: "Risultato",
      },
      {
        key: "link_name",
        itemType: "text",
        text: "Nome del link",
      },
      {
        key: "link_destination",
        itemType: "text",
        text: "Destinazione link",
      },
    ];

    const items = [
      {
        result: redResult,
        link_name: "",
        link_destination: "",
      },
    ];

    const $: CheerioAPI = await loadPageData(url);
    const accessibilityDeclarationElement = $("footer").find(
      '[data-element="accessibility-link"]'
    );
    const elementObj = $(accessibilityDeclarationElement).attr();
    items[0].link_name = accessibilityDeclarationElement.text() ?? "";

    if (
      Boolean(elementObj) &&
      "href" in elementObj &&
      elementObj.href !== "#" &&
      elementObj.href !== "" &&
      elementObj.href.includes("form.agid.gov.it")
    ) {
      let inspectUrl = elementObj.href;
      items[0].link_destination = inspectUrl;

      if (
        (await isInternalUrl(elementObj.href)) &&
        !elementObj.href.includes(url)
      ) {
        inspectUrl = await buildUrl(url, elementObj.href);
      }

      if (!(await isHttpsUrl(inspectUrl))) {
        items[0].result += " Protocollo HTTPS mancante nell'URL.";
        return {
          score: 0,
          details: Audit.makeTableDetails(headings, items),
        };
      }

      const hostExists = await hostnameExists(inspectUrl);
      if (!hostExists.exists) {
        items[0].result += " Hostname non trovato.";
        return {
          score: 0,
          details: Audit.makeTableDetails(headings, items),
        };
      }

      const statusCode = await getHttpsRequestStatusCode(inspectUrl);
      if (statusCode !== 200) {
        items[0].result += " Pagina non trovata.";
        return {
          score: 0,
          details: Audit.makeTableDetails(headings, items),
        };
      }

      items[0].result = greenResult;
      score = 1;
    }

    return {
      score: score,
      details: Audit.makeTableDetails(headings, items),
    };
  }
}

module.exports = LoadAudit;
