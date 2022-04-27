import {
  sparqlEscapeUri,
  uuid,
  sparqlEscapeDate,
  sparqlEscapeString,
} from "mu";
const PREFIXES = `
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
PREFIX persoon: <https://data.vlaanderen.be/ns/persoon#>
PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
PREFIX person: <http://www.w3.org/ns/person#>
PREFIX session: <http://mu.semte.ch/vocabularies/session/>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>
PREFIX besluit: <http://data.vlaanderen.be/ns/besluit#>
`;

export function askSsn(graph, ssn, personId) {
  return `
    ${PREFIXES}
    ASK WHERE {
        GRAPH ${sparqlEscapeUri(graph)} {
          ?gsIdentificator <https://data.vlaanderen.be/ns/generiek#lokaleIdentificator> ?lokaleIdentificator.
          ?registrationId <https://data.vlaanderen.be/ns/generiek#gestructureerdeIdentificator> ?gsIdentificator.
          ?person persoon:registratie ?registrationId.
        }
        graph ?g {
           ?person a ?type;
                   mu:uuid ?id.
        }
         FILTER(?lokaleIdentificator = ${sparqlEscapeString(
           ssn
         )} && ?type = person:Person && ?id != ${sparqlEscapeString(
    personId
  )}) .
      
      }
    `;
}

export function deleteDataPerson(graph, personId) {
  return `
    ${PREFIXES}
      
    DELETE {
      GRAPH ${sparqlEscapeUri(graph)} {
          ${sparqlEscapeUri(
            `http://data.lblod.info/id/personen/${personId}`
          )} persoon:heeftGeboorte ?heeftGeboorte.
          ?heeftGeboorte ?p ?o.

          ${sparqlEscapeUri(
            `http://data.lblod.info/id/personen/${personId}`
          )}  persoon:registratie ?registration.
          ?registration <https://data.vlaanderen.be/ns/generiek#gestructureerdeIdentificator> ?identificator.
          ?identificator ?x ?y.
          ?registration ?t ?j.

          ${sparqlEscapeUri(
            `http://data.lblod.info/id/personen/${personId}`
          )}  persoon:geslacht ?geslacht.

          ${sparqlEscapeUri(
            `http://data.lblod.info/id/personen/${personId}`
          )}  persoon:heeftNationaliteit ?nationaliteit.
      }
    }
    WHERE  {
      GRAPH ${sparqlEscapeUri(graph)} {
          optional {
            ${sparqlEscapeUri(
              `http://data.lblod.info/id/personen/${personId}`
            )} persoon:heeftGeboorte  ?heeftGeboorte.
            ?heeftGeboorte ?p ?o.
          }

          optional {
            ${sparqlEscapeUri(
              `http://data.lblod.info/id/personen/${personId}`
            )}  persoon:registratie ?registration.
            ?registration <https://data.vlaanderen.be/ns/generiek#gestructureerdeIdentificator> ?identificator.
            ?identificator ?x ?y.
            ?registration ?t ?j.
          }

            optional {
              ${sparqlEscapeUri(
                `http://data.lblod.info/id/personen/${personId}`
              )}  persoon:geslacht ?geslacht.
            }

            optional {
              ${sparqlEscapeUri(
                `http://data.lblod.info/id/personen/${personId}`
              )}  persoon:heeftNationaliteit ?nationaliteit.
            }
      }

    }
  
  `;
}

export function getAccount(sessionGraphUri, sessionId) {
  return `
    ${PREFIXES}
    SELECT ?account
    WHERE {
      GRAPH ${sparqlEscapeUri(sessionGraphUri)} {
          ${sparqlEscapeUri(sessionId)} session:account ?account.
      }
    }

  `;
}

export function getGenderById(genderId) {
  return `
    ${PREFIXES}
    select ?genderUri where {
      ?genderUri mu:uuid ${sparqlEscapeString(genderId)}.
    }
  `;
}
export function getNationalityById(nationalityId) {
  return `
    ${PREFIXES}
    select ?nationality where {
      ?nationality mu:uuid ${sparqlEscapeString(nationalityId)}.
    }
    
  `;
}
export function getPersonInfo(graph, appGraph, personId) {
  return `
    ${PREFIXES}
    select ?dateOfBirth ?registrationNumber ?genderId where {
      graph ${sparqlEscapeUri(graph)} {
        optional {
           ${sparqlEscapeUri(
             `http://data.lblod.info/id/personen/${personId}`
           )} persoon:geslacht ?geslacht.
          graph ${sparqlEscapeUri(appGraph)} {
             ?geslacht mu:uuid ?genderId.
          }
        }
        optional {
           ${sparqlEscapeUri(
             `http://data.lblod.info/id/personen/${personId}`
           )} persoon:heeftGeboorte ?heeftGeboorte.
          ?heeftGeboorte persoon:datum ?dateOfBirth.
        }
        optional {
           ${sparqlEscapeUri(
             `http://data.lblod.info/id/personen/${personId}`
           )}  persoon:registratie ?registratie.
          ?registratie <https://data.vlaanderen.be/ns/generiek#gestructureerdeIdentificator> ?identificator.
          ?identificator<https://data.vlaanderen.be/ns/generiek#lokaleIdentificator> ?registrationNumber.
        }
      }
      
      }
    
  `;
}
export function getPersonNationalities(graph, appGraph, personId) {
  return `
    ${PREFIXES}
    select ?nationaliteitId where {
      graph ${sparqlEscapeUri(graph)}{
          ${sparqlEscapeUri(
            `http://data.lblod.info/id/personen/${personId}`
          )} persoon:heeftNationaliteit ?nationaliteit.
        }
        graph ${sparqlEscapeUri(appGraph)}  {
             ?nationaliteit mu:uuid ?nationaliteitId.
        }
      }
    
  `;
}
export function getReasonById(reasonId) {
  return `
    ${PREFIXES}
    select ?reasonUri where {
      ?reasonUri mu:uuid ${sparqlEscapeString(reasonId)}.
    }
    
  `;
}
export function requestReadReason(graph, accountUri, personId, reasonCodeUri) {
  let now = new Date().toISOString();
  let reasonId = uuid();
  return `
    ${PREFIXES}
    INSERT DATA {
      graph ${sparqlEscapeUri(graph)} {
            <http://data.lblod.info/id/person-information-reads/${reasonId}>  a ext:PersonInformationRead;
                                                            mu:uuid "${reasonId}";
                                                            ext:date "${now}"^^xsd:dateTime;
                                                            ext:requester  ${sparqlEscapeUri(
                                                              accountUri
                                                            )};
                                                            ext:person ${sparqlEscapeUri(
                                                              `http://data.lblod.info/id/personen/${personId}`
                                                            )} ;
                                                            ext:code  ${sparqlEscapeUri(
                                                              reasonCodeUri
                                                            )}.
    }
  }
    
  `;
}
export function insertDataPerson(
  graph,
  accountUri,
  personId,
  reasonCodeUri,
  dateOfBirth,
  registration,
  gender,
  nationalities
) {
  let now = new Date().toISOString();
  let reasonId = uuid();

  let query = "";

  if (dateOfBirth) {
    let dateOfBirthId = uuid();

    query = `
    ${query}
    <http://data.lblod.info/id/geboortes/${dateOfBirthId}>  a persoon:Geboorte;
                            mu:uuid "${dateOfBirthId}";
                            persoon:datum ${sparqlEscapeDate(dateOfBirth)}.

    ${sparqlEscapeUri(
      `http://data.lblod.info/id/personen/${personId}`
    )}  persoon:heeftGeboorte <http://data.lblod.info/id/geboortes/${dateOfBirthId}>.

    <http://data.lblod.info/id/person-information-updates/${reasonId}>  persoon:heeftGeboorte <http://data.lblod.info/id/geboortes/${dateOfBirthId}>.

  `;
  }

  if (registration) {
    let registrationId = uuid();
    let gestId = uuid();

    query = `
      ${query}
      <http://data.lblod.info/id/gestructureerdeIdentificatoren/${gestId}> a <https://data.vlaanderen.be/ns/generiek#GestructureerdeIdentificator>;
      mu:uuid "${gestId}";
      <https://data.vlaanderen.be/ns/generiek#lokaleIdentificator> ${sparqlEscapeString(
        registration
      )}.

      <http://data.lblod.info/id/identificatoren/${registrationId}> a <http://www.w3.org/ns/adms#Identifier>;
                  mu:uuid "${registrationId}";
                  <http://www.w3.org/2004/02/skos/core#notation> "Rijksregisternummer";
                  <https://data.vlaanderen.be/ns/generiek#gestructureerdeIdentificator> <http://data.lblod.info/id/gestructureerdeIdentificatoren/${gestId}>.

      ${sparqlEscapeUri(
        `http://data.lblod.info/id/personen/${personId}`
      )}  persoon:registratie <http://data.lblod.info/id/identificatoren/${registrationId}>.

      <http://data.lblod.info/id/person-information-updates/${reasonId}>  persoon:registratie <http://data.lblod.info/id/identificatoren/${registrationId}>.

    `;
  }

  if (gender) {
    query = `
      ${query}
      ${sparqlEscapeUri(
        `http://data.lblod.info/id/personen/${personId}`
      )}  persoon:geslacht ${sparqlEscapeUri(gender)}.
      <http://data.lblod.info/id/person-information-updates/${reasonId}>  persoon:geslacht ${sparqlEscapeUri(
      gender
    )}.
    
    `;
  }

  if (nationalities?.length) {
    let nationalitiesSubQuery = nationalities
      .map((nationality) => {
        return `
      ${sparqlEscapeUri(
        `http://data.lblod.info/id/personen/${personId}`
      )}  persoon:heeftNationaliteit  ${sparqlEscapeUri(nationality)}.
      <http://data.lblod.info/id/person-information-updates/${reasonId}>  persoon:heeftNationaliteit  ${sparqlEscapeUri(
          nationality
        )}.


      `;
      })
      .join("");

    query = `
      ${query}

      ${nationalitiesSubQuery}
    
    `;
  }

  return `
  ${PREFIXES}
  INSERT DATA {
    GRAPH ${sparqlEscapeUri(graph)} {
      <http://data.lblod.info/id/person-information-updates/${reasonId}>  a ext:PersonInformationUpdate;
      mu:uuid "${reasonId}";
      ext:date "${now}"^^xsd:dateTime;
      ext:requester  ${sparqlEscapeUri(accountUri)};
      ext:person ${sparqlEscapeUri(
        `http://data.lblod.info/id/personen/${personId}`
      )};
      ext:code   ${sparqlEscapeUri(reasonCodeUri)}.
        ${query}

    }
    }
  `;
}
