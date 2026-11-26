import { Transform } from 'class-transformer';
import { IsEmail, IsString, IsUUID, Matches, MaxLength } from 'class-validator';

export class StartRegistrationDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @MaxLength(256) // Unicode surrogate pairs count twice here; policy counts code points.
  password!: string;
}

export class RegistrationIdDto {
  @IsUUID('4')
  registrationId!: string;
}

export class VerifyRegistrationDto extends RegistrationIdDto {
  @IsString()
  @Matches(/^\d{6}$/)
  code!: string;
}
