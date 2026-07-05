// Stub CHỈ dùng cho typecheck khi không chạy được `prisma generate` (CI sandbox).
declare module "@prisma/client" { export class PrismaClient { [k: string]: any; constructor(...a: any[]); } }
declare module "sharp" { const sharp: any; export = sharp; }
declare module "@sentry/node" { const s: any; export = s; }
declare module "cloudinary" { const c: any; export = c; }
