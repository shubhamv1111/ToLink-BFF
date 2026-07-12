import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UrlDocument = Url & Document;

// Status period for analytics shading
export interface StatusPeriod {
  start: string; // YYYY-MM-DD format
  end?: string; // YYYY-MM-DD format, optional for ongoing periods
}

@Schema({ timestamps: true })
export class Url {
  @Prop({ required: true, unique: true, index: true })
  shortCode: string;

  @Prop({ required: true })
  originalUrl: string;

  @Prop({ unique: true, sparse: true })
  customAlias?: string;

  @Prop()
  urlName?: string; // Changed from 'name' to 'urlName' to match Plan.md

  @Prop({ type: Types.ObjectId, ref: 'User', index: true })
  userId?: Types.ObjectId;

  // Plan.md fields for link access control
  @Prop({ default: false })
  isPrivate: boolean;

  @Prop({ default: false })
  hasPassword: boolean;

  @Prop()
  passwordHash?: string; // Bcrypt hashed password for protected links

  @Prop({ default: true })
  enabled: boolean;

  @Prop()
  activationAt?: Date; // When link becomes active

  @Prop()
  expiresAt?: Date; // When link expires

  // Analytics tracking for status periods
  @Prop({ type: [{ start: String, end: String }], default: [] })
  statusPeriods: StatusPeriod[];

  // TTL for anonymous links (auto-delete after 30 days)
  @Prop()
  deleteAt?: Date;

  @Prop({ default: 0 })
  clicks: number; // Renamed from 'clickCount' to match Plan.md

  @Prop()
  lastClicked?: Date;

  // Legacy fields (keeping for compatibility)
  @Prop([String])
  tags?: string[];

  @Prop({ default: Date.now, index: true })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const UrlSchema = SchemaFactory.createForClass(Url);

// Create indexes as per Plan.md
UrlSchema.index({ shortCode: 1 }, { unique: true });
UrlSchema.index({ userId: 1, createdAt: -1 });
UrlSchema.index({ deleteAt: 1 }, { expireAfterSeconds: 0 }); // TTL index for anonymous links
UrlSchema.index({ enabled: 1, activationAt: 1, expiresAt: 1 }); // For filtering
UrlSchema.index({ originalUrl: 'text', urlName: 'text', shortCode: 'text' }); // Text search
