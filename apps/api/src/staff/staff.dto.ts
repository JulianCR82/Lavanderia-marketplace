import { Transform } from 'class-transformer';
import {
  Equals,
  IsEmail,
  IsOptional,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class AcceptStaffDto {
  @Equals(true)
  confirm!: boolean;
}

export class InviteStaffDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email!: string;
}
export class StaffPageDto {
  @IsOptional()
  @IsUUID('4')
  cursor?: string;
}
