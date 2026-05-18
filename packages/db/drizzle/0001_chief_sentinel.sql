CREATE TABLE "grade_simulation_apps" (
	"grade_id" integer NOT NULL,
	"simulation_app_id" varchar(100) NOT NULL,
	CONSTRAINT "grade_simulation_apps_grade_id_simulation_app_id_pk" PRIMARY KEY("grade_id","simulation_app_id")
);
--> statement-breakpoint
CREATE TABLE "grades" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(20) NOT NULL,
	CONSTRAINT "grades_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "simulation_apps" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"category_id" varchar(100) NOT NULL,
	"src" text,
	"thumbnail" varchar(500),
	"isable" boolean DEFAULT true NOT NULL,
	"topics" jsonb,
	"sample_learning_goals" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "simulation_categories" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"parent_id" varchar(100),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "grade_simulation_apps" ADD CONSTRAINT "grade_simulation_apps_grade_id_grades_id_fk" FOREIGN KEY ("grade_id") REFERENCES "public"."grades"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grade_simulation_apps" ADD CONSTRAINT "grade_simulation_apps_simulation_app_id_simulation_apps_id_fk" FOREIGN KEY ("simulation_app_id") REFERENCES "public"."simulation_apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "simulation_apps" ADD CONSTRAINT "simulation_apps_category_id_simulation_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."simulation_categories"("id") ON DELETE cascade ON UPDATE no action;