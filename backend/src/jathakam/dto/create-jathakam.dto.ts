import { IsUUID } from 'class-validator';

export class CreateJathakamDto {
  @IsUUID()
  profileId!: string;
}
