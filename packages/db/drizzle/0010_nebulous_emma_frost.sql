CREATE TABLE "wechat_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"openid" varchar(128) NOT NULL,
	"unionid" varchar(128),
	"nickname" varchar(100),
	"avatar_url" text,
	"raw_profile" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "wechat_accounts" ADD CONSTRAINT "wechat_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_wechat_openid" ON "wechat_accounts" USING btree ("openid");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_wechat_unionid" ON "wechat_accounts" USING btree ("unionid") WHERE "wechat_accounts"."unionid" is not null;--> statement-breakpoint
CREATE INDEX "idx_wechat_user_id" ON "wechat_accounts" USING btree ("user_id");