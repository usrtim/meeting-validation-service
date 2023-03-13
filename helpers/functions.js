import fs from "fs";
import { sparqlEscapeUri } from 'mu';
import ParserN3 from "@rdfjs/parser-n3";
import factory from "rdf-ext";
import datasetFactory from "@rdfjs/dataset";
import SHACLValidator from "rdf-validate-shacl";
import { querySudo as query } from "@lblod/mu-auth-sudo";
import {
  queryDocumentsForMeetingValidation
} from "./queries.js";
import { RdfaParser } from "rdfa-streaming-parser";
import {messages} from "./errorMessages.js";

export async function loadDataset (filePath) {
  const stream = fs.createReadStream(filePath)
  const parser = new ParserN3({ factory })
  return factory.dataset().import(parser.import(stream))
}

export async function getShaclErrorMessages(quads) {
  const shapes = await loadDataset('myshapes.ttl')
  const data = datasetFactory.dataset(quads)

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

  return errorMessages
}

export async function doShaclValidation(uuid) {
  const response = await query(queryDocumentsForMeetingValidation(uuid));
  if(response.results?.bindings?.length === 0) return 'No Document found when trying to do the SHACL validation';

  const data = [response.results.bindings].map((document) => {
    let docPrefix = '';
    let prefix = ''
    docPrefix = JSON.parse(document[0]?.editorDocumentContext.value).prefix

    for (const [key, value] of Object.entries(docPrefix)) {
      prefix += key + ": "+ value + " ";
    }

    return `<div prefix="${prefix}">` + document[0]?.editorDocumentContent.value + "</div>";
  })

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
            const response = await getShaclErrorMessages(myQuads);

            resolve(response);
          });
    }));

  }

  return await Promise.all(promises);
}

export async function queryPresidentAndPublicness(uri) {
  const item = await query(`
        PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
        PREFIX besluit: <http://data.vlaanderen.be/ns/besluit#>
        PREFIX dct: <http://purl.org/dc/terms/>

        SELECT ?hasPresident ?openbaar WHERE {
          ${sparqlEscapeUri(uri)} besluit:heeftVoorzitter ?hasPresident .
          ${sparqlEscapeUri(uri)} besluit:openbaar ?openbaar .
        }
  `);

  return item?.results?.bindings;
}
export function overlapBetweenAbsentAndPresentPeople(missingParticipantsURIs, participantsURIs) {
  const missingParticipants = new Set(missingParticipantsURIs)
  const participants = new Set(participantsURIs)

  return [...participants].filter(x => missingParticipants.has(x)).length === 0
}

export async function validateAndGenerateErrorMessages(meeting, treatments, areParticipantsValid, shaclMessages) {
  let isTreatmentValid = true
  let hasTreatmentPresident = true
  const responseMessage = { message: {}, status: 200 };

  for(let item of treatments) {
    const treatmentResults = await queryPresidentAndPublicness(item)
    const publicness = treatmentResults.filter(item => item?.openbaar)
    const president = treatmentResults.filter(item => item?.hasPresident)

    if(publicness.length === 0) {
      isTreatmentValid = false
    }
    if(president.length === 0) {
      hasTreatmentPresident = false
    }
  }

  if(meeting.length !== 0) {
    responseMessage.success = true

    if(treatments.length === 0 || !isTreatmentValid || !hasTreatmentPresident || !areParticipantsValid || shaclMessages.length !== 0) {
      responseMessage.success = false
      responseMessage.status = 400;
    }

    if(treatments.length === 0) {
      responseMessage.message.treatmentNotFound = messages.meeting.treatmentNotFound;
    }

    if (!isTreatmentValid) {
      responseMessage.message.treatmentIsInvalid = messages.meeting.treatmentIsInvalid;
    }

    if (!hasTreatmentPresident) {
      responseMessage.message.treatmentPresidentMissing = messages.meeting.treatmentPresidentMissing;
    }

    if (!areParticipantsValid) {
      responseMessage.message.participants = messages.meeting.participantsAreNotValid;
    }

    if(!meeting[0].endedAtTime) {
      responseMessage.message.meetingEndedAtTime = messages.meeting.meetingEndedAtTime
    }

    if(!meeting[0].hasPresident) {
      responseMessage.message.meetingHasPresident = messages.meeting.meetingHasPresident
    }

    if(!meeting[0].hasSecretary) {
      responseMessage.message.meetingHasSecretary = messages.meeting.meetingHasSecretary
    }

    if(!meeting[0].agendapoint) {
      responseMessage.message.meetingHasAgendaPoint = messages.meeting.meetingHasAgendaPoint
    }

    if(shaclMessages.length !== 0) {
      responseMessage.message.shacl = shaclMessages
    }
  }

  return responseMessage
}