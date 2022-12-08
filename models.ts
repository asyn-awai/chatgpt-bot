import { Schema, model } from "mongoose";

export interface IUser {
	_id: string;
	userId: string;
	conversationId: string;
	parentId: string;
}

const userSchema = new Schema({
	userId: { type: String, unique: true },
	conversationId: { type: String, unique: false },
	parentId: { type: String, unique: false },
});

export const User = model<IUser>("conversations", userSchema);
// User.collection.dropIndexes(console.log)
