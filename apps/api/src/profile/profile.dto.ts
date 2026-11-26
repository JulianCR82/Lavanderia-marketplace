import { Transform } from 'class-transformer';
import { IsString, Matches, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.normalize('NFC').trim() : value,
  )
  @IsString()
  @MaxLength(80)
  @Matches(/^[^\p{Cc}\p{Cf}]*$/u)
  displayName!: string;
}
