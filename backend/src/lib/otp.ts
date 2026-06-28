import { prisma } from "./prisma";

export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6 chữ số
}

/**
 * Tạo OTP, lưu DB. Trả về code (để dev hiển thị). Production: KHÔNG trả code ra ngoài.
 */
export async function createOtp(userId: string, purpose: string): Promise<string> {
  const code = generateOtp();
  await prisma.otpToken.create({
    data: {
      userId,
      code,
      purpose,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 phút
    },
  });
  return code;
}

/**
 * Gửi OTP qua SMS. Dev (SMS_ENABLED=false): in ra console.
 * Production: tích hợp Twilio tại đây.
 */
export async function sendOtpSms(phone: string, code: string): Promise<void> {
  if (process.env.SMS_ENABLED === "true") {
    // TODO: tích hợp Twilio thật
    // const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    // await client.messages.create({ to: phone, from: process.env.TWILIO_FROM, body: `Mã OTP Memory Makers: ${code}` });
    console.log(`[SMS] Gửi OTP ${code} tới ${phone}`);
  } else {
    console.log(`\n[DEV OTP] ${phone} -> ${code}\n`);
  }
}

export async function verifyOtp(userId: string, code: string, purpose: string): Promise<boolean> {
  const token = await prisma.otpToken.findFirst({
    where: { userId, code, purpose, used: false, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!token) return false;
  await prisma.otpToken.update({ where: { id: token.id }, data: { used: true } });
  return true;
}

export const isDev = () => process.env.SMS_ENABLED !== "true";
