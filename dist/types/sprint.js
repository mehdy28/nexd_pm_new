// types/sprint.ts
/**
 * Represents the status of a sprint.
 * Mirrors the GraphQL enum SprintStatus and Prisma enum SprintStatus.
 */
export var SprintStatus;
(function (SprintStatus) {
    SprintStatus["PLANNING"] = "PLANNING";
    SprintStatus["ACTIVE"] = "ACTIVE";
    SprintStatus["COMPLETED"] = "COMPLETED";
})(SprintStatus || (SprintStatus = {}));
