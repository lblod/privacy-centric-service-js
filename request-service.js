import { getSparqlTemplate, getJsonApiTemplate } from "./template-util";
import { querySudo as query, updateSudo as update } from "@lblod/mu-auth-sudo";
import { v4 as uuid } from "uuid";

const DEFAULT_GRAPH_URI =
  process.env.DEFAULT_GRAPH ||
  "http://mu.semte.ch/graphs/privacy-centric-graph";
const APP_GRAPH_URI =
  process.env.APP_GRAPH || "http://mu.semte.ch/graphs/organisatieportaal";
const SESSION_GRAPH_URI =
  process.env.SESSION_GRAPH || "http://mu.semte.ch/graphs/sessions";

function checkNotEmpty(argument, message = "This cannont be empty!") {
  if (!argument?.length) {
    throw Error(message);
  }
}
export class RequestService {
  async processUpdate(request, sessionId) {
    let { data } = request;
    let { person, reason, gender, nationalities } = data.relationships;

    let dateOfBirth = data.attributes["date-of-birth"];
    let registrationNumber = data.attributes.registration;

    let reasonId = reason.data?.id;
    let personId = person.data?.id;
    checkNotEmpty(personId, "Person id must be set!");
    checkNotEmpty(reasonId, "Reason must be set!");

    let accountUri = await this.getAccountBySession(sessionId);
    checkNotEmpty(accountUri, "Account must be set!");
    let parameters = {};
    if (nationalities?.data?.length) {
      const nationaliteits = [];
      for (const nationality of nationalities.data) {
        let q = getSparqlTemplate("get-nationality-by-id", {
          nationalityId: nationality.id,
        });
        let queryResult = await query(q);
        if (queryResult.results.bindings.length) {
          let result = queryResult.results.bindings[0];
          let nat = result.nationality?.value;
         
          if (nat?.length) {
            nationaliteits.push(nat);
          }
        }
      }
      
      parameters.nationaliteits = nationaliteits;
    }

    if (gender?.data?.id) {
      let q = getSparqlTemplate("get-gender-by-id", {
        genderId: gender.data.id,
      });
      let queryResult = await query(q);

      if (queryResult.results.bindings.length) {
        let result = queryResult.results.bindings[0];
        let genderUri = result.genderUri?.value;
        if (genderUri?.length) {
          parameters.gender = genderUri;
        }
      }
      if (registrationNumber?.length) {
        if (!(await this.validateRn(personId, registrationNumber))) {
          throw Error(
            `Registration number '${registrationNumber}' doesn't belong to person with id '${personId}'`
          );
        }
        parameters.registration = registrationNumber;
      }
      if (dateOfBirth?.length) {
        parameters.dateOfBirth = dateOfBirth;
      }

      let deleteDataPersonQuery = getSparqlTemplate("delete-data-person", {
        personId,
        graph: DEFAULT_GRAPH_URI,
      });
      await update(deleteDataPersonQuery);

      if (Object.keys(parameters).length !== 0) {
        let reasonUri = await this.getReasonUri(reasonId);
        parameters.personId = personId;
        parameters.graph = DEFAULT_GRAPH_URI;
        parameters.time = new Date().toISOString();
        parameters.accountUri = accountUri;
        parameters.code = reasonUri;
        let insertDataPerson = getSparqlTemplate(
          "insert-data-person",
          parameters
        );
        await update(insertDataPerson);
      }
    }
  }

  async processCheckPersonInfo(personId, sessionId) {
    checkNotEmpty(personId, "Person id must be set!");
    let accountUri = await this.getAccountBySession(sessionId);
    checkNotEmpty(accountUri, "Account must be set!");
    let responseBuilder = await this.buildPersonInfo(personId);
    if (responseBuilder.dateOfBirth?.length) {
      responseBuilder.dateOfBirth = "**********";
    }
    if (responseBuilder.registrationNumber?.length) {
      responseBuilder.registrationNumber = "***********";
    }
    if (responseBuilder.genderId?.length) {
      responseBuilder.genderId = "***********";
    }
    if (responseBuilder.nationalities?.length) {
      responseBuilder.nationalities = responseBuilder.nationalities.map(
        (n) => "**********"
      );
    }
    responseBuilder.type = "person-information-asks";
    return getJsonApiTemplate("person-information", responseBuilder);
  }

  async processRead(request, sessionId) {
    let { data } = request;
    let { person, reason } = data.relationships;
    let reasonId = reason.data?.id;
    let personId = person.data?.id;
    checkNotEmpty(personId, "Person id must be set!");
    checkNotEmpty(reasonId, "Reason must be set!");

    let accountUri = await this.getAccountBySession(sessionId);
    checkNotEmpty(accountUri, "Account must be set!");

    let responseBuilder = await this.buildPersonInfo(personId);

    responseBuilder.reasonId = reasonId;
    responseBuilder.type = "person-information-requests";

    let reasonUri = await this.getReasonUri(reasonId);
    let requestReadReasonQuery = getSparqlTemplate("request-read-reason", {
      graph: DEFAULT_GRAPH_URI,
      appGraph: APP_GRAPH_URI,
      personId,
      code: reasonUri,
      time: new Date().toISOString(),
      accountUri,
    });
    await update(requestReadReasonQuery);
    return getJsonApiTemplate("person-information", responseBuilder);
  }

  async getReasonUri(reasonId) {
    var getReasonCodeUriQuery = getSparqlTemplate("get-reason-by-id", {
      reasonId,
    });
    let queryResult = await query(getReasonCodeUriQuery);

    if (queryResult.results.bindings.length) {
      let res = queryResult.results.bindings[0];
      let reasonUri = res.reasonUri?.value;
      checkNotEmpty(reasonUri, "Code list not found");
      return reasonUri;
    } else {
      throw Error("Code list not found");
    }
  }

  async buildPersonInfo(personId) {
    checkNotEmpty(personId, "Person id must be set!");
    let responseBuilder = {};
    let queryParameters = {
      graph: DEFAULT_GRAPH_URI,
      appGraph: APP_GRAPH_URI,
      personId,
    };
    let getPersonInfoQuery = getSparqlTemplate(
      "get-person-info",
      queryParameters
    );

    let queryResult = await query(getPersonInfoQuery);

    if (queryResult.results.bindings.length) {
      const result = queryResult.results.bindings[0];
      responseBuilder.dateOfBirth = result.dateOfBirth?.value;
      responseBuilder.registrationNumber = result.registrationNumber?.value;
      responseBuilder.genderId = result.genderId?.value;
    }
    let getPersonNationalitiesQuery = getSparqlTemplate(
      "get-person-nationalities",
      queryParameters
    );
    let queryResultNationalities = await query(getPersonNationalitiesQuery);
   
    responseBuilder.nationalities = queryResultNationalities.results.bindings
      .map((n) => n.nationaliteitId?.value)
      .filter((n) => n?.length > 0);
    
    return responseBuilder;
  }

  async getReasonUri(reasonId) {
    checkNotEmpty(reasonId, "reasonId cannot be null!");

    let getReasonCodeUriQuery = getSparqlTemplate("get-reason-by-id", {
      reasonId,
    });
    let queryResult = await query(getReasonCodeUriQuery);
    if (queryResult.results.bindings.length) {
      const result = queryResult.results.bindings[0];
      let reasonUri = result.reasonUri?.value;
      checkNotEmpty(reasonUri, "code list not found");
      return reasonUri;
    } else {
      throw Error("code list not found");
    }
  }

  async getAccountBySession(sessionId) {
    checkNotEmpty(sessionId, "No session id!");
    let getAccountQuery = getSparqlTemplate("get-account", {
      sessionId,
      sessionGraphUri: SESSION_GRAPH_URI,
    });
    const queryResult = await query(getAccountQuery);
    if (queryResult.results.bindings.length) {
      const result = queryResult.results.bindings[0];
      return result.account?.value;
    } else {
      return null;
    }
  }

  async validateSsn(personId, ssn, sessionId) {
    checkNotEmpty(personId, "Person id must be set!");
    checkNotEmpty(ssn, "SSN must be set!");

    let accountUri = await this.getAccountBySession(sessionId);
    checkNotEmpty(accountUri, "Account must be set!");
    let isValid = await this.validateRn(personId, ssn);

    return `
      {
        "data": {
          "type": "validate-ssn",
          "id": "${uuid()}",
          "attributes": {
            "is-valid": ${isValid}
          }
        }
      }
   `;
  }

  async validateRn(personId, ssn) {
    let askSsnQuery = getSparqlTemplate("ask-ssn", {
      personId,
      ssn,
      graph: DEFAULT_GRAPH_URI,
    });
    const queryResult = await query(askSsnQuery);

    return !queryResult?.boolean;
  }
}
