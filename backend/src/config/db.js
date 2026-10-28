import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const isTest = process.env.NODE_ENV === 'test' || (process.argv[1] && process.argv[1].includes('test'));
const connectionString = (isTest && process.env.DATABASE_URL_TEST)
  ? process.env.DATABASE_URL_TEST
  : process.env.DATABASE_URL;

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

export default prisma;
