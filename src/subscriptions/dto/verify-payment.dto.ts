import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyPaymentDto {
  @IsString()
  @IsNotEmpty({ message: 'L\'identifiant de transaction FedaPay est requis.' })
  transactionId: string;
}
