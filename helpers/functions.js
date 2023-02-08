import fs from "fs";
import ParserN3 from "@rdfjs/parser-n3";
import factory from "rdf-ext";
import datasetFactory from "@rdfjs/dataset";
import SHACLValidator from "rdf-validate-shacl";
import { querySudo as query } from "@lblod/mu-auth-sudo";
import { queryBehandelingMeeting, queryBehandelingShacl } from "./queries.js";
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

export async function validateShaclBehandeling(uri) {
  let uriSplit = uri.split('/');
  let _uri = uriSplit[5]

  const item = await query(queryBehandelingShacl(_uri));

  return new Promise(resolve => resolve(item.results.bindings))
}

export async function doShaclValidation(uuid) {
  const htmlContent = await query(queryBehandelingMeeting(uuid));
  let prefixDoc = '';
  let doc = '';
  let data = [];
  let validateBehandeling = [];
  for (const document of htmlContent.results.bindings) {
    validateBehandeling.push(await validateShaclBehandeling(document.behandeling.value));
    let prefix = ''
    let finalDoc = ''
    prefixDoc = JSON.parse(document?.editorDocumentContext.value).prefix
    doc = document?.editorDocumentContent.value
    for (const [key, value] of Object.entries(prefixDoc)) {
      prefix += key + ": "+ value + " ";
    }
    finalDoc = `<div prefix="${prefix}">` + doc + "</div>";
    data.push(finalDoc)
  }


  let prefixDocBehandeling = '';
  let docBehandeling = '';
  for(const document of validateBehandeling.filter(e => e.length)) {
    let prefix = ''
    let finalDoc = ''
    prefixDocBehandeling = JSON.parse(document[0]?.editorDocumentContext.value).prefix
    docBehandeling = document[0]?.editorDocumentContent.value

    for (const [key, value] of Object.entries(prefixDocBehandeling)) {
      prefix += key + ": "+ value + " ";
    }

    finalDoc = `<div prefix="${prefix}">` + doc + "</div>";
    data.push(finalDoc)
  }

  return await processHTML(data);
}

function doShaclValidationAsync(func) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(func());
    }, Math.floor(Math.random() * 1000));
  });
}

async function processHTML(data) {
  const errorMessages = []
  const promises = [];

  for(let i = 0; i < data.length; i++) {
    const myQuads = []
    const myParser = new RdfaParser({ contentType: 'text/html' });
    myParser.write(data[i]);
    myParser.end();

    promises.push(doShaclValidationAsync( () => {
      myParser
        .on('data', (data) => {
          myQuads.push(data);
        })
        .on('error', console.error)
        .on('end', async () => {
          const response = await main(myQuads);
          errorMessages.push(response[0]);
        });
    }));
  }

  await Promise.all(promises)
    .then((results) => {
      console.log("All done", results);
    })
    .catch((e) => {
      console.error("Something went wrong")
    });

  return errorMessages
}

export async function validatePresidentOfBehandeling(uri) {
  let uriSplit = uri.split('/');
  let _uri = uriSplit[5]

  const query_ = `
        PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
        PREFIX besluit: <http://data.vlaanderen.be/ns/besluit#>
        PREFIX dct: <http://purl.org/dc/terms/>

        SELECT ?heeftVoorzitter WHERE {
          ?mandaris besluit:heeftVoorzitter ?heeftVoorzitter .
          ?behandeling mu:uuid "${_uri}"
        }
  `

  const item = await query(query_);
  return new Promise(resolve => resolve(item.results.bindings))
}

export function validateParticipants(meeting, participants) {
  let isValid = true
  participants.forEach((participant) => {
    if(meeting.includes(participant)) isValid = false
  })

  return isValid
}

export async function validateBehandeling(uri) {
  let uriSplit = uri.split('/');
  let _uri = uriSplit[5]
  const query_ = `
        PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
        PREFIX besluit: <http://data.vlaanderen.be/ns/besluit#>
        PREFIX dct: <http://purl.org/dc/terms/>

        SELECT * WHERE {
          ?behandeling besluit:openbaar ?openbaar .
          ?behandeling mu:uuid "${_uri}"
        }
  `

  const item = await query(query_);

  return new Promise(resolve => resolve(item.results.bindings))
}