/**
 * Development helper: creates a demo customer account (never an admin).
 *   npx tsx --env-file=.env scripts/create-sample-customer.ts <email> <password> [name]
 */
import { emailSchema, nameSchema, passwordSchema } from '@shayara/shared';
import { connectDatabase, disconnectDatabase } from '../src/config/db';
import { getConfig } from '../src/config/env';
import { UserModel } from '../src/models';
import { hashPassword } from '../src/modules/auth/password';

const [emailArg, passwordArg, nameArg] = process.argv.slice(2);
const email = emailSchema.parse(emailArg ?? '');
const password = passwordSchema.parse(passwordArg ?? '');
const name = nameSchema.parse(nameArg ?? 'Sample Customer');

await connectDatabase(getConfig().mongodbUri);
try {
  if (await UserModel.exists({ email })) {
    console.log(`${email} already exists; nothing changed.`);
  } else {
    await UserModel.create({ name, email, passwordHash: await hashPassword(password), role: 'customer', emailVerified: true, emailVerifiedAt: new Date() });
    console.log(`Created customer ${email}`);
  }
} finally {
  await disconnectDatabase();
}
