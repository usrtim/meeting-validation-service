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
  const shaclMessages = await doShaclValidation(uuid);

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
    errorMessages["meeting"] = "No meeting found or meeting is invalid";
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


app.use(errorHandler);
