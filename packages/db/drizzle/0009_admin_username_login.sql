ALTER TABLE "users" ADD COLUMN "username" varchar(64);--> statement-breakpoint
UPDATE "users"
SET "username" = 'admin'
WHERE "id" = (
	SELECT "id"
	FROM "users"
	WHERE "role" = 'admin' AND "username" IS NULL
	ORDER BY "created_at" ASC
	LIMIT 1
)
AND NOT EXISTS (
	SELECT 1
	FROM "users"
	WHERE "username" = 'admin'
);--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_username_unique" UNIQUE("username");
