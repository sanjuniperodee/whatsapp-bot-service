import * as bcrypt from 'bcrypt';

async function hashString(input: string): Promise<string> {
  const saltRounds = 10;
  const salt = bcrypt.genSaltSync(saltRounds);
  const hashedString = bcrypt.hashSync(input, salt);
  return hashedString;
}

export default hashString;
