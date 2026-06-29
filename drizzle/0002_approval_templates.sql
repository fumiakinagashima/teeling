CREATE TABLE IF NOT EXISTS `approval_templates` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `type` text NOT NULL,
  `description` text,
  `body_format` text NOT NULL DEFAULT '',
  `custom_fields` text NOT NULL DEFAULT '[]',
  `default_route` text NOT NULL DEFAULT '[]',
  `created_at` integer NOT NULL DEFAULT (unixepoch()),
  `updated_at` integer NOT NULL DEFAULT (unixepoch())
);
