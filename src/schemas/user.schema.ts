import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true, index: true })
  email: string;

  @Prop()
  passwordHash?: string;

  @Prop()
  profilePhoto?: string; // Added per Plan.md

  @Prop()
  googleId?: string;

  @Prop({ default: false })
  isEmailVerified: boolean;

  @Prop()
  emailVerifiedAt?: Date; // Added per Plan.md

  @Prop({ default: 'user', enum: ['user', 'admin'] })
  role: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  emailVerificationToken?: string;

  @Prop()
  passwordResetToken?: string;

  @Prop()
  passwordResetExpires?: Date;

  @Prop({ default: Date.now, index: true })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;

  @Prop()
  lastLogin?: Date;

  // Optional OAuth provider metadata
  @Prop({ type: Object })
  providers?: any;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Create indexes as per Plan.md
UserSchema.index({ email: 1 }, { unique: true });
