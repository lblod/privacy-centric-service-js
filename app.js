import { app } from "mu";

import bodyParser from "body-parser";
import { RequestService } from "./request-service";

const HEADER_MU_SESSION_ID = "mu-session-id";

const requestService = new RequestService();

app.use(
  bodyParser.json({
    type: function (req) {
      return /^application\/json/.test(req.get("content-type"));
    },
  })
);

app.post("/person-information-updates", async function (req, res, next) {
  try {
    const sessionId = req.get(HEADER_MU_SESSION_ID);
    const payload = req.body;
    await requestService.processUpdate(payload, sessionId);
    return res.status(200).send().end();
  } catch (e) {
    return next(e);
  }
});
app.post("/person-information-requests", async function (req, res, next) {
  try {
    const sessionId = req.get(HEADER_MU_SESSION_ID);
    const payload = req.body;
    let response = await requestService.processRead(payload, sessionId);
    return res.status(200).send(response);
  } catch (e) {
    return next(e);
  }
});
app.post("/person-information-ask/:personId", async function (req, res, next) {
  try {
    const sessionId = req.get(HEADER_MU_SESSION_ID);
    const personId = req.params.personId;
    let response = await requestService.processCheckPersonInfo(
      personId,
      sessionId
    );
    return res.status(200).send(response);
  } catch (e) {
    return next(e);
  }
});
app.post(
  "/person-information-validate-ssn/:personId",
  async function (req, res, next) {
    try {
      const sessionId = req.get(HEADER_MU_SESSION_ID);
      const personId = req.params.personId;
      const ssn = req.query.ssn;
      let response = await requestService.validateSsn(personId, ssn, sessionId);
      return res.status(200).send(response);
    } catch (e) {
      return next(e);
    }
  }
);

function error(res, message, status = 400) {
  return res.status(status).json({ errors: [{ title: message }] });
}

app.use(error);
