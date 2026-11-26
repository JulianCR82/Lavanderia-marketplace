import { Transform } from 'class-transformer';
import { IsEmail, IsString, IsUUID, Matches, MaxLength } from 'class-validator';

export class RequestRecoveryDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email!: string;
}
export class RecoveryIdDto {
  @IsUUID('4')
  recoveryId!: string;
}
export class VerifyRecoveryDto extends RecoveryIdDto {
  @IsString()
  @Matches(/^\d{6}$/)
  code!: string;
}
export class ResetPasswordDto {
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{43}$/)
  resetToken!: string;
  @IsString()
  @MaxLength(256)
  password!: string;
  @IsString()
  @MaxLength(256)
  passwordConfirmation!: string;
}
