import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type DailyLinkStatsDocument = DailyLinkStats & Document;

@Schema({ timestamps: true, collection: 'daily_link_stats' })
export class DailyLinkStats {
  @Prop({ type: Types.ObjectId, ref: 'Url', required: true, index: true })
  linkId: Types.ObjectId;

  @Prop({ required: true })
  date: string; // YYYY-MM-DD format

  @Prop({ required: true, default: 0 })
  clicks: number;
}

export const DailyLinkStatsSchema =
  SchemaFactory.createForClass(DailyLinkStats);

// Create indexes as per Plan.md
DailyLinkStatsSchema.index({ linkId: 1, date: 1 }, { unique: true });
