import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';
import { CreateUserDto } from '../dto/user-create.dto';
import { UpdateUserDto } from '../dto/user-update.dto';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async create(createUserDto: CreateUserDto): Promise<UserDocument> {
    const existingUser = await this.userModel
      .findOne({
        email: createUserDto.email.toLowerCase(),
      })
      .exec();

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const createdUser = new this.userModel({
      ...createUserDto,
      email: createUserDto.email.toLowerCase(),
    });

    return createdUser.save();
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid user ID format');
    }

    if (updateUserDto.email) {
      const email = updateUserDto.email.toLowerCase();

      const existingUser = await this.userModel
        .findOne({
          email,
          _id: { $ne: new Types.ObjectId(id) },
        })
        .exec();

      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }
      updateUserDto.email = email;
    }

    const updatedUser = await this.userModel
      .findByIdAndUpdate(
        id,
        { $set: updateUserDto },
        {
          new: true,
          runValidators: true,
        },
      )
      .exec();

    if (!updatedUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return updatedUser;
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase() }).exec();
  }

  async findByEmailWithPassword(email: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ email: email.toLowerCase() })
      .select('+password')
      .exec();
  }

  async findById(id: string): Promise<UserDocument> {
    const user = await this.userModel.findById(id).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async remove(id: string): Promise<{ message: string }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid user ID format');
    }

    const result = await this.userModel.findByIdAndDelete(id).exec();

    if (!result) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return { message: `User with ID ${id} has been deleted successfully` };
  }

  async getUserStats(userId: string) {
    return this.userModel.aggregate([
      { $match: { _id: userId } },
      {
        $lookup: {
          from: 'orders',
          localField: '_id',
          foreignField: 'userId',
          as: 'orders',
        },
      },
      {
        $project: {
          name: 1,
          email: 1,
          totalOrders: { $size: '$orders' },
          totalSpent: { $sum: '$orders.amount' },
          lastOrderDate: { $max: '$orders.createdAt' },
        },
      },
    ]);
  }
}
