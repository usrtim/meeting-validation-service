import { app, errorHandler } from "mu";
import { querySudo as query } from "@lblod/mu-auth-sudo";
import {
  queryAllMeetings,
  queryParticipants, missingParticipants, queryBehandeling
} from "./helpers/queries.js";
import {
  doShaclValidation,
  validateBehandeling,
  validateParticipants,
  validatePresidentOfBehandeling
} from "./helpers/functions.js";


app.get('/', function( req, res ) {
    res.send('Hello from here');
} );

app.get('/validateMeeting', async function( req, res ) {
  const uuid = req.query?.uuid

  const meeting = await query(queryAllMeetings(uuid));
  const participants = await query(queryParticipants(uuid));
  const notparticipants = await query(missingParticipants(uuid));
  // const voting = await query(queryVoting);
  const behandeling = await query(queryBehandeling(uuid))
  const participantsUriArr = participants.results.bindings.map(item => item.heeftAanwezigeBijStart.value)
  const meetingParticipantsArr = notparticipants.results.bindings.map(item => item.heeftAfwezigeBijStart.value)
  const behandelingArr = behandeling.results.bindings.map(item => item.behandeling.value)
  const meetingsArr = meeting.results.bindings.map(item => item.behandeling.value)
  // const votingArr = voting.results.bindings.map(item => item.behandeling.value)
  const areParticipantsValid = validateParticipants(meetingParticipantsArr, participantsUriArr)
  const shaclMessages = (await doShaclValidation(uuid)).filter(e => e?.message);

  let isValidBehandeling = true
  let behandelingHasPresident = true
  for(let item of behandelingArr) {
    const behandelingResult = await validateBehandeling(item)
    const getBehandelingPresindetReulst = await validatePresidentOfBehandeling(item)
    if(behandelingResult.length === 0) {
      isValidBehandeling = false
    }
    if(getBehandelingPresindetReulst.length === 0) {
      behandelingHasPresident = false
    }
  }

  const errorMessages = {};

  if(meetingsArr.length === 0) {
    errorMessages["meeting"] = "No meeting found";
    errorMessages["success"] = false
  } else {
    errorMessages["success"] = true

    if (!isValidBehandeling) {
      errorMessages["behandeling"] = "Behandeling is invalid";
      errorMessages["success"] = false
    }
    if (!behandelingHasPresident) {
      errorMessages["behandelingPresident"] = "Behandeling shoud have a president";
      errorMessages["success"] = false
    }
    if (!areParticipantsValid) {
      errorMessages["participants"] = "Participants are not valid";
      errorMessages["success"] = false
    }
    if(shaclMessages.length !== 0) {
      errorMessages["shacl"] = shaclMessages
      errorMessages["success"] = false
    }
  }

  res.send( JSON.stringify(errorMessages) );
})










/************************  NOT USED CURRENTLY ******************************************************************************************************/

//
// app.get('/shaclvalidate', async function( req, res) {
//   const uuid = req.query?.uuid
//
//   var queryMeeting = `
//       PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
//       PREFIX besluit: <http://data.vlaanderen.be/ns/besluit#>
//       PREFIX prov: <http://www.w3.org/ns/prov#>
//       PREFIX dct: <http://purl.org/dc/terms/>
//       PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
//
//       SELECT DISTINCT ?behandeling ?editorDocumentContent ?editorDocumentContext WHERE {
//         ?zitting besluit:behandelt ?agendapoint.
//         ?behandeling besluit:heeftStemming ?voting.
//         ?voting besluit:aantalOnthouders ?FaantalOnthouders .
//         ?voting besluit:aantalTegenstanders ?aantalTegenstanders .
//         ?voting besluit:aantalTegenstanders ?aantalVoorstanders .
//         ?voting besluit:geheim ?geheim .
//         ?voting besluit:gevolg ?gevolg .
//         ?voting besluit:onderwerp ?onderwerp .
//         ?document ext:hasDocumentContainer ?hasDocumentContainer .
//         ?hasDocumentContainer ext:editorDocumentStatus ?editorDocumentStatus .
//         ?hasDocumentContainer ext:editorDocumentFolder ?editorDocumentFolder .
//         ?rdfa ext:editorDocumentContent ?editorDocumentContent .
//         ?rdfa ext:editorDocumentContext ?editorDocumentContext .
//         ?meeting mu:uuid "${uuid}"
//       }
//   `
//
//   const htmlContent = await query(queryMeeting);
//   let prefixDoc = '';
//   let doc = '';
//   let data = [];
//   let validateBehandeling = [];
//   for (const document of htmlContent.results.bindings) {
//     validateBehandeling.push(await validateShaclBehandeling(document.behandeling.value));
//     let prefix = ''
//     let finalDoc = ''
//     prefixDoc = JSON.parse(document?.editorDocumentContext.value).prefix
//     doc = document?.editorDocumentContent.value
//     for (const [key, value] of Object.entries(prefixDoc)) {
//       prefix += key + ": "+ value + " ";
//     }
//     finalDoc = `<div prefix="${prefix}">` + doc + "</div>";
//     data.push(finalDoc)
//   }
//
//   // console.log('***** document ****---(((((((((((((((->', validateBehandeling.filter(e => e.length));
//
//   let prefixDocBehandeling = '';
//   let docBehandeling = '';
//   for(const document of validateBehandeling.filter(e => e.length)) {
//     // console.log('document0----->', document);
//     let prefix = ''
//     let finalDoc = ''
//     prefixDocBehandeling = JSON.parse(document[0]?.editorDocumentContext.value).prefix
//     docBehandeling = document[0]?.editorDocumentContent.value
//
//     for (const [key, value] of Object.entries(prefixDocBehandeling)) {
//       prefix += key + ": "+ value + " ";
//     }
//
//     finalDoc = `<div prefix="${prefix}">` + doc + "</div>";
//     data.push(finalDoc)
//   }
//
//   console.log('************ VALIDATE MEETING *****************');
//
//   console.log('***********************************************************************data', data.length)
//
//   for(let i = 0; i < data.length; i++) {
//     const myQuads = []
//     const myParser = new RdfaParser({ contentType: 'text/html' });
//     myParser.write(data[i]);
//     myParser.end();
//
//     myParser
//       .on('data', (data) => {
//         myQuads.push(data);
//       })
//       .on('error', console.error)
//       .on('end', () => {
//         main(myQuads);
//         console.log('All triples were parsed!')
//       });
//
//   }
//
//   console.log('************ VALIDATE BEHANDELING *****************');
//
//
//
//   res.send({ timi: true})
//
//   return true;
// })
//
// app.get('/query', function( req, res ) {
//     var myQuery = `
//     PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
//     PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
//     PREFIX person: <http://www.w3.org/ns/person#>
//
//     SELECT distinct ?person ?name WHERE {
//     ?person rdf:type person:Person;
//            <http://data.vlaanderen.be/ns/persoon#gebruikteVoornaam> ?name.
//     }
//     LIMIT 20
// `;
//
//     query( myQuery )
//         .then( function(response) {
//             res.send( JSON.stringify( response ) );
//         })
//         .catch( function(err) {
//             res.send( "Oops something went wrong: " + JSON.stringify( err ) );
//         });
// } );
//
// app.get('/get_all_meetings_with_participants', function( req, res) {
//   var myQuery =`
//         PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
//         PREFIX besluit: <http://data.vlaanderen.be/ns/besluit#>
//         PREFIX prov: <http://www.w3.org/ns/prov#>
//
//         SELECT * WHERE {
//           ?meeting besluit:geplandeStart ?geplandeStart .
//           ?meeting prov:startedAtTime ?startedAtTime .
//           ?meeting besluit:heeftAanwezigeBijStart ?heeftAanwezigeBijStart .
//           ?meeting prov:endedAtTime ?endedAtTime .
//           ?meeting prov:atLocation ?atLocation .
//         }
//     `;
//
//   query( myQuery )
//     .then( function(response) {
//       res.send( response?.results?.bindings.length !== 0 );
//     })
//     .catch( function(err) {
//       res.send( "Oops something went wrong: " + JSON.stringify( err ) );
//     });
// })
//
// app.get('/get_all_meetings_without_participants', function( req, res) {
//   var myQuery =`
//         PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
//         PREFIX besluit: <http://data.vlaanderen.be/ns/besluit#>
//         PREFIX prov: <http://www.w3.org/ns/prov#>
//
//         SELECT * WHERE {
//           ?meeting besluit:geplandeStart ?geplandeStart .
//           ?meeting prov:startedAtTime ?startedAtTime .
//           ?meeting ext:heeftAfwezigeBijStart ?heeftAfwezigeBijStart .
//           ?meeting prov:endedAtTime ?endedAtTime .
//           ?meeting prov:atLocation ?atLocation .
//         }
//     `;
//
//   query( myQuery )
//     .then( function(response) {
//       res.send( response?.results?.bindings.length !== 0 );
//     })
//     .catch( function(err) {
//       res.send( "Oops something went wrong: " + JSON.stringify( err ) );
//     });
// })
//
// app.get('/get_all_meetings_with_president', function( req, res) {
//   var myQuery =`
//         PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
//         PREFIX besluit: <http://data.vlaanderen.be/ns/besluit#>
//         PREFIX prov: <http://www.w3.org/ns/prov#>
//
//         SELECT * WHERE {
//           ?meeting besluit:geplandeStart ?geplandeStart .
//           ?meeting prov:startedAtTime ?startedAtTime .
//           ?meeting besluit:heeftVoorzitter ?heeftVoorzitter .
//           ?meeting prov:endedAtTime ?endedAtTime .
//           ?meeting prov:atLocation ?atLocation .
//         }
//     `;
//
//   query( myQuery )
//     .then( function(response) {
//       res.send( response?.results?.bindings.length !== 0 );
//     })
//     .catch( function(err) {
//       res.send( "Oops something went wrong: " + JSON.stringify( err ) );
//     });
// })
//
// app.get('/get_all_meetings_with_secretary', function( req, res) {
//   var myQuery =`
//         PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
//         PREFIX besluit: <http://data.vlaanderen.be/ns/besluit#>
//         PREFIX prov: <http://www.w3.org/ns/prov#>
//
//         SELECT * WHERE {
//           ?meeting besluit:geplandeStart ?geplandeStart .
//           ?meeting prov:startedAtTime ?startedAtTime .
//           ?meeting besluit:heeftSecretaris ?heeftSecretaris .
//           ?meeting prov:endedAtTime ?endedAtTime .
//           ?meeting prov:atLocation ?atLocation .
//         }
//     `;
//
//   query( myQuery )
//     .then( function(response) {
//       res.send( response?.results?.bindings.length !== 0 );
//     })
//     .catch( function(err) {
//       res.send( "Oops something went wrong: " + JSON.stringify( err ) );
//     });
// })
//
// app.get('/get_single_meeting', function( req, res ) {
//   const uuid = req.query?.uuid
//   var myQuery =`
//       PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
//       PREFIX besluit: <http://data.vlaanderen.be/ns/besluit#>
//       PREFIX prov: <http://www.w3.org/ns/prov#>
//
//       SELECT * WHERE {
//         ?meeting besluit:geplandeStart ?geplandeStart .
//         ?meeting prov:startedAtTime ?startedAtTime .
//         ?meeting prov:endedAtTime ?endedAtTime .
//         ?meeting prov:atLocation ?atLocation .
//         ?meeting mu:uuid "${uuid}"
//       }
//     `;
//
//   query( myQuery )
//     .then( function(response) {
//       res.send( response?.results?.bindings.length !== 0 );
//     })
//     .catch( function(err) {
//       res.send( "Oops something went wrong: " + JSON.stringify( err ) );
//     });
// })
//
// app.get('/all_validated_mettings', function( req, res ) {
//   var myQuery =`
//         PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
//         PREFIX besluit: <http://data.vlaanderen.be/ns/besluit#>
//         PREFIX prov: <http://www.w3.org/ns/prov#>
//
//         SELECT * WHERE {
//           ?meeting besluit:geplandeStart ?geplandeStart .
//           ?meeting prov:startedAtTime ?startedAtTime .
//           ?meeting prov:endedAtTime ?endedAtTime .
//           ?meeting prov:atLocation ?atLocation .
//         }
//     `;
//
//   query( myQuery )
//     .then( function(response) {
//       res.send( response?.results?.bindings.length !== 0 );
//     })
//     .catch( function(err) {
//       res.send( "Oops something went wrong: " + JSON.stringify( err ) );
//     });
// })

app.use(errorHandler);
