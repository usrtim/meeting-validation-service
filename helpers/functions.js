import fs from "fs";
import ParserN3 from "@rdfjs/parser-n3";
import factory from "rdf-ext";
import datasetFactory from "@rdfjs/dataset";
import SHACLValidator from "rdf-validate-shacl";
import { querySudo as query } from "@lblod/mu-auth-sudo";
import {
  queryTreatmentsForMeetingValidation,
  queryTreatmentsForShaclValidation
} from "./queries.js";
import { RdfaParser } from "rdfa-streaming-parser";

export async function loadDataset (filePath) {
  const stream = fs.createReadStream(filePath)
  const parser = new ParserN3({ factory })
  return factory.dataset().import(parser.import(stream))
}

export async function main(quds) {
  const shapes = await loadDataset('myshapes.ttl')
  const data = datasetFactory.dataset(quds)

  const validator = new SHACLValidator(shapes, { factory })
  const report = await validator.validate(data)

  const errorMessages = [];

  for (const result of report.results) {
    errorMessages.push({
      message: result.message[0].value,
      path: result.path.value,
      focusNode: result.focusNode.value
    })
  }

  return new Promise(resolve => resolve(errorMessages))
}

export async function shaclValidateTreatment(uri) {
  let uriSplit = uri.split('/');
  let uuid = uriSplit[5]

  const item = await query(queryTreatmentsForShaclValidation(uuid));

  return item.results.bindings;
}

export async function doShaclValidation(uuid) {
  const htmlContent = await query(queryTreatmentsForMeetingValidation(uuid));
  let meetingsAddPrefix = '';
  let doc = '';
  let data = [];
  let validTreatments = [];
  for (const document of htmlContent.results.bindings) {
    validTreatments.push(await shaclValidateTreatment(document.behandeling.value));
    let prefix = ''
    let finalDoc = ''
    meetingsAddPrefix = JSON.parse(document?.editorDocumentContext.value).prefix
    doc = document?.editorDocumentContent.value
    for (const [key, value] of Object.entries(meetingsAddPrefix)) {
      prefix += key + ": "+ value + " ";
    }
    finalDoc = `<div prefix="${prefix}">` + doc + "</div>";
    data.push(finalDoc)
  }


  let treatmentsAddPrefix = '';
  let treatmentDoc = '';
  for(const document of validTreatments.filter(e => e.length)) {
    let prefix = ''
    let finalDoc = ''
    treatmentsAddPrefix = JSON.parse(document[0]?.editorDocumentContext.value).prefix
    treatmentDoc = document[0]?.editorDocumentContent.value

    for (const [key, value] of Object.entries(treatmentsAddPrefix)) {
      prefix += key + ": "+ value + " ";
    }

    finalDoc = `<div prefix="${prefix}">` + treatmentDoc + "</div>";
    data.push(finalDoc)
  }

  return (await processHTML(data)).filter(e => e.length !== 0)
}

async function processHTML(data) {
  const promises = [];

  for(let i = 0; i < data.length; i++) {
    const myQuads = []
    const myParser = new RdfaParser({ contentType: 'text/html' });
    myParser.write(data[i]);
    myParser.end();

    promises.push(new Promise((resolve) => {
      myParser
          .on('data', (data) => {
            myQuads.push(data);
          })
          .on('error', console.error)
          .on('end', async () => {
            const response = await main(myQuads);

            resolve(response);
          });
    }));

  }

  return await Promise.all(promises);
}

export async function validateTreatmentPresident(uri) {
  let uriSplit = uri.split('/');
  let uuid = uriSplit[5]

  const query_ = `
        PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
        PREFIX besluit: <http://data.vlaanderen.be/ns/besluit#>
        PREFIX dct: <http://purl.org/dc/terms/>

        SELECT ?hasPresident WHERE {
          ?behandeling besluit:heeftVoorzitter ?hasPresident .
          ?behandeling mu:uuid "${uuid}"
        }
  `

  const item = await query(query_);

  return item.results.bindings;
}

export function checkIfParticipantsAttendingMeeting(meetingsURIs, participantsURIs) {
  let isValid = true

  participantsURIs.forEach((participant) => {
    if(meetingsURIs.includes(participant)) isValid = false
  })

  return isValid
}

export async function validateTreatment(uri) {
  let uriSplit = uri.split('/');
  let uuid = uriSplit[5];

  const query_ = `
        PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
        PREFIX besluit: <http://data.vlaanderen.be/ns/besluit#>
        PREFIX dct: <http://purl.org/dc/terms/>

        SELECT * WHERE {
          ?behandeling besluit:openbaar ?openbaar .
          ?behandeling mu:uuid "${uuid}"
        }
  `

  const item = await query(query_);

  return item.results.bindings;
}