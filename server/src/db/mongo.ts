import mongoose, { Schema } from "mongoose";
import type { NewQuiz, QuizRecord, QuizResult, QuizStore } from "../types.js";

interface QuizDoc {
  _id: mongoose.Types.ObjectId;
  title: string;
  notesText: string;
  result: QuizResult;
  createdAt: Date;
}

const quizSchema = new Schema<QuizDoc>(
  {
    title: { type: String, default: "" },
    notesText: { type: String, required: true },
    result: { type: Schema.Types.Mixed, required: true },
    createdAt: { type: Date, default: () => new Date() },
  },
  { versionKey: false },
);

const QuizModel = mongoose.models.Quiz ?? mongoose.model<QuizDoc>("Quiz", quizSchema);

function toRecord(doc: QuizDoc): QuizRecord {
  return {
    id: doc._id.toString(),
    title: doc.title,
    notesText: doc.notesText,
    result: doc.result,
    createdAt: doc.createdAt.toISOString(),
  };
}

export async function createMongoStore(uri: string): Promise<QuizStore> {
  await mongoose.connect(uri);
  return {
    async insert(quiz: NewQuiz): Promise<QuizRecord> {
      const doc = await QuizModel.create(quiz);
      return toRecord(doc);
    },
    async list(limit: number): Promise<QuizRecord[]> {
      const docs = await QuizModel.find().sort({ createdAt: -1 }).limit(limit).exec();
      return docs.map((doc) => toRecord(doc));
    },
    async get(id: string): Promise<QuizRecord | null> {
      if (!mongoose.isValidObjectId(id)) return null;
      const doc = await QuizModel.findById(id).exec();
      return doc ? toRecord(doc) : null;
    },
    async remove(id: string): Promise<boolean> {
      if (!mongoose.isValidObjectId(id)) return false;
      const result = await QuizModel.findByIdAndDelete(id).exec();
      return result !== null;
    },
  };
}
