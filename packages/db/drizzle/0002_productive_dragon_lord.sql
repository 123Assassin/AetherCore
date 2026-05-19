CREATE TABLE "credit_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"direction" varchar(3) NOT NULL,
	"amount" integer NOT NULL,
	"reason" varchar(32) NOT NULL,
	"idempotency_key" varchar(128),
	"related_type" varchar(64),
	"related_id" uuid,
	"balance_after" integer NOT NULL,
	"created_by_admin_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "credit_transactions_direction_check" CHECK ("credit_transactions"."direction" in ('in', 'out')),
	CONSTRAINT "credit_transactions_reason_check" CHECK ("credit_transactions"."reason" in ('chat', 'inspiration', 'comment_single', 'comment_batch_row', 'teaching', 'invite_reward', 'admin_adjust', 'refund')),
	CONSTRAINT "credit_transactions_amount_check" CHECK ("credit_transactions"."amount" > 0),
	CONSTRAINT "credit_transactions_balance_after_check" CHECK ("credit_transactions"."balance_after" >= 0)
);
--> statement-breakpoint
CREATE TABLE "user_credit_accounts" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"balance" integer DEFAULT 0 NOT NULL,
	"cycle_limit" integer DEFAULT 100 NOT NULL,
	"cycle_days" integer DEFAULT 180 NOT NULL,
	"reset_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_credit_accounts_balance_check" CHECK ("user_credit_accounts"."balance" >= 0),
	CONSTRAINT "user_credit_accounts_cycle_limit_check" CHECK ("user_credit_accounts"."cycle_limit" >= 0),
	CONSTRAINT "user_credit_accounts_cycle_days_check" CHECK ("user_credit_accounts"."cycle_days" > 0)
);
--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"grade" varchar(50),
	"subject" varchar(50),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_created_by_admin_id_users_id_fk" FOREIGN KEY ("created_by_admin_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_credit_accounts" ADD CONSTRAINT "user_credit_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_credit_idempotency" ON "credit_transactions" USING btree ("user_id","idempotency_key") WHERE "credit_transactions"."idempotency_key" is not null;--> statement-breakpoint
CREATE INDEX "idx_credit_user_created" ON "credit_transactions" USING btree ("user_id","created_at" DESC NULLS LAST);