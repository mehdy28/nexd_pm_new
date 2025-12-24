// @/graphql/types.ts
/* tslint:disable */
/* eslint-disable */
// @generated
// This file was automatically generated and should not be edited.
//==============================================================
// START Enums and Input Objects
//==============================================================
export var ActivityType;
(function (ActivityType) {
    ActivityType["ATTACHMENT_ADDED"] = "ATTACHMENT_ADDED";
    ActivityType["ATTACHMENT_REMOVED"] = "ATTACHMENT_REMOVED";
    ActivityType["COMMENT_ADDED"] = "COMMENT_ADDED";
    ActivityType["COMMENT_DELETED"] = "COMMENT_DELETED";
    ActivityType["COMMENT_UPDATED"] = "COMMENT_UPDATED";
    ActivityType["DESCRIPTION_UPDATED"] = "DESCRIPTION_UPDATED";
    ActivityType["DOCUMENT_CREATED"] = "DOCUMENT_CREATED";
    ActivityType["DOCUMENT_DELETED"] = "DOCUMENT_DELETED";
    ActivityType["DOCUMENT_UPDATED"] = "DOCUMENT_UPDATED";
    ActivityType["DUE_DATE_UPDATED"] = "DUE_DATE_UPDATED";
    ActivityType["MEMBER_ADDED"] = "MEMBER_ADDED";
    ActivityType["MEMBER_REMOVED"] = "MEMBER_REMOVED";
    ActivityType["MEMBER_UPDATED"] = "MEMBER_UPDATED";
    ActivityType["POINTS_UPDATED"] = "POINTS_UPDATED";
    ActivityType["PRIORITY_UPDATED"] = "PRIORITY_UPDATED";
    ActivityType["PROJECT_CREATED"] = "PROJECT_CREATED";
    ActivityType["PROJECT_DELETED"] = "PROJECT_DELETED";
    ActivityType["PROJECT_UPDATED"] = "PROJECT_UPDATED";
    ActivityType["PROMPT_CREATED"] = "PROMPT_CREATED";
    ActivityType["PROMPT_DELETED"] = "PROMPT_DELETED";
    ActivityType["PROMPT_UPDATED"] = "PROMPT_UPDATED";
    ActivityType["STATUS_UPDATED"] = "STATUS_UPDATED";
    ActivityType["TASK_ASSIGNED"] = "TASK_ASSIGNED";
    ActivityType["TASK_COMPLETED"] = "TASK_COMPLETED";
    ActivityType["TASK_CREATED"] = "TASK_CREATED";
    ActivityType["TASK_DELETED"] = "TASK_DELETED";
    ActivityType["TASK_UPDATED"] = "TASK_UPDATED";
    ActivityType["WHITEBOARD_CREATED"] = "WHITEBOARD_CREATED";
    ActivityType["WHITEBOARD_DELETED"] = "WHITEBOARD_DELETED";
    ActivityType["WHITEBOARD_UPDATED"] = "WHITEBOARD_UPDATED";
})(ActivityType || (ActivityType = {}));
export var AggregationType;
(function (AggregationType) {
    AggregationType["AVERAGE"] = "AVERAGE";
    AggregationType["COUNT"] = "COUNT";
    AggregationType["FIRST_CREATED_FIELD_VALUE"] = "FIRST_CREATED_FIELD_VALUE";
    AggregationType["LAST_UPDATED_FIELD_VALUE"] = "LAST_UPDATED_FIELD_VALUE";
    AggregationType["LIST_FIELD_VALUES"] = "LIST_FIELD_VALUES";
    AggregationType["MOST_COMMON_FIELD_VALUE"] = "MOST_COMMON_FIELD_VALUE";
    AggregationType["SUM"] = "SUM";
})(AggregationType || (AggregationType = {}));
export var AuditLogAction;
(function (AuditLogAction) {
    AuditLogAction["MEMBER_INVITED"] = "MEMBER_INVITED";
    AuditLogAction["MEMBER_REMOVED"] = "MEMBER_REMOVED";
    AuditLogAction["MEMBER_ROLE_CHANGED"] = "MEMBER_ROLE_CHANGED";
    AuditLogAction["PROJECT_CREATED"] = "PROJECT_CREATED";
    AuditLogAction["PROJECT_DELETED"] = "PROJECT_DELETED";
    AuditLogAction["SUBSCRIPTION_CHANGED"] = "SUBSCRIPTION_CHANGED";
    AuditLogAction["WORKSPACE_SETTINGS_UPDATED"] = "WORKSPACE_SETTINGS_UPDATED";
})(AuditLogAction || (AuditLogAction = {}));
export var ConversationType;
(function (ConversationType) {
    ConversationType["DIRECT"] = "DIRECT";
    ConversationType["GROUP"] = "GROUP";
})(ConversationType || (ConversationType = {}));
export var DependencyType;
(function (DependencyType) {
    DependencyType["FINISH_TO_FINISH"] = "FINISH_TO_FINISH";
    DependencyType["FINISH_TO_START"] = "FINISH_TO_START";
    DependencyType["START_TO_FINISH"] = "START_TO_FINISH";
    DependencyType["START_TO_START"] = "START_TO_START";
})(DependencyType || (DependencyType = {}));
export var FilterOperator;
(function (FilterOperator) {
    FilterOperator["CONTAINS"] = "CONTAINS";
    FilterOperator["ENDS_WITH"] = "ENDS_WITH";
    FilterOperator["EQ"] = "EQ";
    FilterOperator["GT"] = "GT";
    FilterOperator["GTE"] = "GTE";
    FilterOperator["IN_LIST"] = "IN_LIST";
    FilterOperator["LT"] = "LT";
    FilterOperator["LTE"] = "LTE";
    FilterOperator["NEQ"] = "NEQ";
    FilterOperator["NOT_IN"] = "NOT_IN";
    FilterOperator["STARTS_WITH"] = "STARTS_WITH";
})(FilterOperator || (FilterOperator = {}));
export var FormatType;
(function (FormatType) {
    FormatType["BULLET_POINTS"] = "BULLET_POINTS";
    FormatType["COMMA_SEPARATED"] = "COMMA_SEPARATED";
    FormatType["JSON_ARRAY"] = "JSON_ARRAY";
    FormatType["PLAIN_TEXT"] = "PLAIN_TEXT";
})(FormatType || (FormatType = {}));
export var InvitationStatus;
(function (InvitationStatus) {
    InvitationStatus["ACCEPTED"] = "ACCEPTED";
    InvitationStatus["DECLINED"] = "DECLINED";
    InvitationStatus["EXPIRED"] = "EXPIRED";
    InvitationStatus["PENDING"] = "PENDING";
})(InvitationStatus || (InvitationStatus = {}));
export var Plan;
(function (Plan) {
    Plan["ENTERPRISE"] = "ENTERPRISE";
    Plan["FREE"] = "FREE";
    Plan["PRO"] = "PRO";
})(Plan || (Plan = {}));
export var Priority;
(function (Priority) {
    Priority["HIGH"] = "HIGH";
    Priority["LOW"] = "LOW";
    Priority["MEDIUM"] = "MEDIUM";
})(Priority || (Priority = {}));
export var ProjectRole;
(function (ProjectRole) {
    ProjectRole["ADMIN"] = "ADMIN";
    ProjectRole["MEMBER"] = "MEMBER";
    ProjectRole["OWNER"] = "OWNER";
    ProjectRole["VIEWER"] = "VIEWER";
})(ProjectRole || (ProjectRole = {}));
export var ProjectStatus;
(function (ProjectStatus) {
    ProjectStatus["ACTIVE"] = "ACTIVE";
    ProjectStatus["ARCHIVED"] = "ARCHIVED";
    ProjectStatus["CANCELLED"] = "CANCELLED";
    ProjectStatus["COMPLETED"] = "COMPLETED";
    ProjectStatus["ON_HOLD"] = "ON_HOLD";
    ProjectStatus["PLANNING"] = "PLANNING";
})(ProjectStatus || (ProjectStatus = {}));
export var PromptVariableType;
(function (PromptVariableType) {
    PromptVariableType["BOOLEAN"] = "BOOLEAN";
    PromptVariableType["DATE"] = "DATE";
    PromptVariableType["DYNAMIC"] = "DYNAMIC";
    PromptVariableType["LIST_OF_STRINGS"] = "LIST_OF_STRINGS";
    PromptVariableType["NUMBER"] = "NUMBER";
    PromptVariableType["RICH_TEXT"] = "RICH_TEXT";
    PromptVariableType["SELECT"] = "SELECT";
    PromptVariableType["STRING"] = "STRING";
})(PromptVariableType || (PromptVariableType = {}));
export var SprintStatus;
(function (SprintStatus) {
    SprintStatus["ACTIVE"] = "ACTIVE";
    SprintStatus["COMPLETED"] = "COMPLETED";
    SprintStatus["PLANNING"] = "PLANNING";
})(SprintStatus || (SprintStatus = {}));
export var SubscriptionStatus;
(function (SubscriptionStatus) {
    SubscriptionStatus["ACTIVE"] = "ACTIVE";
    SubscriptionStatus["CANCELLED"] = "CANCELLED";
    SubscriptionStatus["PAST_DUE"] = "PAST_DUE";
    SubscriptionStatus["UNPAID"] = "UNPAID";
})(SubscriptionStatus || (SubscriptionStatus = {}));
export var TaskStatus;
(function (TaskStatus) {
    TaskStatus["DONE"] = "DONE";
    TaskStatus["TODO"] = "TODO";
})(TaskStatus || (TaskStatus = {}));
export var TicketStatus;
(function (TicketStatus) {
    TicketStatus["CLOSED"] = "CLOSED";
    TicketStatus["IN_PROGRESS"] = "IN_PROGRESS";
    TicketStatus["OPEN"] = "OPEN";
    TicketStatus["RESOLVED"] = "RESOLVED";
})(TicketStatus || (TicketStatus = {}));
export var UserRole;
(function (UserRole) {
    UserRole["ADMIN"] = "ADMIN";
    UserRole["MEMBER"] = "MEMBER";
})(UserRole || (UserRole = {}));
export var WorkspaceRole;
(function (WorkspaceRole) {
    WorkspaceRole["ADMIN"] = "ADMIN";
    WorkspaceRole["GUEST"] = "GUEST";
    WorkspaceRole["MEMBER"] = "MEMBER";
    WorkspaceRole["OWNER"] = "OWNER";
})(WorkspaceRole || (WorkspaceRole = {}));
//==============================================================
// END Generated Schemas
//==============================================================
