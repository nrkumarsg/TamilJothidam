import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email!: string;

  // spec §41 doesn't mandate a specific complexity policy — 8 characters is
  // a documented minimum-viable floor, not a claim of full password-policy
  // compliance.
  @IsString()
  @MinLength(8)
  password!: string;
}
