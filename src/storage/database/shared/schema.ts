import { sql } from "drizzle-orm";
import {
  pgTable, text, varchar, timestamp, boolean, integer, jsonb, index, numeric,
} from "drizzle-orm/pg-core";
import { createSchemaFactory } from "drizzle-zod";
import { z } from "zod";

const { createInsertSchema } = createSchemaFactory({ coerce: { date: true } });

// ==================== Profiles (extends auth.users) ====================
export const profiles = pgTable(
  "profiles",
  {
    id: varchar("id", { length: 36 }).primaryKey(), // matches auth.users.id
    email: varchar("email", { length: 255 }).notNull(),
    full_name: varchar("full_name", { length: 128 }).notNull(),
    avatar_url: text("avatar_url"),
    role: varchar("role", { length: 20 }).notNull().default("member"), // member | admin
    is_active: boolean("is_active").notNull().default(true),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("profiles_email_idx").on(table.email),
    index("profiles_role_idx").on(table.role),
  ]
);

// ==================== Navigation Categories ====================
export const nav_categories = pgTable(
  "nav_categories",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    name: varchar("name", { length: 100 }).notNull(),
    sort_order: integer("sort_order").notNull().default(0),
    created_by: varchar("created_by", { length: 36 }).notNull().references(() => profiles.id),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deleted_at: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("nav_categories_sort_idx").on(table.sort_order),
    index("nav_categories_deleted_idx").on(table.deleted_at),
  ]
);

// ==================== Navigation Links ====================
export const nav_links = pgTable(
  "nav_links",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    category_id: varchar("category_id", { length: 36 }).notNull().references(() => nav_categories.id),
    name: varchar("name", { length: 200 }).notNull(),
    url: text("url").notNull(),
    icon: varchar("icon", { length: 100 }),
    description: text("description"),
    sort_order: integer("sort_order").notNull().default(0),
    created_by: varchar("created_by", { length: 36 }).notNull().references(() => profiles.id),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deleted_at: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("nav_links_category_idx").on(table.category_id),
    index("nav_links_sort_idx").on(table.sort_order),
    index("nav_links_deleted_idx").on(table.deleted_at),
  ]
);

// ==================== Case Types ====================
export const case_types = pgTable(
  "case_types",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    name: varchar("name", { length: 100 }).notNull(),
    description: text("description"),
    is_active: boolean("is_active").notNull().default(true),
    sort_order: integer("sort_order").notNull().default(0),
    created_by: varchar("created_by", { length: 36 }).notNull().references(() => profiles.id),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("case_types_active_idx").on(table.is_active),
  ]
);

// ==================== Case Type Custom Fields ====================
export const case_type_fields = pgTable(
  "case_type_fields",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    case_type_id: varchar("case_type_id", { length: 36 }).notNull().references(() => case_types.id),
    field_name: varchar("field_name", { length: 100 }).notNull(),
    field_type: varchar("field_type", { length: 30 }).notNull(), // text | number | date | select | textarea
    is_required: boolean("is_required").notNull().default(false),
    is_visible: boolean("is_visible").notNull().default(true),
    options: jsonb("options"), // for select type: ["option1", "option2"]
    sort_order: integer("sort_order").notNull().default(0),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("case_type_fields_type_idx").on(table.case_type_id),
    index("case_type_fields_sort_idx").on(table.sort_order),
  ]
);

// ==================== Case Stages (per case type) ====================
export const case_stages = pgTable(
  "case_stages",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    case_type_id: varchar("case_type_id", { length: 36 }).notNull().references(() => case_types.id),
    name: varchar("name", { length: 100 }).notNull(),
    sort_order: integer("sort_order").notNull().default(0),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("case_stages_type_idx").on(table.case_type_id),
    index("case_stages_sort_idx").on(table.sort_order),
  ]
);

// ==================== Legal Cases ====================
export const cases = pgTable(
  "cases",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    name: varchar("name", { length: 300 }).notNull(),
    case_type_id: varchar("case_type_id", { length: 36 }).notNull().references(() => case_types.id),
    status: varchar("status", { length: 20 }).notNull().default("pending"), // pending | in_progress | resolved | archived
    current_stage_id: varchar("current_stage_id", { length: 36 }).references(() => case_stages.id),
    priority: varchar("priority", { length: 20 }).notNull().default("medium"), // low | medium | high | urgent
    owner_id: varchar("owner_id", { length: 36 }).notNull().references(() => profiles.id),
    collaborators: jsonb("collaborators"), // array of profile ids
    related_department: varchar("related_department", { length: 200 }),
    opposing_party: varchar("opposing_party", { length: 300 }),
    description: text("description"),
    start_date: timestamp("start_date", { withTimezone: true }),
    due_date: timestamp("due_date", { withTimezone: true }),
    // Archive fields
    resolution: text("resolution"),
    closed_date: timestamp("closed_date", { withTimezone: true }),
    closure_method: varchar("closure_method", { length: 100 }),
    is_settled: boolean("is_settled").default(false),
    has_cost: boolean("has_cost").default(false),
    cost_amount: numeric("cost_amount", { precision: 12, scale: 2 }),
    final_result: text("final_result"),
    created_by: varchar("created_by", { length: 36 }).notNull().references(() => profiles.id),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deleted_at: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("cases_type_idx").on(table.case_type_id),
    index("cases_status_idx").on(table.status),
    index("cases_owner_idx").on(table.owner_id),
    index("cases_priority_idx").on(table.priority),
    index("cases_due_date_idx").on(table.due_date),
    index("cases_deleted_idx").on(table.deleted_at),
    index("cases_created_idx").on(table.created_at),
  ]
);

// ==================== Case Custom Field Values ====================
export const case_field_values = pgTable(
  "case_field_values",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    case_id: varchar("case_id", { length: 36 }).notNull().references(() => cases.id),
    field_id: varchar("field_id", { length: 36 }).notNull().references(() => case_type_fields.id),
    field_value: text("field_value"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("cfv_case_idx").on(table.case_id),
    index("cfv_field_idx").on(table.field_id),
  ]
);

// ==================== Tasks ====================
export const tasks = pgTable(
  "tasks",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    title: varchar("title", { length: 300 }).notNull(),
    task_type: varchar("task_type", { length: 20 }).notNull(), // daily | periodic | temporary
    status: varchar("status", { length: 20 }).notNull().default("pending"), // pending | in_progress | completed | cancelled
    priority: varchar("priority", { length: 20 }).notNull().default("medium"), // low | medium | high | urgent
    urgency: varchar("urgency", { length: 20 }).notNull().default("normal"), // urgent | normal
    importance: varchar("importance", { length: 20 }).notNull().default("normal"), // important | normal
    progress: integer("progress").notNull().default(0), // 0-100
    owner_id: varchar("owner_id", { length: 36 }).notNull().references(() => profiles.id),
    creator_id: varchar("creator_id", { length: 36 }).notNull().references(() => profiles.id),
    case_id: varchar("case_id", { length: 36 }).references(() => cases.id),
    due_date: timestamp("due_date", { withTimezone: true }),
    due_time: varchar("due_time", { length: 10 }), // HH:mm format for daily reminders
    completed_at: timestamp("completed_at", { withTimezone: true }),
    // Periodic task fields
    period_type: varchar("period_type", { length: 20 }), // daily | weekly | monthly | quarterly | yearly
    period_config: jsonb("period_config"), // e.g. { dayOfWeek: 1, dayOfMonth: 15 }
    // Extra
    description: text("description"),
    link_url: text("link_url"),
    reminder_rules: jsonb("reminder_rules"), // [{type: "before", value: 1, unit: "day"}, ...]
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deleted_at: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("tasks_type_idx").on(table.task_type),
    index("tasks_status_idx").on(table.status),
    index("tasks_owner_idx").on(table.owner_id),
    index("tasks_creator_idx").on(table.creator_id),
    index("tasks_case_idx").on(table.case_id),
    index("tasks_due_date_idx").on(table.due_date),
    index("tasks_priority_idx").on(table.priority),
    index("tasks_deleted_idx").on(table.deleted_at),
    index("tasks_created_idx").on(table.created_at),
  ]
);

// ==================== Case Documents (links to DingTalk docs) ====================
export const case_documents = pgTable(
  "case_documents",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    case_id: varchar("case_id", { length: 36 }).notNull().references(() => cases.id),
    name: varchar("name", { length: 300 }).notNull(),
    url: text("url").notNull(),
    doc_type: varchar("doc_type", { length: 50 }), // contract | evidence | letter | agreement | other
    description: text("description"),
    uploaded_by: varchar("uploaded_by", { length: 36 }).notNull().references(() => profiles.id),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    deleted_at: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("case_docs_case_idx").on(table.case_id),
    index("case_docs_deleted_idx").on(table.deleted_at),
  ]
);

// ==================== Operation Logs ====================
export const operation_logs = pgTable(
  "operation_logs",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    user_id: varchar("user_id", { length: 36 }).notNull().references(() => profiles.id),
    action: varchar("action", { length: 50 }).notNull(), // create | update | delete | restore | archive
    entity_type: varchar("entity_type", { length: 50 }).notNull(), // case | task | nav_link | nav_category | case_type | document
    entity_id: varchar("entity_id", { length: 36 }).notNull(),
    entity_name: varchar("entity_name", { length: 300 }),
    changes: jsonb("changes"), // {field: {old: "x", new: "y"}}
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("op_logs_user_idx").on(table.user_id),
    index("op_logs_entity_idx").on(table.entity_type, table.entity_id),
    index("op_logs_created_idx").on(table.created_at),
    index("op_logs_action_idx").on(table.action),
  ]
);

// ==================== Recycle Bin ====================
export const recycle_bin = pgTable(
  "recycle_bin",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    entity_type: varchar("entity_type", { length: 50 }).notNull(),
    entity_id: varchar("entity_id", { length: 36 }).notNull(),
    entity_name: varchar("entity_name", { length: 300 }),
    original_table: varchar("original_table", { length: 100 }).notNull(),
    original_data: jsonb("original_data").notNull(),
    deleted_by: varchar("deleted_by", { length: 36 }).notNull().references(() => profiles.id),
    deleted_at: timestamp("deleted_at", { withTimezone: true }).defaultNow().notNull(),
    restored_at: timestamp("restored_at", { withTimezone: true }),
    is_permanently_deleted: boolean("is_permanently_deleted").notNull().default(false),
  },
  (table) => [
    index("recycle_entity_idx").on(table.entity_type),
    index("recycle_deleted_idx").on(table.deleted_at),
    index("recycle_restored_idx").on(table.restored_at),
  ]
);

// ==================== System Settings ====================
export const system_settings = pgTable(
  "system_settings",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    key: varchar("key", { length: 100 }).notNull().unique(),
    value: jsonb("value").notNull(),
    description: text("description"),
    updated_by: varchar("updated_by", { length: 36 }).references(() => profiles.id),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("settings_key_idx").on(table.key),
  ]
);

// Export types
export type Profile = typeof profiles.$inferSelect;
export type NavCategory = typeof nav_categories.$inferSelect;
export type NavLink = typeof nav_links.$inferSelect;
export type CaseType = typeof case_types.$inferSelect;
export type CaseTypeField = typeof case_type_fields.$inferSelect;
export type CaseStage = typeof case_stages.$inferSelect;
export type Case = typeof cases.$inferSelect;
export type CaseFieldValue = typeof case_field_values.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type CaseDocument = typeof case_documents.$inferSelect;
export type OperationLog = typeof operation_logs.$inferSelect;
export type RecycleBinItem = typeof recycle_bin.$inferSelect;
export type SystemSetting = typeof system_settings.$inferSelect;
