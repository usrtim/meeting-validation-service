import { app, errorHandler } from "mu";
import { querySudo as query } from "@lblod/mu-auth-sudo";
import {
  queryMeeting,
  queryParticipants, queryMissingParticipants, queryTreatment
} from "./helpers/queries.js";
import {
  overlapBetweenAbsentAndPresentPeople,
  doShaclValidation,
  generateErrorMessages, validateAndgenerateErrorMessages,
} from "./helpers/functions.js";
import {messages} from "./helpers/errorMessages.js";

app.get('/validateMeeting', async function( req, res ) {
  const uuid = req.query?.uuid

  if(!uuid) {
    res.status(400).send(JSON.stringify({
      message: messages.uuidMissing,
      success: false
    }))

    return;
  }

  const fetchMeeting = await query(queryMeeting(uuid));
  const meeting = fetchMeeting.results.bindings

  if(meeting.length === 0) {
    res.status(404).send(JSON.stringify({
      message: "No meeting found!",
      success: false
    }))

    return;
  }

  const fetchParticipants = await query(queryParticipants(uuid));
  const fetchMissingParticipants = await query(queryMissingParticipants(uuid));
  const fetchTreatments = await query(queryTreatment(uuid))
  const participants = fetchParticipants.results.bindings.map(item => item.heeftAanwezigeBijStart.value)
  const missingParticipants = fetchMissingParticipants.results.bindings.map(item => item.heeftAfwezigeBijStart.value)
  const treatments = fetchTreatments.results.bindings.map(item => item.behandeling.value)
  const areParticipantsValid = overlapBetweenAbsentAndPresentPeople(missingParticipants, participants)
  const shaclMessages = await doShaclValidation(uuid);

  const responseMessage = await validateAndgenerateErrorMessages(meeting, treatments, areParticipantsValid, shaclMessages)

  res.status(responseMessage.status).send( JSON.stringify(responseMessage) );
})


app.use(errorHandler);
