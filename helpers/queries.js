import { sparqlEscapeString } from 'mu';
export const queryTreatmentsForShaclValidation = (uuid) => `
      PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
      PREFIX besluit: <http://data.vlaanderen.be/ns/besluit#>
      PREFIX prov: <http://www.w3.org/ns/prov#>
      PREFIX dct: <http://purl.org/dc/terms/>
      PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
      PREFIX pav: <http://purl.org/pav/>
      
      SELECT * WHERE {
          ?documentContainer pav:hasCurrentVersion ?editorDocument.
          ?editorDocument ext:editorDocumentContent ?editorDocumentContent .
          ?editorDocument ext:editorDocumentContext ?editorDocumentContext .
          ?zitting besluit:behandelt ?agendapoint.
          ?behandeling dct:subject ?agendapoint.
          ?behandeling ext:hasDocumentContainer ?documentContainer .
          ?behandeling mu:uuid ${sparqlEscapeString(uuid)}
      }
  `

export const queryTreatmentsForMeetingValidation = (uuid) => `
      PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
      PREFIX besluit: <http://data.vlaanderen.be/ns/besluit#>
      PREFIX prov: <http://www.w3.org/ns/prov#>
      PREFIX dct: <http://purl.org/dc/terms/>
      PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>

      SELECT DISTINCT ?behandeling ?editorDocumentContent ?editorDocumentContext WHERE {
        ?meeting besluit:behandelt ?agendapoint.
        ?behandeling dct:subject ?agendapoint .
        ?voting besluit:aantalOnthouders ?FaantalOnthouders .
        ?voting besluit:aantalTegenstanders ?aantalTegenstanders .
        ?voting besluit:aantalTegenstanders ?aantalVoorstanders .
        ?voting besluit:geheim ?geheim .
        ?voting besluit:gevolg ?gevolg .
        ?voting besluit:onderwerp ?onderwerp .
        ?document ext:hasDocumentContainer ?hasDocumentContainer .
        ?hasDocumentContainer ext:editorDocumentStatus ?editorDocumentStatus .
        ?hasDocumentContainer ext:editorDocumentFolder ?editorDocumentFolder .
        ?rdfa ext:editorDocumentContent ?editorDocumentContent .
        ?rdfa ext:editorDocumentContext ?editorDocumentContext .
        ?meeting mu:uuid ${sparqlEscapeString(uuid)}
      }
  `

export const queryMeeting = (uuid) => `
    PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
    PREFIX besluit: <http://data.vlaanderen.be/ns/besluit#>
    PREFIX prov: <http://www.w3.org/ns/prov#>
    PREFIX dct: <http://purl.org/dc/terms/>
    
    SELECT ?meeting WHERE {
      ?meeting besluit:geplandeStart ?geplandeStart .
      ?meeting prov:startedAtTime ?startedAtTime .
      ?meeting prov:endedAtTime ?endedAtTime .
      ?meeting prov:atLocation ?atLocation . 
      OPTIONAL { ?meeting besluit:heeftAanwezigeBijStart ?heeftAanwezigeBijStart . }
      OPTIONAL { ?meeting besluit:heeftVoorzitter ?heeftVoorzitter . }
      OPTIONAL { ?meeting besluit:heeftSecretaris ?heeftSecretaris . }
      OPTIONAL { ?meeting besluit:behandelt ?behandelt . }    
      OPTIONAL { ?meeting besluit:behandelt ?agendapoint. }
      OPTIONAL { ?behandeling dct:subject ?agendapoint . }
      OPTIONAL { ?behandeling besluit:heeftStemming ?voting. }
      OPTIONAL { ?voting besluit:aantalOnthouders ?FaantalOnthouders . }
      ?meeting mu:uuid ${sparqlEscapeString(uuid)}
    }
  `

export const queryParticipants = (uuid) => `
      PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
      PREFIX besluit: <http://data.vlaanderen.be/ns/besluit#>
      PREFIX prov: <http://www.w3.org/ns/prov#>
      
      SELECT ?heeftAanwezigeBijStart WHERE {
        ?meeting besluit:heeftAanwezigeBijStart ?heeftAanwezigeBijStart .
        ?meeting mu:uuid ${sparqlEscapeString(uuid)}
      }
  `

export const queryMissingParticipants = (uuid) => `
      PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
      PREFIX besluit: <http://data.vlaanderen.be/ns/besluit#>
      PREFIX prov: <http://www.w3.org/ns/prov#>
      PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
      
      SELECT * WHERE {
        ?meeting ext:heeftAfwezigeBijStart ?heeftAfwezigeBijStart .
        ?meeting mu:uuid ${sparqlEscapeString(uuid)}
      }
  `

export const queryTreatment = (uuid) => `
      PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
      PREFIX besluit: <http://data.vlaanderen.be/ns/besluit#>
      PREFIX dct: <http://purl.org/dc/terms/>
      
      SELECT * WHERE {
        ?meeting besluit:behandelt ?agendapoint.
        ?behandeling dct:subject ?agendapoint.
        ?meeting mu:uuid ${sparqlEscapeString(uuid)}
      }
  `