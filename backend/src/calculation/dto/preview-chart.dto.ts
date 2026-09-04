import { IsNumber, IsString, Matches, Max, Min } from 'class-validator';

export class PreviewChartDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'dateOfBirth must be YYYY-MM-DD' })
  dateOfBirth!: string;

  @Matches(/^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/, {
    message: 'timeOfBirth must be in HH:mm or HH:mm:ss format',
  })
  timeOfBirth!: string;

  @IsString()
  timezone!: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;
}
