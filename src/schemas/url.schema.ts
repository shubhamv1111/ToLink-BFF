import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UrlDocument = Url & Document;

@Schema({ timestamps: true })
export class Url {
  @Prop({ required: true, unique: true, index: true })
  shortCode: string;

  @Prop({ required: true })
  originalUrl: string;

  @Prop({ unique: true, sparse: true })
  customAlias?: string;

  @Prop()
  name?: string;

  @Prop({ type: Types.ObjectId, ref: 'User', index: true })
  userId?: Types.ObjectId;

  @Prop()
  password?: string; // Hashed password for protected links

  @Prop()
  expiresAt?: Date;

  @Prop({ default: true })
  isActive: boolean;

  @Prop([String])
  tags?: string[];

  @Prop({ default: 0 })
  clickCount: number;

  @Prop({ default: Date.now, index: true })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const UrlSchema = SchemaFactory.createForClass(Url);

// Create additional indexes for Phase 2
UrlSchema.index({ userId: 1, createdAt: -1 });
UrlSchema.index({ expiresAt: 1 });
UrlSchema.index({ isActive: 1 });
UrlSchema.index({ tags: 1 });
