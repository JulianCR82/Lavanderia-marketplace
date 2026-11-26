import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export type IdentityProvider = 'google';
export class EmailLoginDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email!: string;
  @IsString()
  @MinLength(1)
  @MaxLength(256)
  password!: string;
}
export class ProviderDto {
  @IsIn(['google'])
  provider!: IdentityProvider;
}
export class ProviderLoginDto extends ProviderDto {
  @IsUUID('4')
  challengeId!: string;
  @IsString()
  @MinLength(1)
  @MaxLength(16384)
  identityToken!: string;
}
