import { IsNumberString, IsString } from 'class-validator';

export class ReccuringProfileCallbackDto {
  @IsString() pg_order_id: string;
  @IsString() pg_payment_id: string;
  @IsNumberString() pg_amount: string;
  @IsString() pg_currency: string;
  @IsNumberString() pg_net_amount: string;
  @IsNumberString() pg_ps_amount: string;
  @IsNumberString() pg_ps_full_amount: string;
  @IsString() pg_ps_currency: string;
  @IsString() pg_description: string;
  @IsString() pg_result: string;
  @IsString() pg_payment_date: string;
  @IsString() pg_can_reject: string;
  @IsString() pg_user_phone: string;
  @IsString() pg_need_phone_notification: string;
  @IsString() pg_user_contact_email: string;
  @IsString() pg_need_email_notification: string;
  @IsString() pg_payment_method: string;
  @IsString() pg_reference: string;
  @IsString() pg_captured: string;
  @IsString() pg_recurring_profile_id: string;
  @IsString() pg_recurring_profile_expiry_date: string;
  @IsString() pg_card_pan: string;
  @IsString() pg_card_exp: string;
  @IsString() pg_card_owner: string;
  @IsString() pg_card_brand: string;
  @IsString() pg_auth_code: string;
  @IsString() pg_salt: string;
  @IsString() pg_sig: string;
}
