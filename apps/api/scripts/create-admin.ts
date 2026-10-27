/**
 * One-time administrator bootstrap.
 *
 *   npm run create-admin -- --email owner@example.com --name "Store Owner"
 *
 * The password is read from ADMIN_PASSWORD or prompted for (hidden). The
 * script refuses to run if an administrator already exists, so it cannot be
 * used to silently add admins later. Use --promote to make an existing
 * customer account the first admin. There is no default password.
 */
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import { emailSchema, nameSchema, passwordSchema } from '@shayara/shared';
import { connectDatabase, disconnectDatabase } from '../src/config/db';
import { getConfig } from '../src/config/env';
import { SessionModel, UserModel } from '../src/models';
import { hashPassword } from '../src/modules/auth/password';

function promptHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const write = (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput.bind(rl);
    (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput = (s: string) => {
      write(s.startsWith(question) ? question : '');
    };
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write('\n');
      resolve(answer);
    });
  });
}

async function main() {
  const { values } = parseArgs({
    options: { email: { type: 'string' }, name: { type: 'string' }, promote: { type: 'boolean', default: false } },
  });
  const email = emailSchema.parse(values.email ?? '');
  const config = getConfig();
  await connectDatabase(config.mongodbUri);

  try {
    if (await UserModel.exists({ role: 'admin' })) {
      throw new Error('An administrator already exists. This bootstrap script only creates the first admin.');
    }

    const existing = await UserModel.findOne({ email });
    if (existing) {
      if (!values.promote) throw new Error(`${email} already has an account. Re-run with --promote to make it the first admin.`);
      existing.role = 'admin';
      await existing.save();
      // Privilege change: force a fresh login so a new session is issued.
      await SessionModel.deleteMany({ userId: existing._id });
      console.log(`Promoted ${email} to administrator. Please log in again.`);
      return;
    }

    const name = nameSchema.parse(values.name ?? 'Shayara Admin');
    const password = passwordSchema.parse(process.env.ADMIN_PASSWORD ?? (await promptHidden('Admin password (min 10 chars, letters + numbers): ')));
    await UserModel.create({
      name,
      email,
      passwordHash: await hashPassword(password),
      role: 'admin',
      emailVerified: true,
      emailVerifiedAt: new Date(),
    });
    console.log(`Created administrator ${email}. Log in at ${config.frontendUrl}/login and open /admin.`);
  } finally {
    await disconnectDatabase();
  }
}

main().catch((err) => {
  const message = err instanceof Error && 'issues' in err ? (err as { issues: { message: string }[] }).issues.map((i) => i.message).join('; ') : err instanceof Error ? err.message : String(err);
  console.error(`create-admin failed: ${message}`);
  process.exit(1);
});
