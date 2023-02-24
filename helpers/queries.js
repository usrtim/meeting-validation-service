import { sparqlEscapeString } from 'mu';
export const queryTreatmentsForShaclValidation = (uuid) => `
      PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
      PREFIX dct: <http://purl.org/dc/terms/>
      PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
      PREFIX pav: <http://purl.org/pav/>
      
      SELECT * WHERE {
          ?behandeling mu:uuid ${sparqlEscapeString(uuid)};
                       dct:subject ?agendapoint;
                       ext:hasDocumentContainer ?documentContainer .
          ?documentContainer pav:hasCurrentVersion ?editorDocument.
          ?editorDocument ext:editorDocumentContent ?editorDocumentContent;
                          ext:editorDocumentContext ?editorDocumentContext .
      }
  `

export const queryTreatmentsForMeetingValidation = (uuid) => `
      PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
      PREFIX besluit: <http://data.vlaanderen.be/ns/besluit#>
      PREFIX dct: <http://purl.org/dc/terms/>
      PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
      PREFIX pav: <http://purl.org/pav/>

      SELECT DISTINCT ?behandeling ?editorDocumentContent ?editorDocumentContext WHERE {
        ?meeting mu:uuid ${sparqlEscapeString(uuid)};
                 besluit:behandelt ?agendapoint .
        ?behandeling dct:subject ?agendapoint;
                     ext:hasDocumentContainer ?hasDocumentContainer .
        ?hasDocumentContainer pav:hasCurrentVersion ?editorDocument .
        ?editorDocument ext:editorDocumentContent ?editorDocumentContent;
                        ext:editorDocumentContext ?editorDocumentContext
      }
  `

export const queryMeeting = (uuid) => `
    PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
    PREFIX besluit: <http://data.vlaanderen.be/ns/besluit#>
    PREFIX prov: <http://www.w3.org/ns/prov#>
    PREFIX dct: <http://purl.org/dc/terms/>
    
    SELECT DISTINCT ?meeting ?plannedToStart ?startedAtTime ?endedAtTime ?atLocation ?hasPresident ?hasSecretary ?treatment ?agendapoint WHERE {
      ?meeting mu:uuid ${sparqlEscapeString(uuid)};
               besluit:geplandeStart ?plannedToStart;
               prov:startedAtTime ?startedAtTime.
      OPTIONAL { ?meeting prov:endedAtTime ?endedAtTime. }
      OPTIONAL { ?meeting prov:atLocation ?atLocation . }
      OPTIONAL { ?meeting besluit:heeftVoorzitter ?hasPresident . }
      OPTIONAL { ?meeting besluit:heeftSecretaris ?hasSecretary . }
      OPTIONAL { ?meeting besluit:behandelt ?treatment . }    
      OPTIONAL { ?meeting besluit:behandelt ?agendapoint. }
    }
  `

export const queryParticipants = (uuid) => `
      PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
      PREFIX besluit: <http://data.vlaanderen.be/ns/besluit#>
      PREFIX prov: <http://www.w3.org/ns/prov#>
      
      SELECT ?heeftAanwezigeBijStart WHERE {
        ?meeting mu:uuid ${sparqlEscapeString(uuid)};
                 besluit:heeftAanwezigeBijStart ?heeftAanwezigeBijStart
      }
  `

export const queryMissingParticipants = (uuid) => `
      PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
      PREFIX besluit: <http://data.vlaanderen.be/ns/besluit#>
      PREFIX prov: <http://www.w3.org/ns/prov#>
      PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
      
      SELECT * WHERE {
        ?meeting mu:uuid ${sparqlEscapeString(uuid)};
                 ext:heeftAfwezigeBijStart ?heeftAfwezigeBijStart
      }
  `

export const queryTreatment = (uuid) => `
      PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
      PREFIX besluit: <http://data.vlaanderen.be/ns/besluit#>
      PREFIX dct: <http://purl.org/dc/terms/>
      
      SELECT * WHERE {
        ?meeting mu:uuid ${sparqlEscapeString(uuid)};
                besluit:behandelt ?agendapoint.
        ?behandeling dct:subject ?agendapoint.
      }
  `