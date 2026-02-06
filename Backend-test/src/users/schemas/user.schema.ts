import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { compare, hash } from 'bcrypt';

export type UserDocument = HydratedDocument<User, UserMethods>;

export type AuthenticatedUser = Omit<User, 'password'> & { _id: string };

export interface UserMethods {
  comparePassword(candidatePassword: string): Promise<boolean>;
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
}

@Schema({
  timestamps: true,
})
export class User {
  @Prop({
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  })
  email: string;

  @Prop({ required: true, select: false })
  password: string;

  @Prop({ required: true })
  name: string;

  @Prop({
    required: true,
    index: true,
  })
  phone: string;

  @Prop({
    default: UserStatus.ACTIVE,
    enum: UserStatus,
    index: true,
  })
  status: UserStatus;

  @Prop({ default: 0 })
  totalOrders: number;

  @Prop({ default: null })
  lastLoginAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.pre<UserDocument>('save', async function () {
  if (this.isModified('password')) {
    try {
      this.password = await hash(this.password, 10);
    } catch (error) {
      console.log(error);
      throw new Error('Password hashing failed');
    }
  }
});

UserSchema.methods.comparePassword = async function (
  this: UserDocument,
  candidatePassword: string,
): Promise<boolean> {
  try {
    return await compare(candidatePassword, this.password);
  } catch {
    return false;
  }
};

UserSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (doc, ret) => {
    return ret;
  },
});

UserSchema.index({ email: 1, status: 1 });
UserSchema.index({ createdAt: -1 });
UserSchema.index({ totalOrders: -1 });
