// import { PassportStrategy } from '@nestjs/passport';
// import { Injectable, UnauthorizedException } from '@nestjs/common';
// import { User } from 'src/users/schemas/user.schema';
// import { AuthService } from '../service/auth.service';
// import { Strategy } from 'passport-local';

// type AuthenticatedUser = Omit<User, 'password'>;

// @Injectable()
// export class LocalStrategy extends PassportStrategy(Strategy) {
//   constructor(private authService: AuthService) {
//     super({
//       usernameField: 'email',
//       passwordField: 'password',
//     });
//   }

//   async validate(email: string, password: string): Promise<AuthenticatedUser> {
//     const user = await this.authService.validateUser(email, password);

//     if (!user) {
//       throw new UnauthorizedException();
//     }

//     return user;
//   }
// }
