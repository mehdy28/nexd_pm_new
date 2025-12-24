import { readFileSync } from "fs";
import path from "path";
import { gql } from "graphql-tag";
// Correct path to your schema.graphql
const schemaPath = path.join(process.cwd(), "graphql", "schema", "schema.graphql");
// Load the SDL as a string
const typeDefs = gql(readFileSync(schemaPath, { encoding: "utf-8" }));
export { typeDefs };
