// Stub CHỈ dùng cho typecheck khi không chạy được `prisma generate` (CI sandbox).
// Types model bám SÁT schema.prisma để bắt lỗi gán sai kiểu (vd: gán mảng vào field String-JSON)
// — đúng loại lỗi từng làm Docker build fail trong khi sandbox (types any) lại pass.
declare module "@prisma/client" {
  type Str = string; type Int = number; type Bool = boolean; type Dt = Date;

  export interface User {
    id: Str; name: Str; email: Str; password: Str; phone: Str;
    phoneVerified: Bool; avatar: Str | null; role: Str; createdAt: Dt;
  }
  export interface OtpToken { id: Str; userId: Str; code: Str; purpose: Str; expiresAt: Dt; used: Bool; createdAt: Dt; }
  export interface Template {
    id: Str; slug: Str; title: Str; description: Str; keywords: Str;
    blankImage: Str | null; demoImage: Str | null; demoPhotos: Str; demoPages: Str;
    coverImage: Str | null; previewGif: Str | null; previewVideo: Str | null;
    pages: Str; productSize: Str | null; canvaLink: Str; category: Str; slots: Int; pageCount: Int;
    priceDigital: Int; priceSoft: Int; priceHard: Int; priceFan: Int;
    featured: Bool; archived: Bool; rating: number; createdAt: Dt; updatedAt: Dt;
  }
  export interface Project {
    id: Str; userId: Str; templateId: Str; title: Str; status: Str;
    photos: Str; layout: Str | null; mode: Str | null; option: Str | null; amount: Int | null;
    address: Str | null; tracking: Str | null; rating: Int | null; review: Str | null;
    createdAt: Dt; updatedAt: Dt; template?: Template; user?: User;
  }
  export interface Message {
    id: Str; userId: Str; content: Str; fromAdmin: Bool;
    readByAdmin: Bool; readByUser: Bool; recalled: Bool; deletedForSender: Bool; hiddenForUser: Bool; hiddenForAdmin: Bool;
    createdAt: Dt; user?: User;
  }
  export interface Setting { key: Str; value: Str; }

  // Ghi (create/update): field đúng KIỂU của model; where/include/select nới lỏng
  type WriteData<T> = { [K in keyof T]?: T[K] } & { [k: string]: unknown };
  interface Delegate<T> {
    findMany(args?: any): Promise<T[]>;
    updateMany(args: { where?: any; data: WriteData<T> }): Promise<{ count: number }>;
    findUnique(args: any): Promise<T | null>;
    findFirst(args?: any): Promise<T | null>;
    create(args: { data: WriteData<T>; [k: string]: any }): Promise<T>;
    update(args: { where: any; data: WriteData<T>; [k: string]: any }): Promise<T>;
    upsert(args: { where: any; update: WriteData<T>; create: WriteData<T>; [k: string]: any }): Promise<T>;
    delete(args: any): Promise<T>;
    deleteMany(args?: any): Promise<{ count: number }>;
    count(args?: any): Promise<number>;
    aggregate(args?: any): Promise<any>;
    groupBy(args?: any): Promise<any[]>;
  }
  export class PrismaClient {
    constructor(...a: any[]);
    user: Delegate<User>;
    otpToken: Delegate<OtpToken>;
    template: Delegate<Template>;
    project: Delegate<Project>;
    message: Delegate<Message>;
    setting: Delegate<Setting>;
    $disconnect(): Promise<void>;
    $connect(): Promise<void>;
    $transaction(...a: any[]): Promise<any>;
    [k: string]: any;
  }
}
declare module "sharp" { const sharp: any; export = sharp; }
declare module "@sentry/node" { const s: any; export = s; }
declare module "cloudinary" { const c: any; export = c; }
