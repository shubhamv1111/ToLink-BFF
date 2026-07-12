import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

// Plan.md specifies "clicks" collection for analytics
export type ClicksDocument = Clicks & Document;

@Schema({ timestamps: true, collection: 'clicks' })
export class Clicks {
  @Prop({ type: Types.ObjectId, ref: 'Url', required: true, index: true })
  linkId: Types.ObjectId; // Changed from urlId to linkId per Plan.md

  @Prop({ required: true, index: true })
  ts: Date; // Changed from timestamp to ts per Plan.md

  @Prop({ required: true })
  ip: string; // Hashed or truncated per privacy policy

  @Prop({ required: true })
  userAgent: string;

  @Prop()
  referrer?: string; // Normalized domain (changed from referer)

  @Prop()
  country?: string;

  @Prop()
  city?: string;

  @Prop({
    required: true,
    enum: ['desktop', 'mobile', 'tablet', 'bot', 'unknown'],
  })
  deviceType: string;

  @Prop()
  os?: string; // Windows, macOS, Linux, iOS, Android

  @Prop()
  browser?: string; // Chrome, Firefox, Safari, etc.
}

export const ClicksSchema = SchemaFactory.createForClass(Clicks);

// Create indexes as per Plan.md
ClicksSchema.index({ linkId: 1, ts: -1 });
ClicksSchema.index({ ts: -1 });
ClicksSchema.index({ country: 1 });
ClicksSchema.index({ referrer: 1 });

// Legacy Analytics schema (keeping for compatibility)
export type AnalyticsDocument = Analytics & Document;

@Schema({ timestamps: true })
export class Analytics {
  @Prop({ type: Types.ObjectId, ref: 'Url', required: true, index: true })
  urlId: Types.ObjectId;

  @Prop({ required: true, index: true })
  shortCode: string;

  @Prop({ type: Types.ObjectId, ref: 'User', index: true })
  userId?: Types.ObjectId;

  @Prop({ required: true })
  ipAddress: string;

  @Prop({ required: true })
  userAgent: string;

  @Prop()
  referer?: string;

  @Prop()
  country?: string;

  @Prop()
  region?: string;

  @Prop()
  city?: string;

  @Prop()
  timezone?: string;

  @Prop({ required: true })
  device: string; // mobile, tablet, desktop

  @Prop({ required: true })
  browser: string; // Chrome, Firefox, Safari, etc.

  @Prop({ required: true })
  os: string; // Windows, macOS, Linux, iOS, Android

  @Prop({ required: true })
  deviceModel?: string;

  @Prop({ default: Date.now, index: true })
  timestamp: Date;

  @Prop({ default: Date.now })
  createdAt: Date;
}

export const AnalyticsSchema = SchemaFactory.createForClass(Analytics);

// Create compound indexes for efficient queries
AnalyticsSchema.index({ shortCode: 1, timestamp: -1 });
AnalyticsSchema.index({ urlId: 1, timestamp: -1 });
AnalyticsSchema.index({ userId: 1, timestamp: -1 });
AnalyticsSchema.index({ country: 1, timestamp: -1 });
AnalyticsSchema.index({ device: 1, timestamp: -1 });
AnalyticsSchema.index({ timestamp: -1 }); // For time-series queries
