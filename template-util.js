import Handlebars from "handlebars";
import fs from "fs";

import { v4 as uuid } from "uuid";

Handlebars.registerHelper("uuid", function (varName, options) {
  if (!options.data.root) {
    options.data.root = {};
  }
  options.data.root[varName] = uuid();
});

const SPARQL_QUERY_STORE = new Map();
const JSON_API_RESULT_STORE = new Map();

fs.readdirSync("/templates/sparql")
  .map((f) => f.toString())
  .filter((f) => f.endsWith(".sparql"))
  .forEach((p) => {
    let template = Handlebars.compile(
      fs.readFileSync(`/templates/sparql/${p}`).toString()
    );
    SPARQL_QUERY_STORE.set(p.replace(".sparql", ""), template);
  });

fs.readdirSync("/templates/jsonapi")
  .map((f) => f.toString())
  .filter((f) => f.endsWith(".hbs"))
  .forEach((p) => {
    let template = Handlebars.compile(
      fs.readFileSync(`/templates/jsonapi/${p}`).toString()
    );
    JSON_API_RESULT_STORE.set(p.replace(".hbs", ""), template);
  });

export function getSparqlTemplate(name, params) {
  const query = SPARQL_QUERY_STORE.get(name);
  return query(params);
}
export function getJsonApiTemplate(name, params) {
  const tpl = JSON_API_RESULT_STORE.get(name);
  return tpl(params);
}
