type SendCodeResponseProps = { smscode?: string | null };

export class SignInByPhoneSendCodeResponse{
  constructor(props: SendCodeResponseProps) {
    this.smscode =  props?.smscode || null;
  }
  smscode: string | null;
  static create(props: SendCodeResponseProps) {
    const payload = new SignInByPhoneSendCodeResponse(props);

    payload.smscode = props?.smscode || null;

    return payload;
  }
}
