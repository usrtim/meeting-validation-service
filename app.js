import { app, errorHandler } from "mu";
import { querySudo as query } from "@lblod/mu-auth-sudo";
import {
  queryAllMeetings,
  queryParticipants, queryMissingParticipants, queryTreatment
} from "./helpers/queries.js";
import {
  checkIfParticipantsAttendingMeeting,
  doShaclValidation,
  validateTreatment,
  validateTreatmentPresident
} from "./helpers/functions.js";

app.get('/validateMeeting', async function( req, res ) {
  const uuid = req.query?.uuid

  const fetchMeetings = await query(queryAllMeetings(uuid));
  const meetings = fetchMeetings.results.bindings.map(item => item.meeting.value)


  if(meetings.length === 0) {
    res.send(JSON.stringify({
      meeting: "No meeting found or meeting is invalid. Meeting should have, start data, end date, participants and president in order to be a valid!",
      success: false
    }))

    return;
  }

  const fetchParticipants = await query(queryParticipants(uuid));
  const fetchMissingParticipants = await query(queryMissingParticipants(uuid));
  // const voting = await query(queryVoting);
  const fetchTreatments = await query(queryTreatment(uuid))
  const participants = fetchParticipants.results.bindings.map(item => item.heeftAanwezigeBijStart.value)
  const missingParticipants = fetchMissingParticipants.results.bindings.map(item => item.heeftAfwezigeBijStart.value)
  const treatments = fetchTreatments.results.bindings.map(item => item.behandeling.value)
  // const votingArr = voting.results.bindings.map(item => item.behandeling.value)
  const areParticipantsValid = checkIfParticipantsAttendingMeeting(missingParticipants, participants)
  const shaclMessages = await doShaclValidation(uuid);

  let isTreatmentValid = true
  let hasTreatmentPresident = true
  for(let item of treatments) {
    const treatmentResults = await validateTreatment(item)
    const treatmentPresident = await validateTreatmentPresident(item)
    // console.log('ttreatmentPresident', treatmentPresident)
    if(treatmentResults.length === 0) {
      isTreatmentValid = false
    }
    if(treatmentPresident.length === 0) {
      hasTreatmentPresident = false
    }
  }

  const errorMessages = {};

  if(meetings.length === 0) {
    errorMessages.meeting = "No meeting found or meeting is invalid. Meeting should have, start data, end date, participants and president in order to be a valid!";
    errorMessages.success = false
  } else {
    errorMessages.success = true

    if (!isTreatmentValid) {
      errorMessages.treatment = "Behandeling is invalid";
      errorMessages.success = false
    }
    if (!hasTreatmentPresident) {
      errorMessages.treatmentPresidentMissing = "Behandeling shoud have a president";
      errorMessages.success = false
    }
    if (!areParticipantsValid) {
      errorMessages.participants = "Participants are not valid";
      errorMessages.success = false
    }
    if(shaclMessages.length !== 0) {
      errorMessages.shacl = shaclMessages
      errorMessages.success = false
    }
  }

  res.send( JSON.stringify(errorMessages) );
})


app.use(errorHandler);
