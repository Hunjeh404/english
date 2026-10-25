import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
export const passages = sqliteTable('passages', {
 id:text('id').primaryKey(),title:text('title').notNull(),body:text('body').notNull(),voice:text('voice').notNull(),
 images:text('images').notNull(),audioKey:text('audio_key').notNull(),duration:real('duration').notNull(),
 goal:integer('goal').notNull().default(5),createdAt:text('created_at').notNull(),deletedAt:text('deleted_at'),
});
export const completions=sqliteTable('completions',{
 id:text('id').primaryKey(),userId:text('user_id'),passageId:text('passage_id').notNull().references(()=>passages.id,{onDelete:'cascade'}),createdAt:text('created_at').notNull(),
});

export const listeningPreferences=sqliteTable('listening_preferences',{
 id:text('id').primaryKey(),userId:text('user_id').notNull(),
 passageId:text('passage_id').notNull().references(()=>passages.id,{onDelete:'cascade'}),
 goal:integer('goal').notNull(),
});
