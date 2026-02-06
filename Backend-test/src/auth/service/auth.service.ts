import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserDocument } from 'src/users/schemas/user.schema';
import { UsersService } from 'src/users/service/users.service';
import { CreateUserDto } from 'src/users/dto/user-create.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(
    email: string,
    plainPassword: string,
  ): Promise<UserDocument | null> {
    const user = await this.usersService.findByEmailWithPassword(email);
    if (!user) return null;

    const isValid = await user.comparePassword(plainPassword);
    if (!isValid) return null;

    user.lastLoginAt = new Date();
    await user.save();

    return user;
  }

  async login(user: UserDocument) {
    const payload = {
      email: user.email,
      sub: user._id.toString(),
      name: user.name,
    };

    const token = await this.jwtService.signAsync(payload);

    return {
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
      },
      access_token: token,
    };
  }

  async register(registerDto: CreateUserDto) {
    const user = await this.usersService.create(registerDto);
    return this.login(user);
  }

  async getProfile(userId: string) {
    return this.usersService.findById(userId);
  }
}
