export class Link {
  constructor(
    public readonly id: string,
    public readonly userInfo: { name: string; number: string },
    public readonly expiresAt: Date,
  ) {}
}